import assert from 'assert';
import fs from 'fs';
import path from 'path';
import babelParser from '@babel/parser';
import traversePkg from '@babel/traverse';

// Ensure Promise.withResolvers is polyfilled for Node < 22 test runners
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function withResolvers() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const { getPdfjsDocParams, CMAP_URL, CMAP_PACKED, STANDARD_FONT_DATA_URL } = await import('../../src/utils/pdfConfig.js');

const traverse = traversePkg.default || traversePkg;

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('  TSK-734: SPLIT PDF & PDF LOADING LIFECYCLE MOLECULAR VERIFICATION SUITE');
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

function parseJSX(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  return {
    code,
    ast: babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    })
  };
}

// =============================================================================
// AREA 01 - AREA 10: SplitPdf.jsx Lifecycle & State Separation
// =============================================================================
const splitCode = fs.readFileSync('src/pages/pdf/SplitPdf.jsx', 'utf8');
const splitAst = babelParser.parse(splitCode, { sourceType: 'module', plugins: ['jsx'] });

runTest('Area 01: SplitPdf imports loadPdfDocument from pdfConfig', () => {
  let hasImport = false;
  traverse(splitAst, {
    ImportDeclaration(p) {
      if (p.node.source.value.includes('pdfConfig')) {
        const spec = p.node.specifiers.find(s => s.imported && s.imported.name === 'loadPdfDocument');
        if (spec) hasImport = true;
      }
    }
  });
  assert.strictEqual(hasImport, true, 'SplitPdf.jsx must import loadPdfDocument from pdfConfig');
});

runTest('Area 02: SplitPdf declares dedicated docLoading state initialized to false', () => {
  let foundDocLoading = false;
  traverse(splitAst, {
    VariableDeclarator(p) {
      if (p.node.id.type === 'ArrayPattern' && p.node.id.elements[0]?.name === 'docLoading') {
        const initCall = p.node.init;
        if (initCall?.callee?.name === 'useState' && initCall.arguments[0]?.value === false) {
          foundDocLoading = true;
        }
      }
    }
  });
  assert.strictEqual(foundDocLoading, true, 'SplitPdf must define const [docLoading, setDocLoading] = useState(false)');
});

runTest('Area 03: SplitPdf loadPdfThumbnails invokes setDocLoading(true) on load', () => {
  const match = splitCode.match(/const\s+loadPdfThumbnails\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)(?:setTimeout|catch)/);
  assert.ok(match, 'loadPdfThumbnails function body must exist');
  assert.ok(match[1].includes('setDocLoading(true)'), 'loadPdfThumbnails must call setDocLoading(true)');
});

runTest('Area 04: SplitPdf loadPdfThumbnails NEVER sets processing to true upon file upload', () => {
  const match = splitCode.match(/const\s+loadPdfThumbnails\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)loadPdfThumbnails\(\);/);
  assert.ok(match, 'loadPdfThumbnails function body must exist');
  assert.ok(!match[1].includes('setProcessing(true)'), 'loadPdfThumbnails must NOT call setProcessing(true)');
});

runTest('Area 05: SplitPdf uses loadPdfDocument to parse incoming file buffer', () => {
  const match = splitCode.match(/const\s+loadPdfThumbnails\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)loadPdfThumbnails\(\);/);
  assert.ok(match, 'loadPdfThumbnails function body must exist');
  assert.ok(match[1].includes('loadPdfDocument(arrayBuffer).promise'), 'Must use loadPdfDocument(arrayBuffer).promise');
});

runTest('Area 06: SplitPdf resets docLoading to false on completion and in catch', () => {
  const match = splitCode.match(/const\s+loadPdfThumbnails\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)loadPdfThumbnails\(\);/);
  assert.ok(match, 'loadPdfThumbnails function body must exist');
  assert.ok(match[1].includes('setDocLoading(false);'), 'SplitPdf must call setDocLoading(false) on success');
  assert.ok(match[1].includes("setDocLoading(false); setError('Failed to parse PDF document.');"), 'SplitPdf catch block must call setDocLoading(false)');
});

