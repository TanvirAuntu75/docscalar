/* Web Worker for PDF and Image Conversion Operations */
// Polyfill document for environments without DOM (like Web Workers)
if (typeof self !== 'undefined' && !self.document) {
  self.document = {
    createElement: (tagName) => {
      if (tagName === 'canvas') {
        return new OffscreenCanvas(1, 1);
      }
      return null;
    }
  };
}

import { PDFDocument, degrees, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

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
        const { imageFiles, options } = payload;
        const buffer = await handleImageToPdf(imageFiles, options || {});
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
      case 'unOcrPdf': {
        const { arrayBuffer, options } = payload;
        const buffer = await handleUnOcrPdf(arrayBuffer, options || {});
        result = { pdfBuffer: buffer };
        transferables = [buffer];
        break;
      }
      case 'redactPdf': {
        const { arrayBuffer, params } = payload;
        const buffer = await handleRedactPdf(arrayBuffer, params);
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
  const blobs = [];
  const names = [];

  if (mode === 'equal-intervals') {
    const interval = parseInt(range) || 1;
    let chunkIndex = 0;
    for (let i = 0; i < totalPages; i += interval) {
      const end = Math.min(i + interval, totalPages);
      const indices = Array.from({ length: end - i }, (_, k) => i + k);
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, indices);
      copiedPages.forEach(p => newDoc.addPage(p));
      const pdfBytes = await newDoc.save();
      blobs.push({ arrayBuffer: pdfBytes.buffer, type: 'application/pdf' });
      names.push(`part-${chunkIndex + 1}.pdf`);
      chunkIndex++;
      self.postMessage({ type: 'progress', progress: Math.round((end / totalPages) * 100) });
    }
  } else if (mode === 'by-bookmarks') {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
    const outline = await pdf.getOutline();
    if (!outline || outline.length === 0) {
      pdf.destroy();
      throw new Error('This PDF does not contain outline bookmarks.');
    }

    const splitPageIndices = new Set();
    async function traverseOutline(nodes) {
      if (!nodes) return;
      for (const node of nodes) {
        if (node.dest) {
          try {
            let pageIndex = -1;
            if (typeof node.dest === 'string') {
              const destRef = await pdf.getDestination(node.dest);
              if (destRef) {
                pageIndex = await pdf.getPageIndex(destRef[0]);
              }
            } else if (Array.isArray(node.dest)) {
              pageIndex = await pdf.getPageIndex(node.dest[0]);
            }
            if (pageIndex >= 0 && pageIndex < totalPages) {
              splitPageIndices.add(pageIndex);
            }
          } catch (e) {
            console.error('Failed to resolve bookmark destination:', e);
          }
        }
        if (node.items && node.items.length > 0) {
          await traverseOutline(node.items);
        }
      }
    }
    await traverseOutline(outline);
    pdf.destroy();

    const sortedSplits = Array.from(splitPageIndices).sort((a, b) => a - b);
    const boundaries = sortedSplits.filter(idx => idx > 0);
    boundaries.push(totalPages);

    let prev = 0;
    for (let idx = 0; idx < boundaries.length; idx++) {
      const boundary = boundaries[idx];
      const indices = Array.from({ length: boundary - prev }, (_, k) => prev + k);
      prev = boundary;
      if (indices.length > 0) {
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(srcDoc, indices);
        copiedPages.forEach(p => newDoc.addPage(p));
        const pdfBytes = await newDoc.save();
        blobs.push({ arrayBuffer: pdfBytes.buffer, type: 'application/pdf' });
        names.push(`chapter-${idx + 1}.pdf`);
        self.postMessage({ type: 'progress', progress: Math.round(((idx + 1) / boundaries.length) * 100) });
      }
    }
  } else if (mode === 'by-blank-page') {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
    const blankPageIndices = [];
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.2 });
      const canvas = new OffscreenCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      await page.render({ canvasContext: ctx, viewport }).promise;
      
      const imgData = ctx.getImageData(0, 0, viewport.width, viewport.height).data;
      
      let diffSum = 0;
      const r0 = imgData[0];
      const g0 = imgData[1];
      const b0 = imgData[2];
      const len = imgData.length;
      const step = 40;
      let samples = 0;
      for (let k = 0; k < len; k += step) {
        const r = imgData[k];
        const g = imgData[k + 1];
        const b = imgData[k + 2];
        diffSum += Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0);
        samples++;
      }
      const avgDiff = diffSum / samples;
      if (avgDiff < 8) {
        blankPageIndices.push(i - 1);
      }
      self.postMessage({ type: 'progress', progress: Math.round((i / totalPages) * 50) });
    }
    pdf.destroy();

    let startIdx = 0;
    let chunkCount = 1;
    for (let i = 0; i <= totalPages; i++) {
      if (blankPageIndices.includes(i) || i === totalPages) {
        const indices = Array.from({ length: i - startIdx }, (_, k) => startIdx + k);
        if (indices.length > 0) {
          const newDoc = await PDFDocument.create();
          const copiedPages = await newDoc.copyPages(srcDoc, indices);
          copiedPages.forEach(p => newDoc.addPage(p));
          const pdfBytes = await newDoc.save();
          blobs.push({ arrayBuffer: pdfBytes.buffer, type: 'application/pdf' });
          names.push(`part-${chunkCount}.pdf`);
          chunkCount++;
        }
        startIdx = i + 1; // Skip blank page
        self.postMessage({ type: 'progress', progress: 50 + Math.round((i / totalPages) * 50) });
      }
    }
  } else {
    let pageIndices;
    if (mode === 'range' && range.trim()) {
      pageIndices = parseRange(range, totalPages);
    } else {
      pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    }
    
    for (let i = 0; i < pageIndices.length; i++) {
      const newDoc = await PDFDocument.create();
      const [page] = await newDoc.copyPages(srcDoc, [pageIndices[i]]);
      newDoc.addPage(page);
      const pdfBytes = await newDoc.save();
      
      blobs.push({ arrayBuffer: pdfBytes.buffer, type: 'application/pdf' });
      names.push(`page-${pageIndices[i] + 1}.pdf`);
      
      self.postMessage({ type: 'progress', progress: Math.round(((i + 1) / pageIndices.length) * 100) });
    }
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
// Worker-safe pixel-level document enhancement (ctx.filter is NOT reliable in OffscreenCanvas workers)
// Applies contrast boost and slight brightness/desaturation pass without CSS filter API.
function applyDocumentEnhance(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const contrast = 1.25;   // Boost contrast
  const brightness = 13;   // Additive brightness (0-255 scale)
  const factor = (259 * (contrast * 255 - 255)) / (255 * (259 - (contrast * 255 - 255)));

  for (let i = 0; i < data.length; i += 4) {
    // Apply brightness + contrast to R, G, B channels
    data[i]     = Math.min(255, Math.max(0, factor * (data[i]     - 128) + 128 + brightness));
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128 + brightness));
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128 + brightness));
    // Alpha channel (i + 3) left unchanged
  }
  ctx.putImageData(imageData, 0, 0);
}

