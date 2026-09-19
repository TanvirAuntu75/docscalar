// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar 2D Spatial Scanline & Column Interleaving Simulator
// Emulates legacy ATS (Taleo, iCIMS, older Workday) linear coordinate extraction
// to calculate empirical Interleaving Entropy / Scramble Index (0-100%)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extracts structured text elements with inferred 2D spatial coordinates from HTML string.
 * Uses semantic container hierarchy (sidebars, columns, main body, headers) and inline styles.
 * 
 * @param {string} html - Rendered template HTML
 * @returns {Array<{text: string, x: number, y: number, width: number, height: number, columnId: string, isHeading: boolean}>}
 */
export function extractSpatialTextElements(html) {
  if (!html || typeof html !== 'string') return [];

  // Browser environment: use native DOMParser
  let doc;
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    doc = parser.parseFromString(html, 'text/html');
  } else {
    // Node.js test environment regex-based layout extractor
    return fallbackExtractSpatialElementsNode(html);
  }

  const elements = [];
  const root = doc.body;
  if (!root) return [];

  // Detect layout architecture from structural classes and inline flex/grid attributes
  let currentY = 40;
  let sidebarY = 40;
  let mainY = 40;

  function traverse(node, colId = 'center', currentX = 40, colWidth = 714) {
    if (!node) return;

    // Check if node is a distinct column container
    const isSidebar = node.classList && (
      node.classList.contains('sidebar') ||
      node.classList.contains('left-col') ||
      node.classList.contains('sidebar-col') ||
      node.getAttribute?.('style')?.includes('width: 3') ||
      node.getAttribute?.('style')?.includes('width: 2') ||
      node.getAttribute?.('style')?.includes('width:3') ||
      node.getAttribute?.('style')?.includes('width:2')
    );

    const isMainCol = node.classList && (
      node.classList.contains('content') ||
      node.classList.contains('main-col') ||
      node.classList.contains('right-col') ||
      node.classList.contains('content-columns') ||
      node.classList.contains('main-body')
    );

    if (isSidebar) {
      colId = 'left_sidebar';
      currentX = 40;
      colWidth = 240;
    } else if (isMainCol) {
      colId = 'main_content';
      currentX = 300;
      colWidth = 454;
    }

    // Process leaf text nodes
    if (node.nodeType === 3) { // Text node
      const text = node.textContent.trim().replace(/\s+/g, ' ');
      if (text.length > 0) {
        const parentTag = (node.parentNode?.tagName || '').toLowerCase();
        const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(parentTag) ||
                          node.parentNode?.classList?.contains('section-title') ||
                          node.parentNode?.classList?.contains('candidate-name');

        const lineHeight = isHeading ? 22 : 14;
        let estimatedY = (colId === 'left_sidebar') ? sidebarY : (colId === 'main_content' ? mainY : currentY);

        elements.push({
          text,
          x: currentX,
          y: estimatedY,
          width: Math.min(colWidth, text.length * 7),
          height: lineHeight,
          columnId: colId,
          isHeading
        });

        if (colId === 'left_sidebar') sidebarY += lineHeight + 4;
        else if (colId === 'main_content') mainY += lineHeight + 4;
        else currentY += lineHeight + 4;
      }
      return;
    }

    for (const child of node.childNodes || []) {
      traverse(child, colId, currentX, colWidth);
    }
  }

  traverse(root);
  return elements;
}

/**
 * Node.js / Serverless regex-based fallback coordinate extractor when DOMParser is unavailable.
 */
