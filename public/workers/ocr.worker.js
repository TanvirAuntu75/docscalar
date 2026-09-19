// OCR Worker — Dual-model ensemble (multilingual) or single-model (English-only)
// English:      1 WebGL context per worker (sessionHW only)
// Multilingual: 2 WebGL contexts per worker (sessionHW + sessionMulti, run in parallel per line)

// Mock document so ONNX Runtime WebGL can initialize OffscreenCanvas inside a Web Worker
if (typeof self !== 'undefined' && typeof document === 'undefined') {
  self.document = {
    createElement: function(tag) {
      if (tag === 'canvas') {
        try { return new OffscreenCanvas(1, 1); } catch (e) { return null; }
      }
      return null;
    }
  };
}

if (typeof importScripts === 'function') {
  importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/ort.min.js');
}

if (typeof ort !== 'undefined') {
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/';
  ort.env.wasm.numThreads = 4;
  ort.env.webgl.pack = true;
}

const MODEL_H = 48;
const MODEL_W = 320;

let sessionHW    = null;
let sessionMulti = null; // null when English-only mode
let sessionDet   = null; // DBNet detector model hook
let MULTI_CHARS  = [];

const dict_chars = [
  ">", "?", "@", "[", "\\", "]", "^", "_", "`", "{", "|", "}", "~",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
  "\u00a2", "\u00a3", "\u00a4", "\u00a5", "\u00a6", "\u00a7", "\u00a8", "\u00a9", "\u00aa", "\u00ab", "\u00ac", "\u00ae", "\u00af", "\u00b0", "\u00b1", "\u00b2", "\u00b3", "\u00b4", "\u00b5", "\u00b6"
];
const HW_CHARS = [...dict_chars, " "];

function sendLog(msg) {
  if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
    self.postMessage({ type: 'log', message: `[Worker] ${msg}` });
  }
}

function toGray(rgba, w, h) {
  const g = new Uint8Array(w * h);
  let min = 255, max = 0, sum = 0;
  for (let i = 0; i < w * h; i++) {
    const val = Math.round(0.299*rgba[i*4] + 0.587*rgba[i*4+1] + 0.114*rgba[i*4+2]);
    g[i] = val;
    if (val < min) min = val;
    if (val > max) max = val;
    sum += val;
  }
  sendLog(`Image stats: width=${w}, height=${h}, minGray=${min}, maxGray=${max}, avgGray=${Math.round(sum/(w*h))}`);
  return g;
}

/**
 * Detects vertical columns separated by gutters (whitespace gaps).
 */
function detectColumns(vertProj, w, minGutterW = 16, maxGutterDark = 2) {
  const gutters = [];
  let inGutter = false;
  let gStart = 0;

  for (let x = 0; x < w; x++) {
    const isWhitespace = vertProj[x] <= maxGutterDark;
    if (!inGutter && isWhitespace) {
      inGutter = true;
      gStart = x;
    } else if (inGutter && !isWhitespace) {
      inGutter = false;
      if (x - gStart >= minGutterW) {
        gutters.push({ x0: gStart, x1: x });
      }
    }
  }
  if (inGutter && w - gStart >= minGutterW) {
    gutters.push({ x0: gStart, x1: w });
  }

  // Filter gutters: ignore margins on extreme left and right
  const internalGutters = gutters.filter(g => g.x0 > Math.max(10, Math.floor(w * 0.04)) && g.x1 < Math.min(w - 10, Math.floor(w * 0.96)));

  if (internalGutters.length === 0) {
    return [{ x0: 0, x1: w }];
  }

  const cols = [];
  let curX = 0;
  for (let i = 0; i < internalGutters.length; i++) {
    const g = internalGutters[i];
    if (g.x0 - curX >= 15) {
      cols.push({ x0: curX, x1: g.x0 });
    }
    curX = g.x1;
  }
  if (w - curX >= 15) {
    cols.push({ x0: curX, x1: w });
  }

  return cols.length > 0 ? cols : [{ x0: 0, x1: w }];
}

/**
 * Finds coarse horizontal blocks (e.g. Header, Body, Footer)
 * separated by major horizontal whitespace gaps.
 */
