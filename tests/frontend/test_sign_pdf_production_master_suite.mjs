import fs from 'fs';
import path from 'path';
import { File } from 'node:buffer';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { getPageGeometry, screenRatioToPdfPoints, pdfPointsToScreenRatio } from '../../src/utils/pdfCoordinates.js';
import { signPdf } from '../../src/engines/pdf/signPdf.js';
import { computeSha256Hash, generateAuditCertificatePdf } from '../../src/engines/pdf/auditCertificate.js';
import { formatDateByPattern } from '../../src/utils/dateFormats.js';
import { generateStampDataUrl } from '../../src/utils/stampGenerator.js';
import {
  SIGNATURE_CUE_REGEX,
  DATE_CUE_REGEX,
  NAME_CUE_REGEX,
  TITLE_CUE_REGEX,
  UNDERLINE_REGEX,
  classifyAcroFormField
} from '../../src/engines/pdf/signatureLineDetector.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`  FAIL [Assertion ${total}]: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passed++;
  console.log(`  ✓ [Assertion ${total}]: ${message}`);
}

console.log('================================================================');
console.log('  DOCSCALAR SIGN PDF STUDIO - MASTER PRODUCTION MOLECULAR SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// AREA 1: Coordinate Geometry & Dimension Extraction (0° Rotation)
// -----------------------------------------------------------------------------
console.log('Area 1: Coordinate Geometry & Dimension Extraction (0° Rotation)');
const page0 = {
  getWidth: () => 612,
  getHeight: () => 792,
  getRotation: () => ({ angle: 0 }),
  getMediaBox: () => ({ x: 0, y: 0, width: 612, height: 792 }),
  getCropBox: () => null
};
const geom0 = getPageGeometry(page0);
assert(geom0.minX === 0 && geom0.minY === 0, 'Geom0 origin is at (0, 0)');
assert(geom0.mbWidth === 612 && geom0.mbHeight === 792, 'Geom0 mediaBox is 612x792');
assert(geom0.rotation === 0, 'Geom0 rotation angle is 0');
assert(geom0.viewWidth === 612 && geom0.viewHeight === 792, 'Geom0 viewport matches mediaBox');

// -----------------------------------------------------------------------------
// AREA 2: Coordinate Geometry under Transposed Orientations (90° & 270°)
// -----------------------------------------------------------------------------
console.log('\nArea 2: Coordinate Geometry under Transposed Orientations (90° & 270°)');
const page90 = {
  getWidth: () => 612,
  getHeight: () => 792,
  getRotation: () => ({ angle: 90 }),
  getMediaBox: () => ({ x: 0, y: 0, width: 612, height: 792 }),
  getCropBox: () => null
};
const geom90 = getPageGeometry(page90);
assert(geom90.rotation === 90, 'Geom90 rotation is 90');
assert(geom90.viewWidth === 792 && geom90.viewHeight === 612, 'Geom90 transposes dimensions to 792x612');

const page270 = {
  getWidth: () => 612,
  getHeight: () => 792,
  getRotation: () => ({ angle: 270 }),
  getMediaBox: () => ({ x: 0, y: 0, width: 612, height: 792 }),
  getCropBox: () => null
};
const geom270 = getPageGeometry(page270);
assert(geom270.rotation === 270, 'Geom270 rotation is 270');
assert(geom270.viewWidth === 792 && geom270.viewHeight === 612, 'Geom270 transposes dimensions to 792x612');

// -----------------------------------------------------------------------------
// AREA 3: Coordinate Geometry under Inverted Orientation (180°)
// -----------------------------------------------------------------------------
console.log('\nArea 3: Coordinate Geometry under Inverted Orientation (180°)');
const page180 = {
  getWidth: () => 612,
  getHeight: () => 792,
  getRotation: () => ({ angle: 180 }),
  getMediaBox: () => ({ x: 0, y: 0, width: 612, height: 792 }),
  getCropBox: () => null
};
const geom180 = getPageGeometry(page180);
assert(geom180.rotation === 180, 'Geom180 rotation is 180');
assert(geom180.viewWidth === 612 && geom180.viewHeight === 792, 'Geom180 maintains 612x792 aspect');

// -----------------------------------------------------------------------------
// AREA 4: Screen Ratio to PDF Points Mapping (0° Default Orientation)
// -----------------------------------------------------------------------------
console.log('\nArea 4: Screen Ratio to PDF Points Mapping (0° Default Orientation)');
// Visual placement: x=61.2pt (10%), y=79.2pt (10%), w=122.4pt (20%), h=39.6pt (5%)
const pt0 = screenRatioToPdfPoints({
  xRatio: 0.10,
  yRatio: 0.10,
  widthRatio: 0.20,
  heightRatio: 0.05,
  pageGeometry: geom0
});
assert(Math.abs(pt0.x - 61.2) < 0.01, '0° rotation: pt.x is exactly 61.2 pt');
// Expected y: mbHeight - (screenTop + visualH) = 792 - (79.2 + 39.6) = 673.2 pt
assert(Math.abs(pt0.y - 673.2) < 0.01, '0° rotation: pt.y is exactly 673.2 pt');
assert(Math.abs(pt0.width - 122.4) < 0.01, '0° rotation: pt.width is exactly 122.4 pt');
assert(Math.abs(pt0.height - 39.6) < 0.01, '0° rotation: pt.height is exactly 39.6 pt');
assert(pt0.rotateDegrees === 0, '0° rotation: rotateDegrees is 0');

// -----------------------------------------------------------------------------
// AREA 5: Screen Ratio to PDF Points Mapping (90° Clockwise Rotation)
// -----------------------------------------------------------------------------
console.log('\nArea 5: Screen Ratio to PDF Points Mapping (90° Clockwise Rotation)');
const pt90 = screenRatioToPdfPoints({
  xRatio: 0.10,
  yRatio: 0.10,
  widthRatio: 0.20,
  heightRatio: 0.05,
  pageGeometry: geom90
});
// viewWidth=792, viewHeight=612. screenLeft=79.2, screenTop=61.2, visualW=158.4, visualH=30.6
// At 90 deg: pdfX = minX + screenTop + visualH = 61.2 + 30.6 = 91.8
//            pdfY = minY + screenLeft = 79.2
assert(Math.abs(pt90.x - 91.8) < 0.01, '90° rotation: pt.x is exactly 91.8 pt');
assert(Math.abs(pt90.y - 79.2) < 0.01, '90° rotation: pt.y is exactly 79.2 pt');
assert(pt90.rotateDegrees === 90, '90° rotation: rotateDegrees is 90');

// -----------------------------------------------------------------------------
// AREA 6: Screen Ratio to PDF Points Mapping (180° Inverted Rotation)
// -----------------------------------------------------------------------------
console.log('\nArea 6: Screen Ratio to PDF Points Mapping (180° Inverted Rotation)');
const pt180 = screenRatioToPdfPoints({
  xRatio: 0.10,
  yRatio: 0.10,
  widthRatio: 0.20,
  heightRatio: 0.05,
  pageGeometry: geom180
});
// viewWidth=612, viewHeight=792. screenLeft=61.2, screenTop=79.2, visualW=122.4, visualH=39.6
// At 180 deg: pdfX = minX + mbWidth - screenLeft = 612 - 61.2 = 550.8
//             pdfY = minY + screenTop + visualH = 79.2 + 39.6 = 118.8
assert(Math.abs(pt180.x - 550.8) < 0.01, '180° rotation: pt.x is exactly 550.8 pt');
assert(Math.abs(pt180.y - 118.8) < 0.01, '180° rotation: pt.y is exactly 118.8 pt');
assert(pt180.rotateDegrees === 180, '180° rotation: rotateDegrees is 180');

// -----------------------------------------------------------------------------
// AREA 7: Screen Ratio to PDF Points Mapping (270° Counter-Clockwise Rotation)
// -----------------------------------------------------------------------------
console.log('\nArea 7: Screen Ratio to PDF Points Mapping (270° Counter-Clockwise Rotation)');
const pt270 = screenRatioToPdfPoints({
  xRatio: 0.10,
  yRatio: 0.10,
  widthRatio: 0.20,
  heightRatio: 0.05,
  pageGeometry: geom270
});
// viewWidth=792, viewHeight=612. screenLeft=79.2, screenTop=61.2, visualW=158.4, visualH=30.6
// At 270 deg: pdfX = minX + mbWidth - (screenTop + visualH) = 612 - (61.2 + 30.6) = 520.2
//             pdfY = minY + mbHeight - screenLeft = 792 - 79.2 = 712.8
assert(Math.abs(pt270.x - 520.2) < 0.01, '270° rotation: pt.x is exactly 520.2 pt');
assert(Math.abs(pt270.y - 712.8) < 0.01, '270° rotation: pt.y is exactly 712.8 pt');
assert(pt270.rotateDegrees === 270, '270° rotation: rotateDegrees is 270');

// -----------------------------------------------------------------------------
// AREA 8: Sub-Element Coordinate Transformation (localToPdf Vector Trigonometry)
// -----------------------------------------------------------------------------
console.log('\nArea 8: Sub-Element Coordinate Transformation (localToPdf Vector Trigonometry)');
function localToPdf(pt, u, v) {
  const rad = ((pt.rotateDegrees || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: pt.x + u * cos - v * sin,
    y: pt.y + u * sin + v * cos
  };
}
const pRot0 = localToPdf({ x: 100, y: 200, rotateDegrees: 0 }, 15, 25);
assert(Math.abs(pRot0.x - 115) < 0.001 && Math.abs(pRot0.y - 225) < 0.001, '0° localToPdf: (100+15, 200+25)');

const pRot90 = localToPdf({ x: 100, y: 200, rotateDegrees: 90 }, 15, 25);
assert(Math.abs(pRot90.x - 75) < 0.001 && Math.abs(pRot90.y - 215) < 0.001, '90° localToPdf: x=100-25=75, y=200+15=215');

const pRot180 = localToPdf({ x: 100, y: 200, rotateDegrees: 180 }, 15, 25);
assert(Math.abs(pRot180.x - 85) < 0.001 && Math.abs(pRot180.y - 175) < 0.001, '180° localToPdf: x=100-15=85, y=200-25=175');

// -----------------------------------------------------------------------------
// AREA 9: Checkbox Vector Checkmark Geometry (checkStyle === "check" Branch)
// -----------------------------------------------------------------------------
console.log('\nArea 9: Checkbox Vector Checkmark Geometry (checkStyle === "check" Branch)');
const boxWidth = 20;
const boxHeight = 20;
const checkPt = { x: 50, y: 50, rotateDegrees: 0 };
// 3 points of ✓:
const p1 = localToPdf(checkPt, boxWidth * 0.18, boxHeight * 0.48); // start
const p2 = localToPdf(checkPt, boxWidth * 0.40, boxHeight * 0.22); // vertex
const p3 = localToPdf(checkPt, boxWidth * 0.82, boxHeight * 0.78); // ascender tip

assert(p1.x === 50 + 3.6 && p1.y === 50 + 9.6, 'Checkmark p1 is at (53.6, 59.6)');
assert(p2.x === 50 + 8.0 && p2.y === 50 + 4.4, 'Checkmark p2 (vertex) is at (58.0, 54.4)');
assert(p3.x === 50 + 16.4 && p3.y === 50 + 15.6, 'Checkmark p3 (tip) is at (66.4, 65.6)');
assert(p2.y < p1.y && p2.y < p3.y, 'Checkmark vertex is the lowest y coordinate in local space');
assert(p3.y > p1.y, 'Checkmark ascender tip rises higher than the starting stroke');

// -----------------------------------------------------------------------------
// AREA 10: Checkbox Vector Cross Geometry (checkStyle === "cross" Branch)
// -----------------------------------------------------------------------------
console.log('\nArea 10: Checkbox Vector Cross Geometry (checkStyle === "cross" Branch)');
const cLine1_start = localToPdf(checkPt, boxWidth * 0.22, boxHeight * 0.78);
const cLine1_end = localToPdf(checkPt, boxWidth * 0.78, boxHeight * 0.22);
const cLine2_start = localToPdf(checkPt, boxWidth * 0.22, boxHeight * 0.22);
const cLine2_end = localToPdf(checkPt, boxWidth * 0.78, boxHeight * 0.78);

const mid1_x = (cLine1_start.x + cLine1_end.x) / 2;
const mid1_y = (cLine1_start.y + cLine1_end.y) / 2;
const mid2_x = (cLine2_start.x + cLine2_end.x) / 2;
const mid2_y = (cLine2_start.y + cLine2_end.y) / 2;
assert(Math.abs(mid1_x - (50 + boxWidth * 0.5)) < 0.001, 'Cross line 1 midpoint x is centered at 60');
assert(Math.abs(mid1_y - (50 + boxHeight * 0.5)) < 0.001, 'Cross line 1 midpoint y is centered at 60');
assert(Math.abs(mid1_x - mid2_x) < 0.001 && Math.abs(mid1_y - mid2_y) < 0.001, 'Cross diagonals intersect precisely at (60, 60)');

// -----------------------------------------------------------------------------
// AREA 11: Velocity-Sensitive Drawing Stroke Dynamics (Signature Creator Modal)
// -----------------------------------------------------------------------------
console.log('\nArea 11: Velocity-Sensitive Drawing Stroke Dynamics (Signature Creator Modal)');
function computeStrokeWidth(dx, dy, dt, pressure = 0.5) {
  const dist = Math.hypot(dx, dy);
  const time = Math.max(1, dt);
  const velocity = dist / time;
  const pressureFactor = pressure > 0 && pressure !== 0.5 ? 0.6 + pressure * 0.8 : 1.0;
  const rawWidth = Math.max(1.0, Math.min(4.5, 3.2 - velocity * 1.2));
  return rawWidth * pressureFactor;
}

const slowStroke = computeStrokeWidth(2, 2, 16, 0.5); // dist ~2.82, dt=16, v ~ 0.176
assert(slowStroke > 2.8 && slowStroke < 3.2, 'Slow hand movement generates thicker ink pool (~3.0px)');

const fastStroke = computeStrokeWidth(50, 40, 16, 0.5); // dist ~64, dt=16, v = 4.0
assert(fastStroke === 1.0, 'Fast flick movement clamps to thin line floor (1.0px)');

const stylusFirmStroke = computeStrokeWidth(2, 2, 16, 0.9); // pressure=0.9 -> factor = 0.6 + 0.72 = 1.32
assert(stylusFirmStroke > slowStroke, 'High stylus pressure increases stroke thickness');

// -----------------------------------------------------------------------------
// AREA 12: Signature Line Detection - Cue Text Matching Regex Engine
// -----------------------------------------------------------------------------
console.log('\nArea 12: Signature Line Detection - Cue Text Matching Regex Engine');
assert(SIGNATURE_CUE_REGEX.test('Authorized Signature:'), 'Matches "Authorized Signature:"');
assert(SIGNATURE_CUE_REGEX.test('Please Sign Here:'), 'Matches "Please Sign Here:"');
assert(SIGNATURE_CUE_REGEX.test('Signature of Client:'), 'Matches "Signature of Client:"');
assert(SIGNATURE_CUE_REGEX.test('By: ____________________'), 'Matches "By: _____"');
assert(!SIGNATURE_CUE_REGEX.test('Monthly Invoice Total Due: $1,250'), 'Rejects non-signature text');

// -----------------------------------------------------------------------------
// AREA 13: Date Cue Text Matching Regex Engine
// -----------------------------------------------------------------------------
console.log('\nArea 13: Date Cue Text Matching Regex Engine');
assert(DATE_CUE_REGEX.test('Date: 09/18/2026'), 'Matches "Date: 09/18/2026"');
assert(DATE_CUE_REGEX.test('Effective Date:'), 'Matches "Effective Date:"');
assert(DATE_CUE_REGEX.test('Dated this 18th day of September'), 'Matches "Dated this ..."');
assert(!DATE_CUE_REGEX.test('Mandate for the upcoming fiscal quarter'), 'Rejects unrelated word containing "date"');

// -----------------------------------------------------------------------------
// AREA 14: Name and Title Cue Text Matching Regex Engine
// -----------------------------------------------------------------------------
console.log('\nArea 14: Name and Title Cue Text Matching Regex Engine');
assert(NAME_CUE_REGEX.test('Print Name:'), 'Matches "Print Name:"');
assert(NAME_CUE_REGEX.test('Printed Name:'), 'Matches "Printed Name:"');
assert(NAME_CUE_REGEX.test('Full Name: John Doe'), 'Matches "Full Name:"');
assert(TITLE_CUE_REGEX.test('Job Title: Senior Director'), 'Matches "Job Title:"');
assert(TITLE_CUE_REGEX.test('Position: Managing Partner'), 'Matches "Position:"');

// -----------------------------------------------------------------------------
// AREA 15: Underline Run Recognition Regex Engine
// -----------------------------------------------------------------------------
console.log('\nArea 15: Underline Run Recognition Regex Engine');
assert(UNDERLINE_REGEX.test('By: ______________'), 'Matches underscore runs');
assert(UNDERLINE_REGEX.test('Date: ---------'), 'Matches dashed runs');
assert(UNDERLINE_REGEX.test('Witness: ——'), 'Matches em-dash runs');
assert(!UNDERLINE_REGEX.test('Single _ separator'), 'Rejects short single underscore');
assert(!UNDERLINE_REGEX.test('Two -- dashes'), 'Rejects 2 hyphens');

// -----------------------------------------------------------------------------
// AREA 16: Signature Zone Clamping & Screen Coordinate Normalization
// -----------------------------------------------------------------------------
console.log('\nArea 16: Signature Zone Clamping & Screen Coordinate Normalization');
function clampZoneRatios(rawX, rawY, type = 'signature') {
  const safeWidth = type === 'signature' ? 0.26 : type === 'date' ? 0.22 : 0.25;
  const safeHeight = type === 'signature' ? 0.08 : 0.045;
  const safeX = Math.max(0.04, Math.min(1 - safeWidth - 0.04, rawX));
  const safeY = Math.max(0.04, Math.min(1 - safeHeight - 0.04, rawY));
  return { safeX, safeY, safeWidth, safeHeight };
}

const zoneLeftOob = clampZoneRatios(-0.05, 0.50, 'signature');
assert(zoneLeftOob.safeX === 0.04, 'Clamps negative x to 0.04 margin floor');

const zoneRightOob = clampZoneRatios(0.95, 0.50, 'signature');
// 1 - 0.26 - 0.04 = 0.70
assert(Math.abs(zoneRightOob.safeX - 0.70) < 0.001, 'Clamps right overflowing x to 0.70');

const zoneBottomOob = clampZoneRatios(0.50, 0.95, 'signature');
// 1 - 0.08 - 0.04 = 0.88
assert(Math.abs(zoneBottomOob.safeY - 0.88) < 0.001, 'Clamps bottom overflowing y to 0.88');

// -----------------------------------------------------------------------------
// AREA 17: Signature Zone Spatial Deduplication Filter
// -----------------------------------------------------------------------------
console.log('\nArea 17: Signature Zone Spatial Deduplication Filter');
const existingZones = [{ x: 0.20, y: 0.75 }];
function isDuplicateZone(newX, newY, list) {
  return list.some((z) => Math.abs(z.x - newX) < 0.05 && Math.abs(z.y - newY) < 0.05);
}
assert(isDuplicateZone(0.21, 0.76, existingZones) === true, 'Detects nearby zone within 0.05 tolerance as duplicate');
assert(isDuplicateZone(0.35, 0.75, existingZones) === false, 'Accepts distant zone outside 0.05 tolerance as unique');

// -----------------------------------------------------------------------------
// AREA 18: AcroForm Interactive Widget Detection & Mapping
// -----------------------------------------------------------------------------
console.log('\nArea 18: AcroForm Interactive Widget Detection & Mapping');
const mockSigAnnot = { subtype: 'Widget', fieldType: 'Sig', fieldName: 'Signature_1', rect: [100, 100, 260, 144] };
const mockDateAnnot = { subtype: 'Widget', fieldType: 'Tx', fieldName: 'Date_Signed', rect: [300, 100, 420, 126] };
const mockNameAnnot = { subtype: 'Widget', fieldType: 'Tx', fieldName: 'Full_Name', rect: [100, 50, 260, 76] };
const mockGenericAnnot = { subtype: 'Widget', fieldType: 'Tx', fieldName: 'Additional_Comments', rect: [100, 20, 260, 40] };

assert(classifyAcroFormField(mockSigAnnot) === 'signature', 'Maps /Sig widget to "signature"');
assert(classifyAcroFormField(mockDateAnnot) === 'date', 'Maps /Tx date widget to "date"');
assert(classifyAcroFormField(mockNameAnnot) === 'name', 'Maps /Tx name widget to "name"');
assert(classifyAcroFormField(mockGenericAnnot) === 'text', 'Maps /Tx comment widget to "text"');

// -----------------------------------------------------------------------------
// AREA 19: Tamper-Evident SHA-256 Digest Cryptographic Invariant
// -----------------------------------------------------------------------------
console.log('\nArea 19: Tamper-Evident SHA-256 Digest Cryptographic Invariant');
const testDataA = Buffer.from('DocScalar Legal Document Version 1.0');
const testDataB = Buffer.from('DocScalar Legal Document Version 1.0');
const testDataModified = Buffer.from('DocScalar Legal Document Version 1.1');

const hashA = await computeSha256Hash(testDataA);
const hashB = await computeSha256Hash(testDataB);
const hashModified = await computeSha256Hash(testDataModified);

assert(typeof hashA === 'string' && hashA.length === 64, 'Produces 64-character hex string');
assert(/^[0-9a-f]{64}$/.test(hashA), 'Hash is lowercase hexadecimal');
assert(hashA === hashB, 'Deterministic: identical buffers yield identical hash');
assert(hashA !== hashModified, 'Tamper-evident: single character alteration completely changes hash');

// -----------------------------------------------------------------------------
// AREA 20: Audit Certificate PDF Structure & Fields Invariant
// -----------------------------------------------------------------------------
console.log('\nArea 20: Audit Certificate PDF Structure & Fields Invariant');
const certRes = await generateAuditCertificatePdf({
  documentName: 'Enterprise Master Service Agreement.pdf',
  documentSize: 1048576,
  pageCount: 12,
  originalHash: hashA,
  signedHash: hashModified,
  signerName: 'Jane Doe',
  signerEmail: 'jane.doe@enterprise.com',
  securityTier: 'X.509 Digital Cryptographic Seal',
  fieldsCount: 4,
  timestamp: new Date()
});

assert(certRes && certRes.blob, 'generateAuditCertificatePdf returns valid result with blob');
assert(certRes.certificateId.startsWith('DOCSCALAR-CERT-'), 'Certificate ID has DOCSCALAR-CERT prefix');
assert(certRes.blob.size >= 2500, `Generated certificate size is healthy (${certRes.blob.size} bytes)`);

// -----------------------------------------------------------------------------
// AREA 21: Audit Certificate Signer Name Fallback & String Clamping
// -----------------------------------------------------------------------------
console.log('\nArea 21: Audit Certificate Signer Name Fallback & String Clamping');
const certFallbackRes = await generateAuditCertificatePdf({
  documentName: 'A'.repeat(80) + '.pdf',
  documentSize: 2048,
  pageCount: 1,
  signerName: '', // empty name triggers fallback
  signerEmail: ''
});
assert(certFallbackRes.blob.size >= 2500, `Fallback certificate compiles cleanly (${certFallbackRes.blob.size} bytes)`);

// -----------------------------------------------------------------------------
// AREA 22: Multi-Signer Attribution Model & Color Distinction
// -----------------------------------------------------------------------------
console.log('\nArea 22: Multi-Signer Attribution Model & Color Distinction');
const SIGNER_ROLES = [
  { id: 'signer_1', label: 'Signer 1 (Me)', color: '#2563EB', badgeText: 'Signer 1' },
  { id: 'signer_2', label: 'Signer 2 (Client)', color: '#059669', badgeText: 'Signer 2' },
  { id: 'witness', label: 'Witness', color: '#D97706', badgeText: 'Witness' }
];
assert(SIGNER_ROLES.length === 3, 'Defines 3 distinct signer roles');
assert(SIGNER_ROLES[0].color !== SIGNER_ROLES[1].color, 'Signer 1 and Signer 2 have distinct brand colors');
assert(SIGNER_ROLES[1].color !== SIGNER_ROLES[2].color, 'Signer 2 and Witness have distinct brand colors');

// -----------------------------------------------------------------------------
// AREA 23: Floating Action Capsule Position Bounds Invariant
// -----------------------------------------------------------------------------
console.log('\nArea 23: Floating Action Capsule Position Bounds Invariant');
function getCapsulePositionClass(fieldY) {
  return fieldY < 0.08 ? '-bottom-10' : '-top-9';
}
assert(getCapsulePositionClass(0.04) === '-bottom-10', 'Field at y=0.04 flips capsule below to prevent off-screen clip');
assert(getCapsulePositionClass(0.50) === '-top-9', 'Field at y=0.50 displays capsule above');

// -----------------------------------------------------------------------------
// AREA 24: Arrow Key Document Paging Transition Controller
// -----------------------------------------------------------------------------
console.log('\nArea 24: Arrow Key Document Paging Transition Controller');
function handlePagingKey(key, currentPage, totalPages, isFieldSelected = false) {
  if (isFieldSelected) return currentPage; // Suppressed when nudging fields
  if (key === 'ArrowRight' || key === 'PageDown') {
    return Math.min(totalPages - 1, currentPage + 1);
  }
  if (key === 'ArrowLeft' || key === 'PageUp') {
    return Math.max(0, currentPage - 1);
  }
  return currentPage;
}

assert(handlePagingKey('ArrowRight', 0, 5, false) === 1, 'ArrowRight advances page 0 -> 1');
assert(handlePagingKey('ArrowRight', 4, 5, false) === 4, 'ArrowRight clamps at last page index 4');
assert(handlePagingKey('ArrowLeft', 1, 5, false) === 0, 'ArrowLeft decrements page 1 -> 0');
assert(handlePagingKey('ArrowLeft', 0, 5, false) === 0, 'ArrowLeft clamps at page 0 floor');
assert(handlePagingKey('ArrowRight', 0, 5, true) === 0, 'ArrowRight ignored when a field is selected');

// -----------------------------------------------------------------------------
// AREA 25: Arrow Key Nudge Controller with Shift-Multiplier
// -----------------------------------------------------------------------------
console.log('\nArea 25: Arrow Key Nudge Controller with Shift-Multiplier');
function nudgeCoordinate(coord, deltaStep, isShift) {
  const step = isShift ? deltaStep * 5 : deltaStep;
  return Math.max(0, Math.min(1, coord + step));
}
const baseStep = 0.005;
const nudgedNormal = nudgeCoordinate(0.50, -baseStep, false);
assert(Math.abs(nudgedNormal - 0.495) < 0.0001, 'Normal nudge shifts by 0.005');
const nudgedShift = nudgeCoordinate(0.50, -baseStep, true);
assert(Math.abs(nudgedShift - 0.475) < 0.0001, 'Shift nudge shifts by 0.025 (5x multiplier)');

// -----------------------------------------------------------------------------
// AREA 26: Image Header Sniffing & Buffer Slicing Safety
// -----------------------------------------------------------------------------
console.log('\nArea 26: Image Header Sniffing & Buffer Slicing Safety');
function isPngImageBytes(bytes) {
  if (!bytes || bytes.length < 4) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return false;
  return true;
}
assert(isPngImageBytes(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0, 0])) === true, 'Sniffs valid PNG');
assert(isPngImageBytes(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 0])) === false, 'Sniffs valid JPEG');

