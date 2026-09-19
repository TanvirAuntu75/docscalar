import fs from 'fs';
import path from 'path';

// Let's import TEMPLATE_MAP
const templatesDir = path.resolve('src/engines/utility/templates');
const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js')).sort();

console.log(`═══════════════════════════════════════════════════════════════════════════════`);
console.log(`🔬 PRE-TEST SIMULATION: 89-TEMPLATE CATALOG MATRIX (20 ASSERTIONS X 89 = 1,780)`);
console.log(`═══════════════════════════════════════════════════════════════════════════════\n`);

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failureReport = {};

function assert(condition, templateKey, checkName, details = '') {
  totalAssertions++;
  if (Boolean(condition)) {
    passedAssertions++;
  } else {
    failedAssertions++;
    if (!failureReport[templateKey]) failureReport[templateKey] = [];
    failureReport[templateKey].push({ checkName, details });
  }
}

const dummyFullData = {
  name: 'Marcus Vance',
  title: 'Chief Information Security Officer',
  photoUrl: '/images/candidates/candidate_2.jpg',
  email: 'marcus.vance@example.com',
  phone: '+1-555-0199',
  location: 'San Francisco, CA',
  website: 'marcusvance.io',
  linkedin: 'linkedin.com/in/marcusvance',
  github: 'github.com/marcusvance',
  summary: 'Proven cybersecurity leader with 15+ years of experience designing zero-trust enterprise architectures.',
  experience: [
    {
      id: 'e1',
      role: 'Principal Security Architect',
      company: 'Apex Cloud Solutions',
      start: '2020',
      end: 'Present',
      highlights: ['Designed zero-trust framework reducing breach surface by 85%.', 'Managed team of 14 SecOps engineers.']
    }
  ],
  education: [
    {
      id: 'ed1',
      degree: 'M.S. Cybersecurity',
      school: 'MIT',
      start: '2016',
      end: '2018',
      note: 'Summa Cum Laude'
    }
  ],
  skills: ['Threat Modeling', 'Cloud Security (AWS/GCP)', 'Zero-Trust Architecture', 'Incident Response'],
  projects: [
    {
      id: 'p1',
      title: 'OpenSec Enterprise Audit Tool',
      description: 'Distributed security compliance auditing engine.'
    }
  ],
  certifications: [
    {
      id: 'c1',
      name: 'CISSP - Certified Information Systems Security Professional',
      issuer: 'ISC2',
      date: '2019'
    }
  ],
  references: [
    {
      id: 'r1',
      name: 'Dr. Evelyn Carter',
      company: 'Apex Cloud Solutions',
      role: 'CTO',
      email: 'carter@apexcloud.com'
    }
  ],
  sectionTitles: {
    experience: 'Work History',
    education: 'Academic Background',
    skills: 'Technical Arsenal',
    summary: 'Executive Profile',
    projects: 'Notable Systems',
    certifications: 'Credentials',
    references: 'Professional Endorsements'
  }
};

const dummyEmptyTitleData = {
  ...dummyFullData,
  title: ''
};

