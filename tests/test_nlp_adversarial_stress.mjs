/**
 * Adversarial Quality & Verification Stress Test Suite
 * DocForge Canvas NLP Engine - Phase 3 Audit
 */

import assert from 'node:assert/strict';
import {
  normalizeUserPrompt,
  parseLocalNLPCommand,
  extractCommandParameters,
  TOOL_REGISTRY,
  NLPResolution
} from '../src/utils/canvasBrain.js';

import {
  encodeFlowToUrl,
  decodeFlowFromUrl
} from '../src/utils/flowPresets.js';

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ [ASSERTION ${total}] ${name}`);
  } catch (err) {
    console.error(`  ✗ [ASSERTION ${total}] ${name}`);
    console.error(err);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✓ [ASSERTION ${total}] ${name}`);
  } catch (err) {
    console.error(`  ✗ [ASSERTION ${total}] ${name}`);
    console.error(err);
    throw err;
  }
}

console.log('===============================================================');
console.log('STARTING PHASE 3 ADVERSARIAL NLP & SECURITY STRESS TEST SUITE');
console.log('===============================================================\n');

// ---------------------------------------------------------------------------
// SECTION 1: Empty & Whitespace Prompts
// ---------------------------------------------------------------------------
console.log('--- Section 1: Empty & Whitespace Prompts ---');

runTest('Empty string prompt returns empty string from normalizeUserPrompt', () => {
  assert.strictEqual(normalizeUserPrompt(''), '');
});

runTest('Whitespace-only string prompt returns empty string from normalizeUserPrompt', () => {
  assert.strictEqual(normalizeUserPrompt('   '), '');
  assert.strictEqual(normalizeUserPrompt('\t\n  \r\n '), '');
});

runTest('Null and undefined prompt inputs return empty string safely without error', () => {
  assert.strictEqual(normalizeUserPrompt(null), '');
  assert.strictEqual(normalizeUserPrompt(undefined), '');
  assert.strictEqual(normalizeUserPrompt(123), '');
  assert.strictEqual(normalizeUserPrompt({}), '');
});

await runAsyncTest('Empty string prompt returns null from parseLocalNLPCommand', async () => {
  const res = await parseLocalNLPCommand('', []);
  assert.strictEqual(res, null);
});

await runAsyncTest('Whitespace-only prompt returns null from parseLocalNLPCommand', async () => {
  const res = await parseLocalNLPCommand('      ', []);
  assert.strictEqual(res, null);
});

// ---------------------------------------------------------------------------
// SECTION 2: Extreme Typo Strings & Normalized Routing
// ---------------------------------------------------------------------------
console.log('\n--- Section 2: Extreme Typo Strings & Normalized Routing ---');

runTest('Extreme typo "cnvrt this pfd 2 wrd" normalizes to "convert this pdf to word"', () => {
  assert.strictEqual(normalizeUserPrompt('cnvrt this pfd 2 wrd'), 'convert this pdf to word');
});

runTest('Extreme typo "cmprs my fls" normalizes to "compress my fls"', () => {
  assert.strictEqual(normalizeUserPrompt('cmprs my fls'), 'compress my fls');
});

runTest('Extreme typo "mrg evrythng" normalizes to "merge evrythng"', () => {
  assert.strictEqual(normalizeUserPrompt('mrg evrythng'), 'merge evrythng');
});

await runAsyncTest('Extreme typo "cnvrt this pfd 2 wrd" resolves to pdf-to-word', async () => {
  const res = await parseLocalNLPCommand('cnvrt this pfd 2 wrd', []);
  assert.strictEqual(String(res), 'pdf-to-word');
  assert.strictEqual(res.actionId, 'pdf-to-word');
});

await runAsyncTest('Extreme typo "cmprs my fls" resolves to compress-pdf', async () => {
  const res = await parseLocalNLPCommand('cmprs my fls', []);
  assert.strictEqual(String(res), 'compress-pdf');
  assert.strictEqual(res.actionId, 'compress-pdf');
});

await runAsyncTest('Extreme typo "mrg evrythng" resolves to merge-pdf', async () => {
  const res = await parseLocalNLPCommand('mrg evrythng', []);
  assert.strictEqual(String(res), 'merge-pdf');
  assert.strictEqual(res.actionId, 'merge-pdf');
});

await runAsyncTest('Typo "splitt pfd" resolves to split-pdf', async () => {
  const res = await parseLocalNLPCommand('splitt pfd', []);
  assert.strictEqual(String(res), 'split-pdf');
});

await runAsyncTest('Typo "rotat pfd" resolves to rotate-pdf', async () => {
  const res = await parseLocalNLPCommand('rotat pfd', []);
  assert.strictEqual(String(res), 'rotate-pdf');
});

// ---------------------------------------------------------------------------
// SECTION 3: Real Filenames and Number / Range Preservation
// ---------------------------------------------------------------------------
console.log('\n--- Section 3: Real Filenames and Number / Range Preservation ---');

runTest('Real file name with digit "report 2.pdf" is not corrupted by normalizeUserPrompt', () => {
  assert.strictEqual(normalizeUserPrompt('report 2.pdf'), 'report 2.pdf');
});

runTest('Page range "page 2 to 4" is preserved without duplicating or corrupting "to"', () => {
  assert.strictEqual(normalizeUserPrompt('page 2 to 4'), 'page 2 to 4');
});

runTest('Multi-page range "pages 2 to 10" is preserved verbatim', () => {
  assert.strictEqual(normalizeUserPrompt('pages 2 to 10'), 'pages 2 to 10');
});

runTest('Disjoint page ordinals "page 2 and page 3" are preserved', () => {
  assert.strictEqual(normalizeUserPrompt('page 2 and page 3'), 'page 2 and page 3');
});

