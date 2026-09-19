// ═══════════════════════════════════════════════════════════════════════════════
// 2. OLIVIA — Premium Elegant Bronze Split Layout (Hardened & Paginated)
// ═══════════════════════════════════════════════════════════════════════════════

import { computeTwoPagePartition } from '../paginationEngine.js';

export function generateOliviaHtml(
  data,
  themeColor = '#b38e70',
  themeFont = 'Playfair Display',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#b38e70' : themeColor;
  const fontFam = themeFont === 'Inter' ? "'Inter', sans-serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : "'Playfair Display', Georgia, serif";

  const hasContact = data.phone || data.email || data.location || data.linkedin || data.website;
  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span data-df-field="phone">${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:${data.email}" data-df-field="email" style="color: inherit; text-decoration: none; overflow-wrap: anywhere; word-break: break-word;">${data.email}</a></div>` : ''}
        ${data.location ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span data-df-field="location">${data.location}</span></div>` : ''}
        ${data.linkedin ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg><a data-df-field="linkedin" href="https://${data.linkedin.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none; overflow-wrap: anywhere; word-break: break-word;">${data.linkedin.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${data.website ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><a data-df-field="website" href="https://${data.website.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none; overflow-wrap: anywhere; word-break: break-word;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
      </div>
    </div>
  ` : '';

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
      <div class="sidebar-line"></div>
      <div class="edu-container">
        ${data.education.map((e, idx) => `
          <div class="edu-item">
            <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree}</div>
            <div class="edu-school" data-df-field="edu:${idx}:school">${e.school}</div>
            <div class="edu-date" data-df-field="edu:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</div>
            ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${data.skills.map((s, idx) => {
          let name = s;
          let levelText = '';
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <div class="skill-row">
              <span class="skill-name" data-df-field="skill:${idx}">${name}</span>
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <h3 data-df-field="custom:${langSection.id}:title">${langSection.title || 'Languages'}</h3>
      <div class="sidebar-line"></div>
      <div class="lang-grid">
        ${langSection.items.map((i, idx) => `
          <div class="lang-row">
            <span class="lang-name" data-df-field="custom:${langSection.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</span>
            ${typeof i === 'object' && i !== null && i.value ? `<span class="lang-level" data-df-field="custom:${langSection.id}:${idx}:value">${i.value}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const { partitions } = computeTwoPagePartition({
    data,
    sectionOrder,
    pageMargin,
    lineSpacing,
    baseHeaderHeight: 65,
    totalPageHeight: 1043
  });

  const renderExperienceItems = (items, isContinuation = false, globalOffset = 0) => {
    if (!items || !items.length) return '';
    return `
      <section class="main-section">
        <h2 class="section-heading" data-df-field="heading:experience">${isContinuation ? (data.sectionTitles?.experience ? `${data.sectionTitles.experience} (Continued)` : 'Experience (Continued)') : (data.sectionTitles?.experience || 'Experience')}</h2>
        <div class="main-line"></div>
        <div class="timeline-container">
          ${items.map((e, idx) => {
            const actualIdx = globalOffset + idx;
            const dateStr = `${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}`;
            return `
              <div class="timeline-item">
                <div class="timeline-header">
                  <span class="timeline-role" data-df-field="exp:${actualIdx}:role">${e.role}</span>
                  <span class="timeline-date" data-df-field="exp:${actualIdx}:date">${dateStr}</span>
                </div>
                <div class="timeline-company"><span data-df-field="exp:${actualIdx}:company">${e.company}</span>${data.location ? ` · <span data-df-field="exp:${actualIdx}:location">${data.location}</span>` : ''}</div>
                ${e.highlights && e.highlights.filter(Boolean).length ? `
                  <ul class="timeline-desc">
                    ${e.highlights.filter(Boolean).map((h, hIdx) => `
                      <li data-df-field="exp:${actualIdx}:highlight:${hIdx}">${h}</li>
                    `).join('')}
                  </ul>
                ` : ''}
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
      <section class="main-section">
        <h2 class="section-heading" data-df-field="heading:projects">${isContinuation ? (data.sectionTitles?.projects ? `${data.sectionTitles.projects} (Continued)` : 'Projects (Continued)') : (data.sectionTitles?.projects || 'Projects')}</h2>
        <div class="main-line"></div>
        ${items.map((p, idx) => {
          const actualIdx = globalOffset + idx;
          return `
            <div class="project-item">
              <div class="project-header">
                <span class="project-title" data-df-field="proj:${actualIdx}:name">${p.name}</span>
                ${p.url ? `<span class="project-url"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${actualIdx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
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
      <section class="main-section">
        <h2 class="section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h2>
        <div class="main-line"></div>
        <ul class="cert-list">
          ${items.map((c, idx) => `<li data-df-field="cert:${idx}">${c}</li>`).join('')}
        </ul>
      </section>
    `;
  };

  const renderReferenceItems = (items) => {
    if (!items || !items.length) return '';
    return `
      <section class="main-section">
        <h2 class="section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</h2>
        <div class="main-line"></div>
        <div class="reference-grid">
          ${items.map((r, idx) => `
            <div class="ref-item">
              <div class="ref-name" data-df-field="ref:${idx}:name">${r.name}</div>
              <div class="ref-relation" data-df-field="ref:${idx}:relation">${r.relation}</div>
              <div class="ref-contact" data-df-field="ref:${idx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderCustomSection = (cs) => {
    if (!cs || !cs.items || !cs.items.length) return '';
    return `
      <section class="main-section">
        <h2 data-df-field="custom:${cs.id}:title">${cs.title || 'Additional Information'}</h2>
        <div class="main-line"></div>
        <div class="custom-grid">
          ${cs.items.map((i, idx) => `
            <div class="custom-item">
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
    if (key === 'experience' && data.experience && data.experience.length) {
      if (partitions.experience.hasP1) {
        page1Sections.push(renderExperienceItems(partitions.experience.p1, false, partitions.experience.p1Offset));
      }
      if (partitions.experience.hasP2) {
        page2Sections.push(renderExperienceItems(partitions.experience.p2, partitions.experience.isP2Continuation, partitions.experience.p2Offset));
      }
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
    } else if (key !== 'summary' && key !== 'education' && key !== 'skills' && key !== 'custom_languages') {
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: transparent;
      color: #2b2b2b;
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
      display: flex;
      width: 794px;
      min-height: 1123px;
      max-height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.06);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
      page-break-after: always;
      break-after: page;
    }
    
    /* Sidebar (32%) */
    .sidebar {
      width: 32%;
      background: #fbf9f6;
      border-right: 1.5px solid #ece4db;
      padding: ${35 + pageMargin}px 22px;
      font-size: 8.5pt;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .avatar-container {
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
    }
    .avatar-mask {
      width: 145px;
      height: 145px;
      border-radius: 50%;
      border: 3px solid ${accent};
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-section h3 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11pt;
      font-weight: 700;
      color: ${accent};
      margin-bottom: 3px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid #d9cdbf;
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #4a453e;
      font-size: 8.3pt;
      font-family: 'Inter', sans-serif;
    }
    .c-icon {
      width: 13px;
      height: 13px;
      color: ${accent};
      flex-shrink: 0;
    }
    .edu-item {
      margin-bottom: 9px;
      font-family: 'Inter', sans-serif;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      font-size: 8.6pt;
      color: #2b2b2b;
    }
    .edu-school {
      font-size: 8pt;
      color: #6e6459;
    }
    .edu-date {
      font-size: 7.8pt;
      color: #8c8275;
      font-style: italic;
    }
    .edu-note {
      font-size: 7.8pt;
      color: #6e6459;
      margin-top: 1px;
    }
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-family: 'Inter', sans-serif;
    }
    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      color: #4a453e;
      font-size: 8.3pt;
    }
    .skill-name {
      font-weight: 500;
    }
    .skill-level {
      font-size: 7.8pt;
      color: #8c8275;
    }
    .lang-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-family: 'Inter', sans-serif;
    }
    .lang-row {
      display: flex;
      justify-content: space-between;
      font-size: 8.3pt;
      color: #4a453e;
    }
    .lang-level {
      font-size: 7.8pt;
      color: #8c8275;
    }
    
    /* Main Content (68%) */
    .main-content {
      width: 68%;
      padding: ${40 + pageMargin}px 32px;
      background: #ffffff;
      color: #2b2b2b;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .main-header {
      border-bottom: 1.5px solid #d9cdbf;
      padding-bottom: 12px;
      margin-bottom: 6px;
    }
    .main-header h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26pt;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.5px;
      line-height: 1.05;
    }
    .main-header .title {
      font-family: 'Inter', sans-serif;
      font-size: 10.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${accent};
      margin-top: 4px;
      margin-bottom: 8px;
    }
    .main-header .summary {
      font-family: 'Inter', sans-serif;
      font-size: 9pt;
      color: #4a453e;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    .main-section {
      break-inside: auto;
    }
    .main-section h2 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11.5pt;
      font-weight: 700;
      color: ${accent};
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .main-line {
      border-bottom: 1.5px solid #ece4db;
      margin-bottom: 10px;
    }
    .timeline-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .timeline-item {
      font-family: 'Inter', sans-serif;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .timeline-role {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1a1a1a;
    }
    .timeline-date {
      font-size: 8.3pt;
      font-weight: 500;
      color: #8c8275;
      font-style: italic;
    }
    .timeline-company {
      font-size: 8.8pt;
      font-weight: 600;
      color: #6e6459;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .timeline-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #4a453e;
      line-height: ${lineSpacing};
    }
    .timeline-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    .project-item {
      font-family: 'Inter', sans-serif;
      margin-bottom: 10px;
      break-inside: avoid;
    }
    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .project-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #1a1a1a;
    }
    .project-url {
      font-size: 8.3pt;
    }
    .project-desc {
      font-size: 8.8pt;
      color: #4a453e;
      margin-top: 2px;
    }
    .cert-list {
      padding-left: 16px;
      font-family: 'Inter', sans-serif;
      font-size: 8.8pt;
      color: #4a453e;
    }
    .cert-list li {
      margin-bottom: 3px;
    }
    .reference-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      font-family: 'Inter', sans-serif;
    }
    .ref-item {
      font-size: 8.5pt;
      color: #4a453e;
      break-inside: avoid;
    }
    .ref-name {
      font-size: 9.2pt;
      font-weight: 700;
      color: #1a1a1a;
    }
    .ref-relation {
      font-style: italic;
      color: #6e6459;
      margin-bottom: 2px;
    }
    .custom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      font-size: 8.8pt;
      font-family: 'Inter', sans-serif;
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
    <div class="sidebar">
      ${data.photoUrl ? `
        <div class="avatar-container">
          <div class="avatar-mask">
            <img class="avatar" src="${data.photoUrl}" alt="Profile Photo" />
          </div>
        </div>
      ` : ''}
      ${contactHtml}
      ${skillsHtml}
      ${eduHtml}
      ${langHtml}
    </div>
    
    <div class="main-content">
      <div class="main-header">
        ${data.name ? `<h1 data-df-field="name">${data.name}</h1>` : ''}
        <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${data.title || ''}</div>
        ${data.summary ? `<div class="summary" data-df-field="summary">${data.summary}</div>` : ''}
      </div>
      
      ${page1Sections.join('\n')}
    </div>
  </div>

  ${hasPage2 ? `
    <!-- Page 2 Sheet -->
    <div class="cv-page" id="page-2">
      <div class="sidebar">
        <!-- Sidebar Continuation Space / Secondary Items -->
      </div>
      <div class="main-content">
        ${page2Sections.join('\n')}
      </div>
    </div>
  ` : ''}
</body>
</html>`;
}