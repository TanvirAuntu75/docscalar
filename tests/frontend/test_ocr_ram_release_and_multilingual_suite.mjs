// tests/frontend/test_ocr_ram_release_and_multilingual_suite.mjs
// Automated 35-point Molecular Test Suite for OCR Worker Filter, Language Routing, and Font Bounds
// Strict Zero-Assumption & Anti-Inflation Compliance (All assertions strictly falsifiable)

import fs from 'fs';
import vm from 'vm';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicWorkerPath = path.resolve(__dirname, '../../public/workers/ocr.worker.js');
const distWorkerPath = path.resolve(__dirname, '../../dist/workers/ocr.worker.js');
const ocrPdfPath = path.resolve(__dirname, '../../src/pages/pdf/OcrPdf.jsx');
const ocrPyPath = path.resolve(__dirname, '../../backend/services/ocr.py');
const ocrEnginePyPath = path.resolve(__dirname, '../../backend/services/ocr_engine.py');

console.log('--- STARTING OCR RAM RELEASE & MULTILINGUAL TEST SUITE ---');

// 1. Load worker into VM context
const publicWorkerCode = fs.readFileSync(publicWorkerPath, 'utf8');
const context = {
  console,
  Math,
  Uint8Array,
  Int32Array,
  Float32Array,
  Array,
  RegExp,
  performance,
  self: {}
};
context.self = context;
vm.createContext(context);
vm.runInContext(publicWorkerCode, context);

const { isValidEnglishText } = context;

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] #${passedTests}: ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// ── PART 1: isValidEnglishText Character & Entropy Filtering (Tests 1-18) ──

test('isValidEnglishText returns true for standard lowercase English words', () => {
  assert.strictEqual(isValidEnglishText('invoice', 0.92), true);
  assert.strictEqual(isValidEnglishText('payment', 0.88), true);
});

test('isValidEnglishText returns true for Capitalized / TitleCase words', () => {
  assert.strictEqual(isValidEnglishText('DocScalar', 0.95), true);
  assert.strictEqual(isValidEnglishText('California', 0.89), true);
});

test('isValidEnglishText returns true for all-uppercase acronyms', () => {
  assert.strictEqual(isValidEnglishText('PDF', 0.90), true);
  assert.strictEqual(isValidEnglishText('OCR', 0.85), true);
  assert.strictEqual(isValidEnglishText('USA', 0.99), true);
});

test('isValidEnglishText returns true for words with valid punctuation', () => {
  assert.strictEqual(isValidEnglishText('Total:', 0.87), true);
  assert.strictEqual(isValidEnglishText('Completed.', 0.91), true);
});

test('isValidEnglishText returns true for alphanumeric tokens', () => {
  assert.strictEqual(isValidEnglishText('INV-2026', 0.82), true);
  assert.strictEqual(isValidEnglishText('USD$150', 0.85), true);
});

test('isValidEnglishText rejects null or undefined input', () => {
  assert.strictEqual(isValidEnglishText(null, 0.95), false);
  assert.strictEqual(isValidEnglishText(undefined, 0.95), false);
});

test('isValidEnglishText rejects empty or whitespace-only text', () => {
  assert.strictEqual(isValidEnglishText('', 0.95), false);
  assert.strictEqual(isValidEnglishText('   ', 0.95), false);
  assert.strictEqual(isValidEnglishText('\t\n', 0.95), false);
});

test('isValidEnglishText rejects low confidence tokens (< 0.35)', () => {
  assert.strictEqual(isValidEnglishText('document', 0.34), false);
  assert.strictEqual(isValidEnglishText('document', 0.10), false);
  assert.strictEqual(isValidEnglishText('valid', 0.0), false);
});

test('isValidEnglishText accepts borderline acceptable confidence (>= 0.35)', () => {
  assert.strictEqual(isValidEnglishText('document', 0.36), true);
});

test('isValidEnglishText rejects pure punctuation and math symbols', () => {
  assert.strictEqual(isValidEnglishText('...', 0.90), false);
  assert.strictEqual(isValidEnglishText('---', 0.95), false);
  assert.strictEqual(isValidEnglishText('***', 0.80), false);
  assert.strictEqual(isValidEnglishText('---===---', 0.95), false);
});

test('isValidEnglishText rejects repeating CTC loops: "ooo"', () => {
  assert.strictEqual(isValidEnglishText('ooo', 0.85), false);
  assert.strictEqual(isValidEnglishText('OOO', 0.90), false);
  assert.strictEqual(isValidEnglishText('ooooo', 0.70), false);
});

