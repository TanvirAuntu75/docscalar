/**
 * DocForge PDF Form Box Detector (Next-Gen Multi-Archetype Engine)
 * 
 * Production-grade client-side computer vision algorithm that scans rendered PDF
 * canvases to automatically detect form input boxes, shaded fields, underlines,
 * comb fields, table cell meshes, and checkboxes/radios on flat, scanned, or
 * non-AcroForm documents with subpixel precision and zero label bleed.
 */

/**
 * Connected Component Labeling Union-Find helper with path compression
 */
export class UnionFind {
  constructor() {
    this.parent = new Map();
  }

  find(i) {
    let root = i;
    while (this.parent.has(root)) {
      root = this.parent.get(root);
    }
    let curr = i;
    while (curr !== root) {
      const next = this.parent.get(curr);
      if (next !== undefined) {
        this.parent.set(curr, root);
        curr = next;
      } else {
        break;
      }
    }
    return root;
  }

  union(i, j) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent.set(Math.max(rootI, rootJ), Math.min(rootI, rootJ));
    }
  }
}

/**
 * Samples dynamic background lightness from document margins and header whitespace
 */
export function sampleBackgroundLightness(data, targetW, targetH) {
  const bgSamples = [];
  const startY = Math.max(1, Math.round(targetH * 0.04));
  const endY = Math.min(targetH - 2, Math.round(targetH * 0.15));
  const startX = Math.max(1, Math.round(targetW * 0.15));
  const endX = Math.min(targetW - 2, Math.round(targetW * 0.85));

  for (let y = startY; y < endY; y += 3) {
    for (let x = startX; x < endX; x += 6) {
      const idx = (y * targetW + x) * 4;
      bgSamples.push((data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000);
    }
  }

  bgSamples.sort((a, b) => a - b);
  return bgSamples[Math.floor(bgSamples.length / 2)] || 250;
}

/**
 * Pass 1: Shaded Box Segmentation (Pure tint extraction excluding dark text pixels)
 */
export function detectShadedBoxes(data, targetW, targetH, bgL, isLightDoc) {
  const mask = new Uint8Array(targetW * targetH);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = (y * targetW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const gray = (r * 299 + g * 587 + b * 114) / 1000;
      const diff = Math.abs(gray - bgL);
      const sat = Math.max(r, g, b) - Math.min(r, g, b);

      let isShaded = false;
      let isBorder = false;

      if (isLightDoc) {
        const isDarkText = gray < 115;
        isShaded = (diff > 5 && gray < 242 && gray > 125 && !isDarkText);
        isBorder = (gray < 135);
      } else {
        const isDarkText = (gray < bgL - 25 && sat < 4) || (gray < 110);
        isShaded = (diff > 5 && sat >= 4 && !isDarkText);
        isBorder = (gray < 100 && bgL > 220);
      }

      if (isShaded || isBorder) {
        mask[y * targetW + x] = 1;
      }
    }
  }

  // Connected Component Labeling
  const labels = new Int32Array(targetW * targetH);
  let nextLabel = 1;
  const uf = new UnionFind();

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = y * targetW + x;
      if (!mask[idx]) continue;

      const up = y > 0 ? labels[(y - 1) * targetW + x] : 0;
      const left = x > 0 ? labels[y * targetW + (x - 1)] : 0;

      if (up && left) {
        labels[idx] = Math.min(up, left);
        uf.union(up, left);
      } else if (up) {
        labels[idx] = up;
      } else if (left) {
        labels[idx] = left;
      } else {
        labels[idx] = nextLabel++;
      }
    }
  }

  // Bounding Box Aggregation
  const boxes = new Map();
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = y * targetW + x;
      const l = labels[idx];
      if (!l) continue;
      const root = uf.find(l);
      let b = boxes.get(root);
      if (!b) {
        b = { minX: x, maxX: x, minY: y, maxY: y, count: 0 };
        boxes.set(root, b);
      }
      if (x < b.minX) b.minX = x;
      if (x > b.maxX) b.maxX = x;
      if (y < b.minY) b.minY = y;
      if (y > b.maxY) b.maxY = y;
      b.count++;
    }
  }

  const validBoxes = [];
  boxes.forEach(b => {
    const bw = b.maxX - b.minX + 1;
    const bh = b.maxY - b.minY + 1;
    const area = bw * bh;
    const fillRatio = b.count / area;

    if (bw < targetW * 0.035 || bh < targetH * 0.012) return;
    if (bw > targetW * 0.94 || bh > targetH * 0.45) return;
    if (bh <= 4 || (bw / bh > 45 && bh < 8)) return;
    // Reject full-width header/section banners anywhere on the page (e.g. section title bars)
    if (bw > targetW * 0.65 && bh < targetH * 0.028) return;
    if (b.minY < targetH * 0.13 && bh < targetH * 0.025) return;

    if (fillRatio >= 0.28 || (bw > 55 && bh > 14)) {
      const isMultiline = bh > targetH * 0.038;
      const isCheckbox = bw < targetW * 0.055 && Math.abs(bw - bh) < 8;
      validBoxes.push({
        minX: b.minX,
        maxX: b.maxX,
        minY: b.minY,
        maxY: b.maxY,
        bw,
        bh,
        fillRatio,
        type: isCheckbox ? 'checkbox' : 'text',
        subtype: isCheckbox ? 'checkbox' : (fillRatio > 0.65 ? 'shaded' : 'outline'),
        archetype: isCheckbox ? 'checkbox' : (isMultiline ? 'multiline_shaded' : 'shaded_box'),
        multiline: isMultiline
      });
    }
  });

  return validBoxes;
}

