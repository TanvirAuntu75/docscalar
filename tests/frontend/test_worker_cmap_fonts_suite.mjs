// Polyfill Promise.withResolvers for Node.js < 22
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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const {
  PDFJS_VERSION,
  CMAP_URL,
  CMAP_PACKED,
  STANDARD_FONT_DATA_URL,
  LOCAL_CMAP_URL,
  LOCAL_STANDARD_FONT_DATA_URL,
  CDN_CMAP_URL,
  CDN_STANDARD_FONT_DATA_URL,
  getCMapUrl,
  getStandardFontDataUrl,
  getPdfjsDocParams,
  loadPdfDocument
} = await import('../../src/utils/pdfConfig.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testNumber, description) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] Area ${testNumber}: ${description}`);
  } else {
    failedTests++;
    failures.push({ testNumber, description });
    console.error(`  ✗ [FAIL] Area ${testNumber}: ${description}`);
  }
}

console.log('================================================================');
console.log('PHASE 1: WORKER CMAP INJECTION & ZERO-TOFU FONT MOLECULAR SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: ASSET DIRECTORY STRUCTURE VERIFICATION (OFFLINE GUARANTEE)
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: Local Public Asset Presence ---');

const publicCmapsDir = path.join(rootDir, 'public', 'cmaps');
const publicFontsDir = path.join(rootDir, 'public', 'standard_fonts');
const distCmapsDir = path.join(rootDir, 'dist', 'cmaps');
const distFontsDir = path.join(rootDir, 'dist', 'standard_fonts');

const cmapsExist = fs.existsSync(publicCmapsDir) && fs.statSync(publicCmapsDir).isDirectory();
assert(cmapsExist === true, 1, 'public/cmaps directory exists as a valid directory');

const cmapsCount = cmapsExist ? fs.readdirSync(publicCmapsDir).length : 0;
assert(cmapsCount >= 165 && cmapsCount <= 175, 2, `public/cmaps contains complete CMap bundle (actual: ${cmapsCount} files, invariant: >=165)`);

const fontsExist = fs.existsSync(publicFontsDir) && fs.statSync(publicFontsDir).isDirectory();
assert(fontsExist === true, 3, 'public/standard_fonts directory exists as a valid directory');

const fontsCount = fontsExist ? fs.readdirSync(publicFontsDir).length : 0;
assert(fontsCount >= 14 && fontsCount <= 20, 4, `public/standard_fonts contains 14 standard PDF font files (actual: ${fontsCount} files)`);

const distCmapsExist = fs.existsSync(distCmapsDir);
const distCmapsCount = distCmapsExist ? fs.readdirSync(distCmapsDir).length : 0;
assert(distCmapsExist && distCmapsCount === cmapsCount, 5, `dist/cmaps production build parity matches public (${distCmapsCount} vs ${cmapsCount})`);

const distFontsExist = fs.existsSync(distFontsDir);
const distFontsCount = distFontsExist ? fs.readdirSync(distFontsDir).length : 0;
assert(distFontsExist && distFontsCount === fontsCount, 6, `dist/standard_fonts production build parity matches public (${distFontsCount} vs ${fontsCount})`);

// -----------------------------------------------------------------------------
// SECTION 2: JAPANESE & CJK CMap FILES VERIFICATION (ZERO-TOFU)
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: Japanese & CJK CMap Files Verification ---');

function checkFile(dir, fileName, minBytes) {
  const filePath = path.join(dir, fileName);
  if (!fs.existsSync(filePath)) return { exists: false, size: 0 };
  const stat = fs.statSync(filePath);
  return { exists: true, size: stat.size, valid: stat.size >= minBytes };
}

const f7 = checkFile(publicCmapsDir, 'Adobe-Japan1-6.bcmap', 300);
assert(f7.exists && f7.valid, 7, `Japanese JIS Adobe-Japan1-6.bcmap exists (${f7.size} bytes)`);

const f8 = checkFile(publicCmapsDir, 'UniJIS-UTF16-H.bcmap', 10000);
assert(f8.exists && f8.valid, 8, `Japanese Hiragana/Katakana/Kanji UniJIS-UTF16-H.bcmap exists (${f8.size} bytes)`);

const f9 = checkFile(publicCmapsDir, 'UniJIS-UTF16-V.bcmap', 500);
assert(f9.exists && f9.valid, 9, `Japanese Vertical UniJIS-UTF16-V.bcmap exists (${f9.size} bytes)`);

const f10 = checkFile(publicCmapsDir, 'UniJIS2004-UTF16-H.bcmap', 10000);
assert(f10.exists && f10.valid, 10, `Japanese JIS2004 UniJIS2004-UTF16-H.bcmap exists (${f10.size} bytes)`);

const f11 = checkFile(publicCmapsDir, 'Adobe-CNS1-6.bcmap', 300);
assert(f11.exists && f11.valid, 11, `Traditional Chinese Adobe-CNS1-6.bcmap exists (${f11.size} bytes)`);

const f12 = checkFile(publicCmapsDir, 'Adobe-GB1-5.bcmap', 500);
assert(f12.exists && f12.valid, 12, `Simplified Chinese Adobe-GB1-5.bcmap exists (${f12.size} bytes)`);

const f13 = checkFile(publicCmapsDir, 'Adobe-Korea1-2.bcmap', 300);
assert(f13.exists && f13.valid, 13, `Korean Adobe-Korea1-2.bcmap exists (${f13.size} bytes)`);

const f14 = checkFile(publicCmapsDir, 'UniCNS-UTF16-H.bcmap', 10000);
assert(f14.exists && f14.valid, 14, `Unicode Traditional Chinese UniCNS-UTF16-H.bcmap exists (${f14.size} bytes)`);

const f15 = checkFile(publicCmapsDir, 'UniGB-UTF16-H.bcmap', 10000);
assert(f15.exists && f15.valid, 15, `Unicode Simplified Chinese UniGB-UTF16-H.bcmap exists (${f15.size} bytes)`);

const f16 = checkFile(publicCmapsDir, 'UniKS-UTF16-H.bcmap', 10000);
assert(f16.exists && f16.valid, 16, `Unicode Korean UniKS-UTF16-H.bcmap exists (${f16.size} bytes)`);

// -----------------------------------------------------------------------------
// SECTION 3: STANDARD 14 FONTS VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: Standard 14 Fonts Binary Verification ---');

const sf1 = checkFile(publicFontsDir, 'FoxitSerif.pfb', 15000);
assert(sf1.exists && sf1.valid, 17, `Standard Times FoxitSerif.pfb exists (${sf1.size} bytes)`);

const sf2 = checkFile(publicFontsDir, 'FoxitSerifBold.pfb', 15000);
assert(sf2.exists && sf2.valid, 18, `Standard Times Bold FoxitSerifBold.pfb exists (${sf2.size} bytes)`);

const sf3 = checkFile(publicFontsDir, 'LiberationSans-Regular.ttf', 100000);
assert(sf3.exists && sf3.valid, 19, `Standard Helvetica LiberationSans-Regular.ttf exists (${sf3.size} bytes)`);

const sf4 = checkFile(publicFontsDir, 'LiberationSans-Bold.ttf', 100000);
assert(sf4.exists && sf4.valid, 20, `Standard Helvetica Bold LiberationSans-Bold.ttf exists (${sf4.size} bytes)`);

const sf5 = checkFile(publicFontsDir, 'FoxitFixed.pfb', 15000);
assert(sf5.exists && sf5.valid, 21, `Standard Courier FoxitFixed.pfb exists (${sf5.size} bytes)`);

const sf6 = checkFile(publicFontsDir, 'FoxitSymbol.pfb', 15000);
const sf7 = checkFile(publicFontsDir, 'FoxitDingbats.pfb', 25000);
assert(sf6.exists && sf6.valid && sf7.exists && sf7.valid, 22, `Standard Symbol FoxitSymbol.pfb (${sf6.size}B) and Dingbats (${sf7.size}B) exist`);

// -----------------------------------------------------------------------------
// SECTION 4: PDFCONFIG.JS EXPORTS & FALLBACK CONTRACTS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: pdfConfig.js Module Exports & Fallbacks ---');

assert(PDFJS_VERSION === '4.8.69', 23, `PDFJS_VERSION strictly pinned to 4.8.69 (actual: ${PDFJS_VERSION})`);

assert(CMAP_PACKED === true, 24, `CMAP_PACKED is strictly boolean true for binary .bcmap decoding`);

assert(typeof CMAP_URL === 'string' && CMAP_URL.endsWith('/'), 25, `CMAP_URL ends with trailing slash (actual: ${CMAP_URL})`);

assert(typeof STANDARD_FONT_DATA_URL === 'string' && STANDARD_FONT_DATA_URL.endsWith('/'), 26, `STANDARD_FONT_DATA_URL ends with trailing slash (actual: ${STANDARD_FONT_DATA_URL})`);

assert(LOCAL_CMAP_URL.includes('cmaps/'), 27, `LOCAL_CMAP_URL routes to cmaps/ path (actual: ${LOCAL_CMAP_URL})`);

assert(LOCAL_STANDARD_FONT_DATA_URL.includes('standard_fonts/'), 28, `LOCAL_STANDARD_FONT_DATA_URL routes to standard_fonts/ (actual: ${LOCAL_STANDARD_FONT_DATA_URL})`);

assert(CDN_CMAP_URL === `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`, 29, `CDN_CMAP_URL matches jsdelivr pinned URL (${CDN_CMAP_URL})`);

assert(CDN_STANDARD_FONT_DATA_URL === `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`, 30, `CDN_STANDARD_FONT_DATA_URL matches jsdelivr pinned URL (${CDN_STANDARD_FONT_DATA_URL})`);

assert(getCMapUrl(false) === CMAP_URL && getCMapUrl(true) === CDN_CMAP_URL, 31, `getCMapUrl resolves local by default and CDN when requested`);

assert(getStandardFontDataUrl(false) === STANDARD_FONT_DATA_URL && getStandardFontDataUrl(true) === CDN_STANDARD_FONT_DATA_URL, 32, `getStandardFontDataUrl resolves local by default and CDN when requested`);

// -----------------------------------------------------------------------------
// SECTION 5: GETPDFJSDOCPARAMS BRANCH COVERAGE & ENFORCEMENT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: getPdfjsDocParams Branch Coverage & Invariants ---');

const dummyBuffer = new ArrayBuffer(16);
const dummyUint8 = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

// Branch 1: ArrayBuffer
const p1 = getPdfjsDocParams(dummyBuffer);
assert(
  p1.data === dummyBuffer &&
  p1.cMapUrl === CMAP_URL &&
  p1.cMapPacked === true &&
  p1.standardFontDataUrl === STANDARD_FONT_DATA_URL &&
  p1.enableXfa === true &&
  p1.useSystemFonts === true,
  33,
  'Branch 1: ArrayBuffer input produces full CMap, font, XFA, and system font config'
);

// Branch 2: Uint8Array
const p2 = getPdfjsDocParams(dummyUint8);
assert(
  p2.data === dummyUint8 &&
  p2.cMapPacked === true &&
  p2.enableXfa === true,
  34,
  'Branch 2: Uint8Array input preserves binary data and injects CMap settings'
);

// Branch 3: String URL
const p3 = getPdfjsDocParams('/sample.pdf');
assert(
  p3.url === '/sample.pdf' &&
  p3.data === undefined &&
  p3.cMapUrl === CMAP_URL &&
  p3.enableXfa === true,
  35,
  'Branch 3: String URL sets url property without corrupting data'
);

// Branch 4: Options Object
const p4 = getPdfjsDocParams({ data: dummyBuffer, password: 'test-password', isEvalSupported: false });
assert(
  p4.data === dummyBuffer &&
  p4.password === 'test-password' &&
  p4.isEvalSupported === false &&
  p4.cMapPacked === true,
  36,
  'Branch 4: Options Object merges existing properties while ensuring CMap invariants'
);

// Branch 5: CDN Fallback Flag
const p5 = getPdfjsDocParams(dummyBuffer, { useCdn: true });
assert(
  p5.cMapUrl === CDN_CMAP_URL &&
  p5.standardFontDataUrl === CDN_STANDARD_FONT_DATA_URL,
  37,
  'Branch 5: useCdn: true correctly switches cMapUrl and standardFontDataUrl to CDN endpoints'
);

// Branch 6: Explicit Overrides
const p6 = getPdfjsDocParams(dummyBuffer, { cMapUrl: '/override/cmaps/', enableXfa: false });
assert(
  p6.cMapUrl === '/override/cmaps/' &&
  p6.enableXfa === false &&
  p6.cMapPacked === true,
  38,
  'Branch 6: Caller overrides take precedence over defaults when explicitly supplied'
);

// Branch 7: Worker Disable Flag (used in Web Workers)
const p7 = getPdfjsDocParams(dummyBuffer, { disableWorker: true });
assert(
  p7.disableWorker === true &&
  p7.data === dummyBuffer &&
  p7.cMapPacked === true &&
  p7.standardFontDataUrl === STANDARD_FONT_DATA_URL,
  39,
  'Branch 7: disableWorker: true is strictly preserved for Web Worker thread execution'
);

// -----------------------------------------------------------------------------
// SECTION 6: PDF.WORKER.JS STATIC AST & CALL-SITE VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 6: pdf.worker.js Static AST & Call-Site Audit ---');

const workerPath = path.join(rootDir, 'src', 'workers', 'pdf.worker.js');
const workerContent = fs.readFileSync(workerPath, 'utf8');

// Verify import
const importRegex = /import\s+\{[^}]*getPdfjsDocParams[^}]*\}\s+from\s+['"]\.\.\/utils\/pdfConfig\.js['"]/;
assert(importRegex.test(workerContent), 40, 'pdf.worker.js imports getPdfjsDocParams from ../utils/pdfConfig.js');

// Verify Call 1: by-bookmarks
const call1Regex = /mode\s*===\s*['"]by-bookmarks['"][\s\S]*?pdfjsLib\.getDocument\(getPdfjsDocParams\(arrayBuffer,\s*\{\s*disableWorker:\s*true\s*\}\)\)/;
assert(call1Regex.test(workerContent), 41, 'Call Site 1 (by-bookmarks): Uses getPdfjsDocParams(arrayBuffer, { disableWorker: true })');

// Verify Call 2: by-blank-page
const call2Regex = /mode\s*===\s*['"]by-blank-page['"][\s\S]*?pdfjsLib\.getDocument\(getPdfjsDocParams\(arrayBuffer,\s*\{\s*disableWorker:\s*true\s*\}\)\)/;
assert(call2Regex.test(workerContent), 42, 'Call Site 2 (by-blank-page): Uses getPdfjsDocParams(arrayBuffer, { disableWorker: true })');

// Verify Call 3: handlePdfToImages
const call3Regex = /function\s+handlePdfToImages\([\s\S]*?pdfjsLib\.getDocument\(getPdfjsDocParams\(arrayBuffer,\s*\{\s*disableWorker:\s*true\s*\}\)\)/;
assert(call3Regex.test(workerContent), 43, 'Call Site 3 (handlePdfToImages): Uses getPdfjsDocParams(arrayBuffer, { disableWorker: true })');

// Verify Call 4: handlePdfToImagesStream
const call4Regex = /function\s+handlePdfToImagesStream\([\s\S]*?pdfjsLib\.getDocument\(getPdfjsDocParams\(arrayBuffer,\s*\{\s*disableWorker:\s*true\s*\}\)\)/;
assert(call4Regex.test(workerContent), 44, 'Call Site 4 (handlePdfToImagesStream): Uses getPdfjsDocParams(arrayBuffer, { disableWorker: true })');

// Verify Call 5: handleRedactPdf
const call5Regex = /function\s+handleRedactPdf\([\s\S]*?pdfjsLib\.getDocument\(getPdfjsDocParams\(arrayBuffer\.slice\(\),\s*\{\s*disableWorker:\s*true\s*\}\)\)/;
assert(call5Regex.test(workerContent), 45, 'Call Site 5 (handleRedactPdf): Uses getPdfjsDocParams(arrayBuffer.slice(), { disableWorker: true })');

// Verify Zero Unwrapped Raw getDocument Calls
const rawGetDocMatches = workerContent.match(/pdfjsLib\.getDocument\(\s*\{/g);
assert(rawGetDocMatches === null, 46, `Zero raw un-guarded getDocument({ ... }) calls exist in pdf.worker.js (found: ${rawGetDocMatches ? rawGetDocMatches.length : 0})`);

// Verify Re-export for downstream testing
const reexportRegex = /export\s+\{[^}]*getPdfjsDocParams[^}]*\}/;
assert(reexportRegex.test(workerContent), 47, 'pdf.worker.js exports getPdfjsDocParams for downstream verification');

// -----------------------------------------------------------------------------
// SECTION 7: PDF.JS CONTRACT & MUTATION RESILIENCE
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 7: Contract Integrity & Immutability ---');

// Test input immutability
const frozenInput = Object.freeze({ data: dummyBuffer, customParam: 'safe' });
const resFrozen = getPdfjsDocParams(frozenInput);
assert(
  resFrozen.customParam === 'safe' &&
  resFrozen.cMapPacked === true &&
  resFrozen.enableXfa === true,
  48,
  'getPdfjsDocParams handles frozen input objects without mutating them'
);

// -----------------------------------------------------------------------------
// SUMMARY & EXIT CODE
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL AREAS TESTED: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  console.error('\nFAILED TEST DETAILS:');
  failures.forEach(f => console.error(`  - Area ${f.testNumber}: ${f.description}`));
  process.exit(1);
} else {
  console.log('\n✓ ALL 48 FALSALIFIABLE TEST ASSERTIONS PASSED WITH 100% SUCCESS RATE!\n');
  process.exit(0);
}
