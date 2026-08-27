# StitchCanvas.jsx Architectural Guide & Codebase Reference

This document serves as the authoritative guide for the [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx) component. Antigravity and any other agent must consult this file before analyzing, modifying, debugging, or extending the visual workflow canvas interface.

---

## 1. Component Overview & Architecture

`StitchCanvas` is a high-fidelity, zoomable, and pannable dot-grid workspace inspired by Google Stitch. It provides a visual node-red/Miro-like experience for document processing, allowing users to:
1. **Upload Files**: Spawn document nodes on the canvas dot-grid.
2. **Add Operators**: Connect document outputs to visual tool/operation cards (e.g., Merge, Split, OCR, Compress).
3. **Chain Workflows**: Wire output files of one operator as the input files to another operator to form a Directed Acyclic Graph (DAG).
4. **Execute Pipelines**: Run operations locally in the browser using WASM engines or offload heavy tasks to the FastAPI backend.
5. **AI Natural Language Planning**: Write prompt commands (e.g., "merge file A and file B, then compress the output") to automatically construct and trigger chained pipeline pipelines.

---

## 2. Core State Schema

The canvas state resides in two primary arrays and several UI/viewport objects:

*   **`workspaceQueue`** (Array of objects): Holds file node states on the canvas.
    *   `id`: Unique string starting with `ws-` (for uploaded files) or `ws-out-` (for operator outputs).
    *   `name`: Physical filename (e.g., `document.pdf`).
    *   `size`: File size in bytes.
    *   `type`: MIME type.
    *   `status`: `'PendingAction' | 'Processing' | 'Completed'`.
    *   `progress`: Number (`0` to `100`).
    *   `resultBlob`: Binary `Blob` containing the processed file.
    *   `resultName`: String filename for download.
    *   `x`, `y`: Positions in canvas coordinate space.
*   **`operations`** (Array of objects): Holds active and idle operator cards.
    *   `id`: Unique string starting with `op-`.
    *   `toolId`: String key matching tool configurations (e.g., `compress-pdf`).
    *   `inputIds`: Array of file/operator IDs serving as inputs.
    *   `outputId`: Single output file ID.
    *   `outputIds`: Array of output file IDs (used for batch outputs).
    *   `status`: `'idle' | 'processing' | 'completed' | 'failed'`.
    *   `progress`: Number (`0` to `100`).
    *   `params`: Dynamic configuration settings (e.g., `{ quality: 0.7, mode: 'lossy' }`).
    *   `x`, `y`: Positions in canvas coordinate space.
*   **`zoom`**: Scale multiplier (between `0.4` and `2.0`).
*   **`panOffset`**: `{ x, y }` object panning the viewport.
*   **`draggingCable`**: `{ fromId, type, currentX, currentY }` tracking visual anchor-drawing when dragging a connection wire.

---

## 3. Comprehensive Line-by-Line Code Map

Below is a detailed map of [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx) categorized by line ranges, showing their functional responsibilities, implementation rationale, and interaction models.

### A. Imports & Tool Configurations (Lines 1 - 109)
*   **Lines 1 - 34**: Imports React hooks (`useState`, `useRef`, etc.), layout utilities (`interact`, `anime`), file operations (`file-saver`, `jszip`), local client-side WASM/JS processing engines (e.g., `docxToPdf`, `compressPdf`, `pdfToImagesStream`), canvas-state persistence helper databases (`saveCanvasState`, etc.), and canvas-planning heuristics (`canvasBrain`).
*   **Lines 35 - 37**: Defines default backend target API URLs dynamically resolving environment variables.
*   **Lines 38 - 76**: `TOOL_VALIDATION` object. Maps each tool ID to its validation criteria:
    *   `accept`: File extension suffixes accepted by the tool.
    *   `minInputs` / `maxInputs`: Cardinality constraints on input connections.
    *   `errorMsg`: Descriptive validation failure messages shown to users as toasts.
*   **Lines 78 - 109**: Startup assertion to ensure `TOOL_REGISTRY` and `TOOL_VALIDATION` are synchronized in development.

### B. Component Definition & UI State Hooks (Lines 110 - 210)
*   **Lines 110 - 136**: Main `StitchCanvas` React component function signature and props (props include queue variables, layout handlers, user auth states, and canvas clear signals).
*   **Lines 137 - 184**: Setup of viewport transform state (`zoom` and `panOffset`), selected node trackers (`selectedNodeIds`), contextual menu overlay state (`contextMenu`), and timing structures (`opTimers`).
*   **Lines 185 - 210**: Declarations of refs (such as `workspaceQueueRef`, `executionQueueLock`, and `canvasRef`) that maintain synchronous references inside async hooks, preventing race conditions.

