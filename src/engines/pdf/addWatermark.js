import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { cleanTextForWinAnsi } from '../../utils/pdfSanitizer.js';

// Parse hex colors to standard rgb values (0.0 to 1.0)
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0.5, g: 0.5, b: 0.5 };
};

/**
 * Add a text or image watermark to a PDF.
 * @param {File} file - The PDF file.
 * @param {object} options - Watermark parameters.
 * @param {function} onProgress - Progress callback.
 * @returns {Promise<Blob>} The watermarked PDF.
 */
export async function addWatermark(file, options = {}, onProgress) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(30);
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(45);

  const pages = pdfDoc.getPages();

  // Select font family
  let font;
  if (options.fontFamily === 'Times') {
    font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  } else if (options.fontFamily === 'Courier') {
    font = await pdfDoc.embedFont(StandardFonts.CourierBold);
  } else {
    font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }
  
  let embeddedImage = null;
  if (options.type === 'image' && options.imageFile) {
    const imgBytes = await options.imageFile.arrayBuffer();
    const isPng = options.imageFile.name?.toLowerCase().endsWith('.png') || options.imageFile.type === 'image/png';
    if (isPng) {
      embeddedImage = await pdfDoc.embedPng(imgBytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(imgBytes);
    }
  }

  const opacity = parseFloat(options.opacity ?? 0.3);
  const rotationAngle = parseFloat(options.rotation ?? 45);
  const scaleSize = parseFloat(options.size ?? 50); // FontSize for text, scale % for image
  const position = options.position || 'center';
  const margin = 36; // Padding from borders in points
  const targetPages = Array.isArray(options.targetPages) ? options.targetPages : null;
  const isTileRepeat = Boolean(options.repeatTile);

  pages.forEach((page, idx) => {
    if (targetPages && !targetPages.includes(idx)) {
      return; // Skip pages not in target scope
    }

    const { width, height } = page.getSize();
    
    if (options.type === 'text') {
      const text = options.text || 'CONFIDENTIAL';
      const safeText = cleanTextForWinAnsi(text, font);
      const colorVals = hexToRgb(options.color);
      const textWidth = font.widthOfTextAtSize(safeText, scaleSize);
      const textHeight = scaleSize * 0.8;

      const rad = (rotationAngle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const renderTextAtCenter = (cx, cy) => {
        const x = cx - (textWidth / 2) * cos + (textHeight / 2) * sin;
        const y = cy - (textWidth / 2) * sin - (textHeight / 2) * cos;
        page.drawText(safeText, {
          x,
          y,
          size: scaleSize,
          font,
          color: rgb(colorVals.r, colorVals.g, colorVals.b),
          opacity,
          rotate: degrees(rotationAngle),
        });
      };

      if (isTileRepeat) {
        // 3x3 repeating grid
        const cols = [width * 0.2, width * 0.5, width * 0.8];
        const rows = [height * 0.2, height * 0.5, height * 0.8];
        cols.forEach(cx => {
          rows.forEach(cy => {
            renderTextAtCenter(cx, cy);
          });
        });
      } else {
        let cx = width / 2;
        let cy = height / 2;

        if (options.xPercent !== undefined && options.yPercent !== undefined) {
          cx = options.xPercent * width;
          cy = (1 - options.yPercent) * height;
        } else {
          if (position === 'top-left') {
            cx = margin + textWidth / 2; cy = height - margin - textHeight / 2;
          } else if (position === 'top-right') {
            cx = width - margin - textWidth / 2; cy = height - margin - textHeight / 2;
          } else if (position === 'bottom-left') {
            cx = margin + textWidth / 2; cy = margin + textHeight / 2;
          } else if (position === 'bottom-right') {
            cx = width - margin - textWidth / 2; cy = margin + textHeight / 2;
          }
        }
        renderTextAtCenter(cx, cy);
      }

    } else if (options.type === 'image' && embeddedImage) {
      // Scale image to fit requested percentage size of page width
      const imgScale = scaleSize / 100;
      const displayWidth = width * imgScale;
      const displayHeight = (embeddedImage.height / embeddedImage.width) * displayWidth;

      const renderImageAtCenter = (cx, cy) => {
        const x = cx - displayWidth / 2;
        const y = cy - displayHeight / 2;
        page.drawImage(embeddedImage, {
          x,
          y,
          width: displayWidth,
          height: displayHeight,
          opacity,
          rotate: degrees(rotationAngle),
        });
      };

      if (isTileRepeat) {
        const cols = [width * 0.25, width * 0.75];
        const rows = [height * 0.25, height * 0.75];
        cols.forEach(cx => {
          rows.forEach(cy => {
            renderImageAtCenter(cx, cy);
          });
        });
      } else {
        let cx = width / 2;
        let cy = height / 2;

        if (options.xPercent !== undefined && options.yPercent !== undefined) {
          cx = options.xPercent * width;
          cy = (1 - options.yPercent) * height;
        } else {
          if (position === 'top-left') {
            cx = margin + displayWidth / 2; cy = height - margin - displayHeight / 2;
          } else if (position === 'top-right') {
            cx = width - margin - displayWidth / 2; cy = height - margin - displayHeight / 2;
          } else if (position === 'bottom-left') {
            cx = margin + displayWidth / 2; cy = margin + displayHeight / 2;
          } else if (position === 'bottom-right') {
            cx = width - margin - displayWidth / 2; cy = margin + displayHeight / 2;
          }
        }
        renderImageAtCenter(cx, cy);
      }
    }

    if (onProgress) {
      onProgress(Math.round(45 + ((idx + 1) / pages.length) * 45));
    }
  });

  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  
  return new Blob([savedBytes], { type: 'application/pdf' });
}

