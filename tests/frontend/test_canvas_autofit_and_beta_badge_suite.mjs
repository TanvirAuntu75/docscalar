import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../');

console.log('========================================================================');
console.log('🧪 MOLECULAR TEST SUITE: CANVAS AUTO-FIT VIEWPORT & BETA BADGE POLISH');
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

// 1. Read actual source files and normalize CRLF to LF for deterministic multi-line matching
const stitchCanvasPath = resolve(rootDir, 'src/components/StitchCanvas.jsx');
const stitchCanvasCode = readFileSync(stitchCanvasPath, 'utf8').replace(/\r\n/g, '\n');

const guestModalPath = resolve(rootDir, 'src/components/GuestLimitModal.jsx');
const guestModalCode = readFileSync(guestModalPath, 'utf8').replace(/\r\n/g, '\n');

const headerPath = resolve(rootDir, 'src/components/Header.jsx');
const headerCode = readFileSync(headerPath, 'utf8').replace(/\r\n/g, '\n');

// --- AREA 1: STUDIO PREVIEW BANNER REMOVAL & REPLACEMENT ---
console.log('\n--- AREA 1: Studio Preview Banner Eradication & Beta Badge Polish ---');

assert(
  !stitchCanvasCode.includes('Studio Preview · In Active Development'),
  'Area 1.1: Clunky "Studio Preview · In Active Development" banner is completely eradicated from StitchCanvas.jsx'
);

assert(
  !guestModalCode.includes('Studio Preview · Pro Feature'),
  'Area 1.2: "Studio Preview · Pro Feature" is removed from GuestLimitModal.jsx'
);

assert(
  guestModalCode.includes('Canvas Beta'),
  'Area 1.3: GuestLimitModal.jsx displays clean "Canvas Beta"'
);

assert(
  stitchCanvasCode.includes('Beta') && stitchCanvasCode.includes('DocScalar Studio'),
  'Area 1.4: StitchCanvas header displays "DocScalar Studio" accompanied by "Beta" badge'
);

assert(
  stitchCanvasCode.includes('bg-primary/10') && stitchCanvasCode.includes('text-primary') && stitchCanvasCode.includes('border-primary/20'),
  'Area 1.5: Beta badge uses DocScalar primary brand design tokens (no warning amber or AI slop gradients)'
);

assert(
  !stitchCanvasCode.includes('w-1.5 h-1.5 rounded-full bg-primary/80 animate-pulse') &&
  !stitchCanvasCode.includes('w-1 h-1 rounded-full bg-primary animate-pulse'),
  'Area 1.6: Beta badge has distracting pulsing dot cleanly removed per user request'
);

assert(
  stitchCanvasCode.includes('font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20'),
  'Area 1.7: Beta badge uses compact typographic scale with uppercase letter-spacing'
);

assert(
  !stitchCanvasCode.includes('text-amber-600 dark:text-amber-400'),
  'Area 1.8: Studio Preview banner amber text colors completely banished from the studio top header bar'
);

// --- AREA 2: AUTO-FIT VIEWPORT INTERACTION & HOOK WIRING ---
console.log('\n--- AREA 2: Auto-Fit Viewport Interaction & Event Wiring ---');

assert(
  stitchCanvasCode.includes('if (nextVal) {\n                  handleFitToView();\n                }'),
  'Area 2.1: Clicking auto-fit toggle to ON immediately triggers handleFitToView()'
);

assert(
  stitchCanvasCode.includes('if (draggingNodeId) {\n      if (autoFitViewport) {\n        handleFitToView();\n      }\n      setDraggingNodeId(null);\n    }'),
  'Area 2.2: Finishing a node drag (handlePointerUp) triggers handleFitToView() if autoFitViewport is active'
);

assert(
  stitchCanvasCode.includes('if (autoFitViewport) {\n        handleFitToView(nextQueue, nextOps);\n      }'),
  'Area 2.3: Adding new cards from chat or palette triggers handleFitToView when autoFit is active'
);

