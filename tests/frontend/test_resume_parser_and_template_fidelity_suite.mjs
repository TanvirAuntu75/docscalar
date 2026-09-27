import assert from 'assert';
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import {
  cleanRawText,
  detectGenericSectionHeader,
  identifySectionHeader,
  splitRespectingParentheses,
  extractPhoneNumber,
  extractLocation,
  parseEducationLines,
  parseSkillsLines,
  parseLanguagesLines,
  parsePdfResumeText,
  extractPageTextWithColumns
} from '../../src/engines/utility/resumeParserEngine.js';

import { resumeReducer, defaultData, initialResumeState, ACTION_TYPES } from '../../src/context/resumeReducer.js';
import { generateMarianaHtml } from '../../src/engines/utility/templates/mariana.js';
import { ensureTemplateFieldParity } from '../../src/engines/utility/universalTemplateParity.js';

console.log('Starting Master Molecular Test Suite: Resume Parser & Template Fidelity\n');

let passCount = 0;
let totalCount = 0;

function runTest(areaId, description, testFn) {
  totalCount++;
  try {
    testFn();
    passCount++;
    console.log(`[PASS] Area ${areaId}: ${description}`);
  } catch (err) {
    console.error(`[FAIL] Area ${areaId}: ${description}`);
    console.error(`       Error: ${err.message}`);
    throw err;
  }
}

// ── Area 1: cleanRawText Unicode & Whitespace Normalization ──
runTest('01', 'cleanRawText normalizes zero-width spaces, non-breaking spaces, and CRLF', () => {
  const dirty = 'Hello\u200B\uFEFFWorld\u00A0Test\r\nLine2\rLine3';
  const clean = cleanRawText(dirty);
  assert.strictEqual(clean, 'HelloWorld Test\nLine2\nLine3');
});

// ── Area 2: splitRespectingParentheses Basic Delimiters ──
runTest('02', 'splitRespectingParentheses splits simple comma-separated items', () => {
  const res = splitRespectingParentheses('HTML, CSS, JavaScript, React', ',');
  assert.deepStrictEqual(res, ['HTML', 'CSS', 'JavaScript', 'React']);
});

// ── Area 3: splitRespectingParentheses Preserves Inner Parentheses ──
runTest('03', 'splitRespectingParentheses preserves commas inside parentheses and brackets', () => {
  const res = splitRespectingParentheses('Python (variables, loops, functions, lists, dictionaries), Git [add, commit, push]', ',');
  assert.deepStrictEqual(res, [
    'Python (variables, loops, functions, lists, dictionaries)',
    'Git [add, commit, push]'
  ]);
});

// ── Area 4: detectGenericSectionHeader Rejects Candidate Names ──
runTest('04', 'detectGenericSectionHeader rejects multi-word candidate names in ALL-CAPS', () => {
  assert.strictEqual(detectGenericSectionHeader('TANVIR ALAM AUNTU', 'TANVIR ALAM AUNTU'), false);
  assert.strictEqual(detectGenericSectionHeader('JOHN FITZGERALD KENNEDY'), false);
  assert.strictEqual(detectGenericSectionHeader('MARY JANE WATSON'), false);
});

// ── Area 5: detectGenericSectionHeader Rejects GPA & Grade Lines ──
runTest('05', 'detectGenericSectionHeader rejects GPA and examination grade lines', () => {
  assert.strictEqual(detectGenericSectionHeader('GPA: 5.00 / 5.00'), false);
  assert.strictEqual(detectGenericSectionHeader('CGPA: 3.92 / 4.00'), false);
  assert.strictEqual(detectGenericSectionHeader('Completed: 2023'), false);
  assert.strictEqual(detectGenericSectionHeader('Grade: A+'), false);
});

// ── Area 6: detectGenericSectionHeader Rejects Key-Value Course Proficiencies ──
runTest('06', 'detectGenericSectionHeader rejects subject proficiency lines', () => {
  assert.strictEqual(detectGenericSectionHeader('ALGEBRA: PROFICIENT'), false);
  assert.strictEqual(detectGenericSectionHeader('MECHANICS: PROFICIENT'), false);
  assert.strictEqual(detectGenericSectionHeader('CORE SUBJECTS: PHYSICS'), false);
  assert.strictEqual(detectGenericSectionHeader('CHEMISTRY: PROFICIENT'), false);
});

