import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Reorder and rotate pages of a PDF document client-side.
 * @param {File} file - The uploaded PDF file.
 * @param {object[]} pageConfigs - Configs array: { originalIndex: number, rotation: number }
 * @param {function} onProgress - Progress reporting callback.
 * @returns {Promise<Blob>} The processed PDF blob.
 */
export async function organizePdf(file, pageConfigs, onProgress) {
  if (onProgress) onProgress(10);
  const bytes = await file.arrayBuffer();
  if (onProgress) onProgress(35);
  
  const pdfDoc = await PDFDocument.load(bytes);
  if (onProgress) onProgress(55);
  
  const newPdfDoc = await PDFDocument.create();
  const indices = pageConfigs.map(cfg => cfg.originalIndex);
  
  const copiedPages = await newPdfDoc.copyPages(pdfDoc, indices);
  
  copiedPages.forEach((page, idx) => {
    const targetRotation = pageConfigs[idx].rotation || 0;
    if (targetRotation !== 0) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + targetRotation));
    }
    newPdfDoc.addPage(page);
    if (onProgress) {
      onProgress(Math.round(55 + ((idx + 1) / copiedPages.length) * 40));
    }
  });
  
  const savedBytes = await newPdfDoc.save();
  if (onProgress) onProgress(100);
  
  return new Blob([savedBytes], { type: 'application/pdf' });
}