async function runMatrix() {
  for (const file of templateFiles) {
    const templateKey = file.replace('.js', '');
    const modulePath = `../../src/engines/utility/templates/${file}`;
    
    let mod;
    try {
      mod = await import(modulePath);
    } catch (e) {
      assert(false, templateKey, '1_MODULE_LOAD', `Failed to import ${file}: ${e.message}`);
      continue;
    }

    const exportKeys = Object.keys(mod);
    const generatorFnName = exportKeys.find(k => k.startsWith('generate') && k.endsWith('Html'));
    const generatorFn = generatorFnName ? mod[generatorFnName] : null;

    // Check 1: Generator export exists
    assert(typeof generatorFn === 'function', templateKey, '1_GENERATOR_EXPORT', `Missing generate*Html function export in ${file}`);

    if (typeof generatorFn !== 'function') {
      for (let i = 2; i <= 20; i++) {
        assert(false, templateKey, `${i}_SKIPPED`, 'Skipped due to missing generator');
      }
      continue;
    }

    let fullHtml = '';
    let emptyTitleHtml = '';
    let customOrderHtml = '';

    try {
      fullHtml = generatorFn(dummyFullData, { primaryColor: '#0ea5e9', font: 'Inter' });
    } catch (e) {
      assert(false, templateKey, '2_FULL_RENDER', `Error during full render: ${e.message}`);
    }

    try {
      emptyTitleHtml = generatorFn(dummyEmptyTitleData, { primaryColor: '#0ea5e9', font: 'Inter' });
    } catch (e) {
      assert(false, templateKey, '3_EMPTY_TITLE_RENDER', `Error during empty title render: ${e.message}`);
    }

    try {
      customOrderHtml = generatorFn(dummyFullData, {
        primaryColor: '#0ea5e9',
        font: 'Inter',
        sectionOrder: ['education', 'skills', 'experience', 'projects', 'certifications', 'references']
      });
    } catch (e) {
      assert(false, templateKey, '4_CUSTOM_ORDER_RENDER', `Error during custom order render: ${e.message}`);
    }

    // Check 2: Non-empty HTML string
    assert(typeof fullHtml === 'string' && fullHtml.length > 500, templateKey, '2_VALID_HTML_LENGTH');

    // Check 3: A4 page geometry & print setup
    assert(fullHtml.includes('794px') && fullHtml.includes('1123px'), templateKey, '3_A4_GEOMETRY');

    // Check 4: Candidate Name stamped
    assert(fullHtml.includes('data-df-field="name"') && fullHtml.includes('Marcus Vance'), templateKey, '4_NAME_STAMP');

    // Check 5: Candidate Title stamped when provided
    assert(fullHtml.includes('data-df-field="title"') && fullHtml.includes('Chief Information Security Officer'), templateKey, '5_TITLE_STAMP_FULL');

    // Check 6: Candidate Title stamped when title is empty (Resilient Stamping)
    assert(emptyTitleHtml.includes('data-df-field="title"'), templateKey, '6_TITLE_STAMP_EMPTY_RESILIENT');

    // Check 7: Candidate Title min-height / container stability
    assert(emptyTitleHtml.includes('class="candidate-title') || emptyTitleHtml.includes('candidate-title'), templateKey, '7_TITLE_CANDIDATE_CLASS');

    // Check 8: Experience heading stamped
    assert(fullHtml.includes('data-df-field="heading:experience"'), templateKey, '8_EXP_HEADING_STAMP');

    // Check 9: Education heading stamped
    assert(fullHtml.includes('data-df-field="heading:education"'), templateKey, '9_EDU_HEADING_STAMP');

    // Check 10: Skills heading stamped
    assert(fullHtml.includes('data-df-field="heading:skills"'), templateKey, '10_SKILLS_HEADING_STAMP');

    // Check 11: Summary heading / content stamped
    assert(fullHtml.includes('data-df-field="summary"') || fullHtml.includes('data-df-field="heading:summary"'), templateKey, '11_SUMMARY_STAMP');

    // Check 12: Projects heading stamped
    assert(fullHtml.includes('data-df-field="heading:projects"'), templateKey, '12_PROJECTS_HEADING_STAMP');

    // Check 13: Certifications heading stamped
    assert(fullHtml.includes('data-df-field="heading:certifications"'), templateKey, '13_CERTS_HEADING_STAMP');

    // Check 14: References heading stamped
    assert(fullHtml.includes('data-df-field="heading:references"'), templateKey, '14_REFS_HEADING_STAMP');

    // Check 15: Experience items stamped with exp:0:role, exp:0:company
    assert(fullHtml.includes('data-df-field="exp:0:role"') || fullHtml.includes('data-df-field="exp:0:company"'), templateKey, '15_EXP_ITEMS_STAMP');

    // Check 16: Education items stamped with edu:0:degree, edu:0:school
    assert(fullHtml.includes('data-df-field="edu:0:degree"') || fullHtml.includes('data-df-field="edu:0:school"'), templateKey, '16_EDU_ITEMS_STAMP');

    // Check 17: Skills items stamped with skill:0
    assert(fullHtml.includes('data-df-field="skill:0"'), templateKey, '17_SKILLS_ITEMS_STAMP');

    // Check 18: Section Title overrides respected
    assert(fullHtml.includes('Work History') || fullHtml.includes('Academic Background'), templateKey, '18_SECTION_TITLE_OVERRIDES');

    // Check 19: Dynamic Section Reordering (Education before Experience)
    const eduPos = customOrderHtml.indexOf('data-df-field="heading:education"');
    const expPos = customOrderHtml.indexOf('data-df-field="heading:experience"');
    assert(eduPos !== -1 && expPos !== -1 && eduPos < expPos, templateKey, '19_SECTION_REORDERING');

    // Check 20: Print media styles
    assert(fullHtml.includes('@media print') && fullHtml.includes('-webkit-print-color-adjust'), templateKey, '20_PRINT_STYLES');
  }

  console.log(`\n═══════════════════════════════════════════════════════════════════════════════`);
  console.log(`  MATRIX SIMULATION RESULTS`);
  console.log(`  Total Assertions: ${totalAssertions}`);
  console.log(`  Passed:           ${passedAssertions}`);
  console.log(`  Failed:           ${failedAssertions}`);
  console.log(`  Pass Rate:        ${((passedAssertions / totalAssertions) * 100).toFixed(2)}%`);
  console.log(`═══════════════════════════════════════════════════════════════════════════════\n`);

  fs.writeFileSync('.agents/explorer_survey_2/matrix_failure_report.json', JSON.stringify(failureReport, null, 2));

  // Print failure categories
  const failureCategoryCounts = {};
  Object.values(failureReport).forEach(issues => {
    issues.forEach(i => {
      failureCategoryCounts[i.checkName] = (failureCategoryCounts[i.checkName] || 0) + 1;
    });
  });

  console.log('Failures by Check Category across 89 Templates:');
  console.log(JSON.stringify(failureCategoryCounts, null, 2));
}

runMatrix();
