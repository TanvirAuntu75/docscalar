/**
 * DocScalar PDF Editor Geometry & Coordinate Transformation Engine
 * 
 * Provides unified, mathematically verified mapping functions for:
 * 1. Visual canvas coordinates <-> PDF user space coordinates across all 4 rotation angles (0°, 90°, 180°, 270°).
 * 2. Non-zero CropBox/MediaBox origin translation.
 * 3. Exact distance calculation and shape hit testing.
 * 4. Length-aware text bounding box hit testing for eraser and selection tools.
 * 5. Annotation bounding boxes and vector translations.
 */

/**
 * Extracts CropBox or MediaBox origin and dimensions along with normalized rotation angle.
 * @param {object} page - pdf-lib or PDF.js page object
 * @returns {{ originX: number, originY: number, width: number, height: number, rotation: number }}
 */
export function getPageBoxAndRotation(page) {
  if (!page) {
    return { originX: 0, originY: 0, width: 595, height: 842, rotation: 0 };
  }

  let rotation = 0;
  if (typeof page.getRotation === 'function') {
    const rotObj = page.getRotation();
    rotation = (rotObj?.angle ?? 0) % 360;
  } else if (typeof page.rotate === 'number') {
    rotation = page.rotate % 360;
  } else if (typeof page.rotation === 'number') {
    rotation = page.rotation % 360;
  }
  rotation = (rotation + 360) % 360;

  let box = null;
  if (typeof page.getCropBox === 'function') {
    box = page.getCropBox();
  }
  if (!box && typeof page.getMediaBox === 'function') {
    box = page.getMediaBox();
  }

  if (box && typeof box.width === 'number' && typeof box.height === 'number') {
    return {
      originX: box.x ?? 0,
      originY: box.y ?? 0,
      width: box.width,
      height: box.height,
      rotation
    };
  }

  if (typeof page.getSize === 'function') {
    const size = page.getSize();
    return {
      originX: page.getX?.() ?? 0,
      originY: page.getY?.() ?? 0,
      width: size.width ?? 595,
      height: size.height ?? 842,
      rotation
    };
  }

  return { originX: 0, originY: 0, width: 595, height: 842, rotation: 0 };
}

/**
 * Maps a normalized visual point (xPercent in [0,1] from left, yPercent in [0,1] from top)
 * into unrotated PDF user space coordinates (pdfX, pdfY).
 * 
 * Verified against PDF.js PageViewport.convertToPdfPoint for all 4 rotation angles.
 * 
 * @param {{ xPercent: number, yPercent: number }} visualPt
 * @param {{ originX: number, originY: number, width: number, height: number }} pageBox
 * @param {number} rotation - 0, 90, 180, or 270 degrees
 * @returns {{ x: number, y: number }}
 */
export function mapVisualToPdfPoint(visualPt, pageBox, rotation = 0) {
  const xp = Math.max(0, Math.min(1, visualPt?.xPercent ?? 0));
  const yp = Math.max(0, Math.min(1, visualPt?.yPercent ?? 0));
  const { originX = 0, originY = 0, width: W = 595, height: H = 842 } = pageBox;

  const rot = ((rotation % 360) + 360) % 360;

  switch (rot) {
    case 90:
      // Screen TL (0,0) -> PDF (originX, originY)
      // Screen TR (1,0) -> PDF (originX, originY + H)
      // Screen BL (0,1) -> PDF (originX + W, originY)
      // Screen BR (1,1) -> PDF (originX + W, originY + H)
      return {
        x: originX + yp * W,
        y: originY + xp * H
      };
    case 180:
      // Screen TL (0,0) -> PDF (originX + W, originY)
      // Screen TR (1,0) -> PDF (originX, originY)
      // Screen BL (0,1) -> PDF (originX + W, originY + H)
      // Screen BR (1,1) -> PDF (originX, originY + H)
      return {
        x: originX + (1 - xp) * W,
        y: originY + yp * H
      };
    case 270:
      // Screen TL (0,0) -> PDF (originX + W, originY + H)
      // Screen TR (1,0) -> PDF (originX + W, originY)
      // Screen BL (0,1) -> PDF (originX, originY + H)
      // Screen BR (1,1) -> PDF (originX, originY)
      return {
        x: originX + (1 - yp) * W,
        y: originY + (1 - xp) * H
      };
    case 0:
    default:
      // Standard: Screen TL (0,0) -> PDF (originX, originY + H)
      // Screen BL (0,1) -> PDF (originX, originY)
      return {
        x: originX + xp * W,
        y: originY + (1 - yp) * H
      };
  }
}