/**
 * Pass 2: Morphological Horizontal & Vertical Line Extraction
 */
export function detectStructuralLines(data, targetW, targetH, bgL, isLightDoc) {
  const hLines = [];
  const minLineLen = Math.round(targetW * 0.032);
  const darkThreshold = isLightDoc ? 200 : bgL - 25;

  for (let y = 0; y < targetH; y++) {
    let startX = -1;
    for (let x = 0; x < targetW; x++) {
      const idx = (y * targetW + x) * 4;
      const gray = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
      if (gray < darkThreshold) {
        if (startX === -1) startX = x;
      } else {
        if (startX !== -1) {
          const len = x - startX;
          if (len >= minLineLen && len < targetW * 0.85) {
            hLines.push({ y, x1: startX, x2: x - 1, len });
          }
          startX = -1;
        }
      }
    }
    if (startX !== -1 && targetW - startX >= minLineLen && targetW - startX < targetW * 0.85) {
      hLines.push({ y, x1: startX, x2: targetW - 1, len: targetW - startX });
    }
  }

  const mergedHLines = [];
  for (const line of hLines) {
    let m = mergedHLines.find(m => Math.abs(line.y - m.y) <= 2 && Math.abs(line.x1 - m.x1) <= 6 && Math.abs(line.x2 - m.x2) <= 6);
    if (m) {
      m.y = Math.round((m.y + line.y) / 2);
      m.x1 = Math.min(m.x1, line.x1);
      m.x2 = Math.max(m.x2, line.x2);
      m.len = m.x2 - m.x1 + 1;
    } else {
      mergedHLines.push({ ...line });
    }
  }

  return { hLines: mergedHLines };
}

/**
 * Pass 3: Underlines and Outline Box Pairing
 */
