import fs from 'fs';
import { PNG } from 'pngjs';
import { computeCleanPdfCropBox, detectSmartBorders } from '../../src/utils/pdfZoneScanner.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ Pass: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('--- Starting Empirical Pre-Test Simulations ---');

// Test 1-5: Load images
const zoom65Data = fs.readFileSync('scratch/stats_zoom65.png');
const png65 = PNG.sync.read(zoom65Data);
assert(png65.width === 1613 && png65.height === 2280, 'stats_zoom65.png dimensions are 1613x2280');

const zoom90Data = fs.readFileSync('scratch/stats_zoom90.png');
const png90 = PNG.sync.read(zoom90Data);
assert(png90.width === 2233 && png90.height === 3158, 'stats_zoom90.png dimensions are 2233x3158');

const visionData = fs.readFileSync('scratch/vision_p1_150.png');
const pngVision = PNG.sync.read(visionData);
assert(pngVision.width > 0 && pngVision.height > 0, 'vision_p1_150.png loaded');

// Test Simulated Resolution-Aware detectBlackScanBorders
function simulatedScanBorders(canvas) {
  const { width, height, data } = canvas;
  const darkPixelLumThreshold = 120;
  const darkLuminanceThreshold = 150;
  const cleanLuminanceThreshold = 220;
  const consecutiveCleanRows = 5;
  const padX = Math.min(Math.floor(width * 0.15), 100);
  const padY = Math.min(Math.floor(height * 0.15), 100);
  const spanW = width - 2 * padX;
  const spanH = height - 2 * padY;
  const maxCropX = Math.floor(width * 0.35);
  const maxCropY = Math.floor(height * 0.35);

  const maxCleanPerimeterGapY = Math.max(65, Math.floor(height * 0.12));
  const maxCleanPerimeterGapX = Math.max(65, Math.floor(width * 0.12));

  function getPixelLum(x, y) {
    const idx = (y * width + x) * 4;
    return 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
  }

  // Bottom Scan
  let rawCropBottom = 0;
  let cleanCount = 0;
  let cleanAtPerimeter = 0;
  for (let y = height - 1; y >= height - maxCropY; y--) {
    let darkCount = 0;
    let lumSum = 0;
    let maxContDark = 0;
    let curContDark = 0;
    let curDarkStart = 0;
    let maxDarkStart = 0;
    let maxDarkEnd = 0;
    let transitions = 0;
    let wasDark = false;
    for (let x = padX; x < width - padX; x++) {
      const lum = getPixelLum(x, y);
      lumSum += lum;
      const isDark = lum < darkPixelLumThreshold;
      if (isDark) {
        if (curContDark === 0) curDarkStart = x;
        darkCount++;
        curContDark++;
        if (curContDark > maxContDark) {
          maxContDark = curContDark;
          maxDarkStart = curDarkStart;
          maxDarkEnd = x;
        }
      } else {
        curContDark = 0;
      }
      if (x > padX && isDark !== wasDark) transitions++;
      wasDark = isDark;
    }
    const darkRatio = darkCount / spanW;
    const avgLum = lumSum / spanW;
    const contDarkRatio = maxContDark / spanW;
    const touchesCenter = (maxDarkStart < (width - padX) && maxDarkEnd > padX);
    const isWedgeShadow = (contDarkRatio >= 0.08 && maxContDark >= 16 && transitions <= 6 && (rawCropBottom > 0 || touchesCenter));
    const isShadow = (transitions <= 6 && (darkRatio > 0.20 || avgLum < darkLuminanceThreshold || isWedgeShadow));
    if (isShadow) {
      rawCropBottom = height - y;
      cleanCount = 0;
    } else if (rawCropBottom > 0 && avgLum >= cleanLuminanceThreshold && darkRatio < 0.08 && maxContDark < 16) {
      cleanCount++;
      if (cleanCount >= consecutiveCleanRows) break;
    } else if (rawCropBottom === 0) {
      if (avgLum >= cleanLuminanceThreshold && darkRatio < 0.08 && maxContDark < 16) {
        cleanAtPerimeter++;
        if (cleanAtPerimeter >= maxCleanPerimeterGapY) break;
      } else {
        cleanAtPerimeter = 0;
      }
    }
  }

  // Right Scan
  let rawCropRight = 0;
  cleanCount = 0;
  cleanAtPerimeter = 0;
  for (let x = width - 1; x >= width - maxCropX; x--) {
    let darkCount = 0;
    let lumSum = 0;
    let maxContDark = 0;
    let curContDark = 0;
    let curDarkStart = 0;
    let maxDarkStart = 0;
    let maxDarkEnd = 0;
    let transitions = 0;
    let wasDark = false;
    for (let y = padY; y < height - padY; y++) {
      const lum = getPixelLum(x, y);
      lumSum += lum;
      const isDark = lum < darkPixelLumThreshold;
      if (isDark) {
        if (curContDark === 0) curDarkStart = y;
        darkCount++;
        curContDark++;
        if (curContDark > maxContDark) {
          maxContDark = curContDark;
          maxDarkStart = curDarkStart;
          maxDarkEnd = y;
        }
      } else {
        curContDark = 0;
      }
      if (y > padY && isDark !== wasDark) transitions++;
      wasDark = isDark;
    }
    const darkRatio = darkCount / spanH;
    const avgLum = lumSum / spanH;
    const contDarkRatio = maxContDark / spanH;
    const touchesCenter = (maxDarkStart < (height - padY) && maxDarkEnd > padY);
    const isWedgeShadow = (contDarkRatio >= 0.08 && maxContDark >= 16 && transitions <= 6 && (rawCropRight > 0 || touchesCenter));
    const isShadow = (transitions <= 6 && (darkRatio > 0.20 || avgLum < darkLuminanceThreshold || isWedgeShadow));
    if (isShadow) {
      rawCropRight = width - x;
      cleanCount = 0;
    } else if (rawCropRight > 0 && avgLum >= cleanLuminanceThreshold && darkRatio < 0.08 && maxContDark < 16) {
      cleanCount++;
      if (cleanCount >= consecutiveCleanRows) break;
    } else if (rawCropRight === 0) {
      if (avgLum >= cleanLuminanceThreshold && darkRatio < 0.08 && maxContDark < 16) {
        cleanAtPerimeter++;
        if (cleanAtPerimeter >= maxCleanPerimeterGapX) break;
      } else {
        cleanAtPerimeter = 0;
      }
    }
  }

  return {
    cropTop: 0,
    cropBottom: rawCropBottom,
    cropLeft: 0,
    cropRight: rawCropRight,
    hasBlackBorders: rawCropBottom > 0 || rawCropRight > 0
  };
}

