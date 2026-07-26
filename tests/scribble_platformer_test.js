// Focused tests for Scribble Platformer.
// The module exposes its course geometry, room factory and component factory as
// pure functions, so layout and the learning lifecycle can be exercised without a
// canvas or a browser.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

let definition = null;
const context = {
    console,
    globalThis: null,
    window: null,
    performance: { now: () => 0 },
    setTimeout, clearTimeout,
    requestAnimationFrame() { return 0; },
    cancelAnimationFrame() { },
    matchMedia() { return { matches: false }; },
    Vue: {
        extend(value) { return value; },
        component(name, value) { definition = value; return value; },
    },
};
context.globalThis = context;
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('games/scribble-platformer.js', 'utf8'), context, { filename: 'scribble-platformer.js' });

let passed = 0;
function test(name, fn) {
    try { fn(); passed += 1; console.log('✓', name); }
    catch (error) { console.error('✗', name); throw error; }
}

const CFG = context.SCRIBBLE_PLATFORMER_CONFIG;

test('configuration validates and every referenced sprite is preloaded', () => {
    assert.deepStrictEqual(Array.from(context.validateScribblePlatformerConfig(CFG)), []);
    assert.ok(Object.keys(CFG.kinds).length >= 1, 'needs at least the jump room');
    assert.ok(CFG.cycle.length >= 1);
    // Duplicate sprite names would silently double the preload work.
    assert.strictEqual(new Set(CFG.sprites).size, CFG.sprites.length);
});

test('validation actually rejects a broken configuration', () => {
    const broken = {
        kinds: { ghost: { name: '', ground: 'nope', block: 'also_nope', decor: [['bad', 1]] } },
        cycle: ['missing'],
        sprites: CFG.sprites,
    };
    const errors = context.validateScribblePlatformerConfig(broken);
    assert.ok(errors.some(e => /missing name/.test(e)));
    assert.ok(errors.some(e => /missing hint/.test(e)));
    assert.ok(errors.some(e => /tile not preloaded/.test(e)));
    assert.ok(errors.some(e => /decor sprite not preloaded/.test(e)));
    assert.ok(errors.some(e => /unknown kind/.test(e)));
});

test('every art file the game asks for exists on disk', () => {
    CFG.sprites.forEach(name => {
        assert.ok(fs.existsSync(`assets/scribble-platformer/${name}.png`), `missing sprite ${name}.png`);
    });
});

test('rooms are deterministic: the same index always draws the same decor', () => {
    const a = context.scribblePlatformerMakeRoom(0, 0, 'jump');
    const b = context.scribblePlatformerMakeRoom(0, 0, 'jump');
    assert.deepStrictEqual(a.decor, b.decor);
    const other = context.scribblePlatformerMakeRoom(1, CFG.tile.roomTiles * CFG.tile.pitch, 'jump');
    assert.notDeepStrictEqual(a.decor, other.decor, 'different rooms should not look identical');
    assert.strictEqual(a.state, 'peek', 'a fresh room starts as a sketch');
    assert.strictEqual(a.reveal, 0);
});

test('answer blocks are laid out distinct, inside the room and above the ground', () => {
    const rand = context.scribblePlatformerMulberry(5);
    const room = context.scribblePlatformerMakeRoom(0, 0, 'jump');
    [2, 3, 4].forEach(count => {
        const blocks = context.scribblePlatformerBuildBlocks(room, count, context.scribblePlatformerMulberry(count));
        assert.strictEqual(blocks.length, count, `${count} answers need ${count} blocks`);
        const xs = new Set(blocks.map(b => Math.round(b.wx)));
        assert.strictEqual(xs.size, count, `${count}: two blocks share a column`);
        blocks.forEach(b => {
            assert.ok(b.wx >= room.x0 && b.wx <= room.x1, 'block escaped the room span');
            assert.ok(b.wy < CFG.tile.groundY, 'block must float above the ground line');
            assert.strictEqual(b.state, 'closed');
        });
    });
    assert.ok(rand);
});

