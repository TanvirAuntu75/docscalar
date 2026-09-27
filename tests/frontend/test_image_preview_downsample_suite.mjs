// Automated Molecular Test Suite: Image Studio Preview Downsampling & Memory Guard
// Topic 5 of 6: imagePreviewHelper.js, Downsampled Previews, RAM Reduction & Leak-Proof Blob Lifecycle

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Direct source imports (Zero Local-Copy Rule)
import {
  THUMBNAIL_CONFIG,
  computeDownscaledDimensions,
  computeBitmapMemoryBytes,
  safeRevokeUrls,
  generateImageThumbnail,
  generateBatchImageThumbnails
} from '../../src/utils/imagePreviewHelper.js';

import { releaseCanvas } from '../../src/utils/canvasLifecycle.js';

// -----------------------------------------------------------------------------
// TEST RUNNER INFRASTRUCTURE
// -----------------------------------------------------------------------------
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, areaNumber, description, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Area ${areaNumber}: ${description}`);
  } else {
    failedTests++;
    const errMsg = `FAIL: Area ${areaNumber}: ${description} ${details ? `(${details})` : ''}`;
    console.error(`  [FAIL] ${errMsg}`);
    failures.push({ areaNumber, description, details });
  }
}

// -----------------------------------------------------------------------------
// MOCK ENVIRONMENT HARNESS (Node.js runtime emulation)
// -----------------------------------------------------------------------------
const revokedUrls = new Set();
let objectUrlId = 0;

if (!globalThis.URL) {
  globalThis.URL = {};
}
globalThis.URL.createObjectURL = (blob) => {
  const url = `blob:http://localhost:5173/mock-image-${++objectUrlId}`;
  return url;
};
globalThis.URL.revokeObjectURL = (url) => {
  if (typeof url === 'string') {
    revokedUrls.add(url);
  }
};

function createMockCanvas(w = 0, h = 0, { supportWebp = true, failExport = false } = {}) {
  const drawCalls = [];
  const clearCalls = [];
  const canvas = {
    width: w,
    height: h,
    _cleared: false,
    getContext(type) {
      if (type !== '2d') return null;
      return {
        clearRect(x, y, cw, ch) {
          clearCalls.push({ x, y, cw, ch });
          canvas._cleared = true;
        },
        drawImage(...args) {
          drawCalls.push(args);
        }
      };
    },
    toBlob(callback, type, quality) {
      if (failExport) {
        callback(null);
        return;
      }
      if (type === 'image/webp' && !supportWebp) {
        // Fallback simulation: WebP not supported by browser canvas
        callback(null);
        return;
      }
      callback({
        type,
        size: Math.round(canvas.width * canvas.height * (type === 'image/webp' ? 0.05 : 0.08)),
        slice: () => {}
      });
    },
    convertToBlob({ type, quality } = {}) {
      if (failExport) return Promise.reject(new Error('Canvas export failure'));
      if (type === 'image/webp' && !supportWebp) {
        return Promise.reject(new Error('WebP unsupported'));
      }
      return Promise.resolve({
        type,
        size: Math.round(canvas.width * canvas.height * 0.05)
      });
    },
    _drawCalls: drawCalls,
    _clearCalls: clearCalls
  };
  return canvas;
}

function createMockImageFile({ name = 'photo.jpg', size = 5000000, width = 4000, height = 3000, isCorrupt = false } = {}) {
  return {
    name,
    size: isCorrupt ? 0 : size,
    type: 'image/jpeg',
    _mockWidth: width,
    _mockHeight: height,
    _corrupt: isCorrupt,
    slice: () => {}
  };
}

function mockBitmapLoader(file) {
  if (file.size === 0 || file._corrupt) {
    return Promise.reject(new Error('Corrupt image data'));
  }
  let closed = false;
  return Promise.resolve({
    width: file._mockWidth || 4000,
    height: file._mockHeight || 3000,
    naturalWidth: file._mockWidth || 4000,
    naturalHeight: file._mockHeight || 3000,
    close() {
      closed = true;
    },
    get isClosed() {
      return closed;
    }
  });
}

