// ============================================================
// SERVICE WORKER - YASSA Mobile PWA
// Versi: 2.1.0 (Auto-Update)
// URL: https://yassa-mobile.github.io/yassamobile/
// ============================================================
// ============================================================
// FIREBASE MESSAGING SERVICE WORKER - YASSA Mobile
// PENTING: Tambahkan kode ini ke service-worker.js yang sudah ada
// Letakkan di BAGIAN PALING ATAS file service-worker.js
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAKMECZeKWpbYz5fB_1dWNAaa5uiqoUwIU",
  authDomain: "yassamobile-1e4d2998.firebaseapp.com",
  projectId: "yassamobile-1e4d2998",
  storageBucket: "yassamobile-1e4d2998.firebasestorage.app",
  messagingSenderId: "1071864272227",
  appId: "1:1071864272227:web:78b1354aa825b713d36f56"
});

const messaging = firebase.messaging();

// ---- Tampilkan notifikasi saat app di background/tertutup ----
messaging.onBackgroundMessage((payload) => {
  try {
    console.log('[SW-FCM] Notifikasi background:', payload);

    const { title, body } = payload.notification;

    return self.registration.showNotification(title, {
      body: body,
      icon: '/yassamobile/icon-192.png',
      badge: '/yassamobile/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'yassa-notif', // Supaya tidak menumpuk
      renotify: true,
      data: { url: '/yassamobile/' }
    });
  } catch (err) {
    console.error('[FCM] Error menampilkan notifikasi background:', err);
  }
});

// ---- Klik notifikasi → buka app ----
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Kalau app sudah terbuka → fokus ke tab itu
        for (const client of clientList) {
          if (client.url.includes('/yassamobile/') && 'focus' in client) {
            return client.focus();
          }
        }
        // Kalau belum terbuka → buka tab baru
        if (clients.openWindow) {
          return clients.openWindow('/yassamobile/');
        }
      })
  );
});
const CACHE_NAME = 'yassa-cache-v3';

const STATIC_ASSETS = [
  '/yassamobile/',
  '/yassamobile/index.html',
  '/yassamobile/manifest.json',
  '/yassamobile/icon-192.png',
  '/yassamobile/icon-512.png'
];

// ---- INSTALL: Cache semua aset statis ----
self.addEventListener('install', event => {
  console.log('[SW] Installing v3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => {
        console.log('[SW] Cache selesai, skip waiting...');
        return self.skipWaiting();
      })
  );
});

// ---- ACTIVATE: Hapus cache lama, ambil alih semua client ----
self.addEventListener('activate', event => {
  console.log('[SW] Activating v3...');
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
        return self.clients.claim();
      })
  );
});

// ---- FETCH: Network First untuk HTML, Cache First untuk aset ----
self.addEventListener('fetch', event => {
  // Jangan cache POST request
  if (event.request.method !== 'GET') return;

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
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => {
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

// ---- MESSAGE: Terima perintah dari app ----
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
