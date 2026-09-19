import fs from 'fs';

const sectionAudit = JSON.parse(fs.readFileSync('.agents/explorer_0_2/section_audit.json', 'utf-8'));

console.log('=== SUMMARY UNSANITIZED ===');
console.log(sectionAudit.filter(s => s.summaryUnsanitized).map(s => s.file));

console.log('\n=== PHOTO UNGUARDED ===');
console.log(sectionAudit.filter(s => s.photoUnguarded).map(s => s.file));

console.log('\n=== PROJECTS UNGUARDED ===');
console.log(sectionAudit.filter(s => s.projUnguarded).map(s => s.file));

console.log('\n=== CERTIFICATIONS UNGUARDED ===');
console.log(sectionAudit.filter(s => s.certUnguarded).map(s => s.file));

console.log('\n=== REFERENCES UNGUARDED (First 20) ===');
console.log(sectionAudit.filter(s => s.refUnguarded).map(s => s.file).slice(0, 20));
