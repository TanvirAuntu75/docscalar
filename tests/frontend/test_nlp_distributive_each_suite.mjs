/**
 * =============================================================================
 * TEST SUITE: NLP DISTRIBUTIVE "EACH" INTENT PARSER & PIPELINE TOPOLOGY SUITE
 * =============================================================================
 * Verifies that the DocForge NLP Brain and Canvas Agent strictly distinguish:
 * 1. Distributive fan-out intents: "each image to pdf", "convert each image to pdf",
 *    "each of the images to pdf", "separately convert images to pdf", "individually to pdf"
 *    -> Creates 1-to-1 operations for each input with distinct output IDs.
 * 2. Collective intents: "images to pdf", "combine images to pdf", "merge images to pdf"
 *    -> Bundles all matching inputs into 1 single multi-input operation.
 * 3. 43-image real-world payload test matching the user's exact production bug report.
 * 4. Backend Python & Frontend JavaScript regex & execution graph parity.
 *
 * Invariant Standards:
 * - Anti-Inflation: >= 30 distinct falsifiable test areas, zero fake assertions.
 * - Source Invocation: Direct imports from src/utils/canvasBrain.js and execution of backend/services/canvas_agent.py.
 */

import { execSync, execFileSync } from 'child_process';
import {
  resolveDocumentTargets,
  planCanvasWorkflow,
  materializeCanvasOperations,
  parseLocalNLPCommand
} from '../../src/utils/canvasBrain.js';

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

console.log('=============================================================================');
console.log('🧪 RUNNING NLP DISTRIBUTIVE "EACH" INTENT PARSER SUITE');
console.log('=============================================================================\n');

// ---------------------------------------------------------------------------
// Setup Mock Nodes
// ---------------------------------------------------------------------------
const makeImgNode = (id, name) => ({
  id,
  name,
  type: 'file',
  status: 'idle',
  x: 100,
  y: 100,
  ancestry: [id]
});

const imgPool3 = [
  makeImgNode('img-1', 'photo_01.png'),
  makeImgNode('img-2', 'photo_02.png'),
  makeImgNode('img-3', 'photo_03.png')
];

const jpgPool3 = [
  makeImgNode('jpg-1', 'scan_01.jpg'),
  makeImgNode('jpg-2', 'scan_02.jpg'),
  makeImgNode('jpg-3', 'scan_03.jpg')
];

// ===========================================================================
// CATEGORY 1: resolveDocumentTargets Token Matching
// ===========================================================================
console.log('--- Category 1: resolveDocumentTargets Token Matching ---');

const dit1 = resolveDocumentTargets('each image to pdf', imgPool3);
assert(dit1.resolved === true, 'T01: "each image to pdf" marks resolved = true');
assert(dit1.included.length === 3, 'T02: "each image to pdf" matches all 3 images');
assert(dit1.included[0].id === 'img-1' && dit1.included[2].id === 'img-3', 'T03: Preserves image order');

const dit2 = resolveDocumentTargets('each of the images to pdf', imgPool3);
assert(dit2.resolved === true, 'T04: "each of the images to pdf" marks resolved = true');
assert(dit2.included.length === 3, 'T05: "each of the images to pdf" matches all 3 images');

const dit3 = resolveDocumentTargets('each png to pdf', imgPool3);
assert(dit3.resolved === true, 'T06: "each png to pdf" matches PNG files');
assert(dit3.included.length === 3, 'T07: "each png to pdf" includes all 3 PNGs');

const dit4 = resolveDocumentTargets('each jpg to pdf', jpgPool3);
assert(dit4.resolved === true, 'T08: "each jpg to pdf" matches JPG files');
assert(dit4.included.length === 3, 'T09: "each jpg to pdf" includes all 3 JPGs');

const dit5 = resolveDocumentTargets('each file to pdf', imgPool3);
assert(dit5.resolved === true, 'T10: "each file to pdf" matches files in activePool');
assert(dit5.included.length === 3, 'T11: "each file to pdf" includes all 3 files');

const dit6 = resolveDocumentTargets('all the images to pdf', imgPool3);
assert(dit6.resolved === true, 'T12: "all the images to pdf" marks resolved = true');
assert(dit6.included.length === 3, 'T13: "all the images to pdf" includes all 3 images');

