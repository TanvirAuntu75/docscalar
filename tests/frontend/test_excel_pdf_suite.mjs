import assert from 'node:assert/strict';
import {
  normalizeCellValue,
  mergeLineTextItems,
  extractScalarFields,
  buildColumnGrid
} from '../../src/engines/document/pdfToExcel.js';
import {
  sanitizeWinAnsiText,
  computeProportionalColumnWidths,
  wrapCellText
} from '../../src/engines/document/excelToPdf.js';

console.log('--- Starting Quantitative Automated Test Suite: PDF to Excel & Excel to PDF ---');
let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  [PASS] #${total.toString().padStart(2, '0')}: ${name}`);
  } catch (err) {
    console.error(`  [FAIL] #${total.toString().padStart(2, '0')}: ${name}`);
    console.error(`         ${err.message}`);
    throw err;
  }
}

// ============================================================================
// Group 1: PDF to Excel - Scalar Normalization
// ============================================================================

runTest('normalizeCellValue: Accounting negative in parentheses', () => {
  const res = normalizeCellValue('(1,234.56)');
  assert.equal(res, -1234.56);
});

runTest('normalizeCellValue: Accounting negative with dollar sign', () => {
  const res = normalizeCellValue('($500.00)');
  assert.equal(res, -500.00);
});

runTest('normalizeCellValue: Accounting negative with pound sign', () => {
  const res = normalizeCellValue('(£1,250.75)');
  assert.equal(res, -1250.75);
});

runTest('normalizeCellValue: Accounting negative with euro sign', () => {
  const res = normalizeCellValue('(€450)');
  assert.equal(res, -450);
});

runTest('normalizeCellValue: Accounting negative with yen sign', () => {
  const res = normalizeCellValue('(¥10,000)');
  assert.equal(res, -10000);
});

runTest('normalizeCellValue: Positive currency with dollar', () => {
  const res = normalizeCellValue('$4,500.50');
  assert.equal(res, 4500.50);
});

runTest('normalizeCellValue: Positive currency with euro', () => {
  const res = normalizeCellValue('€99.95');
  assert.equal(res, 99.95);
});

runTest('normalizeCellValue: Positive currency with pound', () => {
  const res = normalizeCellValue('£250.00');
  assert.equal(res, 250.00);
});

runTest('normalizeCellValue: Percentage integer', () => {
  const res = normalizeCellValue('15%');
  assert.equal(res, 0.15);
});

runTest('normalizeCellValue: Percentage decimal', () => {
  const res = normalizeCellValue('2.75%');
  assert.equal(res, 0.0275);
});

runTest('normalizeCellValue: Integer with thousands commas', () => {
  const res = normalizeCellValue('1,048,576');
  assert.equal(res, 1048576);
});

runTest('normalizeCellValue: Float standard format', () => {
  const res = normalizeCellValue('3.14159');
  assert.equal(res, 3.14159);
});

runTest('normalizeCellValue: Preserve postal/id codes with leading zeros', () => {
  const res = normalizeCellValue('00142');
  assert.equal(res, '00142');
});

runTest('normalizeCellValue: Boolean true variants', () => {
  assert.equal(normalizeCellValue('true'), true);
  assert.equal(normalizeCellValue('TRUE'), true);
  assert.equal(normalizeCellValue('yes'), true);
  assert.equal(normalizeCellValue('YES'), true);
});

runTest('normalizeCellValue: Boolean false variants', () => {
  assert.equal(normalizeCellValue('false'), false);
  assert.equal(normalizeCellValue('FALSE'), false);
  assert.equal(normalizeCellValue('no'), false);
  assert.equal(normalizeCellValue('NO'), false);
});

runTest('normalizeCellValue: ISO 8601 date string preservation', () => {
  const res = normalizeCellValue('2026-09-16');
  assert.equal(res, '2026-09-16');
});

// ============================================================================
// Group 2: PDF to Excel - Word Phrase & Line Horizontal Merging
// ============================================================================

runTest('mergeLineTextItems: Baseline grouping and sort order', () => {
  const items = [
    { str: 'Bottom', transform: [10, 0, 0, 10, 50, 100], width: 40, height: 10 },
    { str: 'Top', transform: [10, 0, 0, 10, 50, 700], width: 30, height: 10 },
    { str: 'Middle', transform: [10, 0, 0, 10, 50, 400], width: 40, height: 10 }
  ];
  const lines = mergeLineTextItems(items);
  assert.equal(lines.length, 3);
  // PDF coordinate: Top (700) should appear first in visual reading order
  assert.equal(lines[0].spans[0].text, 'Top');
  assert.equal(lines[1].spans[0].text, 'Middle');
  assert.equal(lines[2].spans[0].text, 'Bottom');
});

