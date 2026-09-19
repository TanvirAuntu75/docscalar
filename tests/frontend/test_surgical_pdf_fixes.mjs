import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  getBlendedPixelLum,
  detectInvertedDocument,
  measureEdgeColorVariance,
  measureScanlineFrequencyEntropy,
  detectCornerWedge,
  contentFenceGuard
} from '../../src/utils/pdfZoneScanner.js';

import {
  countPagesInRange,
  validatePageRange
} from '../../src/engines/pdf/pageRangeUtils.js';

console.log('--- Starting Surgical Verification Test Suite ---');
let passedAssertions = 0;

function check(desc, fn) {
  try {
    fn();
    passedAssertions++;
    console.log(`[PASS ${passedAssertions}] ${desc}`);
  } catch (err) {
    console.error(`[FAIL] ${desc}`);
    throw err;
  }
}

// -------------------------------------------------------------
// AREA 1: getBlendedPixelLum Formula-Level Correctness
// -------------------------------------------------------------
check('1. getBlendedPixelLum: Pure black with full alpha returns 0', () => {
  const buf = new Uint8ClampedArray([0, 0, 0, 255]);
  const lum = getBlendedPixelLum(buf, 0);
  assert.equal(lum, 0);
});

check('2. getBlendedPixelLum: Pure white with full alpha returns 255', () => {
  const buf = new Uint8ClampedArray([255, 255, 255, 255]);
  const lum = getBlendedPixelLum(buf, 0);
  assert.ok(Math.abs(lum - 255) < 1e-6);
});

check('3. getBlendedPixelLum: Fully transparent black (a=0) returns white (255)', () => {
  const buf = new Uint8ClampedArray([0, 0, 0, 0]);
  const lum = getBlendedPixelLum(buf, 0);
  assert.equal(lum, 255);
});

check('4. getBlendedPixelLum: Fully transparent color (r=120, g=40, b=20, a=0) returns 255', () => {
  const buf = new Uint8ClampedArray([120, 40, 20, 0]);
  const lum = getBlendedPixelLum(buf, 0);
  assert.equal(lum, 255);
});

check('5. getBlendedPixelLum: 50% transparent black blends over white to ~127.5', () => {
  const buf = new Uint8ClampedArray([0, 0, 0, 127]);
  const lum = getBlendedPixelLum(buf, 0);
  const alphaRatio = 127 / 255;
  const expected = 255 * (1 - alphaRatio);
  assert.ok(Math.abs(lum - expected) < 1e-4);
});

check('6. getBlendedPixelLum: Primary pure Red (255,0,0,255) matches sRGB luminance 54.213', () => {
  const buf = new Uint8ClampedArray([255, 0, 0, 255]);
  const lum = getBlendedPixelLum(buf, 0);
  const expected = 0.2126 * 255;
  assert.equal(lum, expected);
});

check('7. getBlendedPixelLum: Primary pure Green (0,255,0,255) matches sRGB luminance 182.376', () => {
  const buf = new Uint8ClampedArray([0, 255, 0, 255]);
  const lum = getBlendedPixelLum(buf, 0);
  const expected = 0.7152 * 255;
  assert.equal(lum, expected);
});

check('8. getBlendedPixelLum: Primary pure Blue (0,0,255,255) matches sRGB luminance 18.411', () => {
  const buf = new Uint8ClampedArray([0, 0, 255, 255]);
  const lum = getBlendedPixelLum(buf, 0);
  const expected = 0.0722 * 255;
  assert.equal(lum, expected);
});

// -------------------------------------------------------------
// AREA 2: detectInvertedDocument Alpha-Transparency Resilience
// -------------------------------------------------------------
check('9. detectInvertedDocument: Clean white document is not inverted', () => {
  const w = 60, h = 60;
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  const res = detectInvertedDocument(data, w, h);
  assert.equal(res.isInverted, false);
  assert.equal(res.centerLuminance, 255);
});

check('10. detectInvertedDocument: Dark document is inverted', () => {
  const w = 60, h = 60;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 10; data[i + 1] = 10; data[i + 2] = 10; data[i + 3] = 255;
  }
  const res = detectInvertedDocument(data, w, h);
  assert.equal(res.isInverted, true);
  assert.ok(res.centerLuminance < 130);
});

check('11. detectInvertedDocument: Transparent document (RGB=0, A=0) is NOT inverted due to white blend', () => {
  const w = 60, h = 60;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = detectInvertedDocument(data, w, h);
  assert.equal(res.isInverted, false);
  assert.equal(res.centerLuminance, 255);
});

// -------------------------------------------------------------
// AREA 3: measureEdgeColorVariance Alpha-Blending
// -------------------------------------------------------------
check('12. measureEdgeColorVariance: Handles invalid/null inputs safely', () => {
  const res = measureEdgeColorVariance(null, 100, 100, 'top', 10);
  assert.equal(res.colorVariance, 0);
  assert.equal(res.isUniformDark, false);
});