function fallbackExtractSpatialElementsNode(html) {
  const elements = [];
  const hasSidebar = /class=["'][^"']*(sidebar|left-col|sidebar-col)[^"']*["']/i.test(html) ||
                     /width:\s*(?:2\d|3\d)%/i.test(html) ||
                     /grid-template-columns/i.test(html);

  // Extract raw text lines with tags stripped
  const lines = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .split(/<\/(?:div|p|li|h[1-6]|tr|section|header)>/i)
    .map(chunk => chunk.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0);

  if (!hasSidebar) {
    // Pure single-column linear layout
    let y = 40;
    for (const line of lines) {
      elements.push({
        text: line,
        x: 48,
        y,
        width: 698,
        height: 16,
        columnId: 'main',
        isHeading: /^[A-Z\s]{4,}$/.test(line)
      });
      y += 18;
    }
  } else {
    // Two-column sidebar emulation (first ~30% items in left sidebar, remainder in main)
    const splitIndex = lines.length <= 2 ? 1 : Math.max(1, Math.floor(lines.length * 0.35));
    let leftY = 80;
    let rightY = 80;

    lines.forEach((line, idx) => {
      if (idx < splitIndex) {
        elements.push({
          text: line,
          x: 48,
          y: leftY,
          width: 220,
          height: 16,
          columnId: 'left_sidebar',
          isHeading: /^[A-Z\s]{4,}$/.test(line)
        });
        leftY += 18;
      } else {
        elements.push({
          text: line,
          x: 290,
          y: rightY,
          width: 456,
          height: 16,
          columnId: 'main_content',
          isHeading: /^[A-Z\s]{4,}$/.test(line)
        });
        rightY += 18;
      }
    });
  }

  return elements;
}

/**
 * Simulates legacy ATS horizontal scanline character extraction across Y-bands.
 * Legacy PDF engines (e.g. `pdftotext` without layout parameters) group characters
 * into horizontal bands of ~8-12px and read them left-to-right (sorted by Y, then X).
 * 
 * @param {string} html - Template HTML string
 * @param {object} options - Configuration options
 * @returns {object} Scanline simulation diagnostics and interleaving entropy metrics
 */
export function simulateAtsTextExtraction(html, options = {}) {
  const yBandTolerance = options.yBandTolerance || 12; // px vertical grouping window
  const spatialElements = extractSpatialTextElements(html);

  if (!spatialElements || spatialElements.length === 0) {
    return {
      interleavingScore: 0,
      scramblePercentage: 0,
      isAtsSafe: true,
      columnCount: 1,
      layoutClassification: 'unknown',
      simulatedStream: '',
      scrambledLines: [],
      diagnostics: 'No text content detected for spatial scanline simulation.'
    };
  }

  // Detect distinct column X-ranges
  const distinctColumns = new Set(spatialElements.map(e => e.columnId));
  const columnCount = distinctColumns.size;

  // Group elements into horizontal Y-bands (scanlines)
  const sortedByY = [...spatialElements].sort((a, b) => a.y - b.y || a.x - b.x);
  const scanlines = [];
  let currentBand = [];
  let currentBandY = sortedByY[0]?.y || 0;

  for (const el of sortedByY) {
    if (Math.abs(el.y - currentBandY) <= yBandTolerance) {
      currentBand.push(el);
    } else {
      if (currentBand.length > 0) {
        // Sort elements in this band left-to-right (horizontal scanline reading order)
        currentBand.sort((a, b) => a.x - b.x);
        scanlines.push(currentBand);
      }
      currentBand = [el];
      currentBandY = el.y;
    }
  }
  if (currentBand.length > 0) {
    currentBand.sort((a, b) => a.x - b.x);
    scanlines.push(currentBand);
  }

  // Analyze scanlines for multi-column collision / interleaving
  let totalBands = scanlines.length;
  let scrambledBands = 0;
  const scrambledLines = [];
  const reconstructedLines = [];

  for (const band of scanlines) {
    const bandCols = new Set(band.map(b => b.columnId));
    const mergedLineText = band.map(b => b.text).join('   |   ');
    reconstructedLines.push(mergedLineText);

    // If a single horizontal Y-band contains items from distinct independent columns
    if (bandCols.size > 1 && bandCols.has('left_sidebar') && bandCols.has('main_content')) {
      scrambledBands++;
      if (scrambledLines.length < 10) {
        scrambledLines.push({
          y: band[0].y,
          leftText: band.filter(b => b.columnId === 'left_sidebar').map(b => b.text).join(' '),
          rightText: band.filter(b => b.columnId === 'main_content').map(b => b.text).join(' '),
          simulatedCorruptedLine: band.map(b => b.text).join(' ')
        });
      }
    }
  }

  const scramblePercentage = totalBands > 0 ? Math.round((scrambledBands / totalBands) * 100) : 0;
  const isAtsSafe = scramblePercentage === 0 && columnCount <= 1;

  let layoutClassification = 'pure_single_column';
  if (scramblePercentage >= 40) {
    layoutClassification = 'two_column_sidebar';
  } else if (scramblePercentage > 0) {
    layoutClassification = 'asymmetric_split';
  }

  return {
    interleavingScore: scramblePercentage,
    scramblePercentage,
    isAtsSafe,
    columnCount,
    layoutClassification,
    simulatedStream: reconstructedLines.join('\n'),
    scrambledLines,
    totalScanlines: totalBands,
    scrambledScanlines: scrambledBands,
    diagnostics: isAtsSafe
      ? 'Pure 100% linear stream. Zero horizontal scanline character interleaving detected.'
      : `Detected ${scramblePercentage}% scanline interleaving across ${columnCount} visual columns. Words from different sections will concatenate horizontally in legacy ATS parsers.`
  };
}
