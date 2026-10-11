// The dungeon's gateway room is played in 3D: its doors, entry and framing
// must agree with the 2D canvas, and the route beyond stays hidden until the
// spell reaches the door.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// A Vue stand-in that keeps registrations, so the platformer's exports can
// find their registered component the way they do in the app.
const registry = {};
const Vue = {extend: options => ({options: options}),
    component: (name, definition) => (definition ? (registry[name] = definition) : registry[name])};
const context = {console, performance: {now: () => 100}, Vue};
context.window = context;
vm.createContext(context);
for (const file of ['games/scribble-bridge.js', 'games/scribble-platformer.js', 'games/scribble-dungeon.js',
    'games/scribble-transition-cycle.js', 'tools/scribble-magic-door-transition-adapter.js',
    'tools/scribble-fall-transition-adapter.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
}
context.createScribblePlatformerComponent({});
let passed = 0;
function test(name, fn) {
    try { fn(); passed += 1; } catch (error) { console.error('✗', name); throw error; }
}
const close = (a, b) => Math.abs(a - b) < 1e-9;

const adapter = context.createScribbleMagicDoorPreviewAdapter();
const character = adapter.character('red');

test('a played room puts its doors and entry on the ring tiles', () => {
    const stage = adapter.stage(character, {width: 9, depth: 7, doorOffsets: [-2, 0, 2], entryOffset: 1});
    const doorZ = -(7 - 1) / 2;
    [-2, 0, 2].forEach((offset, i) => {
        const door = stage.planes.find(p => p.name === 'magic-door-' + i);
        assert.ok(close(door.position[0], offset) && close(door.position[2], doorZ));
        assert.deepStrictEqual(Array.from(door.size), [1, 1]);
    });
    const entry = stage.planes.find(p => p.name === 'entry-door');
    assert.ok(close(entry.position[0], 1) && close(entry.position[2], doorZ + 6));
    assert.strictEqual(entry.group, 'chamber-floor');
    assert.strictEqual(stage.planes.find(p => p.name === 'magic-wand').group, 'chamber-wand');
});

test('the authored preview keeps its wide doors and has no entry door', () => {
    const stage = adapter.stage(character, null);
    const left = stage.planes.find(p => p.name === 'magic-door-0');
    assert.ok(close(left.position[0] - stage.magic.centreX, -2.4));
    assert.ok(!stage.planes.some(p => p.name === 'entry-door'));
});

test('the played room is drawn in 3D while the route waits for the bolt', () => {
    const stage = adapter.stage(character, {width: 9, depth: 7, doorOffsets: [-2, 0, 2], entryOffset: 0});
    const view = {w: 1000, h: 700};
    const live = {width: 9, depth: 7, unit: 48, target: [0, 0, 0], wand: [0, 0.22, 1], door: [0, 0.35, -3.35]};
    const seen = state => {
        const groups = {};
        const bridge = {setGroupVisibility: (g, v) => { groups[g] = v; },
            setMagicBolt() {}, setDoorBurst() {}, setWallBurst() {}, setObjectState() {}};
        return {groups, bridge};
    };
    const context3d = {liveRoom: true, roomIn3d: true, staged3d: false, wandHeld: true};
    const first = adapter.state(0, view, stage, live);
    let probe = seen();
    adapter.apply(probe.bridge, first, stage, Object.assign({progress: 0}, context3d));
    assert.strictEqual(probe.groups['chamber-floor'], true);
    assert.strictEqual(probe.groups['selected-door'], true);
    assert.strictEqual(probe.groups['chamber-wand'], false, 'the pawn holds the wand');
    assert.strictEqual(probe.groups['tunnel-floor'], false);
    assert.strictEqual(probe.groups['tunnel-walls'], false);
    const atDoor = first.timing.doorHit;
    probe = seen();
    adapter.apply(probe.bridge, adapter.state(atDoor, view, stage, live), stage,
        Object.assign({progress: atDoor}, context3d));
    assert.strictEqual(probe.groups['tunnel-floor'], true, 'the route opens as the bolt arrives');
    // The original live-canvas mode is unchanged: the canvas owns the room.
    probe = seen();
    adapter.apply(probe.bridge, first, stage, {progress: 0, liveRoom: true, staged3d: true});
    assert.strictEqual(probe.groups['chamber-floor'], false);
    assert.strictEqual(probe.groups['tunnel-floor'], true);
});

// A dungeon reduced to the parts the live frame reads.
function dungeon(from) {
    const methods = context.createScribbleDungeonComponent({}).options.methods;
    const OPP = {n: 's', s: 'n', e: 'w', w: 'e'};
    const D = {n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0]}[OPP[from]];
    const turn = -Math.PI / 2 - Math.atan2(D[1], D[0]);
    const room = {x: 10, y: 20, w: 9, h: 7, from, transitionGateway: 'scribble_platformer', doors: [],
        cameraTurn: turn};
    room.entry = {n: {c: 4, r: 0}, s: {c: 3, r: 6}, e: {c: 8, r: 2}, w: {c: 0, r: 4}}[from];
    const state = Object.assign({}, methods);
    state._sd = {current: room, pawn: {x: 900, y: 1500}, view: {w: 800, h: 600},
        cam: {x: 14 * 64, y: 23 * 64, z: 0.75, r: turn, tx: 14 * 64, ty: 23 * 64, tz: 0.75, tr: turn}};
    state.buildTransitionGatewayDoors(room);
    return state;
}

