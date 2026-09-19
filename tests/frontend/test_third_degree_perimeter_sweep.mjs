import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import {
  getBlendedPixelLum,
  detectInvertedDocument,
  measureEdgeColorVariance,
  measureScanlineFrequencyEntropy,
  detectCornerWedge,
  contentFenceGuard,
  detectBlackScanBorders,
  cleanPerimeterSlivers,
  sweepThirdDegreePerimeter,
  detectSmartBorders,
  computeCleanPdfCropBox
} from '../../src/utils/pdfZoneScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('======================================================================');
console.log('   DocForge Third-Degree Perimeter Sweep Master Verification Suite    ');
console.log('======================================================================\n');

let passedTests = 0;
let totalTests = 0;

async function runTest(description, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log('  [PASS] Area ' + totalTests.toString().padStart(2, '0') + ': ' + description);
  } catch (err) {
    console.error('  [FAIL] Area ' + totalTests.toString().padStart(2, '0') + ': ' + description);
    console.error('         ' + err.message);
    process.exitCode = 1;
  }
}

async function runAll() {
  const scannerSrc = fs.readFileSync(path.join(rootDir, 'src/utils/pdfZoneScanner.js'), 'utf8');

  // Load real PDF rasters
  const p6Png = PNG.sync.read(fs.readFileSync(path.join(rootDir, 'scratch/stats_pages/page_6.png')));
  const p1Png = PNG.sync.read(fs.readFileSync(path.join(rootDir, 'scratch/stats_pages/page_1.png')));
  const p2Png = PNG.sync.read(fs.readFileSync(path.join(rootDir, 'scratch/stats_pages/page_2.png')));
  const p18Png = PNG.sync.read(fs.readFileSync(path.join(rootDir, 'scratch/stats_pages/page_18.png')));
  const visPng = PNG.sync.read(fs.readFileSync(path.join(rootDir, 'scratch/vision_p1_150.png')));
  const zoom90Png = PNG.sync.read(fs.readFileSync(path.join(rootDir, 'scratch/stats_zoom90.png')));

  // -----------------------------------------------------------------------------
  // SECTION 1: AST, Syntax & Export Contracts in pdfZoneScanner.js (Areas 1-8)
  // -----------------------------------------------------------------------------
  await runTest('AST - sweepThirdDegreePerimeter is exported by pdfZoneScanner.js', () => {
    assert.ok(scannerSrc.includes('export function sweepThirdDegreePerimeter('));
  });

  await runTest('AST - sweepThirdDegreePerimeter has strict empty-crop bypass guard', () => {
    assert.ok(scannerSrc.includes('if (!cropTop && !cropBottom && !cropLeft && !cropRight)'));
  });

  await runTest('AST - sweepThirdDegreePerimeter evaluates central corridor clean ratio >= 0.95', () => {
    assert.ok(scannerSrc.includes('centerCleanRatio >= 0.95 && centerDarks === 0 && cornerDarks > 0'));
  });

  await runTest('AST - sweepThirdDegreePerimeter enforces low-transition seam threshold (transitions <= 8)', () => {
    assert.ok(scannerSrc.includes('transitions <= 8 && maxContDark >= 24'));
  });

  await runTest('AST - sweepThirdDegreePerimeter enforces continuous dark run threshold (maxContDark >= 24)', () => {
    assert.ok(scannerSrc.includes('maxContDark >= 24 && darkCount / spanH <= 0.35'));
  });

  await runTest('AST - sweepThirdDegreePerimeter enforces maximum total dark density cap', () => {
    assert.ok(scannerSrc.includes('darkCount / spanW <= 0.35') || scannerSrc.includes('darkCount / spanH <= 0.35'));
  });

  await runTest('AST - detectSmartBorders invokes sweepThirdDegreePerimeter as Pass 5 after cleanPerimeterSlivers', () => {
    const p4Index = scannerSrc.indexOf('cleanPerimeterSlivers(');
    const p5Index = scannerSrc.indexOf('sweepThirdDegreePerimeter(');
    assert.ok(p4Index > 0 && p5Index > p4Index, 'Pass 5 must be invoked after Pass 4');
  });

  await runTest('AST - detectSmartBorders passes enabledEdges to sweepThirdDegreePerimeter', () => {
    assert.ok(scannerSrc.includes('sweepThirdDegreePerimeter(data, width, height,'));
    assert.ok(scannerSrc.includes('enabledEdges);'));
  });

  // -----------------------------------------------------------------------------
  // SECTION 2: Empirical Real Image Verification on Page 6 (User Circled Defect) (Areas 9-16)
  // -----------------------------------------------------------------------------
  await runTest('Empirical - Page 6 geometry matches 1241 x 1754 px at 150 DPI', () => {
    assert.strictEqual(p6Png.width, 1241);
    assert.strictEqual(p6Png.height, 1754);
  });

  const detPage6 = detectSmartBorders({
    data: p6Png.data,
    width: p6Png.width,
    height: p6Png.height
  });

  await runTest('Empirical - detectSmartBorders on Page 6 flags hasBlackBorders === true', () => {
    assert.strictEqual(detPage6.hasBlackBorders, true);
  });

  await runTest('Empirical - cropTop on Page 6 is exactly 78px (advancing past the 59px wedge)', () => {
    assert.strictEqual(detPage6.cropTop, 78);
  });

  await runTest('Empirical - cropRight on Page 6 is exactly 121px (advancing past the 116px crease seam)', () => {
    assert.strictEqual(detPage6.cropRight, 121);
  });

  await runTest('Empirical - cropLeft on Page 6 is strictly 0px (notebook margin protected)', () => {
    assert.strictEqual(detPage6.cropLeft, 0);
  });

  await runTest('Empirical - cropBottom on Page 6 is strictly 0px (zero false bottom crop)', () => {
    assert.strictEqual(detPage6.cropBottom, 0);
  });

  await runTest('Content Safety - distance from cropTop=78 to handwriting at y=210 is exactly 132px (> 100px buffer)', () => {
    let minHandwritingY = p6Png.height;
    for (let x = 200; x < p6Png.width - 200; x += 3) {
      for (let y = detPage6.cropTop; y < 800; y++) {
        const idx = (y * p6Png.width + x) * 4;
        const lum = 0.2126 * p6Png.data[idx] + 0.7152 * p6Png.data[idx+1] + 0.0722 * p6Png.data[idx+2];
        if (lum < 115) {
          if (y < minHandwritingY) minHandwritingY = y;
          break;
        }
      }
    }
    const marginToInk = minHandwritingY - detPage6.cropTop;
    assert.ok(marginToInk > 100, 'Expected margin to ink > 100px, got ' + marginToInk + 'px');
    assert.strictEqual(marginToInk, 132);
  });

  await runTest('Zero Residual Dark Pixels - first 50 rows of cropped Page 6 have exactly 0 dark pixels', () => {
    let darkCount = 0;
    for (let y = detPage6.cropTop; y < detPage6.cropTop + 50; y++) {
      for (let x = detPage6.cropLeft; x < p6Png.width - detPage6.cropRight; x++) {
        const idx = (y * p6Png.width + x) * 4;
        const lum = 0.2126 * p6Png.data[idx] + 0.7152 * p6Png.data[idx+1] + 0.0722 * p6Png.data[idx+2];
        if (lum < 115) darkCount++;
      }
    }
    assert.strictEqual(darkCount, 0, 'Expected 0 dark pixels in top 50 rows, got ' + darkCount);
  });

  // -----------------------------------------------------------------------------
  // SECTION 3: Complete 18-Page Batch Invariants & Content Safety (Areas 17-28)
  // -----------------------------------------------------------------------------
  const detPage1 = detectSmartBorders({ data: p1Png.data, width: p1Png.width, height: p1Png.height });
  await runTest('Page 1: cropRight === 121 and cropBottom === 91 with zero top/left false crops', () => {
    assert.strictEqual(detPage1.hasBlackBorders, true);
    assert.strictEqual(detPage1.cropTop, 0);
    assert.strictEqual(detPage1.cropLeft, 0);
    assert.strictEqual(detPage1.cropRight, 121);
    assert.strictEqual(detPage1.cropBottom, 91);
  });

  const detPage2 = detectSmartBorders({ data: p2Png.data, width: p2Png.width, height: p2Png.height });
  await runTest('Page 2: cropTop === 80 and cropRight === 115 with zero left/bottom crops', () => {
    assert.strictEqual(detPage2.hasBlackBorders, true);
    assert.strictEqual(detPage2.cropTop, 80);
    assert.strictEqual(detPage2.cropRight, 115);
    assert.strictEqual(detPage2.cropLeft, 0);
    assert.strictEqual(detPage2.cropBottom, 0);
  });

  const p12Png = PNG.sync.read(fs.readFileSync(path.join(rootDir, 'scratch/stats_pages/page_12.png')));
  const detPage12 = detectSmartBorders({ data: p12Png.data, width: p12Png.width, height: p12Png.height });
  await runTest('Page 12: cropBottom >= 87 (excising bottom photocopy seam line)', () => {
    assert.ok(detPage12.cropBottom >= 87 && detPage12.cropBottom <= 88);
  });

  const p8Png = PNG.sync.read(fs.readFileSync(path.join(rootDir, 'scratch/stats_pages/page_8.png')));
  const detPage8 = detectSmartBorders({ data: p8Png.data, width: p8Png.width, height: p8Png.height });
  await runTest('Page 8: cropRight >= 118 (excising right scanner lid shadow bar)', () => {
    assert.ok(detPage8.cropRight >= 118, 'Expected cropRight >= 118, got ' + detPage8.cropRight);
    assert.strictEqual(detPage8.cropLeft, 0);
  });

  const p13Png = PNG.sync.read(fs.readFileSync(path.join(rootDir, 'scratch/stats_pages/page_13.png')));
  const detPage13 = detectSmartBorders({ data: p13Png.data, width: p13Png.width, height: p13Png.height });
  await runTest('Page 13: cropBottom === 129 (excising bottom photocopy seam line)', () => {
    assert.strictEqual(detPage13.cropBottom, 129);
  });

  const p14Png = PNG.sync.read(fs.readFileSync(path.join(rootDir, 'scratch/stats_pages/page_14.png')));
  const detPage14 = detectSmartBorders({ data: p14Png.data, width: p14Png.width, height: p14Png.height });
  await runTest('Page 14: cropBottom === 114 (excising bottom photocopy seam line)', () => {
    assert.strictEqual(detPage14.cropBottom, 114);
  });

  const p16Png = PNG.sync.read(fs.readFileSync(path.join(rootDir, 'scratch/stats_pages/page_16.png')));
  const detPage16 = detectSmartBorders({ data: p16Png.data, width: p16Png.width, height: p16Png.height });
  await runTest('Page 16: cropRight === 126 (excising right scanner seam line)', () => {
    assert.strictEqual(detPage16.cropRight, 126);
  });

  const detPage18 = detectSmartBorders({ data: p18Png.data, width: p18Png.width, height: p18Png.height });
  await runTest('Page 18: cropTop === 88 and cropRight === 68', () => {
    assert.strictEqual(detPage18.cropTop, 88);
    assert.strictEqual(detPage18.cropRight, 68);
  });

  const all18Results = [];
  for (let p = 1; p <= 18; p++) {
    const fPath = path.join(rootDir, 'scratch/stats_pages', 'page_' + p + '.png');
    const png = PNG.sync.read(fs.readFileSync(fPath));
    const res = detectSmartBorders({ data: png.data, width: png.width, height: png.height });
    all18Results.push({ page: p, png, res });
  }

  await runTest('All 18 Pages: Left border false-positive prevention (cropLeft === 0 across all pages)', () => {
    const failures = all18Results.filter(item => item.res.cropLeft !== 0);
    assert.strictEqual(failures.length, 0, 'Pages failed left crop check: ' + failures.map(f => f.page).join(', '));
  });

  await runTest('All 18 Pages: Right border scanner detection (cropRight > 0 across all pages)', () => {
    const failures = all18Results.filter(item => item.res.cropRight <= 0);
    assert.strictEqual(failures.length, 0, 'Pages failed right crop check: ' + failures.map(f => f.page).join(', '));
  });

  await runTest('All 18 Pages: Overall confidence validity (overallConfidence >= 65 on every page)', () => {
    const lowConf = all18Results.filter(item => item.res.overallConfidence < 65);
    assert.strictEqual(lowConf.length, 0, 'Pages with low confidence: ' + lowConf.map(f => f.page + ': ' + f.res.overallConfidence).join(', '));
  });

  await runTest('All 18 Pages: Bounding box non-emptiness (cleanBoxPx.width >= 1000 && height >= 1500)', () => {
    for (const item of all18Results) {
      assert.ok(item.res.cleanBoxPx.width >= 1000, 'Page ' + item.page + ' width ' + item.res.cleanBoxPx.width + ' < 1000');
      assert.ok(item.res.cleanBoxPx.height >= 1500, 'Page ' + item.page + ' height ' + item.res.cleanBoxPx.height + ' < 1500');
    }
  });

  await runTest('All 18 Pages: Top safety buffer to ink > 100px whenever cropTop > 0', () => {
    for (const item of all18Results) {
      if (item.res.cropTop > 0) {
        let minInkY = item.png.height;
        for (let x = 200; x < item.png.width - 200; x += 3) {
          for (let y = item.res.cropTop; y < 800; y++) {
            const idx = (y * item.png.width + x) * 4;
            const lum = 0.2126 * item.png.data[idx] + 0.7152 * item.png.data[idx+1] + 0.0722 * item.png.data[idx+2];
            if (lum < 115) {
              if (y < minInkY) minInkY = y;
              break;
            }
          }
        }
        const buffer = minInkY - item.res.cropTop;
        assert.ok(buffer >= 100, 'Page ' + item.page + ' top buffer to ink ' + buffer + 'px is < 100px');
      }
    }
  });

  // -----------------------------------------------------------------------------
  // SECTION 4: Clean Document & Digital PDF Parity (Areas 29-35)
  // -----------------------------------------------------------------------------
  const detVision = detectSmartBorders({
    data: visPng.data,
    width: visPng.width,
    height: visPng.height
  });

  await runTest('Clean Document (vision_p1_150): hasBlackBorders === false', () => {
    assert.strictEqual(detVision.hasBlackBorders, false);
  });

  await runTest('Clean Document (vision_p1_150): cropTop === 0', () => {
    assert.strictEqual(detVision.cropTop, 0);
  });

  await runTest('Clean Document (vision_p1_150): cropBottom === 0', () => {
    assert.strictEqual(detVision.cropBottom, 0);
  });

  await runTest('Clean Document (vision_p1_150): cropLeft === 0', () => {
    assert.strictEqual(detVision.cropLeft, 0);
  });

  await runTest('Clean Document (vision_p1_150): cropRight === 0', () => {
    assert.strictEqual(detVision.cropRight, 0);
  });

  await runTest('Clean Document (vision_p1_150): cleanBoxPx dimensions match 1241 x 1755 exactly', () => {
    assert.strictEqual(detVision.cleanBoxPx.width, 1241);
    assert.strictEqual(detVision.cleanBoxPx.height, 1755);
  });

  await runTest('Clean Document (vision_p1_150): overallConfidence === 0', () => {
    assert.strictEqual(detVision.overallConfidence, 0);
  });

  // -----------------------------------------------------------------------------
  // SECTION 5: Mathematical Formulas, Synthetic Wedges & Invariants (Areas 36-45)
  // -----------------------------------------------------------------------------
  await runTest('Synthetic Corner Wedge - dark corner pixels with 100% clean center yields isCornerWedge', () => {
    const w = 500, h = 500;
    const data = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 40 - y; x++) {
        const idx = (y * w + x) * 4;
        data[idx] = 20; data[idx+1] = 20; data[idx+2] = 20; data[idx+3] = 255;
      }
    }
    const res = sweepThirdDegreePerimeter(data, w, h, { cropTop: 10, cropBottom: 0, cropLeft: 0, cropRight: 0 });
    assert.ok(res.cropTop >= 30, 'Expected cropTop >= 30, got ' + res.cropTop);
  });

  await runTest('Synthetic Text Row - alternating glyph crossings in center stops sweep', () => {
    const w = 500, h = 500;
    const data = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let x = 150; x < 350; x += 10) {
      for (let dx = 0; dx < 3; dx++) {
        const idx = (15 * w + (x + dx)) * 4;
        data[idx] = 20; data[idx+1] = 20; data[idx+2] = 20; data[idx+3] = 255;
      }
    }
    const res = sweepThirdDegreePerimeter(data, w, h, { cropTop: 10, cropBottom: 0, cropLeft: 0, cropRight: 0 });
    assert.ok(res.cropTop <= 15, 'Expected cropTop to halt at or before row 15, got ' + res.cropTop);
  });

  await runTest('Synthetic Continuous Seam - maxContDark >= 24 with low transitions triggers seam excision', () => {
    const w = 500, h = 500;
    const data = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let y = 100; y < 250; y++) {
      const idx = (y * w + 479) * 4;
      data[idx] = 30; data[idx+1] = 30; data[idx+2] = 30; data[idx+3] = 255;
    }
    const res = sweepThirdDegreePerimeter(data, w, h, { cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 20 });
    assert.ok(res.cropRight > 20, 'Expected cropRight to advance past seam, got ' + res.cropRight);
  });

  await runTest('Synthetic High-Frequency Noise - transitions > 8 halts seam excision immediately', () => {
    const w = 500, h = 500;
    const data = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let y = 50; y < 200; y += 10) {
      const idx = (y * w + 479) * 4;
      data[idx] = 30; data[idx+1] = 30; data[idx+2] = 30; data[idx+3] = 255;
    }
    const res = sweepThirdDegreePerimeter(data, w, h, { cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 20 });
    assert.strictEqual(res.cropRight, 20, 'Expected cropRight not to advance on high transition noise');
  });

  await runTest('Synthetic Pure White Canvas - yields hasBlackBorders === false and all crops 0', () => {
    const whiteData = new Uint8ClampedArray(1000 * 1000 * 4).fill(255);
    const res = detectSmartBorders({ data: whiteData, width: 1000, height: 1000 });
    assert.strictEqual(res.hasBlackBorders, false);
    assert.strictEqual(res.cropTop, 0);
    assert.strictEqual(res.cropBottom, 0);
    assert.strictEqual(res.cropLeft, 0);
    assert.strictEqual(res.cropRight, 0);
  });

  await runTest('Synthetic Pure Black Canvas - triggers isInvertedDocument === true and crops 0', () => {
    const blackData = new Uint8ClampedArray(1000 * 1000 * 4);
    for (let i = 0; i < blackData.length; i += 4) {
      blackData[i] = 10; blackData[i+1] = 10; blackData[i+2] = 10; blackData[i+3] = 255;
    }
    const res = detectSmartBorders({ data: blackData, width: 1000, height: 1000 });
    assert.strictEqual(res.isInvertedDocument, true);
    assert.strictEqual(res.cropTop, 0);
  });

  await runTest('Alpha Blending - Fully transparent pixel (alpha 0) blends to pure white luminance 255', () => {
    const testBuf = new Uint8ClampedArray([0, 0, 0, 0]);
    const lum = getBlendedPixelLum(testBuf, 0);
    assert.strictEqual(lum, 255);
  });

  await runTest('Alpha Blending - Semi-transparent black pixel (alpha 128) blends to ~127.5', () => {
    const testBuf = new Uint8ClampedArray([0, 0, 0, 128]);
    const lum = getBlendedPixelLum(testBuf, 0);
    assert.ok(Math.abs(lum - 127.5) < 1.0, 'Expected ~127.5, got ' + lum);
  });

  await runTest('PDF Geometry Math - computeCleanPdfCropBox converts pixel crops to canonical PDF points', () => {
    const pageW = 595.28;
    const pageH = 841.89;
    const canvasW = 1241;
    const canvasH = 1754;
    const box = computeCleanPdfCropBox(pageW, pageH, canvasW, canvasH, {
      cropTop: 78,
      cropBottom: 0,
      cropLeft: 0,
      cropRight: 121,
      hasBlackBorders: true
    });
    assert.ok(box.x >= 0, 'x must be non-negative');
    assert.ok(box.y >= 0, 'y must be non-negative');
    assert.ok(box.width > 500 && box.width < 600, 'Width in plausible pt range');
    assert.ok(box.height > 750 && box.height < 850, 'Height in plausible pt range');
  });

  await runTest('Zoom Invariance - stats_zoom90.png excises bottom shadow (>= 150) and right border (>= 218)', () => {
    const resZoom90 = detectSmartBorders({ data: zoom90Png.data, width: zoom90Png.width, height: zoom90Png.height });
    assert.strictEqual(resZoom90.hasBlackBorders, true);
    assert.ok(resZoom90.cropBottom >= 150, 'Expected cropBottom >= 150, got ' + resZoom90.cropBottom);
    assert.ok(resZoom90.cropRight >= 218, 'Expected cropRight >= 218, got ' + resZoom90.cropRight);
  });

  console.log('\n======================================================================');
  console.log('   Verification Results: ' + passedTests + '/' + totalTests + ' Test Areas Passed!');
  console.log('======================================================================\n');
}

runAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
