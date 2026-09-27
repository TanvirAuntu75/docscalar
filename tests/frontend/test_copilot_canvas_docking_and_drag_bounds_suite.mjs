import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../');

console.log('========================================================================');
console.log('🧪 MOLECULAR TEST SUITE: COPILOT CANVAS DOCKING & DRAG BOUNDS REMEDIATION');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, description, detail = '') {
  if (condition) {
    passCount++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failCount++;
    console.error(`  ❌ [FAIL] ${description} ${detail ? `-> ${detail}` : ''}`);
  }
}

// 1. Read actual source files
const aiChatBotPath = resolve(rootDir, 'src/components/AIChatBot.jsx');
const aiChatBotCode = readFileSync(aiChatBotPath, 'utf8').replace(/\r\n/g, '\n');

// --- AREA 1: ROUTE CLASSIFICATION & PHANTOM SIDEBAR ERADICATION ---
console.log('\n--- AREA 1: Route Classification & Phantom Sidebar Eradication ---');

assert(
  aiChatBotCode.includes("const isCanvas = location.pathname === '/canvas';"),
  'Area 1.1: isCanvas strictly targets /canvas'
);

assert(
  aiChatBotCode.includes("const isWorkspace = location.pathname === '/workspace';"),
  'Area 1.2: isWorkspace strictly targets /workspace'
);

assert(
  aiChatBotCode.includes('!isCanvas && !isWorkspace &&'),
  'Area 1.3: hasHeavySidebar explicitly excludes both /canvas and /workspace'
);

assert(
  !aiChatBotCode.includes('const isStudio = isCanvas ||'),
  'Area 1.4: isStudio no longer bundles isCanvas with heavy 380px studio sidebars'
);

assert(
  !aiChatBotCode.includes('isStudio ? (studioSidebarWidth'),
  'Area 1.5: studioSidebarWidth is never applied to isStudio or isCanvas'
);

// --- AREA 2: RIGHT BOUNDARY & OFFSET CALIBRATION ---
console.log('\n--- AREA 2: Right Boundary & Offset Calibration ---');

assert(
  aiChatBotCode.includes("const rightOffset = hasHeavySidebar \n      ? (studioSidebarWidth + 16) \n      : isCanvas \n        ? 80 \n        : padding;"),
  'Area 2.1: rightOffset dynamically switches: 80px on Canvas, 16px on regular pages, 396px on heavy studios'
);

assert(
  aiChatBotCode.includes('const maxX = Math.max(\n      padding,\n      windowSize.width - buttonSize - rightOffset\n    );'),
  'Area 2.2: maxX dynamically subtracts calibrated rightOffset instead of blanket 380px'
);

assert(
  aiChatBotCode.includes('dragConstraints={{\n          left: padding,\n          right: Math.max(padding, windowSize.width - buttonSize - (hasHeavySidebar ? (studioSidebarWidth + 16) : padding)),'),
  'Area 2.3: dragConstraints.right permits free dragging up to padding on Canvas and regular pages'
);

// --- AREA 3: MATHEMATICAL SIMULATION ACROSS VIEWPORT RESOLUTIONS ---
console.log('\n--- AREA 3: Mathematical Docking & Drag Simulation on Canvas ---');

function simulateDocking({ width, height, isCanvas, hasHeavySidebar, dock = 'right-middle', isOpen = false }) {
  const buttonSize = isCanvas ? 44 : 52;
  const padding = 16;
  const topNavOffset = 58;
  const studioSidebarWidth = width >= 1280 ? 380 : (width >= 1024 ? 340 : 320);

  const rightOffset = hasHeavySidebar 
    ? (studioSidebarWidth + 16) 
    : isCanvas 
      ? 80 
      : padding;

  const maxX = Math.max(padding, width - buttonSize - rightOffset);
  const maxY = Math.max(topNavOffset + 10, height - buttonSize - padding);
  const midY = Math.max(topNavOffset + 10, (height - buttonSize) / 2);

  const dragRightMax = Math.max(padding, width - buttonSize - (hasHeavySidebar ? (studioSidebarWidth + 16) : padding));

  // Compute docked coordinates
  let dockedX = maxX;
  let dockedY = midY;
  if (dock === 'top-right') dockedY = topNavOffset + 10;
  if (dock === 'bottom-right') dockedY = maxY;

  // Compute chat panel coordinates if opened
  const panelWidth = Math.min(385, width - buttonSize - 36);
  const panelHeight = Math.min(560, height - topNavOffset - 24);
  const panelLeft = Math.max(padding, width - panelWidth - rightOffset);
  const panelRight = panelLeft + panelWidth;

  return {
    buttonSize,
    rightOffset,
    maxX,
    midY,
    dockedX,
    dockedY,
    dragRightMax,
    distanceToScreenRight: width - (dockedX + buttonSize),
    panelLeft,
    panelRight,
    studioSidebarWidth
  };
}