test('path sampling is clamped and walks the whole polyline', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    const sample = (p, u) => {
        const r = context.scribblePlatformerSamplePath(p, u);
        return { x: r.x, y: r.y };
    };
    assert.deepStrictEqual(sample(pts, 0), { x: 0, y: 0 });
    assert.deepStrictEqual(sample(pts, 1), { x: 100, y: 100 });
    const mid = sample(pts, 0.5);
    assert.ok(Math.abs(mid.x - 100) < 1e-6 && Math.abs(mid.y - 0) < 1e-6,
        `midpoint by arc length should be the corner, got ${JSON.stringify(mid)}`);
    assert.deepStrictEqual(sample([{ x: 5, y: 5 }, { x: 5, y: 5 }], 0.4), { x: 5, y: 5 });
});

test('every current theme has an ink palette and unknown keys fall back', () => {
    ['base', 'soldiers', 'unicorn', 'space', 'dark', 'code'].forEach(k => {
        const pal = context.resolvePlatformerTheme(k);
        ['paper', 'paper2', 'ink', 'faint', 'grid', 'sign', 'bad', 'good'].forEach(field => {
            assert.ok(pal[field], `${k} theme missing ${field}`);
        });
        assert.notStrictEqual(pal.ink, pal.paper);
    });
    assert.strictEqual(context.resolvePlatformerTheme('nope'), context.resolvePlatformerTheme('base'));
});

test('component factory wires the base component and cleans up after itself', () => {
    const component = context.createScribblePlatformerComponent({ name: 'base' });
    assert.strictEqual(component, definition);
    assert.strictEqual(component.extends.name, 'base');
    assert.strictEqual(typeof component.mounted, 'function');
    assert.strictEqual(typeof component.beforeDestroy, 'function');
    assert.strictEqual(typeof component.methods.prepareRound, 'function');

    let cancelled = 0;
    const removed = [];
    context.cancelAnimationFrame = () => { cancelled += 1; };
    const state = {
        _timers: new Set([setTimeout(() => { }, 1000)]),
        roundToken: 3,
        _onResize() { },
        onKeydown() { },
        _sp: { raf: 7, fx: [{}], motes: [{}], rooms: [{}], inkCache: { a: 1 }, sprites: { a: 1 } },
    };
    const originalRemove = context.removeEventListener;
    context.removeEventListener = (name) => removed.push(name);
    component.beforeDestroy.call(state);
    context.removeEventListener = originalRemove;

    assert.strictEqual(state._destroyed, true);
    assert.strictEqual(state.roundToken, 4, 'token bump invalidates queued transitions');
    assert.strictEqual(state._timers.size, 0);
    assert.strictEqual(cancelled, 1);
    assert.deepStrictEqual(removed.sort(), ['keydown', 'resize']);
    assert.strictEqual(state._sp.raf, null);
    assert.strictEqual(state._sp.rooms.length, 0);
    assert.strictEqual(Object.keys(state._sp.sprites).length, 0);
    assert.strictEqual(state._sp.fx.length, 0);
    assert.strictEqual(state._sp.motes.length, 0);
});

// --------------------------------------------------------- learning lifecycle

