// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Universal Pagination Engine
// Dynamic Sub-Item Bin-Packing, Continuous Offset Tracking & Discrete Page Partitioning
// ═══════════════════════════════════════════════════════════════════════════════

import { normalizeSectionOrder, computeColumnRouting } from './universalTemplateRuntime.js';

/**
 * Calculates exact subpixel height of a work experience item including multi-bullet and description wrapping.
 * Accounts for column width (single column fits ~92 chars/line, split column fits ~62 chars/line).
 */
export const estimateJobHeight = (e, spacing = 1.45, isSingleColumn = false) => {
  if (!e) return 0;
  const charsPerLine = isSingleColumn ? 92 : 62;
  let h = 32; // Role + Company + Dates line height

  if (e.description && String(e.description).trim()) {
    const rawLines = String(e.description).trim().split(/\r?\n/);
    const descLines = rawLines.reduce((acc, line) => acc + (line.trim() === '' ? 1 : Math.max(1, Math.ceil(line.length / charsPerLine))), 0);
    h += (descLines * 12.5 * spacing) + 4;
  }

  let bulletsHeight = 0;
  (e.highlights || []).filter(Boolean).forEach(b => {
    const bStr = typeof b === 'string' ? b : String(b);
    const lines = Math.max(1, Math.ceil(bStr.length / charsPerLine));
    bulletsHeight += (lines * 12.5 * spacing) + 3;
  });
  h += bulletsHeight;

  return h + 8; // Padding / margin bottom
};

/**
 * Calculates exact subpixel height of a project card including description and highlight wrapping.
 */
export const estimateProjHeight = (p, spacing = 1.45, isSingleColumn = false) => {
  if (!p) return 0;
  const charsPerLine = isSingleColumn ? 92 : 62;
  const descLines = p.description ? Math.max(1, Math.ceil(String(p.description).length / charsPerLine)) : 0;
  let bulletsHeight = 0;
  (p.highlights || []).filter(Boolean).forEach(b => {
    const bStr = typeof b === 'string' ? b : String(b);
    const lines = Math.max(1, Math.ceil(bStr.length / charsPerLine));
    bulletsHeight += (lines * 12.5 * spacing) + 3;
  });
  return 20 + (descLines * 12.5 * spacing) + bulletsHeight + 8;
};

/**
 * Calculates exact height for a single education entry item.
 */
export const estimateEduItemHeight = (eduItem, spacing = 1.45, isSingleColumn = false) => {
  if (!eduItem) return 0;
  const charsPerLine = isSingleColumn ? 92 : 62;
  const noteLines = (eduItem.note || eduItem.description)
    ? Math.max(1, Math.ceil(String(eduItem.note || eduItem.description).length / charsPerLine))
    : 0;
  return 32 + (noteLines * 12.5 * spacing) + 6;
};

/**
 * Calculates exact height for education section (heading + items).
 */
export const estimateEduHeight = (edu, spacing = 1.45, isSingleColumn = false) => {
  if (!edu || (Array.isArray(edu) && !edu.length)) return 0;
  if (Array.isArray(edu)) {
    const itemsH = edu.reduce((sum, item) => sum + estimateEduItemHeight(item, spacing, isSingleColumn), 0);
    return 36 + itemsH;
  }
  return estimateEduItemHeight(edu, spacing, isSingleColumn);
};

/**
 * Calculates exact height for skills section (heading + skill grid/pills).
 */
export const estimateSkillsHeight = (skills, spacing = 1.45, isSingleColumn = false) => {
  if (!skills || !skills.length) return 0;
  const itemsPerRow = isSingleColumn ? 6 : 3.5;
  const rows = Math.ceil(skills.length / itemsPerRow);
  return 36 + (rows * 24 * (spacing / 1.45));
};

/**
 * Calculates exact height for certifications list.
 */
export const estimateCertHeight = (certs, spacing = 1.45) => {
  if (!certs || !certs.length) return 0;
  return 36 + (certs.length * 16 * spacing);
};

/**
 * Calculates exact height for references cards accounting for lineSpacing and multi-line contact rows.
 */
export const estimateRefHeight = (refs, spacing = 1.45, isSingleColumn = false) => {
  if (!refs || !refs.length) return 0;
  const cardHeight = (isSingleColumn ? 72 : 58) * (spacing / 1.45);
  const rows = Math.ceil(refs.length / 2);
  return 36 + (rows * cardHeight);
};

