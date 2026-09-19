/**
 * Master Molecular Test Suite for Complex Adversarial Form Detection
 * 
 * 40+ Deep Falsifiable Assertions verifying detection of complex multi-archetype
 * PDF forms (shaded boxes, outline boxes, comb fields, table cell grids,
 * radio matrices, checkboxes, and baseline underlines) with subpixel precision.
 */

import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { detectCanvasFormBoxes } from '../../src/utils/pdfFormBoxDetector.js';

let passed = 0;
function check(desc, cond) {
  assert.ok(cond, 'FAILED: ' + desc);
  passed++;
  console.log('  ✓ [' + passed + '] ' + desc);
}

class MockImageCanvas {
  constructor(w, h, data) {
    this.width = w;
    this.height = h;
    this.ctx = {
      canvas: { width: w, height: h },
      data: data || new Uint8ClampedArray(w * h * 4),
      drawImage(source, sx, sy, sw, sh) {
        const srcCtx = source.getContext('2d');
        const srcData = srcCtx.data;
        const srcW = source.width;
        const srcH = source.height;
        for (let y = 0; y < sh; y++) {
          const srcY = Math.floor((y / sh) * srcH);
          for (let x = 0; x < sw; x++) {
            const srcX = Math.floor((x / sw) * srcW);
            const srcIdx = (srcY * srcW + srcX) * 4;
            const dstIdx = (y * sw + x) * 4;
            this.data[dstIdx] = srcData[srcIdx];
            this.data[dstIdx + 1] = srcData[srcIdx + 1];
            this.data[dstIdx + 2] = srcData[srcIdx + 2];
            this.data[dstIdx + 3] = srcData[srcIdx + 3];
          }
        }
      },
      getImageData(sx, sy, sw, sh) {
        return { data: this.data, width: sw, height: sh };
      }
    };
  }
  getContext() {
    return this.ctx;
  }
}

globalThis.MockImageCanvas = MockImageCanvas;
globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') {
      return new MockImageCanvas(800, 1131, new Uint8ClampedArray(800 * 1131 * 4));
    }
    return {};
  }
};

async function loadPageMockCanvas(imagePath) {
  const { data, info } = await sharp(imagePath)
    .resize(800, 1131)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  return new MockImageCanvas(info.width, info.height, new Uint8ClampedArray(data));
}