const dit7 = resolveDocumentTargets('each photo to pdf', imgPool3);
assert(dit7.resolved === true, 'T14: "each photo to pdf" matches photos');

const dit8 = resolveDocumentTargets('each picture to pdf', imgPool3);
assert(dit8.resolved === true, 'T15: "each picture to pdf" matches pictures');

// ===========================================================================
// CATEGORY 2: parseLocalNLPCommand Distributive Intent Classification
// ===========================================================================
console.log('\n--- Category 2: parseLocalNLPCommand Intent Classification ---');

async function testIntent(phrase, expectedId, testLabel) {
  const res = await parseLocalNLPCommand(phrase, imgPool3);
  const actionId = (typeof res === 'object' && res?.actionId) ? res.actionId : String(res);
  assert(actionId === expectedId, testLabel, `Expected ${expectedId}, got ${actionId}`);
}

await testIntent('each image to pdf', 'image-to-pdf', 'T16: "each image to pdf" -> image-to-pdf');
await testIntent('convert each image to pdf', 'image-to-pdf', 'T17: "convert each image to pdf" -> image-to-pdf');
await testIntent('each of the images to pdf', 'image-to-pdf', 'T18: "each of the images to pdf" -> image-to-pdf');
await testIntent('each png to pdf', 'image-to-pdf', 'T19: "each png to pdf" -> image-to-pdf');
await testIntent('each jpg to pdf', 'image-to-pdf', 'T20: "each jpg to pdf" -> image-to-pdf');
await testIntent('convert each image to separate pdf', 'image-to-pdf', 'T21: "convert each image to separate pdf" -> image-to-pdf');
await testIntent('separately convert images to pdf', 'image-to-pdf', 'T22: "separately convert images to pdf" -> image-to-pdf');
await testIntent('images to separate pdf', 'image-to-pdf', 'T23: "images to separate pdf" -> image-to-pdf');

// ===========================================================================
// CATEGORY 3: Collective Pattern Preservation (MUST NOT Fan Out)
// ===========================================================================
console.log('\n--- Category 3: Collective Pattern Preservation (No Fan-Out) ---');

const planColl1 = await planCanvasWorkflow('images to pdf', imgPool3);
assert(planColl1.operations.length === 1, 'T24: "images to pdf" produces exactly 1 op (merged)');
assert(planColl1.operations[0].tool_id === 'image-to-pdf', 'T25: Op tool_id is image-to-pdf');
assert(planColl1.operations[0].target_node_ids.length === 3, 'T26: Single op accepts all 3 target nodes');
assert(planColl1.operations[0].output_id === 'output:0', 'T27: Collective output_id is output:0');

const planColl2 = await planCanvasWorkflow('combine images to pdf', imgPool3);
assert(planColl2.operations.length === 1, 'T28: "combine images to pdf" produces exactly 1 op');

const planColl3 = await planCanvasWorkflow('merge images to pdf', imgPool3);
assert(planColl3.operations.length === 1, 'T29: "merge images to pdf" produces exactly 1 op');

// ===========================================================================
// CATEGORY 4: Distributive Fan-Out Pipeline Structure (1-to-1 Ops)
// ===========================================================================
console.log('\n--- Category 4: Distributive Fan-Out (1:1 Ops & Distinct Output IDs) ---');

const planDist1 = await planCanvasWorkflow('each image to pdf', imgPool3);
assert(planDist1.operations.length === 3, 'T30: "each image to pdf" produces exactly 3 ops (1:1)');
assert(planDist1.operations[0].tool_id === 'image-to-pdf', 'T31: Op 0 tool_id is image-to-pdf');
assert(planDist1.operations[1].tool_id === 'image-to-pdf', 'T32: Op 1 tool_id is image-to-pdf');
assert(planDist1.operations[2].tool_id === 'image-to-pdf', 'T33: Op 2 tool_id is image-to-pdf');
assert(planDist1.operations[0].target_node_ids.length === 1, 'T34: Op 0 has exactly 1 target input');
assert(planDist1.operations[1].target_node_ids.length === 1, 'T35: Op 1 has exactly 1 target input');
assert(planDist1.operations[2].target_node_ids.length === 1, 'T36: Op 2 has exactly 1 target input');
assert(planDist1.operations[0].target_node_ids[0] === 'img-1', 'T37: Op 0 targets img-1');
assert(planDist1.operations[1].target_node_ids[0] === 'img-2', 'T38: Op 1 targets img-2');
assert(planDist1.operations[2].target_node_ids[0] === 'img-3', 'T39: Op 2 targets img-3');