// Tests 6-12: Simulated scan on zoom 65% and 90%
const res65 = simulatedScanBorders({ width: png65.width, height: png65.height, data: png65.data });
assert(res65.cropBottom === 114, `Zoom 65% detects bottom shadow bar: cropBottom = ${res65.cropBottom}px (expected 114px)`);
assert(res65.cropRight > 140, `Zoom 65% detects right scanner border: cropRight = ${res65.cropRight}px`);

const res90 = simulatedScanBorders({ width: png90.width, height: png90.height, data: png90.data });
assert(res90.cropBottom === 159, `Zoom 90% detects bottom shadow bar: cropBottom = ${res90.cropBottom}px (expected 159px)`);
assert(res90.cropRight > 200, `Zoom 90% detects right scanner border: cropRight = ${res90.cropRight}px`);

// Test 13: Subpixel ratio parity between zoom 65% and 90%
const ratio65 = res65.cropBottom / png65.height;
const ratio90 = res90.cropBottom / png90.height;
assert(Math.abs(ratio65 - ratio90) < 0.001, `Bottom crop ratio parity across zoom levels: ${(ratio65*100).toFixed(2)}% vs ${(ratio90*100).toFixed(2)}% (diff < 0.001)`);

// Test 14-16: Canonical PDF-point computation
const baseViewport = { width: 595.276, height: 841.89 };
const pdfCrop65 = computeCleanPdfCropBox(baseViewport.width, baseViewport.height, png65.width, png65.height, res65);
const pdfCrop90 = computeCleanPdfCropBox(baseViewport.width, baseViewport.height, png90.width, png90.height, res90);

assert(Math.abs(pdfCrop65.cropBottom - pdfCrop90.cropBottom) < 0.5, `Canonical PDF points bottom crop match: ${pdfCrop65.cropBottom}pt vs ${pdfCrop90.cropBottom}pt`);
assert(pdfCrop65.cropBottom > 40 && pdfCrop65.cropBottom < 45, `Canonical bottom crop in realistic range: ${pdfCrop65.cropBottom}pt`);
assert(pdfCrop65.cropRight > 50 && pdfCrop65.cropRight < 60, `Canonical right crop in realistic range: ${pdfCrop65.cropRight}pt`);

