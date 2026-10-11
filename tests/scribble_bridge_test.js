// Focused tests for the Scribble Bridge — the 3D layer that carries a run
// between the top-down dungeon and the side-view platformer.
//
// The point of the bridge is that its camera reproduces each game's framing
// *exactly*, so the handover has no jump in it. That claim is arithmetic, and
// arithmetic can be checked without WebGL: the module keeps its camera and
// blueprint maths as pure functions for precisely this reason.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function sandbox(files) {
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
            component(name, value) { return value; },
        },
    };
    context.globalThis = context;
    context.window = context;
    vm.createContext(context);
    files.forEach(file => {
        vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
    });
    return context;
}

const context = sandbox([
    'games/scribble-bridge.js',
    'games/scribble-dungeon.js',
    'games/scribble-platformer.js',
]);

let passed = 0;
function test(name, fn) {
    try { fn(); passed += 1; console.log('✓', name); }
    catch (error) { console.error('✗', name); throw error; }
}

const PITCH = context.SCRIBBLE_BRIDGE_CONFIG.pitch;
const close = (a, b, eps) => Math.abs(a - b) <= (eps || 1e-9);

// The 2D projection both games use, copied here on purpose: if either game
// changes its camera contract, this file should stop agreeing with it.
function worldToScreen2D(cam, view, x, y) {
    return {
        x: (x - cam.x) * cam.z + view.w / 2,
        y: (y - cam.y) * cam.z + view.h / 2,
    };
}

test('the bridge agrees with both games about the size of a tile', () => {
    // A disagreement here would not throw anywhere — it would just quietly
    // scale the 3D room against the 2D one and show up as a jump at the seam.
    assert.strictEqual(PITCH, context.SCRIBBLE_DUNGEON_CONFIG.tile.pitch);
    assert.strictEqual(PITCH, context.SCRIBBLE_PLATFORMER_CONFIG.tile.pitch);
});

test('the frustum covers exactly the viewport the 2D camera covers', () => {
    const view = { w: 960, h: 540 };
    const f = context.scribbleBridgeFrustum(view, 0.75, PITCH);
    // Width in units times pixels-per-unit must come back to the viewport.
    assert.ok(close((f.right - f.left) * f.unit, view.w));
    assert.ok(close((f.top - f.bottom) * f.unit, view.h));
    assert.ok(close(f.unit, 0.75 * PITCH));
});

test('the arc starts on the dungeon pose and ends on the platformer pose', () => {
    const framing = context.scribbleBridgeFraming(
        { cam: { x: 640, y: 320, z: 0.8 }, view: { w: 800, h: 600 } },
        { cam: { x: 640, y: 100, z: 0.6 }, view: { w: 800, h: 600 }, floorY: 420 },
        PITCH
    );

    const start = context.scribbleBridgePose(framing, 0);
    // Looking straight down, with the page's "up" pointing at -Z.
    assert.ok(close(start.up[0], 0) && close(start.up[1], 0) && close(start.up[2], -1));
    assert.ok(close(start.position[0], start.target[0]));
    assert.ok(close(start.position[2], start.target[2]));
    assert.ok(start.position[1] > start.target[1]);
    assert.ok(close(start.unit, 0.8 * PITCH));

    const end = context.scribbleBridgePose(framing, 1);
    // Looking straight ahead, upright.
    assert.ok(close(end.up[0], 0) && close(end.up[1], 1) && close(end.up[2], 0));
    assert.ok(close(end.position[0], end.target[0]));
    assert.ok(close(end.position[1], end.target[1]));
    assert.ok(end.position[2] > end.target[2]);
    assert.ok(close(end.unit, 0.6 * PITCH));
});

test('the top pose reproduces the dungeon projection pixel for pixel', () => {
    const cam = { x: 512, y: 288, z: 0.7 };
    const view = { w: 900, h: 620 };
    const framing = context.scribbleBridgeFraming(
        { cam: cam, view: view },
        { cam: cam, view: view, floorY: 0 },
        PITCH
    );
    const pose = context.scribbleBridgePose(framing, 0);

    // Looking down -Y with up = -Z: screen right is +X, screen down is +Z.
    // This is the whole seam guarantee written out.
    [[0, 0], [512, 288], [1024, 40], [-256, 700]].forEach(([wx, wy]) => {
        const point = [wx / PITCH, 0, wy / PITCH];
        const screen = {
            x: (point[0] - pose.target[0]) * pose.unit + view.w / 2,
            y: (point[2] - pose.target[2]) * pose.unit + view.h / 2,
        };
        const expected = worldToScreen2D(cam, view, wx, wy);
        assert.ok(close(screen.x, expected.x, 1e-9), `x at ${wx},${wy}`);
        assert.ok(close(screen.y, expected.y, 1e-9), `y at ${wx},${wy}`);
    });
});

