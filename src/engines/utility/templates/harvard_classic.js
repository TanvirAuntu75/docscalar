/**
 * Harvard Classic — 100% ATS Ultra-Compliant Single-Column Resume Template
 * Strict linear text stream, standard serif typography, horizontal rules, right-aligned em-dash dates.
 */

import { renderUniversalOrderedSections } from '../universalTemplateRuntime.js';
import { getFontFamilyCss, getGoogleFontsLinkTags, computeFontAdjustedLineSpacing } from '../fontRegistry.js';

export function generateHarvardClassicHtml(data, themeOrColor = {}, fontArg, sectionOrder, layout, pageMarginArg, lineSpacingArg) {
  const isObject = typeof themeOrColor === 'object' && themeOrColor !== null && !Array.isArray(themeOrColor);
  const themeFont = isObject ? (themeOrColor.font || themeOrColor.themeFont || 'Merriweather') : (fontArg || 'Merriweather');
  const primaryColor = isObject ? (themeOrColor.primaryColor || themeOrColor.themeColor || '#111827') : (themeOrColor || '#111827');
  const lineSpacing = isObject ? (themeOrColor.lineSpacing !== undefined ? themeOrColor.lineSpacing : 1.35) : (lineSpacingArg !== undefined ? lineSpacingArg : 1.35);
  const pageMargin = isObject ? (themeOrColor.pageMargin !== undefined ? themeOrColor.pageMargin : 0) : (pageMarginArg !== undefined ? pageMarginArg : 0);
  const rawOrder = isObject ? (themeOrColor.sectionOrder || sectionOrder) : sectionOrder;
  const themeLayout = isObject ? (themeOrColor.themeLayout || layout || 'single') : (layout || 'single');

  const safeData = data && typeof data === 'object' ? data : {};
  const st = safeData.sectionTitles || {};
  const expTitle = st.experience || 'Work Experience';
  const eduTitle = st.education || 'Education';
  const skillsTitle = st.skills || 'Core Competencies & Skills';
  const projTitle = st.projects || 'Key Projects';
  const certTitle = st.certifications || 'Certifications & Credentials';
  const summaryTitle = st.summary || 'Executive Summary';

  const contactParts = [];
  if (safeData.email) contactParts.push(`<a href="mailto:${safeData.email}" data-df-field="email" style="color:${primaryColor};text-decoration:none;">${safeData.email}</a>`);
  if (safeData.phone) contactParts.push(`<span data-df-field="phone">${safeData.phone}</span>`);
  if (safeData.location) contactParts.push(`<span data-df-field="location">${safeData.location}</span>`);
  if (safeData.linkedin) contactParts.push(`<a href="${safeData.linkedin.startsWith('http') ? safeData.linkedin : 'https://' + safeData.linkedin}" target="_blank" rel="noreferrer" data-df-field="linkedin" style="color:${primaryColor};text-decoration:none;">${safeData.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/')}</a>`);
  if (safeData.website) contactParts.push(`<a href="${safeData.website.startsWith('http') ? safeData.website : 'https://' + safeData.website}" target="_blank" rel="noreferrer" data-df-field="website" style="color:${primaryColor};text-decoration:none;">${safeData.website.replace(/^https?:\/\//i, '')}</a>`);
  if (safeData.github) contactParts.push(`<a href="${safeData.github.startsWith('http') ? safeData.github : 'https://github.com/' + safeData.github}" target="_blank" rel="noreferrer" data-df-field="github" style="color:${primaryColor};text-decoration:none;">github.com/${safeData.github.replace(/^https?:\/\/(www\.)?github\.com\//i, '')}</a>`);

  // Section renderers
  const renderers = {
    summary: () => {
      if (!safeData.summary || !String(safeData.summary).trim()) return '';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:summary">${summaryTitle}</h2>
          <p class="summary-text" data-df-field="summary">${safeData.summary}</p>
        </div>
      `;
    },
    experience: () => {
      if (!Array.isArray(safeData.experience) || !safeData.experience.length) return '';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:experience">${expTitle}</h2>
          ${safeData.experience.map((exp, idx) => `
            <div style="margin-bottom: 8px;">
              <div class="item-header">
                <div>
                  <span class="item-bold" data-df-field="exp:${idx}:company">${exp.company || ''}</span>${exp.company && exp.role ? ' — ' : ''}<span class="item-italic" data-df-field="exp:${idx}:role">${exp.role || ''}</span>
                </div>
                <span class="item-date" data-df-field="exp:${idx}:date">${exp.start || ''}${exp.start && exp.end ? ' – ' : ''}${exp.end || ''}</span>
              </div>
              ${Array.isArray(exp.highlights) && exp.highlights.length > 0 ? `
                <ul class="bullet-list">
                  ${exp.highlights.map((h, hIdx) => `
                    <li class="bullet-item" data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>
                  `).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    },
    education: () => {
      if (!Array.isArray(safeData.education) || !safeData.education.length) return '';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:education">${eduTitle}</h2>
          ${safeData.education.map((edu, idx) => `
            <div style="margin-bottom: 6px;">
              <div class="item-header">
                <div>
                  <span class="item-bold" data-df-field="edu:${idx}:school">${edu.school || ''}</span>${edu.school && edu.degree ? ' — ' : ''}<span class="item-italic" data-df-field="edu:${idx}:degree">${edu.degree || ''}</span>
                </div>
                <span class="item-date" data-df-field="edu:${idx}:date">${edu.start || ''}${edu.start && edu.end ? ' – ' : ''}${edu.end || ''}</span>
              </div>
              ${edu.note ? `<div style="font-size: 8.5pt; color: #4b5563;" data-df-field="edu:${idx}:note">${edu.note}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    },
    skills: () => {
      if (!Array.isArray(safeData.skills) || !safeData.skills.length) return '';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:skills">${skillsTitle}</h2>
          <div class="skills-row">
            <strong style="font-size: 8.8pt; color: ${primaryColor};">Technical & Professional Proficiencies:</strong>
            <span style="font-size: 8.8pt; color: #1f2937;">
              ${safeData.skills.map((s, idx) => `<span data-df-field="skill:${idx}">${s}</span>`).join(' · ')}
            </span>
          </div>
        </div>
      `;
    },
    projects: () => {
      if (!Array.isArray(safeData.projects) || !safeData.projects.length) return '';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:projects">${projTitle}</h2>
          ${safeData.projects.map((p, idx) => `
            <div style="margin-bottom: 6px;">
              <div class="item-header">
                <div>
                  <span class="item-bold" data-df-field="proj:${idx}:name">${p.name || ''}</span>${p.url ? ` <a href="${p.url.startsWith('http') ? p.url : 'https://' + p.url}" target="_blank" rel="noreferrer" style="font-size: 8pt; color: ${primaryColor}; text-decoration: none;" data-df-field="proj:${idx}:url">(${p.url})</a>` : ''}
                </div>
              </div>
              ${p.description ? `<p style="font-size: 8.8pt; color: #374151; margin-top: 2px;" data-df-field="proj:${idx}:description">${p.description}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    },
    certifications: () => {
      if (!Array.isArray(safeData.certifications) || !safeData.certifications.length) return '';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:certifications">${certTitle}</h2>
          <ul class="bullet-list">
            ${safeData.certifications.map((cert, idx) => `
              <li class="bullet-item" data-df-field="cert:${idx}">${typeof cert === 'object' ? cert.name || '' : cert}</li>
            `).join('')}
          </ul>
        </div>
      `;
    },
    references: () => {
      if (!Array.isArray(safeData.references) || !safeData.references.length) return '';
      const refTitle = st.references || 'References';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:references">${refTitle}</h2>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
            ${safeData.references.map((ref, idx) => `
              <div style="font-size: 8.5pt; color: #374151;">
                <span style="font-weight: 700; color: #111827;" data-df-field="ref:${idx}:name">${ref.name || ''}</span>${ref.name && ref.relation ? ' — ' : ''}<span style="font-style: italic; color: #4b5563;" data-df-field="ref:${idx}:relation">${ref.relation || ''}</span>
                <div style="font-size: 8pt; color: #6b7280;" data-df-field="ref:${idx}:contact">${ref.phone ? `Phone: ${ref.phone} · ` : ''}${ref.email ? `Email: ${ref.email}` : ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    },
    custom: (cs) => {
      if (!cs || !Array.isArray(cs.items) || !cs.items.length) return '';
      return `
        <div>
          <h2 class="section-heading" data-df-field="custom:${cs.id}:title">${cs.title}</h2>
          <div style="font-size: 8.8pt; color: #1f2937;">
            ${cs.items.map((it, itemIdx) => `
              <div style="margin-bottom: 3px;">
                ${typeof it === 'object' && it !== null
                  ? `<strong data-df-field="custom:${cs.id}:${itemIdx}:title">${it.title || ''}</strong>${it.value ? `: <span data-df-field="custom:${cs.id}:${itemIdx}:value">${it.value}</span>` : ''}`
                  : `<span data-df-field="custom:${cs.id}:${itemIdx}">${it}</span>`}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  };

  const runtime = renderUniversalOrderedSections(safeData, {
    primaryColor,
    font: themeFont,
    sectionOrder: rawOrder,
    themeLayout: 'single',
    pageMargin,
    lineSpacing
  }, renderers, {
    themeLayout: 'single'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeData.name || 'Resume'} — Harvard Classic (ATS Ultra)</title>
  ${runtime.googleFontsLink}
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: transparent;
      font-family: ${runtime.fontFamilyCss};
      color: #111827;
      line-height: ${runtime.adjustedLineSpacing};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      margin: 0;
      padding: 0;
    }
    .cv-page {
      width: 794px;
      min-height: 1123px;
      height: 1123px;
      background: #ffffff;
      margin: 0 auto;
      padding: ${44 + pageMargin}px ${48 + pageMargin}px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border-radius: 4px;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
    }
    .cv-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .candidate-name {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      text-align: center;
      color: ${primaryColor};
      margin-bottom: 3px;
    }
    .candidate-title {
      font-size: 10.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-align: center;
      color: #4b5563;
      margin-bottom: 6px;
    }
    .avatar-mask {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      overflow: hidden;
      margin: 0 auto 10px auto;
      border: 2px solid ${primaryColor};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .avatar-mask img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .contact-bar {
      font-size: 8.5pt;
      text-align: center;
      color: #374151;
      margin-bottom: 14px;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid ${primaryColor};
    }
    .section-heading {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${primaryColor};
      border-bottom: 1px solid #9ca3af;
      padding-bottom: 2px;
      margin-top: 13px;
      margin-bottom: 7px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 9.5pt;
      margin-bottom: 2px;
    }
    .item-bold {
      font-weight: 700;
      color: #111827;
    }
    .item-italic {
      font-style: italic;
      color: #374151;
    }
    .item-date {
      font-size: 8.5pt;
      font-weight: 600;
      color: #4b5563;
      text-align: right;
      white-space: nowrap;
    }
    .summary-text {
      font-size: 9pt;
      color: #1f2937;
      text-align: justify;
      margin-bottom: 6px;
    }
    .bullet-list {
      list-style-type: disc;
      padding-left: 18px;
      margin-top: 3px;
      margin-bottom: 6px;
    }
    .bullet-item {
      font-size: 8.8pt;
      color: #1f2937;
      margin-bottom: 3px;
      line-height: ${runtime.adjustedLineSpacing};
    }
    .skills-row {
      font-size: 9pt;
      margin-bottom: 4px;
      color: #1f2937;
    }
    @media print {
      body { background: transparent !important; gap: 0 !important; }
      .cv-page {
        margin: 0 !important;
        padding: ${44 + pageMargin}px ${48 + pageMargin}px !important;
        height: 1123px !important;
        min-height: 1123px !important;
        max-height: 1123px !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .cv-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body class="${runtime.layoutClass}">
  <!-- Page 1 Sheet -->
  <div class="cv-page cv-page-1" id="page-1">
    <div style="text-align: center;">
      ${safeData.photoUrl ? `
        <div class="avatar-mask" data-df-field="photo">
          <img src="${safeData.photoUrl}" alt="${safeData.name || 'Candidate'}" class="profile-photo" />
        </div>
      ` : ''}
      <h1 class="candidate-name" data-df-field="name" data-placeholder="Full Name" style="min-height: 1.2em;">${safeData.name || ''}</h1>
      <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${safeData.title || ''}</div>
      ${contactParts.length > 0 ? `<div class="contact-bar">${contactParts.join(' · ')}</div>` : ''}
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
</html>`.trim();
}
