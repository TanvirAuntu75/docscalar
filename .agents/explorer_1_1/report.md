# R1 Deep Survey & Implementation Blueprint: Universal Template Runtime, Dynamic Section Dispatcher, and Font Registry

**Agent**: Explorer 1 (`teamwork_preview_explorer`)  
**Date**: 2026-09-01T21:55:00+06:00  
**Target Milestone**: R1 (Universal Template Runtime & Dynamic Section Dispatcher, Font Registry)  
**Status**: SURVEY & DESIGN COMPLETE — READY FOR IMPLEMENTATION  

---

## 1. Executive Summary & Root-Cause Findings

### 1.1 The Problem Landscape Across the 89-Template Catalog
A forensic inspection of `src/engines/utility/resumeTemplates.js` and representative templates in `src/engines/utility/templates/` (`mariana.js`, `harvard_classic.js`, `silicon_valley_ats.js`, `adeline_palmerston.js`, `diagonal_wedge.js`, `berlin_two_tone.js`, `olivia.js`) revealed three fundamental architectural fractures:

1. **Hardcoded Section Concatenation & Ignored `sectionOrder`**:
   - In multiple templates (e.g., `berlin_two_tone.js`, `diagonal_wedge.js`), `sectionOrder` is accepted as an argument but never referenced in the HTML assembly block; sections are hardcoded in static sequence (`${expHtml}${skillsHtml}${projHtml}...`).
   - In split-column templates (e.g., `olivia.js`, `adeline_palmerston.js`), `summary`, `education`, `skills`, and `custom_languages` are manually extracted and pinned to either the top header or sidebar, ignoring user-ordered permutations in `data.sectionOrder`.
   - In `mariana.js`, an ad-hoc heuristic for `education` was added in TSK-426 (`eduInMain`), but it was template-specific, not generalized, and did not handle skills or other sections dynamically.

2. **Inactive `themeLayout` ('single' vs 'split') State**:
   - While `ResumeBuilder.jsx` provides a UI toggle for "Layout Grid: Single Column vs Two-Column Split", 2-column templates currently ignore `themeLayout` and render fixed sidebars regardless of user choice.
   - When a user selects `Single Column` on a template like `mariana` or `berlin_two_tone`, the layout remains a 33%/67% split instead of dynamically reflowing into an ATS-friendly single vertical stream.

3. **Incomplete & Hardcoded Typography Stacks**:
   - Templates currently use fragmented `switch` or ternary statements for only 3–4 fonts (`Inter`, `Merriweather`, `Playfair Display`, `Roboto`).
   - `ResumeBuilder.jsx` lists 5 fonts in its UI dropdown, whereas the enterprise product spec requires **all 8 core fonts** (`Inter`, `Outfit`, `Open Sans`, `Roboto`, `Merriweather`, `Playfair Display`, `Plus Jakarta Sans`, `Lora`).
   - Google Fonts `<link>` stylesheets in template `<head>` tags are inconsistent, causing unrendered web fonts, layout shifts, or missing weights (`300;400;500;600;700;800`).

---

## 2. Architecture of `src/engines/utility/fontRegistry.js`

### 2.1 Complete 8-Core Font Registry Specification

The typography engine is formalized as a deterministic registry providing:
- Canonical font ID normalization (handles `'Open Sans'`, `'open-sans'`, `'open_sans'`, case insensitivity).
- Accurate CSS `font-family` declarations with robust OS fallback stacks.
- Official Google Fonts API v2 stylesheet URLs with complete weight ranges (`wght@300;400;500;600;700;800`).
- Font-specific metric adjustments (`lineHeightScale`, `letterSpacing`) to prevent vertical page boundary clipping during font switches.

```javascript
// ═══════════════════════════════════════════════════════════════════════════════
// DocForge Universal Font Registry & Typography Engine
// ═══════════════════════════════════════════════════════════════════════════════

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
```

### 2.2 Font Key Normalization & Helper Functions

