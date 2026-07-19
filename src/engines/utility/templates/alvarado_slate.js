export function generateAlvaradoSlateHtml(data, themeColor = '#5c6e73', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#0f3b7d' ? '#5c6e73' : themeColor;
  const sidebarBg = '#e4e6e8';

  const expHtml = data.experience.map(e => `
    <div style="margin-bottom: 20px; position: relative; padding-left: 20px; border-left: 2px solid #cbd5e1; margin-left: 6px;">
      <div style="position: absolute; left: -5px; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: ${accent};"></div>
      <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 9.5pt; color: #374151;">
        <span>${e.company}</span>
        <span style="font-weight: 500; font-style: italic; color: #6b7280;">${e.start} – ${e.end}</span>
      </div>
      <div style="font-size: 8.5pt; color: #4b5563; font-weight: 600; margin-top: 1px;">${e.role}</div>
      ${e.highlights && e.highlights.length ? `<ul style="padding-left: 14px; font-size: 8.5pt; color: #4b5563; line-height: 1.45; margin-top: 6px;">${e.highlights.map(h => `<li style="margin-bottom: 2px;">• ${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const eduHtml = data.education && data.education.length ? `
    <div class="sidebar-section">
      <h3>Education</h3>
      <div class="sidebar-line"></div>
      ${data.education.map(e => `
        <div style="margin-bottom: 12px; font-size: 8.2pt; color: #4b5563;">
          <div style="font-weight: 700; color: #374151;">${e.degree}</div>
          <div style="font-style: italic; margin-top: 1px;">${e.school}</div>
          <div style="color: #6b7280; margin-top: 1px;">${e.start} - ${e.end}</div>
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
            <li style="display: flex; justify-content: space-between; font-size: 8.2pt; color: #4b5563; margin-bottom: 5px;">
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
      <h3>Languages</h3>
      <div class="sidebar-line"></div>
      <ul style="list-style: none; padding: 0; color: #4b5563;">
        ${langSection.items.map(i => `<li>• ${i.title}${i.value ? ` (${i.value})` : ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const refHtml = data.references && data.references.length ? `
    <div style="margin-top: 20px;">
      <h3 style="font-size: 10pt; font-weight: 850; text-transform: uppercase; color: ${accent}; letter-spacing: 1px; margin-bottom: 4px;">Reference</h3>
      <div style="border-bottom: 1.5px solid ${accent}; margin-bottom: 12px; width: 40px;"></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        ${data.references.map(r => `
          <div style="font-size: 8.2pt; color: #4b5563; line-height: 1.4;">
            <div style="font-weight: 700; color: #374151;">${r.name}</div>
            <div style="color: #6b7280; font-size: 8pt;">${r.relation}</div>
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
  body { font-family: 'Inter', sans-serif; background: #fff; color: #374151; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    flex-direction: column;
    min-height: 297mm;
  }
  
  /* Sage Slate Banner Ribbon Header */
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
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
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
  
  /* Sidebar containing contacts & details */
  .sidebar {
    width: 33%;
    background: ${sidebarBg};
    padding: 55px 22px 30px 22px;
    font-size: 8.5pt;
  }
  .sidebar-section {
    margin-bottom: 25px;
  }
  .sidebar-section h3 {
    font-size: 9.5pt;
    font-weight: 850;
    text-transform: uppercase;
    color: #374151;
    margin-bottom: 4px;
  }
  .sidebar-line {
    border-bottom: 1.5px solid ${accent};
    width: 40px;
    margin-bottom: 12px;
  }
  
  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 8.2pt;
    color: #4b5563;
  }
  .contact-row {
    display: flex;
    align-items: center;
    gap: 8px;
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
    font-weight: 850;
    text-transform: uppercase;
    color: ${accent};
    margin-bottom: 4px;
  }
  .main-line {
    border-bottom: 1.5px solid ${accent};
    margin-bottom: 14px;
    width: 40px;
  }
</style></head><body>
<div id="main-container">
  <div class="header-band">
    <div class="avatar-container">
      <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_2.jpg'}" alt="photo" />
    </div>
    <div class="header-name-wrap">
      <h1>${data.name}</h1>
      ${data.title ? `<div class="role">${data.title}</div>` : ''}
    </div>
  </div>
  
  <div class="body-grid">
    <div class="sidebar">
      <div class="sidebar-section">
        <h3>Contact</h3>
        <div class="sidebar-line"></div>
        <div class="contact-list">
          ${data.phone ? `<div class="contact-row"><span>${data.phone}</span></div>` : ''}
          ${data.email ? `<div class="contact-row"><span style="word-break: break-all;">${data.email}</span></div>` : ''}
          ${data.location ? `<div class="contact-row"><span>${data.location}</span></div>` : ''}
        </div>
      </div>
      
      ${eduHtml}
      ${skillsHtml}
      ${langHtml}
    </div>
    
    <div class="main-content">
      ${data.summary ? `
        <div class="main-section">
          <h3>Profile</h3>
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
      
      ${refHtml}
    </div>
  </div>
</div>
</body></html>`;
}