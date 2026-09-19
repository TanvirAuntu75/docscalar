# Explorer 1 Survey Report: Requirement R1
## Deterministic Multi-Page Pagination & Intelligent 2-Page Budgeting Engine

**Author**: Explorer 1  
**Target Milestone**: R1 (P0)  
**Date**: 2026-09-02  
**Scope**: `src/engines/utility/paginationEngine.js`, `src/engines/utility/universalTemplateRuntime.js`, `src/engines/utility/resumeIntelligenceEngine.js`, template integration, and test verification matrices.

---

### Executive Summary & Bottom-Line Verdict
The pagination and multi-page height budgeting system in DocForge exhibits four critical architectural flaws that collectively cause text clipping beyond 1123px, missing references, miscalculated column heights upon section reordering, and unconditional page overflow:
1. **Flawed `+ 90` Budget Constant (`paginationEngine.js:L113`)**: Artificially inflates Page 1 budget without CSS style compression, forcing oversized content into a fixed A4 sheet container and causing text to clip at the 1123px boundary.
2. **Static Sidebar Hardcoding & Missing Column Routing (`paginationEngine.js:L129-130`)**: Education and Skills are hardcoded as sidebar-only sections and excluded from `totalMainContentHeight` and `mainKeys`. When routed to the main column (in single-column layouts or when reordered early), they consume 150–300px of physical space with 0px budget deduction, triggering massive Page 1 overflow.
3. **Unbounded Page 2 Dumping (`paginationEngine.js:L145-276`)**: Once Page 1 fills, all remaining items are dumped unconditionally into `p2` without calculating `page2Budget = totalPageHeight - (pageMargin * 2) - page2HeaderHeight` or maintaining `p2RemainingBudget`.
4. **Coarse Height Estimation Formulas (`paginationEngine.js:L9-51`)**: `estimateJobHeight` ignores `e.description` and hardcodes 68 chars/line (disregarding single vs split column widths), while `estimateRefHeight` ignores `lineSpacing` and multi-line contact rows.

---

### 1. Detailed Investigation of `src/engines/utility/paginationEngine.js`

#### 1.1. Line 113: The Flawed `+ 90` Constant and Page 1 Clipping
- **Code Location**: `src/engines/utility/paginationEngine.js:L113`
```javascript
// If entire content can fit on 1 page with adaptive tolerance (within ~90px of budget), keep all on Page 1!
const fitsEntirelyOnPage1 = totalMainContentHeight <= (page1Budget + 90);
```
- **Trigger & Mechanism**:
  In fixed A4 printing and screen rendering (`width: 794px; height: 1123px; overflow: hidden`), the printable budget is `page1Budget = totalPageHeight - (pageMargin * 2) - headerHeight` (typically ~850–950px).
  When `totalMainContentHeight` exceeds `page1Budget` by up to 90px, `fitsEntirelyOnPage1` evaluates to `true`.
  In lines 229, 245, and 266:
```javascript
// Certifications (L229)
if (certH <= remainingBudget || fitsEntirelyOnPage1) {
  partitions.certifications.p1 = [...safeData.certifications];
  partitions.certifications.hasP1 = true;
  remainingBudget -= (certH + 16);
}
// References (L245)
if (refH <= remainingBudget || fitsEntirelyOnPage1) {
  partitions.references.p1 = [...safeData.references];
  partitions.references.hasP1 = true;
  remainingBudget -= (refH + 16);
}
// Custom Sections (L266)
if (csH <= remainingBudget || fitsEntirelyOnPage1) {
  partitions.customSections[cs.id].p1Items = [...items];
  partitions.customSections[cs.id].hasP1 = true;
  remainingBudget -= (csH + 16);
}
```
- **Root Cause & Impact**:
  Because `fitsEntirelyOnPage1` is `true`, trailing sections (Certifications, References, Custom Sections) are unconditionally stamped onto Page 1 even when `remainingBudget` is already zero or negative.
  Physical DOM height cannot stretch beyond 1123px on A4 sheets. Without reducing font size or line spacing, the bottom ~90px of DOM content physically spills past the container edge, gets clipped by CSS `overflow: hidden`, and disappears completely from view and print output.

