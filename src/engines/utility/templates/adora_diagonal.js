// ═══════════════════════════════════════════════════════════════════════════════
// 15. ADORA DIAGONAL — Modern Cyan Geometric Diagonal Split (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateAdoraDiagonalHtml(
  data = {},
  themeColor = '#0284c7',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#0284c7' : themeColor;
  const secondaryAccent = '#0f172a';
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const safeData = data && typeof data === 'object' ? data : {};
  const name = safeData.name !== undefined && safeData.name !== null ? String(safeData.name).trim() : '';
  const title = safeData.title !== undefined && safeData.title !== null ? String(safeData.title).trim() : '';
  const summaryText = (safeData.summary || safeData.profile || safeData.about || '').trim();
  const phoneText = (safeData.phone || '').trim();
  const emailText = (safeData.email || '').trim();
  const locationText = (safeData.location || safeData.address || '').trim();
  const linkedinText = (safeData.linkedin || '').trim();
  const websiteText = (safeData.website || '').trim();
  const photoSrc = (safeData.photoUrl || '').trim();

  const skillsList = Array.isArray(safeData.skills) ? safeData.skills : [];
  const educationList = Array.isArray(safeData.education) ? safeData.education : [];
  const experienceList = Array.isArray(safeData.experience) ? safeData.experience : [];
  const projectList = Array.isArray(safeData.projects) ? safeData.projects : [];
  const certList = Array.isArray(safeData.certifications) ? safeData.certifications : [];
  const referenceList = Array.isArray(safeData.references) ? safeData.references : [];
  const customSections = Array.isArray(safeData.customSections) ? safeData.customSections : [];

  const langSection = customSections.find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const otherCustomSections = customSections.filter(cs => cs !== langSection);

  const hasContact = Boolean(phoneText || emailText || locationText || linkedinText || websiteText);

  const expHtml = experienceList.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2 class="section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h2>
      </div>
      <div class="timeline-line-wrap">
        ${experienceList.map((e, idx) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="timeline-role" data-df-field="exp:${idx}:role">${e.role || ''}</span>
              <span class="timeline-year" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></span>${locationText ? ` · ${locationText}` : ''}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="timeline-desc">
                ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
              </ul>
            ` : (e.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 4px;" data-df-field="exp:${idx}:highlight:0">${e.description}</div>` : '')}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const eduHtml = educationList.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2 class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h2>
      </div>
      <div class="timeline-line-wrap">
        ${educationList.map((e, idx) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="timeline-role" data-df-field="edu:${idx}:degree">${e.degree || ''}</span>
              <span class="timeline-year" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
            </div>
            <div class="timeline-company"><span data-df-field="edu:${idx}:school">${e.school || ''}</span>${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = projectList.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2 class="section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h2>
      </div>
      <div class="timeline-line-wrap">
        ${projectList.map((p, idx) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="timeline-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
              ${p.url ? `<span class="timeline-year"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const refHtml = referenceList.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2 class="section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</h2>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
        ${referenceList.map((r, idx) => `
          <div style="font-size: 8.5pt; color: #475569;">
            <div data-df-field="ref:${idx}:name" style="font-weight: 700; color: #0f172a;">${r.name || ''}</div>
            <div data-df-field="ref:${idx}:relation" style="font-style: italic;">${r.relation || ''}</div>
            <div data-df-field="ref:${idx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const certHtml = certList.length ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3 class="section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
      </div>
      <ul class="cert-list" style="margin-top: 8px;">
        ${certList.map((c, idx) => `<li data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3 class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      </div>
      <div class="contact-list">
        ${phoneText ? `<div class="contact-row"><span data-df-field="phone">${phoneText}</span></div>` : ''}
        ${emailText ? `<div class="contact-row"><a href="mailto:${emailText}" style="color: inherit; text-decoration: none; word-break: break-all;" data-df-field="email">${emailText}</a></div>` : ''}
        ${locationText ? `<div class="contact-row"><span data-df-field="location">${locationText}</span></div>` : ''}
        ${linkedinText ? `<div class="contact-row"><a data-df-field="linkedin" href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${websiteText ? `<div class="contact-row"><a data-df-field="website" href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a></div>` : ''}
      </div>
    </div>
  ` : '';

  const skillsHtml = skillsList.length ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3 class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h3>
      </div>
      <div class="skills-grid" style="margin-top: 8px;">
        ${skillsList.map((s, idx) => {
          let sName = typeof s === 'string' ? s : s.name || '';
          let levelText = '';
          if (typeof s === 'string' && s.includes(' - ')) {
            const parts = s.split(' - ');
            sName = parts[0];
            levelText = parts[1];
          }
          return `
            <div class="skill-item">
              <span data-df-field="skill:${idx}">• ${sName}</span>
              ${levelText ? `<span style="color: #64748b; font-size: 7.8pt;">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3 data-df-field="custom:${langSection.id}:title">${langSection.title || 'Languages'}</h3>
      </div>
      <div class="skills-grid" style="margin-top: 8px;">
        ${langSection.items.map((i, idx) => `
          <div class="skill-item">
            <span data-df-field="custom:${langSection.id}:${idx}:title">• ${typeof i === 'string' ? i : (i.title || i.name || '')}</span>
            ${typeof i === 'object' && i !== null && i.value ? `<span data-df-field="custom:${langSection.id}:${idx}:value" style="color: #64748b; font-size: 7.8pt;">${i.value}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const customHtml = otherCustomSections.map(cs => {
    if (!cs || !cs.items || !cs.items.length) return '';
    return `
      <div class="timeline-group">
        <div class="section-title-wrap">
          <h2 data-df-field="custom:${cs.id}:title">${cs.title || 'Additional Information'}</h2>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
          ${cs.items.map((i, idx) => `
            <div style="font-size: 8.5pt;">
              <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${name ? `${name} - Resume` : 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 0; size: A4; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: transparent;
      font-family: ${fontFam};
      color: #334155;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cv-page {
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      background: #ffffff;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
    }
    .cv-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .diagonal-header {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 140px;
      background: ${accent};
      clip-path: polygon(0 0, 100% 0, 100% 70%, 0 100%);
      z-index: 1;
    }
    .diagonal-header-sub {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 155px;
      background: ${secondaryAccent};
      clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
      opacity: 0.15;
      z-index: 0;
    }
    .header-content {
      position: relative;
      z-index: 2;
      padding: ${24 + pageMargin}px 36px 0 36px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .name-title-wrap {
      color: #ffffff;
    }
    .candidate-name {
      font-size: 26pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.1;
      text-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .candidate-title {
      font-size: 11pt;
      font-weight: 500;
      letter-spacing: 0.5px;
      opacity: 0.95;
      margin-top: 4px;
    }
    .avatar-mask {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      background: #ffffff;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .avatar-img.avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .body-layout {
      position: relative;
      z-index: 2;
      display: flex;
      padding: 24px 36px ${28 + pageMargin}px 36px;
      gap: 32px;
      margin-top: 8px;
    }
    .sidebar {
      width: 210px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 18px;
      border-right: 1px solid #e2e8f0;
      padding-right: 20px;
    }
    .sidebar-section {
      display: flex;
      flex-direction: column;
    }
    .sidebar-title-wrap h3 {
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      border-bottom: 2px solid ${accent};
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .contact-row {
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.35;
      word-break: break-all;
    }
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .skill-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      color: #334155;
      font-weight: 500;
    }
    .cert-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .cert-list li {
      font-size: 8.5pt;
      color: #334155;
    }
    .cert-list li::before {
      content: '• ';
      color: ${accent};
      font-weight: bold;
    }
    .main-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .summary-text {
      font-size: 9pt;
      line-height: ${lineSpacing};
      color: #475569;
      background: #f8fafc;
      border-left: 3px solid ${accent};
      padding: 8px 12px;
      border-radius: 0 4px 4px 0;
    }
    .section-title-wrap h2 {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0f172a;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 10px;
    }
    .timeline-group {
      display: flex;
      flex-direction: column;
    }
    .timeline-line-wrap {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .timeline-item {
      position: relative;
      padding-left: 14px;
    }
    .timeline-dot {
      position: absolute;
      left: 0;
      top: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${accent};
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .timeline-role {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .timeline-year {
      font-size: 8.5pt;
      color: #64748b;
      font-weight: 500;
    }
    .timeline-company {
      font-size: 8.8pt;
      color: ${accent};
      font-weight: 600;
      margin-top: 1px;
    }
    .timeline-desc {
      margin-top: 4px;
      padding-left: 14px;
      font-size: 8.5pt;
      line-height: ${lineSpacing};
      color: #475569;
    }
    .timeline-desc li {
      margin-bottom: 2px;
    }
    @media print {
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .cv-page {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
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
<body>
  <div class="cv-page" id="page-1">
    <div class="diagonal-header-sub"></div>
    <div class="diagonal-header"></div>
    
    <div class="header-content">
      <div class="name-title-wrap">
        <h1 class="candidate-name" data-df-field="name">${name}</h1>
        <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
      </div>
      ${photoSrc ? `
        <div class="avatar-mask">
          <img class="avatar-img avatar" src="${photoSrc}" alt="${name || 'Profile Photo'}">
        </div>
      ` : ''}
    </div>

    <div class="body-layout">
      <div class="sidebar">
        ${contactHtml}
        ${skillsHtml}
        ${langHtml}
        ${certHtml}
      </div>

      <div class="main-col">
        ${summaryText ? `<div class="summary-text" data-df-field="summary">${summaryText}</div>` : ''}
        ${expHtml}
        ${eduHtml}
        ${projHtml}
        ${refHtml}
        ${customHtml}
      </div>
    </div>
  </div>
</body>
</html>`;
}