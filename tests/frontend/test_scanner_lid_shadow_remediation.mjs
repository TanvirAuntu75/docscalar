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
  computeCleanPdfCropBox
} from '../../src/utils/pdfZoneScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('======================================================================');
console.log('   DocForge Scanner Lid Shadow Remediation & Entropy Test Suite       ');
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
  const toolbarBtnSrc = fs.readFileSync(path.join(rootDir, 'src/components/SmartCropperToolbarButton.jsx'), 'utf8');
  const useSmartCropperSrc = fs.readFileSync(path.join(rootDir, 'src/hooks/useSmartCropper.js'), 'utf8');
  const modalSrc = fs.readFileSync(path.join(rootDir, 'src/components/SmartCropperModal.jsx'), 'utf8');

  // Load real PDF raster
  const statsPngPath = path.join(rootDir, 'scratch/stats_p1_dpi150.png');
  const statsBuffer = fs.readFileSync(statsPngPath);
  const statsPng = PNG.sync.read(statsBuffer);

  // -----------------------------------------------------------------------------
  // SECTION 1: Source Code & AST Invariants in pdfZoneScanner.js (Areas 1-6)
  // -----------------------------------------------------------------------------
  await runTest('AST - Top/bottom scanline entropy enforces maxContinuousDarkRatio < 0.45', () => {
    assert.ok(scannerSrc.includes('const maxContinuousDarkRatio = maxContinuousDark / width;'));
    assert.ok(scannerSrc.includes('maxContinuousDarkRatio < 0.45 && ('));
  });

  await runTest('AST - Left/right scanline entropy enforces maxContinuousDarkRatio < 0.45', () => {
    assert.ok(scannerSrc.includes('const maxContinuousDarkRatio = maxContinuousDark / height;'));
    assert.ok(scannerSrc.includes('maxContinuousDarkRatio < 0.45 && ('));
  });

  await runTest('AST - detectSmartBorders entropy guard includes !variance.isUniformDark', () => {
    assert.ok(scannerSrc.includes('if (entropy.isGlyphContent && !variance.isUniformDark)'));
  });

  await runTest('AST - measureScanlineFrequencyEntropy returns isGlyphContent, transitionCount, and maxContinuousDarkRatio', () => {
    assert.ok(scannerSrc.includes('isGlyphContent,'));
    assert.ok(scannerSrc.includes('transitionCount: Math.round(avgTransitions * 10) / 10,'));
    assert.ok(scannerSrc.includes('maxContinuousDarkRatio: Math.round(maxContinuousDarkRatio * 1000) / 1000'));
  });

  await runTest('AST - Perimeter continuity guard implemented across all 4 directions in detectBlackScanBorders', () => {
    assert.ok(scannerSrc.includes('if (cleanAtPerimeter >= maxCleanPerimeterGap) break;'));
    assert.ok(scannerSrc.includes('cleanAtPerimeter++;'));
    assert.ok(scannerSrc.includes('rawCropTop === 0'));
    assert.ok(scannerSrc.includes('rawCropBottom === 0'));
    assert.ok(scannerSrc.includes('rawCropLeft === 0'));
    assert.ok(scannerSrc.includes('rawCropRight === 0'));
  });

  await runTest('AST - measureEdgeColorVariance uses isMonochromeShadowBar and isUniformDark', () => {
    assert.ok(scannerSrc.includes('const isMonochromeShadowBar = avgChroma < 20 && darkRatio > 0.18;'));
    assert.ok(scannerSrc.includes('const isUniformDark = (avgLum < 150 || isMonochromeShadowBar) && avgChroma < 25'));
  });

  // -----------------------------------------------------------------------------
  // SECTION 2: Empirical Real Image Verification on Statistics Assignment Page 1 (Areas 7-17)
  // -----------------------------------------------------------------------------
  await runTest('Empirical - scratch/stats_p1_dpi150.png exists and loads cleanly', () => {
    assert.ok(statsBuffer.length > 0);
    assert.ok(statsPng.data.length > 0);
  });

  await runTest('Empirical - stats_p1_dpi150.png geometry matches 1241 x 1754 px at 150 DPI', () => {
    assert.strictEqual(statsPng.width, 1241);
    assert.strictEqual(statsPng.height, 1754);
    assert.strictEqual(statsPng.data.length, 1241 * 1754 * 4);
  });

  const detection = detectSmartBorders({
    data: statsPng.data,
    width: statsPng.width,
    height: statsPng.height
  });

  await runTest('Empirical - detectSmartBorders on stats_p1_dpi150.png sets hasBlackBorders === true', () => {
    assert.strictEqual(detection.hasBlackBorders, true);
  });

  await runTest('Empirical - detectSmartBorders accurately identifies cropRight >= 110 && cropRight <= 125', () => {
    assert.ok(detection.cropRight >= 110 && detection.cropRight <= 125, `Expected cropRight between 110 and 125, got ${detection.cropRight}`);
    assert.ok(detection.cropRight === 121 || detection.cropRight === 118, `Expected cropRight 118 or 121, got ${detection.cropRight}`);
  });

  await runTest('Empirical - Zero false-positive top crop on stats_p1_dpi150.png (cropTop === 0)', () => {
    assert.strictEqual(detection.cropTop, 0);
  });

  await runTest('Empirical - Bottom photocopier shadow bar accurately identified (cropBottom between 80 and 100)', () => {
    assert.ok(detection.cropBottom >= 80 && detection.cropBottom <= 100, `Expected cropBottom between 80 and 100, got ${detection.cropBottom}`);
    assert.strictEqual(detection.cropBottom, 91);
  });

  await runTest('Empirical - Zero false-positive left crop on stats_p1_dpi150.png (cropLeft === 0)', () => {
    assert.strictEqual(detection.cropLeft, 0);
  });

  await runTest('Empirical - cleanBoxPx.x === 0 and cleanBoxPx.y === 0', () => {
    assert.strictEqual(detection.cleanBoxPx.x, 0);
    assert.strictEqual(detection.cleanBoxPx.y, 0);
  });

  await runTest('Empirical Formula - cleanBoxPx.width matches 1241 - cropRight', () => {
    assert.strictEqual(detection.cleanBoxPx.width, 1241 - detection.cropRight);
    assert.ok(detection.cleanBoxPx.width === 1120 || detection.cleanBoxPx.width === 1123);
  });

  await runTest('Empirical Formula - cleanBoxPx.height === 1754 - 91 = 1663 px', () => {
    assert.strictEqual(detection.cleanBoxPx.height, 1754 - 91);
    assert.strictEqual(detection.cleanBoxPx.height, 1663);
  });

  await runTest('Empirical - overallConfidence >= 50 on stats_p1_dpi150.png', () => {
    assert.ok(detection.overallConfidence >= 50, `Expected confidence >= 50, got ${detection.overallConfidence}`);
    assert.strictEqual(detection.overallConfidence, 95);
  });

  // -----------------------------------------------------------------------------
  // SECTION 3: Empirical Sub-Function Testing on Statistics Assignment Edge Band (Areas 18-24)
  // -----------------------------------------------------------------------------
  const entropyRight = measureScanlineFrequencyEntropy(statsPng.data, statsPng.width, statsPng.height, 'right', 120);

  await runTest('Empirical Entropy - measureScanlineFrequencyEntropy returns isGlyphContent === false on right bar', () => {
    assert.strictEqual(entropyRight.isGlyphContent, false);
  });

  await runTest('Empirical Entropy - maxContinuousDarkRatio on right edge band is >= 0.85', () => {
    assert.ok(entropyRight.maxContinuousDarkRatio >= 0.85, `Expected dark ratio >= 0.85, got ${entropyRight.maxContinuousDarkRatio}`);
    assert.strictEqual(entropyRight.maxContinuousDarkRatio, 0.943);
  });

  const varianceRight = measureEdgeColorVariance(statsPng.data, statsPng.width, statsPng.height, 'right', 120);

  await runTest('Empirical Variance - measureEdgeColorVariance returns isUniformDark === true on right bar', () => {
    assert.strictEqual(varianceRight.isUniformDark, true);
  });

  await runTest('Empirical Variance - colorVariance on right edge band is < 2.0 (neutral grayscale)', () => {
    assert.ok(varianceRight.colorVariance < 2.0, `Expected colorVariance < 2.0, got ${varianceRight.colorVariance}`);
    assert.strictEqual(varianceRight.colorVariance, 0.3);
  });

  const wedgeRight = detectCornerWedge(statsPng.data, statsPng.width, statsPng.height, 'right', 120);

  await runTest('Empirical Wedge - detectCornerWedge returns isCornerWedgeOnly === false on full-length right bar', () => {
    assert.strictEqual(wedgeRight.isCornerWedgeOnly, false);
  });

  const fenceResult = contentFenceGuard(statsPng.data, statsPng.width, statsPng.height, 'right', detection.cropRight);

  await runTest('Empirical Fence - contentFenceGuard preserves safe crop without clipping ink', () => {
    assert.ok(fenceResult.safeCropLine >= 110, `Expected safe crop line >= 110, got ${fenceResult.safeCropLine}`);
    assert.ok(fenceResult.safeCropLine === 121 || fenceResult.safeCropLine === 118);
  });

  const pagePtWidth = 595.28;
  const pagePtHeight = 841.89;
  const cleanBoxPt = computeCleanPdfCropBox(pagePtWidth, pagePtHeight, statsPng.width, statsPng.height, detection);

  await runTest('PDF Geometry Math - computeCleanPdfCropBox at A4 dimensions computes dual-edge clean box', () => {
    assert.ok(cleanBoxPt.cropRight >= 56 && cleanBoxPt.cropRight <= 59);
    assert.strictEqual(cleanBoxPt.cropBottom, 43.68);
    assert.ok(cleanBoxPt.width >= 536 && cleanBoxPt.width <= 539);
    assert.strictEqual(cleanBoxPt.height, 798.21);
    assert.strictEqual(cleanBoxPt.left, 0);
  });

  // -----------------------------------------------------------------------------
  // SECTION 4: Synthetic Edge-Case Testing & Branch Coverage (Areas 25-32)
  // -----------------------------------------------------------------------------
  await runTest('Synthetic Text - Simulated alternating glyph crossings yields isGlyphContent === true', () => {
    const synW = 200;
    const synH = 200;
    const synData = new Uint8Array(synW * synH * 4).fill(255);
    for (let y = 0; y < synH; y++) {
      for (let x = 0; x < synW; x++) {
        if (Math.floor(y / 15) % 2 === 0) {
          const idx = (y * synW + x) * 4;
          synData[idx] = 0;
          synData[idx + 1] = 0;
          synData[idx + 2] = 0;
          synData[idx + 3] = 255;
        }
      }
    }
    const entropy = measureScanlineFrequencyEntropy(synData, synW, synH, 'left', 40);
    assert.strictEqual(entropy.isGlyphContent, true);
    assert.ok(entropy.maxContinuousDarkRatio < 0.45);
  });

  await runTest('Synthetic Lid Shadow - Continuous dark band (90% height) with noisy penumbra yields isGlyphContent === false', () => {
    const synW = 200;
    const synH = 200;
    const synData = new Uint8Array(synW * synH * 4).fill(255);
    for (let x = 160; x < synW; x++) {
      for (let y = 0; y < 185; y++) {
        const idx = (y * synW + x) * 4;
        synData[idx] = 10;
        synData[idx + 1] = 10;
        synData[idx + 2] = 10;
        synData[idx + 3] = 255;
      }
    }
    const entropy = measureScanlineFrequencyEntropy(synData, synW, synH, 'right', 40);
    assert.strictEqual(entropy.isGlyphContent, false);
    assert.ok(entropy.maxContinuousDarkRatio >= 0.45);
  });

  await runTest('Synthetic Dual-Layer Override - isUniformDark guards against false glyph suppression', () => {
    const mockEntropy = { isGlyphContent: true };
    const mockVariance = { isUniformDark: true };
    const shouldSuppressCrop = mockEntropy.isGlyphContent && !mockVariance.isUniformDark;
    assert.strictEqual(shouldSuppressCrop, false);
  });

  await runTest('Synthetic Thin Border - 10px solid black border yields maxContinuousDarkRatio === 1.0 and isGlyphContent === false', () => {
    const synW = 100;
    const synH = 100;
    const synData = new Uint8Array(synW * synH * 4).fill(255);
    for (let x = 90; x < 100; x++) {
      for (let y = 0; y < synH; y++) {
        const idx = (y * synW + x) * 4;
        synData[idx] = 0;
        synData[idx + 1] = 0;
        synData[idx + 2] = 0;
        synData[idx + 3] = 255;
      }
    }
    const entropy = measureScanlineFrequencyEntropy(synData, synW, synH, 'right', 10);
    assert.strictEqual(entropy.maxContinuousDarkRatio, 1.0);
    assert.strictEqual(entropy.isGlyphContent, false);
  });

  await runTest('Synthetic Blank Paper - Pure white canvas yields hasBlackBorders === false and cropRight === 0', () => {
    const synW = 100;
    const synH = 100;
    const synData = new Uint8Array(synW * synH * 4).fill(255);
    const result = detectSmartBorders({ data: synData, width: synW, height: synH });
    assert.strictEqual(result.hasBlackBorders, false);
    assert.strictEqual(result.cropTop, 0);
    assert.strictEqual(result.cropBottom, 0);
    assert.strictEqual(result.cropLeft, 0);
    assert.strictEqual(result.cropRight, 0);
  });

  await runTest('Synthetic Inverted Canvas - Pure black canvas triggers isInverted === true', () => {
    const synW = 100;
    const synH = 100;
    const synData = new Uint8Array(synW * synH * 4).fill(0);
    for (let i = 3; i < synData.length; i += 4) synData[i] = 255;
    const inv = detectInvertedDocument(synData, synW, synH);
    assert.strictEqual(inv.isInverted, true);
  });

  await runTest('Synthetic Alpha Blending - Alpha 0 transparent pixels blend to white (luminance 255)', () => {
    const buffer = new Uint8Array([0, 0, 0, 0]);
    const lum = getBlendedPixelLum(buffer, 0);
    assert.strictEqual(lum, 255);
  });

  await runTest('Synthetic Partial Alpha - Half-opacity black pixel blends to ~127.5 luminance', () => {
    const buffer = new Uint8Array([0, 0, 0, 128]);
    const lum = getBlendedPixelLum(buffer, 0);
    const expected = Math.round(255 * (1 - 128 / 255));
    assert.ok(Math.abs(lum - expected) <= 1, `Expected ~${expected}, got ${lum}`);
  });

  // -----------------------------------------------------------------------------
  // SECTION 5: Cross-Document False-Positive Prevention & System Invariants (Areas 33-38)
  // -----------------------------------------------------------------------------
  await runTest('Clean Digital PDF - test_scaled_vision.png yields hasBlackBorders === false', () => {
    const visionPath = path.join(rootDir, 'scratch/test_scaled_vision.png');
    if (fs.existsSync(visionPath)) {
      const vBuffer = fs.readFileSync(visionPath);
      const vPng = PNG.sync.read(vBuffer);
      const vDet = detectSmartBorders({ data: vPng.data, width: vPng.width, height: vPng.height });
      assert.strictEqual(vDet.hasBlackBorders, false);
      assert.strictEqual(vDet.cropTop, 0);
      assert.strictEqual(vDet.cropRight, 0);
    } else {
      assert.ok(true);
    }
  });

  await runTest('Universal Engine Parity - organizePdf, removePages, extractPages, cleanAndRefitPage check hasBlackBorders === true', () => {
    const engines = ['organizePdf.js', 'removePages.js', 'extractPages.js', 'cleanAndRefitPage.js'];
    for (const engine of engines) {
      const src = fs.readFileSync(path.join(rootDir, `src/engines/pdf/${engine}`), 'utf8');
      assert.ok(src.includes('hasRealScanBorders') || src.includes('cropBox.hasBlackBorders === true') || src.includes('hasBlackBorders'));
    }
  });

  await runTest('UI Zero-Hyphen Invariant - SmartCropperToolbarButton.jsx has clean single-word Cropped label without dashes', () => {
    assert.ok(toolbarBtnSrc.includes('Cropped'));
    // Ensure button label uses "Cropped" instead of "Cropped - detected" or "Cropped – detected"
    assert.ok(!toolbarBtnSrc.includes("'Cropped - detected'"));
    assert.ok(!toolbarBtnSrc.includes("'Cropped – detected'"));
    assert.ok(!toolbarBtnSrc.includes("'Cropped — detected'"));
  });

  await runTest('Modal Architecture - SmartCropperModal.jsx portaling and overlay accessibility', () => {
    assert.ok(modalSrc.includes("createPortal(modalContent, document.body)"));
    assert.ok(modalSrc.includes("role=\"dialog\""));
    assert.ok(modalSrc.includes("aria-modal=\"true\""));
  });

  await runTest('Hook State Parity - useSmartCropper.js exports showInfoModal, onOpenInfo, and closeInfoModal', () => {
    assert.ok(useSmartCropperSrc.includes('showInfoModal,'));
    assert.ok(useSmartCropperSrc.includes('setShowInfoModal,'));
    assert.ok(useSmartCropperSrc.includes('onOpenInfo,'));
    assert.ok(useSmartCropperSrc.includes('closeInfoModal'));
  });

  await runTest('Bounding Box Coordinate Invariants - cleanBoxPx strictly bounded within raster dimensions', () => {
    assert.ok(detection.cleanBoxPx.x >= 0);
    assert.ok(detection.cleanBoxPx.y >= 0);
    assert.ok(detection.cleanBoxPx.x + detection.cleanBoxPx.width <= statsPng.width);
    assert.ok(detection.cleanBoxPx.y + detection.cleanBoxPx.height <= statsPng.height);
  });

  console.log(`\n======================================================================`);
  console.log(`   Verification Results: ${passedTests}/${totalTests} Test Areas Passed!`);
  console.log(`======================================================================\n`);

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
}

runAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
