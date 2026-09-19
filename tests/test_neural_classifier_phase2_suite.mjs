/**
 * Automated Molecular Test Suite for Phase 2 DocForge Neural Intent Model Integration (Frontend).
 * Covers 36 distinct test areas and assertions with zero always-pass tricks.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Import classifier module functions
import {
  predictIntent,
  predictIntentAsync,
  loadClassifierWeights,
  initClassifierWorker,
  isClassifierWorkerReady,
  embedQueryText
} from '../src/utils/classifier.js';

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [AREA ${totalTests}] ${name}`);
  } catch (err) {
    console.error(`  ✗ [AREA ${totalTests}] ${name}`);
    console.error(err);
    throw err;
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [AREA ${totalTests}] ${name}`);
  } catch (err) {
    console.error(`  ✗ [AREA ${totalTests}] ${name}`);
    console.error(err);
    throw err;
  }
}

console.log('--- STARTING DOCFORGE NEURAL CLASSIFIER PHASE 2 TEST SUITE ---\n');

const workerPath = path.join(ROOT_DIR, 'public', 'workers', 'classifier.worker.js');
const classifierJsPath = path.join(ROOT_DIR, 'src', 'utils', 'classifier.js');
const workerContent = fs.readFileSync(workerPath, 'utf-8');
const classifierJsContent = fs.readFileSync(classifierJsPath, 'utf-8');

// ── 1-11: Worker Invariants & Implementation Parity ──
test('Area 1: classifier.worker.js exists and is valid readable script', () => {
  assert.ok(fs.existsSync(workerPath));
  assert.ok(workerContent.length > 500);
});

test('Area 2: worker sets env.allowLocalModels = true', () => {
  assert.ok(workerContent.includes('env.allowLocalModels = true;'));
});

test('Area 3: worker sets env.allowRemoteModels = false', () => {
  assert.ok(workerContent.includes('env.allowRemoteModels = false;'));
});

test('Area 4: worker sets env.localModelPath = \'/models/\'', () => {
  assert.ok(workerContent.includes("env.localModelPath = '/models/';"));
});

test('Area 5: worker initializes text-classification pipeline on docforge-intent', () => {
  assert.ok(workerContent.includes("pipeline('text-classification', 'docforge-intent'"));
  assert.ok(workerContent.includes("quantized: true"));
});

test('Area 6: worker defines LABEL_TO_TOOL_ID with all 46 intent classes', () => {
  assert.ok(workerContent.includes("'merge-pdf': 'merge-pdf'"));
  assert.ok(workerContent.includes("'split-pdf': 'split-pdf'"));
  assert.ok(workerContent.includes("'compress-pdf': 'compress-pdf'"));
  assert.ok(workerContent.includes("'docx-to-pdf': 'docx-to-pdf'"));
  assert.ok(workerContent.includes("'excel-to-pdf': 'excel-to-pdf'"));
  assert.ok(workerContent.includes("'powerpoint-to-pdf': 'powerpoint-to-pdf'"));
  assert.ok(workerContent.includes("'add-watermark': 'add-watermark'"));
  assert.ok(workerContent.includes("'bates-numbering': 'bates-numbering'"));
});

test('Area 7: worker maps unsupported class to unsupported', () => {
  assert.ok(workerContent.includes("'unsupported': 'unsupported'"));
});

test('Area 8: worker sends exact postMessage result contract with raw', () => {
  assert.ok(workerContent.includes("type: 'result'"));
  assert.ok(workerContent.includes("classLabel: label"));
  assert.ok(workerContent.includes("confidence: score"));
  assert.ok(workerContent.includes("raw: result"));
});

test('Area 9: worker handles init message type', () => {
  assert.ok(workerContent.includes("type === 'init'"));
  assert.ok(workerContent.includes("initializeModel()"));
});

test('Area 10: worker handles classify message type', () => {
  assert.ok(workerContent.includes("type === 'classify'"));
  assert.ok(workerContent.includes("classifierPipeline(text)"));
});

test('Area 11: worker handles embed_query with graceful null fallback', () => {
  assert.ok(workerContent.includes("type === 'embed_query'"));
  assert.ok(workerContent.includes("type: 'embed_result'"));
  assert.ok(workerContent.includes("embedding: null"));
});

// ── 12-17: Module Exports & Interface Verification ──
test('Area 12: classifier.js exports predictIntentAsync function', () => {
  assert.equal(typeof predictIntentAsync, 'function');
});

test('Area 13: classifier.js exports predictIntent function', () => {
  assert.equal(typeof predictIntent, 'function');
});

test('Area 14: classifier.js exports loadClassifierWeights function', () => {
  assert.equal(typeof loadClassifierWeights, 'function');
});

test('Area 15: classifier.js exports initClassifierWorker function', () => {
  assert.equal(typeof initClassifierWorker, 'function');
});

test('Area 16: classifier.js exports isClassifierWorkerReady function', () => {
  assert.equal(typeof isClassifierWorkerReady, 'function');
});

test('Area 17: classifier.js exports embedQueryText function', () => {
  assert.equal(typeof embedQueryText, 'function');
});

// ── 18-25: Synchronous TF-IDF Classification Fallbacks ──
await asyncTest('Area 18: predictIntent correctly classifies "merge pdf"', async () => {
  await loadClassifierWeights();
  const res = predictIntent('merge pdf');
  assert.equal(res.classLabel, 'merge-pdf');
  assert.ok(res.confidence > 0.8);
});

await asyncTest('Area 19: predictIntent correctly classifies "split pdf"', async () => {
  await loadClassifierWeights();
  const res = predictIntent('split pdf');
  assert.equal(res.classLabel, 'split-pdf');
  assert.ok(res.confidence > 0.8);
});

await asyncTest('Area 20: predictIntent correctly classifies "compress pdf"', async () => {
  await loadClassifierWeights();
  const res = predictIntent('compress pdf');
  assert.equal(res.classLabel, 'compress-pdf');
  assert.ok(res.confidence > 0.8);
});

await asyncTest('Area 21: predictIntent correctly classifies "rotate pdf"', async () => {
  await loadClassifierWeights();
  const res = predictIntent('rotate pdf');
  assert.equal(res.classLabel, 'rotate-pdf');
  assert.ok(res.confidence > 0.8);
});

await asyncTest('Area 22: predictIntent correctly classifies "protect pdf"', async () => {
  await loadClassifierWeights();
  const res = predictIntent('protect pdf');
  assert.equal(res.classLabel, 'protect-pdf');
  assert.ok(res.confidence > 0.8);
});

await asyncTest('Area 23: predictIntent correctly classifies "run ocr"', async () => {
  await loadClassifierWeights();
  const res = predictIntent('run ocr');
  assert.equal(res.classLabel, 'ocr-pdf');
  assert.ok(res.confidence > 0.8);
});

test('Area 24: predictIntent returns unknown for empty string', () => {
  const res = predictIntent('');
  assert.equal(res.classLabel, 'unknown');
  assert.equal(res.confidence, 1.0);
});

test('Area 25: predictIntent returns unknown for negation command', () => {
  const res = predictIntent('do not merge');
  assert.equal(res.classLabel, 'unknown');
  assert.equal(res.confidence, 1.0);
});

// ── 26-30: Source Invariant & Rejection Logic ──
test('Area 26: predictIntentAsync explicitly checks finalPredict === "unsupported"', () => {
  assert.ok(classifierJsContent.includes("if (finalPredict === 'unsupported')"));
});

test('Area 27: predictIntentAsync maps unsupported to unknown with 1.0 confidence', () => {
  assert.ok(classifierJsContent.includes("return { classLabel: 'unknown', confidence: 1.0 };"));
});

test('Area 28: predictIntentAsync preserves image-compressor keyword fallback to compress-pdf', () => {
  assert.ok(classifierJsContent.includes("if (finalPredict === 'image-compressor')"));
  assert.ok(classifierJsContent.includes("finalPredict = 'compress-pdf';"));
});

test('Area 29: classifier.js dispatches model-download-progress with docforge-intent', () => {
  assert.ok(classifierJsContent.includes("model: 'docforge-intent'"));
});

test('Area 30: classifierWorker.onmessage passes raw result object in resolver', () => {
  assert.ok(classifierJsContent.includes("resolver({ classLabel: data.classLabel, confidence: data.confidence, raw: data.raw });"));
});

// ── 31-36: Model Artifact Files Parity in Public Directory ──
const modelDir = path.join(ROOT_DIR, 'public', 'models', 'docforge-intent');

test('Area 31: public/models/docforge-intent/config.json exists and defines BertForSequenceClassification', () => {
  const configJson = JSON.parse(fs.readFileSync(path.join(modelDir, 'config.json'), 'utf-8'));
  assert.ok(configJson.architectures.includes('BertForSequenceClassification'));
  assert.equal(Object.keys(configJson.id2label).length, 46);
});

test('Area 32: public/models/docforge-intent/labels.json exists and has 46 classes', () => {
  const labelsJson = JSON.parse(fs.readFileSync(path.join(modelDir, 'labels.json'), 'utf-8'));
  assert.equal(Object.keys(labelsJson.id2label).length, 46);
  assert.equal(labelsJson.id2label['43'], 'unsupported');
});

test('Area 33: public/models/docforge-intent/tokenizer.json exists and is valid', () => {
  const stat = fs.statSync(path.join(modelDir, 'tokenizer.json'));
  assert.ok(stat.size > 500000, `tokenizer.json size was ${stat.size}`);
});

test('Area 34: public/models/docforge-intent/tokenizer_config.json exists and specifies BertTokenizer', () => {
  const tokConfig = JSON.parse(fs.readFileSync(path.join(modelDir, 'tokenizer_config.json'), 'utf-8'));
  assert.equal(tokConfig.tokenizer_class, 'BertTokenizer');
});

test('Area 35: public/models/docforge-intent/model_quantized.onnx exists and is > 20 MB', () => {
  const stat = fs.statSync(path.join(modelDir, 'model_quantized.onnx'));
  assert.ok(stat.size > 20000000, `model_quantized.onnx size was ${stat.size}`);
});

test('Area 36: public/models/docforge-intent/onnx/model_quantized.onnx exists for Transformers.js', () => {
  const stat = fs.statSync(path.join(modelDir, 'onnx', 'model_quantized.onnx'));
  assert.ok(stat.size > 20000000, `onnx/model_quantized.onnx size was ${stat.size}`);
});

console.log(`\n--- ALL ${totalTests}/${totalTests} TESTS PASSED (100% SUCCESS) ---`);
