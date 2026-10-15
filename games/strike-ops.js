// Strike Ops (כוח פריצה) — an outdoor, COD-Mobile-style first-person learning
// game. Specification: STRIKE_OPS_SPEC.md (revision 3.1: the free-roam map). The learning engine
// (BaseGameComponent, generateFromList, updateWeightForKey, reloadProgress,
// storage.js) owns selection, weights, score persistence, progress and
// completion routing; this file only presents a question as a squad of
// foam-gear soldiers (or one boss split into holographic copies) wearing
// answer nameplates.
//
// Load order: index.html loads this file before tester.js; tester.js calls
// createStrikeOpsComponent(BaseGameComponent) once the base component exists.
(function (global) {
    'use strict';

    // ------------------------------------------------------------------
    // Configuration (declarative, frozen, validated in Node)
    // ------------------------------------------------------------------

    const STRIKE_OPS_MAX_LANES = 4;
    const ASSET_DIR = './assets/strike-ops/';
    const SHAPES = ['circle', 'triangle', 'square', 'diamond'];

    function deepFreeze(value) {
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            Object.freeze(value);
            Object.keys(value).forEach(key => deepFreeze(value[key]));
        }
        return value;
    }

    // Kit pieces (sourced CC0 GLBs, §6.4). `kit` selects the shared per-kit
    // material; the Kenney GLBs reference ../Textures/colormap.png themselves.
    const KIT_PIECES = {
        waterTower: {kit: 'industrial', url: ASSET_DIR + 'env/kenney-industrial/water-tower.glb'},
        containerA: {kit: 'industrial', url: ASSET_DIR + 'env/kenney-industrial/shipping-container-a.glb'},
        containerB: {kit: 'industrial', url: ASSET_DIR + 'env/kenney-industrial/shipping-container-b.glb'},
        containerC: {kit: 'industrial', url: ASSET_DIR + 'env/kenney-industrial/shipping-container-c.glb'},
        barrel: {kit: 'survival', url: ASSET_DIR + 'env/kenney-survival/barrel.glb'},
        rockA: {kit: 'survival', url: ASSET_DIR + 'env/kenney-survival/rock-a.glb'},
        rockB: {kit: 'survival', url: ASSET_DIR + 'env/kenney-survival/rock-b.glb'},
        pine: {kit: 'survival', url: ASSET_DIR + 'env/kenney-survival/tree.glb'},
        pineTall: {kit: 'survival', url: ASSET_DIR + 'env/kenney-survival/tree-tall.glb'},
        grass: {kit: 'survival', url: ASSET_DIR + 'env/kenney-survival/grass-large.glb'},
        wall: {kit: 'fantasy', url: ASSET_DIR + 'env/kenney-fantasy/wall-wood.glb'},
        wallCross: {kit: 'fantasy', url: ASSET_DIR + 'env/kenney-fantasy/wall-wood-detail-cross.glb'},
        wallDoor: {kit: 'fantasy', url: ASSET_DIR + 'env/kenney-fantasy/wall-wood-doorway-square-wide.glb'},
        roofFlat: {kit: 'fantasy', url: ASSET_DIR + 'env/kenney-fantasy/roof-flat.glb'},
        roof: {kit: 'fantasy', url: ASSET_DIR + 'env/kenney-fantasy/roof.glb'},
        planks: {kit: 'fantasy', url: ASSET_DIR + 'env/kenney-fantasy/planks.glb'},
        stoneWall: {kit: 'fantasy', url: ASSET_DIR + 'env/kenney-fantasy/wall-block-half.glb'},
        fence: {kit: 'fantasy', url: ASSET_DIR + 'env/kenney-fantasy/fence.glb'},
        tree: {kit: 'fantasy', url: ASSET_DIR + 'env/kenney-fantasy/tree.glb'},
        treeRound: {kit: 'fantasy', url: ASSET_DIR + 'env/kenney-fantasy/tree-high-round.glb'},
        hedge: {kit: 'fantasy', url: ASSET_DIR + 'env/kenney-fantasy/hedge-large.glb'},
        sandbags: {kit: 'barricade', url: ASSET_DIR + 'env/kaykit-barricade.glb'},
    };
    // Every texture the game may fetch: the three kit palettes (requested by the
    // GLBs relative to their own URL), the derived shed palette and the ground.
    const TEXTURES = {
        industrialColormap: ASSET_DIR + 'env/kenney-industrial/Textures/colormap.png',
        survivalColormap: ASSET_DIR + 'env/kenney-survival/Textures/colormap.png',
        fantasyColormap: ASSET_DIR + 'env/kenney-fantasy/Textures/colormap.png',
        shed: ASSET_DIR + 'env/kenney-fantasy/Textures/colormap-shed.png',
        grass: ASSET_DIR + 'env/ground/ground-grass.png',
        dirt: ASSET_DIR + 'env/ground/ground-dirt.png',
    };

    // Two frames (§5, rev 3), metres, y up. MAP frame: x east, z north (THREE =
    // (−x, y, z)). ARENA frame of a place: x lateral (the player's right when
    // facing the squad), z depth away from the anchor; map = origin + right·x +
    // forward·z for the place's compass heading (multiples of 90°), see
    // strikeOpsArenaToMap. The yard sits at origin (0, 0), heading 0, so for
    // the yard arena-local equals map.
    //
    // LINE4: the arena template every slice place uses — the built yard's
    // gameplay data, unchanged. Soldiers stand behind low cover (crouched they
    // are fully hidden, standing up in place their torso clears the cover);
    // each lane pairs a front cover with a second cover beside and slightly
    // behind it, and a relocation steps back and across between the two. Every
    // number is checked by validateStrikeOpsConfig().
    const LINE4 = {
        core: {minX: -1.5, maxX: 1.5, minZ: 0, maxZ: 2},
        anchor: {x: 0, z: 1.0},
        fightBox: {minX: -3, maxX: 3, minZ: -0.5, maxZ: 3.0},
        cover: [
            {x: -3.3, z: 7.23, w: 1.8, d: 0.6, h: 0.85}, {x: -4.21, z: 8.09, w: 0.8, d: 0.6, h: 0.85},
            {x: -0.9, z: 7.13, w: 1.5, d: 0.6, h: 0.85}, {x: -2.16, z: 7.89, w: 0.9, d: 0.6, h: 0.85},
            {x: 0.9, z: 7.13, w: 1.5, d: 0.6, h: 0.85}, {x: 2.16, z: 7.89, w: 0.9, d: 0.6, h: 0.85},
            {x: 3.3, z: 7.23, w: 1.8, d: 0.6, h: 0.85}, {x: 4.21, z: 8.09, w: 0.8, d: 0.6, h: 0.85},
        ],
        lanes: [
            {spots: [{hide: {x: -3.25, z: 8.05}, peek: {x: -3.25, z: 8.05}}, {hide: {x: -4.01, z: 8.91}, peek: {x: -4.01, z: 8.91}}], dash: [{x: -3.25, z: 8.91}]},
            {spots: [{hide: {x: -1.15, z: 7.95}, peek: {x: -1.15, z: 7.95}}, {hide: {x: -1.96, z: 8.71}, peek: {x: -1.96, z: 8.71}}], dash: [{x: -1.15, z: 8.71}]},
            {spots: [{hide: {x: 1.15, z: 7.95}, peek: {x: 1.15, z: 7.95}}, {hide: {x: 1.96, z: 8.71}, peek: {x: 1.96, z: 8.71}}], dash: [{x: 1.15, z: 8.71}]},
            {spots: [{hide: {x: 3.25, z: 8.05}, peek: {x: 3.25, z: 8.05}}, {hide: {x: 4.01, z: 8.91}, peek: {x: 4.01, z: 8.91}}], dash: [{x: 3.25, z: 8.91}]},
        ],
        laneSets: {1: [1], 2: [1, 2], 3: [0, 1, 3], 4: [0, 1, 2, 3]},
        boss: {stage: {x: 0, z: 9.76}, points: [{x: -3.63, z: 8.91}, {x: -1.555, z: 8.71}, {x: 1.555, z: 8.71}, {x: 3.63, z: 8.91}]},
        approach: [{x: -5.2, z: 11.6}, {x: -2.0, z: 12.6}, {x: 2.0, z: 12.6}, {x: 5.2, z: 11.6}],
    };
    // A place = the LINE4 arena + its map placement, cover kinds and flavour.
    function makePlace(p) {
        return Object.assign({}, LINE4, p, {cover: LINE4.cover.map((cv, k) => Object.assign({kind: p.coverKinds[k]}, cv))});
    }
    const YARD_GRASS = [
        {x: -5.4, z: 6.6}, {x: 5.0, z: 6.2}, {x: -2.2, z: 5.0}, {x: 2.4, z: 5.2}, {x: -6.2, z: 10.0}, {x: 6.0, z: 10.4},
        {x: -0.3, z: 11.2}, {x: 3.0, z: 11.6}, {x: -3.8, z: 11.4}, {x: 5.6, z: 3.6}, {x: -4.8, z: 3.9}, {x: 1.4, z: 4.4},
        {x: -1.6, z: 10.4}, {x: 7.4, z: 6.2}, {x: -7.6, z: 7.0}, {x: 2.2, z: 13.0}, {x: -2.8, z: 13.4}, {x: 4.4, z: 15.2},
    ];
    const PLACES = [
        makePlace({
            id: 'yard', name: 'החצר הצהובה', region: {minX: -16, maxX: 16, minZ: -10, maxZ: 18},
            origin: {x: 0, z: 0}, headingDeg: 0, entryGate: null, exitGate: 'g1',
            enemyZone: {minX: -16, maxX: 16, minZ: 3.4, maxZ: 18},
            coverKinds: ['crates', 'barrels', 'sandbags', 'crates', 'stoneWall', 'barrels', 'crates', 'barrels'],
            // the built yard dressing moved into map.structures (one list, map frame)
            props: [], grassSpots: YARD_GRASS,
            flavor: {deployLine: 'חוליית החצר בעמדות!', gateVoice: 'boomHigh', sign: {text: 'מתחם האימונים', icon: 'star'}, squadStyle: {exposedIdle: 'aim', volleyChance: 0.3}},
        }),
        makePlace({
            id: 'containers', name: 'חצר המכולות', region: {minX: -4, maxX: 24, minZ: 18, maxZ: 34},
            origin: {x: 2, z: 25}, headingDeg: 90, entryGate: 'g1', exitGate: 'g2',
            enemyZone: {minX: 5.4, maxX: 24, minZ: 18, maxZ: 34},
            coverKinds: ['crates', 'barrels', 'crates', 'barrels', 'crates', 'barrels', 'crates', 'barrels'],
            props: [], grassSpots: [],
            flavor: {deployLine: 'חוליית המכולות מגיחה מבין הארגזים!', gateVoice: 'boomLow', sign: {text: 'חצר המכולות', icon: 'box'}, squadStyle: {exposedIdle: 'shoot', volleyChance: 0.5}},
        }),
        makePlace({
            id: 'sheds', name: 'הצריפים והמרפסת', region: {minX: 8, maxX: 24, minZ: 34, maxZ: 58},
            origin: {x: 17.5, z: 37}, headingDeg: 0, entryGate: 'g2', exitGate: 'g3',
            enemyZone: {minX: 8, maxX: 24, minZ: 40.4, maxZ: 58},
            coverKinds: ['crates', 'sandbags', 'sandbags', 'crates', 'sandbags', 'crates', 'crates', 'sandbags'],
            props: [], grassSpots: [],
            flavor: {deployLine: 'חוליית הצריפים על המרפסת!', gateVoice: 'swing', sign: {text: 'הצריפים', icon: 'house'}, squadStyle: {exposedIdle: 'aim', firstPeekGesture: 'cheer', volleyChance: 0.3}},
        }),
        makePlace({
            id: 'plaza', name: 'כיכר מגדל המים', region: {minX: -22, maxX: 8, minZ: 36, maxZ: 58},
            origin: {x: 2, z: 50}, headingDeg: 270, entryGate: 'g3', exitGate: null,
            enemyZone: {minX: -22, maxX: -1.4, minZ: 36, maxZ: 58},
            coverKinds: ['sandbags', 'barrels', 'sandbags', 'barrels', 'stoneWall', 'barrels', 'sandbags', 'barrels'],
            props: [], grassSpots: [],
            flavor: {deployLine: 'המפקד מחכה למרגלות מגדל המים!', gateVoice: 'fanfare', sign: {text: 'כיכר מגדל המים', icon: 'tower'}, squadStyle: {exposedIdle: 'aim', volleyChance: 0.4, bossSpotlight: true}},
        }),
    ];

    // The compound map (§5.1), map frame. playBounds is the walkable clamp (the
    // perimeter walls' centrelines); bounds is the geometry bound every wall,
    // structure and gate lies inside. Gates are gaps in the walls (axis 'x':
    // spans x at a fixed z). Structures are solid unless `walk`; `h`, `ry` and
    // the shed tiling are dressing hints only.
    const MAP = {
        bounds: {minX: -23, maxX: 25, minZ: -11, maxZ: 59},
        playBounds: {minX: -22, maxX: 24, minZ: -10, maxZ: 58},
        start: {x: 0, z: 1.0, headingDeg: 0},
        gates: [
            {id: 'g0', kind: 'mainGate', from: null, to: 'yard', axis: 'x', at: -10, min: -2, max: 2, decorative: true},
            {id: 'g1', kind: 'boom', from: 'yard', to: 'containers', axis: 'x', at: 18, min: -1.1, max: 1.9},
            {id: 'g2', kind: 'boom', from: 'containers', to: 'sheds', axis: 'x', at: 34, min: 16, max: 19},
            {id: 'g3', kind: 'swing', from: 'sheds', to: 'plaza', axis: 'z', at: 8, min: 50, max: 53},
        ],
        walls: [
            {kind: 'fence', minX: -16, maxX: -2, minZ: -10.3, maxZ: -9.7},
            {kind: 'fence', minX: 2, maxX: 16, minZ: -10.3, maxZ: -9.7},
            {kind: 'hedge', minX: -16.3, maxX: -15.7, minZ: -10, maxZ: 18},
            {kind: 'fence', minX: 15.7, maxX: 16.3, minZ: -10, maxZ: 18},
            {kind: 'fence', minX: -16, maxX: -1.1, minZ: 17.7, maxZ: 18.3},
            {kind: 'fence', minX: 1.9, maxX: 24, minZ: 17.7, maxZ: 18.3},
            {kind: 'containerRow', minX: -4.3, maxX: -3.7, minZ: 18, maxZ: 34},
            {kind: 'fence', minX: 23.7, maxX: 24.3, minZ: 18, maxZ: 58},
            {kind: 'containerRow', minX: -4, maxX: 16, minZ: 33.7, maxZ: 34.3},
            {kind: 'fence', minX: 19, maxX: 24, minZ: 33.7, maxZ: 34.3},
            {kind: 'fence', minX: 7.7, maxX: 8.3, minZ: 34, maxZ: 50},
            {kind: 'fence', minX: 7.7, maxX: 8.3, minZ: 53, maxZ: 58},
            {kind: 'hedge', minX: -22, maxX: 24, minZ: 57.7, maxZ: 58.3},
            {kind: 'containerRow', minX: -22, maxX: 8, minZ: 35.7, maxZ: 36.3},
            {kind: 'hedge', minX: -22.3, maxX: -21.7, minZ: 36, maxZ: 58},
        ],
        structures: [
            // yard (the built yard dressing; local == map)
            {area: 'yard', kind: 'deck', x: -1.8, z: 1.25, w: 7.2, d: 5.5, h: 0.12, walk: true},
            {area: 'yard', kind: 'shed', x: -9.2, z: 12.5, w: 6, d: 15, h: 6.4, tilesW: 2, tilesD: 5, rows: 2, doorAt: 1},
            {area: 'yard', kind: 'shed', x: 6.6, z: 13.6, w: 3, d: 3, h: 3.4, tilesW: 1, tilesD: 1, rows: 1, doorAt: 0, crossSide: true},
            {area: 'yard', kind: 'stoneWall', x: 9.2, z: 14.6, w: 4.8, d: 0.9, h: 1.2},
            {area: 'yard', kind: 'hedge', x: 10.5, z: 6.5, w: 1.2, d: 2.4, h: 1.3},
            {area: 'yard', kind: 'sandbags', x: 6.4, z: 4.8, w: 1.6, d: 0.7, h: 0.8, ry: -15},
            {area: 'yard', kind: 'barrel', shape: 'circle', x: -6.2, z: 5.6, r: 0.35, h: 1.0},
            {area: 'yard', kind: 'barrel', shape: 'circle', x: -5.9, z: 4.7, r: 0.35, h: 1.0, ry: 40},
            {area: 'yard', kind: 'barrel', shape: 'circle', x: 7.6, z: 8.6, r: 0.35, h: 1.0, ry: 10},
            {area: 'yard', kind: 'rock', shape: 'circle', x: 5.4, z: 2.6, r: 0.3, h: 0.5, ry: 20},
            {area: 'yard', kind: 'rock', shape: 'circle', x: 9.6, z: 10.4, r: 0.5, h: 0.9},
            {area: 'yard', kind: 'rock', shape: 'circle', x: -6.4, z: 2.4, r: 0.45, h: 0.7, ry: 70},
            {area: 'yard', kind: 'tree', shape: 'circle', x: -13, z: -6, r: 0.5, h: 7},
            {area: 'yard', kind: 'tree', shape: 'circle', x: 13, z: -5, r: 0.5, h: 7},
            {area: 'yard', kind: 'tree', shape: 'circle', x: 13.5, z: 3, r: 0.5, h: 6},
            // containers
            {area: 'containers', kind: 'container', x: -1.6, z: 24, w: 2.4, d: 6, stack: 1},
            {area: 'containers', kind: 'container', x: 20.5, z: 21.5, w: 6, d: 2.4, stack: 2},
            {area: 'containers', kind: 'container', x: 21.6, z: 28.5, w: 2.4, d: 6, stack: 1},
            {area: 'containers', kind: 'container', x: 4, z: 35, w: 6, d: 2.4, stack: 2, wall: true},
            {area: 'containers', kind: 'container', x: 11, z: 35, w: 6, d: 2.4, stack: 1, wall: true},
            {area: 'containers', kind: 'barrel', shape: 'circle', x: -2.6, z: 32.4, r: 0.35, h: 1.0},
            {area: 'containers', kind: 'barrel', shape: 'circle', x: -1.9, z: 32.9, r: 0.35, h: 1.0},
            {area: 'containers', kind: 'crate', x: 19.5, z: 32.6, w: 1.0, d: 1.0, h: 1.0},
            // sheds & deck
            {area: 'sheds', kind: 'deck', x: 17.5, z: 38.2, w: 8, d: 4.6, h: 0.12, walk: true},
            {area: 'sheds', kind: 'shed', x: 14, z: 55, w: 8, d: 4, h: 3.4},
            {area: 'sheds', kind: 'shed', x: 21.2, z: 54, w: 4, d: 6, h: 3.4},
            {area: 'sheds', kind: 'crate', x: 12.6, z: 35.4, w: 1.0, d: 1.0, h: 1.0},
            {area: 'sheds', kind: 'barrel', shape: 'circle', x: 22.8, z: 35.6, r: 0.35, h: 1.0},
            {area: 'sheds', kind: 'tree', shape: 'circle', x: 9.4, z: 56.3, r: 0.5, h: 7},
            // water-tower plaza (the tower itself is drawn by the backdrop landmark)
            {area: 'plaza', kind: 'waterTower', shape: 'circle', x: -14, z: 50, r: 2.6, landmark: true},
            {area: 'plaza', kind: 'container', x: -18, z: 39.4, w: 6, d: 2.4, stack: 2},
            {area: 'plaza', kind: 'tree', shape: 'circle', x: -20, z: 55.5, r: 0.5, h: 7},
            {area: 'plaza', kind: 'tree', shape: 'circle', x: -4, z: 56, r: 0.5, h: 7},
            {area: 'plaza', kind: 'tree', shape: 'circle', x: 5.5, z: 38.5, r: 0.5, h: 6},
            {area: 'plaza', kind: 'hedge', x: 5, z: 56.5, w: 4, d: 1.2, h: 1.3},
        ],
        paths: [
            {x: 0.4, z: 9, w: 2.6, d: 18}, {x: 0.4, z: 22, w: 2.6, d: 8}, {x: 11, z: 31.5, w: 14, d: 2.4},
            {x: 17.5, z: 33, w: 3, d: 4}, {x: 10.5, z: 45.5, w: 2.4, d: 13}, {x: 5.5, z: 51.5, w: 7, d: 2.6},
            {x: -8, z: 50, w: 13, d: 13, round: true},
        ],
        nodes: {
            n0: {x: 0, z: 1}, n0a: {x: 5.2, z: 4.2}, n0b: {x: 5.2, z: 9.8}, n1: {x: 0.4, z: 15}, g1: {x: 0.4, z: 18},
            n3: {x: 0.4, z: 21.5}, a2: {x: 3, z: 25}, n5: {x: 4.5, z: 31.5}, n6: {x: 17.5, z: 31.5}, g2: {x: 17.5, z: 34},
            a3: {x: 17.5, z: 38}, n9: {x: 10.5, z: 39.5}, n10: {x: 10.5, z: 51.5}, g3: {x: 8, z: 51.5}, a4: {x: 1, z: 50},
        },
        legs: [
            ['n0', 'n0a', 'n0b', 'n1', 'g1', 'n3', 'a2'],
            ['a2', 'n5', 'n6', 'g2', 'a3'],
            ['a3', 'n9', 'n10', 'g3', 'a4'],
        ],
        gateOpenMs: 600,
        toastMs: 1600,
        chevrons: {max: 24, spacingM: 1.5},
        idleHintMs: 15000,
    };

    // The shared backdrop (map frame): sky, distant hills, clouds, the water
    // tower landmark at the plaza and the outer trees beyond the walls.
    const BACKDROP = {
        props: [
            {kind: 'waterTower', x: -14, z: 50, h: 17},
            {kind: 'treeRound', x: -14, z: 25, h: 9}, {kind: 'pineTall', x: -6, z: 31, h: 8}, {kind: 'treeRound', x: 27, z: 19, h: 8},
            {kind: 'tree', x: -20, z: 19, h: 7}, {kind: 'pine', x: 28, z: 30, h: 7}, {kind: 'pineTall', x: -26, z: 33, h: 10},
            {kind: 'pineTall', x: 32, z: 35, h: 9}, {kind: 'treeRound', x: 29, z: 47, h: 10}, {kind: 'tree', x: -27, z: 47, h: 10},
            {kind: 'pine', x: -30, z: 14, h: 8}, {kind: 'pineTall', x: 34, z: 12, h: 9}, {kind: 'treeRound', x: 6, z: 64, h: 10},
            {kind: 'pineTall', x: -12, z: 65, h: 9}, {kind: 'tree', x: 20, z: 64, h: 9},
        ],
        hills: [[-70, 150, 70, 26], [10, 170, 80, 34], [90, 150, 70, 22], [-140, 120, 60, 18], [150, 120, 60, 20]],
        clouds: [[-60, 38, 170, 70], [20, 48, 190, 90], [85, 34, 160, 60], [-15, 30, 140, 45], [55, 55, 200, 80], [-110, 42, 150, 70]],
    };

    // Cosmetic map dressing (step 4; map frame; never a collider). The
    // container-row walls are dressed by authored container slots (2.4 m deep,
    // inner face on the wall's walkable face, 2.6 m per stack level; `v` picks
    // the kit variant); a few stacks stand outside the walls. `crates` fill
    // the 1 m gap in the north row; `fences` dress wall spans walkable on both
    // sides. Walls of kind fence/hedge are tiled from MAP.walls directly.
    const MAP_DRESSING = {
        containers: [
            // containers place, west row (behind the x −4 wall)
            {area: 'containers', x: -4.9, z: 20.85, len: 5.0, alongX: false, stack: 1, v: 0},
            {area: 'containers', x: -4.9, z: 26.05, len: 5.0, alongX: false, stack: 2, v: 1},
            {area: 'containers', x: -4.9, z: 31.25, len: 5.0, alongX: false, stack: 1, v: 2},
            // the row between the container yard and the plaza (x −22..1)
            {area: 'plaza', x: -19.225, z: 35.0, len: 5.55, alongX: true, stack: 2, v: 1},
            {area: 'plaza', x: -13.475, z: 35.0, len: 5.55, alongX: true, stack: 1, v: 2},
            {area: 'plaza', x: -7.725, z: 35.0, len: 5.55, alongX: true, stack: 1, v: 0},
            {area: 'containers', x: -1.975, z: 35.0, len: 5.55, alongX: true, stack: 2, v: 2},
            // outside the yard's east fence and west hedge (seen over them)
            {area: 'yard', x: 18.9, z: -1.5, len: 6.0, alongX: false, stack: 2, v: 2},
            {area: 'yard', x: 19.4, z: 8.6, len: 6.0, alongX: false, stack: 1, v: 0},
            {area: 'yard', x: -19.3, z: 1.0, len: 6.0, alongX: false, stack: 1, v: 1},
            {area: 'yard', x: -19.6, z: -6.5, len: 5.0, alongX: true, stack: 2, v: 0},
        ],
        crates: [{area: 'containers', x: 7.5, z: 34.4}, {area: 'containers', x: 7.5, z: 35.6}],
        fences: [{area: 'containers', minX: 14, maxX: 16, minZ: 33.7, maxZ: 34.3}],
        // floodlight towers outside the walls: [x, z, aimX, aimZ, place]; their
        // light cones show only in night themes (scene.nightLights, §7)
        floodlights: [[-17.4, 12, -6, 9, 'yard'], [17.4, 12, 6, 9, 'yard'], [25.4, 22, 14, 24, 'containers'], [25.4, 30, 14, 27, 'containers'],
            [25.4, 46, 18, 48, 'sheds'], [13, 59.4, 15, 50, 'sheds'], [-23.4, 44, -11, 48, 'plaza'], [-10, 59.4, -8, 52, 'plaza']],
        floodlightH: 7.5,
        fenceH: 1.15, hedgeH: 1.6, hedgeD: 0.9, containerH: 2.6, containerD: 2.4, wallRowH: 3.0,
    };

    const STRIKE_OPS_CONFIG = deepFreeze({
        zonePlan: {zones: ['yard', 'containers', 'sheds', 'plaza'], roundsPerZone: 4, bossRoundIndex: 3},
        zones: PLACES,
        map: MAP,
        backdrop: BACKDROP,
        dressing: MAP_DRESSING,
        squad: {exposedMs: 4000, hiddenMs: 1500, slideMs: 350, firstPeekMs: 400, relocateEvery: 2, dashMs: 900},
        boss: {
            appearMs: 250, splitMs: 600, settleMs: 150, scale: 1.2, splitSpreadM: 1.0,
            patrol: {legM: 0.8, walkMs: 450, pauseMs: 1550},
            flickerMs: 200, dissolveMs: 250, reformMs: 150,
        },
        timing: {retryLockMs: 600, correctToTransitionMs: 900, regroupMs: 1600, advanceMs: 3200, approachMs: 1000, domCrossFadeMs: 300},
        knockdown: {starsAtMs: 450, fadeStartMs: 750, fadeMs: 600},
        weapon: {
            model: 'assaultRifle', magazine: 30, reserve: 120, cooldownMs: 150, reloadMs: 1000, autoReload: true, adsMs: 120,
            recoil: {pitchKickDeg: 0.6, recoverMs: 150, springK: 220, damping: 26},
        },
        movement: {
            walk: 3.0, sprint: 4.2, fight: 2.4, adsFactor: 0.55, accel: 10, decel: 14, radius: 0.3, eye: 1.6, turnKeysDegPerS: 120,
            stickDeadZone: 0.12, sprintStickRim: 0.9, maxStepM: 0.1, slideIters: 3, centreAssistMs: 400, pitchMin: -0.5, pitchMax: 0.4,
            autopilotTurnDegPerS: 180,
        },
        aim: {
            magnetRadiusPx: {mouse: 28, touch: 44, cursor: 32},
            lookFriction: 0.65,
            hitbox: {w: 0.9, h: 1.3, d: 0.7, centerY: 1.0},
            body: {w: 0.7, d: 0.5, h: 1.7},
            // The visible body while crouched behind low cover (hide points).
            crouchBody: {w: 0.7, d: 0.5, h: 0.6},
        },
        framing: {
            // step 5: 32° = laneMaxAngleDeg + the 4° margin (was 36°): larger
            // soldiers, most visibly in portrait (§15)
            hipHalfHFovDeg: 32, minVFovDeg: 40, maxVFovDeg: 110, adsZoom: 1.35,
            laneMaxAngleDeg: 28, laneMaxDistM: 9, minEnemyPx: 56, minHitboxPx: 28, minPlateTextPx: 14,
            fightMaxDistM: 12, minEnemyPxFar: 40,
        },
        enemyModel: {
            url: ASSET_DIR + 'characters/enemy-hazmat.glb',
            lodUrl: ASSET_DIR + 'characters/enemy-hazmat-lod.glb',
            targetHeight: 1.7,
            forward: '+z',
            clips: {idle: 'Idle', aim: 'Idle', crouch: 'Duck', move: 'Walk', run: 'Run_Gun', shoot: 'Idle_Shoot', hit: 'HitReact', down: 'Death', cheer: 'Wave'},
            // measured offline from the foot plants of the in-place clips (§6.1)
            clipSpeeds: {move: 2.16, run: 4.43},
            nameplateAnchorY: 2.05,
            crouchAnchorY: 1.45,
            tintMaterials: ['Team'],
            perEnemyMaterials: 'all',
            weaponBone: 'Index1.R',
            maxPrimitives: 6,
            castShadowMinTier: 2,
        },
        nameplate: {maxWidthPx: 180, maxWidthWidePx: 240, maxLines: 3, minGapPx: 6, edgeMarginPx: 8, tierOffsetPx: 34, markerPx: 40},
        minimap: {sizePx: 128, sizePortraitPx: 96, rangeM: 24, redrawHz: 10, layerPxPerM: 6, overlayPxPerM: 9},
        quality: {
            maxPixelRatio: [1, 1.5, 2], shadowMap: [0, 1024, 2048], enemyCastShadow: [false, false, true],
            antialias: [false, false, true], maxAnimated: {mobile: 4, desktop: 6}, grassClumps: [0, 8, 18],
            useLod: [true, true, false], fpsFloor: 32, fpsWindowMs: 2000, downgradeCooldownMs: 4000,
            particleCap: [8, 12, 24], fogFarScale: [0.75, 1, 1],
        },
        kitPieces: KIT_PIECES,
        textures: TEXTURES,
        loadTimeoutMs: 15000,
        moveLimits: {moveMaxSpeed: 1.8, minTimeScale: 0.75, maxTimeScale: 1.35, inPlaceM: 0.25},
    });

    // Scene-only motif data per theme (§7). Palette colours come from themeOptions.
    const THEME_MOTIFS = {
        base: {
            setting: 'מתחם האימונים', skyTop: '#3f8fe0', skyHorizon: '#cfe7fa', haze: '#cfe4f5', hazeNear: 70, hazeFar: 230,
            sunColor: '#fff0d8', sunIntensity: 1.05, sunElevationDeg: 38, hemiSky: '#d8ecff', hemiGround: '#557a35', hemiIntensity: 0.85,
            ground: '#5e9b3a', deck: '#d9ad80', shedSiding: '#ffffff', shedTrim: '#ffffff', coverTint: '#ffffff',
            squadTints: ['#e53935', '#1e88e5', '#43a047', '#fdd835'], bossTint: '#e8eef5', trimTint: '#ffffff',
            visorEmissive: '#000000', hologramTint: '#7fe6ff', nightLights: false, correctFrom: 'primary', kitTint: '#ffffff',
        },
        soldiers: {
            setting: 'בסיס השדה', skyTop: '#6a9fd0', skyHorizon: '#efe2c4', haze: '#d8d3b8', hazeNear: 60, hazeFar: 210,
            sunColor: '#ffd9a0', sunIntensity: 1.0, sunElevationDeg: 24, hemiSky: '#efe4c8', hemiGround: '#6b6436', hemiIntensity: 0.8,
            ground: '#6b7536', deck: '#c49a6c', shedSiding: '#b9b98a', shedTrim: '#e6dcc0', coverTint: '#efe2c0',
            // light enough for 3:1 on the olive ground, yet saturated: gold, pink, sky, lime
            squadTints: ['#ffc21a', '#ff8fd0', '#3ccfff', '#9cf03c'], bossTint: '#c8b98a', trimTint: '#ffffff',
            visorEmissive: '#000000', hologramTint: '#ffe08a', nightLights: false, correctFrom: 'accent', kitTint: '#f3ead2',
        },
        unicorn: {
            setting: 'מחנה הקשת', skyTop: '#a8c8ff', skyHorizon: '#ffe4f3', haze: '#f6dcf0', hazeNear: 70, hazeFar: 230,
            sunColor: '#fff0f6', sunIntensity: 1.0, sunElevationDeg: 34, hemiSky: '#ffe0f4', hemiGround: '#7fc8a0', hemiIntensity: 0.95,
            ground: '#7cc99a', deck: '#e8b8c8', shedSiding: '#f6b2dc', shedTrim: '#ffffff', coverTint: '#ffe4f0',
            squadTints: ['#e8459a', '#9b5de5', '#21a87d', '#f28a3c'], bossTint: '#fbf6ff', trimTint: '#ffffff',
            visorEmissive: '#000000', hologramTint: '#d8a8ff', nightLights: false, correctFrom: 'secondary', kitTint: '#fff0f8',
        },
        space: {
            setting: 'בסיס אוריון', skyTop: '#0b1240', skyHorizon: '#3a3f8a', haze: '#1a2348', hazeNear: 45, hazeFar: 180,
            sunColor: '#bcd4ff', sunIntensity: 0.75, sunElevationDeg: 42, hemiSky: '#9fb6ff', hemiGround: '#3a4670', hemiIntensity: 1.05,
            ground: '#56607e', deck: '#8a94b8', shedSiding: '#7d9ccc', shedTrim: '#c8d6ff', coverTint: '#c8d4f0',
            squadTints: ['#2ee6ff', '#ffb02e', '#6dff8a', '#ff8ae6'], bossTint: '#d0d8e8', trimTint: '#c8d8ff',
            visorEmissive: '#2f7dff', visorGlow: 0.2, squadGlow: 0.3, hologramTint: '#6fd3ff', nightLights: true, correctFrom: 'tertiary', kitTint: '#6a76a4',
        },
        dark: {
            setting: 'מבצע לילה', skyTop: '#0d0d18', skyHorizon: '#2a2838', haze: '#16161c', hazeNear: 35, hazeFar: 150,
            sunColor: '#c7c2e6', sunIntensity: 0.7, sunElevationDeg: 40, hemiSky: '#a49ccc', hemiGround: '#3a3a44', hemiIntensity: 1.15,
            ground: '#3c4a36', deck: '#6e6258', shedSiding: '#7a7a82', shedTrim: '#b8b8c4', coverTint: '#a8a8b4',
            squadTints: ['#d690ff', '#19d3ea', '#ff8a1f', '#ffd43b'], bossTint: '#4a4a56', trimTint: '#c4c8e0',
            visorEmissive: '#8a3dff', visorGlow: 0.2, squadGlow: 0.3, hologramTint: '#c9a6ff', nightLights: true, correctFrom: 'accent', kitTint: '#6c6c84',
        },
        code: {
            setting: 'שרת המטריקס', skyTop: '#020a04', skyHorizon: '#0d2818', haze: '#020802', hazeNear: 35, hazeFar: 150,
            sunColor: '#b8ffc8', sunIntensity: 0.7, sunElevationDeg: 40, hemiSky: '#8cffaa', hemiGround: '#1e3a24', hemiIntensity: 1.1,
            ground: '#1d3a22', deck: '#3a5a40', shedSiding: '#3a4a3c', shedTrim: '#00ff41', coverTint: '#9ac4a0',
            squadTints: ['#00ff41', '#b4ff39', '#2fe0ff', '#ffe23a'], bossTint: '#1a2a1e', trimTint: '#c0ffd0',
            visorEmissive: '#39ff14', visorGlow: 0.2, squadGlow: 0.3, hologramTint: '#39ff14', nightLights: true, correctFrom: 'accent', kitTint: '#5c8068',
        },
    };

    // ------------------------------------------------------------------
    // Colour helpers and the central theme adapter (§7)
    // ------------------------------------------------------------------

    function parseHex(hex) {
        let h = String(hex || '').trim().replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        if (!/^[0-9a-f]{6}$/i.test(h)) return null;
        const n = parseInt(h, 16);
        return [n >> 16, (n >> 8) & 255, n & 255];
    }
    function toHex(rgb) {
        return '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    }
    function mix(a, b, t) {
        const x = parseHex(a), y = parseHex(b);
        if (!x || !y) return a || b;
        return toHex(x.map((v, i) => v + (y[i] - v) * t));
    }
    function alpha(hex, opacity) {
        const c = parseHex(hex);
        return c ? 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + opacity + ')' : hex;
    }
    function luminance(hex) {
        const c = parseHex(hex);
        if (!c) return 0;
        const lin = c.map(v => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    }
    function strikeOpsContrast(a, b) {
        const la = luminance(a), lb = luminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }
    // Pushes `color` toward `toward` until it reaches `ratio` against `against`.
    function ensureContrast(color, against, ratio, toward) {
        let c = color;
        for (let i = 0; i <= 40 && strikeOpsContrast(c, against) < ratio; i++) c = mix(color, toward, i / 40);
        return c;
    }
    // CIE76 ΔE in Lab, for the squad-tint distinctness rule.
    function labOf(hex) {
        const c = parseHex(hex) || [0, 0, 0];
        const lin = c.map(v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
        const x = (lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805) / 0.95047;
        const y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722;
        const z = (lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505) / 1.08883;
        const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
        return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
    }
    function strikeOpsDeltaE(a, b) {
        const p = labOf(a), q = labOf(b);
        return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    }

    // The answer-list layout: 'row' when every chip fits three lines in a row
    // slot; otherwise a full-width 'stacked' list, except in a short landscape
    // (no height for four stacked chips) where a two-column 'grid' keeps all
    // of them in view. Enlarged text always stacks. A portrait screen uses the
    // two-column grid (chips 1 2 / 3 4) when it is narrow (o.narrow, ≤ 400 px)
    // or the row would break a word, provided every chip fits a grid cell
    // whole (o.gridFits: ≤ 3 lines, no word wider than the cell).
    function strikeOpsAnswersLayout(overflowsRow, o) {
        if (o && o.n >= 3 && o.portrait && !(o.textScale >= 1.5) && (overflowsRow || o.narrow) && o.gridFits) return 'grid';
        if (!overflowsRow) return 'row';
        if (o && o.n >= 3 && !o.portrait && o.lowHeight && !(o.textScale >= 1.5)) return 'grid';
        return 'stacked';
    }

    function resolveStrikeOpsTheme(requested, themes) {
        const registry = themes || (typeof themeOptions !== 'undefined' ? themeOptions : {});
        const key = registry[requested] && THEME_MOTIFS[requested] ? requested : 'base';
        const colors = ((registry[key] || registry.base || {}).colors) || {};
        const motif = THEME_MOTIFS[key] || THEME_MOTIFS.base;
        const primary = colors.primary || '#006064';
        const secondary = colors.secondary || '#78909c';
        const tertiary = colors.tertiary || '#b0e0e6';
        const accent = colors.accent || '#c0c0c0';
        const background = colors.background || '#f5f5f5';
        const text = colors.text || '#000000';
        const darkUi = luminance(background) < 0.2;
        // COD-style dark glass plates in every theme, tinted toward the palette.
        const plate = darkUi ? mix(background, '#000000', 0.2) : mix('#141b22', primary, 0.12);
        const plateText = strikeOpsContrast('#ffffff', plate) >= strikeOpsContrast('#111111', plate) ? '#ffffff' : '#111111';
        const correctSeed = colors[motif.correctFrom] || primary;
        const correct = ensureContrast(correctSeed, plate, 3, plateText);
        const focus = ensureContrast(accent, plate, 3, plateText);
        const ground = motif.ground;
        // Lane tints: ≥ 3:1 against the ground (soldiers read on the grass),
        // pushed toward white or black, whichever is farther from the ground.
        const away = strikeOpsContrast('#ffffff', ground) >= strikeOpsContrast('#000000', ground) ? '#ffffff' : '#000000';
        const squadTints = motif.squadTints.map(t => ensureContrast(t, ground, 3, away));
        const scene = {
            skyTop: motif.skyTop, skyHorizon: motif.skyHorizon,
            haze: motif.haze, hazeNear: motif.hazeNear, hazeFar: motif.hazeFar,
            hemiSky: motif.hemiSky, hemiGround: motif.hemiGround, hemiIntensity: motif.hemiIntensity,
            sunColor: motif.sunColor, sunIntensity: motif.sunIntensity, sunElevationDeg: motif.sunElevationDeg,
            ground, deck: motif.deck, shedSiding: motif.shedSiding, shedTrim: motif.shedTrim, coverTint: motif.coverTint,
            squadTints, bossTint: motif.bossTint, trimTint: motif.trimTint, visorEmissive: motif.visorEmissive,
            // night visors glow faintly (a lit visor, not a hologram): copies alone glow pale
            visorGlow: motif.visorGlow != null ? motif.visorGlow : 1,
            squadGlow: motif.squadGlow != null ? motif.squadGlow : 0,
            hologramTint: motif.hologramTint, nightLights: !!motif.nightLights,
            // rev 3: the kit-material light multiplier and the minimap layer colours
            kitTint: motif.kitTint || '#ffffff',
            mapGround: mix(ground, '#3a5a2a', 0.15), mapPath: mix('#c8a77a', motif.deck, 0.4),
            mapWall: mix('#4a3b2e', motif.coverTint, 0.15), mapStructure: mix('#f2c94c', motif.shedSiding, 0.5),
            gateClosed: '#e53935', gateOpen: '#43a047',
        };
        const css = {
            '--so-primary': primary,
            '--so-secondary': secondary,
            '--so-accent': accent,
            '--so-text': text,
            '--so-panel': alpha(background, 0.9),
            '--so-edge': alpha(tertiary, 0.7),
            '--so-plate': plate,
            '--so-plate-glass': alpha(plate, 0.9),
            '--so-plate-text': plateText,
            '--so-banner-edge': darkUi ? focus : '#f5c400',
            '--so-correct': correct,
            '--so-wrong': '#ffb020',
            '--so-focus': focus,
            '--so-objective': focus,
            '--so-enemy-dot': '#ff4d4d',
            '--so-bg': motif.haze,
            '--so-lane-0': squadTints[0],
            '--so-lane-1': squadTints[1],
            '--so-lane-2': squadTints[2],
            '--so-lane-3': squadTints[3],
        };
        return {key, motif, css, scene};
    }

    // ------------------------------------------------------------------
    // Pure geometry helpers (zone-local, no DOM, no THREE)
    // ------------------------------------------------------------------

    function strikeOpsCoverBox(cover) {
        return {minX: cover.x - cover.w / 2, maxX: cover.x + cover.w / 2, minY: 0, maxY: cover.h, minZ: cover.z - cover.d / 2, maxZ: cover.z + cover.d / 2};
    }
    function boxAt(x, z, dims, centerY) {
        const y0 = centerY == null ? 0 : centerY - dims.h / 2;
        return {minX: x - dims.w / 2, maxX: x + dims.w / 2, minY: y0, maxY: y0 + dims.h, minZ: z - dims.d / 2, maxZ: z + dims.d / 2};
    }
    function overlap2d(a, b) {
        return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
    }

    const EPS = 1e-9;
    // Slab test of a segment a→b against axis-aligned boxes. Touching or grazing a
    // face does not block; only a segment that passes through a box interior does.
    function strikeOpsSegmentBlocked(a, b, boxes) {
        const ax = a.x, ay = a.y || 0, az = a.z;
        const dx = b.x - ax, dy = (b.y || 0) - ay, dz = b.z - az;
        for (let i = 0; i < (boxes || []).length; i++) {
            const box = boxes[i];
            let t0 = 0, t1 = 1, miss = false;
            const axes = [[ax, dx, box.minX, box.maxX], [ay, dy, box.minY == null ? -Infinity : box.minY, box.maxY == null ? Infinity : box.maxY], [az, dz, box.minZ, box.maxZ]];
            for (let k = 0; k < 3 && !miss; k++) {
                const o = axes[k][0], d = axes[k][1], lo = axes[k][2], hi = axes[k][3];
                if (Math.abs(d) < EPS) {
                    if (o <= lo + 1e-7 || o >= hi - 1e-7) miss = true;
                } else {
                    let ta = (lo - o) / d, tb = (hi - o) / d;
                    if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; }
                    t0 = Math.max(t0, ta);
                    t1 = Math.min(t1, tb);
                    if (t1 - t0 <= 1e-7) miss = true;
                }
            }
            if (!miss) return true;
        }
        return false;
    }
    // Ray (origin, unit dir) against one box; returns the entry distance or Infinity.
    function rayBox(o, d, box) {
        let t0 = 0, t1 = Infinity;
        const axes = [[o.x, d.x, box.minX, box.maxX], [o.y, d.y, box.minY, box.maxY], [o.z, d.z, box.minZ, box.maxZ]];
        for (let k = 0; k < 3; k++) {
            const oo = axes[k][0], dd = axes[k][1], lo = axes[k][2], hi = axes[k][3];
            if (Math.abs(dd) < EPS) {
                if (oo < lo || oo > hi) return Infinity;
            } else {
                let ta = (lo - oo) / dd, tb = (hi - oo) / dd;
                if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; }
                t0 = Math.max(t0, ta);
                t1 = Math.min(t1, tb);
                if (t0 > t1) return Infinity;
            }
        }
        return t0;
    }

    // Aim assist: nearest hittable, line-of-sight-clear candidate within the
    // radius. Candidates are {index, x, y, hittable, clear}; it never knows
    // which answer is correct, and the radius is identical for every index.
    // Exactly one candidate (or null) is returned, even for overlapping copies.
    function strikeOpsPickMagnetTarget(aim, candidates, radiusPx) {
        let best = null, bestD = Infinity;
        (candidates || []).forEach(c => {
            if (!c || !c.hittable || !c.clear) return;
            const d = Math.hypot(c.x - aim.x, c.y - aim.y);
            if (d <= radiusPx && d < bestD) { best = c; bestD = d; }
        });
        return best ? best.index : null;
    }

    // ------------------------------------------------------------------
    // The compound map (§5.1): arena → map, derived map state, colliders,
    // movement, routing and the autopilot. Pure: no DOM, no THREE.
    // ------------------------------------------------------------------

    function headingTrig(deg) {
        const q = Math.round(deg / 90);
        if (Math.abs(deg - q * 90) < 1e-9) {
            const k = ((q % 4) + 4) % 4;
            return {c: [1, 0, -1, 0][k], s: [0, 1, 0, -1][k]};
        }
        const a = deg * Math.PI / 180;
        return {c: Math.cos(a), s: Math.sin(a)};
    }
    // Arena-local (x = the player's right, z = forward, toward the squad) →
    // map: map = origin + right·x + forward·z, forward = (sin h, cos h),
    // right = (cos h, −sin h) for the compass heading h.
    function strikeOpsArenaToMap(zone, x, z) {
        const t = headingTrig(zone.headingDeg || 0), o = zone.origin || {x: 0, z: 0};
        return {x: o.x + x * t.c + z * t.s, z: o.z - x * t.s + z * t.c};
    }
    function strikeOpsRectToMap(zone, r) {
        const a = strikeOpsArenaToMap(zone, r.minX, r.minZ), b = strikeOpsArenaToMap(zone, r.maxX, r.maxZ);
        return {minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z)};
    }
    function copyRect(r) { return {minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ}; }
    function inRect(p, r, eps) {
        const e = eps || 0;
        return p.x >= r.minX - e && p.x <= r.maxX + e && p.z >= r.minZ - e && p.z <= r.maxZ + e;
    }
    function inflateRect(r, d) { return {minX: r.minX - d, maxX: r.maxX + d, minZ: r.minZ - d, maxZ: r.maxZ + d}; }
    function wrapAngle(a) {
        let d = a;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        return d;
    }
    // An arena-local pose (x, z, yaw) in the map frame (yaw + heading).
    function strikeOpsPoseToMap(zone, pose) {
        const m = strikeOpsArenaToMap(zone, pose.x, pose.z);
        return Object.assign({}, pose, {x: m.x, z: m.z, yaw: pose.yaw + (zone.headingDeg || 0) * Math.PI / 180});
    }

    // Per place, the map-frame data used every frame (computed once per place).
    const PLACE_CACHE = new WeakMap();
    function strikeOpsPlaceFrame(zone) {
        let f = PLACE_CACHE.get(zone);
        if (f) return f;
        const m = p => strikeOpsArenaToMap(zone, p.x, p.z);
        const h = (zone.headingDeg || 0) * Math.PI / 180;
        f = {
            fightBox: strikeOpsRectToMap(zone, zone.fightBox),
            core: strikeOpsRectToMap(zone, zone.core),
            anchor: m(zone.anchor),
            heading: h,
            headingDeg: zone.headingDeg || 0,
            // lateral axis along map z (headings 90°/270°): hitbox w/d swap
            swapXZ: Math.abs(Math.sin(h)) > 0.5,
            cover: zone.cover.map(cv => {
                const r = strikeOpsRectToMap(zone, {minX: cv.x - cv.w / 2, maxX: cv.x + cv.w / 2, minZ: cv.z - cv.d / 2, maxZ: cv.z + cv.d / 2});
                return {minX: r.minX, maxX: r.maxX, minY: 0, maxY: cv.h, minZ: r.minZ, maxZ: r.maxZ, kind: cv.kind};
            }),
            bossStage: m(zone.boss.stage),
            approach: zone.approach.map(m),
        };
        PLACE_CACHE.set(zone, f);
        return f;
    }
    function placeIndexById(cfg, id) {
        const zones = cfg.zones || [];
        for (let i = 0; i < zones.length; i++) if (zones[i].id === id) return i;
        return -1;
    }
    function strikeOpsGateRect(g) {
        return g.axis === 'x' ? {minX: g.min, maxX: g.max, minZ: g.at - 0.3, maxZ: g.at + 0.3} : {minX: g.at - 0.3, maxX: g.at + 0.3, minZ: g.min, maxZ: g.max};
    }

    // Derived map state from the COMMITTED zone index k (§5.1, rev 3.1): gate
    // g_j is open iff k ≥ j; place i's enemyZone blocks iff i ≥ k; the target
    // is place k; its trigger is armed only in roaming. k = zones.length is
    // "every place cleared" (used by validation only).
    function strikeOpsMapState(k, phase, cfg) {
        const c = cfg || STRIKE_OPS_CONFIG, zones = c.zones, n = zones.length;
        const kk = Math.max(0, Math.min(n, Math.floor(k || 0)));
        const target = kk < n ? zones[kk] : null;
        const tf = target ? strikeOpsPlaceFrame(target) : null;
        return {
            k: kk,
            phase: phase || null,
            gates: c.map.gates.map(g => ({id: g.id, from: g.from, to: g.to, open: !g.decorative && placeIndexById(c, g.to) <= kk})),
            blockers: zones.map((z, i) => ({placeId: z.id, rect: copyRect(z.enemyZone), active: i >= kk})),
            targetIndex: target ? kk : -1,
            targetId: target ? target.id : null,
            trigger: target ? {placeId: target.id, rect: copyRect(tf.fightBox), armed: phase === 'roaming'} : null,
            objective: target ? {placeId: target.id, x: tf.anchor.x, z: tf.anchor.z} : null,
        };
    }

    // Colliders: the static set (walls, solid structures, every place's cover)
    // in a uniform 4 m grid built once per config, plus the state's closed
    // gates and active blockers, checked directly.
    const COLLIDER_CACHE = new WeakMap();
    function buildStaticColliders(c) {
        const boxes = [], circles = [];
        c.map.walls.forEach((w, i) => boxes.push({minX: w.minX, maxX: w.maxX, minZ: w.minZ, maxZ: w.maxZ, tag: 'wall ' + i + ' ' + w.kind, kind: w.kind}));
        c.map.structures.forEach(s => {
            if (s.walk) return;
            if (s.shape === 'circle') circles.push({x: s.x, z: s.z, r: s.r, tag: s.area + ' ' + s.kind, kind: s.kind});
            else boxes.push({minX: s.x - s.w / 2, maxX: s.x + s.w / 2, minZ: s.z - s.d / 2, maxZ: s.z + s.d / 2, tag: s.area + ' ' + s.kind, kind: s.kind});
        });
        c.zones.forEach(z => strikeOpsPlaceFrame(z).cover.forEach((b, k) => boxes.push({minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ, tag: z.id + ' cover ' + k, kind: 'cover'})));
        const B = c.map.bounds, cell = 4;
        const nx = Math.max(1, Math.ceil((B.maxX - B.minX) / cell)), nz = Math.max(1, Math.ceil((B.maxZ - B.minZ) / cell));
        const cells = [];
        for (let i = 0; i < nx * nz; i++) cells.push([]);
        const addTo = (minX, maxX, minZ, maxZ, id) => {
            const i0 = clampInt(Math.floor((minX - B.minX) / cell), 0, nx - 1), i1 = clampInt(Math.floor((maxX - B.minX) / cell), 0, nx - 1);
            const j0 = clampInt(Math.floor((minZ - B.minZ) / cell), 0, nz - 1), j1 = clampInt(Math.floor((maxZ - B.minZ) / cell), 0, nz - 1);
            for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) cells[i + j * nx].push(id);
        };
        boxes.forEach((b, id) => addTo(b.minX, b.maxX, b.minZ, b.maxZ, id));
        circles.forEach((ci, id) => addTo(ci.x - ci.r, ci.x + ci.r, ci.z - ci.r, ci.z + ci.r, boxes.length + id));
        return {boxes, circles, grid: {minX: B.minX, minZ: B.minZ, cell, nx, nz, cells, mark: new Uint32Array(boxes.length + circles.length), stamp: 0}};
    }
    function clampInt(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function strikeOpsColliders(k, cfg) {
        const c = cfg || STRIKE_OPS_CONFIG;
        let cache = COLLIDER_CACHE.get(c);
        if (!cache) { cache = {st: buildStaticColliders(c), byK: new Map()}; COLLIDER_CACHE.set(c, cache); }
        const kk = Math.max(0, Math.min(c.zones.length, Math.floor(k || 0)));
        if (cache.byK.has(kk)) return cache.byK.get(kk);
        const state = strikeOpsMapState(kk, null, c);
        const dyn = [];
        c.map.gates.forEach((g, i) => { if (!state.gates[i].open) { const r = strikeOpsGateRect(g); dyn.push({minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, tag: 'gate ' + g.id, kind: 'gate'}); } });
        state.blockers.forEach(b => { if (b.active) dyn.push({minX: b.rect.minX, maxX: b.rect.maxX, minZ: b.rect.minZ, maxZ: b.rect.maxZ, tag: 'blocker ' + b.placeId, kind: 'blocker'}); });
        const col = {k: kk, boxes: cache.st.boxes, circles: cache.st.circles, grid: cache.st.grid, dyn, cfg: c, walk: null, graph: null};
        cache.byK.set(kk, col);
        return col;
    }
    // Fills the module scratch lists with the colliders near an AABB (no
    // allocation). `colliders` is a collider set or a plain array of boxes.
    const NEAR_B = [], NEAR_C = [];
    function gatherColliders(col, minX, maxX, minZ, maxZ) {
        NEAR_B.length = 0; NEAR_C.length = 0;
        if (!col) return;
        if (Array.isArray(col)) { for (let i = 0; i < col.length; i++) NEAR_B.push(col[i]); return; }
        const dyn = col.dyn || [];
        for (let i = 0; i < dyn.length; i++) {
            const b = dyn[i];
            if (b.maxX >= minX && b.minX <= maxX && b.maxZ >= minZ && b.minZ <= maxZ) NEAR_B.push(b);
        }
        const g = col.grid, nb = col.boxes.length;
        if (!g) {
            col.boxes.forEach(b => NEAR_B.push(b));
            (col.circles || []).forEach(ci => NEAR_C.push(ci));
            return;
        }
        g.stamp = (g.stamp + 1) >>> 0;
        if (g.stamp === 0) { g.mark.fill(0); g.stamp = 1; }
        const i0 = clampInt(Math.floor((minX - g.minX) / g.cell), 0, g.nx - 1), i1 = clampInt(Math.floor((maxX - g.minX) / g.cell), 0, g.nx - 1);
        const j0 = clampInt(Math.floor((minZ - g.minZ) / g.cell), 0, g.nz - 1), j1 = clampInt(Math.floor((maxZ - g.minZ) / g.cell), 0, g.nz - 1);
        for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) {
                const list = g.cells[i + j * g.nx];
                for (let q = 0; q < list.length; q++) {
                    const id = list[q];
                    if (g.mark[id] === g.stamp) continue;
                    g.mark[id] = g.stamp;
                    if (id < nb) NEAR_B.push(col.boxes[id]); else NEAR_C.push(col.circles[id - nb]);
                }
            }
        }
    }
    // Does a capsule of radius r at (x, z) overlap a gathered collider?
    function nearPenetrates(x, z, r) {
        const r2 = r * r;
        for (let i = 0; i < NEAR_B.length; i++) {
            const b = NEAR_B[i];
            const cx = x < b.minX ? b.minX : (x > b.maxX ? b.maxX : x), cz = z < b.minZ ? b.minZ : (z > b.maxZ ? b.maxZ : z);
            const ox = x - cx, oz = z - cz;
            if (ox * ox + oz * oz < r2) return true;
        }
        for (let i = 0; i < NEAR_C.length; i++) {
            const ci = NEAR_C[i], rr = ci.r + r, ox = x - ci.x, oz = z - ci.z;
            if (ox * ox + oz * oz < rr * rr) return true;
        }
        return false;
    }
    function strikeOpsPenetrates(col, p, r) {
        gatherColliders(col, p.x - r - 0.01, p.x + r + 0.01, p.z - r - 0.01, p.z + r + 0.01);
        return nearPenetrates(p.x, p.z, r);
    }
    const PUSH = {x: 0, z: 0};
    function nearPushOut(x, z, r, iters) {
        const lim = r - 1e-9, lim2 = lim * lim;
        for (let it = 0; it < iters; it++) {
            let moved = false;
            for (let i = 0; i < NEAR_B.length; i++) {
                const b = NEAR_B[i];
                const cx = x < b.minX ? b.minX : (x > b.maxX ? b.maxX : x), cz = z < b.minZ ? b.minZ : (z > b.maxZ ? b.maxZ : z);
                const ox = x - cx, oz = z - cz, d2 = ox * ox + oz * oz;
                if (d2 >= lim2) continue;
                if (d2 > 1e-12) {
                    const d = Math.sqrt(d2);
                    x = cx + ox / d * r;
                    z = cz + oz / d * r;
                } else {
                    const pl = x - b.minX + r, pr = b.maxX - x + r, pd = z - b.minZ + r, pu = b.maxZ - z + r;
                    const m = Math.min(pl, pr, pd, pu);
                    if (m === pl) x = b.minX - r; else if (m === pr) x = b.maxX + r; else if (m === pd) z = b.minZ - r; else z = b.maxZ + r;
                }
                moved = true;
            }
            for (let i = 0; i < NEAR_C.length; i++) {
                const ci = NEAR_C[i], rr = ci.r + r, ox = x - ci.x, oz = z - ci.z, d2 = ox * ox + oz * oz;
                if (d2 >= (rr - 1e-9) * (rr - 1e-9)) continue;
                if (d2 > 1e-12) { const d = Math.sqrt(d2); x = ci.x + ox / d * rr; z = ci.z + oz / d * rr; } else x = ci.x + rr;
                moved = true;
            }
            if (!moved) break;
        }
        PUSH.x = x; PUSH.z = z;
        return PUSH;
    }
    // Capsule (radius r) vs AABBs and circles with sliding, sub-stepped at
    // maxStepM so no frame can tunnel through a 0.3 m wall, then clamped to
    // clampRect (the fight box in encounters, playBounds while roaming). A
    // sub-step that would still end inside a collider (a gap narrower than the
    // capsule) is reverted on that axis, so the result never ends inside one.
    function strikeOpsResolveMove(pos, delta, colliders, clampRect, radius, maxStepM) {
        const mv = STRIKE_OPS_CONFIG.movement;
        const r = radius == null ? mv.radius : radius;
        const stepM = maxStepM > 0 ? maxStepM : mv.maxStepM;
        const iters = mv.slideIters || 3;
        let x = pos.x, z = pos.z;
        const dx = delta.x || 0, dz = delta.z || 0;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const n = Math.max(1, Math.ceil(dist / stepM - 1e-9));
        const pad = r + 0.1;
        gatherColliders(colliders, Math.min(x, x + dx) - pad, Math.max(x, x + dx) + pad, Math.min(z, z + dz) - pad, Math.max(z, z + dz) + pad);
        const startBad = nearPenetrates(x, z, r - 1e-6);
        const cl = clampRect;
        for (let s = 0; s < n; s++) {
            for (let axis = 0; axis < 2; axis++) {
                let nx = axis === 0 ? x + dx / n : x, nz = axis === 1 ? z + dz / n : z;
                const p = nearPushOut(nx, nz, r, iters);
                nx = p.x; nz = p.z;
                if (cl) {
                    nx = nx < cl.minX ? cl.minX : (nx > cl.maxX ? cl.maxX : nx);
                    nz = nz < cl.minZ ? cl.minZ : (nz > cl.maxZ ? cl.maxZ : nz);
                }
                if (!startBad && nearPenetrates(nx, nz, r - 1e-6)) continue;
                x = nx; z = nz;
            }
        }
        if (startBad) {
            const p = nearPushOut(x, z, r, iters);
            x = p.x; z = p.z;
            if (cl) { x = clamp(x, cl.minX, cl.maxX); z = clamp(z, cl.minZ, cl.maxZ); }
        }
        return {x, z};
    }
    // A segment a→b swept by a capsule of radius `margin` touches no collider
    // interior (AABBs inflated by the margin; circles by distance).
    function segHitsRect(ax, az, bx, bz, minX, maxX, minZ, maxZ) {
        let t0 = 0, t1 = 1;
        const dx = bx - ax, dz = bz - az;
        if (Math.abs(dx) < 1e-12) { if (ax <= minX || ax >= maxX) return false; } else {
            let u = (minX - ax) / dx, v = (maxX - ax) / dx;
            if (u > v) { const t = u; u = v; v = t; }
            t0 = Math.max(t0, u); t1 = Math.min(t1, v);
            if (t1 - t0 <= 1e-9) return false;
        }
        if (Math.abs(dz) < 1e-12) { if (az <= minZ || az >= maxZ) return false; } else {
            let u = (minZ - az) / dz, v = (maxZ - az) / dz;
            if (u > v) { const t = u; u = v; v = t; }
            t0 = Math.max(t0, u); t1 = Math.min(t1, v);
            if (t1 - t0 <= 1e-9) return false;
        }
        return true;
    }
    function segPointDist(ax, az, bx, bz, px, pz) {
        const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
        const t = L > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
        return Math.hypot(ax + dx * t - px, az + dz * t - pz);
    }
    function pointRectDist(x, z, q) {
        const dx = x < q.minX ? q.minX - x : (x > q.maxX ? x - q.maxX : 0), dz = z < q.minZ ? q.minZ - z : (z > q.maxZ ? z - q.maxZ : 0);
        return Math.sqrt(dx * dx + dz * dz);
    }
    function strikeOpsSegmentClear(a, b, colliders, margin) {
        const m = margin == null ? STRIKE_OPS_CONFIG.movement.radius : margin;
        gatherColliders(colliders, Math.min(a.x, b.x) - m - 0.01, Math.max(a.x, b.x) + m + 0.01, Math.min(a.z, b.z) - m - 0.01, Math.max(a.z, b.z) + m + 0.01);
        for (let i = 0; i < NEAR_B.length; i++) {
            const q = NEAR_B[i];
            // quick reject outside the inflated box, then the exact (rounded-corner) distance
            if (!segHitsRect(a.x, a.z, b.x, b.z, q.minX - m, q.maxX + m, q.minZ - m, q.maxZ + m)) continue;
            if (segHitsRect(a.x, a.z, b.x, b.z, q.minX, q.maxX, q.minZ, q.maxZ)) return false;
            const lim = m - 1e-9;
            if (pointRectDist(a.x, a.z, q) < lim || pointRectDist(b.x, b.z, q) < lim ||
                segPointDist(a.x, a.z, b.x, b.z, q.minX, q.minZ) < lim || segPointDist(a.x, a.z, b.x, b.z, q.maxX, q.minZ) < lim ||
                segPointDist(a.x, a.z, b.x, b.z, q.minX, q.maxZ) < lim || segPointDist(a.x, a.z, b.x, b.z, q.maxX, q.maxZ) < lim) return false;
        }
        for (let i = 0; i < NEAR_C.length; i++) {
            const ci = NEAR_C[i];
            if (segPointDist(a.x, a.z, b.x, b.z, ci.x, ci.z) < ci.r + m - 1e-9) return false;
        }
        return true;
    }

    // The walkable grid of a state (0.25 m over playBounds; free = the capsule
    // fits there), computed once per state on demand.
    function strikeOpsWalkGrid(col) {
        if (col.walk) return col.walk;
        const c = col.cfg, B = c.map.playBounds, step = 0.25, r = c.movement.radius;
        const nx = Math.round((B.maxX - B.minX) / step) + 1, nz = Math.round((B.maxZ - B.minZ) / step) + 1;
        const free = new Uint8Array(nx * nz);
        for (let j = 0; j < nz; j++) {
            const z = B.minZ + j * step;
            if (z < B.minZ + r || z > B.maxZ - r) continue;
            for (let i = 0; i < nx; i++) {
                const x = B.minX + i * step;
                if (x < B.minX + r || x > B.maxX - r) continue;
                gatherColliders(col, x - r - 0.01, x + r + 0.01, z - r - 0.01, z + r + 0.01);
                if (!nearPenetrates(x, z, r)) free[i + j * nx] = 1;
            }
        }
        col.walk = {B, step, nx, nz, free};
        return col.walk;
    }
    function gridCell(W, p) {
        return {i: Math.round((p.x - W.B.minX) / W.step), j: Math.round((p.z - W.B.minZ) / W.step)};
    }
    function gridFree(W, i, j) { return i >= 0 && j >= 0 && i < W.nx && j < W.nz && W.free[i + j * W.nx] === 1; }
    // A 4-neighbour flood fill of the walkable grid from a seed point.
    function strikeOpsFloodFill(col, seed) {
        const W = strikeOpsWalkGrid(col);
        const seen = new Uint8Array(W.nx * W.nz);
        const s = gridCell(W, seed);
        let si = -1;
        for (let rad = 0; rad <= 2 && si < 0; rad++) {
            for (let dj = -rad; dj <= rad && si < 0; dj++) for (let di = -rad; di <= rad && si < 0; di++) if (gridFree(W, s.i + di, s.j + dj)) si = (s.i + di) + (s.j + dj) * W.nx;
        }
        if (si < 0) return {W, seen, count: 0, seedFree: false};
        const stack = [si];
        seen[si] = 1;
        let count = 1;
        while (stack.length) {
            const id = stack.pop(), i = id % W.nx, j = (id - i) / W.nx;
            const nb = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]];
            for (let q = 0; q < 4; q++) {
                const a = nb[q][0], b = nb[q][1];
                if (!gridFree(W, a, b)) continue;
                const k = a + b * W.nx;
                if (seen[k]) continue;
                seen[k] = 1; count += 1; stack.push(k);
            }
        }
        return {W, seen, count, seedFree: true};
    }
    function floodReaches(fill, p) {
        const W = fill.W, c = gridCell(W, p);
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
            const i = c.i + di, j = c.j + dj;
            if (i >= 0 && j >= 0 && i < W.nx && j < W.nz && fill.seen[i + j * W.nx]) return true;
        }
        return false;
    }

    // Route graph of a state: the legs as undirected edges, usable iff the
    // capsule keeps ≥ 0.05 m clear of the state's colliders.
    function strikeOpsRouteGraph(col) {
        if (col.graph) return col.graph;
        const c = col.cfg, nodes = c.map.nodes, ids = Object.keys(nodes), r = c.movement.radius;
        const order = {};
        ids.forEach((id, i) => { order[id] = i; });
        const adj = {};
        ids.forEach(id => { adj[id] = []; });
        const seen = new Set();
        const edges = [];
        c.map.legs.forEach(leg => {
            for (let i = 1; i < leg.length; i++) {
                const a = leg[i - 1], b = leg[i], key = a < b ? a + '|' + b : b + '|' + a;
                if (seen.has(key)) continue;
                seen.add(key);
                const usable = strikeOpsSegmentClear(nodes[a], nodes[b], col, r + 0.05);
                const len = Math.hypot(nodes[b].x - nodes[a].x, nodes[b].z - nodes[a].z);
                edges.push({a, b, usable, len});
                if (usable) { adj[a].push({to: b, len}); adj[b].push({to: a, len}); }
            }
        });
        ids.forEach(id => adj[id].sort((p, q) => order[p.to] - order[q.to]));
        const comp = {};
        let cid = 0;
        ids.forEach(id => {
            if (comp[id] != null) return;
            const st = [id];
            comp[id] = cid;
            while (st.length) { const u = st.pop(); adj[u].forEach(e => { if (comp[e.to] == null) { comp[e.to] = cid; st.push(e.to); } }); }
            cid += 1;
        });
        // the node at each place's anchor (n0 for the yard)
        const anchorNode = c.zones.map(z => {
            const a = strikeOpsPlaceFrame(z).anchor;
            let best = null, bd = Infinity;
            ids.forEach(id => { const d = Math.hypot(nodes[id].x - a.x, nodes[id].z - a.z); if (d < bd - 1e-12) { bd = d; best = id; } });
            return bd < 1e-6 ? best : null;
        });
        col.graph = {ids, order, adj, comp, edges, anchorNode, nodes};
        return col.graph;
    }
    function dijkstra(G, from, to) {
        const ids = G.ids, dist = {}, prev = {}, done = {};
        ids.forEach(id => { dist[id] = Infinity; });
        dist[from] = 0;
        for (;;) {
            let u = null;
            ids.forEach(id => { if (!done[id] && dist[id] < Infinity && (u === null || dist[id] < dist[u] - 1e-12)) u = id; });
            if (u === null) return null;
            if (u === to) break;
            done[u] = true;
            G.adj[u].forEach(e => {
                const nd = dist[u] + e.len;
                if (nd < dist[e.to] - 1e-9 || (Math.abs(nd - dist[e.to]) <= 1e-9 && prev[e.to] != null && G.order[u] < G.order[prev[e.to]])) { dist[e.to] = nd; prev[e.to] = u; }
            });
        }
        const path = [to];
        while (path[0] !== from) path.unshift(prev[path[0]]);
        return path;
    }
    // Grid fallback (§5.1 step 4): a shortest 8-neighbour path on the 0.25 m
    // walkable grid (octile costs, no corner cutting, neighbours in the fixed
    // order E, NE, N, NW, W, SW, S, SE, ties by that order), then string-pulled
    // with the capsule-clear segment test from the start point. The search is
    // a Dijkstra field from the goal cell cached per state and goal — an A*
    // with an exact heuristic, so repeated queries toward one objective cost
    // only their path length.
    const GRID_DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    function nearestFreeCell(W, p, maxRing) {
        const c = gridCell(W, p);
        for (let rad = 0; rad <= maxRing; rad++) {
            let best = null, bd = Infinity;
            for (let dj = -rad; dj <= rad; dj++) for (let di = -rad; di <= rad; di++) {
                if (Math.max(Math.abs(di), Math.abs(dj)) !== rad || !gridFree(W, c.i + di, c.j + dj)) continue;
                const x = W.B.minX + (c.i + di) * W.step, z = W.B.minZ + (c.j + dj) * W.step, d = Math.hypot(x - p.x, z - p.z);
                if (d < bd - 1e-12) { bd = d; best = {i: c.i + di, j: c.j + dj}; }
            }
            if (best) return best;
        }
        return null;
    }
    function gridField(col, W, gid) {
        if (!col.fields) col.fields = new Map();
        if (col.fields.has(gid)) return col.fields.get(gid);
        const N = W.nx * W.nz, dist = new Float64Array(N).fill(Infinity);
        let cap = 1024, keys = new Float64Array(cap), ids = new Int32Array(cap), size = 0;
        const push = (k, id) => {
            if (size === cap) { cap *= 2; const nk = new Float64Array(cap), ni = new Int32Array(cap); nk.set(keys); ni.set(ids); keys = nk; ids = ni; }
            let i = size++;
            while (i > 0) { const p = (i - 1) >> 1; if (keys[p] <= k) break; keys[i] = keys[p]; ids[i] = ids[p]; i = p; }
            keys[i] = k; ids[i] = id;
        };
        const popId = () => {
            const top = ids[0], lk = keys[--size], li = ids[size];
            let i = 0;
            for (;;) {
                const l = 2 * i + 1, r = l + 1;
                let m = -1, mk = lk;
                if (l < size && keys[l] < mk) { m = l; mk = keys[l]; }
                if (r < size && keys[r] < mk) { m = r; mk = keys[r]; }
                if (m < 0) break;
                keys[i] = keys[m]; ids[i] = ids[m]; i = m;
            }
            keys[i] = lk; ids[i] = li;
            return top;
        };
        dist[gid] = 0;
        push(0, gid);
        while (size) {
            const k0 = keys[0], id = popId();
            if (k0 > dist[id] + 1e-6) continue;
            const i = id % W.nx, j = (id - i) / W.nx;
            for (let q = 0; q < 8; q++) {
                const di = GRID_DIRS[q][0], dj = GRID_DIRS[q][1], a = i + di, b = j + dj;
                if (!gridFree(W, a, b)) continue;
                if (di && dj && (!gridFree(W, i + di, j) || !gridFree(W, i, j + dj))) continue;
                const k = a + b * W.nx, nd = dist[id] + (di && dj ? Math.SQRT2 : 1);
                if (nd < dist[k] - 1e-6) { dist[k] = nd; push(nd, k); }
            }
        }
        if (col.fields.size > 8) col.fields.delete(col.fields.keys().next().value);
        col.fields.set(gid, dist);
        return dist;
    }
    function gridRoute(from, goal, col, conn) {
        const W = strikeOpsWalkGrid(col);
        const s = nearestFreeCell(W, from, 4), g = nearestFreeCell(W, goal, 2);
        if (!s || !g) return null;
        const gid = g.i + g.j * W.nx, field = gridField(col, W, gid);
        let id = s.i + s.j * W.nx;
        if (!isFinite(field[id])) return null;
        const cells = [];
        let guard = W.nx * W.nz;
        while (id !== gid && guard-- > 0) {
            const i = id % W.nx, j = (id - i) / W.nx;
            cells.push({x: W.B.minX + i * W.step, z: W.B.minZ + j * W.step});
            let best = -1, bv = field[id];
            for (let q = 0; q < 8; q++) {
                const di = GRID_DIRS[q][0], dj = GRID_DIRS[q][1], a = i + di, b = j + dj;
                if (!gridFree(W, a, b)) continue;
                if (di && dj && (!gridFree(W, i + di, j) || !gridFree(W, i, j + dj))) continue;
                const k = a + b * W.nx, v = field[k] + (di && dj ? Math.SQRT2 : 1);
                if (field[k] < field[id] - 1e-6 && v < bv + 1e-6 && (best < 0 || v < bv - 1e-6)) { best = k; bv = v; }
            }
            if (best < 0) return null;
            id = best;
        }
        cells.push({x: W.B.minX + (gid % W.nx) * W.step, z: W.B.minZ + Math.floor(gid / W.nx) * W.step});
        cells.push({x: goal.x, z: goal.z});
        const pts = [{x: from.x, z: from.z}];
        let cur = pts[0], i = -1;
        while (i < cells.length - 1) {
            let j = i + 1;
            while (j + 1 < cells.length && strikeOpsSegmentClear(cur, cells[j + 1], col, conn)) j += 1;
            cur = cells[j];
            pts.push({x: cur.x, z: cur.z});
            i = j;
        }
        return pts;
    }
    function polyLength(pts) {
        let L = 0;
        for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
        return L;
    }
    // Routing (§5.1, rev 3.1): the route graph with entry/exit connectors and
    // Dijkstra, else A* on the walkable grid, else 'no-route'. `target` is a
    // place id (its anchor) or a map point; `state` the committed zone index.
    function strikeOpsRoute(from, target, state, cfg) {
        const c = cfg || STRIKE_OPS_CONFIG;
        const k = typeof state === 'number' ? state : (state && state.k != null ? state.k : 0);
        const col = strikeOpsColliders(k, c), G = strikeOpsRouteGraph(col);
        const r = c.movement.radius, conn = r - 0.02;
        const fail = {ok: false, reason: 'no-route'};
        let goal, goalNode = null;
        if (typeof target === 'string') {
            const zi = placeIndexById(c, target);
            if (zi < 0) return fail;
            goal = strikeOpsPlaceFrame(c.zones[zi]).anchor;
            goalNode = G.anchorNode[zi];
        } else if (target && typeof target.x === 'number' && typeof target.z === 'number') goal = {x: target.x, z: target.z};
        else return fail;
        const PB = c.map.playBounds;
        if (!inRect(goal, inflateRect(PB, -r + 1e-9)) || strikeOpsPenetrates(col, goal, r - 0.01)) return fail;
        const start = {x: from.x, z: from.z};
        const done = (pts, via) => {
            const out = [];
            pts.forEach(p => { const q = out[out.length - 1]; if (!q || Math.hypot(q.x - p.x, q.z - p.z) > 1e-6) out.push({x: p.x, z: p.z}); });
            if (out.length === 1) out.push({x: out[0].x, z: out[0].z});
            return {ok: true, points: out, via, length: polyLength(out)};
        };
        if (!goalNode && strikeOpsSegmentClear(start, goal, col, conn)) return done([start, goal], 'graph');
        const byDist = p => G.ids.slice().sort((a, b) => {
            const da = Math.hypot(G.nodes[a].x - p.x, G.nodes[a].z - p.z), db = Math.hypot(G.nodes[b].x - p.x, G.nodes[b].z - p.z);
            return Math.abs(da - db) > 1e-9 ? da - db : G.order[a] - G.order[b];
        });
        let exitId = goalNode;
        if (!exitId) exitId = byDist(goal).find(id => strikeOpsSegmentClear(G.nodes[id], goal, col, conn)) || null;
        if (exitId) {
            const entryId = byDist(start).find(id => G.comp[id] === G.comp[exitId] && strikeOpsSegmentClear(start, G.nodes[id], col, conn)) || null;
            if (entryId) {
                const path = dijkstra(G, entryId, exitId);
                if (path) {
                    const pts = [start].concat(path.map(id => G.nodes[id]));
                    if (!goalNode) pts.push(goal);
                    return done(pts, 'graph');
                }
            }
        }
        const grid = gridRoute(start, goal, col, conn);
        return grid ? done(grid, 'grid') : fail;
    }

    // One autopilot step (§3 guidance 6, §12.1 walkTo): advances along the
    // route's points and returns the walking direction (map frame, length ≤ 1)
    // and the view yaw turned toward it (≤ autopilotTurnDegPerS; instant under
    // reduced motion). `ap` = {points, index} is advanced in place.
    function strikeOpsAutopilotStep(ap, player, cfg, dtMs, reducedMotion) {
        const c = cfg || STRIKE_OPS_CONFIG, pts = ap.points;
        if (ap.index == null || ap.index < 1) ap.index = 1;
        while (ap.index < pts.length - 1) {
            const p = pts[ap.index], q = pts[ap.index + 1];
            const d = Math.hypot(p.x - player.x, p.z - player.z);
            const past = d < 0.6 && (player.x - p.x) * (q.x - p.x) + (player.z - p.z) * (q.z - p.z) > 0;
            if (d < 0.2 || past) { ap.index += 1; continue; }
            break;
        }
        const t = pts[Math.min(ap.index, pts.length - 1)];
        const dx = t.x - player.x, dz = t.z - player.z, dist = Math.hypot(dx, dz);
        const last = ap.index >= pts.length - 1;
        if (last && dist < 0.05) return {dirX: 0, dirZ: 0, yaw: player.yaw, done: true};
        const scale = last ? Math.min(1, dist / 0.6) : 1;
        const ux = dx / Math.max(1e-9, dist), uz = dz / Math.max(1e-9, dist);
        const want = Math.atan2(ux, uz);
        let yaw = player.yaw;
        if (reducedMotion) yaw = want;
        else {
            const maxTurn = (c.movement.autopilotTurnDegPerS || 180) * Math.PI / 180 * Math.max(0, dtMs) / 1000;
            const diff = wrapAngle(want - yaw);
            yaw = yaw + Math.max(-maxTurn, Math.min(maxTurn, diff));
        }
        return {dirX: ux * scale, dirZ: uz * scale, yaw, done: false};
    }
    // Gentle acceleration/braking (§3): the velocity follows the wanted
    // direction at once, its speed ramps by accel (or brakes by decel).
    function strikeOpsVelocityStep(vel, wantX, wantZ, maxSpeed, cfg, dt) {
        const mv = (cfg || STRIKE_OPS_CONFIG).movement;
        const wl = Math.hypot(wantX, wantZ);
        if (wl < 1e-6) {
            const s = Math.hypot(vel.x, vel.z), ns = Math.max(0, s - mv.decel * dt);
            if (s > 1e-9) { vel.x *= ns / s; vel.z *= ns / s; } else { vel.x = 0; vel.z = 0; }
            return vel;
        }
        const ux = wantX / wl, uz = wantZ / wl, target = maxSpeed * Math.min(1, wl);
        const along = Math.max(0, vel.x * ux + vel.z * uz);
        const s = along < target ? Math.min(target, along + mv.accel * dt) : Math.max(target, along - mv.decel * dt);
        vel.x = ux * s; vel.z = uz * s;
        return vel;
    }
    // The place whose region contains a map point (ties on a shared wall go
    // to the preferred (target) place); -1 outside every region.
    function strikeOpsCurrentPlace(p, cfg, preferIndex) {
        const c = cfg || STRIKE_OPS_CONFIG;
        if (preferIndex != null && preferIndex >= 0 && c.zones[preferIndex] && inRect(p, c.zones[preferIndex].region)) return preferIndex;
        for (let i = 0; i < c.zones.length; i++) if (inRect(p, c.zones[i].region)) return i;
        return -1;
    }

    // Polyline helpers (zone-local {x, z} points).
    function pathLength(pts) {
        let total = 0;
        for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
        return total;
    }
    function pathPoint(pts, t) {
        if (pts.length === 1) return {x: pts[0].x, z: pts[0].z, dx: 0, dz: 1};
        const total = pathLength(pts);
        let s = Math.max(0, Math.min(1, t)) * total;
        for (let i = 1; i < pts.length; i++) {
            const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
            if (s <= l || i === pts.length - 1) {
                const k = l ? Math.min(1, s / l) : 1;
                return {x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, z: pts[i - 1].z + (pts[i].z - pts[i - 1].z) * k, dx: pts[i].x - pts[i - 1].x, dz: pts[i].z - pts[i - 1].z};
            }
            s -= l;
        }
        const last = pts[pts.length - 1];
        return {x: last.x, z: last.z, dx: 0, dz: 1};
    }
    // The relocation path of a lane, from spot `from`'s peek to the other spot's peek.
    function laneDashPath(lane, from) {
        const pts = [lane.spots[0].peek].concat(lane.dash || []).concat([lane.spots[1].peek]);
        return from === 1 ? pts.slice().reverse() : pts;
    }
    function zoneSamples(pad, step) {
        const out = [];
        for (let x = pad.minX; x <= pad.maxX + 1e-9; x += step) {
            for (let z = pad.minZ; z <= pad.maxZ + 1e-9; z += step) out.push({x, z});
        }
        return out;
    }

    // ------------------------------------------------------------------
    // Schedulers and the one pose source (§5)
    // ------------------------------------------------------------------

    // Deterministic squad rotation. Every soldier gets the same exposure per
    // period; offsets stagger them evenly. shiftMs moves one soldier only (debug).
    function strikeOpsSquadAt(i, n, tMs, cfg, shiftMs) {
        const sq = (cfg && cfg.squad) || STRIKE_OPS_CONFIG.squad;
        const period = sq.exposedMs + sq.hiddenMs + 2 * sq.slideMs;
        const count = Math.max(1, n || 1);
        const offset = sq.firstPeekMs + i * period / count + (shiftMs || 0);
        const rel = tMs - offset;
        const cycle = Math.floor(rel / period); // 0 = the first peek (−1 before it)
        const tp = ((rel % period) + period) % period;
        const every = Math.max(1, sq.relocateEvery || 1);
        const dashOn = !!sq.relocateEvery && sq.dashMs > 0;
        const cyc = Math.max(0, cycle);
        const dashCycle = dashOn && (cyc % every) === every - 1;
        const startSpot = dashOn ? Math.floor(cyc / every) % 2 : 0;
        const endSpot = dashCycle ? 1 - startSpot : startSpot;
        const base = {cycle, dashFrom: startSpot};
        if (tp < sq.slideMs) return Object.assign(base, {state: 'peek-out', spot: startSpot, move01: tp / sq.slideMs, exposure01: tp / sq.slideMs, tIn: tp});
        if (tp < sq.slideMs + sq.exposedMs) {
            const te = tp - sq.slideMs;
            if (dashCycle && te < sq.dashMs) return Object.assign(base, {state: 'dash', spot: endSpot, move01: te / sq.dashMs, exposure01: 1, tIn: te});
            return Object.assign(base, {state: 'exposed', spot: endSpot, move01: 1, exposure01: 1, tIn: dashCycle ? te - sq.dashMs : te});
        }
        if (tp < 2 * sq.slideMs + sq.exposedMs) {
            const k = (tp - sq.slideMs - sq.exposedMs) / sq.slideMs;
            return Object.assign(base, {state: 'peek-in', spot: endSpot, move01: k, exposure01: 1 - k, tIn: tp - sq.slideMs - sq.exposedMs});
        }
        return Object.assign(base, {state: 'hidden', spot: endSpot, move01: 0, exposure01: 0, tIn: tp - 2 * sq.slideMs - sq.exposedMs});
    }

    // Boss copies patrol their lane with constant-speed legs and pauses (cycle
    // 2·(walk + pause)), with a per-copy phase. `x` is the lateral offset from
    // the copy's lane point; a dissolved copy is never hittable.
    function strikeOpsBossAt(i, n, tMs, cfg, opts) {
        const b = (cfg && cfg.boss) || STRIKE_OPS_CONFIG.boss;
        const o = opts || {};
        if (o.dissolved) return {state: 'dissolved', x: 0, moving: false, dir: 0, hittable: false};
        const p = b.patrol, L = p.legM, cycle = 2 * (p.walkMs + p.pauseMs);
        const count = Math.max(1, n || 1);
        // every copy patrols in the same phase (identical clips: no visual tell),
        // starting mid-leg at its lane point at t = 0
        void count; void i;
        const t = (((tMs + p.walkMs / 2) % cycle) + cycle) % cycle;
        let x, moving = false, dir = 0;
        if (t < p.walkMs) { x = -L / 2 + L * t / p.walkMs; moving = true; dir = 1; }
        else if (t < p.walkMs + p.pauseMs) x = L / 2;
        else if (t < 2 * p.walkMs + p.pauseMs) { x = L / 2 - L * (t - p.walkMs - p.pauseMs) / p.walkMs; moving = true; dir = -1; }
        else x = -L / 2;
        return {state: 'exposed', x, moving, dir, hittable: true};
    }

    function yawToward(fx, fz, tx, tz) { return Math.atan2(tx - fx, tz - fz); }
    function lerpAngle(a, b, t) {
        let d = b - a;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        return a + d * Math.max(0, Math.min(1, t));
    }

    // The ONE pose source (§5): turns scheduler output into the drawn pose.
    // enemy: {kind: 'soldier'|'copy', index, n, lane, laneIndex, zone, shiftMs,
    //         dissolved, bossPoint, entry, approachMs (ms into the approach
    //         window, or null while engaging)}.
    // Returns zone-local {x, z, yaw, stance, opacity, hittable, state, spot,
    // moving, speed}. Rendering, hitboxes, LOS, lock-on, magnetism, plates, the
    // minimap and getEnemies() all read this, so reduced motion moves them together.
    function strikeOpsPoseAt(enemy, tMs, cfg, reducedMotion) {
        const c = cfg || STRIKE_OPS_CONFIG;
        const zone = enemy.zone || c.zones[0];
        const spawn = zone.anchor;
        const face = (x, z) => yawToward(x, z, spawn.x, spawn.z);
        if (enemy.approachMs != null) return strikeOpsApproachPose(enemy, enemy.approachMs, c, reducedMotion);
        if (enemy.kind === 'copy') {
            const bp = enemy.bossPoint;
            const st = strikeOpsBossAt(enemy.index, enemy.n, tMs, c, {dissolved: enemy.dissolved});
            const x = bp.x + (reducedMotion ? 0 : st.x);
            const moving = !reducedMotion && st.moving;
            const yaw = moving ? (st.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : face(x, bp.z);
            return {x, z: bp.z, yaw, stance: 'stand', opacity: enemy.dissolved ? 0 : 1, hittable: st.hittable, state: st.state, spot: 0, moving,
                speed: moving ? c.boss.patrol.legM / (c.boss.patrol.walkMs / 1000) : 0};
        }
        const lane = enemy.lane;
        const sq = strikeOpsSquadAt(enemy.index, enemy.n, tMs, c, enemy.shiftMs);
        const spot = lane.spots[sq.spot];
        let x = spot.peek.x, z = spot.peek.z, stance = 'stand', opacity = 1, moving = false, speed = 0;
        let yaw = face(x, z);
        const hittable = sq.state === 'exposed' || sq.state === 'dash';
        if (sq.state === 'hidden') {
            x = spot.hide.x; z = spot.hide.z; stance = 'crouch';
            yaw = face(x, z);
        } else if (sq.state === 'peek-out' || sq.state === 'peek-in') {
            const out = sq.state === 'peek-out';
            const d = Math.hypot(spot.peek.x - spot.hide.x, spot.peek.z - spot.hide.z);
            // reduced motion: a 120 ms step at the start of the unchanged window
            const k = reducedMotion ? (sq.tIn >= 120 ? 1 : sq.tIn / 120) : sq.move01;
            const a = out ? k : 1 - k; // 0 = hidden, 1 = at the peek
            x = spot.hide.x + (spot.peek.x - spot.hide.x) * a;
            z = spot.hide.z + (spot.peek.z - spot.hide.z) * a;
            if (reducedMotion) { x = out ? spot.peek.x : spot.hide.x; z = out ? spot.peek.z : spot.hide.z; }
            if (d >= c.moveLimits.inPlaceM && !reducedMotion && k > 0 && k < 1) {
                moving = true;
                speed = d / (c.squad.slideMs / 1000);
                yaw = out ? yawToward(spot.hide.x, spot.hide.z, spot.peek.x, spot.peek.z) : yawToward(spot.peek.x, spot.peek.z, spot.hide.x, spot.hide.z);
            }
            stance = a >= 0.5 ? 'stand' : 'crouch';
            if (reducedMotion) { stance = out ? 'stand' : 'crouch'; opacity = out ? k : 1 - k; }
        } else if (sq.state === 'dash') {
            const pts = laneDashPath(lane, sq.dashFrom);
            if (reducedMotion) {
                // the hitbox is at the destination from the dash's first frame
                const dest = lane.spots[sq.spot].peek;
                x = dest.x; z = dest.z; yaw = face(x, z);
                opacity = Math.min(1, sq.tIn / 120);
            } else {
                const p = pathPoint(pts, sq.move01);
                x = p.x; z = p.z; moving = true;
                speed = pathLength(pts) / (c.squad.dashMs / 1000);
                const travel = Math.atan2(p.dx, p.dz);
                const tLeft = c.squad.dashMs - sq.tIn;
                yaw = sq.tIn < 100 ? lerpAngle(face(pts[0].x, pts[0].z), travel, sq.tIn / 100) : travel;
                if (tLeft < 150) yaw = lerpAngle(face(x, z), travel, tLeft / 150);
            }
        }
        return {x, z, yaw, stance, opacity, hittable, state: sq.state, spot: sq.spot, moving, speed};
    }

    // Approach beat (the last approachMs of a transition, and all of deploying):
    // squad soldiers jog from their entry point into cover at run speed, arriving
    // at the end of the window; boss copies appear at centre stage, split and
    // glide to their lane points at run speed, then settle (§3, §5 boss).
    function strikeOpsApproachPose(enemy, ms, cfg, reducedMotion) {
        const c = cfg || STRIKE_OPS_CONFIG;
        const zone = enemy.zone || c.zones[0];
        const spawn = zone.anchor;
        const total = c.timing.approachMs;
        if (enemy.kind === 'copy') {
            const b = c.boss, bp = enemy.bossPoint, stage = zone.boss.stage;
            const startX = reducedMotion ? 0 : strikeOpsBossAt(enemy.index, enemy.n, 0, c).x;
            const target = {x: bp.x + startX, z: bp.z};
            if (reducedMotion) {
                // the split is a cross-fade: copies fade in at their lane points
                const k = Math.max(0, Math.min(1, (ms - b.appearMs) / b.splitMs));
                return {x: target.x, z: target.z, yaw: yawToward(target.x, target.z, spawn.x, spawn.z), stance: 'stand', opacity: k, hittable: false, state: 'split', spot: 0, moving: false, speed: 0};
            }
            if (ms < b.appearMs) {
                return {x: stage.x, z: stage.z, yaw: yawToward(stage.x, stage.z, spawn.x, spawn.z), stance: 'stand', opacity: Math.max(0, ms / b.appearMs), hittable: false, state: 'split', spot: 0, moving: false, speed: 0};
            }
            const from = strikeOpsSplitStart(stage, target, c);
            const d = Math.hypot(target.x - from.x, target.z - from.z);
            const glideMs = Math.min(b.splitMs, d / c.enemyModel.clipSpeeds.run * 1000);
            const k = glideMs > 0 ? Math.max(0, Math.min(1, (ms - b.appearMs) / glideMs)) : 1;
            const moving = k > 0 && k < 1;
            const x = from.x + (target.x - from.x) * k, z = from.z + (target.z - from.z) * k;
            const yaw = moving ? yawToward(from.x, from.z, target.x, target.z) : yawToward(x, z, spawn.x, spawn.z);
            return {x, z, yaw, stance: 'stand', opacity: 1, hittable: false, state: 'split', spot: 0, moving, speed: moving ? d / (glideMs / 1000) : 0};
        }
        const lane = enemy.lane;
        const entry = enemy.entry || zone.approach[enemy.laneIndex] || lane.spots[0].hide;
        // the first scheduler state decides where the soldier settles
        const first = strikeOpsSquadAt(enemy.index, enemy.n, 0, c, enemy.shiftMs);
        const dest = lane.spots[first.spot].hide;
        if (reducedMotion) {
            // enemies appear in cover without the jog
            return {x: dest.x, z: dest.z, yaw: yawToward(dest.x, dest.z, spawn.x, spawn.z), stance: 'crouch', opacity: ms >= total - 300 ? 1 : 0, hittable: false, state: 'hidden', spot: first.spot, moving: false, speed: 0};
        }
        const d = Math.hypot(dest.x - entry.x, dest.z - entry.z);
        const runMs = Math.min(total, d / c.enemyModel.clipSpeeds.run * 1000);
        const startAt = total - runMs;
        const k = runMs > 0 ? Math.max(0, Math.min(1, (ms - startAt) / runMs)) : 1;
        const moving = k > 0 && k < 1;
        const x = entry.x + (dest.x - entry.x) * k, z = entry.z + (dest.z - entry.z) * k;
        const yaw = moving ? yawToward(entry.x, entry.z, dest.x, dest.z) : yawToward(x, z, spawn.x, spawn.z);
        return {x, z, yaw, stance: k >= 1 ? 'crouch' : 'stand', opacity: ms < startAt ? 0 : 1, hittable: false, state: 'hidden', spot: first.spot, moving, speed: moving ? d / (runMs / 1000) : 0};
    }

    // Where a copy separates from the boss at the split: a burst out of the
    // boss's body, spreading at most splitSpreadM toward the copy's lane.
    function strikeOpsSplitStart(stage, target, cfg) {
        const spread = ((cfg || STRIKE_OPS_CONFIG).boss.splitSpreadM) || 0;
        const dx = target.x - stage.x;
        return {x: stage.x + Math.max(-spread, Math.min(spread, dx * 0.3)), z: stage.z};
    }

    // Round kind is decided from the visual round counter only (§2).
    function strikeOpsRoundKind(roundInZone, cfg, forced) {
        const c = cfg || STRIKE_OPS_CONFIG;
        return forced || roundInZone === c.zonePlan.bossRoundIndex ? 'boss' : 'squad';
    }
    // Counter advance for beginTransition (§2, rev 3): regroup inside a place;
    // after a place's boss round the place is cleared: roaming to the next
    // place, or the lap wrap (advancing, lap + 1) after the last place.
    function strikeOpsNextRound(counters, cfg) {
        const c = cfg || STRIKE_OPS_CONFIG;
        const plan = c.zonePlan;
        const cur = counters;
        const lap = cur.lap == null ? 1 : cur.lap;
        if (cur.roundInZone < plan.roundsPerZone - 1) {
            return {kind: 'regroup', roundNumber: cur.roundNumber + 1, roundInZone: cur.roundInZone + 1, zoneNumber: cur.zoneNumber, zoneIndex: cur.zoneIndex, lap};
        }
        const zoneIndex = (cur.zoneIndex + 1) % plan.zones.length;
        const wrap = zoneIndex === 0;
        return {kind: wrap ? 'advancing' : 'roaming', roundNumber: cur.roundNumber + 1, roundInZone: 0, zoneNumber: cur.zoneNumber + 1, zoneIndex, lap: wrap ? lap + 1 : lap};
    }

    // Per-place squad style (§5.1 flavour, cosmetic): clips and foam frequency
    // only, the same for every enemy of the round; never a pose, hitbox,
    // timing or exposure window. 'shoot' widens the volley window.
    function strikeOpsSquadStyle(zone) {
        const s = (zone && zone.flavor && zone.flavor.squadStyle) || {};
        const shoot = s.exposedIdle === 'shoot';
        return {exposedIdle: s.exposedIdle || 'aim', volleyChance: s.volleyChance == null ? 0.5 : s.volleyChance,
            firstPeekGesture: s.firstPeekGesture || null, volleyFrom: shoot ? 800 : 1300, volleyTo: shoot ? 3000 : 2300, bossSpotlight: !!s.bossSpotlight};
    }
    // Deterministic per (cycle, soldier) volley draw against the place's chance.
    function strikeOpsVolley(style, cycle, index) {
        let h = ((cycle + 1) * 73856093) ^ ((index + 1) * 19349663);
        h = (h ^ (h >>> 13)) >>> 0;
        return (h % 1000) / 1000 < style.volleyChance;
    }

    // Hip framing derived from the canvas aspect (§5 framing), in degrees.
    function strikeOpsHipFov(width, height, cfg) {
        const f = (cfg || STRIKE_OPS_CONFIG).framing;
        const rad = Math.PI / 180;
        const a = Math.max(0.05, width / Math.max(1, height));
        const want = 2 * Math.atan(Math.tan(f.hipHalfHFovDeg * rad) / a) / rad;
        const vfov = Math.max(f.minVFovDeg, Math.min(f.maxVFovDeg, want));
        const hHalf = Math.atan(Math.tan(vfov / 2 * rad) * a) / rad;
        const adsVfov = 2 * Math.atan(Math.tan(vfov / 2 * rad) / f.adsZoom) / rad;
        return {vfov, hHalf, adsVfov};
    }

    // ------------------------------------------------------------------
    // Nameplate layout (§6): order-preserving clamp and de-overlap
    // ------------------------------------------------------------------

    // plates: [{x, y, w, h}] in index (= lane, left-to-right) order, where (x, y)
    // is the anchor (centre-bottom) in px. safe: {left, top, right, bottom}.
    // Returns {positions: [{left, top, w, h, tier, pin}], tiers, collapsed}.
    function strikeOpsLayoutPlates(plates, safe, cfg, opts) {
        const o = opts || {};
        const np = (cfg || STRIKE_OPS_CONFIG).nameplate;
        const gap = np.minGapPx;
        const list = plates || [];
        const sweep = (items, tierOf, tops) => {
            // left-to-right push, then right-to-left pull back inside the rectangle
            const out = items.map((p, i) => {
                const w = p.w, h = p.h;
                let left = p.x - w / 2;
                left = Math.max(safe.left, Math.min(safe.right - w, left));
                const pin = p.x < safe.left ? -1 : (p.x > safe.right ? 1 : 0);
                return {left, top: tops[i], w, h, tier: tierOf(i), pin};
            });
            [0, 1].forEach(tier => {
                const idx = out.map((o, i) => i).filter(i => out[i].tier === tier);
                for (let k = 1; k < idx.length; k++) {
                    const a = out[idx[k - 1]], b = out[idx[k]];
                    b.left = Math.max(b.left, a.left + a.w + gap);
                }
                for (let k = idx.length - 1; k >= 0; k--) {
                    const b = out[idx[k]];
                    if (b.left + b.w > safe.right) b.left = safe.right - b.w;
                    if (k > 0) {
                        const a = out[idx[k - 1]];
                        if (a.left + a.w + gap > b.left) a.left = b.left - gap - a.w;
                    }
                }
            });
            // horizontal order across tiers equals index order
            for (let i = 1; i < out.length; i++) if (out[i].left <= out[i - 1].left) out[i].left = out[i - 1].left + 1;
            return out;
        };
        const fits = out => {
            for (let i = 0; i < out.length; i++) {
                const a = out[i];
                if (a.left < safe.left - 0.5 || a.left + a.w > safe.right + 0.5 || a.top < safe.top - 0.5 || a.top + a.h > safe.bottom + 0.5) return false;
                for (let j = i + 1; j < out.length; j++) {
                    const b = out[j];
                    const sepX = a.left + a.w + gap <= b.left + 0.01 || b.left + b.w + gap <= a.left + 0.01;
                    const sepY = a.top + a.h + gap <= b.top + 0.01 || b.top + b.h + gap <= a.top + 0.01;
                    if (!sepX && !sepY) return false;
                }
            }
            return true;
        };
        const clampTop = (top, h) => Math.max(safe.top, Math.min(safe.bottom - h, top));
        if (!list.length) return {positions: [], tiers: 1, collapsed: false};
        // 1. one tier (skipped for enlarged text, which staggers first)
        if (o.forceCollapsed !== true && (!o.preferTiers || o.oneTier)) {
            const one = sweep(list, () => 0, list.map(p => clampTop(p.y - p.h, p.h)));
            if (fits(one) || o.oneTier) return {positions: one, tiers: 1, collapsed: false, fits: fits(one)};
        }
        // 2. two staggered tiers: odd indices tierOffsetPx + the taller plate lower
        const tallest = Math.max.apply(null, list.map(p => p.h));
        const baseTop = list.map(p => p.y - p.h);
        const upper = Math.max(safe.top, Math.min.apply(null, baseTop.filter((t, i) => i % 2 === 0).concat([Infinity])) - 0);
        const tops2 = list.map((p, i) => {
            const top = i % 2 === 0 ? Math.min(baseTop[i], upper) : Math.max(baseTop[i], upper + tallest + np.tierOffsetPx);
            return i % 2 === 0 ? Math.max(safe.top, top) : Math.min(safe.bottom - p.h, top);
        });
        const two = sweep(list, i => i % 2, tops2);
        if (o.forceCollapsed !== true && (fits(two) || o.forceCollapsed === false)) return {positions: two, tiers: 2, collapsed: false, fits: fits(two)};
        // 3. markers (number + shape + tint); the answer list carries the full text
        const m = np.markerPx;
        const marks = list.map(p => ({x: p.x, y: p.y, w: m, h: m}));
        let mk = sweep(marks, () => 0, marks.map(p => clampTop(p.y - m, m)));
        if (!fits(mk)) mk = sweep(marks, i => i % 2, marks.map((p, i) => i % 2 ? clampTop(p.y - m, m) : clampTop(p.y - 2 * m - np.tierOffsetPx / 2, m)));
        return {positions: mk, tiers: mk.some(p => p.tier === 1) ? 2 : 1, collapsed: true};
    }

    // ------------------------------------------------------------------
    // Bidirectional text runs (§8)
    // ------------------------------------------------------------------

    const HEB = /[֐-׿יִ-ﭏ]/;
    const LTR_STRONG = /[A-Za-z0-9À-ɏ]/;
    function stripTags(html) { return String(html == null ? '' : html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim(); }

    // Learning strings reach the game as text or as the engine's render()
    // markup: <img class src alt loading>, and audio / speech prompts rendered
    // as <button class="audio-prompt" onclick="audio('…')"> with a material
    // icon or the spoken text inside. strikeOpsSafeHtml() re-emits only that
    // vocabulary (plus simple inline formatting): text is escaped, every other
    // tag is dropped (script-like ones with their content), attributes are
    // allow-listed per tag (no on*, style or href), image URLs must be
    // relative, http(s), blob or data:image, and an audio prompt's inline
    // handler is replaced by data-so-audio / data-so-say, which the component
    // plays from a Vue-bound click (playRichAudio). mode 'answer' renders the
    // prompt as an inert span, since answers already sit inside a button.
    const SAFE_INLINE_TAGS = {b: 1, strong: 1, i: 1, em: 1, u: 1, s: 1, sub: 1, sup: 1, small: 1, mark: 1, span: 1, bdi: 1, br: 1, img: 1, button: 1};
    const SAFE_VOID_TAGS = {br: 1, img: 1};
    const DROP_CONTENT_TAGS = {script: 1, style: 1, iframe: 1, object: 1, embed: 1, template: 1, textarea: 1, title: 1, noscript: 1, xmp: 1, noembed: 1, noframes: 1, select: 1, svg: 1, math: 1};
    const HTML_ENTITIES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'"};
    function decodeEntities(s) {
        return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
            const k = e.toLowerCase();
            if (k[0] === '#') {
                const code = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
                return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
            }
            return Object.prototype.hasOwnProperty.call(HTML_ENTITIES, k) ? HTML_ENTITIES[k] : m;
        });
    }
    function escapeHtmlText(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function escapeHtmlAttr(s) { return escapeHtmlText(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    // Text between tags keeps its entities (they render as text, never markup).
    function escapeHtmlSource(s) { return String(s).replace(/&(?!(?:#x[0-9a-f]+|#\d+|[a-z]+\d*);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function strikeOpsSafeUrl(url, imageOnly) {
        const raw = String(url == null ? '' : url).trim();
        // Browsers ignore tabs/newlines/controls inside a scheme ("java\tscript:").
        const probe = raw.replace(/[\u0000- \u007f-\u009f]/g, '').toLowerCase();
        const scheme = probe.match(/^([a-z][a-z0-9+.-]*):/);
        if (!scheme) return probe.startsWith('//') ? 'https:' + raw : raw;
        if (scheme[1] === 'http' || scheme[1] === 'https' || scheme[1] === 'blob') return raw;
        if (scheme[1] === 'data' && imageOnly && /^data:image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)[;,]/.test(probe)) return raw;
        if (scheme[1] === 'data' && !imageOnly && /^data:audio\//.test(probe)) return raw;
        return '';
    }
    function parseHtmlAttrs(src) {
        const attrs = {};
        const re = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
        let m;
        while ((m = re.exec(src))) {
            const name = m[1].toLowerCase();
            if (Object.prototype.hasOwnProperty.call(attrs, name)) continue;
            const v = m[2] != null ? m[2] : (m[3] != null ? m[3] : (m[4] != null ? m[4] : ''));
            attrs[name] = decodeEntities(v);
        }
        return attrs;
    }
    // The engine's prompt handler: audio('url') or text_to_speech('text'),
    // a single-quoted string with backslash escapes (escapeInlineJsString).
    function parseAudioHandler(code) {
        const m = String(code || '').match(/^\s*(audio|text_to_speech)\s*\(\s*'((?:[^'\\]|\\.)*)'\s*\)\s*;?\s*$/);
        if (!m) return null;
        const value = m[2].replace(/\\(.)/g, '$1');
        if (m[1] === 'audio') { const url = strikeOpsSafeUrl(value, false); return url ? {kind: 'audio', value: url} : null; }
        return {kind: 'say', value};
    }
    function safeClass(v) { return String(v || '').split(/\s+/).filter(c => /^[A-Za-z_][\w-]*$/.test(c)).join(' '); }
    function strikeOpsSafeHtml(html, mode) {
        const s = String(html == null ? '' : html);
        const answer = mode === 'answer';
        const tagRe = /<!--[\s\S]*?(?:-->|$)|<![^>]*>?|<\?[^>]*>?|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?\s*>/g;
        const out = [], open = [];
        let last = 0, drop = null, m;
        const emitText = t => { if (!drop && t) out.push(escapeHtmlSource(t)); };
        while ((m = tagRe.exec(s))) {
            emitText(s.slice(last, m.index));
            last = tagRe.lastIndex;
            if (!m[2]) continue;                                   // comment, doctype, processing instruction
            const closing = m[1] === '/', tag = m[2].toLowerCase();
            if (drop) { if (closing && tag === drop) drop = null; continue; }
            if (DROP_CONTENT_TAGS[tag]) { if (!closing) drop = tag; continue; }
            if (!SAFE_INLINE_TAGS[tag]) continue;                  // unknown wrapper: keep its text only
            const outTag = tag === 'button' ? (answer ? 'span' : 'button') : tag;
            if (closing) {
                const at = open.lastIndexOf(tag);
                if (at < 0) continue;
                while (open.length > at) { const t = open.pop(); out.push('</' + (t === 'button' ? (answer ? 'span' : 'button') : t) + '>'); }
                continue;
            }
            const a = parseHtmlAttrs(m[3] || '');
            const keep = [];
            const cls = safeClass(a.class);
            if (tag === 'img') {
                const src = strikeOpsSafeUrl(a.src, true);
                if (!src) continue;
                keep.push(['src', src], ['alt', a.alt || '']);
                if (cls) keep.push(['class', cls]);
                if (a.loading === 'lazy' || a.loading === 'eager') keep.push(['loading', a.loading]);
                for (const k of ['width', 'height']) if (/^\d{1,4}$/.test(a[k] || '')) keep.push([k, a[k]]);
            } else if (tag === 'button') {
                const handler = parseAudioHandler(a.onclick);
                if (answer) keep.push(['class', 'so-opt-audio']);
                else {
                    keep.push(['type', 'button'], ['class', cls || 'audio-prompt']);
                    if (handler) keep.push([handler.kind === 'audio' ? 'data-so-audio' : 'data-so-say', handler.value]);
                    if (a['aria-label']) keep.push(['aria-label', a['aria-label']]);
                }
            } else {
                if (cls) keep.push(['class', cls]);
                if (/^(ltr|rtl|auto)$/.test(a.dir || '')) keep.push(['dir', a.dir]);
                if (/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(a.lang || '')) keep.push(['lang', a.lang]);
                if (a['aria-hidden'] === 'true') keep.push(['aria-hidden', 'true']);
            }
            out.push('<' + outTag + keep.map(([k, v]) => ' ' + k + '="' + escapeHtmlAttr(v) + '"').join('') + '>');
            if (!SAFE_VOID_TAGS[tag]) open.push(tag);
        }
        emitText(s.slice(last));
        while (open.length) { const t = open.pop(); out.push('</' + (t === 'button' ? (answer ? 'span' : 'button') : t) + '>'); }
        return out.join('');
    }
    // Direction from the first strong letter, like dir="auto", but explicit.
    function textDirection(html) {
        const text = stripTags(html);
        const m = text.match(/[A-Za-zÀ-ɏ֐-׿יִ-ﭏ]/);
        if (!m) return 'auto';
        return HEB.test(m[0]) ? 'rtl' : 'ltr';
    }
    // Splits plain text into runs; every run whose strong direction differs from
    // the base is isolated (rendered in <bdi dir>). An isolate spans from the
    // first to the last opposite-direction strong character, so neutrals inside
    // it (spaces between English words, `+` in `3+4`) stay with it, while the
    // sentence's own punctuation around it (`?` ending a Hebrew sentence, quotes,
    // brackets) stays outside and follows the base direction: in an RTL banner,
    // `מה פירוש המילה: apple?` keeps its `?` at the end of the Hebrew sentence.
    function strikeOpsBidiRuns(text, baseDir) {
        const s = String(text == null ? '' : text);
        if (/<[a-z!/]/i.test(s)) return [{text: s, isolate: null, html: true}];
        const base = baseDir === 'ltr' ? 'ltr' : 'rtl';
        const opposite = base === 'rtl' ? (ch => LTR_STRONG.test(ch)) : (ch => HEB.test(ch));
        const same = base === 'rtl' ? (ch => HEB.test(ch)) : (ch => /[A-Za-zÀ-ɏ]/.test(ch));
        const runs = [];
        let i = 0, plain = '';
        while (i < s.length) {
            if (!opposite(s[i])) { plain += s[i]; i += 1; continue; }
            // extend to the last opposite strong char before any base-direction strong char
            let j = i, last = i;
            while (j < s.length && !same(s[j])) { if (opposite(s[j])) last = j; j += 1; }
            if (plain) { runs.push({text: plain, isolate: null}); plain = ''; }
            runs.push({text: s.slice(i, last + 1), isolate: base === 'rtl' ? 'ltr' : 'rtl'});
            i = last + 1;
        }
        if (plain) runs.push({text: plain, isolate: null});
        if (!runs.length) runs.push({text: '', isolate: null});
        return runs;
    }

    // ------------------------------------------------------------------
    // Lane order, move speeds and validation (§5)
    // ------------------------------------------------------------------

    // Every horizontal "lane point" of lane k (spots, the dash path sampled every
    // 0.25 m, the boss point ± patrol). Nameplate anchors share these x/z.
    function laneHorizontalPoints(zone, k, cfg) {
        const c = cfg || STRIKE_OPS_CONFIG;
        const lane = zone.lanes[k];
        const pts = [];
        lane.spots.forEach(s => { pts.push(s.hide, s.peek); });
        const path = laneDashPath(lane, 0);
        const len = pathLength(path);
        const steps = Math.max(2, Math.ceil(len / 0.25));
        for (let i = 0; i <= steps; i++) pts.push(pathPoint(path, i / steps));
        const bp = zone.boss && zone.boss.points[k];
        if (bp) {
            const half = c.boss.patrol.legM / 2;
            pts.push({x: bp.x - half, z: bp.z}, bp, {x: bp.x + half, z: bp.z});
        }
        return pts.map(p => ({x: p.x, z: p.z}));
    }
    // Lane-order invariant: from every sample (0.5 m grid) of the region —
    // the core (6° gate) or the whole fight box (4° gate, rev 3) — the
    // horizontal view angles of lane k's points are all strictly left of lane
    // k+1's with a gap ≥ minGapDeg. Screen x is monotonic in the view angle for
    // every point in front of the camera, so yaw cannot reorder them.
    function strikeOpsLaneOrderOk(zone, cfg, minGapDeg, region) {
        const c = cfg || STRIKE_OPS_CONFIG;
        const gapDeg = minGapDeg == null ? 6 : minGapDeg;
        const eyes = zoneSamples(region === 'fightBox' ? zone.fightBox : zone.core, 0.5);
        const lanes = zone.lanes.map((l, k) => laneHorizontalPoints(zone, k, c));
        let minGap = Infinity, worst = null;
        eyes.forEach(e => {
            const ranges = lanes.map(pts => {
                let lo = Infinity, hi = -Infinity;
                pts.forEach(p => {
                    const a = Math.atan2(p.x - e.x, p.z - e.z) * 180 / Math.PI;
                    lo = Math.min(lo, a); hi = Math.max(hi, a);
                });
                return {lo, hi};
            });
            for (let k = 1; k < ranges.length; k++) {
                const g = ranges[k].lo - ranges[k - 1].hi;
                if (g < minGap) { minGap = g; worst = {eye: e, lane: k - 1}; }
            }
        });
        return {ok: minGap >= gapDeg - 1e-9, minGapDeg: minGap, worst};
    }

    // Ground speed and chosen locomotion clip of every authored move (§5).
    function strikeOpsMoveSpeeds(zone, cfg) {
        const c = cfg || STRIKE_OPS_CONFIG;
        const em = c.enemyModel, lim = c.moveLimits, run = em.clipSpeeds.run;
        const moves = [];
        const add = (what, dist, v) => {
            if (dist < lim.inPlaceM) return;
            const role = v <= lim.moveMaxSpeed ? 'move' : 'run';
            const ts = v / em.clipSpeeds[role];
            moves.push({what, dist, speed: v, role, timeScale: ts, ok: ts >= lim.minTimeScale - 1e-9 && ts <= lim.maxTimeScale + 1e-9});
        };
        zone.lanes.forEach((lane, k) => {
            lane.spots.forEach((s, j) => {
                const d = Math.hypot(s.peek.x - s.hide.x, s.peek.z - s.hide.z);
                add('lane ' + k + ' spot ' + j + ' peek slide', d, d / (c.squad.slideMs / 1000));
            });
            const L = pathLength(laneDashPath(lane, 0));
            add('lane ' + k + ' dash', L, L / (c.squad.dashMs / 1000));
            const entry = zone.approach[k];
            lane.spots.forEach((s, j) => {
                const d = Math.hypot(s.hide.x - entry.x, s.hide.z - entry.z);
                add('lane ' + k + ' approach jog to spot ' + j, d, Math.max(run, d / (c.timing.approachMs / 1000)));
            });
            const bp = zone.boss.points[k];
            const st = zone.boss.stage;
            [-1, 0, 1].forEach(s => {
                const target = {x: bp.x + s * c.boss.patrol.legM / 2, z: bp.z};
                const from = strikeOpsSplitStart(st, target, c);
                const d = Math.hypot(target.x - from.x, target.z - from.z);
                add('lane ' + k + ' boss split glide', d, Math.max(run, d / (c.boss.splitMs / 1000)));
            });
        });
        add('boss patrol leg', c.boss.patrol.legM, c.boss.patrol.legM / (c.boss.patrol.walkMs / 1000));
        return moves;
    }

    const REQUIRED_ROLES = ['idle', 'move', 'shoot', 'hit', 'down'];
    const OPTIONAL_ROLES = ['aim', 'crouch', 'run', 'cheer'];

    // opts.quick skips the expensive map checks (the pre-clear flood fills
    // and routing from every reachable cell); the Node tests run the full set.
    function validateStrikeOpsConfig(cfg, opts) {
        const c = cfg || STRIKE_OPS_CONFIG;
        const o = opts || {};
        const errors = [];
        const sq = c.squad || {}, tm = c.timing || {}, aim = c.aim || {}, mv = c.movement || {}, b = c.boss || {}, kd = c.knockdown || {};
        const fr = c.framing || {};
        // timings
        if (!(sq.exposedMs >= 3000 && sq.exposedMs <= 5000)) errors.push('squad.exposedMs must be within 3–5 s');
        if (!(sq.hiddenMs >= 1000 && sq.hiddenMs <= 2000)) errors.push('squad.hiddenMs must be within 1–2 s');
        if (!(sq.slideMs > 0 && sq.slideMs <= 600)) errors.push('squad.slideMs must be within (0, 600] ms');
        if (!(sq.firstPeekMs >= 0 && sq.firstPeekMs <= 400)) errors.push('the first peek must start within 0.4 s');
        if (!(sq.dashMs >= 0 && sq.dashMs < sq.exposedMs)) errors.push('squad.dashMs must fit inside the exposed window');
        ['retryLockMs', 'correctToTransitionMs', 'regroupMs', 'advanceMs', 'approachMs', 'domCrossFadeMs'].forEach(k => { if (!(tm[k] > 0)) errors.push('timing.' + k + ' must be positive'); });
        if (!(tm.regroupMs >= tm.approachMs + 300) || !(tm.advanceMs >= tm.approachMs + 300)) errors.push('regroupMs and advanceMs must be ≥ approachMs + 300 ms');
        if (!(b.appearMs + b.splitMs + b.settleMs <= tm.approachMs)) errors.push('the boss split (appear + split + settle) must fit the approach window');
        if (!(b.flickerMs + b.dissolveMs <= tm.retryLockMs - 100)) errors.push('the decoy flicker + dissolve must end 100 ms before the retry unlock');
        if (!(kd.fadeStartMs + kd.fadeMs <= tm.correctToTransitionMs + tm.regroupMs - tm.approachMs)) errors.push('the knockdown fade must end before the incoming approach');
        // enemy model roles
        const clips = (c.enemyModel && c.enemyModel.clips) || {};
        REQUIRED_ROLES.forEach(r => { if (!(r in clips)) errors.push('enemyModel.clips is missing the required role ' + r); });
        Object.keys(clips).forEach(r => { if (REQUIRED_ROLES.indexOf(r) === -1 && OPTIONAL_ROLES.indexOf(r) === -1) errors.push('enemyModel.clips has an unknown role ' + r); });
        // zone plan: exactly the map's places, in map order
        const ids = (c.zones || []).map(z => z.id);
        if (!c.zonePlan || !Array.isArray(c.zonePlan.zones) || !c.zonePlan.zones.length) errors.push('zonePlan.zones must name at least one place');
        else {
            c.zonePlan.zones.forEach(id => { if (ids.indexOf(id) === -1) errors.push('zonePlan names a missing place ' + id); });
            if (c.zonePlan.zones.join() !== ids.join()) errors.push('zonePlan.zones must list the places in map order');
        }
        if (c.zonePlan && !(c.zonePlan.bossRoundIndex >= 0 && c.zonePlan.bossRoundIndex < c.zonePlan.roundsPerZone)) errors.push('zonePlan.bossRoundIndex must be a round of the place');
        const eye = mv.eye || 1.6;
        const body = aim.body, crouch = aim.crouchBody || aim.body, hit = aim.hitbox;
        const r = mv.radius || 0.3;
        let headingsOk = true;
        const arenaSeen = new Map();
        (c.zones || []).forEach(zone => {
            const tag = 'zone ' + zone.id + ': ';
            const h = zone.headingDeg || 0;
            if (Math.abs(h / 90 - Math.round(h / 90)) > 1e-9) { errors.push(tag + 'headingDeg must be a multiple of 90°'); headingsOk = false; }
            const fb = zone.fightBox, core = zone.core;
            const boxes = (zone.cover || []).map(strikeOpsCoverBox);
            const fbR = {minX: fb.minX - r, maxX: fb.maxX + r, minZ: fb.minZ - r, maxZ: fb.maxZ + r};
            const region = zone.region;
            const inRegion = p => { const m = strikeOpsArenaToMap(zone, p.x, p.z); return inRect(m, region, 1e-9); };
            if (!inRegion({x: fb.minX, z: fb.minZ}) || !inRegion({x: fb.maxX, z: fb.maxZ})) errors.push(tag + 'the fight box leaves the place region');
            if (!(core.minX >= fb.minX && core.maxX <= fb.maxX && core.minZ >= fb.minZ && core.maxZ <= fb.maxZ)) errors.push(tag + 'the core must lie inside the fight box');
            if (!zone.anchor || !inRect(zone.anchor, fb)) errors.push(tag + 'the anchor must lie inside the fight box');
            const fbMap = strikeOpsRectToMap(zone, fb), ez = zone.enemyZone;
            if (ez && overlap2d(inflateRect(fbMap, r - 1e-9), ez)) errors.push(tag + 'the fight box must lie outside the enemyZone by at least the radius');
            boxes.forEach((bx, i) => {
                if (!inRegion({x: bx.minX, z: bx.minZ}) || !inRegion({x: bx.maxX, z: bx.maxZ})) errors.push(tag + 'cover ' + i + ' leaves the place region');
                if (overlap2d(bx, fbR)) errors.push(tag + 'cover ' + i + ' intersects the fight box');
            });
            if (!Array.isArray(zone.coverKinds) || zone.coverKinds.length !== (zone.cover || []).length) errors.push(tag + 'coverKinds must name one kind per cover box');
            if (!Array.isArray(zone.lanes) || zone.lanes.length !== STRIKE_OPS_MAX_LANES) { errors.push(tag + 'exactly ' + STRIKE_OPS_MAX_LANES + ' lanes are required'); return; }
            for (let n = 1; n <= STRIKE_OPS_MAX_LANES; n++) {
                const set = zone.laneSets && zone.laneSets[n];
                if (!Array.isArray(set) || set.length !== n || set.some((v, i) => v < 0 || v >= STRIKE_OPS_MAX_LANES || (i > 0 && v <= set[i - 1]))) errors.push(tag + 'laneSets[' + n + '] must list ' + n + ' ascending lanes');
            }
            const bnd = [];
            zone.lanes.forEach((lane, k) => (lane.spots || []).forEach((s, j) => { if (!inRegion(s.hide) || !inRegion(s.peek)) bnd.push(k + '.' + j); }));
            if (bnd.length) errors.push(tag + 'lane points leave the place region');
            // the arena-local checks below depend only on the arena data: places
            // sharing an arena (LINE4) reuse the first place's result
            const arenaKey = JSON.stringify([zone.core, zone.anchor, zone.fightBox, (zone.cover || []).map(cv => [cv.x, cv.z, cv.w, cv.d, cv.h]), zone.lanes, zone.boss, zone.approach, zone.props]);
            if (arenaSeen.has(arenaKey)) { arenaSeen.get(arenaKey).forEach(e => errors.push(tag + e)); return; }
            const before = errors.length;
            const coreEyes = zoneSamples(core, 0.5).map(e => ({x: e.x, y: eye, z: e.z}));
            const fightEyes = zoneSamples(fb, 0.5).map(e => ({x: e.x, y: eye, z: e.z}));
            const torsoClear = p => fightEyes.every(e => !strikeOpsSegmentBlocked(e, {x: p.x, y: hit.centerY, z: p.z}, boxes));
            const occl = [], los = [], inside = [];
            zone.lanes.forEach((lane, k) => {
                if (!Array.isArray(lane.spots) || lane.spots.length !== 2) { errors.push(tag + 'lane ' + k + ' needs two cover spots'); return; }
                lane.spots.forEach((s, j) => {
                    const hb = boxAt(s.hide.x, s.hide.z, crouch);
                    const corners = [];
                    [hb.minX, (hb.minX + hb.maxX) / 2, hb.maxX].forEach(x => [hb.minZ, hb.maxZ].forEach(z => [0.05, crouch.h / 2, crouch.h].forEach(y => corners.push({x, y, z}))));
                    if (!coreEyes.every(e => corners.every(p => strikeOpsSegmentBlocked(e, p, boxes)))) occl.push(k + '.' + j);
                    if (!torsoClear(s.peek)) los.push(k + '.' + j + ' peek');
                    [s.hide, s.peek].forEach(p => {
                        if (boxes.some(bx => overlap2d(bx, boxAt(p.x, p.z, body)))) inside.push(k + '.' + j);
                    });
                });
                const path = laneDashPath(lane, 0);
                const len = pathLength(path), steps = Math.max(2, Math.ceil(len / 0.2));
                for (let i = 0; i <= steps; i++) {
                    const p = pathPoint(path, i / steps);
                    if (boxes.some(bx => overlap2d(bx, boxAt(p.x, p.z, body)))) { inside.push(k + ' dash'); break; }
                }
                (lane.dash || []).forEach((p, i) => { if (!torsoClear(p)) los.push(k + ' dash ' + i); });
                for (let i = 0; i <= steps; i++) { const p = pathPoint(path, i / steps); if (!torsoClear(p)) { los.push(k + ' dash path'); break; } }
                const bp = zone.boss && zone.boss.points[k];
                if (!bp) { errors.push(tag + 'boss point ' + k + ' is missing'); return; }
                [-1, 0, 1].forEach(sgn => {
                    const p = {x: bp.x + sgn * b.patrol.legM / 2, z: bp.z};
                    if (!torsoClear(p)) los.push(k + ' boss');
                    if (boxes.some(bx => overlap2d(bx, boxAt(p.x, p.z, body)))) inside.push(k + ' boss');
                });
            });
            if (occl.length) errors.push(tag + 'hide points are not fully occluded from the core: ' + occl.join(', '));
            if (los.length) errors.push(tag + 'points lack clear line of sight from the fight box: ' + Array.from(new Set(los)).join(', '));
            if (inside.length) errors.push(tag + 'enemy positions intersect cover: ' + Array.from(new Set(inside)).join(', '));
            // lane order: 4° from every fight-box sample, 6° from every core sample
            const order = strikeOpsLaneOrderOk(zone, c, 4, 'fightBox');
            if (!order.ok) errors.push(tag + 'lane order: lanes must stay left-to-right with a 4° gap from every fight-box point (min ' + order.minGapDeg.toFixed(1) + '°)');
            const orderCore = strikeOpsLaneOrderOk(zone, c, 6, 'core');
            if (!orderCore.ok) errors.push(tag + 'lane order: lanes must stay left-to-right with a 6° gap from every core point (min ' + orderCore.minGapDeg.toFixed(1) + '°)');
            // framing from the anchor facing the heading; distance from the fight box
            const framingBad = [], farBad = [];
            zone.lanes.forEach((lane, k) => {
                laneHorizontalPoints(zone, k, c).forEach(p => {
                    const dx = p.x - zone.anchor.x, dz = p.z - zone.anchor.z;
                    const ang = Math.abs(Math.atan2(dx, dz)) * 180 / Math.PI;
                    const dist = Math.hypot(dx, dz);
                    if (ang > fr.laneMaxAngleDeg + 1e-9 || dist > fr.laneMaxDistM + 1e-9) framingBad.push(k);
                    if (fightEyes.some(e => Math.hypot(p.x - e.x, p.z - e.z) > fr.fightMaxDistM + 1e-9)) farBad.push(k);
                });
            });
            if (framingBad.length) errors.push(tag + 'framing: lanes ' + Array.from(new Set(framingBad)).join(', ') + ' leave ±' + fr.laneMaxAngleDeg + '° / ' + fr.laneMaxDistM + ' m from the anchor');
            if (farBad.length) errors.push(tag + 'framing: lanes ' + Array.from(new Set(farBad)).join(', ') + ' lie beyond ' + fr.fightMaxDistM + ' m from the fight box');
            // nameplate anchor spacing (same-kind anchors of adjacent lanes)
            for (let k = 1; k < zone.lanes.length; k++) {
                const a = zone.lanes[k - 1], bL = zone.lanes[k];
                const pairs = [[a.spots[0].peek, bL.spots[0].peek], [a.spots[1].peek, bL.spots[1].peek], [zone.boss.points[k - 1], zone.boss.points[k]]];
                if (pairs.some(p => p[1].x - p[0].x < 2.0 - 1e-9)) { errors.push(tag + 'nameplate anchors of lanes ' + (k - 1) + ' and ' + k + ' must be ≥ 2.0 m apart'); }
            }
            // arena props off every fight-box→enemy sightline
            const targets = [];
            zone.lanes.forEach((lane, k) => laneHorizontalPoints(zone, k, c).forEach(p => targets.push({x: p.x, y: hit.centerY, z: p.z})));
            const propBoxes = (zone.props || []).filter(p => p.w && p.d && p.h).map(p => ({kind: p.kind, box: {minX: p.x - p.w / 2, maxX: p.x + p.w / 2, minY: p.y || 0, maxY: (p.y || 0) + p.h, minZ: p.z - p.d / 2, maxZ: p.z + p.d / 2}}));
            const crossing = propBoxes.filter(pb => fightEyes.some(e => targets.some(t => strikeOpsSegmentBlocked(e, t, [pb.box]))));
            if (crossing.length) errors.push(tag + 'props cross a fight-box→enemy sightline: ' + crossing.map(p => p.kind).join(', '));
            // foot-slide bound for every authored move
            const bad = strikeOpsMoveSpeeds(zone, c).filter(m => !m.ok);
            if (bad.length) errors.push(tag + 'foot slide: ' + bad.map(m => m.what + ' ' + m.speed.toFixed(2) + ' m/s (' + m.role + ' ×' + m.timeScale.toFixed(2) + ')').join('; '));
            if (!Array.isArray(zone.approach) || zone.approach.length !== STRIKE_OPS_MAX_LANES) errors.push(tag + 'one approach entry per lane is required');
            arenaSeen.set(arenaKey, errors.slice(before).map(e => e.slice(tag.length)));
        });
        if (c.map && headingsOk) validateStrikeOpsMap(c, errors, o);
        else if (!c.map) errors.push('map is required');
        return errors;
    }

    // The map checks of §5.1 (rev 3.1), appended to `errors`.
    function validateStrikeOpsMap(c, errors, o) {
        const M = c.map, zones = c.zones || [], r = c.movement.radius;
        const B = M.bounds, P = M.playBounds;
        const within = (q, R) => q.minX >= R.minX - 1e-9 && q.maxX <= R.maxX + 1e-9 && q.minZ >= R.minZ - 1e-9 && q.maxZ <= R.maxZ + 1e-9;
        const fmt = p => '(' + (+p.x.toFixed(2)) + ', ' + (+p.z.toFixed(2)) + ')';
        if (!within(P, B)) errors.push('map: playBounds must lie inside bounds');
        zones.forEach((z, i) => {
            if (!within(z.region, P)) errors.push('map: the region of ' + z.id + ' leaves playBounds');
            for (let j = i + 1; j < zones.length; j++) if (overlap2d(z.region, zones[j].region)) errors.push('map: the regions of ' + z.id + ' and ' + zones[j].id + ' overlap');
        });
        M.walls.forEach((w, i) => { if (!within(w, B)) errors.push('map: wall ' + i + ' (' + w.kind + ') lies outside bounds'); });
        const structBox = s => s.shape === 'circle' ? {minX: s.x - s.r, maxX: s.x + s.r, minZ: s.z - s.r, maxZ: s.z + s.r} : {minX: s.x - s.w / 2, maxX: s.x + s.w / 2, minZ: s.z - s.d / 2, maxZ: s.z + s.d / 2};
        M.structures.forEach(s => { if (!within(structBox(s), B)) errors.push('map: structure ' + s.area + ' ' + s.kind + ' ' + fmt(s) + ' lies outside bounds'); });
        // gates: inside bounds, on the shared boundary of their regions, in a wall gap
        const regionOf = id => { const i = placeIndexById(c, id); return i >= 0 ? zones[i].region : null; };
        const onEdge = (reg, g) => {
            if (!reg) return false;
            if (g.axis === 'x') return (Math.abs(reg.minZ - g.at) < 1e-9 || Math.abs(reg.maxZ - g.at) < 1e-9) && g.min >= reg.minX - 1e-9 && g.max <= reg.maxX + 1e-9;
            return (Math.abs(reg.minX - g.at) < 1e-9 || Math.abs(reg.maxX - g.at) < 1e-9) && g.min >= reg.minZ - 1e-9 && g.max <= reg.maxZ + 1e-9;
        };
        M.gates.forEach(g => {
            const gr = strikeOpsGateRect(g);
            if (!within(gr, B)) errors.push('map: gate ' + g.id + ' lies outside bounds');
            const shared = onEdge(regionOf(g.to), g) && (g.from == null || onEdge(regionOf(g.from), g));
            if (!shared) errors.push('map: gate ' + g.id + ' must lie on the shared boundary of its regions');
            const line = w => g.axis === 'x' ? (w.minZ <= g.at + 1e-9 && w.maxZ >= g.at - 1e-9) : (w.minX <= g.at + 1e-9 && w.maxX >= g.at - 1e-9);
            const lo = w => g.axis === 'x' ? w.minX : w.minZ, hi = w => g.axis === 'x' ? w.maxX : w.maxZ;
            const blocked = M.walls.some(w => line(w) && lo(w) < g.max - 1e-9 && hi(w) > g.min + 1e-9);
            const leftEnd = M.walls.some(w => line(w) && Math.abs(hi(w) - g.min) < 1e-9);
            const rightEnd = M.walls.some(w => line(w) && Math.abs(lo(w) - g.max) < 1e-9);
            if (blocked || !leftEnd || !rightEnd) errors.push('map: gate ' + g.id + ' must lie in a gap of the wall list');
        });
        const gateById = id => M.gates.find(g => g.id === id) || null;
        const gateCentre = g => g.axis === 'x' ? {x: (g.min + g.max) / 2, z: g.at} : {x: g.at, z: (g.min + g.max) / 2};
        zones.forEach(z => {
            const en = gateById(z.entryGate), ex = gateById(z.exitGate);
            if (en && inRect(gateCentre(en), z.enemyZone)) errors.push('map: the entry gate of ' + z.id + ' must lie outside its enemyZone');
            if (ex && !inRect(gateCentre(ex), z.enemyZone)) errors.push('map: the exit gate of ' + z.id + ' must lie inside its enemyZone');
        });
        // enemy positions ≥ 0.45 m from every structure and wall; no structure
        // on a fight-box→enemy sightline (2D, conservative)
        const tallBoxes = M.walls.map(w => ({kind: 'wall ' + w.kind, b: w})).concat(M.structures.filter(s => !s.walk && s.shape !== 'circle').map(s => ({kind: s.kind, b: structBox(s)})));
        const tallCircles = M.structures.filter(s => !s.walk && s.shape === 'circle');
        zones.forEach(z => {
            const pts = [], lanePts = [];
            z.lanes.forEach((l, k) => {
                l.spots.forEach(s => { pts.push(s.hide, s.peek); });
                (l.dash || []).forEach(p => pts.push(p));
                laneHorizontalPoints(z, k, c).forEach(p => lanePts.push(p));
            });
            z.boss.points.forEach(p => { pts.push({x: p.x - c.boss.patrol.legM / 2, z: p.z}, p, {x: p.x + c.boss.patrol.legM / 2, z: p.z}); });
            z.approach.forEach(p => pts.push(p));
            pts.push(z.boss.stage);
            const near = [];
            pts.map(p => strikeOpsArenaToMap(z, p.x, p.z)).forEach(m => {
                tallBoxes.forEach(t => { if (inRect(m, inflateRect(t.b, 0.45))) near.push(t.kind + ' at ' + fmt(m)); });
                tallCircles.forEach(s => { if (Math.hypot(m.x - s.x, m.z - s.z) < s.r + 0.45) near.push(s.kind + ' at ' + fmt(m)); });
            });
            if (near.length) errors.push('zone ' + z.id + ': an enemy position lies within 0.45 m of a structure or wall: ' + Array.from(new Set(near)).join(', '));
            const eyes = zoneSamples(z.fightBox, 0.5).map(p => strikeOpsArenaToMap(z, p.x, p.z));
            const tg = lanePts.map(p => strikeOpsArenaToMap(z, p.x, p.z));
            // only colliders overlapping the sightlines' bounding box can cross one
            const hull = {minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity};
            eyes.concat(tg).forEach(p => { hull.minX = Math.min(hull.minX, p.x); hull.maxX = Math.max(hull.maxX, p.x); hull.minZ = Math.min(hull.minZ, p.z); hull.maxZ = Math.max(hull.maxZ, p.z); });
            const boxesIn = tallBoxes.filter(q => overlap2d(q.b, hull)), circlesIn = tallCircles.filter(s => overlap2d({minX: s.x - s.r, maxX: s.x + s.r, minZ: s.z - s.r, maxZ: s.z + s.r}, hull));
            const cross = new Set();
            eyes.forEach(e => tg.forEach(t => {
                boxesIn.forEach(q => { if (segHitsRect(e.x, e.z, t.x, t.z, q.b.minX, q.b.maxX, q.b.minZ, q.b.maxZ)) cross.add(q.kind); });
                circlesIn.forEach(s => { if (segPointDist(e.x, e.z, t.x, t.z, s.x, s.z) < s.r) cross.add(s.kind); });
            }));
            if (cross.size) errors.push('zone ' + z.id + ': structures cross a fight-box→enemy sightline: ' + Array.from(cross).join(', '));
        });
        // route legs: collider-clear for the state where the leg is the objective
        // (its gates open, later blockers up), joined start → each anchor
        const nodes = M.nodes;
        const legOk = (M.legs || []).every(leg => leg.every(id => nodes[id]));
        if (!legOk || (M.legs || []).length !== zones.length - 1) errors.push('map: one route leg per place after the first, over existing nodes');
        else {
            const at = (id, p) => Math.hypot(nodes[id].x - p.x, nodes[id].z - p.z) < 1e-6;
            M.legs.forEach((leg, j) => {
                const col = strikeOpsColliders(j + 1, c);
                for (let i = 1; i < leg.length; i++) {
                    if (!strikeOpsSegmentClear(nodes[leg[i - 1]], nodes[leg[i]], col, r + 0.05)) errors.push('map: route leg ' + (j + 1) + ' segment ' + leg[i - 1] + '→' + leg[i] + ' is blocked');
                }
                const from = j === 0 ? M.start : strikeOpsPlaceFrame(zones[j]).anchor;
                if (!at(leg[0], from) || !at(leg[leg.length - 1], strikeOpsPlaceFrame(zones[j + 1]).anchor)) errors.push('map: route leg ' + (j + 1) + ' must join ' + (j === 0 ? 'the start' : zones[j].id) + ' to ' + zones[j + 1].id);
            });
        }
        if (o.quick) return;
        // pre-clear flood fills (§5.1) and routing from anywhere (rev 3.1)
        const unionOk = p => zones.some(z => inRect(p, inflateRect(z.region, 0.6)));
        for (let k = 0; k <= zones.length; k++) {
            const col = strikeOpsColliders(k, c);
            const seed = k === 0 ? M.start : strikeOpsPlaceFrame(zones[Math.min(k, zones.length) - 1]).anchor;
            const fill = strikeOpsFloodFill(col, seed);
            if (!fill.seedFree) { errors.push('map: flood fill ' + k + ' starts inside a collider'); continue; }
            if (k === zones.length) {
                zones.forEach(z => { if (!floodReaches(fill, strikeOpsPlaceFrame(z).anchor)) errors.push('map: with every place cleared the flood fill must reach ' + z.id); });
                continue;
            }
            const z = zones[k], f = strikeOpsPlaceFrame(z), tag = 'map: flood fill ' + k + ' (' + z.id + ')';
            if (!floodReaches(fill, f.anchor)) errors.push(tag + ' must reach the anchor');
            const lanes = [];
            z.lanes.forEach(l => l.spots.forEach(s => lanes.push(s.hide, s.peek)));
            if (lanes.some(p => floodReaches(fill, strikeOpsArenaToMap(z, p.x, p.z)))) errors.push(tag + ' reaches a lane spot');
            if (f.approach.some(p => floodReaches(fill, p))) errors.push(tag + ' reaches an approach point');
            const ex = gateById(z.exitGate);
            if (ex && floodReaches(fill, gateCentre(ex))) errors.push(tag + ' reaches its exit gate');
            const W = fill.W;
            let outside = 0;
            for (let id = 0; id < fill.seen.length; id++) if (fill.seen[id] && !unionOk({x: W.B.minX + (id % W.nx) * W.step, z: W.B.minZ + Math.floor(id / W.nx) * W.step})) outside += 1;
            if (outside) errors.push(tag + ' leaves the union of the regions');
            if (o.routing === false) continue;
            const bad = [];
            for (let id = 0; id < fill.seen.length && bad.length < 3; id++) {
                if (!fill.seen[id]) continue;
                const i = id % W.nx, j = Math.floor(id / W.nx);
                if (i % 2 || j % 2) continue;
                const p = {x: W.B.minX + i * W.step, z: W.B.minZ + j * W.step};
                if (!strikeOpsRoute(p, z.id, k, c).ok) bad.push(fmt(p));
            }
            if (bad.length) errors.push(tag + ': no route to the anchor from ' + bad.join(', '));
        }
    }

    // ------------------------------------------------------------------
    // Static merging with a manual de-index (§6.2). r128's toNonIndexed()
    // mis-reads interleaved attributes and raw arrays skip de-normalisation, so
    // every value goes through the attribute accessors and is de-normalised here.
    // ------------------------------------------------------------------

    function normDivisor(attr) {
        if (!attr.normalized) return 1;
        const arr = attr.isInterleavedBufferAttribute ? attr.data.array : attr.array;
        if (arr instanceof Int8Array) return 127;
        if (arr instanceof Uint8Array || arr instanceof Uint8ClampedArray) return 255;
        if (arr instanceof Int16Array) return 32767;
        if (arr instanceof Uint16Array) return 65535;
        return 1;
    }
    function readComp(attr, i, c, div) {
        const v = c === 0 ? attr.getX(i) : c === 1 ? attr.getY(i) : c === 2 ? attr.getZ(i) : attr.getW(i);
        return div === 1 ? v : Math.max(v / div, -1);
    }
    // Groups every static mesh under `group` by material and returns one merged
    // non-indexed mesh per material (positions in group space). The placed
    // per-piece meshes are removed; geometries flagged userData.ownGeometry are
    // disposed (shared kit templates are never disposed here).
    function strikeOpsMergeStatic(group, THREE_) {
        const T = THREE_ || global.THREE;
        group.updateMatrixWorld(true);
        const inv = new T.Matrix4().copy(group.matrixWorld).invert();
        const byMat = new Map();
        const parts = [];
        group.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && !o.userData.noMerge) parts.push(o); });
        parts.forEach(m => {
            const key = m.material;
            if (!byMat.has(key)) byMat.set(key, []);
            byMat.get(key).push(m);
        });
        const out = [];
        const v = new T.Vector3();
        byMat.forEach((meshes, material) => {
            let count = 0;
            meshes.forEach(m => { const g = m.geometry; count += g.index ? g.index.count : g.attributes.position.count; });
            const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
            let hasNormal = true, cast = false, receive = false;
            let o = 0;
            meshes.forEach(m => {
                const g = m.geometry, idx = g.index;
                const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
                if (!N) hasNormal = false;
                const mat = new T.Matrix4().multiplyMatrices(inv, m.matrixWorld);
                const nm = new T.Matrix3().getNormalMatrix(mat);
                const dP = normDivisor(P), dN = N ? normDivisor(N) : 1, dU = U ? normDivisor(U) : 1;
                const n = idx ? idx.count : P.count;
                for (let k = 0; k < n; k++) {
                    const i = idx ? idx.getX(k) : k;
                    v.set(readComp(P, i, 0, dP), readComp(P, i, 1, dP), readComp(P, i, 2, dP)).applyMatrix4(mat);
                    pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
                    if (N) {
                        v.set(readComp(N, i, 0, dN), readComp(N, i, 1, dN), readComp(N, i, 2, dN)).applyMatrix3(nm).normalize();
                        nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z;
                    }
                    if (U) { uv[o * 2] = readComp(U, i, 0, dU); uv[o * 2 + 1] = readComp(U, i, 1, dU); }
                    o += 1;
                }
                if (m.castShadow) cast = true;
                if (m.receiveShadow) receive = true;
            });
            const geo = new T.BufferGeometry();
            geo.setAttribute('position', new T.BufferAttribute(pos, 3));
            if (hasNormal) geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
            geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
            if (!hasNormal) geo.computeVertexNormals();
            geo.computeBoundingSphere();
            const mesh = new T.Mesh(geo, material);
            mesh.castShadow = cast;
            mesh.receiveShadow = receive;
            mesh.userData.merged = true;
            mesh.userData.caster = meshes.some(m => m.userData.caster);
            out.push(mesh);
        });
        parts.forEach(m => {
            if (m.parent) m.parent.remove(m);
            if (m.userData.ownGeometry && m.geometry) m.geometry.dispose();
        });
        // drop now-empty placement groups
        const empties = [];
        group.traverse(o => { if (o !== group && !o.isMesh && o.children.length === 0) empties.push(o); });
        empties.forEach(o => { if (o.parent) o.parent.remove(o); });
        out.forEach(m => group.add(m));
        return out;
    }

    // ------------------------------------------------------------------
    // Skeleton-correct cloning for skinned models (no SkeletonUtils in r128)
    // ------------------------------------------------------------------

    function strikeOpsCloneSkinned(source, THREE_) {
        const T = THREE_ || global.THREE;
        const root = source.clone(true);
        const map = new Map();
        (function walk(a, b) {
            map.set(a, b);
            for (let i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]);
        })(source, root);
        const skeletons = [];
        source.traverse(node => {
            if (!node.isSkinnedMesh) return;
            const target = map.get(node);
            const bones = node.skeleton.bones.map(bone => {
                const mapped = map.get(bone);
                if (!mapped) throw new Error('strike-ops: a skinned bone lies outside the cloned root');
                return mapped;
            });
            const skeleton = new T.Skeleton(bones, node.skeleton.boneInverses.map(m => m.clone()));
            target.bind(skeleton, node.bindMatrix.clone());
            skeletons.push(skeleton);
        });
        return {root, skeletons, map};
    }

    // Role → clip for an enemy model (§5 enemyModel): a missing role falls back
    // (aim/crouch/cheer → idle, run → move; down → null = transform-only fall).
    function strikeOpsResolveClipRoles(animations, roleNames) {
        const byName = {};
        (animations || []).forEach(clip => { byName[clip.name] = clip; });
        const clips = {};
        Object.keys(roleNames || {}).forEach(role => {
            const name = roleNames[role];
            clips[role] = name && byName[name] ? byName[name] : null;
        });
        const fallback = {aim: 'idle', crouch: 'idle', cheer: 'idle', run: 'move', shoot: 'idle', hit: 'idle', move: 'idle'};
        ['move', 'run', 'aim', 'crouch', 'cheer', 'shoot', 'hit'].forEach(role => { if (!clips[role] && clips[fallback[role]]) clips[role] = clips[fallback[role]]; });
        if (!('down' in clips)) clips.down = null;
        return clips;
    }

    // ------------------------------------------------------------------
    // Small runtime helpers
    // ------------------------------------------------------------------

    function nowMs() {
        return global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now();
    }
    function cpuNow() { return global.performance && global.performance.now ? global.performance.now() : Date.now(); }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function ease(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function base64ToArrayBuffer(data) {
        const binary = global.atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    }
    // Map → THREE world: (x, y, z) → (−x, y, z). Written only where an
    // Object3D or the camera is placed and where project/rayFor call THREE.
    function mapToWorld(x, z, y) { return {x: -x, y: y || 0, z}; }
    // Every URL the configuration can load (the offline set, §6.4).
    function strikeOpsAssetUrls(cfg) {
        const c = cfg || STRIKE_OPS_CONFIG;
        const urls = [c.enemyModel.url, c.enemyModel.lodUrl];
        Object.keys(c.kitPieces).forEach(k => urls.push(c.kitPieces[k].url));
        Object.keys(c.textures).forEach(k => urls.push(c.textures[k]));
        return Array.from(new Set(urls));
    }

    const PLAY_PHASES = ['deploying', 'engaging', 'wrong', 'correct', 'regroup', 'roaming', 'advancing'];
    const PAUSABLE = ['briefing'].concat(PLAY_PHASES);
    const TRANSITION_PHASES = ['deploying', 'regroup', 'roaming', 'advancing'];
    // Encounter phases: the player is clamped to the place's fight box (§4).
    const ENCOUNTER_PHASES = ['deploying', 'engaging', 'wrong', 'correct', 'regroup'];
    const SHAPE_NAMES = {circle: 'עיגול', triangle: 'משולש', square: 'ריבוע', diamond: 'יהלום'};
    const STATE_TEXT = {hidden: 'בחיפוי', 'peek-out': 'בחיפוי', 'peek-in': 'בחיפוי', exposed: 'חשוף', dash: 'חשוף', split: 'בחיפוי'};

    // ------------------------------------------------------------------
    // Component factory
    // ------------------------------------------------------------------

    function createStrikeOpsComponent(BaseGameComponent) {
        // the cheap checks at startup (the flood fills and routing run in Node)
        const errors = validateStrikeOpsConfig(STRIKE_OPS_CONFIG, {quick: true});
        if (errors.length) throw new Error('strike-ops: ' + errors.join('; '));
        const C = STRIKE_OPS_CONFIG;
        const M = C.zonePlan.zones.length * C.zonePlan.roundsPerZone;

        return Vue.component('strike-ops', Vue.extend({
            extends: BaseGameComponent,
            template: `
            <main ref="root" class="so-game" tabindex="-1" dir="rtl" aria-label="כוח פריצה"
                  :data-phase="phase" :data-render="renderMode" :data-round-kind="roundKind" :data-place="placeId"
                  :class="rootClasses" :style="soTheme.css">
              <div ref="host" class="so-canvas-host" aria-hidden="true"
                   @pointerdown="onHostPointerDown" @pointermove="onHostPointerMove" @pointerup="onHostPointerUp" @pointercancel="onHostPointerUp"
                   @mousedown="onHostMouseDown" @contextmenu.prevent></div>
              <div class="so-fx" aria-hidden="true">
                <div class="so-plates">
                  <div v-for="(option, i) in options" :key="questionToken + '-p' + i" ref="plateEls" class="so-plate so-plate-unplaced" :data-index="i"
                       :class="plateClass(i)" :style="laneStyle(i)">
                    <span class="so-marker" aria-hidden="true" :data-badge="i + 1" :data-shape="shapeOf(i)"><b>{{ i + 1 }}</b><i class="so-shape" :class="'so-shape-' + shapeOf(i)"></i></span>
                    <span class="so-plate-text" :dir="dirOf(option)"><template v-if="isHtml(option)"><span v-html="richHtml(option, 'answer')"></span></template><template v-else><template v-for="(run, k) in runsOf(option)"><bdi v-if="run.isolate" :key="k" :dir="run.isolate">{{ run.text }}</bdi><template v-else>{{ run.text }}</template></template></template></span>
                    <span class="so-plate-state">{{ wrongOption === i ? '✗' : (correctIndex === i ? '✓' : '') }}</span>
                  </div>
                  <i v-for="(option, i) in options" :key="questionToken + '-s' + i" ref="stemEls" class="so-stem so-plate-unplaced" :data-index="i" :style="laneStyle(i)"></i>
                </div>
                <div ref="objective" class="so-objective so-objective-off" aria-hidden="true"><i class="so-objective-arrow"></i><span class="so-objective-pin"><span class="so-objective-flag">⚑</span></span><span class="so-objective-label"><b class="so-objective-name">{{ objectiveName }}</b><span ref="objectiveDist" class="so-objective-dist"></span></span></div>
                <div ref="lockRing" class="so-lock-ring" :class="{'so-lock-on': lockIndex >= 0}"><b v-if="lockIndex >= 0">{{ lockIndex + 1 }}</b></div>
                <div ref="crosshair" class="so-crosshair" :class="{'so-over': overEnemy}"><i></i><i></i><i></i><i></i><b></b></div>
                <div ref="hitmarker" class="so-hitmarker" :class="hitmarker ? 'so-hit-' + hitmarker : ''"><span v-if="hitmarker === 'correct'">✓</span></div>
                <div class="so-vignette"></div>
                <div ref="fade" class="so-fade" :class="{'so-fading': fading}"></div>
              </div>

              <div ref="hud" class="so-hud" dir="ltr">
                <div ref="counter" class="so-counter" dir="rtl">
                  <span class="so-emblem" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-4.5-6.5 4.5 2-7.5L2 9h7z" fill="currentColor"/></svg></span>
                  <span class="so-count">{{ counterText }}</span>
                  <span class="so-stars" :aria-label="'כוכבים: ' + stars"><i v-for="k in placeCount" :key="k" :class="{'so-star-on': k <= stars}">★</i></span>
                </div>
                <section ref="banner" class="so-banner" :class="{'so-more': questionMore && !roamView}" aria-label="שאלה">
                  <button type="button" class="so-replay" @click="replayQuestion" :disabled="roamView" aria-label="השמעת השאלה שוב"><span aria-hidden="true">🔊</span></button>
                  <div class="so-banner-main">
                  <h2 v-if="roamView" class="so-objective-line" dir="rtl"><span>{{ objectiveLine }}</span> <i ref="objectiveDir" class="so-objective-dir" aria-hidden="true">⬆</i></h2>
                  <h2 v-else class="so-question" :key="'q' + questionToken" :dir="questionDir" @scroll.passive="updateScrollCues"><template v-if="question && isHtml(question.question)"><span v-html="richHtml(question.question, 'question')" @click="playRichAudio"></span></template><template v-else><template v-for="(run, k) in questionRuns"><bdi v-if="run.isolate" :key="k" :dir="run.isolate">{{ run.text }}</bdi><template v-else>{{ run.text }}</template></template></template></h2>
                  <p v-if="subLine && !roamView" class="so-subline" dir="rtl" aria-hidden="true">{{ subLine }}</p>
                  </div>
                </section>
                <p class="so-status" v-if="statusText">{{ statusText }}</p>
                <p class="so-toast" :class="{'so-toast-on': !!toast}" aria-hidden="true">{{ toast }}</p>
                <div v-if="roamView" ref="goRow" class="so-go-row">
                  <button v-if="renderMode === 'gl'" ref="go" type="button" class="so-go" :class="{'so-go-hint': goHint, 'so-go-on': autopilot}" :aria-pressed="autopilot ? 'true' : 'false'"
                          :disabled="phase !== 'roaming'" @pointerdown="onGoPointerDown" @pointerup="onGoPointerUp" @click="onGoClick">
                    <span class="so-go-icon" aria-hidden="true">➜</span><span>{{ goLabel }}</span>
                  </button>
                  <p v-else class="so-go-dom">{{ 'מתקדמים אל ' + targetName + '…' }}</p>
                </div>
                <div v-else ref="answers" class="so-answers" :class="['so-answers-' + answersLayout, {'so-more': answersMore}]" @scroll.passive="updateScrollCues" dir="ltr" role="group" :aria-label="roundKind === 'boss' ? 'העתקים של המפקד ותשובות' : 'חיילים ותשובות'">
                  <button v-for="(option, i) in options" :key="questionToken + '-a' + i" ref="chips" type="button" class="so-answer" :data-index="i"
                          :class="chipClass(i)" :style="laneStyle(i)" :disabled="chipsDisabled" :aria-label="chipAria(i, option)"
                          @click="onChip(i, $event)">
                    <span class="so-marker" aria-hidden="true" :data-badge="i + 1" :data-shape="shapeOf(i)"><b>{{ i + 1 }}</b><i class="so-shape" :class="'so-shape-' + shapeOf(i)"></i></span>
                    <span class="so-answer-text" :dir="dirOf(option)"><template v-if="isHtml(option)"><span v-html="richHtml(option, 'answer')"></span></template><template v-else><template v-for="(run, k) in runsOf(option)"><bdi v-if="run.isolate" :key="k" :dir="run.isolate">{{ run.text }}</bdi><template v-else>{{ run.text }}</template></template></template></span>
                    <span class="so-answer-state">{{ wrongOption === i ? '✗' : (correctIndex === i ? '✓' : '') }}</span>
                  </button>
                </div>
                <div ref="stickArea" class="so-stick-area">
                  <div v-if="isTouch && renderMode === 'gl'" ref="stick" class="so-stick" @pointerdown="onStickDown" @pointermove="onStickMove" @pointerup="onStickUp" @pointercancel="onStickUp"><i ref="stickKnob"></i></div>
                </div>
                <div ref="center" class="so-center">
                  <div class="so-weapon" v-if="renderMode === 'gl'">
                    <svg class="so-gun-icon" viewBox="0 0 64 24" aria-hidden="true"><path d="M2 9h30l2-3h10l1 3h14v4H49l-3 2H36l-3 8h-6l2-8h-9l-2 4h-5l1-4H2z" fill="currentColor"/></svg>
                    <span class="so-ammo" :class="{'so-ammo-empty': ammo === 0, 'so-ammo-reloading': reloading}" aria-label="תחמושת" dir="ltr"><b>{{ ammo }}</b>/{{ reserve }}</span>
                  </div>
                  <p v-if="keyHint" class="so-keyhint" dir="rtl"><span><b>עכבר</b>: כיוון</span> · <span><b>לחיצה</b>: ירי</span> · <span><kbd dir="ltr">R</kbd>: טעינה</span> · <span><kbd dir="ltr">1–4</kbd>: נעילה</span></p>
                  <div class="so-progress" :title="'התקדמות ' + progressText">
                    <span class="so-progress-bar"><em :style="{width: progressPercent + '%'}"></em></span>
                    <span class="so-score" aria-label="ניקוד">★ {{ score }}</span>
                  </div>
                </div>
                <div ref="cluster" class="so-cluster">
                  <button type="button" class="so-reload" v-if="renderMode === 'gl'" :class="{'so-reloading': reloading}" @click="reload" :disabled="!canReload" aria-label="טעינה מחדש"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h6v4h4v14H7zm2 2v4h6v10H9z" fill="currentColor"/></svg></button>
                  <button v-if="isTouch && renderMode === 'gl'" type="button" tabindex="-1" class="so-ads" :aria-pressed="ads ? 'true' : 'false'" @click="toggleAds" aria-label="כוונת"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6" stroke="currentColor" stroke-width="2"/></svg></button>
                  <button v-if="isTouch && renderMode === 'gl'" type="button" tabindex="-1" class="so-fire" @pointerdown="onFirePointerDown" @click="onFireClick" aria-label="ירי"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2h4l1 5v15H9V7z" fill="currentColor"/></svg></button>
                </div>
                <div ref="sys" class="so-sys">
                  <button type="button" class="so-pause" :disabled="!canPause" @click="pause('button')" aria-label="השהיה"><span aria-hidden="true">⏸</span></button>
                  <button type="button" class="so-exit" @click="exitGame" aria-label="יציאה"><span aria-hidden="true">✕</span></button>
                </div>
                <div ref="minimap" class="so-minimap" aria-hidden="true" @click="onMinimapClick"><canvas ref="minimapCanvas"></canvas></div>
              </div>

              <div class="so-live" aria-live="polite" role="status">{{ live }}</div>

              <section v-if="mapOpen || phase === 'paused'" ref="mapview" class="so-mapview" :class="{'so-mapview-paused': phase === 'paused' && !mapOpen}" @click.self="closeMap">
                <div class="so-mapview-card">
                  <canvas ref="mapCanvas" class="so-mapview-canvas" aria-hidden="true"></canvas>
                  <ol class="so-mapview-places" aria-label="מפת המתחם">
                    <li v-for="p in mapPlaces" :key="p.id" :class="'so-place-' + p.state"><span>{{ p.name }}</span> — <b>{{ p.label }}</b></li>
                  </ol>
                </div>
              </section>

              <section v-if="phase === 'loading' || phase === 'briefing'" class="so-briefing" aria-labelledby="so-brief-title">
                <h1 id="so-brief-title">כוח פריצה</h1>
                <p class="so-setting">{{ soTheme.motif.setting }}</p>
                <p class="so-goal">פגעו בחייל שמחזיק את התשובה הנכונה</p>
                <ul v-if="isTouch" class="so-hints"><li>גררו כדי להסתכל · כפתור הירי בימין</li><li>ג׳ויסטיק להליכה · קדימה מוביל למקום הבא</li></ul>
                <ul v-else class="so-hints"><li>עכבר לכיוון · לחיצה לירי · WASD או חיצים להליכה</li><li>1–4 ננעלים על חייל · G קדימה · M מפה · Esc השהיה</li></ul>
                <p v-if="phase === 'loading'" class="so-loading">טוען ציוד…</p>
                <button v-else ref="start" type="button" class="so-start" @click="start($event)" @pointerdown="noteStartPointer">התחילו</button>
              </section>

              <section v-if="phase === 'paused'" class="so-paused" aria-labelledby="so-pause-title">
                <h2 id="so-pause-title">המשחק מושהה</h2>
                <p>{{ aimMode === 'locked' ? 'לחצו כדי לחזור ולכוון' : 'אפשר להמשיך כשמוכנים' }}</p>
                <button ref="resume" type="button" class="so-resume" @click="resume($event)">המשך</button>
              </section>

              <section v-if="phase === 'lost'" class="so-lost" aria-labelledby="so-lost-title">
                <h2 id="so-lost-title">התצוגה נעצרה</h2>
                <p>התצוגה התלת-ממדית נעצרה. ההתקדמות שלכם נשמרה.</p>
                <button type="button" class="so-lost-restart" @click="restartInPlace">התחלה מחדש</button>
                <button type="button" class="so-lost-dom" @click="continueInDom">המשך בלי תלת-ממד</button>
                <button type="button" class="so-lost-back" @click="exitGame">חזרה</button>
              </section>
            </main>`,

            data: function () {
                return {
                    soTheme: resolveStrikeOpsTheme('base'),
                    phase: 'loading',
                    renderMode: 'gl',
                    resumePhase: null,
                    question: null,
                    options: [],
                    questionToken: 0,
                    attemptLocked: true,
                    wrongOption: null,
                    correctIndex: -1,
                    roundKind: 'squad',
                    roundNumber: 1,
                    roundInZone: 0,
                    zoneNumber: 1,
                    zoneIndex: 0,
                    zoneId: C.zones[0].id,
                    stars: 0,
                    lap: 1,
                    placeId: C.zones[0].id,
                    autopilot: false,
                    toast: '',
                    subLine: '',
                    mapOpen: false,
                    goHint: false,
                    mapZone: 0,
                    ammo: C.weapon.magazine,
                    reserve: C.weapon.reserve,
                    reloading: false,
                    ads: false,
                    quality: 2,
                    reducedMotion: false,
                    aimMode: 'cursor',
                    isTouch: false,
                    portrait: false,
                    lowHeight: false,
                    hitmarker: '',
                    lockIndex: -1,
                    lockWaiting: false,
                    overEnemy: false,
                    stateMask: '',
                    live: '',
                    fading: false,
                    answersLayout: 'row',
                    answersMore: false,
                    questionMore: false,
                    keyHint: false,
                    transitionText: '',
                };
            },

            computed: {
                rootClasses: function () {
                    return ['so-phase-' + this.phase, 'so-theme-' + this.soTheme.key, {
                        'so-reduced': this.reducedMotion, 'so-touch': this.isTouch, 'so-dom': this.renderMode === 'dom',
                        'so-boss-round': this.roundKind === 'boss', 'so-ads-on': this.ads, 'so-cursor-aim': this.aimMode === 'cursor',
                        'so-roaming': this.roamView,
                    }];
                },
                questionDir: function () { return this.question ? this.dirOf(this.question.question) : 'rtl'; },
                placeCount: function () { return C.zones.length; },
                // roaming (also while paused or lost in roaming): objective line + Go
                roamView: function () {
                    const p = (this.phase === 'paused' || this.phase === 'lost') ? this.resumePhase : this.phase;
                    return p === 'roaming' || p === 'advancing';
                },
                targetName: function () { return (C.zones[this.zoneIndex] || C.zones[0]).name; },
                objectiveLine: function () {
                    const p = (this.phase === 'paused' || this.phase === 'lost') ? this.resumePhase : this.phase;
                    return p === 'advancing' ? 'סבב ' + this.lap + ' — חוזרים אל ' + C.zones[0].name : 'התקדמו אל: ' + this.targetName;
                },
                objectiveText: function () { return this.roamView ? this.objectiveLine : ''; },
                objectiveName: function () { return this.targetName; },
                goLabel: function () { return 'קדימה אל ' + this.targetName; },
                mapPlaces: function () {
                    const k = this.mapZone;
                    return C.zones.map((z, i) => {
                        const state = i < k ? 'cleared' : (i === k ? 'target' : 'closed');
                        return {id: z.id, name: z.name, state, label: state === 'cleared' ? 'נוקה' : (state === 'target' ? 'היעד' : 'סגור')};
                    });
                },
                questionRuns: function () { return this.question ? strikeOpsBidiRuns(this.question.question, this.questionDir) : []; },
                counterText: function () {
                    const n = this.roundNumber - 1;
                    return (this.lap > 1 ? 'סבב ' + this.lap + ' · ' : '') + 'שאלה ' + (n % M + 1) + '/' + M;
                },
                progressPercent: function () {
                    const p = this.progress;
                    return p && p.total ? clamp(p.progress / p.total * 100, 0, 100) : 0;
                },
                progressText: function () { const p = this.progress; return p ? p.progress + '/' + p.total : ''; },
                chipsDisabled: function () { return this.phase !== 'engaging'; },
                canPause: function () { return PAUSABLE.indexOf(this.phase) !== -1; },
                canReload: function () { return !this.reloading && this.ammo < C.weapon.magazine && PLAY_PHASES.indexOf(this.phase) !== -1; },
                statusText: function () {
                    if (this.lockWaiting && this.phase === 'engaging') return 'ממתין שהחייל יצוץ…';
                    if (this.phase === 'advancing' && (this.reducedMotion || this.renderMode === 'dom')) return 'סבב חדש…';
                    if (this.transitionText) return this.transitionText;
                    return '';
                },
            },

            watch: {
                theme: function () { this.refreshTheme(); },
                options: function () { this.afterContentChange(); },
                roundKind: function () { this.afterContentChange(); },
                roamView: function () { this.afterContentChange(); },
                mapOpen: function () { this.$nextTick(() => { if (this.alive()) this.drawMapView(); }); },
                // the pause panel shows the same map: drawn once on entry (the
                // loop does not redraw maps while paused)
                phase: function (p) { if (p === 'paused') this.$nextTick(() => { if (this.alive() && this.phase === 'paused') this.drawMapView(); }); },
            },

            beforeCreate: function () {
                // Non-reactive runtime state. BaseGameComponent.created() calls create()
                // before this component's own created hook, so it must exist now.
                this._so = {
                    run: 0, gfx: 0, destroyed: false, navigated: false,
                    timers: new Set(), phaseTimers: new Set(), listeners: [],
                    frame: null, lastTs: null, rendering: true,
                    shared: new Set(), rounds: [], round: null, prevRound: null,
                    sched: {acc: 0, since: null}, keys: new Set(), stick: {x: 0, y: 0, id: null},
                    // the plain-data player pose in the MAP frame (§5): all a rebuild needs
                    player: {x: C.map.start.x, z: C.map.start.z, yaw: C.map.start.headingDeg * Math.PI / 180, pitch: -0.03},
                    vel: {x: 0, z: 0}, moveInput: null, autopilot: null, assist: null, sprinting: false, speed: 0,
                    mapZoneIndex: 0, map: null, gateAnim: {}, deadPointers: new Set(), boundaryToast: false, pushing: false,
                    lastMoveInputAt: 0, roamSince: 0, placeToastAt: {}, lastPlace: 0, shadowKey: '', lapFadeAt: 0,
                    cam: {x: 0, y: C.movement.eye, z: 0, yaw: 0, pitch: 0, fov: 50, aspect: 16 / 9, kick: 0},
                    view: {w: 1280, h: 720, left: 0, top: 0},
                    safe: {left: 8, top: 80, right: 1272, bottom: 600},
                    cursor: null, look: null, lock: null,
                    lastShot: -1e9, kick: 0, kickVel: 0, vmKick: 0, vmKickVel: 0, adsT: 0, muzzleUntil: 0,
                    fps: {frames: 0, start: 0, lastDowngrade: -1e9, pinned: false},
                    stats: {last: {calls: 0, triangles: 0, passes: {shadow: {calls: 0, triangles: 0}, scene: {calls: 0, triangles: 0}, overlay: {calls: 0, triangles: 0}}}, peak: {calls: 0, triangles: 0}, shadowCalls: 0, shadowTris: 0},
                    assets: null, transition: null, forceBoss: false, domAnswerOnly: false, warnedOverflow: false,
                    enteredFullscreen: false, wantLock: false, audio: null, noise: null, actionToken: -1,
                    plateSizes: [], plateCollapsed: false, collapseSince: 0, themeCheckAt: 0, minimapAt: 0,
                    reformAt: {}, initialTier: null, lastPointerType: null, mixersActive: 0, enemyCounter: 0,
                    loading: null, failGL: false,
                };
            },

            mounted: function () {
                const so = this._so;
                // Startup guard: created() discarded reloadProgress()'s answer, and the
                // route change can still be pending. Allocate nothing if we are leaving.
                if (so.destroyed || so.navigated || !this.isCurrentRoute()) return;
                this.setupEnvironment();
                this.refreshTheme();
                if (!this.question) return;
                if (!this.initScene()) {
                    this.renderMode = 'dom';
                    this.setPhase('briefing');
                    this.focusStart();
                    return;
                }
                this.applyQuality(this.quality);
                this.loadAssets();
                this.startLoop();
            },

            beforeDestroy: function () { this.teardown(); },

            methods: {
                // ---------------- generic helpers ----------------
                isHtml: function (s) { return /<[a-z!/]/i.test(String(s == null ? '' : s)); },
                dirOf: function (html) { const t = stripTags(html); return HEB.test(t) ? 'rtl' : (LTR_STRONG.test(t) ? 'ltr' : 'rtl'); },
                runsOf: function (option) { return strikeOpsBidiRuns(option, this.dirOf(option)); },
                // Learning markup through the allow-list sanitizer (memoized: the
                // template re-renders on HUD state changes). Answers sit inside a
                // button, so their audio prompts become inert spans.
                richHtml: function (html, mode) {
                    const cache = this._richCache || (this._richCache = new Map());
                    const key = (mode === 'answer' ? 'a:' : 'q:') + String(html == null ? '' : html);
                    let v = cache.get(key);
                    if (v === undefined) {
                        if (cache.size > 64) cache.clear();
                        v = strikeOpsSafeHtml(html, mode);
                        cache.set(key, v);
                    }
                    return v;
                },
                // Plays a sanitized question prompt (data-so-audio / data-so-say)
                // from the Vue-bound click instead of an inline handler.
                playRichAudio: function (event) {
                    const host = event && event.currentTarget;
                    const el = event && event.target && event.target.closest ? event.target.closest('[data-so-audio],[data-so-say]') : null;
                    if (!el || !host || !host.contains(el)) return;
                    try {
                        if (el.hasAttribute('data-so-audio') && typeof global.audio === 'function') global.audio(el.getAttribute('data-so-audio'));
                        else if (el.hasAttribute('data-so-say') && typeof global.text_to_speech === 'function') global.text_to_speech(el.getAttribute('data-so-say'));
                    } catch (e) { /* audio is optional */ }
                },
                laneOf: function (i) {
                    const set = C.zones[this.zoneIndex].laneSets[Math.min(STRIKE_OPS_MAX_LANES, Math.max(1, this.options.length))];
                    return set ? set[i] : i;
                },
                shapeOf: function (i) { return SHAPES[i % 4]; },
                laneStyle: function (i) { return {'--so-tint': 'var(--so-lane-' + (i % 4) + ')'}; },
                enemyStateAt: function (i) { return this.stateMask[i] || 'h'; },
                plateClass: function (i) {
                    return {'so-plate-wrong': this.wrongOption === i, 'so-plate-correct': this.correctIndex === i, 'so-dim': this.enemyStateAt(i) !== 'e'};
                },
                chipClass: function (i) {
                    return {'so-answer-wrong': this.wrongOption === i, 'so-answer-correct': this.correctIndex === i, 'so-answer-locked': this.lockIndex === i, 'so-lit': this.enemyStateAt(i) === 'e'};
                },
                chipAria: function (i, option) {
                    let state;
                    if (this.correctIndex === i) state = 'נכון';
                    else if (this.wrongOption === i) state = 'נוסה';
                    else state = this.enemyStateAt(i) === 'e' ? 'חשוף' : 'בחיפוי';
                    const who = this.roundKind === 'boss' ? 'העתק ' : 'חייל ';
                    return who + (i + 1) + ' (' + SHAPE_NAMES[this.shapeOf(i)] + '): ' + (stripTags(option) || 'תמונה') + ', ' + state;
                },
                isCurrentRoute: function () {
                    const r = this.$route;
                    return !!(r && r.params && r.params.currentAppId === this.currentAppId && String(r.path).indexOf('/play/strike_ops/') === 0);
                },
                // reloadProgress() is the inherited engine method; this only records
                // that the engine navigated so nothing schedules further work.
                checkProgress: function () {
                    const ok = this.reloadProgress();
                    if (ok === false) this._so.navigated = true;
                    return ok !== false;
                },
                alive: function () { const so = this._so; return !so.destroyed && !so.navigated; },
                // Cosmetic delays: dropped on teardown, navigation or a graphics generation change.
                ownTimeout: function (fn, ms) {
                    const so = this._so, run = so.run, gfx = so.gfx;
                    const id = setTimeout(() => {
                        so.timers.delete(id);
                        if (so.destroyed || so.navigated || run !== so.run || gfx !== so.gfx) return;
                        fn();
                    }, ms);
                    so.timers.add(id);
                    return id;
                },
                clearOwnTimeout: function (id) {
                    if (id == null) return;
                    clearTimeout(id);
                    this._so.timers.delete(id);
                },
                listen: function (target, type, fn, opts) {
                    if (!target) return;
                    if (target.addEventListener) {
                        target.addEventListener(type, fn, opts);
                        this._so.listeners.push([target, type, fn, opts, false]);
                    } else if (target.addListener) {
                        target.addListener(fn);
                        this._so.listeners.push([target, type, fn, opts, true]);
                    }
                },
                unlistenTarget: function (target) {
                    const so = this._so;
                    so.listeners = so.listeners.filter(entry => {
                        if (entry[0] !== target) return true;
                        if (entry[4]) { if (target.removeListener) target.removeListener(entry[2]); } else target.removeEventListener(entry[1], entry[2], entry[3]);
                        return false;
                    });
                },
                setPhase: function (p) {
                    this.phase = p;
                    this.syncSched();
                },
                // The squad/boss scheduler clock runs only in engaging and wrong.
                syncSched: function () {
                    const s = this._so.sched, running = this.phase === 'engaging' || this.phase === 'wrong';
                    if (running && s.since == null) s.since = nowMs();
                    else if (!running && s.since != null) { s.acc += nowMs() - s.since; s.since = null; }
                },
                schedNow: function () {
                    const s = this._so.sched;
                    return s.acc + (s.since != null ? nowMs() - s.since : 0);
                },
                resetSched: function () {
                    const s = this._so.sched;
                    s.acc = 0;
                    s.since = (this.phase === 'engaging' || this.phase === 'wrong') ? nowMs() : null;
                },

                // ---------------- pausable learning-phase timers ----------------
                phaseTimer: function (expectPhase, ms, fn) {
                    const so = this._so;
                    const timer = {expectPhase, token: this.questionToken, run: so.run, ms, remaining: ms, startedAt: nowMs(), id: null, fn};
                    so.phaseTimers.add(timer);
                    this.scheduleTimer(timer);
                    return timer;
                },
                scheduleTimer: function (timer) {
                    timer.startedAt = nowMs();
                    timer.id = setTimeout(() => this.fireTimer(timer), Math.max(0, timer.remaining));
                },
                fireTimer: function (timer) {
                    const so = this._so;
                    timer.id = null;
                    timer.remaining = 0;
                    so.phaseTimers.delete(timer);
                    if (timer.run !== so.run || timer.token !== this.questionToken || this.phase !== timer.expectPhase || so.navigated || so.destroyed) return;
                    timer.fn.call(this);
                },
                pauseTimers: function () {
                    const t = nowMs();
                    this._so.phaseTimers.forEach(timer => {
                        if (timer.id == null) return;
                        clearTimeout(timer.id);
                        timer.id = null;
                        timer.remaining = Math.max(0, timer.remaining - (t - timer.startedAt));
                    });
                },
                resumeTimers: function () {
                    this._so.phaseTimers.forEach(timer => { if (timer.id == null) this.scheduleTimer(timer); });
                },
                timerRemaining: function (timer) {
                    return timer.id == null ? timer.remaining : Math.max(0, timer.remaining - (nowMs() - timer.startedAt));
                },
                findTimer: function (expectPhase) {
                    let found = null;
                    this._so.phaseTimers.forEach(t => { if (!expectPhase || t.expectPhase === expectPhase) found = t; });
                    return found;
                },
                // Elapsed ms of the pending timer for `expectPhase` (its full length if none).
                timerElapsed: function (expectPhase) {
                    const t = this.findTimer(expectPhase);
                    if (!t) return Infinity;
                    return clamp(t.ms - this.timerRemaining(t), 0, t.ms);
                },
                getPhaseTimers: function () {
                    return Array.from(this._so.phaseTimers).map(t => ({expectPhase: t.expectPhase, remaining: this.timerRemaining(t), token: t.token, pending: t.id != null}));
                },
                // Resume target rule (§4): the pending learning timer's phase wins.
                resumeTarget: function () {
                    const t = this.findTimer();
                    const frozen = this.resumePhase;
                    if (t) {
                        if (frozen && frozen !== t.expectPhase && !this._so.warnedTarget) {
                            this._so.warnedTarget = true;
                            if (global.console) console.warn('strike-ops: resume target ' + t.expectPhase + ' overrides ' + frozen);
                        }
                        return t.expectPhase;
                    }
                    if (!frozen || frozen === 'loading') return 'briefing';
                    return frozen;
                },

                // ---------------- learning adapter (§2) ----------------
                create: function () {
                    const so = this._so;
                    if (so.destroyed || so.navigated) return;
                    if (!this.checkProgress()) return;
                    const app = this.currentApp;
                    const q = generateFromList(app.listName, app.questionIndex, app.resultIndex, this.currentAppId, getSetItems(app), app.questionType);
                    this.question = q;
                    this.options = this.shuffle(q.options.slice());
                    this.questionIndex = q.questionIndex;
                    this.exercise = q.question;
                    this.result = q.result;
                    this.wrongOption = null;
                    this.correctIndex = -1;
                    this.questionToken += 1;
                    this.attemptLocked = true;
                    so.domAnswerOnly = this.options.length > STRIKE_OPS_MAX_LANES;
                    if (so.domAnswerOnly && !so.warnedOverflow) {
                        so.warnedOverflow = true;
                        if (global.console) console.warn('strike-ops: more options than lanes; this question is answered from the answer list');
                    }
                    this.roundKind = strikeOpsRoundKind(this.roundInZone, C, so.forceBoss);
                    so.forceBoss = false;
                    this.makeLogicalRound();
                    if (!this.checkProgress()) return;
                },
                answer: function (i, token) {
                    const so = this._so;
                    if (so.navigated || this.phase !== 'engaging' || this.attemptLocked || !this.question) return false;
                    if (token != null && token !== this.questionToken) return false;
                    if (so.destroyed || so.navigated || typeof i !== 'number' || i < 0 || i >= this.options.length) return false;
                    this.attemptLocked = true;
                    const tok = this.questionToken;
                    this.cancelLock();
                    if (this.options[i] === this.question.result) {
                        if (typeof successSound !== 'undefined' && successSound) { try { const p = successSound.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* optional */ } }
                        updateWeightForKey(this.currentAppId, this.questionIndex, -1);
                        this.score += 1;
                        if (this.checkProgress()) {
                            this.saveScore();
                            if (tok !== this.questionToken) return true;
                            this.correctIndex = i;
                            this.keyHint = false;
                            this.setPhase('correct');
                            this.onCorrectFeedback(i);
                            this.phaseTimer('correct', C.timing.correctToTransitionMs, this.beginTransition);
                        }
                        return true;
                    }
                    this.wrongOption = i;
                    if (typeof failureSound !== 'undefined' && failureSound) { try { const p = failureSound.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* optional */ } }
                    this.score = Math.max(0, this.score - 1);
                    this.saveScore();
                    updateWeightForKey(this.currentAppId, this.questionIndex, 1);
                    this.setPhase('wrong');
                    this.onWrongFeedback(i);
                    if (this.checkProgress()) this.phaseTimer('wrong', C.timing.retryLockMs, this.unlockRetry);
                    return true;
                },
                unlockRetry: function () {
                    const so = this._so, round = so.round;
                    // cancel any leftover flicker/dissolve, then re-form the copy
                    if (round) round.enemies.forEach(e => {
                        if (e.dissolved) { e.dissolved = false; e.reformAt = nowMs(); }
                        e.hitUntil = -1;
                    });
                    this.attemptLocked = false;
                    this.setPhase('engaging');
                },
                // Correct → next round (§2): staged counters first, then the
                // question; the map effects are committed only after create()
                // passed checkProgress() (rev 3.1).
                beginTransition: function () {
                    const so = this._so;
                    const from = {zoneIndex: this.zoneIndex, zoneNumber: this.zoneNumber, roundNumber: this.roundNumber, roundInZone: this.roundInZone, roundKind: this.roundKind, taggedIndex: this.correctIndex};
                    const next = strikeOpsNextRound({roundNumber: this.roundNumber, roundInZone: this.roundInZone, zoneNumber: this.zoneNumber, zoneIndex: this.zoneIndex, lap: this.lap}, C);
                    if (so.skipZone != null && next.kind !== 'regroup') {
                        next.zoneIndex = so.skipZone;
                        next.kind = so.skipZone === 0 ? 'advancing' : 'roaming';
                        next.lap = so.skipZone === 0 ? this.lap + 1 : this.lap;
                    }
                    so.skipZone = null;
                    const kind = next.kind;
                    const domRoam = kind === 'roaming' && this.renderMode === 'dom';
                    const duration = kind === 'regroup' ? C.timing.regroupMs : (kind === 'roaming' && !domRoam ? null : C.timing.advanceMs);
                    const wasBoss = this.roundInZone === C.zonePlan.bossRoundIndex;
                    so.transition = {
                        kind, from,
                        to: {zoneIndex: next.zoneIndex, zoneNumber: next.zoneNumber, roundNumber: next.roundNumber, roundInZone: next.roundInZone, roundKind: null},
                        questionToken: null, durationMs: duration, lap: next.lap, schedulerMs: Math.round(this.schedNow()),
                        outgoingRetired: {untagged: true, tagged: false}, resumePhase: kind, lapPoseApplied: false, elapsedMs: 0,
                    };
                    // staged counters: they label the incoming round
                    this.roundNumber = next.roundNumber;
                    this.roundInZone = next.roundInZone;
                    this.zoneNumber = next.zoneNumber;
                    this.zoneIndex = next.zoneIndex;
                    this.zoneId = C.zones[next.zoneIndex].id;
                    this.lap = next.lap;
                    if (kind !== 'regroup' && wasBoss) this.stars = Math.min(C.zones.length, this.stars + 1);
                    // the lap wrap resets the stars with the lap counter (§2); applyLapPose
                    // only refreshes their display
                    if (kind === 'advancing') this.stars = 0;
                    this.setPhase(kind);
                    this.cancelLock();
                    this.ads = false;
                    // a resting cursor must re-arm edge-pan by moving (it would
                    // otherwise drag the next squad off-screen)
                    so.cursorArmed = false;
                    // the next squad deploys in the same lanes: glide back to the
                    // anchor and heading so it starts on-screen (cut when reduced)
                    if (kind === 'regroup') this.startAssist();
                    // the outgoing round keeps only its tagged enemy until its fade ends
                    so.prevRound = so.round;
                    so.round = null;
                    this.retireUntagged(so.prevRound);
                    this.create();
                    if (so.navigated || so.destroyed) return;
                    so.transition.to.roundKind = this.roundKind;
                    so.transition.questionToken = this.questionToken;
                    this.transitionText = (this.reducedMotion || this.renderMode === 'dom') && kind === 'regroup' ? 'החוליה מתארגנת…' : '';
                    if (this.reducedMotion || this.renderMode === 'dom' || !so.rendering) this.flashFade();
                    if (kind === 'roaming') {
                        // commit: the gate opens, guidance switches to the next place
                        this.commitMapZone(next.zoneIndex, true);
                        const place = C.zones[next.zoneIndex];
                        this.announce('האזור נוקה! השער ל' + place.name + ' נפתח');
                        so.roamSince = nowMs();
                        so.lastMoveInputAt = nowMs();
                        this.goHint = false;
                        if (domRoam) this.phaseTimer('roaming', C.timing.advanceMs, this.enterEncounter);
                        return;
                    }
                    if (kind === 'advancing') {
                        this.closeMap();
                        this.cancelAutopilot();
                        this.announce('סבב ' + this.lap);
                        this.synth('fanfare');
                    }
                    this.spawnRoundVisuals(so.round);
                    this.phaseTimer(kind, duration, this.arriveRound);
                },
                // Commits the derived map state (gates, blockers, target): only
                // after create() passed checkProgress(), or from the lap pose.
                commitMapZone: function (k, animate) {
                    const so = this._so;
                    const prev = so.mapZoneIndex;
                    so.mapZoneIndex = k;
                    this.mapZone = k;
                    const now = nowMs();
                    C.map.gates.forEach(g => {
                        const open = !g.decorative && placeIndexById(C, g.to) <= k;
                        const was = !g.decorative && placeIndexById(C, g.to) <= prev;
                        if (open && !was) {
                            so.gateAnim[g.id] = animate && !this.reducedMotion ? now : -1e9;
                            if (animate) {
                                const from = C.zones[placeIndexById(C, g.from)];
                                const voice = from && from.flavor && from.flavor.gateVoice;
                                if (voice && voice !== 'fanfare') this.synth(voice);
                                this.synth('chime', 0.35);
                            }
                        } else if (!open) so.gateAnim[g.id] = null;
                    });
                    so.boundaryToast = false;
                    so.routeAt = 0;
                    this.updateMapVisuals();
                },
                // Lap wrap pose (rev 3.1): idempotent; from the step at progress
                // ≥ 0.5, from arriveRound and from a rebuild — whichever runs first.
                applyLapPose: function () {
                    const so = this._so, t = so.transition;
                    if (!t || t.kind !== 'advancing' || t.lapPoseApplied) return false;
                    t.lapPoseApplied = true;
                    const st = C.map.start;
                    so.player.x = st.x; so.player.z = st.z; so.player.yaw = st.headingDeg * Math.PI / 180; so.player.pitch = -0.03;
                    so.vel.x = 0; so.vel.z = 0;
                    so.moveInput = null;
                    so.assist = null;
                    this.cancelAutopilot();
                    this.commitMapZone(0, false);
                    this.stars = 0;
                    this.showToast('סבב ' + this.lap);
                    this.updatePlace();
                    return true;
                },
                // Arrival (also ends the opening deploy): the only other writer of
                // attemptLocked = false besides unlockRetry. The player is moved
                // only by the idempotent lap pose (rev 3.1).
                arriveRound: function () {
                    const so = this._so;
                    const t = so.transition;
                    if (t && t.kind === 'advancing') this.applyLapPose();
                    if (so.assist) this.finishAssist();
                    if (so.prevRound) { this.retireRound(so.prevRound); so.prevRound = null; }
                    so.transition = null;
                    this.transitionText = '';
                    this.ammo = C.weapon.magazine;
                    this.reserve = C.weapon.reserve;
                    this.reloading = false;
                    if (so.reloadTimer) { this.clearOwnTimeout(so.reloadTimer); so.reloadTimer = null; }
                    this.wrongOption = null;
                    this.correctIndex = -1;
                    this.resetSchedAt0();
                    this.attemptLocked = false;
                    this.setPhase('engaging');
                    if (so.round) so.round.engagedAt = 0;
                    this.fitShadowCamera(true);
                    if (this.roundKind === 'boss') this.announce('סבב בונוס: המפקד התפצל!');
                    else if (t && t.kind === 'advancing') this.announce('סבב ' + this.lap + ': ' + C.zones[this.zoneIndex].name);
                    this.runQuestionAction();
                },
                // roaming → deploying when the player enters the target place's
                // fight box (the trigger, Go, teleport, skipTransition) or by the
                // DOM roaming timer. Never generates or reports anything.
                enterEncounter: function () {
                    const so = this._so;
                    if (this.phase !== 'roaming' || so.navigated || so.destroyed) return false;
                    const zone = C.zones[this.zoneIndex];
                    this.closeMap();
                    this.cancelAutopilot();
                    if (so.prevRound) { this.retireRound(so.prevRound); so.prevRound = null; }
                    this.startAssist();
                    so.cursorArmed = false;
                    const counters = {zoneIndex: this.zoneIndex, zoneNumber: this.zoneNumber, roundNumber: this.roundNumber, roundInZone: this.roundInZone, roundKind: this.roundKind};
                    so.transition = {kind: 'deploying', from: Object.assign({taggedIndex: -1}, counters), to: counters, questionToken: this.questionToken,
                        durationMs: C.timing.approachMs, lap: this.lap, schedulerMs: 0, outgoingRetired: {untagged: true, tagged: true},
                        resumePhase: 'deploying', lapPoseApplied: false, elapsedMs: 0};
                    so.boundaryToast = false;
                    this.setPhase('deploying');
                    this.spawnRoundVisuals(so.round);
                    this.fitShadowCamera(true);
                    this.updateMapVisuals();
                    this.deployFlavor(zone);
                    this.phaseTimer('deploying', C.timing.approachMs, this.arriveRound);
                    return true;
                },
                // The trigger check (§5.1): the capsule's centre inside the
                // target's fight box while roaming starts its encounter.
                checkTrigger: function () {
                    const so = this._so;
                    if (this.phase !== 'roaming' || so.navigated || so.destroyed) return false;
                    const zone = C.zones[this.zoneIndex];
                    if (!inRect(so.player, strikeOpsPlaceFrame(zone).fightBox)) return false;
                    return this.enterEncounter();
                },
                resetSchedAt0: function () { const s = this._so.sched; s.acc = 0; s.since = null; },
                skipTransition: function () {
                    const so = this._so;
                    if (so.navigated || so.destroyed) return false;
                    if (TRANSITION_PHASES.indexOf(this.phase) === -1) return false;
                    if (this.phase === 'roaming' && !this.findTimer('roaming')) {
                        // GL roaming: put the player on the target's anchor and run the trigger
                        const zone = C.zones[this.zoneIndex], f = strikeOpsPlaceFrame(zone);
                        this.placePlayer(f.anchor.x, f.anchor.z, f.heading, 0);
                        return this.checkTrigger();
                    }
                    const timer = this.findTimer(this.phase);
                    if (!timer) return false;
                    if (timer.id != null) clearTimeout(timer.id);
                    timer.remaining = 0;
                    this.scheduleTimer(timer);
                    return true;
                },
                // Presentation only (§12.1): counters and the derived map state.
                skipToZone: function (n) {
                    const so = this._so;
                    if (so.navigated || so.destroyed || typeof n !== 'number') return false;
                    if (['engaging', 'regroup', 'roaming'].indexOf(this.phase) === -1) return false;
                    const zones = C.zonePlan.zones.length;
                    const target = ((Math.round(n) - 1) % zones + zones) % zones;
                    if (this.phase === 'engaging') {
                        // the place's next round becomes its boss round; its clear targets n
                        so.skipZone = target;
                        this.roundInZone = Math.max(0, C.zonePlan.bossRoundIndex - 1);
                        return true;
                    }
                    if (this.phase === 'regroup' && so.transition) {
                        const timer = this.findTimer('regroup');
                        const remaining = timer ? this.timerRemaining(timer) : 0;
                        if (timer) { if (timer.id != null) clearTimeout(timer.id); so.phaseTimers.delete(timer); }
                        this.zoneIndex = target;
                        this.zoneId = C.zones[target].id;
                        this.roundInZone = 0;
                        so.transition.to.zoneIndex = target;
                        so.transition.to.roundInZone = 0;
                        if (so.round) this.retireRound(so.round);
                        this.roundKind = strikeOpsRoundKind(0, C, false);
                        this.makeLogicalRound();
                        if (target === 0) {
                            this.lap += 1;
                            so.transition.kind = 'advancing';
                            so.transition.lap = this.lap;
                            so.transition.durationMs = C.timing.advanceMs;
                            so.transition.lapPoseApplied = false;
                            this.setPhase('advancing');
                            this.phaseTimer('advancing', Math.max(remaining, 0), this.arriveRound);
                            return true;
                        }
                        so.transition.kind = 'roaming';
                        so.transition.durationMs = this.renderMode === 'dom' ? C.timing.advanceMs : null;
                        this.setPhase('roaming');
                        this.commitMapZone(target, true);
                        if (this.renderMode === 'dom') this.phaseTimer('roaming', Math.max(remaining, 0), this.enterEncounter);
                        return true;
                    }
                    if (this.phase === 'roaming') {
                        this.zoneIndex = target;
                        this.zoneId = C.zones[target].id;
                        if (so.transition) so.transition.to.zoneIndex = target;
                        if (so.round) { const kind = this.roundKind; this.retireRound(so.round); this.roundKind = kind; this.makeLogicalRound(); }
                        this.cancelAutopilot();
                        this.commitMapZone(target, false);
                        return true;
                    }
                    return false;
                },
                runQuestionAction: function () {
                    const q = this.question;
                    this._so.actionToken = this.questionToken;
                    if (q && typeof q.action === 'function') { try { q.action(); } catch (e) { /* speech is optional */ } }
                },
                replayQuestion: function () {
                    const q = this.question;
                    if (q && typeof q.action === 'function') { try { q.action(); } catch (e) { /* speech is optional */ } }
                },
                announce: function (text) {
                    this.live = '';
                    this.$nextTick(() => { if (this.alive()) this.live = text; });
                },
                exitGame: function () {
                    this.$router.push(this.currentApp && this.currentApp.adventure ? '/adventure/world/' + this.currentApp.adventure.worldId : '/app/' + this.currentAppId);
                },

                // ---------------- logical rounds (plain data, no THREE) ----------------
                makeLogicalRound: function () {
                    const so = this._so;
                    const zone = C.zones[this.zoneIndex];
                    const n = Math.min(STRIKE_OPS_MAX_LANES, this.options.length);
                    const set = so.domAnswerOnly ? [] : (zone.laneSets[n] || []);
                    const kind = this.roundKind === 'boss' ? 'copy' : 'soldier';
                    so.enemyCounter += 1;
                    const round = {
                        id: 'r' + this.roundNumber, serial: so.enemyCounter, token: this.questionToken, kind: this.roundKind, zoneIndex: this.zoneIndex,
                        enemies: set.map((laneIndex, index) => ({
                            index, laneIndex, lane: zone.lanes[laneIndex], kind, n: set.length, zoneIndex: this.zoneIndex,
                            shiftMs: 0, dissolved: false, reformAt: -1, hitUntil: -1, exposureAcc: 0, exposedCount: 0, wasHittable: false,
                            entry: zone.approach[laneIndex], bossPoint: zone.boss.points[laneIndex], vis: null, lastPose: null,
                        })),
                        visual: null,
                    };
                    so.round = round;
                    return round;
                },
                // Re-embody the current question as a boss round (forceBossRound).
                reembody: function (kind) {
                    const so = this._so;
                    const old = so.round;
                    this.roundKind = kind;
                    if (old) this.retireRound(old);
                    const round = this.makeLogicalRound();
                    // mid-round copies stand at their lane points at once; from the
                    // briefing they still walk in and split during deploying
                    round.settled = this.phase === 'engaging';
                    this.spawnRoundVisuals(round);
                    return round;
                },
                forceBossRound: function () {
                    const so = this._so;
                    if (so.navigated) return false;
                    if (['briefing', 'engaging', 'loading', 'roaming'].indexOf(this.phase) !== -1 && this.wrongOption == null && this.correctIndex === -1 && this.question) {
                        if (this.roundKind === 'boss') return true;
                        this.reembody('boss');
                        if (this.phase === 'engaging') this.resetSched();
                        return true;
                    }
                    if (PLAY_PHASES.indexOf(this.phase) === -1 && this.phase !== 'paused') return false;
                    so.forceBoss = true;
                    return true;
                },
                enemyCtx: function (e, approachMs) {
                    return {kind: e.kind, index: e.index, n: e.n, lane: e.lane, laneIndex: e.laneIndex, zone: C.zones[e.zoneIndex],
                        shiftMs: e.shiftMs, dissolved: e.dissolved, bossPoint: e.bossPoint, entry: e.entry, approachMs};
                },
                logicalPhase: function () {
                    return (this.phase === 'paused' || this.phase === 'lost') ? (this.resumePhase || 'briefing') : this.phase;
                },
                // ms into the approach beat of the incoming round (null when not approaching).
                approachElapsed: function () {
                    const p = this.logicalPhase(), A = C.timing.approachMs;
                    if (p === 'deploying') return Math.min(A, this.timerElapsed('deploying'));
                    if (p === 'regroup' || p === 'advancing') {
                        const t = this.findTimer(p);
                        if (!t) return A;
                        return (t.ms - this.timerRemaining(t)) - (t.ms - A);
                    }
                    return null;
                },
                // The current round enemy's drawn pose (MAP frame, from the one
                // arena-local pose source) and learning-visible state.
                enemyInfo: function (e) {
                    const info = this.enemyInfoArena(e);
                    if (info.pose && !info.pose.mapped) {
                        info.pose = strikeOpsPoseToMap(C.zones[e.zoneIndex], info.pose);
                        info.pose.mapped = true;
                    }
                    return info;
                },
                enemyInfoArena: function (e) {
                    const so = this._so, p = this.logicalPhase(), rm = this.reducedMotion;
                    const isCopy = e.kind === 'copy';
                    if (p === 'loading' || p === 'briefing') {
                        const pose = strikeOpsPoseAt(this.enemyCtx(e, 0), 0, C, true);
                        return {pose, state: isCopy ? 'split' : 'hidden', hittable: false, alpha: 0};
                    }
                    const round = so.round;
                    if (TRANSITION_PHASES.indexOf(p) !== -1 && !(round && round.settled)) {
                        const a = this.approachElapsed();
                        if (a == null || a < 0) {
                            const pose = strikeOpsPoseAt(this.enemyCtx(e, 0), 0, C, rm);
                            return {pose, state: isCopy ? 'split' : 'hidden', hittable: false, alpha: 0};
                        }
                        const pose = strikeOpsPoseAt(this.enemyCtx(e, a), 0, C, rm);
                        return {pose, state: pose.state, hittable: false, alpha: pose.opacity};
                    }
                    const t = this.schedNow();
                    const pose = strikeOpsPoseAt(this.enemyCtx(e, null), t, C, rm);
                    let state = pose.state, hittable = pose.hittable;
                    if (TRANSITION_PHASES.indexOf(p) !== -1) hittable = false;
                    if (isCopy) {
                        if (e.dissolved) { state = 'dissolved'; hittable = false; }
                        if (p === 'correct') { state = e.index === this.correctIndex ? 'down' : 'dissolved'; hittable = false; }
                    } else {
                        if (p === 'correct') { state = e.index === this.correctIndex ? 'down' : 'cheer'; hittable = false; }
                        else if (e.hitUntil > t) { state = 'hit'; hittable = false; }
                    }
                    if (p === 'correct' && e.lastPose) return {pose: e.lastPose, state, hittable, alpha: 1};
                    return {pose, state, hittable, alpha: pose.opacity};
                },
                // Hittable ms since the round began (closed form for soldiers, so the
                // ledger is identical in every motion mode and frame rate).
                exposureOf: function (e) {
                    if (e.kind === 'copy') return Math.round(e.exposureAcc);
                    const sq = C.squad, period = sq.exposedMs + sq.hiddenMs + 2 * sq.slideMs;
                    const t = this.schedNow();
                    const offset = sq.firstPeekMs + e.index * period / Math.max(1, e.n) + (e.shiftMs || 0);
                    const start0 = offset + sq.slideMs;
                    let total = 0;
                    for (let k = Math.floor((0 - start0) / period) - 1; ; k++) {
                        const a = start0 + k * period, b = a + sq.exposedMs;
                        if (a > t) break;
                        total += Math.max(0, Math.min(b, t) - Math.max(a, 0));
                    }
                    return Math.round(total);
                },
                forceExpose: function (i) {
                    const so = this._so, round = so.round;
                    if ((this.phase !== 'engaging' && this.phase !== 'wrong') || !round || !round.enemies[i]) return false;
                    const e = round.enemies[i];
                    if (e.kind === 'copy') return !e.dissolved;
                    const sq = C.squad, period = sq.exposedMs + sq.hiddenMs + 2 * sq.slideMs;
                    const t = this.schedNow();
                    const base = sq.firstPeekMs + e.index * period / Math.max(1, e.n);
                    const cur = strikeOpsSquadAt(e.index, e.n, t, C, e.shiftMs);
                    // a non-dash cycle that keeps the soldier's current spot
                    const every = Math.max(1, sq.relocateEvery || 1);
                    const cycle = cur.spot === 0 ? 0 : every;
                    e.shiftMs = t - base - sq.slideMs - cycle * period - 1;
                    e.hitUntil = -1;
                    return true;
                },

                // ---------------- presentation of outcomes ----------------
                onCorrectFeedback: function (i) {
                    const so = this._so, round = so.round;
                    this.showHitmarker('correct');
                    this.announce(this.roundKind === 'boss' ? 'פגעתם במפקד האמיתי!' : 'פגיעה!');
                    this.synth('tick');
                    this.ownTimeout(() => this.synth('tagout'), 120);
                    if (this.roundKind === 'boss') this.synth('shimmer');
                    if (round) round.enemies.forEach(e => { const info = this.enemyInfo(e); e.lastPose = info.pose; });
                },
                onWrongFeedback: function (i) {
                    const so = this._so, round = so.round;
                    const e = round && round.enemies[i];
                    this.showHitmarker('wrong');
                    if (this.roundKind === 'boss') {
                        this.announce('זה היה העתק — נסו שוב');
                        this.synth('bonk');
                        this.synth('shimmer');
                        if (e) e.dissolved = true;
                    } else {
                        this.announce('לא החייל הזה — נסו שוב');
                        this.synth('bonk');
                        if (e) e.hitUntil = this.schedNow() + C.timing.retryLockMs;
                    }
                },
                showHitmarker: function (kind) {
                    const so = this._so;
                    this.hitmarker = '';
                    if (so.hitTimer) this.clearOwnTimeout(so.hitTimer);
                    so.hitTimer = this.ownTimeout(() => {
                        so.hitTimer = null;
                        this.hitmarker = kind;
                        so.hitTimer = this.ownTimeout(() => { so.hitTimer = null; this.hitmarker = ''; }, 650);
                    }, 0);
                },
                flashFade: function () {
                    this.fading = false;
                    this.ownTimeout(() => {
                        this.fading = true;
                        this.ownTimeout(() => { this.fading = false; }, C.timing.domCrossFadeMs + 20);
                    }, 0);
                },

                // ---------------- start, pause, resume, lost ----------------
                setupEnvironment: function () {
                    const so = this._so, root = this.$refs.root;
                    const mm = q => (global.matchMedia ? global.matchMedia(q) : null);
                    const rm = mm('(prefers-reduced-motion: reduce)');
                    this.reducedMotion = !!(rm && rm.matches);
                    if (rm) this.listen(rm, 'change', e => { this.reducedMotion = !!e.matches; });
                    const fine = mm('(hover: hover) and (pointer: fine)');
                    const coarse = !(fine && fine.matches);
                    this.isTouch = coarse;
                    this.keyHint = !coarse;
                    const nav = global.navigator || {};
                    const lowMemory = (nav.deviceMemory && nav.deviceMemory <= 2) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 3);
                    this.quality = lowMemory ? 0 : (coarse ? 1 : 2);
                    so.initialTier = this.quality;
                    so.mobileCap = coarse;
                    const doc = global.document;
                    this.listen(global, 'keydown', this.onKeyDown);
                    this.listen(global, 'keyup', this.onKeyUp);
                    this.listen(global, 'blur', () => { so.keys.clear(); so.sprintKey = false; this.ads = false; });
                    this.listen(doc, 'mousemove', this.onMouseMove);
                    this.listen(global, 'mouseup', this.onMouseUp);
                    this.listen(doc, 'pointerlockchange', this.onPointerLockChange);
                    this.listen(doc, 'pointerlockerror', this.onPointerLockError);
                    this.listen(doc, 'visibilitychange', this.onVisibility);
                    this.listen(doc, 'fullscreenchange', this.onFullscreenChange);
                    this.listen(doc, 'webkitfullscreenchange', this.onFullscreenChange);
                    if (typeof global.ResizeObserver === 'function' && root) {
                        so.resizeObserver = new global.ResizeObserver(() => this.scheduleMeasure());
                        so.resizeObserver.observe(root);
                        // the counter pocket is sized in rem: a root text-size change (browser
                        // zoom of text) re-measures plates and the answer layout
                        if (this.$refs.counter) so.resizeObserver.observe(this.$refs.counter);
                    } else {
                        this.listen(global, 'resize', this.scheduleMeasure);
                    }
                    this.measure();
                },
                noteStartPointer: function (e) { if (e && e.pointerType) this._so.lastPointerType = e.pointerType; },
                start: function (event) {
                    const so = this._so;
                    if (this.phase !== 'briefing') return;
                    this.ensureAudio();
                    const pt = (event && event.pointerType) || so.lastPointerType;
                    const touch = pt === 'touch' || (!pt && this.isTouch);
                    if (this.renderMode === 'gl') {
                        if (touch) {
                            this.aimMode = 'touch';
                            this.isTouch = true;
                            this.enterFullscreen();
                        } else {
                            this.aimMode = 'cursor';
                            this.requestLock();
                        }
                    }
                    const counters = {zoneIndex: this.zoneIndex, zoneNumber: this.zoneNumber, roundNumber: this.roundNumber, roundInZone: this.roundInZone, roundKind: this.roundKind};
                    so.transition = {kind: 'deploying', from: Object.assign({taggedIndex: -1}, counters), to: counters, questionToken: this.questionToken,
                        durationMs: C.timing.approachMs, lap: this.lap, schedulerMs: 0, outgoingRetired: {untagged: true, tagged: true},
                        resumePhase: 'deploying', lapPoseApplied: false, elapsedMs: 0};
                    this.closeMap();
                    this.setPhase('deploying');
                    this.focusRoot();
                    this.deployFlavor(C.zones[this.zoneIndex]);
                    this.phaseTimer('deploying', C.timing.approachMs, this.arriveRound);
                },
                // §5.1 per-place flavour at deploying: the live line and a 1.6 s
                // banner sub-line (owned timer; cleared on any later phase).
                deployFlavor: function (zone) {
                    const so = this._so, line = (zone.flavor && zone.flavor.deployLine) || ('חוליה ב' + zone.name + '!');
                    this.announce(line);
                    this.subLine = line;
                    if (so.subLineTimer) this.clearOwnTimeout(so.subLineTimer);
                    so.subLineTimer = this.ownTimeout(() => { so.subLineTimer = null; this.subLine = ''; }, C.map.toastMs);
                },
                requestLock: function () {
                    const so = this._so, canvas = so.canvas;
                    so.wantLock = false;
                    if (!canvas || !canvas.requestPointerLock || !global.document || !('pointerLockElement' in global.document)) return;
                    so.wantLock = true;
                    try {
                        const p = canvas.requestPointerLock();
                        if (p && typeof p.catch === 'function') p.catch(() => this.onPointerLockError());
                    } catch (e) {
                        this.onPointerLockError();
                    }
                },
                onPointerLockChange: function () {
                    const so = this._so;
                    if (so.destroyed) return;
                    const locked = !!(so.canvas && global.document.pointerLockElement === so.canvas);
                    if (locked) {
                        this.aimMode = 'locked';
                        so.cursor = null;
                        return;
                    }
                    if (this.aimMode === 'locked') {
                        const byTab = so.unlockReason === 'tab';
                        so.unlockReason = null;
                        this.aimMode = 'cursor';
                        if (!byTab && PAUSABLE.indexOf(this.phase) !== -1) this.pause('lock');
                        so.wantLock = true;
                    }
                },
                onPointerLockError: function () {
                    const so = this._so;
                    if (so.destroyed) return;
                    so.wantLock = false;
                    if (this.aimMode === 'locked') this.aimMode = 'cursor';
                },
                enterFullscreen: function () {
                    const so = this._so, root = this.$refs.root, doc = global.document;
                    if (!root || !doc || doc.fullscreenElement || doc.webkitFullscreenElement) return;
                    const req = root.requestFullscreen || root.webkitRequestFullscreen;
                    if (!req) return;
                    try {
                        const p = req.call(root);
                        so.enteredFullscreen = true;
                        if (p && typeof p.catch === 'function') p.catch(() => { so.enteredFullscreen = false; });
                    } catch (e) { so.enteredFullscreen = false; }
                },
                onFullscreenChange: function () { this.ownTimeout(() => this.measure(), 100); },
                onVisibility: function () {
                    if (global.document && global.document.hidden) this.pause('hidden');
                },
                pause: function (reason) {
                    const so = this._so;
                    if (PAUSABLE.indexOf(this.phase) === -1 || so.destroyed) return false;
                    this.pauseTimers();
                    this.resumePhase = this.phase;
                    this.setPhase('paused');
                    this.stopLoop();
                    // rev 3.1: every held input is released and forgotten; the
                    // autopilot keeps its target (an explicit request)
                    this.releaseInputs();
                    if (so.audio && so.audio.state === 'running' && so.audio.suspend) so.audio.suspend().catch(() => {});
                    if (reason !== 'lock' && so.canvas && global.document && global.document.pointerLockElement === so.canvas) global.document.exitPointerLock();
                    this.$nextTick(() => { if (this.alive() && this.$refs.resume && reason !== 'hidden') this.$refs.resume.focus(); });
                    return true;
                },
                resume: function (event) {
                    const so = this._so;
                    if (this.phase !== 'paused' || so.destroyed) return false;
                    const target = this.resumeTarget();
                    this.resumePhase = null;
                    this.setPhase(target);
                    if (so.assist) this.finishAssist();
                    this.resumeTimers();
                    if (so.audio && so.audio.state === 'suspended' && so.audio.resume) so.audio.resume().catch(() => {});
                    so.fps.frames = 0; so.fps.start = 0;
                    so.lastMoveInputAt = nowMs();
                    this.startLoop();
                    this.focusRoot();
                    const touch = !!(event && event.pointerType === 'touch');
                    if (so.wantLock && !touch && target !== 'briefing' && this.aimMode !== 'touch') this.requestLock();
                    if (target === 'briefing') this.focusStart();
                    return true;
                },
                focusRoot: function () {
                    const root = this.$refs.root;
                    if (root && root.focus) { try { root.focus({preventScroll: true}); } catch (e) { root.focus(); } }
                },
                focusStart: function () {
                    this.$nextTick(() => { if (this.alive() && this.$refs.start) this.$refs.start.focus(); });
                },
                onContextLost: function () {
                    const so = this._so;
                    if (so.destroyed || this.phase === 'lost' || this.renderMode !== 'gl') return;
                    so.gfx += 1;
                    this.pauseTimers();
                    so.timers.forEach(id => clearTimeout(id));
                    so.timers.clear();
                    so.hitTimer = null; so.reloadTimer = null; so.measureTimer = null;
                    this.reloading = false;
                    this.stopLoop();
                    this.releaseInputs();
                    this.cancelAutopilot();
                    this.closeMap();
                    if (so.audio && so.audio.state === 'running' && so.audio.suspend) so.audio.suspend().catch(() => {});
                    if (this.phase !== 'paused') this.resumePhase = this.phase;
                    this.setPhase('lost');
                    if (so.canvas && global.document && global.document.pointerLockElement === so.canvas) global.document.exitPointerLock();
                    this.releaseGraphics(false);
                },
                // "Continue without 3D": DOM render mode, the resume target rule, the
                // lock untouched (§4). Also the restart-failure path.
                continueInDom: function () {
                    const so = this._so;
                    if (this.phase !== 'lost' && this.phase !== 'loading') return false;
                    this.renderMode = 'dom';
                    so.restoring = false;
                    this.cancelAutopilot();
                    this.closeMap();
                    so.assist = null;
                    const target = this.resumeTarget();
                    this.resumePhase = null;
                    this.setPhase(target);
                    // the walk cannot continue without a scene: DOM roaming is timed
                    if (target === 'roaming' && !this.findTimer('roaming')) {
                        if (so.transition) so.transition.durationMs = C.timing.advanceMs;
                        this.phaseTimer('roaming', C.timing.advanceMs, this.enterEncounter);
                    }
                    this.resumeTimers();
                    if (so.audio && so.audio.state === 'suspended' && so.audio.resume) so.audio.resume().catch(() => {});
                    if (target === 'engaging' && !this.findTimer() && so.actionToken !== this.questionToken) this.runQuestionAction();
                    if (target === 'briefing') this.focusStart();
                    return true;
                },
                // "Restart": a new renderer on the same instance and route (§4). The run
                // token and the frozen learning timers are untouched; only gfx changes.
                restartInPlace: function () {
                    const so = this._so;
                    if (this.phase !== 'lost') return false;
                    so.gfx += 1;
                    this.cancelAutopilot();
                    if (so.assist) this.finishAssist();
                    if (!this.initScene()) return this.continueInDom();
                    so.restoring = true;
                    this.setPhase('loading');
                    if (this.resumeTarget() !== 'briefing' && this.aimMode !== 'touch') this.requestLock();
                    this.applyQuality(this.quality);
                    this.loadAssets();
                    this.startLoop();
                    return true;
                },
                finishRestore: function () {
                    const so = this._so;
                    so.restoring = false;
                    const target = this.resumeTarget();
                    this.resumePhase = null;
                    this.setPhase(target);
                    // The tab was hidden while the scene reloaded (loading is not
                    // pausable): stay paused, timers frozen, until an explicit resume.
                    if (global.document && global.document.hidden && this.pause('hidden')) return;
                    this.resumeTimers();
                    if (so.audio && so.audio.state === 'suspended' && so.audio.resume) so.audio.resume().catch(() => {});
                    if (target === 'briefing') this.focusStart(); else this.focusRoot();
                },
                // Suspension (rev 3.1): every captured pointer is released and
                // forgotten (later events of those ids are ignored), held keys,
                // the virtual input, velocity, sprint, ADS and lock-on cleared.
                releaseInputs: function () {
                    const so = this._so;
                    const release = (el, id) => { if (el && id != null && el.releasePointerCapture) { try { el.releasePointerCapture(id); } catch (err) { /* not captured */ } } };
                    if (so.stick.id != null) { so.deadPointers.add(so.stick.id); release(this.$refs.stick, so.stick.id); }
                    if (so.look) { so.deadPointers.add(so.look.id); release(this.$refs.host, so.look.id); }
                    if (so.firePointerId != null) { so.deadPointers.add(so.firePointerId); so.firePointerId = null; }
                    so.stick = {x: 0, y: 0, id: null};
                    if (this.$refs.stickKnob) this.$refs.stickKnob.style.transform = '';
                    so.look = null;
                    so.keys.clear();
                    so.sprintKey = false;
                    so.moveInput = null;
                    so.vel.x = 0; so.vel.z = 0;
                    so.sprinting = false;
                    so.speed = 0;
                    so.adsHeld = false;
                    this.ads = false;
                    this.cancelLock();
                },

                // ---------------- teardown ----------------
                teardown: function () {
                    const so = this._so;
                    if (!so || so.destroyed) return;
                    so.destroyed = true;
                    so.run += 1;
                    so.gfx += 1;
                    this.phase = 'left';
                    this.syncSched();
                    this.stopLoop();
                    so.phaseTimers.forEach(t => { if (t.id != null) clearTimeout(t.id); t.id = null; });
                    so.phaseTimers.clear();
                    so.timers.forEach(id => clearTimeout(id));
                    so.timers.clear();
                    so.listeners.forEach(entry => {
                        const target = entry[0];
                        if (entry[4]) { if (target.removeListener) target.removeListener(entry[2]); } else target.removeEventListener(entry[1], entry[2], entry[3]);
                    });
                    so.listeners.length = 0;
                    if (so.resizeObserver) { so.resizeObserver.disconnect(); so.resizeObserver = null; }
                    const doc = global.document;
                    if (doc && so.canvas && doc.pointerLockElement === so.canvas && doc.exitPointerLock) doc.exitPointerLock();
                    if (doc && so.enteredFullscreen && (doc.fullscreenElement === this.$refs.root) && doc.exitFullscreen) { const p = doc.exitFullscreen(); if (p && p.catch) p.catch(() => {}); }
                    so.enteredFullscreen = false;
                    if (so.audio) { try { const p = so.audio.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* closed */ } so.audio = null; so.noise = null; }
                    so.keys.clear();
                    so.lock = null;
                    so.transition = null;
                    this.releaseGraphics(true);
                    so.round = null;
                    so.prevRound = null;
                },
                releaseGraphics: function (forceLoss) {
                    const so = this._so;
                    so.rounds.slice().forEach(round => this.retireRound(round, true));
                    this.releaseMap();
                    so.shared.forEach(item => { try { if (item && item.dispose) item.dispose(); } catch (e) { /* lost context */ } });
                    so.shared.clear();
                    if (so.canvas) this.unlistenTarget(so.canvas);
                    if (so.renderer) {
                        try { so.renderer.dispose(); } catch (e) { /* lost context */ }
                        if (forceLoss) { try { so.renderer.forceContextLoss(); } catch (e) { /* already lost */ } }
                    }
                    if (so.canvas && so.canvas.parentNode) so.canvas.parentNode.removeChild(so.canvas);
                    so.renderer = null;
                    so.canvas = null;
                    so.scene = null;
                    so.camera = null;
                    so.vmScene = null;
                    so.vmCamera = null;
                    so.mats = null;
                    so.assets = null;
                    so.backdrop = null;
                    so.particles = null;
                    so.blobs = null;
                    so.minimapCtx = null;
                    so.shadowKey = '';
                },

                // ---------------- scene ----------------
                initScene: function () {
                    const so = this._so, T = global.THREE, host = this.$refs.host;
                    if (!T || !T.WebGLRenderer || !host || so.failGL) return false;
                    let renderer;
                    try {
                        renderer = new T.WebGLRenderer({antialias: C.quality.antialias[this.quality], powerPreference: 'high-performance'});
                    } catch (e) {
                        return false;
                    }
                    if (!renderer || !renderer.getContext || !renderer.getContext()) { try { renderer.dispose(); } catch (e) { /* none */ } return false; }
                    so.renderer = renderer;
                    so.canvas = renderer.domElement;
                    so.canvas.className = 'so-canvas';
                    so.canvas.setAttribute('aria-hidden', 'true');
                    renderer.info.autoReset = false;
                    renderer.autoClear = false;
                    renderer.outputEncoding = T.sRGBEncoding;
                    renderer.shadowMap.type = T.PCFSoftShadowMap;
                    const shadowRender = renderer.shadowMap.render;
                    renderer.shadowMap.render = function () {
                        const c0 = renderer.info.render.calls, t0 = renderer.info.render.triangles;
                        shadowRender.apply(this, arguments);
                        so.stats.shadowCalls += renderer.info.render.calls - c0;
                        so.stats.shadowTris += renderer.info.render.triangles - t0;
                    };
                    host.appendChild(so.canvas);
                    this.listen(so.canvas, 'webglcontextlost', () => this.onContextLost());
                    this.listen(so.canvas, 'webglcontextrestored', () => { /* non-resumable by design */ });

                    const scene = so.scene = new T.Scene();
                    scene.fog = new T.Fog(0xcfe4f5, 70, 230);
                    const camera = so.camera = new T.PerspectiveCamera(50, so.view.w / so.view.h, 0.05, 400);
                    camera.rotation.order = 'YXZ';
                    so.hemi = new T.HemisphereLight(0xd8ecff, 0x557a35, 0.85);
                    scene.add(so.hemi);
                    const sun = so.sun = new T.DirectionalLight(0xfff0d8, 1.05);
                    sun.shadow.bias = -0.0006;
                    sun.shadow.normalBias = 0.02;
                    scene.add(sun);
                    scene.add(sun.target);
                    // the moon (night themes, §7): one sprite far out along the sun direction
                    const moonTex = this.makeRadialTexture('rgba(255,255,250,1)', 'rgba(220,230,255,0)');
                    const moonMat = new T.SpriteMaterial({map: moonTex, fog: false, depthWrite: false, transparent: true});
                    so.shared.add(moonTex); so.shared.add(moonMat);
                    so.moon = new T.Sprite(moonMat);
                    so.moon.scale.set(26, 26, 1);
                    so.moon.position.set(90, 120, 240);
                    so.moon.visible = false;
                    scene.add(so.moon);
                    // night stars: fixed screen-size points on a far dome (one draw
                    // call), not pixels on the stretched background gradient
                    const starPos = [];
                    for (let i = 0; i < 160; i++) {
                        const az = i * 2.39996, el = (8 + ((i * 37) % 71)) * Math.PI / 180, r = 330;
                        starPos.push(1 + Math.cos(el) * Math.sin(az) * r, Math.sin(el) * r, 24 + Math.cos(el) * Math.cos(az) * r);
                    }
                    const starGeo = new T.BufferGeometry();
                    starGeo.setAttribute('position', new T.Float32BufferAttribute(starPos, 3));
                    const starMat = new T.PointsMaterial({color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85, depthWrite: false});
                    so.shared.add(starGeo); so.shared.add(starMat);
                    so.stars = new T.Points(starGeo, starMat);
                    so.stars.frustumCulled = false;
                    so.stars.renderOrder = -1;
                    so.stars.visible = false;
                    scene.add(so.stars);
                    // sky: a vertical gradient as the background (exact theme colour at the top)
                    so.skyCanvas = global.document.createElement('canvas');
                    so.skyCanvas.width = 4; so.skyCanvas.height = 256;
                    so.skyTex = new T.CanvasTexture(so.skyCanvas);
                    so.skyTex.encoding = T.sRGBEncoding;
                    so.shared.add(so.skyTex);
                    scene.background = so.skyTex;

                    const mats = so.mats = {
                        blob: new T.MeshBasicMaterial({transparent: true, depthWrite: false, opacity: 0.5}),
                        ground: new T.MeshLambertMaterial({color: 0x5e9b3a}),
                        dirt: new T.MeshLambertMaterial({color: 0xa8835a, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}),
                        hills: new T.MeshLambertMaterial({color: 0x8a9a5b}),
                        proc: new T.MeshStandardMaterial({color: 0xcccccc, roughness: 0.6, name: 'Team'}),
                        procTrim: new T.MeshStandardMaterial({color: 0x333333, roughness: 0.5, name: 'Trim'}),
                        standIn: {
                            industrial: new T.MeshLambertMaterial({color: 0x9aa7b4}), survival: new T.MeshLambertMaterial({color: 0x8d6e4c}),
                            fantasy: new T.MeshLambertMaterial({color: 0xc8a165}), barricade: new T.MeshLambertMaterial({color: 0xd8c39a}),
                            crate: new T.MeshLambertMaterial({color: 0x9c7446}),
                        },
                    };
                    [mats.blob, mats.ground, mats.dirt, mats.hills, mats.proc, mats.procTrim].forEach(m => so.shared.add(m));
                    Object.keys(mats.standIn).forEach(k => so.shared.add(mats.standIn[k]));
                    const blobTex = this.makeRadialTexture('rgba(0,0,0,0.7)', 'rgba(0,0,0,0)');
                    mats.blob.map = blobTex;
                    so.shared.add(blobTex);
                    const blobGeo = new T.PlaneGeometry(1, 1);
                    blobGeo.rotateX(-Math.PI / 2);
                    so.shared.add(blobGeo);
                    so.blobs = new T.InstancedMesh(blobGeo, mats.blob, 9);
                    so.blobs.count = 1;
                    so.blobs.frustumCulled = false;
                    so.blobs.renderOrder = 1;
                    so.blobFree = new T.Matrix4().makeTranslation(0, -500, 0);
                    so.blobs.setMatrixAt(0, so.blobFree);
                    scene.add(so.blobs);
                    so.geo = {
                        box: new T.BoxGeometry(1, 1, 1),
                        cyl: new T.CylinderGeometry(0.5, 0.5, 1, 12),
                        capsule: new T.CylinderGeometry(0.3, 0.26, 0.75, 12),
                        head: new T.SphereGeometry(0.27, 14, 10),
                        limb: new T.CylinderGeometry(0.08, 0.07, 0.62, 8),
                    };
                    Object.keys(so.geo).forEach(k => so.shared.add(so.geo[k]));
                    this.initParticles();

                    // first-person view model, drawn after the scene with depth cleared
                    const vmScene = so.vmScene = new T.Scene();
                    const vmCamera = so.vmCamera = new T.PerspectiveCamera(50, so.view.w / so.view.h, 0.01, 10);
                    so.vmHemi = new T.HemisphereLight(0xe6f2ff, 0x4a5a3a, 1.0);
                    vmScene.add(so.vmHemi);
                    const vmSun = new T.DirectionalLight(0xffffff, 0.9);
                    vmSun.position.set(-1, 2, 1);
                    vmScene.add(vmSun);
                    so.gunRig = new T.Group();
                    vmScene.add(so.gunRig);
                    const flashTex = this.makeStarTexture();
                    so.shared.add(flashTex);
                    const flashMat = new T.SpriteMaterial({map: flashTex, color: 0xffe7a8, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0});
                    so.shared.add(flashMat);
                    so.muzzle = new T.Sprite(flashMat);
                    so.muzzle.scale.set(0.18, 0.18, 1);
                    so.gunRig.add(so.muzzle);
                    this.buildProceduralGun();
                    this.applySceneTheme();
                    this.measure();
                    return true;
                },
                // One pooled Points cloud for foam puffs, stars, dust and dissolve
                // sparkles; always drawn (unused points parked below the ground) so its
                // program is compiled up front.
                initParticles: function () {
                    const so = this._so, T = global.THREE, N = 48;
                    const geo = new T.BufferGeometry();
                    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
                    for (let i = 0; i < N; i++) pos[i * 3 + 1] = -500;
                    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
                    geo.setAttribute('color', new T.BufferAttribute(col, 3));
                    const tex = this.makeRadialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
                    const mat = new T.PointsMaterial({size: 0.22, map: tex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true});
                    const pts = new T.Points(geo, mat);
                    pts.frustumCulled = false;
                    so.scene.add(pts);
                    [geo, tex, mat].forEach(x => so.shared.add(x));
                    so.particles = {pts, geo, items: [], N};
                },
                // kind: 'puff' | 'stars' | 'dust' | 'sparkle'; world position.
                spawnParticles: function (kind, p, count) {
                    const so = this._so, P = so.particles;
                    if (!P || this.reducedMotion) return;
                    const cap = C.quality.particleCap[this.quality];
                    const colors = {puff: [1, 0.95, 0.75], stars: [1, 0.85, 0.25], dust: [0.75, 0.72, 0.66], sparkle: [0.6, 0.95, 1]};
                    for (let k = 0; k < count; k++) {
                        if (P.items.length >= cap) P.items.shift();
                        const a = Math.random() * Math.PI * 2, s = kind === 'stars' ? 0.9 : 0.5;
                        P.items.push({x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * s * Math.random(), vy: (kind === 'sparkle' ? 1.2 : 0.6) + Math.random() * 0.6, vz: Math.sin(a) * s * Math.random(), life: 0, max: kind === 'stars' ? 700 : 450, c: colors[kind] || colors.puff});
                    }
                },
                updateParticles: function (dtMs) {
                    const so = this._so, P = so.particles;
                    if (!P) return;
                    const pos = P.geo.attributes.position.array, col = P.geo.attributes.color.array, dt = dtMs / 1000;
                    P.items = P.items.filter(it => (it.life += dtMs) < it.max);
                    for (let i = 0; i < P.N; i++) {
                        const it = P.items[i];
                        if (!it) { pos[i * 3 + 1] = -500; continue; }
                        it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; it.vy -= 0.8 * dt;
                        pos[i * 3] = it.x; pos[i * 3 + 1] = it.y; pos[i * 3 + 2] = it.z;
                        const f = 1 - it.life / it.max;
                        col[i * 3] = it.c[0] * f; col[i * 3 + 1] = it.c[1] * f; col[i * 3 + 2] = it.c[2] * f;
                    }
                    P.geo.attributes.position.needsUpdate = true;
                    P.geo.attributes.color.needsUpdate = true;
                },
                makeRadialTexture: function (inner, outer) {
                    const T = global.THREE, c = global.document.createElement('canvas');
                    c.width = c.height = 64;
                    const g = c.getContext('2d');
                    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
                    grad.addColorStop(0, inner);
                    grad.addColorStop(1, outer);
                    g.fillStyle = grad;
                    g.fillRect(0, 0, 64, 64);
                    return new T.CanvasTexture(c);
                },
                makeStarTexture: function () {
                    const T = global.THREE, c = global.document.createElement('canvas');
                    c.width = c.height = 64;
                    const g = c.getContext('2d');
                    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 30);
                    grad.addColorStop(0, 'rgba(255,255,240,1)');
                    grad.addColorStop(0.35, 'rgba(255,210,120,0.9)');
                    grad.addColorStop(1, 'rgba(255,150,40,0)');
                    g.fillStyle = grad;
                    g.beginPath();
                    for (let k = 0; k < 12; k++) {
                        const a = k * Math.PI / 6, r = k % 2 ? 9 : 31;
                        g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
                    }
                    g.closePath();
                    g.fill();
                    return new T.CanvasTexture(c);
                },
                drawSky: function (s) {
                    const so = this._so, c = so.skyCanvas;
                    if (!c) return;
                    const g = c.getContext('2d');
                    const grad = g.createLinearGradient(0, 0, 0, 256);
                    grad.addColorStop(0, s.skyTop);
                    grad.addColorStop(0.18, s.skyTop);
                    grad.addColorStop(0.62, s.skyHorizon);
                    grad.addColorStop(1, s.haze);
                    g.fillStyle = grad;
                    g.fillRect(0, 0, 4, 256);
                    // stars are scene points (so.stars), never background pixels:
                    // the 4 px gradient is stretched across the whole view
                    if (so.stars) so.stars.visible = !!s.nightLights;
                    if (so.skyTex) so.skyTex.needsUpdate = true;
                },
                refreshTheme: function () {
                    const requested = typeof getLocalStorage === 'function' ? getLocalStorage('theme', 'base') : 'base';
                    const kit = resolveStrikeOpsTheme(requested);
                    if (kit.key !== this.soTheme.key) {
                        this.soTheme = kit;
                        this.applySceneTheme();
                        this.afterContentChange();
                    }
                },
                applySceneTheme: function () {
                    const so = this._so, T = global.THREE;
                    if (!so.scene || !so.mats || !T) return;
                    const s = this.soTheme.scene, m = so.mats;
                    const farScale = C.quality.fogFarScale[this.quality] || 1;
                    so.scene.fog.color.set(s.haze);
                    so.scene.fog.near = s.hazeNear * farScale;
                    so.scene.fog.far = s.hazeFar * farScale;
                    this.drawSky(s);
                    so.hemi.color.set(s.hemiSky);
                    so.hemi.groundColor.set(s.hemiGround);
                    so.hemi.intensity = s.hemiIntensity;
                    so.sun.color.set(s.sunColor);
                    so.sun.intensity = s.sunIntensity;
                    if (so.vmHemi) so.vmHemi.intensity = 0.7 + 0.3 * s.hemiIntensity;
                    const base = THEME_MOTIFS.base;
                    const ratio = (c, b) => { const x = parseHex(c), y = parseHex(b); return x.map((v, i) => clamp(v / Math.max(1, y[i]), 0, 2.4)); };
                    const gm = ratio(s.ground, base.ground);
                    m.ground.color.setRGB(gm[0], gm[1], gm[2]);
                    m.dirt.color.setRGB(Math.min(1, gm[0] * 0.5 + 0.5), Math.min(1, gm[1] * 0.5 + 0.5), Math.min(1, gm[2] * 0.5 + 0.5));
                    m.hills.color.set(mix(s.ground, s.haze, 0.35));
                    if (m.shed) { m.shed.color.set(s.shedSiding); this.themeShed(); }
                    if (m.deck) m.deck.color.set(s.deck);
                    if (m.barricade) m.barricade.color.set(mix('#e8d3a0', s.coverTint, 0.5));
                    (m.crate || []).forEach(c => { c.color.copy(c.userData.base).multiply(new T.Color(s.coverTint)); });
                    // dusk/night: dim clouds, the moon in place of the sun, floodlight cones
                    if (so.clouds) so.clouds.forEach(sp => { sp.material.color.set(s.nightLights ? mix(s.skyHorizon, '#ffffff', 0.35) : '#ffffff'); sp.material.opacity = s.nightLights ? 0.45 : 0.95; });
                    if (so.moon) so.moon.visible = !!s.nightLights;
                    if (so.map && so.map.cones) so.map.cones.visible = !!s.nightLights;
                    if (m.grassClump) m.grassClump.color.setRGB(Math.min(1.6, gm[0]), Math.min(1.6, gm[1]), Math.min(1.6, gm[2]));
                    // the shared kit materials follow the theme's light (dusk/night
                    // variants of the same compound, §7): a soft multiplier, never a hue swap
                    if (m.kit) Object.keys(m.kit).forEach(k => { if (k !== 'barricade' && m.kit[k] && m.kit[k].color) m.kit[k].color.set(s.kitTint || '#ffffff'); });
                    so.minimapLayer = null;
                    this.fitShadowCamera(true);
                    // live per-enemy clones (preserving each clone's opacity/effect state)
                    [so.round, so.prevRound].forEach(r => { if (r) r.enemies.forEach(e => this.tintEnemy(e)); });
                },

                // Theme sheds (§7): base keeps the yellow derived palette; other keys
                // recolour its siding and trim swatches on a canvas copy (once per
                // theme change, no shader change), e.g. khaki, pink, steel-blue, charcoal.
                themeShed: function () {
                    const so = this._so, T = global.THREE, a = so.assets, m = so.mats, s = this.soTheme.scene;
                    const base = a && a.tex && a.tex.shed;
                    if (!m || !m.shed || !base || !base.image || !global.document) return;
                    // a white siding multiplier keeps the original yellow palette (base)
                    if (String(s.shedSiding).toLowerCase() === '#ffffff') { if (m.shed.map !== base) m.shed.map = base; return; }
                    const img = base.image, w = img.width || 0, h = img.height || 0;
                    if (!w || !h) return;
                    const c = so.shedCanvas || (so.shedCanvas = global.document.createElement('canvas'));
                    if (c.width !== w) { c.width = w; c.height = h; }
                    const g = c.getContext && c.getContext('2d', {willReadFrequently: true});
                    if (!g) return;
                    let data;
                    try { g.drawImage(img, 0, 0); data = g.getImageData(0, 0, w, h); } catch (e) { return; }
                    const px = data.data, sid = parseHex(s.shedSiding) || [255, 255, 255], trim = parseHex(s.shedTrim) || [255, 255, 255];
                    for (let i = 0; i < px.length; i += 4) {
                        const r = px[i], gg = px[i + 1], b = px[i + 2];
                        if (r > 215 && gg > 150 && gg < 225 && b < 130) {
                            const k = (r + gg + b) / 515;
                            px[i] = Math.min(255, sid[0] * k); px[i + 1] = Math.min(255, sid[1] * k); px[i + 2] = Math.min(255, sid[2] * k);
                        } else if (r > 225 && gg > 225 && b > 215) { px[i] = trim[0]; px[i + 1] = trim[1]; px[i + 2] = trim[2]; }
                    }
                    g.putImageData(data, 0, 0);
                    if (!so.shedTex || !so.shared.has(so.shedTex)) {
                        so.shedTex = new T.CanvasTexture(c);
                        so.shedTex.encoding = T.sRGBEncoding;
                        so.shedTex.flipY = false;
                        so.shedTex.magFilter = base.magFilter; so.shedTex.minFilter = base.minFilter;
                        so.shared.add(so.shedTex);
                    }
                    so.shedTex.needsUpdate = true;
                    m.shed.map = so.shedTex;
                    // the recoloured siding follows the night light like the kits
                    m.shed.color.set(s.kitTint || '#ffffff');
                },
                // ---------------- assets ----------------
                loadAssets: function () {
                    const so = this._so, T = global.THREE, run = so.run, gfx = so.gfx;
                    const stale = () => run !== so.run || gfx !== so.gfx || so.navigated || so.destroyed;
                    const assets = so.assets = {enemy: null, pieces: {}, tex: {}, gun: null, crate: null, settled: false, gfx};
                    so.loading = {run, gfx};
                    const tasks = [];
                    const loader = T.GLTFLoader ? new T.GLTFLoader() : null;
                    const loadGltf = url => new Promise((resolve, reject) => {
                        if (!loader) { reject(new Error('no loader')); return; }
                        loader.load(url, resolve, undefined, reject);
                    });
                    const late = () => stale() || assets.settled || so.assets !== assets;
                    const lod = !!C.quality.useLod[so.initialTier == null ? this.quality : so.initialTier];
                    tasks.push(loadGltf(lod ? C.enemyModel.lodUrl : C.enemyModel.url).then(gltf => {
                        if (late()) { this.disposeTree(gltf.scene); return; }
                        this.registerEnemyTemplate(gltf, lod);
                    }).catch(() => null));
                    Object.keys(C.kitPieces).forEach(key => {
                        tasks.push(loadGltf(C.kitPieces[key].url).then(gltf => {
                            if (late()) { this.disposeTree(gltf.scene); return; }
                            this.ownTree(gltf.scene);
                            assets.pieces[key] = gltf.scene;
                        }).catch(() => null));
                    });
                    const texLoader = new T.TextureLoader();
                    ['shed', 'grass', 'dirt'].forEach(key => {
                        tasks.push(new Promise(resolve => texLoader.load(C.textures[key], resolve, undefined, () => resolve(null))).then(tex => {
                            if (!tex) return;
                            if (late()) { tex.dispose(); return; }
                            tex.encoding = T.sRGBEncoding;
                            assets.tex[key] = tex;
                            so.shared.add(tex);
                        }));
                    });
                    tasks.push(this.parseEmbedded('crate').then(sc => { if (sc && late()) { this.disposeTree(sc); return; } this.ownTree(sc); assets.crate = sc; }));
                    tasks.push(this.parseEmbedded(C.weapon.model).then(sc => { if (sc && late()) { this.disposeTree(sc); return; } this.ownTree(sc); assets.gun = sc; }));
                    const settle = () => {
                        if (stale() || assets.settled || so.assets !== assets) return;
                        assets.settled = true;
                        this.onAssetsReady();
                    };
                    Promise.all(tasks).then(settle);
                    this.ownTimeout(settle, C.loadTimeoutMs);
                },
                parseEmbedded: function (key) {
                    const T = global.THREE;
                    const data = global.SHOOTER_MODEL_DATA && global.SHOOTER_MODEL_DATA[key];
                    if (!data || !T.GLTFLoader) return Promise.resolve(null);
                    return new Promise(resolve => {
                        try { new T.GLTFLoader().parse(base64ToArrayBuffer(data), '', g => resolve(g.scene), () => resolve(null)); } catch (e) { resolve(null); }
                    });
                },
                // Ownership from load time: a loaded scene's geometries, materials
                // and textures join so.shared as soon as it arrives, so a context
                // loss or teardown before finalizeKits() / registerGun() still
                // disposes them in releaseGraphics().
                ownTree: function (root) {
                    const so = this._so;
                    if (!root || !so.shared) return;
                    root.traverse(o => {
                        if (o.geometry) so.shared.add(o.geometry);
                        const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
                        ms.forEach(m => { so.shared.add(m); Object.keys(m).forEach(k => { if (m[k] && m[k].isTexture) so.shared.add(m[k]); }); });
                    });
                },
                disposeTree: function (root) {
                    if (!root) return;
                    root.traverse(o => {
                        if (o.geometry) o.geometry.dispose();
                        const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
                        ms.forEach(m => { Object.keys(m).forEach(k => { if (m[k] && m[k].isTexture) m[k].dispose(); }); m.dispose(); });
                    });
                },
                registerEnemyTemplate: function (gltf, lod) {
                    const so = this._so, T = global.THREE;
                    const scene = gltf.scene;
                    scene.updateMatrixWorld(true);
                    const box = new T.Box3().setFromObject(scene);
                    const height = Math.max(0.01, box.max.y - box.min.y);
                    const clips = strikeOpsResolveClipRoles(gltf.animations, C.enemyModel.clips);
                    const missing = Object.keys(clips).filter(r => !clips[r] && r !== 'down');
                    if (missing.length && global.console) console.warn('strike-ops: enemy clips fall back for ' + missing.join(', '));
                    let primitives = 0, triangles = 0;
                    const mats = [];
                    scene.traverse(o => {
                        if (!o.isMesh) return;
                        primitives += 1;
                        triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
                        if (o.isSkinnedMesh) o.frustumCulled = false;
                        so.shared.add(o.geometry);
                        if (mats.indexOf(o.material) === -1) { mats.push(o.material); so.shared.add(o.material); }
                    });
                    const sanitize = T.PropertyBinding && T.PropertyBinding.sanitizeNodeName ? T.PropertyBinding.sanitizeNodeName : (n => n.replace(/[\s.]/g, ''));
                    so.assets.enemy = {scene, clips, scale: C.enemyModel.targetHeight / height, primitives, triangles: Math.round(triangles), lod,
                        weaponBone: sanitize(C.enemyModel.weaponBone), tooMany: primitives > C.enemyModel.maxPrimitives};
                },
                // One shared material per kit; duplicate per-file materials and their
                // textures are disposed (§6.2), plus the deliberate variants.
                finalizeKits: function () {
                    const so = this._so, T = global.THREE, a = so.assets, m = so.mats;
                    const kitMat = {};
                    Object.keys(C.kitPieces).forEach(key => {
                        const scene = a.pieces[key];
                        if (!scene) return;
                        const kit = C.kitPieces[key].kit;
                        scene.traverse(o => {
                            if (!o.isMesh) return;
                            so.shared.add(o.geometry);
                            if (!kitMat[kit]) { kitMat[kit] = o.material; o.material.name = 'kit-' + kit; so.shared.add(o.material); if (o.material.map) so.shared.add(o.material.map); return; }
                            if (o.material !== kitMat[kit]) {
                                const old = o.material;
                                if (old.map && old.map !== kitMat[kit].map) { old.map.dispose(); so.shared.delete(old.map); }
                                old.dispose();
                                so.shared.delete(old);
                                o.material = kitMat[kit];
                            }
                        });
                    });
                    m.kit = kitMat;
                    if (kitMat.fantasy) {
                        m.shed = kitMat.fantasy.clone();
                        m.shed.name = 'kit-shed';
                        if (a.tex.shed) {
                            const t = a.tex.shed, src = kitMat.fantasy.map;
                            t.flipY = false;
                            if (src) { t.magFilter = src.magFilter; t.minFilter = src.minFilter; }
                            t.needsUpdate = true;
                            m.shed.map = t;
                        } else m.shed.color.set('#f5c84a');
                        m.deck = kitMat.fantasy.clone();
                        m.deck.name = 'kit-deck';
                        so.shared.add(m.shed); so.shared.add(m.deck);
                    }
                    if (kitMat.survival) { m.grassClump = kitMat.survival.clone(); m.grassClump.name = 'kit-grass'; so.shared.add(m.grassClump); }
                    if (kitMat.barricade) { m.barricade = kitMat.barricade; m.barricade.color.set('#e8d3a0'); }
                    m.crate = [];
                    if (a.crate) {
                        const seen = new Map();
                        a.crate.traverse(o => {
                            if (!o.isMesh) return;
                            so.shared.add(o.geometry);
                            if (!seen.has(o.material)) {
                                const c = o.material.clone();
                                c.color.multiplyScalar(2.6);
                                c.userData.base = c.color.clone();
                                seen.set(o.material, c);
                                o.material.dispose();
                                so.shared.delete(o.material);
                                m.crate.push(c);
                                so.shared.add(c);
                            }
                            o.material = seen.get(o.material);
                        });
                    }
                    if (a.tex.grass) {
                        a.tex.grass.wrapS = a.tex.grass.wrapT = T.RepeatWrapping;
                        a.tex.grass.repeat.set(58, 58);
                        a.tex.grass.anisotropy = 4;
                        m.ground.map = a.tex.grass;
                        m.ground.needsUpdate = true;
                    }
                    if (a.tex.dirt) {
                        a.tex.dirt.wrapS = a.tex.dirt.wrapT = T.RepeatWrapping;
                        a.tex.dirt.repeat.set(2, 2);
                        m.dirt.map = a.tex.dirt;
                        m.dirt.needsUpdate = true;
                    }
                },
                onAssetsReady: function () {
                    const so = this._so;
                    if (!so.renderer || so.destroyed || so.navigated) return;
                    this.finalizeKits();
                    if (so.assets.gun) this.registerGun(so.assets.gun);
                    this.applySceneTheme();
                    this.buildBackdrop();
                    // the whole map, once (gates and blockers from the committed index)
                    this.buildMap();
                    this.prewarmMap();
                    const t = so.transition;
                    const restoring = so.restoring;
                    const lp = this.logicalPhase();
                    if (restoring && t && t.kind === 'advancing') {
                        const timer = this.findTimer('advancing');
                        if (!timer || 1 - timer.remaining / timer.ms >= 0.5) this.applyLapPose();
                    }
                    if (so.round && lp !== 'roaming') this.spawnRoundVisuals(so.round);
                    if (so.prevRound && TRANSITION_PHASES.indexOf(lp) !== -1) this.spawnRoundVisuals(so.prevRound, true);
                    this.updatePlace();
                    this.fitShadowCamera(true);
                    this.applyQuality(this.quality);
                    this.updateCamera(0);
                    if (restoring) { this.finishRestore(); return; }
                    if (this.phase === 'loading') {
                        this.setPhase('briefing');
                        this.focusStart();
                    }
                },
                buildProceduralGun: function () {
                    const so = this._so, T = global.THREE;
                    const g = new T.Group();
                    const dark = new T.MeshStandardMaterial({color: 0x30363d, roughness: 0.5, metalness: 0.4});
                    so.shared.add(dark);
                    const parts = [[0.07, 0.1, 0.5, 0, 0, 0], [0.04, 0.04, 0.3, 0, 0.02, -0.38], [0.06, 0.14, 0.07, 0, -0.11, 0.08], [0.06, 0.12, 0.05, 0, -0.1, -0.05]];
                    parts.forEach(p => {
                        const mesh = new T.Mesh(so.geo.box, dark);
                        mesh.scale.set(p[0], p[1], p[2]);
                        mesh.position.set(p[3], p[4], p[5]);
                        g.add(mesh);
                    });
                    so.gun = g;
                    so.muzzlePos = new T.Vector3(0, 0.02, -0.55);
                    so.gunRig.add(g);
                },
                registerGun: function (model) {
                    const so = this._so, T = global.THREE;
                    model.traverse(o => { if (o.isMesh) { so.shared.add(o.geometry); if (o.material) so.shared.add(o.material); } });
                    model.updateMatrixWorld(true);
                    const b = new T.Box3().setFromObject(model);
                    const s = 0.72 / Math.max(0.01, b.max.x - b.min.x);
                    model.scale.setScalar(s);
                    const centre = b.getCenter(new T.Vector3()).multiplyScalar(s);
                    model.position.sub(centre);
                    const yawFix = new T.Group();
                    yawFix.rotation.y = Math.PI / 2;
                    yawFix.add(model);
                    const holder = new T.Group();
                    holder.add(yawFix);
                    if (so.gun) so.gunRig.remove(so.gun);
                    so.gun = holder;
                    so.gunRig.add(holder);
                    so.muzzlePos = new T.Vector3(0, 0.03, -0.42);
                },

                // ---------------- zones and backdrop (§5, §6.2) ----------------
                // Places `tpl` (a kit scene) in a zone group. opts: {x, z (zone-local),
                // y, ry (deg), s | h | fit {w, h, d}, mat, caster}. The template's
                // geometry is shared; only box stand-ins own their geometry.
                place: function (group, tpl, opts, fallbackKit, fallbackShape) {
                    const so = this._so, T = global.THREE;
                    let o;
                    if (tpl) {
                        o = tpl.clone(true);
                        if (opts.mat) o.traverse(n => { if (n.isMesh) n.material = opts.mat; });
                    } else {
                        const geo = fallbackShape === 'cyl' ? new T.CylinderGeometry(0.5, 0.5, 1, 10) : new T.BoxGeometry(1, 1, 1);
                        o = new T.Mesh(geo, so.mats.standIn[fallbackKit] || so.mats.standIn.fantasy);
                        o.userData.ownGeometry = true;
                    }
                    const quarter = (opts.q || 0) % 2 === 1;
                    o.rotation.y = -((opts.ry || 0) * Math.PI / 180) + (opts.q || 0) * Math.PI / 2;
                    o.updateMatrixWorld(true);
                    let b = new T.Box3().setFromObject(o);
                    const rs = b.getSize(new T.Vector3());
                    if (opts.fit) {
                        // local x/z swap under a quarter turn, so scale in the piece's own axes
                        const f = opts.fit, sx = f.w / Math.max(1e-3, rs.x), sy = f.h / Math.max(1e-3, rs.y), sz = f.d / Math.max(1e-3, rs.z);
                        if (quarter) o.scale.set(sz, sy, sx); else o.scale.set(sx, sy, sz);
                    } else if (opts.s) o.scale.setScalar(opts.s);
                    else if (opts.h) o.scale.setScalar(opts.h / Math.max(1e-3, rs.y));
                    o.updateMatrixWorld(true);
                    b = new T.Box3().setFromObject(o);
                    const c = b.getCenter(new T.Vector3());
                    o.position.set(-opts.x - c.x, (opts.y || 0) - b.min.y, opts.z - c.z);
                    const caster = !!opts.caster;
                    o.traverse(n => { if (n.isMesh) { n.userData.caster = caster; n.castShadow = caster; n.receiveShadow = true; if (o.userData.ownGeometry) n.userData.ownGeometry = true; } });
                    group.add(o);
                    return o;
                },
                piece: function (key) { const a = this._so.assets; return a && a.pieces[key] ? a.pieces[key] : null; },
                kitOf: function (key) { return C.kitPieces[key] ? C.kitPieces[key].kit : 'fantasy'; },
                // Cover in the MAP frame: cv = {kind, x, z, w, d, h} with w along map x;
                // pieces run along the longer side.
                placeCover: function (group, cv) {
                    const m = this._so.mats, add = (tpl, opts, kit, shape) => this.place(group, tpl, Object.assign({caster: true}, opts), kit, shape);
                    const alongX = cv.w >= cv.d, L = Math.max(cv.w, cv.d), D = Math.min(cv.w, cv.d);
                    const at = t => (alongX ? {x: cv.x - L / 2 + t, z: cv.z} : {x: cv.x, z: cv.z - L / 2 + t});
                    const dims = (seg, depth) => (alongX ? {w: seg, d: depth} : {w: depth, d: seg});
                    if (cv.kind === 'crates') {
                        const n = Math.max(1, Math.round(L / 0.9)), w = L / n;
                        for (let i = 0; i < n; i++) { const p = at(w * (i + 0.5)), d2 = dims(w * 0.98, D); add(this._so.assets.crate, {x: p.x, z: p.z, fit: {w: d2.w, h: cv.h, d: d2.d}}, 'crate'); }
                    } else if (cv.kind === 'barrels') {
                        const n = Math.max(1, Math.round(L / 0.62)), w = L / n;
                        for (let i = 0; i < n; i++) { const p = at(w * (i + 0.5)), d2 = dims(w * 0.96, Math.min(D, w) * 0.96); add(this.piece('barrel'), {x: p.x, z: p.z, fit: {w: d2.w, h: cv.h, d: d2.d}}, 'survival', 'cyl'); }
                    } else if (cv.kind === 'sandbags') {
                        add(this.piece('sandbags'), {x: cv.x, z: cv.z, q: alongX ? 1 : 0, fit: {w: cv.w, h: cv.h, d: cv.d}, mat: m.barricade}, 'barricade');
                    } else if (cv.kind === 'stoneWall') {
                        add(this.piece('stoneWall'), {x: cv.x, z: cv.z, q: alongX ? 0 : 1, fit: {w: cv.w, h: cv.h, d: cv.d}}, 'fantasy');
                    } else {
                        add(null, {x: cv.x, z: cv.z, fit: {w: cv.w, h: cv.h, d: cv.d}}, 'fantasy');
                    }
                },
                // A yellow shed (§5.1 structures) from the fantasy wall/roof tiles,
                // fitted to the structure's w × d (its collider): door side = south
                // (−z, toward the approaching player).
                buildShed: function (group, p) {
                    const m = this._so.mats, WS = 3, TH = 0.3;
                    const tilesW = p.tilesW || Math.max(1, Math.round(p.w / 3)), tilesD = p.tilesD || Math.max(1, Math.round(p.d / 3));
                    const rows = p.rows || Math.max(1, Math.round((p.h || 3.4) / 3.2));
                    const tw = p.w / tilesW, td = p.d / tilesD;
                    const wall = this.piece('wall'), cross = this.piece('wallCross'), door = this.piece('wallDoor'), roof = this.piece('roofFlat');
                    const front = p.z - p.d / 2, back = p.z + p.d / 2, left = p.x - p.w / 2, right = p.x + p.w / 2;
                    const doorAt = p.doorAt != null ? p.doorAt : Math.floor(tilesW / 2);
                    const put = (tpl, o) => this.place(group, tpl, Object.assign({mat: m.shed, caster: true}, o), 'fantasy');
                    for (let r = 0; r < rows; r++) {
                        for (let i = 0; i < tilesW; i++) {
                            const x = left + (i + 0.5) * tw;
                            put(r === 0 && i === doorAt ? door : wall, {x, z: front, y: r * WS, q: 1, fit: {w: tw, h: WS, d: TH}});
                            put(wall, {x, z: back, y: r * WS, q: 1, fit: {w: tw, h: WS, d: TH}});
                        }
                        for (let j = 0; j < tilesD; j++) {
                            const z = front + (j + 0.5) * td;
                            put(p.crossSide ? cross : wall, {x: left, z, y: r * WS, fit: {w: TH, h: WS, d: td}});
                            put(p.crossSide ? cross : wall, {x: right, z, y: r * WS, fit: {w: TH, h: WS, d: td}});
                        }
                    }
                    for (let i = 0; i < tilesW; i++) for (let j = 0; j < tilesD; j++) {
                        put(roof, {x: left + (i + 0.5) * tw, z: front + (j + 0.5) * td, y: rows * WS, fit: {w: tw * 1.05, h: 0.3, d: td * 1.05}});
                    }
                },
                // ---------------- the map (§5.1, §6.2; step 4: kit dressing) ----------------
                // One CanvasTexture atlas for every procedural map part (map
                // lifetime): four sign boards (rows of 512 × 96) and a palette of
                // 64 px swatches. Procedural boxes sample one swatch, so poles, gate
                // frames, signs, tape and cones share one material and merge.
                makeProcAtlas: function (map) {
                    const T = global.THREE, doc = global.document;
                    const W = 512, H = 512, ROW = 96, SW = 64, SY = 384;
                    const names = ['pole', 'white', 'red', 'tape', 'black', 'cone', 'wood', 'woodDark', 'metal', 'green', 'board', 'concrete', 'glow', 'ink', 'steel', 'gold'];
                    const colors = ['#3d434b', '#f4f4f4', '#d8402f', '#f2c230', '#26282b', '#ff7a1a', '#9a7048', '#5e4128', '#a8b0b8', '#2e9d4a', '#1d3346', '#b8b2a6', '#fff4c8', '#11161c', '#6c7682', '#f5c400'];
                    const c = doc.createElement('canvas');
                    c.width = W; c.height = H;
                    const g = c.getContext && c.getContext('2d');
                    if (g) {
                        names.forEach((n, i) => { g.fillStyle = colors[i]; g.fillRect((i % 8) * SW, SY + Math.floor(i / 8) * SW, SW, SW); });
                        C.zones.forEach((zone, r) => {
                            const sign = (zone.flavor && zone.flavor.sign) || {text: zone.name, icon: 'star'};
                            const y0 = r * ROW;
                            g.fillStyle = '#f5c400'; g.fillRect(0, y0, W, ROW);
                            g.fillStyle = '#1d3346'; g.fillRect(6, y0 + 6, W - 12, ROW - 12);
                            // icon at the reading start (right, RTL)
                            const ix = W - 52, iy = y0 + ROW / 2;
                            g.fillStyle = '#f5c400'; g.strokeStyle = '#f5c400'; g.lineWidth = 5;
                            g.beginPath();
                            if (sign.icon === 'star') {
                                for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 13 : 30; g.lineTo(ix + Math.cos(a) * rr, iy + Math.sin(a) * rr); }
                                g.closePath(); g.fill();
                            } else if (sign.icon === 'box') {
                                g.rect(ix - 30, iy - 20, 60, 40); g.stroke();
                                for (let k = -18; k <= 18; k += 12) { g.moveTo(ix + k, iy - 20); g.lineTo(ix + k, iy + 20); }
                                g.stroke();
                            } else if (sign.icon === 'house') {
                                g.moveTo(ix - 28, iy - 2); g.lineTo(ix, iy - 28); g.lineTo(ix + 28, iy - 2); g.closePath(); g.fill();
                                g.fillRect(ix - 20, iy - 4, 40, 30);
                            } else {
                                g.fillRect(ix - 22, iy - 30, 44, 22);
                                g.moveTo(ix - 16, iy - 8); g.lineTo(ix - 24, iy + 30); g.moveTo(ix + 16, iy - 8); g.lineTo(ix + 24, iy + 30);
                                g.moveTo(ix - 20, iy + 12); g.lineTo(ix + 20, iy + 12); g.stroke();
                            }
                            g.fillStyle = '#ffffff';
                            g.font = '800 46px "Segoe UI", Arial, "Noto Sans Hebrew", sans-serif';
                            g.textAlign = 'center'; g.textBaseline = 'middle';
                            try { g.direction = 'rtl'; } catch (e) { /* older canvas */ }
                            g.fillText(sign.text, (W - 96) / 2 + 6, iy + 2, W - 120);
                        });
                    }
                    const tex = new T.CanvasTexture(c);
                    tex.encoding = T.sRGBEncoding;
                    tex.anisotropy = 4;
                    const mat = new T.MeshLambertMaterial({map: tex, name: 'map-proc'});
                    map.disposables.add(tex); map.disposables.add(mat);
                    return {
                        mat,
                        swatch: name => { const i = Math.max(0, names.indexOf(name)); return {u: ((i % 8) * SW + SW / 2) / W, v: 1 - (SY + Math.floor(i / 8) * SW + SW / 2) / H}; },
                        sign: r => ({u0: 0, u1: 1, vTop: 1 - (r * ROW) / H, vBottom: 1 - (r * ROW + ROW) / H}),
                    };
                },
                // Builds the whole map once (§6.2 map chunks): one ground, the merged
                // paths, and per place a structure chunk (walls, sheds, containers,
                // trees, hedges, stone walls, gate poles and signs), a detail chunk
                // (cover, crates, barrels, rocks, sandbags, decks) with its tape line
                // and grass clumps, plus the gates' moving parts and the fight-box
                // outlines. Kit pieces fall back to palette boxes on a load failure.
                buildMap: function () {
                    const so = this._so, T = global.THREE, m = so.mats, D = C.dressing;
                    if (so.map) this.releaseMap();
                    const map = so.map = {group: new T.Group(), disposables: new Set(), places: [], gates: [], merged: {}, procGeo: {}, cull: {at: {x: 1e9, z: 1e9}, place: -1, tier: -1}};
                    const atlas = map.atlas = this.makeProcAtlas(map);
                    const proc = atlas.mat;
                    const procGeo = (shape, sw) => {
                        const key = shape + ':' + sw;
                        if (!map.procGeo[key]) {
                            const geo = shape === 'cyl' ? new T.CylinderGeometry(0.5, 0.5, 1, 10) : (shape === 'cone' ? new T.CylinderGeometry(0.08, 0.5, 1, 10) : new T.BoxGeometry(1, 1, 1));
                            const uv = geo.attributes.uv, s = atlas.swatch(sw);
                            for (let i = 0; i < uv.count; i++) uv.setXY(i, s.u, s.v);
                            map.procGeo[key] = geo;
                            map.disposables.add(geo);
                        }
                        return map.procGeo[key];
                    };
                    const pbox = (group, x, z, w, d, h, sw, y, caster) => {
                        const mesh = new T.Mesh(procGeo('box', sw), proc);
                        mesh.scale.set(Math.max(0.01, w), Math.max(0.01, h), Math.max(0.01, d));
                        const p = mapToWorld(x, z, (y || 0) + h / 2);
                        mesh.position.set(p.x, p.y, p.z);
                        mesh.userData.caster = caster !== false;
                        mesh.castShadow = caster !== false; mesh.receiveShadow = true;
                        group.add(mesh);
                        return mesh;
                    };
                    const pcyl = (group, x, z, r, h, sw, y, shape) => {
                        const mesh = new T.Mesh(procGeo(shape || 'cyl', sw), proc);
                        mesh.scale.set(2 * r, h, 2 * r);
                        const p = mapToWorld(x, z, (y || 0) + h / 2);
                        mesh.position.set(p.x, p.y, p.z);
                        mesh.userData.caster = false; mesh.castShadow = false; mesh.receiveShadow = true;
                        group.add(mesh);
                        return mesh;
                    };
                    const kit = (group, key, opts, shape) => this.place(group, this.piece(key), Object.assign({caster: true}, opts), this.kitOf(key), shape);
                    // ground (one mesh) and every path and the plaza paving (merged)
                    const B = C.map.bounds;
                    const groundGeo = new T.PlaneGeometry(240, 240);
                    groundGeo.rotateX(-Math.PI / 2);
                    map.disposables.add(groundGeo);
                    const ground = new T.Mesh(groundGeo, m.ground);
                    const gc = mapToWorld((B.minX + B.maxX) / 2, (B.minZ + B.maxZ) / 2);
                    ground.position.set(gc.x, 0, gc.z);
                    ground.receiveShadow = true;
                    map.group.add(ground);
                    const paths = new T.Group();
                    C.map.paths.forEach(p => {
                        const g = p.round ? new T.CircleGeometry(p.w / 2, 28) : new T.PlaneGeometry(p.w, p.d);
                        g.rotateX(-Math.PI / 2);
                        const mesh = new T.Mesh(g, m.dirt);
                        const w = mapToWorld(p.x, p.z, 0.012);
                        mesh.position.set(w.x, w.y, w.z);
                        mesh.userData.ownGeometry = true;
                        mesh.receiveShadow = true;
                        paths.add(mesh);
                    });
                    strikeOpsMergeStatic(paths, T).forEach(mesh => { mesh.receiveShadow = true; mesh.castShadow = false; mesh.userData.caster = false; map.disposables.add(mesh.geometry); });
                    map.group.add(paths);
                    // per place: structure + detail chunks (+ tape line and grass in the detail)
                    C.zones.forEach((zone, i) => {
                        const pl = {id: zone.id, index: i, structure: new T.Group(), detail: new T.Group(), tape: new T.Group(), grass: new T.Group(), outline: null, grassClumps: 0, region: zone.region};
                        pl.structure.name = 'structure-' + zone.id;
                        pl.detail.name = 'detail-' + zone.id;
                        map.places.push(pl);
                    });
                    const placeAt = (x, z) => { const i = strikeOpsCurrentPlace({x, z}, C); return map.places[i >= 0 ? i : 0]; };
                    const placeOfArea = id => { const i = placeIndexById(C, id); return map.places[i >= 0 ? i : 0]; };
                    const inRegion = (x, z) => C.zones.some(zn => inRect({x, z}, zn.region));
                    // walls: fences tiled along the line; perimeter hedges grow outward;
                    // container rows come from the authored dressing slots
                    C.map.walls.forEach(w => {
                        if (w.kind === 'containerRow') return;
                        const pl = placeAt((w.minX + w.maxX) / 2, (w.minZ + w.maxZ) / 2);
                        const alongX = (w.maxX - w.minX) >= (w.maxZ - w.minZ);
                        const L = alongX ? w.maxX - w.minX : w.maxZ - w.minZ, th = alongX ? w.maxZ - w.minZ : w.maxX - w.minX;
                        const cx = (w.minX + w.maxX) / 2, cz = (w.minZ + w.maxZ) / 2;
                        const hedge = w.kind === 'hedge';
                        const n = Math.max(1, Math.ceil(L / (hedge ? 2.4 : 3) - 1e-6)), seg = L / n;
                        for (let i = 0; i < n; i++) {
                            const t = (i + 0.5) * seg;
                            let x = alongX ? w.minX + t : cx, z = alongX ? cz : w.minZ + t;
                            if (hedge) {
                                const inP = alongX ? inRegion(x, z + 1) : inRegion(x + 1, z), inN = alongX ? inRegion(x, z - 1) : inRegion(x - 1, z);
                                const s = inP && !inN ? -1 : (inN && !inP ? 1 : 0), shift = s * (D.hedgeD - th) / 2;
                                if (alongX) z += shift; else x += shift;
                                kit(pl.structure, 'hedge', {x, z, q: alongX ? 1 : 0, fit: {w: alongX ? seg + 0.05 : D.hedgeD, h: D.hedgeH, d: alongX ? D.hedgeD : seg + 0.05}});
                            } else kit(pl.structure, 'fence', {x, z, q: alongX ? 1 : 0, fit: {w: alongX ? seg : 0.16, h: D.fenceH, d: alongX ? 0.16 : seg}});
                        }
                    });
                    D.fences.forEach(w => {
                        const pl = placeOfArea(w.area), alongX = (w.maxX - w.minX) >= (w.maxZ - w.minZ);
                        kit(pl.structure, 'fence', {x: (w.minX + w.maxX) / 2, z: (w.minZ + w.maxZ) / 2, q: alongX ? 1 : 0, fit: {w: alongX ? w.maxX - w.minX : 0.16, h: D.fenceH, d: alongX ? 0.16 : w.maxZ - w.minZ}});
                    });
                    const variants = ['containerA', 'containerB', 'containerC'];
                    const container = (group, x, z, len, alongX, stack, v) => {
                        for (let s = 0; s < (stack || 1); s++) {
                            kit(group, variants[(v + s) % 3], {x, z, y: s * D.containerH, q: alongX ? 1 : 0, fit: {w: alongX ? len : D.containerD, h: D.containerH, d: alongX ? D.containerD : len}});
                        }
                    };
                    D.containers.forEach(cn => container(placeOfArea(cn.area).structure, cn.x, cn.z, cn.len, cn.alongX, cn.stack, cn.v));
                    D.crates.forEach(cr => this.place(placeOfArea(cr.area).detail, so.assets.crate, {x: cr.x, z: cr.z, fit: {w: 1.0, h: 1.0, d: 1.0}, caster: true}, 'crate'));
                    // structures (solid unless walk); a piece wholly inside another
                    // solid structure (e.g. a crate inside a container) is not drawn
                    const solids = C.map.structures.filter(st => !st.walk && st.shape !== 'circle');
                    const hidden = st => solids.some(o => o !== st && st.shape !== 'circle' && st.x - st.w / 2 >= o.x - o.w / 2 && st.x + st.w / 2 <= o.x + o.w / 2 && st.z - st.d / 2 >= o.z - o.d / 2 && st.z + st.d / 2 <= o.z + o.d / 2);
                    const trees = ['treeRound', 'pineTall', 'tree', 'pine'];
                    C.map.structures.forEach((st, si) => {
                        if (st.landmark || hidden(st)) return; // the tower is drawn by the backdrop
                        const pl = placeOfArea(st.area), S = pl.structure, Dt = pl.detail;
                        const alongX = (st.w || 0) >= (st.d || 0);
                        if (st.kind === 'tree') kit(S, trees[si % trees.length], {x: st.x, z: st.z, h: st.h || 6, ry: (si * 47) % 360}, 'cyl');
                        else if (st.kind === 'container') container(S, st.x, st.z, alongX ? st.w : st.d, alongX, st.stack || 1, si % 3);
                        else if (st.kind === 'shed') this.buildShed(S, st);
                        else if (st.kind === 'deck') {
                            const nx = Math.max(1, Math.ceil(st.w / 2)), nz = Math.max(1, Math.ceil(st.d / 2)), tw = st.w / nx, td = st.d / nz;
                            for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
                                this.place(Dt, this.piece('planks'), {x: st.x - st.w / 2 + (a + 0.5) * tw, z: st.z - st.d / 2 + (b + 0.5) * td, fit: {w: tw + 0.01, h: st.h || 0.12, d: td + 0.01}, mat: m.deck, caster: false}, 'fantasy');
                            }
                        } else if (st.kind === 'stoneWall') {
                            const L = alongX ? st.w : st.d, n = Math.max(1, Math.round(L / 1.2)), seg = L / n;
                            for (let i = 0; i < n; i++) {
                                const t = -L / 2 + (i + 0.5) * seg;
                                kit(S, 'stoneWall', {x: alongX ? st.x + t : st.x, z: alongX ? st.z : st.z + t, fit: {w: alongX ? seg : st.w, h: st.h || 1.2, d: alongX ? st.d : seg}});
                            }
                        } else if (st.kind === 'hedge') kit(S, 'hedge', {x: st.x, z: st.z, q: alongX ? 1 : 0, fit: {w: st.w, h: st.h || 1.3, d: st.d}});
                        else if (st.kind === 'sandbags') this.place(Dt, this.piece('sandbags'), {x: st.x, z: st.z, ry: st.ry, q: alongX ? 1 : 0, fit: {w: st.w, h: st.h || 0.8, d: st.d}, mat: m.barricade, caster: true}, 'barricade');
                        else if (st.kind === 'barrel') kit(Dt, 'barrel', {x: st.x, z: st.z, ry: st.ry, fit: {w: 2 * st.r, h: st.h || 1, d: 2 * st.r}}, 'cyl');
                        else if (st.kind === 'rock') kit(Dt, si % 2 ? 'rockA' : 'rockB', {x: st.x, z: st.z, ry: st.ry, fit: {w: 2.3 * st.r, h: st.h || 0.6, d: 2.3 * st.r}, caster: false});
                        else if (st.kind === 'crate') this.place(Dt, so.assets.crate, {x: st.x, z: st.z, fit: {w: st.w, h: st.h || 1, d: st.d}, caster: true}, 'crate');
                        else this.place(S, null, {x: st.x, z: st.z, fit: {w: st.w || 1, h: st.h || 1, d: st.d || 1}, caster: true}, 'fantasy');
                    });
                    // cover (the kit pieces chosen by coverKinds), the tape line on the
                    // enemy side's edge facing the entry, grass clumps, fight-box outline
                    const grassAvoid = [].concat(C.map.structures.map(st => (st.shape === 'circle' ? {minX: st.x - st.r, maxX: st.x + st.r, minZ: st.z - st.r, maxZ: st.z + st.r} : {minX: st.x - st.w / 2, maxX: st.x + st.w / 2, minZ: st.z - st.d / 2, maxZ: st.z + st.d / 2})),
                        C.map.paths.map(p => ({minX: p.x - p.w / 2, maxX: p.x + p.w / 2, minZ: p.z - p.d / 2, maxZ: p.z + p.d / 2})), C.map.walls);
                    C.zones.forEach((zone, i) => {
                        const pl = map.places[i], f = strikeOpsPlaceFrame(zone);
                        f.cover.forEach(cb => this.placeCover(pl.detail, {kind: cb.kind, x: (cb.minX + cb.maxX) / 2, z: (cb.minZ + cb.maxZ) / 2, w: cb.maxX - cb.minX, d: cb.maxZ - cb.minZ, h: cb.maxY}));
                        const ez = zone.enemyZone, h = ((zone.headingDeg || 0) % 360 + 360) % 360;
                        let seg;
                        if (h === 0) seg = {x0: ez.minX, x1: ez.maxX, z0: ez.minZ, z1: ez.minZ};
                        else if (h === 90) seg = {x0: ez.minX, x1: ez.minX, z0: ez.minZ, z1: ez.maxZ};
                        else if (h === 180) seg = {x0: ez.minX, x1: ez.maxX, z0: ez.maxZ, z1: ez.maxZ};
                        else seg = {x0: ez.maxX, x1: ez.maxX, z0: ez.minZ, z1: ez.maxZ};
                        const alongX = seg.x1 - seg.x0 > seg.z1 - seg.z0, len = Math.max(seg.x1 - seg.x0, seg.z1 - seg.z0);
                        const mx = (seg.x0 + seg.x1) / 2, mz = (seg.z0 + seg.z1) / 2;
                        // striped tape: alternating yellow/black 0.5 m pieces on 0.47 m poles
                        const nT = Math.max(1, Math.round(len / 0.5)), tl = len / nT;
                        for (let k = 0; k < nT; k++) {
                            const t = (k + 0.5) * tl, tx = alongX ? seg.x0 + t : mx, tz = alongX ? mz : seg.z0 + t;
                            pbox(pl.tape, tx, tz, alongX ? tl : 0.03, alongX ? 0.03 : tl, 0.06, k % 2 ? 'black' : 'tape', 0.4, false);
                        }
                        for (let t = 0; t <= len + 1e-6; t += 2) {
                            const px = alongX ? seg.x0 + t : mx, pz = alongX ? mz : seg.z0 + t;
                            pbox(pl.tape, px, pz, 0.05, 0.05, 0.47, 'pole', 0, false);
                        }
                        [-2.4, 2.4].forEach(x => {
                            const c = strikeOpsArenaToMap(zone, x, 4.2);
                            pcyl(pl.tape, c.x, c.z, 0.2, 0.08, 'black', 0);
                            pcyl(pl.tape, c.x, c.z, 0.17, 0.5, 'cone', 0.08, 'cone');
                            pcyl(pl.tape, c.x, c.z, 0.1, 0.07, 'white', 0.3, 'cone');
                        });
                        // grass clumps (tier-capped by draw range, §6.3), arena spots of the
                        // template converted to the map, kept off paths, decks and structures
                        const spots = (zone.grassSpots && zone.grassSpots.length ? zone.grassSpots : YARD_GRASS).map(s => strikeOpsArenaToMap(zone, s.x, s.z));
                        const avoid = grassAvoid.concat(f.cover.map(cb => ({minX: cb.minX, maxX: cb.maxX, minZ: cb.minZ, maxZ: cb.maxZ})));
                        let n = 0;
                        spots.forEach((s, k) => {
                            if (n >= C.quality.grassClumps[2] || !inRect(s, zone.region, -0.6) || avoid.some(r => inRect(s, r, 0.45))) return;
                            kit(pl.grass, 'grass', {x: s.x, z: s.z, h: 0.32 + (k % 3) * 0.05, ry: (k * 137) % 360, caster: false, mat: so.mats.grassClump});
                            n += 1;
                        });
                        pl.grassClumps = n;
                        // fight-box outline (a faint ground line)
                        const fb = f.fightBox, y = 0.03;
                        const corners = [[fb.minX, fb.minZ], [fb.maxX, fb.minZ], [fb.maxX, fb.maxZ], [fb.minX, fb.maxZ]];
                        const pts = [];
                        for (let q = 0; q < 4; q++) { const a = corners[q], b = corners[(q + 1) % 4]; pts.push(-a[0], y, a[1], -b[0], y, b[1]); }
                        const lg = new T.BufferGeometry();
                        lg.setAttribute('position', new T.BufferAttribute(new Float32Array(pts), 3));
                        const lm = new T.LineBasicMaterial({color: 0xfff1a8, transparent: true, opacity: 0.55, depthWrite: false});
                        map.disposables.add(lg); map.disposables.add(lm);
                        pl.outline = new T.LineSegments(lg, lm);
                        pl.outline.visible = false;
                        map.group.add(pl.outline);
                    });
                    // gates: poles and the arch sign of the place the gate leads to in
                    // the structure chunk; one moving part (boom arm / gate leaf) + one
                    // light each; the main gate g0 is closed for good
                    C.map.gates.forEach(gate => {
                        const toI = placeIndexById(C, gate.to), fromI = gate.from ? placeIndexById(C, gate.from) : toI;
                        const pl = map.places[Math.max(0, fromI)];
                        const span = gate.max - gate.min, ax = gate.axis === 'x';
                        const end = (t, dz) => (ax ? {x: gate.min + t, z: gate.at + (dz || 0)} : {x: gate.at + (dz || 0), z: gate.min + t});
                        const PH = 3.0;
                        [0, span].forEach(t => {
                            const p = end(t);
                            pbox(pl.structure, p.x, p.z, 0.3, 0.3, PH, 'pole');
                            pbox(pl.structure, p.x, p.z, 0.38, 0.38, 0.12, 'gold', PH);
                        });
                        // the side the player approaches from (g0: the yard side)
                        const fromRegion = gate.from ? C.zones[fromI].region : C.zones[toI].region;
                        const rc = ax ? (fromRegion.minZ + fromRegion.maxZ) / 2 : (fromRegion.minX + fromRegion.maxX) / 2;
                        const sideSign = rc < gate.at ? -1 : 1;
                        const mid = end(span / 2);
                        pbox(pl.structure, mid.x, mid.z, ax ? span + 0.3 : 0.16, ax ? 0.16 : span + 0.3, 0.72, 'board', 2.2);
                        const sg = new T.PlaneGeometry(span + 0.14, (span + 0.14) * 96 / 512);
                        const uv = sg.attributes.uv, r = atlas.sign(Math.max(0, toI));
                        for (let k = 0; k < uv.count; k++) uv.setXY(k, r.u0 + uv.getX(k) * (r.u1 - r.u0), r.vBottom + uv.getY(k) * (r.vTop - r.vBottom));
                        const face = new T.Mesh(sg, proc);
                        face.userData.ownGeometry = true;
                        face.userData.caster = false;
                        const off = sideSign * 0.085, fp = mapToWorld(ax ? mid.x : mid.x + off, ax ? mid.z + off : mid.z, 2.2 + 0.36);
                        face.position.set(fp.x, fp.y, fp.z);
                        // the plane faces +z; turn it toward the approach side (THREE x = −map x)
                        face.rotation.y = ax ? (sideSign < 0 ? Math.PI : 0) : (sideSign > 0 ? -Math.PI / 2 : Math.PI / 2);
                        pl.structure.add(face);
                        if (gate.decorative) {
                            // a closed double gate: frame and bars
                            const c = end(span / 2);
                            [0.15, 1.75].forEach(y => pbox(pl.structure, c.x, c.z, ax ? span : 0.1, ax ? 0.1 : span, 0.1, 'steel', y));
                            for (let t = 0.25; t < span - 0.1; t += 0.35) { const p = end(t); pbox(pl.structure, p.x, p.z, 0.06, 0.06, 1.7, 'steel', 0.15); }
                            return;
                        }
                        const pivot = new T.Group();
                        const p0 = end(0), w0 = mapToWorld(p0.x, p0.z, 1.0);
                        pivot.position.set(w0.x, w0.y, w0.z);
                        const arm = new T.Group();
                        const part = (sw, lx, ly, lz, sx, sy, sz) => {
                            const mesh = new T.Mesh(procGeo('box', sw), proc);
                            mesh.scale.set(sx, sy, sz);
                            mesh.position.set(lx, ly, lz);
                            arm.add(mesh);
                        };
                        // pivot-local THREE frame: the arm runs along −x (map +x) or +z
                        const along = (t, ly, len, thick, h, sw) => (ax ? part(sw, -t, ly, 0, len, h, thick) : part(sw, 0, ly, t, thick, h, len));
                        if (gate.kind === 'swing') {
                            along(span / 2, 0.55, span, 0.08, 0.1, 'woodDark');
                            along(span / 2, -0.75, span, 0.08, 0.1, 'woodDark');
                            for (let t = 0.1; t < span; t += 0.32) along(t, -0.1, 0.12, 0.06, 1.4, 'wood');
                        } else {
                            const nS = Math.max(2, Math.round(span / 0.45)), sl = span / nS;
                            for (let k = 0; k < nS; k++) along((k + 0.5) * sl, 0, sl, 0.12, 0.14, k % 2 ? 'white' : 'red');
                        }
                        const merged = strikeOpsMergeStatic(arm, T);
                        merged.forEach(mesh => { mesh.castShadow = true; mesh.userData.caster = true; map.disposables.add(mesh.geometry); });
                        pivot.add(arm);
                        const lightMat = new T.MeshBasicMaterial({color: 0xff3b30});
                        map.disposables.add(lightMat);
                        const light = new T.Mesh(so.geo.box, lightMat);
                        light.scale.set(0.26, 0.26, 0.26);
                        const lp = mapToWorld(p0.x, p0.z, PH + 0.26);
                        light.position.set(lp.x, lp.y, lp.z);
                        map.group.add(pivot);
                        map.group.add(light);
                        map.gates.push({id: gate.id, gate, pivot, light, lightMat, toIndex: toI});
                    });
                    // floodlight towers (structure chunks) and their night light cones (one mesh)
                    const cones = new T.Group();
                    D.floodlights.forEach(fl => {
                        const pl = placeOfArea(fl[4]), Hh = D.floodlightH;
                        pbox(pl.structure, fl[0], fl[1], 0.22, 0.22, Hh, 'steel');
                        pbox(pl.structure, fl[0], fl[1], 1.1, 0.5, 0.45, 'pole', Hh);
                        const ax = fl[2] - fl[0], az = fl[3] - fl[1], len = Math.hypot(ax, az);
                        pbox(pl.structure, fl[0] + ax / len * 0.3, fl[1] + az / len * 0.3, 0.9, 0.9, 0.22, 'glow', Hh + 0.1);
                        const top = mapToWorld(fl[0], fl[1], Hh), bottom = mapToWorld(fl[2], fl[3], 0);
                        const dir = new T.Vector3(bottom.x - top.x, bottom.y - top.y, bottom.z - top.z), L = dir.length();
                        const g = new T.CylinderGeometry(0.35, 3.2, L, 14, 1, true);
                        g.translate(0, -L / 2, 0);
                        const mesh = new T.Mesh(g, proc);
                        mesh.userData.ownGeometry = true;
                        mesh.position.set(top.x, top.y, top.z);
                        mesh.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), dir.normalize());
                        cones.add(mesh);
                    });
                    const coneMat = new T.MeshBasicMaterial({color: 0xfff1c0, transparent: true, opacity: 0.13, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false});
                    map.disposables.add(coneMat);
                    strikeOpsMergeStatic(cones, T).forEach(mesh => { mesh.material = coneMat; mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 3; map.disposables.add(mesh.geometry); });
                    map.cones = cones;
                    cones.visible = !!this.soTheme.scene.nightLights;
                    map.group.add(cones);
                    // the plaza boss stage's soft spotlight decal (squadStyle.bossSpotlight)
                    C.zones.forEach((zone, i) => {
                        if (!(zone.flavor && zone.flavor.squadStyle && zone.flavor.squadStyle.bossSpotlight)) return;
                        const tex = this.makeRadialTexture('rgba(255,244,200,0.85)', 'rgba(255,244,200,0)');
                        const geo = new T.PlaneGeometry(4.4, 4.4);
                        geo.rotateX(-Math.PI / 2);
                        const mat = new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.55});
                        [tex, geo, mat].forEach(x => map.disposables.add(x));
                        const spot = new T.Mesh(geo, mat);
                        const st = strikeOpsPlaceFrame(zone).bossStage, w = mapToWorld(st.x, st.z, 0.05);
                        spot.position.set(w.x, w.y, w.z);
                        spot.renderOrder = 1;
                        spot.visible = false;
                        map.group.add(spot);
                        map.places[i].spotlight = spot;
                    });
                    // route chevrons: one InstancedMesh (≤ chevrons.max), laid out while roaming
                    const cc = global.document.createElement('canvas');
                    cc.width = 64; cc.height = 64;
                    const cg = cc.getContext && cc.getContext('2d');
                    if (cg) {
                        cg.fillStyle = '#ffffff';
                        [6, 30].forEach(y0 => {
                            cg.beginPath(); cg.moveTo(32, y0); cg.lineTo(58, y0 + 28); cg.lineTo(46, y0 + 28); cg.lineTo(32, y0 + 14); cg.lineTo(18, y0 + 28); cg.lineTo(6, y0 + 28);
                            cg.closePath(); cg.fill();
                        });
                    }
                    const ctex = new T.CanvasTexture(cc);
                    const cgeo = new T.PlaneGeometry(0.9, 0.9);
                    cgeo.rotateX(-Math.PI / 2);
                    const cmat = new T.MeshBasicMaterial({map: ctex, color: 0xffd21a, transparent: true, opacity: 0.6, depthWrite: false});
                    [ctex, cgeo, cmat].forEach(x => map.disposables.add(x));
                    map.chevrons = new T.InstancedMesh(cgeo, cmat, C.map.chevrons.max);
                    map.chevrons.count = 0;
                    map.chevrons.visible = false;
                    map.chevrons.frustumCulled = false;
                    map.chevrons.renderOrder = 2;
                    map.group.add(map.chevrons);
                    const tier1Casters = new Set([m.shed, m.barricade, m.kit && m.kit.industrial].concat(m.crate || []).filter(Boolean));
                    // merge every chunk per material (tape and grass: their own meshes)
                    map.places.forEach(pl => {
                        [['structure', pl.structure], ['detail', pl.detail], ['tape', pl.tape], ['grass', pl.grass]].forEach(([kind, g]) => {
                            const merged = strikeOpsMergeStatic(g, T);
                            // tier 1 casts only sheds, container walls and cover (§6.3); fences,
                            // hedges, trees, rocks and poles cast from tier 2
                            merged.forEach(mesh => { map.disposables.add(mesh.geometry); mesh.userData.casterTier = tier1Casters.has(mesh.material) ? 1 : 2; });
                            map.merged[kind + '-' + pl.id] = merged.length;
                            if (kind === 'grass') pl.grassMesh = merged[0] || null;
                        });
                        pl.detail.add(pl.tape);
                        pl.detail.add(pl.grass);
                        map.group.add(pl.structure);
                        map.group.add(pl.detail);
                    });
                    so.scene.add(map.group);
                    this.applyGrassTier();
                    this.updateMapVisuals(true);
                    return map;
                },
                // One hidden warm-up render at load with every map chunk drawn and
                // frustum culling off, so GPU buffers exist before play: revealing a
                // chunk while walking then uploads nothing (§6.2, browser check 17).
                prewarmMap: function () {
                    const so = this._so, map = so.map;
                    if (!map || !so.renderer || !so.scene || !so.camera) return;
                    const restore = [];
                    map.group.traverse(o => { restore.push([o, o.visible, o.frustumCulled]); o.visible = true; o.frustumCulled = false; });
                    map.places.forEach(pl => { if (pl.grassMesh) pl.grassMesh.geometry.setDrawRange(0, Infinity); });
                    try { so.renderer.render(so.scene, so.camera); } catch (e) { /* lost context: rebuilt later */ }
                    restore.forEach(r => { r[0].visible = r[1]; r[0].frustumCulled = r[2]; });
                    so.renderer.clear();
                    this.applyGrassTier();
                    this.updateCulling(true);
                },
                // Grass clumps per tier (§6.3: 0 / 8 / 18): a draw range on each
                // place's merged grass mesh (no rebuild, no allocation).
                applyGrassTier: function () {
                    const map = this._so.map;
                    if (!map) return;
                    const want = C.quality.grassClumps[this.quality] || 0;
                    map.places.forEach(pl => {
                        const mesh = pl.grassMesh;
                        if (!mesh) return;
                        const total = mesh.geometry.attributes.position.count, per = pl.grassClumps ? total / pl.grassClumps : 0;
                        const n = Math.min(pl.grassClumps, want);
                        mesh.visible = n > 0;
                        mesh.geometry.setDrawRange(0, Math.round(per * n));
                    });
                },
                // Ground chevrons every spacingM along the remaining route (§3 guidance
                // 2): a slow pulse (static under reduced motion), brighter after the
                // idle hint. Re-laid at most every 100 ms, never per frame.
                updateChevrons: function (on) {
                    const so = this._so, map = so.map, T = global.THREE;
                    const mesh = map && map.chevrons;
                    if (!mesh) return;
                    mesh.visible = !!on && this.renderMode === 'gl';
                    if (!mesh.visible) return;
                    const now = nowMs(), mat = mesh.material;
                    const pulse = this.reducedMotion ? 0 : Math.sin(now / 420) * 0.15;
                    if (this.goHint) { mat.color.set(0xffffff); mat.opacity = 0.9 + pulse * 0.3; } else { mat.color.set(0xffd21a); mat.opacity = 0.6 + pulse; }
                    if (so.chevronAt && now - so.chevronAt < 100 && now >= so.chevronAt) return;
                    so.chevronAt = now;
                    const route = this.guidanceRoute(), spacing = C.map.chevrons.spacingM;
                    const m4 = so.chevM || (so.chevM = new T.Matrix4()), q = so.chevQ || (so.chevQ = new T.Quaternion()), up = so.chevUp || (so.chevUp = new T.Vector3(0, 1, 0));
                    const pos = so.chevP || (so.chevP = new T.Vector3()), sc = so.chevS || (so.chevS = new T.Vector3(1, 1, 1));
                    let n = 0, carry = spacing;
                    for (let i = 1; i < route.length && n < C.map.chevrons.max; i++) {
                        const a = route[i - 1], b = route[i], len = Math.hypot(b.x - a.x, b.z - a.z);
                        if (len < 1e-6) continue;
                        // the texture's tip (−z after the ground rotation) points along the route
                        q.setFromAxisAngle(up, Math.atan2(b.x - a.x, -(b.z - a.z)));
                        let t = carry;
                        for (; t <= len && n < C.map.chevrons.max; t += spacing) {
                            const w = mapToWorld(a.x + (b.x - a.x) * t / len, a.z + (b.z - a.z) * t / len, 0.04);
                            pos.set(w.x, w.y, w.z);
                            m4.compose(pos, q, sc);
                            mesh.setMatrixAt(n++, m4);
                        }
                        carry = t - len;
                    }
                    mesh.count = n;
                    mesh.instanceMatrix.needsUpdate = true;
                },
                releaseMap: function () {
                    const so = this._so, map = so.map;
                    if (!map) return;
                    map.disposables.forEach(item => {
                        try { if (item && item.dispose) item.dispose(); } catch (e) { /* lost context */ }
                        map.disposables.delete(item);
                    });
                    if (map.group && map.group.parent) map.group.parent.remove(map.group);
                    map.group = null;
                    map.places = [];
                    map.gates = [];
                    so.map = null;
                },
                // The place the player stands in (presentation only).
                currentPlace: function () {
                    const i = strikeOpsCurrentPlace(this._so.player, C, this.zoneIndex);
                    return i >= 0 ? i : this._so.lastPlace;
                },
                updatePlace: function () {
                    const so = this._so;
                    const i = this.currentPlace();
                    so.lastPlace = i;
                    const id = C.zones[i].id;
                    if (id === this.placeId) return;
                    this.placeId = id;
                    const lp = this.logicalPhase();
                    if (lp === 'roaming') {
                        const t = nowMs(), last = so.placeToastAt[id];
                        if (last == null || t - last >= 4000) {
                            so.placeToastAt[id] = t;
                            this.showToast(C.zones[i].name);
                            this.announce(C.zones[i].name);
                        }
                    }
                },
                showToast: function (text) {
                    const so = this._so;
                    this.toast = text;
                    if (so.toastTimer) this.clearOwnTimeout(so.toastTimer);
                    so.toastTimer = this.ownTimeout(() => { so.toastTimer = null; this.toast = ''; }, C.map.toastMs);
                },
                // Gates (arm angle, light), tape lines, outlines and detail-chunk
                // visibility from the committed map state; called every step.
                updateMapVisuals: function () {
                    const so = this._so, map = so.map;
                    if (!map) return;
                    const k = so.mapZoneIndex, now = nowMs();
                    map.gates.forEach(g => {
                        const open = g.toIndex <= k;
                        const t0 = so.gateAnim[g.id];
                        const k01 = !open ? 0 : (t0 == null ? 1 : clamp((now - t0) / C.map.gateOpenMs, 0, 1));
                        g.open01 = k01;
                        const e = ease(k01);
                        if (g.gate.kind === 'swing') g.pivot.rotation.y = (g.gate.axis === 'x' ? -1 : 1) * e * 1.75;
                        else if (g.gate.axis === 'x') g.pivot.rotation.z = -e * 1.4;
                        else g.pivot.rotation.x = e * 1.4;
                        g.lightMat.color.set(open ? 0x34c759 : 0xff3b30);
                    });
                    const lp = this.logicalPhase();
                    const enc = ENCOUNTER_PHASES.indexOf(lp) !== -1;
                    this.updateChevrons(lp === 'roaming');
                    this.updateCulling(false);
                    map.places.forEach((pl, i) => {
                        pl.tape.visible = i >= k;
                        if (pl.spotlight) pl.spotlight.visible = i === this.zoneIndex && this.roundKind === 'boss' && (enc || lp === 'deploying') && this.renderMode === 'gl';
                        if (pl.outline) {
                            pl.outline.visible = i === this.zoneIndex && (enc || lp === 'roaming');
                            pl.outline.material.opacity = enc && so.pushing ? 0.95 : 0.55;
                        }
                    });
                },
                // Chunk visibility (§6.2, rev 3.1): detail chunks of the current place
                // and the places sharing a gate with it (the chain neighbours); at
                // tier 0 also only within 30 m (shown < 30 m, hidden > 34 m). Re-run
                // when the place or tier changes or after ≥ 2 m of movement. Tier 1
                // casts sun shadows only from the current and adjacent structures.
                updateCulling: function (force) {
                    const so = this._so, map = so.map;
                    if (!map) return;
                    const cur = so.lastPlace == null ? 0 : so.lastPlace, p = so.player, tier = this.quality;
                    const c = map.cull || (map.cull = {at: {x: 1e9, z: 1e9}, place: -1, tier: -1});
                    if (!force && c.place === cur && c.tier === tier && Math.hypot(p.x - c.at.x, p.z - c.at.z) < 2) return;
                    const t0 = cpuNow();
                    c.place = cur; c.tier = tier; c.at.x = p.x; c.at.z = p.z;
                    map.places.forEach((pl, i) => {
                        let vis = Math.abs(i - cur) <= 1;
                        if (vis && tier === 0 && pl.region) {
                            const r = pl.region, dx = Math.max(r.minX - p.x, 0, p.x - r.maxX), dz = Math.max(r.minZ - p.z, 0, p.z - r.maxZ), d = Math.hypot(dx, dz);
                            vis = pl.detail.visible ? d <= 34 : d < 30;
                        }
                        if (pl.detail) pl.detail.visible = vis;
                        const castNear = tier >= 2 || Math.abs(i - cur) <= 1;
                        [pl.structure, pl.detail].forEach(g => { if (g && g.children) g.children.forEach(mesh => { if (mesh.isMesh) mesh.castShadow = !!mesh.userData.caster && tier >= (mesh.userData.casterTier || 1) && castNear; }); });
                    });
                    this.noteCpu('cullMs', cpuNow() - t0);
                },
                // CPU per frame (§6.2, rev 3.1): averages and maxima since resetRenderPeak.
                noteCpu: function (key, ms) {
                    const c = this._so.cpu || (this._so.cpu = {});
                    const r = c[key] || (c[key] = {sum: 0, n: 0, max: 0});
                    r.sum += ms; r.n += 1; if (ms > r.max) r.max = ms;
                },
                buildBackdrop: function () {
                    const so = this._so, T = global.THREE, m = so.mats, B = C.backdrop;
                    if (so.backdrop && so.backdrop.parent) so.backdrop.parent.remove(so.backdrop);
                    // map frame (THREE = (−x, y, z)): place() mirrors x itself
                    const group = new T.Group();
                    const statics = new T.Group();
                    group.add(statics);
                    B.props.forEach(p => this.place(statics, this.piece(p.kind), {x: p.x, z: p.z, y: p.y || 0, ry: p.ry, h: p.h}, this.kitOf(p.kind)));
                    // distant hills: one merged mesh
                    const hills = new T.Group();
                    B.hills.forEach(h => {
                        const geo = new T.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
                        const mesh = new T.Mesh(geo, m.hills);
                        mesh.scale.set(h[2], h[3], h[2] * 0.5);
                        mesh.position.set(-h[0], -1, h[1]);
                        mesh.userData.ownGeometry = true;
                        hills.add(mesh);
                    });
                    statics.add(hills);
                    const merged = strikeOpsMergeStatic(statics, T);
                    merged.forEach(mesh => { mesh.castShadow = false; mesh.receiveShadow = false; mesh.userData.caster = false; so.shared.add(mesh.geometry); });
                    // clouds
                    const cloudTex = this.makeCloudTexture();
                    so.shared.add(cloudTex);
                    so.clouds = [];
                    B.clouds.forEach(c => {
                        const mat = new T.SpriteMaterial({map: cloudTex, fog: false, depthWrite: false, transparent: true, opacity: 0.95});
                        so.shared.add(mat);
                        const sp = new T.Sprite(mat);
                        sp.scale.set(c[3], c[3] / 2, 1);
                        sp.position.set(-c[0], c[1], c[2]);
                        sp.userData.baseX = -c[0];
                        group.add(sp);
                        so.clouds.push(sp);
                    });
                    so.scene.add(group);
                    so.backdrop = group;
                    so.backdropCleanup = group;
                },
                makeCloudTexture: function () {
                    const T = global.THREE, c = global.document.createElement('canvas');
                    c.width = 128; c.height = 64;
                    const g = c.getContext('2d');
                    for (let i = 0; i < 9; i++) {
                        const x = 20 + i * 10 + Math.sin(i) * 6, y = 38 - Math.abs(4 - i) * 2.5, r = 16 - Math.abs(4 - i) * 1.5;
                        const gr = g.createRadialGradient(x, y, 1, x, y, r);
                        gr.addColorStop(0, 'rgba(255,255,255,0.95)');
                        gr.addColorStop(1, 'rgba(255,255,255,0)');
                        g.fillStyle = gr;
                        g.fillRect(0, 0, 128, 64);
                    }
                    const t = new T.CanvasTexture(c);
                    t.encoding = T.sRGBEncoding;
                    return t;
                },
                // The sun's shadow box (§6, rev 3): 36 × 36 m, during an encounter
                // fixed on the fight box and lanes; while roaming centred 6 m ahead of
                // the player, snapped to a 4 m grid and re-fitted only when it moves.
                fitShadowCamera: function (force) {
                    const so = this._so, T = global.THREE;
                    if (!so.sun || !T) return;
                    const lp = this.logicalPhase();
                    let cx, cz;
                    if (ENCOUNTER_PHASES.indexOf(lp) !== -1) {
                        const c = strikeOpsArenaToMap(C.zones[this.zoneIndex], 0, 6);
                        cx = c.x; cz = c.z;
                    } else {
                        const p = so.player;
                        cx = Math.round((p.x + Math.sin(p.yaw) * 6) / 4) * 4;
                        cz = Math.round((p.z + Math.cos(p.yaw) * 6) / 4) * 4;
                    }
                    const key = cx.toFixed(2) + ',' + cz.toFixed(2) + ',' + this.soTheme.key;
                    if (!force && key === so.shadowKey) return;
                    so.shadowKey = key;
                    const centre = mapToWorld(cx, cz);
                    const el = (this.soTheme.scene.sunElevationDeg || 38) * Math.PI / 180;
                    const dx = 22, dz = -14, l = Math.hypot(dx, dz);
                    const D = 50;
                    so.sun.position.set(centre.x + dx / l * D * Math.cos(el), D * Math.sin(el), centre.z + dz / l * D * Math.cos(el));
                    so.sun.target.position.set(centre.x, 0, centre.z);
                    so.sun.target.updateMatrixWorld();
                    const cam = so.sun.shadow.camera;
                    cam.left = -18; cam.right = 18; cam.top = 18; cam.bottom = -18; cam.near = 1; cam.far = 120;
                    cam.updateProjectionMatrix();
                },

                // ---------------- enemy visuals (§6.1) ----------------
                spawnRoundVisuals: function (round, outgoing) {
                    const so = this._so, T = global.THREE;
                    if (!round || this.renderMode !== 'gl' || !so.scene || !so.assets || !so.assets.settled || round.visual) return;
                    // roaming holds the next round's question without enemies
                    if (!outgoing && this.logicalPhase() === 'roaming') return;
                    // enemies are placed in the map frame (identity group)
                    const visual = {group: new T.Group(), disposables: new Set(), outgoing: !!outgoing};
                    round.visual = visual;
                    so.scene.add(visual.group);
                    so.rounds.push(round);
                    round.enemies.forEach(e => {
                        if (outgoing && e.index !== (so.transition ? so.transition.from.taggedIndex : -1)) return;
                        this.makeEnemyVisual(round, e);
                    });
                },
                makeEnemyVisual: function (round, e) {
                    const so = this._so, T = global.THREE, tpl = so.assets && so.assets.enemy;
                    const visual = round.visual;
                    const vis = {root: new T.Group(), inner: null, mixer: null, actions: {}, role: null, action: null, mats: [], skeletons: [], procedural: false, starsDone: false, shootAt: -1};
                    const scaleMul = e.kind === 'copy' ? C.boss.scale : 1;
                    if (tpl && !tpl.tooMany) {
                        const cloned = strikeOpsCloneSkinned(tpl.scene, T);
                        vis.inner = cloned.root;
                        vis.skeletons = cloned.skeletons;
                        vis.skeletons.forEach(sk => visual.disposables.add(sk));
                        const map = new Map();
                        vis.inner.traverse(o => {
                            if (!o.isMesh) return;
                            if (!map.has(o.material)) {
                                const c = o.material.clone();
                                c.transparent = true;
                                c.depthWrite = true;
                                map.set(o.material, c);
                                vis.mats.push({slot: o.material.name || 'Team', mat: c});
                                visual.disposables.add(c);
                            }
                            o.material = map.get(o.material);
                            o.castShadow = false;
                            o.receiveShadow = false;
                        });
                        vis.inner.scale.setScalar(tpl.scale * scaleMul);
                        vis.mixer = new T.AnimationMixer(vis.inner);
                        vis.muzzle = vis.inner.getObjectByName(tpl.weaponBone) || null;
                    } else {
                        vis.procedural = true;
                        const team = so.mats.proc.clone(), trim = so.mats.procTrim.clone();
                        [team, trim].forEach(c => { c.transparent = true; visual.disposables.add(c); });
                        vis.mats.push({slot: 'Team', mat: team}, {slot: 'Trim', mat: trim});
                        const g = new T.Group();
                        const body = new T.Mesh(so.geo.capsule, team); body.position.y = 0.95; g.add(body);
                        const head = new T.Mesh(so.geo.head, team); head.position.y = 1.47; g.add(head);
                        const visor = new T.Mesh(so.geo.box, trim); visor.scale.set(0.36, 0.1, 0.12); visor.position.set(0, 1.47, 0.2); g.add(visor);
                        const pack = new T.Mesh(so.geo.box, trim); pack.scale.set(0.34, 0.36, 0.16); pack.position.set(0, 1.0, -0.26); g.add(pack);
                        [-0.36, 0.36].forEach(x => { const arm = new T.Mesh(so.geo.limb, team); arm.position.set(x, 0.98, 0.08); arm.rotation.x = -0.8; g.add(arm); });
                        [-0.13, 0.13].forEach(x => { const leg = new T.Mesh(so.geo.limb, trim); leg.position.set(x, 0.32, 0); g.add(leg); });
                        const rifle = new T.Mesh(so.geo.box, trim); rifle.scale.set(0.07, 0.1, 0.6); rifle.position.set(0.12, 1.0, 0.36); g.add(rifle);
                        g.scale.setScalar(scaleMul);
                        vis.inner = g;
                    }
                    vis.root.add(vis.inner);
                    vis.root.visible = false;
                    visual.group.add(vis.root);
                    e.vis = vis;
                    this.tintEnemy(e);
                    return vis;
                },
                // Team = lane tint (soldiers) or boss tint (copies); Trim × trimTint;
                // copies carry the identical hologram emissive. Opacity is untouched.
                tintEnemy: function (e) {
                    const vis = e.vis;
                    if (!vis) return;
                    const s = this.soTheme.scene;
                    vis.mats.forEach(rec => {
                        const m = rec.mat;
                        if (rec.slot === 'Team') m.color.set(e.kind === 'copy' ? s.bossTint : s.squadTints[e.index % 4]);
                        else m.color.set(s.trimTint);
                        // Night themes: a soldier's lane tint is applied as its linear
                        // value, so the sRGB output keeps it saturated and solid under the
                        // night light instead of washing out to a pastel that reads like
                        // the boss's holographic copies. Reported back in sRGB (getEnemies).
                        rec.linear = !!(s.nightLights && e.kind !== 'copy' && rec.slot === 'Team');
                        if (rec.linear) m.color.convertSRGBToLinear();
                        if (m.emissive) {
                            if (e.kind === 'copy') { m.emissive.set(s.hologramTint); }
                            else if (rec.linear) {
                                // the uniform carries a little of its own hue as light, so
                                // it stays readable against lit night walls without paling
                                m.emissive.copy(m.color);
                                m.emissiveIntensity = s.squadGlow;
                            } else {
                                m.emissive.set(s.nightLights && rec.slot === 'Trim' ? s.visorEmissive : '#000000');
                                m.emissiveIntensity = s.nightLights && rec.slot === 'Trim' ? s.visorGlow : 1;
                            }
                        }
                    });
                },
                retireEnemyVisual: function (round, e) {
                    const vis = e.vis;
                    if (!vis) return;
                    const visual = round.visual;
                    if (vis.mixer) { vis.mixer.stopAllAction(); vis.mixer.uncacheRoot(vis.inner); vis.mixer = null; }
                    vis.skeletons.forEach(sk => { try { sk.dispose(); } catch (err) { /* lost */ } if (visual) visual.disposables.delete(sk); });
                    vis.mats.forEach(rec => { try { rec.mat.dispose(); } catch (err) { /* lost */ } if (visual) visual.disposables.delete(rec.mat); });
                    if (vis.root.parent) vis.root.parent.remove(vis.root);
                    if (vis.blob != null) vis.blob = null;
                    e.vis = null;
                },
                retireUntagged: function (round) {
                    if (!round) return;
                    const keep = this.correctIndex;
                    round.enemies.forEach(e => { if (e.index !== keep && round.visual) this.retireEnemyVisual(round, e); });
                },
                // Releases a round's per-enemy GPU resources; the logical round stays
                // unless `all` (teardown/loss) — the learning state never lives here.
                retireRound: function (round) {
                    const so = this._so;
                    if (!round) return;
                    round.enemies.forEach(e => this.retireEnemyVisual(round, e));
                    if (round.visual) {
                        round.visual.disposables.forEach(item => {
                            try { if (item && item.dispose) item.dispose(); } catch (err) { /* lost */ }
                            round.visual.disposables.delete(item);
                        });
                        if (round.visual.group.parent) round.visual.group.parent.remove(round.visual.group);
                        round.visual = null;
                    }
                    const i = so.rounds.indexOf(round);
                    if (i !== -1) so.rounds.splice(i, 1);
                },

                // ---------------- quality ----------------
                applyQuality: function (tier) {
                    const so = this._so;
                    tier = clamp(Math.round(tier), 0, 2);
                    this.quality = tier;
                    const r = so.renderer;
                    if (!r) return tier;
                    const dpr = global.devicePixelRatio || 1;
                    r.setPixelRatio(Math.min(dpr, C.quality.maxPixelRatio[tier]));
                    const shadows = C.quality.shadowMap[tier] > 0;
                    const changed = r.shadowMap.enabled !== shadows;
                    r.shadowMap.enabled = shadows;
                    if (so.sun) {
                        so.sun.castShadow = shadows;
                        const size = C.quality.shadowMap[tier] || 512;
                        if (so.sun.shadow.mapSize.x !== size) {
                            so.sun.shadow.mapSize.set(size, size);
                            if (so.sun.shadow.map) { so.sun.shadow.map.dispose(); so.sun.shadow.map = null; }
                        }
                    }
                    if (so.map) so.map.places.forEach(pl => [pl.structure, pl.detail].forEach(g => g.children.forEach(mesh => {
                        if (!mesh.isMesh) return;
                        mesh.castShadow = !!mesh.userData.caster && tier >= (mesh.userData.casterTier || 1);
                        mesh.receiveShadow = tier >= 1 || !!mesh.userData.caster;
                    })));
                    this.applyGrassTier();
                    this.updateCulling(true);
                    so.rounds.forEach(round => round.enemies.forEach(e => {
                        if (e.vis) e.vis.inner.traverse(o => { if (o.isMesh) o.castShadow = C.quality.enemyCastShadow[tier] && tier >= C.enemyModel.castShadowMinTier; });
                    }));
                    if (changed && so.scene) so.scene.traverse(o => { const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []); ms.forEach(m => { m.needsUpdate = true; }); });
                    this.applySceneTheme();
                    this.measure();
                    return tier;
                },
                setQuality: function (tier) {
                    this._so.fps.pinned = true;
                    return this.applyQuality(tier);
                },
                monitorFps: function (ts) {
                    const f = this._so.fps;
                    if (f.pinned) return;
                    if (!f.start) { f.start = ts; f.frames = 0; return; }
                    f.frames += 1;
                    const elapsed = ts - f.start;
                    if (elapsed < C.quality.fpsWindowMs) return;
                    const fps = f.frames * 1000 / elapsed;
                    f.start = ts; f.frames = 0;
                    if (fps < C.quality.fpsFloor && this.quality > 0 && ts - f.lastDowngrade >= C.quality.downgradeCooldownMs) {
                        f.lastDowngrade = ts;
                        this.applyQuality(this.quality - 1);
                    }
                },

                // ---------------- frame loop ----------------
                startLoop: function () {
                    const so = this._so;
                    if (so.frame || so.destroyed || so.navigated || !so.renderer || this.renderMode !== 'gl') return;
                    if (this.phase === 'paused' || this.phase === 'lost') return;
                    if (!so.tick) so.tick = ts => this.tick(ts);
                    so.lastTs = null;
                    so.frame = requestAnimationFrame(so.tick);
                },
                stopLoop: function () {
                    const so = this._so;
                    if (so.frame) cancelAnimationFrame(so.frame);
                    so.frame = null;
                },
                tick: function (ts) {
                    const so = this._so;
                    so.frame = null;
                    if (so.destroyed || so.navigated || !so.renderer) return;
                    if (this.phase === 'paused' || this.phase === 'lost') return;
                    const dtMs = so.lastTs == null ? 16 : clamp(ts - so.lastTs, 0, 50);
                    so.lastTs = ts;
                    // a viewport change not yet seen by the observer: re-measure now
                    // (window.inner* is not a layout read)
                    // an inline root text-size change (a string compare, no layout read)
                    // re-measures like a viewport change
                    const rootFs = global.document && global.document.documentElement ? global.document.documentElement.style.fontSize : '';
                    if (global.innerWidth !== so.innerW || global.innerHeight !== so.innerH || rootFs !== so.rootFs) {
                        so.innerW = global.innerWidth; so.innerH = global.innerHeight; so.rootFs = rootFs;
                        if (so.measuredOnce) this.measure();
                        so.measuredOnce = true;
                    }
                    this.step(dtMs, ts);
                    if (so.rendering && this.phase !== 'loading') this.renderFrame();
                    this.monitorFps(ts);
                    so.frame = requestAnimationFrame(so.tick);
                },
                step: function (dtMs, ts) {
                    const so = this._so;
                    const t = so.transition;
                    if (this.phase === 'roaming' && t) t.elapsedMs = (t.elapsedMs || 0) + dtMs;
                    const c0 = cpuNow();
                    this.updateMovement(dtMs);
                    this.noteCpu('collisionMs', cpuNow() - c0);
                    if (this.phase === 'advancing') {
                        const timer = this.findTimer('advancing');
                        if (timer && 1 - this.timerRemaining(timer) / timer.ms >= 0.5) this.applyLapPose();
                    }
                    if (this.phase === 'roaming' && !so.autopilot && !this.goHint && nowMs() - Math.max(so.lastMoveInputAt, so.roamSince) >= C.map.idleHintMs) this.goHint = true;
                    this.updatePlace();
                    this.edgePan(dtMs);
                    this.updateLock();
                    this.updateCamera(dtMs);
                    this.fitShadowCamera(false);
                    this.updateMapVisuals();
                    this.updateEnemies(dtMs);
                    this.updateParticles(dtMs);
                    this.updateWeaponFeel(dtMs);
                    this.updateClouds(dtMs);
                    this.updateOverlay();
                    if (ts - so.minimapAt >= 1000 / C.minimap.redrawHz) { so.minimapAt = ts; const m0 = cpuNow(); this.drawMinimap(); if (this.mapOpen) this.drawMapView(); this.noteCpu('minimapMs', cpuNow() - m0); }
                    if (ts - so.themeCheckAt > 500) { so.themeCheckAt = ts; this.refreshTheme(); }
                },
                renderFrame: function () {
                    const so = this._so, r = so.renderer;
                    if (!r || !so.scene || !so.camera) return;
                    r.info.reset();
                    so.stats.shadowCalls = 0;
                    so.stats.shadowTris = 0;
                    r.clear();
                    r.render(so.scene, so.camera);
                    const sceneCalls = r.info.render.calls, sceneTris = r.info.render.triangles;
                    r.clearDepth();
                    r.render(so.vmScene, so.vmCamera);
                    const calls = r.info.render.calls, tris = r.info.render.triangles;
                    const last = so.stats.last = {
                        calls, triangles: tris,
                        passes: {
                            shadow: {calls: so.stats.shadowCalls, triangles: so.stats.shadowTris},
                            scene: {calls: sceneCalls - so.stats.shadowCalls, triangles: sceneTris - so.stats.shadowTris},
                            overlay: {calls: calls - sceneCalls, triangles: tris - sceneTris},
                        },
                    };
                    so.stats.peak.calls = Math.max(so.stats.peak.calls, last.calls);
                    so.stats.peak.triangles = Math.max(so.stats.peak.triangles, last.triangles);
                },

                // ---------------- camera (§6 camera/transitions) ----------------
                // First person at the map pose: no bob, no roll, constant eye (§6).
                updateCamera: function (dtMs) {
                    const so = this._so, cam = so.cam, eye = C.movement.eye, p = so.player;
                    void dtMs;
                    cam.kick = this.reducedMotion ? 0 : so.kick;
                    cam.x = p.x; cam.y = eye; cam.z = p.z;
                    cam.yaw = p.yaw;
                    cam.pitch = clamp(p.pitch + cam.kick, -1.2, 1.2);
                    // time-based ADS blend (120 ms; an instant cut under reduced motion)
                    const adsTarget = this.ads ? 1 : 0;
                    if (so.adsGoal !== adsTarget) { so.adsGoal = adsTarget; so.adsFrom = so.adsT; so.adsAt = nowMs(); }
                    const k = this.reducedMotion ? 1 : clamp((nowMs() - (so.adsAt || 0)) / C.weapon.adsMs, 0, 1);
                    so.adsT = so.adsFrom == null ? adsTarget : so.adsFrom + (adsTarget - so.adsFrom) * k;
                    cam.aspect = so.view.w / Math.max(1, so.view.h);
                    const f = strikeOpsHipFov(so.view.w, so.view.h, C);
                    so.fov = f;
                    cam.fov = f.vfov + (f.adsVfov - f.vfov) * so.adsT;
                    const camera = so.camera;
                    if (camera) {
                        const w = mapToWorld(p.x, p.z, eye);
                        camera.position.set(w.x, w.y, w.z);
                        camera.rotation.set(cam.pitch, Math.PI - cam.yaw, 0);
                        const dy = so.horizonDy || 0, vo = camera.view;
                        if (dy && (!vo || !vo.enabled || vo.offsetY !== dy || vo.fullWidth !== so.view.w || vo.fullHeight !== so.view.h)) camera.setViewOffset(so.view.w, so.view.h, 0, dy, so.view.w, so.view.h);
                        else if (!dy && vo && vo.enabled) camera.clearViewOffset();
                        if (camera.fov !== cam.fov || camera.aspect !== cam.aspect) {
                            camera.fov = cam.fov;
                            camera.aspect = cam.aspect;
                            camera.updateProjectionMatrix();
                        }
                        camera.updateMatrixWorld();
                    }
                },
                // Map-frame movement (§3, §5.1): acceleration, sprint while roaming,
                // ←/→ turning, the fight-box clamp in encounters, the autopilot,
                // collision against the committed map state and the trigger check.
                updateMovement: function (dtMs) {
                    const so = this._so, mv = C.movement, dt = dtMs / 1000, p = so.player;
                    const phase = this.phase;
                    const enc = ENCOUNTER_PHASES.indexOf(phase) !== -1, roam = phase === 'roaming';
                    so.pushing = false;
                    if (so.navigated || so.destroyed || (!enc && !roam)) { so.vel.x = 0; so.vel.z = 0; so.speed = 0; so.sprinting = false; return; }
                    if (so.assist) { this.stepAssist(dtMs); return; }
                    const keys = so.keys, vi = so.moveInput;
                    let fx = 0, fz = 0, turn = 0;
                    if (keys.has('KeyW') || keys.has('ArrowUp')) fz += 1;
                    if (keys.has('KeyS') || keys.has('ArrowDown')) fz -= 1;
                    if (keys.has('KeyD')) fx += 1;
                    if (keys.has('KeyA')) fx -= 1;
                    if (keys.has('ArrowRight')) turn += 1;
                    if (keys.has('ArrowLeft')) turn -= 1;
                    const sl = Math.hypot(so.stick.x, so.stick.y);
                    if (sl > mv.stickDeadZone) { fx += so.stick.x; fz -= so.stick.y; }
                    if (vi) { fx += vi.x || 0; fz += vi.z || 0; turn += vi.turn || 0; }
                    const moveLen = Math.hypot(fx, fz);
                    const active = moveLen > 0.08 || Math.abs(turn) > 0.05;
                    if (active) {
                        so.lastMoveInputAt = nowMs();
                        if (this.goHint) this.goHint = false;
                        if (so.autopilot) this.cancelAutopilot();
                        if (so.lock && (moveLen > mv.stickDeadZone || Math.abs(turn) > 0.05)) this.cancelLock();
                    }
                    if (turn) p.yaw = wrapAngle(p.yaw + clamp(turn, -1, 1) * mv.turnKeysDegPerS * Math.PI / 180 * dt);
                    let wx = 0, wz = 0, sprint = false;
                    const ap = so.autopilot;
                    if (ap) {
                        // re-route after a push ≥ 1 m off the route or a map-state change
                        if (ap.k !== so.mapZoneIndex || this.distanceToRoute(ap) > 1) this.routeAutopilot();
                        const a = so.autopilot;
                        if (a) {
                            const st = strikeOpsAutopilotStep(a, p, C, dtMs, this.reducedMotion);
                            p.yaw = st.yaw;
                            wx = st.dirX; wz = st.dirZ; sprint = !!a.sprint;
                            if (st.done) this.cancelAutopilot();
                        }
                    } else if (moveLen > 0.08) {
                        const n = moveLen > 1 ? 1 / moveLen : 1;
                        const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
                        // forward = (sin yaw, cos yaw), right = (cos yaw, −sin yaw)
                        wx = (cy * fx + sy * fz) * n;
                        wz = (-sy * fx + cy * fz) * n;
                        sprint = !!so.sprintKey || sl >= mv.sprintStickRim || !!(vi && vi.sprint);
                    }
                    sprint = sprint && roam;
                    let speed = enc ? mv.fight : (sprint ? mv.sprint : mv.walk);
                    if (this.ads) speed *= mv.adsFactor;
                    strikeOpsVelocityStep(so.vel, wx, wz, speed, C, dt);
                    const fb = strikeOpsPlaceFrame(C.zones[this.zoneIndex]).fightBox;
                    const clampRect = enc ? fb : C.map.playBounds;
                    const col = strikeOpsColliders(so.mapZoneIndex, C);
                    const q = strikeOpsResolveMove(p, {x: so.vel.x * dt, z: so.vel.z * dt}, col, clampRect, mv.radius, mv.maxStepM);
                    so.speed = dt > 0 ? Math.hypot(q.x - p.x, q.z - p.z) / dt : 0;
                    so.sprinting = sprint && (Math.abs(wx) + Math.abs(wz) > 0.01);
                    if (enc && (wx || wz)) {
                        const e = 1e-6;
                        so.pushing = (q.x <= fb.minX + e && wx < -0.1) || (q.x >= fb.maxX - e && wx > 0.1) || (q.z <= fb.minZ + e && wz < -0.1) || (q.z >= fb.maxZ - e && wz > 0.1);
                        if (so.pushing && !so.boundaryToast) {
                            so.boundaryToast = true;
                            this.showToast('הישארו בקו האש עד שהמקום נקי');
                            this.announce('הישארו בקו האש עד שהמקום נקי');
                        }
                    }
                    // §6.5: soft footsteps (0.45 s walking / 0.33 s sprinting) and one
                    // soft thud per wall contact (no camera jolt); silent unless the
                    // AudioContext is running
                    const ac = so.audio, audible = !!ac && ac.state === 'running';
                    if (so.speed > 0.6 && audible) {
                        so.stepAcc = (so.stepAcc == null ? 300 : so.stepAcc) + dtMs;
                        if (so.stepAcc >= (so.sprinting ? 330 : 450)) { so.stepAcc = 0; this.synth('step'); }
                    } else so.stepAcc = null;
                    const want = Math.hypot(so.vel.x, so.vel.z) * dt, got = Math.hypot(q.x - p.x, q.z - p.z);
                    const blocked = roam && want > 0.02 && got < want * 0.5;
                    if (blocked && !so.blocked && audible && nowMs() - (so.thudAt || 0) > 700) { so.thudAt = nowMs(); this.synth('thud'); }
                    so.blocked = blocked;
                    p.x = q.x; p.z = q.z;
                    if (roam) this.checkTrigger();
                },
                // Centre-view assist (rev 3.1): the player glides to the anchor and
                // the view turns to the heading and levels over centreAssistMs; a
                // cut under reduced motion. Input is ignored meanwhile.
                startAssist: function () {
                    const so = this._so, zone = C.zones[this.zoneIndex], f = strikeOpsPlaceFrame(zone), p = so.player;
                    so.vel.x = 0; so.vel.z = 0;
                    const to = {x: f.anchor.x, z: f.anchor.z, yaw: f.heading, pitch: 0};
                    so.assist = {from: {x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch}, to, t: 0, ms: C.movement.centreAssistMs};
                    if (this.reducedMotion || this.renderMode !== 'gl') this.finishAssist();
                },
                stepAssist: function (dtMs) {
                    const so = this._so, a = so.assist, p = so.player;
                    if (!a) return;
                    a.t += dtMs;
                    if (a.t >= a.ms) { this.finishAssist(); return; }
                    const k = ease(a.t / a.ms);
                    p.x = a.from.x + (a.to.x - a.from.x) * k;
                    p.z = a.from.z + (a.to.z - a.from.z) * k;
                    p.yaw = lerpAngle(a.from.yaw, a.to.yaw, k);
                    p.pitch = a.from.pitch + (a.to.pitch - a.from.pitch) * k;
                    so.speed = 0;
                },
                finishAssist: function () {
                    const so = this._so, a = so.assist, p = so.player;
                    if (!a) return;
                    p.x = a.to.x; p.z = a.to.z; p.yaw = a.to.yaw; p.pitch = a.to.pitch;
                    so.assist = null;
                    so.vel.x = 0; so.vel.z = 0;
                    if (so.camera) this.updateCamera(0);
                },
                // Sets the pose (teleport, skipTransition): zero velocity; cancels
                // the autopilot, lock-on, ADS, the assist and the virtual input.
                placePlayer: function (x, z, yaw, pitch) {
                    const so = this._so, p = so.player;
                    p.x = x; p.z = z; p.yaw = yaw; p.pitch = clamp(pitch || 0, C.movement.pitchMin, C.movement.pitchMax);
                    so.vel.x = 0; so.vel.z = 0; so.speed = 0;
                    so.assist = null;
                    so.moveInput = null;
                    this.cancelAutopilot();
                    this.cancelLock();
                    this.ads = false;
                    this.updatePlace();
                    if (so.camera) this.updateCamera(0);
                },
                // ---------------- navigation (§3 guidance 6, §5.1 routing) ----------------
                startAutopilot: function (target, opts) {
                    const so = this._so;
                    const route = strikeOpsRoute(so.player, target, so.mapZoneIndex, C);
                    if (!route.ok) return false;
                    so.autopilot = {target, points: route.points, index: 1, via: route.via, k: so.mapZoneIndex, sprint: !!(opts && opts.sprint)};
                    this.autopilot = true;
                    this.goHint = false;
                    so.lastMoveInputAt = nowMs();
                    return true;
                },
                routeAutopilot: function () {
                    const so = this._so, ap = so.autopilot;
                    if (!ap) return;
                    const route = strikeOpsRoute(so.player, ap.target, so.mapZoneIndex, C);
                    if (!route.ok) { this.cancelAutopilot(); return; }
                    ap.points = route.points; ap.index = 1; ap.via = route.via; ap.k = so.mapZoneIndex;
                },
                cancelAutopilot: function () {
                    this._so.autopilot = null;
                    if (this.autopilot) this.autopilot = false;
                },
                distanceToRoute: function (ap) {
                    const p = this._so.player, pts = ap.points;
                    let best = Infinity;
                    for (let i = Math.max(1, ap.index); i < pts.length; i++) best = Math.min(best, segPointDist(pts[i - 1].x, pts[i - 1].z, pts[i].x, pts[i].z, p.x, p.z));
                    return pts.length < 2 ? 0 : best;
                },
                // The remaining route to the objective (guidance; never per frame).
                guidanceRoute: function () {
                    const so = this._so;
                    if (this.logicalPhase() !== 'roaming') return [];
                    const ap = so.autopilot;
                    if (ap && ap.k === so.mapZoneIndex) return [{x: so.player.x, z: so.player.z}].concat(ap.points.slice(Math.min(ap.index, ap.points.length - 1)));
                    const t = nowMs(), g = so.guide;
                    const stale = !g || g.k !== so.mapZoneIndex || g.target !== this.zoneId || t - g.at >= 500 || Math.hypot(g.from.x - so.player.x, g.from.z - so.player.z) >= 1;
                    if (stale) {
                        const r0 = cpuNow(), r = strikeOpsRoute(so.player, this.zoneId, so.mapZoneIndex, C);
                        this.noteCpu('routeMs', cpuNow() - r0);
                        so.guide = {k: so.mapZoneIndex, target: this.zoneId, at: t, from: {x: so.player.x, z: so.player.z}, points: r.ok ? r.points : []};
                    }
                    const pts = so.guide.points;
                    return pts.length ? [{x: so.player.x, z: so.player.z}].concat(pts.slice(1)) : [];
                },
                // Touch acts on pointerup (a tap during another finger's touch may
                // never become a click); the click that follows is then swallowed.
                onGoPointerDown: function () { this._so.goTouched = false; },
                onGoPointerUp: function (e) {
                    if (!e || e.pointerType !== 'touch') return;
                    this._so.goTouched = true;
                    this.onGo();
                },
                onGoClick: function () {
                    if (this._so.goTouched) { this._so.goTouched = false; return; }
                    this.onGo();
                },
                onGo: function () {
                    const so = this._so;
                    if (this.phase !== 'roaming' || this.renderMode !== 'gl' || so.navigated) return false;
                    if (so.autopilot) { this.cancelAutopilot(); return true; }
                    if (this.startAutopilot(this.zoneId)) return true;
                    this.showToast('אין דרך מכאן — נסו לחזור לשביל');
                    if (!so.warnedRoute && global.console) { so.warnedRoute = true; console.warn('strike-ops: no route to ' + this.zoneId); }
                    return false;
                },
                toggleMap: function () {
                    const p = this.phase;
                    if (this.mapOpen) { this.closeMap(); return; }
                    if (this.renderMode !== 'gl' || (p !== 'briefing' && p !== 'roaming')) return;
                    this.mapOpen = true;
                },
                closeMap: function () {
                    if (!this.mapOpen) return;
                    const view = this.$refs.mapview, doc = global.document;
                    const inside = view && doc && view.contains && view.contains(doc.activeElement);
                    this.mapOpen = false;
                    if (inside) this.focusRoot();
                },
                onMinimapClick: function () { this.toggleMap(); },
                updateWeaponFeel: function (dtMs) {
                    const so = this._so, dt = Math.min(dtMs, 50) / 1000, rc = C.weapon.recoil;
                    so.kickVel += (-rc.springK * so.kick - rc.damping * so.kickVel) * dt;
                    so.kick += so.kickVel * dt;
                    so.vmKickVel += (-rc.springK * so.vmKick - rc.damping * so.vmKickVel) * dt;
                    so.vmKick += so.vmKickVel * dt;
                    if (Math.abs(so.kick) < 1e-5 && Math.abs(so.kickVel) < 1e-4) { so.kick = 0; so.kickVel = 0; }
                    const rig = so.gunRig;
                    if (!rig) return;
                    const a = so.adsT, portrait = so.view.h > so.view.w;
                    const hipX = portrait ? 0.15 : 0.23, hipY = portrait ? -0.24 : -0.2;
                    rig.position.set(hipX * (1 - a), hipY + 0.11 * a, -0.6 + 0.16 * a + so.vmKick * 0.6);
                    rig.rotation.set(0.04 + so.vmKick * 2.2, 0.09 * (1 - a), -0.05 * (1 - a));
                    if (so.muzzle) {
                        const on = nowMs() < so.muzzleUntil;
                        so.muzzle.material.opacity = on ? 1 : 0;
                        if (so.muzzlePos) so.muzzle.position.copy(so.muzzlePos);
                    }
                    if (so.vmCamera) {
                        const fov = so.fov ? so.fov.vfov : 50;
                        so.vmCamera.fov = Math.min(70, Math.max(45, fov));
                        so.vmCamera.aspect = so.view.w / Math.max(1, so.view.h);
                        so.vmCamera.updateProjectionMatrix();
                    }
                },
                updateClouds: function (dtMs) {
                    const so = this._so;
                    if (!so.clouds || this.reducedMotion) return;
                    so.cloudT = (so.cloudT || 0) + dtMs / 1000;
                    so.clouds.forEach((c, i) => { c.position.x = c.userData.baseX + Math.sin(so.cloudT * 0.02 + i) * 6; });
                },

                // ---------------- enemies per frame ----------------
                updateEnemies: function (dtMs) {
                    const so = this._so, T = global.THREE;
                    const animated = [];
                    const m4 = so.tmpMatrix || (so.tmpMatrix = new T.Matrix4());
                    const schedRunning = this.phase === 'engaging' || this.phase === 'wrong';
                    let mask = '';
                    const round = so.round;
                    if (round) round.enemies.forEach(e => {
                        const info = this.enemyInfo(e);
                        e.info = info;
                        if (e.kind === 'copy' && schedRunning && info.hittable) e.exposureAcc += dtMs;
                        mask += info.hittable ? 'e' : 'h';
                        if (!e.vis) return;
                        this.drawEnemy(e, info, round, dtMs);
                        if (e.vis.root.visible && e.vis.mixer) animated.push(e);
                    });
                    // the tagged enemy of the outgoing round: knockdown then fade
                    const prev = so.prevRound;
                    if (prev && prev.visual) {
                        const t = so.transition;
                        const timer = t ? this.findTimer(t.kind) : null;
                        const kdT = C.timing.correctToTransitionMs + (timer ? timer.ms - this.timerRemaining(timer) : (t ? t.elapsedMs || 0 : 0));
                        const fadeEnd = C.knockdown.fadeStartMs + C.knockdown.fadeMs;
                        if (kdT >= fadeEnd || !t) {
                            this.retireRound(prev);
                            if (t) t.outgoingRetired.tagged = true;
                        } else prev.enemies.forEach(e => { if (e.vis) { this.drawTagged(e, kdT, prev, dtMs); if (e.vis.mixer && e.vis.root.visible) animated.push(e); } });
                    }
                    if (mask !== this.stateMask) this.stateMask = mask;
                    // mixer cap: knockdowns and movers first, cheering last
                    const cap = (so.mobileCap || this.quality <= 1) ? C.quality.maxAnimated.mobile : C.quality.maxAnimated.desktop;
                    animated.sort((a, b) => (a.vis.role === 'cheer') - (b.vis.role === 'cheer'));
                    so.mixersActive = Math.min(cap, animated.length);
                    animated.slice(0, cap).forEach(e => e.vis.mixer.update(dtMs / 1000));
                    // blob shadows under visible enemies
                    if (so.blobs) {
                        let k = 1;
                        const add = e => {
                            if (k >= 9 || !e.vis || !e.vis.root.visible) return;
                            const wp = e.vis.root.getWorldPosition(so.tmpVec || (so.tmpVec = new T.Vector3()));
                            const sc = e.kind === 'copy' ? C.boss.scale : 1;
                            m4.makeScale(0.95 * sc, 1, 0.95 * sc);
                            m4.setPosition(wp.x, 0.03, wp.z);
                            so.blobs.setMatrixAt(k++, m4);
                        };
                        if (round) round.enemies.forEach(add);
                        if (prev && prev.visual) prev.enemies.forEach(add);
                        so.blobs.count = k;
                        so.blobs.instanceMatrix.needsUpdate = true;
                    }
                },
                setEnemyOpacity: function (e, a) {
                    e.vis.mats.forEach(rec => { rec.mat.opacity = a; });
                },
                // pose: map frame (THREE = (−x, y, z); a map yaw ψ is rotation.y = −ψ)
                placeEnemy: function (e, pose) {
                    const r = e.vis.root;
                    r.position.set(-pose.x, 0, pose.z);
                    r.rotation.y = -pose.yaw;
                },
                drawEnemy: function (e, info, round, dtMs) {
                    const so = this._so, vis = e.vis, pose = info.pose, lp = this.logicalPhase();
                    this.placeEnemy(e, pose);
                    const isCopy = e.kind === 'copy';
                    let visible = info.alpha > 0.001, opacity = info.alpha;
                    let role = 'idle', once = false, timeScale = 1;
                    if (isCopy) {
                        const base = 0.85;
                        opacity = base * info.alpha;
                        if (info.state === 'dissolved' || (lp === 'correct' && e.index !== this.correctIndex)) {
                            const el = lp === 'correct' ? this.timerElapsed('correct') : this.timerElapsed('wrong');
                            const fl = C.boss.flickerMs, dz = C.boss.dissolveMs;
                            if (el < fl) opacity = this.reducedMotion ? base * 0.5 : ((el > fl * 0.25 && el < fl * 0.5) || el > fl * 0.75 ? base * 0.25 : base);
                            else opacity = el < fl + dz ? base * (1 - (el - fl) / dz) : 0;
                            if (el >= fl + dz || !isFinite(el)) opacity = 0;
                            if (el >= fl && !vis.sparkled && el < fl + dz) { vis.sparkled = true; this.spawnParticles('sparkle', this.enemyWorld(e, pose, 1.2), 4); }
                        } else vis.sparkled = false;
                        if (lp === 'correct' && e.index === this.correctIndex) {
                            const el = this.timerElapsed('correct');
                            opacity = 1;
                            vis.mats.forEach(rec => { if (rec.mat.emissive) rec.mat.emissiveIntensity = Math.max(0, 0.5 * (1 - el / 200)); });
                            role = el < 300 ? 'hit' : 'down'; once = true;
                            this.knockdownFx(e, el, pose);
                            if (el >= C.knockdown.fadeStartMs) opacity = Math.max(0, 1 - (el - C.knockdown.fadeStartMs) / C.knockdown.fadeMs);
                        } else {
                            if (e.reformAt > 0) {
                                const k = (nowMs() - e.reformAt) / C.boss.reformMs;
                                if (k < 1) opacity = base * Math.max(0, k);
                                else e.reformAt = -1;
                            }
                            const pulse = this.quality >= 1 && !this.reducedMotion ? 0.35 + 0.15 * Math.sin(nowMs() / 260) : 0.4;
                            vis.mats.forEach(rec => { if (rec.mat.emissive) rec.mat.emissiveIntensity = pulse; });
                            role = pose.moving ? 'move' : (info.state === 'split' && !pose.moving ? 'idle' : 'aim');
                            if (pose.moving) timeScale = pose.speed / C.enemyModel.clipSpeeds[pose.speed > C.moveLimits.moveMaxSpeed ? 'run' : 'move'];
                            if (pose.moving && pose.speed > C.moveLimits.moveMaxSpeed) role = 'run';
                        }
                        visible = opacity > 0.001;
                    } else {
                        const st = info.state;
                        if (st === 'hidden') { visible = info.alpha > 0.001 && pose.moving; role = pose.moving ? 'run' : 'crouch'; }
                        else if (st === 'peek-out' || st === 'peek-in') role = pose.stance === 'crouch' ? 'crouch' : 'aim';
                        else if (st === 'dash') { role = pose.speed > C.moveLimits.moveMaxSpeed ? 'run' : 'move'; timeScale = pose.speed / C.enemyModel.clipSpeeds[role]; }
                        else if (st === 'hit') { role = 'hit'; once = true; }
                        else if (st === 'down') {
                            const el = this.timerElapsed('correct');
                            role = 'down'; once = true;
                            this.knockdownFx(e, el, pose);
                        } else if (st === 'cheer') { role = 'cheer'; once = true; }
                        else if (st === 'exposed') {
                            role = 'aim';
                            const sq = strikeOpsSquadAt(e.index, e.n, this.schedNow(), C, e.shiftMs);
                            const style = strikeOpsSquadStyle(C.zones[this.zoneIndex]);
                            const wave = style.firstPeekGesture === 'cheer' && sq.cycle === 0 && !this.reducedMotion && sq.tIn > 300 && sq.tIn < 1900;
                            if (wave) role = 'cheer';
                            else if (strikeOpsVolley(style, sq.cycle, e.index) && sq.tIn > style.volleyFrom && sq.tIn < style.volleyTo) {
                                role = 'shoot';
                                if (vis.shootAt !== sq.cycle && !this.reducedMotion) {
                                    vis.shootAt = sq.cycle;
                                    this.spawnParticles('puff', this.enemyWorld(e, pose, 1.15, 0.6), 3);
                                    this.synth('puff');
                                }
                            }
                        }
                        if (st === 'peek-out' || st === 'peek-in') visible = true;
                        if (this.reducedMotion) opacity = info.alpha;
                        if (lp === 'briefing' || lp === 'loading') visible = false;
                        if (TRANSITION_PHASES.indexOf(lp) !== -1 && info.alpha <= 0.001) visible = false;
                    }
                    vis.root.visible = visible;
                    this.setEnemyOpacity(e, clamp(opacity, 0, 1));
                    if (!visible) return;
                    this.playRole(e, role, {once, timeScale});
                },
                // Correct-answer knockdown: stars at 450 ms, fade from 750 ms (§6.5).
                knockdownFx: function (e, el, pose) {
                    const vis = e.vis, kd = C.knockdown;
                    if (el >= kd.starsAtMs && !vis.starsDone) {
                        vis.starsDone = true;
                        this.spawnParticles('stars', this.enemyWorld(e, pose, 1.6), 6);
                    }
                    if (el >= kd.fadeStartMs) this.setEnemyOpacity(e, Math.max(0, 1 - (el - kd.fadeStartMs) / kd.fadeMs));
                    if (this.reducedMotion && vis.action) vis.action.time = vis.action.getClip().duration;
                },
                drawTagged: function (e, kdT, round, dtMs) {
                    const vis = e.vis, kd = C.knockdown;
                    const pose = e.lastPose || this.enemyInfo(e).pose;
                    this.placeEnemy(e, pose);
                    vis.root.visible = true;
                    this.playRole(e, 'down', {once: true});
                    const op = kdT < kd.fadeStartMs ? 1 : Math.max(0, 1 - (kdT - kd.fadeStartMs) / kd.fadeMs);
                    this.setEnemyOpacity(e, op);
                    if (op <= 0) vis.root.visible = false;
                },
                // A point on the enemy (map pose) in THREE world coordinates.
                enemyWorld: function (e, pose, y, forward) {
                    const f = forward || 0;
                    return mapToWorld(pose.x + Math.sin(pose.yaw) * f, pose.z + Math.cos(pose.yaw) * f, y * (e.kind === 'copy' ? C.boss.scale : 1));
                },
                playRole: function (e, role, opts) {
                    const vis = e.vis, T = global.THREE;
                    const o = opts || {};
                    if (!vis.mixer) { this.animateProcedural(e, role); vis.role = role; return; }
                    const tpl = this._so.assets && this._so.assets.enemy;
                    const clip = tpl && (tpl.clips[role] || tpl.clips.idle);
                    if (!clip) return;
                    const action = vis.mixer.clipAction(clip);
                    action.timeScale = clamp(o.timeScale || 1, 0.5, 2);
                    if (vis.role === role && vis.action === action) return;
                    const prev = vis.action;
                    if (prev !== action) {
                        action.reset();
                        if (o.once) { action.setLoop(T.LoopOnce, 1); action.clampWhenFinished = true; } else action.setLoop(T.LoopRepeat, Infinity);
                        action.play();
                        if (prev) prev.crossFadeTo(action, this.reducedMotion ? 0.01 : 0.2, false);
                    }
                    if (role === 'down' && this.reducedMotion) action.time = clip.duration;
                    vis.action = action;
                    vis.role = role;
                },
                animateProcedural: function (e, role) {
                    const g = e.vis.inner, t = nowMs() / 1000;
                    g.rotation.set(0, 0, 0);
                    g.position.y = 0;
                    if (role === 'crouch') g.position.y = -0.35;
                    if (role === 'down') g.rotation.x = this.reducedMotion ? -1.4 : -1.4 * clamp((this.timerElapsed('correct') || 0) / 600, 0, 1);
                    if (role === 'hit') g.rotation.z = Math.sin(t * 30) * 0.15;
                    if ((role === 'move' || role === 'run') && !this.reducedMotion) g.position.y = Math.abs(Math.sin(t * 10)) * 0.05;
                },

                // ---------------- projection and DOM overlay ----------------
                project: function (p) {
                    const so = this._so, T = global.THREE, cam = so.camera;
                    if (!cam || !T) return {x: -9999, y: -9999, onScreen: false, behind: true};
                    const v = (so.projVec || (so.projVec = new T.Vector3())).set(p.x, p.y, p.z);
                    const cv = (so.camVec || (so.camVec = new T.Vector3())).copy(v).applyMatrix4(cam.matrixWorldInverse);
                    const behind = cv.z > -0.05;
                    v.project(cam);
                    const x = (v.x + 1) / 2 * so.view.w, y = (1 - v.y) / 2 * so.view.h;
                    return {x: behind ? (cv.x >= 0 ? 1e5 : -1e5) : x, y, onScreen: !behind && v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1, behind};
                },
                // A ray through a root-relative pixel, returned in the MAP frame.
                rayFor: function (px) {
                    const so = this._so, T = global.THREE, cam = so.camera;
                    const ndc = new T.Vector3(px.x / so.view.w * 2 - 1, 1 - px.y / so.view.h * 2, 0.5).unproject(cam);
                    const o = cam.position;
                    const dw = ndc.sub(o).normalize();
                    return {o: {x: -o.x, y: o.y, z: o.z}, d: {x: -dw.x, y: dw.y, z: dw.z}};
                },
                // The enlarged torso hitbox in the map frame (lateral width along the
                // place's lateral axis: w/d swap for headings 90°/270°).
                hitboxOf: function (e, pose) {
                    const hb = C.aim.hitbox, s = e.kind === 'copy' ? C.boss.scale : 1;
                    const swap = strikeOpsPlaceFrame(C.zones[e.zoneIndex]).swapXZ;
                    const cy = hb.centerY * s, h = hb.h * s, w = (swap ? hb.d : hb.w) * s, d = (swap ? hb.w : hb.d) * s;
                    return {minX: pose.x - w / 2, maxX: pose.x + w / 2, minY: cy - h / 2, maxY: cy + h / 2, minZ: pose.z - d / 2, maxZ: pose.z + d / 2};
                },
                torsoWorld: function (e, pose) {
                    return this.enemyWorld(e, pose, C.aim.hitbox.centerY);
                },
                updateOverlay: function () {
                    const so = this._so, refs = this.$refs, round = so.round;
                    const els = refs.plateEls || [];
                    const lp = this.logicalPhase();
                    const plates = [], idx = [];
                    const stems = {};
                    (refs.stemEls || []).forEach(el => { stems[el.getAttribute('data-index')] = el; el.classList.add('so-plate-unplaced'); });
                    els.forEach(el => {
                        const i = Number(el.getAttribute('data-index'));
                        const e = round && round.enemies[i];
                        if (!e || !e.info || lp === 'loading' || lp === 'briefing') { el.classList.add('so-plate-unplaced'); return; }
                        const info = e.info;
                        if (TRANSITION_PHASES.indexOf(lp) !== -1 && info.alpha <= 0.001) { el.classList.add('so-plate-unplaced'); return; }
                        let anchor = info.pose, standing = info.pose.stance !== 'crouch';
                        if (e.kind !== 'copy' && (info.state === 'hidden' || info.state === 'peek-in' || info.state === 'peek-out')) {
                            const spot = e.lane.spots[info.pose.spot || 0];
                            anchor = strikeOpsArenaToMap(C.zones[e.zoneIndex], spot.peek.x, spot.peek.z);
                            standing = true;
                        }
                        const ay = (standing ? C.enemyModel.nameplateAnchorY : C.enemyModel.crouchAnchorY) * (e.kind === 'copy' ? C.boss.scale : 1);
                        const p = this.project(mapToWorld(anchor.x, anchor.z, ay));
                        const size = so.plateSizes[i] || {w: 120, h: 34, lines: 1};
                        plates.push({x: p.x, y: p.y, w: size.w, h: size.h, el, i});
                        idx.push(i);
                    });
                    // screen order (pinned plates at their edge, ties by index), §6
                    plates.sort((a, b) => (a.x - b.x) || (a.i - b.i));
                    const text = this.textScale();
                    let lay = strikeOpsLayoutPlates(plates, so.safe, C, {preferTiers: text >= 1.5});
                    // collapse hysteresis (300 ms) against flicker
                    const t = nowMs();
                    if (lay.collapsed !== so.plateCollapsed) {
                        if (!so.collapseSince) so.collapseSince = t;
                        if (t - so.collapseSince < 300 && so.platesShown) lay = strikeOpsLayoutPlates(plates, so.safe, C, {forceCollapsed: so.plateCollapsed, preferTiers: text >= 1.5});
                        else { so.plateCollapsed = lay.collapsed; so.collapseSince = 0; }
                    } else so.collapseSince = 0;
                    so.platesShown = plates.length > 0;
                    so.plateLayout = {};
                    plates.forEach((pl, k) => {
                        const pos = lay.positions[k];
                        if (!pos) return;
                        const el = pl.el;
                        el.style.transform = 'translate3d(' + Math.round(pos.left) + 'px,' + Math.round(pos.top) + 'px,0)';
                        const stem = stems[String(pl.i)];
                        if (stem && pos.tier === 0 && !lay.collapsed) {
                            stem.style.transform = 'translate3d(' + Math.round(pos.left + clamp(pl.x - pos.left, 8, pos.w - 8)) + 'px,' + Math.round(pos.top + pos.h) + 'px,0)';
                            stem.classList.remove('so-plate-unplaced');
                        }
                        el.classList.remove('so-plate-unplaced');
                        el.classList.toggle('so-collapsed', lay.collapsed);
                        el.classList.toggle('so-pin-left', pos.pin === -1);
                        el.classList.toggle('so-pin-right', pos.pin === 1);
                        so.plateLayout[pl.i] = {x: Math.round(pos.left), y: Math.round(pos.top), collapsed: lay.collapsed, tier: pos.tier, lines: lay.collapsed ? 0 : ((so.plateSizes[pl.i] || {}).lines || 1),
                            pinned: pos.pin === -1 ? 'left' : (pos.pin === 1 ? 'right' : null)};
                    });
                    this.updateObjectiveMarker();
                    this.updateFade();
                    const aim = this.aimPoint();
                    if (refs.crosshair) refs.crosshair.style.transform = 'translate3d(' + Math.round(aim.x) + 'px,' + Math.round(aim.y) + 'px,0) translate(-50%,-50%)';
                    if (refs.hitmarker) { const h = so.hitAt || aim; refs.hitmarker.style.transform = 'translate3d(' + Math.round(h.x) + 'px,' + Math.round(h.y) + 'px,0) translate(-50%,-50%)'; }
                    if (refs.lockRing && so.lock && round && round.enemies[so.lock.index] && round.enemies[so.lock.index].info) {
                        const e = round.enemies[so.lock.index];
                        const p = this.project(this.torsoWorld(e, e.info.pose));
                        refs.lockRing.style.transform = 'translate3d(' + Math.round(p.x) + 'px,' + Math.round(p.y) + 'px,0) translate(-50%,-50%)';
                    }
                    const over = this.phase === 'engaging' && this.resolveShot(aim, true).direct != null;
                    if (over !== this.overEnemy) this.overEnemy = over;
                },
                // The objective (§3 guidance 1): the target's anchor 1.8 m up while
                // roaming; pinned to the safe rectangle's edge (with an arrow) when
                // off-screen or behind. Plain data, no layout reads.
                objectiveInfo: function () {
                    const so = this._so;
                    if (this.logicalPhase() !== 'roaming') return null;
                    const zone = C.zones[this.zoneIndex], f = strikeOpsPlaceFrame(zone), p = so.player;
                    const dx = f.anchor.x - p.x, dz = f.anchor.z - p.z;
                    const out = {placeId: zone.id, x: f.anchor.x, z: f.anchor.z, distanceM: Math.hypot(dx, dz), onScreen: false, screen: null, edge: null};
                    if (!so.camera || this.renderMode !== 'gl') return out;
                    const pr = this.project(mapToWorld(f.anchor.x, f.anchor.z, 1.8));
                    const safe = so.safe, bearing = wrapAngle(Math.atan2(dx, dz) - p.yaw);
                    let x = pr.x, y = pr.y, edge = null;
                    if (pr.behind || x < safe.left || x > safe.right) {
                        edge = bearing < 0 ? 'left' : 'right';
                        x = edge === 'left' ? safe.left : safe.right;
                        y = clamp(pr.behind ? (safe.top + safe.bottom) / 2 : y, safe.top, safe.bottom);
                    } else if (y < safe.top) { edge = 'top'; y = safe.top; } else if (y > safe.bottom) { edge = 'bottom'; y = safe.bottom; }
                    out.onScreen = !edge && pr.onScreen;
                    out.screen = {x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10};
                    out.edge = edge;
                    return out;
                },
                updateObjectiveMarker: function () {
                    const so = this._so, el = this.$refs.objective;
                    if (!el) return;
                    const ob = this.objectiveInfo();
                    const show = !!(ob && ob.screen);
                    el.classList.toggle('so-objective-off', !show);
                    if (!show) return;
                    ['left', 'right', 'top', 'bottom'].forEach(k => el.classList.toggle('so-edge-' + k, ob.edge === k));
                    const off = {left: 'translate(0,-50%)', right: 'translate(-100%,-50%)', top: 'translate(-50%,0)', bottom: 'translate(-50%,-100%)'}[ob.edge] || 'translate(-50%,-100%)';
                    el.style.transform = 'translate3d(' + Math.round(ob.screen.x) + 'px,' + Math.round(ob.screen.y) + 'px,0) ' + off;
                    if (this.$refs.objectiveDir) {
                        const b = Math.round(wrapAngle(Math.atan2(ob.x - so.player.x, ob.z - so.player.z) - so.player.yaw) * 180 / Math.PI);
                        if (b !== so.objectiveBearing) { so.objectiveBearing = b; this.$refs.objectiveDir.style.transform = 'rotate(' + b + 'deg)'; }
                    }
                    const d = Math.round(ob.distanceM);
                    if (d !== so.objectiveDist && this.$refs.objectiveDist) { so.objectiveDist = d; this.$refs.objectiveDist.textContent = d + ' מ׳'; }
                },
                // The lap-wrap fade (§6): read from the advancing timer — 300 ms to
                // the haze colour before the midpoint, 300 ms back after it.
                updateFade: function () {
                    const el = this.$refs.fade;
                    if (!el) return;
                    let op = '';
                    if (this.logicalPhase() === 'advancing') {
                        const t = this.findTimer('advancing');
                        const el2 = t ? (t.ms - this.timerRemaining(t)) : C.timing.advanceMs;
                        const a = Math.abs(el2 - C.timing.advanceMs / 2);
                        op = String(a <= 0 ? 1 : (a < 300 ? 1 - a / 300 : 0));
                    }
                    if (el.style.opacity !== op) el.style.opacity = op;
                },
                aimPoint: function () {
                    const so = this._so;
                    if (this.aimMode === 'cursor' && so.cursor) return so.cursor;
                    return {x: so.view.w / 2, y: so.view.h / 2 - (so.horizonDy || 0)};
                },
                // Root text scale, cached: read (a computed-style lookup) only by
                // measure(), which runs on resize, the root/counter ResizeObserver and
                // an inline root font-size change; frames use the cached value.
                textScale: function () {
                    const so = this._so;
                    if (so && typeof so.textScaleCache === 'number') return so.textScaleCache;
                    return this.readTextScale();
                },
                readTextScale: function () {
                    const doc = global.document, so = this._so;
                    let v = 1;
                    if (doc && doc.documentElement && global.getComputedStyle) v = (parseFloat(global.getComputedStyle(doc.documentElement).fontSize) || 16) / 16;
                    if (so) so.textScaleCache = v;
                    return v;
                },
                scheduleMeasure: function () {
                    const so = this._so;
                    if (so.measureTimer) this.clearOwnTimeout(so.measureTimer);
                    so.measureTimer = this.ownTimeout(() => { so.measureTimer = null; this.measure(); }, 100);
                },
                afterContentChange: function () {
                    this.$nextTick(() => {
                        if (!this.alive()) return;
                        this.readTextScale();
                        this.measurePlates();
                        this.measureAnswers();
                        this.ownTimeout(() => { this.measure(); }, 0);
                    });
                },
                rectOf: function (el) {
                    if (!el || !el.getBoundingClientRect) return null;
                    const r = el.getBoundingClientRect();
                    if (!r.width || !r.height) return null;
                    const s = global.getComputedStyle ? global.getComputedStyle(el) : null;
                    if (s && (s.visibility === 'hidden' || s.display === 'none')) return null;
                    const v = this._so.view;
                    return {left: r.left - (v.left || 0), top: r.top - (v.top || 0), right: r.right - (v.left || 0), bottom: r.bottom - (v.top || 0), width: r.width, height: r.height};
                },
                measure: function () {
                    const so = this._so, root = this.$refs.root;
                    if (!root || so.destroyed) return;
                    this.readTextScale();
                    const rect = root.getBoundingClientRect();
                    const w = Math.max(1, Math.round(rect.width || global.innerWidth || 1280)), h = Math.max(1, Math.round(rect.height || global.innerHeight || 720));
                    so.view = {w, h, left: rect.left || 0, top: rect.top || 0};
                    this.portrait = h > w;
                    this.lowHeight = h < 500;
                    if (so.renderer) so.renderer.setSize(w, h, false);
                    if (so.canvas) { so.canvas.style.width = '100%'; so.canvas.style.height = '100%'; }
                    const r = this.$refs, gap = 6;
                    let top = 8, bottom = h - 8;
                    ['banner', 'counter', 'minimap', 'sys'].forEach(k => { const q = this.rectOf(r[k]); if (q) top = Math.max(top, q.bottom + gap); });
                    const st = r.root.querySelector('.so-status');
                    if (st) { const q = this.rectOf(st); if (q) top = Math.max(top, q.bottom + gap); }
                    ['answers', 'goRow', 'center'].forEach(k => { const q = this.rectOf(r[k]); if (q) bottom = Math.min(bottom, q.top - gap); });
                    ['stick', 'cluster'].forEach(k => { const q = this.rectOf(r[k]); if (q) bottom = Math.min(bottom, q.top - gap); });
                    if (bottom - top < 60) bottom = top + 60;
                    so.safe = {left: C.nameplate.edgeMarginPx, top, right: w - C.nameplate.edgeMarginPx, bottom};
                    // the horizon band (§6.6): when the scene band no longer holds the
                    // canvas centre (e.g. the stacked answer list in a short portrait),
                    // the projection's centre moves to the band's centre (view offset);
                    // the crosshair and every ray follow it. Otherwise no offset.
                    const bandH = bottom - top, mid = h / 2;
                    so.horizonDy = mid < top + bandH * 0.3 || mid > bottom - bandH * 0.3 ? Math.round(mid - (top + bottom) / 2) : 0;
                    this.measurePlates();
                    this.measureAnswers();
                    this.sizeMinimap();
                    this.updateCamera(0);
                },
                measurePlates: function () {
                    const so = this._so;
                    (this.$refs.plateEls || []).forEach(el => {
                        const i = Number(el.getAttribute('data-index'));
                        const collapsed = el.classList.contains('so-collapsed');
                        if (collapsed) el.classList.remove('so-collapsed');
                        const prev = el.style.transform;
                        const w = el.offsetWidth || 120, h = el.offsetHeight || 34;
                        const text = el.querySelector('.so-plate-text');
                        let lines = 1;
                        if (text && global.getComputedStyle) {
                            const lh = parseFloat(global.getComputedStyle(text).lineHeight) || 18;
                            lines = Math.max(1, Math.round(text.offsetHeight / lh));
                        }
                        if (collapsed) el.classList.add('so-collapsed');
                        el.style.transform = prev;
                        so.plateSizes[i] = {w, h: lines > C.nameplate.maxLines ? 9999 : h, lines};
                    });
                },
                // Row of chips while every chip's text fits 3 lines with no word
                // wider than its slot (words never break mid-word); otherwise
                // the stacked full-width list (also for enlarged text), or the
                // two-column grid (short landscape; narrow portrait, §6).
                measureAnswers: function () {
                    const box = this.$refs.answers;
                    if (!box || !global.getComputedStyle) return;
                    const chips = this.$refs.chips || [];
                    if (!chips.length) return;
                    // the CSS sizes (max(1rem, 14px) row, max(.875rem, 14px) grid),
                    // not the current chips', so a layout switch cannot flip back
                    const rem = this.textScale() * 16, n = chips.length;
                    const rowFs = Math.max(rem, 14), gridFs = Math.max(rem * 0.875, 14), chrome = rowFs * 2.6 + 22;
                    const probe = this._so.probe || (this._so.probe = global.document.createElement('div'));
                    probe.className = 'so-probe';
                    // every chip within maxLines at this text width, no word overflowing it
                    const fits = (width, fs, lhEm, maxLines) => {
                        probe.style.width = Math.max(20, width) + 'px';
                        probe.style.fontSize = fs + 'px';
                        probe.style.lineHeight = String(lhEm);
                        return chips.every(chip => {
                            const t = chip.querySelector('.so-answer-text');
                            probe.innerHTML = t ? t.innerHTML : '';
                            return probe.offsetHeight <= fs * lhEm * maxLines + 2 && probe.scrollWidth <= probe.clientWidth + 1;
                        });
                    };
                    let stacked = this.textScale() >= 1.5, gridFits = false;
                    const narrow = this.portrait && this._so.view.w <= 400;
                    if (!stacked) {
                        box.appendChild(probe);
                        stacked = !fits((box.clientWidth - (n - 1) * 8) / n - chrome, rowFs, 1.25, 3);
                        if (this.portrait && n >= 3 && (stacked || narrow)) gridFits = fits((box.clientWidth - 6) / 2 - chrome, gridFs, 1.2, 3);
                        box.removeChild(probe);
                    }
                    // a short landscape has no height for a four-line list, and a
                    // narrow portrait row breaks words: two columns (chips 1 2 / 3 4)
                    const layout = strikeOpsAnswersLayout(stacked, {n, portrait: this.portrait, lowHeight: this.lowHeight, textScale: this.textScale(), narrow, gridFits});
                    if (layout !== this.answersLayout) this.answersLayout = layout;
                    this.$nextTick(() => { if (this.alive()) this.updateScrollCues(); });
                },
                // "more below" cues for the scrollable answer list and question
                updateScrollCues: function () {
                    // ≥ 10 px of hidden content (a 44 px word button's few px of overhang is not "more")
                    const more = el => !!el && el.scrollHeight - el.clientHeight >= 10 && el.scrollTop + el.clientHeight < el.scrollHeight - 8;
                    // the question: only text or images hidden below its box count
                    // (a lone 44 px word button makes a tall but empty line box)
                    const textBelow = el => {
                        const doc = global.document;
                        if (!more(el) || !doc || !doc.createTreeWalker || !doc.createRange) return false;
                        const limit = el.getBoundingClientRect().top + el.clientHeight - 4;
                        const walker = doc.createTreeWalker(el, 1 | 4);
                        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
                            if (n.nodeType === 1 && n.tagName !== 'IMG') continue;
                            if (n.nodeType === 3 && !n.textContent.trim()) continue;
                            let r;
                            if (n.nodeType === 1) r = n.getBoundingClientRect();
                            else { const range = doc.createRange(); range.selectNodeContents(n); const rs = range.getClientRects(); r = rs.length ? rs[rs.length - 1] : null; }
                            if (r && r.height && r.bottom > limit) return true;
                        }
                        return false;
                    };
                    const root = this.$refs.root;
                    const q = root && root.querySelector ? root.querySelector('.so-question') : null;
                    const a = more(this.$refs.answers), b = textBelow(q);
                    if (a !== this.answersMore) this.answersMore = a;
                    if (b !== this.questionMore) this.questionMore = b;
                },

                // ---------------- minimap (§6.6) ----------------
                sizeMinimap: function () {
                    const so = this._so, cv = this.$refs.minimapCanvas;
                    if (!cv) return;
                    const box = this.$refs.minimap;
                    const size = box ? Math.round(box.clientWidth) : 0;
                    if (!size) { so.minimapCtx = null; return; }
                    if (cv.width !== size) { cv.width = size; cv.height = size; }
                    so.minimapCtx = cv.getContext ? cv.getContext('2d') : null;
                },
                // The compound layer (§6.6): drawn once from the map config at
                // layerPxPerM, north up (and again only on a theme change).
                minimapLayer: function () {
                    const so = this._so, doc = global.document;
                    if (so.minimapLayer) return so.minimapLayer;
                    if (!doc) return null;
                    const k = C.minimap.layerPxPerM, B = C.map.bounds;
                    const c = doc.createElement('canvas');
                    c.width = Math.round((B.maxX - B.minX) * k); c.height = Math.round((B.maxZ - B.minZ) * k);
                    const g = c.getContext && c.getContext('2d');
                    if (!g) return null;
                    const s = this.soTheme.scene;
                    const X = x => (x - B.minX) * k, Y = z => (B.maxZ - z) * k;
                    const rect = (r, col) => { g.fillStyle = col; g.fillRect(X(r.minX), Y(r.maxZ), (r.maxX - r.minX) * k, (r.maxZ - r.minZ) * k); };
                    g.fillStyle = mix(s.mapGround, '#000000', 0.45);
                    g.fillRect(0, 0, c.width, c.height);
                    C.zones.forEach(z => rect(z.region, mix(s.mapGround, '#ffffff', 0.12)));
                    C.map.paths.forEach(p => {
                        g.fillStyle = s.mapPath;
                        if (p.round) { g.beginPath(); g.arc(X(p.x), Y(p.z), p.w / 2 * k, 0, Math.PI * 2); g.fill(); }
                        else rect({minX: p.x - p.w / 2, maxX: p.x + p.w / 2, minZ: p.z - p.d / 2, maxZ: p.z + p.d / 2}, s.mapPath);
                    });
                    // the dressing's container rows (cosmetic, drawn under the walls)
                    C.dressing.containers.forEach(cn => {
                        const hw = (cn.alongX ? cn.len : C.dressing.containerD) / 2, hd = (cn.alongX ? C.dressing.containerD : cn.len) / 2;
                        rect({minX: cn.x - hw, maxX: cn.x + hw, minZ: cn.z - hd, maxZ: cn.z + hd}, 'rgba(170,110,80,0.95)');
                    });
                    C.map.structures.forEach(st => {
                        if (st.shape === 'circle') {
                            g.beginPath(); g.arc(X(st.x), Y(st.z), st.r * k, 0, Math.PI * 2);
                            if (st.kind === 'waterTower') { g.fillStyle = 'rgba(160,190,220,0.95)'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#ffffff'; g.stroke(); }
                            else { g.fillStyle = st.kind === 'tree' ? 'rgba(40,90,40,0.95)' : 'rgba(80,90,100,0.9)'; g.fill(); }
                            return;
                        }
                        const col = {deck: mix(s.mapPath, '#ffffff', 0.2), shed: s.mapStructure, container: 'rgba(170,110,80,0.95)', hedge: 'rgba(40,90,40,0.95)'}[st.kind] || 'rgba(225,225,225,0.85)';
                        rect({minX: st.x - st.w / 2, maxX: st.x + st.w / 2, minZ: st.z - st.d / 2, maxZ: st.z + st.d / 2}, col);
                    });
                    C.map.walls.forEach(w => { if (w.kind !== 'containerRow') rect(w, w.kind === 'hedge' ? 'rgba(30,70,30,1)' : s.mapWall); });
                    C.zones.forEach(z => strikeOpsPlaceFrame(z).cover.forEach(cb => rect(cb, 'rgba(255,255,255,0.95)')));
                    so.minimapLayer = {canvas: c, k};
                    return so.minimapLayer;
                },
                // Draws the dynamic layer in the current transform: map (x, z) is
                // drawn at (x, −z); 1 unit = 1 m.
                drawMapDynamic: function (g, unit, opts) {
                    const so = this._so, s = this.soTheme.scene, o = opts || {};
                    const k = so.mapZoneIndex;
                    // cleared places: a check on their region
                    C.zones.forEach((z, i) => {
                        if (i >= k) return;
                        const cx = (z.region.minX + z.region.maxX) / 2, cz = (z.region.minZ + z.region.maxZ) / 2;
                        g.strokeStyle = 'rgba(52,199,89,0.95)'; g.lineWidth = 3 * unit;
                        g.beginPath(); g.moveTo(cx - 2, -cz); g.lineTo(cx - 0.5, -cz + 1.6); g.lineTo(cx + 2.4, -cz - 2); g.stroke();
                    });
                    // gates: red bar closed, green gap open
                    C.map.gates.forEach(gate => {
                        const r = strikeOpsGateRect(gate);
                        const open = !gate.decorative && placeIndexById(C, gate.to) <= k;
                        g.fillStyle = open ? 'rgba(52,199,89,0.95)' : 'rgba(255,59,48,0.95)';
                        if (open) {
                            const e1 = gate.axis === 'x' ? {minX: r.minX, maxX: r.minX + 0.35, minZ: r.minZ, maxZ: r.maxZ} : {minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.minZ + 0.35};
                            const e2 = gate.axis === 'x' ? {minX: r.maxX - 0.35, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ} : {minX: r.minX, maxX: r.maxX, minZ: r.maxZ - 0.35, maxZ: r.maxZ};
                            [e1, e2].forEach(q => g.fillRect(q.minX, -q.maxZ, q.maxX - q.minX, q.maxZ - q.minZ));
                        } else g.fillRect(r.minX, -r.maxZ, r.maxX - r.minX, r.maxZ - r.minZ);
                    });
                    // the current/target fight box
                    const lp = this.logicalPhase();
                    if (ENCOUNTER_PHASES.indexOf(lp) !== -1 || lp === 'roaming') {
                        const fb = strikeOpsPlaceFrame(C.zones[this.zoneIndex]).fightBox;
                        g.strokeStyle = 'rgba(255,214,90,0.95)'; g.lineWidth = 1.5 * unit;
                        g.strokeRect(fb.minX, -fb.maxZ, fb.maxX - fb.minX, fb.maxZ - fb.minZ);
                    }
                    // the remaining route (dotted) and the objective star
                    const route = this.guidanceRoute();
                    if (route.length > 1) {
                        g.save();
                        g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.2 * unit;
                        g.setLineDash([3 * unit, 3 * unit]);
                        g.beginPath();
                        route.forEach((p, i) => { if (i) g.lineTo(p.x, -p.z); else g.moveTo(p.x, -p.z); });
                        g.stroke();
                        g.restore();
                    }
                    const ob = lp === 'roaming' ? strikeOpsPlaceFrame(C.zones[this.zoneIndex]).anchor : null;
                    if (ob) this.drawStar(g, ob.x, -ob.z, 5 * unit, '#ffd60a');
                    // enemies: badge tints, filled when hittable, hollow when hidden
                    const round = so.round;
                    if (round && !o.noEnemies) round.enemies.forEach(e => {
                        if (!e.info || !e.vis || (e.info.alpha <= 0.001 && e.info.state !== 'hidden')) return;
                        const tint = e.kind === 'copy' ? s.hologramTint : s.squadTints[e.index % 4];
                        g.beginPath(); g.arc(e.info.pose.x, -e.info.pose.z, 3.2 * unit, 0, Math.PI * 2);
                        if (e.info.hittable) { g.fillStyle = tint; g.fill(); g.lineWidth = 1.2 * unit; g.strokeStyle = '#111'; g.stroke(); }
                        else { g.lineWidth = 1.5 * unit; g.strokeStyle = alpha(tint, 0.6); g.stroke(); }
                    });
                    return ob;
                },
                drawStar: function (g, x, y, r, col) {
                    g.beginPath();
                    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
                    g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = r * 0.18; g.strokeStyle = '#1b2430'; g.stroke();
                },
                drawPlayerArrow: function (g, x, y, size, rot) {
                    g.save(); g.translate(x, y); g.rotate(rot || 0);
                    g.fillStyle = '#ffffff'; g.strokeStyle = '#1b2430'; g.lineWidth = size * 0.22;
                    g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.72, size * 0.72); g.lineTo(0, size * 0.3); g.lineTo(-size * 0.72, size * 0.72);
                    g.closePath(); g.fill(); g.stroke(); g.restore();
                },
                // The minimap (§6.6): the compound layer rotated around the player
                // (heading up), rangeM radius, plus the dynamic layer; ≤ 10 Hz.
                drawMinimap: function () {
                    const so = this._so, g = so.minimapCtx;
                    if (!g || this.renderMode !== 'gl') return;
                    const S = g.canvas.width, L = this.minimapLayer();
                    g.clearRect(0, 0, S, S);
                    if (!L) return;
                    const p = so.player, m = S / (2 * C.minimap.rangeM), B = C.map.bounds;
                    g.save();
                    g.translate(S / 2, S / 2);
                    g.rotate(-p.yaw);
                    g.scale(m, m);
                    g.translate(-p.x, p.z);
                    g.drawImage(L.canvas, B.minX, -B.maxZ, L.canvas.width / L.k, L.canvas.height / L.k);
                    const ob = this.drawMapDynamic(g, 1 / m);
                    g.restore();
                    // the objective beyond the range: an arrow on the rim
                    if (ob) {
                        const dx = ob.x - p.x, dz = ob.z - p.z, d = Math.hypot(dx, dz);
                        if (d * m > S / 2 - 6) {
                            const b = Math.atan2(dx, dz) - p.yaw, r = S / 2 - 8;
                            const x = S / 2 + Math.sin(b) * r, y = S / 2 - Math.cos(b) * r;
                            g.save(); g.translate(x, y); g.rotate(b);
                            g.fillStyle = '#ffd60a'; g.strokeStyle = '#1b2430'; g.lineWidth = 1.5;
                            g.beginPath(); g.moveTo(0, -7); g.lineTo(6, 5); g.lineTo(-6, 5); g.closePath(); g.fill(); g.stroke();
                            g.restore();
                        }
                    }
                    this.drawPlayerArrow(g, S / 2, S / 2, Math.max(6, S / 18), 0);
                },
                // The full-map overlay (§6.6): north up at overlayPxPerM, Hebrew
                // place names, the route and the "אתם כאן" arrow.
                drawMapView: function () {
                    const so = this._so, cv = this.$refs.mapCanvas;
                    if (!cv || !cv.getContext) return;
                    const L = this.minimapLayer();
                    if (!L) return;
                    const k = C.minimap.overlayPxPerM, B = C.map.bounds;
                    const W = Math.round((B.maxX - B.minX) * k), Hh = Math.round((B.maxZ - B.minZ) * k);
                    if (cv.width !== W) { cv.width = W; cv.height = Hh; }
                    const g = cv.getContext('2d');
                    if (!g) return;
                    so.mapViewDraws = (so.mapViewDraws || 0) + 1;
                    g.clearRect(0, 0, W, Hh);
                    g.save();
                    g.scale(k, k);
                    g.translate(-B.minX, B.maxZ);
                    g.drawImage(L.canvas, B.minX, -B.maxZ, L.canvas.width / L.k, L.canvas.height / L.k);
                    this.drawMapDynamic(g, 1 / k * 1.6, {noEnemies: false});
                    g.restore();
                    const toPx = (x, z) => ({x: (x - B.minX) * k, y: (B.maxZ - z) * k});
                    g.font = 'bold ' + Math.round(k * 1.6) + 'px system-ui, sans-serif';
                    g.textAlign = 'center';
                    g.direction = 'rtl';
                    C.zones.forEach(z => {
                        const c = toPx((z.region.minX + z.region.maxX) / 2, (z.region.minZ + z.region.maxZ) / 2 + 3);
                        g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(z.name, c.x, c.y);
                        g.fillStyle = '#ffffff'; g.fillText(z.name, c.x, c.y);
                    });
                    const pp = toPx(so.player.x, so.player.z);
                    this.drawPlayerArrow(g, pp.x, pp.y, k * 1.3, so.player.yaw);
                    g.font = 'bold ' + Math.round(k * 1.3) + 'px system-ui, sans-serif';
                    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText('אתם כאן', pp.x, pp.y - k * 2.2);
                    g.fillStyle = '#ffd60a'; g.fillText('אתם כאן', pp.x, pp.y - k * 2.2);
                },

                // ---------------- weapon and shooting ----------------
                fire: function (opts) {
                    const so = this._so;
                    opts = opts || {};
                    const out = (fired, reason) => ({fired, hitIndex: null, blocked: false, accepted: false, reason});
                    if (this.phase !== 'engaging') return out(false, 'phase');
                    if (this.attemptLocked) return out(false, 'locked');
                    const t = nowMs();
                    if (t - so.lastShot < C.weapon.cooldownMs) return out(false, 'cooldown');
                    if (this.reloading) return out(false, 'reload');
                    if (this.ammo <= 0) { this.reload(); return out(false, 'reload'); }
                    const token = opts.token != null ? opts.token : this.questionToken;
                    so.lastShot = t;
                    this.ammo -= 1;
                    const kickRad = C.weapon.recoil.pitchKickDeg * Math.PI / 180;
                    if (!this.reducedMotion) so.kickVel += kickRad * C.weapon.recoil.springK / 18;
                    so.vmKickVel += (this.reducedMotion ? 0.3 : 1) * 1.6;
                    so.muzzleUntil = t + 50;
                    if (so.muzzle && so.muzzle.material) so.muzzle.material.rotation = Math.random() * Math.PI * 2;
                    this.synth('shot');
                    const aim = opts.aimPx || this.aimPoint();
                    const res = this.renderMode === 'gl' && so.camera ? this.resolveShot(aim) : {hitIndex: null, blocked: false};
                    so.hitAt = {x: aim.x, y: aim.y};
                    let accepted = false;
                    if (res.hitIndex != null) accepted = this.answer(res.hitIndex, token);
                    else if (res.coverPoint) this.spawnParticles('dust', res.coverPoint, 3);
                    if (this.ammo === 0 && C.weapon.autoReload) this.reload();
                    if (!opts.viaLock) this.cancelLock();
                    return {fired: true, hitIndex: res.hitIndex, blocked: res.blocked, accepted};
                },
                // At most one enemy per shot: the nearest hittable hitbox in front of
                // any cover, else the magnet pick (LOS-clear, same radius for all).
                resolveShot: function (aim, directOnly) {
                    const so = this._so, round = so.round;
                    if (!round || !so.camera) return {hitIndex: null, blocked: false, direct: null};
                    const ray = this.rayFor(aim);
                    const boxes = strikeOpsPlaceFrame(C.zones[round.zoneIndex]).cover;
                    let coverT = Infinity;
                    boxes.forEach(b => { coverT = Math.min(coverT, rayBox(ray.o, ray.d, b)); });
                    let bestT = Infinity, best = null;
                    round.enemies.forEach(e => {
                        const info = e.info || this.enemyInfo(e);
                        if (!info.hittable) return;
                        const t = rayBox(ray.o, ray.d, this.hitboxOf(e, info.pose));
                        if (t < bestT) { bestT = t; best = e.index; }
                    });
                    if (best != null && bestT < coverT) return {hitIndex: best, blocked: false, direct: best};
                    if (directOnly) return {hitIndex: null, blocked: false, direct: null};
                    const eye = ray.o;
                    const cands = round.enemies.map(e => {
                        const info = e.info || this.enemyInfo(e);
                        const torso = {x: info.pose.x, y: C.aim.hitbox.centerY * (e.kind === 'copy' ? C.boss.scale : 1), z: info.pose.z}; // map frame
                        const p = this.project(this.torsoWorld(e, info.pose));
                        return {index: e.index, x: p.x, y: p.y, hittable: info.hittable && p.onScreen, clear: !strikeOpsSegmentBlocked(eye, torso, boxes)};
                    });
                    const radius = C.aim.magnetRadiusPx[this.aimMode === 'locked' ? 'mouse' : this.aimMode] || 32;
                    const magnet = strikeOpsPickMagnetTarget(aim, cands, radius);
                    if (magnet != null) return {hitIndex: magnet, blocked: false, direct: null};
                    const coverPoint = coverT < Infinity ? mapToWorld(ray.o.x + ray.d.x * coverT, ray.o.z + ray.d.z * coverT, ray.o.y + ray.d.y * coverT) : null;
                    return {hitIndex: null, blocked: coverT < Infinity, direct: null, coverPoint};
                },
                reload: function () {
                    const so = this._so;
                    if (this.reloading || this.ammo >= C.weapon.magazine || !this.alive()) return;
                    this.reloading = true;
                    so.reloadTimer = this.ownTimeout(() => {
                        so.reloadTimer = null;
                        const need = C.weapon.magazine - this.ammo;
                        this.reserve = Math.max(0, this.reserve - need);
                        this.ammo = C.weapon.magazine;
                        this.reloading = false;
                    }, C.weapon.reloadMs);
                },
                toggleAds: function () { if (PLAY_PHASES.indexOf(this.phase) !== -1 && this.renderMode === 'gl') this.ads = !this.ads; },
                lockOn: function (i) {
                    const so = this._so;
                    if (so.navigated || this.phase !== 'engaging' || this.attemptLocked || typeof i !== 'number' || i < 0 || i >= this.options.length) return false;
                    const token = this.questionToken;
                    if (this.renderMode !== 'gl' || so.domAnswerOnly || !so.round || !so.round.enemies[i] || !so.camera) return this.answer(i, token);
                    this.cancelLock();
                    if (so.assist) this.finishAssist();
                    so.lock = {index: i, token, startedAt: nowMs(), from: {yaw: so.player.yaw, pitch: so.player.pitch}, settle: null};
                    this.lockIndex = i;
                    this.lockWaiting = !this.enemyIsHittable(i);
                    return true;
                },
                cancelLock: function () {
                    const so = this._so;
                    if (so.lock && so.lock.settle) this.clearOwnTimeout(so.lock.settle);
                    so.lock = null;
                    if (this.lockIndex !== -1) this.lockIndex = -1;
                    if (this.lockWaiting) this.lockWaiting = false;
                },
                enemyIsHittable: function (i) {
                    const round = this._so.round, e = round && round.enemies[i];
                    return !!e && this.enemyInfo(e).hittable;
                },
                // Map-frame yaw/pitch from the current eye to a THREE world point.
                aimAngles: function (target) {
                    const so = this._so;
                    const dx = -target.x - so.player.x, dz = target.z - so.player.z, dy = target.y - C.movement.eye;
                    return {yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz))};
                },
                // No yaw clamp (rev 3): pitch only; yaw kept within ±π.
                clampLook: function () {
                    const p = this._so.player;
                    p.yaw = wrapAngle(p.yaw);
                    p.pitch = clamp(p.pitch, C.movement.pitchMin, C.movement.pitchMax);
                },
                updateLock: function () {
                    const so = this._so, lock = so.lock;
                    if (!lock) return;
                    if (this.phase !== 'engaging' || lock.token !== this.questionToken || !so.round) { if (this.phase !== 'paused') this.cancelLock(); return; }
                    const e = so.round.enemies[lock.index];
                    if (!e) { this.cancelLock(); return; }
                    const info = this.enemyInfo(e);
                    const want = this.aimAngles(this.torsoWorld(e, info.pose));
                    const k = this.reducedMotion ? 1 : ease((nowMs() - lock.startedAt) / 350);
                    // the shortest turn, even to an enemy behind the player (rev 3)
                    so.player.yaw = lerpAngle(lock.from.yaw, want.yaw, k);
                    so.player.pitch = lock.from.pitch + (want.pitch - lock.from.pitch) * k;
                    this.clampLook();
                    const hittable = info.hittable;
                    if (this.lockWaiting === hittable) this.lockWaiting = !hittable;
                    // fire only once the turn has landed (rev 3: turns may be up to 180°)
                    if (hittable && !lock.settle && k >= 1) {
                        lock.settle = this.ownTimeout(() => {
                            if (so.lock !== lock) return;
                            lock.settle = null;
                            if (this.phase !== 'engaging' || lock.token !== this.questionToken) { this.cancelLock(); return; }
                            const cur = so.round && so.round.enemies[lock.index];
                            if (!cur) { this.cancelLock(); return; }
                            const ci = this.enemyInfo(cur);
                            if (!ci.hittable) return;
                            this.updateCamera(0);
                            const res = this.fire({aimPx: this.project(this.torsoWorld(cur, ci.pose)), viaLock: true, token: lock.token});
                            if (!res.fired && (res.reason === 'cooldown' || res.reason === 'reload')) return;
                            if (so.lock === lock) this.cancelLock();
                        }, 150);
                    }
                },
                shootEnemy: function (id) {
                    const so = this._so, round = so.round;
                    const index = typeof id === 'number' ? id : (round ? round.enemies.findIndex(e => (round.id + '-e' + e.index) === id) : -1);
                    const e = round && round.enemies[index];
                    if (so.navigated) return {fired: false, hitIndex: null, blocked: false, accepted: false, reason: 'navigated'};
                    if (!e || this.renderMode !== 'gl' || !so.camera) return {fired: false, hitIndex: null, blocked: false, accepted: false, reason: 'invalid'};
                    if (so.assist) this.finishAssist();
                    this.updateCamera(0);
                    const info = this.enemyInfo(e);
                    e.info = info;
                    const torso = this.torsoWorld(e, info.pose);
                    let aimPx;
                    if (this.aimMode === 'cursor') {
                        aimPx = this.project(torso);
                        so.cursor = {x: aimPx.x, y: aimPx.y};
                    } else {
                        const a = this.aimAngles(torso);
                        so.player.yaw = a.yaw;
                        so.player.pitch = a.pitch;
                        this.clampLook();
                        this.updateCamera(0);
                        aimPx = {x: so.view.w / 2, y: so.view.h / 2 - (so.horizonDy || 0)};
                    }
                    if (round) round.enemies.forEach(x => { x.info = this.enemyInfo(x); });
                    const res = this.fire({aimPx});
                    if (!info.hittable && res.hitIndex == null) res.blocked = true;
                    return res;
                },
                probeShot: function (x, y) {
                    const so = this._so;
                    if (this.renderMode !== 'gl' || !so.camera || !so.round) return {hitIndex: null, blocked: false};
                    so.round.enemies.forEach(e => { e.info = this.enemyInfo(e); });
                    const r = this.resolveShot({x, y});
                    return {hitIndex: r.hitIndex, blocked: r.blocked};
                },

                // ---------------- input ----------------
                isControl: function (el) {
                    const root = this.$refs.root;
                    if (!el || !root || !root.contains(el) || el === root) return false;
                    const tag = (el.tagName || '').toLowerCase();
                    return tag === 'button' || tag === 'a' || tag === 'input' || (el.getAttribute && el.getAttribute('role') === 'button');
                },
                onKeyDown: function (e) {
                    const so = this._so;
                    if (so.destroyed) return;
                    const doc = global.document, active = doc && doc.activeElement;
                    if (active && (active.tagName || '').toLowerCase() === 'input') return;
                    const code = e.code;
                    if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') {
                        if (this.isControl(active)) return;
                        if (this.phase === 'briefing') { e.preventDefault(); this.start(null); return; }
                        if (this.phase === 'engaging') {
                            e.preventDefault();
                            if (!e.repeat) this.fire();
                        }
                        return;
                    }
                    // Tab hands the mouse back so keyboard users can reach the answer
                    // list; the game keeps running in cursor-aim mode (no pause).
                    if (code === 'Tab' && so.canvas && doc && doc.pointerLockElement === so.canvas) { so.unlockReason = 'tab'; doc.exitPointerLock(); return; }
                    if (code === 'Escape') { this.pause('escape'); return; }
                    const digit = /^(Digit|Numpad)([1-4])$/.exec(code || '');
                    if (digit) {
                        if (e.repeat) return;
                        e.preventDefault();
                        if (this.phase === 'engaging') this.lockOn(Number(digit[2]) - 1);
                        return;
                    }
                    if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(code || '')) {
                        if (/^Arrow/.test(code)) e.preventDefault();
                        so.keys.add(code);
                        if (so.lock) this.cancelLock();
                        if (so.autopilot && !so.assist && (this.phase === 'roaming' || ENCOUNTER_PHASES.indexOf(this.phase) !== -1)) this.cancelAutopilot();
                        return;
                    }
                    if (code === 'ShiftLeft' || code === 'ShiftRight') { so.sprintKey = true; return; }
                    if (e.repeat) return;
                    if (code === 'KeyG') { if (this.phase === 'roaming') { e.preventDefault(); this.onGo(); } return; }
                    if (code === 'KeyM') { this.toggleMap(); return; }
                    if (code === 'KeyR') this.reload();
                    else if (code === 'KeyE') this.toggleAds();
                    else if (code === 'KeyQ') this.replayQuestion();
                },
                onKeyUp: function (e) {
                    const so = this._so;
                    so.keys.delete(e.code);
                    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') so.sprintKey = false;
                },
                lookBy: function (dx, dy, sensitivity) {
                    const so = this._so;
                    if (this.phase === 'advancing' || so.assist) return;
                    if (so.autopilot && Math.hypot(dx, dy) > 0) this.cancelAutopilot();
                    const friction = this.overEnemy ? C.aim.lookFriction : 1;
                    const s = sensitivity * (this.ads ? 0.6 : 1) * friction;
                    so.player.yaw += dx * s;
                    so.player.pitch -= dy * s;
                    this.clampLook();
                    if (so.camera) this.updateCamera(0);
                },
                onMouseMove: function (e) {
                    const so = this._so;
                    if (so.destroyed || !so.canvas) return;
                    if (global.document.pointerLockElement === so.canvas) {
                        if (PLAY_PHASES.indexOf(this.phase) === -1) return;
                        if (so.lock && Math.hypot(e.movementX || 0, e.movementY || 0) > 8) this.cancelLock();
                        if (!so.lock) this.lookBy(e.movementX || 0, e.movementY || 0, 0.0022);
                    }
                },
                onHostMouseDown: function (e) {
                    const so = this._so;
                    if (e.button === 2 && PLAY_PHASES.indexOf(this.phase) !== -1) { this.ads = true; so.adsHeld = true; }
                },
                onMouseUp: function (e) {
                    const so = this._so;
                    if (e.button === 2 && so.adsHeld) { so.adsHeld = false; this.ads = false; }
                },
                localPoint: function (e) {
                    const v = this._so.view;
                    return {x: e.clientX - (v.left || 0), y: e.clientY - (v.top || 0)};
                },
                onHostPointerDown: function (e) {
                    const so = this._so;
                    so.deadPointers.delete(e.pointerId);
                    so.lastPointerType = e.pointerType;
                    const root = this.$refs.root, doc = global.document;
                    const hadFocus = doc && doc.activeElement === root;
                    if (!hadFocus) this.focusRoot();
                    if (e.pointerType === 'touch') {
                        this.isTouch = true;
                        if (this.aimMode === 'cursor' && PLAY_PHASES.indexOf(this.phase) !== -1) this.aimMode = 'touch';
                    }
                    if (e.pointerType === 'mouse' && e.button !== 0) return;
                    const p = this.localPoint(e);
                    if (e.pointerType === 'mouse' && this.aimMode === 'cursor') so.cursor = p;
                    if (this.aimMode === 'locked' && doc.pointerLockElement === so.canvas) {
                        if (this.phase === 'engaging') this.fire();
                        return;
                    }
                    if (so.look) return;
                    so.look = {id: e.pointerId, type: e.pointerType, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: 0, t: nowMs(), focusOnly: !hadFocus && e.pointerType === 'mouse'};
                    if (e.currentTarget && e.currentTarget.setPointerCapture) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
                },
                onHostPointerMove: function (e) {
                    const so = this._so;
                    if (so.deadPointers.has(e.pointerId)) return;
                    const p = this.localPoint(e);
                    if (e.pointerType === 'mouse' && this.aimMode === 'cursor' && (!so.look || so.look.moved < 8)) {
                        if (!so.cursor || Math.abs(so.cursor.x - p.x) + Math.abs(so.cursor.y - p.y) > 2) so.cursorArmed = true;
                        so.cursor = p;
                    }
                    const look = so.look;
                    if (!look || look.id !== e.pointerId) return;
                    const dx = p.x - look.x, dy = p.y - look.y;
                    look.x = p.x; look.y = p.y;
                    look.moved = Math.max(look.moved, Math.hypot(p.x - look.sx, p.y - look.sy));
                    if (look.moved > 8) {
                        if (so.lock) this.cancelLock();
                        if (PLAY_PHASES.indexOf(this.phase) !== -1 || this.phase === 'briefing') this.lookBy(dx, dy, e.pointerType === 'touch' ? 0.0055 : 0.004);
                    }
                },
                onHostPointerUp: function (e) {
                    const so = this._so, look = so.look;
                    if (so.deadPointers.has(e.pointerId)) { so.deadPointers.delete(e.pointerId); return; }
                    if (!look || look.id !== e.pointerId) return;
                    so.look = null;
                    if (e.type === 'pointercancel' || look.moved > 8 || look.focusOnly) return;
                    if (this.phase !== 'engaging') return;
                    const p = this.localPoint(e);
                    if (look.type === 'touch') this.fire({aimPx: p});
                    else this.fire({aimPx: this.aimMode === 'cursor' ? p : null});
                },
                // cursor-aim edge-pan (15% bands)
                edgePan: function (dtMs) {
                    const so = this._so;
                    // only while aiming or walking, and only for a cursor moved since the last transition
                    if (this.aimMode !== 'cursor' || !so.cursor || !so.cursorArmed || (this.phase !== 'engaging' && this.phase !== 'roaming') || so.lock) return;
                    const band = so.view.w * 0.15, x = so.cursor.x;
                    let dir = 0;
                    if (x < band) dir = -(band - x) / band; else if (x > so.view.w - band) dir = (x - (so.view.w - band)) / band;
                    if (dir && !so.assist) { so.player.yaw += dir * 1.2 * dtMs / 1000; this.clampLook(); if (so.autopilot) this.cancelAutopilot(); }
                },
                onFirePointerDown: function (e) {
                    const so = this._so;
                    so.deadPointers.delete(e.pointerId);
                    so.firePointerId = e.pointerId;
                    so.lastPointerType = e.pointerType;
                    so.firePointerAt = nowMs();
                    if (e.currentTarget && e.currentTarget.setPointerCapture) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
                    if (e.pointerType === 'touch' && this.aimMode === 'cursor') this.aimMode = 'touch';
                    this.fire();
                },
                onFireClick: function (e) {
                    // Keyboard activation only (detail 0); pointer presses already fired.
                    if (e && e.detail === 0 && nowMs() - (this._so.firePointerAt || -1e9) > 300) this.fire();
                },
                onChip: function (i, e) {
                    const so = this._so;
                    if (e && e.pointerType) so.lastPointerType = e.pointerType;
                    if (this.phase !== 'engaging') return;
                    const token = this.questionToken;
                    if (this.renderMode !== 'gl' || so.domAnswerOnly) this.answer(i, token);
                    else this.lockOn(i);
                },
                onStickDown: function (e) {
                    const so = this._so;
                    so.deadPointers.delete(e.pointerId);
                    so.stick.id = e.pointerId;
                    if (e.currentTarget && e.currentTarget.setPointerCapture) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
                    this.onStickMove(e);
                },
                onStickMove: function (e) {
                    const so = this._so, el = this.$refs.stick;
                    if (so.deadPointers.has(e.pointerId) || so.stick.id !== e.pointerId || !el) return;
                    const r = el.getBoundingClientRect(), rad = r.width / 2 || 50;
                    let x = (e.clientX - (r.left + rad)) / rad, y = (e.clientY - (r.top + rad)) / rad;
                    const l = Math.hypot(x, y);
                    if (l > 1) { x /= l; y /= l; }
                    so.stick.x = x; so.stick.y = y;
                    if (this.$refs.stickKnob) this.$refs.stickKnob.style.transform = 'translate(' + Math.round(x * rad * 0.55) + 'px,' + Math.round(y * rad * 0.55) + 'px)';
                },
                onStickUp: function (e) {
                    const so = this._so;
                    if (so.deadPointers.has(e.pointerId)) { so.deadPointers.delete(e.pointerId); return; }
                    if (so.stick.id !== e.pointerId) return;
                    // release now (not at the next frame) so a following tap is not retargeted
                    if (e.currentTarget && e.currentTarget.releasePointerCapture) { try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* not captured */ } }
                    so.stick = {x: 0, y: 0, id: null};
                    if (this.$refs.stickKnob) this.$refs.stickKnob.style.transform = '';
                },

                // ---------------- audio (WebAudio synthesis, no files) ----------------
                ensureAudio: function () {
                    const so = this._so;
                    if (so.audio) return so.audio;
                    const Ctx = global.AudioContext || global.webkitAudioContext;
                    if (!Ctx) return null;
                    try {
                        so.audio = new Ctx();
                        so.master = so.audio.createGain();
                        so.master.gain.value = 0.5;
                        so.master.connect(so.audio.destination);
                        const len = Math.floor(so.audio.sampleRate * 0.25);
                        so.noise = so.audio.createBuffer(1, len, so.audio.sampleRate);
                        const ch = so.noise.getChannelData(0);
                        for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
                    } catch (e) { so.audio = null; }
                    return so.audio;
                },
                synth: function (kind, delayS) {
                    const so = this._so, ac = so.audio;
                    if (!ac || ac.state === 'closed') return;
                    try {
                        const t = ac.currentTime + (delayS || 0), out = so.master;
                        const env = (node, peak, dur, at) => {
                            const g = ac.createGain(), t0 = t + (at || 0);
                            g.gain.setValueAtTime(peak, t0);
                            g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
                            node.connect(g);
                            g.connect(out);
                            return g;
                        };
                        const noise = (type, freq, peak, dur, freqTo) => {
                            const n = ac.createBufferSource();
                            n.buffer = so.noise;
                            n.loop = dur > 0.24;
                            const f = ac.createBiquadFilter();
                            f.type = type; f.frequency.setValueAtTime(freq, t);
                            if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
                            n.connect(f);
                            env(f, peak, dur);
                            n.start(t); n.stop(t + dur + 0.02);
                            return f;
                        };
                        const tone = (type, f0, f1, peak, dur, at) => {
                            const o = ac.createOscillator();
                            o.type = type;
                            o.frequency.setValueAtTime(f0, t + (at || 0));
                            if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + (at || 0) + dur);
                            env(o, peak, dur, at);
                            o.start(t + (at || 0)); o.stop(t + (at || 0) + dur + 0.01);
                        };
                        if (kind === 'shot') {
                            const j = 1 + (Math.random() * 0.08 - 0.04);
                            noise('bandpass', 1200 * j, 0.55, 0.06);
                            tone('sine', 90 * j, 40 * j, 0.6, 0.12);
                            tone('square', 3000 * j, 3000 * j, 0.08, 0.01);
                        } else if (kind === 'tick') tone('sine', 2200, 2200, 0.25, 0.025);
                        else if (kind === 'bonk') tone('triangle', 220, 180, 0.35, 0.15);
                        else if (kind === 'puff') noise('lowpass', 900, 0.06, 0.12);
                        else if (kind === 'tagout') { tone('sine', 520, 520, 0.2, 0.09); tone('sine', 780, 780, 0.2, 0.12, 0.09); }
                        else if (kind === 'shimmer') noise('highpass', 5200, 0.12, 0.35);
                        else if (kind === 'chime') { tone('sine', 660, 660, 0.18, 0.18); tone('sine', 990, 990, 0.16, 0.25, 0.12); }
                        // §5.1 gate voices and §6.5 footsteps (synth only, no files)
                        else if (kind === 'boomHigh') { noise('bandpass', 500, 0.16, 0.5, 1400); tone('sine', 220, 440, 0.16, 0.5); }
                        else if (kind === 'boomLow') { noise('bandpass', 380, 0.14, 0.5, 1000); tone('sine', 165, 330, 0.16, 0.5); tone('square', 2400, 2400, 0.05, 0.02, 0.48); }
                        else if (kind === 'swing') { noise('bandpass', 700, 0.18, 0.55, 260); tone('sawtooth', 130, 95, 0.05, 0.5); }
                        else if (kind === 'step') noise('lowpass', 260 + Math.random() * 80, 0.07, 0.07);
                        else if (kind === 'thud') tone('sine', 95, 60, 0.12, 0.1);
                        else if (kind === 'fanfare') { tone('triangle', 523, 523, 0.2, 0.16); tone('triangle', 659, 659, 0.2, 0.16, 0.16); tone('triangle', 784, 784, 0.22, 0.3, 0.32); }
                    } catch (e) { /* sound is optional */ }
                },

                // ---------------- debug / automated-test API (§12.1) ----------------
                getEnemies: function () {
                    const so = this._so, round = so.round;
                    if (!round) return [];
                    // sample the drawn state at the current time, not at the last frame
                    if (so.scene && this.renderMode === 'gl' && this.phase !== 'lost') this.updateEnemies(0);
                    const T = global.THREE;
                    return round.enemies.map(e => {
                        const info = this.enemyInfo(e);
                        const isCorrect = this.options[e.index] === (this.question && this.question.result);
                        let sx = 0, sy = 0, visible = false;
                        if (so.camera && T) {
                            const p = this.project(this.torsoWorld(e, info.pose));
                            sx = p.x; sy = p.y;
                            const inView = p.onScreen && p.x >= 0 && p.x <= so.view.w && p.y >= 0 && p.y <= so.view.h;
                            visible = inView && info.alpha > 0.001 && (e.kind === 'copy' ? info.state !== 'dissolved' : info.state !== 'hidden');
                        }
                        const vis = e.vis;
                        const clip = vis ? {role: vis.role, name: vis.action ? vis.action.getClip().name : (vis.procedural ? 'procedural' : null), time: vis.action ? +(vis.action.time / Math.max(1e-3, vis.action.getClip().duration)).toFixed(3) : 0}
                            : {role: null, name: null, time: 0};
                        const hex = c => '#' + c.getHexString();
                        // a linear-applied tint back in sRGB (rounded: getHexString truncates)
                        const srgbHex = c => { const x = c.clone().convertLinearToSRGB(); return toHex([x.r * 255, x.g * 255, x.b * 255]); };
                        const materials = vis ? vis.mats.map(rec => ({slot: rec.slot, id: rec.mat.uuid, tint: rec.linear ? srgbHex(rec.mat.color) : hex(rec.mat.color), linear: !!rec.linear, opacity: +rec.mat.opacity.toFixed(4), emissive: rec.mat.emissive ? hex(rec.mat.emissive) : null, transparent: !!rec.mat.transparent})) : [];
                        const plate = (so.plateLayout && so.plateLayout[e.index]) || {x: 0, y: 0, collapsed: false, tier: 0, lines: 0, pinned: null};
                        const dx = info.pose.x - so.player.x, dz = info.pose.z - so.player.z;
                        return {
                            id: round.id + '-e' + e.index, index: e.index, lane: e.laneIndex, answer: stripTags(this.options[e.index]),
                            isCorrect, isDecoy: e.kind === 'copy' ? !isCorrect : false, isReal: e.kind === 'copy' ? isCorrect : true,
                            kind: e.kind, state: info.state, hittable: !!info.hittable && this.phase !== 'loading' && this.phase !== 'briefing',
                            exposureMs: this.exposureOf(e), exposedCount: e.exposedCount,
                            screenX: Math.round(sx * 10) / 10, screenY: Math.round(sy * 10) / 10, visible,
                            pose: {x: +info.pose.x.toFixed(4), z: +info.pose.z.toFixed(4), yaw: +info.pose.yaw.toFixed(4), stance: info.pose.stance},
                            scale: e.kind === 'copy' ? C.boss.scale : 1, clip, materials,
                            plate: {x: plate.x, y: plate.y, collapsed: plate.collapsed, tier: plate.tier, lines: plate.lines, pinned: plate.pinned || null},
                            badge: {number: e.index + 1, shape: SHAPES[e.index % 4], tint: this.soTheme.scene.squadTints[e.index % 4]},
                            distanceM: +Math.hypot(dx, dz).toFixed(3),
                            bearingDeg: +(wrapAngle(Math.atan2(dx, dz) - so.player.yaw) * 180 / Math.PI).toFixed(2),
                        };
                    });
                },
                getTransition: function () { const t = this._so.transition; return t ? JSON.parse(JSON.stringify(t)) : null; },
                setRendering: function (on) { this._so.rendering = on !== false; },
                getRenderStats: function () {
                    const so = this._so, r = so.renderer, tpl = so.assets && so.assets.enemy;
                    let visibleCount = 0;
                    if (so.round) so.round.enemies.forEach(e => { if (e.vis && e.vis.root.visible) visibleCount += 1; });
                    return {
                        last: JSON.parse(JSON.stringify(so.stats.last)),
                        peak: {calls: so.stats.peak.calls, triangles: so.stats.peak.triangles},
                        geometries: r ? r.info.memory.geometries : 0,
                        textures: r ? r.info.memory.textures : 0,
                        quality: this.quality,
                        pixelRatio: r ? r.getPixelRatio() : 0,
                        mixersActive: so.mixersActive || 0,
                        enemiesVisible: visibleCount,
                        enemyModel: tpl ? {primitives: tpl.primitives, triangles: tpl.triangles, lod: tpl.lod} : {primitives: 0, triangles: 0, lod: !!C.quality.useLod[so.initialTier == null ? this.quality : so.initialTier]},
                        placeId: this.placeId,
                        detailChunks: so.map ? so.map.places.filter(pl => pl.detail.visible).map(pl => pl.id) : [],
                        mergedMeshes: so.map ? Object.assign({}, so.map.merged) : {},
                        cpu: (() => { const out = {}; ['collisionMs', 'routeMs', 'minimapMs', 'cullMs'].forEach(k => { const r = so.cpu && so.cpu[k]; out[k] = {avg: r && r.n ? +(r.sum / r.n).toFixed(3) : 0, max: r ? +r.max.toFixed(3) : 0, samples: r ? r.n : 0}; }); return out; })(),
                    };
                },
                resetRenderPeak: function () { this._so.stats.peak = {calls: 0, triangles: 0}; this._so.cpu = {}; },
                getLayout: function () {
                    const so = this._so, r = this.$refs;
                    const rect = el => this.rectOf(el);
                    const minFont = list => {
                        let min = Infinity;
                        list.forEach(el => { if (el && global.getComputedStyle) min = Math.min(min, parseFloat(global.getComputedStyle(el).fontSize) || Infinity); });
                        return isFinite(min) ? min : 0;
                    };
                    const plateEls = r.plateEls || [], chips = r.chips || [];
                    const sorted = plateEls.slice().sort((a, b) => Number(a.getAttribute('data-index')) - Number(b.getAttribute('data-index')));
                    const root = r.root;
                    const q = sel => root ? root.querySelector(sel) : null;
                    return {
                        banner: rect(r.banner), counter: rect(r.counter), answers: rect(r.answers),
                        answerItems: chips.slice().sort((a, b) => Number(a.getAttribute('data-index')) - Number(b.getAttribute('data-index'))).map(rect),
                        answersLayout: this.answersLayout,
                        controls: {stick: rect(q('.so-stick')), fire: rect(q('.so-fire')), ads: rect(q('.so-ads')), reload: rect(q('.so-reload')), pause: rect(q('.so-pause')), exit: rect(q('.so-exit')), go: rect(q('.so-go')),
                            // the ammo and score pills share the bottom band with the controls
                            ammo: rect(q('.so-weapon')), score: rect(q('.so-progress'))},
                        objective: q('.so-objective') && !q('.so-objective').classList.contains('so-objective-off') ? rect(q('.so-objective')) : null,
                        toast: this.toast ? rect(q('.so-toast')) : null,
                        mapview: rect(q('.so-mapview')),
                        minimap: this.renderMode === 'gl' ? rect(r.minimap) : null,
                        plates: sorted.map(el => (el.classList.contains('so-plate-unplaced') ? null : rect(el))),
                        plateTextPx: minFont(sorted.map(el => el.querySelector('.so-plate-text'))),
                        // the answer row's text: the chips, or (roaming) the Go button that holds the row
                        answerTextPx: chips.length ? minFont(chips.map(el => el.querySelector('.so-answer-text'))) : minFont([q('.so-go span:last-child') || q('.so-go-dom')]),
                        safeRect: {left: so.safe.left, top: so.safe.top, right: so.safe.right, bottom: so.safe.bottom, width: so.safe.right - so.safe.left, height: so.safe.bottom - so.safe.top},
                        canvas: {w: so.view.w, h: so.view.h},
                        fov: (() => { const f = strikeOpsHipFov(so.view.w, so.view.h, C); return {vfov: f.vfov, hHalf: f.hHalf, ads: f.adsVfov}; })(),
                    };
                },
                debugSnapshot: function () {
                    const so = this._so;
                    return JSON.parse(JSON.stringify({
                        phase: this.phase, renderMode: this.renderMode, resumePhase: this.resumePhase,
                        question: this.question ? this.question.question : null, result: this.question ? this.question.result : null,
                        options: this.options, score: this.score, questionIndex: this.questionIndex, questionToken: this.questionToken,
                        attemptLocked: this.attemptLocked, wrongOption: this.wrongOption, correctIndex: this.correctIndex,
                        roundKind: this.roundKind, roundNumber: this.roundNumber, roundInZone: this.roundInZone, zoneNumber: this.zoneNumber,
                        zoneIndex: this.zoneIndex, zoneId: this.zoneId, stars: this.stars, lap: this.lap, placeId: this.placeId, autopilot: this.autopilot,
                        objectiveText: this.objectiveText,
                        quality: this.quality, reducedMotion: this.reducedMotion, aimMode: this.aimMode, rendering: so.rendering, gfx: so.gfx,
                        ammo: this.ammo, reserve: this.reserve, reloading: this.reloading, ads: this.ads, lockIndex: this.lockIndex,
                        schedulerMs: Math.round(this.schedNow()), mapZoneIndex: so.mapZoneIndex,
                        camera: {x: so.cam.x, y: so.cam.y, z: so.cam.z, yawDeg: so.cam.yaw * 180 / Math.PI, pitchDeg: so.cam.pitch * 180 / Math.PI, fov: so.cam.fov, kick: so.cam.kick},
                        player: this.getPlayer(), map: this.getMap(),
                        phaseTimers: this.getPhaseTimers(), transition: this.getTransition(),
                        enemies: this.getEnemies(), stats: so.stats.last,
                    }));
                },

                // ---------------- map debug API (§12.1, rev 3) ----------------
                getPlayer: function () {
                    const so = this._so, p = so.player;
                    const yawDeg = p.yaw * 180 / Math.PI;
                    const enc = ENCOUNTER_PHASES.indexOf(this.logicalPhase()) !== -1;
                    const fb = strikeOpsPlaceFrame(C.zones[this.zoneIndex]).fightBox;
                    const vi = so.moveInput;
                    return {
                        x: p.x, z: p.z, yawDeg, headingDeg: ((yawDeg % 360) + 360) % 360, pitchDeg: p.pitch * 180 / Math.PI,
                        placeId: this.placeId, inFightBox: inRect(p, fb), clamp: enc ? 'fightBox' : 'bounds',
                        speed: so.speed || 0, sprinting: !!so.sprinting, autopilot: !!so.autopilot,
                        moveInput: vi ? {x: vi.x, z: vi.z, turn: vi.turn} : null,
                    };
                },
                getMap: function () {
                    const so = this._so, k = so.mapZoneIndex, lp = this.logicalPhase();
                    const st = strikeOpsMapState(k, lp, C);
                    const cur = this.currentPlace(), now = nowMs();
                    const gates = C.map.gates.map((g, i) => {
                        const open = st.gates[i].open, t0 = so.gateAnim[g.id];
                        return {id: g.id, from: g.from, to: g.to, open, open01: !open ? 0 : (t0 == null ? 1 : clamp((now - t0) / C.map.gateOpenMs, 0, 1))};
                    });
                    const chunks = {detail: [], structureInFrustum: []};
                    const T = global.THREE;
                    if (so.map && so.camera && T) {
                        const fr = so.frustum || (so.frustum = new T.Frustum()), mx = so.frustumM || (so.frustumM = new T.Matrix4());
                        so.camera.updateMatrixWorld();
                        mx.multiplyMatrices(so.camera.projectionMatrix, so.camera.matrixWorldInverse);
                        fr.setFromProjectionMatrix(mx);
                        so.map.places.forEach(pl => {
                            if (pl.detail.visible) chunks.detail.push(pl.id);
                            if (pl.structure.children.some(mesh => mesh.geometry && mesh.geometry.boundingSphere && fr.intersectsObject(mesh))) chunks.structureInFrustum.push(pl.id);
                        });
                    }
                    const ob = this.objectiveInfo();
                    return JSON.parse(JSON.stringify({
                        bounds: C.map.bounds, playBounds: C.map.playBounds, lap: this.lap, targetZoneIndex: k,
                        places: C.zones.map((z, i) => {
                            const f = strikeOpsPlaceFrame(z);
                            return {id: z.id, name: z.name, region: z.region, fightBox: f.fightBox, anchor: f.anchor, headingDeg: z.headingDeg, cleared: i < k, current: i === cur, target: i === k};
                        }),
                        gates,
                        blockers: st.blockers,
                        trigger: lp === 'roaming' ? st.trigger : (st.trigger ? Object.assign({}, st.trigger, {armed: false}) : null),
                        objective: ob ? {placeId: ob.placeId, x: ob.x, z: ob.z, distanceM: ob.distanceM, onScreen: ob.onScreen, screen: ob.screen, edge: ob.edge} : null,
                        route: this.guidanceRoute(),
                        chunks,
                    }));
                },
                // Presentation only (rev 3.1 placement contract): legal area, the
                // capsule-clear snap rings, then one synchronous trigger check.
                teleport: function (target) {
                    const so = this._so;
                    const fail = reason => ({ok: false, x: so.player.x, z: so.player.z, placeId: this.placeId, triggered: false, reason});
                    if (so.navigated || so.destroyed) return fail('navigated');
                    const phase = this.phase, enc = ENCOUNTER_PHASES.indexOf(phase) !== -1;
                    if (!enc && phase !== 'roaming') return fail('phase');
                    if (this.renderMode !== 'gl') return fail('phase');
                    const k = so.mapZoneIndex, fb = strikeOpsPlaceFrame(C.zones[this.zoneIndex]).fightBox;
                    let dest = null, yaw = null, legal;
                    if (typeof target === 'string') {
                        let idx;
                        if (target === 'start') { dest = {x: C.map.start.x, z: C.map.start.z}; yaw = C.map.start.headingDeg * Math.PI / 180; idx = 0; }
                        else {
                            idx = placeIndexById(C, target);
                            if (idx < 0) return fail('locked');
                            const f = strikeOpsPlaceFrame(C.zones[idx]);
                            dest = {x: f.anchor.x, z: f.anchor.z}; yaw = f.heading;
                        }
                        if (enc) { if (!inRect(dest, fb)) return fail('encounter'); legal = [fb]; }
                        else { if (idx > k) return fail('locked'); legal = C.zones.slice(0, k + 1).map(z => z.region); }
                    } else if (target && typeof target.x === 'number' && typeof target.z === 'number' && isFinite(target.x) && isFinite(target.z)) {
                        dest = {x: target.x, z: target.z};
                        if (typeof target.headingDeg === 'number') yaw = target.headingDeg * Math.PI / 180;
                        if (enc) { if (!inRect(dest, fb)) return fail('encounter'); legal = [fb]; }
                        else { legal = C.zones.slice(0, k + 1).map(z => z.region); if (!legal.some(r => inRect(dest, r))) return fail('locked'); }
                    } else return fail('blocked');
                    const col = strikeOpsColliders(k, C), rr = C.movement.radius + 0.01;
                    const ok = p => inRect(p, C.map.playBounds) && legal.some(r => inRect(p, r)) && !strikeOpsPenetrates(col, p, rr);
                    let spot = ok(dest) ? dest : null;
                    for (let ring = 1; ring <= 20 && !spot; ring++) {
                        const rad = ring * 0.05;
                        for (let a = 0; a < 32; a++) {
                            const th = a * Math.PI * 2 / 32, p = {x: dest.x + Math.sin(th) * rad, z: dest.z + Math.cos(th) * rad};
                            if (ok(p)) { spot = p; break; }
                        }
                    }
                    if (!spot) return fail('blocked');
                    this.placePlayer(spot.x, spot.z, yaw == null ? so.player.yaw : yaw, 0);
                    const triggered = this.checkTrigger();
                    return {ok: true, x: so.player.x, z: so.player.z, placeId: this.placeId, triggered};
                },
                walkTo: function (target, opts) {
                    const so = this._so;
                    if (so.navigated || so.destroyed) return false;
                    if (target === null) { this.cancelAutopilot(); return true; }
                    if (this.renderMode !== 'gl') return false;
                    const phase = this.phase, enc = ENCOUNTER_PHASES.indexOf(phase) !== -1;
                    let t = target;
                    if (phase === 'roaming') {
                        if (typeof target === 'string') {
                            if (target === 'start') t = {x: C.map.start.x, z: C.map.start.z};
                            else { const idx = placeIndexById(C, target); if (idx < 0 || idx > so.mapZoneIndex) return false; }
                        } else if (!target || typeof target.x !== 'number' || typeof target.z !== 'number') return false;
                    } else if (enc) {
                        const fb = strikeOpsPlaceFrame(C.zones[this.zoneIndex]).fightBox;
                        if (!target || typeof target.x !== 'number' || typeof target.z !== 'number' || !inRect(target, fb)) return false;
                    } else return false;
                    if (so.assist) this.finishAssist();
                    return this.startAutopilot(t, opts);
                },
                setMoveInput: function (v) {
                    const so = this._so;
                    if (so.navigated || so.destroyed) return false;
                    if (v == null) { so.moveInput = null; return true; }
                    const n = x => (typeof x === 'number' && isFinite(x) ? clamp(x, -1, 1) : 0);
                    so.moveInput = {x: n(v.x), z: n(v.z), turn: n(v.turn), sprint: !!v.sprint};
                    this.cancelAutopilot();
                    return true;
                },
                setView: function (v) {
                    const so = this._so;
                    if (so.navigated || so.destroyed || !v || so.assist) return false;
                    const p = so.player;
                    if (typeof v.headingDeg === 'number') p.yaw = wrapAngle(v.headingDeg * Math.PI / 180);
                    else if (typeof v.yawDeg === 'number') p.yaw = v.yawDeg * Math.PI / 180;
                    if (typeof v.pitchDeg === 'number') p.pitch = v.pitchDeg * Math.PI / 180;
                    p.pitch = clamp(p.pitch, C.movement.pitchMin, C.movement.pitchMax);
                    this.cancelLock();
                    this.cancelAutopilot();
                    if (so.camera) this.updateCamera(0);
                    return true;
                },
            },
        }));
    }

    global.STRIKE_OPS_CONFIG = STRIKE_OPS_CONFIG;
    global.STRIKE_OPS_THEME_MOTIFS = THEME_MOTIFS;
    global.STRIKE_OPS_MAX_LANES = STRIKE_OPS_MAX_LANES;
    global.validateStrikeOpsConfig = validateStrikeOpsConfig;
    global.resolveStrikeOpsTheme = resolveStrikeOpsTheme;
    global.strikeOpsSquadAt = strikeOpsSquadAt;
    global.strikeOpsBossAt = strikeOpsBossAt;
    global.strikeOpsPoseAt = strikeOpsPoseAt;
    global.strikeOpsRoundKind = strikeOpsRoundKind;
    global.strikeOpsNextRound = strikeOpsNextRound;
    global.strikeOpsLaneOrderOk = strikeOpsLaneOrderOk;
    global.strikeOpsLayoutPlates = strikeOpsLayoutPlates;
    global.strikeOpsHipFov = strikeOpsHipFov;
    global.strikeOpsSquadStyle = strikeOpsSquadStyle;
    global.strikeOpsVolley = strikeOpsVolley;
    global.strikeOpsBidiRuns = strikeOpsBidiRuns;
    global.strikeOpsSafeHtml = strikeOpsSafeHtml;
    global.strikeOpsSafeUrl = strikeOpsSafeUrl;
    global.strikeOpsMergeStatic = strikeOpsMergeStatic;
    global.strikeOpsMoveSpeeds = strikeOpsMoveSpeeds;
    global.strikeOpsResolveMove = strikeOpsResolveMove;
    global.strikeOpsSegmentBlocked = strikeOpsSegmentBlocked;
    global.strikeOpsPickMagnetTarget = strikeOpsPickMagnetTarget;
    global.strikeOpsContrast = strikeOpsContrast;
    global.strikeOpsDeltaE = strikeOpsDeltaE;
    global.strikeOpsAnswersLayout = strikeOpsAnswersLayout;
    global.strikeOpsCloneSkinned = strikeOpsCloneSkinned;
    global.strikeOpsResolveClipRoles = strikeOpsResolveClipRoles;
    global.strikeOpsCoverBox = strikeOpsCoverBox;
    global.strikeOpsAssetUrls = strikeOpsAssetUrls;
    global.strikeOpsArenaToMap = strikeOpsArenaToMap;
    global.strikeOpsRectToMap = strikeOpsRectToMap;
    global.strikeOpsPoseToMap = strikeOpsPoseToMap;
    global.strikeOpsPlaceFrame = strikeOpsPlaceFrame;
    global.strikeOpsMapState = strikeOpsMapState;
    global.strikeOpsGateRect = strikeOpsGateRect;
    global.strikeOpsColliders = strikeOpsColliders;
    global.strikeOpsPenetrates = strikeOpsPenetrates;
    global.strikeOpsSegmentClear = strikeOpsSegmentClear;
    global.strikeOpsWalkGrid = strikeOpsWalkGrid;
    global.strikeOpsFloodFill = strikeOpsFloodFill;
    global.strikeOpsRouteGraph = strikeOpsRouteGraph;
    global.strikeOpsRoute = strikeOpsRoute;
    global.strikeOpsAutopilotStep = strikeOpsAutopilotStep;
    global.strikeOpsVelocityStep = strikeOpsVelocityStep;
    global.strikeOpsCurrentPlace = strikeOpsCurrentPlace;
    global.createStrikeOpsComponent = createStrikeOpsComponent;
})(typeof window !== 'undefined' ? window : globalThis);
