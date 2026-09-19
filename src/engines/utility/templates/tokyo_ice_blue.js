// ═══════════════════════════════════════════════════════════════════════════════
// TOKYO ICE BLUE — Ice-Blue Studio with Floating Badge Containers (Precision)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateTokyoIceBlueHtml(
  data,
  themeColor = '#3b82f6',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const safeData = data || {};
  const accent = themeColor === 'default' || !themeColor ? '#3b82f6' : themeColor;
  const iceBg = '#f1f5f9';
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = safeData.experience && safeData.experience.length ? `
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h3>
      <div class="ice-bar"></div>
      <div class="timeline-wrap">
        ${safeData.experience.map((e, idx) => `
          <div class="timeline-item">
            <div class="ice-dot"></div>
            <div class="entry-header">
              <span class="entry-role" data-df-field="exp:${idx}:role">${e.role || ''}</span>
              <span class="entry-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></span>${safeData.location ? ` · <span data-df-field="location">${safeData.location}</span>` : ''}</div>
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

  const eduHtml = safeData.education && safeData.education.length ? `
    <div class="sidebar-card">
      <h4 class="card-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h4>
      <div class="card-line"></div>
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
    <div class="sidebar-card">
      <h4 class="card-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Key Skills'}</h4>
      <div class="card-line"></div>
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
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = safeData.projects && safeData.projects.length ? `
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h3>
      <div class="ice-bar"></div>
      <div class="timeline-wrap">
        ${safeData.projects.map((p, idx) => `
          <div class="timeline-item">
            <div class="ice-dot"></div>
            <div class="entry-header">
              <span class="entry-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div data-df-field="proj:${idx}:description" style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = safeData.certifications && safeData.certifications.length ? `
    <div class="sidebar-card">
      <h4 class="card-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h4>
      <div class="card-line"></div>
      <ul class="cert-list">
        ${safeData.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const hasContact = safeData.phone || safeData.email || safeData.location || safeData.linkedin || safeData.website;
  const contactHtml = hasContact ? `
    <div class="sidebar-card">
      <h4 class="card-title section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h4>
      <div class="card-line"></div>
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
      color: #1e293b;
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
    
    /* Left Ice-Blue Sidebar (33%) */
    .sidebar {
      width: 33%;
      background: ${iceBg};
      padding: ${35 + pageMargin}px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      border-right: 1px solid #e2e8f0;
    }
    .avatar-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 4px;
    }
    .avatar-mask {
      width: 135px;
      height: 135px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
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
    
    .sidebar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card-title {
      font-size: 9pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .card-line {
      border-bottom: 1.5px solid ${accent};
      width: 25px;
      margin-bottom: 8px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 8.2pt;
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
      margin-bottom: 8px;
      font-size: 8.2pt;
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
    
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .skill-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 8.2pt;
      color: #475569;
    }
    .skill-level {
      font-size: 7.8pt;
      color: ${accent};
    }
    
    .cert-list {
      padding-left: 14px;
      font-size: 8.2pt;
      color: #475569;
    }
    .cert-list li {
      margin-bottom: 2px;
    }
    
    /* Right Main Content (67%) */
    .main-content {
      width: 67%;
      padding: ${35 + pageMargin}px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .main-header {
      margin-bottom: 4px;
    }
    .main-header h1 {
      font-size: 26pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
    }
    .main-header .title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accent};
      margin-top: 4px;
      margin-bottom: 10px;
    }
    
    .main-section {
      break-inside: auto;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .ice-bar {
      border-bottom: 2.5px solid ${accent};
      width: 35px;
      margin-bottom: 12px;
    }
    .summary-text {
      font-size: 9pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .timeline-wrap {
      border-left: 2px solid #e2e8f0;
      margin-left: 6px;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .timeline-item {
      position: relative;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .ice-dot {
      position: absolute;
      left: -21px;
      top: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid ${accent};
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
    ${skillsHtml}
    ${eduHtml}
    ${certHtml}
  </div>
  
  <div class="main-content">
    <div class="main-header">
      <h1 data-df-field="name">${safeData.name || ''}</h1>
      <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${safeData.title || ''}</div>
      ${safeData.summary ? `<div class="summary-text" data-df-field="summary">${safeData.summary}</div>` : ''}
    </div>
    
    ${expHtml}
    ${projHtml}
  </div>
</div>
</body>
</html>`;
}