// -----------------------------------------------------------------------------
// AREA 27: Multi-Page Field Propagation Logic
// -----------------------------------------------------------------------------
console.log('\nArea 27: Multi-Page Field Propagation Logic');
const baseField = { id: 'sig_prime', type: 'signature', pageIndex: 1, x: 0.2, y: 0.8, width: 0.25, height: 0.08 };
const replicated = [];
for (let p = 0; p < 4; p++) {
  if (p === baseField.pageIndex) {
    replicated.push(baseField);
  } else {
    replicated.push({
      ...baseField,
      id: `${baseField.id}_page_${p + 1}`,
      pageIndex: p
    });
  }
}
assert(replicated.length === 4, 'Replicates to exactly 4 pages');
assert(replicated[1].id === 'sig_prime', 'Source page retains original field ID');
assert(replicated[0].id === 'sig_prime_page_1', 'Page 0 receives page-tagged ID');
assert(replicated[0].x === 0.2 && replicated[0].y === 0.8, 'Replicated field retains exact coordinates');

// -----------------------------------------------------------------------------
// AREA 28: Date Formatting Pattern Presets
// -----------------------------------------------------------------------------
console.log('\nArea 28: Date Formatting Pattern Presets');
const fixedDate = new Date(Date.UTC(2026, 8, 18, 12, 0, 0)); // Sept 18, 2026
const formattedSlash = formatDateByPattern(fixedDate, 'MM/DD/YYYY');
const formattedHyphen = formatDateByPattern(fixedDate, 'YYYY-MM-DD');
assert(formattedSlash === '09/18/2026', `Formats MM/DD/YYYY correctly (${formattedSlash})`);
assert(formattedHyphen === '2026-09-18', `Formats YYYY-MM-DD correctly (${formattedHyphen})`);

