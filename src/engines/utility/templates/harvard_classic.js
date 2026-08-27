// ═══════════════════════════════════════════════════════════════════════════════
// HARVARD CLASSIC — Ivy League Gold Standard Single-Column Resume Template
// ═══════════════════════════════════════════════════════════════════════════════

export function generateHarvardClassicHtml(
  data,
  themeColor = '#111827',
  themeFont = 'Merriweather',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
  themeLayout = 'single',
  pageMargin = 20,
  lineSpacing = 1.4
) {
  const accent = themeColor === 'default' || !themeColor ? '#111827' : themeColor;
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Playfair Display' ? "'Playfair Display', serif" : "'Merriweather', Georgia, serif";

  const contactItems = [];
  if (data.email) contactItems.push(`<a href="mailto:${data.email}" style="color: inherit; text-decoration: none;">${data.email}</a>`);
  if (data.phone) contactItems.push(`<span>${data.phone}</span>`);
  if (data.location) contactItems.push(`<span>${data.location}</span>`);
  if (data.linkedin) {
    const cleanLi = data.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanLi}" target="_blank" style="color: inherit; text-decoration: none;">${cleanLi}</a>`);
  }
  if (data.website) {
    const cleanWeb = data.website.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanWeb}" target="_blank" style="color: inherit; text-decoration: none;">${cleanWeb}</a>`);
  }

  // Section Generators
  const renderSummary = () => {
    if (!data.summary?.trim()) return '';
    return `
      <section class="cv-section">
        <h2 class="section-heading">Professional Summary</h2>
        <div class="summary-text">${data.summary}</div>
      </section>
    `;
  };

  const renderExperience = () => {
    if (!data.experience || !data.experience.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-heading">Work Experience</h2>
        ${data.experience.map(e => `
          <div class="entry-block">
            <div class="entry-row-primary">
              <span class="entry-title-primary">${e.company}</span>
              <span class="entry-meta-right">${data.location || ''}</span>
            </div>
            <div class="entry-row-secondary">
              <span class="entry-title-secondary">${e.role}</span>
              <span class="entry-date-right">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
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

  const renderEducation = () => {
    if (!data.education || !data.education.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-heading">Education</h2>
        ${data.education.map(e => `
          <div class="entry-block">
            <div class="entry-row-primary">
              <span class="entry-title-primary">${e.school}</span>
              <span class="entry-date-right">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-row-secondary">
              <span class="entry-title-secondary">${e.degree}</span>
              ${e.note ? `<span class="entry-meta-right">${e.note}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderSkills = () => {
    if (!data.skills || !data.skills.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-heading">Skills & Competencies</h2>
        <div class="skills-line-wrap">
          ${data.skills.map(s => `<span class="skill-tag">${s.replace(/ - (Expert|Advanced|Intermediate)$/, '')}</span>`).join(' <span class="skill-separator">•</span> ')}
        </div>
      </section>
    `;
  };

  const renderProjects = () => {
    if (!data.projects || !data.projects.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-heading">Projects</h2>
        ${data.projects.map(p => `
          <div class="entry-block">
            <div class="entry-row-primary">
              <span class="entry-title-primary">${p.name}</span>
              ${p.url ? `<span class="entry-meta-right"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="entry-desc">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderCertifications = () => {
    if (!data.certifications || !data.certifications.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-heading">Certifications & Honors</h2>
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
        <h2 class="section-heading">References</h2>
        <div class="reference-grid">
          ${data.references.map(r => `
            <div class="entry-block">
              <div class="entry-title-primary">${r.name}</div>
              <div class="entry-title-secondary">${r.relation}</div>
              <div class="entry-desc">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
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
        <h2 class="section-heading">${cs.title || 'Additional Information'}</h2>
        <div class="custom-items-grid">
          ${cs.items.map(it => `
            <div class="custom-item-row">
              <strong class="custom-item-key">${it.title}</strong>${it.value ? `: <span class="custom-item-val">${it.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const sectionMap = {
    summary: renderSummary,
    experience: renderExperience,
    education: renderEducation,
    skills: renderSkills,
    projects: renderProjects,
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
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
      color: #111827;
      font-family: ${fontFam};
      font-size: 10pt;
      line-height: ${lineSpacing};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-wrapper {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: ${pageMargin + 12}px ${pageMargin + 16}px;
      background: #ffffff;
    }
    .header-container {
      text-align: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${accent};
    }
    .candidate-name {
      font-size: 22pt;
      font-weight: 700;
      color: ${accent};
      letter-spacing: 0.5px;
      margin-bottom: 3px;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .candidate-title {
      font-size: 10.5pt;
      font-weight: 400;
      font-style: italic;
      color: #374151;
      margin-bottom: 6px;
    }
    .contact-line {
      font-size: 8.5pt;
      color: #4b5563;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px 10px;
    }
    .cv-section {
      margin-bottom: 14px;
      break-inside: auto;
    }
    .section-heading {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .summary-text {
      font-size: 9.5pt;
      color: #374151;
      text-align: justify;
    }
    .entry-block {
      margin-bottom: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .entry-row-primary {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-weight: 700;
      font-size: 10pt;
      color: #111827;
    }
    .entry-title-primary {
      font-weight: 700;
    }
    .entry-meta-right {
      font-size: 9pt;
      font-weight: 500;
      color: #4b5563;
      text-align: right;
    }
    .entry-row-secondary {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 9.5pt;
      font-style: italic;
      color: #374151;
      margin-bottom: 3px;
    }
    .entry-title-secondary {
      font-weight: 600;
    }
    .entry-date-right {
      font-size: 9pt;
      font-style: italic;
      color: #4b5563;
    }
    .bullet-list {
      padding-left: 18px;
      margin-top: 3px;
      font-size: 9.2pt;
      color: #374151;
    }
    .bullet-list li {
      margin-bottom: 3px;
      text-align: justify;
    }
    .entry-desc {
      font-size: 9.2pt;
      color: #374151;
      margin-top: 2px;
    }
    .skills-line-wrap {
      font-size: 9.2pt;
      color: #374151;
      line-height: 1.6;
    }
    .skill-tag {
      font-weight: 600;
      color: #1f2937;
    }
    .skill-separator {
      color: #9ca3af;
      margin: 0 4px;
    }
    .custom-items-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
      font-size: 9.2pt;
    }
    .custom-item-key {
      color: #111827;
    }
    .custom-item-val {
      color: #4b5563;
    }
    .reference-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <header class="header-container">
      <h1 class="candidate-name">${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="candidate-title">${data.title}</div>` : ''}
      <div class="contact-line">
        ${contactItems.join(' <span style="color:#9ca3af">•</span> ')}
      </div>
    </header>

    <main class="main-content">
      ${dynamicSections}
    </main>
  </div>
</body>
</html>`;
}
