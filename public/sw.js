const CACHE_NAME = 'docforge-pwa-cache-v2';

// Assets to cache immediately on SW install (warm-up cache)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/robots.txt',
  '/workers/ocr.worker.js',
  '/workers/translation.worker.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Determine if this is a request we want to cache
  const isTargetAsset = 
    url.pathname.startsWith('/models/') || 
    url.pathname.startsWith('/workers/') || 
    url.pathname.startsWith('/assets/') || 
    url.pathname === '/' ||
    url.pathname === '/index.html';

  if (!isTargetAsset || event.request.method !== 'GET') {
    return; // Let standard network request proceed
  }

  // Large models (.onnx) use a strict Cache-First strategy (never hit the network if cached)
  const isModel = url.pathname.endsWith('.onnx') || url.pathname.includes('/models/Xenova/');
  // HTML files (root entry points and all SPA navigation routes) use a Network-First strategy
  const isHtml = event.request.mode === 'navigate' || 
                 (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) ||
                 url.pathname === '/' || 
                 url.pathname === '/index.html';

  if (isModel) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
  } else if (isHtml) {
    // Network-First: always get fresh HTML from server when online, fall back to cache when offline
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Store HTML responses as /index.html so we can fall back to it for offline SPA routes
            cache.put('/index.html', responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match('/index.html');
      })
    );
  } else {
    // For static assets (js, css, icons), use Stale-While-Revalidate
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Network failed — return an offline fallback so respondWith is never undefined
          return new Response('Offline: DocForge is unavailable without a network connection.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
        return cachedResponse || fetchPromise;
      })
    );
  }
});