async function handleImageToPdf(imageFiles, options = {}) {
  const pdfDoc = await PDFDocument.create();
  const { pageSize = 'fit', orientation = 'portrait', margin = 0 } = options;

  for (let i = 0; i < imageFiles.length; i++) {
    const { arrayBuffer, type, rotation = 0 } = imageFiles[i];
    const uint8 = new Uint8Array(arrayBuffer);
    
    let image;
    const lowerType = type.toLowerCase();
    
    const shouldRenderCanvas = rotation > 0 || options.autoEnhance || !(lowerType === 'image/png' || lowerType === 'image/jpeg' || lowerType === 'image/jpg');

    if (shouldRenderCanvas) {
      const blob = new Blob([uint8], { type });
      const bitmap = await createImageBitmap(blob);
      
      const isSideways = rotation === 90 || rotation === 270;
      const canvasWidth = isSideways ? bitmap.height : bitmap.width;
      const canvasHeight = isSideways ? bitmap.width : bitmap.height;
      
      const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
      
      // Reset transform before getImageData (pixel reads are always in axis-aligned space)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (options.autoEnhance) {
        // Worker-safe pixel-level enhancement (CSS ctx.filter is NOT supported in OffscreenCanvas workers)
        applyDocumentEnhance(ctx, canvasWidth, canvasHeight);
      }
      
      const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
      image = await pdfDoc.embedJpg(jpegBytes);
      
      bitmap.close();
    } else if (lowerType === 'image/png') {
      image = await pdfDoc.embedPng(uint8);
    } else if (lowerType === 'image/jpeg' || lowerType === 'image/jpg') {
      image = await pdfDoc.embedJpg(uint8);
    }
    
    let pageWidth = image.width;
    let pageHeight = image.height;
    
    if (pageSize === 'a4') {
      pageWidth = orientation === 'portrait' ? 595.27 : 841.89;
      pageHeight = orientation === 'portrait' ? 841.89 : 595.27;
    } else if (pageSize === 'letter') {
      pageWidth = orientation === 'portrait' ? 612 : 792;
      pageHeight = orientation === 'portrait' ? 792 : 612;
    }
    
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    
    const drawX = margin + (maxW - drawW) / 2;
    const drawY = margin + (maxH - drawH) / 2;
    
    page.drawImage(image, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH
    });
    
    self.postMessage({ type: 'progress', progress: Math.round(((i + 1) / imageFiles.length) * 100) });
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer;
}