runTest('Area 07: SplitPdf renders reading document pages indicator when docLoading is true', () => {
  assert.ok(splitCode.includes('docLoading ?'), 'workspace-canvas must branch on docLoading');
  assert.ok(splitCode.includes('Reading document pages...'), 'Must render "Reading document pages..." text on canvas');
});

runTest('Area 08: SplitPdf split CTA button disabled state checks docLoading', () => {
  const btnMatch = splitCode.match(/<button[\s\S]*?onClick=\{handleSplit\}[\s\S]*?>/);
  assert.ok(btnMatch, 'Primary split button must exist');
  assert.ok(btnMatch[0].includes('docLoading'), 'Split button disabled property must include docLoading');
});

runTest('Area 09: SplitPdf split CTA button renders loading label when docLoading is true', () => {
  assert.ok(splitCode.includes('Loading Pages...'), 'CTA button must show Loading Pages... when docLoading');
});

runTest('Area 10: SplitPdf processing state is reserved strictly for handleSplit execution', () => {
  const processingTrueMatches = [...splitCode.matchAll(/setProcessing\s*\(\s*true\s*\)/g)];
  assert.strictEqual(processingTrueMatches.length, 1, 'setProcessing(true) must be called exactly once in SplitPdf.jsx');
  const handleSplitMatch = splitCode.match(/const\s+handleSplit\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)try\s*\{/);
  assert.ok(handleSplitMatch && handleSplitMatch[1].includes('setProcessing(true)'), 'setProcessing(true) must be inside handleSplit');
});

// =============================================================================
// AREA 11 - AREA 20: CropPdf.jsx Lifecycle & State Separation
// =============================================================================
const cropCode = fs.readFileSync('src/pages/pdf/CropPdf.jsx', 'utf8');
const cropAst = babelParser.parse(cropCode, { sourceType: 'module', plugins: ['jsx'] });

runTest('Area 11: CropPdf imports loadPdfDocument from pdfConfig', () => {
  let hasImport = false;
  traverse(cropAst, {
    ImportDeclaration(p) {
      if (p.node.source.value.includes('pdfConfig')) {
        const spec = p.node.specifiers.find(s => s.imported && s.imported.name === 'loadPdfDocument');
        if (spec) hasImport = true;
      }
    }
  });
  assert.strictEqual(hasImport, true, 'CropPdf.jsx must import loadPdfDocument from pdfConfig');
});

runTest('Area 12: CropPdf declares docLoading state initialized to false', () => {
  assert.ok(cropCode.includes('const [docLoading, setDocLoading] = useState(false);'), 'CropPdf must declare docLoading state');
});

runTest('Area 13: CropPdf loadPdf invokes setDocLoading(true) on load', () => {
  const match = cropCode.match(/const\s+loadPdf\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)try/);
  assert.ok(match && match[1].includes('setDocLoading(true)'), 'loadPdf must call setDocLoading(true)');
});

runTest('Area 14: CropPdf loadPdf NEVER sets processing to true upon file upload', () => {
  const match = cropCode.match(/const\s+loadPdf\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)(?:loadPdf\(\);)/);
  assert.ok(match, 'loadPdf body found');
  assert.ok(!match[1].includes('setProcessing(true)'), 'loadPdf must NOT call setProcessing(true)');
});

runTest('Area 15: CropPdf uses loadPdfDocument to parse incoming file buffer', () => {
  const match = cropCode.match(/const\s+loadPdf\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)(?:loadPdf\(\);)/);
  assert.ok(match[1].includes('loadPdfDocument(arrayBuffer).promise'), 'Must use loadPdfDocument(arrayBuffer).promise');
});

runTest('Area 16: CropPdf resets docLoading to false on completion and in catch', () => {
  assert.ok(cropCode.includes('setDocLoading(false);'), 'CropPdf must call setDocLoading(false) on success');
  const catchMatch = cropCode.match(/catch\s*\(err\)\s*\{([\s\S]*?)\}\s*;\s*loadPdf/);
  assert.ok(catchMatch && catchMatch[1].includes('setDocLoading(false)'), 'CropPdf catch block must call setDocLoading(false)');
});

