/**
 * pdfLineAnalyzer.js
 * 
 * Intelligent document line analyzer supporting both:
 * 1. Digital PDFs: Vector font bounds, baselines, and line heights via pdf.js getTextContent().
 * 2. Scanned / Raster Documents: Fast horizontal projection profiling (HPP) to detect handwriting and printed ink lines.
 */

/**
 * Intelligently clusters raw text content items from pdf.js into unified, coherent line objects.
 * Solves the "one line 2 boxes" flaw where font style changes (e.g. bold Claude Code),
 * kerned words, or inline numbers split a single visual line into multiple separate boxes.
 * 
 * Invariant: 1 Visual Line = 1 Box.
 * 
 * @param {Array} textContentItems Raw items from pdf.js page.getTextContent()
 * @param {Object} viewport Page viewport ({ width, height, convertToViewportPoint? })
 * @param {number} pageIndex 0-based page index
 * @returns {Array} Array of unified line objects
 */
export function clusterTextItemsIntoLines(textContentItems, viewport, pageIndex = 0) {
  if (!Array.isArray(textContentItems) || textContentItems.length === 0) return [];

  const viewW = viewport?.width || 595;
  const viewH = viewport?.height || 842;

  // 1. Filter and normalize raw PDF.js items
  const validItems = [];
  for (let i = 0; i < textContentItems.length; i++) {
    const item = textContentItems[i];
    if (!item || typeof item.str !== 'string') continue;
    // Keep items with non-empty text, or with positive width if whitespace
    if (item.str.trim().length === 0 && (!item.width || item.width <= 0)) continue;

    const tx = Array.isArray(item.transform) ? item.transform[4] : 0;
    const ty = Array.isArray(item.transform) ? item.transform[5] : 0;
    const tw = typeof item.width === 'number' && item.width > 0 ? item.width : 20;
    const fontH = Array.isArray(item.transform) ? Math.abs(item.transform[3]) : (item.height || 12);

    let vx, vy;
    if (viewport && typeof viewport.convertToViewportPoint === 'function') {
      const pt = viewport.convertToViewportPoint(tx, ty);
      vx = pt[0];
      vy = pt[1];
    } else {
      vx = tx;
      vy = viewH - ty;
    }

    const yOffset = Math.abs(fontH) || 12;

    validItems.push({
      str: item.str,
      fontName: item.fontName || '',
      fontSize: fontH || 12,
      vx,
      vy,
      top: vy - yOffset,
      bottom: vy,
      width: tw,
      height: yOffset,
      right: vx + tw
    });
  }

  if (validItems.length === 0) return [];

  // 2. Sort items by vertical position (baseline vy), then by horizontal vx
  validItems.sort((a, b) => {
    const yDiff = a.vy - b.vy;
    // If baselines are within 35% of font height or 3.5px, consider same vertical band
    const tol = Math.max(3.5, Math.min(a.height, b.height) * 0.35);
    if (Math.abs(yDiff) > tol) {
      return yDiff;
    }
    return a.vx - b.vx;
  });

  // 3. Cluster items that lie on the same horizontal line
  const clusters = [];
  let currentCluster = null;

  for (const item of validItems) {
    if (!currentCluster) {
      currentCluster = {
        items: [item],
        vy: item.vy,
        top: item.top,
        bottom: item.bottom,
        left: item.vx,
        right: item.right,
        maxFontSize: item.fontSize,
        fontFamily: item.fontName
      };
      continue;
    }

    // Check vertical alignment
    const clusterH = Math.max(8, currentCluster.bottom - currentCluster.top);
    const baselineDiff = Math.abs(item.vy - currentCluster.vy);
    const topDiff = Math.abs(item.top - currentCluster.top);

    // Check vertical overlap between bounding boxes
    const vertOverlap = Math.min(currentCluster.bottom, item.bottom) - Math.max(currentCluster.top, item.top);
    const hasVertOverlap = vertOverlap > Math.min(clusterH, item.height) * 0.35;

    const vertTol = Math.max(4, Math.min(clusterH, item.height) * 0.45);
    const isSameVerticalLine = (baselineDiff <= vertTol || topDiff <= vertTol || hasVertOverlap);

    // Check horizontal proximity (avoid merging across column gutters)
    const horizGap = item.vx - currentCluster.right;
    const maxGap = Math.max(45, currentCluster.maxFontSize * 3.5);
    const isNearbyHorizontal = horizGap <= maxGap;

    if (isSameVerticalLine && isNearbyHorizontal) {
      // Add to current cluster
      currentCluster.items.push(item);
      currentCluster.top = Math.min(currentCluster.top, item.top);
      currentCluster.bottom = Math.max(currentCluster.bottom, item.bottom);
      currentCluster.left = Math.min(currentCluster.left, item.vx);
      currentCluster.right = Math.max(currentCluster.right, item.right);
      currentCluster.vy = (currentCluster.vy * (currentCluster.items.length - 1) + item.vy) / currentCluster.items.length;
      currentCluster.maxFontSize = Math.max(currentCluster.maxFontSize, item.fontSize);
      if (!currentCluster.fontFamily && item.fontName) {
        currentCluster.fontFamily = item.fontName;
      }
    } else {
      // Finish previous cluster and start new one
      clusters.push(currentCluster);
      currentCluster = {
        items: [item],
        vy: item.vy,
        top: item.top,
        bottom: item.bottom,
        left: item.vx,
        right: item.right,
        maxFontSize: item.fontSize,
        fontFamily: item.fontName
      };
    }
  }

  if (currentCluster) {
    clusters.push(currentCluster);
  }

  // 4. Construct unified line objects from clusters
  return clusters.map((c, idx) => {
    // Sort constituent items strictly left-to-right
    c.items.sort((a, b) => a.vx - b.vx);

    let combinedText = '';
    for (let k = 0; k < c.items.length; k++) {
      const it = c.items[k];
      if (k === 0) {
        combinedText = it.str;
      } else {
        const prev = c.items[k - 1];
        const gap = it.vx - prev.right;
        // Insert space if there is a gap and neither string contains whitespace boundary
        const needsSpace = !/\s$/.test(combinedText) && !/^\s/.test(it.str) && gap > (it.fontSize * 0.16);
        if (needsSpace) {
          combinedText += ' ';
        }
        combinedText += it.str;
      }
    }

    const id = `text-p${pageIndex}-line-${idx}`;
    const xPercent = Math.max(0, Math.min(1, c.left / viewW));
    const yPercent = Math.max(0, Math.min(1, c.top / viewH));
    const widthPercent = Math.max(0.01, Math.min(1, (c.right - c.left) / viewW));
    const heightPercent = Math.max(0.01, Math.min(1, (c.bottom - c.top) / viewH));

    return {
      id,
      pageIndex,
      originalText: combinedText,
      currentText: combinedText,
      xPercent,
      yPercent,
      widthPercent,
      heightPercent,
      fontSize: c.maxFontSize || 12,
      fontFamily: c.fontFamily || 'Helvetica',
      color: '#000000',
      constituentCount: c.items.length
    };
  });
}

