// ═══════════════════════════════════════════════════════════════════════════════
// 8. SANCHEZ DARK — Deep Charcoal Header & Precision Timeline (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateSanchezDarkHtml(
  data,
  themeColor = '#2b3543',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#2b3543' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const expHtml = data.experience && data.experience.length ? `
    <div class="timeline-node-group">
      <div class="timeline-section-header">
        <div class="timeline-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg></div>
        <h2 class="section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h2>
      </div>
      <div class="timeline-body">
        ${data.experience.map((e, idx) => `
          <div class="timeline-entry">
            <div class="entry-header">
              <span class="role-title" data-df-field="exp:${idx}:role">${e.role}</span>
              <span class="date-text" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="entry-highlights">
                ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="timeline-node-group">
      <div class="timeline-section-header">
        <div class="timeline-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg></div>
        <h2 class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h2>
      </div>
      <div class="timeline-body">
        ${data.education.map((e, idx) => `
          <div class="timeline-entry">
            <div class="entry-header">
              <span class="role-title" data-df-field="edu:${idx}:degree">${e.degree}</span>
              <span class="date-text" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="company-text"><span data-df-field="edu:${idx}:school">${e.school}</span>${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div class="timeline-node-group">
      <div class="timeline-section-header">
        <div class="timeline-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
        <h2 class="section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h2>
      </div>
      <div class="timeline-body">
        ${data.projects.map((p, idx) => `
          <div class="timeline-entry">
            <div class="entry-header">
              <span class="role-title">${p.name}</span>
              ${p.url ? `<span class="date-text"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="timeline-node-group">
      <div class="timeline-section-header">
        <div class="timeline-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg></div>
        <h2 class="section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h2>
      </div>
      <div class="timeline-body">
        <ul class="entry-highlights">
          ${data.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
        </ul>
      </div>
    </div>
  ` : '';

  const refHtml = data.references && data.references.length ? `
    <div class="timeline-node-group">
      <div class="timeline-section-header">
        <div class="timeline-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        <h2 class="section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</h2>
      </div>
      <div class="timeline-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          ${data.references.map(r => `
            <div style="font-size: 8.3pt; color: #475569;">
              <div style="font-weight: 700; color: #1e293b;">${r.name}</div>
              <div style="font-style: italic; color: #64748b;">${r.relation}</div>
              <div>${r.phone ? `Phone: ${r.phone}` : ''}</div>
              <div>${r.email ? `Email: ${r.email}` : ''}</div>
            </div>
          `).join('')}
        </div>
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
              ${levelText ? `<span style="color: #64748b; font-size: 7.8pt;">${levelText}</span>` : ''}
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
            ${typeof i === 'object' && i !== null && i.value ? `<span style="color: #64748b; font-size: 7.8pt;">${i.value}</span>` : ''}
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
    
    /* Left Sidebar (32%) */
    .sidebar {
      width: 32%;
      background: #f8fafc;
      border-right: 1.5px solid #e2e8f0;
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
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 8.2pt;
      color: #475569;
    }
    .contact-row svg {
      width: 13px;
      height: 13px;
      color: ${accent};
      flex-shrink: 0;
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
    
    /* Node groups & timeline body */
    .timeline-node-group {
      break-inside: auto;
    }
    .timeline-section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .timeline-icon-circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${accent};
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      flex-shrink: 0;
    }
    .timeline-section-header h2 {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
    }
    .timeline-body {
      padding-left: 20px;
      border-left: 2px solid #e2e8f0;
      margin-left: 11px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-bottom: 6px;
    }
    .timeline-entry {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .role-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .date-text {
      font-size: 8.3pt;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .company-text {
      font-size: 8.8pt;
      font-weight: 600;
      color: #475569;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-highlights {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #334155;
      line-height: ${lineSpacing};
    }
    .entry-highlights li {
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
      ${refHtml}
    </div>
  </div>
</body>
</html>`;
}