test('the side pose reproduces the platformer projection pixel for pixel', () => {
    const cam = { x: 300, y: 180, z: 0.55 };
    const view = { w: 1024, h: 600 };
    const floorY = 512;
    const framing = context.scribbleBridgeFraming(
        { cam: cam, view: view },
        { cam: cam, view: view, floorY: floorY },
        PITCH
    );
    const pose = context.scribbleBridgePose(framing, 1);

    // Looking down -Z with up = +Y: screen right is +X, screen down is -Y.
    [[0, 0], [300, 180], [900, 512], [-120, 60]].forEach(([wx, wy]) => {
        const point = [wx / PITCH, (floorY - wy) / PITCH, 0];
        const screen = {
            x: (point[0] - pose.target[0]) * pose.unit + view.w / 2,
            y: (pose.target[1] - point[1]) * pose.unit + view.h / 2,
        };
        const expected = worldToScreen2D(cam, view, wx, wy);
        assert.ok(close(screen.x, expected.x, 1e-9), `x at ${wx},${wy}`);
        assert.ok(close(screen.y, expected.y, 1e-9), `y at ${wx},${wy}`);
    });
});

test('a degenerate arc holds one framing the whole way', () => {
    // Dungeon -> bridge -> dungeon: both endpoints are the same top framing, so
    // nothing may drift. This is the M2 case, and the one that proves the seam
    // before any rotation is involved.
    const cam = { x: 128, y: 64, z: 0.9 };
    const view = { w: 800, h: 600 };
    const framing = context.scribbleBridgeFraming({ cam: cam, view: view },
        { cam: cam, view: view, floorY: 0 }, PITCH);
    framing.side = framing.top;

    for (let i = 0; i <= 10; i++) {
        const pose = context.scribbleBridgePose(framing, i / 10);
        assert.ok(close(pose.unit, 0.9 * PITCH), 'scale drifted');
        assert.ok(close(pose.target[0], cam.x / PITCH), 'target drifted in x');
        assert.ok(close(pose.target[2], cam.y / PITCH), 'target drifted in z');
    }
});

test('the camera stays a proper frame the whole way round', () => {
    const framing = context.scribbleBridgeFraming(
        { cam: { x: 0, y: 0, z: 1 }, view: { w: 800, h: 600 } },
        { cam: { x: 0, y: 0, z: 1 }, view: { w: 800, h: 600 }, floorY: 0 },
        PITCH
    );
    for (let i = 0; i <= 20; i++) {
        const pose = context.scribbleBridgePose(framing, i / 20);
        const view = [
            pose.target[0] - pose.position[0],
            pose.target[1] - pose.position[1],
            pose.target[2] - pose.position[2],
        ];
        const len = Math.hypot(view[0], view[1], view[2]);
        const dot = (view[0] * pose.up[0] + view[1] * pose.up[1] + view[2] * pose.up[2]) / len;
        // A lerped up-vector fails this in the middle, and the horizon rolls.
        assert.ok(close(dot, 0, 1e-9), `up not perpendicular at ${i / 20}`);
        assert.ok(close(Math.hypot(pose.up[0], pose.up[1], pose.up[2]), 1, 1e-9));
    }
});

test('the 3D camera starts overhead at the exact 2D scale before zoom and rotation', () => {
    const timing = context.scribbleMagicDoorTransitionState(0).timing;
    const before = context.scribbleMagicDoorTransitionState(timing.perspectiveStart - 0.001);
    const top3d = context.scribbleMagicDoorTransitionState(timing.perspectiveStart);
    const insideHold = context.scribbleMagicDoorTransitionState((timing.entry + timing.zoomStart) / 2);
    const overheadZoom = context.scribbleMagicDoorTransitionState(
        (timing.zoomStart + timing.turnStart) / 2);
    const turning = context.scribbleMagicDoorTransitionState(
        (timing.turnStart + timing.turnEnd) / 2);
    assert.strictEqual(before.pose.perspective, undefined);
    assert.strictEqual(top3d.pose.perspective, true);
    assert.strictEqual(before.pose.unit, top3d.pose.unit);
    assert.strictEqual(top3d.pose.unit, 56);
    assert.strictEqual(top3d.pose.fov, 2);
    assert.strictEqual(insideHold.pose.unit, 56,
        'the zoom must wait until the bolt is inside the destination room');
    assert.ok(Math.abs(top3d.pose.position[0] - top3d.pose.target[0]) < 1e-9);
    assert.ok(Math.abs(top3d.pose.position[2] - top3d.pose.target[2]) < 1e-9);
    assert.ok(overheadZoom.pose.unit > top3d.pose.unit,
        'zoom must begin after the overhead 3D frame');
    assert.strictEqual(overheadZoom.pose.fov, 2,
        'the camera must remain visually 2D throughout the overhead zoom');
    assert.ok(Math.abs(overheadZoom.pose.position[0] - overheadZoom.pose.target[0]) < 1e-9);
    assert.ok(Math.abs(overheadZoom.pose.position[2] - overheadZoom.pose.target[2]) < 1e-9);
    assert.ok(Math.hypot(turning.pose.position[0] - turning.pose.target[0],
        turning.pose.position[2] - turning.pose.target[2]) > 0.01,
    'rotation must happen while the camera zooms');
    assert.strictEqual(before.flash, 0);
    assert.strictEqual(top3d.flash, 0);
    assert.strictEqual(overheadZoom.flash, 0);
    assert.strictEqual(turning.flash, 0);
});

