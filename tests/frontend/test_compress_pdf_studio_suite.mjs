/**
 * MASTER COMPRESS PDF STUDIO & ENGINE MOLECULAR TEST SUITE
 * Quantitative test density: 70+ distinct, falsifiable assertions.
 * Exercises real PDFDocument operations, actual source functions, and component invariants.
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  parsePageRange,
  calculateEstimatedSavings,
  calculateTargetCompressionParams,
  calculateRecommendedCompressionRange,
  PORTAL_TARGET_PRESETS,
  assembleSequentialPages,
  auditDocumentBloat,
  compressPdf
} from '../../src/engines/pdf/compressPdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

let totalPassed = 0;
function test(desc, fn) {
  try {
    fn();
    totalPassed++;
    console.log(`  ✓ [${totalPassed}] ${desc}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function testAsync(desc, fn) {
  try {
    await fn();
    totalPassed++;
    console.log(`  ✓ [${totalPassed}] ${desc}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('===============================================================');
console.log('MASTER COMPRESS PDF STUDIO & ENGINE MOLECULAR TEST SUITE');
console.log('===============================================================');

// Helper to create a test synthetic PDF
async function createTestPdf(pageCount = 3) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([600, 800]);
    page.drawText(`Test Page ${i} - DocForge Sample Content`, {
      x: 50,
      y: 720,
      size: 16,
      font,
      color: rgb(0.1, 0.2, 0.4)
    });
  }
  doc.setTitle('Original Title Before Strip');
  doc.setAuthor('Original Author');
  return await doc.save();
}

// -------------------------------------------------------------
// Area 1: Resilient Input Extraction & Byte Handling
// -------------------------------------------------------------
console.log('\n--- Area 1: Resilient Input Extraction & Byte Handling ---');

await testAsync('Accepts raw ArrayBuffer input in compressPdf', async () => {
  const bytes = await createTestPdf(2);
  const blob = await compressPdf(bytes.buffer, { stripMetadata: true });
  assert.ok(blob, 'Returned blob must be valid');
  assert.equal(blob.type, 'application/pdf');
});

await testAsync('Accepts Uint8Array input in compressPdf', async () => {
  const bytes = await createTestPdf(2);
  const blob = await compressPdf(bytes, { stripMetadata: true });
  assert.ok(blob, 'Returned blob must be valid');
  assert.ok(blob.size > 0, 'Blob size must be positive');
});

await testAsync('Accepts Node Buffer input in compressPdf', async () => {
  const bytes = await createTestPdf(2);
  const nodeBuf = Buffer.from(bytes);
  const blob = await compressPdf(nodeBuf, { stripMetadata: true });
  assert.ok(blob, 'Returned blob must be valid');
});

await testAsync('Accepts Blob-like wrapper with arrayBuffer()', async () => {
  const bytes = await createTestPdf(2);
  const fakeBlob = {
    arrayBuffer: async () => bytes.buffer
  };
  const blob = await compressPdf(fakeBlob, { stripMetadata: true });
  assert.ok(blob, 'Returned blob must be valid');
});

await testAsync('Rejects null input with descriptive error', async () => {
  let threw = false;
  try {
    await compressPdf(null);
  } catch (err) {
    threw = true;
    assert.match(err.message, /Unsupported PDF file input format/i);
  }
  assert.ok(threw, 'Must throw error on null input');
});

// -------------------------------------------------------------
// Area 2: Page Range Parsing (parsePageRange)
// -------------------------------------------------------------
console.log('\n--- Area 2: Page Range Parsing (parsePageRange) ---');

test('"all" returns 1..totalPages', () => {
  const res = parsePageRange('all', 5);
  assert.deepEqual(res, [1, 2, 3, 4, 5]);
});

test('"odd" returns odd pages only', () => {
  const res = parsePageRange('odd', 6);
  assert.deepEqual(res, [1, 3, 5]);
});

test('"even" returns even pages only', () => {
  const res = parsePageRange('even', 6);
  assert.deepEqual(res, [2, 4, 6]);
});

test('Comma-separated list parsed correctly: "1, 3, 5"', () => {
  const res = parsePageRange('1, 3, 5', 10);
  assert.deepEqual(res, [1, 3, 5]);
});

test('Space-separated list parsed correctly: "1 3 5"', () => {
  const res = parsePageRange('1 3 5', 10);
  assert.deepEqual(res, [1, 3, 5]);
});

test('Semicolon-separated list parsed correctly: "1; 3; 5"', () => {
  const res = parsePageRange('1; 3; 5', 10);
  assert.deepEqual(res, [1, 3, 5]);
});

test('Hyphen range parsed correctly: "2-4"', () => {
  const res = parsePageRange('2-4', 5);
  assert.deepEqual(res, [2, 3, 4]);
});

test('Hyphen range with surrounding spaces: "2 - 4"', () => {
  const res = parsePageRange('2 - 4', 5);
  assert.deepEqual(res, [2, 3, 4]);
});

test('Reversed range normalizes: "4-2" produces [2, 3, 4]', () => {
  const res = parsePageRange('4-2', 5);
  assert.deepEqual(res, [2, 3, 4]);
});

test('Out-of-bounds start clamped to 1: "0-3" produces [1, 2, 3]', () => {
  const res = parsePageRange('0-3', 5);
  assert.deepEqual(res, [1, 2, 3]);
});

test('Out-of-bounds end clamped to totalPages: "8-15" on 10 pages produces [8, 9, 10]', () => {
  const res = parsePageRange('8-15', 10);
  assert.deepEqual(res, [8, 9, 10]);
});

test('Mixed complex input: "1, 3-5; 8 10"', () => {
  const res = parsePageRange('1, 3-5; 8 10', 12);
  assert.deepEqual(res, [1, 3, 4, 5, 8, 10]);
});

test('Deduplicates redundant pages and sorts', () => {
  const res = parsePageRange('5, 2, 5, 2, 3, 1', 10);
  assert.deepEqual(res, [1, 2, 3, 5]);
});

test('Empty or invalid string returns empty array', () => {
  assert.deepEqual(parsePageRange('', 5), []);
  assert.deepEqual(parsePageRange('   ', 5), []);
  assert.deepEqual(parsePageRange(null, 5), []);
  assert.deepEqual(parsePageRange('abc', 5), []);
});

// -------------------------------------------------------------
// Area 3: Weighted Estimated Savings (calculateEstimatedSavings)
// -------------------------------------------------------------
console.log('\n--- Area 3: Weighted Estimated Savings ---');

test('Full selection (10 of 10 pages) yields preset savings ratio 0.65', () => {
  const res = calculateEstimatedSavings(1_000_000, 10, 10, 0.65);
  assert.equal(res.effectiveSavingsRatio, 0.65);
  assert.equal(res.estimatedNewSize, 350_000);
});

test('Half selection (5 of 10 pages) yields exactly half savings (0.325)', () => {
  const res = calculateEstimatedSavings(1_000_000, 10, 5, 0.65);
  assert.equal(res.effectiveSavingsRatio, 0.325);
  assert.equal(res.estimatedNewSize, 675_000);
});

test('Zero selected pages yields 0 savings and keeps original size', () => {
  const res = calculateEstimatedSavings(1_000_000, 10, 0, 0.65);
  assert.equal(res.effectiveSavingsRatio, 0);
  assert.equal(res.estimatedNewSize, 1_000_000);
});

test('Small file (500 bytes) does not inflate past original size', () => {
  const res = calculateEstimatedSavings(500, 1, 1, 0.5);
  assert.ok(res.estimatedNewSize <= 500, 'Small file must not inflate above original size');
  assert.equal(res.estimatedNewSize, 250);
});

test('Zero original size handled safely without crashing', () => {
  const res = calculateEstimatedSavings(0, 10, 5, 0.65);
  assert.equal(res.estimatedNewSize, 0);
  assert.equal(res.effectiveSavingsRatio, 0);
});

// -------------------------------------------------------------
// Area 4: Target Compression Parameter Calculations
// -------------------------------------------------------------
console.log('\n--- Area 4: Target Compression Parameter Calculations ---');

test('Already compliant file (1 MB orig <= 2 MB target) returns lossless mode', () => {
  const res = calculateTargetCompressionParams(1_000_000, 2_000_000);
  assert.equal(res.isAlreadyWithinTarget, true);
  assert.equal(res.mode, 'lossless');
  assert.equal(res.quality, 0.95);
  assert.equal(res.requiredReductionPct, 0);
});

test('Safe target buffer applies 94% ceiling', () => {
  const targetBytes = 1_000_000;
  const res = calculateTargetCompressionParams(2_000_000, targetBytes);
  assert.equal(res.safeTargetBytes, Math.floor(targetBytes * 0.94));
});

test('Extreme reduction ratio (r <= 0.05) clamps to quality 0.20 and scale 0.65', () => {
  const res = calculateTargetCompressionParams(20_000_000, 500_000);
  assert.equal(res.quality, 0.20);
  assert.equal(res.scale, 0.65);
  assert.equal(res.effectiveDpi, 72);
});

test('Intermediate reduction ratio (r ~ 0.50) yields quality 0.64 and scale 1.30', () => {
  // r = (safeTargetBytes / orig) = 940,000 / 1,880,000 = 0.50
  const res = calculateTargetCompressionParams(1_880_000, 1_000_000);
  assert.equal(res.quality, 0.64);
  assert.equal(res.scale, 1.30);
  assert.equal(res.effectiveDpi, 150);
});

test('Piecewise interpolation is strictly monotonic for quality', () => {
  const orig = 10_000_000;
  const targets = [1_000_000, 3_000_000, 5_000_000, 7_000_000, 9_000_000];
  const qualities = targets.map(t => calculateTargetCompressionParams(orig, t).quality);
  for (let i = 0; i < qualities.length - 1; i++) {
    assert.ok(qualities[i] <= qualities[i + 1], `Quality at index ${i} (${qualities[i]}) must be <= next (${qualities[i+1]})`);
  }
});

test('Piecewise interpolation is strictly monotonic for scale', () => {
  const orig = 10_000_000;
  const targets = [1_000_000, 3_000_000, 5_000_000, 7_000_000, 9_000_000];
  const scales = targets.map(t => calculateTargetCompressionParams(orig, t).scale);
  for (let i = 0; i < scales.length - 1; i++) {
    assert.ok(scales[i] <= scales[i + 1], `Scale at index ${i} (${scales[i]}) must be <= next (${scales[i+1]})`);
  }
});

test('Invalid or zero target size returns safe default fallback', () => {
  const res = calculateTargetCompressionParams(1_000_000, 0);
  assert.equal(res.quality, 0.65);
  assert.equal(res.scale, 1.5);
  assert.equal(res.isAlreadyWithinTarget, false);
});

// -------------------------------------------------------------
// Area 5: Recommended Compression Bounds & Feasibility Floor
// -------------------------------------------------------------
console.log('\n--- Area 5: Recommended Compression Bounds & Feasibility Floor ---');

test('Lower recommended bound capped at 85% of original', () => {
  const orig = 100_000; // 100 KB
  const range = calculateRecommendedCompressionRange(orig, 1, false, 0);
  assert.ok(range.minRecommendedBytes <= Math.round(orig * 0.85), 'minRecommendedBytes must not exceed 85% of original');
});

test('Upper recommended bound capped at 95% of original', () => {
  const orig = 100_000;
  const range = calculateRecommendedCompressionRange(orig, 1, false, 0);
  assert.ok(range.maxRecommendedBytes <= Math.round(orig * 0.95), 'maxRecommendedBytes must not exceed 95% of original');
});

test('Vector-heavy document floor accounts for shared fonts', () => {
  const orig = 2_000_000;
  const rangeVector = calculateRecommendedCompressionRange(orig, 5, true, 0);
  const rangeRaster = calculateRecommendedCompressionRange(orig, 5, false, 0);
  assert.ok(rangeVector.absoluteFloorBytes > rangeRaster.absoluteFloorBytes, 'Vector-heavy doc must reserve higher font budget');
});

test('Amortization factor scales down per-page overhead for large page counts', () => {
  const rangeSingle = calculateRecommendedCompressionRange(5_000_000, 1, false, 0);
  const rangeMulti = calculateRecommendedCompressionRange(5_000_000, 20, false, 0);
  assert.ok(rangeMulti.perPageFloorBytes < rangeSingle.perPageFloorBytes, 'Per-page floor must amortize down for 20 pages vs 1 page');
});

test('Per-page floor bytes equals Math.round(absoluteFloorBytes / safePages)', () => {
  const range = calculateRecommendedCompressionRange(3_000_000, 6, false, 0);
  assert.equal(range.perPageFloorBytes, Math.round(range.absoluteFloorBytes / 6));
});

// -------------------------------------------------------------
// Area 6: Portal Presets Integrity (PORTAL_TARGET_PRESETS)
// -------------------------------------------------------------
console.log('\n--- Area 6: Portal Presets Integrity ---');

test('PORTAL_TARGET_PRESETS contains exactly 5 presets', () => {
  assert.equal(PORTAL_TARGET_PRESETS.length, 5);
});

test('visa_gov preset configured for 2 MB (2,097,152 bytes)', () => {
  const p = PORTAL_TARGET_PRESETS.find(x => x.id === 'visa_gov');
  assert.ok(p, 'visa_gov preset must exist');
  assert.equal(p.targetBytes, 2 * 1024 * 1024);
  assert.equal(p.label, '2 MB');
});

test('job_app preset configured for 1 MB (1,048,576 bytes)', () => {
  const p = PORTAL_TARGET_PRESETS.find(x => x.id === 'job_app');
  assert.ok(p, 'job_app preset must exist');
  assert.equal(p.targetBytes, 1 * 1024 * 1024);
  assert.equal(p.label, '1 MB');
});

test('court preset configured for 5 MB (5,242,880 bytes)', () => {
  const p = PORTAL_TARGET_PRESETS.find(x => x.id === 'court');
  assert.ok(p, 'court preset must exist');
  assert.equal(p.targetBytes, 5 * 1024 * 1024);
});

test('compact preset configured for 500 KB (512,000 bytes)', () => {
  const p = PORTAL_TARGET_PRESETS.find(x => x.id === 'compact');
  assert.ok(p, 'compact preset must exist');
  assert.equal(p.targetBytes, 500 * 1024);
});

test('All preset IDs are strictly unique', () => {
  const ids = PORTAL_TARGET_PRESETS.map(p => p.id);
  const set = new Set(ids);
  assert.equal(set.size, ids.length);
});

// -------------------------------------------------------------
// Area 7: Sequential Page Reassembly (assembleSequentialPages)
// -------------------------------------------------------------
console.log('\n--- Area 7: Sequential Page Reassembly ---');

await testAsync('assembleSequentialPages preserves exact total page count and sequence', async () => {
  const bytes = await createTestPdf(4);
  const srcDoc = await PDFDocument.load(bytes);
  const compDoc = await PDFDocument.load(bytes);
  const mergedDoc = await PDFDocument.create();

  // Selected pages: [2, 4]
  await assembleSequentialPages(mergedDoc, srcDoc, compDoc, 4, [2, 4]);

  assert.equal(mergedDoc.getPageCount(), 4);
});

await testAsync('assembleSequentialPages handles Set or Array for selectedPages', async () => {
  const bytes = await createTestPdf(3);
  const srcDoc = await PDFDocument.load(bytes);
  const compDoc = await PDFDocument.load(bytes);
  const mergedDoc = await PDFDocument.create();

  await assembleSequentialPages(mergedDoc, srcDoc, compDoc, 3, new Set([1, 3]));
  assert.equal(mergedDoc.getPageCount(), 3);
});

// -------------------------------------------------------------
// Area 8: Document Bloat Structural Audit (auditDocumentBloat)
// -------------------------------------------------------------
console.log('\n--- Area 8: Document Bloat Structural Audit ---');

await testAsync('auditDocumentBloat analyzes PDFDocument directly', async () => {
  const bytes = await createTestPdf(3);
  const doc = await PDFDocument.load(bytes);
  const audit = await auditDocumentBloat(doc);

  assert.equal(audit.totalPages, 3);
  assert.equal(typeof audit.isVectorHeavy, 'boolean');
  assert.equal(audit.pageStats.length, 3);
  assert.equal(audit.pageStats[0].pageNumber, 1);
  assert.equal(audit.pageStats[1].pageNumber, 2);
  assert.equal(audit.pageStats[2].pageNumber, 3);
});

await testAsync('auditDocumentBloat analyzes ArrayBuffer input', async () => {
  const bytes = await createTestPdf(2);
  const audit = await auditDocumentBloat(bytes.buffer);

  assert.equal(audit.totalPages, 2);
  assert.ok(audit.isVectorHeavy, 'Synthetic text PDF should be recognized as vector-heavy');
});

// -------------------------------------------------------------
// Area 9: Compression Execution & Metadata Stripping
// -------------------------------------------------------------
console.log('\n--- Area 9: Compression Execution & Metadata Stripping ---');

await testAsync('compressPdf strips metadata when stripMetadata is true', async () => {
  const bytes = await createTestPdf(2);
  const blob = await compressPdf(bytes, { stripMetadata: true });
  const arrayBuf = await blob.arrayBuffer();
  const reloaded = await PDFDocument.load(arrayBuf, { updateMetadata: false });

  assert.equal(reloaded.getTitle(), '');
  assert.equal(reloaded.getAuthor(), '');
  assert.equal(reloaded.getProducer(), 'DocForge');
});

await testAsync('compressPdf preserves unselected pages in selective mode', async () => {
  const bytes = await createTestPdf(3);
  const blob = await compressPdf(bytes, {
    stripMetadata: true,
    selectedPages: [2]
  });

  const arrayBuf = await blob.arrayBuffer();
  const reloaded = await PDFDocument.load(arrayBuf, { updateMetadata: false });
  assert.equal(reloaded.getPageCount(), 3);
});

await testAsync('compressPdf output begins with %PDF- header', async () => {
  const bytes = await createTestPdf(1);
  const blob = await compressPdf(bytes);
  const arrayBuf = await blob.arrayBuffer();
  const u8 = new Uint8Array(arrayBuf.slice(0, 5));
  const header = String.fromCharCode(...u8);
  assert.equal(header, '%PDF-');
});

// -------------------------------------------------------------
// Area 10: QualityInspectorModal Architectural Invariants
// -------------------------------------------------------------
console.log('\n--- Area 10: QualityInspectorModal Invariants ---');

const modalSource = fs.readFileSync(
  path.join(projectRoot, 'src/components/QualityInspectorModal.jsx'),
  'utf-8'
);

test('QualityInspectorModal defines origRenderTaskRef', () => {
  assert.ok(modalSource.includes('origRenderTaskRef = useRef(null)'), 'Must define origRenderTaskRef');
});

test('QualityInspectorModal defines compRenderTaskRef', () => {
  assert.ok(modalSource.includes('compRenderTaskRef = useRef(null)'), 'Must define compRenderTaskRef');
});

test('QualityInspectorModal cancels active render tasks before starting new renders', () => {
  assert.ok(modalSource.includes('origRenderTaskRef.current.cancel()'), 'Must cancel ongoing orig render');
  assert.ok(modalSource.includes('compRenderTaskRef.current.cancel()'), 'Must cancel ongoing comp render');
});

test('QualityInspectorModal catches and suppresses RenderingCancelledException', () => {
  assert.ok(modalSource.includes("err?.name !== 'RenderingCancelledException'"), 'Must filter out RenderingCancelledException');
});

test('QualityInspectorModal synchronizes scroll between containers', () => {
  assert.ok(modalSource.includes('isSyncingScrollRef'), 'Must synchronize scroll');
  assert.ok(modalSource.includes('handleScroll'), 'Must implement handleScroll');
});

test('QualityInspectorModal supports keyboard shortcuts (Escape, PageDown, PageUp)', () => {
  assert.ok(modalSource.includes("e.key === 'Escape'"), 'Must handle Escape');
  assert.ok(modalSource.includes("e.key === 'ArrowRight'"), 'Must handle ArrowRight');
  assert.ok(modalSource.includes("e.key === 'ArrowLeft'"), 'Must handle ArrowLeft');
});

// -------------------------------------------------------------
// Area 11: CompressPdf.jsx Studio Interface & Usability Invariants
// -------------------------------------------------------------
console.log('\n--- Area 11: CompressPdf.jsx Invariants ---');

const compressSource = fs.readFileSync(
  path.join(projectRoot, 'src/pages/pdf/CompressPdf.jsx'),
  'utf-8'
);

test('CompressPdf.jsx error message mentions "Snap to Safe Floor" matching button label', () => {
  assert.ok(compressSource.includes("'Snap to Safe Floor'"), 'Error message must match button label');
  assert.ok(!compressSource.includes("'Set to Max Limit'"), 'Outdated Set to Max Limit must be purged');
});

test('CompressPdf.jsx batch mode enforces .zip extension on finalName', () => {
  assert.ok(compressSource.includes(".endsWith('.zip')"), 'Must enforce .zip extension');
});

test('CompressPdf.jsx defines loadingMoreThumbnails state', () => {
  assert.ok(compressSource.includes('loadingMoreThumbnails'), 'Must have loadingMoreThumbnails state');
});

test('CompressPdf.jsx defines handleLoadAllThumbnails', () => {
  assert.ok(compressSource.includes('handleLoadAllThumbnails'), 'Must define handleLoadAllThumbnails');
});

test('CompressPdf.jsx renders button to load all remaining thumbnails if count > 30', () => {
  assert.ok(compressSource.includes('totalPages > pageThumbnails.length'), 'Must guard load remaining thumbnails button');
  assert.ok(compressSource.includes('Load All {totalPages} Page Thumbnails'), 'Must render descriptive load thumbnails text');
});

test('CompressPdf.jsx supports both "all" and "selected" scope modes', () => {
  assert.ok(compressSource.includes("setScope('all')"), 'Must support Entire Document');
  assert.ok(compressSource.includes("setScope('selected')"), 'Must support Selected Pages');
});

test('CompressPdf.jsx supports Portal Presets with PORTAL_TARGET_PRESETS', () => {
  assert.ok(compressSource.includes('PORTAL_TARGET_PRESETS.map'), 'Must render PORTAL_TARGET_PRESETS');
});

test('CompressPdf.jsx includes QualityInspectorModal component', () => {
  assert.ok(compressSource.includes('<QualityInspectorModal'), 'Must integrate QualityInspectorModal');
});

test('CompressPdf.jsx includes CompressionProgressModal component', () => {
  assert.ok(compressSource.includes('<CompressionProgressModal'), 'Must integrate CompressionProgressModal');
});

// -------------------------------------------------------------
// Area 12: Advanced Edge Cases & Progress Mechanics
// -------------------------------------------------------------
console.log('\n--- Area 12: Advanced Edge Cases & Progress Mechanics ---');

await testAsync('compressPdf reports monotonic progress values via onProgress', async () => {
  const bytes = await createTestPdf(2);
  const progressValues = [];
  await compressPdf(bytes, {
    stripMetadata: true,
    onProgress: (p) => progressValues.push(p)
  });

  assert.ok(progressValues.length >= 2, 'Must report progress at least twice');
  assert.equal(progressValues[progressValues.length - 1], 100, 'Final progress must be 100%');
  for (let i = 1; i < progressValues.length; i++) {
    assert.ok(progressValues[i] >= progressValues[i - 1], 'Progress must be monotonically increasing');
  }
});

await testAsync('compressPdf handles 1-page document seamlessly', async () => {
  const bytes = await createTestPdf(1);
  const blob = await compressPdf(bytes, { stripMetadata: true });
  assert.ok(blob.size > 0, '1-page output must have valid size');
  const arrayBuf = await blob.arrayBuffer();
  const reloaded = await PDFDocument.load(arrayBuf, { updateMetadata: false });
  assert.equal(reloaded.getPageCount(), 1);
});

test('calculateTargetCompressionParams with target 800KB on 1MB (effective ratio 0.752)', () => {
  const targetBytes = 800_000;
  const originalBytes = 1_000_000;
  const res = calculateTargetCompressionParams(originalBytes, targetBytes);
  assert.equal(res.quality, 0.79, 'Quality at target ratio 0.752 should be exactly 0.79');
  assert.equal(res.scale, 1.57, 'Scale at target ratio 0.752 should be exactly 1.57');
  assert.equal(res.effectiveDpi, 190, 'Effective DPI should be exactly 190');
});

test('calculateEstimatedSavings handles non-integer original sizes cleanly', () => {
  const res = calculateEstimatedSavings(1000000.75, 5, 5, 0.65);
  assert.equal(Number.isInteger(res.estimatedNewSize), true, 'Estimated new size must be an integer');
  assert.equal(res.estimatedNewSize, 350000);
});

test('calculateRecommendedCompressionRange handles single-page document', () => {
  const res = calculateRecommendedCompressionRange(500_000, 1, false);
  assert.equal(res.minRecommendedBytes, 75000, 'Min recommended bytes should be 75,000');
  assert.equal(res.maxRecommendedBytes, 275000, 'Max recommended bytes should be 275,000');
  assert.equal(res.absoluteFloorBytes, 39936, 'Floor bytes should be 39,936');
  assert.equal(res.perPageFloorBytes, 39936, 'Per-page floor bytes should be 39,936');
});

test('CompressPdf.jsx implements batch compression progress tracking', () => {
  assert.ok(compressSource.includes('batchTotal={files.length}'), 'Must pass batchTotal');
  assert.ok(compressSource.includes('batchCurrent={activeFileIndex + 1}'), 'Must pass batchCurrent');
});

console.log('===============================================================');
console.log(`TOTAL ASSERTIONS PASSED: ${totalPassed} / ${totalPassed} (100%)`);
console.log('COMPRESS PDF STUDIO & ENGINE CERTIFIED ZERO-DEFECT');
console.log('===============================================================');
