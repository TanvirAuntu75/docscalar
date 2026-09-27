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

import { PDFDocument, PDFName, degrees, rgb, StandardFonts } from 'pdf-lib';
import { cleanAndRefitDocument } from '../engines/pdf/cleanAndRefitPage.js';
import * as pdfjsLib from 'pdfjs-dist';
import { CMAP_URL, CMAP_PACKED, STANDARD_FONT_DATA_URL, getPdfjsDocParams } from '../utils/pdfConfig.js';
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
        const { pdfBuffers, rotations, options } = payload;
        const buffer = await handleMergePdfs(pdfBuffers, rotations, options);
        result = { pdfBuffer: buffer };
        transferables = [buffer];
        break;
      }
      case 'splitPdf': {
        const { arrayBuffer, mode, range, options } = payload;
        const { blobs, names } = await handleSplitPdf(arrayBuffer, mode, range, options || {});
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
      case 'auditBloat': {
        const { arrayBuffer } = payload;
        const audit = await handleAuditBloat(arrayBuffer);
        result = { audit };
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

// Helper to parse page range strings (e.g. "1-3, 5", "all", "odd", "even") into 0-indexed page indices
function parsePageRangeIndices(rangeStr, totalPages) {
  if (!rangeStr || typeof rangeStr !== 'string' || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, k) => k);
  }
  const clean = rangeStr.trim().toLowerCase();
  if (clean === 'odd') {
    return Array.from({ length: totalPages }, (_, k) => k).filter(idx => idx % 2 === 0);
  }
  if (clean === 'even') {
    return Array.from({ length: totalPages }, (_, k) => k).filter(idx => idx % 2 === 1);
  }
  const indices = new Set();
  const parts = clean.split(/[,\s]+/);
  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const s = Math.max(1, Math.min(start, end));
        const e = Math.min(totalPages, Math.max(start, end));
        for (let p = s; p <= e; p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        indices.add(p - 1);
      }
    }
  }
  const sorted = Array.from(indices).sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : Array.from({ length: totalPages }, (_, k) => k);
}

