// ═══════════════════════════════════════════════════════════════════════════════
// STANFORD TECH — Modern Silicon Valley Engineering & Product Resume
// ═══════════════════════════════════════════════════════════════════════════════

export function generateStanfordTechHtml(
  data,
  themeColor = '#1d4ed8',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'projects', 'skills', 'education', 'certifications'],
  themeLayout = 'single',
  pageMargin = 18,
  lineSpacing = 1.38
) {
  const accent = themeColor === 'default' || !themeColor ? '#1d4ed8' : themeColor;
  const fontFam = themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', serif" : "'Inter', system-ui, -apple-system, sans-serif";

  const contactItems = [];
  if (data.email) contactItems.push(`<a href="mailto:${data.email}" class="contact-link"><svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${data.email}</a>`);
  if (data.phone) contactItems.push(`<span class="contact-link"><svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${data.phone}</span>`);
  if (data.location) contactItems.push(`<span class="contact-link"><svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${data.location}</span>`);
  if (data.linkedin) {
    const cleanLi = data.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanLi}" target="_blank" class="contact-link"><svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>${cleanLi}</a>`);
  }
  if (data.website) {
    const cleanWeb = data.website.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanWeb}" target="_blank" class="contact-link"><svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>${cleanWeb}</a>`);
  }

  const renderSummary = () => {
    if (!data.summary?.trim()) return '';
    return `
      <section class="cv-section">
        <div class="section-title-bar">
          <span class="section-title-text">Summary</span>
          <div class="section-rule"></div>
        </div>
        <div class="summary-body">${data.summary}</div>
      </section>
    `;
  };

  const renderExperience = () => {
    if (!data.experience || !data.experience.length) return '';
    return `
      <section class="cv-section">
        <div class="section-title-bar">
          <span class="section-title-text">Experience</span>
          <div class="section-rule"></div>
        </div>
        ${data.experience.map(e => `
          <div class="entry-card">
            <div class="entry-header">
              <div class="entry-role">${e.role}</div>
              <div class="entry-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
            </div>
            <div class="entry-sub">${e.company}${data.location ? ` · <span class="entry-loc">${data.location}</span>` : ''}</div>
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
        <div class="section-title-bar">
          <span class="section-title-text">Projects & Technical Highlights</span>
          <div class="section-rule"></div>
        </div>
        ${data.projects.map(p => `
          <div class="entry-card">
            <div class="entry-header">
              <div class="entry-role">${p.name}</div>
              ${p.url ? `<div class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; font-weight: 500; text-decoration: none;">${p.url} ↗</a></div>` : ''}
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
        <div class="section-title-bar">
          <span class="section-title-text">Technical Skills</span>
          <div class="section-rule"></div>
        </div>
        <div class="skills-pill-grid">
          ${data.skills.map(s => {
            const clean = s.replace(/ - (Expert|Advanced|Intermediate)$/, '');
            return `<span class="skill-pill">${clean}</span>`;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderEducation = () => {
    if (!data.education || !data.education.length) return '';
    return `
      <section class="cv-section">
        <div class="section-title-bar">
          <span class="section-title-text">Education</span>
          <div class="section-rule"></div>
        </div>
        ${data.education.map(e => `
          <div class="entry-card">
            <div class="entry-header">
              <div class="entry-role">${e.school}</div>
              <div class="entry-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
            </div>
            <div class="entry-sub">${e.degree}${e.note ? ` · <span style="font-weight: 500; color: #4b5563;">${e.note}</span>` : ''}</div>
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderCertifications = () => {
    if (!data.certifications || !data.certifications.length) return '';
    return `
      <section class="cv-section">
        <div class="section-title-bar">
          <span class="section-title-text">Certifications & Accreditations</span>
          <div class="section-rule"></div>
        </div>
        <div class="cert-grid">
          ${data.certifications.map(c => `
            <div class="cert-item">
              <span class="cert-bullet">▪</span>
              <span>${c}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderReferences = () => {
    if (!data.references || !data.references.length) return '';
    return `
      <section class="cv-section">
        <div class="section-title-bar">
          <span class="section-title-text">References</span>
          <div class="section-rule"></div>
        </div>
        <div class="ref-grid">
          ${data.references.map(r => `
            <div class="entry-card">
              <div class="entry-role">${r.name}</div>
              <div class="entry-sub">${r.relation}</div>
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
        <div class="section-title-bar">
          <span class="section-title-text">${cs.title || 'Additional Information'}</span>
          <div class="section-rule"></div>
        </div>
        <div class="custom-grid">
          ${cs.items.map(it => `
            <div class="custom-card">
              <span class="custom-key">${it.title}</span>
              ${it.value ? `<span class="custom-val">${it.value}</span>` : ''}
            </div>
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
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
      color: #0f172a;
      font-family: ${fontFam};
      font-size: 9.5pt;
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
    .header-box {
      margin-bottom: 14px;
      padding-bottom: 12px;
    }
    .candidate-name {
      font-size: 24pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.6px;
      line-height: 1.1;
      margin-bottom: 3px;
    }
    .candidate-title {
      font-size: 11pt;
      font-weight: 600;
      color: ${accent};
      margin-bottom: 8px;
    }
    .contact-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px 16px;
      font-size: 8.5pt;
      color: #475569;
    }
    .contact-link {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #475569;
      text-decoration: none;
    }
    .contact-icon {
      width: 12px;
      height: 12px;
      color: ${accent};
      flex-shrink: 0;
    }
    .cv-section {
      margin-bottom: 14px;
      break-inside: auto;
    }
    .section-title-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .section-title-text {
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: ${accent};
      white-space: nowrap;
    }
    .section-rule {
      flex: 1;
      height: 1.5px;
      background: #e2e8f0;
    }
    .summary-body {
      font-size: 9pt;
      color: #334155;
      line-height: 1.45;
      text-align: justify;
    }
    .entry-card {
      margin-bottom: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .entry-role {
      font-size: 9.8pt;
      font-weight: 700;
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.5pt;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .entry-sub {
      font-size: 9pt;
      font-weight: 600;
      color: #475569;
      margin-bottom: 3px;
    }
    .entry-loc {
      font-weight: 400;
      color: #64748b;
    }
    .bullet-list {
      padding-left: 16px;
      margin-top: 3px;
      font-size: 9pt;
      color: #334155;
    }
    .bullet-list li {
      margin-bottom: 2.5px;
      text-align: justify;
    }
    .entry-desc {
      font-size: 8.8pt;
      color: #475569;
      margin-top: 2px;
    }
    .skills-pill-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .skill-pill {
      background: #f1f5f9;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 8.3pt;
      font-weight: 600;
    }
    .cert-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 12px;
    }
    .cert-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 8.8pt;
      color: #334155;
    }
    .cert-bullet {
      color: ${accent};
      font-size: 8pt;
    }
    .custom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
    }
    .custom-card {
      display: flex;
      justify-content: space-between;
      font-size: 8.8pt;
      padding: 4px 0;
      border-bottom: 1px dashed #f1f5f9;
    }
    .custom-key {
      font-weight: 600;
      color: #1e293b;
    }
    .custom-val {
      color: #64748b;
    }
    .ref-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <header class="header-box">
      <h1 class="candidate-name">${data.name || 'Candidate Name'}</h1>
      ${data.title ? `<div class="candidate-title">${data.title}</div>` : ''}
      <div class="contact-row">
        ${contactItems.join('')}
      </div>
    </header>

    <main class="main-content">
      ${dynamicSections}
    </main>
  </div>
</body>
</html>`;
}
