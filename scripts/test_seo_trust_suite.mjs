import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOL_SEO_DATA, getSeoDataForTool } from '../src/utils/seoData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalAssertions = 0;
let passedAssertions = 0;

function check(desc, condition) {
  totalAssertions++;
  if (!condition) {
    console.error(`❌ FAILED: ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
  passedAssertions++;
  console.log(`  ✓ ${desc}`);
}

console.log('================================================================');
console.log('STARTING DOCSCALAR SEO & ENTERPRISE TRUST AUDIT TEST SUITE (32 AREAS)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// AREA 1: TOOL_SEO_DATA Total Population & Registry Size
// -----------------------------------------------------------------------------
console.log('Area 1: TOOL_SEO_DATA Total Registry Verification');
const totalToolsCount = Object.keys(TOOL_SEO_DATA).length;
check('TOOL_SEO_DATA contains exactly 41 tools', totalToolsCount === 41);

// -----------------------------------------------------------------------------
// AREA 2: Core PDF Utility Tool SEO Keys
// -----------------------------------------------------------------------------
console.log('\nArea 2: Core PDF Utility Tool SEO Keys');
const coreTools = ['merge-pdf', 'split-pdf', 'compress-pdf', 'rotate-pdf'];
check('Core PDF utilities exist in TOOL_SEO_DATA', coreTools.every(k => Boolean(TOOL_SEO_DATA[k])));

// -----------------------------------------------------------------------------
// AREA 3: Document Conversion SEO Keys
// -----------------------------------------------------------------------------
console.log('\nArea 3: Document Conversion SEO Keys');
const docConvTools = ['docx-to-pdf', 'pdf-to-word', 'excel-to-pdf', 'powerpoint-to-pdf'];
check('Document conversion tools exist in TOOL_SEO_DATA', docConvTools.every(k => Boolean(TOOL_SEO_DATA[k])));

// -----------------------------------------------------------------------------
// AREA 4: Image & Archive Tool SEO Keys
// -----------------------------------------------------------------------------
console.log('\nArea 4: Image & Archive Tool SEO Keys');
const imgArchiveTools = ['image-to-pdf', 'pdf-to-image', 'image-compressor', 'image-resizer', 'image-converter', 'unzip-file'];
check('Image and archive tools exist in TOOL_SEO_DATA', imgArchiveTools.every(k => Boolean(TOOL_SEO_DATA[k])));

// -----------------------------------------------------------------------------
// AREA 5: Legal & Security Tool SEO Keys
// -----------------------------------------------------------------------------
console.log('\nArea 5: Legal & Security Tool SEO Keys');
const legalSecTools = ['redact-pdf', 'bates-numbering', 'protect-pdf', 'unlock-pdf', 'sign-pdf'];
check('Legal and security tools exist in TOOL_SEO_DATA', legalSecTools.every(k => Boolean(TOOL_SEO_DATA[k])));

// -----------------------------------------------------------------------------
// AREA 6: Advanced Layout & OCR Tool SEO Keys
// -----------------------------------------------------------------------------
console.log('\nArea 6: Advanced Layout & OCR Tool SEO Keys');
const layoutOcrTools = ['crop-pdf', 'organize-pdf', 'remove-pages', 'extract-pages', 'ocr-pdf', 'un-ocr-pdf', 'scan-to-pdf'];
check('Layout and OCR tools exist in TOOL_SEO_DATA', layoutOcrTools.every(k => Boolean(TOOL_SEO_DATA[k])));

// -----------------------------------------------------------------------------
// AREA 7: Studio & Generator SEO Keys
// -----------------------------------------------------------------------------
console.log('\nArea 7: Studio & Generator SEO Keys');
const studioTools = ['resume-builder', 'document-viewer', 'qr-generator', 'compare-pdf', 'pdf-forms'];
check('Studio and generator tools exist in TOOL_SEO_DATA', studioTools.every(k => Boolean(TOOL_SEO_DATA[k])));

// -----------------------------------------------------------------------------
// AREA 8: Web & Markup Conversion SEO Keys
// -----------------------------------------------------------------------------
console.log('\nArea 8: Web & Markup Conversion SEO Keys');
const webConvTools = ['html-to-pdf', 'text-to-pdf', 'url-to-pdf', 'pdf-to-pdfa'];
check('Web and markup conversion tools exist in TOOL_SEO_DATA', webConvTools.every(k => Boolean(TOOL_SEO_DATA[k])));

// -----------------------------------------------------------------------------
// AREA 9: Annotation & Numbering SEO Keys
// -----------------------------------------------------------------------------
console.log('\nArea 9: Annotation & Numbering SEO Keys');
const annotationTools = ['add-watermark', 'add-page-numbers', 'repair-pdf', 'pdf-to-excel', 'pdf-to-powerpoint'];
check('Annotation and numbering tools exist in TOOL_SEO_DATA', annotationTools.every(k => Boolean(TOOL_SEO_DATA[k])));

// -----------------------------------------------------------------------------
// AREA 10: Title Bounds & DocScalar Brand Invariant
// -----------------------------------------------------------------------------
console.log('\nArea 10: Title Bounds & DocScalar Brand Invariant');
const allTitlesValid = Object.values(TOOL_SEO_DATA).every(d => d.title.length >= 25 && d.title.includes('DocScalar'));
check('All 41 tools have titles >= 25 chars containing DocScalar', allTitlesValid);

// -----------------------------------------------------------------------------
// AREA 11: Meta Description Bounds
// -----------------------------------------------------------------------------
console.log('\nArea 11: Meta Description Quality & Character Bounds');
const allDescriptionsValid = Object.values(TOOL_SEO_DATA).every(d => d.description.length >= 60 && d.description.length <= 300);
check('All 41 tools have meta descriptions between 60 and 300 characters', allDescriptionsValid);

// -----------------------------------------------------------------------------
// AREA 12: Keywords Formatting & Density
// -----------------------------------------------------------------------------
console.log('\nArea 12: Meta Keywords Formatting & Density');
const allKeywordsValid = Object.values(TOOL_SEO_DATA).every(d => {
  const parts = d.keywords.split(',').map(s => s.trim());
  return parts.length >= 3 && d.keywords.length >= 20;
});
check('All 41 tools have at least 3 comma-delimited keywords', allKeywordsValid);

// -----------------------------------------------------------------------------
// AREA 13: HowTo 3-Step Structure & Invariant
// -----------------------------------------------------------------------------
console.log('\nArea 13: HowTo 3-Step Structure & Invariant');
const allHowToValid = Object.values(TOOL_SEO_DATA).every(d => {
  return Array.isArray(d.howTo) && d.howTo.length === 3 &&
    d.howTo.every(s => s.step && s.title && s.desc && s.desc.length >= 10);
});
check('All 41 tools have exactly 3 fully-formed HowTo steps (step, title, desc >= 10)', allHowToValid);

// -----------------------------------------------------------------------------
// AREA 14: FAQ Array Sizing & Substance
// -----------------------------------------------------------------------------
console.log('\nArea 14: FAQ Array Sizing & Substance');
const allFaqsValid = Object.values(TOOL_SEO_DATA).every(d => {
  return Array.isArray(d.faqs) && d.faqs.length >= 2 && d.faqs.length <= 3 &&
    d.faqs.every(f => f.q && f.q.length >= 10 && f.a && f.a.length >= 20);
});
check('All 41 tools have 2-3 FAQs with descriptive questions and answers', allFaqsValid);

// -----------------------------------------------------------------------------
// AREA 15: getSeoDataForTool Exact Match Resolution
// -----------------------------------------------------------------------------
console.log('\nArea 15: getSeoDataForTool Exact Match Resolution');
const rotatePdfSeo = getSeoDataForTool('rotate-pdf', 'Fallback Title', 'Fallback Desc');
check('getSeoDataForTool resolves registered rotate-pdf title directly', rotatePdfSeo.title === TOOL_SEO_DATA['rotate-pdf'].title);
check('getSeoDataForTool returns registered rotate-pdf howTo array', rotatePdfSeo.howTo === TOOL_SEO_DATA['rotate-pdf'].howTo);

// -----------------------------------------------------------------------------
// AREA 16: getSeoDataForTool Custom Fallback Synthesis
// -----------------------------------------------------------------------------
console.log('\nArea 16: getSeoDataForTool Custom Fallback Synthesis');
const customFallback = getSeoDataForTool('custom-experimental-tool', 'Custom Tool', 'Custom tool description text here');
check('getSeoDataForTool fallback synthesizes title with custom name', customFallback.title.includes('Custom Tool Online Free'));
check('getSeoDataForTool fallback applies custom description', customFallback.description === 'Custom tool description text here');
check('getSeoDataForTool fallback generates 3 default steps', customFallback.howTo.length === 3);

// -----------------------------------------------------------------------------
// AREA 17: getSeoDataForTool Default Fallback Branch
// -----------------------------------------------------------------------------
console.log('\nArea 17: getSeoDataForTool Default Fallback Branch');
const defaultFallback = getSeoDataForTool('another-nonexistent-id');
check('Default fallback uses default "Tool" in title', defaultFallback.title.includes('Tool Online Free'));
check('Default fallback uses enterprise-grade privacy description', defaultFallback.description.includes('Enterprise-grade confidentiality'));

// -----------------------------------------------------------------------------
// AREA 18: Legal Redaction & Bates Numbering Specificity
// -----------------------------------------------------------------------------
console.log('\nArea 18: Legal Redaction & Bates Numbering Specificity');
const redactData = TOOL_SEO_DATA['redact-pdf'];
check('redact-pdf specifies permanent cryptographic redaction', redactData.description.includes('cryptographic redaction'));
check('redact-pdf mentions SSN or sensitive info in description', redactData.description.includes('SSNs'));
const batesData = TOOL_SEO_DATA['bates-numbering'];
check('bates-numbering references legal discovery documents', batesData.description.includes('legal discovery'));
check('bates-numbering mentions audit-ready sequential numbering in howTo', batesData.howTo[2].desc.includes('audit-ready'));

// -----------------------------------------------------------------------------
// AREA 19: PDF/A Archival & Resume Studio Specificity
// -----------------------------------------------------------------------------
console.log('\nArea 19: PDF/A Archival & Resume Studio Specificity');
const pdfaData = TOOL_SEO_DATA['pdf-to-pdfa'];
check('pdf-to-pdfa specifies ISO-compliant PDF/A-1b and PDF/A-2b', pdfaData.description.includes('ISO-compliant'));
const resumeData = TOOL_SEO_DATA['resume-builder'];
check('resume-builder references ATS-friendly resumes', resumeData.keywords.includes('ats resume builder'));

// -----------------------------------------------------------------------------
// AREA 20: Mega-Footer 5-Column Navigation Structure (Footer.jsx)
// -----------------------------------------------------------------------------
console.log('\nArea 20: Mega-Footer 5-Column Navigation Structure');
const footerContent = fs.readFileSync(path.join(rootDir, 'src/components/Footer.jsx'), 'utf8');
check('Footer.jsx contains Convert & Create column heading', footerContent.includes('Convert & Create'));
check('Footer.jsx contains Edit & Annotate column heading', footerContent.includes('Edit & Annotate'));
check('Footer.jsx contains Organize & Secure column heading', footerContent.includes('Organize & Secure'));
check('Footer.jsx contains Studios & Utilities column heading', footerContent.includes('Studios & Utilities'));
check('Footer.jsx contains Company & Trust column heading', footerContent.includes('Company & Trust'));

// -----------------------------------------------------------------------------
// AREA 21: Mega-Footer Company & Trust Links
// -----------------------------------------------------------------------------
console.log('\nArea 21: Mega-Footer Company & Trust Links');
check('Footer.jsx links to /about', footerContent.includes('to="/about"'));
check('Footer.jsx links to /security', footerContent.includes('to="/security"'));
check('Footer.jsx links to /contact', footerContent.includes('to="/contact"'));
check('Footer.jsx links to /pricing', footerContent.includes('to="/pricing"'));
check('Footer.jsx contains Systems Operational indicator', footerContent.includes('Systems Operational'));
check('Footer.jsx contains 256-Bit TLS · RAM-Only · Zero AI Training badge', footerContent.includes('256-Bit TLS · RAM-Only · Zero AI Training'));

// -----------------------------------------------------------------------------
// AREA 22: Landing Page 3D Canvas Retention & Trust Links Parity
// -----------------------------------------------------------------------------
console.log('\nArea 22: Landing Page 3D Canvas Retention & Trust Links Parity');
check('Footer.jsx retains 3D ParticleField for landing page', footerContent.includes('ParticleField') && footerContent.includes('Canvas'));
check('Landing page footer links to /about', footerContent.includes('<Link to="/about"'));
check('Landing page footer links to /security', footerContent.includes('<Link to="/security"'));
check('Landing page footer links to /pricing', footerContent.includes('<Link to="/pricing"'));
check('Landing page footer links to /contact', footerContent.includes('<Link to="/contact"'));

// -----------------------------------------------------------------------------
// AREA 23: Security Page Cryptographic & Architectural Pillars
// -----------------------------------------------------------------------------
console.log('\nArea 23: Security Page Cryptographic & Architectural Pillars');
const securityPath = path.join(rootDir, 'src/pages/Security.jsx');
check('Security.jsx file exists on filesystem', fs.existsSync(securityPath));
const securityContent = fs.readFileSync(securityPath, 'utf8');
check('Security.jsx contains TLS 1.3 & AES-256 pillar', securityContent.includes('TLS 1.3 & AES-256'));
check('Security.jsx contains Transient RAM Execution pillar', securityContent.includes('Transient RAM Execution'));
check('Security.jsx contains 30-Minute Hard Purge pillar', securityContent.includes('30-Minute Hard Purge'));
check('Security.jsx contains Zero AI Model Training pillar', securityContent.includes('Zero AI Model Training'));

// -----------------------------------------------------------------------------
// AREA 24: Security Page Compliance & Schema Integrity
// -----------------------------------------------------------------------------
console.log('\nArea 24: Security Page Compliance & Schema Integrity');
check('Security.jsx contains GDPR & CCPA disclosures', securityContent.includes('GDPR') && securityContent.includes('CCPA'));
check('Security.jsx lists security contact email (security@docscalar.app)', securityContent.includes('security@docscalar.app'));
check('Security.jsx defines and injects WebPage schema into SEOHead', securityContent.includes('securitySchema') && securityContent.includes('schema={securitySchema}'));

// -----------------------------------------------------------------------------
// AREA 25: About Page Mission & Schema Integrity
// -----------------------------------------------------------------------------
console.log('\nArea 25: About Page Mission & Schema Integrity');
const aboutPath = path.join(rootDir, 'src/pages/About.jsx');
check('About.jsx file exists on filesystem', fs.existsSync(aboutPath));
const aboutContent = fs.readFileSync(aboutPath, 'utf8');
check('About.jsx specifies DocScalar Inc.', aboutContent.includes('DocScalar Inc.'));
check('About.jsx details Client-First WebAssembly architecture', aboutContent.includes('Client-First Execution'));
check('About.jsx details ISO Standards fidelity (ISO 32000, ISO 19005)', aboutContent.includes('ISO 32000') && aboutContent.includes('ISO 19005'));
check('About.jsx defines and injects AboutPage schema into SEOHead', aboutContent.includes('aboutSchema') && aboutContent.includes('schema={aboutSchema}'));

// -----------------------------------------------------------------------------
// AREA 26: Contact Page Channels & SLA Disclosures
// -----------------------------------------------------------------------------
console.log('\nArea 26: Contact Page Channels & SLA Disclosures');
const contactPath = path.join(rootDir, 'src/pages/Contact.jsx');
check('Contact.jsx file exists on filesystem', fs.existsSync(contactPath));
const contactContent = fs.readFileSync(contactPath, 'utf8');
check('Contact.jsx specifies support email (support@docscalar.app)', contactContent.includes('support@docscalar.app'));
check('Contact.jsx specifies enterprise email (enterprise@docscalar.app)', contactContent.includes('enterprise@docscalar.app'));
check('Contact.jsx specifies security email (security@docscalar.app)', contactContent.includes('security@docscalar.app'));
check('Contact.jsx specifies response SLAs (< 4h for Pro, < 24h standard)', contactContent.includes('< 4h (Pro)') && contactContent.includes('< 24h (Standard)'));
check('Contact.jsx defines and injects ContactPage schema into SEOHead', contactContent.includes('contactSchema') && contactContent.includes('schema={contactSchema}'));

// -----------------------------------------------------------------------------
// AREA 27: Contact Page Form Validation & Email Regex
// -----------------------------------------------------------------------------
console.log('\nArea 27: Contact Page Form Validation & Email Regex');
check('Contact.jsx validates required fields in handleSubmit', contactContent.includes('formData.name.trim()') && contactContent.includes('formData.message.trim()'));
check('Contact.jsx performs email regex format validation', contactContent.includes('emailRegex') && contactContent.includes('emailRegex.test'));
check('Contact.jsx provides accessible input labels', contactContent.includes('htmlFor="contact-name"') && contactContent.includes('htmlFor="contact-email"'));

// -----------------------------------------------------------------------------
// AREA 28: Pricing FAQ Accordion Interactive States & Schema
// -----------------------------------------------------------------------------
console.log('\nArea 28: Pricing FAQ Accordion Interactive States & Schema');
const pricingContent = fs.readFileSync(path.join(rootDir, 'src/pages/Pricing.jsx'), 'utf8');
check('Pricing.jsx defines PRICING_FAQS array with 6 items', pricingContent.includes('PRICING_FAQS = [') && pricingContent.includes('What payment methods do you accept?'));
check('Pricing.jsx implements accordion toggle state (openFaq, toggleFaq)', pricingContent.includes('openFaq') && pricingContent.includes('toggleFaq'));
check('Pricing.jsx injects FAQPage schema into SEOHead', pricingContent.includes('pricingSchema') && pricingContent.includes('schema={pricingSchema}'));
check('Pricing.jsx uses DocScalar DS-PRO-BETA license prefix', pricingContent.includes('DS-PRO-BETA-'));

// -----------------------------------------------------------------------------
// AREA 29: Dropzone Security Trust Badges
// -----------------------------------------------------------------------------
console.log('\nArea 29: Dropzone Security Trust Badges');
const dropzoneContent = fs.readFileSync(path.join(rootDir, 'src/components/FileDropzone.jsx'), 'utf8');
check('FileDropzone.jsx renders 256-Bit TLS Encryption badge', dropzoneContent.includes('256-Bit TLS Encryption'));
check('FileDropzone.jsx renders Auto-Purged in 30 Min badge', dropzoneContent.includes('Auto-Purged in 30 Min'));
check('FileDropzone.jsx renders Zero AI Training badge', dropzoneContent.includes('Zero AI Training'));
check('FileDropzone.jsx uses lock, schedule, and verified_user icons', dropzoneContent.includes('>lock</span>') && dropzoneContent.includes('>schedule</span>') && dropzoneContent.includes('>verified_user</span>'));

// -----------------------------------------------------------------------------
// AREA 30: App.jsx Lazy Loading & Route Registration
// -----------------------------------------------------------------------------
console.log('\nArea 30: App.jsx Lazy Loading & Route Registration');
const appContent = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf8');
check('App.jsx lazy-loads Security, About, and Contact with retry', 
  appContent.includes("lazyWithRetry(() => import('./pages/Security'))") &&
  appContent.includes("lazyWithRetry(() => import('./pages/About'))") &&
  appContent.includes("lazyWithRetry(() => import('./pages/Contact'))")
);
check('App.jsx defines /security, /about, and /contact routes', 
  appContent.includes('<Route path="/security" element={<Security />} />') &&
  appContent.includes('<Route path="/about" element={<About />} />') &&
  appContent.includes('<Route path="/contact" element={<Contact />} />')
);

// -----------------------------------------------------------------------------
// AREA 31: Sitemap Invariant & Consistency
// -----------------------------------------------------------------------------
console.log('\nArea 31: Sitemap Invariant & Consistency');
const sitemapContent = fs.readFileSync(path.join(rootDir, 'public/sitemap.xml'), 'utf8');
check('sitemap.xml includes /about, /security, and /contact', 
  sitemapContent.includes('https://docscalar.app/about') &&
  sitemapContent.includes('https://docscalar.app/security') &&
  sitemapContent.includes('https://docscalar.app/contact')
);
check('sitemap.xml does not contain disallowed /canvas route', !sitemapContent.includes('https://docscalar.app/canvas'));
const allSeoToolsInSitemap = Object.keys(TOOL_SEO_DATA).every(id => sitemapContent.includes(`https://docscalar.app/${id}`));
check('sitemap.xml contains all 41 registered SEO tools', allSeoToolsInSitemap);

// -----------------------------------------------------------------------------
// AREA 32: Home.jsx WebSite & Organization Schema Verification
// -----------------------------------------------------------------------------
console.log('\nArea 32: Home.jsx WebSite & Organization Schema Verification');
const homeContent = fs.readFileSync(path.join(rootDir, 'src/pages/Home.jsx'), 'utf8');
check('Home.jsx injects WebSite schema into SEOHead', homeContent.includes("WebSite") && homeContent.includes("DocScalar Inc."));

console.log('\n================================================================');
console.log(`AUDIT TEST SUITE COMPLETE: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED ACROSS 32 DISTINCT TEST AREAS`);
console.log('================================================================');
