// ═══════════════════════════════════════════════════════════════════════════════
// 9. WILSON LIGHT — Deep Sapphire Sidebar & Crisp Sans Typography (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateWilsonLightHtml(
  data,
  themeColor = '#1a365d',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#1a365d' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <section class="main-section">
      <h3 class="main-section-title">Experience</h3>
      <div class="main-divider"></div>
      ${data.experience.map(e => `
        <div class="exp-item">
          <div class="exp-header">
            <span class="exp-role">${e.role}</span>
            <span class="exp-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
          </div>
          <div class="exp-company">${e.company}${data.location ? ` · ${data.location}` : ''}</div>
          ${e.highlights && e.highlights.filter(Boolean).length ? `
            <ul class="exp-desc">
              ${e.highlights.filter(Boolean).map(h => `<li>${h}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3>Education</h3>
      <div class="sidebar-line"></div>
      ${data.education.map(e => `
        <div class="edu-item">
          <div class="edu-degree">${e.degree}</div>
          <div class="edu-school">${e.school}</div>
          <div class="edu-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
          ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

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
            <div class="skill-item">
              <span>• ${name}</span>
              ${levelText ? `<span style="color: rgba(255,255,255,0.6); font-size: 7.8pt;">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <h3 class="main-section-title">Projects</h3>
      <div class="main-divider"></div>
      ${data.projects.map(p => `
        <div class="proj-item">
          <div class="proj-header">
            <span class="proj-title">${p.name}</span>
            ${p.url ? `<span class="proj-url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
          </div>
          ${p.description ? `<div class="proj-desc">${p.description}</div>` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <section class="main-section">
      <h3 class="main-section-title">Certifications</h3>
      <div class="main-divider"></div>
      <ul class="cert-list">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </section>
  ` : '';

  const contactHtml = `
    <div class="sidebar-section">
      <h3>Contact</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-item"><span class="label">Phone</span><span class="val">${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-item"><span class="label">Email</span><span class="val"><a href="mailto:${data.email}" style="color: inherit; text-decoration: none;">${data.email}</a></span></div>` : ''}
        ${data.location ? `<div class="contact-item"><span class="label">Address</span><span class="val">${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-item"><span class="label">LinkedIn</span><span class="val"><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></span></div>` : ''}
        ${data.website ? `<div class="contact-item"><span class="label">Website</span><span class="val"><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></span></div>` : ''}
      </div>
    </div>
  `;

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <h3>${langSection.title || 'Language'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${langSection.items.map(i => `
          <div class="skill-item">
            <span>• ${i.title}</span>
            ${i.value ? `<span style="color: rgba(255,255,255,0.6); font-size: 7.8pt;">${i.value}</span>` : ''}
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: #ffffff;
      color: #334155;
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
    
    /* Left Sidebar (33%) */
    .sidebar {
      width: 33%;
      background: ${accent};
      color: #ffffff;
      padding: ${35 + pageMargin}px 20px;
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
      width: 110px;
      height: 110px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.4);
      object-fit: cover;
      display: block;
    }
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-section h3 {
      font-size: 10pt;
      font-weight: 700;
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
    }
    .contact-item .label {
      display: block;
      font-weight: 700;
      font-size: 7.5pt;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.85);
      letter-spacing: 0.5px;
    }
    .contact-item .val {
      font-size: 8.3pt;
      color: #ffffff;
      margin-top: 1px;
      word-break: break-all;
    }
    .edu-item {
      margin-bottom: 10px;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      font-size: 8.8pt;
      color: #ffffff;
    }
    .edu-school {
      font-size: 8pt;
      color: rgba(255, 255, 255, 0.8);
      margin-top: 1px;
    }
    .edu-date {
      font-size: 7.8pt;
      color: rgba(255, 255, 255, 0.65);
      margin-top: 1px;
    }
    .edu-note {
      font-size: 7.8pt;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 1px;
    }
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .skill-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 8.3pt;
      color: rgba(255, 255, 255, 0.9);
    }
    
    /* Main Content (67%) */
    .main-content {
      width: 67%;
      padding: ${40 + pageMargin}px 32px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .main-header {
      border-bottom: 2px solid ${accent};
      padding-bottom: 12px;
      margin-bottom: 4px;
    }
    .main-header h1 {
      font-size: 24pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .main-header .title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${accent};
      margin-top: 3px;
      margin-bottom: 6px;
    }
    .main-header .summary {
      font-size: 8.8pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    .main-section {
      break-inside: auto;
    }
    .main-section-title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      margin-bottom: 3px;
    }
    .main-divider {
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
      font-weight: 700;
      font-size: 9.5pt;
      color: #111827;
      text-transform: uppercase;
    }
    .exp-date {
      font-size: 8.3pt;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .exp-company {
      font-size: 8.8pt;
      color: #4b5563;
      font-style: italic;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .exp-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #334155;
      line-height: ${lineSpacing};
    }
    .exp-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    .proj-item {
      margin-bottom: 8px;
      break-inside: avoid;
    }
    .proj-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .proj-title {
      font-weight: 700;
      font-size: 9pt;
      color: #111827;
    }
    .proj-url {
      font-size: 8pt;
    }
    .proj-desc {
      font-size: 8.5pt;
      color: #4b5563;
      margin-top: 1px;
    }
    .cert-list {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #334155;
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
      ${eduHtml}
      ${skillsHtml}
      ${langHtml}
    </div>
    
    <div class="main-content">
      <div class="main-header">
        <h1>${data.name || 'Candidate Name'}</h1>
        ${data.title ? `<div class="title">${data.title}</div>` : ''}
        ${data.summary ? `<div class="summary">${data.summary}</div>` : ''}
      </div>
      
      ${expHtml}
      ${projHtml}
      ${certHtml}
    </div>
  </div>
</body>
</html>`;
}