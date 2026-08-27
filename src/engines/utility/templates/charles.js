// ═══════════════════════════════════════════════════════════════════════════════
// 5. CHARLES — Modern Teal Header Band & Split Sidebar (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateCharlesHtml(
  data,
  themeColor = '#0b7a8a',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#0b7a8a' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <div class="main-section">
      <h3>Work Experience</h3>
      <div class="section-divider"></div>
      ${data.experience.map(e => `
        <div class="exp-item">
          <div class="exp-header">
            <span class="exp-role">${e.role} <span class="exp-at">at ${e.company}</span></span>
            <span class="exp-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
          </div>
          ${e.highlights && e.highlights.filter(Boolean).length ? `
            <ul class="exp-desc">
              ${e.highlights.filter(Boolean).map(h => `<li>${h}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="main-section">
      <h3>Education</h3>
      <div class="section-divider"></div>
      ${data.education.map(e => `
        <div class="edu-item">
          <div class="edu-header">
            <span class="edu-degree">${e.degree}</span>
            <span class="edu-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
          </div>
          <div class="edu-school">${e.school}${e.note ? ` · ${e.note}` : ''}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div class="main-section">
      <h3>Accomplishments & Projects</h3>
      <div class="section-divider"></div>
      <div class="proj-list">
        ${data.projects.map(p => `
          <div class="proj-item">
            <div class="proj-title">${p.name}${p.url ? ` <a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none; font-size: 8pt; font-weight: normal;">(${p.url})</a>` : ''}</div>
            ${p.description ? `<div class="proj-desc">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="main-section">
      <h3>Certifications</h3>
      <div class="section-divider"></div>
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
        ${data.location ? `
          <div class="contact-row">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${data.location}</span>
          </div>
        ` : ''}
        ${data.phone ? `
          <div class="contact-row">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>${data.phone}</span>
          </div>
        ` : ''}
        ${data.email ? `
          <div class="contact-row">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <a href="mailto:${data.email}" style="color: inherit; text-decoration: none; word-break: break-all;">${data.email}</a>
          </div>
        ` : ''}
        ${data.linkedin ? `
          <div class="contact-row">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            <a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a>
          </div>
        ` : ''}
        ${data.website ? `
          <div class="contact-row">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a>
          </div>
        ` : ''}
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
            <div class="skill-row">
              <span class="skill-name">${name}</span>
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
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
          <div class="skill-row">
            <span class="skill-name">${i.title}</span>
            ${i.value ? `<span class="skill-level">${i.value}</span>` : ''}
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: #ffffff;
      color: #1f2937;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    #main-container {
      display: flex;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
    }
    
    /* Left Sidebar (30%) */
    .sidebar {
      width: 30%;
      background: #f0fdfa;
      border-right: 1.5px solid #ccfbf1;
      padding: ${35 + pageMargin}px 20px;
      font-size: 8.5pt;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .avatar-container {
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
    }
    .avatar {
      width: 105px;
      height: 105px;
      border-radius: 50%;
      border: 3px solid ${accent};
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
    
    /* Main Content (70%) */
    .main-content {
      width: 70%;
      padding: ${40 + pageMargin}px 32px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .header-area {
      border-bottom: 2px solid ${accent};
      padding-bottom: 12px;
      margin-bottom: 4px;
    }
    .header-area h1 {
      font-size: 24pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
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
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      margin-bottom: 3px;
    }
    .section-divider {
      border-bottom: 1.5px solid #e2e8f0;
      margin-bottom: 10px;
    }
    
    .exp-item {
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .exp-role {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1f2937;
    }
    .exp-at {
      font-weight: 500;
      color: #4b5563;
    }
    .exp-date {
      font-size: 8.3pt;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .exp-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #374151;
      line-height: ${lineSpacing};
      margin-top: 3px;
    }
    .exp-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .edu-item {
      margin-bottom: 9px;
      break-inside: avoid;
    }
    .edu-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .edu-degree {
      font-size: 9.2pt;
      font-weight: 700;
      color: #1f2937;
    }
    .edu-date {
      font-size: 8.2pt;
      color: #64748b;
    }
    .edu-school {
      font-size: 8.5pt;
      color: #4b5563;
      margin-top: 1px;
    }
    
    .proj-item {
      margin-bottom: 8px;
      break-inside: avoid;
    }
    .proj-title {
      font-size: 9pt;
      font-weight: 700;
      color: #1f2937;
    }
    .proj-desc {
      font-size: 8.5pt;
      color: #4b5563;
      margin-top: 1px;
    }
    
    .cert-list {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #374151;
    }
    .cert-list li {
      margin-bottom: 3px;
    }
  </style>
</head>
<body>
  <div id="main-container">
    <div class="sidebar">
      ${data.photoUrl ? `
        <div class="avatar-container">
          <img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />
        </div>
      ` : ''}
      ${contactHtml}
      ${skillsHtml}
      ${langHtml}
    </div>
    
    <div class="main-content">
      <div class="header-area">
        <h1>${data.name || 'Candidate Name'}</h1>
        ${data.title ? `<div class="title">${data.title}</div>` : ''}
        ${data.summary ? `<div class="summary">${data.summary}</div>` : ''}
      </div>
      
      ${expHtml}
      ${eduHtml}
      ${projHtml}
      ${certHtml}
    </div>
  </div>
</body>
</html>`;
}