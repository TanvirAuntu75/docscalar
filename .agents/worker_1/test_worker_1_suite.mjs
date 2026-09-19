import fs from 'fs';
import path from 'path';

export const batch1_2_files = [
  'adam_fletcher.js', 'adeline_palmerston.js', 'adora_diagonal.js', 'adora_montminy.js',
  'alfredo_torres.js', 'alvarado_slate.js', 'amsterdam_orange.js', 'arthur_pendelton.js',
  'austin_amber.js', 'barcelona_cyan.js', 'berlin_two_tone.js', 'bordeaux_wine.js',
  'boston_crimson.js', 'buenos_aires_tango.js', 'cairo_gold.js', 'cambridge_rose.js',
  'cape_town_sunset.js', 'card_matrix.js', 'charles.js', 'copenhagen_sand.js',
  'date_capsule.js', 'diagonal_wedge.js', 'donna_stroupe.js', 'dublin_forest.js',
  'edinburgh_navy.js', 'emerald_prestige.js', 'emma.js', 'floating_card_matrix.js',
  'florence_terracotta.js', 'geneva_charcoal.js', 'helsinki_frost.js', 'helsinki_navy.js',
  'howard_ong.js', 'isabel_mercado.js'
];

export const mockNames = [
  'Adam Fletcher', 'Adeline Palmerston', 'Alfredo Torres', 'Arthur Pendelton', 
  'Donna Stroupe', 'Candidate Name', 'Howard Ong', 'Isabel Mercado', 
  'Adora Montminy', 'Adora Diagonal', 'Kelly Blackwell', 'Jonathan Patterson',
  'Richard Sanchez', 'Sebastian Bennett', 'Marcus Vance', 'Lorna Alvarado',
  'ISABEL MERCADO', 'ADAM FLETCHER', 'ADELINE PALMERSTON', 'ALFREDO TORRES',
  'ARTHUR PENDELTON', 'DONNA STROUPE', 'HOWARD ONG'
];

export const fullPayload = {
  name: 'Alexander Hamilton',
  title: 'Chief Financial Officer',
  summary: 'Seasoned executive with 15+ years of leadership experience.',
  phone: '+1 (555) 019-2834',
  email: 'alexander.hamilton@treasury.gov',
  location: 'New York, NY',
  website: 'hamilton.org',
  linkedin: 'linkedin.com/in/alexhamilton',
  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  experience: [
    {
      role: 'Senior Director',
      company: 'Federal Treasury Corp',
      start: '2018',
      end: 'Present',
      highlights: ['Managed $4B national reserve liquidity', 'Orchestrated multi-state fiscal reforms']
    },
    {
      role: 'Finance Manager',
      company: 'Bank of New York',
      start: '2012',
      end: '2018',
      highlights: ['Spearheaded commercial portfolio expansion']
    }
  ],
  education: [
    {
      degree: 'Master of Public Administration',
      school: 'Columbia University',
      start: '2008',
      end: '2010',
      note: 'Summa Cum Laude'
    }
  ],
  skills: ['Fiscal Policy', 'Strategic Planning', 'Risk Mitigation', 'Treasury Management'],
  projects: [
    {
      name: 'National Bank Charter System',
      url: 'treasury.gov/charter',
      description: 'Architected the unified commercial banking protocol across 13 member states.'
    }
  ],
  certifications: ['Chartered Financial Analyst (CFA)', 'Certified Public Accountant (CPA)'],
  references: [
    {
      name: 'George Washington',
      relation: 'Commander in Chief & Former President',
      phone: '+1 (555) 178-9000',
      email: 'george@mountvernon.org'
    }
  ],
  customSections: [
    {
      id: 'custom_languages',
      title: 'Languages',
      items: [
        { title: 'English', value: 'Native' },
        { title: 'French', value: 'Fluent' }
      ]
    }
  ]
};

export const emptyPayload = {};

