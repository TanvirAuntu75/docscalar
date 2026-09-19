# Handoff Report: Explorer 1 (R1 Investigation)

## 1. Observation
- `src/engines/utility/paginationEngine.js:L113`: `const fitsEntirelyOnPage1 = totalMainContentHeight <= (page1Budget + 90);` artificially inflates budget by 90px without compressing font sizes/margins, forcing trailing sections onto Page 1 even when remaining budget is negative.
- `src/engines/utility/paginationEngine.js:L129-130`: `const mainKeys = sectionOrder.filter(k => k !== 'summary' && k !== 'education' && k !== 'skills' && k !== 'custom_languages');` statically strips Education and Skills from main column height calculation, ignoring `computeColumnRouting`.
- `src/engines/utility/paginationEngine.js:L145-276`: Once `onPage2 = true`, all remaining experience, projects, certifications, and references are dumped unconditionally into `p2` without tracking `page2Budget = totalPageHeight - (pageMargin * 2) - page2HeaderHeight` or `p2RemainingBudget`.
- `src/engines/utility/paginationEngine.js:L9-18`: `estimateJobHeight` only accounts for `highlights` and uses fixed `68` chars/line (ignores `description` and column layout width `isSingleColumn ? 92 : 62`).
- `src/engines/utility/universalTemplateRuntime.js:L158-283`: `renderUniversalOrderedSections` outputs `p1MainHtml` and `p2MainHtml`, but only 6 of 89 templates currently import it.
- `tests/frontend/test_r1_universal_runtime.mjs`: Executes 35 test areas with 163 assertions, passing 163/163 (100%), but does not directly test `computeTwoPagePartition` budget math.

## 2. Logic Chain
1. Fixed A4 sheet height is strictly 1123px (printable area ~1043px minus margins).
2. Forcing content beyond `page1Budget` using `+ 90` without reducing font size/spacing causes physical DOM overflow, clipped by `overflow: hidden` or creating broken print output.
3. Ignoring Education/Skills when routed to the main column results in ~200px uncalculated height, exhausting Page 1 space prematurely.
4. Unconditional dumping to Page 2 causes multi-page resumes (12+ jobs) to blow past Page 2 bounds (>2000px) with no 3rd page awareness.
5. Implementing dynamic column routing, discrete `page2Budget`, spacing ladder auto-tuning (<=12%), and character-scaled height estimation deterministically resolves all pagination anomalies.

## 3. Caveats
- Investigated R1 scope strictly.
- Templates across `src/engines/utility/templates/*.js` have varying degrees of standalone HTML formatting; full multi-page support across all templates requires coordinated template wiring.
- Testing focused on node runtime and matrix suites.

## 4. Conclusion
The root causes of R1 pagination and height budgeting anomalies are identified with line numbers, code mechanisms, and exact drop-in solutions. The architecture requires:
- Replacing `+ 90` with the 12% spacing ladder auto-tuning algorithm.
- Integrating dynamic `computeColumnRouting` into `paginationEngine.js`.
- Adding discrete `page2Budget` and `p2RemainingBudget` tracking.
- Enhancing `estimateJobHeight` and `estimateRefHeight` with column width awareness and `description` support.

## 5. Verification Method
- `node tests/frontend/test_r1_universal_runtime.mjs` (must pass 163/163 assertions)
- `node tests/frontend/test_template_catalog_matrix.mjs` (must pass 1780/1780 assertions)
- `npm run build` (must exit 0)
