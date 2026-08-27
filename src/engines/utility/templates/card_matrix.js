// ═══════════════════════════════════════════════════════════════════════════════
// CARD MATRIX — Structured Boxed Cards & Modern Tech Layout (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateCardMatrixHtml(
  data,
  themeColor = '#4f46e5',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#4f46e5' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag">Experience</div>
      </div>
      <div class="card-body">
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
    </div>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag">Education</div>
      </div>
      <div class="card-body">
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
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag">Skills & Tooling</div>
      </div>
      <div class="card-body">
        <div class="skills-flex">
          ${data.skills.map((s) => {
            let name = s;
            let levelText = '';
            if (s.includes(' - ')) {
              const parts = s.split(' - ');
              name = parts[0];
              levelText = parts[1];
            }
            return `
              <div class="matrix-skill-chip">
                <span>${name}</span>
                ${levelText ? `<span class="chip-lvl">${levelText}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag">Key Projects</div>
      </div>
      <div class="card-body">
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
    </div>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag">Certifications</div>
      </div>
      <div class="card-body">
        <ul class="entry-desc" style="padding-left: 16px;">
          ${data.certifications.map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>
    </div>
  ` : '';

  const contactHtml = `
    <div class="contact-strip">
      ${data.phone ? `<div class="c-item"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>${data.phone}</span></div>` : ''}
      ${data.email ? `<div class="c-item"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:${data.email}" style="color: inherit; text-decoration: none;">${data.email}</a></div>` : ''}
      ${data.location ? `<div class="c-item"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${data.location}</span></div>` : ''}
      ${data.linkedin ? `<div class="c-item"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
      ${data.website ? `<div class="c-item"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
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
      background: #f8fafc;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    #main-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #f8fafc;
      padding: ${35 + pageMargin}px 36px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    
    /* Top Header Card */
    .top-header-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px 22px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .avatar {
      width: 75px;
      height: 75px;
      border-radius: 8px;
      border: 2px solid ${accent};
      object-fit: cover;
      flex-shrink: 0;
    }
    .header-main {
      flex: 1;
    }
    .header-main h1 {
      font-size: 22pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .header-main .title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${accent};
      margin-top: 2px;
      margin-bottom: 6px;
    }
    .contact-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      font-size: 8.2pt;
      color: #64748b;
    }
    .c-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .c-icon {
      width: 12px;
      height: 12px;
      color: ${accent};
    }
    
    /* Content Cards */
    .content-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      break-inside: auto;
    }
    .card-header-bar {
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      padding: 6px 18px;
    }
    .card-tag {
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
    }
    .card-body {
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .summary-text {
      font-size: 8.8pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
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
      font-size: 9.2pt;
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.2pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-size: 8.5pt;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .proj-desc {
      font-size: 8.5pt;
      color: #475569;
      margin-top: 1px;
    }
    .entry-desc {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #475569;
      line-height: ${lineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .skills-flex {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 8px;
    }
    .matrix-skill-chip {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 3px 9px;
      border-radius: 4px;
      font-size: 8.2pt;
      color: #334155;
      font-weight: 500;
    }
    .chip-lvl {
      color: #64748b;
      font-size: 7.8pt;
      margin-left: 3px;
    }
  </style>
</head>
<body>
<div id="main-container">
  <div class="top-header-card">
    ${data.photoUrl ? `<img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />` : ''}
    <div class="header-main">
      <h1>${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="title">${data.title}</div>` : ''}
      ${contactHtml}
    </div>
  </div>
  
  ${data.summary ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag">Profile Summary</div>
      </div>
      <div class="card-body">
        <div class="summary-text">${data.summary}</div>
      </div>
    </div>
  ` : ''}
  
  ${expHtml}
  ${eduHtml}
  ${skillsHtml}
  ${projHtml}
  ${certHtml}
</div>
</body>
</html>`;
}