test('the bolt is followed in the original 2D framing before zoom begins', () => {
    const timing = context.scribbleMagicDoorTransitionState(0).timing;
    const early = context.scribbleMagicDoorTransitionState(timing.flightStart + 0.004);
    const followed = context.scribbleMagicDoorTransitionState(timing.perspectiveStart - 0.002);
    const top3d = context.scribbleMagicDoorTransitionState(timing.perspectiveStart);
    const insideHold = context.scribbleMagicDoorTransitionState((timing.entry + timing.zoomStart) / 2);
    const overheadZoom = context.scribbleMagicDoorTransitionState(
        (timing.zoomStart + timing.turnStart) / 2);
    const turning = context.scribbleMagicDoorTransitionState(
        (timing.turnStart + timing.turnEnd) / 2);
    assert.strictEqual(early.phase, 'follow-2d');
    assert.strictEqual(followed.phase, 'follow-2d');
    assert.strictEqual(early.pose.unit, 56);
    assert.strictEqual(followed.pose.unit, 56);
    assert.ok(Math.abs(followed.pose.target[0] - followed.bolt.position[0]) < 1e-9);
    assert.ok(Math.abs(followed.pose.target[2] - followed.bolt.position[2]) < 1e-9);
    assert.strictEqual(top3d.phase, 'top-3d');
    assert.strictEqual(top3d.pose.unit, followed.pose.unit);
    assert.strictEqual(insideHold.phase, 'tunnel-entry');
    assert.strictEqual(insideHold.pose.unit, followed.pose.unit);
    assert.strictEqual(overheadZoom.phase, 'camera-zoom');
    assert.ok(overheadZoom.pose.unit > followed.pose.unit);
    assert.strictEqual(turning.phase, 'camera-turn');
    assert.ok(turning.pose.unit > followed.pose.unit);
});

test('the closed door bursts on contact while the bolt keeps a steady speed', () => {
    const timing = context.scribbleMagicDoorTransitionState(0).timing;
    const delta = 0.002;
    const samples = [-2, -1, 0, 1, 2].map(offset =>
        context.scribbleMagicDoorTransitionState(timing.doorHit + offset * delta));
    const distances = [];
    for (let i = 1; i < samples.length; i++) {
        distances.push(samples[i].bolt.distance - samples[i - 1].bolt.distance);
    }
    distances.forEach(distance => assert.ok(close(distance, distances[0], 1e-9),
        'the bolt must keep the same distance per frame through the door impact'));
    assert.strictEqual(samples[0].doorBurst.broken, false);
    assert.strictEqual(samples[2].doorBurst.broken, true);
    assert.ok(samples[3].doorBurst.visible);
    assert.ok(samples[3].bolt.distance > samples[2].bolt.distance,
        'the bolt must continue past the exploding door');
});

test('the chase camera builds its follow distance without moving backward', () => {
    let previousZ = Infinity;
    const timing = context.scribbleMagicDoorTransitionState(0).timing;
    for (let step = 0; step <= 12; step++) {
        const p = timing.perspectiveStart +
            (timing.entry - timing.perspectiveStart) * step / 12;
        const state = context.scribbleMagicDoorTransitionState(p);
        assert.ok(state.pose.position[2] <= previousZ + 1e-9,
            `camera moved backward before entering the tunnel at p=${p}`);
        previousZ = state.pose.position[2];
    }
});

function distanceToRoute(point, route) {
    let nearest = Infinity;
    for (let i = 0; i < route.length - 1; i++) {
        const from = route[i], to = route[i + 1];
        const dx = to[0] - from[0], dz = to[2] - from[2];
        const lengthSq = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1,
            ((point[0] - from[0]) * dx + (point[2] - from[2]) * dz) / lengthSq));
        nearest = Math.min(nearest, Math.hypot(
            point[0] - (from[0] + dx * t), point[2] - (from[2] + dz * t)));
    }
    return nearest;
}

test('the magic-door chase camera stays inside the open-top tunnel route', () => {
    const views = [
        {w: 1280, h: 800},
        {w: 390, h: 844},
        {w: 3840, h: 2160},
    ];
    views.forEach(view => {
        for (let step = 50; step <= 100; step += 2) {
            const state = context.scribbleMagicDoorTransitionState(step / 100, {view});
            assert.ok(distanceToRoute(state.pose.position, state.tunnel.route) < state.tunnel.width / 2,
                `camera leaves the turning route at p=${step}`);
            if (step >= 82) {
                assert.ok(state.pose.position[1] > 0 && state.pose.position[1] < state.tunnel.height,
                    `camera leaves the tunnel vertically after the overhead turn at p=${step}`);
            }
            assert.strictEqual(state.pose.perspective, true);
        }
    });
});

test('the magic bolt is the only carrier and lands after a full quarter-turn', () => {
    const start = context.scribbleMagicDoorTransitionState(0);
    const timing = start.timing;
    // Between the end of the turn and the rapid section, the bolt is
    // threading the corridor's turns.
    const turn = context.scribbleMagicDoorTransitionState(
        (timing.turnEnd + timing.fastStart) / 2);
    const end = context.scribbleMagicDoorTransitionState(1);
    assert.strictEqual(start.bolt.visible, false);
    assert.strictEqual(start.character.visible, false);
    assert.strictEqual(turn.phase, 'corridor-turns');
    assert.ok(turn.bolt.visible);
    assert.deepStrictEqual(Array.from(end.bolt.direction), [0, 0, -1]);
    assert.strictEqual(end.bolt.impact, 1);
    assert.strictEqual(end.character.visible, true);
    assert.ok(close(end.pose.target[0], end.bolt.position[0]));
    assert.ok(close(end.pose.target[1], end.bolt.position[1]));
    assert.ok(close(end.pose.target[2], end.bolt.position[2]),
        'the final impact must already be the locked screen centre');
    assert.ok(Math.abs(end.pose.position[1] - end.pose.target[1]) < 1e-9,
        'the final camera must be level for the side-view handoff');
    assert.ok(end.pose.position[2] > end.pose.target[2],
        'the final camera follows the bolt from behind');
    assert.ok(!JSON.stringify(end).toLowerCase().includes('player'));
    assert.ok(!JSON.stringify(end).toLowerCase().includes('pawn'));
});