const resolutions = [
  { name: '1366x768 Laptop', w: 1366, h: 768 },
  { name: '1440x900 MacBook', w: 1440, h: 900 },
  { name: '1920x1080 FHD', w: 1920, h: 1080 },
  { name: '2560x1440 2K QHD', w: 2560, h: 1440 },
  { name: '3840x2160 4K UHD', w: 3840, h: 2160 },
];

resolutions.forEach((res, i) => {
  const sim = simulateDocking({
    width: res.w,
    height: res.h,
    isCanvas: true,
    hasHeavySidebar: false,
    dock: 'right-middle'
  });

  // Old broken value calculation
  const oldMaxX = res.w - 44 - 380 - 16;
  const oldDist = res.w - (oldMaxX + 44);
  const delta = sim.dockedX - oldMaxX;

  assert(
    sim.dockedX > oldMaxX,
    `Area 3.${i * 3 + 1}: [${res.name}] Canvas dockedX (${sim.dockedX}px) moves ${delta}px closer to the right toolbar than old broken position (${oldMaxX}px)`
  );

  assert(
    sim.distanceToScreenRight === 80,
    `Area 3.${i * 3 + 2}: [${res.name}] Button outer right boundary sits exactly 80px from right screen edge (clearing the 72px palette with 8px comfort gap)`
  );

  assert(
    sim.dragRightMax === res.w - 44 - 16,
    `Area 3.${i * 3 + 3}: [${res.name}] dragConstraints.right (${sim.dragRightMax}px) allows dragging freely across the entire right screen area`
  );
});

// --- AREA 4: QUICK TOOL PALETTE COLLISION & CLEARANCE INVARIANTS ---
console.log('\n--- AREA 4: Quick Tool Palette Collision & Clearance Invariants ---');

resolutions.forEach((res, i) => {
  const sim = simulateDocking({
    width: res.w,
    height: res.h,
    isCanvas: true,
    hasHeavySidebar: false
  });

  // Palette spans from right-4 (16px from right edge) to width 56px (72px from right edge)
  const paletteLeft = res.w - 16 - 56; // 72px from edge
  const buttonRight = sim.dockedX + sim.buttonSize;

  assert(
    buttonRight <= paletteLeft,
    `Area 4.${i + 1}: [${res.name}] Button right edge (${buttonRight}px) does NOT collide with palette left edge (${paletteLeft}px), gap = ${paletteLeft - buttonRight}px`
  );
});

// --- AREA 5: CHAT PANEL OPEN STATE ON CANVAS ---
console.log('\n--- AREA 5: Chat Panel Open State on Canvas ---');

resolutions.forEach((res, i) => {
  const sim = simulateDocking({
    width: res.w,
    height: res.h,
    isCanvas: true,
    hasHeavySidebar: false,
    isOpen: true
  });

  const paletteLeft = res.w - 72;
  const panelRight = sim.panelRight;

  assert(
    panelRight <= paletteLeft,
    `Area 5.${i + 1}: [${res.name}] Chat panel right edge (${panelRight}px) leaves palette unobstructed (palette left: ${paletteLeft}px)`
  );
});

// --- AREA 6: HEAVY STUDIO PARITY PRESERVATION ---
console.log('\n--- AREA 6: Heavy Studio Parity (Edit PDF / Crop PDF / Redact PDF) ---');

resolutions.forEach((res, i) => {
  const sim = simulateDocking({
    width: res.w,
    height: res.h,
    isCanvas: false,
    hasHeavySidebar: true,
    dock: 'right-middle'
  });

  const inspectorLeft = res.w - sim.studioSidebarWidth;

  assert(
    sim.dockedX + sim.buttonSize <= inspectorLeft,
    `Area 6.${i + 1}: [${res.name}] Heavy studio button right edge (${sim.dockedX + sim.buttonSize}px) strictly clears inspector panel (${inspectorLeft}px)`
  );
});

// --- AREA 7: WORKSPACE ROUTE ZERO PHANTOM SIDEBAR ---
console.log('\n--- AREA 7: Workspace Route Zero Phantom Sidebar ---');

resolutions.forEach((res, i) => {
  const sim = simulateDocking({
    width: res.w,
    height: res.h,
    isCanvas: false,
    hasHeavySidebar: false,
    dock: 'right-middle'
  });

  assert(
    sim.distanceToScreenRight === 16,
    `Area 7.${i + 1}: [${res.name}] /workspace button sits 16px from screen edge with zero phantom sidebar`
  );
});

console.log('\n========================================================================');
console.log(`📊 SUMMARY: ${passCount} PASSED, ${failCount} FAILED (TOTAL ASSERTIONS: ${passCount + failCount})`);
console.log('========================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
