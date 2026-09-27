import fs from 'fs';
import path from 'path';

const landingPagePath = path.resolve('src/components/LandingPage.jsx');
const content = fs.readFileSync(landingPagePath, 'utf8');

const tests = [];

function assert(condition, testName, details = '') {
  tests.push({ testName, passed: !!condition, details });
  if (!condition) {
    console.error(`❌ FAIL: ${testName} - ${details}`);
  } else {
    console.log(`✅ PASS: ${testName}`);
  }
}

// 1. StudioCanvasSection component function is gone
assert(!content.includes('function StudioCanvasSection'), 'StudioCanvasSection component function removed');

// 2. StudioCanvasSection JSX invocation is gone
assert(!content.includes('<StudioCanvasSection'), 'StudioCanvasSection JSX invocation removed');

// 3. CANVAS SUPERPOWERS badge is gone
assert(!content.includes('CANVAS SUPERPOWERS'), 'CANVAS SUPERPOWERS badge text removed');

// 4. "Design Pipelines Visually" heading is gone
assert(!content.includes('Design Pipelines Visually'), 'Design Pipelines Visually heading removed');

// 5. "Format Auto-Healing" canvas feature is gone
assert(!content.includes('Format Auto-Healing'), 'Format Auto-Healing canvas feature removed');

// 6. "Type-Safe Cable Guard" canvas feature is gone
assert(!content.includes('Type-Safe Cable Guard'), 'Type-Safe Cable Guard canvas feature removed');

// 7. "Multi-Branch DAG Engine" canvas feature is gone
assert(!content.includes('Multi-Branch DAG Engine'), 'Multi-Branch DAG Engine canvas feature removed');

// 8. "Auto-Persistent Workbench" canvas feature is gone
assert(!content.includes('Auto-Persistent Workbench'), 'Auto-Persistent Workbench canvas feature removed');

// 9. Motion / canvas navigation link is removed from NAV_SECTIONS
const navMatch = content.match(/const NAV_SECTIONS = \[[\s\S]*?\];/);
assert(navMatch !== null, 'NAV_SECTIONS array found');
assert(navMatch && !navMatch[0].includes("id: 'canvas'"), "id: 'canvas' removed from NAV_SECTIONS");
assert(navMatch && !navMatch[0].includes("name: 'Motion'"), "name: 'Motion' removed from NAV_SECTIONS");

// 10. Remaining NAV_SECTIONS are valid
assert(navMatch && navMatch[0].includes("id: 'tools'"), "id: 'tools' preserved in NAV_SECTIONS");
assert(navMatch && navMatch[0].includes("id: 'features'"), "id: 'features' preserved in NAV_SECTIONS");
assert(navMatch && navMatch[0].includes("id: 'resume'"), "id: 'resume' preserved in NAV_SECTIONS");
assert(navMatch && navMatch[0].includes("id: 'privacy'"), "id: 'privacy' preserved in NAV_SECTIONS");
assert(navMatch && navMatch[0].includes("id: 'pricing'"), "id: 'pricing' preserved in NAV_SECTIONS");

// 11. Clean Lucide icon imports (unused icons removed, required icons preserved)
assert(!/import\s*\{[^}]*Wand2[^}]*\}\s*from/.test(content), 'Wand2 icon removed from imports');
assert(/import\s*\{[^}]*Workflow[^}]*\}\s*from/.test(content), 'Workflow icon preserved for Hero CTA');
assert(!/import\s*\{[^}]*Zap[^}]*\}\s*from/.test(content), 'Zap icon removed from imports');
assert(/import\s*\{[^}]*FileType[^}]*\}\s*from/.test(content), 'FileType icon preserved for FloatingDecorations');
assert(/import\s*\{[^}]*Database[^}]*\}\s*from/.test(content), 'Database icon preserved for FloatingDecorations');

// Summary
const failed = tests.filter(t => !t.passed);
console.log(`\nResults: ${tests.length - failed.length}/${tests.length} tests passed.`);
if (failed.length > 0) {
  process.exit(1);
} else {
  console.log('All Canvas Section removal tests passed successfully.');
}
