/* QR Code Generation Engine: Multi-Format Vectors (SVG, PNG, PDF Flyer) */
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Supported QR Data Formats
 */
export const QR_PAYLOAD_TYPES = [
  { id: 'url', label: 'Website URL', icon: 'globe' },
  { id: 'wifi', label: 'Wi-Fi Network', icon: 'wifi' },
  { id: 'vcard', label: 'Contact Card', icon: 'user' },
  { id: 'email', label: 'Email Message', icon: 'mail' },
  { id: 'text', label: 'Plain Text', icon: 'file-text' }
];

/**
 * Preset Color Palettes
 */
export const COLOR_PALETTES = [
  { id: 'classic', label: 'Classic Monochrome', dark: '#000000', light: '#ffffff' },
  { id: 'indigo', label: 'Electric Indigo', dark: '#4f46e5', light: '#f8fafc' },
  { id: 'emerald', label: 'Cyber Emerald', dark: '#059669', light: '#f0fdf4' },
  { id: 'sunset', label: 'Sunset Crimson', dark: '#e11d48', light: '#fff1f2' },
  { id: 'amber', label: 'Corporate Amber', dark: '#d97706', light: '#fffbeb' },
  { id: 'slate', label: 'Dark Slate', dark: '#0f172a', light: '#ffffff' }
];

/**
 * Format payload data string based on selected type
 */
export function formatQrPayload(type, data) {
  switch (type) {
    case 'wifi': {
      const { ssid = '', password = '', encryption = 'WPA', hidden = false } = data;
      return `WIFI:S:${ssid};T:${encryption};P:${password};${hidden ? 'H:true;' : ''};`;
    }
    case 'vcard': {
      const { name = '', phone = '', email = '', company = '', title = '', url = '' } = data;
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${name}`,
        title ? `TITLE:${title}` : '',
        company ? `ORG:${company}` : '',
        phone ? `TEL:${phone}` : '',
        email ? `EMAIL:${email}` : '',
        url ? `URL:${url}` : '',
        'END:VCARD'
      ].filter(Boolean).join('\n');
    }
    case 'email': {
      const { to = '', subject = '', body = '' } = data;
      return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    case 'url':
    case 'text':
    default:
      return typeof data === 'string' ? data : data.text || '';
  }
}

/**
 * Generate a QR code as a data URL.
 */
export async function generateQR(text, options = {}) {
  const {
    size = 300,
    darkColor = '#000000',
    lightColor = '#ffffff',
    errorCorrection = 'M'
  } = options;

  return await QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: {
      dark: darkColor,
      light: lightColor
    },
    errorCorrectionLevel: errorCorrection
  });
}

/**
 * Generate a QR code as an SVG string.
 */
export async function generateQRSVG(text, options = {}) {
  const {
    size = 300,
    darkColor = '#000000',
    lightColor = '#ffffff',
    errorCorrection = 'M'
  } = options;

  return await QRCode.toString(text, {
    type: 'svg',
    width: size,
    margin: 2,
    color: {
      dark: darkColor,
      light: lightColor
    },
    errorCorrectionLevel: errorCorrection
  });
}

/**
 * Generate QR code and render directly to a canvas element.
 */
export async function generateQRToCanvas(canvas, text, options = {}) {
  const {
    size = 300,
    darkColor = '#000000',
    lightColor = '#ffffff',
    errorCorrection = 'M'
  } = options;

  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 2,
    color: {
      dark: darkColor,
      light: lightColor
    },
    errorCorrectionLevel: errorCorrection
  });
}

/**
 * Generate a printable A4 PDF Flyer embedding the QR Code.
 */
export async function generateQRPdfFlyer(text, options = {}) {
  const {
    title = 'Scan QR Code',
    subtitle = 'Point your mobile camera at this code to access',
    darkColor = '#000000',
    lightColor = '#ffffff',
    errorCorrection = 'H'
  } = options;

  const qrDataUrl = await generateQR(text, {
    size: 600,
    darkColor,
    lightColor,
    errorCorrection
  });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Top Decorative Accent Bar
  page.drawRectangle({
    x: 0,
    y: height - 12,
    width,
    height: 12,
    color: rgb(0.31, 0.27, 0.9)
  });

  // Title Banner
  page.drawText(title, {
    x: 50,
    y: height - 80,
    size: 26,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.22)
  });

  page.drawText(subtitle, {
    x: 50,
    y: height - 106,
    size: 12,
    font,
    color: rgb(0.4, 0.45, 0.55)
  });

  // QR Code Image Frame
  const qrBase64 = qrDataUrl.split(',')[1];
  const qrBytes = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
  const embeddedQrImage = await pdfDoc.embedPng(qrBytes);

  const qrSize = 340;
  const qrX = (width - qrSize) / 2;
  const qrY = height - 150 - qrSize;

  // Frame Background Card
  page.drawRectangle({
    x: qrX - 16,
    y: qrY - 16,
    width: qrSize + 32,
    height: qrSize + 32,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.88, 0.9, 0.94),
    borderWidth: 1.5
  });

  page.drawImage(embeddedQrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize
  });

  // Instruction Box
  page.drawRectangle({
    x: 50,
    y: qrY - 80,
    width: width - 100,
    height: 48,
    color: rgb(0.95, 0.96, 0.98)
  });

  page.drawText(`Target: ${text.slice(0, 65)}`, {
    x: 66,
    y: qrY - 60,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35)
  });

  // Footer
  page.drawText('Generated by DocScalar Studio • High Resolution Vector QR', {
    x: width / 2 - 130,
    y: 30,
    size: 9,
    font,
    color: rgb(0.6, 0.65, 0.75)
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
