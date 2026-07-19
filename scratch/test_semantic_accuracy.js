import { pipeline, env } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';

// Configure env to use local model files
env.allowLocalModels = true;
env.localModelPath = path.resolve('public/models');

const INTENT_PROTOTYPES = {
  'merge-pdf': ["merge these pdfs together", "combine my pdf files into one document", "join files together", "stitch pdf"],
  'split-pdf': ["split my pdf into separate pages", "divide this document into parts", "cut the pdf in half", "separate the pages of my document"],
  'compress-pdf': ["compress my pdf file", "shrink the file size of my pdf", "reduce the pdf size", "make the pdf smaller", "squeeze the file size down"],
  'ocr-pdf': ["make this pdf searchable using ocr", "recognize text in my scanned pdf", "read text from image pdf", "extract text from scan"],
  'rotate-pdf': ["rotate this pdf 90 degrees", "turn the page sideways", "flip the pdf upside down", "rotate my pdf pages"],
  'protect-pdf': ["protect this pdf with a password", "lock the pdf file", "encrypt my document", "secure my pdf", "safeguard this document"],
  'unlock-pdf': ["unlock pdf with key", "decrypt my document", "remove password lock", "bypass lock"],
  'docx-to-pdf': ["convert docx to pdf", "word to pdf", "convert word document to pdf"],
  'excel-to-pdf': ["excel to pdf", "xlsx to pdf", "convert excel sheet to pdf", "spreadsheet to pdf"],
  'powerpoint-to-pdf': ["convert powerpoint to pdf", "ppt to pdf", "pptx to pdf", "slides to pdf"],
  'html-to-pdf': ["convert html to pdf", "convert html code to pdf", "webpage html to pdf file"],
  'pdf-to-word': ["pdf to word document", "convert pdf to docx", "convert pdf to word"],
  'pdf-to-excel': ["pdf to excel", "pdf to sheet", "convert pdf to xlsx", "convert pdf to spreadsheet"],
  'pdf-to-powerpoint': ["convert pdf to powerpoint", "pdf to ppt", "pdf to pptx", "convert pdf to slides"],
  'image-converter': ["png to jpg format converter", "convert image format", "jpeg to webp", "change image format"],
  'image-to-pdf': ["convert images to pdf", "photos to pdf", "pictures to pdf", "jpg to pdf", "png to pdf"],
  'image-compressor': ["compress image", "shrink photo size", "reduce image size", "compress photo", "make image smaller"],
  'image-resizer': ["resize my photo", "resize image", "scale image", "change dimensions", "scale photo"],
  'unzip-file': ["unzip folder", "unzip archive", "extract zip file", "decompress zip file"],
  'add-watermark': ["add watermark on my document", "watermark pdf", "stamp pdf", "add stamp to document"],
  'add-page-numbers': ["paginate file", "add page numbers", "paginate pdf", "insert page numbers"],
  'remove-pages': ["delete pages from pdf", "remove page from document", "exclude page", "delete specific pages"],
  'crop-pdf': ["crop this document", "crop pdf", "cut margins", "trim pdf margins"],
  'edit-pdf': ["edit pdf", "modify pdf", "annotate pdf", "draw on pdf", "write on pdf", "pdf editor"],
  'qr-generator': ["generate a qr code", "barcode generator", "create qr code", "make qr code"],
  'redact-pdf': ["redact sensitive info from pdf", "blackout text in pdf", "hide sensitive info", "censor pdf"],
  'compare-pdf': ["compare documents", "diff pdf", "compare pdfs", "pdf comparison", "compare two pdfs"],
  'pdf-to-pdfa': ["pdf to pdfa", "archive pdf", "convert pdf to pdfa", "make pdfa compliant"],
  'url-to-pdf': ["convert website to pdf", "url to pdf", "convert webpage to pdf", "link to pdf"],
  'pdf-to-image': ["pdf to image", "pdf to images", "pdf to jpg", "pdf to png", "convert pdf to image"],
  'ai-translator': ["translate language in document", "translate file", "language translation", "translate pdf"],
  'text-to-pdf': ["convert text to pdf", "txt to pdf", "convert text file to pdf", "txt to pdf converter"],
  'sign-pdf': ["sign document online", "sign pdf", "add signature", "draw signature", "e-sign pdf"],
  'extract-pages': ["extract page", "select page", "extract pages from pdf", "pull pages from pdf"],
  'organize-pdf': ["reorder my pdf pages", "organize pages", "arrange pages", "rearrange pdf pages"],
  'pdf-forms': ["pdf forms fill in", "fill form", "form fields", "fill pdf form", "interactive form"],
  'repair-pdf': ["repair corrupted pdf", "fix broken pdf", "restore damaged pdf", "fix pdf file"],
  'scan-to-pdf': ["scan this document with webcam", "scan document", "scan to pdf", "trigger a scanner"],
  'conversion-pipeline': ["execute batch conversion workflow pipeline", "sequential pipeline process", "conversion workflow", "batch process"],
  'resume-builder': ["create a resume from templates", "please build cv", "resume builder", "cv builder", "create cv"]
};

