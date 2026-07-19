export function generateRichardHtml(data, themeColor = '#0f3b7d', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#2c3549' ? '#0f3b7d' : themeColor;

  const nameParts = data.name.toUpperCase().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const expHtml = data.experience.map(e => `
    <div class="main-item">
      <div class="item-title">${e.company}</div>
      <div class="item-meta">${data.location || 'Sydney - Australia'}</div>
      <div class="item-date">${e.start} - ${e.end}</div>
      ${e.highlights && e.highlights.length ? `<ul class="item-desc">${e.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const eduHtml = data.education && data.education.length ? `
    <section class="main-section">
      <div class="main-section-title-pill">Education</div>
      ${data.education.map(e => `
        <div class="main-item">
          <div class="item-title">${e.school}</div>
          <div class="item-meta">${e.degree}</div>
          <div class="item-date">${e.start} - ${e.end}</div>
        </div>
      `).join('')}
    </section>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <div class="main-section-title-pill">Projects</div>
      ${data.projects.map(p => `
        <div class="main-item">
          <div class="item-title">${p.name}</div>
          <div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">${p.description}</div>
        </div>
      `).join('')}
    </section>
  ` : '';

  const certHtml = data.certifications && data.certifications.length ? `
    <section class="main-section">
      <div class="main-section-title-pill">Certifications</div>
      <ul style="padding-left: 14px; font-size: 8.5pt; color: #475569; margin-top: 8px;">
        ${data.certifications.map(c => `
          <li style="margin-bottom: 4px;">${c}</li>
        `).join('')}
      </ul>
    </section>
  ` : '';

  const phoneSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const emailSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
  const addressSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;

  const contactHtml = `
    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 25px;">
      ${data.phone ? `<div class="contact-row"><div class="contact-icon">${phoneSvg}</div><span class="contact-text">${data.phone}</span></div>` : ''}
      ${data.email ? `<div class="contact-row"><div class="contact-icon">${emailSvg}</div><span class="contact-text">${data.email}</span></div>` : ''}
      ${data.location ? `<div class="contact-row"><div class="contact-icon">${addressSvg}</div><span class="contact-text">${data.location}</span></div>` : ''}
    </div>
  `;

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <div class="sidebar-section-title-pill">Language</div>
      <ul class="bullet-list">
        ${langSection.items.map(i => `<li>• ${i.title}${i.value ? ` (${i.value})` : ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <div class="sidebar-section-title-pill">Expertise</div>
      <ul class="bullet-list">
        ${data.skills.map((s, idx) => {
          let name = s;
          let levelText = ['Expert', 'Advanced', 'Intermediate'][idx % 3];
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `<li>• ${name} (${levelText})</li>`;
        }).join('')}
      </ul>
    </div>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #334155; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    flex-direction: column;
    min-height: 297mm;
  }
  
  /* Top Band Header */
  .header-band {
    background: ${accent};
    height: 145px;
    position: relative;
    display: flex;
    align-items: center;
    padding-left: 36%;
    padding-right: 30px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }
  .header-name-wrap {
    display: flex;
    flex-direction: column;
  }
  .header-name-wrap h1 {
    font-size: 26pt;
    font-weight: 900;
    color: #fff;
    line-height: 1.05;
    letter-spacing: 0.5px;
  }
  .header-name-wrap .title {
    font-size: 11pt;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.75);
    margin-top: 4px;
    letter-spacing: 1.5px;
    text-transform: capitalize;
  }
  
  /* Profile Circular Avatar Overlapping Header & Sidebar */
  .avatar-container {
    position: absolute;
    left: 45px;
    top: 25px;
    width: 135px;
    height: 135px;
    border-radius: 50%;
    border: 3.5px solid ${accent};
    overflow: hidden;
    z-index: 10;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  }
  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  /* Bottom Body Grid */
  .body-grid {
    display: flex;
    flex: 1;
  }
  
  /* Sidebar */
  .sidebar {
    width: 33%;
    background: #111418;
    color: #fff;
    padding: 50px 22px 30px 22px;
    font-size: 8.5pt;
  }
  .sidebar-section {
    margin-bottom: 25px;
  }
  .sidebar-section-title-pill {
    border: 1.5px solid ${accent};
    border-radius: 15px;
    color: #fff;
    font-size: 9.5pt;
    font-weight: 700;
    text-transform: capitalize;
    text-align: center;
    padding: 4px 12px;
    margin-bottom: 12px;
    letter-spacing: 1.5px;
  }
  .contact-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .contact-icon {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${accent};
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
  }
  .contact-icon svg {
    width: 11px;
    height: 11px;
  }
  .contact-text {
    font-size: 8pt;
    color: rgba(255, 255, 255, 0.8);
    word-break: break-all;
  }
  .bullet-list {
    list-style: none;
    padding: 0;
  }
  .bullet-list li {
    margin-bottom: 5px;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.35;
  }
  
  /* Main Content Area */
  .main-content {
    width: 67%;
    padding: 40px 35px;
    background: #fff;
  }
  .main-section {
    margin-bottom: 25px;
  }
  .main-section-title-pill {
    background: ${accent};
    color: #fff;
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    padding: 4px 22px;
    border-radius: 20px;
    display: inline-block;
    margin-bottom: 16px;
  }
  .main-item {
    margin-bottom: 18px;
  }
  .item-title {
    font-size: 9.5pt;
    font-weight: 700;
    color: #111418;
  }
  .item-meta {
    font-size: 8.5pt;
    font-weight: 600;
    color: #475569;
    margin-top: 1px;
  }
  .item-date {
    font-size: 8pt;
    font-style: italic;
    color: #64748b;
    margin-top: 1px;
  }
  .item-desc {
    padding-left: 14px;
    font-size: 8.5pt;
    color: #334155;
    line-height: 1.45;
    margin-top: 6px;
  }
  .item-desc li {
    margin-bottom: 2px;
  }
</style></head><body>
<div id="main-container">
  <div class="header-band">
    <div class="avatar-container">
      <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_7.jpg'}" alt="photo" />
    </div>
    <div class="header-name-wrap">
      <h1>${firstName}<br/>${lastName}</h1>
      ${data.title ? `<div class="title">${data.title}</div>` : ''}
    </div>
  </div>
  
  <div class="body-grid">
    <div class="sidebar">
      ${data.summary ? `
        <div class="sidebar-section">
          <div class="sidebar-section-title-pill">About Me</div>
          <div style="line-height: 1.45; color: rgba(255, 255, 255, 0.75); text-align: center;">${data.summary}</div>
        </div>
      ` : ''}
      
      ${contactHtml}
      ${langHtml}
      ${skillsHtml}
    </div>
    
    <div class="main-content">
      ${data.experience && data.experience.length ? `
        <section class="main-section">
          <div class="main-section-title-pill">Experience</div>
          <div>
            ${expHtml}
          </div>
        </section>
      ` : ''}
      
      ${eduHtml}
      ${projHtml}
      ${certHtml}
    </div>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. SANCHEZ DARK — Premium Dark Header with Timeline Layout (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════