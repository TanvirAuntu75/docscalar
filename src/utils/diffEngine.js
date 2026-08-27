/**
 * Document Comparison & Difference Studio Engine
 * Provides pixel-by-pixel canvas subtraction and semantic word-level text diffs.
 */

/**
 * Extracts raw text string from a pdfjs PDFDocumentProxy.
 * @param {object} pdfDoc 
 * @param {number|null} pageNum - 1-indexed page number or null for all pages
 * @returns {Promise<{ text: string, pagesText: Array<string> }>}
 */
export async function extractPdfText(pdfDoc, pageNum = null) {
  if (!pdfDoc) return { text: '', pagesText: [] };

  const pagesText = [];
  const startPage = pageNum ? pageNum : 1;
  const endPage = pageNum ? pageNum : pdfDoc.numPages;

  for (let p = startPage; p <= endPage; p++) {
    try {
      const page = await pdfDoc.getPage(p);
      const content = await page.getTextContent();
      const strings = (content.items || []).map(item => item.str);
      const pageStr = strings.join(' ');
      pagesText.push(pageStr);
      page.cleanup();
    } catch (err) {
      console.warn(`[DiffEngine] Failed to extract text from page ${p}:`, err);
      pagesText.push('');
    }
  }

  return {
    text: pagesText.join('\n\n'),
    pagesText
  };
}

/**
 * Computes word-level diff and similarity score using Longest Common Subsequence (LCS).
 * @param {string} textA - Original text
 * @param {string} textB - Revised text
 * @returns {object} { diffs, similarityPercent, addedCount, deletedCount, unchangedCount, totalWordsA, totalWordsB }
 */