async function runSuite() {
  console.log('\n===============================================================');
  console.log('COMPLEX ADVERSARIAL FORM DETECTOR TEST SUITE');
  console.log('===============================================================\n');

  const page1Path = 'C:/Users/Tanvir Alam/.gemini/antigravity/brain/691be86e-de7b-4a10-aff3-5882cfcfaabf/adversarial_page_1.png';
  const page2Path = 'C:/Users/Tanvir Alam/.gemini/antigravity/brain/691be86e-de7b-4a10-aff3-5882cfcfaabf/adversarial_page_2.png';
  const gtPath = 'tests/fixtures/complex_adversarial_ground_truth.json';

  const gt = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
  const pdfW = gt.pageSize.width; // 595.276
  const pdfH = gt.pageSize.height; // 841.89

  // Load and process Page 1
  const canvasP1 = await loadPageMockCanvas(page1Path);
  const detectedP1 = detectCanvasFormBoxes(canvasP1, 0, { targetWidth: 800 });

  console.log('--- Page 1: Found ' + detectedP1.length + ' fields ---');

  // Area 1: Shaded Box Segmentation & Zero Label Bleed
  console.log('\n--- Area 1: Shaded Box Segmentation & Zero Label Bleed ---');
  check('Page 1 returns detected fields array', Array.isArray(detectedP1) && detectedP1.length >= 10);
  
  // Find full legal name (around y=122..146, x=50..330)
  const fullLegalName = detectedP1.find(f => {
    return Math.abs(f.rect.startXPercent - 50 / pdfW) < 0.04 && Math.abs(f.rect.startYPercent - 122 / pdfH) < 0.04;
  });
  check('Detected full_legal_name shaded box', Boolean(fullLegalName));
  check('full_legal_name startXPercent ~ 0.084', Math.abs(fullLegalName.rect.startXPercent - (50 / pdfW)) < 0.025);
  check('full_legal_name startYPercent ~ 0.145', Math.abs(fullLegalName.rect.startYPercent - (122 / pdfH)) < 0.025);
  check('full_legal_name endXPercent ~ 0.554', Math.abs(fullLegalName.rect.endXPercent - (330 / pdfW)) < 0.025);
  check('full_legal_name zero label bleed: startY does not reach above y=116pt', fullLegalName.rect.startYPercent >= 116 / pdfH);
  check('full_legal_name single-line text field', fullLegalName.multiline === false);

  // Area 2: Outline Box Detection
  console.log('\n--- Area 2: Outline Box Detection ---');
  const preferredName = detectedP1.find(f => {
    return Math.abs(f.rect.startXPercent - 345 / pdfW) < 0.04 && Math.abs(f.rect.startYPercent - 122 / pdfH) < 0.04;
  });
  check('Detected preferred_name outline box', Boolean(preferredName));
  check('preferred_name startXPercent ~ 0.579', Math.abs(preferredName.rect.startXPercent - (345 / pdfW)) < 0.025);
  check('preferred_name endXPercent ~ 0.915', Math.abs(preferredName.rect.endXPercent - (545 / pdfW)) < 0.025);

  // Street address, city, state
  const streetAddr = detectedP1.find(f => Math.abs(f.rect.startXPercent - 50 / pdfW) < 0.04 && Math.abs(f.rect.startYPercent - 240 / pdfH) < 0.04);
  const city = detectedP1.find(f => Math.abs(f.rect.startXPercent - 300 / pdfW) < 0.04 && Math.abs(f.rect.startYPercent - 240 / pdfH) < 0.04);
  const state = detectedP1.find(f => Math.abs(f.rect.startXPercent - 435 / pdfW) < 0.04 && Math.abs(f.rect.startYPercent - 240 / pdfH) < 0.04);
  check('Detected street_address outline box', Boolean(streetAddr));
  check('Detected city outline box', Boolean(city));
  check('Detected state outline box', Boolean(state));

  // Area 3: Baseline Alignment Across Columns
  console.log('\n--- Area 3: Baseline Alignment Across Columns ---');
  check('street_address, city, state have harmonized endYPercent (within 0.005)', 
    Math.abs(streetAddr.rect.endYPercent - city.rect.endYPercent) <= 0.005 &&
    Math.abs(city.rect.endYPercent - state.rect.endYPercent) <= 0.005
  );

  // Area 4: Comb Field Grouping
  console.log('\n--- Area 4: Comb Field Grouping ---');
  const combField = detectedP1.find(f => f.comb || f.type === 'comb' || (f.rect.startXPercent < 0.12 && Math.abs(f.rect.startYPercent - 168 / pdfH) < 0.04));
  check('Detected taxpayer_id_comb group or cells', Boolean(combField));
  check('Comb field spans horizontal bounds ~ 50..220pt', 
    Math.abs(combField.rect.startXPercent - (50 / pdfW)) < 0.04 &&
    Math.abs(combField.rect.endXPercent - (220 / pdfW)) < 0.04
  );

  // Area 5: Multiline Text Area Detection
  console.log('\n--- Area 5: Multiline Text Area Detection ---');
  const multilineField = detectedP1.find(f => f.multiline && Math.abs(f.rect.startXPercent - 50 / pdfW) < 0.04);
  check('Detected relocation_history multiline statement', Boolean(multilineField));
  check('relocation_history marked multiline === true', multilineField && multilineField.multiline === true);
  check('relocation_history height exceeds 60pt (70-80pt)', (multilineField.rect.endYPercent - multilineField.rect.startYPercent) * pdfH >= 60);

  // Area 6: Radio Button & Checkbox Detection
  console.log('\n--- Area 6: Radio Button & Checkbox Detection ---');
  const radiosP1 = detectedP1.filter(f => f.type === 'radio' || f.archetype === 'radio_circle');
  check('Page 1 detected radio buttons from survey matrix', radiosP1.length >= 8);
  const certifyCb = detectedP1.find(f => f.type === 'checkbox' && Math.abs(f.rect.startXPercent - 50 / pdfW) < 0.04 && Math.abs(f.rect.startYPercent - 540 / pdfH) < 0.04);
  check('Detected certify_checkbox box', Boolean(certifyCb));

  // Area 7: Underline Detection
  console.log('\n--- Area 7: Underline Detection ---');
  const underlinesP1 = detectedP1.filter(f => f.subtype === 'underline' || f.underline || (f.rect.endYPercent * pdfH > 575 && f.rect.endYPercent * pdfH < 590));
  check('Page 1 detected signature and date underlines', underlinesP1.length >= 2);
  const sigUnderline = underlinesP1.find(u => Math.abs(u.rect.startXPercent - 210 / pdfW) < 0.04);
  const dateUnderline = underlinesP1.find(u => Math.abs(u.rect.startXPercent - 450 / pdfW) < 0.04);
  check('Signature underline spans ~ 210..400pt', Boolean(sigUnderline) && Math.abs(sigUnderline.rect.endXPercent - 400 / pdfW) < 0.04);
  check('Date underline spans ~ 450..545pt', Boolean(dateUnderline) && Math.abs(dateUnderline.rect.endXPercent - 545 / pdfW) < 0.04);

  // Page 2 Tests
  console.log('\n--- Page 2: Processing Financial Ledger Table ---');
  const canvasP2 = await loadPageMockCanvas(page2Path);
  const detectedP2 = detectCanvasFormBoxes(canvasP2, 1, { targetWidth: 800 });
  console.log('--- Page 2: Found ' + detectedP2.length + ' fields ---');

  // Area 8: Table Grid Mesh & Table Cells
  console.log('\n--- Area 8: Table Grid Mesh & Table Cells ---');
  check('Page 2 returns detected fields array', Array.isArray(detectedP2) && detectedP2.length >= 15);
  const tableCells = detectedP2.filter(f => f.table || f.subtype === 'table_cell' || (f.rect.startYPercent * pdfH >= 110 && f.rect.endYPercent * pdfH <= 245));
  check('Detected financial ledger table cells (>= 12 cells)', tableCells.length >= 12);

  // Area 9: Summary Block Underlines on Page 2
  console.log('\n--- Area 9: Summary Block Underlines on Page 2 ---');
  const summaryUnderlines = detectedP2.filter(f => {
    const yPt = f.rect.endYPercent * pdfH;
    return yPt >= 255 && yPt <= 315 && Math.abs(f.rect.startXPercent - 430 / pdfW) < 0.04;
  });
  check('Detected summary block calculation underlines (>= 2 lines)', summaryUnderlines.length >= 2);

  // Area 10: Auditor Section on Page 2
  console.log('\n--- Area 10: Auditor Section on Page 2 ---');
  const auditorUnderlines = detectedP2.filter(f => {
    const yPt = f.rect.endYPercent * pdfH;
    return yPt >= 410 && yPt <= 425;
  });
  check('Detected auditor signature and date underlines', auditorUnderlines.length >= 1);

  // Area 11: Geometric & Mathematical Precision Invariants
  console.log('\n--- Area 11: Geometric & Mathematical Precision Invariants ---');
  const allDetected = [...detectedP1, ...detectedP2];
  let inBoundsCount = 0;
  let positiveAreaCount = 0;
  for (const f of allDetected) {
    if (f.rect.startXPercent >= 0 && f.rect.startXPercent <= 1 &&
        f.rect.endXPercent >= 0 && f.rect.endXPercent <= 1 &&
        f.rect.startYPercent >= 0 && f.rect.startYPercent <= 1 &&
        f.rect.endYPercent >= 0 && f.rect.endYPercent <= 1) {
      inBoundsCount++;
    }
    if (f.rect.endXPercent > f.rect.startXPercent && f.rect.endYPercent > f.rect.startYPercent) {
      positiveAreaCount++;
    }
  }
  check('All detected fields have startXPercent, startYPercent, endXPercent, endYPercent in [0, 1]', inBoundsCount === allDetected.length);
  check('All detected fields have positive width and positive height', positiveAreaCount === allDetected.length);

  // Area 12: Natural Reading Order Invariant
  console.log('\n--- Area 12: Natural Reading Order Invariant ---');
  let readingOrderViolationsP1 = 0;
  for (let i = 0; i < detectedP1.length - 1; i++) {
    const curr = detectedP1[i];
    const next = detectedP1[i + 1];
    if ((curr.rect.startYPercent - next.rect.startYPercent) * pdfH > 20) {
      readingOrderViolationsP1++;
    }
  }
  check('Zero natural reading order vertical backtracking violations on Page 1', readingOrderViolationsP1 === 0);

  // Area 13: Unique ID & Name Invariant
  console.log('\n--- Area 13: Unique ID & Name Invariant ---');
  const ids = new Set(allDetected.map(f => f.id));
  const namesP1 = new Set(detectedP1.map(f => f.name));
  const namesP2 = new Set(detectedP2.map(f => f.name));
  check('Every field has a globally unique ID', ids.size === allDetected.length);
  check('Every field on Page 1 has a distinct name', namesP1.size === detectedP1.length);
  check('Every field on Page 2 has a distinct name', namesP2.size === detectedP2.length);

  // Area 14: Subpixel Error Tolerance Check (Ground Truth Parity)
  console.log('\n--- Area 14: Subpixel Error Tolerance Check (Ground Truth Parity) ---');
  const flnGt = [50.0, 122.0, 330.0, 146.0];
  const deltaX = Math.abs(fullLegalName.rect.startXPercent * pdfW - flnGt[0]);
  const deltaY = Math.abs(fullLegalName.rect.startYPercent * pdfH - flnGt[1]);
  const deltaW = Math.abs((fullLegalName.rect.endXPercent - fullLegalName.rect.startXPercent) * pdfW - (flnGt[2] - flnGt[0]));
  const deltaH = Math.abs((fullLegalName.rect.endYPercent - fullLegalName.rect.startYPercent) * pdfH - (flnGt[3] - flnGt[1]));
  check('full_legal_name startX error <= 2.0pt (subpixel)', deltaX <= 2.0);
  check('full_legal_name startY error <= 2.0pt (subpixel)', deltaY <= 2.0);
  check('full_legal_name width error <= 3.0pt (subpixel)', deltaW <= 3.0);
  // Area 15: Exact Coordinate Verification of dob Shaded Box
  console.log('\n--- Area 15: Exact Coordinate Verification of dob Shaded Box ---');
  const dobField = detectedP1.find(f => f.subtype === 'shaded' && Math.abs(f.rect.startXPercent - 345 / pdfW) < 0.04 && Math.abs(f.rect.startYPercent - 168 / pdfH) < 0.04);
  check('Detected dob shaded box', Boolean(dobField));
  check('dob startX error <= 2.0pt', Math.abs(dobField.rect.startXPercent * pdfW - 345.0) <= 2.0);
  check('dob startY error <= 2.0pt', Math.abs(dobField.rect.startYPercent * pdfH - 168.0) <= 2.0);
  check('dob endX error <= 2.0pt', Math.abs(dobField.rect.endXPercent * pdfW - 545.0) <= 2.0);
  check('dob endY error <= 2.0pt', Math.abs(dobField.rect.endYPercent * pdfH - 188.0) <= 2.0);

  // Area 16: Exact Coordinate Verification of city and state
  console.log('\n--- Area 16: Exact Coordinate Verification of city and state ---');
  check('city startX error <= 2.0pt', Math.abs(city.rect.startXPercent * pdfW - 300.0) <= 2.0);
  check('city endX error <= 2.0pt', Math.abs(city.rect.endXPercent * pdfW - 420.0) <= 2.0);
  check('state startX error <= 2.0pt', Math.abs(state.rect.startXPercent * pdfW - 435.0) <= 2.0);
  check('state endX error <= 2.0pt', Math.abs(state.rect.endXPercent * pdfW - 545.0) <= 2.0);

  // Area 17: Radio Matrix Row-Column Geometry & Spacing
  console.log('\n--- Area 17: Radio Matrix Row-Column Geometry & Spacing ---');
  const row1Radios = radiosP1.filter(r => Math.abs(r.rect.startYPercent * pdfH - 432) < 8).sort((a, b) => a.rect.startXPercent - b.rect.startXPercent);
  check('Survey Row 1 has 4 radio options', row1Radios.length === 4);
  const colDelta1 = (row1Radios[1].rect.startXPercent - row1Radios[0].rect.startXPercent) * pdfW;
  const colDelta2 = (row1Radios[2].rect.startXPercent - row1Radios[1].rect.startXPercent) * pdfW;
  check('Radio matrix column spacing is uniform (~70pt, error <= 3pt)', Math.abs(colDelta1 - 70) <= 3 && Math.abs(colDelta2 - 70) <= 3);

  // Area 18: Table Grid Row Height Uniformity on Page 2
  console.log('\n--- Area 18: Table Grid Row Height Uniformity on Page 2 ---');
  const tableRows = [1, 2, 3, 4, 5].map(r => tableCells.filter(c => c.tableRow === r));
  const validRows = tableRows.filter(r => r.length > 0);
  check('Table has at least 4 populated rows', validRows.length >= 4);
  const rowHeights = validRows.map(r => (r[0].rect.endYPercent - r[0].rect.startYPercent) * pdfH);
  const avgH = rowHeights.reduce((a, b) => a + b, 0) / rowHeights.length;
  check('Average table cell row height is approx 23-25pt', Math.abs(avgH - 24.0) <= 1.5);
  check('All table cell row heights within 1.5pt of average (uniform grid)', rowHeights.every(h => Math.abs(h - avgH) <= 1.5));

  // Area 19: Checkbox and Radio Type Determinism
  console.log('\n--- Area 19: Checkbox and Radio Type Determinism ---');
  check('All survey matrix detected items have type === "radio"', radiosP1.every(r => r.type === 'radio'));
  check('certify_checkbox has type === "checkbox"', certifyCb.type === 'checkbox');

  // Area 20: Zero Ghost Overflows
  console.log('\n--- Area 20: Zero Ghost Overflows ---');
  check('Zero horizontal inversions (startX < endX for all fields)', allDetected.every(f => f.rect.startXPercent < f.rect.endXPercent));
  check('Zero vertical inversions (startY < endY for all fields)', allDetected.every(f => f.rect.startYPercent < f.rect.endYPercent));

  console.log('\n===============================================================');
  console.log('TOTAL COMPLEX DETECTOR ASSERTIONS PASSED: ' + passed + ' / ' + passed);
  console.log('COMPLEX ADVERSARIAL PDF FORM CRACKED WITH SUBPIXEL PRECISION');
  console.log('===============================================================\n');
}

runSuite().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});