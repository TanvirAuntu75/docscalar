// ═══════════════════════════════════════════════════════════════════════════════
// VIENNA CREST — Centered Monogram Crest & Academic European Layout (Precision)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateViennaCrestHtml(
  data,
  themeColor = '#1e293b',
  themeFont = 'Merriweather',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const safeData = data || {};
  const accent = themeColor === 'default' || !themeColor ? '#1e293b' : themeColor;
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : "'Merriweather', Georgia, serif";

  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const expHtml = safeData.experience && safeData.experience.length ? `
    <section class="cv-section">
      <h3 class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Professional Experience'}</h3>
      <div class="double-rule"></div>
      <div class="entries-list">
        ${safeData.experience.map((e, idx) => `
          <div class="entry-item">
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
    <section class="cv-section">
      <h3 class="section-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education & Credentials'}</h3>
      <div class="double-rule"></div>
      <div class="entries-list">
        ${safeData.education.map((e, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="edu:${idx}:degree">${e.degree || ''}</span>
              <span class="entry-date" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-company"><span data-df-field="edu:${idx}:school">${e.school || ''}</span>${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const skillsHtml = safeData.skills && safeData.skills.length ? `
    <section class="cv-section">
      <h3 class="section-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Expertise & Competencies'}</h3>
      <div class="double-rule"></div>
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
              <span class="s-bullet">•</span>
              <span class="s-name" data-df-field="skill:${idx}">${name}</span>
              ${levelText ? `<span class="s-level">(${levelText})</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </section>
  ` : '';

  const projHtml = safeData.projects && safeData.projects.length ? `
    <section class="cv-section">
      <h3 class="section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Notable Publications & Projects'}</h3>
      <div class="double-rule"></div>
      <div class="entries-list">
        ${safeData.projects.map((p, idx) => `
          <div class="entry-item">
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
    <section class="cv-section">
      <h3 class="section-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications & Honors'}</h3>
      <div class="double-rule"></div>
      <ul class="entry-desc" style="padding-left: 18px;">
        ${safeData.certifications.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
      </ul>
    </section>
  ` : '';

  const hasContact = safeData.phone || safeData.email || safeData.location || safeData.linkedin || safeData.website;
  const contactHtml = hasContact ? `
    <div class="contact-line">
      ${safeData.phone ? `<span data-df-field="phone">${safeData.phone}</span>` : ''}
      ${safeData.phone && safeData.email ? `<span class="c-sep">·</span>` : ''}
      ${safeData.email ? `<a href="mailto:${safeData.email}" style="color: inherit; text-decoration: none;" data-df-field="email">${safeData.email}</a>` : ''}
      ${(safeData.phone || safeData.email) && safeData.location ? `<span class="c-sep">·</span>` : ''}
      ${safeData.location ? `<span data-df-field="location">${safeData.location}</span>` : ''}
      ${(safeData.phone || safeData.email || safeData.location) && safeData.linkedin ? `<span class="c-sep">·</span>` : ''}
      ${safeData.linkedin ? `<a data-df-field="linkedin" href="https://${safeData.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.linkedin.replace(/^https?:\/\//, '')}</a>` : ''}
      ${(safeData.phone || safeData.email || safeData.location || safeData.linkedin) && safeData.website ? `<span class="c-sep">·</span>` : ''}
      ${safeData.website ? `<a data-df-field="website" href="https://${safeData.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${safeData.website.replace(/^https?:\/\//, '')}</a>` : ''}
    </div>
  ` : '';

  const initials = getInitials(safeData.name);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Inter:wght@300;400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
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
      padding: ${40 + pageMargin}px 48px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      overflow: hidden;
    }
    
    /* Centered Crest Header */
    .crest-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      border-bottom: 2px solid ${accent};
      padding-bottom: 16px;
    }
    .avatar-mask {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 2px solid ${accent};
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }
    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .monogram-badge {
      width: 54px;
      height: 54px;
      border: 2px solid ${accent};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 16pt;
      font-weight: 700;
      color: ${accent};
      margin-bottom: 8px;
      background: #f8fafc;
    }
    .crest-header h1 {
      font-size: 26pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.5px;
      line-height: 1.1;
    }
    .crest-header .title {
      font-size: 10pt;
      font-weight: 400;
      font-style: italic;
      letter-spacing: 1.5px;
      color: #64748b;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .contact-line {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      font-size: 8.5pt;
      color: #475569;
      font-family: 'Inter', sans-serif;
    }
    .c-sep {
      color: #cbd5e1;
      font-weight: 700;
    }
    
    .cv-section {
      break-inside: auto;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .double-rule {
      border-bottom: 2px solid #0f172a;
      border-top: 1px solid #cbd5e1;
      height: 3px;
      margin-bottom: 12px;
    }
    .summary-text {
      font-size: 9pt;
      color: #334155;
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
      font-size: 9.5pt;
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.3pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
      font-family: 'Inter', sans-serif;
    }
    .entry-company {
      font-size: 8.8pt;
      color: #475569;
      font-style: italic;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #334155;
      line-height: ${lineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      font-size: 8.5pt;
      font-family: 'Inter', sans-serif;
    }
    .skill-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #334155;
    }
    .s-bullet {
      color: ${accent};
      font-size: 10pt;
    }
    .s-name {
      font-weight: 500;
    }
    .s-level {
      color: #64748b;
      font-size: 7.8pt;
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
  <div class="crest-header">
    ${safeData.photoUrl ? `
      <div class="avatar-mask">
        <img class="avatar" src="${safeData.photoUrl}" alt="Profile Photo" />
      </div>
    ` : (initials ? `
      <div class="monogram-badge">
        <span>${initials}</span>
      </div>
    ` : '')}
    <h1 data-df-field="name">${safeData.name || ''}</h1>
    <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${safeData.title || ''}</div>
    ${contactHtml}
  </div>
  
  ${safeData.summary ? `
    <section class="cv-section">
      <h3 class="section-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'Academic & Professional Profile'}</h3>
      <div class="double-rule"></div>
      <div class="summary-text" data-df-field="summary">${safeData.summary}</div>
    </section>
  ` : ''}
  
  ${expHtml}
  ${eduHtml}
  ${skillsHtml}
  ${projHtml}
  ${certHtml}
</div>
</body>
</html>`;
}