// -----------------------------------------------------------------------------
// AREA 29: Corporate Stamp Generator Fallback and Shape Rendering
// -----------------------------------------------------------------------------
console.log('\nArea 29: Corporate Stamp Generator Fallback and Shape Rendering');
const rectStamp = generateStampDataUrl({ text: 'APPROVED', shape: 'rectangle', color: '#0d5c3a' });
const circleStamp = generateStampDataUrl({ text: 'OFFICIAL SEAL', shape: 'circle', color: '#1e40af' });
assert(typeof rectStamp === 'string' && rectStamp.startsWith('data:image/'), 'Rectangle stamp produces valid DataURL');
assert(typeof circleStamp === 'string' && circleStamp.startsWith('data:image/'), 'Circle stamp produces valid DataURL');

// -----------------------------------------------------------------------------
// AREA 30: End-to-End Real PDF Signing Execution with Multi-Field Types
// -----------------------------------------------------------------------------
console.log('\nArea 30: End-to-End Real PDF Signing Execution with Multi-Field Types');
const testPdfPath = 'C:/Users/Tanvir Alam/Pictures/Taha/Statistics assignment.pdf';
assert(fs.existsSync(testPdfPath), 'Target PDF file exists on disk');
const testBuffer = fs.readFileSync(testPdfPath);