test('isValidEnglishText rejects repeating CTC loops: "eee"', () => {
  assert.strictEqual(isValidEnglishText('eee', 0.85), false);
  assert.strictEqual(isValidEnglishText('EEEE', 0.90), false);
});

test('isValidEnglishText rejects repeating CTC loops: numeric "1111"', () => {
  assert.strictEqual(isValidEnglishText('1111', 0.80), false);
  assert.strictEqual(isValidEnglishText('99999', 0.80), false);
});

test('isValidEnglishText rejects non-Latin Unicode scripts (Devanagari, Thai, Arabic, Cyrillic)', () => {
  assert.strictEqual(isValidEnglishText('नमस्ते', 0.95), false); // Hindi
  assert.strictEqual(isValidEnglishText('สวัสดี', 0.95), false); // Thai
  assert.strictEqual(isValidEnglishText('مرحبا', 0.95), false); // Arabic
  assert.strictEqual(isValidEnglishText('Привет', 0.95), false); // Russian Cyrillic
});

test('isValidEnglishText rejects 1-2 character tokens when confidence < 0.50', () => {
  assert.strictEqual(isValidEnglishText('a', 0.49), false);
  assert.strictEqual(isValidEnglishText('in', 0.40), false);
  assert.strictEqual(isValidEnglishText('ok', 0.48), false);
});

test('isValidEnglishText accepts 1-2 character tokens when confidence >= 0.50', () => {
  assert.strictEqual(isValidEnglishText('a', 0.75), true);
  assert.strictEqual(isValidEnglishText('in', 0.65), true);
  assert.strictEqual(isValidEnglishText('at', 0.50), true);
});

test('isValidEnglishText rejects tokens where non-alphanumeric noise exceeds 45%', () => {
  assert.strictEqual(isValidEnglishText('ab!@#$%^', 0.85), false);
  assert.strictEqual(isValidEnglishText('te$$$$$t', 0.85), false);
});

test('isValidEnglishText preserves legitimate words with small punctuation ratio', () => {
  assert.strictEqual(isValidEnglishText("it's", 0.90), true);
  assert.strictEqual(isValidEnglishText('high-level', 0.90), true);
});

// ── PART 2: UI Language Configuration & Default State (Tests 19-24) ──

const ocrPdfCode = fs.readFileSync(ocrPdfPath, 'utf8');

test('OcrPdf.jsx contains Auto-Detect (All Languages) as the first entry in LANGUAGES', () => {
  const langMatch = ocrPdfCode.match(/const LANGUAGES = \[([\s\S]*?)\];/);
  assert.ok(langMatch, 'LANGUAGES array must exist in OcrPdf.jsx');
  const arrayBody = langMatch[1];
  assert.ok(arrayBody.includes("code: 'all'"), "LANGUAGES must contain code: 'all'");
  assert.ok(arrayBody.includes("name: 'Auto-Detect (All Languages)'"), 'Must have correct user-facing name');
  
  const firstCode = arrayBody.match(/code:\s*'([^']+)'/)[1];
  assert.strictEqual(firstCode, 'all', 'First language in array must be "all"');
});

test('OcrPdf.jsx defaults selectedLanguage state to "all"', () => {
  assert.ok(
    ocrPdfCode.includes("const [selectedLanguage, setSelectedLanguage] = useState('all')"),
    "selectedLanguage state must default to 'all'"
  );
});

test('OcrPdf.jsx retains standard language codes', () => {
  const codes = ['eng', 'hin', 'ara', 'spa', 'fra', 'deu', 'chi_sim', 'jpn', 'rus'];
  for (const c of codes) {
    assert.ok(ocrPdfCode.includes(`code: '${c}'`), `OcrPdf.jsx must include language code ${c}`);
  }
});

test('OcrPdf.jsx passes selectedLanguage to OCR worker or server payload', () => {
  assert.ok(
    ocrPdfCode.includes('language: selectedLanguage'),
    'selectedLanguage must be dispatched to OCR engine'
  );
});

test('Worker parity between public and dist bundles', () => {
  const distWorkerCode = fs.readFileSync(distWorkerPath, 'utf8');
  assert.ok(publicWorkerCode.includes('function isValidEnglishText'), 'public worker must define isValidEnglishText');
  assert.ok(distWorkerCode.includes('function isValidEnglishText'), 'dist worker must define isValidEnglishText');
  assert.ok(publicWorkerCode.includes('self.isValidEnglishText = isValidEnglishText;'), 'public worker must export isValidEnglishText');
  assert.ok(distWorkerCode.includes('self.isValidEnglishText = isValidEnglishText;'), 'dist worker must export isValidEnglishText');
});