#### 1.2. Lines 129–130: Static `mainKeys` vs Dynamic Column Routing
- **Code Location**: `src/engines/utility/paginationEngine.js:L129-130`
```javascript
// Filter out sidebar-dedicated keys
const mainKeys = sectionOrder
  .filter(k => k !== 'summary' && k !== 'education' && k !== 'skills' && k !== 'custom_languages');
```
- **Discrepancy with `universalTemplateRuntime.js`**:
  `universalTemplateRuntime.js` computes column placement dynamically via `computeColumnRouting(safeData, sectionOrder, layoutRules, isSingleLayout)`:
  - When `isSingleLayout` is true (single-column mode), `education`, `skills`, and all other sections route to `main`.
  - When `eduIdx <= 2` or `|eduIdx - expIdx| === 1` in split layouts, `education` routes to `main`.
  - When `skillsIdx <= 1` and placed before experience, `skills` routes to `main`.
- **Root Cause & Impact**:
  1. In `paginationEngine.js:L99-110`, `totalMainContentHeight` calculates heights only for experience, projects, certifications, references, and custom sections. `education` and `skills` are **completely omitted** from `totalMainContentHeight`.
  2. In `paginationEngine.js:L129-130`, `education` and `skills` are stripped from `mainKeys`.
  3. In `partitions` (L118-119), `partitions.education` and `partitions.skills` are hardcoded to `p1: [...items]`.
  4. When Education (e.g. 2 degrees = ~120px) and Skills (e.g. 10 skills = ~80px) are routed to the main column, they consume ~200px of Page 1 height. But `paginationEngine` deducts **0px** from `remainingBudget`.
  5. The bin-packing loop then assigns 100% of `page1Budget` to Experience and Projects, resulting in a ~200px DOM overflow where Experience and Projects clip at the bottom of Page 1.

#### 1.3. Lines 145–276: Discrete `page2Budget` vs Unconditional Overflow Dumping
- **Code Location**: `src/engines/utility/paginationEngine.js:L145-276`
```javascript
// Experience (L145-149)
if (onPage2) {
  partitions.experience.p2 = [...safeData.experience];
  partitions.experience.hasP2 = true;
...
// Projects (L185-189)
if (onPage2) {
  partitions.projects.p2 = [...safeData.projects];
...
// Certifications (L224-226)
if (onPage2) {
  partitions.certifications.p2 = [...safeData.certifications];
...
// References (L240-242)
if (onPage2) {
  partitions.references.p2 = [...safeData.references];
```
- **Root Cause & Impact**:
  There is no discrete Page 2 budget calculation. Page 2 is treated as an infinite sink.
  - Page 2 printable height must account for margins and a continuation header (`page2HeaderHeight` ~35–40px):
    `page2Budget = totalPageHeight - (pageMargin * 2) - page2HeaderHeight`
  - When a candidate has a large payload (e.g., 12 jobs, 4 projects, 3 certifications, 4 references):
    - Page 1 takes 3 jobs (~850px).
    - Page 2 receives all remaining 9 jobs, 4 projects, 3 certifications, and 4 references (~1800px).
    - Page 2 overflows the 1123px A4 boundary by ~900px, causing severe clipping or blank 3rd page spillage.

#### 1.4. Lines 9–51: Item Height Estimation Formulas
- **`estimateJobHeight` (`paginationEngine.js:L9-18`)**:
```javascript
export const estimateJobHeight = (e, spacing = 1.45) => {
  if (!e) return 0;
  let bulletsHeight = 0;
  (e.highlights || []).filter(Boolean).forEach(h => {
    const hStr = typeof h === 'string' ? h : String(h);
    const lines = Math.max(1, Math.ceil(hStr.length / 68));
    bulletsHeight += (lines * 12.5 * spacing) + 3;
  });
  return 32 + bulletsHeight + 8;
};
```
  - **Flaws**:
    1. Only measures `e.highlights`. If `e.description` is populated (used in many resume schemas and ATS imports), `bulletsHeight` evaluates to 0. A 5-line job description is estimated at 40px instead of ~115px.
    2. Uses hardcoded `68` characters per line. In single-column layouts (~650px text width), standard 10pt font fits ~92 chars/line. In split-column layouts (~450px text width), it fits ~62 chars/line. Fixed 68 causes underestimation in split columns and overestimation in single columns.
