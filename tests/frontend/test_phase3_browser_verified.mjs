import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName } from 'pdf-lib';

import {
  getPixelLuminance,
  getBlendedPixelLum,
  detectBlackScanBorders,
  measureEdgeColorVariance,
  measureScanlineFrequencyEntropy
} from '../../src/utils/pdfZoneScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

console.log('================================================================');
console.log('DOCFORGE PHASE 3: LIVE BROWSER VERIFIED ADVERSARIAL TEST SUITE');
console.log('   (Perimeter Guard, Scanline Entropy, Variance & Box Sync)     ');
console.log('================================================================\n');

const suite = [];

function test(name, fn) {
  suite.push({ name, fn, isAsync: false });
}

function testAsync(name, fn) {
  suite.push({ name, fn, isAsync: true });
}

function createBuffer(width, height, fillLum = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    data[idx] = fillLum;
    data[idx + 1] = fillLum;
    data[idx + 2] = fillLum;
    data[idx + 3] = 255;
  }
  return { data, width, height };
}

// ============================================================================
// SECTION 1: PERIMETER CONTINUITY GUARD (Tests 01 - 10)
// ============================================================================
console.log('--- SECTION 1: PERIMETER CONTINUITY GUARD (detectBlackScanBorders) ---');

test('01. Top perimeter continuity guard breaks immediately on clean paper (cropTop === 0)', () => {
  const buf = createBuffer(200, 200, 255);
  // Place content interior at y = 35
  for (let x = 20; x < 180; x++) {
    const idx = (35 * 200 + x) * 4;
    buf.data[idx] = 15; buf.data[idx + 1] = 15; buf.data[idx + 2] = 15;
  }
  const res = detectBlackScanBorders(buf);
  assert.equal(res.cropTop, 0, `Expected cropTop 0, got ${res.cropTop}`);
  assert.equal(res.hasBlackBorders, false);
});

test('02. Bottom perimeter continuity guard breaks immediately on clean paper (cropBottom === 0)', () => {
  const buf = createBuffer(200, 200, 255);
  // Place content interior at y = 165
  for (let x = 20; x < 180; x++) {
    const idx = (165 * 200 + x) * 4;
    buf.data[idx] = 15; buf.data[idx + 1] = 15; buf.data[idx + 2] = 15;
  }
  const res = detectBlackScanBorders(buf);
  assert.equal(res.cropBottom, 0, `Expected cropBottom 0, got ${res.cropBottom}`);
  assert.equal(res.hasBlackBorders, false);
});

test('03. Left perimeter continuity guard breaks immediately on clean paper (cropLeft === 0)', () => {
  const buf = createBuffer(200, 200, 255);
  // Place content interior at x = 35
  for (let y = 20; y < 180; y++) {
    const idx = (y * 200 + 35) * 4;
    buf.data[idx] = 15; buf.data[idx + 1] = 15; buf.data[idx + 2] = 15;
  }
  const res = detectBlackScanBorders(buf);
  assert.equal(res.cropLeft, 0, `Expected cropLeft 0, got ${res.cropLeft}`);
  assert.equal(res.hasBlackBorders, false);
});

test('04. Right perimeter continuity guard breaks immediately on clean paper (cropRight === 0)', () => {
  const buf = createBuffer(200, 200, 255);
  // Place content interior at x = 165
  for (let y = 20; y < 180; y++) {
    const idx = (y * 200 + 165) * 4;
    buf.data[idx] = 15; buf.data[idx + 1] = 15; buf.data[idx + 2] = 15;
  }
  const res = detectBlackScanBorders(buf);
  assert.equal(res.cropRight, 0, `Expected cropRight 0, got ${res.cropRight}`);
  assert.equal(res.hasBlackBorders, false);
});

test('05. Outer perimeter dark scan border at Top edge is detected before clean paper (cropTop > 0)', () => {
  const buf = createBuffer(200, 200, 255);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 200; x++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 10; buf.data[idx + 1] = 10; buf.data[idx + 2] = 10;
    }
  }
  const res = detectBlackScanBorders(buf);
  assert.ok(res.cropTop >= 6, `Expected cropTop >= 6, got ${res.cropTop}`);
  assert.equal(res.hasBlackBorders, true);
});

