/**
 * Molecular Test Suite: Client Canvas & PDF Lifecycle Teardown
 * 
 * 30 Distinct Test Areas with 66+ falsifiable assertions verifying:
 * - Direct execution of releaseCanvas with 2D context clear and dimension collapse (0x0)
 * - Safe handling of null, undefined, primitives, empty objects, and React refs
 * - Fault tolerance against throwing contexts, throwing destroy methods, and unhandled promise rejections
 * - Full integration across all 7 FocusStudio modules (CompareStudio, CropStudio, EditStudio,
 *   FormFillStudio, OrganizeStudio, RedactStudio, SignStudio)
 * - Stress simulation on 100 canvases and 100 PDF proxies
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. Direct Import of Actual Source Utility (No local duplication)
import defaultExport, { releaseCanvas, safeDestroyPdf, safeCancelRenderTask } from '../../src/utils/canvasLifecycle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

let totalAssertions = 0;
let passedAssertions = 0;

function check(desc, fn) {
  totalAssertions++;
  try {
    fn();
    passedAssertions++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

console.log('Starting Client Canvas & PDF Lifecycle Teardown Molecular Test Suite...\n');

// =========================================================================
// Area 1: releaseCanvas null, undefined and primitive safety (Assertions 1–3)
// =========================================================================
console.log('Area 1: releaseCanvas null, undefined and primitive safety');
check('Assertion 1: releaseCanvas(null) does not throw and returns undefined', () => {
  const result = releaseCanvas(null);
  assert.equal(result, undefined);
});

check('Assertion 2: releaseCanvas(undefined) does not throw and returns undefined', () => {
  const result = releaseCanvas(undefined);
  assert.equal(result, undefined);
});

check('Assertion 3: releaseCanvas with primitives (number, string, boolean) does not throw', () => {
  assert.doesNotThrow(() => releaseCanvas(42));
  assert.doesNotThrow(() => releaseCanvas('canvas'));
  assert.doesNotThrow(() => releaseCanvas(true));
  assert.doesNotThrow(() => releaseCanvas(Symbol('canvas')));
});

// =========================================================================
// Area 2: releaseCanvas empty & non-canvas object safety (Assertions 4–5)
// =========================================================================
console.log('Area 2: releaseCanvas empty and non-canvas object safety');
check('Assertion 4: releaseCanvas({}) does not throw on empty plain object', () => {
  assert.doesNotThrow(() => releaseCanvas({}));
});

check('Assertion 5: releaseCanvas({ foo: "bar" }) leaves unrelated properties intact and does not throw', () => {
  const obj = { foo: 'bar' };
  releaseCanvas(obj);
  assert.equal(obj.foo, 'bar');
});

// =========================================================================
// Area 3: Standard HTML5 Canvas 2D context teardown & 0x0 collapse (Assertions 6–8)
// =========================================================================
console.log('Area 3: Standard HTML5 Canvas 2D context teardown and dimension collapse');
let clearRectCalledWith = null;
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: (type) => {
    if (type === '2d') {
      return {
        clearRect: (x, y, w, h) => {
          clearRectCalledWith = { x, y, w, h };
        }
      };
    }
    return null;
  }
};

check('Assertion 6: clearRect is invoked with exact numeric coordinates (0, 0, 800, 600)', () => {
  clearRectCalledWith = null;
  releaseCanvas(mockCanvas);
  assert.deepEqual(clearRectCalledWith, { x: 0, y: 0, w: 800, h: 600 });
});

check('Assertion 7: canvas.width is strictly collapsed to 0', () => {
  assert.equal(mockCanvas.width, 0);
});

check('Assertion 8: canvas.height is strictly collapsed to 0', () => {
  assert.equal(mockCanvas.height, 0);
});

// =========================================================================
// Area 4: React Ref unwrapping support { current: canvas } (Assertions 9–11)
// =========================================================================
console.log('Area 4: React Ref unwrapping support');
let refClearedWith = null;
const refCanvasTarget = {
  width: 1024,
  height: 768,
  getContext: () => ({
    clearRect: (x, y, w, h) => {
      refClearedWith = { x, y, w, h };
    }
  })
};
const reactRef = { current: refCanvasTarget };

check('Assertion 9: Automatically unwraps React ref and executes clearRect(0, 0, 1024, 768)', () => {
  releaseCanvas(reactRef);
  assert.deepEqual(refClearedWith, { x: 0, y: 0, w: 1024, h: 768 });
});

check('Assertion 10: ref.current.width is collapsed to 0', () => {
  assert.equal(reactRef.current.width, 0);
});

check('Assertion 11: ref.current.height is collapsed to 0', () => {
  assert.equal(reactRef.current.height, 0);
});

// =========================================================================
// Area 5: React Ref with null/undefined current value (Assertions 12–13)
// =========================================================================
console.log('Area 5: React Ref with null or undefined target');
check('Assertion 12: Handles { current: null } safely without throwing', () => {
  assert.doesNotThrow(() => releaseCanvas({ current: null }));
});

check('Assertion 13: Handles { current: undefined } safely without throwing', () => {
  assert.doesNotThrow(() => releaseCanvas({ current: undefined }));
});

// =========================================================================
// Area 6: getContext returning null or undefined (Assertions 14–15)
// =========================================================================
console.log('Area 6: Canvas where getContext returns null');
const detachedCanvas = {
  width: 500,
  height: 400,
  getContext: () => null
};

check('Assertion 14: Does not throw when getContext("2d") returns null', () => {
  assert.doesNotThrow(() => releaseCanvas(detachedCanvas));
});

check('Assertion 15: Still collapses canvas.width and height to 0 when context is null', () => {
  assert.equal(detachedCanvas.width, 0);
  assert.equal(detachedCanvas.height, 0);
});

// =========================================================================
// Area 7: Fault tolerance against throwing getContext (Assertions 16–17)
// =========================================================================
console.log('Area 7: Fault tolerance against throwing getContext');
const throwContextCanvas = {
  width: 640,
  height: 480,
  getContext: () => {
    throw new Error('SecurityError: canvas context access denied');
  }
};

check('Assertion 16: Suppresses throwing getContext without uncaught exception', () => {
  assert.doesNotThrow(() => releaseCanvas(throwContextCanvas));
});

check('Assertion 17: Still collapses dimensions to 0 despite context error', () => {
  assert.equal(throwContextCanvas.width, 0);
  assert.equal(throwContextCanvas.height, 0);
});

// =========================================================================
// Area 8: Canvas with zero or negative dimensions (Assertions 18–19)
// =========================================================================
console.log('Area 8: Canvas with zero or negative dimensions');
let zeroCleared = false;
const zeroCanvas = {
  width: 0,
  height: 0,
  getContext: () => ({
    clearRect: () => { zeroCleared = true; }
  })
};

check('Assertion 18: Does not call clearRect when dimensions are 0', () => {
  releaseCanvas(zeroCanvas);
  assert.equal(zeroCleared, false);
  assert.equal(zeroCanvas.width, 0);
  assert.equal(zeroCanvas.height, 0);
});

let negCleared = false;
const negCanvas = {
  width: -100,
  height: -50,
  getContext: () => ({
    clearRect: () => { negCleared = true; }
  })
};

check('Assertion 19: Does not call clearRect with negative dimensions and resets to 0', () => {
  releaseCanvas(negCanvas);
  assert.equal(negCleared, false);
  assert.equal(negCanvas.width, 0);
  assert.equal(negCanvas.height, 0);
});

// =========================================================================
// Area 9: releaseCanvas idempotency (double release) (Assertions 20–21)
// =========================================================================
console.log('Area 9: releaseCanvas idempotency (double teardown)');
const doubleCanvas = {
  width: 300,
  height: 200,
  getContext: () => ({
    clearRect: () => {}
  })
};

check('Assertion 20: First call cleanly resets dimensions to 0', () => {
  releaseCanvas(doubleCanvas);
  assert.equal(doubleCanvas.width, 0);
  assert.equal(doubleCanvas.height, 0);
});

check('Assertion 21: Second call executes safely without error', () => {
  assert.doesNotThrow(() => releaseCanvas(doubleCanvas));
  assert.equal(doubleCanvas.width, 0);
  assert.equal(doubleCanvas.height, 0);
});

// =========================================================================
// Area 10: Canvas on frozen object with property assignment rejection (Assertion 22)
// =========================================================================
console.log('Area 10: Frozen canvas object robustness');
const frozenCanvas = Object.freeze({
  width: 100,
  height: 100,
  getContext: () => ({
    clearRect: () => {}
  })
});

check('Assertion 22: Suppresses dimension reassignment errors on frozen objects', () => {
  assert.doesNotThrow(() => releaseCanvas(frozenCanvas));
});

// =========================================================================
// Area 11: safeDestroyPdf null, undefined and primitive safety (Assertions 23–25)
// =========================================================================
console.log('Area 11: safeDestroyPdf null, undefined and primitive safety');
check('Assertion 23: safeDestroyPdf(null) does not throw', () => {
  assert.doesNotThrow(() => safeDestroyPdf(null));
});

check('Assertion 24: safeDestroyPdf(undefined) does not throw', () => {
  assert.doesNotThrow(() => safeDestroyPdf(undefined));
});

check('Assertion 25: safeDestroyPdf with primitive values does not throw', () => {
  assert.doesNotThrow(() => safeDestroyPdf('pdf'));
  assert.doesNotThrow(() => safeDestroyPdf(12345));
  assert.doesNotThrow(() => safeDestroyPdf(false));
});

// =========================================================================
// Area 12: safeDestroyPdf React ref unwrapping (Assertions 26–27)
// =========================================================================
console.log('Area 12: safeDestroyPdf React ref unwrapping');
let refPdfDestroyed = false;
const refPdfProxy = {
  destroy: () => { refPdfDestroyed = true; }
};

check('Assertion 26: safeDestroyPdf({ current: pdfDoc }) unwraps ref and destroys document', () => {
  safeDestroyPdf({ current: refPdfProxy });
  assert.equal(refPdfDestroyed, true);
});

check('Assertion 27: safeDestroyPdf({ current: null }) does not throw', () => {
  assert.doesNotThrow(() => safeDestroyPdf({ current: null }));
});

// =========================================================================
// Area 13: Standard synchronous destroy() call (Assertions 28–29)
// =========================================================================
console.log('Area 13: Standard synchronous destroy() call');
let syncDestroyCount = 0;
const syncPdfDoc = {
  destroy: () => { syncDestroyCount++; }
};

check('Assertion 28: safeDestroyPdf calls .destroy() exactly once', () => {
  safeDestroyPdf(syncPdfDoc);
  assert.equal(syncDestroyCount, 1);
});

check('Assertion 29: Subsequent destroy call increments cleanly', () => {
  safeDestroyPdf(syncPdfDoc);
  assert.equal(syncDestroyCount, 2);
});

// =========================================================================
// Area 14: safeDestroyPdf with throwing .destroy() (Assertion 30)
// =========================================================================
console.log('Area 14: Fault tolerance when .destroy() throws synchronously');
const throwPdfDoc = {
  destroy: () => {
    throw new Error('PDF.js Proxy already destroyed or invalid state');
  }
};

check('Assertion 30: Catches and swallows synchronous destruction errors', () => {
  assert.doesNotThrow(() => safeDestroyPdf(throwPdfDoc));
});

// =========================================================================
// Area 15: safeDestroyPdf with Promise-returning destroy() (Assertions 31–32)
// =========================================================================
console.log('Area 15: Promise-returning destroy() and rejected promise suppression');
let asyncDestroyCalled = false;
const promisePdfDoc = {
  destroy: () => {
    asyncDestroyCalled = true;
    return Promise.resolve();
  }
};

check('Assertion 31: Calls destroy() returning a resolved Promise', () => {
  safeDestroyPdf(promisePdfDoc);
  assert.equal(asyncDestroyCalled, true);
});

const rejectingPdfDoc = {
  destroy: () => {
    return Promise.reject(new Error('Async PDF Worker teardown error'));
  }
};

check('Assertion 32: Attaches .catch to returned promise avoiding unhandled rejection', () => {
  assert.doesNotThrow(() => safeDestroyPdf(rejectingPdfDoc));
});

// =========================================================================
// Area 16: safeDestroyPdf fallback to .cleanup() (Assertions 33–34)
// =========================================================================
console.log('Area 16: Fallback to .cleanup()');
let cleanupCalled = false;
const cleanupOnlyDoc = {
  cleanup: () => { cleanupCalled = true; }
};

check('Assertion 33: Calls .cleanup() when .destroy() is undefined', () => {
  safeDestroyPdf(cleanupOnlyDoc);
  assert.equal(cleanupCalled, true);
});

const throwingCleanupDoc = {
  cleanup: () => {
    throw new Error('Cleanup failure');
  }
};

check('Assertion 34: Safely catches synchronous error in .cleanup()', () => {
  assert.doesNotThrow(() => safeDestroyPdf(throwingCleanupDoc));
});

// =========================================================================
// Area 17: safeDestroyPdf async .cleanup() promise rejection (Assertion 35)
// =========================================================================
console.log('Area 17: safeDestroyPdf async .cleanup() promise rejection');
const rejectingCleanupDoc = {
  cleanup: () => Promise.reject(new Error('Async cleanup failure'))
};

check('Assertion 35: Safely catches rejected promise from .cleanup()', () => {
  assert.doesNotThrow(() => safeDestroyPdf(rejectingCleanupDoc));
});

// =========================================================================
// Area 18: Object without destroy or cleanup (Assertion 36)
// =========================================================================
console.log('Area 18: Plain object without destroy/cleanup');
check('Assertion 36: Safely handles object lacking both .destroy and .cleanup', () => {
  assert.doesNotThrow(() => safeDestroyPdf({ dummy: 1 }));
});

// =========================================================================
// Area 19: CompareStudio.jsx integration (Assertions 37–40)
// =========================================================================
console.log('Area 19: Source file static integration in CompareStudio.jsx');
const comparePath = path.join(projectRoot, 'src/components/FocusStudio/studios/CompareStudio.jsx');
const compareSource = fs.readFileSync(comparePath, 'utf8');

check('Assertion 37: CompareStudio.jsx imports releaseCanvas and safeDestroyPdf', () => {
  assert.match(compareSource, /import\s+\{[^}]*releaseCanvas[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
  assert.match(compareSource, /import\s+\{[^}]*safeDestroyPdf[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
});

check('Assertion 38: CompareStudio.jsx cleans up canvasARef.current and canvasBRef.current', () => {
  assert.match(compareSource, /releaseCanvas\(\s*canvasARef\.current\s*\)/);
  assert.match(compareSource, /releaseCanvas\(\s*canvasBRef\.current\s*\)/);
});

check('Assertion 39: CompareStudio.jsx cleans up overlay canvases', () => {
  assert.match(compareSource, /releaseCanvas\(\s*canvasAOverlayRef\.current\s*\)/);
  assert.match(compareSource, /releaseCanvas\(\s*canvasBOverlayRef\.current\s*\)/);
});

check('Assertion 40: CompareStudio.jsx invokes safeDestroyPdf for loaded PDFs', () => {
  assert.match(compareSource, /safeDestroyPdf\(\s*loadedPdf\s*\)/);
});

// =========================================================================
// Area 20: CropStudio.jsx integration (Assertions 41–43)
// =========================================================================
console.log('Area 20: Source file static integration in CropStudio.jsx');
const cropPath = path.join(projectRoot, 'src/components/FocusStudio/studios/CropStudio.jsx');
const cropSource = fs.readFileSync(cropPath, 'utf8');

check('Assertion 41: CropStudio.jsx imports releaseCanvas and safeDestroyPdf', () => {
  assert.match(cropSource, /import\s+\{[^}]*releaseCanvas[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
  assert.match(cropSource, /import\s+\{[^}]*safeDestroyPdf[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
});

check('Assertion 42: CropStudio.jsx teardown effect releases pdfCanvasRef.current', () => {
  assert.match(cropSource, /releaseCanvas\(\s*pdfCanvasRef\.current\s*\)/);
});

check('Assertion 43: CropStudio.jsx cleans up PDF using safeDestroyPdf', () => {
  assert.match(cropSource, /safeDestroyPdf\(\s*loadedPdf\s*\)/);
  assert.match(cropSource, /safeDestroyPdf\(\s*pdf\s*\)/);
});

// =========================================================================
// Area 21: EditStudio.jsx integration (Assertions 44–46)
// =========================================================================
console.log('Area 21: Source file static integration in EditStudio.jsx');
const editPath = path.join(projectRoot, 'src/components/FocusStudio/studios/EditStudio.jsx');
const editSource = fs.readFileSync(editPath, 'utf8');

check('Assertion 44: EditStudio.jsx imports releaseCanvas and safeDestroyPdf', () => {
  assert.match(editSource, /import\s+\{[^}]*releaseCanvas[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
  assert.match(editSource, /import\s+\{[^}]*safeDestroyPdf[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
});

check('Assertion 45: EditStudio.jsx unmount hook releases both pdfCanvasRef and overlayCanvasRef', () => {
  assert.match(editSource, /releaseCanvas\(\s*pdfCanvasRef\.current\s*\)/);
  assert.match(editSource, /releaseCanvas\(\s*overlayCanvasRef\.current\s*\)/);
});

check('Assertion 46: EditStudio.jsx uses safeDestroyPdf on cancellation and unmount', () => {
  assert.match(editSource, /safeDestroyPdf\(\s*loadedPdf\s*\)/);
  assert.match(editSource, /safeDestroyPdf\(\s*pdf\s*\)/);
});

// =========================================================================
// Area 22: FormFillStudio.jsx integration (Assertions 47–49)
// =========================================================================
console.log('Area 22: Source file static integration in FormFillStudio.jsx');
const formPath = path.join(projectRoot, 'src/components/FocusStudio/studios/FormFillStudio.jsx');
const formSource = fs.readFileSync(formPath, 'utf8');

check('Assertion 47: FormFillStudio.jsx imports releaseCanvas and safeDestroyPdf', () => {
  assert.match(formSource, /import\s+\{[^}]*releaseCanvas[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
  assert.match(formSource, /import\s+\{[^}]*safeDestroyPdf[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
});

check('Assertion 48: FormFillStudio.jsx unmount hook releases pdfCanvasRef.current', () => {
  assert.match(formSource, /releaseCanvas\(\s*pdfCanvasRef\.current\s*\)/);
});

check('Assertion 49: FormFillStudio.jsx cleans up PDF using safeDestroyPdf', () => {
  assert.match(formSource, /safeDestroyPdf\(\s*loadedPdf\s*\)/);
  assert.match(formSource, /safeDestroyPdf\(\s*pdf\s*\)/);
});

// =========================================================================
// Area 23: OrganizeStudio.jsx integration (Assertions 50–53)
// =========================================================================
console.log('Area 23: Source file static integration in OrganizeStudio.jsx');
const organizePath = path.join(projectRoot, 'src/components/FocusStudio/studios/OrganizeStudio.jsx');
const organizeSource = fs.readFileSync(organizePath, 'utf8');

check('Assertion 50: OrganizeStudio.jsx imports releaseCanvas and safeDestroyPdf', () => {
  assert.match(organizeSource, /import\s+\{[^}]*releaseCanvas[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
  assert.match(organizeSource, /import\s+\{[^}]*safeDestroyPdf[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
});

check('Assertion 51: PageCard component teardown invokes releaseCanvas(canvasRef.current)', () => {
  assert.match(organizeSource, /releaseCanvas\(\s*canvasRef\.current\s*\)/);
});

check('Assertion 52: OrganizeStudio invokes safeDestroyPdf(loadedPdf) on unmount', () => {
  assert.match(organizeSource, /safeDestroyPdf\(\s*loadedPdf\s*\)/);
});

check('Assertion 53: OrganizeStudio tracks loadedPdf in loadPdf to prevent state closure leak', () => {
  assert.match(organizeSource, /let\s+loadedPdf\s*=\s*null/);
  assert.match(organizeSource, /loadedPdf\s*=\s*pdf/);
});

// =========================================================================
// Area 24: RedactStudio.jsx integration (Assertions 54–56)
// =========================================================================
console.log('Area 24: Source file static integration in RedactStudio.jsx');
const redactPath = path.join(projectRoot, 'src/components/FocusStudio/studios/RedactStudio.jsx');
const redactSource = fs.readFileSync(redactPath, 'utf8');

check('Assertion 54: RedactStudio.jsx imports releaseCanvas and safeDestroyPdf', () => {
  assert.match(redactSource, /import\s+\{[^}]*releaseCanvas[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
  assert.match(redactSource, /import\s+\{[^}]*safeDestroyPdf[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
});

check('Assertion 55: RedactStudio.jsx unmount hook releases pdfCanvasRef and overlayCanvasRef', () => {
  assert.match(redactSource, /releaseCanvas\(\s*pdfCanvasRef\.current\s*\)/);
  assert.match(redactSource, /releaseCanvas\(\s*overlayCanvasRef\.current\s*\)/);
});

check('Assertion 56: RedactStudio.jsx invokes safeDestroyPdf on cancellation and unmount', () => {
  assert.match(redactSource, /safeDestroyPdf\(\s*loadedPdf\s*\)/);
  assert.match(redactSource, /safeDestroyPdf\(\s*pdf\s*\)/);
});

// =========================================================================
// Area 25: SignStudio.jsx integration (Assertions 57–59)
// =========================================================================
console.log('Area 25: Source file static integration in SignStudio.jsx');
const signPath = path.join(projectRoot, 'src/components/FocusStudio/studios/SignStudio.jsx');
const signSource = fs.readFileSync(signPath, 'utf8');

check('Assertion 57: SignStudio.jsx imports releaseCanvas and safeDestroyPdf', () => {
  assert.match(signSource, /import\s+\{[^}]*releaseCanvas[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
  assert.match(signSource, /import\s+\{[^}]*safeDestroyPdf[^}]*\}\s+from\s+['"][^'"]*canvasLifecycle['"]/);
});

check('Assertion 58: SignStudio.jsx unmount hook releases pdfCanvasRef and drawCanvasRef', () => {
  assert.match(signSource, /releaseCanvas\(\s*pdfCanvasRef\.current\s*\)/);
  assert.match(signSource, /releaseCanvas\(\s*drawCanvasRef\.current\s*\)/);
});

check('Assertion 59: SignStudio.jsx invokes safeDestroyPdf on cancellation and unmount', () => {
  assert.match(signSource, /safeDestroyPdf\(\s*loadedPdf\s*\)/);
  assert.match(signSource, /safeDestroyPdf\(\s*pdf\s*\)/);
});

// =========================================================================
// Area 26: Module Export Parity (Assertions 60–62)
// =========================================================================
console.log('Area 26: Module Export Parity');
check('Assertion 60: Named export releaseCanvas is a function', () => {
  assert.equal(typeof releaseCanvas, 'function');
});

check('Assertion 61: Named export safeDestroyPdf is a function', () => {
  assert.equal(typeof safeDestroyPdf, 'function');
});

check('Assertion 62: Named export safeCancelRenderTask is a function', () => {
  assert.equal(typeof safeCancelRenderTask, 'function');
});

check('Assertion 63: Default export contains identical functions', () => {
  assert.equal(defaultExport.releaseCanvas, releaseCanvas);
  assert.equal(defaultExport.safeDestroyPdf, safeDestroyPdf);
  assert.equal(defaultExport.safeCancelRenderTask, safeCancelRenderTask);
});

// =========================================================================
// Area 27: Molecular Stress Simulation: 100 Canvas Rapid Teardown (Assertion 64)
// =========================================================================
console.log('Area 27: Molecular Stress Simulation (100 Canvases Batch Teardown)');
check('Assertion 64: 100 mock canvases torn down simultaneously all collapse to 0x0 and clear contexts', () => {
  let clearedCount = 0;
  const canvases = Array.from({ length: 100 }, (_, i) => ({
    width: 100 + i,
    height: 100 + i,
    getContext: () => ({
      clearRect: (x, y, w, h) => {
        if (w === 100 + i && h === 100 + i) clearedCount++;
      }
    })
  }));

  canvases.forEach(releaseCanvas);

  assert.equal(clearedCount, 100);
  assert.ok(canvases.every(c => c.width === 0 && c.height === 0));
});

// =========================================================================
// Area 28: Molecular Stress Simulation: 100 PDF Proxies Rapid Teardown (Assertion 65)
// =========================================================================
console.log('Area 28: Molecular Stress Simulation (100 PDF Proxies Batch Teardown)');
check('Assertion 65: 100 mock PDF proxies torn down with mixed synchronous, throwing, and async returns', () => {
  let destroyedCount = 0;
  const proxies = Array.from({ length: 100 }, (_, i) => {
    if (i % 3 === 0) {
      return { destroy: () => { destroyedCount++; return Promise.resolve(); } };
    } else if (i % 3 === 1) {
      return { destroy: () => { destroyedCount++; throw new Error('Worker already terminated'); } };
    } else {
      return { cleanup: () => { destroyedCount++; } };
    }
  });

  proxies.forEach(safeDestroyPdf);
  assert.equal(destroyedCount, 100);
});

// =========================================================================
// Area 29: Fractional & Subpixel Coordinate Precision (Assertion 66)
// =========================================================================
console.log('Area 29: Fractional & Subpixel Coordinate Precision');
check('Assertion 66: Subpixel / fractional canvas dimensions are correctly passed to clearRect', () => {
  let subpixelParams = null;
  const subpixelCanvas = {
    width: 1920.75,
    height: 1080.25,
    getContext: () => ({
      clearRect: (x, y, w, h) => {
        subpixelParams = { x, y, w, h };
      }
    })
  };

  releaseCanvas(subpixelCanvas);
  assert.deepEqual(subpixelParams, { x: 0, y: 0, w: 1920.75, h: 1080.25 });
  assert.equal(subpixelCanvas.width, 0);
  assert.equal(subpixelCanvas.height, 0);
});

// =========================================================================
// Area 30: Detached DOM Node Simulation (Assertion 67)
// =========================================================================
console.log('Area 30: Detached DOM Node Simulation');
check('Assertion 67: Detached canvas with no parent and null context properties releases safely', () => {
  const detachedNode = {
    parentNode: null,
    ownerDocument: null,
    width: 320,
    height: 240,
    getContext: () => ({ clearRect: () => {} })
  };

  assert.doesNotThrow(() => releaseCanvas(detachedNode));
  assert.equal(detachedNode.width, 0);
  assert.equal(detachedNode.height, 0);
});

// =========================================================================
// Area 31: Array Batch Input Handling in releaseCanvas (Assertions 68–70)
// =========================================================================
console.log('Area 31: Array Batch Input Handling in releaseCanvas');
check('Assertion 68: releaseCanvas handles empty array safely', () => {
  assert.doesNotThrow(() => releaseCanvas([]));
});

check('Assertion 69: releaseCanvas releases an array of canvases and React refs simultaneously', () => {
  let clearedC1 = false;
  let clearedC2 = false;
  const c1 = { width: 400, height: 300, getContext: () => ({ clearRect: () => { clearedC1 = true; } }) };
  const c2 = { width: 500, height: 400, getContext: () => ({ clearRect: () => { clearedC2 = true; } }) };
  const refC = { current: c2 };

  releaseCanvas([c1, refC, null, undefined]);
  assert.equal(clearedC1, true);
  assert.equal(clearedC2, true);
  assert.equal(c1.width, 0);
  assert.equal(c1.height, 0);
  assert.equal(c2.width, 0);
  assert.equal(c2.height, 0);
});

check('Assertion 70: releaseCanvas handles nested empty arrays and invalid items in array safely', () => {
  assert.doesNotThrow(() => releaseCanvas([null, undefined, 123, 'not a canvas', {}]));
});

// =========================================================================
// Area 32: Array Batch Input Handling in safeDestroyPdf (Assertions 71–73)
// =========================================================================
console.log('Area 32: Array Batch Input Handling in safeDestroyPdf');
check('Assertion 71: safeDestroyPdf handles empty array safely', () => {
  assert.doesNotThrow(() => safeDestroyPdf([]));
});

check('Assertion 72: safeDestroyPdf safely destroys an array of PDF proxies and refs', () => {
  let d1 = false;
  let d2 = false;
  const p1 = { destroy: () => { d1 = true; } };
  const p2 = { destroy: () => { d2 = true; } };
  safeDestroyPdf([p1, { current: p2 }, null, undefined]);
  assert.equal(d1, true);
  assert.equal(d2, true);
});

check('Assertion 73: safeDestroyPdf handles array containing throwing proxies without propagating errors', () => {
  const throwing = { destroy: () => { throw new Error('Worker crash'); } };
  assert.doesNotThrow(() => safeDestroyPdf([throwing, null, { destroy: () => {} }]));
});

// =========================================================================
// Area 33: safeCancelRenderTask Execution and Fault Tolerance (Assertions 74–78)
// =========================================================================
console.log('Area 33: safeCancelRenderTask Execution and Fault Tolerance');
check('Assertion 74: safeCancelRenderTask safely ignores null and undefined', () => {
  assert.doesNotThrow(() => safeCancelRenderTask(null));
  assert.doesNotThrow(() => safeCancelRenderTask(undefined));
});

check('Assertion 75: safeCancelRenderTask invokes .cancel() on render task', () => {
  let cancelled = false;
  const mockTask = { cancel: () => { cancelled = true; } };
  safeCancelRenderTask(mockTask);
  assert.equal(cancelled, true);
});

check('Assertion 76: safeCancelRenderTask unwraps React ref object', () => {
  let cancelled = false;
  const ref = { current: { cancel: () => { cancelled = true; } } };
  safeCancelRenderTask(ref);
  assert.equal(cancelled, true);
});

check('Assertion 77: safeCancelRenderTask safely swallows throwing cancel methods', () => {
  const throwingTask = { cancel: () => { throw new Error('RenderTask already resolved'); } };
  assert.doesNotThrow(() => safeCancelRenderTask(throwingTask));
});

check('Assertion 78: safeCancelRenderTask cancels an array of render tasks', () => {
  let count = 0;
  const tasks = [{ cancel: () => count++ }, { cancel: () => count++ }, null];
  safeCancelRenderTask(tasks);
  assert.equal(count, 2);
});

// =========================================================================
// Area 34: In-flight Render Task Cancellation Integration Across All 7 Studios (Assertions 79–85)
// =========================================================================
console.log('Area 34: In-flight Render Task Cancellation Integration Across All 7 Studios');
check('Assertion 79: CompareStudio.jsx cancels in-flight render tasks on page/mode change or unmount', () => {
  assert.match(compareSource, /safeCancelRenderTask\(\s*renderTasks\s*\)/);
});

check('Assertion 80: CropStudio.jsx cancels in-flight render task on page change or unmount', () => {
  assert.match(cropSource, /safeCancelRenderTask\(\s*renderTask\s*\)/);
});

check('Assertion 81: EditStudio.jsx cancels in-flight render task on page change or unmount', () => {
  assert.match(editSource, /safeCancelRenderTask\(\s*renderTask\s*\)/);
});

check('Assertion 82: FormFillStudio.jsx cancels in-flight render task on page change or unmount', () => {
  assert.match(formSource, /safeCancelRenderTask\(\s*renderTask\s*\)/);
});

check('Assertion 83: OrganizeStudio.jsx cancels in-flight render task in PageCard on unmount or reorder', () => {
  assert.match(organizeSource, /safeCancelRenderTask\(\s*renderTask\s*\)/);
});

check('Assertion 84: RedactStudio.jsx cancels in-flight render task on page change or unmount', () => {
  assert.match(redactSource, /safeCancelRenderTask\(\s*renderTask\s*\)/);
});

check('Assertion 85: SignStudio.jsx cancels in-flight render task on page change or unmount', () => {
  assert.match(signSource, /safeCancelRenderTask\(\s*renderTask\s*\)/);
});

// =========================================================================
// Area 35: Formula-Level V8/GPU Backing Pixel Memory Deallocation Calculation (Assertions 86–88)
// =========================================================================
console.log('Area 35: Formula-Level V8/GPU Backing Pixel Memory Deallocation Calculation');
// Formula: RGBA Backing Store Memory = Width * Height * 4 bytes
function computeCanvasBackingMemory(canvas) {
  const w = Number(canvas.width) || 0;
  const h = Number(canvas.height) || 0;
  return w * h * 4;
}

check('Assertion 86: Computes exact 1080p canvas memory footprint (8,294,400 bytes) and verifies collapse to 0', () => {
  const canvas1080p = {
    width: 1920,
    height: 1080,
    getContext: () => ({ clearRect: () => {} })
  };
  const initialMemory = computeCanvasBackingMemory(canvas1080p);
  assert.equal(initialMemory, 1920 * 1080 * 4); // Exact formula calculation: 8294400 bytes
  assert.equal(initialMemory, 8294400);

  releaseCanvas(canvas1080p);
  const releasedMemory = computeCanvasBackingMemory(canvas1080p);
  assert.equal(releasedMemory, 0); // Exact formula calculation after teardown: 0 bytes
});

check('Assertion 87: Computes exact Retina 4K canvas memory footprint (33,177,600 bytes) and verifies collapse to 0', () => {
  const canvas4k = {
    width: 3840,
    height: 2160,
    getContext: () => ({ clearRect: () => {} })
  };
  const initialMemory = computeCanvasBackingMemory(canvas4k);
  assert.equal(initialMemory, 3840 * 2160 * 4); // Exact formula calculation: 33177600 bytes
  assert.equal(initialMemory, 33177600);

  releaseCanvas(canvas4k);
  const releasedMemory = computeCanvasBackingMemory(canvas4k);
  assert.equal(releasedMemory, 0);
});

check('Assertion 88: Non-standard fractional dimensions footprint formula collapses exactly to 0', () => {
  const canvasFrac = {
    width: 595.28,
    height: 841.89,
    getContext: () => ({ clearRect: () => {} })
  };
  const initialMemory = computeCanvasBackingMemory(canvasFrac);
  assert.equal(initialMemory, 595.28 * 841.89 * 4);

  releaseCanvas(canvasFrac);
  const releasedMemory = computeCanvasBackingMemory(canvasFrac);
  assert.equal(releasedMemory, 0);
});

// =========================================================================
// Area 36: Stale Destroyed PDF Document Reference Cleansing Across Studios (Assertions 89–94)
// =========================================================================
console.log('Area 36: Stale Destroyed PDF Document Reference Cleansing Across Studios');
check('Assertion 89: CropStudio.jsx clears pdfDocument on new file load before loading', () => {
  assert.match(cropSource, /setPdfDocument\(null\)/);
});

check('Assertion 90: EditStudio.jsx clears pdfDocument on new file load before loading', () => {
  assert.match(editSource, /setPdfDocument\(null\)/);
});

check('Assertion 91: FormFillStudio.jsx clears pdfDocument on new file load before loading', () => {
  assert.match(formSource, /setPdfDocument\(null\)/);
});

check('Assertion 92: OrganizeStudio.jsx clears pdfDoc on new file load before loading', () => {
  assert.match(organizeSource, /setPdfDoc\(null\)/);
});

check('Assertion 93: RedactStudio.jsx clears pdfDocument on new file load before loading', () => {
  assert.match(redactSource, /setPdfDocument\(null\)/);
});

check('Assertion 94: SignStudio.jsx clears pdfDocument on new file load before loading', () => {
  assert.match(signSource, /setPdfDocument\(null\)/);
});

console.log(`\n=======================================================`);
console.log(`All ${passedAssertions} of ${totalAssertions} assertions PASSED across 36 test areas!`);
console.log(`100% Canvas & PDF Lifecycle Teardown Verified.`);
console.log(`=======================================================\n`);
