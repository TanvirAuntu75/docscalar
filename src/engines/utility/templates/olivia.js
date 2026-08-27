// ═══════════════════════════════════════════════════════════════════════════════
// 2. OLIVIA — Premium Elegant Bronze Split Layout (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateOliviaHtml(
  data,
  themeColor = '#b38e70',
  themeFont = 'Playfair Display',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#b38e70' : themeColor;
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : "'Playfair Display', Georgia, serif";

  const contactHtml = `
    <div class="sidebar-section">
      <h3>Contact</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:${data.email}" style="color: inherit; text-decoration: none; word-break: break-all;">${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg><a href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.website ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
      </div>
    </div>
  `;

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3>Education</h3>
      <div class="sidebar-line"></div>
      <div class="edu-container">
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
      <div class="lang-grid">
        ${langSection.items.map(i => `
          <div class="lang-row">
            <span class="lang-name">${i.title}</span>
            ${i.value ? `<span class="lang-level">${i.value}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const renderExperience = () => {
    if (!data.experience || !data.experience.length) return '';
    return `
      <section class="main-section">
        <h2>Experience</h2>
        <div class="main-line"></div>
        <div class="timeline-container">
          ${data.experience.map(e => `
            <div class="timeline-item">
              <div class="timeline-header">
                <span class="timeline-role">${e.role}</span>
                <span class="timeline-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
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
          <div class="project-item">
            <div class="project-header">
              <span class="project-title">${p.name}</span>
              ${p.url ? `<span class="project-url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="project-desc">${p.description}</div>` : ''}
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
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
      display: flex;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
    }
    
    /* Sidebar (32%) */
    .sidebar {
      width: 32%;
      background: #fbf9f6;
      border-right: 1.5px solid #ece4db;
      padding: ${35 + pageMargin}px 22px;
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
      border: 3px solid ${accent};
      object-fit: cover;
      display: block;
    }
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-section h3 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11pt;
      font-weight: 700;
      color: ${accent};
      margin-bottom: 3px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid #d9cdbf;
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #4a453e;
      font-size: 8.3pt;
      font-family: 'Inter', sans-serif;
    }
    .c-icon {
      width: 13px;
      height: 13px;
      color: ${accent};
      flex-shrink: 0;
    }
    .edu-item {
      margin-bottom: 9px;
      font-family: 'Inter', sans-serif;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      font-size: 8.6pt;
      color: #2b2b2b;
    }
    .edu-school {
      font-size: 8pt;
      color: #6e6459;
    }
    .edu-date {
      font-size: 7.8pt;
      color: #8c8275;
      font-style: italic;
    }
    .edu-note {
      font-size: 7.8pt;
      color: #6e6459;
      margin-top: 1px;
    }
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-family: 'Inter', sans-serif;
    }
    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      color: #4a453e;
      font-size: 8.3pt;
    }
    .skill-name {
      font-weight: 500;
    }
    .skill-level {
      font-size: 7.8pt;
      color: #8c8275;
    }
    .lang-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-family: 'Inter', sans-serif;
    }
    .lang-row {
      display: flex;
      justify-content: space-between;
      font-size: 8.3pt;
      color: #4a453e;
    }
    .lang-level {
      font-size: 7.8pt;
      color: #8c8275;
    }
    
    /* Main Content (68%) */
    .main-content {
      width: 68%;
      padding: ${40 + pageMargin}px 32px;
      background: #ffffff;
      color: #2b2b2b;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .main-header {
      border-bottom: 1.5px solid #d9cdbf;
      padding-bottom: 12px;
      margin-bottom: 6px;
    }
    .main-header h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26pt;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.5px;
      line-height: 1.05;
    }
    .main-header .title {
      font-family: 'Inter', sans-serif;
      font-size: 10.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accent};
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .main-header .summary {
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      color: #4a453e;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    .main-section {
      break-inside: auto;
    }
    .main-section h2 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11.5pt;
      font-weight: 700;
      color: ${accent};
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .main-line {
      border-bottom: 1.5px solid #ece4db;
      margin-bottom: 10px;
    }
    .timeline-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .timeline-item {
      font-family: 'Inter', sans-serif;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .timeline-role {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1a1a1a;
    }
    .timeline-date {
      font-size: 8.3pt;
      font-weight: 500;
      color: #8c8275;
      font-style: italic;
    }
    .timeline-company {
      font-size: 8.8pt;
      font-weight: 600;
      color: #6e6459;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .timeline-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #4a453e;
      line-height: ${lineSpacing};
    }
    .timeline-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    .project-item {
      font-family: 'Inter', sans-serif;
      margin-bottom: 10px;
      break-inside: avoid;
    }
    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .project-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #1a1a1a;
    }
    .project-url {
      font-size: 8.3pt;
    }
    .project-desc {
      font-size: 8.8pt;
      color: #4a453e;
      margin-top: 2px;
    }
    .cert-list {
      padding-left: 16px;
      font-family: 'Inter', sans-serif;
      font-size: 8.8pt;
      color: #4a453e;
    }
    .cert-list li {
      margin-bottom: 3px;
    }
    .reference-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      font-family: 'Inter', sans-serif;
    }
    .ref-item {
      font-size: 8.5pt;
      color: #4a453e;
      break-inside: avoid;
    }
    .ref-name {
      font-size: 9.2pt;
      font-weight: 700;
      color: #1a1a1a;
    }
    .ref-relation {
      font-style: italic;
      color: #6e6459;
      margin-bottom: 2px;
    }
    .custom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      font-size: 8.8pt;
      font-family: 'Inter', sans-serif;
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
      ${skillsHtml}
      ${eduHtml}
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