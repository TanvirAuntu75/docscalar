/**
 * PII (Personally Identifiable Information) Detector & Sanitizer Engine
 * Client-side scanning for credit cards, SSN, emails, phone numbers, IPs, and custom keywords.
 */

/**
 * Validates a number string using the Luhn (Mod 10) algorithm.
 * @param {string} numStr 
 * @returns {boolean}
 */
export function validateLuhn(numStr) {
  const sanitized = (numStr || '').replace(/\D/g, '');
  if (sanitized.length < 13 || sanitized.length > 19) return false;
  
  let sum = 0;
  let shouldDouble = false;
  
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (isNaN(digit)) return false;
    
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  
  return sum % 10 === 0;
}

/**
 * Mask sensitive string for safe UI presentation.
 * @param {string} val 
 * @param {string} type 
 * @returns {string}
 */
export function maskSensitiveValue(val, type) {
  if (!val) return '';
  if (type === 'creditCard') {
    const clean = val.replace(/[\s-]/g, '');
    if (clean.length >= 8) {
      return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
    }
    return '•••• •••• •••• ••••';
  }
  if (type === 'ssn') {
    return '•••-••-' + val.slice(-4);
  }
  if (type === 'email') {
    const parts = val.split('@');
    if (parts.length === 2) {
      const user = parts[0];
      const maskedUser = user.length > 2 ? user.slice(0, 2) + '•••' : '••';
      return `${maskedUser}@${parts[1]}`;
    }
  }
  if (type === 'phone') {
    const digits = val.replace(/\D/g, '');
    if (digits.length >= 7) {
      let digitCount = 0;
      const totalDigits = digits.length;
      return val.replace(/\d/g, () => {
        digitCount++;
        return digitCount <= totalDigits - 4 ? '•' : digits[digitCount - 1];
      });
    }
    return val.replace(/\d(?=\d{4})/g, '•');
  }
  return val;
}

export const PII_PATTERNS = {
  creditCard: {
    id: 'creditCard',
    label: 'Credit Card',
    icon: 'credit_card',
    badgeClass: 'badge-error',
    // Matches 13-19 digit credit card numbers with hyphens/spaces
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|2[2-7][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11}|(?:\d[ -]*?){13,19})\b/g,
    validate: (val) => validateLuhn(val)
  },
  ssn: {
    id: 'ssn',
    label: 'Social Security Number (SSN)',
    icon: 'badge',
    badgeClass: 'badge-warning',
    regex: /\b(?!000|666|9\d{2})\d{3}[- ](?!00)\d{2}[- ](?!0000)\d{4}\b/g
  },
  email: {
    id: 'email',
    label: 'Email Address',
    icon: 'mail',
    badgeClass: 'badge-info',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
  },
  phone: {
    id: 'phone',
    label: 'Phone Number',
    icon: 'call',
    badgeClass: 'badge-primary',
    regex: /(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g
  },
  ip: {
    id: 'ip',
    label: 'IPv4 Address',
    icon: 'dns',
    badgeClass: 'badge-secondary',
    regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
  }
};

/**
 * Scan all pages of a loaded PDF document for PII items.
 * Extracts text boxes and computes normalized relative coordinates (0..1).
 * 
 * @param {object} pdfDoc - pdfjs-dist PDFDocumentProxy
 * @param {object} options - { activeCategories: ['creditCard', 'ssn', 'email', 'phone', 'ip'] }
 * @param {function} onProgress - (percent: number) => void
 * @returns {Promise<Array>} List of detected items
 */
