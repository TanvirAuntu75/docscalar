import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { cleanTextForWinAnsi } from '../../utils/pdfSanitizer.js';
import { cleanAndRefitDocument } from './cleanAndRefitPage.js';

/**
 * Parses page range string e.g. "1-3, 5, 8-10" into 0-indexed page set
 */
function parsePageRange(rangeStr, maxPages) {
  const pageIndices = new Set();
  if (!rangeStr || !rangeStr.trim()) {
    for (let i = 0; i < maxPages; i++) pageIndices.add(i);
    return pageIndices;
  }

  const parts = rangeStr.split(',').map((p) => p.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(maxPages, Math.max(start, end));
        for (let i = from; i <= to; i++) {
          pageIndices.add(i - 1);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPages) {
        pageIndices.add(num - 1);
      }
    }
  }
  return pageIndices;
}

/**
 * Computes native PDF coordinates and rotation angle from visual top-left coordinates.
 */
function computeRotatedCoordinates({
  pageWidth,
  pageHeight,
  rotation = 0,
  visualX,
  visualY,
  itemWidth,
  itemHeight
}) {
  const rot = ((rotation % 360) + 360) % 360;
  const isSideways = rot === 90 || rot === 270;
  const visualWidth = isSideways ? pageHeight : pageWidth;
  const visualHeight = isSideways ? pageWidth : pageHeight;

  let nx = visualX;
  let ny = visualY;
  let angle = 0;

  switch (rot) {
    case 0:
      nx = visualX;
      ny = pageHeight - visualY - itemHeight;
      angle = 0;
      break;
    case 90:
      nx = visualY;
      ny = visualX + itemWidth;
      angle = 270;
      break;
    case 180:
      nx = pageWidth - visualX;
      ny = visualY + itemHeight;
      angle = 180;
      break;
    case 270:
      nx = pageWidth - visualY - itemHeight;
      ny = pageHeight - visualX;
      angle = 90;
      break;
    default:
      nx = visualX;
      ny = pageHeight - visualY - itemHeight;
      angle = 0;
      break;
  }

  return { nx, ny, angle, visualWidth, visualHeight };
}

/**
 * Applies sequential alphanumeric Bates numbering to a PDF document with smart collision avoidance,
 * safe margin scaling, knockout shield pills, and rotation compensation.
 * Essential for legal discovery, litigation production, and compliance auditing.
 * 
 * @param {ArrayBuffer|Uint8Array|Blob|File} fileData - Raw PDF binary data
 * @param {Object} options - Configuration options
 * @returns {Promise<Uint8Array>} Processed PDF bytes
 */
