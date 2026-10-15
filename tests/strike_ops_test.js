// Strike Ops (כוח פריצה) — Node VM tests for games/strike-ops.js (rev 3.1).
// Covers STRIKE_OPS_SPEC.md §12.2 suites 1–16: config and framing, squad/boss
// fairness and the one pose source, round kind and counters, collision, LOS and
// magnetism, nameplate layout and bidi runs, the theme adapter, skeleton rebind
// and per-enemy materials, the learning lifecycle (fake clock), integration,
// the static merge, the compound map, map state, navigation and the autopilot,
// the encounter boundary and lane order, and aiming in the map frame.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

let passed = 0;
const asyncTests = [];
function test(name, fn) {
    try {
        const r = fn();
        if (r && typeof r.then === 'function') asyncTests.push(r.then(() => { passed += 1; console.log('✓', name); }, error => { console.error('✗', name); throw error; }));
        else { passed += 1; console.log('✓', name); }
    } catch (error) { console.error('✗', name); throw error; }
}
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, (msg || '') + ' ' + a + ' ≉ ' + b);

// ---------------------------------------------------------------- harness
function fakeClock() {
    let now = 0, seq = 0;
    const queue = new Map();
    return {
        now: () => now,
        setTimeout: (fn, ms) => { const id = ++seq; queue.set(id, {fn, at: now + Math.max(0, ms || 0)}); return id; },
        clearTimeout: id => { queue.delete(id); },
        advance(ms) {
            const end = now + ms;
            for (;;) {
                let next = null;
                queue.forEach((t, id) => { if (t.at <= end && (!next || t.at < next.t.at || (t.at === next.t.at && id < next.id))) next = {id, t}; });
                if (!next) break;
                queue.delete(next.id);
                now = next.t.at;
                next.t.fn();
            }
            now = end;
        },
        pending: () => queue.size,
    };
}

function loadGame(extra) {
    let definition = null;
    const ctx = Object.assign({
        console, Math, JSON, Date, Promise, Map, Set, WeakMap, Array, Object, Number, String, Error, isFinite,
        Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array,
        Vue: {extend: value => value, component: (name, value) => { definition = value; return value; }},
    }, extra || {});
    ctx.window = ctx;
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    if (ctx.__three) vm.runInContext(read('vendor/three-0.128.0.min.js'), ctx, {filename: 'three.js'});
    vm.runInContext(read('games/strike-ops.js'), ctx, {filename: 'strike-ops.js'});
    ctx.__definition = () => definition;
    return ctx;
}

// A plain object standing in for the Vue instance: real data, computed getters
// and bound methods from the component definition, plus BaseGameComponent stubs.
function harness(options) {
    const opts = options || {};
    const clock = fakeClock();
    const calls = [];
    let raf = 0;
    let generated = 0;
    const ctx = loadGame(Object.assign({
        setTimeout: clock.setTimeout,
        clearTimeout: clock.clearTimeout,
        performance: {now: clock.now},
        requestAnimationFrame: () => { raf += 1; return raf; },
        cancelAnimationFrame: () => {},
        generateFromList: () => {
            generated += 1;
            calls.push(['generate']);
            return {question: 'Q' + generated, result: 'right' + generated, options: ['right' + generated, 'wrong-a', 'wrong-b', 'wrong-c'], questionIndex: 7, action: () => calls.push(['action'])};
        },
        getSetItems: app => app.setItems,
        updateWeightForKey: (id, index, delta) => calls.push(['weight', id, index, delta]),
        successSound: {play: () => { calls.push(['success']); return Promise.resolve(); }},
        failureSound: {play: () => { calls.push(['failure']); return Promise.resolve(); }},
    }, opts.ctx || {}));
    const comp = ctx.createStrikeOpsComponent({name: 'base'});
    const g = {};
    Object.assign(g, comp.data.call(g));
    Object.assign(g, {
        score: 0, currentAppId: 'test-app', questionIndex: null, exercise: '', result: null, theme: null,
        currentApp: {listName: 'LIST', questionIndex: 'q', resultIndex: 'r', setItems: 3},
        progress: {progress: 0, total: 10},
    });
    // attemptLocked = false may only be written by arriveRound and unlockRetry
    let locked = g.attemptLocked;
    const unlockers = [];
    Object.defineProperty(g, 'attemptLocked', {
        get: () => locked,
        set: v => { if (v === false) unlockers.push((new Error().stack.split('\n')[2] || '').trim()); locked = v; },
    });
    Object.keys(comp.methods).forEach(k => { g[k] = comp.methods[k].bind(g); });
    Object.keys(comp.computed).forEach(k => Object.defineProperty(g, k, {get: comp.computed[k].bind(g)}));
    let reloadResults = opts.reloadResults ? opts.reloadResults.slice() : [];
    g.reloadProgress = () => { calls.push(['reload']); return reloadResults.length ? reloadResults.shift() : true; };
    g.saveScore = () => calls.push(['save', g.score]);
    g.shuffle = a => a;
    g.$nextTick = fn => fn();
    g.$refs = {};
    g.$route = {path: '/play/strike_ops/test-app', params: {currentAppId: 'test-app'}};
    g.$router = {push: p => calls.push(['push', p]), replace: p => calls.push(['replace', p]), currentRoute: {path: '/play/strike_ops/test-app'}};
    comp.beforeCreate.call(g);
    return {g, ctx, comp, clock, calls, raf: () => raf, generated: () => generated, unlockers, setReload: list => { reloadResults = list.slice(); }};
}
// Starts a run through the real Start → deploying → arriveRound path (no scene).
function engage(h) {
    h.g.create();
    h.g.setPhase('briefing');
    h.g.start(null);
    h.clock.advance(h.ctx.STRIKE_OPS_CONFIG.timing.approachMs);
    assert.strictEqual(h.g.phase, 'engaging');
    return h.g;
}
const weights = calls => calls.filter(c => c[0] === 'weight');
const correctIndex = g => g.options.indexOf(g.question.result);
const wrongIndex = g => g.options.findIndex(o => o !== g.question.result);
// Answers the current place's rounds correctly until its clear (roaming/advancing).
function clearPlace(h) {
    const g = h.g, T = h.ctx.STRIKE_OPS_CONFIG.timing;
    for (;;) {
        const boss = g.roundInZone === h.ctx.STRIKE_OPS_CONFIG.zonePlan.bossRoundIndex;
        assert.strictEqual(g.answer(correctIndex(g)), true);
        h.clock.advance(T.correctToTransitionMs);
        if (boss) return g.phase;
        assert.strictEqual(g.phase, 'regroup');
        h.clock.advance(T.regroupMs);
        assert.strictEqual(g.phase, 'engaging');
    }
}

const pure = loadGame();
const C = pure.STRIKE_OPS_CONFIG;
const Z = C.zones[0];
const clone = o => JSON.parse(JSON.stringify(o));
let seedState = 4242;
const rnd = () => (seedState = (seedState * 16807) % 2147483647) / 2147483647;

// ---------------------------------------------------------------- 1. config and framing
test('1 config validates: LOS from the fight box, occlusion from the core, lane order, framing, spacing, props, timings, foot slide, roles', () => {
    assert.deepStrictEqual(Array.from(pure.validateStrikeOpsConfig()), []);
    assert.deepStrictEqual(Array.from(pure.validateStrikeOpsConfig(C, {quick: true})), []);
    assert.ok(Object.isFrozen(C) && Object.isFrozen(Z.lanes[0].spots[0].peek) && Object.isFrozen(C.map.walls[0]), 'config is deep-frozen');
    assert.strictEqual(pure.STRIKE_OPS_MAX_LANES, 4);
    assert.deepStrictEqual(Array.from(C.zonePlan.zones), ['yard', 'containers', 'sheds', 'plaza']);
    C.zones.forEach(zone => {
        assert.strictEqual(zone.lanes.length, 4);
        const fbOrder = pure.strikeOpsLaneOrderOk(zone, C, 4, 'fightBox');
        assert.ok(fbOrder.ok && fbOrder.minGapDeg >= 4, 'fight-box lane order gap ' + fbOrder.minGapDeg);
        const coreOrder = pure.strikeOpsLaneOrderOk(zone, C, 6, 'core');
        assert.ok(coreOrder.ok && coreOrder.minGapDeg >= 6, 'core lane order gap ' + coreOrder.minGapDeg);
        const boxes = zone.cover.map(c => pure.strikeOpsCoverBox(c));
        const grid = (r, fn) => { for (let x = r.minX; x <= r.maxX + 1e-9; x += 0.5) for (let z = r.minZ; z <= r.maxZ + 1e-9; z += 0.5) fn({x, y: C.movement.eye, z}); };
        grid(zone.fightBox, eye => zone.lanes.forEach(lane => lane.spots.forEach(s => {
            assert.strictEqual(pure.strikeOpsSegmentBlocked(eye, {x: s.peek.x, y: C.aim.hitbox.centerY, z: s.peek.z}, boxes), false, 'peek LOS from the fight box');
        })));
        grid(zone.core, eye => zone.lanes.forEach(lane => lane.spots.forEach(s => {
            assert.strictEqual(pure.strikeOpsSegmentBlocked(eye, {x: s.hide.x, y: C.aim.crouchBody.h, z: s.hide.z}, boxes), true, 'hide occluded from the core');
        })));
        for (let n = 1; n <= 4; n++) {
            const set = zone.laneSets[n];
            assert.strictEqual(set.length, n);
            for (let i = 1; i < set.length; i++) assert.ok(set[i] > set[i - 1]);
        }
        pure.strikeOpsMoveSpeeds(zone, C).forEach(m => assert.ok(m.ok && m.timeScale >= 0.75 && m.timeScale <= 1.35, m.what));
        const f = zone.flavor;
        assert.ok(f && f.deployLine && f.gateVoice && f.sign && f.sign.text && f.squadStyle && f.squadStyle.exposedIdle, zone.id + ' flavor');
    });
    ['idle', 'move', 'shoot', 'hit', 'down'].forEach(r => assert.ok(r in C.enemyModel.clips, r));
    const b = C.boss, t = C.timing;
    assert.ok(b.appearMs + b.splitMs + b.settleMs <= t.approachMs);
    assert.ok(b.flickerMs + b.dissolveMs <= t.retryLockMs - 100);
    assert.ok(C.knockdown.fadeStartMs + C.knockdown.fadeMs <= t.correctToTransitionMs + t.regroupMs - t.approachMs);
});

test('1 negative fixtures each produce the expected error', () => {
    const expect = (mutate, pattern) => {
        const cfg = clone(C);
        mutate(cfg, cfg.zones[0]);
        const errors = Array.from(pure.validateStrikeOpsConfig(cfg, {routing: false}));
        assert.ok(errors.some(e => pattern.test(e)), pattern + ' in ' + JSON.stringify(errors));
        return errors;
    };
    expect((c, z) => { const l = z.lanes[0]; z.lanes[0] = z.lanes[1]; z.lanes[1] = l; }, /lane order/);
    expect((c, z) => { z.props.push({kind: 'barrel', x: -1.15, z: 4.5, w: 1.2, d: 1.2, h: 2.2}); }, /props cross a fight-box→enemy sightline: barrel/);
    expect(c => { delete c.enemyModel.clips.hit; }, /missing the required role hit/);
    expect((c, z) => { z.lanes[3].spots[1].peek.x = z.lanes[3].spots[1].hide.x = 5.2; }, /framing/);
    expect(c => { c.boss.splitMs = 1200; }, /boss split/);
    expect(c => { c.boss.flickerMs = 300; c.boss.dissolveMs = 400; }, /flicker \+ dissolve/);
    expect(c => { c.squad.dashMs = 2400; }, /foot slide: lane \d dash/);
    expect((c, z) => { z.fightBox.minX = -5; z.fightBox.maxX = 5; }, /lane order: lanes must stay left-to-right with a 4° gap from every fight-box point/);
    expect(c => { c.map.structures.push({area: 'containers', kind: 'crate', x: 13.6, z: 30.2, w: 1, d: 1}); }, /zone containers: an enemy position lies within 0\.45 m of a structure or wall: crate/);
    expect(c => { c.zones[1].headingDeg = 45; }, /zone containers: headingDeg must be a multiple of 90°/);
});

test('1 framing math: derived hip FOV and the farthest soldier size gates from the anchor and the fight box', () => {
    const f = (w, h) => pure.strikeOpsHipFov(w, h, C);
    // step 5 (§15): hipHalfHFovDeg 32 = laneMaxAngleDeg + the 4° margin; portrait stays under the 110° cap
    near(f(390, 844).vfov, 107.03, 0.01); near(f(360, 780).vfov, 107.10, 0.01);
    [[390, 844], [360, 780], [540, 960]].forEach(([w, h]) => near(f(w, h).hHalf, 32, 1e-6));
    assert.ok(C.framing.hipHalfHFovDeg >= C.framing.laneMaxAngleDeg + 4 - 1e-9, 'every lane on screen with the 4° margin');
    near(f(844, 390).vfov, 40, 1e-9); near(f(844, 390).hHalf, 38.2, 0.1);
    near(f(1440, 900).hHalf, 32, 1e-6); near(f(768, 1024).hHalf, 32, 1e-6);
    C.zones.forEach(zone => {
        let far = 0, farBox = 0;
        const fb = zone.fightBox;
        const corners = [[fb.minX, fb.minZ], [fb.maxX, fb.minZ], [fb.minX, fb.maxZ], [fb.maxX, fb.maxZ]];
        zone.lanes.forEach((l, k) => [l.spots[0].peek, l.spots[1].peek, zone.boss.points[k]].forEach(p => {
            far = Math.max(far, Math.hypot(p.x - zone.anchor.x, p.z - zone.anchor.z));
            corners.forEach(c => { farBox = Math.max(farBox, Math.hypot(p.x - c[0], p.z - c[1])); });
        }));
        assert.ok(farBox <= C.framing.fightMaxDistM + 1e-9, zone.id + ' fight box distance ' + farBox);
        // Known gap (reported in rev 2.1): at 360×780 the farthest spot (8.9 m) projects ≈ 52 px.
        [[390, 844], [844, 390], [1440, 900], [768, 1024], [540, 960]].forEach(([w, h]) => {
            const v = f(w, h).vfov * Math.PI / 180;
            const px = d => C.enemyModel.targetHeight / d * (h / 2) / Math.tan(v / 2);
            assert.ok(px(far) >= C.framing.minEnemyPx, zone.id + ' ' + w + 'x' + h + ' ' + px(far).toFixed(1));
            assert.ok(px(farBox) >= C.framing.minEnemyPxFar, zone.id + ' far corner ' + w + 'x' + h + ' ' + px(farBox).toFixed(1));
        });
    });
});

// ---------------------------------------------------------------- 2. fairness and pose
test('2 squad fairness: equal hittable time, bounded hiding, early first peek, dashes alternate spots, deterministic', () => {
    const sq = C.squad, period = sq.exposedMs + sq.hiddenMs + 2 * sq.slideMs, step = 10;
    for (let n = 1; n <= 4; n++) {
        const hit = new Array(n).fill(0), longest = new Array(n).fill(0), run = new Array(n).fill(0);
        const dashes = new Array(n).fill(0).map(() => []);
        let prevState = [];
        for (let t = 0; t < 10 * period; t += step) {
            for (let i = 0; i < n; i++) {
                const s = pure.strikeOpsSquadAt(i, n, t, C);
                const h = s.state === 'exposed' || s.state === 'dash';
                if (h) hit[i] += step;
                if (s.state === 'hidden' || s.state === 'peek-out' || s.state === 'peek-in') { run[i] += step; longest[i] = Math.max(longest[i], run[i]); } else run[i] = 0;
                if (s.state === 'dash' && prevState[i] !== 'dash') dashes[i].push(s);
                prevState[i] = s.state;
                assert.deepStrictEqual(JSON.stringify(pure.strikeOpsSquadAt(i, n, t, C)), JSON.stringify(s), 'deterministic');
            }
        }
        hit.forEach(v => near(v, hit[0], 2 * step, 'equal exposure n=' + n));
        longest.forEach(v => assert.ok(v <= sq.hiddenMs + 2 * sq.slideMs + step, 'hidden span ' + v));
        for (let i = 0; i < n; i++) {
            assert.ok(dashes[i].length >= 4, 'dashes happen');
            for (let k = 1; k < dashes[i].length; k++) assert.notStrictEqual(dashes[i][k].spot, dashes[i][k - 1].spot, 'spot alternates');
        }
        assert.strictEqual(pure.strikeOpsSquadAt(0, n, sq.firstPeekMs + sq.slideMs, C).state, 'exposed');
    }
    // a dash lasts exactly dashMs inside the exposed window
    const n = 4;
    let len = 0, seen = false;
    for (let t = 0; t < 3 * period; t += 1) {
        const s = pure.strikeOpsSquadAt(0, n, t, C);
        if (s.state === 'dash') { len += 1; seen = true; } else if (seen) break;
    }
    near(len, sq.dashMs, 1);
});

