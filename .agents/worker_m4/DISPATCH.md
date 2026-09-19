## 2026-09-02T13:43:40Z
Scope: Milestone M4 — Project-Wide Emoji Eradication & Material Symbols Design System (Requirement R4).
Exclusive File Ownership:
- `src/components/ResumeStudio/steps/ReviewDesignStep.jsx`
- `src/components/ResumeStudio/steps/ExperienceStep.jsx`
- `src/components/ResumeStudio/steps/PersonalInfoStep.jsx`
- `src/components/ResumeStudio/AtsDiagnosticModal.jsx`
- `src/components/ResumeStudio/PhotoStudioModal.jsx`
- `src/pages/NotFound.jsx`
- `src/pages/Home.jsx`
- `src/pages/document/TranslatePdf.jsx`
- `src/engines/document/translatePdf.js`
- `src/pages/pdf/MergePdf.jsx`
- `src/pages/pdf/RedactPdf.jsx`
- `src/pages/pdf/ScanToPdf.jsx`
- `src/pages/Pricing.jsx`
- `src/pages/utility/ComingSoon.jsx`
- `src/utils/constants.js`

Tasks:
1. Replace all raw unicode emojis with clean text or Google Material Symbols:
   - `ReviewDesignStep.jsx`: Replace `⚡ Fit to 1 Page` with `Fit 1 Page` and Material Symbol `auto_awesome`.
   - `ExperienceStep.jsx`: Replace `⚡ Enhance` with `Enhance` and Material Symbol `auto_awesome`.
   - `PersonalInfoStep.jsx`: Replace `⚡ Insert Pro Summary` with `Insert Pro Summary` and Material Symbol `auto_awesome`.
   - `AtsDiagnosticModal.jsx`: Replace emoji tab prefixes (`📊`, `🔬`, `🎯`, `🛡️`, `⚠️`, `✅`) with Material Symbols (`query_stats`, `biotech`, `track_changes`, `shield`, `warning`, `check_circle`).
   - `PhotoStudioModal.jsx`: Replace `🖱️` with `drag_pan`.
   - `NotFound.jsx`: Replace `📦`, `🔄`, `📎` with Material Symbols (`folder_zip`, `sync`, `call_merge`).
   - `Home.jsx`: Replace toast and greeting emojis (`⚠️`, `⚡`, `🗑️`, `📁`, `👋`) with standard text and icons.
   - `TranslatePdf.jsx` & `translatePdf.js`: Replace `⚡`, `🌐`, and raw emoji flags with clean language names or icons.
   - `MergePdf.jsx`, `RedactPdf.jsx`, `ScanToPdf.jsx`, `Pricing.jsx`, `ComingSoon.jsx`, `constants.js`: Replace all emojis with Material Symbols or clean text.
2. Verification:
   - Run: `node scratch/scan_all_emojis.mjs` (must report 0 emoji lines across `src/`).
