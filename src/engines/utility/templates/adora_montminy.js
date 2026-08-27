// ═══════════════════════════════════════════════════════════════════════════════
// ADORA MONTMINY — Exact Pixel-Perfect Replica of media_1787663074998.png
// Gradient Blue & Slate Diagonal Cut, Halo Avatar, Bracket Timeline
// ═══════════════════════════════════════════════════════════════════════════════

export function generateAdoraMontminyHtml(
  data,
  themeColor = '#1d8cf8',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const gradientStart = themeColor === 'default' || !themeColor ? '#1d8cf8' : themeColor;
  const gradientEnd = '#38bdf8';
  const slateDark = '#1f2937';
  const sidebarBg = '#f0f2f5';
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  const summaryHtml = data.summary ? `
    <div class="sidebar-block">
      <div class="block-heading">
        <svg class="head-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        <span>About Me</span>
      </div>
      <div class="summary-p">${data.summary}</div>
    </div>
  ` : '';

  const contactHtml = `
    <div class="sidebar-block">
      <div class="block-heading">
        <svg class="head-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
        <span>Contact</span>
      </div>
      <div class="contact-list">
        ${data.phone ? `
          <div class="contact-row">
            <svg class="c-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
            <span>${data.phone}</span>
          </div>
        ` : ''}
        ${data.email ? `
          <div class="contact-row">
            <svg class="c-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            <span style="word-break: break-all;">${data.email}</span>
          </div>
        ` : ''}
        ${data.location ? `
          <div class="contact-row">
            <svg class="c-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span>${data.location}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  const skillsHtml = data.skills && data.skills.length ? `
    <div class="sidebar-block">
      <div class="block-heading">
        <svg class="head-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
        <span>Skills</span>
      </div>
      <ul class="bullet-list">
        ${data.skills.map(s => {
          const name = s.includes(' - ') ? s.split(' - ')[0] : s;
          return `<li>${name}</li>`;
        }).join('')}
      </ul>
    </div>
  ` : '';

  const langList = data.custom_languages || (data.certifications && data.certifications.length ? data.certifications : ['English', 'French']);
  const languageHtml = `
    <div class="sidebar-block">
      <div class="block-heading">
        <svg class="head-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
        <span>Language</span>
      </div>
      <ul class="bullet-list">
        ${langList.map(l => `<li>${typeof l === 'string' ? l : l.name || 'Language'}</li>`).join('')}
      </ul>
    </div>
  `;

  const eduHtml = data.education && data.education.length ? `
    <div class="main-block">
      <div class="main-heading">
        <svg class="main-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
        <span>Education</span>
      </div>
      <div class="bracket-list">
        ${data.education.map(e => `
          <div class="bracket-item">
            <div class="bracket-dot-top"></div>
            <div class="bracket-dot-bottom"></div>
            <div class="b-date">(${e.start || '2011'} - ${e.end || '2015'})</div>
            <div class="b-inst">${e.school || 'WARDIERE UNIVERSITY'}</div>
            <div class="b-deg">${e.degree || 'Bachelor of Design'}</div>
            ${e.note ? `<div class="b-note">${e.note}</div>` : '<div class="b-note">3.65</div>'}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const expHtml = data.experience && data.experience.length ? `
    <div class="main-block">
      <div class="main-heading">
        <svg class="main-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
        <span>Experience</span>
      </div>
      <div class="bracket-list">
        ${data.experience.map(e => `
          <div class="bracket-item">
            <div class="bracket-dot-top"></div>
            <div class="bracket-dot-bottom"></div>
            <div class="b-date">(${e.start || '2020'} - ${e.end || '2024'})</div>
            <div class="b-role">${e.role || 'SENIOR GRAPHIC DESIGNER'}</div>
            <div class="b-comp">${e.company || 'Fauget studio'}</div>
            ${e.highlights && e.highlights.filter(Boolean).length ? `
              <ul class="b-desc">
                ${e.highlights.filter(Boolean).map(h => `<li>${h}</li>`).join('')}
              </ul>
            ` : `
              <ul class="b-desc">
                <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pharetra in lorem at laoreet.</li>
              </ul>
            `}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 0; size: A4; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: ${fontFam};
      background: #ffffff;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    #main-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    /* Top Gradient & Slate Shapes */
    .top-shapes {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 110px;
      z-index: 1;
      overflow: hidden;
    }
    .shape-gradient {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 110px;
      background: linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%);
      clip-path: polygon(0 0, 100% 0, 100% 40%, 0 100%);
    }
    .shape-dark-wedge {
      position: absolute;
      top: 0;
      right: 0;
      width: 48%;
      height: 110px;
      background: ${slateDark};
      clip-path: polygon(35% 0, 100% 0, 100% 100%, 0 0);
    }
    
    /* Header Area */
    .header-area {
      position: relative;
      z-index: 5;
      display: flex;
      padding: ${15 + pageMargin}px 35px 10px 35px;
      align-items: center;
      gap: 30px;
      min-height: 180px;
    }
    .avatar-wrapper {
      width: 38%;
      display: flex;
      justify-content: center;
      flex-shrink: 0;
    }
    .avatar {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      border: 5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      object-fit: cover;
      background: #ffffff;
    }
    .name-title-box {
      flex: 1;
      padding-top: 15px;
    }
    .name-title-box h1 {
      font-size: 27pt;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.05;
      letter-spacing: -0.5px;
      white-space: pre-line;
    }
    .name-title-box .job-title {
      font-size: 11pt;
      font-weight: 500;
      color: #475569;
      margin-top: 6px;
      letter-spacing: 0.3px;
    }
    
    /* 2-Column Content */
    .content-body {
      position: relative;
      z-index: 4;
      display: flex;
      flex: 1;
      min-height: calc(297mm - 210px);
    }
    
    /* Left Sidebar (38%) */
    .left-col {
      width: 38%;
      background: ${sidebarBg};
      padding: 15px 24px 40px 35px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .sidebar-block {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .block-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .head-icon {
      width: 16px;
      height: 16px;
      color: #1e293b;
      flex-shrink: 0;
    }
    .summary-p {
      font-size: 8.5pt;
      color: #475569;
      line-height: ${lineSpacing};
      text-align: justify;
    }
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 8.5pt;
      color: #334155;
    }
    .contact-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .c-svg {
      width: 14px;
      height: 14px;
      color: #1e293b;
      flex-shrink: 0;
    }
    .bullet-list {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #334155;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .bullet-list li {
      line-height: 1.3;
    }
    
    /* Right Column (62%) */
    .right-col {
      width: 62%;
      background: #ffffff;
      padding: 15px 35px 40px 28px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .main-block {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .main-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 14px;
    }
    .main-icon {
      width: 18px;
      height: 18px;
      color: #1e293b;
      flex-shrink: 0;
    }
    
    /* Bracket Timeline Items */
    .bracket-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-left: 6px;
    }
    .bracket-item {
      position: relative;
      border-left: 1.5px solid #1e293b;
      padding-left: 18px;
      padding-top: 1px;
      padding-bottom: 4px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .bracket-dot-top {
      position: absolute;
      top: -1px;
      left: -4px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #1e293b;
    }
    .bracket-dot-bottom {
      position: absolute;
      bottom: -1px;
      left: -4px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #1e293b;
    }
    .b-date {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 3px;
      font-variant-numeric: tabular-nums;
    }
    .b-inst, .b-role {
      font-size: 8.8pt;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .b-deg, .b-comp {
      font-size: 8.5pt;
      color: #475569;
      margin-bottom: 2px;
    }
    .b-note {
      font-size: 8.2pt;
      color: #64748b;
    }
    .b-desc {
      padding-left: 16px;
      font-size: 8.5pt;
      color: #475569;
      line-height: ${lineSpacing};
      margin-top: 4px;
    }
    .b-desc li {
      margin-bottom: 2px;
    }
    
    /* Bottom Gradient Shape */
    .bottom-shapes {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 36px;
      z-index: 10;
      overflow: hidden;
    }
    .foot-gradient {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 36px;
      background: linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%);
      clip-path: polygon(0 40%, 80% 0, 100% 15%, 100% 100%, 0 100%);
    }
  </style>
</head>
<body>
<div id="main-container">
  <div class="top-shapes">
    <div class="shape-gradient"></div>
    <div class="shape-dark-wedge"></div>
  </div>
  
  <div class="header-area">
    <div class="avatar-wrapper">
      ${data.photoUrl ? `<img class="avatar" src="${data.photoUrl}" alt="Photo" />` : '<div class="avatar" style="background:#cbd5e1;"></div>'}
    </div>
    <div class="name-title-box">
      <h1>${data.name ? data.name.replace(' ', '\n') : 'Adora\nMontminy'}</h1>
      <div class="job-title">${data.title || 'Graphics Designer'}</div>
    </div>
  </div>
  
  <div class="content-body">
    <div class="left-col">
      ${summaryHtml}
      ${contactHtml}
      ${skillsHtml}
      ${languageHtml}
    </div>
    
    <div class="right-col">
      ${eduHtml}
      ${expHtml}
    </div>
  </div>
  
  <div class="bottom-shapes">
    <div class="foot-gradient"></div>
  </div>
</div>
</body>
</html>`;
}
