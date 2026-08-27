// ═══════════════════════════════════════════════════════════════════════════════
// JAKES MONOCHROME — The Gold-Standard LaTeX Developer Resume
// ═══════════════════════════════════════════════════════════════════════════════

export function generateJakesMonochromeHtml(
  data,
  themeColor = '#000000',
  themeFont = 'Inter',
  sectionOrder = ['education', 'experience', 'projects', 'skills', 'certifications'],
  themeLayout = 'single',
  pageMargin = 16,
  lineSpacing = 1.32
) {
  const fontFam = themeFont === 'Merriweather' ? "'Merriweather', serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, system-ui, sans-serif";

  const contactItems = [];
  if (data.phone) contactItems.push(`<span>${data.phone}</span>`);
  if (data.email) contactItems.push(`<a href="mailto:${data.email}" class="header-link">${data.email}</a>`);
  if (data.linkedin) {
    const cleanLi = data.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanLi}" target="_blank" class="header-link">${cleanLi}</a>`);
  }
  if (data.website) {
    const cleanWeb = data.website.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanWeb}" target="_blank" class="header-link">${cleanWeb}</a>`);
  }

  const renderSummary = () => {
    if (!data.summary?.trim()) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Objective / Summary</h2>
        <div class="summary-text">${data.summary}</div>
      </section>
    `;
  };

  const renderEducation = () => {
    if (!data.education || !data.education.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Education</h2>
        ${data.education.map(e => `
          <div class="entry-block">
            <div class="entry-line-1">
              <span class="entry-bold">${e.school}</span>
              <span class="entry-right">${data.location || ''}</span>
            </div>
            <div class="entry-line-2">
              <span class="entry-italic">${e.degree}${e.note ? ` (GPA: ${e.note})` : ''}</span>
              <span class="entry-right-italic">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderExperience = () => {
    if (!data.experience || !data.experience.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Experience</h2>
        ${data.experience.map(e => `
          <div class="entry-block">
            <div class="entry-line-1">
              <span class="entry-bold">${e.role}</span>
              <span class="entry-right-italic">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-line-2">
              <span class="entry-italic">${e.company}</span>
              <span class="entry-right">${data.location || ''}</span>
            </div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="bullet-list">
                ${e.highlights.filter(Boolean).map(h => `<li>${h}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderProjects = () => {
    if (!data.projects || !data.projects.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Projects</h2>
        ${data.projects.map(p => `
          <div class="entry-block">
            <div class="entry-line-1">
              <span class="entry-bold">${p.name}</span>
              ${p.url ? `<span class="entry-right"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" class="header-link">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="project-desc">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderSkills = () => {
    if (!data.skills || !data.skills.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Technical Skills</h2>
        <div class="skills-body">
          <strong>Languages & Technologies:</strong> ${data.skills.map(s => s.replace(/ - (Expert|Advanced|Intermediate)$/, '')).join(', ')}
        </div>
      </section>
    `;
  };

  const renderCertifications = () => {
    if (!data.certifications || !data.certifications.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Certifications</h2>
        <ul class="bullet-list">
          ${data.certifications.map(c => `<li>${c}</li>`).join('')}
        </ul>
      </section>
    `;
  };

  const renderReferences = () => {
    if (!data.references || !data.references.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">References</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${data.references.map(r => `
            <div class="entry-block">
              <div class="entry-bold">${r.name}</div>
              <div class="entry-italic">${r.relation}</div>
              <div style="font-size: 8.8pt; color: #444;">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderCustomSection = (secId) => {
    const cs = (data.customSections || []).find(c => c.id === secId);
    if (!cs || !cs.items || !cs.items.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">${cs.title || 'Additional Information'}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 9pt;">
          ${cs.items.map(it => `
            <div><strong>${it.title}</strong>${it.value ? `: ${it.value}` : ''}</div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const sectionMap = {
    summary: renderSummary,
    education: renderEducation,
    experience: renderExperience,
    projects: renderProjects,
    skills: renderSkills,
    certifications: renderCertifications,
    references: renderReferences
  };

  const dynamicSections = sectionOrder.map(secKey => {
    if (sectionMap[secKey]) return sectionMap[secKey]();
    if (secKey.startsWith('custom_')) return renderCustomSection(secKey);
    return '';
  }).filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #ffffff;
      color: #000000;
      font-family: ${fontFam};
      font-size: 9.3pt;
      line-height: ${lineSpacing};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-wrapper {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: ${pageMargin + 10}px ${pageMargin + 14}px;
      background: #ffffff;
    }
    .header-center {
      text-align: center;
      margin-bottom: 12px;
    }
    .candidate-name {
      font-size: 20pt;
      font-weight: 700;
      color: #000000;
      letter-spacing: -0.2px;
      margin-bottom: 3px;
    }
    .candidate-title {
      font-size: 10pt;
      font-weight: 500;
      color: #333333;
      margin-bottom: 4px;
    }
    .contact-bar {
      font-size: 8.7pt;
      color: #222222;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px 12px;
    }
    .header-link {
      color: #000000;
      text-decoration: none;
      border-bottom: 1px solid #cccccc;
    }
    .cv-section {
      margin-bottom: 11px;
      break-inside: auto;
    }
    .section-title {
      font-size: 10.2pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #000000;
      padding-bottom: 1.5px;
      margin-bottom: 6px;
      color: #000000;
    }
    .summary-text {
      font-size: 9pt;
      color: #111111;
      text-align: justify;
    }
    .entry-block {
      margin-bottom: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .entry-line-1 {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 9.3pt;
    }
    .entry-line-2 {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 9pt;
      margin-top: 1px;
    }
    .entry-bold {
      font-weight: 700;
      color: #000000;
    }
    .entry-italic {
      font-style: italic;
      color: #222222;
    }
    .entry-right {
      font-size: 8.8pt;
      color: #333333;
      text-align: right;
    }
    .entry-right-italic {
      font-size: 8.8pt;
      font-style: italic;
      color: #333333;
      text-align: right;
    }
    .bullet-list {
      padding-left: 18px;
      margin-top: 2px;
      font-size: 9pt;
      color: #111111;
    }
    .bullet-list li {
      margin-bottom: 2px;
      text-align: justify;
    }
    .project-desc {
      font-size: 8.8pt;
      color: #222222;
      margin-top: 2px;
    }
    .skills-body {
      font-size: 9pt;
      color: #111111;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <header class="header-center">
      <h1 class="candidate-name">${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="candidate-title">${data.title}</div>` : ''}
      <div class="contact-bar">
        ${contactItems.join(' · ')}
      </div>
    </header>

    <main class="main-content">
      ${dynamicSections}
    </main>
  </div>
</body>
</html>`;
}
