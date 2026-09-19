/**
 * Date Formatting Utility for DocScalar Sign Studio
 * Provides standard international date patterns including Slash, Hyphen, Dot, and Textual formats.
 */

export const DATE_FORMAT_PRESETS = [
  // Slash Separators
  { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY (08/24/2026)', group: 'Slash' },
  { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY (24/08/2026)', group: 'Slash' },
  { id: 'YYYY/MM/DD', label: 'YYYY/MM/DD (2026/08/24)', group: 'Slash' },
  { id: 'MM/DD/YY', label: 'MM/DD/YY (08/24/26)', group: 'Slash' },
  { id: 'DD/MM/YY', label: 'DD/MM/YY (24/08/26)', group: 'Slash' },

  // Hyphen Separators
  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-08-24)', group: 'Hyphen' },
  { id: 'DD-MM-YYYY', label: 'DD-MM-YYYY (24-08-2026)', group: 'Hyphen' },
  { id: 'MM-DD-YYYY', label: 'MM-DD-YYYY (08-24-2026)', group: 'Hyphen' },
  { id: 'DD-MMM-YYYY', label: 'DD-MMM-YYYY (24-Aug-2026)', group: 'Hyphen' },

  // Dot Separators
  { id: 'DD.MM.YYYY', label: 'DD.MM.YYYY (24.08.2026)', group: 'Dot' },
  { id: 'MM.DD.YYYY', label: 'MM.DD.YYYY (08.24.2026)', group: 'Dot' },
  { id: 'YYYY.MM.DD', label: 'YYYY.MM.DD (2026.08.24)', group: 'Dot' },

  // Month First / Textual
  { id: 'MONTH_LONG_D_Y', label: 'Month DD, YYYY (August 24, 2026)', group: 'Textual' },
  { id: 'MONTH_SHORT_D_Y', label: 'MMM DD, YYYY (Aug 24, 2026)', group: 'Textual' },
  { id: 'D_MONTH_LONG_Y', label: 'DD Month YYYY (24 August 2026)', group: 'Textual' },
  { id: 'D_MONTH_SHORT_Y', label: 'DD MMM YYYY (24 Aug 2026)', group: 'Textual' }
];

export function formatDateByPattern(date = new Date(), pattern = 'MM/DD/YYYY') {
  const dObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dObj.getTime())) return String(date || '');

  const y = dObj.getFullYear();
  const yy = String(y).slice(-2);
  const m = String(dObj.getMonth() + 1).padStart(2, '0');
  const d = String(dObj.getDate()).padStart(2, '0');
  const monthShort = dObj.toLocaleDateString('en-US', { month: 'short' });
  const monthLong = dObj.toLocaleDateString('en-US', { month: 'long' });

  switch (pattern) {
    // Slash
    case 'DD/MM/YYYY': return `${d}/${m}/${y}`;
    case 'YYYY/MM/DD': return `${y}/${m}/${d}`;
    case 'MM/DD/YY': return `${m}/${d}/${yy}`;
    case 'DD/MM/YY': return `${d}/${m}/${yy}`;

    // Hyphen
    case 'YYYY-MM-DD': return `${y}-${m}-${d}`;
    case 'DD-MM-YYYY': return `${d}-${m}-${y}`;
    case 'MM-DD-YYYY': return `${m}-${d}-${y}`;
    case 'DD-MMM-YYYY': return `${d}-${monthShort}-${y}`;

    // Dot
    case 'DD.MM.YYYY': return `${d}.${m}.${y}`;
    case 'MM.DD.YYYY': return `${m}.${d}.${y}`;
    case 'YYYY.MM.DD': return `${y}.${m}.${d}`;

    // Textual
    case 'MONTH_LONG_D_Y': return `${monthLong} ${Number(d)}, ${y}`;
    case 'MONTH_SHORT_D_Y': return `${monthShort} ${Number(d)}, ${y}`;
    case 'D_MONTH_LONG_Y': return `${Number(d)} ${monthLong} ${y}`;
    case 'D_MONTH_SHORT_Y': return `${Number(d)} ${monthShort} ${y}`;
    case 'MM/DD/YYYY':
    default:
      return `${m}/${d}/${y}`;
  }
}

