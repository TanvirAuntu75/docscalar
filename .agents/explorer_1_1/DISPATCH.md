## 2026-09-01T15:50:20Z
Survey R1 (Universal Template Runtime & Dynamic Section Dispatcher, Font Registry, dynamic two-column routing heuristics, and themeLayout single vs split across templates).

INVESTIGATE:
1. Inspect `src/engines/utility/resumeTemplates.js` and representative templates in `src/engines/utility/templates/` (e.g. `mariana.js`, `harvard_classic.js`, `silicon_valley_ats.js`, `adeline_palmerston.js`, `diagonal_wedge.js`, etc.).
2. How do current templates handle `data.sectionOrder`? (See how `mariana.js` implemented dynamic column routing recently in TSK-426).
3. Design the drop-in architecture for `src/engines/utility/universalTemplateRuntime.js`:
   - `renderUniversalOrderedSections(data, options, renderers, layoutRules)`
   - Dynamic 2-column routing heuristics: when education/skills are in main vs sidebar based on `sectionOrder`.
   - `themeLayout` ('single' vs 'split') handling to dynamically reflow multi-column sidebars into single-column linear streams.
4. Design `src/engines/utility/fontRegistry.js`:
   - Support for all 8 core fonts: `Inter`, `Outfit`, `Open Sans`, `Roboto`, `Merriweather`, `Playfair Display`, `Plus Jakarta Sans`, `Lora`.
   - Automatic Google Fonts stylesheet `<link>` injection helper and CSS `font-family` mappings.
   - Font metric adjustments / line-height rules if applicable.
5. Create a concrete, verified implementation blueprint and write your full findings to `.agents/explorer_1_1/report.md` and `.agents/explorer_1_1/handoff.md`.
6. Send a message to your parent with your summary and handoff path when done.