export const clearedPayload = {
  name: '',
  title: '',
  summary: '',
  phone: '',
  email: '',
  location: '',
  website: '',
  linkedin: '',
  photoUrl: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  references: [],
  customSections: []
};

export async function runTests() {
  console.log(`\n======================================================`);
  console.log(`RUNNING STRICT MOLECULAR TEST SUITE FOR BATCH 1 & 2 (${batch1_2_files.length} TEMPLATES)`);
  console.log(`======================================================\n`);

  let totalTests = 0;
  let passedTests = 0;
  let failures = [];

  for (let i = 0; i < batch1_2_files.length; i++) {
    const f = batch1_2_files[i];
    const modulePath = `../../src/engines/utility/templates/${f}`;
    let mod;
    try {
      mod = await import(modulePath);
    } catch (e) {
      console.error(`FAILED TO IMPORT ${f}:`, e);
      failures.push({ file: f, area: 'Module Import', error: e.message });
      continue;
    }

    const funcName = Object.keys(mod).find(k => k.startsWith('generate'));
    if (!funcName) {
      failures.push({ file: f, area: 'Export Signature', error: 'No generate function exported' });
      continue;
    }
    const generator = mod[funcName];

    // TEST 1: Empty payload execution
    totalTests++;
    let emptyHtml = '';
    try {
      emptyHtml = generator(emptyPayload);
      if (typeof emptyHtml !== 'string' || emptyHtml.length < 50) {
        throw new Error(`Invalid output length: ${emptyHtml.length}`);
      }
      passedTests++;
    } catch (e) {
      failures.push({ file: f, area: 'Empty Payload Crash', error: e.message });
    }

    // TEST 2: Cleared payload mock check (Zero-Pollution)
    totalTests++;
    let clearedHtml = '';
    try {
      clearedHtml = generator(clearedPayload);
      const foundMocksInCleared = mockNames.filter(m => clearedHtml.includes(m));
      if (foundMocksInCleared.length > 0) {
        throw new Error(`Mock data resurrected in cleared payload: ${foundMocksInCleared.join(', ')}`);
      }
      passedTests++;
    } catch (e) {
      failures.push({ file: f, area: 'Mock Data Resurrection (Cleared Payload)', error: e.message });
    }

    // TEST 3: Cleared payload ghost section headers check
    totalTests++;
    try {
      // Check for ghost Contact header when contact fields are empty
      const contactGhost = /(?:<h3>|<h2>|class="[^"]*title[^"]*">)\s*Contact\s*(?:<\/h3>|<\/h2>|<\/div>)/i.test(clearedHtml);
      if (contactGhost) {
        throw new Error(`Ghost Contact header rendered on cleared payload`);
      }
      passedTests++;
    } catch (e) {
      failures.push({ file: f, area: 'Ghost Contact Header', error: e.message });
    }

    // TEST 4: Full payload execution & Core data-df-field presence
    totalTests++;
    let fullHtml = '';
    try {
      fullHtml = generator(fullPayload);
      
      const requiredCoreFields = [
        'data-df-field="name"',
        'data-df-field="title"',
        'data-df-field="summary"',
        'data-df-field="email"',
        'data-df-field="phone"',
        'data-df-field="location"',
        'data-df-field="exp:0:role"',
        'data-df-field="exp:0:company"',
        'data-df-field="exp:0:date"',
        'data-df-field="edu:0:degree"',
        'data-df-field="edu:0:school"',
        'data-df-field="edu:0:date"',
        'data-df-field="skill:0"'
      ];

      const missingCore = requiredCoreFields.filter(rf => !fullHtml.includes(rf));
      if (missingCore.length > 0) {
        throw new Error(`Missing core fields: ${missingCore.join(', ')}`);
      }
      passedTests++;
    } catch (e) {
      failures.push({ file: f, area: 'Core Attribute Stamping', error: e.message });
    }

    // TEST 5: Extended Section Stamping (Projects, Certs, References, Custom)
    totalTests++;
    try {
      const extendedRequired = [
        'data-df-field="proj:0:name"',
        'data-df-field="cert:0"',
        'data-df-field="ref:0:name"',
        'data-df-field="custom:custom_languages:0:title"'
      ];
      const missingExt = extendedRequired.filter(rf => !fullHtml.includes(rf));
      if (missingExt.length > 0) {
        throw new Error(`Missing extended section fields: ${missingExt.join(', ')}`);
      }
      passedTests++;
    } catch (e) {
      failures.push({ file: f, area: 'Extended Section Stamping', error: e.message });
    }

    // TEST 6: Duplicate data-df-field attribute check
    totalTests++;
    try {
      const dupes = (fullHtml.match(/data-df-field="[^"]+"\s+data-df-field="/g) || []).length;
      if (dupes > 0) {
        throw new Error(`Found ${dupes} duplicate data-df-field attribute instances`);
      }
      passedTests++;
    } catch (e) {
      failures.push({ file: f, area: 'Duplicate Attribute Stamping', error: e.message });
    }

    // TEST 7: Avatar masking container check
    totalTests++;
    try {
      const hasImg = fullHtml.includes('<img');
      if (hasImg) {
        const hasAvatarMask = fullHtml.includes('class="avatar-mask"') || fullHtml.includes('class="profile-photo-mask avatar-mask"') || fullHtml.includes('avatar-mask');
        if (!hasAvatarMask) {
          throw new Error(`Candidate photo <img> is missing .avatar-mask enclosing wrapper`);
        }
      }
      passedTests++;
    } catch (e) {
      failures.push({ file: f, area: 'Avatar Masking Container', error: e.message });
    }

    // TEST 8: Discrete A4 container class (.cv-page) & 794x1123 dimensions
    totalTests++;
    try {
      if (!fullHtml.includes('class="cv-page') && !fullHtml.includes('cv-page')) {
        throw new Error(`Missing .cv-page container class`);
      }
      if (!fullHtml.includes('794px') || !fullHtml.includes('1123px')) {
        throw new Error(`Missing 794px x 1123px A4 dimensions in CSS`);
      }
      passedTests++;
    } catch (e) {
      failures.push({ file: f, area: 'A4 Container & Dimensions', error: e.message });
    }

    // TEST 9: Print CSS & :last-child page break avoid
    totalTests++;
    try {
      const hasLastChild = fullHtml.includes(':last-child') && fullHtml.includes('page-break-after: avoid');
      if (!hasLastChild) {
        throw new Error(`Missing .cv-page:last-child { page-break-after: avoid; } in CSS`);
      }
      const hasPrintColorAdjust = fullHtml.includes('-webkit-print-color-adjust: exact');
      if (!hasPrintColorAdjust) {
        throw new Error(`Missing -webkit-print-color-adjust: exact in @media print`);
      }
      passedTests++;
    } catch (e) {
      failures.push({ file: f, area: 'Print CSS Rules', error: e.message });
    }

    // TEST 10: Raw Emoji glyph check
    totalTests++;
    try {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2728}\u{2744}\u{2600}\u{2726}\u{2756}\u{2666}\u{2767}\u{1F332}]/u;
      if (emojiRegex.test(fullHtml)) {
        throw new Error(`Raw emoji glyph detected in generated HTML`);
      }
      passedTests++;
    } catch (e) {
      failures.push({ file: f, area: 'Raw Emoji Glyphs', error: e.message });
    }
  }

  console.log(`\n======================================================`);
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failures.length}`);
  console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`======================================================\n`);

  if (failures.length > 0) {
    console.log(`FAILURES SUMMARY (${failures.length}):`);
    failures.forEach((f, idx) => {
      console.log(`[${idx+1}] ${f.file.padEnd(25)} | Area: ${f.area.padEnd(35)} | Error: ${f.error}`);
    });
  }

  return { totalTests, passedTests, failures };
}

if (process.argv[1].endsWith('test_worker_1_suite.mjs')) {
  runTests();
}
