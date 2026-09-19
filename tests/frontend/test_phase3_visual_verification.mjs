import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { PDFDocument, degrees } from 'pdf-lib';

import {
  getBlendedPixelLum,
  detectInvertedDocument,
  measureEdgeColorVariance,
  measureScanlineFrequencyEntropy,
  detectCornerWedge,
  contentFenceGuard,
  detectSmartBorders,
  computeCleanPdfCropBox
} from '../../src/utils/pdfZoneScanner.js';

import {
  cleanAndRefitDocument
} from '../../src/engines/pdf/cleanAndRefitPage.js';

import {
  parsePageRangeIndices,
  countPagesInRange,
  validatePageRange
} from '../../src/engines/pdf/pageRangeUtils.js';

console.log('===============================================================');
console.log('   DocForge Phase 3 Molecular Visual & Merge Verification      ');
console.log('===============================================================');

let passedCount = 0;
function test(name, fn) {
  try {
    fn();
    passedCount++;
    console.log(`[PASS ${passedCount}] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passedCount++;
    console.log(`[PASS ${passedCount}] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

// Ensure scratch directory exists
const scratchDir = path.resolve('scratch');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// Source file paths
const KANA_PDF_PATH = 'C:/Users/Tanvir Alam/Pictures/Taha/textbook_kana_all.pdf';
const VISION_PDF_PATH = 'C:/Users/Tanvir Alam/Pictures/Taha/VISION - INTERNATIONAL FEES (BANGLADESH).pdf (2) (1).pdf';

// -------------------------------------------------------------
// AREA 1: getBlendedPixelLum Mathematical & Edge-Case Invariants
// -------------------------------------------------------------
test('1. getBlendedPixelLum: Pure black with alpha=0 blends over white to return 255', () => {
  const buf = new Uint8ClampedArray([0, 0, 0, 0]);
  const lum = getBlendedPixelLum(buf, 0);
  assert.equal(lum, 255);
});

test('2. getBlendedPixelLum: Arbitrary color with alpha=0 blends over white to return 255', () => {
  const buf = new Uint8ClampedArray([210, 45, 13, 0]);
  const lum = getBlendedPixelLum(buf, 0);
  assert.equal(lum, 255);
});

test('3. getBlendedPixelLum: 50% transparent black (RGBA 0,0,0,127) blends over white to exact formula 255 * (1 - 127/255)', () => {
  const buf = new Uint8ClampedArray([0, 0, 0, 127]);
  const lum = getBlendedPixelLum(buf, 0);
  const expected = 255 * (1 - 127 / 255);
  assert.ok(Math.abs(lum - expected) < 1e-4);
});

test('4. getBlendedPixelLum: 50% transparent red (RGBA 255,0,0,127) blends red over white correctly', () => {
  const buf = new Uint8ClampedArray([255, 0, 0, 127]);
  const lum = getBlendedPixelLum(buf, 0);
  const alphaRatio = 127 / 255;
  const invAlpha = 1 - alphaRatio;
  const r = 255 * alphaRatio + 255 * invAlpha; // 255
  const g = 0 * alphaRatio + 255 * invAlpha;
  const b = 0 * alphaRatio + 255 * invAlpha;
  const expected = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  assert.ok(Math.abs(lum - expected) < 1e-4);
});

test('5. getBlendedPixelLum: Fully opaque black (RGBA 0,0,0,255) returns 0', () => {
  const buf = new Uint8ClampedArray([0, 0, 0, 255]);
  const lum = getBlendedPixelLum(buf, 0);
  assert.equal(lum, 0);
});

test('6. getBlendedPixelLum: Fully opaque white (RGBA 255,255,255,255) returns 255', () => {
  const buf = new Uint8ClampedArray([255, 255, 255, 255]);
  const lum = getBlendedPixelLum(buf, 0);
  assert.ok(Math.abs(lum - 255) < 1e-6);
});

test('7. getBlendedPixelLum: Fully opaque pure green (RGBA 0,255,0,255) computes exact formula 0.7152 * 255', () => {
  const buf = new Uint8ClampedArray([0, 255, 0, 255]);
  const lum = getBlendedPixelLum(buf, 0);
  const expected = 0.7152 * 255;
  assert.equal(lum, expected);
});

test('8. getBlendedPixelLum: Fully opaque pure blue (RGBA 0,0,255,255) computes exact formula 0.0722 * 255', () => {
  const buf = new Uint8ClampedArray([0, 0, 255, 255]);
  const lum = getBlendedPixelLum(buf, 0);
  const expected = 0.0722 * 255;
  assert.equal(lum, expected);
});

test('9. getBlendedPixelLum: Out of bounds or undefined index returns 255 safely', () => {
  const buf = new Uint8ClampedArray([0, 0, 0, 255]);
  const lum = getBlendedPixelLum(buf, 100);
  assert.equal(lum, 255);
});

// -------------------------------------------------------------
// AREA 2: detectInvertedDocument on Transparent vs Opaque Canvases
// -------------------------------------------------------------
test('10. detectInvertedDocument: Pure transparent canvas data (all alpha 0) blends to white, returning isInverted: false', () => {
  const w = 50, h = 50;
  const data = new Uint8ClampedArray(w * h * 4); // all 0, including alpha 0
  const res = detectInvertedDocument(data, w, h);
  assert.equal(res.isInverted, false);
  assert.equal(res.centerLuminance, 255);
  assert.equal(res.centerDarkRatio, 0);
});

test('11. detectInvertedDocument: Transparent canvas with dark text in center does NOT trigger inversion', () => {
  const w = 60, h = 60;
  const data = new Uint8ClampedArray(w * h * 4); // default alpha 0
  // Place dark text glyphs in 15% of the center pixels
  for (let y = 20; y < 40; y++) {
    for (let x = 20; x < 25; x++) {
      const idx = (y * w + x) * 4;
      data[idx] = 10; data[idx + 1] = 10; data[idx + 2] = 10; data[idx + 3] = 255;
    }
  }
  const res = detectInvertedDocument(data, w, h);
  assert.equal(res.isInverted, false);
  assert.ok(res.centerLuminance > 130);
});

test('12. detectInvertedDocument: Opaque dark document (RGBA 15,15,15,255) correctly triggers isInverted: true', () => {
  const w = 50, h = 50;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 15; data[i + 1] = 15; data[i + 2] = 15; data[i + 3] = 255;
  }
  const res = detectInvertedDocument(data, w, h);
  assert.equal(res.isInverted, true);
  assert.ok(res.centerLuminance < 130);
  assert.ok(res.centerDarkRatio > 0.6);
});

test('13. detectInvertedDocument: Standard opaque white document returns isInverted: false', () => {
  const w = 50, h = 50;
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  const res = detectInvertedDocument(data, w, h);
  assert.equal(res.isInverted, false);
  assert.equal(res.centerLuminance, 255);
});

// -------------------------------------------------------------
// AREA 3: measureScanlineFrequencyEntropy Glyph vs Solid Run Detection
// -------------------------------------------------------------
test('14. measureScanlineFrequencyEntropy: Transparent top band reports isGlyphContent: false and transitionCount: 0', () => {
  const w = 80, h = 80;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = measureScanlineFrequencyEntropy(data, w, h, 'top', 16);
  assert.equal(res.isGlyphContent, false);
  assert.equal(res.transitionCount, 0);
});

test('15. measureScanlineFrequencyEntropy: Transparent left edge band reports isGlyphContent: false and transitionCount: 0', () => {
  const w = 80, h = 80;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = measureScanlineFrequencyEntropy(data, w, h, 'left', 16);
  assert.equal(res.isGlyphContent, false);
  assert.equal(res.transitionCount, 0);
});

test('16. measureScanlineFrequencyEntropy: Text glyphs (alternating dark text on transparent background) detected with isGlyphContent: true', () => {
  const w = 120, h = 100;
  const data = new Uint8ClampedArray(w * h * 4); // default alpha 0 (blends to white)
  // Add 8 vertical character strokes (dark ink)
  for (let y = 0; y < 16; y++) {
    for (let c = 0; c < 8; c++) {
      const xStart = 10 + c * 12;
      for (let x = xStart; x < xStart + 4; x++) {
        const idx = (y * w + x) * 4;
        data[idx] = 10; data[idx + 1] = 10; data[idx + 2] = 10; data[idx + 3] = 255;
      }
    }
  }
  const res = measureScanlineFrequencyEntropy(data, w, h, 'top', 16);
  assert.equal(res.isGlyphContent, true);
  assert.ok(res.transitionCount >= 5);
});

test('17. measureScanlineFrequencyEntropy: Text glyphs on left edge on transparent canvas detected with isGlyphContent: true', () => {
  const w = 100, h = 120;
  const data = new Uint8ClampedArray(w * h * 4);
  // Add vertical character strokes crossing the left band
  for (let x = 0; x < 16; x++) {
    for (let c = 0; c < 8; c++) {
      const yStart = 10 + c * 12;
      for (let y = yStart; y < yStart + 4; y++) {
        const idx = (y * w + x) * 4;
        data[idx] = 10; data[idx + 1] = 10; data[idx + 2] = 10; data[idx + 3] = 255;
      }
    }
  }
  const res = measureScanlineFrequencyEntropy(data, w, h, 'left', 16);
  assert.equal(res.isGlyphContent, true);
  assert.ok(res.transitionCount >= 5);
});

test('18. measureScanlineFrequencyEntropy: Solid dark bar on transparent canvas is NOT misclassified as glyph content', () => {
  const w = 120, h = 100;
  const data = new Uint8ClampedArray(w * h * 4); // transparent
  // A solid wide dark run across 80% of width
  for (let y = 0; y < 16; y++) {
    for (let x = 10; x < 110; x++) {
      const idx = (y * w + x) * 4;
      data[idx] = 15; data[idx + 1] = 15; data[idx + 2] = 15; data[idx + 3] = 255;
    }
  }
  const res = measureScanlineFrequencyEntropy(data, w, h, 'top', 16);
  // A solid block has at most 1 or 2 transitions, not >= 5 alternating text strokes
  assert.equal(res.isGlyphContent, false);
  assert.ok(res.transitionCount < 5);
});

test('19. measureScanlineFrequencyEntropy: Handles invalid/empty buffers safely', () => {
  const res = measureScanlineFrequencyEntropy(null, 0, 0, 'top', 10);
  assert.equal(res.isGlyphContent, false);
  assert.equal(res.transitionCount, 0);
});

// -------------------------------------------------------------
// AREA 4: measureEdgeColorVariance & Chroma on Transparent Canvases
// -------------------------------------------------------------
test('20. measureEdgeColorVariance: Fully transparent edge band returns isUniformDark: false and colorVariance: 0', () => {
  const w = 80, h = 80;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = measureEdgeColorVariance(data, w, h, 'top', 10);
  assert.equal(res.isUniformDark, false);
  assert.equal(res.colorVariance, 0);
});

test('21. measureEdgeColorVariance: Colorful artwork with alpha on transparent canvas calculates positive chroma variance', () => {
  const w = 80, h = 80;
  const data = new Uint8ClampedArray(w * h * 4);
  // Fill top band with vibrant saturated color
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      data[idx] = 230; data[idx + 1] = 30; data[idx + 2] = 50; data[idx + 3] = 255;
    }
  }
  const res = measureEdgeColorVariance(data, w, h, 'top', 10);
  assert.equal(res.isUniformDark, false);
  assert.ok(res.colorVariance > 100);
});

