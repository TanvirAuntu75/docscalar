import fs from 'fs';
import path from 'path';

const templatesDir = 'src/engines/utility/templates';
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const stats = {
  total: files.length,
  usesPagination: 0,
  noPagination: 0,
  withFallbackMockStrings: 0,
  mockNamesDetected: {},
  mockContactDetected: {},
  templatePatterns: {},
  missingDfFields: [],
  arrayResurrections: []
};

const detailedFindings = [];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  const fnMatch = content.match(/export\s+function\s+(\w+)\s*\(([^)]*)\)/);
  const fnName = fnMatch ? fnMatch[1] : 'unknown';

  const usesPagination = content.includes('computeTwoPagePartition');
  if (usesPagination) stats.usesPagination++;
  else stats.noPagination++;

  // Detect fallback names
  // e.g. data.name || 'Adeline Palmerston' or nameParts = (data.name || '...').split(' ')
  const nameFallbacks = [];
  const nameFallbackRegex = /(?:data\.)?name\s*\|\|\s*(['"`][^'"`]+['"`])/g;
  let m;
  while ((m = nameFallbackRegex.exec(content)) !== null) {
    nameFallbacks.push(m[0]);
    stats.mockNamesDetected[m[1]] = (stats.mockNamesDetected[m[1]] || 0) + 1;
  }

  // Detect title fallbacks
  const titleFallbacks = [];
  const titleFallbackRegex = /(?:data\.)?title\s*\|\|\s*(['"`][^'"`]+['"`])/g;
  while ((m = titleFallbackRegex.exec(content)) !== null) {
    titleFallbacks.push(m[0]);
  }

  // Detect phone, email, location, website, summary fallbacks
  const contactFallbacks = [];
  const contactRegex = /(?:data\.)?(phone|email|location|website|linkedin|summary|profile|about)\s*\|\|\s*(['"`][^'"`]+['"`])/g;
  while ((m = contactRegex.exec(content)) !== null) {
    contactFallbacks.push(m[0]);
    stats.mockContactDetected[m[1] + ':' + m[2]] = (stats.mockContactDetected[m[1] + ':' + m[2]] || 0) + 1;
  }

  // Detect array fallbacks: data.experience || [...], data.education || [...], etc.
  const arrayFallbacks = [];
  const arrayRegex = /(?:data\.)?(experience|education|skills|projects|certifications|references|customSections|custom_languages)\s*\|\|\s*\[/g;
  while ((m = arrayRegex.exec(content)) !== null) {
    arrayFallbacks.push(m[0]);
  }

  // Check if template embeds hardcoded fallback items when data is empty
  // e.g., if (!items || !items.length) return mockItems... or const items = data.experience && data.experience.length ? data.experience : [ {...} ]
  const ternaryArrayFallbacks = [];
  const ternaryRegex = /(?:data\.)?(experience|education|skills|projects|certifications|references)\s*(?:&&|\?\.|\.length)[^;]*\?\s*[^:]+:\s*\[\s*\{/g;
  while ((m = ternaryRegex.exec(content)) !== null) {
    ternaryArrayFallbacks.push(m[0]);
  }

  // Stamped data-df-field attributes
  const dfFields = [];
  const dfRegex = /data-df-field="([^"]+)"/g;
  while ((m = dfRegex.exec(content)) !== null) {
    dfFields.push(m[1]);
  }

  // Distinct stamped fields
  const uniqueDfFields = [...new Set(dfFields)];

  // Check if avatar is properly masked with overflow:hidden and border-radius
  const hasAvatarMask = content.includes('avatar-mask') || (content.includes('avatar') && content.includes('overflow: hidden') && content.includes('border-radius'));

  // Check A4 dimensions and print styles
  const has794x1123 = content.includes('794px') && content.includes('1123px');
  const hasPrintAdjust = content.includes('print-color-adjust: exact') || content.includes('-webkit-print-color-adjust: exact');
  const hasPageBreak = content.includes('page-break-after') || content.includes('break-after');

  const finding = {
    file,
    fnName,
    usesPagination,
    nameFallbacks,
    titleFallbacks,
    contactFallbacks,
    arrayFallbacks,
    ternaryArrayFallbacks,
    uniqueDfFieldsCount: uniqueDfFields.length,
    sampleDfFields: uniqueDfFields.slice(0, 8),
    hasAvatarMask,
    has794x1123,
    hasPrintAdjust,
    hasPageBreak,
    lineCount: content.split('\n').length
  };

  detailedFindings.push(finding);
}

fs.writeFileSync('.agents/explorer_0_2/deep_analysis.json', JSON.stringify({ stats, detailedFindings }, null, 2));

console.log('Deep analysis complete:');
console.log(`Total Templates: ${stats.total}`);
console.log(`Uses computeTwoPagePartition: ${stats.usesPagination}`);
console.log(`Without computeTwoPagePartition: ${stats.noPagination}`);
console.log('Mock Names Detected count:', Object.keys(stats.mockNamesDetected).length);
console.log('Mock Contact Detected count:', Object.keys(stats.mockContactDetected).length);
