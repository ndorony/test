// Focused tests for Scribble Dungeon.
// The module exposes its dungeon geometry, room factory and component factory as
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
vm.runInContext(fs.readFileSync('games/scribble-dungeon.js', 'utf8'), context, { filename: 'scribble-dungeon.js' });

let passed = 0;
function test(name, fn) {
    try { fn(); passed += 1; console.log('✓', name); }
    catch (error) { console.error('✗', name); throw error; }
}

const CFG = context.SCRIBBLE_DUNGEON_CONFIG;
const key = context.scribbleDungeonRoomKey;

test('configuration validates and every referenced sprite is preloaded', () => {
    assert.deepStrictEqual(Array.from(context.validateScribbleDungeonConfig(CFG)), []);
    assert.ok(Object.keys(CFG.kinds).length >= 5, 'needs a varied set of room kinds');
    assert.ok(CFG.cycle.length >= Object.keys(CFG.kinds).length);
    // Duplicate sprite names would silently double the preload work.
    assert.strictEqual(new Set(CFG.sprites).size, CFG.sprites.length);
});

test('validation actually rejects a broken configuration', () => {
    const broken = {
        kinds: { ghost: { name: '', floor: 'nope', decor: [['also_nope', 1]] } },
        cycle: ['missing'],
        sprites: CFG.sprites,
    };
    const errors = context.validateScribbleDungeonConfig(broken);
    assert.ok(errors.some(e => /missing name/.test(e)));
    assert.ok(errors.some(e => /floor sprite not preloaded/.test(e)));
    assert.ok(errors.some(e => /decor sprite not preloaded/.test(e)));
    assert.ok(errors.some(e => /unknown kind/.test(e)));
});

test('every art file the game asks for exists on disk', () => {
    CFG.sprites.forEach(name => {
        assert.ok(fs.existsSync(`assets/scribble-dungeons/${name}.png`), `missing sprite ${name}.png`);
    });
});

test('every kind offers several odd footprints, and they are not all the same size', () => {
    const areas = new Set();
    Object.keys(CFG.kinds).forEach(k => {
        CFG.kinds[k].shapes.forEach(s => {
            assert.strictEqual(s[0] % 2, 1, `${k}: width must be odd so a door can centre`);
            assert.strictEqual(s[1] % 2, 1, `${k}: height must be odd`);
            assert.ok(s[0] >= 3 && s[1] >= 3, `${k}: too small for a wall ring`);
            areas.add(s[0] * s[1]);
        });
    });
    // The whole point of the rewrite: a plan of varied rooms, not a grid of boxes.
    assert.ok(areas.size >= 8, `expected many distinct footprints, got ${areas.size}`);
});

test('corridor lengths favour shared walls but still allow long passages', () => {
    const lens = CFG.corridorLengths;
    assert.ok(lens.indexOf(0) >= 0, 'rooms must be able to sit wall-to-wall');
    assert.ok(Math.max.apply(null, lens) >= 4, 'and some wings must be joined by a passage');
    const zeros = lens.filter(l => l === 0).length;
    assert.ok(zeros / lens.length > 0.3, 'a floor plan is mostly adjacency, not corridors');
});

test('rooms are deterministic: the same cell always draws the same props', () => {
    const a = context.scribbleDungeonMakeRoom(3, -2, 9, 7, 4, 'vault');
    const b = context.scribbleDungeonMakeRoom(3, -2, 9, 7, 4, 'vault');
    assert.deepStrictEqual(a.decor, b.decor);
    const other = context.scribbleDungeonMakeRoom(4, -2, 9, 7, 4, 'vault');
    assert.notDeepStrictEqual(a.decor, other.decor, 'different cells should not look identical');
});

test('props stay inside the wall ring and off the tile the pawn stands on', () => {
    Object.keys(CFG.kinds).forEach(kind => {
        CFG.kinds[kind].shapes.forEach(shape => {
            const w = shape[0], h = shape[1];
            const room = context.scribbleDungeonMakeRoom(kind.length, w, w, h, 1, kind);
            const cx = Math.floor((w - 1) / 2);
            const cy = Math.floor((h - 1) / 2);
            room.decor.forEach(p => {
                assert.ok(p.c > 0 && p.c < w - 1, `${kind} ${w}x${h}: prop escaped the wall ring`);
                assert.ok(p.r > 0 && p.r < h - 1, `${kind} ${w}x${h}: prop escaped the wall ring`);
                if (!p.under) {
                    assert.ok(!(p.c === cx && p.r === cy),
                        `${kind} ${w}x${h}: prop sits where the pawn stands`);
                }
            });
        });
    });
});