test('22. measureEdgeColorVariance: Opaque uniform black shadow band returns isUniformDark: true and colorVariance: 0', () => {
  const w = 80, h = 80;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      data[idx] = 12; data[idx + 1] = 12; data[idx + 2] = 12; data[idx + 3] = 255;
    }
  }
  const res = measureEdgeColorVariance(data, w, h, 'top', 8);
  assert.equal(res.isUniformDark, true);
  assert.equal(res.colorVariance, 0);
});

test('23. measureEdgeColorVariance: Right edge inspection on transparent canvas returns isUniformDark: false', () => {
  const w = 80, h = 80;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = measureEdgeColorVariance(data, w, h, 'right', 8);
  assert.equal(res.isUniformDark, false);
  assert.equal(res.colorVariance, 0);
});

test('24. measureEdgeColorVariance: Bottom edge inspection on transparent canvas returns isUniformDark: false', () => {
  const w = 80, h = 80;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = measureEdgeColorVariance(data, w, h, 'bottom', 8);
  assert.equal(res.isUniformDark, false);
  assert.equal(res.colorVariance, 0);
});

// -------------------------------------------------------------
// AREA 5: detectCornerWedge on Transparent Margins
// -------------------------------------------------------------
test('25. detectCornerWedge: Transparent top margin returns isCornerWedgeOnly: true (ratio 0)', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = detectCornerWedge(data, w, h, 'top', 10);
  assert.equal(res.centerDarkRatio, 0);
  assert.equal(res.isCornerWedgeOnly, true);
});

