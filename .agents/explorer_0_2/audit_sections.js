import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const sectionAudit = [];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const code = fs.readFileSync(filePath, 'utf-8');

  // Check how each section wrapper is guarded
  const checks = {
    file,
    // Name
    nameUnsanitized: code.includes("data.name || '") || code.includes('data.name || "') || code.includes('nameParts[0] || \''),
    // Title
    titleUnsanitized: code.includes("data.title || '") || code.includes('data.title || "'),
    // Summary
    summaryUnsanitized: code.includes("data.summary || '") || code.includes('data.summary || "') || code.includes("data.profile || '"),
    summaryUnguarded: !code.includes('data.summary ?') && !code.includes('summaryText ?') && !code.includes('data.summary &&'),
    // Contact
    contactUnguarded: !code.includes('(data.phone || data.email || data.location') && !code.includes('(phoneText || emailText || locationText'),
    // Education
    eduUnguarded: !code.includes('data.education && data.education.length') && !code.includes('data.education?.length') && !code.includes('educationList.length'),
    // Skills
    skillsUnguarded: !code.includes('data.skills && data.skills.length') && !code.includes('data.skills?.length') && !code.includes('skillsList.length'),
    // Experience
    expUnguarded: !code.includes('data.experience && data.experience.length') && !code.includes('data.experience?.length') && !code.includes('partitions.experience'),
    // Projects
    projUnguarded: !code.includes('data.projects && data.projects.length') && !code.includes('data.projects?.length') && !code.includes('partitions.projects'),
    // Certifications
    certUnguarded: !code.includes('data.certifications && data.certifications.length') && !code.includes('data.certifications?.length') && !code.includes('partitions.certifications'),
    // References
    refUnguarded: !code.includes('data.references && data.references.length') && !code.includes('data.references?.length') && !code.includes('partitions.references'),
    // Languages / Custom
    langUnguarded: !code.includes('langSection &&') && !code.includes('custom_languages &&') && !code.includes('customSections?.length'),
    // Photo
    photoUnguarded: !code.includes('data.photoUrl ?') && !code.includes('photoSrc ?') && !code.includes('data.photoUrl &&')
  };

  sectionAudit.push(checks);
}

fs.writeFileSync('.agents/explorer_0_2/section_audit.json', JSON.stringify(sectionAudit, null, 2));

console.log('Section Audit Summary:');
console.log(`Name Unsanitized (hardcoded fallback): ${sectionAudit.filter(s => s.nameUnsanitized).length} / ${sectionAudit.length}`);
console.log(`Title Unsanitized: ${sectionAudit.filter(s => s.titleUnsanitized).length} / ${sectionAudit.length}`);
console.log(`Summary Unsanitized: ${sectionAudit.filter(s => s.summaryUnsanitized).length} / ${sectionAudit.length}`);
console.log(`Summary Unguarded (empty summary box): ${sectionAudit.filter(s => s.summaryUnguarded).length} / ${sectionAudit.length}`);
console.log(`Contact Unguarded (empty contact box): ${sectionAudit.filter(s => s.contactUnguarded).length} / ${sectionAudit.length}`);
console.log(`Photo Unguarded (broken img tag): ${sectionAudit.filter(s => s.photoUnguarded).length} / ${sectionAudit.length}`);
console.log(`Education Unguarded: ${sectionAudit.filter(s => s.eduUnguarded).length} / ${sectionAudit.length}`);
console.log(`Skills Unguarded: ${sectionAudit.filter(s => s.skillsUnguarded).length} / ${sectionAudit.length}`);
console.log(`Experience Unguarded: ${sectionAudit.filter(s => s.expUnguarded).length} / ${sectionAudit.length}`);
console.log(`Projects Unguarded: ${sectionAudit.filter(s => s.projUnguarded).length} / ${sectionAudit.length}`);
console.log(`Certifications Unguarded: ${sectionAudit.filter(s => s.certUnguarded).length} / ${sectionAudit.length}`);
console.log(`References Unguarded: ${sectionAudit.filter(s => s.refUnguarded).length} / ${sectionAudit.length}`);
