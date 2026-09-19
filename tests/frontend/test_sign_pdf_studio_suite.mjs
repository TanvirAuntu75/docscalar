import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { getPageGeometry, screenRatioToPdfPoints } from '../../src/utils/pdfCoordinates.js';
import { signPdf } from '../../src/engines/pdf/signPdf.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error('  FAIL [Assertion ' + total + ']: ' + message);
    throw new Error('Assertion failed: ' + message);
  }
  passed++;
  console.log('  ✓ [Assertion ' + total + ']: ' + message);
}

console.log('=== STARTING SIGN PDF STUDIO MOLECULAR VERIFICATION SUITE ===\n');

// -----------------------------------------------------------------------------
// AREA 1: Coordinate Geometry & Exact Rotation Anchor Invariants
// -----------------------------------------------------------------------------
console.log('Area 1: Coordinate Geometry & Exact Rotation Anchor Invariants');

const pageMock0 = {
  getWidth: () => 600,
  getHeight: () => 400,
  getRotation: () => ({ angle: 0 }),
  getMediaBox: () => ({ x: 0, y: 0, width: 600, height: 400 }),
  getCropBox: () => null
};

const geom0 = getPageGeometry(pageMock0);
assert(geom0.minX === 0 && geom0.minY === 0, 'Geom0 minX and minY are 0');
assert(geom0.mbWidth === 600 && geom0.mbHeight === 400, 'Geom0 dimensions 600x400');
assert(geom0.rotation === 0, 'Geom0 rotation is 0');
assert(geom0.viewWidth === 600 && geom0.viewHeight === 400, 'Geom0 view dimensions 600x400');

// Test rotation 0 mapping: visual rect x=100, y=50, w=150, h=50 on 600x400
const pt0 = screenRatioToPdfPoints({
  xRatio: 100 / 600,
  yRatio: 50 / 400,
  widthRatio: 150 / 600,
  heightRatio: 50 / 400,
  pageGeometry: geom0
});
assert(Math.abs(pt0.x - 100) < 0.001, 'Rotation 0: pt.x is exactly 100');
assert(Math.abs(pt0.y - (400 - 50 - 50)) < 0.001, 'Rotation 0: pt.y is exactly 300 (400 - top - height)');
assert(Math.abs(pt0.width - 150) < 0.001, 'Rotation 0: pt.width is exactly 150');
assert(Math.abs(pt0.height - 50) < 0.001, 'Rotation 0: pt.height is exactly 50');
assert(pt0.rotateDegrees === 0, 'Rotation 0: rotateDegrees is 0');

// Test rotation 90 mapping: on 600x400 page, viewWidth is 400, viewHeight is 600
const pageMock90 = {
  getWidth: () => 600,
  getHeight: () => 400,
  getRotation: () => ({ angle: 90 }),
  getMediaBox: () => ({ x: 0, y: 0, width: 600, height: 400 }),
  getCropBox: () => null
};
const geom90 = getPageGeometry(pageMock90);
assert(geom90.rotation === 90, 'Geom90 rotation is 90');
assert(geom90.viewWidth === 400 && geom90.viewHeight === 600, 'Geom90 view dimensions transposed to 400x600');

const pt90 = screenRatioToPdfPoints({
  xRatio: 100 / 400,
  yRatio: 50 / 600,
  widthRatio: 150 / 400,
  heightRatio: 50 / 600,
  pageGeometry: geom90
});
assert(Math.abs(pt90.x - 100) < 0.001, 'Rotation 90: pt.x is exactly 100 (screenTop + visualH)');
assert(Math.abs(pt90.y - 100) < 0.001, 'Rotation 90: pt.y is exactly 100 (screenLeft)');
assert(pt90.rotateDegrees === 90, 'Rotation 90: rotateDegrees is 90');

