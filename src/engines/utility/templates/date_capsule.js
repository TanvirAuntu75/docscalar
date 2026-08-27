// ═══════════════════════════════════════════════════════════════════════════════
// DATE CAPSULE — Rounded Capsule Date Badges & Tech Timeline (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateDateCapsuleHtml(
  data,
  themeColor = '#2563eb',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#2563eb' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <section class="cv-section">
      <h3 class="section-title">Experience</h3>
      <div class="divider-line"></div>
      <div class="entries-list">
        ${data.experience.map(e => `
          <div class="capsule-entry">
            <div class="entry-header">
              <span class="role-title">${e.role}</span>
              <span class="date-capsule">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="company-sub">${e.company}${data.location ? ` · ${data.location}` : ''}</div>
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
      <div class="divider-line"></div>
      <div class="entries-list">
        ${data.education.map(e => `
          <div class="capsule-entry">
            <div class="entry-header">
              <span class="role-title">${e.degree}</span>
              <span class="date-capsule">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="company-sub">${e.school}${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <section class="cv-section">
      <h3 class="section-title">Technical Skills</h3>
      <div class="divider-line"></div>
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
            <div class="skill-tag">
              <span>${name}</span>
              ${levelText ? `<span class="skill-lvl">(${levelText})</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </section>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="cv-section">
      <h3 class="section-title">Projects</h3>
      <div class="divider-line"></div>
      <div class="entries-list">
        ${data.projects.map(p => `
          <div class="capsule-entry">
            <div class="entry-header">
              <span class="role-title">${p.name}</span>
              ${p.url ? `<span class="date-capsule"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <section class="cv-section">
      <h3 class="section-title">Certifications</h3>
      <div class="divider-line"></div>
      <ul class="entry-desc" style="padding-left: 16px;">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </section>
  ` : '';

  const contactHtml = `
    <div class="contact-pill-row">
      ${data.phone ? `<span class="c-pill">${data.phone}</span>` : ''}
      ${data.email ? `<span class="c-pill"><a href="mailto:${data.email}" style="color: inherit; text-decoration: none;">${data.email}</a></span>` : ''}
      ${data.location ? `<span class="c-pill">${data.location}</span>` : ''}
      ${data.linkedin ? `<span class="c-pill"><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">LinkedIn</a></span>` : ''}
      ${data.website ? `<span class="c-pill"><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">Portfolio</a></span>` : ''}
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
      padding: ${35 + pageMargin}px 40px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    /* Top Header */
    .header-block {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 4px;
    }
    .header-text h1 {
      font-size: 26pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
    }
    .header-text .title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accent};
      margin-top: 3px;
      margin-bottom: 8px;
    }
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 2px solid ${accent};
      object-fit: cover;
    }
    
    .contact-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 10px;
    }
    .c-pill {
      background: #f1f5f9;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 8.2pt;
      color: #475569;
    }
    
    .cv-section {
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
    .divider-line {
      border-bottom: 1.5px solid #e2e8f0;
      margin-bottom: 10px;
    }
    .summary-text {
      font-size: 9pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .entries-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .capsule-entry {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .role-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .date-capsule {
      background: #eff6ff;
      color: ${accent};
      border: 1px solid #bfdbfe;
      font-size: 8pt;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 12px;
      font-variant-numeric: tabular-nums;
    }
    .company-sub {
      font-size: 8.8pt;
      color: #475569;
      font-weight: 600;
      margin-top: 2px;
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
    
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 8px;
    }
    .skill-tag {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 8.3pt;
      color: #334155;
      font-weight: 500;
    }
    .skill-lvl {
      color: #64748b;
      font-size: 7.8pt;
      margin-left: 2px;
    }
  </style>
</head>
<body>
<div id="main-container">
  <div class="header-block">
    <div class="header-text">
      <h1>${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="title">${data.title}</div>` : ''}
      ${contactHtml}
    </div>
    ${data.photoUrl ? `<img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />` : ''}
  </div>
  
  ${data.summary ? `
    <section class="cv-section">
      <h3 class="section-title">Profile</h3>
      <div class="divider-line"></div>
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