function findHorizontalBlocks(gray, w, h, darkThresh = 220, minGapH = 35) {
  if (w <= 0 || h <= 0) return [];

  const horizProj = new Int32Array(h);
  for (let y = 0; y < h; y++) {
    let dark = 0;
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      if (gray[rowOffset + x] < darkThresh) dark++;
    }
    horizProj[y] = dark;
  }

  const blocks = [];
  let inBlock = false;
  let bStart = 0;
  let whiteRun = 0;

  for (let y = 0; y < h; y++) {
    const hasText = horizProj[y] > Math.max(1, Math.floor(w * 0.002));
    if (hasText) {
      if (!inBlock) {
        inBlock = true;
        bStart = Math.max(0, y - 2);
      }
      whiteRun = 0;
    } else {
      if (inBlock) {
        whiteRun++;
        if (whiteRun >= minGapH) {
          inBlock = false;
          const bEnd = Math.min(h, y - whiteRun + 3);
          if (bEnd - bStart >= 5) {
            blocks.push({ y0: bStart, y1: bEnd });
          }
          whiteRun = 0;
        }
      }
    }
  }

  if (inBlock) {
    const bEnd = Math.min(h, h - whiteRun);
    if (bEnd - bStart >= 5) {
      blocks.push({ y0: bStart, y1: bEnd });
    }
  }

  return blocks.length > 0 ? blocks : [{ y0: 0, y1: h }];
}

/**
 * 2D Columnar & Multi-Box Layout Detector.
 * Resolves multi-column layouts, prevents horizontal text bleeding across columns,
 * and outputs boxes in natural human reading order.
 */
