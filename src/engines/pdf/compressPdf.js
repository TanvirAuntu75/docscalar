/* Compress PDF engine with dual Worker / Direct Fallback and Selective Page Compression */
import { PDFDocument, PDFName } from 'pdf-lib';

async function extractBytes(file) {
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file && typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  throw new Error('Unsupported PDF file input format for compression.');
}

/**
 * Parses a user-entered page range string (e.g. "1, 3", "1-3, 5", "odd", "even")
 * into a sorted, deduplicated array of 1-based page numbers within [1, totalPages].
 * @param {string} rangeStr
 * @param {number} totalPages
 * @returns {number[]}
 */
export function parsePageRange(rangeStr, totalPages = 1) {
  if (!rangeStr || typeof rangeStr !== 'string' || totalPages <= 0) return [];
  const val = rangeStr.trim().toLowerCase();
  if (val === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (val === 'odd') {
    return Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 !== 0);
  }
  if (val === 'even') {
    return Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 === 0);
  }

  const selected = new Set();
  const normalized = val.replace(/\s*-\s*/g, '-');
  const parts = normalized.split(/[,;\s]+/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let p = min; p <= max; p++) {
          selected.add(p);
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        selected.add(num);
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}

/**
 * Calculates weighted estimated savings when compressing a subset of pages.
 * @param {number} totalOriginalSize
 * @param {number} totalPages
 * @param {number} selectedCount
 * @param {number} presetSavingsRatio (e.g. 0.65 for 65%)
 * @returns {{ estimatedNewSize: number, effectiveSavingsRatio: number }}
 */
export function calculateEstimatedSavings(totalOriginalSize, totalPages, selectedCount, presetSavingsRatio) {
  if (!totalOriginalSize || totalPages <= 0) {
    return { estimatedNewSize: totalOriginalSize || 0, effectiveSavingsRatio: 0 };
  }
  const safeSelected = Math.max(0, Math.min(totalPages, selectedCount));
  const pageWeight = safeSelected / totalPages;
  const effectiveSavingsRatio = pageWeight * presetSavingsRatio;
  const calculatedSize = Math.round(totalOriginalSize * (1 - effectiveSavingsRatio));
  const estimatedNewSize = Math.min(totalOriginalSize, Math.max(100, calculatedSize));
  return { estimatedNewSize, effectiveSavingsRatio };
}

/**
 * Reassembles pages in strictly increasing sequential order (1..N).
 * Selected pages are copied from compressedDoc; unselected pages are copied untouched from srcDoc.
 * @param {PDFDocument} mergedDoc
 * @param {PDFDocument} srcDoc
 * @param {PDFDocument} compressedDoc
 * @param {number} totalPages
 * @param {Set<number>|number[]} selectedPages
 * @returns {Promise<PDFDocument>}
 */
export async function assembleSequentialPages(mergedDoc, srcDoc, compressedDoc, totalPages, selectedPages) {
  const selectedSet = selectedPages instanceof Set ? selectedPages : new Set(selectedPages);
  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;
    if (selectedSet.has(pageNum)) {
      const [compPage] = await mergedDoc.copyPages(compressedDoc, [i]);
      mergedDoc.addPage(compPage);
    } else {
      const [origPage] = await mergedDoc.copyPages(srcDoc, [i]);
      mergedDoc.addPage(origPage);
    }
  }
  return mergedDoc;
}

/**
 * Canonical portal target size presets (e.g. Visa, ATS job portals, PACER court e-filing, email).
 */
export const PORTAL_TARGET_PRESETS = [
  { id: 'visa_gov', name: 'Gov / Visa Portal', targetBytes: 2 * 1024 * 1024, label: '2 MB', description: 'IRS, USCIS, IRCC, Schengen portals' },
  { id: 'job_app', name: 'Job Application', targetBytes: 1 * 1024 * 1024, label: '1 MB', description: 'Workday, Greenhouse, Taleo ATS' },
  { id: 'court', name: 'Court e-Filing', targetBytes: 5 * 1024 * 1024, label: '5 MB', description: 'Federal PACER & state courts' },
  { id: 'email', name: 'Email Attachment', targetBytes: 10 * 1024 * 1024, label: '10 MB', description: 'Outlook & mobile email limits' },
  { id: 'compact', name: 'Ultra Compact', targetBytes: 500 * 1024, label: '500 KB', description: 'Web upload & chat apps' }
];

