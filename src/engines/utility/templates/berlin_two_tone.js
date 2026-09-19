// ═══════════════════════════════════════════════════════════════════════════════
// BERLIN TWO-TONE — Asymmetric Warm Tan / Beige Card Layout (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

import { renderUniversalOrderedSections } from '../universalTemplateRuntime.js';
import { getFontFamilyCss, getGoogleFontsLinkTags, computeFontAdjustedLineSpacing } from '../fontRegistry.js';

export function generateBerlinTwoToneHtml(
  data = {},
  themeColor = '#d4a373',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const isObject = typeof themeColor === 'object' && themeColor !== null && !Array.isArray(themeColor);
  const accent = isObject ? (themeColor.primaryColor || themeColor.themeColor || '#d4a373') : (themeColor === 'default' || !themeColor ? '#d4a373' : themeColor);
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
  const phoneText = (safeData.phone || '').trim();
  const emailText = (safeData.email || '').trim();
  const linkedinText = (safeData.linkedin || '').trim();
  const websiteText = (safeData.website || '').trim();
  const hasContact = Boolean(phoneText || emailText || locationText || linkedinText || websiteText);

  // Renderers dictionary
  const renderExperience = () => {
    const experienceList = Array.isArray(safeData.experience) ? safeData.experience : [];
    if (!experienceList.length) return '';
    return `
      <section class="cv-section">
        <h3 class="section-heading" data-df-field="heading:experience">${safeData.sectionTitles?.experience || 'Work Experience'}</h3>
        <div class="divider"></div>
        <div class="entries-list">
          ${experienceList.map((e, idx) => `
            <div class="entry-item">
              <div class="entry-header">
                <span class="entry-role" data-df-field="exp:${idx}:role">${e.role || ''}</span>
                <span class="entry-date"><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></span>${locationText ? ` · ${locationText}` : ''}</div>
              ${e.highlights && e.highlights.filter(Boolean).length ? `
                <ul class="entry-desc">
                  ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
                </ul>
              ` : (e.description ? `
                <div class="entry-desc" data-df-field="exp:${idx}:highlight:0" style="font-size: 8.8pt; color: #4a4a4a; margin-top: 4px;">${e.description}</div>
              ` : '')}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderEducationSidebar = () => {
    const educationList = Array.isArray(safeData.education) ? safeData.education : [];
    if (!educationList.length) return '';
    return `
      <div class="card-section">
        <h4 class="card-heading section-heading" data-df-field="heading:education">${safeData.sectionTitles?.education || 'Education'}</h4>
        <div class="card-divider"></div>
        <div class="edu-list">
          ${educationList.map((e, idx) => `
            <div class="edu-item">
              <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
              <div class="edu-school" data-df-field="edu:${idx}:school">${e.school || ''}</div>
              <div class="edu-date" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</div>
              ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const renderEducationMain = () => {
    const educationList = Array.isArray(safeData.education) ? safeData.education : [];
    if (!educationList.length) return '';
    return `
      <section class="cv-section">
        <h3 class="section-heading" data-df-field="heading:education">${safeData.sectionTitles?.education || 'Education'}</h3>
        <div class="divider"></div>
        <div class="entries-list">
          ${educationList.map((e, idx) => `
            <div class="entry-item">
              <div class="entry-header">
                <span class="entry-role" data-df-field="edu:${idx}:degree">${e.degree || ''}</span>
                <span class="entry-date"><span data-df-field="edu:${idx}:school">${e.school || ''}</span> · <span data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span></span>
              </div>
              ${e.note ? `<div class="entry-desc" data-df-field="edu:${idx}:note" style="font-size: 8.5pt; color: #64748b;">${e.note}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderSkills = () => {
    const skillsList = Array.isArray(safeData.skills) ? safeData.skills : [];
    if (!skillsList.length) return '';
    return `
      <section class="cv-section">
        <h3 class="section-heading" data-df-field="heading:skills">${safeData.sectionTitles?.skills || 'Skills & Competencies'}</h3>
        <div class="divider"></div>
        <div class="skills-grid">
          ${skillsList.map((s, idx) => {
            let sName = typeof s === 'string' ? s : s.name || '';
            let levelText = '';
            if (typeof s === 'string' && s.includes(' - ')) {
              const parts = s.split(' - ');
              sName = parts[0];
              levelText = parts[1];
            }
            return `
              <div class="skill-pill">
                <span data-df-field="skill:${idx}">${sName}</span>
                ${levelText ? `<span class="skill-lvl">· ${levelText}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderProjects = () => {
    const projectList = Array.isArray(safeData.projects) ? safeData.projects : [];
    if (!projectList.length) return '';
    return `
      <section class="cv-section">
        <h3 class="section-heading" data-df-field="heading:projects">${safeData.sectionTitles?.projects || 'Projects'}</h3>
        <div class="divider"></div>
        <div class="entries-list">
          ${projectList.map((p, idx) => `
            <div class="entry-item">
              <div class="entry-header">
                <span class="entry-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
                ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
              </div>
              ${p.description ? `<div style="font-size: 8.8pt; color: #4a4a4a; margin-top: 2px;" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderReferences = () => {
    const referenceList = Array.isArray(safeData.references) ? safeData.references : [];
    if (!referenceList.length) return '';
    return `
      <section class="cv-section">
        <h3 class="section-heading" data-df-field="heading:references">${safeData.sectionTitles?.references || 'References'}</h3>
        <div class="divider"></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
          ${referenceList.map((r, idx) => `
            <div style="font-size: 8.8pt; color: #4a4a4a;">
              <div data-df-field="ref:${idx}:name" style="font-weight: 700; color: #1e1e1e;">${r.name || ''}</div>
              <div data-df-field="ref:${idx}:relation" style="font-style: italic;">${r.relation || ''}</div>
              <div data-df-field="ref:${idx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderCertifications = () => {
    const certList = Array.isArray(safeData.certifications) ? safeData.certifications : [];
    if (!certList.length) return '';
    return `
      <section class="cv-section">
        <h3 class="section-heading" data-df-field="heading:certifications">${safeData.sectionTitles?.certifications || 'Certifications'}</h3>
        <div class="divider"></div>
        <ul class="cert-list">
          ${certList.map((c, idx) => `<li data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
        </ul>
      </section>
    `;
  };

  const renderLangSidebar = () => {
    const langSection = (safeData.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
    const langList = langSection?.items || (Array.isArray(safeData.custom_languages) ? safeData.custom_languages.map(l => ({ title: typeof l === 'string' ? l : l.name || '', value: '' })) : []);
    if (!langList.length) return '';
    return `
      <div class="card-section">
        <h4 class="card-heading" data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:title">${langSection?.title || 'Languages'}</h4>
        <div class="card-divider"></div>
        <div class="contact-list">
          ${langList.map((l, idx) => `
            <div class="contact-row">
              <span data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:title">${typeof l === 'string' ? l : (l.title || l.name || '')}</span>
              ${l.value ? `<span class="skill-lvl" data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:value"> · ${l.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const renderCustom = (cs) => {
    if (!cs || !cs.items || !cs.items.length) return '';
    return `
      <section class="cv-section">
        <h3 class="section-heading" data-df-field="custom:${cs.id}:title">${cs.title || 'Additional Information'}</h3>
        <div class="divider"></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${cs.items.map((i, idx) => `
            <div style="font-size: 8.8pt;">
              <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderContactCard = () => {
    if (!hasContact) return '';
    return `
      <div class="card-section">
        <h4 class="card-heading section-heading" data-df-field="heading:contact">${safeData.sectionTitles?.contact || 'Contact'}</h4>
        <div class="card-divider"></div>
        <div class="contact-list">
          ${phoneText ? `<div class="contact-row"><span data-df-field="phone">${phoneText}</span></div>` : ''}
          ${emailText ? `<div class="contact-row"><a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none; word-break: break-all;">${emailText}</a></div>` : ''}
          ${locationText ? `<div class="contact-row"><span data-df-field="location">${locationText}</span></div>` : ''}
          ${linkedinText ? `<div class="contact-row"><a data-df-field="linkedin" href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a></div>` : ''}
          ${websiteText ? `<div class="contact-row"><a data-df-field="website" href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a></div>` : ''}
        </div>
      </div>
    `;
  };

  const renderContactBar = () => {
    if (!hasContact) return '';
    const parts = [];
    if (phoneText) parts.push(`<span data-df-field="phone">${phoneText}</span>`);
    if (emailText) parts.push(`<a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none;">${emailText}</a>`);
    if (locationText) parts.push(`<span data-df-field="location">${locationText}</span>`);
    if (websiteText) parts.push(`<a data-df-field="website" href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a>`);
    if (linkedinText) parts.push(`<a data-df-field="linkedin" href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a>`);
    return `<div class="contact-bar-single" style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 8.5pt; color: #4a4a4a; margin-top: 6px; margin-bottom: 12px;">${parts.join(' · ')}</div>`;
  };

  const renderers = {
    summary: () => {
      const summaryText = (safeData.summary || safeData.profile || safeData.about || '').trim();
      if (!summaryText) return '';
      return `
        <section class="cv-section">
          <h3 class="section-heading" data-df-field="heading:summary">${safeData.sectionTitles?.summary || 'About Me'}</h3>
          <div class="divider"></div>
          <div class="summary-text" data-df-field="summary" style="font-size: 8.8pt; color: #4a4a4a; line-height: ${activeSpacing};">${summaryText}</div>
        </section>
      `;
    },
    experience: () => renderExperience(),
    education: (items, { isMain }) => isMain ? renderEducationMain() : renderEducationSidebar(),
    skills: () => renderSkills(),
    projects: () => renderProjects(),
    certifications: () => renderCertifications(),
    references: () => renderReferences(),
    custom: (cs) => renderCustom(cs),
    custom_languages: () => renderLangSidebar(),
    contact: () => renderContactCard()
  };

  const runtime = renderUniversalOrderedSections(safeData, {
    primaryColor: accent,
    font: activeFont,
    sectionOrder: rawOrder,
    themeLayout: activeLayout,
    pageMargin: activeMargin,
    lineSpacing: activeSpacing
  }, renderers, {
    sidebarKeys: ['education', 'custom_languages']
  });

  const summaryText = (safeData.summary || safeData.profile || safeData.about || '').trim();
  const isSplit = activeLayout !== 'single';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${name ? `${name} - Resume` : 'Resume'}</title>
  ${runtime.googleFontsLink}
  <style>
    @page { margin: 0; size: A4; }
    *, *:before, *:after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${runtime.fontFamilyCss};
      background: #fdfbf7;
      margin: 0;
      padding: 0;
      color: #1e1e1e;
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
      min-height: 1123px;
      height: 1123px;
      background: #ffffff;
      padding: ${40 + activeMargin}px ${45 + activeMargin}px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.06);
      border-radius: 4px;
      position: relative;
      page-break-after: always;
      break-after: page;
      box-sizing: border-box;
    }
    .cv-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    .top-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 24px;
      align-items: start;
    }
    body.layout-single .top-grid {
      display: block;
    }

    .header-info h1 {
      font-size: 26pt;
      font-weight: 800;
      color: #1e1e1e;
      line-height: 1.05;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    .header-info .title {
      font-size: 11pt;
      font-weight: 600;
      color: ${accent};
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 4px;
      margin-bottom: 12px;
    }
    .header-info .summary {
      font-size: 8.8pt;
      color: #4a4a4a;
      line-height: ${runtime.adjustedLineSpacing};
      text-align: justify;
    }

    .tan-card {
      background: #f7f3ec;
      border: 1px solid #e8e2d5;
      border-radius: 6px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .avatar-mask {
      width: 85px;
      height: 85px;
      border-radius: 50%;
      overflow: hidden;
      margin: 0 auto 4px auto;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
    }
    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .card-heading {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1e1e1e;
      margin-bottom: 4px;
    }
    .card-divider {
      height: 1.5px;
      background: ${accent};
      margin-bottom: 8px;
    }

    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-size: 8pt;
      color: #4a4a4a;
    }
    .contact-row {
      word-break: break-all;
    }

    .edu-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .edu-item {
      font-size: 8pt;
    }
    .edu-degree {
      font-weight: 700;
      color: #1e1e1e;
    }
    .edu-school {
      color: #64748b;
      font-style: italic;
    }
    .edu-date {
      color: #94a3b8;
      font-size: 7.5pt;
    }

    .cv-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
      break-inside: avoid;
    }
    .section-heading {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1e1e1e;
    }
    .divider {
      height: 1.5px;
      background: #e5e0d3;
      margin-bottom: 4px;
    }

    .entries-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .entry-item {
      break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 9pt;
    }
    .entry-role {
      font-weight: 700;
      color: #1e1e1e;
    }
    .entry-date {
      font-size: 8pt;
      color: #64748b;
    }
    .entry-desc {
      list-style-type: disc;
      padding-left: 16px;
      font-size: 8.3pt;
      color: #4a4a4a;
      margin-top: 3px;
      line-height: ${runtime.adjustedLineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
    }

    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .skill-pill {
      background: #f7f3ec;
      border: 1px solid #e8e2d5;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
      color: #2b2b2b;
    }
    .skill-lvl {
      font-size: 7.5pt;
      color: #78716c;
      font-weight: 400;
    }

    .cert-list {
      list-style-type: disc;
      padding-left: 16px;
      font-size: 8.3pt;
      color: #4a4a4a;
    }
    .cert-list li {
      margin-bottom: 2px;
    }

    @media print {
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
      }
      .cv-page, #main-container {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .cv-page:last-child, #main-container:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body class="${runtime.layoutClass}">
<div class="cv-page" id="main-container">
  
  <div class="top-grid">
    <div class="header-info">
      ${name ? `<h1 data-df-field="name">${name}</h1>` : ''}
      <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
      ${!isSplit ? renderContactBar() : ''}
      ${summaryText ? `<div class="summary" data-df-field="summary">${summaryText}</div>` : ''}
    </div>
    
    ${isSplit ? `
      <div class="tan-card">
        ${photoSrc ? `
          <div class="avatar-mask">
            <img class="avatar" src="${photoSrc}" alt="${name || 'Profile Photo'}" />
          </div>
        ` : ''}
        ${renderContactCard()}
        ${runtime.sidebarHtml}
      </div>
    ` : ''}
  </div>
  
  ${runtime.p1MainHtml}

</div>

  <!-- Page 2 Sheet (Captured Overflow Elements) -->
  ${runtime.hasPage2 ? `
    <div class="cv-page cv-page-2" id="page-2">
      <div class="page-2-body">
        ${runtime.p2MainHtml}
      </div>
    </div>
  ` : ''}
</body>
</html>`;
}
