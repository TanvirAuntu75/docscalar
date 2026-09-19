# CHALLENGE REPORT — DOCFORGE CV BUILDER M1 & M2 EMPIRICAL AUDIT

**Challenger**: Challenger 1 (critic, specialist)  
**Date**: 2026-09-02  
**Target Scope**: Milestone M1 (Pagination & Intelligent 2-Page Budgeting Engine) & Milestone M2 (Candidate Title & Section Heading Resilient Stamping)  
**Harness**: `scratch/test_challenger_1_adversarial.mjs`  
**Overall Risk Assessment**: **HIGH**  
**Final Verdict**: **REQUEST_CHANGES**

---

## Executive Summary

Challenger 1 conducted an empirical adversarial challenge covering 53 distinct test assertions across 5 core technical tiers for Milestones M1 and M2. While standard non-adversarial test suites (`test_r1_universal_runtime.mjs` with 208/208 passed, `test_template_catalog_matrix.mjs` with 1780/1780 passed) report green, our adversarial stress harness identified **2 critical failure modes** that break the core contracts of Requirements R1 and R2 under realistic user edge cases:

1. **Outer Guard Omission Dropping Candidate Title on Empty/Sparse Payloads in 21 Templates (R2 Bug)**
2. **Discrete Page 2 Budget Overflow Leak in Multi-Section Oversized Payloads (`paginationEngine.js`) (R1 Bug)**

---

## Confirmed Vulnerabilities & Challenges

### [CRITICAL] Challenge 1: Destructive Outer Guards Drop Title Node on Empty/Sparse Data Across 21 Templates (R2)

- **Assumption Challenged**: Requirement R2 assumed that replacing inner `${safeData.title ? ... : ''}` guards with `<div class="candidate-title" data-df-field="title" style="min-height: 1.2em;">${safeData.title || 'Professional Title'}</div>` guaranteed that the title node would always render and remain click-to-editable.
- **Attack Scenario**: Render template with an empty object `{}` or a payload with `{ name: '', title: '', summary: '' }` (e.g. user creating a new resume from scratch).
- **Blast Radius**: In **21 out of 89 templates (23.6%)**, the entire header block is enclosed in an outer conditional guard such as:
  - `${(data.name || data.title || data.summary) ? ... : ''}`
  - `${(firstName || lastName || data.title) ? ... : ''}`
  - `${hasHeader ? ... : ''}` where `const hasHeader = Boolean(candidateName || data.title || photoSrc);`
  When `name`, `title`, and `summary` are empty or default, this outer guard evaluates to `false` and drops the entire header block, completely eradicating the `<div class="candidate-title" data-df-field="title">` node from the DOM.
- **Affected Files (21 templates)**:
  1. `src/engines/utility/templates/howard_ong.js:L40,L458`
  2. `src/engines/utility/templates/isabel_mercado.js:L471`
  3. `src/engines/utility/templates/jonathan.js:L415`
  4. `src/engines/utility/templates/kathleen.js:L390`
  5. `src/engines/utility/templates/kelly_mint.js:L139,L441`
  6. `src/engines/utility/templates/korina_villanueva.js:L62,L461`
  7. `src/engines/utility/templates/kyiv_golden.js:L410`
  8. `src/engines/utility/templates/lilac_sidebar.js:L380`
  9. `src/engines/utility/templates/lorna_alvarado.js:L440`
  10. `src/engines/utility/templates/marcus_vance.js:L81,L529`
  11. `src/engines/utility/templates/milan_blush.js:L435`
  12. `src/engines/utility/templates/montreal_frost.js:L451`
  13. `src/engines/utility/templates/olivia.js:L612`
  14. `src/engines/utility/templates/oslo_taupe.js:L420`
  15. `src/engines/utility/templates/prague_brass.js:L436`
  16. `src/engines/utility/templates/reykjavik_slate.js:L426`
  17. `src/engines/utility/templates/richard.js:L404`
  18. `src/engines/utility/templates/sage_pastel.js:L409`
  19. `src/engines/utility/templates/sanchez_dark.js:L473`
  20. `src/engines/utility/templates/sanchez_mono.js:L436`
  21. `src/engines/utility/templates/schumacher_charcoal.js:L422`
