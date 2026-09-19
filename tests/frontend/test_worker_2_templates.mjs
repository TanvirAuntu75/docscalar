import fs from 'fs';
import path from 'path';
import assert from 'assert';

import { pathToFileURL } from 'url';

// Import all templates in our scope
const templateFiles = [
  'isabel_schumacher.js',
  'jonathan.js',
  'jonathan_patterson.js',
  'kathleen.js',
  'kelly_mint.js',
  'korina_villanueva.js',
  'kyiv_golden.js',
  'kyoto_coral.js',
  'lilac_sidebar.js',
  'lorna_alvarado.js',
  'lyon_lavender.js',
  'madrid_sun.js',
  'manhattan_noir.js',
  'marcus_vance.js',
  'mariana.js',
  'milan_blush.js',
  'montreal_frost.js',
  'ocean_block.js',
  'olivia.js',
  'ong_burgundy.js',
  'osaka_minimal.js',
  'oslo_taupe.js',
  'overlapping_badge.js',
  'oxford_burgundy.js',
  'prague_brass.js',
  'reykjavik_slate.js',
  'richard.js',
  'richard_sanchez.js',
  'sage_pastel.js',
  'san_francisco_skyline.js',
  'sanchez_dark.js',
  'sanchez_mono.js',
  'sanchez_wave.js',
  'schumacher_charcoal.js',
  'howard_ong.js',
  'isabel_mercado.js'
];

const mockCandidateNames = [
  'Candidate Name',
  'Howard Ong',
  'Isabel Mercado',
  'Isabel Schumacher',
  'Jonathan Patterson',
  'Kelly Blackwell',
  'Korina Villanueva',
  'Lorna Alvarado',
  'Marcus Vance',
  'Richard Sanchez',
  'Jonathan Doe',
  'John Doe',
  'Jane Doe'
];

const unicodeBannedGlyphs = ['✦', '❖', '☀', '❄', '☼', '❧', '🌲', '♦'];

const fullPayload = {
  name: 'Alex Mercer',
  title: 'Principal Software Architect',
  summary: 'Seasoned architect with 12+ years designing distributed high-concurrency systems.',
  phone: '+1 (555) 234-5678',
  email: 'alex.mercer@example.com',
  location: 'San Francisco, CA',
  website: 'alexmercer.dev',
  linkedin: 'linkedin.com/in/alexmercer',
  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
  experience: [
    {
      role: 'Staff Systems Engineer',
      company: 'Acme Cloud Corp',
      start: '2021',
      end: 'Present',
      dates: '2021 – Present',
      highlights: [
        'Architected real-time streaming engine serving 50M ops/sec.',
        'Reduced p99 database query latency by 45% via cache partitioning.'
      ],
      description: 'Led core cloud infrastructure team.'
    },
    {
      role: 'Senior Backend Engineer',
      company: 'Nexus Data Inc',
      start: '2017',
      end: '2021',
      dates: '2017 – 2021',
      highlights: [
        'Built multi-region failover pipeline with 99.999% uptime.'
      ]
    }
  ],
  education: [
    {
      degree: 'M.S. in Computer Science',
      school: 'Stanford University',
      start: '2015',
      end: '2017',
      date: '2015 – 2017',
      note: 'GPA 3.92'
    },
    {
      degree: 'B.S. in Software Engineering',
      school: 'UC Berkeley',
      start: '2011',
      end: '2015',
      date: '2011 – 2015'
    }
  ],
  skills: [
    'Distributed Systems - Expert',
    'Rust / C++ - Advanced',
    'Kubernetes & Docker',
    'PostgreSQL / Redis'
  ],
  projects: [
    {
      name: 'HyperScale Queue',
      url: 'github.com/alex/hyperscale',
      description: 'Ultra-low latency message broker handling millions of messages per second.'
    }
  ],
  certifications: [
    'AWS Certified Solutions Architect - Professional',
    'Certified Kubernetes Administrator (CKA)'
  ],
  references: [
    {
      name: 'Dr. Sarah Connor',
      relation: 'VP of Engineering, Acme Cloud Corp',
      contact: 'sconnor@acme.example.com · +1 (555) 987-6543'
    }
  ],
  customSections: [
    {
      id: 'custom_languages',
      title: 'Languages',
      items: [
        { title: 'English', value: 'Native' },
        { title: 'German', value: 'Fluent' }
      ]
    }
  ]
};