### C. Cable Connections & DAG Validation (Lines 211 - 365)
*   **Lines 211 - 236**: Handles mouse-click triggers outside the card layout to reset selected elements.
*   **Lines 237 - 270**: Synchronizes React canvas states with parent upload queues.
*   **Lines 271 - 365**: Validates file list formats, types, and counts before establishing cable routing paths.

### D. Accessibility Announcer & Hotkey Controls (Lines 366 - 598)
*   **Lines 367 - 535**: `validateConnection(sourceId, targetOpId, silent)`. Validates a wire connection candidate. Checks cycle presence, duplicate connections, mime type compatibility, and max input limitations. Implements a **zip wildcard rule** to bypass validation for batch processing of zip elements.
*   **Lines 536 - 540**: Setup of screen announcer text states (`announcement`) mapped to `aria-live` containers for accessibility (A11y).
*   **Lines 541 - 558**: `handleUndo` and `handleRedo` functions that revert/re-apply state variables.
*   **Lines 559 - 598**: Global keyboard event listeners (`keydown`). Maps hotkeys:
    *   `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y`: Undo/Redo workflows.
    *   `Ctrl+A`: Select all nodes on the canvas.
    *   `Delete` / `Backspace`: Deletes highlighted node selections, cleans up connections, and resets associated operator nodes back to an `'idle'` state.

### E. State Recovery & Node Focus Management (Lines 599 - 790)
*   **Lines 599 - 650**: History state snapshot managers (`pushHistoryState`) and active file-type memoizations.
*   **Lines 651 - 790**: IndexedDB state recovery hooks. Runs `loadCanvasState` on mounting to restore coordinate layouts, pans, zooms, and files, and triggers debounced `saveCanvasState` writes on layout changes.

### F. Port Coordinate Anchors & Connection Wire Trackers (Lines 791 - 920)
*   **Lines 791 - 845**: `updatePorts()` hook. Imperatively queries DOM bounding client rectangles for all port elements, divides them by zoom factors, offsets them by viewport panning variables, and publishes their coordinates to `portCoords`.
*   **Lines 846 - 920**: Windows pointer event listeners for dragging cables. Tracks mouse position relative to canvas coordinate systems and creates the connection in `operations` once released over an operator card.

### G. Keyboard Navigation & Pointer Handlers (Lines 921 - 997)
*   **Lines 921 - 939**: Spacebar toggle hotkey listener that switches the active tool between the select cursor (`select`) and the panning tool (`pan`).
*   **Lines 940 - 975**: Badging helpers (`getFileBadge`) that assign colors matching extensions, and size calculators (`formatSize`).
*   **Lines 976 - 997**: Imperative non-passive wheel event listener. Intercepts mouse wheel activities:
    *   **Pinch Gestures** (`e.ctrlKey === true`): Updates zoom factor centered around the cursor position.
    *   **Pan Gestures** (`e.ctrlKey === false`): Shifts `panOffset` to slide the canvas grid.

### H. Spatial Focus Navigation & Pointer Drag Actions (Lines 998 - 1392)
*   **Lines 998 - 1053**: Spatial keyboard focus calculation (`navigateFocusDirection`). Computes Euclidean distance vectors focusing adjacent node elements when arrow keys are pressed.
*   **Lines 1054 - 1392**: `handleCanvasKeyDown`. Handles keyboard interactions on card focus. Manages dragging states, shifts, and connection clicks.

### I. Pointer Selection Box & Zoom Resets (Lines 1393 - 1449)
*   **Lines 1393 - 1449**: Pointer down routines and move loops tracking panning states or selection marquee boxes (`selectionBox`). Calculates bounding vectors to center and scale the viewport to fit all nodes (`handleFitToView`).

### J. Node Placement & Operator Spawning (Lines 1450 - 1604)
*   **Lines 1450 - 1493**: `createOutputPlaceholderNode`. Calculates non-colliding layout offsets and mounts placeholder node containers.
*   **Lines 1494 - 1574**: `createCompletedOutputNode`. Spawns physical file cards for outputs with standard sizes, completed states, and download capabilities.
*   **Lines 1575 - 1604**: `handleDisconnectCable(fromId, toId)`. Disconnects wire paths, updates inputs list, and resets affected operator states.

### K. Workflow Configuration Serialization (Lines 1605 - 1681)
*   **Lines 1605 - 1636**: `handleExportWorkflow`. Packages layout coordinates, parameters, and inputs maps into a JSON file for local export.
*   **Lines 1637 - 1681**: `handleImportWorkflow`. Loads imported JSON files, validates schema signatures, maps elements, and restores workflow configurations onto the canvas dot-grid.