- **`estimateRefHeight` (`paginationEngine.js:L40-43`)**:
```javascript
export const estimateRefHeight = (refs) => {
  if (!refs || !refs.length) return 0;
  return 36 + (Math.ceil(refs.length / 2) * 50);
};
```
  - **Flaws**:
    1. Hardcodes `50px` per 2-column reference row without `spacing` (lineSpacing) scaling.
    2. Multi-line contact rows (Name, Relationship, Phone, Email, Location) exceed 50px (typically 65–75px).
- **Missing Estimators**:
  - `estimateEduHeight(edu, spacing, isSingleColumn)` (header + degree + school + note/dates: ~42px/item).
  - `estimateSkillsHeight(skills, spacing, isSingleColumn)` (header + pills or categorized list: ~36px + rows).

#### 1.5. Spacing Ladder Auto-Tuning (12% Micro-Tuning Invariant)
- **Concept**:
  Instead of an arbitrary `+ 90` constant, when `totalMainContentHeight` is within 12% of `page1Budget` (`totalMainContentHeight <= page1Budget * 1.12`):
  Apply deterministic micro-tuning:
  - `lineSpacing`: reduced from `1.45` down to `1.25`
  - `pageMargin`: adjusted from `0px` to `6px`
  - section gaps: compressed from `16px` down to `10px`
  If the compressed height satisfies `<= page1Budget`, the document renders cleanly on 1 page without DOM overflow. If it exceeds 12% or fails to compress, it deterministically splits into Page 1 and Page 2.

---

### 2. Investigation of `src/engines/utility/universalTemplateRuntime.js`
- **Current State**:
  - Contains `computeColumnRouting` (L88-146) and `renderUniversalOrderedSections` (L158-283).
  - `renderUniversalOrderedSections` generates `p1MainHtml` and `p2MainHtml` based on `partitions`.
- **Architectural Gaps**:
  1. Template adoption is fragmented: only 6 of 89 templates currently import `renderUniversalOrderedSections`.
  2. Single-column ATS templates (like `harvard_classic.js`, `silicon_valley_ats.js`) define section renderers that ignore partition arguments `(items, isCont, offset)` and only render `<div class="cv-page">${runtime.p1MainHtml}</div>` without a conditional Page 2 sheet (`${runtime.hasPage2 ? ... : ''}`).
  3. When `partitions` is passed, `universalTemplateRuntime.js` handles `experience`, `projects`, `certifications`, `references`, and `customSections`, but lacks partition handling for `education` when `education` is partitioned across pages in main column mode.

---

### 3. Investigation of Test Suites & Verification Coverage
- **`tests/frontend/test_r1_universal_runtime.mjs`**:
  - Executes 35 test areas with 163 total assertions. Currently passes 163/163 (100%).
  - Covers:
    - Tier 1: Typography Engine & Font Registry (Areas 1–14, 8 fonts, normalization, metric formulas)
    - Tier 2: Section Ordering & Zero Ghost Headers (Areas 15–20, normalization, predicates, linear ordering)
    - Tier 3: Dynamic 2-Column Routing Heuristics (Areas 21–27, education early/late/adjacent, skills, overrides)
    - Tier 4: Dynamic Layout Reflow & Template Parity (Areas 28–35, single/split reflow, extreme payload 12 items, empty states, template parity)
