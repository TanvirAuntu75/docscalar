// ═══════════════════════════════════════════════════════════════════════════════
// DIAGONAL WEDGE — Geometric Polygon Header & 5-Dot Skill Meters (Paginated)
// Discrete A4 Sheets with Intelligent Universal Pagination Engine
// ═══════════════════════════════════════════════════════════════════════════════

import { computeTwoPagePartition } from '../paginationEngine.js';
import { renderUniversalOrderedSections } from '../universalTemplateRuntime.js';
import { getFontFamilyCss, getGoogleFontsLinkTags, computeFontAdjustedLineSpacing } from '../fontRegistry.js';

export function generateDiagonalWedgeHtml(
  data = {},
  themeColor = '#1e40af',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const isObject = typeof themeColor === 'object' && themeColor !== null && !Array.isArray(themeColor);
  const accent = isObject ? (themeColor.primaryColor || themeColor.themeColor || '#1e40af') : (themeColor === 'default' || !themeColor ? '#1e40af' : themeColor);
  const activeFont = isObject ? (themeColor.font || themeColor.themeFont || 'Inter') : (themeFont || 'Inter');
  const rawOrder = isObject ? (themeColor.sectionOrder || sectionOrder) : sectionOrder;
  const activeLayout = isObject ? (themeColor.themeLayout || themeLayout || 'auto') : (themeLayout || 'auto');
  const activeMargin = isObject ? (themeColor.pageMargin !== undefined ? themeColor.pageMargin : 0) : (pageMargin !== undefined ? pageMargin : 0);
  const activeSpacing = isObject ? (themeColor.lineSpacing !== undefined ? themeColor.lineSpacing : 1.45) : (lineSpacing !== undefined ? lineSpacing : 1.45);

  const safeData = data && typeof data === 'object' ? data : {};
  const name = safeData.name !== undefined && safeData.name !== null ? String(safeData.name).trim() : '';
  const title = safeData.title !== undefined && safeData.title !== null ? String(safeData.title).trim() : '';
  const photoSrc = (safeData.photoUrl || '').trim();
  const locationText = (safeData.location || safeData.address || '').trim();

  // Helper for 5-dot rating
  const renderDots = (levelStr) => {
    let score = 4;
    if (levelStr) {
      const lower = String(levelStr).toLowerCase();
      if (lower.includes('expert') || lower.includes('native') || lower.includes('fluent') || lower.includes('5')) score = 5;
      else if (lower.includes('adv') || lower.includes('senior') || lower.includes('4')) score = 4;
      else if (lower.includes('inter') || lower.includes('med') || lower.includes('3')) score = 3;
      else if (lower.includes('beg') || lower.includes('basic') || lower.includes('2') || lower.includes('1')) score = 2;
    }
    let dotsHtml = '<div class="rating-dots">';
    for (let i = 1; i <= 5; i++) {
      dotsHtml += `<span class="dot ${i <= score ? 'filled' : 'empty'}"></span>`;
    }
    dotsHtml += '</div>';
    return dotsHtml;
  };

  // Compute 2-Page Partition using Universal Pagination Engine
  const { partitions } = computeTwoPagePartition({
    data: safeData,
    sectionOrder: rawOrder,
    pageMargin: activeMargin,
    lineSpacing: activeSpacing,
    baseHeaderHeight: 180,
    totalPageHeight: 1043
  });

  // Render Experience Items with continuous offset indexing
  const renderExperienceItems = (items, isContinuation = false, offset = 0) => {
    if (!items || !items.length) return '';
    return `
      <section class="main-section">
        <div class="section-title-wrap">
          <h3 class="section-title section-heading" data-df-field="heading:experience">${isContinuation ? (safeData.sectionTitles?.experience ? `${safeData.sectionTitles.experience} (Continued)` : 'Work Experience (Continued)') : (safeData.sectionTitles?.experience || 'Work Experience')}</h3>
          <div class="title-line"></div>
        </div>
        <div class="timeline-wrap">
          ${items.map((e, idx) => {
            const actualIdx = offset + idx;
            const dateStr = `${e.dates || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}`;
            return `
              <div class="timeline-item">
                <div class="wedge-dot"></div>
                <div class="entry-header">
                  <span class="entry-role" data-df-field="exp:${actualIdx}:role">${e.role || ''}</span>
                  ${dateStr ? `<span class="entry-date" data-df-field="exp:${actualIdx}:date">${dateStr}</span>` : ''}
                </div>
                <div class="entry-company"><span data-df-field="exp:${actualIdx}:company">${e.company || ''}</span>${locationText ? `<span class="timeline-loc"> · ${locationText}</span>` : ''}</div>
                ${e.highlights && e.highlights.filter(Boolean).length ? `
                  <ul class="entry-desc">
                    ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${actualIdx}:highlight:${hIdx}">${h.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
                  </ul>
                ` : (e.description ? `
                  <div class="entry-desc" data-df-field="exp:${actualIdx}:highlight:0" style="font-size: 8.8pt; color: #475569; margin-top: 2px;">${e.description}</div>
                ` : '')}
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  // Render Projects Items with continuous offset indexing
  const renderProjectsItems = (items, isContinuation = false, offset = 0) => {
    if (!items || !items.length) return '';
    return `
      <section class="main-section">
        <div class="section-title-wrap">
          <h3 class="section-title section-heading" data-df-field="heading:projects">${isContinuation ? (safeData.sectionTitles?.projects ? `${safeData.sectionTitles.projects} (Continued)` : 'Key Projects (Continued)') : (safeData.sectionTitles?.projects || 'Key Projects')}</h3>
          <div class="title-line"></div>
        </div>
        <div class="timeline-wrap">
          ${items.map((p, idx) => {
            const actualIdx = offset + idx;
            return `
              <div class="timeline-item">
                <div class="wedge-dot"></div>
                <div class="entry-header">
                  <span class="entry-role" data-df-field="proj:${actualIdx}:name">${p.name || ''}</span>
                  ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${actualIdx}:url" style="color: ${accent}; text-decoration: none;">${p.url.replace(/^https?:\/\//, '')}</a></span>` : ''}
                </div>
                ${p.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;" data-df-field="proj:${actualIdx}:description">${p.description}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderSummaryMain = () => {
    const summaryText = (safeData.summary || safeData.profile || safeData.about || '').trim();
    if (!summaryText) return '';
    return `
      <section class="main-section">
        <div class="section-title-wrap">
          <h3 class="section-title section-heading" data-df-field="heading:summary">${safeData.sectionTitles?.summary || 'Professional Summary'}</h3>
          <div class="title-line"></div>
        </div>
        <div class="summary-text" data-df-field="summary">${summaryText}</div>
      </section>
    `;
  };

  const renderEducationSidebar = () => {
    const educationList = Array.isArray(safeData.education) ? safeData.education : [];
    if (!educationList.length) return '';
    return `
      <div class="sidebar-block">
        <div class="sidebar-title-wrap">
          <h3 class="sidebar-title section-heading" data-df-field="heading:education">${safeData.sectionTitles?.education || 'Education'}</h3>
          <div class="sidebar-line"></div>
        </div>
        <div class="edu-list">
          ${educationList.map((e, eIdx) => {
            const dateStr = `${e.dates || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}`;
            return `
              <div class="edu-item">
                <div class="edu-degree" data-df-field="edu:${eIdx}:degree">${e.degree || ''}</div>
                <div class="edu-school" data-df-field="edu:${eIdx}:school">${e.school || ''}</div>
                ${dateStr ? `<div class="edu-date" data-df-field="edu:${eIdx}:date">${dateStr}</div>` : ''}
                ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const renderEducationMain = () => {
    const educationList = Array.isArray(safeData.education) ? safeData.education : [];
    if (!educationList.length) return '';
    return `
      <section class="main-section">
        <div class="section-title-wrap">
          <h3 class="section-title section-heading" data-df-field="heading:education">${safeData.sectionTitles?.education || 'Education'}</h3>
          <div class="title-line"></div>
        </div>
        <div class="timeline-wrap">
          ${educationList.map((e, eIdx) => {
            const dateStr = `${e.dates || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}`;
            return `
              <div class="timeline-item">
                <div class="wedge-dot"></div>
                <div class="entry-header">
                  <span class="entry-role" data-df-field="edu:${eIdx}:degree">${e.degree || ''}</span>
                  ${dateStr ? `<span class="entry-date" data-df-field="edu:${eIdx}:date">${dateStr}</span>` : ''}
                </div>
                <div class="entry-company"><span data-df-field="edu:${eIdx}:school">${e.school || ''}</span>${e.note ? `<span class="timeline-loc"> · ${e.note}</span>` : ''}</div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderSkillsSidebar = () => {
    const skillsList = Array.isArray(safeData.skills) ? safeData.skills : [];
    if (!skillsList.length) return '';
    return `
      <div class="sidebar-block">
        <div class="sidebar-title-wrap">
          <h3 class="sidebar-title section-heading" data-df-field="heading:skills">${safeData.sectionTitles?.skills || 'Skills & Expertise'}</h3>
          <div class="sidebar-line"></div>
        </div>
        <div class="skills-grid">
          ${skillsList.map((s, sIdx) => {
            let sName = typeof s === 'string' ? s : s.name || '';
            let levelText = '';
            if (typeof s === 'string' && s.includes(' - ')) {
              const parts = s.split(' - ');
              sName = parts[0];
              levelText = parts[1];
            }
            return `
              <div class="skill-row">
                <span class="skill-name" data-df-field="skill:${sIdx}">${sName}</span>
                ${renderDots(levelText)}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const renderSkillsMain = () => {
    const skillsList = Array.isArray(safeData.skills) ? safeData.skills : [];
    if (!skillsList.length) return '';
    return `
      <section class="main-section">
        <div class="section-title-wrap">
          <h3 class="section-title section-heading" data-df-field="heading:skills">${safeData.sectionTitles?.skills || 'Skills & Expertise'}</h3>
          <div class="title-line"></div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;">
          ${skillsList.map((s, sIdx) => {
            let sName = typeof s === 'string' ? s : s.name || '';
            let levelText = '';
            if (typeof s === 'string' && s.includes(' - ')) {
              const parts = s.split(' - ');
              sName = parts[0];
              levelText = parts[1];
            }
            return `
              <div class="skill-row" style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt;">
                <span class="skill-name" data-df-field="skill:${sIdx}" style="font-weight: 600;">${sName}</span>
                ${renderDots(levelText)}
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderReferences = (items) => {
    const refs = Array.isArray(items) && items.length ? items : safeData.references || [];
    if (!refs || !refs.length) return '';
    return `
      <section class="main-section">
        <div class="section-title-wrap">
          <h3 class="section-title section-heading" data-df-field="heading:references">${safeData.sectionTitles?.references || 'References'}</h3>
          <div class="title-line"></div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
          ${refs.map((r, idx) => `
            <div style="font-size: 8.5pt; color: #475569;">
              <div data-df-field="ref:${idx}:name" style="font-weight: 700; color: #0f172a;">${r.name || ''}</div>
              <div data-df-field="ref:${idx}:relation" style="font-style: italic;">${r.relation || ''}</div>
              <div data-df-field="ref:${idx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderCertSidebar = () => {
    const certList = Array.isArray(safeData.certifications) ? safeData.certifications : [];
    if (!certList.length) return '';
    return `
      <div class="sidebar-block">
        <div class="sidebar-title-wrap">
          <h3 class="sidebar-title section-heading" data-df-field="heading:certifications">${safeData.sectionTitles?.certifications || 'Certifications'}</h3>
          <div class="sidebar-line"></div>
        </div>
        <ul class="cert-list">
          ${certList.map((c, cIdx) => `<li data-df-field="cert:${cIdx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
        </ul>
      </div>
    `;
  };

  const renderCertMain = (items) => {
    const certList = Array.isArray(items) && items.length ? items : safeData.certifications || [];
    if (!certList.length) return '';
    return `
      <section class="main-section">
        <div class="section-title-wrap">
          <h3 class="section-title section-heading" data-df-field="heading:certifications">${safeData.sectionTitles?.certifications || 'Certifications'}</h3>
          <div class="title-line"></div>
        </div>
        <ul class="cert-list">
          ${certList.map((c, cIdx) => `<li data-df-field="cert:${cIdx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
        </ul>
      </section>
    `;
  };

  const renderCustom = (cs) => {
    if (!cs || !cs.items || !cs.items.length) return '';
    return `
      <section class="main-section">
        <div class="section-title-wrap">
          <h3 class="section-title" data-df-field="custom:${cs.id}:title">${cs.title || 'Additional Information'}</h3>
          <div class="title-line"></div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${cs.items.map((i, idx) => `
            <div style="font-size: 8.5pt;">
              <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderContactSidebar = () => {
    const phoneText = (safeData.phone || '').trim();
    const emailText = (safeData.email || '').trim();
    const linkedinText = (safeData.linkedin || '').trim();
    const websiteText = (safeData.website || '').trim();
    const hasContact = Boolean(phoneText || emailText || locationText || linkedinText || websiteText);
    if (!hasContact) return '';
    return `
      <div class="sidebar-block">
        <div class="sidebar-title-wrap">
          <h3 class="sidebar-title section-heading" data-df-field="heading:contact">${safeData.sectionTitles?.contact || 'Contact'}</h3>
          <div class="sidebar-line"></div>
        </div>
        <div class="contact-list">
          ${phoneText ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span data-df-field="phone">${phoneText}</span></div>` : ''}
          ${emailText ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none; word-break: break-all;">${emailText}</a></div>` : ''}
          ${locationText ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span data-df-field="location">${locationText}</span></div>` : ''}
          ${linkedinText ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg><a data-df-field="linkedin" href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a></div>` : ''}
          ${websiteText ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><a data-df-field="website" href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a></div>` : ''}
        </div>
      </div>
    `;
  };

  const renderLangSidebar = () => {
    const langSection = (safeData.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
    const langList = langSection?.items || (Array.isArray(safeData.custom_languages) ? safeData.custom_languages.map(l => ({ title: typeof l === 'string' ? l : l.name || '', value: '' })) : []);
    if (!langList.length) return '';
    return `
      <div class="sidebar-block">
        <div class="sidebar-title-wrap">
          <h3 class="sidebar-title" data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:title">${langSection?.title || 'Languages'}</h3>
          <div class="sidebar-line"></div>
        </div>
        <div class="skills-grid">
          ${langList.map((l, lIdx) => `
            <div class="skill-row">
              <span class="skill-name" data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${lIdx}:title">${typeof l === 'string' ? l : (l.title || l.name || '')}</span>
              ${l.value ? `<span data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${lIdx}:value" style="font-size: 7.8pt; color: #64748b;">${l.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const renderContactBar = () => {
    const phoneText = (safeData.phone || '').trim();
    const emailText = (safeData.email || '').trim();
    const linkedinText = (safeData.linkedin || '').trim();
    const websiteText = (safeData.website || '').trim();
    const contactParts = [];
    if (phoneText) contactParts.push(`<span data-df-field="phone">${phoneText}</span>`);
    if (emailText) contactParts.push(`<a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none;">${emailText}</a>`);
    if (locationText) contactParts.push(`<span data-df-field="location">${locationText}</span>`);
    if (websiteText) contactParts.push(`<a data-df-field="website" href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a>`);
    if (linkedinText) contactParts.push(`<a data-df-field="linkedin" href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a>`);
    if (!contactParts.length) return '';
    return `<div class="main-contact-bar" style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 8.5pt; color: rgba(255,255,255,0.9); margin-top: 6px;">${contactParts.join(' · ')}</div>`;
  };

  // Renderers dictionary
  const renderers = {
    summary: () => renderSummaryMain(),
    experience: (items, isCont, offset) => renderExperienceItems(items || safeData.experience, isCont, offset),
    education: (items, { isMain }) => isMain ? renderEducationMain() : renderEducationSidebar(),
    skills: (items, { isMain }) => isMain ? renderSkillsMain() : renderSkillsSidebar(),
    projects: (items, isCont, offset) => renderProjectsItems(items || safeData.projects, isCont, offset),
    certifications: (items, { isMain }) => isMain ? renderCertMain(items) : renderCertSidebar(),
    references: (items) => renderReferences(items),
    custom: (cs) => renderCustom(cs),
    custom_languages: () => renderLangSidebar(),
    contact: () => renderContactSidebar()
  };

  const runtime = renderUniversalOrderedSections(safeData, {
    primaryColor: accent,
    font: activeFont,
    sectionOrder: rawOrder,
    themeLayout: activeLayout,
    pageMargin: activeMargin,
    lineSpacing: activeSpacing,
    partitions
  }, renderers, {
    sidebarKeys: ['contact', 'skills', 'education', 'certifications', 'custom_languages']
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${name ? `${name} - Resume` : 'Resume'}</title>
  ${runtime.googleFontsLink}
  <style>
    @page { margin: 0; size: A4 portrait; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${runtime.fontFamilyCss};
      background: #ffffff;
      margin: 0;
      padding: 0;
      color: #1e293b;
      line-height: ${runtime.adjustedLineSpacing};
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    .cv-page {
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
    }
    .cv-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .cv-page-white {
      background: #ffffff;
      padding-top: 36px;
    }
    
    /* Diagonal Geometric Polygon Header */
    .diagonal-header-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 180px;
      background: ${accent};
      clip-path: polygon(0 0, 100% 0, 100% 75%, 0 100%);
      z-index: 1;
    }
    .diagonal-header-accent {
      position: absolute;
      top: 0;
      right: 0;
      width: 48%;
      height: 180px;
      background: rgba(255, 255, 255, 0.12);
      clip-path: polygon(30% 0, 100% 0, 100% 88%, 0 100%);
      z-index: 2;
    }
    .header-content {
      position: relative;
      z-index: 5;
      padding: ${25 + activeMargin}px 40px 12px 40px;
      display: flex;
      align-items: center;
      gap: 25px;
      min-height: 145px;
    }
    .avatar-wrapper.avatar-mask {
      position: relative;
      flex-shrink: 0;
      width: 135px;
      height: 135px;
      border-radius: 50%;
      border: 4px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      overflow: hidden;
      background: #ffffff;
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
    .header-text {
      color: #ffffff;
      flex: 1;
    }
    .header-text h1 {
      font-size: 26pt;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
      text-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .header-text .title {
      font-size: 10.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.95);
      margin-top: 4px;
    }
    
    /* Content Columns */
    .content-columns {
      display: flex;
      padding: 16px 36px ${24 + activeMargin}px 36px;
      flex: 1;
      gap: 32px;
      position: relative;
      z-index: 4;
    }
    .main-col {
      width: 63%;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .main-col-full {
      width: 100% !important;
    }
    .sidebar-col {
      width: 37%;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .section-title-wrap, .sidebar-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .section-title, .sidebar-title {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      white-space: nowrap;
    }
    .title-line, .sidebar-line {
      flex: 1;
      height: 2px;
      background: #e2e8f0;
    }
    
    .summary-text {
      font-size: 9pt;
      color: #475569;
      line-height: ${runtime.adjustedLineSpacing};
      text-align: justify;
    }
    
    .timeline-wrap {
      border-left: 2px solid #e2e8f0;
      margin-left: 6px;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .timeline-item {
      position: relative;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .wedge-dot {
      position: absolute;
      left: -21px;
      top: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ffffff;
      border: 2.5px solid ${accent};
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .entry-role {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.3pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-size: 8.8pt;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-desc {
      list-style-type: disc;
      padding-left: 16px;
      font-size: 8.3pt;
      color: #475569;
      line-height: ${runtime.adjustedLineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
    }
    
    /* Sidebar Details */
    .sidebar-block {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 8.3pt;
      color: #475569;
    }
    .c-icon {
      width: 14px;
      height: 14px;
      color: ${accent};
      flex-shrink: 0;
    }
    
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.3pt;
    }
    .skill-name {
      font-weight: 600;
      color: #334155;
    }
    .rating-dots {
      display: flex;
      gap: 3px;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #cbd5e1;
    }
    .dot.filled {
      background: ${accent};
    }
    
    .edu-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .edu-item {
      font-size: 8.3pt;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      color: #0f172a;
    }
    .edu-school {
      color: #475569;
      font-style: italic;
    }
    .edu-date {
      color: #64748b;
      font-size: 7.8pt;
    }
    .edu-note {
      color: #64748b;
      font-size: 7.8pt;
      margin-top: 1px;
    }
    .cert-list {
      padding-left: 16px;
      font-size: 8.3pt;
      color: #475569;
    }
    .cert-list li {
      margin-bottom: 3px;
    }

    @media print {
      body { background: transparent !important; }
      .cv-page {
        margin: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
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
  <!-- PAGE 1 -->
  <div class="cv-page" id="page-1">
    <div class="diagonal-header-bg"></div>
    <div class="diagonal-header-accent"></div>
    
    <div class="header-content">
      ${photoSrc ? `
        <div class="avatar-wrapper avatar-mask">
          <img class="avatar" src="${photoSrc}" alt="${name || 'Profile Photo'}" />
        </div>
      ` : ''}
      <div class="header-text">
        <h1 data-df-field="name">${name}</h1>
        <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
        ${!runtime.isSplit ? renderContactBar() : ''}
      </div>
    </div>
    
    <div class="content-columns">
      <div class="main-col ${!runtime.isSplit ? 'main-col-full' : ''}">
        ${runtime.p1MainHtml}
      </div>
      
      ${runtime.isSplit ? `
        <div class="sidebar-col">
          ${!runtime.sidebarKeys.includes('contact') ? renderContactSidebar() : ''}
          ${runtime.sidebarHtml}
        </div>
      ` : ''}
    </div>
  </div>

  <!-- PAGE 2 (Intelligently rendered only when content exceeds Page 1) -->
  ${runtime.hasPage2 ? `
    <div class="cv-page cv-page-white" id="page-2">
      <div class="content-columns">
        <div class="main-col main-col-full">
          ${runtime.p2MainHtml}
        </div>
      </div>
    </div>
  ` : ''}
</body>
</html>`;
}
