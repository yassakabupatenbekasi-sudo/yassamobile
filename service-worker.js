// ============================================================
// SERVICE WORKER - YASSA Mobile PWA
// Versi: 2.0.0 (Auto-Update)
// ============================================================

const CACHE_NAME = 'yassa-cache-v2';

const STATIC_ASSETS = [
  '/yassamobile/',
  '/yassamobile/index.html',
  '/yassamobile/manifest.json',
  '/yassamobile/icon-192.png',
  '/yassamobile/icon-512.png'
];

// ---- INSTALL: Cache semua aset statis ----
self.addEventListener('install', event => {
  console.log('[SW] Installing v2...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => {
        console.log('[SW] Cache selesai, skip waiting...');
        return self.skipWaiting(); // Langsung aktif tanpa tunggu tab ditutup
      })
  );
});

// ---- ACTIVATE: Hapus cache lama, ambil alih semua client ----
self.addEventListener('activate', event => {
  console.log('[SW] Activating v2...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Hapus cache lama:', key);
            return caches.delete(key);
          })
      ))
      .then(() => {
        console.log('[SW] Mengambil alih semua client...');
        return self.clients.claim(); // Langsung kontrol semua tab/window
      })
  );
});

// ---- FETCH: Network First untuk HTML, Cache First untuk aset ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Request ke GAS backend → selalu network, jangan pernah cache
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // index.html → Network First (supaya selalu dapat versi terbaru)
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Simpan versi terbaru ke cache
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => {
          // Offline → pakai cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Aset lain (icon, manifest) → Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return response;
        });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/yassamobile/index.html');
        }
      })
  );
});

// ---- MESSAGE: Terima perintah dari app (misal: skip waiting) ----
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