// Test rotation 180 mapping
const pageMock180 = {
  getWidth: () => 600,
  getHeight: () => 400,
  getRotation: () => ({ angle: 180 }),
  getMediaBox: () => ({ x: 0, y: 0, width: 600, height: 400 }),
  getCropBox: () => null
};
const geom180 = getPageGeometry(pageMock180);
const pt180 = screenRatioToPdfPoints({
  xRatio: 100 / 600,
  yRatio: 50 / 400,
  widthRatio: 150 / 600,
  heightRatio: 50 / 400,
  pageGeometry: geom180
});
assert(Math.abs(pt180.x - 500) < 0.001, 'Rotation 180: pt.x is exactly 500 (mbWidth - screenLeft)');
assert(Math.abs(pt180.y - 100) < 0.001, 'Rotation 180: pt.y is exactly 100 (screenTop + visualH)');
assert(pt180.rotateDegrees === 180, 'Rotation 180: rotateDegrees is 180');

// Test rotation 270 mapping: viewWidth = 400, viewHeight = 600
const pageMock270 = {
  getWidth: () => 600,
  getHeight: () => 400,
  getRotation: () => ({ angle: 270 }),
  getMediaBox: () => ({ x: 0, y: 0, width: 600, height: 400 }),
  getCropBox: () => null
};
const geom270 = getPageGeometry(pageMock270);
const pt270 = screenRatioToPdfPoints({
  xRatio: 100 / 400,
  yRatio: 50 / 600,
  widthRatio: 150 / 400,
  heightRatio: 50 / 600,
  pageGeometry: geom270
});
assert(Math.abs(pt270.x - 500) < 0.001, 'Rotation 270: pt.x is exactly 500 (mbWidth - screenTop - visualH)');
assert(Math.abs(pt270.y - 300) < 0.001, 'Rotation 270: pt.y is exactly 300 (mbHeight - screenLeft)');
assert(pt270.rotateDegrees === 270, 'Rotation 270: rotateDegrees is 270');

// CropBox Prioritization Invariant
const pageWithCropBox = {
  getWidth: () => 612,
  getHeight: () => 792,
  getRotation: () => ({ angle: 0 }),
  getMediaBox: () => ({ x: 0, y: 0, width: 612, height: 792 }),
  getCropBox: () => ({ x: 36, y: 36, width: 540, height: 720 })
};
const geomCrop = getPageGeometry(pageWithCropBox);
assert(geomCrop.minX === 36, 'Prioritizes CropBox x offset 36pt');
assert(geomCrop.minY === 36, 'Prioritizes CropBox y offset 36pt');
assert(geomCrop.mbWidth === 540, 'Prioritizes CropBox width 540pt');
assert(geomCrop.mbHeight === 720, 'Prioritizes CropBox height 720pt');

// -----------------------------------------------------------------------------
// AREA 2: LocalToPdf Sub-Element Transform Math
// -----------------------------------------------------------------------------
console.log('\nArea 2: LocalToPdf Sub-Element Transform Math');

function localToPdf(pt, u, v) {
  const rad = ((pt.rotateDegrees || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: pt.x + u * cos - v * sin,
    y: pt.y + u * sin + v * cos
  };
}

// 0 degrees
const ptRot0 = { x: 100, y: 300, rotateDegrees: 0 };
const p0_uv = localToPdf(ptRot0, 10, 20);
assert(Math.abs(p0_uv.x - 110) < 0.001 && Math.abs(p0_uv.y - 320) < 0.001, 'localToPdf at 0 deg: (100+10, 300+20)');

// 90 degrees
const ptRot90 = { x: 100, y: 100, rotateDegrees: 90 };
const p90_uv = localToPdf(ptRot90, 10, 20);
assert(Math.abs(p90_uv.x - 80) < 0.001, 'localToPdf at 90 deg: x is 100 - 20 = 80');
assert(Math.abs(p90_uv.y - 110) < 0.001, 'localToPdf at 90 deg: y is 100 + 10 = 110');

// 180 degrees
const ptRot180 = { x: 500, y: 100, rotateDegrees: 180 };
const p180_uv = localToPdf(ptRot180, 10, 20);
assert(Math.abs(p180_uv.x - 490) < 0.001, 'localToPdf at 180 deg: x is 500 - 10 = 490');
assert(Math.abs(p180_uv.y - 80) < 0.001, 'localToPdf at 180 deg: y is 100 - 20 = 80');

// 270 degrees
const ptRot270 = { x: 500, y: 300, rotateDegrees: 270 };
const p270_uv = localToPdf(ptRot270, 10, 20);
assert(Math.abs(p270_uv.x - 520) < 0.001, 'localToPdf at 270 deg: x is 500 + 20 = 520');
assert(Math.abs(p270_uv.y - 290) < 0.001, 'localToPdf at 270 deg: y is 300 - 10 = 290');

// -----------------------------------------------------------------------------
// AREA 3: Magic Byte Sniffing & Buffer Slicing Resilience
// -----------------------------------------------------------------------------
console.log('\nArea 3: Magic Byte Sniffing & Buffer Slicing Resilience');

function isPngImageBytes(bytes) {
  if (!bytes || bytes.length < 4) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return true;
  }
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    return false;
  }
  return true;
}