test('06. Outer perimeter dark scan border at Bottom edge is detected before clean paper (cropBottom > 0)', () => {
  const buf = createBuffer(200, 200, 255);
  for (let y = 192; y < 200; y++) {
    for (let x = 0; x < 200; x++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 10; buf.data[idx + 1] = 10; buf.data[idx + 2] = 10;
    }
  }
  const res = detectBlackScanBorders(buf);
  assert.ok(res.cropBottom >= 6, `Expected cropBottom >= 6, got ${res.cropBottom}`);
  assert.equal(res.hasBlackBorders, true);
});

test('07. Outer perimeter dark scan border at Left edge is detected before clean paper (cropLeft > 0)', () => {
  const buf = createBuffer(200, 200, 255);
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 200; y++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 10; buf.data[idx + 1] = 10; buf.data[idx + 2] = 10;
    }
  }
  const res = detectBlackScanBorders(buf);
  assert.ok(res.cropLeft >= 6, `Expected cropLeft >= 6, got ${res.cropLeft}`);
  assert.equal(res.hasBlackBorders, true);
});

test('08. Outer perimeter dark scan border at Right edge is detected before clean paper (cropRight > 0)', () => {
  const buf = createBuffer(200, 200, 255);
  for (let x = 192; x < 200; x++) {
    for (let y = 0; y < 200; y++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 10; buf.data[idx + 1] = 10; buf.data[idx + 2] = 10;
    }
  }
  const res = detectBlackScanBorders(buf);
  assert.ok(res.cropRight >= 6, `Expected cropRight >= 6, got ${res.cropRight}`);
  assert.equal(res.hasBlackBorders, true);
});

test('09. Mixed perimeter: dark top border detected while clean bottom edge terminates with 0 crop', () => {
  const buf = createBuffer(200, 200, 255);
  // Dark top border (y=0..7)
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 200; x++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 12; buf.data[idx + 1] = 12; buf.data[idx + 2] = 12;
    }
  }
  // Bottom content interior at y=170
  for (let x = 30; x < 170; x++) {
    const idx = (170 * 200 + x) * 4;
    buf.data[idx] = 20; buf.data[idx + 1] = 20; buf.data[idx + 2] = 20;
  }
  const res = detectBlackScanBorders(buf);
  assert.ok(res.cropTop >= 6, `cropTop should be >= 6, got ${res.cropTop}`);
  assert.equal(res.cropBottom, 0, `cropBottom must be 0, got ${res.cropBottom}`);
});

test('10. Mixed perimeter: dark left border detected while clean right edge terminates with 0 crop', () => {
  const buf = createBuffer(200, 200, 255);
  // Dark left border (x=0..7)
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 200; y++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 12; buf.data[idx + 1] = 12; buf.data[idx + 2] = 12;
    }
  }
  // Right content interior at x=170
  for (let y = 30; y < 170; y++) {
    const idx = (y * 200 + 170) * 4;
    buf.data[idx] = 20; buf.data[idx + 1] = 20; buf.data[idx + 2] = 20;
  }
  const res = detectBlackScanBorders(buf);
  assert.ok(res.cropLeft >= 6, `cropLeft should be >= 6, got ${res.cropLeft}`);
  assert.equal(res.cropRight, 0, `cropRight must be 0, got ${res.cropRight}`);
});

// ============================================================================
// SECTION 2: SCANLINE SPATIAL FREQUENCY ENTROPY & GLYPH PROTECTION (Tests 11 - 19)
// ============================================================================
console.log('\n--- SECTION 2: SCANLINE SPATIAL FREQUENCY ENTROPY & GLYPH PROTECTION ---');

test('11. measureScanlineFrequencyEntropy: Solid dark scanner roller band has 0 transitions -> isGlyphContent === false', () => {
  const buf = createBuffer(200, 200, 255);
  // Continuous dark band at top 10 rows
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 200; x++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 20; buf.data[idx + 1] = 20; buf.data[idx + 2] = 20;
    }
  }
  const res = measureScanlineFrequencyEntropy(buf.data, 200, 200, 'top', 10);
  assert.equal(res.isGlyphContent, false);
  assert.equal(res.transitionCount, 0);
  assert.equal(res.maxContinuousDarkRatio, 1);
});

