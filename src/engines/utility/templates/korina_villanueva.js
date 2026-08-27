// ═══════════════════════════════════════════════════════════════════════════════
// KORINA VILLANUEVA — Exact 1:1 Pixel-Perfect Replica from User Template
// Pointed Pennant/Chevron Frame, Rating Dots Skills, & Horizontal Language Progress Tracks
// ═══════════════════════════════════════════════════════════════════════════════

export function generateKorinaVillanuevaHtml(
  data,
  themeColor = '#112338',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const navyColor = themeColor === 'default' || !themeColor ? '#112338' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  const candidateName = (data.name || 'KORINA VILLANUEVA').toUpperCase();
  const photoSrc = data.photoUrl || '/images/candidates/korina.jpg';

  const summaryText = data.summary || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sit amet sem nec risus egestas accumsan. In enim nunc, tincidunt ut quam eget, luctus sollicitudin neque. Sed leo nisl, semper ac hendrerit a, sollicitudin in arcu.';

  const phoneText = data.phone || '+123-456-7890';
  const emailText = data.email || 'hello@reallygreatsite.com';
  const websiteText = data.website || 'www.reallygreatsite.com';
  const locationText = data.location || '123 Anywhere St., Any City';

  const rawSkills = data.skills && data.skills.length ? data.skills : [
    'Organized', 'Communication', 'Teamwork', 'Meeting deadlines', 'Critical thinking'
  ];

  // Map skills to rating dots (default ratings if not specified)
  const defaultRatings = [4, 3, 2, 3, 4];
  const skillsWithRatings = rawSkills.map((s, idx) => {
    let name = typeof s === 'string' ? s : s.name || '';
    let rating = defaultRatings[idx % defaultRatings.length];
    if (typeof s === 'string' && s.includes(' - ')) {
      const parts = s.split(' - ');
      name = parts[0];
      const levelStr = parts[1].toLowerCase();
      if (levelStr.includes('expert') || levelStr.includes('native')) rating = 4;
      else if (levelStr.includes('advanced')) rating = 3;
      else if (levelStr.includes('intermediate')) rating = 2;
      else rating = 1;
    }
    return { name, rating };
  });

  const educationList = data.education && data.education.length ? data.education : [
    { degree: 'Bachelor of Design', school: 'Really Great University', year: '2012-2016', loc: '123 Anywhere St., Any City' },
    { degree: 'Master of Design', school: 'Really Great University', year: '2016-2020', loc: '123 Anywhere St., Any City' }
  ];

  const experienceList = data.experience && data.experience.length ? data.experience : [
    {
      role: 'Graphic Designer',
      company: 'Aldenaire & Partners',
      date: 'Jan 2021 - Jan 2026',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sit amet sem nec risus egestas accumsan. In enim nunc, tincidunt ut quam eget, luctus sollicitudin neque.'
    },
    {
      role: 'Graphic Designer',
      company: 'Warner & Spencer',
      date: 'Jan 2020 - Dec 2020',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sit amet sem nec risus egestas accumsan. In enim nunc, tincidunt ut quam eget, luctus sollicitudin neque.'
    },
    {
      role: 'Graphic Designer',
      company: 'Ingoude Company',
      date: 'Jan 2017 - Dec 2019',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sit amet sem nec risus egestas accumsan. In enim nunc, tincidunt ut quam eget, luctus sollicitudin neque.'
    }
  ];

  const languageList = [
    { name: 'French', percent: 65 },
    { name: 'English', percent: 88 },
    { name: 'Spanish', percent: 35 }
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Korina Villanueva - Resume</title>
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

    /* Fixed A4 Canvas with Rounded Outer Frame */
    .resume-canvas {
      width: 794px;
      height: 1123px;
      background-color: #ffffff;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      padding: 50px 48px 40px 48px;
      display: flex;
      flex-direction: column;
      margin: 0 auto;
    }

    /* Top Header Area */
    .top-header {
      display: flex;
      gap: 45px;
      margin-bottom: 35px;
      align-items: flex-start;
    }

    /* Pointed Pennant / Chevron Shaped Photo Frame */
    .photo-wrapper {
      width: 185px;
      height: 250px;
      clip-path: polygon(0 0, 100% 0, 100% 84%, 50% 100%, 0 84%);
      background-color: #e2e8f0;
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

    /* Top Right Header Details */
    .header-details {
      flex: 1;
      padding-top: 25px;
    }

    .candidate-name {
      font-size: 34px;
      font-weight: 800;
      color: ${navyColor};
      letter-spacing: 1.5px;
      line-height: 1.1;
      text-transform: uppercase;
    }

    .candidate-title {
      font-size: 16px;
      font-weight: 500;
      color: #334155;
      margin-top: 8px;
      margin-bottom: 24px;
      letter-spacing: 0.2px;
    }

    .summary-text {
      font-size: 10px;
      line-height: ${lineSpacing};
      color: #475569;
      text-align: justify;
    }

    /* Two-Column Lower Content Layout */
    .main-content {
      display: flex;
      gap: 45px;
      flex: 1;
    }

    /* Section Title Styles */
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: ${navyColor};
      margin-bottom: 14px;
      letter-spacing: -0.2px;
    }

    /* Left Sidebar Column */
    .left-col {
      width: 185px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Contact Details */
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 10px;
      color: #334155;
      font-weight: 500;
      word-break: break-all;
    }

    .contact-item svg {
      width: 14px;
      height: 14px;
      fill: ${navyColor};
      flex-shrink: 0;
    }

    /* Education Section */
    .edu-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .edu-item {
      display: flex;
      flex-direction: column;
    }

    .edu-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-bullet-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: ${navyColor};
      flex-shrink: 0;
    }

    .edu-degree {
      font-size: 11px;
      font-weight: 700;
      color: ${navyColor};
    }

    .edu-school {
      font-size: 9.5px;
      color: #475569;
      margin-top: 3px;
      padding-left: 15px;
    }

    .edu-year {
      font-size: 9px;
      color: #64748b;
      margin-top: 1px;
      padding-left: 15px;
    }

    .edu-loc {
      font-size: 9px;
      color: #64748b;
      margin-top: 1px;
      padding-left: 15px;
    }

    /* Skills Rating List with Dots */
    .skills-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .skill-name {
      font-size: 10px;
      color: #334155;
      font-weight: 500;
    }

    .skill-dots {
      display: flex;
      gap: 5px;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .dot.filled {
      background-color: ${navyColor};
    }

    .dot.empty {
      background-color: transparent;
      border: 1.2px solid ${navyColor};
    }

    /* Right Main Panel Column */
    .right-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    /* Experience Section */
    .exp-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .exp-item {
      display: flex;
      flex-direction: column;
    }

    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }

    .exp-role-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .exp-role {
      font-size: 11.5px;
      font-weight: 700;
      color: ${navyColor};
    }

    .exp-date {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 500;
    }

    .exp-company {
      font-size: 10px;
      color: #475569;
      margin-bottom: 5px;
      padding-left: 15px;
    }

    .exp-desc {
      font-size: 9.5px;
      line-height: ${lineSpacing};
      color: #475569;
      text-align: justify;
      padding-left: 15px;
    }

    /* Language Section */
    .lang-row {
      display: flex;
      gap: 22px;
    }

    .lang-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .lang-name {
      font-size: 10px;
      color: #334155;
      font-weight: 500;
    }

    .lang-progress-track {
      width: 100%;
      height: 6px;
      background-color: #dbe3eb;
      border-radius: 4px;
      overflow: hidden;
    }

    .lang-progress-fill {
      height: 100%;
      background-color: ${navyColor};
      border-radius: 4px;
    }

    /* Reference Section */
    .ref-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }

    .ref-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ref-name {
      font-size: 10.5px;
      font-weight: 700;
      color: ${navyColor};
    }

    .ref-sub {
      font-size: 9.5px;
      color: #64748b;
    }
  </style>