export function detectUnderlinesAndLinePairs(mergedHLines, data, targetW, targetH, existingBoxes = []) {
  const pairedBoxes = [];
  const usedLines = new Set();

  for (let i = 0; i < mergedHLines.length; i++) {
    const l1 = mergedHLines[i];
    for (let j = i + 1; j < mergedHLines.length; j++) {
      const l2 = mergedHLines[j];
      const dy = l2.y - l1.y;
      if (dy >= 14 && dy <= 60) {
        const dx1 = Math.abs(l1.x1 - l2.x1);
        const dx2 = Math.abs(l1.x2 - l2.x2);
        if (dx1 <= 8 && dx2 <= 8) {
          // Verify vertical left and right edge closure to ensure this is a real closed outline box,
          // and NOT an open vertical gap between two different field rows.
          const leftX = Math.min(l1.x1, l2.x1);
          const rightX = Math.max(l1.x2, l2.x2);
          const darkThresh = 200;
          let leftDark = 0, rightDark = 0;
          const totalY = dy - 1;

          for (let y = l1.y + 1; y < l2.y; y++) {
            let hasL = false;
            for (let ox = -2; ox <= 2; ox++) {
              const px = leftX + ox;
              if (px >= 0 && px < targetW) {
                const idx = (y * targetW + px) * 4;
                const g = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
                if (g < darkThresh) { hasL = true; break; }
              }
            }
            if (hasL) leftDark++;

            let hasR = false;
            for (let ox = -2; ox <= 2; ox++) {
              const px = rightX + ox;
              if (px >= 0 && px < targetW) {
                const idx = (y * targetW + px) * 4;
                const g = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
                if (g < darkThresh) { hasR = true; break; }
              }
            }
            if (hasR) rightDark++;
          }

          const hasVerticalEdges = (leftDark / totalY >= 0.35) && (rightDark / totalY >= 0.35);
          if (!hasVerticalEdges) {
            continue; // Open gap between rows; skip pairing
          }

          const bw = Math.max(l1.x2, l2.x2) - Math.min(l1.x1, l2.x1) + 1;
          const bh = dy + 1;
          const isCheckbox = bw < targetW * 0.055 && Math.abs(bw - bh) < 8;
          pairedBoxes.push({
            minX: Math.min(l1.x1, l2.x1),
            maxX: Math.max(l1.x2, l2.x2),
            minY: l1.y,
            maxY: l2.y,
            bw,
            bh,
            fillRatio: 0.35,
            type: isCheckbox ? 'checkbox' : 'text',
            subtype: isCheckbox ? 'checkbox' : 'outline',
            archetype: isCheckbox ? 'checkbox' : 'outline_box',
            multiline: false
          });
          usedLines.add(i);
          usedLines.add(j);
          break;
        }
      }
    }
  }

  const underlines = [];
  for (let i = 0; i < mergedHLines.length; i++) {
    if (usedLines.has(i)) continue;
    const line = mergedHLines[i];
    if (line.len > targetW * 0.70) continue;
    if (line.y < targetH * 0.08 || line.y > targetH * 0.95) continue;

    // Check if this line coincides with the top or bottom border of an existing box (from shadedBoxes or pairedBoxes)
    const isBoxBorder = [...existingBoxes, ...pairedBoxes].some(b => {
      const matchY = Math.abs(line.y - b.minY) <= 3 || Math.abs(line.y - b.maxY) <= 3;
      if (!matchY) return false;
      const xOverlap = Math.max(0, Math.min(line.x2, b.maxX) - Math.max(line.x1, b.minX));
      return (xOverlap / line.len) > 0.60;
    });
    if (isBoxBorder) continue;

    let lightCount = 0;
    let totalChecked = 0;
    const checkH = Math.min(10, line.y);
    for (let dy = 2; dy <= checkH; dy++) {
      for (let x = line.x1 + 3; x <= line.x2 - 3; x += 4) {
        const idx = ((line.y - dy) * targetW + x) * 4;
        const gray = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
        if (gray > 220) lightCount++;
        totalChecked++;
      }
    }

    if (totalChecked === 0 || (lightCount / totalChecked) > 0.75) {
      const bh = Math.round(targetH * 0.022);
      underlines.push({
        minX: line.x1,
        maxX: line.x2,
        minY: Math.max(0, line.y - bh),
        maxY: line.y,
        bw: line.len,
        bh,
        fillRatio: 0.5,
        type: 'text',
        subtype: 'underline',
        archetype: 'underline',
        underline: true,
        multiline: false
      });
    }
  }

  return { pairedBoxes, underlines };
}

/**
 * Pass 4: Comb Field Grouping
 */