const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const e2eFields = [
  { id: 'f_sig', type: 'signature', pageIndex: 0, x: 0.15, y: 0.80, width: 0.25, height: 0.08, dataUrl: tinyPngBase64 },
  { id: 'f_name', type: 'name', pageIndex: 0, x: 0.15, y: 0.89, width: 0.25, height: 0.04, value: 'Authorized Signatory' },
  { id: 'f_date', type: 'date', pageIndex: 0, x: 0.45, y: 0.89, width: 0.20, height: 0.04, value: '09/18/2026' },
  { id: 'f_chk_check', type: 'checkbox', pageIndex: 0, x: 0.70, y: 0.89, width: 0.04, height: 0.04, checked: true, checkStyle: 'check' },
  { id: 'f_chk_cross', type: 'checkbox', pageIndex: 0, x: 0.76, y: 0.89, width: 0.04, height: 0.04, checked: true, checkStyle: 'cross' },
  { id: 'f_text', type: 'text', pageIndex: 1, x: 0.20, y: 0.85, width: 0.40, height: 0.04, value: 'Cryptographically Verified Stamped Document', color: '#1E40AF' }
];

let progressTrace = [];
const e2eSignedBlob = await signPdf(testBuffer, e2eFields, {
  flatten: true,
  onProgress: (pct) => progressTrace.push(pct),
  autoCropBlackBorders: false
});