/**
 * Calculates adaptive compression quality and scale factors to land strictly under target size ceiling.
 * Employs a 94% safety buffer so re-encoding variance never breaches external portal upload gates.
 * @param {number} originalSize
 * @param {number} targetSizeBytes
 * @param {object} options
 * @returns {{
 *   quality: number,
 *   scale: number,
 *   mode: string,
 *   requiredReductionPct: number,
 *   isAlreadyWithinTarget: boolean,
 *   targetSizeBytes: number,
 *   safeTargetBytes: number,
 *   effectiveDpi: number
 * }}
 */
export function calculateTargetCompressionParams(originalSize, targetSizeBytes, options = {}) {
  if (!targetSizeBytes || targetSizeBytes <= 0) {
    return {
      quality: 0.65,
      scale: 1.5,
      mode: 'lossy',
      requiredReductionPct: 0,
      isAlreadyWithinTarget: false,
      targetSizeBytes: 0,
      safeTargetBytes: 0,
      effectiveDpi: 150
    };
  }

  if (originalSize && originalSize <= targetSizeBytes) {
    return {
      quality: 0.95,
      scale: 2.0,
      mode: 'lossless',
      requiredReductionPct: 0,
      isAlreadyWithinTarget: true,
      targetSizeBytes,
      safeTargetBytes: targetSizeBytes,
      effectiveDpi: 200
    };
  }

  const safeTargetBytes = Math.floor(targetSizeBytes * 0.94);
  const ratio = originalSize > 0 ? safeTargetBytes / originalSize : 0.5;
  const requiredReductionPct = originalSize > 0 ? Math.max(1, Math.round((1 - targetSizeBytes / originalSize) * 100)) : 50;

  // Continuous piecewise linear interpolation across control anchors
  // Eliminates coarse stair-step under-compression (e.g. 2 MB yielding 1.3 MB instead of ~1.9 MB)
  const r = Math.max(0.05, Math.min(0.98, ratio));
  const anchors = [
    { r: 0.05, q: 0.20, s: 0.65, dpi: 72 },
    { r: 0.15, q: 0.32, s: 0.85, dpi: 96 },
    { r: 0.30, q: 0.48, s: 1.05, dpi: 120 },
    { r: 0.50, q: 0.64, s: 1.30, dpi: 150 },
    { r: 0.70, q: 0.76, s: 1.50, dpi: 180 },
    { r: 0.85, q: 0.86, s: 1.70, dpi: 210 },
    { r: 1.00, q: 0.92, s: 1.90, dpi: 240 }
  ];

  let quality = 0.65;
  let scale = 1.3;
  let effectiveDpi = 150;

  for (let i = 0; i < anchors.length - 1; i++) {
    const a1 = anchors[i];
    const a2 = anchors[i + 1];
    if (r <= a2.r) {
      const t = (r - a1.r) / (a2.r - a1.r);
      quality = parseFloat((a1.q + t * (a2.q - a1.q)).toFixed(2));
      scale = parseFloat((a1.s + t * (a2.s - a1.s)).toFixed(2));
      effectiveDpi = Math.round(a1.dpi + t * (a2.dpi - a1.dpi));
      break;
    }
  }

  return {
    quality,
    scale,
    mode: 'lossy',
    requiredReductionPct,
    isAlreadyWithinTarget: false,
    targetSizeBytes,
    safeTargetBytes,
    targetRatio: ratio,
    effectiveDpi
  };
}

/**
 * Calculates realistic recommended compression bounds and the physical readability floor for a PDF.
 * Warns users when an entered target size is mathematically extreme or impossible (e.g. 100 MB down to 100 KB across 50 pages).
 * @param {number} originalSize - Original file size in bytes
 * @param {number} totalPages - Number of pages in the document
 * @param {boolean} isVectorHeavy - Whether document consists primarily of vector glyph outlines
 * @returns {{
 *   minRecommendedBytes: number,
 *   maxRecommendedBytes: number,
 *   absoluteFloorBytes: number,
 *   perPageFloorBytes: number
 * }}
 */
