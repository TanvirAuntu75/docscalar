/**
 * DocForge PDF Coordinate & Rotation Normalization Engine
 * 
 * Translates between visual screen coordinates (top-left origin [0..1] ratio)
 * and physical PDF coordinate space (bottom-left origin in points), correctly
 * accounting for page /Rotate (0, 90, 180, 270) and non-zero MediaBox bounds.
 */

/**
 * Normalizes a page's dimensions and rotation metadata.
 * @param {object} page - pdf-lib PDFPage or object with { getWidth, getHeight, getRotation, getMediaBox }
 * @returns {object} Page geometric properties
 */
export function getPageGeometry(page) {
  let width = 0;
  let height = 0;
  let rotationAngle = 0;
  let minX = 0;
  let minY = 0;
  let mbWidth = 0;
  let mbHeight = 0;

  // Handle pdf-lib PDFPage
  if (page && typeof page.getWidth === 'function') {
    width = page.getWidth();
    height = page.getHeight();
    rotationAngle = page.getRotation?.()?.angle || 0;
    
    const mediaBox = page.getMediaBox ? page.getMediaBox() : { x: 0, y: 0, width, height };
    minX = mediaBox.x || 0;
    minY = mediaBox.y || 0;
    mbWidth = mediaBox.width || width;
    mbHeight = mediaBox.height || height;
  } 
  // Handle raw dimensions object or PDF.js viewport
  else if (page) {
    minX = page.x || page.minX || 0;
    minY = page.y || page.minY || 0;
    mbWidth = page.width || page.mbWidth || 612;
    mbHeight = page.height || page.mbHeight || 792;
    rotationAngle = page.rotation || page.rotate || 0;
    width = mbWidth;
    height = mbHeight;
  }

  // Normalize rotation angle to 0, 90, 180, or 270
  const normalizedRotation = (((rotationAngle % 360) + 360) % 360);

  // Visual dimensions on screen as viewed by user
  const isLandscapeOrientation = normalizedRotation === 90 || normalizedRotation === 270;
  const viewWidth = isLandscapeOrientation ? mbHeight : mbWidth;
  const viewHeight = isLandscapeOrientation ? mbWidth : mbHeight;

  return {
    minX,
    minY,
    mbWidth,
    mbHeight,
    width,
    height,
    rotation: normalizedRotation,
    viewWidth,
    viewHeight,
    isLandscapeOrientation
  };
}

/**
 * Converts screen-space normalized ratio coordinates [0..1] into physical PDF point coordinates
 * ready for pdf-lib drawText / drawImage calls.
 * 
 * @param {object} params
 * @param {number} params.xRatio - Screen X position as a ratio [0..1] (from left edge of visual page)
 * @param {number} params.yRatio - Screen Y position as a ratio [0..1] (from top edge of visual page)
 * @param {number} params.widthRatio - Screen width as a ratio [0..1] of visual page width
 * @param {number} params.heightRatio - Screen height as a ratio [0..1] of visual page height
 * @param {object} params.pageGeometry - Output from getPageGeometry()
 * @returns {object} { x, y, width, height, rotateDegrees } for pdf-lib drawing
 */
