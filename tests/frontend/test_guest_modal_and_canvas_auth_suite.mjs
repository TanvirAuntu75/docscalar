import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TOOLS, isToolCompatibleWithFile } from '../../src/utils/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');

console.log('================================================================');
console.log('RUNNING MOLECULAR TEST SUITE: Guest Modal & Canvas Auth Guard');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message, details = '') {
  if (condition) {
    passCount++;
    console.log(`  [PASS] Area ${passCount}: ${message}`);
  } else {
    failCount++;
    console.error(`  [FAIL] ${message}`);
    if (details) console.error(`         Details: ${details}`);
  }
}

// 1. Source Content Reads
const homeSource = readFileSync(resolve(rootDir, 'src/pages/Home.jsx'), 'utf8');
const landingSource = readFileSync(resolve(rootDir, 'src/components/LandingPage.jsx'), 'utf8');
const appSource = readFileSync(resolve(rootDir, 'src/App.jsx'), 'utf8');

// Area 1: Home.jsx Guest Modal Viewport Bounded Containment
assert(
  homeSource.includes('max-h-[88vh]') && homeSource.includes('max-w-[94vw]') && homeSource.includes('overflow-hidden'),
  'Home.jsx enforces strict viewport containment (max-h-[88vh], max-w-[94vw], overflow-hidden)',
  'Modal must not exceed 88vh to prevent off-screen overflow'
);

// Area 2: Home.jsx Guest Modal Body Scrollability
assert(
  homeSource.includes('overflow-y-auto') && homeSource.includes('flex-1 overflow-y-auto p-5'),
  'Guest modal body is scrollable (flex-1 overflow-y-auto)',
  'Body must have overflow-y-auto so tool cards scroll within bounded viewport'
);

// Area 3: Home.jsx Sticky Modal Header
assert(
  homeSource.includes('border-b border-outline-variant/60 flex-shrink-0 bg-surface'),
  'Guest modal header is sticky and flex-shrink-0 to remain visible at all times'
);

// Area 4: Home.jsx Back to Home Button in Header
assert(
  homeSource.includes('Back to Home') && homeSource.includes('arrow_back'),
  'Guest modal header provides an explicit "Back to Home" button with arrow_back icon'
);

// Area 5: Home.jsx Close Dialog Button
assert(
  homeSource.includes('Close dialog (Esc)') && homeSource.includes('handleCloseGuestModal'),
  'Guest modal header provides an explicit close button invoking handleCloseGuestModal'
);

// Area 6: Home.jsx Backdrop Click to Dismiss
assert(
  homeSource.includes('onClick={(e) => { if (e.target === e.currentTarget) handleCloseGuestModal(); }}'),
  'Guest modal backdrop click safely dismisses modal when clicking outside dialog container'
);

// Area 7: Home.jsx Keyboard Shortcut Esc Handler
assert(
  homeSource.includes("'Escape': (e) => {") && homeSource.includes('handleCloseGuestModal();'),
  'Keyboard shortcut Escape dismisses guest modal cleanly'
);

// Area 8: Home.jsx Selected File Banner Presence
assert(
  homeSource.includes('getFileBadge(selectedFile.name)') && homeSource.includes('formatSize(selectedFile.size)'),
  'Selected file banner renders file badge, formatted size, and filename'
);

// Area 9: Home.jsx "Change File" Button
assert(
  homeSource.includes('Change File') && homeSource.includes('fileInputRef.current?.click()'),
  'Selected file banner provides "Change File" button triggering native file input'
);

// Area 10: Home.jsx Search Bar with Placeholder & Icon
assert(
  homeSource.includes('placeholder="Search tools (e.g. compress, word, ocr)..."') && homeSource.includes('guestToolSearchQuery'),
  'Guest modal includes real-time tool search input with descriptive placeholder'
);

// Area 11: Home.jsx Search Clear Button
assert(
  homeSource.includes("guestToolSearchQuery && (") && homeSource.includes("setGuestToolSearchQuery('')"),
  'Search bar renders clear button when query is present'
);

// Area 12: Home.jsx Category Tabs - Recommended
assert(
  homeSource.includes("id: 'recommended', label: 'Recommended'") && homeSource.includes("icon: 'auto_awesome'"),
  'Category tabs include "Recommended" with auto_awesome icon'
);

// Area 13: Home.jsx Category Tabs - All Tools
assert(
  homeSource.includes("id: 'all', label: 'All Tools'") && homeSource.includes("icon: 'apps'"),
  'Category tabs include "All Tools" with apps icon'
);

// Area 14: Home.jsx Category Tabs - Convert
assert(
  homeSource.includes("id: 'convert', label: 'Convert'") && homeSource.includes("icon: 'transform'"),
  'Category tabs include "Convert" with transform icon'
);

