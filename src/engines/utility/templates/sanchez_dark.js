export function generateSanchezDarkHtml(data, themeColor = '#2b3543', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#0f3b7d' ? '#2b3543' : themeColor;

  const expHtml = data.experience.map(e => `
    <div class="timeline-item">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span style="font-weight: 700; font-size: 9.5pt; color: #1e293b;">${e.company}</span>
        <span style="font-size: 8pt; color: #64748b; font-weight: 600;">${e.start} - ${e.end}</span>
      </div>
      <div style="font-size: 8.8pt; color: #475569; font-weight: 600; margin-top: 1px; margin-bottom: 6px;">${e.role}</div>
      ${e.highlights && e.highlights.length ? `<ul style="padding-left: 14px; font-size: 8.5pt; color: #475569; line-height: 1.45;">${e.highlights.map(h => `<li style="margin-bottom: 2px;">${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const eduHtml = data.education && data.education.length ? `
    <div class="timeline-node-group">
      <div class="timeline-section-header">
        <div class="timeline-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg></div>
        <h2>Education</h2>
      </div>
      <div style="padding-left: 35px; border-left: 2px solid #e2e8f0; margin-left: 12px; margin-top: -10px; padding-bottom: 10px;">
        ${data.education.map(e => `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-weight: 700; font-size: 9pt; color: #1e293b;">${e.degree}</span>
              <span style="font-size: 8pt; color: #64748b;">${e.start} - ${e.end}</span>
            </div>
            <div style="font-size: 8.2pt; color: #475569; margin-top: 1px;">${e.school}${e.note ? ` | GPA: ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const refHtml = data.references && data.references.length ? `
    <div class="timeline-node-group">
      <div class="timeline-section-header">
        <div class="timeline-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        <h2>References</h2>
      </div>
      <div style="padding-left: 35px; border-left: 2px solid #e2e8f0; margin-left: 12px; margin-top: -10px; padding-bottom: 10px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          ${data.references.map(r => `
            <div style="font-size: 8.2pt; color: #475569; line-height: 1.4;">
              <div style="font-weight: 700; color: #1e293b;">${r.name}</div>
              <div style="font-style: italic; color: #64748b;">${r.relation}</div>
              <div>Tel: ${r.phone}</div>
              <div>Email: ${r.email}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div class="timeline-node-group">
      <div class="timeline-section-header">
        <div class="timeline-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
        <h2>Projects</h2>
      </div>
      <div style="padding-left: 35px; border-left: 2px solid #e2e8f0; margin-left: 12px; margin-top: -10px; padding-bottom: 10px;">
        ${data.projects.map(p => `
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 700; font-size: 9pt; color: #1e293b;">${p.name}</div>
            <div style="font-size: 8.2pt; color: #475569; margin-top: 1px;">${p.description}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const phoneSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const emailSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
  const addressSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const websiteSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

  const contactHtml = `
    <div class="sidebar-section">
      <h3>Contact</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row">${phoneSvg}<span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row">${emailSvg}<span>${data.email}</span></div>` : ''}
        ${data.location ? `<div class="contact-row">${addressSvg}<span>${data.location}</span></div>` : ''}
        ${data.website ? `<div class="contact-row">${websiteSvg}<span>${data.website}</span></div>` : ''}
      </div>
    </div>
  `;

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3>Skills</h3>
      <div class="sidebar-line"></div>
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

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <h3>Languages</h3>
      <div class="sidebar-line"></div>
      <ul class="bullet-list">
        ${langSection.items.map(i => `<li>• ${i.title}${i.value ? ` (${i.value})` : ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const refSection = data.references && data.references.length ? `
    <div class="sidebar-section">
      <h3>Reference</h3>
      <div class="sidebar-line"></div>
      ${data.references.slice(0, 1).map(r => `
        <div style="font-size: 8.2pt; color: #475569; line-height: 1.4;">
          <div style="font-weight: 700; color: #1e293b;">${r.name}</div>
          <div>${r.relation}</div>
          <div>Tel: ${r.phone}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    flex-direction: column;
    min-height: 297mm;
  }
  
  /* Header Band */
  .header-band {
    background: ${accent};
    height: 140px;
    position: relative;
    display: flex;
    align-items: center;
    padding-left: 36%;
    padding-right: 30px;
  }
  .header-title-wrap h1 {
    font-size: 26pt;
    font-weight: 900;
    color: #fff;
    line-height: 1.05;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .header-title-wrap .role {
    font-size: 11pt;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.75);
    margin-top: 4px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  
  /* Circular photo overlapping band & sidebar */
  .avatar-container {
    position: absolute;
    left: 45px;
    top: 20px;
    width: 130px;
    height: 130px;
    border-radius: 50%;
    border: 3.5px solid #e9ecf0;
    overflow: hidden;
    z-index: 10;
  }
  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  /* Two-panel Grid */
  .body-grid {
    display: flex;
    flex: 1;
  }
  
  /* Sidebar */
  .sidebar {
    width: 33%;
    background: #e9ecf0;
    color: #1e293b;
    padding: 55px 22px 30px 22px;
    font-size: 8.5pt;
  }
  .sidebar-section {
    margin-bottom: 25px;
  }
  .sidebar-section h3 {
    font-size: 9.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1e293b;
    margin-bottom: 4px;
  }
  .sidebar-line {
    border-bottom: 2px solid ${accent};
    width: 30px;
    margin-bottom: 12px;
  }
  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .contact-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .contact-row svg {
    width: 12px;
    height: 12px;
    min-width: 12px;
  }
  .bullet-list {
    list-style: none;
    padding: 0;
  }
  .bullet-list li {
    margin-bottom: 5px;
    color: #475569;
  }
  
  /* Main Content Area with Timeline nodes */
  .main-content {
    width: 67%;
    padding: 40px 35px;
    background: #fff;
  }
  .timeline-node-group {
    margin-bottom: 25px;
  }
  .timeline-section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 15px;
  }
  .timeline-icon-circle {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${accent};
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .timeline-icon-circle svg {
    width: 13px;
    height: 13px;
  }
  .timeline-section-header h2 {
    font-size: 11pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #1e293b;
  }
  .timeline-item {
    margin-bottom: 18px;
  }
</style></head><body>
<div id="main-container">
  <div class="header-band">
    <div class="avatar-container">
      <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_8.jpg'}" alt="photo" />
    </div>
    <div class="header-title-wrap">
      <h1>${data.name}</h1>
      ${data.title ? `<div class="role">${data.title}</div>` : ''}
    </div>
  </div>
  
  <div class="body-grid">
    <div class="sidebar">
      ${contactHtml}
      ${skillsHtml}
      ${langHtml}
      ${refSection}
    </div>
    
    <div class="main-content">
      ${data.summary ? `
        <div class="timeline-node-group">
          <div class="timeline-section-header">
            <div class="timeline-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
            <h2>Profile</h2>
          </div>
          <div style="padding-left: 35px; border-left: 2px solid #e2e8f0; margin-left: 12px; margin-top: -10px; padding-bottom: 10px; font-size: 8.8pt; color: #475569; line-height: ${lineSpacing};">
            ${data.summary}
          </div>
        </div>
      ` : ''}
      
      ${data.experience && data.experience.length ? `
        <div class="timeline-node-group">
          <div class="timeline-section-header">
            <div class="timeline-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
            <h2>Work Experience</h2>
          </div>
          <div style="padding-left: 35px; border-left: 2px solid #e2e8f0; margin-left: 12px; margin-top: -10px; padding-bottom: 10px;">
            ${expHtml}
          </div>
        </div>
      ` : ''}
      
      ${eduHtml}
      ${projHtml}
      ${refHtml}
    </div>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. WILSON LIGHT — Premium Balanced Navy Sidebar Layout (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════