function answerHarness(correct) {
    const calls = [];
    const timers = [];
    Object.assign(context, {
        updateWeightForKey(id, index, delta) { calls.push(['weight', id, index, delta]); },
        successSound: { play() { calls.push(['success']); return Promise.resolve(); } },
        failureSound: { play() { calls.push(['failure']); return Promise.resolve(); } },
    });
    const component = context.createScribblePlatformerComponent({ name: 'base' });
    const room = context.scribblePlatformerMakeRoom(0, 0, 'jump');
    room.state = 'visited';
    room.reveal = 1;
    room.blocks = context.scribblePlatformerBuildBlocks(room, 3, context.scribblePlatformerMulberry(9));
    room.blocks[0].label = 'right'; room.blocks[0].plain = 'right';
    room.blocks[1].label = 'wrong'; room.blocks[1].plain = 'wrong';
    room.blocks[2].label = 'other'; room.blocks[2].plain = 'other';

    const state = {
        locked: false, result: 'right', questionIndex: 7, currentAppId: 'game-id',
        score: 2, streak: 1, gems: 0, explored: 1, depth: 1, hotspots: [{}],
        feedback: '', feedbackGood: false, feedbackBad: false, roundToken: 1,
        reduced: true, _destroyed: false,
        pace: 1, rate: component.methods.rate, dur: component.methods.dur,
        _sp: {
            current: room, rooms: [room], state: 'question',
            pawn: { x: 0, y: 0, color: 'red' },
            fx: [], shakeAmp: 0, cam: { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1 },
            view: { w: 800, h: 600 },
        },
        getSuccessMsg: () => 'יופי',
        reloadProgress() { calls.push(['reload']); return true; },
        saveScore() { calls.push(['save']); },
        own(fn) { timers.push(fn); },
        aimCamera() { }, aimCameraFor() { }, syncHotspots() { }, shake() { }, puff() { },
        frameFor: () => ({ x: 0, y: 0, z: 1 }), mapMode: false,
        setRoomLabel() { },
        playSound: component.methods.playSound,
        onCorrect: component.methods.onCorrect,
        onWrong: component.methods.onWrong,
        beginAdvance: component.methods.beginAdvance,
        finishWalk: component.methods.finishWalk,
    };

    const index = correct ? 0 : 1;
    // Called twice on purpose: a double tap must not double-report.
    component.methods.answer.call(state, index);
    component.methods.answer.call(state, index);
    return { calls, timers, state, component, room };
}

test('a correct block reports exactly once, is cleared, and extends the course', () => {
    const r = answerHarness(true);
    assert.strictEqual(r.calls.filter(c => c[0] === 'weight').length, 1);
    assert.deepStrictEqual(r.calls.find(c => c[0] === 'weight'), ['weight', 'game-id', 7, -1]);
    assert.strictEqual(r.state.score, 3);
    assert.strictEqual(r.state.gems, 1, 'a coin is earned');
    assert.strictEqual(r.room.blocks[0].state, 'solved');
    assert.strictEqual(r.state.explored, 2, 'the course grew by a room');
    assert.strictEqual(r.state._sp.rooms.length, 2);
    assert.ok(r.state._sp.walk, 'a hop was started');
    assert.strictEqual(r.state._sp.walk.pts.length, 3);
    assert.strictEqual(r.state._sp.state, 'walking');
});

test('a wrong block reports once, crumbles, and leaves the correct one to try', () => {
    const r = answerHarness(false);
    assert.strictEqual(r.calls.filter(c => c[0] === 'weight').length, 1);
    assert.deepStrictEqual(r.calls.find(c => c[0] === 'weight'), ['weight', 'game-id', 7, 1]);
    assert.strictEqual(r.state.score, 1);
    assert.strictEqual(r.state.streak, 0);
    assert.strictEqual(r.room.blocks[1].state, 'crumbled');
    assert.strictEqual(r.room.blocks[0].state, 'closed', 'the correct block is still there');
    assert.strictEqual(r.state._sp.walk, undefined, 'a wrong answer never moves the pawn');

    // The queued unlock re-opens input rather than advancing the round.
    assert.strictEqual(r.timers.length, 1);
    r.timers[0]();
    assert.strictEqual(r.state.locked, false);
});

test('answers are refused once the round is locked or the block is spent', () => {
    const r = answerHarness(false);
    const before = r.calls.length;
    r.state.locked = false;
    r.state._sp.state = 'walking';
    r.component.methods.answer.call(r.state, 0);   // wrong game state
    r.state._sp.state = 'question';
    r.component.methods.answer.call(r.state, 1);   // already-crumbled block
    r.component.methods.answer.call(r.state, 9);   // out of range
    assert.strictEqual(r.calls.length, before, 'no further reports were made');
});

console.log(`\n${passed} Scribble Platformer tests passed`);
