/**
 * Scribble Platformer (appType: scribble_platformer)
 *
 * The side-view sibling of `scribble_dungeon`: the same squared-exercise-book
 * look, the same runtime re-inking, the same weighted-learning contract — but
 * seen from the side. The course is a sequence of *rooms*, each a screen with
 * its own mechanic (this first build ships the "jump on the correct block"
 * room). Every room the player clears stays drawn on the page and the course
 * scrolls on to the right, so the map grows into a visible record of the run
 * exactly as the dungeon plan does.
 *
 * Art: Kenney "Scribble Platformer" (CC0) — black line art on transparency, so
 * every tile is re-inked at runtime to the active theme via `inked()`, and the
 * four coloured character tokens are drawn as-is via `raw()`. Where the pack has
 * no equivalent (doors, shield, bridge, bow), later rooms reuse the identical
 * Scribble Dungeons sprites.
 */
(function (global) {
    'use strict';

    const ASSET = './assets/scribble-platformer/';

    // One tile per sprite, 64px, laid on a 64px pitch so the printed sub-squares
    // form one continuous 32-unit lattice that matches the page ruling — the same
    // reasoning as scribble-dungeon.
    const SPRITE = 64;
    const PITCH = 64;
    const GRID_STEP = SPRITE / 2;

    // The course runs left to right along one continuous ground line. y = 0 is
    // the ground surface; up is negative, so blocks float at negative y.
    const GROUND_Y = 0;
    const ROOM_TILES = 11;               // width of one room, in tiles
    const ROOM_W = ROOM_TILES * PITCH;    // ...and in world pixels
    const STAND = PITCH * 0.5;            // pawn centre sits this far above a surface

    // Tiles of slack kept around a room in view, so a little of the neighbouring
    // ground and sky stays on screen.
    const VIEW_PAD = 1.6;
    const MIN_ZOOM = 0.32;
    const MAX_ZOOM = 1.0;

    /**
     * Playback speed. Everything timed multiplies by the chosen factor, so one
     * control moves the whole scene together. The default is unhurried — like the
     * dungeon, this is a game you watch being drawn.
     */
    const PACES = [
        { key: 'normal', name: 'רגיל', icon: '🚶', factor: 0.85 },
        { key: 'fast', name: 'מהיר', icon: '🐇', factor: 1.5 },
        { key: 'slow', name: 'איטי', icon: '🐢', factor: 0.6 },
    ];

    const PAWNS = [
        { key: 'red', name: 'אדום' },
        { key: 'green', name: 'ירוק' },
        { key: 'purple', name: 'סגול' },
        { key: 'yellow', name: 'צהוב' },
    ];

    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function pawnBody(color) { return 'character_round' + cap(color); }
    function pawnHand(color) { return 'character_hand' + cap(color); }

    /**
     * Ambient motion per decor sprite: `s` the scale swing, `r` the rotation
     * swing in radians, `hz` the speed. Anything not listed stays still.
     */
    const WOBBLE = {
        background_cloudA: { s: 0.02, r: 0.0, hz: 0.4 },
        background_cloudB: { s: 0.02, r: 0.0, hz: 0.35 },
        tile_bush: { s: 0.05, r: 0.05, hz: 1.2 },
        tile_bushHalf: { s: 0.05, r: 0.05, hz: 1.3 },
        tile_tree: { s: 0.03, r: 0.03, hz: 0.7 },
        tile_treeTop: { s: 0.04, r: 0.05, hz: 0.8 },
    };

    // Every sprite the renderer can reach, loaded once up front. Only names that
    // exist on disk in assets/scribble-platformer/ belong here.
    const SPRITES = [
        'tile_grass', 'tile', 'tile_top', 'tile_block', 'tile_brick', 'tile_stone',
        'tile_coin', 'tile_gem', 'tile_flag', 'tile_key', 'tile_heart',
        'tile_bush', 'tile_bushHalf', 'tile_tree', 'tile_treeTop', 'tile_treeTrunk', 'tile_fence',
        'tile_ladder', 'tile_door', 'tile_crate', 'tile_crateSmall', 'tile_bridge',
        'tile_spike', 'tile_spikes',
        // Structural tiles that turn each room into a piece of architecture: castle
        // battlements/roofs, colonnades, aqueduct arches, ramps, a door set in a wall.
        'tile_castle', 'tile_roof', 'tile_column', 'tile_arch', 'tile_archColumns', 'tile_archColumn',
        'tile_archHalf', 'tile_slope', 'tile_blockDoor', 'tile_blockWindow', 'tile_hang', 'tile_fenceHigh',
        'background_cloudA', 'background_cloudB', 'background_tree', 'background_treeLarge',
        'effect_blast', 'effect_trail',
        'item_shieldRound', 'item_bow', 'item_arrow', 'item_sword', 'item_spear', 'item_blaster',
        'cart',   // copied from the Scribble Dungeons pack (same CC0 art) for the rail room
    ]
        .concat(PAWNS.map(p => pawnBody(p.key)))
        .concat(PAWNS.map(p => pawnHand(p.key)));

    /**
     * Room kinds. Each is a screen with its own answer apparatus, drawn from the
     * pack's own sprites. They all share one contract — N answers, tap the right
     * one, the course extends — so a kind is really: which sprite the answers are
     * (`block`), where they sit (`layout`), and how a miss reads (`wrongText`).
     * `ground`/`block` and every `decor` sprite must be preloaded (validated).
     *
     * `layout`: 'float' floating platforms · 'ground' standing on the grass ·
     * 'wall' mounted mid-height · 'span' a low row across a gap · 'tower' a
     * climbing zig-zag. See buildBlocks.
     */
    const ROOM_KINDS = {
        jump: {          // floating blocks over a spiked pit — a meadow with a hole in it
            name: 'קפיצה על הבלוק', icon: '🟫',
            hint: 'קפצו על הבלוק עם התשובה הנכונה',
            ground: 'tile_grass', block: 'tile_block', layout: 'float',
            wrongText: 'הבלוק התפורר — נסו בלוק אחר', gap: [2, 9], env: 'meadow',
            decor: [['background_cloudA', 1], ['background_cloudB', 1], ['tile_bush', 1], ['tile_tree', 1]],
        },
        doors: {         // doors set into a castle wall (the correct one opens through)
            name: 'הדלת הנכונה', icon: '🚪',
            hint: 'בחרו את הדלת עם התשובה הנכונה',
            ground: 'tile_grass', block: 'tile_blockDoor', layout: 'gate',
            wrongText: 'השער נעול — נסו שער אחר', env: 'castle', variants: 3,
            decor: [['tile_bush', 1], ['tile_tree', 1], ['tile_fence', 1]],
        },
        shoot: {         // a castle turret with a cannon and targets on the back wall
            name: 'קליעה למטרה', icon: '🎯',
            hint: 'כוונו אל המטרה עם התשובה הנכונה',
            ground: 'tile_stone', block: 'tile_gem', layout: 'wall',
            wrongText: 'החץ החטיא — נסו מטרה אחרת', env: 'turret',
            decor: [['background_cloudA', 1], ['background_cloudB', 1], ['tile_fence', 1]],
        },
        bridge: {        // planks that complete an aqueduct span over a spiked chasm
            name: 'בניית הגשר', icon: '🌉',
            hint: 'בחרו את הקרש עם התשובה הנכונה כדי לחצות',
            ground: 'tile_grass', block: 'tile_bridge', layout: 'span',
            wrongText: 'הקרש נפל — נסו קרש אחר', gap: [2, 9], env: 'aqueduct',
            decor: [['background_cloudA', 1], ['tile_bush', 1]],
        },
        shield: {        // a castle rampart; the right shield lowers the drawbridge
            name: 'בחירת המגן', icon: '🛡️',
            hint: 'בחרו את המגן עם התשובה הנכונה',
            ground: 'tile_stone', block: 'item_shieldRound', layout: 'wall',
            wrongText: 'המגן התנפץ — נסו מגן אחר', env: 'rampart',
            decor: [['background_cloudA', 1], ['tile_tree', 1]],
        },
        crate: {         // a walled yard of crates — smash the right one for a coin
            name: 'שבירת הארגז', icon: '📦',
            hint: 'קפצו על הארגז עם התשובה הנכונה',
            ground: 'tile_stone', block: 'tile_crate', layout: 'ground',
            wrongText: 'הארגז היה ריק — נסו ארגז אחר', env: 'yard', variants: 2,
            decor: [['background_cloudA', 1], ['tile_fence', 1]],
        },
        tower: {         // tall ladders on a stone tower base
            name: 'טיפוס במגדל', icon: '🪜',
            hint: 'טפסו לשלב עם התשובה הנכונה',
            ground: 'tile_stone', block: 'tile_ladder', layout: 'tower',
            wrongText: 'השלב נשבר — נסו שלב אחר', env: 'tower', variants: 3,
            decor: [['background_cloudA', 1], ['background_cloudB', 1], ['tile_tree', 1]],
        },
        rail: {          // a dirt mine floor with carts on tracks
            name: 'בחירת המסלול', icon: '🛤️',
            hint: 'בחרו את הקרונית שעל המסלול הנכון',
            ground: 'tile', block: 'cart', layout: 'rail',
            wrongText: 'המסלול הוביל לבור — נסו מסלול אחר', env: 'mine',
            decor: [['tile_fence', 1], ['tile_bush', 1]],
        },
    };

    // The pool of room kinds. kindForDepth picks from it at random per run (see there).
    // Append-only: kinds are referenced by name, and the index feeds roomSeed determinism.
    const KIND_CYCLE = ['jump', 'doors', 'shoot', 'bridge', 'shield', 'crate', 'tower', 'rail'];

    let RUN_SALT = 0;

    // Where the pawn stands at the start of a room (the landing spot for an exit).
    function landAt(room) { return { x: room.x0 + PITCH * 1.2, y: room.y0 - STAND }; }

    /**
     * How each room's route continues — this is what makes the drawn map grow in
     * different directions instead of always marching right. Per kind:
     *   place(from)              → where the next room is dealt {x0,y0}
     *   path(from,next,block,s)  → the pawn's route {pts, style, secs}
     *   transition               → 'travel' (default: walk the path) | 'pageflip'
     * All coordinates are world pixels; y grows downward, up is negative.
     */
    const EXITS = {
        jump: {   // a tall hop over the block, across the spiked pit — rightward
            place: (f) => ({ x0: f.x1, y0: f.y0 }),
            path: (f, n, b, s) => ({ style: 'hop', secs: 2.2, pts: [
                s, { x: b.wx, y: b.wy - PITCH * 0.5 - STAND }, landAt(n)] }),
        },
        doors: {  // step through the door and the notebook page turns to the next room
            transition: 'pageflip',
            // A turned page is a fresh sheet, so the next room is drawn on the same
            // patch of paper — nothing of the old room is left beside it.
            place: (f) => ({ x0: f.x0, y0: f.y0 }),
        },
        shoot: {  // the struck target springs a launch up and over to a higher room
            place: (f) => ({ x0: f.x1, y0: f.y0 - PITCH * 4 }),
            path: (f, n, b, s) => ({ style: 'launch', secs: 2.4, pts: [
                s, { x: (s.x + landAt(n).x) / 2, y: Math.min(f.y0, n.y0) - STAND - PITCH * 2.4 }, landAt(n)] }),
        },
        bridge: { // cross the chosen plank over the chasm — rightward
            place: (f) => ({ x0: f.x1, y0: f.y0 }),
            path: (f, n, b, s) => ({ style: 'cross', secs: 2.4, pts: [
                s, { x: b.wx, y: b.wy - STAND * 0.5 }, landAt(n)] }),
        },
        shield: { // a drawbridge lowers forward and down to a lower room
            place: (f) => ({ x0: f.x1, y0: f.y0 + PITCH * 3 }),
            path: (f, n, b, s) => ({ style: 'walk', secs: 2.6, pts: [
                s, { x: f.x1 - PITCH * 0.6, y: f.y0 - STAND }, landAt(n)] }),
        },
        crate: {  // hop up onto the correct crate (it smashes to a coin), then on — right
            place: (f) => ({ x0: f.x1, y0: f.y0 }),
            path: (f, n, b, s) => ({ style: 'hop', secs: 2.4, pts: [
                s, { x: b.wx, y: b.wy - STAND * 0.7 }, landAt(n)] }),
        },
        tower: {  // climb the chosen ladder up to the floor above
            place: (f) => ({ x0: f.x0, y0: f.y0 - PITCH * 5.5 }),
            path: (f, n, b, s) => ({ style: 'climb', secs: 3.2, pts: [
                s, { x: b.wx, y: f.y0 - STAND }, { x: b.wx, y: n.y0 - STAND }, landAt(n)] }),
        },
        rail: {   // the coaster flings the cart clear off the page — onto a fresh page
            transition: 'pageflip',
            place: (f) => ({ x0: f.x0, y0: f.y0 }),
            ridePath: (f, n, b, s) => {
                const tk = railTracks(f, (f.blocks || []).length)[b.index] || railTracks(f, 1)[0];
                const seg = tk.pts.slice(1);   // from the cart, along the whole winding track
                // The track already runs off the LEFT of the page; carry the cart on in
                // that same heading — never swinging back to the right — so it flies clean
                // off the left of the sheet, where drawPageTurn's peel begins lifting. The
                // camera keeps the cart centred, so what reads is the leftward travel: the
                // background sheet sweeps right as the cart charges the edge and the page
                // turns. (Earlier this yanked back rightward at the end — the wrong way.)
                const end = tk.pts[tk.pts.length - 1];
                const prev = tk.pts[tk.pts.length - 2];
                const len = Math.hypot(end.x - prev.x, end.y - prev.y) || 1;
                const ux = (end.x - prev.x) / len, uy = (end.y - prev.y) / len;
                const fling = [
                    { x: end.x + ux * PITCH * 2.5, y: end.y + uy * PITCH * 2.5 },
                    { x: end.x + ux * PITCH * 5.5, y: end.y + uy * PITCH * 5.5 },
                    { x: end.x + ux * PITCH * 9.0, y: end.y + uy * PITCH * 9.0 },
                ];
                return { style: 'ride', secs: 4.6, track: true, pts: sampleCurve(seg.concat(fling), 8) };
            },
        },
    };

    /**
     * How a wrong answer fails — in two beats, so the miss reads as *doing* the
     * wrong thing rather than an instant X. `approach(from,block,start)` walks the
     * pawn onto the wrong apparatus in that room's own style; then the block
     * crumbles under it (snapFail), and `react(from,block,at)` plays the fallout
     * from wherever the pawn then is (a tower ladder snaps and it falls; a plank
     * tips into the chasm; a shield shatters and it recoils; a crate won't budge).
     * The pawn is returned to the room's landing spot and input reopens, with the
     * correct answer still there to try. Only runs with motion on; reduced motion
     * keeps the old crumble-in-place. All world pixels; up is negative.
     */
    const FAILS = {
        jump: {   // hops onto the block; it crumbles; drops into the pit
            approach: (f, b, s) => ({ style: 'hop', secs: 1.1, pts: [
                s, { x: b.wx, y: b.wy - STAND * 0.6 }, { x: b.wx, y: b.wy - STAND * 0.15 }] }),
            react: (f, b, a) => ({ style: 'fall', secs: 0.8, pts: [
                a, { x: b.wx + PITCH * 0.2, y: f.y0 + PITCH * 2.3 }] }),
        },
        doors: {  // walks up to the wrong door; it slams; steps back
            approach: (f, b, s) => ({ style: 'walk', secs: 1.3, pts: [
                s, { x: b.wx - PITCH * 0.28, y: f.y0 - STAND }] }),
            react: (f, b, a) => ({ style: 'recoil', secs: 0.7, pts: [
                a, { x: b.wx - PITCH * 1.1, y: f.y0 - STAND }] }),
        },
        shoot: {  // looses an arrow that misses; the target holds; steps back
            miss: true,
            approach: (f, b, s) => ({ style: 'walk', secs: 1.0, pts: [
                s, { x: s.x + PITCH * 0.25, y: f.y0 - STAND }] }),
            react: (f, b, a) => ({ style: 'recoil', secs: 0.7, pts: [
                a, { x: a.x - PITCH * 0.5, y: f.y0 - STAND }] }),
        },
        bridge: { // steps onto the plank; it drops into the chasm
            approach: (f, b, s) => ({ style: 'cross', secs: 1.3, pts: [
                s, { x: b.wx, y: b.wy - STAND * 0.45 }] }),
            react: (f, b, a) => ({ style: 'fall', secs: 0.85, pts: [
                a, { x: b.wx, y: f.y0 + PITCH * 2.5 }] }),
        },
        shield: { // looses an arrow that misses the shield; lowers the bow and steps back
            miss: true,
            approach: (f, b, s) => ({ style: 'walk', secs: 0.9, pts: [
                s, { x: s.x + PITCH * 0.2, y: f.y0 - STAND }] }),
            react: (f, b, a) => ({ style: 'recoil', secs: 0.7, pts: [
                a, { x: a.x - PITCH * 0.4, y: f.y0 - STAND }] }),
        },
        crate: {  // hops onto the crate; it smashes but is empty; hops back off
            approach: (f, b, s) => ({ style: 'hop', secs: 1.2, pts: [
                s, { x: b.wx, y: b.wy - STAND * 0.7 }] }),
            react: (f, b, a) => ({ style: 'hop', secs: 0.9, pts: [
                a, { x: b.wx - PITCH * 0.9, y: f.y0 - STAND }] }),
        },
        tower: {  // climbs the wrong ladder; it snaps; the pawn falls
            approach: (f, b, s) => ({ style: 'climb', secs: 1.9, pts: [
                s, { x: b.wx, y: f.y0 - STAND }, { x: b.wx, y: b.wy - PITCH * 0.4 }] }),
            react: (f, b, a) => ({ style: 'fall', secs: 0.9, pts: [
                a, { x: b.wx + PITCH * 0.18, y: f.y0 - STAND + PITCH * 0.25 }] }),
        },
        rail: {   // rides the WHOLE long track, then comes to rest above the start and drops in
            approach: (f, b, s) => {
                const tk = railTracks(f, (f.blocks || []).length)[b.index] || railTracks(f, 1)[0];
                const seg = tk.pts.slice(1);                 // the whole long winding track, ridden to the end
                const end = tk.pts[tk.pts.length - 1];
                const landX = f.x0 + PITCH * 1.2;            // the start / landing column (beginFail's home)
                // After the full ride, the tail loops across and comes to rest hanging
                // directly ABOVE the start — so the drop that follows falls naturally onto
                // the very spot it set off from.
                const tail = [
                    { x: end.x + PITCH * 1.5, y: end.y - PITCH * 1.2 },       // carries just past the track end…
                    { x: (end.x + landX) / 2 - PITCH, y: f.y0 - PITCH * 9 },  // …lofts up and across toward the start…
                    { x: landX, y: f.y0 - PITCH * 6.2 },                     // …arriving high above the start…
                    { x: landX, y: f.y0 - PITCH * 3.4 },                     // …dropping vertically to hang there
                ];
                return { style: 'ride', secs: 5.8, track: true, pts: sampleCurve(seg.concat(tail), 7) };
            },
            react: (f, b, a) => ({ style: 'fall', secs: 0.7, pts: [
                a, { x: f.x0 + PITCH * 1.2, y: f.y0 - STAND }] }),          // a natural straight drop onto the start
        },
    };

    /**
     * Where an answer is written, as fractions of the viewport — used only as a
     * fallback when a block is off screen. Normally the answer is written on the
     * block itself, in world space.
     */
    const SIGN_SLOTS = {
        2: [{ x: 0.30, y: 0.40 }, { x: 0.70, y: 0.40 }],
        3: [{ x: 0.22, y: 0.42 }, { x: 0.50, y: 0.30 }, { x: 0.78, y: 0.42 }],
        4: [{ x: 0.20, y: 0.42 }, { x: 0.40, y: 0.30 }, { x: 0.60, y: 0.30 }, { x: 0.80, y: 0.42 }],
    };
    function slotsFor(count) { return SIGN_SLOTS[count] || SIGN_SLOTS[3]; }

    // The same six paper/pencil palettes as scribble-dungeon, so the two games
    // share one look and one theme switch. Duplicated (not imported) so this
    // module stays self-contained and testable on its own.
    const THEME_INK = {
        base: {
            paper: '#fdfdf9', paper2: '#f2f4ef', ink: '#2e3a55', faint: '#94a0b6',
            floor: '#ffffff', prop: '#f6f8fc', grid: 'rgba(84,138,196,.34)',
            major: 'rgba(84,138,196,.5)', margin: 'rgba(214,74,74,.45)',
            sign: '#ffffff', signInk: '#26304a', bad: '#d0342c', good: '#1f7a4d',
        },
        soldiers: {
            paper: '#f8f7ef', paper2: '#eceade', ink: '#39421f', faint: '#9aa07c',
            floor: '#ffffff', prop: '#f5f6ea', grid: 'rgba(108,130,86,.32)',
            major: 'rgba(108,130,86,.48)', margin: 'rgba(150,84,44,.4)',
            sign: '#ffffff', signInk: '#39421f', bad: '#8f2f22', good: '#3f6b2f',
        },
        unicorn: {
            paper: '#fffbfe', paper2: '#fdf0f8', ink: '#65297a', faint: '#c69bd4',
            floor: '#ffffff', prop: '#fdf5fb', grid: 'rgba(214,124,192,.34)',
            major: 'rgba(214,124,192,.5)', margin: 'rgba(232,110,160,.45)',
            sign: '#ffffff', signInk: '#4b0f57', bad: '#c0326f', good: '#7a3fbf',
        },
        space: {
            paper: '#0b1226', paper2: '#070c1b', ink: '#d6e6ff', faint: '#4f6699',
            floor: '#101a34', prop: '#16223f', grid: 'rgba(120,170,255,.22)',
            major: 'rgba(120,170,255,.34)', margin: 'rgba(255,120,140,.35)',
            sign: '#16244d', signInk: '#dce9ff', bad: '#ff6b7a', good: '#7ce7b0',
        },
        dark: {
            paper: '#17181c', paper2: '#101115', ink: '#e8e6e0', faint: '#6c6a65',
            floor: '#1e2026', prop: '#262830', grid: 'rgba(198,204,214,.15)',
            major: 'rgba(198,204,214,.24)', margin: 'rgba(224,110,110,.35)',
            sign: '#272930', signInk: '#efece5', bad: '#ff7a7a', good: '#8ee6a8',
        },
        code: {
            paper: '#04120a', paper2: '#020a05', ink: '#4dff86', faint: '#1c6b39',
            floor: '#06190c', prop: '#0a2312', grid: 'rgba(0,255,65,.18)',
            major: 'rgba(0,255,65,.3)', margin: 'rgba(255,95,86,.4)',
            sign: '#06210f', signInk: '#7dff9f', bad: '#ff5f56', good: '#39ff14',
        },
    };
    function resolvePlatformerTheme(key) { return THEME_INK[key] || THEME_INK.base; }

    const HAND_FONT = '"Segoe Print", "Bradley Hand", "Comic Sans MS", "Chalkboard SE", cursive';
    const SIGN_PX = 22;                   // base sign type size; signScale() grows it on phones

    // ------------------------------------------------------------------ helpers

    function hexToRgb(hex) {
        const h = String(hex).replace('#', '');
        const n = parseInt(h.length === 3
            ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
            : h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    // Small deterministic PRNG so a room's decor is identical on every repaint and
    // after a resize, without storing a layout per room.
    function mulberry(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function roomSeed(index) {
        return ((index * 73856093) ^ (RUN_SALT * 83492791) ^ 0x9e3779b9) >>> 0;
    }

    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function pick(rand, list) { return list[Math.floor(rand() * list.length) % list.length]; }

    function stripTags(html) {
        return String(html == null ? '' : html).replace(/<[^>]*>/g, '').trim();
    }
    function isImageOption(value) {
        return /\.(svg|png|jpe?g|webp|gif)$/i.test(stripTags(value));
    }

    function easeInOut(u) {
        return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    }

    /** Samples a polyline at `u` in [0,1], by arc length. */
    function samplePath(pts, u) {
        let total = 0;
        const segs = [];
        for (let i = 1; i < pts.length; i++) {
            const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
            segs.push(l);
            total += l;
        }
        if (!total) return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
        let want = u * total;
        for (let i = 0; i < segs.length; i++) {
            if (want <= segs[i] || i === segs.length - 1) {
                const t = segs[i] ? Math.min(1, want / segs[i]) : 1;
                return {
                    x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
                    y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
                };
            }
            want -= segs[i];
        }
        return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
    }

    /** Smooths a waypoint list into a dense polyline (quadratic through midpoints). */
    function sampleCurve(pts, perSeg) {
        if (!pts || pts.length < 3) return (pts || []).slice();
        const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        const out = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = i === 0 ? pts[0] : mid(pts[i - 1], pts[i]);
            const p1 = pts[i];
            const p2 = i === pts.length - 2 ? pts[pts.length - 1] : mid(pts[i], pts[i + 1]);
            for (let s = 0; s < perSeg; s++) {
                const t = s / perSeg, u = 1 - t;
                out.push({
                    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
                    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
                });
            }
        }
        out.push(pts[pts.length - 1]);
        return out;
    }

    // The rail room's coaster routes: each an equally long, ambiguous track that
    // dips off the station, carries the labelled cart, banks and climbs toward the
    // top of the page. Where the ride goes from the top (off the page, or a loop
    // back) is decided by the answer, not the drawn shape, so none of them gives
    // the correct answer away. `station` is the shared start; each has a `cart`
    // anchor (where its answer sits) and `pts` (waypoints, pre-smoothing).
    // Three long, wild, crossing coaster routes — each from its OWN floor start,
    // angled up-right, then weaving across the whole page and far off both edges.
    // Templates are [x, height] in tiles (height = tiles above the floor):
    // [start, cart, …flight…, top]. The labelled cart sits at index 1 (spread +
    // readable, kept low and clear of the tangle); the rest is the ride.
    //
    // Each route climbs out to the right, throws a full loop-de-loop (5 waypoints
    // around a circle — the smoothing rounds them off), runs off the right edge,
    // then storms back leftward across the page THROUGH the other two routes,
    // throws a second loop, and exits off the left. The outbound legs run low and
    // the return legs run high, so every route crosses both of the others several
    // times over.
    const RAIL_TPL = [
        [[1.2, 0.3], [2.6, 2.0],                                    // station + labelled cart
         [5.0, 4.2], [8.5, 5.4],                                    // climb out right
         [10.5, 5.4], [12.4, 7.2], [10.5, 9.0], [8.6, 7.2], [10.6, 5.5],   // loop ①
         [13.8, 6.2], [16.8, 8.6],                                  // off the right edge
         [13.0, 11.3], [9.2, 12.5],                                 // storm back, high
         [6.0, 12.5], [4.2, 10.8], [6.0, 9.1], [7.8, 10.8], [6.1, 12.4],   // loop ②
         [2.8, 11.4], [-0.8, 9.4], [-3.2, 6.2]],                    // …and off the left
        [[3.8, 0.3], [5.5, 2.2],
         [8.2, 3.2], [11.6, 3.6],
         [14.0, 3.6], [15.9, 5.5], [14.0, 7.4], [12.1, 5.5], [14.1, 3.7],  // loop ①
         [17.2, 6.4], [15.4, 9.6],
         [11.0, 10.4], [7.4, 8.4],                                  // dives back through ①'s climb
         [5.4, 8.4], [3.6, 10.2], [5.4, 12.0], [7.2, 10.2], [5.5, 8.5],    // loop ②
         [2.2, 7.0], [-1.6, 8.2], [-3.6, 10.4]],
        [[6.8, 0.3], [8.4, 2.0],
         [11.2, 2.6], [14.6, 3.0], [17.6, 5.2],
         [15.6, 8.2], [13.9, 9.3], [12.2, 11.0], [10.5, 9.3], [12.2, 7.6], [13.8, 9.2],   // loop ①
         [10.2, 11.8], [6.4, 13.0],
         [3.4, 13.0], [1.6, 11.2], [3.4, 9.4], [5.2, 11.2], [3.5, 12.9],   // loop ②
         [0.4, 11.6], [-2.6, 9.0], [-4.2, 5.6]],
    ];
    function railTracks(room, count) {
        const x0 = room.x0, y0 = room.y0;
        const abs = (tpl) => tpl.map(p => ({ x: x0 + p[0] * PITCH, y: y0 - p[1] * PITCH }));
        const order = count <= 2 ? [0, 2] : [0, 1, 2];    // 2 answers → spread left+right
        const tracks = [];
        for (let i = 0; i < count; i++) {
            const pts = abs(RAIL_TPL[order[i % order.length]]);
            tracks.push({ start: pts[0], cart: pts[1], mid: pts[pts.length - 2], top: pts[pts.length - 1], pts: pts });
        }
        return tracks;
    }

    // Which kind of room sits at a given depth. A fresh random order every run, but
    // deterministic *within* a run — depth+RUN_SALT hash → kind, so a room never changes
    // kind on a retry or repaint (and roomSeed stays stable). Each pick is independent,
    // so the same kind may fall two (or more) rooms in a row; that's intended.
    function kindForDepth(depth) {
        const seed = ((depth * 19349663) ^ (RUN_SALT * 83492791) ^ 0x2545f491) >>> 0;
        return KIND_CYCLE[Math.floor(mulberry(seed)() * KIND_CYCLE.length)];
    }

    // ----------------------------------------------------------- world geometry

    // Ground surface tile centre for a column: the tile hangs below the room's
    // floor (rooms can sit at different heights — a tower's exit climbs upward).
    function groundTileCentreY(room) { return (room ? room.y0 : GROUND_Y) + PITCH / 2; }

    /** World bounds of a room, sky included, in pixels. */
    function roomBounds(room) {
        return {
            x: room.x0,
            y: room.y0 - PITCH * 5,
            w: room.x1 - room.x0,
            h: PITCH * 7,
        };
    }

    /**
     * Lays out a room's decor deterministically: clouds drift in the sky, bushes
     * and trees sit on the ground line near the room's edges.
     */
    function layoutDecor(room, spec, rand) {
        const decor = [];
        // Two clouds, high, spread across the span.
        for (let i = 0; i < 2; i++) {
            decor.push({
                sprite: rand() < 0.5 ? 'background_cloudA' : 'background_cloudB',
                x: room.x0 + PITCH * (1.5 + rand() * (ROOM_TILES - 3)),
                y: room.y0 - PITCH * (4 + rand() * 2.4),
                scale: 1.1 + rand() * 0.7,
                phase: rand() * Math.PI * 2,
                drift: (rand() - 0.5) * 10,
                sky: true,
            });
        }
        // A bush or a tree tucked at one side, on the ground.
        const green = rand() < 0.5 ? 'tile_bush' : 'tile_tree';
        decor.push({
            sprite: green,
            x: room.x0 + PITCH * (rand() < 0.5 ? 0.7 : ROOM_TILES - 0.7),
            y: room.y0 - PITCH * (green === 'tile_tree' ? 0.5 : 0.1),
            scale: green === 'tile_tree' ? 1.15 : 0.9,
            phase: rand() * Math.PI * 2,
        });
        return decor;
    }

    // Some visual variants stand on a different floor (an interior hall is paved
    // in stone, not grass). Returns a tile name to override the kind's ground, or null.
    function groundForVariant(kind, variant) {
        if (kind === 'doors') return variant === 0 ? 'tile_grass' : 'tile_stone';
        return null;
    }

    /**
     * Builds a room shell at a known left edge and floor height (`y0`, default the
     * baseline ground). Rooms reached by climbing a tower sit higher up the page.
     * Decor is laid immediately.
     */
    function makeRoom(index, x0, kindKey, y0) {
        const kind = ROOM_KINDS[kindKey] ? kindKey : 'jump';
        const spec = ROOM_KINDS[kind];
        const rand = mulberry(roomSeed(index));
        const room = {
            index: index, kind: kind,
            x0: x0, x1: x0 + ROOM_W, y0: y0 || GROUND_Y,
            state: 'peek',
            blocks: [],           // the answer platforms of the current round
            decor: [],
            reveal: 0,            // 0..1 — how much of the room is inked in
        };
        // A visual variant so repeated rooms of one kind don't look identical.
        room.variant = spec.variants ? Math.floor(rand() * spec.variants) : 0;
        room.ground = groundForVariant(kind, room.variant) || spec.ground;
        room.decor = layoutDecor(room, spec, rand);
        return room;
    }

    /**
     * Places `count` answers across a room per the kind's `layout`. Every layout
     * keeps the answers in distinct columns (so their lifted signs never stack)
     * and above the ground line. Deterministic per room, so a retry after a wrong
     * answer leaves the surviving answers exactly where they were.
     */
    function buildBlocks(room, count, rand) {
        const spec = ROOM_KINDS[room.kind] || ROOM_KINDS.jump;
        const layout = spec.layout || 'float';
        const blocks = [];
        const railT = layout === 'rail' ? railTracks(room, count) : null;
        for (let i = 0; i < count; i++) {
            const frac = count > 1 ? i / (count - 1) : 0.5;
            const spread = room.x0 + PITCH * (2 + frac * (ROOM_TILES - 4));
            let wx, wy;
            if (layout === 'gate') {                   // doors: a tall arched gate, two tiles high
                wx = spread; wy = room.y0 - PITCH;     // centre of the 2-tile opening
            } else if (layout === 'ground') {          // crates: stand on the grass
                wx = spread; wy = room.y0 - PITCH * 0.5;
            } else if (layout === 'wall') {            // targets, shields: mounted mid-height
                wx = spread; wy = room.y0 - PITCH * (2.3 + (i % 2 ? 0.5 : 0));
            } else if (layout === 'span') {            // bridge: the missing deck stones, set INTO
                // the span over the chasm itself (not floating above it) — pick the stone that
                // completes the crossing; a wrong one drops into the gap. Spread across the
                // whole (widened) span so the labels above them don't crowd each other.
                wx = room.x0 + PITCH * (2.5 + frac * (ROOM_TILES - 5));
                wy = room.y0 - PITCH * 0.15;           // set down onto the arch deck, as the walkway itself
            } else if (layout === 'tower') {           // full-height ladders side by side; climb the right one
                wx = room.x0 + PITCH * (2.5 + frac * (ROOM_TILES - 5));
                wy = room.y0 - PITCH * 2.2;            // the sign sits at a readable point on the ladder
            } else if (layout === 'rail') {            // carts sit along their own coaster track
                wx = railT[i].cart.x; wy = railT[i].cart.y;
            } else {                                   // 'float' (jump)
                wx = spread; wy = room.y0 - PITCH * (2.2 + (i % 2 ? 0.85 : 0) + rand() * 0.2);
            }
            blocks.push({
                index: i, wx: wx, wy: wy,
                state: 'closed',       // closed | solved | crumbled | locked
                label: null, plain: '',
                crumbleT: 0, popT: 0, rattleT: 0, fallT: 0, bob: rand() * Math.PI * 2,
            });
        }
        return blocks;
    }

    // --------------------------------------------------------------- validation

    function validateScribblePlatformerConfig(cfg) {
        const errors = [];
        const kinds = cfg && cfg.kinds;
        if (!kinds || !Object.keys(kinds).length) {
            errors.push('missing room kinds');
            return errors;
        }
        Object.keys(kinds).forEach(key => {
            const k = kinds[key];
            if (!k.name) errors.push(key + ': missing name');
            if (!k.hint) errors.push(key + ': missing hint');
            if (!k.ground) errors.push(key + ': missing ground tile');
            if (!k.block) errors.push(key + ': missing block tile');
            [k.ground, k.block].forEach(s => {
                if (s && cfg.sprites.indexOf(s) < 0) errors.push(key + ': tile not preloaded: ' + s);
            });
            (k.decor || []).forEach(entry => {
                if (cfg.sprites.indexOf(entry[0]) < 0) errors.push(key + ': decor sprite not preloaded: ' + entry[0]);
            });
        });
        (cfg.cycle || []).forEach(key => {
            if (!kinds[key]) errors.push('cycle references unknown kind: ' + key);
        });
        return errors;
    }

    // --------------------------------------------------------------- component

    function createScribblePlatformerComponent(BaseGameComponent) {
        return Vue.component('scribble-platformer', Vue.extend({
            template: `
    <div class="container sp-container">
      <div class="sp-stage" ref="stage" :class="'sp-theme-' + themeKey">
        <canvas class="sp-canvas" ref="canvas"></canvas>

        <div class="sp-hud-top">
          <div class="sp-question" v-html="questionHtml"></div>
          <div class="sp-feedback" :class="{ 'is-bad': feedbackBad, 'is-good': feedbackGood }">{{ feedback }}</div>
        </div>

        <div class="sp-hud-stats">
          <span title="ניקוד">🪙 {{ score }}</span>
          <span title="מטבעות">💎 {{ gems }}</span>
          <span title="חדרים שנחקרו">🗺 {{ explored }}</span>
        </div>

        <div class="sp-hud-tools">
          <button type="button" class="sp-tool" @click="toggleMap"
                  :aria-pressed="String(mapMode)" :title="mapMode ? 'חזרה לחדר' : 'הצג את כל המסלול'">
            {{ mapMode ? '🔍' : '🗺' }}</button>
          <button type="button" class="sp-tool" @click="cyclePace" :title="'קצב האנימציה: ' + paceName">
            {{ paceIcon }}</button>
          <button type="button" class="sp-tool" @click="cyclePawn" title="החלף דמות">🎨</button>
          <button type="button" class="sp-tool" @click="toggleFullscreen" title="מסך מלא">⛶</button>
        </div>

        <!-- Real buttons over the painted blocks: the canvas carries the art,
             these carry the semantics (focus ring, keyboard, screen readers). -->
        <button v-for="hot in hotspots" :key="hot.id" type="button" class="sp-block-hit"
                :style="{ left: hot.x + 'px', top: hot.y + 'px', width: hot.w + 'px', height: hot.h + 'px' }"
                :aria-label="'תשובה: ' + hot.plain"
                :disabled="locked" @click="answer(hot.index)">
          <span class="sp-block-key">{{ hot.index + 1 }}</span>
        </button>

        <div class="sp-loading" v-if="!ready">מצייר את הדף…</div>

        <div class="sp-hud-progress" v-if="progress && progress.total">
          <div class="sp-hud-progress-fill"
               :style="{ width: (progress.progress / progress.total * 100) + '%' }"></div>
        </div>
      </div>
    </div>`,

            extends: BaseGameComponent,

            data: function () {
                return {
                    ready: false,
                    locked: true,
                    mapMode: false,
                    gems: 0,
                    depth: 1,
                    explored: 1,
                    streak: 0,
                    roomHint: '',
                    questionHtml: '',
                    feedback: '',
                    feedbackBad: false,
                    feedbackGood: false,
                    hotspots: [],
                    themeKey: 'base',
                    paceIcon: '🚶',
                    paceName: 'רגיל',
                };
            },

            methods: {
                // BaseGameComponent.created() runs create() before the canvas is in
                // the DOM; all real setup happens in mounted().
                create: function () { },

                // ------------------------------------------------------ assets

                loadSprites: function () {
                    const names = SPRITES.slice();
                    let pending = names.length;
                    return new Promise(resolve => {
                        if (!pending) { resolve(); return; }
                        names.forEach(name => {
                            const img = new Image();
                            const done = () => { if (--pending === 0) resolve(); };
                            img.onload = () => { this._sp.sprites[name] = img; done(); };
                            img.onerror = done;        // a missing tile must not stall the run
                            img.src = ASSET + name + '.png';
                        });
                    });
                },

                /**
                 * Re-inks a black-line sprite as a duotone: line work becomes `color`,
                 * the opaque white fill becomes `paper`, greys interpolate. Cached per
                 * name/colour pair. Identical to scribble-dungeon's `inked`.
                 */
                inked: function (name, color, paper) {
                    const g = this._sp;
                    const cacheKey = name + '|' + color + '|' + paper;
                    if (g.inkCache[cacheKey]) return g.inkCache[cacheKey];
                    const img = g.sprites[name];
                    if (!img) return null;

                    const c = document.createElement('canvas');
                    c.width = c.height = SPRITE;
                    const ctx = c.getContext('2d');
                    ctx.drawImage(img, 0, 0, SPRITE, SPRITE);

                    const ink = hexToRgb(color);
                    const pap = hexToRgb(paper || color);
                    const frame = ctx.getImageData(0, 0, SPRITE, SPRITE);
                    const d = frame.data;
                    for (let i = 0; i < d.length; i += 4) {
                        if (!d[i + 3]) continue;
                        const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
                        d[i] = ink[0] + (pap[0] - ink[0]) * lum;
                        d[i + 1] = ink[1] + (pap[1] - ink[1]) * lum;
                        d[i + 2] = ink[2] + (pap[2] - ink[2]) * lum;
                    }
                    ctx.putImageData(frame, 0, 0);
                    g.inkCache[cacheKey] = c;
                    return c;
                },

                // The coloured character tokens are drawn as-is.
                raw: function (name) { return this._sp.sprites[name] || null; },

                // ------------------------------------------------------ course

                startRun: function () {
                    const g = this._sp;
                    this.explored = 1;
                    this.streak = 0;
                    g.rooms = [];
                    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
                    g.rand = mulberry(seed);
                    RUN_SALT = seed >>> 0;

                    const start = makeRoom(0, 0, kindForDepth(0));
                    start.state = 'visited';
                    start.reveal = 1;
                    g.rooms.push(start);
                    g.current = start;

                    g.pawn.x = start.x0 + PITCH * 1.2;
                    g.pawn.y = start.y0 - STAND;
                    this.depth = 1;
                    this.setRoomLabel(start);
                },

                /**
                 * Deals a fresh question and lays its answers out on the current
                 * room's blocks. The correct answer is always among them.
                 */
                prepareRound: function () {
                    const g = this._sp;
                    if (this._destroyed) return;

                    const q = generateFromList(
                        this.currentApp.listName,
                        this.currentApp.questionIndex,
                        this.currentApp.resultIndex,
                        this.currentAppId,
                        getSetItems(this.currentApp),
                        this.currentApp.questionType
                    );

                    const room = g.current;
                    const wrong = q.options.filter(o => o !== q.result);
                    const count = Math.min(3, 1 + wrong.length);
                    const labels = this.shuffle([q.result].concat(this.shuffle(wrong).slice(0, count - 1)));

                    room.blocks = buildBlocks(room, count, mulberry(roomSeed(room.index) ^ 0x51ed));
                    room.blocks.forEach((b, i) => {
                        b.label = labels[i];
                        b.plain = stripTags(labels[i]);
                    });

                    this.questionHtml = q.question;
                    this.result = q.result;
                    this.questionIndex = q.questionIndex;
                    this.feedback = '';
                    this.feedbackBad = this.feedbackGood = false;
                    g.state = 'question';
                    g.signIn = 0;
                    g.roundStart = performance.now();
                    this.roundToken++;

                    if (this.reloadProgress()) {
                        this.aimCamera();
                        // Input stays shut until the answers are legible.
                        this.locked = true;
                        this.hotspots = [];
                        g.awaitInput = true;
                        if (typeof q.action === 'function') q.action();
                    }
                },

                setRoomLabel: function (room) {
                    const spec = ROOM_KINDS[room.kind];
                    this.roomHint = spec.hint;
                    this.depth = room.index + 1;
                },

                // ------------------------------------------------------- answers

                answer: function (index) {
                    const g = this._sp;
                    if (this.locked || g.state !== 'question') return;
                    const block = (g.current.blocks || [])[index];
                    if (!block || block.state !== 'closed') return;

                    this.locked = true;
                    this.hotspots = [];

                    if (block.label === this.result) this.onCorrect(block);
                    else this.onWrong(block);
                },

                onCorrect: function (block) {
                    const g = this._sp;
                    this.streak++;
                    this.feedbackGood = true;
                    this.feedbackBad = false;
                    this.playSound(true);

                    updateWeightForKey(this.currentAppId, this.questionIndex, -1);
                    this.score += 1;
                    const quick = !this.reduced && (performance.now() - g.roundStart) < 4500;
                    if (quick) this.score += 1;

                    if (!this.reloadProgress()) return;      // stage finished; router took over
                    this.saveScore();

                    block.state = 'solved';
                    block.popT = 0;
                    this.gems += 1;                          // a coin pops from the block
                    this.feedback = quick ? this.getSuccessMsg() + ' ⚡ בונוס מהירות' : this.getSuccessMsg();
                    this.puff({ x: block.wx, y: block.wy }, 'good', 16);

                    // The shooting/shield rooms fire an arrow so the hit reads as a shot.
                    const kind = g.current.kind;
                    if (kind === 'shoot' || kind === 'shield') {   // an arrow flies from the bow to the hit
                        this.launchArrow({ x: g.pawn.x + PITCH * 0.4, y: g.pawn.y - PITCH * 0.1 },
                            { x: block.wx, y: block.wy }, { dur: 0.45, arc: PITCH * 0.5 });
                    }
                    this.beginAdvance(block);
                },

                /** A single arrow flying `from`→`to` over `dur` seconds, with optional arc. */
                launchArrow: function (from, to, opts) {
                    const g = this._sp;
                    if (!g.shots) g.shots = [];
                    g.shots.push({
                        x0: from.x, y0: from.y, x1: to.x, y1: to.y,
                        t: 0, dur: this.dur((opts && opts.dur) || 0.5), arc: (opts && opts.arc) || 0,
                    });
                },

                onWrong: function (block) {
                    const g = this._sp;
                    this.streak = 0;
                    this.feedbackBad = true;
                    this.feedbackGood = false;
                    this.playSound(false);

                    this.score = Math.max(0, this.score - 1);
                    this.saveScore();
                    updateWeightForKey(this.currentAppId, this.questionIndex, 1);

                    const spec = ROOM_KINDS[g.current.kind] || ROOM_KINDS.jump;
                    this.feedback = spec.wrongText || 'נסו תשובה אחרת';

                    if (!this.reloadProgress()) return;

                    // With motion on, the pawn actually tries the wrong apparatus and it
                    // fails under it — the block crumbles mid-attempt, not instantly.
                    if (!this.reduced && FAILS[g.current.kind]) {
                        this.beginFail(block);
                        return;
                    }

                    // Reduced motion / fallback: the wrong answer resolves in place (a gate
                    // locks; anything else crumbles) and the others stay to be tried.
                    this.shake(10);
                    if (g.current.kind === 'doors') {
                        block.state = 'locked'; block.rattleT = 0;
                    } else {
                        this.puff({ x: block.wx, y: block.wy }, 'bad', 14);
                        block.state = 'crumbled'; block.crumbleT = 0;
                    }
                    this.own(() => {
                        if (this._destroyed) return;
                        this.aimCamera();
                        this.locked = false;
                        this.syncHotspots();
                    }, this.dur(1.2) * 1000);
                },

                /**
                 * The wrong-answer attempt (motion on). Sends the pawn onto the wrong
                 * apparatus in the room's own style (FAILS[kind].approach); snapFail then
                 * breaks it and plays the fallout; finishFail returns the pawn.
                 */
                beginFail: function (block) {
                    const g = this._sp;
                    const from = g.current;
                    const cfg = FAILS[from.kind];
                    if (from.kind === 'rail') block.riding = true;   // the cart leaves its parking to loop
                    const app = cfg.approach(from, block, { x: g.pawn.x, y: g.pawn.y });
                    g.walk = {
                        t: 0, dur: this.dur(app.secs || 1.2), pts: app.pts, style: app.style, track: app.track,
                        fail: true, phase: 'approach', failBlock: block, cfg: cfg,
                        home: { x: from.x0 + PITCH * 1.2, y: from.y0 - STAND },
                    };
                    g.state = 'failing';
                },

                // The apparatus gives way under the pawn: the block crumbles and the
                // pawn plays out the fallout from wherever it now stands.
                snapFail: function () {
                    const g = this._sp;
                    const w = g.walk;
                    const b = w.failBlock;
                    if (g.current.kind === 'doors') {   // a gate does not break — it locks
                        b.state = 'locked'; b.rattleT = 0; this.shake(5);
                    } else if (g.current.kind === 'tower') {   // the ladder snaps off and drops with the pawn
                        b.state = 'falling'; b.fallT = 0; this.shake(12);
                        this.puff({ x: g.pawn.x, y: g.pawn.y }, 'bad', 12);
                    } else if (g.current.kind === 'rail') {    // the cart looped back — parked and crossed out
                        b.state = 'crumbled'; b.crumbleT = 1; b.riding = false;
                        this.aimCamera();   // ride camera was chasing far out; settle back onto the room for the drop
                    } else {
                        b.state = 'crumbled'; b.crumbleT = 0; this.shake(9);
                        this.puff({ x: g.pawn.x, y: g.pawn.y }, 'bad', 12);
                    }
                    if (w.cfg.miss && (g.current.kind === 'shoot' || g.current.kind === 'shield')) {
                        this.launchArrow({ x: g.pawn.x + PITCH * 0.4, y: g.pawn.y - PITCH * 0.1 },
                            { x: b.wx + PITCH * 1.6, y: b.wy - PITCH * 0.6 }, { dur: 0.5, arc: PITCH * 0.5 });
                    }
                    const r = w.cfg.react(g.current, b, { x: g.pawn.x, y: g.pawn.y });
                    g.walk = {
                        t: 0, dur: this.dur(r.secs || 0.9), pts: r.pts, style: r.style,
                        fail: true, phase: 'react', failBlock: b, cfg: w.cfg, home: w.home,
                    };
                },

                // Fallout done: the pawn is back at the landing spot and input reopens,
                // with the correct answer (still there) to try again.
                finishFail: function () {
                    const g = this._sp;
                    const w = g.walk;
                    // A ladder that fell settles into a crossed-out stub at its old spot.
                    if (w.failBlock && w.failBlock.state === 'falling') {
                        w.failBlock.state = 'crumbled'; w.failBlock.crumbleT = 1;
                    }
                    const home = w.home;
                    g.walk = null;
                    g.pawn.x = home.x;
                    g.pawn.y = home.y;
                    g.state = 'question';
                    this.aimCamera();
                    this.locked = false;
                    this.syncHotspots();
                },

                /**
                 * Extends the course by one room and sends the pawn through it the way
                 * that room is played — not one universal hop. Each kind picks its own
                 * path and `style` (which drawPawn reads for the pose): jump hops over
                 * the block; doors/bridge walk straight through; tower climbs the rungs;
                 * rail rides the cart; crate shoves it forward; shoot/shield resolve in
                 * place then step out. The apparatus itself animates in drawBlocks.
                 */
                beginAdvance: function (block) {
                    const g = this._sp;
                    const from = g.current;
                    const exit = EXITS[from.kind] || EXITS.jump;
                    const placed = exit.place(from);
                    const next = makeRoom(from.index + 1, placed.x0, kindForDepth(from.index + 1), placed.y0);
                    next.state = 'visited';
                    next.reveal = 0;
                    this.explored++;
                    this.setRoomLabel(next);

                    if (exit.transition === 'pageflip') {
                        // Not added to the world yet — a page-flip room sits on the same
                        // patch of paper as the room being left, so it must not be drawn
                        // over it during the walk/ride. beginPageFlip swaps it in.
                        // Walk to the chosen door (doors), or ride the coaster off the top
                        // of the page (rail); reaching the end (finishWalk) turns the page.
                        this.hotspots = [];
                        const start = { x: g.pawn.x, y: g.pawn.y };
                        if (exit.ridePath) block.riding = true;   // the answer cart itself is what rides
                        const r = exit.ridePath
                            ? exit.ridePath(from, next, block, start)
                            : { pts: [start, { x: block.wx, y: from.y0 - STAND }], style: 'walk', secs: 1.4 };
                        g.walk = {
                            t: 0, dur: this.dur(r.secs || 1.4), pts: r.pts, style: r.style,
                            target: null, flipTo: next, track: r.track,
                            doorBlock: (from.kind === 'doors' ? block : null),
                        };
                        g.state = 'walking';
                        return;
                    }

                    g.rooms.push(next);   // a walked-to room extends the course beside this one
                    const start = { x: g.pawn.x, y: g.pawn.y };
                    const r = exit.path(from, next, block, start);
                    g.walk = {
                        t: 0, dur: this.dur(r.secs || 2.2), pts: r.pts, style: r.style,
                        target: next,
                        fromFrame: this.frameFor(from),
                        toFrame: this.frameFor(next),
                    };
                    g.state = 'walking';
                    this.aimCameraFor(next);
                },

                /**
                 * Turns the notebook page to the next room (doors). Photographs the
                 * current frame with the pawn left out and — if a door was reached —
                 * punches a hole through the photo exactly where the open doorway is, so
                 * the next room shows through the open door before the old sheet peels
                 * away over it (drawPageTurn). Ported from scribble-dungeon's descend().
                 */
                beginPageFlip: function (next, doorBlock) {
                    const g = this._sp;
                    let snap = null, hole = null;
                    // Where the pawn stands on screen right now (old camera) — the flip
                    // pivots around this so a door-step doesn't jump the pawn across the page.
                    const pin = this.worldToScreen(g.pawn.x, g.pawn.y);
                    // A coaster ride leaves the camera chasing the cart far off the page.
                    // Pull it back onto the room being left (still g.current) before the
                    // photo, so the sheet that peels away is that room's page — not the
                    // empty paper the cart flew over.
                    if (!doorBlock) this.snapCamera();
                    else hole = this.worldToScreen(doorBlock.wx, doorBlock.wy);
                    try {
                        // The pawn steps through the door, so it is not part of the sheet
                        // that turns: repaint without it and photograph that.
                        g.hidePawn = true;
                        this.render();
                        g.hidePawn = false;
                        snap = document.createElement('canvas');
                        snap.width = g.canvas.width;
                        snap.height = g.canvas.height;
                        const sctx = snap.getContext('2d');
                        sctx.drawImage(g.canvas, 0, 0);
                        if (hole) {
                            sctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
                            const hw = PITCH * 0.4 * g.cam.z;
                            const ht = PITCH * 0.92 * g.cam.z;   // the tall 2-tile gateway
                            sctx.clearRect(hole.x - hw, hole.y - ht, hw * 2, ht * 2);
                        }
                    } catch (e) { snap = null; }

                    // The turned page is a clean sheet: the room just left is gone from the
                    // world, so nothing of it shows beside the new one.
                    g.rooms = [next];
                    g.current = next;
                    next.reveal = 1;
                    const fr = this.frameFor(next);
                    const landAt = { x: next.x0 + PITCH * 1.2, y: next.y0 - STAND };  // the entrance floor

                    if (doorBlock) {
                        // Doors: the pawn stepped through in place. Hold the fresh room so
                        // its entrance sits on the exact screen point the pawn occupied in
                        // the doorway; the sheet peels around it (as scribble-dungeon's
                        // descend does). prepareRound eases out to centre once it settles.
                        g.pawn.x = landAt.x; g.pawn.y = landAt.y;
                        g.cam.z = g.cam.tz = fr.z;
                        g.cam.x = g.cam.tx = g.pawn.x - (pin.x - g.view.w / 2) / fr.z;
                        g.cam.y = g.cam.ty = g.pawn.y - (pin.y - g.view.h / 2) / fr.z;
                    } else {
                        // A coaster crash hurls the rider onto the fresh page: it flies in
                        // over the entrance and tumbles down to land — one full spin — while
                        // the old sheet peels away. This landing walk runs alongside the page
                        // turn (both advance in step); finishWalk settles it upright.
                        this.aimCameraFor(next);
                        this.snapCamera();
                        const entry = { x: next.x0 - PITCH * 1.0, y: next.y0 - PITCH * 5.6 };
                        const arc = { x: next.x0 + PITCH * 0.5, y: next.y0 - PITCH * 4.9 };
                        g.pawn.x = entry.x; g.pawn.y = entry.y;
                        g.walk = {
                            t: 0, dur: this.dur(1.7), style: 'tumble',
                            pts: [entry, arc, landAt], landing: true, landAt: landAt,
                        };
                    }
                    g.page = { t: 0, dur: this.dur(2.0), snap: snap };
                    g.state = 'flipping';
                },

                finishWalk: function () {
                    const g = this._sp;
                    const w = g.walk;
                    // A door walk turns the page through the doorway instead of arriving.
                    if (w && w.flipTo) {
                        g.walk = null;
                        this.beginPageFlip(w.flipTo, w.doorBlock);
                        return;
                    }
                    // A coaster crash-landing on the fresh page: settle upright at the
                    // entrance and let the page turn (still running) start the round.
                    if (w && w.landing) {
                        g.pawn.x = w.landAt.x;
                        g.pawn.y = w.landAt.y;
                        g.walk = null;
                        return;
                    }
                    const to = w.target;
                    g.walk = null;
                    g.current = to;
                    g.state = 'idle';
                    this.own(() => {
                        if (!this._destroyed) this.prepareRound();
                    }, this.dur(0.9) * 1000);
                },

                // -------------------------------------------------------- camera

                aimCamera: function () { this.aimCameraFor(this._sp.current); },

                aimCameraFor: function (room) {
                    if (!room) return;
                    if (this.mapMode) return this.aimWholeCourse();
                    const f = this.frameFor(room);
                    const g = this._sp;
                    g.cam.tx = f.x; g.cam.ty = f.y; g.cam.tz = f.z;
                },

                /** Camera position and zoom that frames one room, biased up for sky. */
                frameFor: function (room) {
                    const g = this._sp;
                    const b = roomBounds(room);
                    const pad = VIEW_PAD * PITCH;
                    const w = b.w + pad * 2;
                    const h = b.h + pad * 2;
                    return {
                        x: room.x0 + (room.x1 - room.x0) / 2,
                        y: room.y0 - PITCH * 1.6,
                        z: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM,
                            Math.min(g.view.w / w, g.view.h / h))),
                    };
                },

                aimWholeCourse: function () {
                    const g = this._sp;
                    if (!g.rooms.length) return;
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    g.rooms.forEach(r => {
                        minX = Math.min(minX, r.x0); maxX = Math.max(maxX, r.x1);
                        minY = Math.min(minY, r.y0 - PITCH * 6); maxY = Math.max(maxY, r.y0 + PITCH);
                    });
                    const pad = PITCH * 2;
                    this.frame(minX - pad, minY, maxX - minX + pad * 2, maxY - minY);
                },

                frame: function (x, y, w, h) {
                    const g = this._sp;
                    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM,
                        Math.min(g.view.w / w, g.view.h / h)));
                    g.cam.tx = x + w / 2;
                    g.cam.ty = y + h / 2;
                    g.cam.tz = zoom;
                },

                snapCamera: function () {
                    const g = this._sp;
                    this.aimCamera();
                    g.cam.x = g.cam.tx; g.cam.y = g.cam.ty; g.cam.z = g.cam.tz;
                },

                toggleMap: function () {
                    this.mapMode = !this.mapMode;
                    if (this.mapMode) this.aimWholeCourse(); else this.aimCamera();
                    this.syncHotspots();
                },

                worldToScreen: function (x, y) {
                    const g = this._sp;
                    return {
                        x: (x - g.cam.x) * g.cam.z + g.view.w / 2,
                        y: (y - g.cam.y) * g.cam.z + g.view.h / 2,
                    };
                },

                // ------------------------------------------------------ hotspots

                syncHotspots: function () {
                    const g = this._sp;
                    if (g.state !== 'question' || this.locked || !g.current) {
                        this.hotspots = [];
                        return;
                    }
                    this.hotspots = (g.current.blocks || [])
                        .filter(b => b.state === 'closed')
                        .map(b => {
                            const r = this.hotRect(b);
                            return {
                                id: g.current.index + ':' + b.index,
                                index: b.index, plain: b.plain,
                                x: r.x, y: r.y, w: r.w, h: r.h,
                            };
                        });
                },

                // The tap-target rectangle for an answer: the drawn bubble (scribbleRing)
                // is wider and taller than the raw sign box — radii 0.55·w and 0.66·h — so
                // it overhangs by 0.05·w and 0.16·h a side. Grow the box to that outline so
                // the button sits exactly on the whole visible answer, not an inset rect.
                hotRect: function (block) {
                    const box = this.signBox(block);
                    const ex = box.w * 0.05, ey = box.h * 0.16;
                    return { x: box.x - ex, y: box.y - ey, w: box.w + ex * 2, h: box.h + ey * 2 };
                },

                // Re-place the existing tap-buttons on their bubbles without rebuilding the
                // list (so hover/focus survive), matched by answer index. Called each frame
                // while a question is up, so the buttons follow the bubbles as the camera eases.
                refreshHotspots: function () {
                    const g = this._sp;
                    if (g.state !== 'question' || !g.current) return;
                    const byIndex = {};
                    (g.current.blocks || []).forEach(b => { byIndex[b.index] = b; });
                    for (let i = 0; i < this.hotspots.length; i++) {
                        const hot = this.hotspots[i];
                        const b = byIndex[hot.index];
                        if (!b || b.state !== 'closed') { this.syncHotspots(); return; }
                        const r = this.hotRect(b);
                        hot.x = r.x; hot.y = r.y; hot.w = r.w; hot.h = r.h;
                    }
                },

                /**
                 * Screen-space rectangle of an answer, lifted into clear space above
                 * its block (so the block art is never covered) and kept at a fixed
                 * pixel size so it stays legible however far out the map is zoomed.
                 * Clamped on screen, below the question heading; drawSigns draws a
                 * leader arrow from the block back up to it.
                 */
                signBox: function (block) {
                    const g = this._sp;
                    const img = isImageOption(block.label);
                    const m = this.signMetrics();
                    const k = m.k;
                    const cap = Math.min(220 * k, m.cap);
                    const w = img ? Math.min(92 * k, cap)
                        : Math.max(Math.min(84 * k, cap),
                            Math.min(cap, this.measure(block.plain) + 34 * k));
                    const h = (img ? 92 : 50) * k;
                    const s = this.worldToScreen(block.wx, block.wy);
                    const pad = 8;
                    // Clear the top of the block, plus a gap for the arrow — a gate stands
                    // two tiles tall, so its sign has to lift a full tile higher.
                    const half = (g.current && ROOM_KINDS[g.current.kind].layout === 'gate') ? PITCH : SPRITE / 2;
                    let lift = half * g.cam.z + 28;
                    // Bridge answers sit close together over the span; step alternate labels
                    // up so their bubbles form an arch above the aqueduct instead of
                    // colliding edge to edge.
                    if (g.current && ROOM_KINDS[g.current.kind].layout === 'span') {
                        lift += (block.index % 2) * (h + 26);
                    }
                    return {
                        x: Math.max(pad, Math.min(g.view.w - w - pad, s.x - w / 2)),
                        y: Math.max(112, Math.min(g.view.h - h - 60, s.y - h - lift)),
                        w: w, h: h,
                    };
                },

                /**
                 * Sign sizing. Answer signs are laid out in fixed screen pixels, so on a
                 * narrow phone the word sat over the busy pencil art at the same 22px it
                 * uses on a desktop reads as just more scribble. Grow the whole sign —
                 * box, font, ring, leader arrow and tap target all derive from signBox —
                 * as the viewport narrows, but never past the point where the row stops
                 * holding all `n` of them side by side. `cap` is the widest a single sign
                 * may get before it starts crowding its neighbour.
                 */
                signMetrics: function () {
                    const g = this._sp;
                    const n = Math.max(2, ((g.current && g.current.blocks) || [])
                        .filter(b => b.state === 'closed').length || 3);
                    const grow = Math.max(1, 1 + (900 - g.view.w) / 900);
                    const share = g.view.w / n;
                    return {
                        k: Math.max(0.9, Math.min(1.55, grow, share / 118)),
                        cap: Math.max(80, share - 10),
                    };
                },

                signScale: function () { return this.signMetrics().k; },

                signFont: function () {
                    return '700 ' + Math.round(SIGN_PX * this.signScale()) + 'px ' + HAND_FONT;
                },

                measure: function (text) {
                    const g = this._sp;
                    g.ctx.save();
                    g.ctx.font = this.signFont();
                    const w = g.ctx.measureText(text).width;
                    g.ctx.restore();
                    return w;
                },

                // -------------------------------------------------------- effects

                puff: function (pt, kind, count) {
                    if (this.reduced) return;
                    const g = this._sp;
                    for (let i = 0; i < count && g.fx.length < 90; i++) {
                        const a = Math.random() * Math.PI * 2;
                        const sp = 30 + Math.random() * 90;
                        g.fx.push({
                            x: pt.x, y: pt.y,
                            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
                            life: 0.5 + Math.random() * 0.4, age: 0, kind: kind,
                        });
                    }
                },

                shake: function (amount) {
                    if (this.reduced) return;
                    this._sp.shakeAmp = amount;
                },

                playSound: function (ok) {
                    try {
                        const s = ok ? successSound : failureSound;
                        if (s && s.play) { const p = s.play(); if (p && p.catch) p.catch(() => { }); }
                    } catch (e) { /* audio is optional */ }
                },

                // --------------------------------------------------------- render

                resize: function () {
                    const g = this._sp;
                    const stage = this.$refs.stage;
                    if (!stage || !g) return;
                    const w = Math.max(240, stage.clientWidth);
                    const h = Math.max(200, stage.clientHeight);
                    const dpr = Math.min(global.devicePixelRatio || 1, 2);
                    g.view.w = w; g.view.h = h;
                    g.canvas.width = Math.round(w * dpr);
                    g.canvas.height = Math.round(h * dpr);
                    g.canvas.style.width = w + 'px';
                    g.canvas.style.height = h + 'px';
                    g.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    g.dpr = dpr;
                    if (this.mapMode) this.aimWholeCourse(); else this.aimCamera();
                    this.syncHotspots();
                },

                // Draws one sprite centred on a world pixel, optionally rotated/scaled.
                blitPx: function (ctx, img, px, py, rot, alpha, scale) {
                    if (!img || alpha <= 0) return;
                    ctx.save();
                    if (alpha != null) ctx.globalAlpha = alpha;
                    ctx.translate(px, py);
                    if (rot) ctx.rotate(rot);
                    if (scale && scale !== 1) ctx.scale(scale, scale);
                    ctx.drawImage(img, -SPRITE / 2, -SPRITE / 2, SPRITE, SPRITE);
                    ctx.restore();
                },

                // How much of a column is drawn yet, while a room inks in left→right.
                colReveal: function (room, px) {
                    if (room.reveal >= 1) return 1;
                    const frac = (px - room.x0) / (room.x1 - room.x0);
                    return clamp01((room.reveal * 1.35 - frac) / 0.3);
                },

                drawRoom: function (ctx, room) {
                    const g = this._sp;
                    const pal = g.pal;
                    const spec = ROOM_KINDS[room.kind];
                    const sketch = room.state !== 'visited';
                    const color = sketch ? pal.faint : pal.ink;
                    const surface = sketch ? pal.paper : pal.floor;

                    // Sky decor first (clouds), behind everything.
                    room.decor.filter(d => d.sky).forEach(d => {
                        const k = this.colReveal(room, d.x);
                        if (k <= 0) return;
                        const w = this.reduced ? null : WOBBLE[d.sprite];
                        let sc = d.scale * (1 + (1 - k) * 0.1);
                        let drift = 0;
                        if (w) { const t = g.time * w.hz + d.phase; sc *= 1 + Math.sin(t) * w.s; drift = Math.sin(t) * d.drift; }
                        this.blitPx(ctx, this.inked(d.sprite, pal.faint, surface),
                            d.x + drift, d.y, 0, k * 0.85, sc);
                    });

                    // Backdrop structure behind the floor (building front, rampart, gate…).
                    if (!sketch) this.drawEnvironment(ctx, room, color, surface, pal);

                    // Floor: the room's own surface tile with a dirt row beneath it. Some
                    // rooms open a chasm/pit in the middle — spikes at the bottom, and the
                    // bordering columns drop an extra row to read as cliff walls.
                    const floor = this.inked(room.ground || spec.ground, color, surface);
                    const dirt = this.inked('tile', color, surface);
                    const spikes = this.inked('tile_spikes', color, surface);
                    const gap = spec.gap;
                    const cy = groundTileCentreY(room);
                    for (let c = 0; c < ROOM_TILES; c++) {
                        const px = room.x0 + (c + 0.5) * PITCH;
                        const k = this.colReveal(room, px);
                        if (k <= 0) continue;
                        if (gap && c >= gap[0] && c <= gap[1]) {
                            if (spikes) this.blitPx(ctx, spikes, px, cy + PITCH * 2.6, 0, k * 0.85, 1);
                            continue;
                        }
                        this.blitPx(ctx, floor, px, cy, 0, k, 1 + (1 - k) * 0.12);
                        this.blitPx(ctx, dirt, px, cy + PITCH, 0, k * 0.9, 1);
                        if (gap && (c === gap[0] - 1 || c === gap[1] + 1)) {
                            this.blitPx(ctx, dirt, px, cy + PITCH * 2, 0, k * 0.8, 1);
                        }
                    }

                    // Ground decor (bushes, trees, fences).
                    room.decor.filter(d => !d.sky).forEach(d => {
                        const k = this.colReveal(room, d.x);
                        if (k <= 0) return;
                        const w = this.reduced ? null : WOBBLE[d.sprite];
                        let sc = d.scale * (1 + (1 - k) * 0.15);
                        let rot = 0;
                        if (w) { const t = g.time * w.hz + d.phase; sc *= 1 + Math.sin(t) * w.s; rot = Math.sin(t * 0.8) * w.r; }
                        this.blitPx(ctx, this.inked(d.sprite, color, surface), d.x, d.y, rot, k, sc);
                    });

                    if (!sketch) {
                        if (room.kind === 'rail') this.drawRails(ctx, room, color);
                        this.drawBlocks(ctx, room, color, surface, pal);
                    }
                },

                // Per-room backdrop structure so each room reads as its own piece of
                // architecture, drawn from the pack's structural tiles: a castle wall for
                // the doors, an aqueduct over the bridge chasm, a tower behind the ladders,
                // a turret with a cannon for the shooting range, a rampart with a drawbridge
                // for the shields, a walled yard with a gate for the crate, a timbered mine
                // for the rail. Purely scenic and behind the floor/blocks — the answer
                // apparatus (drawn on top) is the part you actually pass through, and the
                // signs sit clear in the sky, so nothing here occludes an answer.
                drawEnvironment: function (ctx, room, color, surface, pal) {
                    const env = ROOM_KINDS[room.kind].env;
                    if (!env) return;
                    const cy = groundTileCentreY(room);
                    const col = (c) => room.x0 + (c + 0.5) * PITCH;
                    const ink = (name) => this.inked(name, color, surface);
                    // Draw a structural tile at a world point, revealed with the column.
                    const tile = (name, px, py, alpha, scale) => {
                        const k = this.colReveal(room, px);
                        if (k <= 0) return;
                        this.blitPx(ctx, ink(name), px, py, 0, alpha * k, scale || 1);
                    };

                    if (env === 'castle') {                 // doors — three looks for the gate scene
                        const v = room.variant || 0;
                        if (v === 1) {                       // (1) an interior hall: colonnade, arched ceiling, torches
                            for (let c = 0; c < ROOM_TILES; c++) {
                                const px = col(c);
                                for (let r = 1; r <= 3; r++) tile('tile_stone', px, cy - PITCH * r, 0.5);
                                tile('tile_arch', px, cy - PITCH * 3.5, 0.6);      // arcade along the ceiling
                            }
                            [1, 3.75, 7.25, ROOM_TILES - 1].forEach(c => {
                                for (let r = 0; r <= 3; r++) tile('tile_column', col(c), cy - PITCH * r, 0.62);
                                this.drawTorch(ctx, col(c), cy - PITCH * 2.2, pal, this.colReveal(room, col(c)));
                            });
                        } else if (v === 2) {                // (2) a stone keep: big blocks, windows, turret roofs
                            for (let c = 0; c < ROOM_TILES; c++) {
                                const px = col(c);
                                for (let r = 1; r <= 3; r++) tile('tile_stone', px, cy - PITCH * r, 0.82);
                                tile('tile_castle', px, cy - PITCH * 3.9, 0.9);
                            }
                            [3.75, 7.25].forEach(c => tile('tile_blockWindow', col(c), cy - PITCH * 2, 0.6));
                            [0, ROOM_TILES - 1].forEach(c => {
                                for (let r = 0; r <= 3; r++) tile('tile_archColumn', col(c), cy - PITCH * r, 0.82);
                                tile('tile_roof', col(c), cy - PITCH * 4.7, 0.82, 1.3);   // corner turret caps
                            });
                        } else {                             // (0) the exterior battlemented brick wall
                            for (let c = 0; c < ROOM_TILES; c++) {
                                const px = col(c);
                                for (let r = 1; r <= 3; r++) tile('tile_brick', px, cy - PITCH * r, 0.82);
                                tile('tile_castle', px, cy - PITCH * 3.9, 0.9);
                            }
                            [0, ROOM_TILES - 1].forEach(c => {
                                for (let r = 0; r <= 3; r++) tile('tile_archColumn', col(c), cy - PITCH * r, 0.78);
                            });
                        }
                    } else if (env === 'turret') {          // shoot: a stone turret with a cannon
                        for (let c = 0; c < ROOM_TILES; c++) {
                            const px = col(c);
                            for (let r = 1; r <= 3; r++) tile('tile_stone', px, cy - PITCH * r, 0.4);
                            tile('tile_castle', px, cy - PITCH * 3.7, 0.5);
                        }
                        const bx = room.x0 + PITCH * 1.25, bk = this.colReveal(room, bx);
                        if (bk > 0) {                        // the launch cannon at the archer's feet, clear of the targets
                            this.blitPx(ctx, ink('tile_brick'), bx, cy - PITCH, 0, 0.72 * bk, 1);
                            this.blitPx(ctx, ink('item_blaster'), bx + PITCH * 0.32, cy - PITCH * 1.55, -0.6, 0.95 * bk, 1.15);
                        }
                    } else if (env === 'aqueduct') {        // bridge: arches carry the span over the chasm
                        const gap = ROOM_KINDS[room.kind].gap;
                        for (let c = gap[0] - 1; c <= gap[1] + 1; c++) {
                            tile('tile_arch', col(c), cy - PITCH * 0.4, 0.8);
                            tile('tile_archColumns', col(c), cy + PITCH * 0.95, 0.6);
                        }
                    } else if (env === 'rampart') {         // shield: a rampart with a drawbridge
                        for (let c = 0; c < ROOM_TILES; c++) {
                            const px = col(c);
                            for (let r = 1; r <= 2; r++) tile('tile_brick', px, cy - PITCH * r, 0.42);
                            tile('tile_castle', px, cy - PITCH * 2.7, 0.52);
                        }
                        for (let c = 1; c < ROOM_TILES - 1; c += 3) tile('tile_column', col(c), cy - PITCH, 0.3);
                        tile('tile_slope', room.x1 - PITCH * 0.9, cy - PITCH * 0.2, 0.82, 1.35);
                    } else if (env === 'yard') {            // crate — a walled yard, two looks
                        const v = room.variant || 0;
                        const back = v === 1 ? 'tile_brick' : 'tile_stone';
                        for (let c = 0; c < ROOM_TILES; c++) {
                            for (let r = 1; r <= (v === 1 ? 3 : 2); r++) tile(back, col(c), cy - PITCH * r, v === 1 ? 0.5 : 0.32);
                        }
                        if (v === 1) for (let c = 0; c < ROOM_TILES; c++) tile('tile_castle', col(c), cy - PITCH * 3.9, 0.6);
                        [0.4, ROOM_TILES - 0.8].forEach(c => {   // stacked crates in the corners (scenery)
                            tile('tile_crate', col(c), cy - PITCH * 0.5, 0.5);
                            tile('tile_crateSmall', col(c), cy - PITCH * 1.25, 0.5, 0.8);
                        });
                    } else if (env === 'tower') {           // tower — three keep looks
                        const v = room.variant || 0;
                        const left = 2, right = ROOM_TILES - 3, midc = (left + right) / 2;
                        const body = v === 1 ? 'tile_stone' : 'tile_brick';
                        for (let c = left; c <= right; c++) {
                            const px = col(c);
                            for (let r = 1; r <= 6; r++) tile(body, px, cy - PITCH * r, 0.5);
                        }
                        if (v === 2) {                       // (2) a spired tower: tall roof, many windows
                            tile('tile_roof', col(midc), cy - PITCH * 7.0, 0.7, 2.6);
                            [left + 0.5, midc, right - 0.5].forEach((c, i) => tile('tile_blockWindow', col(c), cy - PITCH * (3 + i * 0.9), 0.5));
                        } else {                             // battlemented crown (v0/v1)
                            for (let c = left; c <= right; c++) tile('tile_castle', col(c), cy - PITCH * 6.4, 0.62);
                            tile('tile_blockWindow', col(left + 0.5), cy - PITCH * 3.3, 0.5);
                            tile('tile_blockWindow', col(right - 0.5), cy - PITCH * 4.6, 0.5);
                            if (v === 1) {                   // (1) stone keep: a flag + corner pilasters
                                tile('tile_flag', col(midc), cy - PITCH * 7.2, 0.72, 1.2);
                                for (let r = 1; r <= 6; r++) { tile('tile_archColumn', col(left), cy - PITCH * r, 0.55); tile('tile_archColumn', col(right), cy - PITCH * r, 0.55); }
                            } else {                         // (0) brick keep with a central roof
                                tile('tile_roof', col(midc), cy - PITCH * 7.2, 0.66, 1.7);
                            }
                        }
                    } else if (env === 'mine') {            // rail: a timbered mine shaft
                        for (let r = 1; r <= 3; r++) {
                            tile('tile_stone', col(0), cy - PITCH * r, 0.5);
                            tile('tile_stone', col(ROOM_TILES - 1), cy - PITCH * r, 0.5);
                        }
                        tile('tile_fenceHigh', col(1.4), cy - PITCH * 1.1, 0.5, 1.15);
                        tile('tile_hang', col(2.2), cy - PITCH * 2.6, 0.55, 0.8);
                        tile('tile_slope', room.x1 - PITCH * 0.6, cy - PITCH * 0.1, 0.72, 1.2);
                    } else if (env === 'meadow') {          // jump: a stone pier holds up each stepping-stone
                        (room.blocks || []).forEach(b => {
                            for (let r = 1; r <= 2; r++) tile('tile_archColumn', b.wx, cy + PITCH * r, 0.42);
                        });
                    }
                },

                /** A wall torch: a short bracket and a flickering flame (warm accent). */
                drawTorch: function (ctx, x, y, pal, k) {
                    if (k <= 0) return;
                    const t = this._sp.time * 6;
                    const fw = PITCH * 0.13 * (1 + Math.sin(t) * 0.15);
                    ctx.save();
                    ctx.globalAlpha = k;
                    ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - PITCH * 0.2); ctx.stroke();   // bracket
                    ctx.fillStyle = pal.bad;                                                           // flame
                    ctx.beginPath();
                    ctx.moveTo(x, y - PITCH * 0.56);
                    ctx.quadraticCurveTo(x + fw, y - PITCH * 0.3, x, y - PITCH * 0.2);
                    ctx.quadraticCurveTo(x - fw, y - PITCH * 0.3, x, y - PITCH * 0.56);
                    ctx.fill();
                    ctx.globalAlpha = k * 0.85; ctx.fillStyle = pal.sign;                              // inner glow
                    ctx.beginPath();
                    ctx.moveTo(x, y - PITCH * 0.46);
                    ctx.quadraticCurveTo(x + fw * 0.45, y - PITCH * 0.31, x, y - PITCH * 0.24);
                    ctx.quadraticCurveTo(x - fw * 0.45, y - PITCH * 0.31, x, y - PITCH * 0.46);
                    ctx.fill();
                    ctx.restore();
                },

                /**
                 * The rail room's tracks: two pencil rails with sleepers, fanning
                 * from one junction up to each cart, so the answers read as diverging
                 * routes. Drawn under the carts (drawBlocks paints them on top).
                 */
                drawRails: function (ctx, room, color) {
                    const blocks = room.blocks || [];
                    const tracks = railTracks(room, blocks.length);
                    blocks.forEach((b, i) => {
                        if (b.state === 'crumbled') return;
                        const k = this.colReveal(room, b.wx);
                        if (k <= 0) return;
                        const a = k * (b.state === 'solved' ? 0.4 : 0.85);
                        this.drawRailPath(ctx, sampleCurve(tracks[i].pts, 10), color, a);
                    });
                },

                /** A coaster path: two offset rails plus sleepers, along a polyline. */
                drawRailPath: function (ctx, curve, color, alpha) {
                    if (!curve || curve.length < 2) return;
                    const gauge = PITCH * 0.15;
                    const norm = (j) => {
                        const q = curve[Math.min(curve.length - 1, j + 1)];
                        const p = curve[Math.max(0, j - 1)];
                        const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
                        return { x: -dy / len, y: dx / len };
                    };
                    ctx.save();
                    ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                    ctx.globalAlpha = alpha; ctx.lineWidth = 2;
                    for (let side = -1; side <= 1; side += 2) {          // the two rails
                        ctx.beginPath();
                        for (let j = 0; j < curve.length; j++) {
                            const n = norm(j), x = curve[j].x + n.x * gauge * side, y = curve[j].y + n.y * gauge * side;
                            if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                        }
                        ctx.stroke();
                    }
                    ctx.globalAlpha = alpha * 0.8; ctx.lineWidth = 1.4;   // sleepers
                    for (let j = 1; j < curve.length - 1; j += 2) {
                        const n = norm(j), p = curve[j];
                        ctx.beginPath();
                        ctx.moveTo(p.x + n.x * gauge, p.y + n.y * gauge);
                        ctx.lineTo(p.x - n.x * gauge, p.y - n.y * gauge);
                        ctx.stroke();
                    }
                    ctx.restore();
                },

                // A tower answer is a full-height ladder standing on the room floor and
                // running up off the top of the frame; climbing the right one leads to
                // the floor above (the next room is placed higher up the page).
                drawLadder: function (ctx, room, b, ladder, coin, pal, k) {
                    const foot = room.y0 - PITCH * 0.5;    // lowest rung, at the floor
                    const top = room.y0 - PITCH * 6.5;     // past the top of the frame
                    const falling = b.state === 'falling';
                    const crumbled = b.state === 'crumbled';
                    const solved = b.state === 'solved';

                    if (falling || crumbled) {
                        // The wrong ladder snapped: a broken stub is left at the foot,
                        // crossed out. While it falls, the broken length tumbles down
                        // clutched by the pawn — they drop together.
                        if (ladder) {
                            ctx.save(); ctx.globalAlpha = k * 0.9;
                            ctx.drawImage(ladder, b.wx - SPRITE / 2, foot - SPRITE / 2, SPRITE, SPRITE);
                            ctx.restore();
                        }
                        this.scrawlCross(ctx, b.wx, foot - PITCH * 0.35, pal.bad, 0.85 * k, 1);
                        if (falling && ladder) {
                            const p = this._sp.pawn, t = b.fallT || 0;
                            ctx.save();
                            ctx.globalAlpha = k * Math.max(0, 1 - t * 0.35);
                            ctx.translate(p.x + PITCH * 0.16, p.y - PITCH * 0.1);
                            ctx.rotate(0.4 + t * 0.95);        // tips over as it drops
                            for (let s = -1; s <= 2; s++) {
                                ctx.drawImage(ladder, -SPRITE / 2, s * PITCH * 0.92 - SPRITE / 2, SPRITE, SPRITE);
                            }
                            ctx.restore();
                        }
                        return;
                    }

                    const t = solved ? Math.min(1, b.popT) : 0;
                    ctx.save();
                    ctx.globalAlpha = k;
                    if (ladder) {
                        for (let y = foot; y >= top; y -= PITCH) {
                            ctx.drawImage(ladder, b.wx - SPRITE / 2, y - SPRITE / 2, SPRITE, SPRITE);
                        }
                    }
                    ctx.restore();
                    if (solved && coin) {
                        this.blitPx(ctx, coin, b.wx, b.wy - PITCH * (0.6 + t * 1.2), 0, (1 - t) * k, 0.7 + t * 0.2);
                    }
                },

                /**
                 * A doors-room answer is a tall arched castle gate, two tiles high, set
                 * into the wall so the pawn can walk in through it. Closed it shows two
                 * planked leaves with a ring knocker; the correct one swings open onto a
                 * dark passage (the page-flip cuts its hole here); a wrong one does not
                 * vanish — it rattles and a padlock shows that it is locked.
                 */
                drawGate: function (ctx, room, b, color, surface, pal, k) {
                    const bx = b.wx;
                    const bottom = room.y0;                 // threshold, at the floor
                    const top = room.y0 - PITCH * 2;        // two tiles up
                    const hw = PITCH * 0.44;                // half the opening width
                    const spring = top + hw;                // where the round arch springs
                    const solved = b.state === 'solved';
                    const locked = b.state === 'locked';
                    const openT = solved ? Math.min(1, b.popT) : 0;
                    // A locked gate gives a quick decaying rattle as it is tried.
                    let jig = 0;
                    if (locked) { const rt = b.rattleT || 0; jig = Math.sin(rt * 40) * PITCH * 0.05 * Math.max(0, 1 - rt); }

                    const openPath = () => {
                        ctx.beginPath();
                        ctx.moveTo(bx - hw, bottom);
                        ctx.lineTo(bx - hw, spring);
                        ctx.arc(bx, spring, hw, Math.PI, Math.PI * 2, false);   // arched crown, bulging up
                        ctx.lineTo(bx + hw, bottom);
                        ctx.closePath();
                    };

                    ctx.save();
                    ctx.globalAlpha = k;

                    // The passage behind the leaves: a recess that darkens as it opens.
                    ctx.save();
                    openPath(); ctx.clip();
                    ctx.globalAlpha = k * (0.16 + openT * 0.55);
                    ctx.fillStyle = pal.ink;
                    ctx.fillRect(bx - hw - 2, top - 2, hw * 2 + 4, bottom - top + 4);
                    ctx.restore();

                    // Two planked leaves, hinged at the jambs, retracting as they open.
                    const leaf = (x0, x1) => {
                        if (x1 - x0 < 1) return;
                        ctx.save();
                        openPath(); ctx.clip();
                        ctx.translate(jig, 0);
                        ctx.globalAlpha = k;
                        ctx.fillStyle = pal.prop;
                        ctx.fillRect(x0, top - 2, x1 - x0, bottom - top + 4);
                        ctx.strokeStyle = color; ctx.lineCap = 'round';
                        ctx.globalAlpha = k * 0.55; ctx.lineWidth = 1.4;   // vertical planks
                        const planks = Math.max(1, Math.round((x1 - x0) / (PITCH * 0.2)));
                        for (let i = 1; i < planks; i++) {
                            const px = x0 + (x1 - x0) * i / planks;
                            ctx.beginPath(); ctx.moveTo(px, spring - hw * 0.7); ctx.lineTo(px, bottom - 1); ctx.stroke();
                        }
                        ctx.globalAlpha = k * 0.8; ctx.lineWidth = 2.2;    // iron bands
                        [bottom - PITCH * 0.45, bottom - PITCH * 1.35].forEach(yy => {
                            ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke();
                        });
                        ctx.restore();
                    };
                    leaf(bx - hw, bx - openT * hw);          // left leaf
                    leaf(bx + openT * hw, bx + hw);          // right leaf

                    // The stone arch frame over it all.
                    ctx.globalAlpha = k; ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
                    openPath(); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(bx, top); ctx.lineTo(bx, top - PITCH * 0.14); ctx.stroke();  // keystone tick

                    // A ring knocker where the leaves meet (gone once it opens).
                    if (openT < 0.5) {
                        ctx.globalAlpha = k * (1 - openT * 2); ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.arc(bx + jig, bottom - PITCH * 0.9, PITCH * 0.08, 0, Math.PI * 2); ctx.stroke();
                    }

                    // A padlock marks a gate that was tried and found locked.
                    if (locked) {
                        const lx = bx + jig, ly = bottom - PITCH * 0.98;
                        ctx.globalAlpha = k; ctx.strokeStyle = pal.bad; ctx.fillStyle = pal.bad; ctx.lineWidth = 2.2;
                        ctx.beginPath();                                   // closed shackle
                        ctx.moveTo(lx - PITCH * 0.1, ly + PITCH * 0.07);
                        ctx.lineTo(lx - PITCH * 0.1, ly);
                        ctx.arc(lx, ly, PITCH * 0.1, Math.PI, 0);
                        ctx.lineTo(lx + PITCH * 0.1, ly + PITCH * 0.07);
                        ctx.stroke();
                        ctx.fillRect(lx - PITCH * 0.15, ly + PITCH * 0.06, PITCH * 0.3, PITCH * 0.22);  // body
                        ctx.globalAlpha = k; ctx.fillStyle = pal.paper;    // keyhole
                        ctx.fillRect(lx - PITCH * 0.02, ly + PITCH * 0.12, PITCH * 0.04, PITCH * 0.1);
                    }

                    ctx.restore();
                },

                drawBlocks: function (ctx, room, color, surface, pal) {
                    const g = this._sp;
                    const isTower = room.kind === 'tower';
                    const isDoors = room.kind === 'doors';
                    const isRail = room.kind === 'rail';
                    const block = this.inked(ROOM_KINDS[room.kind].block, color, surface);
                    const coin = this.inked('tile_coin', color, surface);
                    (room.blocks || []).forEach(b => {
                        const k = this.colReveal(room, b.wx);
                        if (k <= 0) return;

                        if (isTower) { this.drawLadder(ctx, room, b, block, coin, pal, k); return; }
                        if (isDoors) { this.drawGate(ctx, room, b, color, surface, pal, k); return; }
                        if (isRail && b.riding) return;   // being ridden — the pawn's cart stands in for it

                        if (b.state === 'crumbled') {
                            if (isRail) {   // a rejected cart loops back and parks, crossed out
                                this.blitPx(ctx, block, b.wx, b.wy, 0, k * 0.5, 1);
                                this.scrawlCross(ctx, b.wx, b.wy, pal.bad, 0.85 * k, 1);
                                return;
                            }
                            // Falls away and fades, with a scrawled X where it was.
                            const t = b.crumbleT;
                            const dy = t * t * PITCH * 3;
                            const a = Math.max(0, 1 - t);
                            this.blitPx(ctx, block, b.wx, b.wy + dy, t * 0.5, a * k, 1 - t * 0.2);
                            this.scrawlCross(ctx, b.wx, b.wy, pal.bad, 0.85 * k, Math.min(1, t * 2));
                            return;
                        }

                        const bob = this.reduced ? 0 : Math.sin(g.time * 1.8 + b.bob) * 2;
                        const solved = b.state === 'solved';
                        const t = solved ? Math.min(1, b.popT) : 0;

                        // Each kind resolves its own apparatus when the answer is cleared.
                        let ox = 0, oy = bob, rot = 0, sx = 1, sy = 1, alpha = k;
                        if (solved) {
                            const kind = room.kind;
                            if (kind === 'crate') { sx = sy = Math.max(0, 1 - t * 0.9); rot = t * 0.6; alpha = k * (1 - t * 0.7); }  // smashed open (a coin pops)
                            else if (kind === 'rail') { ox = t * PITCH * 2.4; oy = bob + t * PITCH * 0.7; }  // rolls off down the track
                            else if (kind === 'shoot') { sx = sy = 1 + t * 0.55; alpha = k * (1 - t); }      // struck: bursts and fades
                            else if (kind === 'shield') { oy = bob - t * PITCH * 0.35; }  // raised to block
                            else if (kind === 'bridge') { sy = 1 + t * 0.12; }            // planked: settles
                            else { const pop = 1 + Math.sin(t * Math.PI) * 0.14; sx = sy = pop; }  // jump/tower: a pop
                        }

                        const grow = 1 + (1 - k) * 0.15;
                        ctx.save();
                        ctx.globalAlpha = alpha;
                        ctx.translate(b.wx + ox, b.wy + oy);
                        if (rot) ctx.rotate(rot);
                        ctx.scale(sx * grow, sy * grow);
                        if (block) {
                            if (room.kind === 'bridge') {
                                // The bridge answer IS a deck stone of the span — a wide, low
                                // slab sitting flush across the arch top, not a plank perched
                                // on it. (Same tile, drawn to deck proportions.)
                                ctx.drawImage(block, -SPRITE * 0.72, -SPRITE * 0.34, SPRITE * 1.44, SPRITE * 0.72);
                            } else {
                                ctx.drawImage(block, -SPRITE / 2, -SPRITE / 2, SPRITE, SPRITE);
                            }
                        }
                        ctx.restore();

                        // A coin springs off a cleared answer (the reward is shared).
                        if (solved && coin) {
                            this.blitPx(ctx, coin, b.wx + ox * 0.5, b.wy - PITCH * (0.6 + t * 1.2), 0,
                                (1 - t) * k, 0.7 + t * 0.2);
                        }
                    });
                },

                /**
                 * A hand-drawn X over a crumbled block. `progress` 0→1 scrawls the two
                 * strokes on one after the other.
                 */
                scrawlCross: function (ctx, px, py, color, alpha, progress) {
                    const p = progress == null ? 1 : progress;
                    if (p <= 0 || alpha <= 0) return;
                    const s = PITCH * 0.42;
                    const a = Math.max(0, Math.min(1, p * 2));
                    const b = Math.max(0, Math.min(1, (p - 0.5) * 2));
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = Math.max(3, s * 0.09);
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(px - s, py - s);
                    ctx.lineTo(px - s + 2 * s * a, py - s + 2 * s * a);
                    if (b > 0) {
                        ctx.moveTo(px + s, py - s);
                        ctx.lineTo(px + s - 2 * s * b, py - s + 2 * s * b);
                    }
                    ctx.stroke();
                    ctx.restore();
                },

                drawPawn: function (ctx) {
                    const g = this._sp;
                    const p = g.pawn;
                    const body = this.raw(pawnBody(p.color));
                    const hand = this.raw(pawnHand(p.color));
                    // The advance style decides the pose: only a real hop squashes;
                    // walking/pushing/crossing take a foot-fall stride; climbing reaches
                    // up; riding sits in a cart.
                    const style = g.walk ? (g.walk.style || 'hop') : null;
                    const hopping = style === 'hop';
                    const moving = !!style;
                    const climbing = style === 'climb';
                    const riding = style === 'ride';
                    const launching = style === 'launch';
                    const falling = style === 'fall';      // wrong tower ladder / plank / cart
                    const recoiling = style === 'recoil';  // recoil off a slammed door / shattered shield
                    const tumbling = style === 'tumble';   // flung onto a fresh page by the coaster crash
                    const still = this.reduced;

                    const stride = still ? 0 : Math.sin(g.time * 9);
                    const breath = still ? 0 : Math.sin(g.time * 1.8);
                    const walkBob = still ? 0 : Math.abs(stride) * 1.6;
                    const bob = (hopping || launching || falling || tumbling) ? 0 : (moving && !riding ? walkBob : breath * 1.6);
                    const swing = moving ? stride * PITCH * 0.06 : breath * PITCH * 0.02;
                    const sy = hopping ? 1 + Math.sin(clamp01(g.walk.t / g.walk.dur) * Math.PI) * 0.12 : 1;

                    ctx.save();
                    ctx.translate(p.x, p.y + bob);

                    // Soft shadow anchored to the ground line, not the pawn, so it stays
                    // on the floor while the pawn hops — but not while it plummets a pit.
                    if (!falling) {
                        ctx.save();
                        ctx.globalAlpha = 0.16;
                        ctx.fillStyle = g.pal.ink;
                        const groundRef = (g.current ? g.current.y0 : GROUND_Y) - STAND;
                        const lift = groundRef - (p.y + bob);   // how high off the room's floor
                        ctx.beginPath();
                        ctx.ellipse(0, STAND + lift, PITCH * 0.32 * (1 - Math.min(0.5, lift / (PITCH * 6))),
                            PITCH * 0.12, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }

                    // Launching: the pawn tumbles through the air on the arc.
                    if (launching && !still) ctx.rotate(clamp01(g.walk.t / g.walk.dur) * Math.PI * 2.5);
                    // Tumbling in from the coaster crash: one full spin that lands upright
                    // (a whole turn — 2π — so u=1 is level again).
                    else if (tumbling && !still) ctx.rotate(-clamp01(g.walk.t / g.walk.dur) * Math.PI * 2);
                    // Falling: the body flails; recoiling: a sharp lean back from the miss.
                    else if (falling && !still) ctx.rotate(Math.sin(g.time * 14) * 0.13);
                    else if (recoiling) ctx.rotate(-0.16);
                    // Riding a coaster: the whole car banks to the track's direction.
                    else if (riding && g.walk && g.walk.track && !still) {
                        const e = easeInOut(clamp01(g.walk.t / g.walk.dur));
                        const p1 = samplePath(g.walk.pts, Math.max(0, e - 0.03));
                        const p2 = samplePath(g.walk.pts, Math.min(1, e + 0.03));
                        ctx.rotate(Math.atan2(p2.y - p1.y, p2.x - p1.x));
                    }

                    ctx.scale(1.3, 1.3 * sy);
                    // Riding: the rider sits up out of the bowl, so the cart itself can be
                    // centred on the track — the frame banks about that point, and a cart
                    // slung below it would swing right off the rider on the loops.
                    if (riding) ctx.translate(0, -SPRITE * 0.45);
                    if (body) ctx.drawImage(body, -SPRITE / 2, -SPRITE / 2, SPRITE, SPRITE);
                    if (hand) {
                        if (falling) {                                        // both arms flung up
                            ctx.drawImage(hand, -PITCH * 0.5 - SPRITE * 0.16, -PITCH * 0.52, SPRITE * 0.32, SPRITE * 0.32);
                            ctx.drawImage(hand, PITCH * 0.5 - SPRITE * 0.16, -PITCH * 0.52, SPRITE * 0.32, SPRITE * 0.32);
                        } else {
                            const hy = climbing ? -PITCH * 0.44 : -PITCH * 0.2;    // reach up on a ladder
                            ctx.drawImage(hand, -PITCH * 0.42 - SPRITE * 0.16, hy + swing,
                                SPRITE * 0.32, SPRITE * 0.32);
                            ctx.drawImage(hand, PITCH * 0.42 - SPRITE * 0.16, hy - swing,
                                SPRITE * 0.32, SPRITE * 0.32);
                        }
                    }
                    // …and the bowl is drawn last, back down on the track line, closing
                    // over the rider's legs so it reads as sitting *in* the car.
                    if (riding) {
                        ctx.translate(0, SPRITE * 0.45);
                        const cart = this.inked('cart', g.pal.ink, g.pal.floor);
                        if (cart) ctx.drawImage(cart, -SPRITE * 0.45, -SPRITE * 0.30, SPRITE * 0.90, SPRITE * 0.90);
                    }
                    // In the shooting and shield rooms the pawn holds a bow toward the wall.
                    if (g.current && (g.current.kind === 'shoot' || g.current.kind === 'shield')) {
                        const bow = this.inked('item_bow', g.pal.ink, g.pal.floor);
                        if (bow) ctx.drawImage(bow, PITCH * 0.30, -SPRITE * 0.22, SPRITE * 0.42, SPRITE * 0.42);
                    }
                    ctx.restore();
                },

                drawSigns: function (ctx) {
                    const g = this._sp;
                    if (g.state !== 'question' || !g.current) return;
                    const pal = g.pal;
                    const closed = (g.current.blocks || []).filter(b => b.state === 'closed');

                    // Pass 1 — the answer signs, lifted clear above the blocks.
                    closed.forEach(b => {
                        const box = this.signBox(b);
                        const tText = clamp01((g.signIn - b.index * 0.12) / 0.4);
                        if (tText <= 0) return;
                        const ease = 1 - Math.pow(1 - tText, 3);
                        const scale = 0.72 + ease * 0.28;
                        const bx = box.x + box.w / 2;
                        const by = box.y + box.h / 2;

                        ctx.save();
                        ctx.globalAlpha = ease;
                        ctx.translate(bx, by);
                        ctx.scale(scale, scale);

                        // A paper wash keeps the word legible over whatever is behind it.
                        // Near-opaque: the coaster room puts a dense tangle of rails right
                        // behind the signs, and a translucent wash let it read through.
                        ctx.save();
                        ctx.globalAlpha = ease * 0.93;
                        ctx.fillStyle = pal.paper;
                        ctx.beginPath();
                        ctx.ellipse(0, 0, box.w * 0.52, box.h * 0.62, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();

                        if (isImageOption(b.label)) {
                            const img = this.optionImage(b.plain);
                            if (img && img.complete && img.naturalWidth) {
                                const bw = box.w - 20, bh = box.h - 20;
                                const sc = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
                                ctx.drawImage(img, -img.naturalWidth * sc / 2, -img.naturalHeight * sc / 2,
                                    img.naturalWidth * sc, img.naturalHeight * sc);
                            }
                        } else {
                            ctx.font = this.signFont();
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            // Paper-coloured halo first, so the letters keep their edge even
                            // where a rail runs straight under them.
                            ctx.lineJoin = 'round';
                            ctx.lineWidth = 4 * this.signScale();
                            ctx.strokeStyle = pal.paper;
                            ctx.strokeText(b.plain, 0, 1);
                            ctx.fillStyle = pal.ink;
                            ctx.fillText(b.plain, 0, 1);
                        }

                        this.scribbleRing(ctx, box.w * 0.55, box.h * 0.66, pal.ink, 0.85 * ease, b.index, ease);

                        ctx.globalAlpha = 0.55 * ease;
                        ctx.fillStyle = pal.ink;
                        ctx.font = 'bold 14px ' + HAND_FONT;
                        ctx.fillText(String(b.index + 1) + '.', -box.w * 0.5 - 8, -box.h * 0.32);
                        ctx.restore();
                    });

                    // Pass 2 — leader arrows drawn on top, running from each answer DOWN to
                    // the thing it labels, so the arrowhead lands on the block: the sign
                    // is what you read first, and the arrow tells you where it applies.
                    const half = (ROOM_KINDS[g.current.kind].layout === 'gate') ? PITCH : SPRITE / 2;
                    closed.forEach(b => {
                        const tArrow = clamp01((g.signIn - b.index * 0.12) / 0.4);
                        if (tArrow <= 0) return;
                        const abox = this.signBox(b);
                        const as = this.worldToScreen(b.wx, b.wy);
                        const blockTop = as.y - half * g.cam.z;
                        this.leaderArrow(ctx, abox.x + abox.w / 2, abox.y + abox.h - 4, as.x, blockTop - 2,
                            pal.ink, 0.8 * tArrow, b.index);
                    });
                },

                /**
                 * A hand-drawn arrow from an answer sign down to the block it labels: a
                 * gently bowed pencil shaft with the arrowhead at the block (`x1,y1`) end.
                 */
                leaderArrow: function (ctx, x0, y0, x1, y1, color, alpha, seed) {
                    if (alpha <= 0) return;
                    const dx = x1 - x0, dy = y1 - y0;
                    const len = Math.hypot(dx, dy);
                    if (len < 6) return;
                    const nx = dx / len, ny = dy / len;                 // along the shaft
                    const wob = Math.sin((seed || 0) * 2.3 + 1) * Math.min(6, len * 0.12);
                    const mx = (x0 + x1) / 2 - ny * wob;                // bow it sideways
                    const my = (y0 + y1) / 2 + nx * wob;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.quadraticCurveTo(mx, my, x1, y1);
                    ctx.stroke();
                    // Arrowhead, aimed along the incoming tangent (from the bow point).
                    const a = Math.atan2(y1 - my, x1 - mx);
                    const ah = 12 * this.signScale();
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x1 - Math.cos(a - 0.42) * ah, y1 - Math.sin(a - 0.42) * ah);
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x1 - Math.cos(a + 0.42) * ah, y1 - Math.sin(a + 0.42) * ah);
                    ctx.stroke();
                    ctx.restore();
                },

                scribbleRing: function (ctx, rx, ry, color, alpha, seed, draw) {
                    if (alpha <= 0 || draw <= 0) return;
                    ctx.save();
                    ctx.strokeStyle = color;
                    ctx.lineCap = 'round';
                    for (let pass = 0; pass < 2; pass++) {
                        const s = seed * 3.1 + pass * 1.7;
                        const jx = 1 + Math.sin(s) * 0.05;
                        const jy = 1 + Math.cos(s * 1.3) * 0.06;
                        const tilt = Math.sin(s * 0.7) * 0.09;
                        const from = Math.sin(s * 2.1) * 0.4;
                        ctx.lineWidth = pass ? 1.2 : 1.9;
                        ctx.globalAlpha = alpha * (pass ? 0.45 : 1);
                        ctx.beginPath();
                        ctx.ellipse(Math.sin(s) * 1.5, Math.cos(s) * 1.5, rx * jx, ry * jy, tilt,
                            from, from + Math.PI * 2 * (0.92 + pass * 0.12) * draw);
                        ctx.stroke();
                    }
                    ctx.restore();
                },

                optionImage: function (src) {
                    const g = this._sp;
                    if (!g.optImages[src]) {
                        const img = new Image();
                        img.src = src;
                        g.optImages[src] = img;
                    }
                    return g.optImages[src];
                },

                render: function () {
                    const g = this._sp;
                    const ctx = g.ctx;
                    const pal = g.pal;

                    ctx.save();
                    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
                    ctx.clearRect(0, 0, g.view.w, g.view.h);

                    const grad = ctx.createLinearGradient(0, 0, 0, g.view.h);
                    grad.addColorStop(0, pal.paper);
                    grad.addColorStop(1, pal.paper2);
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, g.view.w, g.view.h);

                    this.drawPaperGrid(ctx);
                    this.drawMotes(ctx);

                    // World.
                    const sx = g.shakeAmp ? (Math.random() - 0.5) * g.shakeAmp : 0;
                    const sy = g.shakeAmp ? (Math.random() - 0.5) * g.shakeAmp : 0;
                    ctx.translate(g.view.w / 2 + sx, g.view.h / 2 + sy);
                    ctx.scale(g.cam.z, g.cam.z);
                    ctx.translate(-g.cam.x, -g.cam.y);

                    g.rooms.filter(r => r.state !== 'visited').forEach(r => this.drawRoom(ctx, r));
                    g.rooms.filter(r => r.state === 'visited').forEach(r => this.drawRoom(ctx, r));
                    if (!g.hidePawn) this.drawPawn(ctx);
                    this.drawShots(ctx);
                    this.drawFx(ctx);
                    ctx.restore();

                    ctx.save();
                    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
                    this.drawSigns(ctx);
                    if (g.page) this.drawPageTurn(ctx);
                    ctx.restore();
                },

                drawPaperGrid: function (ctx) {
                    const g = this._sp;
                    const step = GRID_STEP * g.cam.z;
                    if (step < 4) return;
                    ctx.save();
                    ctx.lineWidth = 1;
                    const originX = g.view.w / 2 - g.cam.x * g.cam.z;
                    const originY = g.view.h / 2 - g.cam.y * g.cam.z;
                    const i0 = Math.ceil(-originX / step);
                    const j0 = Math.ceil(-originY / step);

                    for (let pass = 0; pass < 2; pass++) {
                        const major = pass === 1;
                        if (major && step < 9) break;
                        ctx.strokeStyle = major ? (g.pal.major || g.pal.grid) : g.pal.grid;
                        ctx.beginPath();
                        for (let i = i0; ; i++) {
                            const x = originX + i * step;
                            if (x > g.view.w) break;
                            if ((((i % 5) + 5) % 5 === 0) !== major) continue;
                            ctx.moveTo(Math.round(x) + 0.5, 0);
                            ctx.lineTo(Math.round(x) + 0.5, g.view.h);
                        }
                        for (let j = j0; ; j++) {
                            const y = originY + j * step;
                            if (y > g.view.h) break;
                            if ((((j % 5) + 5) % 5 === 0) !== major) continue;
                            ctx.moveTo(0, Math.round(y) + 0.5);
                            ctx.lineTo(g.view.w, Math.round(y) + 0.5);
                        }
                        ctx.stroke();
                    }

                    ctx.strokeStyle = g.pal.margin || g.pal.grid;
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.moveTo(46.5, 0);
                    ctx.lineTo(46.5, g.view.h);
                    ctx.stroke();
                    ctx.restore();
                },

                drawMotes: function (ctx) {
                    const g = this._sp;
                    if (this.reduced || !g.motes.length) return;
                    ctx.save();
                    ctx.fillStyle = g.pal.ink;
                    g.motes.forEach(m => {
                        ctx.globalAlpha = 0.05 + 0.05 * Math.sin(g.time * m.hz + m.phase);
                        ctx.beginPath();
                        ctx.arc(m.x * g.view.w, m.y * g.view.h, m.r, 0, Math.PI * 2);
                        ctx.fill();
                    });
                    ctx.restore();
                },

                drawShots: function (ctx) {
                    const g = this._sp;
                    if (!g.shots || !g.shots.length) return;
                    const arrow = this.inked('item_arrow', g.pal.ink, g.pal.floor);
                    if (!arrow) return;
                    g.shots.forEach(s => {
                        const u = clamp01(s.t / s.dur);
                        const x = s.x0 + (s.x1 - s.x0) * u;
                        const y = s.y0 + (s.y1 - s.y0) * u - Math.sin(u * Math.PI) * s.arc;
                        const ang = Math.atan2(s.y1 - s.y0, s.x1 - s.x0);
                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(ang);
                        ctx.drawImage(arrow, -SPRITE * 0.3, -SPRITE * 0.3, SPRITE * 0.6, SPRITE * 0.6);
                        ctx.restore();
                    });
                },

                /**
                 * Draws the leaf being turned: the old page (a photograph) pivots away
                 * about the top-right corner, narrowing along a bottom-left→top-right
                 * diagonal fold with a crease and shadows, while the fresh room shows
                 * through behind it. Ported verbatim from scribble-dungeon.
                 */
                drawPageTurn: function (ctx) {
                    const g = this._sp;
                    const p = g.page;
                    if (!p || !p.snap) return;
                    const w = g.view.w;
                    const h = g.view.h;
                    const u = Math.min(1, p.t / p.dur);

                    const nx = Math.SQRT1_2, ny = -Math.SQRT1_2;
                    const sAt = (x, y) => x * nx + y * ny;
                    const sStart = sAt(0, h);            // bottom-left corner
                    const sEnd = sAt(w, 0);              // top-right corner
                    const k = 1 - easeInOut(u);          // how much sheet is left
                    if (k <= 0.002) return;
                    const f = sEnd + k * (sStart - sEnd);

                    const L = (w + h) * 2;
                    const tx = -ny, ty = nx;             // along the fold
                    const px = f * nx, py = f * ny;      // a point on the fold

                    const halfPlane = (side) => {
                        ctx.beginPath();
                        ctx.moveTo(px + tx * L, py + ty * L);
                        ctx.lineTo(px - tx * L, py - ty * L);
                        ctx.lineTo(px - tx * L + side * nx * L, py - ty * L + side * ny * L);
                        ctx.lineTo(px + tx * L + side * nx * L, py + ty * L + side * ny * L);
                        ctx.closePath();
                    };

                    // The sheet, squeezed along the peel direction, pinned at top-right.
                    const qx = w, qy = 0;
                    const a = 1 + (k - 1) * nx * nx;
                    const c = (k - 1) * nx * ny;
                    const b = (k - 1) * nx * ny;
                    const d = 1 + (k - 1) * ny * ny;
                    ctx.save();
                    ctx.transform(a, b, c, d, qx - (a * qx + c * qy), qy - (b * qx + d * qy));
                    ctx.drawImage(p.snap, 0, 0, p.snap.width, p.snap.height, 0, 0, w, h);
                    ctx.restore();

                    const band = 70;
                    ctx.save();
                    halfPlane(1); ctx.clip();
                    const fold = ctx.createLinearGradient(px + nx * band, py + ny * band, px, py);
                    fold.addColorStop(0, 'rgba(0,0,0,0)');
                    fold.addColorStop(1, 'rgba(0,0,0,0.16)');
                    ctx.fillStyle = fold; ctx.fillRect(0, 0, w, h);
                    ctx.restore();

                    ctx.save();
                    halfPlane(-1); ctx.clip();
                    const cast = ctx.createLinearGradient(px, py, px - nx * 60, py - ny * 60);
                    cast.addColorStop(0, 'rgba(0,0,0,0.20)');
                    cast.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = cast; ctx.fillRect(0, 0, w, h);
                    ctx.restore();

                    ctx.save();
                    ctx.strokeStyle = 'rgba(0,0,0,0.30)';
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.moveTo(px + tx * L, py + ty * L);
                    ctx.lineTo(px - tx * L, py - ty * L);
                    ctx.stroke();
                    ctx.restore();
                },

                drawFx: function (ctx) {
                    const g = this._sp;
                    g.fx.forEach(f => {
                        const k = 1 - f.age / f.life;
                        ctx.save();
                        ctx.globalAlpha = Math.max(0, k) * 0.8;
                        ctx.fillStyle = f.kind === 'bad' ? g.pal.bad : g.pal.good;
                        ctx.beginPath();
                        ctx.arc(f.x, f.y, 3 + (1 - k) * 7, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    });
                },

                // ----------------------------------------------------- main loop

                step: function (dt) {
                    const g = this._sp;
                    g.time += dt;

                    const k = this.reduced ? 1 : 1 - Math.pow(0.45, dt * this.pace);
                    g.cam.x += (g.cam.tx - g.cam.x) * k;
                    g.cam.y += (g.cam.ty - g.cam.y) * k;
                    g.cam.z += (g.cam.tz - g.cam.z) * k;

                    if (g.shakeAmp) g.shakeAmp = Math.max(0, g.shakeAmp - dt * 40);
                    if (g.state === 'question') g.signIn = Math.min(1, g.signIn + dt * this.rate(0.45));

                    // Watchdog: if a queued transition is ever dropped, resume rather
                    // than sit forever with nothing to click.
                    if (g.state !== 'question' && !g.walk) {
                        g.idleFor = (g.idleFor || 0) + dt;
                        if (g.idleFor > 7) { g.idleFor = 0; if (!this._destroyed) this.prepareRound(); }
                    } else {
                        g.idleFor = 0;
                    }

                    if (g.awaitInput && g.state === 'question' && g.signIn >= 0.45) {
                        g.awaitInput = false;
                        this.locked = false;
                        g.roundStart = performance.now();
                        this.syncHotspots();
                    }

                    // Keep the tap-buttons glued to the answer bubbles. The bubbles are
                    // redrawn from signBox every frame, so they track the camera as it eases
                    // in (after a page-flip the camera settles for up to a second); if the
                    // buttons were only placed once they'd sit where the camera *was*. Cheap
                    // for a handful of answers, and it self-heals any drift.
                    if (g.state === 'question' && !this.locked && this.hotspots.length) {
                        this.refreshHotspots();
                    }

                    // Rooms ink themselves in; crumbling blocks fall; coins pop.
                    const revRate = this.rate(0.36);
                    g.rooms.forEach(room => {
                        if (room.state === 'visited' && room.reveal < 1) {
                            room.reveal = Math.min(1, room.reveal + dt * revRate);
                        }
                        (room.blocks || []).forEach(b => {
                            if (b.state === 'crumbled' && b.crumbleT < 1.4) {
                                b.crumbleT = Math.min(1.4, b.crumbleT + dt * this.rate(1.1));
                            }
                            if (b.state === 'solved' && b.popT < 1) {
                                b.popT = Math.min(1, b.popT + dt * this.rate(1.2));
                            }
                            if (b.state === 'locked' && b.rattleT < 1.2) {
                                b.rattleT = Math.min(1.2, b.rattleT + dt * this.rate(1.3));
                            }
                            if (b.state === 'falling' && b.fallT < 1) {
                                b.fallT = Math.min(1, b.fallT + dt * this.rate(1.1));
                            }
                        });
                    });

                    if (g.walk) {
                        g.walk.t += dt;
                        const u = Math.min(1, g.walk.t / g.walk.dur);
                        const e = easeInOut(u);
                        const pt = samplePath(g.walk.pts, e);
                        g.pawn.x = pt.x;
                        g.pawn.y = pt.y;
                        if (g.walk.track && !this.mapMode) {
                            if (u > 0.72) {
                                // Final stretch: stop chasing and settle back onto the room
                                // being ridden from, so the cart visibly crosses a steady
                                // frame — a correct ride slams the page's left edge (where
                                // the peel then begins, so crash and turn are one motion); a
                                // wrong ride is seen curving back down to the start. Eased by
                                // the camera lerp at the top of step().
                                const fr = this.frameFor(g.current);
                                g.cam.tx = fr.x; g.cam.ty = fr.y; g.cam.tz = fr.z;
                            } else {
                                // Chase the cart far out across the whole page (no room bounds).
                                g.cam.tz = Math.min(MAX_ZOOM, g.view.w / (PITCH * 16));
                                g.cam.tx = g.pawn.x;
                                g.cam.ty = g.pawn.y - PITCH * 0.3;
                                g.cam.x = g.cam.tx; g.cam.y = g.cam.ty;
                                g.cam.z += (g.cam.tz - g.cam.z) * 0.1;
                            }
                        }
                        if (g.walk.fail) {
                            // A wrong-answer attempt: reach the apparatus, break it, fall out.
                            if (u >= 1) {
                                if (g.walk.phase === 'approach') this.snapFail();
                                else this.finishFail();
                            }
                        } else {
                            if (!this.mapMode && g.walk.fromFrame) {
                                const a = g.walk.fromFrame, b = g.walk.toFrame;
                                g.cam.tx = a.x + (b.x - a.x) * e;
                                g.cam.ty = a.y + (b.y - a.y) * e;
                                g.cam.tz = a.z + (b.z - a.z) * e;
                            }
                            if (g.walk.target) {
                                g.walk.target.reveal = Math.max(g.walk.target.reveal, Math.min(1, u * 1.15));
                            }
                            // A correct coaster ride turns the page a beat BEFORE the fling
                            // fully finishes, so the cart reads as flying INTO the page-turn
                            // rather than coasting to a stop and then flipping. Doors and
                            // walked transitions still resolve exactly at the end.
                            const flipAt = (g.walk.track && g.walk.flipTo) ? 0.87 : 1;
                            if (u >= flipAt) this.finishWalk();
                        }
                    }

                    if (g.page) {
                        g.page.t += dt;
                        if (g.page.t >= g.page.dur) {
                            g.page = null;
                            g.state = 'idle';
                            this.own(() => { if (!this._destroyed) this.prepareRound(); }, this.dur(0.4) * 1000);
                        }
                    }

                    for (let i = g.fx.length - 1; i >= 0; i--) {
                        const f = g.fx[i];
                        f.age += dt;
                        f.x += f.vx * dt;
                        f.y += f.vy * dt;
                        f.vy += 120 * dt;
                        if (f.age >= f.life) g.fx.splice(i, 1);
                    }

                    if (g.shots && g.shots.length) {
                        for (let i = g.shots.length - 1; i >= 0; i--) {
                            g.shots[i].t += dt;
                            if (g.shots[i].t >= g.shots[i].dur) g.shots.splice(i, 1);
                        }
                    }

                    g.motes.forEach(m => {
                        m.x += m.vx * dt; m.y += m.vy * dt;
                        if (m.x < -0.05) m.x = 1.05; else if (m.x > 1.05) m.x = -0.05;
                        if (m.y < -0.05) m.y = 1.05; else if (m.y > 1.05) m.y = -0.05;
                    });
                },

                loop: function (now) {
                    const g = this._sp;
                    if (this._destroyed || !g) return;
                    const dt = Math.min(0.05, (now - g.last) / 1000 || 0);
                    g.last = now;
                    this.step(dt);
                    this.render();
                    g.raf = requestAnimationFrame(this.loop);
                },

                // ------------------------------------------------------- controls

                rate: function (perSecond) { return this.reduced ? 20 : perSecond * this.pace; },
                dur: function (seconds) { return this.reduced ? Math.min(0.2, seconds) : seconds / this.pace; },

                cyclePace: function () {
                    this.paceIndex = (this.paceIndex + 1) % PACES.length;
                    this.pace = PACES[this.paceIndex].factor;
                    this.paceIcon = PACES[this.paceIndex].icon;
                    this.paceName = PACES[this.paceIndex].name;
                    setLocalStorage('scribble_platformer_pace', PACES[this.paceIndex].key);
                },

                cyclePawn: function () {
                    const g = this._sp;
                    const i = PAWNS.findIndex(p => p.key === g.pawn.color);
                    g.pawn.color = PAWNS[(i + 1) % PAWNS.length].key;
                    this.persist();
                },

                onKeydown: function (e) {
                    if (this.locked) return;
                    const n = Number(e.key);
                    if (n >= 1 && n <= this.hotspots.length) {
                        e.preventDefault();
                        this.answer(this.hotspots[n - 1].index);
                    } else if (e.key === 'm' || e.key === 'M') {
                        e.preventDefault();
                        this.toggleMap();
                    }
                },

                toggleFullscreen: function () {
                    const el = this.$refs.stage;
                    if (!el) return;
                    try {
                        if (document.fullscreenElement) document.exitFullscreen();
                        else if (el.requestFullscreen) el.requestFullscreen();
                    } catch (e) { /* not available on this browser */ }
                },

                persist: function () {
                    const g = this._sp;
                    setLocalStorage('scribble_platformer_pawn', { color: g.pawn.color, gems: this.gems });
                },

                restore: function () {
                    const saved = getLocalStorage('scribble_platformer_pawn', null);
                    const g = this._sp;
                    if (!saved || typeof saved !== 'object') return;
                    if (PAWNS.some(p => p.key === saved.color)) g.pawn.color = saved.color;
                    if (typeof saved.gems === 'number') this.gems = saved.gems;
                },

                own: function (fn, delay) {
                    const token = this.roundToken;
                    const id = setTimeout(() => {
                        this._timers.delete(id);
                        if (!this._destroyed && token === this.roundToken) fn();
                    }, delay);
                    this._timers.add(id);
                    return id;
                },
            },

            created: function () {
                this._timers = new Set();
                this._destroyed = false;
                this.roundToken = 0;
                this.reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
                const savedPace = typeof getLocalStorage === 'function'
                    ? getLocalStorage('scribble_platformer_pace', 'normal') : 'normal';
                this.paceIndex = Math.max(0, PACES.findIndex(p => p.key === savedPace));
                this.pace = PACES[this.paceIndex].factor;
            },

            mounted: function () {
                const canvas = this.$refs.canvas;
                if (!canvas) return;

                const themeKey = (typeof getLocalStorage === 'function' &&
                    getLocalStorage('theme', 'base')) || 'base';
                this.themeKey = THEME_INK[themeKey] ? themeKey : 'base';

                const motes = [];
                for (let i = 0; i < 22; i++) {
                    motes.push({
                        x: Math.random(), y: Math.random(),
                        vx: (Math.random() - 0.5) * 0.012, vy: (Math.random() - 0.5) * 0.012,
                        r: 1 + Math.random() * 2.2, hz: 0.4 + Math.random(), phase: Math.random() * 6.28,
                    });
                }

                this._sp = {
                    canvas: canvas,
                    ctx: canvas.getContext('2d'),
                    dpr: 1,
                    sprites: {},
                    inkCache: {},
                    optImages: {},
                    pal: resolvePlatformerTheme(this.themeKey),
                    view: { w: 800, h: 600 },
                    cam: { x: 0, y: 0, z: 0.6, tx: 0, ty: 0, tz: 0.6 },
                    pawn: { x: 0, y: 0, color: 'red' },
                    rooms: [],
                    rand: mulberry(1),
                    current: null,
                    walk: null,
                    fx: [],
                    roundStart: 0,
                    awaitInput: false,
                    idleFor: 0,
                    motes: motes,
                    signIn: 0,
                    state: 'idle',
                    time: 0,
                    last: performance.now(),
                    shakeAmp: 0,
                    raf: null,
                };

                this.restore();
                this._onResize = () => this.resize();
                global.addEventListener('resize', this._onResize);
                global.addEventListener('keydown', this.onKeydown);

                this.loadSprites().then(() => {
                    if (this._destroyed) return;
                    this.ready = true;
                    this.startRun();          // must precede resize(): it aims the camera
                    this.resize();
                    this.snapCamera();
                    this.prepareRound();
                    this._sp.last = performance.now();
                    this._sp.raf = requestAnimationFrame(this.loop);
                });
            },

            beforeDestroy: function () {
                this._destroyed = true;
                this.roundToken++;
                this._timers.forEach(clearTimeout);
                this._timers.clear();
                global.removeEventListener('resize', this._onResize);
                global.removeEventListener('keydown', this.onKeydown);
                if (this._sp && this._sp.raf) cancelAnimationFrame(this._sp.raf);
                if (this._sp) {
                    this._sp.raf = null;
                    this._sp.fx = [];
                    this._sp.motes = [];
                    this._sp.rooms = [];
                    this._sp.inkCache = {};
                    this._sp.sprites = {};
                }
            },
        }));
    }

    // ------------------------------------------------------------------ exports

    global.SCRIBBLE_PLATFORMER_CONFIG = {
        kinds: ROOM_KINDS,
        cycle: KIND_CYCLE,
        sprites: SPRITES,
        pawns: PAWNS,
        wobble: WOBBLE,
        signSlots: SIGN_SLOTS,
        slotsFor: slotsFor,
        tile: { pitch: PITCH, sprite: SPRITE, roomTiles: ROOM_TILES, groundY: GROUND_Y },
    };
    global.validateScribblePlatformerConfig = validateScribblePlatformerConfig;
    global.resolvePlatformerTheme = resolvePlatformerTheme;
    global.scribblePlatformerMakeRoom = makeRoom;
    global.scribblePlatformerGroundForVariant = groundForVariant;
    global.scribblePlatformerBuildBlocks = buildBlocks;
    global.scribblePlatformerRoomBounds = roomBounds;
    global.scribblePlatformerRoomSeed = roomSeed;
    global.scribblePlatformerKindForDepth = kindForDepth;
    global.scribblePlatformerSamplePath = samplePath;
    global.scribblePlatformerMulberry = mulberry;
    global.createScribblePlatformerComponent = createScribblePlatformerComponent;
})(typeof window !== 'undefined' ? window : globalThis);
