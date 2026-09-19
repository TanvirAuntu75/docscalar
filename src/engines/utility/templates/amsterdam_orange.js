// ═══════════════════════════════════════════════════════════════════════════════
// AMSTERDAM ORANGE — Royal Indigo & Vibrant Dutch Orange (Precision)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateAmsterdamOrangeHtml(
  data = {},
  themeColor = '#1e1b4b',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'auto',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#1e1b4b' : themeColor;
  const orangeAccent = '#f97316';
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
      <div class="orange-bar"></div>
      <div class="timeline-wrap">
        ${experienceList.map((e, idx) => `
          <div class="timeline-item">
            <div class="orange-dot"></div>
            <div class="entry-header">
              <span class="entry-role" data-df-field="exp:${idx}:role">${e.role || ''}</span>
              <span class="entry-date" ><span data-df-field="exp:${idx}:company">${e.company || ''}</span>${(e.company && (e.start || e.end)) ? ' | ' : ''}<span data-df-field="exp:${idx}:date">${e.start || ''}${e.start && e.end ? ' – ' : ''}${e.end || ''}</span></span>${locationText ? ` · ${locationText}` : ''}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="entry-desc">
                ${e.highlights.filter(Boolean).map((h, hIdx) => `<li data-df-field="exp:${idx}:highlight:${hIdx}">${h}</li>`).join('')}
              </ul>
            ` : (e.description ? `
              <div class="entry-desc" data-df-field="exp:${idx}:highlight:0" style="font-size: 8.8pt; color: #475569; margin-top: 4px;">${e.description}</div>
            ` : '')}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const eduHtml = educationList.length ? `
    <div class="sidebar-section">
      <h3 class="sidebar-title section-heading" data-df-field="heading:education">${data.sectionTitles?.education || 'Education'}</h3>
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
      <h3 class="sidebar-title section-heading" data-df-field="heading:skills">${data.sectionTitles?.skills || 'Core Skills'}</h3>
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
              <span class="orange-bullet">▪</span>
              <span class="skill-name" data-df-field="skill:${idx}">${sName}</span>
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
      <div class="orange-bar"></div>
      <div class="timeline-wrap">
        ${projectList.map((p, idx) => `
          <div class="timeline-item">
            <div class="orange-dot"></div>
            <div class="entry-header">
              <span class="entry-role" data-df-field="proj:${idx}:name">${p.name || ''}</span>
              ${p.url ? `<span class="entry-date"><a href="https://${p.url.replace(/^https?:\/\//, '')}" target="_blank" data-df-field="proj:${idx}:url" style="color: ${orangeAccent}; text-decoration: none;">${p.url}</a></span>` : ''}
            </div>
            ${p.description ? `<div class="proj-desc" data-df-field="proj:${idx}:description">${p.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const refHtml = referenceList.length ? `
    <section class="main-section">
      <h3 class="section-title section-heading" data-df-field="heading:references">${data.sectionTitles?.references || 'References'}</h3>
      <div class="orange-bar"></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
        ${referenceList.map((r, idx) => `
          <div style="font-size: 8.8pt; color: #475569;">
            <div data-df-field="ref:${idx}:name" style="font-weight: 700; color: #0f172a;">${r.name || ''}</div>
            <div data-df-field="ref:${idx}:relation" style="font-style: italic;">${r.relation || ''}</div>
            <div data-df-field="ref:${idx}:contact">${r.phone ? `Phone: ${r.phone} · ` : ''}${r.email ? `Email: ${r.email}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const certHtml = certList.length ? `
    <div class="sidebar-section">
      <h3 class="sidebar-title section-heading" data-df-field="heading:certifications">${data.sectionTitles?.certifications || 'Certifications'}</h3>
      <div class="sidebar-line"></div>
      <ul class="cert-list">
        ${certList.map((c, idx) => `<li data-df-field="cert:${idx}">${typeof c === 'string' ? c : c.name || ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const langHtml = langList.length ? `
    <div class="sidebar-section">
      <h3 class="sidebar-title" data-df-field="custom:${langSection.id}:title">${langSection.title || 'Languages'}</h3>
      <div class="sidebar-line"></div>
      <div class="skills-grid">
        ${langList.map((l, idx) => `
          <div class="skill-item">
            <span class="orange-bullet">▪</span>
            <span class="skill-name" data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:title">${typeof l === 'string' ? l : (l.title || l.name || '')}</span>
            ${l.value ? `<span class="skill-level" data-df-field="custom:${langSection ? langSection.id : 'custom_languages'}:${idx}:value">${l.value}</span>` : ''}
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
        <div class="orange-bar"></div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${cs.items.map((i, idx) => `
            <div style="font-size: 8.8pt;">
              <strong data-df-field="custom:${cs.id}:${idx}:title">${typeof i === 'string' ? i : (i.title || i.name || '')}</strong>${typeof i === 'object' && i !== null && i.value ? `: <span data-df-field="custom:${cs.id}:${idx}:value">${i.value}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }).join('');

  const contactHtml = hasContact ? `
    <div class="sidebar-section">
      <h3 class="sidebar-title section-heading" data-df-field="heading:contact">${data.sectionTitles?.contact || 'Contact'}</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${phoneText ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span data-df-field="phone">${phoneText}</span></div>` : ''}
        ${emailText ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:${emailText}" data-df-field="email" style="color: inherit; text-decoration: none; word-break: break-all;">${emailText}</a></div>` : ''}
        ${locationText ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span data-df-field="location">${locationText}</span></div>` : ''}
        ${linkedinText ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg><a data-df-field="linkedin" href="https://${linkedinText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${linkedinText.replace(/^https?:\/\//, '')}</a></div>` : ''}
        ${websiteText ? `<div class="contact-row"><svg class="c-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><a data-df-field="website" href="https://${websiteText.replace(/^https?:\/\//, '')}" target="_blank" style="color: inherit; text-decoration: none;">${websiteText.replace(/^https?:\/\//, '')}</a></div>` : ''}
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
    
    /* Top Royal Indigo Header Block */
    .indigo-header {
      background: ${accent};
      color: #ffffff;
      padding: ${25 + pageMargin}px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      border-bottom: 3.5px solid ${orangeAccent};
    }
    .header-text h1 {
      font-size: 26pt;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
      line-height: 1.05;
      text-transform: uppercase;
    }
    .header-text .title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #fed7aa;
      margin-top: 4px;
    }
    .avatar-mask {
      width: 135px;
      height: 135px;
      border-radius: 50%;
      border: 3px solid ${orangeAccent};
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
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
    .orange-bar {
      border-bottom: 2px solid ${orangeAccent};
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
      border-left: 2px solid #e2e8f0;
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
    .orange-dot {
      position: absolute;
      left: -21px;
      top: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid ${orangeAccent};
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .entry-role {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .entry-date {
      font-size: 8.3pt;
      color: #64748b;
      font-style: italic;
      font-variant-numeric: tabular-nums;
    }
    .entry-company {
      font-size: 8.8pt;
      color: ${orangeAccent};
      font-weight: 600;
      margin-top: 1px;
      margin-bottom: 3px;
    }
    .entry-desc {
      padding-left: 16px;
      font-size: 8.8pt;
      color: #475569;
      line-height: ${lineSpacing};
    }
    .entry-desc li {
      margin-bottom: 2px;
      text-align: justify;
    }
    .proj-desc {
      font-size: 8.8pt;
      color: #475569;
      line-height: ${lineSpacing};
      margin-top: 2px;
    }
    
    .sidebar-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .sidebar-title {
      font-size: 9.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${accent};
      margin-bottom: 4px;
    }
    .sidebar-line {
      border-bottom: 1.5px solid #e2e8f0;
      margin-bottom: 10px;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 8.3pt;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #475569;
      word-break: break-all;
    }
    .c-icon {
      width: 13px;
      height: 13px;
      color: ${orangeAccent};
      flex-shrink: 0;
    }
    .edu-item {
      margin-bottom: 10px;
      font-size: 8.3pt;
      break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      color: #0f172a;
    }
    .edu-school {
      color: #475569;
      font-style: italic;
    }
    .edu-date {
      color: #64748b;
      font-size: 7.8pt;
    }
    .edu-note {
      color: #64748b;
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
      align-items: baseline;
      gap: 6px;
      font-size: 8.3pt;
      color: #334155;
    }
    .orange-bullet {
      color: ${orangeAccent};
      font-size: 7pt;
    }
    .skill-name {
      font-weight: 600;
      color: #1e293b;
    }
    .skill-level {
      font-size: 7.8pt;
      color: #64748b;
      margin-left: auto;
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
  <div class="indigo-header">
    <div class="header-text">
      <h1 data-df-field="name">${name}</h1>
      <div class="candidate-title title" data-df-field="title" data-placeholder="Professional Title" style="min-height: 1.2em;">${title || ''}</div>
    </div>
    ${photoSrc ? `
      <div class="avatar-mask">
        <img class="avatar" src="${photoSrc}" alt="${name || 'Profile Photo'}" />
      </div>
    ` : ''}
  </div>
  
  <div class="content-columns">
    <div class="main-col">
      ${summaryText ? `
        <section class="main-section">
          <h3 class="section-title section-heading" data-df-field="heading:summary">${data.sectionTitles?.summary || data.sectionTitles?.profile || 'Profile'}</h3>
          <div class="orange-bar"></div>
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
