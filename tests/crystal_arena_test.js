// Focused tests for the Crystal Arena camera game.
// The production module exposes the pure colour tracker, the slot config, the
// theme adapter and a Vue component factory, so the whole decision logic and the
// learning lifecycle can be exercised without a browser or a camera.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const GAME_SOURCE = fs.readFileSync(path.join(ROOT, 'games/crystal-arena.js'), 'utf8');

let passed = 0;
let failed = 0;
function check(name, condition, extra) {
    if (condition) {
        passed += 1;
        console.log('  PASS', name);
    } else {
        failed += 1;
        console.log('  FAIL', name, extra === undefined ? '' : '| ' + extra);
    }
}

function makeThemeOptions() {
    const palette = (primary, secondary, tertiary, accent, background, text) => ({
        colors: {primary, secondary, tertiary, accent, background, text},
    });
    return {
        base: palette('#006064', '#78909c', '#B0E0E6', '#C0C0C0', '#F5F5F5', '#000000'),
        soldiers: palette('#4B5320', '#C0C0C0', '#BDB76B', '#FFD700', '#F0F0E0', '#000000'),
        unicorn: palette('#FF69B4', '#BA55D3', '#FFB6C1', '#FFD700', '#FFF0F5', '#4B0082'),
        space: palette('#1E90FF', '#000080', '#87CEEB', '#FFD700', '#000020', '#FFFFFF'),
        dark: palette('#121212', '#1E1E1E', '#2F4F4F', '#BB86FC', '#1C1C1C', '#E0E0E0'),
        code: palette('#00FF41', '#008F11', '#0D2818', '#39FF14', '#050A05', '#00FF41'),
    };
}

function makeGameContext() {
    let selectedTheme = 'base';
    const context = {
        console,
        setTimeout,
        clearTimeout,
        performance: {now: () => 0},
        globalThis: null,
        themeOptions: makeThemeOptions(),
        getLocalStorage: (key, fallback) => key === 'theme' ? selectedTheme : fallback,
        setLocalStorage: () => {},
        Vue: {
            extend: definition => definition,
            component: (name, definition) => definition,
        },
    };
    context.window = context;
    context.globalThis = context;
    context.setThemeForTest = key => { selectedTheme = key; };
    vm.createContext(context);
    vm.runInContext(GAME_SOURCE, context, {filename: 'games/crystal-arena.js'});
    return context;
}

const ctx = makeGameContext();

console.log('--- 1. slot configuration ---');
check('four corner slots are configured', ctx.CRYSTAL_ARENA_SLOTS.length === 4);
check('the shipped slot configuration is valid',
    ctx.validateCrystalArenaSlots(ctx.CRYSTAL_ARENA_SLOTS).length === 0,
    JSON.stringify(ctx.validateCrystalArenaSlots(ctx.CRYSTAL_ARENA_SLOTS)));
check('DOM order is the Hebrew reading order (top-right first)',
    ctx.CRYSTAL_ARENA_SLOTS.map(slot => slot.id).join(',') === 'tr,tl,br,bl');
check('every slot maps to a unique keyboard number 1-4',
    new Set(ctx.CRYSTAL_ARENA_SLOTS.map(slot => slot.key)).size === 4);
check('overlapping zones are rejected',
    ctx.validateCrystalArenaSlots([
        {id: 'tr', key: 1, x: [0, 1], y: [0, 1]},
        {id: 'tl', key: 2, x: [0, 1], y: [0, 1]},
        {id: 'br', key: 3, x: [0, 0.1], y: [0, 0.1]},
        {id: 'bl', key: 4, x: [0.9, 1], y: [0.9, 1]},
    ]).length > 0);
check('a wrong slot count is rejected', ctx.validateCrystalArenaSlots([{id: 'tr', key: 1, x: [0, 1], y: [0, 1]}]).length > 0);
// The crystals are aimed at, not numbered — but the shortcuts still work.
check('the crystals carry no number badge', GAME_SOURCE.indexOf('ca-crystal-key') === -1);
check('the 1-4 shortcuts are still announced to assistive tech',
    GAME_SOURCE.indexOf('aria-keyshortcuts') !== -1);
check('zones leave a free centre band so the body is not a corner',
    ctx.CRYSTAL_ARENA_SLOTS.every(slot => slot.x[1] - slot.x[0] <= 0.45 && slot.y[1] - slot.y[0] <= 0.45));

console.log('--- 2. colour tracker ---');
const TRACK_W = ctx.CRYSTAL_ARENA_TRACKER_DEFAULTS.width;
const TRACK_H = ctx.CRYSTAL_ARENA_TRACKER_DEFAULTS.height;
const PROP_HUE = 25;   // a vivid orange glove
const OTHER_HUE = 210; // a blue cushion in the same room

function hsvToRgb(hue, saturation, value) {
    const chroma = value * saturation;
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = value - chroma;
    let rgb;
    if (hue < 60) rgb = [chroma, x, 0];
    else if (hue < 120) rgb = [x, chroma, 0];
    else if (hue < 180) rgb = [0, chroma, x];
    else if (hue < 240) rgb = [0, x, chroma];
    else if (hue < 300) rgb = [x, 0, chroma];
    else rgb = [chroma, 0, x];
    return rgb.map(channel => Math.round((channel + m) * 255));
}

// A plain room: mid grey, no saturated colour anywhere.
function roomRgba(rgb) {
    const fill = rgb || [120, 118, 116];
    const data = new Uint8ClampedArray(TRACK_W * TRACK_H * 4);
    for (let index = 0; index < TRACK_W * TRACK_H; index += 1) {
        data[index * 4] = fill[0];
        data[index * 4 + 1] = fill[1];
        data[index * 4 + 2] = fill[2];
        data[index * 4 + 3] = 255;
    }
    return data;
}

function paintRect(data, left, top, width, height, rgb) {
    for (let y = top; y < top + height; y += 1) {
        for (let x = left; x < left + width; x += 1) {
            if (x < 0 || y < 0 || x >= TRACK_W || y >= TRACK_H) continue;
            const offset = (y * TRACK_W + x) * 4;
            data[offset] = rgb[0];
            data[offset + 1] = rgb[1];
            data[offset + 2] = rgb[2];
        }
    }
    return data;
}

// Places the prop inside one corner zone.
function propInCorner(slotId, hue) {
    const slot = ctx.CRYSTAL_ARENA_SLOTS.filter(item => item.id === slotId)[0];
    const rgb = hsvToRgb(hue === undefined ? PROP_HUE : hue, 0.85, 0.9);
    const width = 16;
    const height = 12;
    const left = Math.round((slot.x[0] + slot.x[1]) / 2 * TRACK_W - width / 2);
    const top = Math.round((slot.y[0] + slot.y[1]) / 2 * TRACK_H - height / 2);
    return paintRect(roomRgba(), left, top, width, height, rgb);
}

function holdFrames(tracker, frame, count, startTime) {
    let now = startTime || 0;
    let hit = null;
    let last = null;
    for (let index = 0; index < count; index += 1) {
        now += 33;
        last = tracker.ingest(frame, now);
        if (last.hit && !hit) hit = last.hit;
    }
    return {hit: hit, now: now, reading: last};
}

function trackerWithProp(hue) {
    const tracker = ctx.createCrystalArenaTracker();
    tracker.setProfile({hue: hue === undefined ? PROP_HUE : hue});
    return tracker;
}