// Cosine Similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; ++i) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct; // Already normalized by pipeline
}

const testCases = [
  { clause: "please merge these pdfs together", action: "merge-pdf" },
  { clause: "can you combine them", action: "merge-pdf" },
  { clause: "shrink file size", action: "compress-pdf" },
  { clause: "make it smaller please", action: "compress-pdf" },
  { clause: "convert docx to pdf", action: "docx-to-pdf" },
  { clause: "word to pdf", action: "docx-to-pdf" },
  { clause: "password restrict my document", action: "protect-pdf" },
  { clause: "protect pdf now", action: "protect-pdf" },
  { clause: "unlock pdf with key", action: "unlock-pdf" },
  { clause: "translate language in document", action: "ai-translator" },
  { clause: "translate file", action: "ai-translator" },
  { clause: "png to jpg format converter", action: "image-converter" },
  { clause: "unzip folder", action: "unzip-file" },
  { clause: "add watermark on my document", action: "add-watermark" },
  { clause: "paginate file", action: "add-page-numbers" },
  { clause: "delete pages", action: "remove-pages" },
  { clause: "crop this document", action: "crop-pdf" },
  { clause: "convert html to pdf", action: "html-to-pdf" },
  { clause: "convert website to pdf", action: "url-to-pdf" },
  { clause: "convert text to pdf", action: "text-to-pdf" },
  { clause: "compare documents", action: "compare-pdf" },
  { clause: "pdf forms fill in", action: "pdf-forms" },
  { clause: "sign document online", action: "sign-pdf" },
  { clause: "i want to split this document", action: "split-pdf" },
  { clause: "make this pdf searchable using ocr", action: "ocr-pdf" },
  { clause: "rotate my pdf pages", action: "rotate-pdf" },
  { clause: "convert powerpoint to pdf", action: "powerpoint-to-pdf" },
  { clause: "pdf to word document", action: "pdf-to-word" },
  { clause: "convert images to pdf", action: "image-to-pdf" },
  { clause: "resize my photo", action: "image-resizer" },
  { clause: "redact sensitive info from pdf", action: "redact-pdf" },
  { clause: "generate a qr code", action: "qr-generator" },
  { clause: "reorder my pdf pages", action: "organize-pdf" },
  { clause: "i have a couple of documents from my client and i want to merge pdf because my boss requested to have this done as soon as possible", action: "merge-pdf" },
  { clause: "as part of my daily document management pipeline i must compress my pdf to avoid any prospective errors in the future", action: "compress-pdf" },
  { clause: "my manager asked me if it is possible to unlock pdf so i can download the final processed file to my computer", action: "unlock-pdf" },
  { clause: "could you please check the node network and help me to translate pdf without losing any text formatting or formatting styles", action: "ai-translator" },
  { clause: "since the current file layout is messy let's try to crop pdf on the files that are currently active in my selection pool", action: "crop-pdf" },
  { clause: "i uploaded some files just now and i need you to convert docx to pdf on all the selected document nodes in the workspace grid", action: "docx-to-pdf" },
  { clause: "in order to share these files with my team i need to add watermark to pdf to make sure everything is compliant with our company security policy", action: "add-watermark" },
  { clause: "hello, how can you assist me?", action: "unknown" },
  { clause: "who designed you?", action: "unknown" },
  { clause: "wipe the canvas clear", action: "unknown" },
  { clause: "undo", action: "unknown" },
  { clause: "redo", action: "unknown" },
  { clause: "undo the merge", action: "unknown" },
  { clause: "redo the split", action: "unknown" },
  { clause: "clear canvas", action: "unknown" },
  { clause: "don't merge these files", action: "unknown" },
  { clause: "do not compress this pdf", action: "unknown" },
  { clause: "stop the merge please", action: "unknown" },
  { clause: "cancel the rotation", action: "unknown" },
  { clause: "never compress this file", action: "unknown" },
  { clause: "wait don't merge yet", action: "unknown" },
  { clause: "zoom in", action: "unknown" },
  { clause: "select all nodes", action: "unknown" },
  { clause: "download my file", action: "unknown" },
  { clause: "delete this node", action: "unknown" },
  { clause: "toggle dark mode", action: "unknown" },
  { clause: "is there a way to merge this file?", action: "merge-pdf" },
  { clause: "how do i compress my document?", action: "compress-pdf" },
  { clause: "can you tell me how to rotate these?", action: "rotate-pdf" },
  { clause: "is it possible to translate this pdf?", action: "ai-translator" },
  { clause: "this needs to be merged", action: "merge-pdf" },
  { clause: "the pdf should be compressed", action: "compress-pdf" },
  { clause: "my pdf file needs to be rotated", action: "rotate-pdf" },
  { clause: "pls merge this", action: "merge-pdf" },
  { clause: "plz compress this file", action: "compress-pdf" },
  { clause: "need 2 split this", action: "split-pdf" },
  { clause: "scan this document with webcam", action: "scan-to-pdf" },
  { clause: "trigger a scanner to scan document to pdf", action: "scan-to-pdf" },
  { clause: "execute batch conversion workflow pipeline", action: "conversion-pipeline" },
  { clause: "sequential pipeline process", action: "conversion-pipeline" },
  { clause: "create a resume from templates", action: "resume-builder" },
  { clause: "please build cv", action: "resume-builder" },
  { clause: "এই ফাইলটা মার্জ করো", action: "merge-pdf" },
  { clause: "দয়া করে পিডিএফ সাইজ কমানো", action: "compress-pdf" },
  { clause: "এই file টা compress করে দাও", action: "compress-pdf" },
  { clause: "আমার pdf টা rotate করা দরকার", action: "rotate-pdf" },
  { clause: "make it really small", action: "compress-pdf" },
  { clause: "compress it as much as possible", action: "compress-pdf" },
  { clause: "merge this document—actually no, do not do that", action: "unknown" },
  { clause: "please merge the file—wait, let's split instead", action: "split-pdf" },
  { clause: "ugh why won't this work, just merge them already", action: "merge-pdf" },
  { clause: "just do the stupid compress already", action: "compress-pdf" },
  { clause: "can this thing even rotate pdfs?", action: "rotate-pdf" },
  { clause: "what is the maximum file size to compress?", action: "compress-pdf" }
];