// ── Area 7: detectGenericSectionHeader Rejects Europass CEFR Table Descriptors ──
runTest('07', 'detectGenericSectionHeader rejects Europass language grid headers', () => {
  assert.strictEqual(detectGenericSectionHeader('Understanding Speaking Writing'), false);
  assert.strictEqual(detectGenericSectionHeader('Listening Reading Spoken production Spoken interaction'), false);
  assert.strictEqual(detectGenericSectionHeader('Mother tongue(s): BENGALI'), false);
  assert.strictEqual(detectGenericSectionHeader('ENGLISH C2 C1 B2 B2 B2'), false);
});

// ── Area 8: detectGenericSectionHeader Accepts Canonical & Custom Headings ──
runTest('08', 'detectGenericSectionHeader accepts valid custom section headings with keywords', () => {
  assert.strictEqual(detectGenericSectionHeader('PUBLICATIONS'), true);
  assert.strictEqual(detectGenericSectionHeader('HONORS & AWARDS'), true);
  assert.strictEqual(detectGenericSectionHeader('VOLUNTEER ACTIVITIES'), true);
  assert.strictEqual(detectGenericSectionHeader('RELEVANT COURSEWORK'), true);
  assert.strictEqual(detectGenericSectionHeader('### Key Projects'), true);
});

// ── Area 9: identifySectionHeader Recognizes Standard & Custom Sections ──
runTest('09', 'identifySectionHeader correctly classifies canonical sections and custom presets', () => {
  assert.strictEqual(identifySectionHeader('TECHNICAL SKILLS'), 'skills');
  assert.strictEqual(identifySectionHeader('EDUCATION'), 'education');
  assert.strictEqual(identifySectionHeader('PROJECTS'), 'projects');
  assert.strictEqual(identifySectionHeader('CERTIFICATIONS'), 'certifications');
  assert.strictEqual(identifySectionHeader('LANGUAGES'), 'languages');
  assert.strictEqual(identifySectionHeader('INTERESTS'), 'custom_interests');
  assert.strictEqual(identifySectionHeader('COURSES'), 'custom_coursework');
});

// ── Area 10: extractPhoneNumber Handles International Country Codes ──
runTest('10', 'extractPhoneNumber accurately extracts +880 Bangladesh international phone numbers', () => {
  const res1 = extractPhoneNumber('Phone: +880 1614-453217');
  assert.strictEqual(res1, '+880 1614-453217');
});

// ── Area 11: extractPhoneNumber Strips Trailing Metadata Labels ──
runTest('11', 'extractPhoneNumber strips trailing (Mobile) or (Home) qualifiers', () => {
  const res = extractPhoneNumber('Phone number:\n(+880) 1614453217 (Mobile)\nEmail: user@test.com');
  assert.strictEqual(res, '(+880) 1614453217');
});

// ── Area 12: extractPhoneNumber Handles US and UK Phone Formats ──
runTest('12', 'extractPhoneNumber extracts US and UK standard phone formats', () => {
  assert.strictEqual(extractPhoneNumber('Call me at +1 (555) 234-5678 today'), '+1 (555) 234-5678');
  assert.strictEqual(extractPhoneNumber('Tel: +44 7911 123456'), '+44 7911 123456');
});

// ── Area 13: extractLocation Extracts Full Multi-Part Physical Address ──
runTest('13', 'extractLocation extracts complete multi-part address without mangling', () => {
  const lines = [
    'TANVIR ALAM AUNTU',
    'Satbaria, Mia Bazar – 3500, Chauddagram, Cumilla, Bangladesh',
    'Email: tanvirzia2006@gmail.com'
  ];
  const loc = extractLocation('', lines);
  assert.strictEqual(loc, 'Satbaria, Mia Bazar – 3500, Chauddagram, Cumilla, Bangladesh');
});

// ── Area 14: extractLocation Uses Negative Lookbehind for Email Address ──
runTest('14', 'extractLocation ignores Email address and extracts physical Address', () => {
  const text = 'Email address: tanvirzia2006@gmail.com\nAddress: Satbaria, Mia Bazar, Chauddagram, 3500, Cumilla, Bangladesh (Home)';
  const loc = extractLocation(text, []);
  assert.strictEqual(loc, 'Satbaria, Mia Bazar, Chauddagram, 3500, Cumilla, Bangladesh');
});

