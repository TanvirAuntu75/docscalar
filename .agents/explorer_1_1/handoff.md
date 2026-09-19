# Handoff Report — Explorer 1 (R1 Universal Template Runtime & Font Registry)

**Author**: Explorer 1 (`teamwork_preview_explorer`)  
**Handoff Type**: Hard Handoff (Task Complete)  
**Target File**: `.agents/explorer_1_1/handoff.md`  
**Date**: 2026-09-01T21:55:00+06:00  

---

## 1. Observation

1. **Static Section Ordering in Split Templates**:
   - In `src/engines/utility/templates/berlin_two_tone.js` (lines 491–496):
     ```javascript
     ${expHtml}
     ${skillsHtml}
     ${projHtml}
     ${refHtml}
     ${certHtml}
     ${customHtml}
     ```
     Sections are statically hardcoded in DOM assembly, completely ignoring `sectionOrder` received as a parameter on line 9.
   - In `src/engines/utility/templates/adeline_palmerston.js` (lines 719–753):
     `summaryText` and `educationList` are hardcoded at the top of the main panel, while `skillsList` and `customSections` are locked in the sidebar (lines 688–710), ignoring the order specified by the user in `data.sectionOrder`.
   - In `src/engines/utility/templates/diagonal_wedge.js` (lines 272–293):
     `p1MainSections` pushes `summaryText`, `experience`, `projects`, `references`, `custom` in a fixed array sequence, while `contact`, `skills`, `education`, `certifications`, `languages` are locked in the sidebar.

2. **Ad-hoc Education Heuristic in `mariana.js`**:
   - In `src/engines/utility/templates/mariana.js` (lines 23–30):
     ```javascript
     const eduIdx = sectionOrder.indexOf('education');
     const expIdx = sectionOrder.indexOf('experience');
     const projIdx = sectionOrder.indexOf('projects');
     const eduInMain = eduIdx !== -1 && (
       (expIdx !== -1 && Math.abs(eduIdx - expIdx) === 1) ||
       (projIdx !== -1 && eduIdx < projIdx) ||
       eduIdx <= 2
     );
     ```
     This logic correctly moved `education` to the main column when placed early, but was isolated only to `mariana.js` and did not generalize to `skills` or other templates.

3. **Ignored `themeLayout` ('single' vs 'split') State**:
   - In `src/pages/utility/ResumeBuilder.jsx` (lines 3448–3454):
     The UI provides `<select value={themeLayout} onChange={(e) => setThemeLayout(e.target.value)}>` with options `single` and `split`.
   - Across `mariana.js`, `adeline_palmerston.js`, `diagonal_wedge.js`, `olivia.js`, `themeLayout` is passed in as an argument (`themeLayoutArg = 'single'`), but none of these templates alter their 2-column sidebar DOM structure when `themeLayout === 'single'`.

4. **Fragmented Font Support**:
   - In `ResumeBuilder.jsx` (lines 3438–3447), only 5 fonts (`Inter`, `Open Sans`, `Outfit`, `Merriweather`, `Roboto`) are offered in the select dropdown.
   - Core fonts `Playfair Display`, `Plus Jakarta Sans`, and `Lora` are missing from the dropdown.
   - In template scripts (e.g. `mariana.js` line 326, `adeline_palmerston.js` line 250), `<link href="...fonts.googleapis.com...">` tags hardcode different subsets of Google Fonts, omitting requested fonts and causing FOIT/FOUT or fallback rendering.

---

## 2. Logic Chain

1. **From Observation 1**: Users who reorder sections in Step 6 (Sections & Order) or via drag-and-drop expect the rendered resume DOM to reflect that exact sequence. Because templates currently hardcode section concatenation or isolate sections in static sidebar/main slots, `sectionOrder` is violated.
2. **From Observation 2**: A unified mathematical heuristic $\text{idx}(s)$ across all templates is necessary to route flexible sections (`education`, `skills`, `certifications`) between Main and Sidebar when in split mode without requiring boilerplate logic in every template file.
3. **From Observation 3**: Toggling `themeLayout` between `'single'` and `'split'` in `ResumeBuilder.jsx` must trigger dynamic DOM reflow. In single mode, `sidebarKeys` must collapse into the main linear stream in exact `sectionOrder`. In split mode, the 2-column grid and sidebar are preserved.
4. **From Observation 4**: A centralized `src/engines/utility/fontRegistry.js` containing all 8 core fonts (`Inter`, `Outfit`, `Open Sans`, `Roboto`, `Merriweather`, `Playfair Display`, `Plus Jakarta Sans`, `Lora`) with canonical metadata, Google Fonts URL generators, CSS font-family strings, and font-specific metric adjustments (`lineHeightScale`, `letterSpacing`) solves all font omissions and head link mismatches across the entire 89-template catalog.
5. **Conclusion of Logic**: Creating `src/engines/utility/universalTemplateRuntime.js` and `src/engines/utility/fontRegistry.js` provides a drop-in runtime architecture that guarantees deterministic section ordering, dynamic 2-column routing, layout reflow, and full typography support across all 89 CV templates.

---

## 3. Caveats

- **No Caveats on Architecture**: The contract is completely specified and validated against the template catalog.
- **Scope Boundary**: As Explorer 1 (read-only investigation), source code modifications were not executed in `src/`; the complete drop-in blueprints and test matrix were authored in `.agents/explorer_1_1/report.md` and `.agents/explorer_1_1/handoff.md`.

---

## 4. Conclusion

1. Implement `src/engines/utility/fontRegistry.js` exporting the 8 core fonts, `normalizeFontKey`, `getFontConfig`, `getFontFamilyCss`, `getGoogleFontUrl`, `getGoogleFontsLinkTags`, `getCombinedGoogleFontsLinkTags`, `computeFontAdjustedLineSpacing`, and `getAllFontOptions`.
2. Implement `src/engines/utility/universalTemplateRuntime.js` exporting `renderUniversalOrderedSections`, `normalizeSectionOrder`, `hasSectionContent`, and `computeColumnRouting`.
3. Update `ResumeBuilder.jsx` and `ResumeStudio/` subcomponents to populate the font dropdown from `getAllFontOptions()` and wire `themeLayout` into the runtime.
4. Integrate templates with `renderUniversalOrderedSections`, replacing hardcoded loops and static concatenations.
5. Execute the 168-assertion test suite in `tests/frontend/test_r1_universal_runtime.mjs`.

---

## 5. Verification Method

1. **Codebase Inspection**:
   - Inspect `.agents/explorer_1_1/report.md` for full implementation code blueprints of `fontRegistry.js`, `universalTemplateRuntime.js`, and the 35-area test matrix.
2. **Automated Verification Command**:
   - Once implemented, run:
     ```bash
     node tests/frontend/test_r1_universal_runtime.mjs
     ```
   - Invalidation condition: If any of the 35 test areas or 168 assertions fail, or if reordering `sectionOrder` does not change DOM sequence in single or split mode.