export function computeWordDiff(textA, textB) {
  const wordsA = (textA || '').trim().split(/\s+/).filter(Boolean);
  const wordsB = (textB || '').trim().split(/\s+/).filter(Boolean);

  const m = wordsA.length;
  const n = wordsB.length;

  if (m === 0 && n === 0) {
    return { diffs: [], similarityPercent: 100, addedCount: 0, deletedCount: 0, unchangedCount: 0, totalWordsA: 0, totalWordsB: 0 };
  }
  if (m === 0) {
    return {
      diffs: wordsB.map(w => ({ type: 'added', value: w })),
      similarityPercent: 0,
      addedCount: n,
      deletedCount: 0,
      unchangedCount: 0,
      totalWordsA: 0,
      totalWordsB: n
    };
  }
  if (n === 0) {
    return {
      diffs: wordsA.map(w => ({ type: 'deleted', value: w })),
      similarityPercent: 0,
      addedCount: 0,
      deletedCount: m,
      unchangedCount: 0,
      totalWordsA: m,
      totalWordsB: 0
    };
  }

  // Optimize for very large documents: if word count exceeds 2000, slice into paragraphs or approximate
  const maxWords = 2500;
  const effectiveWordsA = wordsA.slice(0, maxWords);
  const effectiveWordsB = wordsB.slice(0, maxWords);
  const em = effectiveWordsA.length;
  const en = effectiveWordsB.length;

  const dp = Array.from({ length: em + 1 }, () => new Int32Array(en + 1));

  for (let i = 1; i <= em; i++) {
    for (let j = 1; j <= en; j++) {
      if (effectiveWordsA[i - 1] === effectiveWordsB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diffs = [];
  let i = em;
  let j = en;
  let addedCount = 0;
  let deletedCount = 0;
  let unchangedCount = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && effectiveWordsA[i - 1] === effectiveWordsB[j - 1]) {
      diffs.unshift({ type: 'equal', value: effectiveWordsA[i - 1] });
      unchangedCount++;
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffs.unshift({ type: 'added', value: effectiveWordsB[j - 1] });
      addedCount++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diffs.unshift({ type: 'deleted', value: effectiveWordsA[i - 1] });
      deletedCount++;
      i--;
    }
  }

  const commonCount = unchangedCount;
  const similarityPercent = Math.min(100, Math.max(0, ((2 * commonCount) / (m + n)) * 100));

  return {
    diffs,
    similarityPercent: parseFloat(similarityPercent.toFixed(1)),
    addedCount,
    deletedCount,
    unchangedCount,
    totalWordsA: m,
    totalWordsB: n
  };
}

/**
 * Computes pixel delta heatmap on a target HTMLCanvasElement.
 * Cyan (#06b6d4) = Added in Revision B
 * Magenta (#f43f5e) = Removed from Original A
 * Grayscale = Unchanged background
 * 
 * @param {HTMLCanvasElement} canvasA 
 * @param {HTMLCanvasElement} canvasB 
 * @param {HTMLCanvasElement} targetCanvas 
 * @param {number} threshold - Sensitivity threshold (5..60)
 * @returns {object} { changedPixels, totalPixels, diffRatio, addedPixels, deletedPixels }
 */
export function computePixelDiff(canvasA, canvasB, targetCanvas, threshold = 25) {
  if (!canvasA || !canvasB || !targetCanvas) return null;

  const w = Math.min(canvasA.width, canvasB.width);
  const h = Math.min(canvasA.height, canvasB.height);

  if (w <= 0 || h <= 0) return null;

  targetCanvas.width = w;
  targetCanvas.height = h;

  const ctxA = canvasA.getContext('2d');
  const ctxB = canvasB.getContext('2d');
  const ctxTarget = targetCanvas.getContext('2d');

  if (!ctxA || !ctxB || !ctxTarget) return null;

  const imgDataA = ctxA.getImageData(0, 0, w, h);
  const imgDataB = ctxB.getImageData(0, 0, w, h);
  const targetImgData = ctxTarget.createImageData(w, h);

  const dataA = imgDataA.data;
  const dataB = imgDataB.data;
  const dataOut = targetImgData.data;

  const totalPixels = w * h;
  let changedPixels = 0;
  let addedPixels = 0;
  let deletedPixels = 0;

  for (let i = 0; i < dataA.length; i += 4) {
    const rA = dataA[i];
    const gA = dataA[i + 1];
    const bA = dataA[i + 2];
    const aA = dataA[i + 3];

    const rB = dataB[i];
    const gB = dataB[i + 1];
    const bB = dataB[i + 2];
    const aB = dataB[i + 3];

    // Compute RGB luminance & delta
    const lumA = 0.299 * rA + 0.587 * gA + 0.114 * bA;
    const lumB = 0.299 * rB + 0.587 * gB + 0.114 * bB;
    const delta = Math.abs(rA - rB) + Math.abs(gA - gB) + Math.abs(bA - bB);

    if (delta > threshold * 3) {
      changedPixels++;
      // If B is darker/inked while A is light -> Added element
      if (lumB < lumA) {
        addedPixels++;
        // Electric Cyan (#06b6d4)
        dataOut[i] = 6;
        dataOut[i + 1] = 182;
        dataOut[i + 2] = 212;
        dataOut[i + 3] = 255;
      } else {
        deletedPixels++;
        // Neon Magenta (#f43f5e)
        dataOut[i] = 244;
        dataOut[i + 1] = 63;
        dataOut[i + 2] = 94;
        dataOut[i + 3] = 255;
      }
    } else {
      // Neutral light grayscale background for context
      const gray = Math.round((lumA + lumB) / 2);
      const fadedGray = Math.round(240 + (gray - 240) * 0.3); // High brightness background
      dataOut[i] = fadedGray;
      dataOut[i + 1] = fadedGray;
      dataOut[i + 2] = fadedGray;
      dataOut[i + 3] = 255;
    }
  }

  ctxTarget.putImageData(targetImgData, 0, 0);

  const diffRatio = totalPixels > 0 ? (changedPixels / totalPixels) * 100 : 0;

  return {
    changedPixels,
    totalPixels,
    diffRatio: parseFloat(diffRatio.toFixed(2)),
    addedPixels,
    deletedPixels
  };
}
