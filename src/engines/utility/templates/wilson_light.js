export function generateWilsonLightHtml(data, themeColor = '#1a365d', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#0f3b7d' ? '#1a365d' : themeColor;

  const nameParts = data.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const expHtml = data.experience.map(e => `
    <div style="margin-bottom: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span style="font-weight: 700; font-size: 9.5pt; color: #111827; text-transform: uppercase;">${e.role}</span>
        <span style="font-size: 8pt; color: #4b5563; font-weight: 500;">${e.start} – ${e.end}</span>
      </div>
      <div style="font-size: 8.5pt; color: #4b5563; font-style: italic; margin-top: 1px; margin-bottom: 5px;">${e.company}</div>
      ${e.highlights && e.highlights.length ? `<ul style="padding-left: 14px; font-size: 8.5pt; color: #4b5563; line-height: 1.4;">${e.highlights.map(h => `<li style="margin-bottom: 2px;">• ${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const refHtml = data.references && data.references.length ? `
    <div style="margin-top: 20px;">
      <h3 style="font-size: 10pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #111827; margin-bottom: 4px;">References</h3>
      <div style="border-bottom: 1.5px solid #e5e7eb; margin-bottom: 12px;"></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        ${data.references.map(r => `
          <div style="font-size: 8.2pt; color: #4b5563; line-height: 1.4;">
            <div style="font-weight: 700; color: #111827;">${r.name}</div>
            <div style="color: #6b7280; font-size: 8pt;">${r.relation}</div>
            <div>Phone: ${r.phone}</div>
            <div>Email: ${r.email}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div style="margin-bottom: 22px;">
      <h3 style="font-size: 10pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #111827; margin-bottom: 4px;">Projects</h3>
      <div style="border-bottom: 1.5px solid #e5e7eb; margin-bottom: 12px;"></div>
      ${data.projects.map(p => `
        <div style="margin-bottom: 10px;">
          <div style="font-weight: 700; font-size: 9.2pt; color: #111827;">${p.name}</div>
          <div style="font-size: 8.5pt; color: #4b5563; margin-top: 1px;">${p.description}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const contactHtml = `
    <div class="sidebar-section">
      <h3>Contact Me</h3>
      <div class="sidebar-line"></div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${data.phone ? `<div class="sidebar-contact-row"><span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="sidebar-contact-row"><span style="word-break: break-all;">${data.email}</span></div>` : ''}
        ${data.location ? `<div class="sidebar-contact-row"><span>${data.location}</span></div>` : ''}
      </div>
    </div>
  `;

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3>Education</h3>
      <div class="sidebar-line"></div>
      ${data.education.map(e => `
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 700; font-size: 8.5pt; color: #fff;">${e.degree}</div>
          <div style="font-size: 8pt; color: rgba(255, 255, 255, 0.7); margin-top: 1px;">${e.school}</div>
          <div style="font-size: 7.8pt; color: rgba(255, 255, 255, 0.6); margin-top: 1px;">${e.start} - ${e.end}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3>Skills</h3>
      <div class="sidebar-line"></div>
      <ul style="list-style: none; padding: 0;">
        ${data.skills.map((s, idx) => {
          let name = s;
          let levelText = ['Expert', 'Advanced', 'Intermediate'][idx % 3];
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <li style="display: flex; justify-content: space-between; font-size: 8.2pt; color: rgba(255,255,255,0.85); margin-bottom: 5px;">
              <span>• ${name}</span>
              <span style="color: rgba(255,255,255,0.5); font-size: 7.8pt;">${levelText}</span>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  ` : '';

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <h3>Language</h3>
      <div class="sidebar-line"></div>
      <ul style="list-style: none; padding: 0; color: rgba(255,255,255,0.85);">
        ${langSection.items.map(i => `<li>• ${i.title}${i.value ? ` (${i.value})` : ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #374151; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    flex-direction: column;
    min-height: 297mm;
  }
  
  /* Top band header */
  .header-band {
    background: #e8ecf0;
    height: 140px;
    position: relative;
    display: flex;
    align-items: center;
    padding-left: 36%;
    padding-right: 30px;
  }
  .header-name-wrap h1 {
    font-size: 26pt;
    line-height: 1.1;
    color: #1e3a8a;
  }
  .header-name-wrap .light {
    font-weight: 300;
  }
  .header-name-wrap .bold {
    font-weight: 800;
  }
  .header-name-wrap .role {
    font-size: 11pt;
    font-weight: 500;
    color: #4b5563;
    margin-top: 4px;
    letter-spacing: 1px;
  }
  
  /* Circle avatar overlap */
  .avatar-container {
    position: absolute;
    left: 45px;
    top: 20px;
    width: 125px;
    height: 125px;
    border-radius: 50%;
    border: 3.5px solid #fff;
    overflow: hidden;
    z-index: 10;
  }
  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  /* Grid layout */
  .body-grid {
    display: flex;
    flex: 1;
  }
  
  /* Sidebar */
  .sidebar {
    width: 33%;
    background: ${accent};
    color: #fff;
    padding: 55px 20px 30px 20px;
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
    color: #fff;
    margin-bottom: 4px;
  }
  .sidebar-line {
    border-bottom: 2px solid rgba(255, 255, 255, 0.4);
    width: 30px;
    margin-bottom: 12px;
  }
  .sidebar-contact-row {
    display: flex;
    gap: 8px;
    align-items: center;
    color: rgba(255, 255, 255, 0.85);
  }
  
  /* Main Content Area */
  .main-content {
    width: 67%;
    padding: 40px 35px;
    background: #fff;
  }
  .main-section {
    margin-bottom: 22px;
  }
  .main-section h3 {
    font-size: 10pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #111827;
    margin-bottom: 4px;
  }
  .main-line {
    border-bottom: 1.5px solid #e5e7eb;
    margin-bottom: 14px;
  }
</style></head><body>
<div id="main-container">
  <div class="header-band">
    <div class="avatar-container">
      <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_9.jpg'}" alt="photo" />
    </div>
    <div class="header-name-wrap">
      <h1><span class="light">${firstName}</span> <span class="bold">${lastName}</span></h1>
      ${data.title ? `<div class="role">${data.title}</div>` : ''}
    </div>
  </div>
  
  <div class="body-grid">
    <div class="sidebar">
      ${contactHtml}
      ${eduHtml}
      ${skillsHtml}
      ${langHtml}
    </div>
    
    <div class="main-content">
      ${data.summary ? `
        <div class="main-section">
          <h3>Summary</h3>
          <div class="main-line"></div>
          <div style="font-size: 8.8pt; color: #4b5563; line-height: ${lineSpacing};">${data.summary}</div>
        </div>
      ` : ''}
      
      ${data.experience && data.experience.length ? `
        <div class="main-section">
          <h3>Work Experience</h3>
          <div class="main-line"></div>
          <div>
            ${expHtml}
          </div>
        </div>
      ` : ''}
      
      ${projHtml}
      ${refHtml}
    </div>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. SANCHEZ MONO — Premium Monochromatic Timeline Layout (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════