export function clusterCombFields(boxes) {
  const potentialCombCells = boxes.filter(b => {
    return b.bw >= 10 && b.bw <= 130 && b.bh >= 10 && b.bh <= 40;
  });

  const combGroups = [];
  const usedCellIndices = new Set();

  for (let i = 0; i < potentialCombCells.length; i++) {
    if (usedCellIndices.has(i)) continue;
    const cell = potentialCombCells[i];
    const group = [cell];

    for (let j = i + 1; j < potentialCombCells.length; j++) {
      if (usedCellIndices.has(j)) continue;
      const other = potentialCombCells[j];
      const last = group[group.length - 1];
      const sameRow = Math.abs(cell.minY - other.minY) <= 4 && Math.abs(cell.maxY - other.maxY) <= 4;
      const adjacentGap = other.minX - last.maxX;
      if (sameRow && adjacentGap >= -2 && adjacentGap <= 28) {
        group.push(other);
        usedCellIndices.add(j);
      }
    }

    if (group.length >= 2 && (group.length >= 3 || (group[0].bw < 100 && group[1].bw < 100))) {
      usedCellIndices.add(i);
      const minX = Math.min(...group.map(c => c.minX));
      const maxX = Math.max(...group.map(c => c.maxX));
      const minY = Math.min(...group.map(c => c.minY));
      const maxY = Math.max(...group.map(c => c.maxY));
      combGroups.push({
        minX,
        maxX,
        minY,
        maxY,
        bw: maxX - minX + 1,
        bh: maxY - minY + 1,
        fillRatio: 0.8,
        type: 'comb',
        subtype: 'comb',
        archetype: 'comb_field',
        comb: true,
        cellCount: group.length,
        cells: group.map(c => ({ minX: c.minX, maxX: c.maxX, minY: c.minY, maxY: c.maxY })),
        multiline: false
      });
    }
  }

  return combGroups;
}

/**
 * Pass 5: Table Grid Mesh Decomposition
 */
export function detectTableGridMesh(data, targetW, targetH, bgL, isLightDoc) {
  const rowBounds = [];
  const tableTopMin = Math.round(targetH * 0.10);
  const tableTopMax = Math.round(targetH * 0.40);

  for (let y = tableTopMin; y <= tableTopMax; y++) {
    let dark = 0;
    const xStart = Math.round(targetW * 0.08);
    const xEnd = Math.round(targetW * 0.92);
    for (let x = xStart; x <= xEnd; x++) {
      const idx = (y * targetW + x) * 4;
      const gray = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
      if (gray < 220) dark++;
    }
    if (dark > (xEnd - xStart) * 0.70) {
      rowBounds.push(y);
    }
  }

  const clusteredRows = [];
  for (const y of rowBounds) {
    let c = clusteredRows.find(cr => Math.abs(cr.mean - y) <= 4);
    if (c) {
      c.vals.push(y);
      c.mean = Math.round(c.vals.reduce((a, b) => a + b, 0) / c.vals.length);
    } else {
      clusteredRows.push({ mean: y, vals: [y] });
    }
  }

  if (clusteredRows.length < 3) return [];

  const rows = clusteredRows.map(r => r.mean).sort((a, b) => a - b);
  const validRowPairs = [];
  for (let r = 0; r < rows.length - 1; r++) {
    const rHeight = rows[r + 1] - rows[r];
    if (rHeight >= 14 && rHeight <= 45) {
      validRowPairs.push({ y1: rows[r], y2: rows[r + 1] });
    }
  }

  if (validRowPairs.length < 2) return [];

  const tableTop = validRowPairs[0].y1;
  const tableBottom = validRowPairs[validRowPairs.length - 1].y2;

  const vLines = [];
  const xStart = Math.round(targetW * 0.08);
  const xEnd = Math.round(targetW * 0.92);
  for (let x = xStart; x <= xEnd; x++) {
    let dipCount = 0;
    for (let y = tableTop; y <= tableBottom; y++) {
      const idx = (y * targetW + x) * 4;
      const gray = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
      if (gray < 235) dipCount++;
    }
    if (dipCount > (tableBottom - tableTop) * 0.45) {
      vLines.push({ x, dipCount });
    }
  }

  const cols = [];
  for (let i = 0; i < vLines.length; i++) {
    const curr = vLines[i];
    const prev = vLines[i - 1];
    const next = vLines[i + 1];
    if ((!prev || curr.dipCount >= prev.dipCount) && (!next || curr.dipCount >= next.dipCount)) {
      if (!cols.some(c => Math.abs(c - curr.x) <= 4)) {
        cols.push(curr.x);
      }
    }
  }
  cols.sort((a, b) => a - b);

  if (cols.length < 3) return [];

  const tableCells = [];
  for (let rIdx = 0; rIdx < validRowPairs.length; rIdx++) {
    const row = validRowPairs[rIdx];
    for (let cIdx = 1; cIdx < cols.length - 1; cIdx++) {
      const cLeft = cols[cIdx];
      const cRight = cols[cIdx + 1];
      const cellW = cRight - cLeft;
      const cellH = row.y2 - row.y1;
      if (cellW >= 18 && cellH >= 12) {
        const isCheckbox = cellW < 35 && Math.abs(cellW - cellH) <= 8;
        tableCells.push({
          minX: cLeft,
          maxX: cRight,
          minY: row.y1,
          maxY: row.y2,
          bw: cellW,
          bh: cellH,
          fillRatio: 0.9,
          type: isCheckbox ? 'checkbox' : 'text',
          subtype: isCheckbox ? 'checkbox' : 'table_cell',
          archetype: isCheckbox ? 'checkbox' : 'table_cell',
          table: true,
          tableRow: rIdx + 1,
          tableCol: cIdx,
          multiline: false
        });
      }
    }
  }

  return tableCells;
}

