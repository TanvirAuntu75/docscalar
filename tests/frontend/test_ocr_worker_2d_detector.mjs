// tests/frontend/test_ocr_worker_2d_detector.mjs
// Automated 35-point Molecular Test Suite for OCR Worker 2D Columnar Detector
// Adheres strictly to Zero-Assumption and Zero-Fake-Assertion rules.

import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.resolve(__dirname, '../../public/workers/ocr.worker.js');
const workerCode = fs.readFileSync(workerPath, 'utf8');

const context = {
  console,
  Math,
  Uint8Array,
  Int32Array,
  Float32Array,
  Array,
  performance,
  self: {}
};
context.self = context;
vm.createContext(context);
vm.runInContext(workerCode, context);

const {
  toGray,
  detectColumns,
  findHorizontalBlocks,
  findBoxes2D,
  findLines,
  uniformBands,
  cropResizeNormalizeToTensor,
  ctcDecode,
  MODEL_H,
  MODEL_W,
  HW_CHARS
} = context.self;

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testNum, description, details = '') {
  if (condition) {
    passed++;
    results.push(`[PASS] Test ${testNum}: ${description}`);
  } else {
    failed++;
    results.push(`[FAIL] Test ${testNum}: ${description} -> ${details}`);
    console.error(`FAILED Assertion ${testNum}: ${description}`, details);
  }
}

console.log('=== STARTING OCR WORKER 2D DETECTOR MOLECULAR TEST SUITE ===');

// Helper to draw text-like rectangular line of dark pixels into RGBA buffer
function drawRectRGBA(buf, w, h, rx0, ry0, rx1, ry1, color = [0, 0, 0, 255]) {
  for (let y = Math.max(0, ry0); y < Math.min(h, ry1); y++) {
    for (let x = Math.max(0, rx0); x < Math.min(w, rx1); x++) {
      const idx = (y * w + x) * 4;
      buf[idx] = color[0];
      buf[idx + 1] = color[1];
      buf[idx + 2] = color[2];
      buf[idx + 3] = color[3];
    }
  }
}

// 1. Grayscale luminance calculation
const sampleRGBA = new Uint8Array([100, 150, 200, 255]);
const sampleGray = toGray(sampleRGBA, 1, 1);
const expectedLuma = Math.round(0.299 * 100 + 0.587 * 150 + 0.114 * 200); // 141
assert(sampleGray[0] === expectedLuma, 1, 'Grayscale luminance formula Math.round(0.299*R + 0.587*G + 0.114*B)', `Got ${sampleGray[0]}, expected ${expectedLuma}`);

// 2. Grayscale boundary clamping
const extremeRGBA = new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]);
const extremeGray = toGray(extremeRGBA, 2, 1);
assert(extremeGray[0] === 255 && extremeGray[1] === 0, 2, 'Grayscale boundary on pure white (255) and black (0)');

// 3. Single-column document: detectColumns returns 1 column
const singleColProj = new Int32Array(800);
for (let x = 50; x < 750; x++) singleColProj[x] = 50; // Continuous text across width
const singleCols = detectColumns(singleColProj, 800, 20, 2);
assert(singleCols.length === 1 && singleCols[0].x0 === 0 && singleCols[0].x1 === 800, 3, 'Single column layout detected as 1 full column [0..800]', `Got ${JSON.stringify(singleCols)}`);

// 4. Multi-column document with central gutter (x=380..420)
const twoColProj = new Int32Array(800);
for (let x = 50; x < 380; x++) twoColProj[x] = 60; // Column 1
// x = 380..420 is 0 (gutter width = 40px)
for (let x = 420; x < 750; x++) twoColProj[x] = 60; // Column 2
const twoCols = detectColumns(twoColProj, 800, 20, 2);
assert(twoCols.length === 2, 4, 'Two column document detected as 2 distinct columns', `Found ${twoCols.length} cols: ${JSON.stringify(twoCols)}`);