/**
 * Maps a normalized visual rectangle (xPercent, yPercent, widthPercent, heightPercent)
 * to an unrotated PDF coordinate bounding box { x, y, width, height } where (x, y) is lower-left.
 * 
 * @param {{ xPercent: number, yPercent: number, widthPercent: number, heightPercent: number }} visualRect
 * @param {{ originX: number, originY: number, width: number, height: number }} pageBox
 * @param {number} rotation
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function mapVisualRectToPdfRect(visualRect, pageBox, rotation = 0) {
  const { xPercent = 0, yPercent = 0, widthPercent = 0, heightPercent = 0 } = visualRect;
  const { originX = 0, originY = 0, width: W = 595, height: H = 842 } = pageBox;

  const rot = ((rotation % 360) + 360) % 360;

  if (rot === 90) {
    const pdfX = originX + yPercent * W;
    const pdfY = originY + xPercent * H;
    const rectW = heightPercent * W;
    const rectH = widthPercent * H;
    return { x: pdfX, y: pdfY, width: rectW, height: rectH };
  } else if (rot === 180) {
    const pdfX = originX + (1 - xPercent - widthPercent) * W;
    const pdfY = originY + yPercent * H;
    const rectW = widthPercent * W;
    const rectH = heightPercent * H;
    return { x: pdfX, y: pdfY, width: rectW, height: rectH };
  } else if (rot === 270) {
    const pdfX = originX + (1 - yPercent - heightPercent) * W;
    const pdfY = originY + (1 - xPercent - widthPercent) * H;
    const rectW = heightPercent * W;
    const rectH = widthPercent * H;
    return { x: pdfX, y: pdfY, width: rectW, height: rectH };
  }

  // 0 degrees
  const pdfX = originX + xPercent * W;
  const pdfY = originY + (1 - yPercent - heightPercent) * H;
  const rectW = widthPercent * W;
  const rectH = heightPercent * H;
  return { x: pdfX, y: pdfY, width: rectW, height: rectH };
}

/**
 * Calculates Euclidean shortest distance from point (px, py) to segment (x1, y1)-(x2, y2).
 */
export function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

/**
 * Estimates visual width and height of text annotation as normalized percent of viewport.
 * @param {string} text
 * @param {number} fontSize - in points/pixels
 * @param {{ width: number, height: number }} viewportDimensions
 * @returns {{ widthPercent: number, heightPercent: number }}
 */
export function estimateTextDimensions(text, fontSize = 14, viewportDimensions = { width: 595, height: 842 }) {
  const length = (text || '').length;
  // Average glyph aspect ratio for proportional fonts is ~0.55 of font size
  const pixelWidth = Math.max(12, length * fontSize * 0.55);
  const pixelHeight = Math.max(12, fontSize * 1.25);

  const vw = Math.max(10, viewportDimensions?.width || 595);
  const vh = Math.max(10, viewportDimensions?.height || 842);

  return {
    widthPercent: pixelWidth / vw,
    heightPercent: pixelHeight / vh
  };
}

/**
 * Checks whether click point (px, py in percent) hits an annotation.
 * Accurately calculates bounding boxes for long text strings, shapes, pen paths, and arrows.
 * 
 * @param {object} anno
 * @param {{ xPercent: number, yPercent: number }} clickPt
 * @param {number} [threshold=0.03]
 * @param {{ width: number, height: number }} [viewportDimensions]
 * @returns {boolean}
 */
