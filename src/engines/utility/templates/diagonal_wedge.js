// ═══════════════════════════════════════════════════════════════════════════════
// DIAGONAL WEDGE — Geometric Polygon Header & 5-Dot Skill Meters (Precision)
// Matches Row 1 Col 3 & Row 3 Col 2 in reference catalog
// ═══════════════════════════════════════════════════════════════════════════════

export function generateDiagonalWedgeHtml(
  data,
  themeColor = '#1e40af',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#1e40af' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  // Helper for 5-dot rating
  const renderDots = (levelStr) => {
    let score = 4;
    if (levelStr) {
      const lower = levelStr.toLowerCase();
      if (lower.includes('expert') || lower.includes('native') || lower.includes('fluent') || lower.includes('5')) score = 5;
      else if (lower.includes('adv') || lower.includes('senior') || lower.includes('4')) score = 4;
      else if (lower.includes('inter') || lower.includes('med') || lower.includes('3')) score = 3;
      else if (lower.includes('beg') || lower.includes('basic') || lower.includes('2') || lower.includes('1')) score = 2;
    }
    let dotsHtml = '<div class="rating-dots">';
    for (let i = 1; i <= 5; i++) {
      dotsHtml += `<span class="dot ${i <= score ? 'filled' : 'empty'}"></span>`;
    }
    dotsHtml += '</div>';
    return dotsHtml;
  };

  const expHtml = data.experience && data.experience.length ? `
    <section class="main-section">
      <div class="section-title-wrap">
        <h3 class="section-title">Work Experience</h3>
        <div class="title-line"></div>
      </div>
      <div class="timeline-wrap">
        ${data.experience.map(e => `
          <div class="timeline-item">
            <div class="wedge-dot"></div>
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
    <div class="sidebar-block">
      <div class="sidebar-title-wrap">
        <h3 class="sidebar-title">Education</h3>
        <div class="sidebar-line"></div>
      </div>
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
    <div class="sidebar-block">
      <div class="sidebar-title-wrap">
        <h3 class="sidebar-title">Skills & Expertise</h3>
        <div class="sidebar-line"></div>
      </div>
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
              <span class="skill-name">${name}</span>
              ${renderDots(levelText)}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <div class="section-title-wrap">
        <h3 class="section-title">Key Projects</h3>
        <div class="title-line"></div>
      </div>
      <div class="timeline-wrap">
        ${data.projects.map(p => `
          <div class="timeline-item">
            <div class="wedge-dot"></div>
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
    <div class="sidebar-block">
      <div class="sidebar-title-wrap">
        <h3 class="sidebar-title">Certifications</h3>
        <div class="sidebar-line"></div>
      </div>
      <ul class="cert-list">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const contactHtml = `
    <div class="sidebar-block">
      <div class="sidebar-title-wrap">
        <h3 class="sidebar-title">Contact</h3>
        <div class="sidebar-line"></div>
      </div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:${data.email}" style="color: inherit; text-decoration: none; word-break: break-all;">${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.website ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
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
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    #main-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    /* Diagonal Geometric Polygon Header */
    .diagonal-header-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 140px;
      background: ${accent};
      clip-path: polygon(0 0, 100% 0, 100% 70%, 0 100%);
      z-index: 1;
    }
    .diagonal-header-accent {
      position: absolute;
      top: 0;
      right: 0;
      width: 45%;
      height: 140px;
      background: rgba(255, 255, 255, 0.12);
      clip-path: polygon(30% 0, 100% 0, 100% 90%, 0 100%);
      z-index: 2;
    }
    .header-content {
      position: relative;
      z-index: 5;
      padding: ${25 + pageMargin}px 40px 10px 40px;
      display: flex;
      align-items: center;
      gap: 25px;
      min-height: 130px;
    }
    .avatar-wrapper {
      position: relative;
      flex-shrink: 0;
    }
    .avatar {
      width: 95px;
      height: 95px;
      border-radius: 50%;
      border: 4px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      object-fit: cover;
      background: #ffffff;
    }
    .header-text {
      color: #ffffff;
      flex: 1;
    }
    .header-text h1 {
      font-size: 26pt;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
      text-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .header-text .title {
      font-size: 10.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.9);
      margin-top: 4px;
    }
    
    /* Content Columns */
    .content-columns {
      display: flex;
      padding: 20px 36px ${32 + pageMargin}px 36px;
      flex: 1;
      gap: 36px;
      position: relative;
      z-index: 4;
    }
    .main-col {
      width: 63%;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .sidebar-col {
      width: 37%;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    
    .section-title-wrap, .sidebar-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .section-title, .sidebar-title {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      white-space: nowrap;
    }
    .title-line, .sidebar-line {
      flex: 1;
      height: 2px;
      background: #e2e8f0;
    }
    
    .summary-text {
      font-size: 9pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .timeline-wrap {
      border-left: 2px solid #e2e8f0;
      margin-left: 6px;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .timeline-item {
      position: relative;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .wedge-dot {
      position: absolute;
      left: -21px;
      top: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ffffff;
      border: 2.5px solid ${accent};
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .entry-role {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.3pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
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
    
    .sidebar-block {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 8.3pt;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 7px;
      color: #475569;
      word-break: break-all;
    }
    .c-icon {
      width: 12px;
      height: 12px;
      color: ${accent};
      flex-shrink: 0;
    }
    
    /* 5-Dot Skill Meters */
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.3pt;
      color: #334155;
    }
    .skill-name {
      font-weight: 600;
      flex: 1;
    }
    .rating-dots {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot.filled {
      background: ${accent};
    }
    .dot.empty {
      background: #e2e8f0;
    }
    
    .edu-item {
      margin-bottom: 10px;
      font-size: 8.3pt;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      color: #0f172a;
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
  <div class="diagonal-header-bg"></div>
  <div class="diagonal-header-accent"></div>
  
  <div class="header-content">
    ${data.photoUrl ? `
      <div class="avatar-wrapper">
        <img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />
      </div>
    ` : ''}
    <div class="header-text">
      <h1>${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="title">${data.title}</div>` : ''}
    </div>
  </div>
  
  <div class="content-columns">
    <div class="main-col">
      ${data.summary ? `
        <section class="main-section">
          <div class="section-title-wrap">
            <h3 class="section-title">Professional Summary</h3>
            <div class="title-line"></div>
          </div>
          <div class="summary-text">${data.summary}</div>
        </section>
      ` : ''}
      
      ${expHtml}
      ${projHtml}
    </div>
    
    <div class="sidebar-col">
      ${contactHtml}
      ${skillsHtml}
      ${eduHtml}
      ${certHtml}
    </div>
  </div>
</div>
</body>
</html>`;
}
