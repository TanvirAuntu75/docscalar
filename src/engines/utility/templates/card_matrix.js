// ═══════════════════════════════════════════════════════════════════════════════
// CARD MATRIX — Structured Boxed Cards & Modern Tech Layout (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateCardMatrixHtml(
  data = {},
  themeColor = '#4f46e5',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#4f46e5' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, sans-serif";

  const safeData = data && typeof data === 'object' ? data : {};
  const name = safeData.name !== undefined && safeData.name !== null ? String(safeData.name).trim() : '';
  const title = safeData.title !== undefined && safeData.title !== null ? String(safeData.title).trim() : '';
  const summaryText = (safeData.summary || safeData.profile || safeData.about || '').trim();
  const phoneText = (safeData.phone || '').trim();
  const emailText = (safeData.email || '').trim();
  const locationText = (safeData.location || safeData.address || '').trim();
  const linkedinText = (safeData.linkedin || '').trim();
  const websiteText = (safeData.website || '').trim();
  const photoSrc = (safeData.photoUrl || '').trim();

  const experienceList = Array.isArray(safeData.experience) ? safeData.experience : [];
  const educationList = Array.isArray(safeData.education) ? safeData.education : [];
  const skillsList = Array.isArray(safeData.skills) ? safeData.skills : [];
  const projectList = Array.isArray(safeData.projects) ? safeData.projects : [];
  const certList = Array.isArray(safeData.certifications) ? safeData.certifications : [];
  const referenceList = Array.isArray(safeData.references) ? safeData.references : [];
  const customSections = Array.isArray(safeData.customSections) ? safeData.customSections : [];

  const langSection = customSections.find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const otherCustomSections = customSections.filter(cs => cs !== langSection);
  const langList = langSection?.items || (Array.isArray(safeData.custom_languages) ? safeData.custom_languages.map(l => ({ title: typeof l === 'string' ? l : l.name || '', value: '' })) : []);

  const hasContact = Boolean(phoneText || emailText || locationText || linkedinText || websiteText);

  const expHtml = experienceList.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Experience'}</div>
      </div>
      <div class="card-body">
        ${experienceList.map((e, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="exp:${idx}:role">${e.role || ''}</span>
              <span class="entry-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></span>${locationText ? ` · ${locationText}` : ''}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="entry-desc">
                ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
              </ul>
            ` : (e.description ? `
              <div class="entry-desc" data-df-field="exp:${idx}:highlight:0" style="font-size: 8.5pt; color: #475569; margin-top: 4px;">${e.description}</div>
            ` : '')}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const eduHtml = educationList.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</div>
      </div>
      <div class="card-body">
        ${educationList.map((e, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="edu:${idx}:degree">${e.degree || ''}</span>
              <span class="entry-date" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</span>
            </div>
            <div class="entry-company"><span data-df-field="edu:${idx}:school">${e.school || ''}</span>${e.note ? ` · ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const skillsHtml = skillsList.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills & Tooling'}</div>
      </div>
      <div class="card-body">
        <div class="skills-flex">
          ${skillsList.map((s, idx) => {
            let sName = typeof s === 'string' ? s : s.name || '';
            let levelText = '';
            if (typeof s === 'string' && s.includes(' - ')) {
              const parts = s.split(' - ');
              sName = parts[0];
              levelText = parts[1];
            }
            return `
              <div class="matrix-skill-chip">
                <span data-df-field="skill:${idx}">${sName}</span>
                ${levelText ? `<span class="chip-lvl">${levelText}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  ` : '';

  const projHtml = projectList.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Key Projects'}</div>
      </div>
      <div class="card-body">
        ${projectList.map((p, idx) => `
          <div class="entry-item">
            <div class="entry-header">
              <span class="entry-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="proj-desc" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const refHtml = referenceList.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</div>
      </div>
      <div class="card-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          ${referenceList.map((r, idx) => `
            <div style="font-size: 8.5pt; color: #475569;">
              <div data-df-field="ref:${idx}:name" style="font-weight: 700; color: #0f172a;">${r.name || ''}</div>
              <div data-df-field="ref:${idx}:relation" style="font-style: italic;">${r.relation || ''}</div>
              <div data-df-field="ref:${idx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  ` : '';

  const certHtml = certList.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</div>
      </div>
      <div class="card-body">
        <ul class="entry-desc" style="padding-left: 16px;">
          ${certList.map((c, idx) => `<li data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
        </ul>
      </div>
    </div>
  ` : '';

  const langHtml = langList.length ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag">${langSection?.title || 'Languages'}</div>
      </div>
      <div class="card-body">
        <div class="skills-flex">
          ${langList.map((l, idx) => `
            <div class="matrix-skill-chip">
              <span data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:title">${typeof l === 'string' ? l : (l.title || l.name || '')}</span>
              ${l.value ? `<span class="chip-lvl" data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:value">${l.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  ` : '';

  const customHtml = otherCustomSections.map(cs => {
    if (!cs || !cs.items || !cs.items.length) return '';
    return `
      <div class="content-card">
        <div class="card-header-bar">
          <div class="card-tag">${cs.title || 'Additional Information'}</div>
        </div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${cs.items.map((i, idx) => `
              <div style="font-size: 8.5pt;">
                <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const contactHtml = hasContact ? `
    <div class="contact-strip">
      ${phoneText ? `<div class="c-item"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span data-df-field="phone">${phoneText}</span></div>` : ''}
      ${emailText ? `<div class="c-item"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:${emailText}" style="color: inherit; text-decoration: none;" data-df-field="email">${emailText}</a></div>` : ''}
      ${locationText ? `<div class="c-item"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span data-df-field="location">${locationText}</span></div>` : ''}
      ${linkedinText ? `<div class="c-item"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg><a data-df-field="linkedin" href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a></div>` : ''}
      ${websiteText ? `<div class="c-item"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><a data-df-field="website" href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a></div>` : ''}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${name ? `${name} - Resume` : 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: #f8fafc;
      margin: 0;
      padding: 0;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .cv-page, #main-container {
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      margin: 0 auto;
      background: #f8fafc;
      padding: ${30 + pageMargin}px 36px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
    }

    .cv-page:last-child, #main-container:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    
    /* Top Header Card */
    .top-header-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .avatar-mask {
      width: 115px;
      height: 115px;
      border-radius: 8px;
      border: 2px solid ${accent};
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: #ffffff;
      flex-shrink: 0;
    }
    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .header-main {
      flex: 1;
    }
    .header-main h1 {
      font-size: 22pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .header-main .title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${accent};
      margin-top: 2px;
      margin-bottom: 6px;
    }
    .contact-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      font-size: 8.2pt;
      color: #64748b;
    }
    .c-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .c-icon {
      width: 12px;
      height: 12px;
      color: ${accent};
    }
    
    /* Content Cards */
    .content-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      break-inside: auto;
    }
    .card-header-bar {
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      padding: 5px 16px;
    }
    .card-tag {
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
    }
    .card-body {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .summary-text {
      font-size: 8.8pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .entry-item {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .entry-role {
      font-weight: 700;
      font-size: 9.2pt;
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.2pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-size: 8.5pt;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .proj-desc {
      font-size: 8.5pt;
      color: #475569;
      margin-top: 1px;
    }
    .entry-desc {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #475569;
      line-height: ${lineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .skills-flex {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 8px;
    }
    .matrix-skill-chip {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 3px 9px;
      border-radius: 4px;
      font-size: 8.2pt;
      color: #334155;
      font-weight: 500;
    }
    .chip-lvl {
      color: ${accent};
      font-size: 7.5pt;
      font-weight: 600;
      margin-left: 4px;
    }

    @media print {
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        background: #f8fafc !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
      }
      .cv-page, #main-container {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .cv-page:last-child, #main-container:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
<div class="cv-page" id="main-container">
  
  <div class="top-header-card">
    ${photoSrc ? `
      <div class="avatar-mask">
        <img class="avatar" src="${photoSrc}" alt="${name || 'Profile Photo'}" />
      </div>
    ` : ''}
    <div class="header-main">
      <h1 data-df-field="name">${name}</h1>
      <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
      ${contactHtml}
    </div>
  </div>

  ${summaryText ? `
    <div class="content-card">
      <div class="card-header-bar">
        <div class="card-tag section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'Profile'}</div>
      </div>
      <div class="card-body">
        <div class="summary-text" data-df-field="summary">${summaryText}</div>
      </div>
    </div>
  ` : ''}

  ${expHtml}
  ${eduHtml}
  ${skillsHtml}
  ${projHtml}
  ${refHtml}
  ${certHtml}
  ${langHtml}
  ${customHtml}

</div>
</body>
</html>`;
}