runTest('Area 17: CropPdf renders reading document pages indicator when docLoading is true', () => {
  assert.ok(cropCode.includes('Reading document pages...'), 'Must render "Reading document pages..." text on canvas');
});

runTest('Area 18: CropPdf crop CTA button disabled state checks docLoading', () => {
  const btnMatch = cropCode.match(/<button[\s\S]*?onClick=\{handleCrop\}[\s\S]*?>/);
  assert.ok(btnMatch, 'Primary crop button must exist');
  assert.ok(btnMatch[0].includes('docLoading'), 'Crop button disabled property must include docLoading');
});

runTest('Area 19: CropPdf crop CTA button renders loading label when docLoading is true', () => {
  assert.ok(cropCode.includes('Loading Document...'), 'CTA button must show Loading Document... when docLoading');
});

runTest('Area 20: CropPdf processing state is reserved strictly for handleCrop execution', () => {
  const processingTrueMatches = [...cropCode.matchAll(/setProcessing\s*\(\s*true\s*\)/g)];
  assert.strictEqual(processingTrueMatches.length, 1, 'setProcessing(true) must be called exactly once in CropPdf.jsx');
  const handleCropMatch = cropCode.match(/const\s+handleCrop\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)try\s*\{/);
  assert.ok(handleCropMatch && handleCropMatch[1].includes('setProcessing(true)'), 'setProcessing(true) must be inside handleCrop');
});

// =============================================================================
// AREA 21 - AREA 30: RotatePdf.jsx Lifecycle & State Separation
// =============================================================================
const rotateCode = fs.readFileSync('src/pages/pdf/RotatePdf.jsx', 'utf8');
const rotateAst = babelParser.parse(rotateCode, { sourceType: 'module', plugins: ['jsx'] });

runTest('Area 21: RotatePdf imports loadPdfDocument from pdfConfig', () => {
  let hasImport = false;
  traverse(rotateAst, {
    ImportDeclaration(p) {
      if (p.node.source.value.includes('pdfConfig')) {
        const spec = p.node.specifiers.find(s => s.imported && s.imported.name === 'loadPdfDocument');
        if (spec) hasImport = true;
      }
    }
  });
  assert.strictEqual(hasImport, true, 'RotatePdf.jsx must import loadPdfDocument from pdfConfig');
});

runTest('Area 22: RotatePdf declares docLoading state initialized to false', () => {
  assert.ok(rotateCode.includes('const [docLoading, setDocLoading] = useState(false);'), 'RotatePdf must declare docLoading state');
});

runTest('Area 23: RotatePdf loadNewFiles invokes setDocLoading(true) on load', () => {
  const match = rotateCode.match(/const\s+loadNewFiles\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)try/);
  assert.ok(match && match[1].includes('setDocLoading(true)'), 'loadNewFiles must call setDocLoading(true)');
});

runTest('Area 24: RotatePdf loadNewFiles NEVER sets processing to true upon file upload', () => {
  const match = rotateCode.match(/const\s+loadNewFiles\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)(?:loadNewFiles\(\);)/);
  assert.ok(match, 'loadNewFiles body found');
  assert.ok(!match[1].includes('setProcessing(true)'), 'loadNewFiles must NOT call setProcessing(true)');
});

runTest('Area 25: RotatePdf uses loadPdfDocument to parse incoming file buffers', () => {
  const match = rotateCode.match(/const\s+loadNewFiles\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)(?:loadNewFiles\(\);)/);
  assert.ok(match[1].includes('loadPdfDocument(arrayBuffer).promise'), 'Must use loadPdfDocument(arrayBuffer).promise');
});

runTest('Area 26: RotatePdf resets docLoading to false on completion and in catch', () => {
  assert.ok(rotateCode.includes('setDocLoading(false);'), 'RotatePdf must call setDocLoading(false) on success');
  const catchMatch = rotateCode.match(/catch\s*\(err\)\s*\{([\s\S]*?)\}\s*;\s*loadNewFiles/);
  assert.ok(catchMatch && catchMatch[1].includes('setDocLoading(false)'), 'RotatePdf catch block must call setDocLoading(false)');
});

