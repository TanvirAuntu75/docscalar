import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
 * Applies sequential alphanumeric Bates numbering to a PDF document.
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
    pageRange = ''
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

  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  
  let standardFont = StandardFonts.Helvetica;
  if (fontFamily === 'Times Roman' || fontFamily === 'Times-Roman') {
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
    
    // Generate padded sequence string e.g. "CONF-000001"
    const numStr = String(stampedSequenceCounter).padStart(digits, '0');
    const batesText = `${prefix}${numStr}${suffix}`;
    stampedSequenceCounter++;
    
    const textWidth = font.widthOfTextAtSize(batesText, fontSize);
    const textHeight = fontSize * 0.8;

    let x = width - margin - textWidth;
    let y = margin;

    if (position === 'bottom-left') {
      x = margin;
      y = margin;
    } else if (position === 'bottom-center') {
      x = (width - textWidth) / 2;
      y = margin;
    } else if (position === 'bottom-right') {
      x = width - margin - textWidth;
      y = margin;
    } else if (position === 'top-left') {
      x = margin;
      y = height - margin - textHeight;
    } else if (position === 'top-center') {
      x = (width - textWidth) / 2;
      y = height - margin - textHeight;
    } else if (position === 'top-right') {
      x = width - margin - textWidth;
      y = height - margin - textHeight;
    }

    page.drawText(batesText, {
      x,
      y,
      size: fontSize,
      font,
      color: textColor,
      opacity: 1
    });
  }

  return await doc.save({ useObjectStreams: true });
}

