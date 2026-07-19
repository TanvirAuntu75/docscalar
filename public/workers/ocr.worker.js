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

importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/ort.min.js');
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/';
ort.env.wasm.numThreads = 4;
ort.env.webgl.pack = true;

const MODEL_H = 48;
const MODEL_W = 320;

let sessionHW    = null;
let sessionMulti = null; // null when English-only mode
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
  self.postMessage({ type: 'log', message: `[Worker] ${msg}` });
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

function findLines(gray, w, h) {
  const DARK_THRESH = 220;
  const MIN_LINE_H  = 5;
  const PAD         = 3;
  const MIN_DARK_PX = Math.max(1, Math.floor(w * 0.002));

  const proj = new Int32Array(h);
  for (let y = 0; y < h; y++) {
    let dark = 0;
    for (let x = 0; x < w; x++) {
      if (gray[y*w+x] < DARK_THRESH) dark++;
    }
    proj[y] = dark;
  }

  const lines = [];
  let inLine = false, y0 = 0;
  for (let y = 0; y < h; y++) {
    if (!inLine && proj[y] >= MIN_DARK_PX) { inLine = true; y0 = y; }
    else if (inLine && proj[y] < MIN_DARK_PX) {
      inLine = false;
      if (y - y0 >= MIN_LINE_H) {
        lines.push({ y0: Math.max(0, y0-PAD), y1: Math.min(h, y+PAD) });
      }
    }
  }
  if (inLine && h - y0 >= MIN_LINE_H) {
    lines.push({ y0: Math.max(0, y0-PAD), y1: h });
  }

  sendLog(`findLines found ${lines.length} lines.`);
  return lines;
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
    if (dark > 5) bands.push({ y0: y, y1: Math.min(h, y+bandH) });
  }
  sendLog(`uniformBands fallback generated ${bands.length} bands.`);
  return bands;
}

function cropResizeNormalizeToTensor(rgba, pageW, y0, y1) {
  const sW = pageW;
  const sH = y1 - y0;
  const scaledW = Math.min(MODEL_W, Math.max(1, Math.round(sW * MODEL_H / sH)));

  const buf = new Float32Array(3 * MODEL_H * MODEL_W);
  buf.fill(1.0);

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
      const idx00 = ((yf     + y0)*pageW + xf)*4;
      const idx01 = ((yf     + y0)*pageW + Math.min(xf+1, sW-1))*4;
      const idx10 = ((Math.min(yf+1, sH-1)+y0)*pageW + xf)*4;
      const idx11 = ((Math.min(yf+1, sH-1)+y0)*pageW + Math.min(xf+1, sW-1))*4;

      const r = (rgba[idx00]||0)*w00 + (rgba[idx01]||0)*w01 + (rgba[idx10]||0)*w10 + (rgba[idx11]||0)*w11;
      const g = (rgba[idx00+1]||0)*w00 + (rgba[idx01+1]||0)*w01 + (rgba[idx10+1]||0)*w10 + (rgba[idx11+1]||0)*w11;
      const b = (rgba[idx00+2]||0)*w00 + (rgba[idx01+2]||0)*w01 + (rgba[idx10+2]||0)*w10 + (rgba[idx11+2]||0)*w11;

      const destIdx = destRowOffset + dx;
      buf[destIdx]            = b / 127.5 - 1.0;
      buf[lenR + destIdx]     = g / 127.5 - 1.0;
      buf[2*lenR + destIdx]   = r / 127.5 - 1.0;
    }
  }
  return new ort.Tensor('float32', buf, [1, 3, MODEL_H, MODEL_W]);
}

function ctcDecode(data, dims, vocabulary) {
  const seqLen  = dims.length===3 ? dims[1] : dims[0];
  const vocabSz = dims.length===3 ? dims[2] : dims[1];
  let text='', last=-1, confSum=0;
  for (let t=0; t<seqLen; t++) {
    let mv=-Infinity, mi=-1;
    for (let c=0; c<vocabSz; c++) { const s=data[t*vocabSz+c]; if (s>mv) { mv=s; mi=c; } }
    confSum+=mv;
    if (mi > 0 && mi !== last) { const ch = vocabulary[mi-1]; if (ch) text += ch; }
    last=mi;
  }
  return { text: text.trim(), conf: confSum/seqLen };
}

