// ═══════════════════════════════════════════════════════════════════════════════
// 9. WILSON LIGHT — Deep Sapphire Sidebar & Crisp Sans Typography (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateWilsonLightHtml(
  data,
  themeColor = '#1a365d',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const safeData = data || {};
  const accent = themeColor === 'default' || !themeColor ? '#1a365d' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = safeData.experience && safeData.experience.length ? `
    <section class="main-section">
      <h3 class="main-section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h3>
      <div class="main-divider"></div>
      ${safeData.experience.map((e, idx) => `
        <div class="exp-item">
          <div class="exp-header">
            <span class="exp-role" data-df-field="exp:${idx}:role">${e.role || ''}</span>
            <span class="exp-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></span>${safeData.location ? ` · <span data-df-field="location">${safeData.location}</span>` : ''}</div>
          ${e.highlights && e.highlights.filter(Boolean).length ? `
            <ul class="exp-desc">
              ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

  const eduHtml = safeData.education && safeData.education.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
      <div class="sidebar-line"></div>
      ${safeData.education.map((e, idx) => `
        <div class="edu-item">
          <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
          <div class="edu-school" data-df-field="edu:${idx}:school">${e.school || ''}</div>
          <div class="edu-date" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
          ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  const skillsHtml = safeData.skills && safeData.skills.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${safeData.skills.map((s, idx) => {
          let name = typeof s === 'string' ? s : s.name || '';
          let levelText = '';
          if (typeof s === 'string' && s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <div class="skill-item">
              <span data-df-field="skill:${idx}">• ${name}</span>
              ${levelText ? `<span style="color: rgba(255,255,255,0.6); font-size: 7.8pt;">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = safeData.projects && safeData.projects.length ? `
    <section class="main-section">
      <h3 class="main-section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h3>
      <div class="main-divider"></div>
      ${safeData.projects.map((p, idx) => `
        <div class="proj-item">
          <div class="proj-header">
            <span class="proj-title" data-df-field="proj:${idx}:name">${p.name || ''}</span>
            ${p.url ? `<span class="proj-url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
          </div>
          ${p.description ? `<div class="proj-desc" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

  const certHtml = safeData.certifications && safeData.certifications.length ? `
    <section class="main-section">
      <h3 class="main-section-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
      <div class="main-divider"></div>
      <ul class="cert-list">
        ${safeData.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </section>
  ` : '';

  const hasContact = safeData.phone || safeData.email || safeData.location || safeData.linkedin || safeData.website;
  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${safeData.phone ? `<div class="contact-item"><span class="label">Phone</span><span class="val" data-df-field="phone">${safeData.phone}</span></div>` : ''}
        ${safeData.email ? `<div class="contact-item"><span class="label">Email</span><span class="val"><a href="mailto:${safeData.email}" style="color: inherit; text-decoration: none;" data-df-field="email">${safeData.email}</a></span></div>` : ''}
        ${safeData.location ? `<div class="contact-item"><span class="label">Address</span><span class="val" data-df-field="location">${safeData.location}</span></div>` : ''}
        ${safeData.linkedin ? `<div class="contact-item"><span class="label">LinkedIn</span><span class="val"><a data-df-field="linkedin" href="https://${safeData.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.linkedin.replace(/^https?:\/\//, '')}</a></span></div>` : ''}
        ${safeData.website ? `<div class="contact-item"><span class="label">Website</span><span class="val"><a data-df-field="website" href="https://${safeData.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.website.replace(/^https?:\/\//, '')}</a></span></div>` : ''}
      </div>
    </div>
  ` : '';

  const langSection = (safeData.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <h3 data-df-field="custom:${langSection.id}:title">${langSection.title || 'Languages'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${langSection.items.map((i, idx) => `
          <div class="skill-item">
            <span data-df-field="custom:${langSection.id}:${idx}:title">• ${i.title || ''}</span>
            ${typeof i === 'object' && i !== null && i.value ? `<span data-df-field="custom:${langSection.id}:${idx}:value" style="color: rgba(255,255,255,0.6); font-size: 7.8pt;">${i.value}</span>` : ''}
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
    
    .cv-page {
      width: 794px;
      min-height: 1123px;
      height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      position: relative;
      overflow: hidden;
    }
    
    /* Left Sidebar (Sapphire) */
    .sidebar {
      width: 32%;
      background: ${accent};
      color: #ffffff;
      padding: ${35 + pageMargin}px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .avatar-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 6px;
    }
    .avatar-mask {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.4);
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-section h3 {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid rgba(255, 255, 255, 0.2);
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 8.3pt;
    }
    .contact-item {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .contact-item .label {
      font-size: 7.2pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255, 255, 255, 0.6);
    }
    .contact-item .val {
      color: rgba(255, 255, 255, 0.95);
      word-break: break-all;
    }
    
    .edu-item {
      margin-bottom: 10px;
      font-size: 8.3pt;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      color: #ffffff;
    }
    .edu-school {
      color: rgba(255, 255, 255, 0.8);
      font-style: italic;
    }
    .edu-date {
      color: rgba(255, 255, 255, 0.6);
      font-size: 7.8pt;
    }
    .edu-note {
      color: rgba(255, 255, 255, 0.6);
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
      color: rgba(255, 255, 255, 0.9);
    }
    
    /* Right Main Content */
    .main-content {
      width: 68%;
      padding: ${35 + pageMargin}px 32px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .main-header {
      margin-bottom: 6px;
    }
    .main-header h1 {
      font-size: 26pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
    }
    .main-header .title {
      font-size: 11pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${accent};
      margin-top: 4px;
      margin-bottom: 10px;
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
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .main-divider {
      border-bottom: 2px solid ${accent};
      width: 35px;
      margin-bottom: 12px;
    }
    
    .exp-item, .proj-item {
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .exp-header, .proj-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .exp-role, .proj-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .exp-date, .proj-url {
      font-size: 8.3pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .exp-company {
      font-size: 8.8pt;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
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
    .proj-desc {
      font-size: 8.8pt;
      color: #475569;
      margin-top: 2px;
    }
    
    .cert-list {
      padding-left: 16px;
      font-size: 8.8pt;
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
      .cv-page {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .cv-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="cv-page" id="page-1">
    <div class="sidebar">
      ${safeData.photoUrl ? `
        <div class="avatar-wrap">
          <div class="avatar-mask">
            <img class="avatar" src="${safeData.photoUrl}" alt="Profile Photo" />
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
        <h1 data-df-field="name">${safeData.name || ''}</h1>
        <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${safeData.title || ''}</div>
        ${safeData.summary ? `<div class="summary" data-df-field="summary">${safeData.summary}</div>` : ''}
      </div>
      
      ${expHtml}
      ${projHtml}
      ${certHtml}
    </div>
  </div>
</body>
</html>`;
}