console.log('  -- colour maths --');
const hsv = [0, 0, 0];
check('pure red reads as hue 0', ctx.crystalArenaHsv(255, 0, 0, hsv)[0] === 0);
check('pure green reads as hue 120', ctx.crystalArenaHsv(0, 255, 0, hsv)[0] === 120);
check('pure blue reads as hue 240', ctx.crystalArenaHsv(0, 0, 255, hsv)[0] === 240);
ctx.crystalArenaHsv(128, 128, 128, hsv);
check('grey has no saturation, so its hue is never trusted', hsv[1] === 0);
ctx.crystalArenaHsv(10, 8, 6, hsv);
check('near-black reports a low value', hsv[2] < 0.1);
check('hue distance wraps around the colour wheel', ctx.crystalArenaHueDistance(350, 10) === 20);
check('hue distance is symmetric', ctx.crystalArenaHueDistance(10, 350) === 20);
check('hue distance never exceeds half the wheel',
    [0, 45, 90, 180, 270, 359].every(hue => ctx.crystalArenaHueDistance(hue, 0) <= 180));

console.log('  -- calibration reads the object the player holds up --');
const box = {x: 0.36, y: 0.32, w: 0.28, h: 0.36};
const held = paintRect(roomRgba(), Math.round(0.40 * TRACK_W), Math.round(0.36 * TRACK_H), 18, 16, hsvToRgb(PROP_HUE, 0.9, 0.9));
const calibrated = ctx.crystalArenaDominantHue(held, TRACK_W, TRACK_H, box);
check('calibration finds the held object', !!calibrated);
check('calibration reports the object hue within a bin',
    calibrated && ctx.crystalArenaHueDistance(calibrated.hue, PROP_HUE) <= 12,
    calibrated && calibrated.hue.toFixed(1));
check('an empty grey frame calibrates to nothing',
    ctx.crystalArenaDominantHue(roomRgba(), TRACK_W, TRACK_H, box) === null);
check('an object outside the frame is not calibrated',
    ctx.crystalArenaDominantHue(propInCorner('tl'), TRACK_W, TRACK_H, box) === null);
const wallLit = ctx.crystalArenaDominantHue(
    roomRgba(hsvToRgb(OTHER_HUE, 0.8, 0.85)), TRACK_W, TRACK_H, box);
check('a strongly coloured wall still calibrates, to its own hue',
    wallLit && ctx.crystalArenaHueDistance(wallLit.hue, OTHER_HUE) <= 12);

console.log('  -- tracking and strikes --');
check('without a calibrated colour nothing ever fires',
    holdFrames(ctx.createCrystalArenaTracker(), propInCorner('tl'), 12).hit === null);

ctx.CRYSTAL_ARENA_SLOTS.forEach(slot => {
    const tracker = trackerWithProp();
    check(`the prop resting in ${slot.id} selects ${slot.id}`,
        holdFrames(tracker, propInCorner(slot.id), 10).hit === slot.id);
});

// The whole point of the colour switch: things that are not the prop cannot match.
check('an object of a different colour is ignored',
    holdFrames(trackerWithProp(), propInCorner('tl', OTHER_HUE), 12).hit === null);
check('a plain room never fires', holdFrames(trackerWithProp(), roomRgba(), 12).hit === null);
check('a dark shadow of the prop colour is too dim to match',
    holdFrames(trackerWithProp(), paintRect(roomRgba([30, 28, 26]),
        6, 6, 16, 12, hsvToRgb(PROP_HUE, 0.8, 0.12)), 12).hit === null);
check('a washed-out version of the prop colour is too grey to match',
    holdFrames(trackerWithProp(), paintRect(roomRgba(),
        6, 6, 16, 12, hsvToRgb(PROP_HUE, 0.10, 0.9)), 12).hit === null);
check('a wall painted the prop colour is refused instead of firing everywhere',
    holdFrames(trackerWithProp(), roomRgba(hsvToRgb(PROP_HUE, 0.85, 0.9)), 12).hit === null);

console.log('  -- dwell, re-arm and cooldown --');
let tracker = trackerWithProp();
const frame = propInCorner('tr');
let reading = null;
let firedAt = 0;
for (let index = 1; index <= ctx.CRYSTAL_ARENA_TRACKER_DEFAULTS.dwellFrames + 2; index += 1) {
    reading = tracker.ingest(frame, index * 33);
    if (reading.hit && !firedAt) firedAt = index;
}
check('a passing flick does not fire before the dwell time',
    firedAt >= ctx.CRYSTAL_ARENA_TRACKER_DEFAULTS.dwellFrames, firedAt);
check('dwell progress is reported for the charging ring',
    reading.dwell > 0 && reading.dwell <= 1, reading.dwell);

tracker = trackerWithProp();
const first = holdFrames(tracker, propInCorner('tr'), 10);
check('resting in a corner fires once', first.hit === 'tr');
const parked = holdFrames(tracker, propInCorner('tr'), 40, first.now);
check('leaving the prop parked in the corner does not fire again', parked.hit === null);
const away = holdFrames(tracker, roomRgba(), 6, parked.now);
check('taking the prop away does not fire', away.hit === null);
const again = holdFrames(tracker, propInCorner('tr'), 10, away.now + 2000);
check('bringing it back to the same corner fires again', again.hit === 'tr');

tracker = trackerWithProp();
const leftCorner = holdFrames(tracker, propInCorner('tl'), 10);
const rightCorner = holdFrames(tracker, propInCorner('br'), 10, leftCorner.now + 2000);
check('moving to a different corner selects that corner', rightCorner.hit === 'br');

// Everything below guards against the *wrong* corner being answered. The player
// reported occasional wrong detections, so each gate here has its own case.
console.log('  -- strictness: what must never answer --');

// Paints the prop centred on a point given in frame coordinates (0-1).
function propAt(nx, ny, hue, wide, tall) {
    const width = wide || 16;
    const height = tall || 12;
    const rgb = hsvToRgb(hue === undefined ? PROP_HUE : hue, 0.85, 0.9);
    return paintRect(roomRgba(),
        Math.round(nx * TRACK_W - width / 2), Math.round(ny * TRACK_H - height / 2), width, height, rgb);
}
function paintProp(data, nx, ny, hue, wide, tall) {
    const width = wide || 16;
    const height = tall || 12;
    return paintRect(data,
        Math.round(nx * TRACK_W - width / 2), Math.round(ny * TRACK_H - height / 2),
        width, height, hsvToRgb(hue === undefined ? PROP_HUE : hue, 0.85, 0.9));
}

const trSlot = ctx.CRYSTAL_ARENA_SLOTS.filter(slot => slot.id === 'tr')[0];
const trHit = ctx.crystalArenaHitBox(trSlot, ctx.CRYSTAL_ARENA_TRACKER_DEFAULTS.hitMargin);
check('the hit box keeps the outer edges pinned to the frame',
    trHit.x[1] === trSlot.x[1] && trHit.y[0] === trSlot.y[0], JSON.stringify(trHit));
check('the hit box pulls the inner edges away from the centre band',
    trHit.x[0] > trSlot.x[0] && trHit.y[1] < trSlot.y[1], JSON.stringify(trHit));
check('an object grazing the inner edge of a corner does not answer',
    holdFrames(trackerWithProp(), propAt(0.58, 0.20), 14).hit === null);
check('the same object properly inside that corner does answer',
    holdFrames(trackerWithProp(), propAt(0.72, 0.20), 14).hit === 'tr');

check('a hue a little off the calibrated colour no longer matches',
    holdFrames(trackerWithProp(), propInCorner('tl', PROP_HUE + 20), 14).hit === null);
check('a hue well within tolerance still matches',
    holdFrames(trackerWithProp(), propInCorner('tl', PROP_HUE + 8), 14).hit === 'tl');

