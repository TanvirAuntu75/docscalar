// ═══════════════════════════════════════════════════════════════════════════════
// MANHATTAN NOIR — High-Contrast Monochrome & Monospace Wall St Grid (Precision)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateManhattanNoirHtml(
  data,
  themeColor = '#000000',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#000000' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <section class="noir-section">
      <h3 class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Professional Experience'}</h3>
      <div class="noir-rule"></div>
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
      <div class="sidebar-rule"></div>
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
      <h3 class="sidebar-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Technical Expertise'}</h3>
      <div class="sidebar-rule"></div>
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
              <span class="mono-bullet">[•]</span>
              <span class="skill-name" data-df-field="skill:${idx}">${name}</span>
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="noir-section">
      <h3 class="section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Transactions & Projects'}</h3>
      <div class="noir-rule"></div>
      <div class="entries-list">
        ${data.projects.map((p, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="proj:${idx}:name">${p.name}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div style="font-size: 8.5pt; color: #404040; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="sidebar-section">
      <h3 class="sidebar-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Licenses & Certifications'}</h3>
      <div class="sidebar-rule"></div>
      <ul class="cert-list">
        ${data.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const hasContact = Boolean(data.phone || data.email || data.location || data.website || data.linkedin);
  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <h3 class="sidebar-title section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Information'}</h3>
      <div class="sidebar-rule"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span data-df-field="phone">${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:${data.email}" style="color: inherit; text-decoration: none; word-break: break-all;" data-df-field="email">${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span data-df-field="location">${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg><a data-df-field="linkedin" href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.website ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><a data-df-field="website" href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
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
    
    #main-container {
      width: 794px;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }
    
    /* Top Black Nameplate Header */
    .noir-header {
      background: #000000;
      color: #ffffff;
      padding: ${30 + pageMargin}px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      border-bottom: 2px solid #000000;
    }
    .header-text h1 {
      font-size: 27pt;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
    }
    .header-text .title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5pt;
      font-weight: 500;
      color: #d4d4d4;
      margin-top: 4px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
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
      border-radius: 4px;
      border: 2px solid #ffffff;
      object-fit: cover;
      flex-shrink: 0;
    }
    
    /* Content Columns */
    .content-columns {
      display: flex;
      padding: ${32 + pageMargin}px 36px;
      flex: 1;
      gap: 36px;
    }
    .main-col {
      width: 65%;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .sidebar-col {
      width: 35%;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    
    .noir-section, .sidebar-section {
      break-inside: auto;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #000000;
      margin-bottom: 3px;
    }
    .noir-rule {
      border-bottom: 2px solid #000000;
      width: 40px;
      margin-bottom: 12px;
    }
    .summary-text {
      font-size: 9pt;
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
      font-weight: 800;
      font-size: 9.5pt;
      color: #000000;
    }
    .entry-date {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      color: #525252;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-size: 8.8pt;
      color: #404040;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #262626;
      line-height: ${lineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .sidebar-title {
      font-size: 9.5pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #000000;
      margin-bottom: 4px;
    }
    .sidebar-rule {
      border-bottom: 1.5px solid #000000;
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
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
      font-weight: 800;
      color: #000000;
    }
    .edu-school {
      color: #404040;
      font-style: italic;
    }
    .edu-date {
      font-family: 'JetBrains Mono', monospace;
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
      gap: 5px;
    }
    .skill-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 8.3pt;
      color: #171717;
    }
    .mono-bullet {
      font-family: 'JetBrains Mono', monospace;
      color: #000000;
      font-size: 7.5pt;
    }
    .skill-name {
      font-weight: 600;
      flex: 1;
    }
    .skill-level {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      color: #737373;
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
  <div class="noir-header">
    <div class="header-text">
      <h1 data-df-field="name">${data.name || ''}</h1>
      <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
    </div>
    ${data.photoUrl ? `<div class="avatar-mask"><img class="avatar" src="${data.photoUrl}" alt="Profile Photo" /></div>` : ''}
  </div>
  
  <div class="content-columns">
    <div class="main-col">
      ${data.summary ? `
        <section class="noir-section">
          <h3 class="section-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'Executive Profile'}</h3>
          <div class="noir-rule"></div>
          <div class="summary-text" data-df-field="summary">${data.summary}</div>
        </section>
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