- **Observations & Gaps in Test Suite**:
  - `test_r1_universal_runtime.mjs` does **not** import `computeTwoPagePartition` directly from `paginationEngine.js`.
  - The budget formulas (`page1Budget`, `page2Budget`, `p2RemainingBudget`, `estimateJobHeight` with column character scaling, `estimateEduHeight`, spacing ladder 12% auto-tuning) need dedicated automated assertions to reach 100% molecular test density.

---

### 4. Proposed Architectural Solutions & Implementation Specification

```
+------------------------------------------------------------------------+
|               DocForge Intelligent 2-Page Budgeting Engine             |
+------------------------------------------------------------------------+
| 1. Dynamic Column Routing & Height Calculation                         |
|    routing = computeColumnRouting(data, sectionOrder, layoutRules)     |
|    mainKeys = sectionOrder.filter(k => routing[k] === 'main')          |
|    totalHeight = sum(estimateItemHeight(item, isSingleColumn, spacing))|
+------------------------------------------------------------------------+
| 2. Spacing Ladder Auto-Tuning (<= 12% Overflow)                        |
|    if (totalHeight > p1Budget && totalHeight <= p1Budget * 1.12)       |
|      evaluate compressConfig(lineSpacing: 1.25, margin: 6, gap: 10)    |
|      if (compressedHeight <= p1Budget) -> single page auto-tuned       |
+------------------------------------------------------------------------+
| 3. Deterministic 2-Page Bin-Packing                                    |
|    page1Budget = totalPageHeight - (margin * 2) - p1HeaderHeight       |
|    page2Budget = totalPageHeight - (margin * 2) - p2HeaderHeight       |
|    p1Remaining = page1Budget; p2Remaining = page2Budget                |
|    Pack mainKeys sequentially into P1 until full -> pack into P2       |
+------------------------------------------------------------------------+
```

#### Exact Proposed Code Changes:
1. **`src/engines/utility/paginationEngine.js`**:
   - Add `estimateEduHeight(edu, spacing = 1.45, isSingleColumn = true)` and `estimateSkillsHeight(skills, spacing = 1.45, isSingleColumn = true)`.
   - Update `estimateJobHeight(e, spacing = 1.45, isSingleColumn = false)`:
     `const charsPerLine = isSingleColumn ? 92 : 62;`
     Add `e.description` line wrapping measurement in addition to `e.highlights`.
   - Update `estimateRefHeight(refs, spacing = 1.45, isSingleColumn = false)`:
     Incorporate line spacing and multi-line contact row calculation (`isSingleColumn ? 72 : 58` per card).
   - In `computeTwoPagePartition`:
     - Accept `isSingleLayout` and `layoutRules`.
     - Call `computeColumnRouting(safeData, sectionOrder, layoutRules, isSingleLayout)` to obtain dynamic `routing`.
     - Build `mainKeys = sectionOrder.filter(k => routing[k] === 'main')`.
     - Calculate `page2Budget = totalPageHeight - (pageMargin * 2) - page2HeaderHeight`.
     - Maintain `remainingBudget` for P1 and `p2RemainingBudget` for P2.
     - Remove `+ 90` constant from line 113.
     - Implement 12% spacing ladder check for single page auto-fit.
     - Sequentially pack sections (Education, Skills, Experience, Projects, Certifications, References, Custom Sections) into P1 until full, then into P2 while `p2RemainingBudget` allows.

2. **`src/engines/utility/universalTemplateRuntime.js`**:
   - Add partition support for `education` in `renderUniversalOrderedSections` when routed to `mainKeys`.
   - Ensure consistent export of `p1MainHtml`, `p2MainHtml`, `hasPage2`.

3. **Template Integration & Single-Column Templates**:
   - Ensure all templates rendering multi-page layouts output both `<div class="cv-page" id="page-1">` and `${runtime.hasPage2 ? '<div class="cv-page" id="page-2">...</div>' : ''}`.

4. **Test Suite Expansion**:
   - Maintain 163/163 assertions in `tests/frontend/test_r1_universal_runtime.mjs` and add dedicated test suites verifying the discrete Page 2 budgeting, column routing height deduction, and 12% spacing ladder invariants.
