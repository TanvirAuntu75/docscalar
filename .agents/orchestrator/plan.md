# Orchestrator Master Plan

## Objectives
Master Resolution & Flaw Elimination across DocForge CV Builder:
1. **R1: Deterministic Multi-Page Pagination & Intelligent 2-Page Budgeting Engine (P0)**
   - Target files: `src/engines/utility/paginationEngine.js`, `src/engines/utility/universalTemplateRuntime.js`
   - Fix flawed `+ 90` constant, dynamic column routing, page 2 discrete budget tracking, multi-line ref and job estimations, spacing ladder auto-tuning.
2. **R2: Candidate Title & Section Heading Resilient Stamping (P0)**
   - Target files: `src/engines/utility/templateRegistry.js`, `src/components/ResumeStudio/TemplateGalleryModal.jsx`, all 89 templates in `src/engines/utility/templates/*.js`
   - Add `candidateTitle` across all 89 `TEMPLATE_MAP` entries, auto-populate title upon template selection, replace destructive omission guards with resilient `<div class="candidate-title" data-df-field="title">`, ensure all headings output `<h2 class="section-heading" data-df-field="heading:<sectionKey>">`.
3. **R3: Reactive Iframe Direct Edit Lifecycle & Event Isolation (P1)**
   - Target files: `src/components/ResumeStudio/LivePreviewCanvas.jsx`
   - Idempotent `enableDirectEditOnDoc` & `disableDirectEditOnDoc` controllers, reactive `useEffect` watching `[directEdit, previewHtml]`.
4. **R4: Project-Wide Emoji Eradication & Material Symbols Design System (P1)**
   - Target files: `templateRegistry.js`, `TemplateGalleryModal.jsx`, `ReviewDesignStep.jsx`, `ExperienceStep.jsx`, `PersonalInfoStep.jsx`, `AtsDiagnosticModal.jsx`, `PhotoStudioModal.jsx`, `NotFound.jsx`, `Home.jsx`, and entire `src/` tree.
   - Replace all raw unicode emojis with Google Material Symbols or clean text.

## Orchestration Phases
- **Phase 0: Scope Survey**: Spawn 3 parallel Explorers:
  - Explorer 1: R1 (Pagination & 2-Page Budgeting Engine)
  - Explorer 2: R2 (Candidate Title & Section Heading Stamping across 89 templates)
  - Explorer 3: R3 (Direct Edit Lifecycle) + R4 (Full Emoji Eradication in src/)
- **Phase 1: Architecture & Feature Inventory (PROJECT.md)**:
  - Compile survey reports into `PROJECT.md` with complete Feature Inventory, code layout, and milestone interface contracts.
- **Phase 2: Execution Tracks**:
  - E2E Testing Track: Build/verify comprehensive test suites.
  - Implementation Milestones M1, M2, M3, M4.
  - Reviewer, Challenger, and Forensic Auditor verification at every gate.
- **Phase 3: Final Acceptance & Molecular Verification**:
  - `node scratch/test_r1_universal_runtime.mjs` (163/163 pass)
  - `node scratch/test_template_catalog_matrix.mjs` (1,780/1,780 pass)
  - `node scratch/scan_all_emojis.mjs` (0 emoji lines in src/)
  - `npm run build` (exit code 0)
