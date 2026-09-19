import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PNG } from 'pngjs';
import { fileURLToPath } from 'url';

import {
  detectSmartBorders,
  detectBlackScanBorders,
  measureEdgeColorVariance,
  measureScanlineFrequencyEntropy,
  detectCornerWedge,
  contentFenceGuard,
  computeCleanPdfCropBox
} from '../../src/utils/pdfZoneScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

console.log('======================================================================');
console.log('   DocForge Bottom Scanner Shadow & Watermark Remediation Test Suite   ');
console.log('======================================================================\n');

let passCount = 0;
let totalCount = 0;

async function runTest(areaName, testFn) {
  totalCount++;
  const label = `Area ${String(totalCount).padStart(2, '0')}: ${areaName}`;
  try {
    await testFn();
    console.log(`  [PASS] ${label}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${label}`);
    console.error(`         ${err.message}\n`);
  }
}

async function main() {
  const scannerSrcPath = path.join(projectRoot, 'src/utils/pdfZoneScanner.js');
  const watermarkSrcPath = path.join(projectRoot, 'src/pages/pdf/AddWatermark.jsx');
  const watermarkEnginePath = path.join(projectRoot, 'src/engines/pdf/addWatermark.js');

  const scannerSrc = fs.readFileSync(scannerSrcPath, 'utf8');
  const watermarkSrc = fs.readFileSync(watermarkSrcPath, 'utf8');
  const watermarkEngineSrc = fs.readFileSync(watermarkEnginePath, 'utf8');

  const statsPath = path.join(projectRoot, 'scratch/stats_p1_dpi150.png');
  const cleanPath = path.join(projectRoot, 'scratch/test_scaled_vision.png');

  const statsPng = PNG.sync.read(fs.readFileSync(statsPath));
  const cleanPng = PNG.sync.read(fs.readFileSync(cleanPath));

  // -----------------------------------------------------------------------------
  // SECTION 1: AST Invariants & Structural Verification (Areas 1-8)
  // -----------------------------------------------------------------------------
  await runTest('AST - detectBlackScanBorders implements corner-exclusion padding padX and padY', () => {
    assert.ok(scannerSrc.includes('const padX = Math.min(Math.floor(width * 0.15), 100);'));
    assert.ok(scannerSrc.includes('const padY = Math.min(Math.floor(height * 0.15), 100);'));
    assert.ok(scannerSrc.includes('const spanW = width - 2 * padX;'));
    assert.ok(scannerSrc.includes('const spanH = height - 2 * padY;'));
  });

  await runTest('AST - detectBlackScanBorders tolerates outer margin before floating shadow bars', () => {
    assert.ok(scannerSrc.includes('cleanAtPerimeter++;'));
    assert.ok(scannerSrc.includes('if (cleanAtPerimeter >= maxCleanPerimeterGapY) break;') || scannerSrc.includes('if (cleanAtPerimeter >= maxCleanPerimeterGapX) break;'));
  });

  await runTest('AST - Horizontal scans use corner-excluded span across center', () => {
    assert.ok(scannerSrc.includes('for (let x = padX; x < width - padX; x++)'));
  });

  await runTest('AST - Vertical scans use corner-excluded span across center', () => {
    assert.ok(scannerSrc.includes('for (let y = padY; y < height - padY; y++)'));
  });

  await runTest('AST - Low transition requirement for shadow classification prevents text false-positives', () => {
    assert.ok(scannerSrc.includes('transitions <= 6'));
    assert.ok(scannerSrc.includes('darkRatio > 0.20 || avgLum < darkLuminanceThreshold || isWedgeShadow'));
  });

  await runTest('AST - measureEdgeColorVariance recognizes floating monochrome shadow bars', () => {
    assert.ok(scannerSrc.includes('const isMonochromeShadowBar = avgChroma < 20 && darkRatio > 0.18;'));
    assert.ok(scannerSrc.includes('isUniformDark = (avgLum < 150 || isMonochromeShadowBar) && avgChroma < 25'));
  });

  await runTest('AST - contentFenceGuard expands corner exclusion to 130px', () => {
    assert.ok(scannerSrc.includes('const padX = Math.min(Math.floor(width * 0.15), 130);'));
    assert.ok(scannerSrc.includes('const padY = Math.min(Math.floor(height * 0.15), 130);'));
  });

  await runTest('AST - Dual-layer entropy guard preserves glyphs while allowing uniform dark shadows', () => {
    assert.ok(scannerSrc.includes('if (entropy.isGlyphContent && !variance.isUniformDark)'));
  });

  // -----------------------------------------------------------------------------
  // SECTION 2: Empirical Real Image Verification on Statistics Assignment Page 1 (Areas 9-18)
  // -----------------------------------------------------------------------------
  const detection = detectSmartBorders({
    data: statsPng.data,
    width: statsPng.width,
    height: statsPng.height
  });

  await runTest('Empirical - Scanned assignment flags hasBlackBorders === true', () => {
    assert.strictEqual(detection.hasBlackBorders, true);
  });

  await runTest('Empirical - Right photocopier lid shadow identified (cropRight >= 118 px)', () => {
    assert.ok(detection.cropRight >= 118 && detection.cropRight <= 125);
    assert.ok(detection.cropRight === 118 || detection.cropRight === 121);
  });

  await runTest('Empirical - Bottom photocopier shadow bar identified (cropBottom = 91 px)', () => {
    assert.ok(detection.cropBottom >= 80 && detection.cropBottom <= 100);
    assert.strictEqual(detection.cropBottom, 91);
  });

  await runTest('Empirical - Zero false-positive top crop on assignment page', () => {
    assert.strictEqual(detection.cropTop, 0);
  });

  await runTest('Empirical - Zero false-positive left crop on assignment page', () => {
    assert.strictEqual(detection.cropLeft, 0);
  });

  await runTest('Empirical - Clean box x and y coordinates are 0', () => {
    assert.strictEqual(detection.cleanBoxPx.x, 0);
    assert.strictEqual(detection.cleanBoxPx.y, 0);
  });

  await runTest('Empirical Formula - Clean box width: 1241 - cropRight px', () => {
    assert.strictEqual(detection.cleanBoxPx.width, 1241 - detection.cropRight);
  });

  await runTest('Empirical Formula - Clean box height: 1754 - 91 = 1663 px', () => {
    assert.strictEqual(detection.cleanBoxPx.height, 1754 - 91);
    assert.strictEqual(detection.cleanBoxPx.height, 1663);
  });

  await runTest('Empirical - High confidence score (overallConfidence = 95%)', () => {
    assert.strictEqual(detection.overallConfidence, 95);
  });

  await runTest('Empirical - Content safety: handwriting starts at dist 118 (safe buffer >= 25 px)', () => {
    const handwritingDist = 118; // y = 1636
    const safeBufferPx = handwritingDist - detection.cropBottom;
    assert.ok(safeBufferPx >= 25, `Expected safe buffer >= 25px, got ${safeBufferPx}px`);
    assert.strictEqual(safeBufferPx, 27);
  });

  // -----------------------------------------------------------------------------
  // SECTION 3: Sub-Function Edge Verification on Bottom Shadow Band (Areas 19-24)
  // -----------------------------------------------------------------------------
  const varBottom = measureEdgeColorVariance(statsPng.data, statsPng.width, statsPng.height, 'bottom', 91);
  const entropyBottom = measureScanlineFrequencyEntropy(statsPng.data, statsPng.width, statsPng.height, 'bottom', 91);
  const wedgeBottom = detectCornerWedge(statsPng.data, statsPng.width, statsPng.height, 'bottom', 91);
  const fenceBottom = contentFenceGuard(statsPng.data, statsPng.width, statsPng.height, 'bottom', 91, 12, 0.04, 0, 125, true);

  await runTest('Empirical Bottom Variance - isUniformDark is true for floating shadow bar', () => {
    assert.strictEqual(varBottom.isUniformDark, true);
  });

  await runTest('Empirical Bottom Variance - Color variance is near-zero monochrome grayscale', () => {
    assert.ok(varBottom.colorVariance < 1.0);
    assert.strictEqual(varBottom.colorVariance, 0.2);
  });

  await runTest('Empirical Bottom Entropy - Continuous dark bar yields isGlyphContent === false', () => {
    assert.strictEqual(entropyBottom.isGlyphContent, false);
    assert.strictEqual(entropyBottom.maxContinuousDarkRatio, 1);
  });

  await runTest('Empirical Bottom Wedge - detectCornerWedge confirms full-width bar (not corner wedge)', () => {
    assert.strictEqual(wedgeBottom.isCornerWedgeOnly, false);
    assert.ok(wedgeBottom.centerDarkRatio > 0.20);
  });

  await runTest('Empirical Bottom Fence - Safe crop line matches 91 px without content collision', () => {
    assert.strictEqual(fenceBottom.safeCropLine, 91);
    assert.strictEqual(fenceBottom.contentDetected, false);
  });

  await runTest('PDF Geometry Math - computeCleanPdfCropBox produces exact dual-edge A4 coordinates', () => {
    const pageW = 595.28;
    const pageH = 841.89;
    const pdfCrop = computeCleanPdfCropBox(pageW, pageH, statsPng.width, statsPng.height, detection);
    assert.strictEqual(pdfCrop.hasBlackBorders, true);
    assert.ok(Math.abs(pdfCrop.cropRight - (detection.cropRight * (pageW / statsPng.width))) < 0.1);
    assert.strictEqual(pdfCrop.cropBottom, 43.68);
    assert.strictEqual(pdfCrop.cropTop, 0);
    assert.strictEqual(pdfCrop.cropLeft, 0);
    assert.ok(Math.abs(pdfCrop.width - (pageW - pdfCrop.cropRight)) < 0.1);
    assert.strictEqual(pdfCrop.height, 798.21);
  });

  // -----------------------------------------------------------------------------
  // SECTION 4: Clean Document False-Positive Immunity (Areas 25-28)
  // -----------------------------------------------------------------------------
  const cleanDetection = detectSmartBorders({
    data: cleanPng.data,
    width: cleanPng.width,
    height: cleanPng.height
  });

  await runTest('Clean PDF - hasBlackBorders is false on clean digital document', () => {
    assert.strictEqual(cleanDetection.hasBlackBorders, false);
  });

  await runTest('Clean PDF - Zero crop on all 4 edges (Top=0, Bottom=0, Left=0, Right=0)', () => {
    assert.strictEqual(cleanDetection.cropTop, 0);
    assert.strictEqual(cleanDetection.cropBottom, 0);
    assert.strictEqual(cleanDetection.cropLeft, 0);
    assert.strictEqual(cleanDetection.cropRight, 0);
  });

  await runTest('Clean PDF - Clean box matches full raster dimensions 1749 x 1241', () => {
    assert.strictEqual(cleanDetection.cleanBoxPx.x, 0);
    assert.strictEqual(cleanDetection.cleanBoxPx.y, 0);
    assert.strictEqual(cleanDetection.cleanBoxPx.width, 1749);
    assert.strictEqual(cleanDetection.cleanBoxPx.height, 1241);
  });

  await runTest('Clean PDF - Overall confidence is 0 on untouched clean document', () => {
    assert.strictEqual(cleanDetection.overallConfidence, 0);
  });

  // -----------------------------------------------------------------------------
  // SECTION 5: AddWatermark Engine & Architecture Verification (Areas 29-35)
  // -----------------------------------------------------------------------------
  await runTest('Engine - addWatermark.js imports cleanAndRefitDocument', () => {
    assert.ok(watermarkEngineSrc.includes("import { cleanAndRefitDocument } from './cleanAndRefitPage.js';"));
  });

  await runTest('Engine - addWatermark.js executes cleanAndRefitDocument BEFORE drawing watermark', () => {
    const cropIdx = watermarkEngineSrc.indexOf('cleanAndRefitDocument');
    const drawTextIdx = watermarkEngineSrc.indexOf('page.drawText');
    const drawImageIdx = watermarkEngineSrc.indexOf('page.drawImage');
    assert.ok(cropIdx > 0, 'cleanAndRefitDocument must exist in addWatermark.js');
    assert.ok(drawTextIdx > cropIdx, 'drawText must be executed AFTER cleanAndRefitDocument');
    assert.ok(drawImageIdx > cropIdx, 'drawImage must be executed AFTER cleanAndRefitDocument');
  });

  await runTest('UI Preview - AddWatermark.jsx calls cropper.runDetection on raw rendered canvas', () => {
    assert.ok(watermarkSrc.includes('const detection = cropper.runDetection(safePage, baseViewport);'));
  });

  await runTest('UI Preview - AddWatermark.jsx calls cropper.applyCanvasPreview when cropper is active', () => {
    assert.ok(watermarkSrc.includes('cropper.applyCanvasPreview(canvas, scaleMultiplier, detection, baseViewport);'));
  });

  await runTest('UI Preview - AddWatermark.jsx renders watermark as HTML overlay ABOVE canvas (not on canvas buffer)', () => {
    const canvasIdx = watermarkSrc.indexOf('<canvas');
    const overlayIdx = watermarkSrc.indexOf('repeatTile ?', canvasIdx);
    assert.ok(canvasIdx > 0, '<canvas must exist in AddWatermark.jsx');
    assert.ok(overlayIdx > canvasIdx, 'Watermark overlay must be rendered outside/above the canvas DOM node');
  });

  await runTest('UI Options - AddWatermark.jsx passes cropper options to addWatermark engine', () => {
    assert.ok(watermarkSrc.includes('cropper.getEngineOptionsAsync') || watermarkSrc.includes('...cropper.getEngineOptions()'));
  });

  await runTest('UI Reset - Revert button restores original un-cropped view cleanly', () => {
    assert.ok(watermarkSrc.includes('onClick={() => cropper.revert()}'));
    assert.ok(watermarkSrc.includes('Revert to Original'));
  });

  console.log('\n======================================================================');
  console.log(`   Verification Results: ${passCount}/${totalCount} Test Areas Passed!`);
  console.log('======================================================================\n');

  if (passCount !== totalCount) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
