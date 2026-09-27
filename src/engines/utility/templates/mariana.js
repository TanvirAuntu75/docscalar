import { computeTwoPagePartition } from '../paginationEngine.js';
import { renderUniversalOrderedSections } from '../universalTemplateRuntime.js';
import { getFontFamilyCss, getGoogleFontsLinkTags, computeFontAdjustedLineSpacing } from '../fontRegistry.js';

export function generateMarianaHtml(
  data,
  themeOrColor = '#2c3549',
  themeFontArg = 'Inter',
  sectionOrderArg = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayoutArg = 'auto',
  pageMarginArg = 0,
  lineSpacingArg = 1.45
) {
  const isObject = typeof themeOrColor === 'object' && themeOrColor !== null && !Array.isArray(themeOrColor);
  const accent = isObject ? (themeOrColor.primaryColor || themeOrColor.themeColor || '#2c3549') : (themeOrColor === 'default' || !themeOrColor ? '#2c3549' : themeOrColor);
  const themeFont = isObject ? (themeOrColor.font || themeOrColor.themeFont || 'Inter') : (themeFontArg || 'Inter');
  const rawOrder = isObject ? (themeOrColor.sectionOrder || sectionOrderArg) : sectionOrderArg;
  const themeLayout = isObject ? (themeOrColor.themeLayout || 'auto') : (themeLayoutArg || 'auto');
  const pageMargin = isObject ? (themeOrColor.pageMargin !== undefined ? themeOrColor.pageMargin : 0) : (pageMarginArg !== undefined ? pageMarginArg : 0);
  const lineSpacing = isObject ? (themeOrColor.lineSpacing !== undefined ? themeOrColor.lineSpacing : 1.45) : (lineSpacingArg !== undefined ? lineSpacingArg : 1.45);

  const safeData = data && typeof data === 'object' ? data : {};

  // ── Universal Partitioning via Shared Pagination Engine ──
  const { partitions } = computeTwoPagePartition({
    data: safeData,
    sectionOrder: rawOrder,
    pageMargin,
    lineSpacing,
    baseHeaderHeight: 65,
    totalPageHeight: 1043
  });

  // ── Modular Renderers with Canonical Data Attributes ──
  const renderExperienceItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    const isCont = typeof isContinuation === 'object' && isContinuation !== null ? Boolean(isContinuation.isContinuation) : Boolean(isContinuation);
    return `
      <section class="main-section">
        <h2 class="section-heading" data-df-field="heading:experience">${isCont ? (safeData.sectionTitles?.experience ? `${safeData.sectionTitles.experience} (Continued)` : 'Experience (Continued)') : (safeData.sectionTitles?.experience || 'Experience')}</h2>
        <div class="main-line"></div>
        <div class="timeline-container">
          ${items.map((e, idx) => {
            const actualIdx = globalOffset + idx;
            const dateStr = (e.start && e.end && e.start !== e.end) ? `${e.start} – ${e.end}` : (e.end || e.start || '');
            return `
              <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-header">
                  <div class="timeline-role" data-df-field="exp:${actualIdx}:role">${e.role || ''}</div>
                  <div class="timeline-date" data-df-field="exp:${actualIdx}:date">${dateStr}</div>
                </div>
                <div class="timeline-company"><span data-df-field="exp:${actualIdx}:company">${e.company || ''}</span>${safeData.location ? `<span class="timeline-loc"> · ${safeData.location}</span>` : ''}</div>
                ${e.highlights && e.highlights.filter(Boolean).length ? `
                  <ul class="timeline-desc">
                    ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${actualIdx}:highlight:${hIdx}">${h}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderEducationMain = (items) => {
    if (!items || !items.length) return '';
    return `
      <section class="main-section">
        <h2 class="section-heading" data-df-field="heading:education">${safeData.sectionTitles?.education || 'Education'}</h2>
        <div class="main-line"></div>
        <div class="timeline-container">
          ${items.map((e, idx) => {
            const dateStr = (e.start && e.end && e.start !== e.end) ? `${e.start} – ${e.end}` : (e.end || e.start || '');
            return `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-header">
                <div class="timeline-role" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
                <div class="timeline-date" data-df-field="edu:${idx}:date">${dateStr}</div>
              </div>
              <div class="timeline-company"><span data-df-field="edu:${idx}:school">${e.school || ''}</span>${e.note ? `<span class="timeline-loc"> · ${e.note}</span>` : ''}</div>
            </div>
          `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderEducationSidebar = (items) => {
    if (!items || !items.length) return '';
    return `
      <div class="sidebar-section">
        <h3 class="section-heading" data-df-field="heading:education">${safeData.sectionTitles?.education || 'Education'}</h3>
        <div class="sidebar-line"></div>
        ${items.map((e, idx) => {
          const dateStr = (e.start && e.end && e.start !== e.end) ? `${e.start} – ${e.end}` : (e.end || e.start || '');
          return `
          <div class="edu-item">
            <div class="edu-date" data-df-field="edu:${idx}:date">${dateStr}</div>
            <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
            <div class="edu-school" data-df-field="edu:${idx}:school">${e.school || ''}</div>
            ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
          </div>
        `;
        }).join('')}
      </div>
    `;
  };

  const renderSkillsSidebar = (skills) => {
    if (!skills || !skills.length) return '';
    return `
      <div class="sidebar-section">
        <h3 class="section-heading" data-df-field="heading:skills">${safeData.sectionTitles?.skills || 'Expertise'}</h3>
        <div class="sidebar-line"></div>
        <div class="skills-grid">
          ${skills.map((s, idx) => {
            let name = s;
            let levelText = '';
            if (typeof s === 'string' && s.includes(' - ')) {
              const parts = s.split(' - ');
              name = parts[0];
              levelText = parts[1];
            }
            return `
              <div class="skill-row">
                <span class="skill-name" data-df-field="skill:${idx}">${name}</span>
                ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const renderSkillsMain = (skills) => {
    if (!skills || !skills.length) return '';
    return `
      <section class="main-section">
        <h2 class="section-heading" data-df-field="heading:skills">${safeData.sectionTitles?.skills || 'Expertise & Skills'}</h2>
        <div class="main-line"></div>
        <div class="skills-main-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;">
          ${skills.map((s, idx) => {
            let name = s;
            let levelText = '';
            if (typeof s === 'string' && s.includes(' - ')) {
              const parts = s.split(' - ');
              name = parts[0];
              levelText = parts[1];
            }
            return `
              <div class="skill-item-main" style="display: flex; justify-content: space-between; font-size: 8.8pt;">
                <span class="skill-name" data-df-field="skill:${idx}" style="font-weight: 600; color: #1e293b;">${name}</span>
                ${levelText ? `<span class="skill-level" style="color: #64748b; font-size: 8pt;">${levelText}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderSummaryMain = (summary) => {
    if (!summary || !String(summary).trim()) return '';
    return `
      <section class="main-section">
        <h2 class="section-heading" data-df-field="heading:summary">${safeData.sectionTitles?.summary || 'About Me'}</h2>
        <div class="main-line"></div>
        <p class="summary-text" data-df-field="summary">${summary}</p>
      </section>
    `;
  };

  const renderProjectItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    const isCont = typeof isContinuation === 'object' && isContinuation !== null ? Boolean(isContinuation.isContinuation) : Boolean(isContinuation);
    return `
      <section class="main-section">
        <h2 class="section-heading" data-df-field="heading:projects">${isCont ? (safeData.sectionTitles?.projects ? `${safeData.sectionTitles.projects} (Continued)` : 'Projects (Continued)') : (safeData.sectionTitles?.projects || 'Projects')}</h2>
        <div class="main-line"></div>
        ${items.map((p, idx) => {
          const actualIdx = globalOffset + idx;
          return `
            <div class="entry-item">
              <div class="entry-header">
                <span class="entry-title" data-df-field="proj:${actualIdx}:name">${p.name || ''}</span>
                ${p.url ? `<span class="entry-url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${actualIdx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
              </div>
              ${p.description ? `<div class="entry-desc" data-df-field="proj:${actualIdx}:description">${p.description}</div>` : ''}
            </div>
          `;
        }).join('')}
      </section>
    `;
  };

  const renderCertItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    const isCont = typeof isContinuation === 'object' && isContinuation !== null ? Boolean(isContinuation.isContinuation) : Boolean(isContinuation);
    return `
      <section class="main-section">
        <h2 class="section-heading" data-df-field="heading:certifications">${isCont ? (safeData.sectionTitles?.certifications ? `${safeData.sectionTitles.certifications} (Continued)` : 'Certifications (Continued)') : (safeData.sectionTitles?.certifications || 'Certifications')}</h2>
        <div class="main-line"></div>
        <ul class="cert-list">
          ${items.map((c, idx) => {
            const actualIdx = globalOffset + idx;
            const text = typeof c === 'object' ? c.name || '' : c;
            const urlMatch = typeof text === 'string' ? text.match(/(https?:\/\/[^\s]+)/) : null;
            let contentHtml = text;
            if (urlMatch) {
              const url = urlMatch[1];
              contentHtml = text.replace(url, `<a href="${url}" target="_blank" style="color: ${accent}; text-decoration: none; word-break: break-all;">${url}</a>`);
            }
            return `<li data-df-field="cert:${actualIdx}">${contentHtml}</li>`;
          }).join('')}
        </ul>
      </section>
    `;
  };

  const renderReferenceItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    const isCont = typeof isContinuation === 'object' && isContinuation !== null ? Boolean(isContinuation.isContinuation) : Boolean(isContinuation);
    return `
      <section class="main-section">
        <h2 class="section-heading" data-df-field="heading:references">${isCont ? (safeData.sectionTitles?.references ? `${safeData.sectionTitles.references} (Continued)` : 'References (Continued)') : (safeData.sectionTitles?.references || 'References')}</h2>
        <div class="main-line"></div>
        <div class="reference-grid">
          ${items.map((r, idx) => {
            const actualIdx = globalOffset + idx;
            return `
              <div class="ref-item">
                <div class="ref-name" data-df-field="ref:${actualIdx}:name">${r.name || ''}</div>
                <div class="ref-relation" data-df-field="ref:${actualIdx}:relation">${r.relation || ''}</div>
                <div class="ref-contact" data-df-field="ref:${actualIdx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderCustomSection = (cs) => {
    if (!cs) return '';
    const rawItems = Array.isArray(cs.items) && cs.items.length > 0 ? cs.items : [];
    if (!rawItems.length) return '';
    return `
      <section class="main-section">
        <h2 class="section-heading" data-df-field="custom:${cs.id}:title">${cs.title || 'Additional Information'}</h2>
        <div class="main-line"></div>
        <div class="custom-grid">
          ${rawItems.map((i, idx) => {
            const titleText = typeof i === 'string' ? i : (i.title || i.name || '');
            const valText = typeof i === 'object' && i !== null ? (i.value || '') : '';
            return `
              <div class="custom-item">
                <span data-df-field="custom:${cs.id}:${idx}:title">${titleText}</span>${valText ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${valText}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderContactSidebar = () => {
    const hasContact = Boolean(safeData.phone || safeData.email || safeData.location || safeData.website || safeData.linkedin || safeData.github);
    if (!hasContact) return '';
    return `
      <div class="sidebar-section">
        <h3 class="section-heading" data-df-field="heading:contact">${safeData.sectionTitles?.contact || 'Contact'}</h3>
        <div class="sidebar-line"></div>
        <div class="sidebar-contact-list">
          ${safeData.phone ? `<div class="contact-item"><span class="label">Phone</span><span class="val" data-df-field="phone">${safeData.phone}</span></div>` : ''}
          ${safeData.email ? `<div class="contact-item"><span class="label">Email</span><a href="mailto:${safeData.email}" class="val" data-df-field="email" style="color: inherit; text-decoration: none;">${safeData.email}</a></div>` : ''}
          ${safeData.location ? `<div class="contact-item"><span class="label">Address</span><span class="val" data-df-field="location">${safeData.location}</span></div>` : ''}
          ${safeData.website ? `<div class="contact-item"><span class="label">Website</span><a data-df-field="website" href="https://${safeData.website.replace(/^https?:\/\//, '')}" target="_blank" class="val" style="color: inherit; text-decoration: none;">${safeData.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
          ${safeData.linkedin ? `<div class="contact-item"><span class="label">LinkedIn</span><a data-df-field="linkedin" href="https://${safeData.linkedin.replace(/^https?:\/\//, '')}" target="_blank" class="val" style="color: inherit; text-decoration: none;">${safeData.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
          ${safeData.github ? `<div class="contact-item"><span class="label">GitHub</span><a data-df-field="github" href="https://${safeData.github.replace(/^https?:\/\//, '')}" target="_blank" class="val" style="color: inherit; text-decoration: none;">${safeData.github.replace(/^https?:\/\//, '')}</a></div>` : ''}
        </div>
      </div>
    `;
  };

  const renderLanguagesSidebar = () => {
    const langSection = (safeData.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
    const items = langSection?.items || safeData.custom_languages || [];
    if (!items || !items.length) return '';
    const secId = langSection ? langSection.id : 'custom_languages';
    return `
      <div class="sidebar-section">
        <h3 class="section-heading" data-df-field="custom:${secId}:title">${langSection?.title || 'Languages'}</h3>
        <div class="sidebar-line"></div>
        <div class="lang-list">
          ${items.map((i, idx) => {
            let nameStr = typeof i === 'string' ? i : (i.title || i.name || '');
            let valStr = typeof i === 'object' && i !== null && i.value ? i.value : '';
            if (typeof i === 'string' && (i.includes(' — ') || i.includes(' - '))) {
              const delimiter = i.includes(' — ') ? ' — ' : ' - ';
              const parts = i.split(delimiter);
              nameStr = parts[0].trim();
              valStr = parts.slice(1).join(delimiter).trim();
            }
            return `
              <div class="lang-item-card">
                <div class="lang-header-row">
                  <span class="lang-name" data-df-field="custom:${secId}:${idx}:title">${nameStr}</span>
                  ${valStr ? `<span class="lang-badge" data-df-field="custom:${secId}:${idx}:value">${valStr}</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const renderContactBar = () => {
    const contactParts = [];
    if (safeData.phone) contactParts.push(`<span data-df-field="phone">${safeData.phone}</span>`);
    if (safeData.email) contactParts.push(`<a href="mailto:${safeData.email}" data-df-field="email" style="color: inherit; text-decoration: none;">${safeData.email}</a>`);
    if (safeData.location) contactParts.push(`<span data-df-field="location">${safeData.location}</span>`);
    if (safeData.website) contactParts.push(`<a data-df-field="website" href="https://${safeData.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.website.replace(/^https?:\/\//, '')}</a>`);
    if (safeData.linkedin) contactParts.push(`<a data-df-field="linkedin" href="https://${safeData.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.linkedin.replace(/^https?:\/\//, '')}</a>`);
    if (safeData.github) contactParts.push(`<a data-df-field="github" href="https://${safeData.github.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.github.replace(/^https?:\/\//, '')}</a>`);
    if (!contactParts.length) return '';
    return `<div class="main-contact-bar" style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 8.5pt; color: #475569; margin-top: 6px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">${contactParts.join(' · ')}</div>`;
  };

  // ── Renderers Dispatcher Dictionary ──
  const renderers = {
    summary: () => renderSummaryMain(safeData.summary),
    experience: (items, isCont, offset) => renderExperienceItems(items || safeData.experience, isCont, offset),
    education: (dataOrItems, { isMain }) => isMain ? renderEducationMain(safeData.education) : renderEducationSidebar(safeData.education),
    skills: (dataOrItems, { isMain }) => isMain ? renderSkillsMain(safeData.skills) : renderSkillsSidebar(safeData.skills),
    projects: (items, isCont, offset) => renderProjectItems(items || safeData.projects, isCont, offset),
    certifications: (items, isCont, offset) => renderCertItems(items || safeData.certifications, isCont, offset),
    references: (items, isCont, offset) => renderReferenceItems(items || safeData.references, isCont, offset),
    custom: (cs) => renderCustomSection(cs),
    custom_languages: () => renderLanguagesSidebar(),
    contact: () => renderContactSidebar()
  };

  // ── Execute Universal Template Runtime ──
  const runtime = renderUniversalOrderedSections(safeData, {
    primaryColor: accent,
    font: themeFont,
    sectionOrder: rawOrder,
    themeLayout,
    pageMargin,
    lineSpacing,
    partitions
  }, renderers, {
    sidebarKeys: ['contact', 'skills', 'custom_languages']
  });

  const fontFam = runtime.fontFamilyCss;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${safeData.name ? `${safeData.name} - Resume` : 'Resume'}</title>
  ${runtime.googleFontsLink}
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${fontFam};
      background: transparent;
      color: #1e293b;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      line-height: ${runtime.adjustedLineSpacing};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .cv-page {
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      background: #ffffff;
      display: flex;
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.06);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
      page-break-after: always;
      break-after: page;
    }
    
    /* Dynamic Layout Reflow for Single Column */
    body.layout-single .cv-page {
      display: block;
      padding: ${35 + pageMargin}px ${45 + pageMargin}px;
    }
    body.layout-single .main-content {
      width: 100%;
      padding: 0;
    }

    /* Sidebar (33%) */
    .sidebar {
      width: 33%;
      background: ${accent};
      color: #ffffff;
      padding: ${35 + pageMargin}px 24px;
      font-size: 8.5pt;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      height: 100%;
      min-height: 100%;
      box-sizing: border-box;
      gap: 22px;
    }
    .sidebar-content-flow {
      display: flex;
      flex-direction: column;
      gap: 22px;
      justify-content: flex-start;
    }
    .avatar-container {
      display: flex;
      justify-content: center;
      margin-bottom: 4px;
    }
    .avatar-mask {
      width: 135px;
      height: 135px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.45);
      overflow: hidden;
      position: relative;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-section h3 {
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid rgba(255, 255, 255, 0.25);
      margin-bottom: 12px;
    }
    .sidebar-contact-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .contact-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 5px;
      padding: 6px 10px;
      break-inside: avoid;
    }
    .contact-item .label {
      display: block;
      font-weight: 700;
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: rgba(255, 255, 255, 0.7);
    }
    .contact-item .val {
      display: block;
      color: #ffffff;
      margin-top: 1px;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-size: 8.3pt;
      font-weight: 500;
      line-height: 1.35;
    }
    .edu-item {
      margin-bottom: 10px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 5px;
      padding: 6px 10px;
      break-inside: avoid;
    }
    .edu-date {
      font-size: 7.8pt;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 600;
    }
    .edu-degree {
      font-size: 9pt;
      font-weight: 700;
      color: #ffffff;
      margin-top: 1px;
    }
    .edu-school {
      font-size: 8.2pt;
      color: rgba(255, 255, 255, 0.9);
      font-style: italic;
    }
    .edu-note {
      font-size: 7.8pt;
      color: rgba(255, 255, 255, 0.75);
      margin-top: 2px;
    }
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .skill-row {
      display: inline-flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 8pt;
      line-height: 1.3;
      break-inside: avoid;
      max-width: 100%;
      box-sizing: border-box;
    }
    .skill-name {
      font-weight: 600;
      color: #ffffff;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .skill-level {
      font-size: 7.2pt;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-left: 6px;
      flex-shrink: 0;
    }
    .lang-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .lang-item-card {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 5px;
      padding: 6px 10px;
      font-size: 8.2pt;
      line-height: 1.35;
      break-inside: avoid;
    }
    .lang-header-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .lang-name {
      font-weight: 700;
      color: #ffffff;
      font-size: 8.5pt;
    }
    .lang-badge {
      font-size: 7.6pt;
      color: rgba(255, 255, 255, 0.85);
      line-height: 1.3;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    
    /* Main Content (67%) */
    .main-content {
      width: 67%;
      padding: ${35 + pageMargin}px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-sizing: border-box;
    }
    .main-header h1 {
      font-size: 24pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
      line-height: 1.15;
      text-transform: uppercase;
    }
    .main-header .title {
      font-size: 10.5pt;
      font-weight: 600;
      color: ${accent};
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-top: 4px;
    }
    .main-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .main-section h2 {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #0f172a;
      margin-bottom: 5px;
    }
    .main-line {
      height: 2px;
      background: linear-gradient(to right, ${accent}, ${accent}40 60%, transparent);
      margin-bottom: 12px;
    }
    .summary-text {
      font-size: 8.8pt;
      color: #334155;
      line-height: ${runtime.adjustedLineSpacing};
      text-align: left;
    }
    .timeline-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .timeline-item {
      position: relative;
      padding-left: 16px;
      border-left: 2px solid #e2e8f0;
      break-inside: avoid;
    }
    .timeline-dot {
      position: absolute;
      left: -5px;
      top: 4px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${accent};
      box-shadow: 0 0 0 2px #ffffff;
    }
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .timeline-role {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .timeline-date {
      font-size: 8.5pt;
      color: ${accent};
      font-weight: 600;
    }
    .timeline-company {
      font-size: 8.8pt;
      color: #334155;
      font-weight: 500;
      margin-top: 2px;
    }
    .timeline-loc {
      font-weight: 600;
      color: #0f172a;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 1px 6px;
      margin-left: 4px;
      font-size: 8pt;
      display: inline-block;
    }
    .timeline-desc {
      list-style-type: disc;
      padding-left: 14px;
      font-size: 8.3pt;
      color: #475569;
      line-height: ${runtime.adjustedLineSpacing};
      margin-top: 4px;
    }
    .timeline-desc li {
      margin-bottom: 2px;
    }
    .entry-item {
      margin-bottom: 12px;
      position: relative;
      padding-left: 14px;
      border-left: 2.5px solid ${accent};
      break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .entry-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .entry-url {
      font-size: 8.3pt;
      color: ${accent};
      font-weight: 600;
    }
    .entry-desc {
      font-size: 8.5pt;
      color: #475569;
      margin-top: 3px;
      line-height: ${runtime.adjustedLineSpacing};
    }
    .cert-list {
      list-style-type: disc;
      padding-left: 18px;
      font-size: 8.5pt;
      color: #334155;
    }
    .cert-list li {
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .reference-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 16px;
      font-size: 8.5pt;
      color: #475569;
      break-inside: avoid;
    }
    .ref-name {
      font-size: 9.2pt;
      font-weight: 700;
      color: #0f172a;
    }
    .ref-relation {
      font-style: italic;
      color: #64748b;
      margin-bottom: 2px;
    }
    .custom-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 8.8pt;
    }
    .custom-item {
      display: inline-flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 8.3pt;
      font-weight: 500;
      color: #1e293b;
    }
    .cv-page-white {
      display: block !important;
      background: #ffffff !important;
      padding: ${44 + pageMargin}px 50px !important;
    }
    .page-2-body {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    @media print {
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body {
        gap: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .cv-page {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 auto !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .cv-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body class="${runtime.layoutClass}">
  <!-- Page 1 Sheet (Sidebar + Main Column or Single Column Stream) -->
  <div class="cv-page" id="page-1">
    ${runtime.isSplit ? `
      <div class="sidebar">
        ${safeData.photoUrl ? `
          <div class="avatar-container">
            <div class="avatar-mask">
              <img class="avatar" src="${safeData.photoUrl}" alt="Profile Photo" />
            </div>
          </div>
        ` : ''}
        <div class="sidebar-content-flow">
          ${!runtime.sidebarKeys.includes('contact') ? renderContactSidebar() : ''}
          ${runtime.sidebarHtml}
        </div>
      </div>
    ` : ''}
    
    <div class="main-content">
      <div class="main-header">
        ${!runtime.isSplit && safeData.photoUrl ? `
          <div class="avatar-container" style="justify-content: flex-start; margin-bottom: 12px;">
            <div class="avatar-mask" style="width: 100px; height: 100px; border-color: ${accent};">
              <img class="avatar" src="${safeData.photoUrl}" alt="Profile Photo" />
            </div>
          </div>
        ` : ''}
        <h1 data-df-field="name" data-placeholder="Full Name" style="min-height: 1.2em;">${safeData.name || ''}</h1>
        <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${safeData.title || ''}</div>
        ${!runtime.isSplit ? renderContactBar() : ''}
      </div>
      
      ${runtime.p1MainHtml}
    </div>
  </div>

  <!-- Page 2 Sheet (Clean Full-Width White Page, No Sidebar, No Redundant Headers) -->
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