const twoProps = paintProp(propAt(0.78, 0.20), 0.22, 0.20);
check('two same-coloured objects in different corners answer neither',
    holdFrames(trackerWithProp(), twoProps, 16).hit === null);
const propAndSpeck = paintProp(propAt(0.78, 0.20), 0.22, 0.20, undefined, 6, 5);
check('a small reflection elsewhere does not block the real object',
    holdFrames(trackerWithProp(), propAndSpeck, 16).hit === 'tr');

// A leap across the frame is a different object, so its dwell starts over.
const dwellNeeded = ctx.CRYSTAL_ARENA_TRACKER_DEFAULTS.dwellFrames;
tracker = trackerWithProp();
const nearlyThere = holdFrames(tracker, propAt(0.66, 0.34), dwellNeeded - 1);
check('the object is one frame short of answering', nearlyThere.hit === null);
const teleported = tracker.ingest(propAt(0.94, 0.06), nearlyThere.now + 33);
check('an object that jumps across the same corner does not inherit its dwell',
    teleported.hit === null && teleported.dwell === 0, teleported.dwell);
check('holding the jumped-to position still answers normally',
    holdFrames(tracker, propAt(0.94, 0.06), dwellNeeded, nearlyThere.now + 33).hit === 'tr');

// Calibrating on a box full of different colours is what produced profiles that
// later matched half the room.
const jumble = roomRgba();
for (let x = 0; x < TRACK_W; x += 1) {
    const rgb = hsvToRgb((x * 360 / TRACK_W) % 360, 0.85, 0.9);
    for (let y = 0; y < TRACK_H; y += 1) {
        const offset = (y * TRACK_W + x) * 4;
        jumble[offset] = rgb[0];
        jumble[offset + 1] = rgb[1];
        jumble[offset + 2] = rgb[2];
    }
}
check('a calibration box holding many colours is refused',
    ctx.crystalArenaDominantHue(jumble, TRACK_W, TRACK_H, box) === null);
check('a calibration box holding one vivid colour reports its strength',
    calibrated.strength >= ctx.CRYSTAL_ARENA_TRACKER_DEFAULTS.minHueStrength, calibrated.strength);

console.log('  -- the marker follows the prop --');
tracker = trackerWithProp();
const centred = holdFrames(tracker, propInCorner('bl'), 8);
check('the tracker reports a target position', !!centred.reading.target);
check('the target sits in the corner the prop is in',
    centred.reading.target.x < 0.5 && centred.reading.target.y > 0.5,
    JSON.stringify(centred.reading.target));
check('the match mask is exposed for the on-screen overlay',
    centred.reading.mask && centred.reading.mask.length === TRACK_W * TRACK_H);
const lost = tracker.ingest(roomRgba(), centred.now + 33);
check('the target clears when the prop leaves the frame', lost.target === null);
check('a malformed frame is ignored',
    trackerWithProp().ingest(new Uint8ClampedArray(8), 0).hit === null);
tracker = trackerWithProp();
holdFrames(tracker, propInCorner('tl'), 6);
tracker.reset();
check('reset clears the tracker between rounds', tracker.frameCount() === 0);
check('reset keeps the calibrated colour', !!tracker.getProfile());
tracker.setProfile(null);
check('clearing the profile stops all tracking', tracker.getProfile() === null);

// The whole reason this section exists: one calibrated hue is one object under
// one light. Turn the prop over, carry it through the shadow of your own body,
// let the webcam re-balance when a cloud passes, and the same object reads
// several degrees off and a good deal duller — and the envelope that was tight
// enough to reject the room was tight enough to drop the prop.
console.log('  -- keeping hold of the object when the light changes --');
const DEFAULTS = ctx.CRYSTAL_ARENA_TRACKER_DEFAULTS;
const DRIFT_HUE = PROP_HUE + 26; // past the 18° core, still inside the halo

function litProp(nx, ny, hue, sat, val, wide, tall) {
    const width = wide || 16;
    const height = tall || 12;
    return paintRect(roomRgba(),
        Math.round(nx * TRACK_W - width / 2), Math.round(ny * TRACK_H - height / 2),
        width, height, hsvToRgb(hue, sat, val));
}
// Walks the prop from one place to another in small steps while its colour
// shifts along the way: a player carrying the object out of the light and into
// a corner, which is the motion that used to lose it.
function carry(tracker, from, to, steps, startTime) {
    let now = startTime || 0;
    let last = null;
    let hit = null;
    for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        const between = key => from[key] + (to[key] - from[key]) * t;
        now += 33;
        last = tracker.ingest(
            litProp(between('x'), between('y'), between('hue'), between('sat'), between('val')), now);
        if (last.hit && !hit) hit = last.hit;
    }
    return {reading: last, now: now, hit: hit};
}
const LIT = {x: 0.5, y: 0.5, hue: PROP_HUE, sat: 0.85, val: 0.9};
const DRIFTED = {x: 0.78, y: 0.20, hue: DRIFT_HUE, sat: 0.85, val: 0.9};
const SHADED = {x: 0.22, y: 0.80, hue: PROP_HUE + 8, sat: 0.30, val: 0.34};

// A colour on its own still proves nothing — the halo never answers by itself.
check('an object of a drifted colour, on its own, never answers',
    holdFrames(trackerWithProp(), litProp(0.78, 0.20, DRIFT_HUE, 0.85, 0.9), 20).hit === null);
const ghosted = holdFrames(trackerWithProp(), litProp(0.78, 0.20, DRIFT_HUE, 0.85, 0.9), 6);
check('but the marker still follows it, so the player is never left blind',
    !!ghosted.reading.target && ghosted.reading.ghost === true);
check('and the tracker says so, rather than claiming a match',
    ghosted.reading.dwell === 0 && ghosted.reading.adapted === false);

// The repair: moving there continuously is what identifies the object.
tracker = trackerWithProp();
holdFrames(tracker, propAt(LIT.x, LIT.y), 6);
const carried = carry(tracker, LIT, DRIFTED, 10);
check('carrying the prop into different light teaches the tracker its new look',
    tracker.getModel().hi >= 26, tracker.getModel().hi);
check('so the corner it was carried to answers',
    carried.hit === 'tr' ||
    holdFrames(tracker, litProp(DRIFTED.x, DRIFTED.y, DRIFT_HUE, 0.85, 0.9), 10, carried.now).hit === 'tr');
check('the learned envelope stays inside its hard limit',
    tracker.getModel().hi <= DEFAULTS.maxHueTolerance, tracker.getModel().hi);

tracker = trackerWithProp();
holdFrames(tracker, propAt(LIT.x, LIT.y), 6);
const shaded = carry(tracker, LIT, SHADED, 10);
check('a prop carried into shadow is learned by its dimmer look too',
    tracker.getModel().sat < DEFAULTS.minSaturation, tracker.getModel().sat);
check('and answers from the shadowed corner',
    shaded.hit === 'bl' ||
    holdFrames(tracker, litProp(SHADED.x, SHADED.y, SHADED.hue, SHADED.sat, SHADED.val), 10, shaded.now).hit === 'bl');
check('the saturation floor never drops past its hard limit',
    tracker.getModel().sat >= DEFAULTS.minSaturationFloor, tracker.getModel().sat);
check('even after adapting, a washed-out object is still refused',
    holdFrames(tracker, litProp(0.78, 0.20, PROP_HUE, 0.10, 0.9), 14).hit === null);
check('even after adapting, a dark shadow of the prop colour is still refused',
    holdFrames(tracker, litProp(0.78, 0.20, PROP_HUE, 0.8, 0.10), 14).hit === null);