export function screenRatioToPdfPoints({
  xRatio,
  yRatio,
  widthRatio,
  heightRatio,
  pageGeometry
}) {
  const { minX, minY, mbWidth, mbHeight, rotation, viewWidth, viewHeight } = pageGeometry;

  // Visual dimensions on screen in PDF points
  const visualW = widthRatio * viewWidth;
  const visualH = heightRatio * viewHeight;
  
  // Visual top-left coordinate on screen in PDF points
  const screenLeft = xRatio * viewWidth;
  const screenTop = yRatio * viewHeight;

  let pdfX = 0;
  let pdfY = 0;
  let drawW = visualW;
  let drawH = visualH;
  let rotateDegrees = 0;

  switch (rotation) {
    case 0:
      // Standard unrotated page:
      // Screen (0,0) is top-left -> PDF (minX, minY + mbHeight)
      pdfX = minX + screenLeft;
      pdfY = minY + mbHeight - screenTop - visualH;
      drawW = visualW;
      drawH = visualH;
      rotateDegrees = 0;
      break;

    case 90:
      // Page rotated 90 deg clockwise in viewer:
      // When drawn in pdf-lib on a page with /Rotate 90, pdf-lib's coordinate system is
      // unrotated. To appear at visual (screenLeft, screenTop), we rotate the drawn element
      // by 270 deg (counter-clockwise) and position its lower-left anchor.
      pdfX = minX + screenTop;
      pdfY = minY + screenLeft;
      drawW = visualW;
      drawH = visualH;
      rotateDegrees = 270;
      break;

    case 180:
      // Page rotated 180 deg (upside down):
      pdfX = minX + mbWidth - screenLeft - visualW;
      pdfY = minY + screenTop;
      drawW = visualW;
      drawH = visualH;
      rotateDegrees = 180;
      break;

    case 270:
      // Page rotated 270 deg clockwise (90 deg counter-clockwise):
      pdfX = minX + mbWidth - screenTop - visualH;
      pdfY = minY + mbHeight - screenLeft;
      drawW = visualW;
      drawH = visualH;
      rotateDegrees = 90;
      break;

    default:
      pdfX = minX + screenLeft;
      pdfY = minY + mbHeight - screenTop - visualH;
      drawW = visualW;
      drawH = visualH;
      rotateDegrees = 0;
  }

  return {
    x: pdfX,
    y: pdfY,
    width: drawW,
    height: drawH,
    rotateDegrees
  };
}

/**
 * Converts physical PDF point coordinates back to screen ratios [0..1]
 * (Used for restoring drafts, re-editing fields, or reading AcroForm coordinates)
 * 
 * @param {object} params
 * @param {number} params.pdfX - Lower-left X coordinate in PDF space
 * @param {number} params.pdfY - Lower-left Y coordinate in PDF space
 * @param {number} params.pdfWidth - Width in PDF points
 * @param {number} params.pdfHeight - Height in PDF points
 * @param {object} params.pageGeometry - Output from getPageGeometry()
 * @returns {object} { xRatio, yRatio, widthRatio, heightRatio }
 */
export function pdfPointsToScreenRatio({
  pdfX,
  pdfY,
  pdfWidth,
  pdfHeight,
  pageGeometry
}) {
  const { minX, minY, mbWidth, mbHeight, rotation, viewWidth, viewHeight } = pageGeometry;

  let screenLeft = 0;
  let screenTop = 0;
  let visualW = pdfWidth;
  let visualH = pdfHeight;

  switch (rotation) {
    case 0:
      screenLeft = pdfX - minX;
      screenTop = mbHeight - (pdfY - minY) - pdfHeight;
      visualW = pdfWidth;
      visualH = pdfHeight;
      break;

    case 90:
      screenLeft = pdfY - minY;
      screenTop = pdfX - minX;
      visualW = pdfWidth;
      visualH = pdfHeight;
      break;

    case 180:
      screenLeft = mbWidth - (pdfX - minX) - pdfWidth;
      screenTop = pdfY - minY;
      visualW = pdfWidth;
      visualH = pdfHeight;
      break;

    case 270:
      screenLeft = mbHeight - (pdfY - minY);
      screenTop = mbWidth - (pdfX - minX) - pdfHeight;
      visualW = pdfWidth;
      visualH = pdfHeight;
      break;

    default:
      screenLeft = pdfX - minX;
      screenTop = mbHeight - (pdfY - minY) - pdfHeight;
      visualW = pdfWidth;
      visualH = pdfHeight;
  }

  return {
    xRatio: Math.max(0, Math.min(1, screenLeft / viewWidth)),
    yRatio: Math.max(0, Math.min(1, screenTop / viewHeight)),
    widthRatio: Math.max(0.01, Math.min(1, visualW / viewWidth)),
    heightRatio: Math.max(0.01, Math.min(1, visualH / viewHeight))
  };
}

/**
 * Calculates clamping boundaries ensuring field bounding boxes never exceed page edges.
 */
export function clampFieldBounds(xRatio, yRatio, widthRatio, heightRatio) {
  const w = Math.max(0.02, Math.min(1.0, widthRatio));
  const h = Math.max(0.01, Math.min(1.0, heightRatio));
  const x = Math.max(0.0, Math.min(1.0 - w, xRatio));
  const y = Math.max(0.0, Math.min(1.0 - h, yRatio));
  return { 
    xRatio: x, 
    yRatio: y, 
    widthRatio: w, 
    heightRatio: h,
    x,
    y,
    width: w,
    height: h
  };
}
