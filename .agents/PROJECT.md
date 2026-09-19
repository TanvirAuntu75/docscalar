# Project: DocForge CV Builder Master Resolution Blueprint

## Architecture
- **Universal Template Runtime**: `src/engines/utility/universalTemplateRuntime.js` — deterministic `renderUniversalOrderedSections` across all 89 templates, dynamic two-column heuristics, single vs split layout reflow.
- **Typography Engine**: `src/engines/utility/fontRegistry.js` — 8 core font stacks (`Inter`, `Outfit`, `Open Sans`, `Roboto`, `Merriweather`, `Playfair Display`, `Plus Jakarta Sans`, `Lora`) with automatic Google Fonts injection and metrics scaling.
- **God-Component Modularization & State Engine**:
  - `src/context/ResumeContext.jsx` & `src/context/resumeReducer.js` — Context provider and reducer architecture.
  - `src/engines/utility/historyEngine.js` — Ring-buffer immutable snapshot history with instant Ctrl+Z / Ctrl+Y undo/redo.
  - `src/components/ResumeStudio/` — 14 focused subcomponents for wizard steps, preview canvas, navigation, and studio modals.
- **Intelligence & Semantic Graph**:
  - `src/engines/utility/resumeIntelligenceEngine.js` — Natural metric synthesis without raw bracket placeholders.
  - `src/engines/utility/semanticMatcherEngine.js` — 120+ domain taxonomy graph covering Engineering, Product, Design, Sales, Marketing, and Operations.
- **Multi-Format Export & Canvas Tools**:
  - `src/engines/utility/docxExporter.js` — Pure client-side ATS-compliant DOCX generation using `docx` library.
  - `@dnd-kit` Sortable Section & Title Serial Manager in Step 6.
  - Interactive Photo Studio Canvas (Pan, Zoom, Rotate, Filters).

## Feature Inventory
| # | Feature / Area | Description | Milestone | Source |
|---|----------------|-------------|-----------|--------|
| 1 | Universal Template Runtime | `universalTemplateRuntime.js`, `renderUniversalOrderedSections`, dynamic 2-column heuristics, `themeLayout` single vs split | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Typography Engine | `fontRegistry.js` supporting all 8 core fonts + Google Fonts link injection & metric adjustment | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Natural Metric Synthesis | Elimination of `[quantify the impact here]` placeholders in `resumeIntelligenceEngine.js` with natural clauses | M2 | ORIGINAL_REQUEST §R3 |
| 4 | Semantic Graph 120+ Domains | Expansion of `CONCEPT_TAXONOMY_GRAPH` in `semanticMatcherEngine.js` across 120+ industry tracks | M2 | ORIGINAL_REQUEST §R3 |
| 5 | Client-Side DOCX Exporter | `docxExporter.js` building ATS-grade Word documents from JSON state via `docx` library | M3 | ORIGINAL_REQUEST §R4 |
| 6 | DnD Sortable Section Manager | `@dnd-kit` drag-and-drop section reordering in Wizard Step 6 | M3 | ORIGINAL_REQUEST §R4 |
| 7 | Interactive Photo Studio Canvas | Studio Canvas modal supporting Pan, Zoom, Rotation, and Grayscale/Contrast filters | M3 | ORIGINAL_REQUEST §R4 |
| 8 | ResumeStudio Modular Subcomponents | 14 decomposed subcomponents under `src/components/ResumeStudio/` replacing 4,273-line monolith | M4 | ORIGINAL_REQUEST §R2 |
| 9 | Ring-Buffer Undo/Redo Engine | `ResumeContext.jsx`, `resumeReducer.js`, and `historyEngine.js` with keyboard shortcuts | M4 | ORIGINAL_REQUEST §R2 |
| 10 | Master E2E & Adversarial Matrix | Comprehensive 30-100 test assertion matrix per test suite, zero-tolerance forensic audit | M_TEST, M5 | User Rules |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M_TEST | E2E Testing Suite Track | Design & implement 4-Tier test suites for R1, R2, R3, R4 with 30–100 assertion density | none | DONE |
| M1 | Universal Template Runtime & Fonts | `universalTemplateRuntime.js`, `fontRegistry.js`, dynamic section ordering across templates, layout reflow | none | DONE |
| M2 | Intelligence & Semantic Graph Expansion | Natural metric synthesis in `resumeIntelligenceEngine.js`, 120+ domain `CONCEPT_TAXONOMY_GRAPH` | none | DONE |
| M3 | Multi-Format Export & Canvas Tools | `docxExporter.js`, `@dnd-kit` sortable manager, Photo Studio Canvas with pan/zoom/rotate | none | DONE |
| M4 | God-Component Modularization & History | Decompose `ResumeBuilder.jsx` into `src/components/ResumeStudio/*`, `ResumeContext`, `resumeReducer`, `historyEngine` | M1, M2, M3 | DONE |
| M5 | Final E2E Integration & Audit | Execute full test matrix across all 89 templates, Reviewer checks, Challenger stress tests, Forensic Audit | M_TEST, M1-M4 | DONE |

## Interface Contracts
### Universal Section Dispatcher
```javascript
export function renderUniversalOrderedSections(data, options, renderers, layoutRules = {}) {
  // data.sectionOrder: array of section keys (e.g. ['experience', 'education', 'skills', 'projects', ...])
  // renderers: dictionary of section render functions { experience: (data) => string, ... }
  // layoutRules: { columnRouting: 'auto' | 'main' | 'sidebar', themeLayout: 'single' | 'split' }
  // returns: { mainHtml, sidebarHtml, fullHtml }
}
```

### Font Registry Contract
```javascript
export const FONT_REGISTRY = {
  inter: { name: 'Inter', family: "'Inter', sans-serif", googleFont: 'Inter:wght@300;400;500;600;700', category: 'sans-serif' },
  outfit: { name: 'Outfit', family: "'Outfit', sans-serif", googleFont: 'Outfit:wght@300;400;500;600;700', category: 'sans-serif' },
  // ... 8 core fonts
};
export function getFontGoogleUrl(fontKey);
export function getFontFamilyCss(fontKey);
```

### State & History Engine Contract
```javascript
export function createHistoryStack(maxSize = 30);
export function pushHistoryState(stack, state);
export function undoHistoryState(stack);
export function redoHistoryState(stack);
export function canUndo(stack);
export function canRedo(stack);
```

## Code Layout
- `src/engines/utility/universalTemplateRuntime.js` — Universal section ordering and column flow engine
- `src/engines/utility/fontRegistry.js` — Typography registry and Google Fonts URL generator
- `src/engines/utility/docxExporter.js` — Client-side DOCX export engine using `docx`
- `src/engines/utility/resumeIntelligenceEngine.js` — Smart bullet enhancer with natural metric clauses
- `src/engines/utility/semanticMatcherEngine.js` — 120+ domain taxonomy graph and keyword matcher
- `src/context/ResumeContext.jsx` & `src/context/resumeReducer.js` — Context and state management
- `src/engines/utility/historyEngine.js` — Immutable ring-buffer history stack
- `src/components/ResumeStudio/` — Decomposed 14 subcomponents
- `src/pages/utility/ResumeBuilder.jsx` — Clean top-level container coordinating ResumeStudio components
- `tests/` and `scratch/` — Automated test suites adhering to 30-100 assertion invariant
