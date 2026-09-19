# Master Orchestration Plan: CV Builder Resolution Blueprint

## Strategy & Pattern
- **Orchestration Pattern**: Project Pattern (Dual Track: Implementation Track + E2E Testing Track)
- **Zero-Assumption Testing**: 30 to 100 quantitative assertion invariant per test suite, real runtime AST/DOM checks, zero fake assertions.

## Phased Execution Plan

### Phase 0: Parallel Survey (3 Explorers)
1. **Explorer 1 (R1 Survey)**:
   - Target files: `src/engines/utility/templates/*.js`, `src/engines/utility/resumeTemplates.js`, `src/engines/utility/universalTemplateRuntime.js` (if exists or needed), `fontRegistry.js`.
   - Inspect current section rendering patterns across the 89 templates, how `sectionOrder` is handled, and design the universal section dispatching contract.
2. **Explorer 2 (R2 Survey)**:
   - Target files: `src/pages/utility/ResumeBuilder.jsx`, `src/components/`, `src/engines/utility/wysiwygStateEngine.js`.
   - Map all 4,273 lines of `ResumeBuilder.jsx`: all state variables, callbacks, modal controls, wizard steps (0-7), and create concrete decomposition blueprint into 14 components under `src/components/ResumeStudio/` with `ResumeContext.jsx`, `resumeReducer.js`, and `historyEngine.js`.
3. **Explorer 3 (R3 & R4 Survey)**:
   - Target files: `src/engines/utility/resumeIntelligenceEngine.js`, `src/engines/utility/semanticMatcherEngine.js`, `package.json` (`docx`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`), photo crop implementations in `ResumeBuilder.jsx`.
   - Map metric synthesis improvements, 120+ domain taxonomy graph schema, client-side DOCX generation architecture via `docx`, and Photo Studio Canvas requirements.

### Phase 1: Test Suite & Infrastructure Track (M_TEST)
- Test Writer / Test Orchestrator designs and implements:
  - `scratch/test_r1_universal_runtime_matrix.mjs`
  - `scratch/test_r2_modular_state_and_history.mjs`
  - `scratch/test_r3_semantic_graph_and_metrics.mjs`
  - `scratch/test_r4_docx_and_interactive_tools.mjs`
  - Master E2E runner validating all requirements.

### Phase 2: Implementation Milestones
- **M1**: Universal Template Runtime & Dynamic Section Dispatcher (`universalTemplateRuntime.js`, `fontRegistry.js`, dynamic two-column routing, `themeLayout` support).
- **M2**: Natural Metric Synthesis & Semantic Graph Expansion (Eliminate `[quantify...]`, 120+ domain taxonomy graph).
- **M3**: Multi-Format Export Engine & Interactive Canvas Tools (`docxExporter.js`, `@dnd-kit` Sortable Section Manager in Step 6, Photo Studio Canvas).
- **M4**: God-Component Modularization (`src/components/ResumeStudio/*`, `ResumeContext.jsx`, `resumeReducer.js`, `historyEngine.js`, `ResumeBuilder.jsx` integration).

### Phase 3: Final E2E Verification, Adversarial Hardening & Forensic Audit (M5)
- Run complete test matrix across all 89 templates and new components.
- Reviewers review correctness and interface conformance.
- Challengers empirically stress-test edge cases.
- Forensic Auditor performs zero-tolerance integrity check.