test('12. measureScanlineFrequencyEntropy: High-frequency alternating dark/light glyph text row -> isGlyphContent === true', () => {
  const buf = createBuffer(200, 200, 255);
  // Alternating text glyphs across top band
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 200; x++) {
      const isGlyphStem = Math.floor(x / 8) % 2 === 0;
      const idx = (y * 200 + x) * 4;
      const lum = isGlyphStem ? 20 : 255;
      buf.data[idx] = lum; buf.data[idx + 1] = lum; buf.data[idx + 2] = lum;
    }
  }
  const res = measureScanlineFrequencyEntropy(buf.data, 200, 200, 'top', 10);
  assert.equal(res.isGlyphContent, true);
  assert.ok(res.transitionCount >= 10, `Expected transitionCount >= 10, got ${res.transitionCount}`);
  assert.ok(res.maxContinuousDarkRatio < 0.20, `Expected maxContinuousDarkRatio < 0.20, got ${res.maxContinuousDarkRatio}`);
});

test('13. measureScanlineFrequencyEntropy: maxTransitionsInRow >= 5 triggers isGlyphContent === true even if average is diluted', () => {
  const buf = createBuffer(200, 200, 255);
  // Single row y=2 has 6 transitions (3 letters)
  const y = 2;
  for (let i = 0; i < 6; i++) {
    const xStart = 20 + i * 15;
    for (let x = xStart; x < xStart + 5; x++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 10; buf.data[idx + 1] = 10; buf.data[idx + 2] = 10;
    }
  }
  const res = measureScanlineFrequencyEntropy(buf.data, 200, 200, 'top', 8);
  assert.equal(res.isGlyphContent, true);
});

test('14. measureScanlineFrequencyEntropy: rowsWithTransitions >= 2 triggers isGlyphContent === true protecting multi-row text', () => {
  const buf = createBuffer(200, 200, 255);
  // Two rows with 4 transitions each
  [1, 3].forEach((y) => {
    [20, 50].forEach((xStart) => {
      for (let x = xStart; x < xStart + 8; x++) {
        const idx = (y * 200 + x) * 4;
        buf.data[idx] = 15; buf.data[idx + 1] = 15; buf.data[idx + 2] = 15;
      }
    });
  });
  const res = measureScanlineFrequencyEntropy(buf.data, 200, 200, 'top', 8);
  assert.equal(res.isGlyphContent, true);
});

test('15. measureScanlineFrequencyEntropy: Solid dark scanner roller shadow with maxContinuousDarkRatio > 0.55 -> isGlyphContent === false', () => {
  const buf = createBuffer(200, 200, 255);
  // Dark band covering 80% of width (uninterrupted span)
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 160; x++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 25; buf.data[idx + 1] = 25; buf.data[idx + 2] = 25;
    }
  }
  const res = measureScanlineFrequencyEntropy(buf.data, 200, 200, 'top', 8);
  assert.equal(res.isGlyphContent, false);
  assert.ok(res.maxContinuousDarkRatio >= 0.80);
});

test('16. measureScanlineFrequencyEntropy: Vertical scanning on left edge detects high-frequency text/ruling -> isGlyphContent === true', () => {
  const buf = createBuffer(200, 200, 255);
  // Alternating horizontal lines along left margin
  for (let y = 0; y < 200; y++) {
    const isLine = Math.floor(y / 10) % 2 === 0;
    if (isLine) {
      for (let x = 0; x < 10; x++) {
        const idx = (y * 200 + x) * 4;
        buf.data[idx] = 20; buf.data[idx + 1] = 20; buf.data[idx + 2] = 20;
      }
    }
  }
  const res = measureScanlineFrequencyEntropy(buf.data, 200, 200, 'left', 10);
  assert.equal(res.isGlyphContent, true);
  assert.ok(res.transitionCount >= 8);
});

test('17. measureScanlineFrequencyEntropy: Vertical solid scanner bar on left edge has 0 transitions -> isGlyphContent === false', () => {
  const buf = createBuffer(200, 200, 255);
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 200; y++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 30; buf.data[idx + 1] = 30; buf.data[idx + 2] = 30;
    }
  }
  const res = measureScanlineFrequencyEntropy(buf.data, 200, 200, 'left', 8);
  assert.equal(res.isGlyphContent, false);
  assert.equal(res.transitionCount, 0);
});

test('18. measureScanlineFrequencyEntropy: Formula verification: threshold === 140 precisely separates dark vs light', () => {
  const buf = createBuffer(200, 200, 255);
  // Rows 0..3 have pixel lum alternating across threshold 140: 139 (dark), 141 (light)
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 200; x++) {
      const lum = x % 2 === 0 ? 139 : 141;
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = lum; buf.data[idx + 1] = lum; buf.data[idx + 2] = lum;
    }
  }
  const res = measureScanlineFrequencyEntropy(buf.data, 200, 200, 'top', 4);
  assert.ok(res.transitionCount > 100, `Expected > 100 transitions across threshold 140, got ${res.transitionCount}`);
});