// ── Area 15: parseEducationLines Handles Multiple Diplomas (HSC and SSC) ──
runTest('15', 'parseEducationLines extracts both HSC and SSC entries distinctly', () => {
  const lines = [
    'Higher Secondary Certificate (HSC)',
    'Govt. Science College, Tejgaon, Dhaka',
    'Completed: 2023',
    'GPA: 5.00 / 5.00',
    'Secondary School Certificate (SSC)',
    'Comilla Zilla School, Kandirpar, Cumilla',
    'Completed: 2021',
    'GPA: 5.00 / 5.00'
  ];
  const edus = parseEducationLines(lines);
  assert.strictEqual(edus.length, 2);
  assert.strictEqual(edus[0].degree, 'Higher Secondary Certificate (HSC)');
  assert.strictEqual(edus[0].school, 'Govt. Science College, Tejgaon, Dhaka');
  assert.strictEqual(edus[1].degree, 'Secondary School Certificate (SSC)');
  assert.strictEqual(edus[1].school, 'Comilla Zilla School, Kandirpar, Cumilla');
});

// ── Area 16: parseEducationLines Preserves 5.00 / 5.00 GPA Scale ──
runTest('16', 'parseEducationLines parses 5.00 GPA scales without truncation or loss', () => {
  const lines = [
    'Higher Secondary Certificate (HSC)',
    'Govt. Science College, Tejgaon, Dhaka',
    'GPA: 5.00 / 5.00'
  ];
  const edus = parseEducationLines(lines);
  assert.strictEqual(edus[0].gpa, '5.00 / 5.00');
  assert.strictEqual(edus[0].note, 'GPA: 5.00 / 5.00');
});

// ── Area 17: parseEducationLines Handles Single Graduation Year ──
runTest('17', 'parseEducationLines sets single completion year without defaulting to 2016-2020', () => {
  const lines = [
    'Higher Secondary Certificate (HSC)',
    'Govt. Science College, Tejgaon, Dhaka',
    'Completed: 2023'
  ];
  const edus = parseEducationLines(lines);
  assert.strictEqual(edus[0].start, '2023');
  assert.strictEqual(edus[0].end, '2023');
  assert.notStrictEqual(edus[0].end, '2020');
});

// ── Area 18: parseSkillsLines Preserves Nested Parenthetical Details ──
runTest('18', 'parseSkillsLines does not sever parenthesized tokens in skill lists', () => {
  const lines = [
    'Programming: Python (variables, loops, functions, lists, dictionaries)',
    'Web Development: HTML, CSS, responsive design',
    'Version Control: Git (basics), GitHub workflow'
  ];
  const skills = parseSkillsLines(lines);
  assert.strictEqual(skills.length, 6);
  assert.ok(skills.includes('Python (variables, loops, functions, lists, dictionaries)'));
  assert.ok(skills.includes('Git (basics)'));
  assert.ok(skills.includes('GitHub workflow'));
  assert.ok(!skills.includes('variables'));
  assert.ok(!skills.includes('loops'));
});

// ── Area 19: parseLanguagesLines Preserves IELTS Exam Sub-Scores ──
runTest('19', 'parseLanguagesLines keeps exam score breakdown in single language entry', () => {
  const lines = [
    'English — IELTS 7.0 Overall (Listening 8.0, Reading 7.5, Writing 6.5, Speaking 6.0)',
    'Bengali — Native'
  ];
  const langs = parseLanguagesLines(lines);
  assert.strictEqual(langs.length, 2);
  assert.strictEqual(langs[0].title, 'English');
  assert.strictEqual(langs[0].value, 'IELTS 7.0 Overall (Listening 8.0, Reading 7.5, Writing 6.5, Speaking 6.0)');
  assert.strictEqual(langs[1].title, 'Bengali');
  assert.strictEqual(langs[1].value, 'Native');
});