// 5. Column boundaries isolate gutter correctly
assert(twoCols[0].x1 <= 385 && twoCols[1].x0 >= 415, 5, 'Two column gutter boundary isolates column 1 from column 2', `Col0 x1=${twoCols[0]?.x1}, Col1 x0=${twoCols[1]?.x0}`);

// 6. Column margin exclusion: left/right margins not treated as internal gutters
const marginProj = new Int32Array(500);
// Left margin x=0..15 is empty, text is x=15..485, right margin 485..500 is empty
for (let x = 15; x < 485; x++) marginProj[x] = 40;
const marginCols = detectColumns(marginProj, 500, 20, 2);
assert(marginCols.length === 1, 6, 'Outer page margins ignored by internal gutter filter', `Got ${marginCols.length} cols`);

// 7. Three-column layout
const threeColProj = new Int32Array(900);
for (let x = 50; x < 280; x++) threeColProj[x] = 40; // Col 1
// gutter 1: 280..310 (30px)
for (let x = 310; x < 580; x++) threeColProj[x] = 40; // Col 2
// gutter 2: 580..610 (30px)
for (let x = 610; x < 850; x++) threeColProj[x] = 40; // Col 3
const threeCols = detectColumns(threeColProj, 900, 20, 2);
assert(threeCols.length === 3, 7, 'Three-column layout detected as 3 distinct columns', `Got ${threeCols.length} cols: ${JSON.stringify(threeCols)}`);

// 8. Horizontal block segmentation: single paragraph
const w = 400, h = 300;
const graySingleBlock = new Uint8Array(w * h).fill(255);
// Draw 3 lines of text at y=20..35, 45..60, 70..85
for (let y = 20; y < 85; y++) {
  for (let x = 30; x < 350; x++) graySingleBlock[y * w + x] = 50;
}
const blocks1 = findHorizontalBlocks(graySingleBlock, w, h, 220, 14);
assert(blocks1.length === 1 && blocks1[0].y0 <= 20 && blocks1[0].y1 >= 85, 8, 'Continuous paragraph segmented as 1 horizontal block', `Got ${JSON.stringify(blocks1)}`);

// 9. Horizontal block segmentation: Header + Body separated by 30px gap
const grayHeaderBody = new Uint8Array(w * h).fill(255);
// Header at y=10..30
for (let y = 10; y < 30; y++) {
  for (let x = 50; x < 350; x++) grayHeaderBody[y * w + x] = 30;
}
// 30px gap at y=30..60
// Body at y=60..150
for (let y = 60; y < 150; y++) {
  for (let x = 50; x < 350; x++) grayHeaderBody[y * w + x] = 30;
}
const blocks2 = findHorizontalBlocks(grayHeaderBody, w, h, 220, 14);
assert(blocks2.length === 2, 9, 'Header + Body with 30px gap segmented into 2 separate blocks', `Got ${blocks2.length} blocks: ${JSON.stringify(blocks2)}`);

// 10. Horizontal block bounds: block 0 ends before block 1 starts
assert(blocks2[0].y1 < blocks2[1].y0, 10, 'Block boundaries strictly non-overlapping (block 0 y1 < block 1 y0)', `Block0 y1=${blocks2[0].y1}, Block1 y0=${blocks2[1].y0}`);

// 11. Empty/solid white page blocks
const grayAllWhite = new Uint8Array(w * h).fill(255);
const blocksWhite = findHorizontalBlocks(grayAllWhite, w, h, 220, 14);
assert(blocksWhite.length === 1 && blocksWhite[0].y0 === 0 && blocksWhite[0].y1 === h, 11, 'All-white page returns full-height block fallback');

