const CACHE_NAME = 'my-app-cache-v200-hexkeep';
// Third-party libraries, vendored under /vendor at the versions index.html used
// to pull from unpkg/cdnjs/jsdelivr/gstatic. They are listed first because they
// are what the app cannot start without: with no internet and no local copy,
// Vue never defines and the page is blank. Analytics (googletagmanager) is
// deliberately absent — see vendor/analytics.js.
const VENDOR_ASSETS = [
  '/vendor/analytics.js',
  '/vendor/material-icons.css',
  '/vendor/material-icons-v145.woff2',
  '/vendor/materialize-1.0.0.min.css',
  '/vendor/materialize-1.0.0.min.js',
  '/vendor/vue-2.7.16.js',
  '/vendor/vue-router-2.0.0.js',
  '/vendor/he-1.2.0.min.js',
  '/vendor/three-0.128.0.min.js',
  '/vendor/three-0.128.0-GLTFLoader.js',
  '/vendor/phaser-3.85.2.min.js',
  '/vendor/lottie-5.12.2.min.js',
  '/vendor/tesseract-2.1.0.min.js',
  '/vendor/firebase-9.23.0-app-compat.js',
  '/vendor/firebase-9.23.0-auth-compat.js',
  '/vendor/firebase-9.23.0-firestore-compat.js'
];
const CORE_ASSETS = [
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
  '/learnbox-bridge.js',
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
  '/assets/hexkeep/guard.png',
  '/assets/hexkeep/guard-2.png',
  '/assets/hexkeep/guard-3.png',
  '/assets/hexkeep/archer-2.png',
  '/assets/hexkeep/archer-3.png',
  '/assets/hexkeep/mage-2.png',
  '/assets/hexkeep/mage-3.png',
  '/assets/hexkeep/catapult-2.png',
  '/assets/hexkeep/catapult-3.png',

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

const urlsToCache = [...new Set(VENDOR_ASSETS.concat(CORE_ASSETS).concat(LETTER_SOUNDS).concat(COMPANION_ANIMATIONS)
  .concat(KNOWLEDGE_DEFENSE_ART).concat(ADVENTURE_ART).concat(FACTORY_ART).concat(DUNGEON_ART).concat(PLATFORMER_ART))];

self.addEventListener('install', event => {
  self.skipWaiting();
  // cache.addAll() is all-or-nothing: one 404 anywhere in the manifest rejects
  // the whole install, and the app is then left with no offline cache at all.
  // Six entries had drifted out of the tree that way, so every child was
  // running uncached without any visible symptom while the box was reachable.
  // Caching each asset on its own trades a complete cache for a best-effort
  // one, which is the right way round: a missing background is a cosmetic gap,
  // a missing Vue is a blank screen. tests/offline_assets_test.js keeps the
  // manifest honest so this tolerance never has to be used in practice.
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => Promise.all(
      urlsToCache.map(url => cache.add(url).catch(() => null))
    ))
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

  // LearnBox API responses are per-child, per-session state — "is a profile
  // selected?", "what is the balance?". Caching any of them would freeze that
  // answer until the next cache bump, so the whole namespace goes to the
  // network and is never stored. The Cache API ignores Cache-Control, so the
  // server cannot opt out on its own.
  if (new URL(event.request.url).pathname.indexOf('/api/') === 0) {
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
