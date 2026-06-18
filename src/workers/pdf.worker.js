/* Web Worker for PDF and Image Conversion Operations */
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Set up event listener for the worker
self.onmessage = async (e) => {
  const { type, payload } = e.data;
  
  try {
    let result;
    let transferables = [];

    switch (type) {
      case 'mergePdfs': {
        const { pdfBuffers } = payload;
        const buffer = await handleMergePdfs(pdfBuffers);
        result = { pdfBuffer: buffer };
        transferables = [buffer];
        break;
      }
      case 'splitPdf': {
        const { arrayBuffer, mode, range } = payload;
        const { blobs, names } = await handleSplitPdf(arrayBuffer, mode, range);
        result = { 
          blobs: blobs.map(b => ({ arrayBuffer: b.arrayBuffer, type: b.type })), 
          names 
        };
        transferables = blobs.map(b => b.arrayBuffer);
        break;
      }
      case 'rotatePdf': {
        const { arrayBuffer, rotations } = payload;
        const buffer = await handleRotatePdf(arrayBuffer, rotations);
        result = { pdfBuffer: buffer };
        transferables = [buffer];
        break;
      }
      case 'imageToPdf': {
        const { imageFiles } = payload;
        const buffer = await handleImageToPdf(imageFiles);
        result = { pdfBuffer: buffer };
        transferables = [buffer];
        break;
      }
      case 'pdfToImages': {
        const { arrayBuffer, options } = payload;
        const { blobs, names } = await handlePdfToImages(arrayBuffer, options);
        result = { 
          blobs: blobs.map(b => ({ arrayBuffer: b.arrayBuffer, type: b.type })), 
          names 
        };
        transferables = blobs.map(b => b.arrayBuffer);
        break;
      }
      case 'pdfToImagesStream': {
        // Streaming mode — pages are sent one-by-one, no giant array ever built
        const { arrayBuffer, options } = payload;
        await handlePdfToImagesStream(arrayBuffer, options);
        // Final success signal (no result payload needed — pages already sent)
        self.postMessage({ type: 'success', result: { done: true } });
        return; // skip the generic postMessage below
      }
      case 'compressPdf': {
        const { arrayBuffer, options } = payload;
        const buffer = await handleCompressPdf(arrayBuffer, options);
        result = { pdfBuffer: buffer };
        transferables = [buffer];
        break;
      }
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }

    self.postMessage({ type: 'success', result }, transferables);
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message || 'Operation failed' });
  }
};

// 1. Merge PDFs logic
async function handleMergePdfs(pdfBuffers) {
  const mergedDoc = await PDFDocument.create();
  
  for (let i = 0; i < pdfBuffers.length; i++) {
    const srcDoc = await PDFDocument.load(pdfBuffers[i]);
    const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    pages.forEach((page) => mergedDoc.addPage(page));
    
    self.postMessage({ type: 'progress', progress: Math.round(((i + 1) / pdfBuffers.length) * 100) });
  }
  
  const pdfBytes = await mergedDoc.save();
  return pdfBytes.buffer;
}

// 2. Split PDF logic
async function handleSplitPdf(arrayBuffer, mode, range) {
  const srcDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = srcDoc.getPageCount();
  
  let pageIndices;
  if (mode === 'range' && range.trim()) {
    pageIndices = parseRange(range, totalPages);
  } else {
    pageIndices = Array.from({ length: totalPages }, (_, i) => i);
  }
  
  // In both 'all' and 'range' mode, split the matching pages into separate PDFs
  const blobs = [];
  const names = [];
  for (let i = 0; i < pageIndices.length; i++) {
    const newDoc = await PDFDocument.create();
    const [page] = await newDoc.copyPages(srcDoc, [pageIndices[i]]);
    newDoc.addPage(page);
    const pdfBytes = await newDoc.save();
    
    blobs.push({ arrayBuffer: pdfBytes.buffer, type: 'application/pdf' });
    names.push(`page-${pageIndices[i] + 1}.pdf`);

    self.postMessage({ type: 'progress', progress: Math.round(((i + 1) / pageIndices.length) * 100) });
  }
  return { blobs, names };
}

// Helper to parse page range strings (e.g. "1-3,5,7-9")
function parseRange(rangeStr, max) {
  const indices = new Set();
  if (!rangeStr || !rangeStr.trim()) return [];

  const parts = rangeStr.split(',').map((s) => s.trim());
  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const sides = part.split('-');
      if (sides.length !== 2) continue;
      
      const startVal = sides[0].trim();
      const endVal = sides[1].trim();

      const start = startVal === '' ? 1 : Number(startVal);
      const end = endVal === '' ? max : Number(endVal);

      if (isNaN(start) || isNaN(end) || !Number.isInteger(start) || !Number.isInteger(end) || start > end || start < 1 || end < 1) continue;

      for (let i = Math.max(1, start); i <= Math.min(max, end); i++) {
        indices.add(i - 1);
      }
    } else {
      const n = Number(part);
      if (Number.isInteger(n) && n >= 1 && n <= max) {
        indices.add(n - 1);
      }
    }
  }
  return Array.from(indices).sort((a, b) => a - b);
}

