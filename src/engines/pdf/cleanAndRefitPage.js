import { PDFDocument } from 'pdf-lib';

/**
 * DocScalar VisionClean™: Clean & Refit Page Engine
 * 
 * Takes a PDFDocument with detected or custom crop bounding boxes, clips out
 * photocopier black borders, and uniformly scales and centers the clean interior
 * content onto target pages of the EXACT SAME DIMENSION (or standard A4/Letter),
 * framed by a pristine clean white margin perimeter.
 */

/**
 * Cleans dark borders and refits a single page or entire document.
 * 
 * @param {PDFDocument} pdfDoc - Source PDFDocument instance from pdf-lib
 * @param {Record<number, object>|object} cropBoxes - Map of pageIndex -> { left, bottom, right, top, hasBlackBorders }
 * @param {object} [options] - Additional options
 * @param {object} [options.targetDimensions] - Optional { width, height } to normalize all pages
 * @param {number} [options.margin=0] - Clean white margin in PDF points (default 0pt for full original dimensions)
 * @param {boolean} [options.uniformScale=true] - Preserve aspect ratio without stretching
 * @param {function} [options.onProgress] - Progress callback (0-100)
 * @returns {Promise<PDFDocument>} New PDFDocument with clean, refitted pages
 */
export async function cleanAndRefitDocument(pdfDoc, cropBoxes = {}, options = {}) {
  const newDoc = await PDFDocument.create();
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  const margin = options.margin ?? 0;
  const uniformScale = options.uniformScale !== false;
  const enabledEdges = options.enabledEdges ?? { top: true, bottom: true, left: true, right: true };
  // pageIndices: if specified, only process these page indices (0-based). All other pages copied as-is.
  const pageIndices = options.pageIndices ?? null; // null means all pages

  for (let i = 0; i < totalPages; i++) {
    const origPage = pages[i];
    const origSize = origPage.getSize();
    const origW = origSize.width;
    const origH = origSize.height;

    // Skip pages not in the target set (if pageIndices is specified)
    const isTargetPage = pageIndices === null || pageIndices.includes(i);

    const targetW = options.targetDimensions?.width ?? origW;
    const targetH = options.targetDimensions?.height ?? origH;
    
    // Retrieve cropBox strictly for this specific page or direct single-box object
    // Never fall back to another page's or document's crop box if this page is clean!
    const cropBox = (cropBoxes && typeof cropBoxes === 'object' && cropBoxes[i])
      ? cropBoxes[i]
      : (cropBoxes && cropBoxes.left !== undefined ? cropBoxes : null);

    // Apply per-edge enable/disable: zero out crop values for disabled edges
    let effectiveCropBox = cropBox;
    if (cropBox && isTargetPage) {
      effectiveCropBox = { ...cropBox };
      if (!enabledEdges.top) { effectiveCropBox.cropTop = 0; }
      if (!enabledEdges.bottom) { effectiveCropBox.cropBottom = 0; }
      if (!enabledEdges.left) { effectiveCropBox.cropLeft = 0; effectiveCropBox.left = 0; }
      if (!enabledEdges.right) { effectiveCropBox.cropRight = 0; effectiveCropBox.right = origW; }
      // Recalculate bounding box from adjusted crop values
      if (effectiveCropBox.cropLeft !== undefined) {
        effectiveCropBox.left = effectiveCropBox.cropLeft || 0;
        effectiveCropBox.bottom = effectiveCropBox.cropBottom || 0;
        effectiveCropBox.right = origW - (effectiveCropBox.cropRight || 0);
        effectiveCropBox.top = origH - (effectiveCropBox.cropTop || 0);
        effectiveCropBox.width = effectiveCropBox.right - effectiveCropBox.left;
        effectiveCropBox.height = effectiveCropBox.top - effectiveCropBox.bottom;
        effectiveCropBox.hasBlackBorders = (effectiveCropBox.cropTop > 0 || effectiveCropBox.cropBottom > 0 || effectiveCropBox.cropLeft > 0 || effectiveCropBox.cropRight > 0);
      }
    }

    const hasActiveCrop = isTargetPage && effectiveCropBox &&
      !effectiveCropBox.isInvertedDocument &&
      effectiveCropBox.hasBlackBorders === true &&
      (effectiveCropBox.cropTop > 0 || effectiveCropBox.cropBottom > 0 || effectiveCropBox.cropLeft > 0 || effectiveCropBox.cropRight > 0);

    if (hasActiveCrop) {
      // Bounding box in PDF coordinates (0,0 is bottom-left)
      const left = Math.max(0, Math.min(origW - 10, effectiveCropBox.left ?? 0));
      const bottom = Math.max(0, Math.min(origH - 10, effectiveCropBox.bottom ?? 0));
      const right = Math.max(left + 10, Math.min(origW, effectiveCropBox.right ?? origW));
      const top = Math.max(bottom + 10, Math.min(origH, effectiveCropBox.top ?? origH));

      const cleanW = Math.max(10, right - left);
      const cleanH = Math.max(10, top - bottom);

      // Embed the cropped sub-rectangle natively without rasterization
      const [embedded] = await newDoc.embedPages([origPage], [{
        left,
        bottom,
        right,
        top
      }]);

      const availW = Math.max(10, targetW - 2 * margin);
      const availH = Math.max(10, targetH - 2 * margin);

      const scaleX = availW / cleanW;
      const scaleY = availH / cleanH;
      const scale = uniformScale ? Math.min(scaleX, scaleY) : scaleX;
      const finalScaleY = uniformScale ? scale : scaleY;

      // Symmetrically center the scaled content on the new page
      const destX = margin + (availW - cleanW * scale) / 2;
      const destY = margin + (availH - cleanH * finalScaleY) / 2;

      const newPage = newDoc.addPage([targetW, targetH]);
      newPage.drawPage(embedded, {
        x: destX,
        y: destY,
        xScale: scale,
        yScale: finalScaleY
      });
    } else {
      // Page is already clean: copy directly to preserve 100% fidelity
      const [copied] = await newDoc.copyPages(pdfDoc, [i]);
      newDoc.addPage(copied);
    }

    if (options.onProgress && totalPages > 0) {
      options.onProgress(Math.round(((i + 1) / totalPages) * 100));
    }
  }

  return newDoc;
}

/**
 * Helper to clean a single page and return its refitted PDFDocument.
 */
export async function cleanAndRefitSinglePage(origPage, cropBox, options = {}) {
  const tempDoc = await PDFDocument.create();
  const [embedded] = await tempDoc.embedPages([origPage], [cropBox]);
  const size = origPage.getSize();
  const targetW = options.targetDimensions?.width ?? size.width;
  const targetH = options.targetDimensions?.height ?? size.height;
  const margin = options.margin ?? 0;

  const cleanW = Math.max(10, cropBox.right - cropBox.left);
  const cleanH = Math.max(10, cropBox.top - cropBox.bottom);

  const availW = Math.max(10, targetW - 2 * margin);
  const availH = Math.max(10, targetH - 2 * margin);

  const scale = options.uniformScale !== false
    ? Math.min(availW / cleanW, availH / cleanH)
    : availW / cleanW;
  const scaleY = options.uniformScale !== false ? scale : availH / cleanH;

  const destX = margin + (availW - cleanW * scale) / 2;
  const destY = margin + (availH - cleanH * scaleY) / 2;

  const page = tempDoc.addPage([targetW, targetH]);
  page.drawPage(embedded, {
    x: destX,
    y: destY,
    xScale: scale,
    yScale: scaleY
  });

  return tempDoc;
}
