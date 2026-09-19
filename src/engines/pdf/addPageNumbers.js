import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { cleanTextForWinAnsi } from '../../utils/pdfSanitizer.js';
import { formatSequenceNumber } from '../../utils/numberFormatter.js';
import { cleanAndRefitDocument } from './cleanAndRefitPage.js';

const hexToRgb = (hex = '#000000') => {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2) || '0', 16) / 255,
    g: parseInt(clean.substring(2, 4) || '0', 16) / 255,
    b: parseInt(clean.substring(4, 6) || '0', 16) / 255
  };
};

/**
 * Computes native PDF coordinates and rotation angle from visual top-left coordinates.
 * Guarantees text and knockout pills render in the correct visual orientation regardless of page rotation.
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
 * Draw page numbers dynamically on a PDF document with smart collision avoidance,
 * safe margin scaling, knockout shield pills, and rotation compensation.
 * 
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - The PDF file or raw bytes.
 * @param {object} options - Page numbering settings.
 * @param {function} onProgress - Progress reporting callback (0-100).
 * @returns {Promise<Blob>} The numbered PDF file.
 */
export async function addPageNumbers(file, options = {}, onProgress) {
  if (onProgress) onProgress(5);
  
  let pdfBytes;
  if (file instanceof ArrayBuffer) {
    pdfBytes = file;
  } else if (file instanceof Uint8Array) {
    pdfBytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  } else if (file && typeof file.arrayBuffer === 'function') {
    pdfBytes = await file.arrayBuffer();
  } else {
    throw new Error('Invalid PDF data provided to addPageNumbers.');
  }

  if (onProgress) onProgress(25);
  
  let pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  if (onProgress) onProgress(35);

  // VisionClean: Auto-Crop black scanner borders and refit to page dimensions
  if ((options.autoCropBlackBorders || options.pageCropBoxes) && options.autoCropBlackBorders) {
    pdfDoc = await cleanAndRefitDocument(pdfDoc, options.pageCropBoxes || options.cropBox || {}, {
      margin: options.cleanMargin ?? 0,
      targetDimensions: options.targetDimensions
    });
  }

  if (onProgress) onProgress(45);

  const pages = pdfDoc.getPages();
  const totalPages = options.ptopTotalPages || pages.length;
  
  let font;
  if (options.fontFamily === 'Times') {
    font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  } else if (options.fontFamily === 'Courier') {
    font = await pdfDoc.embedFont(StandardFonts.Courier);
  } else {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }
  
  const format = options.format || options.formatStr || 'Page {page} of {total}';
  const position = options.position || 'footer-center';
  const fontSize = parseInt(options.fontSize || 10, 10);
  const startNumber = parseInt(options.startNumber || 1, 10);
  const colorVals = hexToRgb(options.color || '#000000');
  const textColor = rgb(colorVals.r, colorVals.g, colorVals.b);
  const margin = parseInt(options.margin || 36, 10);
  const skipFirstPage = Boolean(options.skipFirstPage);
  const countCoverPage = options.countCoverPage !== false; // Default true: page 2 retains natural count '2'
  const targetPages = Array.isArray(options.targetPages) ? options.targetPages : null;
  const numberingStyle = options.numberingStyle || 'arabic';
  const shrinkToFit = Boolean(options.shrinkToFit);
  const scaleFactor = options.scaleFactor ? parseFloat(options.scaleFactor) : 0.94;
  const shieldMode = options.shieldMode || 'none'; // 'none' | 'auto' | 'white-pill' | 'frosted'
  const shieldColorVals = hexToRgb(options.shieldColor || '#FFFFFF');
  const shieldBgColor = rgb(shieldColorVals.r, shieldColorVals.g, shieldColorVals.b);
  const shieldOpacity = options.shieldOpacity !== undefined ? parseFloat(options.shieldOpacity) : (shieldMode === 'frosted' ? 0.85 : 1.0);
  const hasCustomCoords = options.freeformCoords && typeof options.freeformCoords.x === 'number';

  pages.forEach((page, idx) => {
    // 1. Check if page is skipped (e.g. cover page)
    if (skipFirstPage && idx === 0) {
      return;
    }

    // 2. Check if targetPages filter excludes this page
    if (targetPages && !targetPages.includes(idx)) {
      return;
    }

    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle || 0;
    const isSideways = rotation === 90 || rotation === 270;
    const visualWidth = isSideways ? height : width;
    const visualHeight = isSideways ? width : height;

    // 3. Apply Safe Margins Content Scaling if enabled
    if (shrinkToFit) {
      const dx = (width * (1 - scaleFactor)) / 2;
      const dy = (height * (1 - scaleFactor)) / 2;
      page.scaleContent(scaleFactor, scaleFactor);
      page.translateContent(dx, dy);
    }

    const originalPageIndex = (options.ptopPageIndices && options.ptopPageIndices[idx] !== undefined) 
      ? options.ptopPageIndices[idx] 
      : idx;
    
    // Page numbering index adjusted for cover page logic
    let currentPageNumber;
    if (skipFirstPage) {
      if (countCoverPage) {
        // Page 2 is labeled 2
        currentPageNumber = originalPageIndex + startNumber;
      } else {
        // Page 2 is labeled 1
        currentPageNumber = Math.max(1, originalPageIndex - 1 + startNumber);
      }
    } else {
      currentPageNumber = originalPageIndex + startNumber;
    }

    const totalDisplay = (skipFirstPage && !countCoverPage) ? totalPages - 1 : totalPages;
    const formattedNumStr = formatSequenceNumber(currentPageNumber, numberingStyle);
    const formattedTotalStr = formatSequenceNumber(totalDisplay, numberingStyle);

    const rawTextStr = format
      .replace('{page}', formattedNumStr)
      .replace('{n}', formattedNumStr)
      .replace('{total}', formattedTotalStr)
      .replace('{seq_total}', String(totalPages - 1 + startNumber));

    const safeTextStr = cleanTextForWinAnsi(rawTextStr, font);
    const textWidth = font.widthOfTextAtSize(safeTextStr, fontSize);
    const textHeight = fontSize * 0.8;

    // 4. Calculate visual coordinates (0, 0 is visual top-left)
    let vx, vy;
    if (hasCustomCoords) {
      vx = options.freeformCoords.x;
      vy = options.freeformCoords.y;
    } else {
      switch (position) {
        case 'header-left':
          vx = margin;
          vy = margin;
          break;
        case 'header-center':
          vx = (visualWidth - textWidth) / 2;
          vy = margin;
          break;
        case 'header-right':
          vx = visualWidth - margin - textWidth;
          vy = margin;
          break;
        case 'footer-left':
          vx = margin;
          vy = visualHeight - margin - textHeight;
          break;
        case 'footer-center':
          vx = (visualWidth - textWidth) / 2;
          vy = visualHeight - margin - textHeight;
          break;
        case 'footer-right':
        default:
          vx = visualWidth - margin - textWidth;
          vy = visualHeight - margin - textHeight;
          break;
      }
    }

    // 5. Draw Knockout Shield Pill if requested
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

    // 6. Draw Text with exact baseline alignment & rotation compensation
    const { nx: textNx, ny: textNy, angle: textAngle } = computeRotatedCoordinates({
      pageWidth: width,
      pageHeight: height,
      rotation,
      visualX: vx,
      visualY: vy,
      itemWidth: textWidth,
      itemHeight: textHeight
    });

    page.drawText(safeTextStr, {
      x: textNx,
      y: textNy,
      size: fontSize,
      font,
      color: textColor,
      rotate: degrees(textAngle)
    });

    if (onProgress) {
      onProgress(Math.round(45 + ((idx + 1) / totalPages) * 45));
    }
  });

  const savedBytes = await pdfDoc.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  
  return new Blob([savedBytes], { type: 'application/pdf' });
}
