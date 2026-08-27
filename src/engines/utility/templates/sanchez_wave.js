// ═══════════════════════════════════════════════════════════════════════════════
// 11. SANCHEZ WAVE — Executive Navy & Gold Arch Accent Header (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateSanchezWaveHtml(
  data,
  themeColor = '#1a365d',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#1a365d' : themeColor;
  const secondaryAccent = '#c29b38';
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <div class="section-container">
      <div class="pill-title-outline">EXPERIENCE</div>
      <div class="entries-wrapper">
        ${data.experience.map(e => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="company-name">${e.company}${data.location ? ` · ${data.location}` : ''}</span>
              <span class="date-badge">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="role-name">${e.role}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="highlights-list">
                ${e.highlights.filter(Boolean).map(h => `<li>${h}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="section-container">
      <div class="pill-title-outline">EDUCATION</div>
      <div class="entries-wrapper">
        ${data.education.map(e => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="company-name">${e.degree}</span>
              <span class="date-badge">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="role-name">${e.school}${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="section-container">
      <div class="pill-title-outline">SKILLS</div>
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
            <div class="skill-row">
              <span class="skill-name">• ${name}</span>
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div class="section-container">
      <div class="pill-title-outline">PROJECTS</div>
      <div class="entries-wrapper">
        ${data.projects.map(p => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="company-name">${p.name}</span>
              ${p.url ? `<span class="date-badge"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="entry-desc">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="section-container">
      <div class="pill-title-outline">CERTIFICATIONS</div>
      <ul class="highlights-list" style="margin-top: 8px;">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
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
      color: #334155;
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
    
    /* Elegant Header with Geometric Accent Arc */
    .header-band {
      position: relative;
      background: linear-gradient(135deg, ${accent} 0%, #0f172a 100%);
      color: #ffffff;
      padding: ${35 + pageMargin}px 40px;
      display: flex;
      align-items: center;
      gap: 24px;
      overflow: hidden;
      border-bottom: 4px solid ${secondaryAccent};
    }
    .avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid ${secondaryAccent};
      object-fit: cover;
      flex-shrink: 0;
    }
    .header-text {
      flex: 1;
      z-index: 2;
    }
    .header-text h1 {
      font-size: 24pt;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .header-text .title {
      font-size: 10.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${secondaryAccent};
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .contact-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      font-size: 8.3pt;
      color: #e2e8f0;
    }
    .contact-strip a {
      color: inherit;
      text-decoration: none;
    }
    
    /* Content Columns */
    .content-columns {
      display: flex;
      padding: ${30 + pageMargin}px 40px;
      flex: 1;
      gap: 36px;
    }
    .left-col {
      width: 60%;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .right-col {
      width: 40%;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    
    .section-container {
      break-inside: auto;
    }
    .pill-title-outline {
      display: inline-block;
      border: 1.5px solid ${accent};
      color: ${accent};
      font-size: 8.5pt;
      font-weight: 800;
      letter-spacing: 1.5px;
      padding: 3px 12px;
      border-radius: 20px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .summary-text {
      font-size: 9pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .entries-wrapper {
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
    .company-name {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .date-badge {
      font-size: 8.2pt;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .role-name {
      font-size: 8.8pt;
      font-weight: 600;
      color: ${accent};
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-desc {
      font-size: 8.5pt;
      color: #475569;
      margin-top: 2px;
    }
    .highlights-list {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #334155;
      line-height: ${lineSpacing};
    }
    .highlights-list li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 8.5pt;
      color: #334155;
    }
    .skill-name {
      font-weight: 500;
    }
    .skill-level {
      font-size: 8pt;
      color: #64748b;
    }
  </style>
</head>
<body>
<div id="main-container">
  <div class="header-band">
    ${data.photoUrl ? `<img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />` : ''}
    <div class="header-text">
      <h1>${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="title">${data.title}</div>` : ''}
      <div class="contact-strip">
        ${data.phone ? `<span>${data.phone}</span>` : ''}
        ${data.email ? `<span><a href="mailto:${data.email}">${data.email}</a></span>` : ''}
        ${data.location ? `<span>${data.location}</span>` : ''}
        ${data.linkedin ? `<span><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank">${data.linkedin.replace(/^https?:\/\//, '')}</a></span>` : ''}
      </div>
    </div>
  </div>
  
  <div class="content-columns">
    <div class="left-col">
      ${data.summary ? `
        <div class="section-container">
          <div class="pill-title-outline">ABOUT ME</div>
          <div class="summary-text">${data.summary}</div>
        </div>
      ` : ''}
      
      ${expHtml}
      ${projHtml}
    </div>
    
    <div class="right-col">
      ${eduHtml}
      ${skillsHtml}
      ${certHtml}
    </div>
  </div>
</div>
</body>
</html>`;
}