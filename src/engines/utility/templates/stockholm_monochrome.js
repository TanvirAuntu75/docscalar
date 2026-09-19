// ═══════════════════════════════════════════════════════════════════════════════
// STOCKHOLM MONOCHROME — Swedish Geometric Grid & Pure Monochrome (Precision)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateStockholmMonochromeHtml(
  data,
  themeColor = '#000000',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const safeData = data || {};
  const accent = themeColor === 'default' || !themeColor ? '#000000' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = safeData.experience && safeData.experience.length ? `
    <div class="grid-box">
      <h3 class="box-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Work Experience'}</h3>
      <div class="entries-list">
        ${safeData.experience.map((e, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="exp:${idx}:role">${e.role || ''}</span>
              <span class="entry-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></span>${safeData.location ? ` / <span data-df-field="location">${safeData.location}</span>` : ''}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="entry-desc">
                ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const eduHtml = safeData.education && safeData.education.length ? `
    <div class="grid-box">
      <h3 class="box-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
      <div class="edu-list">
        ${safeData.education.map((e, idx) => `
          <div class="edu-item">
            <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
            <div class="edu-school" data-df-field="edu:${idx}:school">${e.school || ''}</div>
            <div class="edu-date" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
            ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const skillsHtml = safeData.skills && safeData.skills.length ? `
    <div class="grid-box">
      <h3 class="box-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Core Skills'}</h3>
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
              <span class="mono-bullet">•</span>
              <span class="skill-name" data-df-field="skill:${idx}">${name}</span>
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = safeData.projects && safeData.projects.length ? `
    <div class="grid-box">
      <h3 class="box-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Selected Projects'}</h3>
      <div class="entries-list">
        ${safeData.projects.map((p, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div data-df-field="proj:${idx}:description" style="font-size: 8.5pt; color: #525252; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const certHtml = safeData.certifications && safeData.certifications.length ? `
    <div class="grid-box">
      <h3 class="box-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
      <ul class="cert-list">
        ${safeData.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const hasContact = safeData.phone || safeData.email || safeData.location || safeData.linkedin || safeData.website;
  const contactHtml = hasContact ? `
    <div class="grid-box">
      <h3 class="box-title section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Information'}</h3>
      <div class="contact-list">
        ${safeData.phone ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span data-df-field="phone">${safeData.phone}</span></div>` : ''}
        ${safeData.email ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:${safeData.email}" style="color: inherit; text-decoration: none; word-break: break-all;" data-df-field="email">${safeData.email}</a></div>` : ''}
        ${safeData.location ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span data-df-field="location">${safeData.location}</span></div>` : ''}
        ${safeData.linkedin ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg><a data-df-field="linkedin" href="https://${safeData.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${safeData.website ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg><a data-df-field="website" href="https://${safeData.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
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
      color: #000000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .cv-page {
      width: 794px;
      min-height: 1123px;
      height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      padding: ${35 + pageMargin}px 36px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      overflow: hidden;
    }
    
    /* Top Header Box */
    .header-box {
      border: 2px solid #000000;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .header-left h1 {
      font-size: 24pt;
      font-weight: 900;
      color: #000000;
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
    }
    .header-left .title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #525252;
      margin-top: 4px;
    }
    .avatar-mask {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      border: 2px solid #000000;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    
    /* Content Grid Columns */
    .content-columns {
      display: flex;
      gap: 20px;
      flex: 1;
    }
    .main-col {
      width: 62%;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .sidebar-col {
      width: 38%;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .grid-box {
      border: 1.5px solid #000000;
      padding: 16px 18px;
      break-inside: auto;
    }
    .box-title {
      font-size: 9.5pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #000000;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    
    .summary-text {
      font-size: 8.8pt;
      color: #262626;
      line-height: ${lineSpacing};
      text-align: justify;
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
      font-size: 9pt;
      color: #000000;
    }
    .entry-date {
      font-size: 8pt;
      color: #525252;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-size: 8.5pt;
      color: #525252;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-desc {
      padding-left: 14px;
      font-size: 8.5pt;
      color: #262626;
      line-height: ${lineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 8.3pt;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 7px;
      color: #262626;
      word-break: break-all;
    }
    .c-icon {
      width: 12px;
      height: 12px;
      color: #000000;
      flex-shrink: 0;
    }
    
    .edu-item {
      margin-bottom: 10px;
      font-size: 8.3pt;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      color: #000000;
    }
    .edu-school {
      color: #525252;
      font-style: italic;
    }
    .edu-date {
      color: #737373;
      font-size: 7.8pt;
    }
    .edu-note {
      color: #737373;
      font-size: 7.8pt;
      margin-top: 1px;
    }
    
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .skill-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 8.3pt;
      color: #262626;
    }
    .mono-bullet {
      font-size: 10pt;
      color: #000000;
    }
    .skill-name {
      font-weight: 500;
    }
    .skill-level {
      font-size: 7.8pt;
      color: #737373;
      margin-left: auto;
    }
    
    .cert-list {
      padding-left: 16px;
      font-size: 8.3pt;
      color: #262626;
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
  <div class="header-box">
    <div class="header-left">
      <h1 data-df-field="name">${safeData.name || ''}</h1>
      <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${safeData.title || ''}</div>
    </div>
    ${safeData.photoUrl ? `
      <div class="avatar-mask">
        <img class="avatar" src="${safeData.photoUrl}" alt="Profile Photo" />
      </div>
    ` : ''}
  </div>
  
  <div class="content-columns">
    <div class="main-col">
      ${safeData.summary ? `
        <div class="grid-box">
          <h3 class="box-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || data.sectionTitles?.profile || 'Profile'}</h3>
          <div class="summary-text" data-df-field="summary">${safeData.summary}</div>
        </div>
      ` : ''}
      
      ${expHtml}
      ${projHtml}
    </div>
    
    <div class="sidebar-col">
      ${contactHtml}
      ${skillsHtml}
      ${eduHtml}
      ${certHtml}
    </div>
  </div>
</div>
</body>
</html>`;
}
