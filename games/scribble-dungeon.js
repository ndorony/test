/**
 * Scribble Dungeon (appType: scribble_dungeon)
 *
 * A hand-drawn top-down dungeon that is *drawn as you answer*. Every room the
 * player clears stays inked on the parchment, the rooms behind the doors that
 * were not taken stay on the map as faint pencil sketches, and wrong doors are
 * scrawled out. The map therefore grows into a visible record of the run
 * instead of the single-corridor view used by `treasure_maze`.
 *
 * The layout is a real dungeon plan rather than a grid of identical boxes:
 * rooms carry their own footprint (closets, halls, long galleries, caverns) and
 * are joined by corridors of varying length, placed by an overlap-checked
 * generator on one shared tile grid.
 *
 * Art: Kenney "Scribble Dungeons" (CC0) — black line art on transparency, which
 * lets every sprite be re-inked at runtime to match the active theme.
 */
(function (global) {
    'use strict';

    const ASSET = './assets/scribble-dungeons/';

    /**
     * Sprites are laid edge to edge, one tile per sprite. Kenney's sample map
     * uses a 60px pitch so the ink overlaps, but that puts the squares printed on
     * the floor tiles out of step with the ruling on the page — the floor's own
     * sub-squares are SPRITE/2 apart inside a tile and PITCH-SPRITE/2 apart
     * across a tile boundary, so no uniform ruling can ever line up with them.
     * At a 64 pitch the sub-squares form one continuous 32-unit lattice, and the
     * printed grid matches the drawing exactly.
     */
    const SPRITE = 64;
    const PITCH = 64;
    const GRID_STEP = SPRITE / 2;   // the squares printed on the floor tiles

    /**
     * Corridor lengths, in tiles, and how often each is chosen. A real floor plan
     * is mostly rooms sharing a wall with a door punched through it, with the
     * occasional passage joining two wings — so length 0 dominates and the long
     * runs are rare.
     */
    const CORRIDOR_LENGTHS = [0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 4, 6];

    // Tiles of slack kept around the room in view, so the corridors and the
    // edges of whatever it connects to stay on screen.
    const VIEW_PAD = 3.2;
    const MIN_ZOOM = 0.14;
    const MAX_ZOOM = 1.0;

    const DIRS = [
        { key: 'n', dx: 0, dy: -1, rot: 0 },
        { key: 'e', dx: 1, dy: 0, rot: 90 },
        { key: 's', dx: 0, dy: 1, rot: 180 },
        { key: 'w', dx: -1, dy: 0, rot: 270 },
    ];
    const OPPOSITE = { n: 's', s: 'n', e: 'w', w: 'e' };

    /**
     * Room kinds. `shapes` are the footprints (width x height in tiles, wall ring
     * included) the kind may take — this is what stops the map reading as a grid
     * of identical boxes. `floor` is the interior tile, `decor` is a prop list
     * whose counts scale with floor area, and `reward` marks rooms that hand out
     * a gem and a new weapon when entered.
     */
    const ROOM_KINDS = {
        chamber: {
            name: 'תא אבן', icon: '🚪',
            shapes: [[5, 5], [5, 7], [7, 5]],
            floor: 'tiles',
            decor: [['crate', 1], ['barrel', 1], ['chair', 1]],
        },
        hall: {
            name: 'אולם האבן', icon: '🏛',
            shapes: [[9, 7], [7, 9], [9, 9]],
            floor: 'tiles',
            decor: [['table', 1], ['chair', 2], ['crate', 1], ['barrel', 1], ['plants', 2]],
        },
        great: {
            name: 'האולם הגדול', icon: '👑',
            shapes: [[15, 11], [13, 11], [17, 9]],
            floor: 'tiles_decorative',
            decor: [['table', 2], ['chair', 4], ['carpet', 2], ['barrels', 2], ['plants', 2], ['crate', 2]],
        },
        gallery: {
            name: 'המסדרון הארוך', icon: '➖',
            shapes: [[17, 3], [3, 13], [15, 5], [5, 15]],
            floor: 'wood',
            decor: [['barrel', 2], ['crate_small', 2], ['plants', 1]],
        },
        vault: {
            name: 'חדר האוצר', icon: '💎',
            shapes: [[7, 7], [5, 7], [9, 5]],
            floor: 'tiles_decorative',
            decor: [['chest', 1], ['barrels_stacked', 1], ['crate_small', 2]],
            reward: true,
        },
        crypt: {
            name: 'הקריפטה', icon: '💀',
            shapes: [[11, 5], [9, 7], [13, 5]],
            floor: 'tiles_cracked',
            decor: [['dragon', 1], ['wall_demolished', 2], ['barrels', 1], ['crate_small', 1]],
        },
        mine: {
            name: 'המכרה הנטוש', icon: '⛏',
            shapes: [[15, 5], [13, 7], [11, 5]],
            floor: 'wood',
            // `planks` is a pair of loose boards, not a surface — it belongs here
            // as scattered timber, never as a floor.
            decor: [['cart', 1], ['barrel', 2], ['crate', 1], ['planks', 1]],
            rails: true,
        },
        camp: {
            name: 'מחנה המנוחה', icon: '🔥',
            shapes: [[9, 7], [7, 7]],
            floor: 'wood',
            decor: [['campfire', 1], ['bed', 1], ['bed_luxurious', 1], ['barrel', 1], ['chair', 1]],
        },
        cavern: {
            name: 'המערה הרטובה', icon: '🌿',
            shapes: [[13, 9], [11, 11], [9, 13]],
            floor: 'grass',
            decor: [['puddle', 2], ['tree', 2], ['plants', 3], ['water', 2]],
        },

        // ---- challenge rooms -------------------------------------------------
        // These carry a `challenge`, which replaces "pick a door" with a puzzle
        // built out of the room itself. They all still have exactly one way out.
        range: {
            name: 'חדר המטווח', icon: '🎯',
            shapes: [[15, 9], [13, 9], [15, 11]],
            floor: 'wood',
            decor: [['barrel', 1], ['crate', 1]],
            challenge: 'range',
        },
        armoury: {
            name: 'הנשקייה', icon: '⚔️',
            shapes: [[13, 9], [11, 9]],
            floor: 'tiles',
            decor: [['barrels_stacked', 1], ['table', 1]],
            challenge: 'armoury',
        },
        bridge: {
            name: 'חדר הגשר', icon: '🌉',
            shapes: [[13, 11], [15, 11]],
            floor: 'tiles_cracked',
            decor: [['crate_small', 1]],
            challenge: 'bridge',
        },
        secret: {
            name: 'החדר האטום', icon: '🧱',
            shapes: [[11, 9], [9, 9]],
            floor: 'tiles',
            decor: [['barrel', 1], ['crate', 1], ['barrels', 1]],
            challenge: 'secret',
        },
    };

    /**
     * How each challenge presents its answers. `anchor` is the sprite the pencil
     * arrow points at, and the rest is presentation the renderer keys off.
     */
    const CHALLENGES = {
        // The pack has no bullseye, so a round hatch is used as the board and the
        // rings are pencilled on top of it.
        range: { anchor: 'trapdoor_round', hint: 'ירו בחץ אל המטרה הנכונה' },
        armoury: { anchor: null, hint: 'הניחו את הנשק הנכון על המעמד' },
        bridge: { anchor: 'trapdoor_square', hint: 'הפעילו את המנגנון שיבנה את הגשר' },
        secret: { anchor: 'wall_secret', hint: 'אין יציאה — מצאו את האבן הנכונה' },
    };

    // The weapons laid out on the armoury floor, in order.
    const ARMOURY_WEAPONS = ['weapon_sword', 'weapon_axe', 'weapon_spear', 'weapon_bow'];

    /**
     * Playback speed. Everything timed multiplies by the chosen factor, so one
     * control moves the whole scene together instead of each animation drifting
     * out of step with the others. The default is the slowest — this is a game
     * you watch being drawn.
     */
    const PACES = [
        { key: 'normal', name: 'רגיל', icon: '🚶', factor: 0.8 },
        { key: 'fast', name: 'מהיר', icon: '🐇', factor: 1.5 },
        { key: 'slow', name: 'איטי', icon: '🐢', factor: 0.55 },
    ];

    /**
     * The pools a run's room order is dealt from. The *rhythm* is fixed — an
     * ordinary room, a challenge, another ordinary room, then a reward — because
     * that is what keeps a run varied. Which rooms fill those slots, and in what
     * order, is shuffled per run so two playthroughs never walk the same story.
     */
    const ORDINARY_KINDS = ['hall', 'chamber', 'gallery', 'cavern', 'crypt', 'mine', 'great'];
    const CHALLENGE_KINDS = ['range', 'armoury', 'bridge', 'secret'];
    const REWARD_KINDS = ['vault', 'camp'];

    // Used until a run deals its own plan, and as the fallback for anything that
    // asks for a kind outside a run (tests, tooling).
    const KIND_CYCLE = [
        'hall', 'range', 'chamber', 'cavern', 'vault', 'gallery',
        'armoury', 'crypt', 'chamber', 'great', 'bridge', 'gallery',
        'secret', 'camp', 'hall', 'mine', 'range', 'chamber',
        'bridge', 'cavern', 'armoury', 'hall', 'secret', 'great',
    ];

    // Per-run state: the dealt room order, and a salt that makes a room's
    // furniture depend on the run as well as on where it sits.
    let KIND_DECK = null;
    let RUN_SALT = 0;

    /**
     * Ambient motion per prop, so a room at rest still breathes: `s` is the scale
     * swing, `r` the rotation swing in radians, `hz` the speed. Anything not listed
     * stays perfectly still — stone should look like stone.
     */
    const WOBBLE = {
        campfire: { s: 0.13, r: 0.06, hz: 4.5 },
        plants: { s: 0.05, r: 0.07, hz: 1.3 },
        tree: { s: 0.03, r: 0.04, hz: 0.8 },
        water: { s: 0.04, r: 0.02, hz: 0.7 },
        puddle: { s: 0.05, r: 0.02, hz: 0.6 },
        dragon: { s: 0.06, r: 0.05, hz: 0.9 },
        cart: { s: 0.02, r: 0.02, hz: 1.1 },
        chest: { s: 0.04, r: 0.0, hz: 1.6 },
    };

    const WEAPONS = [
        'weapon_sword', 'weapon_axe', 'weapon_dagger', 'weapon_hammer',
        'weapon_longsword', 'weapon_spear', 'weapon_staff', 'weapon_bow',
        'weapon_axe_double', 'weapon_axe_large',
    ];
    const PAWNS = [
        { key: 'red', name: 'אדום' },
        { key: 'green', name: 'ירוק' },
        { key: 'purple', name: 'סגול' },
        { key: 'yellow', name: 'צהוב' },
    ];

    // Every sprite the renderer can reach. Loaded once, up front, so a room can
    // never pop in half-drawn mid-animation.
    const SPRITES = [
        'tiles', 'tiles_center', 'tiles_cracked', 'tiles_decorative', 'planks', 'wood',
        'grass', 'water', 'carpet', 'puddle',
        'floor_wall', 'floor_wall_corner', 'floor_wall_edge', 'floor_wall_damaged',
        'floor_door_closed', 'floor_door_open', 'floor_doorway',
        'wall', 'wall_corner', 'wall_damaged', 'wall_demolished', 'wall_secret',
        'door_closed', 'door_open', 'doorway',
        'table', 'chair', 'crate', 'crate_small', 'barrel', 'barrels', 'barrels_stacked',
        'chest', 'campfire', 'bed', 'bed_luxurious', 'tree', 'plants',
        'cart', 'track', 'track_curve', 'track_crossing', 'dragon',
        'stairs_down', 'trap', 'trapdoor_round', 'trapdoor_square',
        'arrow_head', 'arrow_circle', 'bridge', 'bridge_end', 'shield_curved',
    ].concat(WEAPONS)
        .concat(PAWNS.map(p => p.key + '_character'))
        .concat(PAWNS.map(p => p.key + '_hand'));

    /**
     * Theme adapter. The look is a squared maths exercise book: near-white paper,
     * printed grid, and a dungeon drawn on it in pencil. The art is pure black
     * line work on transparency, so a theme only has to name its paper and pencil.
     *
     * `ink` is the pencil, `floor`/`prop` are what the sprites' opaque white fill
     * becomes (kept at paper white so a room reads as *drawn on* the page rather
     * than pasted over it), `faint` is the pencil of a room only glimpsed, `rule`
     * is the printed squared grid and `margin` the ruled margin line.
     */
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

    function resolveScribbleTheme(key) {
        return THEME_INK[key] || THEME_INK.base;
    }

    // Everything written on the page is meant to look pencilled in by hand, so the
    // canvas and the CSS share one handwriting stack.
    const HAND_FONT = '"Segoe Print", "Bradley Hand", "Comic Sans MS", "Chalkboard SE", cursive';
    const SIGN_FONT = '600 22px ' + HAND_FONT;

    /**
     * Where the answers are written, as fractions of the viewport. They stay in
     * these places every round no matter which walls the doors ended up on — the
     * player learns where to look, and a pencil arrow does the job of saying which
     * door each answer belongs to.
     */
    const SIGN_SLOTS = {
        2: [{ x: 0.12, y: 0.42 }, { x: 0.88, y: 0.42 }],
        3: [{ x: 0.12, y: 0.36 }, { x: 0.88, y: 0.36 }, { x: 0.50, y: 0.88 }],
        // The armoury lays out four weapons, so it needs four places to write in.
        4: [{ x: 0.12, y: 0.34 }, { x: 0.88, y: 0.34 },
        { x: 0.28, y: 0.88 }, { x: 0.72, y: 0.88 }],
    };

    function slotsFor(count) {
        return SIGN_SLOTS[count] || SIGN_SLOTS[3];
    }

    /** '#rrggbb' -> [r,g,b]. */
    function hexToRgb(hex) {
        const h = String(hex).replace('#', '');
        const n = parseInt(h.length === 3
            ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
            : h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    // ---------------------------------------------------------------- helpers

    // Small deterministic PRNG so a room's props are identical on every repaint
    // and after a resize, without storing a full tile map per room.
    function mulberry(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // The salt is what stops the room at a given cell always being furnished the
    // same way; within one run the seed stays fixed, so a room still repaints
    // identically every frame.
    function roomSeed(x, y) {
        return ((x * 73856093) ^ (y * 19349663) ^ (RUN_SALT * 83492791) ^ 0x9e3779b9) >>> 0;
    }

    function shuffleWith(rand, list) {
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            const t = list[i]; list[i] = list[j]; list[j] = t;
        }
        return list;
    }

    /**
     * Deals the room order for one run and salts its furniture. Returns the deck
     * so it can be inspected; `kindForDepth` reads it from here on.
     */
    function buildRunPlan(rand, salt) {
        RUN_SALT = (salt || 0) >>> 0;
        const ord = shuffleWith(rand, ORDINARY_KINDS.slice());
        const cha = shuffleWith(rand, CHALLENGE_KINDS.slice());
        const rew = shuffleWith(rand, REWARD_KINDS.slice());

        const deck = ['hall'];                       // always start somewhere plain
        for (let i = 0; i < 8; i++) {
            deck.push(ord[(i * 2) % ord.length]);
            deck.push(cha[i % cha.length]);
            deck.push(ord[(i * 2 + 1) % ord.length]);
            deck.push(rew[i % rew.length]);
        }
        KIND_DECK = deck;
        return deck;
    }

    function tileKey(x, y) {
        return x + ',' + y;
    }

    function kindForDepth(depth) {
        const deck = KIND_DECK || KIND_CYCLE;
        return deck[depth % deck.length];
    }

    function stripTags(html) {
        return String(html == null ? '' : html).replace(/<[^>]*>/g, '').trim();
    }

    function isImageOption(value) {
        return /\.(svg|png|jpe?g|webp|gif)$/i.test(stripTags(value));
    }

    function pick(rand, list) {
        return list[Math.floor(rand() * list.length) % list.length];
    }

    function clamp01(v) {
        return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    // World-space centre of a room, in pixels.
    function roomCentre(room) {
        return {
            x: (room.x + (room.w - 1) / 2) * PITCH,
            y: (room.y + (room.h - 1) / 2) * PITCH,
        };
    }

    // World-space centre of a tile.
    function tileCentre(tx, ty) {
        return { x: tx * PITCH, y: ty * PITCH };
    }

    // Bounding box of a room in world pixels, wall ring included.
    function roomBounds(room) {
        return {
            x: room.x * PITCH - PITCH / 2,
            y: room.y * PITCH - PITCH / 2,
            w: room.w * PITCH,
            h: room.h * PITCH,
        };
    }

    /**
     * Lays out a room's props. Counts scale with floor area so a closet does not
     * get a great hall's furniture, and the middle of the room is kept clear so
     * the pawn always has somewhere to stand.
     */
    function layoutDecor(room, spec, rand) {
        const decor = [];
        const cx = Math.floor((room.w - 1) / 2);
        const cy = Math.floor((room.h - 1) / 2);
        const wide = room.w >= 7;
        const tall = room.h >= 7;

        const free = [];
        for (let c = 1; c < room.w - 1; c++) {
            for (let r = 1; r < room.h - 1; r++) {
                if (c === cx && r === cy) continue;                 // the pawn stands here
                // In rooms with space to spare, keep the centre lanes clear so the
                // walk to a door reads cleanly. Narrow galleries cannot afford it.
                if (wide && tall && (c === cx || r === cy)) continue;
                free.push({ c: c, r: r });
            }
        }
        for (let i = free.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            const t = free[i]; free[i] = free[j]; free[j] = t;
        }

        const area = Math.max(1, (room.w - 2) * (room.h - 2));
        let at = 0;
        spec.decor.forEach(entry => {
            const sprite = entry[0];
            const count = Math.max(1, Math.round(entry[1] * area / 35));
            for (let i = 0; i < count && at < free.length; i++) {
                if (rand() < 0.15) { at++; continue; }               // leave the room breathing
                const cell = free[at++];
                decor.push({
                    sprite: sprite,
                    c: cell.c,
                    r: cell.r,
                    rot: Math.floor(rand() * 4) * 90,
                    phase: rand() * Math.PI * 2,     // desynchronises the ambient sway
                });
            }
        });

        // The mine lays a rail line straight down the room's middle row.
        if (spec.rails) {
            for (let c = 1; c < room.w - 1; c++) {
                decor.push({ sprite: 'track', c: c, r: cy, rot: 90, under: true, phase: 0 });
            }
        }
        return decor;
    }

    /**
     * Builds a room record at a known footprint. Props are laid out immediately
     * and deterministically so `state` transitions never change how it looks.
     */
    function makeRoom(x, y, w, h, depth, kindKey) {
        const kind = ROOM_KINDS[kindKey] ? kindKey : 'hall';
        const spec = ROOM_KINDS[kind];
        const rand = mulberry(roomSeed(x, y));
        const room = {
            x: x, y: y, w: w, h: h,
            depth: depth, kind: kind,
            state: 'peek',
            from: null,           // side we entered through
            entry: null,          // local {c,r} of the entry door, for the reveal sweep
            doors: [],            // every door ever made here (open / sealed / closed)
            choices: [],          // just the doors offered by the current question
            decor: [],
            looted: false,
            reveal: 0,            // 0..1 — how much of the room has been inked in
        };
        room.decor = layoutDecor(room, spec, rand);
        return room;
    }

    /** Picks a footprint for a kind, deterministically per cell. */
    function shapeFor(kindKey, rand) {
        const spec = ROOM_KINDS[kindKey] || ROOM_KINDS.hall;
        return pick(rand, spec.shapes);
    }

    // ------------------------------------------------------ layout occupancy

    /** Marks every tile of a rectangle as taken, and (optionally) who owns it. */
    function occupyRect(taken, x, y, w, h, owner, room) {
        for (let i = 0; i < w; i++) {
            for (let j = 0; j < h; j++) {
                taken[tileKey(x + i, y + j)] = true;
                if (owner) owner[tileKey(x + i, y + j)] = room;
            }
        }
    }

    /**
     * Tie-break for a wall line shared by two rooms placed against each other:
     * exactly one of them draws it, or the line comes out double-thick.
     */
    function yieldsWall(room, neighbour) {
        return room.x > neighbour.x || (room.x === neighbour.x && room.y > neighbour.y);
    }

    /**
     * True when a rectangle can be placed. Only overlap is forbidden — rooms are
     * allowed to sit wall-against-wall, which is what packs the map into one
     * continuous complex instead of islands floating on corridors.
     */
    function rectFree(taken, x, y, w, h) {
        for (let i = 0; i < w; i++) {
            for (let j = 0; j < h; j++) {
                if (taken[tileKey(x + i, y + j)]) return false;
            }
        }
        return true;
    }

    /**
     * Tries to attach a new room to `room` on side `dir`.
     *
     * Picks a door position along that wall, a corridor length and a footprint for
     * the new room, then checks the whole footprint plus its margin against every
     * tile already used. Returns null when nothing fits, which is the generator's
     * signal to try another direction.
     */
    function placeNeighbour(taken, room, dir, depth, rand, attempts) {
        const kindKey = kindForDepth(depth);
        const tries = attempts || 48;

        // The footprints to try, in order. The kind's own shapes come first; once
        // those keep colliding we fall back to progressively smaller ones so a
        // tightly packed plan can still grow rather than dead-ending.
        const candidates = (ROOM_KINDS[kindKey] || ROOM_KINDS.hall).shapes.slice();
        const fallback = ROOM_KINDS.chamber.shapes.slice()
            .sort((a, b) => a[0] * a[1] - b[0] * b[1]);
        candidates.sort((a, b) => a[0] * a[1] - b[0] * b[1]);

        for (let t = 0; t < tries; t++) {
            // First third: the kind's real shapes at random. After that, walk from
            // smallest upward, then the closet shapes as a last resort.
            const usingFallback = t >= tries * 0.75;
            const shape = t < tries / 3
                ? pick(rand, candidates)
                : (usingFallback
                    ? fallback[t % fallback.length]
                    : candidates[(t - Math.floor(tries / 3)) % candidates.length]);
            const bw = shape[0];
            const bh = shape[1];
            // Once we are down to fallback shapes the plan is tight, so stop asking
            // for a corridor as well and just butt the room against the wall.
            const len = usingFallback ? 0 : pick(rand, CORRIDOR_LENGTHS);

            // Door position along this room's wall, never on a corner, and where
            // that door lands on the new room's opposite wall. Early attempts guess
            // (which keeps the plan irregular); later ones sweep every position in
            // turn, so a gap that does exist is always found.
            const horizontalWall = dir === 'n' || dir === 's';
            const alongSpan = Math.max(1, (horizontalWall ? room.w : room.h) - 2);
            const alongBase = horizontalWall ? room.x : room.y;
            const offsetSpan = Math.max(1, (horizontalWall ? bw : bh) - 2);
            const sweep = t >= tries / 3;
            const along = alongBase + 1 + (sweep
                ? (t % alongSpan)
                : Math.floor(rand() * alongSpan));
            const offset = 1 + (sweep
                ? (Math.floor(t / alongSpan) % offsetSpan)
                : Math.floor(rand() * offsetSpan));

            let doorTile, corridor = [], bx, by;
            if (dir === 'e') {
                doorTile = { x: room.x + room.w - 1, y: along };
                for (let i = 1; i <= len; i++) corridor.push({ x: doorTile.x + i, y: along });
                bx = doorTile.x + len + 1;
                by = along - offset;
            } else if (dir === 'w') {
                doorTile = { x: room.x, y: along };
                for (let i = 1; i <= len; i++) corridor.push({ x: doorTile.x - i, y: along });
                bx = doorTile.x - len - bw;
                by = along - offset;
            } else if (dir === 's') {
                doorTile = { x: along, y: room.y + room.h - 1 };
                for (let i = 1; i <= len; i++) corridor.push({ x: along, y: doorTile.y + i });
                bx = along - offset;
                by = doorTile.y + len + 1;
            } else {
                doorTile = { x: along, y: room.y };
                for (let i = 1; i <= len; i++) corridor.push({ x: along, y: doorTile.y - i });
                bx = along - offset;
                by = doorTile.y - len - bh;
            }

            if (!rectFree(taken, bx, by, bw, bh)) continue;
            // The corridor runs through the margin we just cleared, so only its own
            // cells need checking.
            if (corridor.some(c => taken[tileKey(c.x, c.y)])) continue;

            // A room squeezed into a closet-sized gap is a closet, whatever the
            // cycle wanted it to be.
            const target = makeRoom(bx, by, bw, bh, depth, usingFallback ? 'chamber' : kindKey);
            target.from = OPPOSITE[dir];
            target.entry = dir === 'e' ? { c: 0, r: offset }
                : dir === 'w' ? { c: bw - 1, r: offset }
                    : dir === 's' ? { c: offset, r: 0 }
                        : { c: offset, r: bh - 1 };

            return { target: target, corridor: corridor, doorTile: doorTile, dir: dir };
        }
        return null;
    }

    // ------------------------------------------------------------- validation

    function validateScribbleDungeonConfig(cfg) {
        const errors = [];
        const kinds = cfg && cfg.kinds;
        if (!kinds || !Object.keys(kinds).length) {
            errors.push('missing room kinds');
            return errors;
        }
        Object.keys(kinds).forEach(key => {
            const k = kinds[key];
            if (!k.name) errors.push(key + ': missing name');
            if (!k.floor) errors.push(key + ': missing floor tile');
            if (!Array.isArray(k.decor) || !k.decor.length) errors.push(key + ': missing decor');
            if (!Array.isArray(k.shapes) || !k.shapes.length) errors.push(key + ': missing shapes');
            (k.shapes || []).forEach(s => {
                if (s[0] < 3 || s[1] < 3) errors.push(key + ': shape too small to hold a wall ring');
                if (s[0] % 2 === 0 || s[1] % 2 === 0) errors.push(key + ': shape must be odd so a door can centre');
            });
            k.decor.forEach(entry => {
                if (cfg.sprites.indexOf(entry[0]) < 0) errors.push(key + ': decor sprite not preloaded: ' + entry[0]);
            });
            if (cfg.sprites.indexOf(k.floor) < 0) errors.push(key + ': floor sprite not preloaded: ' + k.floor);
        });
        (cfg.cycle || []).forEach(key => {
            if (!kinds[key]) errors.push('cycle references unknown kind: ' + key);
        });
        return errors;
    }

    // --------------------------------------------------------------- component

    function createScribbleDungeonComponent(BaseGameComponent) {
        return Vue.component('scribble-dungeon', Vue.extend({
            template: `
    <div class="container sd-container">
      <div class="sd-stage" ref="stage" :class="'sd-theme-' + themeKey">
        <canvas class="sd-canvas" ref="canvas"></canvas>

        <div class="sd-hud-top">
          <div class="sd-question" v-html="questionHtml"></div>
          <div class="sd-feedback" :class="{ 'is-bad': feedbackBad, 'is-good': feedbackGood }">{{ feedback }}</div>
        </div>

        <div class="sd-hud-stats">
          <span title="ניקוד">🪙 {{ score }}</span>
          <span title="אבני חן">💎 {{ gems }}</span>
          <span title="חדרים שנחקרו">🗺 {{ explored }}</span>
        </div>

        <div class="sd-hud-tools">
          <button type="button" class="sd-tool" @click="toggleMap"
                  :aria-pressed="String(mapMode)" :title="mapMode ? 'חזרה לחדר' : 'הצג את כל המפה'">
            {{ mapMode ? '🔍' : '🗺' }}</button>
          <button type="button" class="sd-tool" @click="cyclePace" :title="'קצב האנימציה: ' + paceName">
            {{ paceIcon }}</button>
          <button type="button" class="sd-tool" @click="cyclePawn" title="החלף דמות">🎨</button>
          <button type="button" class="sd-tool" @click="toggleFullscreen" title="מסך מלא">⛶</button>
        </div>

        <!-- Real buttons over the painted signs: the canvas carries the art, these
             carry the semantics (focus ring, keyboard, screen readers). -->
        <button v-for="hot in hotspots" :key="hot.id" type="button" class="sd-door-hit"
                :style="{ left: hot.x + 'px', top: hot.y + 'px', width: hot.w + 'px', height: hot.h + 'px' }"
                :aria-label="'דלת ' + hot.dirName + ': ' + hot.plain"
                :disabled="locked" @click="answer(hot.index)">
          <span class="sd-door-key">{{ hot.index + 1 }}</span>
        </button>

        <div class="sd-loading" v-if="!ready">מצייר את המבוך…</div>

        <div class="sd-hud-progress" v-if="progress && progress.total">
          <div class="sd-hud-progress-fill"
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
                    roomName: '',
                    roomIcon: '',
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
                            const done = () => {
                                if (--pending === 0) resolve();
                            };
                            img.onload = () => { this._sd.sprites[name] = img; done(); };
                            img.onerror = done;        // a missing tile must not stall the run
                            img.src = ASSET + name + '.png';
                        });
                    });
                },

                /**
                 * Re-inks a sprite as a duotone: the black pencil strokes become
                 * `color`, the sprite's opaque white fill becomes `paper`, and every
                 * grey in between is interpolated. Transparency is untouched.
                 *
                 * A flat `source-in` tint is not enough here — most of these tiles
                 * carry a solid white floor under the line work, so tinting them flat
                 * paints the whole room in one colour. Working per pixel is fine: it
                 * happens once per sprite per colour pair and the result is cached.
                 */
                inked: function (name, color, paper) {
                    const g = this._sd;
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

                // The pawn discs carry the only colour in the pack; keep them as-is.
                raw: function (name) {
                    return this._sd.sprites[name] || null;
                },

                /**
                 * `floor_wall` is a wall *and* an opaque floor. Stacking two of them on
                 * one tile therefore paints the second one's floor straight over the
                 * first one's wall — which is why a one-tile corridor ended up walled
                 * on a single side. This keeps only the wall band, so both sides can be
                 * laid on the same tile.
                 */
                wallOnly: function (color, paper) {
                    const g = this._sd;
                    const cacheKey = 'wallOnly|' + color + '|' + paper;
                    if (g.inkCache[cacheKey]) return g.inkCache[cacheKey];
                    const src = this.inked('floor_wall', color, paper);
                    if (!src) return null;
                    const c = document.createElement('canvas');
                    c.width = c.height = SPRITE;
                    const ctx = c.getContext('2d');
                    ctx.drawImage(src, 0, 0);
                    // The wall sits along the top edge of the tile; drop everything below it.
                    ctx.clearRect(0, Math.round(SPRITE * 0.36), SPRITE, SPRITE);
                    g.inkCache[cacheKey] = c;
                    return c;
                },

                // ------------------------------------------------------ dungeon

                startRun: function () {
                    const g = this._sd;
                    // The map and everything about this descent start over; the score
                    // and the gems are earned, so `restore` keeps those.
                    this.explored = 1;
                    this.streak = 0;
                    g.pawn.weapon = null;
                    g.rooms = [];
                    g.taken = {};
                    g.owner = {};
                    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
                    g.rand = mulberry(seed);
                    // Deal this run its own room order and furniture salt.
                    buildRunPlan(g.rand, seed);

                    const shape = shapeFor(kindForDepth(0), g.rand);
                    const start = makeRoom(0, 0, shape[0], shape[1], 0, 'hall');
                    start.state = 'visited';
                    start.reveal = 1;
                    occupyRect(g.taken, start.x, start.y, start.w, start.h, g.owner, start);
                    g.rooms.push(start);
                    g.current = start;

                    const c = roomCentre(start);
                    g.pawn.x = c.x;
                    g.pawn.y = c.y;
                    g.pawn.facing = 0;
                    this.depth = 1;
                    this.explored = 1;
                    this.setRoomLabel(start);
                },

                /**
                 * Opens the doors of the current room and puts one answer on each.
                 * The rooms behind them are laid out immediately, in `peek` state,
                 * so the player can see where every choice would lead.
                 */
                prepareRound: function () {
                    const g = this._sd;
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
                    // The doors are already part of the room — built when it was drawn.
                    // Only cut new ones if every previous way out has been sealed.
                    let choices = (room.choices || []).filter(d => d.state === 'closed');
                    if (!choices.length) choices = this.buildExits(room);
                    if (!choices.length) {
                        this.reflowFromDeadEnd();
                        return this.prepareRound();
                    }

                    // Every door gets a distinct answer and the correct one is always
                    // among them.
                    const wrong = q.options.filter(o => o !== q.result);
                    const labels = [q.result].concat(this.shuffle(wrong).slice(0, choices.length - 1));
                    const shuffled = this.shuffle(labels);
                    choices.forEach((door, i) => {
                        door.label = shuffled[i];
                        door.plain = stripTags(shuffled[i]);
                        door.index = i;
                    });
                    room.choices = choices;

                    this.questionHtml = q.question;
                    this.result = q.result;
                    this.questionIndex = q.questionIndex;
                    this.feedback = '';
                    this.feedbackBad = this.feedbackGood = false;
                    g.state = 'question';
                    g.signIn = 0;                       // signs animate in
                    g.roundStart = performance.now();   // for the speed bonus
                    this.roundToken++;

                    if (this.reloadProgress()) {
                        this.aimCamera();
                        // Input stays shut until the answers are actually legible. The
                        // slots are fixed, so without this a player resting on one spot
                        // answers round after round before anything has been drawn.
                        this.locked = true;
                        this.hotspots = [];
                        g.awaitInput = true;
                        if (typeof q.action === 'function') q.action();
                    }
                },

                /**
                 * Builds whatever the room asks the player to do. A plain room gets
                 * doors to choose between; a challenge room gets one way out plus the
                 * apparatus of its puzzle. Either way the result is a list of answer
                 * anchors with a `tile` for the pencil arrow to point at.
                 */
                buildExits: function (room) {
                    const spec = ROOM_KINDS[room.kind];
                    return spec.challenge
                        ? this.buildChallenge(room, spec.challenge)
                        : this.buildDoors(room);
                },

                /**
                 * A challenge room has a single exit and N pieces of apparatus. Every
                 * answer leads to the same door — what changes is which one opens it.
                 * Falls back to plain doors if nothing can be attached.
                 */
                buildChallenge: function (room, challenge) {
                    const g = this._sd;
                    room.challenge = challenge;

                    // Some rooms lead on through a door; others end in a stairwell,
                    // which goes down to a fresh page of the notebook. Stairs are also
                    // the answer when nothing will fit alongside this room any more.
                    const wantStairs = g.rand() < 0.3;
                    const ways = wantStairs ? [] : this.openWays(room, 1);

                    if (ways.length) {
                        const exit = ways[0];
                        room.exitStyle = 'door';
                        room.exit = {
                            dir: exit.dir, tile: exit.doorTile, corridor: exit.corridor,
                            target: exit.target, state: 'closed', swing: 0, sealT: 0,
                            index: 0, label: null, plain: '',
                        };
                        room.doors = room.doors.concat([room.exit]);
                    } else {
                        room.exitStyle = 'stairs';
                        room.exit = {
                            stairs: true, tile: this.stairsTile(room), dir: null,
                            corridor: [], target: null, state: 'closed', swing: 0, sealT: 0,
                            index: 0, label: null, plain: '',
                        };
                    }

                    const marks = this.layoutMarks(room, challenge);
                    room.chasm = challenge === 'bridge' ? Math.floor((room.h - 1) / 2) : null;
                    room.bridgeT = 0;
                    room.solvedT = 0;

                    // Each anchor is a choice; they all open the one exit.
                    const made = marks.map((m, i) => ({
                        challenge: challenge,
                        mark: m,
                        tile: { x: room.x + m.c, y: room.y + m.r },
                        state: 'closed',
                        shake: 0, grow: 1, slide: 0, gone: 0,
                        exit: room.exit,
                        index: i, label: null, plain: '',
                    }));
                    room.choices = made;
                    return made;
                },

                /**
                 * A stairwell sits inside the room, as far from the way in as the room
                 * allows, so descending reads as going deeper rather than sideways.
                 */
                stairsTile: function (room) {
                    const cx = Math.floor((room.w - 1) / 2);
                    const cy = Math.floor((room.h - 1) / 2);
                    if (!room.entry) return { x: room.x + cx, y: room.y + cy };
                    const c = room.entry.c <= cx ? room.w - 2 : 1;
                    const r = room.entry.r <= cy ? room.h - 2 : 1;
                    return { x: room.x + c, y: room.y + r };
                },

                /**
                 * Where a challenge's apparatus sits, in room-local tiles.
                 *  - range   : targets along the wall opposite the way in
                 *  - armoury : weapons in a row across the floor, rack by the exit
                 *  - bridge  : levers on the near side of the chasm
                 *  - secret  : stones set into the walls
                 */
                layoutMarks: function (room, challenge) {
                    const marks = [];
                    const midR = Math.floor((room.h - 1) / 2);
                    const count = challenge === 'armoury' ? 4 : 3;
                    const spread = (n, span) => {
                        const out = [];
                        for (let i = 0; i < n; i++) out.push(Math.round(span * (i + 1) / (n + 1)));
                        return out;
                    };

                    if (challenge === 'range') {
                        // Shoot away from the door we came in through.
                        const fromTop = room.entry ? room.entry.r <= midR : true;
                        const row = fromTop ? room.h - 2 : 1;
                        spread(count, room.w - 1).forEach(c => {
                            marks.push({ c: c, r: row, sprite: 'trapdoor_round', phase: c, rings: true });
                        });
                        room.shootFrom = { c: Math.floor((room.w - 1) / 2), r: fromTop ? 1 : room.h - 2 };
                    } else if (challenge === 'armoury') {
                        spread(count, room.w - 1).forEach((c, i) => {
                            marks.push({ c: c, r: midR + 1, sprite: ARMOURY_WEAPONS[i], phase: c, home: { c: c, r: midR + 1 } });
                        });
                        room.rack = { c: Math.floor((room.w - 1) / 2), r: 1 };
                    } else if (challenge === 'bridge') {
                        const row = room.entry && room.entry.r > midR ? midR + 2 : midR - 2;
                        spread(count, room.w - 1).forEach(c => {
                            marks.push({ c: c, r: Math.max(1, Math.min(room.h - 2, row)), sprite: 'trapdoor_square', phase: c });
                        });
                    } else {
                        // secret: stones set into the left, top and right walls.
                        marks.push({ c: 0, r: midR, sprite: 'wall_secret', phase: 1, wall: 'w' });
                        marks.push({ c: Math.floor((room.w - 1) / 2), r: 0, sprite: 'wall_secret', phase: 2, wall: 'n' });
                        marks.push({ c: room.w - 1, r: midR, sprite: 'wall_secret', phase: 3, wall: 'e' });
                    }
                    return marks;
                },

                /**
                 * Cuts a plain room's ways out and hangs the doors in its walls.
                 */
                buildDoors: function (room) {
                    const g = this._sd;
                    // Sometimes one of the ways out of an ordinary room is a stairwell
                    // down to a fresh page, rather than another door in a wall.
                    const withStairs = g.rand() < 0.28;
                    const made = this.openWays(room, withStairs ? 2 : 3).map((p, i) => ({
                        dir: p.dir,
                        tile: p.doorTile,
                        corridor: p.corridor,
                        target: p.target,
                        state: 'closed',
                        swing: 0,
                        sealT: 0,
                        label: null,
                        plain: '',
                        index: i,
                    }));
                    room.doors = room.doors.concat(made);

                    // The stairwell is a choice like any other, but it stands in the
                    // room instead of in a wall, and it leads off this page entirely.
                    if ((withStairs && made.length) || !made.length) {
                        room.stairs = this.stairsTile(room);
                        made.push({
                            stairs: true, tile: room.stairs, dir: null, corridor: [],
                            target: null, state: 'closed', swing: 0, sealT: 0,
                            label: null, plain: '', index: made.length,
                        });
                    }

                    room.choices = made;
                    return made;
                },

                /**
                 * Lays out up to three new ways out of a room. Each is a fully
                 * resolved placement (door tile, corridor cells, new room), reserved
                 * on the occupancy map so two doors can never lead into each other.
                 */
                openWays: function (room, limit) {
                    const g = this._sd;
                    const cap = limit || 3;
                    const used = {};
                    room.doors.forEach(d => { used[d.dir] = true; });
                    if (room.from) used[room.from] = true;

                    const dirs = this.shuffle(DIRS.map(d => d.key).filter(k => !used[k]));
                    // Prefer carrying on away from the door we entered through, so the
                    // map keeps unrolling instead of folding back on itself.
                    const forward = room.from ? OPPOSITE[room.from] : null;
                    dirs.sort((a, b) => (b === forward ? 1 : 0) - (a === forward ? 1 : 0));

                    const out = [];
                    dirs.forEach(dir => {
                        if (out.length >= cap) return;
                        const placed = placeNeighbour(g.taken, room, dir, room.depth + 1, g.rand);
                        if (!placed) return;
                        occupyRect(g.taken, placed.target.x, placed.target.y, placed.target.w, placed.target.h, g.owner, placed.target);
                        placed.corridor.forEach(c => { g.taken[tileKey(c.x, c.y)] = true; });
                        g.rooms.push(placed.target);
                        out.push(placed);
                    });
                    return out;
                },

                /**
                 * Nothing fits around the current room. Fall back to the deepest room
                 * that still has space to grow, keeping the drawn map intact.
                 */
                reflowFromDeadEnd: function () {
                    const g = this._sd;
                    const candidates = g.rooms
                        .filter(r => r.state === 'visited' && r !== g.current)
                        .sort((a, b) => b.depth - a.depth);

                    for (let i = 0; i < candidates.length; i++) {
                        const r = candidates[i];
                        const free = DIRS.map(d => d.key)
                            .filter(k => !r.doors.some(d => d.dir === k) && k !== r.from);
                        if (free.length) { g.current = r; break; }
                    }
                    if (g.current.state !== 'visited') g.current = g.rooms[0];

                    const c = roomCentre(g.current);
                    g.pawn.x = c.x; g.pawn.y = c.y;
                    this.setRoomLabel(g.current);
                },

                setRoomLabel: function (room) {
                    const spec = ROOM_KINDS[room.kind];
                    this.roomName = spec.name;
                    this.roomIcon = spec.icon;
                    this.depth = room.depth + 1;
                    // Challenge rooms say what they want, because the rule changes.
                    this.roomHint = spec.challenge ? CHALLENGES[spec.challenge].hint : '';
                },

                // ------------------------------------------------------- answers

                answer: function (index) {
                    const g = this._sd;
                    if (this.locked || g.state !== 'question') return;
                    const door = (g.current.choices || [])[index];
                    if (!door || door.state !== 'closed') return;

                    this.locked = true;
                    this.hotspots = [];

                    if (door.label === this.result) {
                        this.onCorrect(door);
                    } else {
                        this.onWrong(door);
                    }
                },

                onCorrect: function (choice) {
                    const g = this._sd;
                    const room = g.current;
                    this.streak++;
                    this.feedbackGood = true;
                    this.feedbackBad = false;
                    this.playSound(true);

                    updateWeightForKey(this.currentAppId, this.questionIndex, -1);
                    this.score += 1;

                    // A quick hit is worth an extra point. The learning report above is
                    // unaffected — this is the game's own score, like the gems.
                    const quick = !this.reduced && (performance.now() - g.roundStart) < 4500;
                    if (quick) this.score += 1;

                    if (!this.reloadProgress()) return;      // stage finished; router took over
                    this.saveScore();

                    if (choice.challenge) {
                        choice.state = 'solved';
                        room.solvedT = 0;
                        this.feedback = quick ? this.getSuccessMsg() + ' ⚡ בונוס מהירות' : this.getSuccessMsg();
                        this.puff(tileCentre(choice.tile.x, choice.tile.y), 'good', 18);
                        if (choice.challenge === 'range') this.loose(choice);
                        g.state = 'solving';
                        // Let the apparatus finish its move before the pawn walks out.
                        this.own(() => {
                            if (this._destroyed) return;
                            room.exit.state = 'open';
                            if (room.exit.stairs) this.walkToStairs(room.exit.tile);
                            else this.beginWalk(room.exit);
                        }, this.dur(2.2) * 1000);
                        return;
                    }

                    choice.state = 'open';
                    g.state = 'walking';
                    this.feedback = quick ? this.getSuccessMsg() + ' ⚡ בונוס מהירות' : this.getSuccessMsg();
                    if (choice.stairs) this.walkToStairs(choice.tile);
                    else this.beginWalk(choice);
                },

                onWrong: function (choice) {
                    const g = this._sd;
                    const room = g.current;
                    this.streak = 0;
                    this.feedbackBad = true;
                    this.feedbackGood = false;
                    this.playSound(false);
                    this.shake(11);
                    this.puff(tileCentre(choice.tile.x, choice.tile.y), 'bad', 16);

                    this.score = Math.max(0, this.score - 1);
                    this.saveScore();
                    updateWeightForKey(this.currentAppId, this.questionIndex, 1);

                    if (choice.challenge) {
                        // The apparatus rejects the attempt and springs back, and the
                        // right one is nudged into view a little.
                        choice.state = 'rejected';
                        choice.shake = 1;
                        if (choice.challenge === 'range') this.loose(choice, true);
                        this.feedback = {
                            range: 'פספסתם — נסו מטרה אחרת',
                            armoury: 'זה לא הנשק הנכון',
                            bridge: 'הקרש התקפל בחזרה',
                            secret: 'האבן זזה וחזרה למקומה',
                        }[choice.challenge] || 'נסו שוב';
                        // A miss makes the range more forgiving — but every remaining
                        // target grows, never just the right one. Singling the correct
                        // target out would mark the answer instead of easing the shot.
                        if (choice.challenge === 'range') {
                            (room.choices || []).forEach(c => {
                                c.grow = Math.min(1.35, c.grow + 0.12);
                            });
                        }
                    } else {
                        choice.state = 'sealed';
                        choice.sealT = 0;
                        // A stairwell has no room behind it to cross out.
                        if (choice.target) {
                            choice.target.state = 'sealed';
                            choice.target.sealT = 0;
                        }
                        this.feedback = choice.stairs
                            ? 'המדרגות נחסמו — נסו דרך אחרת'
                            : 'הדלת נחסמה — נסו דלת אחרת';
                    }

                    if (!this.reloadProgress()) return;

                    this.own(() => {
                        if (this._destroyed) return;
                        // A rejected mechanism is available again; a sealed door is not.
                        if (choice.challenge) choice.state = 'closed';
                        const open = (g.current.choices || []).filter(d => d.state === 'closed');
                        if (!open.length) {
                            this.prepareRound();
                        } else {
                            this.aimCamera();
                            this.locked = false;
                            this.syncHotspots();
                        }
                    }, this.dur(1.5) * 1000);
                },

                /** Sends an arrow from the pawn to a target in the shooting range. */
                loose: function (choice, miss) {
                    const g = this._sd;
                    const to = tileCentre(choice.tile.x, choice.tile.y);
                    g.shots.push({
                        x: g.pawn.x, y: g.pawn.y,
                        fromX: g.pawn.x, fromY: g.pawn.y,
                        toX: miss ? to.x + (Math.random() - 0.5) * PITCH * 1.6 : to.x,
                        toY: miss ? to.y - PITCH * 0.9 : to.y,
                        t: 0, dur: this.dur(0.6), miss: !!miss,
                    });
                },

                /**
                 * Walks the pawn out of the room, down the corridor and into the next
                 * one. The pace is deliberately unhurried — the walk is when the new
                 * wing of the map gets drawn, and that is the part worth watching.
                 */
                beginWalk: function (door) {
                    const g = this._sd;
                    const from = g.current;
                    const to = door.target;
                    const d = DIRS.find(x => x.key === door.dir);

                    const pts = [{ x: g.pawn.x, y: g.pawn.y }, tileCentre(door.tile.x, door.tile.y)];
                    door.corridor.forEach(c => pts.push(tileCentre(c.x, c.y)));
                    const entryTile = { x: to.x + to.entry.c, y: to.y + to.entry.r };
                    pts.push(tileCentre(entryTile.x, entryTile.y));
                    pts.push(roomCentre(to));

                    // Longer routes take longer, but never so long that the round drags.
                    let dist = 0;
                    for (let i = 1; i < pts.length; i++) {
                        dist += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
                    }
                    g.walk = {
                        t: 0,
                        dur: this.dur(Math.min(3.4, 1.5 + dist / 680)),
                        pts: pts,
                        facing: Math.atan2(d.dy, d.dx) + Math.PI / 2,
                        // Carry the destination on the walk itself. Re-deriving it from
                        // "the open door" is wrong as soon as a room has more than one.
                        target: to,
                        // The camera glides between these two framings in step with the
                        // pawn, instead of racing ahead on its own easing clock.
                        fromFrame: this.frameFor(from),
                        toFrame: this.frameFor(to),
                    };

                    // The room ahead starts inking itself in the moment we commit to
                    // the door, so the pawn walks into a room being drawn around it.
                    to.state = 'visited';
                    to.reveal = 0;
                    // Cut its doors now, so the room inks itself in already complete
                    // instead of growing openings after the walk ends.
                    this.buildExits(to);
                    this.explored++;
                    this.setRoomLabel(to);
                    this.aimCameraFor(to);
                    this.puff(tileCentre(door.tile.x, door.tile.y), 'good', 12);
                },

                /** Crosses the room to the stairwell, then turns the page. */
                walkToStairs: function (tile) {
                    const g = this._sd;
                    const to = tileCentre(tile.x, tile.y);
                    const dist = Math.hypot(to.x - g.pawn.x, to.y - g.pawn.y);
                    g.state = 'walking';
                    g.walk = {
                        t: 0,
                        dur: this.dur(Math.min(2.4, 1.0 + dist / 700)),
                        pts: [{ x: g.pawn.x, y: g.pawn.y }, to],
                        facing: Math.atan2(to.y - g.pawn.y, to.x - g.pawn.x) + Math.PI / 2,
                        target: null,
                        descend: true,
                    };
                    this.feedback = '⬇️ יורדים במדרגות…';
                },

                /**
                 * Down the stairs and onto a clean sheet. The map so far is left
                 * behind with the page; only the run's tally carries over.
                 */
                /**
                 * Going down the stairs.
                 *
                 * The page is photographed as it stands and a hole is punched through
                 * the photograph exactly where the stairwell is. The next page is then
                 * built underneath and lined up so *its* staircase sits directly below
                 * that hole — so the stairs you are looking down are the same stairs
                 * you arrive on. The pawn stands on them the whole time; the holed
                 * photograph on top is what makes it look half-swallowed.
                 */
                descend: function () {
                    const g = this._sd;
                    g.state = 'turning';
                    this.hotspots = [];

                    // Where the stairwell is on screen, in CSS pixels.
                    const hole = this.worldToScreen(g.pawn.x, g.pawn.y);
                    hole.r = Math.max(26, PITCH * 0.62 * g.cam.z);

                    let snap = null;
                    try {
                        // Repaint the page with the pawn left out, and photograph that.
                        // The pawn is never part of the sheet that turns — it stays on
                        // the stairs, live, and the paper peels away around it.
                        g.hidePawn = true;
                        this.render();
                        g.hidePawn = false;

                        snap = document.createElement('canvas');
                        snap.width = g.canvas.width;
                        snap.height = g.canvas.height;
                        const sctx = snap.getContext('2d');
                        sctx.drawImage(g.canvas, 0, 0);
                        // Cut the stairwell tile clean out of the photograph, so the
                        // page has a real hole in it and the pawn shows through from
                        // the level below rather than being painted over.
                        sctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
                        const half = (PITCH / 2) * g.cam.z;
                        sctx.clearRect(hole.x - half, hole.y - half, half * 2, half * 2);
                    } catch (e) { snap = null; }

                    g.page = { t: 0, dur: this.dur(2.2), snap: snap, hole: hole };
                    this.newPage(hole);
                },

                /**
                 * Draws the leaf being turned: the old page pivots away about the
                 * spine on the left, so it narrows and lifts while the fresh sheet
                 * shows through behind it.
                 */
                drawPageTurn: function (ctx) {
                    const g = this._sd;
                    const p = g.page;
                    if (!p || !p.snap) return;
                    const w = g.view.w;
                    const h = g.view.h;
                    const u = Math.min(1, p.t / p.dur);

                    // ---- the fold line ------------------------------------------
                    // The peel runs from the bottom-left corner to the top-right, so
                    // the fold is the line perpendicular to that diagonal, sweeping
                    // across the sheet. `n` is the peel direction and the fold's
                    // normal; s(point) = point·n says which side of the fold a point
                    // is on. Everything with s < f has already been lifted.
                    const nx = Math.SQRT1_2, ny = -Math.SQRT1_2;
                    const sAt = (x, y) => x * nx + y * ny;
                    const sStart = sAt(0, h);            // bottom-left corner
                    const sEnd = sAt(w, 0);              // top-right corner
                    const k = 1 - easeInOut(u);          // how much sheet is left
                    if (k <= 0.002) return;
                    // The leading edge is the bottom-left corner after the squeeze.
                    const f = sEnd + k * (sStart - sEnd);

                    const L = (w + h) * 2;
                    const tx = -ny, ty = nx;             // along the fold
                    const px = f * nx, py = f * ny;      // a point on the fold

                    // A half-plane as a path: side +1 keeps s >= f, side -1 keeps s <= f.
                    const halfPlane = (side) => {
                        ctx.beginPath();
                        ctx.moveTo(px + tx * L, py + ty * L);
                        ctx.lineTo(px - tx * L, py - ty * L);
                        ctx.lineTo(px - tx * L + side * nx * L, py - ty * L + side * ny * L);
                        ctx.lineTo(px + tx * L + side * nx * L, py + ty * L + side * ny * L);
                        ctx.closePath();
                    };

                    // ---- the sheet itself ----------------------------------------
                    // The page is drawn exactly as it was — full ink, nothing faded —
                    // and only squeezed along the diagonal, as if the sheet were being
                    // drawn away toward the far corner. `S = I + (k-1)·n·nᵀ` scales by
                    // k along the peel direction and leaves the perpendicular alone;
                    // anchoring it at the top-right corner keeps that corner pinned.
                    const qx = w, qy = 0;
                    const a = 1 + (k - 1) * nx * nx;
                    const c = (k - 1) * nx * ny;
                    const b = (k - 1) * nx * ny;
                    const d = 1 + (k - 1) * ny * ny;
                    ctx.save();
                    ctx.transform(a, b, c, d,
                        qx - (a * qx + c * qy),
                        qy - (b * qx + d * qy));
                    ctx.drawImage(p.snap, 0, 0, p.snap.width, p.snap.height, 0, 0, w, h);
                    ctx.restore();

                    // ---- shading -------------------------------------------------
                    // A short darkening just behind the leading edge, so the sheet has
                    // some thickness without washing out what is printed on it.
                    const band = 70;
                    ctx.save();
                    halfPlane(1);
                    ctx.clip();
                    const fold = ctx.createLinearGradient(px + nx * band, py + ny * band, px, py);
                    fold.addColorStop(0, 'rgba(0,0,0,0)');
                    fold.addColorStop(1, 'rgba(0,0,0,0.16)');
                    ctx.fillStyle = fold;
                    ctx.fillRect(0, 0, w, h);
                    ctx.restore();

                    // The shadow the lifted paper throws onto the page underneath.
                    ctx.save();
                    halfPlane(-1);
                    ctx.clip();
                    const cast = ctx.createLinearGradient(px, py, px - nx * 60, py - ny * 60);
                    cast.addColorStop(0, 'rgba(0,0,0,0.20)');
                    cast.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = cast;
                    ctx.fillRect(0, 0, w, h);
                    ctx.restore();

                    // The crease itself.
                    ctx.save();
                    ctx.strokeStyle = 'rgba(0,0,0,0.30)';
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.moveTo(px + tx * L, py + ty * L);
                    ctx.lineTo(px - tx * L, py - ty * L);
                    ctx.stroke();
                    ctx.restore();
                },

                /**
                 * Starts a fresh dungeon on the next page, one level deeper. When a
                 * hole is given, the camera is placed so the room's arrival staircase
                 * falls exactly under it, then eased out to frame the room properly as
                 * the page turns.
                 */
                newPage: function (hole) {
                    const g = this._sd;
                    const depth = (g.current ? g.current.depth : 0) + 1;
                    g.rooms = [];
                    g.taken = {};
                    g.owner = {};

                    const kind = kindForDepth(depth);
                    const shape = shapeFor(kind, g.rand);
                    const start = makeRoom(0, 0, shape[0], shape[1], depth, kind);
                    start.state = 'visited';
                    start.reveal = 0;
                    occupyRect(g.taken, start.x, start.y, start.w, start.h, g.owner, start);
                    g.rooms.push(start);
                    g.current = start;

                    // The foot of the staircase: where the pawn lands, drawn as the
                    // same flight of steps seen from below.
                    const cx = Math.floor((start.w - 1) / 2);
                    const cy = Math.floor((start.h - 1) / 2);
                    start.arrival = { x: start.x + cx, y: start.y + cy };
                    this.buildExits(start);

                    const c = tileCentre(start.arrival.x, start.arrival.y);
                    g.pawn.x = c.x; g.pawn.y = c.y;
                    this.explored++;
                    this.setRoomLabel(start);

                    const frame = this.frameFor(start);
                    if (hole) {
                        // Line the arrival stairs up with the hole in the old page and
                        // hold the camera there: through the turn the pawn must not
                        // shift a pixel — it is standing on the same steps, which are
                        // in the same place on the page underneath. The camera only
                        // eases out to frame the new room once the page has settled.
                        g.cam.z = g.cam.tz = frame.z;
                        g.cam.x = g.cam.tx = c.x - (hole.x - g.view.w / 2) / frame.z;
                        g.cam.y = g.cam.ty = c.y - (hole.y - g.view.h / 2) / frame.z;
                    } else {
                        g.cam.x = g.cam.tx = frame.x;
                        g.cam.y = g.cam.ty = frame.y;
                        g.cam.z = g.cam.tz = frame.z;
                    }
                },

                finishWalk: function () {
                    const g = this._sd;
                    if (g.walk.descend) {
                        g.walk = null;
                        this.descend();
                        return;
                    }
                    const to = g.walk.target;
                    g.walk = null;
                    g.current = to;
                    g.state = 'idle';

                    if (ROOM_KINDS[to.kind].reward && !to.looted) {
                        to.looted = true;
                        this.gems += 1;
                        // The pawn starts empty-handed; the first chest is where it
                        // finally picks something up, and later ones trade up.
                        const first = !g.pawn.weapon;
                        g.pawn.weapon = first
                            ? WEAPONS[0]
                            : WEAPONS[(WEAPONS.indexOf(g.pawn.weapon) + 1) % WEAPONS.length];
                        this.feedback = first
                            ? '⚔️ מצאתם חרב! עכשיו יש לכם נשק'
                            : '💎 מצאתם אוצר! נשק חדש ביד';
                        this.feedbackGood = true;
                        this.puff(roomCentre(to), 'good', 26);
                        this.persist();
                    }

                    this.own(() => {
                        if (!this._destroyed) this.prepareRound();
                    }, this.dur(1.3) * 1000);
                },

                // -------------------------------------------------------- camera

                aimCamera: function () {
                    this.aimCameraFor(this._sd.current);
                },

                aimCameraFor: function (room) {
                    if (!room) return;                    // nothing drawn yet (first resize)
                    if (this.mapMode) return this.aimWholeMap();
                    const f = this.frameFor(room);
                    const g = this._sd;
                    g.cam.tx = f.x; g.cam.ty = f.y; g.cam.tz = f.z;
                },

                /** The camera position and zoom that frames one room. */
                frameFor: function (room) {
                    const g = this._sd;
                    const b = roomBounds(room);
                    const pad = VIEW_PAD * PITCH;
                    const w = b.w + pad * 2;
                    const h = b.h + pad * 2;
                    return {
                        x: b.x - pad + w / 2,
                        y: b.y - pad + h / 2,
                        z: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM,
                            Math.min(g.view.w / w, g.view.h / h))),
                    };
                },

                aimWholeMap: function () {
                    const g = this._sd;
                    if (!g.rooms.length) return;
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    g.rooms.forEach(r => {
                        const b = roomBounds(r);
                        minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
                        maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
                    });
                    const pad = PITCH * 2;
                    this.frame(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
                },

                frame: function (x, y, w, h) {
                    const g = this._sd;
                    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM,
                        Math.min(g.view.w / w, g.view.h / h)));
                    g.cam.tx = x + w / 2;
                    g.cam.ty = y + h / 2;
                    g.cam.tz = zoom;
                },

                snapCamera: function () {
                    const g = this._sd;
                    this.aimCamera();
                    g.cam.x = g.cam.tx; g.cam.y = g.cam.ty; g.cam.z = g.cam.tz;
                },

                toggleMap: function () {
                    this.mapMode = !this.mapMode;
                    if (this.mapMode) this.aimWholeMap(); else this.aimCamera();
                    this.syncHotspots();
                },

                worldToScreen: function (x, y) {
                    const g = this._sd;
                    return {
                        x: (x - g.cam.x) * g.cam.z + g.view.w / 2,
                        y: (y - g.cam.y) * g.cam.z + g.view.h / 2,
                    };
                },

                // ------------------------------------------------------ hotspots

                /**
                 * Projects each open door's sign into screen space for the overlay
                 * buttons. Recomputed once per round (and on resize) rather than per
                 * frame, because the camera is always at rest while input is open.
                 */
                syncHotspots: function () {
                    const g = this._sd;
                    if (g.state !== 'question' || this.locked || !g.current) {
                        this.hotspots = [];
                        return;
                    }
                    this.hotspots = (g.current.choices || [])
                        .filter(d => d.state === 'closed')
                        .map(d => {
                            const box = this.signBox(d);
                            return {
                                id: g.current.x + ':' + g.current.y + ':' + d.dir,
                                index: d.index, plain: d.plain,
                                dirName: { n: 'צפון', e: 'מזרח', s: 'דרום', w: 'מערב' }[d.dir],
                                x: box.x, y: box.y, w: box.w, h: box.h,
                            };
                        });
                },

                /**
                 * Screen-space rectangle of an answer. Answers live in fixed slots
                 * rather than following their door around the map, and are drawn at a
                 * fixed pixel size rather than scaled with the camera, so they stay
                 * put and stay legible however far out the map is zoomed.
                 */
                signBox: function (door) {
                    const g = this._sd;
                    const img = isImageOption(door.label);
                    // Four answers share the width of the page, so cap them narrower.
                    const total = (g.current && g.current.choices && g.current.choices.length) || 3;
                    const maxW = total >= 4 ? 190 : 240;
                    const w = img ? 96 : Math.max(90, Math.min(maxW, this.measure(door.plain) + 40));
                    const h = img ? 96 : 54;
                    const slots = slotsFor(total);
                    const slot = slots[door.index % slots.length];
                    const pad = 10;
                    // The top clamp clears the question heading in the HUD.
                    return {
                        x: Math.max(pad, Math.min(g.view.w - w - pad, slot.x * g.view.w - w / 2)),
                        y: Math.max(122, Math.min(g.view.h - h - 18, slot.y * g.view.h - h / 2)),
                        w: w, h: h,
                    };
                },

                measure: function (text) {
                    const g = this._sd;
                    g.ctx.save();
                    g.ctx.font = SIGN_FONT;
                    const w = g.ctx.measureText(text).width;
                    g.ctx.restore();
                    return w;
                },

                // -------------------------------------------------------- effects

                puff: function (pt, kind, count) {
                    if (this.reduced) return;
                    const g = this._sd;
                    for (let i = 0; i < count && g.fx.length < 90; i++) {
                        const a = Math.random() * Math.PI * 2;
                        const sp = 30 + Math.random() * 90;
                        g.fx.push({
                            x: pt.x, y: pt.y,
                            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                            life: 0.5 + Math.random() * 0.4, age: 0, kind: kind,
                        });
                    }
                },

                shake: function (amount) {
                    if (this.reduced) return;
                    this._sd.shakeAmp = amount;
                },

                playSound: function (ok) {
                    try {
                        const s = ok ? successSound : failureSound;
                        if (s && s.play) { const p = s.play(); if (p && p.catch) p.catch(() => { }); }
                    } catch (e) { /* audio is optional */ }
                },

                // --------------------------------------------------------- render

                resize: function () {
                    const g = this._sd;
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
                    if (this.mapMode) this.aimWholeMap(); else this.aimCamera();
                    this.syncHotspots();
                },

                // Draws one 64px sprite centred on a tile, optionally rotated/scaled.
                blit: function (ctx, img, tx, ty, rot, alpha, scale) {
                    if (!img || alpha <= 0) return;
                    ctx.save();
                    if (alpha != null) ctx.globalAlpha = alpha;
                    ctx.translate(tx * PITCH, ty * PITCH);
                    if (rot) ctx.rotate(rot * Math.PI / 180);
                    if (scale && scale !== 1) ctx.scale(scale, scale);
                    ctx.drawImage(img, -SPRITE / 2, -SPRITE / 2, SPRITE, SPRITE);
                    ctx.restore();
                },

                /**
                 * How much of a given tile is drawn yet, while a room is being inked
                 * in. The wave starts at the door the player walked through, so the
                 * room appears to be sketched out ahead of them.
                 */
                tileReveal: function (room, c, r) {
                    if (room.reveal >= 1) return 1;
                    const oc = room.entry ? room.entry.c : (room.w - 1) / 2;
                    const or = room.entry ? room.entry.r : (room.h - 1) / 2;
                    const maxD = Math.hypot(room.w, room.h);
                    const phase = Math.hypot(c - oc, r - or) / maxD;
                    // A 0.3-wide band sweeping across normalised distance.
                    return Math.max(0, Math.min(1, (room.reveal * 1.35 - phase) / 0.3));
                },

                drawRoom: function (ctx, room) {
                    const g = this._sd;
                    const pal = g.pal;
                    const spec = ROOM_KINDS[room.kind];
                    const ox = room.x;
                    const oy = room.y;
                    const sketch = room.state !== 'visited';
                    const color = sketch ? pal.faint : pal.ink;
                    // A glimpsed room is drawn on the page itself, so its "white"
                    // resolves to the paper and only the pencil lines read.
                    const surface = sketch ? pal.paper : pal.floor;
                    const alpha = sketch ? (room.state === 'sealed' ? 0.3 : 0.42) : 1;

                    if (!sketch) {
                        const floor = this.inked(spec.floor, color, surface);
                        for (let c = 1; c < room.w - 1; c++) {
                            for (let r = 1; r < room.h - 1; r++) {
                                const k = this.tileReveal(room, c, r);
                                // The leading edge of the sweep lands slightly large,
                                // like a stroke being pressed onto the page.
                                this.blit(ctx, floor, ox + c, oy + r, 0, k, 1 + (1 - k) * 0.18);
                            }
                        }
                        // Props below the pawn, each with its own idle sway.
                        room.decor.forEach(p => {
                            const k = this.tileReveal(room, p.c, p.r);
                            if (k <= 0) return;
                            const w = this.reduced ? null : WOBBLE[p.sprite];
                            let scale = 1 + (1 - k) * 0.18;
                            let rot = p.rot;
                            if (w) {
                                const t = g.time * w.hz + p.phase;
                                scale *= 1 + Math.sin(t) * w.s;
                                rot += Math.sin(t * 0.8) * w.r * 180 / Math.PI;
                            }
                            // Floor markings (rails) are part of the floor, not objects
                            // standing on it — draw them light so they read as ruling.
                            const a = p.under ? k * 0.4 : k;
                            this.blit(ctx, this.inked(p.sprite, color, surface),
                                ox + p.c, oy + p.r, rot, a, p.under ? scale * 0.92 : scale);
                        });
                    }

                    const wall = this.inked('floor_wall', color, surface);
                    const corner = this.inked('floor_wall_corner', color, surface);
                    const closed = this.inked('floor_door_closed', color, surface);
                    const opened = this.inked('floor_door_open', color, surface);

                    // Doors are keyed by the tile they sit on, since a wall can now
                    // carry a door anywhere along its length.
                    const doorAt = {};
                    room.doors.forEach(d => { doorAt[tileKey(d.tile.x, d.tile.y)] = d; });
                    if (room.entry) doorAt[tileKey(ox + room.entry.c, oy + room.entry.r)] = 'back';

                    for (let c = 0; c < room.w; c++) {
                        for (let r = 0; r < room.h; r++) {
                            const onTop = r === 0, onBottom = r === room.h - 1;
                            const onLeft = c === 0, onRight = c === room.w - 1;
                            if (!onTop && !onBottom && !onLeft && !onRight) continue;

                            const rev = this.tileReveal(room, c, r);
                            const k = alpha * rev;
                            if (k <= 0) continue;
                            const pop = 1 + (1 - rev) * 0.18;

                            // Corners carry two wall faces in one sprite.
                            if (onTop && onLeft) { this.blit(ctx, corner, ox + c, oy + r, 0, k, pop); continue; }
                            if (onTop && onRight) { this.blit(ctx, corner, ox + c, oy + r, 90, k, pop); continue; }
                            if (onBottom && onRight) { this.blit(ctx, corner, ox + c, oy + r, 180, k, pop); continue; }
                            if (onBottom && onLeft) { this.blit(ctx, corner, ox + c, oy + r, 270, k, pop); continue; }

                            const side = onTop ? 'n' : onBottom ? 's' : onLeft ? 'w' : 'e';
                            const sd = DIRS.find(x => x.key === side);
                            const rot = sd.rot;
                            const door = doorAt[tileKey(ox + c, oy + r)];

                            // Two rooms placed against each other each own a wall along
                            // the shared line, which reads as one wall drawn twice. Let
                            // the room nearer the page origin draw it and the other skip.
                            //
                            // Only ever yield to a room that is fully drawn: a room that
                            // has merely been glimpsed draws its walls faint, so handing
                            // the line to it would leave a hole in a solid wall.
                            if (!door && room.state === 'visited') {
                                const neighbour = g.owner[tileKey(ox + c + sd.dx, oy + r + sd.dy)];
                                if (neighbour && neighbour !== room
                                    && neighbour.state === 'visited'
                                    && yieldsWall(room, neighbour)) continue;
                            }

                            if (door === 'back') {
                                this.blit(ctx, opened, ox + c, oy + r, rot, k, pop);
                            } else if (door && door.state === 'open') {
                                // `swing` runs 0→1 as a door is pushed open, so the
                                // closed leaf cross-fades into the open one.
                                const sw = door.swing == null ? 1 : door.swing;
                                if (sw < 1) this.blit(ctx, closed, ox + c, oy + r, rot, k * (1 - sw), pop);
                                this.blit(ctx, opened, ox + c, oy + r, rot, k * sw, pop);
                            } else if (door) {
                                this.blit(ctx, closed, ox + c, oy + r, rot, k, pop);
                                if (door.state === 'sealed') {
                                    this.scrawlCross(ctx, ox + c, oy + r, pal.bad, 0.85 * k, 0.42, door.sealT);
                                }
                            } else {
                                this.blit(ctx, wall, ox + c, oy + r, rot, k, pop);
                            }
                        }
                    }

                    // A stairwell stands in the room itself — ordinary rooms can have
                    // one just as challenge rooms can, so it is drawn here for both.
                    const stairs = room.stairs || (room.exit && room.exit.stairs ? room.exit.tile : null);
                    if (!sketch && stairs) {
                        const k = this.tileReveal(room, stairs.x - ox, stairs.y - oy);
                        this.blit(ctx, this.inked('stairs_down', color, surface),
                            stairs.x, stairs.y, 0, k, 1.05);
                    }
                    // The foot of the flight just descended — the same steps, seen from
                    // the page below, in the same place on screen.
                    if (!sketch && room.arrival) {
                        this.blit(ctx, this.inked('stairs_down', color, surface),
                            room.arrival.x, room.arrival.y, 180, 1, 1.05);
                    }

                    if (!sketch && room.challenge) this.drawChallenge(ctx, room, color, pal, surface);

                    if (room.state === 'sealed') {
                        this.scrawlCross(ctx, ox + (room.w - 1) / 2, oy + (room.h - 1) / 2,
                            pal.bad, 0.5, Math.min(room.w, room.h) * 0.4,
                            room.sealT == null ? 1 : room.sealT);
                    }
                },

                /**
                 * The apparatus of a challenge room: targets, weapon racks, chasms and
                 * loose stones. Drawn above the floor and below the pawn.
                 */
                drawChallenge: function (ctx, room, color, pal, surface) {
                    const g = this._sd;
                    const ox = room.x, oy = room.y;
                    const rev = room.reveal;

                    // The chasm the bridge has to cross, and the planks as they land.
                    if (room.challenge === 'bridge' && room.chasm != null) {
                        ctx.save();
                        ctx.globalAlpha = 0.16 * rev;
                        ctx.fillStyle = pal.ink;
                        ctx.fillRect((ox + 1) * PITCH - PITCH / 2, (oy + room.chasm) * PITCH - PITCH / 2,
                            (room.w - 2) * PITCH, PITCH);
                        ctx.restore();
                        // Ragged edges, so it reads as broken floor rather than a bar.
                        ctx.save();
                        ctx.globalAlpha = 0.55 * rev;
                        ctx.strokeStyle = pal.ink;
                        ctx.lineWidth = 2;
                        for (let e = 0; e < 2; e++) {
                            const y = (oy + room.chasm) * PITCH + (e ? 1 : -1) * PITCH / 2;
                            ctx.beginPath();
                            for (let c = 1; c < room.w - 1; c++) {
                                const x = (ox + c) * PITCH;
                                const j = Math.sin(c * 2.3 + e * 1.7) * 5;
                                if (c === 1) ctx.moveTo(x - PITCH / 2, y + j); else ctx.lineTo(x, y + j);
                            }
                            ctx.stroke();
                        }
                        ctx.restore();

                        const planks = this.inked('bridge', color, surface);
                        const span = room.w - 2;
                        for (let i = 0; i < span; i++) {
                            const k = clamp01(room.bridgeT * span - i);
                            if (k <= 0) continue;
                            this.blit(ctx, planks, ox + 1 + i, oy + room.chasm, 0, k, 0.9 + k * 0.1);
                        }
                    }

                    // The rack the correct weapon has to end up on.
                    if (room.challenge === 'armoury' && room.rack) {
                        this.blit(ctx, this.inked('table', color, surface),
                            ox + room.rack.c, oy + room.rack.r, 0, 0.75 * rev, 1);
                    }

                    (room.choices || []).forEach(choice => {
                        const m = choice.mark;
                        if (!m || choice.gone >= 1) return;
                        const solved = choice.state === 'solved';
                        const wob = this.reduced ? 0 : Math.sin(g.time * 1.6 + m.phase) * 0.22;
                        const shake = choice.shake > 0
                            ? Math.sin(g.time * 40) * choice.shake * 0.28 : 0;

                        let c = ox + m.c, r = oy + m.r, rot = 0, scale = choice.grow, alpha = rev;

                        if (room.challenge === 'range') {
                            // Targets drift a little on their stands.
                            c += wob * 0.35 + shake;
                            if (solved) { rot = 70 * choice.slide; alpha = rev * (1 - choice.slide * 0.75); }
                        } else if (room.challenge === 'armoury') {
                            // The chosen weapon travels to the rack; a wrong one is
                            // shoved and springs back home.
                            const home = m.home;
                            if (solved && room.rack) {
                                c = ox + home.c + (room.rack.c - home.c) * choice.slide;
                                r = oy + home.r + (room.rack.r - home.r) * choice.slide;
                                rot = -90 * choice.slide;
                            } else {
                                c += shake;
                            }
                        } else if (room.challenge === 'bridge') {
                            c += shake;
                            if (solved) scale *= 1 - 0.25 * choice.slide;
                        } else {
                            // secret: the stone slides into the wall it belongs to.
                            const d = m.wall === 'w' ? -1 : m.wall === 'e' ? 1 : 0;
                            const dy = m.wall === 'n' ? -1 : 0;
                            const push = solved ? choice.slide : choice.shake * 0.18;
                            c += d * push;
                            r += dy * push;
                        }

                        this.blit(ctx, this.inked(m.sprite, color, surface), c, r, rot, alpha, scale);

                        // Bullseye rings, drawn on rather than sprited — the pack has
                        // no target, and pencil rings suit the page anyway.
                        if (m.rings && alpha > 0) {
                            ctx.save();
                            ctx.translate(c * PITCH, r * PITCH);
                            ctx.rotate(rot * Math.PI / 180);
                            ctx.scale(scale, scale);
                            ctx.globalAlpha = alpha;
                            ctx.strokeStyle = pal.bad;
                            ctx.lineWidth = 2.4;
                            [0.30, 0.17].forEach(f => {
                                ctx.beginPath();
                                ctx.arc(0, 0, PITCH * f, 0, Math.PI * 2);
                                ctx.stroke();
                            });
                            ctx.fillStyle = pal.bad;
                            ctx.beginPath();
                            ctx.arc(0, 0, PITCH * 0.06, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                    });
                },

                /**
                 * A hand-drawn X, used for sealed doors and abandoned rooms. `progress`
                 * runs 0→1 so the two strokes are scrawled on one after the other
                 * rather than appearing all at once.
                 */
                scrawlCross: function (ctx, cx, cy, color, alpha, sizeTiles, progress) {
                    const p = progress == null ? 1 : progress;
                    if (p <= 0 || alpha <= 0) return;
                    const s = (sizeTiles || 0.42) * PITCH;
                    const x = cx * PITCH, y = cy * PITCH;
                    const a = Math.max(0, Math.min(1, p * 2));          // first stroke
                    const b = Math.max(0, Math.min(1, (p - 0.5) * 2));  // second stroke
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = Math.max(3, s * 0.09);
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(x - s, y - s);
                    ctx.lineTo(x - s + 2 * s * a, y - s + 2 * s * a);
                    if (b > 0) {
                        ctx.moveTo(x + s, y - s);
                        ctx.lineTo(x + s - 2 * s * b, y - s + 2 * s * b);
                    }
                    ctx.stroke();
                    ctx.restore();
                },

                // Corridor cells between a room and the room behind an opened door.
                drawCorridor: function (ctx, door, color, surface, alpha) {
                    const d = DIRS.find(x => x.key === door.dir);
                    const floor = this.inked('tiles', color, surface);
                    // Wall-only strips, so the second side does not paint over the first.
                    const wall = this.wallOnly(color, surface);
                    const horizontal = d.dx !== 0;
                    door.corridor.forEach(c => {
                        this.blit(ctx, floor, c.x, c.y, 0, alpha, 1);
                        // A one-tile-wide corridor carries both of its walls on the
                        // same tile, one on each side of the passage.
                        this.blit(ctx, wall, c.x, c.y, horizontal ? 0 : 270, alpha, 1);
                        this.blit(ctx, wall, c.x, c.y, horizontal ? 180 : 90, alpha, 1);
                    });
                },

                drawPawn: function (ctx) {
                    const g = this._sd;
                    if (g.hidePawn) return;      // the page snapshot is taken without it
                    const p = g.pawn;
                    const body = this.raw(p.color + '_character');
                    const hand = this.raw(p.color + '_hand');
                    // No weapon until one is found; the pawn simply walks empty-handed.
                    const weapon = p.weapon ? this.inked(p.weapon, g.pal.ink, g.pal.prop) : null;
                    const walking = !!g.walk;
                    const still = this.reduced;

                    // Walking: a two-beat stride with the hands swinging out of phase.
                    // Standing: a slow breath so the token never looks frozen.
                    const stride = still ? 0 : Math.sin(g.time * 9);
                    const breath = still ? 0 : Math.sin(g.time * 1.8);
                    const bob = walking ? stride * 3.4 : breath * 1.6;
                    const roll = walking ? stride * 0.07 : breath * 0.02;
                    const swing = walking ? stride * PITCH * 0.16 : breath * PITCH * 0.02;

                    ctx.save();
                    ctx.translate(p.x, p.y + bob);

                    // Soft shadow so the pawn lifts off the map.
                    ctx.save();
                    ctx.globalAlpha = 0.16;
                    ctx.fillStyle = g.pal.ink;
                    ctx.beginPath();
                    ctx.ellipse(0, PITCH * 0.34, PITCH * 0.34, PITCH * 0.14, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    ctx.rotate(p.facing + roll);
                    ctx.scale(1.3, 1.3);       // the pawn reads as a token, not a tile
                    if (body) ctx.drawImage(body, -SPRITE / 2, -SPRITE / 2, SPRITE, SPRITE);
                    // Hands sit either side of the body, weapon held between them.
                    if (hand) {
                        ctx.drawImage(hand, -PITCH * 0.5 - SPRITE * 0.16, -PITCH * 0.3 + swing,
                            SPRITE * 0.32, SPRITE * 0.32);
                        ctx.drawImage(hand, PITCH * 0.5 - SPRITE * 0.16, -PITCH * 0.3 - swing,
                            SPRITE * 0.32, SPRITE * 0.32);
                    }
                    if (weapon) {
                        // Held in the right hand, not tucked against the chest: the
                        // grip sits on that hand's disc and the blade runs out and
                        // away from the body, swinging with the same arm.
                        const handX = PITCH * 0.5;
                        const handY = -PITCH * 0.3 + SPRITE * 0.16 - swing;
                        const size = SPRITE * 0.72;
                        ctx.save();
                        ctx.translate(handX, handY);
                        ctx.rotate(0.42 + (walking ? stride * 0.22 : breath * 0.06));
                        // The art points up with the hilt at the bottom, so anchor the
                        // sprite's bottom edge on the hand.
                        ctx.drawImage(weapon, -size / 2, -size * 0.86, size, size);
                        ctx.restore();
                    }
                    ctx.restore();
                },

                drawSigns: function (ctx) {
                    const g = this._sd;
                    if (g.state !== 'question' || !g.current) return;
                    const pal = g.pal;
                    (g.current.choices || []).forEach(door => {
                        // A rejected mechanism springs back and can be tried again, so
                        // its answer stays written on the page while it does.
                        if (door.state !== 'closed' && door.state !== 'rejected') return;
                        const box = this.signBox(door);

                        // Two beats, in order: first the answers get written down, one
                        // after another; only then does the pencil draw an arrow from
                        // each of them across to the door it opens.
                        const tText = clamp01((g.signIn - door.index * 0.09) / 0.36);
                        if (tText <= 0) return;
                        const ease = 1 - Math.pow(1 - tText, 3);
                        const scale = 0.72 + ease * 0.28;

                        const tArrow = clamp01((g.signIn - 0.46 - door.index * 0.13) / 0.4);

                        const anchor = tileCentre(door.tile.x, door.tile.y);
                        const a = this.worldToScreen(anchor.x, anchor.y);
                        const bx = box.x + box.w / 2;
                        const by = box.y + box.h / 2;
                        if (tArrow > 0) {
                            // Ease-out: the stroke sets off quickly and slows as it
                            // lands, the way a hand finishes a line.
                            const drawn = 1 - Math.pow(1 - tArrow, 2.2);
                            this.drawArrow(ctx, bx, by, a.x, a.y,
                                box.w * 0.58, box.h * 0.7, pal.ink, 0.72, drawn, door.index);
                        }

                        ctx.save();
                        ctx.globalAlpha = ease;
                        ctx.translate(bx, by);
                        ctx.scale(scale, scale);

                        // No plaque: the answer is written onto the page. Just enough
                        // of a paper wash to keep it legible over whatever was drawn
                        // underneath, then the word itself, then a scribbled ring
                        // around it — the way you circle an answer in an exercise book.
                        ctx.save();
                        ctx.globalAlpha = ease * 0.72;
                        ctx.fillStyle = pal.paper;
                        ctx.beginPath();
                        ctx.ellipse(0, 0, box.w * 0.52, box.h * 0.62, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();

                        if (isImageOption(door.label)) {
                            const img = this.optionImage(door.plain);
                            if (img && img.complete && img.naturalWidth) {
                                const bw = box.w - 22, bh = box.h - 22;
                                const sc = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
                                const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
                                ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
                            }
                        } else {
                            ctx.fillStyle = pal.ink;
                            ctx.font = SIGN_FONT;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(door.plain, 0, 1);
                        }

                        // The scribbled ring: two passes, each slightly off, so it
                        // reads as pencil rather than a vector shape.
                        this.scribbleRing(ctx, box.w * 0.55, box.h * 0.66, pal.ink,
                            0.85 * ease, door.index, ease);

                        // Handwritten keyboard hint, tucked at the top-left of the word.
                        ctx.globalAlpha = 0.55 * ease;
                        ctx.fillStyle = pal.ink;
                        ctx.font = 'bold 14px ' + HAND_FONT;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(String(door.index + 1) + '.', -box.w * 0.5 - 8, -box.h * 0.32);
                        ctx.restore();
                    });
                },

                /**
                 * A pencil arrow from an answer to its door. The shaft bows slightly
                 * and the head is two quick strokes, so it reads as drawn rather than
                 * plotted. `draw` 0..1 animates it being pulled toward the door;
                 * `rx`/`ry` are the radii of the ring it starts from, so the shaft
                 * begins outside the circled word instead of inside it.
                 */
                drawArrow: function (ctx, fromX, fromY, toX, toY, rx, ry, color, alpha, draw, seed) {
                    if (alpha <= 0 || draw <= 0) return;
                    let dx = toX - fromX, dy = toY - fromY;
                    const len = Math.hypot(dx, dy);
                    if (len < 24) return;                 // too close to be worth an arrow
                    dx /= len; dy /= len;

                    // Start on the ring's edge, stop short of the door itself.
                    const startScale = 1 / Math.max(1e-3, Math.hypot(dx / rx, dy / ry));
                    const sx = fromX + dx * (startScale + 6);
                    const sy = fromY + dy * (startScale + 6);
                    const ex = toX - dx * 16;
                    const ey = toY - dy * 16;

                    // Bow the shaft to one side; the sign of the bow varies per answer.
                    const bow = (seed % 2 ? 1 : -1) * Math.min(46, len * 0.14);
                    const mx = (sx + ex) / 2 - dy * bow;
                    const my = (sy + ey) / 2 + dx * bow;

                    // Point on the bowed shaft at t, nudged off-line by a small
                    // deterministic wobble so the stroke is never mechanically smooth.
                    const at = (t) => {
                        const it = 1 - t;
                        const x = it * it * sx + 2 * it * t * mx + t * t * ex;
                        const y = it * it * sy + 2 * it * t * my + t * t * ey;
                        const wob = Math.sin(t * 8.4 + seed * 2.7) * 1.5
                            + Math.sin(t * 19.3 + seed) * 0.6;
                        return { x: x - dy * wob, y: y + dx * wob };
                    };

                    ctx.save();
                    ctx.strokeStyle = color;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    const steps = 30;
                    const stop = Math.max(1, Math.round(steps * draw));
                    let tip = at(stop / steps);

                    // Two passes: a faint ghost stroke under a firmer one, which is
                    // what a pencil line actually looks like up close.
                    for (let pass = 0; pass < 2; pass++) {
                        ctx.globalAlpha = alpha * (pass ? 1 : 0.35);
                        ctx.lineWidth = pass ? 2.0 : 3.2;
                        ctx.beginPath();
                        const head = at(0);
                        ctx.moveTo(head.x + pass * 0.6, head.y - pass * 0.6);
                        for (let i = 1; i <= stop; i++) {
                            const p = at(i / steps);
                            ctx.lineTo(p.x + pass * 0.6, p.y - pass * 0.6);
                        }
                        ctx.stroke();
                    }

                    // Head, drawn last and only once the shaft has essentially landed.
                    if (draw > 0.8) {
                        const back = at(Math.max(0, (stop - 2) / steps));
                        const hx = tip.x - back.x, hy = tip.y - back.y;
                        const hl = Math.hypot(hx, hy) || 1;
                        const ux = hx / hl, uy = hy / hl;
                        const grow = Math.min(1, (draw - 0.8) / 0.2);
                        const size = 12 * grow;
                        ctx.globalAlpha = alpha;
                        ctx.lineWidth = 2.0;
                        ctx.beginPath();
                        ctx.moveTo(tip.x, tip.y);
                        ctx.lineTo(tip.x - ux * size - uy * size * 0.55, tip.y - uy * size + ux * size * 0.55);
                        ctx.moveTo(tip.x, tip.y);
                        ctx.lineTo(tip.x - ux * size + uy * size * 0.55, tip.y - uy * size - ux * size * 0.55);
                        ctx.stroke();
                    }
                    ctx.restore();
                },

                /**
                 * A pencil ring drawn round an answer. Two overlapping passes with a
                 * deterministic wobble (seeded by the door index, so it does not
                 * shimmer between frames) and a slight overshoot, like a ring drawn
                 * in one quick motion. `draw` 0..1 animates it being scribbled on.
                 */
                scribbleRing: function (ctx, rx, ry, color, alpha, seed, draw) {
                    if (alpha <= 0 || draw <= 0) return;
                    ctx.save();
                    ctx.globalAlpha = alpha;
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
                        ctx.ellipse(Math.sin(s) * 1.5, Math.cos(s) * 1.5,
                            rx * jx, ry * jy, tilt,
                            from, from + Math.PI * 2 * (0.92 + pass * 0.12) * draw);
                        ctx.stroke();
                    }
                    ctx.restore();
                },

                optionImage: function (src) {
                    const g = this._sd;
                    if (!g.optImages[src]) {
                        const img = new Image();
                        img.src = src;
                        g.optImages[src] = img;
                    }
                    return g.optImages[src];
                },

                render: function () {
                    const g = this._sd;
                    const ctx = g.ctx;
                    const pal = g.pal;

                    ctx.save();
                    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
                    ctx.clearRect(0, 0, g.view.w, g.view.h);

                    // Paper.
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

                    // Corridors go under the rooms so the wall rings close over them.
                    g.rooms.forEach(room => {
                        if (room.state !== 'visited') return;
                        room.doors.forEach(d => {
                            if (d.state === 'open') this.drawCorridor(ctx, d, pal.ink, pal.floor, 1);
                        });
                    });
                    g.rooms.filter(r => r.state !== 'visited').forEach(r => this.drawRoom(ctx, r));
                    g.rooms.filter(r => r.state === 'visited').forEach(r => this.drawRoom(ctx, r));

                    this.drawPawn(ctx);
                    this.drawShots(ctx);
                    this.drawFx(ctx);
                    ctx.restore();

                    // Screen-space overlays.
                    ctx.save();
                    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
                    this.drawSigns(ctx);
                    // The leaf being turned sits over everything, including the answers.
                    this.drawPageTurn(ctx);
                    ctx.restore();
                },

                /**
                 * The graph-paper ruling. It has to line up with the squares printed
                 * on the floor tiles themselves: a tile is drawn centred on its grid
                 * point, so cell edges fall on half-pitch offsets, and Kenney's floor
                 * art subdivides each tile into four — hence the half-pitch step.
                 */
                drawPaperGrid: function (ctx) {
                    const g = this._sd;
                    const step = GRID_STEP * g.cam.z;
                    if (step < 4) return;
                    ctx.save();
                    ctx.lineWidth = 1;
                    // World 0 is a tile centre, which is itself a lattice line, so the
                    // ruling needs no extra offset: every multiple of GRID_STEP falls on
                    // a square edge of the floor art.
                    const originX = g.view.w / 2 - g.cam.x * g.cam.z;
                    const originY = g.view.h / 2 - g.cam.y * g.cam.z;
                    // Index of the first ruling on screen, so every fifth line can be
                    // drawn heavier the way squared paper is printed.
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

                    // The ruled margin of an exercise book, fixed to the page rather
                    // than to the map.
                    ctx.strokeStyle = g.pal.margin || g.pal.grid;
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.moveTo(46.5, 0);
                    ctx.lineTo(46.5, g.view.h);
                    ctx.stroke();
                    ctx.restore();
                },

                // Slow specks drifting over the page, so the scene is never fully static.
                drawMotes: function (ctx) {
                    const g = this._sd;
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

                // Arrows crossing the shooting range, drawn as a pencil shaft.
                drawShots: function (ctx) {
                    const g = this._sd;
                    if (!g.shots.length) return;
                    ctx.save();
                    ctx.strokeStyle = g.pal.ink;
                    ctx.lineWidth = 2.4;
                    ctx.lineCap = 'round';
                    g.shots.forEach(s => {
                        let dx = s.toX - s.fromX, dy = s.toY - s.fromY;
                        const l = Math.hypot(dx, dy) || 1;
                        dx /= l; dy /= l;
                        const tail = 26;
                        ctx.beginPath();
                        ctx.moveTo(s.x - dx * tail, s.y - dy * tail);
                        ctx.lineTo(s.x, s.y);
                        // Fletching.
                        ctx.moveTo(s.x - dx * tail, s.y - dy * tail);
                        ctx.lineTo(s.x - dx * tail + dy * 6, s.y - dy * tail - dx * 6);
                        ctx.moveTo(s.x - dx * tail, s.y - dy * tail);
                        ctx.lineTo(s.x - dx * tail - dy * 6, s.y - dy * tail + dx * 6);
                        ctx.stroke();
                    });
                    ctx.restore();
                },

                drawFx: function (ctx) {
                    const g = this._sd;
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
                    const g = this._sd;
                    g.time += dt;

                    // Camera easing. `1 - pow` keeps the approach frame-rate independent;
                    // the base is high so the map drifts under the viewport rather than
                    // snapping to each new room.
                    const k = this.reduced ? 1 : 1 - Math.pow(0.45, dt * this.pace);
                    g.cam.x += (g.cam.tx - g.cam.x) * k;
                    g.cam.y += (g.cam.ty - g.cam.y) * k;
                    g.cam.z += (g.cam.tz - g.cam.z) * k;

                    if (g.shakeAmp) g.shakeAmp = Math.max(0, g.shakeAmp - dt * 40);
                    // The whole answers-then-arrows sequence runs over this, so it is
                    // the single biggest lever on how hurried the game feels.
                    if (g.state === 'question') g.signIn = Math.min(1, g.signIn + dt * this.rate(0.45));
                    /**
                     * Watchdog. Every transition here is driven by a timer that can be
                     * invalidated (route change, stage completion, a queued callback
                     * whose round token moved on). If one is ever dropped the scene
                     * would sit forever with nothing to click, so a long quiet spell
                     * with nothing animating resumes the round instead of hanging.
                     */
                    if (g.state !== 'question' && !g.walk && !g.page) {
                        g.idleFor = (g.idleFor || 0) + dt;
                        if (g.idleFor > 7) {
                            g.idleFor = 0;
                            if (!this._destroyed) this.prepareRound();
                        }
                    } else {
                        g.idleFor = 0;
                    }

                    // Open the doors to input only once every answer is written down.
                    if (g.awaitInput && g.state === 'question' && g.signIn >= 0.45) {
                        g.awaitInput = false;
                        this.locked = false;
                        // The speed bonus is measured from when answering became
                        // possible, not from when the round was set up.
                        g.roundStart = performance.now();
                        this.syncHotspots();
                    }

                    // Rooms ink themselves in; doors swing; sealing X's get scrawled.
                    const revRate = this.rate(0.36);
                    g.rooms.forEach(room => {
                        if (room.state === 'visited' && room.reveal < 1) {
                            room.reveal = Math.min(1, room.reveal + dt * revRate);
                        }
                        if (room.state === 'sealed' && room.sealT != null && room.sealT < 1) {
                            room.sealT = Math.min(1, room.sealT + dt * this.rate(0.7));
                        }
                        room.doors.forEach(d => {
                            if (d.state === 'open' && d.swing < 1) {
                                d.swing = Math.min(1, d.swing + dt * this.rate(1.0));
                            }
                            if (d.state === 'sealed' && d.sealT < 1) {
                                d.sealT = Math.min(1, d.sealT + dt * this.rate(0.8));
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

                        // Camera and room-drawing ride the walk, so the whole move
                        // between rooms takes exactly as long as the pawn does.
                        if (!this.mapMode && g.walk.fromFrame) {
                            const a = g.walk.fromFrame, b = g.walk.toFrame;
                            g.cam.tx = a.x + (b.x - a.x) * e;
                            g.cam.ty = a.y + (b.y - a.y) * e;
                            g.cam.tz = a.z + (b.z - a.z) * e;
                        }
                        if (g.walk.target) {
                            g.walk.target.reveal = Math.max(g.walk.target.reveal,
                                Math.min(1, u * 1.15));
                        }
                        const target = g.walk.facing;
                        let diff = ((target - g.pawn.facing + Math.PI) % (Math.PI * 2)) - Math.PI;
                        g.pawn.facing += diff * Math.min(1, dt * 6);
                        if (u >= 1) this.finishWalk();
                    }

                    // Turning to the next page: the old sheet slides off, the new one
                    // slides in, and the dungeon is swapped while nothing is visible.
                    if (g.page) {
                        g.page.t += dt;
                        if (g.page.t >= g.page.dur) {
                            g.page = null;
                            g.state = 'idle';
                            this.aimCamera();     // only now drift out to frame the room
                            this.own(() => {
                                if (!this._destroyed) this.prepareRound();
                            }, this.dur(0.4) * 1000);
                        }
                    }

                    // Challenge apparatus: springs, slides and the bridge going in.
                    const room = g.current;
                    if (room && room.challenge) {
                        if (room.solvedT != null) room.solvedT = Math.min(1, room.solvedT + dt * 1.2);
                        (room.choices || []).forEach(ch => {
                            if (ch.shake > 0) ch.shake = Math.max(0, ch.shake - dt * this.rate(1.6));
                            const wantSlide = ch.state === 'solved' ? 1 : 0;
                            ch.slide += (wantSlide - ch.slide) * Math.min(1, dt * this.rate(1.6));
                            if (ch.state === 'solved' && room.challenge === 'range') {
                                ch.gone = Math.min(1, ch.gone + dt * this.rate(0.35));
                            }
                        });
                        if (room.challenge === 'bridge') {
                            const solved = (room.choices || []).some(c => c.state === 'solved');
                            if (solved) room.bridgeT = Math.min(1, room.bridgeT + dt * this.rate(0.55));
                        }
                    }

                    // Arrows in flight on the shooting range.
                    for (let i = g.shots.length - 1; i >= 0; i--) {
                        const s = g.shots[i];
                        s.t += dt;
                        const u = Math.min(1, s.t / s.dur);
                        s.x = s.fromX + (s.toX - s.fromX) * u;
                        s.y = s.fromY + (s.toY - s.fromY) * u;
                        if (u >= 1) {
                            this.puff({ x: s.toX, y: s.toY }, s.miss ? 'bad' : 'good', 8);
                            g.shots.splice(i, 1);
                        }
                    }

                    for (let i = g.fx.length - 1; i >= 0; i--) {
                        const f = g.fx[i];
                        f.age += dt;
                        f.x += f.vx * dt;
                        f.y += f.vy * dt;
                        f.vy += 40 * dt;
                        if (f.age >= f.life) g.fx.splice(i, 1);
                    }

                    g.motes.forEach(m => {
                        m.x += m.vx * dt;
                        m.y += m.vy * dt;
                        if (m.x < -0.05) m.x = 1.05; else if (m.x > 1.05) m.x = -0.05;
                        if (m.y < -0.05) m.y = 1.05; else if (m.y > 1.05) m.y = -0.05;
                    });
                },

                loop: function (now) {
                    const g = this._sd;
                    if (this._destroyed || !g) return;
                    const dt = Math.min(0.05, (now - g.last) / 1000 || 0);
                    g.last = now;
                    this.step(dt);
                    this.render();
                    g.raf = requestAnimationFrame(this.loop);
                },

                // ------------------------------------------------------- controls

                // Rate in units-per-second, and duration in seconds, both scaled by the
                // chosen pace. Reduced-motion collapses everything to near-instant.
                rate: function (perSecond) {
                    return this.reduced ? 20 : perSecond * this.pace;
                },

                dur: function (seconds) {
                    return this.reduced ? Math.min(0.2, seconds) : seconds / this.pace;
                },

                cyclePace: function () {
                    this.paceIndex = (this.paceIndex + 1) % PACES.length;
                    this.pace = PACES[this.paceIndex].factor;
                    this.paceIcon = PACES[this.paceIndex].icon;
                    this.paceName = PACES[this.paceIndex].name;
                    setLocalStorage('scribble_dungeon_pace', PACES[this.paceIndex].key);
                },

                cyclePawn: function () {
                    const g = this._sd;
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

                /**
                 * What a reload keeps, and what it throws away.
                 *
                 * Kept: everything the player has earned — the coin score (held by the
                 * engine, which also fills the progress bar) and the gems, plus the
                 * chosen token and pace.
                 *
                 * Thrown away: the run itself. The map, the depth, the rooms explored
                 * and the weapon in hand all start over, so a refresh puts you at the
                 * mouth of a fresh dungeon rather than half way through an old one.
                 */
                persist: function () {
                    const g = this._sd;
                    setLocalStorage('scribble_dungeon_pawn', {
                        color: g.pawn.color, gems: this.gems,
                    });
                },

                restore: function () {
                    const saved = getLocalStorage('scribble_dungeon_pawn', null);
                    const g = this._sd;
                    if (!saved || typeof saved !== 'object') return;
                    if (PAWNS.some(p => p.key === saved.color)) g.pawn.color = saved.color;
                    if (typeof saved.gems === 'number') this.gems = saved.gems;
                },

                // Timeout owned by this instance and invalidated on destroy or on a
                // new round, so a queued transition can never fire into a dead scene.
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
                    ? getLocalStorage('scribble_dungeon_pace', 'normal') : 'normal';
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

                this._sd = {
                    canvas: canvas,
                    ctx: canvas.getContext('2d'),
                    dpr: 1,
                    sprites: {},
                    inkCache: {},
                    optImages: {},
                    pal: resolveScribbleTheme(this.themeKey),
                    view: { w: 800, h: 600 },
                    cam: { x: 0, y: 0, z: 0.6, tx: 0, ty: 0, tz: 0.6 },
                    pawn: { x: 0, y: 0, facing: 0, color: 'red', weapon: null },
                    rooms: [],
                    taken: {},
                    owner: {},
                    rand: mulberry(1),
                    current: null,
                    walk: null,
                    fx: [],
                    shots: [],
                    roundStart: 0,
                    awaitInput: false,
                    idleFor: 0,
                    page: null,
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
                    this._sd.last = performance.now();
                    this._sd.raf = requestAnimationFrame(this.loop);
                });
            },

            beforeDestroy: function () {
                this._destroyed = true;
                this.roundToken++;
                this._timers.forEach(clearTimeout);
                this._timers.clear();
                global.removeEventListener('resize', this._onResize);
                global.removeEventListener('keydown', this.onKeydown);
                if (this._sd && this._sd.raf) cancelAnimationFrame(this._sd.raf);
                if (this._sd) {
                    this._sd.raf = null;
                    this._sd.fx = [];
                    this._sd.motes = [];
                    this._sd.rooms = [];
                    this._sd.taken = {};
                    this._sd.owner = {};
                    this._sd.inkCache = {};
                    this._sd.sprites = {};
                }
            },
        }));
    }

    // ------------------------------------------------------- path & easing math

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

    global.SCRIBBLE_DUNGEON_CONFIG = {
        kinds: ROOM_KINDS,
        cycle: KIND_CYCLE,
        sprites: SPRITES,
        weapons: WEAPONS,
        pawns: PAWNS,
        wobble: WOBBLE,
        corridorLengths: CORRIDOR_LENGTHS,
        challenges: CHALLENGES,
        armouryWeapons: ARMOURY_WEAPONS,
        signSlots: SIGN_SLOTS,
        slotsFor: slotsFor,
        tile: { pitch: PITCH, sprite: SPRITE },
        dirs: DIRS,
    };
    global.validateScribbleDungeonConfig = validateScribbleDungeonConfig;
    global.resolveScribbleTheme = resolveScribbleTheme;
    global.scribbleDungeonRoomCentre = roomCentre;
    global.scribbleDungeonRoomBounds = roomBounds;
    global.scribbleDungeonTileCentre = tileCentre;
    global.scribbleDungeonMakeRoom = makeRoom;
    global.scribbleDungeonPlaceNeighbour = placeNeighbour;
    global.scribbleDungeonOccupyRect = occupyRect;
    global.scribbleDungeonRectFree = rectFree;
    global.scribbleDungeonTileKey = tileKey;
    global.scribbleDungeonKindForDepth = kindForDepth;
    global.scribbleDungeonBuildRunPlan = buildRunPlan;
    global.scribbleDungeonRoomSeed = roomSeed;
    global.scribbleDungeonSamplePath = samplePath;
    global.scribbleDungeonMulberry = mulberry;
    global.createScribbleDungeonComponent = createScribbleDungeonComponent;
})(typeof window !== 'undefined' ? window : globalThis);