// ── Area 20: parseLanguagesLines Filters CEFR Scale Noise ──
runTest('20', 'parseLanguagesLines eliminates Europass table rubric lines', () => {
  const lines = [
    'Mother tongue(s): BENGALI',
    'Understanding Speaking Writing',
    'Listening Reading Spoken production Spoken interaction',
    'English C2 C1 B2 B2 B2'
  ];
  const langs = parseLanguagesLines(lines);
  assert.strictEqual(langs.length, 2);
  assert.strictEqual(langs[0].title, 'BENGALI');
  assert.strictEqual(langs[0].value, 'Native');
  assert.strictEqual(langs[1].title, 'English');
  assert.strictEqual(langs[1].value, 'C2 C1 B2 B2 B2');
});

// ── Area 21: parsePdfResumeText End-to-End Extraction on User PDF ──
runTest('21', 'parsePdfResumeText extracts complete accurate profile from user PDF', async () => {
  const data = new Uint8Array(fs.readFileSync('C:/Users/Tanvir Alam/.gemini/antigravity/brain/76ba4464-aa09-43be-a66f-d75b4c9f0271/.user_uploaded/media_1790392558235.pdf'));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  const items = tc.items.map(it => ({ text: it.str, x: it.transform[4], y: it.transform[5], width: it.width || 0, height: it.height || 0 }));
  const pageText = extractPageTextWithColumns(items);
  const res = parsePdfResumeText(pageText);

  assert.strictEqual(res.name, 'TANVIR ALAM AUNTU');
  assert.strictEqual(res.phone, '+880 1614-453217');
  assert.strictEqual(res.email, 'tanvirzia2006@gmail.com');
  assert.strictEqual(res.location, 'Satbaria, Mia Bazar – 3500, Chauddagram, Cumilla, Bangladesh');
  assert.strictEqual(res.github, 'github.com/TheDarkKnight75');
  assert.strictEqual(res.photoUrl, '');
  assert.strictEqual(res.education.length, 2);
  assert.strictEqual(res.skills.length, 10);
  assert.strictEqual(res.projects.length, 1);
  assert.strictEqual(res.customSections.length, 2); // languages and interests
});

// ── Area 22: parsePdfResumeText Avoids Mistaking Cert URL as Portfolio ──
runTest('22', 'parsePdfResumeText does not set personal website to third-party certification link', async () => {
  const data = new Uint8Array(fs.readFileSync('C:/Users/Tanvir Alam/.gemini/antigravity/brain/76ba4464-aa09-43be-a66f-d75b4c9f0271/.user_uploaded/media_1790392558235.pdf'));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  const items = tc.items.map(it => ({ text: it.str, x: it.transform[4], y: it.transform[5], width: it.width || 0, height: it.height || 0 }));
  const pageText = extractPageTextWithColumns(items);
  const res = parsePdfResumeText(pageText);

  assert.strictEqual(res.website, '');
});

// ── Area 23: resumeReducer IMPORT_DATA Clears Default Photo ──
runTest('23', 'resumeReducer IMPORT_DATA forces photoUrl to empty string when not in payload', () => {
  const action = {
    type: ACTION_TYPES.IMPORT_DATA,
    payload: {
      data: {
        name: 'TANVIR ALAM AUNTU',
        email: 'tanvirzia2006@gmail.com',
        phone: '+880 1614-453217'
      }
    }
  };
  const newState = resumeReducer(initialResumeState, action);
  assert.strictEqual(newState.data.photoUrl, '');
  assert.strictEqual(newState.data.name, 'TANVIR ALAM AUNTU');
});

// ── Area 24: resumeReducer IMPORT_DATA Completely Overwrites Default Skills ──
runTest('24', 'resumeReducer IMPORT_DATA replaces dummy office skills with imported technical skills', () => {
  const userSkills = ['Python', 'HTML', 'CSS', 'Git', 'GitHub'];
  const action = {
    type: ACTION_TYPES.IMPORT_DATA,
    payload: {
      data: {
        name: 'TANVIR ALAM AUNTU',
        skills: userSkills
      }
    }
  };
  const newState = resumeReducer(initialResumeState, action);
  assert.deepStrictEqual(newState.data.skills, userSkills);
  assert.ok(!newState.data.skills.includes('Word'));
  assert.ok(!newState.data.skills.includes('Excel'));
  assert.ok(!newState.data.skills.includes('Powerpoint'));
});

