# DocForge Custom Agent Rules

## Quick Commands
- **Run Command**: Whenever the user says "run", "start", "start project", or similar, immediately run the `run_project.bat` script located in the workspace root. Do not ask for confirmation or write long explanations; run the script directly.

## Background Task Execution (Zero-Polling Protocol)
- **Rest Until Finished**: Whenever a background task, build process, or long-running command is launched, DO NOT poll or repeatedly check its status using `manage_task(Action='status')` or rapid timer loops. Once the task is initiated, output a brief acknowledgment if needed, immediately stop calling tools, and REST until the system automatically notifies you upon task completion.

## Execution Logging
- **Project Log Updates**: For every analysis and update, update [PROJECT_EXECUTION_LOG.md](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/.agents/PROJECT_EXECUTION_LOG.md) in the `.agents/` directory detailing what was analyzed (with file links and line numbers), what was updated, and what was done.
- **Task Persistence**: Tasks in `PROJECT_EXECUTION_LOG.md`'s task registry must never be deleted. They must only be added, or updated with progress status, as task topics are modified or completed through execution.

## Project Memory & Canvas Guide
- **Consult brain.md & repo_map.md**: Before starting any new task, reading/analyzing the codebase, or creating code, you must first read [.agents/brain.md](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/.agents/brain.md) (high-level architecture and task history) and [.agents/repo_map.md](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/.agents/repo_map.md) (live symbol definitions, exact line ranges, and call graphs). Refer to them to locate target files without reading entire source files into context.
- **Token Efficiency Protocol (Line-Ranged Reads)**: NEVER load an entire source file (>150 lines) into context unless rewriting it completely. Use `.agents/repo_map.md` to find the exact line range for your target function, then use `view_file(AbsolutePath, StartLine, EndLine)` to read ONLY that section.
- **Consult canvas_guide.md**: Before analyzing, modifying, debugging, or extending any functionality related to the visual document studio workspace canvas (specifically [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx) or related routing components), you must read [canvas_guide.md](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/docs/canvas_guide.md) in `docs/canvas_guide.md` to understand its states, events, execution recursions, and pipeline structures.
- **Automatic brain.md Synchronization**: For every task where new files are created, modified, renamed, or deleted, or new features/routes/modules are introduced, you must automatically update [.agents/brain.md](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/.agents/brain.md)'s directory tree, detailed file representations, and recently created/edited features sections to match these changes. This ensures the project memory remains 100% synchronized and correct at all times.
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

## 100% Deterministic Code Audit & Verification Protocol

When tasked with auditing, analyzing, hardening, or refactoring code:

### 1. The 4-Tier Dual-Model Architecture
- **Tier 1: Intent & Architectural Design (Opus / Planning Mode)**: For complex features, system rewrites, or ambiguous specs, establish a clear Logic Map and API contract before writing code.
- **Tier 2: Fast Surgical Execution (Gemini 3.7 Flash)**: Perform edits using Token-Sniper Line-Bounded Reads (`view_file(StartLine, EndLine)`).
- **Tier 3: Mandatory Closed-Loop Verification (Reflexion Engine)**:
  1. *Execute*: After ANY code change, run `python scripts/audit_suite.py` immediately.
  2. *Refine*: If it fails, read the specific failure trace, fix ONLY the flagged lines, and re-run.
  3. *Hard Cap (Max 3 Rounds)*: If `audit_suite.py` does not exit 0 after 3 attempts, halt immediately and escalate the blocker to the user/architect. Do NOT loop indefinitely or hallucinate rewrites.
- **Tier 4: Intent & Critical Diff Verification (Necessary != Sufficient)**:
  - An `exit 0` from `audit_suite.py` proves *mechanical correctness* (linters, AST, existing tests).
  - You must explicitly inspect the generated diff against the **user's actual requested intent**.
  - Any modifications touching **Auth, Billing, or Encryption** require explicit verification and flagging before declaring completion.

### 2. The 5-Lens Map-Reduce Audit Architecture
When auditing complex multi-file logic, execute or simulate 5 specialized inspection lenses:
- **Lens 1: Security & Auth Sentinel**: Scans for IDOR, SSRF, JWT secrets, plaintext credentials, and unsanitized parameters.
- **Lens 2: Concurrency & State Guardian**: Analyzes race conditions, SQLite write lock collisions, shared thread-pools without mutexes, and unhandled async event loops.
- **Lens 3: Resource & Lifecycle Watchdog**: Detects unclosed file streams (`fitz.Document`, `open()`), orphaned temporary files, and Windows `os.rename` file-locking collisions.
- **Lens 4: Control Flow & Indentation Tracer**: Identifies semantic indentation bugs, skipped conditional subprocesses, dead code, and pipeline wiring mismatches.
- **Lens 5: Dependency & Portability Checker**: Scans for missing requirements in `requirements.txt` and hardcoded local developer machine paths.

### 3. Token-Sniper Line-Bounded Reads
- NEVER pass full files (>150 lines) into context passively.
- Reference `.agents/repo_map.md` to identify exact target symbols and line ranges, and read only targeted blocks via `view_file(AbsolutePath, StartLine, EndLine)`.

### 4. Mandatory 4-Part Evidence Standard
Every discovered finding must contain:
1. **File Path & Line Number Range** (e.g. `backend/services/libreoffice.py:L45-L60`)
2. **Trigger Condition** (What state or input activates the bug?)
3. **Execution Trace** (Step-by-step control-flow breakdown)
4. **Deterministic Fix & Verification** (Exact drop-in replacement with error handling)

### 5. Supply-Chain & Verifier Invariants
- **Real Pinning Over Suppressions**: NEVER silence static security scanners using `# nosec` or inline ignore comments when a real cryptographic commit hash (`revision=...`), strict schema validation, or parameterized query can resolve the vulnerability.
- **Subprocess & Runner Safety**: Verifier and runner scripts must avoid `shell=True` and capture output cleanly with explicit `encoding="utf-8", errors="replace"`.
- **Dynamic Portability**: Never hardcode developer machine paths (e.g. `C:\Users\...`) into scripts or codebase logic. Dynamically resolve paths using `site`, `sysconfig`, or `Path(__file__)`.

## Opus-Grade Reasoning & Response Cadence

To guarantee that Gemini 3.7 Flash produces true Opus-depth logic and structure on every response:

### 1. Invariant 5-Part Response Structure
Every complex analysis, feature design, or debugging response MUST follow this structure:
1. **Direct Verdict / Bottom-Line First**: State the conclusion immediately in 1–2 sentences with zero conversational fluff.
2. **Underlying Mechanism & Root Cause**: Explain the failure or design at the AST, OS, database lock, or event-loop level.
3. **Trade-Off & Alternatives Matrix**: Provide a Markdown table comparing viable approaches with complexity, performance, and failure modes.
4. **Implicit Edge-Case & Gap Anticipation**: Explicitly address the 5 implicit edge cases:
   - *Offline / Network Drop*: What happens when disconnected?
   - *Corrupted / 0-Byte Input*: How does the parser handle bad magic bytes or empty buffers?
   - *High-Concurrency Race*: Are locks, connection pools, or transactions required?
   - *Timeout / Cancellation*: How does graceful degradation or cleanup trigger?
   - *Surrogates & Encodings*: Are unicode characters or Windows file locks guarded?
5. **Deterministic Drop-In Implementation**: Provide 100% complete replacement code blocks with error handling (never use `// ... rest of code unchanged` ellipses).


