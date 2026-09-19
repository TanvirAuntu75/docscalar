# DocForge CV Builder Test Infrastructure & Methodology (TEST_INFRA.md)

## 1. Executive Test Architecture & Philosophy

The DocForge CV Builder test infrastructure enforces the **Strict Molecular Testing & Flaw-Hunting Protocol (Zero-Assumption Rule)** across all 89 CV templates, state engines, intelligence synthesizers, and multi-format exporters.

### Core Testing Invariants:
1. **Quantitative Test Density (30 to 100 Assertion Invariant)**:
   Every feature milestone must be accompanied by an automated test suite executing **at least 30 distinct test areas and up to 100+ falsifiable test assertions**. Surface-level checks (5–10 tests) are strictly prohibited.
2. **Anti-Inflation Test Integrity (Zero Fake Assertions)**:
   - **No Always-Pass Tricks**: Every assertion must be strictly falsifiable. Constructs like `|| true`, `condition || 1`, or hardcoded `true` are barred.
   - **No Duplicate Areas**: Each numbered test area must verify a distinct code path, branch, DOM structure, or state transition.
   - **No Local-Copy Testing**: Suites import and exercise the actual source code modules (`src/engines/utility/*`, `src/context/*`, `src/components/ResumeStudio/*`, `src/utils/*`), never local copies of internal functions.
   - **Formula-Level Verification Required**: Numeric calculations (line height scaling `1.45 * lineHeightScale`, ring-buffer history pruning `past.slice(past.length - maxSize)`, photo pan/zoom clamping, ATS health weights) are asserted against exact mathematical results.
   - **Branch-Level Coverage Required**: Every conditional branch (`themeLayout === 'single'` vs `'split'`, `eduIdx <= 2` vs `eduIdx > 2`, 5 impact verb categories, 8 font families, empty vs filled arrays) is exercised.
3. **Multi-Engine & Layout Parity**:
   Verifies determinism across screen DOM representations, `@media print` print styles, and DOCX binary exports.

---

## 2. 4-Tier Test Suite Structure

```
tests/ & scratch/
├── test_r1_universal_runtime_matrix.mjs    # R1: Universal Template Runtime & 8-Core Font Registry (35+ areas, 100+ assertions)
├── test_r2_modular_state_and_history.mjs   # R2: Resume Reducer, Ring-Buffer Undo/Redo & Subcomponents (30+ areas, 40+ assertions)
├── test_r3_semantic_graph_and_metrics.mjs  # R3: Natural Metric Synthesizer & 120+ Domain Graph (30+ areas, 60+ assertions)
├── test_r4_docx_and_interactive_tools.mjs  # R4: Client-Side DOCX Exporter, Photo Studio Math & DnD (30+ areas, 45+ assertions)
```

### Milestone Test Mapping:
| Test Suite | Target Milestone | Requirements Covered | Key Modules Tested | Assertion Target |
|---|---|---|---|---|
| `test_r1_universal_runtime_matrix.mjs` | M1 / R1 | Universal section reordering, 8-font registry, Google Fonts links, dynamic 2-column heuristics, layout reflow | `src/engines/utility/universalTemplateRuntime.js`, `src/engines/utility/fontRegistry.js`, `src/engines/utility/templates/*` | 100+ assertions (35+ areas) |
| `test_r2_modular_state_and_history.mjs` | M4 / R2 | `resumeReducer.js`, `historyEngine.js` ring-buffer undo/redo, 14 `ResumeStudio` subcomponent contracts | `src/context/resumeReducer.js`, `src/engines/utility/historyEngine.js`, `src/components/ResumeStudio/*` | 40+ assertions (30+ areas) |
| `test_r3_semantic_graph_and_metrics.mjs` | M2 / R3 | Natural metric synthesis (0 brackets), 5 impact categories, 120+ domain `CONCEPT_TAXONOMY_GRAPH`, synonym matching | `src/engines/utility/resumeIntelligenceEngine.js`, `src/engines/utility/semanticMatcherEngine.js` | 60+ assertions (30+ areas) |
| `test_r4_docx_and_interactive_tools.mjs` | M3 / R4 | Client-side `docxExporter.js` binary generation, OpenXML tables/bullets, Photo Studio pan/zoom/rotate/filter math, DnD ordering | `src/engines/utility/docxExporter.js`, `src/components/ResumeStudio/PhotoStudioModal.jsx`, `src/engines/utility/printUtils.js` | 45+ assertions (30+ areas) |

---

## 3. Test Runner Commands & Execution

All test suites are implemented as pure Node.js ESM modules (`.mjs`) for instant, high-speed execution with zero browser overhead:

```bash
# Execute individual test suites
node scratch/test_r1_universal_runtime_matrix.mjs
node scratch/test_r2_modular_state_and_history.mjs
node scratch/test_r3_semantic_graph_and_metrics.mjs
node scratch/test_r4_docx_and_interactive_tools.mjs

# Execute all suites sequentially
node scratch/test_r1_universal_runtime_matrix.mjs && node scratch/test_r2_modular_state_and_history.mjs && node scratch/test_r3_semantic_graph_and_metrics.mjs && node scratch/test_r4_docx_and_interactive_tools.mjs
```

---

## 4. Coverage Thresholds & Pass Criteria

- **Zero Tolerance on Regressions**: 100% of defined assertions must pass.
- **Zero Mock Data Resurrection**: Clear/empty payloads must not resurrect hardcoded template sample strings.
- **Zero Raw Bracket Placeholders**: `enhanceBullet` must produce 0 occurrences of `[` or `]`.
- **Exact Ring-Buffer Equality**: Undo/redo sequences (e.g. 10 mutations -> 5 undos -> 2 redos) must match the exact serialized snapshots.
- **DOCX Binary Integrity**: Generated DOCX byte streams must have valid ZIP/OpenXML headers (`PK\x03\x04`) and non-zero byte length.