// Continuity is the evidence. Without it, a second object of a nearby colour is
// exactly what the tracker must not adopt.
tracker = trackerWithProp();
const proven = holdFrames(tracker, propInCorner('bl'), 8);
const elsewhere = holdFrames(tracker, litProp(0.78, 0.20, DRIFT_HUE, 0.85, 0.9), 20, proven.now + 2000);
check('a drifted colour that appears somewhere else instead of moving there teaches nothing',
    elsewhere.hit === null && tracker.getModel().hi === tracker.getModel().base.hi,
    tracker.getModel().hi);

tracker = trackerWithProp();
holdFrames(tracker, propAt(LIT.x, LIT.y), 6);
carry(tracker, LIT, {x: 0.78, y: 0.20, hue: PROP_HUE + 70, sat: 0.85, val: 0.9}, 12);
check('a colour that leaves the halo altogether breaks the chain instead of being learned',
    tracker.getModel().hi <= DEFAULTS.maxHueTolerance && tracker.getModel().hi < 70,
    tracker.getModel().hi);

// A lesson must not outlive the light it was learned under.
tracker = trackerWithProp();
holdFrames(tracker, propAt(LIT.x, LIT.y), 6);
const taught = carry(tracker, LIT, DRIFTED, 10);
check('the model reports that it has adapted', tracker.getModel().adapted === true);
const idle = holdFrames(tracker, roomRgba(), 200, taught.now);
check('what was learned unwinds once the object is gone for good',
    tracker.getModel().adapted === false &&
    tracker.getModel().hi === tracker.getModel().base.hi, tracker.getModel().hi);
check('the widened envelope is not what re-arms the corner', idle.hit === null);

tracker = trackerWithProp();
holdFrames(tracker, propAt(LIT.x, LIT.y), 6);
const widened = carry(tracker, LIT, DRIFTED, 10);
const flooded = holdFrames(tracker, roomRgba(hsvToRgb(DRIFT_HUE, 0.85, 0.9)), 3, widened.now);
check('a widening that turns out to match the wall is thrown away on the spot',
    flooded.hit === null && tracker.getModel().adapted === false);

// The overlay has to show the difference, since "it is still following me" is
// the only feedback the player gets while the model is catching up.
tracker = trackerWithProp();
const twoTone = litProp(0.5, 0.5, PROP_HUE, 0.85, 0.9);
paintRect(twoTone, Math.round(0.5 * TRACK_W), Math.round(0.5 * TRACK_H - 6), 8, 12,
    hsvToRgb(DRIFT_HUE, 0.85, 0.9));
const mixed = tracker.ingest(twoTone, 33);
check('the mask marks sure pixels and maybe-pixels apart',
    Array.prototype.indexOf.call(mixed.mask, 2) !== -1 &&
    Array.prototype.indexOf.call(mixed.mask, 1) !== -1);
check('the overlay draws both levels', GAME_SOURCE.indexOf('mask[index] === 2 ? alpha') !== -1);

// The label studio calls the blob finder without a probe.
const plainMask = new Uint8Array(TRACK_W * TRACK_H);
for (let y = 4; y < 10; y += 1) {
    for (let x = 4; x < 10; x += 1) plainMask[y * TRACK_W + x] = 1;
}
const plainBlobs = ctx.crystalArenaFindBlobs(plainMask, TRACK_W, TRACK_H, 4, 4);
check('the blob finder still works without the measuring probe',
    plainBlobs.length === 1 && plainBlobs[0].pixels === 36);
check('an unprobed blob still reports its centroid',
    Math.abs(plainBlobs[0].x - 6.5 / TRACK_W) < 0.01);


console.log('--- 2d. the guided opening marks a spot per step ---');
const steps = ctx.CRYSTAL_ARENA_CALIBRATION_STEPS;
check('the opening starts by reading the colour', steps[0].kind === 'colour');
check('every corner gets its own step',
    steps.filter(s => s.kind === 'corner').map(s => s.slot).sort().join(',') === 'bl,br,tl,tr');
check('there is exactly one step per corner plus the colour step',
    steps.length === ctx.CRYSTAL_ARENA_SLOTS.length + 1);
check('every marked spot sits inside the frame',
    steps.every(s => s.x > 0 && s.x < 1 && s.y > 0 && s.y < 1));
check('each corner spot sits inside the zone it belongs to',
    steps.filter(s => s.kind === 'corner').every(step => {
        const slot = ctx.CRYSTAL_ARENA_SLOTS.filter(item => item.id === step.slot)[0];
        return step.x >= slot.x[0] && step.x <= slot.x[1] && step.y >= slot.y[0] && step.y <= slot.y[1];
    }));
check('every step carries copy for the card', steps.every(s => !!s.title && !!s.hint));
check('the hue box stays inside the frame wherever the spot is',
    steps.every(step => {
        const area = ctx.crystalArenaCalibrationBox(step);
        return area.x >= 0 && area.y >= 0 && area.x + area.w <= 1.0001 && area.y + area.h <= 1.0001;
    }));

// Walking the whole opening: colour first, then each corner in turn.
// Section 4 rebuilds the definition with the learning stubs; this one only needs
// the calibration methods.
const openingDefinition = ctx.createCrystalArenaComponent({});
const openingMethods = openingDefinition.methods;
function calibrationHarness() {
    const saved = {};
    const instance = Object.assign(openingDefinition.data(), {
        gameState: 'calibrating',
        inputMode: 'camera',
        cameraState: 'live',
        _destroyedCa: false,
        _tracker: ctx.createCrystalArenaTracker(),
        _stepStartedCa: 0,
        savedForTest: saved,
        paintMatchMask() {},
        paintTarget() {},
        prepareRound() { saved.prepared = (saved.prepared || 0) + 1; },
        later(callback) { callback(); },
        isCurrentRoute: () => true,
        stepCalibration: openingMethods.stepCalibration,
        readCalibrationColour: openingMethods.readCalibrationColour,
        checkCalibrationCorner: openingMethods.checkCalibrationCorner,
        acceptCalibration: openingMethods.acceptCalibration,
        advanceCalibration: openingMethods.advanceCalibration,
        applyColourProfile: openingMethods.applyColourProfile,
        skipCalibrationRest: openingMethods.skipCalibrationRest,
        finishCalibration: openingMethods.finishCalibration,
    });
    return instance;
}

const opening = calibrationHarness();
const centreSpot = paintRect(roomRgba(),
    Math.round((steps[0].x - 0.08) * TRACK_W), Math.round((steps[0].y - 0.08) * TRACK_H),
    16, 12, hsvToRgb(PROP_HUE, 0.9, 0.9));
for (let frame = 0; frame < 30 && opening.calibrationStep === 0; frame += 1) {
    opening.stepCalibration(centreSpot, frame * 33);
}
check('leaving the object on the first spot captures the colour',
    !!opening.colourProfile && ctx.crystalArenaHueDistance(opening.colourProfile.hue, PROP_HUE) <= 14,
    opening.colourProfile && opening.colourProfile.hue);
check('capturing the colour advances to the first corner',
    opening.calibrationStep === 1 && steps[1].kind === 'corner');

let clock = 2000;
steps.slice(1).forEach(step => {
    const frame = propInCorner(step.slot);
    for (let index = 0; index < 20 && opening.calibrationCurrent === undefined; index += 1) { /* no-op */ }
    const before = opening.calibrationStep;
    for (let index = 0; index < 20 && opening.calibrationStep === before; index += 1) {
        clock += 33;
        opening.stepCalibration(frame, clock);
    }
    check('the ' + step.slot + ' corner confirms when the object rests on its spot',
        opening.calibrationDone.indexOf(step.slot) !== -1);
});
check('finishing every step starts the first round', opening.savedForTest.prepared === 1);