test('from every entry side the reported doors lie on the 3D door wall', () => {
    for (const from of ['n', 's', 'e', 'w']) {
        const game = dungeon(from);
        const frame = game.transitionLiveFrame();
        const doorZ = -(frame.depth - 1) / 2;
        const offsets = Array.from(frame.doorOffsets).map(v => Math.round(v * 1e6) / 1e6 + 0);
        assert.deepStrictEqual(offsets.sort((a, b) => a - b), [-2, 0, 2], from);
        assert.ok(close(frame.door[2] + 0.35, doorZ), from + ': the chosen door is on the far wall');
        assert.ok(close(frame.door[0], frame.doorOffsets[1]), from + ': the middle door is the chosen one');
        assert.ok(Math.abs(frame.entryOffset) <= (frame.width - 1) / 2, from + ': the entry is on the near wall');
    }
});

test('the 3D room takes over only on the gateway heading and redraws on camera moves', () => {
    const game = dungeon('s');
    let refreshed = 0;
    game._modeTransition = {refresh: () => { refreshed++; }, startedByAnswer: false};
    game._room3d = {room: game._sd.current, mix: 0, key: ''};
    game.mapMode = true;
    game.stepRoom3d(0.1);
    assert.strictEqual(game._room3d.mix, 0, 'the whole-map view keeps the 2D room');
    game.mapMode = false;
    for (let i = 0; i < 5; i++) game.stepRoom3d(0.1);
    assert.strictEqual(game._room3d.mix, 1);
    assert.strictEqual(refreshed, 1, 'a still camera draws the 3D room once');
    game._sd.cam.x += 3;
    game.stepRoom3d(0.016);
    assert.strictEqual(refreshed, 2);
    game._sd.cam.r += 0.5;
    game.stepRoom3d(0.1);
    assert.ok(game._room3d.mix < 1, 'turning away hands the room back to the canvas');
});

test("the destination is built as the platformer's landing room", () => {
    const room = context.SCRIBBLE_HANDOFF_ROOM;
    const stage = adapter.stage(character, {width: 9, depth: 7, doorOffsets: [-2, 0, 2], entryOffset: 0,
        landingRoom: room});
    const dest = stage.magic.destinationRoom;
    assert.strictEqual(dest.maxX - dest.minX + 1, room.columns, "the room is the stage's width");
    assert.strictEqual(stage.magic.impact[0], dest.minX + Math.floor((room.columns - 1) / 2),
        'the route meets the far wall in its middle column');
    const named = prefix => stage.planes.filter(p => (p.name || '').startsWith(prefix));
    assert.strictEqual(JSON.stringify(named('destination-ladder-').map(p => p.position[0] - dest.minX)),
        JSON.stringify(room.ladderColumns), "ladders stand in the stage's answer columns");
    named('destination-ladder-').forEach(p => {
        assert.ok(close(p.size[1], room.ladderRows) && close(p.position[1], room.ladderRows / 2));
    });
    const wallZ = dest.minZ - 0.5;
    const back = stage.planes.filter(p => /^tunnel-(impact-)?wall-/.test(p.name || '') &&
        close(p.position[2], wallZ) && p.position[0] >= dest.minX && p.position[0] <= dest.maxX);
    assert.strictEqual(back.length, room.columns, 'one wall column per stage column');
    back.forEach(p => assert.ok(close(p.size[1], room.wallRows), "the wall is the stage's height"));
    assert.strictEqual(named('destination-ground-').length, room.columns);
    named('destination-ground-').forEach(p => assert.ok(close(p.position[1], -0.5) && p.sprite === room.ground));
    named('destination-soil-').forEach(p => assert.ok(close(p.position[1], -1.5) && p.group === 'destination-soil'));
});

