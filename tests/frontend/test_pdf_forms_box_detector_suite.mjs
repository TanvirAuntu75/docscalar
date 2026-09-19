/**
 * Molecular Test Suite for Form Box Detector Engine
 * 35+ Rigorous Assertions verifying edge-cases, math precision, and detection invariants.
 */

import assert from 'node:assert/strict';
import { detectCanvasFormBoxes } from '../../src/utils/pdfFormBoxDetector.js';

let passed = 0;
function check(desc, cond) {
  assert.ok(cond, `FAILED: ${desc}`);
  passed++;
  console.log(`  ✓ [${passed}] ${desc}`);
}

// Mock Canvas & Context implementation for pure Node.js execution
class MockContext2D {
  constructor(w, h, data) {
    this.canvas = { width: w, height: h };
    this.width = w;
    this.height = h;
    this.data = data || new Uint8ClampedArray(w * h * 4);
    // Fill with default background white (250, 250, 250, 255)
    if (!data) {
      for (let i = 0; i < this.data.length; i += 4) {
        this.data[i] = 250;
        this.data[i + 1] = 250;
        this.data[i + 2] = 250;
        this.data[i + 3] = 255;
      }
    }
  }

  drawImage(source, sx, sy, sw, sh) {
    // Copy/rescale from source mock canvas
    const srcData = source.getContext('2d').data;
    const srcW = source.width;
    const srcH = source.height;

    for (let y = 0; y < this.height; y++) {
      const srcY = Math.floor((y / this.height) * srcH);
      for (let x = 0; x < this.width; x++) {
        const srcX = Math.floor((x / this.width) * srcW);
        const srcIdx = (srcY * srcW + srcX) * 4;
        const dstIdx = (y * this.width + x) * 4;
        this.data[dstIdx] = srcData[srcIdx];
        this.data[dstIdx + 1] = srcData[srcIdx + 1];
        this.data[dstIdx + 2] = srcData[srcIdx + 2];
        this.data[dstIdx + 3] = srcData[srcIdx + 3];
      }
    }
  }

  getImageData(sx, sy, sw, sh) {
    return { data: this.data, width: sw, height: sh };
  }
}

class MockCanvas {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.ctx = new MockContext2D(w, h);
  }
  getContext(type) {
    return this.ctx;
  }
}

// Set up global environment for Node.js
globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') {
      return new MockCanvas(600, 800);
    }
    return {};
  }
};

function drawRectOnMockCanvas(mockCanvas, x, y, w, h, fillRGB = null, strokeRGB = null) {
  const d = mockCanvas.ctx.data;
  const W = mockCanvas.width;
  const H = mockCanvas.height;

  for (let py = y; py < y + h; py++) {
    if (py < 0 || py >= H) continue;
    for (let px = x; px < x + w; px++) {
      if (px < 0 || px >= W) continue;
      const idx = (py * W + px) * 4;
      const isEdge = (py === y || py === y + h - 1 || px === x || px === x + w - 1);

      if (isEdge && strokeRGB) {
        d[idx] = strokeRGB[0];
        d[idx + 1] = strokeRGB[1];
        d[idx + 2] = strokeRGB[2];
        d[idx + 3] = 255;
      } else if (fillRGB) {
        d[idx] = fillRGB[0];
        d[idx + 1] = fillRGB[1];
        d[idx + 2] = fillRGB[2];
        d[idx + 3] = 255;
      }
    }
  }
}

console.log('\n--- FORM BOX DETECTOR MOLECULAR TEST SUITE ---\n');

// 1. Boundary & Null safety
check('Empty canvas returns empty array', detectCanvasFormBoxes(null).length === 0);
check('Zero dimension canvas returns empty array', detectCanvasFormBoxes({ width: 0, height: 0 }).length === 0);
check('Blank page with no boxes returns 0 detected fields', detectCanvasFormBoxes(new MockCanvas(600, 800)).length === 0);

// 2. Shaded Input Box Detection
const canvas1 = new MockCanvas(600, 800);
// Draw a light grey shaded input box (e.g. name box: x=60, y=150, w=300, h=30)
drawRectOnMockCanvas(canvas1, 60, 150, 300, 30, [230, 230, 230]);
const detected1 = detectCanvasFormBoxes(canvas1, 0);
check('Detects shaded form input box', detected1.length === 1);
check('Detected field has startXPercent ~ 0.10', Math.abs(detected1[0].rect.startXPercent - 0.10) < 0.02);
check('Detected field has startYPercent ~ 0.187', Math.abs(detected1[0].rect.startYPercent - 0.187) < 0.02);
check('Detected field has width ~ 0.50', Math.abs((detected1[0].rect.endXPercent - detected1[0].rect.startXPercent) - 0.50) < 0.02);
check('Detected field has height ~ 0.037', Math.abs((detected1[0].rect.endYPercent - detected1[0].rect.startYPercent) - 0.0375) < 0.02);
check('Detected field type is text', detected1[0].type === 'text');
check('Detected field is single-line (not multiline)', detected1[0].multiline === false);
check('Detected field pageIndex is 0', detected1[0].pageIndex === 0);
check('Detected field has confidence score >= 0.28', detected1[0].confidence >= 0.28);

