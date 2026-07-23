const CACHE_NAME = 'my-app-cache-v51';
const CORE_ASSETS = [
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
  '/games/water-pipeline.js',
  '/games/water-pipeline.css',
  '/games/factory-tycoon.js',
  '/games/factory-tycoon.css',
  '/games/knowledge-defense.js',
  '/games/knowledge-defense.css',
  '/games/scribble-dungeon.js',
  '/games/scribble-dungeon.css',
  '/themes.js',
  '/storage.js',
  '/tester.js?v=19',
  '/sounds/success.mp3',
  '/sounds/failure.mp3',
  '/assets/svg/tall.svg',
  '/assets/svg/short.svg',
  '/assets/svg/thin.svg',
  '/assets/svg/plump.svg',
  '/assets/svg/big.svg',
  '/assets/svg/small.svg'
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

const urlsToCache = CORE_ASSETS.concat(LETTER_SOUNDS).concat(COMPANION_ANIMATIONS)
  .concat(ADVENTURE_ART).concat(FACTORY_ART).concat(DUNGEON_ART);

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
      fetch(event.request).catch(() => {
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
