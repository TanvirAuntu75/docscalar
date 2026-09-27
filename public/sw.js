const CACHE_NAME = 'docscalar-pwa-cache-v3';

// Assets to cache immediately on SW install (warm-up cache)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/robots.txt',
  '/manifest.json',
  '/workers/ocr.worker.js',
  '/workers/translation.worker.js',
  '/workers/classifier.worker.js'
];

const swScope = typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this);

/**
 * Normalizes input into a standard URL object.
 */
function toUrl(input) {
  if (!input) return null;
  if (input instanceof URL) return input;
  try {
    const base = (swScope && swScope.location && swScope.location.origin) ? swScope.location.origin : 'https://docscalar.com';
    return new URL(typeof input === 'string' ? input : (input.url || ''), base);
  } catch {
    return null;
  }
}

/**
 * Determines whether a given URL is a target asset for caching.
 * Matches:
 *  - Models: /models/, .onnx, .wasm
 *  - Workers: /workers/
 *  - Vite bundle assets: /assets/
 *  - PDF.js CMap tables: /cmaps/, .bcmap
 *  - Standard font definitions: /standard_fonts/, /fonts/, .properties, .pfb, .ttf, .otf, .woff, .woff2
 *  - Root entry points: /, /index.html, /favicon.svg, /manifest.json, /robots.txt
 * 
 * Invariants:
 *  - Strictly ignores non-HTTP(S) schemes (e.g. chrome-extension:, data:, blob:)
 *  - Strictly bypasses dynamic backend APIs (/api/...) and health endpoints (/health)
 *  - Navigation/HTML requests must be same-origin to prevent external redirect/OAuth cache poisoning
 */
function isTargetAsset(urlInput, request = null) {
  const url = toUrl(urlInput);
  if (!url) return false;

  // Protocol guard: Only http: and https: are supported by Cache API
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  const pathname = url.pathname.toLowerCase();

  // Strict API & dynamic backend bypass
  if (pathname.startsWith('/api/') || pathname === '/api' || pathname === '/health') {
    return false;
  }

  const swOrigin = swScope && swScope.location ? swScope.location.origin : null;
  const isSameOrigin = !swOrigin || url.origin === swOrigin;

  // HTML / SPA navigation check: MUST be same-origin to prevent external OAuth/login cache poisoning
  const isNav = Boolean(
    isSameOrigin && request && (
      request.mode === 'navigate' ||
      (request.headers && typeof request.headers.get === 'function' && request.headers.get('accept') && request.headers.get('accept').includes('text/html'))
    )
  );

  return (
    isNav ||
    pathname.startsWith('/models/') ||
    pathname.includes('/models/') ||
    pathname.startsWith('/workers/') ||
    pathname.includes('/workers/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/cmaps/') ||
    pathname.includes('/cmaps/') ||
    pathname.startsWith('/standard_fonts/') ||
    pathname.includes('/standard_fonts/') ||
    pathname.startsWith('/fonts/') ||
    pathname.endsWith('.bcmap') ||
    pathname.endsWith('.properties') ||
    pathname.endsWith('.pfb') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.otf') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.onnx') ||
    pathname.endsWith('.wasm') ||
    pathname === '/' ||
    pathname === '/index.html' ||
    pathname === '/favicon.svg' ||
    pathname === '/manifest.json' ||
    pathname === '/robots.txt'
  );
}

/**
 * Checks if the request should use Cache-First strategy.
 * Large static assets (models, CMaps, font definitions, wasm) are immutable once deployed.
 */
function isCacheFirstAsset(urlInput) {
  const url = toUrl(urlInput);
  if (!url) return false;

  const pathname = url.pathname.toLowerCase();

  // Strictly reject API endpoints even if they contain subpaths like /models/
  if (pathname.startsWith('/api/') || pathname === '/api') {
    return false;
  }

  return (
    pathname.endsWith('.onnx') ||
    pathname.endsWith('.wasm') ||
    pathname.includes('/models/') ||
    pathname.startsWith('/cmaps/') ||
    pathname.includes('/cmaps/') ||
    pathname.endsWith('.bcmap') ||
    pathname.startsWith('/standard_fonts/') ||
    pathname.includes('/standard_fonts/') ||
    pathname.endsWith('.properties') ||
    pathname.endsWith('.pfb') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.otf') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.startsWith('/fonts/')
  );
}

/**
 * Checks if the request is for HTML / SPA navigation routes (Network-First).
 * Strictly guards against null/undefined requests and cross-origin navigations.
 */
