const CACHE_NAME = 'my-app-cache-v40';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/adventure.html',
  '/manifest.json',
  '/data.js',
  '/apps.js',
  '/worlds.js',
  '/adventure.js',
  '/adventure.css',
  '/games/water-pipeline.js',
  '/games/water-pipeline.css',
  '/games/factory-tycoon.js',
  '/games/factory-tycoon.css',
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

const urlsToCache = CORE_ASSETS.concat(LETTER_SOUNDS).concat(COMPANION_ANIMATIONS).concat(ADVENTURE_ART).concat(FACTORY_ART);

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

  // Network-first for navigations and scripts (so updates show without waiting
  // for a cache bump). On navigation fallback, serve the dedicated adventure
  // entry for its own link; index.html otherwise.
  if (event.request.mode === 'navigate' || event.request.destination === 'script') {
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
