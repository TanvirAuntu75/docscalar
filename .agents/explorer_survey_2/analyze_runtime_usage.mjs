import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js')).sort();

const runtimeUsage = [];

for (const file of templateFiles) {
  const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
  const templateKey = file.replace('.js', '');

  const usesUniversalRuntime = content.includes('renderUniversalOrderedSections');
  const usesComputeTwoPagePartition = content.includes('computeTwoPagePartition');
  const usesSectionOrder = content.includes('sectionOrder') || content.includes('rawOrder');

  runtimeUsage.push({
    templateKey,
    file,
    usesUniversalRuntime,
    usesComputeTwoPagePartition,
    usesSectionOrder
  });
}

fs.writeFileSync('.agents/explorer_survey_2/runtime_usage.json', JSON.stringify(runtimeUsage, null, 2));

const usingRuntime = runtimeUsage.filter(r => r.usesUniversalRuntime);
const notUsingRuntime = runtimeUsage.filter(r => !r.usesUniversalRuntime);

console.log(`Templates using renderUniversalOrderedSections: ${usingRuntime.length}`);
console.log(`Templates NOT using renderUniversalOrderedSections: ${notUsingRuntime.length}`);
console.log('List of templates not using universal runtime:', notUsingRuntime.map(r => r.templateKey));