test('decor density scales with the room, so a closet is not furnished like a hall', () => {
    const small = context.scribbleDungeonMakeRoom(0, 0, 5, 5, 1, 'hall');
    const big = context.scribbleDungeonMakeRoom(40, 40, 15, 11, 1, 'hall');
    assert.ok(big.decor.length > small.decor.length,
        `big ${big.decor.length} should hold more than small ${small.decor.length}`);
});

test('a new room starts as a sketch and only the entered room is inked', () => {
    const room = context.scribbleDungeonMakeRoom(1, 0, 9, 7, 1, 'hall');
    assert.strictEqual(room.state, 'peek', 'rooms behind unopened doors stay faint');
    assert.strictEqual(room.looted, false);
    assert.strictEqual(room.reveal, 0);
    assert.strictEqual(room.doors.length, 0);
});

test('placement never overlaps an existing room, and reports a usable connection', () => {
    const rand = context.scribbleDungeonMulberry(12345);
    const taken = {};
    const start = context.scribbleDungeonMakeRoom(0, 0, 9, 7, 0, 'hall');
    context.scribbleDungeonOccupyRect(taken, start.x, start.y, start.w, start.h);

    // Grow the plan the way the game does: work through the rooms, and for each
    // one try every side that has not been built on yet.
    let placed = 0;
    let rooms = [start];
    let head = 0;
    let depth = 1;
    while (head < rooms.length && placed < 30) {
        const host = rooms[head++];
        const dirs = ['n', 'e', 's', 'w'];
        for (let k = 0; k < dirs.length && placed < 30; k++) {
            const p = context.scribbleDungeonPlaceNeighbour(taken, host, dirs[k], depth++, rand);
            if (!p) continue;
            placed++;

            // The new room must not sit on any tile already used.
            for (let x = p.target.x; x < p.target.x + p.target.w; x++) {
                for (let y = p.target.y; y < p.target.y + p.target.h; y++) {
                    assert.ok(!taken[context.scribbleDungeonTileKey(x, y)],
                        `placement overlapped an occupied tile at ${x},${y}`);
                }
            }
            // The door tile must lie on the host room's wall ring.
            const d = p.doorTile;
            const onRing = d.x === host.x || d.x === host.x + host.w - 1
                || d.y === host.y || d.y === host.y + host.h - 1;
            assert.ok(onRing, 'door must sit on the host wall');
            // The entry must lie on the new room's wall ring.
            assert.ok(p.target.entry.c === 0 || p.target.entry.c === p.target.w - 1
                || p.target.entry.r === 0 || p.target.entry.r === p.target.h - 1,
                'entry must sit on the new room wall');

            context.scribbleDungeonOccupyRect(taken, p.target.x, p.target.y, p.target.w, p.target.h);
            p.corridor.forEach(c => { taken[context.scribbleDungeonTileKey(c.x, c.y)] = true; });
            rooms.push(p.target);
        }
    }
    assert.ok(placed >= 20, `generator should keep finding room; only placed ${placed}`);

    // A real plan, not a corridor of clones.
    const footprints = new Set(rooms.map(r => r.w + 'x' + r.h));
    assert.ok(footprints.size >= 6, `expected varied rooms, got ${footprints.size} shapes`);
});

test('a shared-wall connection puts the two rooms directly against each other', () => {
    const taken = {};
    const host = context.scribbleDungeonMakeRoom(0, 0, 9, 7, 0, 'hall');
    context.scribbleDungeonOccupyRect(taken, host.x, host.y, host.w, host.h);
    // Force the zero-length case by driving the generator with a fixed stream.
    let p = null;
    for (let seed = 1; seed < 400 && !p; seed++) {
        const rand = context.scribbleDungeonMulberry(seed);
        const candidate = context.scribbleDungeonPlaceNeighbour(taken, host, 'e', 1, rand, 1);
        if (candidate && candidate.corridor.length === 0) p = candidate;
    }
    assert.ok(p, 'the generator must be able to butt two rooms together');
    assert.strictEqual(p.target.x, host.x + host.w,
        'with no corridor the new west wall is the column right after the host east wall');
});

test('rectFree allows touching but rejects overlap', () => {
    const taken = {};
    context.scribbleDungeonOccupyRect(taken, 0, 0, 5, 5);
    assert.strictEqual(context.scribbleDungeonRectFree(taken, 5, 0, 5, 5), true, 'touching is allowed');
    assert.strictEqual(context.scribbleDungeonRectFree(taken, 4, 0, 5, 5), false, 'overlap is not');
});