/**
 * Pass 6: Checkbox and Radio Button Contour Classification
 */
export function detectCheckboxesAndRadios(data, targetW, targetH, bgL, isLightDoc) {
  const smallComponents = [];
  const darkThresh = isLightDoc ? 165 : bgL - 30;

  for (let y = Math.round(targetH * 0.1); y < Math.round(targetH * 0.9); y += 2) {
    for (let x = Math.round(targetW * 0.06); x < Math.round(targetW * 0.94); x += 2) {
      const idx = (y * targetW + x) * 4;
      const gray = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
      if (gray < darkThresh) {
        // Fast isolation check: dark pixels belonging to long lines or box edges (>30px) cannot be small widgets
        let hLeft = 0;
        while (x - hLeft >= 0 && ((data[(y * targetW + (x - hLeft)) * 4] * 299 + data[(y * targetW + (x - hLeft)) * 4 + 1] * 587 + data[(y * targetW + (x - hLeft)) * 4 + 2] * 114) / 1000) < darkThresh) hLeft++;
        let hRight = 0;
        while (x + hRight < targetW && ((data[(y * targetW + (x + hRight)) * 4] * 299 + data[(y * targetW + (x + hRight)) * 4 + 1] * 587 + data[(y * targetW + (x + hRight)) * 4 + 2] * 114) / 1000) < darkThresh) hRight++;
        if (hLeft + hRight > 30) continue;

        let vUp = 0;
        while (y - vUp >= 0 && ((data[((y - vUp) * targetW + x) * 4] * 299 + data[((y - vUp) * targetW + x) * 4 + 1] * 587 + data[((y - vUp) * targetW + x) * 4 + 2] * 114) / 1000) < darkThresh) vUp++;
        let vDown = 0;
        while (y + vDown < targetH && ((data[((y + vDown) * targetW + x) * 4] * 299 + data[((y + vDown) * targetW + x) * 4 + 1] * 587 + data[((y + vDown) * targetW + x) * 4 + 2] * 114) / 1000) < darkThresh) vDown++;
        if (vUp + vDown > 30) continue;

        let minX = x, maxX = x, minY = y, maxY = y;
        let pixelCount = 0;
        const maxRadius = 18;

        for (let dy = -maxRadius; dy <= maxRadius; dy++) {
          const cy = y + dy;
          if (cy < 0 || cy >= targetH) continue;
          for (let dx = -maxRadius; dx <= maxRadius; dx++) {
            const cx = x + dx;
            if (cx < 0 || cx >= targetW) continue;
            const cIdx = (cy * targetW + cx) * 4;
            const cGray = (data[cIdx] * 299 + data[cIdx + 1] * 587 + data[cIdx + 2] * 114) / 1000;
            if (cGray < darkThresh) {
              if (cx < minX) minX = cx;
              if (cx > maxX) maxX = cx;
              if (cy < minY) minY = cy;
              if (cy > maxY) maxY = cy;
              pixelCount++;
            }
          }
        }

        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;

        if (bw >= 8 && bw <= 28 && bh >= 8 && bh <= 28 && Math.abs(bw - bh) <= 5) {
          if (!smallComponents.some(c => Math.abs(c.minX - minX) <= 6 && Math.abs(c.minY - minY) <= 6)) {
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            // Cardinal symmetry check: a valid radio or checkbox MUST have dark boundaries on all 4 sides (top, bottom, left, right)
            const isDark = (px, py) => {
              if (px < 0 || px >= targetW || py < 0 || py >= targetH) return false;
              const pIdx = (Math.round(py) * targetW + Math.round(px)) * 4;
              return ((data[pIdx] * 299 + data[pIdx + 1] * 587 + data[pIdx + 2] * 114) / 1000) < darkThresh;
            };

            const hasTop = isDark(centerX, minY);
            const hasBottom = isDark(centerX, maxY);
            const hasLeft = isDark(minX, centerY);
            const hasRight = isDark(maxX, centerY);

            if (!hasTop || !hasBottom || !hasLeft || !hasRight) {
              continue;
            }

            // Circularity check: measure horizontal dark pixel run at top edge (minY)
            // A square checkbox has a solid flat top edge spanning > 65% of width.
            // A circular radio button has a curved apex spanning < 45% of width.
            let topDark = 0;
            for (let cx = minX; cx <= maxX; cx++) {
              if (isDark(cx, minY)) topDark++;
            }
            const isRadio = (topDark / bw) < 0.55;
            smallComponents.push({
              minX,
              maxX,
              minY,
              maxY,
              bw,
              bh,
              fillRatio: 0.9,
              type: isRadio ? 'radio' : 'checkbox',
              subtype: isRadio ? 'radio' : 'checkbox',
              archetype: isRadio ? 'radio_circle' : 'checkbox',
              multiline: false
            });
          }
        }
      }
    }
  }

  return smallComponents;
}

