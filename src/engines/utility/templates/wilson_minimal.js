// ═══════════════════════════════════════════════════════════════════════════════
// 16. WILSON MINIMAL — Clean Monochrome Minimalist Layout (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateWilsonMinimalHtml(
  data,
  themeColor = '#1a1d20',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#1a1d20' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <section class="main-section">
      <h3 class="section-title">Experience</h3>
      <div class="divider-line"></div>
      <div class="entries-list">
        ${data.experience.map(e => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role">${e.company}</span>
              <span class="entry-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-sub">${e.role}${data.location ? ` · ${data.location}` : ''}</div>
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
    <div class="sidebar-section">
      <h3 class="section-title">Education</h3>
      <div class="divider-line"></div>
      <div class="edu-list">
        ${data.education.map(e => `
          <div class="edu-item">
            <div class="edu-degree">${e.degree}</div>
            <div class="edu-school">${e.school}</div>
            <div class="edu-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
            ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3 class="section-title">Expertise</h3>
      <div class="divider-line"></div>
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
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
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
            ${p.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="sidebar-section">
      <h3 class="section-title">Certifications</h3>
      <div class="divider-line"></div>
      <ul class="cert-list">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const contactHtml = `
    <div class="sidebar-section">
      <h3 class="section-title">Contact</h3>
      <div class="divider-line"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><a href="mailto:${data.email}" style="color: inherit; text-decoration: none; word-break: break-all;">${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-row"><span>${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row"><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.website ? `<div class="contact-row"><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
      </div>
    </div>
  `;

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
    
    #main-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      padding: ${40 + pageMargin}px 45px;
      display: flex;
      flex-direction: column;
    }
    
    /* Minimal Top Header */
    .header-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 20px;
      border-bottom: 2px solid ${accent};
      margin-bottom: 24px;
    }
    .header-left h1 {
      font-size: 26pt;
      font-weight: 900;
      color: ${accent};
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
    }
    .header-left .role {
      font-size: 10.5pt;
      font-weight: 600;
      color: #64748b;
      margin-top: 3px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 2px solid #e2e8f0;
      object-fit: cover;
    }
    
    /* Layout Columns */
    .content-columns {
      display: flex;
      gap: 36px;
      flex: 1;
    }
    .left-col {
      width: 65%;
      display: flex;
      flex-direction: column;
      gap: 20px;
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
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${accent};
      margin-bottom: 4px;
    }
    .divider-line {
      border-bottom: 1.5px solid #cbd5e1;
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
      color: ${accent};
      text-transform: uppercase;
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
      color: #334155;
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
  </style>
</head>
<body>
<div id="main-container">
  <div class="header-wrap">
    <div class="header-left">
      <h1>${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="role">${data.title}</div>` : ''}
    </div>
    ${data.photoUrl ? `<img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />` : ''}
  </div>
  
  <div class="content-columns">
    <div class="left-col">
      ${data.summary ? `
        <section class="main-section">
          <h3 class="section-title">Profile</h3>
          <div class="divider-line"></div>
          <div class="summary-text">${data.summary}</div>
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