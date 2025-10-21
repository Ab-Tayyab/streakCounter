const CACHE_VERSION = 'v4';
const CACHE_NAME = `streak-counter-${CACHE_VERSION}`;
const urlsToCache = [
  '/streakCounter/',
  '/streakCounter/index.html',
  '/streakCounter/style.css',
  '/streakCounter/script.js',
  '/streakCounter/icon-192.png',
  '/streakCounter/icon-512.png',
];

// ========== INSTALL ==========
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// ========== ACTIVATE ==========
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ========== FETCH ==========
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// ========== AUTO-UPDATE MESSAGE ==========
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