/**
 * Calculates exact height for custom section cards.
 */
export const estimateCustomSectionHeight = (items, spacing = 1.45, isSingleColumn = false) => {
  const count = Array.isArray(items) && items.length > 0 ? items.length : 1;
  const rows = Math.ceil(count / 2);
  return 36 + (rows * 24 * (spacing / 1.45));
};

/**
 * Computes candidate header height accounting for dynamic summary line-wrapping.
 */
export const computeHeaderHeight = (data, spacing = 1.45, baseHeight = 60, summaryInHeader = true) => {
  let hHeight = baseHeight;
  if (data && typeof data === 'object') {
    const hasPhoto = Boolean(data.photoUrl || data.avatar || data.photo);
    const hasName = Boolean(data.name);
    const hasTitle = Boolean(data.title);
    const contactCount = [data.email, data.phone, data.location, data.linkedin, data.website].filter(Boolean).length;
    if (hasPhoto || hasName || contactCount > 0) {
      let calcHeader = 0;
      if (hasPhoto) calcHeader += 95;
      if (hasName) calcHeader += 36;
      if (hasTitle) calcHeader += 24;
      if (contactCount > 0) calcHeader += (contactCount > 3 ? 42 : 24) * (spacing / 1.45);
      calcHeader += 16;
      hHeight = Math.max(baseHeight, Math.round(calcHeader));
    }
  }
  if (summaryInHeader && data && data.summary) {
    const rawLines = String(data.summary).split(/\r?\n/);
    const totalLines = rawLines.reduce((acc, line) => acc + (line.trim() === '' ? 1 : Math.max(1, Math.ceil(line.length / 75))), 0);
    hHeight += (Math.max(1, totalLines) * 12.5 * spacing) + 10;
  }
  return hHeight;
};

/**
 * Core Greedy Bin-Packing Algorithm with Dynamic Column Routing & Spacing Ladder Auto-Tuning.
 * Partitions resume sections and sub-items across Page 1 and Page 2 sheets.
 * Guarantees zero orphan headers, continuous index offset accounting, and discrete Page 2 budgeting.
 */
