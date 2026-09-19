const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const rootDir = path.resolve('.');
const templatesDir = path.join(rootDir, 'src', 'engines', 'utility', 'templates');

const fullPayload = {
  name: 'Eleanor Vance',
  title: 'Principal Software Architect',
  photoUrl: '/images/candidates/mariana.jpg',
  photoCrop: { scale: 1.1, x: 5, y: -5 },
  email: 'eleanor.vance@docforge.io',
  phone: '+1 (555) 019-2834',
  location: 'San Francisco, CA',
  website: 'eleanorvance.dev',
  linkedin: 'linkedin.com/in/eleanor-vance',
  summary: 'Distinguished Systems Architect with 12+ years designing mission-critical distributed infrastructures, high-throughput microservices, and subpixel-perfect visual document rendering pipelines. Proven track record leading elite engineering teams.',
  experience: [
    {
      id: 'exp-1',
      role: 'Chief Architect & VP of Engineering',
      company: 'OmniCloud Systems Inc.',
      start: '2021',
      end: 'Present',
      highlights: [
        'Architected real-time distributed document pipeline processing 45M daily conversions with 99.999% uptime SLA.',
        'Spearheaded zero-trust identity layer and automated edge isolation across 18 global Kubernetes clusters.',
        'Mentored and grew cross-functional engineering organization from 14 to 85 engineers across 4 time zones.'
      ]
    },
    {
      id: 'exp-2',
      role: 'Staff Infrastructure Engineer',
      company: 'Vanguard Data Technologies',
      start: '2017',
      end: '2021',
      highlights: [
        'Designed high-performance SIMD-accelerated rasterization worker reducing PDF export latency by 64%.',
        'Implemented distributed transactional cache layer eliminating database write-lock contention under 50k QPS load.'
      ]
    },
    {
      id: 'exp-3',
      role: 'Senior Full Stack Developer',
      company: 'Apex Digital Labs',
      start: '2014',
      end: '2017',
      highlights: [
        'Built full-stack collaborative canvas workspace featuring real-time CRDT synchronization.',
        'Standardized component token library across web, desktop, and mobile targets.'
      ]
    }
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'M.S. in Computer Science & Distributed Systems',
      school: 'Stanford University',
      start: '2012',
      end: '2014',
      note: 'Summa Cum Laude · Graduate Fellowship Award'
    },
    {
      id: 'edu-2',
      degree: 'B.S. in Computer Engineering',
      school: 'University of California, Berkeley',
      start: '2008',
      end: '2012',
      note: 'Dean\'s Honors List · Regents Scholar'
    }
  ],
  skills: [
    'System Architecture', 'Rust / WebAssembly', 'TypeScript / React', 'Distributed Systems',
    'Kubernetes / Docker', 'FastAPI / Python', 'Performance Profiling', 'Database Optimization'
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'DocForge Client Engine',
      url: 'docforge.io',
      description: 'High-precision browser-based PDF compiler and canvas rendering engine executing 100% client-side.'
    },
    {
      id: 'proj-2',
      name: 'Aether Vector Grid',
      url: 'github.com/aether-grid',
      description: 'Open-source subpixel layout bin-packing library with continuous offset and multi-page pagination.'
    }
  ],
  certifications: [
    'AWS Certified Solutions Architect – Professional (SAP-C02)',
    'Certified Kubernetes Administrator (CKA)'
  ],
  references: [
    {
      id: 'ref-1',
      name: 'Dr. Sarah Jenkins',
      relation: 'CTO at OmniCloud Systems',
      email: 's.jenkins@omnicloud.io',
      phone: '+1 (555) 349-8821'
    },
    {
      id: 'ref-2',
      name: 'Prof. Marcus Vance',
      relation: 'Head of CS at Stanford University',
      email: 'm.vance@stanford.edu',
      phone: '+1 (555) 902-1144'
    }
  ],
  customSections: [
    {
      id: 'custom_languages',
      title: 'Languages',
      items: [
        { title: 'English', value: 'Native / Bilingual' },
        { title: 'German', value: 'Professional Working (C1)' },
        { title: 'Japanese', value: 'Conversational (JLPT N3)' }
      ]
    }
  ]
};

