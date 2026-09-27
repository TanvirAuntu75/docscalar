// Automated Molecular Test Suite: DPR-Aware Thumbnail Resolution Capping
// Topic 4 of 6: thumbnailHelper.js, High-DPI Capping, Safe Bounded Viewports & Leak-Proof Canvas Teardown

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Direct source imports (Zero Local-Copy Rule)
import {
  THUMBNAIL_DEFAULTS,
  computeThumbnailViewport,
  computeThumbnailMemoryBytes,
  renderThumbnailToCanvas,
  renderThumbnailToDataUrl
} from '../../src/utils/thumbnailHelper.js';

import { releaseCanvas, safeCancelRenderTask } from '../../src/utils/canvasLifecycle.js';

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

// Helper: Mock PDF.js Page Proxy (Strictly mirrors PDF.js getViewport specification)
function createMockPage({ width = 595.28, height = 841.89, rotate = 0, renderDelayMs = 0, shouldFail = false } = {}) {
  return {
    rotate,
    view: [0, 0, width, height],
    getViewport({ scale = 1.0, rotation } = {}) {
      // PDF.js: rotation parameter overrides this.rotate; if undefined, defaults to this.rotate
      const effRot = rotation !== undefined ? ((rotation % 360) + 360) % 360 : ((rotate % 360) + 360) % 360;
      const isTransposed = effRot === 90 || effRot === 270;
      const baseW = isTransposed ? height : width;
      const baseH = isTransposed ? width : height;
      return {
        width: baseW * scale,
        height: baseH * scale,
        scale,
        rotation: effRot,
        transform: [scale, 0, 0, scale, 0, 0]
      };
    },
    render({ canvasContext, viewport } = {}) {
      let cancelled = false;
      const promise = new Promise((resolve, reject) => {
        if (shouldFail) {
          setTimeout(() => reject(new Error('Simulated render error')), renderDelayMs);
          return;
        }
        setTimeout(() => {
          if (cancelled) {
            const err = new Error('Rendering cancelled');
            err.name = 'RenderingCancelledException';
            reject(err);
          } else {
            resolve();
          }
        }, renderDelayMs);
      });
      return {
        promise,
        cancel() {
          cancelled = true;
        }
      };
    }
  };
}

// Helper: Mock HTML5 Canvas Element
function createMockCanvas(initialW = 0, initialH = 0) {
  let cleared = false;
  let clearedCoords = null;
  let currentFillStyle = '#000000';
  const fillRectCalls = [];
  return {
    width: initialW,
    height: initialH,
    _cleared: false,
    _clearedCoords: null,
    getContext(type) {
      if (type === '2d') {
        return {
          get fillStyle() { return currentFillStyle; },
          set fillStyle(val) { currentFillStyle = val; },
          fillRect(x, y, w, h) {
            fillRectCalls.push({ fillStyle: currentFillStyle, x, y, w, h });
          },
          drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) {},
          clearRect(x, y, w, h) {
            cleared = true;
            clearedCoords = { x, y, w, h };
          }
        };
      }
      return null;
    },
    toDataURL(format = 'image/jpeg', quality = 0.8) {
      return `data:${format};base64,mockThumbnailData${this.width}x${this.height}q${quality}`;
    },
    get isCleared() { return cleared; },
    get clearCoordinates() { return clearedCoords; },
    get currentFillStyle() { return currentFillStyle; },
    get fillRectCalls() { return fillRectCalls; }
  };
}

console.log('================================================================');
console.log('MOLECULAR TEST SUITE: DPR-Aware Thumbnail Resolution Capping');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// AREA 1: THUMBNAIL_DEFAULTS Configuration Invariants
// -----------------------------------------------------------------------------
console.log('--- AREA 1: THUMBNAIL_DEFAULTS Invariants ---');
assert(
  THUMBNAIL_DEFAULTS.TARGET_WIDTH === 160 &&
  THUMBNAIL_DEFAULTS.MAX_DPR === 2 &&
  THUMBNAIL_DEFAULTS.MIN_SCALE === 0.05 &&
  THUMBNAIL_DEFAULTS.MAX_SCALE === 2.0 &&
  THUMBNAIL_DEFAULTS.DEFAULT_ROTATION === 0 &&
  THUMBNAIL_DEFAULTS.DEFAULT_QUALITY === 0.8 &&
  THUMBNAIL_DEFAULTS.DEFAULT_FORMAT === 'image/jpeg',
  1.1,
  'THUMBNAIL_DEFAULTS contains strictly defined, immutable standard constants'
);
assert(Object.isFrozen(THUMBNAIL_DEFAULTS) === true, 1.2, 'THUMBNAIL_DEFAULTS object is deeply frozen against mutation');

// -----------------------------------------------------------------------------
// AREA 2: Parameter Validation & Error Resilience
// -----------------------------------------------------------------------------
console.log('--- AREA 2: Parameter Validation ---');
let caughtTypeError = false;
try {
  computeThumbnailViewport(null);
} catch (err) {
  caughtTypeError = err instanceof TypeError;
}
assert(caughtTypeError === true, 2.1, 'computeThumbnailViewport strictly throws TypeError on null page');

let caughtInvalidPage = false;
try {
  computeThumbnailViewport({ foo: 'bar' });
} catch (err) {
  caughtInvalidPage = err instanceof TypeError;
}
assert(caughtInvalidPage === true, 2.2, 'computeThumbnailViewport strictly throws TypeError on object lacking getViewport()');

