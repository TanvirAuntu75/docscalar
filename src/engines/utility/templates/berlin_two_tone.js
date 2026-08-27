// ═══════════════════════════════════════════════════════════════════════════════
// BERLIN TWO-TONE — Asymmetric Warm Tan / Beige Card Layout (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateBerlinTwoToneHtml(
  data,
  themeColor = '#d4a373',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#d4a373' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <section class="cv-section">
      <h3 class="section-heading">Work Experience</h3>
      <div class="divider"></div>
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
    <div class="card-section">
      <h4 class="card-heading">Education</h4>
      <div class="card-divider"></div>
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
    <section class="cv-section">
      <h3 class="section-heading">Skills & Competencies</h3>
      <div class="divider"></div>
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
    </section>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="cv-section">
      <h3 class="section-heading">Projects</h3>
      <div class="divider"></div>
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
      <h3 class="section-heading">Certifications</h3>
      <div class="divider"></div>
      <ul class="cert-list">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </section>
  ` : '';

  const contactHtml = `
    <div class="card-section">
      <h4 class="card-heading">Contact</h4>
      <div class="card-divider"></div>
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
      color: #2b2b2b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    #main-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      padding: ${35 + pageMargin}px 40px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    /* Top Header & Asymmetric Tan Box Grid */
    .top-grid {
      display: grid;
      grid-template-columns: 1fr 220px;
      gap: 24px;
      align-items: start;
    }
    .header-info h1 {
      font-size: 26pt;
      font-weight: 900;
      color: #1e1e1e;
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
    }
    .header-info .title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #8c6d48;
      margin-top: 4px;
      margin-bottom: 12px;
    }
    .header-info .summary {
      font-size: 9pt;
      color: #4a4a4a;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    /* Warm Tan Box on Right */
    .tan-card {
      background: #fbf7f0;
      border: 1.5px solid #ebdccb;
      border-radius: 8px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .card-heading {
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #8c6d48;
      margin-bottom: 2px;
    }
    .card-divider {
      border-bottom: 1.5px solid #ebdccb;
      margin-bottom: 8px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 8.3pt;
      color: #4a4a4a;
    }
    .contact-row {
      word-break: break-all;
    }
    .edu-item {
      margin-bottom: 8px;
      font-size: 8.3pt;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      color: #1e1e1e;
    }
    .edu-school {
      color: #6e6459;
      font-style: italic;
    }
    .edu-date {
      color: #8c8275;
      font-size: 7.8pt;
    }
    .edu-note {
      color: #8c8275;
      font-size: 7.8pt;
      margin-top: 1px;
    }
    
    /* Main Content Sections */
    .cv-section {
      break-inside: auto;
    }
    .section-heading {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #1e1e1e;
      margin-bottom: 3px;
    }
    .divider {
      border-bottom: 1.5px solid #e7dfd5;
      margin-bottom: 10px;
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
      color: #1e1e1e;
    }
    .entry-date {
      font-size: 8.3pt;
      color: #8c8275;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-size: 8.8pt;
      color: #6e6459;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #4a4a4a;
      line-height: ${lineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 10px;
    }
    .skill-pill {
      background: #fbf7f0;
      border: 1px solid #ebdccb;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 8.3pt;
      color: #2b2b2b;
      font-weight: 500;
    }
    .skill-lvl {
      color: #8c8275;
      font-size: 7.8pt;
    }
    .cert-list {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #4a4a4a;
    }
    .cert-list li {
      margin-bottom: 3px;
    }
  </style>
</head>
<body>
<div id="main-container">
  <div class="top-grid">
    <div class="header-info">
      <h1>${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="title">${data.title}</div>` : ''}
      ${data.summary ? `<div class="summary">${data.summary}</div>` : ''}
    </div>
    
    <div class="tan-card">
      ${contactHtml}
      ${eduHtml}
    </div>
  </div>
  
  ${expHtml}
  ${skillsHtml}
  ${projHtml}
  ${certHtml}
</div>
</body>
</html>`;
}