async function run() {
  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));
  const matrix = [];

  for (const file of files) {
    const slug = file.replace('.js', '');
    const moduleUrl = pathToFileURL(path.join(templatesDir, file)).href;
    const mod = await import(moduleUrl);
    const fnKey = Object.keys(mod).find(k => k.startsWith('generate'));
    const fn = mod[fnKey];

    // Test 1: Empty object {}
    let emptyObjOk = false;
    let emptyObjHtml = '';
    try {
      emptyObjHtml = fn({});
      emptyObjOk = true;
    } catch (e) {
      emptyObjOk = false;
    }

    // Test 2: Full payload
    let fullPayloadOk = false;
    let fullPayloadHtml = '';
    try {
      fullPayloadHtml = fn(fullPayload);
      fullPayloadOk = true;
    } catch (e) {
      fullPayloadOk = false;
    }

    // Test 3: Check data-df-field completeness on full payload
    const dfFieldMatches = fullPayloadHtml.match(/data-df-field="([^"]+)"/g) || [];
    const fieldsExtracted = dfFieldMatches.map(m => m.replace('data-df-field="', '').replace('"', ''));

    // Check essential fields stamped
    const hasNameField = fieldsExtracted.includes('name');
    const hasTitleField = fieldsExtracted.includes('title');
    const hasSummaryField = fieldsExtracted.includes('summary');
    const hasEmailField = fieldsExtracted.includes('email');
    const hasPhoneField = fieldsExtracted.includes('phone');
    const hasExpField = fieldsExtracted.some(f => f.startsWith('exp:'));
    const hasEduField = fieldsExtracted.some(f => f.startsWith('edu:'));
    const hasSkillField = fieldsExtracted.some(f => f.startsWith('skill:'));
    const hasProjField = fieldsExtracted.some(f => f.startsWith('proj:'));
    const hasCertField = fieldsExtracted.some(f => f.startsWith('cert:'));
    const hasRefField = fieldsExtracted.some(f => f.startsWith('ref:'));

    // Test 4: Check discrete A4 page count on full payload
    const fullPageCount = (fullPayloadHtml.match(/class="[^"]*cv-page/g) || []).length;

    // Test 5: Check vector / decorative elements
    const hasSvgVectors = /<svg/i.test(fullPayloadHtml);
    const hasClipPolygon = /clip-path:\s*polygon/i.test(fullPayloadHtml);
    const hasArchFrame = /border-radius:\s*(?:1[0-9]{2}px|9999px|50% 50%)/i.test(fullPayloadHtml) || /arch/i.test(slug);

    matrix.push({
      slug,
      file,
      fnKey,
      emptyObjOk,
      fullPayloadOk,
      fullPageCount,
      dfFieldsCount: fieldsExtracted.length,
      stamping: {
        hasNameField,
        hasTitleField,
        hasSummaryField,
        hasEmailField,
        hasPhoneField,
        hasExpField,
        hasEduField,
        hasSkillField,
        hasProjField,
        hasCertField,
        hasRefField
      },
      geometry: {
        hasSvgVectors,
        hasClipPolygon,
        hasArchFrame
      }
    });
  }

  fs.writeFileSync(path.join(rootDir, '.agents', 'explorer_0_1', 'matrix_audit.json'), JSON.stringify(matrix, null, 2));
  console.log('Matrix audit completed for ' + matrix.length + ' templates.');

  const missingNameField = matrix.filter(m => !m.stamping.hasNameField).map(m => m.slug);
  console.log('Templates missing name data-df-field:', missingNameField);

  const missingExpField = matrix.filter(m => !m.stamping.hasExpField).map(m => m.slug);
  console.log('Templates missing exp data-df-field:', missingExpField);

  const multiPageFullPayload = matrix.filter(m => m.fullPageCount > 1).map(m => m.slug);
  console.log('Templates generating multiple pages on full payload:', multiPageFullPayload);
}

run();
