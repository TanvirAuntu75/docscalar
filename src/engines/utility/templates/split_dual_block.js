// ═══════════════════════════════════════════════════════════════════════════════
// SPLIT DUAL BLOCK — Forest Green Sidebar & Floating Peach Nameplate Box (Precision)
// Matches Row 2 Col 1 in reference catalog
// ═══════════════════════════════════════════════════════════════════════════════

export function generateSplitDualBlockHtml(
  data,
  themeColor = '#3d6053',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#3d6053' : themeColor;
  const peachBoxBg = '#f4ebe1';
  const peachBorder = '#e6d7c8';
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  // Helper for 5-dot rating in white/sage
  const renderWhiteDots = (levelStr) => {
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
      <h3 class="section-title">Work Experience</h3>
      <div class="green-bar"></div>
      <div class="timeline-wrap">
        ${data.experience.map(e => `
          <div class="timeline-item">
            <div class="green-dot"></div>
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
    <div class="sidebar-block">
      <h3 class="sidebar-title">Expertise</h3>
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
              ${renderWhiteDots(levelText)}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <h3 class="section-title">Projects</h3>
      <div class="green-bar"></div>
      <div class="timeline-wrap">
        ${data.projects.map(p => `
          <div class="timeline-item">
            <div class="green-dot"></div>
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
      <h3 class="sidebar-title">Certifications</h3>
      <div class="sidebar-line"></div>
      <ul class="cert-list">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const contactHtml = `
    <div class="sidebar-block">
      <h3 class="sidebar-title">Contact</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><div class="c-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div><span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><div class="c-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div><a href="mailto:${data.email}" style="color: inherit; text-decoration: none; word-break: break-all;">${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-row"><div class="c-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><span>${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row"><div class="c-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></div><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.website ? `<div class="contact-row"><div class="c-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg></div><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
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
      display: flex;
    }
    
    /* Left Forest Green Sidebar (34%) */
    .sidebar {
      width: 34%;
      background: ${accent};
      color: #ffffff;
      padding: ${35 + pageMargin}px 22px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .avatar-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 6px;
    }
    .avatar {
      width: 105px;
      height: 105px;
      border-radius: 50%;
      border: 3.5px solid #ffffff;
      object-fit: cover;
    }
    .sidebar-block {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-title {
      font-size: 9.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid rgba(255, 255, 255, 0.25);
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 8.3pt;
      color: rgba(255, 255, 255, 0.9);
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 8px;
      word-break: break-all;
    }
    .c-badge {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ffffff;
      color: ${accent};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .c-badge svg {
      width: 11px;
      height: 11px;
    }
    .edu-item {
      margin-bottom: 10px;
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
      color: rgba(255, 255, 255, 0.65);
      font-size: 7.8pt;
    }
    .edu-note {
      color: rgba(255, 255, 255, 0.65);
      font-size: 7.8pt;
      margin-top: 1px;
    }
    
    /* 5-Dot White Ratings */
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.3pt;
      color: rgba(255, 255, 255, 0.95);
    }
    .rating-dots {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot.filled {
      background: #ffffff;
    }
    .dot.empty {
      background: rgba(255, 255, 255, 0.25);
    }
    .cert-list {
      padding-left: 16px;
      font-size: 8.3pt;
      color: rgba(255, 255, 255, 0.9);
    }
    .cert-list li {
      margin-bottom: 3px;
    }
    
    /* Right Main Content (66%) with Top-Right Peach Box */
    .main-content {
      width: 66%;
      padding: ${30 + pageMargin}px 30px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .peach-header-box {
      background: ${peachBoxBg};
      border: 1px solid ${peachBorder};
      border-radius: 8px;
      padding: 18px 24px;
      margin-bottom: 2px;
    }
    .peach-header-box h1 {
      font-size: 24pt;
      font-weight: 800;
      color: #27272a;
      letter-spacing: -0.5px;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .peach-header-box .title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accent};
      margin-top: 3px;
    }
    .summary-text {
      font-size: 9pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .main-section {
      break-inside: auto;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .green-bar {
      border-bottom: 2px solid ${accent};
      width: 35px;
      margin-bottom: 12px;
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
    .green-dot {
      position: absolute;
      left: -21px;
      top: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid ${accent};
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
    <div class="peach-header-box">
      <h1>${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="title">${data.title}</div>` : ''}
    </div>
    
    ${data.summary ? `
      <section class="main-section">
        <h3 class="section-title">Profile</h3>
        <div class="green-bar"></div>
        <div class="summary-text">${data.summary}</div>
      </section>
    ` : ''}
    
    ${expHtml}
    ${projHtml}
  </div>
</div>
</body>
</html>`;
}
