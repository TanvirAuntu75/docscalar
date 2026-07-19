# DocForge Custom Agent Rules

## Quick Commands
- **Run Command**: Whenever the user says "run", "start", "start project", or similar, immediately run the `run_project.bat` script located in the workspace root. Do not ask for confirmation or write long explanations; run the script directly.

## Execution Logging
- **Project Log Updates**: For every analysis and update, update `PROJECT_EXECUTION_LOG.md` in the workspace root detailing what was analyzed (with file links and line numbers), what was updated, and what was done.
- **Task Persistence**: Tasks in `PROJECT_EXECUTION_LOG.md`'s task registry must never be deleted. They must only be added, or updated with progress status, as task topics are modified or completed through execution.

## Project Memory & Canvas Guide
- **Consult brain.md**: Before starting any new task, reading/analyzing the codebase, or creating code, you must first read `brain.md` in the workspace root. It contains the comprehensive memory of the project (file representations, what has been tested, created, and edited). Refer to it to quickly locate the correct files, avoid redundant research, and maintain continuity.
- **Consult canvas_guide.md**: Before analyzing, modifying, debugging, or extending any functionality related to the visual document studio workspace canvas (specifically [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx) or related routing components), you must read [canvas_guide.md](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/canvas_guide.md) in the workspace root to understand its states, events, execution recursions, and pipeline structures.
- **Automatic brain.md Synchronization**: For every task where new files are created, modified, renamed, or deleted, or new features/routes/modules are introduced, you must automatically update [brain.md](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/brain.md)'s directory tree, detailed file representations, and recently created/edited features sections to match these changes. This ensures the project memory remains 100% synchronized and correct at all times.
- **Fallback**: If the details needed for a task are not listed in `brain.md` or `canvas_guide.md`, proceed with standard search, analysis, and execution tools.

## UI/UX Strict Guidelines

### 1. Hierarchical Multi-Skill Coordination
You must orchestrate your design skills in a strict workflow hierarchy to ensure the best possible results:

1. **Backbone (`UI/UX Pro Max`) - The Core Design System**: All styling, color palettes, and typographic scales are driven primarily by `UI/UX Pro Max`. Run the search command first to establish the baseline theme tokens and rules:
   ```bash
   python ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "<query>" --design-system --project-name "DocForge"
   ```
2. **Context & Calibration (`Taste`) - The Design Dials**: Before writing layout codes, run a "Design Read" to calibrate the layout properties (Variance, Motion, Density). Output a one-line summary:
   `Reading this as: <page kind> for <audience>, with a <vibe> language, leaning toward <design system or aesthetic family>.`
   And establish dials internally (`DESIGN_VARIANCE`, `MOTION_INTENSITY`, `VISUAL_DENSITY` ranging from 1-10).
3. **Workflow & Prototypes (`Huashu Design`) - The Mockup/Presentation Specialist**: 
   * Apply **Fact Validation (Core Principle #0)**: Perform `WebSearch` to verify version numbers, specs, and existences before making design assumptions.
   * Follow the **Junior Designer Workflow**: Show reasoning, assumptions, and gray placeholder blocks to the user first.
   * If building slides/keynotes, use multi-file grids (`deck_index.html`). For mobile apps, use device frame templates (like `ios_frame.jsx`).
4. **Audit & Refinement (`Impeccable`) - Banish AI Slop**: Perform a strict final quality pass using Impeccable's strict anti-patterns list before delivering code.

### 2. Core Banned Anti-Patterns (AI Slop Checklist)
Verify that your final layout does not contain any of the following:
* ❌ **No AI Purple**: Banish standard blue-purple gradient meshes, glowing purple shadows, and generic neon backgrounds unless specifically branded.
* ❌ **No Emoji Glyphs**: Do not use emojis as bullet points or icons. Use Phosphor, Hugeicons, or Radix icons. Standardize stroke widths.
* ❌ **No Nested Cards**: Do not put cards inside cards. Group items using divider lines (`divide-y`), subtle top borders, or whitespace instead.
* ❌ **No SVG Illustrations**: Do not draw arbitrary figures, faces, or objects using complex raw SVG paths. Use real curated images or clean placeholders.
* ❌ **No Image Hover Anim**: Never scale/translate/rotate `<img>` tags on hover. Animate the card background, border, or shadow instead.
* ❌ **No Wrapped CTAs**: Ensure primary buttons fit text on a single line. Never let a button wrap text at desktop sizes.
* ❌ **No Duplicate CTA Intent**: Do not have multiple buttons with identical actions using different names (e.g. "Get Started" and "Try Free" on the same page).

### 3. Contrast, Typography, & Motion Guardrails
* **Contrast**: Text must hit a minimum contrast ratio of 4.5:1 (large text >= 3:1). Ghost/border CTAs must be readable over backgrounds.
* **Typography**: Headings display tracking floor: letter-spacing >= -0.04em (no overlapping letters). Cap body line widths at 65-75ch. Use `text-wrap: balance` on headlines and `text-wrap: pretty` on prose.
* **Layout**: Viewport Stability: Use `min-h-[100dvh]` instead of `h-screen`. Hero Top Padding Cap: Keep hero top padding max `pt-24` at desktop to keep content above the fold. Corner radius must be uniform.
* **Motion**: Use exponential easing curves (`ease-out-quart`, `expo`). Never use bounce/elastic curves. Always support `@media (prefers-reduced-motion: reduce)` alternatives (crossfade or instant jump).