// 1. Merge PDFs logic
async function handleMergePdfs(pdfBuffers, rotations = [], options = {}) {
  const mergedDoc = await PDFDocument.create();
  const totalFiles = pdfBuffers.length;
  const pageRanges = (options && options.pageRanges) || [];
  const fileNames = (options && options.fileNames) || [];
  const normalizePageSize = (options && options.normalizePageSize) || 'none'; // 'none' | 'a4' | 'letter' | 'match-first'
  const addPageNumbers = Boolean(options && options.addPageNumbers);

  let targetNormDimensions = null;
  if (normalizePageSize === 'a4') {
    targetNormDimensions = [595.28, 841.89];
  } else if (normalizePageSize === 'letter') {
    targetNormDimensions = [612.0, 792.0];
  }

  // Phase 1 & 2: Ingest, slice, and transform
  for (let i = 0; i < totalFiles; i++) {
    const fileName = fileNames[i] || `Document ${i + 1}`;
    self.postMessage({
      type: 'progress',
      progress: Math.round((i / totalFiles) * 80),
      stage: `Slicing & preparing ${fileName}...`,
      currentFile: fileName,
      currentIndex: i,
      totalFiles
    });

    let srcDoc = await PDFDocument.load(pdfBuffers[i]);

    // VisionClean: Universal Smart Cropper (Auto-Crop Black Scan Borders & Restore Original Dimensions)
    if (options && (options.autoCropBlackBorders || options.smartCrop)) {
      const isCropEnabledForDoc = options.cropEnabledFiles ? Boolean(options.cropEnabledFiles[i]) : false;
      if (isCropEnabledForDoc) {
        const docCropBox = (options.docCropBoxes && options.docCropBoxes[i]) || null;
        
        // Calculate target page indices for cropping based on cropPageRanges (odd, even, all, or custom)
        let cropPageIndices = null;
        const docCropRange = (options.cropPageRanges && options.cropPageRanges[i]) || options.cropPageScope || 'all';
        const srcTotalPages = srcDoc.getPageCount();

        if (docCropRange && docCropRange !== 'all') {
          cropPageIndices = parsePageRangeIndices(docCropRange, srcTotalPages);
        }

        // Support both multi-page per-file crop boxes and single-page docCropBox
        const fileTargetCropBoxes = (options.pageCropBoxes && options.pageCropBoxes[i]) || (docCropBox ? { 0: docCropBox } : {});
        const hasRealScanBorders = Object.values(fileTargetCropBoxes).some(
          (b) => b && b.hasBlackBorders === true && (b.cropTop > 0 || b.cropBottom > 0 || b.cropLeft > 0 || b.cropRight > 0)
        );

        if (hasRealScanBorders) {
          srcDoc = await cleanAndRefitDocument(srcDoc, fileTargetCropBoxes, {
            margin: options.cleanMargin ?? 0,
            enabledEdges: options.enabledEdges || { top: true, bottom: true, left: true, right: true },
            pageIndices: cropPageIndices
          });
        }
      }
    }

    const srcTotalPages = srcDoc.getPageCount();
    const rot = (rotations && rotations[i]) || 0;

    // Determine target indices to copy for this document
    const customRange = pageRanges[i];
    const targetIndices = parsePageRangeIndices(customRange, srcTotalPages);

    const pages = await mergedDoc.copyPages(srcDoc, targetIndices);

    // If normalize is 'match-first' and this is file 0, record dimensions of page 0
    if (normalizePageSize === 'match-first' && !targetNormDimensions && pages.length > 0) {
      const firstSz = pages[0].getSize();
      targetNormDimensions = [firstSz.width, firstSz.height];
    }

    pages.forEach((page) => {
      // 1. Apply user rotation if any
      if (rot !== 0) {
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees((currentRot + rot + 360) % 360));
      }

      // 2. Apply dimension normalization if requested
      if (targetNormDimensions) {
        const [targetW, targetH] = targetNormDimensions;
        const { width: origW, height: origH } = page.getSize();
        if (Math.abs(origW - targetW) > 1 || Math.abs(origH - targetH) > 1) {
          const scale = Math.min(targetW / origW, targetH / origH);
          const scaledW = origW * scale;
          const scaledH = origH * scale;
          const tx = (targetW - scaledW) / 2;
          const ty = (targetH - scaledH) / 2;
          page.scale(scale, scale);
          page.translateContent(tx, ty);
          page.setSize(targetW, targetH);
          // Synchronize CropBox, BleedBox, TrimBox, and ArtBox with new MediaBox dimensions
          // to prevent PDF viewers from clipping page contents to obsolete dimensions
          if (page.node.CropBox && page.node.CropBox()) {
            page.node.delete(PDFName.of('CropBox'));
          }
          if (page.node.BleedBox && page.node.BleedBox()) {
            page.node.delete(PDFName.of('BleedBox'));
          }
          if (page.node.TrimBox && page.node.TrimBox()) {
            page.node.delete(PDFName.of('TrimBox'));
          }
          if (page.node.ArtBox && page.node.ArtBox()) {
            page.node.delete(PDFName.of('ArtBox'));
          }
        }
      }

      mergedDoc.addPage(page);
    });

    // Blank page separator between documents (for double-sided/duplex printing)
    if (options && options.blankPageSeparator && i < totalFiles - 1) {
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage
        ? lastPage.getSize()
        : (targetNormDimensions ? { width: targetNormDimensions[0], height: targetNormDimensions[1] } : { width: 595.28, height: 841.89 });
      const blankPage = mergedDoc.addPage([width, height]);
      if (lastPage) {
        blankPage.setRotation(lastPage.getRotation());
      }
    }

    self.postMessage({
      type: 'progress',
      progress: Math.round(((i + 1) / totalFiles) * 80),
      stage: `Finished ${fileName} (${pages.length} pages added)`,
      currentFile: fileName,
      currentIndex: i,
      totalFiles
    });
  }

  // Phase 3: Continuous Running Page Numbers (if enabled)
  const totalMergedPages = mergedDoc.getPageCount();
  if (addPageNumbers && totalMergedPages > 0) {
    self.postMessage({
      type: 'progress',
      progress: 88,
      stage: 'Applying running page numbers...',
      totalFiles
    });
    const font = await mergedDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 9;
    for (let pIdx = 0; pIdx < totalMergedPages; pIdx++) {
      const p = mergedDoc.getPage(pIdx);
      const { width: pW, height: pH } = p.getSize();
      const rot = ((p.getRotation().angle % 360) + 360) % 360;
      const isSideways = rot === 90 || rot === 270;
      const vW = isSideways ? pH : pW;
      const vH = isSideways ? pW : pH;
      const numText = `Page ${pIdx + 1} of ${totalMergedPages}`;
      const textW = font.widthOfTextAtSize(numText, fontSize);
      const visualX = (vW - textW) / 2;
      const visualY = vH - 18 - fontSize;

      let nx = visualX;
      let ny = visualY;
      let angle = 0;

      switch (rot) {
        case 0:
          nx = visualX;
          ny = pH - visualY - fontSize;
          angle = 0;
          break;
        case 90:
          nx = visualY;
          ny = visualX + textW;
          angle = 270;
          break;
        case 180:
          nx = pW - visualX;
          ny = visualY + fontSize;
          angle = 180;
          break;
        case 270:
          nx = pW - visualY - fontSize;
          ny = pH - visualX;
          angle = 90;
          break;
        default:
          nx = visualX;
          ny = pH - visualY - fontSize;
          angle = 0;
          break;
      }

      p.drawText(numText, {
        x: nx,
        y: ny,
        size: fontSize,
        font,
        rotate: degrees(angle),
        color: rgb(0.35, 0.35, 0.35)
      });
    }
  }

  self.postMessage({
    type: 'progress',
    progress: 95,
    stage: 'Serializing & compressing merged PDF...',
    totalFiles
  });

  // Preserve & set clean document metadata
  const outputFileName = (options && options.outputFileName) || 'merged.pdf';
  if (outputFileName) {
    const cleanTitle = outputFileName.replace(/\.pdf$/i, '');
    mergedDoc.setTitle(cleanTitle);
  }
  mergedDoc.setProducer('DocScalar Lossless PDF Engine');
  mergedDoc.setCreator('DocScalar Studio');

  const pdfBytes = await mergedDoc.save();

  self.postMessage({
    type: 'progress',
    progress: 100,
    stage: 'Assembly complete!',
    totalFiles
  });

  return pdfBytes.buffer;
}