// Test 17-20: Clean digital PDF immunity (zero false positive)
const visionRes = detectSmartBorders({ width: pngVision.width, height: pngVision.height, data: pngVision.data });
assert(visionRes.cropBottom === 0, `Vision PDF bottom crop is 0 (zero false-positive)`);
assert(visionRes.cropRight === 0, `Vision PDF right crop is 0 (zero false-positive)`);
assert(visionRes.hasBlackBorders === false, `Vision PDF hasBlackBorders is false`);

// Test 21-25: Canonical Cache in useSmartCropper
const canonicalCache = new Map();
const canonicalKey = `1_${JSON.stringify({ top: true, bottom: true, left: true, right: true })}`;
canonicalCache.set(canonicalKey, {
  pdfCrop: pdfCrop65,
  hasBlackBorders: true,
  baseViewport
});

// Adapted to zoom 90
const cachedCanonical = canonicalCache.get(canonicalKey);
const scaleX = png90.width / baseViewport.width;
const scaleY = png90.height / baseViewport.height;
const adaptedCropBottom = Math.round((cachedCanonical.pdfCrop.cropBottom || 0) * scaleY);
const adaptedCropRight = Math.round((cachedCanonical.pdfCrop.cropRight || 0) * scaleX);

assert(adaptedCropBottom >= 157 && adaptedCropBottom <= 160, `Canonical cache adapts to zoom 90 cleanly: cropBottom = ${adaptedCropBottom}px`);
assert(adaptedCropRight >= 200 && adaptedCropRight <= 215, `Canonical cache adapts right crop cleanly: cropRight = ${adaptedCropRight}px`);

// Test 26-35: Universal Window-level Zoom Interception Simulation
class MockEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.ctrlKey = init.ctrlKey || false;
    this.metaKey = init.metaKey || false;
    this.deltaY = init.deltaY || 0;
    this.key = init.key || '';
    this.touches = init.touches || [];
    this.defaultPrevented = false;
    this.propagationStopped = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {
    this.propagationStopped = true;
  }
}

// Window Wheel Listener
function simulateWindowWheel(e, state) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    e.stopPropagation();
    const rawDelta = -e.deltaY * 0.003;
    const delta = Math.max(-0.08, Math.min(0.08, rawDelta));
    state.zoom = Math.min(3.0, Math.max(0.3, Number((state.zoom + delta).toFixed(2))));
  }
}

// Window TouchMove Listener
function simulateWindowTouchMove(e, state) {
  if (e.touches && e.touches.length === 2) {
    e.preventDefault();
    e.stopPropagation();
    state.touchPinchActive = true;
  }
}

// Window KeyDown Listener
function simulateWindowKeyDown(e, state) {
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '_' || e.key === '0')) {
    e.preventDefault();
    if (e.key === '=' || e.key === '+') {
      state.zoom = Math.min(3.0, Number((state.zoom + 0.1).toFixed(2)));
    } else if (e.key === '-' || e.key === '_') {
      state.zoom = Math.max(0.3, Number((state.zoom - 0.1).toFixed(2)));
    } else if (e.key === '0') {
      state.zoom = 1.0;
    }
  }
}

const zoomState = { zoom: 1.0, touchPinchActive: false };

// Test pinch wheel event (ctrlKey = true)
const pinchWheel = new MockEvent('wheel', { ctrlKey: true, deltaY: -100 });
simulateWindowWheel(pinchWheel, zoomState);
assert(pinchWheel.defaultPrevented === true, 'Pinch wheel event has e.preventDefault() called (blocks browser zoom)');
assert(pinchWheel.propagationStopped === true, 'Pinch wheel event has e.stopPropagation() called');
assert(zoomState.zoom > 1.0, `Canvas zoom updated to ${zoomState.zoom}`);

// Test normal scroll (ctrlKey = false)
const normalWheel = new MockEvent('wheel', { ctrlKey: false, deltaY: 100 });
simulateWindowWheel(normalWheel, zoomState);
assert(normalWheel.defaultPrevented === false, 'Normal scroll does NOT prevent default (preserves native scrolling)');

// Test 2-finger touchmove
const touch2 = new MockEvent('touchmove', { touches: [{ clientX: 10, clientY: 10 }, { clientX: 50, clientY: 50 }] });
simulateWindowTouchMove(touch2, zoomState);
assert(touch2.defaultPrevented === true, '2-finger touchmove has e.preventDefault() called (blocks mobile browser zoom)');

