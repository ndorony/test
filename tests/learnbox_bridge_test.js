// Contract test for learnbox-bridge.js — the optional LearnBox reporter.
//
// The two properties that matter: the app is unchanged when no LearnBox is
// behind the origin, and when there is one, exactly the accepted correct
// answers are reported, with an idempotency key, and never lost to a flaky LAN.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');
const ROOT = path.join(__dirname, '..');

const BRIDGE = fs.readFileSync(path.join(ROOT, 'learnbox-bridge.js'), 'utf8');

function makeStorage() {
    const map = new Map();
    return {
        getItem: key => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: key => map.delete(key),
        _map: map,
    };
}

// Builds a sandbox whose fetch is scripted per request path.
//
// setTimeout is split deliberately: a zero delay (the bridge defers its work
// off the answer path) runs on the next tick, while a real delay (the 30s
// retry) is parked in `timers` so a test can fire it on demand. Ids start at 1
// because the bridge guards on `retryTimer !== null` and a 0 id would hide a
// mistake there.
function makeContext(responder, options) {
    const settings = options || {};
    const calls = [];
    const timers = [];
    const listeners = {};
    const localStorage = settings.storage || makeStorage();
    let nextTimerId = 1;

    const ctx = {
        console,
        localStorage,
        JSON,
        Math,
        Date,
        Error,
        Promise,
        Array,
        String,
        setTimeout: (fn, ms) => {
            const id = nextTimerId++;
            if (!ms) {
                setImmediate(fn);
            } else {
                timers.push({id, fn});
            }
            return id;
        },
        clearTimeout: id => {
            const at = timers.findIndex(timer => timer.id === id);
            if (at !== -1) timers.splice(at, 1);
        },
        crypto: {randomUUID: () => 'uuid-' + nextTimerId + '-' + Math.random()},
        document: {
            readyState: 'complete',
            addEventListener: () => {},
            createElement: () => ({
                style: {cssText: '', opacity: ''},
                setAttribute: () => {},
                appendChild: () => {},
            }),
            body: {appendChild: () => {}},
        },
        fetch: (url, opts) => {
            const call = {url, options: opts, body: opts && opts.body ? JSON.parse(opts.body) : null};
            calls.push(call);
            return responder(call);
        },
    };
    ctx.window = ctx;
    ctx.window.addEventListener = (name, handler) => {
        listeners[name] = handler;
    };
    vm.createContext(ctx);
    return {ctx, calls, timers, listeners, localStorage};
}

function ok(payload) {
    return Promise.resolve({ok: true, status: 200, json: () => Promise.resolve(payload)});
}

function status(code) {
    return Promise.resolve({ok: false, status: code, json: () => Promise.resolve({})});
}

const CHILD = {child: {display_name: 'רוני'}, earning: {counter: 0, required: 5}};

// Lets already-resolved promise chains and zero-delay timers finish. The bridge
// defers an answer by a tick, so a few passes are needed.
async function settle(times) {
    for (let i = 0; i < (times || 6); i++) {
        await new Promise(resolve => setImmediate(resolve));
    }
}

function queued(localStorage) {
    const raw = localStorage.getItem('learnbox.pendingEvents');
    return raw ? JSON.parse(raw) : [];
}

function events(calls) {
    return calls.filter(call => call.url.indexOf('/learning/events') !== -1);
}