// 2. Split PDF logic
async function handleSplitPdf(arrayBuffer, mode, range, options = {}) {
  let srcDoc = await PDFDocument.load(arrayBuffer);

  // VisionClean: Universal Smart Cropping (Auto-Crop Black Scan Borders & Restore Original Dimensions)
  if (options && (options.autoCropBlackBorders || options.smartCrop)) {
    const targetCropBoxes = options.pageCropBoxes || options.docCropBoxes || (options.docCropBox ? { 0: options.docCropBox } : {});
    const hasAnyScanBorders = Object.values(targetCropBoxes).some(
      (b) => b && b.hasBlackBorders === true && (b.cropTop > 0 || b.cropBottom > 0 || b.cropLeft > 0 || b.cropRight > 0)
    );

    if (hasAnyScanBorders) {
      srcDoc = await cleanAndRefitDocument(srcDoc, targetCropBoxes, {
        margin: options.cleanMargin ?? 0,
        enabledEdges: options.enabledEdges || { top: true, bottom: true, left: true, right: true }
      });
    }
  }

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
    const pdf = await pdfjsLib.getDocument(getPdfjsDocParams(arrayBuffer, { disableWorker: true })).promise;
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
    const pdf = await pdfjsLib.getDocument(getPdfjsDocParams(arrayBuffer, { disableWorker: true })).promise;
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
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
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
// Whitens paper background, sharpens dark text, and preserves crisp contrast without silver/gray haze.
function applyDocumentEnhance(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const factor = 1.15;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // 1. Paper background whitening: Clean up paper haze, scanner shadows, and near-white noise
    if (lum >= 195 && sat < 35) {
      data[i]     = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      continue;
    }

    // 2. Ink deepening: Dark text, checkboxes, and border strokes
    if (lum < 100) {
      data[i]     = Math.max(0, Math.round(r * 0.85));
      data[i + 1] = Math.max(0, Math.round(g * 0.85));
      data[i + 2] = Math.max(0, Math.round(b * 0.85));
      continue;
    }

    // 3. Midtone contrast boost (preserves soft colors like blue form fills)
    data[i]     = Math.min(255, Math.max(0, Math.round(factor * (r - 128) + 128 + 5)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(factor * (g - 128) + 128 + 5)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(factor * (b - 128) + 128 + 5)));
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
      canvas.width = 0;
      canvas.height = 0;
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
  
  const pdf = await pdfjsLib.getDocument(getPdfjsDocParams(arrayBuffer, { disableWorker: true })).promise;
  const totalPages = pdf.numPages;
  
  const targetPages = pagesToConvert || Array.from({ length: totalPages }, (_, i) => i + 1);
  
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
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();

    if (idx % 10 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }
  
  pdf.destroy();
  return { blobs, names };
}

// 6. Compress PDF logic (Ultra-Grade Selective Image Stream Surgery)
async function handleAuditBloat(arrayBuffer) {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();
  const pageStats = [];
  let totalRasterBytes = 0;
  let totalImageCount = 0;

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    let pageImages = 0;
    let pageImageBytes = 0;

    let resources = page.node.Resources();
    if (!resources && page.node.parent) {
      try {
        const parent = doc.context.lookup(page.node.parent());
        if (parent && typeof parent.Resources === 'function') {
          resources = parent.Resources();
        }
      } catch {}
    }

    if (resources) {
      if (typeof resources.lookup === 'function') {
        resources = resources.lookup(PDFName.of('XObject'));
      }
      if (resources && typeof resources.entries === 'function') {
        for (const [name, ref] of resources.entries()) {
          const obj = doc.context.lookup(ref);
          if (obj && obj.dict) {
            const subtype = obj.dict.lookup(PDFName.of('Subtype'));
            if (subtype === PDFName.of('Image')) {
              pageImages++;
              totalImageCount++;
              if (obj.contents) {
                pageImageBytes += obj.contents.length;
              } else if (typeof obj.getContents === 'function') {
                pageImageBytes += obj.getContents().length;
              } else {
                const w = obj.dict.lookup(PDFName.of('Width'))?.value || 1000;
                const h = obj.dict.lookup(PDFName.of('Height'))?.value || 1000;
                pageImageBytes += Math.round((w * h * 3) / 8);
              }
            }
          }
        }
      }
    }

    const contents = page.node.Contents();
    let contentStreamBytes = 0;
    if (contents) {
      const resolvedContents = doc.context.lookup(contents);
      if (resolvedContents) {
        if (typeof resolvedContents.size === 'function') {
          for (let sIdx = 0; sIdx < resolvedContents.size(); sIdx++) {
            const streamObj = doc.context.lookup(resolvedContents.get(sIdx));
            if (streamObj) {
              if (streamObj.contents) {
                contentStreamBytes += streamObj.contents.length;
              } else if (typeof streamObj.getContents === 'function') {
                contentStreamBytes += streamObj.getContents().length;
              }
            }
          }
        } else if (resolvedContents.contents) {
          contentStreamBytes = resolvedContents.contents.length;
        } else if (typeof resolvedContents.getContents === 'function') {
          contentStreamBytes = resolvedContents.getContents().length;
        }
      }
    }

    const approxBytes = pageImageBytes + contentStreamBytes;
    totalRasterBytes += pageImageBytes;

    pageStats.push({
      pageNumber: i + 1,
      imageCount: pageImages,
      approxBytes,
      imageBytes: pageImageBytes,
      contentStreamBytes,
      isHeavy: false,
      type: pageImages > 0 ? 'image_heavy' : 'vector_clean'
    });
  }

  const avgPageImageBytes = totalPages > 0 ? totalRasterBytes / totalPages : 0;
  const heavyPages = [];
  let heavyRasterBytes = 0;

  for (const stat of pageStats) {
    const isDisproportionate = totalImageCount > 0 && stat.imageCount > 0 && 
      (stat.imageBytes >= 300_000 || 
       (stat.imageBytes >= avgPageImageBytes * 1.5 && stat.imageBytes >= 50_000) ||
       (pageStats.filter(p => p.imageCount > 0).length <= Math.max(1, Math.floor(totalPages * 0.35))));

    if (isDisproportionate) {
      stat.isHeavy = true;
      heavyPages.push(stat.pageNumber);
      heavyRasterBytes += stat.approxBytes;
    }
  }

  const isVectorHeavy = totalImageCount === 0 || totalRasterBytes < 100_000;
  const heavyPagesSharePct = totalRasterBytes > 0 
    ? Math.min(100, Math.round((heavyRasterBytes / totalRasterBytes) * 100))
    : 0;

  return {
    totalPages,
    totalImageCount,
    totalRasterBytes,
    isVectorHeavy,
    heavyPages,
    heavyPagesSharePct,
    pageStats
  };
}