test("the route ends on the platformer's own camera, orthographic and level", () => {
    const room = context.SCRIBBLE_HANDOFF_ROOM;
    const stage = adapter.stage(character, {width: 9, depth: 7, doorOffsets: [-2, 0, 2], entryOffset: 0,
        landingRoom: room});
    const live = {width: 9, depth: 7, unit: 48, target: [0, 0, 0], wand: [0, 0.22, 1], door: [0, 0.35, -3.35]};
    for (const view of [{w: 896, h: 654}, {w: 540, h: 760}, {w: 1280, h: 520}]) {
        const frame = context.scribblePlatformerHandoffFrame(view);
        const finish = 1 + adapter.tail(stage);
        assert.ok(finish > 1, 'a landing route holds past its authored end for the flattening');
        const end = adapter.state(finish, view, stage, live).pose;
        const landing = stage.magic.landing;
        assert.strictEqual(end.perspective, false);
        assert.ok(close(end.unit, frame.unit), "the platformer's scale");
        assert.ok(close(end.target[0], landing.left + frame.centre[0]) && close(end.target[1], frame.centre[1]),
            "the platformer's frame centre");
        assert.ok(close(end.position[1], end.target[1]), 'looking level, so floor and wall tops are edge-on');
        // The flattening is continuous: just before the switch the lens is
        // nearly parallel at the same scale and centre, and the near plane
        // keeps the corridor behind the room out of the frame.
        const before = adapter.state(1.0499, view, stage, live).pose;
        assert.ok(before.perspective && before.fov < 1);
        assert.ok(Math.abs(before.unit / frame.unit - 1) < 1e-3);
        const depth = Math.hypot(before.position[0] - before.target[0], before.position[2] - before.target[2]);
        assert.ok(before.near > depth - 15, 'the front wall is clipped');
    }
    // Without a landing room the authored ending is untouched.
    const plain = adapter.stage(character, null);
    assert.strictEqual(adapter.tail(plain), 0);
    assert.strictEqual(adapter.state(1, {w: 896, h: 654}, plain, null).pose.perspective, true);
});

test('the fall stays on the notebook: the leaving page behind the shaft, the next under the room', () => {
    const fall = context.createScribbleFallTransitionPreviewAdapter();
    const stage = fall.stage(fall.character('red'));
    const view = {w: 896, h: 654};
    const live = {target: [0.4, 1.6, 0], unit: 62.8, objectY: 0.5};
    const placed = {};
    const bridge = {setGroupVisibility() {}, setGroupOpacity() {}, setObjectState() {},
        placeDecal: (name, frame) => { placed[name] = frame; }};
    const first = fall.state(0, view, stage, live);
    fall.apply(bridge, first, stage, {progress: 0, view: view, departure: true, page: true});
    const leaving = placed['departure-paper'];
    const eye = first.pose.position[2];
    const depth = eye - leaving.centre[2];
    // From the first camera, the page subtends exactly the 2D page: three
    // views at the platformer's scale, measured on its own plane (z = 0).
    assert.ok(Math.abs(leaving.width / depth - 3 * view.w / live.unit / eye) < 1e-9);
    assert.ok(close(leaving.centre[0], live.target[0]) && close(leaving.centre[1], live.target[1]));
    assert.ok(leaving.centre[2] < -stage.fall.shaftHalf, 'it stands behind the shaft');
    const arriving = placed['landing-paper'];
    assert.ok(arriving.flat && arriving.centre[1] < stage.fall.floorY, 'the next page lies under the floor');
    assert.ok(close(arriving.width, 3 * view.w / first.topUnit), "at the destination's final scale");
});

test('the fall begins on the platformer’s own fall room, column for column', () => {
    const room = context.SCRIBBLE_FALL_ROOM;
    const fall = context.createScribbleFallTransitionPreviewAdapter();
    const stage = fall.stage(fall.character('red'), {fallRoom: room});
    const half = (room.columns - 1) / 2;
    const grass = stage.planes.filter(p => /^side-ground-\d+$/.test(p.name || ''));
    const open = [];
    for (let c = 0; c < room.columns; c++) if (c < room.gap[0] || c > room.gap[1]) open.push(c - half);
    assert.strictEqual(JSON.stringify(grass.map(p => p.position[0])), JSON.stringify(open), 'grass on every non-gap column');
    grass.forEach(p => assert.ok(p.sprite === room.ground && close(p.position[1], -0.5)));
    assert.strictEqual(room.gap[1] - room.gap[0] + 1, 2 * stage.fall.shaftHalf, 'the gap is the shaft');
    const crates = stage.instances.filter(i => /^side-crate-/.test(i.name));
    assert.strictEqual(JSON.stringify(crates.map(i => i.position[0])),
        JSON.stringify(room.crateColumns.map(c => c - half).filter(x => Math.abs(x) > .01)));
    const falling = stage.instances.find(i => i.name === 'falling-stone');
    assert.ok(falling.planes.every(p => close(p.size[0], 1)), 'the falling crate is a full tile, as drawn');
    // Every crate bridges the pit, and whichever was chosen is the one that falls.
    room.crateColumns.forEach(c => assert.ok(c >= room.gap[0] && c <= room.gap[1], 'crate over the pit'));
    const live = {fallRoom: room, objectX: -1, objectY: 0.5, standingX: [0, 1], target: [0, 1.6, 0], unit: 60};
    const left = fall.stage(fall.character('red'), live);
    assert.strictEqual(JSON.stringify(left.instances.filter(i => /^side-crate-/.test(i.name)).map(i => i.position[0])),
        '[0,1]', 'the crates left standing stay');
    const midway = fall.state(0.5, {w: 896, h: 654}, left, live);
    assert.ok(close(midway.object.position[0], -1), 'the chosen crate falls down its own column');
});

