import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { getPageGeometry, screenRatioToPdfPoints } from '../../utils/pdfCoordinates.js';
import { formatDateByPattern } from '../../utils/dateFormats.js';

/**
 * Sanitizes Unicode strings to safe WinAnsi / ASCII standard font characters
 */
function sanitizePdfText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022]/g, '*')
    .replace(/[\u2026]/g, '...')
    .normalize('NFKD')
    .replace(/[^\x00-\xFF]/g, '');
}

/**
 * Converts a hex color string ('#000000', '#002060', '#B91C1C') into pdf-lib RGB values
 */
function hexToPdfRgb(hex = '#000000') {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

/**
 * Converts data URL (base64) to Uint8Array
 */
function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Helper to get Uint8Array bytes from dataUrl, Blob, File, or Uint8Array/ArrayBuffer
 */
async function extractImageBytes(source) {
  if (!source) return null;
  if (typeof source === 'string' && source.startsWith('data:')) {
    return {
      bytes: dataUrlToUint8Array(source),
      isPng: source.startsWith('data:image/png')
    };
  }
  if (source instanceof Uint8Array) {
    return { bytes: source, isPng: true };
  }
  if (source instanceof ArrayBuffer) {
    return { bytes: new Uint8Array(source), isPng: true };
  }
  if (typeof source.arrayBuffer === 'function') {
    const buf = await source.arrayBuffer();
    const isPng = source.type ? source.type.includes('png') : true;
    return { bytes: new Uint8Array(buf), isPng };
  }
  return null;
}

/**
 * Enterprise Multi-Field PDF Signing Engine (with Universal Backwards Compatibility)
 * 
 * Supports:
 * - New Multi-Field Signature: signPdf(file, fieldsArray, { flatten, onProgress })
 * - Legacy Single-Field Signature: signPdf(file, { signaturePngBlob, pageIndex, xPercent, yPercent, widthPercent }, onProgressCb)
 * 
 * Embeds signatures, initials, dates, names, text boxes, and stamps with pixel-perfect
 * coordinate normalization across all page rotations, and flattens the output content stream.
 * 
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - Input PDF
 * @param {Array<object>|object} fieldsOrOptions - Array of placed fields OR legacy options object
 * @param {object|function} optionsOrCb - Configuration options or onProgress callback
 * @returns {Promise<Blob>} Signed PDF Blob
 */
export async function signPdf(file, fieldsOrOptions = [], optionsOrCb = {}) {
  // Normalize options & progress callback
  let options = {};
  if (typeof optionsOrCb === 'function') {
    options = { onProgress: optionsOrCb };
  } else if (optionsOrCb && typeof optionsOrCb === 'object') {
    options = { ...optionsOrCb };
  }

  const onProgress = options.onProgress || (() => {});
  onProgress(10);

  // Normalize fields array (support legacy single-signature options objects)
  let fields = [];
  if (Array.isArray(fieldsOrOptions)) {
    fields = fieldsOrOptions;
  } else if (fieldsOrOptions && typeof fieldsOrOptions === 'object') {
    if (Array.isArray(fieldsOrOptions.fields)) {
      fields = fieldsOrOptions.fields;
    } else {
      // Legacy single-signature options object
      const sigSource = fieldsOrOptions.signaturePngBlob ||
        fieldsOrOptions.signatureBlob ||
        fieldsOrOptions.signatureDataUrl ||
        fieldsOrOptions.dataUrl ||
        null;

      const rawX = fieldsOrOptions.xPercent ?? (fieldsOrOptions.x ? fieldsOrOptions.x / 100 : 0.5);
      const rawY = fieldsOrOptions.yPercent ?? (fieldsOrOptions.y ? fieldsOrOptions.y / 100 : 0.5);
      const rawW = fieldsOrOptions.widthPercent ?? (fieldsOrOptions.width ? fieldsOrOptions.width / 100 : 0.25);
      const rawH = fieldsOrOptions.heightPercent ?? 0.08;

      // In legacy API, xPercent/yPercent was center-anchored, so convert to top-left bounds
      const leftX = Math.max(0, rawX - rawW / 2);
      const topY = Math.max(0, rawY - rawH / 2);

      fields = [{
        id: 'legacy_sig_field',
        type: 'signature',
        pageIndex: fieldsOrOptions.pageIndex ?? 0,
        x: leftX,
        y: topY,
        width: rawW,
        height: rawH,
        dataUrl: typeof sigSource === 'string' ? sigSource : null,
        blob: typeof sigSource !== 'string' ? sigSource : null
      }];
    }
  }

  let pdfBytes;
  if (file instanceof ArrayBuffer) {
    pdfBytes = file;
  } else if (file instanceof Uint8Array) {
    pdfBytes = file.buffer;
  } else if (typeof file.arrayBuffer === 'function') {
    pdfBytes = await file.arrayBuffer();
  } else {
    throw new Error('Invalid PDF file format provided to signPdf.');
  }

  onProgress(25);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  if (totalPages === 0) {
    throw new Error('PDF document has 0 pages.');
  }

  onProgress(35);
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontTimesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Group fields by pageIndex
  const fieldsByPage = {};
  for (const field of fields) {
    const pIdx = field.pageIndex || 0;
    if (!fieldsByPage[pIdx]) {
      fieldsByPage[pIdx] = [];
    }
    fieldsByPage[pIdx].push(field);
  }

  onProgress(50);

  // Process each page
  for (let p = 0; p < totalPages; p++) {
    const pageFields = fieldsByPage[p];
    if (!pageFields || pageFields.length === 0) continue;

    const page = pages[p];
    const geometry = getPageGeometry(page);

    for (const field of pageFields) {
      const pt = screenRatioToPdfPoints({
        xRatio: field.x,
        yRatio: field.y,
        widthRatio: field.width,
        heightRatio: field.height,
        pageGeometry: geometry
      });

      const fieldColor = hexToPdfRgb(field.color || '#000000');

      // 1. Signature / Initials / Stamp / Seal (Image / Bitmap)
      const imageSource = field.dataUrl || field.blob || field.signaturePngBlob || field.bytes;
      if (imageSource) {
        try {
          const imgData = await extractImageBytes(imageSource);
          if (imgData && imgData.bytes) {
            const embeddedImg = imgData.isPng
              ? await pdfDoc.embedPng(imgData.bytes)
              : await pdfDoc.embedJpg(imgData.bytes);

            page.drawImage(embeddedImg, {
              x: pt.x,
              y: pt.y,
              width: pt.width,
              height: pt.height,
              rotate: degrees(pt.rotateDegrees)
            });
          }
        } catch (imgErr) {
          console.warn(`Failed to embed field ${field.id} image:`, imgErr);
        }
      }
      // 2. Checkbox Field
      else if (field.type === 'checkbox') {
        const boxSize = Math.min(pt.width, pt.height);
        page.drawRectangle({
          x: pt.x,
          y: pt.y,
          width: boxSize,
          height: boxSize,
          borderColor: fieldColor,
          borderWidth: 1.5,
          color: rgb(1, 1, 1)
        });

        if (field.checked !== false) {
          if (field.checkStyle === 'square') {
            const pad = boxSize * 0.22;
            page.drawRectangle({
              x: pt.x + pad,
              y: pt.y + pad,
              width: boxSize - (pad * 2),
              height: boxSize - (pad * 2),
              color: fieldColor
            });
          } else {
            // Draw X / Cross
            const pad = boxSize * 0.22;
            page.drawLine({
              start: { x: pt.x + pad, y: pt.y + pad },
              end: { x: pt.x + boxSize - pad, y: pt.y + boxSize - pad },
              thickness: 1.5,
              color: fieldColor
            });
            page.drawLine({
              start: { x: pt.x + pad, y: pt.y + boxSize - pad },
              end: { x: pt.x + boxSize - pad, y: pt.y + pad },
              thickness: 1.5,
              color: fieldColor
            });
          }
        }
      }
      // 3. Textual Fields (Date, Name, Email, Title, Company, Custom Text)
      else {
        let textStr = '';
        let chosenFont = fontHelvetica;
        let fontSize = Math.max(9, Math.min(22, pt.height * 0.55));

        if (field.type === 'date') {
          textStr = field.value !== undefined && field.value !== ''
            ? field.value
            : formatDateByPattern(new Date(), field.dateFormat || 'MM/DD/YYYY');
          chosenFont = fontCourier;
        } else if (field.type === 'name') {
          textStr = field.value || 'Signer Name';
          chosenFont = fontHelveticaBold;
          fontSize = Math.max(10, Math.min(22, pt.height * 0.6));
        } else if (field.type === 'email') {
          textStr = field.value || 'signer@example.com';
          chosenFont = fontHelvetica;
        } else if (field.type === 'title') {
          textStr = field.value || 'Job Title';
          chosenFont = fontHelveticaBold;
        } else if (field.type === 'company') {
          textStr = field.value || 'Company Name';
          chosenFont = fontHelveticaBold;
        } else {
          textStr = field.value || 'Custom Text';
          if (field.fontFamily?.includes('Times')) {
            chosenFont = fontTimesRoman;
          } else if (field.fontFamily?.includes('Courier') || field.fontFamily?.includes('mono')) {
            chosenFont = fontCourier;
          }
        }

        // Sanitize string to prevent WinAnsi encoding crashes
        const safeText = sanitizePdfText(textStr);

        // Draw solid background backdrop ONLY if explicitly requested
        if (field.bgStyle === 'white' || field.bgStyle === 'solid') {
          page.drawRectangle({
            x: pt.x,
            y: pt.y,
            width: pt.width,
            height: pt.height,
            color: rgb(1, 1, 1),
            opacity: 0.98
          });
        }

        // Auto-scale font size down if the text exceeds the field width
        let textWidth = chosenFont.widthOfTextAtSize(safeText, fontSize);
        const maxTextWidth = pt.width - 4;
        if (textWidth > maxTextWidth && textWidth > 0 && maxTextWidth > 0) {
          const scaleRatio = maxTextWidth / textWidth;
          fontSize = Math.max(6, Math.floor(fontSize * scaleRatio));
          textWidth = chosenFont.widthOfTextAtSize(safeText, fontSize);
        }

        // Compute text horizontal alignment offset
        let textX = pt.x + 2;
        if (field.textAlign === 'center' && pt.width > textWidth) {
          textX = pt.x + (pt.width - textWidth) / 2;
        } else if (field.textAlign === 'right' && pt.width > textWidth) {
          textX = pt.x + pt.width - textWidth - 2;
        }

        const textY = pt.y + Math.max(2, (pt.height - fontSize) / 2);

        page.drawText(safeText, {
          x: textX,
          y: textY,
          size: fontSize,
          font: chosenFont,
          color: fieldColor,
          rotate: degrees(pt.rotateDegrees)
        });
      }
    }
  }

  onProgress(80);

  // Document Content Flattening (Anti-Tamper)
  if (options.flatten !== false) {
    try {
      const form = pdfDoc.getForm();
      if (form && typeof form.flatten === 'function') {
        form.flatten();
      }
    } catch {
      // Non-interactive PDF
    }
  }

  onProgress(90);
  const savedBytes = await pdfDoc.save();
  onProgress(100);

  return new Blob([savedBytes], { type: 'application/pdf' });
}
