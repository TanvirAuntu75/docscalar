// ═══════════════════════════════════════════════════════════════════════════════
// SAGE PASTEL — Soft Sage Mist Sidebar & Clean Executive Typography (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateSagePastelHtml(
  data,
  themeColor = '#164e63',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#164e63' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Work Experience'}</h3>
      <div class="divider-line"></div>
      <div class="entries-list">
        ${data.experience.map((e, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="exp:${idx}:role">${e.role}</span>
              <span class="entry-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="entry-desc">
                ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3 class="sidebar-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
      <div class="sidebar-line"></div>
      <div class="edu-list">
        ${data.education.map((e, idx) => `
          <div class="edu-item">
            <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree}</div>
            <div class="edu-school" data-df-field="edu:${idx}:school">${e.school}</div>
            <div class="edu-date" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
            ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3 class="sidebar-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${data.skills.map((s, idx) => {
          let name = s;
          let levelText = '';
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <div class="skill-item">
              <span data-df-field="skill:${idx}">• ${name}</span>
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h3>
      <div class="divider-line"></div>
      <div class="entries-list">
        ${data.projects.map((p, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="proj:${idx}:name">${p.name}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="sidebar-section">
      <h3 class="sidebar-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
      <div class="sidebar-line"></div>
      <ul class="cert-list">
        ${data.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const hasContact = Boolean(data.phone || data.email || data.location || data.website || data.linkedin);
  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <h3 class="sidebar-title section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><span data-df-field="phone">${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><a href="mailto:${data.email}" style="color: inherit; text-decoration: none; word-break: break-all;" data-df-field="email">${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-row"><span data-df-field="location">${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row"><a data-df-field="linkedin" href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.website ? `<div class="contact-row"><a data-df-field="website" href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${data.name ? `${data.name} - Resume` : 'Resume'}</title>
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
      width: 794px;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
    }
    
    /* Left Pastel Sage Sidebar (33%) */
    .sidebar {
      width: 33%;
      background: #eef5f2;
      border-right: 1.5px solid #d1e7dd;
      padding: ${35 + pageMargin}px 22px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .avatar-container {
      display: flex;
      justify-content: center;
      margin-bottom: 6px;
    }
    .avatar-mask {
      width: 145px;
      height: 145px;
      border-radius: 50%;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid ${accent};
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    }
    .avatar-mask .avatar, .avatar-mask img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .avatar {
      width: 145px;
      height: 145px;
      border-radius: 50%;
      border: 3px solid #164e63;
      object-fit: cover;
    
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);}
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-title {
      font-size: 9.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #164e63;
      margin-bottom: 4px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid #bbf7d0;
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 8.3pt;
      color: #334155;
    }
    .contact-row {
      word-break: break-all;
    }
    .edu-item {
      margin-bottom: 10px;
      font-size: 8.3pt;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      color: #164e63;
    }
    .edu-school {
      color: #475569;
      font-style: italic;
    }
    .edu-date {
      color: #64748b;
      font-size: 7.8pt;
    }
    .edu-note {
      color: #64748b;
      font-size: 7.8pt;
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
      color: #334155;
    }
    .skill-level {
      font-size: 7.8pt;
      color: #64748b;
    }
    .cert-list {
      padding-left: 16px;
      font-size: 8.3pt;
      color: #475569;
    }
    .cert-list li {
      margin-bottom: 3px;
    }
    
    /* Main Content Area (67%) */
    .main-content {
      width: 67%;
      padding: ${40 + pageMargin}px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .main-header {
      border-bottom: 2px solid #164e63;
      padding-bottom: 12px;
      margin-bottom: 4px;
    }
    .main-header h1 {
      font-size: 24pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .main-header .title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #164e63;
      margin-top: 3px;
      margin-bottom: 6px;
    }
    .summary-text {
      font-size: 9pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .main-section {
      break-inside: auto;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #164e63;
      margin-bottom: 3px;
    }
    .divider-line {
      border-bottom: 1.5px solid #e2e8f0;
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
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.3pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-size: 8.8pt;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
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
  
    @media print {
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
      }
      .cv-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
        margin-bottom: 0 !important;
      }
      #main-container, .page-container, .cv-page, .container, .page {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }
    }
  
    .avatar, .profile-photo, .photo, .headshot, .profile-img, .photo-wrapper, .avatar-wrapper {
      border-radius: 50%;
      overflow: hidden;
    }
  </style>
</head>
<body>
<div class="cv-page" id="main-container">
  <div class="sidebar">
    ${data.photoUrl ? `
      <div class="avatar-container">
          <div class="avatar-mask">
            <img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />
          </div>
        </div>
    ` : ''}
    ${contactHtml}
    ${skillsHtml}
    ${eduHtml}
    ${certHtml}
  </div>
  
  <div class="main-content">
      <div class="main-header">
        ${data.name ? `<h1 data-df-field="name">${data.name}</h1>` : ''}
        <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
        ${data.summary ? `<div class="summary-text" data-df-field="summary">${data.summary}</div>` : ''}
      </div>
    
    ${expHtml}
    ${projHtml}
  </div>
</div>
</body>
</html>`;
}