async function handleCompressPdf(arrayBuffer, options = {}) {
  let { mode, quality = 0.6, autoEnhance = false, stripMetadata = true, selectedPages = null, targetSizeBytes } = options;

  // Calibrate quality and dimensions based on setting or target size
  let jpegQuality = quality || 0.65;
  let maxDim = 1400;

  if (targetSizeBytes && targetSizeBytes > 0) {
    const originalSize = arrayBuffer.byteLength;
    const safeTarget = Math.floor(targetSizeBytes * 0.94);
    const ratio = originalSize > 0 ? safeTarget / originalSize : 0.5;

    if (originalSize <= targetSizeBytes) {
      jpegQuality = 0.92;
      maxDim = 2048;
    } else if (ratio >= 0.75) {
      jpegQuality = 0.85;
      maxDim = 1800;
    } else if (ratio >= 0.50) {
      jpegQuality = 0.68;
      maxDim = 1400;
    } else if (ratio >= 0.30) {
      jpegQuality = 0.48;
      maxDim = 1100;
    } else if (ratio >= 0.15) {
      jpegQuality = 0.32;
      maxDim = 900;
    } else {
      jpegQuality = 0.22;
      maxDim = 750;
    }
  } else if (quality <= 0.4 || mode === 'extreme') {
    jpegQuality = 0.38;
    maxDim = 1024;
  } else if (quality >= 0.8 || mode === 'lossless' || mode === 'low') {
    jpegQuality = 0.82;
    maxDim = 2048;
  }

  // Load PDF with pdf-lib for non-destructive object surgery
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Metadata stripping
  if (stripMetadata !== false) {
    try {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('DocScalar Ultra-Compression Engine');
      pdfDoc.setCreator('DocScalar');
    } catch {
      // Ignore metadata failures
    }
  }

  self.postMessage({ type: 'progress', progress: 15 });

  // Scan and re-compress indirect Image XObjects
  const context = pdfDoc.context;
  const indirectObjects = context.enumerateIndirectObjects();

  for (let idx = 0; idx < indirectObjects.length; idx++) {
    const [, obj] = indirectObjects[idx];

    // Check if object is an Image XObject stream
    if (obj && obj.dict && typeof obj.getContents === 'function') {
      const subtype = obj.dict.get(PDFName.of('Subtype'));
      if (subtype && subtype.toString() === '/Image') {
        try {
          const rawContents = obj.getContents();
          if (rawContents && rawContents.length >= 1024) {
            const filter = obj.dict.get(PDFName.of('Filter'))?.toString() || '';
            let mimeType = 'image/jpeg';
            if (filter.includes('FlateDecode')) {
              mimeType = 'image/png';
            }

            let imgBitmap = null;
            try {
              const blob = new Blob([rawContents], { type: mimeType });
              imgBitmap = await self.createImageBitmap(blob);
            } catch {
              try {
                const fallbackBlob = new Blob([rawContents]);
                imgBitmap = await self.createImageBitmap(fallbackBlob);
              } catch {
                imgBitmap = null;
              }
            }

            if (imgBitmap) {
              const origW = imgBitmap.width;
              const origH = imgBitmap.height;

              // Calculate scaled dimensions
              let targetW = origW;
              let targetH = origH;

              if (Math.max(origW, origH) > maxDim) {
                const ratio = maxDim / Math.max(origW, origH);
                targetW = Math.max(16, Math.round(origW * ratio));
                targetH = Math.max(16, Math.round(origH * ratio));
              }

              const canvas = new OffscreenCanvas(targetW, targetH);
              const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, targetW, targetH);
              ctx.drawImage(imgBitmap, 0, 0, targetW, targetH);
              imgBitmap.close();

              if (autoEnhance) {
                applyDocumentEnhance(ctx, targetW, targetH);
              }

              const compressedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: jpegQuality });
              const newBytes = new Uint8Array(await compressedBlob.arrayBuffer());

              // Only update if we achieved tangible compression savings
              if (newBytes.length < rawContents.length) {
                obj.contents = newBytes;
                obj.dict.set(PDFName.of('Width'), context.obj(targetW));
                obj.dict.set(PDFName.of('Height'), context.obj(targetH));
                obj.dict.set(PDFName.of('Length'), context.obj(newBytes.length));
                obj.dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
                obj.dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
                obj.dict.set(PDFName.of('BitsPerComponent'), context.obj(8));
                obj.dict.delete(PDFName.of('DecodeParms'));
              }

              canvas.width = 0;
              canvas.height = 0;
            }
          }
        } catch {
          // Graceful skip of individual image object
        }

        const pct = Math.min(80, 15 + Math.round((idx / indirectObjects.length) * 65));
        self.postMessage({ type: 'progress', progress: pct });
      }
    }
  }

  self.postMessage({ type: 'progress', progress: 85 });

  // If selective page compression requested, assemble merged document in exact sequential order
  const totalPages = pdfDoc.getPageCount();
  if (Array.isArray(selectedPages) && selectedPages.length > 0 && selectedPages.length < totalPages) {
    const selectedSet = new Set(selectedPages.map(Number));
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const mergedDoc = await PDFDocument.create();

    for (let i = 0; i < totalPages; i++) {
      const pageNum = i + 1;
      if (selectedSet.has(pageNum)) {
        const [compPage] = await mergedDoc.copyPages(pdfDoc, [i]);
        mergedDoc.addPage(compPage);
      } else {
        const [origPage] = await mergedDoc.copyPages(srcDoc, [i]);
        mergedDoc.addPage(origPage);
      }
    }

    const pdfBytes = await mergedDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 100
    });

    self.postMessage({ type: 'progress', progress: 100 });
    return pdfBytes.buffer;
  }

  // Save with compressed object streams
  const pdfBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 100
  });

  self.postMessage({ type: 'progress', progress: 100 });
  return pdfBytes.buffer;
}

