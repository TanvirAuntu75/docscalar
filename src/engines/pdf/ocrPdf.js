import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { OcrClient } from '../../utils/ocrClient';

// Fallback worker source if not already configured
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
}

class OcrWorkerPool {
  constructor() {
    this.workers = [];
    this.busyWorkers = new Set();
    this.queue = [];
  }
  
  async getWorker(gpuEnabled, language) {
    // Find an idle worker matching the config
    for (const w of this.workers) {
      if (!this.busyWorkers.has(w) && w.gpu === gpuEnabled && w.language === language) {
        this.busyWorkers.add(w);
        return w.client;
      }
    }
    
    // Spawn a new worker if under limit of 1 concurrent worker (prevents browser context crashes and thread thrashing)
    if (this.workers.length < 1) {
      const client = new OcrClient(gpuEnabled ? 'gpu' : 'cpu', language);
      await client.init();
      const workerInfo = { client, gpu: gpuEnabled, language };
      this.workers.push(workerInfo);
      this.busyWorkers.add(workerInfo);
      return client;
    }
    
    // Wait for a worker to become free
    return new Promise((resolve) => {
      this.queue.push({ gpuEnabled, language, resolve });
    });
  }
  
  releaseWorker(client) {
    const workerInfo = this.workers.find(w => w.client === client);
    if (workerInfo) {
      this.busyWorkers.delete(workerInfo);
      
      // Process next item in queue
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this.busyWorkers.add(workerInfo);
        next.resolve(client);
      }
    }
  }
  
  terminate() {
    this.workers.forEach(w => w.client.terminate());
    this.workers = [];
    this.busyWorkers.clear();
    this.queue = [];
  }
}

const globalPool = new OcrWorkerPool();

export function terminateOcrPool() {
  globalPool.terminate();
}

export async function ocrPdf(file, options = {}, progressCb = () => {}) {
  let pdf = null;
  try {
    const selectedLanguage = options.language || 'eng';
    const gpuEnabled = localStorage.getItem('gpuBoostEnabled') !== 'false';
    
    const arrayBuffer = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const totalPages = pdf.numPages;
    
    if (totalPages === 0) {
      throw new Error('PDF contains no pages');
    }
    
    const pageResults = new Array(totalPages);
    const pageIndices = Array.from({ length: totalPages }, (_, i) => i + 1);
    
    // Process pages sequentially to avoid concurrent WebGL resource spikes and CPU thread locking
    for (const pageNum of pageIndices) {
      const client = await globalPool.getWorker(gpuEnabled, selectedLanguage);
      
      let canvasEl = null;
      let procCanvas = null;
      
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        
        canvasEl = document.createElement('canvas');
        const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
        canvasEl.width = viewport.width;
        canvasEl.height = viewport.height;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);
        
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;
        
        procCanvas = document.createElement('canvas');
        const procCtx = procCanvas.getContext('2d', { willReadFrequently: true });
        const maxDim = 1024;
        let procW = viewport.width;
        let procH = viewport.height;
        
        if (procW > maxDim || procH > maxDim) {
          const scale = maxDim / Math.max(procW, procH);
          procW = Math.floor(procW * scale);
          procH = Math.floor(procH * scale);
        }
        procCanvas.width = procW;
        procCanvas.height = procH;
        
        ctx.fillStyle = '#ffffff';
        procCtx.fillRect(0, 0, procW, procH);
        
        const autoEnhance = localStorage.getItem('autoEnhanceEnabled') !== 'false';
        if (autoEnhance) {
          // High-end document scan filter to optimize OCR accuracy
          procCtx.filter = 'contrast(1.25) brightness(1.05) saturate(0.95)';
        }
        procCtx.drawImage(canvasEl, 0, 0, procW, procH);
        
        const imgData = procCtx.getImageData(0, 0, procW, procH);
        
        // Update progress for starting the page
        progressCb(Math.round(((pageNum - 1) / totalPages) * 100));
        
        const result = await client.recognizeLine(imgData.data, procW, procH, (current, total) => {
          // Calculate sub-page line recognition progress
          const pageWeight = 1 / totalPages;
          const pageStart = (pageNum - 1) / totalPages;
          const currentProgress = pageStart + (current / total) * pageWeight;
          progressCb(Math.min(99, Math.round(currentProgress * 100)));
        });
        
        const imgDataUrl = canvasEl.toDataURL('image/jpeg', 0.92);
        
        pageResults[pageNum - 1] = {
          text: result.text,
          lines: result.lines,
          width: viewport.width,
          height: viewport.height,
          imgDataUrl,
          procW,
          procH
        };
      } finally {
        if (canvasEl) {
          canvasEl.width = 0;
          canvasEl.height = 0;
        }
        if (procCanvas) {
          procCanvas.width = 0;
          procCanvas.height = 0;
        }
        globalPool.releaseWorker(client);
      }
    }
    progressCb(100);
    
    // Load Unifont for Unicode support in invisible text layer
    let fontBase64 = '';
    try {
      const fontRes = await fetch('/fonts/unifont.ttf');
      const fontBlob = await fontRes.blob();
      fontBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(fontBlob);
      });
    } catch (err) {
      console.error('Failed to load Unifont in engine, falling back to Helvetica:', err);
    }

    let docOutput = null;
    for (let i = 1; i <= totalPages; i++) {
      const res = pageResults[i - 1];
      if (!res) continue;
      
      if (!docOutput) {
        docOutput = new jsPDF({
          orientation: res.width > res.height ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [res.width, res.height]
        });
        if (fontBase64) {
          docOutput.addFileToVFS('unifont.ttf', fontBase64);
          docOutput.addFont('unifont.ttf', 'unifont', 'normal');
        }
      } else {
        docOutput.addPage([res.width, res.height], res.width > res.height ? 'landscape' : 'portrait');
      }
      
      docOutput.addImage(res.imgDataUrl, 'JPEG', 0, 0, res.width, res.height);
      
      const scaleX = res.width / res.procW;
      const scaleY = res.height / res.procH;
      
      if (res.lines && res.lines.length > 0) {
        for (const line of res.lines) {
          const ly = ((line.y0 + line.y1) / 2) * scaleY;
          const lx = (line.x0 !== undefined ? line.x0 : 30) * scaleX;
          const fontH = (line.y1 - line.y0) * scaleY;
          const fontSize = Math.max(4, Math.round(fontH * 0.8));
          
          if (fontBase64) {
            docOutput.setFont("unifont", "normal");
          } else {
            docOutput.setFont("helvetica", "normal");
          }
          docOutput.setFontSize(fontSize);
          
          let txtStr = '';
          if (line) {
            if (typeof line === 'string') {
              txtStr = line;
            } else if (typeof line === 'object') {
              if (typeof line.text === 'string') {
                txtStr = line.text;
              } else if (line.text && typeof line.text === 'object' && typeof line.text.text === 'string') {
                txtStr = line.text.text;
              } else if (line.text) {
                txtStr = String(line.text);
              }
            }
          }
          
          docOutput.text(txtStr, lx, ly, { renderingMode: 'invisible' });
        }
      }
    }
    
    if (!docOutput) {
      throw new Error("Failed to compile OCR PDF output.");
    }
    
    return docOutput.output('blob');
  } finally {
    if (pdf) {
      try {
        pdf.destroy();
      } catch (e) {}
    }
    globalPool.terminate();
  }
}
