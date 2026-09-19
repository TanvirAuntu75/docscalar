// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Universal Template Runtime & Dynamic Section Dispatcher
// ═══════════════════════════════════════════════════════════════════════════════

import {
  getFontFamilyCss,
  getGoogleFontsLinkTags,
  computeFontAdjustedLineSpacing
} from './fontRegistry.js';
import { computeTwoPagePartition } from './paginationEngine.js';

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
 * @param {object} data - Resume data payload
 * @param {string[]} rawOrder - User-provided section order
 * @returns {string[]} Normalized section keys order
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
 * @param {object} data - Resume data payload
 * @param {string} sectionKey - Section identifier
 * @returns {boolean} True if non-empty content exists
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
 * @param {object} data - Resume data payload
 * @param {string[]} sectionOrder - Ordered section keys
 * @param {object} layoutRules - Configuration overrides (e.g. columnRouting, sidebarKeys)
 * @param {boolean} isSingleLayout - True if themeLayout === 'single'
 * @returns {Record<string, 'main' | 'sidebar'>} Column routing mapping
 */
export function computeColumnRouting(data, sectionOrder, layoutRules = {}, isSingleLayout = false) {
  const routing = {};
  if (isSingleLayout) {
    sectionOrder.forEach(key => { routing[key] = 'main'; });
    return routing;
  }

  const eduIdx = sectionOrder.indexOf('education');
  const expIdx = sectionOrder.indexOf('experience');
  const skillsIdx = sectionOrder.indexOf('skills');

  // Education Heuristic:
  // Route to Main if placed early (idx <= 2), adjacent to experience (|eduIdx - expIdx| === 1), or before experience.
  const eduInMain = eduIdx !== -1 && (
    (eduIdx <= 2) ||
    (expIdx !== -1 && Math.abs(eduIdx - expIdx) === 1) ||
    (expIdx !== -1 && eduIdx < expIdx) ||
    (layoutRules.columnRouting?.education === 'main')
  );

  // Skills Heuristic:
  // Route to Main if placed at very beginning (idx <= 1) and before experience.
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
 * Deterministically renders sections based on sectionOrder, column heuristics, and multi-page partitions.
 *
 * @param {object} data - Resume data payload
 * @param {object|string} options - Theme options or primary color string
 * @param {Record<string, Function>} renderers - Dictionary of section renderer functions
 * @param {object} layoutRules - Layout rules and column preferences
 * @returns {object} Master runtime execution output
 */
export function renderUniversalOrderedSections(data, options = {}, renderers = {}, layoutRules = {}) {
  const safeData = data && typeof data === 'object' ? data : {};
  const isObjectTheme = typeof options === 'object' && options !== null && !Array.isArray(options);

  const themeColor = isObjectTheme ? (options.primaryColor || options.themeColor || '#2c3549') : (typeof options === 'string' && options ? options : '#2c3549');
  const themeFont = isObjectTheme ? (options.font || options.themeFont || 'Inter') : 'Inter';
  const rawOrder = isObjectTheme ? (options.sectionOrder || safeData.sectionOrder) : safeData.sectionOrder;
  const themeLayout = (isObjectTheme ? options.themeLayout : null) || layoutRules.themeLayout || 'auto';
  const pageMargin = isObjectTheme && options.pageMargin !== undefined ? options.pageMargin : 0;
  const lineSpacing = isObjectTheme && options.lineSpacing !== undefined ? options.lineSpacing : 1.45;
  const partitions = isObjectTheme && options.partitions
    ? options.partitions
    : (() => {
        try {
          const res = computeTwoPagePartition({
            data: safeData,
            lineSpacing,
            pageMargin,
            themeLayout,
            sectionOrder: rawOrder,
            layoutRules
          });
          return res?.partitions || null;
        } catch (_) {
          return null;
        }
      })();

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
      if (key === 'summary' && safeData.summary && renderers.summary) {
        if (partitions.summary?.hasP1 !== false) {
          p1MainSections.push(renderers.summary(safeData, { isMain: true, themeColor, themeFont, lineSpacing, pageMargin }));
        }
        if (partitions.summary?.hasP2) {
          p2MainSections.push(renderers.summary(safeData, { isMain: true, themeColor, themeFont, lineSpacing, pageMargin }));
        }
        continue;
      }
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
      if (key === 'education' && safeData.education?.length && renderers.education) {
        if (partitions.education?.hasP1) {
          p1MainSections.push(renderers.education(partitions.education.p1, { isMain: true, isContinuation: false, offset: partitions.education.p1Offset || 0, themeColor, themeFont, lineSpacing, pageMargin }));
        }
        if (partitions.education?.hasP2) {
          p2MainSections.push(renderers.education(partitions.education.p2, { isMain: true, isContinuation: partitions.education.isP2Continuation, offset: partitions.education.p2Offset || 0, themeColor, themeFont, lineSpacing, pageMargin }));
        }
        continue;
      }
      if (key === 'skills' && safeData.skills?.length && renderers.skills) {
        if (partitions.skills?.hasP1) {
          p1MainSections.push(renderers.skills(partitions.skills.p1, { isMain: true, isContinuation: false, offset: 0, themeColor, themeFont, lineSpacing, pageMargin }));
        }
        if (partitions.skills?.hasP2) {
          p2MainSections.push(renderers.skills(partitions.skills.p2, { isMain: true, isContinuation: false, offset: 0, themeColor, themeFont, lineSpacing, pageMargin }));
        }
        continue;
      }
      if (key === 'certifications' && safeData.certifications?.length && renderers.certifications) {
        if (partitions.certifications?.hasP1) p1MainSections.push(renderers.certifications(partitions.certifications.p1, { isMain: true, isContinuation: false, offset: 0, themeColor, themeFont, lineSpacing, pageMargin }));
        if (partitions.certifications?.hasP2) p2MainSections.push(renderers.certifications(partitions.certifications.p2, { isMain: true, isContinuation: false, offset: 0, themeColor, themeFont, lineSpacing, pageMargin }));
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
          if (csPart.hasP1) p1MainSections.push(renderers.custom({ ...csPart.cs, items: csPart.p1Items }, { isMain: true, key, themeColor, themeFont, lineSpacing, pageMargin }));
          if (csPart.hasP2) p2MainSections.push(renderers.custom({ ...csPart.cs, items: csPart.p2Items }, { isMain: true, key, themeColor, themeFont, lineSpacing, pageMargin }));
          continue;
        } else if (cs) {
          p1MainSections.push(renderers.custom(cs, { isMain: true, key, themeColor, themeFont, lineSpacing, pageMargin }));
          continue;
        }
      }
    }

    // Standard unpartitioned rendering
    const isCustomKey = key.startsWith('custom_') || (safeData.customSections || []).some(cs => cs.id === key);
    const renderer = renderers[key] || (isCustomKey ? renderers.custom : null) || renderers.default;
    if (renderer) {
      const isMain = true;
      const targetPayload = isCustomKey ? (safeData.customSections || []).find(c => c.id === key) : safeData;
      const html = isCustomKey
        ? renderer(targetPayload, { isMain, key, themeColor, themeFont, lineSpacing, pageMargin, isContinuation: false, offset: 0 })
        : renderer(safeData, { isMain, key, themeColor, themeFont, lineSpacing, pageMargin, isContinuation: false, offset: 0 });
      if (html) p1MainSections.push(html);
    }
  }

  const sidebarSections = [];
  for (const key of sidebarKeys) {
    const isCustomKey = key.startsWith('custom_') || (safeData.customSections || []).some(cs => cs.id === key);
    const renderer = renderers[key] || (isCustomKey ? renderers.custom : null) || renderers.default;
    if (renderer) {
      const isMain = false;
      const targetPayload = isCustomKey ? (safeData.customSections || []).find(c => c.id === key) : safeData;
      const html = isCustomKey
        ? renderer(targetPayload, { isMain, key, themeColor, themeFont, lineSpacing, pageMargin, isContinuation: false, offset: 0 })
        : renderer(safeData, { isMain, key, themeColor, themeFont, lineSpacing, pageMargin, isContinuation: false, offset: 0 });
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