// The transition room used across the stage tests: 11 wide so a platformer
// level fits across it, 7 deep so it reads as a dungeon room, 7 tall so the
// back wall has the same sky the platformer gives a level.
const SPEC = {
    origin: [3, -2],
    width: 11, depth: 7, height: 4,
    top: { floor: 'tiles', wall: 'floor_wall', corner: 'floor_wall_corner' },
    side: { wall: 'tile', ground: 'tile_grass' },
    props: [
        { c: 2, r: 3, top: 'crate', side: 'tile_crate' },
        { c: 5, r: 2, top: 'crate', side: 'tile_crate', height: 2 },
        { c: 8, r: 4, top: 'barrel', side: 'tile_crateSmall' },
    ],
};

test('the magic-door stage has three doors and a closed-sided open-top tunnel', () => {
    const magicSpec = Object.assign({}, SPEC, {
        origin: [-4, -3], width: 9, depth: 7, height: 4,
        top: Object.assign({}, SPEC.top, {
            door: 'floor_door_closed', openDoor: 'floor_door_open', wand: 'weapon_staff',
        }),
        side: Object.assign({}, SPEC.side, {
            wall: 'tile_brick', cap: 'arrow', ladder: 'tile_ladder', end: 'tile_castle',
            characterBody: 'character_roundRed', characterHand: 'character_handRed',
        }),
        props: [],
    });
    const stage = context.scribbleMagicDoorTransitionStage(magicSpec);
    const names = stage.planes.map(plane => plane.name).filter(Boolean);
    const closedDoors = stage.planes.filter(plane => /^magic-door-\d+$/.test(plane.name || ''));
    assert.strictEqual(closedDoors.length, 3);
    closedDoors.forEach(door => {
        assert.strictEqual(door.sprite, 'floor_door_closed');
    });
    assert.strictEqual(stage.planes.find(plane => plane.name === 'magic-door-1').group,
        'selected-door');
    const openDoor = stage.planes.find(plane => plane.name === 'magic-door-open');
    assert.strictEqual(openDoor.sprite, magicSpec.top.openDoor);
    assert.strictEqual(openDoor.group, 'selected-door-open');
    assert.ok(names.includes('magic-wand'));
    ['tunnel-floor-', 'tunnel-wall-', 'tunnel-wall-cap-',
        'tunnel-impact-wall-'].forEach(prefix =>
        assert.ok(names.some(name => name.startsWith(prefix)), `${prefix} is missing`));
    assert.ok(!names.some(name => name.startsWith('tunnel-ceiling-')),
        'the turning tunnel should remain open above the camera');
    const wallCaps = stage.planes.filter(plane =>
        (plane.name || '').startsWith('tunnel-wall-cap-'));
    assert.ok(wallCaps.length > 0, 'the walls need brick tops for the overhead reading');
    wallCaps.forEach(cap => {
        assert.strictEqual(cap.sprite, 'arrow');
        assert.strictEqual(cap.reading, 'top');
        assert.strictEqual(cap.group, 'tunnel-wall-tops');
        // Corridor walls stand tunnel-high; the destination room's walls stop
        // lower, at its battlement, and their caps with them.
        const top = cap.position[1] + 0.02;
        assert.ok(close(top, magicSpec.tunnelHeight || 8) || close(top, magicSpec.stageWallHeight || 4.8),
            'a cap sits on top of its wall: ' + top);
        assert.deepStrictEqual(Array.from(cap.size), [1, 1]);
        const index = cap.name.replace('tunnel-wall-cap-', '');
        const wall = stage.planes.find(plane =>
            plane.name === 'tunnel-wall-' + index || plane.name === 'tunnel-impact-wall-' + index);
        assert.ok(wall, `${cap.name} needs its matching wall face`);
        const runsAlongX = Math.abs(wall.rotation[1]) % 180 === 0;
        assert.strictEqual(cap.rotation[2], runsAlongX ? 90 : 0,
            `${cap.name} must compose the studio Top arrow rotation with its wall run`);
        assert.ok(close(Math.hypot(
            cap.position[0] - wall.position[0], cap.position[2] - wall.position[2]), 0.16),
        `${cap.name} must stay 0.16 units from the wall face`);
        const yaw = ((wall.rotation[1] % 360) + 360) % 360;
        const inward = yaw === 0 ? [0, 1] : (yaw === 90 ? [1, 0] :
            (yaw === 180 ? [0, -1] : [-1, 0]));
        const outwardOffset = (cap.position[0] - wall.position[0]) * inward[0] +
            (cap.position[2] - wall.position[2]) * inward[1];
        assert.ok(close(outwardOffset, -0.16),
            `${cap.name} must sit outside the inward-facing brick wall`);
    });
    const entrySeparators = stage.planes.filter(plane =>
        /^tunnel-(?:impact-)?wall-/.test(plane.name || '') &&
        plane.rotation[1] === 180 && plane.position[2] > magicSpec.origin[1] - 0.2);
    assert.strictEqual(entrySeparators.length, 0,
        'the flat door row must open directly into the next room without a tunnel wall');
    const sideWalls = stage.planes.filter(plane =>
        /^tunnel-(?:impact-)?wall-/.test(plane.name || '') &&
        Math.abs(plane.rotation[1]) === 90);
    assert.strictEqual(Math.max(...sideWalls.map(plane => plane.position[2])), magicSpec.origin[1] - 1,
        'the side walls must skip the three floor rows that extend into the original room');
    stage.planes.filter(plane => /^tunnel-/.test(plane.name || '') &&
        !(plane.name || '').startsWith('tunnel-wall-cap-')).forEach(plane => {
        assert.strictEqual(plane.reading, 'transition');
        assert.ok(plane.repeat && plane.repeat[0] >= 1 && plane.repeat[1] >= 1,
            `${plane.name} must tile rather than stretch its texture`);
    });
    assert.strictEqual(stage.magic.tunnelWidth, 7);
    assert.strictEqual(stage.magic.narrowTunnelWidth, 2);
    assert.strictEqual(stage.magic.narrowAfterSegment, 4);
    assert.strictEqual(stage.magic.branches.length, 3);
    assert.ok(stage.magic.destinationEntry);
    assert.ok(stage.magic.destinationRoom);
    assert.strictEqual(stage.magic.impact[1], 3.4);
    const ladders = stage.planes.filter(plane =>
        (plane.name || '').startsWith('destination-ladder-'));
    // One ladder per answer column of the three-answer tower stage.
    assert.strictEqual(ladders.length, 3);
    ladders.forEach(ladder => {
        assert.strictEqual(ladder.sprite, 'tile_ladder');
        assert.strictEqual(ladder.group, 'destination-details');
    });
    assert.strictEqual(stage.magic.destinationRoom.maxX - stage.magic.destinationRoom.minX + 1, 15);
    assert.strictEqual(stage.magic.destinationRoom.maxZ - stage.magic.destinationRoom.minZ + 1, 14);
    assert.strictEqual(stage.magic.tunnelHeight, 8);
    assert.ok(stage.magic.route.length >= 13, 'the extended route needs many corridors');
    assert.ok(stage.planes.some(plane => plane.group === 'chamber-floor'));
    assert.ok(!stage.planes.some(plane => plane.group === 'chamber-walls'));
    assert.ok(!stage.planes.some(plane => plane.group === 'separator-wall'));
    assert.strictEqual(stage.instances.length, 1,
        'only the post-handoff arrival character may be an instance');
    assert.strictEqual(stage.instances[0].name, 'arrival-character');
    const chamberWallInk = stage.planes.filter(plane =>
        (plane.group === 'chamber-floor' || plane.group === 'selected-door-base') &&
        (plane.sprite === magicSpec.top.wall || plane.sprite === magicSpec.top.corner));
    assert.strictEqual(chamberWallInk.length,
        magicSpec.width * magicSpec.depth - (magicSpec.width - 2) * (magicSpec.depth - 2),
    'the complete wall ring must remain painted on the original room floor');
    assert.ok(stage.planes.some(plane => plane.group === 'tunnel-floor'));
    assert.ok(stage.planes.some(plane => plane.group === 'tunnel-wall-tops'));
    assert.ok(stage.planes.some(plane => plane.group === 'tunnel-walls'));
    const directions = stage.magic.route.slice(1, -1).map((point, index) => {
        const from = stage.magic.route[index];
        return [Math.sign(point[0] - from[0]), Math.sign(point[2] - from[2])].join(',');
    });
    let turns = 0;
    for (let i = 1; i < directions.length; i++) if (directions[i] !== directions[i - 1]) turns++;
    assert.ok(turns >= 9, 'the tunnel route must turn through many corridors');
    assert.ok(!JSON.stringify(stage).toLowerCase().includes('player'));
    assert.ok(!JSON.stringify(stage).toLowerCase().includes('pawn'));
});