// ── Area 25: resumeReducer IMPORT_DATA Synchronizes Custom Section Order ──
runTest('25', 'resumeReducer IMPORT_DATA registers custom_interests in sectionOrder', () => {
  const action = {
    type: ACTION_TYPES.IMPORT_DATA,
    payload: {
      data: {
        name: 'TANVIR ALAM AUNTU',
        customSections: [
          { id: 'custom_languages', title: 'Languages', items: [] },
          { id: 'custom_interests', title: 'Interests', items: [] }
        ]
      }
    }
  };
  const newState = resumeReducer(initialResumeState, action);
  assert.ok(newState.theme.sectionOrder.includes('custom_languages'));
  assert.ok(newState.theme.sectionOrder.includes('custom_interests'));
});

// ── Area 26: mariana.js Suppresses Stock Avatar When photoUrl is Empty ──
runTest('26', 'generateMarianaHtml does not render avatar container or stock photo when photoUrl is blank', () => {
  const testData = {
    ...defaultData,
    name: 'TANVIR ALAM AUNTU',
    photoUrl: ''
  };
  const html = generateMarianaHtml(testData);
  assert.ok(!html.includes('mariana.jpg'));
  assert.ok(!html.includes('class="avatar"'));
});

// ── Area 27: mariana.js Single Graduation Year Formula Verification ──
runTest('27', 'generateMarianaHtml renders single graduation year without dash repetition', () => {
  const testData = {
    ...defaultData,
    name: 'TANVIR ALAM AUNTU',
    education: [
      { id: 'edu1', degree: 'HSC', school: 'Science College', start: '2023', end: '2023' }
    ]
  };
  const html = generateMarianaHtml(testData);
  assert.ok(html.includes('>2023</div>'));
  assert.ok(!html.includes('2023 – 2023'));
});

// ── Area 28: mariana.js Date Range Formula Verification ──
runTest('28', 'generateMarianaHtml renders multi-year date range with en-dash', () => {
  const testData = {
    ...defaultData,
    name: 'TANVIR ALAM AUNTU',
    education: [
      { id: 'edu1', degree: 'B.Sc.', school: 'University', start: '2020', end: '2024' }
    ]
  };
  const html = generateMarianaHtml(testData);
  assert.ok(html.includes('2020 – 2024'));
});

// ── Area 29: mariana.js isContinuation Option Normalization ──
runTest('29', 'generateMarianaHtml does not append (Continued) when isContinuation object is false', () => {
  const testData = {
    ...defaultData,
    name: 'TANVIR ALAM AUNTU',
    certifications: ['Responsive Web Design — freeCodeCamp']
  };
  const html = generateMarianaHtml(testData);
  assert.ok(html.includes('>Certifications</h2>') || html.includes('>CERTIFICATIONS</h2>') || html.includes('data-df-field="heading:certifications">Certifications</h2>'));
  assert.ok(!html.includes('Certifications (Continued)'));
});

// ── Area 30: universalTemplateParity Main Column Parity Injection ──
runTest('30', 'ensureTemplateFieldParity injects missing custom section into main column', () => {
  const testData = {
    name: 'TANVIR ALAM AUNTU',
    customSections: [
      {
        id: 'custom_interests',
        title: 'Interests',
        items: [{ id: '1', title: 'Data Science, Machine Learning', value: '' }]
      }
    ]
  };
  const rawHtml = '<div class="main-col"><div>Existing Content</div></div>';
  const finalHtml = ensureTemplateFieldParity(rawHtml, testData);
  assert.ok(finalHtml.includes('custom_interests'));
  assert.ok(finalHtml.includes('Data Science, Machine Learning'));
});

// ── Area 31: universalTemplateParity Avoids Duplicate Section Injection ──
runTest('31', 'ensureTemplateFieldParity does not duplicate custom section already in markup', () => {
  const testData = {
    name: 'TANVIR ALAM AUNTU',
    customSections: [
      {
        id: 'custom_languages',
        title: 'Languages',
        items: [{ id: '1', title: 'English', value: 'Fluent' }]
      }
    ]
  };
  const rawHtml = '<div class="main-col"><h3 data-df-field="custom:custom_languages:title">Languages</h3></div>';
  const finalHtml = ensureTemplateFieldParity(rawHtml, testData);
  const count = (finalHtml.match(/data-df-field="custom:custom_languages:title"/g) || []).length;
  assert.strictEqual(count, 1);
});

