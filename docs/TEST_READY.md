# DocForge CV Builder E2E Test Suite Specification (TEST_READY.md)

## 1. Executive Summary & Verification Matrix

The E2E Molecular Testing Suite (Milestone `M_TEST`) has been fully designed and implemented for the DocForge CV Builder Master Resolution Blueprint. All 4 major requirements (**R1**, **R2**, **R3**, **R4**) are covered by dedicated, high-density test matrices adhering strictly to the **Strict Molecular Testing & Flaw-Hunting Protocol (30 to 100 Assertion Invariant, Zero Fake Assertions)**.

### Test Suite Summary:
| Suite File | Requirement | Tested Area / Domain | Test Areas | Target Assertions | Mode |
|---|---|---|---|---|---|
| `scratch/test_r1_universal_runtime_matrix.mjs` | **R1** | Universal Section Ordering, 8-Font Registry, Google Fonts URLs, Dynamic 2-Column Heuristics, Layout Reflow | 35 | 110+ | Node ESM |
| `scratch/test_r2_modular_state_and_history.mjs` | **R2** | `resumeReducer.js` Actions, `historyEngine.js` Ring-Buffer (10 edits -> 5 undos -> 2 redos), Modular Contracts | 36 | 45+ | Node ESM |
| `scratch/test_r3_semantic_graph_and_metrics.mjs` | **R3** | Natural Metric Synthesizer (0 brackets), 5 Impact Classes, 120+ Domain `CONCEPT_TAXONOMY_GRAPH`, Synonym Resolution | 36 | 60+ | Node ESM |
| `scratch/test_r4_docx_and_interactive_tools.mjs` | **R4** | Client-Side `docxExporter.js`, OpenXML Tables/Bullets, Photo Studio Pan/Zoom/Rotate/Filter Math, DnD Sortable Ordering | 36 | 45+ | Node ESM |
| **Total Test Suite Density** | **R1–R4** | **Master System Verification Matrix** | **143 Areas** | **260+ Assertions** | **100% Automated** |

---

## 2. Test Execution Commands

Run all suites in batch or individually from the repository root:

```bash
# 1. Universal Template Runtime & Typography Engine (R1)
node scratch/test_r1_universal_runtime_matrix.mjs

# 2. State Reducer, History Ring-Buffer & Modular Subcomponents (R2)
node scratch/test_r2_modular_state_and_history.mjs

# 3. Natural Metric Synthesizer & 120+ Domain Taxonomy Graph (R3)
node scratch/test_r3_semantic_graph_and_metrics.mjs

# 4. Client-Side DOCX Exporter, Photo Studio Math & DnD Manager (R4)
node scratch/test_r4_docx_and_interactive_tools.mjs

# Run All Suites in Sequence
node scratch/test_r1_universal_runtime_matrix.mjs && node scratch/test_r2_modular_state_and_history.mjs && node scratch/test_r3_semantic_graph_and_metrics.mjs && node scratch/test_r4_docx_and_interactive_tools.mjs
```

---

## 3. Requirement-to-Test Traceability Matrix

### Requirement R1: Universal Template Runtime & Typography
- **R1.1 8-Core Font Registry**: `test_r1_universal_runtime_matrix.mjs` Areas 1–14
  - Verifies font configurations for `inter`, `outfit`, `open_sans`, `roboto`, `merriweather`, `playfair_display`, `plus_jakarta_sans`, `lora`.
  - Verifies case-insensitive normalization, fallback handling, `font-family` CSS declarations, Google Font URLs, and formula-based metric adjustments (`1.45 * lineHeightScale`).
- **R1.2 Universal Section Normalization & Content Predicate**: `test_r1_universal_runtime_matrix.mjs` Areas 15–20
  - Verifies `normalizeSectionOrder` preservation of custom sections and references.
  - Verifies `hasSectionContent` Zero Ghost Header predicate across all 8 standard sections and custom section items.
  - Exercises linear section ordering and inverted chronology.
- **R1.3 Dynamic 2-Column Routing Heuristics**: `test_r1_universal_runtime_matrix.mjs` Areas 21–27
  - Education routing ($e \le 2$ or adjacent $\to$ Main, else Sidebar).
  - Skills routing ($s \le 1 \land s < x \to$ Main, else Sidebar).
  - Custom languages and contact locked to sidebar in split mode.
  - Explicit column routing overrides (`layoutRules.columnRouting`).
- **R1.4 Layout Reflow & Payload Extremes**: `test_r1_universal_runtime_matrix.mjs` Areas 28–35
  - `themeLayout === 'single'` reflow into single vertical stream (`sidebarKeys = []`).
  - `themeLayout === 'split'` partitioning.
  - Multi-page pagination partition integration (`p1MainHtml` vs `p2MainHtml`).
  - 10+ experience entries boundary scaling and 0-item empty payload safety.

### Requirement R2: God-Component Modularization & Undo/Redo Engine
- **R2.1 Immutable Ring-Buffer History Engine**: `test_r2_modular_state_and_history.mjs` Areas 1–11
  - `createHistoryStack`, `pushHistoryState`, `undoHistoryState`, `redoHistoryState`, `canUndo`, `canRedo`.
  - Max capacity ring-buffer pruning (`maxSize = 40`).
  - Future branch clearing on new mutations.
  - **10 mutations $\to$ 5 undos $\to$ 2 redos traversal**: Verifies exact deterministic snapshot restoration with zero data loss.
