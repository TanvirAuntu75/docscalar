// ═══════════════════════════════════════════════════════════════════════════════
// HELSINKI FROST — Frosted Ice & Royal Charcoal Nordic Executive Classic (Precision)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateHelsinkiFrostHtml(
  data,
  themeColor = '#0284c7',
  themeFont = 'Playfair Display',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#0284c7' : themeColor;
  const royalCharcoal = '#0f172a';
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : "'Playfair Display', Georgia, serif";

  const expHtml = data.experience && data.experience.length ? `
    <section class="cv-section">
      <h3 class="section-title">Professional Experience</h3>
      <div class="frost-rule"></div>
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
    <section class="cv-section">
      <h3 class="section-title">Education</h3>
      <div class="frost-rule"></div>
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

  const skillsHtml = data.skills && data.skills.length ? `
    <section class="cv-section">
      <h3 class="section-title">Core Competencies</h3>
      <div class="frost-rule"></div>
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
              <span class="frost-bullet">❄</span>
              <span class="s-name">${name}</span>
              ${levelText ? `<span class="s-level">(${levelText})</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </section>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="cv-section">
      <h3 class="section-title">Strategic Projects</h3>
      <div class="frost-rule"></div>
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
    <section class="cv-section">
      <h3 class="section-title">Certifications & Honors</h3>
      <div class="frost-rule"></div>
      <ul class="entry-desc" style="padding-left: 18px;">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </section>
  ` : '';

  const contactHtml = `
    <div class="contact-line">
      ${data.phone ? `<span>${data.phone}</span>` : ''}
      ${data.phone && data.email ? `<span class="c-sep">·</span>` : ''}
      ${data.email ? `<a href="mailto:${data.email}" style="color: inherit; text-decoration: none;">${data.email}</a>` : ''}
      ${data.email && data.location ? `<span class="c-sep">·</span>` : ''}
      ${data.location ? `<span>${data.location}</span>` : ''}
      ${data.location && data.linkedin ? `<span class="c-sep">·</span>` : ''}
      ${data.linkedin ? `<a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a>` : ''}
      ${data.linkedin && data.website ? `<span class="c-sep">·</span>` : ''}
      ${data.website ? `<a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a>` : ''}
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,500;1,600&family=Inter:wght@300;400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: #ffffff;
      color: ${royalCharcoal};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    #main-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      padding: ${35 + pageMargin}px 45px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    /* Centered Frost Header */
    .frost-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding-bottom: 12px;
      border-bottom: 2px solid ${accent};
    }
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 2.5px solid ${accent};
      object-fit: cover;
      margin-bottom: 8px;
    }
    .frost-header h1 {
      font-size: 24pt;
      font-weight: 700;
      color: ${royalCharcoal};
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .frost-header .title {
      font-family: 'Inter', sans-serif;
      font-size: 9.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accent};
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .contact-line {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 6px;
      font-family: 'Inter', sans-serif;
      font-size: 8.2pt;
      color: #64748b;
    }
    .c-sep {
      color: #cbd5e1;
    }
    
    /* Section Layouts */
    .cv-section {
      break-inside: auto;
    }
    .section-title {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${royalCharcoal};
      margin-bottom: 4px;
    }
    .frost-rule {
      border-top: 1.5px solid ${accent};
      border-bottom: 0.5px solid #e2e8f0;
      height: 2px;
      margin-bottom: 10px;
    }
    .summary-text {
      font-size: 9pt;
      color: #334155;
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
      color: ${royalCharcoal};
    }
    .entry-date {
      font-family: 'Inter', sans-serif;
      font-size: 8.2pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-family: 'Inter', sans-serif;
      font-size: 8.8pt;
      color: #475569;
      font-style: italic;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-desc {
      padding-left: 18px;
      font-family: 'Inter', sans-serif;
      font-size: 8.8pt;
      color: #334155;
      line-height: ${lineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px 12px;
      font-family: 'Inter', sans-serif;
    }
    .skill-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 8.2pt;
      color: #334155;
    }
    .frost-bullet {
      color: ${accent};
      font-size: 7pt;
    }
    .s-name {
      font-weight: 600;
    }
    .s-level {
      color: #64748b;
      font-size: 7.8pt;
    }
  </style>
</head>
<body>
<div id="main-container">
  <div class="frost-header">
    ${data.photoUrl ? `<img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />` : ''}
    <h1>${data.name || 'Candidate Name'}</h1>
    ${data.title ? `<div class="title">${data.title}</div>` : ''}
    ${contactHtml}
  </div>
  
  ${data.summary ? `
    <section class="cv-section">
      <h3 class="section-title">Executive Summary</h3>
      <div class="frost-rule"></div>
      <div class="summary-text">${data.summary}</div>
    </section>
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
