# DocForge Project Instructions & Subagent Orchestration Rules (GEMINI.md)

## Phased Subagent Orchestration Protocol (Anti-Stampede & Isolated Task Guard)

When tasked with long, complex, multi-feature integrations or major system remediations:

### 1. The Anti-Stampede Invariant (One Task at a Time)
- **NO Concurrent Swarm Chaos**: NEVER spawn a mass of subagents all modifying the codebase simultaneously. Concurrent writes to overlapping files cause catastrophic race conditions, overwritten edits, and state desyncs.
- **Sequential Phase-Gating**: Deploy subagents sequentially—one specific task at a time. Each subagent must finish, report its concrete diffs or findings, and have its work verified before the next subagent is launched.

### 2. The 3-Phase Subagent Workflow
For any multi-step integration, orchestrate in distinct chronological phases:
- **Phase 1: Forensic Inspection Specialist**:
  - Task: Read target files, extract exact lines, map data structures, and identify gaps.
  - Constraint: Strictly read-only tools. Zero code modifications.
- **Phase 2: Surgical Implementation Specialist**:
  - Task: Execute a single, well-bounded code modification with error handling.
  - Constraint: Limited strictly to the assigned file(s). No out-of-scope refactoring.
- **Phase 3: Adversarial Quality & Verification Auditor**:
  - Task: Run automated molecular test suites (30+ assertions), verify DOM/API parity, and check for regressions.
  - Constraint: Falsifiable test assertions only; zero local-copy testing.

### 3. Subagent Prompt Scoping Standard
When invoking a subagent via `invoke_subagent`:
1. **Context Compactness**: Provide only the necessary file paths, line ranges, and API contracts. Do not pass unnecessary conversational history.
2. **Single Deliverable**: Assign exactly one discrete goal (e.g., "Harmonize Harvard Classic photo rendering" or "Fix ruler light-mode CSS").
3. **Explicit Verification Target**: Include the exact test command or assertion the subagent must satisfy.

### 4. User Trigger Syntax
When the user specifies:
- *"Use subagents for specific tasks not all at once"*
- *"Step-by-step subagent execution"*
- *"/teamwork-preview" or "/goal" with multiple features*
The parent agent must immediately establish a Phase-Gated Task List, launch subagents sequentially for each item, and report progress incrementally after each phase completes.

---

## Direct-Edit & Resume Studio Workspace Rules
- **Direct Edit Default**: `directEdit` must default to `OFF` (`false`) on initial template load so the document canvas remains a clean, pristine, high-fidelity live preview.
- **Block Layout Preservation**: Never apply `display: inline-block !important;` to block-level elements (`h1`, `h2`, `div`, `p`) in direct-edit mode.
- **Light Theme Harmony**: All canvas tools (rulers, guide boxes, toolbars) must strictly match DocForge's light theme environment.
- **Zero Ghost Headers**: Never render placeholder text (`TYPE HERE...`) on untouched default templates.

---

## DocScalar OCR Acceptance Criteria & Benchmark Invariant
- **The 90% / 99% Quality Mandate**: Under NO circumstances should any OCR model or pipeline be declared acceptable or deployment-ready for DocScalar unless it empirically reaches:
  1. **Raw Model Accuracy**: $\ge 90\%$ Exact Match Accuracy generally across real-world validation benchmarks.
  2. **Enhanced Pipeline (with Language Model / Lexicon / Post-Processor)**: $> 99\%$ Exact Match Accuracy.
- **Non-Negotiable Quality Standard**: Never settle for or recommend sub-90% checkpoints as final. If a checkpoint scores below 90% exact match (e.g. ~43%), treat it strictly as an intermediate milestone requiring real-world fine-tuning, dataset expansion, or contextual language model decoding to hit the invariant.