runTest('Area 27: RotatePdf renders reading document pages indicator when docLoading is true', () => {
  assert.ok(rotateCode.includes('Reading document pages...'), 'Must render "Reading document pages..." text on canvas');
});

runTest('Area 28: RotatePdf rotate CTA button disabled state checks docLoading', () => {
  const btnMatch = rotateCode.match(/<button[\s\S]*?onClick=\{handleRotate\}[\s\S]*?>/);
  assert.ok(btnMatch, 'Primary rotate button must exist');
  assert.ok(btnMatch[0].includes('docLoading'), 'Rotate button disabled property must include docLoading');
});

runTest('Area 29: RotatePdf rotate CTA button renders loading label when docLoading is true', () => {
  assert.ok(rotateCode.includes('Loading Pages...'), 'CTA button must show Loading Pages... when docLoading');
});

runTest('Area 30: RotatePdf processing state is reserved strictly for handleRotate execution', () => {
  const processingTrueMatches = [...rotateCode.matchAll(/setProcessing\s*\(\s*true\s*\)/g)];
  assert.strictEqual(processingTrueMatches.length, 1, 'setProcessing(true) must be called exactly once in RotatePdf.jsx');
  const handleRotateMatch = rotateCode.match(/const\s+handleRotate\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)try\s*\{/);
  assert.ok(handleRotateMatch && handleRotateMatch[1].includes('setProcessing(true)'), 'setProcessing(true) must be inside handleRotate');
});

// =============================================================================
// AREA 31 - AREA 38: OrganizePdf.jsx Lifecycle & State Separation
// =============================================================================
const orgCode = fs.readFileSync('src/pages/pdf/OrganizePdf.jsx', 'utf8');

runTest('Area 31: OrganizePdf declares docLoading state initialized to false', () => {
  assert.ok(orgCode.includes('const [docLoading, setDocLoading] = useState(false);'), 'OrganizePdf must declare docLoading state');
});

runTest('Area 32: OrganizePdf loadNewFiles invokes setDocLoading(true) on load', () => {
  const match = orgCode.match(/const\s+loadNewFiles\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)try/);
  assert.ok(match && match[1].includes('setDocLoading(true)'), 'loadNewFiles must call setDocLoading(true)');
});

runTest('Area 33: OrganizePdf loadNewFiles NEVER sets processing to true upon file upload', () => {
  const match = orgCode.match(/const\s+loadNewFiles\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)(?:loadNewFiles\(\);)/);
  assert.ok(match, 'loadNewFiles body found');
  assert.ok(!match[1].includes('setProcessing(true)'), 'loadNewFiles must NOT call setProcessing(true)');
});

runTest('Area 34: OrganizePdf resets docLoading to false on completion and in catch', () => {
  assert.ok(orgCode.includes('setDocLoading(false);'), 'OrganizePdf must call setDocLoading(false) on success');
  const catchMatch = orgCode.match(/catch\s*\(err\)\s*\{([\s\S]*?)\}\s*;\s*loadNewFiles/);
  assert.ok(catchMatch && catchMatch[1].includes('setDocLoading(false)'), 'OrganizePdf catch block must call setDocLoading(false)');
});

runTest('Area 35: OrganizePdf renders reading document pages indicator when docLoading is true', () => {
  assert.ok(orgCode.includes('Reading document pages...'), 'Must render "Reading document pages..." text on canvas');
});

runTest('Area 36: OrganizePdf organize CTA button disabled state checks docLoading', () => {
  const btnMatch = orgCode.match(/<button[\s\S]*?onClick=\{handleOrganize\}[\s\S]*?>/);
  assert.ok(btnMatch, 'Primary organize button must exist');
  assert.ok(btnMatch[0].includes('docLoading'), 'Organize button disabled property must include docLoading');
});

runTest('Area 37: OrganizePdf organize CTA button renders loading label when docLoading is true', () => {
  assert.ok(orgCode.includes('Loading Pages...'), 'CTA button must show Loading Pages... when docLoading');
});

