// ═══════════════════════════════════════════════════════════════════════════════
// NORDIC CLEAN — Minimalist Scandinavian Compact Professional Resume
// ═══════════════════════════════════════════════════════════════════════════════

export function generateNordicCleanHtml(
  data,
  themeColor = '#334155',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
  themeLayout = 'single',
  pageMargin = 18,
  lineSpacing = 1.36
) {
  const accent = themeColor === 'default' || !themeColor ? '#334155' : themeColor;
  const fontFam = themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', serif" : "'Inter', -apple-system, system-ui, sans-serif";

  const contactItems = [];
  if (data.email) contactItems.push(`<a href="mailto:${data.email}" class="nordic-contact-link">${data.email}</a>`);
  if (data.phone) contactItems.push(`<span>${data.phone}</span>`);
  if (data.location) contactItems.push(`<span>${data.location}</span>`);
  if (data.linkedin) {
    const cleanLi = data.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanLi}" target="_blank" class="nordic-contact-link">${cleanLi}</a>`);
  }
  if (data.website) {
    const cleanWeb = data.website.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanWeb}" target="_blank" class="nordic-contact-link">${cleanWeb}</a>`);
  }

  const renderSummary = () => {
    if (!data.summary?.trim()) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">About</h2>
        <div class="summary-body">${data.summary}</div>
      </section>
    `;
  };

  const renderExperience = () => {
    if (!data.experience || !data.experience.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Experience</h2>
        ${data.experience.map(e => `
          <div class="entry-card">
            <div class="entry-top">
              <span class="entry-role">${e.role}</span>
              <span class="entry-date">${e.start || ''}${e.start && e.end ? ' — ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-company">${e.company}${data.location ? ` / ${data.location}` : ''}</div>
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
        <h2 class="section-title">Education</h2>
        ${data.education.map(e => `
          <div class="entry-card">
            <div class="entry-top">
              <span class="entry-role">${e.degree}</span>
              <span class="entry-date">${e.start || ''}${e.start && e.end ? ' — ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-company">${e.school}${e.note ? ` (${e.note})` : ''}</div>
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderSkills = () => {
    if (!data.skills || !data.skills.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Expertise</h2>
        <div class="skills-wrap">
          ${data.skills.map(s => `<span class="skill-tag">${s.replace(/ - (Expert|Advanced|Intermediate)$/, '')}</span>`).join('')}
        </div>
      </section>
    `;
  };

  const renderProjects = () => {
    if (!data.projects || !data.projects.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Projects</h2>
        ${data.projects.map(p => `
          <div class="entry-card">
            <div class="entry-top">
              <span class="entry-role">${p.name}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${p.url}</a></span>` : ''}
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
        <h2 class="section-title">Certificates</h2>
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
        <h2 class="section-title">${cs.title || 'Other'}</h2>
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
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .candidate-name {
      font-size: 24pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .candidate-title {
      font-size: 10.5pt;
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
    .nordic-contact-link {
      color: inherit;
      text-decoration: none;
    }
    .cv-section {
      margin-bottom: 13px;
      break-inside: auto;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      margin-bottom: 6px;
      padding-bottom: 2px;
      border-bottom: 1px solid #f1f5f9;
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
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.3pt;
      font-weight: 500;
      color: #64748b;
    }
    .entry-company {
      font-size: 8.8pt;
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
    .skills-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .skill-tag {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 2px 7px;
      font-size: 8.2pt;
      font-weight: 500;
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
