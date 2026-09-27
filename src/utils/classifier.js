let cachedWeights = null;
let vocabUnigrams = [];
let weightsPromise = null;

/**
 * Lazily loads the heavy classifier weights dictionary (1.77 MB) on-demand,
 * preventing it from bloating the main application bundle.
 */
export async function loadClassifierWeights() {
  if (cachedWeights) return cachedWeights;
  if (!weightsPromise) {
    weightsPromise = (async () => {
      try {
        const mod = await import('./classifier_weights.json');
        cachedWeights = mod.default || mod;
      } catch (err) {
        if (typeof process !== 'undefined' && process.versions && process.versions.node) {
          try {
            const { createRequire } = await import('node:module');
            const require = createRequire(import.meta.url);
            cachedWeights = require('./classifier_weights.json');
          } catch (reqErr) {
            console.warn('[Classifier] Failed to load classifier weights via require fallback:', reqErr);
            return null;
          }
        } else {
          console.warn('[Classifier] Failed to load classifier weights dynamically:', err);
          return null;
        }
      }
      if (cachedWeights && cachedWeights.vocabulary) {
        vocabUnigrams = Object.keys(cachedWeights.vocabulary).filter(k => !k.includes(' '));
      }
      return cachedWeights;
    })();
  }
  return weightsPromise;
}

export function getClassifierWeightsSync() {
  return cachedWeights;
}

/**
 * Stem a word by stripping common suffixes, matching the python stemmer.
 */
function stem(word) {
  let w = word.toLowerCase().trim();
  if (w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  else if (w.endsWith('ment')) w = w.slice(0, -4);
  return w;
}

function getLevenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const correctionsCache = {};
const STOPWORDS = new Set([
  "would", "could", "should", "mind", "have", "with", "this", "that", "them", "then",
  "their", "there", "some", "from", "your", "want", "need", "about", "here", "work",
  "make", "does", "even", "more", "really", "please"
]);

function correctWord(word) {
  if (word.length <= 3) return word;
  if (STOPWORDS.has(word)) return word;
  if (cachedWeights && cachedWeights.vocabulary && cachedWeights.vocabulary[word] !== undefined) return word;
  if (correctionsCache[word] !== undefined) return correctionsCache[word];

  let bestWord = word;
  const maxAllowed = word.length <= 5 ? 1 : 2;
  let minDist = maxAllowed + 1;

  if (vocabUnigrams.length > 0) {
    for (const vWord of vocabUnigrams) {
      if (Math.abs(vWord.length - word.length) >= minDist) continue;
      if (vWord[0] !== word[0] && vWord[vWord.length - 1] !== word[word.length - 1]) continue;

      const dist = getLevenshteinDistance(word, vWord);
      if (dist < minDist) {
        minDist = dist;
        bestWord = vWord;
      }
    }
  }

  correctionsCache[word] = bestWord;
  return bestWord;
}

/**
 * Tokenize a query string into lowercase unigrams and bigrams.
 */
function tokenizeNgrams(text) {
  // ── Input Pathology Normalizations ─────────────────────────────────────────
  // 1. Truncate pasted walls of text (emails, Slack threads) — keep first 150 chars
  //    so the real command verb is always within the classification window.
  let clean = text.length > 150 ? text.slice(0, 150) : text;

  // 2. Strip Windows/Unix file paths — "C:\Users\me\file.pdf compress" → "compress"
  //    Handles: C:\..., /home/..., ./..., ../...
  clean = clean.replace(/(?:[A-Za-z]:[\\/]|[./]{1,2}[\\/])\S+/g, ' ');

  // 3. Strip leading slash-command or @-mention prefix — "/me compress" → "compress"
  clean = clean.replace(/^\s*(?:\/\w+|@\w+)\s+/, '');

  // 4. Strip HTML tags and markdown syntax (```, ##, **, __, <tag>)
  clean = clean.replace(/<[^>]*>/g, ' ')         // HTML tags
               .replace(/```[\s\S]*?```/g, ' ')   // fenced code blocks
               .replace(/`[^`]*`/g, ' ')          // inline code
               .replace(/#{1,6}\s/g, ' ')         // markdown headings
               .replace(/[*_]{1,2}(\S.*?\S)[*_]{1,2}/g, '$1'); // bold/italic

  // 5. European locale decimal comma → dot ("1,5 MB" → "1.5 MB")
  //    Already done in canvasBrain for params — mirror here for classifier tokens.
  clean = clean.replace(/\b(\d+),(\d+)\b/g, '$1.$2');

  // ── Bengali digits → Arabic ─────────────────────────────────────────────────
  const bengaliToArabic = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  const normalized = clean.replace(/[০-৯]/g, m => bengaliToArabic[m]);

  const words = normalized
    .toLowerCase()
    .trim()
    .replace(/—/g, ' ')
    .replace(/–/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(stem)
    .map(correctWord);

  const tokens = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]} ${words[i + 1]}`);
  }
  return tokens;
}