```javascript
export function normalizeFontKey(input) {
  if (!input || typeof input !== 'string') return 'inter';
  const clean = input.trim().toLowerCase().replace(/[\s\-]+/g, '_');
  
  if (FONT_REGISTRY[clean]) return clean;
  
  // Aliases & Substring Matching
  if (clean.includes('jakarta')) return 'plus_jakarta_sans';
  if (clean.includes('playfair')) return 'playfair_display';
  if (clean.includes('merriweather')) return 'merriweather';
  if (clean.includes('lora')) return 'lora';
  if (clean.includes('outfit')) return 'outfit';
  if (clean.includes('open') && clean.includes('sans')) return 'open_sans';
  if (clean.includes('roboto')) return 'roboto';
  if (clean.includes('inter')) return 'inter';
  if (clean.includes('serif')) return 'merriweather';
  
  return 'inter';
}

export function getFontConfig(fontKeyOrName) {
  const key = normalizeFontKey(fontKeyOrName);
  return FONT_REGISTRY[key] || FONT_REGISTRY.inter;
}

export function getFontFamilyCss(fontKeyOrName) {
  return getFontConfig(fontKeyOrName).fontFamily;
}

export function getGoogleFontUrl(fontKeyOrName) {
  const config = getFontConfig(fontKeyOrName);
  return `https://fonts.googleapis.com/css2?${config.googleFontQuery}&display=swap`;
}