test('2 boss fairness, constant-speed patrol and the one pose source in both motion modes', () => {
    const b = C.boss, cycle = 2 * (b.patrol.walkMs + b.patrol.pauseMs);
    for (let n = 2; n <= 4; n++) {
        for (let i = 0; i < n; i++) {
            let prevX = null, prevDir = 0, hit = 0;
            for (let t = 0; t < 3 * cycle; t += 10) {
                const s = pure.strikeOpsBossAt(i, n, t, C);
                assert.ok(Math.abs(s.x) <= b.patrol.legM / 2 + 1e-9, 'patrol bounds');
                if (s.hittable) hit += 10;
                const sameLeg = s.moving && prevDir === s.dir && Math.abs(s.x) < b.patrol.legM / 2 - 0.02;
                prevDir = s.moving ? s.dir : 0;
                if (sameLeg && prevX != null) {
                    const v = Math.abs(s.x - prevX) / 0.01;
                    assert.ok(v < 1e-6 || Math.abs(v - b.patrol.legM / (b.patrol.walkMs / 1000)) < 0.2, 'constant leg speed ' + v);
                }
                prevX = s.x;
            }
            assert.strictEqual(hit, 3 * cycle);
            assert.strictEqual(pure.strikeOpsBossAt(i, n, 100, C, {dissolved: true}).hittable, false);
        }
    }
    const zone = Z, sq = C.squad, period = sq.exposedMs + sq.hiddenMs + 2 * sq.slideMs;
    for (let i = 0; i < 4; i++) {
        const enemy = {kind: 'soldier', index: i, n: 4, lane: zone.lanes[i], laneIndex: i, zone, shiftMs: 0, approachMs: null};
        for (let t = 0; t < 10 * period; t += 16) {
            const a = pure.strikeOpsPoseAt(enemy, t, C, false), r = pure.strikeOpsPoseAt(enemy, t, C, true);
            assert.strictEqual(a.hittable, r.hittable, 'identical hittable flags');
            if (r.hittable) assert.ok(zone.lanes[i].spots.some(s => Math.abs(s.peek.x - r.x) < 1e-9 && Math.abs(s.peek.z - r.z) < 1e-9), 'reduced pose on a spot');
        }
        const copy = {kind: 'copy', index: i, n: 4, zone, bossPoint: zone.boss.points[i], approachMs: null};
        for (let t = 0; t < 2 * cycle; t += 50) {
            const r = pure.strikeOpsPoseAt(copy, t, C, true);
            assert.ok(r.x === zone.boss.points[i].x && r.z === zone.boss.points[i].z, 'reduced copy stays at its lane point');
        }
    }
});

// ---------------------------------------------------------------- 3. round kind and counters
test('3 round kind and counters: regroup, roaming between places, the lap wrap; counters advance before create()', () => {
    assert.strictEqual(pure.strikeOpsRoundKind(C.zonePlan.bossRoundIndex, C), 'boss');
    [0, 1, 2].forEach(r => assert.strictEqual(pure.strikeOpsRoundKind(r, C), 'squad'));
    assert.strictEqual(pure.strikeOpsRoundKind(0, C, true), 'boss');
    assert.strictEqual(pure.strikeOpsRoundKind.length, 3, 'takes no question, option or weight input');
    const nr = c => JSON.parse(JSON.stringify(pure.strikeOpsNextRound(c, C)));
    assert.deepStrictEqual(nr({roundNumber: 3, roundInZone: 2, zoneNumber: 1, zoneIndex: 0, lap: 1}), {kind: 'regroup', roundNumber: 4, roundInZone: 3, zoneNumber: 1, zoneIndex: 0, lap: 1});
    [0, 1, 2].forEach(zi => assert.deepStrictEqual(nr({roundNumber: 4 * (zi + 1), roundInZone: 3, zoneNumber: zi + 1, zoneIndex: zi, lap: 1}),
        {kind: 'roaming', roundNumber: 4 * (zi + 1) + 1, roundInZone: 0, zoneNumber: zi + 2, zoneIndex: zi + 1, lap: 1}));
    assert.deepStrictEqual(nr({roundNumber: 16, roundInZone: 3, zoneNumber: 4, zoneIndex: 3, lap: 1}), {kind: 'advancing', roundNumber: 17, roundInZone: 0, zoneNumber: 5, zoneIndex: 0, lap: 2});
    // lifecycle: rounds 4, 8 are boss rounds (the 4th question is classified with the 4th counter)
    const h = harness();
    const g = engage(h);
    const kinds = [g.roundKind];
    for (let k = 0; k < 8; k++) {
        g.answer(correctIndex(g));
        h.clock.advance(C.timing.correctToTransitionMs);
        assert.ok(g.phase === 'regroup' || g.phase === 'roaming', g.phase);
        kinds.push(g.roundKind);
        if (g.phase === 'roaming') { assert.strictEqual(g.skipTransition(), true); h.clock.advance(C.timing.approachMs); }
        else h.clock.advance(C.timing.regroupMs);
        assert.strictEqual(g.phase, 'engaging');
    }
    assert.deepStrictEqual(kinds, ['squad', 'squad', 'squad', 'boss', 'squad', 'squad', 'squad', 'boss', 'squad']);
    assert.strictEqual(g.stars, 2);
    assert.strictEqual(g.zoneId, 'sheds');
});

// ---------------------------------------------------------------- 4–5. collision, LOS, magnetism
test('4 collision: AABBs and circles, never inside, no tunnelling, sliding, concave corners, the fight-box clamp', () => {
    const R = C.movement.radius;
    const col = pure.strikeOpsColliders(0, C);
    const inside = p => pure.strikeOpsPenetrates(col, p, R - 1e-4);
    // 10 000 seeded random moves around the real map colliders
    const fill = pure.strikeOpsFloodFill(pure.strikeOpsColliders(4, C), C.map.start);
    const cells = [];
    fill.seen.forEach((v, id) => { if (v) cells.push(id); });
    const W = fill.W;
    let p = null;
    for (let k = 0; k < 10000; k++) {
        if (!p || k % 50 === 0) {
            const id = cells[Math.floor(rnd() * cells.length)];
            p = {x: W.B.minX + (id % W.nx) * W.step, z: W.B.minZ + Math.floor(id / W.nx) * W.step};
            if (inside(p)) { p = null; continue; }
        }
        const a = rnd() * Math.PI * 2, v = rnd() * 4.2, dt = 0.016 + rnd() * 0.034;
        const q = pure.strikeOpsResolveMove(p, {x: Math.sin(a) * v * dt, z: Math.cos(a) * v * dt}, col, C.map.playBounds, R, C.movement.maxStepM);
        assert.ok(!inside(q), 'ended inside a collider at ' + JSON.stringify(q));
        p = q;
    }
    // no tunnelling through the 0.6 m yard east fence at 4.2 m/s × 50 ms frames
    let t = {x: 15.0, z: 0};
    for (let i = 0; i < 60; i++) t = pure.strikeOpsResolveMove(t, {x: 4.2 * 0.05, z: 0}, col, C.map.playBounds, R, C.movement.maxStepM);
    assert.ok(t.x <= 15.7 - R + 1e-6, 'stopped before the fence ' + t.x);
    // a thin 0.3 m wall: no tunnelling either
    const thin = [{minX: 2, maxX: 2.3, minZ: -5, maxZ: 5}];
    let u = {x: 0, z: 0};
    for (let i = 0; i < 40; i++) u = pure.strikeOpsResolveMove(u, {x: 0.21, z: 0}, thin, null, R, 0.1);
    assert.ok(u.x <= 2 - R + 1e-6, 'thin wall holds ' + u.x);
    // 30° approach: keeps ≥ 80 % of the tangential speed
    const wall = [{minX: -10, maxX: 10, minZ: 1, maxZ: 1.6}];
    let s = {x: 0, z: 1 - R};
    const dir = {x: Math.cos(Math.PI / 6), z: Math.sin(Math.PI / 6)}, step = 0.05;
    const before = s.x;
    for (let i = 0; i < 20; i++) s = pure.strikeOpsResolveMove(s, {x: dir.x * step, z: dir.z * step}, wall, null, R, 0.1);
    assert.ok((s.x - before) / (20 * step * dir.x) >= 0.8, 'tangential speed kept ' + (s.x - before));
    near(s.z, 1 - R, 1e-6, 'stays in contact');
    // concave corner (an L): a diagonal push ends in contact; the opposite input frees it at once
    const L = [{minX: 1, maxX: 2, minZ: -3, maxZ: 1}, {minX: -3, maxX: 2, minZ: 1, maxZ: 2}];
    let c = {x: 0, z: 0};
    for (let i = 0; i < 30; i++) c = pure.strikeOpsResolveMove(c, {x: 0.08, z: 0.08}, L, null, R, 0.1);
    near(c.x, 1 - R, 1e-6); near(c.z, 1 - R, 1e-6);
    const back = pure.strikeOpsResolveMove(c, {x: -0.08, z: -0.08}, L, null, R, 0.1);
    assert.ok(back.x < c.x - 0.05 && back.z < c.z - 0.05, 'freed at once');
    // the clamp (fight box) stops exactly at its edge
    const fb = pure.strikeOpsPlaceFrame(C.zones[1]).fightBox;
    let e = {x: 3, z: 25};
    for (let i = 0; i < 100; i++) e = pure.strikeOpsResolveMove(e, {x: 0.1, z: 0.07}, pure.strikeOpsColliders(1, C), fb, R, 0.1);
    near(e.x, fb.maxX, 1e-9); near(e.z, fb.maxZ, 1e-9);
    // a capsule pushed off a circle (a barrel) slides around it
    const barrel = pure.strikeOpsResolveMove({x: -6.2, z: 5.6 - 0.35 - R - 0.01}, {x: 0, z: 0.5}, col, null, R, 0.1);
    assert.ok(Math.hypot(barrel.x + 6.2, barrel.z - 5.6) >= 0.35 + R - 1e-6, 'outside the barrel');
});

test('5 segment blocking and magnetism: one hittable clear candidate, never through cover, same radius', () => {
    const box = {minX: -1, maxX: 1, minY: 0, maxY: 1, minZ: 2, maxZ: 3};
    assert.strictEqual(pure.strikeOpsSegmentBlocked({x: 0, y: 0.5, z: 0}, {x: 0, y: 0.5, z: 5}, [box]), true);
    assert.strictEqual(pure.strikeOpsSegmentBlocked({x: 1, y: 0.5, z: 0}, {x: 1, y: 0.5, z: 5}, [box]), false, 'grazing');
    assert.strictEqual(pure.strikeOpsSegmentBlocked({x: 0, y: 1.6, z: 0}, {x: 0, y: 1.2, z: 5}, [box]), false, 'over the top');
    const pick = pure.strikeOpsPickMagnetTarget;
    assert.strictEqual(pick({x: 0, y: 0}, [{index: 0, x: 10, y: 0, hittable: true, clear: true}, {index: 1, x: 5, y: 0, hittable: true, clear: true}], 28), 1);
    assert.strictEqual(pick({x: 0, y: 0}, [{index: 0, x: 5, y: 0, hittable: false, clear: true}, {index: 1, x: 5, y: 0, hittable: true, clear: false}], 28), null);
    assert.strictEqual(pick({x: 0, y: 0}, [{index: 2, x: 4, y: 3, hittable: true, clear: true}, {index: 3, x: 4, y: 3, hittable: true, clear: true}], 28), 2, 'one of two overlapping copies');
    for (let i = 0; i < 4; i++) assert.strictEqual(pick({x: 0, y: 0}, [{index: i, x: 27, y: 0, hittable: true, clear: true}], 28), i, 'same radius for every index');
    assert.strictEqual(pure.strikeOpsPickMagnetTarget.length, 3, 'no correctness input');
});

// ---------------------------------------------------------------- 6. nameplate layout and bidi
test('6 nameplate layout: order kept, no overlap, inside the safe rect, tiers and markers only when needed', () => {
    let seed = 12345;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gap = C.nameplate.minGapPx;
    let counts = {one: 0, two: 0, marker: 0};
    for (let k = 0; k < 1000; k++) {
        const n = 1 + Math.floor(rnd() * 4);
        const width = 360 + rnd() * 1100, top = 60 + rnd() * 120, height = 260 + rnd() * 500;
        const safe = {left: 8, top, right: width - 8, bottom: top + height};
        const xs = Array.from({length: n}, () => -200 + rnd() * (width + 400)).sort((a, b) => a - b);
        const plates = xs.map(x => {
            const lines = 1 + Math.floor(rnd() * 3);
            return {x, y: top + 60 + rnd() * (height - 80), w: 50 + rnd() * 190, h: 14 + 22 * lines};
        });
        const out = pure.strikeOpsLayoutPlates(plates, safe, C);
        const pos = out.positions;
        assert.strictEqual(pos.length, n);
        for (let i = 0; i < n; i++) {
            const a = pos[i];
            assert.ok(a.left >= safe.left - 0.5 && a.left + a.w <= safe.right + 0.5 && a.top >= safe.top - 0.5 && a.top + a.h <= safe.bottom + 0.5, 'inside ' + k);
            if (i) assert.ok(a.left > pos[i - 1].left, 'order ' + k);
            for (let j = i + 1; j < n; j++) {
                const b = pos[j];
                const sepX = a.left + a.w + gap <= b.left + 0.02 || b.left + b.w + gap <= a.left + 0.02;
                const sepY = a.top + a.h + gap <= b.top + 0.02 || b.top + b.h + gap <= a.top + 0.02;
                assert.ok(sepX || sepY, 'no overlap ' + k);
            }
        }
        const one = pure.strikeOpsLayoutPlates(plates, safe, C, {oneTier: true});
        const two = pure.strikeOpsLayoutPlates(plates, safe, C, {forceCollapsed: false, preferTiers: true});
        if (out.collapsed) { counts.marker += 1; assert.ok(!one.fits && !two.fits, 'collapsed only when neither fits'); }
        else if (out.tiers === 2) { counts.two += 1; assert.ok(!one.fits, 'two tiers only when one cannot fit'); }
        else counts.one += 1;
    }
    assert.ok(counts.one && counts.two && counts.marker, JSON.stringify(counts));
});

test('6 bidi runs: the trailing ? stays with the Hebrew sentence, outside the isolate', () => {
    const runs = s => JSON.parse(JSON.stringify(pure.strikeOpsBidiRuns(s, 'rtl')));
    assert.deepStrictEqual(runs('מה פירוש המילה: apple?'), [{text: 'מה פירוש המילה: ', isolate: null}, {text: 'apple', isolate: 'ltr'}, {text: '?', isolate: null}]);
    assert.deepStrictEqual(runs('כמה זה 3+4?'), [{text: 'כמה זה ', isolate: null}, {text: '3+4', isolate: 'ltr'}, {text: '?', isolate: null}]);
    assert.strictEqual(pure.strikeOpsBidiRuns('שלום עולם', 'rtl').length, 1);
    assert.strictEqual(pure.strikeOpsBidiRuns('hello world', 'ltr').length, 1);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(pure.strikeOpsBidiRuns('I say שלום!', 'ltr'))), [{text: 'I say ', isolate: null}, {text: 'שלום', isolate: 'rtl'}, {text: '!', isolate: null}]);
    const html = pure.strikeOpsBidiRuns('<img src="a.png"> apple', 'rtl');
    assert.strictEqual(html.length, 1);
    assert.strictEqual(html[0].html, true);
});

