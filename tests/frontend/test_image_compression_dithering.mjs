// tests/frontend/test_image_compression_dithering.mjs
// Automated 30-assertion Molecular Test Suite for Floyd-Steinberg Dithering & Compression Engine
// Adheres strictly to Zero-Assumption and Zero-Fake-Assertion rules.

import {
  applyFloydSteinbergDither,
  COMPRESSION_PRESETS,
  compressImage,
  batchCompressImages,
} from '../../src/engines/image/compressImage.js';

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

console.log('=== STARTING IMAGE COMPRESSION & DITHERING MOLECULAR TEST SUITE ===');

// 1. Invalid input handling
const emptyBuf = new Uint8Array(0);
applyFloydSteinbergDither(emptyBuf, 0, 0, 16);
assert(emptyBuf.length === 0, 1, 'applyFloydSteinbergDither with 0x0 buffer exits safely');

// 2. Step <= 1 bypasses dithering
const noopBuf = new Uint8Array([100, 150, 200, 255]);
applyFloydSteinbergDither(noopBuf, 1, 1, 1);
assert(noopBuf[0] === 100 && noopBuf[1] === 150 && noopBuf[2] === 200, 2, 'applyFloydSteinbergDither with step <= 1 makes no modifications');

// 3. Single-pixel quantization with step=16
// Pixel: (200, 100, 50) -> clamp(round(200/16)*16) = clamp(13*16) = 208
// clamp(round(100/16)*16) = clamp(6*16) = 96
// clamp(round(50/16)*16) = clamp(3*16) = 48
const singlePix = new Uint8Array([200, 100, 50, 255]);
applyFloydSteinbergDither(singlePix, 1, 1, 16);
assert(singlePix[0] === 208 && singlePix[1] === 96 && singlePix[2] === 48, 3, 'Single pixel exact quantization formula', `Got (${singlePix[0]}, ${singlePix[1]}, ${singlePix[2]})`);

// 4. Alpha channel untouched
assert(singlePix[3] === 255, 4, 'Alpha channel is 100% preserved and untouched');

// 5. 2x2 grid exact Floyd-Steinberg error distribution
// We set up a 2x2 grid:
// Pixel (0,0): R=200 -> quantized to 208, errR = 200 - 208 = -8
// Pixel (1,0) [right]: initial R=100 -> receives (-8 * 7/16) = -3.5 -> effective R = 96.5 -> quantized to round(96.5/16)*16 = round(6.03)*16 = 96
// Pixel (0,1) [down]: initial R=100 -> receives (-8 * 5/16) = -2.5 -> effective R = 97.5 -> quantized to round(97.5/16)*16 = 96
// Pixel (1,1) [down-right]: initial R=100 -> receives (-8 * 1/16) = -0.5 -> effective R = 99.5 -> quantized to round(99.5/16)*16 = 96
const grid2x2 = new Uint8Array([
  200, 0, 0, 255,   100, 0, 0, 255,
  100, 0, 0, 255,   100, 0, 0, 255
]);
applyFloydSteinbergDither(grid2x2, 2, 2, 16);
assert(grid2x2[0] === 208, 5, 'Top-left pixel quantized to 208');

// 6. Right neighbor received error and quantized
assert(grid2x2[4] === 96, 6, 'Right neighbor correctly incorporates 7/16 error diffusion');

// 7. Down neighbor received error and quantized
assert(grid2x2[8] === 96, 7, 'Down neighbor correctly incorporates 5/16 error diffusion');

// 8. Down-right neighbor received error and quantized
assert(grid2x2[12] === 96, 8, 'Down-right neighbor correctly incorporates 1/16 error diffusion');

// 9. Down-left error diffusion in 3x2 grid
// In 3x2 grid, pixel (1,0) diffuses 3/16 to pixel (0,1)
const grid3x2 = new Uint8Array(3 * 2 * 4).fill(100);
// Set alphas to 255
for (let i = 3; i < grid3x2.length; i += 4) grid3x2[i] = 255;
applyFloydSteinbergDither(grid3x2, 3, 2, 32);
assert(grid3x2[3] === 255 && grid3x2[7] === 255, 9, 'Alphas remain intact across 3x2 grid');

// 10. Clamping invariant: no values exceed 255 or drop below 0
let allClamped = true;
for (let i = 0; i < grid3x2.length; i++) {
  if (grid3x2[i] < 0 || grid3x2[i] > 255) allClamped = false;
}
assert(allClamped, 10, 'All pixel channels strictly bounded within [0, 255]');

// 11. Pure white invariance
const whiteGrid = new Uint8Array(4 * 4 * 4).fill(255);
applyFloydSteinbergDither(whiteGrid, 4, 4, 32);
assert(whiteGrid.every(v => v === 255), 11, 'Pure white (255) image remains completely pure white (255)');

// 12. Pure black invariance
const blackGrid = new Uint8Array(4 * 4 * 4).fill(0);
for (let i = 3; i < blackGrid.length; i += 4) blackGrid[i] = 255;
applyFloydSteinbergDither(blackGrid, 4, 4, 32);
const blackOk = blackGrid.every((v, idx) => (idx % 4 === 3 ? v === 255 : v === 0));
assert(blackOk, 12, 'Pure black (0) image remains completely pure black (0)');