export function isAnnotationHit(anno, clickPt, threshold = 0.03, viewportDimensions = { width: 595, height: 842 }) {
  if (!anno || !clickPt) return false;
  const px = clickPt.xPercent;
  const py = clickPt.yPercent;

  if (anno.type === 'pen' || anno.type === 'highlight' || anno.type === 'whiteout') {
    const points = anno.points || [];
    if (points.length === 0) return false;
    if (points.length === 1) {
      return Math.hypot(points[0].xPercent - px, points[0].yPercent - py) < threshold;
    }
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (pointToSegmentDist(px, py, p1.xPercent, p1.yPercent, p2.xPercent, p2.yPercent) < threshold) {
        return true;
      }
    }
    return false;
  }

  if (anno.type === 'shape') {
    if (!anno.startPt || !anno.endPt) return false;
    const sx = anno.startPt.xPercent;
    const sy = anno.startPt.yPercent;
    const ex = anno.endPt.xPercent;
    const ey = anno.endPt.yPercent;

    if (anno.shapeType === 'line' || anno.shapeType === 'arrow') {
      return pointToSegmentDist(px, py, sx, sy, ex, ey) < threshold;
    }

    if (anno.shapeType === 'rectangle') {
      const minX = Math.min(sx, ex);
      const maxX = Math.max(sx, ex);
      const minY = Math.min(sy, ey);
      const maxY = Math.max(sy, ey);

      if (px >= minX - threshold && px <= maxX + threshold && py >= minY - threshold && py <= maxY + threshold) {
        const d1 = pointToSegmentDist(px, py, minX, minY, maxX, minY);
        const d2 = pointToSegmentDist(px, py, maxX, minY, maxX, maxY);
        const d3 = pointToSegmentDist(px, py, maxX, maxY, minX, maxY);
        const d4 = pointToSegmentDist(px, py, minX, maxY, minX, minY);
        return Math.min(d1, d2, d3, d4) < threshold || (px >= minX && px <= maxX && py >= minY && py <= maxY);
      }
      return false;
    }

    if (anno.shapeType === 'circle') {
      const rx = Math.abs(ex - sx) / 2;
      const ry = Math.abs(ey - sy) / 2;
      const cx = Math.min(sx, ex) + rx;
      const cy = Math.min(sy, ey) + ry;
      if (rx === 0 || ry === 0) return Math.hypot(px - cx, py - cy) < threshold;

      const normDist = Math.hypot((px - cx) / rx, (py - cy) / ry);
      const marginRatio = Math.max(threshold / Math.max(0.01, rx), threshold / Math.max(0.01, ry));
      return normDist <= 1 + marginRatio;
    }
  }

  if (anno.type === 'text') {
    const fontSize = anno.size || 14;
    const dims = estimateTextDimensions(anno.text || '', fontSize, viewportDimensions);
    const left = anno.xPercent - threshold * 0.5;
    const right = anno.xPercent + dims.widthPercent + threshold * 0.5;
    // Text baseline sits near yPercent; allow coverage above and below
    const top = anno.yPercent - dims.heightPercent - threshold * 0.5;
    const bottom = anno.yPercent + threshold * 0.8;

    return px >= left && px <= right && py >= top && py <= bottom;
  }

  if (anno.type === 'text-edit') {
    const left = anno.xPercent;
    const right = anno.xPercent + (anno.widthPercent || 0.1);
    const top = anno.yPercent;
    const bottom = anno.yPercent + (anno.heightPercent || 0.03);
    return px >= left - threshold && px <= right + threshold && py >= top - threshold && py <= bottom + threshold;
  }

  return false;
}

/**
 * Computes bounding box { minX, minY, maxX, maxY } for any annotation in normalized percent coordinates.
 */
export function getAnnotationBounds(anno, viewportDimensions = { width: 595, height: 842 }) {
  if (!anno) return null;

  if (anno.type === 'pen' || anno.type === 'highlight' || anno.type === 'whiteout') {
    const pts = anno.points || [];
    if (pts.length === 0) return null;
    let minX = pts[0].xPercent, maxX = pts[0].xPercent;
    let minY = pts[0].yPercent, maxY = pts[0].yPercent;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].xPercent < minX) minX = pts[i].xPercent;
      if (pts[i].xPercent > maxX) maxX = pts[i].xPercent;
      if (pts[i].yPercent < minY) minY = pts[i].yPercent;
      if (pts[i].yPercent > maxY) maxY = pts[i].yPercent;
    }
    return { minX, minY, maxX, maxY };
  }

  if (anno.type === 'shape') {
    if (!anno.startPt || !anno.endPt) return null;
    return {
      minX: Math.min(anno.startPt.xPercent, anno.endPt.xPercent),
      minY: Math.min(anno.startPt.yPercent, anno.endPt.yPercent),
      maxX: Math.max(anno.startPt.xPercent, anno.endPt.xPercent),
      maxY: Math.max(anno.startPt.yPercent, anno.endPt.yPercent)
    };
  }

  if (anno.type === 'text') {
    const dims = estimateTextDimensions(anno.text, anno.size || 14, viewportDimensions);
    return {
      minX: anno.xPercent,
      minY: Math.max(0, anno.yPercent - dims.heightPercent),
      maxX: Math.min(1, anno.xPercent + dims.widthPercent),
      maxY: Math.min(1, anno.yPercent + dims.heightPercent * 0.25)
    };
  }

  if (anno.type === 'text-edit') {
    return {
      minX: anno.xPercent,
      minY: anno.yPercent,
      maxX: Math.min(1, anno.xPercent + (anno.widthPercent || 0.1)),
      maxY: Math.min(1, anno.yPercent + (anno.heightPercent || 0.03))
    };
  }

  return null;
}

