// learnbox-bridge.js — reports accepted correct answers to a local LearnBox.
//
// This file is the ONLY thing in the learning application that knows LearnBox
// exists, and it is deliberately inert unless the app is being served by one:
// it probes once on load, and if there is no LearnBox behind this origin every
// entry point becomes a no-op. Opening index.html from anywhere else therefore
// behaves exactly as it always did.
//
// It never decides a reward. It reports "this answer was accepted" and the
// server decides what, if anything, that is worth — the browser cannot choose
// whose balance grows or by how much.
//
// Wiring (one guarded call, matching the onAdventureAnswer idiom):
//   tester.js updateWeightForKey -> onLearnBoxAnswer(key, isCorrect, index)

(function () {
    'use strict';

    var API = '/api/v1';
    var QUEUE_KEY = 'learnbox.pendingEvents';
    // A queue is transport reliability for a flaky LAN, not offline learning.
    // Past this many unsent answers the oldest are dropped rather than grown
    // without bound — this storage is shared with the app's own weights and
    // progress, and running it out of quota would break a game.
    var MAX_QUEUE = 200;
    var RETRY_MS = 30000;

    var available = null; // null = not probed yet, then true/false
    var flushing = false;
    var retryTimer = null;

    function uuid() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        // randomUUID is SecureContext-only, so a LearnBox reached over plain
        // http on the LAN always lands here. Good enough for an idempotency key.
        return 'e-' + Date.now().toString(36) + '-' +
            Math.random().toString(36).slice(2, 10) +
            Math.random().toString(36).slice(2, 10);
    }

    function readQueue() {
        try {
            var raw = localStorage.getItem(QUEUE_KEY);
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function writeQueue(events) {
        try {
            if (!events.length) {
                localStorage.removeItem(QUEUE_KEY);
            } else {
                localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
            }
        } catch (error) {
            // Quota exhausted or storage blocked. The previous value stays and
            // this answer is simply not recorded — never worth breaking a game.
        }
    }

    // Drop exactly the events the server has taken, leaving anything that
    // arrived while the request was in flight.
    function removeFromQueue(sent) {
        var delivered = {};
        for (var i = 0; i < sent.length; i++) {
            delivered[sent[i].event_id] = true;
        }
        writeQueue(readQueue().filter(function (event) {
            return !delivered[event.event_id];
        }));
    }

    function request(path, body) {
        return fetch(API + path, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body),
            credentials: 'same-origin'
        }).then(function (response) {
            if (!response.ok) {
                var error = new Error('LearnBox ' + response.status);
                error.status = response.status;
                throw error;
            }
            return response.json();
        });
    }

    // A 4xx means the server understood and refused (no child session, no active
    // rule). Re-sending those forever would never succeed, so they are dropped;
    // only transport failures and 5xx are worth retrying.
    function isPermanent(error) {
        return error && error.status >= 400 && error.status < 500;
    }

    // The toast is decoration. It must never turn into a transport failure and
    // cause delivered events to be sent a second time.
    function safely(fn, argument) {
        try {
            fn(argument);
        } catch (error) {
            /* ignored on purpose */
        }
    }

    function scheduleRetry() {
        if (retryTimer !== null || !readQueue().length) {
            return;
        }
        retryTimer = window.setTimeout(function () {
            retryTimer = null;
            flush();
        }, RETRY_MS);
    }

    function flush() {
        if (flushing || available !== true) {
            return Promise.resolve();
        }
        var pending = readQueue();
        if (!pending.length) {
            return Promise.resolve();
        }
        flushing = true;
        return request('/learning/events/batch', {events: pending})
            .then(function (result) {
                // Only once the server has them. Clearing before the request
                // would lose the backlog if the tab is killed mid-flight, which
                // on a flaky LAN is exactly when it happens.
                removeFromQueue(pending);
                safely(announce, result);
            })
            .catch(function (error) {
                if (isPermanent(error)) {
                    removeFromQueue(pending);
                } else {
                    scheduleRetry();
                }
            })
            .then(function () {
                flushing = false;
            });
    }

    function enqueue(event) {
        writeQueue(readQueue().concat([event]));
        scheduleRetry();
    }

    var toastEl = null;

    function announce(result) {
        if (!result || !result.coins_awarded) {
            return;
        }
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.setAttribute('dir', 'rtl');
            toastEl.style.cssText = [
                'position:fixed', 'left:50%', 'bottom:24px', 'transform:translateX(-50%)',
                'z-index:99999', 'background:#e2a92e', 'color:#101a2e',
                'font:700 16px/1.4 "Segoe UI",Arial,sans-serif',
                'padding:12px 20px', 'border-radius:999px',
                'box-shadow:0 8px 24px rgba(0,0,0,.35)', 'pointer-events:none',
                'opacity:0', 'transition:opacity .2s'
            ].join(';');
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = 'קיבלת ' + result.coins_awarded + ' מטבעות!';
        toastEl.style.opacity = '1';
        window.clearTimeout(announce.timer);
        announce.timer = window.setTimeout(function () {
            toastEl.style.opacity = '0';
        }, 2600);
    }

    function send(event) {
        request('/learning/events', event)
            .then(function (result) {
                safely(announce, result);
                flush();
            })
            .catch(function (error) {
                if (!isPermanent(error)) {
                    enqueue(event);
                }
            });
    }

    // The one entry point tester.js calls. Only accepted correct answers are
    // reported; wrong answers are the learning app's own business.
    window.onLearnBoxAnswer = function (key, isCorrect, itemIndex) {
        if (!isCorrect || available === false || typeof key !== 'string') {
            return;
        }
        var event = {
            event_id: uuid(),
            app_key: key.slice(0, 120),
            item_key: (itemIndex === undefined || itemIndex === null)
                ? null : String(itemIndex),
            occurred_at: new Date().toISOString()
        };
        // Off the synchronous answer path. The game writes its own weights to
        // localStorage on the very next line, and the queue must never be what
        // exhausts the quota in between — nor add latency on an old tablet.
        window.setTimeout(function () {
            if (available === false) {
                return;
            }
            if (available === null) {
                enqueue(event); // still probing: hold it rather than lose it
                return;
            }
            send(event);
        }, 0);
    };

    window.learnBoxAvailable = function () {
        return available === true;
    };

    function probe() {
        fetch(API + '/child/me', {credentials: 'same-origin'})
            .then(function (response) {
                if (!response.ok) {
                    return null;
                }
                return response.json().catch(function () {
                    return null;
                });
            })
            .then(function (body) {
                // A 200 alone proves nothing: a static host with a catch-all
                // SPA rewrite answers every unknown path with 200 and HTML.
                // Only a real child payload means a LearnBox with a profile
                // selected; anything else stays silent and keeps nothing.
                available = !!(body && body.child);
                if (available) {
                    flush();
                } else {
                    writeQueue([]);
                }
            })
            .catch(function () {
                available = false;
                writeQueue([]);
            });
    }

    window.addEventListener('online', flush);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', probe);
    } else {
        probe();
    }
})();