test('the floor plan reads as a dungeon room from above', () => {
    const stage = context.scribbleBridgeStage(SPEC);
    const top = stage.planes.filter(p => p.reading === 'top');
    // The floor plan is one plate per tile: every tile has one, ring included,
    // because that plate is what the dungeon actually draws.
    const plates = top.filter(p => p.position[1] <= 0.01);
    assert.strictEqual(plates.length, SPEC.width * SPEC.depth);
    // Props add a cap each, and every standing band adds a narrow one.
    assert.ok(top.length > plates.length + SPEC.props.length);

    // Every top-reading plane lies in the XZ plane, which is what makes it
    // vanish edge-on when the camera swings round to the side.
    top.forEach(p => assert.strictEqual(p.rotation[0], -90));

    const corners = top.filter(p => p.sprite === SPEC.top.corner);
    assert.strictEqual(corners.length, 4);
    const floor = top.filter(p => p.sprite === SPEC.top.floor);
    assert.strictEqual(floor.length, (SPEC.width - 2) * (SPEC.depth - 2));

    // Absolute tile coordinates, so the room lands where the dungeon put it.
    const xs = plates.map(p => p.position[0]);
    const zs = plates.map(p => p.position[2]);
    assert.strictEqual(Math.min(...xs), SPEC.origin[0]);
    assert.strictEqual(Math.max(...xs), SPEC.origin[0] + SPEC.width - 1);
    assert.strictEqual(Math.min(...zs), SPEC.origin[1]);
    assert.strictEqual(Math.max(...zs), SPEC.origin[1] + SPEC.depth - 1);
});

