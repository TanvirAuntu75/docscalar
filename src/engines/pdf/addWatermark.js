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
export async function addWatermark(file, options, onProgress) {
  if (onProgress) onProgress(10);
  const pdfBytes = await file.arrayBuffer();
  if (onProgress) onProgress(30);
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(45);

  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let embeddedImage = null;
  if (options.type === 'image' && options.imageFile) {
    const imgBytes = await options.imageFile.arrayBuffer();
    const isPng = options.imageFile.name.toLowerCase().endsWith('.png') || options.imageFile.type === 'image/png';
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

  pages.forEach((page, idx) => {
    const { width, height } = page.getSize();
    
    if (options.type === 'text') {
      const text = options.text || 'CONFIDENTIAL';
      const safeText = cleanTextForWinAnsi(text, font);
      const colorVals = hexToRgb(options.color);
      const textWidth = font.widthOfTextAtSize(safeText, scaleSize);
      const textHeight = scaleSize * 0.8;

      let x = (width - textWidth) / 2;
      let y = (height - textHeight) / 2;

      if (position === 'top-left') {
        x = margin; y = height - margin - textHeight;
      } else if (position === 'top-right') {
        x = width - margin - textWidth; y = height - margin - textHeight;
      } else if (position === 'bottom-left') {
        x = margin; y = margin;
      } else if (position === 'bottom-right') {
        x = width - margin - textWidth; y = margin;
      }

      page.drawText(safeText, {
        x,
        y,
        size: scaleSize,
        font,
        color: rgb(colorVals.r, colorVals.g, colorVals.b),
        opacity,
        rotate: degrees(rotationAngle),
      });

    } else if (options.type === 'image' && embeddedImage) {
      // Scale image to fit requested percentage size of page width
      const imgScale = scaleSize / 100;
      const displayWidth = width * imgScale;
      const displayHeight = (embeddedImage.height / embeddedImage.width) * displayWidth;

      let x = (width - displayWidth) / 2;
      let y = (height - displayHeight) / 2;

      if (position === 'top-left') {
        x = margin; y = height - margin - displayHeight;
      } else if (position === 'top-right') {
        x = width - margin - displayWidth; y = height - margin - displayHeight;
      } else if (position === 'bottom-left') {
        x = margin; y = margin;
      } else if (position === 'bottom-right') {
        x = width - margin - displayWidth; y = margin;
      }

      page.drawImage(embeddedImage, {
        x,
        y,
        width: displayWidth,
        height: displayHeight,
        opacity,
        rotate: degrees(rotationAngle),
      });
    }

    if (onProgress) {
      onProgress(Math.round(45 + ((idx + 1) / pages.length) * 45));
    }
  });

  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);
  
  return new Blob([savedBytes], { type: 'application/pdf' });
}