/**
 * Transform input tokens to a sparse L2-normalized TF-IDF vector.
 */
function getSparseTfidfVector(tokens) {
  if (!cachedWeights || !cachedWeights.vocabulary) return [];
  const tf = {};
  for (const t of tokens) {
    if (cachedWeights.vocabulary[t] !== undefined) {
      tf[t] = (tf[t] || 0) + 1;
    }
  }

  const sparse = [];
  let squaredSum = 0.0;

  for (const t in tf) {
    const featIdx = cachedWeights.vocabulary[t];
    const idfVal = cachedWeights.idf[featIdx];
    const val = tf[t] * idfVal;
    sparse.push({ index: featIdx, value: val });
    squaredSum += val * val;
  }

  if (squaredSum > 0) {
    const l2Norm = Math.sqrt(squaredSum);
    for (const item of sparse) {
      item.value /= l2Norm;
    }
  }
  return sparse;
}

// Keyword validation rules for confidence boosting
const BOOST_KEYWORDS = {
  'merge-pdf': /\b(merge|combine|join|stitch|concatenate|মার্জ)\b/i,
  'split-pdf': /\b(split|divide|separate)\b/i,
  'compress-pdf': /\b(compress|shrink|smaller|reduce|size|কমানো|সাইজ)\b/i,
  'ocr-pdf': /\b(ocr|recognize|searchable)\b/i,
  'rotate-pdf': /\b(rotate|turn)\b/i,
  'protect-pdf': /\b(protect|lock|encrypt|password)\b/i,
  'unlock-pdf': /\b(unlock|decrypt)\b/i,
  'docx-to-pdf': /\b(docx|word)\b/i,
  'excel-to-pdf': /\b(excel|xlsx|spreadsheet|csv)\b/i,
  'powerpoint-to-pdf': /\b(powerpoint|ppt|pptx|slide)\b/i,
  'html-to-pdf': /\b(html|webpage|website)\b/i,
  'pdf-to-word': /\b(word|docx)\b/i,
  'pdf-to-excel': /\b(excel|xlsx|spreadsheet)\b/i,
  'pdf-to-powerpoint': /\b(powerpoint|ppt|pptx|slide)\b/i,
  'image-converter': /\b(convert|jpg|png|webp|format|image)\b/i,
  'image-to-pdf': /\b(image|photo|picture|jpg|png|pdf)\b/i,
  'image-compressor': /\b(compress|shrink|smaller|image|photo|picture|jpg|png)\b/i,
  'image-resizer': /\b(resize|scale|dimension|image|photo|picture|jpg|png)\b/i,
  'unzip-file': /\b(unzip|extract|zip|decompress|archive)\b/i,
  'add-watermark': /\b(watermark|stamp)\b/i,
  'add-page-numbers': /\b(page|number|paginate)\b/i,
  'remove-pages': /\b(remove|delete|exclude)\b/i,
  'crop-pdf': /\b(crop|margin|trim)\b/i,
  'edit-pdf': /\b(edit|modify|annotate|draw|write)\b/i,
  'qr-generator': /\b(qr|barcode|generate)\b/i,
  'redact-pdf': /\b(redact|blackout|censor|hide)\b/i,
  'compare-pdf': /\b(compare|diff)\b/i,
  'pdf-to-pdfa': /\b(pdfa|archive)\b/i,
  'url-to-pdf': /\b(url|website|webpage|link)\b/i,
  'pdf-to-image': /\b(image|jpg|png|jpeg)\b/i,
  'text-to-pdf': /\b(text|txt)\b/i,
  'sign-pdf': /\b(sign|signature)\b/i,
  'extract-pages': /\b(extract|select)\b/i,
  'organize-pdf': /\b(reorder|organize|arrange|pages)\b/i,
  'pdf-forms': /\b(form|field|fill)\b/i,
  'repair-pdf': /\b(repair|fix|broken|corrupted|restore)\b/i,
  'scan-to-pdf': /\b(scan|webcam|scanner)\b/i,
  'resume-builder': /\b(resume|cv|builder|template)\b/i
};

