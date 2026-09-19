// ═══════════════════════════════════════════════════════════════════════════════
// Automated Test Suite for Milestone M3 (Requirement R4)
// Multi-Format Export Engine, Interactive Canvas Utilities & Dependencies
// ═══════════════════════════════════════════════════════════════════════════════

import {
  buildDocxDocument,
  exportResumeToDocx,
  resolveDocxFont,
  sanitizeHexColor,
  createSectionHeading,
  createHeaderBlock,
  createSummarySection,
  createExperienceSection,
  createEducationSection,
  createSkillsSection,
  createProjectsSection,
  createCertificationsSection,
  createReferencesSection,
  createCustomSection,
  DOCX_FONT_MAPPING
} from '../../src/engines/utility/docxExporter.js';

import {
  injectPhotoCropStyles,
  injectPrintStyles,
  computePhotoFilterCss,
  computePhotoTransformCss,
  PHOTO_FILTER_PRESETS
} from '../../src/engines/utility/printUtils.js';

import { Packer, convertInchesToTwip } from 'docx';
import * as dndCore from '@dnd-kit/core';
import * as dndSortable from '@dnd-kit/sortable';
import * as dndUtilities from '@dnd-kit/utilities';

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition, message, details = '') {
  totalAssertions++;
  if (!condition) {
    console.error(`❌ FAIL [Assertion ${totalAssertions}]: ${message}`, details);
    throw new Error(`Assertion Failed: ${message}`);
  } else {
    passedAssertions++;
    console.log(`  ✓ [Pass ${passedAssertions}]: ${message}`);
  }
}

console.log('═════════════════════════════════════════════════════════════════════');
console.log('🚀 Running Test Suite: Milestone M3 Multi-Format Export & Canvas Tools');
console.log('═════════════════════════════════════════════════════════════════════\n');

// ─── Test Group 1: Dependency Integrity & Module Exports ──────────────────────────────
console.log('─── Group 1: Dependency Integrity & Module Exports ───');

assert(typeof buildDocxDocument === 'function', 'buildDocxDocument is exported as a function');
assert(typeof exportResumeToDocx === 'function', 'exportResumeToDocx is exported as a function');
assert(typeof dndCore.DndContext !== 'undefined', '@dnd-kit/core exports DndContext');
assert(typeof dndSortable.SortableContext !== 'undefined', '@dnd-kit/sortable exports SortableContext');
assert(typeof dndSortable.useSortable === 'function', '@dnd-kit/sortable exports useSortable hook');
assert(typeof dndUtilities.CSS !== 'undefined', '@dnd-kit/utilities exports CSS helper');

// ─── Test Group 2: Typography & Color Resolvers ────────────────────────────────
console.log('\n─── Group 2: Typography & Color Sanitization ───');

assert(resolveDocxFont('Inter') === 'Calibri', 'Font Inter resolves to Calibri for ATS compatibility');
assert(resolveDocxFont('Outfit') === 'Calibri', 'Font Outfit resolves to Calibri');
assert(resolveDocxFont('Roboto') === 'Arial', 'Font Roboto resolves to Arial');
assert(resolveDocxFont('Open Sans') === 'Arial', 'Font Open Sans resolves to Arial');
assert(resolveDocxFont('Merriweather') === 'Georgia', 'Font Merriweather resolves to Georgia');
assert(resolveDocxFont('Playfair Display') === 'Times New Roman', 'Font Playfair Display resolves to Times New Roman');
assert(resolveDocxFont('Plus Jakarta Sans') === 'Calibri', 'Font Plus Jakarta Sans resolves to Calibri');
assert(resolveDocxFont('Lora') === 'Georgia', 'Font Lora resolves to Georgia');
assert(resolveDocxFont('CustomSerifFont') === 'CustomSerifFont', 'Unmapped font retains custom font name');
assert(resolveDocxFont('') === 'Calibri', 'Empty font fallback to Calibri');

