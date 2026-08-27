// ═══════════════════════════════════════════════════════════════════════════════
// LORNA ALVARADO — Exact 1:1 Pixel-Perfect Replica from User Template
// Precision Fixed A4 Canvas (794px x 1123px) with 3D Folded Ribbon Headers & Right Geometric Edge Tabs
// ═══════════════════════════════════════════════════════════════════════════════

export function generateLornaAlvaradoHtml(
  data,
  themeColor = '#232628',
  themeFont = 'Montserrat',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom_languages'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const charcoalColor = themeColor === 'default' || !themeColor ? '#232628' : themeColor;
  const fontFam = themeFont === 'Playfair Display' ? "'Playfair Display', Georgia, serif" : themeFont === 'Merriweather' ? "'Merriweather', Georgia, serif" : themeFont === 'Roboto' ? "'Roboto', sans-serif" : themeFont === 'Inter' ? "'Inter', sans-serif" : "'Montserrat', sans-serif";

  // Name uppercase two-line header
  const nameParts = (data.name || 'Lorna Alvarado').trim().split(' ');
  const firstName = (nameParts[0] || 'LORNA').toUpperCase();
  const lastName = (nameParts.slice(1).join(' ') || 'ALVARADO').toUpperCase();

  const photoSrc = data.photoUrl || '/images/candidates/lorna.jpg';

  const phoneText = data.phone || '123-456-7890';
  const emailText = data.email || 'hello@reallygreatsite.com';
  const locationText = data.location || '123 Anywhere St., Any City';

  const skillsList = data.skills && data.skills.length ? data.skills : [
    'Sales Strategies', 'Negotiation Skills', 'Problem-Solving',
    'Time Management', 'Presentation Skills', 'Networking', 'Market Research'
  ];

  const languageList = data.custom_languages && data.custom_languages.length ? data.custom_languages : ['English', 'French'];

  const educationList = data.education && data.education.length ? data.education : [
    { degree: 'Bachelor of Marketing', school: 'Wardiere University', start: '2016', end: '2020' },
    { degree: 'BA Sales and Commerce', school: 'Wardiere University', start: '2020', end: '2023' }
  ];

  const experienceList = data.experience && data.experience.length ? data.experience : [
    {
      start: '2020',
      end: '2023',
      role: 'Inside Sales Representative',
      company: 'Arowwai Industries | 123 Anywhere St., Any City',
      highlights: [
        'Developed and executed sales strategies, resulting in a 25% increase in annual revenue. Managed a portfolio of 50+ clients, achieving a 95% customer retention rate.',
        'Conducted market research to identify new business opportunities and target prospects.'
      ]
    },
    {
      start: '2019',
      end: '2021',
      role: 'Inside Sales Representative',
      company: 'Arowwai Industries | 123 Anywhere St., Any City',
      highlights: [
        'Prospected and qualified leads through cold calling, email campaigns, and networking events.',
        'Increased sales by 28% by implementing effective upselling and cross-selling strategies.',
        'Maintained up-to-date knowledge of product features and benefits to provide accurate information to clients.',
        'Collaborated with the marketing team to develop targeted sales materials and promotional offers.',
        'Provided exceptional customer service, addressing inquiries and resolving issues in a timely manner.'
      ]
    },
    {
      start: '2017',
      end: '2019',
      role: 'Sales Associate',
      company: 'Arowwai Industries | 123 Anywhere St., Any City',
      highlights: [
        'Prospected and qualified leads through cold calling, email campaigns, and networking events.',
        'Increased sales by 20% by implementing effective upselling and cross-selling strategies.',
        'Maintained up-to-date knowledge of product features and benefits to provide accurate information to clients.',
        'Collaborated with the marketing team to develop targeted sales materials and promotional offers.',
        'Provided exceptional customer service, addressing inquiries and resolving issues in a timely manner.'
      ]
    }
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lorna Alvarado - Resume</title>
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

    /* Fixed A4 Canvas with Rounded Corners */
    .resume-canvas {
      width: 794px;
      height: 1123px;
      background-color: #ffffff;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      display: flex;
      margin: 0 auto;
    }

    /* Right-Edge Gray Accent Tabs */
    .right-tab-top {
      position: absolute;
      top: 55px;
      right: 0;
      width: 32px;
      height: 65px;
      background-color: #e5e3de;
      z-index: 1;
    }

    .right-tab-mid {
      position: absolute;
      top: 250px;
      right: 0;
      width: 32px;
      height: 48px;
      background-color: #e5e3de;
      z-index: 1;
    }

    .right-tab-bottom {
      position: absolute;
      bottom: 135px;
      right: 0;
      width: 32px;
      height: 48px;
      background-color: #e5e3de;
      z-index: 1;
    }

    /* Left Sidebar */
    .sidebar {
      width: 275px;
      height: 1123px;
      background-color: #e8e6e1;
      padding: 45px 0 35px 0;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 2;
      flex-shrink: 0;
    }

    /* Circular Profile Photo with Ring */
    .photo-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 30px;
      padding: 0 25px;
    }

    .profile-photo-ring {
      width: 145px;
      height: 145px;
      border-radius: 50%;
      background-color: #d1ceca;
      padding: 6px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .profile-photo {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      object-position: center 15%;
      background-color: #ffffff;
    }

    /* 3D Folded Ribbon Header */
    .ribbon-header-wrap {
      position: relative;
      margin-bottom: 14px;
      width: 290px; /* Extends past the 275px sidebar */
    }

    .ribbon-header {
      background-color: ${charcoalColor};
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.8px;
    }

    /* Triangular Ribbon Under-Fold */
    .ribbon-fold {
      position: absolute;
      right: 0;
      bottom: -9px;
      width: 0;
      height: 0;
      border-top: 9px solid #111315;
      border-right: 15px solid transparent;
    }

    .sidebar-section {
      margin-bottom: 22px;
    }

    .sidebar-content {
      padding: 0 26px 0 32px;
    }

    /* Contact Details */
    .contact-item {
      margin-bottom: 10px;
    }

    .contact-label {
      font-size: 11px;
      font-weight: 700;
      color: #232628;
      margin-bottom: 2px;
    }

    .contact-val {
      font-size: 10px;
      color: #55575b;
      line-height: 1.35;
      word-break: break-word;
    }

    /* Education Items */
    .edu-item {
      margin-bottom: 12px;
    }

    .edu-degree {
      font-size: 11px;
      font-weight: 700;
      color: #232628;
      line-height: 1.25;
    }

    .edu-school {
      font-size: 10px;
      color: #55575b;
      margin-top: 2px;
    }

    .edu-years {
      font-size: 9.5px;
      color: #66686c;
      margin-top: 1px;
    }

    /* Bulleted Lists (Skills & Languages) */
    .sidebar-list {
      list-style-type: disc;
      padding-left: 15px;
      display: flex;
      flex-direction: column;
      gap: 5.5px;
    }

    .sidebar-list li {
      font-size: 10.5px;
      font-weight: 500;
      color: #333538;
      line-height: 1.2;
    }

    /* Right Main Content */
    .main-panel {
      flex: 1;
      height: 1123px;
      padding: 60px 42px 35px 44px;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 2;
    }

    /* Candidate Header */
    .candidate-name {
      font-size: 38px;
      font-weight: 800;
      line-height: 1.1;
      color: #232628;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .candidate-title {
      font-size: 16px;
      font-weight: 600;
      color: #4b4e53;
      margin-top: 8px;
      margin-bottom: 34px;
    }

    .main-section-title {
      font-size: 16px;
      font-weight: 800;
      color: #232628;
      margin-bottom: 18px;
      letter-spacing: 0.2px;
    }

    /* Experience Entries */
    .experience-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 32px;
    }

    .exp-item {
      display: flex;
      gap: 18px;
    }

    .exp-date-col {
      width: 46px;
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 700;
      color: #232628;
      text-align: center;
      line-height: 1.35;
      padding-top: 2px;
    }

    .exp-content-col {
      flex: 1;
    }

    .exp-role {
      font-size: 12px;
      font-weight: 700;
      color: #232628;
    }

    .exp-company {
      font-size: 10px;
      color: #55575b;
      margin-top: 2px;
      margin-bottom: 6px;
    }

    .exp-bullets {
      list-style-type: disc;
      padding-left: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .exp-bullets li {
      font-size: 9.5px;
      line-height: ${lineSpacing};
      color: #44464a;
      text-align: justify;
    }

    /* References */
    .references-row {
      display: flex;
      gap: 35px;
      margin-top: 4px;
    }

    .ref-item {
      flex: 1;
    }

    .ref-name {
      font-size: 12px;
      font-weight: 700;
      color: #232628;
    }

    .ref-title {
      font-size: 10px;
      color: #55575b;
      margin-top: 2px;
      margin-bottom: 6px;
    }

    .ref-contact-row {
      font-size: 9.5px;
      color: #55575b;
      line-height: 1.45;
    }

    .ref-contact-row strong {
      color: #232628;
    }
  </style>
</head>
<body>

  <div class="resume-canvas">
    <!-- Right-Edge Geometric Accents -->
    <div class="right-tab-top"></div>
    <div class="right-tab-mid"></div>
    <div class="right-tab-bottom"></div>

    <!-- Left Sidebar -->
    <div class="sidebar">
      <!-- Profile Picture -->
      <div class="photo-wrapper">
        <div class="profile-photo-ring">
          <img class="profile-photo" src="${photoSrc}" alt="${data.name || 'Lorna Alvarado'}">
        </div>
      </div>

      <!-- Contact -->
      <div class="sidebar-section">
        <div class="ribbon-header-wrap">
          <div class="ribbon-header">Contact</div>
          <div class="ribbon-fold"></div>
        </div>
        <div class="sidebar-content">
          <div class="contact-item">
            <div class="contact-label">Phone</div>
            <div class="contact-val">${phoneText}</div>
          </div>
          <div class="contact-item">
            <div class="contact-label">Email</div>
            <div class="contact-val">${emailText}</div>
          </div>
          <div class="contact-item">
            <div class="contact-label">Address</div>
            <div class="contact-val">${locationText}</div>
          </div>
        </div>
      </div>

      <!-- Education -->
      <div class="sidebar-section">
        <div class="ribbon-header-wrap">
          <div class="ribbon-header">Education</div>
          <div class="ribbon-fold"></div>
        </div>
        <div class="sidebar-content">
          ${educationList.map(e => `
            <div class="edu-item">
              <div class="edu-degree">${e.degree || 'Bachelor of Marketing'}</div>
              <div class="edu-school">${e.school || 'Wardiere University'}</div>
              <div class="edu-years">${e.start || '2016'} - ${e.end || '2020'}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Skills -->
      <div class="sidebar-section">
        <div class="ribbon-header-wrap">
          <div class="ribbon-header">Skills</div>
          <div class="ribbon-fold"></div>
        </div>
        <div class="sidebar-content">
          <ul class="sidebar-list">
            ${skillsList.map(s => {
              const name = typeof s === 'string' ? (s.includes(' - ') ? s.split(' - ')[0] : s) : s.name || '';
              return `<li>${name}</li>`;
            }).join('')}
          </ul>
        </div>
      </div>

      <!-- Language -->
      <div class="sidebar-section">
        <div class="ribbon-header-wrap">
          <div class="ribbon-header">Language</div>
          <div class="ribbon-fold"></div>
        </div>
        <div class="sidebar-content">
          <ul class="sidebar-list">
            ${languageList.map(l => `<li>${typeof l === 'string' ? l : l.name || 'Language'}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>

    <!-- Right Main Content Panel -->
    <div class="main-panel">
      <h1 class="candidate-name">${firstName}<br>${lastName}</h1>
      <div class="candidate-title">${data.title || 'Sales Representative'}</div>

      <!-- Professional Experience Section -->
      <div class="main-section-title">Professional Experience</div>
      <div class="experience-list">
        ${experienceList.map(e => {
          const startYr = e.start || '2020';
          const endYr = e.end || '2023';
          const bullets = e.highlights && e.highlights.filter(Boolean).length ? e.highlights.filter(Boolean) : [e.description || 'Developed and executed sales strategies, resulting in a 25% increase in annual revenue.'];
          return `
            <div class="exp-item">
              <div class="exp-date-col">
                ${startYr}<br>–<br>${endYr}
              </div>
              <div class="exp-content-col">
                <div class="exp-role">${e.role || 'Inside Sales Representative'}</div>
                <div class="exp-company">${e.company || 'Arowwai Industries'}</div>
                <ul class="exp-bullets">
                  ${bullets.map(b => `<li>${b.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
                </ul>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- References Section -->
      <div class="main-section-title">References</div>
      <div class="references-row">
        <!-- Reference 1 -->
        <div class="ref-item">
          <div class="ref-name">Bailey Dupont</div>
          <div class="ref-title">Wardiere Inc. / CEO</div>
          <div class="ref-contact-row"><strong>Phone:</strong> 123-456-7890</div>
          <div class="ref-contact-row"><strong>Email:</strong> hello@reallygreatsite.com</div>
        </div>

        <!-- Reference 2 -->
        <div class="ref-item">
          <div class="ref-name">Harumi Kobayashi</div>
          <div class="ref-title">Wardiere Inc. / CEO</div>
          <div class="ref-contact-row"><strong>Phone:</strong> 123-456-7890</div>
          <div class="ref-contact-row"><strong>Email:</strong> hello@reallygreatsite.com</div>
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;
}