// 12. Two-column document 2D boxes extraction
const docW = 800, docH = 600;
const rgba2Col = new Uint8Array(docW * docH * 4).fill(255);
// Column 1: two lines at y=50..70 and y=100..120, x=50..350
drawRectRGBA(rgba2Col, docW, docH, 50, 50, 350, 70);
drawRectRGBA(rgba2Col, docW, docH, 50, 100, 350, 120);
// Column 2: two lines at y=50..70 and y=100..120, x=450..750
drawRectRGBA(rgba2Col, docW, docH, 450, 50, 750, 70);
drawRectRGBA(rgba2Col, docW, docH, 450, 100, 750, 120);
const gray2Col = toGray(rgba2Col, docW, docH);
const boxes2Col = findBoxes2D(gray2Col, docW, docH);
assert(boxes2Col.length === 4, 12, 'Two-column document extracts 4 separate text boxes (2 per column)', `Found ${boxes2Col.length} boxes`);

// 13. Column 1 boxes NOT horizontally merged with Column 2 boxes
const col1Boxes = boxes2Col.filter(b => b.x1 <= 400);
const col2Boxes = boxes2Col.filter(b => b.x0 >= 400);
assert(col1Boxes.length === 2 && col2Boxes.length === 2, 13, 'Column 1 and Column 2 lines are strictly decoupled horizontally (no merged lines across gutter)', `Col1 count: ${col1Boxes.length}, Col2 count: ${col2Boxes.length}`);

// 14. Reading order: Column 1 boxes appear BEFORE Column 2 boxes
const firstColIdx = boxes2Col[0].colIndex;
const thirdColIdx = boxes2Col[2].colIndex;
assert(firstColIdx === 0 && thirdColIdx === 1, 14, 'Natural reading order: Column 0 precedes Column 1', `First colIdx: ${firstColIdx}, Third colIdx: ${thirdColIdx}`);

// 15. Header + Two Column layout reading order
const rgbaHeader2Col = new Uint8Array(docW * docH * 4).fill(255);
// Header at y=20..40, x=50..750 (spanning across the entire width!)
drawRectRGBA(rgbaHeader2Col, docW, docH, 50, 20, 750, 40);
// Gap at y=40..70
// Column 1 at y=80..100, x=50..350
drawRectRGBA(rgbaHeader2Col, docW, docH, 50, 80, 350, 100);
// Column 2 at y=80..100, x=450..750
drawRectRGBA(rgbaHeader2Col, docW, docH, 450, 80, 750, 100);
const grayHeader2Col = toGray(rgbaHeader2Col, docW, docH);
const boxesHeader2Col = findBoxes2D(grayHeader2Col, docW, docH);
assert(boxesHeader2Col.length === 3, 15, 'Header + 2-Column layout finds 3 boxes (1 header, 2 column lines)', `Found ${boxesHeader2Col.length} boxes`);

// 16. Header box is index 0 and has wide span across both columns
assert(boxesHeader2Col[0].y0 < 50 && boxesHeader2Col[0].x1 > 700, 16, 'Header box is ordered first and spans full width (>700px)', `Header box: ${JSON.stringify(boxesHeader2Col[0])}`);

// 17. Atomic precision: Bounding box coordinates verify x1 > x0 and y1 > y0
const allValidCoords = boxesHeader2Col.every(b => b.x1 > b.x0 && b.y1 > b.y0 && b.x0 >= 0 && b.x1 <= docW && b.y0 >= 0 && b.y1 <= docH);
assert(allValidCoords, 17, 'All bounding boxes strictly satisfy 0 <= x0 < x1 <= W and 0 <= y0 < y1 <= H');

// 18. Noise suppression: 2x2 speckle does not generate a box
const rgbaNoise = new Uint8Array(docW * docH * 4).fill(255);
drawRectRGBA(rgbaNoise, docW, docH, 100, 100, 102, 102); // Only 4 dark pixels
const grayNoise = toGray(rgbaNoise, docW, docH);
const boxesNoise = findBoxes2D(grayNoise, docW, docH);
assert(boxesNoise.length === 0, 18, 'Isolated 2x2 noise speckle filtered out by minBoxW/darkCount threshold');

// 19. Solid white page: findBoxes2D returns 0 boxes
const boxesWhite = findBoxes2D(grayAllWhite, w, h);
assert(boxesWhite.length === 0, 19, 'Solid white page returns 0 boxes (triggers fallback)');

