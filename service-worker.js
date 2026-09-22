const CACHE_NAME = 'my-app-cache-v220-momentum-factory';
const CORE_ASSETS = [
  '/assets/momentum-factory/belt.png',

  '/assets/momentum-factory/worker.png?v=4cab01c741ac',
  '/assets/momentum-factory/worker-task.png?v=00d1171837aa',

  '/assets/momentum-factory/crew-gold.png',

  '/assets/momentum-factory/crew-mint.png',
  '/assets/momentum-factory/crew-berry.png',
  '/games/momentum-factory.js?v=216',
  '/games/momentum-factory.css?v=216',
  '/assets/momentum-factory/projection.js?v=213',
  '/assets/momentum-factory/floor.png?v=213',
  '/assets/momentum-factory/ground.png?v=213',
  '/games/momentum-factory.js',
  '/games/momentum-factory.css',
  '/assets/momentum-factory/assembly-1-work.png',
  '/assets/momentum-factory/assembly-1.png',
  '/assets/momentum-factory/assembly-2-work.png',
  '/assets/momentum-factory/assembly-2.png',
  '/assets/momentum-factory/assembly-3-work.png',
  '/assets/momentum-factory/assembly-3.png',
  '/assets/momentum-factory/box.png',
  '/assets/momentum-factory/floor.png',
  '/assets/momentum-factory/ground.png',
  '/assets/momentum-factory/link-1-2.png',
  '/assets/momentum-factory/link-1-3.png',
  '/assets/momentum-factory/link-1-4.png',
  '/assets/momentum-factory/link-1-5.png',
  '/assets/momentum-factory/link-1-6.png',
  '/assets/momentum-factory/link-2-1.png',
  '/assets/momentum-factory/link-2-3.png',
  '/assets/momentum-factory/link-2-4.png',
  '/assets/momentum-factory/link-2-5.png',
  '/assets/momentum-factory/link-2-6.png',
  '/assets/momentum-factory/link-3-1.png',
  '/assets/momentum-factory/link-3-2.png',
  '/assets/momentum-factory/link-3-4.png',
  '/assets/momentum-factory/link-3-5.png',
  '/assets/momentum-factory/link-3-6.png',
  '/assets/momentum-factory/link-4-1.png',
  '/assets/momentum-factory/link-4-2.png',
  '/assets/momentum-factory/link-4-3.png',
  '/assets/momentum-factory/link-4-5.png',
  '/assets/momentum-factory/link-4-6.png',
  '/assets/momentum-factory/link-5-1.png',
  '/assets/momentum-factory/link-5-2.png',
  '/assets/momentum-factory/link-5-3.png',
  '/assets/momentum-factory/link-5-4.png',
  '/assets/momentum-factory/link-5-6.png',
  '/assets/momentum-factory/link-6-1.png',
  '/assets/momentum-factory/link-6-2.png',
  '/assets/momentum-factory/link-6-3.png',
  '/assets/momentum-factory/link-6-4.png',
  '/assets/momentum-factory/link-6-5.png',
  '/assets/momentum-factory/packing-1-work.png',
  '/assets/momentum-factory/packing-1.png',
  '/assets/momentum-factory/packing-2-work.png',
  '/assets/momentum-factory/packing-2.png',
  '/assets/momentum-factory/packing-3-work.png',
  '/assets/momentum-factory/packing-3.png',
  '/assets/momentum-factory/part.png',
  '/assets/momentum-factory/press-1-work.png',
  '/assets/momentum-factory/press-1.png',
  '/assets/momentum-factory/press-2-work.png',
  '/assets/momentum-factory/press-2.png',
  '/assets/momentum-factory/press-3-work.png',
  '/assets/momentum-factory/press-3.png',
  '/assets/momentum-factory/product.png',
  '/assets/momentum-factory/projection.js',
  '/assets/momentum-factory/raw.png',
  '/assets/momentum-factory/shipping-1-work.png',
  '/assets/momentum-factory/shipping-1.png',
  '/assets/momentum-factory/shipping-2-work.png',
  '/assets/momentum-factory/shipping-2.png',
  '/assets/momentum-factory/shipping-3-work.png',
  '/assets/momentum-factory/shipping-3.png',
  '/assets/momentum-factory/supply-1-work.png',
  '/assets/momentum-factory/supply-1.png',
  '/assets/momentum-factory/supply-2-work.png',
  '/assets/momentum-factory/supply-2.png',
  '/assets/momentum-factory/supply-3-work.png',
  '/assets/momentum-factory/supply-3.png',
  '/assets/momentum-factory/worker-task.png',
  '/assets/momentum-factory/worker.png',


  "/assets/models/shooter/shooter_models.js",
  "/data.js?v=2",
  "/firebase.js",
  "/tester.js?v=19",
  '/',
  '/index.html',
  '/adventure.html',
  '/manifest.json',
  '/data.js',
  '/apps.js',
  '/groups.js',
  '/worlds.js',
  '/adventure.js',
  '/adventure.css',
  '/games/hexkeep.js',
  '/games/hexkeep-map.js',
  '/games/hexkeep.css',
  '/assets/hexkeep/projection.js',
  '/assets/hexkeep/walk.js',
  '/assets/hexkeep/enemy-walk.png',
  '/assets/hexkeep/enemy-fight.png',
  '/assets/hexkeep/guard-fight.png',
  '/assets/hexkeep/village.png',
  '/assets/hexkeep/marsh.png',
  '/assets/hexkeep/ridge.png',
  '/assets/hexkeep/frost.png',
  '/assets/hexkeep/ash.png',
  '/assets/hexkeep/river.png',
  '/assets/hexkeep/coast.png',
  '/assets/hexkeep/harbour.png',
  '/assets/hexkeep/atlas/bridge.png',
  '/assets/hexkeep/atlas/bush.png',
  '/assets/hexkeep/atlas/cactus.png',
  '/assets/hexkeep/atlas/campfire.png',
  '/assets/hexkeep/atlas/castleTall.png',
  '/assets/hexkeep/atlas/castleWide.png',
  '/assets/hexkeep/atlas/compass.png',
  '/assets/hexkeep/atlas/dock.png',
  '/assets/hexkeep/atlas/flag.png',
  '/assets/hexkeep/atlas/graveyard.png',
  '/assets/hexkeep/atlas/houseViking.png',
  '/assets/hexkeep/atlas/houses.png',
  '/assets/hexkeep/atlas/lake.png',
  '/assets/hexkeep/atlas/lakeRound.png',
  '/assets/hexkeep/atlas/mill.png',
  '/assets/hexkeep/atlas/parchment.jpg',
  '/assets/hexkeep/atlas/rocks.png',
  '/assets/hexkeep/atlas/rocksA.png',
  '/assets/hexkeep/atlas/rocksB.png',
  '/assets/hexkeep/atlas/rocksMountain.png',
  '/assets/hexkeep/atlas/rocksTall.png',
  '/assets/hexkeep/atlas/ship.png',
  '/assets/hexkeep/atlas/skull.png',
  '/assets/hexkeep/atlas/textureWater.png',
  '/assets/hexkeep/atlas/towerWatch.png',
  '/assets/hexkeep/atlas/treePine.png',
  '/assets/hexkeep/atlas/treePineLarge.png',
  '/assets/hexkeep/atlas/treePineTall.png',
  '/assets/hexkeep/atlas/treePines.png',
  '/assets/hexkeep/atlas/treePinesSmall.png',
  '/assets/hexkeep/atlas/vulcano.png',
  '/assets/hexkeep/enemy-brute-walk.png',
  '/assets/hexkeep/enemy-brute-fight.png',
  '/assets/hexkeep/enemy-runner-walk.png',
  '/assets/hexkeep/enemy-runner-fight.png',
  '/assets/hexkeep/enemy-shaman-walk.png',
  '/assets/hexkeep/enemy-shaman-fight.png',
  '/assets/hexkeep/enemy-knight-walk.png',
  '/assets/hexkeep/enemy-knight-fight.png',
  '/assets/hexkeep/enemy-warlock-walk.png',
  '/assets/hexkeep/enemy-warlock-fight.png',
  '/assets/hexkeep/enemy-skiff-walk.png',
  '/assets/hexkeep/enemy-warship-walk.png',
  '/assets/hexkeep/enemy-manowar-walk.png',
  '/assets/hexkeep/patrol-sail.png',
  '/assets/hexkeep/guard.png',
  '/assets/hexkeep/guard-2.png',
  '/assets/hexkeep/guard-3.png',
  '/assets/hexkeep/archer-2.png',
  '/assets/hexkeep/archer-3.png',
  '/assets/hexkeep/mage-2.png',
  '/assets/hexkeep/mage-3.png',
  '/assets/hexkeep/catapult-2.png',
  '/assets/hexkeep/catapult-3.png',
  '/assets/hexkeep/shipyard.png',
  '/assets/hexkeep/shipyard-2.png',
  '/assets/hexkeep/shipyard-3.png',

  '/assets/hexkeep/archer.png',
  '/assets/hexkeep/mage.png',
  '/assets/hexkeep/catapult.png',
  '/assets/hexkeep/blacksmith.png',
  '/assets/hexkeep/well.png',
  '/assets/hexkeep/lumber.png',
  '/assets/hexkeep/barricade.png',

  '/assets/hexkeep/windmill.png',
  '/assets/hexkeep/knight.png',
  '/assets/hexkeep/enemy.png',
  '/games/water-pipeline.js',
  '/games/water-pipeline.css',
  '/games/factory-tycoon.js',
  '/games/factory-tycoon.css',
  '/games/knowledge-defense.js',
  '/games/knowledge-defense.css',
  '/games/scribble-bridge.js?v=115',
  '/games/scribble-dungeon.js',
  '/games/scribble-dungeon.css',
  '/games/scribble-platformer.js',
  '/games/scribble-platformer.css',
  '/games/crystal-arena.js',
  '/games/crystal-arena.css',
  '/tools/scribble-bridge-preview.html',
  '/tools/scribble-magic-door-preview.html',
  '/tools/scribble-fall-transition-preview.html',
  '/tools/scribble-transition-preview.css',
  '/tools/scribble-transition-preview.js',
  '/tools/scribble-magic-door-transition-adapter.js',
  '/tools/scribble-fall-transition-adapter.js?v=159',
  '/themes.js',
  '/storage.js',
  '/tester.js?v=20',
  '/sounds/success.mp3',
  '/sounds/failure.mp3',
  '/assets/svg/tall.svg',
  '/assets/svg/short.svg',
  '/assets/svg/thin.svg',
  '/assets/svg/plump.svg',
  '/assets/svg/big.svg',
  '/assets/svg/small.svg',
  '/assets/scribble-dungeons/arrow.png',
  '/assets/scribble-dungeons/floor_wall_curve.png',
  '/assets/scribble-dungeons/tile.png',
  '/assets/scribble-dungeons/wall.png',
  '/assets/scribble-dungeons/doorway.png',
  '/assets/scribble-dungeons/crate.png',
  '/assets/scribble-dungeons/trap.png',
  '/assets/scribble-dungeons/purple_character.png',
];