// 3. Dark Outlined (Bordered) Box Detection
const canvas2 = new MockCanvas(600, 800);
// Draw bordered box with dark outline: x=50, y=250, w=250, h=25, dark stroke [50, 50, 50]
drawRectOnMockCanvas(canvas2, 50, 250, 250, 25, null, [40, 40, 40]);
const detected2 = detectCanvasFormBoxes(canvas2, 0);
check('Detects outlined form box', detected2.length === 1);
check('Outlined box startXPercent is approx 0.083', Math.abs(detected2[0].rect.startXPercent - 0.083) < 0.02);
check('Outlined box startYPercent is approx 0.312', Math.abs(detected2[0].rect.startYPercent - 0.312) < 0.02);

// 4. Multiline Text Area Detection
const canvas3 = new MockCanvas(600, 800);
// Draw a large multiline address box: x=60, y=350, w=480, h=80 (height > 35pt / targetH * 0.038)
drawRectOnMockCanvas(canvas3, 60, 350, 480, 80, [232, 232, 232]);
const detected3 = detectCanvasFormBoxes(canvas3, 0);
check('Detects multiline text area', detected3.length === 1);
check('Multiline text area has multiline === true', detected3[0].multiline === true);
check('Multiline text area width is approx 0.80', Math.abs((detected3[0].rect.endXPercent - detected3[0].rect.startXPercent) - 0.80) < 0.03);

// 5. Checkbox Detection
const canvas4 = new MockCanvas(600, 800);
// Draw a small square checkbox: x=60, y=480, w=20, h=20 (square aspect ratio, small size)
drawRectOnMockCanvas(canvas4, 60, 480, 22, 22, [220, 220, 220], [50, 50, 50]);
const detected4 = detectCanvasFormBoxes(canvas4, 0);
check('Detects checkbox box', detected4.length === 1);
check('Checkbox detected has type === "checkbox"', detected4[0].type === 'checkbox');

// 6. Natural Reading Order (Top-to-Bottom, Left-to-Right)
const canvas5 = new MockCanvas(600, 800);
// Row 1: Left and Right fields
drawRectOnMockCanvas(canvas5, 50, 100, 200, 25, [230, 230, 230]); // Top-Left
drawRectOnMockCanvas(canvas5, 300, 100, 200, 25, [230, 230, 230]); // Top-Right
// Row 2: Full-width field
drawRectOnMockCanvas(canvas5, 50, 200, 450, 25, [230, 230, 230]); // Bottom
const detected5 = detectCanvasFormBoxes(canvas5, 0);
check('Detects all 3 fields in multi-field grid', detected5.length === 3);
check('Field 1 is Top-Left (startX < 0.2)', detected5[0].rect.startXPercent < 0.2);
check('Field 2 is Top-Right (startX > 0.4)', detected5[1].rect.startXPercent > 0.4);
check('Field 3 is Bottom row (startY > 0.2)', detected5[2].rect.startYPercent > 0.2);

// 7. Rejection of Full-Page Banners, Thin Dividers, and Noise Speckles
const canvas6 = new MockCanvas(600, 800);
// Very thin horizontal divider line: h=2
drawRectOnMockCanvas(canvas6, 20, 100, 560, 2, [50, 50, 50]);
// Tiny noise speckle: 4x4
drawRectOnMockCanvas(canvas6, 150, 200, 4, 4, [50, 50, 50]);
// Header banner: full width at y=50
drawRectOnMockCanvas(canvas6, 20, 50, 560, 15, [100, 100, 100]);
// Valid field:
drawRectOnMockCanvas(canvas6, 60, 300, 300, 30, [230, 230, 230]);
const detected6 = detectCanvasFormBoxes(canvas6, 0);
check('Rejects thin dividers, noise speckles, and header banners', detected6.length === 1);
check('Only the valid input box is returned', Math.abs(detected6[0].rect.startYPercent - 0.375) < 0.02);

// 8. Page Index Propagation
const canvas7 = new MockCanvas(600, 800);
drawRectOnMockCanvas(canvas7, 60, 200, 250, 25, [230, 230, 230]);
const detectedPage3 = detectCanvasFormBoxes(canvas7, 2);
check('Propagates pageIndex (page 3 -> index 2)', detectedPage3[0].pageIndex === 2);
check('Generates field name with page number: Field_3_1', detectedPage3[0].name === 'Field_3_1');
check('Generates label with page number: Field 3.1', detectedPage3[0].label === 'Field 3.1');

// 9. Coordinate Bounds Strict Invariant
for (const f of [...detected1, ...detected2, ...detected3, ...detected4, ...detected5, ...detected6, ...detectedPage3]) {
  check(`Field ${f.name} startXPercent in [0, 1]`, f.rect.startXPercent >= 0 && f.rect.startXPercent <= 1);
  check(`Field ${f.name} endXPercent in [0, 1]`, f.rect.endXPercent >= 0 && f.rect.endXPercent <= 1);
  check(`Field ${f.name} startYPercent in [0, 1]`, f.rect.startYPercent >= 0 && f.rect.startYPercent <= 1);
  check(`Field ${f.name} endYPercent in [0, 1]`, f.rect.endYPercent >= 0 && f.rect.endYPercent <= 1);
  check(`Field ${f.name} width is positive`, f.rect.endXPercent > f.rect.startXPercent);
  check(`Field ${f.name} height is positive`, f.rect.endYPercent > f.rect.startYPercent);
}

console.log(`\n===============================================================`);
console.log(`TOTAL BOX DETECTOR ASSERTIONS PASSED: ${passed} / ${passed}`);
console.log(`===============================================================\n`);