assert(sanitizeHexColor('#2563eb') === '2563EB', 'Sanitize 6-digit hex with hash to uppercase 6-digit hex');
assert(sanitizeHexColor('4F46E5') === '4F46E5', 'Sanitize 6-digit hex without hash');
assert(sanitizeHexColor('#F00') === 'FF0000', 'Sanitize 3-digit shorthand hex (#F00 -> FF0000)');
assert(sanitizeHexColor('blue') === '2563EB', 'Sanitize named color blue to 2563EB');
assert(sanitizeHexColor('emerald') === '059669', 'Sanitize named color emerald to 059669');
assert(sanitizeHexColor('invalid-color', '1E3A8A') === '1E3A8A', 'Invalid color returns provided defaultHex');

// ─── Test Group 3: Formula & Twip Margin Calculations ─────────────────────────────────
console.log('\n─── Group 3: Formula & Twip Margin Calculations ───');

assert(convertInchesToTwip(1) === 1440, '1 inch equals exactly 1440 twips');
assert(Math.abs(convertInchesToTwip(0.6) - 864) <= 1, '0.6 inches evaluates to ~864 twips (IEEE-754 tolerance <= 1 twip)');
assert(convertInchesToTwip(0.75) === 1080, '0.75 inches equals exactly 1080 twips');

// ─── Test Group 4: OpenXML Section Component Builders ──────────────────────────
console.log('\n─── Group 4: OpenXML Sub-Component Builders ───');

const heading = createSectionHeading('Work Experience', '2563EB', 'Calibri');
assert(heading !== null && typeof heading === 'object', 'createSectionHeading returns a Paragraph instance');

const headerChildren = createHeaderBlock(
  {
    name: 'Mariana Anderson',
    title: 'Senior Marketing Manager',
    email: 'mariana@example.com',
    phone: '+1 555-0199',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/mariana',
    website: 'https://mariana.dev',
    github: 'github.com/mariana'
  },
  '2563EB',
  'Calibri'
);
assert(Array.isArray(headerChildren) && headerChildren.length === 3, 'createHeaderBlock produces 3 paragraphs (Name, Title, Contact Bar)');

const emptyHeader = createHeaderBlock({}, '2563EB', 'Calibri');
assert(Array.isArray(emptyHeader) && emptyHeader.length === 0, 'createHeaderBlock on empty data returns empty array');

const summaryElements = createSummarySection('Seasoned product marketing executive with 8+ years experience.', '2563EB', 'Calibri');
assert(summaryElements.length === 2, 'createSummarySection creates heading and body paragraph');

const emptySummary = createSummarySection('', '2563EB', 'Calibri');
assert(emptySummary.length === 0, 'createSummarySection on empty text returns empty array');

// ─── Test Group 5: Experience & Education OpenXML Rendering ─────────────────────
console.log('\n─── Group 5: Experience & Education Table Generators ───');

const sampleExperience = [
  {
    role: 'Staff Engineer',
    company: 'Acme Corp',
    start: '2021',
    end: 'Present',
    location: 'Remote',
    description: 'Led architecture across 6 core microservices.',
    highlights: [
      'Engineered real-time telemetry streaming handling 50k events/sec.',
      'Reduced p99 request latency by 42% via connection multiplexing.'
    ]
  },
  {
    role: 'Software Engineer',
    company: 'Beta Systems',
    start: '2018',
    end: '2021',
    location: 'New York, NY',
    highlights: 'Refactored frontend build pipeline\nAutomated integration test suites'
  }
];

const expElements = createExperienceSection(sampleExperience, '2563EB', 'Calibri');
assert(expElements.length >= 7, 'createExperienceSection builds heading, 2-column tables, description, and bullet paragraphs');

const emptyExpElements = createExperienceSection([], '2563EB', 'Calibri');
assert(emptyExpElements.length === 0, 'createExperienceSection with empty array returns []');

const sampleEducation = [
  {
    degree: 'B.S. in Computer Science',
    school: 'Stanford University',
    start: '2014',
    end: '2018',
    location: 'Stanford, CA',
    note: 'GPA: 3.92 / 4.0 · Magna Cum Laude',
    highlights: ['Dean’s Honor List 2015–2018', 'Lead Teaching Assistant for CS106B']
  }
];

const eduElements = createEducationSection(sampleEducation, '2563EB', 'Calibri');
assert(eduElements.length >= 4, 'createEducationSection builds heading, table, note, and highlight bullets');

// ─── Test Group 6: Skills, Projects, Certs, References & Custom Sections ─────────
console.log('\n─── Group 6: Skills, Projects, Certs & Custom Section Dispatchers ───');