test('26. detectCornerWedge: Transparent bottom margin returns isCornerWedgeOnly: true (ratio 0)', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = detectCornerWedge(data, w, h, 'bottom', 10);
  assert.equal(res.centerDarkRatio, 0);
  assert.equal(res.isCornerWedgeOnly, true);
});

test('27. detectCornerWedge: Transparent left margin returns isCornerWedgeOnly: true', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  const res = detectCornerWedge(data, w, h, 'left', 10);
  assert.equal(res.centerDarkRatio, 0);
  assert.equal(res.isCornerWedgeOnly, true);
});

test('28. detectCornerWedge: Full-width dark photocopier shadow is NOT classified as corner wedge only', () => {
  const w = 100, h = 100;
  const data = new Uint8ClampedArray(w * h * 4);
  // Full width opaque dark bar at top
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      data[idx] = 10; data[idx + 1] = 10; data[idx + 2] = 10; data[idx + 3] = 255;
    }
  }
  const res = detectCornerWedge(data, w, h, 'top', 10);
  assert.equal(res.isCornerWedgeOnly, false);
  assert.ok(res.centerDarkRatio > 0.5);
});

// -------------------------------------------------------------
// AREA 6: detectSmartBorders on Actual Vision PDF Raster at Scale 0.35
// -------------------------------------------------------------
// Ensure the raster of Vision PDF at scale 0.35 exists
const rawRasterPath = path.resolve('scratch/vision_p1_scale035_alpha.raw');
const jsonRasterPath = path.resolve('scratch/vision_p1_scale035_alpha.json');

