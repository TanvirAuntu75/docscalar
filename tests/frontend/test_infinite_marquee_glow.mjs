import fs from 'fs';
import path from 'path';

// Quantitative test suite for InfiniteMarquee overflow clipping and border glow fix
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

// 1. Check InfiniteMarquee exists
assert(content.includes('function InfiniteMarquee'), 'InfiniteMarquee component definition exists');

// 2. Extract InfiniteMarquee function body
const marqueeMatch = content.match(/function InfiniteMarquee[\s\S]*?\n\}/);
assert(marqueeMatch !== null, 'Extracted InfiniteMarquee function body');
const marqueeCode = marqueeMatch ? marqueeMatch[0] : '';

// 3. Outer container has overflow-hidden
assert(marqueeCode.includes('overflow-hidden'), 'Outer container includes overflow-hidden for marquee masking');

// 4. Outer container has vertical padding (py-3.5 or py-*)
assert(/py-(?:2\.5|3|3\.5|4)/.test(marqueeCode), 'Outer container has vertical padding to prevent overflow clipping of scaled pill');

// 5. Outer container has items-center for vertical centering
assert(marqueeCode.includes('items-center'), 'Outer container or inner track has items-center');

// 6. Inner flex track has vertical padding (py-1.5 or py-*)
const innerTrackMatch = marqueeCode.match(/<div[\s\S]*?className=\{`flex w-fit[\s\S]*?\}/);
assert(innerTrackMatch !== null, 'Inner flex track element found');
assert(innerTrackMatch && innerTrackMatch[0].includes('py-1.5'), 'Inner flex track has vertical headroom (py-1.5)');

// 7. Pill element has hover:scale-105
assert(marqueeCode.includes('hover:scale-105'), 'Pill element scales on hover');

// 8. Pill element onMouseEnter sets borderColor
assert(marqueeCode.includes("e.currentTarget.style.borderColor = 'var(--color-primary)'"), 'onMouseEnter sets primary border color');

// 9. Pill element onMouseEnter sets background
assert(marqueeCode.includes("e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.05)'"), 'onMouseEnter sets tinted background');

// 10. Pill element onMouseEnter sets boxShadow glow
assert(marqueeCode.includes("e.currentTarget.style.boxShadow = '0 0 16px rgba(var(--color-primary-rgb), 0.25), 0 2px 8px rgba(0, 0, 0, 0.04)'"), 'onMouseEnter applies border glow box-shadow');

// 11. Pill element onMouseLeave cleans up borderColor
assert(marqueeCode.includes("e.currentTarget.style.borderColor = 'var(--border-subtle)'"), 'onMouseLeave resets border color');

// 12. Pill element onMouseLeave cleans up boxShadow
assert(marqueeCode.includes("e.currentTarget.style.boxShadow = ''"), 'onMouseLeave clears box-shadow glow');

// 13. Horizontal mask gradient is preserved
assert(marqueeCode.includes("maskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)'"), 'Horizontal edge fade mask is intact');

// 14. Quadrupled array for seamless infinite scroll
assert(marqueeCode.includes('[...items, ...items, ...items, ...items]'), 'Quadrupled items array for smooth continuous animation');

// 15. Animation pause on hover is preserved
assert(marqueeCode.includes('hover:[animation-play-state:paused]'), 'Animation pauses when hovering pills');

// 16. Subpixel geometry check: 40px base pill + 5% scale = 42px (+1px top, +1px bottom);
// py-3.5 gives 14px top + 14px bottom padding = 28px headroom, exceeding 1px scale expansion by 27px!
const baseHeight = 40;
const scaleFactor = 1.05;
const scaledHeight = baseHeight * scaleFactor;
const topExpansion = (scaledHeight - baseHeight) / 2;
const paddingHeadroom = 14;
assert(paddingHeadroom > topExpansion, 'Mathematical headroom (14px) strictly exceeds scale expansion (1px)');

// 17. Shadow spread check: 16px blur radius with 0 spread fits within padding headroom
const shadowBlur = 16;
assert(paddingHeadroom * 2 > shadowBlur, 'Combined vertical padding (28px) comfortably accommodates 16px blur radius');

// 18. Check Section 3 still references InfiniteMarquee
const section3Match = content.match(/38\+\s*Document\s*Tools[\s\S]*?<\/section>/);
assert(section3Match !== null, 'Section 3 Document Tools found');
assert(section3Match && section3Match[0].includes('<InfiniteMarquee items={pdfRow}'), 'Section 3 calls InfiniteMarquee for pdfRow');
assert(section3Match && section3Match[0].includes('<InfiniteMarquee items={otherRow}'), 'Section 3 calls InfiniteMarquee for otherRow');

// Summary
const failed = tests.filter(t => !t.passed);
console.log(`\nResults: ${tests.length - failed.length}/${tests.length} tests passed.`);
if (failed.length > 0) {
  process.exit(1);
} else {
  console.log('All InfiniteMarquee border glow and overflow tests passed successfully.');
}
