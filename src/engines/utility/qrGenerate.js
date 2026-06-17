/* QR Code generation engine */
import QRCode from 'qrcode';

/**
 * Generate a QR code as a data URL.
 * @param {string} text - The data to encode
 * @param {object} options - { size, darkColor, lightColor, errorCorrection }
 * @returns {Promise<string>} - Data URL of the QR code image
 */
export async function generateQR(text, options = {}) {
  const {
    size = 300,
    darkColor = '#000000',
    lightColor = '#ffffff',
    errorCorrection = 'M',
  } = options;

  const dataUrl = await QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: errorCorrection,
  });

  return dataUrl;
}

/**
 * Generate a QR code as an SVG string.
 * @param {string} text - The data to encode
 * @param {object} options - { size, darkColor, lightColor, errorCorrection }
 * @returns {Promise<string>} - SVG string of the QR code image
 */
export async function generateQRSVG(text, options = {}) {
  const {
    size = 300,
    darkColor = '#000000',
    lightColor = '#ffffff',
    errorCorrection = 'M',
  } = options;

  const svgString = await QRCode.toString(text, {
    type: 'svg',
    width: size,
    margin: 2,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: errorCorrection,
  });

  return svgString;
}

/**
 * Generate QR code and render to a canvas element.
 */
export async function generateQRToCanvas(canvas, text, options = {}) {
  const {
    size = 300,
    darkColor = '#000000',
    lightColor = '#ffffff',
    errorCorrection = 'M',
  } = options;

  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 2,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: errorCorrection,
  });
}
