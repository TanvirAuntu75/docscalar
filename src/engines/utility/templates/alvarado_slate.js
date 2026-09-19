// ═══════════════════════════════════════════════════════════════════════════════
// 17. ALVARADO SLATE — Sage Slate Ribbon & Refined Split (Refined & Flawless)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateAlvaradoSlateHtml(
  data = {},
  themeColor = '#5c6e73',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#5c6e73' : themeColor;
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
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:experience">${data.sectionTitles?.experience || 'Work Experience'}</h3>
      <div class="accent-bar"></div>
      <div class="timeline-wrap">
        ${experienceList.map((e, idx) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="item-header">
              <span class="item-role" data-df-field="exp:${idx}:role">${e.role || ''}</span>
              <span class="item-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></span>${locationText ? ` · ${locationText}` : ''}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="item-desc">
                ${e.highlights.filter(Boolean).map((h, bIdx) => `<li data-df-field="exp:${idx}:highlight:${bIdx}">${h.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
              </ul>
            ` : (e.description ? `
              <div class="item-desc" data-df-field="exp:${idx}:highlight:0" style="font-size: 8.5pt; color: #4b5563; margin-top: 2px;">${e.description}</div>
            ` : '')}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const eduHtml = educationList.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
      <div class="sidebar-line"></div>
      <div class="edu-list">
        ${educationList.map((e, idx) => `
          <div class="edu-item">
            <div class="edu-degree" data-df-field="edu:${idx}:degree">${e.degree || ''}</div>
            <div class="edu-school" data-df-field="edu:${idx}:school">${e.school || ''}</div>
            <div class="edu-date" data-df-field="edu:${idx}:date">${e.date || (e.start ? `${e.start}${e.end ? ` – ${e.end}` : ''}` : '')}</div>
            ${e.note ? `<div class="edu-note">${e.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const skillsHtml = skillsList.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Skills'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${skillsList.map((s, idx) => {
          let sName = typeof s === 'string' ? s : s.name || '';
          let levelText = '';
          if (typeof s === 'string' && s.includes(' - ')) {
            const parts = s.split(' - ');
            sName = parts[0];
            levelText = parts[1];
          }
          return `
            <div class="skill-item">
              <span data-df-field="skill:${idx}">• ${sName}</span>
              ${levelText ? `<span class="skill-level">${levelText}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = projectList.length ? `
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:projects">${data.sectionTitles?.projects || 'Projects'}</h3>
      <div class="accent-bar"></div>
      <div class="entries-list">
        ${projectList.map((p, idx) => `
          <div class="entry-item" style="margin-bottom: 10px;">
            <div class="item-header">
              <span class="item-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
              ${p.url ? `<span class="item-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${accent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div style="font-size: 8.5pt; color: #4b5563; margin-top: 2px;" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const refHtml = referenceList.length ? `
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</h3>
      <div class="accent-bar"></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${referenceList.map((r, idx) => `
          <div style="font-size: 8.5pt; color: #475569;">
            <div data-df-field="ref:${idx}:name" style="font-weight: 700; color: #1f2937;">${r.name || ''}</div>
            <div data-df-field="ref:${idx}:relation" style="font-style: italic;">${r.relation || ''}</div>
            <div data-df-field="ref:${idx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = certList.length ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
      <div class="sidebar-line"></div>
      <ul class="cert-list">
        ${certList.map((c, idx) => `<li data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const langHtml = langList.length ? `
    <div class="sidebar-section">
      <h3 data-df-field="custom:${langSection.id}:title">${langSection.title || 'Languages'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${langList.map((l, idx) => `
          <div class="skill-item">
            <span data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:title">• ${typeof l === 'string' ? l : (l.title || l.name || '')}</span>
            ${l.value ? `<span data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:value" class="skill-level">${l.value}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const customHtml = otherCustomSections.map(cs => {
    if (!cs || !cs.items || !cs.items.length) return '';
    return `
      <section class="main-section">
        <h3 class="section-title" data-df-field="custom:${cs.id}:title">${cs.title || 'Additional Information'}</h3>
        <div class="accent-bar"></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${cs.items.map((i, idx) => `
            <div style="font-size: 8.5pt;">
              <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }).join('');

  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <h3 class="section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${phoneText ? `<div class="contact-row"><span data-df-field="phone">${phoneText}</span></div>` : ''}
        ${emailText ? `<div class="contact-row"><a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none; word-break: break-all;">${emailText}</a></div>` : ''}
        ${locationText ? `<div class="contact-row"><span data-df-field="location">${locationText}</span></div>` : ''}
        ${linkedinText ? `<div class="contact-row"><a data-df-field="linkedin" href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${websiteText ? `<div class="contact-row"><a data-df-field="website" href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a></div>` : ''}
      </div>
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
      background: #ffffff;
      margin: 0;
      padding: 0;
      color: #374151;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .cv-page, #main-container {
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
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
    
    /* Top Slate Ribbon Header */
    .header-band {
      background: ${accent};
      color: #ffffff;
      padding: ${30 + pageMargin}px 40px;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .avatar-mask {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.4);
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: #ffffff;
    }
    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .header-text h1 {
      font-size: 26pt;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.05;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header-text .role {
      font-size: 10.5pt;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      margin-top: 4px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    
    /* Content Columns */
    .content-columns {
      display: flex;
      padding: ${24 + pageMargin}px 36px;
      flex: 1;
      gap: 36px;
    }
    .main-col {
      width: 65%;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .sidebar-col {
      width: 35%;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .main-section {
      break-inside: auto;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      margin-bottom: 3px;
    }
    .accent-bar {
      border-bottom: 2px solid ${accent};
      width: 35px;
      margin-bottom: 10px;
    }
    .summary-text {
      font-size: 9pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    
    .timeline-wrap {
      border-left: 2px solid #cbd5e1;
      margin-left: 6px;
      padding-left: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .timeline-item {
      position: relative;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .timeline-dot {
      position: absolute;
      left: -21px;
      top: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid ${accent};
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .item-role {
      font-weight: 700;
      font-size: 9.5pt;
      color: #1f2937;
    }
    .item-date {
      font-size: 8.3pt;
      color: #6b7280;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .item-sub {
      font-size: 8.8pt;
      color: #4b5563;
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .item-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #4b5563;
      line-height: ${lineSpacing};
    }
    .item-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-section h3 {
      font-size: 9.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      margin-bottom: 4px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid #cbd5e1;
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 8.3pt;
    }
    .contact-row {
      color: #475569;
      word-break: break-all;
    }
    .edu-item {
      margin-bottom: 10px;
      font-size: 8.3pt;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      color: #1f2937;
    }
    .edu-school {
      color: #475569;
      font-style: italic;
    }
    .edu-date {
      color: #6b7280;
      font-size: 7.8pt;
    }
    .edu-note {
      color: #6b7280;
      font-size: 7.8pt;
      margin-top: 1px;
    }
    .skills-grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .skill-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 8.3pt;
      color: #334155;
    }
    .skill-level {
      font-size: 7.8pt;
      color: #6b7280;
    }
    .cert-list {
      padding-left: 16px;
      font-size: 8.3pt;
      color: #475569;
    }
    .cert-list li {
      margin-bottom: 3px;
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
  <div class="header-band">
    ${photoSrc ? `
      <div class="avatar-mask">
        <img class="avatar" src="${photoSrc}" alt="${name || 'Profile Photo'}" />
      </div>
    ` : ''}
    <div class="header-text">
      <h1 data-df-field="name">${name}</h1>
      <div class="candidate-title role" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
    </div>
  </div>
  
  <div class="content-columns">
    <div class="main-col">
      ${summaryText ? `
        <section class="main-section">
          <h3 class="section-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || 'Professional Summary'}</h3>
          <div class="accent-bar"></div>
          <div class="summary-text" data-df-field="summary">${summaryText}</div>
        </section>
      ` : ''}
      
      ${expHtml}
      ${projHtml}
      ${refHtml}
      ${customHtml}
    </div>
    
    <div class="sidebar-col">
      ${contactHtml}
      ${eduHtml}
      ${skillsHtml}
      ${langHtml}
      ${certHtml}
    </div>
  </div>
</div>
</body>
</html>`;
}