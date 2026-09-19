import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

console.log(`Found ${files.length} template files in ${templatesDir}`);

const analysis = [];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const templateKey = file.replace('.js', '');

  // 1. Check title rendering lines
  const titleLines = [];
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('title') && (line.includes('safeData') || line.includes('candidate-title') || line.includes('data-df-field="title"'))) {
      titleLines.push({ lineNum: idx + 1, line: line.trim() });
    }
  });

  // 2. Check title omission guards like ${safeData.title ? ... : ''}
  const hasOmissionGuard = /\$\{safeData\.title\s*\?[^:]*:\s*['"]{2}\}/.test(content) ||
                          /\$\{safeData\.title\s*\?[^:]*:\s*null\}/.test(content) ||
                          /if\s*\(\s*safeData\.title\s*\)/.test(content);

  const hasDataDfFieldTitle = content.includes('data-df-field="title"');
  const hasCandidateTitleClass = content.includes('candidate-title');
  const hasFallbackTitle = content.includes('safeData.title ||');

  // 3. Section heading stamps
  const headingStamps = [];
  const headingMatches = content.matchAll(/data-df-field="heading:([^"]+)"/g);
  for (const m of headingMatches) {
    headingStamps.push(m[1]);
  }

  // Check how section headings are generated (h2, div, universal runtime, custom)
  const usesUniversalRuntime = content.includes('renderUniversalOrderedSections') || content.includes('universalTemplateRuntime');

  analysis.push({
    file,
    templateKey,
    hasOmissionGuard,
    hasDataDfFieldTitle,
    hasCandidateTitleClass,
    hasFallbackTitle,
    titleLines,
    headingStamps: [...new Set(headingStamps)],
    usesUniversalRuntime
  });
}

console.log(`Audited ${analysis.length} templates.`);
const withOmissionGuards = analysis.filter(a => a.hasOmissionGuard);
console.log(`Templates with title omission guards: ${withOmissionGuards.length}`);
const missingDataDfFieldTitle = analysis.filter(a => !a.hasDataDfFieldTitle);
console.log(`Templates missing data-df-field="title": ${missingDataDfFieldTitle.length}`);
const missingCandidateTitleClass = analysis.filter(a => !a.hasCandidateTitleClass);
console.log(`Templates missing candidate-title class: ${missingCandidateTitleClass.length}`);

fs.writeFileSync('.agents/explorer_survey_2/template_analysis.json', JSON.stringify(analysis, null, 2));
console.log('Saved detailed analysis to .agents/explorer_survey_2/template_analysis.json');
