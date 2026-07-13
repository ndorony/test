// Factory Tycoon — a living idle-factory scene.
//
// Architecture:
//  - Pure helpers (validation, derived state, theme resolution) stay framework-free
//    so tests/factory_tycoon_test.js can exercise them in a bare VM.
//  - The scene itself is rendered with Phaser (already loaded globally by index.html):
//    a two-story production line where logs are sawn into planks, pressed into toys,
//    packed into boxes, and carried by workers onto a delivery truck.
//  - The Vue component owns the HUD (RTL Hebrew UI), the machine bottom-sheet and the
//    upgrade-confirmation dialog; upgrades still flow through confirmUpgrade() so the
//    educational question engine can replace UpgradeApprovalService later.
(function (global) {
    'use strict';

    var FT_DEFAULT_MACHINES = {sawmill: 1, workshop: 1, packaging: 1, conveyor1: 1, conveyor2: 1, worker1: 1, worker2: 1, worker3: 0, storage: 1, sign: 1};
    var FT_KNOWN_MACHINES = Object.keys(FT_DEFAULT_MACHINES);
    var FT_KINDS = ['upgrade', 'build', 'hire', 'decorate'];
    var FT_BASE_VALUE = 8;
    var FT_BASE_CYCLE = 2300;
    var FT_ASSET_BASE = 'assets/factory/';

    // World layout. All coordinates are world pixels, LTR regardless of UI language.
    var W = {width: 1180, height: 1560};
    var L = {
        platformY: 640,          // upper floor line (machines stand here)
        platformH: 62,
        groundY: 1330,           // ground floor line
        pile: {x: 128, y: 640},
        saw: {x: 336, y: 640},
        sawIntake: {x: 262, y: 424},
        sawOut: {x: 452, y: 476},
        beltA: {x1: 476, x2: 762, y: 486},
        press: {x: 858, y: 640},
        pressAnvil: {x: 858, y: 556},
        pressOut: {x: 946, y: 556},
        chuteTop: {x: 954, y: 640},
        chuteEnd: {x: 1080, y: 1092},
        pack: {x: 996, y: 1330},
        packHopper: {x: 1088, y: 1096},
        packOut: {x: 856, y: 1256},
        beltB: {x1: 836, x2: 500, y: 1244},
        depot: {x: 436, y: 1330},
        shelf: {x: 642, y: 1330},
        truck: {x: 178, y: 1330},
        truckLoad: {x: 306, y: 1322},
        dock: {x: 168, y: 1330},
        sign: {x: 560, y: 96},
        crew: {x: 700, y: 1408}
    };

    var FT_THEME_MOTIFS = {
        base: {sceneName: 'מפעל הצעצועים', product: 'צעצועי עץ', resource: '#b87936', glow: '#ffd36a'},
        soldiers: {sceneName: 'מפעל האספקה', product: 'ארגזי ציוד', resource: '#87915b', glow: '#ffe173'},
        unicorn: {sceneName: 'מפעל הקסמים', product: 'קופסאות קסם', resource: '#e77ed1', glow: '#fff08a'},
        space: {sceneName: 'תחנת הרכבה', product: 'מודולים חלליים', resource: '#58c7ff', glow: '#ffd86a'},
        dark: {sceneName: 'היציקה האפלה', product: 'אבני כוח', resource: '#9d7bf1', glow: '#88f0cf'},
        code: {sceneName: 'חוות השרתים', product: 'שרתים ארוזים', resource: '#39ff14', glow: '#7dff96'}
    };
    var FT_DARK_KEYS = ['space', 'dark', 'code'];

    function validateFactoryUpgrades(list) {
        var errors = [];
        if (!Array.isArray(list) || !list.length) return ['factory upgrade list must be a non-empty array'];
        list.forEach(function (item, index) {
            if (!item || !item.name || typeof item.name.value !== 'string' || !item.name.value.trim()) errors.push('item ' + index + ' needs a name.value');
            if (FT_KNOWN_MACHINES.indexOf(item && item.machine) === -1) errors.push('item ' + index + ' has unknown machine "' + (item && item.machine) + '"');
            if (FT_KINDS.indexOf(item && item.kind) === -1) errors.push('item ' + index + ' has unknown kind "' + (item && item.kind) + '"');
            if (!(Number(item && item.level) > 0)) errors.push('item ' + index + ' needs a positive level');
            if (!(Number(item && item.cost) > 0)) errors.push('item ' + index + ' needs a positive cost');
        });
        return errors;
    }

    function deriveFactoryState(list, purchasedIndices) {
        var machines = Object.assign({}, FT_DEFAULT_MACHINES);
        (purchasedIndices || []).forEach(function (index) {
            var item = list[index];
            if (!item || !item.machine) return;
            machines[item.machine] = Math.max(machines[item.machine] || 0, Number(item.level) || 1);
        });
        var workersHired = (purchasedIndices || []).filter(function (index) {
            return list[index] && /^worker[123]$/.test(list[index].machine);
        }).length;
        return {
            machines: machines,
            workersHired: workersHired,
            conveyor1: machines.conveyor1 > 0,
            conveyor2: machines.conveyor2 > 0,
            storageBuilt: true,
            signBuilt: true,
            workshopBuilt: true,
            packagingBuilt: true,
            signLit: machines.sign > 1 || (purchasedIndices || []).some(function (index) { return list[index] && list[index].machine === 'sign'; }),
            storageLevel: machines.storage,
            sawmillLevel: machines.sawmill,
            workshopLevel: machines.workshop,
            packagingLevel: machines.packaging
        };
    }

    function ftHexAlpha(hex, alpha) {
        if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
        var v = parseInt(hex.slice(1), 16);
        return 'rgba(' + ((v >> 16) & 255) + ', ' + ((v >> 8) & 255) + ', ' + (v & 255) + ', ' + alpha + ')';
    }

    function resolveFactoryTheme() {
        var requested = typeof getLocalStorage === 'function' ? getLocalStorage('theme', 'base') : 'base';
        var key = FT_THEME_MOTIFS[requested] && typeof themeOptions !== 'undefined' && themeOptions[requested] ? requested : 'base';
        var palette = typeof themeOptions !== 'undefined' && themeOptions[key] ? themeOptions[key].colors : {primary: '#006064', secondary: '#78909c', tertiary: '#B0E0E6', accent: '#C0C0C0', background: '#F5F5F5', text: '#000000'};
        var dark = FT_DARK_KEYS.indexOf(key) !== -1;
        return {
            key: key,
            motif: FT_THEME_MOTIFS[key],
            dark: dark,
            css: {
                '--ft-primary': palette.primary,
                '--ft-secondary': palette.secondary,
                '--ft-tertiary': palette.tertiary,
                '--ft-accent': palette.accent,
                '--ft-bg': palette.background,
                '--ft-ink': palette.text,
                '--ft-resource': FT_THEME_MOTIFS[key].resource,
                '--ft-glow': FT_THEME_MOTIFS[key].glow,
                '--ft-panel': dark ? 'rgba(21,26,43,.96)' : 'rgba(255,253,247,.97)',
                '--ft-panel-ink': dark ? '#f7fbff' : '#232a3d',
                '--ft-wall-a': dark ? ftHexAlpha(palette.primary, .55) : ftHexAlpha(palette.tertiary, .65),
                '--ft-wall-b': dark ? '#111827' : '#f4dcc2'
            }
        };
    }

    function getUpgradeDefinition(item) {
        var nextLevel = Number(item.level) || 1;
        var currentLevel = Math.max(0, nextLevel - 1);
        var benefit = item.detail && item.detail.value ? item.detail.value : 'משפר את קצב ורווחיות קו הייצור';
        return {
            upgradeId: item.machine + '-' + nextLevel,
            title: item.name.value || 'שדרוג',
            description: benefit,
            currentLevel: currentLevel,
            nextLevel: nextLevel,
            cost: item.cost,
            benefit: benefit
        };
    }

    // Central upgrade approval adapter. Replace requestUpgradeApproval() with the
    // educational question engine later; every purchase funnels through here.
    var UpgradeApprovalService = {
        requestUpgradeApproval: function (component, definition) {
            return component.openUpgradeApproval(definition);
        }
    };

    // ------------------------------------------------------------------ Phaser scene
    // Built lazily (only when Phaser exists) so the module stays loadable in node VMs.
    function buildFactoryScene(bridge) {
        var P = global.Phaser;

        var scene = new P.Scene({key: 'factory'});

        var products = [];       // live product sprites moving through the line
        var workers = [];
        var gears = [];
        var rollersA = [], rollersB = [];
        var beltATile, beltBTile;
        var machines = {};       // id -> {root, lamp, parts...}
        var selection = null;
        var truck, truckBoxes = 0, truckBusy = false;
        var shelfStock = [];
        var palletStack = [];
        var signLights = [], signLit = false;
        var minZoom = 0.2, maxZoom = 1.5;
        var spawnClock = 0;
        var pinch = null, dragInfo = null, userTouched = false;
        var dust = [];
        var reduced = bridge.reducedMotion;

        function A(name) { return FT_ASSET_BASE + name + '.svg'; }

        scene.preload = function () {
            var load = scene.load;
            var defs = {
                saw: ['machine-saw', 260], blade: ['saw-blade', 110], press: ['machine-press', 260], ram: ['press-ram', 150],
                pack: ['machine-pack', 290], tape: ['tape-roll', 74], gear: ['gear', 110],
                beltTile: ['belt-tile', 64], railTile: ['rail-tile', 64], roller: ['roller', 40], cleg: ['conveyor-leg', 64],
                chute: ['chute', 270], truck: ['truck', 370], wheel: ['wheel', 72],
                headA: ['worker-head-a', 62], headB: ['worker-head-b', 62], headC: ['worker-head-c', 62],
                torsoA: ['worker-torso-a', 70], torsoB: ['worker-torso-b', 70], torsoC: ['worker-torso-c', 70],
                armA: ['worker-arm-a', 26], armB: ['worker-arm-b', 26], armC: ['worker-arm-c', 26],
                wleg: ['worker-leg', 30],
                pLog: ['product-log', 96], pPlank: ['product-plank', 86], pToy: ['product-toy', 72], pBox: ['product-box', 64],
                pallet: ['pallet', 150], crate: ['crate', 84], barrel: ['barrel', 72], cone: ['cone', 48], shelf: ['shelf', 200],
                winT: ['window', 240], lamp: ['lamp', 130], fanF: ['fan-frame', 120], fanB: ['fan-blades', 90],
                pipes: ['pipes', 420], sign: ['sign', 320], dock: ['dock-door', 280],
                coin: ['coin', 60], puff: ['puff', 72], spark: ['spark', 28], hazard: ['hazard-tile', 64]
            };
            Object.keys(defs).forEach(function (key) {
                load.svg(key, A(defs[key][0]), {scale: 2});
            });
        };

        // -- helpers -------------------------------------------------------------
        function img(x, y, key, scale, depth, originX, originY) {
            var s = scene.add.image(x, y, key).setScale((scale || 1) * 0.5);
            if (originX !== undefined) s.setOrigin(originX, originY === undefined ? originX : originY);
            if (depth !== undefined) s.setDepth(depth);
            return s;
        }

        function makeSoftTextures() {
            // soft ellipse shadow
            var g = scene.make.graphics({x: 0, y: 0, add: false});
            for (var i = 10; i > 0; i--) {
                g.fillStyle(0x101423, 0.028 * (11 - i));
                g.fillEllipse(64, 24, i * 12.2, i * 4.4);
            }
            g.generateTexture('shadow', 128, 48);
            g.destroy();
            var d = scene.make.graphics({x: 0, y: 0, add: false});
            d.fillStyle(0xfff6df, 1); d.fillCircle(4, 4, 3.6);
            d.generateTexture('dustdot', 8, 8);
            d.destroy();
        }

        function shadow(x, y, w, depth) {
            var s = scene.add.image(x, y, 'shadow');
            s.setDisplaySize(w, Math.max(12, w * 0.13)).setDepth(depth === undefined ? 12 : depth).setAlpha(0.55);
            return s;
        }

        function puffAt(x, y, n, tint, spread) {
            if (reduced) return;
            for (var i = 0; i < (n || 2); i++) {
                var p = img(x + P.Math.Between(-(spread || 12), spread || 12), y + P.Math.Between(-6, 6), 'puff', 0.45 + Math.random() * 0.3, 62);
                if (tint) p.setTint(tint);
                p.setAlpha(0.85);
                scene.tweens.add({targets: p, y: y - 46 - Math.random() * 26, scale: p.scale * 1.9, alpha: 0, duration: 700 + Math.random() * 350, ease: 'Cubic.easeOut', onComplete: function (tw, t) { t[0].destroy(); }});
            }
        }

        function sparksAt(x, y, n, tint) {
            if (reduced) return;
            for (var i = 0; i < (n || 4); i++) {
                var s = img(x, y, 'spark', 0.5 + Math.random() * 0.5, 63);
                if (tint) s.setTint(tint);
                scene.tweens.add({
                    targets: s, x: x + P.Math.Between(-34, 34), y: y + P.Math.Between(-40, 6),
                    angle: P.Math.Between(-120, 120), alpha: 0, scale: 0.15,
                    duration: 380 + Math.random() * 220, ease: 'Quad.easeOut',
                    onComplete: function (tw, t) { t[0].destroy(); }
                });
            }
        }

        function arcTween(sprite, to, height, duration, ease, onComplete) {
            var from = {x: sprite.x, y: sprite.y};
            var state = {t: 0};
            return scene.tweens.add({
                targets: state, t: 1, duration: duration, ease: ease || 'Sine.easeInOut',
                onUpdate: function () {
                    var t = state.t;
                    sprite.x = from.x + (to.x - from.x) * t;
                    sprite.y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * height;
                },
                onComplete: onComplete
            });
        }

        // -- environment ----------------------------------------------------------
        function buildBackdrop() {
            var g = scene.add.graphics().setDepth(0);
            // upper hall wall
            g.fillStyle(0xf0e6d4); g.fillRect(0, 0, W.width, L.platformY);
            g.fillStyle(0xe7dac2); g.fillRect(0, 470, W.width, L.platformY - 470);
            g.fillStyle(0xdccbb0);
            for (var x = 118; x < W.width; x += 118) g.fillRect(x, 40, 3, L.platformY - 40);
            // ceiling + girder
            g.fillStyle(0x333a4e); g.fillRect(0, 0, W.width, 34);
            g.fillStyle(0x7c8aa5); g.fillRect(0, 66, W.width, 26);
            g.fillStyle(0x5d6d8c); g.fillRect(0, 86, W.width, 6);
            g.fillStyle(0x46536e);
            for (x = 24; x < W.width; x += 56) g.fillCircle(x, 79, 3.4);
            // mid wall (between floors)
            g.fillStyle(0xe6d8c0); g.fillRect(0, L.platformY, W.width, L.groundY - L.platformY);
            g.fillStyle(0xdbc9ab); g.fillRect(0, L.groundY - 210, W.width, 210);
            g.fillStyle(0xcfbb9a);
            for (x = 96; x < W.width; x += 132) g.fillRect(x, L.platformY + 70, 3, L.groundY - L.platformY - 80);
            // ground floor
            g.fillStyle(0xb3a893); g.fillRect(0, L.groundY, W.width, W.height - L.groundY);
            g.fillStyle(0xa4977f);
            for (x = 0; x < W.width; x += 148) g.fillRect(x, L.groundY + 8, 3, W.height - L.groundY - 8);
            g.fillRect(0, L.groundY + 96, W.width, 3);
            g.fillStyle(0xc4b8a2); g.fillRect(0, L.groundY, W.width, 7);
            // painted walk lane between depot and truck
            g.fillStyle(0xd9b13c, 0.5);
            g.fillRect(236, L.groundY + 26, 260, 5);
            g.fillRect(236, L.groundY + 120, 260, 5);
            // bottom apron shade
            g.fillStyle(0x8e8069, 0.55); g.fillRect(0, W.height - 44, W.width, 44);

            // windows, pipes, props on the walls
            img(198, 268, 'winT', 1.05, 2);
            img(478, 268, 'winT', 1.05, 2);
            img(758, 268, 'winT', 1.05, 2);
            img(1032, 268, 'winT', 1.05, 2);
            img(258, 892, 'winT', 0.92, 2).setAlpha(0.96);
            img(520, 892, 'winT', 0.92, 2).setAlpha(0.96);
            img(430, 998, 'pipes', 1.05, 3);
            var fanFrame = img(700, 880, 'fanF', 1, 3);
            var fanBlades = img(700, 880, 'fanB', 1, 4);
            gears.push({s: fanBlades, v: 0.9});
            // hanging lamps above the machine floor + wall lamps on the ground floor
            [336, 858].forEach(function (lx) {
                img(lx, 150, 'lamp', 1.05, 4);
            });
            img(620, 762, 'lamp', 0.95, 4);
            img(148, 762, 'lamp', 0.95, 4);

            // light shafts (WebGL gradient; skipped in reduced motion)
            if (!reduced && scene.game.renderer && scene.game.renderer.type === P.WEBGL) {
                var shafts = scene.add.graphics().setDepth(5);
                [198, 478, 758, 1032].forEach(function (wx) {
                    shafts.fillGradientStyle(0xfff3cf, 0xfff3cf, 0xfff3cf, 0xfff3cf, 0.16, 0.16, 0, 0);
                    shafts.fillPoints([{x: wx - 108, y: 196}, {x: wx + 108, y: 196}, {x: wx + 30, y: L.platformY}, {x: wx - 210, y: L.platformY}], true);
                });
            }
            // dust motes
            if (!reduced) {
                for (var i = 0; i < 10; i++) {
                    var m = scene.add.image(Math.random() * W.width, 120 + Math.random() * 1100, 'dustdot')
                        .setDepth(6).setAlpha(0.05 + Math.random() * 0.12).setScale(0.5 + Math.random());
                    dust.push({s: m, v: 4 + Math.random() * 9, ph: Math.random() * 6.28});
                }
            }
        }

        function buildPlatform() {
            var g = scene.add.graphics().setDepth(10);
            var y = L.platformY, h = L.platformH;
            var platW = 1052;
            // support columns
            g.fillStyle(0x5d6d8c);
            [70, 320, 570, 820, 1006].forEach(function (cx) {
                g.fillRect(cx - 14, y + h, 28, L.groundY - y - h);
                g.fillStyle(0x46536e); g.fillRect(cx + 6, y + h, 8, L.groundY - y - h); g.fillStyle(0x5d6d8c);
                g.fillRect(cx - 22, L.groundY - 16, 44, 16);
            });
            // slab
            g.fillStyle(0x6d7d9d); g.fillRect(0, y + 14, platW, h - 14);
            g.fillStyle(0x46536e); g.fillRect(0, y + h - 8, platW, 8);
            g.fillStyle(0xaebdd8); g.fillRect(0, y, platW, 16);
            g.fillStyle(0xc9d4e8); g.fillRect(0, y, platW, 5);
            g.fillStyle(0x8fa0bf);
            for (var x = 18; x < platW; x += 46) g.fillRect(x, y + 7, 20, 3);
            // hazard edge on slab front + right end cap
            scene.add.tileSprite(platW / 2, y + h - 17, platW, 18, 'hazard').setDepth(10).setTileScale(0.5);
            g.fillStyle(0x46536e); g.fillRect(platW - 8, y, 8, h);
            // guard rail along the platform back? kept clean for machine readability
        }

        function buildConveyor(x1, x2, y, rollers, id) {
            var len = Math.abs(x2 - x1);
            var left = Math.min(x1, x2);
            if (id) {
                var zone = scene.add.zone(left + len / 2, y + 16, len, 78).setInteractive({cursor: 'pointer'});
                zone.on('pointerup', function (pointer) { if (isTap(pointer)) selectMachine(id); });
                machines[id] = {root: zone, lamp: null, w: len, h: 78};
            }
            var belt = scene.add.tileSprite(left + len / 2, y + 9, len, 18, 'beltTile').setDepth(30).setTileScale(0.5);
            var rail = scene.add.tileSprite(left + len / 2, y + 30, len + 14, 26, 'railTile').setDepth(31).setTileScale(0.5);
            for (var x = left + 22; x <= left + len - 22; x += 44) {
                var r = img(x, y + 30, 'roller', 0.82, 32);
                rollers.push(r);
            }
            // legs
            var floorY = y < 800 ? L.platformY : L.groundY;
            [left + 30, left + len - 30].forEach(function (lx) {
                var leg = img(lx, (y + 42 + floorY) / 2, 'cleg', 1, 29);
                leg.setDisplaySize(32, floorY - y - 40);
            });
            shadow(left + len / 2, floorY + 6, len * 0.9, 11);
            return belt;
        }

        // -- machines --------------------------------------------------------------
        function registerMachine(id, root, lampPos, w, h) {
            root.setSize(w, h).setInteractive(new P.Geom.Rectangle(0, 0, w, h), P.Geom.Rectangle.Contains);
            root.input.cursor = 'pointer';
            root.on('pointerup', function (pointer) { if (isTap(pointer)) selectMachine(id); });
            var lamp = lampPos ? scene.add.ellipse(lampPos.x, lampPos.y, 15, 15, 0x57d06b, 0.9).setDepth(36) : null;
            machines[id] = {root: root, lamp: lamp, w: w, h: h};
            return machines[id];
        }

        function buildSaw() {
            shadow(L.saw.x, L.platformY + 4, 300);
            var c = scene.add.container(L.saw.x - 130, L.platformY - 250).setDepth(33);
            var blade = img(0, 0, 'blade', 1, 0).setPosition(135, 62);
            var body = img(0, 0, 'saw', 1, 0).setOrigin(0, 0);
            var gearS = img(248, 176, 'gear', 0.6, 0);
            c.add([blade, body, gearS]);
            var m = registerMachine('sawmill', c, {x: L.saw.x + 92, y: L.platformY - 130}, 260, 250);
            m.blade = blade; m.gear = gearS; m.bladeSpeed = 1.6;
            gears.push({s: gearS, v: 0.8, container: true});
            return m;
        }

        function buildPress() {
            shadow(L.press.x, L.platformY + 4, 300);
            var c = scene.add.container(L.press.x - 130, L.platformY - 310).setDepth(33);
            var ram = img(130, 146, 'ram', 1.5, 0);
            var body = img(0, 0, 'press', 1, 0).setOrigin(0, 0);
            var gearS = img(20, 96, 'gear', 0.5, 0);
            c.add([ram, body, gearS]);
            var m = registerMachine('workshop', c, {x: L.press.x + 60, y: L.platformY - 259}, 260, 310);
            m.ram = ram; m.ramRestY = 146; m.gear = gearS;
            gears.push({s: gearS, v: -0.7, container: true});
            return m;
        }

        function buildPack() {
            shadow(L.pack.x, L.groundY + 4, 320);
            var c = scene.add.container(L.pack.x - 145, L.groundY - 260).setDepth(33);
            var body = img(0, 0, 'pack', 1, 0).setOrigin(0, 0);
            var tape = img(145, 47, 'tape', 1, 0);
            c.add([body, tape]);
            var m = registerMachine('packaging', c, {x: L.pack.x - 105, y: L.groundY - 128}, 290, 260);
            m.tape = tape;
            return m;
        }

        function buildChute() {
            // sprite is authored descending left; flip it so it feeds the packager hopper
            var c = img(890, 620, 'chute', 1, 25, 0, 0);
            c.setFlipX(true);
        }

        function buildDepotAndStorage() {
            var rack = img(L.shelf.x, L.groundY, 'shelf', 1.15, 20, 0.5, 1);
            rack.setInteractive({cursor: 'pointer'});
            rack.on('pointerup', function (pointer) { if (isTap(pointer)) selectMachine('storage'); });
            machines.storage = {root: rack, lamp: null, w: 230, h: 218};
            shadow(L.shelf.x, L.groundY + 4, 240);
            img(L.depot.x, L.groundY + 10, 'pallet', 1, 21, 0.5, 1);
            shadow(L.depot.x, L.groundY + 12, 160);
            // ambient props
            img(64, L.platformY, 'crate', 1, 20, 0.5, 1);
            img(120, L.platformY, 'crate', 0.8, 21, 0.5, 1);
            img(92, L.platformY - 62, 'crate', 0.72, 22, 0.5, 1);
            shadow(96, L.platformY + 4, 150);
            img(1128, L.groundY + 68, 'barrel', 1, 50, 0.5, 1);
            img(1082, L.groundY + 96, 'barrel', 0.88, 51, 0.5, 1);
            img(560, L.groundY + 138, 'cone', 1, 52, 0.5, 1);
            img(930, L.groundY + 150, 'cone', 0.85, 52, 0.5, 1);
            shadow(1105, L.groundY + 100, 130, 49);
        }

        function buildSign() {
            var s = img(L.sign.x, L.sign.y, 'sign', 1.1, 7);
            s.setInteractive({cursor: 'pointer'});
            s.on('pointerup', function (pointer) { if (isTap(pointer)) selectMachine('sign'); });
            machines.sign = {root: s, lamp: null, w: 352, h: 143};
            // bulb glow points (offsets in sign SVG units, scaled to display size 1.1*0.5)
            [[-136, -41], [136, -41], [-136, 33], [136, 33], [0, -49], [-72, -49], [72, -49]].forEach(function (p) {
                var b = scene.add.ellipse(L.sign.x + p[0] * 0.55, L.sign.y + p[1] * 0.55, 9, 9, 0xffe173, 0).setDepth(8);
                signLights.push(b);
            });
        }

        function buildDockAndTruck() {
            img(L.dock.x + 20, L.groundY, 'dock', 1.15, 15, 0.5, 1);
            scene.add.tileSprite(L.dock.x + 20, L.groundY - 4, 300, 16, 'hazard').setDepth(16).setTileScale(0.45);
            truck = scene.add.container(L.truck.x, L.groundY - 12).setDepth(38);
            var body = img(0, 0, 'truck', 1, 0).setOrigin(0.5, 1).setPosition(0, 14);
            var w1 = img(-92, -12, 'wheel', 1, 0);
            var w2 = img(96, -12, 'wheel', 1, 0);
            truck.add([body, w1, w2]);
            truck.wheels = [w1, w2];
            truck.setSize(340, 200).setInteractive(new P.Geom.Rectangle(-170, -210, 340, 210), P.Geom.Rectangle.Contains);
            truck.on('pointerup', function (pointer) { if (isTap(pointer)) selectMachine('crew'); });
            machines.crew = {root: truck, lamp: null, w: 340, h: 200};
            truck.shadow = shadow(L.truck.x, L.groundY + 6, 380, 14);
        }

        // -- workers ----------------------------------------------------------------
        var WORKER_SKINS = [
            {head: 'headA', torso: 'torsoA', arm: 'armA', speed: 132},
            {head: 'headB', torso: 'torsoB', arm: 'armB', speed: 118},
            {head: 'headC', torso: 'torsoC', arm: 'armC', speed: 144},
            {head: 'headA', torso: 'torsoB', arm: 'armB', speed: 124},
            {head: 'headC', torso: 'torsoA', arm: 'armA', speed: 138}
        ];

        function spawnWorker(index) {
            var skin = WORKER_SKINS[index % WORKER_SKINS.length];
            var c = scene.add.container(L.crew.x + index * 46 - 40, L.groundY + 40 + (index % 3) * 34).setDepth(40);
            var legB = img(3, -31, 'wleg', 1, 0, 0.5, 0.06);
            var legF = img(-4, -31, 'wleg', 1, 0, 0.5, 0.06);
            var armB = img(-9, -63, skin.arm, 1, 0, 0.5, 0.08);
            var torso = img(0, -24, skin.torso, 1, 0, 0.5, 1);
            var head = img(2, -66, skin.head, 1, 0, 0.5, 0.92);
            var armF = img(9, -63, skin.arm, 1, 0, 0.5, 0.08);
            var box = img(1, -104, 'pBox', 0.9, 0).setVisible(false);
            c.add([legB, armB, torso, head, armF, legF, box]);
            var sh = shadow(c.x, L.groundY + 40, 74, 39);
            var w = {
                c: c, parts: {legB: legB, legF: legF, armB: armB, armF: armF, torso: torso, head: head, box: box},
                shadow: sh, state: 'idle', phase: Math.random() * 6.28, speed: skin.speed,
                home: {x: c.x, y: c.y}, target: null, carryValue: 0, waitT: Math.random() * 800
            };
            workers.push(w);
            return w;
        }

        function workerSetWalk(w, on) {
            w.walking = on;
            if (!on) {
                w.parts.legB.rotation = 0; w.parts.legF.rotation = 0;
                if (!w.carrying) { w.parts.armB.rotation = 0; w.parts.armF.rotation = 0; }
                w.parts.torso.y = -24; w.parts.head.y = -66;
            }
        }

        function workerCarry(w, on) {
            w.carrying = on;
            w.parts.box.setVisible(on);
            var target = on ? Math.PI * 0.94 : 0;
            scene.tweens.add({targets: [w.parts.armB, w.parts.armF], rotation: target, duration: 220, ease: 'Back.easeOut'});
        }

        function updateWorker(w, dtMs) {
            var dt = dtMs / 1000;
            w.phase += dt * (w.walking ? 9.5 : 2.2);
            if (w.walking) {
                var swing = Math.sin(w.phase) * 0.62;
                w.parts.legB.rotation = swing;
                w.parts.legF.rotation = -swing;
                if (!w.carrying) {
                    w.parts.armB.rotation = -swing * 0.72;
                    w.parts.armF.rotation = swing * 0.72;
                }
                var bob = Math.abs(Math.sin(w.phase)) * -3;
                w.parts.torso.y = -24 + bob; w.parts.head.y = -66 + bob;
                if (w.carrying) w.parts.box.y = -104 + bob * 1.15;
            } else if (!reduced) {
                var breathe = Math.sin(w.phase) * 1.1;
                w.parts.head.y = -66 + breathe * 0.7;
                w.parts.torso.scaleY = 0.5 + Math.sin(w.phase) * 0.004;
            }

            // simple state machine
            if (w.state === 'idle') {
                w.waitT -= dtMs;
                if (w.waitT <= 0) {
                    w.waitT = 400 + Math.random() * 700;
                    var boxReady = palletStack.length > 0 && !truckBusy;
                    if (boxReady && !palletStack[palletStack.length - 1].claimed) {
                        var item = palletStack[palletStack.length - 1];
                        item.claimed = true;
                        w.claimed = item;
                        w.state = 'toPickup';
                        w.target = {x: L.depot.x + P.Math.Between(-16, 16), y: L.groundY + 44};
                        workerSetWalk(w, true);
                    }
                }
            } else if (w.state === 'toPickup' || w.state === 'toTruck' || w.state === 'toHome') {
                var tx = w.target.x, ty = w.target.y;
                var dx = tx - w.c.x, dy = ty - w.c.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var step = w.speed * dt;
                w.c.scaleX = dx < -2 ? -1 : (dx > 2 ? 1 : w.c.scaleX);
                if (dist <= step) {
                    w.c.setPosition(tx, ty);
                    workerSetWalk(w, false);
                    if (w.state === 'toPickup') {
                        w.state = 'pickup'; w.waitT = 240;
                    } else if (w.state === 'toTruck') {
                        w.state = 'toss'; w.waitT = 160;
                    } else {
                        w.state = 'idle'; w.waitT = 500 + Math.random() * 900;
                    }
                } else {
                    w.c.x += dx / dist * step;
                    w.c.y += dy / dist * step;
                }
                w.shadow.setPosition(w.c.x, w.c.y + 2);
            } else if (w.state === 'pickup') {
                w.waitT -= dtMs;
                if (w.waitT <= 0) {
                    var item = w.claimed;
                    if (item) {
                        var idx = palletStack.indexOf(item);
                        if (idx !== -1) palletStack.splice(idx, 1);
                        w.carryValue = item.value;
                        item.sprite.destroy();
                    }
                    workerCarry(w, true);
                    w.state = 'toTruck';
                    w.target = {x: L.truckLoad.x, y: L.groundY + 58};
                    workerSetWalk(w, true);
                }
            } else if (w.state === 'toss') {
                w.waitT -= dtMs;
                if (truckBusy) return; // hold the box until the truck backs into the dock
                if (w.waitT <= 0) {
                    workerCarry(w, false);
                    tossIntoTruck(w.c.x, w.c.y - 104, w.carryValue);
                    w.state = 'toHome';
                    w.target = {x: w.home.x, y: w.home.y};
                    workerSetWalk(w, true);
                }
            }
        }

        function tossIntoTruck(x, y, value) {
            var b = img(x, y, 'pBox', 0.9, 41);
            arcTween(b, {x: L.truck.x + 60, y: L.groundY - 130}, 66, 420, 'Sine.easeIn', function () {
                b.destroy();
                puffAt(L.truck.x + 60, L.groundY - 120, 1, 0xffe9a8, 8);
                scene.tweens.add({targets: truck, y: L.groundY - 8, duration: 90, yoyo: true, ease: 'Quad.easeOut'});
                coinBurst(L.truck.x + 60, L.groundY - 150, value);
                bridge.onDeliver(value);
                truckBoxes += 1;
                if (truckBoxes >= 6) departTruck();
            });
        }

        function coinBurst(x, y, value) {
            if (!reduced) {
                for (var i = 0; i < 4; i++) {
                    var c = img(x, y, 'coin', 0.7, 64);
                    scene.tweens.add({
                        targets: c, x: x + P.Math.Between(-58, 58), y: y - 66 - Math.random() * 44,
                        scaleX: {from: 0.35, to: 0.02}, alpha: {from: 1, to: 0.2}, angle: P.Math.Between(-90, 90),
                        duration: 620 + i * 90, ease: 'Cubic.easeOut',
                        onComplete: function (tw, t) { t[0].destroy(); }
                    });
                }
            }
            var txt = scene.add.text(x, y - 18, '+' + value, {
                fontFamily: 'Arial, sans-serif', fontSize: '30px', fontStyle: '900',
                color: '#ffd34d', stroke: '#2b3145', strokeThickness: 6
            }).setOrigin(0.5).setDepth(65);
            scene.tweens.add({targets: txt, y: y - 86, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: function () { txt.destroy(); }});
        }

        function departTruck() {
            truckBusy = true;
            truckBoxes = 0;
            scene.time.delayedCall(650, function () {
                var spin = scene.tweens.add({targets: truck.wheels, angle: '-=1440', duration: 2000, ease: 'Cubic.easeIn'});
                puffAt(L.truck.x + 170, L.groundY - 30, 3, 0xd5dcea, 10);
                scene.tweens.add({
                    targets: truck, x: -480, duration: 1900, ease: 'Cubic.easeIn',
                    onUpdate: function () { truck.shadow.setPosition(truck.x, L.groundY + 6); },
                    onComplete: function () {
                        scene.time.delayedCall(1500, function () {
                            scene.tweens.add({
                                targets: truck, x: L.truck.x, duration: 2100, ease: 'Cubic.easeOut',
                                onUpdate: function () { truck.shadow.setPosition(truck.x, L.groundY + 6); },
                                onComplete: function () {
                                    truckBusy = false;
                                    scene.tweens.add({targets: truck, y: L.groundY - 16, duration: 120, yoyo: true, ease: 'Quad.easeOut'});
                                }
                            });
                            scene.tweens.add({targets: truck.wheels, angle: '+=1440', duration: 2100, ease: 'Cubic.easeOut'});
                        });
                    }
                });
            });
        }

        // -- production line ---------------------------------------------------------
        function pulseMachine(id, tint) {
            var m = machines[id];
            if (!m || !m.root) return;
            if (m.lamp) {
                m.lamp.setFillStyle(0x9dffab, 1);
                scene.time.delayedCall(420, function () { m.lamp.setFillStyle(0x57d06b, 0.9); });
            }
            if (!reduced && m.root.scaleX !== undefined) {
                scene.tweens.add({targets: m.root, y: m.root.y + 3, duration: 70, yoyo: true, repeat: 1, ease: 'Quad.easeOut'});
            }
        }

        function beltSpeed(which) {
            var lvl = bridge.getDerived().machines['conveyor' + which] || 1;
            return 86 + lvl * 26;
        }

        function spawnProduct() {
            var log = img(L.pile.x, L.platformY - 40, 'pLog', 1, 34, 0.5, 1);
            log.setAlpha(0);
            scene.tweens.add({targets: log, alpha: 1, duration: 140});
            products.push(log);
            if (!reduced) scene.tweens.add({targets: log, angle: -22, duration: 640, ease: 'Sine.easeOut'});
            arcTween(log, {x: L.sawIntake.x, y: L.sawIntake.y}, 58, 640, 'Sine.easeInOut', function () {
                log.setAngle(0);
                // into the hopper
                scene.tweens.add({targets: log, y: L.sawIntake.y + 34, alpha: 0, scale: 0.32, duration: 240, ease: 'Quad.easeIn', onComplete: function () {
                    removeProduct(log);
                    sawCycle();
                }});
            });
        }

        function removeProduct(s) {
            var i = products.indexOf(s);
            if (i !== -1) products.splice(i, 1);
            s.destroy();
        }

        function sawCycle() {
            var m = machines.sawmill;
            pulseMachine('sawmill');
            m.bladeSpeed = 13;
            sparksAt(L.saw.x - 60, L.platformY - 165, 5, 0xd99e5e);
            puffAt(L.saw.x + 82, L.platformY - 196, 1, 0xe8e2d4, 4);
            scene.time.delayedCall(520, function () {
                m.bladeSpeed = 1.6;
                var plank = img(L.sawOut.x, L.sawOut.y, 'pPlank', 1, 34, 0.5, 1);
                plank.setScale(0.5 * 0.4).setAlpha(0);
                products.push(plank);
                scene.tweens.add({targets: plank, alpha: 1, scale: 0.5, duration: 180, ease: 'Back.easeOut'});
                rideBelt(plank, L.beltA.x1, L.beltA.x2, L.beltA.y, beltSpeed(1), function () {
                    dropToPress(plank);
                });
            });
        }

        function rideBelt(sprite, x1, x2, y, speed, onDone) {
            sprite.setPosition(x1, y);
            var dur = Math.abs(x2 - x1) / speed * 1000;
            scene.tweens.add({targets: sprite, x: x2, duration: dur, ease: 'Linear', onComplete: onDone});
            if (!reduced) scene.tweens.add({targets: sprite, angle: {from: -1.2, to: 1.2}, duration: 300, yoyo: true, repeat: Math.ceil(dur / 600)});
        }

        function dropToPress(plank) {
            arcTween(plank, {x: L.pressAnvil.x, y: L.pressAnvil.y}, 26, 330, 'Quad.easeIn', function () {
                plank.setDepth(30); // behind press ram/columns
                pressCycle(plank);
            });
        }

        function pressCycle(plank) {
            var m = machines.workshop;
            pulseMachine('workshop');
            scene.tweens.add({
                targets: m.ram, y: m.ramRestY + 82, duration: 150, ease: 'Quad.easeIn',
                onComplete: function () {
                    sparksAt(L.pressAnvil.x, L.pressAnvil.y - 14, 6, 0xffcb44);
                    puffAt(L.pressAnvil.x, L.pressAnvil.y - 20, 2, 0xf3ede0, 20);
                    removeProduct(plank);
                    scene.tweens.add({targets: m.ram, y: m.ramRestY, duration: 460, ease: 'Back.easeOut'});
                    var toy = img(L.pressAnvil.x, L.pressAnvil.y, 'pToy', 1, 34, 0.5, 1);
                    toy.setScale(0.5 * 0.3);
                    products.push(toy);
                    scene.tweens.add({targets: toy, scale: 0.5, duration: 220, ease: 'Back.easeOut', onComplete: function () {
                        arcTween(toy, {x: L.chuteTop.x, y: L.chuteTop.y}, 42, 360, 'Sine.easeIn', function () { slideChute(toy); });
                    }});
                }
            });
        }

        function slideChute(toy) {
            var state = {t: 0};
            var from = {x: L.chuteTop.x, y: L.chuteTop.y};
            var to = {x: L.chuteEnd.x, y: L.chuteEnd.y};
            scene.tweens.add({
                targets: state, t: 1, duration: 620, ease: 'Quad.easeIn',
                onUpdate: function () {
                    toy.x = from.x + (to.x - from.x) * state.t;
                    toy.y = from.y + (to.y - from.y) * state.t;
                    toy.rotation = 0.32;
                },
                onComplete: function () {
                    toy.rotation = 0;
                    scene.tweens.add({targets: toy, x: L.packHopper.x, y: L.packHopper.y + 26, alpha: 0, scale: 0.3, duration: 200, ease: 'Quad.easeIn', onComplete: function () {
                        removeProduct(toy);
                        packCycle();
                    }});
                }
            });
        }

        function packCycle() {
            var m = machines.packaging;
            pulseMachine('packaging');
            if (!reduced) {
                scene.tweens.add({targets: m.tape, rotation: m.tape.rotation + 6.28 * 2, duration: 760, ease: 'Cubic.easeInOut'});
                scene.tweens.add({targets: m.root, scaleY: 0.985, duration: 130, yoyo: true, repeat: 2});
            }
            scene.time.delayedCall(720, function () {
                var box = img(L.packOut.x, L.beltB.y, 'pBox', 1, 34, 0.5, 1);
                box.setScale(0.5 * 0.4).setAlpha(0);
                products.push(box);
                puffAt(L.packOut.x, L.beltB.y - 30, 1, 0xcdc4ff, 6);
                scene.tweens.add({targets: box, alpha: 1, scale: 0.5, duration: 170, ease: 'Back.easeOut'});
                rideBelt(box, L.beltB.x1, L.beltB.x2, L.beltB.y, beltSpeed(2), function () {
                    dropToDepot(box);
                });
            });
        }

        function dropToDepot(box) {
            var stackY = L.groundY - palletStack.length * 26;
            arcTween(box, {x: L.depot.x + (palletStack.length % 2 ? 12 : -10), y: stackY}, 22, 320, 'Quad.easeIn', function () {
                removeProduct(box);
                if (palletStack.length >= 4) {
                    // depot saturated: value is banked directly with a modest coin pop
                    coinBurst(L.depot.x, stackY - 40, bridge.productValue());
                    bridge.onDeliver(bridge.productValue());
                    return;
                }
                var stacked = img(L.depot.x + (palletStack.length % 2 ? 12 : -10), stackY, 'pBox', 1, 22 + palletStack.length, 0.5, 1);
                if (!reduced) scene.tweens.add({targets: stacked, scaleY: {from: 0.42, to: 0.5}, duration: 160, ease: 'Back.easeOut'});
                palletStack.push({sprite: stacked, value: bridge.productValue(), claimed: false});
            });
        }

        // -- selection ----------------------------------------------------------------
        function selectMachine(id) {
            clearSelection();
            var m = machines[id];
            if (!m) { bridge.onSelect(id); return; }
            var b = m.root.getBounds ? m.root.getBounds() : new P.Geom.Rectangle(m.root.x, m.root.y, m.w, m.h);
            var cx = b.centerX, cy = b.bottom;
            selection = {
                id: id,
                ring: scene.add.ellipse(cx, cy + 2, b.width * 0.94, b.width * 0.3).setStrokeStyle(6, 0xffd34d, 0.95).setDepth(13),
                arrow: scene.add.triangle(cx, b.top - 30, 0, 0, 30, 0, 15, 20, 0xffd34d).setStrokeStyle(4, 0x2b3145).setDepth(70)
            };
            if (!reduced) {
                selection.ringTween = scene.tweens.add({targets: selection.ring, scaleX: 1.06, scaleY: 1.12, alpha: 0.6, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'});
                selection.arrowTween = scene.tweens.add({targets: selection.arrow, y: b.top - 44, duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'});
            }
            bridge.onSelect(id);
        }

        function clearSelection(silent) {
            if (!selection) return;
            if (selection.ringTween) selection.ringTween.stop();
            if (selection.arrowTween) selection.arrowTween.stop();
            selection.ring.destroy();
            selection.arrow.destroy();
            selection = null;
            if (!silent) bridge.onSelect(null);
        }

        // -- camera -------------------------------------------------------------------
        function isTap(pointer) {
            return pointer.getDistance() < 14 && (pointer.upTime - pointer.downTime) < 400;
        }

        function clampZoom(z) { return P.Math.Clamp(z, minZoom, maxZoom); }

        function computeZoomLimits() {
            var cam = scene.cameras.main;
            var fit = Math.min(cam.width / W.width, cam.height / W.height);
            minZoom = fit * 0.985;
            maxZoom = Math.max(1.45, fit * 2.6);
        }

        function initialFrame() {
            var cam = scene.cameras.main;
            computeZoomLimits();
            var cover = Math.max(cam.width / W.width, cam.height / W.height);
            cam.setZoom(clampZoom(Math.min(cover, 0.98)));
            // Portrait covers the full height; on wider views frame the lively ground floor.
            var centerY = Math.min(940, W.height - 92 - cam.displayHeight / 2);
            cam.centerOn(566, Math.max(centerY, cam.displayHeight / 2));
        }

        function fitCamera() {
            var cam = scene.cameras.main;
            computeZoomLimits();
            if (reduced) { cam.setZoom(minZoom); cam.centerOn(W.width / 2, W.height / 2); return; }
            scene.tweens.add({targets: cam, zoom: minZoom, duration: 420, ease: 'Cubic.easeOut'});
            cam.pan(W.width / 2, W.height / 2, 420, 'Cubic.easeOut');
        }

        function zoomBy(factor) {
            var cam = scene.cameras.main;
            var target = clampZoom(cam.zoom * factor);
            if (reduced) { cam.setZoom(target); return; }
            scene.tweens.add({targets: cam, zoom: target, duration: 240, ease: 'Cubic.easeOut'});
        }

        function setupInput() {
            var cam = scene.cameras.main;
            scene.input.addPointer(2);
            scene.input.on('pointermove', function (pointer) {
                var p1 = scene.input.pointer1, p2 = scene.input.pointer2;
                if (p1 && p1.isDown && p2 && p2.isDown) {
                    // pinch zoom
                    var dist = P.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
                    var midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
                    if (pinch) {
                        var next = clampZoom(cam.zoom * dist / pinch.dist);
                        cam.setZoom(next);
                        cam.scrollX -= (midX - pinch.midX) / cam.zoom;
                        cam.scrollY -= (midY - pinch.midY) / cam.zoom;
                    }
                    pinch = {dist: dist, midX: midX, midY: midY};
                    dragInfo = null;
                    return;
                }
                pinch = null;
                if (pointer.isDown) {
                    if (dragInfo && dragInfo.id === pointer.id) {
                        cam.scrollX -= (pointer.x - dragInfo.x) / cam.zoom;
                        cam.scrollY -= (pointer.y - dragInfo.y) / cam.zoom;
                    }
                    dragInfo = {id: pointer.id, x: pointer.x, y: pointer.y};
                }
            });
            scene.input.on('pointerup', function () { dragInfo = null; pinch = null; });
            scene.input.on('pointerdown', function (pointer) { userTouched = true; dragInfo = {id: pointer.id, x: pointer.x, y: pointer.y}; });
            scene.input.on('wheel', function (pointer, objects, dx, dy) {
                zoomBy(dy > 0 ? 0.88 : 1.14);
            });
            scene.input.on('pointerup', function (pointer) {
                if (isTap(pointer)) {
                    // tap on empty space clears selection (machine taps stop here via their own handlers)
                    var hits = scene.input.hitTestPointer(pointer);
                    if (!hits || !hits.length) clearSelection();
                }
            });
            scene.scale.on('resize', function () {
                computeZoomLimits();
                if (!userTouched) initialFrame();          // boot-time size settles late on some devices
                else if (cam.zoom < minZoom) cam.setZoom(minZoom);
            });
        }

        // -- derived-state application ---------------------------------------------
        function applyDerived() {
            var d = bridge.getDerived();
            // workers: 2 on duty by default, +1 per hire
            var wanted = Math.min(2 + d.workersHired, WORKER_SKINS.length);
            while (workers.length < wanted) {
                var w = spawnWorker(workers.length);
                if (scene.sys.isActive()) {
                    w.c.setAlpha(0);
                    scene.tweens.add({targets: w.c, alpha: 1, duration: 400});
                }
            }
            // storage: stock the rack shelves as the storage level rises
            // (rows sit below/above the conveyor that passes in front of the rack)
            var stock = Math.min(2 + (d.machines.storage || 1) * 3, 8);
            while (shelfStock.length < stock) {
                var i = shelfStock.length;
                var col = i % 4, row = Math.floor(i / 4);
                var bx = L.shelf.x - 78 + col * 52 + (row % 2) * 8;
                var by = L.groundY - 12 - (row === 0 ? 0 : 160);
                var kind = (i % 3 === 2) ? 'crate' : 'pBox';
                shelfStock.push(img(bx, by, kind, kind === 'crate' ? 0.72 : 0.95, 21, 0.5, 1));
            }
            // sign: lights up once its upgrade is bought
            if (d.signLit && !signLit) {
                signLit = true;
                signLights.forEach(function (b, i) {
                    b.setFillStyle(0xffe173, 1);
                    if (!reduced) scene.tweens.add({targets: b, alpha: {from: 0.45, to: 1}, duration: 500 + i * 60, yoyo: true, repeat: -1});
                });
            }
        }

        function levelUpFx(id) {
            var m = machines[id];
            if (!m || !m.root) return;
            var b = m.root.getBounds ? m.root.getBounds() : new P.Geom.Rectangle(m.root.x, m.root.y, m.w, m.h);
            sparksAt(b.centerX, b.centerY, 10, 0xffd34d);
            puffAt(b.centerX, b.centerY, 3, 0xffe9a8, b.width / 4);
        }

        // -- lifecycle ----------------------------------------------------------------
        scene.create = function () {
            makeSoftTextures();
            buildBackdrop();
            buildPlatform();
            buildSign();
            buildDockAndTruck();
            buildDepotAndStorage();
            buildSaw();
            buildPress();
            buildPack();
            buildChute();
            beltATile = buildConveyor(L.beltA.x1 - 14, L.beltA.x2 + 14, L.beltA.y, rollersA, 'conveyor1');
            beltBTile = buildConveyor(L.beltB.x2 - 14, L.beltB.x1 + 14, L.beltB.y, rollersB, 'conveyor2');

            var cam = scene.cameras.main;
            cam.setBackgroundColor('#20263a');
            cam.roundPixels = false;
            initialFrame();
            setupInput();
            applyDerived();
            spawnClock = bridge.cycleDuration() * 0.4; // first log appears quickly

            bridge.attach({
                fit: fitCamera,
                zoomIn: function () { zoomBy(1.22); },
                zoomOut: function () { zoomBy(0.82); },
                applyDerived: applyDerived,
                levelUpFx: levelUpFx,
                clearSelection: function () { clearSelection(true); },
                selectMachine: selectMachine
            });
        };

        function clampCamera() {
            // Phaser scroll semantics: view centre = scroll + size/2 (zoom-independent),
            // so the valid scroll range must be derived from the zoomed display size.
            var cam = scene.cameras.main;
            var dw = cam.displayWidth, dh = cam.displayHeight;
            var offX = (dw - cam.width) / 2, offY = (dh - cam.height) / 2;
            cam.scrollX = dw >= W.width ? (W.width - cam.width) / 2
                : P.Math.Clamp(cam.scrollX, offX, W.width - dw + offX);
            cam.scrollY = dh >= W.height ? (W.height - cam.height) / 2
                : P.Math.Clamp(cam.scrollY, offY, W.height - dh + offY);
        }

        scene.update = function (time, dtMs) {
            var dt = dtMs / 1000;
            clampCamera();
            // belts + rollers
            var vA = beltSpeed(1), vB = beltSpeed(2);
            if (beltATile) beltATile.tilePositionX += vA * dt * 2;   // ×2: texture is loaded at 2x
            if (beltBTile) beltBTile.tilePositionX -= vB * dt * 2;
            rollersA.forEach(function (r) { r.rotation += vA * dt / 8.5; });
            rollersB.forEach(function (r) { r.rotation -= vB * dt / 8.5; });
            // gears / blade / fan
            gears.forEach(function (g) { g.s.rotation += g.v * dt; });
            var saw = machines.sawmill;
            if (saw && saw.blade) saw.blade.rotation += saw.bladeSpeed * dt;
            // production spawn
            spawnClock += dtMs;
            if (spawnClock >= bridge.cycleDuration() && products.length < 7) {
                spawnClock = 0;
                spawnProduct();
            }
            // workers
            for (var i = 0; i < workers.length; i++) updateWorker(workers[i], dtMs);
            // dust drift
            for (i = 0; i < dust.length; i++) {
                var m = dust[i];
                m.ph += dt * 0.5;
                m.s.x += Math.sin(m.ph) * 0.12;
                m.s.y -= m.v * dt;
                if (m.s.y < 60) { m.s.y = 1200; m.s.x = Math.random() * W.width; }
            }
        };

        return scene;
    }

    // ------------------------------------------------------------------ Vue component
    var STATION_INFO = {
        sawmill: {name: 'מסור חומרי גלם', description: 'חותך בולי עץ לקרשים מוכנים לעיבוד.', group: 'sawmill'},
        workshop: {name: 'מכבש ההרכבה', description: 'מכבש כבד שמעצב קרשים לצעצועי עץ.', group: 'workshop'},
        packaging: {name: 'מכונת האריזה', description: 'אורזת צעצועים בקופסאות מוכנות למשלוח.', group: 'packaging'},
        conveyor1: {name: 'מסוע עליון', description: 'מוביל קרשים מהמסור אל המכבש.', group: 'conveyor1'},
        conveyor2: {name: 'מסוע תחתון', description: 'מוביל קופסאות מהאריזה אל משטח האיסוף.', group: 'conveyor2'},
        storage: {name: 'מחסן המפעל', description: 'מדפים לאחסון תוצרת מוכנה.', group: 'storage'},
        sign: {name: 'שלט המפעל', description: 'שלט מואר שמקשט את חזית המפעל.', group: 'sign'},
        crew: {name: 'צוות העובדים', description: 'העובדים אוספים קופסאות ומעמיסים על המשאית.', group: 'crew'}
    };
    var CREW_KEYS = ['worker1', 'worker2', 'worker3'];

    function createFactoryTycoonComponent(BaseGameComponent) {
        return Vue.component('factory-tycoon', Vue.extend({
            extends: BaseGameComponent,
            template: `
            <div ref="root" class="ft-game" :class="['ft-theme-'+ftTheme.key, {'ft-dark':ftTheme.dark,'ft-reduced':reducedMotion,'ft-sheet-open':!!selectedMachine}]" :style="ftTheme.css" dir="rtl">
              <div class="ft-stage" ref="stage" dir="ltr"></div>
              <header class="ft-hud">
                <button class="ft-icon-btn" type="button" @click="exitGame" aria-label="חזרה"><svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7M9 12h11"/></svg></button>
                <div class="ft-money" aria-label="מטבעות"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M8.8 10.1c.8-2.1 5.6-2 6.4 0 .7 1.9-5.8 1.2-5.8 3.8 0 2.2 5 2.4 6.2.3"/></svg><b :class="{'ft-money-pop':moneyPop}">{{ displayMoney }}</b></div>
                <div class="ft-hud-title"><strong>{{ ftTheme.motif.sceneName }}</strong><span>{{ ppm }} מטבעות בדקה</span></div>
                <button class="ft-icon-btn" type="button" @click="fitFactory" aria-label="התאמה למסך"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
              </header>
              <div class="ft-zoom">
                <button class="ft-icon-btn" type="button" @click="zoomIn" aria-label="התקרבות"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
                <button class="ft-icon-btn" type="button" @click="zoomOut" aria-label="התרחקות"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
              </div>
              <section v-if="selectedConfig" class="ft-bottom-sheet" role="region" :aria-label="selectedConfig.name">
                <button type="button" class="ft-sheet-close" @click="clearSelection" aria-label="סגירה"></button>
                <h2>{{ selectedConfig.name }}</h2>
                <p>{{ selectedConfig.description }}</p>
                <dl>
                  <div><dt>{{ selectedPanel.levelLabel }}</dt><dd>{{ selectedPanel.level }}</dd></div>
                  <div><dt>קצב ייצור</dt><dd>{{ selectedPanel.speed }}</dd></div>
                  <div><dt>שווי מוצר</dt><dd>{{ selectedPanel.value }}</dd></div>
                </dl>
                <button type="button" class="ft-upgrade-btn" :disabled="!selectedPanel.next || money < selectedPanel.next.cost" @click="attemptUpgrade(selectedPanel.next.index)">
                  <template v-if="selectedPanel.next">{{ selectedPanel.next.name.value }} · {{ selectedPanel.next.cost }}</template>
                  <template v-else>הושלם במלואו</template>
                </button>
              </section>
              <div class="ft-sr-live" aria-live="polite">{{ liveAnnouncement }}</div>
              <div v-if="pendingUpgrade" class="ft-modal-scrim" @click.self="resolveUpgradeChoice(false)">
                <section class="ft-modal" role="dialog" aria-modal="true" :aria-label="pendingUpgrade.title">
                  <h2>{{ pendingUpgrade.title }}</h2>
                  <p>{{ pendingUpgrade.description }}</p>
                  <dl>
                    <div><dt>רמה נוכחית</dt><dd>{{ pendingUpgrade.currentLevel }}</dd></div>
                    <div><dt>רמה חדשה</dt><dd>{{ pendingUpgrade.nextLevel }}</dd></div>
                    <div><dt>מחיר</dt><dd>{{ pendingUpgrade.cost }}</dd></div>
                  </dl>
                  <div class="ft-modal-actions">
                    <button type="button" @click="resolveUpgradeChoice(false)">ביטול</button>
                    <button ref="confirmBtn" type="button" class="confirm" @click="resolveUpgradeChoice(true)">שדרוג</button>
                  </div>
                </section>
              </div>
            </div>`,
            data: function () {
                return {
                    ftTheme: resolveFactoryTheme(),
                    weights: [],
                    purchasedMap: {},
                    money: 40,
                    moneyPop: false,
                    pendingUpgrade: null,
                    selectedMachine: null,
                    liveAnnouncement: '',
                    reducedMotion: false,
                    delivered: 0
                };
            },
            computed: {
                list: function () { return getDataList(this.currentApp.listName); },
                derived: function () {
                    return deriveFactoryState(this.list, Object.keys(this.purchasedMap).filter(function (k) { return this.purchasedMap[k]; }, this).map(Number));
                },
                displayMoney: function () { return Math.floor(this.money); },
                ppm: function () { return Math.round(60 / (this.cycleDuration() / 1000) * this.productValue()); },
                selectedConfig: function () { return this.selectedMachine ? STATION_INFO[this.selectedMachine] : null; },
                selectedPanel: function () {
                    var id = this.selectedMachine;
                    if (!id) return {};
                    var next = this.nextUpgradeFor(id);
                    if (id === 'crew') {
                        return {levelLabel: 'עובדים במשמרת', level: 2 + this.derived.workersHired, speed: '—', value: this.productValue(), next: next};
                    }
                    return {
                        levelLabel: 'רמה',
                        level: this.derived.machines[id] || 1,
                        speed: (Math.round(1000 / this.cycleDuration() * 10) / 10) + ' לשנייה',
                        value: this.productValue(),
                        next: next
                    };
                }
            },
            methods: {
                storageKey: function (suffix) { return this.currentAppId + '_ft_' + suffix; },
                loadMoney: function () { var stored = Number(getLocalStorage(this.storageKey('money'), NaN)); this.money = Number.isFinite(stored) ? stored : 40; },
                saveMoney: function () { setLocalStorage(this.storageKey('money'), Math.floor(this.money)); },
                loadPurchased: function () {
                    var stored = getLocalStorage(this.storageKey('purchased'), []);
                    var map = {};
                    (stored || []).forEach(function (i) { map[i] = true; });
                    this.purchasedMap = map;
                },
                savePurchased: function () {
                    setLocalStorage(this.storageKey('purchased'), Object.keys(this.purchasedMap).filter(function (k) { return this.purchasedMap[k]; }, this).map(Number));
                },
                create: function () {
                    this.ftTheme = resolveFactoryTheme();
                    this.loadMoney();
                    this.loadPurchased();
                    this.weights = getWeightsForKey(this.currentAppId, getSetItems(this.currentApp), this.list);
                    // The factory introduces unlocked upgrades inside the scene itself, so the
                    // shared "news" interstitial must not hijack the route after a purchase.
                    if (typeof setLocalStorage === 'function') setLocalStorage(this.currentAppId + '_new_items', []);
                },
                isCurrentRoute: function () {
                    return this.$route && this.$route.params.currentAppId === this.currentAppId && this.$route.path.indexOf('/play/factory_tycoon/') === 0;
                },
                cycleDuration: function () {
                    var d = this.derived;
                    return Math.max(850, FT_BASE_CYCLE - (d.sawmillLevel - 1) * 280 - (d.workshopLevel - 1) * 120 - (d.packagingLevel - 1) * 120);
                },
                productValue: function () { return FT_BASE_VALUE + this.derived.workshopLevel * 5 + this.derived.packagingLevel * 7; },
                nextUpgradeFor: function (id) {
                    var keys = id === 'crew' ? CREW_KEYS : [id];
                    for (var k = 0; k < keys.length; k++) {
                        for (var i = 0; i < this.list.length; i++) {
                            var item = this.list[i];
                            if (item && item.machine === keys[k] && this.weights[i] > 0 && !this.purchasedMap[i]) {
                                return Object.assign({index: i}, item);
                            }
                        }
                    }
                    return null;
                },
                // ---- Phaser bootstrap ----
                bootScene: function () {
                    if (typeof Phaser === 'undefined' || !this.$refs.stage) return;
                    var self = this;
                    var bridge = {
                        reducedMotion: this.reducedMotion,
                        getDerived: function () { return self.derived; },
                        cycleDuration: function () { return self.cycleDuration(); },
                        productValue: function () { return self.productValue(); },
                        onSelect: function (id) { self.selectedMachine = id && STATION_INFO[id] ? id : null; },
                        onDeliver: function (value) { self.completeDelivery(value); },
                        attach: function (api) { self._sceneApi = api; }
                    };
                    var scene = buildFactoryScene(bridge);
                    this._game = new Phaser.Game({
                        type: Phaser.AUTO,
                        parent: this.$refs.stage,
                        backgroundColor: '#20263a',
                        scale: {mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER},
                        resolution: Math.min(window.devicePixelRatio || 1, 2),
                        render: {antialias: true, roundPixels: false},
                        scene: scene
                    });
                },
                completeDelivery: function (value) {
                    this.delivered += 1;
                    this.money += value;
                    if (this.delivered % 3 === 0) this.saveMoney();
                    this.moneyPop = true;
                    clearTimeout(this._moneyTimerFt);
                    var self = this;
                    this._moneyTimerFt = setTimeout(function () { self.moneyPop = false; }, 260);
                },
                fitFactory: function () { if (this._sceneApi) this._sceneApi.fit(); },
                zoomIn: function () { if (this._sceneApi) this._sceneApi.zoomIn(); },
                zoomOut: function () { if (this._sceneApi) this._sceneApi.zoomOut(); },
                clearSelection: function () {
                    this.selectedMachine = null;
                    if (this._sceneApi) this._sceneApi.clearSelection();
                },
                openUpgradeApproval: function (definition) {
                    var self = this;
                    return new Promise(function (resolve) {
                        self.pendingUpgrade = definition;
                        self._resolveUpgradeFt = resolve;
                        self.$nextTick(function () { if (self.$refs.confirmBtn) self.$refs.confirmBtn.focus(); });
                    });
                },
                confirmUpgrade: function (item) { return UpgradeApprovalService.requestUpgradeApproval(this, getUpgradeDefinition(item)); },
                resolveUpgradeChoice: function (accepted) {
                    if (!this.pendingUpgrade) return;
                    var resolve = this._resolveUpgradeFt;
                    this.pendingUpgrade = null;
                    this._resolveUpgradeFt = null;
                    if (resolve) resolve(accepted);
                },
                attemptUpgrade: async function (index) {
                    if (this._upgradeBusyFt || this.pendingUpgrade) return;
                    var item = this.list[index];
                    if (!item || this.weights[index] <= 0 || this.purchasedMap[index] || this.money < item.cost) return;
                    this._upgradeBusyFt = true;
                    var accepted = false;
                    try {
                        accepted = await this.confirmUpgrade(item);
                    } finally {
                        this._upgradeBusyFt = false;
                    }
                    if (this._destroyedFt || !this.isCurrentRoute() || !accepted) return;
                    this.money -= item.cost;
                    this.saveMoney();
                    this.$set(this.purchasedMap, index, true);
                    this.savePurchased();
                    this.liveAnnouncement = 'שודרג: ' + item.name.value;
                    try { successSound.play(); } catch (e) {}
                    var updatedWeights = updateWeightForKey(this.currentAppId, index, -15);
                    // updateWeightForKey returns undefined when stored weights are missing
                    // (e.g. the first-visit version check wiped localStorage after we booted);
                    // re-seed instead of destroying the in-memory tech tree.
                    this.weights = Array.isArray(updatedWeights)
                        ? updatedWeights
                        : getWeightsForKey(this.currentAppId, getSetItems(this.currentApp), this.list);
                    this.score += 1;
                    if (this._sceneApi) {
                        this._sceneApi.applyDerived();
                        var group = /^worker/.test(item.machine) ? 'crew' : item.machine;
                        this._sceneApi.levelUpFx(group);
                    }
                    if (typeof setLocalStorage === 'function') setLocalStorage(this.currentAppId + '_new_items', []);
                    if (this.reloadProgress()) this.saveScore();
                },
                exitGame: function () {
                    if (typeof parseAdventureId === 'function') {
                        var parsed = parseAdventureId(this.currentAppId);
                        if (parsed) { this.$router.push('/adventure/world/' + parsed.world.id); return; }
                    }
                    this.$router.push('/app/' + this.currentAppId);
                }
            },
            mounted: function () {
                this._destroyedFt = false;
                this._mediaFt = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
                this.reducedMotion = !!(this._mediaFt && this._mediaFt.matches);
                this.bootScene();
            },
            beforeDestroy: function () {
                this._destroyedFt = true;
                clearTimeout(this._moneyTimerFt);
                this.saveMoney();
                if (this.pendingUpgrade) this.resolveUpgradeChoice(false);
                if (this._game) {
                    try { this._game.destroy(true); } catch (e) {}
                    this._game = null;
                }
                this._sceneApi = null;
            }
        }));
    }

    global.FT_DEFAULT_MACHINES = FT_DEFAULT_MACHINES;
    global.FT_STATIONS = L;
    global.validateFactoryUpgrades = validateFactoryUpgrades;
    global.deriveFactoryState = deriveFactoryState;
    global.resolveFactoryTheme = resolveFactoryTheme;
    global.getFactoryUpgradeDefinition = getUpgradeDefinition;
    global.FactoryUpgradeApprovalService = UpgradeApprovalService;
    global.createFactoryTycoonComponent = createFactoryTycoonComponent;
})(typeof window !== 'undefined' ? window : globalThis);