// 20. Fallback uniformBands generation
const fallbackBands = uniformBands(grayAllWhite, w, h, 10);
// Solid white has no dark pixels, uniformBands skips bands with dark <= 5
assert(Array.isArray(fallbackBands), 20, 'uniformBands returns valid array on empty page');

// 21. Backward compatibility: findLines wrapper
const linesWrapper = findLines(gray2Col, docW, docH);
assert(linesWrapper.length === boxes2Col.length && linesWrapper[0].x0 === boxes2Col[0].x0, 21, 'findLines wrapper returns identical output to findBoxes2D');

// 22. Legacy crop signature cropResizeNormalizeToTensor(rgba, pageW, y0, y1)
const legacyTensor = cropResizeNormalizeToTensor(rgba2Col, docW, 50, 70);
assert(legacyTensor.dims[0] === 1 && legacyTensor.dims[1] === 3 && legacyTensor.dims[2] === MODEL_H && legacyTensor.dims[3] === MODEL_W, 22, 'Legacy 4-arg crop produces exact tensor dims [1, 3, 48, 320]', `Dims: ${legacyTensor.dims}`);

// 23. 2D box crop signature cropResizeNormalizeToTensor(rgba, pageW, x0, y0, x1, y1)
const boxTensor = cropResizeNormalizeToTensor(rgba2Col, docW, 50, 50, 350, 70);
assert(boxTensor.dims[0] === 1 && boxTensor.dims[1] === 3 && boxTensor.dims[2] === MODEL_H && boxTensor.dims[3] === MODEL_W, 23, '2D 6-arg crop produces exact tensor dims [1, 3, 48, 320]', `Dims: ${boxTensor.dims}`);

// 24. Tensor total buffer size calculation: 1 * 3 * 48 * 320 = 46080 floats
assert(boxTensor.data.length === 3 * MODEL_H * MODEL_W, 24, 'Tensor buffer length exactly matches 3 * 48 * 320 = 46080 floats', `Length: ${boxTensor.data.length}`);

// 25. Normalization formula: black pixel normalizes to -1.0
// In rgba2Col, at x=60, y=55 the pixel was drawn black (0, 0, 0)
// (0 / 127.5) - 1.0 = -1.0
const blackVal = boxTensor.data[0]; // Channel 0 (Blue) at (0, 0)
assert(Math.abs(blackVal - (-1.0)) < 0.05, 25, 'Black pixel correctly normalized to ~ -1.0', `Got ${blackVal}`);

// 26. Tensor right padding: pixels beyond scaledW filled with 1.0 (pure white)
// For sW = 300, sH = 20: scaledW = min(320, round(300 * 48 / 20)) = 320
// Let's test a very short box: sW = 40, sH = 40 -> scaledW = 48
const shortTensor = cropResizeNormalizeToTensor(rgba2Col, docW, 50, 50, 90, 90);
const padVal = shortTensor.data[319]; // Far right edge in row 0
assert(Math.abs(padVal - 1.0) < 0.001, 26, 'Right edge padding in tensor buffer is pure white (1.0)', `Got ${padVal}`);

// 27. Planar channel ordering: Red, Green, Blue offsets
const lenR = MODEL_H * MODEL_W;
const blueSample = shortTensor.data[0];
const greenSample = shortTensor.data[lenR];
const redSample = shortTensor.data[2 * lenR];
assert(!isNaN(blueSample) && !isNaN(greenSample) && !isNaN(redSample), 27, 'All 3 planar channels (B, G, R) populated without NaN');

// 28. CTC Decode: Empty sequence handling
const emptyDec = ctcDecode(new Float32Array(0), [0, 10], ['a', 'b']);
assert(emptyDec.text === '' && emptyDec.conf === 0, 28, 'ctcDecode on empty sequence returns empty string and 0 confidence');