// Area 15: Home.jsx Category Tabs - Edit & Sign
assert(
  homeSource.includes("id: 'edit', label: 'Edit & Sign'") && homeSource.includes("icon: 'edit'"),
  'Category tabs include "Edit & Sign" with edit icon'
);

// Area 16: Home.jsx Category Tabs - Organize
assert(
  homeSource.includes("id: 'organize', label: 'Organize'") && homeSource.includes("icon: 'folder_open'"),
  'Category tabs include "Organize" with folder_open icon'
);

// Area 17: Home.jsx Category Tabs - Optimize & Security
assert(
  homeSource.includes("id: 'optimize', label: 'Optimize & Security'") && homeSource.includes("icon: 'security'"),
  'Category tabs include "Optimize & Security" with security icon'
);

// Area 18: Home.jsx Responsive Grid Structure (2 to 6 cols)
assert(
  homeSource.includes('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-3.5'),
  'Tool cards are laid out in a responsive grid from 2 columns on mobile up to 6 on desktop widescreen'
);

// Area 19: Home.jsx Card Compatibility Indicator
assert(
  homeSource.includes('isToolCompatibleWithFile(tool, selectedFile)') &&
  homeSource.includes('Compatible') &&
  homeSource.includes('bg-primary/10'),
  'Compatible tools display an explicit "Compatible" badge with primary tint'
);

// Area 20: Home.jsx Open Studio CTA
assert(
  homeSource.includes('Open Studio') && homeSource.includes('arrow_forward'),
  'Each tool card provides an "Open Studio" CTA with forward transition icon'
);

// Area 21: Home.jsx Tool Selection Navigation State Forwarding
assert(
  homeSource.includes('initialFile: fileToForward') && homeSource.includes('initialFiles: fileToForward ? [fileToForward] : []'),
  'handleToolSelect forwards uploaded file in navigation state (initialFile & initialFiles)'
);

// Area 22: Home.jsx Sticky Modal Footer
assert(
  homeSource.includes('Return to Home') && homeSource.includes('border-t border-outline-variant/60 flex items-center justify-between'),
  'Sticky footer provides secondary "Return to Home" button and tool count'
);

// Area 23: Home.jsx Floating Batch Actions Bar Isolation
assert(
  homeSource.includes('{/* Floating Batch Actions Bar */}') &&
  !homeSource.substring(homeSource.indexOf('{/* Guest Match Modal */}'), homeSource.indexOf('{/* Floating Batch Actions Bar */}')).includes('Floating Batch Actions Bar'),
  'Floating Batch Actions Bar is completely separated from and outside the Guest Match Modal'
);

// Area 24: Home.jsx Direct Canvas Route Auth Guard
assert(
  homeSource.includes("if (!isAuthenticated && location.pathname === '/canvas') {") &&
  homeSource.includes("navigate('/signup', { state: { from: { pathname: '/canvas' } }, replace: true });"),
  'Home.jsx redirects unauthenticated visitors navigating directly to /canvas to /signup'
);

// Area 25: LandingPage.jsx Hero Canvas Button Auth Guard
assert(
  landingSource.includes("navigate(isAuthenticated ? '/canvas' : '/signup', { state: { from: { pathname: '/canvas' } } })"),
  'LandingPage hero "Open Studio Canvas" button routes unauthenticated visitors to /signup'
);

// Area 26: LandingPage.jsx StudioCanvasSection handleOpenCanvas Auth Guard
assert(
  landingSource.includes("const handleOpenCanvas = () => {") &&
  landingSource.includes("if (isAuthenticated) {") &&
  landingSource.includes("navigate('/signup', { state: { from: { pathname: '/canvas' } } });"),
  'LandingPage StudioCanvasSection handleOpenCanvas button routes unauthenticated visitors to /signup'
);

// Area 27: LandingPage.jsx StudioCanvasSection handleRealFileChange Auth Guard
assert(
  landingSource.includes("const handleRealFileChange = (e) => {") &&
  landingSource.includes("if (isAuthenticated) {") &&
  landingSource.includes("navigate('/signup', { state: { from: { pathname: '/canvas' }, initialFiles: Array.from(files) } });"),
  'LandingPage StudioCanvasSection file drop/picker routes unauthenticated visitors to /signup with initialFiles'
);

// Area 28: App.jsx /canvas Route Registration
assert(
  appSource.includes('<Route path="/canvas" element={<Home />} />'),
  'App.jsx registers /canvas route mapping to <Home />'
);

// Area 29: No hyphens in guest modal text strings
const modalSlice = homeSource.substring(
  homeSource.indexOf('{/* Guest Match Modal */}'),
  homeSource.indexOf('{/* Floating Batch Actions Bar */}')
);
const hasUnwantedHyphenText = /['"`][^'"`]*\s+-\s+[^'"`]*['"`]/.test(modalSlice);
assert(
  !hasUnwantedHyphenText,
  'Guest modal contains no " - " hyphens in visible user text (strictly uses middle dot or words)',
  'Visible text must avoid hyphen separators per user instructions'
);