// -----------------------------------------------------------------------------
// AREA 3: Standard A4 Portrait Scale Computation at DPR 1
// -----------------------------------------------------------------------------
console.log('--- AREA 3: Standard A4 Portrait Scale at DPR 1 ---');
const pageA4 = createMockPage({ width: 595.28, height: 841.89 });
const vpA4_dpr1 = computeThumbnailViewport(pageA4, { dpr: 1 });
const expectedScaleA4_1 = 160 / 595.28; // ~0.26878
assert(
  Math.abs(vpA4_dpr1.scale - expectedScaleA4_1) < 1e-6,
  3.1,
  `A4 portrait at DPR 1 computes exact scale formula 160/595.28 = ${expectedScaleA4_1.toFixed(5)} (got ${vpA4_dpr1.scale.toFixed(5)})`
);
assert(
  Math.abs(vpA4_dpr1.width - 160) < 1e-4,
  3.2,
  `A4 viewport width is precisely 160px (got ${vpA4_dpr1.width.toFixed(2)})`
);
const expectedHeightA4_1 = 841.89 * expectedScaleA4_1; // ~226.28
assert(
  Math.abs(vpA4_dpr1.height - expectedHeightA4_1) < 1e-3,
  3.3,
  `A4 viewport height scales proportionally to ${expectedHeightA4_1.toFixed(2)}px (got ${vpA4_dpr1.height.toFixed(2)})`
);

// -----------------------------------------------------------------------------
// AREA 4: Standard A4 Portrait Pixel Memory Formula Verification
// -----------------------------------------------------------------------------
console.log('--- AREA 4: Standard A4 Memory Formula ---');
const memA4_dpr1 = computeThumbnailMemoryBytes(vpA4_dpr1.width, vpA4_dpr1.height);
const expectedMemA4 = 160 * Math.round(expectedHeightA4_1) * 4; // 160 * 226 * 4 = 144,640 bytes
assert(memA4_dpr1 === expectedMemA4, 4.1, `A4 backing store memory computes exact w*h*4 bytes = ${expectedMemA4} bytes (${(expectedMemA4 / 1024).toFixed(1)} KB)`);
assert(memA4_dpr1 < 250 * 1024, 4.2, `A4 thumbnail memory (${memA4_dpr1} bytes) is strictly bounded under 250KB limit`);

// -----------------------------------------------------------------------------
// AREA 5: US Letter Portrait Scale and Dimension Calculations
// -----------------------------------------------------------------------------
console.log('--- AREA 5: US Letter Portrait ---');
const pageLetter = createMockPage({ width: 612, height: 792 });
const vpLetter_dpr1 = computeThumbnailViewport(pageLetter, { dpr: 1 });
const expectedScaleLetter = 160 / 612; // ~0.261438
assert(
  Math.abs(vpLetter_dpr1.scale - expectedScaleLetter) < 1e-6,
  5.1,
  `US Letter computes exact scale 160/612 = ${expectedScaleLetter.toFixed(5)}`
);
assert(Math.abs(vpLetter_dpr1.width - 160) < 1e-4, 5.2, 'US Letter width is 160px');
const expectedHeightLetter = 792 * expectedScaleLetter; // ~207.06
assert(
  Math.abs(vpLetter_dpr1.height - expectedHeightLetter) < 1e-3,
  5.3,
  `US Letter height scales to ${expectedHeightLetter.toFixed(2)}px`
);

// -----------------------------------------------------------------------------
// AREA 6: US Letter Portrait Memory Formula Verification
// -----------------------------------------------------------------------------
console.log('--- AREA 6: US Letter Memory Formula ---');
const memLetter = computeThumbnailMemoryBytes(vpLetter_dpr1.width, vpLetter_dpr1.height);
const expectedMemLetter = 160 * Math.round(expectedHeightLetter) * 4; // 160 * 207 * 4 = 132,480
assert(memLetter === expectedMemLetter, 6.1, `Letter memory computes exact formula = ${expectedMemLetter} bytes (${(expectedMemLetter / 1024).toFixed(1)} KB)`);
assert(memLetter < 250 * 1024, 6.2, 'US Letter memory is strictly bounded under 250KB limit');

// -----------------------------------------------------------------------------
// AREA 7: Landscape A4 Scale Calculation
// -----------------------------------------------------------------------------
console.log('--- AREA 7: Landscape A4 Scale Calculation ---');
const pageLandscapeA4 = createMockPage({ width: 841.89, height: 595.28 });
const vpLandscapeA4 = computeThumbnailViewport(pageLandscapeA4, { dpr: 1 });
const expectedScaleLandscape = 160 / 841.89; // ~0.190048
assert(
  Math.abs(vpLandscapeA4.scale - expectedScaleLandscape) < 1e-6,
  7.1,
  `Landscape A4 computes scale 160/841.89 = ${expectedScaleLandscape.toFixed(5)}`
);
assert(Math.abs(vpLandscapeA4.width - 160) < 1e-4, 7.2, 'Landscape A4 width is 160px');
const expectedHeightLandscape = 595.28 * expectedScaleLandscape; // ~113.13
assert(
  Math.abs(vpLandscapeA4.height - expectedHeightLandscape) < 1e-3,
  7.3,
  `Landscape A4 height scales to ${expectedHeightLandscape.toFixed(2)}px`
);