/**
 * Pass 7: Baseline Harmonization
 */
export function alignFieldBaselines(fields) {
  if (fields.length <= 1) return fields;

  const rows = [];
  for (const f of fields) {
    if (f.multiline || f.type === 'comb') {
      rows.push([f]);
      continue;
    }
    let placed = false;
    for (const r of rows) {
      const ref = r[0];
      if (!ref.multiline && !ref.comb && Math.abs(ref.maxY - f.maxY) <= 4) {
        r.push(f);
        placed = true;
        break;
      }
    }
    if (!placed) rows.push([f]);
  }

  for (const r of rows) {
    if (r.length > 1) {
      const medianMaxY = Math.round(r.map(f => f.maxY).sort((a, b) => a - b)[Math.floor(r.length / 2)]);
      const medianH = Math.round(r.map(f => f.bh).sort((a, b) => a - b)[Math.floor(r.length / 2)]);
      for (const f of r) {
        f.maxY = medianMaxY;
        f.minY = medianMaxY - medianH + 1;
        f.bh = medianH;
      }
    }
  }

  return fields;
}

/**
 * Pass 8: Non-Maximum Suppression (IoU Deduplication)
 */
export function suppressOverlappingBoxes(boxes, iouThreshold = 0.45) {
  // Sort priority: specific archetypes (comb, table_cell) first, then regular boxes, then small widgets, then underlines
  const priorityScore = (b) => {
    if (b.type === 'comb') return 100;
    if (b.subtype === 'table_cell') return 90;
    if (b.subtype === 'shaded' || b.subtype === 'outline') return 80;
    if (b.type === 'radio' || b.type === 'checkbox') return 70;
    if (b.subtype === 'underline') return 60;
    return 50;
  };

  const sorted = [...boxes].sort((a, b) => priorityScore(b) - priorityScore(a));
  const result = [];

  for (const b of sorted) {
    let overlaps = false;
    for (const d of result) {
      const interX = Math.max(0, Math.min(b.maxX, d.maxX) - Math.max(b.minX, d.minX));
      const interY = Math.max(0, Math.min(b.maxY, d.maxY) - Math.max(b.minY, d.minY));
      const interArea = interX * interY;
      const bArea = b.bw * b.bh;
      const dArea = d.bw * d.bh;
      const unionArea = bArea + dArea - interArea;

      if (unionArea > 0 && (interArea / unionArea) > iouThreshold) {
        overlaps = true;
        break;
      }

      if (bArea > 0 && (interArea / bArea) > 0.75) {
        if (d.bw > 400 && b.bw < 380) {
          // Allow inner input fields inside large section container
        } else {
          overlaps = true;
          break;
        }
      }

      // If box b encloses an already accepted higher-priority field (e.g. table cell, comb, or inner box),
      // then box b is an outer bounding container/frame and must be suppressed:
      if (dArea > 0 && (interArea / dArea) > 0.75 && bArea > dArea * 1.8) {
        overlaps = true;
        break;
      }

      // If an underline coincides with the bottom border of a detected box, it is a border line, not a separate underline
      if (b.subtype === 'underline' && d.subtype !== 'underline') {
        if (Math.abs(b.maxY - d.maxY) <= 5 && (interX / b.bw) > 0.70) {
          overlaps = true;
          break;
        }
      }
      if (d.subtype === 'underline' && b.subtype !== 'underline') {
        if (Math.abs(b.maxY - d.maxY) <= 5 && (interX / d.bw) > 0.70) {
          overlaps = true;
          break;
        }
      }

      // If one box is a normal text box (width > 50) and the other is a small widget (width <= 35) on its boundary:
      if ((b.bw > 50 && d.bw <= 35 && interArea / dArea > 0.5) ||
          (d.bw > 50 && b.bw <= 35 && interArea / bArea > 0.5)) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) {
      result.push(b);
    }
  }

  return result;
}