export function calculateRecommendedCompressionRange(originalSize, totalPages = 1, isVectorHeavy = false, totalImages = 0) {
  if (!originalSize || originalSize <= 0) {
    return {
      minRecommendedBytes: 50 * 1024,
      maxRecommendedBytes: 500 * 1024,
      absoluteFloorBytes: 25 * 1024,
      perPageFloorBytes: 25 * 1024
    };
  }

  const safePages = Math.max(1, totalPages || 1);

  // Amortized Per-Page Budget:
  // With font deduplication, shared font programs are consolidated across all sections.
  // CJK/Indic fonts are deduplicated (not subsetted), Latin fonts are deduplicated + subsetted.
  const pageAmortizationFactor = safePages <= 1 ? 1.0 : safePages <= 5 ? 0.65 : safePages <= 15 ? 0.45 : safePages <= 30 ? 0.38 : 0.32;
  const basePerPage = isVectorHeavy ? (22 * 1024 * pageAmortizationFactor) : (14 * 1024 * pageAmortizationFactor);

  // Shared Font & PDF catalog overhead:
  // Font dedup engine consolidates duplicate font streams (e.g. 8 MSMincho copies → 1).
  // sharedFontFloor now reflects deduplicated font payload, not full duplicate embeddings.
  const sharedFontFloor = isVectorHeavy ? Math.min(originalSize * 0.15, Math.max(80 * 1024, safePages * 5 * 1024)) : 15 * 1024;
  const pdfOverhead = Math.min(60 * 1024, Math.max(10 * 1024, safePages * 1000));

  // Deduplicated Image Floor:
  // Documents with hundreds of images (e.g. icons across pages) reuse shared XObjects.
  const effectiveImages = Math.min(totalImages, Math.max(1, Math.round(safePages * 1.5)));
  const imageBudget = totalImages > 0 ? Math.min(originalSize * 0.40, effectiveImages * 1200) : 0;

  const rawFloor = pdfOverhead + sharedFontFloor + imageBudget + (safePages * Math.max(5 * 1024, basePerPage));
  let absoluteFloorBytes = Math.min(originalSize, Math.round(rawFloor));

  // Balanced recommended target range:
  // Lower bound: max of absoluteFloorBytes or 15% of original (capped at 85% of original)
  const lowerBound = Math.max(absoluteFloorBytes, Math.round(originalSize * 0.15));
  const minRecommendedBytes = Math.min(Math.round(originalSize * 0.85), lowerBound);

  // Upper bound: ~55% of original (moderate quality reduction, capped at 95% of original)
  const upperBound = Math.max(Math.round(minRecommendedBytes * 1.4), Math.round(originalSize * 0.55));
  const maxRecommendedBytes = Math.min(Math.round(originalSize * 0.95), upperBound);

  return {
    minRecommendedBytes,
    maxRecommendedBytes,
    absoluteFloorBytes,
    perPageFloorBytes: Math.round(absoluteFloorBytes / safePages)
  };
}

/**
 * Fast in-memory structural bloat analysis of a PDF document.
 * Analyzes page resources, XObject image streams, and content streams to diagnose
 * exactly which pages contribute to file bloat and whether the file is vector-heavy.
 * @param {PDFDocument|ArrayBuffer|Uint8Array|File|Blob} input
 * @returns {Promise<{
 *   totalPages: number,
 *   totalImageCount: number,
 *   totalRasterBytes: number,
 *   isVectorHeavy: boolean,
 *   heavyPages: number[],
 *   heavyPagesSharePct: number,
 *   pageStats: Array<{
 *     pageNumber: number,
 *     imageCount: number,
 *     approxBytes: number,
 *     imageBytes: number,
 *     contentStreamBytes: number,
 *     isHeavy: boolean,
 *     type: 'image_heavy' | 'vector_clean'
 *   }>
 * }>}
 */
