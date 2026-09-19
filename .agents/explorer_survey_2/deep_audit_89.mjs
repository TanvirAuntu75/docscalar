import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js')).sort();

const fullCatalogAudit = [];

for (const file of templateFiles) {
  const filePath = path.join(templatesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const templateKey = file.replace('.js', '');

  // 1. Title Audit
  // Find all occurrences of data-df-field="title"
  const titleFieldMatches = [];
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('data-df-field="title"')) {
      titleFieldMatches.push({ lineNum: idx + 1, text: line.trim() });
    }
  });

  // Check if title is wrapped in an omission guard
  // e.g. ${safeData.title ? ... : ''} or ${title ? ... : ''}
  const hasTitleTernaryGuard = /\$\{(?:safeData\.)?title\s*\?[^:]*:\s*['"]{2}\}/.test(content) ||
                               /\$\{(?:safeData\.)?title\s*\?[^:]*:\s*null\}/.test(content);

  // Check what classes are on the title element
  const titleTagMatch = content.match(/<([a-z0-9]+)[^>]*data-df-field="title"[^>]*>/i) ||
                        content.match(/<([a-z0-9]+)[^>]*class="([^"]*)"[^>]*data-df-field="title"/i);

  // 2. Section Heading Audit
  // Find all data-df-field="heading:..."
  const headingMatches = [];
  const headingTagDetails = [];
  lines.forEach((line, idx) => {
    if (line.includes('data-df-field="heading:')) {
      const match = line.match(/<([a-z0-9]+)[^>]*data-df-field="heading:([^"]+)"[^>]*>/i);
      const tag = match ? match[1] : 'unknown';
      const key = match ? match[2] : 'unknown';
      const hasSectionHeadingClass = line.includes('class="section-heading') || line.includes('section-heading');
      headingMatches.push(key);
      headingTagDetails.push({ lineNum: idx + 1, tag, sectionKey: key, hasSectionHeadingClass, line: line.trim() });
    }
  });

  // 3. Check sectionTitles usage
  const usesSectionTitles = content.includes('sectionTitles') || content.includes('safeData.sectionTitles');

  // 4. Check name stamping
  const nameMatches = [];
  lines.forEach((line, idx) => {
    if (line.includes('data-df-field="name"')) {
      nameMatches.push({ lineNum: idx + 1, line: line.trim() });
    }
  });

  fullCatalogAudit.push({
    file,
    templateKey,
    titleFieldMatches,
    hasTitleTernaryGuard,
    titleTagMatch: titleTagMatch ? titleTagMatch[0] : null,
    headingKeys: [...new Set(headingMatches)],
    headingTagDetails,
    usesSectionTitles,
    nameMatches
  });
}

console.log(`Audited ${fullCatalogAudit.length} templates.`);
fs.writeFileSync('.agents/explorer_survey_2/full_catalog_audit.json', JSON.stringify(fullCatalogAudit, null, 2));

// Summary stats
const withTernaryGuard = fullCatalogAudit.filter(a => a.hasTitleTernaryGuard);
const withoutTitleField = fullCatalogAudit.filter(a => a.titleFieldMatches.length === 0);
console.log(`Templates with title ternary omission guard: ${withTernaryGuard.length}`);
console.log(`Templates without data-df-field="title": ${withoutTitleField.length}`);

// Heading tags distribution
const allHeadingTags = {};
fullCatalogAudit.forEach(t => {
  t.headingTagDetails.forEach(h => {
    allHeadingTags[h.tag] = (allHeadingTags[h.tag] || 0) + 1;
  });
});
console.log('Heading HTML Tags Distribution across all templates:', allHeadingTags);