// A corner that never sees the object must not trap the player.
const stuck = calibrationHarness();
stuck.calibrationStep = 1;
stuck.colourProfile = {hue: PROP_HUE, tolerance: 22};
stuck._tracker.setProfile(stuck.colourProfile);
for (let frame = 0; frame < 40; frame += 1) stuck.stepCalibration(roomRgba(), frame * 200);
check('a corner the object never reaches does not advance by itself', stuck.calibrationStep === 1);
check('after a while the card offers help instead of just waiting', stuck.calibrationNudge === true);
stuck.skipCalibrationRest();
check('the corner checks can always be skipped once the colour is known',
    stuck.savedForTest.prepared === 1);

const noColour = calibrationHarness();
noColour.colourProfile = null;
noColour.skipCalibrationRest();
check('the colour step itself cannot be skipped', !noColour.savedForTest.prepared);

// The <video> is `object-fit: cover`, so it shows a CROP of the camera frame.
// Sampling the whole frame tracked a picture the player could not see.
console.log('--- 2e. the sampler reads the picture the player can see ---');
const crop = ctx.crystalArenaCoverCrop;
check('a box of the same shape crops nothing',
    JSON.stringify(crop(640, 480, 800, 600)) === JSON.stringify({x: 0, y: 0, width: 640, height: 480}));
const wideCrop = crop(640, 480, 1180, 650);
check('a 4:3 feed in a wide box loses the top and bottom',
    wideCrop.x === 0 && wideCrop.width === 640 && wideCrop.height < 480, JSON.stringify(wideCrop));
check('the wide crop is centred',
    Math.abs(wideCrop.y - (480 - wideCrop.height) / 2) < 0.001, JSON.stringify(wideCrop));
const phoneCrop = crop(640, 480, 390, 780);
check('a 4:3 feed in a portrait phone box loses the sides',
    phoneCrop.y === 0 && phoneCrop.height === 480 && phoneCrop.width < 640, JSON.stringify(phoneCrop));
check('a frame or a box with no size falls back to the whole frame',
    crop(640, 480, 0, 0).width === 640 && crop(0, 0, 390, 780).width === 0);

// Why this mattered: on a phone the whole visible picture used to land in the
// middle of sample space, where the corner zones barely reach.
const visibleLeft = phoneCrop.x / 640;
const visibleRight = (phoneCrop.x + phoneCrop.width) / 640;
check('the visible picture used to occupy only the middle of sample space',
    visibleLeft > 0.30 && visibleRight < 0.70,
    visibleLeft.toFixed(3) + ' .. ' + visibleRight.toFixed(3));
const reachThen = (visibleRight - trHit.x[0]) / (visibleRight - visibleLeft);
const reachNow = 1 - trHit.x[0];
check('cropping like the video gives a corner far more of the screen to answer from',
    reachNow > reachThen * 1.5, reachThen.toFixed(2) + ' -> ' + reachNow.toFixed(2) + ' of the width');

const samplerDefinition = ctx.createCrystalArenaComponent({});
const drawCalls = [];
const sampled = Object.assign(samplerDefinition.data(), {
    readColourFrame: samplerDefinition.methods.readColourFrame,
    _sampleCtx: {
        save() {}, restore() {}, setTransform() {},
        drawImage: function () { drawCalls.push(Array.prototype.slice.call(arguments, 1)); },
        getImageData: () => ({data: new Uint8ClampedArray(96 * 72 * 4)}),
    },
    $refs: {
        video: {readyState: 4, videoWidth: 640, videoHeight: 480, clientWidth: 390, clientHeight: 780},
        sampler: {width: 96, height: 72},
    },
});
const sampledData = sampled.readColourFrame();
check('the sampler returns frame data', !!sampledData && sampledData.length === 96 * 72 * 4);
check('the sampler passes a source rectangle instead of stretching the whole frame',
    drawCalls.length === 1 && drawCalls[0].length === 8, JSON.stringify(drawCalls[0]));
check('the sampled rectangle is exactly the crop the video displays',
    drawCalls[0][0] === phoneCrop.x && drawCalls[0][1] === phoneCrop.y
    && drawCalls[0][2] === phoneCrop.width && drawCalls[0][3] === phoneCrop.height,
    JSON.stringify(drawCalls[0]));

// The built-in zones are whole quadrants, far bigger than the drawn crystals, so
// an object entering a quadrant answered long before it reached the crystal.
console.log('--- 2f. the hit zone is the crystal the player aims at ---');
function domRect(left, top, right, bottom) {
    return {left: left, top: top, right: right, bottom: bottom,
        width: right - left, height: bottom - top};
}
const stageRect = domRect(0, 0, 1000, 600);
// Laid out like the real arena: slot order is tr, tl, br, bl.
const crystalRects = [
    domRect(790, 60, 990, 234), domRect(10, 60, 210, 234),
    domRect(790, 366, 990, 540), domRect(10, 366, 210, 540),
];
const zonesDefinition = ctx.createCrystalArenaComponent({});
const zonesMethods = zonesDefinition.methods;
function measuring(rects, root) {
    return Object.assign(zonesDefinition.data(), {
        measureSlotZones: zonesMethods.measureSlotZones,
        refreshSlotZones: zonesMethods.refreshSlotZones,
        $refs: {
            root: {getBoundingClientRect: () => root || stageRect},
            slotButtons: rects.map(rect => ({getBoundingClientRect: () => rect})),
        },
    });
}
const measured = measuring(crystalRects).measureSlotZones();
check('every crystal is measured, in slot order',
    measured && measured.map(zone => zone.id).join(',') === 'tr,tl,br,bl',
    JSON.stringify(measured && measured.map(z => z.id)));
check('a crystal box becomes frame coordinates',
    Math.abs(measured[0].x[0] - 0.79) < 0.001 && Math.abs(measured[0].y[1] - 0.39) < 0.001,
    JSON.stringify(measured[0]));
check('the measured crystal is far smaller than the quadrant it sits in',
    (measured[0].x[1] - measured[0].x[0]) < (trSlot.x[1] - trSlot.x[0]) / 2);
check('overlapping rectangles are refused rather than shadowing a corner',
    measuring([domRect(0, 0, 900, 500)].concat(crystalRects.slice(1))).measureSlotZones() === null);
check('a page with no layout yet is refused',
    measuring(crystalRects, domRect(0, 0, 0, 0)).measureSlotZones() === null);
check('a missing crystal is refused', measuring(crystalRects.slice(0, 3)).measureSlotZones() === null);

const applied = [];
const refresher = measuring(crystalRects);
refresher._tracker = {setSlots: (zones, margin) => applied.push({count: zones.length, margin: margin})};
refresher.refreshSlotZones(10000);
refresher.refreshSlotZones(20000);
check('the measured zones reach the tracker with no inset',
    applied.length === 1 && applied[0].count === 4 && applied[0].margin === 0, JSON.stringify(applied));
check('an unchanged layout is not re-applied, so the dwell is never reset',
    applied.length === 1, applied.length);
check('the measured zones are published for the guided spot to follow',
    refresher.slotZones && refresher.slotZones.length === 4);

// The behaviour the player reported: answering on the way to the crystal.
const zoned = trackerWithProp();
zoned.setSlots(measured, 0);
check('an object inside the quadrant but not on the crystal no longer answers',
    holdFrames(zoned, propAt(0.65, 0.25), 16).hit === null);
