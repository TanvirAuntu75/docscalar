/**
 * =============================================================================
 * TEST SUITE: SCRAMBLED NODE WIRING & PROMPT DISCRIMINATION MASTER SUITE
 * =============================================================================
 * Rigorously verifies that the DocForge visual canvas and neural intent engine
 * connect the EXACT user-specified file nodes in the EXACT scrambled,
 * non-consecutive, out-of-order sequence requested in natural language prompts.
 *
 * Requirements:
 * - Zero-Assumption Rule (Zero Fake Assertions, direct imports, falsifiable checks)
 * - Quantitative test density >= 35 distinct assertions
 * - Materialized node geometry and wire topology verification
 */

import {
  resolveDocumentTargets,
  planCanvasWorkflow,
  materializeCanvasOperations,
  reactCanvasToIntent,
  CARDINAL_WORDS
} from '../src/utils/canvasBrain.js';

let passedCount = 0;
let failedCount = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedCount++;
    const errMsg = `FAIL: ${testName} | ${details}`;
    failures.push(errMsg);
    console.error(`  [FAIL] ${errMsg}`);
  }
}

// 6-Node Canvas Setup (Files laid out left-to-right on canvas)
const graph6 = [
  { id: 'f1', name: 'alpha_contract.pdf', x: 100, y: 100 },
  { id: 'f2', name: 'beta_invoice.pdf', x: 100, y: 220 },
  { id: 'f3', name: 'gamma_report.pdf', x: 100, y: 340 },
  { id: 'f4', name: 'delta_summary.pdf', x: 100, y: 460 },
  { id: 'f5', name: 'epsilon_appendix.pdf', x: 100, y: 580 },
  { id: 'f6', name: 'zeta_annex.pdf', x: 100, y: 700 }
];

// 10-Node Canvas Setup for high-density testing
const graph10 = Array.from({ length: 10 }, (_, i) => ({
  id: `doc_${i + 1}`,
  name: `record_${String.fromCharCode(65 + i)}.pdf`,
  x: 100,
  y: 100 + i * 110
}));

