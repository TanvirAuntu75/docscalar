// ═══════════════════════════════════════════════════════════════════════════════
// 14. ZIV OLIVE — Warm Sage Header & Elegant Split Columns (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateZivOliveHtml(
  data,
  themeColor = '#8c9586',
  themeFont = 'Playfair Display',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#8c9586' : themeColor;
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : "'Playfair Display', Georgia, serif";

  const expHtml = data.experience && data.experience.length ? `
    <section class="main-section">
      <h3 class="section-title">Work Experience</h3>
      <div class="divider-line"></div>
      <div class="entries-list">
        ${data.experience.map(e => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role">${e.role}</span>
              <span class="entry-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-company">${e.company}${data.location ? ` · ${data.location}` : ''}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="entry-desc">
                ${e.highlights.filter(Boolean).map(h => `<li>${h}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <section class="main-section">
      <h3 class="section-title">Education</h3>
      <div class="divider-line"></div>
      <div class="entries-list">
        ${data.education.map(e => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role">${e.degree}</span>
              <span class="entry-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-company">${e.school}${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <h3 class="section-title">Projects</h3>
      <div class="divider-line"></div>
      <div class="entries-list">
        ${data.projects.map(p => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role">${p.name}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="proj-desc">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="sidebar-section">
      <h3>Certifications</h3>
      <div class="sidebar-line"></div>
      <ul class="cert-list">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const contactHtml = `
    <div class="sidebar-section">
      <h3>Contact</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><a href="mailto:${data.email}" style="color: inherit; text-decoration: none; word-break: break-all;">${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-row"><span>${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row"><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.website ? `<div class="contact-row"><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
      </div>
    </div>
  `;

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3>Skills</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${data.skills.map((s) => {
          let name = s;
          let levelText = '';
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <div class="skill-item">
              <span>• ${name}</span>
              ${levelText ? `<span style="color: rgba(255,255,255,0.6); font-size: 7.8pt;">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <h3>${langSection.title || 'Languages'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${langSection.items.map(i => `
          <div class="skill-item">
            <span>• ${i.title}</span>
            ${i.value ? `<span style="color: rgba(255,255,255,0.6); font-size: 7.8pt;">${i.value}</span>` : ''}
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
      font-family: 'Inter', sans-serif;
      background: #ffffff;
      color: #374151;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    #main-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }
    
    /* Top Split Header */
    .header-wrap {
      display: flex;
      background: #f4f3f0;
      border-bottom: 2px solid #e5e3dc;
    }
    .header-photo-box {
      width: 32%;
      background: ${accent};
      display: flex;
      align-items: center;
      justify-content: center;
      padding: ${20 + pageMargin}px;
    }
    .avatar {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.4);
      object-fit: cover;
    }
    .header-text-box {
      width: 68%;
      padding: ${25 + pageMargin}px 32px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .header-text-box h1 {
      font-family: ${fontFam};
      font-size: 24pt;
      font-weight: 700;
      color: #1f2937;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .header-text-box .title {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accent};
      margin-top: 4px;
    }
    
    /* Body Columns */
    .body-wrap {
      display: flex;
      flex: 1;
    }
    .sidebar {
      width: 32%;
      background: ${accent};
      color: #ffffff;
      padding: ${30 + pageMargin}px 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .main-content {
      width: 68%;
      padding: ${30 + pageMargin}px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
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
      margin-bottom: 4px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid rgba(255, 255, 255, 0.3);
      margin-bottom: 8px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 8.3pt;
    }
    .contact-row {
      word-break: break-all;
      color: rgba(255, 255, 255, 0.9);
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
      color: rgba(255, 255, 255, 0.9);
    }
    .cert-list {
      padding-left: 16px;
      font-size: 8.3pt;
      color: rgba(255, 255, 255, 0.9);
    }
    .cert-list li {
      margin-bottom: 3px;
    }
    
    .main-section {
      break-inside: auto;
    }
    .section-title {
      font-family: ${fontFam};
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1f2937;
      margin-bottom: 3px;
    }
    .divider-line {
      border-bottom: 1.5px solid #e5e7eb;
      margin-bottom: 10px;
    }
    .summary-text {
      font-size: 9pt;
      color: #4b5563;
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
      color: #1f2937;
    }
    .entry-date {
      font-size: 8.3pt;
      color: #6b7280;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-size: 8.8pt;
      color: #4b5563;
      font-style: italic;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .proj-desc {
      font-size: 8.5pt;
      color: #4b5563;
      margin-top: 2px;
    }
    .entry-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #4b5563;
      line-height: ${lineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
  </style>
</head>
<body>
<div id="main-container">
  <div class="header-wrap">
    <div class="header-photo-box">
      ${data.photoUrl ? `<img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />` : ''}
    </div>
    <div class="header-text-box">
      <h1>${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="title">${data.title}</div>` : ''}
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
      ${data.summary ? `
        <section class="main-section">
          <h3 class="section-title">About Me</h3>
          <div class="divider-line"></div>
          <div class="summary-text">${data.summary}</div>
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