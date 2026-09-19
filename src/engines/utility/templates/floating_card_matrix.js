// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING CARD MATRIX — Discrete Shaded Modules & Skill Progress Bars (Precision)
// Matches Row 3 Col 1 & Row 9 Col 1 in reference catalog
// ═══════════════════════════════════════════════════════════════════════════════

export function generateFloatingCardMatrixHtml(
  data,
  themeColor = '#0284c7',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#0284c7' : themeColor;
  const cardBg = '#f8fafc';
  const cardBorder = '#e2e8f0';
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  // Helper for skill progress percentage bar
  const renderProgressBar = (levelStr) => {
    let pct = 80;
    if (levelStr) {
      const lower = levelStr.toLowerCase();
      if (lower.includes('expert') || lower.includes('native') || lower.includes('fluent') || lower.includes('5')) pct = 95;
      else if (lower.includes('adv') || lower.includes('senior') || lower.includes('4')) pct = 85;
      else if (lower.includes('inter') || lower.includes('med') || lower.includes('3')) pct = 70;
      else if (lower.includes('beg') || lower.includes('basic') || lower.includes('2') || lower.includes('1')) pct = 50;
    }
    return `
      <div class="progress-track">
        <div class="progress-fill" style="width: ${pct}%;"></div>
      </div>
    `;
  };

  const expHtml = data.experience && data.experience.length ? `
    <div class="floating-card">
      <div class="card-header">
        <div class="card-icon-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
        <h3 class="card-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Work Experience'}</h3>
      </div>
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
    </div>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="floating-card">
      <div class="card-header">
        <div class="card-icon-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
        <h3 class="card-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
      </div>
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
    <div class="floating-card">
      <div class="card-header">
        <div class="card-icon-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
        <h3 class="card-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Core Skills'}</h3>
      </div>
      <div class="skills-list">
        ${data.skills.map((s, idx) => {
          let name = s;
          let levelText = '';
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <div class="skill-meter-row">
              <div class="skill-labels">
                <span class="skill-name" data-df-field="skill:${idx}">${name}</span>
                ${levelText ? `<span class="skill-level-text">${levelText}</span>` : ''}
              </div>
              ${renderProgressBar(levelText)}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div class="floating-card">
      <div class="card-header">
        <div class="card-icon-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></div>
        <h3 class="card-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Selected Projects'}</h3>
      </div>
      <div class="entries-list">
        ${data.projects.map((p, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="floating-card">
      <div class="card-header">
        <div class="card-icon-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg></div>
        <h3 class="card-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
      </div>
      <ul class="cert-list">
        ${data.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const contactHtml = (data.phone || data.email || data.location || data.linkedin || data.website) ? `
    <div class="floating-card">
      <div class="card-header">
        <div class="card-icon-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <h3 class="card-title section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      </div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span data-df-field="phone">${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:${data.email}" style="color: inherit; text-decoration: none; word-break: break-all;" data-df-field="email" >${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span data-df-field="location">${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg><a data-df-field="linkedin" href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.website ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg><a data-df-field="website" href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
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
      background: #f1f5f9;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    #main-container {
      width: 794px;
      min-height: 297mm;
      margin: 0 auto;
      background: #f1f5f9;
      padding: ${28 + pageMargin}px 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    /* Header Card Module */
    .header-card {
      background: #ffffff;
      border: 1px solid ${cardBorder};
      border-radius: 12px;
      padding: 22px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .header-left h1 {
      font-size: 24pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .header-left .title {
      font-size: 10pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accent};
      margin-top: 4px;
    }
    .avatar {
      width: 135px;
      height: 135px;
      border-radius: 10px;
      border: 2.5px solid ${accent};
      object-fit: cover;
      flex-shrink: 0;
    }
    
    /* Content Columns */
    .content-columns {
      display: flex;
      flex: 1;
      gap: 16px;
    }
    .main-col {
      width: 64%;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .sidebar-col {
      width: 36%;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    /* Discrete Floating Card Boxes */
    .floating-card {
      background: #ffffff;
      border: 1px solid ${cardBorder};
      border-radius: 10px;
      padding: 18px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1.5px solid #f1f5f9;
    }
    .card-icon-pill {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #e0f2fe;
      color: ${accent};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .card-icon-pill svg {
      width: 14px;
      height: 14px;
    }
    .card-title {
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
    }
    .summary-text {
      font-size: 9pt;
      color: #475569;
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
      font-size: 9.2pt;
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.2pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-size: 8.7pt;
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
    
    /* Progress Bars */
    .skills-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }
    .skill-meter-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .skill-labels {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 8.2pt;
    }
    .skill-name {
      font-weight: 600;
      color: #334155;
    }
    .skill-level-text {
      font-size: 7.5pt;
      color: #64748b;
    }
    .progress-track {
      width: 100%;
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: ${accent};
      border-radius: 3px;
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
      color: #475569;
      word-break: break-all;
    }
    .c-icon {
      width: 12px;
      height: 12px;
      color: ${accent};
      flex-shrink: 0;
    }
    .edu-item {
      margin-bottom: 10px;
      font-size: 8.3pt;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      color: #0f172a;
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
    .cert-list {
      padding-left: 16px;
      font-size: 8.3pt;
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
      
    .cv-page:last-child { break-after: avoid !important; page-break-after: avoid !important; }
  }
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
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
<div id="main-container" class="cv-page">
  <div class="header-card">
    <div class="header-left">
      <h1 data-df-field="name">${data.name || ''}</h1>
      <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
    </div>
    ${data.photoUrl ? `<img class="avatar avatar-mask" style="overflow: hidden; border-radius: 50%;" src="${data.photoUrl}" alt="Profile Photo" />` : ''}
  </div>
  
  <div class="content-columns">
    <div class="main-col">
      ${data.summary ? `
        <div class="floating-card">
          <div class="card-header">
            <div class="card-icon-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
            <h3 class="card-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'Professional Summary'}</h3>
          </div>
          <div class="summary-text" data-df-field="summary">${data.summary}</div>
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
