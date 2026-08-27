import fs from 'fs';
import path from 'path';
import { performHybridSearch } from '../../src/utils/hybridSearch.js';
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = true;
env.localModelPath = './public/models/';

const TEST_CASES = [
  // ── 1. Organize PDF (10 queries) ──────────────────────────────────────────
  { id: 1, query: "how do I merge multiple PDF files together?", expectType: 'Tool', expectId: 'merge-pdf' },
  { id: 2, query: "split a 50 page pdf into separate chapters", expectType: 'Tool', expectId: 'split-pdf' },
  { id: 3, query: "delete unwanted blank pages from my document", expectType: 'Tool', expectId: 'remove-pages' },
  { id: 4, query: "save select pages 3 to 7 into a new file", expectType: 'Tool', expectId: 'extract-pages' },
  { id: 5, query: "reorder and rotate pages visually in a grid", expectType: 'Tool', expectId: 'organize-pdf' },
  { id: 6, query: "capture documents with my web camera", expectType: 'Tool', expectId: 'scan-to-pdf' },
  { id: 7, query: "combine invoices into one single pdf", expectType: 'Tool', expectId: 'merge-pdf' },
  { id: 8, query: "cut pdf in half", expectType: 'Tool', expectId: 'split-pdf' },
  { id: 9, query: "exclude first 2 pages", expectType: 'Tool', expectId: 'remove-pages' },
  { id: 10, query: "drag and drop thumbnail page reordering", expectType: 'Tool', expectId: 'organize-pdf' },

  // ── 2. Optimize PDF (10 queries) ──────────────────────────────────────────
  { id: 11, query: "compress pdf to reduce file size", expectType: 'Tool', expectId: 'compress-pdf' },
  { id: 12, query: "difference between lossless and lossy compression mode", expectSource: 'Compression Guide' },
  { id: 13, query: "fix corrupted pdf with broken xref table", expectType: 'Tool', expectId: 'repair-pdf' },
  { id: 14, query: "make scanned document text searchable with ocr", expectType: 'Tool', expectId: 'ocr-pdf' },
  { id: 15, query: "flatten pdf and remove copyable text layer with un-ocr", expectType: 'Tool', expectId: 'un-ocr-pdf' },
  { id: 16, query: "add sequential bates numbers for legal court exhibits", expectType: 'Tool', expectId: 'bates-numbering' },
  { id: 17, query: "shrink 100mb pdf down to 20mb", expectType: 'Tool', expectId: 'compress-pdf' },
  { id: 18, query: "recover damaged pdf header", expectType: 'Tool', expectId: 'repair-pdf' },
  { id: 19, query: "recognize text from scanned image", expectType: 'Tool', expectId: 'ocr-pdf' },
  { id: 20, query: "rasterize pdf pages to image to prevent copying", expectType: 'Tool', expectId: 'un-ocr-pdf' },

  // ── 3. Convert to PDF (10 queries) ────────────────────────────────────────
  { id: 21, query: "convert jpg and png photos to a pdf book", expectType: 'Tool', expectId: 'image-to-pdf' },
  { id: 22, query: "convert word docx file to print pdf", expectType: 'Tool', expectId: 'docx-to-pdf' },
  { id: 23, query: "convert powerpoint pptx presentation to pdf slides", expectType: 'Tool', expectId: 'powerpoint-to-pdf' },
  { id: 24, query: "convert excel spreadsheet xlsx to pdf with gridlines", expectType: 'Tool', expectId: 'excel-to-pdf' },
  { id: 25, query: "convert html code snippet to formatted a4 pdf", expectType: 'Tool', expectId: 'html-to-pdf' },
  { id: 26, query: "convert markdown text notes into clean pdf", expectType: 'Tool', expectId: 'text-to-pdf' },
  { id: 27, query: "save website link or url to pdf document", expectType: 'Tool', expectId: 'url-to-pdf' },
  { id: 28, query: "batch turn images into pdf", expectType: 'Tool', expectId: 'image-to-pdf' },
  { id: 29, query: "doc to pdf converter", expectType: 'Tool', expectId: 'docx-to-pdf' },
  { id: 30, query: "csv sheet to pdf", expectType: 'Tool', expectId: 'excel-to-pdf' },

  // ── 4. Convert from PDF (10 queries) ──────────────────────────────────────
  { id: 31, query: "extract pdf pages as high quality png images", expectType: 'Tool', expectId: 'pdf-to-image' },
  { id: 32, query: "convert pdf document into editable microsoft word docx", expectType: 'Tool', expectId: 'pdf-to-word' },
  { id: 33, query: "convert pdf presentation into powerpoint pptx slides", expectType: 'Tool', expectId: 'pdf-to-powerpoint' },
  { id: 34, query: "extract tables from pdf into excel xlsx workbook", expectType: 'Tool', expectId: 'pdf-to-excel' },
  { id: 35, query: "convert pdf to pdf/a ISO archival format for 30 year storage", expectType: 'Tool', expectId: 'pdf-to-pdfa' },
  { id: 36, query: "export pdf as jpeg photos", expectType: 'Tool', expectId: 'pdf-to-image' },
  { id: 37, query: "pdf to docx converter", expectType: 'Tool', expectId: 'pdf-to-word' },
  { id: 38, query: "pdf to ppt slides", expectType: 'Tool', expectId: 'pdf-to-powerpoint' },
  { id: 39, query: "extract financial table numbers to spreadsheet", expectType: 'Tool', expectId: 'pdf-to-excel' },
  { id: 40, query: "pdf/a-1b long term preservation standard", expectType: 'Tool', expectId: 'pdf-to-pdfa' },

  // ── 5. Edit & Form Tools (10 queries) ─────────────────────────────────────
  { id: 41, query: "rotate upside down pages by 90 or 180 degrees", expectType: 'Tool', expectId: 'rotate-pdf' },
  { id: 42, query: "insert page numbers in footer margin", expectType: 'Tool', expectId: 'add-page-numbers' },
  { id: 43, query: "stamp draft confidential text watermark across pages", expectType: 'Tool', expectId: 'add-watermark' },
  { id: 44, query: "crop page margins and trim white borders", expectType: 'Tool', expectId: 'crop-pdf' },
  { id: 45, query: "annotate pdf with custom text boxes, lines and shapes", expectType: 'Tool', expectId: 'edit-pdf' },
  { id: 46, query: "fill interactive acroform fields and export csv data", expectType: 'Tool', expectId: 'pdf-forms' },
  { id: 47, query: "spin landscape pages to portrait", expectType: 'Tool', expectId: 'rotate-pdf' },
  { id: 48, query: "paginate document with page 1 of n format", expectType: 'Tool', expectId: 'add-page-numbers' },
  { id: 49, query: "add image logo watermark to pdf", expectType: 'Tool', expectId: 'add-watermark' },
  { id: 50, query: "trim bleed margin", expectType: 'Tool', expectId: 'crop-pdf' },

  // ── 6. PDF Security & Compliance (10 queries) ─────────────────────────────
  { id: 51, query: "encrypt pdf with password and permissions", expectType: 'Tool', expectId: 'protect-pdf' },
  { id: 52, query: "how does 4-layer auto-bypass pdf decryption work?", expectSource: 'Security Unlock Pipeline' },
  { id: 53, query: "apply cryptographic x.509 digital signature with pkcs12", expectSource: 'Security Digital Signatures' },
  { id: 54, query: "auto redact sensitive pii like luhn credit cards and ssn", expectSource: 'Focus Studio Redact' },
  { id: 55, query: "forensic metadata sanitization stripping author and gps", expectSource: 'Security Metadata Scrubbing' },
  { id: 56, query: "lock pdf file with 256-bit AES password", expectType: 'Tool', expectId: 'protect-pdf' },
  { id: 57, query: "remove password from protected pdf", expectType: 'Tool', expectId: 'unlock-pdf' },
  { id: 58, query: "draw digital signature canvas on contract", expectType: 'Tool', expectId: 'sign-pdf' },
  { id: 59, query: "blackout confidential numbers in legal document", expectType: 'Tool', expectId: 'redact-pdf' },
  { id: 60, query: "is my document data secure and private?", expectSource: 'Privacy Guarantee' },

  // ── 7. Document Intelligence & Utilities (10 queries) ─────────────────────
  { id: 61, query: "compare two pdf revisions with pixel heatmap and text diff", expectType: 'Tool', expectId: 'compare-pdf' },
  { id: 62, query: "summarize document executive highlights with local textrank", expectType: 'Tool', expectId: 'ai-summarizer' },
  { id: 63, query: "offline local neural translation for documents", expectType: 'Tool', expectId: 'ai-translator' },
  { id: 64, query: "preview multi-page pdf document in browser", expectType: 'Tool', expectId: 'document-viewer' },
  { id: 65, query: "generate custom qr code with embedded url", expectType: 'Tool', expectId: 'qr-generator' },
  { id: 66, query: "unzip and extract zip archive files in browser", expectType: 'Tool', expectId: 'unzip-file' },
  { id: 67, query: "batch conversion pipeline multiple operations", expectType: 'Tool', expectId: 'conversion-pipeline' },
  { id: 68, query: "side by side pdf comparison slider", expectType: 'Tool', expectId: 'compare-pdf' },
  { id: 69, query: "condense 20 page research paper into bullet points", expectType: 'Tool', expectId: 'ai-summarizer' },
  { id: 70, query: "convert images between png webp and jpg", expectType: 'Tool', expectId: 'image-converter' },

  // ── 8. All 17 Resume Builder Templates (17 queries) ───────────────────────
  { id: 71, query: "mariana executive corporate navy resume template", expectSource: 'Resume Template' },
  { id: 72, query: "olivia warm amber editorial cv for writers", expectSource: 'Resume Template' },
  { id: 73, query: "jonathan sleek developer slate template for software engineers", expectSource: 'Resume Template' },
  { id: 74, query: "emma creative rosewood serif layout for designers", expectSource: 'Resume Template' },
  { id: 75, query: "charles steel executive template for management", expectSource: 'Resume Template' },
  { id: 76, query: "kathleen lavender academic cv for professors", expectSource: 'Resume Template' },
  { id: 77, query: "richard classic business indigo resume", expectSource: 'Resume Template' },
  { id: 78, query: "sanchez dark charcoal grid compact technical cv", expectSource: 'Resume Template' },
  { id: 79, query: "wilson light classical editorial typography cv", expectSource: 'Resume Template' },
  { id: 80, query: "sanchez mono developer monospace timeline cv", expectSource: 'Resume Template' },
  { id: 81, query: "sanchez wave pacific blue template for product managers", expectSource: 'Resume Template' },
  { id: 82, query: "ong burgundy plum luxury header cv", expectSource: 'Resume Template' },
  { id: 83, query: "schumacher charcoal minimalist stone builder", expectSource: 'Resume Template' },
  { id: 84, query: "ziv olive forest organic cv template", expectSource: 'Resume Template' },
  { id: 85, query: "adora diagonal teal creative accents layout", expectSource: 'Resume Template' },
  { id: 86, query: "wilson minimal ultra clean resume layout", expectSource: 'Resume Template' },
  { id: 87, query: "alvarado slate split column geometric layout", expectSource: 'Resume Template' },

  // ── 9. Studio Canvas DAG & Navigation Mechanics (13 queries) ──────────────
  { id: 88, query: "how to pan and zoom on the canvas dot grid?", expectSource: 'Canvas Navigation' },
  { id: 89, query: "how do I connect node output port to input with bezier cables?", expectSource: 'Canvas Cable Connections' },
  { id: 90, query: "how to disconnect or delete a cable wire?", expectSource: 'Canvas Cable Disconnect' },
  { id: 91, query: "how does pipeline auto-healing work when connecting docx to merge?", expectSource: 'Canvas Auto-Healing' },
  { id: 92, query: "what is incremental pdf merge on canvas?", expectSource: 'Canvas Incremental Merge' },
  { id: 93, query: "condition router decision branching true and false ports", expectSource: 'Canvas Condition Router' },
  { id: 94, query: "canvas preconfigured workflow recipes blueprints", expectSource: 'Canvas Recipes' },
  { id: 95, query: "how to share canvas workflow via url hash link?", expectSource: 'Canvas Share Flow' },
  { id: 96, query: "export and import canvas workflow json blueprints", expectSource: 'Canvas Export Import' },
  { id: 97, query: "canvas command bar and slash commands like /merge and /compress", expectSource: 'Canvas Commands' },
  { id: 98, query: "canvas keyboard shortcuts matrix ctrl z and delete", expectSource: 'Canvas Keyboard Shortcuts' },
  { id: 99, query: "arrange grid button auto organize topological layout", expectSource: 'Canvas Arrange Grid' },
  { id: 100, query: "quick tools right dock on the canvas", expectSource: 'Canvas Quick Tools' },

  // ── 10. Platform, Tiers, & Troubleshooting (10 queries) ───────────────────
  { id: 101, query: "is docforge 100% local first client side privacy?", expectSource: 'Privacy Guarantee' },
  { id: 102, query: "can I use docforge completely offline without internet?", expectSource: 'Offline Mode' },
  { id: 103, query: "what are the file size limits for guest, free and pro plans?", expectSource: 'Pricing & Tiers' },
  { id: 104, query: "all supported file formats pdf word excel powerpoint", expectSource: 'Supported Formats' },
  { id: 105, query: "native tauri desktop application for docforge", expectSource: 'Desktop App' },
  { id: 106, query: "troubleshooting slow or stuck conversions in browser", expectSource: 'Troubleshooting Stuck Operations' },
  { id: 107, query: "how to repair broken or corrupted pdf files?", expectSource: 'Troubleshooting Repair PDF' },
  { id: 108, query: "what is organize studio fullscreen workspace?", expectSource: 'Focus Studio Organize' },
  { id: 109, query: "compare studio swipe divider and delta heatmap", expectSource: 'Focus Studio Compare' },
  { id: 110, query: "does docforge use my documents to train ai models?", expectSource: 'FAQ' }
];

