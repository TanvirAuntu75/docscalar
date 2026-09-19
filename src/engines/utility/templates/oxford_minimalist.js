/**
 * Oxford Minimalist — 100% ATS Ultra-Compliant Academic & Research Resume Template
 * Traditional single-column scholarly typography with clean margin rules and publication structure.
 */

export function generateOxfordMinimalistHtml(data, themeOrColor = {}, fontArg, sectionOrder, layout, pageMarginArg, lineSpacingArg) {
  const isObject = typeof themeOrColor === 'object' && themeOrColor !== null && !Array.isArray(themeOrColor);
  const font = isObject ? (themeOrColor.font || 'Garamond, "EB Garamond", serif') : (fontArg || 'Garamond, "EB Garamond", serif');
  const primaryColor = isObject ? (themeOrColor.primaryColor || '#1e293b') : (themeOrColor || '#1e293b');
  const lineSpacing = isObject ? (themeOrColor.lineSpacing || 1.35) : (lineSpacingArg || 1.35);
  const pageMargin = isObject ? (themeOrColor.pageMargin !== undefined ? themeOrColor.pageMargin : 0) : (pageMarginArg !== undefined ? pageMarginArg : 0);

  const st = data.sectionTitles || {};
  const expTitle = st.experience || 'Academic & Professional Appointments';
  const eduTitle = st.education || 'Education & Qualifications';
  const skillsTitle = st.skills || 'Scholarly Expertise & Languages';
  const projTitle = st.projects || 'Selected Research & Publications';
  const certTitle = st.certifications || 'Honours, Awards & Fellowships';
  const summaryTitle = st.summary || 'Research Profile';

  const contactParts = [];
  if (data.email) contactParts.push(`<a href="mailto:${data.email}" data-df-field="email" style="color:#0f172a;text-decoration:none;">${data.email}</a>`);
  if (data.phone) contactParts.push(`<span data-df-field="phone">${data.phone}</span>`);
  if (data.location) contactParts.push(`<span data-df-field="location">${data.location}</span>`);
  if (data.website) contactParts.push(`<a href="${data.website.startsWith('http') ? data.website : 'https://' + data.website}" target="_blank" rel="noreferrer" data-df-field="website" style="color:#0f172a;text-decoration:none;">${data.website.replace(/^https?:\/\//i, '')}</a>`);
  if (data.linkedin) contactParts.push(`<a href="${data.linkedin.startsWith('http') ? data.linkedin : 'https://' + data.linkedin}" target="_blank" rel="noreferrer" data-df-field="linkedin" style="color:${primaryColor};text-decoration:none;">${data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/')}</a>`);
  if (data.github) contactParts.push(`<a href="${data.github.startsWith('http') ? data.github : 'https://github.com/' + data.github}" target="_blank" rel="noreferrer" data-df-field="github" style="color:${primaryColor};text-decoration:none;">github.com/${data.github.replace(/^https?:\/\/(www\.)?github\.com\//i, '')}</a>`);
  
  const activeOrder = isObject ? (themeOrColor.sectionOrder || sectionOrder) : sectionOrder;
  const order = Array.isArray(activeOrder) && activeOrder.length > 0
    ? [...activeOrder]
    : ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'references'];

  (data.customSections || []).forEach(cs => {
    if (!order.includes(cs.id)) order.push(cs.id);
  });
  if (data.references && data.references.length && !order.includes('references')) order.push('references');

  const renderSectionByKey = (key) => {
    if (key === 'summary' && data.summary) {
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:summary">${summaryTitle}</h2>
          <p style="font-size: 9.2pt; color: #1e293b; text-align: justify;" data-df-field="summary">${data.summary}</p>
        </div>
      `;
    }
    if (key === 'experience' && Array.isArray(data.experience) && data.experience.length > 0) {
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:experience">${expTitle}</h2>
          ${data.experience.map((exp, idx) => `
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
    }
    if (key === 'education' && Array.isArray(data.education) && data.education.length > 0) {
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:education">${eduTitle}</h2>
          ${data.education.map((edu, idx) => `
            <div style="margin-bottom: 6px;">
              <div class="item-header">
                <div>
                  <span class="item-bold" data-df-field="edu:${idx}:school">${edu.school || ''}</span>${edu.school && edu.degree ? ' — ' : ''}<span class="item-italic" data-df-field="edu:${idx}:degree">${edu.degree || ''}</span>
                </div>
                <span class="item-date" data-df-field="edu:${idx}:date">${edu.start || ''}${edu.start && edu.end ? ' – ' : ''}${edu.end || ''}</span>
              </div>
              ${edu.note ? `<div style="font-size: 8.6pt; color: #475569;" data-df-field="edu:${idx}:note">${edu.note}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }
    if (key === 'skills' && Array.isArray(data.skills) && data.skills.length > 0) {
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:skills">${skillsTitle}</h2>
          <div style="font-size: 9pt; color: #1e293b;">
            ${data.skills.map((s, idx) => `<span data-df-field="skill:${idx}">${s}</span>`).join(' · ')}
          </div>
        </div>
      `;
    }
    if (key === 'projects' && Array.isArray(data.projects) && data.projects.length > 0) {
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:projects">${projTitle}</h2>
          ${data.projects.map((p, idx) => `
            <div style="margin-bottom: 6px;">
              <div class="item-header">
                <span class="item-bold" data-df-field="proj:${idx}:name">${p.name || ''}</span>${p.url ? ` — <a href="${p.url}" target="_blank" rel="noreferrer" data-df-field="proj:${idx}:url" style="color:${primaryColor};text-decoration:none;font-weight:400;">${p.url.replace(/^https?:\/\//i, '')}</a>` : ''}
              </div>
              ${p.description ? `<p style="font-size: 8.8pt; color: #334155;" data-df-field="proj:${idx}:description">${p.description}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }
    if (key === 'certifications' && Array.isArray(data.certifications) && data.certifications.length > 0) {
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:certifications">${certTitle}</h2>
          <ul class="bullet-list">
            ${data.certifications.map((cert, idx) => `
              <li class="bullet-item" data-df-field="cert:${idx}">${typeof cert === 'object' ? cert.name || '' : cert}</li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    if (key === 'references' && Array.isArray(data.references) && data.references.length > 0) {
      const refTitle = st.references || 'References';
      return `
        <div>
          <h2 class="section-heading" data-df-field="heading:references">${refTitle}</h2>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
            ${data.references.map((ref, idx) => `
              <div style="font-size: 8.5pt; color: #334155;">
                <span style="font-weight: 700; color: #0f172a;" data-df-field="ref:${idx}:name">${ref.name || ''}</span>${ref.name && ref.relation ? ' — ' : ''}<span style="font-style: italic; color: #475569;" data-df-field="ref:${idx}:relation">${ref.relation || ''}</span>
                <div style="font-size: 8pt; color: #64748b;" data-df-field="ref:${idx}:contact">${ref.phone ? `Phone: ${ref.phone} · ` : ''}${ref.email ? `Email: ${ref.email}` : ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    const cs = (data.customSections || []).find(c => c.id === key);
    if (cs && Array.isArray(cs.items) && cs.items.length > 0) {
      return `
        <div>
          <h2 class="section-heading" data-df-field="custom:${cs.id}:title">${cs.title}</h2>
          <div style="font-size: 8.8pt; color: #1e293b;">
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
    return '';
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${data.name || 'Resume'} — Oxford Minimalist</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #f8fafc;
      font-family: ${font};
      color: #0f172a;
      line-height: ${lineSpacing};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .cv-page {
      width: 794px;
      min-height: 1123px;
      height: 1123px;
      background: #ffffff;
      margin: 0 auto 30px auto;
      padding: ${44 + pageMargin}px ${48 + pageMargin}px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .header-block {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .header-text {
      flex: 1;
    }
    .candidate-name {
      font-size: 21pt;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #0f172a;
      line-height: 1.1;
      margin-bottom: 2px;
    }
    .candidate-title {
      font-size: 10.5pt;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 6px;
    }
    .avatar-mask {
      width: 78px;
      height: 78px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid ${primaryColor};
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .avatar-mask img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .contact-bar {
      font-size: 8.5pt;
      color: #475569;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .oxford-divider {
      border-bottom: 1px solid #cbd5e1;
      margin: 10px 0 14px 0;
    }
    .section-heading {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #0f172a;
      border-bottom: 1.5px solid ${primaryColor};
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
    .item-bold { font-weight: 700; color: #0f172a; }
    .item-italic { font-style: italic; color: #334155; }
    .item-date { font-size: 8.5pt; font-weight: 600; color: #64748b; white-space: nowrap; }
    .bullet-list { list-style-type: disc; padding-left: 18px; margin-top: 2px; margin-bottom: 5px; }
    .bullet-item { font-size: 8.8pt; color: #334155; margin-bottom: 2.5px; line-height: ${lineSpacing}; }
    @media print {
      body { background: transparent !important; }
      .cv-page {
        margin: 0 !important;
        padding: ${44 + pageMargin}px ${48 + pageMargin}px !important;
        height: 1123px !important;
        box-shadow: none !important;
        page-break-after: always;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .cv-page:last-child {
        page-break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="cv-page">
    <div class="header-block">
      <div class="header-text">
        ${data.name ? `<h1 class="candidate-name" data-df-field="name">${data.name}</h1>` : ''}
        <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
        ${contactParts.length > 0 ? `<div class="contact-bar">${contactParts.join(' · ')}</div>` : ''}
      </div>
      ${data.photoUrl ? `<div class="avatar-mask"><img src="${data.photoUrl}" alt="${data.name || 'Candidate'}" class="profile-photo" /></div>` : ''}
    </div>
    <div class="oxford-divider"></div>

    ${order.map(k => renderSectionByKey(k)).filter(Boolean).join('\n')}
  </div>
</body>
</html>
  `.trim();
}