test('the wall ring is laid flat AND stood up, so it reads both ways', () => {
    // The correction that matters: a wall tile is the studio's floorFeature —
    // a top-down base on the floor plus standing wall panels. A ring that is
    // only flat vanishes from the side; one that is only upright leaves a hole
    // in the dungeon's floor plan.
    const stage = context.scribbleBridgeStage(SPEC);
    const ringBases = stage.planes.filter(p =>
        p.reading === 'top' && (p.sprite === SPEC.top.wall || p.sprite === SPEC.top.corner));
    assert.strictEqual(ringBases.length,
        SPEC.width * SPEC.depth - (SPEC.width - 2) * (SPEC.depth - 2));

    const standing = stage.planes.filter(p => p.reading === 'side' && p.sprite === SPEC.side.wall);
    assert.ok(standing.length > 0, 'the ring has to stand up somewhere');
    standing.forEach(p => assert.strictEqual(p.rotation[0], 0));

    // A band is thin, but it is not flat: an outer face, an inner face a
    // fraction of a tile behind it, and a cap across the gap. Without the cap
    // the wall is two sheets of paper with nothing on top.
    const caps = stage.planes.filter(p => p.reading === 'top' && p.position[1] === SPEC.height);
    assert.ok(caps.length > 0, 'a wall band needs a cap');
    caps.forEach(p => {
        const thickness = Math.min(p.size[0], p.size[1]);
        assert.ok(thickness > 0 && thickness < 0.5,
            'the wall is a band on the tile edge, not a tile-deep block');
    });
});

test('no two wall faces are coincident', () => {
    // Neighbouring columns share a face. Drawing both puts two planes in the
    // same place, and coincident planes z-fight — a shimmer that no amount of
    // camera work hides. The shared face has to be left off, not drawn twice.
    const stage = context.scribbleBridgeStage(SPEC);
    const seen = new Set();
    stage.planes.forEach(p => {
        const key = p.reading + '|' + p.position.map(v => v.toFixed(4)).join(',') +
            '|' + p.rotation.join(',');
        assert.ok(!seen.has(key), `two planes occupy ${key}`);
        seen.add(key);
    });
});

test('the fourth wall is missing, so the side camera can see in', () => {
    const stage = context.scribbleBridgeStage(SPEC);
    const standing = stage.planes.filter(p => p.reading === 'side' && p.sprite === SPEC.side.wall);
    // Nothing stands along the room's near edge; if anything did, it would face
    // the side camera and hide the room behind it.
    const nearEdge = SPEC.origin[1] + SPEC.depth - 0.5;
    assert.ok(!standing.some(p => Math.abs(p.position[2] - nearEdge) < 1e-9));
    // ...but the top reading still shows a closed room on all four sides.
    const ring = stage.planes.filter(p =>
        p.reading === 'top' && p.sprite === SPEC.top.wall &&
        Math.abs(p.position[2] - (SPEC.origin[1] + SPEC.depth - 1)) < 1e-9);
    assert.strictEqual(ring.length, SPEC.width - 2);
});

test('a crate is an open-bottom cube: top-down art above, side art around', () => {
    const stage = context.scribbleBridgeStage(SPEC);
    const crates = stage.planes.filter(p => p.sprite === 'tile_crate' || p.sprite === 'crate');
    // Two crates in the spec, one of them two tiles tall. Each gets one cap and
    // four walls per tile of height — the walls tile vertically rather than
    // stretching one plane, so a stack reads as stacked boxes.
    const crateSpecs = SPEC.props.filter(p => p.side === 'tile_crate');
    const expected = crateSpecs.reduce((n, p) => n + 1 + 4 * (p.height || 1), 0);
    assert.strictEqual(crates.length, expected);

    const tops = crates.filter(p => p.reading === 'top');
    assert.strictEqual(tops.length, crateSpecs.length);
    tops.forEach(p => assert.strictEqual(p.sprite, 'crate'));

    // The top face sits at the cube's full height, so from directly above a
    // tall crate still covers its tile exactly the way the dungeon draws it.
    const tall = SPEC.props.find(p => p.height === 2);
    const tallTop = tops.find(p => Math.abs(p.position[0] - (SPEC.origin[0] + tall.c)) < 1e-9);
    assert.strictEqual(tallTop.position[1], 2);

    const walls = crates.filter(p => p.reading === 'side');
    assert.strictEqual(walls.length, expected - crateSpecs.length);
    walls.forEach(p => assert.strictEqual(p.sprite, 'tile_crate'));
});