test('the shaft room only follows a room the pawn leaves sideways', () => {
    const side = Array.from(context.SCRIBBLE_SIDE_EXIT_KINDS);
    assert.strictEqual(JSON.stringify(side), JSON.stringify(['jump', 'bridge', 'crate']));
    const methods = registry['scribble-platformer'].options.methods;
    function advanceFrom(kind) {
        const from = {index: 2, kind: kind, x0: 0, x1: 11 * 64, y0: 0, blocks: [], decor: [], state: 'visited'};
        const game = Object.assign({}, methods, {explored: 0, reduced: true, pace: 1, mapMode: false,
            setRoomLabel() {}, hotspots: []});
        game._sp = {current: from, rooms: [from], transitionTarget: 'scribble_dungeon',
            view: {w: 896, h: 654}, cam: {x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1}, pawn: {x: 77, y: -32}};
        const block = {index: 0, wx: 160, wy: -32, state: 'solved'};
        game.beginAdvance(block);
        const g = game._sp;
        const next = (g.walk && (g.walk.target || g.walk.flipTo)) || g.rooms[g.rooms.length - 1];
        return {next: next, pending: g.transitionTarget};
    }
    side.forEach(kind => {
        const r = advanceFrom(kind);
        assert.strictEqual(r.next.kind, 'fall', kind + ' leads straight into the shaft room');
        assert.strictEqual(r.next.y0, 0, 'at the same level, entered from the side');
        assert.ok(r.next.x0 > 0, 'to the right');
        assert.strictEqual(r.pending, null);
    });
    ['tower', 'handoff', 'shoot', 'shield', 'doors', 'rail'].forEach(kind => {
        const r = advanceFrom(kind);
        assert.ok(side.indexOf(r.next.kind) >= 0, kind + ' is followed by a sideways room first');
        assert.strictEqual(r.pending, 'scribble_dungeon', 'the shaft is still due after it');
    });
});

test('a mode lasts at least ten stages, then switches with a one-in-twenty chance', () => {
    const store = {};
    context.getLocalStorage = (key, fallback) => (key in store ? store[key] : fallback);
    context.setLocalStorage = (key, value) => { store[key] = JSON.parse(JSON.stringify(value)); };
    const next = (roll, score) => context.scribbleNextModeForScore('app', 'scribble_dungeon', score, () => roll);
    for (let stage = 1; stage < 10; stage++) {
        assert.strictEqual(next(0, stage), null, 'stage ' + stage + ' never switches, even on a lucky roll');
    }
    assert.strictEqual(next(0.05, 10), null, 'a roll of 1/20 or more keeps the mode');
    assert.strictEqual(next(0.049, 11), 'scribble_platformer', 'below 1/20 it switches');
    assert.strictEqual(store.app_scribble_transition_cycle.mode, 'scribble_platformer');
    // The next mode starts counting afresh.
    assert.strictEqual(context.scribbleNextModeForScore('app', 'scribble_platformer', 12, () => 0), null);
    assert.strictEqual(store.app_scribble_transition_cycle.stages, 1);
    delete context.getLocalStorage;
    delete context.setLocalStorage;
});

test('the watchdog never deals a round in the middle of the 3D transition', () => {
    const game = dungeon('s');
    let dealt = 0;
    Object.assign(game, {prepareRound: () => { dealt++; }, rate: v => v, dur: v => v, pace: 1, reduced: true});
    Object.assign(game._sd, {state: 'transitioning', walk: null, page: null, time: 0, fx: [], motes: [],
        shakeAmp: 0, signIn: 0, idleFor: 0, wandCast: null, shots: [], rooms: [game._sd.current]});
    for (let i = 0; i < 400; i++) game.step(0.05);
    assert.strictEqual(dealt, 0);
});

console.log(passed + ' gateway 3D room checks passed.');