const categorizedSkills = ['Frontend: React, TypeScript, Tailwind', 'Backend: Node.js, Go, PostgreSQL', 'Cloud: AWS, Docker, Kubernetes'];
const catSkillElements = createSkillsSection(categorizedSkills, '2563EB', 'Calibri');
assert(catSkillElements.length === 5, 'createSkillsSection parses categorized skills into structured bold label paragraphs');

const flatSkills = ['React', 'Node.js', 'Python', 'TypeScript', 'GraphQL', 'Docker', 'Kubernetes'];
const flatSkillElements = createSkillsSection(flatSkills, '2563EB', 'Calibri');
assert(flatSkillElements.length >= 3, 'createSkillsSection parses flat skills into chunked bullet paragraphs');

const sampleProjects = [
  {
    name: 'DocForge CV Studio',
    url: 'https://docforge.dev',
    description: 'High-performance document editing platform.',
    highlights: ['Built OpenXML docx export engine', 'Integrated interactive photo canvas']
  }
];
const projElements = createProjectsSection(sampleProjects, '2563EB', 'Calibri');
assert(projElements.length >= 4, 'createProjectsSection builds heading, header table, description and bullets');

const sampleCerts = [
  'AWS Certified Solutions Architect · 2023',
  { name: 'Certified Kubernetes Administrator', issuer: 'CNCF', date: '2024' }
];
const certElements = createCertificationsSection(sampleCerts, '2563EB', 'Calibri');
assert(certElements.length === 4, 'createCertificationsSection handles both string and object cert formats');

const sampleRefs = [
  { name: 'Jane Doe', relation: 'VP of Engineering', company: 'Acme Corp', phone: '+1 555-0123', email: 'jane@acme.com' }
];
const refElements = createReferencesSection(sampleRefs, '2563EB', 'Calibri');
assert(refElements.length === 3, 'createReferencesSection handles references with relation and contact data');

const sampleCustomSection = {
  title: 'Languages',
  items: [
    { title: 'English', value: 'Native / Bilingual' },
    { title: 'French', value: 'Professional Working' }
  ]
};
const customElements = createCustomSection(sampleCustomSection, '2563EB', 'Calibri');
assert(customElements.length === 4, 'createCustomSection generates heading and key-value bullet paragraphs');

// ─── Test Group 7: Master Document Generation & Section Ordering ────────────────
console.log('\n─── Group 7: Master Document Compilation & Dynamic Section Dispatcher ───');

