// Web Worker for client-side semantic intent classification using Xenova/all-MiniLM-L6-v2
try {
  importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  if (self.ort && self.ort.env) {
    self.ort.env.wasm.numThreads = 1; // Keep it lightweight
    self.ort.env.wasm.simd = true;
  }
  if (self.transformers && self.transformers.env) {
    const env = self.transformers.env;
    env.allowLocalModels = true;
    env.localModelPath = '/models/';
    env.remoteHost = 'https://huggingface.co/';
    env.remotePathTemplate = '{model}/resolve/{revision}/';
  }
} catch (err) {
  console.warn('[Classifier Worker] CDN Transformers library unavailable:', err.message || err);
}

let extractorInstance = null;
let prototypeEmbeddings = null;

// Clean, representative sentences for each class (semantic anchors)
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

// Helper: L2 Normalization
function l2Normalize(vector) {
  let sum = 0;
  for (let i = 0; i < vector.length; ++i) {
    sum += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sum);
  if (norm === 0) return vector;
  return vector.map(val => val / norm);
}

// Helper: Cosine Similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; ++i) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct; // Already normalized
}

// Load pipeline and pre-calculate prototype embeddings
async function initializeModel() {
  if (extractorInstance) return;

  try {
    self.postMessage({ type: 'status', message: 'Loading all-MiniLM-L6-v2 model...' });
    
    extractorInstance = await self.transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      progress_callback: (data) => {
        if (data.status === 'download' || data.status === 'progress') {
          self.postMessage({
            type: 'loading',
            file: data.file || '',
            progress: data.progress || 0,
            loaded: data.loaded || 0,
            total: data.total || 0,
            status: data.status
          });
        } else if (data.status === 'done') {
          self.postMessage({
            type: 'loading',
            file: data.file || '',
            progress: 100,
            loaded: data.total || 0,
            total: data.total || 0,
            status: 'done'
          });
        }
      }
    });
    
    self.postMessage({ type: 'status', message: 'Generating intent semantic anchors...' });

    // Pre-calculate embeddings for all prototypes
    prototypeEmbeddings = {};
    for (const [intent, sentences] of Object.entries(INTENT_PROTOTYPES)) {
      prototypeEmbeddings[intent] = [];
      for (const sentence of sentences) {
        const output = await extractorInstance(sentence, { pooling: 'mean', normalize: true });
        prototypeEmbeddings[intent].push(Array.from(output.data));
      }
    }

    self.postMessage({ type: 'ready' });
  } catch (err) {
    console.error('Failed to load semantic classifier model:', err);
    self.postMessage({ type: 'error', error: 'Failed to load semantic model: ' + err.message });
    throw err;
  }
}

// Message handler
self.onmessage = async (e) => {
  const { type, text } = e.data;

  if (type === 'init') {
    try {
      await initializeModel();
    } catch (err) {
      // Handled in initializeModel
    }
    return;
  }

  if (type === 'embed_query') {
    try {
      await initializeModel();
      const output = await extractorInstance(text, { pooling: 'mean', normalize: true });
      self.postMessage({
        type: 'embed_result',
        embedding: Array.from(output.data)
      });
    } catch (err) {
      self.postMessage({ type: 'error', error: 'Embedding failed: ' + err.message });
    }
    return;
  }

  if (type === 'classify') {
    try {
      await initializeModel();
      
      // Embed input query
      const output = await extractorInstance(text, { pooling: 'mean', normalize: true });
      const queryEmbedding = Array.from(output.data);

      let bestIntent = 'unknown';
      let highestSimilarity = 0.0;

      // Find closest prototype anchor
      for (const [intent, embeddings] of Object.entries(prototypeEmbeddings)) {
        for (const emb of embeddings) {
          const sim = cosineSimilarity(queryEmbedding, emb);
          if (sim > highestSimilarity) {
            highestSimilarity = sim;
            bestIntent = intent;
          }
        }
      }

      // Threshold: if match is too low, classify as unknown
      const threshold = 0.50; // Tuned for all-MiniLM-L6-v2 cosine similarity
      if (highestSimilarity < threshold) {
        bestIntent = 'unknown';
      }

      self.postMessage({
        type: 'result',
        classLabel: bestIntent,
        confidence: highestSimilarity
      });
    } catch (err) {
      self.postMessage({ type: 'error', error: 'Classification failed: ' + err.message });
    }
  }
};