export async function applyBatesNumbering(fileData, options = {}) {
  const {
    prefix = 'CONF-',
    suffix = '',
    startNumber = 1,
    digits = 6,
    position = 'bottom-right',
    fontFamily = 'Helvetica',
    fontSize = 10,
    color = '#000000',
    margin = 36,
    skipCoverPage = false,
    pageScope = 'all',
    pageRange = '',
    shrinkToFit = false,
    scaleFactor = 0.94,
    shieldMode = 'none',
    shieldColor = '#FFFFFF',
    shieldOpacity = 1.0,
    freeformCoords = null
  } = options;

  let arrayBuffer;
  if (fileData instanceof ArrayBuffer) {
    arrayBuffer = fileData;
  } else if (fileData instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileData))) {
    arrayBuffer = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
  } else if (fileData && typeof fileData.arrayBuffer === 'function') {
    arrayBuffer = await fileData.arrayBuffer();
  } else {
    throw new Error('Invalid PDF data passed to Bates numbering engine.');
  }

  let doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  
  // VisionClean: Auto-Crop black scanner borders and refit to page dimensions
  if ((options.autoCropBlackBorders || options.pageCropBoxes) && options.autoCropBlackBorders) {
    doc = await cleanAndRefitDocument(doc, options.pageCropBoxes || options.cropBox || {}, {
      margin: options.cleanMargin ?? 0,
      targetDimensions: options.targetDimensions
    });
  }

  let standardFont = StandardFonts.Helvetica;
  if (fontFamily === 'Times Roman' || fontFamily === 'Times-Roman' || fontFamily === 'Times') {
    standardFont = StandardFonts.TimesRoman;
  } else if (fontFamily === 'Courier') {
    standardFont = StandardFonts.Courier;
  }
  const font = await doc.embedFont(standardFont);
  
  const pages = doc.getPages();
  const totalPages = pages.length;
  const targetIndices = pageScope === 'range' ? parsePageRange(pageRange, totalPages) : null;

  // Convert hex color to rgb
  const cleanHex = color.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2) || '0', 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4) || '0', 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6) || '0', 16) / 255;
  const textColor = rgb(r, g, b);

  // Shield background color
  const cleanShieldHex = shieldColor.replace('#', '');
  const sr = parseInt(cleanShieldHex.substring(0, 2) || 'FF', 16) / 255;
  const sg = parseInt(cleanShieldHex.substring(2, 4) || 'FF', 16) / 255;
  const sb = parseInt(cleanShieldHex.substring(4, 6) || 'FF', 16) / 255;
  const shieldBgColor = rgb(sr, sg, sb);

  let stampedSequenceCounter = startNumber;

  for (let i = 0; i < totalPages; i++) {
    // Skip cover page if requested
    if (i === 0 && skipCoverPage) {
      continue;
    }

    // Skip pages not in targeted range if custom scope
    if (targetIndices && !targetIndices.has(i)) {
      continue;
    }

    const page = pages[i];
    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle || 0;
    const isSideways = rotation === 90 || rotation === 270;
    const visualWidth = isSideways ? height : width;
    const visualHeight = isSideways ? width : height;

    // Apply Safe Margins Content Scaling if enabled
    if (shrinkToFit) {
      const sFactor = parseFloat(scaleFactor) || 0.94;
      const dx = (width * (1 - sFactor)) / 2;
      const dy = (height * (1 - sFactor)) / 2;
      page.scaleContent(sFactor, sFactor);
      page.translateContent(dx, dy);
    }
    
    // Generate padded sequence string e.g. "CONF-000001"
    const numStr = String(stampedSequenceCounter).padStart(digits, '0');
    const rawBatesText = `${prefix}${numStr}${suffix}`;
    const safeBatesText = cleanTextForWinAnsi(rawBatesText, font);
    stampedSequenceCounter++;
    
    const textWidth = font.widthOfTextAtSize(safeBatesText, fontSize);
    const textHeight = fontSize * 0.8;

    // Calculate visual coordinates (0, 0 is visual top-left)
    let vx, vy;
    if (freeformCoords && typeof freeformCoords.x === 'number') {
      vx = freeformCoords.x;
      vy = freeformCoords.y;
    } else {
      switch (position) {
        case 'top-left':
        case 'header-left':
          vx = margin;
          vy = margin;
          break;
        case 'top-center':
        case 'header-center':
          vx = (visualWidth - textWidth) / 2;
          vy = margin;
          break;
        case 'top-right':
        case 'header-right':
          vx = visualWidth - margin - textWidth;
          vy = margin;
          break;
        case 'bottom-left':
        case 'footer-left':
          vx = margin;
          vy = visualHeight - margin - textHeight;
          break;
        case 'bottom-center':
        case 'footer-center':
          vx = (visualWidth - textWidth) / 2;
          vy = visualHeight - margin - textHeight;
          break;
        case 'bottom-right':
        case 'footer-right':
        default:
          vx = visualWidth - margin - textWidth;
          vy = visualHeight - margin - textHeight;
          break;
      }
    }

    // Draw Knockout Shield Pill if active
    if (shieldMode !== 'none') {
      const padX = 8;
      const padY = 4;
      const pillVisualX = vx - padX;
      const pillVisualY = vy - padY;
      const pillWidth = textWidth + padX * 2;
      const pillHeight = textHeight + padY * 2;

      const { nx: pillNx, ny: pillNy, angle: pillAngle } = computeRotatedCoordinates({
        pageWidth: width,
        pageHeight: height,
        rotation,
        visualX: pillVisualX,
        visualY: pillVisualY,
        itemWidth: pillWidth,
        itemHeight: pillHeight
      });

      page.drawRectangle({
        x: pillNx,
        y: pillNy,
        width: pillWidth,
        height: pillHeight,
        color: shieldBgColor,
        opacity: shieldOpacity,
        borderColor: rgb(0.82, 0.85, 0.9),
        borderWidth: 0.75,
        rotate: degrees(pillAngle)
      });
    }

    // Draw Text with rotation compensation
    const { nx: textNx, ny: textNy, angle: textAngle } = computeRotatedCoordinates({
      pageWidth: width,
      pageHeight: height,
      rotation,
      visualX: vx,
      visualY: vy,
      itemWidth: textWidth,
      itemHeight: textHeight
    });

    page.drawText(safeBatesText, {
      x: textNx,
      y: textNy,
      size: fontSize,
      font,
      color: textColor,
      opacity: 1,
      rotate: degrees(textAngle)
    });
  }

  return await doc.save({ useObjectStreams: true });
}