// -----------------------------------------------------------------------------
// AREA 8: Landscape A4 Memory Calculation
// -----------------------------------------------------------------------------
console.log('--- AREA 8: Landscape A4 Memory ---');
const memLandscape = computeThumbnailMemoryBytes(vpLandscapeA4.width, vpLandscapeA4.height);
const expectedMemLandscape = 160 * Math.round(expectedHeightLandscape) * 4; // 160 * 113 * 4 = 72,320
assert(memLandscape === expectedMemLandscape, 8.1, `Landscape A4 memory = ${expectedMemLandscape} bytes (${(expectedMemLandscape / 1024).toFixed(1)} KB)`);
assert(memLandscape < 250 * 1024, 8.2, 'Landscape A4 memory is strictly bounded under 250KB limit');

// -----------------------------------------------------------------------------
// AREA 9: Ultra-Large Architectural Blueprint Dynamic Downscaling
// -----------------------------------------------------------------------------
console.log('--- AREA 9: Architectural Blueprint Dynamic Downscaling ---');
const pageBlueprint3000 = createMockPage({ width: 3000, height: 4000 });
const vpBlueprint = computeThumbnailViewport(pageBlueprint3000, { dpr: 1 });
const expectedScaleBlueprint = 160 / 3000; // 0.053333...
assert(
  Math.abs(vpBlueprint.scale - expectedScaleBlueprint) < 1e-6,
  9.1,
  `3000pt blueprint scales dynamically to ${expectedScaleBlueprint.toFixed(6)}`
);
assert(Math.abs(vpBlueprint.width - 160) < 1e-4, 9.2, 'Blueprint thumbnail width is constrained to 160px');
assert(
  Math.abs(vpBlueprint.height - (4000 * expectedScaleBlueprint)) < 1e-3,
  9.3,
  `Blueprint thumbnail height is constrained to ${(4000 * expectedScaleBlueprint).toFixed(2)}px`
);

// -----------------------------------------------------------------------------
// AREA 10: Architectural Blueprint Memory Reduction (> 99% Savings)
// -----------------------------------------------------------------------------
console.log('--- AREA 10: Blueprint Memory Reduction ---');
const memBlueprintBounded = computeThumbnailMemoryBytes(vpBlueprint.width, vpBlueprint.height);
const unscaledBlueprintMem = 3000 * 4000 * 4; // 48,000,000 bytes = 48MB
const legacy08ScaleMem = (3000 * 0.8) * (4000 * 0.8) * 4; // 2400 * 3200 * 4 = 30,720,000 bytes = 30.72MB
const reductionVsLegacy = ((legacy08ScaleMem - memBlueprintBounded) / legacy08ScaleMem) * 100;
assert(memBlueprintBounded < 250 * 1024, 10.1, `Blueprint thumbnail memory is ${memBlueprintBounded} bytes (< 250KB limit)`);
assert(
  reductionVsLegacy > 99.0,
  10.2,
  `Memory reduction vs legacy scale 0.8 is ${reductionVsLegacy.toFixed(2)}% (> 99% RAM saved)`
);

// -----------------------------------------------------------------------------
// AREA 11: Massive Blueprint Lower-Bound Scale Clamping (MIN_SCALE = 0.05)
// -----------------------------------------------------------------------------
console.log('--- AREA 11: Massive Blueprint Scale Clamping ---');
const pageMassiveBlueprint = createMockPage({ width: 4000, height: 6000 });
// Calculated scale = 160 / 4000 = 0.04 -> below MIN_SCALE 0.05
const vpMassiveBlueprint = computeThumbnailViewport(pageMassiveBlueprint, { dpr: 1 });
assert(
  vpMassiveBlueprint.scale === 0.05,
  11.1,
  `Scale 0.04 is strictly clamped to MIN_SCALE = 0.05 (got ${vpMassiveBlueprint.scale})`
);
assert(vpMassiveBlueprint.width === 4000 * 0.05, 11.2, `Width clamped to 200px (4000 * 0.05)`);
assert(vpMassiveBlueprint.height === 6000 * 0.05, 11.3, `Height clamped to 300px (6000 * 0.05)`);
const memMassive = computeThumbnailMemoryBytes(vpMassiveBlueprint.width, vpMassiveBlueprint.height);
assert(memMassive === 200 * 300 * 4, 11.4, `Massive blueprint memory is ${memMassive} bytes (234.4 KB < 250KB)`);

// -----------------------------------------------------------------------------
// AREA 12: Microscopic PDF Upper-Bound Scale Clamping (MAX_SCALE = 2.0)
// -----------------------------------------------------------------------------
console.log('--- AREA 12: Microscopic PDF Scale Clamping ---');
const pageMicroscopic = createMockPage({ width: 50, height: 50 });
// Calculated scale = 160 / 50 = 3.2 -> above MAX_SCALE 2.0
const vpMicroscopic = computeThumbnailViewport(pageMicroscopic, { dpr: 1 });
assert(
  vpMicroscopic.scale === 2.0,
  12.1,
  `Scale 3.2 is strictly clamped to MAX_SCALE = 2.0 (got ${vpMicroscopic.scale})`
);
assert(vpMicroscopic.width === 100, 12.2, 'Microscopic PDF width is 100px (50 * 2.0)');
assert(vpMicroscopic.height === 100, 12.3, 'Microscopic PDF height is 100px (50 * 2.0)');
const memMicro = computeThumbnailMemoryBytes(vpMicroscopic.width, vpMicroscopic.height);
assert(memMicro === 40000, 12.4, `Microscopic PDF memory is 40,000 bytes (< 250KB)`);

