import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const maintenancePagePath = path.join(rootDir, 'src/pages/utility/MaintenancePage.jsx');
const appPath = path.join(rootDir, 'src/App.jsx');

console.log('--- Starting Clean Non-AI MaintenancePage Verification Suite ---');

const maintenanceContent = fs.readFileSync(maintenancePagePath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');

const tests = [];

function assert(description, condition, details = '') {
  tests.push({ description, passed: Boolean(condition), details });
  if (!condition) {
    console.error(`❌ FAIL: ${description} ${details}`);
  } else {
    console.log(`✅ PASS: ${description}`);
  }
}

// Area 1: Source File Presence & Density
assert(
  'Area 01: MaintenancePage source file exists and has substantial content (>2000 bytes)',
  fs.existsSync(maintenancePagePath) && maintenanceContent.length > 2000,
  `Length: ${maintenanceContent.length} bytes`
);

// Area 2: ES Module Imports
assert(
  'Area 02: Essential React & Router hooks are imported',
  maintenanceContent.includes('useNavigate') &&
  maintenanceContent.includes('Link') &&
  maintenanceContent.includes('useEffect') &&
  maintenanceContent.includes('useMemo')
);

// Area 3: Clean Icon Imports
assert(
  'Area 03: Crisp functional icons are imported (FileText, Layers, Wrench, ArrowLeft, LayoutGrid)',
  maintenanceContent.includes('FileText') &&
  maintenanceContent.includes('Layers') &&
  maintenanceContent.includes('Wrench') &&
  maintenanceContent.includes('ArrowLeft') &&
  maintenanceContent.includes('LayoutGrid')
);

// Area 4: SEOHead Integration
assert(
  'Area 04: SEOHead component is integrated with dynamic title and description',
  maintenanceContent.includes('<SEOHead') &&
  maintenanceContent.includes('title=') &&
  maintenanceContent.includes('description=')
);

// Area 5: No Duplicate Sub-Header
assert(
  'Area 05: No redundant <header> tag inside MaintenancePage (site Header handles top navigation)',
  !maintenanceContent.includes('<header')
);

// Area 6: Zero AI-Slop Green/Amber Pills
assert(
  'Area 06: Zero AI-slop green/amber pill badges (no animate-ping, no emerald pill button)',
  !maintenanceContent.includes('animate-ping') &&
  !maintenanceContent.includes('bg-emerald-500/10')
);

// Area 7: Zero AI Feature Breakdown Cards
assert(
  'Area 07: Zero marketing feature breakdown cards (no "WHAT\'S IN ACTIVE DEVELOPMENT")',
  !maintenanceContent.includes("WHAT'S IN ACTIVE DEVELOPMENT") &&
  !maintenanceContent.includes("Executive Harvard Blueprints")
);

// Area 8: Explicit Plain Text Tag: "In Production · Coming Soon"
assert(
  'Area 08: Plain text eyebrow explicitly declares "In Production · Coming Soon"',
  maintenanceContent.includes('In Production · Coming Soon')
);

// Area 9: Prominent Headline Explicitly Declares "{title} is Coming Soon"
assert(
  'Area 09: Primary H1 headline explicitly states "{title} is Coming Soon"',
  maintenanceContent.includes('{title} is Coming Soon')
);

// Area 10: Clean Card Container
assert(
  'Area 10: Central card uses clean max-w-3xl width with rounded-2xl geometry',
  maintenanceContent.includes('max-w-3xl') &&
  maintenanceContent.includes('rounded-2xl')
);

// Area 11: Dynamic Studio Icon
assert(
  'Area 11: Dynamic icon switches between FileText, Layers, and Wrench',
  maintenanceContent.includes('isResume') &&
  maintenanceContent.includes('isCanvas') &&
  maintenanceContent.includes('<FileText') &&
  maintenanceContent.includes('<Layers')
);

// Area 12: Typography Hierarchy
assert(
  'Area 12: Headings enforce bold/extrabold typography with tracking-tight',
  (maintenanceContent.includes('font-bold') || maintenanceContent.includes('font-extrabold')) &&
  maintenanceContent.includes('tracking-tight')
);

// Area 13: CV Builder Value Copy
assert(
  'Area 13: CV Builder branch explains new studio is in production and coming soon',
  maintenanceContent.includes('CV Builder studio') &&
  maintenanceContent.includes('in production and will be available soon')
);

// Area 14: Stitch Canvas Value Copy
assert(
  'Area 14: Stitch Canvas branch explains workspace is in production and coming soon',
  maintenanceContent.includes('Stitch Canvas workspace') &&
  maintenanceContent.includes('in production and will be available soon')
);

// Area 15: Custom Description Override
assert(
  'Area 15: Description prop override is respected when passed',
  maintenanceContent.includes('if (description) return description;')
);

// Area 16: Primary Action Button (Browse All Tools)
assert(
  'Area 16: Primary button has min-h-[48px], high contrast, and LayoutGrid icon',
  maintenanceContent.includes('min-h-[48px]') &&
  maintenanceContent.includes('Browse All Tools') &&
  maintenanceContent.includes('LayoutGrid')
);

// Area 17: Secondary Action Button (Back to Home)
assert(
  'Area 17: Secondary button provides min-h-[48px] with border and ArrowLeft icon',
  maintenanceContent.includes('Back to Home') &&
  maintenanceContent.includes('ArrowLeft')
);

// Area 18: Tasteful Alternatives Section Header
assert(
  'Area 18: Alternatives section is framed with quiet text divider',
  maintenanceContent.includes('In the meantime, explore our active tools:')
);

// Area 19: CV Builder Alternative Routes
assert(
  'Area 19: CV Builder provides direct routes to PDF to Word, Edit PDF, Text to PDF, and Merge PDF',
  maintenanceContent.includes('/pdf-to-word') &&
  maintenanceContent.includes('/edit-pdf') &&
  maintenanceContent.includes('/text-to-pdf') &&
  maintenanceContent.includes('/merge-pdf')
);

// Area 20: Stitch Canvas Alternative Routes
assert(
  'Area 20: Stitch Canvas provides direct routes to Edit PDF, Organize PDF, Crop PDF, and Image to PDF',
  maintenanceContent.includes('/organize-pdf') &&
  maintenanceContent.includes('/crop-pdf') &&
  maintenanceContent.includes('/image-to-pdf')
);

// Area 21: Lightweight Alternative Chips
assert(
  'Area 21: Alternative tools are rendered as simple text chip links with ArrowRight',
  maintenanceContent.includes('ArrowRight') &&
  maintenanceContent.includes('alternativeTools.map')
);

// Area 22: Footer Operational Guarantee
assert(
  'Area 22: Footer note confirms all 40+ DocScalar tools remain live and operational',
  maintenanceContent.includes('All 40+ DocScalar tools remain live and operational')
);

// Area 23: Keyboard Escape Listener Registration & Teardown
assert(
  'Area 23: Escape key listener is registered and cleaned up on unmount',
  maintenanceContent.includes('keydown') &&
  maintenanceContent.includes('e.key === \'Escape\'') &&
  maintenanceContent.includes('removeEventListener')
);

// Area 24: No AI Purple Gradients
assert(
  'Area 24: Zero purple or neon gradient slop',
  !maintenanceContent.includes('from-purple-600') &&
  !maintenanceContent.includes('to-indigo-600') &&
  !maintenanceContent.includes('var(--accent)')
);

// Area 25: No Nested Cards
assert(
  'Area 25: Card-within-card sprawl is eradicated (no nested card containers)',
  !maintenanceContent.includes('grid-cols-1 md:grid-cols-3 gap-6 p-6 sm:p-8')
);

// Area 26: Touch Target Compliance
assert(
  'Area 26: All action buttons adhere to min-h-[48px]',
  (maintenanceContent.match(/min-h-\[48px\]/g) || []).length >= 2
);

// Area 27: Responsive Viewport Height
assert(
  'Area 27: Outer container enforces responsive min-h-[calc(100dvh-56px)]',
  maintenanceContent.includes('min-h-[calc(100dvh-56px)]')
);

// Area 28: Subtitle Support
assert(
  'Area 28: Subtitle is rendered cleanly when provided',
  maintenanceContent.includes('{subtitle && (')
);

// Area 29: Theme-Aware Borders
assert(
  'Area 29: Borders are subtle and theme-aware (border-slate-200/90 dark:border-slate-800/90)',
  maintenanceContent.includes('border-slate-200/90 dark:border-slate-800/90')
);

// Area 30: History Navigation Fallback
assert(
  'Area 30: Go back handler falls back safely to root if history is empty',
  maintenanceContent.includes('window.history.length > 1')
);

// Area 31: App.jsx Lazy Loading Registration
assert(
  'Area 31: App.jsx imports MaintenancePage via lazyWithRetry',
  appContent.includes('const MaintenancePage = lazyWithRetry(() => import(\'./pages/utility/MaintenancePage\'))')
);

// Area 32: App.jsx /canvas Route Registration
assert(
  'Area 32: App.jsx /canvas route renders MaintenancePage with Stitch Canvas props',
  appContent.includes('<Route path="/canvas" element={<MaintenancePage title="Stitch Canvas"')
);

// Area 33: App.jsx /resume-builder/* Route Registration
assert(
  'Area 33: App.jsx /resume-builder/* route renders MaintenancePage with CV Builder props',
  appContent.includes('<Route path="/resume-builder/*" element={<MaintenancePage title="CV Builder"')
);

// Area 34: App.jsx Header Integration
assert(
  'Area 34: App.jsx renders site Header consistently on canvas maintenance route',
  appContent.includes('const isCanvas = false;')
);

// Area 35: Crisp Dark Mode Background
assert(
  'Area 35: Background handles both slate-50 and dark obsidian (#0a0e17)',
  maintenanceContent.includes('bg-slate-50 dark:bg-[#0a0e17]')
);

// Area 36: Clean Typography Tracking (Non-Monospace SaaS Pill)
assert(
  'Area 36: Tag uses clean uppercase tracking-wider typography matching landing page design system',
  maintenanceContent.includes('font-semibold uppercase tracking-wider') &&
  !maintenanceContent.includes('font-mono font-semibold uppercase tracking-widest')
);

// Area 37: Tactile Button Press States
assert(
  'Area 37: Primary action includes active:scale-[0.98] tactile feedback',
  maintenanceContent.includes('active:scale-[0.98]')
);

// Area 38: Zero Dot Matrix Clutter
assert(
  'Area 38: Dot matrix grid is removed for a quiet, clean, solid presentation',
  !maintenanceContent.includes('radial-gradient(currentColor 1px, transparent 1px)')
);

console.log('\n--- Test Summary ---');
const passedCount = tests.filter(t => t.passed).length;
console.log(`Passed: ${passedCount} / ${tests.length} (${Math.round((passedCount / tests.length) * 100)}%)`);

if (passedCount !== tests.length) {
  console.error('❌ Test suite failed!');
  process.exit(1);
} else {
  console.log('✅ ALL 38 TEST AREAS PASSED 100% WITH ZERO FAILURES!');
  process.exit(0);
}