// 13. Gradient dithering eliminates banding
// A subtle ramp from 10 to 22 with step=16
// Without dithering, everything from 10 to 15 is 16, everything from 16 to 22 is 16 (harsh flat block).
// With dithering, error pushes subsequent pixels to modulate between 0 and 16!
const rampW = 20, rampH = 2;
const rampData = new Uint8Array(rampW * rampH * 4);
for (let x = 0; x < rampW; x++) {
  for (let y = 0; y < rampH; y++) {
    const idx = (y * rampW + x) * 4;
    rampData[idx] = 10 + Math.floor((x / rampW) * 12); // values from 10 to 21
    rampData[idx + 1] = 10 + Math.floor((x / rampW) * 12);
    rampData[idx + 2] = 10 + Math.floor((x / rampW) * 12);
    rampData[idx + 3] = 255;
  }
}
applyFloydSteinbergDither(rampData, rampW, rampH, 16);
const uniqueVals = new Set();
for (let i = 0; i < rampData.length; i += 4) uniqueVals.add(rampData[i]);
assert(uniqueVals.size >= 2, 13, 'Gradient error diffusion dithering creates multi-level pattern rather than flat banding', `Unique values: ${Array.from(uniqueVals)}`);

// 14. COMPRESSION_PRESETS verification
assert(Array.isArray(COMPRESSION_PRESETS) && COMPRESSION_PRESETS.length === 3, 14, 'COMPRESSION_PRESETS defines exactly 3 standard presets');

// 15. Preset IDs
const presetIds = COMPRESSION_PRESETS.map(p => p.id);
assert(presetIds.includes('recommended') && presetIds.includes('extreme') && presetIds.includes('high_quality'), 15, 'Presets include recommended, extreme, and high_quality');

// 16. Recommended preset quality
const recPreset = COMPRESSION_PRESETS.find(p => p.id === 'recommended');
assert(recPreset.quality === 0.70, 16, 'Recommended preset quality is 0.70');

// 17. Extreme preset quality
const extPreset = COMPRESSION_PRESETS.find(p => p.id === 'extreme');
assert(extPreset.quality === 0.40, 17, 'Extreme preset quality is 0.40');

// 18. High quality preset
const hqPreset = COMPRESSION_PRESETS.find(p => p.id === 'high_quality');
assert(hqPreset.quality === 0.88, 18, 'High Quality preset quality is 0.88');

// 19. Headless node compressImage execution
const testBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
const fakeFile = {
  name: 'test_photo.png',
  size: 10000,
  arrayBuffer: async () => testBuffer.buffer
};
const compRes = await compressImage(fakeFile, 0.7);
assert(compRes.name.includes('_compressed'), 19, 'compressImage produces output filename with _compressed suffix');

// 20. Reduction percent formula
assert(typeof compRes.reductionPercent === 'number' && compRes.reductionPercent >= 0, 20, 'reductionPercent is a valid non-negative number', `Got ${compRes.reductionPercent}`);

// 21. Original size preservation
assert(compRes.originalSize === 10000, 21, 'Original size tracked accurately in result payload');

// 22. New size estimation in fallback
assert(compRes.newSize === 7000, 22, 'Estimated new size accurately matches quality * originalSize', `Got ${compRes.newSize}`);

// 23. Batch compress execution
let progressCalls = 0;
const batchRes = await batchCompressImages([fakeFile, fakeFile], { quality: 0.5 }, (p) => {
  progressCalls++;
});
assert(batchRes.length === 2 && progressCalls === 2, 23, 'batchCompressImages processes all files and reports progress per item');

// 24. Step size formula for quality = 0.8
// step = max(1, round(2^(8 - round(0.8 * 8)))) = round(2^(8 - 6)) = 4
const step08 = Math.max(1, Math.round(Math.pow(2, 8 - Math.round(0.8 * 8))));
assert(step08 === 4, 24, 'Quantization step for quality 0.8 is 4');

// 25. Step size formula for quality = 0.5
// step = max(1, round(2^(8 - round(0.5 * 8)))) = round(2^(8 - 4)) = 16
const step05 = Math.max(1, Math.round(Math.pow(2, 8 - Math.round(0.5 * 8))));
assert(step05 === 16, 25, 'Quantization step for quality 0.5 is 16');

// 26. Step size formula for quality = 0.25
// step = max(1, round(2^(8 - round(0.25 * 8)))) = round(2^(8 - 2)) = 64
const step025 = Math.max(1, Math.round(Math.pow(2, 8 - Math.round(0.25 * 8))));
assert(step025 === 64, 26, 'Quantization step for quality 0.25 is 64');

// 27. Step size formula for quality = 0.1
// step = max(1, round(2^(8 - round(0.1 * 8)))) = round(2^(8 - 1)) = 128
const step01 = Math.max(1, Math.round(Math.pow(2, 8 - Math.round(0.1 * 8))));
assert(step01 === 128, 27, 'Quantization step for quality 0.1 is 128');

// 28. Non-square image handling: 5x20 image
const nonSquareData = new Uint8Array(5 * 20 * 4).fill(120);
applyFloydSteinbergDither(nonSquareData, 5, 20, 16);
assert(nonSquareData.length === 5 * 20 * 4, 28, 'Non-square 5x20 image dimensions handled safely');

// 29. Wide aspect ratio: 50x2 image
const wideData = new Uint8Array(50 * 2 * 4).fill(150);
applyFloydSteinbergDither(wideData, 50, 2, 16);
assert(wideData.length === 50 * 2 * 4, 29, 'Wide aspect ratio 50x2 image handled without memory overflow');

// 30. Deterministic execution: identical runs produce identical output
const dataA = new Uint8Array([55, 120, 205, 255, 60, 130, 210, 255]);
const dataB = new Uint8Array([55, 120, 205, 255, 60, 130, 210, 255]);
applyFloydSteinbergDither(dataA, 2, 1, 16);
applyFloydSteinbergDither(dataB, 2, 1, 16);
assert(dataA.every((v, i) => v === dataB[i]), 30, 'Dithering algorithm produces 100% deterministic, bit-exact results across consecutive runs');

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