const LETTER_SOUNDS = 'abcdefghijklmnopqrstuvwxyz'
  .split('')
  .map(letter => `/sounds/letters/${letter}.mp3`);

const COMPANION_ANIMATIONS = ['unicorn', 'cat', 'dog', 'rabbit', 'turtle', 'penguin',
  'fox', 'butterfly', 'panda', 'dragon', 'owl']
  .map(name => `/assets/adventure/lottie/${name}.json`);

const ADVENTURE_ART = ['home_bg', 'world_letters_bg', 'world_review_bg', 'world_nikud_bg',
  'world_english_bg', 'avatar_bg', 'frame_bg', 'transition_clouds', 'reward_burst']
  .map(name => `/assets/adventure/art/${name}.jpg`);

const FACTORY_ART = ['machine-saw', 'saw-blade', 'machine-press', 'press-ram', 'machine-pack',
  'tape-roll', 'gear', 'belt-tile', 'rail-tile', 'roller', 'conveyor-leg', 'chute', 'truck',
  'wheel', 'worker-head-a', 'worker-head-b', 'worker-head-c', 'worker-torso-a', 'worker-torso-b',
  'worker-torso-c', 'worker-arm-a', 'worker-arm-b', 'worker-arm-c', 'worker-leg', 'product-log',
  'product-plank', 'product-toy', 'product-box', 'pallet', 'crate', 'barrel', 'cone', 'shelf',
  'window', 'lamp', 'fan-frame', 'fan-blades', 'pipes', 'sign', 'dock-door', 'coin', 'puff',
  'spark', 'hazard-tile']
  .map(name => `/assets/factory/${name}.svg`);

