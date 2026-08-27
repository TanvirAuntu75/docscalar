/* Scan to PDF Engine with Multi-Filter Enhancement & Geometry Baking */
import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Helper to convert data URL or blob to Uint8Array bytes
 */
async function dataUrlToBytes(dataUrl) {
  if (dataUrl.startsWith('data:')) {
    const base64 = dataUrl.split(',')[1];
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64');
    }
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }
  const res = await fetch(dataUrl);
  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * Compile an array of scanned page images into a unified PDF document.
 * @param {Array<{ id: string, dataUrl: string, rotation: number }>} pages 
 * @param {object} options - { pageSize: 'a4'|'letter'|'fit', orientation: 'auto'|'portrait'|'landscape', margin: 0|15|30, filter: 'normal'|'enhance'|'grayscale' }
 * @returns {Promise<Blob>}
 */
export async function compileScansToPdf(pages = [], options = {}) {
  if (!pages.length) throw new Error('No scanned pages provided to compile.');

  const {
    pageSize = 'a4',
    orientation = 'auto',
    margin = 0
  } = options;

  const pdfDoc = await PDFDocument.create();

  // Page Dimension Presets (in PDF points: 72 points = 1 inch)
  const SIZES = {
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612.0, height: 792.0 }
  };

  for (let i = 0; i < pages.length; i++) {
    const pageItem = pages[i];
    const imgBytes = await dataUrlToBytes(pageItem.dataUrl);

    let embeddedImg;
    const isPng = pageItem.dataUrl.startsWith('data:image/png') || (imgBytes[0] === 0x89 && imgBytes[1] === 0x50);
    if (isPng) {
      embeddedImg = await pdfDoc.embedPng(imgBytes);
    } else {
      embeddedImg = await pdfDoc.embedJpg(imgBytes);
    }

    const { width: imgW, height: imgH } = embeddedImg;
    const rot = (pageItem.rotation || 0) % 360;
    const isRotated90or270 = rot === 90 || rot === 270;

    const effectiveImgW = isRotated90or270 ? imgH : imgW;
    const effectiveImgH = isRotated90or270 ? imgW : imgH;

    let targetPageW;
    let targetPageH;

    if (pageSize === 'fit') {
      targetPageW = effectiveImgW + margin * 2;
      targetPageH = effectiveImgH + margin * 2;
    } else {
      const baseSize = SIZES[pageSize] || SIZES.a4;
      if (orientation === 'landscape') {
        targetPageW = Math.max(baseSize.width, baseSize.height);
        targetPageH = Math.min(baseSize.width, baseSize.height);
      } else if (orientation === 'portrait') {
        targetPageW = Math.min(baseSize.width, baseSize.height);
        targetPageH = Math.max(baseSize.width, baseSize.height);
      } else {
        // Auto
        if (effectiveImgW > effectiveImgH) {
          targetPageW = Math.max(baseSize.width, baseSize.height);
          targetPageH = Math.min(baseSize.width, baseSize.height);
        } else {
          targetPageW = Math.min(baseSize.width, baseSize.height);
          targetPageH = Math.max(baseSize.width, baseSize.height);
        }
      }
    }

    const page = pdfDoc.addPage([targetPageW, targetPageH]);

    const printableW = targetPageW - margin * 2;
    const printableH = targetPageH - margin * 2;

    const scale = Math.min(printableW / effectiveImgW, printableH / effectiveImgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const finalDrawEffectiveW = effectiveImgW * scale;
    const finalDrawEffectiveH = effectiveImgH * scale;

    const posX = margin + (printableW - finalDrawEffectiveW) / 2;
    const posY = margin + (printableH - finalDrawEffectiveH) / 2;

    if (rot === 90) {
      page.drawImage(embeddedImg, {
        x: posX + finalDrawEffectiveW,
        y: posY,
        width: drawW,
        height: drawH,
        rotate: degrees(90)
      });
    } else if (rot === 180) {
      page.drawImage(embeddedImg, {
        x: posX + finalDrawEffectiveW,
        y: posY + finalDrawEffectiveH,
        width: drawW,
        height: drawH,
        rotate: degrees(180)
      });
    } else if (rot === 270) {
      page.drawImage(embeddedImg, {
        x: posX,
        y: posY + finalDrawEffectiveH,
        width: drawW,
        height: drawH,
        rotate: degrees(270)
      });
    } else {
      page.drawImage(embeddedImg, {
        x: posX,
        y: posY,
        width: drawW,
        height: drawH
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