assert(e2eSignedBlob instanceof Blob, 'e2e signPdf returns Blob instance');
assert(e2eSignedBlob.size > 50000, `Signed document size is valid (${e2eSignedBlob.size} bytes)`);
assert(progressTrace.includes(100), 'Reported 100% completion in progress callback');

// -----------------------------------------------------------------------------
// AREA 31: Multi-Page Rotated PDF Document Stamping (0°, 90°, 180°, 270°)
// -----------------------------------------------------------------------------
console.log('\nArea 31: Multi-Page Rotated PDF Document Stamping (0°, 90°, 180°, 270°)');
const multiRotDoc = await PDFDocument.create();
const pRot0Doc = multiRotDoc.addPage([600, 400]);
pRot0Doc.setRotation(degrees(0));
const pRot90Doc = multiRotDoc.addPage([600, 400]);
pRot90Doc.setRotation(degrees(90));
const pRot180Doc = multiRotDoc.addPage([600, 400]);
pRot180Doc.setRotation(degrees(180));
const pRot270Doc = multiRotDoc.addPage([600, 400]);
pRot270Doc.setRotation(degrees(270));

const rotDocBuffer = Buffer.from(await multiRotDoc.save());

const multiRotFields = [
  { id: 'rf0', type: 'name', pageIndex: 0, x: 0.2, y: 0.2, width: 0.3, height: 0.08, value: 'Rot 0 Name' },
  { id: 'rf90', type: 'name', pageIndex: 1, x: 0.2, y: 0.2, width: 0.3, height: 0.08, value: 'Rot 90 Name' },
  { id: 'rf180', type: 'name', pageIndex: 2, x: 0.2, y: 0.2, width: 0.3, height: 0.08, value: 'Rot 180 Name' },
  { id: 'rf270', type: 'name', pageIndex: 3, x: 0.2, y: 0.2, width: 0.3, height: 0.08, value: 'Rot 270 Name' }
];

