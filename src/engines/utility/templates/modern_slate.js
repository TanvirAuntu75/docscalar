// ═══════════════════════════════════════════════════════════════════════════════
// MODERN SLATE — Executive Accent Bar Single-Column Resume
// ═══════════════════════════════════════════════════════════════════════════════

export function generateModernSlateHtml(
  data,
  themeColor = '#334155',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'projects', 'skills', 'education', 'certifications'],
  themeLayout = 'single',
  pageMargin = 18,
  lineSpacing = 1.4
) {
  const accent = themeColor === 'default' || !themeColor ? '#334155' : themeColor;
  const fontFam = themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', serif" : "'Inter', -apple-system, system-ui, sans-serif";

  const contactItems = [];
  if (data.email) contactItems.push(`<a href="mailto:${data.email}" class="slate-contact-link">${data.email}</a>`);
  if (data.phone) contactItems.push(`<span>${data.phone}</span>`);
  if (data.location) contactItems.push(`<span>${data.location}</span>`);
  if (data.linkedin) {
    const cleanLi = data.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanLi}" target="_blank" class="slate-contact-link">${cleanLi}</a>`);
  }
  if (data.website) {
    const cleanWeb = data.website.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanWeb}" target="_blank" class="slate-contact-link">${cleanWeb}</a>`);
  }

  const renderSummary = () => {
    if (!data.summary?.trim()) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title"><span class="accent-bar"></span>Summary</h2>
        <div class="summary-body">${data.summary}</div>
      </section>
    `;
  };

  const renderExperience = () => {
    if (!data.experience || !data.experience.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title"><span class="accent-bar"></span>Experience</h2>
        ${data.experience.map(e => `
          <div class="entry-card">
            <div class="entry-top">
              <span class="entry-role">${e.role}</span>
              <span class="entry-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-company">${e.company}${data.location ? ` · ${data.location}` : ''}</div>
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
        <h2 class="section-title"><span class="accent-bar"></span>Projects</h2>
        ${data.projects.map(p => `
          <div class="entry-card">
            <div class="entry-top">
              <span class="entry-role">${p.name}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="entry-desc">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderSkills = () => {
    if (!data.skills || !data.skills.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title"><span class="accent-bar"></span>Skills</h2>
        <div class="skills-grid">
          ${data.skills.map(s => `<span class="skill-chip">${s.replace(/ - (Expert|Advanced|Intermediate)$/, '')}</span>`).join('')}
        </div>
      </section>
    `;
  };

  const renderEducation = () => {
    if (!data.education || !data.education.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title"><span class="accent-bar"></span>Education</h2>
        ${data.education.map(e => `
          <div class="entry-card">
            <div class="entry-top">
              <span class="entry-role">${e.degree}</span>
              <span class="entry-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-company">${e.school}${e.note ? ` (${e.note})` : ''}</div>
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderCertifications = () => {
    if (!data.certifications || !data.certifications.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title"><span class="accent-bar"></span>Certifications</h2>
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
        <h2 class="section-title"><span class="accent-bar"></span>References</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          ${data.references.map(r => `
            <div class="entry-card">
              <div class="entry-role">${r.name}</div>
              <div class="entry-company">${r.relation}</div>
              <div class="entry-desc">${r.phone ? `${r.phone} · ` : ''}${r.email || ''}</div>
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
        <h2 class="section-title"><span class="accent-bar"></span>${cs.title || 'Other Details'}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 8.8pt;">
          ${cs.items.map(it => `
            <div><strong>${it.title}</strong>${it.value ? `: ${it.value}` : ''}</div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const sectionMap = {
    summary: renderSummary,
    experience: renderExperience,
    projects: renderProjects,
    skills: renderSkills,
    education: renderEducation,
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
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
      color: #1e293b;
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
      padding: ${pageMargin + 10}px ${pageMargin + 16}px;
      background: #ffffff;
    }
    .header-block {
      border-bottom: 2px solid ${accent};
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .candidate-name {
      font-size: 24pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .candidate-title {
      font-size: 11pt;
      font-weight: 600;
      color: ${accent};
      margin-top: 2px;
      margin-bottom: 6px;
    }
    .contact-row {
      font-size: 8.5pt;
      color: #64748b;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
    }
    .slate-contact-link {
      color: inherit;
      text-decoration: none;
    }
    .cv-section {
      margin-bottom: 13px;
      break-inside: auto;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .accent-bar {
      display: inline-block;
      width: 4px;
      height: 14px;
      background: ${accent};
      border-radius: 2px;
    }
    .summary-body {
      font-size: 9pt;
      color: #334155;
      line-height: 1.45;
      text-align: justify;
    }
    .entry-card {
      margin-bottom: 9px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .entry-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .entry-role {
      font-size: 9.6pt;
      font-weight: 700;
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.4pt;
      font-weight: 600;
      color: #64748b;
    }
    .entry-company {
      font-size: 8.9pt;
      font-weight: 600;
      color: #475569;
      margin-bottom: 2px;
    }
    .bullet-list {
      padding-left: 16px;
      margin-top: 2px;
      font-size: 9pt;
      color: #334155;
    }
    .bullet-list li {
      margin-bottom: 2px;
      text-align: justify;
    }
    .entry-desc {
      font-size: 8.8pt;
      color: #475569;
      margin-top: 2px;
    }
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .skill-chip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 8.2pt;
      font-weight: 600;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <header class="header-block">
      <h1 class="candidate-name">${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="candidate-title">${data.title}</div>` : ''}
      <div class="contact-row">
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