// Mirrors the SPRITES list in games/scribble-dungeon.js; tests/scribble_dungeon_test.js
// fails if the two drift apart.
const DUNGEON_ART = ['tiles', 'tiles_center', 'tiles_cracked', 'tiles_decorative', 'planks', 'wood',
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
  'weapon_sword', 'weapon_axe', 'weapon_dagger', 'weapon_hammer',
  'weapon_longsword', 'weapon_spear', 'weapon_staff', 'weapon_bow',
  'weapon_axe_double', 'weapon_axe_large',
  'red_character', 'green_character', 'purple_character', 'yellow_character',
  'red_hand', 'green_hand', 'purple_hand', 'yellow_hand']
  .map(name => `/assets/scribble-dungeons/${name}.png`);

const PLATFORMER_ART = ['tile_grass', 'tile', 'tile_top', 'tile_block', 'tile_brick', 'tile_stone',
  'tile_coin', 'tile_gem', 'tile_flag', 'tile_key', 'tile_heart',
  'tile_bush', 'tile_bushHalf', 'tile_tree', 'tile_treeTop', 'tile_treeTrunk', 'tile_fence',
  'tile_ladder', 'tile_door', 'tile_crate', 'tile_crateSmall', 'tile_bridge',
  'tile_spike', 'tile_spikes',
  'tile_castle', 'tile_roof', 'tile_column', 'tile_arch', 'tile_archColumns', 'tile_archColumn',
  'tile_archHalf', 'tile_slope', 'tile_blockDoor', 'tile_blockWindow', 'tile_hang', 'tile_fenceHigh',
  'background_cloudA', 'background_cloudB', 'background_tree', 'background_treeLarge',
  'effect_blast', 'effect_trail',
  'item_shieldRound', 'item_bow', 'item_arrow', 'item_sword', 'item_spear', 'item_blaster',
  'cart',
  'character_roundRed', 'character_roundGreen', 'character_roundPurple', 'character_roundYellow',
  'character_handRed', 'character_handGreen', 'character_handPurple', 'character_handYellow']
  .map(name => `/assets/scribble-platformer/${name}.png`);