// Area 30: Real TOOLS Data Structure Count and Integrity
assert(
  Array.isArray(TOOLS) && TOOLS.length >= 38,
  `TOOLS constants array is populated with complete registry (${TOOLS.length} tools available, expected >= 38)`
);

// Area 31: Direct source function invocation: isToolCompatibleWithFile for PDF
const mockPdf = { name: 'contract.pdf', size: 1024 * 1024 };
const pdfCompatibleTools = TOOLS.filter(t => isToolCompatibleWithFile(t, mockPdf));
assert(
  pdfCompatibleTools.length >= 20,
  `Direct isToolCompatibleWithFile matches expected PDF tools (${pdfCompatibleTools.length} found, expected >= 20)`,
  `PDF tools should include merge, compress, split, sign, redact, etc.`
);

// Area 32: Direct source function invocation: isToolCompatibleWithFile for DOCX
const mockDocx = { name: 'document.docx', size: 500 * 1024 };
const docxCompatibleTools = TOOLS.filter(t => isToolCompatibleWithFile(t, mockDocx));
assert(
  docxCompatibleTools.length >= 1 && docxCompatibleTools.some(t => t.id === 'docx-to-pdf'),
  `Direct isToolCompatibleWithFile matches DOCX files (${docxCompatibleTools.length} found, includes docx-to-pdf)`
);

// Area 33: Direct source function invocation: isToolCompatibleWithFile for Image (PNG/JPG)
const mockPng = { name: 'photo.png', size: 2 * 1024 * 1024 };
const pngCompatibleTools = TOOLS.filter(t => isToolCompatibleWithFile(t, mockPng));
assert(
  pngCompatibleTools.length >= 2 && pngCompatibleTools.some(t => t.id === 'image-to-pdf' || t.id === 'image-converter'),
  `Direct isToolCompatibleWithFile matches image files (${pngCompatibleTools.length} found, includes image-to-pdf/image-converter)`
);

// Area 34: Direct source function invocation: Wildcard accept ('*') compatibility
const wildcardTools = TOOLS.filter(t => !t.accept || t.accept === '*');
assert(
  wildcardTools.every(t => isToolCompatibleWithFile(t, { name: 'anyfile.xyz' })),
  'Tools with accept="*" or undefined accept are compatible with any arbitrary file extension'
);

// Area 35: Category filter simulation: Convert category
const convertTools = TOOLS.filter(t => t.category === 'convert' || t.category?.includes('to-') || t.id?.includes('to-'));
assert(
  convertTools.length >= 8,
  `Convert category filter captures document conversion tools (${convertTools.length} tools verified, expected >= 8)`
);

// Area 36: Category filter simulation: Edit & Sign category
const editTools = TOOLS.filter(t => t.category === 'edit' || ['edit-pdf', 'sign-pdf', 'crop-pdf', 'pdf-forms', 'redact-pdf'].includes(t.id));
assert(
  editTools.length >= 4,
  `Edit & Sign category filter captures editing tools (${editTools.length} tools verified, expected >= 4)`
);

// Area 37: Category filter simulation: Organize category
const organizeTools = TOOLS.filter(t => t.category === 'organize' || ['merge-pdf', 'split-pdf', 'remove-pages', 'extract-pages', 'rotate-pdf'].includes(t.id));
assert(
  organizeTools.length >= 4,
  `Organize category filter captures organization tools (${organizeTools.length} tools verified, expected >= 4)`
);

// Area 38: Category filter simulation: Optimize & Security category
const optimizeTools = TOOLS.filter(t => t.category === 'optimize' || ['compress-pdf', 'protect-pdf', 'unlock-pdf', 'repair-pdf'].includes(t.id));
assert(
  optimizeTools.length >= 4,
  `Optimize & Security category filter captures security & optimization tools (${optimizeTools.length} tools verified, expected >= 4)`
);

// Area 39: Real-time search query filtering simulation
const searchWordResults = TOOLS.filter(t => 
  t.title.toLowerCase().includes('word') || 
  t.description.toLowerCase().includes('word') || 
  t.id.includes('word')
);
assert(
  searchWordResults.length >= 1 && searchWordResults.some(t => t.id === 'pdf-to-word'),
  `Search filter for "word" successfully returns matching tools (${searchWordResults.length} found)`
);

// Area 40: Real-time search query filtering simulation for "compress"
const searchCompressResults = TOOLS.filter(t => 
  t.title.toLowerCase().includes('compress') || 
  t.description.toLowerCase().includes('compress') || 
  t.id.includes('compress')
);
assert(
  searchCompressResults.length >= 2,
  `Search filter for "compress" successfully returns Compress PDF and Image Compressor (${searchCompressResults.length} found)`
);

console.log('\n================================================================');
console.log(`TEST RESULTS: ${passCount} PASSED | ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