// 3. Rotate PDF logic
async function handleRotatePdf(arrayBuffer, rotations) {
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  
  pages.forEach((page, i) => {
    const currentRotation = page.getRotation().angle;
    const rotationAmount = Array.isArray(rotations) ? (rotations[i] || 0) : rotations;
    page.setRotation(degrees(currentRotation + rotationAmount));
    self.postMessage({ type: 'progress', progress: Math.round(((i + 1) / pages.length) * 100) });
  });
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer;
}

// 4. Images to PDF logic
async function handleImageToPdf(imageFiles) {
  const pdfDoc = await PDFDocument.create();
  
  for (let i = 0; i < imageFiles.length; i++) {
    const { arrayBuffer, type } = imageFiles[i];
    const uint8 = new Uint8Array(arrayBuffer);
    
    let image;
    const lowerType = type.toLowerCase();
    
    if (lowerType === 'image/png') {
      image = await pdfDoc.embedPng(uint8);
    } else if (lowerType === 'image/jpeg' || lowerType === 'image/jpg') {
      image = await pdfDoc.embedJpg(uint8);
    } else {
      // Decode other images (like webp, gif, bmp) using createImageBitmap
      const blob = new Blob([uint8], { type });
      const bitmap = await createImageBitmap(blob);
      
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      
      const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
      image = await pdfDoc.embedJpg(jpegBytes);
      
      bitmap.close();
    }
    
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    
    self.postMessage({ type: 'progress', progress: Math.round(((i + 1) / imageFiles.length) * 100) });
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer;
}

// 5. PDF to Images logic (with High-DPI Rendering support)
async function handlePdfToImages(arrayBuffer, options) {
  const { format = 'png', quality = 0.92, scale = 2 } = options;
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
  const totalPages = pdf.numPages;
  
  if (totalPages > 100) {
    throw new Error(`This PDF contains ${totalPages.toLocaleString()} pages. In-browser conversion to images is limited to 100 pages to prevent memory crashes. Please split the PDF into smaller parts first.`);
  }
  
  const blobs = [];
  const names = [];
  
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    // Setup OffscreenCanvas
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const blob = await canvas.convertToBlob({ type: mimeType, quality });
    const buffer = await blob.arrayBuffer();
    
    blobs.push({ arrayBuffer: buffer, type: blob.type });
    names.push(`page-${i}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    
    self.postMessage({ type: 'progress', progress: Math.round((i / totalPages) * 100) });
  }
  
  pdf.destroy();
  return { blobs, names };
}

// 6. Compress PDF logic
async function handleCompressPdf(arrayBuffer, options) {
  const { quality = 0.6, scale = 1.5 } = options;
  
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
  const totalPages = pdf.numPages;
  
  if (totalPages > 100) {
    throw new Error(`This PDF contains ${totalPages.toLocaleString()} pages. In-browser compression is limited to 100 pages to prevent memory crashes. Please split the PDF into smaller parts first.`);
  }
  
  const newDoc = await PDFDocument.create();
  
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    const jpegBytes = new Uint8Array(await blob.arrayBuffer());
    
    const image = await newDoc.embedJpg(jpegBytes);
    const newPage = newDoc.addPage([image.width, image.height]);
    newPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    
    self.postMessage({ type: 'progress', progress: Math.round((i / totalPages) * 100) });
  }
  
  pdf.destroy();
  const pdfBytes = await newDoc.save();
  return pdfBytes.buffer;
}

// 7. Streaming PDF to Images — renders and streams one page at a time
// Active memory stays ~constant regardless of total page count
async function handlePdfToImagesStream(arrayBuffer, options) {
  const { format = 'png', quality = 0.92, scale = 2, maxPages = null } = options;
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
  const totalPages = pdf.numPages;

  // Enforce page cap (e.g. batch queue passes maxPages: 200)
  if (maxPages !== null && totalPages > maxPages) {
    pdf.destroy();
    throw new Error(
      `This PDF has ${totalPages.toLocaleString()} pages. ` +
      `The batch queue supports up to ${maxPages} pages (ZIP output). ` +
      `For large PDFs, use the dedicated PDF to Images tool — it saves pages directly to a folder with no size limit.`
    );
  }

  // Send the total count first so the main thread can prepare the progress bar
  self.postMessage({ type: 'pageCount', totalPages });

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await canvas.convertToBlob({ type: mimeType, quality });
    const buffer = await blob.arrayBuffer();

    // Transfer the buffer — zero-copy move, worker no longer holds it
    self.postMessage(
      {
        type: 'page',
        pageIndex: i,
        totalPages,
        name: `page-${i}.${ext}`,
        mimeType: blob.type,
        buffer,
        progress: Math.round((i / totalPages) * 100),
      },
      [buffer]   // transferable — releases buffer from worker memory immediately
    );

    // Explicitly release canvas memory before next iteration
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    page.cleanup();
  }

  pdf.destroy();
}
