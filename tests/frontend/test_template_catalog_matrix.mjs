/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DocForge 85-Template Resume Catalog Test Matrix Runner
 * ═══════════════════════════════════════════════════════════════════════════════
 * Comprehensive, empirical test runner covering ALL 85 resume templates
 * across 4 rigorous tiers of architectural and compliance checks:
 * 
 * - Tier 1: Template Loadability & Baseline Generation (85 tests)
 * - Tier 2: Zero Mock Data Resurrection on Empty Payloads & Zero Ghost Headers (85 tests)
 * - Tier 3: WYSIWYG `data-df-field` Attribute Correctness & Avatar Masking (85 tests)
 * - Tier 4: Full Realistic Payload Rendering, Discrete A4 Bounds & Print Parity (85 tests)
 * 
 * Execution:
 *   node tests/frontend/test_template_catalog_matrix.mjs [--json] [--verbose] [--quiet] [--template=<slug>]
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const TEMPLATES_DIR = path.resolve(PROJECT_ROOT, 'src/engines/utility/templates');

// ─── Test Data Payloads ────────────────────────────────────────────────────────

export const REALISTIC_PAYLOAD = {
  name: 'Mariana Anderson',
  title: 'Marketing Manager',
  photoUrl: '/images/candidates/mariana.jpg',
  photoCrop: { scale: 1, x: 0, y: 0 },
  email: 'hello@reallygreatsite.com',
  phone: '+123-456-7890',
  location: '123 Anywhere St., Any City',
  website: 'reallygreatsite.com',
  linkedin: 'linkedin.com/in/mariana-anderson',
  summary: 'Accomplished and results-driven Marketing Professional with 7+ years of experience directing cross-functional marketing campaigns, optimizing conversion funnels, and managing high-performance creative teams. Proven track record of scaling brand engagement by 45% and driving multimillion-dollar revenue pipelines through data-driven digital strategies and user-centric brand architecture.',
  experience: [
    {
      id: 'exp1',
      company: 'Ginyard International Co.',
      role: 'Senior Marketing Manager',
      start: '2022',
      end: 'PRESENT',
      highlights: [
        'Develop and execute comprehensive multi-channel marketing campaigns that generated $3.8M in net new pipeline and expanded brand reach across North American markets.',
        'Lead and mentor a cross-functional marketing team of 8 specialists across content, SEO, paid media, and lifecycle automation to consistently achieve quarterly KPIs.',
        'Oversee brand positioning and customer acquisition strategy, reducing customer acquisition cost (CAC) by 28% while improving lead-to-opportunity conversion.'
      ]
    },
    {
      id: 'exp2',
      company: 'Borcelle Digital Media',
      role: 'Marketing & Growth Specialist',
      start: '2020',
      end: '2022',
      highlights: [
        'Managed end-to-end digital ad spend of $1.2M across Google Ads, Meta, and LinkedIn, optimizing click-through rates by 35% and ROAS by 2.4x.',
        'Spearheaded conversion rate optimization (CRO) initiatives and A/B testing on core landing pages, resulting in an 18% lift in demo completion rates.',
        'Coordinated cross-functional product launches with engineering and product management teams to ensure unified brand narrative and market readiness.'
      ]
    },
    {
      id: 'exp3',
      company: 'Fauget Studio',
      role: 'Associate Campaign Strategist',
      start: '2018',
      end: '2020',
      highlights: [
        'Conducted extensive market research and competitor benchmarking to identify high-growth audience segments and emerging industry trends.',
        'Authored engaging copy, case studies, and email drip sequences that increased subscriber retention and email open rates by 24%.'
      ]
    }
  ],
  education: [
    {
      id: 'edu1',
      school: 'Borcelle University',
      degree: 'Master of Business Management (MBM)',
      start: '2020',
      end: '2022',
      note: 'GPA: 3.9 / 4.0 · Dean’s Honor List'
    },
    {
      id: 'edu2',
      school: 'Borcelle University',
      degree: 'Bachelor of Science in Business & Marketing',
      start: '2014',
      end: '2018',
      note: 'Graduated Magna Cum Laude · GPA: 3.85 / 4.0'
    }
  ],
  skills: [
    'Strategic Planning - Expert',
    'Project Management - Expert',
    'Digital Marketing - Expert',
    'Data Analytics & BI - Advanced',
    'Team Leadership - Advanced',
    'Brand Architecture - Advanced',
    'UI/UX Design - Advanced',
    'Public Relations - Intermediate',
    'Budget Allocation - Expert',
    'Time Management - Expert'
  ],
  certifications: [
    'Certified Digital Marketing Professional (CDMP) · DMI 2024',
    'Reforge Growth & Retention Strategy Certification',
    'HubSpot Inbound & Content Marketing Master'
  ],
  projects: [
    {
      id: 'proj1',
      name: 'Campaign "Grow"',
      description: 'Scaled enterprise pipeline generating 150% ROI and 25,000 qualified marketing leads within 9 months.',
      url: 'ginyard.co/campaign-grow'
    },
    {
      id: 'proj2',
      name: 'Brand Replatforming',
      description: 'Redesigned corporate identity and digital asset library, elevating customer NPS by 18 points.',
      url: 'ginyard.co/rebrand'
    }
  ],
  references: [
    {
      id: 'ref1',
      name: 'Benjamin Shah',
      relation: 'Wardiere Inc. / Chief Technology Officer',
      phone: '+1 (555) 234-5678',
      email: 'b.shah@wardiere.com'
    },
    {
      id: 'ref2',
      name: 'Bailey Dupont',
      relation: 'Ginyard Co. / VP of Global Operations',
      phone: '+1 (555) 876-5432',
      email: 'b.dupont@ginyard.com'
    }
  ],
  customSections: [
    {
      id: 'custom_languages',
      title: 'Languages',
      items: [
        { id: 'lang1', title: 'English', value: 'Native / Fluent' },
        { id: 'lang2', title: 'Spanish', value: 'Professional Working' },
        { id: 'lang3', title: 'French', value: 'Conversational' }
      ]
    }
  ]
};