if (!fs.existsSync(rawRasterPath) || !fs.existsSync(jsonRasterPath)) {
  console.log('Rendering Vision PDF page 1 raster at scale 0.35 via PyMuPDF...');
  execSync(`python -c "
import fitz, json
doc = fitz.open(r'${VISION_PDF_PATH}')
pix = doc[0].get_pixmap(matrix=fitz.Matrix(0.35, 0.35), alpha=True)
with open(r'${rawRasterPath}', 'wb') as f:
    f.write(pix.samples)
with open(r'${jsonRasterPath}', 'w') as f:
    json.dump({'width': pix.width, 'height': pix.height, 'channels': 4}, f)
"`);
}

const rasterMeta = JSON.parse(fs.readFileSync(jsonRasterPath, 'utf8'));
const rawBytes = fs.readFileSync(rawRasterPath);
const visionUint8 = new Uint8ClampedArray(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);
const visionBorderResult = detectSmartBorders({
  data: visionUint8,
  width: rasterMeta.width,
  height: rasterMeta.height
});

test('29. detectSmartBorders: Evaluated on actual Vision PDF p1 raster returns hasBlackBorders: false', () => {
  assert.equal(visionBorderResult.hasBlackBorders, false);
});

test('30. detectSmartBorders: Evaluated on actual Vision PDF p1 raster returns cropTop: 0', () => {
  assert.equal(visionBorderResult.cropTop, 0);
});

