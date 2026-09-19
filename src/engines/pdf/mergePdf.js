/* Merge PDFs engine using background worker */
import ConversionWorker from '../../workers/pdf.worker.js?worker';

/**
 * Merge multiple PDF files into one using a background Web Worker.
 * @param {File[]} files - Array of PDF files
 * @param {number[]} [rotations=[]] - Optional per-file rotation angles
 * @param {object} [options={}] - Optional merge settings (e.g. blankPageSeparator)
 * @param {function} [onProgress] - Callback (percent: number)
 * @returns {Promise<Blob>} - The merged PDF blob
 */
export async function mergePdfs(files, rotations = [], options = {}, onProgress = null) {
  // Support legacy 2-arg signature: mergePdfs(files, onProgress)
  let actualRotations = rotations;
  let actualOptions = options;
  let actualOnProgress = onProgress;

  if (typeof rotations === 'function') {
    actualOnProgress = rotations;
    actualRotations = [];
    actualOptions = {};
  } else if (typeof options === 'function') {
    actualOnProgress = options;
    actualOptions = {};
  }

  return new Promise((resolve, reject) => {
    const worker = new ConversionWorker();
    let isTerminated = false;

    const cleanup = () => {
      if (!isTerminated) {
        isTerminated = true;
        try { worker.terminate(); } catch (_) {}
      }
      if (actualOptions && actualOptions.workerRef) {
        actualOptions.workerRef.current = null;
      }
    };

    if (actualOptions && actualOptions.workerRef) {
      worker.cancel = () => {
        cleanup();
        reject(new Error('MERGE_CANCELLED'));
      };
      const origTerminate = worker.terminate ? worker.terminate.bind(worker) : () => {};
      worker.terminate = () => {
        cleanup();
        try { origTerminate(); } catch (_) {}
        reject(new Error('MERGE_CANCELLED'));
      };
      actualOptions.workerRef.current = worker;
    }

    // Map files to ArrayBuffer promises
    const promises = files.map((file) => file.arrayBuffer());

    Promise.all(promises).then((pdfBuffers) => {
      // Exclude workerRef from options passed to worker to prevent DataCloneError
      const { workerRef, ...workerSafeOptions } = actualOptions || {};
      const enhancedOptions = {
        ...workerSafeOptions,
        fileNames: workerSafeOptions.fileNames || files.map((f) => f.name)
      };

      worker.postMessage({
        type: 'mergePdfs',
        payload: {
          pdfBuffers,
          rotations: actualRotations,
          options: enhancedOptions
        }
      }, pdfBuffers);
    }).catch((err) => {
      cleanup();
      reject(err);
    });

    worker.onmessage = (e) => {
      const { type, progress, stage, currentFile, currentIndex, totalFiles, result, error } = e.data;
      if (type === 'progress') {
        if (actualOnProgress) {
          actualOnProgress(progress, { stage, currentFile, currentIndex, totalFiles });
        }
      } else if (type === 'success') {
        const blob = new Blob([result.pdfBuffer], { type: 'application/pdf' });
        resolve(blob);
        cleanup();
      } else if (type === 'error') {
        reject(new Error(error));
        cleanup();
      }
    };

    worker.onerror = (err) => {
      reject(err);
      cleanup();
    };
  });
}
