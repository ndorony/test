/* Shared score-cycle handoff between the Scribble dungeon and platformer. */
(function (global) {
    'use strict';

    const MODES = ['scribble_dungeon', 'scribble_platformer'];
    // A visual mode lasts at least MIN_STAGES completed stages; from then on
    // every completed stage switches it with probability SWITCH_CHANCE, so a
    // run alternates unpredictably but never in quick succession.
    const MODE_CYCLE = {minStages: 10, switchChance: 1 / 20};
    const CYCLE_SUFFIX = '_scribble_transition_cycle';
    let pendingArrival = null;

    const PAWN_COLORS = ['red', 'green', 'purple', 'yellow'];

    function validMode(mode) { return MODES.indexOf(mode) !== -1; }

    // Keep the playable transition entry through the engine's new-item cards.
    // This selects only a presentation; curriculum and saves stay on the app ID.
    function entryRoute(app, appId, query) {
        if (!app || !validMode(app.appType) || !query) return null;
        if (query.scribbleEntry === 'bridge') return {path: '/play/scribble_dungeon/' + appId, query: {scribbleEntry: 'bridge'}};
        if (query.scribbleEntry !== 'fall') return null;
        return {path: '/play/scribble_platformer/' + appId, query: {scribbleEntry: 'fall'}};
    }

    /** The pawn colour a game persists, defaulting to red. */
    function pawnColorFor(mode) {
        if (typeof getLocalStorage !== 'function') return 'red';
        const saved = getLocalStorage(mode + '_pawn', null);
        return saved && PAWN_COLORS.indexOf(saved.color) !== -1 ? saved.color : 'red';
    }

    /**
     * One run is one character. The player's identity is the colour of the game
     * being left, so the mode being entered adopts it — otherwise the pawn that
     * walks in is a different colour from the one that cast the spell. Only the
     * colour is carried; the destination keeps its own gems.
     */
    function carryPawnColor(fromMode, toMode) {
        if (typeof getLocalStorage !== 'function' || typeof setLocalStorage !== 'function') return;
        const color = pawnColorFor(fromMode);
        const saved = getLocalStorage(toMode + '_pawn', null);
        const next = saved && typeof saved === 'object' ? Object.assign({}, saved) : {};
        if (next.color === color) return;
        next.color = color;
        setLocalStorage(toMode + '_pawn', next);
    }

    function readCycle(appId, mode, score) {
        const fallback = {mode: mode, segmentStartScore: score};
        if (typeof getLocalStorage !== 'function') return fallback;
        const stored = getLocalStorage(appId + CYCLE_SUFFIX, fallback);
        if (!stored || !validMode(stored.mode) || typeof stored.segmentStartScore !== 'number') return fallback;
        return stored;
    }

    function ensureModeSegment(appId, mode, score) {
        if (!validMode(mode) || typeof score !== 'number' || typeof getLocalStorage !== 'function') return;
        const stored = getLocalStorage(appId + CYCLE_SUFFIX, null);
        if (stored && validMode(stored.mode) && typeof stored.segmentStartScore === 'number' && stored.mode === mode) return;
        if (typeof setLocalStorage === 'function') {
            setLocalStorage(appId + CYCLE_SUFFIX, {mode: mode, segmentStartScore: score});
        }
    }

    /**
     * Called once per completed stage. Returns the mode to enter when this
     * stage ends the current mode's segment, otherwise null. The score stays
     * owned by BaseGameComponent; this only counts the stages played in the
     * current visual mode, through the storage wrapper. `random` defaults to
     * Math.random.
     */
    function nextModeForScore(appId, currentMode, score, random) {
        if (!validMode(currentMode) || typeof score !== 'number') return null;
        let cycle = readCycle(appId, currentMode, score);
        // Opening a route directly is a fresh visual run, never an opportunity
        // to immediately bounce because an old route left stale mode state.
        if (cycle.mode !== currentMode) cycle = {mode: currentMode, segmentStartScore: score};
        const stages = (typeof cycle.stages === 'number' ? cycle.stages : 0) + 1;
        const roll = (typeof random === 'function' ? random : Math.random)();
        if (stages < MODE_CYCLE.minStages || roll >= MODE_CYCLE.switchChance) {
            if (typeof setLocalStorage === 'function') {
                setLocalStorage(appId + CYCLE_SUFFIX, {mode: currentMode, segmentStartScore: cycle.segmentStartScore, stages: stages});
            }
            return null;
        }
        const next = MODES[(MODES.indexOf(currentMode) + 1) % MODES.length];
        if (typeof setLocalStorage === 'function') {
            setLocalStorage(appId + CYCLE_SUFFIX, {mode: next, segmentStartScore: score});
        }
        return next;
    }

    /** Starts the next score segment at the question that actually opened it. */
    function commitModeTransition(appId, mode, score) {
        if (!validMode(mode) || typeof score !== 'number' || typeof setLocalStorage !== 'function') return;
        setLocalStorage(appId + CYCLE_SUFFIX, {mode: mode, segmentStartScore: score});
        carryPawnColor(MODES[(MODES.indexOf(mode) + 1) % MODES.length], mode);
    }

    function disposeArrival(arrival) {
        if (!arrival || arrival.disposed) return;
        arrival.disposed = true;
        if (arrival.timeout) global.clearTimeout(arrival.timeout);
        if (arrival.bridge) arrival.bridge.dispose();
        if (arrival.root && arrival.root.parentNode) arrival.root.parentNode.removeChild(arrival.root);
        if (pendingArrival === arrival) pendingArrival = null;
    }

    /**
     * Keeps the authored final frame alive across the Vue route swap. The new
     * game consumes it only after its real room and question have been drawn,
     * so the cinematic resolves into gameplay instead of flashing through a
     * blank or replacement screen.
     */
    function retainArrival(root, bridge, host, reduced) {
        if (pendingArrival) disposeArrival(pendingArrival);
        const rect = host && host.getBoundingClientRect
            ? host.getBoundingClientRect()
            : {left: 0, top: 0, width: global.innerWidth, height: global.innerHeight};
        root.className = 'scribble-mode-transition is-handoff';
        root.style.position = 'fixed';
        root.style.inset = 'auto';
        root.style.left = rect.left + 'px';
        root.style.top = rect.top + 'px';
        root.style.width = rect.width + 'px';
        root.style.height = rect.height + 'px';
        root.style.opacity = '1';
        root.style.transition = 'none';
        document.body.appendChild(root);
        const arrival = {root: root, bridge: bridge, reduced: reduced, disposed: false, timeout: null};
        arrival.timeout = global.setTimeout(function () { disposeArrival(arrival); }, 8000);
        pendingArrival = arrival;
        return arrival;
    }

    function consumeArrival(host, gameCanvas) {
        const arrival = pendingArrival;
        if (!arrival || !host || !gameCanvas) return false;
        pendingArrival = null;
        if (arrival.timeout) global.clearTimeout(arrival.timeout);
        const root = arrival.root;
        host.appendChild(root);
        root.className = 'scribble-mode-transition is-embedded is-visible is-arrival';
        root.style.position = '';
        root.style.inset = '0';
        root.style.left = '';
        root.style.top = '';
        root.style.width = '';
        root.style.height = '';
        root.style.opacity = '1';
        root.style.transition = 'none';
        arrival.bridge.resize({w: host.clientWidth, h: host.clientHeight},
            Math.min(global.devicePixelRatio || 1, 2));

        gameCanvas.style.opacity = '0';
        gameCanvas.style.transition = 'none';
        const duration = arrival.reduced ? 1 : 520;
        global.requestAnimationFrame(function () {
            global.requestAnimationFrame(function () {
                if (arrival.disposed) return;
                root.style.transition = 'opacity ' + duration + 'ms ease-in-out';
                gameCanvas.style.transition = 'opacity ' + duration + 'ms ease-in-out';
                root.style.opacity = '0';
                gameCanvas.style.opacity = '1';
            });
        });
        arrival.timeout = global.setTimeout(function () {
            gameCanvas.style.opacity = '';
            gameCanvas.style.transition = '';
            disposeArrival(arrival);
        }, duration + 80);
        return true;
    }

    function createTextureLoader(packs, palette) {
        const sprites = {};
        const cache = {};
        const parse = function (hex) {
            const value = parseInt(hex.replace('#', ''), 16);
            return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
        };
        const ink = parse(palette.ink);
        const paper = parse(palette.paper);

        function duotone(source) {
            const canvas = document.createElement('canvas');
            canvas.width = source.naturalWidth;
            canvas.height = source.naturalHeight;
            const context = canvas.getContext('2d');
            context.drawImage(source, 0, 0);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < pixels.data.length; i += 4) {
                if (!pixels.data[i + 3]) continue;
                const light = (pixels.data[i] * .299 + pixels.data[i + 1] * .587 + pixels.data[i + 2] * .114) / 255;
                pixels.data[i] = ink[0] + (paper[0] - ink[0]) * light;
                pixels.data[i + 1] = ink[1] + (paper[1] - ink[1]) * light;
                pixels.data[i + 2] = ink[2] + (paper[2] - ink[2]) * light;
            }
            context.putImageData(pixels, 0, 0);
            return canvas;
        }

        return {
            load: function () {
                return Promise.all(Object.keys(packs).map(function (name) {
                    return new Promise(function (resolve) {
                        const image = new Image();
                        image.onload = function () { sprites[name] = image; resolve(); };
                        image.onerror = resolve;
                        image.src = packs[name] + name + '.png';
                    });
                }));
            },
            textureFor: function (name) {
                if (!sprites[name]) return null;
                if (!cache[name]) cache[name] = duotone(sprites[name]);
                return cache[name];
            },
        };
    }

    // The adapters are authored for the preview pages under tools/, so their
    // asset paths climb one folder. The app itself is served from the root.
    function appPacks(packs) {
        const inTools = /\/tools\//.test((global.location && global.location.pathname) || '');
        if (inTools) return packs;
        const out = {};
        Object.keys(packs).forEach(function (name) {
            out[name] = String(packs[name]).replace(/^\.\.\/assets\//, './assets/');
        });
        return out;
    }

    /** Runs the matching authored cinematic and resolves false on the fallback path. */
    function runScribbleModeTransition(fromMode, options) {
        const factory = fromMode === 'scribble_dungeon'
            ? global.createScribbleMagicDoorPreviewAdapter
            : global.createScribbleFallTransitionPreviewAdapter;
        if (!factory || typeof global.createScribbleBridge !== 'function' || !global.THREE) {
            return {promise: Promise.resolve(false), cancel: function () {}, start: function () {}, available: false};
        }

        // The arriving pawn wears the destination game's art but the player's own
        // colour, which is the colour of the game being left. Anything else walks
        // a different character into the room the spell just opened.
        const pawnColor = pawnColorFor(fromMode);

        let cancel = function () {};
        let startRequested = !(options && options.waitForStart);
        let startPlayback = function () { startRequested = true; };
        let refreshHeld = null;
        let pinned = null;
        let pinImage = null;
        const promise = new Promise(function (resolve) {
            const adapter = factory();
            const character = typeof adapter.character === 'function' ? adapter.character(pawnColor) : null;
            const packs = appPacks(character ? Object.assign({}, adapter.packs, character.packs) : adapter.packs);
            // A live game inks the 3D stage with its own theme, so a room played
            // in 3D cannot be told apart from the one the canvas would draw.
            const palette = (options && options.palette) || adapter.palette || {ink: '#2e3a55', paper: '#fdfdf9'};
            const loader = createTextureLoader(packs, palette);
            let root = null;
            let bridge = null;
            let blueprint = null;
            let frame = 0;
            let done = false;
            let revealed = false;
            let retained = null;
            let playing = false;
            let started = null;
            let drawFrame = null;
            // The live game reports its own room and camera every frame, so the 3D
            // layer can stand in the same coordinate frame as the canvas below it.
            const liveSource = options && typeof options.live === 'function' ? options.live : null;
            function readLive() {
                if (!liveSource) return null;
                try { return liveSource(); } catch (error) { return null; }
            }
            const host = options && options.host && typeof options.host.appendChild === 'function'
                ? options.host : document.body;
            const embedded = host !== document.body;
            const liveRoom = !!(options && options.liveRoom && embedded);
            // The room itself is 3D while it is played. The game keeps the page
            // below this layer and draws its pawn and signs on a layer above it.
            const roomIn3d = !!(options && options.roomIn3d && embedded);
            const reduced = !!(options && options.reduced);
            const duration = reduced ? 1 : Math.max(5000, adapter.duration * 550);
            // An adapter may hold the route past its authored end (progress 1)
            // for a fraction of its duration, set once its stage is built.
            let tail = 0;
            // Exchange the two flat layers while the camera is still, then
            // travel. Hold the completed arrival before handing it to Vue.
            const entryDuration = reduced ? 0 : 360;
            const exitDuration = reduced ? 0 : 320;
            let entryMix = 0;
            let stage = 'entry';

            function finish(completed) {
                if (done) return;
                done = true;
                if (frame) cancelAnimationFrame(frame);
                global.removeEventListener('resize', resize);
                if (completed && options && options.holdForArrival && root && bridge) {
                    retained = retainArrival(root, bridge, host, reduced);
                    root = null;
                    bridge = null;
                    cancel = function () { disposeArrival(retained); };
                } else {
                    if (bridge) bridge.dispose();
                    if (root && root.parentNode) root.parentNode.removeChild(root);
                }
                if (options && typeof options.onFinish === 'function') options.onFinish(completed);
                resolve(completed);
            }

            function resize() {
                if (!bridge) return;
                const width = embedded ? host.clientWidth : global.innerWidth;
                const height = embedded ? host.clientHeight : global.innerHeight;
                bridge.resize({w: width, h: height}, Math.min(global.devicePixelRatio || 1, 2));
                if (!playing && drawFrame) drawFrame(0);
                if (pageView && (pageView.w !== width || pageView.h !== height)) requestPage();
            }

            // The next game's first frame, painted by that game at this size.
            // The route ends on it, so the arrival dissolve changes nothing but
            // the pawn and the signs. A stale paint (after a resize) is dropped.
            const paintPage = options && typeof options.arrivalPage === 'function' ? options.arrivalPage : null;
            let pageView = null;
            let pageToken = 0;
            let pageReady = false;
            function requestPage() {
                if (!paintPage || !bridge) return;
                const token = ++pageToken;
                pageView = {w: embedded ? host.clientWidth : global.innerWidth,
                    h: embedded ? host.clientHeight : global.innerHeight};
                const view = {w: pageView.w, h: pageView.h};
                // A failed paint only costs the page; the route still runs.
                new Promise(function (ok) { ok(paintPage(view, Math.min(global.devicePixelRatio || 1, 2))); }).then(function (page) {
                    if (done || token !== pageToken || !page || !bridge) return;
                    bridge.setDecal('landing-paper', page);
                    pageReady = true;
                    if (!playing && drawFrame) drawFrame(0);
                }).catch(function () {});
            }

            cancel = function () { finish(false); };
            loader.load().then(function () {
                if (done) return;
                root = document.createElement('div');
                root.className = 'scribble-mode-transition' + (embedded ? ' is-embedded' : '');
                root.setAttribute('role', 'status');
                root.setAttribute('aria-label', 'מעבר בין עולמות המשחק');
                const canvas = document.createElement('canvas');
                root.appendChild(canvas);
                host.appendChild(root);
                // Commit the transparent embedded layer before the first bridge
                // frame. The authored gateway room then dissolves into 3D instead
                // of looking like a new full-screen route has been opened.
                if (embedded) void root.offsetWidth;

                bridge = global.createScribbleBridge({canvas: canvas, textureFor: loader.textureFor});
                if (!bridge) { finish(false); return; }
                blueprint = adapter.stage(character, readLive());
                tail = typeof adapter.tail === 'function' ? Math.max(0, adapter.tail(blueprint) || 0) : 0;
                bridge.setRoom(blueprint);
                const departure = options && options.departurePage;
                if (departure) bridge.setDecal('departure-paper', departure);
                const given = options && options.pinned;
                if (given && given.image && given.frame) {
                    bridge.setDecal('pinned-layer', given.image, {overlay: true});
                    pinned = given.frame;
                }
                resize();
                requestPage();
                global.addEventListener('resize', resize);
                drawFrame = function (progress) {
                    const view = embedded ? {w: host.clientWidth, h: host.clientHeight}
                        : {w: global.innerWidth, h: global.innerHeight};
                    const state = adapter.state(progress, view, blueprint, readLive());
                    bridge.setPose(state.pose);
                    adapter.apply(bridge, state, blueprint, {
                        progress: progress, manual: false, embedded: embedded, liveRoom: liveRoom,
                        roomIn3d: roomIn3d, view: view, page: pageReady, pinned: pinned,
                        departure: !!(options && options.departurePage),
                        staged3d: !!(options && options.staged3d),
                        wandHeld: !!(options && options.wandHeld),
                    });
                    bridge.render();
                    if (options && typeof options.onState === 'function') {
                        options.onState({progress: progress, state: state, root: root, waiting: !playing,
                            stage: stage, entryMix: entryMix});
                    }
                    if (!revealed) {
                        revealed = true;
                        if (!liveRoom) root.classList.add('is-visible');
                    }
                    return state;
                };

                function render(now) {
                    if (done || !playing) return;
                    if (started === null) started = now;
                    const elapsed = now - started;
                    const entry = entryDuration ? Math.min(1, elapsed / entryDuration) : 1;
                    entryMix = entry * entry * (3 - 2 * entry);
                    const end = 1 + tail;
                    const progress = reduced ? end : Math.max(0, Math.min(end, (elapsed - entryDuration) / duration));
                    stage = elapsed < entryDuration ? 'entry' : progress < end ? 'travel' : 'exit';
                    drawFrame(progress);
                    if (elapsed >= entryDuration + duration * end + exitDuration) { finish(true); return; }
                    frame = requestAnimationFrame(render);
                }

                function begin() {
                    if (done || playing) return;
                    playing = true;
                    started = null;
                    frame = requestAnimationFrame(render);
                }
                startPlayback = function () { startRequested = true; begin(); };
                refreshHeld = function () { if (!done && !playing && drawFrame) drawFrame(0); };
                pinImage = function (image) {
                    const live = readLive();
                    if (!image || !live || !live.target || !live.unit || !bridge) return false;
                    const view = embedded ? {w: host.clientWidth, h: host.clientHeight}
                        : {w: global.innerWidth, h: global.innerHeight};
                    bridge.setDecal('pinned-layer', image, {overlay: true});
                    pinned = {flat: true, centre: [live.target[0], 0.07, live.target[2]],
                        width: view.w / live.unit, height: view.h / live.unit};
                    return true;
                };

                // The waiting frame is the same first frame the animation will
                // continue from. It can therefore sit underneath a live question
                // without a rebuild or visual jump when the answer is accepted.
                drawFrame(0);
                if (options && typeof options.onReady === 'function') options.onReady();
                if (startRequested) begin();
            }).catch(function () { finish(false); });
        });
        return {
            promise: promise,
            cancel: function () { cancel(); },
            start: function () { startPlayback(); },
            // Redraws the held first frame after the live camera has moved.
            refresh: function () { if (refreshHeld) refreshHeld(); },
            // Lays a picture of the live 2D layer (the pawn) on the room floor
            // where the first frame shows it, so it stays in the room when the
            // camera leaves. Returns false if it could not be placed.
            pin: function (image) { return pinImage ? pinImage(image) : false; },
            available: true,
        };
    }

    global.scribbleNextModeForScore = nextModeForScore;
    global.SCRIBBLE_MODE_CYCLE = MODE_CYCLE;
    global.scribbleTransitionEntryRoute = entryRoute;
    global.ensureScribbleModeSegment = ensureModeSegment;
    global.commitScribbleModeTransition = commitModeTransition;
    global.runScribbleModeTransition = runScribbleModeTransition;
    global.consumeScribbleTransitionArrival = consumeArrival;
})(typeof window !== 'undefined' ? window : globalThis);