export const EMPTY_PAYLOAD = {
  name: '',
  title: '',
  phone: '',
  email: '',
  location: '',
  website: '',
  linkedin: '',
  summary: '',
  photoUrl: '',
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  references: [],
  customSections: []
};

// Known Persona / Mock Data strings that must NEVER resurrect when empty
export const BANNED_MOCK_STRINGS = [
  'Candidate Name',
  'ADAM FLETCHER',
  'Adam Fletcher',
  'Adeline Palmerston',
  'Alfredo Torres',
  'Arthur Pendelton',
  'Donna Stroupe',
  'Howard Ong',
  'Isabel Mercado',
  'ISABEL MERCADO',
  'Isabel Schumacher',
  'Jonathan Patterson',
  'Kelly Blackwell',
  'Korina Villanueva',
  'Lorna Alvarado',
  'Marcus Vance',
  'Richard Sanchez',
  'Sebastian Bennett',
  'Adora Montminy',
  'Adora Sharma',
  'Marcus Sterling',
  'Olivia Sterling',
  'Jonathan Brewer',
  'Emma Sinclair',
  'Clara Oswald',
  'Charles Rodriguez',
  'Kathleen Jenkins',
  'Richard Fowler',
  'Evelyn St. Claire',
  'Mateo Sanchez',
  'Marcus Wilson',
  'Yuki Sanchez',
  'Alexander Hayes',
  'Mei Sanchez',
  'David Howard',
  'Layla Schumacher',
  'Alex Mercer',
  'Catrine Olive',
  'Lorna Slate',
  'Jason Vance',
  'Mariana Wilson'
];

export const BANNED_EMOJI_GLYPHS = [
  '✦', '❖', '☀', '❄', '☼', '❧', '🌲', '♦', '★', '☎', '✉', '📍', '🌐', '💼', '🎓', '🛠', '🔗', '📱', '📧', '🏠'
];

// ─── Verification Engine ───────────────────────────────────────────────────────

/**
 * Executes Tier 1 verification: Loadability & baseline generation
 */