const emptyPayload = {
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

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('DOCFORGE BATCH 3 & 4 TEMPLATE AUDIT & VERIFICATION SUITE');
  console.log('Testing 34 Templates for R1 (Zero-Pollution), R2 (A4 Geometry), R3 (WYSIWYG), R4 (Avatar Masking)');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failureDetails = [];

  for (const filename of templateFiles) {
    const fullPath = path.resolve(process.cwd(), 'src/engines/utility/templates', filename);
    if (!fs.existsSync(fullPath)) {
      console.error(`[ERROR] File not found: ${filename}`);
      failedTests++;
      continue;
    }

    let mod;
    try {
      mod = await import(pathToFileURL(fullPath).href);
    } catch (err) {
      console.error(`[FATAL] Failed to import ${filename}:`, err);
      failedTests++;
      continue;
    }

    const generatorFn = Object.values(mod).find(v => typeof v === 'function');
    if (!generatorFn) {
      console.error(`[FATAL] No exported generator function found in ${filename}`);
      failedTests++;
      continue;
    }

    console.log(`Auditing: ${filename} [${generatorFn.name}]...`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST AREA 1: Empty Payload Render & Zero-Mock Pollution (R1)
    // ─────────────────────────────────────────────────────────────────────────────
    let emptyHtml = '';
    try {
      emptyHtml = generatorFn(emptyPayload);
      assert(typeof emptyHtml === 'string' && emptyHtml.length > 50, 'Empty render returned invalid HTML string');
      totalTests++; passedTests++;
    } catch (err) {
      totalTests++; failedTests++;
      failureDetails.push(`${filename}: Area 1 (Empty Render Exception) - ${err.message}`);
    }

    // Check for fake names in empty output
    for (const fakeName of mockCandidateNames) {
      totalTests++;
      if (emptyHtml.includes(fakeName)) {
        failedTests++;
        failureDetails.push(`${filename}: Area 1 (Mock Name Leak) - Found "${fakeName}" in empty render`);
      } else {
        passedTests++;
      }
    }

    // Check for unconstrained Contact section in empty payload
    totalTests++;
    if (/<h[23][^>]*>\s*Contact\s*<\/h[23]>/i.test(emptyHtml) || /<h3>Contact<\/h3>/i.test(emptyHtml)) {
      failedTests++;
      failureDetails.push(`${filename}: Area 1 (Ghost Contact Section) - Found Contact header in empty render`);
    } else {
      passedTests++;
    }

    // Check for ghost Experience / Education / Skills / Projects in empty render
    totalTests++;
    const ghostSections = emptyHtml.match(/<h[23][^>]*>(Experience|Work Experience|Education|Skills|Key Projects|Projects|Certifications|References)<\/h[23]>/gi);
    if (ghostSections && ghostSections.length > 0) {
      failedTests++;
      failureDetails.push(`${filename}: Area 1 (Ghost Section Headers) - Found headers in empty render: ${ghostSections.join(', ')}`);
    } else {
      passedTests++;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST AREA 2: Full Payload Render & Content Presence
    // ─────────────────────────────────────────────────────────────────────────────
    let fullHtml = '';
    try {
      fullHtml = generatorFn(fullPayload);
      assert(typeof fullHtml === 'string' && fullHtml.length > 500, 'Full render returned invalid HTML string');
      assert(fullHtml.includes('Alex Mercer'), 'Full render must include candidate name');
      assert(fullHtml.includes('Principal Software Architect'), 'Full render must include candidate title');
      totalTests++; passedTests++;
    } catch (err) {
      totalTests++; failedTests++;
      failureDetails.push(`${filename}: Area 2 (Full Render Exception) - ${err.message}`);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST AREA 3: Duplicate data-df-field Attributes Detection (R3)
    // ─────────────────────────────────────────────────────────────────────────────
    totalTests++;
    const dupAttrMatches = fullHtml.match(/data-df-field="[^"]+"[^>]*data-df-field=/gi);
    if (dupAttrMatches) {
      failedTests++;
      failureDetails.push(`${filename}: Area 3 (Duplicate data-df-field) - Found duplicate attributes on single element (${dupAttrMatches.length})`);
    } else {
      passedTests++;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST AREA 4: Canonical WYSIWYG Stamping Coverage (R3)
    // ─────────────────────────────────────────────────────────────────────────────
    const requiredAttributes = [
      'data-df-field="name"',
      'data-df-field="title"',
      'data-df-field="email"',
      'data-df-field="phone"',
      'data-df-field="location"',
      'data-df-field="exp:0:role"',
      'data-df-field="exp:0:company"',
      'data-df-field="exp:0:date"',
      'data-df-field="edu:0:degree"',
      'data-df-field="edu:0:school"',
      'data-df-field="skill:0"'
    ];

    for (const attr of requiredAttributes) {
      totalTests++;
      if (!fullHtml.includes(attr)) {
        failedTests++;
        failureDetails.push(`${filename}: Area 4 (Missing Canonical Attribute) - Missing ${attr}`);
      } else {
        passedTests++;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST AREA 5: Photo / Avatar Masking & Containment (R4)
    // ─────────────────────────────────────────────────────────────────────────────
    totalTests++;
    const hasPhoto = fullHtml.includes('https://images.unsplash.com');
    if (hasPhoto) {
      const hasAvatarMask = /<div[^>]*class="[^"]*avatar-mask[^"]*"[^>]*>\s*<img[^>]*class="[^"]*avatar/i.test(fullHtml) ||
                            /<div[^>]*class="[^"]*avatar-mask[^"]*"[^>]*>[\s\S]*?<img/i.test(fullHtml);
      const hasMaskCss = /\.avatar-mask\s*\{[^}]*overflow:\s*hidden/i.test(fullHtml);
      if (!hasAvatarMask || !hasMaskCss) {
        failedTests++;
        failureDetails.push(`${filename}: Area 5 (Avatar Masking) - Photo not enclosed in .avatar-mask with overflow: hidden`);
      } else {
        passedTests++;
      }
    } else {
      // If template does not support photo, that's fine
      passedTests++;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST AREA 6: Discrete A4 Dimensions, .cv-page & Page Break Rules (R2)
    // ─────────────────────────────────────────────────────────────────────────────
    totalTests++;
    const hasCvPageClass = /class="[^"]*cv-page[^"]*"/i.test(fullHtml);
    if (!hasCvPageClass) {
      failedTests++;
      failureDetails.push(`${filename}: Area 6 (A4 Container Class) - Missing class="cv-page" container`);
    } else {
      passedTests++;
    }

    totalTests++;
    const hasLastChildBreak = /\.cv-page:last-child\s*\{[^}]*page-break-after:\s*avoid/i.test(fullHtml) ||
                              /cv-page:last-child\s*\{[^}]*break-after:\s*avoid/i.test(fullHtml) ||
                              /page-break-after:\s*avoid/i.test(fullHtml);
    if (!hasLastChildBreak) {
      failedTests++;
      failureDetails.push(`${filename}: Area 6 (Page Break Avoidance) - Missing .cv-page:last-child page-break-after: avoid`);
    } else {
      passedTests++;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST AREA 7: Banned Unicode Glyphs & Emojis (R2)
    // ─────────────────────────────────────────────────────────────────────────────
    for (const glyph of unicodeBannedGlyphs) {
      totalTests++;
      if (fullHtml.includes(glyph)) {
        failedTests++;
        failureDetails.push(`${filename}: Area 7 (Banned Unicode Glyph) - Found decorative glyph "${glyph}" in output`);
      } else {
        passedTests++;
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log(`RESULTS: ${passedTests} / ${totalTests} assertions passed (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`Failed Assertions: ${failedTests}`);
  console.log('═══════════════════════════════════════════════════════════════════════════════');

  if (failureDetails.length > 0) {
    console.log('\nDetailed Failures (first 30):');
    failureDetails.slice(0, 30).forEach(f => console.log('  ❌ ' + f));
    if (failureDetails.length > 30) {
      console.log(`  ... and ${failureDetails.length - 30} more failures.`);
    }
  }

  return { totalTests, passedTests, failedTests, failureDetails };
}

runTests().then(res => {
  if (res.failedTests > 0) {
    console.log('\nAudit test suite executed. Ready for batch remediation.');
  } else {
    console.log('\n🎉 ALL AUDIT ASSERTIONS PASSED WITH 100% COMPLIANCE!');
  }
});