const onCrystal = trackerWithProp();
onCrystal.setSlots(measured, 0);
check('an object on the crystal answers that crystal',
    holdFrames(onCrystal, propAt(0.89, 0.24), 16).hit === 'tr');
check('the default quadrants stay as the pre-layout fallback',
    trackerWithProp().getZones().length === 4 &&
    trackerWithProp().getZones()[0].x[0] < measured[0].x[0]);

console.log('--- 3. all real themes resolve through one adapter ---');
Object.keys(makeThemeOptions()).forEach(key => {
    ctx.setThemeForTest(key);
    const resolved = ctx.resolveCrystalArenaTheme();
    check(`${key} theme resolves`, resolved.key === key);
    check(`${key} exposes semantic arena tokens`,
        !!resolved.css['--ca-scrim'] && !!resolved.css['--ca-plate'] &&
        !!resolved.css['--ca-correct'] && !!resolved.css['--ca-wrong'] &&
        !!resolved.motif.crystal && Array.isArray(resolved.motif.particles));
});
ctx.setThemeForTest('unknown');
check('unknown theme safely falls back to base', ctx.resolveCrystalArenaTheme().key === 'base');
ctx.setThemeForTest('base');

console.log('--- 4. rounds are generated once per question ---');
let generated = 0;
let actionPlayed = 0;
ctx.generateFromList = () => {
    generated += 1;
    return {question: 'Q', result: 'A', options: ['A', 'B', 'C', 'D'], action: () => { actionPlayed += 1; }, questionIndex: 2};
};
ctx.getSetItems = () => 4;
ctx.updateWeightForKey = () => {};
ctx.successSound = {play() {}};
ctx.failureSound = {play() {}};

const definition = ctx.createCrystalArenaComponent({});
const methods = definition.methods;

function roundHarness(extra) {
    let pending = [];
    const instance = Object.assign(definition.data(), {
        currentApp: {listName: 'LIST', questionIndex: 'q', resultIndex: 'a'},
        currentAppId: '0_0',
        _destroyedCa: false,
        _tracker: ctx.createCrystalArenaTracker(),
        shuffle: values => values,
        $set(target, key, value) { target[key] = value; },
        $nextTick(callback) { callback(); },
        later(callback) { pending.push(callback); },
        focusFirstCrystal() {},
        prepareRound: methods.prepareRound,
    }, extra || {});
    return {instance, run: () => { const queued = pending; pending = []; queued.forEach(callback => callback()); }};
}

const round = roundHarness();
methods.prepareRound.call(round.instance);
check('preparing a round generates exactly one question', generated === 1, generated);
check('the question action plays once', actionPlayed === 1, actionPlayed);
check('all four options are placed, one per corner',
    ctx.CRYSTAL_ARENA_SLOTS.every(slot => typeof round.instance.optionBySlot[slot.id] === 'string') &&
    new Set(Object.values(round.instance.optionBySlot)).size === 4,
    JSON.stringify(round.instance.optionBySlot));
check('input stays locked until the round has settled', round.instance.inputLocked === true);
round.run();
check('the round opens for input after settling',
    round.instance.gameState === 'waitingForAnswer' && round.instance.inputLocked === false);

console.log('--- 5. accepted answers report exactly once ---');
const reports = [];
ctx.updateWeightForKey = (key, index, change) => reports.push({key, index, change});

function answerHarness(correctResult, options) {
    let pending = [];
    let reloads = 0;
    let prepared = 0;
    const instance = Object.assign(definition.data(), {
        gameState: 'waitingForAnswer',
        inputLocked: false,
        currentQuestion: {result: correctResult},
        optionBySlot: options,
        currentApp: {},
        currentAppId: '0_0',
        questionIndex: 3,
        score: 4,
        _destroyedCa: false,
        _tracker: ctx.createCrystalArenaTracker(),
        $set(target, key, value) { target[key] = value; },
        saveScore() {},
        getSuccessMsg() { return 'ok'; },
        later(callback) { pending.push(callback); },
        reloadProgress() { reloads += 1; return true; },
        focusFirstCrystal() {},
        spawnShards: methods.spawnShards,
        acceptCorrect: methods.acceptCorrect,
        acceptWrong: methods.acceptWrong,
        prepareRound() { prepared += 1; },
    });
    return {
        instance,
        run: () => { const queued = pending; pending = []; queued.forEach(callback => callback()); },
        reloads: () => reloads,
        prepared: () => prepared,
    };
}

const options = {tr: 'A', tl: 'B', br: 'C', bl: 'D'};

reports.length = 0;
const correct = answerHarness('A', options);
methods.strike.call(correct.instance, 'tr', 'pointer');
methods.strike.call(correct.instance, 'tr', 'pointer');
methods.strike.call(correct.instance, 'tl', 'camera');
check('repeated strikes report one success', reports.length === 1 && reports[0].change === -1, JSON.stringify(reports));
check('a correct strike scores once and calls reloadProgress once',
    correct.instance.score === 5 && correct.reloads() === 1);
check('the correct crystal shatters', correct.instance.reactions.tr === 'shattered');
correct.run();
check('the next round is prepared after the shatter beat', correct.prepared() === 1, correct.prepared());

reports.length = 0;
const wrong = answerHarness('A', options);
methods.strike.call(wrong.instance, 'tl', 'pointer');
methods.strike.call(wrong.instance, 'tl', 'pointer');
check('repeated strikes report one failure', reports.length === 1 && reports[0].change === 1, JSON.stringify(reports));
check('a wrong strike floors the score at zero or lower bound', wrong.instance.score === 3);
wrong.run();
check('a wrong strike returns to the same question',
    wrong.instance.gameState === 'waitingForAnswer' &&
    wrong.instance.inputLocked === false &&
    wrong.instance.currentQuestion.result === 'A');
check('the wrong crystal is spent and cannot be struck again', wrong.instance.spent.tl === true);
methods.strike.call(wrong.instance, 'tl', 'pointer');
check('a spent crystal reports nothing further', reports.length === 1, JSON.stringify(reports));
check('no extra round was prepared by a wrong answer', wrong.prepared() === 0);

const completing = answerHarness('A', options);
completing.instance.reloadProgress = () => false;
methods.strike.call(completing.instance, 'tr', 'pointer');
completing.run();
check('a false reloadProgress stops the arena instead of continuing', completing.prepared() === 0);

console.log('--- 6. camera is an optional enhancement ---');
const noCamera = Object.assign(definition.data(), {
    _destroyedCa: false,
    gameState: 'intro',
    cameraState: 'off',
    releaseCamera() { this._released = true; },
    failCamera: methods.failCamera,
    later(callback) { callback(); },
    isCurrentRoute: () => true,
});
// Node has a `navigator` global without `mediaDevices`, which is exactly the
// shape of a browser that cannot open a camera.
methods.startCamera.call(noCamera);
check('a browser without mediaDevices downgrades to manual mode with a notice',
    noCamera.inputMode === 'manual' && noCamera.cameraState === 'off' && !!noCamera.cameraNotice);
check('the downgrade keeps the game on the intro rather than blocking it', noCamera.gameState === 'intro');

// An app served over plain http has no navigator.mediaDevices at all; blaming the
// browser would send the user hunting through settings that cannot help.
ctx.window.isSecureContext = false;
ctx.navigator = {};
check('an insecure origin explains that HTTPS is required',
    /https/i.test(ctx.crystalArenaCameraBlocker() || ''), ctx.crystalArenaCameraBlocker());
ctx.window.isSecureContext = true;
check('a secure context without getUserMedia blames the browser, not the origin',
    !!ctx.crystalArenaCameraBlocker() && !/https/i.test(ctx.crystalArenaCameraBlocker()));