runTest('Ordinal single page "page 2" is preserved', () => {
  assert.strictEqual(normalizeUserPrompt('page 2'), 'page 2');
});

runTest('File split count "split into 2 parts" is preserved without turning into "split into to parts"', () => {
  assert.strictEqual(normalizeUserPrompt('split into 2 parts'), 'split into 2 parts');
});

runTest('Ordinal exclusion "all except file 2" is preserved', () => {
  assert.strictEqual(normalizeUserPrompt('all except file 2'), 'all except file 2');
});

runTest('extractCommandParameters correctly parses preserved "page 2 to 4"', () => {
  const params = extractCommandParameters('split-pdf', 'split page 2 to 4');
  assert.strictEqual(params.pageRange, '2-4');
  assert.strictEqual(params.range.replace(/\s+/g, ''), '2-4');
});

// ---------------------------------------------------------------------------
// SECTION 4: Prototype Pollution & Security Hardening
// ---------------------------------------------------------------------------
console.log('\n--- Section 4: Prototype Pollution & Security Hardening ---');

runTest('Object.prototype has no unintended properties prior to testing', () => {
  assert.strictEqual(Object.prototype.polluted, undefined);
  assert.strictEqual(Object.prototype.isAdmin, undefined);
});

runTest('decodeFlowFromUrl safely drops toolId equal to "__proto__"', () => {
  const maliciousPayload = [
    { toolId: '__proto__', x: 100, y: 100, params: { polluted: true } }
  ];
  const hash = encodeURIComponent(btoa(JSON.stringify(maliciousPayload)));
  const decoded = decodeFlowFromUrl(hash);
  assert.strictEqual(decoded, null);
  assert.strictEqual(Object.prototype.polluted, undefined);
});

runTest('decodeFlowFromUrl safely drops toolId equal to "constructor"', () => {
  const maliciousPayload = [
    { toolId: 'constructor', x: 100, y: 100 }
  ];
  const hash = encodeURIComponent(btoa(JSON.stringify(maliciousPayload)));
  const decoded = decodeFlowFromUrl(hash);
  assert.strictEqual(decoded, null);
  assert.strictEqual(Object.prototype.polluted, undefined);
});

runTest('decodeFlowFromUrl sanitizes nested __proto__ injection in parameters', () => {
  const maliciousPayload = [
    {
      toolId: 'merge-pdf',
      x: 100,
      y: 100,
      params: JSON.parse('{"__proto__": {"polluted": true}, "validKey": 123}')
    }
  ];
  const hash = encodeURIComponent(btoa(JSON.stringify(maliciousPayload)));
  const decoded = decodeFlowFromUrl(hash);
  assert.strictEqual(decoded.length, 1);
  assert.strictEqual(decoded[0].toolId, 'merge-pdf');
  assert.strictEqual(decoded[0].params.validKey, 123);
  assert.strictEqual(decoded[0].params.__proto__.polluted, undefined);
  assert.strictEqual(Object.prototype.polluted, undefined);
});

runTest('decodeFlowFromUrl sanitizes constructor.prototype injection in parameters', () => {
  const maliciousPayload = [
    {
      toolId: 'compress-pdf',
      x: 100,
      y: 100,
      params: {
        constructor: {
          prototype: { polluted: true }
        },
        quality: 0.8
      }
    }
  ];
  const hash = encodeURIComponent(btoa(JSON.stringify(maliciousPayload)));
  const decoded = decodeFlowFromUrl(hash);
  assert.strictEqual(decoded.length, 1);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(decoded[0].params, 'constructor'), false);
  assert.strictEqual(decoded[0].params.quality, 0.8);
  assert.strictEqual(Object.prototype.polluted, undefined);
});

await runAsyncTest('parseLocalNLPCommand handles prototype property lookups without crashing or pollution', async () => {
  const protoInputs = [
    '__proto__',
    'constructor',
    'toString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable'
  ];
  for (const input of protoInputs) {
    const res = await parseLocalNLPCommand(input, []);
    assert.strictEqual(Object.prototype.polluted, undefined);
    assert.strictEqual(Object.prototype.isAdmin, undefined);
  }
});

runTest('extractCommandParameters handles malicious property names gracefully', () => {
  const res = extractCommandParameters('protect-pdf', 'password constructor');
  assert.strictEqual(Object.prototype.polluted, undefined);
  assert.ok(res.password !== undefined);
});

runTest('decodeFlowFromUrl sanitizes mixed-case prototype injection attempts', () => {
  const maliciousPayload = [
    { toolId: '__Proto__', x: 100, y: 100 }
  ];
  const hash = encodeURIComponent(btoa(JSON.stringify(maliciousPayload)));
  const decoded = decodeFlowFromUrl(hash);
  assert.strictEqual(decoded, null);
  assert.strictEqual(Object.prototype.polluted, undefined);
});

runTest('Mixed ordinal command "rotate page 2 by 90 degrees" preserves page and angle params', () => {
  const norm = normalizeUserPrompt('rotate page 2 by 90 degrees');
  assert.strictEqual(norm, 'rotate page 2 by 90 degrees');
  const params = extractCommandParameters('rotate-pdf', norm);
  assert.strictEqual(params.pageRange, '2');
  assert.strictEqual(params.angle, 90);
});

runTest('Global Object prototype remains completely unpolluted after all tests', () => {
  assert.strictEqual(Object.prototype.polluted, undefined);
  assert.strictEqual(Object.prototype.isAdmin, undefined);
  assert.strictEqual({}.polluted, undefined);
});

console.log('\n===============================================================');
console.log(`PHASE 3 ADVERSARIAL STRESS SUITE COMPLETE: ${passed} / ${total} PASSED (100%)`);
console.log('===============================================================\n');
