// ═══════════════════════════════════════════════════════════════════════════════
// OVERLAPPING BADGE — Royal Navy Header & Overlapping Halo Avatar (Precision)
// Matches Row 2 Col 2 & Row 4 Col 1 in reference catalog
// ═══════════════════════════════════════════════════════════════════════════════

export function generateOverlappingBadgeHtml(
  data,
  themeColor = '#1e3a8a',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Montserrat' ? "'Montserrat', sans-serif" : "'Inter', sans-serif";
  const primaryColor = themeColor === 'default' || !themeColor ? '#1e3a8a' : themeColor;
  const accent = primaryColor;

  const skillsHtml = (data.skills && data.skills.length) ? data.skills.map((s, idx) => {
    let name = typeof s === 'string' ? s : (s.name || '');
    let levelText = '';
    if (typeof s === 'string' && s.includes(' - ')) {
      const parts = s.split(' - ');
      name = parts[0];
      levelText = parts[1];
    }
    return `
      <div class="skill-chip">
        <span class="chip-name" data-df-field="skill:${idx}">${name}</span>
        ${levelText ? `<span class="chip-level">${levelText}</span>` : ''}
      </div>
    `;
  }).join('') : '';

  const expHtml = data.experience && data.experience.length ? `
    <section class="main-section">
      <div class="section-heading">
        <h3 class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</h3>
        <div class="heading-rule"></div>
      </div>
      <div class="entries-list">
        ${data.experience.map((e, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="exp:${idx}:role">${e.role}</span>
              <span class="entry-date" data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-company" data-df-field="exp:${idx}:company">${e.company}${data.location ? ` · ${data.location}` : ''}</div>
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
    <div class="sidebar-block">
      <div class="section-heading">
        <h3 class="section-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
        <div class="heading-rule"></div>
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

  const skillsBlock = data.skills && data.skills.length ? `
    <div class="sidebar-block">
      <div class="section-heading">
        <h3 class="section-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Competencies'}</h3>
        <div class="heading-rule"></div>
      </div>
      <div class="skills-chips-wrap">
        ${skillsHtml}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <div class="section-heading">
        <h3 class="section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Key Projects'}</h3>
        <div class="heading-rule"></div>
      </div>
      <div class="entries-list">
        ${data.projects.map((p, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="proj:${idx}:name">${p.name}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <div class="sidebar-block">
      <div class="section-heading">
        <h3 class="section-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
        <div class="heading-rule"></div>
      </div>
      <div class="cert-list">
        ${data.certifications.map((c, idx) => `
          <div class="cert-item" data-df-field="cert:${idx}">
            <div class="cert-name">${typeof c === 'string' ? c : (c.name || '')}</div>
            ${(c.issuer || c.year) ? `<div class="cert-meta">${c.issuer || ''}${c.issuer && c.year ? ' · ' : ''}${c.year || ''}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${data.name || ''} - Resume</title>
  <style>
    @page { margin: 0; size: A4; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${fontFam};
      color: #1e293b;
      background: #f8fafc;
      font-size: 9.5pt;
      line-height: ${lineSpacing};
      width: 794px;
      height: 1123px;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cv-page {
      width: 794px;
      height: 1123px;
      background: #ffffff;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .hero-badge-header {
      background: ${primaryColor};
      color: #ffffff;
      padding: 38px 45px 34px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
    }
    .candidate-name {
      font-size: 26pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.1;
      color: #ffffff;
    }
    .candidate-title {
      font-size: 11pt;
      font-weight: 500;
      color: #93c5fd;
      margin-top: 6px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .avatar-wrapper {
      width: 104px;
      height: 104px;
      border-radius: 50%;
      border: 4px solid #ffffff;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
      background: #e2e8f0;
    }
    .avatar-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .contact-bar {
      background: #0f172a;
      color: #cbd5e1;
      padding: 10px 45px;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 8.5pt;
    }
    .contact-bar span, .contact-bar a {
      color: #cbd5e1;
      text-decoration: none;
    }
    .body-layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 36px;
      padding: 32px 45px;
      flex: 1;
    }
    .sidebar-col {
      display: flex;
      flex-direction: column;
      gap: 24px;
      border-right: 1px solid #f1f5f9;
      padding-right: 24px;
    }
    .main-col {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .section-title {
      font-size: 11.5pt;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 6px;
    }
    .heading-rule {
      width: 32px;
      height: 2.5px;
      background: ${primaryColor};
      margin-bottom: 12px;
    }
    .summary-text {
      font-size: 9.5pt;
      color: #334155;
      line-height: ${lineSpacing};
      text-align: justify;
      margin-bottom: 8px;
    }
    .entries-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .entry-item {
      display: flex;
      flex-direction: column;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .entry-role {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.5pt;
      font-weight: 600;
      color: #64748b;
    }
    .entry-company {
      font-size: 9.5pt;
      font-weight: 500;
      color: ${accent};
      margin-top: 1px;
      margin-bottom: 6px;
    }
    .entry-desc {
      list-style-type: disc;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 9pt;
      color: #334155;
    }
    .edu-list, .cert-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .edu-degree {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .edu-school {
      font-size: 9pt;
      color: #475569;
    }
    .edu-date {
      font-size: 8pt;
      color: #64748b;
    }
    .skills-chips-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .skill-chip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 8.5pt;
      color: #1e293b;
    }
    @media print {
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .cv-page {
        box-shadow: none !important;
        margin: 0 !important;
        break-after: page !important;
      }
      .cv-page:last-child {
        break-after: avoid !important;
      }
    }
      .avatar-mask { width: 140px; height: 140px; border-radius: 50%; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div class="cv-page" id="page-1">
    <div class="hero-badge-header">
      <div>
        <h1 class="candidate-name" data-df-field="name">${data.name || ''}</h1>
        <div class="candidate-title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
      </div>
      ${data.photoUrl ? `
        <div class="avatar-wrapper avatar-mask" style="overflow: hidden; border-radius: 50%;">
          <img src="${data.photoUrl}" alt="${data.name || 'Candidate'}" />
        </div>
      ` : ''}
    </div>

    ${(data.email || data.phone || data.location || data.website) ? `
      <div class="contact-bar">
        ${data.email ? `<a href="mailto:${data.email}" data-df-field="email">${data.email}</a>` : ''}
        ${data.phone ? `<span data-df-field="phone">${data.phone}</span>` : ''}
        ${data.location ? `<span data-df-field="location">${data.location}</span>` : ''}
        ${data.website ? `<a href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="website">${data.website}</a>` : ''}
      </div>
    ` : ''}

    <div class="body-layout">
      <div class="sidebar-col">
        ${eduHtml}
        ${skillsBlock}
        ${certHtml}
      </div>

      <div class="main-col">
        ${data.summary ? `
          <section class="main-section">
            <div class="section-heading">
              <h3 class="section-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'About Me'}</h3>
              <div class="heading-rule"></div>
            </div>
            <div class="summary-text" data-df-field="summary">
              ${data.summary}
            </div>
          </section>
        ` : ''}

        ${expHtml}
        ${projHtml}
      </div>
    </div>
  </div>
</body>
</html>`;
}