ctx.navigator = {mediaDevices: {getUserMedia: () => Promise.resolve({})}};
check('a usable camera API reports no blocker', ctx.crystalArenaCameraBlocker() === null);

check('a denied permission explains how to re-grant it',
    /הרשאה/.test(ctx.crystalArenaCameraErrorNotice({name: 'NotAllowedError'})));
check('a missing device is distinguished from a denied permission',
    ctx.crystalArenaCameraErrorNotice({name: 'NotFoundError'}) !==
    ctx.crystalArenaCameraErrorNotice({name: 'NotAllowedError'}));
check('a camera held by another app gets its own message',
    /תפוסה/.test(ctx.crystalArenaCameraErrorNotice({name: 'NotReadableError'})));
check('an unknown failure still produces a playable-without-camera message',
    /בלחיצות/.test(ctx.crystalArenaCameraErrorNotice({name: 'WeirdError'})));

// Toggling the camera mid-round must never discard the question on screen.
function midRoundHarness(gameState) {
    let prepared = 0;
    const instance = Object.assign(definition.data(), {
        _destroyedCa: false,
        gameState: gameState,
        cameraState: 'off',
        currentQuestion: {result: 'A'},
        optionBySlot: {tr: 'A', tl: 'B', br: 'C', bl: 'D'},
        _tracker: ctx.createCrystalArenaTracker(),
        $refs: {},
        isCurrentRoute: () => true,
        later: callback => callback(),
        beginCalibration() { prepared += 1; },
        releaseCamera() {},
        clearCornerEnergy() {},
        failCamera: methods.failCamera,
        attachStream: methods.attachStream,
    });
    return {instance, calibrations: () => prepared};
}

const granted = midRoundHarness('waitingForAnswer');
granted.instance._resumeStateCa = 'waitingForAnswer';
methods.attachStream.call(granted.instance, {getVideoTracks: () => []});
check('granting the camera mid-round keeps the same question',
    granted.instance.gameState === 'waitingForAnswer' &&
    granted.instance.currentQuestion.result === 'A' &&
    granted.calibrations() === 0);
check('granting the camera mid-round switches input mode to camera',
    granted.instance.inputMode === 'camera' && granted.instance.cameraState === 'live');

const refused = midRoundHarness('waitingForAnswer');
refused.instance._resumeStateCa = 'waitingForAnswer';
methods.failCamera.call(refused.instance, 'nope');
check('refusing the camera mid-round returns to the same round, not the intro',
    refused.instance.gameState === 'waitingForAnswer' && refused.instance.inputMode === 'manual');
check('a mid-round failure surfaces a notice the player can see',
    refused.instance.cameraNotice === 'nope');
methods.dismissNotice.call(refused.instance);
check('the notice can be dismissed', refused.instance.cameraNotice === '');

const fromIntro = midRoundHarness('requestingCamera');
methods.failCamera.call(fromIntro.instance, 'nope');
check('refusing from the intro stays on the intro', fromIntro.instance.gameState === 'intro');

check('every play state is one the round machine actually uses',
    ctx.CRYSTAL_ARENA_PLAY_STATES.join(',') === 'preparingRound,waitingForAnswer,answerFeedback');

const sampling = Object.assign(definition.data(), {
    inputMode: 'manual',
    cameraState: 'off',
    readColourFrame() { throw new Error('must not sample without a live camera'); },
});
methods.sampleMotion.call(sampling);
check('no frames are sampled while the camera is off', true);

const onIntro = Object.assign(definition.data(), {
    inputMode: 'camera',
    cameraState: 'live',
    gameState: 'intro',
    readColourFrame() { throw new Error('must not sample before the game starts'); },
});
methods.sampleMotion.call(onIntro);
check('no frames are sampled before the game starts', true);

// Tracking must stay alive between rounds so the markers never freeze, but a
// strike is still only accepted while an answer is open.
let struck = 0;
let painted = 0;
const duringFeedback = Object.assign(definition.data(), {
    inputMode: 'camera',
    cameraState: 'live',
    gameState: 'answerFeedback',
    // The stubbed clock sits at 0; push the last-sample stamp back so the ~30fps
    // sampling throttle does not swallow this call.
    _lastSampleCa: -1000,
    _tracker: {
        config: ctx.CRYSTAL_ARENA_TRACKER_DEFAULTS,
        ingest: () => ({hit: 'tr', ready: true, target: null, zone: 'tr', dwell: 1, mask: new Uint8Array(4), frames: 5}),
    },
    readColourFrame: () => new Uint8ClampedArray(4),
    // The real measurement runs, with no DOM behind it: it must simply decline.
    $refs: {},
    measureSlotZones: methods.measureSlotZones,
    refreshSlotZones: methods.refreshSlotZones,
    paintCornerDwell() { painted += 1; },
    paintMatchMask() {},
    paintTarget() {},
    strike() { struck += 1; },
});
methods.sampleMotion.call(duringFeedback);
check('tracking keeps running between rounds so the markers stay live', painted === 1);
check('a corner hit during feedback is not accepted as an answer', struck === 0);

console.log('--- 6b. the game opens straight into calibration ---');
function openingHarness(remembered, saved) {
    const store = {crystal_arena_input_mode: remembered, crystal_arena_colour_profile: saved || null};
    ctx.getLocalStorage = (key, fallback) => (key in store) ? store[key] : fallback;
    const calls = [];
    const instance = Object.assign(definition.data(), {
        _destroyedCa: false,
        isCurrentRoute: () => true,
        $nextTick(callback) { callback(); },
        later(callback) { callback(); },
        setupSampler() {},
        startAnimationLoop() {},
        resetRunState() {},
        startCamera() { calls.push('camera'); },
        startManual() { calls.push('manual'); },
        loadColourProfile: methods.loadColourProfile,
        create: methods.create,
    });
    instance.create();
    return {instance, calls};
}

const firstVisit = openingHarness('', null);
check('a first visit asks for the camera without an intro click',
    firstVisit.calls.join(',') === 'camera', firstVisit.calls.join(','));
const cameraAgain = openingHarness('camera', {hue: 25, tolerance: 22});
check('a returning camera player also goes straight to the camera',
    cameraAgain.calls.join(',') === 'camera');
check('a saved colour is loaded so the shortcut can be offered',
    !!cameraAgain.instance.savedColourProfile);
const manualPlayer = openingHarness('manual', null);
check('a player who chose no-camera is not asked again',
    manualPlayer.calls.join(',') === 'manual');

// Calibration must now run every time, not be silently skipped by a saved colour.
function calibrateOnOpen(saved) {
    const store = {crystal_arena_colour_profile: saved || null};
    ctx.getLocalStorage = (key, fallback) => (key in store) ? store[key] : fallback;
    let prepared = 0;
    const instance = Object.assign(definition.data(), {
        gameState: 'requestingCamera',
        inputMode: 'camera',
        _destroyedCa: false,
        _tracker: ctx.createCrystalArenaTracker(),
        later(callback) { callback(); },
        prepareRound() { prepared += 1; },
        finishCalibration: methods.finishCalibration,
        startCalibrationRun: methods.startCalibrationRun,
        loadColourProfile: methods.loadColourProfile,
        applyColourProfile: methods.applyColourProfile,
        useSavedColour: methods.useSavedColour,
        beginCalibration: methods.beginCalibration,
    });
    instance.beginCalibration();
    return {instance, prepared: () => prepared};
}

const fresh = calibrateOnOpen(null);
check('opening with no saved colour starts the guided run',
    fresh.instance.gameState === 'calibrating' && fresh.instance.calibrationStep === 0);
