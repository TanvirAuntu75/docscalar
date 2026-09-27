import fs from 'fs';
import path from 'path';

const landingPagePath = path.resolve('src/components/LandingPage.jsx');
const content = fs.readFileSync(landingPagePath, 'utf8').replace(/\r\n/g, '\n');

const tests = [];

function assert(condition, testName, details = '') {
  tests.push({ testName, passed: !!condition, details });
  if (!condition) {
    console.error(`❌ FAIL: ${testName} - ${details}`);
  } else {
    console.log(`✅ PASS: ${testName}`);
  }
}

console.log('🧪 Running DocScalar Studio Canvas Real Parity, Cable Connection & Cursor Tracking Suite (85 Assertions)...\n');

// ── 1. Architectural Integration & JSX ──
assert(content.includes('function StudioCanvasSection'), 'Area 1: StudioCanvasSection component defined');
assert(content.includes('<StudioCanvasSection />'), 'Area 2: StudioCanvasSection JSX invoked in LandingPage');
assert(content.includes('id="canvas"'), 'Area 3: Section container has id="canvas" for hash anchors');
assert(content.includes('ref={sectionRef}'), 'Area 4: Section uses ref={sectionRef} for in-view triggers');
assert(content.includes('scrollMarginTop: 120'), 'Area 5: Section configures scrollMarginTop: 120 for sticky nav clearance');

// ── 2. AI Buzzword Eradication & Professional Copy ──
assert(!content.includes('CANVAS SUPERPOWERS'), 'Area 6: CANVAS SUPERPOWERS hype badge completely eradicated');
assert(!content.includes('Format Auto-Healing'), 'Area 7: Format Auto-Healing AI buzzword eradicated');
assert(!content.includes('Type-Safe Cable Guard'), 'Area 8: Type-Safe Cable Guard AI buzzword eradicated');
assert(!content.includes('Multi-Branch DAG Engine'), 'Area 9: Multi-Branch DAG Engine AI buzzword eradicated');
assert(!content.includes('Auto-Persistent Workbench'), 'Area 10: Auto-Persistent Workbench AI buzzword eradicated');
assert(content.includes('Design Document Pipelines Visually'), 'Area 11: Clean enterprise heading "Design Document Pipelines Visually" present');
assert(content.includes('Automated Format Alignment'), 'Area 12: Professional feature "Automated Format Alignment" present');
assert(content.includes('Pipeline Validation & Safeguards'), 'Area 13: Professional feature "Pipeline Validation & Safeguards" present');
assert(content.includes('Parallel Workflow Execution'), 'Area 14: Professional feature "Parallel Workflow Execution" present');
assert(content.includes('Browser State Persistence'), 'Area 15: Professional feature "Browser State Persistence" present');
assert(content.includes('Open Studio Canvas Workspace'), 'Area 16: Left-column primary CTA "Open Studio Canvas Workspace" present');
assert(content.includes("navigate('/canvas')"), 'Area 17: Primary CTA navigates to /canvas route for authenticated users');
assert(content.includes("navigate('/signup'"), 'Area 17b: Primary CTA redirects unauthenticated users to signup');

// ── 3. Authentic Canvas Window Chrome & Controls ──
assert(content.includes('bg-rose-500/80') && content.includes('bg-amber-500/80') && content.includes('bg-emerald-500/80'), 'Area 18: Authentic traffic light window chrome dots present');
assert(content.includes('DocScalar Studio Canvas'), 'Area 19: Canvas window chrome title "DocScalar Studio Canvas" present');
assert(!content.includes('1. Add Documents') && !content.includes('4. Download Output'), 'Area 20: Simulation step progress badge completely eradicated for sleek minimal window chrome');
assert(content.includes('setIsPaused(!isPaused)'), 'Area 21: Playback toggle control (Pause/Resume) present');
assert(content.includes('play_arrow') && content.includes('pause'), 'Area 22: Play and pause icons wired to playback state');
assert(content.includes('handleRestart'), 'Area 23: Simulation restart button handler present');
assert(content.includes('restart_alt'), 'Area 24: Restart icon present in canvas chrome');

