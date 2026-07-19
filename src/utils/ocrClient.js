// src/utils/ocrClient.js
// Client Side manager for the OCR Web Worker with live log streaming.

export class OcrClient {
  constructor(devicePreference = 'gpu', language = 'eng', onLog = null) {
    this.devicePreference = devicePreference;
    this.language = language;
    this.onLog = onLog;
    this.worker = null;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise((resolve, reject) => {
      try {
        const workerUrl = `/workers/ocr.worker.js?v=${Date.now()}`;
        console.log(`[OcrClient] Spawning worker: ${workerUrl}`);
        this.worker = new Worker(workerUrl);

        const onInit = (e) => {
          const { type, success, device, error, message } = e.data;
          if (type === 'log') {
            if (this.onLog) this.onLog(message);
            return;
          }
          if (type === 'init_done') {
            this.worker.removeEventListener('message', onInit);
            this.worker.removeEventListener('error', onError);
            if (success) {
              console.log(`[OcrClient] Model ready. Device: ${device}`);
              resolve(device);
            } else {
              this.initPromise = null;
              reject(new Error(error));
            }
          }
        };

        const onError = (err) => {
          console.error(`[OcrClient] Worker load/compilation error:`, err);
          if (this.worker) {
            this.worker.removeEventListener('message', onInit);
            this.worker.removeEventListener('error', onError);
          }
          this.initPromise = null;
          reject(err || new Error('Worker compilation failed.'));
        };

        this.worker.addEventListener('message', onInit);
        this.worker.addEventListener('error', onError);
        // Pass language so the worker loads 1 session (eng) or 2 sessions (multilingual)
        this.worker.postMessage({ type: 'init', payload: { device: this.devicePreference, language: this.language } });

      } catch (err) {
        this.initPromise = null;
        reject(err);
      }
    });
    return this.initPromise;
  }


  /**
   * Recognizes all text on a full page image.
   * Worker segments into lines internally, runs each through the model.
   */
  async recognizeLine(rgbaData, width, height, onProgress = null) {
    await this.init();
    return new Promise((resolve, reject) => {
      const onMsg = (e) => {
        const { type, success, text, linesFound, linesWithText, error, message, current, total } = e.data;
        if (type === 'log') {
          if (this.onLog) this.onLog(message);
          return;
        }
        if (type === 'progress') {
          if (onProgress) onProgress(current, total);
          return;
        }
        if (type === 'process_done') {
          this.worker.removeEventListener('message', onMsg);
          if (success) resolve({ text: text || '', lines: e.data.lines || [], linesFound, linesWithText });
          else reject(new Error(error));
        }
      };
      this.worker.addEventListener('message', onMsg);
      const copy = new Uint8Array(rgbaData);
      this.worker.postMessage({ type: 'process', payload: { rgbaBuffer: copy.buffer, width, height } }, [copy.buffer]);
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.initPromise = null;
    }
  }
}
