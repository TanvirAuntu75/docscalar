// ═══════════════════════════════════════════════════════════════════════════════
// OXFORD ACADEMIC — Scholarly, Research & Higher Education Curriculum Vitae
// ═══════════════════════════════════════════════════════════════════════════════

export function generateOxfordAcademicHtml(
  data,
  themeColor = '#1e293b',
  themeFont = 'Merriweather',
  sectionOrder = ['education', 'experience', 'projects', 'skills', 'certifications', 'references'],
  themeLayout = 'single',
  pageMargin = 22,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#1e293b' : themeColor;
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Merriweather', Georgia, serif";

  const contactItems = [];
  if (data.email) contactItems.push(`<a href="mailto:${data.email}" style="color: inherit; text-decoration: none;">${data.email}</a>`);
  if (data.phone) contactItems.push(`<span>${data.phone}</span>`);
  if (data.location) contactItems.push(`<span>${data.location}</span>`);
  if (data.website) {
    const cleanWeb = data.website.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanWeb}" target="_blank" style="color: inherit; text-decoration: none;">${cleanWeb}</a>`);
  }
  if (data.linkedin) {
    const cleanLi = data.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanLi}" target="_blank" style="color: inherit; text-decoration: none;">${cleanLi}</a>`);
  }

  const renderSummary = () => {
    if (!data.summary?.trim()) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Research Interests & Focus</h2>
        <div class="summary-body">${data.summary}</div>
      </section>
    `;
  };

  const renderEducation = () => {
    if (!data.education || !data.education.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Academic Background</h2>
        ${data.education.map(e => `
          <div class="entry-block">
            <div class="entry-top">
              <span class="entry-degree">${e.degree}</span>
              <span class="entry-dates">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-school">${e.school}${data.location ? `, ${data.location}` : ''}</div>
            ${e.note ? `<div class="entry-note">Dissertation / Focus: ${e.note}</div>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderExperience = () => {
    if (!data.experience || !data.experience.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Academic & Professional Appointments</h2>
        ${data.experience.map(e => `
          <div class="entry-block">
            <div class="entry-top">
              <span class="entry-role">${e.role}</span>
              <span class="entry-dates">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-school">${e.company}</div>
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
        <h2 class="section-title">Research Projects & Grants</h2>
        ${data.projects.map(p => `
          <div class="entry-block">
            <div class="entry-top">
              <span class="entry-role">${p.name}</span>
              ${p.url ? `<span class="entry-dates">${p.url}</span>` : ''}
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
        <h2 class="section-title">Methodologies & Technical Proficiencies</h2>
        <div class="skills-line">
          ${data.skills.map(s => s.replace(/ - (Expert|Advanced|Intermediate)$/, '')).join(' · ')}
        </div>
      </section>
    `;
  };

  const renderCertifications = () => {
    if (!data.certifications || !data.certifications.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Fellowships, Honors & Awards</h2>
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
        <h2 class="section-title">Academic References</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          ${data.references.map(r => `
            <div class="entry-block">
              <div style="font-weight: 700; font-size: 9.8pt; color: #111;">${r.name}</div>
              <div style="font-size: 8.8pt; font-style: italic; color: #475569;">${r.relation}</div>
              <div style="font-size: 8.5pt; color: #64748b;">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
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
        <h2 class="section-title">${cs.title || 'Additional Details'}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; font-size: 9pt;">
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
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
      font-size: 9.6pt;
      line-height: ${lineSpacing};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-wrapper {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: ${pageMargin + 10}px ${pageMargin + 18}px;
      background: #ffffff;
    }
    .header-box {
      text-align: center;
      margin-bottom: 16px;
      padding-bottom: 14px;
      border-bottom: 1.5px solid #000;
    }
    .candidate-name {
      font-size: 23pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.2px;
      line-height: 1.1;
      margin-bottom: 3px;
    }
    .candidate-title {
      font-size: 10.5pt;
      font-style: italic;
      color: #475569;
      margin-bottom: 6px;
    }
    .contact-line {
      font-size: 8.7pt;
      color: #475569;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px 14px;
    }
    .cv-section {
      margin-bottom: 14px;
      break-inside: auto;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: ${accent};
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
      margin-bottom: 8px;
    }
    .summary-body {
      font-size: 9.3pt;
      color: #334155;
      line-height: 1.5;
      text-align: justify;
    }
    .entry-block {
      margin-bottom: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .entry-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .entry-degree, .entry-role {
      font-weight: 700;
      font-size: 9.8pt;
      color: #0f172a;
    }
    .entry-dates {
      font-size: 8.8pt;
      font-style: italic;
      color: #64748b;
    }
    .entry-school {
      font-size: 9.2pt;
      font-style: italic;
      color: #475569;
    }
    .entry-note {
      font-size: 8.8pt;
      color: #64748b;
      margin-top: 1px;
    }
    .bullet-list {
      padding-left: 18px;
      margin-top: 3px;
      font-size: 9.2pt;
      color: #334155;
    }
    .bullet-list li {
      margin-bottom: 3px;
      text-align: justify;
    }
    .entry-desc {
      font-size: 9pt;
      color: #475569;
      margin-top: 2px;
    }
    .skills-line {
      font-size: 9.2pt;
      color: #334155;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <header class="header-box">
      <h1 class="candidate-name">${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="candidate-title">${data.title}</div>` : ''}
      <div class="contact-line">
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