function findBoxes2D(gray, w, h, options = {}) {
  if (!gray || w <= 0 || h <= 0) return [];

  const DARK_THRESH   = options.darkThresh  || 220;
  const MIN_BOX_H     = options.minBoxH     || 5;
  const MIN_BOX_W     = options.minBoxW     || 8;
  const PAD_X         = options.padX        !== undefined ? options.padX : 4;
  const PAD_Y         = options.padY        !== undefined ? options.padY : 2;
  const MIN_GUTTER_W  = options.minGutterW  || Math.max(16, Math.floor(w * 0.02));
  const MAX_GUTTER_DK = options.maxGutterDark || Math.max(2, Math.floor(h * 0.003));

  // 1. Check if the page has global or block-level vertical columns
  const blocks = findHorizontalBlocks(gray, w, h, DARK_THRESH, 35);
  const allBoxes = [];

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    const bH = block.y1 - block.y0;
    if (bH < MIN_BOX_H) continue;

    // Vertical projection for this block
    const blockVertProj = new Int32Array(w);
    for (let y = block.y0; y < block.y1; y++) {
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        if (gray[rowOffset + x] < DARK_THRESH) {
          blockVertProj[x]++;
        }
      }
    }

    // Detect columns within this block
    const blockCols = detectColumns(blockVertProj, w, MIN_GUTTER_W, MAX_GUTTER_DK);

    // If multiple columns exist, check if there is a header inside this block that spans across columns
    if (blockCols.length > 1) {
      // Extract lines per column in natural reading order: Col 0 top-to-bottom, then Col 1 top-to-bottom
      for (let cIdx = 0; cIdx < blockCols.length; cIdx++) {
        const col = blockCols[cIdx];
        const colW = col.x1 - col.x0;
        if (colW < MIN_BOX_W) continue;

        const MIN_DARK_PX_IN_LINE = Math.max(1, Math.floor(colW * 0.004));

        const colHorizProj = new Int32Array(bH);
        for (let y = block.y0; y < block.y1; y++) {
          let dark = 0;
          const rowOffset = y * w;
          for (let x = col.x0; x < col.x1; x++) {
            if (gray[rowOffset + x] < DARK_THRESH) dark++;
          }
          colHorizProj[y - block.y0] = dark;
        }

        let inLine = false;
        let lineY0 = 0;
        for (let ly = 0; ly < bH; ly++) {
          const hasText = colHorizProj[ly] >= MIN_DARK_PX_IN_LINE;
          if (!inLine && hasText) {
            inLine = true;
            lineY0 = ly + block.y0;
          } else if (inLine && !hasText) {
            inLine = false;
            const lineY1 = ly + block.y0;
            if (lineY1 - lineY0 >= MIN_BOX_H) {
              extractLineBox(lineY0, lineY1, col.x0, col.x1, cIdx);
            }
          }
        }
        if (inLine && (block.y1 - lineY0) >= MIN_BOX_H) {
          extractLineBox(lineY0, block.y1, col.x0, col.x1, cIdx);
        }
      }
    } else {
      // Single column block (e.g. Header, Footer, or standard page)
      const MIN_DARK_PX_IN_LINE = Math.max(1, Math.floor(w * 0.002));
      const horizProj = new Int32Array(bH);
      for (let y = block.y0; y < block.y1; y++) {
        let dark = 0;
        const rowOffset = y * w;
        for (let x = 0; x < w; x++) {
          if (gray[rowOffset + x] < DARK_THRESH) dark++;
        }
        horizProj[y - block.y0] = dark;
      }

      let inLine = false;
      let lineY0 = 0;
      for (let ly = 0; ly < bH; ly++) {
        const hasText = horizProj[ly] >= MIN_DARK_PX_IN_LINE;
        if (!inLine && hasText) {
          inLine = true;
          lineY0 = ly + block.y0;
        } else if (inLine && !hasText) {
          inLine = false;
          const lineY1 = ly + block.y0;
          if (lineY1 - lineY0 >= MIN_BOX_H) {
            extractLineBox(lineY0, lineY1, 0, w, 0);
          }
        }
      }
      if (inLine && (block.y1 - lineY0) >= MIN_BOX_H) {
        extractLineBox(lineY0, block.y1, 0, w, 0);
      }
    }
  }

  function extractLineBox(y0, y1, searchX0, searchX1, colIdx) {
    let minX = searchX1, maxX = searchX0;
    let darkCount = 0;

    for (let y = y0; y < y1; y++) {
      const rowOffset = y * w;
      for (let x = searchX0; x < searchX1; x++) {
        if (gray[rowOffset + x] < DARK_THRESH) {
          darkCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    if (darkCount >= 3 && maxX >= minX && (maxX - minX + 1) >= MIN_BOX_W) {
      allBoxes.push({
        x0: Math.max(0, minX - PAD_X),
        x1: Math.min(w, maxX + 1 + PAD_X),
        y0: Math.max(0, y0 - PAD_Y),
        y1: Math.min(h, y1 + PAD_Y),
        colIndex: colIdx
      });
    }
  }

  sendLog(`findBoxes2D detected ${allBoxes.length} text bounding boxes.`);
  return allBoxes;
}

/**
 * Backward-compatible findLines wrapper.
 * Returns array of 2D bounding boxes with { x0, x1, y0, y1, colIndex }.
 */
function findLines(gray, w, h) {
  return findBoxes2D(gray, w, h);
}

function uniformBands(gray, w, h, nBands = 35) {
  const bandH = Math.max(MODEL_H, Math.floor(h / nBands));
  const bands  = [];
  for (let y = 0; y + bandH <= h; y += bandH) {
    let dark = 0;
    for (let row = y; row < y + bandH && row < h; row++) {
      for (let x = 0; x < w; x++) {
        if (gray[row*w+x] < 240) { dark++; if (dark > 5) break; }
      }
    }
    if (dark > 5) bands.push({ x0: 0, x1: w, y0: y, y1: Math.min(h, y+bandH), colIndex: 0 });
  }
  sendLog(`uniformBands fallback generated ${bands.length} bands.`);
  return bands;
}

/**
 * Crops a 2D bounding box (x0, y0, x1, y1), resizes preserving aspect ratio,
 * and normalizes to model input tensor [1, 3, 48, 320].
 * Backwards compatible with (rgba, pageW, y0, y1).
 */
function cropResizeNormalizeToTensor(rgba, pageW, a, b, c, d) {
  let x0, y0, x1, y1;
  if (c === undefined && d === undefined) {
    x0 = 0;
    y0 = Math.max(0, Math.floor(a));
    x1 = pageW;
    y1 = Math.max(y0 + 1, Math.ceil(b));
  } else {
    x0 = Math.max(0, Math.floor(a));
    y0 = Math.max(0, Math.floor(b));
    x1 = Math.min(pageW, Math.max(x0 + 1, Math.ceil(c)));
    y1 = Math.max(y0 + 1, Math.ceil(d));
  }

  const sW = Math.max(1, x1 - x0);
  const sH = Math.max(1, y1 - y0);
  const scaledW = Math.min(MODEL_W, Math.max(1, Math.round(sW * MODEL_H / sH)));

  const buf = new Float32Array(3 * MODEL_H * MODEL_W);
  buf.fill(1.0); // White padding

  const xR = sW > 1 ? (sW - 1) / scaledW : 1;
  const yR = sH > 1 ? (sH - 1) / MODEL_H : 1;
  const lenR = MODEL_H * MODEL_W;

  for (let dy = 0; dy < MODEL_H; dy++) {
    const srcY = dy * yR;
    const yf   = Math.floor(srcY);
    const yd   = srcY - yf;
    const destRowOffset = dy * MODEL_W;

    for (let dx = 0; dx < scaledW; dx++) {
      const srcX = dx * xR;
      const xf   = Math.floor(srcX);
      const xd   = srcX - xf;

      const w00 = (1-xd)*(1-yd), w01 = xd*(1-yd), w10 = (1-xd)*yd, w11 = xd*yd;
      const px0 = Math.min(x0 + xf, pageW - 1);
      const px1 = Math.min(x0 + xf + 1, pageW - 1);
      const py0 = y0 + yf;
      const py1 = Math.min(y0 + yf + 1, y1 - 1);

      const idx00 = (py0 * pageW + px0) * 4;
      const idx01 = (py0 * pageW + px1) * 4;
      const idx10 = (py1 * pageW + px0) * 4;
      const idx11 = (py1 * pageW + px1) * 4;

      const r = (rgba[idx00]||0)*w00 + (rgba[idx01]||0)*w01 + (rgba[idx10]||0)*w10 + (rgba[idx11]||0)*w11;
      const g = (rgba[idx00+1]||0)*w00 + (rgba[idx01+1]||0)*w01 + (rgba[idx10+1]||0)*w10 + (rgba[idx11+1]||0)*w11;
      const b = (rgba[idx00+2]||0)*w00 + (rgba[idx01+2]||0)*w01 + (rgba[idx10+2]||0)*w10 + (rgba[idx11+2]||0)*w11;

      const destIdx = destRowOffset + dx;
      buf[destIdx]            = b / 127.5 - 1.0;
      buf[lenR + destIdx]     = g / 127.5 - 1.0;
      buf[2*lenR + destIdx]   = r / 127.5 - 1.0;
    }
  }

  if (typeof ort !== 'undefined' && ort.Tensor) {
    return new ort.Tensor('float32', buf, [1, 3, MODEL_H, MODEL_W]);
  }
  return { data: buf, dims: [1, 3, MODEL_H, MODEL_W] };
}

function ctcDecode(data, dims, vocabulary) {
  const seqLen  = dims.length === 3 ? dims[1] : dims[0];
  const vocabSz = dims.length === 3 ? dims[2] : dims[1];
  if (!seqLen || seqLen <= 0 || !vocabSz || vocabSz <= 0) {
    return { text: '', conf: 0 };
  }
  let text = '', last = -1, confSum = 0;
  for (let t = 0; t < seqLen; t++) {
    let mv = -Infinity, mi = -1;
    for (let c = 0; c < vocabSz; c++) {
      const s = data[t * vocabSz + c];
      if (s > mv) { mv = s; mi = c; }
    }
    confSum += mv;
    if (mi > 0 && mi !== last) {
      const ch = vocabulary[mi - 1];
      if (ch) text += ch;
    }
    last = mi;
  }
  return { text: text.trim(), conf: seqLen > 0 ? confSum / seqLen : 0 };
}

/**
 * Validates whether recognized handwriting text meets English character and entropy bounds,
 * suppressing repeating CTC decode artifacts and non-Latin glyph conversions.
 */
function isValidEnglishText(text, conf) {
  if (!text || conf < 0.35) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Reject pure punctuation or symbol noise (e.g. circles, dashes, quotes)
  const lettersAndDigits = trimmed.replace(/[^a-zA-Z0-9]/g, '');
  if (lettersAndDigits.length === 0) return false;

  // Reject repeating single-character loops from CTC decode on non-Latin scripts (e.g. "ooo", "eee", "...")
  if (/^(.)\1{2,}$/i.test(lettersAndDigits)) return false;

  // Reject short 1-2 character tokens if confidence is shaky
  if (lettersAndDigits.length <= 2 && conf < 0.50) return false;

  // Reject tokens where non-alphanumeric symbols dominate (> 45% of token length)
  const symbolCount = trimmed.replace(/[a-zA-Z0-9\s]/g, '').length;
  if (trimmed.length >= 4 && (symbolCount / trimmed.length) > 0.45) return false;

  return true;
}

// ── Message router ────────────────────────────────────────────────────────────
if (typeof self !== 'undefined') {
  self.onmessage = async function(e) {
    const { type, payload } = e.data || {};

    // ── INIT ────────────────────────────────────────────────────────────────────
    if (type === 'init') {
      try {
        const eps = [];
        if (payload && payload.device === 'gpu') { eps.push('webgpu'); eps.push('webgl'); }
        eps.push('wasm');

        const isEnglishOnly = !payload || !payload.language || payload.language === 'eng';

        sendLog('Fetching multilingual dictionary...');
        const dictRes = await fetch('/models/multilingual_dict.txt');
        if (!dictRes.ok) throw new Error('Failed to load multilingual dictionary asset.');
        const dictText = await dictRes.text();
        MULTI_CHARS = dictText.split('\n').map(l => l.replace('\r', ''));
        sendLog(`Multilingual dictionary loaded. Total characters: ${MULTI_CHARS.length}`);

        let selectedDevice = eps[0];

        async function createSessionWithFallback(modelPath, providers) {
          try {
            sendLog(`Attempting to load ${modelPath} with providers: ${providers.join(', ')}...`);
            return await ort.InferenceSession.create(modelPath, {
              executionProviders: providers,
              graphOptimizationLevel: 'all'
            });
          } catch (err) {
            if (providers.includes('webgpu') || providers.includes('webgl')) {
              sendLog(`Failed loading with GPU providers: ${err.message}. Retrying with CPU/WASM fallback...`);
              selectedDevice = 'wasm';
              return await ort.InferenceSession.create(modelPath, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all'
              });
            }
            throw err;
          }
        }

        sendLog('Initializing handwriting session...');
        sessionHW = await createSessionWithFallback('/models/rec_handwriting_web.onnx', eps);
        sendLog('Handwriting session ready.');

        if (isEnglishOnly) {
          sessionMulti = null;
          sendLog('Language: English — single-model mode. Multilingual session skipped.');
        } else {
          sendLog(`Initializing multilingual session for: ${payload.language}...`);
          sessionMulti = await createSessionWithFallback('/models/rec_multilingual_web.onnx', eps);
          sendLog('Multilingual session ready. Dual-model ensemble active.');
        }

        // DBNet Text Detection Hook (falls back seamlessly if omitted or not found)
        if (payload && payload.enableDBNet) {
          try {
            sendLog('Attempting to initialize DBNet text detector session...');
            sessionDet = await createSessionWithFallback('/models/det_dbnet_web.onnx', eps);
            sendLog('DBNet detector session active.');
          } catch (detErr) {
            sendLog(`DBNet detector session skipped: ${detErr.message}. Using built-in 2D columnar layout engine.`);
            sessionDet = null;
          }
        }

        // Pre-warm inference shaders
        try {
          const warmupTensor = new ort.Tensor('float32', new Float32Array(1 * 3 * MODEL_H * MODEL_W), [1, 3, MODEL_H, MODEL_W]);
          sendLog('Warming up handwriting session (pre-compiling shaders)...');
          await sessionHW.run({ 'x': warmupTensor });
          if (sessionMulti) {
            sendLog('Warming up multilingual session (pre-compiling shaders)...');
            await sessionMulti.run({ 'x': warmupTensor });
          }
          sendLog('Warmup inference completed successfully.');
        } catch (warmupErr) {
          sendLog(`Warmup warning: ${warmupErr.message}`);
        }

        self.postMessage({ type: 'init_done', success: true, device: selectedDevice });
      } catch(err) {
        sendLog(`Init error: ${err.message}`);
        self.postMessage({ type: 'init_done', success: false, error: err.message });
      }
    }

    // ── PROCESS ─────────────────────────────────────────────────────────────────
    else if (type === 'process') {
      if (!sessionHW) {
        self.postMessage({ type: 'process_done', success: false, error: 'OCR models not initialized' });
        return;
      }
      const t0 = performance.now();
      try {
        const { rgbaBuffer, width, height } = payload;
        const rgbaData = new Uint8Array(rgbaBuffer);
        sendLog(`Processing image: ${width}×${height}`);

        const gray = toGray(rgbaData, width, height);
        let boxes = findBoxes2D(gray, width, height);
        const usedFallback = boxes.length === 0;
        if (usedFallback) {
          boxes = uniformBands(gray, width, height);
        }

        const lineTexts = [];
        const lineData  = [];
        const mode = sessionMulti ? 'dual-model ensemble' : 'single-model (HW only)';
        sendLog(`Running ${mode} inference for ${boxes.length} detected 2D bounding boxes...`);

        for (let idx = 0; idx < boxes.length; idx++) {
          const box = boxes[idx];
          const boxW = box.x1 - box.x0;
          const boxH = box.y1 - box.y0;
          if (boxH < 4 || boxW < 4) {
            self.postMessage({ type: 'progress', current: idx + 1, total: boxes.length });
            continue;
          }

          const tensor = cropResizeNormalizeToTensor(rgbaData, width, box.x0, box.y0, box.x1, box.y1);
          let text, conf;

          if (sessionMulti) {
            const [outHW, outMulti] = await Promise.all([
              sessionHW.run({ 'x': tensor }),
              sessionMulti.run({ 'x': tensor })
            ]);
            const decHW    = ctcDecode(outHW[sessionHW.outputNames[0]].data,       outHW[sessionHW.outputNames[0]].dims,       HW_CHARS);
            const decMulti = ctcDecode(outMulti[sessionMulti.outputNames[0]].data,  outMulti[sessionMulti.outputNames[0]].dims,  MULTI_CHARS);

            text = decHW.text; conf = decHW.conf;
            const hasMultilingualOnlyChar = Array.from(decMulti.text).some(ch => !dict_chars.includes(ch) && ch !== ' ');
            if (decMulti.conf > decHW.conf || (hasMultilingualOnlyChar && decMulti.conf > 0.40)) {
              text = decMulti.text; conf = decMulti.conf;
              sendLog(`[Box ${idx}] Multi wins: "${text}" (multi=${decMulti.conf.toFixed(2)}, hw=${decHW.conf.toFixed(2)})`);
            } else {
              sendLog(`[Box ${idx}] HW wins: "${text}" (hw=${decHW.conf.toFixed(2)}, multi=${decMulti.conf.toFixed(2)})`);
            }
            if (conf < 0.30 || !text.trim()) {
              text = null;
            }
          } else {
            const outHW = await sessionHW.run({ 'x': tensor });
            const decHW = ctcDecode(outHW[sessionHW.outputNames[0]].data, outHW[sessionHW.outputNames[0]].dims, HW_CHARS);
            text = decHW.text; conf = decHW.conf;
            sendLog(`[Box ${idx}] HW: "${text}" (conf=${conf.toFixed(2)})`);
            if (!isValidEnglishText(text, conf)) {
              text = null;
            }
          }

          if (text) {
            lineTexts.push(text);
            lineData.push({
              text,
              y0: box.y0,
              y1: box.y1,
              x0: box.x0,
              x1: box.x1,
              colIndex: box.colIndex !== undefined ? box.colIndex : 0
            });
          }
          self.postMessage({ type: 'progress', current: idx + 1, total: boxes.length });
        }

        const totalTime = performance.now() - t0;
        sendLog(`Done in ${totalTime.toFixed(1)}ms. Lines: ${lineTexts.length}/${boxes.length}`);

        self.postMessage({
          type: 'process_done', success: true,
          text: lineTexts.join('\n'),
          lines: lineData,
          linesFound: boxes.length,
          linesWithText: lineTexts.length,
          usedFallback,
        });
      } catch(err) {
        sendLog(`Processing error: ${err.message}`);
        self.postMessage({ type: 'process_done', success: false, error: err.message });
      }
    }
  };
}

// Expose functions on self for Web Worker environment and test harnesses
if (typeof self !== 'undefined') {
  self.toGray = toGray;
  self.detectColumns = detectColumns;
  self.findHorizontalBlocks = findHorizontalBlocks;
  self.findBoxes2D = findBoxes2D;
  self.findLines = findLines;
  self.uniformBands = uniformBands;
  self.cropResizeNormalizeToTensor = cropResizeNormalizeToTensor;
  self.ctcDecode = ctcDecode;
  self.isValidEnglishText = isValidEnglishText;
  self.MODEL_H = MODEL_H;
  self.MODEL_W = MODEL_W;
  self.HW_CHARS = HW_CHARS;
  self.dict_chars = dict_chars;
}

// Export functions for deterministic unit testing in Node.js / Vitest
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    toGray,
    detectColumns,
    findHorizontalBlocks,
    findBoxes2D,
    findLines,
    uniformBands,
    cropResizeNormalizeToTensor,
    ctcDecode,
    isValidEnglishText,
    MODEL_H,
    MODEL_W,
    HW_CHARS,
    dict_chars
  };
}