// 7. Un-OCR PDF — removes text layers while preserving 100% original image quality
async function handleUnOcrPdf(arrayBuffer) {
  // We use a robust "Stream Stripping" strategy.
  // Instead of re-rendering pages or extracting JPEGs (which fails on complex layouts),
  // we decode every content stream in the PDF, physically delete all text operators (BT...ET),
  // and re-compress the streams. This instantly destroys the OCR text layer while preserving
  // 100% of the original images, vectors, and colors exactly as they were in the source file.
  
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const context = pdfDoc.context;
  
  // Create a minimal zip deflater implementation using Web Streams if needed,
  // but wait, pdf-lib's PDFRawStream gets its contents decompressed by getContentsString().
  // Re-compressing it requires pako or similar, which pdf-lib doesn't expose easily on the client.
  // BUT wait, we can just replace the FlateDecode filter with no filter, and store the uncompressed string!
  // This might increase file size, but it's 100% client-side safe.
  
  let streamsProcessed = 0;
  const objects = context.enumerateIndirectObjects();
  
  for (const ref of objects) {
    const obj = ref[1];
    
    // We only care about Raw Streams (which contain page contents or XObject contents)
    if (obj && typeof obj.getContentsString === 'function') {
      try {
        // Skip images and fonts to avoid corrupting binary data
        if (obj.dict) {
          const subtype = obj.dict.get(PDFName.of('Subtype'));
          if (subtype) {
            const subtypeStr = subtype.toString();
            if (subtypeStr !== '/Form') {
              continue; // Only process /Form XObjects or Page Contents (which have no Subtype)
            }
          }
        }

        const allText = obj.getContentsString();
        // If it contains text blocks
        if (allText.includes('BT') && allText.includes('ET')) {
          const strippedText = allText.replace(/BT[\s\S]*?ET/g, '');
          
          if (strippedText.length !== allText.length) {
            // Encode the stripped text back to Uint8Array (latin1 mapping)
            const newBytes = new Uint8Array(strippedText.length);
            for (let i = 0; i < strippedText.length; i++) {
              newBytes[i] = strippedText.charCodeAt(i) & 0xFF;
            }
            
            // Replace the stream contents with UNCOMPRESSED bytes
            obj.contents = newBytes;
            
            // Update the Length dictionary entry
            if (obj.dict) {
              obj.dict.set(PDFName.of('Length'), context.obj(newBytes.length));
              // Remove the FlateDecode filter since it's no longer compressed
              obj.dict.delete(PDFName.of('Filter'));
              obj.dict.delete(PDFName.of('DecodeParms'));
            }
          }
        }
      } catch {
        // Ignore streams that cannot be decoded as text
      }
    }
    
    streamsProcessed++;
    if (streamsProcessed % 50 === 0) {
      // Keep UI responsive during processing
      await new Promise(r => setTimeout(r, 0));
    }
  }

  self.postMessage({ type: 'progress', progress: 90 });
  
  // Save the modified PDF. It will have exactly the original quality, just without any text data.
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  
  self.postMessage({ type: 'progress', progress: 100 });
  return pdfBytes.buffer;
}