const KNOWLEDGE_DEFENSE_ART = ["battlefield.png","build-pad.png","coin.png","enemy-captain.png","enemy-guard.png","enemy-runner.png","enemy-scout.png","flower-red.png","flower-yellow.png","grass-a.png","grass-edge.png","ground.png","keep.png","mushroom.png","portal.png","road-tile.png","road-tile2.png","rock-a.png","rock-b.png","rock-pile.png","rocket.png","shell.png","shrub.png","spark.png","tower-archer.png","tower-crystal.png","tower-rocket.png","tree-large.png","tree-oak.png","tree-small.png"].map(name => `/assets/knowledge-defense/${name}`);

const urlsToCache = [...new Set(CORE_ASSETS.concat(LETTER_SOUNDS).concat(COMPANION_ANIMATIONS)
  .concat(KNOWLEDGE_DEFENSE_ART).concat(ADVENTURE_ART).concat(FACTORY_ART).concat(DUNGEON_ART).concat(PLATFORMER_ART))];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName !== CACHE_NAME) {
          return caches.delete(cacheName);
        }
        return null;
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Network-first for navigations, scripts and stylesheets (so updates show
  // without waiting for a cache bump). Styles matter as much as scripts here: a
  // reload that pairs fresh JS with a stale stylesheet renders a broken game.
  // On navigation fallback, serve the dedicated adventure entry for its own
  // link; index.html otherwise.
  if (event.request.mode === 'navigate'
      || event.request.destination === 'script'
      || event.request.destination === 'style') {
    event.respondWith(
      fetch(event.request).then(response => {
        // Retain successful runtime scripts/styles too (including CDN libraries)
        // so a previously loaded game can bootstrap without a network connection.
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          const page = new URL(event.request.url).pathname.endsWith('/adventure.html')
            ? '/adventure.html' : '/index.html';
          return caches.match(page);
        }
        return caches.match(event.request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then(networkResponse => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        });
    })
  );
});
