// ═══════════════════════════════════════════════════════════════════════════════
// 3. JONATHAN — Classic Editorial Serif Single-Column Layout (Hardened & Paginated)
// ═══════════════════════════════════════════════════════════════════════════════

import { computeTwoPagePartition } from '../paginationEngine.js';

export function generateJonathanHtml(
  data,
  themeColor = '#1a1a1a',
  themeFont = 'Playfair Display',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#1a1a1a' : themeColor;
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : "'Playfair Display', Georgia, serif";

  const initials = data.name ? (data.name || '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CV';

  const contactParts = [];
  if (data.email) contactParts.push(`<a href="mailto:${data.email}" data-df-field="email" style="color: inherit; text-decoration: none;">${data.email}</a>`);
  if (data.phone) contactParts.push(`<span data-df-field="phone">${data.phone}</span>`);
  if (data.location) contactParts.push(`<span data-df-field="location">${data.location}</span>`);
  if (data.linkedin) {
    const cleanLi = data.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    contactParts.push(`<a href="https://${cleanLi}" target="_blank" data-df-field="linkedin" style="color: inherit; text-decoration: none;">${cleanLi}</a>`);
  }
  if (data.website) {
    const cleanWeb = data.website.replace(/^https?:\/\/(www\.)?/, '');
    contactParts.push(`<a href="https://${cleanWeb}" target="_blank" data-df-field="website" style="color: inherit; text-decoration: none;">${cleanWeb}</a>`);
  }
  if (data.github) {
    const cleanGit = data.github.replace(/^https?:\/\/(www\.)?/, '');
    contactParts.push(`<a href="https://${cleanGit}" target="_blank" data-df-field="github" style="color: inherit; text-decoration: none;">${cleanGit}</a>`);
  }

  const { partitions } = computeTwoPagePartition({
    data,
    sectionOrder,
    pageMargin,
    lineSpacing,
    baseHeaderHeight: 140,
    totalPageHeight: 1043
  });

  const renderSummary = () => {
    if (!data.summary?.trim()) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'Professional Summary'}</h2>
        <div class="section-line"></div>
        <div class="section-content" data-df-field="summary">${data.summary}</div>
      </section>
    `;
  };

  const renderExperienceItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title section-heading" data-df-field="heading:experience">${isContinuation ? (data.sectionTitles?.experience ? `${data.sectionTitles.experience} (Continued)` : 'Experience (Continued)') : (data.sectionTitles?.experience || 'Experience')}</h2>
        <div class="section-line"></div>
        ${items.map((e, idx) => {
          const actualIdx = globalOffset + idx;
          const dateStr = `${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}`;
          return `
            <div class="entry-block">
              <div class="entry-header">
                <span class="entry-title"><span data-df-field="exp:${actualIdx}:company">${e.company}</span>${data.location ? ` | <span data-df-field="exp:${actualIdx}:location">${data.location}</span>` : ''}</span>
                <span class="entry-date" data-df-field="exp:${actualIdx}:date">${dateStr}</span>
              </div>
              <div class="entry-role" data-df-field="exp:${actualIdx}:role">${e.role}</div>
              ${e.highlights && e.highlights.filter(Boolean).length ? `
                <ul class="entry-desc">
                  ${e.highlights.filter(Boolean).map((h, hIdx) => `
                    <li data-df-field="exp:${actualIdx}:highlight:${hIdx}">${h}</li>
                  `).join('')}
                </ul>
              ` : ''}
            </div>
          `;
        }).join('')}
      </section>
    `;
  };

  const renderEducationItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title section-heading" data-df-field="heading:education">${isContinuation ? (data.sectionTitles?.education ? `${data.sectionTitles.education} (Continued)` : 'Education (Continued)') : (data.sectionTitles?.education || 'Education')}</h2>
        <div class="section-line"></div>
        ${items.map((e, idx) => {
          const actualIdx = globalOffset + idx;
          const dateStr = `${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}`;
          return `
            <div class="entry-block">
              <div class="entry-header">
                <span class="entry-title" data-df-field="edu:${actualIdx}:school">${e.school}</span>
                <span class="entry-date" data-df-field="edu:${actualIdx}:date">${dateStr}</span>
              </div>
              <div class="entry-role" data-df-field="edu:${actualIdx}:degree">${e.degree}${e.note ? ` : ${e.note}` : ''}</div>
            </div>
          `;
        }).join('')}
      </section>
    `;
  };

  const renderSkills = () => {
    if (!data.skills || !data.skills.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills & Proficiencies'}</h2>
        <div class="section-line"></div>
        <div class="skills-grid">
          ${data.skills.map((s, sIdx) => {
            let name = s;
            let levelText = '';
            if (s.includes(' - ')) {
              const parts = s.split(' - ');
              name = parts[0];
              levelText = parts[1];
            }
            return `
              <div class="skill-item">
                <span class="skill-name" data-df-field="skill:${sIdx}">• ${name}</span>
                ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  const renderProjectItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title section-heading" data-df-field="heading:projects">${isContinuation ? (data.sectionTitles?.projects ? `${data.sectionTitles.projects} (Continued)` : 'Projects (Continued)') : (data.sectionTitles?.projects || 'Projects')}</h2>
        <div class="section-line"></div>
        ${items.map((p, idx) => {
          const actualIdx = globalOffset + idx;
          return `
            <div class="entry-block">
              <div class="entry-header">
                <span class="entry-title" data-df-field="proj:${actualIdx}:name">${p.name}</span>
                ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${actualIdx}:url" style="color: inherit; text-decoration: none;">${p.url}</a></span>` : ''}
              </div>
              ${p.description ? `<div class="project-desc" data-df-field="proj:${actualIdx}:description">${p.description}</div>` : ''}
            </div>
          `;
        }).join('')}
      </section>
    `;
  };

  const renderCertItems = (items) => {
    if (!items || !items.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h2>
        <div class="section-line"></div>
        <ul class="entry-desc">
          ${items.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
        </ul>
      </section>
    `;
  };

  const renderReferenceItems = (items) => {
    if (!items || !items.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</h2>
        <div class="section-line"></div>
        <div class="skills-grid">
          ${items.map((r, idx) => `
            <div class="entry-block">
              <div class="entry-title" data-df-field="ref:${idx}:name">${r.name}</div>
              <div class="entry-role" data-df-field="ref:${idx}:relation">${r.relation}</div>
              <div style="font-size: 8.5pt; color: #666; margin-top: 2px;" data-df-field="ref:${idx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderCustomSection = (cs) => {
    if (!cs || !cs.items || !cs.items.length) return '';
    return `
      <section class="cv-section">
        <h2 class="section-title" data-df-field="custom:${cs.id}:title">${cs.title || 'Additional Information'}</h2>
        <div class="section-line"></div>
        <div class="skills-grid">
          ${cs.items.map((i, idx) => `
            <div>
              <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const page1Sections = [];
  const page2Sections = [];

  for (const key of sectionOrder) {
    if (key === 'summary') {
      if (partitions.summary.hasP1) page1Sections.push(renderSummary());
    } else if (key === 'experience' && data.experience && data.experience.length) {
      if (partitions.experience.hasP1) {
        page1Sections.push(renderExperienceItems(partitions.experience.p1, false, partitions.experience.p1Offset));
      }
      if (partitions.experience.hasP2) {
        page2Sections.push(renderExperienceItems(partitions.experience.p2, partitions.experience.isP2Continuation, partitions.experience.p2Offset));
      }
    } else if (key === 'education' && data.education && data.education.length) {
      if (partitions.education.hasP1) {
        page1Sections.push(renderEducationItems(partitions.education.p1, false, partitions.education.p1Offset));
      }
      if (partitions.education.hasP2) {
        page2Sections.push(renderEducationItems(partitions.education.p2, partitions.education.isP2Continuation, partitions.education.p2Offset));
      }
    } else if (key === 'skills' && data.skills && data.skills.length) {
      if (partitions.skills.hasP1) page1Sections.push(renderSkills());
      if (partitions.skills.hasP2) page2Sections.push(renderSkills());
    } else if (key === 'projects' && data.projects && data.projects.length) {
      if (partitions.projects.hasP1) {
        page1Sections.push(renderProjectItems(partitions.projects.p1, false, partitions.projects.p1Offset));
      }
      if (partitions.projects.hasP2) {
        page2Sections.push(renderProjectItems(partitions.projects.p2, partitions.projects.isP2Continuation, partitions.projects.p2Offset));
      }
    } else if (key === 'certifications' && data.certifications && data.certifications.length) {
      if (partitions.certifications.hasP1) page1Sections.push(renderCertItems(partitions.certifications.p1));
      if (partitions.certifications.hasP2) page2Sections.push(renderCertItems(partitions.certifications.p2));
    } else if (key === 'references' && data.references && data.references.length) {
      if (partitions.references.hasP1) page1Sections.push(renderReferenceItems(partitions.references.p1));
      if (partitions.references.hasP2) page2Sections.push(renderReferenceItems(partitions.references.p2));
    } else {
      const csPart = partitions.customSections[key];
      if (csPart) {
        if (csPart.hasP1) page1Sections.push(renderCustomSection({ ...csPart.cs, items: csPart.p1Items }));
        if (csPart.hasP2) page2Sections.push(renderCustomSection({ ...csPart.cs, items: csPart.p2Items }));
      }
    }
  }

  const hasPage2 = page2Sections.length > 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${data.name ? `${data.name} - Resume` : 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Inter', sans-serif;
      background: transparent;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 0;
      margin: 0;
    }
    .cv-page {
      width: 794px;
      min-height: 1123px;
      max-height: 1123px;
      box-sizing: border-box;
      margin: 0 auto;
      padding: ${45 + pageMargin}px ${45 + pageMargin}px;
      background: #fdfdfc;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.06);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
      page-break-after: always;
      break-after: page;
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
      border-bottom: 1px solid #e5e7eb;
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

    @media print {
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
      }
      .cv-page {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .cv-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
  <!-- Page 1 Sheet -->
  <div class="cv-page" id="page-1">
    <header>
      ${data.photoUrl ? `
        <div class="initials-circle avatar-mask" style="padding: 0; overflow: hidden; border-radius: 50%;">
          <img class="profile-photo avatar" src="${data.photoUrl}" alt="${data.name || 'Candidate'}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
      ` : (data.name ? `<div class="initials-circle">${initials}</div>` : '')}
      <div class="name-header">
        ${data.name ? `<h1 data-df-field="name">${data.name}</h1>` : ''}
        <div class="candidate-title title-sub" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
        ${contactParts.length ? `<div class="contact">${contactParts.join('  |  ')}</div>` : ''}
      </div>
    </header>

    ${page1Sections.join('\n')}
  </div>

  ${hasPage2 ? `
    <!-- Page 2 Sheet -->
    <div class="cv-page" id="page-2">
      ${page2Sections.join('\n')}
    </div>
  ` : ''}
</body>
</html>`;
}