check('13. measureEdgeColorVariance: Transparent edge band does not register as dark shadow', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = measureEdgeColorVariance(data, w, h, 'top', 10);
  assert.equal(res.isUniformDark, false);
  assert.equal(res.colorVariance, 0);
});

check('14. measureEdgeColorVariance: Solid black opaque edge band is flagged as uniform dark', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 20; data[i + 1] = 20; data[i + 2] = 20; data[i + 3] = 255;
  }
  const res = measureEdgeColorVariance(data, w, h, 'top', 8);
  assert.equal(res.isUniformDark, true);
  assert.equal(res.colorVariance, 0);
});

check('15. measureEdgeColorVariance: Vibrant colorful edge band has high chroma variance', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 220; data[i + 1] = 20; data[i + 2] = 30; data[i + 3] = 255;
  }
  const res = measureEdgeColorVariance(data, w, h, 'top', 8);
  assert.equal(res.isUniformDark, false);
  assert.ok(res.colorVariance > 100);
});

// -------------------------------------------------------------
// AREA 4: measureScanlineFrequencyEntropy Alpha-Blending
// -------------------------------------------------------------
check('16. measureScanlineFrequencyEntropy: Transparent band has zero glyph transitions', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = measureScanlineFrequencyEntropy(data, w, h, 'top', 16);
  assert.equal(res.isGlyphContent, false);
  assert.equal(res.transitionCount, 0);
});

check('17. measureScanlineFrequencyEntropy: Left edge transparent band has zero glyph transitions', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = measureScanlineFrequencyEntropy(data, w, h, 'left', 16);
  assert.equal(res.isGlyphContent, false);
  assert.equal(res.transitionCount, 0);
});

check('18. measureScanlineFrequencyEntropy: Alternating black/white text bars correctly detected', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  // Add 10 black stripes (glyphs) across all rows in the band
  for (let y = 0; y < 16; y++) {
    for (let bar = 0; bar < 10; bar++) {
      const xStart = bar * 10;
      for (let x = xStart; x < xStart + 3; x++) {
        const idx = (y * w + x) * 4;
        data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
      }
    }
  }
  const res = measureScanlineFrequencyEntropy(data, w, h, 'top', 16);
  assert.ok(res.transitionCount >= 5);
  assert.equal(res.isGlyphContent, true);
});

// -------------------------------------------------------------
// AREA 5: detectCornerWedge Alpha-Blending
// -------------------------------------------------------------
check('19. detectCornerWedge: Transparent image does not register fake dark center', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = detectCornerWedge(data, w, h, 'top', 10);
  assert.equal(res.centerDarkRatio, 0);
  assert.equal(res.isCornerWedgeOnly, true);
});

check('20. detectCornerWedge: Left edge transparent image does not register fake dark center', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = detectCornerWedge(data, w, h, 'left', 10);
  assert.equal(res.centerDarkRatio, 0);
  assert.equal(res.isCornerWedgeOnly, true);
});

// -------------------------------------------------------------
// AREA 6: contentFenceGuard Alpha-Blending & Safety
// -------------------------------------------------------------
check('21. contentFenceGuard: Transparent border region has 0 ink density and contentDetected false', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = contentFenceGuard(data, w, h, 'top', 10, 15, true, 0);
  assert.equal(res.inkDensity, 0);
  assert.equal(res.contentDetected, false);
  assert.equal(res.safeCropLine, 10);
});

check('22. contentFenceGuard: Ink right at cut line (dist=1) triggers retreatNeeded in adaptive mode', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let x = 20; x < 80; x++) {
    const idx = (11 * w + x) * 4;
    data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
  }
  const res = contentFenceGuard(data, w, h, 'top', 10, 15, true, 0);
  assert.equal(res.contentDetected, true);
  assert.ok(res.safeCropLine < 10);
});

check('23. contentFenceGuard: Bottom edge transparent buffer is safe', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = contentFenceGuard(data, w, h, 'bottom', 10, 15, true, 0);
  assert.equal(res.contentDetected, false);
  assert.equal(res.safeCropLine, 10);
});

check('24. contentFenceGuard: Left edge transparent buffer is safe', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = contentFenceGuard(data, w, h, 'left', 10, 15, true, 0);
  assert.equal(res.contentDetected, false);
  assert.equal(res.safeCropLine, 10);
});

check('25. contentFenceGuard: Right edge transparent buffer is safe', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = contentFenceGuard(data, w, h, 'right', 10, 15, true, 0);
  assert.equal(res.contentDetected, false);
  assert.equal(res.safeCropLine, 10);
});

// -------------------------------------------------------------
// AREA 7: MergePdf Label Logic & pageRangeUtils Verification
// -------------------------------------------------------------
check('26. countPagesInRange: Computes 1 page for single page selection', () => {
  const count = countPagesInRange('3', 10);
  assert.equal(count, 1);
  const label = `${count} ${count === 1 ? 'page' : 'pages'}`;
  assert.equal(label, '1 page');
});

check('27. countPagesInRange: Computes multiple pages for comma/dash range', () => {
  const count = countPagesInRange('1-3, 5', 10);
  assert.equal(count, 4);
  const label = `${count} ${count === 1 ? 'page' : 'pages'}`;
  assert.equal(label, '4 pages');
});

