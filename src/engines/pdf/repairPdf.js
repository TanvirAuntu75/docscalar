import { PDFDocument } from 'pdf-lib';

/**
 * Re-indexes a corrupted PDF document's cross-reference table (XREF).
 * Re-serializes object streams Client Side to output a clean compliant file.
 * @param {File|Blob|ArrayBuffer} file - The corrupted PDF file.
 * @param {object} options - Repair configuration options.
 * @param {function} onProgress - Progress callback.
 * @returns {Promise<{blob: Blob, pageCount: number, originalSize: number, repairedSize: number, strategy: string}>}
 */
export async function repairPdf(file, options = {}, onProgress = null) {
  if (onProgress) onProgress(10);
  
  let arrayBuffer;
  let originalSize = 0;
  if (file instanceof ArrayBuffer) {
    arrayBuffer = file;
    originalSize = arrayBuffer.byteLength;
  } else if (file instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(file))) {
    arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    originalSize = file.byteLength;
  } else if (file && typeof file.arrayBuffer === 'function') {
    arrayBuffer = await file.arrayBuffer();
    originalSize = file.size || arrayBuffer.byteLength;
  } else {
    throw new Error('Invalid file input for PDF repair.');
  }

  if (onProgress) onProgress(30);

  const { mode = 'standard', stripCorruptMetadata = true } = options;

  let repairedDoc;
  let strategyUsed = 'Standard XREF Re-indexing';

  try {
    if (mode === 'deep') {
      strategyUsed = 'Deep Object Stream Reconstruction';
      // Load source with maximum tolerance
      const sourceDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        updateMetadata: false
      });

      if (onProgress) onProgress(55);

      // Create a fresh clean PDFDocument and copy pages
      repairedDoc = await PDFDocument.create();
      const pageCount = sourceDoc.getPageCount();
      const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
      
      const copiedPages = await repairedDoc.copyPages(sourceDoc, pageIndices);
      copiedPages.forEach((page) => repairedDoc.addPage(page));

      if (stripCorruptMetadata) {
        repairedDoc.setTitle(sourceDoc.getTitle() || '');
        repairedDoc.setProducer('DocForge Enterprise PDF Repair Engine');
      }
    } else {
      // Standard fast XREF & object re-serialization
      repairedDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false
      });

      if (onProgress) onProgress(65);

      if (stripCorruptMetadata) {
        repairedDoc.setProducer('DocForge Enterprise PDF Repair Engine');
      }
    }
  } catch (err) {
    // Fallback strategy: Direct load with zero object strictness
    strategyUsed = 'Emergency Binary Recovery';
    if (onProgress) onProgress(50);
    
    repairedDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false
    });
  }

  if (onProgress) onProgress(85);

  const savedBytes = await repairedDoc.save({
    useObjectStreams: false, // Write standard object tables for maximum reader compliance
    addDefaultPage: false
  });

  if (onProgress) onProgress(100);

  const outputBlob = new Blob([savedBytes], { type: 'application/pdf' });

  return {
    blob: outputBlob,
    pageCount: repairedDoc.getPageCount(),
    originalSize,
    repairedSize: outputBlob.size,
    strategy: strategyUsed
  };
}