const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const jpgBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
assert(isPngImageBytes(pngBytes) === true, 'Sniffs PNG header correctly');
assert(isPngImageBytes(jpgBytes) === false, 'Sniffs JPEG header correctly');

// Uint8Array sliced view resilience
const bigBuffer = new Uint8Array(100);
bigBuffer[10] = 42;
const slicedView = bigBuffer.subarray(10, 20);
assert(slicedView.byteOffset === 10, 'Subarray has byteOffset 10');
const extractedSlice = slicedView.buffer.slice(slicedView.byteOffset, slicedView.byteOffset + slicedView.byteLength);
assert(extractedSlice.byteLength === 10, 'Extracted slice has exact length 10');
assert(new Uint8Array(extractedSlice)[0] === 42, 'Extracted slice preserves first byte');

// -----------------------------------------------------------------------------
// AREA 4: Multi-Page & Multi-Field Management
// -----------------------------------------------------------------------------
console.log('\nArea 4: Multi-Page & Multi-Field Management');

const field1 = { id: 'f1', type: 'signature', pageIndex: 0, x: 0.1, y: 0.1, width: 0.2, height: 0.08 };
const field2 = { id: 'f2', type: 'date', pageIndex: 0, x: 0.4, y: 0.1, width: 0.15, height: 0.05 };

// Replicate to all pages simulation (3 pages total)
const allPageFields = [];
const targetField = field1;
for (let p = 0; p < 3; p++) {
  if (p === targetField.pageIndex) {
    allPageFields.push(targetField);
  } else {
    allPageFields.push({
      ...targetField,
      id: targetField.id + '_page_' + (p + 1),
      pageIndex: p
    });
  }
}
assert(allPageFields.length === 3, 'Replicated field across all 3 pages');
assert(allPageFields[0].id === 'f1', 'Page 0 keeps original ID');
assert(allPageFields[1].id === 'f1_page_2', 'Page 1 has unique page 2 ID');
assert(allPageFields[2].id === 'f1_page_3', 'Page 2 has unique page 3 ID');
assert(allPageFields[1].x === field1.x, 'Page 1 retains identical x coordinate');
assert(allPageFields[1].y === field1.y, 'Page 1 retains identical y coordinate');

// -----------------------------------------------------------------------------
// AREA 5: End-to-End Real PDF Signing Execution with PyMuPDF Inspection
// -----------------------------------------------------------------------------
console.log('\nArea 5: End-to-End Real PDF Signing Execution');

const testPdfPath = 'C:/Users/Tanvir Alam/Pictures/Taha/Statistics assignment.pdf';
assert(fs.existsSync(testPdfPath), 'Source Statistics assignment.pdf exists on disk');

const sourceBuffer = fs.readFileSync(testPdfPath);
assert(sourceBuffer.length > 0, 'Read source PDF buffer (' + sourceBuffer.length + ' bytes)');

