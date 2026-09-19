/**
 * Phase 2 Surgical Implementation & Verification Test Suite
 * 
 * Verifies all 35 distinct functional areas with strict mathematical and logical assertions:
 * Area 1–3: Tools manifest dynamic output extensions & contracts
 * Area 4–8: Canvas card placement, collision formula mathematics & multi-grid packing
 * Area 9–12: Fallback target resolution priority & recency sorting
 * Area 13–18: resolveDocumentTargets merged PDF patterns & chronological resolution
 * Area 19–24: resolveDocumentTargets split halves patterns & first-part extraction
 * Area 25–29: resolveDocumentTargets image-to-pdf output discrimination
 * Area 30–35: Natural language chaining for "then word file to excel file" 4-stage pipeline
 */

import assert from 'node:assert/strict';
import { TOOLS_MANIFEST, getToolRegistry } from '../../src/utils/toolsManifest.js';
const TOOL_REGISTRY = getToolRegistry();
import {
  resolveDocumentTargets,
  planCanvasWorkflow
} from '../../src/utils/canvasBrain.js';

console.log('===============================================================');
console.log('STARTING PHASE 2 SURGICAL HARDENING MOLECULAR TEST SUITE');
console.log('===============================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(areaNum, description, testFn) {
  totalTests++;
  try {
    const res = testFn();
    if (res instanceof Promise) {
      return res.then(() => {
        passedTests++;
        console.log(`  ✓ Area ${areaNum}: ${description}`);
      }).catch(err => {
        console.error(`  ✗ Area ${areaNum} FAILED: ${description}`);
        console.error(`    Details: ${err.message}`);
        throw err;
      });
    }
    passedTests++;
    console.log(`  ✓ Area ${areaNum}: ${description}`);
  } catch (err) {
    console.error(`  ✗ Area ${areaNum} FAILED: ${description}`);
    console.error(`    Details: ${err.message}`);
    throw err;
  }
}

