// ═══════════════════════════════════════════════════════════════════════════════
// 15. ADORA DIAGONAL — Modern Cyan Geometric Diagonal Split (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateAdoraDiagonalHtml(
  data,
  themeColor = '#0284c7',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#0284c7' : themeColor;
  const secondaryAccent = '#0f172a';
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2>Experience</h2>
      </div>
      <div class="timeline-line-wrap">
        ${data.experience.map(e => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="timeline-role">${e.role}</span>
              <span class="timeline-year">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="timeline-company">${e.company}${data.location ? ` · ${data.location}` : ''}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="timeline-desc">
                ${e.highlights.filter(Boolean).map(h => `<li>${h}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2>Education</h2>
      </div>
      <div class="timeline-line-wrap">
        ${data.education.map(e => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="timeline-role">${e.degree}</span>
              <span class="timeline-year">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="timeline-company">${e.school}${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2>Projects</h2>
      </div>
      <div class="timeline-line-wrap">
        ${data.projects.map(p => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="timeline-role">${p.name}</span>
              ${p.url ? `<span class="timeline-year"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3>Certifications</h3>
      </div>
      <ul class="cert-list" style="margin-top: 8px;">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const contactHtml = `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3>Contact</h3>
      </div>
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
      <div class="sidebar-title-wrap">
        <h3>Skills</h3>
      </div>
      <div class="skills-grid" style="margin-top: 8px;">
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
              ${levelText ? `<span style="color: #64748b; font-size: 7.8pt;">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3>${langSection.title || 'Languages'}</h3>
      </div>
      <div class="skills-grid" style="margin-top: 8px;">
        ${langSection.items.map(i => `
          <div class="skill-item">
            <span>• ${i.title}</span>
            ${i.value ? `<span style="color: #64748b; font-size: 7.8pt;">${i.value}</span>` : ''}
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: #ffffff;
      color: #1e293b;
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
    
    /* Clean Geometric Header */
    .header-band {
      background: linear-gradient(135deg, ${secondaryAccent} 0%, ${accent} 100%);
      color: #ffffff;
      padding: ${35 + pageMargin}px 40px;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .avatar {
      width: 105px;
      height: 105px;
      border-radius: 50%;
      border: 3.5px solid #ffffff;
      object-fit: cover;
      flex-shrink: 0;
    }
    .header-text h1 {
      font-size: 26pt;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
    }
    .header-text .role {
      font-size: 10.5pt;
      font-weight: 600;
      color: #e0f2fe;
      margin-top: 4px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    
    /* Content Columns */
    .body-grid {
      display: flex;
      flex: 1;
    }
    .sidebar {
      width: 32%;
      background: #f1f5f9;
      color: #1e293b;
      padding: ${30 + pageMargin}px 22px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      border-right: 1.5px solid #e2e8f0;
    }
    .main-content {
      width: 68%;
      padding: ${35 + pageMargin}px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-title-wrap h3 {
      font-size: 9.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: ${accent};
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 4px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin-top: 8px;
    }
    .contact-row {
      font-size: 8.3pt;
      color: #475569;
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
      align-items: baseline;
      font-size: 8.3pt;
      color: #334155;
    }
    .cert-list {
      padding-left: 16px;
      font-size: 8.3pt;
      color: #475569;
    }
    .cert-list li {
      margin-bottom: 3px;
    }
    
    .timeline-group {
      break-inside: auto;
    }
    .section-title-wrap h2 {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .summary-text {
      font-size: 9pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    .timeline-line-wrap {
      border-left: 2px solid #e2e8f0;
      margin-left: 6px;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .timeline-item {
      position: relative;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .timeline-dot {
      position: absolute;
      left: -21px;
      top: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid ${accent};
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .timeline-role {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .timeline-year {
      font-size: 8.2pt;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .timeline-company {
      font-size: 8.8pt;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .timeline-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #475569;
      line-height: ${lineSpacing};
    }
    .timeline-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
  </style>
</head>
<body>
<div id="main-container">
  <div class="header-band">
    ${data.photoUrl ? `<img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />` : ''}
    <div class="header-text">
      <h1>${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="role">${data.title}</div>` : ''}
    </div>
  </div>
  
  <div class="body-grid">
    <div class="sidebar">
      ${contactHtml}
      ${skillsHtml}
      ${langHtml}
      ${certHtml}
    </div>
    
    <div class="main-content">
      ${data.summary ? `
        <div class="timeline-group">
          <div class="section-title-wrap">
            <h2>About Me</h2>
          </div>
          <div class="summary-text">${data.summary}</div>
        </div>
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