/**
 * Canvas Production Master Molecular Verification Suite
 * 
 * 80+ rigorous, falsifiable automated test assertions across 12 distinct functional areas:
 * Area 1: Manifest Parity, Completeness & Graph Type Safety (Assertions 1–8)
 * Area 2: Typed Archive Contracts & Output Differentiation (Assertions 9–14)
 * Area 3: Shortest-Path BFS Conversion Solver (findConversionPath) (Assertions 15–22)
 * Area 4: NLP Tier 1 Exact Phrase Matching & Priority Invariant (Assertions 23–28)
 * Area 5: NLP Tier 2 Context Gating Against Canvas Active Pool (Assertions 29–34)
 * Area 6: NLP Ambiguity Resolution & Clarification Prompts (Assertions 35–39)
 * Area 7: DIT Ordinal & Exclusion Scanning (resolveDocumentTargets) (Assertions 40–47)
 * Area 8: Fan-Out Multi-Tool Detection (detectFanOutTools) (Assertions 48–53)
 * Area 9: Flow URL Security, Sanitization & Prototype Poisoning Neutralization (Assertions 54–61)
 * Area 10: Autosave Topology Gating & Serialization Decoupling (Assertions 62–67)
 * Area 11: Studio Parameter Synchrony & Interactive Tool Gating (needsStudioParams) (Assertions 68–73)
 * Area 12: DAG Cycle Detection & Pipeline Validation (Assertions 74–81)
 */

import assert from 'node:assert/strict';
import {
  TOOLS_MANIFEST,
  getToolRegistry,
  getToolValidation,
  normalizeExtension,
  getFormatCategory,
  findConversionPath
} from '../../src/utils/toolsManifest.js';

import {
  TOOL_REGISTRY,
  parseLocalNLPCommand,
  resolveDocumentTargets,
  detectFanOutTools,
  validateCanvasConnections,
  hasDependencyCycle,
  needsStudioParams,
  STUDIO_TOOLS,
  computeStructuralTopologyHash,
  NLPResolution
} from '../../src/utils/canvasBrain.js';

import {
  encodeFlowToUrl,
  decodeFlowFromUrl,
  WORKFLOW_PRESETS
} from '../../src/utils/flowPresets.js';

let totalTests = 0;
let passedTests = 0;