// 29. CTC Decode: Repeated characters collapse when no blank token
// 3 timesteps, vocab size 3: [blank(0), 'A'(1), 'B'(2)]
// Step 0: 'A' (idx 1), Step 1: 'A' (idx 1), Step 2: 'B' (idx 2)
// CTC collapse rule: AA -> A, then B -> text should be "AB"
const logitsSeq1 = new Float32Array([
  0, 10, 0,  // t=0 -> 'A'
  0, 10, 0,  // t=1 -> 'A'
  0, 0, 10   // t=2 -> 'B'
]);
const dec1 = ctcDecode(logitsSeq1, [3, 3], ['A', 'B']);
assert(dec1.text === 'AB', 29, 'ctcDecode collapses consecutive duplicate characters (AA -> A)', `Got "${dec1.text}"`);

// 30. CTC Decode: Repeated characters preserved when separated by blank token
// Step 0: 'A' (idx 1), Step 1: blank (idx 0), Step 2: 'A' (idx 1) -> text should be "AA"
const logitsSeq2 = new Float32Array([
  0, 10, 0,  // t=0 -> 'A'
  10, 0, 0,  // t=1 -> blank
  0, 10, 0   // t=2 -> 'A'
]);
const dec2 = ctcDecode(logitsSeq2, [3, 3], ['A', 'B']);
assert(dec2.text === 'AA', 30, 'ctcDecode preserves duplicate characters separated by blank token (A_A -> AA)', `Got "${dec2.text}"`);

// 31. CTC Decode: Vocabulary indexing parity (mi - 1)
// Step 0: idx 2 -> vocab[2-1] = 'B'
const logitsSeq3 = new Float32Array([
  0, 0, 15
]);
const dec3 = ctcDecode(logitsSeq3, [1, 3], ['A', 'B']);
assert(dec3.text === 'B', 31, 'ctcDecode correctly maps 1-based token index to vocabulary character', `Got "${dec3.text}"`);

// 32. CTC Decode: Exact confidence formula calculation
// Confidence is mean of max logit values: (10 + 10 + 10) / 3 = 10.0
assert(Math.abs(dec1.conf - 10.0) < 0.001, 32, 'ctcDecode confidence formula computes exact mean of max logits', `Got ${dec1.conf}`);

// 33. Multi-line stress test: 5 lines in column 1 and 5 lines in column 2
const multiW = 800, multiH = 800;
const multiRGBA = new Uint8Array(multiW * multiH * 4).fill(255);
for (let i = 0; i < 5; i++) {
  const yStart = 50 + i * 50;
  drawRectRGBA(multiRGBA, multiW, multiH, 50, yStart, 350, yStart + 20);      // Col 1
  drawRectRGBA(multiRGBA, multiW, multiH, 450, yStart, 750, yStart + 20);     // Col 2
}
const multiGray = toGray(multiRGBA, multiW, multiH);
const multiBoxes = findBoxes2D(multiGray, multiW, multiH);
assert(multiBoxes.length === 10, 33, '10-line 2-column stress test extracts exactly 10 non-overlapping boxes', `Found ${multiBoxes.length} boxes`);

// 34. Robustness to invalid / zero dimensions
const emptyBoxes = findBoxes2D(new Uint8Array(0), 0, 0);
assert(Array.isArray(emptyBoxes) && emptyBoxes.length === 0, 34, 'findBoxes2D on 0x0 buffer safely returns empty array without throwing');

// 35. Gutter threshold resilience: gutter with isolated 1-pixel noise preserved
const noisyGutterProj = new Int32Array(600);
for (let x = 50; x < 280; x++) noisyGutterProj[x] = 50;
// Gutter from 280 to 320 (40px wide) with single 1px speckle at x=300
noisyGutterProj[300] = 1;
for (let x = 320; x < 550; x++) noisyGutterProj[x] = 50;
const noisyCols = detectColumns(noisyGutterProj, 600, 20, 2);
assert(noisyCols.length === 2, 35, 'Gutter detection resilient to 1px noise within gutter valley', `Got ${noisyCols.length} cols`);

console.log(`\n======================================================`);
results.forEach(r => console.log(r));
console.log(`======================================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
console.log(`======================================================`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