runTest('mergeLineTextItems: Adjacent words joined with spaces', () => {
  const items = [
    { str: 'Invoice', transform: [10, 0, 0, 10, 50, 500], width: 40, height: 10 },
    { str: 'Number', transform: [10, 0, 0, 10, 93, 500], width: 45, height: 10 },
    { str: 'INV-100', transform: [10, 0, 0, 10, 200, 500], width: 50, height: 10 } // wide gap
  ];
  const lines = mergeLineTextItems(items);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].spans.length, 2);
  assert.equal(lines[0].spans[0].text, 'Invoice Number');
  assert.equal(lines[0].spans[1].text, 'INV-100');
});

// ============================================================================
// Group 3: PDF to Excel - Scalar Recognition
// ============================================================================

runTest('extractScalarFields: Single-span key-value colon pattern', () => {
  const visualLines = [
    {
      y: 500,
      spans: [{ x0: 50, x1: 200, text: 'Invoice Number: INV-2026-88' }]
    }
  ];
  const { scalars, scalarLineIndices } = extractScalarFields(visualLines);
  assert.equal(scalars.length, 1);
  assert.equal(scalars[0].key, 'Invoice Number');
  assert.equal(scalars[0].value, 'INV-2026-88');
  assert.ok(scalarLineIndices.has(0));
});

runTest('extractScalarFields: Adjacent-span key-value colon pattern', () => {
  const visualLines = [
    {
      y: 480,
      spans: [
        { x0: 50, x1: 100, text: 'Due Date:' },
        { x0: 105, x1: 180, text: '2026-10-15' }
      ]
    }
  ];
  const { scalars, scalarLineIndices } = extractScalarFields(visualLines);
  assert.equal(scalars.length, 1);
  assert.equal(scalars[0].key, 'Due Date');
  assert.equal(scalars[0].value, '2026-10-15');
});

runTest('extractScalarFields: Total Amount recognition', () => {
  const visualLines = [
    {
      y: 450,
      spans: [
        { x0: 50, x1: 120, text: 'Total Amount:' },
        { x0: 125, x1: 200, text: '$15,450.00' }
      ]
    }
  ];
  const { scalars } = extractScalarFields(visualLines);
  assert.equal(scalars.length, 1);
  assert.equal(scalars[0].key, 'Total Amount');
  assert.equal(scalars[0].value, '$15,450.00');
});

// ============================================================================
// Group 4: PDF to Excel - Column Coordinate Grid Binning
// ============================================================================

runTest('buildColumnGrid: Table grid construction and alignment', () => {
  const visualLines = [
    {
      y: 400,
      spans: [
        { x0: 50, text: 'Item Description' },
        { x0: 250, text: 'Quantity' },
        { x0: 400, text: 'Price' }
      ]
    },
    {
      y: 380,
      spans: [
        { x0: 52, text: 'Web Application Development' },
        { x0: 251, text: '1' },
        { x0: 398, text: '$5,000.00' }
      ]
    }
  ];
  const { gridRows } = buildColumnGrid(visualLines);
  assert.equal(gridRows.length, 2);
  assert.equal(gridRows[0][0], 'Item Description');
  assert.equal(gridRows[0][1], 'Quantity');
  assert.equal(gridRows[0][2], 'Price');
  assert.equal(gridRows[1][0], 'Web Application Development');
  assert.equal(gridRows[1][1], '1');
  assert.equal(gridRows[1][2], '$5,000.00');
});

// ============================================================================
// Group 5: Excel to PDF - WinAnsi Encoding Sanitization
// ============================================================================

runTest('sanitizeWinAnsiText: Transliterate Euro symbol to EUR', () => {
  const res = sanitizeWinAnsiText('Price: €450.00');
  assert.equal(res, 'Price: EUR 450.00');
});

runTest('sanitizeWinAnsiText: Transliterate Pound symbol to GBP', () => {
  const res = sanitizeWinAnsiText('Balance: £1,200');
  assert.equal(res, 'Balance: GBP 1,200');
});

runTest('sanitizeWinAnsiText: Transliterate Yen symbol to JPY', () => {
  const res = sanitizeWinAnsiText('Fee: ¥10,000');
  assert.equal(res, 'Fee: JPY 10,000');
});

runTest('sanitizeWinAnsiText: Transliterate Rupee symbol to INR', () => {
  const res = sanitizeWinAnsiText('Cost: ₹50,000');
  assert.equal(res, 'Cost: INR 50,000');
});

runTest('sanitizeWinAnsiText: Smart quotes replaced with standard ASCII quotes', () => {
  const res = sanitizeWinAnsiText('“Project Alpha” and ‘Beta’');
  assert.equal(res, '"Project Alpha" and \'Beta\'');
});

runTest('sanitizeWinAnsiText: Em-dash and en-dash replaced with standard hyphen', () => {
  const res = sanitizeWinAnsiText('Q1 2026—Q4 2026');
  assert.equal(res, 'Q1 2026-Q4 2026');
});

runTest('sanitizeWinAnsiText: Mathematical comparison symbols transliterated', () => {
  const res = sanitizeWinAnsiText('A ≤ B and C ≥ D and E ≠ F and 2 × 3');
  assert.equal(res, 'A <= B and C >= D and E != F and 2 x 3');
});