export function verifyTier1(slug, fn) {
  const assertions = [];

  try {
    const html = fn(REALISTIC_PAYLOAD);

    assertions.push({
      id: 'T1.1_TYPE',
      desc: 'Function returns non-empty string (>500 chars)',
      pass: typeof html === 'string' && html.length > 500,
      details: `Returned string length: ${html ? html.length : 0}`
    });

    assertions.push({
      id: 'T1.2_DOCTYPE',
      desc: 'HTML output includes valid DOCTYPE declaration',
      pass: /<!DOCTYPE\s+html>/i.test(html),
      details: html ? html.slice(0, 50).trim() : 'Empty output'
    });

    assertions.push({
      id: 'T1.3_HTML_TAGS',
      desc: 'HTML contains standard html, head, body tags',
      pass: /<html/i.test(html) && /<head/i.test(html) && /<body/i.test(html) && /<\/html>/i.test(html),
      details: 'Standard HTML tags present'
    });

    assertions.push({
      id: 'T1.4_STYLE_BLOCK',
      desc: 'HTML contains embedded style block',
      pass: /<style[\s\S]*?<\/style>/i.test(html),
      details: 'Embedded CSS verified'
    });
  } catch (err) {
    assertions.push({
      id: 'T1.0_EXEC_ERROR',
      desc: 'Function executed without throwing exception',
      pass: false,
      details: `Exception: ${err.message}`
    });
  }

  return {
    tier: 1,
    name: 'Tier 1: Loadability & Baseline Generation',
    pass: assertions.every(a => a.pass),
    assertions
  };
}

/**
 * Executes Tier 2 verification: Zero mock data resurrection & zero ghost headers
 */