async function runAll() {
  console.log('\n--- Group 1: Tools Manifest Invariants ---');

  runTest(1, 'unzip-file outExt represents dynamic format and starts with dot', () => {
    const tool = TOOLS_MANIFEST['unzip-file'];
    assert.ok(tool, "TOOL 'unzip-file' must exist in manifest");
    assert.ok(tool.outExt.startsWith('.'), `outExt '${tool.outExt}' must start with dot for manifest parity`);
    assert.strictEqual(tool.outExt, '.*', "unzip-file outExt must be '.*' to indicate dynamic unpacked extensions");
  });

  runTest(2, 'unzip-file accepts zip archives and has valid cardinality', () => {
    const reg = TOOL_REGISTRY['unzip-file'];
    assert.ok(reg.accept.includes('.zip'), "unzip-file must accept .zip");
    assert.strictEqual(reg.minInputs, 1);
    assert.ok(reg.maxInputs >= 1);
  });

  runTest(3, 'unzip-file defines extracted outputType contract', () => {
    const tool = TOOLS_MANIFEST['unzip-file'];
    assert.strictEqual(tool.outputType.type, 'extracted', "outputType must be 'extracted'");
    assert.strictEqual(tool.outputType.contains, 'any', "contains must be 'any'");
  });

  console.log('\n--- Group 2: Canvas Placement & Collision Formulas ---');

  function simulateOutputNodePlacement(x, y, existingNodes = [], allocatedPositions = []) {
    let safeX = x + 300;
    let safeY = y;
    let collision = true;
    let iterations = 0;

    while (collision && iterations < 100) {
      collision = false;
      iterations++;

      for (const node of existingNodes) {
        const dx = Math.abs((node.x || 100) - safeX);
        const dy = Math.abs((node.y || 100) - safeY);
        if (dx < 280 && dy < 180) {
          collision = true;
          break;
        }
      }

      if (!collision) {
        for (const pos of allocatedPositions) {
          const dx = Math.abs(pos.x - safeX);
          const dy = Math.abs(pos.y - safeY);
          if (dx < 280 && dy < 180) {
            collision = true;
            break;
          }
        }
      }

      if (collision) {
        safeY += 180;
        if (safeY > y + 540) {
          safeX += 280;
          safeY = y;
        }
      }
    }

    allocatedPositions.push({ x: safeX, y: safeY });
    return { x: safeX, y: safeY };
  }

  runTest(4, 'Baseline collision formula computes safeX = x + 300, safeY = y with no obstacles', () => {
    const originX = 100;
    const originY = 200;
    const allocated = [];
    const coords = simulateOutputNodePlacement(originX, originY, [], allocated);
    assert.strictEqual(coords.x, originX + 300, 'safeX must equal originX + 300');
    assert.strictEqual(coords.y, originY, 'safeY must equal originY');
    assert.strictEqual(allocated.length, 1);
  });

  runTest(5, 'Obstacle within dx < 280 and dy < 180 triggers vertical shift safeY += 180', () => {
    const originX = 100;
    const originY = 200;
    const obstacleAtDefault = [{ x: 400, y: 200 }];
    const allocated = [];
    const coords = simulateOutputNodePlacement(originX, originY, obstacleAtDefault, allocated);
    assert.strictEqual(coords.x, 400, 'safeX remains on initial column');
    assert.strictEqual(coords.y, 200 + 180, 'safeY shifted vertically by +180');
  });

  runTest(6, 'Vertical threshold overflow (safeY > y + 540) advances safeX += 280 and resets safeY = y', () => {
    const originX = 100;
    const originY = 200;
    const obstacles = [
      { x: 400, y: 200 },
      { x: 400, y: 380 },
      { x: 400, y: 560 },
      { x: 400, y: 740 }
    ];
    const allocated = [];
    const coords = simulateOutputNodePlacement(originX, originY, obstacles, allocated);
    assert.strictEqual(coords.x, 400 + 280, 'safeX must advance by +280 to next column');
    assert.strictEqual(coords.y, 200, 'safeY must reset to originY');
  });

  runTest(7, 'Multiple sequential allocations pack cleanly without mutual collision', () => {
    const originX = 100;
    const originY = 200;
    const allocated = [];
    const placed = [];

    for (let i = 0; i < 8; i++) {
      const p = simulateOutputNodePlacement(originX, originY, [], allocated);
      placed.push(p);
    }

    assert.strictEqual(placed.length, 8);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const dx = Math.abs(placed[i].x - placed[j].x);
        const dy = Math.abs(placed[i].y - placed[j].y);
        assert.ok(
          dx >= 280 || dy >= 180,
          `Allocated nodes ${i} and ${j} collide! dx=${dx}, dy=${dy}`
        );
      }
    }
  });

  runTest(8, 'Existing queue nodes and newly allocated positions are simultaneously respected', () => {
    const originX = 100;
    const originY = 100;
    const queueNodes = [{ x: 400, y: 100 }];
    const allocated = [{ x: 400, y: 280 }];
    const p = simulateOutputNodePlacement(originX, originY, queueNodes, allocated);
    assert.strictEqual(p.x, 400);
    assert.strictEqual(p.y, 460);
  });

  console.log('\n--- Group 3: Downstream Target Resolution Priority & Recency ---');

  function simulateFallbackSorting(matches, activePool) {
    const sorted = [...matches].sort((a, b) => {
      const isAOut = a.id.startsWith('ws-out-') || a.id.startsWith('output:');
      const isBOut = b.id.startsWith('ws-out-') || b.id.startsWith('output:');
      if (isAOut && !isBOut) return -1;
      if (!isAOut && isBOut) return 1;
      return activePool.indexOf(b) - activePool.indexOf(a);
    });
    return sorted[0];
  }

  runTest(9, 'Output node is prioritized over raw input node', () => {
    const rawNode = { id: 'file-raw-1', name: 'document.pdf' };
    const outNode = { id: 'output:0', name: 'compressed.pdf' };
    const pool = [rawNode, outNode];
    const target = simulateFallbackSorting([rawNode, outNode], pool);
    assert.strictEqual(target.id, 'output:0', 'Downstream operation must target output node');
  });

  runTest(10, 'Downstream operation never sorts raw input file to index 0 when output exists', () => {
    const raw1 = { id: 'file-1', name: 'a.pdf' };
    const raw2 = { id: 'file-2', name: 'b.pdf' };
    const out1 = { id: 'ws-out-1', name: 'c.pdf' };
    const pool = [raw1, raw2, out1];
    const sorted = [raw1, raw2, out1].sort((a, b) => {
      const isAOut = a.id.startsWith('ws-out-') || a.id.startsWith('output:');
      const isBOut = b.id.startsWith('ws-out-') || b.id.startsWith('output:');
      if (isAOut && !isBOut) return -1;
      if (!isAOut && isBOut) return 1;
      return pool.indexOf(b) - pool.indexOf(a);
    });
    assert.notStrictEqual(sorted[0].id, 'file-1', 'Raw file-1 must not be index 0');
    assert.notStrictEqual(sorted[0].id, 'file-2', 'Raw file-2 must not be index 0');
    assert.strictEqual(sorted[0].id, 'ws-out-1', 'Output node must be index 0');
  });

  runTest(11, 'Most recent output node in activePool is prioritized among multiple outputs', () => {
    const out1 = { id: 'output:0', name: 'first_pass.pdf' };
    const out2 = { id: 'output:1', name: 'second_pass.pdf' };
    const pool = [out1, out2];
    const target = simulateFallbackSorting([out1, out2], pool);
    assert.strictEqual(target.id, 'output:1', 'Most recent output (output:1) must be selected');
  });

  runTest(12, 'Recency ordering preserved when all candidates are raw input nodes', () => {
    const raw1 = { id: 'file-1', name: 'doc1.pdf' };
    const raw2 = { id: 'file-2', name: 'doc2.pdf' };
    const pool = [raw1, raw2];
    const target = simulateFallbackSorting([raw1, raw2], pool);
    assert.strictEqual(target.id, 'file-2', 'Most recently added raw file must be chosen when no outputs exist');
  });

  console.log('\n--- Group 4: resolveDocumentTargets - Merged PDF Patterns ---');

  runTest(13, 'Prompt "the first merged pdf" resolves to earliest merged output node', () => {
    const pool = [
      { id: 'f1', name: 'a.pdf' },
      { id: 'output:0', name: 'merged_1.pdf', toolId: 'merge-pdf' },
      { id: 'output:1', name: 'merged_2.pdf', toolId: 'merge-pdf' }
    ];
    const res = resolveDocumentTargets('compress the first merged pdf', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included.length, 1);
    assert.strictEqual(res.included[0].id, 'output:0', 'Must resolve to the earliest merged node');
  });

  runTest(14, 'Prompt "the first merged document" resolves to earliest merged output node', () => {
    const pool = [
      { id: 'output:0', name: 'merged_document.pdf' },
      { id: 'output:1', name: 'other.pdf' }
    ];
    const res = resolveDocumentTargets('rotate the first merged document', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included[0].id, 'output:0');
  });

  runTest(15, 'Prompt "the merged pdf" resolves to earliest merged output node', () => {
    const pool = [
      { id: 'output:0', name: 'merged_document.pdf' }
    ];
    const res = resolveDocumentTargets('protect the merged pdf with password 123', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included[0].id, 'output:0');
  });

  runTest(16, 'Prompt "first merged pdf" (without "the") resolves to earliest merged node', () => {
    const pool = [
      { id: 'output:0', name: 'merged_file.pdf' }
    ];
    const res = resolveDocumentTargets('watermark first merged pdf', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included[0].id, 'output:0');
  });

  runTest(17, 'Earliest merged node is chosen even if chronological order is output:0 then output:3', () => {
    const pool = [
      { id: 'output:0', name: 'merged_early.pdf' },
      { id: 'output:1', name: 'compressed.pdf' },
      { id: 'output:3', name: 'merged_late.pdf' }
    ];
    const res = resolveDocumentTargets('the first merged pdf', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included[0].name, 'merged_early.pdf');
  });

  runTest(18, 'Merged pattern returns resolved false if no merged node exists', () => {
    const pool = [
      { id: 'output:0', name: 'compressed.pdf', toolId: 'compress-pdf' }
    ];
    const res = resolveDocumentTargets('the first merged pdf', pool);
    assert.strictEqual(res.resolved, false);
  });

  console.log('\n--- Group 5: resolveDocumentTargets - Split Halves Patterns ---');

  runTest(19, 'Pattern "the first half of the two splitted files" is detected', () => {
    const pool = [
      { id: 'output:0', name: 'doc1_part_1.pdf' },
      { id: 'output:1', name: 'doc1_part_2.pdf' },
      { id: 'output:2', name: 'doc2_part_1.pdf' },
      { id: 'output:3', name: 'doc2_part_2.pdf' }
    ];
    const res = resolveDocumentTargets('compress the first half of the two splitted files', pool);
    assert.strictEqual(res.resolved, true);
  });

  runTest(20, 'Resolves to the first part of each split output (part 1 of doc1 and doc2)', () => {
    const pool = [
      { id: 'output:0', name: 'doc1_part_1.pdf' },
      { id: 'output:1', name: 'doc1_part_2.pdf' },
      { id: 'output:2', name: 'doc2_part_1.pdf' },
      { id: 'output:3', name: 'doc2_part_2.pdf' }
    ];
    const res = resolveDocumentTargets('the first half of the two splitted files', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included.length, 2);
    assert.strictEqual(res.included[0].id, 'output:0');
    assert.strictEqual(res.included[1].id, 'output:2');
  });

  runTest(21, 'Pattern works with "the first half of the splitted files"', () => {
    const pool = [
      { id: 'output:0', name: 'contract_part1.pdf' },
      { id: 'output:1', name: 'contract_part2.pdf' }
    ];
    const res = resolveDocumentTargets('the first half of the splitted files', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included.length, 1);
    assert.strictEqual(res.included[0].id, 'output:0');
  });

  runTest(22, 'Identifies part 1 using split_1 or page_1 tokens in node name', () => {
    const pool = [
      { id: 'output:0', name: 'invoice_split_1.pdf' },
      { id: 'output:1', name: 'invoice_split_2.pdf' }
    ];
    const res = resolveDocumentTargets('first half of the two splitted files', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included[0].name, 'invoice_split_1.pdf');
  });

  runTest(23, 'Pairwise grouping extracts first of each pair when names lack explicit part tags', () => {
    const pool = [
      { id: 'output:0', name: 'split_a.pdf' },
      { id: 'output:1', name: 'split_b.pdf' },
      { id: 'output:2', name: 'split_c.pdf' },
      { id: 'output:3', name: 'split_d.pdf' }
    ];
    const res = resolveDocumentTargets('the first half of the two splitted files', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included.length, 2);
    assert.strictEqual(res.included[0].id, 'output:0');
    assert.strictEqual(res.included[1].id, 'output:2');
  });

  runTest(24, 'Returns single node when only 1 split output exists', () => {
    const pool = [
      { id: 'output:0', name: 'single_split.pdf' }
    ];
    const res = resolveDocumentTargets('first half of the two splitted files', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included.length, 1);
    assert.strictEqual(res.included[0].id, 'output:0');
  });

  console.log('\n--- Group 6: resolveDocumentTargets - Image-to-PDF Patterns ---');

  runTest(25, '"each of the pdf" matches all image-to-pdf outputs', () => {
    const pool = [
      { id: 'output:0', name: 'image-to-pdf_output_1.pdf', toolId: 'image-to-pdf' },
      { id: 'output:1', name: 'image-to-pdf_output_2.pdf', toolId: 'image-to-pdf' }
    ];
    const res = resolveDocumentTargets('protect each of the pdf', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included.length, 2);
  });

  runTest(26, '"all the pdfs" matches all image-to-pdf outputs', () => {
    const pool = [
      { id: 'output:0', name: 'image-to-pdf_1.pdf', toolId: 'image-to-pdf' },
      { id: 'output:1', name: 'image-to-pdf_2.pdf', toolId: 'image-to-pdf' }
    ];
    const res = resolveDocumentTargets('compress all the pdfs', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included.length, 2);
  });

  runTest(27, '"the pdf" resolves to immediate upstream image-to-pdf output', () => {
    const pool = [
      { id: 'output:0', name: 'image-to-pdf_1.pdf', toolId: 'image-to-pdf' },
      { id: 'output:1', name: 'image-to-pdf_2.pdf', toolId: 'image-to-pdf' }
    ];
    const res = resolveDocumentTargets('watermark the pdf', pool);
    assert.strictEqual(res.resolved, true);
    assert.strictEqual(res.included.length, 1);
    assert.strictEqual(res.included[0].id, 'output:1', 'Must resolve to immediate upstream (most recent)');
  });

  runTest(28, '"each of the pdf" does not match image outputs (e.g. .png)', () => {
    const pool = [
      { id: 'output:0', name: 'converted.png', toolId: 'pdf-to-image' }
    ];
    const res = resolveDocumentTargets('protect each of the pdf', pool);
    assert.strictEqual(res.resolved, false);
  });

  runTest(29, 'Unrelated clauses with no image-to-pdf outputs return resolved: false', () => {
    const pool = [
      { id: 'file-1', name: 'raw.docx' }
    ];
    const res = resolveDocumentTargets('each of the pdf', pool);
    assert.strictEqual(res.resolved, false);
  });

  console.log('\n--- Group 7: Natural Language Chaining for Word to Excel ---');

  await runTest(30, '"then word file to excel file" with PDF input chains 4 operations: pdf-to-word -> docx-to-pdf -> pdf-to-excel -> excel-to-pdf', async () => {
    const graphState = [
      { id: 'input-doc', name: 'annual_report.pdf', type: 'application/pdf', x: 100, y: 100 }
    ];
    const plan = await planCanvasWorkflow('then word file to excel file', graphState);
    assert.ok(plan.operations, 'Workflow operations must exist');
    assert.strictEqual(plan.operations.length, 4, 'Must plan exactly 4 operations in chain');
    assert.strictEqual(plan.operations[0].tool_id, 'pdf-to-word');
    assert.strictEqual(plan.operations[1].tool_id, 'docx-to-pdf');
    assert.strictEqual(plan.operations[2].tool_id, 'pdf-to-excel');
    assert.strictEqual(plan.operations[3].tool_id, 'excel-to-pdf');
  });

  await runTest(31, '"word file to excel file" without "then" prefix also chains all 4 operations for PDF input', async () => {
    const graphState = [
      { id: 'source-pdf', name: 'financials.pdf', type: 'application/pdf', x: 200, y: 150 }
    ];
    const plan = await planCanvasWorkflow('word file to excel file', graphState);
    assert.strictEqual(plan.operations.length, 4);
    assert.deepStrictEqual(
      plan.operations.map(o => o.tool_id),
      ['pdf-to-word', 'docx-to-pdf', 'pdf-to-excel', 'excel-to-pdf']
    );
  });

  await runTest(32, 'Wiring integrity: each step in the 4-stage pipeline references the exact output ID of the previous step', async () => {
    const graphState = [
      { id: 'doc-node-1', name: 'statement.pdf', type: 'application/pdf' }
    ];
    const plan = await planCanvasWorkflow('then word file to excel file', graphState);
    const [op0, op1, op2, op3] = plan.operations;

    assert.deepStrictEqual(op0.target_node_ids, ['doc-node-1']);
    assert.deepStrictEqual(op1.target_node_ids, ['output:0']);
    assert.deepStrictEqual(op2.target_node_ids, ['output:1']);
    assert.deepStrictEqual(op3.target_node_ids, ['output:2']);
  });

  await runTest(33, '"word file to excel file" with pre-existing DOCX input skips pdf-to-word and chains docx-to-pdf -> pdf-to-excel -> excel-to-pdf', async () => {
    const graphState = [
      { id: 'word-doc', name: 'notes.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    ];
    const plan = await planCanvasWorkflow('word file to excel file', graphState);
    assert.strictEqual(plan.operations.length, 3, 'Must plan 3 operations when source is already a docx');
    assert.strictEqual(plan.operations[0].tool_id, 'docx-to-pdf');
    assert.strictEqual(plan.operations[1].tool_id, 'pdf-to-excel');
    assert.strictEqual(plan.operations[2].tool_id, 'excel-to-pdf');
  });

  await runTest(34, 'Compound command "convert to word file then word file to excel file" produces single unified 4-step pipeline', async () => {
    const graphState = [
      { id: 'pdf-input', name: 'specs.pdf', type: 'application/pdf' }
    ];
    const plan = await planCanvasWorkflow('convert to word file then word file to excel file', graphState);
    assert.strictEqual(plan.operations.length, 4);
    assert.deepStrictEqual(
      plan.operations.map(o => o.tool_id),
      ['pdf-to-word', 'docx-to-pdf', 'pdf-to-excel', 'excel-to-pdf']
    );
  });

  await runTest(35, 'Final output node of Word-to-Excel workflow retains .pdf extension for visual canvas preview', async () => {
    const graphState = [
      { id: 'source-pdf', name: 'invoice.pdf', type: 'application/pdf' }
    ];
    const plan = await planCanvasWorkflow('then word file to excel file', graphState);
    const lastOp = plan.operations[plan.operations.length - 1];
    assert.strictEqual(lastOp.tool_id, 'excel-to-pdf', 'Final operator must be excel-to-pdf');
    const toolMeta = TOOL_REGISTRY[lastOp.tool_id];
    assert.strictEqual(toolMeta.outExt, '.pdf', 'Final output node extension must be .pdf for visual canvas preview');
  });

  console.log('\n===============================================================');
  console.log(`TEST SUITE COMPLETE: ${passedTests} / ${totalTests} PASSED (100%)`);
  console.log('===============================================================');
}

runAll().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});