/**
 * Sanitizes and validates an annotation object, returning a clean normalized object
 * or null if unrecoverable or invalid. Converts legacy shape definitions if needed.
 */
export function sanitizeAnnotation(anno) {
  if (!anno || typeof anno !== 'object') return null;
  const clone = { ...anno };

  if (clone.type === 'pen' || clone.type === 'highlight' || clone.type === 'whiteout') {
    if (!Array.isArray(clone.points) || clone.points.length < 2) return null;
    const validPoints = clone.points.filter(
      p => p && typeof p.xPercent === 'number' && typeof p.yPercent === 'number' && !isNaN(p.xPercent) && !isNaN(p.yPercent)
    );
    if (validPoints.length < 2) return null;
    clone.points = validPoints;
    clone.thickness = typeof clone.thickness === 'number' && !isNaN(clone.thickness) ? clone.thickness : (clone.type === 'whiteout' ? 18 : 3);
    clone.color = clone.type === 'whiteout' ? '#FFFFFF' : (clone.color || '#EF4444');
    return clone;
  }

  if (clone.type === 'shape') {
    let startPt = clone.startPt;
    let endPt = clone.endPt;

    // Convert legacy shape schema (xPercent, yPercent, widthPercent, heightPercent)
    if (!startPt && typeof clone.xPercent === 'number' && typeof clone.yPercent === 'number') {
      startPt = { xPercent: clone.xPercent, yPercent: clone.yPercent };
      endPt = {
        xPercent: clone.xPercent + (clone.widthPercent || 0.1),
        yPercent: clone.yPercent + (clone.heightPercent || 0.1)
      };
    }

    if (!startPt || !endPt ||
        typeof startPt.xPercent !== 'number' || typeof startPt.yPercent !== 'number' ||
        typeof endPt.xPercent !== 'number' || typeof endPt.yPercent !== 'number' ||
        isNaN(startPt.xPercent) || isNaN(startPt.yPercent) ||
        isNaN(endPt.xPercent) || isNaN(endPt.yPercent)) {
      return null;
    }

    clone.startPt = startPt;
    clone.endPt = endPt;
    clone.thickness = typeof clone.thickness === 'number' && !isNaN(clone.thickness) ? clone.thickness : 3;
    clone.color = clone.color || '#EF4444';
    return clone;
  }

  if (clone.type === 'text') {
    if (typeof clone.xPercent !== 'number' || typeof clone.yPercent !== 'number' ||
        isNaN(clone.xPercent) || isNaN(clone.yPercent)) {
      return null;
    }
    clone.size = typeof clone.size === 'number' && !isNaN(clone.size) ? clone.size : 14;
    clone.text = clone.text || '';
    clone.color = clone.color || '#000000';
    clone.fontFamily = clone.fontFamily || 'Helvetica';
    clone.whiteout = Boolean(clone.whiteout);
    return clone;
  }

  if (clone.type === 'text-edit') {
    if (typeof clone.xPercent !== 'number' || typeof clone.yPercent !== 'number') return null;
    return clone;
  }

  return clone;
}

/**
 * Translates an annotation by deltaXPercent and deltaYPercent.
 * Clamps coordinates within [0, 1] bounds.
 */
export function translateAnnotation(anno, deltaX, deltaY) {
  if (!anno) return anno;
  const clone = JSON.parse(JSON.stringify(anno));

  if (clone.type === 'pen' || clone.type === 'highlight' || clone.type === 'whiteout') {
    clone.points = (clone.points || []).map(p => ({
      ...p,
      xPercent: Math.max(0, Math.min(1, p.xPercent + deltaX)),
      yPercent: Math.max(0, Math.min(1, p.yPercent + deltaY))
    }));
  } else if (clone.type === 'shape') {
    if (clone.startPt && clone.endPt) {
      clone.startPt = {
        xPercent: Math.max(0, Math.min(1, clone.startPt.xPercent + deltaX)),
        yPercent: Math.max(0, Math.min(1, clone.startPt.yPercent + deltaY))
      };
      clone.endPt = {
        xPercent: Math.max(0, Math.min(1, clone.endPt.xPercent + deltaX)),
        yPercent: Math.max(0, Math.min(1, clone.endPt.yPercent + deltaY))
      };
    }
  } else if (clone.type === 'text') {
    clone.xPercent = Math.max(0, Math.min(1, (clone.xPercent || 0) + deltaX));
    clone.yPercent = Math.max(0, Math.min(1, (clone.yPercent || 0) + deltaY));
  } else if (clone.type === 'text-edit') {
    clone.xPercent = Math.max(0, Math.min(1, (clone.xPercent || 0) + deltaX));
    clone.yPercent = Math.max(0, Math.min(1, (clone.yPercent || 0) + deltaY));
  }

  return clone;
}