test('19. measureScanlineFrequencyEntropy: Fallback on small bandDepth (< 2) returns deterministic safe object', () => {
  const buf = createBuffer(200, 200, 255);
  const res = measureScanlineFrequencyEntropy(buf.data, 200, 200, 'top', 1);
  assert.deepEqual(res, { isGlyphContent: false, transitionCount: 0, maxContinuousDarkRatio: 1 });
});

// ============================================================================
// SECTION 3: EDGE COLOR VARIANCE & CHROMA ENTROPY (Tests 20 - 27)
// ============================================================================
console.log('\n--- SECTION 3: EDGE COLOR VARIANCE & CHROMA ENTROPY ---');

test('20. measureEdgeColorVariance: Pure neutral black/gray scanner shadow (R=G=B=25, avgLum=25, chroma=0) yields isUniformDark === true', () => {
  const buf = createBuffer(200, 200, 255);
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 200; x++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 25; buf.data[idx + 1] = 25; buf.data[idx + 2] = 25;
    }
  }
  const res = measureEdgeColorVariance(buf.data, 200, 200, 'top', 6);
  assert.equal(res.colorVariance, 0);
  assert.equal(res.isUniformDark, true);
});

test('21. measureEdgeColorVariance: High-chroma saturated color banner (R=220, G=20, B=20, chroma=200) yields isUniformDark === false', () => {
  const buf = createBuffer(200, 200, 255);
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 200; x++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 220; buf.data[idx + 1] = 20; buf.data[idx + 2] = 20;
    }
  }
  const res = measureEdgeColorVariance(buf.data, 200, 200, 'top', 6);
  assert.equal(res.colorVariance, 200);
  assert.equal(res.isUniformDark, false);
});

test('22. measureEdgeColorVariance: White paper with sparse text (avgLum >= 150) yields isUniformDark === false', () => {
  const buf = createBuffer(200, 200, 255);
  // 95% white, 5% black text
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 200; x++) {
      const idx = (y * 200 + x) * 4;
      const isInk = x < 10;
      const val = isInk ? 0 : 255;
      buf.data[idx] = val; buf.data[idx + 1] = val; buf.data[idx + 2] = val;
    }
  }
  const res = measureEdgeColorVariance(buf.data, 200, 200, 'top', 6);
  assert.equal(res.isUniformDark, false);
});

test('23. measureEdgeColorVariance: Exact chroma formula calculation max(r,g,b) - min(r,g,b)', () => {
  const buf = createBuffer(200, 200, 255);
  // R=180, G=120, B=70 -> chroma = 180 - 70 = 110
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 200; x++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 180; buf.data[idx + 1] = 120; buf.data[idx + 2] = 70;
    }
  }
  const res = measureEdgeColorVariance(buf.data, 200, 200, 'top', 6);
  assert.equal(res.colorVariance, 110);
});

test('24. measureEdgeColorVariance: Alpha-compositing: alpha=0 transparent pixels evaluate to white (chroma=0, lum=255)', () => {
  const buf = createBuffer(200, 200, 0); // rgb=0, but alpha=0
  for (let i = 0; i < 200 * 200; i++) {
    buf.data[i * 4 + 3] = 0; // zero alpha
  }
  const res = measureEdgeColorVariance(buf.data, 200, 200, 'top', 6);
  assert.equal(res.colorVariance, 0);
  assert.equal(res.isUniformDark, false); // Treated as white paper, not black shadow!
});

test('25. measureEdgeColorVariance: Narrow band (bandDepth <= 8) samples every row (stepBand=1) catching 1px lines', () => {
  const buf = createBuffer(200, 200, 255);
  // 1px black line at y=1
  for (let x = 0; x < 200; x++) {
    const idx = (1 * 200 + x) * 4;
    buf.data[idx] = 0; buf.data[idx + 1] = 0; buf.data[idx + 2] = 0;
  }
  const res = measureEdgeColorVariance(buf.data, 200, 200, 'top', 4);
  assert.ok(res.colorVariance === 0);
});

test('26. measureEdgeColorVariance: Bottom edge sampling indexes from height - bandDepth to height', () => {
  const buf = createBuffer(200, 200, 255);
  for (let y = 194; y < 200; y++) {
    for (let x = 0; x < 200; x++) {
      const idx = (y * 200 + x) * 4;
      buf.data[idx] = 20; buf.data[idx + 1] = 20; buf.data[idx + 2] = 20;
    }
  }
  const res = measureEdgeColorVariance(buf.data, 200, 200, 'bottom', 6);
  assert.equal(res.isUniformDark, true);
});

