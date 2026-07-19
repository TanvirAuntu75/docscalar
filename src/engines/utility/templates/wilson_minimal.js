export function generateWilsonMinimalHtml(data, themeColor = '#1a1d20', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#0f3b7d' ? '#1a1d20' : themeColor;

  const expHtml = data.experience.map(e => `
    <div style="margin-bottom: 22px;">
      <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 9.5pt; color: #1a1d20; text-transform: uppercase;">
        <span>${e.company}</span>
        <span style="font-weight: 500; font-style: italic; color: #64748b;">${e.start} – ${e.end}</span>
      </div>
      <div style="font-size: 8.5pt; color: #475569; font-weight: 600; margin-top: 2px;">${e.role}</div>
      ${e.highlights && e.highlights.length ? `<ul style="padding-left: 14px; font-size: 8.5pt; color: #475569; line-height: 1.4; margin-top: 6px;">${e.highlights.map(h => `<li style="margin-bottom: 2px;">• ${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3>Education</h3>
      <div class="sidebar-line"></div>
      ${data.education.map(e => `
        <div style="margin-bottom: 12px; font-size: 8.2pt; color: #475569;">
          <div style="font-weight: 700; color: #1a1d20;">${e.degree}</div>
          <div style="font-style: italic; margin-top: 1px;">${e.school}</div>
          <div style="color: #64748b; margin-top: 1px;">${e.start} - ${e.end}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3>Expertise</h3>
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
            <li style="display: flex; justify-content: space-between; font-size: 8.2pt; color: #475569; margin-bottom: 5px;">
              <span>• ${name}</span>
              <span style="color: #9ca3af; font-size: 7.8pt;">${levelText}</span>
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
      <ul style="list-style: none; padding: 0; color: #475569;">
        ${langSection.items.map(i => `<li>• ${i.title}${i.value ? ` (${i.value})` : ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const refHtml = data.references && data.references.length ? `
    <div style="margin-top: 20px;">
      <h3 style="font-size: 10pt; font-weight: 800; text-transform: uppercase; color: #1a1d20; letter-spacing: 1px; margin-bottom: 4px;">References</h3>
      <div style="border-bottom: 1.5px solid #cbd5e1; margin-bottom: 12px;"></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        ${data.references.map(r => `
          <div style="font-size: 8.2pt; color: #475569; line-height: 1.4;">
            <div style="font-weight: 700; color: #1a1d20;">${r.name}</div>
            <div style="color: #64748b; font-size: 8pt;">${r.relation}</div>
            <div>Phone: ${r.phone}</div>
            <div>Email: ${r.email}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #334155; padding: 40px 45px; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    flex-direction: column;
    min-height: 297mm;
  }
  
  /* Header section */
  .header-wrap {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 25px;
    border-bottom: 1.5px solid #cbd5e1;
    margin-bottom: 30px;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .avatar-container {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 3.5px solid #cbd5e1;
    overflow: hidden;
  }
  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .header-left h1 {
    font-size: 26pt;
    font-weight: 900;
    color: #1a1d20;
    letter-spacing: -0.5px;
    line-height: 1.05;
    text-transform: uppercase;
  }
  .header-left .role {
    font-size: 11pt;
    font-weight: 600;
    color: #64748b;
    margin-top: 4px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  
  .header-contacts {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 8pt;
    color: #475569;
    text-align: right;
  }
  
  /* Body grid split */
  .body-grid {
    display: flex;
    gap: 35px;
    flex: 1;
  }
  
  /* Left Column */
  .left-col {
    width: 32%;
    border-right: 1.5px solid #cbd5e1;
    padding-right: 25px;
  }
  .sidebar-section {
    margin-bottom: 25px;
  }
  .sidebar-section h3 {
    font-size: 9.5pt;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1a1d20;
    margin-bottom: 4px;
  }
  .sidebar-line {
    border-bottom: 1.5px solid ${accent};
    width: 30px;
    margin-bottom: 12px;
  }
  
  /* Right Column */
  .right-col {
    width: 68%;
  }
  .main-section {
    margin-bottom: 24px;
  }
  .main-section h3 {
    font-size: 10pt;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1a1d20;
    margin-bottom: 4px;
  }
  .main-line {
    border-bottom: 1.5px solid #cbd5e1;
    margin-bottom: 14px;
  }
</style></head><body>
<div id="main-container">
  <div class="header-wrap">
    <div class="header-left">
      <div class="avatar-container">
        <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_1.jpg'}" alt="photo" />
      </div>
      <div>
        <h1>${data.name}</h1>
        ${data.title ? `<div class="role">${data.title}</div>` : ''}
      </div>
    </div>
    
    <div class="header-contacts">
      ${data.phone ? `<div>${data.phone}</div>` : ''}
      ${data.email ? `<div>${data.email}</div>` : ''}
      ${data.location ? `<div>${data.location}</div>` : ''}
    </div>
  </div>
  
  <div class="body-grid">
    <div class="left-col">
      ${eduHtml}
      ${skillsHtml}
      ${langHtml}
    </div>
    
    <div class="right-col">
      ${data.summary ? `
        <div class="main-section">
          <h3>Profile</h3>
          <div class="main-line"></div>
          <div style="font-size: 8.8pt; color: #475569; line-height: ${lineSpacing};">${data.summary}</div>
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
      
      ${refHtml}
    </div>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 17. LORNA ALVARADO — Sage-Slate Ribbon Layout (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════