/**
 * Returns resize anchor handles for a selected annotation.
 * For shapes and text: returns corner anchors { id, xPercent, yPercent, cursor }.
 * For lines/arrows: returns { id: 'start', xPercent, yPercent, cursor: 'crosshair' } and { id: 'end', ... }.
 */
export function getAnnotationResizeHandles(anno, viewportDimensions = { width: 595, height: 842 }) {
  if (!anno) return [];

  if (anno.type === 'shape' && (anno.shapeType === 'line' || anno.shapeType === 'arrow')) {
    if (!anno.startPt || !anno.endPt) return [];
    return [
      { id: 'start', xPercent: anno.startPt.xPercent, yPercent: anno.startPt.yPercent, cursor: 'crosshair' },
      { id: 'end', xPercent: anno.endPt.xPercent, yPercent: anno.endPt.yPercent, cursor: 'crosshair' }
    ];
  }

  const bounds = getAnnotationBounds(anno, viewportDimensions);
  if (!bounds) return [];

  // Corner handles
  return [
    { id: 'tl', xPercent: bounds.minX, yPercent: bounds.minY, cursor: 'nwse-resize' },
    { id: 'tr', xPercent: bounds.maxX, yPercent: bounds.minY, cursor: 'nesw-resize' },
    { id: 'bl', xPercent: bounds.minX, yPercent: bounds.maxY, cursor: 'nesw-resize' },
    { id: 'br', xPercent: bounds.maxX, yPercent: bounds.maxY, cursor: 'nwse-resize' }
  ];
}

/**
 * Checks if click point is near a specific handle within tolerance.
 */
export function isHandleHit(handle, clickPt, threshold = 0.025) {
  if (!handle || !clickPt) return false;
  return Math.hypot(handle.xPercent - clickPt.xPercent, handle.yPercent - clickPt.yPercent) <= threshold;
}

/**
 * Resizes or scales an annotation based on the dragged handle and pointer position.
 * For text: scales font size dynamically (allowing users to make text bigger or smaller).
 * For shapes: modifies startPt / endPt bounds.
 */
