export function generateZivOliveHtml(data, themeColor = '#8c9586', themeFont = 'Playfair Display', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' || themeColor === '#2c3549' ? '#8c9586' : themeColor;
  const headerBg = '#e5e3dc';

  const expHtml = data.experience.map(e => `
    <div style="margin-bottom: 18px;">
      <div style="font-weight: 700; font-size: 9.5pt; color: #374151;">${e.role}</div>
      <div style="font-size: 8.5pt; color: #6b7280; font-style: italic; margin-top: 1px; margin-bottom: 6px;">
        ${e.company} | ${e.start} – ${e.end}
      </div>
      ${e.highlights && e.highlights.length ? `<ul style="padding-left: 14px; font-size: 8.5pt; color: #4b5563; line-height: 1.4;">${e.highlights.map(h => `<li style="margin-bottom: 2px;">• ${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const eduHtml = data.education && data.education.length ? `
    <div style="margin-top: 22px;">
      <h3 style="font-size: 10pt; font-weight: 800; text-transform: uppercase; color: #374151; letter-spacing: 1.5px; margin-bottom: 4px;">Educational History</h3>
      <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;"></div>
      ${data.education.map(e => `
        <div style="margin-bottom: 12px; font-size: 8.5pt; color: #4b5563;">
          <div style="font-weight: 700; color: #374151;">${e.school}</div>
          <div style="font-style: italic; margin-top: 1px;">${e.degree} | ${e.start} - ${e.end}</div>
          ${e.note ? `<div style="font-size: 8pt; color: #6b7280; margin-top: 1px;">GPA: ${e.note}</div>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <div style="margin-top: 22px;">
      <h3 style="font-size: 10pt; font-weight: 800; text-transform: uppercase; color: #374151; letter-spacing: 1.5px; margin-bottom: 4px;">Projects</h3>
      <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;"></div>
      ${data.projects.map(p => `
        <div style="margin-bottom: 10px; font-size: 8.5pt; color: #4b5563;">
          <strong>${p.name}</strong> – ${p.description}
        </div>
      `).join('')}
    </div>
  ` : '';

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-section">
      <h3>Skills</h3>
      <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
        ${data.skills.map((s, idx) => {
          let name = s;
          let levelText = ['Expert', 'Advanced', 'Intermediate'][idx % 3];
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            name = parts[0];
            levelText = parts[1];
          }
          return `
            <div style="display: flex; justify-content: space-between; font-size: 8.2pt; color: rgba(255, 255, 255, 0.85);">
              <span>• ${name}</span>
              <span style="color: rgba(255,255,255,0.5); font-size: 7.8pt;">${levelText}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const langSection = (data.customSections || []).find(cs => cs.id === 'custom_languages' || cs.title?.toLowerCase() === 'languages');
  const langHtml = langSection && langSection.items?.length ? `
    <div class="sidebar-section">
      <h3>Language</h3>
      <ul style="list-style: none; padding: 0; color: rgba(255, 255, 255, 0.8); margin-top: 10px;">
        ${langSection.items.map(i => `<li>• ${i.title}${i.value ? ` (${i.value})` : ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #374151; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    flex-direction: column;
    min-height: 297mm;
  }
  
  /* Split Banner Header */
  .header-wrap {
    display: flex;
    height: 150px;
    background: #fff;
  }
  .header-left-photo {
    width: 32%;
    background: ${accent};
    position: relative;
  }
  .header-photo-square {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .header-right-band {
    width: 68%;
    background: ${headerBg};
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-left: 35px;
  }
  .header-right-band h1 {
    font-family: 'Playfair Display', serif;
    font-size: 28pt;
    font-weight: 700;
    color: #374151;
    line-height: 1.1;
  }
  .header-right-band .role {
    font-size: 10.5pt;
    font-weight: 600;
    color: #6b7280;
    margin-top: 4px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  
  /* Body grid split */
  .body-grid {
    display: flex;
    flex: 1;
  }
  
  /* Sidebar */
  .sidebar {
    width: 32%;
    background: ${accent};
    color: #fff;
    padding: 40px 18px;
    font-size: 8.5pt;
  }
  .sidebar-section {
    margin-bottom: 28px;
  }
  .sidebar-section h3 {
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    border-bottom: 1.5px solid rgba(255, 255, 255, 0.3);
    padding-bottom: 5px;
    margin-bottom: 10px;
  }
  
  /* Main Content Area */
  .main-content {
    width: 68%;
    padding: 35px;
    background: #fbfbf9;
  }
  
  /* Horizontal Contact Footer bar */
  .contact-footer-bar {
    background: #e5e3dc;
    border-top: 1.5px solid rgba(0, 0, 0, 0.05);
    padding: 12px 25px;
    display: flex;
    justify-content: space-around;
    font-size: 8.2pt;
    color: #374151;
  }
</style></head><body>
<div id="main-container">
  <div class="header-wrap">
    <div class="header-left-photo">
      <img class="header-photo-square" src="${data.photoUrl || '/images/candidates/candidate_14.jpg'}" alt="photo" />
    </div>
    <div class="header-right-band">
      <h1>${data.name}</h1>
      ${data.title ? `<div class="role">${data.title}</div>` : ''}
    </div>
  </div>
  
  <div class="body-grid">
    <div class="sidebar">
      ${data.summary ? `
        <div class="sidebar-section">
          <h3>Profile</h3>
          <div style="line-height: 1.45; color: rgba(255, 255, 255, 0.85); margin-top: 10px;">${data.summary}</div>
        </div>
      ` : ''}
      
      ${skillsHtml}
      ${langHtml}
    </div>
    
    <div class="main-content">
      ${data.experience && data.experience.length ? `
        <div>
          <h3 style="font-size: 10pt; font-weight: 800; text-transform: uppercase; color: #374151; letter-spacing: 1.5px; margin-bottom: 4px;">Work Experience</h3>
          <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;"></div>
          <div>${expHtml}</div>
        </div>
      ` : ''}
      
      ${eduHtml}
      ${projHtml}
    </div>
  </div>
  
  <div class="contact-footer-bar">
    ${data.phone ? `<span>${data.phone}</span>` : ''}
    ${data.email ? `<span>${data.email}</span>` : ''}
    ${data.website ? `<span>${data.website}</span>` : ''}
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 15. ADORA DIAGONAL — Sky Blue Geometric Waves Layout (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════