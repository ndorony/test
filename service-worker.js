const CACHE_NAME = 'my-app-cache-v20';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/data.js',
  '/apps.js',
  '/themes.js',
  '/storage.js',
  '/tester.js?v=17',
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

const urlsToCache = CORE_ASSETS.concat(LETTER_SOUNDS);

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

  if (event.request.mode === 'navigate' || event.request.destination === 'script') {
    event.respondWith(
      fetch(event.request).catch(() =>
        event.request.mode === 'navigate'
          ? caches.match('/index.html')
          : caches.match(event.request)
      )
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
