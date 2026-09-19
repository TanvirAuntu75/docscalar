// ═══════════════════════════════════════════════════════════════════════════════
// 6. KATHLEEN — Warm Amber Header Accent & Minimalist Sidebar (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateKathleenHtml(
  data,
  themeColor = '#d97706',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#d97706' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <section class="main-section">
      <h2 class="main-section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Work Experience'}</h2>
      <div class="main-line"></div>
      ${data.experience.map((e, idx) => `
        <div class="exp-item">
          <div class="exp-header">
            <span class="exp-role" data-df-field="exp:${idx}:role">${e.role}</span>
            <span class="exp-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></div>
          ${e.highlights && e.highlights.filter(Boolean).length ? `
            <ul class="exp-desc">
              ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
      <div class="sidebar-line"></div>
      ${data.education.map((e, idx) => `
        <div class="edu-item">
          <div class="edu-date" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
          <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree}</div>
          <div class="edu-school" data-df-field="edu:${idx}:school">${e.school}${e.note ? ` · ${e.note}` : ''}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h3>
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
            <div class="skill-row">
              <span class="skill-name" data-df-field="skill:${idx}">• ${name}</span>
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <h2 class="main-section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h2>
      <div class="main-line"></div>
      ${data.projects.map((p, idx) => `
        <div class="proj-item">
          <div class="proj-header">
            <span class="proj-title" data-df-field="proj:${idx}:name">${p.name}</span>
            ${p.url ? `<span class="proj-url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;" data-df-field="proj:${idx}:url">${p.url}</a></span>` : ''}
          </div>
          ${p.description ? `<div class="proj-desc" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <section class="main-section">
      <h2 class="main-section-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h2>
      <div class="main-line"></div>
      <ul class="cert-list">
        ${data.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </section>
  ` : '';

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <h3 data-df-field="custom:${langSection.id}:title">${langSection.title || 'Languages'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${langSection.items.map(i => `
          <div class="skill-row">
            <span class="skill-name">• ${typeof i === 'string' ? i : (i.title || i.name || '')}</span>
            ${typeof i === 'object' && i !== null && i.value ? `<span class="skill-level">${i.value}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const hasContact = Boolean(data.phone || data.email || data.location || data.website || data.linkedin);
  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.location ? `
          <div class="contact-item">
            <span class="label">Location</span>
            <span class="val" data-df-field="location">${data.location}</span>
          </div>
        ` : ''}
        ${data.phone ? `
          <div class="contact-item">
            <span class="label">Phone</span>
            <span class="val" data-df-field="phone">${data.phone}</span>
          </div>
        ` : ''}
        ${data.email ? `
          <div class="contact-item">
            <span class="label">Email</span>
            <span class="val"><a href="mailto:${data.email}" data-df-field="email" style="color: inherit; text-decoration: none;">${data.email}</a></span>
          </div>
        ` : ''}
        ${data.linkedin ? `
          <div class="contact-item">
            <span class="label">LinkedIn</span>
            <span class="val"><a data-df-field="linkedin" href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></span>
          </div>
        ` : ''}
        ${data.website ? `
          <div class="contact-item">
            <span class="label">Website</span>
            <span class="val"><a data-df-field="website" href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></span>
          </div>
        ` : ''}
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
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
    
    /* Left Sidebar (33%) */
    .sidebar {
      width: 33%;
      background: #fafaf9;
      padding: ${35 + pageMargin}px 22px;
      font-size: 8.5pt;
      border-right: 1.5px solid #e7e5e4;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .avatar-container {
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
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
      border: 3px solid ${accent};
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
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
      color: ${accent};
      margin-bottom: 4px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid #e7e5e4;
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .contact-item .label {
      font-weight: 700;
      font-size: 7.5pt;
      text-transform: uppercase;
      color: #78716c;
      letter-spacing: 0.5px;
    }
    .contact-item .val {
      font-size: 8.3pt;
      color: #1c1917;
      margin-top: 1px;
      word-break: break-all;
    }
    .edu-item {
      margin-bottom: 10px;
      break-inside: avoid;
    }
    .edu-date {
      font-size: 7.8pt;
      color: #78716c;
      font-weight: 500;
    }
    .edu-degree {
      font-weight: 700;
      font-size: 8.8pt;
      color: #1c1917;
      margin-top: 1px;
    }
    .edu-school {
      font-size: 8pt;
      color: #57534e;
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
      font-size: 8.3pt;
      color: #292524;
    }
    .skill-name {
      font-weight: 500;
    }
    .skill-level {
      font-size: 7.8pt;
      color: #78716c;
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
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .main-header .title {
      font-size: 10.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${accent};
      margin-top: 3px;
      margin-bottom: 6px;
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
    .main-section-title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      margin-bottom: 3px;
    }
    .main-line {
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
      color: #1e293b;
    }
    .exp-date {
      font-size: 8.3pt;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .exp-company {
      font-weight: 600;
      font-size: 8.8pt;
      color: #64748b;
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
      color: #1e293b;
    }
    .proj-url {
      font-size: 8pt;
    }
    .proj-desc {
      font-size: 8.5pt;
      color: #475569;
      margin-top: 1px;
    }
    .cert-list {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #475569;
    }
    .cert-list li {
      margin-bottom: 3px;
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
      ${eduHtml}
      ${skillsHtml}
      ${langHtml}
    </div>
    
    <div class="main-content">
      <div class="main-header">
        ${data.name ? `<h1 data-df-field="name">${data.name}</h1>` : ''}
        <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
        ${data.summary ? `<div class="summary" data-df-field="summary">${data.summary}</div>` : ''}
      </div>
      
      ${expHtml}
      ${projHtml}
      ${certHtml}
    </div>
  </div>
</body>
</html>`;
}