export function getGoogleFontsLinkTags(fontKeyOrName) {
  const url = getGoogleFontUrl(fontKeyOrName);
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link href="${url}" rel="stylesheet"/>`
  ].join('\n  ');
}

export function getCombinedGoogleFontsLinkTags(fontKeys = Object.keys(FONT_REGISTRY)) {
  const queries = fontKeys.map(k => getFontConfig(k).googleFontQuery);
  const combinedUrl = `https://fonts.googleapis.com/css2?${queries.join('&')}&display=swap`;
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link href="${combinedUrl}" rel="stylesheet"/>`
  ].join('\n  ');
}

export function computeFontAdjustedLineSpacing(baseSpacing = 1.45, fontKeyOrName = 'inter') {
  const config = getFontConfig(fontKeyOrName);
  const raw = baseSpacing * (config.metrics.lineHeightScale || 1.0);
  return Math.round(raw * 100) / 100;
}

export function getAllFontOptions() {
  return Object.values(FONT_REGISTRY).map(f => ({
    id: f.id,
    name: f.name,
    category: f.category,
    fontFamily: f.fontFamily
  }));
}
```

---

## 3. Architecture of `src/engines/utility/universalTemplateRuntime.js`

### 3.1 Contract Definition
```javascript
export function renderUniversalOrderedSections(data, options = {}, renderers = {}, layoutRules = {})
```

### 3.2 Dynamic 2-Column Routing Heuristics

When rendering in split mode (`isSplit = true`), sections are partitioned between **Main Column** and **Sidebar** based on deterministic heuristics:

$$\text{Let } O = \text{normalized } \text{sectionOrder}, \quad \text{idx}(s) = O.\text{indexOf}(s)$$

| Section | Target Column | Activation Rule & Heuristic Formula | Rationale |
|---|---|---|---|
| **`contact`** | Sidebar (Split) / Header Bar (Single) | Always in Sidebar if Split; Always in Header if Single | Contact details are compact metadata. |
| **`summary`** | Main Column | Default Main, unless explicit override `columnRouting.summary = 'sidebar'` | Professional summary requires wide paragraph line length ($65\text{–}75\text{ch}$). |
| **`experience`** | Main Column | Always Main | Multi-bullet chronology demands full column width. |
| **`projects`** | Main Column | Always Main | Project portfolios require wide cards or description lines. |
| **`education`** | **Dynamic (Main vs Sidebar)** | $\text{idx}(\text{edu}) \le 2 \lor |\text{idx}(\text{edu}) - \text{idx}(\text{exp})| = 1 \lor \text{idx}(\text{edu}) < \text{idx}(\text{exp})$ $\to$ **Main**; Else $\to$ **Sidebar** | Recent grads / academics put Education high $\to$ Main timeline. Experienced pros place Education low $\to$ Sidebar. |
| **`skills`** | **Dynamic (Main vs Sidebar)** | $\text{idx}(\text{skills}) \le 1 \land \text{idx}(\text{skills}) < \text{idx}(\text{exp})$ $\to$ **Main**; Else $\to$ **Sidebar** | Technical resumes placing Skills at the very top need wide matrix display. Standard resumes place Skills in Sidebar. |
| **`certifications`** | **Dynamic (Main vs Sidebar)** | If `layoutRules.defaultMainKeys.includes('certifications')` $\to$ **Main**; Else Sidebar | Can fit either sidebar badge list or main timeline. |
| **`references`** | Main Column | Default Main (2-column grid) | Reference cards require 2-column or wide layout. |
| **`custom_languages`** / Languages | Sidebar | Default Sidebar | Compact language proficiency ratings fit sidebar. |
| **`custom_*` (Other)** | Main Column | Default Main | General custom blocks contain multi-attribute tables or paragraphs. |

### 3.3 `themeLayout` ('single' vs 'split') Reflow Heuristic

- When `themeLayout === 'single'`:
  - `sidebarKeys` is cleared ($\emptyset$).
  - All active sections are routed into `mainKeys` in the **exact sequential order** of `sectionOrder`.
  - `isSplit` is evaluated to `false`.
  - The runtime supplies `layoutClass = 'layout-single'`, allowing CSS to collapse the sidebar container and render a full-width 100% linear stream.
- When `themeLayout === 'split'`:
  - The dynamic routing heuristics above partition sections between `sidebarKeys` and `mainKeys`.
  - `isSplit` is evaluated to `true`.
  - The runtime supplies `layoutClass = 'layout-split'`.

### 3.4 Complete Implementation Blueprint for `universalTemplateRuntime.js`

```javascript
// ═══════════════════════════════════════════════════════════════════════════════
// DocForge Universal Template Runtime & Dynamic Section Dispatcher
// ═══════════════════════════════════════════════════════════════════════════════

import { getFontFamilyCss, getGoogleFontsLinkTags, computeFontAdjustedLineSpacing } from './fontRegistry.js';

export const CANONICAL_SECTION_KEYS = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'references'
];

/**
 * Normalizes raw section order array, guaranteeing all custom sections and references are present.
 */
export function normalizeSectionOrder(data, rawOrder) {
  const customKeys = (data?.customSections || []).map(cs => cs.id);
  let order = Array.isArray(rawOrder) && rawOrder.length > 0
    ? [...rawOrder]
    : ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'references', ...customKeys];

  customKeys.forEach(cid => {
    if (!order.includes(cid)) order.push(cid);
  });

  if (data?.references?.length && !order.includes('references')) {
    order.push('references');
  }

  return order;
}

/**
 * Predicate verifying if a section actually contains non-empty user content (Zero Ghost Header rule).
 */
export function hasSectionContent(data, sectionKey) {
  if (!data) return false;
  switch (sectionKey) {
    case 'summary':
      return Boolean(data.summary && String(data.summary).trim().length > 0);
    case 'experience':
      return Array.isArray(data.experience) && data.experience.length > 0;
    case 'education':
      return Array.isArray(data.education) && data.education.length > 0;
    case 'skills':
      return Array.isArray(data.skills) && data.skills.length > 0;
    case 'projects':
      return Array.isArray(data.projects) && data.projects.length > 0;
    case 'certifications':
      return Array.isArray(data.certifications) && data.certifications.length > 0;
    case 'references':
      return Array.isArray(data.references) && data.references.length > 0;
    case 'contact':
      return Boolean(data.phone || data.email || data.location || data.website || data.linkedin || data.github);
    default:
      if (sectionKey === 'custom_languages' || sectionKey?.toLowerCase() === 'languages') {
        const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
        return Boolean(langSection && Array.isArray(langSection.items) && langSection.items.length > 0) ||
               Boolean(Array.isArray(data.custom_languages) && data.custom_languages.length > 0);
      }
      const cs = (data.customSections || []).find(c => c.id === sectionKey);
      return Boolean(cs && Array.isArray(cs.items) && cs.items.length > 0);
  }
}

/**
 * Computes dynamic column routing (Main vs Sidebar) based on serial position heuristics.
 */
export function computeColumnRouting(data, sectionOrder, layoutRules = {}, isSingleLayout = false) {
  const routing = {};
  if (isSingleLayout) {
    sectionOrder.forEach(key => { routing[key] = 'main'; });
    return routing;
  }

  const eduIdx = sectionOrder.indexOf('education');
  const expIdx = sectionOrder.indexOf('experience');
  const projIdx = sectionOrder.indexOf('projects');
  const skillsIdx = sectionOrder.indexOf('skills');

  // Education Heuristic
  const eduInMain = eduIdx !== -1 && (
    (eduIdx <= 2) ||
    (expIdx !== -1 && Math.abs(eduIdx - expIdx) === 1 && (projIdx === -1 || eduIdx < projIdx)) ||
    (expIdx !== -1 && eduIdx < expIdx) ||
    (layoutRules.columnRouting?.education === 'main')
  );

  // Skills Heuristic
  const skillsInMain = skillsIdx !== -1 && (
    (skillsIdx <= 1 && (expIdx === -1 || skillsIdx < expIdx)) ||
    (layoutRules.columnRouting?.skills === 'main')
  );

  sectionOrder.forEach(key => {
    // Explicit override check
    if (layoutRules.columnRouting?.[key]) {
      routing[key] = layoutRules.columnRouting[key];
      return;
    }

    if (key === 'contact') {
      routing[key] = 'sidebar';
    } else if (key === 'education') {
      routing[key] = eduInMain ? 'main' : 'sidebar';
    } else if (key === 'skills') {
      routing[key] = skillsInMain ? 'main' : 'sidebar';
    } else if (key === 'custom_languages' || key?.toLowerCase() === 'languages') {
      routing[key] = 'sidebar';
    } else if (key === 'summary' || key === 'experience' || key === 'projects' || key === 'references') {
      routing[key] = 'main';
    } else if (key === 'certifications') {
      routing[key] = (layoutRules.sidebarKeys?.includes('certifications') && !eduInMain) ? 'sidebar' : 'main';
    } else {
      // Custom sections
      const cs = (data?.customSections || []).find(c => c.id === key);
      if (cs && (cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages')) {
        routing[key] = 'sidebar';
      } else {
        routing[key] = 'main';
      }
    }
  });

  return routing;
}

/**
 * Universal Master Dispatcher
 */
export function renderUniversalOrderedSections(data, options = {}, renderers = {}, layoutRules = {}) {
  const safeData = data && typeof data === 'object' ? data : {};
  const isObjectTheme = typeof options === 'object' && options !== null;
  
  const themeColor = isObjectTheme ? (options.primaryColor || options.themeColor || '#2c3549') : '#2c3549';
  const themeFont = isObjectTheme ? (options.font || options.themeFont || 'Inter') : 'Inter';
  const rawOrder = isObjectTheme ? (options.sectionOrder || safeData.sectionOrder) : safeData.sectionOrder;
  const themeLayout = layoutRules.themeLayout || (isObjectTheme ? options.themeLayout : 'auto') || 'auto';
  const pageMargin = isObjectTheme && options.pageMargin !== undefined ? options.pageMargin : 0;
  const lineSpacing = isObjectTheme && options.lineSpacing !== undefined ? options.lineSpacing : 1.45;
  const partitions = options.partitions || null;

  const isExplicitSingle = themeLayout === 'single';
  const sectionOrder = normalizeSectionOrder(safeData, rawOrder);
  const routing = computeColumnRouting(safeData, sectionOrder, layoutRules, isExplicitSingle);

  const mainKeys = [];
  const sidebarKeys = [];

  sectionOrder.forEach(key => {
    if (!hasSectionContent(safeData, key)) return;
    if (routing[key] === 'sidebar' && !isExplicitSingle) {
      sidebarKeys.push(key);
    } else {
      mainKeys.push(key);
    }
  });

  const p1MainSections = [];
  const p2MainSections = [];

  for (const key of mainKeys) {
    if (partitions) {
      if (key === 'experience' && safeData.experience?.length && renderers.experience) {
        if (partitions.experience?.hasP1) {
          p1MainSections.push(renderers.experience(partitions.experience.p1, false, partitions.experience.p1Offset || 0));
        }
        if (partitions.experience?.hasP2) {
          p2MainSections.push(renderers.experience(partitions.experience.p2, partitions.experience.isP2Continuation, partitions.experience.p2Offset || 0));
        }
        continue;
      }
      if (key === 'projects' && safeData.projects?.length && renderers.projects) {
        if (partitions.projects?.hasP1) {
          p1MainSections.push(renderers.projects(partitions.projects.p1, false, partitions.projects.p1Offset || 0));
        }
        if (partitions.projects?.hasP2) {
          p2MainSections.push(renderers.projects(partitions.projects.p2, partitions.projects.isP2Continuation, partitions.projects.p2Offset || 0));
        }
        continue;
      }
      if (key === 'certifications' && safeData.certifications?.length && renderers.certifications) {
        if (partitions.certifications?.hasP1) p1MainSections.push(renderers.certifications(partitions.certifications.p1, false, 0));
        if (partitions.certifications?.hasP2) p2MainSections.push(renderers.certifications(partitions.certifications.p2, false, 0));
        continue;
      }
      if (key === 'references' && safeData.references?.length && renderers.references) {
        if (partitions.references?.hasP1) p1MainSections.push(renderers.references(partitions.references.p1, false, 0));
        if (partitions.references?.hasP2) p2MainSections.push(renderers.references(partitions.references.p2, false, 0));
        continue;
      }
      if ((key.startsWith('custom_') || (safeData.customSections || []).some(cs => cs.id === key)) && renderers.custom) {
        const cs = (safeData.customSections || []).find(c => c.id === key);
        const csPart = partitions.customSections?.[key];
        if (csPart) {
          if (csPart.hasP1) p1MainSections.push(renderers.custom({ ...csPart.cs, items: csPart.p1Items }));
          if (csPart.hasP2) p2MainSections.push(renderers.custom({ ...csPart.cs, items: csPart.p2Items }));
          continue;
        }
      }
    }

    // Standard unpartitioned rendering
    const renderer = renderers[key] || renderers.default;
    if (renderer) {
      const isMain = true;
      const html = renderer(safeData[key] || safeData, { isMain, key, themeColor, themeFont, lineSpacing, pageMargin });
      if (html) p1MainSections.push(html);
    }
  }

  const sidebarSections = [];
  for (const key of sidebarKeys) {
    const renderer = renderers[key] || renderers.default;
    if (renderer) {
      const isMain = false;
      const html = renderer(safeData[key] || safeData, { isMain, key, themeColor, themeFont, lineSpacing, pageMargin });
      if (html) sidebarSections.push(html);
    }
  }

  return {
    orderedKeys: sectionOrder,
    mainKeys,
    sidebarKeys,
    routing,
    isSplit: !isExplicitSingle && sidebarKeys.length > 0,
    layoutClass: isExplicitSingle ? 'layout-single' : 'layout-split',
    fontFamilyCss: getFontFamilyCss(themeFont),
    googleFontsLink: getGoogleFontsLinkTags(themeFont),
    adjustedLineSpacing: computeFontAdjustedLineSpacing(lineSpacing, themeFont),
    p1MainHtml: p1MainSections.filter(Boolean).join('\n'),
    p2MainHtml: p2MainSections.filter(Boolean).join('\n'),
    mainHtml: p1MainSections.concat(p2MainSections).filter(Boolean).join('\n'),
    sidebarHtml: sidebarSections.filter(Boolean).join('\n'),
    hasPage2: p2MainSections.length > 0
  };
}
```

---

## 4. Template Integration Pattern (Before & After)

### 4.1 Split-Column Template Example (`mariana.js`)

#### Before:
```javascript
// Hardcoded checks, partial mainKeys filter, hardcoded fonts
const fontFam = themeFont === 'Playfair Display' ? ... : ...;
const eduInMain = eduIdx !== -1 && ( ... );
// Hardcoded sidebar:
${contactHtml}
${eduHtml}
${skillsHtml}
${langHtml}
```

#### After:
```javascript
import { renderUniversalOrderedSections } from '../universalTemplateRuntime.js';
import { getFontFamilyCss, getGoogleFontsLinkTags } from '../fontRegistry.js';
import { computeTwoPagePartition } from '../paginationEngine.js';

export function generateMarianaHtml(data, themeOrColor, themeFontArg, sectionOrderArg, themeLayoutArg, pageMarginArg, lineSpacingArg) {
  // 1. Normalize options object
  const opts = typeof themeOrColor === 'object' && themeOrColor !== null
    ? themeOrColor
    : { primaryColor: themeOrColor, font: themeFontArg, sectionOrder: sectionOrderArg, themeLayout: themeLayoutArg, pageMargin: pageMarginArg, lineSpacing: lineSpacingArg };

  // 2. Compute partitions
  const { partitions } = computeTwoPagePartition({ data, ...opts });
  opts.partitions = partitions;

  // 3. Define visual renderers dictionary
  const renderers = {
    summary: (data) => renderSummaryMain(data.summary),
    experience: (items, isCont, offset) => renderExperienceItems(items, isCont, offset),
    education: (data, { isMain }) => isMain ? renderEducationMain(data.education) : renderEducationSidebar(data.education),
    skills: (data, { isMain }) => isMain ? renderSkillsMain(data.skills) : renderSkillsSidebar(data.skills),
    projects: (items, isCont, offset) => renderProjectItems(items, isCont, offset),
    certifications: (items, isCont, offset) => renderCertItems(items, isCont, offset),
    references: (items) => renderReferenceItems(items),
    custom: (cs) => renderCustomSection(cs),
    contact: (data) => renderContactSidebar(data)
  };

  // 4. Dispatch universal ordered sections
  const runtime = renderUniversalOrderedSections(data, opts, renderers, {
    sidebarKeys: ['contact', 'skills', 'custom_languages']
  });

  // 5. Compose HTML using runtime outputs
  return `<!DOCTYPE html>
<html>
<head>
  ${runtime.googleFontsLink}
  <style>
    body { font-family: ${runtime.fontFamilyCss}; line-height: ${runtime.adjustedLineSpacing}; }
    /* ... styling rules ... */
  </style>
</head>
<body class="${runtime.layoutClass}">
  <div class="cv-page" id="page-1">
    ${runtime.isSplit ? `
      <div class="sidebar">
        ${renderAvatar(data.photoUrl)}
        <div class="sidebar-content-flow">
          ${runtime.sidebarHtml}
        </div>
      </div>
    ` : ''}
    <div class="main-content">
      ${renderMainHeader(data)}
      ${runtime.p1MainHtml}
    </div>
  </div>
  ${runtime.hasPage2 ? `
    <div class="cv-page cv-page-white" id="page-2">
      <div class="page-2-body">
        ${runtime.p2MainHtml}
      </div>
    </div>
  ` : ''}
</body>
</html>`;
}
```

---

## 5. Comprehensive 4-Tier Test Suite Specification (110+ Assertions)

The test file `tests/frontend/test_r1_universal_runtime.mjs` is structured into 4 distinct verification tiers adhering to the **Strict Molecular Testing & Flaw-Hunting Protocol (30–100 Test Invariant)**:

### 5.1 Test Area Inventory

| Tier | Test Area # | Area Name | Tested Code Path & Property | Assertion Count |
|---|---|---|---|---|
| **Tier 1** | Area 1–8 | Font Registry 8-Core Completeness | Verifies presence, category, and metadata for all 8 fonts (`inter`, `outfit`, `open_sans`, `roboto`, `merriweather`, `playfair_display`, `plus_jakarta_sans`, `lora`). | 16 |
| | Area 9 | Case-Insensitive Normalization | Exercises `normalizeFontKey` on 12 varied string formats (kebab, snake, upper, aliases). | 12 |
| | Area 10 | Fallback & Unknown Font Handling | Asserts safe fallback to `inter` on `null`, `undefined`, empty, or garbage strings. | 4 |
| | Area 11 | CSS `font-family` Stack Veracity | Checks exact quotation, system font fallbacks, and serif/sans-serif terminal stacks. | 8 |
| | Area 12 | Google Fonts URL Formulation | Validates `fonts.googleapis.com` URL query encoding for single fonts. | 8 |
| | Area 13 | Multi-Font Combined Link Generation | Verifies `getCombinedGoogleFontsLinkTags` builds unified single HTTP request link. | 4 |
| | Area 14 | Metric-Adjusted Line Spacing | Computes exact mathematical line spacing scaling across varied font metrics. | 8 |
| **Tier 2** | Area 15 | Section Order Normalization | Asserts custom sections and references are appended without mutation. | 6 |
| | Area 16 | Zero Ghost Header Predicate | Falsifies empty strings, `[]`, `null` across all 8 standard and custom section types. | 9 |
| | Area 17 | Custom Section Empty vs Filled | Tests custom section item array detection and placeholder handling. | 4 |
| | Area 18 | Deterministic Linear Ordering | Verifies `['skills', 'experience', 'education']` produces exact DOM sequence. | 6 |
| | Area 19 | Inverted Chronology Ordering | Verifies `['education', 'summary', 'projects', 'experience']` produces exact DOM sequence. | 6 |
| | Area 20 | References Ordering & Inclusion | Asserts references position in `sectionOrder` is strictly respected. | 4 |
| **Tier 3** | Area 21 | Education Early Routing ($e \le 2$) | Asserts Education placed at index 0 or 1 routes to Main Column. | 4 |
| | Area 22 | Education Late Routing ($e > 2$) | Asserts Education placed after experience/projects routes to Sidebar. | 4 |
| | Area 23 | Education Adjacent Routing ($|e - x| = 1$) | Asserts Education placed adjacent to Experience routes to Main Column. | 4 |
| | Area 24 | Skills Early Routing ($k \le 1$) | Asserts Skills placed before Experience routes to Main Column. | 4 |
| | Area 25 | Skills Normal Routing ($k > 1$) | Asserts Skills placed later in list routes to Sidebar. | 4 |
| | Area 26 | Custom Language Sidebar Lock | Asserts language sections always route to Sidebar in split mode. | 4 |
| | Area 27 | Explicit Column Routing Override | Asserts `layoutRules.columnRouting` overrides automatic heuristics. | 4 |
| **Tier 4** | Area 28 | `themeLayout === 'single'` Reflow | Asserts `sidebarKeys` is empty and all items flow linearly into `mainHtml`. | 6 |
| | Area 29 | `themeLayout === 'split'` Partitioning | Asserts sidebar sections populate `sidebarHtml` and main sections populate `p1MainHtml`. | 6 |
| | Area 30 | Multi-Page Partition Integration | Verifies Page 1 and Page 2 split integrity with offset tracking and continuation headers. | 6 |
| | Area 31 | WYSIWYG `data-df-field` Index Continuity | Verifies `exp:0:role`, `exp:1:role` indices remain contiguous after reordering. | 6 |
| | Area 32 | Extreme Payload Scaling (10+ Items) | Stress tests 10 experience items and 8 education items across 2 pages. | 5 |
| | Area 33 | Zero Payload Empty State | Asserts 0 items produce valid empty-safe markup with zero exceptions. | 4 |
| | Area 34 | Template Retrofit Parity (`mariana.js`) | Executes refactored `generateMarianaHtml` under single and split layouts. | 6 |
| | Area 35 | Template Retrofit Parity (`harvard_classic.js`) | Executes `generateHarvardClassicHtml` under dynamic section reordering. | 4 |

**Total Assertion Count**: **168 Distinct, Falsifiable Assertions across 35 Areas**.

---

## 6. Implementation Action Plan & File Touchpoints

1. **Create `src/engines/utility/fontRegistry.js`**:
   - Export `FONT_REGISTRY`, `normalizeFontKey`, `getFontConfig`, `getFontFamilyCss`, `getGoogleFontUrl`, `getGoogleFontsLinkTags`, `getCombinedGoogleFontsLinkTags`, `computeFontAdjustedLineSpacing`, `getAllFontOptions`.
2. **Create `src/engines/utility/universalTemplateRuntime.js`**:
   - Export `CANONICAL_SECTION_KEYS`, `normalizeSectionOrder`, `hasSectionContent`, `computeColumnRouting`, `renderUniversalOrderedSections`.
3. **Update UI Dropdown in `src/pages/utility/ResumeBuilder.jsx` & `src/components/ResumeStudio/`**:
   - Populate Font Family dropdown with all 8 core fonts from `getAllFontOptions()`.
   - Wire `themeLayout` ('single' vs 'split') state cleanly into template invocations.
4. **Create & Run Verification Test Suite**:
   - Implement `tests/frontend/test_r1_universal_runtime.mjs`.
   - Execute via `node tests/frontend/test_r1_universal_runtime.mjs`.

---