/**
 * Extracts line intervals from digital text lines extracted by pdf.js.
 * @param {Array} extractedTextLines 
 * @param {Object} pageDimensions { width: number, height: number }
 * @returns {Array} List of line intervals with geometry and recommended highlighter thickness
 */
export function analyzeDigitalLines(extractedTextLines, pageDimensions = { width: 595, height: 842 }) {
  if (!Array.isArray(extractedTextLines) || extractedTextLines.length === 0) return [];
  const pageH = pageDimensions.height || 842;

  const lines = extractedTextLines
    .filter(l => l && typeof l.yPercent === 'number' && typeof l.heightPercent === 'number' && l.heightPercent > 0)
    .map((l, idx) => {
      const topPercent = Math.max(0, Math.min(1, l.yPercent));
      const bottomPercent = Math.max(0, Math.min(1, l.yPercent + l.heightPercent));
      const centerPercent = (topPercent + bottomPercent) / 2;
      const heightPt = (bottomPercent - topPercent) * pageH;
      const fontSize = l.fontSize || 12;
      const recommendedThickness = Math.max(16, Math.round(fontSize * 1.35));

      return {
        id: l.id || `digital-line-${idx}`,
        type: 'digital',
        topPercent,
        bottomPercent,
        centerPercent,
        minX: l.xPercent || 0,
        maxX: (l.xPercent || 0) + (l.widthPercent || 1),
        heightPt,
        recommendedThickness
      };
    });

  // Sort top-to-bottom
  lines.sort((a, b) => a.topPercent - b.topPercent);
  return lines;
}

/**
 * Performs high-speed Horizontal Projection Profiling on a rendered canvas bitmap.
 * Identifies distinct text/handwriting bands separated by white space.
 * Executes on a downsampled buffer in <4ms for zero UI stutter.
 * 
 * @param {HTMLCanvasElement} canvas The rendered PDF canvas
 * @param {Object} pageDimensions { width: number, height: number }
 * @param {Object} options Configuration overrides
 * @returns {Array} Detected text line intervals
 */