// 8. Streaming PDF to Images — renders and streams one page at a time
// Active memory stays ~constant regardless of total page count
async function handlePdfToImagesStream(arrayBuffer, options) {
  const { format = 'png', quality = 0.92, scale = 2, maxPages = null, pagesToConvert = null } = options;
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? 'jpg' : 'png';

  const pdf = await pdfjsLib.getDocument(getPdfjsDocParams(arrayBuffer, { disableWorker: true })).promise;
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
    canvas.width = 0;
    canvas.height = 0;
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
  const pdfDoc = await pdfjsLib.getDocument(getPdfjsDocParams(arrayBuffer.slice(), { disableWorker: true })).promise;

  // Resolve text-pattern boxes per page
  const patternBoxes = [...boxes];
  
  for (let i = 0; i < pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i + 1);
    const textContent = await page.getTextContent();
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
  let pdfLibDoc = await PDFDocument.load(arrayBuffer);

  // VisionClean: Universal Smart Cropper
  if (params && params.autoCropBlackBorders) {
    pdfLibDoc = await cleanAndRefitDocument(pdfLibDoc, params.pageCropBoxes || params.cropBox || {}, {
      margin: params.cleanMargin ?? 0,
      enabledEdges: params.enabledEdges,
      pageIndices: params.pageIndices
    });
  }

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
    
    // Draw solid black rectangle over bounds
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

  // Scrub document metadata if requested
  if (params.sanitizeMetadata) {
    try {
      pdfLibDoc.setTitle('');
      pdfLibDoc.setAuthor('');
      pdfLibDoc.setSubject('');
      pdfLibDoc.setKeywords([]);
      pdfLibDoc.setProducer('DocScalar Sanitizer');
      pdfLibDoc.setCreator('DocScalar');
      pdfLibDoc.setCreationDate(new Date());
      pdfLibDoc.setModificationDate(new Date());
    } catch (e) {
      console.warn('Metadata sanitization warning:', e);
    }
  }

  const pdfBytes = await pdfLibDoc.save({ useObjectStreams: false });
  return pdfBytes.buffer;
}

export { getPdfjsDocParams, CMAP_URL, CMAP_PACKED, STANDARD_FONT_DATA_URL };
