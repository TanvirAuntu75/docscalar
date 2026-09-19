// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Universal Font Registry & Typography Engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canonical 8-Core Font Definitions for Enterprise Resume Typography
 */
export const FONT_REGISTRY = {
  inter: {
    id: 'inter',
    name: 'Inter',
    category: 'sans-serif',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    googleFontQuery: 'family=Inter:wght@300;400;500;600;700;800',
    metrics: {
      lineHeightScale: 1.0,
      letterSpacing: '-0.011em',
      headingWeight: 700,
      bodyWeight: 400
    }
  },
  outfit: {
    id: 'outfit',
    name: 'Outfit',
    category: 'sans-serif',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFontQuery: 'family=Outfit:wght@300;400;500;600;700;800',
    metrics: {
      lineHeightScale: 1.02,
      letterSpacing: '-0.015em',
      headingWeight: 700,
      bodyWeight: 400
    }
  },
  open_sans: {
    id: 'open_sans',
    name: 'Open Sans',
    category: 'sans-serif',
    fontFamily: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    googleFontQuery: 'family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400',
    metrics: {
      lineHeightScale: 1.04,
      letterSpacing: '0',
      headingWeight: 700,
      bodyWeight: 400
    }
  },
  roboto: {
    id: 'roboto',
    name: 'Roboto',
    category: 'sans-serif',
    fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
    googleFontQuery: 'family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400',
    metrics: {
      lineHeightScale: 1.0,
      letterSpacing: '0',
      headingWeight: 700,
      bodyWeight: 400
    }
  },
  merriweather: {
    id: 'merriweather',
    name: 'Merriweather',
    category: 'serif',
    fontFamily: "'Merriweather', Georgia, Cambria, 'Times New Roman', serif",
    googleFontQuery: 'family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400',
    metrics: {
      lineHeightScale: 0.94,
      letterSpacing: '0',
      headingWeight: 700,
      bodyWeight: 400
    }
  },
  playfair_display: {
    id: 'playfair_display',
    name: 'Playfair Display',
    category: 'serif',
    fontFamily: "'Playfair Display', Georgia, Cambria, 'Times New Roman', serif",
    googleFontQuery: 'family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400',
    metrics: {
      lineHeightScale: 0.96,
      letterSpacing: '0.01em',
      headingWeight: 700,
      bodyWeight: 400
    }
  },
  plus_jakarta_sans: {
    id: 'plus_jakarta_sans',
    name: 'Plus Jakarta Sans',
    category: 'sans-serif',
    fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    googleFontQuery: 'family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400',
    metrics: {
      lineHeightScale: 1.0,
      letterSpacing: '-0.012em',
      headingWeight: 700,
      bodyWeight: 400
    }
  },
  lora: {
    id: 'lora',
    name: 'Lora',
    category: 'serif',
    fontFamily: "'Lora', Georgia, 'Times New Roman', serif",
    googleFontQuery: 'family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600',
    metrics: {
      lineHeightScale: 0.98,
      letterSpacing: '0',
      headingWeight: 700,
      bodyWeight: 400
    }
  }
};

/**
 * Normalizes any font string, key, or CSS snippet to a canonical registry key.
 * @param {string} input - Raw font name/key (e.g. 'Playfair Display', 'open-sans', 'plus_jakarta_sans')
 * @returns {string} Canonical font key (e.g. 'playfair_display', 'open_sans')
 */
export function normalizeFontKey(input) {
  if (!input || typeof input !== 'string') return 'inter';
  const clean = input.trim().toLowerCase().replace(/[\s\-]+/g, '_');

  if (FONT_REGISTRY[clean]) return clean;

  // Substring & Alias Matching
  if (clean.includes('jakarta')) return 'plus_jakarta_sans';
  if (clean.includes('playfair')) return 'playfair_display';
  if (clean.includes('merriweather')) return 'merriweather';
  if (clean.includes('lora')) return 'lora';
  if (clean.includes('outfit')) return 'outfit';
  if (clean.includes('open') && clean.includes('sans')) return 'open_sans';
  if (clean.includes('roboto')) return 'roboto';
  if (clean.includes('inter')) return 'inter';
  if (clean.includes('montserrat')) return 'plus_jakarta_sans';
  if (clean.includes('georgia') || clean.includes('times') || clean.includes('serif')) return 'merriweather';

  return 'inter';
}

/**
 * Retrieves full font configuration object from registry.
 * @param {string} fontKeyOrName
 * @returns {object} Font configuration
 */
export function getFontConfig(fontKeyOrName) {
  const key = normalizeFontKey(fontKeyOrName);
  return FONT_REGISTRY[key] || FONT_REGISTRY.inter;
}

/**
 * Returns canonical CSS font-family string.
 * @param {string} fontKeyOrName
 * @returns {string} CSS font-family
 */
export function getFontFamilyCss(fontKeyOrName) {
  return getFontConfig(fontKeyOrName).fontFamily;
}

/**
 * Generates official Google Fonts stylesheet URL for a single font.
 * @param {string} fontKeyOrName
 * @returns {string} Google Fonts URL
 */
export function getGoogleFontUrl(fontKeyOrName) {
  const config = getFontConfig(fontKeyOrName);
  return `https://fonts.googleapis.com/css2?${config.googleFontQuery}&display=swap`;
}

/**
 * Generates standard HTML <link> tags for Google Fonts injection.
 * @param {string} fontKeyOrName
 * @returns {string} Preconnect and stylesheet link HTML tags
 */
export function getGoogleFontsLinkTags(fontKeyOrName) {
  const url = getGoogleFontUrl(fontKeyOrName);
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link href="${url}" rel="stylesheet"/>`
  ].join('\n  ');
}

/**
 * Generates unified single-request Google Fonts link tags for multiple fonts.
 * @param {string[]} fontKeys
 * @returns {string} Combined preconnect and stylesheet link HTML tags
 */
export function getCombinedGoogleFontsLinkTags(fontKeys = Object.keys(FONT_REGISTRY)) {
  const uniqueKeys = Array.from(new Set(fontKeys.map(k => normalizeFontKey(k))));
  const queries = uniqueKeys.map(k => getFontConfig(k).googleFontQuery);
  const combinedUrl = `https://fonts.googleapis.com/css2?${queries.join('&')}&display=swap`;
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link href="${combinedUrl}" rel="stylesheet"/>`
  ].join('\n  ');
}

/**
 * Computes font-adjusted line-spacing to maintain precise vertical rhythm.
 * @param {number} baseSpacing - Base line spacing (e.g. 1.45)
 * @param {string} fontKeyOrName - Font key or name
 * @returns {number} Adjusted line-height rounded to 2 decimals
 */
export function computeFontAdjustedLineSpacing(baseSpacing = 1.45, fontKeyOrName = 'inter') {
  const config = getFontConfig(fontKeyOrName);
  const raw = baseSpacing * (config.metrics?.lineHeightScale || 1.0);
  return Math.round(raw * 100) / 100;
}

/**
 * Returns structured array of all available font options for UI dropdowns.
 * @returns {Array<{id: string, name: string, category: string, fontFamily: string}>}
 */
export function getAllFontOptions() {
  return Object.values(FONT_REGISTRY).map(f => ({
    id: f.id,
    name: f.name,
    category: f.category,
    fontFamily: f.fontFamily
  }));
}