export function analyzeRasterCanvas(canvas, pageDimensions = { width: 595, height: 842 }, options = {}) {
  if (!canvas || !canvas.width || !canvas.height) return [];

  try {
    const pageH = pageDimensions.height || 842;
    // Downsample to a fast analysis resolution (width ~360px)
    const targetW = options.targetWidth || 360;
    const aspect = canvas.height / canvas.width;
    const targetH = Math.round(targetW * aspect);

    // Create lightweight offscreen canvas for profiling
    const offscreen = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(targetW, targetH)
      : (typeof document !== 'undefined' ? document.createElement('canvas') : null);

    if (!offscreen) return [];
    offscreen.width = targetW;
    offscreen.height = targetH;

    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    ctx.drawImage(canvas, 0, 0, targetW, targetH);
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;

    // Crop out outer 12% margins to avoid scan borders, punch holes, or staple marks
    const leftMargin = Math.round(targetW * 0.12);
    const rightMargin = Math.round(targetW * 0.88);
    const contentW = rightMargin - leftMargin;

    if (contentW <= 10) return [];

    // Compute row ink density
    const rowSums = new Float32Array(targetH);
    for (let y = 0; y < targetH; y++) {
      let inkCount = 0;
      const rowOffset = y * targetW * 4;
      for (let x = leftMargin; x < rightMargin; x++) {
        const idx = rowOffset + x * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Luminance calculation
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 165) {
          inkCount++;
        }
      }
      rowSums[y] = inkCount;
    }

    // 5-tap moving average smoothing
    const smoothed = new Float32Array(targetH);
    for (let y = 0; y < targetH; y++) {
      let sum = 0;
      let count = 0;
      for (let k = -2; k <= 2; k++) {
        const ny = y + k;
        if (ny >= 0 && ny < targetH) {
          sum += rowSums[ny];
          count++;
        }
      }
      smoothed[y] = sum / count;
    }

    const threshold = contentW * 0.018; // At least 1.8% of the row has ink
    const lines = [];
    let inLine = false;
    let startY = 0;

    for (let y = 0; y < targetH; y++) {
      const val = smoothed[y];
      if (val > threshold && !inLine) {
        inLine = true;
        startY = y;
      } else if (val <= threshold && inLine) {
        inLine = false;
        const lineH = y - startY;
        // Plausible line height: between 6px and 65px on downsampled buffer
        if (lineH >= 6 && lineH <= 65) {
          const topPercent = startY / targetH;
          const bottomPercent = y / targetH;
          const heightPercent = bottomPercent - topPercent;
          const heightPt = heightPercent * pageH;
          const centerPercent = (topPercent + bottomPercent) / 2;
          const recommendedThickness = Math.max(18, Math.min(38, Math.round(heightPt * 1.25)));

          lines.push({
            id: `scanned-line-${lines.length}`,
            type: 'scanned',
            topPercent,
            bottomPercent,
            centerPercent,
            minX: 0.12,
            maxX: 0.88,
            heightPt,
            recommendedThickness
          });
        }
      }
    }

    return lines;
  } catch (err) {
    console.warn('[pdfLineAnalyzer] Failed raster analysis:', err);
    return [];
  }
}

/**
 * Identifies the best matching text line given a pointer coordinate.
 * @param {Object} pt { xPercent: number, yPercent: number }
 * @param {Array} candidateLines List of digital or scanned lines
 * @param {number} maxDistancePercent Maximum vertical tolerance (default ~3.5% of page)
 * @returns {Object|null} Matched line metadata or null
 */
export function findBestMatchingLine(pt, candidateLines, maxDistancePercent = 0.035) {
  if (!pt || typeof pt.yPercent !== 'number' || !Array.isArray(candidateLines) || candidateLines.length === 0) {
    return null;
  }

  let bestMatch = null;
  let minDistance = Infinity;

  for (const line of candidateLines) {
    if (!line) continue;
    // Check if within vertical bounds + tolerance with resilient fallbacks
    const top = typeof line.topPercent === 'number' ? line.topPercent : (typeof line.yPercent === 'number' ? line.yPercent : 0);
    const bottom = typeof line.bottomPercent === 'number' ? line.bottomPercent : (top + (typeof line.heightPercent === 'number' ? line.heightPercent : 0.02));
    const center = typeof line.centerPercent === 'number' ? line.centerPercent : ((top + bottom) / 2);

    const distToCenter = Math.abs(pt.yPercent - center);
    const inVerticalSpan = pt.yPercent >= (top - maxDistancePercent) &&
                           pt.yPercent <= (bottom + maxDistancePercent);

    if (inVerticalSpan && distToCenter < minDistance) {
      minDistance = distToCenter;
      bestMatch = line;
    }
  }

  return bestMatch;
}
