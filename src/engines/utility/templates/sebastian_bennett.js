// ═══════════════════════════════════════════════════════════════════════════════
// SEBASTIAN BENNETT — Exact 1:1 Pixel-Perfect Replica from User Template
// Executive Rounded Card Canvas (794px x 1123px), Horizontal Gray Accent Bars, Multi-Column Skills
// ═══════════════════════════════════════════════════════════════════════════════

export function generateSebastianBennettHtml(
  data,
  themeColor = '#222427',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const slateColor = themeColor === 'default' || !themeColor ? '#222427' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Split name for Sebastian Bennett uppercase header
  const nameParts = (data.name || 'Sebastian Bennett').trim().split(' ');
  const firstName = (nameParts[0] || 'SEBASTIAN').toUpperCase();
  const lastName = (nameParts.slice(1).join(' ') || 'BENNETT').toUpperCase();

  const photoSrc = data.photoUrl || '/images/candidates/sebastian.jpg';

  const summaryText = data.summary || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

  const phoneText = data.phone || '+123-456-7890';
  const emailText = data.email || 'hello@reallygreatsite.com';
  const locationText = data.location || '123 Anywhere St., Any City';

  const rawSkills = data.skills && data.skills.length ? data.skills : [
    'Auditing', 'Financial Accounting', 'Financial Reporting',
    'Expense Reporting', 'Managerial Accounting', 'Accounts Receivable',
    'Leadership', 'Management Skills', 'Time Management'
  ];

  // Distribute skills across columns
  const cleanSkills = rawSkills.map(s => typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '');
  const col1 = cleanSkills.slice(0, 3);
  const col2 = cleanSkills.slice(3, 6);
  const col3 = cleanSkills.slice(6, 9).length ? cleanSkills.slice(6, 9) : ['Leadership', 'Management Skills', 'Time Management'];

  const educationList = data.education && data.education.length ? data.education : [
    {
      start: '2026',
      end: '2029',
      school: 'Borcelle University',
      degree: 'Master of Business Administration',
      note: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam'
    },
    {
      start: '2023',
      end: '2026',
      school: 'Borcelle University',
      degree: 'Bachelor of Arts in Accounting',
      note: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam'
    }
  ];

  const experienceList = data.experience && data.experience.length ? data.experience : [
    {
      start: '2033',
      end: '2035',
      company: 'Salford & Co.',
      role: 'Senior Accountant',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
    },
    {
      start: '2031',
      end: '2033',
      company: 'Salford & Co.',
      role: 'Financial Accountant',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
    },
    {
      start: '2029',
      end: '2031',
      company: 'Salford & Co.',
      role: 'Junior Accountant',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
    }
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sebastian Bennett - Resume</title>
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

    /* Fixed A4 Canvas with Rounded Outer Corners */
    .resume-card {
      width: 794px;
      height: 1123px;
      background-color: #ffffff;
      border-radius: 26px;
      position: relative;
      overflow: hidden;
      padding: 48px 46px;
      display: flex;
      flex-direction: column;
      margin: 0 auto;
    }

    /* Top Header */
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .header-left {
      flex: 1;
      padding-top: 8px;
    }

    .candidate-name {
      font-size: 38px;
      font-weight: 800;
      line-height: 1.05;
      color: #26282b;
      letter-spacing: 2px;
    }

    .candidate-title {
      font-size: 15px;
      font-weight: 500;
      color: #383a3e;
      margin-top: 10px;
      letter-spacing: 0.2px;
    }

    .photo-wrapper {
      width: 150px;
      height: 165px;
      background-color: #8c8f94;
      flex-shrink: 0;
      overflow: hidden;
    }

    .profile-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 15%;
      filter: grayscale(100%) contrast(105%);
    }

    /* Contact Strip */
    .contact-bar {
      background-color: #e8e8e8;
      padding: 7px 14px;
      font-size: 11px;
      font-weight: 500;
      color: #333333;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }

    .contact-bar span.separator {
      color: #777777;
    }

    /* Section Headers with Gray Fill Bars */
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: ${slateColor};
      letter-spacing: 1.5px;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .header-gray-bar {
      flex: 1;
      height: 9px;
      background-color: #e8e8e8;
    }

    /* Section Content Styles */
    .section-block {
      margin-bottom: 18px;
    }

    .profile-text {
      font-size: 10.2px;
      line-height: 1.55;
      color: #3a3c40;
      text-align: justify;
    }

    /* 2-Column Entry Grid for Education & Work Experience */
    .entry-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .entry-row {
      display: flex;
      gap: 18px;
    }

    .entry-meta {
      width: 135px;
      flex-shrink: 0;
    }

    .entry-org {
      font-size: 11px;
      font-weight: 600;
      color: #26282b;
      line-height: 1.3;
    }

    .entry-date {
      font-size: 10.5px;
      color: #4b4d52;
      margin-top: 1px;
    }

    .entry-main {
      flex: 1;
    }

    .entry-role {
      font-size: 12px;
      font-weight: 700;
      color: #222427;
      margin-bottom: 2px;
    }

    .entry-desc {
      font-size: 10.2px;
      line-height: 1.45;
      color: #4a4c50;
      text-align: justify;
    }

    /* Skills Grid */
    .skills-section {
      margin-top: 2px;
    }

    .skills-header-row {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 8px;
    }

    .skills-meta-col {
      width: 135px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .skills-meta-col .section-title {
      font-size: 14px;
      font-weight: 800;
      color: ${slateColor};
      letter-spacing: 1.5px;
    }

    .skills-meta-col .header-gray-bar {
      flex: 1;
      height: 9px;
      background-color: #e8e8e8;
    }

    .skills-sub-headers {
      flex: 1;
      display: flex;
      gap: 18px;
    }

    .skills-sub-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sub-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #222427;
      flex-shrink: 0;
    }

    .skills-sub-box.personal {
      flex: 0.58;
    }

    .skills-content-row {
      display: flex;
      gap: 18px;
    }

    .skills-content-offset {
      width: 135px;
      flex-shrink: 0;
    }

    .skills-columns-container {
      flex: 1;
      display: flex;
      gap: 18px;
    }

    .professional-lists-wrap {
      flex: 1;
      display: flex;
      gap: 14px;
    }

    .personal-lists-wrap {
      flex: 0.58;
    }

    .skill-list {
      list-style-type: disc;
      padding-left: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .skill-list li {
      font-size: 10.2px;
      color: #3a3c40;
      font-weight: 500;
      line-height: 1.35;
    }
  </style>
</head>
<body>

  <div class="resume-card">
    <!-- Top Header: Name, Title & Photo -->
    <div class="header-section">
      <div class="header-left">
        <h1 class="candidate-name">${firstName}<br>${lastName}</h1>
        <div class="candidate-title">${data.title || 'Professional Accountant'}</div>
      </div>
      <div class="photo-wrapper">
        <img class="profile-photo" src="${photoSrc}" alt="${data.name || 'Sebastian Bennett'}">
      </div>
    </div>

    <!-- Contact Info Bar -->
    <div class="contact-bar">
      <span>${phoneText}</span>
      <span class="separator">|</span>
      <span>${emailText}</span>
      <span class="separator">|</span>
      <span>${locationText}</span>
    </div>

    <!-- Profile Section -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-title">PROFILE</span>
      </div>
      <p class="profile-text">
        ${summaryText}
      </p>
    </div>

    <!-- Education Section -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-title">EDUCATION</span>
        <div class="header-gray-bar"></div>
      </div>
      <div class="entry-grid">
        ${educationList.map(e => `
          <div class="entry-row">
            <div class="entry-meta">
              <div class="entry-org">${e.school || 'Borcelle University'}</div>
              <div class="entry-date">${e.start || '2026'}-${e.end || '2029'}</div>
            </div>
            <div class="entry-main">
              <div class="entry-role">${e.degree || 'Bachelor of Arts'}</div>
              <p class="entry-desc">
                ${e.note || e.description || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam'}
              </p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Work Experience Section -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-title">WORK EXPERIENCE</span>
        <div class="header-gray-bar"></div>
      </div>
      <div class="entry-grid">
        ${experienceList.map(e => {
          const desc = e.description || (e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean).join('. ') : 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.');
          return `
            <div class="entry-row">
              <div class="entry-meta">
                <div class="entry-org">${e.company || 'Salford & Co.'}</div>
                <div class="entry-date">${e.start || '2033'} - ${e.end || '2035'}</div>
              </div>
              <div class="entry-main">
                <div class="entry-role">${e.role || 'Senior Accountant'}</div>
                <p class="entry-desc">${desc}</p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Skills Section -->
    <div class="skills-section">
      <!-- Skills Header Line -->
      <div class="skills-header-row">
        <div class="skills-meta-col">
          <span class="section-title">SKILLS</span>
          <div class="header-gray-bar"></div>
        </div>
        <div class="skills-sub-headers">
          <div class="skills-sub-box">
            <span class="sub-title">Professional</span>
            <div class="header-gray-bar"></div>
          </div>
          <div class="skills-sub-box personal">
            <span class="sub-title">Personal</span>
            <div class="header-gray-bar"></div>
          </div>
        </div>
      </div>

      <!-- Skills List Columns -->
      <div class="skills-content-row">
        <div class="skills-content-offset"></div>
        <div class="skills-columns-container">
          <div class="professional-lists-wrap">
            <ul class="skill-list">
              ${col1.map(s => `<li>${s}</li>`).join('')}
            </ul>
            <ul class="skill-list">
              ${col2.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
          <div class="personal-lists-wrap">
            <ul class="skill-list">
              ${col3.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;
}