runTest('Area 38: OrganizePdf processing state is reserved strictly for handleOrganize execution', () => {
  const processingTrueMatches = [...orgCode.matchAll(/setProcessing\s*\(\s*true\s*\)/g)];
  assert.strictEqual(processingTrueMatches.length, 1, 'setProcessing(true) must be called exactly once in OrganizePdf.jsx');
  const handleOrganizeMatch = orgCode.match(/const\s+handleOrganize\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)try\s*\{/);
  assert.ok(handleOrganizeMatch && handleOrganizeMatch[1].includes('setProcessing(true)'), 'setProcessing(true) must be inside handleOrganize');
});

// =============================================================================
// AREA 39 - AREA 40: SignPdf.jsx State Separation
// =============================================================================
const signCode = fs.readFileSync('src/pages/pdf/SignPdf.jsx', 'utf8');

runTest('Area 39: SignPdf defines docLoading state and uses setDocLoading(true) in loadPdf', () => {
  assert.ok(signCode.includes('const [docLoading, setDocLoading] = useState(false);'), 'SignPdf must declare docLoading');
  const match = signCode.match(/const\s+loadPdf\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)try/);
  assert.ok(match && match[1].includes('setDocLoading(true)'), 'loadPdf must call setDocLoading(true)');
});

runTest('Area 40: SignPdf loadPdf NEVER sets processing to true upon file upload', () => {
  const match = signCode.match(/const\s+loadPdf\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)(?:loadPdf\(\);)/);
  assert.ok(match, 'loadPdf body found');
  assert.ok(!match[1].includes('setProcessing(true)'), 'loadPdf must NOT call setProcessing(true)');
  assert.ok(match[1].includes('setDocLoading(false)'), 'loadPdf must reset docLoading to false in finally');
});

// =============================================================================
// AREA 41 - AREA 45: Universal CMap & Standard Font Integration Across PDF Tools
// =============================================================================
runTest('Area 41: ExtractPages.jsx uses loadPdfDocument for font/CMap safety', () => {
  const code = fs.readFileSync('src/pages/pdf/ExtractPages.jsx', 'utf8');
  assert.ok(code.includes("import { loadPdfDocument } from '../../utils/pdfConfig'"), 'ExtractPages must import loadPdfDocument');
  assert.ok(code.includes('loadPdfDocument(arrayBuffer).promise'), 'ExtractPages must invoke loadPdfDocument');
});

runTest('Area 42: RemovePages.jsx uses loadPdfDocument for font/CMap safety', () => {
  const code = fs.readFileSync('src/pages/pdf/RemovePages.jsx', 'utf8');
  assert.ok(code.includes("import { loadPdfDocument } from '../../utils/pdfConfig'"), 'RemovePages must import loadPdfDocument');
  assert.ok(code.includes('loadPdfDocument(arrayBuffer).promise'), 'RemovePages must invoke loadPdfDocument');
});

runTest('Area 43: AddWatermark.jsx uses loadPdfDocument for font/CMap safety', () => {
  const code = fs.readFileSync('src/pages/pdf/AddWatermark.jsx', 'utf8');
  assert.ok(code.includes("import { loadPdfDocument } from '../../utils/pdfConfig'"), 'AddWatermark must import loadPdfDocument');
  assert.ok(code.includes('loadPdfDocument(arrayBuffer).promise'), 'AddWatermark must invoke loadPdfDocument');
});

runTest('Area 44: AddPageNumbers.jsx uses loadPdfDocument for font/CMap safety', () => {
  const code = fs.readFileSync('src/pages/pdf/AddPageNumbers.jsx', 'utf8');
  assert.ok(code.includes("import { loadPdfDocument } from '../../utils/pdfConfig'"), 'AddPageNumbers must import loadPdfDocument');
  assert.ok(code.includes('loadPdfDocument(arrayBuffer).promise'), 'AddPageNumbers must invoke loadPdfDocument');
});