- **Mitigation**: Remove the outer conditional wrapper guard around the header/title block, or ensure the title and name container always renders unconditionally with its placeholder fallback.

---

### [HIGH] Challenge 2: Discrete Page 2 Budget Overflow Leak Under Multi-Section Payloads (R1)

- **Assumption Challenged**: Requirement R1 specified: *"Add discrete `page2Budget = totalPageHeight - (pageMargin * 2) - page2HeaderHeight` and maintain `p2RemainingBudget` instead of dumping overflow unconditionally into `p2`."*
- **Attack Scenario**: Provide a large multi-section payload containing heavy Experience (e.g. 15 jobs) plus Education, Skills (18+ items), Certifications, and References.
- **Blast Radius**: In `src/engines/utility/paginationEngine.js:L522-615`, when `onPage2 === true`:
  - `skills`: `partitions.skills.p2 = [...safeData.skills]; p2RemainingBudget -= (sH + sectionGap);`
  - `certifications`: `partitions.certifications.p2 = [...safeData.certifications]; p2RemainingBudget -= (certH + sectionGap);`
  - `references`: `partitions.references.p2 = [...safeData.references]; p2RemainingBudget -= (refH + sectionGap);`
  - `customSections`: `partitions.customSections[cs.id].p2Items = [...items]; p2RemainingBudget -= (csH + sectionGap);`
  None of these sections verify if their height fits within `p2RemainingBudget`! They unconditionally dump into `p2` and subtract height, driving `p2RemainingBudget` into deep negative values (e.g. `-397.75px`).
  On print/export or visual rendering, this causes severe text clipping and overflows beyond the 1123px A4 boundary.
- **Affected File**: `src/engines/utility/paginationEngine.js:L522-615`
- **Mitigation**: In `paginationEngine.js`, when `onPage2 === true`, check `if (sH <= p2RemainingBudget)` before allocating sections/sub-items to Page 2, or bound `p2RemainingBudget` and partition sub-items (e.g. skills rows, cert items) to respect `p2RemainingBudget >= 0`.

---

## Stress Test Results Matrix