// Output IDs verification
assert(planDist1.operations[0].output_id === 'output:0-0', 'T40: Op 0 output_id is output:0-0');
assert(planDist1.operations[1].output_id === 'output:0-1', 'T41: Op 1 output_id is output:0-1');
assert(planDist1.operations[2].output_id === 'output:0-2', 'T42: Op 2 output_id is output:0-2');

// Alternative distributive phrasing
const planDist2 = await planCanvasWorkflow('convert each image to separate pdf', imgPool3);
assert(planDist2.operations.length === 3, 'T43: "convert each image to separate pdf" produces 3 ops');

const planDist3 = await planCanvasWorkflow('separately convert images to pdf', imgPool3);
assert(planDist3.operations.length === 3, 'T44: "separately convert images to pdf" produces 3 ops');

// ===========================================================================
// CATEGORY 5: 43-Image Payload Simulation (User Production Invariant)
// ===========================================================================
console.log('\n--- Category 5: 43-Image Payload Simulation ---');

const pool43 = [];
for (let i = 1; i <= 43; i++) {
  pool43.push(makeImgNode(`node-img-${i}`, `document_page_${String(i).padStart(3, '0')}.png`));
}

const plan43 = await planCanvasWorkflow('each image to pdf', pool43);
assert(plan43.operations.length === 43, 'T45: 43 images generate exactly 43 individual operators');
assert(plan43.operations[0].target_node_ids[0] === 'node-img-1', 'T46: First op targets image 1');
assert(plan43.operations[42].target_node_ids[0] === 'node-img-43', 'T47: 43rd op targets image 43');
assert(plan43.operations[0].output_id === 'output:0-0', 'T48: First op has output_id output:0-0');
assert(plan43.operations[42].output_id === 'output:0-42', 'T49: 43rd op has output_id output:0-42');

// ===========================================================================
// CATEGORY 6: Materialization & Wire Topology (stepOpMap & Coords)
// ===========================================================================
console.log('\n--- Category 6: Materialization & Wire Topology ---');

const { spawnedOps, stepOpMap } = materializeCanvasOperations(planDist1.operations, imgPool3, []);
assert(spawnedOps.length === 3, 'T50: Materializes 3 operator cards');
assert(spawnedOps[0].inputIds[0] === 'img-1', 'T51: Op card 0 input wired to img-1');
assert(spawnedOps[1].inputIds[0] === 'img-2', 'T52: Op card 1 input wired to img-2');
assert(spawnedOps[2].inputIds[0] === 'img-3', 'T53: Op card 2 input wired to img-3');
assert(Boolean(stepOpMap['output:0-0']), 'T54: stepOpMap indexes output:0-0');
assert(Boolean(stepOpMap['0-0']), 'T55: stepOpMap indexes 0-0');
assert(Boolean(stepOpMap['output:0-1']), 'T56: stepOpMap indexes output:0-1');
assert(Boolean(stepOpMap['output:0-2']), 'T57: stepOpMap indexes output:0-2');

// Non-collision verification
const uniqueCoords = new Set(spawnedOps.map(op => `${op.x},${op.y}`));
assert(uniqueCoords.size === 3, 'T58: All 3 spawned operators have unique non-colliding positions');

// ===========================================================================
// CATEGORY 7: Multi-Step Chaining (PDF -> Image -> Each Image to PDF)
// ===========================================================================
console.log('\n--- Category 7: Multi-Step Chaining ---');

const pdfDoc = {
  id: 'doc-source',
  name: 'contract.pdf',
  type: 'file',
  status: 'idle',
  x: 50,
  y: 50,
  ancestry: ['doc-source']
};

const planChain = await planCanvasWorkflow('pdf to image and then each image to pdf', [pdfDoc]);
assert(planChain.operations.length >= 2, 'T59: Chained query decomposes into sequential steps');
assert(planChain.operations[0].tool_id === 'pdf-to-image', 'T60: First step is pdf-to-image');
assert(planChain.operations[1].tool_id === 'image-to-pdf', 'T61: Second step is image-to-pdf');