### L. Operator Execution Core (Lines 1682 - 2255)
*   **Lines 1682 - 1882**: `handleTriggerAction(actionId, forcedNodeIds)`. Spawns operator cards on the canvas and wires selected nodes automatically to their inputs.
*   **Lines 1883 - 1893**: Parameter change callback wrappers (`updateOperatorParams`).
*   **Lines 1894 - 1921**: Cancel and retry operator loops (`cancelOperator`, `retryOperator`). Aborts active requests and removes associated placeholder nodes.
*   **Lines 1922 - 2255**: Backend task runner (`executeServerJob`). Uploads input files, routes them to specific conversion tasks, polls status endpoints via `/api/job/{job_id}/status`, and downloads results.

### M. DAG Recursion & WASM Engine Handlers (Lines 2256 - 2892)
*   **Lines 2256 - 2294**: Downstream operators cascade triggers (`triggerDownstreamOperators`). Automatically starts downstream execution once all upstream input dependencies are completed.
*   **Lines 2295 - 2892**: `executeOperator(opId, _visitedSet, latestOps)`. The recursive DAG scheduler:
    1. Detects cycles using `_visitedSet`.
    2. Runs an execution lock sequence.
    3. Triggers upstream operations recursively if inputs are uncompleted operator nodes.
    4. Evaluates format compatibility, routing through intermediate conversion nodes via auto-healing.
    5. Implements **Incremental Merge PDF** to append new bytes directly to a previous merge.

### N. Batch Execution Loops (Lines 2893 - 3642)
*   **Lines 2893 - 3112**: `runEngine`. Local JS/WASM engine runner. Routes tasks to libraries (`pdf-lib`, `mammoth.js`, `jszip`, `ocrPdf`, `generateQR`, etc.).
*   **Lines 3113 - 3642**: Batch scheduler managing concurrent processing limitations (up to 3 parallel items) and unzipping handlers.

### O. Context Menus & Quick-Spawning Actions (Lines 3643 - 4189)
*   **Lines 3643 - 3677**: Context menu creation logic (`handleContextMenu`). Opens menu at clicked viewport coordinates.
*   **Lines 3678 - 3719**: Coordinate-specific operator spawners (`spawnToolAtCoords`).
*   **Lines 3720 - 4189**: Spatial grid formatter (`arrangeCanvasNodes`). Auto-aligns all nodes neatly.

### P. Natural Language Planner & Semantic Router (Lines 4190 - 5031)
*   **Lines 4190 - 5031**: Natural Language command processor (`handleSendCommand`). Parses search commands, calls `/api/canvas/command` or falls back to local rules-based parsing, maps parameters, and schedules node triggers.

### Q. Connection Drawing & Drag-and-Drop (Lines 5032 - 5329)
*   **Lines 5032 - 5100**: SVG bezier cable drawing (`drawCable`). Generates visual curves (`M... C...`) and updates cable colors based on processing states.
*   **Lines 5101 - 5329**: Drag-and-drop file uploader overlays and files ingestion handlers.

### R. Component JSX Render Layout (Lines 5330 - End)
*   **Lines 5330 - 5358**: Drag overlay boundaries, drop zone screens, and screen reader announcer markup.
*   **Lines 5359 - 5478**: Canvas wrapper, grid background styling, scale transforms, and connections layer.
*   **Lines 5479 - 5626**: Workspace document node components rendering (includes file size, badge type, status bars, and download/delete controls).
*   **Lines 5627 - 5900**: Operator Node rendering. Shows timer indicators, tool category icons, title, and connected inputs.
*   **Lines 5901 - 6500**: Inline Parameter Configurations forms. Renders specific sliders, textboxes, checkboxes, and select dropdowns inside idle operator cards.
*   **Lines 6501 - End**: Controls panel overlays: Zoom actions (bottom right), Tool icons panel (right center), top studio action bar, and the collapsible Activity Logs panel.

---

## 4. Key Implementation Rules for Future Changes

1.  **Do Not Bypass Canvas Coordinates**: When adding a new node (file or operator), you **must** use `getNonCollidingCoords` to calculate non-colliding positions. Do not assign static pixel placements.
2.  **Maintain Touchpad Scroll Intercepts**: Do not modify the passive/non-passive attributes inside the mouse wheel listener `useEffect` (around line 976) as this will break Figma/Miro style zoom overrides and cause page scaling issues.
3.  **Always Announce Node Activities**: Always call `speakAnnouncement` inside new workflow events so that screen reader assistive devices can vocalize execution steps.
4.  **Preserve State Persistence Contracts**: Every new param setting added to operator cards must be serializable to JSON so it is saved/loaded correctly via IndexedDB.
