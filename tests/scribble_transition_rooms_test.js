const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
let generated = 0;
const context = {
    console, performance: {now: () => 100},
    Vue: {extend: value => value, component: (name, value) => value},
    generateFromList() { generated++; return {question: 'Dog', result: 'כלב',
        options: ['כלב', 'חתול', 'פרה'], questionIndex: 0}; },
    getSetItems: () => 3,
};
vm.createContext(context);
for (const file of ['games/scribble-platformer.js', 'games/scribble-dungeon.js',
    'games/scribble-transition-cycle.js', 'tools/scribble-fall-transition-adapter.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
}
const plain = value => JSON.parse(JSON.stringify(value));
const app = {appType: 'scribble_dungeon', listName: 'ANIMALS'};
assert.deepEqual(plain(context.scribbleTransitionEntryRoute(app, '0_46', {scribbleEntry: 'fall'})),
    {path: '/play/scribble_platformer/0_46', query: {scribbleEntry: 'fall'}});
assert.equal(context.scribbleTransitionEntryRoute(app, '0_46', {}), null);
assert.equal(context.scribbleTransitionEntryRoute({appType: 'mcq'}, '0_1', {scribbleEntry: 'fall'}), null);
assert.equal(context.scribbleTransitionEntryRoute(app, '0_46', {scribbleEntry: 'invalid'}), null);

function instance(factory, query, gameKey) {
    const methods = factory({}).methods;
    const state = Object.assign({}, methods, {
        $route: {query}, currentApp: app, currentAppId: '0_46', roundToken: 0,
        shuffle: values => values.slice(), reloadProgress: () => true,
        aimCamera() {}, setRoomLabel() {},
    });
    state[gameKey] = {pawn: {}};
    state.startRun();
    return state;
}
const source = instance(context.createScribblePlatformerComponent, {scribbleEntry: 'fall'}, '_sp');
assert.equal(source._sp.current.kind, 'fall');
assert.equal(source._sp.current.transitionGateway, 'scribble_dungeon');
source.prepareRound();
assert.equal(generated, 1, 'the entry asks the learning engine for its question');
assert.equal(source._sp.current.blocks.length, 3);
// Every crate stands over the shaft, and the answer is on one of them.
const gap = context.SCRIBBLE_FALL_ROOM.gap;
source._sp.current.blocks.forEach(b => {
    const column = (b.wx - source._sp.current.x0) / 64 - 0.5;
    assert.ok(column >= gap[0] && column <= gap[1], 'crate ' + b.index + ' stands over the pit');
});
assert.ok(source._sp.current.blocks.some(b => b.label === 'כלב'));
assert.equal(source._sp.state, 'question');
assert.equal(source.locked, true, 'input waits for the normal readable-question boundary');

const adapter = context.createScribbleFallTransitionPreviewAdapter();
const stage = adapter.stage();
const byName = name => stage.planes.find(plane => plane.name === name);
assert.equal(stage.fall.shaftHalf * 2, 3, 'the shaft agrees with the live three-tile gap');
for (const [name, rotation] of [['north-1', 0], ['east-1', 90], ['south-1', 180], ['west-1', 270]]) {
    const wall = byName('dungeon-wall-' + name);
    const angle = wall.rotation[2] * Math.PI / 180;
    const canvasAngle = rotation * Math.PI / 180;
    assert.ok(Math.abs(-Math.sin(angle) - Math.sin(canvasAngle)) < 1e-8);
    assert.ok(Math.abs(-Math.cos(angle) + Math.cos(canvasAngle)) < 1e-8,
        'wall texture orientation agrees with the 2D canvas');
}
for (const name of ['shaft-west', 'shaft-east', 'shaft-back', 'shaft-front']) {
    const wall = byName(name);
    const yaw = wall.rotation[1] * Math.PI / 180;
    const inwardDot = -wall.position[0] * Math.sin(yaw) - wall.position[2] * Math.cos(yaw);
    assert.ok(inwardDot > 0, 'shaft wall faces the inside');
}
for (let seed = 1; seed <= 30; seed++) {
    const destination = instance(context.createScribbleDungeonComponent, {scribbleArrival: 'fall'}, '_sd');
    destination._sd.rand = context.scribbleDungeonMulberry(seed);
    destination.prepareRound();
    const room = destination._sd.current;
    assert.equal(room.choices.length, 3, 'arrival has three playable exits');
    assert.equal(new Set(room.choices.map(door => door.dir)).size, 3);
    assert.equal(room.choices.filter(door => door.label === 'כלב').length, 1);
    room.choices.forEach(door => {
        assert.ok(door.target && !door.stairs, 'each answer opens a real corridor');
        const name = {n: 'north', e: 'east', s: 'south'}[door.dir];
        const visual = byName('dungeon-exit-' + name);
        assert.equal(door.tile.x - room.x - 5, visual.position[0]);
        assert.equal(door.tile.y - room.y - 3, visual.position[2]);
        assert.ok(!stage.planes.some(plane => plane.group === 'dungeon-ring' &&
            plane.position[0] === visual.position[0] && plane.position[2] === visual.position[2]),
        'the answer door is an opening, not a door painted over a wall');
    });
}
assert.equal(generated, 31, 'every receiving question uses the learning engine');
console.log('Transition rooms: entry routing, engine questions, wall orientation and 30 arrival layouts passed.');