function boostIntent(text, intent, originalConfidence) {
  // 1. Negation & Canvas Command Guard (Run early to prevent routing blocked/canvas actions)
  const blockRegex = /\b(not|no|don't|dont|never|stop|cancel|do not|don t|prevent|undo|redo)\b/i;
  if (blockRegex.test(text)) {
    return { classLabel: 'unknown', confidence: 1.0 };
  }

  // 2. Explicit self-corrections and transitions override
  if (/\b(split instead|let's split|lets split)\b/i.test(text)) {
    return { classLabel: 'split-pdf', confidence: 1.0 };
  }

  // 3. Bengali direct mapping overrides (no \b boundaries for non-ASCII)
  if (/মার্জ/i.test(text)) {
    return { classLabel: 'merge-pdf', confidence: 1.0 };
  }
  if (/(কমানো|সাইজ)/i.test(text) && !/(image|ছবি|ফটো)/i.test(text)) {
    return { classLabel: 'compress-pdf', confidence: 1.0 };
  }

  if (/\b(unlock|unprotect|strip(?:\s+the)?\s+security|remove(?:\s+the)?\s+security)\b/i.test(text)) {
    return { classLabel: 'unlock-pdf', confidence: 1.0 };
  }
  if (/\b(rotate|turn)\b/i.test(text)) {
    return { classLabel: 'rotate-pdf', confidence: 1.0 };
  }
  if (/\b(merge|combine)\b/i.test(text) && !/\b(split|instead)\b/i.test(text)) {
    return { classLabel: 'merge-pdf', confidence: 1.0 };
  }

  // 5. Keyword confidence boost
  if (intent !== 'unknown') {
    const rx = BOOST_KEYWORDS[intent];
    if (rx && rx.test(text)) {
      return { classLabel: intent, confidence: 1.0 };
    }
  }

  return { classLabel: intent, confidence: originalConfidence };
}

/**
 * Run TF-IDF + Logistic Regression classification on the input text.
 * Returns the predicted class label (tool ID or 'unknown') and confidence score.
 */
export function predictIntent(text) {
  // Early boost for direct keyword/Bengali overrides before running the TF-IDF model
  const earlyBoost = boostIntent(text, 'unknown', 0.0);
  if (earlyBoost.classLabel !== 'unknown') {
    return earlyBoost;
  }

  if (!cachedWeights) {
    // Trigger lazy background load for subsequent calls
    loadClassifierWeights();
    return { classLabel: 'unknown', confidence: 1.0 };
  }

  const tokens = tokenizeNgrams(text);
  if (tokens.length === 0) {
    return { classLabel: 'unknown', confidence: 1.0 };
  }

  const sparseVector = getSparseTfidfVector(tokens);
  if (sparseVector.length === 0) {
    return { classLabel: 'unknown', confidence: 1.0 };
  }

  const numClasses = cachedWeights.classes.length;
  const rawZ = new Array(numClasses);
  let maxZ = -Infinity;

  for (let c = 0; c < numClasses; c++) {
    const coef = cachedWeights.coef[c];
    const intercept = cachedWeights.intercept[c];

    // Compute sparse dot product: z = x * w + b
    let z = intercept;
    for (const item of sparseVector) {
      const coefVal = coef[item.index];
      if (coefVal !== undefined) {
        z += item.value * coefVal;
      }
    }
    rawZ[c] = z;
    if (z > maxZ) {
      maxZ = z;
    }
  }

  // Softmax to obtain probability distributions
  let sumExp = 0.0;
  const probs = new Array(numClasses);
  for (let c = 0; c < numClasses; c++) {
    const expVal = Math.exp(rawZ[c] - maxZ);
    probs[c] = expVal;
    sumExp += expVal;
  }

  let topClass = 'unknown';
  let maxScore = 0.0;

  for (let c = 0; c < numClasses; c++) {
    const prob = probs[c] / sumExp;
    if (prob > maxScore) {
      maxScore = prob;
      topClass = cachedWeights.classes[c];
    }
  }

  // Apply heuristic: if it predicts image-compressor but no image keywords are present, map to compress-pdf
  if (topClass === 'image-compressor') {
    const imageKeywords = /\b(image|photo|jpg|jpeg|png|webp|pic|picture|gif)\b/i;
    if (!imageKeywords.test(text)) {
      topClass = 'compress-pdf';
    }
  }

  return boostIntent(text, topClass, maxScore);
}

// ── Dual-Engine Web Worker Integration ──────────────────────────────────────

let classifierWorker = null;
let workerReady = false;
let pendingClassifierResolvers = [];
let pendingEmbedResolvers = [];

export function initClassifierWorker() {
  if (typeof window === 'undefined' || !window.Worker) return;
  if (classifierWorker) return;

  try {
    classifierWorker = new Worker('/workers/classifier.worker.js');
    classifierWorker.postMessage({ type: 'init' });

    classifierWorker.onmessage = (e) => {
      const data = e.data;
      if (data.type === 'ready') {
        workerReady = true;
        console.log('[Classifier] Semantic ONNX worker initialized and ready.');
        // Dispatch global event so UI components know the model is ready
        window.dispatchEvent(new CustomEvent('model-download-progress', {
          detail: { type: 'ready', model: 'docforge-intent' }
        }));
      } else if (data.type === 'status') {
        console.log('[Classifier Worker Status]:', data.message);
        window.dispatchEvent(new CustomEvent('model-download-progress', {
          detail: { type: 'status', message: data.message, model: 'docforge-intent' }
        }));
      } else if (data.type === 'loading') {
        // Forward byte-level download progress to UI
        window.dispatchEvent(new CustomEvent('model-download-progress', {
          detail: {
            type: 'loading',
            model: 'docforge-intent',
            file: data.file,
            progress: data.progress,
            loaded: data.loaded,
            total: data.total,
            status: data.status
          }
        }));
      } else if (data.type === 'result') {
        const resolver = pendingClassifierResolvers.shift();
        if (resolver) {
          resolver({ classLabel: data.classLabel, confidence: data.confidence, raw: data.raw });
        }
      } else if (data.type === 'embed_result') {
        const resolver = pendingEmbedResolvers.shift();
        if (resolver) {
          resolver(data.embedding);
        }
      } else if (data.type === 'error') {
        console.warn('[Classifier Worker Error Message]:', data.error);
        if (pendingClassifierResolvers.length > 0) {
          const resolver = pendingClassifierResolvers.shift();
          if (resolver) resolver(null);
        } else if (pendingEmbedResolvers.length > 0) {
          const resolver = pendingEmbedResolvers.shift();
          if (resolver) resolver(null);
        }
      }
    };

    classifierWorker.onerror = (err) => {
      console.warn('[Classifier Worker Non-Fatal Error]:', err?.message || err);
      if (err && typeof err.preventDefault === 'function') {
        err.preventDefault();
      }
      workerReady = false;
      while (pendingClassifierResolvers.length > 0) {
        const resolver = pendingClassifierResolvers.shift();
        if (resolver) resolver(null);
      }
      while (pendingEmbedResolvers.length > 0) {
        const resolver = pendingEmbedResolvers.shift();
        if (resolver) resolver(null);
      }
    };
  } catch (err) {
    console.error('[Classifier] Failed to spawn web worker:', err);
  }
}

/**
 * Predict intent asynchronously using the Web Worker with all-MiniLM-L6-v2 ONNX model.
 * Falls back immediately to the local TF-IDF model if the worker is not ready.
 */
export async function predictIntentAsync(text) {
  // Ensure classifier weights are loaded for local TF-IDF inference
  if (!cachedWeights) {
    await loadClassifierWeights();
  }

  // 1. Run local TF-IDF first
  const tfidfResult = predictIntent(text);

  const tfidfThreshold = 0.80;
  if (tfidfResult.classLabel !== 'unknown' && tfidfResult.confidence >= tfidfThreshold) {
    return tfidfResult;
  }

  // 2. Check for explicit negations before calling Semantic
  const negationRegex = /\b(not|no|don't|dont|never|stop|cancel|do not|don t|prevent)\b/i;
  if (negationRegex.test(text)) {
    return { classLabel: 'unknown', confidence: 1.0 };
  }

  // 3. Fall back to Semantic Model (Web Worker)
  if (!classifierWorker) {
    initClassifierWorker();
  }

  if (!workerReady || !classifierWorker) {
    return tfidfResult;
  }

  const semanticResult = await new Promise((resolve) => {
    pendingClassifierResolvers.push(resolve);
    classifierWorker.postMessage({ type: 'classify', text });
  });

  if (!semanticResult) {
    return tfidfResult;
  }

  let finalPredict = semanticResult.classLabel;

  // Cleanly reject out-of-domain requests if the neural model predicted 'unsupported'
  if (finalPredict === 'unsupported') {
    return { classLabel: 'unknown', confidence: 1.0 };
  }

  // Apply fallback heuristic to Semantic output
  if (finalPredict === 'image-compressor') {
    const imageKeywords = /\b(image|photo|jpg|jpeg|png|webp|pic|picture|gif)\b/i;
    if (!imageKeywords.test(text)) {
      finalPredict = 'compress-pdf';
    }
  }

  const boostedSemantic = boostIntent(text, finalPredict, semanticResult.confidence);

  const semanticThreshold = semanticResult.confidence < 0.2 ? 0.025 : 0.55;
  if (boostedSemantic.confidence < semanticThreshold) {
    return { classLabel: 'unknown', confidence: 1.0 };
  }

  return boostedSemantic;
}

export function isClassifierWorkerReady() {
  return workerReady;
}

/**
 * Generates vector embeddings for a given query text using the background ONNX worker.
 * Returns null immediately if the worker is not ready, allowing BM25 hybrid fallback.
 */
export async function embedQueryText(text) {
  if (!classifierWorker) {
    initClassifierWorker();
  }

  // Fast check: wait up to 400ms if worker is initializing, otherwise gracefully fall back to BM25
  if (!workerReady) {
    let checkCount = 0;
    while (!workerReady && checkCount < 4) {
      await new Promise(r => setTimeout(r, 100));
      checkCount++;
    }
  }

  if (!workerReady || !classifierWorker) {
    return null; // Gracefully fall back to BM25 keyword matching
  }

  return new Promise((resolve) => {
    pendingEmbedResolvers.push(resolve);
    classifierWorker.postMessage({ type: 'embed_query', text });
  });
}



