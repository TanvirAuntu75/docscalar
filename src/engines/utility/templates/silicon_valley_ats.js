/**
 * Silicon Valley ATS — 100% ATS Ultra-Compliant Tech Resume Template
 * Modern single-column clean tech hierarchy, monospace contact tags, high-density skills categorization.
 */

import { renderUniversalOrderedSections } from '../universalTemplateRuntime.js';
import { getFontFamilyCss, getGoogleFontsLinkTags, computeFontAdjustedLineSpacing } from '../fontRegistry.js';

export function generateSiliconValleyAtsHtml(data, themeOrColor = {}, fontArg, sectionOrder, layout, pageMarginArg, lineSpacingArg) {
  const isObject = typeof themeOrColor === 'object' && themeOrColor !== null && !Array.isArray(themeOrColor);
  const themeFont = isObject ? (themeOrColor.font || themeOrColor.themeFont || 'Inter') : (fontArg || 'Inter');
  const primaryColor = isObject ? (themeOrColor.primaryColor || themeOrColor.themeColor || '#0284c7') : (themeOrColor || '#0284c7');
  const lineSpacing = isObject ? (themeOrColor.lineSpacing !== undefined ? themeOrColor.lineSpacing : 1.35) : (lineSpacingArg !== undefined ? lineSpacingArg : 1.35);
  const pageMargin = isObject ? (themeOrColor.pageMargin !== undefined ? themeOrColor.pageMargin : 0) : (pageMarginArg !== undefined ? pageMarginArg : 0);
  const rawOrder = isObject ? (themeOrColor.sectionOrder || sectionOrder) : sectionOrder;

  const safeData = data && typeof data === 'object' ? data : {};
  const st = safeData.sectionTitles || {};
  const expTitle = st.experience || 'Experience';
  const eduTitle = st.education || 'Education';
  const skillsTitle = st.skills || 'Technical Skills';
  const projTitle = st.projects || 'Projects & Open Source';
  const certTitle = st.certifications || 'Certifications';
  const summaryTitle = st.summary || 'Summary';

  const contactParts = [];
  if (safeData.email) contactParts.push(`<a href="mailto:${safeData.email}" data-df-field="email" style="color:#0f172a;text-decoration:none;">${safeData.email}</a>`);
  if (safeData.phone) contactParts.push(`<span data-df-field="phone">${safeData.phone}</span>`);
  if (safeData.location) contactParts.push(`<span data-df-field="location">${safeData.location}</span>`);
  if (safeData.linkedin) contactParts.push(`<a href="${safeData.linkedin.startsWith('http') ? safeData.linkedin : 'https://' + safeData.linkedin}" target="_blank" rel="noreferrer" data-df-field="linkedin" style="color:${primaryColor};text-decoration:none;font-weight:600;">${safeData.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/')}</a>`);
  if (safeData.website) contactParts.push(`<a href="${safeData.website.startsWith('http') ? safeData.website : 'https://' + safeData.website}" target="_blank" rel="noreferrer" data-df-field="website" style="color:${primaryColor};text-decoration:none;font-weight:600;">${safeData.website.replace(/^https?:\/\//i, '')}</a>`);
  if (safeData.github) contactParts.push(`<a href="${safeData.github.startsWith('http') ? safeData.github : 'https://github.com/' + safeData.github}" target="_blank" rel="noreferrer" data-df-field="github" style="color:${primaryColor};text-decoration:none;font-weight:600;">github.com/${safeData.github.replace(/^https?:\/\/(www\.)?github\.com\//i, '')}</a>`);

  // Section renderers
  const renderers = {
    summary: () => {
      if (!safeData.summary || !String(safeData.summary).trim()) return '';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:summary">${summaryTitle}</h2>
          <p style="font-size: 9pt; color: #334155; line-height: ${lineSpacing};" data-df-field="summary">${safeData.summary}</p>
        </div>
      `;
    },
    skills: (items) => {
      const targetSkills = Array.isArray(items) ? items : safeData.skills;
      if (!Array.isArray(targetSkills) || !targetSkills.length) return '';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:skills">${skillsTitle}</h2>
          <div class="skills-tag-matrix">
            ${targetSkills.map((s, idx) => `<span class="skill-pill" data-df-field="skill:${idx}">${s}</span>`).join('')}
          </div>
        </div>
      `;
    },
    experience: (items, isContinuation, offset = 0) => {
      const targetExp = Array.isArray(items) ? items : safeData.experience;
      if (!Array.isArray(targetExp) || !targetExp.length) return '';
      const baseOffset = typeof offset === 'number' ? offset : 0;
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:experience">${expTitle}${isContinuation ? ' (Continued)' : ''}</h2>
          ${targetExp.map((exp, relIdx) => {
            const idx = baseOffset + relIdx;
            return `
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <div>
                  <span class="role-title" data-df-field="exp:${idx}:role">${exp.role || ''}</span>${exp.role && exp.company ? ' · ' : ''}<span class="company-name" data-df-field="exp:${idx}:company">${exp.company || ''}</span>
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
          `;
          }).join('')}
        </div>
      `;
    },
    projects: (items, isContinuation, offset = 0) => {
      const targetProjects = Array.isArray(items) ? items : safeData.projects;
      if (!Array.isArray(targetProjects) || !targetProjects.length) return '';
      const baseOffset = typeof offset === 'number' ? offset : 0;
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:projects">${projTitle}${isContinuation ? ' (Continued)' : ''}</h2>
          ${targetProjects.map((p, relIdx) => {
            const idx = baseOffset + relIdx;
            return `
            <div style="margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span class="role-title" data-df-field="proj:${idx}:name">${p.name || ''}</span>
                ${p.url ? `<a href="${p.url.startsWith('http') ? p.url : 'https://' + p.url}" target="_blank" rel="noreferrer" style="font-size: 8pt; color: ${primaryColor}; text-decoration: none; font-family: ui-monospace, monospace;" data-df-field="proj:${idx}:url">${p.url.replace(/^https?:\/\//i, '')}</a>` : ''}
              </div>
              ${p.description ? `<p style="font-size: 8.8pt; color: #475569; margin-top: 2px;" data-df-field="proj:${idx}:description">${p.description}</p>` : ''}
            </div>
          `;
          }).join('')}
        </div>
      `;
    },
    education: (items, options) => {
      const targetEdu = Array.isArray(items) ? items : (Array.isArray(options?.items) ? options.items : safeData.education);
      if (!Array.isArray(targetEdu) || !targetEdu.length) return '';
      const baseOffset = typeof options?.offset === 'number' ? options.offset : 0;
      const isContinuation = Boolean(options?.isContinuation);
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:education">${eduTitle}${isContinuation ? ' (Continued)' : ''}</h2>
          ${targetEdu.map((edu, relIdx) => {
            const idx = baseOffset + relIdx;
            return `
            <div style="margin-bottom: 5px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <div>
                  <span class="role-title" data-df-field="edu:${idx}:school">${edu.school || ''}</span>${edu.school && edu.degree ? ' — ' : ''}<span style="font-size: 9pt; color: #475569;" data-df-field="edu:${idx}:degree">${edu.degree || ''}</span>
                </div>
                <span class="item-date" data-df-field="edu:${idx}:date">${edu.start || ''}${edu.start && edu.end ? ' – ' : ''}${edu.end || ''}</span>
              </div>
              ${edu.note ? `<div style="font-size: 8.5pt; color: #64748b;" data-df-field="edu:${idx}:note">${edu.note}</div>` : ''}
            </div>
          `;
          }).join('')}
        </div>
      `;
    },
    certifications: (items) => {
      const targetCerts = Array.isArray(items) ? items : safeData.certifications;
      if (!Array.isArray(targetCerts) || !targetCerts.length) return '';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:certifications">${certTitle}</h2>
          <ul class="bullet-list">
            ${targetCerts.map((cert, idx) => `
              <li class="bullet-item" data-df-field="cert:${idx}">${typeof cert === 'object' ? cert.name || '' : cert}</li>
            `).join('')}
          </ul>
        </div>
      `;
    },
    references: (items) => {
      const targetRefs = Array.isArray(items) ? items : safeData.references;
      if (!Array.isArray(targetRefs) || !targetRefs.length) return '';
      const refTitle = st.references || 'References';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:references">${refTitle}</h2>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
            ${targetRefs.map((ref, idx) => `
              <div style="font-size: 8.5pt; color: #475569;">
                <span style="font-weight: 700; color: #0f172a;" data-df-field="ref:${idx}:name">${ref.name || ''}</span>${ref.name && ref.relation ? ' · ' : ''}<span style="font-style: italic; color: #64748b;" data-df-field="ref:${idx}:relation">${ref.relation || ''}</span>
                <div style="font-size: 8pt; color: #94a3b8;" data-df-field="ref:${idx}:contact">${ref.phone ? `Phone: ${ref.phone} · ` : ''}${ref.email ? `Email: ${ref.email}` : ''}</div>
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
          <div style="font-size: 8.8pt; color: #334155;">
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

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeData.name || 'Resume'} — Silicon Valley ATS</title>
  ${runtime.googleFontsLink}
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: transparent;
      font-family: ${runtime.fontFamilyCss};
      color: #0f172a;
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
      padding: ${40 + pageMargin}px ${48 + pageMargin}px;
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
      font-size: 24pt;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #0f172a;
      line-height: 1.1;
      margin-bottom: 2px;
    }
    .candidate-title {
      font-size: 11.5pt;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 8px;
    }
    .avatar-mask {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid ${primaryColor};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      margin-bottom: 12px;
    }
    .avatar-mask img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .contact-bar {
      font-size: 8.5pt;
      color: #475569;
      margin-bottom: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #cbd5e1;
    }
    .section-heading {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      border-bottom: 2px solid ${primaryColor};
      padding-bottom: 2px;
      margin-top: 13px;
      margin-bottom: 8px;
    }
    .role-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .company-name {
      font-weight: 600;
      font-size: 9.5pt;
      color: #334155;
    }
    .item-date {
      font-size: 8.5pt;
      font-weight: 500;
      color: #64748b;
      font-family: ui-monospace, monospace;
    }
    .bullet-list {
      list-style-type: disc;
      padding-left: 18px;
      margin-top: 3px;
      margin-bottom: 6px;
    }
    .bullet-item {
      font-size: 8.8pt;
      color: #334155;
      margin-bottom: 2.5px;
      line-height: ${runtime.adjustedLineSpacing};
    }
    .skills-tag-matrix {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 4px;
      margin-bottom: 6px;
    }
    .skill-pill {
      font-size: 8pt;
      font-weight: 500;
      background: #f1f5f9;
      color: #1e293b;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    @media print {
      body { background: transparent !important; gap: 0 !important; }
      .cv-page {
        margin: 0 !important;
        padding: ${40 + pageMargin}px ${48 + pageMargin}px !important;
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
    <div>
      ${safeData.photoUrl ? `<div class="avatar-mask"><img src="${safeData.photoUrl}" alt="${safeData.name || 'Candidate'}" class="profile-photo" /></div>` : ''}
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
</html>
  `.trim();
}
