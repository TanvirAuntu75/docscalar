// ═══════════════════════════════════════════════════════════════════════════════
// 5. CHARLES — Modern Teal Header Band & Split Sidebar (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateCharlesHtml(
  data = {},
  themeColor = '#0b7a8a',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#0b7a8a' : themeColor;
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

  const experienceList = Array.isArray(safeData.experience) ? safeData.experience : [];
  const educationList = Array.isArray(safeData.education) ? safeData.education : [];
  const skillsList = Array.isArray(safeData.skills) ? safeData.skills : [];
  const projectList = Array.isArray(safeData.projects) ? safeData.projects : [];
  const certList = Array.isArray(safeData.certifications) ? safeData.certifications : [];
  const referenceList = Array.isArray(safeData.references) ? safeData.references : [];
  const customSections = Array.isArray(safeData.customSections) ? safeData.customSections : [];

  const langSection = customSections.find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const otherCustomSections = customSections.filter(cs => cs !== langSection);
  const langList = langSection?.items || (Array.isArray(safeData.custom_languages) ? safeData.custom_languages.map(l => ({ title: typeof l === 'string' ? l : l.name || '', value: '' })) : []);

  const hasContact = Boolean(phoneText || emailText || locationText || linkedinText || websiteText);

  const expHtml = experienceList.length ? `
    <div class="main-section">
      <h3 class="section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Work Experience'}</h3>
      <div class="section-divider"></div>
      ${experienceList.map((e, idx) => `
        <div class="exp-item">
          <div class="exp-header">
            <span class="exp-role" data-df-field="exp:${idx}:role">${e.role || ''} <span class="exp-at">at <span data-df-field="exp:${idx}:company">${e.company || ''}</span></span></span>
            <span class="exp-date" data-df-field="exp:${idx}:date">${e.dates || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
          </div>
          ${e.highlights && e.highlights.filter(Boolean).length ? `
            <ul class="exp-desc">
              ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
            </ul>
          ` : (e.description ? `
            <div class="exp-desc" data-df-field="exp:${idx}:highlight:0" style="font-size: 8.8pt; color: #4b5563; margin-top: 2px;">${e.description}</div>
          ` : '')}
        </div>
      `).join('')}
    </div>
  ` : '';

  const eduHtml = educationList.length ? `
    <div class="main-section">
      <h3 class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
      <div class="section-divider"></div>
      ${educationList.map((e, idx) => `
        <div class="edu-item">
          <div class="edu-header">
            <span class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}</span>
            <span class="edu-date" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
          </div>
          <div class="edu-school"><span data-df-field="edu:${idx}:school">${e.school || ''}</span>${e.note ? ` · ${e.note}` : ''}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const projHtml = projectList.length ? `
    <div class="main-section">
      <h3 class="section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Accomplishments & Projects'}</h3>
      <div class="section-divider"></div>
      <div class="proj-list">
        ${projectList.map((p, idx) => `
          <div class="proj-item">
            <div class="proj-title">
              <span data-df-field="proj:${idx}:name">${p.name || ''}</span>
              ${p.url ? ` <a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none; font-size: 8pt; font-weight: normal;">(${p.url})</a>` : ''}
            </div>
            ${p.description ? `<div class="proj-desc" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const refHtml = referenceList.length ? `
    <div class="main-section">
      <h3 class="section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</h3>
      <div class="section-divider"></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${referenceList.map((r, idx) => `
          <div style="font-size: 8.5pt; color: #4b5563;">
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
      <h3 class="section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
      <div class="sidebar-line"></div>
      <ul class="cert-list" style="padding-left: 14px; font-size: 8.3pt; color: #334155;">
        ${certList.map((c, idx) => `<li data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const skillsHtml = skillsList.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h3>
      <div class="sidebar-line"></div>
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
            <div class="skill-row">
              <span class="skill-name" data-df-field="skill:${idx}">• ${sName}</span>
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const langHtml = langList.length ? `
    <div class="sidebar-section">
      <h3 data-df-field="custom:${langSection.id}:title">${langSection.title || 'Languages'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${langList.map((l, idx) => `
          <div class="skill-row">
            <span class="skill-name" data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:title">• ${typeof l === 'string' ? l : (l.title || l.name || '')}</span>
            ${l.value ? `<span class="skill-level" data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:value">${l.value}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const customHtml = otherCustomSections.map(cs => {
    if (!cs || !cs.items || !cs.items.length) return '';
    return `
      <div class="main-section">
        <h3 data-df-field="custom:${cs.id}:title">${cs.title || 'Additional Information'}</h3>
        <div class="section-divider"></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${cs.items.map((i, idx) => `
            <div style="font-size: 8.5pt;">
              <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${locationText ? `
          <div class="contact-row">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span data-df-field="location">${locationText}</span>
          </div>
        ` : ''}
        ${phoneText ? `
          <div class="contact-row">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span data-df-field="phone">${phoneText}</span>
          </div>
        ` : ''}
        ${emailText ? `
          <div class="contact-row">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <a href="mailto:${emailText}" style="color: inherit; text-decoration: none; word-break: break-all;" data-df-field="email">${emailText}</a>
          </div>
        ` : ''}
        ${linkedinText ? `
          <div class="contact-row">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            <a data-df-field="linkedin" href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a>
          </div>
        ` : ''}
        ${websiteText ? `
          <div class="contact-row">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <a data-df-field="website" href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a>
          </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${name ? `${name} - Resume` : 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: #ffffff;
      margin: 0;
      padding: 0;
      color: #1f2937;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .cv-page, #main-container {
      display: flex;
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
    }

    .cv-page:last-child, #main-container:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    
    /* Left Sidebar (30%) */
    .sidebar {
      width: 32%;
      background: #f0fdfa;
      border-right: 1.5px solid #ccfbf1;
      padding: ${30 + pageMargin}px 20px;
      font-size: 8.5pt;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .avatar-mask {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      border: 3px solid ${accent};
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      margin: 0 auto 4px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: #ffffff;
    }
    .avatar {
      width: 100%;
      height: 100%;
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
      letter-spacing: 1px;
      color: ${accent};
      margin-bottom: 4px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid #99f6e4;
      margin-bottom: 8px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 7px;
      color: #334155;
      font-size: 8.2pt;
    }
    .icon {
      width: 13px;
      height: 13px;
      color: ${accent};
      flex-shrink: 0;
    }
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      color: #334155;
      font-size: 8.3pt;
    }
    .skill-name {
      font-weight: 500;
    }
    .skill-level {
      font-size: 7.8pt;
      color: #64748b;
    }
    
    /* Main Content (68%) */
    .main-content {
      width: 68%;
      padding: ${32 + pageMargin}px 32px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .header-area {
      border-bottom: 2px solid ${accent};
      padding-bottom: 10px;
      margin-bottom: 2px;
    }
    .header-area h1 {
      font-size: 24pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .header-area .title {
      font-size: 10.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${accent};
      margin-top: 3px;
      margin-bottom: 6px;
    }
    .header-area .summary {
      font-size: 8.8pt;
      color: #4b5563;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .main-section {
      break-inside: auto;
    }
    .main-section h3 {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      margin-bottom: 3px;
    }
    .section-divider {
      border-bottom: 1.5px solid #ccfbf1;
      margin-bottom: 10px;
    }
    
    .exp-item, .edu-item {
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .exp-header, .edu-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .exp-role, .edu-degree {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .exp-at {
      color: #64748b;
      font-weight: 500;
    }
    .exp-date, .edu-date {
      font-size: 8.2pt;
      color: ${accent};
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .edu-school {
      font-size: 8.5pt;
      color: #4b5563;
      margin-top: 1px;
    }
    .exp-desc {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #4b5563;
      line-height: ${lineSpacing};
      margin-top: 2px;
    }
    .exp-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .proj-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .proj-item {
      break-inside: avoid;
    }
    .proj-title {
      font-weight: 700;
      font-size: 9pt;
      color: #0f172a;
    }
    .proj-desc {
      font-size: 8.5pt;
      color: #4b5563;
      margin-top: 1px;
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
<body>
<div class="cv-page" id="main-container">
  
  <div class="sidebar">
    ${photoSrc ? `
      <div class="avatar-mask">
        <img class="avatar" src="${photoSrc}" alt="${name || 'Profile Photo'}" />
      </div>
    ` : ''}
    ${contactHtml}
    ${skillsHtml}
    ${langHtml}
    ${certHtml}
  </div>
  
  <div class="main-content">
    <div class="header-area">
      <h1 data-df-field="name">${name}</h1>
      <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
      ${summaryText ? `<div class="summary" data-df-field="summary">${summaryText}</div>` : ''}
    </div>
    
    ${expHtml}
    ${eduHtml}
    ${projHtml}
    ${refHtml}
    ${customHtml}
  </div>

</div>
</body>
</html>`;
}