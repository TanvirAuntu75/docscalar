// ═══════════════════════════════════════════════════════════════════════════════
// VIENNA CREST — Centered Monogram Crest & Academic European Layout (Precision)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateViennaCrestHtml(
  data,
  themeColor = '#1e293b',
  themeFont = 'Merriweather',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#1e293b' : themeColor;
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : "'Merriweather', Georgia, serif";

  const getInitials = (name) => {
    if (!name) return 'VA';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const expHtml = data.experience && data.experience.length ? `
    <section class="cv-section">
      <h3 class="section-title">Professional Experience</h3>
      <div class="double-rule"></div>
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
      <h3 class="section-title">Education & Credentials</h3>
      <div class="double-rule"></div>
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
      <h3 class="section-title">Expertise & Competencies</h3>
      <div class="double-rule"></div>
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
              <span class="s-bullet">♦</span>
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
      <h3 class="section-title">Notable Publications & Projects</h3>
      <div class="double-rule"></div>
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
      <div class="double-rule"></div>
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
  <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Inter:wght@300;400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
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
      padding: ${35 + pageMargin}px 45px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    /* Centered Crest & Academic Header */
    .crest-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding-bottom: 12px;
      border-bottom: 2px solid ${accent};
    }
    .monogram-badge {
      width: 46px;
      height: 46px;
      border: 1.5px solid ${accent};
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 13pt;
      font-weight: 700;
      color: ${accent};
      margin-bottom: 8px;
      transform: rotate(45deg);
    }
    .monogram-badge span {
      transform: rotate(-45deg);
    }
    .avatar {
      width: 75px;
      height: 75px;
      border-radius: 50%;
      border: 2px solid ${accent};
      object-fit: cover;
      margin-bottom: 8px;
    }
    .crest-header h1 {
      font-size: 22pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.5px;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .crest-header .title {
      font-family: 'Inter', sans-serif;
      font-size: 9.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #64748b;
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
      color: #475569;
    }
    .c-sep {
      color: #94a3b8;
    }
    
    /* Academic Section Layouts */
    .cv-section {
      break-inside: auto;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${accent};
      margin-bottom: 4px;
    }
    .double-rule {
      border-top: 1.5px solid ${accent};
      border-bottom: 0.5px solid #cbd5e1;
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
      font-size: 9.2pt;
      color: #0f172a;
    }
    .entry-date {
      font-family: 'Inter', sans-serif;
      font-size: 8.2pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-size: 8.8pt;
      color: #475569;
      font-style: italic;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-desc {
      padding-left: 18px;
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
    .s-bullet {
      color: ${accent};
      font-size: 6pt;
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
  <div class="crest-header">
    ${data.photoUrl ? `<img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />` : `
      <div class="monogram-badge">
        <span>${getInitials(data.name)}</span>
      </div>
    `}
    <h1>${data.name || 'Candidate Name'}</h1>
    ${data.title ? `<div class="title">${data.title}</div>` : ''}
    ${contactHtml}
  </div>
  
  ${data.summary ? `
    <section class="cv-section">
      <h3 class="section-title">Academic & Professional Profile</h3>
      <div class="double-rule"></div>
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
