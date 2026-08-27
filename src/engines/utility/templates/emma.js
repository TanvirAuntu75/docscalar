// ═══════════════════════════════════════════════════════════════════════════════
// 4. EMMA — Warm Balanced Top Banner & Two-Column Split (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateEmmaHtml(
  data,
  themeColor = '#3c3530',
  themeFont = 'Playfair Display',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accentColor = themeColor === 'default' || !themeColor ? '#3c3530' : themeColor;
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : "'Playfair Display', Georgia, serif";

  const expHtml = data.experience && data.experience.length ? data.experience.map(e => `
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
    </div>`).join('') : '';

  const projHtml = data.projects && data.projects.length ? `
    <div class="section-block">
      <h3>Projects</h3>
      <div class="proj-list">
        ${data.projects.map(p => `
          <div class="proj-item">
            <div class="proj-header">
              <span class="proj-title">${p.name}</span>
              ${p.url ? `<span class="proj-url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accentColor}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="proj-desc">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="section-block">
      <h3>Education</h3>
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
    <div class="section-block">
      <h3>Key Skills</h3>
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
              <span class="skill-name">• ${name}</span>
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="section-block">
      <h3>Certifications</h3>
      <ul class="cert-list">
        ${data.certifications.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="section-block">
      <h3>${langSection.title || 'Languages'}</h3>
      <div class="skills-grid">
        ${langSection.items.map(i => `
          <div class="skill-row">
            <span class="skill-name">• ${i.title}</span>
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
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Inter', sans-serif;
      background: #ffffff;
      color: #334155;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    #main-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }
    
    /* Top Band Header */
    .top-band {
      background: #f8f5f0;
      padding: ${35 + pageMargin}px 30px;
      text-align: center;
      border-bottom: 1.5px solid #e8e2d9;
    }
    .top-band h1 {
      font-family: ${fontFam};
      font-size: 26pt;
      font-weight: 700;
      color: ${accentColor};
      letter-spacing: 0.5px;
      line-height: 1.1;
    }
    .top-band .title-sub {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #6e6459;
      margin-top: 4px;
    }
    .top-band .line-accent {
      width: 40px;
      height: 2px;
      background: ${accentColor};
      margin: 10px auto 0 auto;
    }
    
    /* Split columns layout below header */
    .split-columns {
      display: flex;
      padding: ${32 + pageMargin}px 40px;
      flex: 1;
      gap: 36px;
    }
    
    .left-col {
      width: 60%;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .right-col {
      width: 40%;
      border-left: 1.5px solid #f0eae1;
      padding-left: 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    
    .section-block {
      break-inside: auto;
    }
    .section-block h3 {
      font-family: 'Inter', sans-serif;
      font-size: 9.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${accentColor};
      border-bottom: 1px solid #e8e2d9;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    
    .summary-text {
      font-size: 9pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .exp-item {
      margin-bottom: 14px;
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
      color: #1e293b;
    }
    .exp-date {
      font-size: 8.3pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .exp-company {
      font-size: 8.8pt;
      color: #64748b;
      font-style: italic;
      margin-top: 1px;
      margin-bottom: 4px;
    }
    .exp-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #475569;
      line-height: ${lineSpacing};
    }
    .exp-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    /* Right column styles */
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 8.5pt;
    }
    .contact-item {
      display: flex;
      flex-direction: column;
    }
    .contact-item .label {
      font-weight: 700;
      color: #3c3530;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .contact-item .val {
      margin-top: 1px;
      color: #475569;
      word-break: break-all;
    }
    
    .edu-item {
      margin-bottom: 10px;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      font-size: 8.8pt;
      color: #1e293b;
    }
    .edu-school {
      font-size: 8.2pt;
      color: #475569;
      font-style: italic;
    }
    .edu-date {
      font-size: 7.8pt;
      color: #64748b;
    }
    .edu-note {
      font-size: 7.8pt;
      color: #64748b;
      margin-top: 1px;
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
      font-size: 8.5pt;
    }
    .skill-name {
      font-weight: 500;
      color: #334155;
    }
    .skill-level {
      font-size: 8pt;
      color: #64748b;
    }
    
    .cert-list {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #475569;
    }
    .cert-list li {
      margin-bottom: 3px;
    }
    
    .proj-item {
      margin-bottom: 10px;
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
      color: #1e293b;
    }
    .proj-url {
      font-size: 8pt;
    }
    .proj-desc {
      font-size: 8.3pt;
      color: #475569;
      margin-top: 1px;
    }
  </style>
</head>
<body>
<div id="main-container">
  <div class="top-band">
    <h1>${data.name || 'Candidate Name'}</h1>
    ${data.title ? `<div class="title-sub">${data.title}</div>` : ''}
    <div class="line-accent"></div>
  </div>
  
  <div class="split-columns">
    <div class="left-col">
      ${data.summary ? `
        <div class="section-block">
          <h3>Professional Summary</h3>
          <div class="summary-text">${data.summary}</div>
        </div>
      ` : ''}
      
      ${expHtml ? `
        <div class="section-block">
          <h3>Work Experience</h3>
          <div>${expHtml}</div>
        </div>
      ` : ''}

      ${projHtml}
    </div>
    
    <div class="right-col">
      <div class="section-block">
        <h3>Contact Information</h3>
        <div class="contact-list">
          ${data.email ? `<div class="contact-item"><span class="label">Email</span><span class="val"><a href="mailto:${data.email}" style="color: inherit; text-decoration: none;">${data.email}</a></span></div>` : ''}
          ${data.phone ? `<div class="contact-item"><span class="label">Phone</span><span class="val">${data.phone}</span></div>` : ''}
          ${data.location ? `<div class="contact-item"><span class="label">Address</span><span class="val">${data.location}</span></div>` : ''}
          ${data.website ? `<div class="contact-item"><span class="label">Website</span><span class="val"><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></span></div>` : ''}
          ${data.linkedin ? `<div class="contact-item"><span class="label">LinkedIn</span><span class="val"><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></span></div>` : ''}
        </div>
      </div>
      
      ${eduHtml}
      ${skillsHtml}
      ${langHtml}
      ${certHtml}
    </div>
  </div>
</div>
</body>
</html>`;
}