export function resizeAnnotation(initialAnno, handleId, currentPt, initialBounds, initialFontSize = 14, viewportDimensions = { width: 595, height: 842 }) {
  if (!initialAnno || !handleId || !currentPt) return initialAnno;

  const clone = JSON.parse(JSON.stringify(initialAnno));

  if (clone.type === 'text') {
    const bounds = initialBounds || getAnnotationBounds(initialAnno, viewportDimensions);
    if (!bounds) return clone;

    // Determine opposite anchor point based on handle
    let anchorX = bounds.minX;
    let anchorY = bounds.minY;

    if (handleId === 'br') {
      anchorX = bounds.minX;
      anchorY = bounds.minY;
    } else if (handleId === 'bl') {
      anchorX = bounds.maxX;
      anchorY = bounds.minY;
    } else if (handleId === 'tr') {
      anchorX = bounds.minX;
      anchorY = bounds.maxY;
    } else if (handleId === 'tl') {
      anchorX = bounds.maxX;
      anchorY = bounds.maxY;
    }

    const initialW = Math.max(0.01, bounds.maxX - bounds.minX);
    const initialH = Math.max(0.01, bounds.maxY - bounds.minY);

    const currentW = Math.abs(currentPt.xPercent - anchorX);
    const currentH = Math.abs(currentPt.yPercent - anchorY);

    // Diagonal scaling ratio
    const initialDiag = Math.hypot(initialW, initialH);
    const currentDiag = Math.hypot(currentW, currentH);
    const scale = Math.max(0.15, currentDiag / Math.max(0.005, initialDiag));

    const baseSize = initialFontSize || clone.size || 14;
    const newSize = Math.round(Math.max(8, Math.min(120, baseSize * scale)));
    clone.size = newSize;

    const newDims = estimateTextDimensions(clone.text || '', newSize, viewportDimensions);

    // For tl or bl handles, anchor right edge
    if (handleId === 'tl' || handleId === 'bl') {
      clone.xPercent = Math.max(0, anchorX - newDims.widthPercent);
    }

    // For top handles (tl, tr), anchor baseline to bottom of text box
    if (handleId === 'tl' || handleId === 'tr') {
      clone.yPercent = Math.max(newDims.heightPercent, anchorY - newDims.heightPercent * 0.25);
    }

    return clone;
  }

  if (clone.type === 'shape') {
    if (clone.shapeType === 'line' || clone.shapeType === 'arrow') {
      if (handleId === 'start') {
        clone.startPt = { ...currentPt };
      } else if (handleId === 'end') {
        clone.endPt = { ...currentPt };
      }
      return clone;
    }

    // Rectangle or Circle: 4-Quadrant Fluid Resizing (Opposite-corner anchor)
    if (!clone.startPt || !clone.endPt) return clone;
    const bounds = initialBounds || {
      minX: Math.min(clone.startPt.xPercent, clone.endPt.xPercent),
      minY: Math.min(clone.startPt.yPercent, clone.endPt.yPercent),
      maxX: Math.max(clone.startPt.xPercent, clone.endPt.xPercent),
      maxY: Math.max(clone.startPt.yPercent, clone.endPt.yPercent)
    };

    let anchorX = bounds.minX;
    let anchorY = bounds.minY;

    if (handleId === 'br') {
      anchorX = bounds.minX;
      anchorY = bounds.minY;
    } else if (handleId === 'tr') {
      anchorX = bounds.minX;
      anchorY = bounds.maxY;
    } else if (handleId === 'bl') {
      anchorX = bounds.maxX;
      anchorY = bounds.minY;
    } else if (handleId === 'tl') {
      anchorX = bounds.maxX;
      anchorY = bounds.maxY;
    }

    const minX = Math.min(anchorX, currentPt.xPercent);
    const maxX = Math.max(anchorX, currentPt.xPercent);
    const minY = Math.min(anchorY, currentPt.yPercent);
    const maxY = Math.max(anchorY, currentPt.yPercent);

    const safeW = Math.max(0.005, maxX - minX);
    const safeH = Math.max(0.005, maxY - minY);

    clone.startPt = { xPercent: minX, yPercent: minY };
    clone.endPt = { xPercent: minX + safeW, yPercent: minY + safeH };
    return clone;
  }

  // Pen, Highlighter & Whiteout Stroke Resizing via Bounding Corner Handles
  if (clone.type === 'pen' || clone.type === 'highlight' || clone.type === 'whiteout') {
    const points = clone.points || [];
    if (points.length === 0) return clone;

    const bounds = initialBounds || getAnnotationBounds(initialAnno, viewportDimensions);
    if (!bounds) return clone;

    let anchorX = bounds.minX;
    let anchorY = bounds.minY;

    if (handleId === 'br') {
      anchorX = bounds.minX;
      anchorY = bounds.minY;
    } else if (handleId === 'tr') {
      anchorX = bounds.minX;
      anchorY = bounds.maxY;
    } else if (handleId === 'bl') {
      anchorX = bounds.maxX;
      anchorY = bounds.minY;
    } else if (handleId === 'tl') {
      anchorX = bounds.maxX;
      anchorY = bounds.maxY;
    }

    const initW = Math.max(0.005, bounds.maxX - bounds.minX);
    const initH = Math.max(0.005, bounds.maxY - bounds.minY);

    const newW = Math.max(0.005, Math.abs(currentPt.xPercent - anchorX));
    const newH = Math.max(0.005, Math.abs(currentPt.yPercent - anchorY));

    const scaleX = newW / initW;
    const scaleY = newH / initH;

    const flipX = (currentPt.xPercent < anchorX) !== (handleId === 'tl' || handleId === 'bl') ? -1 : 1;
    const flipY = (currentPt.yPercent < anchorY) !== (handleId === 'tl' || handleId === 'tr') ? -1 : 1;

    clone.points = points.map(p => ({
      ...p,
      xPercent: Math.max(0, Math.min(1, anchorX + (p.xPercent - anchorX) * scaleX * flipX)),
      yPercent: Math.max(0, Math.min(1, anchorY + (p.yPercent - anchorY) * scaleY * flipY))
    }));
    return clone;
  }

  return clone;
}