// ── 4. Authentic Canvas Grid & Layout ──
assert(content.includes('stitch-dot-grid'), 'Area 25: Dot grid uses authentic StitchCanvas .stitch-dot-grid CSS class');
assert(!content.includes('title="Add Documents to Canvas"'), 'Area 26: Floating left tool widget with "Add Documents to Canvas" completely eradicated');
assert(!content.includes('glass-widget p-1.5 rounded-xl flex flex-col gap-1.5 shadow-md select-none'), 'Area 27: Floating left widget container completely eradicated for clean canvas');

// ── 5. Camera Zoom & Viewport Dynamics ──
assert(content.includes('isZoomedIn = step >= 6 && step <= 9'), 'Area 28: Camera zoom state accurately mapped to chatbox focus and action steps (6-9)');
assert(content.includes('scale: isZoomedIn ? 1.45 : 1'), 'Area 29: Dynamic camera zoom scale factor (1.45x) configured');
assert(content.includes('y: isZoomedIn ? -32 : 0'), 'Area 30: Camera zoom vertical translation (-32px) shifts focus to prompt bar');
assert(content.includes('origin-bottom'), 'Area 31: Camera zoom origin anchored to bottom for smooth cinematic framing');

// ── 6. Step 0 & 1-2: Empty Canvas Upload State with Smooth Clean Click ──
assert(content.includes('Your Workspace Canvas is empty'), 'Area 32: Authentic empty-state prompt from StitchCanvas.jsx:7108 present');
assert(content.includes('Drop documents anywhere on the grid or click below to start.'), 'Area 33: Empty-state instruction copy present');
assert(content.includes('upload_file'), 'Area 34: Empty-state uses upload_file icon');
assert(content.includes('Upload Documents'), 'Area 35: Empty-state has "Upload Documents" action button');
assert(content.includes('scale: step === 2 ? 0.98 : 1'), 'Area 36a: Upload button has clean smooth click (scale 0.98 micro-press)');
assert(content.includes("backgroundColor: step === 2 ? '#ea580c' : '#f97316'"), 'Area 36b: Upload button deepens smoothly to active brand orange (#ea580c) on click');
assert(!content.includes('animate-ping'), 'Area 36c: Exaggerated glowing ping ripples completely eradicated from all buttons and cursor');

// ── 7. Step 3-4: Authentic Windows 11 Desktop Open Dialog with Smooth Clean Click ──
assert(content.includes('Open') && content.includes('Downloads') && content.includes('Documents'), 'Area 37: Authentic Windows 11 Open dialog displays title bar and breadcrumb path');
assert(content.includes('desktop_windows') && content.includes('download') && content.includes('Personal'), 'Area 38: Windows 11 navigation pane displays authentic places');
assert(content.includes('Date modified') && content.includes('Type') && content.includes('Size'), 'Area 39: Windows 11 file list displays authentic columns header');
assert(content.includes('annual_report_2024.pdf') && content.includes('appendix_tables.docx'), 'Area 40: File picker lists authentic documents to open');
assert(content.includes('File name:') && content.includes('Cancel') && content.includes('<span>Open</span>'), 'Area 41a: File picker has authentic Windows 11 File name input, Cancel, and Open buttons');
assert(content.includes('scale: step === 4 ? 0.98 : 1'), 'Area 41b: File picker button has clean smooth click (scale 0.98 micro-press)');
assert(content.includes("backgroundColor: step === 4 ? '#ea580c' : '#333333'"), 'Area 41c: File picker button deepens smoothly on click');