test('two runs do not walk the same dungeon', () => {
    const plan = (seed) => context.scribbleDungeonBuildRunPlan(
        context.scribbleDungeonMulberry(seed), seed);

    const a = plan(111).slice(0, 12).join(',');
    const seedA = context.scribbleDungeonRoomSeed(0, 0);
    const b = plan(999).slice(0, 12).join(',');
    const seedB = context.scribbleDungeonRoomSeed(0, 0);

    assert.notStrictEqual(a, b, 'the room order must be dealt per run, not fixed');
    assert.notStrictEqual(seedA, seedB, 'the same cell must not always hold the same furniture');

    // The rhythm survives the shuffle: a challenge and a reward in every four.
    const deck = context.scribbleDungeonBuildRunPlan(context.scribbleDungeonMulberry(7), 7);
    assert.strictEqual(deck[0], 'hall', 'a run always opens somewhere plain');
    for (let i = 1; i + 4 <= deck.length; i += 4) {
        const group = deck.slice(i, i + 4);
        assert.ok(group.some(k => CFG.kinds[k].challenge),
            `no challenge room in ${group.join(',')}`);
        assert.ok(group.some(k => CFG.kinds[k].reward || k === 'camp'),
            `no reward room in ${group.join(',')}`);
    }
    // Every dealt kind must be a real room.
    deck.forEach(k => assert.ok(CFG.kinds[k], `dealt unknown kind ${k}`));
});

test('the dealt room order covers a wide spread of kinds and then repeats', () => {
    const deck = context.scribbleDungeonBuildRunPlan(context.scribbleDungeonMulberry(42), 42);
    const seen = new Set();
    for (let d = 0; d < deck.length * 2; d++) {
        const kind = context.scribbleDungeonKindForDepth(d);
        assert.ok(CFG.kinds[kind], `depth ${d} produced unknown kind ${kind}`);
        seen.add(kind);
    }
    assert.ok(seen.size >= 8, `a run should visit many kinds, saw ${seen.size}`);
    // Past the end of the deck the order wraps rather than running out.
    assert.strictEqual(context.scribbleDungeonKindForDepth(0),
        context.scribbleDungeonKindForDepth(deck.length));

    // The fallback cycle is still valid for anything asking outside a run.
    CFG.cycle.forEach(k => assert.ok(CFG.kinds[k], `fallback cycle has unknown kind ${k}`));
});

test('path sampling is clamped and walks the whole polyline', () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    const sample = (p, u) => {
        const r = context.scribbleDungeonSamplePath(p, u);
        return { x: r.x, y: r.y };     // unwrap: the vm realm has its own Object
    };
    assert.deepStrictEqual(sample(pts, 0), { x: 0, y: 0 });
    assert.deepStrictEqual(sample(pts, 1), { x: 100, y: 100 });
    const mid = sample(pts, 0.5);
    assert.ok(Math.abs(mid.x - 100) < 1e-6 && Math.abs(mid.y - 0) < 1e-6,
        `midpoint by arc length should be the corner, got ${JSON.stringify(mid)}`);
    // A degenerate path must not divide by zero.
    assert.deepStrictEqual(sample([{ x: 5, y: 5 }, { x: 5, y: 5 }], 0.4), { x: 5, y: 5 });
});

test('every current theme has an ink palette and unknown keys fall back', () => {
    ['base', 'soldiers', 'unicorn', 'space', 'dark', 'code'].forEach(k => {
        const pal = context.resolveScribbleTheme(k);
        ['paper', 'paper2', 'ink', 'faint', 'grid', 'sign', 'signInk', 'bad', 'good'].forEach(field => {
            assert.ok(pal[field], `${k} theme missing ${field}`);
        });
        // Dark themes must not paint black ink onto a black page.
        assert.notStrictEqual(pal.ink, pal.paper);
    });
    assert.strictEqual(context.resolveScribbleTheme('nope'), context.resolveScribbleTheme('base'));
});