async function main() {
  console.log("Loading all-MiniLM-L6-v2 model in Node.js...");
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  console.log("Generating semantic anchors...");
  const prototypeEmbeddings = {};
  for (const [intent, sentences] of Object.entries(INTENT_PROTOTYPES)) {
    prototypeEmbeddings[intent] = [];
    for (const sentence of sentences) {
      const output = await extractor(sentence, { pooling: 'mean', normalize: true });
      prototypeEmbeddings[intent].push(Array.from(output.data));
    }
  }

  console.log("\nRunning Semantic Test Suite...");
  let passed = 0;
  const total = testCases.length;

  for (const { clause, action } of testCases) {
    const output = await extractor(clause, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data);

    let bestIntent = 'unknown';
    let highestSimilarity = 0.0;

    for (const [intent, embeddings] of Object.entries(prototypeEmbeddings)) {
      for (const emb of embeddings) {
        const sim = cosineSimilarity(queryEmbedding, emb);
        if (sim > highestSimilarity) {
          highestSimilarity = sim;
          bestIntent = intent;
        }
      }
    }

    const threshold = 0.50;
    const finalPredict = highestSimilarity < threshold ? 'unknown' : bestIntent;

    if (finalPredict === action) {
      passed++;
      console.log(`[PASS] "${clause}" -> Predicted: '${finalPredict}' (Sim: ${highestSimilarity.toFixed(4)})`);
    } else {
      console.log(`[FAIL] "${clause}" -> Expected: '${action}', Got: '${finalPredict}' (Sim: ${highestSimilarity.toFixed(4)})`);
    }
  }

  console.log(`\nSemantic Accuracy: ${passed}/${total} (${((passed / total) * 100).toFixed(2)}%)`);
}

main().catch(console.error);