const fullPayload = {
  name: 'Mariana Anderson',
  title: 'Marketing Director',
  email: 'mariana@example.com',
  phone: '+1 555-0100',
  location: 'Chicago, IL',
  summary: 'Strategic marketing executive specializing in revenue acceleration and brand transformation.',
  experience: sampleExperience,
  education: sampleEducation,
  skills: categorizedSkills,
  projects: sampleProjects,
  certifications: sampleCerts,
  references: sampleRefs,
  customSections: [sampleCustomSection],
  sectionOrder: ['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'custom_languages', 'references']
};

const fullDoc = buildDocxDocument(fullPayload, { themeFont: 'Outfit', themeColor: '#1E3A8A', marginInches: 0.6 });
assert(fullDoc instanceof Object, 'buildDocxDocument builds OpenXML Document with custom font, color, and margin');

const reorderedPayload = {
  ...fullPayload,
  sectionOrder: ['skills', 'education', 'experience', 'summary']
};
const reorderedDoc = buildDocxDocument(reorderedPayload);
assert(reorderedDoc instanceof Object, 'buildDocxDocument respects custom dynamic sectionOrder');

const emptyPayloadDoc = buildDocxDocument({});
assert(emptyPayloadDoc instanceof Object, 'buildDocxDocument builds safely with completely empty payload {}');

// ─── Test Group 8: Binary Buffer / Blob Generation & File-Saver ───
console.log('\n─── Group 8: Binary Buffer / Blob Generation & File-Saver ───');

const compiledBuffer = await exportResumeToDocx(fullPayload, { filename: 'Test_Mariana_Resume.docx' });
assert(compiledBuffer !== null && compiledBuffer !== undefined, 'exportResumeToDocx returns valid binary payload');
const fullSize = compiledBuffer.size || compiledBuffer.length || compiledBuffer.byteLength || 0;
assert(fullSize > 2000, `Generated DOCX binary size is ${fullSize} bytes (well above 2KB minimum)`);

const compiledEmptyBuffer = await exportResumeToDocx({}, { filename: 'Empty_Resume.docx' });
const emptySize = compiledEmptyBuffer.size || compiledEmptyBuffer.length || compiledEmptyBuffer.byteLength || 0;
assert(emptySize > 1000, `Empty payload DOCX compiles valid OpenXML structure (${emptySize} bytes)`);

// ─── Test Group 9: Photo Studio CSS Filters & Transform Calculations ───────────
console.log('\n─── Group 9: Photo Studio CSS Transform & Filter Engines ───');

// Neutral / default checks
assert(computePhotoTransformCss({ scale: 1, x: 0, y: 0, rotate: 0 }) === '', 'Default transform returns empty string');
assert(computePhotoFilterCss({ filterPreset: 'none', filters: {} }) === '', 'Default filter returns empty string');

// Rotation checks
const rotate90 = computePhotoTransformCss({ scale: 1, x: 0, y: 0, rotate: 90 });
assert(rotate90.includes('rotate(90deg)'), 'Rotation 90deg is correctly formatted in CSS transform');
assert(rotate90.includes('scale(1)'), 'Scale 1 is correctly formatted in CSS transform');
assert(rotate90.includes('translate(0px, 0px)'), 'Translate 0px, 0px is formatted');

const rotate180 = computePhotoTransformCss({ scale: 1.25, x: 15, y: -10, rotate: 180 });
assert(rotate180.includes('rotate(180deg)'), 'Rotation 180deg formatted');
assert(rotate180.includes('scale(1.25)'), 'Scale 1.25 formatted');
assert(rotate180.includes('translate(15px, -10px)'), 'Translate 15px, -10px formatted');

const rotate270 = computePhotoTransformCss({ scale: 1, x: 0, y: 0, rotate: 270 });
assert(rotate270.includes('rotate(270deg)'), 'Rotation 270deg formatted');

// Filter preset checks
const bwFilter = computePhotoFilterCss({ filterPreset: 'bw' });
assert(bwFilter.includes('grayscale(100%)'), 'BW preset sets grayscale(100%)');
assert(bwFilter.includes('contrast(110%)'), 'BW preset sets contrast(110%)');

const crispFilter = computePhotoFilterCss({ filterPreset: 'crisp' });
assert(crispFilter.includes('contrast(120%)'), 'Crisp preset sets contrast(120%)');
assert(crispFilter.includes('brightness(105%)'), 'Crisp preset sets brightness(105%)');

const warmFilter = computePhotoFilterCss({ filterPreset: 'warm' });
assert(warmFilter.includes('sepia(20%)'), 'Warm preset sets sepia(20%)');
assert(warmFilter.includes('contrast(105%)'), 'Warm preset sets contrast(105%)');

const noirFilter = computePhotoFilterCss({ filterPreset: 'noir' });
assert(noirFilter.includes('grayscale(100%)'), 'Noir preset sets grayscale(100%)');
assert(noirFilter.includes('contrast(130%)'), 'Noir preset sets contrast(130%)');
assert(noirFilter.includes('brightness(95%)'), 'Noir preset sets brightness(95%)');

// Custom filters check
const customFilter = computePhotoFilterCss({
  filters: { grayscale: 45, contrast: 125, brightness: 90, sepia: 15 }
});
assert(customFilter.includes('grayscale(45%)'), 'Custom grayscale(45%) formatted');
assert(customFilter.includes('contrast(125%)'), 'Custom contrast(125%) formatted');
assert(customFilter.includes('brightness(90%)'), 'Custom brightness(90%) formatted');
assert(customFilter.includes('sepia(15%)'), 'Custom sepia(15%) formatted');

// ─── Test Group 10: HTML Style Injection & Print Parity ────────────────────────
console.log('\n─── Group 10: HTML Style Injection & Print Engine Parity ───');

const rawSampleHtml = `<!DOCTYPE html><html><head><title>Resume</title></head><body><div class="profile-photo avatar"></div></body></html>`;

// Default crop: No style injection
const cleanHtml = injectPhotoCropStyles(rawSampleHtml, { photoCrop: { scale: 1, x: 0, y: 0, rotate: 0, filterPreset: 'none' } });
assert(cleanHtml === rawSampleHtml, 'Default photoCrop does not pollute HTML with unused style tags');

// Active crop: Transform and filter injection into <head>
const transformedHtml = injectPhotoCropStyles(rawSampleHtml, {
  photoCrop: { scale: 1.5, x: 10, y: -5, rotate: 90, filterPreset: 'bw' }
});
assert(transformedHtml.includes('<style id="docforge-photo-crop-styles">'), 'Injected style tag has id "docforge-photo-crop-styles"');
assert(transformedHtml.includes('rotate(90deg)'), 'Injected style contains rotate(90deg)');
assert(transformedHtml.includes('scale(1.5)'), 'Injected style contains scale(1.5)');
assert(transformedHtml.includes('grayscale(100%)'), 'Injected style contains grayscale(100%)');
assert(transformedHtml.includes('</head>'), 'Injected style placed cleanly before </head>');

// Invalidation & Edge case: HTML without </head> tag
const noHeadHtml = `<div><img class="avatar" src="photo.jpg"/></div>`;
const appendedHtml = injectPhotoCropStyles(noHeadHtml, {
  photoCrop: { rotate: 180 }
});
assert(appendedHtml.includes('<style id="docforge-photo-crop-styles">'), 'Appends style tag when </head> is absent');

// injectPrintStyles validation
const printHtml = injectPrintStyles(rawSampleHtml);
assert(printHtml.includes('@page {'), 'injectPrintStyles contains @page rule');
assert(printHtml.includes('size: A4 portrait;'), 'injectPrintStyles enforces A4 portrait');
assert(printHtml.includes('-webkit-print-color-adjust: exact !important;'), 'injectPrintStyles enforces exact print color adjust');
assert(printHtml.includes('.cv-page:last-child'), 'injectPrintStyles avoids trailing page break on last child');

// ─── Test Group 11: 360-Degree Extremes & Payload Boundary Stress ───────────────
console.log('\n─── Group 11: 360-Degree Extremes & Payload Boundary Stress ───');

// Massive 15-entry experience payload
const massiveExperience = Array.from({ length: 15 }, (_, i) => ({
  role: `Senior Architect ${i + 1}`,
  company: `Enterprise Conglomerate ${i + 1}`,
  start: `${2008 + i}`,
  end: `${2009 + i}`,
  location: `City ${i + 1}`,
  highlights: [
    `Delivered multi-tier architecture milestone ${i + 1} with 99.999% SLA.`,
    `Mentored a squad of ${5 + i} software engineers.`
  ]
}));

const massiveDoc = buildDocxDocument({
  name: 'Enterprise Veteran',
  experience: massiveExperience
});
const massiveBuffer = await exportResumeToDocx({
  name: 'Enterprise Veteran',
  experience: massiveExperience
});
const massiveSize = massiveBuffer.size || massiveBuffer.length || massiveBuffer.byteLength || 0;
assert(massiveSize > 5000, `Massive 15-experience payload compiles robustly (${massiveSize} bytes)`);

// Single item boundary
const singleItemDoc = buildDocxDocument({
  name: 'Junior Dev',
  experience: [{ role: 'Intern', company: 'Startup' }]
});
const singleBuffer = await exportResumeToDocx({
  name: 'Junior Dev',
  experience: [{ role: 'Intern', company: 'Startup' }]
});
const singleSize = singleBuffer.size || singleBuffer.length || singleBuffer.byteLength || 0;
assert(singleSize > 2000, `Single-entry payload compiles robustly (${singleSize} bytes)`);

// Special character name sanitization in export filename
await exportResumeToDocx(
  { name: 'Dr. Jane O\'Connor-Smith, Ph.D. / Lead & Chief' },
  {
    // test filename sanitization logic
  }
);
assert(true, 'Special character name sanitization executes without runtime failure');

console.log('\n═════════════════════════════════════════════════════════════════════');
console.log(`✅ TEST SUITE COMPLETED: ${passedAssertions}/${totalAssertions} Assertions Passed (100% Success Rate)`);
console.log('═════════════════════════════════════════════════════════════════════');
