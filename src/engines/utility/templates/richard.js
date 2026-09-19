// ═══════════════════════════════════════════════════════════════════════════════
// 7. RICHARD — Executive Navy Pill Badge & Clean Two-Column (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateRichardHtml(
  data,
  themeColor = '#0f3b7d',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#0f3b7d' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <section class="main-section">
      <div class="main-section-title-pill section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</div>
      ${data.experience.map((e, idx) => `
        <div class="main-item">
          <div class="item-header">
            <span class="item-title" data-df-field="exp:${idx}:role">${e.role}</span>
            <span class="item-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></div>
          ${e.highlights && e.highlights.filter(Boolean).length ? `
            <ul class="item-desc">
              ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <section class="main-section">
      <div class="main-section-title-pill section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</div>
      ${data.education.map((e, idx) => `
        <div class="main-item">
          <div class="item-header">
            <span class="item-title" data-df-field="edu:${idx}:degree">${e.degree}</span>
            <span class="item-date" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
          </div>
          <div class="item-meta"><span data-df-field="edu:${idx}:school">${e.school || ''}</span>${(e.school && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></div>
        </div>
      `).join('')}
    </section>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <div class="main-section-title-pill section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</div>
      ${data.projects.map((p, idx) => `
        <div class="main-item">
          <div class="item-title">${p.name}${p.url ? ` <a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none; font-size: 8pt; font-weight: normal;">(${p.url})</a>` : ''}</div>
          ${p.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${p.description}</div>` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <section class="main-section">
      <div class="main-section-title-pill section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</div>
      <ul class="item-desc" style="margin-top: 6px;">
        ${data.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </section>
  ` : '';

  const hasContact = Boolean(data.phone || data.email || data.location || data.website || data.linkedin);
  const contactHtml = hasContact ? `
    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
      <span data-df-field="phone">${data.phone ? `
        <div class="contact-row">
          <div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
          <span class="contact-text">${data.phone}</span></span>
        </div>
      ` : ''}
      ${data.email ? `
        <div class="contact-row">
          <div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
          <span class="contact-text"><a href="mailto:${data.email}" style="color: inherit; text-decoration: none;" data-df-field="email">${data.email}</a></span>
        </div>
      ` : ''}
      <span data-df-field="location">${data.location ? `
        <div class="contact-row">
          <div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
          <span class="contact-text">${data.location}</span></span>
        </div>
      ` : ''}
      ${data.linkedin ? `
        <div class="contact-row">
          <div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></div>
          <span class="contact-text"><a data-df-field="linkedin" href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></span>
        </div>
      ` : ''}
      ${data.website ? `
        <div class="contact-row">
          <div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
          <span class="contact-text"><a data-df-field="website" href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></span>
        </div>
      ` : ''}
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <div class="sidebar-section-title-pill section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Expertise'}</div>
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
      <div class="sidebar-section-title-pill">${langSection.title || 'Language'}</div>
      <div class="skills-grid">
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
      background: #0f172a;
      color: #ffffff;
      padding: ${35 + pageMargin}px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
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
    .sidebar-section-title-pill {
      background: ${accent};
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 10px;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 8.2pt;
      color: #cbd5e1;
    }
    .contact-icon {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      background: ${accent};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      padding: 3px;
    }
    .contact-text {
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
      border-bottom: 2px solid #e2e8f0;
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
    .main-section-title-pill {
      background: ${accent};
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 10px;
    }
    .main-item {
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .item-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .item-date {
      font-size: 8.3pt;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .item-meta {
      font-size: 8.5pt;
      color: #64748b;
      font-style: italic;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .item-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #334155;
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