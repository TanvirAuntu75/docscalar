const fs = require('fs');
const path = require('path');

const rootDir = path.resolve('.');
const templatesDir = path.join(rootDir, 'src', 'engines', 'utility', 'templates');
const resumeTemplatesFile = path.join(rootDir, 'src', 'engines', 'utility', 'resumeTemplates.js');
const resumeBuilderFile = path.join(rootDir, 'src', 'pages', 'utility', 'ResumeBuilder.jsx');

const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));
const resumeTemplatesContent = fs.readFileSync(resumeTemplatesFile, 'utf8');
const resumeBuilderContent = fs.readFileSync(resumeBuilderFile, 'utf8');

// Parse resumeTemplates.js exports
const exportedInIndex = {};
const exportRegex = /export\s+\{\s*(\w+)\s*\}\s+from\s+['"]\.\/templates\/(\w+)['"]/g;
let match;
while ((match = exportRegex.exec(resumeTemplatesContent)) !== null) {
  exportedInIndex[match[2]] = match[1];
}

// Parse TEMPLATE_MAP in ResumeBuilder.jsx
const templateMap = {};
const mapLines = resumeBuilderContent.split('\n');
let insideMap = false;
for (const line of mapLines) {
  if (line.includes('const TEMPLATE_MAP = {')) {
    insideMap = true;
    continue;
  }
  if (insideMap) {
    if (line.trim().startsWith('};')) {
      insideMap = false;
      break;
    }
    // format: slug : { label: '...', fn: ..., badge: '...', photoUrl: '...', candidateName: '...' }
    const m = line.match(/^\s*(\w+)\s*:\s*\{\s*label:\s*['"]([^'"]+)['"],\s*fn:\s*(\w+),\s*badge:\s*['"]([^'"]+)['"],\s*photoUrl:\s*['"]([^'"]+)['"],\s*candidateName:\s*['"]([^'"]+)['"]/);
    if (m) {
      templateMap[m[1]] = {
        slug: m[1],
        label: m[2],
        fn: m[3],
        badge: m[4],
        photoUrl: m[5],
        candidateName: m[6]
      };
    }
  }
}

const detailedAudit = [];

for (const file of files) {
  const slug = file.replace('.js', '');
  const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
  
  const exportMatch = content.match(/export (?:const|function) (\w+)/);
  const exportName = exportMatch ? exportMatch[1] : 'MISSING';
  
  const mapEntry = templateMap[slug] || null;
  const isExportedInIndex = !!exportedInIndex[slug];
  
  // Check mock data in code
  const mockFallbacks = [];
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('||')) {
      // Look for default mock string values assigned to fields
      if (/(?:name|role|company|title|email|phone|location|summary|degree|school|highlight|website|linkedin)\s*\|\|\s*['"][^'"]{2,}['"]/i.test(l)) {
        // Exclude empty string fallbacks or CSS / layout helpers like || '' or || 'none'
        if (!/\|\|\s*['"](?:|none|inherit|transparent|sans-serif|serif|#\w+)['"]/i.test(l)) {
          mockFallbacks.push({ line: idx + 1, code: l.trim() });
        }
      }
    }
  });

  // Check data-df-field or data-docforge-field stamping
  const dfFields = [];
  const fieldRegex = /data-(?:df-field|docforge-field)=['"]([^'"]+)['"]/g;
  let fMatch;
  while ((fMatch = fieldRegex.exec(content)) !== null) {
    dfFields.push(fMatch[1]);
  }

  // Check pagination
  const usesPagination = content.includes('computeTwoPagePartition');

  // Check geometry / layout features
  const hasClipPath = content.includes('clip-path');
  const hasSvg = /<svg/i.test(content);
  const hasBorderRadius = /border-radius/i.test(content);
  const hasGrid = /display:\s*grid/i.test(content);
  const hasFlex = /display:\s*flex/i.test(content);
  const hasSidebar = /sidebar|left-col|aside|col-left/i.test(content);
  const hasTwoPages = content.includes('page1') || content.includes('cv-page');
  const hasMediaPrint = content.includes('@media print');
  const hasPrintColorAdjust = content.includes('print-color-adjust');

  // Check avatar masking
  const avatarDetails = {
    hasAvatar: /avatar|candidate-photo|profile-photo/i.test(content),
    hasOverflowHidden: /overflow:\s*hidden/i.test(content),
    hasBorderRadius: /border-radius:\s*(?:50%|9999px|\d+px)/i.test(content),
    hasAvatarWrapper: /avatar-wrap|photo-wrap|avatar-container|photo-container|avatar-mask/i.test(content)
  };

  detailedAudit.push({
    file,
    slug,
    exportName,
    mapEntry,
    isExportedInIndex,
    usesPagination,
    dfFieldCount: dfFields.length,
    uniqueDfFields: Array.from(new Set(dfFields)),
    mockFallbacks,
    hasClipPath,
    hasSvg,
    hasBorderRadius,
    hasGrid,
    hasFlex,
    hasSidebar,
    hasTwoPages,
    hasMediaPrint,
    hasPrintColorAdjust,
    avatarDetails,
    fileSize: content.length,
    lineCount: lines.length
  });
}

const summary = {
  totalTemplateFiles: files.length,
  totalExportedInIndex: Object.keys(exportedInIndex).length,
  totalInTemplateMap: Object.keys(templateMap).length,
  missingInMap: files.filter(f => !templateMap[f.replace('.js', '')]),
  missingInIndex: files.filter(f => !exportedInIndex[f.replace('.js', '')]),
  paginationCount: detailedAudit.filter(d => d.usesPagination).length,
  templatesWithMockFallbacksCount: detailedAudit.filter(d => d.mockFallbacks.length > 0).length,
  templatesWithMediaPrintCount: detailedAudit.filter(d => d.hasMediaPrint).length,
  templatesWithPrintColorAdjustCount: detailedAudit.filter(d => d.hasPrintColorAdjust).length,
  templatesWithDfFieldCount: detailedAudit.filter(d => d.dfFieldCount > 0).length,
  templatesWithAvatarCount: detailedAudit.filter(d => d.avatarDetails.hasAvatar).length,
};

fs.writeFileSync(path.join(rootDir, '.agents', 'explorer_0_1', 'audit_detailed.json'), JSON.stringify({ summary, templates: detailedAudit }, null, 2));

console.log('Audit completed successfully!');
console.log(JSON.stringify(summary, null, 2));
