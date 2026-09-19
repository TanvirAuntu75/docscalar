import { PDFDocument, degrees } from 'pdf-lib';
import { cleanAndRefitDocument } from './cleanAndRefitPage.js';

/**
 * Reorder and rotate pages of one or more PDF documents Client Side.
 * @param {File[]} files - The uploaded PDF files array.
 * @param {object[]} pageConfigs - Configs array: { fileIndex: number, originalIndex: number, rotation: number }
 * @param {function} onProgress - Progress reporting callback.
 * @param {object} [options] - Optional processing options including smartCrop
 * @returns {Promise<Blob>} The processed PDF blob.
 */
export async function organizePdf(files, pageConfigs, onProgress, options = {}) {
  if (onProgress) onProgress(10);
  
  // Load all source PDFs
  const pdfDocs = await Promise.all(files.map(async (f, fIdx) => {
    const bytes = await f.arrayBuffer();
    let doc = await PDFDocument.load(bytes);

    // VisionClean: Universal Smart Cropping (Auto-Crop Black Scan Borders & Refit Dimensions)
    if (options && (options.autoCropBlackBorders || options.smartCrop)) {
      const targetCropBoxes = (options.fileCropBoxes && options.fileCropBoxes[fIdx]) ||
        (options.docCropBoxes && (options.docCropBoxes[fIdx] || options.docCropBoxes[f.name])) ||
        options.pageCropBoxes ||
        (options.docCropBox ? { 0: options.docCropBox } : {});
      const hasAnyScanBorders = Object.values(targetCropBoxes).some(
        (b) => b && b.hasBlackBorders === true && (b.cropTop > 0 || b.cropBottom > 0 || b.cropLeft > 0 || b.cropRight > 0)
      );
      if (hasAnyScanBorders) {
        doc = await cleanAndRefitDocument(doc, targetCropBoxes, {
          margin: options.cleanMargin ?? 0,
          enabledEdges: options.enabledEdges || { top: true, bottom: true, left: true, right: true }
        });
      }
    }
    return doc;
  }));

  if (onProgress) onProgress(40);
  
  const newPdfDoc = await PDFDocument.create();
  
  // Process pages one by one to support inter-leaving from different files
  for (let i = 0; i < pageConfigs.length; i++) {
    const config = pageConfigs[i];
    const sourceDoc = pdfDocs[config.fileIndex];
    
    if (config.isBlank) {
      newPdfDoc.addPage([595.27, 841.89]);
    } else {
      const sourceDoc = pdfDocs[config.fileIndex];
      if (sourceDoc) {
        // Copy the single page
        const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [config.originalIndex]);
        
        // Apply rotation
        const targetRotation = config.rotation || 0;
        if (targetRotation !== 0) {
          const currentRotation = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((currentRotation + targetRotation + 360) % 360));
        }
        
        newPdfDoc.addPage(copiedPage);
      }
    }
    
    if (onProgress) {
      onProgress(Math.round(40 + ((i + 1) / pageConfigs.length) * 55));
    }
  }
  
  const savedBytes = await newPdfDoc.save();
  if (onProgress) onProgress(100);
  
  return new Blob([savedBytes], { type: 'application/pdf' });
}