| # | Test Area | Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|---|
| 1 | Area 1.1–1.3 | Empty Object `{}` across 89 templates | All 89 render title node with `data-df-field="title"`, min-height, and placeholder | 68 passed / 21 failed (title node omitted by outer guard) | ❌ **FAIL** |
| 2 | Area 1.4 | Title node text integrity on `{}` | No `undefined`, `null`, `NaN` in DOM | 89/89 passed | ✅ **PASS** |
| 3 | Area 2.1–2.2 | Explicit `{ title: '' }` with name | Renders title node and `candidate-title` class | 89/89 passed | ✅ **PASS** |
| 4 | Area 3.1–3.2 | Title `null` & `undefined` | Renders fallback placeholder cleanly | 89/89 passed | ✅ **PASS** |
| 5 | Area 4.1 | Whitespace-only title | Retains `data-df-field="title"` and min-height | 89/89 passed | ✅ **PASS** |
| 6 | Area 5.1 | Custom title override | Custom string stamped with `data-df-field="title"` | 89/89 passed | ✅ **PASS** |
| 7 | Area 6.1 | Zero-Ghost-Section on 0-item data | No empty section headings stamped | 89/89 passed | ✅ **PASS** |
| 8 | Area 7.1–7.5 | 12-Job Payload Multi-Page Partition | Splits across P1 and P2, preserves contiguous sub-item offsets and continuation flags | Correctly partitioned with offset continuity | ✅ **PASS** |
| 9 | Area 8.1–8.2 | Discrete `page2Budget` formula verification | `page2Budget = 1043 - 20 - 40 = 983` | Exact formula match | ✅ **PASS** |
| 10 | Area 9.1–9.2 | Extreme Multi-Section Overload (15 Jobs + 6 Edu + 18 Skills + Refs) | Discrete Page 2 bounds preserved without negative budget drift | `p2RemainingBudget` plunged to `-397.75px` due to unconditional P2 section dumps | ❌ **FAIL** |
| 11 | Area 10.1–10.3 | Single (92 chars) vs Split (62 chars) Job Height Formula | `estimateJobHeight` calculates exact char-scaled wrapping | Exact mathematical match | ✅ **PASS** |
| 12 | Area 11.1–11.2 | Reference Card Height with Spacing Formula | Single = 180px, Split = 152px for 3 refs | Exact mathematical match | ✅ **PASS** |
| 13 | Area 12.1–12.5 | Reorder Education before Experience | Dynamic column routing moves Education to Main, heading preserved | Headings retain `data-df-field` and correct DOM order | ✅ **PASS** |
| 14 | Area 13.1–13.2 | Move Custom Section to Index 0 | Renders at top of main column, retains `data-df-field="heading:custom_patents"` | Correct sequence and heading attributes | ✅ **PASS** |
| 15 | Area 14.1 | Inverted Section Order | Full inversion preserved in DOM sequence without ghost headers | Exact sequence preserved | ✅ **PASS** |
| 16 | Area 15.1–15.2 | Normalize Missing Sections | `normalizeSectionOrder` auto-appends omitted custom sections and references | Auto-appends without dropping data | ✅ **PASS** |
| 17 | Area 16.1–16.2 | Spacing Ladder <= 100% | No micro-tuning, preserves 1.45 lineSpacing | `autoTuned.applied === false`, `hasPage2 === false` | ✅ **PASS** |
| 18 | Area 17.1–17.5 | Spacing Ladder at ~108% (<=112%) | Applies micro-tuning (1.25 spacing, 6 margin, 10 gap) to fit on 1 page | `autoTuned.applied === true`, `hasPage2 === false` | ✅ **PASS** |
| 19 | Area 18.1–18.2 | Spacing Ladder at >112% | Rejects over-compression, forces clean 2-page split | `hasPage2 === true`, `autoTuned.applied === false` | ✅ **PASS** |
| 20 | Area 19.1–19.2 | `computeHeaderHeight` Formula with Summary | Exact match with summary line wrapping formula | 60px base, 106.25px for 2-line summary | ✅ **PASS** |
| 21 | Area 20.1–20.2 | `page1Budget` & `page2Budget` Formulas | Exact formula match with margin and header heights | 1029px P1, 1054px P2 | ✅ **PASS** |
| 22 | Area 21.1–21.2 | Font Adjusted Line Spacing Metrics | Scaled line height across Inter and Playfair Display | Numeric scales applied | ✅ **PASS** |
| 23 | Area 22.1–22.3 | Universal Runtime Multi-Page Partition Rendering | Generates `p1MainHtml` and `p2MainHtml` cleanly | Correct multi-page HTML partition | ✅ **PASS** |

---

## Verdict & Recommended Actions

**VERDICT: REQUEST_CHANGES**

### Required Fixes for Lead Worker / Orchestrator:
1. **Fix 21 Template Outer Header Guards**:
   In all 21 identified template files (`howard_ong.js`, `isabel_mercado.js`, `jonathan.js`, `kathleen.js`, `kelly_mint.js`, `korina_villanueva.js`, `kyiv_golden.js`, `lilac_sidebar.js`, `lorna_alvarado.js`, `marcus_vance.js`, `milan_blush.js`, `montreal_frost.js`, `olivia.js`, `oslo_taupe.js`, `prague_brass.js`, `reykjavik_slate.js`, `richard.js`, `sage_pastel.js`, `sanchez_dark.js`, `sanchez_mono.js`, `schumacher_charcoal.js`):
   - Remove outer conditional wrapper guards (e.g. `${(data.name || data.title || data.summary) ? ... : ''}`, `${(firstName || lastName || data.title) ? ... : ''}`, `${hasHeader ? ... : ''}`) so that the `<div class="candidate-title" data-df-field="title" style="min-height: 1.2em;">${safeData.title || 'Professional Title'}</div>` renders unconditionally on `{}`.
2. **Harden Page 2 Budget Bounds in `paginationEngine.js`**:
   In `src/engines/utility/paginationEngine.js` lines 522–615:
   - For `skills`, `certifications`, `references`, and `customSections` on Page 2, ensure height is bounded against `p2RemainingBudget` and that `p2RemainingBudget` never falls below 0.