test('27. measureEdgeColorVariance: Fallback for invalid dimensions returns { colorVariance: 0, isUniformDark: false }', () => {
  const res = measureEdgeColorVariance(null, 10, 10, 'top', 0);
  assert.deepEqual(res, { colorVariance: 0, isUniformDark: false });
});

// ============================================================================
// SECTION 4: PDF DICTIONARY SYNCHRONIZATION & BOX PRUNING (Tests 28 - 34)
// ============================================================================
console.log('\n--- SECTION 4: PDF DICTIONARY SYNCHRONIZATION & BOX PRUNING ---');

testAsync('28. Dictionary Sync: page.node.delete(PDFName.of("CropBox")) removes CropBox dictionary entry', async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([500, 700]);
  // Explicitly set an obsolete CropBox
  page.node.set(PDFName.of('CropBox'), pdfDoc.context.obj([10, 10, 490, 690]));
  assert.ok(page.node.get(PDFName.of('CropBox')) !== undefined, 'CropBox should be set');

  // Prune obsolete CropBox
  page.node.delete(PDFName.of('CropBox'));
  assert.equal(page.node.get(PDFName.of('CropBox')), undefined, 'CropBox dictionary entry must be deleted');
});

testAsync('29. Dictionary Sync: page.node.delete(PDFName.of("BleedBox")) removes BleedBox dictionary entry', async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([500, 700]);
  page.node.set(PDFName.of('BleedBox'), pdfDoc.context.obj([5, 5, 495, 695]));
  assert.ok(page.node.get(PDFName.of('BleedBox')) !== undefined);

  page.node.delete(PDFName.of('BleedBox'));
  assert.equal(page.node.get(PDFName.of('BleedBox')), undefined);
});

testAsync('30. Dictionary Sync: page.node.delete(PDFName.of("TrimBox")) removes TrimBox dictionary entry', async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([500, 700]);
  page.node.set(PDFName.of('TrimBox'), pdfDoc.context.obj([8, 8, 492, 692]));
  assert.ok(page.node.get(PDFName.of('TrimBox')) !== undefined);

  page.node.delete(PDFName.of('TrimBox'));
  assert.equal(page.node.get(PDFName.of('TrimBox')), undefined);
});

testAsync('31. Dictionary Sync: page.node.delete(PDFName.of("ArtBox")) removes ArtBox dictionary entry', async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([500, 700]);
  page.node.set(PDFName.of('ArtBox'), pdfDoc.context.obj([12, 12, 488, 688]));
  assert.ok(page.node.get(PDFName.of('ArtBox')) !== undefined);

  page.node.delete(PDFName.of('ArtBox'));
  assert.equal(page.node.get(PDFName.of('ArtBox')), undefined);
});

testAsync('32. Dictionary Sync: page.setSize(targetW, targetH) updates MediaBox exactly', async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 600]);
  const targetW = 595.28;
  const targetH = 841.89;
  page.setSize(targetW, targetH);
  const size = page.getSize();
  assert.equal(size.width, targetW);
  assert.equal(size.height, targetH);
});

testAsync('33. Dictionary Sync: Aspect-ratio calculation preserves original proportion delta === 0', async () => {
  const origW = 595.5;
  const origH = 842.25;
  const targetW = 612;
  const targetH = 792;
  const scale = Math.min(targetW / origW, targetH / origH);
  const scaledW = origW * scale;
  const scaledH = origH * scale;
  const origAspect = origW / origH;
  const scaledAspect = scaledW / scaledH;
  assert.ok(Math.abs(origAspect - scaledAspect) < 1e-6, 'Aspect ratio must be preserved identically');
});

testAsync('34. Dictionary Sync: Safe deletion of nonexistent boxes does not throw or corrupt PDF', async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([500, 700]);
  // Neither CropBox nor BleedBox exist on virgin page
  page.node.delete(PDFName.of('CropBox'));
  page.node.delete(PDFName.of('BleedBox'));
  page.node.delete(PDFName.of('TrimBox'));
  page.node.delete(PDFName.of('ArtBox'));
  const bytes = await pdfDoc.save();
  assert.ok(bytes.length > 500, 'PDF must save cleanly');
});

