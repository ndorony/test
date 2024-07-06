const CACHE_NAME = 'my-app-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css',
  'https://unpkg.com/vue@2',
  'https://unpkg.com/vue-router@2.0.0/dist/vue-router.js',
  'https://cdnjs.cloudflare.com/ajax/libs/he/1.2.0/he.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js',
  '/.idea/inspectionProfiles/profiles_settings.xml',
  '/sounds/letters/a.mp3',
  '/sounds/letters/b.mp3',
  '/sounds/letters/c.mp3',
  '/sounds/letters/d.mp3',
  '/sounds/letters/e.mp3',
  '/sounds/letters/f.mp3',
  '/sounds/letters/g.mp3',
  '/sounds/letters/h.mp3',
  '/sounds/letters/i.mp3',
  '/sounds/letters/j.mp3',
  '/sounds/letters/k.mp3',
  '/sounds/letters/l.mp3',
  '/sounds/letters/m.mp3',
  '/sounds/letters/n.mp3',
  '/sounds/letters/o.mp3',
  '/sounds/letters/p.mp3',
  '/sounds/letters/q.mp3',
  '/sounds/letters/r.mp3',
  '/sounds/letters/s.mp3',
  '/sounds/letters/t.mp3',
  '/sounds/letters/u.mp3',
  '/sounds/letters/v.mp3',
  '/sounds/letters/w.mp3',
  '/sounds/letters/x.mp3',
  '/sounds/letters/y.mp3',
  '/sounds/letters/z.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
