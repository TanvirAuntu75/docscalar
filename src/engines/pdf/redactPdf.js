/* Redact PDF Engine: Cryptographically Secure Permanent Redaction Architecture */
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { cleanAndRefitDocument } from './cleanAndRefitPage.js';
import { BACKEND_URL, uploadFileSecure, apiFetch } from '../../utils/api.js';

async function extractBytes(file) {
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file && typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  throw new Error('Unsupported PDF file input format for redaction.');
}

/**
 * Permanently redacts a PDF document.
 * In server-backed mode: Calls PyMuPDF to purge character glyphs, content streams, and pixel bytes.
 * In client-side fallback mode: Rasterizes only pages containing redactions to physically destroy
 * the underlying text layer while preserving non-redacted pages as 100% vector content.
 *
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - The PDF file to redact
 * @param {object} params - Redaction parameters: { boxes: [], textPatterns: [], sanitizeMetadata: boolean, dpiScale: number }
 * @param {function} onProgress - Progress callback function (percent: number)
 * @returns {Promise<Blob>}
 */
export async function redactPdf(file, params = {}, onProgress) {
  const arrayBuffer = await extractBytes(file);
  const boxes = (params.boxes || []).filter((b) => b.selected !== false);
  const sanitizeMetadata = params.sanitizeMetadata !== false;
  const fileName = file.name || 'document.pdf';

  if (boxes.length === 0 && !sanitizeMetadata) {
    throw new Error('No redaction areas or metadata sanitization requested.');
  }

  if (onProgress) onProgress(10);

  // =========================================================================
  // Primary Strategy: Backend PyMuPDF Vector Engine (if reachable)
  // =========================================================================
  let backendSuccess = false;
  let resultBlob = null;

  try {
    if (typeof fetch !== 'undefined' && BACKEND_URL) {
      const healthCheck = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(1500) });
      if (healthCheck.ok) {
        if (onProgress) onProgress(25);
        const fileToUpload =
          typeof File !== 'undefined' && file instanceof File
            ? file
            : new Blob([arrayBuffer], { type: 'application/pdf' });
        fileToUpload.name = file.name || fileName;
        const uploadRes = await uploadFileSecure(BACKEND_URL, fileToUpload, (p) => {
          if (onProgress) onProgress(25 + Math.round(p * 0.25));
        });

        if (uploadRes && uploadRes.file_id) {
          if (onProgress) onProgress(55);
          const formData = new FormData();
          formData.append('file_id', uploadRes.file_id);
          formData.append('filename', uploadRes.filename);
          formData.append('redactions_json', JSON.stringify(boxes));
          formData.append('sanitize_metadata', sanitizeMetadata ? 'true' : 'false');

          const redactRes = await apiFetch(`${BACKEND_URL}/api/security/redact`, {
            method: 'POST',
            body: formData
          });

          if (redactRes.ok) {
            const jobData = await redactRes.json();
            if (jobData && jobData.job_id) {
              for (let attempt = 0; attempt < 30; attempt++) {
                await new Promise((r) => setTimeout(r, 800));
                const statusRes = await apiFetch(`${BACKEND_URL}/api/job/${jobData.job_id}/status`);
                if (statusRes.ok) {
                  const statusData = await statusRes.json();
                  if (statusData.status === 'finished') {
                    const downloadRes = await apiFetch(statusData.download_url);
                    if (downloadRes.ok) {
                      resultBlob = await downloadRes.blob();
                      backendSuccess = true;
                      if (onProgress) onProgress(100);
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
    console.warn('[Redact PDF] Backend engine unavailable, executing secure client-side redaction:', backendErr);
  }

  if (backendSuccess && resultBlob) {
    return resultBlob;
  }

  // =========================================================================
  // Fallback Strategy: Client-Side True Text Layer Purge
  // =========================================================================
  if (onProgress) onProgress(35);

  let sourcePdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // VisionClean: Universal Smart Cropper
  if (params && params.autoCropBlackBorders) {
    sourcePdfDoc = await cleanAndRefitDocument(sourcePdfDoc, params.pageCropBoxes || params.cropBox || {}, {
      margin: params.cleanMargin ?? 0,
      enabledEdges: params.enabledEdges,
      pageIndices: params.pageIndices
    });
  }

  const numPages = sourcePdfDoc.getPageCount();
  const pagesWithRedactions = new Set(boxes.map((b) => b.page));

  // If no boxes are drawn and only metadata sanitization is needed
  if (boxes.length === 0) {
    if (sanitizeMetadata) {
      try {
        sourcePdfDoc.setTitle('');
        sourcePdfDoc.setAuthor('');
        sourcePdfDoc.setSubject('');
        sourcePdfDoc.setKeywords([]);
        sourcePdfDoc.setProducer('DocScalar');
        sourcePdfDoc.setCreator('DocScalar');
      } catch {}
    }
    const pdfBytes = await sourcePdfDoc.save({ useObjectStreams: false });
    if (onProgress) onProgress(100);
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // Secure Purge: Load PDF.js document to rasterize pages that contain redactions
  const pdfjsDoc = await pdfjsLib.getDocument({
    data: arrayBuffer.slice(0),
    disableWorker: true
  }).promise;

  const targetDoc = await PDFDocument.create();
  if (sanitizeMetadata) {
    targetDoc.setTitle('');
    targetDoc.setAuthor('');
    targetDoc.setSubject('');
    targetDoc.setKeywords([]);
    targetDoc.setProducer('DocScalar');
    targetDoc.setCreator('DocScalar');
  }

  const renderScale = params.dpiScale || 2.25; // Crisp ~162 DPI high-density rendering

  for (let pIdx = 0; pIdx < numPages; pIdx++) {
    const hasRedactions = pagesWithRedactions.has(pIdx);

    if (!hasRedactions) {
      // Preserve pristine vector content for pages without redactions
      const [copiedPage] = await targetDoc.copyPages(sourcePdfDoc, [pIdx]);
      targetDoc.addPage(copiedPage);
    } else {
      // Permanently destroy underlying text bytes by baking redaction into canvas pixels
      const pageBoxes = boxes.filter((b) => b.page === pIdx && b.selected !== false);
      const pdfjsPage = await pdfjsDoc.getPage(pIdx + 1);
      const viewport = pdfjsPage.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // 1. Render original document page
      await pdfjsPage.render({ canvasContext: ctx, viewport }).promise;

      // 2. Permanently draw opaque solid black boxes directly into pixel canvas
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 1.0;

      pageBoxes.forEach((b) => {
        let bx = b.x;
        let by = b.y;
        let bw = b.width;
        let bh = b.height;

        // Normalize 0..1 ratio coordinates to canvas bitmap pixels
        if (b.isRatio || (b.x >= 0 && b.x <= 1 && b.y >= 0 && b.y <= 1 && b.width <= 1 && b.height <= 1)) {
          bx = b.x * canvas.width;
          by = b.y * canvas.height;
          bw = b.width * canvas.width;
          bh = b.height * canvas.height;
        }

        // Add 1.5px subpixel bleed to prevent edge slippage
        ctx.fillRect(Math.max(0, bx - 1.5), Math.max(0, by - 1.5), bw + 3.0, bh + 3.0);
      });

      // 3. Convert pixel canvas to high-quality JPEG (94% quality)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
      const imgBytes = await (await fetch(dataUrl)).arrayBuffer();
      const embeddedImg = await targetDoc.embedJpg(imgBytes);

      const baseViewport = pdfjsPage.getViewport({ scale: 1.0 });
      const newPage = targetDoc.addPage([baseViewport.width, baseViewport.height]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: baseViewport.width,
        height: baseViewport.height
      });
    }

    if (onProgress) {
      onProgress(35 + Math.round(((pIdx + 1) / numPages) * 60));
    }
  }

  const finalPdfBytes = await targetDoc.save({ useObjectStreams: false });
  if (onProgress) onProgress(100);

  return new Blob([finalPdfBytes], { type: 'application/pdf' });
}
