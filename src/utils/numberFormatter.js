/**
 * Utility for formatting sequential numbers into multiple styling systems:
 * - Arabic: 1, 2, 3...
 * - Lowercase Roman: i, ii, iii, iv, v, vi, vii, viii, ix, x...
 * - Uppercase Roman: I, II, III, IV, V, VI, VII, VIII, IX, X...
 * - Lowercase Alphabetical: a, b, c... z, aa, ab...
 * - Uppercase Alphabetical: A, B, C... Z, AA, AB...
 */

const ROMAN_NUMERALS = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I']
];

/**
 * Formats a positive integer into a specified numbering style.
 * @param {number} num - Positive integer to format
 * @param {string} style - 'arabic' | 'roman-lower' | 'roman-upper' | 'alpha-lower' | 'alpha-upper'
 * @returns {string} Formatted number string
 */
export function formatSequenceNumber(num, style = 'arabic') {
  const safeNum = Math.max(1, parseInt(num, 10) || 1);

  switch (style) {
    case 'roman-lower':
    case 'roman-upper': {
      let remainder = safeNum;
      let romanStr = '';
      for (const [val, roman] of ROMAN_NUMERALS) {
        while (remainder >= val) {
          romanStr += roman;
          remainder -= val;
        }
      }
      return style === 'roman-lower' ? romanStr.toLowerCase() : romanStr;
    }

    case 'alpha-lower':
    case 'alpha-upper': {
      let remainder = safeNum;
      let alphaStr = '';
      while (remainder > 0) {
        const mod = (remainder - 1) % 26;
        alphaStr = String.fromCharCode(65 + mod) + alphaStr;
        remainder = Math.floor((remainder - 1) / 26);
      }
      return style === 'alpha-lower' ? alphaStr.toLowerCase() : alphaStr;
    }

    case 'arabic':
    default:
      return String(safeNum);
  }
}

export const NUMBERING_STYLES = [
  { id: 'arabic', label: '1, 2, 3 (Standard Arabic)', example: '1, 2, 3' },
  { id: 'roman-lower', label: 'i, ii, iii (Lowercase Roman)', example: 'i, ii, iii' },
  { id: 'roman-upper', label: 'I, II, III (Uppercase Roman)', example: 'I, II, III' },
  { id: 'alpha-lower', label: 'a, b, c (Lowercase Letters)', example: 'a, b, c' },
  { id: 'alpha-upper', label: 'A, B, C (Uppercase Letters)', example: 'A, B, C' }
];
