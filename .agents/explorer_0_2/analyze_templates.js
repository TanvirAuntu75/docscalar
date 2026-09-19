import fs from 'fs';
import path from 'path';

const templatesDir = 'src/engines/utility/templates';
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

console.log(`Found ${files.length} template files.`);

const results = [];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check function declaration
  const fnMatch = content.match(/export\s+function\s+(\w+)\s*\(([^)]*)\)/);
  const fnName = fnMatch ? fnMatch[1] : 'unknown';
  const params = fnMatch ? fnMatch[2].trim() : '';

  // Check pagination engine usage
  const usesPagination = content.includes('computeTwoPagePartition');

  // Check data-df-field usage
  const dfFieldMatches = content.match(/data-df-field="([^"]+)"/g) || [];
  const stampedFields = [...new Set(dfFieldMatches.map(m => m.match(/data-df-field="([^"]+)"/)[1]))];

  // Check for fallback expressions: data.field || 'Mock'
  const fallbackMatches = [];
  const regexOr = /(?:data\.)?([a-zA-Z0-9_]+)\s*\|\|\s*(['"`][^'"`]+['"`])/g;
  let match;
  while ((match = regexOr.exec(content)) !== null) {
    // filter out common non-data defaults like color/font/layout
    const varName = match[1];
    const defaultVal = match[2];
    if (!['themeColor', 'themeFont', 'themeLayout', 'pageMargin', 'lineSpacing', 'fontFam', 'accent', 'slateColor'].includes(varName)) {
      fallbackMatches.push({ varName, defaultVal, full: match[0] });
    }
  }

  // Check for hardcoded fallback arrays
  const arrayFallbackMatches = [];
  const regexArrayOr = /(?:data\.)?([a-zA-Z0-9_]+)\s*\|\|\s*\[/g;
  while ((match = regexArrayOr.exec(content)) !== null) {
    arrayFallbackMatches.push(match[0]);
  }

  // Check for specific mock strings
  const mockKeywords = [
    'Mariana', 'Anderson', 'Adeline', 'Palmerston', 'Marcus', 'Sterling', 'Olivia',
    'Jonathan', 'Brewer', 'Adora', 'Montminy', 'Emma', 'Sinclair', 'Clara', 'Oswald',
    'Charles', 'Rodriguez', 'Kathleen', 'Jenkins', 'Adam', 'Fletcher', 'Richard', 'Fowler',
    'Evelyn', 'Mateo', 'Sanchez', 'Marcus', 'Wilson', 'Yuki', 'Alexander', 'Hayes',
    'Mei', 'David', 'Howard', 'Sebastian', 'Bennett', 'Layla', 'Schumacher', 'Alex', 'Mercer',
    'Catrine', 'Olive', 'Sharma', 'Lorna', 'Alvarado', 'Slate', 'Kelly', 'Blackwell',
    'Donna', 'Stroupe', 'Elena', 'Rostova', 'Claire', 'Laurent', 'Chloe', 'Isabel',
    'Julian', 'Henri', 'Astrid', 'Lindqvist', 'Genevieve', 'Bordeaux', 'Kenji', 'Takahashi',
    'Stefan', 'Weber', 'Freja', 'Lind', 'Harper', 'Montgomery', 'Hana', 'Tanaka',
    'Dominik', 'Javier', 'Gomez', 'Korina', 'Villanueva', 'Alessandra', 'Rossi',
    'Ciara', 'O’Connor', 'Elias', 'Lawrence', 'Camille', 'Beaulieu', 'Matteo', 'Moretti',
    'Signe', 'Møller', 'Wyatt', 'Jonathan', 'Patterson', 'Alistair', 'MacLeod', 'Ji-hoon',
    'Park', 'Oksana', 'Kovalenko', 'Derrick', 'Chen', 'Alfredo', 'Torres', 'Harrison', 'Ford',
    'Tarek', 'Mansour', 'Carlos', 'Vega', 'Ren', 'Sato', 'Vance', 'Jordan', 'Gianna', 'Bellini',
    'Lars', 'Frederik', 'Arthur', 'Pendelton', 'Václav', 'Dvořák', 'Jónsdóttir',
    'Valentina', 'Soler', 'Liam', 'MacIntyre', 'Amélie', 'Noah', 'Thabo', 'Ndlovu', 'Matti', 'Virtanen',
    'reallygreatsite.com', '123 Anywhere St', 'hello@reallygreatsite.com', '123-456-7890',
    'Ginyard', 'Borcelle', 'Fauget', 'Wardiere'
  ];

  const foundMockStrings = [];
  for (const kw of mockKeywords) {
    if (content.includes(kw)) {
      foundMockStrings.push(kw);
    }
  }

  // Check avatar container / masking
  const hasAvatarMask = content.includes('avatar-mask') || content.includes('border-radius') && (content.includes('avatar') || content.includes('photo'));
  const hasA4Dimensions = content.includes('794px') && content.includes('1123px');
  const hasPrintMedia = content.includes('@media print');

  results.push({
    file,
    fnName,
    params,
    usesPagination,
    stampedCount: stampedFields.length,
    stampedFields,
    fallbackMatches,
    arrayFallbackMatches,
    foundMockStrings,
    hasAvatarMask,
    hasA4Dimensions,
    hasPrintMedia,
    lineCount: content.split('\n').length
  });
}

fs.writeFileSync('.agents/explorer_0_2/audit_summary.json', JSON.stringify(results, null, 2));
console.log('Audit completed. Summary written to .agents/explorer_0_2/audit_summary.json');