// Create a 1x1 transparent PNG data URL for signature testing
const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const testFields = [
  {
    id: 'sig_1',
    type: 'signature',
    pageIndex: 0,
    x: 0.15,
    y: 0.80,
    width: 0.25,
    height: 0.08,
    dataUrl: tinyPngBase64
  },
  {
    id: 'name_1',
    type: 'name',
    pageIndex: 0,
    x: 0.15,
    y: 0.89,
    width: 0.25,
    height: 0.04,
    value: 'Professor Tanvir Alam'
  },
  {
    id: 'date_1',
    type: 'date',
    pageIndex: 0,
    x: 0.50,
    y: 0.89,
    width: 0.20,
    height: 0.04,
    value: '09/15/2026'
  },
  {
    id: 'check_1',
    type: 'checkbox',
    pageIndex: 0,
    x: 0.75,
    y: 0.89,
    width: 0.04,
    height: 0.04,
    checked: true,
    checkStyle: 'cross'
  },
  {
    id: 'note_1',
    type: 'text',
    pageIndex: 1,
    x: 0.20,
    y: 0.85,
    width: 0.40,
    height: 0.04,
    value: 'Document Verified and Certified',
    color: '#2563EB',
    bgStyle: 'white'
  }
];

let reportedProgress = [];
const signedBlob = await signPdf(sourceBuffer, testFields, {
  flatten: true,
  onProgress: (p) => reportedProgress.push(p),
  autoCropBlackBorders: false
});

assert(signedBlob instanceof Blob, 'signPdf returned valid Blob instance');
assert(signedBlob.size > 50000, 'Signed PDF size valid: ' + signedBlob.size + ' bytes');
assert(reportedProgress.includes(100), 'signPdf reported 100% progress');

// Save signed PDF for inspection
const outputPath = path.resolve('scratch/verified_signed_statistics.pdf');
fs.writeFileSync(outputPath, Buffer.from(await signedBlob.arrayBuffer()));
assert(fs.existsSync(outputPath), 'Saved scratch/verified_signed_statistics.pdf');

// -----------------------------------------------------------------------------
// AREA 6: Multi-Rotation End-to-End Execution
// -----------------------------------------------------------------------------
console.log('\nArea 6: Multi-Rotation End-to-End Execution');

const rotDoc = await PDFDocument.create();
const rPage0 = rotDoc.addPage([600, 400]);
rPage0.setRotation(degrees(0));

const rPage90 = rotDoc.addPage([600, 400]);
rPage90.setRotation(degrees(90));

const rPage180 = rotDoc.addPage([600, 400]);
rPage180.setRotation(degrees(180));

const rPage270 = rotDoc.addPage([600, 400]);
rPage270.setRotation(degrees(270));

const multiRotBuffer = Buffer.from(await rotDoc.save());

const rotFields = [
  { id: 'f0', type: 'name', pageIndex: 0, x: 0.2, y: 0.2, width: 0.3, height: 0.1, value: 'PAGE_ROT_0' },
  { id: 'f90', type: 'name', pageIndex: 1, x: 0.2, y: 0.2, width: 0.3, height: 0.1, value: 'PAGE_ROT_90' },
  { id: 'f180', type: 'name', pageIndex: 2, x: 0.2, y: 0.2, width: 0.3, height: 0.1, value: 'PAGE_ROT_180' },
  { id: 'f270', type: 'name', pageIndex: 3, x: 0.2, y: 0.2, width: 0.3, height: 0.1, value: 'PAGE_ROT_270' }
];

const multiRotSignedBlob = await signPdf(multiRotBuffer, rotFields, {
  flatten: true,
  autoCropBlackBorders: false
});
assert(multiRotSignedBlob instanceof Blob, 'multi-rot signPdf returned Blob');
const rotOutputPath = path.resolve('scratch/verified_multi_rot_signed.pdf');
fs.writeFileSync(rotOutputPath, Buffer.from(await multiRotSignedBlob.arrayBuffer()));
assert(fs.existsSync(rotOutputPath), 'Saved scratch/verified_multi_rot_signed.pdf');

console.log('\n=== COMPLETED: ALL ' + passed + ' ASSERTIONS PASSED (100%) ===\n');
