/* PDF text encoding sanitizer to prevent WinAnsi crashes */

// Pre-compiled character mapping table for common Unicode mathematical and structural characters
const UNICODE_MAP = {
  '\u2260': '!=',   // ≠
  '\u2264': '<=',   // ≤
  '\u2265': '>=',   // ≥
  '\u2192': '->',   // →
  '\u2190': '<-',   // ←
  '\u2191': '^',    // ↑
  '\u2193': 'v',    // ↓
  '\u2194': '<->',  // ↔
  '\u2212': '-',    // −
  '\u00D7': 'x',    // ×
  '\u00F7': '/',    // ÷
  '\u2248': '~',    // ≈
  '\u2261': '==',   // ≡
  '\u21D2': '=>',   // ⇒
  '\u21D4': '<=>',  // ⇔
  '\u2205': 'empty',// ∅
  '\u221E': 'infinity', // ∞
  '\u221A': 'sqrt', // √
  '\u03C0': 'pi',    // π
  '\u2211': 'sum',   // ∑
  '\u2206': 'delta', // ∆
};

// Caches character validation results to optimize performance
const validationCache = new Map();

/**
 * Sanitizes a string by translating unsupported Unicode characters to WinAnsi-safe equivalents
 * and replacing other unencodable characters with a fallback ('?').
 * 
 * @param {string} text - The input text to sanitize
 * @param {object} font - The embedded pdf-lib font object
 * @param {string} fallback - The fallback character for unencodable symbols (default: '?')
 * @returns {string} The sanitized WinAnsi-safe string
 */
export function cleanTextForWinAnsi(text, font, fallback = '?') {
  if (typeof text !== 'string') return '';
  if (!text) return '';
  if (!font || typeof font.encodeText !== 'function') return text;

  // 1. Perform quick initial mapping replacements
  let transformed = text;
  for (const [unicodeChar, safeReplacement] of Object.entries(UNICODE_MAP)) {
    if (transformed.includes(unicodeChar)) {
      transformed = transformed.split(unicodeChar).join(safeReplacement);
    }
  }

  // 2. Character-by-character analysis and safe filtering
  const result = [];
  const len = transformed.length;

  for (let i = 0; i < len; i++) {
    const char = transformed[i];

    // Always preserve layout formatting whitespaces
    if (char === '\n' || char === '\r' || char === '\t') {
      result.push(char);
      continue;
    }

    // Check validation cache
    if (validationCache.has(char)) {
      result.push(validationCache.get(char));
      continue;
    }

    try {
      // Test if standard font can encode this character
      font.encodeText(char);
      validationCache.set(char, char);
      result.push(char);
    } catch {
      // Character is not encodable. Fallback.
      validationCache.set(char, fallback);
      result.push(fallback);
    }
  }

  return result.join('');
}
