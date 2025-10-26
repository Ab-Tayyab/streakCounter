// ====================== AUTO-UPDATE SERVICE WORKER ======================
const CACHE_PREFIX = 'streak-counter';
const CACHE_VERSION = Date.now().toString(); // auto change on deploy
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;

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
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );

  // Notify all clients to reload
  self.clients.matchAll({ type: 'window' }).then(clients => {
    for (const client of clients) {
      client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
    }
  });
});

// ========== FETCH ==========
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    )
  );
});

// ========== MANUAL SKIP WAITING ==========
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