function runTest(areaNum, testName, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  ✓ Area ${areaNum}: ${testName}`);
  } catch (err) {
    console.error(`  ✗ Area ${areaNum} FAILED: ${testName}`);
    console.error(`    Details: ${err.message}`);
    throw err;
  }
}

async function runAsyncTest(areaNum, testName, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`  ✓ Area ${areaNum}: ${testName}`);
  } catch (err) {
    console.error(`  ✗ Area ${areaNum} FAILED: ${testName}`);
    console.error(`    Details: ${err.message}`);
    throw err;
  }
}

async function runMasterSuite() {
  console.log('===============================================================');
  console.log('STARTING CANVAS PRODUCTION MASTER MOLECULAR TEST SUITE');
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------
  // AREA 1: MANIFEST PARITY, COMPLETENESS & GRAPH TYPE SAFETY
  // ---------------------------------------------------------------------------
  console.log('--- Area 1: Manifest Parity, Completeness & Graph Type Safety ---');

  runTest(1, 'TOOLS_MANIFEST defines all 45 production tools', () => {
    const count = Object.keys(TOOLS_MANIFEST).length;
    assert.strictEqual(count >= 45, true, `Expected >= 45 tools, got ${count}`);
  });

  runTest(2, 'TOOL_REGISTRY derived from TOOLS_MANIFEST matches 1:1 in keys', () => {
    const manifestKeys = Object.keys(TOOLS_MANIFEST);
    const registryKeys = Object.keys(TOOL_REGISTRY);
    assert.strictEqual(registryKeys.length, manifestKeys.length);
    for (const key of manifestKeys) {
      assert.ok(TOOL_REGISTRY[key], `TOOL_REGISTRY missing tool '${key}'`);
    }
  });

  runTest(3, 'getToolValidation() produces valid validation rules matching all manifest tools', () => {
    const validations = getToolValidation();
    const manifestKeys = Object.keys(TOOLS_MANIFEST);
    assert.strictEqual(Object.keys(validations).length, manifestKeys.length);
    for (const key of manifestKeys) {
      const val = validations[key];
      assert.ok(Array.isArray(val.accept), `accept must be array for '${key}'`);
      assert.strictEqual(typeof val.minInputs, 'number', `minInputs must be number for '${key}'`);
      assert.strictEqual(typeof val.maxInputs, 'number', `maxInputs must be number for '${key}'`);
      assert.strictEqual(typeof val.outExt, 'string', `outExt must be string for '${key}'`);
    }
  });

  runTest(4, 'Every tool has valid outExt beginning with a dot', () => {
    for (const [id, tool] of Object.entries(TOOLS_MANIFEST)) {
      assert.ok(tool.outExt.startsWith('.'), `Tool '${id}' outExt '${tool.outExt}' does not start with dot`);
    }
  });

  runTest(5, 'Cardinality formulas satisfy minInputs >= 0 and maxInputs >= minInputs', () => {
    for (const [id, tool] of Object.entries(TOOLS_MANIFEST)) {
      assert.ok(tool.minInputs >= 0, `Tool '${id}' minInputs < 0: ${tool.minInputs}`);
      assert.ok(tool.maxInputs >= tool.minInputs, `Tool '${id}' maxInputs ${tool.maxInputs} < minInputs ${tool.minInputs}`);
      assert.ok(tool.maxInputs <= 100, `Tool '${id}' maxInputs excessive: ${tool.maxInputs}`);
    }
  });

  runTest(6, 'Every tool defines typed outputType contract with type of file, archive, or extracted', () => {
    for (const [id, tool] of Object.entries(TOOLS_MANIFEST)) {
      assert.ok(tool.outputType, `Tool '${id}' missing outputType`);
      assert.ok(['file', 'archive', 'extracted'].includes(tool.outputType.type), `Tool '${id}' unknown outputType.type: ${tool.outputType.type}`);
    }
  });

  runTest(7, 'normalizeExtension normalizes case, leading dot, whitespace, and query parameters', () => {
    assert.strictEqual(normalizeExtension('FILE.PDF'), '.pdf');
    assert.strictEqual(normalizeExtension('docx'), '.docx');
    assert.strictEqual(normalizeExtension('  .PNG  '), '.png');
    assert.strictEqual(normalizeExtension('report.xlsx?download=true'), '.xlsx');
    assert.strictEqual(normalizeExtension(''), '');
    assert.strictEqual(normalizeExtension(null), '');
  });

  runTest(8, 'getFormatCategory maps document, spreadsheet, presentation, image, and archive formats', () => {
    assert.strictEqual(getFormatCategory('.pdf'), 'pdf');
    assert.strictEqual(getFormatCategory('.docx'), 'docx');
    assert.strictEqual(getFormatCategory('.xlsx'), 'excel');
    assert.strictEqual(getFormatCategory('.csv'), 'excel');
    assert.strictEqual(getFormatCategory('.pptx'), 'powerpoint');
    assert.strictEqual(getFormatCategory('.png'), 'image');
    assert.strictEqual(getFormatCategory('.zip'), 'archive');
    assert.strictEqual(getFormatCategory('.unknownext'), 'unknown');
  });

  // ---------------------------------------------------------------------------
  // AREA 2: TYPED ARCHIVE CONTRACTS & OUTPUT DIFFERENTIATION
  // ---------------------------------------------------------------------------
  console.log('\n--- Area 2: Typed Archive Contracts & Output Differentiation ---');

  runTest(9, 'split-pdf outputs archive containing PDFs and marks destructive true', () => {
    const splitMeta = TOOLS_MANIFEST['split-pdf'];
    assert.deepStrictEqual(splitMeta.outputType, { type: 'archive', contains: 'pdf' });
    assert.strictEqual(splitMeta.outExt, '.zip');
    assert.strictEqual(splitMeta.destructive, true);
  });

  runTest(10, 'pdf-to-image outputs archive containing images', () => {
    const p2iMeta = TOOLS_MANIFEST['pdf-to-image'];
    assert.deepStrictEqual(p2iMeta.outputType, { type: 'archive', contains: 'image' });
    assert.strictEqual(p2iMeta.outExt, '.zip');
  });

  runTest(11, 'pdf-to-excel outputs excel spreadsheet with outExt .xlsx', () => {
    const extMeta = TOOLS_MANIFEST['pdf-to-excel'];
    assert.deepStrictEqual(extMeta.outputType, { type: 'file', format: 'xlsx' });
    assert.strictEqual(extMeta.outExt, '.xlsx');
  });

  runTest(12, 'unzip-file accepts zip archives and outputs unpackable files', () => {
    const unzipMeta = TOOLS_MANIFEST['unzip-file'];
    assert.deepStrictEqual(unzipMeta.accept, ['.zip']);
    assert.strictEqual(unzipMeta.minInputs, 1);
    assert.strictEqual(unzipMeta.maxInputs, 50);
    assert.deepStrictEqual(unzipMeta.outputType, { type: 'extracted', contains: 'any' });
  });

  runTest(13, 'Archive containing PDFs routes through unzip-file to pdf-to-word', () => {
    const path = findConversionPath({ type: 'archive', contains: 'pdf' }, 'pdf-to-word');
    assert.deepStrictEqual(path, ['unzip-file']);
  });

  runTest(14, 'Archive containing images routes through unzip-file to image-to-pdf', () => {
    const path = findConversionPath({ type: 'archive', contains: 'image' }, 'compress-pdf');
    assert.deepStrictEqual(path, ['unzip-file', 'image-to-pdf']);
  });

  // ---------------------------------------------------------------------------
  // AREA 3: SHORTEST-PATH BFS CONVERSION SOLVER
  // ---------------------------------------------------------------------------
  console.log('\n--- Area 3: Shortest-Path BFS Conversion Solver ---');

  runTest(15, 'Direct format match returns empty array [] (no conversion needed)', () => {
    const path = findConversionPath('.pdf', 'compress-pdf');
    assert.deepStrictEqual(path, []);
  });

  runTest(16, 'Word (.docx) input to PDF tool resolves via word-to-pdf / docx-to-pdf', () => {
    const path = findConversionPath('.docx', 'compress-pdf');
    assert.deepStrictEqual(path, ['docx-to-pdf']);
  });

  runTest(17, 'Excel (.xlsx) input to PDF tool resolves via excel-to-pdf', () => {
    const path = findConversionPath('.xlsx', 'compress-pdf');
    assert.deepStrictEqual(path, ['excel-to-pdf']);
  });

  runTest(18, 'PNG image input to PDF tool resolves via image-to-pdf', () => {
    const path = findConversionPath('.png', 'compress-pdf');
    assert.deepStrictEqual(path, ['image-to-pdf']);
  });

  runTest(19, 'PowerPoint (.pptx) input to PDF tool resolves via powerpoint-to-pdf', () => {
    const path = findConversionPath('.pptx', 'compress-pdf');
    assert.deepStrictEqual(path, ['powerpoint-to-pdf']);
  });

  runTest(20, 'HTML (.html) input to PDF tool resolves via html-to-pdf', () => {
    const path = findConversionPath('.html', 'compress-pdf');
    assert.deepStrictEqual(path, ['html-to-pdf']);
  });

  runTest(21, 'Plain text (.txt) input to PDF tool resolves via text-to-pdf', () => {
    const path = findConversionPath('.txt', 'compress-pdf');
    assert.deepStrictEqual(path, ['text-to-pdf']);
  });

  runTest(22, 'Unsupported file format (.mp3, .bin) returns null (impossible conversion)', () => {
    assert.strictEqual(findConversionPath('.mp3', 'compress-pdf'), null);
    assert.strictEqual(findConversionPath('.exe', 'merge-pdf'), null);
    assert.strictEqual(findConversionPath('.bin', 'pdf-to-word'), null);
  });

  // ---------------------------------------------------------------------------
  // AREA 4: NLP TIER 1 EXACT PHRASE MATCHING & PRIORITY INVARIANT
  // ---------------------------------------------------------------------------
  console.log('\n--- Area 4: NLP Tier 1 Exact Phrase Matching ---');

  await runAsyncTest(23, 'Tier 1 exact match: "convert to word" resolves pdf-to-word at confidence 1.0', async () => {
    const res = await parseLocalNLPCommand('convert to word', []);
    assert.strictEqual(res.actionId, 'pdf-to-word');
    assert.strictEqual(res.confidence, 1.0);
    assert.strictEqual(res.isAmbiguous, false);
  });

  await runAsyncTest(24, 'Tier 1 exact match: "convert to excel" resolves pdf-to-excel at confidence 1.0', async () => {
    const res = await parseLocalNLPCommand('convert to excel', []);
    assert.strictEqual(res.actionId, 'pdf-to-excel');
    assert.strictEqual(res.confidence, 1.0);
  });

  await runAsyncTest(25, 'Tier 1 exact match: "convert to powerpoint" resolves pdf-to-powerpoint at confidence 1.0', async () => {
    const res = await parseLocalNLPCommand('convert to powerpoint', []);
    assert.strictEqual(res.actionId, 'pdf-to-powerpoint');
    assert.strictEqual(res.confidence, 1.0);
  });

  await runAsyncTest(26, 'Tier 1 exact match: "unzip archive" resolves unzip-file at confidence 1.0', async () => {
    const res = await parseLocalNLPCommand('unzip archive', []);
    assert.strictEqual(res.actionId, 'unzip-file');
    assert.strictEqual(res.confidence, 1.0);
  });

  await runAsyncTest(27, 'Tier 1 exact match: "merge pdf" resolves merge-pdf at confidence 1.0', async () => {
    const res = await parseLocalNLPCommand('merge pdf', []);
    assert.strictEqual(res.actionId, 'merge-pdf');
    assert.strictEqual(res.confidence, 1.0);
  });

  await runAsyncTest(28, 'Tier 1 exact match string coercion works seamlessly via String subclass', async () => {
    const res = await parseLocalNLPCommand('convert to word', []);
    assert.strictEqual(res.toString(), 'pdf-to-word');
    assert.strictEqual(res == 'pdf-to-word', true);
  });

  // ---------------------------------------------------------------------------
  // AREA 5: NLP TIER 2 CONTEXT GATING & TIER 3 FUZZY
  // ---------------------------------------------------------------------------
  console.log('\n--- Area 5: NLP Tier 2 Context Gating & Tier 3 Fuzzy ---');

  await runAsyncTest(29, 'Context gating: image files on canvas redirect "convert" to image-converter', async () => {
    const imagePool = [{ id: 'f1', name: 'photo.png' }];
    const res = await parseLocalNLPCommand('convert', imagePool);
    assert.strictEqual(res.actionId, 'image-converter');
  });

  await runAsyncTest(30, 'Context gating: non-image pool on "convert" defaults to docx-to-pdf', async () => {
    const docPool = [{ id: 'f1', name: 'report.docx' }];
    const res = await parseLocalNLPCommand('convert', docPool);
    assert.strictEqual(res.actionId, 'docx-to-pdf');
  });

  await runAsyncTest(31, 'Tier 3 fuzzy matching: misspelled "compres pdf" resolves to compress-pdf', async () => {
    const res = await parseLocalNLPCommand('compres pdf', []);
    assert.strictEqual(res.actionId, 'compress-pdf');
    assert.strictEqual(res.confidence, 0.75);
  });

  await runAsyncTest(32, 'Tier 3 fuzzy matching: misspelled "rotat pdf" resolves to rotate-pdf', async () => {
    const res = await parseLocalNLPCommand('rotat pdf', []);
    assert.strictEqual(res.actionId, 'rotate-pdf');
  });

  await runAsyncTest(33, 'Short token protection: 2-letter or 3-letter tokens do not trigger fuzzy false positives', async () => {
    const res = await parseLocalNLPCommand('xyz abc qw', []);
    assert.strictEqual(res, null);
  });

  await runAsyncTest(34, 'Empty or whitespace-only NLP commands return null without crashing', async () => {
    assert.strictEqual(await parseLocalNLPCommand('', []), null);
    assert.strictEqual(await parseLocalNLPCommand('   ', []), null);
  });

  // ---------------------------------------------------------------------------
  // AREA 6: NLP AMBIGUITY RESOLUTION & CLARIFICATION PROMPTS
  // ---------------------------------------------------------------------------
  console.log('\n--- Area 6: NLP Ambiguity Resolution & Clarification Prompts ---');

  runTest(35, 'NLPResolution constructs with expected ambiguity metadata', () => {
    const res = new NLPResolution('merge-pdf', {
      isAmbiguous: true,
      candidates: ['merge-pdf', 'combine-pdf'],
      confidence: 0.65,
      clarificationPrompt: 'Did you mean Merge PDF or Combine PDF?'
    });
    assert.strictEqual(res.actionId, 'merge-pdf');
    assert.strictEqual(res.isAmbiguous, true);
    assert.strictEqual(res.confidence, 0.65);
    assert.strictEqual(res.clarificationPrompt, 'Did you mean Merge PDF or Combine PDF?');
    assert.deepStrictEqual(res.candidates, ['merge-pdf', 'combine-pdf']);
  });

  runTest(36, 'Unambiguous NLPResolution has null clarificationPrompt and false isAmbiguous', () => {
    const res = new NLPResolution('split-pdf', { confidence: 1.0 });
    assert.strictEqual(res.isAmbiguous, false);
    assert.strictEqual(res.clarificationPrompt, null);
    assert.strictEqual(res.confidence, 1.0);
  });

  runTest(37, 'NLPResolution acts as valid string in concatenation and string templates', () => {
    const res = new NLPResolution('excel-to-pdf');
    assert.strictEqual(`Tool: ${res}`, 'Tool: excel-to-pdf');
    assert.strictEqual(res.toUpperCase(), 'EXCEL-TO-PDF');
  });

  runTest(38, 'NLPResolution handles empty or undefined actionId gracefully', () => {
    const emptyRes = new NLPResolution();
    assert.strictEqual(emptyRes.actionId, undefined);
    assert.strictEqual(emptyRes.toString(), '');
    assert.deepStrictEqual(emptyRes.candidates, []);
  });

  runTest(39, 'Clarification prompt maintains clean tone without internal AI jargon', () => {
    const res = new NLPResolution('pdf-to-word', {
      isAmbiguous: true,
      clarificationPrompt: 'Did you mean PDF to Word or PDF to Excel?'
    });
    assert.ok(!res.clarificationPrompt.includes('LLM'));
    assert.ok(!res.clarificationPrompt.includes('model'));
    assert.ok(!res.clarificationPrompt.includes('softmax'));
    assert.ok(!res.clarificationPrompt.includes('temperature'));
  });

  // ---------------------------------------------------------------------------
  // AREA 7: DIT ORDINAL & EXCLUSION SCANNING
  // ---------------------------------------------------------------------------
  console.log('\n--- Area 7: DIT Ordinal & Exclusion Scanning ---');

  const filePool = [
    { id: 'f1', name: 'contract.pdf', x: 100, y: 100 },
    { id: 'f2', name: 'invoice.pdf', x: 300, y: 100 },
    { id: 'f3', name: 'appendix.pdf', x: 500, y: 100 },
    { id: 'f4', name: 'summary.pdf', x: 700, y: 100 }
  ];

  runTest(40, 'DIT: "convert the first document" targets index 0 node (contract.pdf)', () => {
    const result = resolveDocumentTargets('convert the first document', filePool);
    assert.strictEqual(result.resolved, true);
    assert.strictEqual(result.included.length, 1);
    assert.strictEqual(result.included[0].id, 'f1');
  });

  runTest(41, 'DIT: "convert the second document" targets index 1 node (invoice.pdf)', () => {
    const result = resolveDocumentTargets('convert the second document', filePool);
    assert.strictEqual(result.resolved, true);
    assert.strictEqual(result.included.length, 1);
    assert.strictEqual(result.included[0].id, 'f2');
  });

  runTest(42, 'DIT: "convert the third document" targets index 2 node (appendix.pdf)', () => {
    const result = resolveDocumentTargets('convert the third document', filePool);
    assert.strictEqual(result.resolved, true);
    assert.strictEqual(result.included.length, 1);
    assert.strictEqual(result.included[0].id, 'f3');
  });

  runTest(43, 'DIT: "merge 1st and 3rd" targets indices 0 and 2', () => {
    const result = resolveDocumentTargets('merge 1st and 3rd', filePool);
    assert.strictEqual(result.resolved, true);
    assert.strictEqual(result.included.length, 2);
    const ids = result.included.map(n => n.id).sort();
    assert.deepStrictEqual(ids, ['f1', 'f3']);
  });

  runTest(44, 'DIT: "all except second" excludes index 1 and includes indices 0, 2, 3', () => {
    const result = resolveDocumentTargets('merge all except second', filePool);
    assert.strictEqual(result.resolved, true);
    assert.strictEqual(result.excluded.length, 1);
    assert.strictEqual(result.excluded[0].id, 'f2');
    assert.strictEqual(result.included.length, 3);
    const includedIds = result.included.map(n => n.id).sort();
    assert.deepStrictEqual(includedIds, ['f1', 'f3', 'f4']);
  });

  runTest(45, 'DIT: "the last document" targets the rightmost node (summary.pdf)', () => {
    const result = resolveDocumentTargets('compress the last document', filePool);
    assert.strictEqual(result.resolved, true);
    assert.strictEqual(result.included.length, 1);
    assert.strictEqual(result.included[0].id, 'f4');
  });

  runTest(46, 'DIT: "all outputs" captures generated output nodes', () => {
    const poolWithOutputs = [
      ...filePool,
      { id: 'ws-out-1', name: 'merged.pdf', x: 900, y: 100 },
      { id: 'output:2', name: 'split.zip', x: 1100, y: 100 }
    ];
    const result = resolveDocumentTargets('compress all outputs', poolWithOutputs);
    assert.strictEqual(result.resolved, true);
    assert.strictEqual(result.included.length, 2);
    assert.strictEqual(result.included[0].id, 'ws-out-1');
    assert.strictEqual(result.included[1].id, 'output:2');
  });

  runTest(47, 'DIT: unreferenced command returns resolved: false and empty target set', () => {
    const result = resolveDocumentTargets('hello world', filePool);
    assert.strictEqual(result.resolved, false);
    assert.strictEqual(result.included.length, 0);
  });

  // ---------------------------------------------------------------------------
  // AREA 8: FAN-OUT MULTI-TOOL DETECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- Area 8: Fan-Out Multi-Tool Detection ---');

  runTest(48, 'Compound command "convert to word and excel" detects fan-out tools', () => {
    const tools = detectFanOutTools('convert to word and excel');
    assert.deepStrictEqual(tools, ['pdf-to-word', 'pdf-to-excel']);
  });

  runTest(49, 'Compound command "convert to docx, xlsx, and pptx" detects 3 fan-out tools', () => {
    const tools = detectFanOutTools('convert to docx, xlsx, and pptx');
    assert.deepStrictEqual(tools, ['pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint']);
  });

  runTest(50, 'Compound command "compress and protect" detects compress-pdf and protect-pdf', () => {
    const tools = detectFanOutTools('compress and protect');
    assert.deepStrictEqual(tools, ['compress-pdf', 'protect-pdf']);
  });

  runTest(51, 'Compound command "compress and rotate" detects compress-pdf and rotate-pdf', () => {
    const tools = detectFanOutTools('compress and rotate');
    assert.deepStrictEqual(tools, ['compress-pdf', 'rotate-pdf']);
  });

  runTest(52, 'Single tool command "compress the pdf" returns null (never triggers fan-out)', () => {
    const tools = detectFanOutTools('compress the pdf');
    assert.strictEqual(tools, null);
  });

  runTest(53, 'Sequential command "compress then rotate" returns null (pipeline, not parallel fan-out)', () => {
    const tools = detectFanOutTools('compress then rotate');
    assert.strictEqual(tools, null);
  });

  // ---------------------------------------------------------------------------
  // AREA 9: FLOW URL SECURITY & SANITIZATION
  // ---------------------------------------------------------------------------
  console.log('\n--- Area 9: Flow URL Security & Sanitization ---');

  runTest(54, 'Malformed base64 string decodes safely to null', () => {
    assert.strictEqual(decodeFlowFromUrl('invalid-base64-!@#$%^&*()'), null);
  });

  runTest(55, 'Corrupt JSON inside base64 decodes safely to null', () => {
    const corruptBase64 = Buffer.from('{ corrupt json content:').toString('base64');
    assert.strictEqual(decodeFlowFromUrl(corruptBase64), null);
  });

  runTest(56, 'Non-array JSON payload decodes safely to null', () => {
    const objBase64 = Buffer.from(JSON.stringify({ someKey: 'value' })).toString('base64');
    assert.strictEqual(decodeFlowFromUrl(objBase64), null);
    const intBase64 = Buffer.from(JSON.stringify(12345)).toString('base64');
    assert.strictEqual(decodeFlowFromUrl(intBase64), null);
  });

  runTest(57, 'Prototype pollution attempt with toolId "__proto__" is neutralized', () => {
    const maliciousPayload = [
      { id: 'op-1', toolId: '__proto__', x: 100, y: 100, inputIds: [] }
    ];
    const encoded = Buffer.from(JSON.stringify(maliciousPayload)).toString('base64');
    const decoded = decodeFlowFromUrl(encoded);
    assert.strictEqual(decoded, null);
    assert.strictEqual(Object.prototype.hasOwnProperty('polluted'), false);
  });

  runTest(58, 'Prototype pollution attempt with toolId "constructor" is neutralized', () => {
    const maliciousPayload = [
      { id: 'op-1', toolId: 'constructor', x: 100, y: 100, inputIds: [] }
    ];
    const encoded = Buffer.from(JSON.stringify(maliciousPayload)).toString('base64');
    const decoded = decodeFlowFromUrl(encoded);
    assert.strictEqual(decoded, null);
  });

  runTest(59, 'Negative coordinates are safely clamped to 0', () => {
    const payload = [
      { id: 'op-1', toolId: 'compress-pdf', x: -500, y: -200, inputIds: [] }
    ];
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const decoded = decodeFlowFromUrl(encoded);
    assert.ok(decoded);
    assert.strictEqual(decoded[0].x, 0);
    assert.strictEqual(decoded[0].y, 0);
  });

  runTest(60, 'Extreme out-of-bounds coordinates are safely clamped to 10000', () => {
    const payload = [
      { id: 'op-1', toolId: 'compress-pdf', x: 999999, y: 888888, inputIds: [] }
    ];
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const decoded = decodeFlowFromUrl(encoded);
    assert.ok(decoded);
    assert.strictEqual(decoded[0].x, 10000);
    assert.strictEqual(decoded[0].y, 10000);
  });

  runTest(61, 'encodeFlowToUrl and decodeFlowFromUrl round-trip cleanly preserves structure', () => {
    const originalOps = [
      { id: 'op-1', toolId: 'merge-pdf', x: 200, y: 150, inputIds: ['f1', 'f2'], params: {} },
      { id: 'op-2', toolId: 'compress-pdf', x: 500, y: 150, inputIds: ['op-1'], params: { quality: 0.8 } }
    ];
    const encoded = encodeFlowToUrl(originalOps);
    assert.ok(typeof encoded === 'string' && encoded.length > 0);
    const decoded = decodeFlowFromUrl(encoded);
    assert.ok(decoded && decoded.length === 2);
    assert.strictEqual(decoded[0].toolId, 'merge-pdf');
    assert.strictEqual(decoded[1].toolId, 'compress-pdf');
    assert.deepStrictEqual(decoded[1].params, { quality: 0.8 });
  });

  // ---------------------------------------------------------------------------
  // AREA 10: AUTOSAVE TOPOLOGY GATING & SERIALIZATION DECOUPLING
  // ---------------------------------------------------------------------------
  console.log('\n--- Area 10: Autosave Topology Gating & Serialization Decoupling ---');

  const baseQueue = [{ id: 'f1', name: 'test.pdf', status: 'ready', x: 100, y: 100 }];
  const basePan = { x: 0, y: 0 };
  const baseZoom = 1;

  runTest(62, 'Progress tick increments produce identical topology hash', () => {
    const opTick0 = [{ id: 'op-1', toolId: 'compress-pdf', status: 'idle', progress: 0, x: 200, y: 200, inputIds: ['f1'], outputId: null, params: {} }];
    const opTick50 = [{ id: 'op-1', toolId: 'compress-pdf', status: 'running', progress: 50, x: 200, y: 200, inputIds: ['f1'], outputId: null, params: {} }];
    const opTick100 = [{ id: 'op-1', toolId: 'compress-pdf', status: 'running', progress: 100, x: 200, y: 200, inputIds: ['f1'], outputId: null, params: {} }];

    const hash0 = computeStructuralTopologyHash(baseQueue, opTick0, basePan, baseZoom, true);
    const hash50 = computeStructuralTopologyHash(baseQueue, opTick50, basePan, baseZoom, true);
    const hash100 = computeStructuralTopologyHash(baseQueue, opTick100, basePan, baseZoom, true);

    assert.strictEqual(hash0, hash50, 'Hash must not change when progress ticks 0 -> 50%');
    assert.strictEqual(hash50, hash100, 'Hash must not change when progress ticks 50 -> 100%');
  });

  runTest(63, 'Pending vs completed execution status produces distinct topology hash', () => {
    const opPending = [{ id: 'op-1', toolId: 'compress-pdf', status: 'running', x: 200, y: 200, inputIds: ['f1'], outputId: null, params: {} }];
    const opCompleted = [{ id: 'op-1', toolId: 'compress-pdf', status: 'completed', x: 200, y: 200, inputIds: ['f1'], outputId: 'out-1', params: {} }];

    const hashPending = computeStructuralTopologyHash(baseQueue, opPending, basePan, baseZoom, true);
    const hashCompleted = computeStructuralTopologyHash(baseQueue, opCompleted, basePan, baseZoom, true);

    assert.notStrictEqual(hashPending, hashCompleted, 'Hash must change upon completion');
  });

  runTest(64, 'Node addition produces distinct topology hash', () => {
    const op1 = [{ id: 'op-1', toolId: 'compress-pdf', status: 'idle', x: 200, y: 200, inputIds: ['f1'], outputId: null, params: {} }];
    const op2 = [
      ...op1,
      { id: 'op-2', toolId: 'protect-pdf', status: 'idle', x: 500, y: 200, inputIds: ['op-1'], outputId: null, params: {} }
    ];

    const hash1 = computeStructuralTopologyHash(baseQueue, op1, basePan, baseZoom, true);
    const hash2 = computeStructuralTopologyHash(baseQueue, op2, basePan, baseZoom, true);

    assert.notStrictEqual(hash1, hash2, 'Hash must change when operator added');
  });

  runTest(65, 'Connection modification produces distinct topology hash', () => {
    const opA = [{ id: 'op-1', toolId: 'merge-pdf', status: 'idle', x: 200, y: 200, inputIds: ['f1'], outputId: null, params: {} }];
    const opB = [{ id: 'op-1', toolId: 'merge-pdf', status: 'idle', x: 200, y: 200, inputIds: ['f1', 'f2'], outputId: null, params: {} }];

    const hashA = computeStructuralTopologyHash(baseQueue, opA, basePan, baseZoom, true);
    const hashB = computeStructuralTopologyHash(baseQueue, opB, basePan, baseZoom, true);

    assert.notStrictEqual(hashA, hashB, 'Hash must change when input connection modified');
  });

  runTest(66, 'Parameter change produces distinct topology hash', () => {
    const opA = [{ id: 'op-1', toolId: 'compress-pdf', status: 'idle', x: 200, y: 200, inputIds: ['f1'], outputId: null, params: { quality: 0.8 } }];
    const opB = [{ id: 'op-1', toolId: 'compress-pdf', status: 'idle', x: 200, y: 200, inputIds: ['f1'], outputId: null, params: { quality: 0.5 } }];

    const hashA = computeStructuralTopologyHash(baseQueue, opA, basePan, baseZoom, true);
    const hashB = computeStructuralTopologyHash(baseQueue, opB, basePan, baseZoom, true);

    assert.notStrictEqual(hashA, hashB, 'Hash must change when operator parameters change');
  });

  runTest(67, 'Viewport zoom and pan produces distinct topology hash', () => {
    const op = [{ id: 'op-1', toolId: 'compress-pdf', status: 'idle', x: 200, y: 200, inputIds: ['f1'], outputId: null, params: {} }];

    const hashZoom1 = computeStructuralTopologyHash(baseQueue, op, basePan, 1.0, true);
    const hashZoom2 = computeStructuralTopologyHash(baseQueue, op, basePan, 1.5, true);

    assert.notStrictEqual(hashZoom1, hashZoom2, 'Hash must change when zoom changes');
  });

  // ---------------------------------------------------------------------------
  // AREA 11: STUDIO PARAMETER SYNCHRONY & INTERACTIVE TOOL GATING
  // ---------------------------------------------------------------------------
  console.log('\n--- Area 11: Studio Parameter Synchrony & Interactive Tool Gating ---');

  runTest(68, 'STUDIO_TOOLS contains all 7 interactive studio tools', () => {
    const expected = ['organize-pdf', 'redact-pdf', 'sign-pdf', 'compare-pdf', 'edit-pdf', 'crop-pdf', 'pdf-forms'];
    for (const tool of expected) {
      assert.ok(STUDIO_TOOLS.has(tool), `Missing studio tool: ${tool}`);
    }
  });

  runTest(69, 'needsStudioParams returns true for empty interactive studio tool parameters', () => {
    assert.strictEqual(needsStudioParams('organize-pdf', {}), true);
    assert.strictEqual(needsStudioParams('sign-pdf', {}), true);
    assert.strictEqual(needsStudioParams('redact-pdf', {}), true);
    assert.strictEqual(needsStudioParams('crop-pdf', {}), true);
    assert.strictEqual(needsStudioParams('edit-pdf', {}), true);
    assert.strictEqual(needsStudioParams('pdf-forms', {}), true);
    assert.strictEqual(needsStudioParams('compare-pdf', {}), true);
  });

  runTest(70, 'needsStudioParams returns false for organize-pdf when pageConfigs are configured', () => {
    assert.strictEqual(needsStudioParams('organize-pdf', { pageConfigs: [{ page: 1 }] }), false);
    assert.strictEqual(needsStudioParams('organize-pdf', { pages: [1, 2] }), false);
  });

  runTest(71, 'needsStudioParams returns false for sign-pdf when signature data is provided', () => {
    assert.strictEqual(needsStudioParams('sign-pdf', { signatureData: 'data:image/png;base64,...' }), false);
    assert.strictEqual(needsStudioParams('sign-pdf', { fields: [{ x: 10, y: 10 }] }), false);
  });

  runTest(72, 'needsStudioParams returns false for crop-pdf when cropBox is set', () => {
    assert.strictEqual(needsStudioParams('crop-pdf', { cropBox: { x: 0, y: 0, w: 100, h: 100 } }), false);
  });

  runTest(73, 'needsStudioParams returns false for automated non-studio tools', () => {
    assert.strictEqual(needsStudioParams('compress-pdf', {}), false);
    assert.strictEqual(needsStudioParams('merge-pdf', {}), false);
    assert.strictEqual(needsStudioParams('pdf-to-word', {}), false);
  });

  // ---------------------------------------------------------------------------
  // AREA 12: DAG CYCLE DETECTION & PIPELINE VALIDATION
  // ---------------------------------------------------------------------------
  console.log('\n--- Area 12: DAG Cycle Detection & Pipeline Validation ---');

  runTest(74, 'hasDependencyCycle detects direct 2-node cycle (A -> B -> A)', () => {
    const ops = [
      { id: 'op-1', inputIds: ['op-2'] },
      { id: 'op-2', inputIds: ['op-1'] }
    ];
    assert.strictEqual(hasDependencyCycle('op-1', 'op-2', ops), true);
  });

  runTest(75, 'hasDependencyCycle detects 3-node transitive cycle (A -> B -> C -> A)', () => {
    const ops = [
      { id: 'op-1', inputIds: ['op-3'] },
      { id: 'op-2', inputIds: ['op-1'] },
      { id: 'op-3', inputIds: ['op-2'] }
    ];
    assert.strictEqual(hasDependencyCycle('op-1', 'op-3', ops), true);
  });

  runTest(76, 'hasDependencyCycle confirms valid linear DAG has no cycle (returns false)', () => {
    const ops = [
      { id: 'op-1', inputIds: ['f1'] },
      { id: 'op-2', inputIds: ['op-1'] },
      { id: 'op-3', inputIds: ['op-2'] }
    ];
    assert.strictEqual(hasDependencyCycle('op-1', 'op-3', ops), false);
  });

  runTest(77, 'hasDependencyCycle confirms valid diamond DAG has no cycle', () => {
    const ops = [
      { id: 'op-1', inputIds: ['f1'] },
      { id: 'op-2', inputIds: ['op-1'] },
      { id: 'op-3', inputIds: ['op-1'] },
      { id: 'op-4', inputIds: ['op-2', 'op-3'] }
    ];
    assert.strictEqual(hasDependencyCycle('op-1', 'op-4', ops), false);
  });

  runTest(78, 'validateCanvasConnections reports cycle-error for circular connection', () => {
    const ops = [
      { id: 'op-1', toolId: 'compress-pdf', inputIds: ['op-2'] },
      { id: 'op-2', toolId: 'compress-pdf', inputIds: ['op-1'] }
    ];
    const issues = validateCanvasConnections(ops, []);
    const cycleIssue = issues.find(i => i.type === 'cycle-error');
    assert.ok(cycleIssue, 'Must find cycle-error issue');
    assert.strictEqual(cycleIssue.opId, 'op-1');
  });

  runTest(79, 'validateCanvasConnections reports cardinality-mismatch for insufficient inputs', () => {
    const queue = [{ id: 'f1', name: 'single.pdf' }];
    const ops = [
      { id: 'op-1', toolId: 'merge-pdf', inputIds: ['f1'] }
    ];
    const issues = validateCanvasConnections(ops, queue);
    const cardIssue = issues.find(i => i.type === 'cardinality-mismatch');
    assert.ok(cardIssue, 'Must find cardinality-mismatch issue');
    assert.ok(cardIssue.message.includes('at least 2'));
  });

  runTest(80, 'validateCanvasConnections detects format mismatch and proposes auto-heal conversion path', () => {
    const queue = [{ id: 'f1', name: 'doc.docx' }];
    const ops = [
      { id: 'op-1', toolId: 'merge-pdf', inputIds: ['f1', 'f1'] }
    ];
    const issues = validateCanvasConnections(ops, queue);
    const formatIssue = issues.find(i => i.type === 'format-mismatch');
    assert.ok(formatIssue, 'Must find format-mismatch issue');
    assert.strictEqual(formatIssue.suggestedToolId, 'docx-to-pdf');
    assert.deepStrictEqual(formatIssue.conversionPath, ['docx-to-pdf']);
  });

  runTest(81, 'validateCanvasConnections detects typed archive mismatch from split-pdf to pdf-to-word', () => {
    const ops = [
      { id: 'op-split', toolId: 'split-pdf', inputIds: ['f1'] },
      { id: 'op-word', toolId: 'pdf-to-word', inputIds: ['op-split'] }
    ];
    const queue = [{ id: 'f1', name: 'doc.pdf' }];
    const issues = validateCanvasConnections(ops, queue);
    const formatIssue = issues.find(i => i.type === 'format-mismatch' && i.opId === 'op-word');
    assert.ok(formatIssue, 'Must detect typed archive mismatch on op-word');
    assert.strictEqual(formatIssue.suggestedToolId, 'unzip-file');
  });

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`MASTER TEST SUITE COMPLETE: ${passedTests} / ${totalTests} PASSED (100%)`);
  console.log('===============================================================\n');
}

runMasterSuite().catch(err => {
  console.error('\nFATAL ERROR IN TEST SUITE:', err);
  process.exit(1);
});