// -----------------------------------------------------------------------------
// TEST SUITE EXECUTION
// -----------------------------------------------------------------------------
async function runSuite() {
  console.log('================================================================');
  console.log('Topic 5: Image Studio Preview Downsampling & Memory Guard');
  console.log('================================================================\n');

  // --- AREA 1: Configuration Invariants ---
  console.log('--- AREA 1: Configuration Invariants ---');
  assert(THUMBNAIL_CONFIG.DEFAULT_MAX_DIMENSION === 320, '1.1', 'Default max dimension is 320px');
  assert(THUMBNAIL_CONFIG.DEFAULT_QUALITY === 0.8, '1.2', 'Default export quality is 0.8');
  assert(THUMBNAIL_CONFIG.DEFAULT_MIME_TYPE === 'image/webp', '1.3', 'Default MIME type is image/webp');
  assert(THUMBNAIL_CONFIG.FALLBACK_MIME_TYPE === 'image/jpeg', '1.4', 'Fallback MIME type is image/jpeg');

  // --- AREA 2: Landscape Image Downsampling (4000x3000) ---
  console.log('--- AREA 2: Landscape Image Downsampling ---');
  const landscape = computeDownscaledDimensions(4000, 3000, 320);
  assert(landscape.width === 320, '2.1', 'Landscape width is capped at 320px (got ' + landscape.width + ')');
  assert(landscape.height === 240, '2.2', 'Landscape height scales proportionally to 240px (got ' + landscape.height + ')');
  assert(Math.max(landscape.width, landscape.height) <= 320, '2.3', 'Longest edge is <= 320px');
  assert(Math.abs(landscape.scale - 0.08) < 0.0001, '2.4', 'Scale factor is exactly 320 / 4000 = 0.08');

  // --- AREA 3: Landscape Aspect Ratio Preservation ---
  console.log('--- AREA 3: Landscape Aspect Ratio Preservation ---');
  const origAspect = 4000 / 3000;
  const scaledAspect = landscape.width / landscape.height;
  assert(Math.abs(origAspect - scaledAspect) < 0.0001, '3.1', 'Aspect ratio 4:3 is strictly preserved (' + scaledAspect.toFixed(4) + ')');

  // --- AREA 4: Portrait Image Downsampling (3000x4000) ---
  console.log('--- AREA 4: Portrait Image Downsampling ---');
  const portrait = computeDownscaledDimensions(3000, 4000, 320);
  assert(portrait.width === 240, '4.1', 'Portrait width scales proportionally to 240px (got ' + portrait.width + ')');
  assert(portrait.height === 320, '4.2', 'Portrait height is capped at 320px (got ' + portrait.height + ')');
  assert(Math.max(portrait.width, portrait.height) <= 320, '4.3', 'Portrait longest edge <= 320px');
  assert(Math.abs(portrait.scale - 0.08) < 0.0001, '4.4', 'Portrait scale is 320 / 4000 = 0.08');

  // --- AREA 5: Portrait Aspect Ratio Preservation ---
  console.log('--- AREA 5: Portrait Aspect Ratio Preservation ---');
  const portOrigAspect = 3000 / 4000;
  const portScaledAspect = portrait.width / portrait.height;
  assert(Math.abs(portOrigAspect - portScaledAspect) < 0.0001, '5.1', 'Aspect ratio 3:4 is strictly preserved (' + portScaledAspect.toFixed(4) + ')');

  // --- AREA 6: Square Image Downsampling (2048x2048) ---
  console.log('--- AREA 6: Square Image Downsampling ---');
  const square = computeDownscaledDimensions(2048, 2048, 320);
  assert(square.width === 320, '6.1', 'Square width is 320px');
  assert(square.height === 320, '6.2', 'Square height is 320px');
  assert(square.width === square.height, '6.3', 'Square 1:1 ratio is strictly maintained');

  // --- AREA 7: Sub-MaxDimension Image Bypass (No Upscaling) ---
  console.log('--- AREA 7: Sub-MaxDimension Image Bypass ---');
  const small = computeDownscaledDimensions(200, 150, 320);
  assert(small.width === 200, '7.1', 'Sub-max image width is preserved without upscaling (got ' + small.width + ')');
  assert(small.height === 150, '7.2', 'Sub-max image height is preserved without upscaling (got ' + small.height + ')');
  assert(small.scale === 1, '7.3', 'Scale factor is exactly 1.0');

  // --- AREA 8: Custom MaxDimension Parameter ---
  console.log('--- AREA 8: Custom MaxDimension Parameter ---');
  const custom = computeDownscaledDimensions(4000, 2000, 500);
  assert(custom.width === 500, '8.1', 'Custom maxDimension=500 caps width at 500px');
  assert(custom.height === 250, '8.2', 'Custom height is proportionally 250px');
  assert(Math.abs(custom.scale - 0.125) < 0.0001, '8.3', 'Scale factor is 500 / 4000 = 0.125');

  // --- AREA 9: Extreme Aspect Ratio Ribbon (10000x1) ---
  console.log('--- AREA 9: Extreme Aspect Ratio Ribbon ---');
  const ribbonH = computeDownscaledDimensions(10000, 1, 320);
  assert(ribbonH.width === 320, '9.1', 'Panorama width is capped at 320px');
  assert(ribbonH.height === 1, '9.2', 'Panorama height clamped to minimum 1px, not 0px');

  // --- AREA 10: Extreme Aspect Ratio Skyscraper (1x10000) ---
  console.log('--- AREA 10: Extreme Aspect Ratio Skyscraper ---');
  const ribbonV = computeDownscaledDimensions(1, 10000, 320);
  assert(ribbonV.height === 320, '10.1', 'Skyscraper height is capped at 320px');
  assert(ribbonV.width === 1, '10.2', 'Skyscraper width clamped to minimum 1px, not 0px');

  // --- AREA 11: Malformed and Invalid Dimensions ---
  console.log('--- AREA 11: Malformed and Invalid Dimensions ---');
  const zeroDim = computeDownscaledDimensions(0, 3000, 320);
  assert(zeroDim.width === 0 && zeroDim.height === 0, '11.1', 'Zero width yields safe 0x0 fallback');
  const negDim = computeDownscaledDimensions(-400, 300, 320);
  assert(negDim.width === 0 && negDim.height === 0, '11.2', 'Negative dimension yields safe 0x0 fallback');
  const nanDim = computeDownscaledDimensions(NaN, 300, 320);
  assert(nanDim.width === 0 && nanDim.height === 0, '11.3', 'NaN dimension yields safe 0x0 fallback');
  const infDim = computeDownscaledDimensions(Infinity, 300, 320);
  assert(infDim.width === 0 && infDim.height === 0, '11.4', 'Infinity dimension yields safe 0x0 fallback');

  // --- AREA 12: Invalid maxDimension Fallback ---
  console.log('--- AREA 12: Invalid maxDimension Fallback ---');
  const negMax = computeDownscaledDimensions(4000, 3000, -100);
  assert(negMax.width === 320, '12.1', 'Negative maxDimension safely defaults to 320px');
  const zeroMax = computeDownscaledDimensions(4000, 3000, 0);
  assert(zeroMax.width === 320, '12.2', 'Zero maxDimension safely defaults to 320px');
  const nanMax = computeDownscaledDimensions(4000, 3000, NaN);
  assert(nanMax.width === 320, '12.3', 'NaN maxDimension safely defaults to 320px');

  // --- AREA 13: Formula-Level Raw RGBA Bitmap RAM ---
  console.log('--- AREA 13: Formula-Level Raw RGBA Bitmap RAM ---');
  const rawBytes = computeBitmapMemoryBytes(4000, 3000);
  assert(rawBytes === 48000000, '13.1', '4000x3000 raw RGBA bitmap consumes exactly 48,000,000 bytes (48 MB)');

  // --- AREA 14: Formula-Level Downscaled Thumbnail RAM ---
  console.log('--- AREA 14: Formula-Level Downscaled Thumbnail RAM ---');
  const thumbBytes = computeBitmapMemoryBytes(320, 240);
  assert(thumbBytes === 307200, '14.1', '320x240 thumbnail RGBA buffer consumes exactly 307,200 bytes (307.2 KB)');

  // --- AREA 15: Formula-Level VRAM Savings Percentage ---
  console.log('--- AREA 15: Formula-Level VRAM Savings Percentage ---');
  const savingsBytes = rawBytes - thumbBytes;
  const savingsPct = (savingsBytes / rawBytes) * 100;
  assert(savingsBytes === 47692800, '15.1', 'Absolute VRAM savings per card is 47,692,800 bytes (~47.7 MB)');
  assert(savingsPct > 99.0, '15.2', 'VRAM savings percentage (' + savingsPct.toFixed(2) + '%) strictly exceeds 99% invariant');
  assert(Math.abs(savingsPct - 99.36) < 0.01, '15.3', 'VRAM savings percentage is exactly 99.36%');

  // --- AREA 16: computeBitmapMemoryBytes Boundary Rules ---
  console.log('--- AREA 16: computeBitmapMemoryBytes Boundary Rules ---');
  assert(computeBitmapMemoryBytes(0, 100) === 0, '16.1', 'Zero width yields 0 bytes');
  assert(computeBitmapMemoryBytes(100, 0) === 0, '16.2', 'Zero height yields 0 bytes');
  assert(computeBitmapMemoryBytes(-50, 50) === 0, '16.3', 'Negative dimension yields 0 bytes');
  assert(computeBitmapMemoryBytes(NaN, 100) === 0, '16.4', 'NaN dimension yields 0 bytes');

  // --- AREA 17: Multi-Card Batch Projection (50 Images) ---
  console.log('--- AREA 17: Multi-Card Batch Projection ---');
  const batch50Raw = 50 * rawBytes; // 2,400,000,000 bytes (~2.4 GB)
  const batch50Thumb = 50 * thumbBytes; // 15,360,000 bytes (~15.36 MB)
  assert(batch50Raw === 2400000000, '17.1', '50 raw images consume 2.4 GB GPU/V8 RAM (would crash browser tab)');
  assert(batch50Thumb === 15360000, '17.2', '50 downsampled thumbnails consume only 15.36 MB RAM');
  assert(batch50Raw - batch50Thumb > 2380000000, '17.3', 'Batch projection saves > 2.38 GB memory');

  // --- AREA 18: safeRevokeUrls String Blob Revocation ---
  console.log('--- AREA 18: safeRevokeUrls String Blob Revocation ---');
  revokedUrls.clear();
  const testBlobUrl = 'blob:http://localhost:5173/test-blob-1';
  safeRevokeUrls(testBlobUrl);
  assert(revokedUrls.has(testBlobUrl), '18.1', 'Blob URL string is registered as revoked in URL.revokeObjectURL');

  // --- AREA 19: safeRevokeUrls Non-Blob Safety ---
  console.log('--- AREA 19: safeRevokeUrls Non-Blob Safety ---');
  revokedUrls.clear();
  safeRevokeUrls('https://example.com/image.png');
  safeRevokeUrls('data:image/png;base64,iVBORw0KGgo=');
  assert(revokedUrls.size === 0, '19.1', 'Non-blob URLs (https, data) are safely ignored and not revoked');

  // --- AREA 20: safeRevokeUrls Object with .revoke() ---
  console.log('--- AREA 20: safeRevokeUrls Object with .revoke() ---');
  let customRevokeCalled = false;
  safeRevokeUrls({
    previewUrl: 'blob:mock',
    revoke: () => {
      customRevokeCalled = true;
    }
  });
  assert(customRevokeCalled === true, '20.1', 'Calls .revoke() method on thumbnail objects');

  // --- AREA 21: safeRevokeUrls Object with .previewUrl ---
  console.log('--- AREA 21: safeRevokeUrls Object with .previewUrl ---');
  revokedUrls.clear();
  const objWithPreview = { previewUrl: 'blob:http://localhost:5173/preview-item-2' };
  safeRevokeUrls(objWithPreview);
  assert(revokedUrls.has('blob:http://localhost:5173/preview-item-2'), '21.1', 'Object with .previewUrl has its URL revoked');

  // --- AREA 22: safeRevokeUrls Object with .url ---
  console.log('--- AREA 22: safeRevokeUrls Object with .url ---');
  revokedUrls.clear();
  const objWithUrl = { url: 'blob:http://localhost:5173/url-item-3' };
  safeRevokeUrls(objWithUrl);
  assert(revokedUrls.has('blob:http://localhost:5173/url-item-3'), '22.1', 'Object with .url has its URL revoked');

  // --- AREA 23: safeRevokeUrls Array Batch Revocation ---
  console.log('--- AREA 23: safeRevokeUrls Array Batch Revocation ---');
  revokedUrls.clear();
  const batchList = [
    'blob:http://localhost:5173/b1',
    { previewUrl: 'blob:http://localhost:5173/b2' },
    { url: 'blob:http://localhost:5173/b3' }
  ];
  safeRevokeUrls(batchList);
  assert(revokedUrls.has('blob:http://localhost:5173/b1'), '23.1', 'Batch item 1 revoked');
  assert(revokedUrls.has('blob:http://localhost:5173/b2'), '23.2', 'Batch item 2 revoked');
  assert(revokedUrls.has('blob:http://localhost:5173/b3'), '23.3', 'Batch item 3 revoked');

  // --- AREA 24: safeRevokeUrls Dictionary / Record ---
  console.log('--- AREA 24: safeRevokeUrls Dictionary / Record ---');
  revokedUrls.clear();
  const dict = {
    imgA: 'blob:http://localhost:5173/dA',
    imgB: { previewUrl: 'blob:http://localhost:5173/dB' }
  };
  safeRevokeUrls(dict);
  assert(revokedUrls.has('blob:http://localhost:5173/dA'), '24.1', 'Dictionary key imgA revoked');
  assert(revokedUrls.has('blob:http://localhost:5173/dB'), '24.2', 'Dictionary key imgB revoked');

  // --- AREA 25: safeRevokeUrls Null-Safety & Edge Types ---
  console.log('--- AREA 25: safeRevokeUrls Null-Safety & Edge Types ---');
  let errorThrown = false;
  try {
    safeRevokeUrls(null);
    safeRevokeUrls(undefined);
    safeRevokeUrls('');
    safeRevokeUrls(12345);
    safeRevokeUrls(true);
    safeRevokeUrls({});
    safeRevokeUrls([]);
  } catch (err) {
    errorThrown = true;
  }
  assert(!errorThrown, '25.1', 'safeRevokeUrls executes without throwing on all null/undefined/primitive types');

  // --- AREA 26: safeRevokeUrls Idempotency ---
  console.log('--- AREA 26: safeRevokeUrls Idempotency ---');
  let doubleRevokeError = false;
  try {
    const item = { previewUrl: 'blob:http://localhost:5173/repeat', revoke: () => {} };
    safeRevokeUrls(item);
    safeRevokeUrls(item);
  } catch (err) {
    doubleRevokeError = true;
  }
  assert(!doubleRevokeError, '26.1', 'Repeated invocation on the same object is completely idempotent');

  // --- AREA 27: generateImageThumbnail Execution & Sizing ---
  console.log('--- AREA 27: generateImageThumbnail Execution & Sizing ---');
  const mockFile = createMockImageFile({ width: 4000, height: 3000 });
  const mockCanvas = createMockCanvas();
  const thumbResult = await generateImageThumbnail(mockFile, {
    canvas: mockCanvas,
    createImageBitmap: mockBitmapLoader
  });
  assert(thumbResult.width === 320, '27.1', 'Generated thumbnail width is 320px');
  assert(thumbResult.height === 240, '27.2', 'Generated thumbnail height is 240px');
  assert(thumbResult.originalWidth === 4000, '27.3', 'Preserves original width 4000');
  assert(thumbResult.originalHeight === 3000, '27.4', 'Preserves original height 3000');
  assert(typeof thumbResult.previewUrl === 'string' && thumbResult.previewUrl.startsWith('blob:'), '27.5', 'Returns valid blob preview URL');
  assert(typeof thumbResult.revoke === 'function', '27.6', 'Returns item revoke function');

  // --- AREA 28: generateImageThumbnail Canvas Drawing ---
  console.log('--- AREA 28: generateImageThumbnail Canvas Drawing ---');
  assert(mockCanvas._drawCalls.length === 1, '28.1', 'drawImage was invoked exactly once');
  const [sourceArg, dx, dy, dw, dh] = mockCanvas._drawCalls[0];
  assert(dx === 0 && dy === 0, '28.2', 'Image drawn starting at canvas origin (0, 0)');
  assert(dw === 320 && dh === 240, '28.3', 'Image drawn scaled to 320x240');

  // --- AREA 29: generateImageThumbnail WebP Export ---
  console.log('--- AREA 29: generateImageThumbnail WebP Export ---');
  assert(thumbResult.mimeType === 'image/webp', '29.1', 'Thumbnail exports to image/webp by default');

  // --- AREA 30: generateImageThumbnail JPEG Fallback ---
  console.log('--- AREA 30: generateImageThumbnail JPEG Fallback ---');
  const mockCanvasNoWebp = createMockCanvas(0, 0, { supportWebp: false });
  const jpegResult = await generateImageThumbnail(mockFile, {
    canvas: mockCanvasNoWebp,
    createImageBitmap: mockBitmapLoader
  });
  assert(jpegResult.mimeType === 'image/jpeg', '30.1', 'Falls back to image/jpeg when WebP is unsupported');

  // --- AREA 31: Temporary Canvas Memory Release ---
  console.log('--- AREA 31: Temporary Canvas Memory Release ---');
  assert(mockCanvas.width === 0, '31.1', 'Canvas width collapsed to 0 via releaseCanvas');
  assert(mockCanvas.height === 0, '31.2', 'Canvas height collapsed to 0 via releaseCanvas');
  assert(mockCanvas._cleared === true, '31.3', 'Canvas 2D context was cleared with clearRect before dimension collapse');

  // --- AREA 32: Thumbnail .revoke() Method ---
  console.log('--- AREA 32: Thumbnail .revoke() Method ---');
  revokedUrls.clear();
  thumbResult.revoke();
  assert(revokedUrls.has(thumbResult.previewUrl), '32.1', 'Invoking .revoke() revokes previewUrl via URL.revokeObjectURL');

  // --- AREA 33: Corrupt or Zero-Byte File Resilience ---
  console.log('--- AREA 33: Corrupt or Zero-Byte File Resilience ---');
  const zeroByteFile = createMockImageFile({ size: 0, isCorrupt: true });
  const zeroByteResult = await generateImageThumbnail(zeroByteFile, {
    createImageBitmap: mockBitmapLoader
  });
  assert(zeroByteResult.previewUrl === null, '33.1', 'Zero-byte file returns null previewUrl');
  assert(zeroByteResult.width === 0 && zeroByteResult.height === 0, '33.2', 'Zero-byte file returns 0x0 dimensions');
  assert(Boolean(zeroByteResult.error), '33.3', 'Zero-byte file includes error explanation');
  assert(typeof zeroByteResult.revoke === 'function', '33.4', 'Zero-byte file returns safe no-op revoke function');

  // --- AREA 34: Null / Undefined File Resilience ---
  console.log('--- AREA 34: Null / Undefined File Resilience ---');
  const nullResult = await generateImageThumbnail(null);
  assert(nullResult.previewUrl === null, '34.1', 'Null file returns null previewUrl');
  assert(Boolean(nullResult.error), '34.2', 'Null file reports error gracefully');

  // --- AREA 35: generateBatchImageThumbnails Multi-Item Batch ---
  console.log('--- AREA 35: generateBatchImageThumbnails Multi-Item Batch ---');
  const batchFiles = [
    createMockImageFile({ name: 'img1.jpg', width: 4000, height: 3000 }),
    createMockImageFile({ name: 'img2.jpg', width: 2000, height: 2000 }),
    createMockImageFile({ name: 'img3.jpg', width: 1500, height: 3000 })
  ];
  let progressReported = 0;
  const batchResults = await generateBatchImageThumbnails(batchFiles, {
    createImageBitmap: mockBitmapLoader,
    createCanvas: (w, h) => createMockCanvas(w, h),
    onProgress: (done, total) => {
      progressReported = done;
    }
  });
  assert(batchResults.length === 3, '35.1', 'Processes all 3 batch files');
  assert(batchResults[0].width === 320 && batchResults[0].height === 240, '35.2', 'Batch item 0 downscaled correctly (320x240)');
  assert(batchResults[1].width === 320 && batchResults[1].height === 320, '35.3', 'Batch item 1 downscaled correctly (320x320)');
  assert(batchResults[2].width === 160 && batchResults[2].height === 320, '35.4', 'Batch item 2 downscaled correctly (160x320)');
  assert(progressReported === 3, '35.5', 'onProgress tracked completion of all 3 items');

  // --- AREA 36: generateBatchImageThumbnails Cancellation Token ---
  console.log('--- AREA 36: generateBatchImageThumbnails Cancellation Token ---');
  revokedUrls.clear();
  const cancellationToken = { isCancelled: false };
  const cancelFiles = [
    createMockImageFile({ name: 'c1.jpg' }),
    createMockImageFile({ name: 'c2.jpg' }),
    createMockImageFile({ name: 'c3.jpg' })
  ];

  let cancelCaught = false;
  let itemsProcessed = 0;

  try {
    await generateBatchImageThumbnails(cancelFiles, {
      cancellationToken,
      concurrency: 1,
      createCanvas: (w, h) => createMockCanvas(w, h),
      createImageBitmap: async (f) => {
        itemsProcessed++;
        if (itemsProcessed === 2) {
          cancellationToken.isCancelled = true;
        }
        return mockBitmapLoader(f);
      }
    });
  } catch (err) {
    cancelCaught = true;
  }
  assert(cancelCaught === true, '36.1', 'Batch execution throws AbortError when cancellation token is flagged');
  assert(revokedUrls.size >= 1, '36.2', 'Partial thumbnail allocations were immediately revoked upon cancellation');

  // --- AREA 37: generateBatchImageThumbnails Pre-Cancelled State ---
  console.log('--- AREA 37: generateBatchImageThumbnails Pre-Cancelled State ---');
  let preCancelCaught = false;
  try {
    await generateBatchImageThumbnails(cancelFiles, {
      cancellationToken: { isCancelled: true }
    });
  } catch (err) {
    preCancelCaught = true;
  }
  assert(preCancelCaught === true, '37.1', 'Pre-cancelled batch throws immediately without allocations');

  // --- AREA 38: generateBatchImageThumbnails AbortSignal Support ---
  console.log('--- AREA 38: generateBatchImageThumbnails AbortSignal Support ---');
  const controller = new AbortController();
  controller.abort();
  let signalCaught = false;
  try {
    await generateBatchImageThumbnails(cancelFiles, {
      signal: controller.signal
    });
  } catch (err) {
    signalCaught = true;
  }
  assert(signalCaught === true, '38.1', 'AbortSignal abortion cleanly rejects batch promise');

  // --- AREA 39: generateBatchImageThumbnails Empty / Invalid Array ---
  console.log('--- AREA 39: generateBatchImageThumbnails Empty / Invalid Array ---');
  const emptyRes = await generateBatchImageThumbnails([]);
  assert(Array.isArray(emptyRes) && emptyRes.length === 0, '39.1', 'Empty array returns []');
  const nullRes = await generateBatchImageThumbnails(null);
  assert(Array.isArray(nullRes) && nullRes.length === 0, '39.2', 'Null files input returns []');

  // --- AREA 40: AST Check - ImageCompressor.jsx Imports ---
  console.log('--- AREA 40: AST Check - ImageCompressor.jsx Imports ---');
  const compCode = fs.readFileSync(path.join(rootDir, 'src/pages/image/ImageCompressor.jsx'), 'utf-8');
  assert(compCode.includes("from '../../utils/imagePreviewHelper'"), '40.1', 'ImageCompressor imports imagePreviewHelper');
  assert(compCode.includes('generateBatchImageThumbnails'), '40.2', 'ImageCompressor imports generateBatchImageThumbnails');
  assert(compCode.includes('safeRevokeUrls'), '40.3', 'ImageCompressor imports safeRevokeUrls');

  // --- AREA 41: AST Check - ImageCompressor.jsx State & Gallery Card ---
  console.log('--- AREA 41: AST Check - ImageCompressor.jsx State & Gallery Card ---');
  assert(compCode.includes('const [thumbnails, setThumbnails] = useState([]);'), '41.1', 'ImageCompressor declares thumbnails state');
  assert(compCode.includes('thumbnails[idx]?.previewUrl || previewUrls[idx]'), '41.2', 'ImageCompressor gallery card renders downsampled thumbnail URL');
  assert(compCode.includes('maxDimension: 320'), '41.3', 'ImageCompressor configures maxDimension 320px for thumbnails');

  // --- AREA 42: AST Check - ImageCompressor.jsx Raw File Preservation & Cleanup ---
  console.log('--- AREA 42: AST Check - ImageCompressor.jsx Raw File Preservation & Cleanup ---');
  assert(/batchCompressImages\s*\(\s*files\b/.test(compCode), '42.1', 'ImageCompressor retains raw File instances in state for compression engine');
  assert(compCode.includes('safeRevokeUrls(thumbnails)'), '42.2', 'ImageCompressor revokes thumbnails on unmount and resetWorkspace');
  assert(compCode.includes('safeRevokeUrls(previewUrls)'), '42.3', 'ImageCompressor revokes previewUrls on unmount and resetWorkspace');

  // --- AREA 43: AST Check - ImageConverter.jsx Imports ---
  console.log('--- AREA 43: AST Check - ImageConverter.jsx Imports ---');
  const convCode = fs.readFileSync(path.join(rootDir, 'src/pages/image/ImageConverter.jsx'), 'utf-8');
  assert(convCode.includes("from '../../utils/imagePreviewHelper'"), '43.1', 'ImageConverter imports imagePreviewHelper');
  assert(convCode.includes('generateBatchImageThumbnails'), '43.2', 'ImageConverter imports generateBatchImageThumbnails');
  assert(convCode.includes('safeRevokeUrls'), '43.3', 'ImageConverter imports safeRevokeUrls');

  // --- AREA 44: AST Check - ImageConverter.jsx Dimensions & Gallery Card ---
  console.log('--- AREA 44: AST Check - ImageConverter.jsx Dimensions & Gallery Card ---');
  assert(convCode.includes('const [thumbnails, setThumbnails] = useState([]);'), '44.1', 'ImageConverter declares thumbnails state');
  assert(convCode.includes('thumbnails[idx]?.previewUrl || previewUrls[idx]'), '44.2', 'ImageConverter gallery card renders downsampled thumbnail URL');
  assert(convCode.includes('originalWidth') && convCode.includes('originalHeight'), '44.3', 'ImageConverter extracts original dimensions from thumbnail metadata');
  assert(convCode.includes('setNaturalDims(dims)'), '44.4', 'ImageConverter preserves naturalDims metadata');

  // --- AREA 45: AST Check - ImageConverter.jsx Cleanup on Remove, Reset & Unmount ---
  console.log('--- AREA 45: AST Check - ImageConverter.jsx Cleanup on Remove, Reset & Unmount ---');
  assert(convCode.includes('safeRevokeUrls(previewUrls[indexToRemove])'), '45.1', 'ImageConverter revokes preview URL on file removal');
  assert(convCode.includes('safeRevokeUrls(thumbnails[indexToRemove])'), '45.2', 'ImageConverter revokes thumbnail on file removal');
  assert(convCode.includes('safeRevokeUrls(thumbnails)'), '45.3', 'ImageConverter revokes thumbnails on workspace reset and unmount');

  // --- AREA 46: AST Check - ImageResizer.jsx Imports & State ---
  console.log('--- AREA 46: AST Check - ImageResizer.jsx Imports & State ---');
  const resCode = fs.readFileSync(path.join(rootDir, 'src/pages/image/ImageResizer.jsx'), 'utf-8');
  assert(resCode.includes("from '../../utils/imagePreviewHelper'"), '46.1', 'ImageResizer imports imagePreviewHelper');
  assert(resCode.includes('generateBatchImageThumbnails'), '46.2', 'ImageResizer imports generateBatchImageThumbnails');
  assert(resCode.includes('safeRevokeUrls'), '46.3', 'ImageResizer imports safeRevokeUrls');
  assert(resCode.includes('const [thumbnails, setThumbnails] = useState([]);'), '46.4', 'ImageResizer declares thumbnails state');

  // --- AREA 47: AST Check - ImageResizer.jsx Gallery Card, Dimensions & Cleanup ---
  console.log('--- AREA 47: AST Check - ImageResizer.jsx Gallery Card, Dimensions & Cleanup ---');
  assert(resCode.includes('thumbnails[idx]?.previewUrl || previewUrls[idx]'), '47.1', 'ImageResizer gallery card renders downsampled thumbnail URL');
  assert(resCode.includes('originalWidth') && resCode.includes('originalHeight'), '47.2', 'ImageResizer preserves original natural dimensions');
  assert(/batchResizeImages\s*\(\s*files\b/.test(resCode), '47.3', 'ImageResizer passes raw File instances to batchResizeImages');
  assert(resCode.includes('safeRevokeUrls(thumbnails)'), '47.4', 'ImageResizer revokes thumbnails on unmount and reset');

  // --- AREA 48: safeRevokeUrls Set & Map Data Structure Support ---
  console.log('--- AREA 48: safeRevokeUrls Set & Map Data Structure Support ---');
  revokedUrls.clear();
  const testSet = new Set(['blob:http://localhost:5173/set-item-1', 'blob:http://localhost:5173/set-item-2']);
  safeRevokeUrls(testSet);
  assert(revokedUrls.has('blob:http://localhost:5173/set-item-1'), '48.1', 'safeRevokeUrls successfully revokes items from Set collection (item 1)');
  assert(revokedUrls.has('blob:http://localhost:5173/set-item-2'), '48.2', 'safeRevokeUrls successfully revokes items from Set collection (item 2)');

  revokedUrls.clear();
  const testMap = new Map([
    ['f1', 'blob:http://localhost:5173/map-item-1'],
    ['f2', { previewUrl: 'blob:http://localhost:5173/map-item-2' }]
  ]);
  safeRevokeUrls(testMap);
  assert(revokedUrls.has('blob:http://localhost:5173/map-item-1'), '48.3', 'safeRevokeUrls revokes string URL from Map');
  assert(revokedUrls.has('blob:http://localhost:5173/map-item-2'), '48.4', 'safeRevokeUrls revokes thumbnail object from Map');

  // --- AREA 49: safeRevokeUrls Circular Reference Immunity ---
  console.log('--- AREA 49: safeRevokeUrls Circular Reference Immunity ---');
  let circularError = false;
  try {
    const circularObj = { previewUrl: 'blob:http://localhost:5173/circular-1' };
    circularObj.self = circularObj;
    safeRevokeUrls(circularObj);
  } catch (err) {
    circularError = true;
  }
  assert(!circularError, '49.1', 'safeRevokeUrls prevents infinite recursion on circular objects via WeakSet');

  // --- AREA 50: convertToBlob WHATWG PNG Return Fallback to JPEG ---
  console.log('--- AREA 50: convertToBlob WHATWG PNG Return Fallback to JPEG ---');
  const mockCanvasSpecPngFallback = {
    width: 320,
    height: 240,
    getContext: () => ({ drawImage: () => {}, clearRect: () => {} }),
    convertToBlob: async ({ type, quality }) => {
      // WHATWG standard: unsupported image/webp returns image/png
      if (type === 'image/webp') {
        return { type: 'image/png', size: 800000 };
      }
      return { type: 'image/jpeg', size: 45000 };
    }
  };
  const specFallbackResult = await generateImageThumbnail(mockFile, {
    canvas: mockCanvasSpecPngFallback,
    createImageBitmap: mockBitmapLoader
  });
  assert(specFallbackResult.mimeType === 'image/jpeg', '50.1', 'Falls back to image/jpeg when convertToBlob returns image/png per WHATWG spec');
  assert(specFallbackResult.size === 45000, '50.2', 'Uses compact JPEG fallback blob instead of heavy PNG');

  // --- AREA 51: Multi-Worker Concurrent Batch Cancellation Zero Leak Guarantee ---
  console.log('--- AREA 51: Multi-Worker Concurrent Batch Cancellation Zero Leak Guarantee ---');
  const concurrentCreated = new Set();
  const concurrentRevoked = new Set();
  let concurrentBlobId = 0;
  const originalCreate = globalThis.URL.createObjectURL;
  const originalRevoke = globalThis.URL.revokeObjectURL;

  globalThis.URL.createObjectURL = (blob) => {
    const url = `blob:http://localhost:5173/concurrent-test-${++concurrentBlobId}`;
    concurrentCreated.add(url);
    return url;
  };
  globalThis.URL.revokeObjectURL = (url) => {
    if (typeof url === 'string') {
      concurrentRevoked.add(url);
    }
  };

  const cancelBatchFiles = [
    createMockImageFile({ name: 'conc1.jpg' }),
    createMockImageFile({ name: 'conc2.jpg' }),
    createMockImageFile({ name: 'conc3.jpg' })
  ];

  const concurrentToken = { isCancelled: false };
  let concCallCount = 0;
  let batchCancelCaught = false;

  try {
    await generateBatchImageThumbnails(cancelBatchFiles, {
      cancellationToken: concurrentToken,
      concurrency: 3,
      createCanvas: (w, h) => createMockCanvas(w, h),
      createImageBitmap: async (f) => {
        concCallCount++;
        if (concCallCount === 1) {
          // Trigger cancellation while workers 2 and 3 are still in flight
          setTimeout(() => { concurrentToken.isCancelled = true; }, 5);
          return mockBitmapLoader(f);
        } else {
          await new Promise((r) => setTimeout(r, 25));
          return mockBitmapLoader(f);
        }
      }
    });
  } catch (err) {
    batchCancelCaught = true;
  }

  // Restore original mock handlers
  globalThis.URL.createObjectURL = originalCreate;
  globalThis.URL.revokeObjectURL = originalRevoke;

  assert(batchCancelCaught === true, '51.1', 'Batch execution rejected with cancellation error');
  const leakedConcurrent = Array.from(concurrentCreated).filter((u) => !concurrentRevoked.has(u));
  assert(leakedConcurrent.length === 0, '51.2', 'Exactly 0 leaked blob URLs across all in-flight workers (zero leak guarantee)');
  assert(concurrentRevoked.size === concurrentCreated.size && concurrentCreated.size > 0, '51.3', 'All allocated URLs were revoked (' + concurrentRevoked.size + ' / ' + concurrentCreated.size + ')');

  // --- AREA 52: Single-Worker In-Flight Cancellation Zero Leak Guarantee ---
  console.log('--- AREA 52: Single-Worker In-Flight Cancellation Zero Leak Guarantee ---');
  const singleCreated = new Set();
  const singleRevoked = new Set();
  let singleBlobId = 0;

  globalThis.URL.createObjectURL = (blob) => {
    const url = `blob:http://localhost:5173/single-cancel-test-${++singleBlobId}`;
    singleCreated.add(url);
    return url;
  };
  globalThis.URL.revokeObjectURL = (url) => {
    if (typeof url === 'string') {
      singleRevoked.add(url);
    }
  };

  const singleToken = { isCancelled: false };
  let singleCancelCaught = false;

  try {
    await generateBatchImageThumbnails([createMockImageFile({ name: 'single1.jpg' })], {
      cancellationToken: singleToken,
      concurrency: 1,
      createCanvas: (w, h) => ({
        width: w,
        height: h,
        getContext: () => ({ drawImage: () => {}, clearRect: () => {} }),
        convertToBlob: async () => {
          singleToken.isCancelled = true;
          return { type: 'image/webp', size: 5000 };
        }
      }),
      createImageBitmap: async (f) => mockBitmapLoader(f)
    });
  } catch (err) {
    singleCancelCaught = true;
  }

  globalThis.URL.createObjectURL = originalCreate;
  globalThis.URL.revokeObjectURL = originalRevoke;

  assert(singleCancelCaught === true, '52.1', 'Single worker batch caught cancellation');
  const leakedSingle = Array.from(singleCreated).filter((u) => !singleRevoked.has(u));
  assert(leakedSingle.length === 0, '52.2', 'Zero leaked URLs when cancelled during single worker thumbnail generation');

  // --- AREA 53: AST Check - ImageConverter.jsx naturalDims Synchronization on handleRemoveFile ---
  console.log('--- AREA 53: AST Check - ImageConverter.jsx naturalDims Synchronization on handleRemoveFile ---');
  assert(/setNaturalDims\s*\(\s*\(\s*prev\s*\)\s*=>\s*prev\.filter\s*\(\s*\(_,\s*idx\)\s*=>\s*idx\s*!==\s*indexToRemove\s*\)\s*\)/.test(convCode),
    '53.1', 'ImageConverter.jsx filters naturalDims state on file removal');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUITE RESULTS: ${passedTests} / ${totalTests} assertions passed (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`Distinct Test Areas: 53 Areas Verified`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    console.error(`FAILED: ${failedTests} assertion(s) failed.`);
    process.exit(1);
  } else {
    console.log('ALL 53 TEST AREAS PASSED WITH ZERO REGRESSIONS (100% PASS RATE).\n');
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
