// ═══════════════════════════════════════════════════════════════════════════════
// 1. MARIANA — Premium Navy Sidebar Two-Column Layout (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateMarianaHtml(
  data,
  themeColor = '#2c3549',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#2c3549' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  // Sidebar sections
  const contactHtml = `
    <div class="sidebar-section">
      <h3>Contact</h3>
      <div class="sidebar-line"></div>
      <div class="sidebar-contact-list">
        ${data.phone ? `<div class="contact-item"><span class="label">Phone</span><span class="val">${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-item"><span class="label">Email</span><a href="mailto:${data.email}" class="val" style="color: inherit; text-decoration: none;">${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-item"><span class="label">Address</span><span class="val">${data.location}</span></div>` : ''}
        ${data.website ? `<div class="contact-item"><span class="label">Website</span><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" class="val" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.linkedin ? `<div class="contact-item"><span class="label">LinkedIn</span><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" class="val" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
      </div>
    </div>
  `;

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3>Education</h3>
      <div class="sidebar-line"></div>
      ${data.education.map(e => `
        <div class="edu-item">
          <div class="edu-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
          <div class="edu-degree">${e.degree}</div>
          <div class="edu-school">${e.school}</div>
          ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3>Expertise</h3>
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
      <ul class="lang-list">
        ${langSection.items.map(i => `<li>${i.title}${i.value ? ` — ${i.value}` : ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  // Main column section renderers
  const renderExperience = () => {
    if (!data.experience || !data.experience.length) return '';
    return `
      <section class="main-section">
        <h2>Experience</h2>
        <div class="main-line"></div>
        <div class="timeline-container">
          ${data.experience.map(e => `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-header">
                <div class="timeline-role">${e.role}</div>
                <div class="timeline-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
              </div>
              <div class="timeline-company">${e.company}${data.location ? ` · ${data.location}` : ''}</div>
              ${e.highlights && e.highlights.filter(Boolean).length ? `
                <ul class="timeline-desc">
                  ${e.highlights.filter(Boolean).map(h => `<li>${h}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderProjects = () => {
    if (!data.projects || !data.projects.length) return '';
    return `
      <section class="main-section">
        <h2>Projects</h2>
        <div class="main-line"></div>
        ${data.projects.map(p => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-title">${p.name}</span>
              ${p.url ? `<span class="entry-url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="entry-desc">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderCertifications = () => {
    if (!data.certifications || !data.certifications.length) return '';
    return `
      <section class="main-section">
        <h2>Certifications</h2>
        <div class="main-line"></div>
        <ul class="cert-list">
          ${data.certifications.map(c => `<li>${c}</li>`).join('')}
        </ul>
      </section>
    `;
  };

  const renderReferences = () => {
    if (!data.references || !data.references.length) return '';
    return `
      <section class="main-section">
        <h2>References</h2>
        <div class="main-line"></div>
        <div class="reference-grid">
          ${data.references.map(r => `
            <div class="ref-item">
              <div class="ref-name">${r.name}</div>
              <div class="ref-relation">${r.relation}</div>
              <div class="ref-contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderCustomSections = () => {
    const mainCustom = (data.customSections || []).filter(cs => cs.id !== 'custom_languages' && cs.title?.toLowerCase() !== 'languages');
    if (!mainCustom.length) return '';
    return mainCustom.map(cs => `
      <section class="main-section">
        <h2>${cs.title || 'Additional Information'}</h2>
        <div class="main-line"></div>
        <div class="custom-grid">
          ${cs.items.map(i => `
            <div class="custom-item">
              <strong>${i.title}</strong>${i.value ? `: ${i.value}` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `).join('\n');
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
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
      display: flex;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
    }
    
    /* Sidebar (33%) */
    .sidebar {
      width: 33%;
      background: ${accent};
      color: #ffffff;
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
      width: 110px;
      height: 110px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.45);
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
    .sidebar-contact-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .contact-item .label {
      display: block;
      font-weight: 700;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255, 255, 255, 0.85);
    }
    .contact-item .val {
      display: block;
      color: rgba(255, 255, 255, 0.95);
      margin-top: 1px;
      word-break: break-all;
      font-size: 8.3pt;
    }
    .edu-item {
      margin-bottom: 10px;
      break-inside: avoid;
    }
    .edu-date {
      font-size: 8pt;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 600;
    }
    .edu-degree {
      font-weight: 700;
      font-size: 8.6pt;
      color: #ffffff;
      margin-top: 1px;
    }
    .edu-school {
      font-size: 8pt;
      color: rgba(255, 255, 255, 0.8);
    }
    .edu-note {
      font-size: 7.8pt;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 1px;
    }
    .lang-list {
      list-style: none;
      padding-left: 0;
    }
    .lang-list li {
      position: relative;
      padding-left: 12px;
      margin-bottom: 5px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 8.3pt;
    }
    .lang-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: rgba(255, 255, 255, 0.6);
    }
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      color: rgba(255, 255, 255, 0.9);
      font-size: 8.3pt;
    }
    .skill-name {
      font-weight: 500;
    }
    .skill-level {
      font-size: 7.8pt;
      color: rgba(255, 255, 255, 0.65);
    }
    
    /* Main Content (67%) */
    .main-content {
      width: 67%;
      padding: ${40 + pageMargin}px 32px;
      background: #ffffff;
      color: #1e293b;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .main-header {
      margin-bottom: 6px;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 12px;
    }
    .main-header h1 {
      font-size: 24pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .main-header .title {
      font-size: 11pt;
      font-weight: 600;
      text-transform: uppercase;
      color: ${accent};
      letter-spacing: 1.5px;
      margin-top: 3px;
      margin-bottom: 8px;
    }
    .main-header .summary {
      font-size: 9pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    .main-section {
      break-inside: auto;
    }
    .main-section h2 {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 1px;
      margin-bottom: 3px;
    }
    .main-line {
      border-bottom: 1.5px solid #e2e8f0;
      margin-bottom: 10px;
    }
    
    /* Pixel-Perfect Timeline */
    .timeline-container {
      position: relative;
      border-left: 2px solid #e2e8f0;
      margin-left: 6px;
      padding-left: 16px;
    }
    .timeline-item {
      position: relative;
      margin-bottom: 14px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .timeline-dot {
      position: absolute;
      left: -21px;
      top: 4px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid ${accent};
    }
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .timeline-role {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .timeline-date {
      font-size: 8.3pt;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .timeline-company {
      font-size: 8.8pt;
      font-weight: 600;
      color: #475569;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .timeline-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #334155;
      line-height: ${lineSpacing};
    }
    .timeline-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    .entry-item {
      margin-bottom: 10px;
      break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .entry-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .entry-url {
      font-size: 8.3pt;
    }
    .entry-desc {
      font-size: 8.8pt;
      color: #475569;
      margin-top: 2px;
    }
    .cert-list {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #334155;
    }
    .cert-list li {
      margin-bottom: 3px;
    }
    .reference-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .ref-item {
      font-size: 8.5pt;
      color: #475569;
      break-inside: avoid;
    }
    .ref-name {
      font-size: 9.2pt;
      font-weight: 700;
      color: #0f172a;
    }
    .ref-relation {
      font-style: italic;
      color: #64748b;
      margin-bottom: 2px;
    }
    .custom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      font-size: 8.8pt;
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
      
      ${renderExperience()}
      ${renderProjects()}
      ${renderCertifications()}
      ${renderCustomSections()}
      ${renderReferences()}
    </div>
  </div>
</body>
</html>`;
}