test('the ground course meets the floor plane exactly', () => {
    // The level has to stand on something at 90 degrees, where the floor plane
    // is edge-on and infinitely thin. The course hangs below the floor so its
    // top edge and the floor are the same line — a step here would read as the
    // level floating or sunk.
    const stage = context.scribbleBridgeStage(SPEC);
    const ground = stage.planes.filter(p => p.sprite === SPEC.side.ground);
    assert.strictEqual(ground.length, SPEC.width);
    ground.forEach(g => {
        assert.strictEqual(g.reading, 'side');
        // Centre at -0.5 with unit height puts the top edge on y = 0.
        assert.strictEqual(g.position[1], -0.5);
        assert.strictEqual(g.size[1], 1);
    });
});

test('the back wall stands behind every floor tile', () => {
    const stage = context.scribbleBridgeStage(SPEC);
    // Smaller z is further from a front camera. The back run must sit behind
    // the whole floor plan, or the floor would poke through the level.
    const floorZ = stage.planes.filter(p => p.reading === 'top').map(p => p.position[2]);
    assert.ok(stage.backZ < Math.min(...floorZ));
    assert.ok(stage.frontZ > Math.max(...floorZ));
});

test('a room with no side art still builds a clean floor plan', () => {
    // The dungeon must be able to draw a transition room before its side half
    // is authored, rather than throwing halfway through the build.
    const bare = context.scribbleBridgeStage(
        Object.assign({}, SPEC, { side: null, props: null }));
    assert.ok(!bare.planes.some(p => p.reading === 'side'));
    assert.strictEqual(bare.planes.length, SPEC.width * SPEC.depth);
});

test('every sprite the transition room asks for is preloaded by its own game', () => {
    // The room borrows art from both packs, so both preload lists have to carry
    // their half or the room builds with holes in it.
    const dungeon = new Set(context.SCRIBBLE_DUNGEON_CONFIG.sprites);
    Object.values(SPEC.top).concat(SPEC.props.map(p => p.top)).forEach(name => {
        assert.ok(dungeon.has(name), `${name} is not in the dungeon preload list`);
    });
    const platformer = new Set(context.SCRIBBLE_PLATFORMER_CONFIG.sprites);
    [SPEC.side.wall, SPEC.side.ground]
        .concat(SPEC.props.map(p => p.side)).forEach(name => {
        assert.ok(platformer.has(name), `${name} is not in the platformer preload list`);
    });
});

test('the room is wide enough to hold a platformer level', () => {
    // The side reading has to fit a whole room of the platformer's course, or
    // the level arrives cropped.
    assert.ok(SPEC.width >= context.SCRIBBLE_PLATFORMER_CONFIG.tile.roomTiles);
});

// Pasted verbatim from the studio's "Copy values for Codex" for the battlement.
// Trimmed to the fields the adapter reads, but not otherwise touched: this is
// the authoring format, and the point of the test is that it survives the trip.
const BATTLEMENT = {
    asset: 'Draft - Castle battlement',
    dimensions: [2.5, 2.5, 2.5],
    panels: [
        { id: 'castle-front', role: 'front', reference: 'side',
          position: [0, 1.25, 1.2], rotation: [0, 0, 0], size: [2.5, 2.5] },
        { id: 'castle-back', role: 'back', reference: 'side',
          position: [0, 1.25, -1.2], rotation: [0, 180, 0], size: [2.5, 2.5] },
        { id: 'roof-left-high', role: 'top', reference: 'top',
          position: [-0.977, 2.45, 0], rotation: [-90, 0, 0], size: [0.469, 2.5],
          sourceReference: { source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64] } },
        { id: 'roof-centre-high', role: 'top', reference: 'top',
          position: [0, 2.45, 0], rotation: [-90, 0, 0], size: [0.859, 2.5],
          sourceReference: { source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64] } },
        { id: 'roof-left-low', role: 'top', reference: 'top',
          position: [-0.586, 2.04, 0], rotation: [-90, 0, 0], size: [1.3, 2.45],
          sourceReference: { source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64] } },
        { id: 'roof-left-high-copy-1785108218727', role: 'top', reference: 'top',
          position: [-0.8, 2.25, 0], rotation: [-90, 90, 0], size: [0.469, 2.5],
          sourceReference: { source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64] } },
    ],
};
const REFS = {
    top: './assets/scribble-dungeons/floor_wall.png',
    side: './assets/scribble-platformer/tile_castle.png',
};

test('the walls are courses of an authored brick, a brick thick', () => {
    // Generated geometry is the stand-in. Once a brick has been approved in the
    // studio the wall is courses of it — full tiles, not a band on the edge —
    // and the brick decides how the wall reads from either angle.
    const withBrick = context.scribbleBridgeStage(
        Object.assign({}, SPEC, { wallBrick: { recipe: BATTLEMENT, refs: REFS } }));

    // Every standing ring tile, stacked `height` high. The front row stays open.
    const standingTiles =
        SPEC.width * SPEC.depth - (SPEC.width - 2) * (SPEC.depth - 2) - SPEC.width;
    assert.strictEqual(withBrick.instances.length, standingTiles * SPEC.height);

    // Each course faces *out* of the room, so its authored lean carries the
    // masonry to the outer face of the ring and leaves the tile's own plate
    // showing. Faced inward, the brick sits on the plate and buries the very
    // art that makes the room read as a dungeon room from above.
    const yaws = new Set(withBrick.instances.map(i => i.yaw));
    assert.deepStrictEqual(Array.from(yaws).sort((a, b) => a - b), [-90, 90, 180]);

    // Back run turned away from the room, side runs turned outward.
    const back = withBrick.instances.filter(i =>
        Math.abs(i.position[2] - SPEC.origin[1]) < 1e-9 &&
        i.position[0] > SPEC.origin[0] && i.position[0] < SPEC.origin[0] + SPEC.width - 1);
    back.forEach(i => assert.strictEqual(i.yaw, 180));

    // Bricks sit on tile centres; the lean is left to the asset.
    withBrick.instances.forEach(i => {
        assert.ok(Number.isInteger(i.position[0]) && Number.isInteger(i.position[2]));
    });

    // ...and no thin band was left behind anywhere.
    assert.ok(!withBrick.planes.some(p => p.reading === 'side' && p.sprite === SPEC.side.wall));
});

