# Handover Document for DocForge Project

**To the next AI Agent:** Please read this document carefully to understand the current state of the project and resume work seamlessly.

## Project Overview
**Name:** DocForge
**Goal:** A privacy-first, 100% client-side document conversion web application that rivals iLovePDF and Smallpdf. It performs all conversions (PDF, Image, Document) directly in the browser using JavaScript libraries, meaning zero server costs and maximum privacy for users.
**Tech Stack:** React 18, Vite, React Router v6, Vanilla CSS (Dark glassmorphic theme).
**Monetization:** Freemium model with AdSense for free users (to be implemented later).

## What Has Been Completed So Far (Phase 1 MVP)

1. **Project Setup:**
   - Scaffolded a Vite + React project in the directory: `c:\Users\Tanvir Alam\Downloads\New folder upscaled`
   - Attempted to install dependencies (`react-router-dom`, `pdf-lib`, `pdfjs-dist`, `mammoth`, `jspdf`, `html2canvas`, `file-saver`, `qrcode`, `jszip`). **Note: `npm install` failed due to network (`ECONNRESET`) and permission (`EPERM`) issues that need to be resolved.**

2. **UI & Design System:**
   - Created `src/index.css` with a complete dark glassmorphic design system (CSS variables, animations, responsive layout).
   - Created `src/utils/constants.js` containing metadata for 12 core tools.
   - Created reusable components: `Header.jsx`, `Footer.jsx`, `ToolCard.jsx`, `FileDropzone.jsx` inside `src/components/`.
   - Created `src/pages/Home.jsx` which displays the tools grouped by category.

3. **Conversion Engines (Core Logic):**
   - **PDF:** `pdfToImage.js`, `imageToPdf.js`, `mergePdf.js`, `splitPdf.js`, `compressPdf.js`, `rotatePdf.js` (inside `src/engines/pdf/`)
   - **Image:** `convertFormat.js`, `compressImage.js`, `resizeImage.js` (inside `src/engines/image/`)
   - **Document:** `docxToPdf.js`, `textToPdf.js` (inside `src/engines/document/`)
   - **Utility:** `qrGenerate.js` (inside `src/engines/utility/`)

4. **Tool Pages (UI for Engines):**
   - Completed PDF tools: `PdfToImage.jsx`, `ImageToPdf.jsx`, `MergePdf.jsx`, `SplitPdf.jsx`, `CompressPdf.jsx`, `RotatePdf.jsx` (inside `src/pages/pdf/`)
   - Completed Image tools: `ImageConverter.jsx` (inside `src/pages/image/`)

## What Needs to be Done Next

1. **Fix `npm install`:** Investigate and resolve the `ECONNRESET` and `EPERM` issues when installing dependencies. Try clearing the npm cache or running the installation again. The required packages are: `react-router-dom pdf-lib pdfjs-dist mammoth jspdf html2canvas file-saver qrcode jszip`.
2. **Finish Tool Pages:** Create the remaining React component pages for:
   - `ImageCompressor.jsx`
   - `ImageResizer.jsx`
   - `DocxToPdf.jsx`
   - `TextToPdf.jsx`
   - `QrGenerator.jsx`
3. **Routing Configuration:** Create or update `src/App.jsx` to set up `react-router-dom` with routes for all the pages and wrap them in a main layout. Update `src/main.jsx` if necessary.
4. **Testing & Verification:** Run the development server and test each tool to ensure the client-side conversions work properly.

---
*Created by previous AI Agent session on 2026-06-12.*
