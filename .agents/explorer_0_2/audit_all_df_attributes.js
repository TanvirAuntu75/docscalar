import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const detailedFieldAudit = [];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const code = fs.readFileSync(filePath, 'utf-8');

  // Find all data-df-field references
  const matches = [...code.matchAll(/data-df-field=["']([^"']+)["']/g)].map(m => m[1]);

  const audit = {
    file,
    hasName: matches.includes('name'),
    hasTitle: matches.includes('title'),
    hasSummary: matches.includes('summary') || matches.includes('profile'),
    hasPhone: matches.includes('phone'),
    hasEmail: matches.includes('email'),
    hasLocation: matches.includes('location') || matches.includes('address'),
    hasWebsite: matches.includes('website'),
    hasLinkedin: matches.includes('linkedin'),
    hasExpRole: matches.some(m => m.includes('exp:') && m.includes(':role')),
    hasExpCompany: matches.some(m => m.includes('exp:') && m.includes(':company')),
    hasExpDate: matches.some(m => m.includes('exp:') && (m.includes(':date') || m.includes(':start'))),
    hasExpHighlight: matches.some(m => m.includes('exp:') && m.includes(':highlight')),
    hasEduDegree: matches.some(m => m.includes('edu:') && m.includes(':degree')),
    hasEduSchool: matches.some(m => m.includes('edu:') && m.includes(':school')),
    hasEduDate: matches.some(m => m.includes('edu:') && (m.includes(':date') || m.includes(':start'))),
    hasSkills: matches.some(m => m.startsWith('skill:')),
    hasProjName: matches.some(m => m.includes('proj:') && (m.includes(':name') || m.includes(':title'))),
    hasProjDesc: matches.some(m => m.includes('proj:') && m.includes(':description')),
    hasProjUrl: matches.some(m => m.includes('proj:') && m.includes(':url')),
    hasCert: matches.some(m => m.startsWith('cert:')),
    hasRefName: matches.some(m => m.includes('ref:') && m.includes(':name')),
    hasRefRel: matches.some(m => m.includes('ref:') && m.includes(':relation')),
    hasRefContact: matches.some(m => m.includes('ref:') && (m.includes(':contact') || m.includes(':phone') || m.includes(':email'))),
    hasCustom: matches.some(m => m.startsWith('custom:'))
  };

  detailedFieldAudit.push(audit);
}

fs.writeFileSync('.agents/explorer_0_2/detailed_field_audit.json', JSON.stringify(detailedFieldAudit, null, 2));

const total = detailedFieldAudit.length;
console.log('=== DATA-DF-FIELD AUDIT ACROSS ALL 85 TEMPLATES ===');
console.log(`Missing Name: ${detailedFieldAudit.filter(a => !a.hasName).length} / ${total}`);
console.log(`Missing Title: ${detailedFieldAudit.filter(a => !a.hasTitle).length} / ${total}`);
console.log(`Missing Summary: ${detailedFieldAudit.filter(a => !a.hasSummary).length} / ${total}`);
console.log(`Missing Phone: ${detailedFieldAudit.filter(a => !a.hasPhone).length} / ${total}`);
console.log(`Missing Email: ${detailedFieldAudit.filter(a => !a.hasEmail).length} / ${total}`);
console.log(`Missing Location: ${detailedFieldAudit.filter(a => !a.hasLocation).length} / ${total}`);
console.log(`Missing Website: ${detailedFieldAudit.filter(a => !a.hasWebsite).length} / ${total}`);
console.log(`Missing LinkedIn: ${detailedFieldAudit.filter(a => !a.hasLinkedin).length} / ${total}`);
console.log(`Missing Exp Role: ${detailedFieldAudit.filter(a => !a.hasExpRole).length} / ${total}`);
console.log(`Missing Exp Company: ${detailedFieldAudit.filter(a => !a.hasExpCompany).length} / ${total}`);
console.log(`Missing Exp Date: ${detailedFieldAudit.filter(a => !a.hasExpDate).length} / ${total}`);
console.log(`Missing Exp Highlight: ${detailedFieldAudit.filter(a => !a.hasExpHighlight).length} / ${total}`);
console.log(`Missing Edu Degree: ${detailedFieldAudit.filter(a => !a.hasEduDegree).length} / ${total}`);
console.log(`Missing Edu School: ${detailedFieldAudit.filter(a => !a.hasEduSchool).length} / ${total}`);
console.log(`Missing Edu Date: ${detailedFieldAudit.filter(a => !a.hasEduDate).length} / ${total}`);
console.log(`Missing Skills: ${detailedFieldAudit.filter(a => !a.hasSkills).length} / ${total}`);
console.log(`Missing Proj Name: ${detailedFieldAudit.filter(a => !a.hasProjName).length} / ${total}`);
console.log(`Missing Proj Desc: ${detailedFieldAudit.filter(a => !a.hasProjDesc).length} / ${total}`);
console.log(`Missing Proj Url: ${detailedFieldAudit.filter(a => !a.hasProjUrl).length} / ${total}`);
console.log(`Missing Cert: ${detailedFieldAudit.filter(a => !a.hasCert).length} / ${total}`);
console.log(`Missing Ref Name: ${detailedFieldAudit.filter(a => !a.hasRefName).length} / ${total}`);
console.log(`Missing Ref Relation: ${detailedFieldAudit.filter(a => !a.hasRefRel).length} / ${total}`);
console.log(`Missing Ref Contact: ${detailedFieldAudit.filter(a => !a.hasRefContact).length} / ${total}`);
console.log(`Missing Custom: ${detailedFieldAudit.filter(a => !a.hasCustom).length} / ${total}`);