</head>
<body>

  <div class="resume-canvas">
    <!-- Top Header (Pointed Photo + Details) -->
    <div class="top-header">
      <!-- Pennant / Chevron Shape Profile Frame -->
      <div class="photo-wrapper">
        <img class="profile-photo" src="${photoSrc}" alt="${data.name || 'Korina Villanueva'}">
      </div>

      <!-- Candidate Title & Summary -->
      <div class="header-details">
        <h1 class="candidate-name">${candidateName}</h1>
        <div class="candidate-title">${data.title || 'Graphic Designer'}</div>
        <p class="summary-text">
          ${summaryText}
        </p>
      </div>
    </div>

    <!-- Main Content (2 Columns) -->
    <div class="main-content">
      
      <!-- Left Column -->
      <div class="left-col">
        <!-- Contact -->
        <div>
          <div class="section-title">Contact</div>
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
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              <span>${websiteText}</span>
            </div>
            <div class="contact-item">
              <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>${locationText}</span>
            </div>
          </div>
        </div>

        <!-- Education -->
        <div>
          <div class="section-title">Education</div>
          <div class="edu-list">
            ${educationList.map(e => `
              <div class="edu-item">
                <div class="edu-header">
                  <span class="section-bullet-dot"></span>
                  <span class="edu-degree">${e.degree || 'Bachelor of Design'}</span>
                </div>
                <div class="edu-school">${e.school || 'Really Great University'}</div>
                <div class="edu-year">${e.year || `${e.start || '2012'}-${e.end || '2016'}`}</div>
                <div class="edu-loc">${e.loc || e.location || '123 Anywhere St., Any City'}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Skills -->
        <div>
          <div class="section-title">Skills</div>
          <div class="skills-list">
            ${skillsWithRatings.map(s => `
              <div class="skill-row">
                <span class="skill-name">${s.name}</span>
                <div class="skill-dots">
                  ${[1, 2, 3, 4].map(idx => `
                    <span class="dot ${idx <= s.rating ? 'filled' : 'empty'}"></span>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="right-col">
        <!-- Experience -->
        <div>
          <div class="section-title">Experience</div>
          <div class="exp-list">
            ${experienceList.map(e => {
              const desc = e.description || (e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean).join('. ') : 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
              const date = e.date || `${e.start || 'Jan 2021'} - ${e.end || 'Jan 2026'}`;
              return `
                <div class="exp-item">
                  <div class="exp-header">
                    <div class="exp-role-wrap">
                      <span class="section-bullet-dot"></span>
                      <span class="exp-role">${e.role || 'Graphic Designer'}</span>
                    </div>
                    <span class="exp-date">${date}</span>
                  </div>
                  <div class="exp-company">${e.company || 'Aldenaire & Partners'}</div>
                  <p class="exp-desc">${desc}</p>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Language -->
        <div>
          <div class="section-title">Language</div>
          <div class="lang-row">
            ${languageList.map(l => `
              <div class="lang-col">
                <span class="lang-name">${l.name}</span>
                <div class="lang-progress-track">
                  <div class="lang-progress-fill" style="width: ${l.percent}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Reference -->
        <div>
          <div class="section-title">Reference</div>
          <div class="ref-row">
            <div class="ref-col">
              <div class="ref-name">Alfredo Torres</div>
              <div class="ref-sub">Director</div>
            </div>
            <div class="ref-col">
              <div class="ref-name">Aldenaire &amp; Partners</div>
              <div class="ref-sub">+123-456-7890</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

</body>
</html>`;
}
