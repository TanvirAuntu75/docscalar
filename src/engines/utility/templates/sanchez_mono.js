export function generateSanchezMonoHtml(data, themeColor = '#475569', themeFont = 'Inter', sectionOrder = ['summary','experience','education','skills','projects','certifications'], themeLayout = 'single', pageMargin = 0, lineSpacing = 1.45) {
  const accent = themeColor === 'default' ? '#475569' : themeColor;

  const expHtml = data.experience.map(e => `
    <div class="timeline-item">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span style="font-weight: 700; font-size: 9.5pt; color: #1f2937;">${e.role}</span>
        <span style="font-size: 8pt; color: #6b7280; font-style: italic;">${e.start} – ${e.end}</span>
      </div>
      <div style="font-size: 8.5pt; color: #4b5563; font-weight: 600; margin-top: 1px;">${e.company}</div>
      ${e.highlights && e.highlights.length ? `<ul style="padding-left: 14px; font-size: 8.5pt; color: #4b5563; line-height: 1.45; margin-top: 6px;">${e.highlights.map(h => `<li style="margin-bottom: 2px;">• ${h}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const eduHtml = data.education && data.education.length ? `
    <section class="main-section">
      <h2 class="section-title">Education</h2>
      <div class="section-line"></div>
      <div class="timeline-wrap">
        ${data.education.map(e => `
          <div class="timeline-item">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-weight: 700; font-size: 9pt; color: #1f2937;">${e.degree}</span>
              <span style="font-size: 8pt; color: #6b7280; font-style: italic;">${e.start} – ${e.end}</span>
            </div>
            <div style="font-size: 8.2pt; color: #4b5563; margin-top: 1px;">${e.school}${e.note ? ` | GPA: ${e.note}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const refHtml = data.references && data.references.length ? `
    <section class="main-section">
      <h2 class="section-title">References</h2>
      <div class="section-line"></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding-left: 15px;">
        ${data.references.map(r => `
          <div style="font-size: 8.2pt; color: #4b5563; line-height: 1.4;">
            <div style="font-weight: 700; color: #1f2937;">${r.name}</div>
            <div style="color: #6b7280; font-size: 8pt;">${r.relation}</div>
            <div>Phone: ${r.phone}</div>
            <div>Email: ${r.email}</div>
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  const projHtml = data.projects && data.projects.length ? `
    <section class="main-section">
      <h2 class="section-title">Projects</h2>
      <div class="section-line"></div>
      <div class="timeline-wrap">
        ${data.projects.map(p => `
          <div style="margin-bottom: 12px; padding-left: 15px; position: relative;">
            <div style="position: absolute; left: -18.5px; top: 5px; width: 6px; height: 6px; border-radius: 50%; background: ${accent};"></div>
            <div style="font-weight: 700; font-size: 9.2pt; color: #1f2937;">${p.name}</div>
            <div style="font-size: 8.5pt; color: #4b5563; margin-top: 1px;">${p.description}</div>
          </div>
        `).join('')}
      </div>
    </section>
  ` : '';

  // Left column elements
  const contactHtml = `
    <div class="sidebar-section">
      <h3>Contact</h3>
      <div class="sidebar-line"></div>
      <div class="contact-list">
        ${data.phone ? `<div class="contact-row"><span>${data.phone}</span></div>` : ''}
        ${data.email ? `<div class="contact-row"><span style="word-break: break-all;">${data.email}</span></div>` : ''}
        ${data.location ? `<div class="contact-row"><span>${data.location}</span></div>` : ''}
      </div>
    </div>
  `;

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
      <h3>Language</h3>
      <div class="sidebar-line"></div>
      <ul style="list-style: none; padding: 0; color: #4b5563;">
        ${langSection.items.map(i => `<li>• ${i.title}${i.value ? ` (${i.value})` : ''}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
  @page { margin: 0; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #374151; padding: 40px 45px; -webkit-print-color-adjust: exact; }
  
  #main-container {
    display: flex;
    flex-direction: column;
    min-height: 297mm;
  }
  
  /* Top Header Block */
  .header-wrap {
    display: flex;
    align-items: center;
    gap: 25px;
    margin-bottom: 30px;
  }
  .avatar-container {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid #e5e7eb;
  }
  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .header-info h1 {
    font-size: 26pt;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.5px;
    line-height: 1.1;
  }
  .header-info .role {
    font-size: 11pt;
    font-weight: 500;
    color: #6b7280;
    margin-top: 4px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  
  /* Body columns split */
  .columns-grid {
    display: flex;
    gap: 35px;
  }
  
  /* Left Column */
  .left-col {
    width: 32%;
  }
  .sidebar-section {
    margin-bottom: 25px;
  }
  .sidebar-section h3 {
    font-size: 9.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #111827;
    margin-bottom: 4px;
  }
  .sidebar-line {
    border-bottom: 1.5px solid ${accent};
    width: 25px;
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
    gap: 8px;
    align-items: center;
  }
  
  /* Right Column */
  .right-col {
    width: 68%;
  }
  .main-section {
    margin-bottom: 24px;
  }
  .section-title {
    font-size: 10pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #111827;
    margin-bottom: 4px;
  }
  .section-line {
    border-bottom: 1.5px solid #e5e7eb;
    margin-bottom: 14px;
  }
  
  /* Timeline */
  .timeline-wrap {
    position: relative;
    padding-left: 15px;
  }
  .timeline-wrap::before {
    content: "";
    position: absolute;
    left: 2px;
    top: 5px;
    bottom: 5px;
    width: 1px;
    background: #e5e7eb;
  }
  .timeline-item {
    position: relative;
    margin-bottom: 18px;
  }
  .timeline-item::before {
    content: "";
    position: absolute;
    left: -16.5px;
    top: 5px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${accent};
  }
</style></head><body>
<div id="main-container">
  <div class="header-wrap">
    <div class="avatar-container">
      <img class="avatar" src="${data.photoUrl || '/images/candidates/candidate_10.jpg'}" alt="photo" />
    </div>
    <div class="header-info">
      <h1>${data.name}</h1>
      ${data.title ? `<div class="role">${data.title}</div>` : ''}
    </div>
  </div>
  
  <div class="columns-grid">
    <div class="left-col">
      ${contactHtml}
      ${skillsHtml}
      ${langHtml}
    </div>
    
    <div class="right-col">
      ${data.experience && data.experience.length ? `
        <section class="main-section">
          <h2 class="section-title">Experience</h2>
          <div class="section-line"></div>
          <div class="timeline-wrap">
            ${expHtml}
          </div>
        </section>
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
// 11. SANCHEZ WAVE — Premium Wave Header Layout (100% Match)
// ═══════════════════════════════════════════════════════════════════════════════