test('a recipe authored off its own origin is measured, not assumed centred', () => {
    // Connected + arrow sides puts its front face at z = 1.25 and its arrows at
    // 0.85, so its body sits forward of the origin. Assuming it were centred is
    // what walks a wall off its floor plan.
    const leaning = {
        panels: [
            { position: [0, 1.25, 1.25], rotation: [0, 0, 0], size: [2.5, 2.5], reference: 'side' },
            { position: [0, 2.45, 0.85], rotation: [-90, 0, 90], size: [2.5, 2.5], reference: 'top' },
            { position: [-1.22, 1.27, 0.87], rotation: [0, -90, 0], size: [2.5, 2.5], reference: 'top' },
            { position: [1.23, 1.28, 0.87], rotation: [0, 90, 0], size: [2.5, 2.5], reference: 'top' },
        ],
    };
    const centre = context.scribbleBridgeRecipeCentre(leaning);
    // x is very nearly centred; z is not, and that is the whole problem.
    assert.ok(Math.abs(centre[0]) < 0.01);
    assert.ok(centre[1] > 0.3, 'the lean has to be measured, not ignored');

    // A recipe with no panels must not divide by nothing.
    assert.deepStrictEqual(Array.from(context.scribbleBridgeRecipeCentre({})), [0, 0]);
});

test('a studio recipe converts to bridge units', () => {
    const planes = context.scribbleBridgeRecipePlanes(BATTLEMENT, REFS);
    assert.strictEqual(planes.length, BATTLEMENT.panels.length);

    // 2.5 studio units are one tile, which is what PITCH means to both games.
    const front = planes[0];
    assert.ok(Math.abs(front.position[1] - 1.25 / 2.5) < 1e-9);
    assert.ok(Math.abs(front.size[0] - 1) < 1e-9);

    // A panel with no sourceReference falls back to its pack, because the
    // studio's clipboard export carries panels but not the recipe's own
    // top/sideReference.
    assert.strictEqual(front.source, REFS.side);
});

test('roof strips keep their own crop of one shared PNG', () => {
    // The battlement cuts every roof piece from arrow.png at rect [20,0,24,64].
    // Losing the rect would stretch the whole sprite over each strip.
    const planes = context.scribbleBridgeRecipePlanes(BATTLEMENT, REFS);
    const roofs = planes.filter(p => p.source.endsWith('arrow.png'));
    assert.strictEqual(roofs.length, 4);
    roofs.forEach(p => assert.deepStrictEqual(Array.from(p.rect), [20, 0, 24, 64]));

    // Merlons at full height, crenels recessed: a cap is a profile, not a lid.
    const heights = new Set(roofs.map(p => p.position[1].toFixed(4)));
    assert.ok(heights.size >= 3, 'the roof should step, not sit flat');
});

test('a panel reads by which way it faces, not which pack it came from', () => {
    const planes = context.scribbleBridgeRecipePlanes(BATTLEMENT, REFS);
    // The roof strips are cut from the top-down pack and lie flat: top reading.
    const roof = planes.find(p => p.rotation[0] === -90);
    assert.strictEqual(roof.reading, 'top');
    // The castle walls stand up, so they read from the side even though a
    // battlement's roof art came from the other pack entirely.
    const wall = planes.find(p => p.rotation[0] === 0);
    assert.strictEqual(wall.reading, 'side');
});

test('an instance carries its yaw rather than baking it into panels', () => {
    // Composing a turn with panels already rotated about two axes is not
    // componentwise addition; the renderer nests the instance in a group.
    const placed = context.scribbleBridgeInstance(BATTLEMENT, REFS, [4, 3, -2], 90);
    assert.deepStrictEqual(Array.from(placed.position), [4, 3, -2]);
    assert.strictEqual(placed.yaw, 90);
    const original = context.scribbleBridgeRecipePlanes(BATTLEMENT, REFS);
    placed.planes.forEach((p, i) => {
        assert.deepStrictEqual(Array.from(p.rotation), Array.from(original[i].rotation));
    });
});

test('every source a recipe names exists on disk', () => {
    const planes = context.scribbleBridgeRecipePlanes(BATTLEMENT, REFS);
    new Set(planes.map(p => p.source)).forEach(source => {
        assert.ok(fs.existsSync(source.replace(/^\.\//, '')), `${source} is missing`);
    });
});

test('the layer refuses to build without WebGL instead of throwing', () => {
    // Weak devices and offline installs must fall back to the page turn, not
    // break the run.
    assert.strictEqual(context.scribbleBridgeHasWebGL(), false);
    assert.strictEqual(context.createScribbleBridge({}), null);
});

console.log(`\n${passed} bridge tests passed.`);