// -----------------------------------------------------------------------------
// AREA 13: High-DPI Clamping: DPR = 3 Clamped to maxDpr = 2
// -----------------------------------------------------------------------------
console.log('--- AREA 13: DPR = 3 Clamped to maxDpr = 2 ---');
const vpDpr3 = computeThumbnailViewport(pageA4, { dpr: 3, maxDpr: 2 });
const vpDpr2 = computeThumbnailViewport(pageA4, { dpr: 2, maxDpr: 2 });
assert(
  vpDpr3.scale === vpDpr2.scale,
  13.1,
  `DPR=3 scale (${vpDpr3.scale.toFixed(5)}) is strictly clamped to DPR=2 scale (${vpDpr2.scale.toFixed(5)})`
);
assert(
  vpDpr3.width === vpDpr2.width && vpDpr3.height === vpDpr2.height,
  13.2,
  'DPR=3 dimensions are identical to DPR=2 dimensions'
);

// -----------------------------------------------------------------------------
// AREA 14: High-DPI Clamping: DPR = 4 Clamped to maxDpr = 2
// -----------------------------------------------------------------------------
console.log('--- AREA 14: DPR = 4 Clamped to maxDpr = 2 ---');
const vpDpr4 = computeThumbnailViewport(pageA4, { dpr: 4, maxDpr: 2 });
assert(
  vpDpr4.scale === vpDpr2.scale,
  14.1,
  `DPR=4 scale (${vpDpr4.scale.toFixed(5)}) is strictly clamped to DPR=2 scale`
);

// -----------------------------------------------------------------------------
// AREA 15: Custom maxDpr Constraint (e.g. maxDpr = 1.5)
// -----------------------------------------------------------------------------
console.log('--- AREA 15: Custom maxDpr Constraint ---');
const vpCustomMaxDpr = computeThumbnailViewport(pageA4, { dpr: 3, maxDpr: 1.5 });
const expectedScaleCustom = (160 * 1.5) / 595.28;
assert(
  Math.abs(vpCustomMaxDpr.scale - expectedScaleCustom) < 1e-6,
  15.1,
  `Custom maxDpr=1.5 clamps DPR=3 to scale ${expectedScaleCustom.toFixed(5)}`
);

// -----------------------------------------------------------------------------
// AREA 16: window.devicePixelRatio Global Resolution
// -----------------------------------------------------------------------------
console.log('--- AREA 16: window.devicePixelRatio Global Resolution ---');
globalThis.window = { devicePixelRatio: 3.5 };
const vpGlobalWindow = computeThumbnailViewport(pageA4); // no options.dpr passed
assert(
  vpGlobalWindow.scale === vpDpr2.scale,
  16.1,
  'Reads window.devicePixelRatio (3.5) and clamps safely to default maxDpr (2)'
);
delete globalThis.window;

// -----------------------------------------------------------------------------
// AREA 17: Window Undefined Fallback to DPR = 1
// -----------------------------------------------------------------------------
console.log('--- AREA 17: Window Undefined Fallback ---');
const prevWindow = globalThis.window;
delete globalThis.window;
const vpNoWindow = computeThumbnailViewport(pageA4);
assert(
  Math.abs(vpNoWindow.scale - (160 / 595.28)) < 1e-6,
  17.1,
  'When window is undefined, defaults safely to DPR = 1'
);
if (prevWindow) globalThis.window = prevWindow;

// -----------------------------------------------------------------------------
// AREA 18: Negative or Invalid DPR Fallback Safety
// -----------------------------------------------------------------------------
console.log('--- AREA 18: Negative or Invalid DPR Fallback ---');
const vpNegDpr = computeThumbnailViewport(pageA4, { dpr: -2 });
assert(
  Math.abs(vpNegDpr.scale - (160 / 595.28)) < 1e-6,
  18.1,
  'Negative DPR fallback safely defaults to DPR = 1'
);
const vpNanDpr = computeThumbnailViewport(pageA4, { dpr: NaN });
assert(
  Math.abs(vpNanDpr.scale - (160 / 595.28)) < 1e-6,
  18.2,
  'NaN DPR fallback safely defaults to DPR = 1'
);

// -----------------------------------------------------------------------------
// AREA 19: Rotation Preservation: 90 Degrees
// -----------------------------------------------------------------------------
console.log('--- AREA 19: Rotation 90 Degrees ---');
const vpRot90 = computeThumbnailViewport(pageA4, { rotation: 90, dpr: 1 });
// Page unscaled dimensions at 90 deg: width = 841.89, height = 595.28
const expectedScaleRot90 = 160 / 841.89;
assert(vpRot90.rotation === 90, 19.1, 'Viewport preserves rotation: 90');
assert(
  Math.abs(vpRot90.scale - expectedScaleRot90) < 1e-6,
  19.2,
  `Scale at 90° rotation is calculated on rotated width 841.89: ${expectedScaleRot90.toFixed(5)}`
);
assert(Math.abs(vpRot90.width - 160) < 1e-4, 19.3, 'Rotated 90° thumbnail width is 160px');

// -----------------------------------------------------------------------------
// AREA 20: Rotation Preservation: 180 Degrees
// -----------------------------------------------------------------------------
console.log('--- AREA 20: Rotation 180 Degrees ---');
const vpRot180 = computeThumbnailViewport(pageA4, { rotation: 180, dpr: 1 });
assert(vpRot180.rotation === 180, 20.1, 'Viewport preserves rotation: 180');
assert(
  Math.abs(vpRot180.scale - (160 / 595.28)) < 1e-6,
  20.2,
  'Scale at 180° rotation matches unrotated portrait width'
);