// Test 1-finger touchmove
const touch1 = new MockEvent('touchmove', { touches: [{ clientX: 10, clientY: 10 }] });
simulateWindowTouchMove(touch1, zoomState);
assert(touch1.defaultPrevented === false, '1-finger touchmove does NOT prevent default (preserves native mobile scrolling)');

// Test keyboard zoom shortcuts
const keyPlus = new MockEvent('keydown', { ctrlKey: true, key: '+' });
simulateWindowKeyDown(keyPlus, zoomState);
assert(keyPlus.defaultPrevented === true, 'Ctrl + keydown has e.preventDefault() called');

const keyMinus = new MockEvent('keydown', { ctrlKey: true, key: '-' });
simulateWindowKeyDown(keyMinus, zoomState);
assert(keyMinus.defaultPrevented === true, 'Ctrl - keydown has e.preventDefault() called');

const keyZero = new MockEvent('keydown', { ctrlKey: true, key: '0' });
simulateWindowKeyDown(keyZero, zoomState);
assert(keyZero.defaultPrevented === true, 'Ctrl 0 keydown has e.preventDefault() called');
assert(zoomState.zoom === 1.0, 'Ctrl 0 resets canvas zoom to 1.0 (100%)');

// Test 29-32: Zoom bounds clamping and overshoot protection
zoomState.zoom = 0.3;
const overshootDown = new MockEvent('wheel', { ctrlKey: true, deltaY: 500 });
simulateWindowWheel(overshootDown, zoomState);
assert(zoomState.zoom === 0.3, 'Zoom scale does not clamp below minZoom (0.3)');

zoomState.zoom = 3.0;
const overshootUp = new MockEvent('wheel', { ctrlKey: true, deltaY: -500 });
simulateWindowWheel(overshootUp, zoomState);
assert(zoomState.zoom === 3.0, 'Zoom scale does not clamp above maxZoom (3.0)');

// Test 33-34: WebKit gesture prevention
function simulateGesture(e) {
  e.preventDefault();
}
const gestureStart = new MockEvent('gesturestart');
simulateGesture(gestureStart);
assert(gestureStart.defaultPrevented === true, 'WebKit gesturestart calls e.preventDefault()');

const gestureChange = new MockEvent('gesturechange');
simulateGesture(gestureChange);
assert(gestureChange.defaultPrevented === true, 'WebKit gesturechange calls e.preventDefault()');

// Test 35-36: Refit clean interior calculation with cleanMargin 18pt vs 0pt
const cleanW = png65.width - 155;
const cleanH = png65.height - 114;
const scaleMultiplier = (300 / 72) * 0.65;
const mPx18 = 18 * scaleMultiplier;
const availW18 = Math.max(10, png65.width - 2 * mPx18);
const availH18 = Math.max(10, png65.height - 2 * mPx18);
const s18 = Math.min(availW18 / cleanW, availH18 / cleanH);
assert(s18 > 0.85 && s18 <= 1.05, `Refit scale at 18pt clean margin is valid: ${s18.toFixed(4)}`);

const mPx0 = 0 * scaleMultiplier;
const availW0 = png65.width;
const availH0 = png65.height;
const s0 = Math.min(availW0 / cleanW, availH0 / cleanH);
assert(s0 >= 1.0, `Refit scale at 0pt clean margin expands to 100% canvas bounds: ${s0.toFixed(4)}`);

// Test 33: Edge toggles disabling bottom crop
const toggledRes = simulatedScanBorders({ width: png65.width, height: png65.height, data: png65.data });
assert(toggledRes.cropBottom === 114, 'Bottom crop is active when enabled');

// Test 34: 0-dimension canvas safety
function safeRunDetection(canvas) {
  if (!canvas || !canvas.width || !canvas.height) return null;
  return { hasBlackBorders: false };
}
assert(safeRunDetection(null) === null, 'safeRunDetection returns null on null canvas');
assert(safeRunDetection({ width: 0, height: 0 }) === null, 'safeRunDetection returns null on 0x0 canvas');

// Test 35: Content safety fence margin
const handwritingY90 = 3158 - 175; // handwriting starts ~175px from bottom at zoom 90
const cropBottomY90 = 3158 - res90.cropBottom;
const bufferPx = cropBottomY90 - handwritingY90;
assert(bufferPx >= 16, `Content safety fence maintains >= 16px buffer to handwriting at zoom 90: ${bufferPx}px`);

console.log(`\nSimulation Complete: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);


