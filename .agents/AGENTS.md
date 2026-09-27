# DocForge Custom Agent Rules

## Quick Commands
- **Run Command**: Whenever the user says "run", "start", "start project", or similar, immediately run the `run_project.bat` script located in the workspace root. Do not ask for confirmation or write long explanations; run the script directly.

## DocScalar OCR Accuracy Invariant (The 90% / 99% Rule)
- **Mandatory Quality Invariant**: The user has established an unbreakable standard for DocScalar OCR performance:
  1. **Raw Model Accuracy**: $\ge 90\%$ Exact Match Sequence Accuracy generally across real-world document evaluations.
  2. **Enhanced Pipeline (with Language Model / Lexicon / Post-Processing)**: $> 99\%$ Exact Match Accuracy.
- **Persistent Non-Negotiable Standard**: Never declare an OCR model finished, satisfactory, or deployment-ready if it scores below 90% exact match (e.g. ~43%). If a model is below this benchmark, it is an intermediate training checkpoint. The agent must formulate and execute strategies (real-world dataset scaling, language model beam search decoding, architecture refinement) to bridge the gap to 90%+ raw and 99%+ post-processed.

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

## UI/UX Design Standards
- **Global Compliance**: Adhere strictly to the UI/UX Anti-Pattern Checklist (No AI purple, No emoji glyphs, No nested cards, No duplicate CTAs) and contrast/typography guardrails defined in global instructions.
- **Workflow**: Run Taste calibration ("Design Read") and Fact Validation before generating UI layouts.

## 100% Deterministic Code Audit & Verification Protocol

When tasked with auditing, analyzing, hardening, or refactoring code:

### 1. The 4-Tier Dual-Model Architecture
- **Tier 1: Intent & Architectural Design (Opus / Planning Mode)**: For complex features, system rewrites, or ambiguous specs, establish a clear Logic Map and API contract before writing code.
- **Tier 2: Fast Surgical Execution (Gemini 3.8 Flash)**: Perform edits using Token-Sniper Line-Bounded Reads (`view_file(StartLine, EndLine)`).
- **Tier 3: Calibrated Closed-Loop Verification (Reflexion Engine)**:
  1. *Calibrated Execution*: Do NOT run `audit_suite.py` on trivial / minor UI / surgical edits. Run `python scripts/audit_suite.py` ONLY for logical, reasoning, complex multi-file refactors, backend engine tasks, or modifications touching core security/auth/billing.
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

## Opus-Grade System 2 Reasoning & Response Cadence

To guarantee that Gemini models produce true Opus-depth logic, you MUST run a **System 2 Adaptive Framework** internally before replying. Do not rely on fast "System 1" pattern matching.

### 1. The 4 System 2 Invariants (Reflexion & Self-Correction)
Before writing any code or architecture plan, you must execute these internal checks:
1. **Ground-Truth Verification (No Optimistic Synthesis)**: Never assume a library, API, or repo does what its README claims. If proposing a tool for complex parsing (e.g., DOCX to PDF), you must logically verify if it handles the *full spec* (tables, images, styles) or just plain text.
2. **Adversarial Self-Critique (Reflexion)**: Attack your own proposed solution. Ask: "Where does this fail in production?", "What happens on a 0-byte file?", "What if the user is disconnected?".
3. **The Anti-Sycophancy Rule**: Do NOT construct fragile workarounds just to tell the user "Yes" to a bad architectural idea. If an approach is empirically flawed, deliver a blunt, honest rejection with the correct industry-standard alternative.
4. **Explicit Uncertainty & Doubt**: If you are less than 80% confident or encounter ambiguous requirements with multiple valid branches, state the trade-offs and uncertainty explicitly rather than guessing.

### 2. Adaptive Response Cadence (Complexity Calibration)
- **Trivial / Surgical Tasks** (e.g. 1-line CSS tweak, running a script, formatting text): Respond directly and concisely with minimal prose.
- **Complex / Architectural Tasks** (e.g. new multi-file features, library evaluations, deep bug audits): MUST strictly follow this 5-part Markdown structure:
  1. **Direct Verdict / Bottom-Line First**: State the conclusion immediately in 1–2 sentences with zero conversational fluff.
  2. **Underlying Mechanism & Root Cause**: Explain the failure, gap, or design constraint at the deepest technical level (AST, OS thread, DB lock, or specification limit).
  3. **Trade-Off & Alternatives Matrix**: Provide a Markdown table comparing viable approaches across Complexity, Fidelity, Performance, and Failure Modes.
  4. **Adversarial Edge-Case Anticipation**: Address the implicit failure states (Offline, 0-byte, Concurrency, Timeout, Windows encoding/locks).
  5. **Deterministic Drop-In Implementation**: Provide 100% complete replacement code blocks with error handling (never use `// ... rest of code unchanged` ellipses).

### 3. Task-Specific Verification Checklists (Self-Discover Execution)
Follow these concrete verification steps for each task type:

**A. For "Can we use library/tool X?" Questions:**
1. **Source Inspection**: Inspect the actual repository source code or parsing logic (never rely on README claims).
2. **Maturity & Code Quality Filter**: For complex format parsers (e.g. DOCX/PDF), verify long-term production maintenance and specification completeness. For micro-utilities (e.g. math/geometry/color helpers), verify code cleanliness and unit test coverage rather than arbitrary star counts.
3. **Spec Coverage Check**: Verify if the parser handles the complete target specification (e.g. tables, styles, vector shapes, embedded media) vs basic text extraction.
4. **Explicit Risk Flag**: If any condition fails, state the exact limitation and visual fidelity ceiling (~40-60%) upfront before recommending.

**B. For Code Modifications & Refactoring:**
1. **Current State Read**: View and verify the exact current lines (`view_file(StartLine, EndLine)`).
2. **Target State Diff**: Produce a complete drop-in replacement with error handling.
3. **Blast Radius Check**: Explicitly verify what adjacent modules, tests, or callers could be affected.

**C. For "Is this feasible / possible?" Architecture Inquiries:**
1. **Production Precedent Check**: Identify at least 2 enterprise production systems (e.g. Stirling-PDF, Gotenberg, Nextcloud) using this exact approach.
2. **Zero Toy Extrapolation**: Never extrapolate from a demo script to production-grade feasibility.
3. **Anti-Sycophancy Rejection**: If no robust open-source precedent exists, state so honestly and present the battle-tested standard.

---

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