// ── Message router ────────────────────────────────────────────────────────────
self.onmessage = async function(e) {
  const { type, payload } = e.data;

  // ── INIT ────────────────────────────────────────────────────────────────────
  if (type === 'init') {
    try {
      const eps = [];
      if (payload.device === 'gpu') { eps.push('webgpu'); eps.push('webgl'); }
      eps.push('wasm');

      // English-only = load 1 session (1 WebGL context).
      // Any other language = load both sessions (2 WebGL contexts, parallel ensemble).
      const isEnglishOnly = !payload.language || payload.language === 'eng';

      sendLog('Fetching multilingual dictionary...');
      const dictRes = await fetch('/models/multilingual_dict.txt');
      if (!dictRes.ok) throw new Error('Failed to load multilingual dictionary asset.');
      const dictText = await dictRes.text();
      MULTI_CHARS = dictText.split('\n').map(l => l.replace('\r', ''));
      sendLog(`Multilingual dictionary loaded. Total characters: ${MULTI_CHARS.length}`);

      let selectedDevice = eps[0];

      // Helper function to load session with WASM fallback if GPU backend (WebGL/WebGPU) fails
      // (e.g. because DynamicQuantizeLinear is not supported on GPU execution providers)
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
        // English-only: skip sessionMulti — saves 1 WebGL context per worker.
        // With 5 workers: 5×1=5 contexts (safe everywhere) vs 5×2=10 (Chrome only).
        sessionMulti = null;
        sendLog('Language: English — single-model mode. Multilingual session skipped.');
      } else {
        // Multilingual: each session has its OWN WebGL context — no collision.
        // Promise.all([HW.run(), Multi.run()]) is safe — separate GPU state.
        sendLog(`Initializing multilingual session for: ${payload.language}...`);
        sessionMulti = await createSessionWithFallback('/models/rec_multilingual_web.onnx', eps);
        sendLog('Multilingual session ready. Dual-model ensemble active.');
      }
      // Run a warmup inference pass to JIT-compile WebGPU/WebGL shaders before processing starts
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
      let lines = findLines(gray, width, height);
      const usedFallback = lines.length === 0;
      if (usedFallback) lines = uniformBands(gray, width, height);

      const lineTexts = [];
      const lineData  = [];
      const mode = sessionMulti ? 'dual-model ensemble' : 'single-model (HW only)';
      sendLog(`Running ${mode} inference for ${lines.length} lines...`);

      for (let idx = 0; idx < lines.length; idx++) {
        const { y0, y1 } = lines[idx];
        if (y1 - y0 < 4) {
          self.postMessage({ type: 'progress', current: idx + 1, total: lines.length });
          continue;
        }

        const tensor = cropResizeNormalizeToTensor(rgbaData, width, y0, y1);
        let text, conf;

        if (sessionMulti) {
          // MULTILINGUAL: both sessions fire simultaneously — independent WebGL contexts, safe
          const [outHW, outMulti] = await Promise.all([
            sessionHW.run({ 'x': tensor }),
            sessionMulti.run({ 'x': tensor })
          ]);
          const decHW    = ctcDecode(outHW[sessionHW.outputNames[0]].data,       outHW[sessionHW.outputNames[0]].dims,       HW_CHARS);
          const decMulti = ctcDecode(outMulti[sessionMulti.outputNames[0]].data,  outMulti[sessionMulti.outputNames[0]].dims,  MULTI_CHARS);

          text = decHW.text; conf = decHW.conf;
          const hasMultilingualOnlyChar = Array.from(decMulti.text).some(ch => !dict_chars.includes(ch) && ch !== ' ');
          if (decMulti.conf > decHW.conf || (hasMultilingualOnlyChar && decMulti.conf > 0.45)) {
            text = decMulti.text; conf = decMulti.conf;
            sendLog(`[Line ${idx}] Multi wins: "${text}" (multi=${decMulti.conf.toFixed(2)}, hw=${decHW.conf.toFixed(2)})`);
          } else {
            sendLog(`[Line ${idx}] HW wins: "${text}" (hw=${decHW.conf.toFixed(2)}, multi=${decMulti.conf.toFixed(2)})`);
          }
        } else {
          // ENGLISH-ONLY: single session, no ensemble overhead
          const outHW = await sessionHW.run({ 'x': tensor });
          const decHW = ctcDecode(outHW[sessionHW.outputNames[0]].data, outHW[sessionHW.outputNames[0]].dims, HW_CHARS);
          text = decHW.text; conf = decHW.conf;
          sendLog(`[Line ${idx}] HW: "${text}" (conf=${conf.toFixed(2)})`);
        }

        if (text) {
          // Find x0 and x1 by scanning columns for dark pixels
          let x0 = 0;
          let x1 = width - 1;
          
          let foundX0 = false;
          for (let x = 0; x < width; x++) {
            for (let y = y0; y <= y1; y++) {
              if (gray[y * width + x] < 220) {
                x0 = x;
                foundX0 = true;
                break;
              }
            }
            if (foundX0) break;
          }
          
          let foundX1 = false;
          for (let x = width - 1; x >= 0; x--) {
            for (let y = y0; y <= y1; y++) {
              if (gray[y * width + x] < 220) {
                x1 = x;
                foundX1 = true;
                break;
              }
            }
            if (foundX1) break;
          }

          lineTexts.push(text);
          lineData.push({ text, y0, y1, x0, x1 });
        }
        self.postMessage({ type: 'progress', current: idx + 1, total: lines.length });
      }

      const totalTime = performance.now() - t0;
      sendLog(`Done in ${totalTime.toFixed(1)}ms. Lines: ${lineTexts.length}/${lines.length}`);

      self.postMessage({
        type: 'process_done', success: true,
        text: lineTexts.join('\n'),
        lines: lineData,
        linesFound: lines.length,
        linesWithText: lineTexts.length,
        usedFallback,
      });
    } catch(err) {
      sendLog(`Processing error: ${err.message}`);
      self.postMessage({ type: 'process_done', success: false, error: err.message });
    }
  }
};