runTest('Area 45: BatesNumbering.jsx uses loadPdfDocument for font/CMap safety', () => {
  const code = fs.readFileSync('src/pages/pdf/BatesNumbering.jsx', 'utf8');
  assert.ok(code.includes("import { loadPdfDocument } from '../../utils/pdfConfig'"), 'BatesNumbering must import loadPdfDocument');
  assert.ok(code.includes('loadPdfDocument(arrayBuffer).promise'), 'BatesNumbering must invoke loadPdfDocument');
});

// =============================================================================
// AREA 46 - AREA 49: App.jsx URL Route Space & Alias Invariants
// =============================================================================
const appCode = fs.readFileSync('src/App.jsx', 'utf8');

runTest('Area 46: App.jsx registers both space-separated and %20 routes for split-pdf', () => {
  assert.ok(appCode.includes('path="/split%20pdf/*"'), 'App.jsx must register /split%20pdf/*');
  assert.ok(appCode.includes('path="/split pdf/*"'), 'App.jsx must register /split pdf/*');
});

runTest('Area 47: App.jsx registers both space-separated and %20 routes for crop-pdf', () => {
  assert.ok(appCode.includes('path="/crop%20pdf/*"'), 'App.jsx must register /crop%20pdf/*');
  assert.ok(appCode.includes('path="/crop pdf/*"'), 'App.jsx must register /crop pdf/*');
});

runTest('Area 48: App.jsx registers both space-separated and %20 routes for rotate-pdf', () => {
  assert.ok(appCode.includes('path="/rotate%20pdf/*"'), 'App.jsx must register /rotate%20pdf/*');
  assert.ok(appCode.includes('path="/rotate pdf/*"'), 'App.jsx must register /rotate pdf/*');
});

runTest('Area 49: App.jsx registers both space-separated and %20 routes for organize-pdf', () => {
  assert.ok(appCode.includes('path="/organize%20pdf/*"'), 'App.jsx must register /organize%20pdf/*');
  assert.ok(appCode.includes('path="/organize pdf/*"'), 'App.jsx must register /organize pdf/*');
});

// =============================================================================
// AREA 50 - AREA 52: Runtime CMap & Parameter Invariant Verification
// =============================================================================
runTest('Area 50: getPdfjsDocParams injects local CMaps and standard fonts by default', () => {
  const dummyBuffer = new Uint8Array([37, 80, 68, 70]); // %PDF
  const params = getPdfjsDocParams(dummyBuffer);
  assert.strictEqual(params.cMapPacked, true, 'cMapPacked must be true');
  assert.strictEqual(typeof params.cMapUrl, 'string', 'cMapUrl must be configured');
  assert.strictEqual(params.enableXfa, true, 'enableXfa must be true');
  assert.strictEqual(params.useSystemFonts, true, 'useSystemFonts must be true');
});

runTest('Area 51: getPdfjsDocParams supports URL inputs and preserves isEvalSupported override', () => {
  const params = getPdfjsDocParams('https://example.com/test.pdf', { isEvalSupported: false });
  assert.strictEqual(params.url, 'https://example.com/test.pdf');
  assert.strictEqual(params.isEvalSupported, false);
});

runTest('Area 52: Universal verification: no PDF tool calls setProcessing(true) during file load', () => {
  const tools = ['SplitPdf.jsx', 'CropPdf.jsx', 'RotatePdf.jsx', 'OrganizePdf.jsx', 'SignPdf.jsx'];
  for (const tool of tools) {
    const code = fs.readFileSync(`src/pages/pdf/${tool}`, 'utf8');
    const loadMatch = code.match(/(?:loadPdf|loadPdfThumbnails|loadNewFiles)\s*=\s*async[\s\S]*?(?:try\s*\{[\s\S]*?\})/);
    assert.ok(loadMatch, `${tool} must have a load function`);
    assert.ok(!loadMatch[0].includes('setProcessing(true)'), `${tool} must not call setProcessing(true) inside load function`);
  }
});

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log(`  SUITE COMPLETE: ${passedTests} passed, ${failedTests} failed.`);
console.log('════════════════════════════════════════════════════════════════════════════════\n');

if (failedTests > 0) {
  process.exit(1);
}
