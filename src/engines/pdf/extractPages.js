import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { cleanAndRefitDocument } from './cleanAndRefitPage.js';

/**
 * Extract specified pages into a new PDF or separate PDF files in a ZIP.
 * @param {File} file - The uploaded PDF file.
 * @param {number[]} indicesToKeep - 0-indexed page numbers to keep.
 * @param {function} onProgress - Progress reporting callback.
 * @param {object} [options] - { splitSeparate: boolean, autoCropBlackBorders?: boolean, ... }
 * @returns {Promise<Blob>} The processed PDF blob or ZIP blob.
 */
export async function extractPages(file, indicesToKeep, onProgress, options = {}) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(30);
  
  let pdfDoc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(50);

  // VisionClean: Universal Smart Cropping (Auto-Crop Black Scan Borders & Refit Dimensions)
  if (options && (options.autoCropBlackBorders || options.smartCrop)) {
    const targetCropBoxes = options.pageCropBoxes || options.docCropBoxes || (options.docCropBox ? { 0: options.docCropBox } : {});
    const hasAnyScanBorders = Object.values(targetCropBoxes).some(
      (b) => b && b.hasBlackBorders === true && (b.cropTop > 0 || b.cropBottom > 0 || b.cropLeft > 0 || b.cropRight > 0)
    );
    if (hasAnyScanBorders) {
      pdfDoc = await cleanAndRefitDocument(pdfDoc, targetCropBoxes, {
        margin: options.cleanMargin ?? 0,
        enabledEdges: options.enabledEdges || { top: true, bottom: true, left: true, right: true }
      });
    }
  }
  
  const totalPages = pdfDoc.getPageCount();
  const validIndices = indicesToKeep.filter((idx) => idx >= 0 && idx < totalPages);
  
  if (validIndices.length === 0) {
    throw new Error('No valid pages selected for extraction.');
  }

  // Option 1: Extract each page as a separate PDF and bundle in ZIP
  if (options.splitSeparate) {
    const zip = new JSZip();
    const baseName = file.name.replace(/\.[^.]+$/, '');

    for (let i = 0; i < validIndices.length; i++) {
      const pageIdx = validIndices[i];
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(pdfDoc, [pageIdx]);
      singleDoc.addPage(copiedPage);
      const singleBytes = await singleDoc.save();
      zip.file(`${baseName}_page_${pageIdx + 1}.pdf`, singleBytes);

      if (onProgress) {
        onProgress(50 + Math.round(((i + 1) / validIndices.length) * 40));
      }
    }

    if (onProgress) onProgress(95);
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    if (onProgress) onProgress(100);
    return zipBlob;
  }

  // Option 2: Combine selected pages into one single PDF document
  const newPdfDoc = await PDFDocument.create();
  const copiedPages = await newPdfDoc.copyPages(pdfDoc, validIndices);
  copiedPages.forEach((page) => newPdfDoc.addPage(page));

  if (onProgress) onProgress(85);
  const savedBytes = await newPdfDoc.save();
  if (onProgress) onProgress(100);
  
  return new Blob([savedBytes], { type: 'application/pdf' });
}

