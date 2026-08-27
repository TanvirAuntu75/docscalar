// ═══════════════════════════════════════════════════════════════════════════════
// ADAM FLETCHER — Exact 1:1 Pixel-Perfect Replica from User Template
// Precision Fixed A4 Canvas (794px x 1123px) with Full-Width Dark Slate Banner & Greyscale Halo
// ═══════════════════════════════════════════════════════════════════════════════

export function generateAdamFletcherHtml(
  data,
  themeColor = '#32353e',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const slateColor = themeColor === 'default' || !themeColor ? '#32353e' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Name splitting for Adam Fletcher styling
  const nameParts = (data.name || 'Adam Fletcher').trim().split(' ');
  const firstName = nameParts[0] || 'Adam';
  const lastName = nameParts.slice(1).join(' ') || 'Fletcher';

  const photoSrc = data.photoUrl || '/images/candidates/adam.jpg';

  const summaryText = data.summary || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pharetra in lorem at laoreet. Donec hendrerit libero eget est tempor, quis tempus arcu elementum.';

  const phoneText = data.phone || '+123-456-7890';
  const emailText = data.email || 'hello@reallygreatsite.com';
  const locationText = data.location || '123 Anywhere St., Any City,<br>ST 12345';

  const skillsList = data.skills && data.skills.length ? data.skills : ['Web Design', 'Branding', 'Graphic Design', 'SEO', 'Marketing'];
  const languageList = data.custom_languages && data.custom_languages.length ? data.custom_languages : ['English', 'French'];

  const educationList = data.education && data.education.length ? data.education : [
    { start: '2011', end: '2015', school: 'NORTH COLLEGE', degree: 'Bachelor of Design', note: '3.65' },
    { start: '2014', end: '2019', school: 'WEST UNIVERSITY', degree: 'Bachelor of Design', note: '3.74' }
  ];

  const experienceList = data.experience && data.experience.length ? data.experience : [
    { 
      start: '2020', 
      end: '2030', 
      role: 'SENIOR GRAPHIC DESIGNER', 
      company: 'Creative Lab', 
      highlights: [
        'Create compelling visual concepts for diverse digital marketing campaigns.',
        'Develop and maintain a consistent brand identity across all platforms.'
      ] 
    },
    { 
      start: '2017', 
      end: '2019', 
      role: 'SENIOR GRAPHIC DESIGNER', 
      company: 'Studio North', 
      highlights: [
        'Prepare final layout designs for both print and digital publication.',
        'Design engaging graphics for social media and website interfaces.'
      ] 
    }
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Adam Fletcher - Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 0; size: A4; }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background-color: #ffffff;
      font-family: ${fontFam};
      margin: 0;
      padding: 0;
      width: 794px;
      height: 1123px;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Fixed A4 Canvas (794px x 1123px) */
    .resume-canvas {
      width: 794px;
      height: 1123px;
      background-color: #ffffff;
      position: relative;
      overflow: hidden;
      margin: 0 auto;
    }

    /* Full-height Left Sidebar Background (extends to the very top) */
    .sidebar-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 310px;
      height: 1123px;
      background-color: #dbdad8;
      z-index: 1;
    }

    /* Full-width Dark Slate Horizontal Banner */
    .dark-header-bar {
      position: absolute;
      top: 55px;
      left: 0;
      width: 794px;
      height: 175px;
      background-color: ${slateColor};
      z-index: 2;
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
    }

    /* Header Text Content */
    .header-text-container {
      position: absolute;
      top: 85px;
      left: 360px;
      z-index: 3;
    }

    .name-line-1 {
      font-size: 42px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1;
      letter-spacing: 2px;
    }

    .name-line-2 {
      font-size: 38px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.1;
      letter-spacing: 8px;
      margin-top: 4px;
    }

    .header-job-title {
      font-size: 16px;
      font-weight: 400;
      color: #ffffff;
      margin-top: 10px;
      letter-spacing: 0.3px;
    }

    /* Profile Photo Circle */
    .profile-photo {
      position: absolute;
      top: 25px;
      left: 38px;
      width: 236px;
      height: 236px;
      border-radius: 50%;
      border: 9px solid #ffffff;
      object-fit: cover;
      object-position: center 15%;
      filter: grayscale(100%) contrast(105%);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
      z-index: 5;
      background-color: #ffffff;
    }

    /* Sidebar Content */
    .sidebar-content {
      position: absolute;
      top: 295px;
      left: 0;
      width: 310px;
      padding: 0 28px 30px 34px;
      z-index: 3;
    }

    .sidebar-section {
      margin-bottom: 24px;
    }

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 11px;
    }

    .section-title-wrap svg {
      width: 20px;
      height: 20px;
      fill: #1f2228;
      flex-shrink: 0;
    }

    .section-title-wrap h2 {
      font-size: 17.5px;
      font-weight: 700;
      color: #1f2228;
      letter-spacing: -0.2px;
    }

    .about-text {
      font-size: 10.8px;
      line-height: ${lineSpacing};
      color: #3b3e45;
      text-align: justify;
    }

    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .contact-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 11.5px;
      color: #2b2e34;
      font-weight: 500;
    }

    .contact-item svg {
      width: 15px;
      height: 15px;
      fill: #1f2228;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .contact-address {
      line-height: 1.35;
    }

    .bullet-list {
      list-style-type: disc;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .bullet-list li {
      font-size: 11.5px;
      color: #2b2e34;
      font-weight: 500;
    }

    /* Right Main Panel */
    .main-panel {
      position: absolute;
      top: 275px;
      left: 310px;
      width: 484px;
      padding: 0 44px 35px 42px;
      z-index: 3;
    }

    .main-section {
      margin-bottom: 24px;
    }

    .entries-list {
      display: flex;
      flex-direction: column;
      gap: 18px;
      margin-top: 12px;
    }

    .entry-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .entry-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background-color: #1f2228;
      flex-shrink: 0;
      margin-top: 3px;
    }

    .entry-body {
      flex: 1;
    }

    .entry-date {
      font-size: 14px;
      font-weight: 700;
      color: #1f2228;
      margin-bottom: 2px;
    }

    .entry-org {
      font-size: 11.5px;
      font-weight: 700;
      color: #1f2228;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .entry-sub {
      font-size: 11px;
      color: #4a4c52;
      margin-top: 1px;
    }

    .entry-bullets {
      font-size: 11px;
      line-height: ${lineSpacing};
      color: #3b3e45;
      padding-left: 15px;
      margin-top: 5px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  </style>
</head>
<body>

  <div class="resume-canvas">
    <!-- Full Height Left Sidebar Background -->
    <div class="sidebar-bg"></div>

    <!-- Full Width Dark Slate Horizontal Strip -->
    <div class="dark-header-bar"></div>

    <!-- Header Name & Title (Over Dark Strip) -->
    <div class="header-text-container">
      <div class="name-line-1">${firstName}</div>
      <div class="name-line-2">${lastName}</div>
      <div class="header-job-title">${data.title || 'Graphics Designer'}</div>
    </div>

    <!-- Circular Profile Photo -->
    <img class="profile-photo" src="${photoSrc}" alt="${data.name || 'Adam Fletcher'}">

    <!-- Left Sidebar Content -->
    <div class="sidebar-content">
      <!-- About Me -->
      <div class="sidebar-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <h2>About Me</h2>
        </div>
        <p class="about-text">
          ${summaryText}
        </p>
      </div>

      <!-- Contact -->
      <div class="sidebar-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/></svg>
          <h2>Contact</h2>
        </div>
        <div class="contact-list">
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            <span>${phoneText}</span>
          </div>
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            <span>${emailText}</span>
          </div>
          <div class="contact-item">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span class="contact-address">${locationText}</span>
          </div>
        </div>
      </div>

      <!-- Skills -->
      <div class="sidebar-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          <h2>Skills</h2>
        </div>
        <ul class="bullet-list">
          ${skillsList.map(s => {
            const name = typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '';
            return `<li>${name}</li>`;
          }).join('')}
        </ul>
      </div>

      <!-- Language -->
      <div class="sidebar-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
          <h2>Language</h2>
        </div>
        <ul class="bullet-list">
          ${languageList.map(l => `<li>${typeof l === 'string' ? l : l.name || 'Language'}</li>`).join('')}
        </ul>
      </div>
    </div>

    <!-- Right Main Panel Content -->
    <div class="main-panel">
      <!-- Education Section -->
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
          <h2>Education</h2>
        </div>

        <div class="entries-list">
          ${educationList.map(e => `
            <div class="entry-row">
              <div class="entry-dot"></div>
              <div class="entry-body">
                <div class="entry-date">(${e.start || '2011'} -${e.end || '2015'})</div>
                <div class="entry-org">${e.school || 'NORTH COLLEGE'}</div>
                <div class="entry-sub">${e.degree || 'Bachelor of Design'}</div>
                ${e.note ? `<div class="entry-sub">${e.note}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Experience Section -->
      <div class="main-section">
        <div class="section-title-wrap">
          <svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
          <h2>Experience</h2>
        </div>

        <div class="entries-list">
          ${experienceList.map(e => `
            <div class="entry-row">
              <div class="entry-dot"></div>
              <div class="entry-body">
                <div class="entry-date">(${e.start || '2020'} -${e.end || '2030'})</div>
                <div class="entry-org">${e.role || 'SENIOR GRAPHIC DESIGNER'}</div>
                <div class="entry-sub">${e.company || 'Creative Lab'}</div>
                ${e.highlights && e.highlights.filter(Boolean).length ? `
                  <ul class="entry-bullets">
                    ${e.highlights.filter(Boolean).map(h => `<li>${h.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
                  </ul>
                ` : `
                  <ul class="entry-bullets">
                    <li>Create compelling visual concepts for diverse digital marketing campaigns.</li>
                    <li>Develop and maintain a consistent brand identity across all platforms.</li>
                  </ul>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;
}