// 5. PDF to Images logic (with High-DPI Rendering support)
async function handlePdfToImages(arrayBuffer, options) {
  const { format = 'png', quality = 0.92, scale = 2, pagesToConvert = null } = options;
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
  const totalPages = pdf.numPages;
  
  const targetPages = pagesToConvert || Array.from({ length: totalPages }, (_, i) => i + 1);
  
  if (targetPages.length > 100) {
    throw new Error(`Attempting to convert ${targetPages.length.toLocaleString()} pages. In-browser conversion to images is limited to 100 pages to prevent memory crashes. Please convert fewer pages or use Direct Folder Export.`);
  }
  
  const blobs = [];
  const names = [];
  
  for (let idx = 0; idx < targetPages.length; idx++) {
    const i = targetPages[idx];
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    // Setup OffscreenCanvas
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    if (options.autoEnhance) {
      applyDocumentEnhance(ctx, viewport.width, viewport.height);
    }
    
    const blob = await canvas.convertToBlob({ type: mimeType, quality });
    const buffer = await blob.arrayBuffer();
    
    blobs.push({ arrayBuffer: buffer, type: blob.type });
    names.push(`page-${i}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    
    self.postMessage({ type: 'progress', progress: Math.round(((idx + 1) / targetPages.length) * 100) });
  }
  
  pdf.destroy();
  return { blobs, names };
}

// 6. Compress PDF logic
async function handleCompressPdf(arrayBuffer, options) {
  const { mode = 'lossy', quality = 0.6, scale = 1.5 } = options;

  if (mode === 'lossless') {
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
    return pdfBytes.buffer;
  }
  
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
    
    if (options.autoEnhance) {
      applyDocumentEnhance(ctx, viewport.width, viewport.height);
    }
    
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

// 7. Un-OCR PDF logic — flattens the PDF by converting pages to images, destroying searchable layers
async function handleUnOcrPdf(arrayBuffer, options = {}) {
  const { scale = 2.0, quality = 0.92 } = options;
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
  const totalPages = pdf.numPages;
  
  if (totalPages > 100) {
    throw new Error(`This PDF contains ${totalPages.toLocaleString()} pages. In-browser Un-OCR is limited to 100 pages to prevent memory crashes. Please split the PDF into smaller parts first.`);
  }
  
  const newDoc = await PDFDocument.create();
  
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');
    
    // Fill white background (no alpha)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    if (options.autoEnhance) {
      applyDocumentEnhance(ctx, viewport.width, viewport.height);
    }
    
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

// 8. Streaming PDF to Images — renders and streams one page at a time
// Active memory stays ~constant regardless of total page count
async function handlePdfToImagesStream(arrayBuffer, options) {
  const { format = 'png', quality = 0.92, scale = 2, maxPages = null, pagesToConvert = null } = options;
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
  const totalPages = pdf.numPages;

  const targetPages = pagesToConvert || Array.from({ length: totalPages }, (_, i) => i + 1);

  // Enforce page cap (e.g. batch queue passes maxPages: 200)
  if (maxPages !== null && targetPages.length > maxPages) {
    pdf.destroy();
    throw new Error(
      `Attempting to convert ${targetPages.length.toLocaleString()} pages. ` +
      `The batch queue supports up to ${maxPages} pages (ZIP output). ` +
      `For large PDFs, use the dedicated PDF to Images tool — it saves pages directly to a folder with no size limit.`
    );
  }

  // Send the total count first so the main thread can prepare the progress bar
  self.postMessage({ type: 'pageCount', totalPages: targetPages.length });

  for (let idx = 0; idx < targetPages.length; idx++) {
    const i = targetPages[idx];
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    if (options.autoEnhance) {
      applyDocumentEnhance(ctx, viewport.width, viewport.height);
    }

    const blob = await canvas.convertToBlob({ type: mimeType, quality });
    const buffer = await blob.arrayBuffer();

    // Transfer the buffer — zero-copy move, worker no longer holds it
    self.postMessage(
      {
        type: 'page',
        pageIndex: idx + 1,
        totalPages: targetPages.length,
        name: `page-${i}.${ext}`,
        mimeType: blob.type,
        buffer,
        progress: Math.round(((idx + 1) / targetPages.length) * 100),
      },
      [buffer]   // transferable — releases buffer from worker memory immediately
    );

    // Explicitly release canvas memory before next iteration
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    page.cleanup();
  }

  pdf.destroy();
}

// 8. Redact PDF logic
const REDACT_PATTERNS = {
  phone: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
};

async function handleRedactPdf(arrayBuffer, params = {}) {
  const { boxes = [], textPatterns = [] } = params;

  // Load via pdfjs for text extraction
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(), disableWorker: true }).promise;

  // Resolve text-pattern boxes per page
  const patternBoxes = [...boxes];
  
  for (let i = 0; i < pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i + 1);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    for (const pattern of textPatterns) {
      const regex = pattern.type === 'literal'
        ? new RegExp(pattern.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        : REDACT_PATTERNS[pattern.type];
      
      if (!regex) continue;

      for (const item of textContent.items) {
        if (regex.test(item.str)) {
          // Transform PDF coords to pdf-lib coords
          const [, , , , tx, ty] = item.transform;
          
          patternBoxes.push({
            page: i,
            x: tx,
            y: ty,
            width: item.width,
            height: item.height || 12,
          });
        }
        regex.lastIndex = 0; // reset stateful regex
      }
    }
    
    page.cleanup();
    self.postMessage({ type: 'progress', progress: Math.round(((i + 1) / (pdfDoc.numPages * 2)) * 100) });
  }
  
  pdfDoc.destroy();

  // Apply redaction rectangles via pdf-lib
  const pdfLibDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfLibDoc.getPages();

  for (let idx = 0; idx < patternBoxes.length; idx++) {
    const box = patternBoxes[idx];
    const page = pages[box.page];
    if (!page) continue;
    
    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    let rx = box.x;
    let ry = box.y;
    let rw = box.width;
    let rh = box.height;
    
    // User-drawn coordinates are relative ratios (0..1, top-left origin)
    // Pattern-extracted coordinates are absolute points (bottom-left origin)
    if (box.isRatio || (box.x >= 0 && box.x <= 1 && box.y >= 0 && box.y <= 1 && box.width <= 1 && box.height <= 1)) {
      rx = box.x * pageWidth;
      ry = (1 - box.y - box.height) * pageHeight;
      rw = box.width * pageWidth;
      rh = box.height * pageHeight;
    }
    
    // Draw black rectangle over bounds
    page.drawRectangle({
      x: rx - 2, 
      y: ry - 2,
      width: rw + 4, 
      height: rh + 4,
      color: rgb(0, 0, 0),
      opacity: 1.0,
    });
    
    self.postMessage({ 
      type: 'progress', 
      progress: 50 + Math.round(((idx + 1) / patternBoxes.length) * 50) 
    });
  }

  const pdfBytes = await pdfLibDoc.save();
  return pdfBytes.buffer;
}

