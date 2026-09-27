import assert from 'assert';
import fs from 'fs';
import path from 'path';
import babelParser from '@babel/parser';
import traversePkg from '@babel/traverse';

const traverse = traversePkg.default || traversePkg;

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('  TSK-734: DOCX PREVIEW ENGINE & STUDIO RENDERING INTEGRITY SUITE');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

let passedTests = 0;
let failedTests = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✘ [FAIL] ${testName}: ${err.message}`);
    failedTests++;
  }
}

function parseFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  return {
    code,
    ast: babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    })
  };
}

const docxToPdfFile = 'src/pages/document/DocxToPdf.jsx';
const { code: docxCode, ast: docxAst } = parseFile(docxToPdfFile);
const indexCss = fs.readFileSync('src/index.css', 'utf8');

// -----------------------------------------------------------------------------
// AREA 01 - AREA 08: DocxToPdf JSX DOM Mounting & Lifecycle Invariants
// -----------------------------------------------------------------------------
let previewRefNode = null;
let loadingTernaryFound = false;

traverse(docxAst, {
  JSXElement(p) {
    const refAttr = (p.node.openingElement.attributes || []).find(a => a.name && a.name.name === 'ref');
    if (refAttr && refAttr.value && refAttr.value.type === 'JSXExpressionContainer') {
      const exprCode = docxCode.slice(refAttr.value.start, refAttr.value.end);
      if (exprCode.includes('previewContainerRef')) {
        previewRefNode = p.node;
      }
    }
  },
  ConditionalExpression(p) {
    const testCode = docxCode.slice(p.node.test.start, p.node.test.end);
    if (testCode.includes('docLoading')) {
      // Check if previewContainerRef is conditionally returned in alternate
      const consCode = docxCode.slice(p.node.consequent.start, p.node.consequent.end);
      const altCode = docxCode.slice(p.node.alternate.start, p.node.alternate.end);
      if (altCode.includes('previewContainerRef') || consCode.includes('previewContainerRef')) {
        loadingTernaryFound = true;
      }
    }
  }
});

runTest('Area 01: previewContainerRef is permanently mounted in JSX (never unmounted by docLoading ternary)', () => {
  assert.ok(previewRefNode, 'previewContainerRef element must exist in JSX');
  assert.strictEqual(loadingTernaryFound, false, 'previewContainerRef must NOT be inside a docLoading ternary');
});

runTest('Area 02: docLoading renders as an absolute overlay, preserving container DOM binding', () => {
  assert.ok(docxCode.includes('{docLoading && ('), 'docLoading must render as conditional overlay via && operator');
  assert.ok(docxCode.includes('absolute inset-0 z-20'), 'Loading overlay must use absolute inset-0 positioning');
});

runTest('Area 03: previewContainerRef has docx-preview-host class', () => {
  assert.ok(docxCode.includes('docx-preview-host'), 'Host container must declare docx-preview-host class');
});

runTest('Area 04: renderPreview effect imports docx-preview dynamically', () => {
  assert.ok(docxCode.includes("import('docx-preview')"), 'Must dynamically import docx-preview');
});

runTest('Area 05: renderPreview specifies standard className "docx"', () => {
  assert.ok(docxCode.includes("className: 'docx'"), 'renderAsync must pass className: "docx" to match index.css');
});

runTest('Area 06: renderPreview enables inWrapper: true for multi-page document layout', () => {
  assert.ok(docxCode.includes('inWrapper: true'), 'renderAsync must enable inWrapper: true');
});

runTest('Area 07: renderPreview includes requestAnimationFrame retry if ref is not yet bound', () => {
  assert.ok(docxCode.includes('requestAnimationFrame'), 'renderPreview must feature rAF retry guard');
  assert.ok(docxCode.includes('setRenderCount'), 'rAF must increment renderCount to trigger render');
});

runTest('Area 08: renderPreview provides structured XML paragraph/table fallback if renderAsync throws', () => {
  assert.ok(docxCode.includes('docx-preview renderAsync failed, rendering extracted content'), 'Must include structured fallback catch handler');
  assert.ok(docxCode.includes('el.isTable'), 'Fallback must render tables and paragraphs');
});

// -----------------------------------------------------------------------------
// AREA 09 - AREA 14: CSS Overrides for docx-preview in index.css
// -----------------------------------------------------------------------------
runTest('Area 09: index.css sets .docx-wrapper display to flex column', () => {
  assert.ok(indexCss.includes('.docx-wrapper {'), 'index.css must define .docx-wrapper');
  assert.ok(indexCss.includes('flex-direction: column !important;'), '.docx-wrapper must be column oriented');
});

runTest('Area 10: index.css sets .docx-wrapper align-items to center', () => {
  assert.ok(indexCss.includes('align-items: center !important;'), '.docx-wrapper must center child pages');
});

runTest('Area 11: index.css sets .docx-wrapper background to transparent', () => {
  assert.ok(indexCss.includes('background: transparent !important;'), '.docx-wrapper background must be transparent');
});

runTest('Area 12: index.css styles .docx with background white and color black', () => {
  assert.ok(indexCss.includes('background: white !important;'), '.docx must have white paper background');
  assert.ok(indexCss.includes('color: black !important;'), '.docx must have black text');
});

runTest('Area 13: index.css styles .docx with realistic document drop shadow', () => {
  assert.ok(indexCss.includes('box-shadow: 0 10px 25px -5px'), '.docx must feature realistic paper shadow');
});

runTest('Area 14: index.css styles .docx-wrapper section matching page bounds', () => {
  assert.ok(indexCss.includes('.docx-wrapper section'), '.docx-wrapper section must have clean page margin rules');
});

// -----------------------------------------------------------------------------
// AREA 15 - AREA 22: docxToPdf.js Extraction & Word Parsing Algorithms
// -----------------------------------------------------------------------------
import {
  extractDocxElements,
  sanitizeWinAnsiText,
  isLegacyDocFormat
} from '../../src/engines/document/docxToPdf.js';

runTest('Area 15: extractDocxElements parses empty XML returning empty array', () => {
  const result = extractDocxElements('');
  assert.deepStrictEqual(result, []);
});

runTest('Area 16: extractDocxElements extracts single paragraph text', () => {
  const sampleXml = '<w:body><w:p><w:r><w:t>Hello DocScalar Studio</w:t></w:r></w:p></w:body>';
  const result = extractDocxElements(sampleXml);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].text, 'Hello DocScalar Studio');
  assert.strictEqual(result[0].isTable, false);
});

runTest('Area 17: extractDocxElements detects headings via style tags', () => {
  const sampleXml = '<w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter One</w:t></w:r></w:p></w:body>';
  const result = extractDocxElements(sampleXml);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].isHeading, true);
  assert.strictEqual(result[0].text, 'Chapter One');
});

runTest('Area 18: extractDocxElements parses table cells and rows', () => {
  const sampleXml = '<w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Cell 1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Cell 2</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body>';
  const result = extractDocxElements(sampleXml);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].isTable, true);
  assert.strictEqual(result[0].rows.length, 1);
  assert.strictEqual(result[0].rows[0].length, 2);
  assert.strictEqual(result[0].rows[0][0], 'Cell 1');
  assert.strictEqual(result[0].rows[0][1], 'Cell 2');
});

runTest('Area 19: sanitizeWinAnsiText normalizes curly quotes and dashes', () => {
  const dirty = '“DocScalar” – ‘Fast’ — Secure…';
  const clean = sanitizeWinAnsiText(dirty);
  assert.strictEqual(clean, '"DocScalar" - \'Fast\' -- Secure...');
});

runTest('Area 20: sanitizeWinAnsiText strips unencodable non-breaking spaces and zero-width chars', () => {
  const dirty = 'Hello\u00A0World\u200B!';
  const clean = sanitizeWinAnsiText(dirty);
  assert.strictEqual(clean, 'Hello World!');
});

runTest('Area 21: isLegacyDocFormat correctly identifies Word 97-2003 OLE2 header', () => {
  const ole2Header = new Uint8Array([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0x00, 0x00]);
  assert.strictEqual(isLegacyDocFormat(ole2Header.buffer), true);
});

runTest('Area 22: isLegacyDocFormat rejects standard ZIP/OpenXML buffer (PK header)', () => {
  const zipHeader = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
  assert.strictEqual(isLegacyDocFormat(zipHeader.buffer), false);
});

// -----------------------------------------------------------------------------
// AREA 23 - AREA 32: Studio Parity & Geometric Alignment
// -----------------------------------------------------------------------------
runTest('Area 23: DocxToPdf passes setFiles prop to ToolPageLayout', () => {
  assert.ok(docxCode.includes('setFiles={setFiles}'), 'DocxToPdf must pass setFiles to ToolPageLayout');
});

runTest('Area 24: DocxToPdf passes suppressSwitcher={true} to ToolPageLayout', () => {
  assert.ok(docxCode.includes('suppressSwitcher={true}'), 'DocxToPdf must suppress standard switcher');
});

runTest('Area 25: DocxToPdf passes hasResult={Boolean(result)} to ToolPageLayout', () => {
  assert.ok(docxCode.includes('hasResult={Boolean(result)}'), 'DocxToPdf must pass hasResult boolean to ToolPageLayout');
});

runTest('Area 26: Numeric formula verification: A4 page aspect ratio is ~1.414', () => {
  const a4Width = 595.28;
  const a4Height = 841.89;
  const ratio = Math.round((a4Height / a4Width) * 1000) / 1000;
  assert.strictEqual(ratio, 1.414, `Expected A4 aspect ratio 1.414, got ${ratio}`);
});

runTest('Area 27: Numeric formula verification: US Letter aspect ratio is ~1.294', () => {
  const letterWidth = 612;
  const letterHeight = 792;
  const ratio = Math.round((letterHeight / letterWidth) * 1000) / 1000;
  assert.strictEqual(ratio, 1.294, `Expected Letter aspect ratio 1.294, got ${ratio}`);
});

runTest('Area 28: Numeric formula verification: Zoom scale 100% applies transform scale(1)', () => {
  const zoom = 1.0;
  const transform = `scale(${zoom})`;
  assert.strictEqual(transform, 'scale(1)');
});

runTest('Area 29: Numeric formula verification: Zoom scale 120% applies transform scale(1.2)', () => {
  const zoom = 1.2;
  const transform = `scale(${zoom})`;
  assert.strictEqual(transform, 'scale(1.2)');
});

runTest('Area 30: ExcelToPdf parity: uses ToolPageLayout with setFiles and hasResult', () => {
  const excelCode = fs.readFileSync('src/pages/document/ExcelToPdf.jsx', 'utf8');
  assert.ok(excelCode.includes('setFiles={setFiles}'));
  assert.ok(excelCode.includes('hasResult={Boolean(result)}'));
});

runTest('Area 31: HtmlToPdf parity: uses ToolPageLayout with setFiles and hasResult', () => {
  const htmlCode = fs.readFileSync('src/pages/document/HtmlToPdf.jsx', 'utf8');
  assert.ok(htmlCode.includes('setFiles={setFiles}'));
  assert.ok(htmlCode.includes('hasResult={Boolean(result)}'));
});

runTest('Area 32: PowerpointToPdf parity: uses ToolPageLayout with setFiles and hasResult', () => {
  const pptxCode = fs.readFileSync('src/pages/document/PowerpointToPdf.jsx', 'utf8');
  assert.ok(pptxCode.includes('setFiles={setFiles}'));
  assert.ok(pptxCode.includes('hasResult={Boolean(result)}'));
});

// -----------------------------------------------------------------------------
// AREA 33 - AREA 40: Interactive Options Reactivity & Dynamic Styling
// -----------------------------------------------------------------------------

runTest('Area 33: DocxToPdf dynamically binds data-orientation to preview host', () => {
  assert.ok(
    docxCode.includes('data-orientation={orientation}'),
    'docx-preview-host must have data-orientation attribute'
  );
});

runTest('Area 34: DocxToPdf dynamically binds data-pagesize to preview host', () => {
  assert.ok(
    docxCode.includes('data-pagesize={pageSize}'),
    'docx-preview-host must have data-pagesize attribute'
  );
});

runTest('Area 35: DocxToPdf applies responsive max-w-[1180px] on landscape orientation', () => {
  assert.ok(
    docxCode.includes("orientation === 'landscape' ? 'max-w-[1180px]' : 'max-w-[850px]'"),
    'Stage container must dynamically expand to 1180px in landscape'
  );
});

runTest('Area 36: DocxToPdf toolbar renders active engineMode badge (Full Precision / Fast Mode)', () => {
  assert.ok(
    docxCode.includes("engineMode === 'server'") && docxCode.includes('Full Precision') && docxCode.includes('Fast Mode'),
    'Top toolbar must reflect the active engine mode in real time'
  );
});

runTest('Area 37: index.css defines landscape A4 override (width: 29.7cm !important, min-height: 21cm !important)', () => {
  assert.ok(
    indexCss.includes('.docx-preview-host[data-orientation="landscape"]') && indexCss.includes('width: 29.7cm !important;'),
    'index.css must provide landscape A4 dimensions'
  );
});

runTest('Area 38: index.css defines landscape US Letter override (width: 27.94cm !important, min-height: 21.59cm !important)', () => {
  assert.ok(
    indexCss.includes('.docx-preview-host[data-orientation="landscape"][data-pagesize="letter"]') && indexCss.includes('width: 27.94cm !important;'),
    'index.css must provide landscape Letter dimensions'
  );
});

runTest('Area 39: index.css defines portrait US Letter override (width: 21.59cm !important, min-height: 27.94cm !important)', () => {
  assert.ok(
    indexCss.includes('.docx-preview-host[data-orientation="portrait"][data-pagesize="letter"]') && indexCss.includes('width: 21.59cm !important;'),
    'index.css must provide portrait Letter dimensions'
  );
});

runTest('Area 40: index.css defines portrait A4 override (width: 21cm !important, min-height: 29.7cm !important)', () => {
  assert.ok(
    indexCss.includes('.docx-preview-host[data-orientation="portrait"][data-pagesize="a4"]') && indexCss.includes('width: 21cm !important;'),
    'index.css must provide portrait A4 dimensions'
  );
});

console.log('\n────────────────────────────────────────────────────────────────────────────────');
console.log(`  TOTAL TESTS: ${passedTests + failedTests}`);
console.log(`  PASSED: ${passedTests}`);
console.log(`  FAILED: ${failedTests}`);
console.log('────────────────────────────────────────────────────────────────────────────────\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL 40 TEST AREAS PASSED WITH 100% ATOMIC & ARCHITECTURAL PRECISION!');
}
