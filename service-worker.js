const CACHE_NAME = 'my-app-cache-v32';
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
  '/themes.js',
  '/storage.js',
  '/tester.js',
  '/sounds/success.mp3',
  '/sounds/failure.mp3'
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

const urlsToCache = CORE_ASSETS.concat(LETTER_SOUNDS).concat(COMPANION_ANIMATIONS).concat(ADVENTURE_ART);

self.addEventListener('install', event => {
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
    ))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    // Serve the dedicated adventure entry for its own link; index.html otherwise.
    const page = new URL(event.request.url).pathname.endsWith('/adventure.html')
      ? '/adventure.html' : '/index.html';
    event.respondWith(
      caches.match(page).then(cached => cached || fetch(event.request))
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