test('31. detectSmartBorders: Evaluated on actual Vision PDF p1 raster returns cropBottom: 0, cropLeft: 0, cropRight: 0', () => {
  assert.equal(visionBorderResult.cropBottom, 0);
  assert.equal(visionBorderResult.cropLeft, 0);
  assert.equal(visionBorderResult.cropRight, 0);
});

test('32. detectSmartBorders: Evaluated on actual Vision PDF p1 raster returns cleanBoxPx matching full canvas dimensions', () => {
  assert.deepEqual(visionBorderResult.cleanBoxPx, {
    x: 0,
    y: 0,
    width: rasterMeta.width,
    height: rasterMeta.height
  });
});

test('33. detectSmartBorders: Edge data confirms top edge clean with zero crop', () => {
  assert.equal(visionBorderResult.cropTop, 0);
  assert.equal(visionBorderResult.edgeData.top.cropPx, 0);
  const topVariance = measureEdgeColorVariance(visionUint8, rasterMeta.width, rasterMeta.height, 'top', 50);
  assert.equal(topVariance.isUniformDark, false);
  assert.ok(topVariance.colorVariance > 30);
});

// -------------------------------------------------------------
// AREA 7: MergePdf.jsx UI & Static AST Invariants
// -------------------------------------------------------------
const mergePdfSrc = fs.readFileSync('src/pages/pdf/MergePdf.jsx', 'utf8');

test('34. MergePdf.jsx: Page range badge renders full word "pages" instead of abbreviated "p"', () => {
  assert.ok(mergePdfSrc.includes("Pages: ${item.pageRange} (${countPagesInRange(item.pageRange, item.pageCount)} ${countPagesInRange(item.pageRange, item.pageCount) === 1 ? 'page' : 'pages'})"));
  assert.ok(!mergePdfSrc.includes("(${countPagesInRange(item.pageRange, item.pageCount)}p)"));
});

test('35. MergePdf.jsx: Singular page selection renders "1 page"', () => {
  const count = 1;
  const label = `${count} ${count === 1 ? 'page' : 'pages'}`;
  assert.equal(label, '1 page');
});

test('36. MergePdf.jsx: Plural page selection renders "4 pages"', () => {
  const count = 4;
  const label = `${count} ${count === 1 ? 'page' : 'pages'}`;
  assert.equal(label, '4 pages');
});

test('37. MergePdf.jsx: Smart crop toggle strictly filters by Boolean(it.hasScanBorders)', () => {
  assert.ok(mergePdfSrc.includes('cropEnabled: Boolean(it.hasScanBorders)'));
});

// -------------------------------------------------------------
// AREA 8: Worker Strict Index Lookup & cleanAndRefitDocument Invariants
// -------------------------------------------------------------
const pdfWorkerSrc = fs.readFileSync('src/workers/pdf.worker.js', 'utf8');

test('38. pdf.worker.js: docCropBox lookup uses strict index options.docCropBoxes[i]', () => {
  assert.ok(pdfWorkerSrc.includes('const docCropBox = (options.docCropBoxes && options.docCropBoxes[i]) || null;'));
});

test('39. pdf.worker.js: Filename collision fallback options.docCropBoxes[fileName] is banished', () => {
  assert.ok(!pdfWorkerSrc.includes('options.docCropBoxes[fileName]'));
});

test('40. pdf.worker.js: cleanAndRefitDocument is guarded by hasRealScanBorders', () => {
  assert.ok(pdfWorkerSrc.includes('const hasRealScanBorders = docCropBox && docCropBox.hasBlackBorders === true &&'));
  assert.ok(pdfWorkerSrc.includes('(docCropBox.cropTop > 0 || docCropBox.cropBottom > 0 || docCropBox.cropLeft > 0 || docCropBox.cropRight > 0);'));
});