test('6 learning markup sanitizer: engine render() shapes survive, handlers and scripts never do', () => {
    const safe = (s, mode) => pure.strikeOpsSafeHtml(s, mode);
    // engine render() output, as tester.js emits it
    const img = '<img class="field-image" src="./images/cat.png" alt="" loading="lazy">';
    assert.strictEqual(safe(img), '<img src="./images/cat.png" alt="" class="field-image" loading="lazy">');
    const audioBtn = `<button type="button" class="audio-prompt" onclick="audio('./sounds/letters/a.mp3')" aria-label="השמע"><i class="medium material-icons">play_circle_filled</i></button>`;
    assert.strictEqual(safe(audioBtn, 'question'), '<button type="button" class="audio-prompt" data-so-audio="./sounds/letters/a.mp3" aria-label="השמע"><i class="medium material-icons">play_circle_filled</i></button>');
    assert.strictEqual(safe(audioBtn, 'answer'), '<span class="so-opt-audio"><i class="medium material-icons">play_circle_filled</i></span>');
    const say = `<button type="button" class="audio-prompt audio-prompt-text" onclick="text_to_speech('let\\'s go')">let's go</button>`;
    assert.strictEqual(safe(say, 'question'), '<button type="button" class="audio-prompt audio-prompt-text" data-so-say="let&#39;s go">let\'s go</button>');
    assert.strictEqual(safe('<b>3</b>+<i>4</i><br>שלום &amp; hi'), '<b>3</b>+<i>4</i><br>שלום &amp; hi');
    // event handlers, script, styles, links and dangerous URLs are removed
    const out = [
        '<img src=x onerror="alert(1)">', '<img src="javascript:alert(1)" onload=alert(1)>', '<img src=" java\tscript:alert(1)">',
        '<script>alert(1)</script>after', '<svg onload=alert(1)><circle/></svg>', '<a href="javascript:alert(1)">x</a>',
        '<span style="background:url(javascript:alert(1))" onmouseover="alert(1)">x</span>', '<iframe src="https://e.com"></iframe>',
        `<button onclick="alert(1)">x</button>`, `<button onclick="audio('javascript:alert(1)')">x</button>`,
        `<button onclick="audio('a.mp3');alert(1)">x</button>`, '<img src="data:text/html,<script>alert(1)</script>">',
        '<img/src=x/onerror=alert(1)>', '<IMG SRC=x ONERROR=alert(1)>', '<<img src=x onerror=alert(1)>>', '<!--<img src=x onerror=alert(1)>-->',
        '<img src=x onerror=alert(1)', '"><img src=x onerror=alert(1)>',
    ].map(s => safe(s, 'question'));
    for (const s of out) {
        assert.ok(!/<[^>]*\son[a-z]+\s*=/i.test(s), 'handler kept: ' + s);
        assert.ok(!/<(script|svg|iframe|a|style)\b/i.test(s), 'tag kept: ' + s);
        assert.ok(!/(src|href)="\s*(javascript|data:text)/i.test(s), 'url kept: ' + s);
        assert.ok(!/\sstyle=/i.test(s), 'style kept: ' + s);
    }
    assert.strictEqual(out[0], '<img src="x" alt="">');
    assert.strictEqual(out[1], '');
    assert.strictEqual(out[3], 'after');
    assert.strictEqual(out[5], 'x');
    assert.strictEqual(out[8], '<button type="button" class="audio-prompt">x</button>');
    assert.strictEqual(out[9], '<button type="button" class="audio-prompt">x</button>');
    assert.strictEqual(out[10], '<button type="button" class="audio-prompt">x</button>');
    assert.strictEqual(out[16], '&lt;img src=x onerror=alert(1)');
    // plain text with < is text, and unbalanced tags are closed
    assert.strictEqual(safe('3 <5 and x<y'), '3 &lt;5 and x&lt;y');
    assert.strictEqual(safe('<b>open'), '<b>open</b>');
    assert.strictEqual(safe('a</b>c'), 'ac');
    assert.strictEqual(safe('<span class="x" dir="rtl" data-x="1">ok</span>'), '<span class="x" dir="rtl">ok</span>');
    assert.strictEqual(safe('<span class="a&quot; onclick=&quot;x">t</span>'), '<span>t</span>');
    // URL policy
    assert.strictEqual(pure.strikeOpsSafeUrl('./a.png', true), './a.png');
    assert.strictEqual(pure.strikeOpsSafeUrl('https://x.org/a.png', true), 'https://x.org/a.png');
    assert.ok(pure.strikeOpsSafeUrl('data:image/svg+xml,%3Csvg%3E', true));
    assert.strictEqual(pure.strikeOpsSafeUrl('data:image/png;base64,AAAA', false), '');
    assert.strictEqual(pure.strikeOpsSafeUrl('JaVaScRiPt:alert(1)', true), '');
    assert.strictEqual(pure.strikeOpsSafeUrl('vbscript:x', true), '');
});

test('6 nameplate pinning: enemies behind the camera pin to the side of their bearing; order kept', () => {
    const safe = {left: 8, top: 80, right: 1272, bottom: 600};
    // project() returns x = ±1e5 behind the camera (sign = the side of the bearing); the component sorts by x
    const plates = [{x: -1e5, y: 300, w: 120, h: 34}, {x: 500, y: 300, w: 120, h: 34}, {x: 700, y: 300, w: 120, h: 34}, {x: 1e5, y: 300, w: 120, h: 34}];
    const out = pure.strikeOpsLayoutPlates(plates, safe, C);
    assert.strictEqual(out.positions[0].pin, -1);
    assert.strictEqual(out.positions[3].pin, 1);
    for (let i = 1; i < 4; i++) assert.ok(out.positions[i].left > out.positions[i - 1].left, 'order kept');
});

// ---------------------------------------------------------------- 7. theme adapter
test('7 every themeOptions key resolves to a readable, centralized kit', () => {
    const ctx = loadGame();
    vm.runInContext(read('themes.js') + ';globalThis.themeOptions=themeOptions;', ctx);
    const keys = Object.keys(ctx.themeOptions);
    assert.deepStrictEqual(keys.slice().sort(), ['base', 'code', 'dark', 'soldiers', 'space', 'unicorn']);
    const sceneFields = ['skyTop', 'skyHorizon', 'haze', 'hazeNear', 'hazeFar', 'hemiSky', 'hemiGround', 'sunColor', 'sunIntensity', 'sunElevationDeg', 'ground', 'deck', 'shedSiding', 'shedTrim', 'coverTint', 'squadTints', 'bossTint', 'trimTint', 'visorEmissive', 'hologramTint', 'nightLights'];
    const cssFields = ['--so-primary', '--so-secondary', '--so-accent', '--so-text', '--so-panel', '--so-edge', '--so-plate', '--so-plate-text', '--so-banner-edge', '--so-correct', '--so-wrong', '--so-focus', '--so-enemy-dot', '--so-lane-0', '--so-lane-1', '--so-lane-2', '--so-lane-3'];
    keys.forEach(key => {
        const kit = ctx.resolveStrikeOpsTheme(key, ctx.themeOptions);
        assert.strictEqual(kit.key, key);
        sceneFields.forEach(f => assert.ok(kit.scene[f] !== undefined, key + ' scene.' + f));
        cssFields.forEach(f => assert.ok(kit.css[f], key + ' ' + f));
        assert.ok(ctx.strikeOpsContrast(kit.css['--so-plate-text'], kit.css['--so-plate']) >= 4.5, key + ' plate text');
        assert.ok(ctx.strikeOpsContrast(kit.css['--so-correct'], kit.css['--so-plate']) >= 3, key + ' correct');
        assert.strictEqual(kit.css['--so-wrong'], '#ffb020');
        kit.scene.squadTints.forEach((t, i) => {
            assert.ok(ctx.strikeOpsContrast(t, kit.scene.ground) >= 3, key + ' tint ' + i + ' vs ground');
            kit.scene.squadTints.forEach((u, j) => { if (j > i) assert.ok(ctx.strikeOpsDeltaE(t, u) >= 20, key + ' ΔE ' + i + '/' + j); });
        });
        assert.strictEqual(typeof kit.scene.hologramTint, 'string', 'one hologram tint for every copy');
    });
    assert.strictEqual(ctx.resolveStrikeOpsTheme('nope', ctx.themeOptions).key, 'base');
    const src = read('games/strike-ops.js');
    assert.ok(!/theme\s*===\s*'/.test(src) && !/soTheme\.key\s*===/.test(src), 'no theme-name branches');
});

// ---------------------------------------------------------------- 8. skeleton rebind and enemy model
function skinnedFixture(T) {
    const root = new T.Group();
    const hip = new T.Bone(); hip.name = 'hip';
    const arm = new T.Bone(); arm.name = 'arm'; arm.position.y = 1;
    hip.add(arm);
    const geo = new T.BoxGeometry(1, 2, 1, 1, 2, 1);
    const n = geo.attributes.position.count;
    geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(new Array(n * 4).fill(0), 4));
    geo.setAttribute('skinWeight', new T.Float32BufferAttribute(new Array(n).fill([1, 0, 0, 0]).flat(), 4));
    geo.addGroup(0, 18, 0); geo.addGroup(18, geo.index.count - 18, 1);
    const team = new T.MeshStandardMaterial({name: 'Team'}), trim = new T.MeshStandardMaterial({name: 'Trim'});
    const mesh = new T.SkinnedMesh(geo, team);
    const mesh2 = new T.SkinnedMesh(geo, trim);
    root.add(hip); root.add(mesh); root.add(mesh2);
    const skeleton = new T.Skeleton([hip, arm]);
    mesh.bind(skeleton); mesh2.bind(skeleton);
    return {root, hip, arm, mesh, geo, team, trim};
}

test('8 skinned clones get their own skeleton; geometry stays shared', () => {
    const ctx = loadGame({__three: true});
    const T = ctx.THREE;
    const f = skinnedFixture(T);
    const c = ctx.strikeOpsCloneSkinned(f.root, T);
    const cloneBones = new Set();
    c.root.traverse(o => { if (o.isBone) cloneBones.add(o); });
    c.skeletons.forEach(sk => sk.bones.forEach(b => { assert.ok(cloneBones.has(b), 'bone inside clone'); assert.ok(b !== f.hip && b !== f.arm, 'not a source bone'); }));
    let cm = null;
    c.root.traverse(o => { if (o.isSkinnedMesh && !cm) cm = o; });
    assert.strictEqual(cm.geometry, f.geo, 'geometry shared');
    assert.ok(cm.skeleton.boneInverses[0].equals(f.mesh.skeleton.boneInverses[0]) && cm.skeleton.boneInverses[0] !== f.mesh.skeleton.boneInverses[0]);
    cm.skeleton.bones[1].rotation.z = 1;
    assert.strictEqual(f.arm.rotation.z, 0, 'source untouched');
});

test('8 enemy model: role map with fallbacks, every material cloned per enemy, retire disposes clones only, retint keeps opacity', () => {
    const ctx = loadGame({__three: true});
    const T = ctx.THREE;
    const clip = name => new T.AnimationClip(name, 1, []);
    const anims = [clip('Stand'), clip('Stroll'), clip('Bang'), clip('Ouch'), clip('Fall')];
    const roles = ctx.strikeOpsResolveClipRoles(anims, {idle: 'Stand', move: 'Stroll', shoot: 'Bang', hit: 'Ouch', down: 'Fall', aim: null, crouch: 'Nope', run: null, cheer: null});
    assert.strictEqual(roles.idle.name, 'Stand');
    assert.strictEqual(roles.move.name, 'Stroll');
    assert.strictEqual(roles.down.name, 'Fall');
    assert.strictEqual(roles.aim.name, 'Stand', 'aim → idle');
    assert.strictEqual(roles.crouch.name, 'Stand', 'crouch → idle');
    assert.strictEqual(roles.run.name, 'Stroll', 'run → move');
    assert.strictEqual(roles.cheer.name, 'Stand');
    assert.strictEqual(ctx.strikeOpsResolveClipRoles([clip('Stand')], {idle: 'Stand', down: 'Gone'}).down, null, 'down → transform-only fall');

    const h = harness({ctx: {__three: true}});
    const g = h.g, so = g._so, HT = h.ctx.THREE;
    const f = skinnedFixture(HT);
    const disposed = [];
    [f.team, f.trim].forEach(m => { m.dispose = () => disposed.push(m.name + '-template'); });
    so.assets = {settled: true, enemy: {scene: f.root, clips: {idle: null}, scale: 1, primitives: 2, triangles: 10, lod: false, weaponBone: 'arm'}};
    so.scene = new HT.Scene();
    so.mats = {proc: new HT.MeshStandardMaterial({name: 'Team'}), procTrim: new HT.MeshStandardMaterial({name: 'Trim'})};
    g.create();
    const round = so.round;
    g.spawnRoundVisuals(round);
    const [a, b] = round.enemies;
    const matsA = a.vis.mats.map(r => r.mat), matsB = b.vis.mats.map(r => r.mat);
    assert.strictEqual(a.vis.mats.map(r => r.slot).sort().join(), 'Team,Trim');
    matsA.forEach(m => { assert.ok(matsB.indexOf(m) === -1, 'no shared material'); assert.ok(m !== f.team && m !== f.trim); });
    a.vis.mats.find(r => r.slot === 'Trim').mat.opacity = 0.2;
    assert.strictEqual(b.vis.mats.find(r => r.slot === 'Trim').mat.opacity, 1, "fading A's Trim leaves B");
    // theme re-tint of live clones keeps the current opacity
    g.soTheme = h.ctx.resolveStrikeOpsTheme('dark', {dark: {colors: {background: '#1C1C1C'}}, base: {colors: {}}});
    g.tintEnemy(a);
    assert.strictEqual(a.vis.mats.find(r => r.slot === 'Trim').mat.opacity, 0.2);
    // night themes apply the lane tint as its linear value (solid, saturated soldiers)
    const teamA = a.vis.mats.find(r => r.slot === 'Team');
    assert.strictEqual(teamA.linear, true);
    assert.ok(teamA.mat.color.equals(new HT.Color(g.soTheme.scene.squadTints[a.index]).convertSRGBToLinear()), 'linear lane tint');
    assert.strictEqual(a.vis.mats.find(r => r.slot === 'Trim').mat.emissiveIntensity, g.soTheme.scene.visorGlow, 'night visor glows faintly');
    assert.ok(g.soTheme.scene.visorGlow < 0.35, 'below the copies’ hologram pulse');
    assert.ok(teamA.mat.emissive.equals(teamA.mat.color), 'the uniform glows in its own hue, never the hologram tint');
    assert.strictEqual(teamA.mat.emissiveIntensity, g.soTheme.scene.squadGlow);
    g.soTheme = h.ctx.resolveStrikeOpsTheme('base', {base: {colors: {}}});
    g.tintEnemy(a);
    assert.strictEqual(teamA.linear, false);
    assert.strictEqual('#' + teamA.mat.color.getHexString(), g.soTheme.scene.squadTints[a.index], 'day themes keep the tint as authored');
    assert.strictEqual(teamA.mat.emissive.getHex(), 0, 'no day glow');
    const skDispose = HT.Skeleton.prototype.dispose;
    let skeletons = 0;
    HT.Skeleton.prototype.dispose = function () { skeletons += 1; return skDispose.call(this); };
    const cloneDisposed = [];
    round.enemies.forEach(e => e.vis.mats.forEach(r => { const d = r.mat.dispose.bind(r.mat); r.mat.dispose = () => { cloneDisposed.push(r.mat); d(); }; }));
    g.retireRound(round);
    HT.Skeleton.prototype.dispose = skDispose;
    assert.strictEqual(cloneDisposed.length, round.enemies.length * 2, 'every clone disposed');
    assert.strictEqual(skeletons, round.enemies.length * 2, 'rebound skeletons disposed');
    assert.strictEqual(disposed.length, 0, 'template materials never disposed');
    assert.ok(round.enemies.every(e => !e.vis) && round.visual === null && so.rounds.indexOf(round) === -1);
});

// ---------------------------------------------------------------- 9. learning lifecycle
test('9 correct: -1 once, score, reload, save, then a correct timer; duplicates rejected', () => {
    const h = harness();
    const g = engage(h);
    h.calls.length = 0;
    assert.strictEqual(g.answer(correctIndex(g)), true);
    assert.deepStrictEqual(h.calls.map(c => c[0]), ['success', 'weight', 'reload', 'save']);
    assert.deepStrictEqual(weights(h.calls)[0].slice(3), [-1]);
    assert.strictEqual(g.score, 1);
    assert.strictEqual(g.phase, 'correct');
    assert.strictEqual(g.getPhaseTimers()[0].expectPhase, 'correct');
    assert.strictEqual(g.answer(correctIndex(g)), false);
    assert.strictEqual(weights(h.calls).length, 1);
});

test('9 wrong: +1 once, floor 0, same question/options/token/kind; unlock only by the timer', () => {
    const h = harness();
    const g = engage(h);
    const before = [g.question.question, g.options.join(), g.questionToken, g.roundKind];
    h.calls.length = 0;
    assert.strictEqual(g.answer(wrongIndex(g)), true);
    assert.deepStrictEqual(weights(h.calls).map(c => c[3]), [1]);
    assert.strictEqual(g.score, 0);
    assert.ok(h.calls.some(c => c[0] === 'save'));
    assert.strictEqual(g.phase, 'wrong');
    assert.strictEqual(g.answer(correctIndex(g)), false);
    h.clock.advance(C.timing.retryLockMs - 1);
    assert.strictEqual(g.phase, 'wrong');
    h.clock.advance(1);
    assert.strictEqual(g.phase, 'engaging');
    assert.deepStrictEqual([g.question.question, g.options.join(), g.questionToken, g.roundKind], before);
});

test('9 boss round: one report per decoy hit, dissolve cancelled and re-formed at unlock, real copy reports -1 once', () => {
    const h = harness();
    const g = h.g;
    g.create();
    g.setPhase('briefing');
    assert.strictEqual(g.forceBossRound(), true);
    assert.strictEqual(g.roundKind, 'boss');
    g.start(null);
    h.clock.advance(C.timing.approachMs);
    const w = wrongIndex(g), c = correctIndex(g);
    h.calls.length = 0;
    assert.strictEqual(g.answer(w), true);
    assert.strictEqual(g._so.round.enemies[w].dissolved, true);
    assert.strictEqual(g.answer(w), false);
    assert.strictEqual(g.answer(c), false);
    assert.deepStrictEqual(weights(h.calls).map(x => x[3]), [1]);
    assert.strictEqual(g.enemyInfo(g._so.round.enemies[w]).hittable, false);
    h.clock.advance(C.timing.retryLockMs);
    const e = g._so.round.enemies[w];
    assert.strictEqual(e.dissolved, false, 'leftover dissolve cancelled');
    assert.ok(e.reformAt > 0, 're-form started');
    assert.strictEqual(g.enemyInfo(e).hittable, true, 'answerable at once');
    assert.strictEqual(g.answer(c), true);
    assert.deepStrictEqual(weights(h.calls).map(x => x[3]), [1, -1]);
    h.clock.advance(C.timing.correctToTransitionMs);
    assert.strictEqual(g.phase, 'regroup', 'a forced boss in round 1 still regroups');
});

test('9 transitions: regroup ×3, roaming after places 1–3 (GL: no timer, DOM: one advanceMs timer), the lap wrap after the plaza', () => {
    ['gl', 'dom'].forEach(mode => {
        const h = harness();
        const g = h.g;
        g.renderMode = mode;
        engage(h);
        const seen = [];
        for (let place = 0; place < 4; place++) {
            for (let k = 0; k < 4; k++) {
                const n = g.roundNumber, gen = h.generated();
                let atCreate = null;
                const create = g.create;
                g.create = () => { atCreate = [g.roundNumber, g.roundInZone, g.phase]; create(); };
                g.answer(correctIndex(g));
                h.clock.advance(C.timing.correctToTransitionMs);
                g.create = create;
                assert.strictEqual(atCreate[0], n + 1, 'counter advanced before create');
                assert.strictEqual(h.generated(), gen + 1, 'the next question is generated at transition start');
                seen.push(g.phase);
                assert.strictEqual(g.attemptLocked, true);
                const timers = g.getPhaseTimers();
                if (g.phase === 'roaming') {
                    assert.strictEqual(g._so.mapZoneIndex, place + 1, 'committed after create');
                    if (mode === 'gl') {
                        assert.strictEqual(timers.length, 0, 'GL roaming has no learning timer');
                        h.clock.advance(30000);
                        assert.strictEqual(g.phase, 'roaming');
                        assert.strictEqual(g.skipTransition(), true);
                    } else {
                        assert.strictEqual(timers.length, 1);
                        assert.strictEqual(timers[0].expectPhase, 'roaming');
                        assert.strictEqual(timers[0].remaining, C.timing.advanceMs);
                        h.clock.advance(C.timing.advanceMs);
                    }
                    assert.strictEqual(g.phase, 'deploying');
                    assert.strictEqual(h.generated(), gen + 1, 'entering the encounter generates nothing');
                    h.clock.advance(C.timing.approachMs);
                } else {
                    assert.strictEqual(timers[0].remaining, g.phase === 'regroup' ? C.timing.regroupMs : C.timing.advanceMs);
                    assert.ok(g.getTransition() && g.getTransition().to.roundNumber === n + 1);
                    h.clock.advance(timers[0].remaining);
                }
                assert.strictEqual(g.phase, 'engaging');
                assert.strictEqual(g.getTransition(), null);
            }
        }
        assert.deepStrictEqual(seen, ['regroup', 'regroup', 'regroup', 'roaming', 'regroup', 'regroup', 'regroup', 'roaming',
            'regroup', 'regroup', 'regroup', 'roaming', 'regroup', 'regroup', 'regroup', 'advancing'], mode);
        assert.deepStrictEqual([g.zoneIndex, g.lap, g.stars, g._so.mapZoneIndex, g.counterText], [0, 2, 0, 0, 'סבב 2 · שאלה 1/16'], mode);
        assert.ok(Math.abs(g._so.player.x - C.map.start.x) < 1e-9 && Math.abs(g._so.player.z - C.map.start.z) < 1e-9, 'back at the start');
        assert.strictEqual(h.raf(), 0, 'RAF never needed');
    });
});

test('9 encounter entry: the trigger calls enterEncounter once, only in roaming and only for the target place', () => {
    const h = harness();
    const g = engage(h);
    // outside roaming a trigger does nothing
    assert.strictEqual(g.checkTrigger(), false);
    assert.strictEqual(g.enterEncounter(), false);
    clearPlace(h);
    assert.strictEqual(g.phase, 'roaming');
    const gen = h.generated(), reloads = h.calls.filter(c => c[0] === 'reload').length, token = g.questionToken;
    // the yard (a cleared place) is not the trigger: teleporting there does not start anything
    const back = g.teleport('yard');
    assert.ok(back.ok && back.triggered === false && g.phase === 'roaming');
    const r = g.teleport('containers');
    assert.ok(r.ok && r.triggered, JSON.stringify(r));
    assert.strictEqual(g.phase, 'deploying');
    assert.strictEqual(g.teleport('containers').triggered, false, 'a second trigger is a no-op');
    assert.strictEqual(g.checkTrigger(), false);
    assert.strictEqual(g.getPhaseTimers().filter(t => t.expectPhase === 'deploying').length, 1, 'one deploying timer');
    assert.strictEqual(h.generated(), gen);
    assert.strictEqual(h.calls.filter(c => c[0] === 'reload').length, reloads);
    assert.strictEqual(g.attemptLocked, true);
    h.clock.advance(C.timing.approachMs);
    assert.deepStrictEqual([g.phase, g.zoneId, g.zoneNumber, g.questionToken, g.attemptLocked], ['engaging', 'containers', 2, token, false]);
    // the centre-view assist ended on the anchor facing the heading
    const p = g.getPlayer();
    near(p.x, 3, 1e-9); near(p.z, 25, 1e-9); near(p.headingDeg, 90, 1e-9);
});

test('9 completion while roaming: no commit, no gate, no guidance; debug calls do nothing', () => {
    const h = harness();
    const g = engage(h);
    for (let k = 0; k < 3; k++) { g.answer(correctIndex(g)); h.clock.advance(C.timing.correctToTransitionMs + C.timing.regroupMs); }
    assert.strictEqual(g.roundInZone, 3);
    // the create() inside the place-clearing beginTransition routes away
    h.setReload([true, true, false]);
    let chimes = 0;
    g.synth = kind => { if (kind === 'chime') chimes += 1; };
    g.answer(correctIndex(g));
    h.clock.advance(C.timing.correctToTransitionMs);
    assert.strictEqual(g._so.navigated, true);
    assert.strictEqual(g._so.mapZoneIndex, 0, 'not committed');
    assert.strictEqual(g.getMap().gates.find(x => x.id === 'g1').open, false);
    assert.strictEqual(chimes, 0);
    assert.strictEqual(g.getPhaseTimers().length, 0);
    const w = weights(h.calls).length;
    assert.strictEqual(g.teleport('containers').ok, false);
    assert.strictEqual(g.walkTo('containers'), false);
    assert.strictEqual(g.skipTransition(), false);
    assert.strictEqual(g.skipToZone(2), false);
    assert.strictEqual(g.answer(0), false);
    assert.strictEqual(g.setMoveInput({x: 0, z: 1}), false);
    assert.strictEqual(weights(h.calls).length, w);
    // answer-time completion: no transition at all
    const h2 = harness();
    const g2 = engage(h2);
    h2.setReload([false]);
    g2.answer(correctIndex(g2));
    assert.strictEqual(g2.phase, 'engaging');
    h2.clock.advance(5000);
    assert.strictEqual(g2.phase, 'engaging');
    assert.strictEqual(g2._so.mapZoneIndex, 0);
});

test('9 lap pose: applyLapPose from the step, arriveRound and a rebuild moves the player and closes the gates exactly once', () => {
    const run = order => {
        const h = harness();
        const g = engage(h);
        for (let place = 0; place < 3; place++) { clearPlace(h); g.skipTransition(); h.clock.advance(C.timing.approachMs); }
        clearPlace(h);
        assert.strictEqual(g.phase, 'advancing');
        assert.strictEqual(g._so.mapZoneIndex, 3, 'gates stay open until the lap pose');
        g._so.player.x = 1.5; g._so.player.z = 50;
        let applied = 0;
        const orig = g.commitMapZone;
        g.commitMapZone = (k, a) => { applied += 1; orig(k, a); };
        order.forEach(step => {
            if (step === 'step') { h.clock.advance(C.timing.advanceMs / 2); g.applyLapPose(); }
            if (step === 'rebuild') g.applyLapPose();
            if (step === 'arrive') h.clock.advance(C.timing.advanceMs);
        });
        h.clock.advance(C.timing.advanceMs);
        assert.strictEqual(g.phase, 'engaging');
        assert.strictEqual(applied, 1, order.join());
        assert.deepStrictEqual([g._so.player.x, g._so.player.z, g._so.mapZoneIndex, g.stars], [0, 1, 0, 0]);
        assert.ok(g.getMap().gates.every(x => !x.open));
    };
    [['step', 'arrive'], ['rebuild', 'step', 'arrive'], ['arrive'], ['step', 'rebuild', 'arrive']].forEach(run);
});

test('9 suspension: pause and loss release held input; the autopilot survives pause, not loss', () => {
    ['pause', 'lost'].forEach(kind => {
        const h = harness();
        const g = engage(h);
        clearPlace(h);
        const so = g._so;
        so.stick = {x: 0.4, y: -0.9, id: 7};
        so.look = {id: 8, x: 0, y: 0, sx: 0, sy: 0, moved: 20};
        so.vel.x = 2; so.vel.z = 1;
        so.keys.add('KeyW');
        g.setMoveInput({x: 0, z: 1});
        assert.strictEqual(g.walkTo('containers'), true);
        assert.strictEqual(g.autopilot, true);
        if (kind === 'pause') g.pause('button'); else g.onContextLost();
        assert.deepStrictEqual([so.stick.x, so.stick.y, so.stick.id, so.look, so.vel.x, so.vel.z, so.moveInput, so.keys.size], [0, 0, null, null, 0, 0, null, 0]);
        assert.strictEqual(g.autopilot, kind === 'pause', 'autopilot ' + kind);
        // late events of the forgotten pointer ids are ignored
        g.onStickMove({pointerId: 7, clientX: 0, clientY: 0});
        g.onHostPointerUp({pointerId: 8, type: 'pointerup'});
        assert.deepStrictEqual([so.stick.x, so.stick.y], [0, 0]);
        if (kind === 'pause') {
            g.resume();
            assert.strictEqual(g.phase, 'roaming');
            assert.strictEqual(g.autopilot, true, 'the autopilot resumes walking');
            assert.strictEqual(g.getPhaseTimers().length, 0);
        }
    });
});

test('9 engine navigation stops all further work', () => {
    const h = harness();
    const g = engage(h);
    h.setReload([false]);
    assert.strictEqual(g.answer(correctIndex(g)), true);
    assert.strictEqual(g._so.navigated, true);
    assert.strictEqual(g.getPhaseTimers().length, 0, 'no phase timer');
    assert.ok(!h.calls.some(c => c[0] === 'save'), 'score not saved when routing away');
});

test('9 answers outside engaging or with a stale token are rejected with no side effect', () => {
    const h = harness();
    const g = h.g;
    g.create();
    g.setPhase('briefing');
    h.calls.length = 0;
    assert.strictEqual(g.answer(0), false);
    engage(h);
    h.calls.length = 0;
    const lock = g.attemptLocked;
    assert.strictEqual(g.answer(correctIndex(g), g.questionToken - 1), false);
    assert.deepStrictEqual(h.calls, []);
    assert.strictEqual(g.attemptLocked, lock);
    assert.strictEqual(g.answer(correctIndex(g), g.questionToken), true);
});

test('9 startup guard: a discarded redirect stops create(); mounted() allocates nothing after navigation', () => {
    const h = harness({reloadResults: [false]});
    h.g.create();
    assert.strictEqual(h.generated(), 0);
    assert.strictEqual(h.g._so.navigated, true);
    let listened = 0;
    h.g.listen = () => { listened += 1; };
    h.g.initScene = () => { throw new Error('must not allocate'); };
    h.comp.mounted.call(h.g);
    assert.strictEqual(listened, 0);
    assert.strictEqual(h.raf(), 0);
});

test('9 create() before mount touches neither DOM nor THREE', () => {
    const h = harness({ctx: {document: new Proxy({}, {get: () => { throw new Error('DOM touched'); }}), THREE: new Proxy({}, {get: () => { throw new Error('THREE touched'); }})}});
    h.g.create();
    assert.ok(h.g.question && h.g.options.length === 4 && h.g._so.round.enemies.length === 4);
});

test('9 pause race: wrong, correct, regroup, advancing and deploying timers freeze and resume exactly once; GL roaming keeps none', () => {
    ['deploying', 'wrong', 'correct', 'regroup', 'advancing'].forEach(target => {
        const h = harness();
        const g = h.g;
        g.create();
        g.setPhase('briefing');
        g.start(null);
        if (target !== 'deploying') {
            h.clock.advance(C.timing.approachMs);
            if (target === 'advancing') {
                for (let p = 0; p < 3; p++) { clearPlace(h); g.skipTransition(); h.clock.advance(C.timing.approachMs); }
                for (let k = 0; k < 3; k++) { g.answer(correctIndex(g)); h.clock.advance(C.timing.correctToTransitionMs + C.timing.regroupMs); }
            }
            if (target === 'wrong') g.answer(wrongIndex(g));
            else g.answer(correctIndex(g));
            if (target === 'regroup' || target === 'advancing') h.clock.advance(C.timing.correctToTransitionMs);
        }
        assert.strictEqual(g.phase, target);
        const total = g.getPhaseTimers()[0].remaining;
        h.clock.advance(200);
        g.pause('button');
        assert.strictEqual(g.phase, 'paused');
        const frozen = g.getPhaseTimers()[0];
        assert.strictEqual(frozen.pending, false);
        assert.strictEqual(frozen.remaining, total - 200);
        const counters = [g.roundNumber, g.zoneNumber];
        h.clock.advance(10000);
        assert.strictEqual(g.phase, 'paused');
        g.resume();
        assert.strictEqual(g.phase, target);
        h.clock.advance(frozen.remaining - 1);
        assert.strictEqual(g.phase, target);
        h.clock.advance(1);
        assert.strictEqual(g.phase, target === 'correct' ? 'regroup' : 'engaging', target);
        if (target !== 'correct') assert.deepStrictEqual([g.roundNumber, g.zoneNumber], counters, 'arrival does not advance counters');
    });
    // GL roaming: no timer, resumes into roaming, a forced trigger while paused does nothing
    const h = harness();
    const g = engage(h);
    clearPlace(h);
    g.pause('button');
    assert.strictEqual(g.getPhaseTimers().length, 0);
    const f = h.ctx.strikeOpsPlaceFrame(C.zones[1]);
    g._so.player.x = f.anchor.x; g._so.player.z = f.anchor.z;
    assert.strictEqual(g.checkTrigger(), false);
    assert.strictEqual(g.skipTransition(), false);
    h.clock.advance(5000);
    g.resume();
    assert.strictEqual(g.phase, 'roaming');
    // a timer whose expected phase no longer matches, or whose token is stale, is a no-op
    const h2 = harness();
    const g2 = engage(h2);
    g2.answer(wrongIndex(g2));
    g2.phase = 'briefing';
    h2.clock.advance(1000);
    assert.strictEqual(g2.phase, 'briefing');
});

test('9 DOM-only and rendering-off paths complete the loop (roaming and the lap wrap included) on timers alone', () => {
    const h = harness();
    const g = h.g;
    g.renderMode = 'dom';
    g.create();
    g.setPhase('briefing');
    g.start(null);
    assert.strictEqual(g.phase, 'deploying');
    h.clock.advance(C.timing.approachMs);
    assert.strictEqual(g.phase, 'engaging');
    const phases = [];
    for (let k = 0; k < 16; k++) {
        g.onChip(correctIndex(g));
        assert.strictEqual(g.phase, 'correct');
        h.clock.advance(C.timing.correctToTransitionMs);
        phases.push(g.phase);
        if (g.phase === 'roaming') { h.clock.advance(C.timing.advanceMs); assert.strictEqual(g.phase, 'deploying'); h.clock.advance(C.timing.approachMs); }
        else h.clock.advance(g.phase === 'advancing' ? C.timing.advanceMs : C.timing.regroupMs);
        assert.strictEqual(g.phase, 'engaging');
    }
    assert.deepStrictEqual(phases.filter(p => p !== 'regroup'), ['roaming', 'roaming', 'roaming', 'advancing']);
    assert.strictEqual(h.raf(), 0, 'RAF never called');
});

test('9 DOM continuation and failed restart never reopen an accepted answer', () => {
    ['deploying', 'engaging', 'wrong', 'correct', 'regroup', 'roaming', 'advancing', 'paused'].forEach(state => ['dom', 'restart'].forEach(mode => {
        const h = harness();
        const g = h.g;
        g.create();
        g.setPhase('briefing');
        g.start(null);
        if (state !== 'deploying') h.clock.advance(C.timing.approachMs);
        if (state === 'wrong') g.answer(wrongIndex(g));
        if (state === 'roaming') clearPlace(h);
        if (['correct', 'regroup', 'advancing', 'paused'].indexOf(state) !== -1) {
            if (state === 'advancing') {
                for (let p = 0; p < 3; p++) { clearPlace(h); g.skipTransition(); h.clock.advance(C.timing.approachMs); }
                for (let k = 0; k < 3; k++) { g.answer(correctIndex(g)); h.clock.advance(C.timing.correctToTransitionMs + C.timing.regroupMs); }
            }
            g.answer(correctIndex(g));
            if (state !== 'correct') h.clock.advance(C.timing.correctToTransitionMs);
        }
        if (state === 'paused') g.pause('button');
        h.clock.advance(100);
        const snap = [g.attemptLocked, g.questionToken, g.roundNumber, g.zoneNumber, g.wrongOption];
        const pending = g.getPhaseTimers()[0];
        const actions = () => h.calls.filter(c => c[0] === 'action').length;
        const actionsBefore = actions();
        g.onContextLost();
        assert.strictEqual(g.phase, 'lost');
        h.clock.advance(5000);
        assert.strictEqual(g.phase, 'lost');
        if (mode === 'dom') g.continueInDom(); else g.restartInPlace();
        assert.strictEqual(g.renderMode, 'dom');
        assert.deepStrictEqual([g.attemptLocked, g.questionToken, g.roundNumber, g.zoneNumber, g.wrongOption], snap, state + '/' + mode);
        const expected = pending ? pending.expectPhase : (state === 'roaming' ? 'roaming' : 'engaging');
        assert.strictEqual(g.phase, expected, state + '/' + mode + ' resume target');
        if (state === 'roaming') {
            const t = g.getPhaseTimers();
            assert.strictEqual(t.length, 1, 'one DOM roaming timer');
            assert.strictEqual(t[0].expectPhase, 'roaming');
        }
        if (expected !== 'engaging') {
            const w = weights(h.calls).length;
            assert.strictEqual(g.answer(correctIndex(g)), false);
            assert.strictEqual(weights(h.calls).length, w);
            const next = g.getPhaseTimers()[0];
            h.clock.advance(next.remaining);
            assert.notStrictEqual(g.phase, expected, 'pending timer fired once');
        }
        assert.ok(actions() - actionsBefore <= 1, 'action at most once per token');
    }));
});

test('9 restart in place keeps run, timers, question, the roaming pose and gates; the lap pose lands once', () => {
    const restart = g => {
        g.onContextLost();
        let loaded = 0;
        g.initScene = () => true;
        g.loadAssets = () => { loaded += 1; };
        g.applyQuality = () => {};
        g.startLoop = () => {};
        assert.strictEqual(g.restartInPlace(), true);
        assert.strictEqual(g.phase, 'loading');
        assert.strictEqual(loaded, 1);
        g.finishRestore();
    };
    // roaming: pose, open gates and target unchanged
    const h1 = harness();
    const g1 = engage(h1);
    clearPlace(h1);
    g1._so.player.x = 1.2; g1._so.player.z = 16; g1._so.player.yaw = 0.3;
    const pose = JSON.stringify(g1._so.player), gates = JSON.stringify(g1.getMap().gates.map(x => x.open));
    restart(g1);
    assert.strictEqual(g1.phase, 'roaming');
    assert.strictEqual(JSON.stringify(g1._so.player), pose);
    assert.strictEqual(JSON.stringify(g1.getMap().gates.map(x => x.open)), gates);
    assert.strictEqual(g1.zoneId, 'containers');
    // advancing at 40 %
    const h = harness();
    const g = engage(h);
    for (let p = 0; p < 3; p++) { clearPlace(h); g.skipTransition(); h.clock.advance(C.timing.approachMs); }
    clearPlace(h);
    assert.strictEqual(g.phase, 'advancing');
    h.clock.advance(C.timing.advanceMs * 0.4);
    const snapshot = g.getTransition();
    const run = g._so.run, token = g.questionToken, generated = h.generated();
    const stamp = Array.from(g._so.phaseTimers)[0];
    restart(g);
    assert.strictEqual(g.phase, 'advancing');
    assert.ok(!h.calls.some(c => c[0] === 'replace' || c[0] === 'push'), 'no router call');
    assert.strictEqual(g._so.run, run);
    assert.strictEqual(g.questionToken, token);
    assert.strictEqual(h.generated(), generated);
    assert.strictEqual(Array.from(g._so.phaseTimers)[0], stamp, 'same timer, not re-stamped');
    assert.deepStrictEqual(g.getTransition(), snapshot);
    h.clock.advance(C.timing.advanceMs);
    assert.strictEqual(g.phase, 'engaging');
    assert.deepStrictEqual([g._so.player.x, g._so.player.z, g._so.mapZoneIndex], [0, 1, 0], 'at the start, every gate closed');
    assert.strictEqual(h.generated(), generated, 'arrival generates nothing');
});

test('6 text scale is cached at measure time: frame-time reads do no computed-style lookup', () => {
    let reads = 0;
    const h = harness({ctx: {getComputedStyle: () => { reads += 1; return {fontSize: '24px', lineHeight: '30px'}; }}});
    const g = engage(h);
    h.ctx.document = {documentElement: {style: {}}};
    assert.strictEqual(g.readTextScale(), 1.5);
    reads = 0;
    for (let k = 0; k < 5; k += 1) assert.strictEqual(g.textScale(), 1.5);
    assert.strictEqual(reads, 0, 'cached');
    h.ctx.getComputedStyle = () => { reads += 1; return {fontSize: '16px'}; };
    assert.strictEqual(g.readTextScale(), 1);
    assert.strictEqual(g.textScale(), 1);
});

test('6 answer layout: row, stacked, and the two-column grid only in a short landscape at normal text size', () => {
    const ctx = loadGame(), L = ctx.strikeOpsAnswersLayout;
    const land = {n: 4, portrait: false, lowHeight: true, textScale: 1};
    assert.strictEqual(L(false, land), 'row');
    assert.strictEqual(L(true, land), 'grid');
    assert.strictEqual(L(true, Object.assign({}, land, {textScale: 2})), 'stacked', 'enlarged text stacks');
    assert.strictEqual(L(true, Object.assign({}, land, {portrait: true, lowHeight: false})), 'stacked', 'portrait stacks');
    assert.strictEqual(L(true, Object.assign({}, land, {lowHeight: false})), 'stacked', 'tall landscape stacks');
    assert.strictEqual(L(true, Object.assign({}, land, {n: 2})), 'stacked');
    // narrow portrait (≤ 400 px) or a row that would break a word: 2x2 when every chip fits a cell whole
    const port = {n: 4, portrait: true, lowHeight: false, textScale: 1};
    assert.strictEqual(L(false, Object.assign({}, port, {narrow: true, gridFits: true})), 'grid', 'narrow portrait uses 2x2');
    assert.strictEqual(L(true, Object.assign({}, port, {gridFits: true})), 'grid', 'row would break a word: 2x2');
    assert.strictEqual(L(false, Object.assign({}, port, {gridFits: true})), 'row', 'wide portrait keeps a fitting row');
    assert.strictEqual(L(true, Object.assign({}, port, {narrow: true, gridFits: false})), 'stacked', 'too long for a cell stacks');
    assert.strictEqual(L(false, Object.assign({}, port, {narrow: true, gridFits: false})), 'row');
    assert.strictEqual(L(true, Object.assign({}, port, {narrow: true, gridFits: true, textScale: 2})), 'stacked', 'enlarged text stacks');
});

test('6 desktop key hint is an RTL line whose keys are LTR isolates placed before their own actions', () => {
    const h = harness();
    const m = /<p v-if="keyHint" class="so-keyhint"([^>]*)>([\s\S]*?)<\/p>/.exec(h.comp.template);
    assert.ok(m, 'key hint markup');
    assert.ok(/dir="rtl"/.test(m[1]), 'the hint is RTL (not the HUD\'s LTR)');
    const pairs = m[2].split(' · ').map(s => s.replace(/<[^>]+>/g, ''));
    assert.deepStrictEqual(pairs, ['עכבר: כיוון', 'לחיצה: ירי', 'R: טעינה', '1–4: נעילה']);
    assert.strictEqual((m[2].match(/<kbd dir="ltr">/g) || []).length, 2, 'R and 1–4 are LTR isolates');
});

test('7 night sky: stars are scene points toggled by the theme, never pixels on the stretched gradient', () => {
    const h = harness(), g = h.g;
    const rects = [];
    const fakeCtx = {createLinearGradient: () => ({addColorStop: () => {}}), fillRect: (...a) => rects.push(a)};
    g._so.skyCanvas = {getContext: () => fakeCtx};
    g._so.stars = {visible: false};
    const night = h.ctx.resolveStrikeOpsTheme('space', {space: {colors: {}}}).scene;
    g.drawSky(night);
    assert.deepStrictEqual(rects, [[0, 0, 4, 256]], 'only the gradient is painted');
    assert.strictEqual(g._so.stars.visible, true);
    g.drawSky(h.ctx.resolveStrikeOpsTheme('base', {base: {colors: {}}}).scene);
    assert.strictEqual(g._so.stars.visible, false);
});

test('5 regroup: the centre-view assist recentres the next squad; a resting cursor no longer edge-pans', () => {
    const h = harness();
    const g = engage(h), so = g._so;
    const f = h.ctx.strikeOpsPlaceFrame(C.zones[g.zoneIndex]);
    so.player.yaw = f.heading + 0.9;                          // looked far to one side
    so.cursor = {x: so.view.w - 2, y: so.view.h / 2}; so.cursorArmed = true;
    const yaw0 = so.player.yaw;
    g.edgePan(100);
    assert.ok(so.player.yaw !== yaw0, 'an armed cursor in the band pans while engaging');
    g.answer(correctIndex(g));
    const yaw1 = so.player.yaw;
    g.edgePan(100);
    assert.strictEqual(so.player.yaw, yaw1, 'no edge-pan outside engaging/roaming');
    h.clock.advance(C.timing.correctToTransitionMs);
    assert.strictEqual(g.phase, 'regroup');
    assert.ok(so.assist, 'assist started for the regroup');
    assert.strictEqual(so.cursorArmed, false);
    h.clock.advance(C.timing.regroupMs);
    assert.strictEqual(g.phase, 'engaging');
    near(so.player.yaw, f.heading, 1e-9); near(so.player.x, f.anchor.x, 1e-9); near(so.player.z, f.anchor.z, 1e-9);
    const yaw2 = so.player.yaw;
    g.edgePan(100);
    assert.strictEqual(so.player.yaw, yaw2, 'the resting cursor must move to re-arm');
    g.onHostPointerMove({pointerType: 'mouse', pointerId: 1, clientX: so.view.w - 30, clientY: so.view.h / 2});
    g.edgePan(100);
    assert.ok(so.player.yaw !== yaw2, 're-armed by a real move');
});

test('9 restart in place completing while the tab is hidden stays paused until an explicit resume', () => {
    const h = harness();
    const g = engage(h);
    for (let p = 0; p < 3; p++) { clearPlace(h); g.skipTransition(); h.clock.advance(C.timing.approachMs); }
    clearPlace(h);
    assert.strictEqual(g.phase, 'advancing');
    h.clock.advance(C.timing.advanceMs * 0.4);
    g.onContextLost();
    g.initScene = () => true;
    g.loadAssets = () => {};
    g.applyQuality = () => {};
    let loops = 0;
    g.startLoop = () => { loops += 1; };
    assert.strictEqual(g.restartInPlace(), true);
    const remaining = g.getPhaseTimers()[0].remaining;
    h.ctx.document = {hidden: true};                       // hidden during the reload
    g.finishRestore();
    assert.strictEqual(g.phase, 'paused');
    assert.ok(g.getPhaseTimers().every(t => !t.pending), 'learning timers stay frozen');
    h.clock.advance(C.timing.advanceMs * 2);
    assert.strictEqual(g.phase, 'paused', 'nothing advanced while hidden');
    assert.strictEqual(g.getPhaseTimers()[0].remaining, remaining);
    h.ctx.document = {hidden: false};
    const before = loops;
    assert.strictEqual(g.resume(), true);
    assert.strictEqual(g.phase, 'advancing');
    assert.ok(loops > before, 'loop restarted on resume');
    assert.ok(g.getPhaseTimers().some(t => t.pending));
    h.clock.advance(C.timing.advanceMs);
    assert.strictEqual(g.phase, 'engaging');
});

test('9 graphics generation: late loads are disposed; loss clears cosmetic timers and suspends audio', () => {
    const pending = [];
    const disposed = [];
    const fakeScene = () => ({traverse: fn => fn({geometry: {dispose: () => disposed.push('geo')}, material: {dispose: () => disposed.push('mat')}})});
    const THREE = {
        GLTFLoader: function () { this.load = (url, ok) => pending.push({url, ok}); this.parse = () => {}; },
        TextureLoader: function () { this.load = (url, ok) => pending.push({url, ok, tex: true}); },
        sRGBEncoding: 3001,
    };
    const h = harness({ctx: {THREE}});
    const g = engage(h);
    let suspended = 0;
    g._so.audio = {state: 'running', suspend: () => { suspended += 1; return Promise.resolve(); }};
    g.loadAssets();
    let cosmetic = 0;
    g.ownTimeout(() => { cosmetic += 1; }, 50);
    g.showHitmarker('wrong');
    assert.ok(g._so.timers.size >= 2);
    const gfx = g._so.gfx;
    g.onContextLost();
    assert.strictEqual(g._so.gfx, gfx + 1);
    assert.strictEqual(g._so.timers.size, 0, 'cosmetic timers cleared');
    assert.strictEqual(suspended, 1);
    pending.filter(p => !p.tex).forEach(p => p.ok({scene: fakeScene(), animations: []}));
    return Promise.resolve().then(() => {
        h.clock.advance(20000);
        assert.ok(disposed.length >= 2, 'late GLB results disposed');
        assert.strictEqual(cosmetic, 0);
        assert.strictEqual(g.phase, 'lost');
    });
});

test('9 graphics generation: kit scenes received before a context loss (not yet finalized) are disposed by the release', () => {
    const pending = [];
    const disposed = [];
    const fakeScene = tag => ({traverse: fn => fn({geometry: {dispose: () => disposed.push(tag + '-geo')},
        material: {dispose: () => disposed.push(tag + '-mat'), map: {isTexture: true, dispose: () => disposed.push(tag + '-tex')}}})});
    const THREE = {
        GLTFLoader: function () { this.load = (url, ok) => pending.push({url, ok}); this.parse = () => {}; },
        TextureLoader: function () { this.load = (url, ok) => pending.push({url, ok, tex: true}); },
        sRGBEncoding: 3001,
    };
    const h = harness({ctx: {THREE}});
    const g = engage(h);
    g.loadAssets();
    const kits = pending.filter(p => !p.tex).slice(1);            // [0] is the enemy model
    assert.ok(kits.length >= 2, 'kit loads requested');
    kits.forEach((p, i) => p.ok({scene: fakeScene('kit' + i), animations: []}));
    return Promise.resolve().then(() => Promise.resolve()).then(() => {
        assert.ok(Object.keys(g._so.assets.pieces).length === kits.length, 'kit scenes accepted while current');
        assert.strictEqual(disposed.length, 0);
        g.onContextLost();
        for (let i = 0; i < kits.length; i += 1) for (const part of ['geo', 'mat', 'tex']) assert.ok(disposed.includes('kit' + i + '-' + part), 'kit' + i + ' ' + part + ' disposed');
        assert.strictEqual(g._so.shared.size, 0);
    });
});

test('9 focus precedence: Enter on a focused chip never fires; Enter on the root fires once', () => {
    const h = harness();
    const g = engage(h);
    let fired = 0;
    g.fire = () => { fired += 1; return {fired: true}; };
    const root = {contains: el => el !== null, tagName: 'MAIN'};
    const chip = {tagName: 'BUTTON', getAttribute: () => null};
    g.$refs.root = root;
    h.ctx.document = {activeElement: chip};
    const ev = code => ({code, repeat: false, preventDefault: () => {}});
    g.onKeyDown(ev('Enter'));
    g.onKeyDown(ev('Space'));
    assert.strictEqual(fired, 0);
    h.ctx.document = {activeElement: root};
    g.onKeyDown(ev('Enter'));
    assert.strictEqual(fired, 1);
});

test('9 lifetimes: rounds and the map dispose and drop their items, never shared ones; sets stay disjoint; walking builds nothing', () => {
    const h = harness();
    const g = engage(h);
    const so = g._so;
    const log = [];
    const item = name => ({dispose: () => log.push(name)});
    const shared = item('shared');
    so.shared.add(shared);
    so.map = {group: null, disposables: new Set([item('map-a'), item('map-b')]), places: [], gates: [], grey: {}, merged: {}};
    const round = so.round;
    round.visual = {group: {parent: null}, disposables: new Set([item('round-a')])};
    so.rounds.push(round);
    const sets = [so.shared, so.map.disposables, round.visual.disposables];
    sets.forEach((a, i) => sets.forEach((b, j) => { if (i < j) a.forEach(x => assert.ok(!b.has(x), 'disjoint')); }));
    // walking between places builds and disposes nothing
    const mapRef = so.map;
    clearPlace(h);
    g.setMoveInput({x: 0, z: 1});
    for (let i = 0; i < 100; i++) g.updateMovement(16);
    assert.strictEqual(so.map, mapRef);
    assert.strictEqual(mapRef.disposables.size, 2);
    assert.ok(!log.some(x => /^map/.test(x)), 'nothing of the map disposed while walking');
    g.retireRound(round);
    g.releaseMap();
    assert.deepStrictEqual(log.sort(), ['map-a', 'map-b', 'round-a']);
    assert.strictEqual(mapRef.disposables.size, 0);
    assert.strictEqual(so.map, null);
    assert.strictEqual(so.rounds.length, 0);
    assert.ok(so.shared.has(shared));
    g.onContextLost();
    assert.strictEqual(so.shared.size, 0, 'lost disposes the shared set');
    assert.ok(g.getPhaseTimers().every(t => !t.pending), 'only frozen timers remain');
});

test('9 teardown invalidates callbacks, removes every listener and is idempotent', () => {
    const h = harness();
    const g = engage(h);
    const added = [], removed = [];
    const target = {addEventListener: t => added.push(t), removeEventListener: t => removed.push(t)};
    const legacy = {addListener: () => added.push('mql'), removeListener: () => removed.push('mql')};
    g.listen(target, 'keydown', () => {});
    g.listen(target, 'pointerlockchange', () => {});
    g.listen(legacy, 'change', () => {});
    let ran = 0;
    g.ownTimeout(() => { ran += 1; }, 50);
    g.answer(wrongIndex(g));
    g.teardown();
    g.teardown();
    assert.strictEqual(g.phase, 'left');
    assert.deepStrictEqual(removed.sort(), added.sort());
    assert.strictEqual(g._so.listeners.length, 0);
    assert.strictEqual(h.clock.pending(), 0, 'every timer was cleared');
    h.clock.advance(5000);
    assert.strictEqual(ran, 0);
    assert.strictEqual(g.answer(0), false);
});

test('9 attemptLocked is written false only by arriveRound and unlockRetry', () => {
    const h = harness();
    const g = engage(h);
    g.answer(wrongIndex(g));
    h.clock.advance(C.timing.retryLockMs);
    g.answer(correctIndex(g));
    h.clock.advance(C.timing.correctToTransitionMs + C.timing.regroupMs);
    g.pause('button'); g.resume();
    clearPlace(h);
    g.teleport('containers');
    h.clock.advance(C.timing.approachMs);
    g.onContextLost(); g.continueInDom();
    assert.ok(h.unlockers.length >= 4);
    h.unlockers.forEach(line => assert.ok(/arriveRound|unlockRetry/.test(line), line));
});

// ---------------------------------------------------------------- 10. integration
test('10 slice registrations, route, load order, offline assets and the migration search', () => {
    const map = new Map();
    const storage = {getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k)};
    const session = new Map([['username', 'טסט']]);
    const ctx = {console, localStorage: storage, sessionStorage: {getItem: k => session.get(k) || null, setItem: (k, v) => session.set(k, v)}, navigator: {}, Audio: class { play() {} }, he: {decode: s => s}, Math, JSON};
    ctx.window = ctx; ctx.globalThis = ctx;
    vm.createContext(ctx);
    const load = (file, suffix) => vm.runInContext(read(file) + (suffix || ''), ctx, {filename: file});
    load('data.js', ';globalThis.DATA=DATA;');
    load('apps.js', ';globalThis.apps=apps;');
    load('groups.js', ';globalThis.SHARED_GROUPS=SHARED_GROUPS;globalThis.resolveSharedGroupApp=resolveSharedGroupApp;globalThis.getSharedGroupMenuItems=getSharedGroupMenuItems;');
    load('worlds.js');
    load('storage.js');
    vm.runInContext('var Vue = {component: function (name, def) { return def; }};', ctx);
    load('adventure.js');
    const tester = read('tester.js');
    vm.runInContext(tester.slice(0, tester.indexOf('var ProgressBarComponent')) + ';globalThis.generateFromList=generateFromList;globalThis.getItemById=getItemById;globalThis.getSetItems=getSetItems;', ctx, {filename: 'tester-core.js'});
    const found = [];
    (function walk(node, id) {
        (node.items || []).forEach((item, i) => {
            const childId = id === null ? String(i) : id + '_' + i;
            if (item.appType === 'strike_ops') found.push(childId);
            if (item.link && item.link.indexOf('/play/strike_ops/') === 0) found.push(item.link.split('/')[3]);
            walk(item, childId);
        });
    })(ctx.apps, null);
    // The English shared-progress groups: ch51 and its listening twin ch51s,
    // g611 (whose games g611h shares) and the ten grade-6 MOE groups.
    const sharedIds = ['grp-ch51-8', 'grp-ch51s-8', 'grp-g611-14', 'grp-g611h-14'];
    [1, 2, 3, 4, 5].forEach(part => ['e', 'h'].forEach(dir => sharedIds.push('grp-g6p' + part + dir + '-7')));
    assert.deepStrictEqual(found.sort(), ['0_4_8'].concat(sharedIds).sort());
    sharedIds.forEach(id => {
        const app = ctx.getItemById(ctx.apps, id);
        assert.ok(app && app.appType === 'strike_ops', id + ' resolves to Strike Ops');
        const q = ctx.generateFromList(app.listName, app.questionIndex, app.resultIndex, id, ctx.getSetItems(app), app.questionType);
        assert.ok(q.question && q.result && q.options.indexOf(q.result) !== -1 && q.options.length >= 2, id + ' asks a question');
    });
    const own = ctx.getItemById(ctx.apps, '0_4_8');
    assert.deepStrictEqual([own.appType, own.listName, own.questionIndex, own.resultIndex, own.setItems, own.icon], ['strike_ops', 'QUESTION', 'english_name', 'question_word_hebrew', 3, 'gps_fixed']);
    const grp = ctx.getItemById(ctx.apps, 'grp-ch51-8');
    assert.deepStrictEqual([grp.appType, grp.listName, grp.questionIndex, grp.resultIndex, grp.setItems], ['strike_ops', '5_1', 'english_name', 'hebrew', 5]);
    [['0_4_8', own], ['grp-ch51-8', grp]].forEach(pair => {
        const q = ctx.generateFromList(pair[1].listName, pair[1].questionIndex, pair[1].resultIndex, pair[0], ctx.getSetItems(pair[1]), pair[1].questionType);
        assert.ok(q.question && q.result && q.options.indexOf(q.result) !== -1 && q.options.length >= 2, pair[0]);
    });
    assert.strictEqual(ctx.getItemById(ctx.apps, '0_48_8').name, 'עברית לאנגלית');
    const apps = read('apps.js'), groups = read('groups.js');
    const balloon = s => (s.match(/appType:\s*'balloon_shooter'|\/balloon_shooter\//g) || []).length;
    assert.strictEqual(balloon(apps), 23);
    assert.strictEqual(balloon(groups), 5);
    ['mcq', 'balloon_shooter', 'platformer', 'treasure_maze', 'word_link', 'duel_shooter', 'wizard_duel', 'scribble_dungeon']
        .forEach((type, i) => assert.strictEqual(ctx.getItemById(ctx.apps, '0_4_' + i).appType, type, '0_4_' + i));
    assert.ok(tester.indexOf("'/play/strike_ops/:currentAppId'") !== -1, 'route registered');
    const html = read('index.html');
    const gameAt = html.indexOf('<script src="./games/strike-ops.js"></script>');
    const testerAt = html.search(/<script src="\.\/tester\.js\?v=\d+"><\/script>/);
    assert.ok(gameAt !== -1 && testerAt !== -1 && gameAt < testerAt, 'game loads before tester.js');
    assert.ok(html.indexOf('<link rel="stylesheet" href="./games/strike-ops.css">') !== -1);
    const sw = read('service-worker.js');
    assert.ok(sw.indexOf("'/games/strike-ops.js'") !== -1 && sw.indexOf("'/games/strike-ops.css'") !== -1);
    const assets = sw.match(/const STRIKE_OPS_ASSETS = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map(s => s.slice(1, -1));
    assets.forEach(a => assert.ok(fs.existsSync(path.join(ROOT, a)), a + ' exists'));
    assert.ok(/\.concat\(STRIKE_OPS_ASSETS\)/.test(sw), 'assets are precached');
    assert.ok(!assets.some(a => /\/assets\/strike-ops\/models\/|RobotExpressive/.test(a)), 'no obsolete paths');
    assert.deepStrictEqual(Array.from(pure.strikeOpsAssetUrls()).map(u => u.replace(/^\./, '')).sort(), assets.slice().sort(), 'config URLs = STRIKE_OPS_ASSETS');
    // every external image/buffer URI of every listed GLB resolves to a listed path
    assets.filter(a => /\.glb$/.test(a)).forEach(a => {
        const buf = fs.readFileSync(path.join(ROOT, a));
        const json = JSON.parse(buf.slice(20, 20 + buf.readUInt32LE(12)).toString());
        (json.images || []).concat(json.buffers || []).filter(x => x.uri).forEach(x => {
            const resolved = path.posix.join(path.posix.dirname(a), x.uri);
            assert.ok(assets.indexOf(resolved) !== -1, a + ' → ' + resolved);
        });
    });
    assert.ok(!fs.existsSync(path.join(ROOT, 'assets/strike-ops/models')) && !fs.existsSync(path.join(ROOT, 'assets/strike-ops/LICENSE-Kenney.txt')), 'obsolete files deleted');
    const credits = read('assets/strike-ops/CREDITS.md');
    assets.forEach(a => assert.ok(credits.indexOf(a.replace('/assets/strike-ops/', '')) !== -1 || credits.indexOf(path.posix.basename(a)) !== -1, 'credited: ' + a));
    const game = read('games/strike-ops.js'), css = read('games/strike-ops.css');
    const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
    [game, css].forEach(src => assert.ok(!/\b(rooms?|posts?|robots?|breach\w*|Robot\w*)\b/i.test(code(src)), 'migration search: ' + (code(src).match(/\b(rooms?|posts?|robots?|breach\w*|Robot\w*)\b/i) || [])[0]));
    [game, css].forEach(src => { const m = code(src).match(/\b(advancePath|advancePose|yawLimitDeg|bobAmp|bobHz|catmull|retireZone|buildIncomingZone|retireOutgoingZone)\b|\.pad\b/); assert.ok(!m, 'rev-3 migration search: ' + (m && m[0])); });
    assert.ok(game.indexOf('assault-rifle.glb') === -1 && game.indexOf('crate.glb') === -1, 'no URL fallbacks for embedded models');
    assert.ok(!/localStorage\s*\.\s*(get|set)Item/.test(game), 'no raw localStorage');
});

// ---------------------------------------------------------------- 11. static merge
test('11 static merge de-indexes, de-interleaves and de-normalises by hand (toNonIndexed is not used)', () => {
    const ctx = loadGame({__three: true});
    const T = ctx.THREE;
    const makeGeo = () => {
        // 4 vertices, interleaved: position float x3 | normal int8 norm x3 | uv uint16 norm x2
        const pos = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
        const nor = [[0, 0, 127], [0, 0, 127], [0, 127, 0], [127, 0, 0]];
        const uv = [[0, 0], [65535, 0], [65535, 65535], [0, 32768]];
        const f32 = new Float32Array(4 * 3);
        pos.forEach((p, i) => f32.set(p, i * 3));
        const geo = new T.BufferGeometry();
        const ip = new T.InterleavedBuffer(f32, 3);
        geo.setAttribute('position', new T.InterleavedBufferAttribute(ip, 3, 0, false));
        const i8 = new Int8Array(4 * 4);
        nor.forEach((n, i) => i8.set(n, i * 4));
        geo.setAttribute('normal', new T.InterleavedBufferAttribute(new T.InterleavedBuffer(i8, 4), 3, 0, true));
        const u16 = new Uint16Array(4 * 2);
        uv.forEach((u, i) => u16.set(u, i * 2));
        geo.setAttribute('uv', new T.InterleavedBufferAttribute(new T.InterleavedBuffer(u16, 2), 2, 0, true));
        geo.setIndex([0, 1, 2, 0, 2, 3]);
        return {geo, pos, nor, uv};
    };
    const mat = new T.MeshBasicMaterial(), other = new T.MeshBasicMaterial();
    const group = new T.Group();
    const a = makeGeo(), b = makeGeo();
    const m1 = new T.Mesh(a.geo, mat); m1.position.set(5, 0, 0);
    const m2 = new T.Mesh(b.geo, mat); m2.position.set(0, 2, 0); m2.rotation.y = Math.PI / 2;
    const m3 = new T.Mesh(makeGeo().geo, other);
    group.add(m1); group.add(m2); group.add(m3);
    group.updateMatrixWorld(true);
    const expected = [];
    [m1, m2].forEach(m => [0, 1, 2, 0, 2, 3].forEach(i => expected.push(new T.Vector3().fromArray(a.pos[i]).applyMatrix4(m.matrixWorld))));
    const out = ctx.strikeOpsMergeStatic(group, T);
    assert.strictEqual(out.length, 2, 'one merged mesh per material');
    const merged = out.find(o => o.material === mat);
    const P = merged.geometry.attributes.position, U = merged.geometry.attributes.uv, N = merged.geometry.attributes.normal;
    assert.strictEqual(merged.geometry.index, null);
    assert.strictEqual(P.count, 12, 'vertex count = sum of index counts');
    expected.forEach((v, k) => { near(P.getX(k), v.x, 1e-5); near(P.getY(k), v.y, 1e-5); near(P.getZ(k), v.z, 1e-5); });
    [0, 1, 2, 0, 2, 3].forEach((i, k) => { near(U.getX(k), a.uv[i][0] / 65535, 1 / 65535); near(U.getY(k), a.uv[i][1] / 65535, 1 / 65535); });
    near(N.getZ(0), 1, 1e-5, 'normal de-normalised');
    assert.ok(group.children.indexOf(m1) === -1 && group.children.indexOf(m2) === -1, 'placed pieces removed');
    // rev 3: the merged bounding sphere contains every merged vertex (chunk frustum culling)
    const bs = merged.geometry.boundingSphere;
    assert.ok(bs, 'bounding sphere computed');
    for (let k = 0; k < P.count; k++) assert.ok(Math.hypot(P.getX(k) - bs.center.x, P.getY(k) - bs.center.y, P.getZ(k) - bs.center.z) <= bs.radius + 1e-6, 'vertex inside the sphere');
    // control: r128 toNonIndexed() does not reproduce these positions from the interleaved input
    const c = makeGeo().geo;
    let reproduces = true;
    try {
        const ni = c.toNonIndexed();
        const p = ni.attributes.position;
        [0, 1, 2, 0, 2, 3].forEach((i, k) => { if (Math.abs(p.getX(k) - a.pos[i][0]) > 1e-5 || Math.abs(p.getY(k) - a.pos[i][1]) > 1e-5) reproduces = false; });
        const u = ni.attributes.uv;
        if (u && Math.abs(u.getX(1) - 1) > 1e-3) reproduces = false;
    } catch (e) { reproduces = false; }
    assert.strictEqual(reproduces, false, 'r128 toNonIndexed() mis-reads interleaved/normalised data (update this control if THREE fixes it)');
});

// ---------------------------------------------------------------- 12. map config
test('12 map config: shipped gate, bounds, places, gates, flood fills, legs, landmark; negative fixtures', () => {
    assert.deepStrictEqual(Array.from(pure.validateStrikeOpsConfig(C)), []);
    assert.doesNotThrow(() => loadGame().createStrikeOpsComponent({name: 'stub'}));
    const M = C.map, B = M.bounds, P = M.playBounds;
    const within = (q, R) => q.minX >= R.minX && q.maxX <= R.maxX && q.minZ >= R.minZ && q.maxZ <= R.maxZ;
    assert.ok(within(P, B));
    C.zones.forEach((z, i) => {
        assert.ok(within(z.region, P), z.id + ' region inside playBounds');
        C.zones.forEach((o, j) => { if (j > i) assert.ok(!(z.region.minX < o.region.maxX && z.region.maxX > o.region.minX && z.region.minZ < o.region.maxZ && z.region.maxZ > o.region.minZ), 'no overlap'); });
        assert.strictEqual(z.headingDeg % 90, 0);
    });
    M.walls.forEach(w => assert.ok(within(w, B)));
    M.gates.forEach(g => assert.ok(within(pure.strikeOpsGateRect(g), B)));
    // arenaToMap: the yard maps identically; the §5.1 table is reproduced
    const a2m = pure.strikeOpsArenaToMap;
    [[1.3, 7.2], [-4, 0.5], [0, 9.76]].forEach(([x, z]) => { const m = a2m(C.zones[0], x, z); near(m.x, x, 1e-12); near(m.z, z, 1e-12); });
    const table = {
        yard: {fb: [-3, 3, -0.5, 3], anchor: [0, 1], stage: [0, 9.76], approach: [[-5.2, 11.6], [-2, 12.6], [2, 12.6], [5.2, 11.6]]},
        containers: {fb: [1.5, 5, 22, 28], anchor: [3, 25], stage: [11.76, 25], approach: [[13.6, 30.2], [14.6, 27], [14.6, 23], [13.6, 19.8]]},
        sheds: {fb: [14.5, 20.5, 36.5, 40], anchor: [17.5, 38], stage: [17.5, 46.76], approach: [[12.3, 48.6], [15.5, 49.6], [19.5, 49.6], [22.7, 48.6]]},
        plaza: {fb: [-1, 2.5, 47, 53], anchor: [1, 50], stage: [-7.76, 50], approach: [[-9.6, 44.8], [-10.6, 48], [-10.6, 52], [-9.6, 55.2]]},
    };
    C.zones.forEach(z => {
        const t = table[z.id], f = pure.strikeOpsPlaceFrame(z);
        [f.fightBox.minX, f.fightBox.maxX, f.fightBox.minZ, f.fightBox.maxZ].forEach((v, i) => near(v, t.fb[i], 1e-9, z.id + ' fight box'));
        near(f.anchor.x, t.anchor[0], 1e-9); near(f.anchor.z, t.anchor[1], 1e-9);
        near(f.bossStage.x, t.stage[0], 1e-9); near(f.bossStage.z, t.stage[1], 1e-9);
        f.approach.forEach((p, i) => { near(p.x, t.approach[i][0], 1e-9); near(p.z, t.approach[i][1], 1e-9); });
    });
    // route legs: lengths, joins, clearance in their own state
    let total = 0;
    M.legs.forEach((leg, j) => {
        let len = 0;
        for (let i = 1; i < leg.length; i++) {
            const a = M.nodes[leg[i - 1]], b = M.nodes[leg[i]];
            len += Math.hypot(b.x - a.x, b.z - a.z);
            assert.ok(pure.strikeOpsSegmentClear(a, b, pure.strikeOpsColliders(j + 1, C), C.movement.radius + 0.05), 'leg ' + (j + 1) + ' ' + leg[i - 1] + '→' + leg[i]);
        }
        assert.ok(len <= 35, 'leg ' + (j + 1) + ' length ' + len);
        total += len;
    });
    near(total, 84.6, 0.5, 'route length');
    // flood fills (k = 0..3): reach the target anchor, never a lane spot, approach or the exit gate
    C.zones.forEach((z, k) => {
        const seed = k === 0 ? M.start : pure.strikeOpsPlaceFrame(C.zones[k - 1]).anchor;
        const fill = pure.strikeOpsFloodFill(pure.strikeOpsColliders(k, C), seed);
        const W = fill.W;
        const reach = p => { const i = Math.round((p.x - W.B.minX) / W.step), j = Math.round((p.z - W.B.minZ) / W.step); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (fill.seen[(i + a) + (j + b) * W.nx]) return true; return false; };
        assert.ok(reach(pure.strikeOpsPlaceFrame(z).anchor), z.id + ' anchor reached');
        z.lanes.forEach(l => l.spots.forEach(s => assert.ok(!reach(a2m(z, s.peek.x, s.peek.z)), z.id + ' lane spot not reached')));
        pure.strikeOpsPlaceFrame(z).approach.forEach(p => assert.ok(!reach(p), z.id + ' approach not reached'));
    });
    // the water tower lies within ±20° of straight ahead from the start
    const tower = M.structures.find(s => s.kind === 'waterTower');
    assert.ok(Math.abs(Math.atan2(tower.x - M.start.x, tower.z - M.start.z) * 180 / Math.PI) <= 20, 'landmark ahead');
    // negative fixtures
    const expect = (mutate, pattern) => {
        const cfg = clone(C);
        mutate(cfg);
        const errors = Array.from(pure.validateStrikeOpsConfig(cfg, {routing: false}));
        assert.ok(errors.some(e => pattern.test(e)), pattern + ' in ' + JSON.stringify(errors));
    };
    expect(c => { c.map.gates[1].at = 17; }, /map: gate g1 must lie (on the shared boundary of its regions|in a gap of the wall list)/);
    expect(c => { c.zones[0].enemyZone.minZ = 9.5; }, /map: flood fill 0 \(yard\) reaches a lane spot/);
    expect(c => { c.map.nodes.n5 = {x: -2.5, z: 25.5}; }, /map: route leg 2 segment .* is blocked/);
    expect(c => { c.zones[1].region.minZ = 17; }, /map: the regions of yard and containers overlap/);
    // the perimeter: a wall 0.5 m outside bounds
    expect(c => { const w = c.map.walls.find(x => x.minX === -22.3); w.minX -= 1.2; w.maxX -= 1.2; }, /map: wall \d+ \(hedge\) lies outside bounds/);
});

// ---------------------------------------------------------------- 13. map state
test('13 map state: gates, blockers, target and trigger from the committed index; pure', () => {
    const phases = ['briefing', 'deploying', 'engaging', 'wrong', 'correct', 'regroup', 'roaming', 'advancing', 'paused'];
    for (let k = 0; k <= 3; k++) {
        phases.forEach(phase => {
            const st = pure.strikeOpsMapState(k, phase, C);
            assert.deepStrictEqual(st, pure.strikeOpsMapState(k, phase, C), 'same output for equal input');
            st.gates.forEach(g => {
                const j = Number(g.id.slice(1));
                assert.strictEqual(g.open, j > 0 && k >= j, g.id + ' at k=' + k);
            });
            st.blockers.forEach((b, i) => assert.strictEqual(b.active, i >= k));
            assert.strictEqual(st.targetId, C.zones[k].id);
            assert.strictEqual(st.trigger.armed, phase === 'roaming');
        });
    }
    // the lap wrap (k back to 0) closes every gate
    assert.ok(pure.strikeOpsMapState(0, 'advancing', C).gates.every(g => !g.open));
    assert.ok(Object.isFrozen(C.map.gates[1]) && C.map.gates[1].at === 18, 'no input mutated');
});

// ---------------------------------------------------------------- 14. navigation and the autopilot
function simulateWalk(start, k, yaw0, routeOverride) {
    const target = C.zones[k], fb = pure.strikeOpsPlaceFrame(target).fightBox, col = pure.strikeOpsColliders(k, C);
    const route = routeOverride || pure.strikeOpsRoute(start, target.id, k, C);
    assert.ok(route.ok, 'route from ' + JSON.stringify(start));
    const ap = {points: route.points, index: 1};
    const p = {x: start.x, z: start.z, yaw: yaw0 || 0}, vel = {x: 0, z: 0};
    const limit = (route.length / C.movement.walk + 2) * 1000;
    let t = 0, maxTurn = 0, best = Infinity, bestAt = 0, stall = 0;
    const remaining = () => {
        const pts = ap.points, i = Math.min(ap.index, pts.length - 1);
        let r = Math.hypot(pts[i].x - p.x, pts[i].z - p.z);
        for (let q = i; q < pts.length - 1; q++) r += Math.hypot(pts[q + 1].x - pts[q].x, pts[q + 1].z - pts[q].z);
        return r;
    };
    while (t <= limit) {
        if (p.x >= fb.minX && p.x <= fb.maxX && p.z >= fb.minZ && p.z <= fb.maxZ) return {t, limit, maxTurn, stall, via: route.via};
        const st = pure.strikeOpsAutopilotStep(ap, p, C, 16, false);
        const turn = Math.abs(((st.yaw - p.yaw + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) / 0.016 * 180 / Math.PI;
        maxTurn = Math.max(maxTurn, turn);
        p.yaw = st.yaw;
        pure.strikeOpsVelocityStep(vel, st.dirX, st.dirZ, C.movement.walk, C, 0.016);
        const q = pure.strikeOpsResolveMove(p, {x: vel.x * 0.016, z: vel.z * 0.016}, col, C.map.playBounds, C.movement.radius, C.movement.maxStepM);
        p.x = q.x; p.z = q.z;
        t += 16;
        const r = remaining();
        if (r < best - 0.01) { best = r; bestAt = t; } else stall = Math.max(stall, t - bestAt);
        assert.ok(!st.done, 'the route ends at the anchor inside the fight box');
    }
    assert.fail('the autopilot did not reach ' + target.id + ' from ' + JSON.stringify(start) + ' within ' + limit + ' ms');
}
test('14 navigation: routes from anywhere (graph, grid fallback, no-route), deterministic; the autopilot reaches every fight box', () => {
    const r = C.movement.radius;
    const clearRoute = (route, k) => {
        const col = pure.strikeOpsColliders(k, C);
        for (let i = 1; i < route.points.length; i++) assert.ok(pure.strikeOpsSegmentClear(route.points[i - 1], route.points[i], col, r - 0.02), 'segment ' + i + ' clear');
    };
    for (let k = 0; k < 4; k++) {
        const z = C.zones[k], anchor = pure.strikeOpsPlaceFrame(z).anchor;
        const starts = [];
        C.zones.slice(0, k + 1).forEach(p => starts.push(pure.strikeOpsPlaceFrame(p).anchor));
        const seedP = k === 0 ? C.map.start : pure.strikeOpsPlaceFrame(C.zones[k - 1]).anchor;
        const fill = pure.strikeOpsFloodFill(pure.strikeOpsColliders(k, C), seedP), W = fill.W;
        const cells = [];
        fill.seen.forEach((v, id) => { if (v) cells.push(id); });
        const cellPt = id => ({x: W.B.minX + (id % W.nx) * W.step, z: W.B.minZ + Math.floor(id / W.nx) * W.step});
        C.zones.slice(0, k).forEach(p => {
            // the cleared places' far corners: the reachable cell nearest each corner
            const R = p.region;
            [[R.minX, R.minZ], [R.maxX, R.minZ], [R.minX, R.maxZ], [R.maxX, R.maxZ]].forEach(([x, zz]) => {
                let best = null, bd = Infinity;
                cells.forEach(id => { const q = cellPt(id); if (!(q.x >= R.minX && q.x <= R.maxX && q.z >= R.minZ && q.z <= R.maxZ)) return; const d = Math.hypot(q.x - x, q.z - zz); if (d < bd) { bd = d; best = q; } });
                if (best) starts.push(best);
            });
        });
        for (let n = 0; n < 50; n++) {
            const id = cells[Math.floor(rnd() * cells.length)];
            starts.push({x: W.B.minX + (id % W.nx) * W.step, z: W.B.minZ + Math.floor(id / W.nx) * W.step});
        }
        starts.forEach(s => {
            const a = pure.strikeOpsRoute(s, z.id, k, C);
            assert.ok(a.ok, z.id + ' from ' + JSON.stringify(s));
            const last = a.points[a.points.length - 1];
            near(last.x, anchor.x, 1e-9); near(last.z, anchor.z, 1e-9);
            clearRoute(a, k);
            assert.deepStrictEqual(JSON.parse(JSON.stringify(pure.strikeOpsRoute(s, z.id, k, C))), JSON.parse(JSON.stringify(a)), 'deterministic');
        });
    }
    // equidistant entry nodes resolve by declaration order (n0a before n0b)
    const mid = {x: 5.2, z: 7.0};
    const viaMid = pure.strikeOpsRoute(mid, 'containers', 1, C);
    assert.ok(viaMid.ok && viaMid.points[1].x === 5.2 && viaMid.points[1].z === 4.2, JSON.stringify(viaMid.points.slice(0, 3)));
    // a start whose straight connectors are all blocked (behind the yard's big shed) needs the grid
    const behind = {x: -12.6, z: 16.6};
    const g = pure.strikeOpsRoute(behind, 'containers', 1, C);
    assert.ok(g.ok && g.via === 'grid', JSON.stringify({via: g.via}));
    clearRoute(g, 1);
    // locked place / point inside a collider → no-route
    assert.deepStrictEqual(JSON.parse(JSON.stringify(pure.strikeOpsRoute(C.map.start, 'sheds', 1, C))), {ok: false, reason: 'no-route'});
    assert.strictEqual(pure.strikeOpsRoute(C.map.start, {x: -9.2, z: 12.5}, 0, C).ok, false, 'inside the shed');
    // fixed-step autopilot walks: each leg start and 200 random starts
    C.map.legs.forEach((leg, j) => {
        const res = simulateWalk(C.map.nodes[leg[0]], j + 1, 0);
        assert.ok(res.maxTurn <= 180 + 1e-6 && res.stall <= 500, JSON.stringify(res));
    });
    let walks = 0;
    for (let k = 0; k < 4; k++) {
        const seedP = k === 0 ? C.map.start : pure.strikeOpsPlaceFrame(C.zones[k - 1]).anchor;
        const col = pure.strikeOpsColliders(k, C);
        const fill = pure.strikeOpsFloodFill(col, seedP), W = fill.W;
        const cells = [];
        fill.seen.forEach((v, id) => { if (v) cells.push(id); });
        for (let n = 0; n < 50; n++) {
            const id = cells[Math.floor(rnd() * cells.length)];
            const s = {x: W.B.minX + (id % W.nx) * W.step + (rnd() - 0.5) * 0.2, z: W.B.minZ + Math.floor(id / W.nx) * W.step + (rnd() - 0.5) * 0.2};
            if (pure.strikeOpsPenetrates(col, s, r)) { n -= 1; continue; }
            const res = simulateWalk(s, k, rnd() * 6.28);
            assert.ok(res.maxTurn <= 180 + 1e-6, 'turn rate ' + res.maxTurn);
            assert.ok(res.stall <= 500, 'stall ' + res.stall + ' from ' + JSON.stringify(s));
            walks += 1;
        }
    }
    assert.strictEqual(walks, 200);
    // a held forward input against a closed gate stops the capsule ≥ radius before it
    const col0 = pure.strikeOpsColliders(0, C);
    let p = {x: 0.4, z: 10.0};
    const col1 = pure.strikeOpsColliders(1, C);
    for (let i = 0; i < 400; i++) p = pure.strikeOpsResolveMove(p, {x: 0, z: 0.05}, col1, C.map.playBounds, r, C.movement.maxStepM);
    assert.ok(p.z >= 21, 'the open gate lets the capsule through in state 1: ' + p.z);
    let q = {x: 0.4, z: 16};
    const noBlock = Object.assign({}, col0, {dyn: col0.dyn.filter(b => b.kind !== 'blocker')});
    for (let i = 0; i < 100; i++) q = pure.strikeOpsResolveMove(q, {x: 0, z: 0.05}, noBlock, C.map.playBounds, r, C.movement.maxStepM);
    assert.ok(q.z <= 18 - 0.3 - r + 1e-6, 'stopped before the closed gate ' + q.z);
});

// ---------------------------------------------------------------- 15. encounter boundary and order
test('15 encounter boundary: the fight-box clamp holds; projected lane order equals index order from every fight-box sample', () => {
    const r = C.movement.radius;
    C.zones.forEach((z, k) => {
        const fb = pure.strikeOpsPlaceFrame(z).fightBox, col = pure.strikeOpsColliders(k, C);
        let p = pure.strikeOpsPlaceFrame(z).anchor;
        for (let i = 0; i < 2500; i++) {
            const a = rnd() * Math.PI * 2, v = rnd() * 4.2 * 0.05;
            p = pure.strikeOpsResolveMove(p, {x: Math.sin(a) * v, z: Math.cos(a) * v}, col, fb, r, C.movement.maxStepM);
            assert.ok(p.x >= fb.minX - 1e-9 && p.x <= fb.maxX + 1e-9 && p.z >= fb.minZ - 1e-9 && p.z <= fb.maxZ + 1e-9, z.id + ' inside the fight box');
        }
    });
    const ctx = loadGame({__three: true});
    const T = ctx.THREE;
    [[390, 844], [1440, 900]].forEach(([w, h]) => {
        const fov = ctx.strikeOpsHipFov(w, h, ctx.STRIKE_OPS_CONFIG);
        const cam = new T.PerspectiveCamera(fov.vfov, w / h, 0.05, 400);
        cam.rotation.order = 'YXZ';
        let checked = 0;
        ctx.STRIKE_OPS_CONFIG.zones.forEach(z => {
            const fb = z.fightBox, hd = z.headingDeg * Math.PI / 180;
            const torsos = z.lanes.map(l => ctx.strikeOpsArenaToMap(z, l.spots[0].peek.x, l.spots[0].peek.z));
            for (let x = fb.minX; x <= fb.maxX + 1e-9; x += 0.5) for (let zz = fb.minZ; zz <= fb.maxZ + 1e-9; zz += 0.5) {
                const eye = ctx.strikeOpsArenaToMap(z, x, zz);
                for (let dy = -40; dy <= 40; dy += 10) {
                    const yaw = hd + dy * Math.PI / 180;
                    cam.position.set(-eye.x, 1.6, eye.z);
                    cam.rotation.set(0, Math.PI - yaw, 0);
                    cam.updateMatrixWorld();
                    const pts = torsos.map(t => new T.Vector3(-t.x, 1.0, t.z));
                    const inFront = pts.every(v => v.clone().applyMatrix4(cam.matrixWorldInverse).z < -0.05);
                    if (!inFront) continue;
                    const xs = pts.map(v => v.clone().project(cam).x);
                    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], z.id + ' order at ' + JSON.stringify(eye) + ' yaw ' + dy);
                    checked += 1;
                }
            }
        });
        assert.ok(checked > 1000, 'samples ' + checked);
    });
});

// ---------------------------------------------------------------- 16. aim in the map frame
test('16 aim in the map frame: project → rayFor hits the right hitbox at every heading; aimAngles round-trips; cover blocks; magnet invariant', () => {
    const h = harness({ctx: {__three: true}});
    const g = h.g, so = g._so, T = h.ctx.THREE, CC = h.ctx.STRIKE_OPS_CONFIG;
    so.view = {w: 1280, h: 720, left: 0, top: 0};
    so.camera = new T.PerspectiveCamera(50, 1280 / 720, 0.05, 400);
    so.camera.rotation.order = 'YXZ';
    const rayHits = (ray, b) => {
        let t0 = 0, t1 = Infinity;
        for (const [o, d, lo, hi] of [[ray.o.x, ray.d.x, b.minX, b.maxX], [ray.o.y, ray.d.y, b.minY, b.maxY], [ray.o.z, ray.d.z, b.minZ, b.maxZ]]) {
            if (Math.abs(d) < 1e-12) { if (o < lo || o > hi) return Infinity; continue; }
            let a = (lo - o) / d, c = (hi - o) / d;
            if (a > c) { const t = a; a = c; c = t; }
            t0 = Math.max(t0, a); t1 = Math.min(t1, c);
            if (t0 > t1) return Infinity;
        }
        return t0;
    };
    const screens = [];
    CC.zones.forEach((z, zi) => {
        g.zoneIndex = zi;
        g.create();
        const f = h.ctx.strikeOpsPlaceFrame(z);
        so.player.x = f.anchor.x; so.player.z = f.anchor.z; so.player.yaw = f.heading; so.player.pitch = 0;
        g.updateCamera(0);
        const enemies = so.round.enemies;
        const poses = enemies.map(e => Object.assign(h.ctx.strikeOpsArenaToMap(z, e.lane.spots[0].peek.x, e.lane.spots[0].peek.z), {yaw: f.heading + Math.PI}));
        const sc = [];
        enemies.forEach((e, i) => {
            const torso = g.torsoWorld(e, poses[i]);
            const px = g.project(torso);
            sc.push(px);
            const ray = g.rayFor(px);
            assert.ok(rayHits(ray, g.hitboxOf(e, poses[i])) < Infinity, z.id + ' ray hits enemy ' + i);
            enemies.forEach((o, j) => { if (j !== i) assert.strictEqual(rayHits(ray, g.hitboxOf(o, poses[j])), Infinity, z.id + ' ray misses enemy ' + j); });
            // aimAngles round-trips through the camera to the crosshair
            const a = g.aimAngles(torso);
            const keep = {yaw: so.player.yaw, pitch: so.player.pitch};
            so.player.yaw = a.yaw; so.player.pitch = a.pitch;
            g.updateCamera(0);
            const fwd = new T.Vector3(0, 0, -1).applyQuaternion(so.camera.quaternion);
            const dir = new T.Vector3(torso.x, torso.y, torso.z).sub(so.camera.position).normalize();
            assert.ok(fwd.angleTo(dir) * 180 / Math.PI <= 0.1, z.id + ' aim round trip');
            so.player.yaw = keep.yaw; so.player.pitch = keep.pitch;
            g.updateCamera(0);
            // a ray to the hide point behind its cover is blocked by the map-frame cover box
            const hide = h.ctx.strikeOpsArenaToMap(z, e.lane.spots[0].hide.x, e.lane.spots[0].hide.z);
            assert.strictEqual(h.ctx.strikeOpsSegmentBlocked({x: f.anchor.x, y: CC.movement.eye, z: f.anchor.z}, {x: hide.x, y: CC.aim.crouchBody.h / 2, z: hide.z}, f.cover), true, z.id + ' hide blocked');
        });
        screens.push(sc);
        g.retireRound(so.round);
    });
    // the same arena seen from its anchor projects identically at every heading
    screens.forEach(sc => sc.forEach((p, i) => { near(p.x, screens[0][i].x, 1e-6); near(p.y, screens[0][i].y, 1e-6); }));
    const aims = [{x: 640, y: 360}].concat(screens[0].map(p => ({x: p.x + 9, y: p.y - 5})));
    aims.forEach(aim => {
        const pick = sc => h.ctx.strikeOpsPickMagnetTarget(aim, sc.map((p, i) => ({index: i, x: p.x, y: p.y, hittable: true, clear: true})), 44);
        assert.ok(screens.every(sc => pick(sc) === pick(screens[0])), 'magnet picks invariant under rotation');
    });
});

// ---------------------------------------------------------------- 17. dressing, culling and flavour (§17.4 steps 4–5)
test('17 chunk culling (current + adjacent, tier-0 30/34 m hysteresis, tier-1 casters), squad styles, deploy sub-line, dressing config', () => {
    C.zones.forEach(z => {
        const s = pure.strikeOpsSquadStyle(z);
        assert.ok(['aim', 'shoot'].includes(s.exposedIdle), z.id + ' exposedIdle');
        assert.ok(s.volleyChance > 0 && s.volleyChance < 1, z.id + ' volley chance');
        assert.ok(s.volleyFrom >= 0 && s.volleyFrom < s.volleyTo && s.volleyTo <= C.squad.exposedMs, z.id + ' volley inside the exposed window');
    });
    assert.strictEqual(pure.strikeOpsSquadStyle(C.zones[2]).firstPeekGesture, 'cheer');
    assert.ok(pure.strikeOpsSquadStyle(C.zones[3]).bossSpotlight);
    const st = pure.strikeOpsSquadStyle(C.zones[1]);
    let n = 0;
    for (let cy = 0; cy < 200; cy++) for (let i = 0; i < 4; i++) {
        const a = pure.strikeOpsVolley(st, cy, i);
        assert.strictEqual(a, pure.strikeOpsVolley(st, cy, i), 'deterministic');
        if (a) n += 1;
    }
    assert.ok(Math.abs(n / 800 - st.volleyChance) < 0.08, 'volley rate ' + n / 800);
    // cosmetic dressing never stands inside a walkable region's play space
    C.dressing.containers.forEach(cn => {
        const hw = (cn.alongX ? cn.len : C.dressing.containerD) / 2, hd = (cn.alongX ? C.dressing.containerD : cn.len) / 2;
        const box = {minX: cn.x - hw + 0.05, maxX: cn.x + hw - 0.05, minZ: cn.z - hd + 0.05, maxZ: cn.z + hd - 0.05};
        const col = pure.strikeOpsColliders(C.zones.length, C);
        const free = pure.strikeOpsFloodFill(col, C.map.start);
        assert.ok(free, 'flood fill');
        [[box.minX, box.minZ], [box.maxX, box.minZ], [box.minX, box.maxZ], [box.maxX, box.maxZ], [cn.x, cn.z]].forEach(([x, z]) => {
            const inPlay = C.zones.some(zn => x > zn.region.minX + C.movement.radius && x < zn.region.maxX - C.movement.radius && z > zn.region.minZ + C.movement.radius && z < zn.region.maxZ - C.movement.radius)
                && !col.boxes.some(b => x >= b.minX - C.movement.radius && x <= b.maxX + C.movement.radius && z >= b.minZ - C.movement.radius && z <= b.maxZ + C.movement.radius);
            assert.ok(!inPlay, 'dressing container corner in walkable space ' + JSON.stringify([cn.x, cn.z, x, z]));
        });
    });
    // culling on a stub map
    const h = harness(), g = h.g, so = g._so;
    const mk = i => ({id: C.zones[i].id, region: C.zones[i].region, detail: {visible: false}, structure: {children: [{isMesh: true, userData: {caster: true}, castShadow: false}]}});
    so.map = {places: [0, 1, 2, 3].map(mk)};
    g.quality = 1; so.lastPlace = 1; so.player.x = 3; so.player.z = 25;
    g.updateCulling(true);
    assert.deepStrictEqual(so.map.places.map(p => p.detail.visible), [true, true, true, false]);
    assert.deepStrictEqual(so.map.places.map(p => p.structure.children[0].castShadow), [true, true, true, false]);
    g.quality = 2; g.updateCulling(false);
    assert.deepStrictEqual(so.map.places.map(p => p.structure.children[0].castShadow), [true, true, true, true], 'tier 2: every structure casts');
    g.quality = 0; g.updateCulling(false);
    assert.deepStrictEqual(so.map.places.map(p => p.structure.children[0].castShadow), [false, false, false, false], 'tier 0: no shadows');
    const yardAt = (z, force) => { so.player.z = z; g.updateCulling(!!force); return so.map.places[0].detail.visible; };
    so.map.places[0].detail.visible = false;
    assert.strictEqual(yardAt(18 + 29.5, true), true, 'shown under 30 m');
    assert.strictEqual(yardAt(18 + 32), true, 'kept until 34 m');
    assert.strictEqual(yardAt(18 + 35), false, 'hidden beyond 34 m');
    assert.strictEqual(yardAt(18 + 32), false, 'not shown again before 30 m');
    assert.strictEqual(yardAt(18 + 33), false, 'no re-evaluation under 2 m of movement');
    assert.strictEqual(yardAt(18 + 29), true, 'shown again under 30 m');
    // the deploy sub-line: 1.6 s at deploying, from the place's flavour
    const h2 = harness();
    h2.g.create(); h2.g.setPhase('briefing'); h2.g.start(null);
    assert.strictEqual(h2.g.subLine, C.zones[0].flavor.deployLine);
    h2.clock.advance(C.timing.approachMs);
    assert.strictEqual(h2.g.phase, 'engaging');
    assert.strictEqual(h2.g.subLine, C.zones[0].flavor.deployLine, 'still shown');
    h2.clock.advance(C.map.toastMs - C.timing.approachMs + 1);
    assert.strictEqual(h2.g.subLine, '', 'cleared after 1.6 s');
});

Promise.all(asyncTests).then(() => console.log('\n' + passed + ' Strike Ops tests passed'), error => { console.error(error); process.exit(1); });