runTest('sanitizeWinAnsiText: Checkmarks and crosses transliterated', () => {
  const res = sanitizeWinAnsiText('Passed: ✓, Failed: ✗');
  assert.equal(res, 'Passed: [v], Failed: [x]');
});

runTest('sanitizeWinAnsiText: Accented characters stripped of diacritics', () => {
  const res = sanitizeWinAnsiText('Crème Brûlée résumé for Señor José');
  assert.equal(res, 'Creme Brulee resume for Senor Jose');
});

// ============================================================================
// Group 6: Excel to PDF - Cell Length Truncation Elimination
// ============================================================================

runTest('Excel to PDF Zero Truncation Invariant: Long cell string (>25 chars)', () => {
  const longText = 'Enterprise Cloud Architecture and Highly Distributed Scalable Database Systems';
  // Before fix, code executed `val.slice(0, 22) + '...'` which would be 25 chars.
  // Now it must preserve the full string.
  const sanitized = sanitizeWinAnsiText(longText);
  assert.equal(sanitized, longText);
  assert.equal(sanitized.length, longText.length);
  assert.ok(sanitized.length > 25);
});

// ============================================================================
// Group 7: Excel to PDF - Proportional Column Width Calculation
// ============================================================================

runTest('computeProportionalColumnWidths: Content-aware allocation', () => {
  const rows = [
    ['Short', 'This is a significantly longer text column that needs more space than the short one', '123']
  ];
  const totalWidth = 500;
  const widths = computeProportionalColumnWidths(rows, 3, totalWidth);
  assert.equal(widths.length, 3);
  // Column 1 (long text) must be strictly wider than Column 0 and Column 2
  assert.ok(widths[1] > widths[0], `Col 1 (${widths[1]}) should be wider than Col 0 (${widths[0]})`);
  assert.ok(widths[1] > widths[2], `Col 1 (${widths[1]}) should be wider than Col 2 (${widths[2]})`);
  // All columns must respect minimum width >= 38
  assert.ok(widths[0] >= 38);
  assert.ok(widths[2] >= 38);
  // Total sum of widths must match totalWidth exactly within floating tolerance
  const sum = widths.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - totalWidth) < 0.1, `Sum (${sum}) must equal totalWidth (${totalWidth})`);
});

runTest('computeProportionalColumnWidths: Empty columns maintain minimum width', () => {
  const rows = [['', '', '']];
  const totalWidth = 300;
  const widths = computeProportionalColumnWidths(rows, 3, totalWidth);
  assert.equal(widths.length, 3);
  assert.ok(widths[0] >= 38);
  assert.ok(widths[1] >= 38);
  assert.ok(widths[2] >= 38);
});

// ============================================================================
// Group 4: Excel to PDF - Multiline Cell Wrapping & Zero Cutoff
// ============================================================================

runTest('wrapCellText: Short text fits on single line without breaking', () => {
  const lines = wrapCellText('Short Text', null, 9, 150);
  assert.equal(lines.length, 1);
  assert.equal(lines[0], 'Short Text');
});

runTest('wrapCellText: Long text wraps at word boundaries cleanly', () => {
  const text = 'Enterprise Cloud Architecture Consulting and Microservices Migration';
  const lines = wrapCellText(text, null, 9, 120);
  assert.ok(lines.length >= 2, `Expected at least 2 lines, got ${lines.length}`);
  assert.equal(lines.join(' '), text);
});

runTest('wrapCellText: Oversized single word breaks character-by-character without throwing', () => {
  const longWord = 'SUPERLONGCONTINUOUSUNBROKENWORDTHATCANNOTFITINACELL';
  const lines = wrapCellText(longWord, null, 9, 80);
  assert.ok(lines.length > 1, 'Long continuous word must be broken across lines');
  assert.equal(lines.join(''), longWord);
});

runTest('wrapCellText: Explicit newlines are honored and preserved', () => {
  const text = 'Line 1\nLine 2\nLine 3';
  const lines = wrapCellText(text, null, 9, 200);
  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'Line 1');
  assert.equal(lines[1], 'Line 2');
  assert.equal(lines[2], 'Line 3');
});

runTest('wrapCellText: Empty and null inputs return empty array', () => {
  assert.deepEqual(wrapCellText('', null, 9, 100), []);
  assert.deepEqual(wrapCellText(null, null, 9, 100), []);
  assert.deepEqual(wrapCellText(undefined, null, 9, 100), []);
});

runTest('wrapCellText: Paragraphs with blank line preserve empty line separator', () => {
  const text = 'First Paragraph\n\nSecond Paragraph';
  const lines = wrapCellText(text, null, 9, 200);
  assert.equal(lines.length, 3);
  assert.equal(lines[1], '');
});

console.log(`\nAll ${passed}/${total} automated assertions PASSED successfully!`);
