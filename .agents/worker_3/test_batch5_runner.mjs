import fs from 'fs';
import path from 'path';

const mockPayload = {
  name: 'Alexander Pierce',
  title: 'Principal Software Architect',
  summary: 'Over 12 years of enterprise engineering leadership and systems architecture.',
  phone: '+1 (555) 234-5678',
  email: 'alex.pierce@enterprise.io',
  location: 'San Francisco, CA',
  website: 'alexpierce.dev',
  linkedin: 'linkedin.com/in/alexpierce',
  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  experience: [
    {
      role: 'Lead Cloud Architect',
      company: 'OmniCorp Technologies',
      start: '2021',
      end: 'Present',
      highlights: [
        'Spearheaded Kubernetes cluster migration saving $1.2M annually.',
        'Designed high-throughput Kafka streaming pipeline processing 10B events/day.'
      ]
    },
    {
      role: 'Senior Systems Engineer',
      company: 'CloudScale Global',
      start: '2017',
      end: '2021',
      highlights: [
        'Built zero-downtime CI/CD deployment automation across 48 global nodes.'
      ]
    }
  ],
  education: [
    {
      degree: 'M.S. Computer Science',
      school: 'Stanford University',
      start: '2015',
      end: '2017',
      note: 'GPA 3.95'
    }
  ],
  skills: ['Distributed Systems', 'Cloud Infrastructure', 'Go - Advanced', 'TypeScript', 'PostgreSQL'],
  projects: [
    {
      name: 'HyperScale DB Engine',
      url: 'github.com/alex/hyperscale',
      description: 'Distributed LSM-tree storage engine with Raft consensus.'
    }
  ],
  certifications: ['AWS Certified Solutions Architect - Professional', 'CKA Kubernetes Administrator'],
  references: [
    {
      name: 'Sarah Jenkins',
      relation: 'VP of Engineering, OmniCorp',
      email: 'sarah.j@omnicorp.io',
      phone: '+1 (555) 987-6543'
    }
  ],
  customSections: [
    {
      id: 'custom_patents',
      title: 'Patents',
      items: [
        { title: 'US 11,234,567', value: 'Decentralized transactional state consensus system' }
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

const targetFiles = [
  'seattle_emerald.js',
  'sebastian_bennett.js',
  'seoul_neon.js',
  'singapore_ruby.js',
  'split_dual_block.js',
  'stockholm_monochrome.js',
  'stockholm_yellow.js',
  'terracotta_arch.js',
  'tokyo_ice_blue.js',
  'vancouver_pine.js',
  'venice_sand_split.js',
  'vienna_crest.js',
  'violet_modern.js',
  'wilson_light.js',
  'wilson_minimal.js',
  'ziv_olive.js',
  'zurich_slate_block.js',
  'olivia.js',
  'richard_sanchez.js'
];

async function runTests() {
  console.log(`\n===============================================================`);
  console.log(`RUNNING ATOMIC VERIFICATION FOR BATCH 5 & TARGET TEMPLATES (${targetFiles.length})`);
  console.log(`===============================================================\n`);

  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;
  const failureReports = [];

  const forbiddenMockStrings = [
    'Candidate Name', 'Sebastian Bennett', 'Adeline Palmerston', 'Richard Sanchez',
    'Adam Fletcher', 'Donna Stroupe', 'Howard Ong', 'Isabel Mercado', 'John Doe'
  ];

  const forbiddenEmojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2728}\u{2744}\u{2600}\u{2726}\u{2756}\u{2666}\u{2767}\u{1F332}]/u;

  for (const filename of targetFiles) {
    const modPath = path.resolve('./src/engines/utility/templates', filename);
    if (!fs.existsSync(modPath)) {
      console.error(`Missing file: ${filename}`);
      continue;
    }

    const mod = await import(`file://${modPath}?t=${Date.now()}`);
    const exportName = Object.keys(mod).find(k => k.startsWith('generate'));
    if (!exportName || typeof mod[exportName] !== 'function') {
      console.error(`File ${filename} has no valid generator export!`);
      continue;
    }
    const generator = mod[exportName];

    console.log(`Testing: ${filename} [${exportName}]`);

    // --- TEST 1: Empty Payload Render ---
    const emptyHtml = generator(emptyPayload);

    // 1.1 No Mock Name
    for (const mock of forbiddenMockStrings) {
      totalAssertions++;
      if (emptyHtml.includes(mock)) {
        failedAssertions++;
        failureReports.push(`[${filename}] (Empty Payload) Resurrected mock string: "${mock}"`);
      } else {
        passedAssertions++;
      }
    }

    // 1.2 No Ghost Contact Header
    totalAssertions++;
    const hasGhostContact = /<(h[1-6]|div|span)[^>]*>\s*Contact\s*<\/(h[1-6]|div|span)>/i.test(emptyHtml) &&
      !emptyHtml.includes('+1') && !emptyHtml.includes('@');
    if (hasGhostContact) {
      failedAssertions++;
      failureReports.push(`[${filename}] (Empty Payload) Rendered ghost Contact header!`);
    } else {
      passedAssertions++;
    }

    // --- TEST 2: Full Payload Render ---
    const fullHtml = generator(mockPayload);

    // 2.1 Canonical df tags presence
    const requiredTags = [
      'name', 'title', 'summary', 'phone', 'email', 'location',
      'exp:0:role', 'exp:0:company', 'exp:0:date',
      'edu:0:degree', 'edu:0:school',
      'skill:0', 'proj:0:name'
    ];

    for (const tag of requiredTags) {
      totalAssertions++;
      if (!fullHtml.includes(`data-df-field="${tag}"`)) {
        failedAssertions++;
        failureReports.push(`[${filename}] (Full Payload) Missing canonical tag: data-df-field="${tag}"`);
      } else {
        passedAssertions++;
      }
    }

    // 2.2 Duplicate tag check
    totalAssertions++;
    const dupMatch = fullHtml.match(/data-df-field="[^"]+"\s+data-df-field="/g);
    if (dupMatch) {
      failedAssertions++;
      failureReports.push(`[${filename}] (Full Payload) Contains duplicate data-df-field attributes on single element!`);
    } else {
      passedAssertions++;
    }

    // 2.3 Avatar Mask check
    totalAssertions++;
    if (!fullHtml.includes('avatar-mask')) {
      failedAssertions++;
      failureReports.push(`[${filename}] (Full Payload) Missing .avatar-mask wrapping photo!`);
    } else {
      passedAssertions++;
    }

    // 2.4 .cv-page container check
    totalAssertions++;
    if (!fullHtml.includes('class="cv-page') && !fullHtml.includes("class='cv-page") && !fullHtml.includes('cv-page')) {
      failedAssertions++;
      failureReports.push(`[${filename}] (Full Payload) Missing .cv-page container class!`);
    } else {
      passedAssertions++;
    }

    // 2.5 :last-child page break check
    totalAssertions++;
    if (!fullHtml.includes(':last-child')) {
      failedAssertions++;
      failureReports.push(`[${filename}] (Full Payload) Missing .cv-page:last-child page-break-after: avoid rule!`);
    } else {
      passedAssertions++;
    }

    // 2.6 Emoji check
    totalAssertions++;
    if (forbiddenEmojiRegex.test(fullHtml)) {
      failedAssertions++;
      failureReports.push(`[${filename}] (Full Payload) Contains unapproved emoji/Unicode glyph!`);
    } else {
      passedAssertions++;
    }
  }

  console.log(`\n===============================================================`);
  console.log(`VERIFICATION SUMMARY: ${passedAssertions} PASSED, ${failedAssertions} FAILED (TOTAL ASSERTIONS: ${totalAssertions})`);
  console.log(`===============================================================\n`);

  if (failureReports.length > 0) {
    console.log(`FAILURES (${failureReports.length}):`);
    failureReports.forEach((r, i) => console.log(`${i + 1}. ${r}`));
  }
}

runTests();
