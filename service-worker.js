const CACHE_NAME = 'yassa-cache-v2';

const STATIC_ASSETS = [
  '/yassamobile/',
  '/yassamobile/index.html',
  '/yassamobile/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Request ke GAS → selalu network, jangan cache
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Aset statis → Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/yassamobile/index.html');
        }
      });
    })
  );
});