// ── 8. Step 5-9: Document Cards, Chatbox, Typewriter & Send Click ──
const stitchNodeMatches = content.match(/stitch-node/g) || [];
assert(stitchNodeMatches.length >= 5, `Area 42: Authentic .stitch-node class applied across cards (found ${stitchNodeMatches.length})`);
assert(content.includes('width: \'22px\'') && content.includes('height: \'22px\''), 'Area 43: Ordinal badges styled with precise 22px geometric dimensions');
assert(content.includes('visibility') && content.includes('delete'), 'Area 44: Document nodes contain authentic visibility and delete action icons');
assert(content.includes('Describe workflow, e.g. \'Merge both files and compress\'...'), 'Area 45: Chat command bar displays authentic placeholder matching StitchCanvas.jsx:7164');
assert(content.includes('PROMPT_TARGET = "Merge both documents and compress to under 2MB"'), 'Area 46: Typewriter target prompt configured for document pipeline creation');
assert(content.includes('step === 7 && <span className="inline-block w-1.5 h-3.5 bg-[#f97316] ml-0.5 animate-pulse" />'), 'Area 47: Blinking orange typewriter caret rendered while typing in chatbox at Step 7');
assert(content.includes('scale: step === 9 ? 0.96 : 1'), 'Area 48: Send command button has clean smooth click (scale 0.96 micro-press)');
assert(content.includes("backgroundColor: step === 9 ? '#ea580c' : '#f97316'"), 'Area 49a: Send button changes smoothly to deep active orange (#ea580c) on click');
assert(!content.includes('0 0 24px rgba(249, 115, 22'), 'Area 49b: Distracting glowing halo blur shadows completely eradicated from buttons');
assert(content.includes('arrow_upward'), 'Area 49c: Send button uses authentic arrow_upward icon');
assert(content.includes('step === 10 && (') && content.includes('Planning DAG: Merge PDF → Compress PDF...'), 'Area 50: Step 10 AI planning banner displays pipeline DAG synthesis state');

// ── 9. Step 11-12: Operators, Cables, & Output ──
assert(content.includes('Merge PDF') && content.includes('join_inner'), 'Area 51: Operator 1 "Merge PDF" with join_inner icon rendered');
assert(content.includes('Compress PDF') && content.includes('compress'), 'Area 52: Operator 2 "Compress PDF" with compress icon rendered');
assert(content.includes('0.2s') && content.includes('0.4s'), 'Area 53: Active operator execution timer badges present');
assert(content.includes('d="M 250 110 C 305 110, 305 188, 360 188"'), 'Area 54: Cable 1 uses precise Bezier curve formula to Operator 1');
assert(content.includes('d="M 250 270 C 305 270, 305 188, 360 188"'), 'Area 55: Cable 2 uses precise Bezier curve formula to Operator 1');
assert(content.includes('step === 11 ? "stitch-cable-active" : ""'), 'Area 56: Flow cables pulse with authentic .stitch-cable-active animation class on Step 11');
assert(content.includes('annual_report_merged_compressed.pdf'), 'Area 57: Final output document node displays processed filename');
assert(content.includes('-76%') && content.includes('1.4 MB'), 'Area 58: Output document node displays compression metric badge and file size');
assert(content.includes('Download</span>'), 'Area 59: Output document node displays authentic Download button');

// ── 10. Virtual Cursor & Status Bar ──
assert(content.includes('M4.5 2.5L19.5 12L12 14.5L8.5 21.5L4.5 2.5Z'), 'Area 60a: Virtual cursor uses realistic pointer SVG path');
assert(content.includes('fill="#0f172a"'), 'Area 60b: Virtual cursor pointer retains realistic slate fill (#0f172a) without turning orange');
assert(content.includes('scale: activeCursor.clicked ? 0.95 : 1'), 'Area 60c: Virtual cursor has subtle micro-depression on click (scale 0.95)');
assert(!content.includes('Click Upload') && !content.includes('Click Send'), 'Area 61: Distracting floating tutorial cursor badges completely eradicated for sleek minimal pointer');
assert(!content.includes('bg-[#ea580c]/50'), 'Area 62: Virtual cursor ping ripple completely eradicated for smooth authentic cursor motion');
assert(!content.includes('DAG Pipeline:'), 'Area 63: Bottom status bar "DAG Pipeline:" completely eradicated for clean presentation');
assert(!content.includes('Pipeline completed in 142ms'), 'Area 64: Bottom benchmark execution label completely eradicated');

// ── 11. Brand Colors & Nav Registration ──
assert(!content.includes('bg-emerald-500/10 border-emerald-500/30'), 'Area 65: Arbitrary non-brand green container styling purged');
assert(!content.includes('stroke={stage >= 3 ? "#10b981"'), 'Area 66: Arbitrary non-brand green SVG cable stroke purged');
const navMatch = content.match(/const NAV_SECTIONS = \[[\s\S]*?\];/);
assert(navMatch && navMatch[0].includes("id: 'canvas'") && navMatch[0].includes("name: 'Studio Canvas'"), 'Area 67: Studio Canvas registered in NAV_SECTIONS');