export async function scanPdfForPII(pdfDoc, options = {}, onProgress = null) {
  if (!pdfDoc || !pdfDoc.numPages) return [];

  const activeCategories = options.activeCategories || Object.keys(PII_PATTERNS);
  const detectedItems = [];
  const numPages = pdfDoc.numPages;

  for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
    try {
      const page = await pdfDoc.getPage(pageIdx + 1);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });
      const pageWidth = viewport.width;
      const pageHeight = viewport.height;

      // Group text items by line or examine individually
      const items = textContent.items || [];
      
      for (const item of items) {
        const text = item.str || '';
        if (!text.trim()) continue;

        const [, , , , tx, ty] = item.transform;
        const itemWidth = item.width || 20;
        const itemHeight = item.height || 12;

        // Bounding box in PDF coords (bottom-left origin) to Canvas relative ratio (0..1, top-left origin)
        const xRel = Math.max(0, Math.min(1, tx / pageWidth));
        const yRel = Math.max(0, Math.min(1, (pageHeight - ty - itemHeight) / pageHeight));
        const wRel = Math.max(0.005, Math.min(1, itemWidth / pageWidth));
        const hRel = Math.max(0.005, Math.min(1, (itemHeight * 1.25) / pageHeight));

        for (const catKey of activeCategories) {
          const config = PII_PATTERNS[catKey];
          if (!config) continue;

          const rx = new RegExp(config.regex.source, 'gi');
          let match;
          while ((match = rx.exec(text)) !== null) {
            const rawVal = match[0].trim();
            if (config.validate && !config.validate(rawVal)) {
              continue;
            }

            // Precise token-level sub-string bounds calculation
            const totalChars = Math.max(1, text.length);
            const charRatioStart = Math.max(0, match.index / totalChars);
            const charRatioLen = Math.min(1, rawVal.length / totalChars);
            const subTx = tx + (charRatioStart * itemWidth);
            const subWidth = Math.max(6, charRatioLen * itemWidth);

            const xRel = Math.max(0, Math.min(1, (subTx - 1.5) / pageWidth));
            const yRel = Math.max(0, Math.min(1, (pageHeight - ty - itemHeight * 1.05) / pageHeight));
            const wRel = Math.max(0.004, Math.min(1, (subWidth + 3.0) / pageWidth));
            const hRel = Math.max(0.005, Math.min(1, (itemHeight * 1.35) / pageHeight));

            const id = `pii-${pageIdx}-${catKey}-${Math.random().toString(36).slice(2, 8)}`;
            detectedItems.push({
              id,
              page: pageIdx,
              type: catKey,
              label: config.label,
              value: rawVal,
              maskedValue: maskSensitiveValue(rawVal, catKey),
              x: xRel,
              y: yRel,
              width: wRel,
              height: hRel,
              isRatio: true,
              selected: true,
              source: 'auto-detect'
            });
          }
        }
      }

      if (onProgress) {
        onProgress(Math.round(((pageIdx + 1) / numPages) * 100));
      }
    } catch (err) {
      console.warn(`[PII Detector] Error parsing page ${pageIdx + 1}:`, err);
    }
  }

  return detectedItems;
}

/**
 * Search PDF for custom user terms or regular expressions.
 * @param {object} pdfDoc 
 * @param {string} searchTerm 
 * @param {boolean} isRegex 
 * @param {function} onProgress 
 * @returns {Promise<Array>}
 */
export async function searchPdfCustomTerms(pdfDoc, searchTerm, isRegex = false, onProgress = null) {
  if (!pdfDoc || !pdfDoc.numPages || !searchTerm || !searchTerm.trim()) return [];

  const numPages = pdfDoc.numPages;
  const matches = [];
  let rx;

  try {
    if (isRegex) {
      rx = new RegExp(searchTerm.trim(), 'gi');
    } else {
      rx = new RegExp(searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    }
  } catch (err) {
    throw new Error(`Invalid search pattern: ${err.message}`);
  }

  for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
    try {
      const page = await pdfDoc.getPage(pageIdx + 1);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });
      const pageWidth = viewport.width;
      const pageHeight = viewport.height;

      const items = textContent.items || [];
      for (const item of items) {
        const text = item.str || '';
        if (!text.trim()) continue;

        rx.lastIndex = 0;
        let match;
        while ((match = rx.exec(text)) !== null) {
          const matchedText = match[0];
          const [, , , , tx, ty] = item.transform;
          const itemWidth = item.width || 20;
          const itemHeight = item.height || 12;

          // Precise sub-string token bounds calculation
          const totalChars = Math.max(1, text.length);
          const charRatioStart = Math.max(0, match.index / totalChars);
          const charRatioLen = Math.min(1, matchedText.length / totalChars);
          const subTx = tx + (charRatioStart * itemWidth);
          const subWidth = Math.max(6, charRatioLen * itemWidth);

          const xRel = Math.max(0, Math.min(1, (subTx - 1.5) / pageWidth));
          const yRel = Math.max(0, Math.min(1, (pageHeight - ty - itemHeight * 1.05) / pageHeight));
          const wRel = Math.max(0.004, Math.min(1, (subWidth + 3.0) / pageWidth));
          const hRel = Math.max(0.005, Math.min(1, (itemHeight * 1.35) / pageHeight));

          const id = `custom-${pageIdx}-${Math.random().toString(36).slice(2, 8)}`;
          matches.push({
            id,
            page: pageIdx,
            type: 'custom',
            label: `"${searchTerm.trim()}"`,
            value: matchedText,
            maskedValue: matchedText,
            x: xRel,
            y: yRel,
            width: wRel,
            height: hRel,
            isRatio: true,
            selected: true,
            source: 'custom-search'
          });
        }
      }

      if (onProgress) {
        onProgress(Math.round(((pageIdx + 1) / numPages) * 100));
      }
    } catch (err) {
      console.warn(`[Custom Search] Error on page ${pageIdx + 1}:`, err);
    }
  }

  return matches;
}