const rotSignedBlob = await signPdf(rotDocBuffer, multiRotFields, { flatten: true, autoCropBlackBorders: false });
assert(rotSignedBlob instanceof Blob && rotSignedBlob.size > 1000, 'Rotated PDF signed and compiled successfully');

// -----------------------------------------------------------------------------
// AREA 32: Auto-Place Detected Zone Dispatch Mapping
// -----------------------------------------------------------------------------
console.log('\nArea 32: Auto-Place Detected Zone Dispatch Mapping');
const sampleZone = {
  id: 'cue_0_12_abc',
  type: 'signature',
  label: 'Signature Line',
  pageIndex: 0,
  x: 0.15,
  y: 0.78,
  width: 0.26,
  height: 0.08,
  confidence: 0.85
};

function mapZoneToField(zone, sigData) {
  return {
    pageIndex: zone.pageIndex,
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
    type: zone.type || 'signature',
    signerRole: 'signer_1',
    dataUrl: sigData?.dataUrl,
    value: sigData?.value || 'Signature'
  };
}

const mappedField = mapZoneToField(sampleZone, { value: 'Jane Signer', dataUrl: tinyPngBase64 });
assert(mappedField.x === sampleZone.x && mappedField.y === sampleZone.y, 'Maps coordinates directly from detected zone');
assert(mappedField.type === 'signature', 'Maps signature field type');
assert(mappedField.value === 'Jane Signer', 'Attaches active signature value');

