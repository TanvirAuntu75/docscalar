// ═══════════════════════════════════════════════════════════════════════════════
// CAMBRIDGE ROSE — Rose & Sage Duo-Tone Premium Split (Precision Engineered)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateCambridgeRoseHtml(
  data,
  themeColor = '#4a6b63',
  themeFont = 'Playfair Display',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#4a6b63' : themeColor;
  const roseAccent = '#e8d5cc';
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
    <div class="sidebar-section">
      <h3 class="sidebar-title">Education</h3>
      <div class="sidebar-line"></div>
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
      <h3 class="sidebar-title">Skills & Expertise</h3>
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
            <div class="skill-pill">
              <span>${name}</span>
              ${levelText ? `<span class="skill-lvl">· ${levelText}</span>` : ''}
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
            ${p.description ? `<div class="proj-desc">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="sidebar-section">
      <h3 class="sidebar-title">Certifications</h3>
      <div class="sidebar-line"></div>
      <ul class="cert-list">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const contactHtml = `
    <div class="sidebar-section">
      <h3 class="sidebar-title">Contact</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:${data.email}" style="color: inherit; text-decoration: none; word-break: break-all;">${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.website ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
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
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: #ffffff;
      color: #2b2b2b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    #main-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
    }
    
    /* Left Muted Sage Column (32%) */
    .sidebar {
      width: 32%;
      background: ${accent};
      color: #ffffff;
      padding: ${35 + pageMargin}px 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .avatar-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 4px;
    }
    .avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.4);
      object-fit: cover;
    }
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-title {
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid rgba(255, 255, 255, 0.3);
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-family: 'Inter', sans-serif;
      font-size: 8.3pt;
      color: rgba(255, 255, 255, 0.9);
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 7px;
      word-break: break-all;
    }
    .c-icon {
      width: 12px;
      height: 12px;
      color: ${roseAccent};
      flex-shrink: 0;
    }
    .edu-item {
      margin-bottom: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 8.3pt;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      color: #ffffff;
    }
    .edu-school {
      color: rgba(255, 255, 255, 0.85);
      font-style: italic;
    }
    .edu-date {
      color: rgba(255, 255, 255, 0.7);
      font-size: 7.8pt;
    }
    .edu-note {
      color: rgba(255, 255, 255, 0.7);
      font-size: 7.8pt;
      margin-top: 1px;
    }
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-family: 'Inter', sans-serif;
    }
    .skill-pill {
      background: rgba(255, 255, 255, 0.15);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 8pt;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
    }
    .skill-lvl {
      color: rgba(255, 255, 255, 0.7);
      font-size: 7.5pt;
    }
    .cert-list {
      padding-left: 16px;
      font-family: 'Inter', sans-serif;
      font-size: 8.3pt;
      color: rgba(255, 255, 255, 0.9);
    }
    .cert-list li {
      margin-bottom: 3px;
    }
    
    /* Right Column (68%) */
    .main-content {
      width: 68%;
      display: flex;
      flex-direction: column;
    }
    
    /* Warm Rose Header Banner */
    .rose-header {
      background: ${roseAccent};
      padding: ${35 + pageMargin}px 32px;
      border-bottom: 2px solid #dfc7bc;
    }
    .rose-header h1 {
      font-size: 26pt;
      font-weight: 700;
      color: #2b2b2b;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .rose-header .title {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accent};
      margin-top: 4px;
    }
    
    /* Main Body Area */
    .main-body {
      padding: ${30 + pageMargin}px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
    }
    .main-section {
      break-inside: auto;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #2b2b2b;
      margin-bottom: 3px;
    }
    .divider-line {
      border-bottom: 1.5px solid #e5e7eb;
      margin-bottom: 10px;
    }
    .summary-text {
      font-family: 'Inter', sans-serif;
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
      font-family: 'Inter', sans-serif;
      font-size: 8.3pt;
      color: #6b7280;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-family: 'Inter', sans-serif;
      font-size: 8.8pt;
      color: #4b5563;
      font-style: italic;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .proj-desc {
      font-family: 'Inter', sans-serif;
      font-size: 8.5pt;
      color: #4b5563;
      margin-top: 2px;
    }
    .entry-desc {
      padding-left: 16px;
      font-family: 'Inter', sans-serif;
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
  <div class="sidebar">
    ${data.photoUrl ? `
      <div class="avatar-wrap">
        <img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />
      </div>
    ` : ''}
    ${contactHtml}
    ${skillsHtml}
    ${eduHtml}
    ${certHtml}
  </div>
  
  <div class="main-content">
    <div class="rose-header">
      <h1>${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="title">${data.title}</div>` : ''}
    </div>
    
    <div class="main-body">
      ${data.summary ? `
        <section class="main-section">
          <h3 class="section-title">About Me</h3>
          <div class="divider-line"></div>
          <div class="summary-text">${data.summary}</div>
        </section>
      ` : ''}
      
      ${expHtml}
      ${projHtml}
    </div>
  </div>
</div>
</body>
</html>`;
}
