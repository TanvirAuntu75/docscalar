import fs from 'fs';
import path from 'path';

const fullAudit = JSON.parse(fs.readFileSync('.agents/explorer_0_2/full_audit_report.json', 'utf-8'));

console.log('=== TEMPLATES USING computeTwoPagePartition ===');
const withPagination = fullAudit.filter(r => r.pagination.usesComputePartition);
console.log(withPagination.map(r => `${r.file} (${r.fnName})`));

console.log('\n=== TEMPLATES RENDERING GHOST/EMPTY HEADERS ON EMPTY PAYLOAD ===');
const ghostHeaders = fullAudit.filter(r => r.emptyRendering.emptyHeadersCount > 0);
console.log(`Count: ${ghostHeaders.length}`);
ghostHeaders.slice(0, 10).forEach(g => {
  console.log(`- ${g.file}: headers=${g.emptyRendering.emptyHeadersSample.join(', ')}`);
});

console.log('\n=== TEMPLATES MISSING SKILL DATA-DF-FIELD ===');
const missingSkills = fullAudit.filter(r => !r.dfFields.hasDfSkills);
console.log(`Count: ${missingSkills.length}`);
console.log(missingSkills.map(m => m.file).slice(0, 15));

console.log('\n=== TEMPLATES MISSING AVATAR-MASK ===');
const missingAvatarMask = fullAudit.filter(r => !r.avatar.hasAvatarMaskDiv);
console.log(`Count: ${missingAvatarMask.length}`);

console.log('\n=== ALL MOCK NAME FALLBACK EXPRESSIONS ACROSS 85 TEMPLATES ===');
const nameFallbacksMap = {};
fullAudit.forEach(r => {
  if (r.fallbacks.nameFallbacks.length > 0) {
    nameFallbacksMap[r.file] = r.fallbacks.nameFallbacks;
  }
});
console.log(nameFallbacksMap);
