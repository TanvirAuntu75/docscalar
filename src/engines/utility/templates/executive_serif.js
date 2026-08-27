// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE SERIF — Senior Leadership & C-Suite Strategic Resume
// ═══════════════════════════════════════════════════════════════════════════════

export function generateExecutiveSerifHtml(
  data,
  themeColor = '#1e3a5f',
  themeFont = 'Playfair Display',
  sectionOrder = ['summary', 'experience', 'skills', 'education', 'certifications', 'projects'],
  themeLayout = 'single',
  pageMargin = 22,
  lineSpacing = 1.42
) {
  const accent = themeColor === 'default' || !themeColor ? '#1e3a5f' : themeColor;

  const contactItems = [];
  if (data.location) contactItems.push(`<span>${data.location}</span>`);
  if (data.phone) contactItems.push(`<span>${data.phone}</span>`);
  if (data.email) contactItems.push(`<a href="mailto:${data.email}" style="color: inherit; text-decoration: none;">${data.email}</a>`);
  if (data.linkedin) {
    const cleanLi = data.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanLi}" target="_blank" style="color: inherit; text-decoration: none;">${cleanLi}</a>`);
  }
  if (data.website) {
    const cleanWeb = data.website.replace(/^https?:\/\/(www\.)?/, '');
    contactItems.push(`<a href="https://${cleanWeb}" target="_blank" style="color: inherit; text-decoration: none;">${cleanWeb}</a>`);
  }

  const renderSummary = () => {
    if (!data.summary?.trim()) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Executive Profile</h2>
        <div class="summary-box">
          ${data.summary}
        </div>
      </section>
    `;
  };

  const renderExperience = () => {
    if (!data.experience || !data.experience.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Executive Career History</h2>
        ${data.experience.map(e => `
          <div class="entry-block">
            <div class="entry-top">
              <span class="entry-role">${e.role}</span>
              <span class="entry-dates">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-org">${e.company}${data.location ? ` | ${data.location}` : ''}</div>
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

  const renderSkills = () => {
    if (!data.skills || !data.skills.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Core Competencies & Leadership Capabilities</h2>
        <div class="skills-grid">
          ${data.skills.map(s => {
            const clean = s.replace(/ - (Expert|Advanced|Intermediate)$/, '');
            return `<div class="skill-item"><span class="skill-bullet">◆</span><span>${clean}</span></div>`;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderEducation = () => {
    if (!data.education || !data.education.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Education & Academic Credentials</h2>
        ${data.education.map(e => `
          <div class="entry-block">
            <div class="entry-top">
              <span class="entry-role">${e.degree}</span>
              <span class="entry-dates">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-org">${e.school}${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderProjects = () => {
    if (!data.projects || !data.projects.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Key Initiatives & Programs</h2>
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

  const renderCertifications = () => {
    if (!data.certifications || !data.certifications.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Board Affiliations & Certifications</h2>
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
        <h2 class="section-title">Professional Endorsements</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          ${data.references.map(r => `
            <div class="entry-block">
              <div style="font-weight: 700; font-size: 9.8pt; color: #111;">${r.name}</div>
              <div style="font-size: 8.8pt; font-style: italic; color: #4b5563;">${r.relation}</div>
              <div style="font-size: 8.5pt; color: #6b7280; margin-top: 2px;">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
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
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; font-size: 9pt;">
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
    skills: renderSkills,
    education: renderEducation,
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
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
      color: #1a202c;
      font-family: 'Inter', sans-serif;
      font-size: 9.5pt;
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
    .header-box {
      border-bottom: 2px solid ${accent};
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .candidate-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26pt;
      font-weight: 700;
      color: ${accent};
      letter-spacing: -0.5px;
      line-height: 1.1;
      margin-bottom: 3px;
    }
    .candidate-title {
      font-size: 11pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #4a5568;
      margin-bottom: 6px;
    }
    .contact-row {
      font-size: 8.5pt;
      color: #718096;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
    }
    .cv-section {
      margin-bottom: 14px;
      break-inside: auto;
    }
    .section-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11.5pt;
      font-weight: 700;
      color: ${accent};
      letter-spacing: 0.2px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .summary-box {
      font-size: 9.3pt;
      color: #2d3748;
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
    .entry-role {
      font-size: 10pt;
      font-weight: 700;
      color: #1a202c;
    }
    .entry-dates {
      font-size: 8.8pt;
      font-weight: 600;
      color: #718096;
    }
    .entry-org {
      font-size: 9.2pt;
      font-style: italic;
      color: #4a5568;
      margin-bottom: 3px;
    }
    .bullet-list {
      padding-left: 18px;
      margin-top: 3px;
      font-size: 9.2pt;
      color: #2d3748;
    }
    .bullet-list li {
      margin-bottom: 3px;
      text-align: justify;
    }
    .entry-desc {
      font-size: 9pt;
      color: #4a5568;
      margin-top: 2px;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px 12px;
      font-size: 8.8pt;
    }
    .skill-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #2d3748;
      font-weight: 500;
    }
    .skill-bullet {
      color: ${accent};
      font-size: 6.5pt;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <header class="header-box">
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
