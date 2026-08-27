// ═══════════════════════════════════════════════════════════════════════════════
// ZURICH SPLIT — European Professional Two-Column Split Architecture
// ═══════════════════════════════════════════════════════════════════════════════

export function generateZurichSplitHtml(
  data,
  themeColor = '#0f766e',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'projects', 'education', 'skills', 'certifications'],
  themeLayout = 'split',
  pageMargin = 0,
  lineSpacing = 1.38
) {
  const accent = themeColor === 'default' || !themeColor ? '#0f766e' : themeColor;
  const fontFam = themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', serif" : "'Inter', -apple-system, system-ui, sans-serif";

  const renderContact = () => `
    <div class="sidebar-block">
      <h3 class="sidebar-heading">Contact</h3>
      <div class="sidebar-content">
        ${data.email ? `<div class="sidebar-contact-item"><span class="sb-label">Email</span><a href="mailto:${data.email}" class="sb-val">${data.email}</a></div>` : ''}
        ${data.phone ? `<div class="sidebar-contact-item"><span class="sb-label">Phone</span><span class="sb-val">${data.phone}</span></div>` : ''}
        ${data.location ? `<div class="sidebar-contact-item"><span class="sb-label">Location</span><span class="sb-val">${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="sidebar-contact-item"><span class="sb-label">LinkedIn</span><a href="https://${data.linkedin.replace(/^https?:\/\/(www\.)?/, '')}" target="_blank" class="sb-val">${data.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</a></div>` : ''}
        ${data.website ? `<div class="sidebar-contact-item"><span class="sb-label">Portfolio</span><a href="https://${data.website.replace(/^https?:\/\/(www\.)?/, '')}" target="_blank" class="sb-val">${data.website.replace(/^https?:\/\/(www\.)?/, '')}</a></div>` : ''}
      </div>
    </div>
  `;

  const renderSidebarEducation = () => {
    if (!data.education || !data.education.length) return '';
    return `
      <div class="sidebar-block">
        <h3 class="sidebar-heading">Education</h3>
        ${data.education.map(e => `
          <div class="sb-edu-item">
            <div class="sb-edu-degree">${e.degree}</div>
            <div class="sb-edu-school">${e.school}</div>
            <div class="sb-edu-dates">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
            ${e.note ? `<div class="sb-edu-note">${e.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  const renderSidebarSkills = () => {
    if (!data.skills || !data.skills.length) return '';
    return `
      <div class="sidebar-block">
        <h3 class="sidebar-heading">Key Skills</h3>
        <div class="sb-skills-list">
          ${data.skills.map(s => {
            const clean = s.replace(/ - (Expert|Advanced|Intermediate)$/, '');
            return `<div class="sb-skill-tag">${clean}</div>`;
          }).join('')}
        </div>
      </div>
    `;
  };

  const renderSidebarCertifications = () => {
    if (!data.certifications || !data.certifications.length) return '';
    return `
      <div class="sidebar-block">
        <h3 class="sidebar-heading">Certifications</h3>
        <div class="sb-certs-list">
          ${data.certifications.map(c => `<div class="sb-cert-item">▪ ${c}</div>`).join('')}
        </div>
      </div>
    `;
  };

  const renderSidebarCustom = () => {
    const langSec = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
    if (!langSec || !langSec.items || !langSec.items.length) return '';
    return `
      <div class="sidebar-block">
        <h3 class="sidebar-heading">${langSec.title || 'Languages'}</h3>
        <div class="sb-certs-list">
          ${langSec.items.map(i => `<div class="sb-cert-item"><strong>${i.title}</strong>${i.value ? `: ${i.value}` : ''}</div>`).join('')}
        </div>
      </div>
    `;
  };

  // Main Column Sections
  const renderMainSummary = () => {
    if (!data.summary?.trim()) return '';
    return `
      <section class="main-section">
        <h2 class="main-heading">Professional Summary</h2>
        <div class="main-summary-text">${data.summary}</div>
      </section>
    `;
  };

  const renderMainExperience = () => {
    if (!data.experience || !data.experience.length) return '';
    return `
      <section class="main-section">
        <h2 class="main-heading">Experience</h2>
        ${data.experience.map(e => `
          <div class="main-entry">
            <div class="main-entry-top">
              <span class="main-entry-role">${e.role}</span>
              <span class="main-entry-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="main-entry-company">${e.company}${data.location ? ` · ${data.location}` : ''}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="main-bullet-list">
                ${e.highlights.filter(Boolean).map(h => `<li>${h}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderMainProjects = () => {
    if (!data.projects || !data.projects.length) return '';
    return `
      <section class="main-section">
        <h2 class="main-heading">Projects</h2>
        ${data.projects.map(p => `
          <div class="main-entry">
            <div class="main-entry-top">
              <span class="main-entry-role">${p.name}</span>
              ${p.url ? `<span class="main-entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="main-entry-desc">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderMainCustom = () => {
    const otherCustom = (data.customSections || []).filter(cs => cs.id !== 'custom_languages' && cs.title?.toLowerCase() !== 'languages');
    if (!otherCustom.length) return '';
    return otherCustom.map(cs => `
      <section class="main-section">
        <h2 class="main-heading">${cs.title || 'Additional Information'}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; font-size: 8.8pt;">
          ${cs.items.map(it => `
            <div><strong>${it.title}</strong>${it.value ? `: ${it.value}` : ''}</div>
          `).join('')}
        </div>
      </section>
    `).join('\n');
  };

  const renderMainReferences = () => {
    if (!data.references || !data.references.length) return '';
    return `
      <section class="main-section">
        <h2 class="main-heading">References</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          ${data.references.map(r => `
            <div class="main-entry">
              <div class="main-entry-role">${r.name}</div>
              <div class="main-entry-company">${r.relation}</div>
              <div class="main-entry-desc">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

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
      display: flex;
      background: #ffffff;
    }
    .sidebar {
      width: 32%;
      background: #f8fafc;
      border-right: 1px solid #e2e8f0;
      padding: 32px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .avatar-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
    }
    .avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid ${accent};
      object-fit: cover;
    }
    .sidebar-block {
      break-inside: avoid;
    }
    .sidebar-heading {
      font-size: 9.2pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: ${accent};
      border-bottom: 1.5px solid ${accent};
      padding-bottom: 2px;
      margin-bottom: 8px;
    }
    .sidebar-contact-item {
      margin-bottom: 6px;
      font-size: 8.5pt;
    }
    .sb-label {
      display: block;
      font-weight: 700;
      font-size: 7.5pt;
      text-transform: uppercase;
      color: #64748b;
    }
    .sb-val {
      color: #1e293b;
      text-decoration: none;
      word-break: break-all;
    }
    .sb-edu-item {
      margin-bottom: 8px;
    }
    .sb-edu-degree {
      font-weight: 700;
      font-size: 8.8pt;
      color: #0f172a;
    }
    .sb-edu-school {
      font-size: 8.3pt;
      color: #475569;
    }
    .sb-edu-dates {
      font-size: 8pt;
      color: #64748b;
    }
    .sb-edu-note {
      font-size: 8pt;
      color: #64748b;
    }
    .sb-skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .sb-skill-tag {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
      color: #334155;
    }
    .sb-certs-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 8.3pt;
      color: #334155;
    }
    .main-column {
      width: 68%;
      padding: 34px 28px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .main-header {
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 10px;
    }
    .candidate-name {
      font-size: 22pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
      letter-spacing: -0.4px;
    }
    .candidate-title {
      font-size: 10.5pt;
      font-weight: 600;
      color: ${accent};
      margin-top: 3px;
    }
    .main-section {
      break-inside: auto;
    }
    .main-heading {
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: ${accent};
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
      margin-bottom: 8px;
    }
    .main-summary-text {
      font-size: 9pt;
      color: #334155;
      line-height: 1.45;
      text-align: justify;
    }
    .main-entry {
      margin-bottom: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .main-entry-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .main-entry-role {
      font-size: 9.8pt;
      font-weight: 700;
      color: #0f172a;
    }
    .main-entry-date {
      font-size: 8.5pt;
      font-weight: 600;
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }
    .main-entry-company {
      font-size: 9pt;
      font-weight: 600;
      color: #475569;
      margin-bottom: 2px;
    }
    .main-bullet-list {
      padding-left: 16px;
      margin-top: 3px;
      font-size: 9pt;
      color: #334155;
    }
    .main-bullet-list li {
      margin-bottom: 2px;
      text-align: justify;
    }
    .main-entry-desc {
      font-size: 8.8pt;
      color: #475569;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <aside class="sidebar">
      ${data.photoUrl ? `
        <div class="avatar-wrap">
          <img class="avatar" src="${data.photoUrl}" alt="Photo" />
        </div>
      ` : ''}
      ${renderContact()}
      ${renderSidebarSkills()}
      ${renderSidebarEducation()}
      ${renderSidebarCertifications()}
      ${renderSidebarCustom()}
    </aside>

    <main class="main-column">
      <header class="main-header">
        <h1 class="candidate-name">${data.name || 'Candidate Name'}</h1>
        ${data.title ? `<div class="candidate-title">${data.title}</div>` : ''}
      </header>

      ${renderMainSummary()}
      ${renderMainExperience()}
      ${renderMainProjects()}
      ${renderMainCustom()}
      ${renderMainReferences()}
    </main>
  </div>
</body>
</html>`;
}
