// ═══════════════════════════════════════════════════════════════════════════════
// 13. SCHUMACHER CHARCOAL — Deep Charcoal Editorial Split (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateSchumacherCharcoalHtml(
  data,
  themeColor = '#2f2e2d',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#2f2e2d' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2 class="section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h2>
      </div>
      <div class="timeline-line-wrap">
        ${data.experience.map((e, idx) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="timeline-role" data-df-field="exp:${idx}:role">${e.role}</span>
              <span class="timeline-year" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="timeline-desc">
                ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2 class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h2>
      </div>
      <div class="timeline-line-wrap">
        ${data.education.map((e, idx) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="timeline-role" data-df-field="edu:${idx}:degree">${e.degree}</span>
              <span class="timeline-year" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="timeline-company"><span data-df-field="edu:${idx}:school">${e.school}</span>${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div class="timeline-group">
      <div class="section-title-wrap">
        <h2 class="section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h2>
      </div>
      <div class="timeline-line-wrap">
        ${data.projects.map((p, idx) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="timeline-role">${p.name}</span>
              ${p.url ? `<span class="timeline-year"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3 class="section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
      </div>
      <ul class="cert-list" style="margin-top: 8px;">
        ${data.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const hasContact = Boolean(data.phone || data.email || data.location || data.website || data.linkedin);
  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3 class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      </div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><span data-df-field="phone">${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><a href="mailto:${data.email}" style="color: inherit; text-decoration: none; word-break: break-all;" data-df-field="email">${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-row"><span data-df-field="location">${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row"><a data-df-field="linkedin" href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.website ? `<div class="contact-row"><a data-df-field="website" href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
      </div>
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3 class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h3>
      </div>
      <div class="skills-grid" style="margin-top: 8px;">
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
              ${levelText ? `<span style="color: #94a3b8; font-size: 7.8pt;">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <div class="sidebar-title-wrap">
        <h3 data-df-field="custom:${langSection.id}:title">${langSection.title || 'Languages'}</h3>
      </div>
      <div class="skills-grid" style="margin-top: 8px;">
        ${langSection.items.map(i => `
          <div class="skill-item">
            <span>• ${typeof i === 'string' ? i : (i.title || i.name || '')}</span>
            ${typeof i === 'object' && i !== null && i.value ? `<span style="color: #94a3b8; font-size: 7.8pt;">${i.value}</span>` : ''}
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
      color: #1e293b;
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
    
    /* Left Sidebar (32%) */
    .sidebar {
      width: 32%;
      background: ${accent};
      color: #ffffff;
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
      border: 3px solid rgba(255, 255, 255, 0.3);
      object-fit: cover;
      display: block;
    
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);}
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-title-wrap h3 {
      font-size: 9.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #ffffff;
      border-bottom: 1.5px solid rgba(255, 255, 255, 0.2);
      padding-bottom: 4px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin-top: 8px;
    }
    .contact-row {
      color: #e2e8f0;
      font-size: 8.3pt;
      word-break: break-all;
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
      color: #e2e8f0;
    }
    .cert-list {
      padding-left: 16px;
      font-size: 8.3pt;
      color: #e2e8f0;
    }
    .cert-list li {
      margin-bottom: 3px;
    }
    
    /* Main Content (68%) */
    .main-content {
      width: 68%;
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
      text-transform: uppercase;
    }
    .main-header .title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      margin-top: 3px;
      margin-bottom: 6px;
    }
    .main-header .summary {
      font-size: 8.8pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .timeline-group {
      break-inside: auto;
    }
    .section-title-wrap h2 {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .timeline-line-wrap {
      border-left: 2px solid #e2e8f0;
      margin-left: 6px;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .timeline-item {
      position: relative;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .timeline-dot {
      position: absolute;
      left: -21px;
      top: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid ${accent};
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .timeline-role {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .timeline-year {
      font-size: 8.2pt;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .timeline-company {
      font-size: 8.8pt;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .timeline-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #475569;
      line-height: ${lineSpacing};
    }
    .timeline-desc li {
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
      ${langHtml}
      ${certHtml}
    </div>
    
    <div class="main-content">
      <div class="main-header">
        ${data.name ? `<h1 data-df-field="name">${data.name}</h1>` : ''}
        <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
        ${data.summary ? `<div class="summary" data-df-field="summary">${data.summary}</div>` : ''}
      </div>
      
      ${expHtml}
      ${eduHtml}
      ${projHtml}
    </div>
  </div>
</body>
</html>`;
}