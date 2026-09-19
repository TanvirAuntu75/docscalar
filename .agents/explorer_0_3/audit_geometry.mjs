import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const geometryAudits = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8');

  // Identify layout archetypes:
  // - Sidebar left
  // - Sidebar right
  // - Single column / stacked
  // - Two equal columns / split dual block
  // - Polygon / diagonal header
  // - Floating cards / modular matrix
  // - Arch / capsule banner
  
  let archetype = 'single_column';
  if (content.includes('diagonal-header') || content.includes('clip-path: polygon')) {
    archetype = 'diagonal_polygon';
  } else if (content.includes('arch') || content.includes('border-radius: 110px') || content.includes('capsule')) {
    archetype = 'arch_capsule';
  } else if (content.includes('sidebar-col') || content.includes('.sidebar') || content.includes('sidebar-bg') || content.includes('left-col')) {
    archetype = 'sidebar_split';
  } else if (content.includes('card-matrix') || content.includes('floating-card') || content.includes('cards-grid')) {
    archetype = 'floating_card_matrix';
  } else if (content.includes('split_dual') || content.includes('dual-block')) {
    archetype = 'split_dual_block';
  }

  // Check SVG icons vs Unicode/Emojis
  const svgCount = (content.match(/<svg/g) || []).length;
  const emojiMatches = content.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || [];

  // Check discrete A4 container class
  const hasCvPageClass = content.includes('.cv-page');
  const hasResumeCanvasClass = content.includes('.resume-canvas');
  const hasResumeSheetClass = content.includes('.resume-sheet');

  // Check pageBreak rules
  const hasPageBreakAfter = content.includes('page-break-after: always') || content.includes('break-after: page');
  const hasLastChildAvoid = content.includes('page-break-after: avoid') || content.includes('break-after: avoid') || content.includes(':last-child');

  geometryAudits.push({
    file,
    archetype,
    svgCount,
    emojiCount: emojiMatches.length,
    emojis: emojiMatches,
    hasCvPageClass,
    hasResumeCanvasClass,
    hasResumeSheetClass,
    hasPageBreakAfter,
    hasLastChildAvoid
  });
}

console.log(`\n--- GEOMETRY & ARCHETYPE AUDIT (${geometryAudits.length} templates) ---`);
const archetypesSummary = {};
geometryAudits.forEach(g => {
  archetypesSummary[g.archetype] = (archetypesSummary[g.archetype] || 0) + 1;
});
console.log('Archetypes distribution:', archetypesSummary);
console.log(`Templates with raw SVG icons: ${geometryAudits.filter(g => g.svgCount > 0).length} / ${geometryAudits.length}`);
console.log(`Templates with emojis detected: ${geometryAudits.filter(g => g.emojiCount > 0).length} / ${geometryAudits.length}`);
console.log(`Templates using .cv-page: ${geometryAudits.filter(g => g.hasCvPageClass).length} / ${geometryAudits.length}`);
console.log(`Templates using .resume-canvas: ${geometryAudits.filter(g => g.hasResumeCanvasClass).length} / ${geometryAudits.length}`);
console.log(`Templates with page-break-after: ${geometryAudits.filter(g => g.hasPageBreakAfter).length} / ${geometryAudits.length}`);
console.log(`Templates with last-child break-avoid: ${geometryAudits.filter(g => g.hasLastChildAvoid).length} / ${geometryAudits.length}`);

fs.writeFileSync('.agents/explorer_0_3/geometry_audits.json', JSON.stringify(geometryAudits, null, 2));