export function getSeparatorForPattern(pattern = 'MM/DD/YYYY') {
  if (pattern.includes('/')) return '/';
  if (pattern.includes('-')) return '-';
  if (pattern.includes('.')) return '.';
  return '/';
}

/**
 * Returns a clamped, strictly valid date string matching the selected pattern.
 * Enforces:
 * - Month: 1 to 12
 * - Day: 1 to 31 (adjusted for month/year)
 * - Year: 1900 to current year (e.g. 2026)
 */
export function validateAndFormatDate(val, pattern = 'MM/DD/YYYY', maxYear = new Date().getFullYear()) {
  if (!val || typeof val !== 'string') {
    return formatDateByPattern(new Date(), pattern);
  }

  const currentYear = maxYear || new Date().getFullYear();
  const digits = val.replace(/\D/g, '');
  if (!digits) {
    return formatDateByPattern(new Date(), pattern);
  }

  // Handle textual month patterns (e.g. "August 24, 2026")
  if (pattern.includes('MONTH')) {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      const yr = Math.min(currentYear, Math.max(1900, parsed.getFullYear()));
      parsed.setFullYear(yr);
      return formatDateByPattern(parsed, pattern);
    }
    return formatDateByPattern(new Date(), pattern);
  }

  const sep = getSeparatorForPattern(pattern);
  let month = 1, day = 1, year = currentYear;

  if (pattern.startsWith('YYYY')) {
    const yStr = digits.slice(0, 4);
    const mStr = digits.slice(4, 6);
    const dStr = digits.slice(6, 8);

    year = yStr.length === 4 ? Math.min(currentYear, Math.max(1900, parseInt(yStr, 10))) : currentYear;
    month = mStr ? Math.min(12, Math.max(1, parseInt(mStr, 10))) : (new Date().getMonth() + 1);
    const maxDays = new Date(year, month, 0).getDate();
    day = dStr ? Math.min(maxDays, Math.max(1, parseInt(dStr, 10))) : (new Date().getDate());

    const mFormatted = String(month).padStart(2, '0');
    const dFormatted = String(day).padStart(2, '0');
    return `${year}${sep}${mFormatted}${sep}${dFormatted}`;
  } else if (pattern.startsWith('DD')) {
    const dStr = digits.slice(0, 2);
    const mStr = digits.slice(2, 4);
    const yStr = digits.slice(4, 8);

    month = mStr ? Math.min(12, Math.max(1, parseInt(mStr, 10))) : (new Date().getMonth() + 1);
    year = yStr.length === 4 ? Math.min(currentYear, Math.max(1900, parseInt(yStr, 10))) : currentYear;
    const maxDays = new Date(year, month, 0).getDate();
    day = dStr ? Math.min(maxDays, Math.max(1, parseInt(dStr, 10))) : (new Date().getDate());

    const dFormatted = String(day).padStart(2, '0');
    const mFormatted = String(month).padStart(2, '0');
    if (pattern.endsWith('YY') && !pattern.endsWith('YYYY')) {
      const yy = String(year).slice(-2);
      return `${dFormatted}${sep}${mFormatted}${sep}${yy}`;
    }
    return `${dFormatted}${sep}${mFormatted}${sep}${year}`;
  } else {
    const mStr = digits.slice(0, 2);
    const dStr = digits.slice(2, 4);
    const yStr = digits.slice(4, 8);

    month = mStr ? Math.min(12, Math.max(1, parseInt(mStr, 10))) : (new Date().getMonth() + 1);
    year = yStr.length === 4 ? Math.min(currentYear, Math.max(1900, parseInt(yStr, 10))) : currentYear;
    const maxDays = new Date(year, month, 0).getDate();
    day = dStr ? Math.min(maxDays, Math.max(1, parseInt(dStr, 10))) : (new Date().getDate());

    const mFormatted = String(month).padStart(2, '0');
    const dFormatted = String(day).padStart(2, '0');
    if (pattern.endsWith('YY') && !pattern.endsWith('YYYY')) {
      const yy = String(year).slice(-2);
      return `${mFormatted}${sep}${dFormatted}${sep}${yy}`;
    }
    return `${mFormatted}${sep}${dFormatted}${sep}${year}`;
  }
}

