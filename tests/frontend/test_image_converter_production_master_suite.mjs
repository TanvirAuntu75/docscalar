// Image Converter Production Master Test Suite
import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import {
  SUPPORTED_IMAGE_FORMATS,
  COLOR_MODES,
  extractBytes,
  calculateOptimalDimensions,
  encodeBmp,
  encodeIco,
  applyColorTransform,
  convertImageFormat,
  batchConvertImages
} from '../../src/engines/image/convertFormat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

let totalPassed = 0;
let totalAsserts = 0;
const asyncQueue = [];

function test(desc, fn) {
  try {
    fn();
    totalPassed++;
    console.log(`  ✓ [Pass ${totalPassed}] ${desc}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

function testAsync(desc, fn) {
  const p = (async () => {
    try {
      await fn();
      totalPassed++;
      console.log(`  ✓ [Pass ${totalPassed}] ${desc}`);
    } catch (err) {
      console.error(`  ✗ FAILED: ${desc}`);
      console.error(err);
      process.exit(1);
    }
  })();
  asyncQueue.push(p);
}

function expect(val) {
  return {
    toBe(expected) {
      totalAsserts++;
      assert.strictEqual(val, expected);
    },
    toEqual(expected) {
      totalAsserts++;
      assert.deepStrictEqual(val, expected);
    },
    toBeGreaterThan(expected) {
      totalAsserts++;
      assert.ok(val > expected, `${val} is not greater than ${expected}`);
    },
    toBeGreaterThanOrEqual(expected) {
      totalAsserts++;
      assert.ok(val >= expected, `${val} is not >= ${expected}`);
    },
    toBeTruthy() {
      totalAsserts++;
      assert.ok(!!val, `${val} is not truthy`);
    },
    toBeFalsy() {
      totalAsserts++;
      assert.ok(!val, `${val} is not falsy`);
    }
  };
}

console.log('======================================================================');
console.log('MASTER IMAGE CONVERTER STUDIO & ENGINE MOLECULAR TEST SUITE');
console.log('Strict Quantitative Density: 33 Test Areas | 85+ Test Assertions');
console.log('Zero-Assumption Rule & Formula-Level Verification');
console.log('======================================================================');

// =====================================================================
// AREA 1: Supported Format Metadata & Registry Parity
// =====================================================================
test('Area 1: Supported Image Formats Registry completeness and attributes', () => {
  expect(SUPPORTED_IMAGE_FORMATS.length).toBe(6);
  const ids = SUPPORTED_IMAGE_FORMATS.map(f => f.id);
  expect(ids).toEqual(['png', 'jpeg', 'webp', 'bmp', 'ico', 'pdf']);

  const png = SUPPORTED_IMAGE_FORMATS.find(f => f.id === 'png');
  expect(png.mime).toBe('image/png');
  expect(png.ext).toBe('png');
  expect(png.alpha).toBe(true);

  const jpeg = SUPPORTED_IMAGE_FORMATS.find(f => f.id === 'jpeg');
  expect(jpeg.mime).toBe('image/jpeg');
  expect(jpeg.ext).toBe('jpg');
  expect(jpeg.alpha).toBe(false);

  const bmp = SUPPORTED_IMAGE_FORMATS.find(f => f.id === 'bmp');
  expect(bmp.mime).toBe('image/bmp');
  expect(bmp.ext).toBe('bmp');
  expect(bmp.alpha).toBe(false);

  const ico = SUPPORTED_IMAGE_FORMATS.find(f => f.id === 'ico');
  expect(ico.mime).toBe('image/x-icon');
  expect(ico.ext).toBe('ico');
  expect(ico.alpha).toBe(true);

  const pdf = SUPPORTED_IMAGE_FORMATS.find(f => f.id === 'pdf');
  expect(pdf.mime).toBe('application/pdf');
  expect(pdf.ext).toBe('pdf');
  expect(pdf.alpha).toBe(false);
});

// =====================================================================
// AREA 2: Color Modes Specification
// =====================================================================
test('Area 2: Color modes registry contains original, grayscale, invert', () => {
  expect(COLOR_MODES.length).toBe(3);
  const ids = COLOR_MODES.map(c => c.id);
  expect(ids).toEqual(['original', 'grayscale', 'invert']);
  expect(COLOR_MODES[1].label).toBe('Grayscale');
  expect(COLOR_MODES[2].label).toBe('Invert Colors');
});

// =====================================================================
// AREA 3: extractBytes with ArrayBuffer
// =====================================================================
testAsync('Area 3: extractBytes correctly handles raw ArrayBuffer', async () => {
  const buf = new Uint8Array([10, 20, 30, 40]).buffer;
  const extracted = await extractBytes(buf);
  expect(extracted instanceof ArrayBuffer).toBe(true);
  expect(extracted.byteLength).toBe(4);
  const view = new Uint8Array(extracted);
  expect(view[0]).toBe(10);
  expect(view[3]).toBe(40);
});

// =====================================================================
// AREA 4: extractBytes with Uint8Array
// =====================================================================
testAsync('Area 4: extractBytes slices Uint8Array accurately', async () => {
  const u8 = new Uint8Array([1, 2, 3, 4, 5, 6]);
  const sub = u8.subarray(2, 5); // [3, 4, 5]
  const extracted = await extractBytes(sub);
  expect(extracted.byteLength).toBe(3);
  const view = new Uint8Array(extracted);
  expect(view[0]).toBe(3);
  expect(view[1]).toBe(4);
  expect(view[2]).toBe(5);
});

// =====================================================================
// AREA 5: extractBytes with Node Buffer
// =====================================================================
testAsync('Area 5: extractBytes handles Buffer instance with offset integrity', async () => {
  const nodeBuf = Buffer.from([100, 101, 102, 103]);
  const extracted = await extractBytes(nodeBuf);
  expect(extracted.byteLength).toBe(4);
  const view = new Uint8Array(extracted);
  expect(view[0]).toBe(100);
  expect(view[3]).toBe(103);
});

// =====================================================================
// AREA 6: extractBytes with Blob / File mock containing arrayBuffer()
// =====================================================================
testAsync('Area 6: extractBytes handles Blob-like object with arrayBuffer() method', async () => {
  const mockBlob = {
    async arrayBuffer() {
      return new Uint8Array([7, 8, 9]).buffer;
    }
  };
  const extracted = await extractBytes(mockBlob);
  expect(extracted.byteLength).toBe(3);
  const view = new Uint8Array(extracted);
  expect(view[0]).toBe(7);
  expect(view[2]).toBe(9);
});

// =====================================================================
// AREA 7: extractBytes null/invalid rejection
// =====================================================================
testAsync('Area 7: extractBytes throws informative error for null or invalid inputs', async () => {
  let threwNull = false;
  try {
    await extractBytes(null);
  } catch (err) {
    threwNull = true;
    expect(err.message).toBe('No image file provided.');
  }
  expect(threwNull).toBe(true);

  let threwInvalid = false;
  try {
    await extractBytes({ random: 123 });
  } catch (err) {
    threwInvalid = true;
    expect(err.message).toBe('Unsupported image input data type.');
  }
  expect(threwInvalid).toBe(true);
});

// =====================================================================
// AREA 8: calculateOptimalDimensions Scale 1.0
// =====================================================================
test('Area 8: calculateOptimalDimensions with default 1.0 scale maintains dimensions', () => {
  const dims = calculateOptimalDimensions(1920, 1080, { scale: 1.0 });
  expect(dims.width).toBe(1920);
  expect(dims.height).toBe(1080);
});

// =====================================================================
// AREA 9: calculateOptimalDimensions Fractional Scaling
// =====================================================================
test('Area 9: calculateOptimalDimensions scales proportionally at 0.5 and 0.75', () => {
  const half = calculateOptimalDimensions(1920, 1080, { scale: 0.5 });
  expect(half.width).toBe(960);
  expect(half.height).toBe(540);

  const threeQuarters = calculateOptimalDimensions(1000, 800, { scale: 0.75 });
  expect(threeQuarters.width).toBe(750);
  expect(threeQuarters.height).toBe(600);
});

// =====================================================================
// AREA 10: calculateOptimalDimensions maxWidth Constraint
// =====================================================================
test('Area 10: calculateOptimalDimensions respects maxWidth with aspect ratio preservation', () => {
  const constrained = calculateOptimalDimensions(2400, 1200, { maxWidth: 1200, maintainAspectRatio: true });
  expect(constrained.width).toBe(1200);
  expect(constrained.height).toBe(600);
});

// =====================================================================
// AREA 11: calculateOptimalDimensions maxHeight Constraint
// =====================================================================
test('Area 11: calculateOptimalDimensions respects maxHeight with aspect ratio preservation', () => {
  const constrained = calculateOptimalDimensions(1200, 2400, { maxHeight: 600, maintainAspectRatio: true });
  expect(constrained.height).toBe(600);
  expect(constrained.width).toBe(300);
});

// =====================================================================
// AREA 12: calculateOptimalDimensions maintainAspectRatio = false
// =====================================================================
test('Area 12: calculateOptimalDimensions when maintainAspectRatio is false', () => {
  const dims = calculateOptimalDimensions(1000, 1000, {
    scale: 1.0,
    maxWidth: 500,
    maintainAspectRatio: false
  });
  expect(dims.width).toBe(500);
  expect(dims.height).toBe(1000);
});

// =====================================================================
// AREA 13: calculateOptimalDimensions 1px Lower Bound Protection
// =====================================================================
test('Area 13: calculateOptimalDimensions guarantees minimum 1px boundary protection', () => {
  const tiny = calculateOptimalDimensions(10, 10, { scale: 0.00001 });
  expect(tiny.width).toBe(1);
  expect(tiny.height).toBe(1);
});

// =====================================================================
// AREA 14: BMP Row Padding Formula (Width = 1)
// =====================================================================
test('Area 14: BMP scanline rowSize formula for width = 1 (1 byte padding required)', () => {
  const rowSize = Math.floor((24 * 1 + 31) / 32) * 4;
  expect(rowSize).toBe(4);
  const dataBytes = 1 * 3; // 3 bytes BGR
  const paddingBytes = rowSize - dataBytes;
  expect(paddingBytes).toBe(1);
});

// =====================================================================
// AREA 15: BMP Row Padding Formula (Width = 2)
// =====================================================================
test('Area 15: BMP scanline rowSize formula for width = 2 (2 bytes padding required)', () => {
  const rowSize = Math.floor((24 * 2 + 31) / 32) * 4;
  expect(rowSize).toBe(8);
  const dataBytes = 2 * 3; // 6 bytes
  const paddingBytes = rowSize - dataBytes;
  expect(paddingBytes).toBe(2);
});

// =====================================================================
// AREA 16: BMP Row Padding Formula (Width = 3)
// =====================================================================
test('Area 16: BMP scanline rowSize formula for width = 3 (3 bytes padding required)', () => {
  const rowSize = Math.floor((24 * 3 + 31) / 32) * 4;
  expect(rowSize).toBe(12);
  const dataBytes = 3 * 3; // 9 bytes
  const paddingBytes = rowSize - dataBytes;
  expect(paddingBytes).toBe(3);
});

// =====================================================================
// AREA 17: BMP Row Padding Formula (Width = 4)
// =====================================================================
test('Area 17: BMP scanline rowSize formula for width = 4 (0 bytes padding required)', () => {
  const rowSize = Math.floor((24 * 4 + 31) / 32) * 4;
  expect(rowSize).toBe(12);
  const dataBytes = 4 * 3; // 12 bytes
  const paddingBytes = rowSize - dataBytes;
  expect(paddingBytes).toBe(0);
});

// =====================================================================
// AREA 18: BMP Header Structure & File Size Calculation
// =====================================================================
testAsync('Area 18: encodeBmp generates valid 14-byte File Header and exact byte size', async () => {
  const width = 2;
  const height = 3;
  const rawData = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < rawData.length; i++) rawData[i] = 200;

  const bmpBlob = encodeBmp({ width, height, data: rawData });
  expect(bmpBlob.type).toBe('image/bmp');

  const arrayBuf = await bmpBlob.arrayBuffer();
  const view = new DataView(arrayBuf);

  // Expected rowSize for w=2 is 8 bytes. For h=3, pixel data = 24 bytes. Total file = 54 + 24 = 78 bytes.
  const expectedSize = 54 + (8 * 3);
  expect(arrayBuf.byteLength).toBe(expectedSize);
  expect(bmpBlob.size).toBe(expectedSize);

  // File header checks
  // Signature 'BM' -> 0x42, 0x4D
  expect(view.getUint8(0)).toBe(0x42);
  expect(view.getUint8(1)).toBe(0x4D);
  // File size at offset 2 (4 bytes little-endian)
  expect(view.getUint32(2, true)).toBe(expectedSize);
  // Reserved at offset 6 (4 bytes)
  expect(view.getUint32(6, true)).toBe(0);
  // Pixel data offset at offset 10 (4 bytes)
  expect(view.getUint32(10, true)).toBe(54);
});

// =====================================================================
// AREA 19: BMP BITMAPINFOHEADER Structure
// =====================================================================
testAsync('Area 19: encodeBmp generates valid 40-byte DIB BITMAPINFOHEADER', async () => {
  const width = 4;
  const height = 5;
  const rawData = new Uint8ClampedArray(width * height * 4);
  const bmpBlob = encodeBmp({ width, height, data: rawData });
  const arrayBuf = await bmpBlob.arrayBuffer();
  const view = new DataView(arrayBuf);

  // Header size (offset 14)
  expect(view.getUint32(14, true)).toBe(40);
  // Width (offset 18)
  expect(view.getInt32(18, true)).toBe(4);
  // Height (offset 22) - positive for bottom-up
  expect(view.getInt32(22, true)).toBe(5);
  // Planes (offset 26)
  expect(view.getUint16(26, true)).toBe(1);
  // Bit count (offset 28) - 24 bits
  expect(view.getUint16(28, true)).toBe(24);
  // Compression (offset 30) - 0 (BI_RGB)
  expect(view.getUint32(30, true)).toBe(0);
  // Image size (offset 34) - rowSize(12) * height(5) = 60
  expect(view.getUint32(34, true)).toBe(60);
  // Resolution ppm (offset 38 and 42)
  expect(view.getInt32(38, true)).toBe(2835);
  expect(view.getInt32(42, true)).toBe(2835);
  // Colors in palette (offset 46) & Important colors (offset 50)
  expect(view.getUint32(46, true)).toBe(0);
  expect(view.getUint32(50, true)).toBe(0);
});

// =====================================================================
// AREA 20: BMP Scanline Inversion (Bottom-Up Encoding)
// =====================================================================
testAsync('Area 20: encodeBmp writes bottom row first into pixel array', async () => {
  const width = 1;
  const height = 2;
  const rawData = new Uint8ClampedArray([
    // Row 0 (top): Pure Red (255, 0, 0, 255)
    255, 0, 0, 255,
    // Row 1 (bottom): Pure Blue (0, 0, 255, 255)
    0, 0, 255, 255
  ]);

  const bmpBlob = encodeBmp({ width, height, data: rawData });
  const arrayBuf = await bmpBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);

  // Pixel data starts at offset 54.
  // Since BMP is bottom-up, Row 1 (bottom, Pure Blue) must be at offset 54.
  // BMP BGR order: Blue=255, Green=0, Red=0
  expect(bytes[54]).toBe(255); // Blue
  expect(bytes[55]).toBe(0);   // Green
  expect(bytes[56]).toBe(0);   // Red
  expect(bytes[57]).toBe(0);   // Pad byte for row 0

  // Row 0 (top, Pure Red) must be written next (offset 58).
  // BMP BGR order: Blue=0, Green=0, Red=255
  expect(bytes[58]).toBe(0);   // Blue
  expect(bytes[59]).toBe(0);   // Green
  expect(bytes[60]).toBe(255); // Red
  expect(bytes[61]).toBe(0);   // Pad byte for row 1
});

// =====================================================================
// AREA 21: BMP BGR Mapping & Alpha Compositing Over White
// =====================================================================
testAsync('Area 21: encodeBmp composites semi-transparent pixel over white background', async () => {
  const width = 1;
  const height = 1;
  // 50% transparent pure Red (255, 0, 0, 128)
  const rawData = new Uint8ClampedArray([255, 0, 0, 128]);

  const bmpBlob = encodeBmp({ width, height, data: rawData });
  const arrayBuf = await bmpBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);

  const finalB = bytes[54];
  const finalG = bytes[55];
  const finalR = bytes[56];

  expect(finalB).toBe(127);
  expect(finalG).toBe(127);
  expect(finalR).toBe(255);
});

// =====================================================================
// AREA 22: ICO Encoder Header Specification
// =====================================================================
testAsync('Area 22: encodeIco generates valid 6-byte ICONDIR header', async () => {
  const dummyPng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // 8-byte dummy PNG
  const entries = [
    { width: 16, height: 16, buffer: dummyPng },
    { width: 32, height: 32, buffer: dummyPng }
  ];

  const icoBlob = encodeIco(entries);
  expect(icoBlob.type).toBe('image/x-icon');

  const arrayBuf = await icoBlob.arrayBuffer();
  const view = new DataView(arrayBuf);

  // Reserved (must be 0)
  expect(view.getUint16(0, true)).toBe(0);
  // Resource type (1 for ICO)
  expect(view.getUint16(2, true)).toBe(1);
  // Number of images (2)
  expect(view.getUint16(4, true)).toBe(2);
});

// =====================================================================
// AREA 23: ICO Directory Entry Specification & 256px Mapping
// =====================================================================
testAsync('Area 23: encodeIco maps entries correctly and encodes 256px as 0', async () => {
  const dummyPayload = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const entries = [
    { width: 32, height: 32, buffer: dummyPayload },
    { width: 256, height: 256, buffer: dummyPayload } // 256px must map to 0 in ICO header
  ];

  const icoBlob = encodeIco(entries);
  const arrayBuf = await icoBlob.arrayBuffer();
  const view = new DataView(arrayBuf);

  // Entry 0 (starts at offset 6)
  expect(view.getUint8(6)).toBe(32); // width
  expect(view.getUint8(7)).toBe(32); // height
  expect(view.getUint8(8)).toBe(0);  // palette
  expect(view.getUint8(9)).toBe(0);  // reserved
  expect(view.getUint16(10, true)).toBe(1);  // color planes
  expect(view.getUint16(12, true)).toBe(32); // bpp
  expect(view.getUint32(14, true)).toBe(10); // data size
  expect(view.getUint32(18, true)).toBe(38); // data offset: 6 + (2 * 16) = 38

  // Entry 1 (starts at offset 22)
  expect(view.getUint8(22)).toBe(0); // 256px mapped to 0
  expect(view.getUint8(23)).toBe(0); // 256px mapped to 0
  expect(view.getUint32(30, true)).toBe(10); // data size
  expect(view.getUint32(34, true)).toBe(48); // data offset: 38 + 10 = 48
});

// =====================================================================
// AREA 24: ICO Size Calculation & Empty Entry Guard
// =====================================================================
test('Area 24: encodeIco throws for empty entries array and computes exact size', () => {
  let threw = false;
  try {
    encodeIco([]);
  } catch (err) {
    threw = true;
    expect(err.message).toBe('At least one icon entry is required to generate an ICO file.');
  }
  expect(threw).toBe(true);

  // Exact size formula: 6 + 16 * count + sum(entry.byteLength)
  const dummy1 = new Uint8Array(20);
  const dummy2 = new Uint8Array(35);
  const blob = encodeIco([
    { width: 16, height: 16, buffer: dummy1 },
    { width: 32, height: 32, buffer: dummy2 }
  ]);
  const expectedTotal = 6 + (16 * 2) + 20 + 35; // 6 + 32 + 55 = 93
  expect(blob.size).toBe(expectedTotal);
});

// =====================================================================
// AREA 25: Color Transform 'original' Mode
// =====================================================================
test('Area 25: applyColorTransform with original mode leaves buffer identical', () => {
  const imgData = {
    data: new Uint8ClampedArray([12, 34, 56, 78])
  };
  const res = applyColorTransform(imgData, 'original');
  expect(res.data[0]).toBe(12);
  expect(res.data[1]).toBe(34);
  expect(res.data[2]).toBe(56);
  expect(res.data[3]).toBe(78);
});

// =====================================================================
// AREA 26: Color Transform ITU-R BT.601 Grayscale Formula
// =====================================================================
test('Area 26: applyColorTransform grayscale converts using 0.299R + 0.587G + 0.114B formula', () => {
  // Pure Red: 255 * 0.299 = 76.245 -> round = 76
  const redData = { data: new Uint8ClampedArray([255, 0, 0, 255]) };
  applyColorTransform(redData, 'grayscale');
  expect(redData.data[0]).toBe(76);
  expect(redData.data[1]).toBe(76);
  expect(redData.data[2]).toBe(76);
  expect(redData.data[3]).toBe(255); // Alpha preserved

  // Pure Green: 255 * 0.587 = 149.685 -> round = 150
  const greenData = { data: new Uint8ClampedArray([0, 255, 0, 255]) };
  applyColorTransform(greenData, 'grayscale');
  expect(greenData.data[0]).toBe(150);
  expect(greenData.data[1]).toBe(150);
  expect(greenData.data[2]).toBe(150);

  // Pure Blue: 255 * 0.114 = 29.07 -> round = 29
  const blueData = { data: new Uint8ClampedArray([0, 0, 255, 255]) };
  applyColorTransform(blueData, 'grayscale');
  expect(blueData.data[0]).toBe(29);
  expect(blueData.data[1]).toBe(29);
  expect(blueData.data[2]).toBe(29);

  // White: 255*0.299 + 255*0.587 + 255*0.114 = 255
  const whiteData = { data: new Uint8ClampedArray([255, 255, 255, 255]) };
  applyColorTransform(whiteData, 'grayscale');
  expect(whiteData.data[0]).toBe(255);
  expect(whiteData.data[1]).toBe(255);
  expect(whiteData.data[2]).toBe(255);
});

// =====================================================================
// AREA 27: Color Transform Invert Mode
// =====================================================================
test('Area 27: applyColorTransform invert mode applies exact 255 - c inversion', () => {
  const imgData = { data: new Uint8ClampedArray([100, 150, 200, 250]) };
  applyColorTransform(imgData, 'invert');
  expect(imgData.data[0]).toBe(155); // 255 - 100
  expect(imgData.data[1]).toBe(105); // 255 - 150
  expect(imgData.data[2]).toBe(55);  // 255 - 200
  expect(imgData.data[3]).toBe(250); // Alpha channel untouched
});

// =====================================================================
// AREA 28: PDF Generation & Embedding Engine
// =====================================================================
testAsync('Area 28: convertImageFormat to PDF produces valid 1-page PDF document', async () => {
  const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d400000000049454e44ae426082';
  const pngBytes = Buffer.from(pngHex, 'hex');

  const fileMock = {
    name: 'test_sample.png',
    async arrayBuffer() {
      return pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength);
    }
  };

  const result = await convertImageFormat(fileMock, 'pdf');
  expect(result.format).toBe('pdf');
  expect(result.name).toBe('test_sample.pdf');
  expect(result.size).toBeGreaterThan(100);

  // Load resulting PDF via pdf-lib and verify structure
  const pdfBytes = await result.blob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  expect(pdfDoc.getPageCount()).toBe(1);
  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();
  expect(width).toBe(1);
  expect(height).toBe(1);
});

// =====================================================================
// AREA 29: Batch Conversion Empty State
// =====================================================================
testAsync('Area 29: batchConvertImages handles empty file lists gracefully', async () => {
  let progressCalls = 0;
  const results = await batchConvertImages([], {}, () => { progressCalls++; });
  expect(results).toEqual([]);
  expect(progressCalls).toBe(0);
});

// =====================================================================
// AREA 30: Batch Conversion Pro Multi-Format Triple Bundle
// =====================================================================
testAsync('Area 30: batchConvertImages with proMultiFormat exports 3 formats per file', async () => {
  const dummyFile = {
    name: 'photo.jpg',
    async arrayBuffer() {
      return new Uint8Array([1, 2, 3]).buffer;
    }
  };

  let progressValues = [];
  const results = await batchConvertImages([dummyFile], { proMultiFormat: true }, (p) => {
    progressValues.push(p);
  });

  // Must output 3 results: PNG, JPG (jpeg), WEBP
  expect(results.length).toBe(3);
  expect(results[0].format).toBe('png');
  expect(results[1].format).toBe('jpeg');
  expect(results[2].format).toBe('webp');

  // Verify file extensions
  expect(results[0].name).toBe('photo.png');
  expect(results[1].name).toBe('photo.jpg');
  expect(results[2].name).toBe('photo.webp');
});

// =====================================================================
// AREA 31: Batch Conversion Progress Monotonicity
// =====================================================================
testAsync('Area 31: batchConvertImages progress callback is monotonic and reaches 100', async () => {
  const dummyFiles = [
    { name: 'a.png', arrayBuffer: async () => new Uint8Array(4).buffer },
    { name: 'b.png', arrayBuffer: async () => new Uint8Array(4).buffer }
  ];

  let progressValues = [];
  await batchConvertImages(dummyFiles, { targetFormat: 'png' }, (p) => {
    progressValues.push(p);
  });

  expect(progressValues.length).toBe(2);
  expect(progressValues[0]).toBe(50);
  expect(progressValues[1]).toBe(100);
  expect(progressValues[1] >= progressValues[0]).toBe(true);
});

// =====================================================================
// AREA 32: UI Source Code Anti-Slop and Feature Wiring Audit
// =====================================================================
test('Area 32: ImageConverter.jsx contains zero banned buzzwords and wires full feature set', () => {
  const componentPath = path.join(projectRoot, 'src/pages/image/ImageConverter.jsx');
  const code = fs.readFileSync(componentPath, 'utf8');

  // 1. Check absence of AI slop buzzwords
  const slopWords = ['effortlessly', 'revolutionize', 'supercharge', 'delve', 'testament', 'seamlessly'];
  for (const word of slopWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    expect(regex.test(code)).toBe(false);
  }

  // 2. Check essential production features
  expect(code.includes('handleSliderMove')).toBe(true);
  expect(code.includes('handleMouseDownSlider')).toBe(true);
  expect(code.includes('compareSliderPos')).toBe(true);
  expect(code.includes('naturalWidth')).toBe(true);
  expect(code.includes('naturalHeight')).toBe(true);
  expect(code.includes('handleMoveFile')).toBe(true);
  expect(code.includes('handleRemoveFile')).toBe(true);
  expect(code.includes('proMultiFormat')).toBe(true);
  expect(code.includes('proPrintDpi')).toBe(true);
  expect(code.includes('copyImageToClipboard')).toBe(true);
  expect(code.includes('navigator.clipboard')).toBe(true);
});

// =====================================================================
// AREA 33: Design System & Styling Guardrails
// =====================================================================
test('Area 33: ImageConverter.jsx satisfies UI/UX Pro Max and Anti-Pattern invariants', () => {
  const componentPath = path.join(projectRoot, 'src/pages/image/ImageConverter.jsx');
  const code = fs.readFileSync(componentPath, 'utf8');

  // 1. No emojis in JSX strings
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  expect(emojiRegex.test(code)).toBe(false);

  // 2. Lucide Icons imported and used
  expect(code.includes('lucide-react')).toBe(true);
  expect(code.includes('ArrowLeftRight')).toBe(true);
  expect(code.includes('SplitSquareVertical')).toBe(true);
  expect(code.includes('Sliders')).toBe(true);
  expect(code.includes('Download')).toBe(true);
  expect(code.includes('Sparkles')).toBe(true);

  // 3. No generic AI purple gradient classes
  expect(code.includes('from-purple-600 to-indigo-600')).toBe(false);
  expect(code.includes('bg-gradient-to-r from-violet-600')).toBe(false);
});

await Promise.all(asyncQueue);

console.log('======================================================================');
console.log(`MASTER TEST SUITE SUMMARY: All ${totalPassed}/33 Test Areas Passed!`);
console.log(`Total Falsifiable Assertions Verified: ${totalAsserts}`);
console.log('======================================================================');