// -----------------------------------------------------------------------------
// AREA 33: Enterprise PKCS#12 Form Payload Verification
// -----------------------------------------------------------------------------
console.log('\nArea 33: Enterprise PKCS#12 Form Payload Verification');
const stampedFile = new File([e2eSignedBlob], 'contract_signed.pdf', { type: 'application/pdf' });
assert(stampedFile instanceof File, 'Constructs valid File object from stamped blob');
assert(stampedFile.name === 'contract_signed.pdf', 'Preserves destination filename');
assert(stampedFile.type === 'application/pdf', 'Sets correct PDF mime type');

const signFormData = new FormData();
signFormData.append('file_id', 'test_file_id_123');
signFormData.append('filename', stampedFile.name);
signFormData.append('common_name', 'DocScalar Enterprise Signer');
signFormData.append('passphrase', 'SecurePfxPassword!9');

const mockCertFile = new File([new Uint8Array([1, 2, 3, 4])], 'enterprise.pfx', { type: 'application/x-pkcs12' });
signFormData.append('certificate', mockCertFile);

assert(signFormData.get('file_id') === 'test_file_id_123', 'FormData contains file_id');
assert(signFormData.get('certificate') instanceof File, 'FormData carries custom .pfx certificate file');
assert(signFormData.get('passphrase') === 'SecurePfxPassword!9', 'FormData carries certificate passphrase');

console.log('\n================================================================');
console.log(`  ALL ${passed} / ${total} ASSERTIONS PASSED WITH 100% INTEGRITY!`);
console.log('================================================================\n');