/**
 * Live Keystroke Masker / Sanitizer.
 * Enforces:
 * - Digits and separator only.
 * - Month max 12 (if first digit > 1, auto prepends 0).
 * - Day max 31 (if first digit > 3, auto prepends 0).
 * - Year max currentYear (e.g. 2026).
 * - Auto-inserts separators as user types.
 */
export function formatTypingDate(rawInput, pattern = 'MM/DD/YYYY', maxYear = new Date().getFullYear()) {
  if (!rawInput) return '';
  const currentYear = maxYear || new Date().getFullYear();

  if (pattern.includes('MONTH')) {
    return rawInput.slice(0, 30);
  }

  const sep = getSeparatorForPattern(pattern);
  const digits = rawInput.replace(/\D/g, '');
  if (!digits) return '';

  if (pattern.startsWith('YYYY')) {
    let y = digits.slice(0, 4);
    if (y.length === 4 && parseInt(y, 10) > currentYear) {
      y = String(currentYear);
    }
    let m = digits.slice(4, 6);
    if (m.length === 1 && parseInt(m, 10) > 1) {
      m = '0' + m;
    } else if (m.length === 2 && parseInt(m, 10) > 12) {
      m = '12';
    }
    let d = digits.slice(6, 8);
    if (d.length === 1 && parseInt(d, 10) > 3) {
      d = '0' + d;
    } else if (d.length === 2 && parseInt(d, 10) > 31) {
      d = '31';
    }

    let res = y;
    if (digits.length > 4 || rawInput.endsWith(sep)) res += sep + m;
    if (digits.length > 6 || (rawInput.split(sep).length > 2 && rawInput.endsWith(sep))) res += sep + d;
    return res;
  } else if (pattern.startsWith('DD')) {
    let d = digits.slice(0, 2);
    if (d.length === 1 && parseInt(d, 10) > 3) {
      d = '0' + d;
    } else if (d.length === 2 && parseInt(d, 10) > 31) {
      d = '31';
    }
    let m = digits.slice(2, 4);
    if (m.length === 1 && parseInt(m, 10) > 1) {
      m = '0' + m;
    } else if (m.length === 2 && parseInt(m, 10) > 12) {
      m = '12';
    }
    let y = digits.slice(4, 8);
    if (y.length === 4 && parseInt(y, 10) > currentYear) {
      y = String(currentYear);
    }

    let res = d;
    if (digits.length > 2 || rawInput.endsWith(sep)) res += sep + m;
    if (digits.length > 4 || (rawInput.split(sep).length > 2 && rawInput.endsWith(sep))) res += sep + y;
    return res;
  } else {
    let m = digits.slice(0, 2);
    if (m.length === 1 && parseInt(m, 10) > 1) {
      m = '0' + m;
    } else if (m.length === 2 && parseInt(m, 10) > 12) {
      m = '12';
    }
    let d = digits.slice(2, 4);
    if (d.length === 1 && parseInt(d, 10) > 3) {
      d = '0' + d;
    } else if (d.length === 2 && parseInt(d, 10) > 31) {
      d = '31';
    }
    let y = digits.slice(4, 8);
    if (y.length === 4 && parseInt(y, 10) > currentYear) {
      y = String(currentYear);
    }

    let res = m;
    if (digits.length > 2 || rawInput.endsWith(sep)) res += sep + d;
    if (digits.length > 4 || (rawInput.split(sep).length > 2 && rawInput.endsWith(sep))) res += sep + y;
    return res;
  }
}