const remembered = calibrateOnOpen({hue: 25, tolerance: 22});
check('a saved colour no longer skips calibration',
    remembered.instance.gameState === 'calibrating' && remembered.prepared() === 0);
check('the saved colour is offered on the card instead',
    !!remembered.instance.savedColourProfile);
remembered.instance.useSavedColour();
check('taking the saved colour applies it and starts playing',
    remembered.prepared() === 1 && remembered.instance.colourProfile.hue === 25);
const nothingSaved = calibrateOnOpen(null);
nothingSaved.instance.useSavedColour();
check('the shortcut does nothing when no colour was ever saved', nothingSaved.prepared() === 0);

ctx.getLocalStorage = (key, fallback) => key === 'theme' ? 'base' : fallback;

// "בלי מצלמה" is offered ON the calibration card, where the game is already in
// the 'calibrating' state — the state the guard used to refuse to leave.
const stranded = Object.assign(definition.data(), {
    gameState: 'calibrating',
    inputMode: 'camera',
    _destroyedCa: false,
    later(callback) { callback(); },
    startManual: methods.startManual,
    beginCalibration: methods.beginCalibration,
    finishCalibration: methods.finishCalibration,
    startCalibrationRun: methods.startCalibrationRun,
    loadColourProfile: () => null,
    prepareRound() { this.gameState = 'preparingRound'; },
});
stranded.startManual();
check('leaving the calibration card for manual play starts the game instead of freezing',
    stranded.gameState === 'preparingRound', stranded.gameState);

// Moving focus onto the first crystal draws a focus ring on it, which reads as
// "the top-right answer is already selected" when a round opens.
console.log('  -- no answer looks pre-selected when a round opens --');
function focusHarness(lastSource) {
    const focused = [];
    const instance = Object.assign(definition.data(), {
        _destroyedCa: false,
        _lastSource: lastSource,
        $nextTick(callback) { callback(); },
        $refs: {
            slotButtons: ctx.CRYSTAL_ARENA_SLOTS.map(slot => ({
                disabled: false,
                focus: () => focused.push(slot.id),
            })),
        },
        focusFirstCrystal: methods.focusFirstCrystal,
    });
    instance.focusFirstCrystal();
    return focused;
}
check('the very first round marks nothing', focusHarness(undefined).length === 0);
check('a camera player never has focus moved', focusHarness('camera').length === 0);
check('a pointer player never has focus moved', focusHarness('pointer').length === 0);
check('a keyboard player still gets focus back for the next round',
    focusHarness('keyboard').join(',') === 'tr', focusHarness('keyboard').join(','));

console.log('--- 7. cleanup releases every owned resource ---');
let stoppedTracks = 0;
let removedListeners = 0;
let cancelledFrames = 0;
const track = {
    stop() { stoppedTracks += 1; },
    addEventListener() {},
    removeEventListener() {},
};
const teardown = Object.assign(definition.data(), {
    _timersCa: new Set([setTimeout(() => { throw new Error('timer survived teardown'); }, 5000)]),
    _rafCa: 7,
    _stream: {getTracks: () => [track], getVideoTracks: () => [track]},
    _onKeyCa: () => {},
    _onVisibilityCa: () => {},
    _tracker: ctx.createCrystalArenaTracker(),
    _sampleCtx: {},
    _grayBuffer: new Uint8Array(4),
    clearTimers: methods.clearTimers,
    releaseCamera: methods.releaseCamera,
    clearCornerEnergy() {},
    $refs: {},
});
// beforeDestroy resolves these from the module's own (vm) scope.
ctx.cancelAnimationFrame = () => { cancelledFrames += 1; };
ctx.removeEventListener = () => { removedListeners += 1; };
ctx.document = {removeEventListener: () => { removedListeners += 1; }, fullscreenElement: null};
definition.beforeDestroy.call(teardown);
check('teardown stops every camera track', stoppedTracks === 1, stoppedTracks);
check('teardown clears every timer', teardown._timersCa.size === 0);
check('teardown cancels the animation frame', cancelledFrames === 1 && teardown._rafCa === null);
check('teardown removes both listeners', removedListeners === 2, removedListeners);
check('teardown drops the media and sampling references',
    teardown._stream === null && teardown._tracker === null && teardown._visionImage === null);
check('teardown marks the instance destroyed before anything else', teardown._destroyedCa === true);

console.log('--- 8. production registration and routing ---');
function makeStorage() {
    const map = new Map();
    return {
        getItem: key => map.has(key) ? map.get(key) : null,
        setItem: (key, value) => map.set(key, String(value)),
        _map: map,
    };
}
const integration = {
    console,
    localStorage: makeStorage(),
    sessionStorage: makeStorage(),
    navigator: {},
    Audio: class { play() {} },
    he: {decode: value => value},
};
integration.window = integration;
integration.globalThis = integration;
integration.sessionStorage.setItem('username', 'crystal-test');
vm.createContext(integration);
function load(file, suffix = '') {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8') + suffix, integration, {filename: file});
}
load('data.js', ';globalThis.DATA=DATA;');
load('apps.js', ';globalThis.apps=apps;');
load('worlds.js');
load('storage.js');
const tester = fs.readFileSync(path.join(ROOT, 'tester.js'), 'utf8');
const cut = tester.indexOf('var ProgressBarComponent');
vm.runInContext(tester.slice(0, cut), integration, {filename: 'tester.js(core)'});

const registrations = vm.runInContext(
    `(function collect(node, found){ if(node.type==='app' && node.appType==='crystal_arena') found.push(node);` +
    ` (node.items||[]).forEach(child => collect(child, found)); return found; })(apps, [])`,
    integration);
check('the legacy menu registers at least one crystal_arena app', registrations.length >= 1, registrations.length);
check('every crystal_arena registration has a complete field mapping',
    registrations.every(app => !!app.listName && !!app.questionIndex && !!app.resultIndex && !!app.name && !!app.title));
check('every registered list exists in DATA',
    registrations.every(app => Array.isArray(integration.DATA[app.listName])),
    registrations.map(app => app.listName).join(','));
check('every registered field mapping exists on the list items',
    registrations.every(app => {
        const item = integration.DATA[app.listName][0];
        return !!item[app.questionIndex] && !!item[app.resultIndex];
    }));
// Menu ids are positional paths and double as storage namespaces, so the new
// menu must be appended and every pre-existing id must still resolve.
check('the camera menu is appended as the last root entry',
    vm.runInContext(`apps.items[apps.items.length - 1].name`, integration) === 'מצלמה ותנועה');
check('pre-existing app ids still resolve unchanged',
    vm.runInContext(`getItemById(apps, '0_0_0').listName`, integration) === 'COLORS');

const testerTail = tester.slice(cut);
check('the crystal_arena route is registered',
    testerTail.indexOf("routes.push({path: '/play/crystal_arena/:currentAppId'") !== -1);
check('the component factory is instantiated after BaseGameComponent',
    testerTail.indexOf('createCrystalArenaComponent(BaseGameComponent)') !== -1);

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
check('index.html loads the game script before tester.js',
    indexHtml.indexOf('games/crystal-arena.js') !== -1 &&
    indexHtml.indexOf('games/crystal-arena.js') < indexHtml.indexOf('./tester.js'));
check('index.html loads the game stylesheet', indexHtml.indexOf('games/crystal-arena.css') !== -1);

const serviceWorker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
check('both game files are cached for offline play',
    serviceWorker.indexOf("'/games/crystal-arena.js'") !== -1 &&
    serviceWorker.indexOf("'/games/crystal-arena.css'") !== -1);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
