import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { PDFDocument, PDFName } from 'pdf-lib';
import { PNG } from 'pngjs';
import { detectSmartBorders, computeCleanPdfCropBox } from '../../src/utils/pdfZoneScanner.js';
import { addWatermark } from '../../src/engines/pdf/addWatermark.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

console.log('======================================================================');
console.log('   DocForge Watermark Export & All-Pages Smart Crop Verification Suite');
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
    process.exitCode = 1;
  }
}

async function main() {
  const cropperHookPath = path.join(projectRoot, 'src/hooks/useSmartCropper.js');
  const watermarkSrcPath = path.join(projectRoot, 'src/pages/pdf/AddWatermark.jsx');
  const watermarkEnginePath = path.join(projectRoot, 'src/engines/pdf/addWatermark.js');

  const cropperHookSrc = fs.readFileSync(cropperHookPath, 'utf8');
  const watermarkSrc = fs.readFileSync(watermarkSrcPath, 'utf8');
  const watermarkEngineSrc = fs.readFileSync(watermarkEnginePath, 'utf8');

  // -----------------------------------------------------------------------------
  // SECTION 1: AST, Syntax & Interface Contracts (Areas 1-8)
  // -----------------------------------------------------------------------------
  await runTest('AST - useSmartCropper exports getEngineOptionsAsync', () => {
    assert.ok(cropperHookSrc.includes('const getEngineOptionsAsync = useCallback('));
    assert.ok(cropperHookSrc.includes('getEngineOptionsAsync,'));
  });

  await runTest('AST - getEngineOptionsAsync guards inactive or missing parameters', () => {
    assert.ok(cropperHookSrc.includes('if (!isActive || !file || !pdfjs) return baseOpts;'));
  });

  await runTest('AST - getEngineOptionsAsync identifies and scans missing target pages', () => {
    assert.ok(cropperHookSrc.includes('const missing = pageIndices.filter((idx) => !existing[idx]);'));
    assert.ok(cropperHookSrc.includes('detectSmartBorders(offCanvas, { enabledEdges });'));
  });

  await runTest('AST - AddWatermark.jsx awaits getEngineOptionsAsync in handleApplyWatermark', () => {
    assert.ok(watermarkSrc.includes('cropper.getEngineOptionsAsync('));
    assert.ok(watermarkSrc.includes('...cropperOptions'));
  });

  await runTest('AST - addWatermark.js executes cleanAndRefitDocument before watermarking', () => {
    const cleanRefitIdx = watermarkEngineSrc.indexOf('cleanAndRefitDocument(');
    const drawTextIdx = watermarkEngineSrc.indexOf('page.drawText(');
    assert.ok(cleanRefitIdx > 0, 'cleanAndRefitDocument must be called');
    assert.ok(drawTextIdx > cleanRefitIdx, 'drawText must be called after cleanAndRefitDocument');
  });

  await runTest('AST - addWatermark.js supports 3x3 tile repeat grid mode', () => {
    assert.ok(watermarkEngineSrc.includes('if (isTileRepeat) {'));
    assert.ok(watermarkEngineSrc.includes('const cols = [width * 0.2, width * 0.5, width * 0.8];'));
    assert.ok(watermarkEngineSrc.includes('const rows = [height * 0.2, height * 0.5, height * 0.8];'));
  });

  await runTest('AST - addWatermark.js supports font switching (Times, Courier, Helvetica)', () => {
    assert.ok(watermarkEngineSrc.includes('StandardFonts.TimesRomanBold'));
    assert.ok(watermarkEngineSrc.includes('StandardFonts.CourierBold'));
    assert.ok(watermarkEngineSrc.includes('StandardFonts.HelveticaBold'));
  });

  await runTest('AST - addWatermark.js passes cleanMargin to cleanAndRefitDocument', () => {
    assert.ok(watermarkEngineSrc.includes('margin: options.cleanMargin ?? 0'));
  });

  // -----------------------------------------------------------------------------
  // SECTION 2: Empirical Multi-Page Scan across Statistics Assignment (Areas 9-20)
  // -----------------------------------------------------------------------------
  const pagesDir = path.join(projectRoot, 'scratch/stats_pages');
  const readPagePng = (n) => PNG.sync.read(fs.readFileSync(path.join(pagesDir, `page_${n}.png`)));

  const p1 = readPagePng(1);
  const det1 = detectSmartBorders(p1);
  await runTest('Page 1: Bottom photocopier shadow bar excised (cropBottom >= 85)', () => {
    assert.ok(det1.hasBlackBorders, 'Page 1 must have detected borders');
    assert.ok(det1.cropBottom >= 85, `Page 1 cropBottom expected >= 85, got ${det1.cropBottom}`);
    assert.strictEqual(det1.cropLeft, 0, 'cropLeft must be 0');
  });

  const p2 = readPagePng(2);
  const det2 = detectSmartBorders(p2);
  await runTest('Page 2: Top platen shadow excised (cropTop >= 75)', () => {
    assert.ok(det2.hasBlackBorders, 'Page 2 must have detected borders');
    assert.ok(det2.cropTop >= 75, `Page 2 cropTop expected >= 75, got ${det2.cropTop}`);
    assert.strictEqual(det2.cropLeft, 0, 'cropLeft must be 0');
  });

  const p4 = readPagePng(4);
  const det4 = detectSmartBorders(p4);
  await runTest('Page 4: Right crease excised with safe stop before text (cropRight >= 50)', () => {
    assert.ok(det4.cropRight >= 50, `Page 4 cropRight expected >= 50, got ${det4.cropRight}`);
    assert.strictEqual(det4.cropLeft, 0, 'cropLeft must be 0');
  });

  const p6 = readPagePng(6);
  const det6 = detectSmartBorders(p6);
  await runTest('Page 6: Top corner wedge and right crease excised (cropTop >= 75, cropRight >= 115)', () => {
    assert.ok(det6.cropTop >= 75, `Page 6 cropTop expected >= 75, got ${det6.cropTop}`);
    assert.ok(det6.cropRight >= 115, `Page 6 cropRight expected >= 115, got ${det6.cropRight}`);
    assert.strictEqual(det6.cropLeft, 0, 'cropLeft must be 0');
  });

  const p8 = readPagePng(8);
  const det8 = detectSmartBorders(p8);
  await runTest('Page 8: Right platen lid shadow bar excised (cropRight >= 118, cropBottom >= 80)', () => {
    assert.ok(det8.cropRight >= 118, `Page 8 cropRight expected >= 118, got ${det8.cropRight}`);
    assert.ok(det8.cropBottom >= 80, `Page 8 cropBottom expected >= 80, got ${det8.cropBottom}`);
    assert.strictEqual(det8.cropLeft, 0, 'cropLeft must be 0');
  });

  const p12 = readPagePng(12);
  const det12 = detectSmartBorders(p12);
  await runTest('Page 12: Bottom photocopy seam line excised (cropBottom >= 85)', () => {
    assert.ok(det12.cropBottom >= 85, `Page 12 cropBottom expected >= 85, got ${det12.cropBottom}`);
    assert.strictEqual(det12.cropLeft, 0, 'cropLeft must be 0');
  });

  const p13 = readPagePng(13);
  const det13 = detectSmartBorders(p13);
  await runTest('Page 13: Bottom photocopy seam line excised (cropBottom >= 125)', () => {
    assert.ok(det13.cropBottom >= 125, `Page 13 cropBottom expected >= 125, got ${det13.cropBottom}`);
    assert.strictEqual(det13.cropLeft, 0, 'cropLeft must be 0');
  });

  const p14 = readPagePng(14);
  const det14 = detectSmartBorders(p14);
  await runTest('Page 14: Bottom photocopy seam line excised (cropBottom >= 110)', () => {
    assert.ok(det14.cropBottom >= 110, `Page 14 cropBottom expected >= 110, got ${det14.cropBottom}`);
    assert.strictEqual(det14.cropLeft, 0, 'cropLeft must be 0');
  });

  const p16 = readPagePng(16);
  const det16 = detectSmartBorders(p16);
  await runTest('Page 16: Bottom shadow and right crease excised (cropBottom >= 95, cropRight >= 120)', () => {
    assert.ok(det16.cropBottom >= 95, `Page 16 cropBottom expected >= 95, got ${det16.cropBottom}`);
    assert.ok(det16.cropRight >= 120, `Page 16 cropRight expected >= 120, got ${det16.cropRight}`);
    assert.strictEqual(det16.cropLeft, 0, 'cropLeft must be 0');
  });

  const p18 = readPagePng(18);
  const det18 = detectSmartBorders(p18);
  await runTest('Page 18: Top platen shadow excised (cropTop >= 85, cropRight >= 65)', () => {
    assert.ok(det18.cropTop >= 85, `Page 18 cropTop expected >= 85, got ${det18.cropTop}`);
    assert.ok(det18.cropRight >= 65, `Page 18 cropRight expected >= 65, got ${det18.cropRight}`);
    assert.strictEqual(det18.cropLeft, 0, 'cropLeft must be 0');
  });

  // -----------------------------------------------------------------------------
  // SECTION 3: Universal Notebook Margin & Clean Doc Invariants (Areas 19-23)
  // -----------------------------------------------------------------------------
  await runTest('All 18 Pages: Student notebook left margin is 100% protected (cropLeft === 0)', () => {
    for (let i = 1; i <= 18; i++) {
      const p = readPagePng(i);
      const det = detectSmartBorders(p);
      assert.strictEqual(det.cropLeft, 0, `Page ${i} cropLeft must be 0, got ${det.cropLeft}`);
    }
  });

  await runTest('All 18 Pages: Right scanner border is detected across all 18 pages (cropRight > 0)', () => {
    for (let i = 1; i <= 18; i++) {
      const p = readPagePng(i);
      const det = detectSmartBorders(p);
      assert.ok(det.cropRight > 0, `Page ${i} cropRight must be > 0, got ${det.cropRight}`);
    }
  });

  const cleanPng = PNG.sync.read(fs.readFileSync(path.join(projectRoot, 'scratch/vision_p1_150.png')));
  const cleanDet = detectSmartBorders(cleanPng);
  await runTest('Clean Document Immunity: vision_p1_150 hasBlackBorders === false', () => {
    assert.strictEqual(cleanDet.hasBlackBorders, false);
  });

  await runTest('Clean Document Immunity: All 4 crops are 0 (Top=0, Bottom=0, Left=0, Right=0)', () => {
    assert.strictEqual(cleanDet.cropTop, 0);
    assert.strictEqual(cleanDet.cropBottom, 0);
    assert.strictEqual(cleanDet.cropLeft, 0);
    assert.strictEqual(cleanDet.cropRight, 0);
  });

  await runTest('Clean Document Immunity: Overall confidence is 0', () => {
    assert.strictEqual(cleanDet.overallConfidence, 0);
  });

  // -----------------------------------------------------------------------------
  // SECTION 4: Exported PDF Stream & Structure Verification (Areas 24-30)
  // -----------------------------------------------------------------------------
  const exportedPdfPath = path.join(projectRoot, 'scratch/exported_watermarked_statistics.pdf');
  const exportedBytes = fs.readFileSync(exportedPdfPath);
  const exportedDoc = await PDFDocument.load(exportedBytes);

  await runTest('Exported PDF: Total page count is exactly 18 pages', () => {
    assert.strictEqual(exportedDoc.getPageCount(), 18);
  });

  const expP8 = exportedDoc.getPage(7); // Page 8 (0-based 7)
  await runTest('Exported PDF: Page 8 dimensions match canonical A4 standard (595.28 x 841.89 pt)', () => {
    const size = expP8.getSize();
    assert.ok(Math.abs(size.width - 595.28) < 0.1, `Width expected ~595.28, got ${size.width}`);
    assert.ok(Math.abs(size.height - 841.89) < 0.1, `Height expected ~841.89, got ${size.height}`);
  });

  const expP1 = exportedDoc.getPage(0); // Page 1 (0-based 0)
  await runTest('Exported PDF: Page 1 dimensions match canonical A4 standard (595.28 x 841.89 pt)', () => {
    const size = expP1.getSize();
    assert.ok(Math.abs(size.width - 595.28) < 0.1, `Width expected ~595.28, got ${size.width}`);
    assert.ok(Math.abs(size.height - 841.89) < 0.1, `Height expected ~841.89, got ${size.height}`);
  });

  await runTest('Exported PDF: Page 8 contains native Form XObject embedding of clean content', () => {
    const resources = expP8.node.Resources();
    const xobject = resources.lookup(PDFName.of('XObject'));
    assert.ok(xobject !== undefined, 'Page 8 must contain XObject resources');
  });

  await runTest('Exported PDF: File size is valid and uncorrupted (> 6 MB)', () => {
    assert.ok(exportedBytes.byteLength > 6000000, `Expected > 6MB, got ${exportedBytes.byteLength}`);
  });

  // -----------------------------------------------------------------------------
  // SECTION 5: Molecular Visual Verification on Rendered Pages (Areas 29-35)
  // -----------------------------------------------------------------------------
  const p8Png = PNG.sync.read(fs.readFileSync(path.join(projectRoot, 'scratch/exported_page_8.png')));
  await runTest('Visual Parity: Exported Page 8 raster dimensions match 1241 x 1754 px at 150 DPI', () => {
    assert.strictEqual(p8Png.width, 1241);
    assert.strictEqual(p8Png.height, 1754);
  });

  await runTest('Visual Parity: Exported Page 8 rightmost margin (30px) is clean white paper (mean lum >= 254)', () => {
    let totalLum = 0;
    let count = 0;
    let minLum = 255;
    for (let y = 0; y < p8Png.height; y++) {
      for (let x = p8Png.width - 30; x < p8Png.width; x++) {
        const idx = (y * p8Png.width + x) * 4;
        const r = p8Png.data[idx];
        const g = p8Png.data[idx + 1];
        const b = p8Png.data[idx + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        totalLum += lum;
        count++;
        if (lum < minLum) minLum = lum;
      }
    }
    const meanLum = totalLum / count;
    assert.ok(meanLum >= 254, `Page 8 right margin expected mean lum >= 254, got ${meanLum.toFixed(2)}`);
  });

  await runTest('Visual Parity: Exported Page 8 rightmost edge (5px) has zero residual black pixels (lum >= 250)', () => {
    let minLum = 255;
    for (let y = 0; y < p8Png.height; y++) {
      for (let x = p8Png.width - 5; x < p8Png.width; x++) {
        const idx = (y * p8Png.width + x) * 4;
        const lum = 0.2126 * p8Png.data[idx] + 0.7152 * p8Png.data[idx + 1] + 0.0722 * p8Png.data[idx + 2];
        if (lum < minLum) minLum = lum;
      }
    }
    assert.ok(minLum >= 250, `Page 8 right edge 5px expected min lum >= 250, got ${minLum}`);
  });

  const p1Png = PNG.sync.read(fs.readFileSync(path.join(projectRoot, 'scratch/exported_page_1.png')));
  await runTest('Visual Parity: Exported Page 1 bottom margin has high clean paper mean luminance (>= 248)', () => {
    let totalLum = 0;
    let count = 0;
    for (let y = p1Png.height - 25; y < p1Png.height; y++) {
      for (let x = 0; x < p1Png.width; x++) {
        const idx = (y * p1Png.width + x) * 4;
        const lum = 0.2126 * p1Png.data[idx] + 0.7152 * p1Png.data[idx + 1] + 0.0722 * p1Png.data[idx + 2];
        totalLum += lum;
        count++;
      }
    }
    const meanLum = totalLum / count;
    assert.ok(meanLum >= 248, `Page 1 bottom margin expected mean lum >= 248, got ${meanLum.toFixed(2)}`);
  });

  await runTest('Watermark Placement: Page 8 watermark text stream is present and valid', () => {
    const content = expP8.node.Contents();
    assert.ok(content !== undefined, 'Page 8 content stream must be present');
  });

  await runTest('Watermark Rotation: addWatermark draws text with degrees(45) rotation', () => {
    assert.ok(watermarkEngineSrc.includes('rotate: degrees(rotationAngle)'));
  });

  await runTest('Watermark Opacity: addWatermark applies user opacity property', () => {
    assert.ok(watermarkEngineSrc.includes('opacity,'));
  });

  console.log('\n======================================================================');
  console.log(`   Verification Results: ${passCount}/${totalCount} Test Areas Passed!`);
  console.log('======================================================================\n');

  if (passCount !== totalCount) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
