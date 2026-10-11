const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function harness(reduced) {
    const frames = new Map();
    const states = [];
    let id = 0, disposed = 0;
    const host = {clientWidth: 1000, clientHeight: 700,
        appendChild(node) { node.parentNode = this; },
        removeChild(node) { node.parentNode = null; }};
    const context = {console, Promise, THREE: {},
        document: {body: host, createElement() {
            return {style: {}, classList: {add() {}}, setAttribute() {}, appendChild() {}};
        }},
        requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
        cancelAnimationFrame(key) { frames.delete(key); },
        addEventListener() {}, removeEventListener() {},
        createScribbleBridge() { return {setRoom() {}, resize() {}, setPose() {}, render() {},
            dispose() { disposed++; }}; },
        createScribbleFallTransitionPreviewAdapter() { return {packs: {}, duration: 10,
            stage() { return {}; }, state(p) { return {pose: {}, p}; }, apply() {}}; },
    };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('games/scribble-transition-cycle.js', 'utf8'), context);
    const run = context.runScribbleModeTransition('scribble_platformer', {
        host, reduced, onState(frame) { states.push(frame); },
    });
    return {run, states, frames, disposed: () => disposed,
        tick(now) { const callbacks = Array.from(frames.values()); frames.clear(); callbacks.forEach(fn => fn(now)); }};
}

(async () => {
    const h = harness(false);
    await Promise.resolve(); await Promise.resolve();
    h.tick(0);
    h.tick(180);
    assert.equal(h.states.at(-1).stage, 'entry');
    assert.equal(h.states.at(-1).progress, 0, 'camera stays still throughout the layer exchange');
    assert.equal(h.states.at(-1).entryMix, .5);
    h.tick(360);
    assert.equal(h.states.at(-1).entryMix, 1);
    assert.equal(h.states.at(-1).progress, 0);
    h.tick(3110);
    assert.equal(h.states.at(-1).progress, .5);
    h.tick(5860);
    assert.equal(h.states.at(-1).stage, 'exit');
    assert.equal(h.states.at(-1).progress, 1);
    assert.equal(h.disposed(), 0, 'destination has its own settle before routing');
    h.tick(6180);
    assert.equal(await h.run.promise, true);
    assert.equal(h.disposed(), 1);
    assert.equal(h.frames.size, 0);

    const reduced = harness(true);
    await Promise.resolve(); await Promise.resolve();
    reduced.tick(0);
    assert.equal(reduced.states.at(-1).progress, 1, 'reduced motion skips camera travel');
    reduced.tick(16);
    assert.equal(await reduced.run.promise, true);

    for (const time of [180, 3110, 5860]) {
        const cancelled = harness(false);
        await Promise.resolve(); await Promise.resolve();
        cancelled.tick(0); cancelled.tick(time);
        cancelled.run.cancel(); cancelled.run.cancel();
        assert.equal(await cancelled.run.promise, false);
        assert.equal(cancelled.frames.size, 0);
        assert.equal(cancelled.disposed(), 1, 'each phase can be cancelled exactly once');
    }

    const camera = {};
    vm.createContext(camera);
    vm.runInContext(fs.readFileSync('tools/scribble-fall-transition-adapter.js', 'utf8'), camera);
    const adapter = camera.createScribbleFallTransitionPreviewAdapter();
    const live = {target: [.25, 1.6, 0], unit: 43, objectY: .5};
    const liveState = adapter.state(0, {w: 900, h: 550}, null, live);
    assert.deepEqual(liveState.pose.target, live.target);
    assert.equal(liveState.pose.unit, live.unit);
    assert.equal(liveState.object.position[1], live.objectY);
    for (const view of [{w: 1280, h: 800}, {w: 390, h: 700}, {w: 844, h: 390}]) {
        const start = adapter.state(0, view).pose;
        const scale = view.h / (2 * (start.position[2] - .4) * Math.tan(start.fov * Math.PI / 360));
        assert.ok(Math.abs(scale - start.unit) < 1e-8, 'entry matches the flat ledge scale');
        assert.equal(start.position[1], start.target[1], 'entry has no accidental camera tilt');
        for (const boundary of [0, .001, .25, .70, .88, .93]) {
            const a = adapter.state(boundary, view).pose;
            const b = adapter.state(boundary + .000001, view).pose;
            assert.equal(a.perspective, b.perspective, 'no discrete projection switch');
            assert.ok(Math.hypot(...a.position.map((v, i) => v - b.position[i])) < .01, 'continuous camera position');
        }
        assert.deepEqual(adapter.state(.94, view).pose, adapter.state(1, view).pose,
            'camera is settled while the character enters');
        const end = adapter.state(1, view).pose;
        const endScale = view.h / (2 * (end.position[1] - end.target[1]) * Math.tan(end.fov * Math.PI / 360));
        assert.ok(Math.abs(endScale - end.unit) < 1e-8, 'exit lens matches destination room framing');
    }
    console.log('7 transition timing and camera checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
