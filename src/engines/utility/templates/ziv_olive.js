// ═══════════════════════════════════════════════════════════════════════════════
// 14. ZIV OLIVE — Warm Sage Header & Elegant Split Columns (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateZivOliveHtml(
  data,
  themeColor = '#8c9586',
  themeFont = 'Playfair Display',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const safeData = data || {};
  const accent = themeColor === 'default' || !themeColor ? '#8c9586' : themeColor;
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : "'Playfair Display', Georgia, serif";

  const expHtml = safeData.experience && safeData.experience.length ? `
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Work Experience'}</h3>
      <div class="divider-line"></div>
      <div class="entries-list">
        ${safeData.experience.map((e, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="exp:${idx}:role">${e.role || ''}</span>
              <span class="entry-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></span>${safeData.location ? ` · <span data-df-field="location">${safeData.location}</span>` : ''}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="entry-desc">
                ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const eduHtml = safeData.education && safeData.education.length ? `
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
      <div class="divider-line"></div>
      <div class="entries-list">
        ${safeData.education.map((e, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="edu:${idx}:degree">${e.degree || ''}</span>
              <span class="entry-date" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-company"><span data-df-field="edu:${idx}:school">${e.school || ''}</span>${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const projHtml = safeData.projects && safeData.projects.length ? `
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h3>
      <div class="divider-line"></div>
      <div class="entries-list">
        ${safeData.projects.map((p, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="proj-desc" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = safeData.certifications && safeData.certifications.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
      <div class="sidebar-line"></div>
      <ul class="cert-list">
        ${safeData.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const hasContact = safeData.phone || safeData.email || safeData.location || safeData.linkedin || safeData.website;
  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${safeData.phone ? `<div class="contact-row"><span data-df-field="phone">${safeData.phone}</span></div>` : ''}
        ${safeData.email ? `<div class="contact-row"><a href="mailto:${safeData.email}" style="color: inherit; text-decoration: none; word-break: break-all;" data-df-field="email">${safeData.email}</a></div>` : ''}
        ${safeData.location ? `<div class="contact-row"><span data-df-field="location">${safeData.location}</span></div>` : ''}
        ${safeData.linkedin ? `<div class="contact-row"><a data-df-field="linkedin" href="https://${safeData.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${safeData.website ? `<div class="contact-row"><a data-df-field="website" href="https://${safeData.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
      </div>
    </div>
  ` : '';

  const skillsHtml = safeData.skills && safeData.skills.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${safeData.skills.map((s, idx) => {
          let name = typeof s === 'string' ? s : s.name || '';
          let levelText = '';
          if (typeof s === 'string' && s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <div class="skill-item">
              <span data-df-field="skill:${idx}">• ${name}</span>
              ${levelText ? `<span style="color: rgba(255,255,255,0.6); font-size: 7.8pt;">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const langSection = (safeData.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <h3 data-df-field="custom:${langSection.id}:title">${langSection.title || 'Languages'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${langSection.items.map((i, idx) => `
          <div class="skill-item">
            <span data-df-field="custom:${langSection.id}:${idx}:title">• ${i.title || ''}</span>
            ${typeof i === 'object' && i !== null && i.value ? `<span data-df-field="custom:${langSection.id}:${idx}:value" style="color: rgba(255,255,255,0.6); font-size: 7.8pt;">${i.value}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: #ffffff;
      color: #333333;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .cv-page {
      width: 794px;
      min-height: 1123px;
      height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    
    /* Sage Header Wrap */
    .header-wrap {
      background: ${accent};
      color: #ffffff;
      padding: ${30 + pageMargin}px 40px;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .header-photo-box {
      flex-shrink: 0;
    }
    .avatar-mask {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .header-text-box h1 {
      font-size: 28pt;
      font-weight: 700;
      letter-spacing: -0.5px;
      line-height: 1.05;
    }
    .header-text-box .title {
      font-size: 11pt;
      font-style: italic;
      letter-spacing: 1px;
      color: rgba(255, 255, 255, 0.9);
      margin-top: 4px;
    }
    
    /* Body Wrap */
    .body-wrap {
      display: flex;
      flex: 1;
    }
    
    /* Sidebar (32%) */
    .sidebar {
      width: 32%;
      background: #f4f5f3;
      padding: ${30 + pageMargin}px 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      border-right: 1px solid #e5e7eb;
    }
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-section h3 {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #2b2b2b;
      margin-bottom: 4px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid ${accent};
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 8.3pt;
      font-family: 'Inter', sans-serif;
    }
    .contact-row {
      color: #4b5563;
      word-break: break-all;
    }
    
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-family: 'Inter', sans-serif;
    }
    .skill-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 8.3pt;
      color: #4b5563;
    }
    
    .cert-list {
      padding-left: 16px;
      font-size: 8.3pt;
      color: #4b5563;
      font-family: 'Inter', sans-serif;
    }
    .cert-list li {
      margin-bottom: 3px;
    }
    
    /* Main Content (68%) */
    .main-content {
      width: 68%;
      padding: ${30 + pageMargin}px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .main-section {
      break-inside: auto;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #2b2b2b;
      margin-bottom: 3px;
    }
    .divider-line {
      border-bottom: 1.5px solid ${accent};
      margin-bottom: 10px;
    }
    .summary-text {
      font-size: 9pt;
      color: #4b5563;
      line-height: ${lineSpacing};
      text-align: justify;
      font-family: 'Inter', sans-serif;
    }
    
    .entries-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .entry-item {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .entry-role {
      font-weight: 700;
      font-size: 9.5pt;
      color: #2b2b2b;
    }
    .entry-date {
      font-size: 8.3pt;
      color: #6b7280;
      font-style: italic;
      font-variant-numeric: tabular-nums;
      font-family: 'Inter', sans-serif;
    }
    .entry-company {
      font-size: 8.8pt;
      color: #4b5563;
      font-style: italic;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #4b5563;
      line-height: ${lineSpacing};
      font-family: 'Inter', sans-serif;
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    .proj-desc {
      font-size: 8.5pt;
      color: #4b5563;
      margin-top: 2px;
      font-family: 'Inter', sans-serif;
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
  <div class="header-wrap">
    ${safeData.photoUrl ? `
    <div class="header-photo-box">
      <div class="avatar-mask">
        <img class="avatar" src="${safeData.photoUrl}" alt="Profile Photo" />
      </div>
    </div>
    ` : ''}
    <div class="header-text-box">
      <h1 data-df-field="name">${safeData.name || ''}</h1>
      <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${safeData.title || ''}</div>
    </div>
  </div>
  
  <div class="body-wrap">
    <div class="sidebar">
      ${contactHtml}
      ${skillsHtml}
      ${langHtml}
      ${certHtml}
    </div>
    
    <div class="main-content">
      ${safeData.summary ? `
        <section class="main-section">
          <h3 class="section-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'About Me'}</h3>
          <div class="divider-line"></div>
          <div class="summary-text" data-df-field="summary">${safeData.summary}</div>
        </section>
      ` : ''}
      
      ${expHtml}
      ${eduHtml}
      ${projHtml}
    </div>
  </div>
</div>
</body>
</html>`;
}