async function run100Tests() {
  console.log(`[Test Suite] Loading knowledge base...`);
  const kbPath = path.resolve('public/models/website_knowledge.json');
  const kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
  console.log(`[Test Suite] Loaded ${kb.length} knowledge chunks.`);

  console.log(`[Test Suite] Loading all-MiniLM-L6-v2 embeddings model...`);
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  let passed = 0;
  let top3Passed = 0;
  const failures = [];

  console.log(`\n======================================================================`);
  console.log(`  STARTING 110-QUERY COMPREHENSIVE SITE INTELLIGENCE TEST SUITE`);
  console.log(`======================================================================\n`);

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    
    // Generate query embedding
    const output = await extractor(tc.query, { pooling: 'mean', normalize: true });
    const queryVector = Array.from(output.data);

    // Perform Hybrid Search (BM25 + Vector RRF)
    const results = performHybridSearch({
      query: tc.query,
      queryVector,
      knowledgeBase: kb,
      topK: 3
    });

    const top1 = results[0]?.item;
    const top3 = results.map(r => r.item);

    // Check assertion
    let isMatch = false;
    let isTop3Match = false;

    if (tc.expectId) {
      isMatch = top1?.metadata?.id === tc.expectId;
      isTop3Match = top3.some(item => item.metadata?.id === tc.expectId);
    } else if (tc.expectSource) {
      isMatch = top1?.source === tc.expectSource || top1?.source.includes(tc.expectSource) || top1?.text.includes(tc.expectSource);
      isTop3Match = top3.some(item => item.source === tc.expectSource || item.source.includes(tc.expectSource) || item.text.includes(tc.expectSource));
    }

    if (isMatch) {
      passed++;
      top3Passed++;
      console.log(`[PASS #${tc.id.toString().padStart(3, '0')}] Query: "${tc.query.substring(0, 48).padEnd(48)}" -> Rank 1: ${top1?.source} (${top1?.metadata?.title || top1?.metadata?.templateName || ''}) [RRF: ${results[0]?.rrfScore.toFixed(4)}]`);
    } else if (isTop3Match) {
      top3Passed++;
      console.log(`[TOP-3 #${tc.id.toString().padStart(3, '0')}] Query: "${tc.query.substring(0, 48).padEnd(48)}" -> In Top 3: Rank ${top3.findIndex(item => item.metadata?.id === tc.expectId || item.source === tc.expectSource) + 1}`);
    } else {
      failures.push({ tc, topResults: results });
      console.log(`[FAIL #${tc.id.toString().padStart(3, '0')}] Query: "${tc.query}" -> Expected: ${tc.expectId || tc.expectSource}, Got: ${top1?.source} (${top1?.metadata?.title || ''})`);
    }
  }

  console.log(`\n======================================================================`);
  console.log(`  TEST RESULTS SUMMARY`);
  console.log(`======================================================================`);
  console.log(`  Total Queries Tested: ${TEST_CASES.length}`);
  console.log(`  Rank 1 Exact Matches: ${passed}/${TEST_CASES.length} (${((passed / TEST_CASES.length) * 100).toFixed(2)}%)`);
  console.log(`  Top 3 Recall:         ${top3Passed}/${TEST_CASES.length} (${((top3Passed / TEST_CASES.length) * 100).toFixed(2)}%)`);
  console.log(`======================================================================\n`);

  if (failures.length > 0) {
    console.log(`Failure details:`, failures);
    process.exit(1);
  } else {
    console.log(`ALL 110 TEST QUERIES PASSED WITH 100% RECALL!`);
  }
}

run100Tests();
