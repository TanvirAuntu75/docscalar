import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const canonicalPatterns = [
  /^name$/,
  /^title$/,
  /^summary$/,
  /^email$/,
  /^phone$/,
  /^location$/,
  /^website$/,
  /^linkedin$/,
  /^exp:\$\{[^}]+\}:role$/,
  /^exp:\$\{[^}]+\}:company$/,
  /^exp:\$\{[^}]+\}:date$/,
  /^exp:\$\{[^}]+\}:start$/,
  /^exp:\$\{[^}]+\}:end$/,
  /^exp:\$\{[^}]+\}:highlight:\$\{[^}]+\}$/,
  /^edu:\$\{[^}]+\}:degree$/,
  /^edu:\$\{[^}]+\}:school$/,
  /^edu:\$\{[^}]+\}:date$/,
  /^edu:\$\{[^}]+\}:start$/,
  /^edu:\$\{[^}]+\}:end$/,
  /^skill:\$\{[^}]+\}$/,
  /^proj:\$\{[^}]+\}:name$/,
  /^proj:\$\{[^}]+\}:url$/,
  /^proj:\$\{[^}]+\}:description$/,
  /^cert:\$\{[^}]+\}$/,
  /^ref:\$\{[^}]+\}:name$/,
  /^ref:\$\{[^}]+\}:relation$/,
  /^ref:\$\{[^}]+\}:contact$/,
  /^ref:\$\{[^}]+\}:phone$/,
  /^ref:\$\{[^}]+\}:email$/,
  /^custom:\$\{[^}]+\}:\$\{[^}]+\}:title$/,
  /^custom:\$\{[^}]+\}:\$\{[^}]+\}:value$/
];

const report = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
  
  // Extract all data-df-field values
  const rawFields = [];
  const regex = /data-df-field=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    rawFields.push(match[1]);
  }
  
  // Check duplicates in single tags
  const tagDuplicates = [];
  const tagRegex = /<[^>]*data-df-field=["'][^"']*["'][^>]*data-df-field=["'][^"']*["'][^>]*>/g;
  while ((match = tagRegex.exec(content)) !== null) {
    tagDuplicates.push(match[0]);
  }
  
  // Categorize fields
  const hasName = rawFields.includes('name');
  const hasTitle = rawFields.includes('title');
  const hasSummary = rawFields.includes('summary');
  const hasEmail = rawFields.includes('email');
  const hasPhone = rawFields.includes('phone');
  const hasLocation = rawFields.includes('location');
  const hasExp = rawFields.some(f => f.startsWith('exp:'));
  const hasEdu = rawFields.some(f => f.startsWith('edu:'));
  const hasSkill = rawFields.some(f => f.startsWith('skill:'));
  const hasProj = rawFields.some(f => f.startsWith('proj:'));
  const hasCert = rawFields.some(f => f.startsWith('cert:'));
  const hasRef = rawFields.some(f => f.startsWith('ref:'));
  const hasCustom = rawFields.some(f => f.startsWith('custom:'));
  
  // Non-canonical patterns
  const nonCanonical = rawFields.filter(f => {
    return !canonicalPatterns.some(p => p.test(f));
  });

  report.push({
    file,
    totalFieldTags: rawFields.length,
    tagDuplicatesCount: tagDuplicates.length,
    hasName,
    hasTitle,
    hasSummary,
    hasEmail,
    hasPhone,
    hasLocation,
    hasExp,
    hasEdu,
    hasSkill,
    hasProj,
    hasCert,
    hasRef,
    hasCustom,
    nonCanonical
  });
}

console.log(`\n--- DATA-DF-FIELD TAXONOMY AUDIT (${report.length} templates) ---`);
console.log(`Templates with name stamped: ${report.filter(r => r.hasName).length} / ${report.length}`);
console.log(`Templates with title stamped: ${report.filter(r => r.hasTitle).length} / ${report.length}`);
console.log(`Templates with summary stamped: ${report.filter(r => r.hasSummary).length} / ${report.length}`);
console.log(`Templates with email stamped: ${report.filter(r => r.hasEmail).length} / ${report.length}`);
console.log(`Templates with phone stamped: ${report.filter(r => r.hasPhone).length} / ${report.length}`);
console.log(`Templates with location stamped: ${report.filter(r => r.hasLocation).length} / ${report.length}`);
console.log(`Templates with experience stamped: ${report.filter(r => r.hasExp).length} / ${report.length}`);
console.log(`Templates with education stamped: ${report.filter(r => r.hasEdu).length} / ${report.length}`);
console.log(`Templates with skills stamped: ${report.filter(r => r.hasSkill).length} / ${report.length}`);
console.log(`Templates with projects stamped: ${report.filter(r => r.hasProj).length} / ${report.length}`);
console.log(`Templates with certs stamped: ${report.filter(r => r.hasCert).length} / ${report.length}`);
console.log(`Templates with references stamped: ${report.filter(r => r.hasRef).length} / ${report.length}`);
console.log(`Templates with custom sections stamped: ${report.filter(r => r.hasCustom).length} / ${report.length}`);
console.log(`Templates with duplicate tag stamps: ${report.filter(r => r.tagDuplicatesCount > 0).length} / ${report.length}`);

fs.writeFileSync('.agents/explorer_0_3/attribute_stamping_report.json', JSON.stringify(report, null, 2));
