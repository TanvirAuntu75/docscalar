const fs = require('fs');
const path = require('path');

const rootDir = path.resolve('.');
const templatesDir = path.join(rootDir, 'src', 'engines', 'utility', 'templates');
const auditFile = path.join(rootDir, '.agents', 'explorer_0_1', 'audit_detailed.json');
const auditData = JSON.parse(fs.readFileSync(auditFile, 'utf8'));

// Check templates using pagination
const paginatedTemplates = auditData.templates.filter(t => t.usesPagination).map(t => t.slug);
console.log('Paginated templates (5):', paginatedTemplates);

// Check templates without avatar
const noAvatarTemplates = auditData.templates.filter(t => !t.avatarDetails.hasAvatar).map(t => t.slug);
console.log('No avatar templates:', noAvatarTemplates);

// Inspect mock data patterns across files
const mockPatterns = {};
for (const t of auditData.templates) {
  const content = fs.readFileSync(path.join(templatesDir, t.file), 'utf8');
  
  // Sample check for fallback name
  const nameMatch = content.match(/data\.(?:name|fullName)\s*\|\|\s*['"]([^'"]+)['"]/);
  const titleMatch = content.match(/data\.(?:title|role|jobTitle)\s*\|\|\s*['"]([^'"]+)['"]/);
  const emailMatch = content.match(/data\.email\s*\|\|\s*['"]([^'"]+)['"]/);
  const phoneMatch = content.match(/data\.phone\s*\|\|\s*['"]([^'"]+)['"]/);
  const summaryMatch = content.match(/data\.summary\s*\|\|\s*['"]([^'"]+)['"]/);

  mockPatterns[t.slug] = {
    nameFallback: nameMatch ? nameMatch[1] : 'NONE',
    titleFallback: titleMatch ? titleMatch[1] : 'NONE',
    emailFallback: emailMatch ? emailMatch[1] : 'NONE',
    phoneFallback: phoneMatch ? phoneMatch[1] : 'NONE',
    hasSummaryFallback: !!summaryMatch,
    mockCount: t.mockFallbacks.length
  };
}

fs.writeFileSync(path.join(rootDir, '.agents', 'explorer_0_1', 'mock_patterns.json'), JSON.stringify(mockPatterns, null, 2));

// Check data-df-field vs data-docforge-field across all templates
let totalDfField = 0;
let totalDocforgeField = 0;
for (const t of auditData.templates) {
  const content = fs.readFileSync(path.join(templatesDir, t.file), 'utf8');
  const df = (content.match(/data-df-field/g) || []).length;
  const dff = (content.match(/data-docforge-field/g) || []).length;
  totalDfField += df;
  totalDocforgeField += dff;
}
console.log('Total data-df-field occurrences:', totalDfField);
console.log('Total data-docforge-field occurrences:', totalDocforgeField);

// Check function signature of each template generator
const signatures = {};
for (const t of auditData.templates) {
  const content = fs.readFileSync(path.join(templatesDir, t.file), 'utf8');
  const sigMatch = content.match(/export\s+(?:const|function)\s+\w+\s*=\s*(?:\([^)]*\)|function[^(]*\([^)]*\))/);
  signatures[t.slug] = sigMatch ? sigMatch[0] : 'UNKNOWN';
}

fs.writeFileSync(path.join(rootDir, '.agents', 'explorer_0_1', 'signatures.json'), JSON.stringify(signatures, null, 2));
console.log('Sample signature:', Object.values(signatures)[0]);
