// ═══════════════════════════════════════════════════════════════════════════════
// MASTER MOLECULAR TEST SUITE: Diagonal Wedge Template Geometry & Parity
// Verifies in-flow header container, zero overlap, anti-stray line, single-year dates,
// certification auto-linking, two-way sync stamps, and boundary extreme handling.
// ═══════════════════════════════════════════════════════════════════════════════

import { generateDiagonalWedgeHtml } from '../../src/engines/utility/templates/diagonal_wedge.js';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`[PASS] ${testName}`);
  } else {
    failed++;
    console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

console.log('Starting Master Molecular Test Suite: Diagonal Wedge Geometry & Parity\n');

// Standard test fixtures
const baseData = {
  name: 'Tanvir Alam Auntu',
  title: 'Data Science Candidate',
  photoUrl: '',
  email: 'tanvir@example.com',
  phone: '+880 1614-453217',
  location: 'Cumilla, Bangladesh',
  summary: 'Motivated student pursuing Data Science.',
  education: [
    { degree: 'Higher Secondary Certificate', school: 'Govt. Science College', start: '2023', end: '2023' },
    { degree: 'Secondary School Certificate', school: 'Comilla Zilla School', start: '2019', end: '2021' }
  ],
  skills: ['Python', 'HTML', 'CSS'],
  projects: [
    { name: 'Web Portal', url: 'github.com/project', description: 'Collaborative web application.' }
  ],
  certifications: [
    'Responsive Web Design — freeCodeCamp',
    'Certificate: https://www.freecodecamp.org/certification/tanvir/cert'
  ],
  customSections: [
    {
      id: 'custom_languages',
      title: 'Languages',
      items: [
        { id: 'l1', title: 'English', value: 'IELTS 7.5 Overall (L:8.5, R:8.0, W:6.5, S:6.5)' },
        { id: 'l2', title: 'Bengali', value: 'Native' }
      ]
    }
  ]
};

const htmlBase = generateDiagonalWedgeHtml(baseData, '#831843', 'Inter');

// Area 01: Header container presence in document flow
assert(
  htmlBase.includes('<header class="diagonal-header">'),
  'Area 01: Page 1 includes <header class="diagonal-header"> in document flow'
);

// Area 02: diagonal-header-bg inside header
const headerMatch = htmlBase.match(/<header class="diagonal-header">([\s\S]*?)<\/header>/);
assert(
  headerMatch && headerMatch[1].includes('diagonal-header-bg'),
  'Area 02: diagonal-header-bg is encapsulated inside <header class="diagonal-header">'
);

// Area 03: diagonal-header-accent inside header
assert(
  headerMatch && headerMatch[1].includes('diagonal-header-accent'),
  'Area 03: diagonal-header-accent is encapsulated inside <header class="diagonal-header">'
);

// Area 04: header-content inside header
assert(
  headerMatch && headerMatch[1].includes('header-content'),
  'Area 04: header-content is encapsulated inside <header class="diagonal-header">'
);

// Area 05: Document order verification: header precedes content-columns
const headerIdx = htmlBase.indexOf('</header>');
const columnsIdx = htmlBase.indexOf('class="content-columns"');
assert(
  headerIdx > 0 && columnsIdx > headerIdx,
  'Area 05: <header class="diagonal-header"> strictly precedes .content-columns in document flow'
);

// Area 06: CSS min-height for .diagonal-header
assert(
  /\.diagonal-header\s*\{[^}]*min-height:\s*175px/i.test(htmlBase),
  'Area 06: .diagonal-header CSS enforces min-height of 175px'
);

// Area 07: CSS height 100% for .diagonal-header-bg
assert(
  /\.diagonal-header-bg\s*\{[^}]*height:\s*100%/i.test(htmlBase),
  'Area 07: .diagonal-header-bg CSS uses relative height: 100% of header container'
);

// Area 08: CSS height 100% for .diagonal-header-accent
assert(
  /\.diagonal-header-accent\s*\{[^}]*height:\s*100%/i.test(htmlBase),
  'Area 08: .diagonal-header-accent CSS uses relative height: 100% of header container'
);

// Area 09: CSS padding-bottom protection on .header-content
assert(
  /\.header-content\s*\{[^}]*padding:[^;]*38px/i.test(htmlBase),
  'Area 09: .header-content specifies 38px bottom padding to buffer above diagonal polygon cut'
);

// Area 10: Polygon clip-path geometry formula verification
assert(
  htmlBase.includes('clip-path: polygon(0 0, 100% 0, 100% calc(100% - 32px), 0 100%)'),
  'Area 10: Polygon cut-path computes exact calc(100% - 32px) boundary'
);

// Area 11: Empty photoUrl suppresses avatar DOM
assert(
  !htmlBase.includes('<div class="avatar-wrapper avatar-mask">') && !htmlBase.includes('<img class="avatar"'),
  'Area 11: Empty photoUrl completely suppresses avatar-mask and image DOM'
);

// Area 12: Provided photoUrl renders avatar-mask with img
const htmlWithPhoto = generateDiagonalWedgeHtml({ ...baseData, photoUrl: 'https://example.com/avatar.jpg' }, '#831843');
assert(
  htmlWithPhoto.includes('avatar-mask') && htmlWithPhoto.includes('src="https://example.com/avatar.jpg"'),
  'Area 12: Provided photoUrl renders .avatar-mask with <img> source'
);

// Area 13: Avatar dimensions fit within header container
assert(
  /\.avatar-wrapper\.avatar-mask\s*\{[^}]*width:\s*115px/i.test(htmlBase),
  'Area 13: Avatar mask is sized to 115px to fit within the 175px header container'
);

// Area 14: Single-year graduation date duplication elimination (start=2023, end=2023)
assert(
  htmlBase.includes('>2023<') && !htmlBase.includes('2023 – 2023'),
  'Area 14: Identical start and end graduation years render as single year "2023"'
);

// Area 15: Multi-year graduation date range preserved (start=2019, end=2021)
assert(
  htmlBase.includes('2019 – 2021'),
  'Area 15: Distinct start and end graduation years render range with en-dash "2019 – 2021"'
);

// Area 16: End-only graduation date renders correctly
const htmlEndOnly = generateDiagonalWedgeHtml({
  ...baseData,
  education: [{ degree: 'B.Sc', school: 'University', end: '2024' }]
});
assert(
  htmlEndOnly.includes('>2024<'),
  'Area 16: End-only graduation year renders accurately'
);

// Area 17: Start-only graduation date renders correctly
const htmlStartOnly = generateDiagonalWedgeHtml({
  ...baseData,
  education: [{ degree: 'B.Sc', school: 'University', start: '2022' }]
});
assert(
  htmlStartOnly.includes('>2022<'),
  'Area 17: Start-only graduation year renders accurately'
);

// Area 18: Certification URL auto-linking
assert(
  htmlBase.includes('<a href="https://www.freecodecamp.org/certification/tanvir/cert" target="_blank"'),
  'Area 18: Web URLs in certifications are transformed into clickable anchor links'
);

// Area 19: Plain certification without URL renders clean text
assert(
  htmlBase.includes('Responsive Web Design — freeCodeCamp</li>'),
  'Area 19: Plain certification without URL renders clean li element without anchor'
);

// Area 20: Project URL auto-linking
assert(
  htmlBase.includes('data-df-field="proj:0:url"') && htmlBase.includes('href="https://github.com/project"'),
  'Area 20: Project URL is converted into clickable link with proj:0:url stamp'
);

// Area 21: Candidate name stamp
assert(
  htmlBase.includes('data-df-field="name">Tanvir Alam Auntu</h1>'),
  'Area 21: Candidate name contains data-df-field="name"'
);

// Area 22: Candidate title stamp
assert(
  htmlBase.includes('data-df-field="title"'),
  'Area 22: Candidate title contains data-df-field="title"'
);

// Area 23: Section heading stamp
assert(
  htmlBase.includes('data-df-field="heading:summary"'),
  'Area 23: Professional summary section heading contains data-df-field="heading:summary"'
);

// Area 24: Education degree stamp
assert(
  htmlBase.includes('data-df-field="edu:0:degree"'),
  'Area 24: Education degree contains data-df-field="edu:0:degree"'
);

// Area 25: Education school stamp
assert(
  htmlBase.includes('data-df-field="edu:0:school"'),
  'Area 25: Education school contains data-df-field="edu:0:school"'
);

// Area 26: Education date stamp
assert(
  htmlBase.includes('data-df-field="edu:0:date"'),
  'Area 26: Education date contains data-df-field="edu:0:date"'
);

// Area 27: Skills item stamp
assert(
  htmlBase.includes('data-df-field="skill:0">Python</span>'),
  'Area 27: Skill items contain data-df-field="skill:0"'
);

// Area 28: Language section title stamp
assert(
  htmlBase.includes('data-df-field="custom:custom_languages:title"'),
  'Area 28: Custom language section heading contains custom:custom_languages:title stamp'
);

// Area 29: Language item title and value stamps
assert(
  htmlBase.includes('data-df-field="custom:custom_languages:0:title">English</div>') &&
  htmlBase.includes('data-df-field="custom:custom_languages:0:value">IELTS 7.5 Overall (L:8.5, R:8.0, W:6.5, S:6.5)</div>'),
  'Area 29: Language items contain isolated title and value stamps for reliable two-way sync'
);

// Area 30: Language list CSS classes
assert(
  htmlBase.includes('class="lang-list"') && htmlBase.includes('class="lang-item"'),
  'Area 30: Languages rendered with responsive .lang-list and .lang-item classes'
);

// Area 31: Split layout column classes
assert(
  htmlBase.includes('class="main-col "') && htmlBase.includes('class="sidebar-col"'),
  'Area 31: Default split layout renders distinct main and sidebar columns'
);

// Area 32: Full width layout override
const htmlFull = generateDiagonalWedgeHtml(baseData, '#831843', 'Inter', undefined, 'full');
assert(
  htmlFull.includes('main-col-full'),
  'Area 32: themeLayout "full" triggers main-col-full full-width layout'
);

// Area 33: Empty payload resilience
const htmlEmpty = generateDiagonalWedgeHtml({});
assert(
  typeof htmlEmpty === 'string' && htmlEmpty.length > 500 && htmlEmpty.includes('class="cv-page"'),
  'Area 33: Empty payload {} generates valid A4 document without throwing errors'
);

// Area 34: Null fields resilience
const htmlNulls = generateDiagonalWedgeHtml({ name: null, title: null, education: null, skills: null });
assert(
  typeof htmlNulls === 'string' && !htmlNulls.includes('null'),
  'Area 34: Null fields are sanitized and never leak literal "null" into DOM'
);

// Area 35: Massive 10+ experience payload pagination
const massiveExp = Array.from({ length: 10 }, (_, i) => ({
  role: `Senior Engineer ${i + 1}`,
  company: `Enterprise ${i + 1}`,
  start: '2020',
  end: '2024',
  highlights: [`Delivered high performance project ${i + 1}`, `Optimized database latency by ${i * 5}%`]
}));
const htmlMassive = generateDiagonalWedgeHtml({ ...baseData, experience: massiveExp });
assert(
  htmlMassive.includes('id="page-1"') && htmlMassive.includes('id="page-2"'),
  'Area 35: Massive 10+ experience payload partitions across discrete Page 1 and Page 2'
);

// Area 36: @media print isolation
assert(
  htmlBase.includes('@media print') && htmlBase.includes('page-break-after: always !important;'),
  'Area 36: @media print styles ensure deterministic multi-page print and PDF parity'
);

// Area 37: Zero NaN or undefined values anywhere in HTML
assert(
  !htmlBase.includes('NaN') && !htmlBase.includes('undefined'),
  'Area 37: Zero NaN or undefined tokens in rendered HTML output'
);

console.log(`\n======================================================`);
console.log(`Diagonal Wedge Geometry Suite: ${passed}/${passed + failed} (${Math.round((passed / (passed + failed)) * 100)}% SUCCESS)`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