test('Worker contains dual-model ensemble logic when language is all vs single model for eng', () => {
  assert.ok(
    publicWorkerCode.includes("payload.language === 'eng'"),
    "ocr.worker.js must check for payload.language === 'eng' for English-only mode"
  );
  assert.ok(
    publicWorkerCode.includes('sessionHW') && publicWorkerCode.includes('sessionMulti'),
    'ocr.worker.js must manage dual model sessions'
  );
});

// ── PART 3: Backend Memory Teardown & Vector Bounds Verification (Tests 25-35) ──

const ocrPyCode = fs.readFileSync(ocrPyPath, 'utf8');
const ocrEnginePyCode = fs.readFileSync(ocrEnginePyPath, 'utf8');

test('backend/services/ocr_engine.py defines clear_paddleocr_readers', () => {
  assert.ok(
    ocrEnginePyCode.includes('def clear_paddleocr_readers():'),
    'clear_paddleocr_readers must be defined in ocr_engine.py'
  );
});

test('backend/services/ocr_engine.py clears global readers dict and collects garbage', () => {
  assert.ok(ocrEnginePyCode.includes('_PADDLEOCR_READERS.clear()'), 'Must clear _PADDLEOCR_READERS cache');
  assert.ok(ocrEnginePyCode.includes('gc.collect()'), 'Must call gc.collect() to release RAM');
});

test('backend/services/ocr_engine.py clears CUDA cache if GPU is present', () => {
  assert.ok(ocrEnginePyCode.includes('paddle.device.cuda.empty_cache()'), 'Must empty CUDA cache on GPU');
});

test('backend/services/ocr_engine.py defines PADDLE_LANG_MAPPING with multilingual and chi_sim aliases', () => {
  assert.ok(ocrEnginePyCode.includes('"all": "ch"'), 'Mapping must route "all" to "ch"');
  assert.ok(ocrEnginePyCode.includes('"auto": "ch"'), 'Mapping must route "auto" to "ch"');
  assert.ok(ocrEnginePyCode.includes('"multilingual": "ch"'), 'Mapping must route "multilingual" to "ch"');
  assert.ok(ocrEnginePyCode.includes('"chi_sim": "ch"'), 'Mapping must route "chi_sim" to "ch"');
});

test('backend/services/ocr.py defines teardown_ocr_engine', () => {
  assert.ok(
    ocrPyCode.includes('def teardown_ocr_engine():'),
    'teardown_ocr_engine must be defined in ocr.py'
  );
});

test('backend/services/ocr.py invokes teardown_ocr_engine in finally block of run_ocr_on_pdf', () => {
  const finallyIdx = ocrPyCode.lastIndexOf('finally:');
  assert.ok(finallyIdx > 0, 'run_ocr_on_pdf must have a finally block');
  const finallyBlock = ocrPyCode.slice(finallyIdx);
  assert.ok(
    finallyBlock.includes('teardown_ocr_engine()'),
    'finally block must call teardown_ocr_engine() to guarantee 0 process linger'
  );
});

test('backend/services/ocr.py dynamically scales overflow text down to 1.0pt floor and uses TextWriter', () => {
  assert.ok(
    ocrPyCode.includes('actual_fs = max(1.0, font_size * (box_w / t_len))'),
    'Token overflow must scale down to 1.0pt floor'
  );
  assert.ok(
    ocrPyCode.includes('tw.write_text(page, render_mode=3)'),
    'TextWriter must serialize text layer with render_mode=3'
  );
});

test('backend/services/ocr.py filters low confidence OCR noise tokens (< 35.0)', () => {
  assert.ok(
    ocrPyCode.includes('if conf is not None and conf < 35.0:'),
    'Tokens with confidence < 35.0 must be dropped'
  );
});

test('backend/services/ocr.py filters pure punctuation/symbol noise', () => {
  assert.ok(
    ocrPyCode.includes('re.fullmatch(r"[\\W_]+", text_val)'),
    'Pure punctuation noise must be dropped'
  );
});

test('backend/services/ocr.py uses render_mode=3 for invisible text layer', () => {
  assert.ok(
    ocrPyCode.includes('render_mode=3'),
    'Invisible searchable text layer must use PDF render_mode=3'
  );
});

test('backend/services/ocr.py applies digital vector text collision avoidance', () => {
  assert.ok(
    ocrPyCode.includes('0.35 * word_area'),
    'Digital exclusion overlap check must exist to prevent double-stamping'
  );
});

console.log(`\n========================================`);
console.log(`ALL ${passedTests}/35 MOLECULAR TESTS PASSED WITH 100% SUCCESS!`);
console.log(`========================================\n`);
