/**
 * test_phase1_server_first_migration_suite.mjs
 * 
 * Molecular Automated Test Suite for Phase 1 Server-First Migration:
 * 1. Default engineMode flip ('client' -> 'server') across 9 hybrid tool pages + DocxToPdf parity
 * 2. Server-first execution with client fallback in StitchCanvas.jsx (ocr-pdf, compress-pdf, repair-pdf)
 * 3. executeServerJob endpoint routing for compress-pdf and repair-pdf
 * 4. Enterprise security marketing copy harmonization in FileDropzone.jsx
 * 5. Backend endpoint contract parity in backend/main.py
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../');

let passedCount = 0;
let failedCount = 0;
const testResults = [];

function test(description, fn) {
  try {
    fn();
    passedCount++;
    testResults.push({ description, status: 'PASS' });
    console.log(`  ✓ ${description}`);
  } catch (err) {
    failedCount++;
    testResults.push({ description, status: 'FAIL', error: err.message });
    console.error(`  ✗ ${description}`);
    console.error(`    -> ${err.message}`);
  }
}

console.log('======================================================================');
console.log('  DOCSCALAR PHASE 1: SERVER-FIRST MIGRATION MOLECULAR TEST SUITE      ');
console.log('======================================================================\n');

// ─── AREA 1: PdfToWord.jsx Default State ─────────────────────────────────────
console.log('[AREA 1: PdfToWord.jsx Initial engineMode State]');
test("PdfToWord.jsx initializes engineMode to 'server'", () => {
  const file = resolve(rootDir, 'src/pages/document/PdfToWord.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('server'\)/);
  assert.doesNotMatch(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('client'\)/);
});

// ─── AREA 2: PdfToExcel.jsx Default State ────────────────────────────────────
console.log('[AREA 2: PdfToExcel.jsx Initial engineMode State]');
test("PdfToExcel.jsx initializes engineMode to 'server'", () => {
  const file = resolve(rootDir, 'src/pages/document/PdfToExcel.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('server'\)/);
  assert.doesNotMatch(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('client'\)/);
});

// ─── AREA 3: ExcelToPdf.jsx Default State ────────────────────────────────────
console.log('[AREA 3: ExcelToPdf.jsx Initial engineMode State]');
test("ExcelToPdf.jsx initializes engineMode to 'server'", () => {
  const file = resolve(rootDir, 'src/pages/document/ExcelToPdf.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('server'\)/);
  assert.doesNotMatch(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('client'\)/);
});

// ─── AREA 4: PdfToPowerpoint.jsx Default State ───────────────────────────────
console.log('[AREA 4: PdfToPowerpoint.jsx Initial engineMode State]');
test("PdfToPowerpoint.jsx initializes engineMode to 'server'", () => {
  const file = resolve(rootDir, 'src/pages/document/PdfToPowerpoint.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('server'\)/);
  assert.doesNotMatch(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('client'\)/);
});

// ─── AREA 5: PdfToPdfa.jsx Default State ─────────────────────────────────────
console.log('[AREA 5: PdfToPdfa.jsx Initial engineMode State]');
test("PdfToPdfa.jsx initializes engineMode to 'server'", () => {
  const file = resolve(rootDir, 'src/pages/document/PdfToPdfa.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('server'\)/);
  assert.doesNotMatch(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('client'\)/);
});

// ─── AREA 6: PowerpointToPdf.jsx Default State ───────────────────────────────
console.log('[AREA 6: PowerpointToPdf.jsx Initial engineMode State]');
test("PowerpointToPdf.jsx initializes engineMode to 'server'", () => {
  const file = resolve(rootDir, 'src/pages/document/PowerpointToPdf.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('server'\)/);
  assert.doesNotMatch(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('client'\)/);
});

// ─── AREA 7: HtmlToPdf.jsx Default State ─────────────────────────────────────
console.log('[AREA 7: HtmlToPdf.jsx Initial engineMode State]');
test("HtmlToPdf.jsx initializes engineMode to 'server'", () => {
  const file = resolve(rootDir, 'src/pages/document/HtmlToPdf.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('server'\)/);
  assert.doesNotMatch(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('client'\)/);
});

// ─── AREA 8: TranslatePdf.jsx Default State ──────────────────────────────────
console.log('[AREA 8: TranslatePdf.jsx Initial engineMode State]');
test("TranslatePdf.jsx initializes engineMode to 'server'", () => {
  const file = resolve(rootDir, 'src/pages/document/TranslatePdf.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('server'\)/);
  assert.doesNotMatch(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('client'\)/);
});

// ─── AREA 9: UrlToPdf.jsx Default State ──────────────────────────────────────
console.log('[AREA 9: UrlToPdf.jsx Initial engineMode State]');
test("UrlToPdf.jsx initializes engineMode to 'server'", () => {
  const file = resolve(rootDir, 'src/pages/utility/UrlToPdf.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('server'\)/);
  assert.doesNotMatch(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('client'\)/);
});

// ─── AREA 10: DocxToPdf.jsx Parity Check ─────────────────────────────────────
console.log('[AREA 10: DocxToPdf.jsx Reference Parity]');
test("DocxToPdf.jsx retains engineMode 'server' as reference standard", () => {
  const file = resolve(rootDir, 'src/pages/document/DocxToPdf.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /const\s+\[engineMode,\s*setEngineMode\]\s*=\s*useState\('server'\)/);
});

// ─── AREA 11: PdfToWord.jsx Server Guard Wiring ──────────────────────────────
console.log('[AREA 11: PdfToWord.jsx Server Guard Logic]');
test("PdfToWord.jsx checks backendActive when converting in server engineMode", () => {
  const file = resolve(rootDir, 'src/pages/document/PdfToWord.jsx');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes("engineMode === 'server' && backendActive"), "Should check engineMode and backendActive");
});

// ─── AREA 12: PdfToExcel.jsx Offline Guard Wiring ────────────────────────────
console.log('[AREA 12: PdfToExcel.jsx Offline Guard Logic]');
test("PdfToExcel.jsx notifies user if cloud conversion engine is offline", () => {
  const file = resolve(rootDir, 'src/pages/document/PdfToExcel.jsx');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes("Cloud conversion engine is currently offline"), "Should contain offline cloud engine message");
});

// ─── AREA 13: ExcelToPdf.jsx Offline Guard Wiring ────────────────────────────
console.log('[AREA 13: ExcelToPdf.jsx Offline Guard Logic]');
test("ExcelToPdf.jsx notifies user if cloud conversion engine is offline", () => {
  const file = resolve(rootDir, 'src/pages/document/ExcelToPdf.jsx');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes("Cloud conversion engine is currently offline"), "Should contain offline cloud engine message");
});

// ─── AREA 14: PdfToPowerpoint.jsx Offline Guard Wiring ───────────────────────
console.log('[AREA 14: PdfToPowerpoint.jsx Offline Guard Logic]');
test("PdfToPowerpoint.jsx notifies user if cloud conversion engine is offline", () => {
  const file = resolve(rootDir, 'src/pages/document/PdfToPowerpoint.jsx');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes("Cloud conversion engine is currently offline"), "Should contain offline cloud engine message");
});

// ─── AREA 15: PdfToPdfa.jsx Offline Guard Wiring ─────────────────────────────
console.log('[AREA 15: PdfToPdfa.jsx Offline Guard Logic]');
test("PdfToPdfa.jsx notifies user if cloud archival engine is offline", () => {
  const file = resolve(rootDir, 'src/pages/document/PdfToPdfa.jsx');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes("Cloud Archival engine is currently offline"), "Should contain offline cloud engine message");
});

// ─── AREA 16: PowerpointToPdf.jsx Offline Guard Wiring ───────────────────────
console.log('[AREA 16: PowerpointToPdf.jsx Offline Guard Logic]');
test("PowerpointToPdf.jsx notifies user if cloud conversion engine is offline", () => {
  const file = resolve(rootDir, 'src/pages/document/PowerpointToPdf.jsx');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes("Cloud conversion engine is currently offline"), "Should contain offline cloud engine message");
});

// ─── AREA 17: HtmlToPdf.jsx Offline Guard Wiring ─────────────────────────────
console.log('[AREA 17: HtmlToPdf.jsx Offline Guard Logic]');
test("HtmlToPdf.jsx notifies user if cloud conversion engine is offline", () => {
  const file = resolve(rootDir, 'src/pages/document/HtmlToPdf.jsx');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes("Cloud conversion engine is currently offline"), "Should contain offline cloud engine message");
});

// ─── AREA 18: TranslatePdf.jsx Offline Guard Wiring ──────────────────────────
console.log('[AREA 18: TranslatePdf.jsx Offline Guard Logic]');
test("TranslatePdf.jsx notifies user if high-precision translation engine is offline", () => {
  const file = resolve(rootDir, 'src/pages/document/TranslatePdf.jsx');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes("High-precision translation engine is currently offline"), "Should contain offline message");
});

// ─── AREA 19: UrlToPdf.jsx Button Guard Wiring ───────────────────────────────
console.log('[AREA 19: UrlToPdf.jsx Button Disabled Guard]');
test("UrlToPdf.jsx disables convert button when server mode selected without backend", () => {
  const file = resolve(rootDir, 'src/pages/utility/UrlToPdf.jsx');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes("engineMode === 'server' && !backendActive"), "Should check server mode and backend status");
});

// ─── AREA 20: FileDropzone.jsx Security Copy Replacement ─────────────────────
console.log('[AREA 20: FileDropzone.jsx Updated Security Tagline]');
test("FileDropzone.jsx contains verbatim Enterprise Security copy", () => {
  const file = resolve(rootDir, 'src/components/FileDropzone.jsx');
  const content = readFileSync(file, 'utf8');
  const expectedCopy = "Enterprise Security: Encrypted in transit, processed in isolated transient memory, and purged automatically after download.";
  assert.ok(content.includes(expectedCopy), "FileDropzone.jsx must include exact Enterprise Security copy");
});

// ─── AREA 21: FileDropzone.jsx Purge of Browser-Only Claim ───────────────────
console.log('[AREA 21: FileDropzone.jsx Deprecation of Browser-Only Claim]');
test("FileDropzone.jsx completely removed outdated browser-only processing copy", () => {
  const file = resolve(rootDir, 'src/components/FileDropzone.jsx');
  const content = readFileSync(file, 'utf8');
  assert.equal(content.includes("We process everything in your browser"), false, "Outdated copy must be completely removed");
});

// ─── AREA 22: StitchCanvas.jsx executeServerJob compress-pdf Route ───────────
console.log('[AREA 22: StitchCanvas.jsx executeServerJob compress-pdf Endpoint]');
test("StitchCanvas.jsx maps compress-pdf to /api/convert/compress-pdf", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /actionId\s*===\s*'compress-pdf'[\s\S]*?convertUrl\s*=\s*'\/api\/convert\/compress-pdf'/);
});

// ─── AREA 23: StitchCanvas.jsx executeServerJob compress-pdf Params ──────────
console.log('[AREA 23: StitchCanvas.jsx compress-pdf Form Params]');
test("StitchCanvas.jsx forwards quality, target_size_bytes, rasterize_fallback to compress endpoint", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /convertFormData\.append\('quality',\s*String\(params\.quality\)\)/);
  assert.match(content, /convertFormData\.append\('target_size_bytes',\s*String\(params\.target_size_bytes\)\)/);
  assert.match(content, /convertFormData\.append\('rasterize_fallback',\s*String\(params\.rasterize_fallback\)\)/);
});

// ─── AREA 24: StitchCanvas.jsx executeServerJob repair-pdf Route ─────────────
console.log('[AREA 24: StitchCanvas.jsx executeServerJob repair-pdf Endpoint]');
test("StitchCanvas.jsx maps repair-pdf to /api/repair-pdf", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /actionId\s*===\s*'repair-pdf'[\s\S]*?convertUrl\s*=\s*'\/api\/repair-pdf'/);
});

// ─── AREA 25: StitchCanvas.jsx executeServerJob repair-pdf Params ────────────
console.log('[AREA 25: StitchCanvas.jsx repair-pdf Form Params]');
test("StitchCanvas.jsx forwards mode and strip_corrupt_metadata to repair endpoint", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /convertFormData\.append\('mode',\s*params\.mode\)/);
  assert.match(content, /convertFormData\.append\('strip_corrupt_metadata',\s*String\(params\.strip_corrupt_metadata\)\)/);
});

// ─── AREA 26: StitchCanvas.jsx runToolEngine ocr-pdf Inversion ───────────────
console.log('[AREA 26: StitchCanvas.jsx runToolEngine ocr-pdf Server-First]');
test("runToolEngine invokes executeServerJob first for ocr-pdf, falling back to ocrPdf", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  const match = content.match(/const runToolEngine[\s\S]*?else if \(actionId === 'ocr-pdf'\)\s*\{([\s\S]*?)\}\s*else if \(actionId === 'un-ocr-pdf'\)/);
  assert.ok(match, "runToolEngine ocr-pdf block must be found");
  const block = match[1];
  const serverIndex = block.indexOf("executeServerJob(mainFile, 'ocr-pdf'");
  const clientIndex = block.indexOf("ocrPdf(mainFile");
  assert.ok(serverIndex !== -1, "executeServerJob must be called");
  assert.ok(clientIndex !== -1, "ocrPdf must be called in fallback catch");
  assert.ok(serverIndex < clientIndex, "Server job must execute BEFORE client fallback in runToolEngine");
});

// ─── AREA 27: StitchCanvas.jsx runToolEngine compress-pdf Server-First ───────
console.log('[AREA 27: StitchCanvas.jsx runToolEngine compress-pdf Server-First]');
test("runToolEngine invokes executeServerJob first for compress-pdf, falling back to compressPdf", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  const match = content.match(/const runToolEngine[\s\S]*?else if \(actionId === 'compress-pdf'\)\s*\{([\s\S]*?)\}\s*else if \(actionId === 'split-pdf'\)/);
  assert.ok(match, "runToolEngine compress-pdf block must be found");
  const block = match[1];
  const serverIndex = block.indexOf("executeServerJob(mainFile, 'compress-pdf'");
  const clientIndex = block.indexOf("compressPdf(mainFile");
  assert.ok(serverIndex !== -1, "executeServerJob must be called");
  assert.ok(clientIndex !== -1, "compressPdf must be called in fallback catch");
  assert.ok(serverIndex < clientIndex, "Server job must execute BEFORE client fallback in runToolEngine");
});

// ─── AREA 28: StitchCanvas.jsx runToolEngine repair-pdf Server-First ─────────
console.log('[AREA 28: StitchCanvas.jsx runToolEngine repair-pdf Server-First]');
test("runToolEngine invokes executeServerJob first for repair-pdf, falling back to repairPdf", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  const match = content.match(/const runToolEngine[\s\S]*?else if \(actionId === 'repair-pdf'\)\s*\{([\s\S]*?)\}\s*else if \(actionId === 'bates-numbering'\)/);
  assert.ok(match, "runToolEngine repair-pdf block must be found");
  const block = match[1];
  const serverIndex = block.indexOf("executeServerJob(mainFile, 'repair-pdf'");
  const clientIndex = block.indexOf("repairPdf(mainFile");
  assert.ok(serverIndex !== -1, "executeServerJob must be called");
  assert.ok(clientIndex !== -1, "repairPdf must be called in fallback catch");
  assert.ok(serverIndex < clientIndex, "Server job must execute BEFORE client fallback in runToolEngine");
});

// ─── AREA 29: StitchCanvas.jsx runEngine (Operator) ocr-pdf Server-First ─────
console.log('[AREA 29: StitchCanvas.jsx runEngine ocr-pdf Server-First]');
test("runEngine (in executeOperator) invokes executeServerJob first for ocr-pdf, falling back to ocrPdf", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  const match = content.match(/const runEngine = async[\s\S]*?else if \(actionId === 'ocr-pdf'\)\s*\{([\s\S]*?)\}\s*else if \(actionId === 'un-ocr-pdf'\)/);
  assert.ok(match, "runEngine ocr-pdf block must be found");
  const block = match[1];
  const serverIndex = block.indexOf("executeServerJob(mainFile, actionId");
  const clientIndex = block.indexOf("ocrPdf(mainFile");
  assert.ok(serverIndex !== -1, "executeServerJob must be called");
  assert.ok(clientIndex !== -1, "ocrPdf must be called in fallback catch");
  assert.ok(serverIndex < clientIndex, "Server job must execute BEFORE client fallback in runEngine");
});

// ─── AREA 30: StitchCanvas.jsx runEngine (Operator) compress-pdf Server-First 
console.log('[AREA 30: StitchCanvas.jsx runEngine compress-pdf Server-First]');
test("runEngine (in executeOperator) invokes executeServerJob first for compress-pdf, falling back to compressPdf", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  const match = content.match(/const runEngine = async[\s\S]*?else if \(actionId === 'compress-pdf'\)\s*\{([\s\S]*?)\}\s*else if \(actionId === 'split-pdf'\)/);
  assert.ok(match, "runEngine compress-pdf block must be found");
  const block = match[1];
  const serverIndex = block.indexOf("executeServerJob(mainFile, 'compress-pdf'");
  const clientIndex = block.indexOf("compressPdf(mainFile");
  assert.ok(serverIndex !== -1, "executeServerJob must be called");
  assert.ok(clientIndex !== -1, "compressPdf must be called in fallback catch");
  assert.ok(serverIndex < clientIndex, "Server job must execute BEFORE client fallback in runEngine");
});

// ─── AREA 31: StitchCanvas.jsx runEngine (Operator) repair-pdf Server-First ──
console.log('[AREA 31: StitchCanvas.jsx runEngine repair-pdf Server-First]');
test("runEngine (in executeOperator) invokes executeServerJob first for repair-pdf, falling back to repairPdf", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  const match = content.match(/const runEngine = async[\s\S]*?else if \(actionId === 'repair-pdf'\)\s*\{([\s\S]*?)\}\s*else if \(actionId === 'ocr-pdf'\)/);
  assert.ok(match, "runEngine repair-pdf block must be found");
  const block = match[1];
  const serverIndex = block.indexOf("executeServerJob(mainFile, 'repair-pdf'");
  const clientIndex = block.indexOf("repairPdf(mainFile");
  assert.ok(serverIndex !== -1, "executeServerJob must be called");
  assert.ok(clientIndex !== -1, "repairPdf must be called in fallback catch");
  assert.ok(serverIndex < clientIndex, "Server job must execute BEFORE client fallback in runEngine");
});

// ─── AREA 32: Backend Endpoint Contract Parity ───────────────────────────────
console.log('[AREA 32: Backend main.py Route Parity]');
test("backend/main.py defines /api/convert/compress-pdf and /api/repair-pdf endpoints", () => {
  const mainPy = resolve(rootDir, 'backend/main.py');
  assert.ok(existsSync(mainPy), "backend/main.py must exist");
  const backendCode = readFileSync(mainPy, 'utf8');
  assert.ok(backendCode.includes('@app.post("/api/convert/compress-pdf")'), "Must have compress-pdf POST route");
  assert.ok(backendCode.includes('@app.post("/api/repair-pdf")'), "Must have repair-pdf POST route");
});

// ─── AREA 33: Global Zero-Client-Default Check across Pages ──────────────────
console.log('[AREA 33: Global Zero-Client-Default Invariant]');
test("No conversion page in src/pages/ initializes engineMode to 'client'", () => {
  const pages = [
    'src/pages/document/PdfToWord.jsx',
    'src/pages/document/PdfToExcel.jsx',
    'src/pages/document/ExcelToPdf.jsx',
    'src/pages/document/PdfToPowerpoint.jsx',
    'src/pages/document/PdfToPdfa.jsx',
    'src/pages/document/PowerpointToPdf.jsx',
    'src/pages/document/HtmlToPdf.jsx',
    'src/pages/document/TranslatePdf.jsx',
    'src/pages/utility/UrlToPdf.jsx',
    'src/pages/document/DocxToPdf.jsx'
  ];

  for (const pageRel of pages) {
    const filePath = resolve(rootDir, pageRel);
    assert.ok(existsSync(filePath), `File ${pageRel} must exist`);
    const code = readFileSync(filePath, 'utf8');
    const clientMatches = code.match(/useState\(['"]client['"]\)/g);
    assert.equal(clientMatches, null, `File ${pageRel} must not contain useState('client') for engineMode`);
  }
});

// ─── AREA 34: Formula & Numeric Parity: Default Scale & Quality Formulas ──────
console.log('[AREA 34: Formula Verification for Compress Scale & Quality]');
test("Formula check: scale derivation matches exact formula extracted from StitchCanvas.jsx", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  const formulaMatch = content.match(/const\s+scale\s*=\s*(quality\s*>\s*0\.75\s*\?\s*1\.5\s*:\s*quality\s*<\s*0\.5\s*\?\s*0\.9\s*:\s*1\.2);/);
  assert.ok(formulaMatch, "Scale formula must exist verbatim in StitchCanvas.jsx");
  const extractedFormula = new Function('quality', `return (${formulaMatch[1]});`);
  assert.equal(extractedFormula(0.8), 1.5, "High quality scale formula extracted from source");
  assert.equal(extractedFormula(0.4), 0.9, "Low quality scale formula extracted from source");
  assert.equal(extractedFormula(0.65), 1.2, "Default quality scale formula extracted from source");

  // Server progress calculation formula extracted from StitchCanvas
  const progMatch = content.match(/Math\.min\(85,\s*15\s*\+\s*Math\.floor\(\(tries\s*\/\s*300\)\s*\*\s*70\)\)/);
  assert.ok(progMatch, "Server progress heuristic formula must exist in StitchCanvas.jsx");
  const evalProg = new Function('tries', `return (${progMatch[0]});`);
  assert.equal(evalProg(0), 15, "Progress at 0 tries must be 15%");
  assert.equal(evalProg(150), 50, "Progress at 150 tries must be 50%");
  assert.equal(evalProg(600), 85, "Progress at 600 tries must be capped at 85%");
});

// ─── AREA 35: Job Poller Web Worker Invariant ─────────────────────────────────
console.log('[AREA 35: Job Poller Web Worker Invariant in executeServerJob]');
test("executeServerJob spawns background Web Worker timer to prevent tab throttling", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes('workerTimerCode'), "Worker timer must be present in StitchCanvas");
  assert.ok(content.includes("new Worker(workerUrl)"), "Must instantiate Worker with workerUrl");
});

// ─── AREA 36: Backend OCR Route Parity ───────────────────────────────────────
console.log('[AREA 36: Backend main.py OCR Route Parity]');
test("backend/main.py defines /api/convert/ocr-pdf endpoint with language parameter", () => {
  const mainPy = resolve(rootDir, 'backend/main.py');
  const backendCode = readFileSync(mainPy, 'utf8');
  assert.ok(backendCode.includes('@app.post("/api/convert/ocr-pdf")'), "Must have ocr-pdf POST route");
  assert.ok(backendCode.includes('language: str = Form("eng")'), "Must define language parameter defaulting to eng");
});

// ─── AREA 37: executeServerJob Multipart Upload Contract ─────────────────────
console.log('[AREA 37: executeServerJob Multipart Upload Contract]');
test("executeServerJob attaches file to FormData and targets /api/upload", () => {
  const file = resolve(rootDir, 'src/components/StitchCanvas.jsx');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /uploadFormData\.append\('file',\s*file\)/, "Must append file to uploadFormData");
  assert.match(content, /\$\{BACKEND_URL\}\/api\/upload/, "Must upload to /api/upload endpoint");
});

// ─── AREA 38: repairPdf.js Polymorphic Return Support ────────────────────────
console.log('[AREA 38: repairPdf.js Polymorphic Return Support]');
test("repairPdf.js supports returnBlobOnly option for clean canvas integration", () => {
  const file = resolve(rootDir, 'src/engines/pdf/repairPdf.js');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes("returnBlobOnly = false"), "Must declare returnBlobOnly option parameter");
  assert.ok(content.includes("if (returnBlobOnly) {"), "Must branch on returnBlobOnly");
  assert.ok(content.includes("return recoveredBlob;"), "Must return recoveredBlob directly when returnBlobOnly is true");
});

// ─── AREA 39: Zero poller.start Calls Across All Tool Pages ──────────────────
console.log('[AREA 39: Zero poller.start Calls Across All Tool Pages]');
test("No page in src/pages/ calls deprecated/invalid poller.start", () => {
  const pages = [
    'src/pages/document/PdfToWord.jsx',
    'src/pages/document/PdfToExcel.jsx',
    'src/pages/document/ExcelToPdf.jsx',
    'src/pages/document/PdfToPowerpoint.jsx',
    'src/pages/document/PdfToPdfa.jsx',
    'src/pages/document/PowerpointToPdf.jsx',
    'src/pages/document/HtmlToPdf.jsx',
    'src/pages/document/TranslatePdf.jsx',
    'src/pages/utility/UrlToPdf.jsx'
  ];

  for (const pageRel of pages) {
    const filePath = resolve(rootDir, pageRel);
    const code = readFileSync(filePath, 'utf8');
    assert.doesNotMatch(code, /poller\.start\(/, `File ${pageRel} must not invoke poller.start(`);
    assert.match(code, /poller\.startPolling\(/, `File ${pageRel} must invoke poller.startPolling(`);
  }
});

// ─── AREA 40: Architectural Parity in checkServer Fallback ───────────────────
console.log('[AREA 40: Architectural Parity in checkServer Fallback]');
test("All 9 hybrid pages gracefully set engineMode to client on offline backend", () => {
  const pages = [
    'src/pages/document/PdfToWord.jsx',
    'src/pages/document/PdfToExcel.jsx',
    'src/pages/document/ExcelToPdf.jsx',
    'src/pages/document/PdfToPowerpoint.jsx',
    'src/pages/document/PdfToPdfa.jsx',
    'src/pages/document/PowerpointToPdf.jsx',
    'src/pages/document/HtmlToPdf.jsx',
    'src/pages/document/TranslatePdf.jsx',
    'src/pages/utility/UrlToPdf.jsx'
  ];

  for (const pageRel of pages) {
    const filePath = resolve(rootDir, pageRel);
    const code = readFileSync(filePath, 'utf8');
    assert.match(code, /setEngineMode\('client'\)/, `File ${pageRel} must include fallback to client mode on offline`);
  }
});

console.log('\n======================================================================');
console.log(`  SUITE COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED (${passedCount + failedCount} TOTAL)`);
console.log('======================================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