function isHtmlRequest(urlInput, request = null) {
  const url = toUrl(urlInput);
  if (!url) return false;

  const pathname = url.pathname.toLowerCase();
  if (pathname.startsWith('/api/') || pathname === '/api') {
    return false;
  }

  const swOrigin = swScope && swScope.location ? swScope.location.origin : null;
  const isSameOrigin = !swOrigin || url.origin === swOrigin;
  if (!isSameOrigin) {
    return false;
  }

  const isNav = Boolean(request && request.mode === 'navigate');
  const acceptsHtml = Boolean(
    request &&
    request.headers &&
    typeof request.headers.get === 'function' &&
    request.headers.get('accept') &&
    request.headers.get('accept').includes('text/html')
  );
  const isRootOrIndex = pathname === '/' || pathname === '/index.html';
  return isNav || acceptsHtml || isRootOrIndex;
}

/**
 * Determines the caching strategy for a given request.
 * Returns: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only'
 */
function getStrategy(request) {
  const reqObj = typeof request === 'string' ? { url: request, method: 'GET' } : (request || {});
  const url = toUrl(reqObj.url);
  const method = reqObj.method || 'GET';

  if (!url || method !== 'GET' || !isTargetAsset(url, reqObj)) {
    return 'network-only';
  }
  if (isCacheFirstAsset(url)) {
    return 'cache-first';
  }
  if (isHtmlRequest(url, reqObj)) {
    return 'network-first';
  }
  return 'stale-while-revalidate';
}

if (swScope && swScope.addEventListener) {
  swScope.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      }).then(() => {
        if (typeof swScope.skipWaiting === 'function') {
          return swScope.skipWaiting();
        }
      })
    );
  });

  swScope.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }).then(() => {
        if (swScope.clients && typeof swScope.clients.claim === 'function') {
          return swScope.clients.claim();
        }
      })
    );
  });

  swScope.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = toUrl(request.url);

    // Protocol & target asset guard: only GET and target HTTP/HTTPS assets
    if (!url || request.method !== 'GET' || !isTargetAsset(url, request)) {
      return; // Let standard network request proceed
    }

    const isCacheFirst = isCacheFirstAsset(url);
    const isHtml = isHtmlRequest(url, request);

    if (isCacheFirst) {
      // 1. Strict Cache-First Strategy
      // Large static models (.onnx, .wasm), PDF.js CMaps (.bcmap), and font definitions (.pfb, .properties, .ttf)
      // are immutable; never hit network once cached.
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            const cacheWritePromise = caches.open(CACHE_NAME).then((cache) => {
              return cache.put(request, responseToCache);
            });
            if (typeof event.waitUntil === 'function') {
              event.waitUntil(cacheWritePromise);
            }
            return networkResponse;
          }).catch(() => {
            return new Response('Offline: DocScalar asset unavailable without a network connection.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
        })
      );
    } else if (isHtml) {
      // 2. Network-First Strategy
      // HTML entry points and same-origin SPA navigation: always fetch fresh from server, fall back to /index.html if offline.
      event.respondWith(
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            const cacheWritePromise = caches.open(CACHE_NAME).then((cache) => {
              return cache.put('/index.html', responseToCache);
            });
            if (typeof event.waitUntil === 'function') {
              event.waitUntil(cacheWritePromise);
            }
          }
          return networkResponse;
        }).catch(() => {
          return caches.match('/index.html').then((cachedHtml) => {
            if (cachedHtml) {
              return cachedHtml;
            }
            return new Response('Offline: DocScalar is unavailable without a network connection.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
        })
      );
    } else {
      // 3. Stale-While-Revalidate Strategy
      // Static assets (workers, JS bundles, CSS, icons): serve cached copy immediately, update cache in background.
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          return caches.open(CACHE_NAME).then((cache) => {
            return cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return new Response('Offline: DocScalar asset unavailable without a network connection.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });

      // Synchronously register background revalidation promise with extendable event lifecycle
      if (typeof event.waitUntil === 'function') {
        event.waitUntil(fetchPromise);
      }

      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          return cachedResponse || fetchPromise;
        })
      );
    }
  });
}

// Expose utilities on worker scope (self in browser ServiceWorker, global in test environments)
if (swScope) {
  swScope.CACHE_NAME = CACHE_NAME;
  swScope.PRECACHE_ASSETS = PRECACHE_ASSETS;
  swScope.isTargetAsset = isTargetAsset;
  swScope.isCacheFirstAsset = isCacheFirstAsset;
  swScope.isHtmlRequest = isHtmlRequest;
  swScope.getStrategy = getStrategy;
  swScope.toUrl = toUrl;
}

// Module export for Node.js test environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CACHE_NAME,
    PRECACHE_ASSETS,
    isTargetAsset,
    isCacheFirstAsset,
    isHtmlRequest,
    getStrategy,
    toUrl
  };
}
