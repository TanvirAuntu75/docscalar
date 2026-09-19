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
    env.allowRemoteModels = false;
    env.localModelPath = '/models/';
  }
} catch (err) {
  console.warn('[Classifier Worker] CDN Transformers library unavailable:', err.message || err);
}

let classifierPipeline = null;

// Clean map of model class labels to DocForge tool IDs
const LABEL_TO_TOOL_ID = {
  'add-page-numbers': 'add-page-numbers',
  'add-watermark': 'add-watermark',
  'ai-summarizer': 'ai-summarizer',
  'ai-translator': 'ai-translator',
  'bates-numbering': 'bates-numbering',
  'compare-pdf': 'compare-pdf',
  'compress-pdf': 'compress-pdf',
  'condition-router': 'condition-router',
  'conversion-pipeline': 'conversion-pipeline',
  'crop-pdf': 'crop-pdf',
  'document-viewer': 'document-viewer',
  'docx-to-pdf': 'docx-to-pdf',
  'edit-pdf': 'edit-pdf',
  'excel-to-pdf': 'excel-to-pdf',
  'extract-pages': 'extract-pages',
  'html-to-pdf': 'html-to-pdf',
  'image-compressor': 'image-compressor',
  'image-converter': 'image-converter',
  'image-resizer': 'image-resizer',
  'image-to-pdf': 'image-to-pdf',
  'merge-pdf': 'merge-pdf',
  'ocr-pdf': 'ocr-pdf',
  'organize-pdf': 'organize-pdf',
  'pdf-forms': 'pdf-forms',
  'pdf-to-excel': 'pdf-to-excel',
  'pdf-to-image': 'pdf-to-image',
  'pdf-to-pdfa': 'pdf-to-pdfa',
  'pdf-to-powerpoint': 'pdf-to-powerpoint',
  'pdf-to-word': 'pdf-to-word',
  'powerpoint-to-pdf': 'powerpoint-to-pdf',
  'protect-pdf': 'protect-pdf',
  'qr-generator': 'qr-generator',
  'redact-pdf': 'redact-pdf',
  'remove-pages': 'remove-pages',
  'repair-pdf': 'repair-pdf',
  'resume-builder': 'resume-builder',
  'rotate-pdf': 'rotate-pdf',
  'scan-to-pdf': 'scan-to-pdf',
  'sign-pdf': 'sign-pdf',
  'split-pdf': 'split-pdf',
  'text-to-pdf': 'text-to-pdf',
  'un-ocr-pdf': 'un-ocr-pdf',
  'unlock-pdf': 'unlock-pdf',
  'unsupported': 'unsupported',
  'unzip-file': 'unzip-file',
  'url-to-pdf': 'url-to-pdf'
};

function mapLabelToToolId(label) {
  if (!label) return 'unknown';
  return LABEL_TO_TOOL_ID[label] || label;
}

// Load 46-class text-classification pipeline
async function initializeModel() {
  if (classifierPipeline) return;

  try {
    self.postMessage({ type: 'status', message: 'Loading docforge-intent neural classifier...' });

    if (self.transformers && self.transformers.env) {
      const env = self.transformers.env;
      env.allowLocalModels = true;
      env.allowRemoteModels = false;
      env.localModelPath = '/models/';
    }

    classifierPipeline = await self.transformers.pipeline('text-classification', 'docforge-intent', {
      quantized: true,
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

    self.postMessage({ type: 'ready' });
  } catch (err) {
    console.error('Failed to load neural intent classifier:', err);
    self.postMessage({ type: 'error', error: 'Failed to load neural model: ' + (err.message || err) });
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
      // Feature extraction is deprecated in favor of sequence classification.
      // Gracefully return null so caller activates BM25 fallback immediately without hanging.
      self.postMessage({
        type: 'embed_result',
        embedding: null
      });
    } catch (err) {
      self.postMessage({ type: 'error', error: 'Embedding failed: ' + (err.message || err) });
    }
    return;
  }

  if (type === 'classify') {
    try {
      await initializeModel();

      // Run 46-class text-classification pipeline
      const result = await classifierPipeline(text);
      const top = Array.isArray(result) ? result[0] : result;
      const rawLabel = top && top.label ? top.label : 'unknown';
      const score = top && typeof top.score === 'number' ? top.score : 0.0;

      // Map the label to the corresponding tool ID
      const label = mapLabelToToolId(rawLabel);

      self.postMessage({
        type: 'result',
        classLabel: label,
        confidence: score,
        raw: result
      });
    } catch (err) {
      console.error('Classification failed:', err);
      self.postMessage({ type: 'error', error: 'Classification failed: ' + (err.message || err) });
    }
  }
};