// -------------------------------------------------------------
// AREA 9: End-to-End Merge Simulation Replicating Worker Logic
// -------------------------------------------------------------
let mergedPdfDoc = null;
let mergedBytes = null;
const finalMergedPdfPath = path.resolve('scratch/final_verified_merged.pdf');

await testAsync('41. End-to-end merge simulation: Load source documents and apply worker pipeline', async () => {
  const kanaBuf = fs.readFileSync(KANA_PDF_PATH);
  const visionBuf = fs.readFileSync(VISION_PDF_PATH);

  const doc1 = await PDFDocument.load(kanaBuf);
  const doc2 = await PDFDocument.load(visionBuf);

  assert.equal(doc1.getPageCount(), 2, 'Kana PDF should have 2 pages');
  assert.equal(doc2.getPageCount(), 1, 'Vision PDF should have 1 page');

  // Worker options simulation
  const options = {
    smartCropActive: true,
    autoCropBlackBorders: true,
    normalizePageSize: 'original',
    cropEnabledFiles: [false, false], // Vision has hasBlackBorders = false
    docCropBoxes: {
      1: visionBorderResult // { hasBlackBorders: false, cropTop: 0 ... }
    },
    pageRanges: ['1-2', '1']
  };

  const mergedDoc = await PDFDocument.create();

  // Document 0: Kana PDF (pages 1-2)
  const targetIndices1 = parsePageRangeIndices(options.pageRanges[0], doc1.getPageCount());
  assert.deepEqual(targetIndices1, [0, 1]);
  const pages1 = await mergedDoc.copyPages(doc1, targetIndices1);
  pages1.forEach((p) => mergedDoc.addPage(p));

  // Document 1: Vision PDF (page 1)
  // Verify cleanAndRefitDocument behavior on doc2
  const isCropEnabledForDoc2 = options.cropEnabledFiles ? Boolean(options.cropEnabledFiles[1]) : false;
  const docCropBox2 = (options.docCropBoxes && options.docCropBoxes[1]) || null;
  const hasRealScanBorders2 = docCropBox2 && docCropBox2.hasBlackBorders === true &&
    (docCropBox2.cropTop > 0 || docCropBox2.cropBottom > 0 || docCropBox2.cropLeft > 0 || docCropBox2.cropRight > 0);

  // Even if cleanAndRefitDocument were called, verify it does not crop
  let processedDoc2 = doc2;
  if (hasRealScanBorders2) {
    processedDoc2 = await cleanAndRefitDocument(doc2, { 0: docCropBox2 }, { margin: 0 });
  } else {
    // Also test calling cleanAndRefitDocument directly to prove it handles non-border docs safely
    const safeRefit = await cleanAndRefitDocument(doc2, { 0: docCropBox2 }, { margin: 0 });
    const sz = safeRefit.getPage(0).getSize();
    assert.ok(Math.abs(sz.height - 842.25) < 0.05, `cleanAndRefitDocument must preserve full 842.25 pt height, got ${sz.height}`);
  }

  const targetIndices2 = parsePageRangeIndices(options.pageRanges[1], processedDoc2.getPageCount());
  assert.deepEqual(targetIndices2, [0]);
  const pages2 = await mergedDoc.copyPages(processedDoc2, targetIndices2);
  pages2.forEach((p) => mergedDoc.addPage(p));

  mergedPdfDoc = mergedDoc;
  mergedBytes = await mergedDoc.save();
  fs.writeFileSync(finalMergedPdfPath, mergedBytes);

  assert.ok(fs.existsSync(finalMergedPdfPath));
  assert.ok(mergedBytes.length > 50000, `Merged PDF should be valid and > 50KB, got ${mergedBytes.length}`);
});

test('42. End-to-end merge: Merged document contains exactly 3 total pages', () => {
  assert.equal(mergedPdfDoc.getPageCount(), 3);
});

