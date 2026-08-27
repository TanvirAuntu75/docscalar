// ═══════════════════════════════════════════════════════════════════════════════
// 3. JONATHAN — Classic Editorial Serif Single-Column Layout (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateJonathanHtml(
  data,
  themeColor = '#1a1a1a',
  themeFont = 'Playfair Display',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#1a1a1a' : themeColor;
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : "'Playfair Display', Georgia, serif";

  const initials = data.name ? data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CV';

  const contactParts = [];
  if (data.email) contactParts.push(`<a href="mailto:${data.email}" style="color: inherit; text-decoration: none;">${data.email}</a>`);
  if (data.phone) contactParts.push(`<span>${data.phone}</span>`);
  if (data.location) contactParts.push(`<span>${data.location}</span>`);
  if (data.linkedin) {
    const cleanLi = data.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    contactParts.push(`<a href="https://${cleanLi}" target="_blank" style="color: inherit; text-decoration: none;">${cleanLi}</a>`);
  }
  if (data.website) {
    const cleanWeb = data.website.replace(/^https?:\/\/(www\.)?/, '');
    contactParts.push(`<a href="https://${cleanWeb}" target="_blank" style="color: inherit; text-decoration: none;">${cleanWeb}</a>`);
  }

  const renderSummary = () => {
    if (!data.summary?.trim()) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Professional Summary</h2>
        <div class="section-line"></div>
        <div class="section-content">${data.summary}</div>
      </section>
    `;
  };

  const renderExperience = () => {
    if (!data.experience || !data.experience.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Experience</h2>
        <div class="section-line"></div>
        ${data.experience.map(e => `
          <div class="entry-block">
            <div class="entry-header">
              <span class="entry-title">${e.company}${data.location ? ` | ${data.location}` : ''}</span>
              <span class="entry-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-role">${e.role}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="entry-desc">
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
        <div class="section-line"></div>
        ${data.education.map(e => `
          <div class="entry-block">
            <div class="entry-header">
              <span class="entry-title">${e.school}${data.location ? ` | ${data.location}` : ''}</span>
              <span class="entry-date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span>
            </div>
            <div class="entry-role">${e.degree}${e.note ? ` : ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderSkills = () => {
    if (!data.skills || !data.skills.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Skills & Proficiencies</h2>
        <div class="section-line"></div>
        <div class="skills-grid">
          ${data.skills.map((s) => {
            let name = s;
            let levelText = '';
            if (s.includes(' - ')) {
              const parts = s.split(' - ');
              name = parts[0];
              levelText = parts[1];
            }
            return `
              <div class="skill-item">
                <span class="skill-name">• ${name}</span>
                ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderProjects = () => {
    if (!data.projects || !data.projects.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Projects</h2>
        <div class="section-line"></div>
        ${data.projects.map(p => `
          <div class="entry-block">
            <div class="entry-header">
              <span class="entry-title">${p.name}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="project-desc">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderCertifications = () => {
    if (!data.certifications || !data.certifications.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title">Certifications</h2>
        <div class="section-line"></div>
        <ul class="entry-desc">
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
        <div class="section-line"></div>
        <div class="skills-grid">
          ${data.references.map(r => `
            <div class="entry-block">
              <div class="entry-title">${r.name}</div>
              <div class="entry-role">${r.relation}</div>
              <div style="font-size: 8.5pt; color: #666; margin-top: 2px;">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderCustomSections = () => {
    const custom = data.customSections || [];
    if (!custom.length) return '';
    return custom.map(cs => `
      <section class="cv-section">
        <h2 class="section-title">${cs.title || 'Additional Information'}</h2>
        <div class="section-line"></div>
        <div class="skills-grid">
          ${cs.items.map(i => `
            <div>
              <strong>${i.title}</strong>${i.value ? `: ${i.value}` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `).join('\n');
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Inter', sans-serif;
      background: #fdfdfc;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-wrapper {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: ${45 + pageMargin}px ${45 + pageMargin}px;
      background: #fdfdfc;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .initials-circle {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: 1.5px solid ${accent};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 10px auto;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 16pt;
      font-weight: 600;
      color: ${accent};
    }
    .name-header {
      text-align: center;
      margin-bottom: 8px;
    }
    .name-header h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accent};
      margin-bottom: 4px;
      line-height: 1.1;
    }
    .name-header .title-sub {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      font-weight: 500;
      color: #4a4a4a;
      margin-bottom: 6px;
    }
    .name-header .contact {
      font-size: 8.5pt;
      color: #5a5a5a;
      letter-spacing: 0.3px;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px 12px;
    }
    .cv-section {
      break-inside: auto;
    }
    .section-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 3px;
      text-transform: capitalize;
    }
    .section-line {
      border-bottom: 1.5px solid #d3d3d3;
      margin-bottom: 10px;
    }
    .section-content {
      font-size: 9.3pt;
      color: #3a3a3a;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    .entry-block {
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 9.5pt;
      font-weight: 700;
      color: #1a1a1a;
    }
    .entry-title {
      font-weight: 700;
    }
    .entry-date {
      font-weight: 500;
      font-style: italic;
      color: #5a5a5a;
      font-size: 8.8pt;
    }
    .entry-role {
      font-size: 9.2pt;
      font-style: italic;
      font-weight: 600;
      color: #3a3a3a;
      margin-top: 1px;
      margin-bottom: 4px;
    }
    .entry-desc {
      padding-left: 16px;
      font-size: 9pt;
      color: #3a3a3a;
      line-height: ${lineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    .project-desc {
      font-size: 8.8pt;
      color: #3a3a3a;
      margin-top: 2px;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 24px;
      font-size: 9pt;
    }
    .skill-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      color: #3a3a3a;
    }
    .skill-name {
      font-weight: 500;
    }
    .skill-level {
      color: #6a6a6a;
      font-size: 8.5pt;
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <header>
      <div class="initials-circle">${initials}</div>
      <div class="name-header">
        <h1>${data.name || 'Candidate Name'}</h1>
        ${data.title ? `<div class="title-sub">${data.title}</div>` : ''}
        <div class="contact">${contactParts.join('  |  ')}</div>
      </div>
    </header>

    ${renderSummary()}
    ${renderExperience()}
    ${renderEducation()}
    ${renderSkills()}
    ${renderProjects()}
    ${renderCertifications()}
    ${renderCustomSections()}
    ${renderReferences()}
  </div>
</body>
</html>`;
}