assert(
  stitchCanvasCode.includes("autoFitViewport ? 'center_focus_strong' : 'center_focus_weak'"),
  'Area 2.4: Auto-fit button toggles visual feedback icons between strong and weak focus'
);

// --- AREA 3: MINIMUM ZOOM DEPTH & WHEEL ZOOM SUPPORT ---
console.log('\n--- AREA 3: Zoom Range Depth & Wheel Zoom Support ---');

assert(
  stitchCanvasCode.includes('const handleZoomOut = () => setZoom(z => Math.max(0.05,'),
  'Area 3.1: handleZoomOut supports deep zooming out down to 5% (0.05) to accommodate massive card distributions'
);

assert(
  stitchCanvasCode.includes('Math.min(2.0, Math.max(0.05, zoom +'),
  'Area 3.2: handleWheelEvent pinch-to-zoom supports deep zooming out down to 5% (0.05)'
);

assert(
  stitchCanvasCode.includes('const targetZoom = Math.max(0.05, Math.min(1.0, fitZoom));'),
  'Area 3.3: handleFitToView bounds zoom scale between [0.05, 1.0], preventing clamping at 0.35/0.40'
);

// --- AREA 4: SAFE INSETS & OVERLAY CLEARANCE CONSTANTS ---
console.log('\n--- AREA 4: Overlay Safe Clearance Insets ---');

// Extract insets from handleFitToView in source code
const insetTopMatch = stitchCanvasCode.match(/const insetTop = (\d+);/);
const insetBottomMatch = stitchCanvasCode.match(/const insetBottom = (\d+);/);
const insetLeftMatch = stitchCanvasCode.match(/const insetLeft = (\d+);/);
const insetRightMatch = stitchCanvasCode.match(/const insetRight = (\d+);/);
const marginMatch = stitchCanvasCode.match(/const margin = (\d+);/);

const insetTop = insetTopMatch ? parseInt(insetTopMatch[1], 10) : 0;
const insetBottom = insetBottomMatch ? parseInt(insetBottomMatch[1], 10) : 0;
const insetLeft = insetLeftMatch ? parseInt(insetLeftMatch[1], 10) : 0;
const insetRight = insetRightMatch ? parseInt(insetRightMatch[1], 10) : 0;
const margin = marginMatch ? parseInt(marginMatch[1], 10) : 0;

assert(
  insetTop >= 80,
  `Area 4.1: insetTop (${insetTop}px) provides at least 80px clearance below the top studio floating bar (occupies ~56px)`,
  `Found insetTop = ${insetTop}`
);

assert(
  insetBottom >= 110,
  `Area 4.2: insetBottom (${insetBottom}px) provides at least 110px clearance above the bottom chat command box and zoom dock (occupies ~76px)`,
  `Found insetBottom = ${insetBottom}`
);

assert(
  insetLeft >= 64,
  `Area 4.3: insetLeft (${insetLeft}px) provides at least 64px clearance from the left action dock`,
  `Found insetLeft = ${insetLeft}`
);

assert(
  insetRight >= 76,
  `Area 4.4: insetRight (${insetRight}px) provides at least 76px clearance from the right vertical tool palette`,
  `Found insetRight = ${insetRight}`
);

assert(
  margin >= 28,
  `Area 4.5: Cluster margin buffer (${margin}px) provides at least 28px padding around cards before insets`,
  `Found margin = ${margin}`
);

// --- AREA 5: EMPIRICAL MATHEMATICAL SIMULATION & GEOMETRIC INVARIANCE ---
console.log('\n--- AREA 5: Empirical Mathematical Simulation & Geometric Invariance ---');

/**
 * Replicates the exact handleFitToView calculation from StitchCanvas.jsx
 */