export const computeTwoPagePartition = (arg1, arg2 = {}) => {
  let data, sectionOrder, pageMargin, lineSpacing, baseHeaderHeight, page2HeaderHeight, totalPageHeight, layoutRules, isSingleLayout;
  if (arg1 && typeof arg1 === 'object' && ('data' in arg1 || 'sectionOrder' in arg1 || 'totalPageHeight' in arg1)) {
    data = arg1.data;
    sectionOrder = arg1.sectionOrder;
    pageMargin = arg1.pageMargin !== undefined ? arg1.pageMargin : 0;
    lineSpacing = arg1.lineSpacing !== undefined ? arg1.lineSpacing : 1.45;
    baseHeaderHeight = arg1.baseHeaderHeight !== undefined ? arg1.baseHeaderHeight : 60;
    page2HeaderHeight = arg1.page2HeaderHeight !== undefined ? arg1.page2HeaderHeight : 0;
    totalPageHeight = arg1.totalPageHeight !== undefined ? arg1.totalPageHeight : 1043;
    layoutRules = arg1.layoutRules || {};
    isSingleLayout = arg1.isSingleLayout || arg1.themeLayout === 'single' || layoutRules?.themeLayout === 'single' || false;
  } else {
    data = arg1;
    sectionOrder = arg2.sectionOrder;
    pageMargin = arg2.pageMargin !== undefined ? arg2.pageMargin : 0;
    lineSpacing = arg2.lineSpacing !== undefined ? arg2.lineSpacing : 1.45;
    baseHeaderHeight = arg2.baseHeaderHeight !== undefined ? arg2.baseHeaderHeight : 60;
    page2HeaderHeight = arg2.page2HeaderHeight !== undefined ? arg2.page2HeaderHeight : 0;
    totalPageHeight = arg2.totalPageHeight !== undefined ? arg2.totalPageHeight : 1043;
    layoutRules = arg2.layoutRules || {};
    isSingleLayout = arg2.isSingleLayout || arg2.themeLayout === 'single' || layoutRules?.themeLayout === 'single' || false;
  }

  const safeData = data && typeof data === 'object' ? data : {};
  sectionOrder = normalizeSectionOrder(safeData, sectionOrder);

  let activeSpacing = lineSpacing;
  let activeMargin = pageMargin;
  let sectionGap = 16;

  const summaryInHeader = Boolean(layoutRules?.summaryInHeader);

  // 1. Dynamic Column Routing Detection
  const routing = computeColumnRouting(safeData, sectionOrder, layoutRules, isSingleLayout);

  // Build main column keys dynamically
  const mainKeys = sectionOrder.filter(k =>
    routing[k] === 'main' && (summaryInHeader ? k !== 'summary' : true) && k !== 'contact'
  );

  // Ensure any data sections routed to main that might be missing from sectionOrder are automatically included
  if (!summaryInHeader && safeData.summary && routing.summary === 'main' && !mainKeys.includes('summary')) mainKeys.push('summary');
  if (safeData.experience?.length && routing.experience === 'main' && !mainKeys.includes('experience')) mainKeys.push('experience');
  if (safeData.education?.length && routing.education === 'main' && !mainKeys.includes('education')) mainKeys.push('education');
  if (safeData.skills?.length && routing.skills === 'main' && !mainKeys.includes('skills')) mainKeys.push('skills');
  if (safeData.projects?.length && routing.projects === 'main' && !mainKeys.includes('projects')) mainKeys.push('projects');
  if (safeData.certifications?.length && routing.certifications === 'main' && !mainKeys.includes('certifications')) mainKeys.push('certifications');
  if (safeData.references?.length && routing.references === 'main' && !mainKeys.includes('references')) mainKeys.push('references');
  (safeData.customSections || []).forEach(cs => {
    if (routing[cs.id] === 'main' && !mainKeys.includes(cs.id)) {
      mainKeys.push(cs.id);
    }
  });

  // Helper to calculate total height of a section in main column
  const getSectionTotalHeight = (key, sp, isSingle) => {
    if (key === 'summary' && safeData.summary && String(safeData.summary).trim()) {
      const rawLines = String(safeData.summary).trim().split(/\r?\n/);
      const charsPerLine = isSingle ? 75 : 55;
      const sumLines = rawLines.reduce((acc, line) => acc + (line.trim() === '' ? 1 : Math.max(1, Math.ceil(line.length / charsPerLine))), 0);
      return 36 + Math.round(sumLines * 14 * sp) + 12;
    }
    if (key === 'experience' && safeData.experience?.length) {
      return 36 + safeData.experience.reduce((sum, e) => sum + estimateJobHeight(e, sp, isSingle), 0);
    }
    if (key === 'education' && safeData.education?.length) {
      return estimateEduHeight(safeData.education, sp, isSingle);
    }
    if (key === 'skills' && safeData.skills?.length) {
      return estimateSkillsHeight(safeData.skills, sp, isSingle);
    }
    if (key === 'projects' && safeData.projects?.length) {
      return 36 + safeData.projects.reduce((sum, p) => sum + estimateProjHeight(p, sp, isSingle), 0);
    }
    if (key === 'certifications' && safeData.certifications?.length) {
      return estimateCertHeight(safeData.certifications, sp);
    }
    if (key === 'references' && safeData.references?.length) {
      return estimateRefHeight(safeData.references, sp, isSingle);
    }
    const cs = (safeData.customSections || []).find(c => c.id === key && c.id !== 'custom_languages' && c.title?.toLowerCase() !== 'languages');
    if (cs) {
      const items = Array.isArray(cs.items) && cs.items.length ? cs.items : [{ title: `${cs.title || 'Item'} Details`, value: '' }];
      return estimateCustomSectionHeight(items, sp, isSingle);
    }
    return 0;
  };

  // 2. Pre-calculate total estimated height across all active main column sections
  let totalMainContentHeight = 0;
  for (const key of mainKeys) {
    const sH = getSectionTotalHeight(key, activeSpacing, isSingleLayout);
    if (sH > 0) totalMainContentHeight += sH + sectionGap;
  }

  // 3. Page 1 & Page 2 Budgets
  let headerHeight = computeHeaderHeight(safeData, activeSpacing, baseHeaderHeight, summaryInHeader);
  let page1Budget = totalPageHeight - (activeMargin * 2) - headerHeight;
  let autoTuned = { applied: false, lineSpacing: activeSpacing, pageMargin: activeMargin, sectionGap };

  // Spacing ladder auto-tuning (12% micro-tuning invariant):
  // When total content height is within 12% of single page budget, apply micro-tuning before forcing a 2-page split
  // only if lineSpacing was not explicitly set to wide spacing (> 1.45) or autoTune is explicitly disabled.
  const userExplicitWideSpacing = lineSpacing > 1.45;
  const allowAutoTune = arg1?.allowAutoTune !== undefined ? Boolean(arg1.allowAutoTune) : !userExplicitWideSpacing;
  let fitsEntirelyOnPage1 = totalMainContentHeight <= page1Budget;
  if (allowAutoTune && !fitsEntirelyOnPage1 && totalMainContentHeight <= (page1Budget * 1.12)) {
    const tunedSpacing = 1.25;
    const tunedMargin = activeMargin === 0 ? 6 : activeMargin;
    const tunedGap = 10;
    const tunedHeaderHeight = computeHeaderHeight(safeData, tunedSpacing, baseHeaderHeight);
    const tunedPage1Budget = totalPageHeight - (tunedMargin * 2) - tunedHeaderHeight;

    let tunedTotalContentHeight = 0;
    for (const key of mainKeys) {
      const sH = getSectionTotalHeight(key, tunedSpacing, isSingleLayout);
      if (sH > 0) tunedTotalContentHeight += sH + tunedGap;
    }

    if (tunedTotalContentHeight <= tunedPage1Budget) {
      activeSpacing = tunedSpacing;
      activeMargin = tunedMargin;
      sectionGap = tunedGap;
      headerHeight = tunedHeaderHeight;
      page1Budget = tunedPage1Budget;
      fitsEntirelyOnPage1 = true;
      autoTuned = {
        applied: true,
        lineSpacing: tunedSpacing,
        pageMargin: tunedMargin,
        sectionGap: tunedGap
      };
    }
  }

  // Discrete Page 2 budget
  const page2Budget = totalPageHeight - (activeMargin * 2) - page2HeaderHeight;
  let remainingBudget = page1Budget;
  let p2RemainingBudget = page2Budget;

  const partitions = {
    summary: { hasP1: summaryInHeader ? !!(safeData.summary && String(safeData.summary).trim()) : false, hasP2: false },
    experience: { p1: [], p2: [], p1Offset: 0, p2Offset: 0, hasP1: false, hasP2: false, isP2Continuation: false },
    education: {
      p1: routing.education === 'sidebar' && !isSingleLayout ? [...(safeData.education || [])] : [],
      p2: [],
      p1Offset: 0,
      p2Offset: 0,
      hasP1: routing.education === 'sidebar' && !isSingleLayout ? !!(safeData.education?.length) : false,
      hasP2: false,
      isP2Continuation: false
    },
    skills: {
      p1: routing.skills === 'sidebar' && !isSingleLayout ? [...(safeData.skills || [])] : [],
      p2: [],
      hasP1: routing.skills === 'sidebar' && !isSingleLayout ? !!(safeData.skills?.length) : false,
      hasP2: false
    },
    projects: { p1: [], p2: [], p1Offset: 0, p2Offset: 0, hasP1: false, hasP2: false, isP2Continuation: false },
    certifications: { p1: [], p2: [], hasP1: false, hasP2: false },
    references: { p1: [], p2: [], hasP1: false, hasP2: false },
    customSections: {}
  };

  let onPage2 = false;

  for (const key of mainKeys) {
    if (key === 'summary' && safeData.summary && String(safeData.summary).trim()) {
      const sH = getSectionTotalHeight('summary', activeSpacing, isSingleLayout);
      if (fitsEntirelyOnPage1) {
        partitions.summary.hasP1 = true;
        remainingBudget = Math.max(0, remainingBudget - (sH + sectionGap));
      } else if (onPage2) {
        if (sH <= p2RemainingBudget && p2RemainingBudget > 0) {
          partitions.summary.hasP2 = true;
          p2RemainingBudget = Math.max(0, p2RemainingBudget - (sH + sectionGap));
        }
      } else {
        if (sH <= remainingBudget) {
          partitions.summary.hasP1 = true;
          remainingBudget = Math.max(0, remainingBudget - (sH + sectionGap));
        } else {
          onPage2 = true;
          if (sH <= p2RemainingBudget && p2RemainingBudget > 0) {
            partitions.summary.hasP2 = true;
            p2RemainingBudget = Math.max(0, p2RemainingBudget - (sH + sectionGap));
          }
        }
      }
    } else if (key === 'experience' && safeData.experience && safeData.experience.length) {
      const itemHeights = safeData.experience.map(e => estimateJobHeight(e, activeSpacing, isSingleLayout));
      if (fitsEntirelyOnPage1) {
        partitions.experience.p1 = [...safeData.experience];
        partitions.experience.hasP1 = true;
        partitions.experience.p1Offset = 0;
        remainingBudget = Math.max(0, remainingBudget - (36 + itemHeights.reduce((a, b) => a + b, 0) + sectionGap));
      } else if (onPage2) {
        partitions.experience.p2 = [...safeData.experience];
        partitions.experience.hasP2 = true;
        partitions.experience.p2Offset = 0;
        partitions.experience.isP2Continuation = false;
        const usedP2 = 36 + itemHeights.reduce((a, b) => a + b, 0);
        p2RemainingBudget = Math.max(0, p2RemainingBudget - (usedP2 + sectionGap));
      } else {
        if (36 + itemHeights[0] > remainingBudget && remainingBudget < page1Budget) {
          onPage2 = true;
          partitions.experience.p2 = [...safeData.experience];
          partitions.experience.hasP2 = true;
          partitions.experience.p2Offset = 0;
          partitions.experience.isP2Continuation = false;
          const usedP2 = 36 + itemHeights.reduce((a, b) => a + b, 0);
          p2RemainingBudget = Math.max(0, p2RemainingBudget - (usedP2 + sectionGap));
        } else {
          const p1Jobs = [];
          let usedHeight = 36;
          for (let i = 0; i < safeData.experience.length; i++) {
            if (p1Jobs.length === 0 || usedHeight + itemHeights[i] <= remainingBudget) {
              p1Jobs.push(safeData.experience[i]);
              usedHeight += itemHeights[i];
            } else {
              break;
            }
          }
          partitions.experience.p1 = p1Jobs;
          partitions.experience.hasP1 = p1Jobs.length > 0;
          partitions.experience.p1Offset = 0;
          remainingBudget = Math.max(0, remainingBudget - (usedHeight + sectionGap));

          if (p1Jobs.length < safeData.experience.length) {
            onPage2 = true;
            const remainingJobs = safeData.experience.slice(p1Jobs.length);
            partitions.experience.p2 = remainingJobs;
            partitions.experience.hasP2 = true;
            partitions.experience.p2Offset = p1Jobs.length;
            partitions.experience.isP2Continuation = true;
            const usedP2 = 36 + remainingJobs.map((_, i) => itemHeights[p1Jobs.length + i]).reduce((a, b) => a + b, 0);
            p2RemainingBudget = Math.max(0, p2RemainingBudget - (usedP2 + sectionGap));
          }
        }
      }
    } else if (key === 'projects' && safeData.projects && safeData.projects.length) {
      const itemHeights = safeData.projects.map(p => estimateProjHeight(p, activeSpacing, isSingleLayout));
      if (fitsEntirelyOnPage1) {
        partitions.projects.p1 = [...safeData.projects];
        partitions.projects.hasP1 = true;
        partitions.projects.p1Offset = 0;
        remainingBudget = Math.max(0, remainingBudget - (36 + itemHeights.reduce((a, b) => a + b, 0) + sectionGap));
      } else if (onPage2) {
        partitions.projects.p2 = [...safeData.projects];
        partitions.projects.hasP2 = true;
        partitions.projects.p2Offset = 0;
        partitions.projects.isP2Continuation = false;
        const usedP2 = 36 + itemHeights.reduce((a, b) => a + b, 0);
        p2RemainingBudget = Math.max(0, p2RemainingBudget - (usedP2 + sectionGap));
      } else {
        if (36 + itemHeights[0] > remainingBudget && remainingBudget < page1Budget) {
          onPage2 = true;
          partitions.projects.p2 = [...safeData.projects];
          partitions.projects.hasP2 = true;
          partitions.projects.p2Offset = 0;
          partitions.projects.isP2Continuation = false;
          const usedP2 = 36 + itemHeights.reduce((a, b) => a + b, 0);
          p2RemainingBudget = Math.max(0, p2RemainingBudget - (usedP2 + sectionGap));
        } else {
          const p1Projs = [];
          let usedHeight = 36;
          for (let i = 0; i < safeData.projects.length; i++) {
            if (p1Projs.length === 0 || usedHeight + itemHeights[i] <= remainingBudget) {
              p1Projs.push(safeData.projects[i]);
              usedHeight += itemHeights[i];
            } else {
              break;
            }
          }
          partitions.projects.p1 = p1Projs;
          partitions.projects.hasP1 = p1Projs.length > 0;
          partitions.projects.p1Offset = 0;
          remainingBudget = Math.max(0, remainingBudget - (usedHeight + sectionGap));

          if (p1Projs.length < safeData.projects.length) {
            onPage2 = true;
            const remainingProjs = safeData.projects.slice(p1Projs.length);
            partitions.projects.p2 = remainingProjs;
            partitions.projects.hasP2 = true;
            partitions.projects.p2Offset = p1Projs.length;
            partitions.projects.isP2Continuation = true;
            const usedP2 = 36 + remainingProjs.map((_, i) => itemHeights[p1Projs.length + i]).reduce((a, b) => a + b, 0);
            p2RemainingBudget = Math.max(0, p2RemainingBudget - (usedP2 + sectionGap));
          }
        }
      }
    } else if (key === 'education' && safeData.education && safeData.education.length) {
      const eduHeights = safeData.education.map(e => estimateEduItemHeight(e, activeSpacing, isSingleLayout));
      if (fitsEntirelyOnPage1) {
        partitions.education.p1 = [...safeData.education];
        partitions.education.hasP1 = true;
        partitions.education.p1Offset = 0;
        remainingBudget = Math.max(0, remainingBudget - (36 + eduHeights.reduce((a, b) => a + b, 0) + sectionGap));
      } else if (onPage2) {
        partitions.education.p2 = [...safeData.education];
        partitions.education.hasP2 = true;
        partitions.education.p2Offset = 0;
        partitions.education.isP2Continuation = false;
        const usedP2 = 36 + eduHeights.reduce((a, b) => a + b, 0);
        p2RemainingBudget = Math.max(0, p2RemainingBudget - (usedP2 + sectionGap));
      } else {
        if (36 + eduHeights[0] > remainingBudget && remainingBudget < page1Budget) {
          onPage2 = true;
          partitions.education.p2 = [...safeData.education];
          partitions.education.hasP2 = true;
          partitions.education.p2Offset = 0;
          partitions.education.isP2Continuation = false;
          const usedP2 = 36 + eduHeights.reduce((a, b) => a + b, 0);
          p2RemainingBudget = Math.max(0, p2RemainingBudget - (usedP2 + sectionGap));
        } else {
          const p1Edu = [];
          let usedHeight = 36;
          for (let i = 0; i < safeData.education.length; i++) {
            if (p1Edu.length === 0 || usedHeight + eduHeights[i] <= remainingBudget) {
              p1Edu.push(safeData.education[i]);
              usedHeight += eduHeights[i];
            } else {
              break;
            }
          }
          partitions.education.p1 = p1Edu;
          partitions.education.hasP1 = p1Edu.length > 0;
          partitions.education.p1Offset = 0;
          remainingBudget = Math.max(0, remainingBudget - (usedHeight + sectionGap));

          if (p1Edu.length < safeData.education.length) {
            onPage2 = true;
            const remainingEdu = safeData.education.slice(p1Edu.length);
            partitions.education.p2 = remainingEdu;
            partitions.education.hasP2 = true;
            partitions.education.p2Offset = p1Edu.length;
            partitions.education.isP2Continuation = true;
            const usedP2 = 36 + remainingEdu.map((_, i) => eduHeights[p1Edu.length + i]).reduce((a, b) => a + b, 0);
            p2RemainingBudget = Math.max(0, p2RemainingBudget - (usedP2 + sectionGap));
          }
        }
      }
    } else if (key === 'skills' && safeData.skills && safeData.skills.length) {
      const sH = estimateSkillsHeight(safeData.skills, activeSpacing, isSingleLayout);
      if (fitsEntirelyOnPage1) {
        partitions.skills.p1 = [...safeData.skills];
        partitions.skills.hasP1 = true;
        remainingBudget = Math.max(0, remainingBudget - (sH + sectionGap));
      } else if (onPage2) {
        partitions.skills.p2 = [...safeData.skills];
        partitions.skills.hasP2 = true;
        p2RemainingBudget = Math.max(0, p2RemainingBudget - (sH + sectionGap));
      } else {
        if (sH <= remainingBudget) {
          partitions.skills.p1 = [...safeData.skills];
          partitions.skills.hasP1 = true;
          remainingBudget = Math.max(0, remainingBudget - (sH + sectionGap));
        } else {
          onPage2 = true;
          partitions.skills.p2 = [...safeData.skills];
          partitions.skills.hasP2 = true;
          p2RemainingBudget = Math.max(0, p2RemainingBudget - (sH + sectionGap));
        }
      }
    } else if (key === 'certifications' && safeData.certifications && safeData.certifications.length) {
      const certH = estimateCertHeight(safeData.certifications, activeSpacing);
      if (fitsEntirelyOnPage1) {
        partitions.certifications.p1 = [...safeData.certifications];
        partitions.certifications.hasP1 = true;
        remainingBudget = Math.max(0, remainingBudget - (certH + sectionGap));
      } else if (onPage2) {
        partitions.certifications.p2 = [...safeData.certifications];
        partitions.certifications.hasP2 = true;
        p2RemainingBudget = Math.max(0, p2RemainingBudget - (certH + sectionGap));
      } else {
        if (certH <= remainingBudget) {
          partitions.certifications.p1 = [...safeData.certifications];
          partitions.certifications.hasP1 = true;
          remainingBudget = Math.max(0, remainingBudget - (certH + sectionGap));
        } else {
          onPage2 = true;
          partitions.certifications.p2 = [...safeData.certifications];
          partitions.certifications.hasP2 = true;
          p2RemainingBudget = Math.max(0, p2RemainingBudget - (certH + sectionGap));
        }
      }
    } else if (key === 'references' && safeData.references && safeData.references.length) {
      const refH = estimateRefHeight(safeData.references, activeSpacing, isSingleLayout);
      if (fitsEntirelyOnPage1) {
        partitions.references.p1 = [...safeData.references];
        partitions.references.hasP1 = true;
        remainingBudget = Math.max(0, remainingBudget - (refH + sectionGap));
      } else if (onPage2) {
        partitions.references.p2 = [...safeData.references];
        partitions.references.hasP2 = true;
        p2RemainingBudget = Math.max(0, p2RemainingBudget - (refH + sectionGap));
      } else {
        if (refH <= remainingBudget) {
          partitions.references.p1 = [...safeData.references];
          partitions.references.hasP1 = true;
          remainingBudget = Math.max(0, remainingBudget - (refH + sectionGap));
        } else {
          onPage2 = true;
          partitions.references.p2 = [...safeData.references];
          partitions.references.hasP2 = true;
          p2RemainingBudget = Math.max(0, p2RemainingBudget - (refH + sectionGap));
        }
      }
    } else {
      // Custom Section partitioning
      const cs = (safeData.customSections || []).find(c => c.id === key);
      if (cs) {
        const items = Array.isArray(cs.items) && cs.items.length ? cs.items : [{ title: `${cs.title || 'Item'} Details`, value: '' }];
        partitions.customSections[cs.id] = { cs: { ...cs, items }, p1Items: [], p2Items: [], hasP1: false, hasP2: false };
        const csH = estimateCustomSectionHeight(items, activeSpacing, isSingleLayout);
        if (fitsEntirelyOnPage1) {
          partitions.customSections[cs.id].p1Items = [...items];
          partitions.customSections[cs.id].hasP1 = true;
          remainingBudget = Math.max(0, remainingBudget - (csH + sectionGap));
        } else if (onPage2) {
          partitions.customSections[cs.id].p2Items = [...items];
          partitions.customSections[cs.id].hasP2 = true;
          p2RemainingBudget = Math.max(0, p2RemainingBudget - (csH + sectionGap));
        } else {
          if (csH <= remainingBudget) {
            partitions.customSections[cs.id].p1Items = [...items];
            partitions.customSections[cs.id].hasP1 = true;
            remainingBudget = Math.max(0, remainingBudget - (csH + sectionGap));
          } else {
            onPage2 = true;
            partitions.customSections[cs.id].p2Items = [...items];
            partitions.customSections[cs.id].hasP2 = true;
            p2RemainingBudget = Math.max(0, p2RemainingBudget - (csH + sectionGap));
          }
        }
      }
    }
  }

  const hasPage2 = onPage2 ||
    partitions.experience.hasP2 ||
    partitions.education.hasP2 ||
    partitions.skills.hasP2 ||
    partitions.projects.hasP2 ||
    partitions.certifications.hasP2 ||
    partitions.references.hasP2 ||
    Object.values(partitions.customSections).some(c => c.hasP2);

  return {
    headerHeight,
    page1Budget,
    remainingBudget,
    page2Budget,
    p2RemainingBudget,
    partitions,
    hasPage2,
    autoTuned,
    lineSpacing: activeSpacing,
    pageMargin: activeMargin
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// A4 Page Budget Constants & Real-Time Headroom Calculation Metrics
// ═══════════════════════════════════════════════════════════════════════════════

export const A4_HEIGHT = 1123;
export const A4_PAGE_HEIGHT = 1123;
export const A4_PAGE_WIDTH = 794;

/**
 * Computes live page budget metrics against A4 1123px boundary.
 * Calculates headroom, fill percentage, overflow status, and gauge labels.
 */
export const computePageBudgetMetrics = (contentHeight, a4Height = A4_HEIGHT) => {
  const num = Number(contentHeight);
  const safeHeight = isNaN(num) ? 0 : Math.max(0, num);
  const page1FillPct = Math.round((safeHeight / a4Height) * 100);
  const headroomPx = a4Height - safeHeight;
  const isOverflowing = safeHeight > a4Height;
  const overflowPx = Math.max(0, safeHeight - a4Height);

  let status = 'safe';
  if (isOverflowing) {
    status = 'overflow';
  } else if (page1FillPct >= 85) {
    status = 'warning';
  }

  const badgeText = isOverflowing
    ? `⚠️ Page 1 Overflow (+${Math.abs(headroomPx)}px)`
    : `📄 Page 1: ${page1FillPct}% · ${headroomPx}px headroom`;

  return {
    a4Height,
    contentHeight: safeHeight,
    page1FillPct,
    headroomPx,
    isOverflowing,
    overflowPx,
    status,
    badgeText
  };
};

/**
 * Algorithmic Page-Fit Optimizer
 * Iterates through safe compact configurations (spacing: 1.35 -> 1.20, margin: 0 -> 20px)
 * to automatically adapt overflowing content into a pristine single page document.
 */
export const autoTunePageFit = (data, currentLineSpacing = 1.45, currentPageMargin = 0, targetPageHeight = A4_HEIGHT) => {
  if (!data || typeof data !== 'object') {
    return { lineSpacing: 1.28, pageMargin: 16, fitsOnePage: true, appliedTuning: true };
  }

  // 1. Test current layout
  const currentTest = computeTwoPagePartition({
    data,
    lineSpacing: currentLineSpacing,
    pageMargin: currentPageMargin,
    totalPageHeight: targetPageHeight
  });

  if (!currentTest.hasPage2) {
    return {
      lineSpacing: currentLineSpacing,
      pageMargin: currentPageMargin,
      fitsOnePage: true,
      appliedTuning: false,
      message: 'Content already fits cleanly onto 1 page.'
    };
  }

  // 2. Iterate through safe compact configurations ladder
  const candidateConfigs = [
    { lineSpacing: 1.35, pageMargin: 0 },
    { lineSpacing: 1.30, pageMargin: 4 },
    { lineSpacing: 1.28, pageMargin: 8 },
    { lineSpacing: 1.28, pageMargin: 16 },
    { lineSpacing: 1.25, pageMargin: 16 },
    { lineSpacing: 1.22, pageMargin: 18 },
    { lineSpacing: 1.20, pageMargin: 20 }
  ];

  for (const config of candidateConfigs) {
    const test = computeTwoPagePartition({
      data,
      lineSpacing: config.lineSpacing,
      pageMargin: config.pageMargin,
      totalPageHeight: targetPageHeight
    });
    if (!test.hasPage2) {
      return {
        lineSpacing: config.lineSpacing,
        pageMargin: config.pageMargin,
        fitsOnePage: true,
        appliedTuning: true,
        message: `Optimized line spacing to ${config.lineSpacing} and margins to ${config.pageMargin}px to fit on 1 page.`
      };
    }
  }

  // Fallback target fit for high-density 1-page fit
  return {
    lineSpacing: 1.28,
    pageMargin: 16,
    fitsOnePage: false,
    appliedTuning: true,
    message: 'Content tuned to high-density single page configuration.'
  };
};


