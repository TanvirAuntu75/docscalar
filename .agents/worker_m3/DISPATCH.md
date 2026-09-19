## 2026-09-02T14:54:01Z
You are Worker M3 for DocForge CV Builder Master Resolution.

Working directory: c:/Users/Tanvir Alam/Downloads/New folder upscaled/.agents/worker_m3
Project root: c:/Users/Tanvir Alam/Downloads/New folder upscaled
Authoritative user request: c:/Users/Tanvir Alam/Downloads/New folder upscaled/.agents/ORIGINAL_REQUEST.md
Survey findings: c:/Users/Tanvir Alam/Downloads/New folder upscaled/.agents/explorer_survey_3/report.md
Project blueprint: c:/Users/Tanvir Alam/Downloads/New folder upscaled/PROJECT.md

Scope: Milestone M3 — Reactive Iframe Direct Edit Lifecycle & Event Isolation (Requirement R3).
Exclusive File Ownership:
- `src/components/ResumeStudio/LivePreviewCanvas.jsx`

Tasks:
1. `src/components/ResumeStudio/LivePreviewCanvas.jsx`:
   - Refactor WYSIWYG logic into two pure, idempotent controllers:
     - `enableDirectEditOnDoc(doc, actions)`: Cleans prior state, injects smooth hover/focus outline styles (without permanent dashed outlines), binds input/blur/paste/keydown handlers on all `[data-df-field]`, and activates photo click handling.
     - `disableDirectEditOnDoc(doc)`: Blurs `doc.activeElement`, clears dynamic style elements (`#docforge-direct-edit-styles`), strips `contenteditable` and `spellcheck` attributes, and explicitly nullifies all DOM properties (`el.oninput = null`, `el.onblur = null`, `el.onpaste = null`, `el.onkeydown = null`, `photo.onclick = null`).
   - Add reactive `useEffect` watching `[directEdit, previewHtml]` to dynamically enable/disable editing inside the iframe DOM immediately upon button click without requiring iframe reload.
   - Ensure candidate title editing works seamlessly with `<div class="candidate-title" data-df-field="title">`.
2. Verification:
   - Create and run an automated test suite verifying:
     - Toggling Direct Edit OFF immediately removes contenteditable and nullifies event listeners.
     - Toggling Direct Edit ON enables contenteditable on title, name, summary, jobs, education, skills, and dispatches state updates on input/blur.
   - Run existing regression suites:
     - `node tests/frontend/test_template_catalog_matrix.mjs` (1,780 assertions)
     - `node tests/frontend/test_r1_universal_runtime.mjs` (208 assertions)
     - `npm run build` (must exit 0)
