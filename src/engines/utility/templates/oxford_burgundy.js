// ═══════════════════════════════════════════════════════════════════════════════
// OXFORD BURGUNDY — Prestigious British Academic Centered Header (Precision)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateOxfordBurgundyHtml(
  data,
  themeColor = '#831843',
  themeFont = 'Playfair Display',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#831843' : themeColor;
  const goldAccent = '#d97706';
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : "'Playfair Display', Georgia, serif";

  const getInitials = (name) => {
    if (!name) return 'OX';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const expHtml = data.experience && data.experience.length ? `
    <section class="cv-section">
      <div class="pill-header">
        <span class="pill-title">Academic & Professional Appointments</span>
      </div>
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
      <div class="pill-header">
        <span class="pill-title">Education & Qualifications</span>
      </div>
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
      <div class="pill-header">
        <span class="pill-title">Areas of Expertise</span>
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
            <div class="skill-item">
              <span class="s-bullet">§</span>
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
      <div class="pill-header">
        <span class="pill-title">Funded Research & Publications</span>
      </div>
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
      <div class="pill-header">
        <span class="pill-title">Fellowships & Honors</span>
      </div>
      <ul class="entry-desc" style="padding-left: 18px;">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </section>
  ` : '';

  const contactHtml = `
    <div class="contact-line">
      ${data.phone ? `<span>${data.phone}</span>` : ''}
      ${data.phone && data.email ? `<span class="c-sep">|</span>` : ''}
      ${data.email ? `<a href="mailto:${data.email}" style="color: inherit; text-decoration: none;">${data.email}</a>` : ''}
      ${data.email && data.location ? `<span class="c-sep">|</span>` : ''}
      ${data.location ? `<span>${data.location}</span>` : ''}
      ${data.location && data.linkedin ? `<span class="c-sep">|</span>` : ''}
      ${data.linkedin ? `<a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a>` : ''}
      ${data.linkedin && data.website ? `<span class="c-sep">|</span>` : ''}
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
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
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
    
    /* Centered Oxford Header */
    .oxford-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding-bottom: 12px;
      border-bottom: 2px solid ${accent};
    }
    .crest-shield {
      width: 44px;
      height: 44px;
      border: 2px solid ${accent};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13pt;
      font-weight: 700;
      color: ${accent};
      margin-bottom: 8px;
    }
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 3px solid ${accent};
      object-fit: cover;
      margin-bottom: 8px;
    }
    .oxford-header h1 {
      font-size: 24pt;
      font-weight: 700;
      color: ${accent};
      letter-spacing: 0.5px;
      line-height: 1.1;
    }
    .oxford-header .title {
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
      gap: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 8.2pt;
      color: #475569;
    }
    .c-sep {
      color: #cbd5e1;
    }
    
    /* Academic Section Layouts */
    .cv-section {
      break-inside: auto;
    }
    .pill-header {
      position: relative;
      text-align: center;
      margin-bottom: 12px;
    }
    .pill-header::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      width: 100%;
      height: 1px;
      background: #e2e8f0;
      z-index: 1;
    }
    .pill-title {
      position: relative;
      z-index: 2;
      background: #ffffff;
      padding: 0 16px;
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: ${accent};
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
      font-size: 8pt;
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
  <div class="oxford-header">
    ${data.photoUrl ? `<img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />` : `
      <div class="crest-shield">
        <span>${getInitials(data.name)}</span>
      </div>
    `}
    <h1>${data.name || 'Candidate Name'}</h1>
    ${data.title ? `<div class="title">${data.title}</div>` : ''}
    ${contactHtml}
  </div>
  
  ${data.summary ? `
    <section class="cv-section">
      <div class="pill-header">
        <span class="pill-title">Summary & Statement</span>
      </div>
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