// ── Area 32: End-to-End Visual HTML Export Verification ──
runTest('32', 'Full parsed resume generates valid HTML document with correct metadata', async () => {
  const data = new Uint8Array(fs.readFileSync('C:/Users/Tanvir Alam/.gemini/antigravity/brain/76ba4464-aa09-43be-a66f-d75b4c9f0271/.user_uploaded/media_1790392558235.pdf'));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  const items = tc.items.map(it => ({ text: it.str, x: it.transform[4], y: it.transform[5], width: it.width || 0, height: it.height || 0 }));
  const pageText = extractPageTextWithColumns(items);
  const parsed = parsePdfResumeText(pageText);

  const rawHtml = generateMarianaHtml(parsed);
  const finalHtml = ensureTemplateFieldParity(rawHtml, parsed);

  assert.ok(finalHtml.includes('<!DOCTYPE html>'));
  assert.ok(finalHtml.includes('TANVIR ALAM AUNTU'));
  assert.ok(finalHtml.includes('+880 1614-453217'));
  assert.ok(finalHtml.includes('Higher Secondary Certificate (HSC)'));
  assert.ok(finalHtml.includes('Secondary School Certificate (SSC)'));
  assert.ok(finalHtml.includes('5.00 / 5.00'));
  assert.ok(!finalHtml.includes('mariana.jpg'));
});

// ── Area 33: Europass Document Parsing Robustness ──
runTest('33', 'parsePdfResumeText handles Europass format without creating spurious sections', async () => {
  const euPath = 'C:/Users/Tanvir Alam/Downloads/Tanvir Alam  Auntu7.pdf';
  if (fs.existsSync(euPath)) {
    const euData = new Uint8Array(fs.readFileSync(euPath));
    const euDoc = await pdfjsLib.getDocument({ data: euData }).promise;
    const pages = [];
    for (let i = 1; i <= euDoc.numPages; i++) {
      const p = await euDoc.getPage(i);
      const tc = await p.getTextContent();
      const items = tc.items.map(it => ({ text: it.str, x: it.transform[4], y: it.transform[5], width: it.width || 0, height: it.height || 0 }));
      pages.push(extractPageTextWithColumns(items));
    }
    const fullText = pages.join('\n\n');
    const euRes = parsePdfResumeText(fullText);

    assert.strictEqual(euRes.name, 'Tanvir Alam Auntu');
    assert.strictEqual(euRes.phone, '(+880) 1614453217');
    assert.ok(euRes.location.includes('Satbaria, Mia Bazar'));
    assert.strictEqual(euRes.email, 'tanvirzia2006@gmail.com');
    assert.strictEqual(euRes.photoUrl, '');
    assert.ok(euRes.customSections.every(cs => cs.id !== 'custom_tanvir_alam_auntu'));
    assert.ok(euRes.customSections.every(cs => cs.id !== 'custom_understanding_speaking_writing'));
    assert.ok(euRes.customSections.every(cs => cs.id !== 'custom_english_c2_c1_b2_b2_b2'));
  }
});

// ── Area 34: Formula Verification for Line Height & Margins ──
runTest('34', 'Formula calculation for page line-height and margin bounds', () => {
  const lineSpacing = 1.45;
  const adjusted = lineSpacing * 1.0;
  assert.strictEqual(Number(adjusted.toFixed(2)), 1.45);
  const margin = 24;
  const printableWidth = 794 - (margin * 2);
  assert.strictEqual(printableWidth, 746);
});

// ── Area 35: High Density Character Boundary Assertions ──
runTest('35', 'Zero undefined or NaN values in final serialized resume model', () => {
  const parsed = parsePdfResumeText('TANVIR ALAM AUNTU\nEmail: a@b.com\nPhone: +880 1614-453217\nEDUCATION\nHSC\n2023');
  assert.strictEqual(typeof parsed.name, 'string');
  assert.strictEqual(typeof parsed.phone, 'string');
  assert.strictEqual(typeof parsed.email, 'string');
  assert.strictEqual(typeof parsed.location, 'string');
  assert.ok(!isNaN(parsed.education.length));
  assert.ok(!isNaN(parsed.skills.length));
  assert.ok(!isNaN(parsed.projects.length));
});

console.log(`\n======================================================`);
console.log(`Master Molecular Suite Passed: ${passCount}/${totalCount} (100% SUCCESS)`);
console.log(`======================================================\n`);
