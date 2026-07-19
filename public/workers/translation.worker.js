// Web Worker for client-side translation using Xenova/m2m100_418M
importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');

// Configure environment
self.ort.env.wasm.numThreads = 4;
self.ort.env.wasm.simd = true;

// Configure Xenova environment variables
const env = self.transformers.env;
env.allowLocalModels = true;
env.localModelPath = '/models/'; // Path relative to root of website
env.remoteHost = 'https://huggingface.co/';
env.remotePathTemplate = '{model}/resolve/{revision}/';

let translatorInstance = null;

// Helper function to map UI language names to M2M100 language codes
function mapLanguageToCode(lang) {
  const mapping = {
    'bengali': 'bn',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'japanese': 'ja',
    'chinese': 'zh',
    'chinese (simplified)': 'zh',
    'korean': 'ko',
    'arabic': 'ar',
    'russian': 'ru',
    'english': 'en'
  };
  return mapping[lang.toLowerCase()] || 'en';
}

// Model load function
async function getTranslator(onProgress) {
  if (translatorInstance) return translatorInstance;

  // Custom progress callback for downloading files
  const progressCallback = (data) => {
    if (data.status === 'progress') {
      self.postMessage({
        type: 'loading',
        file: data.file,
        progress: data.progress,
        loaded: data.loaded,
        total: data.total
      });
    }
  };

  try {
    self.postMessage({ type: 'status', message: 'Loading M2M100 418M translation model from local/remote...' });
    
    // Create the pipeline using Xenova/m2m100_418M and our custom 4-bit ONNX weights
    translatorInstance = await self.transformers.pipeline('translation', 'Xenova/m2m100_418M', {
      progress_callback: progressCallback,
      model_file_names: {
        'encoder': 'encoder_model_q4f16.onnx',
        'decoder': 'decoder_with_past_model_q4f16.onnx'
      }
    });

    self.postMessage({ type: 'ready' });
    return translatorInstance;
  } catch (err) {
    console.error('Failed to load M2M100 translation model:', err);
    self.postMessage({ type: 'error', error: 'Failed to load local translation model: ' + err.message });
    throw err;
  }
}

// Translate page-by-page or block-by-block
self.onmessage = async (e) => {
  const { type, textBlocks, sourceLang, targetLang } = e.data;

  if (type === 'init') {
    try {
      const translator = await getTranslator();
      // Run a tiny warmup translation task to compile shaders and pipelines before the user inputs their document
      self.postMessage({ type: 'status', message: 'Warming up translation model...' });
      await translator('warmup', {
        src_lang: 'en',
        tgt_lang: 'es'
      });
      self.postMessage({ type: 'status', message: 'Translation model warmed up.' });
    } catch (err) {
      // Error already posted inside getTranslator
    }
    return;
  }

  if (type === 'translate') {
    try {
      const translator = await getTranslator();
      const srcCode = mapLanguageToCode(sourceLang || 'English');
      const tgtCode = mapLanguageToCode(targetLang);

      self.postMessage({ type: 'status', message: `Translating ${textBlocks.length} text segments to ${targetLang}...` });

      const translatedBlocks = [];
      for (let i = 0; i < textBlocks.length; i++) {
        const block = textBlocks[i];
        
        if (!block.original || !block.original.trim()) {
          translatedBlocks.push({ ...block, translation: '' });
          continue;
        }

        self.postMessage({ 
          type: 'progress', 
          current: i + 1, 
          total: textBlocks.length, 
          message: `Translating segment ${i + 1} of ${textBlocks.length}...`
        });

        // Run translation
        const output = await translator(block.original, {
          src_lang: srcCode,
          tgt_lang: tgtCode
        });

        const translationText = output[0]?.translation_text || block.original;
        translatedBlocks.push({
          ...block,
          translation: translationText
        });
      }

      self.postMessage({ type: 'completed', translatedBlocks });
    } catch (err) {
      self.postMessage({ type: 'error', error: 'Translation failed: ' + err.message });
    }
  }
};