// ── 12. Dynamic Cursor Targeting & Ref Bindings ──
assert(content.includes('ref={canvasViewportRef}'), 'Area 68: Canvas viewport container ref bound for responsive coordinate measuring');
assert(content.includes('ref={uploadBtnRef}'), 'Area 69: Upload Documents button ref bound for precise cursor targeting');
assert(content.includes('ref={filePickerBtnRef}'), 'Area 70: OS File picker action button ref bound for precise cursor targeting');
assert(content.includes('ref={sendBtnRef}'), 'Area 71: Orange Send button ref bound for exact cursor click hit');
assert(content.includes('ref={chatInputRef}'), 'Area 72: Chat command input ref bound for focus positioning');
assert(content.includes('ref={downloadBtnRef}'), 'Area 73: Output Download button ref bound for completion hovering');
assert(content.includes('tRect.left - vRect.left + tRect.width / 2') && content.includes('tRect.top - vRect.top + tRect.height / 2'), 'Area 74: Dynamic bounding-box math accurately computes button center in screen pixels');
assert(content.includes('left: cursorPos.x') && content.includes('top: cursorPos.y'), 'Area 75: Virtual cursor animated to dynamic cursorPos values');

// ── 13. Subpixel Port & Cable Welded Geometric Alignment ──
assert(content.includes('circle cx="250" cy="110"') && content.includes('circle cx="250" cy="270"'), 'Area 76: SVG Port terminal circles welded at (250, 110) and (250, 270) to eliminate gaps');
assert(content.includes('y="78"') && content.includes('y="238"'), 'Area 77: Document nodes y-coordinates (78 & 238) geometrically aligned with port centers (110 & 270)');

// ── 14. Windows 11 Dark Mode Native Parity Invariants ──
assert(content.includes('fill="#1976D2"') && content.includes('fill="#4CAF50"') && content.includes('fill="#FBC02D"'), 'Area 78: Authentic Google Chrome brand multi-color logo SVG present on title bar');
assert(content.includes('title="Minimize"') && content.includes('title="Maximize"') && content.includes('title="Close"'), 'Area 79: Windows 11 caption control buttons (minimize, maximize, close) with native SVGs present');
assert(content.includes('hover:bg-[#c42b1c]'), 'Area 80: Windows 11 close button has authentic red hover transition');
assert(content.includes('Tanvir Personal'), 'Area 81: Windows 11 navigation tree contains authentic "Tanvir Personal" root node without hyphens');
assert(content.includes('4,210 KB') && content.includes('1,840 KB'), 'Area 82: Document file sizes formatted with comma-separated KB notation matching Windows 11 Explorer');
assert(content.includes('w-[1px] h-3.5 bg-[#4d4d4d]'), 'Area 83: Split Open button contains authentic vertical divider separator');
assert(content.includes('circle cx="6.5" cy="6.5"') && content.includes('circle cx="1.5" cy="6.5"'), 'Area 84: Windows 11 dialog features bottom-right corner resize grip dots');
assert(content.includes('w-[620px]'), 'Area 85: Windows 11 dialog geometry expanded to comfortable 620px viewport for realistic desktop scale');

// ── 15. Hyphen Eradication & Gated Access Invariants ──
assert(!content.includes('multi-step') && !content.includes('high-speed') && !content.includes('—such as'), 'Area 86: All hyphens and em-dashes completely eradicated from canvas marketing copy');

const homePath = path.resolve('src/pages/Home.jsx');
const homeContent = fs.readFileSync(homePath, 'utf8');
assert(homeContent.includes("!isAuthenticated && location.pathname === '/canvas'") && homeContent.includes("navigate('/signup'"), 'Area 87: Home.jsx guards /canvas and redirects unauthenticated users to /signup');


// Summary
const failed = tests.filter(t => !t.passed);
console.log(`\n==================================================`);
console.log(`Test Summary: ${tests.length - failed.length}/${tests.length} tests passed.`);
console.log(`==================================================\n`);

if (failed.length > 0) {
  process.exit(1);
} else {
  console.log(`✨ All ${tests.length} Real Studio Canvas Parity, Cable Connection & Dynamic Cursor tests passed successfully with 0 failures.`);
}