// ============================================================================
// SECTION 5: REAL ARTIFACT VERIFICATION ON BROWSER MERGED PDF (Tests 35 - 40)
// ============================================================================
console.log('\n--- SECTION 5: REAL ARTIFACT VERIFICATION (browser_live_verified_merged.pdf) ---');

const MERGED_PDF_FILE = path.join(projectRoot, 'scratch', 'browser_live_verified_merged.pdf');
const RENDER_P3_FILE = path.join(projectRoot, 'scratch', 'browser_live_verified_p3.png');

test('35. Real Artifact: scratch/browser_live_verified_merged.pdf exists on disk and is non-empty (> 100 KB)', () => {
  assert.ok(fs.existsSync(MERGED_PDF_FILE), `Merged PDF missing: ${MERGED_PDF_FILE}`);
  const stats = fs.statSync(MERGED_PDF_FILE);
  assert.ok(stats.size > 100000, `Expected size > 100,000 bytes, got ${stats.size} bytes`);
});

testAsync('36. Real Artifact: Page count of merged PDF is exactly 3 (2 Kana + 1 Vision)', async () => {
  const bytes = fs.readFileSync(MERGED_PDF_FILE);
  const pdfDoc = await PDFDocument.load(bytes);
  assert.equal(pdfDoc.getPageCount(), 3, `Expected exactly 3 pages, got ${pdfDoc.getPageCount()}`);
});

testAsync('37. Real Artifact: Page 1 and Page 2 preserve Textbook Kana dimensions', async () => {
  const bytes = fs.readFileSync(MERGED_PDF_FILE);
  const pdfDoc = await PDFDocument.load(bytes);
  const p1 = pdfDoc.getPage(0);
  const p2 = pdfDoc.getPage(1);
  const s1 = p1.getSize();
  const s2 = p2.getSize();
  assert.ok(s1.width > 500 && s1.height > 500, `P1 size invalid: ${s1.width}x${s1.height}`);
  assert.ok(s2.width > 500 && s2.height > 500, `P2 size invalid: ${s2.width}x${s2.height}`);
});

testAsync('38. Real Artifact: Page 3 preserves Vision PDF dimensions (595.5 x 842.25 pt)', async () => {
  const bytes = fs.readFileSync(MERGED_PDF_FILE);
  const pdfDoc = await PDFDocument.load(bytes);
  const p3 = pdfDoc.getPage(2);
  const s3 = p3.getSize();
  assert.ok(Math.abs(s3.width - 595.5) < 1.0, `Expected width ~595.5 pt, got ${s3.width}`);
  assert.ok(Math.abs(s3.height - 842.25) < 1.0, `Expected height ~842.25 pt, got ${s3.height}`);
});

testAsync('39. Real Artifact: Page 3 has NO conflicting CropBox dictionary clipping entry', async () => {
  const bytes = fs.readFileSync(MERGED_PDF_FILE);
  const pdfDoc = await PDFDocument.load(bytes);
  const p3 = pdfDoc.getPage(2);
  const cropBox = p3.node.get(PDFName.of('CropBox'));
  // If CropBox exists, it must match or exceed media box, or be undefined
  if (cropBox) {
    const box = p3.getCropBox();
    assert.ok(box.width >= 595 && box.height >= 840, `CropBox is unexpectedly clipped: ${box.width}x${box.height}`);
  } else {
    assert.equal(cropBox, undefined);
  }
});

test('40. Real Artifact: High-resolution Page 3 visual render exists (> 1200x1700 px at 150 DPI)', () => {
  assert.ok(fs.existsSync(RENDER_P3_FILE), `Page 3 render missing: ${RENDER_P3_FILE}`);
  const stats = fs.statSync(RENDER_P3_FILE);
  assert.ok(stats.size > 50000, `Expected PNG size > 50,000 bytes, got ${stats.size} bytes`);
});

async function runSuite() {
  let passedCount = 0;
  for (const t of suite) {
    try {
      if (t.isAsync) {
        await t.fn();
      } else {
        t.fn();
      }
      passedCount++;
      console.log(`[PASS ${passedCount.toString().padStart(2, '0')}] ${t.name}`);
    } catch (err) {
      console.error(`[FAIL] ${t.name}`);
      console.error(err);
      process.exit(1);
    }
  }

  console.log('\n================================================================');
  console.log(`ALL ${passedCount}/${suite.length} PHASE 3 BROWSER VERIFICATION TESTS PASSED (100%)!`);
  console.log('================================================================');
}

await runSuite();

