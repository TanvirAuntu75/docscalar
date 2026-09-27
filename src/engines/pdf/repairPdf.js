import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { BACKEND_URL, uploadFileSecure, apiFetch } from '../../utils/api.js';

/**
 * Re-indexes a corrupted PDF document's cross-reference table (XREF).
 * Re-serializes object streams Client Side to output a clean compliant file.
 * Uses multi-tier recovery:
 *   Tier 1: pdf-lib Client-side XREF rebuild & object tree re-serialization
 *   Tier 2: Backend pikepdf (QPDF) / PyMuPDF recovery endpoint (if reachable)
 *   Tier 3: Resilient client-side pdfjs canvas salvage pipeline
 *
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - The corrupted PDF file.
 * @param {object|function} options - Repair configuration options or progress callback.
 * @param {function} onProgress - Progress callback.
 * @returns {Promise<Blob|{blob: Blob, pageCount: number, originalSize: number, repairedSize: number, strategy: string}>}
 */
export async function repairPdf(file, options = {}, onProgress = null) {
  // Handle flexible signature where onProgress is passed as second argument
  if (typeof options === 'function') {
    onProgress = options;
    options = {};
  }

  if (onProgress) onProgress(10);

  let arrayBuffer;
  let originalSize = 0;
  let originalName = 'document.pdf';

  if (file instanceof ArrayBuffer) {
    arrayBuffer = file;
    originalSize = arrayBuffer.byteLength;
  } else if (file instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(file))) {
    arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    originalSize = file.byteLength;
  } else if (file && typeof file.arrayBuffer === 'function') {
    arrayBuffer = await file.arrayBuffer();
    originalSize = file.size || arrayBuffer.byteLength;
    if (file.name) originalName = file.name;
  } else {
    throw new Error('Invalid file input for PDF repair.');
  }

  if (onProgress) onProgress(25);

  const {
    mode = 'standard',
    stripCorruptMetadata = true,
    returnBlobOnly = false
  } = options;

  let repairedDoc = null;
  let strategyUsed = 'Standard XREF Re-indexing';
  let recoveredBlob = null;
  let pageCount = 0;

  // =========================================================================
  // Tier 1: Client-Side pdf-lib Engine
  // =========================================================================
  try {
    if (mode === 'deep') {
      strategyUsed = 'Deep Object Stream Reconstruction';
      const sourceDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        updateMetadata: false
      });

      if (onProgress) onProgress(50);

      repairedDoc = await PDFDocument.create();
      pageCount = sourceDoc.getPageCount();
      const pageIndices = Array.from({ length: pageCount }, (_, i) => i);

      const copiedPages = await repairedDoc.copyPages(sourceDoc, pageIndices);
      copiedPages.forEach((page) => repairedDoc.addPage(page));

      if (stripCorruptMetadata) {
        repairedDoc.setProducer('DocScalar PDF Repair');
        repairedDoc.setCreator('DocScalar');
      }
    } else {
      repairedDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false
      });

      if (onProgress) onProgress(50);

      if (stripCorruptMetadata) {
        repairedDoc.setProducer('DocScalar PDF Repair');
      }
      pageCount = repairedDoc.getPageCount();
    }

    const savedBytes = await repairedDoc.save({
      useObjectStreams: false, // Write standard object tables for maximum reader compliance
      addDefaultPage: false
    });

    recoveredBlob = new Blob([savedBytes], { type: 'application/pdf' });
    if (onProgress) onProgress(90);
  } catch (clientErr) {
    console.warn('[PDF Repair] Tier 1 client load failed:', clientErr);

    // =========================================================================
    // Tier 2: Backend QPDF / PyMuPDF Recovery Escalation
    // =========================================================================
    let backendSuccess = false;
    try {
      if (typeof fetch !== 'undefined' && BACKEND_URL) {
        if (onProgress) onProgress(45);
        const healthCheck = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(2000) });
        if (healthCheck.ok) {
          const fileToUpload =
            typeof File !== 'undefined' && file instanceof File
              ? file
              : new Blob([arrayBuffer], { type: 'application/pdf' });
          fileToUpload.name = file.name || originalName;
          const uploadRes = await uploadFileSecure(BACKEND_URL, fileToUpload, (p) => {
            if (onProgress) onProgress(45 + Math.round(p * 0.25));
          });

          if (uploadRes && uploadRes.file_id) {
            const formData = new FormData();
            formData.append('file_id', uploadRes.file_id);
            formData.append('filename', uploadRes.filename);
            formData.append('mode', mode);
            formData.append('strip_corrupt_metadata', stripCorruptMetadata ? 'true' : 'false');

            const repairRes = await apiFetch(`${BACKEND_URL}/api/repair-pdf`, {
              method: 'POST',
              body: formData
            });

            if (repairRes.ok) {
              const jobData = await repairRes.json();
              if (jobData && jobData.job_id) {
                // Poll for completion (up to 30 seconds)
                for (let attempt = 0; attempt < 30; attempt++) {
                  await new Promise((r) => setTimeout(r, 1000));
                  const statusRes = await apiFetch(`${BACKEND_URL}/api/job/${jobData.job_id}/status`);
                  if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    if (statusData.status === 'finished') {
                      const downloadRes = await apiFetch(statusData.download_url);
                      if (downloadRes.ok) {
                        recoveredBlob = await downloadRes.blob();
                        strategyUsed = 'Backend QPDF & Stream Recovery';
                        backendSuccess = true;
                        try {
                          const verifyDoc = await PDFDocument.load(await recoveredBlob.arrayBuffer(), { ignoreEncryption: true });
                          pageCount = verifyDoc.getPageCount();
                        } catch {
                          pageCount = 1;
                        }
                        break;
                      }
                    } else if (statusData.status === 'failed') {
                      break;
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (backendErr) {
      console.warn('[PDF Repair] Tier 2 backend recovery failed:', backendErr);
    }

    // =========================================================================
    // Tier 3: Resilient Canvas Salvage via pdfjs-dist
    // =========================================================================
    if (!backendSuccess) {
      try {
        if (onProgress) onProgress(55);
        strategyUsed = 'Resilient Document Structure Recovery';

        const pdfjsDoc = await pdfjsLib.getDocument({
          data: arrayBuffer.slice(0),
          disableWorker: true,
          stopAtErrors: false
        }).promise;

        const numPages = pdfjsDoc.numPages;
        if (numPages > 0) {
          const freshDoc = await PDFDocument.create();
          freshDoc.setProducer('DocScalar PDF Repair');

          for (let p = 1; p <= numPages; p++) {
            const pdfjsPage = await pdfjsDoc.getPage(p);
            const viewport = pdfjsPage.getViewport({ scale: 2.0 }); // High-DPI 144 DPI render

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await pdfjsPage.render({ canvasContext: ctx, viewport }).promise;

            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const jpgBytes = await (await fetch(dataUrl)).arrayBuffer();
            const embeddedImg = await freshDoc.embedJpg(jpgBytes);

            const baseViewport = pdfjsPage.getViewport({ scale: 1.0 });
            const newPage = freshDoc.addPage([baseViewport.width, baseViewport.height]);
            newPage.drawImage(embeddedImg, {
              x: 0,
              y: 0,
              width: baseViewport.width,
              height: baseViewport.height
            });

            if (onProgress) {
              onProgress(55 + Math.round((p / numPages) * 35));
            }
          }

          const freshBytes = await freshDoc.save({ useObjectStreams: false });
          recoveredBlob = new Blob([freshBytes], { type: 'application/pdf' });
          pageCount = numPages;
        } else {
          throw new Error('No salvageable pages found in document stream.');
        }
      } catch (tier3Err) {
        console.error('[PDF Repair] All recovery tiers failed:', tier3Err);
        throw new Error(
          'Failed to repair PDF. The file is empty, password encrypted, or severely corrupted beyond reconstruction.'
        );
      }
    }
  }

  if (onProgress) onProgress(100);

  if (!recoveredBlob) {
    throw new Error('Failed to repair PDF structure. Output document could not be generated.');
  }

  // Attach telemetry directly onto outputBlob for polymorphic access
  recoveredBlob.pageCount = pageCount;
  recoveredBlob.originalSize = originalSize;
  recoveredBlob.repairedSize = recoveredBlob.size;
  recoveredBlob.strategy = strategyUsed;

  if (returnBlobOnly) {
    return recoveredBlob;
  }

  return {
    success: true,
    blob: recoveredBlob,
    pageCount,
    originalSize,
    repairedSize: recoveredBlob.size,
    size: recoveredBlob.size,
    strategy: strategyUsed
  };
}