check('28. countPagesInRange: Full document selection with all returns total pageCount', () => {
  const count = countPagesInRange('all', 12);
  assert.equal(count, 12);
});

// -------------------------------------------------------------
// AREA 8: MergePdf.jsx Static Code AST / Text Verification
// -------------------------------------------------------------
const mergePdfSrc = fs.readFileSync('src/pages/pdf/MergePdf.jsx', 'utf8');

check('29. MergePdf.jsx: isItemCropped checks !item.hasScanBorders', () => {
  assert.ok(mergePdfSrc.includes('if (!item || !smartCropActive || !item.hasScanBorders) return false;'));
});

check('30. MergePdf.jsx: isItemCropped returns true for cropScope all or detected', () => {
  assert.ok(mergePdfSrc.includes("if (cropScope === 'all' || cropScope === 'detected') return true;"));
});

check('31. MergePdf.jsx: Page label formats full "page" / "pages" instead of abbreviated "p"', () => {
  assert.ok(mergePdfSrc.includes("Pages: ${item.pageRange} (${countPagesInRange(item.pageRange, item.pageCount)} ${countPagesInRange(item.pageRange, item.pageCount) === 1 ? 'page' : 'pages'})"));
  assert.ok(!mergePdfSrc.includes("(${countPagesInRange(item.pageRange, item.pageCount)}p)"));
});

check('32. MergePdf.jsx: Smart crop toggle strictly sets cropEnabled to Boolean(it.hasScanBorders)', () => {
  assert.ok(mergePdfSrc.includes('cropEnabled: Boolean(it.hasScanBorders)'));
});

check('33. MergePdf.jsx: Smart crop toggle toast excludes ${smartCropMargin}pt margins', () => {
  assert.ok(!mergePdfSrc.includes('(${smartCropMargin}pt margins)'));
  assert.ok(mergePdfSrc.includes('showCropToast(`Smart Cropping active across ${borderCount} document${borderCount === 1 ? \'\' : \'s\'} with scan borders`, \'success\');'));
  assert.ok(mergePdfSrc.includes('showCropToast('));
  assert.ok(mergePdfSrc.includes('`Smart Cropping active on ${borderCount} document${borderCount === 1 ? \'\' : \'s\'} with scan borders`,'));
});

check('34. MergePdf.jsx: Activate smart crop toast excludes (${effectiveMargin}pt)', () => {
  assert.ok(mergePdfSrc.includes('clean margins applied to ${count} of ${pdfItems.length} documents'));
  assert.ok(!mergePdfSrc.includes('clean margins (${effectiveMargin}pt) applied'));
});

// -------------------------------------------------------------
// AREA 9: pdf.worker.js Static Code AST / Text Verification
// -------------------------------------------------------------
const pdfWorkerSrc = fs.readFileSync('src/workers/pdf.worker.js', 'utf8');

check('35. pdf.worker.js: docCropBox lookup uses strict index options.docCropBoxes[i]', () => {
  assert.ok(pdfWorkerSrc.includes('const docCropBox = (options.docCropBoxes && options.docCropBoxes[i]) || null;'));
});

check('36. pdf.worker.js: docCropBox lookup does NOT fall back to fileName collision', () => {
  assert.ok(!pdfWorkerSrc.includes('options.docCropBoxes[fileName]'));
});

// -------------------------------------------------------------
// AREA 10: pdfZoneScanner.js Static Code Verification
// -------------------------------------------------------------
const scannerSrc = fs.readFileSync('src/utils/pdfZoneScanner.js', 'utf8');

check('37. pdfZoneScanner.js: Exports getBlendedPixelLum', () => {
  assert.ok(scannerSrc.includes('export function getBlendedPixelLum(data, idx)'));
});

check('38. pdfZoneScanner.js: detectInvertedDocument uses getBlendedPixelLum', () => {
  assert.ok(scannerSrc.includes('const lum = getBlendedPixelLum(data, idx);\n      totalLum += lum;'));
});

check('39. pdfZoneScanner.js: measureEdgeColorVariance computes alpha-blended chroma', () => {
  assert.ok(scannerSrc.includes('const alphaRatio = a / 255;'));
  assert.ok(scannerSrc.includes('const r = a === 0 ? 255 : (a < 255 ? data[idx] * alphaRatio + 255 * (1 - alphaRatio) : data[idx]);'));
  assert.ok(scannerSrc.includes('const chroma = Math.max(r, g, b) - Math.min(r, g, b);'));
});

check('40. pdfZoneScanner.js: contentFenceGuard uses getBlendedPixelLum across all 4 edges', () => {
  const matches = scannerSrc.match(/const lum = getBlendedPixelLum\(data, idx\);\s*if \(lum < inkLumThreshold\)/g);
  assert.ok(matches && matches.length === 4, `Expected 4 occurrences in contentFenceGuard, got ${matches?.length}`);
});

console.log(`\nAll ${passedAssertions} surgical verification test assertions passed successfully!`);