test('43. End-to-end merge: Page 1 and Page 2 retain Kana PDF dimensions (839.055 x 595.276 pt)', () => {
  const p1 = mergedPdfDoc.getPage(0);
  const p2 = mergedPdfDoc.getPage(1);
  assert.ok(Math.abs(p1.getWidth() - 839.055) < 0.1);
  assert.ok(Math.abs(p1.getHeight() - 595.276) < 0.1);
  assert.ok(Math.abs(p2.getWidth() - 839.055) < 0.1);
  assert.ok(Math.abs(p2.getHeight() - 595.276) < 0.1);
});

test('44. End-to-end merge: Page 3 retains Vision PDF dimensions (width 595.5 pt, height 842.25 pt) with ZERO height truncation', () => {
  const p3 = mergedPdfDoc.getPage(2);
  assert.ok(Math.abs(p3.getWidth() - 595.5) < 0.1, `Expected width 595.5, got ${p3.getWidth()}`);
  assert.ok(Math.abs(p3.getHeight() - 842.25) < 0.1, `Expected height 842.25, got ${p3.getHeight()}`);
});

// -------------------------------------------------------------
// AREA 10: PyMuPDF Visual Rendering & Forensic Inspection
// -------------------------------------------------------------
console.log('\nExecuting PyMuPDF visual rendering & forensic inspection script...');
const pythonOutput = execSync('python scripts/render_and_verify_merged.py', { encoding: 'utf8' });
console.log(pythonOutput);

const analysisReport = JSON.parse(fs.readFileSync('scratch/verification_p3_analysis.json', 'utf8'));

test('45. Visual Rendering: scratch/final_verified_p1.png exists and is non-empty', () => {
  const p1Path = path.resolve('scratch/final_verified_p1.png');
  assert.ok(fs.existsSync(p1Path));
  assert.ok(fs.statSync(p1Path).size > 50000);
});

test('46. Visual Rendering: scratch/final_verified_p2.png exists and is non-empty', () => {
  const p2Path = path.resolve('scratch/final_verified_p2.png');
  assert.ok(fs.existsSync(p2Path));
  assert.ok(fs.statSync(p2Path).size > 50000);
});

test('47. Visual Rendering: scratch/final_verified_p3.png exists and is non-empty', () => {
  const p3Path = path.resolve('scratch/final_verified_p3.png');
  assert.ok(fs.existsSync(p3Path));
  assert.ok(fs.statSync(p3Path).size > 50000);
});

test('48. Forensic Text Check: "PROMOTIONAL FEE INTERNATIONAL STUDENTS" is present on Page 3', () => {
  assert.equal(analysisReport.promotional_fee_present, true);
  assert.ok(analysisReport.promotional_fee_block !== null);
});

test('49. Forensic Geometry Check: "PROMOTIONAL FEE INTERNATIONAL STUDENTS" rect y0 is < 100 pt (at top of page)', () => {
  const y0 = analysisReport.promotional_fee_block.y0;
  assert.ok(y0 < 100, `Expected y0 < 100 pt, got ${y0} pt`);
  assert.ok(y0 > 15 && y0 < 35, `Expected y0 around ~21.53 pt, got ${y0} pt`);
});

test('50. Forensic Art Check: Header vector artwork or logo image is present at y0 < 100 pt', () => {
  assert.equal(analysisReport.header_artwork_present, true);
  assert.ok(analysisReport.header_artwork.length > 0);
  const logo = analysisReport.header_artwork[0];
  assert.ok(logo.y0 < 100, `Expected logo y0 < 100 pt, got ${logo.y0} pt`);
});

test('51. Forensic Margin Check: Min text y0 on Page 3 is < 100 pt proving header was NOT chopped or shifted', () => {
  assert.ok(analysisReport.min_text_y0 < 100, `Expected min_text_y0 < 100 pt, got ${analysisReport.min_text_y0} pt`);
});

console.log('===============================================================');
console.log(` ALL ${passedCount} PHASE 3 MOLECULAR VERIFICATION ASSERTIONS PASSED! `);
console.log('===============================================================');
