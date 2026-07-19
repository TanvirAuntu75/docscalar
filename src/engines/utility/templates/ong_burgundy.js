export function generateOngBurgundyHtml(data, themeColor = '#802b3e', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#0f3b7d' ? '#802b3e' : themeColor;

  const expHtml = data.experience.map(e => `
    <div style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 9.2pt; color: #1e293b;">
        <span>${e.company} | ${e.role}</span>
        <span style="font-weight: 500; font-style: italic; color: #64748b;">${e.start} – ${e.end}</span>
      </div>
      ${e.highlights && e.highlights.length ? `<ul style="padding-left: 14px; font-size: 8.5pt; color: #475569; line-height: 1.45; margin-top: 6px;">${e.highlights.map(h => `<li style="margin-bottom: 2px;">• ${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3>Education Background</h3>
      <div class="sidebar-line"></div>
      ${data.education.map(e => `
        <div style="margin-bottom: 12px; font-size: 8.2pt; color: #475569;">
          <div style="font-weight: 700; color: #1e293b;">${e.school}</div>
          <div style="font-style: italic; margin-top: 1px;">${e.degree}</div>
          <div style="color: #64748b; margin-top: 1px;">Completed in ${e.end}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3>Hard Skills</h3>
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

  const achievementsHtml = data.projects && data.projects.length ? `
    <div style="margin-top: 20px;">
      <h3 style="font-size: 10pt; font-weight: 800; text-transform: uppercase; color: ${accent}; margin-bottom: 4px;">Achievements</h3>
      <div style="border-bottom: 1.5px solid ${accent}; margin-bottom: 12px; width: 45px;"></div>
      ${data.projects.map(p => `
        <div style="margin-bottom: 10px; font-size: 8.5pt; color: #475569; line-height: 1.4;">
          <strong>${p.name}</strong> – ${p.description}
        </div>
      `).join('')}
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
  
  /* Header block */
  .header-band {
    background: ${accent};
    height: 140px;
    position: relative;
    display: flex;
    align-items: center;
    padding-left: 36%;
    padding-right: 30px;
  }
  .header-name-wrap h1 {
    font-size: 28pt;
    font-weight: 900;
    color: #fff;
    line-height: 1.05;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .header-name-wrap .role {
    font-size: 11pt;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.75);
    margin-top: 4px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  
  /* Circular avatar overlap */
  .avatar-container {
    position: absolute;
    left: 45px;
    top: 20px;
    width: 130px;
    height: 130px;
    border-radius: 50%;
    border: 3.5px solid #fff;
    overflow: hidden;
    z-index: 10;
    box-shadow: 0 4px 8px rgba(0,0,0,0.12);
  }
  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  /* Body grid split */
  .body-grid {
    display: flex;
    flex: 1;
  }
  
  /* Sidebar column */
  .sidebar {
    width: 33%;
    background: #fff;
    border-right: 1.5px solid #f1f5f9;
    padding: 55px 22px 30px 22px;
    font-size: 8.5pt;
  }
  .sidebar-section {
    margin-bottom: 25px;
  }
  .sidebar-section h3 {
    font-size: 9.5pt;
    font-weight: 800;
    text-transform: capitalize;
    color: ${accent};
    margin-bottom: 4px;
  }
  .sidebar-line {
    border-bottom: 1.5px solid ${accent};
    width: 45px;
    margin-bottom: 12px;
  }
  
  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 8.2pt;
    color: #475569;
  }
  .contact-row {
    display: flex;
    flex-direction: column;
    margin-bottom: 8px;
  }
  .contact-row span:first-child {
    font-weight: 700;
    color: #374151;
  }
  .bullet-list {
    list-style: none;
    padding: 0;
  }
  .bullet-list li {
    margin-bottom: 5px;
    color: #475569;
  }
  
  /* Main Content Column */
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
    text-transform: capitalize;
    color: ${accent};
    margin-bottom: 4px;
  }
  .main-line {
    border-bottom: 1.5px solid ${accent};
    margin-bottom: 14px;
    width: 45px;
  }
</style></head><body>
<div id="main-container">
  <div class="header-band">
    <div class="avatar-container">
      <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_12.jpg'}" alt="photo" />
    </div>
    <div class="header-name-wrap">
      <h1>${data.name}</h1>
      ${data.title ? `<div class="role">${data.title}</div>` : ''}
    </div>
  </div>
  
  <div class="body-grid">
    <div class="sidebar">
      <div class="sidebar-section">
        <h3>My Contact</h3>
        <div class="sidebar-line"></div>
        <div class="contact-list">
          ${data.email ? `<div class="contact-row"><span>Email:</span><span>${data.email}</span></div>` : ''}
          ${data.phone ? `<div class="contact-row"><span>Phone:</span><span>${data.phone}</span></div>` : ''}
          ${data.location ? `<div class="contact-row"><span>Address:</span><span>${data.location}</span></div>` : ''}
        </div>
      </div>
      
      ${skillsHtml}
      ${eduHtml}
    </div>
    
    <div class="main-content">
      ${data.summary ? `
        <div class="main-section">
          <h3>About Me</h3>
          <div class="main-line"></div>
          <div style="font-size: 8.8pt; color: #475569; line-height: ${lineSpacing};">${data.summary}</div>
        </div>
      ` : ''}
      
      ${data.experience && data.experience.length ? `
        <div class="main-section">
          <h3>Professional Experience</h3>
          <div class="main-line"></div>
          <div>
            ${expHtml}
          </div>
        </div>
      ` : ''}
      
      ${achievementsHtml}
      ${data.certifications && data.certifications.length ? `
        <div class="main-section">
          <h3>Certifications</h3>
          <div class="main-line"></div>
          <ul style="padding-left:14px; font-size:8.5pt; color:#475569;">
            ${data.certifications.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. SCHUMACHER CHARCOAL — Charcoal Curved Headshot with Timeline (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════