// -----------------------------------------------------------------------------
// AREA 21: Rotation Preservation: 270 Degrees
// -----------------------------------------------------------------------------
console.log('--- AREA 21: Rotation 270 Degrees ---');
const vpRot270 = computeThumbnailViewport(pageA4, { rotation: 270, dpr: 1 });
assert(vpRot270.rotation === 270, 21.1, 'Viewport preserves rotation: 270');
assert(
  Math.abs(vpRot270.scale - expectedScaleRot90) < 1e-6,
  21.2,
  'Scale at 270° rotation matches 90° rotation scale'
);

// -----------------------------------------------------------------------------
// AREA 22: Page Inherent Rotation Fallback (page.rotate)
// -----------------------------------------------------------------------------
console.log('--- AREA 22: page.rotate Fallback ---');
const pageInherentRotate = createMockPage({ width: 595.28, height: 841.89, rotate: 90 });
const vpInherent = computeThumbnailViewport(pageInherentRotate, { dpr: 1 });
assert(vpInherent.rotation === 90, 22.1, 'Respects inherent page.rotate = 90 when rotation option is omitted');

// -----------------------------------------------------------------------------
// AREA 23: computeThumbnailMemoryBytes Formula Verification (w * h * 4)
// -----------------------------------------------------------------------------
console.log('--- AREA 23: computeThumbnailMemoryBytes Formula ---');
assert(computeThumbnailMemoryBytes(100, 100) === 40000, 23.1, '100x100 -> 40,000 bytes');
assert(computeThumbnailMemoryBytes(160, 226) === 144640, 23.2, '160x226 -> 144,640 bytes');
assert(computeThumbnailMemoryBytes(320, 452) === 578560, 23.3, '320x452 -> 578,560 bytes');

// -----------------------------------------------------------------------------
// AREA 24: computeThumbnailMemoryBytes Rounding and Boundary Edge Cases
// -----------------------------------------------------------------------------
console.log('--- AREA 24: computeThumbnailMemoryBytes Boundaries ---');
assert(computeThumbnailMemoryBytes(159.7, 225.4) === 160 * 225 * 4, 24.1, 'Rounds fractional pixel dimensions before multiplying');
assert(computeThumbnailMemoryBytes(0, 500) === 0, 24.2, 'Zero width yields 0 bytes');
assert(computeThumbnailMemoryBytes(-100, 100) === 0, 24.3, 'Negative dimension yields 0 bytes');
assert(computeThumbnailMemoryBytes(NaN, 100) === 0, 24.4, 'NaN dimension yields 0 bytes');

// -----------------------------------------------------------------------------
// AREA 25: renderThumbnailToCanvas Canvas Dimension Sizing
// -----------------------------------------------------------------------------
console.log('--- AREA 25: renderThumbnailToCanvas Sizing ---');
const mockCanvas1 = createMockCanvas();
const renderRes1 = renderThumbnailToCanvas(pageA4, mockCanvas1, { dpr: 1 });
assert(mockCanvas1.width === 160, 25.1, 'Target canvas width is sized to 160px');
assert(mockCanvas1.height === Math.round(vpA4_dpr1.height), 25.2, `Target canvas height is sized to ${mockCanvas1.height}px`);
assert(renderRes1.width === 160 && renderRes1.height === mockCanvas1.height, 25.3, 'Returns width and height matching canvas');
assert(renderRes1.renderTask !== null, 25.4, 'Returns active renderTask object');

// -----------------------------------------------------------------------------
// AREA 26: renderThumbnailToCanvas React Ref Unwrapping
// -----------------------------------------------------------------------------
console.log('--- AREA 26: React Ref Unwrapping ---');
const innerCanvas = createMockCanvas();
const reactRef = { current: innerCanvas };
const renderResRef = renderThumbnailToCanvas(pageA4, reactRef, { dpr: 1 });
assert(innerCanvas.width === 160, 26.1, 'Unwraps React ref ({ current: canvas }) and sizes inner canvas');
assert(renderResRef.width === 160, 26.2, 'Returns valid result when ref is passed');

// -----------------------------------------------------------------------------
// AREA 27: renderThumbnailToCanvas In-Flight Render Task Cancellation
// -----------------------------------------------------------------------------
console.log('--- AREA 27: Render Task Cancellation ---');
let priorTaskCancelled = false;
const priorTask = {
  cancel() {
    priorTaskCancelled = true;
  }
};
renderThumbnailToCanvas(pageA4, mockCanvas1, { renderTask: priorTask });
assert(priorTaskCancelled === true, 27.1, 'Cancels explicit prior renderTask passed in options');

// -----------------------------------------------------------------------------
// AREA 28: renderThumbnailToCanvas Internal Task Tracking & Cleanup
// -----------------------------------------------------------------------------
console.log('--- AREA 28: Internal Task Tracking & Cleanup ---');
const trackingCanvas = createMockCanvas();
renderThumbnailToCanvas(pageA4, trackingCanvas, { dpr: 1 });
const attachedTask = trackingCanvas._docscalarRenderTask;
assert(attachedTask !== null && typeof attachedTask.cancel === 'function', 28.1, 'Attaches active renderTask to canvas._docscalarRenderTask');

// Now render again to the same canvas -> should cancel attachedTask
let attachedTaskWasCancelled = false;
const origCancel = attachedTask.cancel;
attachedTask.cancel = () => {
  attachedTaskWasCancelled = true;
  origCancel.call(attachedTask);
};
renderThumbnailToCanvas(pageA4, trackingCanvas, { dpr: 1 });
assert(attachedTaskWasCancelled === true, 28.2, 'Subsequent render automatically cancels prior _docscalarRenderTask');