test('component factory wires the base component and cleans up after itself', () => {
    const component = context.createScribbleDungeonComponent({ name: 'base' });
    assert.strictEqual(component, definition);
    assert.strictEqual(component.extends.name, 'base');
    assert.strictEqual(typeof component.mounted, 'function');
    assert.strictEqual(typeof component.beforeDestroy, 'function');
    assert.strictEqual(typeof component.methods.prepareRound, 'function');

    // Destroying mid-animation must stop the loop and drop every timer.
    let cancelled = 0;
    const removed = [];
    context.cancelAnimationFrame = () => { cancelled += 1; };
    const state = {
        _timers: new Set([setTimeout(() => { }, 1000)]),
        roundToken: 3,
        _onResize() { },
        onKeydown() { },
        _sd: {
            raf: 7, fx: [{}], motes: [{}], rooms: [{}], taken: { a: 1 },
            inkCache: { a: 1 }, sprites: { a: 1 },
        },
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
    assert.strictEqual(state._sd.raf, null);
    assert.strictEqual(state._sd.rooms.length, 0);
    assert.strictEqual(Object.keys(state._sd.taken).length, 0);
    assert.strictEqual(Object.keys(state._sd.sprites).length, 0);
    assert.strictEqual(state._sd.fx.length, 0);
    assert.strictEqual(state._sd.motes.length, 0);
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
    const component = context.createScribbleDungeonComponent({ name: 'base' });
    // North neighbour sits directly above; east neighbour behind a short corridor.
    const target = context.scribbleDungeonMakeRoom(0, -7, 9, 7, 1, 'hall');
    target.entry = { c: 4, r: 6 };
    const eastRoom = context.scribbleDungeonMakeRoom(11, 0, 9, 7, 1, 'hall');
    eastRoom.entry = { c: 0, r: 3 };

    const room = context.scribbleDungeonMakeRoom(0, 0, 9, 7, 0, 'hall');
    room.state = 'visited';
    room.reveal = 1;
    room.choices = [
        {
            dir: 'n', state: 'closed', swing: 0, sealT: 0, label: 'right', plain: 'right',
            index: 0, tile: { x: 4, y: 0 }, corridor: [], target: target,
        },
        {
            dir: 'e', state: 'closed', swing: 0, sealT: 0, label: 'wrong', plain: 'wrong',
            index: 1, tile: { x: 8, y: 3 }, corridor: [{ x: 9, y: 3 }, { x: 10, y: 3 }],
            target: eastRoom,
        },
    ];
    room.doors = room.choices.slice();

    const state = {
        locked: false, result: 'right', questionIndex: 7, currentAppId: 'game-id',
        score: 2, streak: 1, gems: 0, explored: 1, depth: 1, hotspots: [{}],
        feedback: '', feedbackGood: false, feedbackBad: false, roundToken: 1,
        reduced: true, _destroyed: false,
        pace: 1, rate: component.methods.rate, dur: component.methods.dur,
        _sd: {
            current: room, rooms: [room, target, eastRoom], taken: {}, state: 'question',
            pawn: { x: 0, y: 0, facing: 0, color: 'red', weapon: 'weapon_sword' },
            fx: [], shakeAmp: 0, cam: { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1 },
            view: { w: 800, h: 600 },
        },
        getSuccessMsg: () => 'יופי',
        reloadProgress() { calls.push(['reload']); return true; },
        saveScore() { calls.push(['save']); },
        own(fn) { timers.push(fn); },
        aimCamera() { }, aimCameraFor() { }, syncHotspots() { }, shake() { }, puff() { },
        frameFor: () => ({ x: 0, y: 0, z: 1 }), mapMode: false,
        buildExits() { calls.push(['buildExits']); return []; },
        persist() { calls.push(['persist']); },
        setRoomLabel() { },
        playSound: component.methods.playSound,
        onCorrect: component.methods.onCorrect,
        onWrong: component.methods.onWrong,
        beginWalk: component.methods.beginWalk,
    };

    const index = correct ? 0 : 1;
    // Called twice on purpose: a double tap must not double-report.
    component.methods.answer.call(state, index);
    component.methods.answer.call(state, index);
    return { calls, timers, state, component, room, target };
}

test('a correct door reports exactly once, opens, and walks into the next room', () => {
    const r = answerHarness(true);
    assert.strictEqual(r.calls.filter(c => c[0] === 'weight').length, 1);
    assert.deepStrictEqual(r.calls.find(c => c[0] === 'weight'), ['weight', 'game-id', 7, -1]);
    assert.strictEqual(r.state.score, 3);
    assert.strictEqual(r.calls.filter(c => c[0] === 'reload').length, 1);
    assert.strictEqual(r.room.choices[0].state, 'open');
    assert.strictEqual(r.target.state, 'visited', 'the room ahead is inked on entry');
    assert.strictEqual(r.state.explored, 2);
    assert.ok(r.state._sd.walk, 'a walk was started');
    assert.strictEqual(r.state._sd.walk.pts.length, 4);
});

test('a wrong door reports once, seals that route, and leaves the map readable', () => {
    const r = answerHarness(false);
    assert.strictEqual(r.calls.filter(c => c[0] === 'weight').length, 1);
    assert.deepStrictEqual(r.calls.find(c => c[0] === 'weight'), ['weight', 'game-id', 7, 1]);
    assert.strictEqual(r.state.score, 1);
    assert.strictEqual(r.state.streak, 0);
    assert.strictEqual(r.room.choices[1].state, 'sealed');
    assert.strictEqual(r.room.choices[1].target.state, 'sealed',
        'the road not taken stays on the map, crossed out');
    assert.strictEqual(r.room.choices[0].state, 'closed', 'the other door is still open to try');
    assert.strictEqual(r.state._sd.walk, undefined, 'a wrong answer never moves the pawn');

    // The queued unlock re-opens input rather than advancing the round.
    assert.strictEqual(r.timers.length, 1);
    r.timers[0]();
    assert.strictEqual(r.state.locked, false);
});

test('answers are refused once the round is locked or the door is spent', () => {
    const r = answerHarness(false);
    const before = r.calls.length;
    r.state.locked = false;
    r.state._sd.state = 'walking';
    r.component.methods.answer.call(r.state, 0);   // wrong game state
    r.state._sd.state = 'question';
    r.component.methods.answer.call(r.state, 1);   // already-sealed door
    r.component.methods.answer.call(r.state, 9);   // out of range
    assert.strictEqual(r.calls.length, before, 'no further reports were made');
});

test('a treasure room pays out once and never again', () => {
    const component = context.createScribbleDungeonComponent({ name: 'base' });
    const vault = context.scribbleDungeonMakeRoom(0, -8, 7, 7, 2, 'vault');
    const room = context.scribbleDungeonMakeRoom(0, 0, 9, 7, 1, 'hall');
    room.doors = [{ dir: 'n', state: 'open', index: 0, tile: { x: 4, y: 0 }, corridor: [], target: vault }];
    const state = {
        gems: 0, feedback: '', feedbackGood: false, _destroyed: false, roundToken: 1,
        _sd: {
            current: room, walk: { target: vault }, state: 'walking',
            pawn: { color: 'red', weapon: 'weapon_sword' },
        },
        own() { }, puff() { }, persist() { }, setRoomLabel() { }, prepareRound() { },
        pace: 1, reduced: true, rate: component.methods.rate, dur: component.methods.dur,
    };
    component.methods.finishWalk.call(state);
    assert.strictEqual(state.gems, 1);
    assert.strictEqual(vault.looted, true);
    assert.notStrictEqual(state._sd.pawn.weapon, 'weapon_sword', 'loot changes the held weapon');

    state._sd.walk = { target: vault };
    component.methods.finishWalk.call(state);
    assert.strictEqual(state.gems, 1, 're-entering a looted vault pays nothing');
});

test('the pawn starts unarmed and the first chest is where it finds a weapon', () => {
    const component = context.createScribbleDungeonComponent({ name: 'base' });
    const vault = context.scribbleDungeonMakeRoom(0, -8, 7, 7, 2, 'vault');
    const room = context.scribbleDungeonMakeRoom(0, 0, 9, 7, 1, 'hall');
    room.doors = [{ dir: 'n', state: 'open', index: 0, tile: { x: 4, y: 0 }, corridor: [], target: vault }];
    const state = {
        gems: 0, feedback: '', feedbackGood: false, _destroyed: false, roundToken: 1,
        _sd: {
            current: room, walk: { target: vault }, state: 'walking',
            pawn: { color: 'red', weapon: null },     // how a run begins
        },
        own() { }, puff() { }, persist() { }, setRoomLabel() { }, prepareRound() { },
        pace: 1, reduced: true, rate: component.methods.rate, dur: component.methods.dur,
    };
    component.methods.finishWalk.call(state);
    assert.strictEqual(state._sd.pawn.weapon, CFG.weapons[0], 'the first find is the first weapon');
    assert.match(state.feedback, /חרב/, 'and it is called out as finding a weapon');

    // A weapon is never restored from a previous run.
    const saved = [];
    context.setLocalStorage = (k, v) => saved.push([k, v]);
    context.getLocalStorage = () => ({ color: 'green', weapon: 'weapon_axe', gems: 4 });
    const restoreState = { gems: 0, _sd: { pawn: { color: 'red', weapon: null } } };
    component.methods.restore.call(restoreState);
    assert.strictEqual(restoreState._sd.pawn.weapon, null, 'every run starts empty-handed');
    assert.strictEqual(restoreState._sd.pawn.color, 'green', 'the chosen token is kept');
    assert.strictEqual(restoreState.gems, 4, 'earned gems survive a reload');

    // A reload keeps what was earned and nothing about the run itself.
    component.methods.persist.call(restoreState);
    assert.strictEqual(saved.length, 1);
    assert.deepStrictEqual(Object.keys(saved[0][1]).sort(), ['color', 'gems']);
    assert.strictEqual('weapon' in saved[0][1], false, 'the weapon is not carried over');
});

test('a reload restarts the map but keeps the score and the gems', () => {
    const component = context.createScribbleDungeonComponent({ name: 'base' });
    const state = {
        // As if the page had just reloaded: restore() has already run.
        score: 112, gems: 9, explored: 14, depth: 8, streak: 5, gemsRestored: true,
        _sd: {
            rooms: [{}, {}], taken: { a: 1 }, owner: { a: 1 },
            pawn: { x: 5, y: 5, facing: 2, color: 'green', weapon: 'weapon_axe' },
            cam: { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1 }, view: { w: 800, h: 600 },
        },
        buildExits() { }, snapCamera() { }, setRoomLabel() { },
    };
    component.methods.startRun.call(state);

    assert.strictEqual(state.score, 112, 'points earned are not thrown away');
    assert.strictEqual(state.gems, 9, 'nor are the gems');
    assert.strictEqual(state.explored, 1, 'but the map starts again');
    assert.strictEqual(state.streak, 0);
    assert.strictEqual(state._sd.pawn.weapon, null, 'and the weapon has to be found again');
    assert.strictEqual(state._sd.rooms.length, 1, 'a single fresh room');
    assert.strictEqual(state._sd.pawn.color, 'green', 'the chosen token stays');
});

test('every answer count has as many places to write as it has answers', () => {
    // The armoury lays out four weapons; anything fewer than that many slots
    // stacks two answers on the same spot.
    [2, 3, 4].forEach(n => {
        const slots = context.SCRIBBLE_DUNGEON_CONFIG.slotsFor(n);
        assert.strictEqual(slots.length, n, `${n} answers need ${n} slots`);
        const seen = new Set(slots.map(s => s.x + ',' + s.y));
        assert.strictEqual(seen.size, n, `${n}-slot layout has two slots in one place`);
        slots.forEach(s => {
            assert.ok(s.x > 0 && s.x < 1 && s.y > 0 && s.y < 1, 'slots stay on screen');
        });
    });
    // The armoury is the reason the 4-slot layout exists.
    const armoury = Object.keys(CFG.kinds).find(k => CFG.kinds[k].challenge === 'armoury');
    assert.ok(armoury);
    assert.strictEqual(CFG.armouryWeapons.length, 4);
});

test('answers sit in fixed slots, not wherever the door happens to be', () => {
    const component = context.createScribbleDungeonComponent({ name: 'base' });
    const boxFor = (index, dir, tileX) => component.methods.signBox.call({
        _sd: {
            view: { w: 1000, h: 800 },
            current: { choices: [{}, {}, {}] },
            ctx: { save() { }, restore() { }, measureText: () => ({ width: 60 }) },
        },
        measure: () => 60,
    }, { index: index, dir: dir, label: 'כלב', plain: 'כלב', tile: { x: tileX, y: 0 }, corridor: [] });

    // Same slot index => same place, regardless of which wall the door is on.
    const a = boxFor(0, 'n', 4);
    const b = boxFor(0, 's', 900);
    assert.deepStrictEqual({ x: a.x, y: a.y }, { x: b.x, y: b.y });

    // And the three slots are genuinely apart, on different sides.
    const s0 = boxFor(0, 'n', 0), s1 = boxFor(1, 'e', 0), s2 = boxFor(2, 's', 0);
    assert.ok(s0.x < s1.x, 'slot 0 sits left of slot 1');
    assert.ok(s2.y > s0.y && s2.y > s1.y, 'slot 2 sits below both');
    assert.ok(s0.y >= 122, 'answers clear the question heading');
});

test('every challenge is a real room kind, and its sprites are preloaded', () => {
    const challenged = Object.keys(CFG.kinds).filter(k => CFG.kinds[k].challenge);
    assert.ok(challenged.length >= 4, `expected the four challenge rooms, got ${challenged.length}`);
    challenged.forEach(k => {
        const c = CFG.challenges[CFG.kinds[k].challenge];
        assert.ok(c, `${k}: unknown challenge ${CFG.kinds[k].challenge}`);
        assert.ok(c.hint, `${k}: a challenge must tell the player its rule`);
        if (c.anchor) assert.ok(CFG.sprites.indexOf(c.anchor) >= 0, `${k}: anchor not preloaded`);
        assert.ok(CFG.cycle.indexOf(k) >= 0, `${k}: never appears in the room cycle`);
    });
    CFG.armouryWeapons.forEach(w => {
        assert.ok(CFG.sprites.indexOf(w) >= 0, `armoury weapon ${w} not preloaded`);
    });
    assert.ok(CFG.sprites.indexOf('stairs_down') >= 0, 'the stairs exit needs its sprite');
});

test('challenge apparatus is laid inside the room and never on the exit lane', () => {
    const component = context.createScribbleDungeonComponent({ name: 'base' });
    Object.keys(CFG.kinds).filter(k => CFG.kinds[k].challenge).forEach(kind => {
        const challenge = CFG.kinds[kind].challenge;
        CFG.kinds[kind].shapes.forEach(shape => {
            const room = context.scribbleDungeonMakeRoom(0, 0, shape[0], shape[1], 1, kind);
            room.entry = { c: 0, r: Math.floor((shape[1] - 1) / 2) };
            const marks = component.methods.layoutMarks.call({}, room, challenge);

            const want = challenge === 'armoury' ? 4 : 3;
            assert.strictEqual(marks.length, want, `${kind} ${shape}: wrong number of anchors`);
            marks.forEach(m => {
                assert.ok(m.sprite, `${kind}: anchor without a sprite`);
                assert.ok(m.c >= 0 && m.c < room.w, `${kind} ${shape}: anchor off the map`);
                assert.ok(m.r >= 0 && m.r < room.h, `${kind} ${shape}: anchor off the map`);
                // Only the secret room's stones belong in the wall ring.
                if (challenge !== 'secret') {
                    assert.ok(m.c > 0 && m.c < room.w - 1 && m.r > 0 && m.r < room.h - 1,
                        `${kind} ${shape}: anchor at (${m.c},${m.r}) sits in the wall`);
                }
            });
            // Two anchors must never share a tile, or one would be unclickable.
            const seen = new Set(marks.map(m => m.c + ',' + m.r));
            assert.strictEqual(seen.size, marks.length, `${kind} ${shape}: anchors overlap`);
        });
    });
});

test('a challenge room routes every answer to its single exit', () => {
    const component = context.createScribbleDungeonComponent({ name: 'base' });
    const room = context.scribbleDungeonMakeRoom(0, 0, 15, 9, 1, 'range');
    room.entry = { c: 0, r: 4 };
    const exitTarget = context.scribbleDungeonMakeRoom(20, 0, 9, 7, 2, 'hall');
    const state = {
        _sd: { rand: context.scribbleDungeonMulberry(7) },
        openWays: () => ([{
            dir: 'e', doorTile: { x: 14, y: 4 }, corridor: [], target: exitTarget,
        }]),
        layoutMarks: component.methods.layoutMarks,
        stairsTile: component.methods.stairsTile,
        buildDoors: () => { throw new Error('should not fall back to doors'); },
    };
    const made = component.methods.buildChallenge.call(state, room, 'range');

    assert.strictEqual(made.length, 3);
    made.forEach((c, i) => {
        assert.strictEqual(c.exit, room.exit, 'every answer opens the same exit');
        assert.strictEqual(c.state, 'closed');
        assert.strictEqual(c.challenge, 'range');
        assert.ok(c.tile && Number.isFinite(c.tile.x), `choice ${i} needs a tile for its arrow`);
    });

    if (room.exitStyle === 'stairs') {
        // Stairs go down to a fresh page, so they are not a door in a wall.
        assert.strictEqual(room.doors.length, 0);
        assert.strictEqual(room.exit.stairs, true);
        assert.strictEqual(room.exit.target, null);
        // They stand inside the room, clear of the walls.
        assert.ok(room.exit.tile.x > room.x && room.exit.tile.x < room.x + room.w - 1);
        assert.ok(room.exit.tile.y > room.y && room.exit.tile.y < room.y + room.h - 1);
    } else {
        assert.strictEqual(room.exitStyle, 'door');
        assert.strictEqual(room.doors.length, 1, 'a challenge room has exactly one way out');
        assert.strictEqual(room.exit.target, exitTarget);
    }
});

test('a stairwell always stands inside the room, away from the way in', () => {
    const component = context.createScribbleDungeonComponent({ name: 'base' });
    [[9, 7], [15, 11], [5, 5], [17, 3]].forEach(shape => {
        const room = context.scribbleDungeonMakeRoom(0, 0, shape[0], shape[1], 1, 'hall');
        [null, { c: 0, r: 1 }, { c: shape[0] - 1, r: 1 }, { c: 1, r: 0 }].forEach(entry => {
            room.entry = entry;
            const t = component.methods.stairsTile.call({}, room);
            assert.ok(t.x > room.x && t.x < room.x + room.w - 1,
                `${shape}: stairs landed in a wall at x=${t.x}`);
            assert.ok(t.y > room.y && t.y < room.y + room.h - 1,
                `${shape}: stairs landed in a wall at y=${t.y}`);
        });
    });
});

test('a wrong answer in a challenge room springs back instead of sealing the way out', () => {
    const calls = [];
    Object.assign(context, {
        updateWeightForKey(id, index, delta) { calls.push(['weight', delta]); },
        successSound: { play() { } }, failureSound: { play() { } },
    });
    const component = context.createScribbleDungeonComponent({ name: 'base' });
    const room = context.scribbleDungeonMakeRoom(0, 0, 15, 9, 1, 'range');
    room.challenge = 'range';
    room.exit = { state: 'closed' };
    const wrong = {
        challenge: 'range', state: 'closed', shake: 0, grow: 1, slide: 0,
        label: 'wrong', plain: 'wrong', index: 0, tile: { x: 4, y: 7 }, mark: {},
    };
    const right = {
        challenge: 'range', state: 'closed', shake: 0, grow: 1, slide: 0,
        label: 'right', plain: 'right', index: 1, tile: { x: 8, y: 7 }, mark: {},
    };
    room.choices = [wrong, right];

    const timers = [];
    const state = {
        result: 'right', questionIndex: 3, currentAppId: 'id', score: 5, streak: 2,
        feedback: '', feedbackBad: false, feedbackGood: false, locked: true,
        reduced: true, _destroyed: false, roundToken: 1, hotspots: [],
        pace: 1, rate: component.methods.rate, dur: component.methods.dur,
        _sd: { current: room, shots: [], pawn: { x: 0, y: 0 } },
        reloadProgress: () => true, saveScore() { }, shake() { }, puff() { },
        aimCamera() { }, syncHotspots() { }, prepareRound() { calls.push(['prepare']); },
        own(fn) { timers.push(fn); }, playSound: component.methods.playSound,
        loose: component.methods.loose,
    };

    component.methods.onWrong.call(state, wrong);
    assert.strictEqual(state.score, 4);
    assert.deepStrictEqual(calls.filter(c => c[0] === 'weight'), [['weight', 1]]);
    assert.strictEqual(wrong.state, 'rejected');
    assert.strictEqual(room.exit.state, 'closed', 'the exit is never sealed by a mistake');
    // A miss eases the shot, but must not point at the answer: every target grows
    // by the same amount, so nothing singles the correct one out.
    assert.ok(right.grow > 1, 'targets grow after a miss');
    assert.strictEqual(right.grow, wrong.grow, 'the correct target is not marked out');

    timers[0]();
    assert.strictEqual(wrong.state, 'closed', 'the mechanism resets and can be tried again');
    assert.strictEqual(state.locked, false);
});

test('legacy, route, asset and cache registrations exist', () => {
    const apps = fs.readFileSync('apps.js', 'utf8');
    const tester = fs.readFileSync('tester.js', 'utf8');
    const index = fs.readFileSync('index.html', 'utf8');
    const worker = fs.readFileSync('service-worker.js', 'utf8');
    assert.match(apps, /appType:\s*'scribble_dungeon'/);
    assert.match(tester, /\/play\/scribble_dungeon\/:currentAppId/);
    assert.match(index, /games\/scribble-dungeon\.js/);
    assert.match(index, /games\/scribble-dungeon\.css/);
    assert.match(worker, /games\/scribble-dungeon\.js/);

    // The worker's art list is hand-maintained; keep it identical to SPRITES so a
    // new tile can never be added without becoming available offline.
    const cached = Array.from(worker.matchAll(/'([a-z0-9_]+)'/g))
        .map(m => m[1])
        .filter(name => CFG.sprites.indexOf(name) >= 0);
    CFG.sprites.forEach(name => {
        assert.ok(cached.indexOf(name) >= 0, `sprite ${name} is not in the service worker cache list`);
    });
});

test('every registered app supplies the fields the game reads', () => {
    const apps = fs.readFileSync('apps.js', 'utf8');
    const entries = apps.split('\n').filter(line => /appType:\s*'scribble_dungeon'/.test(line));
    assert.ok(entries.length >= 3, 'expected the game to be registered on several lists');
    entries.forEach(line => {
        assert.match(line, /listName:\s*'[A-Z0-9_]+'/, line);
        // Field names are camelCase in some lists (letterName) and snake in others.
        assert.match(line, /questionIndex:\s*'[a-zA-Z_]+'/, line);
        assert.match(line, /resultIndex:\s*'[a-zA-Z_]+'/, line);
        assert.match(line, /setItems:\s*\d+/, line);
    });
});

console.log(`\n${passed} Scribble Dungeon tests passed`);