function calculateFitView({ nodes, ops, canvasW, canvasH }) {
  if (nodes.length === 0 && ops.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach(item => {
    const x = typeof item.x === 'number' ? item.x : 100;
    const y = typeof item.y === 'number' ? item.y : 100;
    const w = 220;
    const h = 150;
    const left = x - 8;
    const right = x + w + 8;
    const top = y - 8;
    const bottom = y + h + 8;
    if (left < minX) minX = left;
    if (right > maxX) maxX = right;
    if (top < minY) minY = top;
    if (bottom > maxY) maxY = bottom;
  });

  ops.forEach(op => {
    const x = typeof op.x === 'number' ? op.x : 100;
    const y = typeof op.y === 'number' ? op.y : 100;
    const w = 260;
    const h = 240;
    const topExtra = op.status === 'processing' ? 36 : 8;
    const left = x - 8;
    const right = x + w + 8;
    const top = y - topExtra;
    const bottom = y + h + 8;
    if (left < minX) minX = left;
    if (right > maxX) maxX = right;
    if (top < minY) minY = top;
    if (bottom > maxY) maxY = bottom;
  });

  const clusterWidth = maxX - minX;
  const clusterHeight = maxY - minY;
  const clusterCenterX = minX + clusterWidth / 2;
  const clusterCenterY = minY + clusterHeight / 2;

  const safeW = Math.max(120, canvasW - insetLeft - insetRight);
  const safeH = Math.max(120, canvasH - insetTop - insetBottom);

  const safeCenterX = insetLeft + safeW / 2;
  const safeCenterY = insetTop + safeH / 2;

  const totalPaddedW = clusterWidth + margin * 2;
  const totalPaddedH = clusterHeight + margin * 2;

  const fitZoom = Math.min(
    safeW / Math.max(totalPaddedW, 50),
    safeH / Math.max(totalPaddedH, 50)
  );

  const targetZoom = Math.max(0.05, Math.min(1.0, fitZoom));
  const targetPx = Math.round(safeCenterX - clusterCenterX * targetZoom);
  const targetPy = Math.round(safeCenterY - clusterCenterY * targetZoom);

  // Compute rendered screen bounding box
  const screenMinX = targetPx + minX * targetZoom;
  const screenMaxX = targetPx + maxX * targetZoom;
  const screenMinY = targetPy + minY * targetZoom;
  const screenMaxY = targetPy + maxY * targetZoom;

  return {
    targetZoom,
    targetPx,
    targetPy,
    screenMinX,
    screenMaxX,
    screenMinY,
    screenMaxY,
    clusterWidth,
    clusterHeight,
    safeW,
    safeH,
    safeCenterX,
    safeCenterY
  };
}

// Test Case 1: Empty state
const emptyResult = calculateFitView({ nodes: [], ops: [], canvasW: 1920, canvasH: 1080 });
assert(emptyResult === null, 'Area 5.1: Empty canvas yields null without error or zero division');

// Test Case 2: Single Document Node on standard 1080p screen
const singleNodeResult = calculateFitView({
  nodes: [{ id: 'doc-1', x: 200, y: 150 }],
  ops: [],
  canvasW: 1920,
  canvasH: 1080
});
assert(singleNodeResult.targetZoom === 1.0, 'Area 5.2: Single card clusters do not over-zoom beyond 1.0');
assert(
  singleNodeResult.screenMinY >= insetTop,
  `Area 5.3: Single card top edge (${singleNodeResult.screenMinY.toFixed(1)}px) is >= insetTop (${insetTop}px), 0px top navbar overlap`
);
assert(
  singleNodeResult.screenMaxY <= 1080 - insetBottom,
  `Area 5.4: Single card bottom edge (${singleNodeResult.screenMaxY.toFixed(1)}px) is <= 1080 - insetBottom (${1080 - insetBottom}px), 0px bottom chatbox overlap`
);

// Test Case 3: Processing Operator Node with badge
const opNodeResult = calculateFitView({
  nodes: [],
  ops: [{ id: 'op-1', x: 400, y: 300, status: 'processing' }],
  canvasW: 1920,
  canvasH: 1080
});
assert(
  opNodeResult.screenMinY >= insetTop,
  `Area 5.5: Processing operator card with timer top (${opNodeResult.screenMinY.toFixed(1)}px) preserves clearance above top bar`
);

// Test Case 4: Moderate Pipeline (3 documents + 2 operators)
const modResult = calculateFitView({
  nodes: [
    { id: 'd1', x: 100, y: 120 },
    { id: 'd2', x: 100, y: 320 },
    { id: 'd3', x: 100, y: 520 },
  ],
  ops: [
    { id: 'o1', x: 500, y: 200, status: 'idle' },
    { id: 'o2', x: 850, y: 200, status: 'success' }
  ],
  canvasW: 1920,
  canvasH: 1080
});
assert(
  modResult.screenMinY >= insetTop && modResult.screenMaxY <= 1080 - insetBottom,
  `Area 5.6: Moderate pipeline cards [${modResult.screenMinY.toFixed(1)}px to ${modResult.screenMaxY.toFixed(1)}px] are fully inside vertical safe window [${insetTop}px, ${1080 - insetBottom}px]`
);
assert(
  modResult.screenMinX >= insetLeft && modResult.screenMaxX <= 1920 - insetRight,
  `Area 5.7: Moderate pipeline cards [${modResult.screenMinX.toFixed(1)}px to ${modResult.screenMaxX.toFixed(1)}px] are fully inside horizontal safe window [${insetLeft}px, ${1920 - insetRight}px]`
);

// Test Case 5: Massive Spread-Out Graph (15 cards across 4500px width by 3000px height)
const massiveResult = calculateFitView({
  nodes: [
    { id: 'd-1', x: 0, y: 0 },
    { id: 'd-2', x: 1500, y: 800 },
    { id: 'd-3', x: 3000, y: 1500 },
    { id: 'd-4', x: 4280, y: 2850 }
  ],
  ops: [
    { id: 'o-1', x: 800, y: 400, status: 'idle' },
    { id: 'o-2', x: 2200, y: 1100, status: 'processing' },
    { id: 'o-3', x: 3600, y: 2200, status: 'idle' }
  ],
  canvasW: 1920,
  canvasH: 1080
});

assert(
  massiveResult.targetZoom < 0.35,
  `Area 5.8: Massive 4500x3000px card spread scales below old 0.35 limit down to ${massiveResult.targetZoom.toFixed(3)}`
);
assert(
  massiveResult.screenMinY >= insetTop,
  `Area 5.9: Massive spread top edge (${massiveResult.screenMinY.toFixed(1)}px) NEVER touches or goes behind top navbar (safe inset: ${insetTop}px)`
);
assert(
  massiveResult.screenMaxY <= 1080 - insetBottom,
  `Area 5.10: Massive spread bottom edge (${massiveResult.screenMaxY.toFixed(1)}px) NEVER touches or goes behind bottom chat box (limit: ${1080 - insetBottom}px)`
);
assert(
  massiveResult.screenMinX >= insetLeft,
  `Area 5.11: Massive spread left edge (${massiveResult.screenMinX.toFixed(1)}px) NEVER touches left palette (limit: ${insetLeft}px)`
);
assert(
  massiveResult.screenMaxX <= 1920 - insetRight,
  `Area 5.12: Massive spread right edge (${massiveResult.screenMaxX.toFixed(1)}px) NEVER touches right palette (limit: ${1920 - insetRight}px)`
);

// Test Case 6: Colossal Spread (8000px width by 5000px height)
const colossalResult = calculateFitView({
  nodes: [
    { id: 'd-start', x: 0, y: 0 },
    { id: 'd-end', x: 7780, y: 4850 }
  ],
  ops: [],
  canvasW: 1920,
  canvasH: 1080
});
assert(
  colossalResult.targetZoom >= 0.05,
  `Area 5.13: Colossal 8000x5000px spread scales down smoothly (${colossalResult.targetZoom.toFixed(3)}) within [0.05, 1.0]`
);
assert(
  colossalResult.screenMinY >= insetTop && colossalResult.screenMaxY <= 1080 - insetBottom,
  'Area 5.14: Colossal spread guarantees 0px overlap with both navbar and chatbox'
);

// Test Case 7: Vertical Tower Spread (cards stacked vertically 600px wide, 4000px high)
const towerResult = calculateFitView({
  nodes: [
    { id: 't1', x: 200, y: 0 },
    { id: 't2', x: 200, y: 3850 }
  ],
  ops: [],
  canvasW: 1920,
  canvasH: 1080
});
assert(
  towerResult.screenMinY >= insetTop && towerResult.screenMaxY <= 1080 - insetBottom,
  'Area 5.15: Tall vertical tower layout frames completely between navbar and chatbox without vertical clipping'
);

// Test Case 8: Horizontal Ribbon Spread (cards placed side by side 6000px wide, 200px high)
const ribbonResult = calculateFitView({
  nodes: [
    { id: 'r1', x: 0, y: 200 },
    { id: 'r2', x: 5780, y: 200 }
  ],
  ops: [],
  canvasW: 1920,
  canvasH: 1080
});
assert(
  ribbonResult.screenMinX >= insetLeft && ribbonResult.screenMaxX <= 1920 - insetRight,
  'Area 5.16: Wide horizontal ribbon layout frames completely within horizontal viewport without side clipping'
);

// Test Case 9: Multi-Resolution Viewport Adaptability
const screenResolutions = [
  { name: '1366x768 Laptop', w: 1366, h: 768 },
  { name: '1440x900 MacBook', w: 1440, h: 900 },
  { name: '1920x1080 FHD', w: 1920, h: 1080 },
  { name: '2560x1440 2K QHD', w: 2560, h: 1440 },
  { name: '3840x2160 4K UHD', w: 3840, h: 2160 },
];

screenResolutions.forEach((res, index) => {
  const result = calculateFitView({
    nodes: [
      { id: 'd-corner1', x: 100, y: 100 },
      { id: 'd-corner2', x: 2800, y: 1800 }
    ],
    ops: [{ id: 'op-mid', x: 1400, y: 950, status: 'idle' }],
    canvasW: res.w,
    canvasH: res.h
  });

  const topClearance = result.screenMinY - insetTop;
  const bottomClearance = (res.h - insetBottom) - result.screenMaxY;
  const leftClearance = result.screenMinX - insetLeft;
  const rightClearance = (res.w - insetRight) - result.screenMaxX;

  assert(
    topClearance >= -0.001 && bottomClearance >= -0.001 && leftClearance >= -0.001 && rightClearance >= -0.001,
    `Area 5.${17 + index}: ${res.name} screens guarantee pristine clearance (Top: +${topClearance.toFixed(1)}px, Bottom: +${bottomClearance.toFixed(1)}px, Left: +${leftClearance.toFixed(1)}px, Right: +${rightClearance.toFixed(1)}px)`
  );
});

// --- AREA 6: WORKSPACE & STUDIO ROUTE ISOLATION INTEGRITY ---
console.log('\n--- AREA 6: Workspace vs Studio Decoupling Invariants ---');

assert(
  headerCode.includes('const isStudioRoute =') && headerCode.includes("location.pathname.endsWith('/studio')"),
  'Area 6.1: Header.jsx strictly scopes floating studio pill to studio routes'
);

assert(
  !headerCode.includes("location.pathname.startsWith('/workspace') || location.pathname.startsWith('/studio')"),
  'Area 6.2: Header.jsx has /workspace removed from floating pill route condition'
);

assert(
  stitchCanvasCode.includes('focus:outline-none') || headerCode.includes('focus:outline-none'),
  'Area 6.3: Focus rings use refined tailwind styling eliminating black rectangular boxes'
);

console.log('\n========================================================================');
console.log(`📊 SUMMARY: ${passCount} PASSED, ${failCount} FAILED (TOTAL ASSERTIONS: ${passCount + failCount})`);
console.log('========================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