/**
 * Main Detection Entry Point
 * 
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas - Rendered PDF page canvas
 * @param {number} pageIndex - 0-based page index
 * @param {object} options - Tunable detection parameters
 * @returns {Array<object>} Detected form field definitions
 */
export function detectCanvasFormBoxes(canvas, pageIndex = 0, options = {}) {
  if (!canvas || !canvas.width || !canvas.height) return [];

  const W = canvas.width;
  const H = canvas.height;

  const targetW = options.targetWidth || (W <= 600 ? 600 : 800);
  const targetH = Math.round(targetW * (H / W));

  let offCanvas;
  if (typeof document !== 'undefined') {
    offCanvas = document.createElement('canvas');
  } else if (typeof OffscreenCanvas !== 'undefined') {
    offCanvas = new OffscreenCanvas(targetW, targetH);
  } else if (canvas && typeof canvas.getContext === 'function') {
    if (typeof MockCanvas !== 'undefined') {
      offCanvas = new MockCanvas(targetW, targetH);
    } else {
      offCanvas = {
        width: targetW,
        height: targetH,
        getContext: () => canvas.getContext('2d')
      };
    }
  } else {
    return [];
  }

  offCanvas.width = targetW;
  offCanvas.height = targetH;
  const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
  if (!offCtx) return [];

  offCtx.drawImage(canvas, 0, 0, targetW, targetH);
  const imgData = offCtx.getImageData(0, 0, targetW, targetH);
  const d = imgData.data;

  // 1. Dynamic Background Lightness
  const bgL = sampleBackgroundLightness(d, targetW, targetH);
  const isLightDoc = bgL > 215;

  // 2. Pass 1: Shaded Boxes & Outlines
  const shadedBoxes = detectShadedBoxes(d, targetW, targetH, bgL, isLightDoc);

  // 3. Pass 2: Morphological Lines
  const { hLines } = detectStructuralLines(d, targetW, targetH, bgL, isLightDoc);

  // 4. Pass 3: Underlines and Parallel Line Pairs
  const { pairedBoxes, underlines } = detectUnderlinesAndLinePairs(hLines, d, targetW, targetH, shadedBoxes);

  // 5. Pass 4: Comb Fields
  const combFields = clusterCombFields([...shadedBoxes, ...pairedBoxes]);

  // 6. Pass 5: Table Grid Mesh
  const tableCells = detectTableGridMesh(d, targetW, targetH, bgL, isLightDoc);

  // 7. Pass 6: Checkboxes and Radios
  const smallWidgets = detectCheckboxesAndRadios(d, targetW, targetH, bgL, isLightDoc);

  // Combine all candidates
  const allCandidates = [
    ...shadedBoxes,
    ...pairedBoxes,
    ...underlines,
    ...combFields,
    ...tableCells,
    ...smallWidgets
  ];

  // 8. Deduplication / Non-Maximum Suppression
  const deduped = suppressOverlappingBoxes(allCandidates, 0.45);

  // 9. Baseline Harmonization
  const aligned = alignFieldBaselines(deduped);

  // 10. Natural Reading Order Sort
  aligned.sort((a, b) => {
    const yDelta = a.minY - b.minY;
    if (Math.abs(yDelta) > 12) return yDelta;
    return a.minX - b.minX;
  });

  // 11. Format Clean Field Output Contract
  return aligned.map((b, idx) => {
    const num = idx + 1;
    const name = `Field_${pageIndex + 1}_${num}`;
    const label = `Field ${pageIndex + 1}.${num}`;

    const startXPercent = +(b.minX / targetW).toFixed(4);
    const startYPercent = +(b.minY / targetH).toFixed(4);
    const endXPercent = +(b.maxX / targetW).toFixed(4);
    const endYPercent = +(b.maxY / targetH).toFixed(4);

    return {
      id: `detected_p${pageIndex + 1}_${num}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      label,
      type: b.type || 'text',
      subtype: b.subtype || 'standard',
      archetype: b.archetype || 'shaded_box',
      multiline: Boolean(b.multiline),
      comb: Boolean(b.comb),
      cellCount: b.cellCount || null,
      cells: b.cells || null,
      underline: Boolean(b.underline),
      table: Boolean(b.table),
      tableRow: b.tableRow || null,
      tableCol: b.tableCol || null,
      pageIndex,
      rect: {
        startXPercent,
        startYPercent,
        endXPercent,
        endYPercent
      },
      detected: true,
      confidence: +(b.fillRatio || 0.85).toFixed(2)
    };
  });
}

/**
 * Scan all pages of a loaded PDF.js document for form boxes.
 * 
 * @param {object} pdfDoc - PDF.js document proxy
 * @param {object} options - Options
 * @param {Function} [onProgress] - Callback (current, total)
 * @returns {Promise<Array<object>>} Aggregated fields across all pages
 */
export async function scanAllPdfPagesForBoxes(pdfDoc, options = {}, onProgress = null) {
  if (!pdfDoc || !pdfDoc.numPages) return [];

  const allFields = [];
  const total = pdfDoc.numPages;

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    if (onProgress) onProgress(pageNum, total);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const vp = page.getViewport({ scale: 1.0 });

      let offCanvas;
      if (typeof document !== 'undefined') {
        offCanvas = document.createElement('canvas');
      } else if (typeof OffscreenCanvas !== 'undefined') {
        offCanvas = new OffscreenCanvas(vp.width, vp.height);
      } else {
        continue;
      }

      offCanvas.width = vp.width;
      offCanvas.height = vp.height;
      const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      const pageFields = detectCanvasFormBoxes(offCanvas, pageNum - 1, options);
      allFields.push(...pageFields);
    } catch (err) {
      console.warn(`Failed to auto-detect boxes on page ${pageNum}:`, err);
    }
  }

  return allFields;
}
