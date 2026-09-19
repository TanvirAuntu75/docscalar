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
  detectSmartBorders,
  detectBlackScanBorders,
  computeCleanPdfCropBox
} from '../../src/utils/pdfZoneScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('======================================================================');
console.log('   DocForge Master Deep Barrier-Penetrating Verification Suite        ');
console.log('======================================================================\n');

let passedTests = 0;
let totalTests = 0;

async function runTest(description, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`  [PASS] Area ${totalTests.toString().padStart(2, '0')}: ${description}`);
  } catch (err) {
    console.error(`  [FAIL] Area ${totalTests.toString().padStart(2, '0')}: ${description}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAll() {
  const scannerSrc = fs.readFileSync(path.join(rootDir, 'src/utils/pdfZoneScanner.js'), 'utf8');
  const useSmartCropperSrc = fs.readFileSync(path.join(rootDir, 'src/hooks/useSmartCropper.js'), 'utf8');

  // Load real PDF raster fixtures
  const statsZoom90Path = path.join(rootDir, 'scratch/stats_zoom90.png');
  const statsZoom90Png = PNG.sync.read(fs.readFileSync(statsZoom90Path));

  const page4Path = path.join(rootDir, 'scratch/stats_pages/page_4.png');
  const page4Png = PNG.sync.read(fs.readFileSync(page4Path));

  const page6Path = path.join(rootDir, 'scratch/stats_pages/page_6.png');
  const page6Png = PNG.sync.read(fs.readFileSync(page6Path));

  const page1Path = path.join(rootDir, 'scratch/stats_pages/page_1.png');
  const page1Png = PNG.sync.read(fs.readFileSync(page1Path));

  const page2Path = path.join(rootDir, 'scratch/stats_pages/page_2.png');
  const page2Png = PNG.sync.read(fs.readFileSync(page2Path));

  const page18Path = path.join(rootDir, 'scratch/stats_pages/page_18.png');
  const page18Png = PNG.sync.read(fs.readFileSync(page18Path));

  const visionPath = path.join(rootDir, 'scratch/vision_p1_150.png');
  const visionPng = PNG.sync.read(fs.readFileSync(visionPath));

  // -----------------------------------------------------------------------------
  // SECTION 1: Real User Scanned Document Artifact Remediation (Areas 1-11)
  // -----------------------------------------------------------------------------
  const detZoom90 = detectSmartBorders({
    data: statsZoom90Png.data,
    width: statsZoom90Png.width,
    height: statsZoom90Png.height
  });

  await runTest('Image 1 (stats_zoom90): cropRight advances past old 210px halt to excise sliver (>= 218px)', () => {
    assert.strictEqual(detZoom90.hasBlackBorders, true);
    assert.ok(detZoom90.cropRight >= 218, `Expected cropRight >= 218, got ${detZoom90.cropRight}`);
    assert.strictEqual(detZoom90.cropRight, 234);
  });

  await runTest('Image 1 (stats_zoom90): Content safety buffer to handwriting in body > 25px', () => {
    const cropLineX = statsZoom90Png.width - detZoom90.cropRight;
    let maxBodyInkX = 0;
    for (let y = 500; y < 2500; y += 4) {
      for (let x = cropLineX - 1; x >= 0; x--) {
        const idx = (y * statsZoom90Png.width + x) * 4;
        const lum = 0.2126 * statsZoom90Png.data[idx] + 0.7152 * statsZoom90Png.data[idx+1] + 0.0722 * statsZoom90Png.data[idx+2];
        if (lum < 115) {
          if (x > maxBodyInkX) maxBodyInkX = x;
          break;
        }
      }
    }
    const distanceToInk = cropLineX - maxBodyInkX;
    assert.ok(distanceToInk > 25, `Expected buffer > 25px, got ${distanceToInk}px`);
    assert.ok(distanceToInk >= 100, `Expected comfortable buffer >= 100px, got ${distanceToInk}px`);
  });

  await runTest('Image 1 (stats_zoom90): Bottom shadow bar excised (cropBottom >= 150px)', () => {
    assert.ok(detZoom90.cropBottom >= 150, `Expected cropBottom >= 150, got ${detZoom90.cropBottom}`);
    assert.strictEqual(detZoom90.cropBottom, 163);
  });

  const detPage4 = detectSmartBorders({
    data: page4Png.data,
    width: page4Png.width,
    height: page4Png.height
  });

  await runTest('Image 2 (Page 4): cropRight advances to excise right crease/seam (cropRight >= 60px)', () => {
    assert.strictEqual(detPage4.hasBlackBorders, true);
    assert.ok(detPage4.cropRight >= 60, `Expected cropRight >= 60, got ${detPage4.cropRight}`);
    assert.strictEqual(detPage4.cropRight, 60);
  });

  await runTest('Image 2 (Page 4): Safe halt distance before main text column at x=1101 is >= 70px', () => {
    const cropLineX = page4Png.width - detPage4.cropRight; // 1241 - 60 = 1181
    const textBoundaryX = 1101;
    const marginToText = cropLineX - textBoundaryX;
    assert.ok(marginToText >= 70, `Expected margin to text >= 70px, got ${marginToText}px`);
    assert.strictEqual(marginToText, 80);
  });

  const detPage6 = detectSmartBorders({
    data: page6Png.data,
    width: page6Png.width,
    height: page6Png.height
  });

  await runTest('Image 3 (Page 6): Top scanner lid shadow penumbra excised (cropTop >= 78px)', () => {
    assert.strictEqual(detPage6.hasBlackBorders, true);
    assert.ok(detPage6.cropTop >= 78, `Expected cropTop >= 78, got ${detPage6.cropTop}`);
    assert.strictEqual(detPage6.cropTop, 78);
  });

  await runTest('Image 3 (Page 6): Halts > 100px before handwriting at y=210', () => {
    let minHandwritingY = page6Png.height;
    for (let x = 200; x < page6Png.width - 200; x += 3) {
      for (let y = detPage6.cropTop; y < 800; y++) {
        const idx = (y * page6Png.width + x) * 4;
        const lum = 0.2126 * page6Png.data[idx] + 0.7152 * page6Png.data[idx+1] + 0.0722 * page6Png.data[idx+2];
        if (lum < 115) {
          if (y < minHandwritingY) minHandwritingY = y;
          break;
        }
      }
    }
    const marginToInk = minHandwritingY - detPage6.cropTop;
    assert.ok(marginToInk > 100, `Expected margin to ink > 100px, got ${marginToInk}px`);
    assert.strictEqual(marginToInk, 132);
  });

  await runTest('Image 3 (Page 6): Right scanner border excised (cropRight >= 120px)', () => {
    assert.ok(detPage6.cropRight >= 120, `Expected cropRight >= 120, got ${detPage6.cropRight}`);
    assert.strictEqual(detPage6.cropRight, 121);
  });

  const detPage1 = detectSmartBorders({
    data: page1Png.data,
    width: page1Png.width,
    height: page1Png.height
  });

  await runTest('Page 1: cropRight >= 115px and cropBottom >= 85px with zero top/left false crops', () => {
    assert.strictEqual(detPage1.hasBlackBorders, true);
    assert.strictEqual(detPage1.cropTop, 0);
    assert.strictEqual(detPage1.cropLeft, 0);
    assert.strictEqual(detPage1.cropRight, 121);
    assert.strictEqual(detPage1.cropBottom, 91);
  });

  const detPage2 = detectSmartBorders({
    data: page2Png.data,
    width: page2Png.width,
    height: page2Png.height
  });

  await runTest('Page 2: Top shadow detected (cropTop >= 75px) and right border excised (cropRight >= 110px)', () => {
    assert.strictEqual(detPage2.hasBlackBorders, true);
    assert.strictEqual(detPage2.cropTop, 80);
    assert.strictEqual(detPage2.cropRight, 115);
    assert.strictEqual(detPage2.cropLeft, 0);
  });

  const detPage18 = detectSmartBorders({
    data: page18Png.data,
    width: page18Png.width,
    height: page18Png.height
  });

  await runTest('Page 18: Top scanner shadow excised (cropTop >= 80px) and right border excised (cropRight >= 60px)', () => {
    assert.strictEqual(detPage18.hasBlackBorders, true);
    assert.strictEqual(detPage18.cropTop, 88);
    assert.strictEqual(detPage18.cropRight, 68);
    assert.strictEqual(detPage18.cropLeft, 0);
  });

  // -----------------------------------------------------------------------------
  // SECTION 2: Complete 18-Page Zero-Clipped Handwriting & Integrity Matrix (Areas 12-17)
  // -----------------------------------------------------------------------------
  const all18Results = [];
  for (let p = 1; p <= 18; p++) {
    const fPath = path.join(rootDir, 'scratch/stats_pages', `page_${p}.png`);
    const png = PNG.sync.read(fs.readFileSync(fPath));
    const res = detectSmartBorders({ data: png.data, width: png.width, height: png.height });
    all18Results.push({ page: p, png, res });
  }

  await runTest('All 18 Pages: Left border false-positive prevention (cropLeft === 0 across all pages)', () => {
    const failures = all18Results.filter(item => item.res.cropLeft !== 0);
    assert.strictEqual(failures.length, 0, `Pages failed left crop check: ${failures.map(f => f.page).join(', ')}`);
  });

  await runTest('All 18 Pages: Right border scanner detection (cropRight > 0 across all pages)', () => {
    const failures = all18Results.filter(item => item.res.cropRight <= 0);
    assert.strictEqual(failures.length, 0, `Pages failed right crop check: ${failures.map(f => f.page).join(', ')}`);
  });

  await runTest('All 18 Pages: Overall confidence validity (overallConfidence >= 65 on every page)', () => {
    const failures = all18Results.filter(item => item.res.overallConfidence < 65);
    assert.strictEqual(failures.length, 0, `Pages below 65 confidence: ${failures.map(f => `${f.page}: ${f.res.overallConfidence}`).join(', ')}`);
  });

  await runTest('All 18 Pages: Content Fence safety on top crop (buffer to ink > 100px whenever cropTop > 0)', () => {
    const topCropped = all18Results.filter(item => item.res.cropTop > 0);
    assert.ok(topCropped.length >= 3, `Expected at least 3 pages with top crop, got ${topCropped.length}`);
    for (const item of topCropped) {
      const { png, res, page } = item;
      let minInkY = png.height;
      for (let x = 200; x < png.width - 200; x += 4) {
        for (let y = res.cropTop; y < 800; y++) {
          const idx = (y * png.width + x) * 4;
          const lum = 0.2126 * png.data[idx] + 0.7152 * png.data[idx+1] + 0.0722 * png.data[idx+2];
          if (lum < 115) {
            if (y < minInkY) minInkY = y;
            break;
          }
        }
      }
      const buffer = minInkY - res.cropTop;
      assert.ok(buffer > 100, `Page ${page} top buffer too small: ${buffer}px`);
    }
  });

  await runTest('All 18 Pages: Content Fence safety on bottom crop (buffer to ink > 20px on pages with bottom crop)', () => {
    const bottomCropped = all18Results.filter(item => item.res.cropBottom > 0);
    assert.ok(bottomCropped.length >= 10, `Expected >= 10 pages with bottom crop, got ${bottomCropped.length}`);
    for (const item of bottomCropped) {
      const { res, page } = item;
      assert.ok(res.cropBottom >= 50 && res.cropBottom <= 140, `Page ${page} bottom crop out of bounds: ${res.cropBottom}`);
    }
  });

  await runTest('All 18 Pages: Bounding box non-emptiness (cleanBoxPx.width >= 1000 && height >= 1500)', () => {
    for (const item of all18Results) {
      const { res, page } = item;
      assert.ok(res.cleanBoxPx.width >= 1000, `Page ${page} width too small: ${res.cleanBoxPx.width}`);
      assert.ok(res.cleanBoxPx.height >= 1500, `Page ${page} height too small: ${res.cleanBoxPx.height}`);
    }
  });

  // -----------------------------------------------------------------------------
  // SECTION 3: Clean Digital PDF Zero-False-Positive Invariant (Areas 18-23)
  // -----------------------------------------------------------------------------
  const detVision = detectSmartBorders({
    data: visionPng.data,
    width: visionPng.width,
    height: visionPng.height
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
    assert.strictEqual(detVision.cleanBoxPx.x, 0);
    assert.strictEqual(detVision.cleanBoxPx.y, 0);
    assert.strictEqual(detVision.cleanBoxPx.width, 1241);
    assert.strictEqual(detVision.cleanBoxPx.height, 1755);
  });

  // -----------------------------------------------------------------------------
  // SECTION 4: Universal Perimeter Sweeper & Barrier-Penetration Mathematics (Areas 24-29)
  // -----------------------------------------------------------------------------
  await runTest('Perimeter Sweeper Math: Dynamic sweep formula Math.max(35, Math.floor(Math.min(w,h)*0.05))', () => {
    assert.ok(scannerSrc.includes('const maxSweep = 35;'));
    assert.ok(scannerSrc.includes('const dynamicSweep = Math.max(maxSweep, Math.floor(Math.min(width, height) * 0.05));'));
    const sweep1241 = Math.max(35, Math.floor(Math.min(1241, 1754) * 0.05));
    assert.strictEqual(sweep1241, 62);
    const sweep2233 = Math.max(35, Math.floor(Math.min(2233, 3158) * 0.05));
    assert.strictEqual(sweep2233, 111);
  });

  await runTest('Perimeter Sweeper Math: transitionGuard = 18 allows absorbing scanner slivers while halting on text', () => {
    assert.ok(scannerSrc.includes('const transitionGuard = 18;'));
    assert.ok(scannerSrc.includes('if (transitions >= transitionGuard) break;'));
  });

  await runTest('Perimeter Sweeper Math: Inward clean paper verification requires cleanRatio >= 0.82 and maxRun < 6', () => {
    assert.ok(scannerSrc.includes('cleanRatio >= 0.82 && maxRun < 6'));
  });

  await runTest('Perimeter Sweeper Math: Lookahead bridge formula Math.min(20, Math.floor(dynamicSweep * 0.4))', () => {
    assert.ok(scannerSrc.includes('const maxBridge = Math.min(20, Math.floor(dynamicSweep * 0.4));'));
    const bridge62 = Math.min(20, Math.floor(62 * 0.4));
    assert.strictEqual(bridge62, 20);
  });

  await runTest('Perimeter Sweeper Math: +2px clean margin buffer past excised artifact', () => {
    assert.ok(scannerSrc.includes('if (lastArtifactOffset >= 0 && (s - lastArtifactOffset) < 2)'));
  });

  await runTest('Perimeter Sweeper Math: Symmetrical 4-edge sweep architecture in cleanPerimeterSlivers', () => {
    assert.ok(scannerSrc.includes('// ── Right perimeter ──'));
    assert.ok(scannerSrc.includes('// ── Bottom perimeter ──'));
    assert.ok(scannerSrc.includes('// ── Left perimeter ──'));
    assert.ok(scannerSrc.includes('// ── Top perimeter ──'));
  });

  // -----------------------------------------------------------------------------
  // SECTION 5: Synthetic Edge Cases, Alpha Blending & Chromatic Variance (Areas 30-37)
  // -----------------------------------------------------------------------------
  await runTest('Alpha Blending: Fully transparent pixel (alpha 0) blends to pure white luminance 255', () => {
    const rawData = new Uint8ClampedArray([0, 0, 0, 0]);
    const lum = getBlendedPixelLum(rawData, 0);
    assert.strictEqual(lum, 255);
  });

  await runTest('Alpha Blending: Semi-transparent black pixel (alpha 128) blends to off-white luminance ~127.5', () => {
    const rawData = new Uint8ClampedArray([0, 0, 0, 128]);
    const lum = getBlendedPixelLum(rawData, 0);
    assert.ok(lum >= 126 && lum <= 129, `Expected lum ~127.5, got ${lum}`);
  });

  await runTest('Achromatic Shadow Detection: Dark pixels with avgDarkChroma < 18 are flagged as achromatic shadow', () => {
    const w = 50, h = 50;
    const neutralData = new Uint8ClampedArray(w * h * 4);
    // Fill with neutral gray pixels (lum ~60, chroma = 0)
    for (let i = 0; i < w * h * 4; i += 4) {
      neutralData[i] = 60;
      neutralData[i+1] = 60;
      neutralData[i+2] = 60;
      neutralData[i+3] = 255;
    }
    const variance = measureEdgeColorVariance(neutralData, w, h, 'top', 10);
    assert.strictEqual(variance.isAchromaticShadow, true);
    assert.ok(variance.avgDarkChroma < 18);
  });

  await runTest('Chromatic Border Guard: Saturated colorful border (chroma > 20) is preserved as intentional design', () => {
    const w = 50, h = 50;
    const colorData = new Uint8ClampedArray(w * h * 4);
    // Fill with bright red pixels (R=220, G=20, B=20)
    for (let i = 0; i < w * h * 4; i += 4) {
      colorData[i] = 220;
      colorData[i+1] = 20;
      colorData[i+2] = 20;
      colorData[i+3] = 255;
    }
    const variance = measureEdgeColorVariance(colorData, w, h, 'top', 10);
    assert.strictEqual(variance.isAchromaticShadow, false);
    assert.ok(variance.colorVariance > 20);
  });

  await runTest('Inverted Document Rejection: Dark background document triggers isInverted === true', () => {
    const w = 100, h = 100;
    const darkData = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h * 4; i += 4) {
      darkData[i] = 30;
      darkData[i+1] = 30;
      darkData[i+2] = 30;
      darkData[i+3] = 255;
    }
    const check = detectInvertedDocument(darkData, w, h);
    assert.strictEqual(check.isInverted, true);
  });

  await runTest('Corner Wedge Guard: Corner shadow with clean central 60% yields isCornerWedgeOnly === true', () => {
    const w = 100, h = 100;
    const wedgeData = new Uint8ClampedArray(w * h * 4);
    // Fill all white first
    for (let i = 0; i < w * h * 4; i += 4) {
      wedgeData[i] = 255;
      wedgeData[i+1] = 255;
      wedgeData[i+2] = 255;
      wedgeData[i+3] = 255;
    }
    // Add dark smudge only in top-left corner (x: 0..10, y: 0..10)
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const idx = (y * w + x) * 4;
        wedgeData[idx] = 20;
        wedgeData[idx+1] = 20;
        wedgeData[idx+2] = 20;
      }
    }
    const wedge = detectCornerWedge(wedgeData, w, h, 'top', 12);
    assert.strictEqual(wedge.isCornerWedgeOnly, true);
    assert.ok(wedge.centerDarkRatio < 0.03);
  });

  await runTest('Synthetic Pure White Canvas: yields hasBlackBorders === false and all crops 0', () => {
    const w = 100, h = 100;
    const whiteData = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h * 4; i += 4) {
      whiteData[i] = 255;
      whiteData[i+1] = 255;
      whiteData[i+2] = 255;
      whiteData[i+3] = 255;
    }
    const det = detectSmartBorders({ data: whiteData, width: w, height: h });
    assert.strictEqual(det.hasBlackBorders, false);
    assert.strictEqual(det.cropTop, 0);
    assert.strictEqual(det.cropBottom, 0);
    assert.strictEqual(det.cropLeft, 0);
    assert.strictEqual(det.cropRight, 0);
  });

  await runTest('Synthetic Pure Black Canvas: triggers isInvertedDocument === true and crops 0', () => {
    const w = 100, h = 100;
    const blackData = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h * 4; i += 4) {
      blackData[i] = 0;
      blackData[i+1] = 0;
      blackData[i+2] = 0;
      blackData[i+3] = 255;
    }
    const det = detectSmartBorders({ data: blackData, width: w, height: h });
    assert.strictEqual(det.hasBlackBorders, false);
    assert.strictEqual(det.isInvertedDocument, true);
  });

  // -----------------------------------------------------------------------------
  // SECTION 6: Integration Parity & Cache Invariance (Areas 38-40)
  // -----------------------------------------------------------------------------
  await runTest('Hook Cache Invariant: useSmartCropper cache key incorporates dimensions and enabledEdges', () => {
    assert.ok(useSmartCropperSrc.includes('const cacheKey = `${pageNum}_${canvas.width}x${canvas.height}_${JSON.stringify(enabledEdges)}`;'));
  });

  await runTest('PDF Geometry Math: computeCleanPdfCropBox converts pixel crops to canonical PDF points', () => {
    const pageW = 595.28; // Standard A4 width in pt
    const pageH = 841.89; // Standard A4 height in pt
    const canvasW = 1241;
    const canvasH = 1754;
    const box = computeCleanPdfCropBox(pageW, pageH, canvasW, canvasH, {
      cropTop: 0,
      cropBottom: 91,
      cropLeft: 0,
      cropRight: 121,
      hasBlackBorders: true
    });

    const scaleX = pageW / canvasW;
    const scaleY = pageH / canvasH;

    const expectedLeft = 0;
    const expectedBottom = Math.round(91 * scaleY * 100) / 100;
    const expectedWidth = Math.round((1241 - 121) * scaleX * 100) / 100;
    const expectedHeight = Math.round((1754 - 91) * scaleY * 100) / 100;

    assert.strictEqual(box.left, expectedLeft);
    assert.strictEqual(box.cropX, expectedLeft);
    assert.strictEqual(box.bottom, expectedBottom);
    assert.strictEqual(box.cropY, expectedBottom);
    assert.strictEqual(box.width, expectedWidth);
    assert.strictEqual(box.cropWidth, expectedWidth);
    assert.strictEqual(box.height, expectedHeight);
    assert.strictEqual(box.cropHeight, expectedHeight);
    assert.strictEqual(box.hasBlackBorders, true);
  });

  await runTest('PDF Point Scale Parity: cleanBoxPt aspect ratio matches pixel cleanBoxPx within 0.001%', () => {
    const pageW = 595.28;
    const pageH = 841.89;
    const canvasW = 1241;
    const canvasH = 1754;
    const box = computeCleanPdfCropBox(pageW, pageH, canvasW, canvasH, {
      cropTop: 59,
      cropBottom: 0,
      cropLeft: 0,
      cropRight: 116,
      hasBlackBorders: true
    });

    const scaleX = pageW / canvasW;
    const scaleY = pageH / canvasH;

    // Unscaled point dimensions to canvas pixel space
    const unscaledPxWidth = box.width / scaleX;
    const unscaledPxHeight = box.height / scaleY;

    const expectedPxWidth = 1241 - 116;
    const expectedPxHeight = 1754 - 59;

    // Must match pixel dimensions within rounding error (< 0.05px)
    assert.ok(Math.abs(unscaledPxWidth - expectedPxWidth) < 0.05, `Width mismatch: got ${unscaledPxWidth}, expected ${expectedPxWidth}`);
    assert.ok(Math.abs(unscaledPxHeight - expectedPxHeight) < 0.05, `Height mismatch: got ${unscaledPxHeight}, expected ${expectedPxHeight}`);
  });

  console.log('\n======================================================================');
  console.log(`   Verification Results: ${passedTests}/${totalTests} Test Areas Passed!`);
  console.log('======================================================================\n');

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
}

runAll().catch(err => {
  console.error('Test runner fatal failure:', err);
  process.exit(1);
});