async function run() {
    // --- 1. No LearnBox behind the origin: completely inert ----------------
    {
        // The rejection is wired through the responder so the call is still
        // counted; replacing ctx.fetch wholesale would make the "nothing was
        // posted" assertion true by construction.
        const {ctx, calls, localStorage} = makeContext(() =>
            Promise.reject(new Error('network down')));
        vm.runInContext(BRIDGE, ctx);
        await settle();

        assert.strictEqual(typeof ctx.onLearnBoxAnswer, 'function',
            'the hook tester.js looks for must exist');
        assert.strictEqual(ctx.learnBoxAvailable(), false);
        assert.strictEqual(calls.length, 1, 'only the probe is attempted');

        ctx.onLearnBoxAnswer('grp-g611-0', true, 3);
        await settle();
        assert.strictEqual(events(calls).length, 0, 'no answer is posted without a LearnBox');
        assert.deepStrictEqual(queued(localStorage), [],
            'a standalone app must not accumulate a queue');
    }

    // --- 2. LearnBox present: a correct answer is reported ------------------
    {
        const {ctx, calls, localStorage} = makeContext(call =>
            call.url.indexOf('/child/me') !== -1
                ? ok(CHILD)
                : ok({accepted: 1, coins_awarded: 0, counter: 1, balance: 0}));
        vm.runInContext(BRIDGE, ctx);
        await settle();
        assert.strictEqual(ctx.learnBoxAvailable(), true);

        ctx.onLearnBoxAnswer('grp-g611-0', true, 7);
        await settle();

        const posted = events(calls);
        assert.strictEqual(posted.length, 1, 'exactly one report per correct answer');
        assert.strictEqual(posted[0].url, '/api/v1/learning/events');
        assert.strictEqual(posted[0].options.credentials, 'same-origin',
            'the child session cookie must ride along');
        assert.strictEqual(posted[0].body.app_key, 'grp-g611-0');
        assert.strictEqual(posted[0].body.item_key, '7', 'the item index is carried');
        assert.ok(posted[0].body.event_id, 'every event carries an idempotency key');
        assert.ok(!('coins' in posted[0].body), 'the browser never proposes a reward');
        assert.ok(!('child_id' in posted[0].body), 'the browser never names the child');
        assert.deepStrictEqual(queued(localStorage), [], 'a delivered event is not queued');
    }

    // --- 3. Wrong answers are the learning app's own business ---------------
    {
        const {ctx, calls} = makeContext(() => ok(CHILD));
        vm.runInContext(BRIDGE, ctx);
        await settle();
        ctx.onLearnBoxAnswer('grp-g611-0', false, 1);
        await settle();
        assert.strictEqual(events(calls).length, 0,
            'only accepted correct answers are reported');
    }

    // --- 4. A transport failure queues, and the queue flushes as a batch ----
    {
        let allowEvents = false;
        const {ctx, calls, localStorage} = makeContext(call => {
            if (call.url.indexOf('/child/me') !== -1) return ok(CHILD);
            if (!allowEvents) return Promise.reject(new Error('LAN down'));
            return ok({accepted: 2, coins_awarded: 10, counter: 0, balance: 10});
        });
        vm.runInContext(BRIDGE, ctx);
        await settle();

        ctx.onLearnBoxAnswer('grp-g611-0', true, 1);
        await settle();
        ctx.onLearnBoxAnswer('grp-g611-1', true, 2);
        await settle();
        assert.strictEqual(queued(localStorage).length, 2,
            'answers survive the server being unreachable');

        allowEvents = true;
        calls.length = 0;
        ctx.onLearnBoxAnswer('grp-g611-2', true, 3);
        await settle();

        const batch = calls.filter(call => call.url.indexOf('/events/batch') !== -1);
        assert.strictEqual(batch.length, 1, 'the backlog is flushed in one batch');
        assert.strictEqual(batch[0].body.events.length, 2);
        assert.deepStrictEqual(queued(localStorage), [], 'a delivered batch is cleared');
    }

    // --- 5. A refusal (no session, no rule) is not retried forever ----------
    {
        const {ctx, localStorage, timers} = makeContext(call =>
            call.url.indexOf('/child/me') !== -1 ? ok(CHILD) : status(409));
        vm.runInContext(BRIDGE, ctx);
        await settle();
        ctx.onLearnBoxAnswer('grp-g611-0', true, 1);
        await settle();
        assert.deepStrictEqual(queued(localStorage), [],
            'a 4xx is a refusal, not a transport failure');
        assert.strictEqual(timers.length, 0, 'and no retry is scheduled for it');
    }

    // --- 6. LearnBox present but no child chosen: nothing is collected ------
    {
        const {ctx, localStorage} = makeContext(call =>
            call.url.indexOf('/child/me') !== -1 ? status(401) : ok({}));
        vm.runInContext(BRIDGE, ctx);
        await settle();
        assert.strictEqual(ctx.learnBoxAvailable(), false);
        ctx.onLearnBoxAnswer('grp-g611-0', true, 1);
        await settle();
        assert.deepStrictEqual(queued(localStorage), []);
    }

    // --- 7. A catch-all 200 from a static host is not a LearnBox ------------
    {
        // Firebase Hosting with an SPA rewrite answers any unknown path with
        // 200 and index.html. Trusting response.ok would start a queue that
        // retries forever on a host that has no API at all.
        const {ctx, localStorage, timers} = makeContext(call =>
            call.url.indexOf('/child/me') !== -1
                ? ok({notAChildPayload: true})
                : ok({}));
        vm.runInContext(BRIDGE, ctx);
        await settle();
        assert.strictEqual(ctx.learnBoxAvailable(), false,
            'only a real child payload counts as a LearnBox');
        ctx.onLearnBoxAnswer('grp-g611-0', true, 1);
        await settle();
        assert.deepStrictEqual(queued(localStorage), []);
        assert.strictEqual(timers.length, 0);
    }

    // --- 8. A tab killed mid-flight keeps its backlog -----------------------
    {
        let inFlight = false;
        const {ctx, localStorage, timers} = makeContext(call => {
            if (call.url.indexOf('/child/me') !== -1) return ok(CHILD);
            if (call.url.indexOf('/events/batch') !== -1) {
                inFlight = true;
                return new Promise(() => {}); // never settles
            }
            return Promise.reject(new Error('LAN down'));
        });
        vm.runInContext(BRIDGE, ctx);
        await settle();

        ctx.onLearnBoxAnswer('grp-g611-0', true, 1);
        await settle();
        assert.strictEqual(queued(localStorage).length, 1);
        assert.strictEqual(timers.length, 1, 'a retry is pending');

        // Fire the retry so a batch goes out, then never answer it — as if the
        // tablet were backgrounded and killed mid-request. The events must
        // still be on disk, because nothing confirmed they were received.
        timers.shift().fn();
        await settle();
        assert.ok(inFlight, 'a batch went out');
        assert.strictEqual(queued(localStorage).length, 1,
            'the in-flight backlog is not discarded before the server confirms');
    }

    // --- 9. The retry timer flushes the backlog -----------------------------
    {
        let allowEvents = false;
        const {ctx, calls, localStorage, timers} = makeContext(call => {
            if (call.url.indexOf('/child/me') !== -1) return ok(CHILD);
            if (!allowEvents) return Promise.reject(new Error('LAN down'));
            return ok({accepted: 1, coins_awarded: 0, counter: 1, balance: 0});
        });
        vm.runInContext(BRIDGE, ctx);
        await settle();

        ctx.onLearnBoxAnswer('grp-g611-0', true, 1);
        await settle();
        assert.strictEqual(timers.length, 1, 'a failed send schedules exactly one retry');

        ctx.onLearnBoxAnswer('grp-g611-1', true, 2);
        await settle();
        assert.strictEqual(timers.length, 1, 'and a second failure does not stack another');

        allowEvents = true;
        calls.length = 0;
        timers.shift().fn();
        await settle();
        assert.strictEqual(calls.filter(c => c.url.indexOf('/events/batch') !== -1).length, 1);
        assert.deepStrictEqual(queued(localStorage), [], 'the retry drained the queue');
    }

    // --- 10. Going back online flushes ------------------------------------
    {
        let allowEvents = false;
        const {ctx, listeners, localStorage} = makeContext(call => {
            if (call.url.indexOf('/child/me') !== -1) return ok(CHILD);
            if (!allowEvents) return Promise.reject(new Error('LAN down'));
            return ok({accepted: 1, coins_awarded: 0, counter: 1, balance: 0});
        });
        vm.runInContext(BRIDGE, ctx);
        await settle();
        ctx.onLearnBoxAnswer('grp-g611-0', true, 1);
        await settle();
        assert.strictEqual(queued(localStorage).length, 1);

        allowEvents = true;
        assert.strictEqual(typeof listeners.online, 'function', 'the online event is observed');
        listeners.online();
        await settle();
        assert.deepStrictEqual(queued(localStorage), []);
    }

    // --- 11. Answers arriving before the probe resolves are not lost --------
    {
        let releaseProbe = null;
        const {ctx, localStorage} = makeContext(call => {
            if (call.url.indexOf('/child/me') !== -1) {
                return new Promise(resolve => {
                    releaseProbe = () => resolve({
                        ok: true, status: 200, json: () => Promise.resolve(CHILD),
                    });
                });
            }
            return ok({accepted: 2, coins_awarded: 10, counter: 0, balance: 10});
        });
        vm.runInContext(BRIDGE, ctx);
        await settle();

        ctx.onLearnBoxAnswer('grp-g611-0', true, 1);
        ctx.onLearnBoxAnswer('grp-g611-1', true, 2);
        await settle();
        assert.strictEqual(queued(localStorage).length, 2,
            'answers given while probing are held');

        releaseProbe();
        await settle();
        assert.deepStrictEqual(queued(localStorage), [],
            'and delivered once the probe confirms a LearnBox');
    }

    // --- 12. Hostile or broken storage never breaks a game -----------------
    {
        const storage = makeStorage();
        storage.setItem('learnbox.pendingEvents', '{"not":"an array"}');
        const {ctx} = makeContext(call =>
            call.url.indexOf('/child/me') !== -1 ? ok(CHILD) : ok({accepted: 1}), {storage});
        vm.runInContext(BRIDGE, ctx);
        await settle();
        assert.doesNotThrow(() => ctx.onLearnBoxAnswer('grp-g611-0', true, 1),
            'a corrupt queue is survivable');
        await settle();
    }
    {
        const storage = makeStorage();
        storage.setItem = () => {
            throw new Error('QuotaExceededError');
        };
        const {ctx} = makeContext(() => Promise.reject(new Error('LAN down')), {storage});
        vm.runInContext(BRIDGE, ctx);
        await settle();
        assert.doesNotThrow(() => ctx.onLearnBoxAnswer('grp-g611-0', true, 1),
            'a full localStorage is survivable');
        await settle();
    }

    // --- 13. The queue is capped ------------------------------------------
    {
        const {ctx, localStorage} = makeContext(call =>
            call.url.indexOf('/child/me') !== -1
                ? ok(CHILD)
                : Promise.reject(new Error('LAN down')));
        vm.runInContext(BRIDGE, ctx);
        await settle();
        for (let i = 0; i < 260; i++) {
            ctx.onLearnBoxAnswer('grp-g611-0', true, i);
        }
        await settle(20);
        const pending = queued(localStorage);
        assert.ok(pending.length <= 200,
            'the queue is capped so it cannot exhaust the shared storage quota, got ' +
            pending.length);
        assert.ok(pending.length > 0, 'but it does hold a backlog');
    }

    // --- 14. The hook only fires for a real answer -------------------------
    // A source contract, because the distinction is invisible at runtime and
    // getting it wrong hands out real screen time. Every answer site passes
    // exactly ±1; factory-tycoon.js passes -15 to force-master an item the
    // child BOUGHT with idle-production money. `change < 0` would pay for that
    // purchase, so the call must test for -1.
    {
        const tester = fs.readFileSync(path.join(ROOT, 'tester.js'), 'utf8');
        const call = /onLearnBoxAnswer\(([^)]*)\)/.exec(tester);
        assert.ok(call, 'tester.js still calls the bridge');
        assert.ok(/change === -1/.test(call[1]),
            'the hook must test change === -1, not "negative", or an in-game ' +
            'purchase mints coins — got: ' + call[1]);

        const buyers = fs.readFileSync(path.join(ROOT, 'games/factory-tycoon.js'), 'utf8');
        assert.ok(/updateWeightForKey\([^)]*,\s*-15\)/.test(buyers),
            'the non-answer caller this guards against still exists; if it is ' +
            'gone, re-check whether the -1 test is still the right one');
    }

    // --- 9. A DOM that refuses the LearnBox bar costs nothing --------------
    {
        // The bar (balance + the way back) is a convenience; reporting answers
        // is the point. A browser or a game that will not take the injected
        // element must not cost the child a single coin.
        const {ctx, calls} = makeContext(call =>
            call.url.indexOf('/child/me') !== -1
                ? ok(CHILD)
                : ok({accepted: 1, coins_awarded: 10, counter: 0, balance: 10}));
        ctx.document.createElement = () => {
            throw new Error('no DOM for you');
        };
        vm.runInContext(BRIDGE, ctx);
        await settle();

        assert.strictEqual(ctx.learnBoxAvailable(), true,
            'a bar that cannot be drawn must not disable the bridge');

        ctx.onLearnBoxAnswer('grp-g611-0', true, 1);
        await settle();
        assert.strictEqual(events(calls).length, 1,
            'answers are still reported when the bar cannot be drawn');
    }

    // --- 15. The child's design pack comes from LearnBox --------------------
    // The pack is kept on the LearnBox server so it follows the child between
    // tablets. The bridge stores it where getTheme() reads it and reloads once
    // so every game repaints — and never reloads in a loop.
    {
        function themed(serverTheme, options) {
            const settings = options || {};
            const env = makeContext(call =>
                call.url.indexOf('/child/me') !== -1
                    ? ok(Object.assign({}, CHILD, {theme: serverTheme}))
                    : ok({accepted: 1, coins_awarded: 0, counter: 0}));
            const stored = {theme: settings.stored};
            env.reloads = 0;
            env.ctx.themeOptions = {base: {}, space: {}, unicorn: {}};
            env.ctx.getLocalStorage = (key, fallback) =>
                stored[key] === undefined ? fallback : stored[key];
            env.ctx.setTheme = key => {
                if (!settings.refuseWrites) stored.theme = key;
            };
            env.ctx.sessionStorage = settings.session || makeStorage();
            env.ctx.location = {reload: () => { env.reloads += 1; }};
            env.stored = stored;
            return env;
        }

        const changed = themed('space', {stored: 'base'});
        vm.runInContext(BRIDGE, changed.ctx);
        await settle();
        assert.strictEqual(changed.stored.theme, 'space',
            'the server pack is stored where the games read it');
        assert.strictEqual(changed.reloads, 1, 'and the page reloads once to repaint');

        // The reloaded page finds the pack already stored: nothing more to do.
        const again = themed('space', {stored: 'space', session: changed.ctx.sessionStorage});
        vm.runInContext(BRIDGE, again.ctx);
        await settle();
        assert.strictEqual(again.reloads, 0, 'a pack already worn causes no reload');

        const unknown = themed('neon', {stored: 'unicorn'});
        vm.runInContext(BRIDGE, unknown.ctx);
        await settle();
        assert.strictEqual(unknown.stored.theme, 'unicorn',
            'a key this application has no pack for is ignored');
        assert.strictEqual(unknown.reloads, 0);

        const refused = themed('space', {stored: 'base', refuseWrites: true});
        vm.runInContext(BRIDGE, refused.ctx);
        await settle();
        assert.strictEqual(refused.reloads, 0,
            'storage that refuses the pack must not turn into a reload loop');

        // Even if the stored copy is lost between loads, one tab reloads once.
        const session = makeStorage();
        session.setItem('learnbox.themeReload', 'space');
        const lost = themed('space', {stored: 'base', session});
        vm.runInContext(BRIDGE, lost.ctx);
        await settle();
        assert.strictEqual(lost.reloads, 0, 'a tab reloads at most once per pack');

        const standalone = themed(undefined, {stored: 'unicorn'});
        vm.runInContext(BRIDGE, standalone.ctx);
        await settle();
        assert.strictEqual(standalone.stored.theme, 'unicorn',
            'a LearnBox that sends no pack leaves the local choice alone');
        assert.strictEqual(standalone.reloads, 0);
    }

    // --- 15b. Learning or practice comes from LearnBox --------------------
    // The parent sets it on the server. The bridge stores it where
    // getActivityMode() reads it and reloads once so a started game picks its
    // weights again; 'learning' (this app's own screen) counts as learn.
    {
        function moded(serverMode, options) {
            const settings = options || {};
            const env = makeContext(call =>
                call.url.indexOf('/child/me') !== -1
                    ? ok(Object.assign({}, CHILD, {activity_mode: serverMode}))
                    : ok({accepted: 1, coins_awarded: 0, counter: 0}));
            const stored = {mode: settings.stored};
            env.reloads = 0;
            env.ctx.getActivityMode = () =>
                stored.mode === undefined ? 'learn' : stored.mode;
            env.ctx.setActivityMode = mode => {
                if (!settings.refuseWrites) stored.mode = mode;
            };
            env.ctx.sessionStorage = settings.session || makeStorage();
            env.ctx.location = {reload: () => { env.reloads += 1; }};
            env.stored = stored;
            return env;
        }

        const changed = moded('practicing', {});
        vm.runInContext(BRIDGE, changed.ctx);
        await settle();
        assert.strictEqual(changed.stored.mode, 'practicing',
            'the server mode is stored where the games read it');
        assert.strictEqual(changed.reloads, 1, 'and the page reloads once');

        const again = moded('practicing', {stored: 'practicing', session: changed.ctx.sessionStorage});
        vm.runInContext(BRIDGE, again.ctx);
        await settle();
        assert.strictEqual(again.reloads, 0, 'a mode already in place causes no reload');

        const back = moded('learn', {stored: 'practicing'});
        vm.runInContext(BRIDGE, back.ctx);
        await settle();
        assert.strictEqual(back.stored.mode, 'learn', 'the parent can switch it back');
        assert.strictEqual(back.reloads, 1);

        const same = moded('learn', {stored: 'learning'});
        vm.runInContext(BRIDGE, same.ctx);
        await settle();
        assert.strictEqual(same.stored.mode, 'learning',
            "the app's own 'learning' is already learn mode");
        assert.strictEqual(same.reloads, 0);

        const refused = moded('practicing', {refuseWrites: true});
        vm.runInContext(BRIDGE, refused.ctx);
        await settle();
        assert.strictEqual(refused.reloads, 0,
            'storage that refuses the mode must not turn into a reload loop');

        const unknown = moded('hologram', {stored: 'practicing'});
        vm.runInContext(BRIDGE, unknown.ctx);
        await settle();
        assert.strictEqual(unknown.stored.mode, 'practicing', 'an unknown mode is ignored');

        const standalone = moded(undefined, {stored: 'practicing'});
        vm.runInContext(BRIDGE, standalone.ctx);
        await settle();
        assert.strictEqual(standalone.stored.mode, 'practicing',
            'a LearnBox that sends no mode leaves the local choice alone');
        assert.strictEqual(standalone.reloads, 0);
    }

    // --- 16. The bar shows how far the child is from the next coins -------
    {
        const made = [];
        const {ctx} = makeContext(call =>
            call.url.indexOf('/child/me') !== -1
                ? ok({child: {display_name: 'רוני'},
                      earning: {counter: 2, required: 5, coins_per_cycle: 10, balance: 30}})
                : ok({accepted: 1, coins_awarded: 0, counter: 3, required: 5,
                      coins_per_cycle: 10, balance: 30}));
        ctx.document.createElement = () => {
            const el = {
                style: {cssText: '', width: '', display: ''},
                attrs: {},
                textContent: '',
                setAttribute: (key, value) => { el.attrs[key] = value; },
                appendChild: () => {},
            };
            made.push(el);
            return el;
        };
        vm.runInContext(BRIDGE, ctx);
        await settle();

        const meter = made.find(el => el.attrs.role === 'meter');
        assert.ok(meter, 'the bar has a meter');
        assert.strictEqual(meter.attrs['aria-valuenow'], '2');
        assert.ok(made.some(el => el.textContent === 'עוד 3 למטבע הבא'),
            'the count left is shown from /child/me');
        assert.ok(made.some(el => el.style.width === '40%'));

        ctx.onLearnBoxAnswer('grp-g611-0', true, 1);
        await settle();
        assert.strictEqual(meter.attrs['aria-valuenow'], '3',
            'each answer reply moves the meter without another request');
        assert.ok(made.some(el => el.textContent === 'עוד 2 למטבע הבא'));
        assert.ok(made.some(el => el.textContent === '30 מטבעות'));
    }

    console.log('learnbox_bridge_test: all assertions passed');
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
