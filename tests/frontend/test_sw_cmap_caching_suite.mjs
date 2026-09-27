// Automated Molecular Test Suite: Service Worker PDF CMap, Standard Font & Worker Caching
// Topic 2: Service Worker v3 Upgrade, Cache-First Glyph Tables & Lifecycle Verification

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testNumber, description) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] Area ${testNumber}: ${description}`);
  } else {
    failedTests++;
    failures.push({ testNumber, description });
    console.error(`  ✗ [FAIL] Area ${testNumber}: ${description}`);
  }
}

console.log('================================================================');
console.log('TOPIC 2: SERVICE WORKER PDF CMAP & FONT CACHING TEST SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SETUP: Load and instantiate public/sw.js in simulated ServiceWorker Environment
// -----------------------------------------------------------------------------
const swPath = path.join(rootDir, 'public', 'sw.js');
const swCode = fs.readFileSync(swPath, 'utf8');

// Event listener capture and mock caches
const registeredListeners = {};
const mockCachesStore = new Map();
let skipWaitingCalled = false;
let clientsClaimCalled = false;

class MockResponse {
  constructor(body = '', init = {}) {
    this.body = body;
    this.status = init.status !== undefined ? init.status : 200;
    this.statusText = init.statusText || (this.status === 200 ? 'OK' : 'Error');
    this.headers = new Map(Object.entries(init.headers || {}));
  }

  clone() {
    return new MockResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: Object.fromEntries(this.headers.entries())
    });
  }
}

class MockCache {
  constructor(name) {
    this.name = name;
    this.store = new Map();
  }

  async match(request) {
    const key = typeof request === 'string' ? request : request.url;
    return this.store.get(key) || null;
  }

  async put(request, response) {
    const key = typeof request === 'string' ? request : request.url;
    this.store.set(key, response);
  }

  async addAll(requests) {
    for (const req of requests) {
      this.store.set(req, new MockResponse(`Content for ${req}`));
    }
  }
}

const mockCaches = {
  async open(name) {
    if (!mockCachesStore.has(name)) {
      mockCachesStore.set(name, new MockCache(name));
    }
    return mockCachesStore.get(name);
  },
  async match(request) {
    const key = typeof request === 'string' ? request : request.url;
    for (const cache of mockCachesStore.values()) {
      if (cache.store.has(key)) {
        return cache.store.get(key);
      }
    }
    return null;
  },
  async keys() {
    return Array.from(mockCachesStore.keys());
  },
  async delete(name) {
    return mockCachesStore.delete(name);
  }
};

const sandbox = {
  self: {
    location: {
      origin: 'https://docscalar.com'
    },
    addEventListener(event, handler) {
      registeredListeners[event] = handler;
    },
    skipWaiting() {
      skipWaitingCalled = true;
      return Promise.resolve();
    },
    clients: {
      claim() {
        clientsClaimCalled = true;
        return Promise.resolve();
      }
    }
  },
  caches: mockCaches,
  Response: MockResponse,
  URL: globalThis.URL,
  console: {
    log: () => {},
    warn: () => {},
    error: () => {}
  }
};

vm.createContext(sandbox);
vm.runInContext(swCode, sandbox);

const swScope = sandbox.self;

// -----------------------------------------------------------------------------
// SECTION 1: CACHE NAME & CONFIGURATION INVARIANTS
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: Cache Name & Configuration Invariants ---');

assert(
  swScope.CACHE_NAME === 'docscalar-pwa-cache-v3',
  1,
  `CACHE_NAME is strictly 'docscalar-pwa-cache-v3' (got '${swScope.CACHE_NAME}')`
);

assert(
  swScope.CACHE_NAME !== 'docscalar-pwa-cache-v2' && !swScope.CACHE_NAME.includes('-v2'),
  2,
  'CACHE_NAME is bumped past v2 and does not match old v2 cache identifier'
);

assert(
  Array.isArray(swScope.PRECACHE_ASSETS) &&
  swScope.PRECACHE_ASSETS.includes('/') &&
  swScope.PRECACHE_ASSETS.includes('/index.html'),
  3,
  'PRECACHE_ASSETS contains root entry points "/" and "/index.html"'
);

assert(
  swScope.PRECACHE_ASSETS.includes('/manifest.json') &&
  swScope.PRECACHE_ASSETS.includes('/favicon.svg') &&
  swScope.PRECACHE_ASSETS.includes('/robots.txt'),
  4,
  'PRECACHE_ASSETS contains web manifest, favicon, and robots.txt'
);

assert(
  swScope.PRECACHE_ASSETS.includes('/workers/ocr.worker.js') &&
  swScope.PRECACHE_ASSETS.includes('/workers/translation.worker.js') &&
  swScope.PRECACHE_ASSETS.includes('/workers/classifier.worker.js'),
  5,
  'PRECACHE_ASSETS contains all 3 core web workers (ocr, translation, classifier)'
);

// -----------------------------------------------------------------------------
// SECTION 2: URL TARGET ASSET MATCHING (isTargetAsset)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: URL Target Asset Matching ---');

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/cmaps/Adobe-Japan1-6.bcmap')) === true,
  6,
  'Matches Japanese CMap asset /cmaps/Adobe-Japan1-6.bcmap'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/cmaps/Adobe-Korea1-UCS2.bcmap')) === true,
  7,
  'Matches Korean CMap asset /cmaps/Adobe-Korea1-UCS2.bcmap'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/cmaps/UniGB-UTF8-H.bcmap')) === true,
  8,
  'Matches Chinese CMap asset /cmaps/UniGB-UTF8-H.bcmap'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/standard_fonts/FoxitSerif.properties')) === true,
  9,
  'Matches standard font definition /standard_fonts/FoxitSerif.properties'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/standard_fonts/FoxitSerif.pfb')) === true,
  10,
  'Matches standard font PostScript binary /standard_fonts/FoxitSerif.pfb'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/standard_fonts/LiberationSans-Regular.ttf')) === true,
  11,
  'Matches Liberation font TrueType binary /standard_fonts/LiberationSans-Regular.ttf'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/fonts/Inter-Regular.woff2')) === true,
  12,
  'Matches generic font asset /fonts/Inter-Regular.woff2'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/models/Xenova/classifier.onnx')) === true,
  13,
  'Matches ONNX neural weights asset /models/Xenova/classifier.onnx'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/workers/ocr.worker.js')) === true,
  14,
  'Matches worker script /workers/ocr.worker.js'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/assets/index-D8fa29.js')) === true,
  15,
  'Matches Vite compiled bundle asset /assets/index-D8fa29.js'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/api/convert/merge-pdf')) === false,
  16,
  'Excludes dynamic conversion endpoint /api/convert/merge-pdf'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/api/upload')) === false,
  17,
  'Excludes upload endpoint /api/upload'
);

assert(
  swScope.isTargetAsset(new URL('https://analytics.google.com/collect')) === false,
  18,
  'Excludes external telemetry URL https://analytics.google.com/collect'
);

// -----------------------------------------------------------------------------
// SECTION 3: CACHE-FIRST ASSET CLASSIFICATION (isCacheFirstAsset)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: Cache-First Asset Classification ---');

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/cmaps/78-EUC-H.bcmap')) === true,
  19,
  'Identifies .bcmap CMap files as Cache-First assets'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/cmaps/test-table')) === true,
  20,
  'Identifies /cmaps/ directory requests as Cache-First assets'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/standard_fonts/FoxitSerif.properties')) === true,
  21,
  'Identifies .properties font definition files as Cache-First assets'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/standard_fonts/FoxitDingbats.pfb')) === true,
  22,
  'Identifies .pfb PostScript font files as Cache-First assets'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/standard_fonts/LiberationSans-Bold.ttf')) === true,
  23,
  'Identifies /standard_fonts/ TTF fonts as Cache-First assets'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/models/Xenova/encoder.onnx')) === true,
  24,
  'Identifies .onnx neural model files as Cache-First assets'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/workers/ocr.worker.js')) === false,
  25,
  'Confirms worker scripts are NOT classified as Cache-First (use Stale-While-Revalidate)'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/index.html')) === false,
  26,
  'Confirms /index.html is NOT classified as Cache-First (uses Network-First)'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/assets/main-D921.js')) === false,
  27,
  'Confirms static JS bundles are NOT classified as Cache-First (use Stale-While-Revalidate)'
);

// -----------------------------------------------------------------------------
// SECTION 4: STRATEGY DISPATCH ROUTING (getStrategy)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: Strategy Dispatch Routing ---');

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/cmaps/Adobe-Japan1-6.bcmap', method: 'GET' }) === 'cache-first',
  28,
  'GET /cmaps/Adobe-Japan1-6.bcmap dispatches to "cache-first"'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/standard_fonts/FoxitSerif.properties', method: 'GET' }) === 'cache-first',
  29,
  'GET /standard_fonts/FoxitSerif.properties dispatches to "cache-first"'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/standard_fonts/FoxitSerifBold.pfb', method: 'GET' }) === 'cache-first',
  30,
  'GET /standard_fonts/FoxitSerifBold.pfb dispatches to "cache-first"'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/models/Xenova/model.onnx', method: 'GET' }) === 'cache-first',
  31,
  'GET /models/Xenova/model.onnx dispatches to "cache-first"'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/workspace', method: 'GET', mode: 'navigate' }) === 'network-first',
  32,
  'SPA Navigation (mode: "navigate") to /workspace dispatches to "network-first"'
);

assert(
  swScope.getStrategy({
    url: 'https://docscalar.com/document-viewer',
    method: 'GET',
    headers: { get: (name) => name.toLowerCase() === 'accept' ? 'text/html,application/xhtml+xml' : null }
  }) === 'network-first',
  33,
  'Request with Accept: text/html to /document-viewer dispatches to "network-first"'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/', method: 'GET' }) === 'network-first',
  34,
  'Root entry point GET / dispatches to "network-first"'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/workers/ocr.worker.js', method: 'GET' }) === 'stale-while-revalidate',
  35,
  'GET /workers/ocr.worker.js dispatches to "stale-while-revalidate"'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/workers/translation.worker.js', method: 'GET' }) === 'stale-while-revalidate',
  36,
  'GET /workers/translation.worker.js dispatches to "stale-while-revalidate"'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/assets/main-chunk.js', method: 'GET' }) === 'stale-while-revalidate',
  37,
  'GET /assets/main-chunk.js dispatches to "stale-while-revalidate"'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/assets/theme-style.css', method: 'GET' }) === 'stale-while-revalidate',
  38,
  'GET /assets/theme-style.css dispatches to "stale-while-revalidate"'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/cmaps/test.bcmap', method: 'POST' }) === 'network-only',
  39,
  'POST request to CMap path bypasses caching (dispatches to "network-only")'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/api/convert/rotate-pdf', method: 'POST' }) === 'network-only',
  40,
  'POST /api/convert/rotate-pdf bypasses caching (dispatches to "network-only")'
);

// -----------------------------------------------------------------------------
// SECTION 5: RUNTIME FETCH SIMULATION & ERROR FALLBACKS (BRANCH-LEVEL COVERAGE)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: Runtime Fetch Simulation & Error Fallbacks ---');

async function testFetchHandler() {
  const fetchHandler = registeredListeners['fetch'];
  assert(typeof fetchHandler === 'function', 41, 'Fetch event listener is registered on Service Worker scope');

  // Case 1: Cache-First Cache Hit (CMap already in cache)
  const targetCache = await mockCaches.open(swScope.CACHE_NAME);
  const cmapUrl = 'https://docscalar.com/cmaps/Adobe-Japan1-6.bcmap';
  const cachedCmapResponse = new MockResponse('cached-cmap-binary-data', { status: 200 });
  await targetCache.put(cmapUrl, cachedCmapResponse);

  let fetchCalled = false;
  sandbox.fetch = async () => {
    fetchCalled = true;
    return new MockResponse('fresh-network-data', { status: 200 });
  };

  let respondedPromise = null;
  fetchHandler({
    request: { url: cmapUrl, method: 'GET' },
    respondWith(promise) {
      respondedPromise = promise;
    }
  });

  const cmapHitResponse = await respondedPromise;
  assert(
    cmapHitResponse.body === 'cached-cmap-binary-data' && fetchCalled === false,
    42,
    'Cache-First Cache Hit: returns cached CMap immediately with zero network request'
  );

  // Case 2: Cache-First Cache Miss (Online -> fetch and cache)
  const missingCmapUrl = 'https://docscalar.com/cmaps/UniJIS-UTF16-H.bcmap';
  fetchCalled = false;
  sandbox.fetch = async (req) => {
    fetchCalled = true;
    return new MockResponse('fresh-unijis-data', { status: 200 });
  };

  respondedPromise = null;
  fetchHandler({
    request: { url: missingCmapUrl, method: 'GET' },
    respondWith(promise) {
      respondedPromise = promise;
    }
  });

  const cmapMissResponse = await respondedPromise;
  const storedInCache = await targetCache.match(missingCmapUrl);
  assert(
    cmapMissResponse.body === 'fresh-unijis-data' &&
    fetchCalled === true &&
    storedInCache !== null &&
    storedInCache.body === 'fresh-unijis-data',
    43,
    'Cache-First Cache Miss (Online): fetches from network, stores clone in v3 cache, returns 200'
  );

  // Case 3: Cache-First Cache Miss (Offline -> fallback 503)
  const offlineCmapUrl = 'https://docscalar.com/cmaps/Adobe-CNS1-6.bcmap';
  sandbox.fetch = async () => {
    throw new Error('Network error: Device is offline');
  };

  respondedPromise = null;
  fetchHandler({
    request: { url: offlineCmapUrl, method: 'GET' },
    respondWith(promise) {
      respondedPromise = promise;
    }
  });

  const cmapOfflineResponse = await respondedPromise;
  assert(
    cmapOfflineResponse.status === 503 &&
    cmapOfflineResponse.statusText === 'Service Unavailable' &&
    cmapOfflineResponse.headers.get('Content-Type') === 'text/plain; charset=utf-8',
    44,
    'Cache-First Offline Failure: returns 503 fallback Response with correct text/plain MIME headers'
  );

  // Case 4: Network-First Online (HTML / SPA route)
  const navUrl = 'https://docscalar.com/workspace';
  sandbox.fetch = async () => {
    return new MockResponse('<!DOCTYPE html><html><body>Fresh HTML</body></html>', { status: 200 });
  };

  respondedPromise = null;
  fetchHandler({
    request: { url: navUrl, method: 'GET', mode: 'navigate' },
    respondWith(promise) {
      respondedPromise = promise;
    }
  });

  const htmlOnlineResponse = await respondedPromise;
  const cachedIndexHtml = await targetCache.match('/index.html');
  assert(
    htmlOnlineResponse.body.includes('Fresh HTML') &&
    cachedIndexHtml !== null &&
    cachedIndexHtml.body.includes('Fresh HTML'),
    45,
    'Network-First Online: fetches fresh HTML and caches copy under /index.html for offline SPA fallback'
  );

  // Case 5: Network-First Offline with Cached HTML
  sandbox.fetch = async () => {
    throw new Error('Network failed: User is offline');
  };

  respondedPromise = null;
  fetchHandler({
    request: { url: 'https://docscalar.com/canvas', method: 'GET', mode: 'navigate' },
    respondWith(promise) {
      respondedPromise = promise;
    }
  });

  const htmlOfflineResponse = await respondedPromise;
  assert(
    htmlOfflineResponse.body.includes('Fresh HTML') && htmlOfflineResponse.status === 200,
    46,
    'Network-First Offline: cleanly falls back to cached /index.html when network is unreachable'
  );

  // Case 6: Stale-While-Revalidate Hit (Worker script)
  const workerUrl = 'https://docscalar.com/workers/ocr.worker.js';
  await targetCache.put(workerUrl, new MockResponse('cached-worker-v1', { status: 200 }));

  let bgFetchExecuted = false;
  sandbox.fetch = async () => {
    bgFetchExecuted = true;
    return new MockResponse('updated-worker-v2', { status: 200 });
  };

  respondedPromise = null;
  fetchHandler({
    request: { url: workerUrl, method: 'GET' },
    respondWith(promise) {
      respondedPromise = promise;
    }
  });

  const workerResponse = await respondedPromise;
  assert(
    workerResponse.body === 'cached-worker-v1' && bgFetchExecuted === true,
    47,
    'Stale-While-Revalidate Hit: immediately returns cached worker while initiating background update'
  );

  // Case 7: Stale-While-Revalidate Offline with empty cache
  const uncachedAssetUrl = 'https://docscalar.com/assets/vendor-never-seen.js';
  sandbox.fetch = async () => {
    throw new Error('Network offline');
  };

  respondedPromise = null;
  fetchHandler({
    request: { url: uncachedAssetUrl, method: 'GET' },
    respondWith(promise) {
      respondedPromise = promise;
    }
  });

  const assetOfflineResponse = await respondedPromise;
  assert(
    assetOfflineResponse.status === 503 &&
    assetOfflineResponse.headers.get('Content-Type') === 'text/plain; charset=utf-8',
    48,
    'Stale-While-Revalidate Offline Miss: returns 503 fallback Response when neither cache nor network is available'
  );

  // Case 8: Cache-First Standard Font Definition (.properties)
  const fontPropsUrl = 'https://docscalar.com/standard_fonts/FoxitSerif.properties';
  sandbox.fetch = async () => {
    return new MockResponse('FoxitSerif-metrics-properties', { status: 200 });
  };

  respondedPromise = null;
  fetchHandler({
    request: { url: fontPropsUrl, method: 'GET' },
    respondWith(promise) {
      respondedPromise = promise;
    }
  });

  const fontPropsResponse = await respondedPromise;
  const storedFontProps = await targetCache.match(fontPropsUrl);
  assert(
    fontPropsResponse.body === 'FoxitSerif-metrics-properties' &&
    storedFontProps !== null &&
    storedFontProps.body === 'FoxitSerif-metrics-properties',
    49,
    'Cache-First for font definitions: fetches FoxitSerif.properties and caches immediately in v3 cache'
  );

  // Case 9: Network-First Offline with empty cache (verifies status 503 fallback when /index.html is missing)
  const emptyCache = new MockCache('temp-empty-cache');
  const savedV3 = mockCachesStore.get(swScope.CACHE_NAME);
  mockCachesStore.set(swScope.CACHE_NAME, emptyCache); // Temporarily swap out cache with empty

  sandbox.fetch = async () => {
    throw new Error('Network unreachable');
  };

  respondedPromise = null;
  fetchHandler({
    request: { url: 'https://docscalar.com/offline-page', method: 'GET', mode: 'navigate' },
    respondWith(promise) {
      respondedPromise = promise;
    }
  });

  const emptyOfflineResponse = await respondedPromise;
  assert(
    emptyOfflineResponse.status === 503 &&
    emptyOfflineResponse.headers.get('Content-Type') === 'text/plain; charset=utf-8',
    50,
    'Network-First Offline with empty cache: returns 503 fallback Response preventing unhandled rejection'
  );

  mockCachesStore.set(swScope.CACHE_NAME, savedV3); // Restore v3 cache

  // Case 10: Stale-While-Revalidate cached hit with background network failure
  const staleWorkerUrl = 'https://docscalar.com/workers/translation.worker.js';
  await targetCache.put(staleWorkerUrl, new MockResponse('cached-trans-worker-content', { status: 200 }));

  sandbox.fetch = async () => {
    throw new Error('Background network failed');
  };

  respondedPromise = null;
  fetchHandler({
    request: { url: staleWorkerUrl, method: 'GET' },
    respondWith(promise) {
      respondedPromise = promise;
    }
  });

  const swrCachedResponse = await respondedPromise;
  assert(
    swrCachedResponse.body === 'cached-trans-worker-content' && swrCachedResponse.status === 200,
    51,
    'Stale-While-Revalidate cached hit: returns cached copy cleanly even if background fetch throws network error'
  );

  // Case 11: Non-200 network response (e.g. 404) is NOT stored in cache in Cache-First
  const notFoundCmapUrl = 'https://docscalar.com/cmaps/non-existent-table.bcmap';
  sandbox.fetch = async () => {
    return new MockResponse('Not Found', { status: 404, statusText: 'Not Found' });
  };

  respondedPromise = null;
  fetchHandler({
    request: { url: notFoundCmapUrl, method: 'GET' },
    respondWith(promise) {
      respondedPromise = promise;
    }
  });

  const notFoundResponse = await respondedPromise;
  const cachedNotFound = await targetCache.match(notFoundCmapUrl);
  assert(
    notFoundResponse.status === 404 && cachedNotFound === null,
    52,
    'Cache-First HTTP 404 Guard: non-200 network responses are never written to the permanent cache'
  );

  // Case 12: Query parameters handling (?v=4.8.69)
  const queryCmapUrl = 'https://docscalar.com/cmaps/Adobe-Japan1-6.bcmap?v=4.8.69';
  assert(
    swScope.isTargetAsset(new URL(queryCmapUrl)) === true &&
    swScope.isCacheFirstAsset(new URL(queryCmapUrl)) === true &&
    swScope.getStrategy({ url: queryCmapUrl, method: 'GET' }) === 'cache-first',
    53,
    'Query String Preservation: URL with version query (?v=4.8.69) retains Cache-First classification'
  );

  // Case 13: Localhost development port handling
  const localhostUrl = 'http://localhost:5173/cmaps/Adobe-Korea1-UCS2.bcmap';
  assert(
    swScope.isTargetAsset(new URL(localhostUrl)) === true &&
    swScope.getStrategy({ url: localhostUrl, method: 'GET' }) === 'cache-first',
    54,
    'Port & Localhost Parity: http://localhost:5173 CMap URLs correctly dispatch to "cache-first"'
  );

  // Case 14: Non-GET HTTP methods bypass caching
  const nonGetMethods = ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];
  const allNonGetBypassed = nonGetMethods.every(
    m => swScope.getStrategy({ url: 'https://docscalar.com/cmaps/Adobe-Japan1-6.bcmap', method: m }) === 'network-only'
  );
  assert(
    allNonGetBypassed === true,
    55,
    'HTTP Method Isolation: PUT, DELETE, PATCH, HEAD requests strictly bypass caching ("network-only")'
  );
}

await testFetchHandler();

// -----------------------------------------------------------------------------
// SECTION 6: SERVICE WORKER LIFECYCLE SIMULATION (INSTALL & ACTIVATE)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 6: Service Worker Lifecycle Simulation ---');

async function testLifecycleHandlers() {
  const installHandler = registeredListeners['install'];
  assert(typeof installHandler === 'function', 56, 'Install event listener is registered on Service Worker scope');

  let installWaitPromise = null;
  installHandler({
    waitUntil(promise) {
      installWaitPromise = promise;
    }
  });

  await installWaitPromise;
  const v3Cache = mockCachesStore.get('docscalar-pwa-cache-v3');
  assert(
    v3Cache !== undefined &&
    v3Cache.store.has('/favicon.svg') &&
    v3Cache.store.has('/workers/ocr.worker.js') &&
    skipWaitingCalled === true,
    57,
    'Install Event: precaches PRECACHE_ASSETS into docscalar-pwa-cache-v3 and triggers skipWaiting()'
  );

  // Seed older legacy caches to verify eviction during activate
  await mockCaches.open('docscalar-pwa-cache-v1');
  await mockCaches.open('docscalar-pwa-cache-v2');
  await mockCaches.open('docscalar-legacy-dev-cache');

  const beforeEvictionKeys = await mockCaches.keys();
  assert(
    beforeEvictionKeys.includes('docscalar-pwa-cache-v2') &&
    beforeEvictionKeys.includes('docscalar-pwa-cache-v3') &&
    beforeEvictionKeys.length === 4,
    58,
    'Cache Store setup: Contains exactly 4 caches (3 legacy + 1 active v3) prior to activate'
  );

  const activateHandler = registeredListeners['activate'];
  assert(typeof activateHandler === 'function', 59, 'Activate event listener is registered on Service Worker scope');

  let activateWaitPromise = null;
  activateHandler({
    waitUntil(promise) {
      activateWaitPromise = promise;
    }
  });

  await activateWaitPromise;
  const afterEvictionKeys = await mockCaches.keys();
  assert(
    !afterEvictionKeys.includes('docscalar-pwa-cache-v1') &&
    !afterEvictionKeys.includes('docscalar-pwa-cache-v2') &&
    !afterEvictionKeys.includes('docscalar-legacy-dev-cache') &&
    afterEvictionKeys.includes('docscalar-pwa-cache-v3') &&
    clientsClaimCalled === true,
    60,
    'Activate Event: cleanly evicts older v1/v2 caches, preserves v3 cache, and triggers clients.claim()'
  );

  assert(
    beforeEvictionKeys.length - afterEvictionKeys.length === 3 && afterEvictionKeys.length === 1,
    61,
    'Formula-level cache eviction verification: 4 total caches minus 3 legacy caches equals exactly 1 surviving v3 cache'
  );
}

await testLifecycleHandlers();

// -----------------------------------------------------------------------------
// SECTION 7: LOCAL PUBLIC ASSET INTEGRATION & CONFIG PARITY
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 7: Local Public Asset Integration & Config Parity ---');

const cmapsDir = path.join(rootDir, 'public', 'cmaps');
const cmapsExist = fs.existsSync(cmapsDir);
const cmapFiles = cmapsExist ? fs.readdirSync(cmapsDir).filter(f => f.endsWith('.bcmap')) : [];

assert(
  cmapsExist &&
  cmapFiles.length >= 160 &&
  cmapFiles.includes('Adobe-Japan1-6.bcmap') &&
  cmapFiles.includes('UniGB-UTF8-H.bcmap'),
  62,
  `Local CMap assets present: ${cmapFiles.length} .bcmap files available in public/cmaps/ (min 160 required)`
);

const fontsDir = path.join(rootDir, 'public', 'standard_fonts');
const fontsExist = fs.existsSync(fontsDir);
const fontFiles = fontsExist ? fs.readdirSync(fontsDir) : [];

assert(
  fontsExist &&
  fontFiles.includes('FoxitSerif.pfb') &&
  fontFiles.includes('LiberationSans-Regular.ttf'),
  63,
  'Local Standard Font assets present: FoxitSerif and LiberationSans available in public/standard_fonts/'
);

// Inspect pdfConfig.js local endpoints
const pdfConfigPath = path.join(rootDir, 'src', 'utils', 'pdfConfig.js');
const pdfConfigCode = fs.readFileSync(pdfConfigPath, 'utf8');

assert(
  pdfConfigCode.includes("'/cmaps/'") &&
  pdfConfigCode.includes("'/standard_fonts/'") &&
  pdfConfigCode.includes("CMAP_PACKED = true"),
  64,
  'pdfConfig.js endpoints align with SW Cache-First paths: CMAP_URL (/cmaps/), STANDARD_FONT_DATA_URL (/standard_fonts/), CMAP_PACKED (true)'
);

// -----------------------------------------------------------------------------
// SECTION 8: ADVERSARIAL EDGE CASES & VULNERABILITY ELIMINATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 8: Adversarial Edge Cases & Vulnerability Elimination ---');

// 1. Dynamic Backend API Bypass (preventing API cache poisoning)
assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/api/models/download')) === false,
  65,
  'Dynamic backend API /api/models/download is strictly excluded from target assets'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/api/fonts/list')) === false,
  66,
  'Dynamic backend API /api/fonts/list is strictly excluded from target assets'
);

assert(
  swScope.getStrategy({ url: 'https://docscalar.com/api/workers/health', method: 'GET' }) === 'network-only',
  67,
  'Dynamic backend API GET /api/workers/health strictly dispatches to "network-only"'
);

assert(
  swScope.isTargetAsset(new URL('https://docscalar.com/health')) === false &&
  swScope.getStrategy({ url: 'https://docscalar.com/health', method: 'GET' }) === 'network-only',
  68,
  'Health check endpoint /health is strictly excluded from caching ("network-only")'
);

// 2. Cross-Origin HTML Navigation Isolation (preventing /index.html cache poisoning)
assert(
  swScope.isTargetAsset(new URL('https://auth0.com/login'), { mode: 'navigate', method: 'GET' }) === false,
  69,
  'External cross-origin navigation https://auth0.com/login strictly excluded from target assets'
);

assert(
  swScope.isHtmlRequest(new URL('https://accounts.google.com/oauth'), { mode: 'navigate' }) === false,
  70,
  'External OAuth redirect does NOT match isHtmlRequest (prevents /index.html cache poisoning)'
);

assert(
  swScope.getStrategy({ url: 'https://stripe.com/checkout', method: 'GET', mode: 'navigate' }) === 'network-only',
  71,
  'External navigation to Stripe checkout strictly dispatches to "network-only"'
);

// 3. Non-HTTP(S) Scheme Rejection (preventing Cache API TypeError)
assert(
  swScope.isTargetAsset(new URL('chrome-extension://abcdef/scripts/worker.js')) === false,
  72,
  'Non-HTTP(S) scheme chrome-extension:// is strictly excluded from target assets'
);

assert(
  swScope.isTargetAsset('data:font/woff2;base64,d09GMgABAAAAAA...') === false,
  73,
  'Data URLs (data:) are strictly excluded from target assets'
);

assert(
  swScope.isTargetAsset('blob:https://docscalar.com/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d') === false,
  74,
  'Blob URLs (blob:) are strictly excluded from target assets'
);

// 4. Input Robustness & Single-Argument Handling
let isHtmlSingleArgSafe = false;
try {
  isHtmlSingleArgSafe = swScope.isHtmlRequest(new URL('https://docscalar.com/')) === true;
} catch {
  isHtmlSingleArgSafe = false;
}
assert(
  isHtmlSingleArgSafe === true,
  75,
  'isHtmlRequest invoked with single argument evaluates safely without throwing TypeError'
);

assert(
  swScope.isTargetAsset('/cmaps/Adobe-Japan1-6.bcmap') === true,
  76,
  'String URL support: isTargetAsset("/cmaps/Adobe-Japan1-6.bcmap") evaluates safely to true'
);

assert(
  swScope.isCacheFirstAsset('/standard_fonts/FoxitSerif.properties') === true,
  77,
  'String URL support: isCacheFirstAsset("/standard_fonts/FoxitSerif.properties") evaluates safely to true'
);

assert(
  swScope.getStrategy('/workers/ocr.worker.js') === 'stale-while-revalidate',
  78,
  'String URL support: getStrategy("/workers/ocr.worker.js") returns "stale-while-revalidate"'
);

// 5. Case-Insensitive Extension & Format Support
assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/cmaps/Adobe-Japan1-6.BCMAP')) === true,
  79,
  'Case-insensitive CMap extension: .BCMAP matches isCacheFirstAsset'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/standard_fonts/FoxitSerif.PROPERTIES')) === true,
  80,
  'Case-insensitive Font extension: .PROPERTIES matches isCacheFirstAsset'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/models/classifier.ONNX')) === true,
  81,
  'Case-insensitive Model extension: .ONNX matches isCacheFirstAsset'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/fonts/custom-font.otf')) === true,
  82,
  'OpenType font extension: .otf matches isCacheFirstAsset'
);

assert(
  swScope.isCacheFirstAsset(new URL('https://docscalar.com/assets/ort-wasm-simd.wasm')) === true,
  83,
  'WebAssembly binary: .wasm matches isCacheFirstAsset'
);

// 6. Service Worker waitUntil Lifecycle Bindings
async function testWaitUntilLifecycle() {
  const fetchHandler = registeredListeners['fetch'];
  
  // Test waitUntil in Stale-While-Revalidate on cached hit
  const swrTestUrl = 'https://docscalar.com/workers/classifier.worker.js';
  const targetCache = await mockCaches.open(swScope.CACHE_NAME);
  await targetCache.put(swrTestUrl, new MockResponse('cached-classifier-v1', { status: 200 }));
  
  let waitUntilCalledWithPromise = false;
  sandbox.fetch = async () => new MockResponse('updated-classifier-v2', { status: 200 });

  fetchHandler({
    request: { url: swrTestUrl, method: 'GET' },
    respondWith() {},
    waitUntil(promise) {
      if (promise && typeof promise.then === 'function') {
        waitUntilCalledWithPromise = true;
      }
    }
  });

  assert(
    waitUntilCalledWithPromise === true,
    84,
    'Stale-While-Revalidate lifecycle: passes fetchPromise to event.waitUntil to prevent premature worker shutdown'
  );

  // Test waitUntil in Cache-First on cache miss
  const cfMissUrl = 'https://docscalar.com/cmaps/KSCms-UCSC2-V.bcmap';
  let cfWaitUntilCalled = false;
  sandbox.fetch = async () => new MockResponse('fresh-cjk-data', { status: 200 });

  let cfRespondPromise = null;
  fetchHandler({
    request: { url: cfMissUrl, method: 'GET' },
    respondWith(promise) {
      cfRespondPromise = promise;
    },
    waitUntil(promise) {
      if (promise && typeof promise.then === 'function') {
        cfWaitUntilCalled = true;
      }
    }
  });

  await cfRespondPromise;
  assert(
    cfWaitUntilCalled === true,
    85,
    'Cache-First lifecycle: passes cacheWritePromise to event.waitUntil ensuring write completes without interruption'
  );
}

await testWaitUntilLifecycle();

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED:      ${passedTests}`);
console.log(`FAILED:      ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  console.error('\nFAILURES:');
  failures.forEach(f => console.error(`  - Area ${f.testNumber}: ${f.description}`));
  process.exit(1);
} else {
  console.log(`\n✓ ALL ${totalTests} SERVICE WORKER MOLECULAR TESTS PASSED WITH 100% SUCCESS!\n`);
  process.exit(0);
}
