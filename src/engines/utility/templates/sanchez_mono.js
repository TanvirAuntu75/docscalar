// ═══════════════════════════════════════════════════════════════════════════════
// 10. SANCHEZ MONO — Slate Minimalist Timeline & Dual Column (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateSanchezMonoHtml(
  data,
  themeColor = '#475569',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#475569' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <section class="main-section">
      <h2 class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h2>
      <div class="section-line"></div>
      <div class="timeline-wrap">
        ${data.experience.map((e, idx) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="item-role" data-df-field="exp:${idx}:role">${e.role}</span>
              <span class="item-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="item-desc">
                ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <section class="main-section">
      <h2 class="section-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h2>
      <div class="section-line"></div>
      <div class="timeline-wrap">
        ${data.education.map((e, idx) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="item-role" data-df-field="edu:${idx}:degree">${e.degree}</span>
              <span class="item-date" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="item-company"><span data-df-field="edu:${idx}:school">${e.school}</span>${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <h2 class="section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h2>
      <div class="section-line"></div>
      <div class="timeline-wrap">
        ${data.projects.map((p, idx) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="item-role">${p.name}</span>
              ${p.url ? `<span class="item-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div style="font-size: 8.5pt; color: #4b5563; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <section class="main-section">
      <h2 class="section-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h2>
      <div class="section-line"></div>
      <ul class="item-desc" style="padding-left: 16px;">
        ${data.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </section>
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
            <div class="skill-item">
              <span data-df-field="skill:${idx}">• ${name}</span>
              ${levelText ? `<span style="color: #9ca3af; font-size: 7.8pt;">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <h3 data-df-field="custom:${langSection.id}:title">${langSection.title || 'Languages'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${langSection.items.map(i => `
          <div class="skill-item">
            <span>• ${typeof i === 'string' ? i : (i.title || i.name || '')}</span>
            ${typeof i === 'object' && i !== null && i.value ? `<span style="color: #9ca3af; font-size: 7.8pt;">${i.value}</span>` : ''}
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
    
    /* Left Sidebar (30%) */
    .sidebar {
      width: 30%;
      background: #f8fafc;
      border-right: 1.5px solid #e2e8f0;
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
      border-bottom: 1.5px solid #cbd5e1;
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 8.3pt;
      color: #475569;
    }
    .contact-row {
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
      color: #334155;
    }
    
    /* Main Content (70%) */
    .main-content {
      width: 70%;
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
      font-size: 8.8pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .main-section {
      break-inside: auto;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      margin-bottom: 3px;
    }
    .section-line {
      border-bottom: 1.5px solid #e2e8f0;
      margin-bottom: 10px;
    }
    
    /* Precision Timeline */
    .timeline-wrap {
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
    .item-role {
      font-weight: 700;
      font-size: 9.5pt;
      color: #1f2937;
    }
    .item-date {
      font-size: 8.3pt;
      font-weight: 500;
      color: #6b7280;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .item-company {
      font-size: 8.8pt;
      color: #4b5563;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .item-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #4b5563;
      line-height: ${lineSpacing};
    }
    .item-desc li {
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
      ${certHtml}
    </div>
  </div>
</body>
</html>`;
}