// Downstream fan-out referencing previous outputs
const fanOutOutputsPool = [
  { id: 'output:0-0', name: 'image-to-pdf_output.pdf', type: 'op', status: 'completed' },
  { id: 'output:0-1', name: 'image-to-pdf_output.pdf', type: 'op', status: 'completed' }
];
const planMergePdfs = await planCanvasWorkflow('merge the pdfs', fanOutOutputsPool);
assert(planMergePdfs.operations.length === 1, 'T62: Downstream "merge the pdfs" collects individual fan-out PDFs');
assert(planMergePdfs.operations[0].tool_id === 'merge-pdf', 'T63: Downstream tool is merge-pdf');
assert(planMergePdfs.operations[0].target_node_ids.includes('output:0-0'), 'T64: Target node includes output:0-0');
assert(planMergePdfs.operations[0].target_node_ids.includes('output:0-1'), 'T65: Target node includes output:0-1');

// Single image boundary condition
const singleImgPool = [makeImgNode('img-solo', 'single.png')];
const planSolo = await planCanvasWorkflow('each image to pdf', singleImgPool);
assert(planSolo.operations.length === 1, 'T66: Single image produces exactly 1 op');
assert(planSolo.operations[0].target_node_ids[0] === 'img-solo', 'T67: Single op correctly targets single image');

// Empty pool boundary condition
const planEmpty = await planCanvasWorkflow('each image to pdf', []);
assert(planEmpty.operations.length === 0, 'T68: Empty active pool returns 0 operations safely');

// ===========================================================================
// CATEGORY 8: Backend Python Parity (canvas_agent.py & synthesize_workflow_graph)
// ===========================================================================
console.log('\n--- Category 8: Backend Python Parity ---');

const pyScript = `
import json
from backend.services.canvas_agent import generate_heuristic_plan, synthesize_workflow_graph

files = ["img1.png", "img2.png", "img3.png"]

# 1. Distributive query
p1 = generate_heuristic_plan("each image to pdf", files)
# 2. Collective query
p2 = generate_heuristic_plan("images to pdf", files)
# 3. synthesize_workflow_graph alias check
p3 = synthesize_workflow_graph("convert each image to pdf", files)
# 4. Multi-word distributive
p4 = generate_heuristic_plan("separately convert images to pdf", files)

results = {
    "distributive_count": len(p1),
    "distributive_actions": [s["actionId"] for s in p1],
    "distributive_inputs": [s["inputs"] for s in p1],
    "collective_count": len(p2),
    "collective_inputs": p2[0]["inputs"] if p2 else [],
    "alias_count": len(p3),
    "separately_count": len(p4)
}
print(json.dumps(results))
`;

try {
  const pyOutput = execFileSync('python', ['-c', pyScript], { encoding: 'utf-8' });
  const pyData = JSON.parse(pyOutput.trim());

  assert(pyData.distributive_count === 3, 'T69: Python backend "each image to pdf" generates 3 steps');
  assert(pyData.distributive_actions.every(a => a === 'image-to-pdf'), 'T70: Python backend steps all image-to-pdf');
  assert(pyData.distributive_inputs.every(inp => inp.length === 1), 'T71: Python backend steps each have 1 input');
  assert(pyData.distributive_inputs[0][0] === 'img1.png', 'T72: Python step 0 inputs img1.png');
  assert(pyData.distributive_inputs[1][0] === 'img2.png', 'T73: Python step 1 inputs img2.png');
  assert(pyData.distributive_inputs[2][0] === 'img3.png', 'T74: Python step 2 inputs img3.png');
  assert(pyData.collective_count === 1, 'T75: Python backend "images to pdf" produces 1 step');
  assert(pyData.collective_inputs.length === 3, 'T76: Python collective step bundles all 3 inputs');
  assert(pyData.alias_count === 3, 'T77: Python synthesize_workflow_graph produces identical fan-out');
  assert(pyData.separately_count === 3, 'T78: Python "separately convert images to pdf" produces 3 steps');
} catch (err) {
  assert(false, 'T69-T78: Backend Python verification failed', err.message);
}

// ===========================================================================
// SUMMARY REPORT
// ===========================================================================
console.log('\n=============================================================================');
console.log(`📊 MASTER TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('=============================================================================');

if (failedCount > 0) {
  console.error('\nFailures summary:');
  failures.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
} else {
  console.log('\n🎉 100% ACCURACY CERTIFIED: All distributive "each" tests PASSED!\n');
  process.exit(0);
}
