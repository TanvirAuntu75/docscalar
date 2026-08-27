import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Reorder and rotate pages of one or more PDF documents Client Side.
 * @param {File[]} files - The uploaded PDF files array.
 * @param {object[]} pageConfigs - Configs array: { fileIndex: number, originalIndex: number, rotation: number }
 * @param {function} onProgress - Progress reporting callback.
 * @returns {Promise<Blob>} The processed PDF blob.
 */
export async function organizePdf(files, pageConfigs, onProgress) {
  if (onProgress) onProgress(10);
  
  // Load all source PDFs
  const pdfDocs = await Promise.all(files.map(async (f) => {
    const bytes = await f.arrayBuffer();
    return await PDFDocument.load(bytes);
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