export function verifyTier2(slug, fn) {
  const assertions = [];

  try {
    // 1. Test with completely empty cleared payload
    const emptyHtml = fn(EMPTY_PAYLOAD);

    // Check for banned mock persona names in rendered body
    const resurrectedMockStrings = [];
    for (const mockStr of BANNED_MOCK_STRINGS) {
      const regex = new RegExp(`\\b${mockStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(emptyHtml)) {
        resurrectedMockStrings.push(mockStr);
      }
    }

    assertions.push({
      id: 'T2.1_ZERO_MOCK_NAMES',
      desc: 'Zero mock persona names resurrected on empty payload',
      pass: resurrectedMockStrings.length === 0,
      details: resurrectedMockStrings.length > 0
        ? `Resurrected mock strings: [${resurrectedMockStrings.join(', ')}]`
        : 'Clean - No mock names found'
    });

    // Check for ghost contact header
    // When contact is empty, no standalone <h3>Contact</h3> / <h2>Contact</h2> with empty items should appear
    const hasGhostContactHeader = /(?:<h3>|<h2>|<div class="sidebar-section"><h3>)\s*Contact\s*<\/h[23]>(?![\s\S]{1,300}(?:data-df-field="phone"|data-df-field="email"|data-df-field="location"))/i.test(emptyHtml);
    const hasEmptyContactList = /<div class="(?:sidebar-)?contact-list">\s*<\/div>/i.test(emptyHtml);

    assertions.push({
      id: 'T2.2_NO_GHOST_CONTACT',
      desc: 'Contact section header suppressed when contact info is empty',
      pass: !hasGhostContactHeader && !hasEmptyContactList,
      details: hasGhostContactHeader
        ? 'Ghost Contact header detected on empty contact payload'
        : hasEmptyContactList
        ? 'Empty contact list container rendered'
        : 'Clean - Contact section suppressed'
    });

    // Check for ghost summary / profile container
    const hasGhostSummary = /<div class="summary"[^>]*>\s*<\/div>/i.test(emptyHtml) ||
      /<p[^>]*data-df-field="summary"[^>]*>\s*<\/p>/i.test(emptyHtml);

    assertions.push({
      id: 'T2.3_NO_GHOST_SUMMARY',
      desc: 'Summary container suppressed or clean when summary is empty',
      pass: !hasGhostSummary,
      details: hasGhostSummary ? 'Ghost empty summary tag detected' : 'Clean - No ghost summary'
    });

    // Check for hardcoded mock names in document <title>
    const hardcodedTitleMatch = emptyHtml.match(/<title>([^<]+)<\/title>/i);
    const titleText = hardcodedTitleMatch ? hardcodedTitleMatch[1] : '';
    const titleHasMockName = BANNED_MOCK_STRINGS.some(mock => titleText.toLowerCase().includes(mock.toLowerCase()));

    assertions.push({
      id: 'T2.4_DYNAMIC_TITLE',
      desc: 'Document title does not contain hardcoded mock persona name',
      pass: !titleHasMockName,
      details: titleHasMockName ? `Hardcoded title: "${titleText}"` : `Title: "${titleText}"`
    });

    // 2. Test with null / undefined fallback `{}`
    const nullPayloadHtml = fn({});
    const nullMockStrings = BANNED_MOCK_STRINGS.filter(mock => {
      const regex = new RegExp(`\\b${mock.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(nullPayloadHtml);
    });

    assertions.push({
      id: 'T2.5_NULL_PAYLOAD_SAFETY',
      desc: 'Zero mock strings resurrected when invoked with empty object {}',
      pass: nullMockStrings.length === 0,
      details: nullMockStrings.length > 0
        ? `Resurrected on {}: [${nullMockStrings.join(', ')}]`
        : 'Clean on {}'
    });

  } catch (err) {
    assertions.push({
      id: 'T2.0_EXEC_ERROR',
      desc: 'Empty payload generation executed without error',
      pass: false,
      details: `Exception: ${err.message}`
    });
  }

  return {
    tier: 2,
    name: 'Tier 2: Zero Mock Data Resurrection & Zero Ghost Headers',
    pass: assertions.every(a => a.pass),
    assertions
  };
}

/**
 * Executes Tier 3 verification: WYSIWYG `data-df-field` attribute correctness & Avatar Masking
 */
export function verifyTier3(slug, fn) {
  const assertions = [];

  try {
    const html = fn(REALISTIC_PAYLOAD);

    // 1. Check for Duplicate data-df-field attributes on the SAME HTML tag
    const tagMatches = html.match(/<[a-zA-Z0-9]+[^>]*>/g) || [];
    const duplicateTagAttributes = [];

    for (const tag of tagMatches) {
      const dfFieldMatches = tag.match(/data-df-field="[^"]*"/g) || [];
      if (dfFieldMatches.length > 1) {
        duplicateTagAttributes.push({ tag: tag.slice(0, 100), count: dfFieldMatches.length });
      }
    }

    assertions.push({
      id: 'T3.1_NO_DUPLICATE_ATTRS',
      desc: 'Zero duplicate data-df-field attributes on single HTML tags',
      pass: duplicateTagAttributes.length === 0,
      details: duplicateTagAttributes.length > 0
        ? `Found ${duplicateTagAttributes.length} tags with duplicate data-df-field attributes (e.g. ${duplicateTagAttributes[0].tag})`
        : 'Clean - No duplicate attributes'
    });

    // 2. Check canonical stamping of fundamental fields
    const hasNameStamp = /data-df-field="name"/i.test(html);
    const hasTitleStamp = /data-df-field="title"/i.test(html);
    const hasEmailStamp = /data-df-field="email"/i.test(html);
    const hasPhoneStamp = /data-df-field="phone"/i.test(html);
    const hasLocationStamp = /data-df-field="location"/i.test(html);

    assertions.push({
      id: 'T3.2_CORE_FIELD_STAMPS',
      desc: 'Canonical stamping on core contact/header fields (name, title, email, phone, location)',
      pass: hasNameStamp && hasTitleStamp && hasEmailStamp && hasPhoneStamp && hasLocationStamp,
      details: `name:${hasNameStamp}, title:${hasTitleStamp}, email:${hasEmailStamp}, phone:${hasPhoneStamp}, loc:${hasLocationStamp}`
    });

    // 3. Check experience & education stamping
    const hasExpStamp = /data-df-field="exp:0:(?:role|company|date|start)"/i.test(html);
    const hasEduStamp = /data-df-field="edu:0:(?:degree|school|date|start)"/i.test(html);

    assertions.push({
      id: 'T3.3_EXP_EDU_STAMPS',
      desc: 'Canonical stamping on experience and education entries (exp:0:*, edu:0:*)',
      pass: hasExpStamp && hasEduStamp,
      details: `exp:${hasExpStamp}, edu:${hasEduStamp}`
    });

    // 4. Check skills stamping (must stamp skill:0, skill:1, etc.)
    const hasSkillStamp = /data-df-field="skill:0"/i.test(html);

    assertions.push({
      id: 'T3.4_SKILL_STAMPS',
      desc: 'Canonical stamping on skills list items (skill:0)',
      pass: hasSkillStamp,
      details: `skill:0 stamped: ${hasSkillStamp}`
    });

    // 5. Avatar Masking Verification (for photo-supporting templates)
    const isPhotoTemplate = slug !== 'jonathan';
    let avatarMaskPass = true;
    let avatarMaskDetails = 'Text-only template (exempt)';

    if (isPhotoTemplate) {
      const hasAvatarMaskClass = /class="[^"]*avatar-mask[^"]*"/i.test(html);
      const hasOverflowHiddenMask = /overflow:\s*hidden/i.test(html) && /border-radius:\s*(?:50%|9999px|1[0-9]{2}px|28px|12px)/i.test(html);
      avatarMaskPass = hasAvatarMaskClass || hasOverflowHiddenMask;
      avatarMaskDetails = hasAvatarMaskClass
        ? '.avatar-mask class present'
        : hasOverflowHiddenMask
        ? 'Inline overflow:hidden mask present'
        : 'Missing .avatar-mask or overflow:hidden container';
    }

    assertions.push({
      id: 'T3.5_AVATAR_MASKING',
      desc: 'Candidate photo enclosed in dedicated zoom-safe avatar mask',
      pass: avatarMaskPass,
      details: avatarMaskDetails
    });

    // 6. Composite-Field Isolation (no single tag combining company & date)
    const tagMatch = html.match(/<([a-zA-Z0-9]+)[^>]*data-df-field="exp:0:date"[^>]*>([\s\S]*?)<\/\1>/i);
    const hasCompanyInDateTag = tagMatch && tagMatch[2].includes('Ginyard');

    assertions.push({
      id: 'T3.6_COMPOSITE_ISOLATION',
      desc: 'Composite fields isolated into distinct child DOM nodes',
      pass: !hasCompanyInDateTag,
      details: hasCompanyInDateTag ? 'Company and date concatenated into single editable node' : 'Isolated'
    });

  } catch (err) {
    assertions.push({
      id: 'T3.0_EXEC_ERROR',
      desc: 'WYSIWYG stamping inspection executed without error',
      pass: false,
      details: `Exception: ${err.message}`
    });
  }

  return {
    tier: 3,
    name: 'Tier 3: WYSIWYG Attribute Correctness & Avatar Masking',
    pass: assertions.every(a => a.pass),
    assertions
  };
}

/**
 * Executes Tier 4 verification: Full realistic payload rendering, A4 bounds & Print Parity
 */
export function verifyTier4(slug, fn) {
  const assertions = [];

  try {
    const html = fn(REALISTIC_PAYLOAD);

    // 1. Check A4 Container Class & Geometry Bounds
    const hasA4Container = /class="[^"]*(?:cv-page|resume-canvas)[^"]*"/i.test(html);
    const hasA4Dimensions = /794px/i.test(html) || /1123px/i.test(html) || /size:\s*A4/i.test(html);

    assertions.push({
      id: 'T4.1_A4_BOUNDS',
      desc: 'Discrete A4 canvas bounds (.cv-page / .resume-canvas, 794px / 1123px / A4)',
      pass: hasA4Container && hasA4Dimensions,
      details: `Container:${hasA4Container}, Dimensions:${hasA4Dimensions}`
    });

    // 2. Check Print CSS Rules
    const hasMediaPrint = /@media\s+print/i.test(html);
    const hasColorAdjust = /-webkit-print-color-adjust:\s*exact/i.test(html) || /print-color-adjust:\s*exact/i.test(html);

    assertions.push({
      id: 'T4.2_PRINT_PARITY',
      desc: 'Print parity CSS (@media print and -webkit-print-color-adjust: exact)',
      pass: hasMediaPrint && hasColorAdjust,
      details: `@media print:${hasMediaPrint}, color-adjust:${hasColorAdjust}`
    });

    // 3. Check Page-break Avoidance Rule on Last Child
    const hasBreakAvoid = /(?:break-after:\s*avoid|page-break-after:\s*avoid|\.cv-page:last-child)/i.test(html);

    assertions.push({
      id: 'T4.3_PAGE_BREAK_AVOIDANCE',
      desc: 'Trailing blank page avoidance (:last-child break-after: avoid)',
      pass: hasBreakAvoid,
      details: `Page break avoidance rule present: ${hasBreakAvoid}`
    });

    // 4. Check for Raw Emoji Glyphs / Unicode Icons
    const foundEmojiGlyphs = [];
    for (const glyph of BANNED_EMOJI_GLYPHS) {
      if (html.includes(glyph)) {
        foundEmojiGlyphs.push(glyph);
      }
    }

    assertions.push({
      id: 'T4.4_ZERO_RAW_EMOJIS',
      desc: 'Zero raw emoji or non-standard Unicode glyph icons',
      pass: foundEmojiGlyphs.length === 0,
      details: foundEmojiGlyphs.length > 0
        ? `Found banned Unicode glyphs: [${foundEmojiGlyphs.join(', ')}]`
        : 'Clean - No emoji glyphs'
    });

    // 5. Check Section Header & Payload Fidelity
    const rendersExperience = /Ginyard International/i.test(html);
    const rendersEducation = /Borcelle University/i.test(html);
    const rendersSkills = /Strategic Planning/i.test(html);

    assertions.push({
      id: 'T4.5_PAYLOAD_FIDELITY',
      desc: 'Complete multi-section payload rendered into DOM',
      pass: rendersExperience && rendersEducation && rendersSkills,
      details: `Exp:${rendersExperience}, Edu:${rendersEducation}, Skills:${rendersSkills}`
    });

  } catch (err) {
    assertions.push({
      id: 'T4.0_EXEC_ERROR',
      desc: 'Full payload rendering executed without error',
      pass: false,
      details: `Exception: ${err.message}`
    });
  }

  return {
    tier: 4,
    name: 'Tier 4: Full Payload Rendering, A4 Bounds & Print Parity',
    pass: assertions.every(a => a.pass),
    assertions
  };
}

// ─── Master Test Suite Runner ──────────────────────────────────────────────────

export async function runTemplateCatalogMatrix(options = {}) {
  const targetFilter = options.template || null;
  const verbose = options.verbose ?? true;

  const templateFiles = fs.readdirSync(TEMPLATES_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();

  console.log(`\n═══════════════════════════════════════════════════════════════════════════════`);
  console.log(` DOCFORGE 85-TEMPLATE CATALOG VERIFICATION MATRIX`);
  console.log(` Total Template Files Discovered: ${templateFiles.length}`);
  console.log(` Verification Tiers: Tier 1 (Load), Tier 2 (Mock/Ghost), Tier 3 (WYSIWYG), Tier 4 (Print/A4)`);
  console.log(`═══════════════════════════════════════════════════════════════════════════════\n`);

  const results = {
    totalTemplates: templateFiles.length,
    passedTemplates: 0,
    failedTemplates: 0,
    tierSummary: {
      tier1: { passed: 0, failed: 0, totalAssertions: 0, passedAssertions: 0 },
      tier2: { passed: 0, failed: 0, totalAssertions: 0, passedAssertions: 0 },
      tier3: { passed: 0, failed: 0, totalAssertions: 0, passedAssertions: 0 },
      tier4: { passed: 0, failed: 0, totalAssertions: 0, passedAssertions: 0 },
    },
    totalAssertions: 0,
    passedAssertions: 0,
    failedAssertions: 0,
    templateResults: []
  };

  for (const file of templateFiles) {
    const slug = path.basename(file, '.js');
    if (targetFilter && slug !== targetFilter) {
      continue;
    }

    const filePath = path.join(TEMPLATES_DIR, file);
    const fileUrl = pathToFileURL(filePath).href;

    let mod;
    try {
      mod = await import(fileUrl);
    } catch (importErr) {
      console.error(`❌ [IMPORT ERROR] ${slug}: ${importErr.message}`);
      results.failedTemplates++;
      results.templateResults.push({
        slug,
        file,
        pass: false,
        error: `Import failed: ${importErr.message}`,
        tiers: []
      });
      continue;
    }

    // Identify generator function
    const fn = Object.values(mod).find(v => typeof v === 'function');
    if (!fn) {
      console.error(`❌ [NO GENERATOR EXPORT] ${slug}: No exported generator function found`);
      results.failedTemplates++;
      results.templateResults.push({
        slug,
        file,
        pass: false,
        error: 'No exported generator function',
        tiers: []
      });
      continue;
    }

    const t1 = verifyTier1(slug, fn);
    const t2 = verifyTier2(slug, fn);
    const t3 = verifyTier3(slug, fn);
    const t4 = verifyTier4(slug, fn);

    const templatePass = t1.pass && t2.pass && t3.pass && t4.pass;
    if (templatePass) {
      results.passedTemplates++;
    } else {
      results.failedTemplates++;
    }

    // Aggregate Tier counts
    const tiers = [t1, t2, t3, t4];
    tiers.forEach((t, idx) => {
      const tierKey = `tier${idx + 1}`;
      if (t.pass) {
        results.tierSummary[tierKey].passed++;
      } else {
        results.tierSummary[tierKey].failed++;
      }

      t.assertions.forEach(a => {
        results.totalAssertions++;
        results.tierSummary[tierKey].totalAssertions++;
        if (a.pass) {
          results.passedAssertions++;
          results.tierSummary[tierKey].passedAssertions++;
        } else {
          results.failedAssertions++;
        }
      });
    });

    results.templateResults.push({
      slug,
      file,
      functionName: fn.name,
      pass: templatePass,
      tiers: [t1, t2, t3, t4]
    });

    const statusSymbol = templatePass ? '✅' : '❌';
    const tierStatus = `T1:${t1.pass ? '✓' : '✗'} T2:${t2.pass ? '✓' : '✗'} T3:${t3.pass ? '✓' : '✗'} T4:${t4.pass ? '✓' : '✗'}`;
    
    if (verbose || !templatePass) {
      console.log(`${statusSymbol} [${slug.padEnd(26)}] ${tierStatus}`);
      if (!templatePass && verbose) {
        tiers.forEach(t => {
          if (!t.pass) {
            t.assertions.filter(a => !a.pass).forEach(a => {
              console.log(`    ↳ ${a.id}: ${a.desc} -> ${a.details}`);
            });
          }
        });
      }
    } else {
      process.stdout.write(templatePass ? '.' : 'F');
    }
  }

  if (!verbose && !targetFilter) {
    console.log('\n');
  }

  // Print Summary
  console.log(`\n═══════════════════════════════════════════════════════════════════════════════`);
  console.log(` MATRIX EXECUTION SUMMARY`);
  console.log(`═══════════════════════════════════════════════════════════════════════════════`);
  console.log(` Total Templates Tested     : ${results.totalTemplates}`);
  console.log(` Templates Passing (100%)   : ${results.passedTemplates}`);
  console.log(` Templates with Deficiencies: ${results.failedTemplates}`);
  console.log(`-------------------------------------------------------------------------------`);
  console.log(` Tier 1 (Loadability)       : ${results.tierSummary.tier1.passed} Passed / ${results.tierSummary.tier1.failed} Failed (${results.tierSummary.tier1.passedAssertions}/${results.tierSummary.tier1.totalAssertions} assertions)`);
  console.log(` Tier 2 (Zero Mock & Ghost) : ${results.tierSummary.tier2.passed} Passed / ${results.tierSummary.tier2.failed} Failed (${results.tierSummary.tier2.passedAssertions}/${results.tierSummary.tier2.totalAssertions} assertions)`);
  console.log(` Tier 3 (WYSIWYG & Avatar)  : ${results.tierSummary.tier3.passed} Passed / ${results.tierSummary.tier3.failed} Failed (${results.tierSummary.tier3.passedAssertions}/${results.tierSummary.tier3.totalAssertions} assertions)`);
  console.log(` Tier 4 (Print & Bounds)    : ${results.tierSummary.tier4.passed} Passed / ${results.tierSummary.tier4.failed} Failed (${results.tierSummary.tier4.passedAssertions}/${results.tierSummary.tier4.totalAssertions} assertions)`);
  console.log(`-------------------------------------------------------------------------------`);
  console.log(` Total Assertions Evaluated : ${results.totalAssertions}`);
  console.log(` Assertions Passed          : ${results.passedAssertions}`);
  console.log(` Assertions Failed          : ${results.failedAssertions}`);
  console.log(` Success Rate               : ${((results.passedAssertions / results.totalAssertions) * 100).toFixed(1)}%`);
  console.log(`═══════════════════════════════════════════════════════════════════════════════\n`);

  return results;
}

// ─── CLI Entrypoint ────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const quiet = args.includes('--quiet');
  const verbose = !quiet;
  const templateArg = args.find(a => a.startsWith('--template='));
  const template = templateArg ? templateArg.split('=')[1] : null;

  runTemplateCatalogMatrix({ verbose, template })
    .then(results => {
      if (jsonOutput) {
        console.log(JSON.stringify(results, null, 2));
      }
      process.exit(results.failedTemplates === 0 ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}
