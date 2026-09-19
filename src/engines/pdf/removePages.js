import { PDFDocument } from 'pdf-lib';
import { cleanAndRefitDocument } from './cleanAndRefitPage.js';

/**
 * Remove specified pages from a PDF.
 * @param {File} file - The uploaded PDF file.
 * @param {number[]} indicesToRemove - 0-indexed page numbers to remove.
 * @param {function} onProgress - Progress reporting callback.
 * @param {object} [options] - Optional processing options including smartCrop
 * @returns {Promise<Blob>} The processed PDF blob.
 */
export async function removePages(file, indicesToRemove, onProgress, options = {}) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(35);
  
  let pdfDoc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(60);

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

  // Sort indices in descending order to prevent shifts from corrupting deletions
  const sorted = [...indicesToRemove].sort((a, b) => b - a);
  
  const totalPages = pdfDoc.getPageCount();
  sorted.forEach(idx => {
    if (idx >= 0 && idx < totalPages) {
      pdfDoc.removePage(idx);
    }
  });

  if (onProgress) onProgress(85);
  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  
  return new Blob([savedBytes], { type: 'application/pdf' });
}