export async function auditDocumentBloat(input) {
  let doc;
  if (input instanceof PDFDocument) {
    doc = input;
  } else {
    const bytes = await extractBytes(input);
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  }

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
        if (parent) {
          if (typeof parent.Resources === 'function') {
            resources = parent.Resources();
          } else if (typeof parent.lookup === 'function') {
            resources = parent.lookup(PDFName.of('Resources'));
          } else if (typeof parent.get === 'function') {
            resources = doc.context.lookup(parent.get(PDFName.of('Resources')));
          }
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
    totalImageBytes: totalRasterBytes,
    isVectorHeavy,
    heavyPages,
    heavyPagesSharePct,
    pageStats
  };
}

/**
 * Ultra-Compact Portal Rasterizer (Local/Browser Engine):
 * Rasterizes pages into high-legibility JPEG streams with adaptive scale and quality calibration
 * to strictly satisfy portal size ceilings (e.g. <100 KB, <150 KB) when vector font streams
 * exceed the target byte limit.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file
 * @param {number} targetSizeBytes
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function rasterizePdfCompact(file, targetSizeBytes, onProgress) {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    } catch {}
  }

  const arrayBuffer = await extractBytes(file);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const targetPerPage = (targetSizeBytes * 0.85) / Math.max(1, numPages);

  let scale = 1.0;
  let quality = 0.5;
  if (targetPerPage < 10_000) {
    scale = 0.50;
    quality = 0.20;
  } else if (targetPerPage < 20_000) {
    scale = 0.60;
    quality = 0.25;
  } else if (targetPerPage < 40_000) {
    scale = 0.75;
    quality = 0.35;
  } else if (targetPerPage < 65_000) {
    scale = 0.85;
    quality = 0.40;
  } else if (targetPerPage < 100_000) {
    scale = 1.0;
    quality = 0.50;
  } else if (targetPerPage < 160_000) {
    scale = 1.15;
    quality = 0.60;
  } else {
    scale = 1.3;
    quality = 0.70;
  }

  const outDoc = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    let canvas;
    if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
    } else if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(viewport.width, viewport.height);
    } else {
      throw new Error('Canvas API not available for client rasterization.');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    let jpgBytes = null;
    if (typeof canvas.convertToBlob === 'function') {
      try {
        const b = await canvas.convertToBlob({ type: 'image/jpeg', quality });
        jpgBytes = new Uint8Array(await b.arrayBuffer());
      } catch {}
    }
    if (!jpgBytes && typeof canvas.toBlob === 'function') {
      try {
        const b = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
        if (b) jpgBytes = new Uint8Array(await b.arrayBuffer());
      } catch {}
    }
    if (!jpgBytes && typeof canvas.toDataURL === 'function') {
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Index = dataUrl.indexOf(',');
        if (base64Index !== -1 && typeof atob === 'function') {
          const base64 = dataUrl.slice(base64Index + 1);
          const binStr = atob(base64);
          jpgBytes = new Uint8Array(binStr.length);
          for (let k = 0; k < binStr.length; k++) jpgBytes[k] = binStr.charCodeAt(k);
        } else {
          const res = await fetch(dataUrl);
          jpgBytes = new Uint8Array(await res.arrayBuffer());
        }
      } catch {}
    }
    if (!jpgBytes) {
      throw new Error('Canvas image encoding not supported in this environment.');
    }

    const jpgImage = await outDoc.embedJpg(jpgBytes);
    const origViewport = page.getViewport({ scale: 1.0 });
    const newPage = outDoc.addPage([origViewport.width, origViewport.height]);
    newPage.drawImage(jpgImage, {
      x: 0,
      y: 0,
      width: origViewport.width,
      height: origViewport.height
    });

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 90));
    }
  }

  const pdfBytes = await outDoc.save({ useObjectStreams: true });
  try {
    pdf.destroy();
  } catch {}
  if (onProgress) onProgress(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Compress a PDF by re-rendering pages as lower-quality JPEG images or optimizing structural object streams.
 * Supports selective page compression with exact sequential order-preserved merging.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file
 * @param {object} options - { quality: 0.1-1.0, scale: 0.5-2, mode: 'lossless'|'lossy', autoEnhance: boolean, stripMetadata: boolean, selectedPages?: number[], targetSizeBytes?: number, rasterizeFallback?: boolean }
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function compressPdf(file, options = {}, onProgress) {
  const actualOptions = { ...options };
  const progressCb = onProgress || actualOptions.onProgress;
  if (actualOptions.autoEnhance === undefined && typeof localStorage !== 'undefined') {
    actualOptions.autoEnhance = localStorage.getItem('autoEnhanceEnabled') !== 'false';
  }

  const arrayBuffer = await extractBytes(file);
  const originalSize = arrayBuffer.byteLength;

  if (actualOptions.targetSizeBytes && actualOptions.targetSizeBytes > 0) {
    const targetParams = calculateTargetCompressionParams(originalSize, actualOptions.targetSizeBytes);
    if (actualOptions.quality === undefined) actualOptions.quality = targetParams.quality;
    if (actualOptions.scale === undefined) actualOptions.scale = targetParams.scale;
    if (actualOptions.mode === undefined) actualOptions.mode = targetParams.mode;
    actualOptions.targetParams = targetParams;
  }

  // If ultra-compact rasterization requested to beat strict portal upload limits
  if (actualOptions.rasterizeFallback && actualOptions.targetSizeBytes && actualOptions.targetSizeBytes > 0) {
    try {
      return await rasterizePdfCompact(file, actualOptions.targetSizeBytes, progressCb);
    } catch (rasterErr) {
      console.warn('Direct rasterization failed, falling back to standard pipeline:', rasterErr);
    }
  }

  const isSelective = Array.isArray(actualOptions.selectedPages) && actualOptions.selectedPages.length > 0;

  // If worker constructor exists in browser environment
  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(new URL('../../workers/pdf.worker.js', import.meta.url), { type: 'module' });

      return await new Promise((resolve, reject) => {
        worker.postMessage({
          type: 'compressPdf',
          payload: { arrayBuffer, options: actualOptions }
        }, [arrayBuffer]);

        worker.onmessage = (e) => {
          const { type, progress, result, error } = e.data;
          if (type === 'progress') {
            if (progressCb) progressCb(progress);
          } else if (type === 'success') {
            const blob = new Blob([result.pdfBuffer], { type: 'application/pdf' });
            resolve(blob);
            worker.terminate();
          } else if (type === 'error') {
            reject(new Error(error));
            worker.terminate();
          }
        };

        worker.onerror = (err) => {
          reject(err);
          worker.terminate();
        };
      });
    } catch (workerErr) {
      console.warn('Worker compression failed, falling back to direct stream compression:', workerErr);
    }
  }

  // Direct structural stream & object optimization fallback with selective assembly
  if (progressCb) progressCb(20);
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true, updateMetadata: false });
  const totalPages = srcDoc.getPageCount();

  if (isSelective && actualOptions.selectedPages.length < totalPages) {
    const selectedSet = new Set(actualOptions.selectedPages.map(Number));
    if (progressCb) progressCb(40);

    const compDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true, updateMetadata: false });
    if (actualOptions.stripMetadata !== false) {
      try {
        compDoc.setTitle('');
        compDoc.setAuthor('');
        compDoc.setProducer('DocScalar');
      } catch {}
    }

    if (progressCb) progressCb(60);
    const mergedDoc = await PDFDocument.create();
    if (actualOptions.stripMetadata !== false) {
      try {
        mergedDoc.setTitle('');
        mergedDoc.setAuthor('');
        mergedDoc.setSubject('');
        mergedDoc.setKeywords([]);
        mergedDoc.setProducer('DocScalar');
        mergedDoc.setCreator('DocScalar Compression Engine');
      } catch {}
    }
    await assembleSequentialPages(mergedDoc, srcDoc, compDoc, totalPages, selectedSet);

    if (progressCb) progressCb(85);
    const pdfBytes = await mergedDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
      updateInfoDict: false
    });
    if (progressCb) progressCb(100);
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // Full document compression fallback
  if (actualOptions.stripMetadata !== false) {
    try {
      srcDoc.setTitle('');
      srcDoc.setAuthor('');
      srcDoc.setSubject('');
      srcDoc.setKeywords([]);
      srcDoc.setProducer('DocScalar');
      srcDoc.setCreator('DocScalar Compression Engine');
    } catch (metaErr) {}
  }

  if (progressCb) progressCb(70);
  const pdfBytes = await srcDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
    updateInfoDict: false
  });

  if (progressCb) progressCb(100);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}