async function runTestSuite() {
  console.log('=============================================================================');
  console.log('🧪 RUNNING SCRAMBLED NODE WIRING & PROMPT DISCRIMINATION MASTER SUITE');
  console.log('=============================================================================\n');

  // ---------------------------------------------------------------------------
  // CATEGORY 1: Ordinal Scrambling & Left-to-Right Exact Order Preservation
  // ---------------------------------------------------------------------------
  console.log('--- Category 1: Ordinal Scrambling Order Preservation ---');
  {
    const r1 = resolveDocumentTargets('merge the 5th and 2nd and 4th files', graph6);
    assert(r1.resolved === true, 'T01: Ordinal scrambled query marks resolved: true');
    assert(r1.included.length === 3, 'T02: Exactly 3 files included for 5th, 2nd, 4th', `Got ${r1.included.length}`);
    assert(r1.included[0]?.id === 'f5', 'T03: First wired target is 5th file (f5)', `Got ${r1.included[0]?.id}`);
    assert(r1.included[1]?.id === 'f2', 'T04: Second wired target is 2nd file (f2)', `Got ${r1.included[1]?.id}`);
    assert(r1.included[2]?.id === 'f4', 'T05: Third wired target is 4th file (f4)', `Got ${r1.included[2]?.id}`);
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 2: Digit Scrambling & Non-Consecutive Ordering
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 2: Digit Scrambling Non-Consecutive Ordering ---');
  {
    const r2 = resolveDocumentTargets('merge 4, 1, and 5', graph6);
    assert(r2.resolved === true, 'T06: Digit scrambled query marks resolved: true');
    assert(r2.included.length === 3, 'T07: Exactly 3 files included for digits 4, 1, 5');
    assert(r2.included[0]?.id === 'f4', 'T08: First target is file 4 (f4)', `Got ${r2.included[0]?.id}`);
    assert(r2.included[1]?.id === 'f1', 'T09: Second target is file 1 (f1)', `Got ${r2.included[1]?.id}`);
    assert(r2.included[2]?.id === 'f5', 'T10: Third target is file 5 (f5)', `Got ${r2.included[2]?.id}`);
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 3: Mixed Format Scrambling (Digits + Ordinals + Words)
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 3: Mixed Format Scrambling ---');
  {
    const r3 = resolveDocumentTargets('combine file 3 with the 1st and file 5', graph6);
    assert(r3.resolved === true, 'T11: Mixed digit-ordinal query resolved');
    assert(r3.included.length === 3, 'T12: Exactly 3 files captured for 3, 1st, 5');
    assert(r3.included[0]?.id === 'f3', 'T13: Mixed target [0] is f3', `Got ${r3.included[0]?.id}`);
    assert(r3.included[1]?.id === 'f1', 'T14: Mixed target [1] is f1', `Got ${r3.included[1]?.id}`);
    assert(r3.included[2]?.id === 'f5', 'T15: Mixed target [2] is f5', `Got ${r3.included[2]?.id}`);
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 4: Cardinal Word Scrambling (Four, One, Five)
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 4: Cardinal Word Scrambling ---');
  {
    const r4 = resolveDocumentTargets('combine file four and file one and file six', graph6);
    assert(r4.resolved === true, 'T16: Cardinal words query resolved');
    assert(r4.included.length === 3, 'T17: 3 files captured for four, one, six');
    assert(r4.included[0]?.id === 'f4', 'T18: Cardinal target [0] is f4');
    assert(r4.included[1]?.id === 'f1', 'T19: Cardinal target [1] is f1');
    assert(r4.included[2]?.id === 'f6', 'T20: Cardinal target [2] is f6');
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 5: Complete Reverse Order Sequence (6, 5, 4, 3, 2, 1)
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 5: Complete Reverse Order Sequence ---');
  {
    const r5 = resolveDocumentTargets('merge 6, 5, 4, 3, 2, 1', graph6);
    assert(r5.resolved === true, 'T21: Full reverse sequence resolved');
    assert(r5.included.length === 6, 'T22: All 6 files included in reverse');
    const expectedIds = ['f6', 'f5', 'f4', 'f3', 'f2', 'f1'];
    const actualIds = r5.included.map(n => n.id);
    assert(
      JSON.stringify(actualIds) === JSON.stringify(expectedIds),
      'T23: Exact reverse ordering matched',
      `Expected ${expectedIds.join(',')} got ${actualIds.join(',')}`
    );
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 6: Multi-Verb Split Targets (Compress 3rd and Rotate 1st)
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 6: Multi-Verb Split Operations ---');
  {
    const plan = await planCanvasWorkflow('compress the 3rd and rotate the 1st by 90 degrees', graph6);
    assert(plan.operations.length === 2, 'T24: Split into exactly 2 distinct operations', `Got ${plan.operations.length}`);
    assert(plan.operations[0].tool_id === 'compress-pdf', 'T25: Op 0 tool is compress-pdf');
    assert(JSON.stringify(plan.operations[0].target_node_ids) === JSON.stringify(['f3']), 'T26: Compress targets f3 specifically');
    assert(plan.operations[1].tool_id === 'rotate-pdf', 'T27: Op 1 tool is rotate-pdf');
    assert(JSON.stringify(plan.operations[1].target_node_ids) === JSON.stringify(['f1']), 'T28: Rotate targets f1 specifically');
    assert(plan.operations[1].parameters.angle === 90, 'T29: Rotate angle extracted as 90');
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 7: Complex Multi-Step Scrambled Chaining with Pronouns
  // Prompt: "merge 4 and 2, then rotate it 180, and merge 3 and 1"
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 7: Complex Multi-Step Scrambled Chaining with Pronouns ---');
  {
    const plan = await planCanvasWorkflow('merge 4 and 2, then rotate it 180, and merge 3 and 1', graph6);
    assert(plan.operations.length === 3, 'T30: Plan contains exactly 3 pipeline steps', `Got ${plan.operations.length}`);
    
    // Step 1
    assert(plan.operations[0].tool_id === 'merge-pdf', 'T31: Step 0 is merge-pdf');
    assert(JSON.stringify(plan.operations[0].target_node_ids) === JSON.stringify(['f4', 'f2']), 'T32: Step 0 merges f4 and f2 in order');

    // Step 2
    assert(plan.operations[1].tool_id === 'rotate-pdf', 'T33: Step 1 is rotate-pdf');
    assert(JSON.stringify(plan.operations[1].target_node_ids) === JSON.stringify(['output:0']), 'T34: Step 1 targets previous output (output:0) via pronoun');
    assert(plan.operations[1].parameters.angle === 180, 'T35: Step 1 rotates by 180 degrees');

    // Step 3
    assert(plan.operations[2].tool_id === 'merge-pdf', 'T36: Step 2 is merge-pdf');
    assert(JSON.stringify(plan.operations[2].target_node_ids) === JSON.stringify(['f3', 'f1']), 'T37: Step 2 targets remaining canvas files f3 and f1 without shift index error');
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 8: Canvas Materialization Wire Topology & Coordinates
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 8: Canvas Materialization Wire Topology & Non-Collision ---');
  {
    const plan = await planCanvasWorkflow('merge 4 and 2, then rotate it 180, and merge 3 and 1', graph6);
    const { spawnedOps, stepOpMap } = materializeCanvasOperations(plan.operations, graph6, []);

    assert(spawnedOps.length === 3, 'T38: Exactly 3 operator nodes materialized');
    const [op1, op2, op3] = spawnedOps;

    // Verify Op 1 wiring
    assert(JSON.stringify(op1.inputIds) === JSON.stringify(['f4', 'f2']), 'T39: Op 1 input wires connect directly to f4 and f2');
    
    // Verify Op 2 downstream wiring to Op 1
    assert(JSON.stringify(op2.inputIds) === JSON.stringify([op1.id]), 'T40: Op 2 input wire connects to Op 1 ID');
    assert(op2.x > op1.x, 'T41: Op 2 is placed downstream along X axis (op2.x > op1.x)', `op1.x=${op1.x}, op2.x=${op2.x}`);

    // Verify Op 3 wiring to original files f3 and f1
    assert(JSON.stringify(op3.inputIds) === JSON.stringify(['f3', 'f1']), 'T42: Op 3 input wires connect to f3 and f1');

    // Spatial non-collision check: No two operators share identical (x, y)
    const coordsSet = new Set(spawnedOps.map(op => `${op.x},${op.y}`));
    assert(coordsSet.size === 3, 'T43: All materialized operator nodes have unique coordinates');

    // Delta Y invariant check if nodes share similar X column
    const deltaY = Math.abs(op1.y - op3.y);
    assert(deltaY >= 150 || Math.abs(op1.x - op3.x) >= 200, 'T44: Non-collision buffer >= 150px strictly maintained', `deltaY=${deltaY}`);
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 9: Exclusions with Scrambled Sequences
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 9: Exclusions with Scrambled Sequences ---');
  {
    const r9 = resolveDocumentTargets('merge 5th, 2nd, and 4th except the 2nd', graph6);
    assert(r9.resolved === true, 'T45: Exclusion query resolved');
    assert(r9.excluded.length === 1 && r9.excluded[0].id === 'f2', 'T46: 2nd file (f2) correctly isolated in excluded list');
    const incIds = r9.included.filter(n => !r9.excluded.some(e => e.id === n.id)).map(n => n.id);
    assert(JSON.stringify(incIds) === JSON.stringify(['f5', 'f4']), 'T47: Remaining targets are [f5, f4] in exact order');
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 10: Single-Input Tool Targeting with Scrambled Parameter Extraction
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 10: Single-Input Tools with Specific Indices ---');
  {
    const plan = await planCanvasWorkflow('lock the 3rd file with password "vault2026"', graph6);
    assert(plan.operations.length === 1, 'T48: Single operation generated');
    assert(plan.operations[0].tool_id === 'protect-pdf', 'T49: Tool is protect-pdf');
    assert(JSON.stringify(plan.operations[0].target_node_ids) === JSON.stringify(['f3']), 'T50: Target is precisely f3');
    assert(plan.operations[0].parameters.password === 'vault2026', 'T51: Extracted password parameter is vault2026');
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 11: High-Density 10-Node Canvas Scrambled Preservation
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 11: High-Density 10-Node Canvas Scrambled Preservation ---');
  {
    const prompt = 'merge file 9, 2, 7, 3, 10, 1';
    const r11 = resolveDocumentTargets(prompt, graph10);
    assert(r11.resolved === true, 'T52: 10-node high density query resolved');
    const expected10 = ['doc_9', 'doc_2', 'doc_7', 'doc_3', 'doc_10', 'doc_1'];
    const actual10 = r11.included.map(n => n.id);
    assert(
      JSON.stringify(actual10) === JSON.stringify(expected10),
      'T53: High-density 10-node canvas preserves scrambled sequence exactly',
      `Expected ${expected10.join(',')} got ${actual10.join(',')}`
    );
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 12: Deduplication of Redundant Indices
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 12: Deduplication of Redundant Indices ---');
  {
    const r12 = resolveDocumentTargets('merge 4 and 4 and 2', graph6);
    assert(r12.resolved === true, 'T54: Duplicate index query resolved');
    const ids = r12.included.map(n => n.id);
    assert(JSON.stringify(ids) === JSON.stringify(['f4', 'f2']), 'T55: Duplicate 4 is deduplicated to [f4, f2]');
  }

  // ---------------------------------------------------------------------------
  // CATEGORY 13: End-to-End Visual Canvas Reactivity
  // ---------------------------------------------------------------------------
  console.log('\n--- Category 13: End-to-End ReactCanvasToIntent Pipeline ---');
  {
    const reaction = await reactCanvasToIntent(
      'merge the 5th and 2nd and 4th files',
      graph6,
      []
    );
    assert(reaction.status === 'success', 'T56: ReactCanvasToIntent returned success');
    assert(reaction.spawnedOps.length === 1, 'T57: Exactly 1 operator node spawned');
    assert(reaction.spawnedOps[0].toolId === 'merge-pdf', 'T58: Spawned operator is merge-pdf');
    assert(
      JSON.stringify(reaction.spawnedOps[0].inputIds) === JSON.stringify(['f5', 'f2', 'f4']),
      'T59: Spawned operator inputIds match scrambled files [f5, f2, f4] exactly'
    );
    assert(reaction.spawnedOps[0].x >= 360, 'T60: Operator placed right of input files');
    assert(reaction.nextOperations.length === 1, 'T61: NextOperations updated with new operator');
  }

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n=============================================================================');
  console.log(`📊 MASTER TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=============================================================================');

  if (failedCount > 0) {
    console.error('\nFailures detected:');
    failures.forEach(f => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log('\n🎉 100% ACCURACY CERTIFIED: All scrambled node wiring tests PASSED!');
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
