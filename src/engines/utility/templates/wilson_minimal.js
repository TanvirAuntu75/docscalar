// ═══════════════════════════════════════════════════════════════════════════════
// 16. WILSON MINIMAL — Clean Monochrome Minimalist Layout (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateWilsonMinimalHtml(
  data,
  themeColor = '#1a1d20',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const safeData = data || {};
  const accent = themeColor === 'default' || !themeColor ? '#1a1d20' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = safeData.experience && safeData.experience.length ? `
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h3>
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
    <div class="sidebar-section">
      <h3 class="section-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
      <div class="divider-line"></div>
      <div class="edu-list">
        ${safeData.education.map((e, idx) => `
          <div class="edu-item">
            <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
            <div class="edu-school" data-df-field="edu:${idx}:school">${e.school || ''}</div>
            <div class="edu-date" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
            ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const skillsHtml = safeData.skills && safeData.skills.length ? `
    <div class="sidebar-section">
      <h3 class="section-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Expertise'}</h3>
      <div class="divider-line"></div>
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
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
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
            ${p.description ? `<div data-df-field="proj:${idx}:description" style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = safeData.certifications && safeData.certifications.length ? `
    <div class="sidebar-section">
      <h3 class="section-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
      <div class="divider-line"></div>
      <ul class="cert-list">
        ${safeData.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const hasContact = safeData.phone || safeData.email || safeData.location || safeData.linkedin || safeData.website;
  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <h3 class="section-title section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      <div class="divider-line"></div>
      <div class="contact-list">
        ${safeData.phone ? `<div class="contact-row"><span data-df-field="phone">${safeData.phone}</span></div>` : ''}
        ${safeData.email ? `<div class="contact-row"><a href="mailto:${safeData.email}" style="color: inherit; text-decoration: none; word-break: break-all;" data-df-field="email">${safeData.email}</a></div>` : ''}
        ${safeData.location ? `<div class="contact-row"><span data-df-field="location">${safeData.location}</span></div>` : ''}
        ${safeData.linkedin ? `<div class="contact-row"><a data-df-field="linkedin" href="https://${safeData.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${safeData.website ? `<div class="contact-row"><a data-df-field="website" href="https://${safeData.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: #ffffff;
      color: #1a1d20;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .cv-page {
      width: 794px;
      min-height: 1123px;
      height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      padding: ${40 + pageMargin}px 45px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    
    /* Header Wrap */
    .header-wrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #1a1d20;
    }
    .header-left h1 {
      font-size: 26pt;
      font-weight: 800;
      color: #1a1d20;
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
    }
    .header-left .role {
      font-size: 10.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      margin-top: 4px;
    }
    .avatar-mask {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      border: 2px solid #1a1d20;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    
    /* Content Columns */
    .content-columns {
      display: flex;
      gap: 36px;
      flex: 1;
    }
    .left-col {
      width: 65%;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .right-col {
      width: 35%;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    
    .main-section, .sidebar-section {
      break-inside: auto;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1a1d20;
      margin-bottom: 3px;
    }
    .divider-line {
      border-bottom: 1.5px solid #1a1d20;
      margin-bottom: 10px;
    }
    .summary-text {
      font-size: 9pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
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
      color: #1a1d20;
    }
    .entry-date {
      font-size: 8.3pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-sub {
      font-size: 8.8pt;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #475569;
      line-height: ${lineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 8.3pt;
    }
    .contact-row {
      color: #475569;
      word-break: break-all;
    }
    
    .edu-item {
      margin-bottom: 10px;
      font-size: 8.3pt;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      color: #1a1d20;
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
    
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .skill-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 8.3pt;
      color: #475569;
    }
    .skill-level {
      font-size: 7.8pt;
      color: #64748b;
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
    <div class="header-left">
      <h1 data-df-field="name">${safeData.name || ''}</h1>
      <div class="candidate-title role" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${safeData.title || ''}</div>
    </div>
    ${safeData.photoUrl ? `
      <div class="avatar-mask">
        <img class="avatar" src="${safeData.photoUrl}" alt="Profile Photo" />
      </div>
    ` : ''}
  </div>
  
  <div class="content-columns">
    <div class="left-col">
      ${safeData.summary ? `
        <section class="main-section">
          <h3 class="section-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || data.sectionTitles?.profile || 'Profile'}</h3>
          <div class="divider-line"></div>
          <div class="summary-text" data-df-field="summary">${safeData.summary}</div>
        </section>
      ` : ''}
      
      ${expHtml}
      ${projHtml}
    </div>
    
    <div class="right-col">
      ${contactHtml}
      ${eduHtml}
      ${skillsHtml}
      ${certHtml}
    </div>
  </div>
</div>
</body>
</html>`;
}