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
//   tester.js updateWeightForKey -> onLearnBoxAnswer(key, isCorrect, index, isWrong)

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

    // ---- the LearnBox bar -------------------------------------------
    //
    // A child sent straight into a game has no way back and no idea what the
    // answers are earning, because this application has neither notion. So
    // LearnBox adds its own small bar: the balance, how many more correct
    // answers until the next coins, and the way home. It is
    // built only when a LearnBox is actually behind the origin, so opening
    // index.html anywhere else looks exactly as it always did.
    var hudEl = null;
    var hudCoinsEl = null;
    var hudMeterEl = null;
    var hudFillEl = null;
    var hudLeftEl = null;

    // earning: {balance, counter, required, coins_per_cycle} — the shape both
    // /child/me and every answer reply carry.
    function showHud(earning) {
        if (hudEl || typeof document === 'undefined' || !document.body) {
            updateHud(earning);
            return;
        }
        hudEl = document.createElement('div');
        hudEl.setAttribute('dir', 'rtl');
        hudEl.style.cssText = [
            'position:fixed', 'top:8px', 'inset-inline-start:8px', 'z-index:99998',
            'display:flex', 'align-items:center', 'gap:8px',
            'font:600 14px/1 "Segoe UI",Arial,sans-serif'
        ].join(';');

        var back = document.createElement('a');
        back.href = LEARN_SCREEN;
        back.textContent = '→ LearnBox';
        back.style.cssText = [
            'display:inline-flex', 'align-items:center', 'min-height:40px',
            'padding:0 14px', 'border-radius:999px', 'background:rgba(16,26,46,.85)',
            'color:#f7f3e8', 'text-decoration:none', 'backdrop-filter:blur(4px)'
        ].join(';');

        hudCoinsEl = document.createElement('span');
        hudCoinsEl.style.cssText = [
            'display:inline-flex', 'align-items:center', 'min-height:40px',
            'padding:0 14px', 'border-radius:999px', 'background:rgba(16,26,46,.85)',
            'color:#e2a92e', 'backdrop-filter:blur(4px)'
        ].join(';');

        // How far to the next coins: a bar a non-reader can follow, and the
        // count for the one who can.
        hudMeterEl = document.createElement('span');
        hudMeterEl.setAttribute('role', 'meter');
        hudMeterEl.style.cssText = [
            'display:none', 'align-items:center', 'gap:8px', 'min-height:40px',
            'padding:0 14px', 'border-radius:999px', 'background:rgba(16,26,46,.85)',
            'color:#e2a92e', 'backdrop-filter:blur(4px)'
        ].join(';');
        var track = document.createElement('span');
        track.style.cssText = [
            'display:inline-block', 'width:64px', 'height:10px', 'border-radius:999px',
            'background:rgba(255,255,255,.18)', 'overflow:hidden'
        ].join(';');
        hudFillEl = document.createElement('span');
        hudFillEl.style.cssText = [
            'display:block', 'height:100%', 'width:0', 'background:#e2a92e',
            'transition:width .3s ease'
        ].join(';');
        hudLeftEl = document.createElement('span');
        track.appendChild(hudFillEl);
        hudMeterEl.appendChild(track);
        hudMeterEl.appendChild(hudLeftEl);

        hudEl.appendChild(back);
        hudEl.appendChild(hudCoinsEl);
        hudEl.appendChild(hudMeterEl);
        document.body.appendChild(hudEl);
        updateHud(earning);
    }

    function updateHud(earning) {
        if (!earning) {
            return;
        }
        if (hudCoinsEl && typeof earning.balance === 'number') {
            hudCoinsEl.textContent = earning.balance + ' מטבעות';
        }
        var required = earning.required;
        if (!hudMeterEl || typeof required !== 'number' || required <= 0 ||
            typeof earning.counter !== 'number') {
            return;
        }
        var done = Math.min(Math.max(earning.counter, 0), required);
        var left = required - done;
        var sentence = 'עוד ' + left + ' תשובות נכונות ומקבלים ' +
            (earning.coins_per_cycle || '') + ' מטבעות';
        hudFillEl.style.width = Math.round(done / required * 100) + '%';
        hudLeftEl.textContent = 'עוד ' + left + ' למטבע הבא';
        hudMeterEl.setAttribute('aria-valuemin', '0');
        hudMeterEl.setAttribute('aria-valuemax', String(required));
        hudMeterEl.setAttribute('aria-valuenow', String(done));
        hudMeterEl.setAttribute('aria-label', sentence);
        hudMeterEl.setAttribute('title', sentence);
        hudMeterEl.style.display = 'inline-flex';
    }

    function announce(result) {
        if (!result) {
            return;
        }
        safely(updateHud, result);
        if (!result.coins_awarded) {
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
                // Answering no longer opens the menu -- only a parent does --
                // but a parent may have opened it while the child was playing.
                // Refreshing here means the guard already knows by the time the
                // child walks back out, instead of bouncing them once more.
                if (assignment && assignment.restricted) {
                    refreshAssignment();
                }
            })
            .catch(function (error) {
                if (!isPermanent(error)) {
                    enqueue(event);
                }
            });
    }

    // ---- which body of knowledge an answered game belongs to ----------
    //
    // A LearnBox assignment names a topic, and a topic has to survive the menu
    // being reordered. Group and adventure ids already do. An ordinary menu
    // game does not — its id is a path of positions (0_1_3) — so it is named by
    // the DATA list it drills, which is the thing a parent means by "topic"
    // anyway. Only this file can do the lookup: the menu tree is in the page.
    var GROUP_ID = /^(grp|adv)-([a-z0-9]+)-\d+$/;

    function topicForApp(appId) {
        if (typeof appId !== 'string') {
            return null;
        }
        var grouped = GROUP_ID.exec(appId);
        if (grouped) {
            return grouped[1] + '-' + grouped[2];
        }
        if (typeof getItemById !== 'function' || typeof apps === 'undefined') {
            return null;
        }
        try {
            var item = getItemById(apps, appId);
            return item && item.listName ? 'list:' + item.listName : null;
        } catch (error) {
            return null;
        }
    }

    // ---- the current assignment ---------------------------------------
    //
    // Held as a plain object rather than anything reactive: the menu reads it
    // when it renders, and it is refreshed after answers, so an assignment that
    // is completed mid-session opens the menu on the child's next visit to it.
    var assignment = null;

    function refreshAssignment() {
        return fetch(API + '/child/assignment', {credentials: 'same-origin'})
            .then(function (response) {
                return response.ok ? response.json() : null;
            })
            .then(function (body) {
                assignment = (body && Array.isArray(body.topics)) ? body : null;
                enforceAssignment();
                return assignment;
            })
            .catch(function () {
                return null;
            });
    }

    // ---- the assignment gate ------------------------------------------
    //
    // LearnBox serves the child their own screen listing what they have to
    // learn, and links straight to the games there — so the menu inside this
    // application is simply not the way in while an assignment is open. This
    // guard is what makes that true rather than merely intended: it sends the
    // child back to that screen if they navigate to the menu, or into a game
    // outside the assignment. Meeting today's target does not lift it -- the
    // assignment is the list of what this child may play, and only a parent
    // opening the day (LearnBox clears `restricted` for it) widens that list.
    //
    // It stays entirely inside this file. Nothing in the learning application
    // is aware of it, and with no LearnBox behind the origin it never runs.
    var LEARN_SCREEN = '/portal/child/learn.html';
    var PLAY_ROUTE = /^#\/(?:play\/[a-z_]+|app)\/(.+)$/;
    // The routes that exist to choose something rather than to play it. LearnBox
    // serves the menu itself, so these are where the child gets sent back — and
    // the sign-in screens are here too because LearnBox has already said who the
    // child is before the application loads.
    var CHOOSING_ROUTE = /^(?:|#|#\/|#\/menu\/.*|#\/user|#\/login.*|#\/signUp.*)$/;

    function assignmentAllows(hash) {
        if (available !== true) {
            return true; // no LearnBox behind this origin, or not known yet
        }
        if (CHOOSING_ROUTE.test(hash || '')) {
            return false; // choosing happens in LearnBox
        }
        var match = PLAY_ROUTE.exec(hash || '');
        if (!match || !assignment || !assignment.restricted) {
            return true;
        }
        var topic = topicForApp(decodeURIComponent(match[1]));
        return assignment.topics.some(function (assigned) {
            return assigned.topic_key === topic;
        });
    }

    function enforceAssignment() {
        if (assignmentAllows(window.location.hash)) {
            return;
        }
        window.location.href = LEARN_SCREEN;
    }

    // ---- the child's design pack --------------------------------------
    //
    // LearnBox keeps each child's pack on its server, under this application's
    // own theme keys, so the choice follows the child between tablets. The
    // LearnBox screens copy it into this application's storage before a game
    // is opened, so this is normally a no-op; it matters for a tablet that
    // reached a game some other way, or whose copy is from another tablet's
    // older choice.
    //
    // Games read their pack once, when they start, so the only repaint that
    // reaches all of them is a reload. It happens at most once per pack per
    // tab, and only after the new key has verifiably been stored — a storage
    // that refuses the write must not turn into a reload loop.
    var THEME_RELOAD_KEY = 'learnbox.themeReload';

    function adoptTheme(theme) {
        if (typeof theme !== 'string' ||
            typeof themeOptions === 'undefined' || !themeOptions[theme] ||
            typeof getLocalStorage !== 'function' || typeof setTheme !== 'function') {
            return;
        }
        if (getLocalStorage('theme', 'base') === theme) {
            return;
        }
        setTheme(theme);
        if (getLocalStorage('theme', 'base') !== theme) {
            return;
        }
        var session = window.sessionStorage;
        if (!session || session.getItem(THEME_RELOAD_KEY) === theme) {
            return;
        }
        session.setItem(THEME_RELOAD_KEY, theme);
        window.location.reload();
    }

    // ---- learning or practice -----------------------------------------
    //
    // The parent sets it on the LearnBox server; the settings screen where this
    // application lets it be chosen is one LearnBox does not let anyone reach.
    // Same shape as the pack: the portal normally hands it over before a game
    // opens, this catches a tablet that got here some other way, and a game
    // that already started in the other mode picks its weights again only on a
    // reload — once per mode per tab, and only after the write has held.
    var MODE_RELOAD_KEY = 'learnbox.activityModeReload';

    function adoptActivityMode(mode) {
        if ((mode !== 'learn' && mode !== 'practicing') ||
            typeof getActivityMode !== 'function' ||
            typeof setActivityMode !== 'function') {
            return;
        }
        // The application treats anything but 'practicing' as learning, and
        // its own screen stores 'learning' for it: that is not a difference.
        var practicing = function () {
            return getActivityMode() === 'practicing';
        };
        if (practicing() === (mode === 'practicing')) {
            return;
        }
        setActivityMode(mode);
        if (practicing() !== (mode === 'practicing')) {
            return;
        }
        var session = window.sessionStorage;
        if (!session || session.getItem(MODE_RELOAD_KEY) === mode) {
            return;
        }
        session.setItem(MODE_RELOAD_KEY, mode);
        window.location.reload();
    }

    // ---- progress that follows the child --------------------------------
    //
    // This application keeps everything a child has learned in this browser's
    // storage, under `${key}_${name}_LocalData` (storage.js). LearnBox mirrors
    // the chosen child's keys on its server, so a second tablet — or the same
    // one behind another family member's sign-in email — carries on from the
    // same words, scores and saved games. The server knows the child from the
    // session, never from the email.
    //
    // One exchange both ways (/child/learning-state/sync): what changed here,
    // each with the version it was based on, and back what changed anywhere
    // else. Changes are found by comparing every one of the child's keys with
    // the hash recorded at the last exchange, so a game that writes storage
    // directly is covered as well as one that goes through storage.js.
    //
    // Learning records (weights, attempt history, scores) that changed on two
    // tablets are merged by the server, so a word learned on either counts on
    // both. For anything else, until a page has caught up, the server's newer
    // copy wins: a game that opened with an old copy may already have saved
    // it. Once caught up this tablet is the one being played, and its writes
    // win (`force`). Either way the server archives the losing copy. When catching up changed what the
    // open game already read, the page reloads once so the game starts again
    // from the child's real progress.
    var STATE_META_PREFIX = 'learnbox.stateSync.';
    var STATE_REAPPLY_KEY = 'learnbox.stateReapply';
    var STATE_RELOAD_KEY = 'learnbox.stateReload';
    // LearnBox already owns these and hands them over itself (see above).
    var STATE_SKIP = {theme: true, activityMode: true};
    var STATE_MAX_CHARS = 900000;
    var STATE_BATCH = 150;
    var STATE_SOON_MS = 3000;
    var STATE_EVERY_MS = 60000;

    var stateChild = null; // {id, suffix} once LearnBox has named the child
    var stateCaughtUp = false;
    var stateBusy = null;
    var stateAgain = false;
    var stateSoon = null;

    // A cheap 53-bit string hash (cyrb53): enough to notice a changed value
    // without keeping a second copy of the child's progress.
    function hashText(text) {
        var h1 = 0xdeadbeef;
        var h2 = 0x41c6ce57;
        for (var i = 0; i < text.length; i++) {
            var ch = text.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
    }

    function readStateMeta() {
        try {
            var meta = JSON.parse(localStorage.getItem(STATE_META_PREFIX + stateChild.id) || 'null');
            if (meta && typeof meta.seq === 'number' && meta.keys && typeof meta.keys === 'object') {
                return meta;
            }
        } catch (error) {
            /* a corrupt record is only a slower first exchange */
        }
        return {seq: 0, keys: {}};
    }

    function writeStateMeta(meta) {
        try {
            localStorage.setItem(STATE_META_PREFIX + stateChild.id, JSON.stringify(meta));
        } catch (error) {
            /* Quota: the next exchange resends a little more, nothing breaks. */
        }
    }

    // The child's keys in this browser, by their name without the user tail;
    // null where the storage cannot be listed.
    function localState() {
        if (typeof localStorage.length !== 'number' || typeof localStorage.key !== 'function') {
            return null;
        }
        var suffix = stateChild.suffix;
        var found = {};
        for (var i = 0; i < localStorage.length; i++) {
            var full = localStorage.key(i);
            if (typeof full !== 'string' || full.length <= suffix.length ||
                full.slice(-suffix.length) !== suffix) {
                continue;
            }
            var key = full.slice(0, -suffix.length);
            if (!STATE_SKIP[key]) {
                found[key] = localStorage.getItem(full);
            }
        }
        return found;
    }

    function stateChanges(meta, local) {
        var changes = [];
        Object.keys(local).forEach(function (key) {
            var value = local[key];
            if (value === null || value.length > STATE_MAX_CHARS) {
                return;
            }
            var known = meta.keys[key];
            var hash = hashText(value);
            if (!known || known.hash !== hash) {
                changes.push({key: key, value: value, base: known ? known.seq : 0, hash: hash});
            }
        });
        Object.keys(meta.keys).forEach(function (key) {
            if (!(key in local) && meta.keys[key].hash !== null) {
                changes.push({key: key, value: null, base: meta.keys[key].seq, hash: null});
            }
        });
        return changes;
    }

    function currentHash(key) {
        var value = localStorage.getItem(key + stateChild.suffix);
        return value === null ? null : hashText(value);
    }

    // Take in the server's answer. Returns the keys whose stored value it
    // changed, as {full storage key: new value or null}.
    function applyState(meta, sent, result) {
        var sentByKey = {};
        sent.forEach(function (change) {
            sentByKey[change.key] = change;
        });
        (result.stored || []).forEach(function (entry) {
            var change = sentByKey[entry.key];
            if (change) {
                meta.keys[entry.key] = {seq: entry.seq, hash: change.hash};
            }
        });
        var applied = {};
        (result.keys || []).forEach(function (row) {
            var known = meta.keys[row.key];
            var here = currentHash(row.key);
            var change = sentByKey[row.key];
            // Changed here and not (or no longer) what went up: this tablet's
            // own newer write stays, and goes up on top of this version later.
            var dirty = change ? here !== change.hash : here !== (known ? known.hash : null);
            if (dirty) {
                return;
            }
            var full = row.key + stateChild.suffix;
            try {
                if (row.value === null) {
                    localStorage.removeItem(full);
                } else {
                    localStorage.setItem(full, row.value);
                }
            } catch (error) {
                return; // quota: left for the next exchange
            }
            var hash = row.value === null ? null : hashText(row.value);
            if (hash !== here) {
                applied[full] = row.value;
            }
            meta.keys[row.key] = {seq: row.seq, hash: hash};
        });
        meta.seq = result.seq;
        writeStateMeta(meta);
        return applied;
    }

    function postState(payload, final) {
        var text = JSON.stringify(payload);
        return fetch(API + '/child/learning-state/sync', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: text,
            credentials: 'same-origin',
            // Lets the last exchange of a closing tab finish; browsers only
            // allow it for small bodies.
            keepalive: !!final && text.length < 60000
        }).then(function (response) {
            if (!response.ok) {
                var error = new Error('LearnBox ' + response.status);
                error.status = response.status;
                throw error;
            }
            return response.json();
        });
    }

    // One exchange; more follow at once while either side has more to say.
    // Resolves with everything the exchanges changed in this browser.
    function syncState(final, appliedSoFar) {
        var applied = appliedSoFar || {};
        if (!stateChild) {
            return Promise.resolve(applied);
        }
        if (stateBusy) {
            stateAgain = true;
            return stateBusy;
        }
        var meta = readStateMeta();
        var local = localState();
        if (!local) {
            return Promise.resolve(applied);
        }
        var changes = stateChanges(meta, local);
        var sent = changes.slice(0, STATE_BATCH);
        stateBusy = postState({
            since: meta.seq,
            force: stateCaughtUp,
            changes: sent.map(function (change) {
                return {key: change.key, value: change.value, base: change.base};
            })
        }, final).then(function (result) {
            var now = applyState(meta, sent, result);
            Object.keys(now).forEach(function (full) {
                applied[full] = now[full];
            });
            var more = result.more || changes.length > sent.length || stateAgain;
            stateAgain = false;
            stateBusy = null;
            return more ? syncState(false, applied) : applied;
        }, function (error) {
            stateBusy = null;
            if (isPermanent(error)) {
                stateChild = null; // no such route or no child: stay quiet
            }
            throw error;
        });
        return stateBusy;
    }

    function syncStateSoon() {
        if (!stateChild || stateSoon !== null) {
            return;
        }
        stateSoon = window.setTimeout(function () {
            stateSoon = null;
            syncState().catch(function () {});
        }, STATE_SOON_MS);
    }

    function activeUserIsChild() {
        try {
            return typeof getUser === 'function' &&
                '_' + getUser() + '_LocalData' === stateChild.suffix;
        } catch (error) {
            return false;
        }
    }

    // The open game read the old copy. Reload once, and make sure whatever it
    // saves while the page goes away does not survive into the new one.
    function restartWith(applied, seq) {
        var session = window.sessionStorage;
        if (!session || session.getItem(STATE_RELOAD_KEY) === String(seq)) {
            return;
        }
        session.setItem(STATE_RELOAD_KEY, String(seq));
        // Nothing this page still writes may go up: it is the old copy.
        stateChild = null;
        try {
            session.setItem(STATE_REAPPLY_KEY, JSON.stringify(applied));
        } catch (error) {
            /* too big for this tab's storage: the unload listeners below cover it */
        }
        var reapply = function () {
            reapplyState(applied);
        };
        window.addEventListener('pagehide', reapply);
        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('visibilitychange', reapply);
        }
        window.location.reload();
    }

    function reapplyState(applied) {
        Object.keys(applied).forEach(function (full) {
            try {
                if (applied[full] === null) {
                    localStorage.removeItem(full);
                } else {
                    localStorage.setItem(full, applied[full]);
                }
            } catch (error) {
                /* already as good as storage allows */
            }
        });
    }

    // Runs as this script loads, before any game reads its progress.
    (function reapplyAfterRestart() {
        try {
            var session = window.sessionStorage;
            var stash = session && session.getItem(STATE_REAPPLY_KEY);
            if (stash) {
                session.removeItem(STATE_REAPPLY_KEY);
                reapplyState(JSON.parse(stash));
            }
        } catch (error) {
            /* nothing stashed that can be read */
        }
    })();

    function startStateSync(child) {
        var name = typeof child.display_name === 'string' ? child.display_name.trim() : '';
        if (!child.id || !name) {
            return;
        }
        stateChild = {id: String(child.id), suffix: '_' + name + '_LocalData'};
        // storage.js reports every write here (the hook firebase.js answers),
        // so a change goes up within seconds rather than at the next round.
        var reported = window.firebaseSyncLocalStorageKey;
        window.firebaseSyncLocalStorageKey = function (key) {
            if (typeof reported === 'function') {
                reported.apply(this, arguments);
            }
            if (stateChild && typeof key === 'string' &&
                key.slice(-stateChild.suffix.length) === stateChild.suffix) {
                syncStateSoon();
            }
        };
        syncState().then(function (applied) {
            stateCaughtUp = true;
            if (Object.keys(applied).length && activeUserIsChild()) {
                restartWith(applied, readStateMeta().seq);
            }
        }, function () {
            // Offline or refused: this tablet keeps playing on its own copy,
            // and its writes still lose to anything newer until it catches up.
        });
        if (typeof window.setInterval === 'function') {
            window.setInterval(function () {
                syncState().then(function () {
                    stateCaughtUp = true;
                }, function () {});
            }, STATE_EVERY_MS);
        }
        var goingAway = function () {
            syncState(true).catch(function () {});
        };
        window.addEventListener('pagehide', goingAway);
        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'hidden') {
                    goingAway();
                }
            });
        }
    }

    window.learnBoxSyncState = function () {
        return syncState();
    };

    window.learnBoxAssignment = function () {
        return assignment;
    };

    // The question each game last got wrong. Most games hold a missed question
    // on screen until it is answered, so the right answer that follows is a
    // retry with one option fewer, not knowledge — it still teaches (the app
    // records it) but it earns no coin. Only the very next answer in the same
    // game is affected, and only in this page: the word coming round again
    // later, or tomorrow, pays as usual.
    var missed = {};

    // The one entry point tester.js calls. Only accepted correct answers are
    // reported; wrong answers are the learning app's own business.
    window.onLearnBoxAnswer = function (key, isCorrect, itemIndex, isWrong) {
        if (typeof key !== 'string') {
            return;
        }
        var item = (itemIndex === undefined || itemIndex === null) ? null : String(itemIndex);
        var retried = item !== null && missed[key] === item;
        if (isWrong) {
            missed[key] = item;
        } else if (isCorrect) {
            delete missed[key];
        }
        if (!isCorrect || retried || available === false) {
            return;
        }
        var event = {
            event_id: uuid(),
            app_key: key.slice(0, 120),
            topic: topicForApp(key),
            item_key: item,
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
                    refreshAssignment();
                    // The bar is a convenience and earning coins is not, so a
                    // DOM that will not take it must never cost the child a
                    // single answer.
                    safely(showHud, body.earning);
                    // Decoration too: a pack that cannot be applied leaves the
                    // game in the one it already wears.
                    safely(adoptTheme, body.theme);
                    // Not decoration, but a mode that cannot be stored still
                    // leaves a working game in the mode it already had.
                    safely(adoptActivityMode, body.activity_mode);
                    // After the pack and mode, which may already reload.
                    safely(startStateSync, body.child);
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
    window.addEventListener('hashchange', enforceAssignment);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', probe);
    } else {
        probe();
    }
})();