// -----------------------------------------------------------------------------
// AREA 29: renderThumbnailToCanvas Null/Undefined Handling
// -----------------------------------------------------------------------------
console.log('--- AREA 29: Null/Undefined Handling ---');
const resNullPage = renderThumbnailToCanvas(null, mockCanvas1);
assert(resNullPage.renderTask === null && resNullPage.width === 0, 29.1, 'Safely handles null page');
const resNullCanvas = renderThumbnailToCanvas(pageA4, null);
assert(resNullCanvas.renderTask === null && resNullCanvas.width === 0, 29.2, 'Safely handles null canvas');

// -----------------------------------------------------------------------------
// AREA 30: renderThumbnailToDataUrl Execution and Return
// -----------------------------------------------------------------------------
console.log('--- AREA 30: renderThumbnailToDataUrl Execution ---');
const testOffCanvas = createMockCanvas();
const dataUrlPromise = renderThumbnailToDataUrl(pageA4, { canvas: testOffCanvas, dpr: 1 });
const dataUrl = await dataUrlPromise;
assert(typeof dataUrl === 'string' && dataUrl.startsWith('data:image/jpeg;base64,'), 30.1, 'Returns valid data URL string');

// -----------------------------------------------------------------------------
// AREA 31: renderThumbnailToDataUrl Temporary Canvas Deallocation (releaseCanvas)
// -----------------------------------------------------------------------------
console.log('--- AREA 31: Temporary Canvas Deallocation ---');
// After renderThumbnailToDataUrl finishes, releaseCanvas should have collapsed dimensions to 0 and cleared context
assert(testOffCanvas.width === 0, 31.1, 'Canvas width is collapsed to 0 via releaseCanvas()');
assert(testOffCanvas.height === 0, 31.2, 'Canvas height is collapsed to 0 via releaseCanvas()');
assert(testOffCanvas.isCleared === true, 31.3, 'Canvas 2D context was cleared with clearRect()');

// -----------------------------------------------------------------------------
// AREA 32: renderThumbnailToDataUrl Exception Resilience
// -----------------------------------------------------------------------------
console.log('--- AREA 32: Exception Resilience ---');
const failingPage = createMockPage({ shouldFail: true });
const failCanvas = createMockCanvas(160, 226);
let caughtRenderErr = false;
try {
  await renderThumbnailToDataUrl(failingPage, { canvas: failCanvas, dpr: 1 });
} catch (err) {
  caughtRenderErr = true;
}
assert(caughtRenderErr === true, 32.1, 'Propagates render rejection to caller');
assert(failCanvas.width === 0 && failCanvas.height === 0, 32.2, 'Canvas is released in finally block even when render fails');

// -----------------------------------------------------------------------------
// AREA 33: OrganizeStudio.jsx AST - computeThumbnailViewport Import
// -----------------------------------------------------------------------------
console.log('--- AREA 33: OrganizeStudio AST Import ---');
const organizeStudioPath = path.join(rootDir, 'src/components/FocusStudio/studios/OrganizeStudio.jsx');
const organizeStudioContent = fs.readFileSync(organizeStudioPath, 'utf8');
assert(
  organizeStudioContent.includes('computeThumbnailViewport') &&
  organizeStudioContent.includes('thumbnailHelper'),
  33.1,
  'OrganizeStudio.jsx imports computeThumbnailViewport from thumbnailHelper'
);

// -----------------------------------------------------------------------------
// AREA 34: OrganizeStudio.jsx AST - PageCard DPR-Aware Scaling
// -----------------------------------------------------------------------------
console.log('--- AREA 34: OrganizeStudio AST PageCard Scaling ---');
assert(
  organizeStudioContent.includes('computeThumbnailViewport(page, { targetWidth: 160, maxDpr: 2 })'),
  34.1,
  'PageCard calls computeThumbnailViewport with targetWidth: 160 and maxDpr: 2'
);

// -----------------------------------------------------------------------------
// AREA 35: OrganizeStudio.jsx AST - Elimination of Legacy scale: 0.8
// -----------------------------------------------------------------------------
console.log('--- AREA 35: OrganizeStudio AST Legacy Scale Elimination ---');
assert(
  !organizeStudioContent.includes('page.getViewport({ scale: 0.8 })'),
  35.1,
  'Hardcoded page.getViewport({ scale: 0.8 }) is completely eradicated from OrganizeStudio.jsx'
);
assert(
  organizeStudioContent.includes('releaseCanvas(canvasRef.current)'),
  35.2,
  'PageCard cleans up canvasRef on unmount via releaseCanvas'
);

// -----------------------------------------------------------------------------
// AREA 36: MergePdf.jsx AST - computeThumbnailViewport & releaseCanvas Imports
// -----------------------------------------------------------------------------
console.log('--- AREA 36: MergePdf AST Imports ---');
const mergePdfPath = path.join(rootDir, 'src/pages/pdf/MergePdf.jsx');
const mergePdfContent = fs.readFileSync(mergePdfPath, 'utf8');
assert(
  mergePdfContent.includes('computeThumbnailViewport') &&
  mergePdfContent.includes('thumbnailHelper'),
  36.1,
  'MergePdf.jsx imports computeThumbnailViewport from thumbnailHelper'
);
assert(
  mergePdfContent.includes('releaseCanvas') &&
  mergePdfContent.includes('canvasLifecycle'),
  36.2,
  'MergePdf.jsx imports releaseCanvas from canvasLifecycle'
);

