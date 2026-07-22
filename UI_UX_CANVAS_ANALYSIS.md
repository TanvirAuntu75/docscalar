# Canvas UI/UX Deep Analysis

Based on the current architecture and codebase (particularly \`src/components/StitchCanvas.jsx\` and \`src/pages/Home.jsx\`), here is a 10-minute deep analysis of the canvas user experience and areas for improvement.

## Current Strengths (What to Keep)
- **Visual Feedback:** The use of \`animate-pulse\`, \`animate-spin\` and clearly defined color coding (e.g. \`bg-emerald-600\` for success, \`bg-error\` for failures) provides immediate status visibility to users.
- **Batch Processing Bar:** The floating action bar in \`Home.jsx\` correctly groups items by type (pdf, image, mixed) and suggests contextual actions (merge, compare), saving the user from hunting for the right tool.
- **Auto-Healing Pipeline:** The canvas gracefully detects format mismatches and can automatically inject conversion steps. This is a very strong power-user feature.

## Friction Points & User Frustrations
1. **Error Visibility inside Nodes:** Currently, when an error occurs, a toast is shown and the node turns red, but the *actual error message* (e.g., "File too large", "Circular dependency", "Password required") requires the user to dig or rely on transient toasts. A dedicated error tooltip or expanded node view on failure would significantly reduce frustration.
2. **Viewport & Zoom Management:** While there are panning features, users working with long complex pipelines (e.g., extracting pages -> OCR -> translation -> split) might lose track of the overall flow. A minimap or "zoom to fit" shortcut is essential for complex canvas structures.
3. **Execution Locking Deadlocks:** The pipeline execution lock (\`executionQueueLock\`) is robust, but if a single node hangs due to a network timeout, it holds the lock, blocking all parallel paths until the 5-minute timeout. Users experience this as the canvas completely "freezing."
4. **Node Overlap/Layout:** Output nodes spawned from batch operations (like unzip or split-pdf) are generated in a rigid grid (e.g., \`Math.floor(spawnedOutputsCount / 4)\`). This can easily overlap with user-placed nodes, causing visual clutter. A simple physics or collision-avoidance layout algorithm for auto-spawned nodes is needed.

## Intelligence & Feature Recommendations
- **Smart Grouping:** Allow users to lasso-select multiple nodes and "collapse" them into a single visual block (e.g., "Prep Pipeline").
- **Predictive Next Steps:** When a node finishes successfully, subtly highlight the output port and offer a 1-click suggestion based on document type (e.g., suggest "Compress" after a heavy "Merge" or "OCR" operation).
- **Undo/Redo:** The \`operations\` array is mutated directly. Implementing a strict history stack for canvas state would allow users to experiment safely.

## Conclusion
The canvas is structurally sound but lacks the localized feedback and spatial management needed for advanced workflows. Focusing on node-level error reporting, smarter auto-layout for generated outputs, and "zoom to fit" navigation will yield the highest ROI for user experience without introducing heavy new features.