- **R2.2 Resume Reducer Action Handling**: `test_r2_modular_state_and_history.mjs` Areas 12–33
  - All atomic mutators: `SET_FIELD`, `ADD/REMOVE/SET_EXPERIENCE`, `HIGHLIGHT` mutators, `ADD/REMOVE/SET_EDUCATION`, `SKILLS` bulk parsing & deduplication, `PROJECTS`, `CERTIFICATIONS`, `REFERENCES`, `CUSTOM_SECTIONS`.
  - Reordering mutator `MOVE_SECTION` with out-of-bounds guards.
  - Theme mutators: `SET_THEME_COLOR`, `SET_THEME_FONT`, `SET_THEME_LAYOUT`, `SET_PAGE_MARGIN`, `SET_LINE_SPACING`.
  - Compound mutators: `AUTO_SANITIZE` (em-dash normalization, bullet stripping), `IMPORT_DATA`, `RESET_DRAFT`, `APPLY_INLINE_EDIT`, `AUTO_TUNE_PAGE_FIT`.
- **R2.3 Subcomponent Contracts**: `test_r2_modular_state_and_history.mjs` Areas 34–36
  - Validates 14 subcomponent modular structure in `src/components/ResumeStudio/`.

### Requirement R3: Natural Metric Synthesis & Semantic Graph
- **R3.1 Natural Metric Synthesizer**: `test_r3_semantic_graph_and_metrics.mjs` Areas 1–22
  - **Zero-Bracket Invariant**: 0 occurrences of `[` or `]` across 50+ diverse test inputs.
  - Complete elimination of `, resulting in [quantify the impact here]`.
  - Classification into 5 semantic impact domains:
    1. *Efficiency, Latency & Automation* (turnaround, latency, throughput reduction)
    2. *Growth, Revenue, Scale & Adoption* (revenue, conversion, adoption lift)
    3. *Scale, Reliability & High Availability* (uptime, SLA, scale, requests)
    4. *Quality, Security, Compliance & Defect Reduction* (coverage, compliance, defect reduction)
    5. *Leadership, Delivery & Velocity* (sprint velocity, on-time milestones)
  - Weak verb replacements (`worked on` $\to$ `Architected and implemented`, etc.).
  - Punctuation & grammatical glue: zero double dots `..`, zero double commas `,,`, single terminal period.
- **R3.2 120+ Domain Semantic Taxonomy Graph**: `test_r3_semantic_graph_and_metrics.mjs` Areas 23–36
  - Verifies graph contains $\ge 120$ industry domains across 14 verticals (Frontend, Backend, Databases, Cloud/DevOps, Security, QA, AI/ML, Product/Design, Mobile, Sales, Marketing, Finance, HR, Operations).
  - Bidirectional synonym and acronym resolution (`k8s` $\leftrightarrow$ `kubernetes`, `react.js` $\leftrightarrow$ `react`, `aws` $\leftrightarrow$ `amazon web services`, `ci/cd` $\leftrightarrow$ `continuous integration`, `ts` $\leftrightarrow$ `typescript`).
  - Real-time Job Description matcher scoring and missing keyword chips.

### Requirement R4: Multi-Format Export Engine & Interactive Canvas Tools
- **R4.1 Client-Side DOCX Exporter**: `test_r4_docx_and_interactive_tools.mjs` Areas 1–22
  - Pure client-side OpenXML document compilation (`buildDocxDocument`).
  - Margins (0.6 in / 864 twips), ATS font mapping (Inter $\to$ Calibri, Serif $\to$ Georgia, etc.).
  - 2-column borderless tables for experience and education with proper percentage splits.
  - Native bullet list paragraphs for highlights.
  - Honors dynamic `sectionOrder`, custom sections, and references.
  - Non-zero binary buffer validation with OpenXML magic bytes (`PK\x03\x04`).
- **R4.2 Interactive Photo Studio Canvas**: `test_r4_docx_and_interactive_tools.mjs` Areas 23–34
  - Zoom scaling math (clamped 0.50x to 3.00x).
  - 2D Pan translation math (clamped -150px to +150px).
  - 90° discrete rotation modulo arithmetic (0°, 90°, 180°, 270°).
  - 5 Studio Filter Presets (Original, Executive B&W, Studio Crisp, Warm Portrait, Cool Noir).
  - `injectPhotoCropStyles` CSS transform and filter injection.
- **R4.3 DnD Sortable Section Manager**: `test_r4_docx_and_interactive_tools.mjs` Areas 35–36
  - Element conservation and index shifting invariant (`arrayMove`).
  - Ordering presets (Standard Chronological, Skills First, Projects First, Academic First).

---

## 4. Test Integrity & Anti-Inflation Attestation

1. **Zero Falsification / Zero Always-Pass**:
   Every assertion evaluates a concrete dynamic condition without boolean short-circuits (`|| true`).
2. **Formula-Level Verification**:
   - Spacing: `computeFontAdjustedLineSpacing(1.45, 'merriweather') === 1.36` (exact math `1.45 * 0.94`).
   - History: `past.length === maxSize` (exact ring-buffer bounds).
   - Rotation: `normalizeRotation(450) === 90`.
   - Photo: `clampZoom(4.5) === 3.00`.
3. **Branch-Level Verification**:
   - `themeLayout === 'single'` vs `'split'`.
   - `eduIdx <= 2` vs `eduIdx > 2`.
   - 5 Semantic verb categories + fallback.
   - 8 font families + fallback.