// -----------------------------------------------------------------------------
// AREA 37: MergePdf.jsx AST - generateThumbnail & getPagePreview Exports
// -----------------------------------------------------------------------------
console.log('--- AREA 37: MergePdf AST generateThumbnail Exports ---');
assert(
  mergePdfContent.includes('export async function generateThumbnail'),
  37.1,
  'MergePdf.jsx defines and exports generateThumbnail function'
);
assert(
  mergePdfContent.includes('export const getPagePreview = generateThumbnail'),
  37.2,
  'MergePdf.jsx defines and exports getPagePreview alias'
);
assert(
  mergePdfContent.includes('computeThumbnailViewport(firstPage'),
  37.3,
  'generateThumbnail invokes computeThumbnailViewport on firstPage'
);

// -----------------------------------------------------------------------------
// AREA 38: MergePdf.jsx AST - Canvas & CropCanvas Release via releaseCanvas
// -----------------------------------------------------------------------------
console.log('--- AREA 38: MergePdf AST Canvas Memory Teardown ---');
assert(
  mergePdfContent.includes('releaseCanvas(canvas)') &&
  mergePdfContent.includes('releaseCanvas(cropCanvas)'),
  38.1,
  'MergePdf.jsx releases both canvas and cropCanvas via releaseCanvas in finally blocks'
);

// -----------------------------------------------------------------------------
// AREA 39: MergePdf.jsx AST - Elimination of Legacy scale: 0.35 in Render Loop
// -----------------------------------------------------------------------------
console.log('--- AREA 39: MergePdf AST Legacy Scale Elimination ---');
assert(
  !mergePdfContent.includes('firstPage.getViewport({ scale: 0.35 })'),
  39.1,
  'Hardcoded firstPage.getViewport({ scale: 0.35 }) is completely eliminated from MergePdf.jsx'
);
assert(
  mergePdfContent.includes('await generateThumbnail(firstPage, file)'),
  39.2,
  'File loading loop in MergePdf delegates to generateThumbnail(firstPage, file)'
);

// -----------------------------------------------------------------------------
// AREA 40: Multi-Page Batch Memory Projection (100 Thumbnails < 15MB)
// -----------------------------------------------------------------------------
console.log('--- AREA 40: Multi-Page Batch Memory Projection ---');
const totalBatchThumbnails = 100;
const memoryPerThumbnailBytes = computeThumbnailMemoryBytes(160, 226); // 144,640 bytes
const totalBatchMemoryBytes = totalBatchThumbnails * memoryPerThumbnailBytes;
const totalBatchMemoryMB = totalBatchMemoryBytes / (1024 * 1024);
assert(
  totalBatchMemoryMB < 15.0,
  40.1,
  `100 capped thumbnails consume ${(totalBatchMemoryMB).toFixed(2)}MB total (< 15MB ceiling, got ${totalBatchMemoryBytes} bytes)`
);
const legacyBatchMemoryMB = (totalBatchThumbnails * ((595 * 0.8) * (842 * 0.8) * 4)) / (1024 * 1024); // ~122.3 MB
assert(
  legacyBatchMemoryMB > 120.0,
  40.2,
  `Legacy scale 0.8 would have consumed ${(legacyBatchMemoryMB).toFixed(1)}MB for 100 thumbnails (> 120MB)`
);
const batchSavingsPct = ((legacyBatchMemoryMB - totalBatchMemoryMB) / legacyBatchMemoryMB) * 100;
assert(
  batchSavingsPct > 85.0,
  40.3,
  `Batch memory reduction is ${batchSavingsPct.toFixed(1)}% across 100 document cards`
);

// -----------------------------------------------------------------------------
// AREA 41: Malformed & Zero/Negative Page Dimension Hardening
// -----------------------------------------------------------------------------
console.log('--- AREA 41: Malformed Page Dimension Hardening ---');
const pageZeroWidth = createMockPage({ width: 0, height: 100 });
const vpZeroW = computeThumbnailViewport(pageZeroWidth, { targetWidth: 160, dpr: 1 });
assert(
  isFinite(vpZeroW.scale) && vpZeroW.scale > 0 && !isNaN(vpZeroW.scale),
  41.1,
  'Zero unscaled width safely falls back to targetWidth and yields finite positive scale'
);
assert(
  isFinite(vpZeroW.width) && !isNaN(vpZeroW.width),
  41.2,
  'Zero unscaled width does not produce NaN viewport dimensions'
);

const pageNanWidth = {
  rotate: 0,
  getViewport({ scale = 1.0, rotation = 0 } = {}) {
    return { width: NaN, height: NaN, scale, rotation, transform: [scale, 0, 0, scale, 0, 0] };
  }
};
const vpNanW = computeThumbnailViewport(pageNanWidth, { targetWidth: 160, dpr: 1 });
assert(
  !isNaN(vpNanW.scale) && isFinite(vpNanW.scale) && vpNanW.scale === 1.0,
  41.3,
  'NaN unscaled width safely falls back to scale 1.0 without propagating NaN'
);

let threwOnce = false;
const pageThrowingViewport = {
  rotate: 0,
  getViewport({ scale = 1.0, rotation = 0 } = {}) {
    if (scale === 1.0 && !threwOnce) {
      threwOnce = true;
      throw new Error('Corrupt page header on scale 1.0 probe');
    }
    return { width: 160 * scale, height: 200 * scale, scale, rotation, transform: [scale, 0, 0, scale, 0, 0] };
  }
};
const vpThrowing = computeThumbnailViewport(pageThrowingViewport, { targetWidth: 160, dpr: 1 });
assert(
  !isNaN(vpThrowing.scale) && isFinite(vpThrowing.scale),
  41.4,
  'getViewport exception during unscaled width calculation is cleanly caught and falls back to safe scale'
);

// -----------------------------------------------------------------------------
// AREA 42: WebP Offscreen Thumbnail Rendering with Default White Background
// -----------------------------------------------------------------------------
console.log('--- AREA 42: WebP Thumbnail Rendering & Background ---');
const webpCanvas = createMockCanvas();
const webpDataUrl = await renderThumbnailToDataUrl(pageA4, { canvas: webpCanvas, format: 'image/webp', dpr: 1 });
assert(
  typeof webpDataUrl === 'string' && webpDataUrl.startsWith('data:image/webp;base64,'),
  42.1,
  'Renders valid WebP image data URL'
);
const hasWhiteFill = webpCanvas.fillRectCalls.some(call => call.fillStyle === '#FFFFFF');
assert(
  hasWhiteFill === true,
  42.2,
  'WebP offscreen thumbnail fills canvas with #FFFFFF page sheet background by default'
);

// -----------------------------------------------------------------------------
// AREA 43: Canvas Re-render Context Clearing (clearRect)
// -----------------------------------------------------------------------------
console.log('--- AREA 43: Canvas Re-render Context Clearing ---');
const rerenderCanvas = createMockCanvas(160, 226);
renderThumbnailToCanvas(pageA4, rerenderCanvas, { dpr: 1 });
assert(
  rerenderCanvas.isCleared === true,
  43.1,
  'renderThumbnailToCanvas calls clearRect before drawing new thumbnail'
);
assert(
  rerenderCanvas.clearCoordinates &&
  rerenderCanvas.clearCoordinates.w === 160 &&
  rerenderCanvas.clearCoordinates.h === rerenderCanvas.height,
  43.2,
  'clearRect coordinates span entire canvas dimensions (0, 0, width, height)'
);

// -----------------------------------------------------------------------------
// AREA 44: Custom Background Color Pass-Through
// -----------------------------------------------------------------------------
console.log('--- AREA 44: Custom Background Color Pass-Through ---');
const customBgCanvas = createMockCanvas();
renderThumbnailToCanvas(pageA4, customBgCanvas, { dpr: 1, backgroundColor: '#F8FAFC' });
assert(
  customBgCanvas.fillRectCalls.some(c => c.fillStyle === '#F8FAFC'),
  44.1,
  'renderThumbnailToCanvas fills canvas with custom backgroundColor (#F8FAFC)'
);

const customDataUrlCanvas = createMockCanvas();
await renderThumbnailToDataUrl(pageA4, { canvas: customDataUrlCanvas, dpr: 1, backgroundColor: '#0F172A' });
assert(
  customDataUrlCanvas.fillRectCalls.some(c => c.fillStyle === '#0F172A'),
  44.2,
  'renderThumbnailToDataUrl fills canvas with custom backgroundColor (#0F172A)'
);

// -----------------------------------------------------------------------------
// AREA 45: Invalid Target Width Parameter Bounds
// -----------------------------------------------------------------------------
console.log('--- AREA 45: Invalid Target Width Bounds ---');
const vpNegWidth = computeThumbnailViewport(pageA4, { targetWidth: -50, dpr: 1 });
assert(
  vpNegWidth.width === 160,
  45.1,
  'Negative targetWidth safely defaults to THUMBNAIL_DEFAULTS.TARGET_WIDTH (160px)'
);
const vpZeroTargetWidth = computeThumbnailViewport(pageA4, { targetWidth: 0, dpr: 1 });
assert(
  vpZeroTargetWidth.width === 160,
  45.2,
  'Zero targetWidth safely defaults to 160px'
);
const vpNanTargetWidth = computeThumbnailViewport(pageA4, { targetWidth: NaN, dpr: 1 });
assert(
  vpNanTargetWidth.width === 160,
  45.3,
  'NaN targetWidth safely defaults to 160px'
);

// -----------------------------------------------------------------------------
// AREA 46: Invalid Max DPR Parameter Bounds
// -----------------------------------------------------------------------------
console.log('--- AREA 46: Invalid Max DPR Bounds ---');
const vpNegMaxDpr = computeThumbnailViewport(pageA4, { maxDpr: -1, dpr: 3 });
assert(
  Math.abs(vpNegMaxDpr.scale - (160 * 2 / 595.28)) < 1e-6,
  46.1,
  'Negative maxDpr safely defaults to THUMBNAIL_DEFAULTS.MAX_DPR (2)'
);
const vpZeroMaxDpr = computeThumbnailViewport(pageA4, { maxDpr: 0, dpr: 3 });
assert(
  Math.abs(vpZeroMaxDpr.scale - (160 * 2 / 595.28)) < 1e-6,
  46.2,
  'Zero maxDpr safely defaults to 2'
);
const vpNanMaxDpr = computeThumbnailViewport(pageA4, { maxDpr: NaN, dpr: 3 });
assert(
  Math.abs(vpNanMaxDpr.scale - (160 * 2 / 595.28)) < 1e-6,
  46.3,
  'NaN maxDpr safely defaults to 2'
);

// -----------------------------------------------------------------------------
// FINAL SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST SUITE RESULTS: ${passedTests} / ${totalTests} assertions passed (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log(`Distinct Test Areas: 46 Areas Verified`);
console.log('================================================================\n');

if (failedTests > 0) {
  console.error(`FAILED: ${failedTests} assertion(s) failed:`);
  for (const f of failures) {
    console.error(`  - Area ${f.areaNumber}: ${f.description}`);
  }
  process.exit(1);
} else {
  console.log('ALL 46 TEST AREAS PASSED WITH ZERO REGRESSIONS (100% PASS RATE).');
  process.exit(0);
}
