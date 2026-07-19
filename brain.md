# DocForge Project Brain & Memory Map

This document is the core project memory for DocForge. It outlines the codebase architecture, file responsibilities, recent changes, testing suites, and a complete directory tree. 

---

## 1. Project Overview & Architectural Mission
DocForge is a privacy-first, 100% client-side-first document conversion web application. 
- **Frontend Architecture**: React 18, Vite, React Router v6, and Vanilla CSS. It uses a premium dark glassmorphic design system (`index.css`). All lightweight file operations (merging, splitting, resizing, client-side conversions) are executed directly in the browser using web workers and client-side libraries (like `pdf-lib`, `pdfjs-dist`, `mammoth.js`, etc.).
- **Backend Architecture**: A FastAPI Python application managing heavy resources (LibreOffice conversion pipelines, PaddleOCR engines, advanced PDF-to-Excel layouts parsing, and multi-layer auto-bypass PDF unlocking).
- **Communication Flow**: For server-backed operations, files are uploaded via `/api/upload` and queued in a local job status tracker (`/api/convert` and `/api/jobs/status`). The frontend polls the status via [useJobPoller.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/hooks/useJobPoller.js) and displays visual animations matching the task's state.
- **UI/UX Design Intelligence**: Style, typography, layouts, and animations are driven by a multi-skill setup integrating the local [ui-ux-pro-max-skill](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/ui-ux-pro-max-skill) folder, `impeccable` rules (banning standard AI slop, enforcing OKLCH contrast, spatial rhythm, and strict anti-patterns), `huashu-design` principles (HTML-native prototypes, slides, animations, and expert reviews), and `taste-skill` presets. Any changes must align with these unified design guardrails.


---

### 2. Project Directory Tree

```
workspace-root/
├── .agents/
│   └── AGENTS.md                   # Custom execution commands and agent override rules
├── canvas_guide.md                 # Detailed code map, states, and execution rules for StitchCanvas.jsx
├── PROJECT_EXECUTION_LOG.md        # Persistent registry of tasks, analysis, and implementation logs
├── OCR_Training_Instructions.md    # Guide for training PP-OCRv6 model variations
├── UI_UX_PROFESSIONALISM_REPORT.md # Comprehensive UI/UX anti-patterns check and rules report
├── HANDOVER_TO_NEW_AGENT.md        # Onboarding notes and contextual guides for subsequent agents
├── backend/                        # Python API Server & Heavy Conversion Handlers
│   ├── jobs/
│   │   ├── cleanup.py              # Schedules expiration and cleanup of upload/convert cache
│   │   └── queue.py                # Enqueues and checks state of backend task workers
│   ├── models/                     # AI weights cache directory (e.g. PP-OCRv6, Qwen)
│   ├── services/
│   │   ├── ai_service.py           # Local LLM/Ollama wrapper for text summarization
│   │   ├── canvas_agent.py         # Plan-parser & command generator for StitchCanvas pipelines
│   │   ├── compression.py          # Server-side PDF compressor using Ghostscript/PyMuPDF
│   │   ├── digital_sign.py         # Implements pyHanko cryptographic X.509 signature seals
│   │   ├── edit_pdf.py             # Coordinates updates for PDF markup drawing annotation vectors
│   │   ├── excel_to_pdf.py         # Converts XLSX to PDF enforcing gridlines & print layouts
│   │   ├── html_to_pdf.py          # Converts HTML files/strings to A4 PDF pages
│   │   ├── installer.py            # Local environment installer checks (LibreOffice, etc.)
│   │   ├── libreoffice.py          # Headless LibreOffice process manager & converters router
│   │   ├── ocr.py                  # Page-by-page OCR compiler rendering transparent text overlay
│   │   ├── ocr_engine.py           # PaddleOCR loader routing handwriting tasks to custom ONNX models
│   │   ├── pdf_to_excel.py         # Table structures parser mapping text cells by coordinates
│   │   ├── pdf_to_pdfa.py          # Converts PDF to PDF/A ISO archiving formats
│   │   ├── pdf_to_powerpoint.py    # Transposes PDF pages into PPTX slide templates
│   │   ├── pdf_to_word.py          # Extracts structures to compile Word (DOCX) files
│   │   ├── pptx_to_pdf.py          # Converts PPTX to PDF via LibreOffice
│   │   ├── redaction.py            # Blackout masking coordinates compiler
│   │   ├── router_service.py       # Dispatches requests to target processing services
│   │   ├── security.py             # PDF encryption & 4-layer silent auto-bypass decryption
│   │   ├── smart_service.py        # Smart format parsing dispatcher
│   │   ├── split.py                # Handles range-based PDF split logic
│   │   ├── url_to_pdf.py           # Converts links/websites using Playwright Chromium
│   │   └── utils.py                # File helper utilities
│   ├── auth.py                     # User session tokens, registration and login endpoints
│   ├── billing.py                  # Stripe subscription plans webhooks and dashboard routing
│   ├── config.py                   # Central server variables (directories, rate limits, tiers)
│   ├── database.py                 # SQLite db models (User, JobHistory, ProtectedFile)
│   ├── main.py                     # FastAPI routes definition, size gate, and desktop auth bypass
│   ├── worker.py                   # Thread-based background job processor runner
│   └── requirements.txt            # Python package requirements
├── scratch/                        # Temporary scripts, diagnostics, and sandbox tests
│   ├── compile_knowledge.js        # Compiles FAQ, tools, and capabilities into vector JSON index
│   ├── compress_assets.js          # Node.js script using built-in zlib to pre-compress built assets
│   ├── deploy_quantized_medium.py  # Script to quantize and deploy the custom PP-OCRv6 medium model
│   ├── quantize_onnx.py            # Post-training dynamic quantization script for ONNX models
│   ├── test_pdf_ocr.py             # OCR integration test asserting searchability
│   └── test_stress_run.py          # Automated layouts parser validation script
├── src/                            # React Frontend Source Code
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Skeleton.jsx        # Loading shimmer indicators
│   │   │   └── cascade-text.jsx    # Split-character text animations for titles
│   │   ├── FocusStudio/            # Fullscreen interactive configuration & preview modals
│   │   ├── AIChatBot.jsx           # Floating glassmorphic AI Chatbot assistant with local RAG
│   │   ├── AdPlaceholder.jsx       # Google AdSense placeholder slots
│   │   ├── BootstrapDownloader.jsx # Downloads local models/assets on Tauri app init
│   │   ├── Breadcrumb.jsx          # Disabled page trail indicator
│   │   ├── ErrorBoundary.jsx       # Global runtime exception wrapper
│   │   ├── FileDropzone.jsx        # State-aware central upload panel with initial preloads
│   │   ├── Footer.jsx              # Bottom page footer
│   │   ├── Header.jsx              # Glassmorphic navbar, user status, & mega menus
│   │   ├── LandingPage.jsx         # 10-section visual landing layout
│   │   ├── ProtectedRoute.jsx      # Auth wall blocking unauthenticated users
│   │   ├── PublicOnlyRoute.jsx     # Login/Signup route filter
│   │   ├── RelatedTools.jsx        # Suggested tools grid in footer
│   │   ├── SEOHead.jsx             # React Helmet equivalent meta tag injector
│   │   ├── SignatureIcon.jsx       # Helper markup SVG for sign indicators
│   │   ├── StickyStack.jsx         # Scrolling sticky capability description cards
│   │   ├── StitchCanvas.jsx        # Google Stitch-inspired interactive pipeline canvas
│   │   ├── ToolCard.jsx            # Action item card for tool categories
│   │   ├── ToolIcon.jsx            # Material Symbols SVG icon renderer
│   │   ├── ToolPageLayout.jsx      # Workspace wrapper displaying title & active file switcher
│   │   └── TrustBar.jsx            # Clean trust statement label
│   ├── context/
│   │   └── AuthContext.jsx         # Sync auth credentials & user settings provider
│   ├── engines/                    # Frontend client-side engines
│   │   ├── document/
│   │   │   ├── docxToPdf.js        # Mammoth/jsPDF mockup parser
│   │   │   ├── excelToPdf.js       # read-excel-file & auto-table pdf generator
│   │   │   ├── htmlToPdf.js        # html2canvas/jsPDF split pages engine
│   │   │   ├── powerpointToPdf.js  # pptx-to-html landscape pdf converter
│   │   │   └── textToPdf.js        # Editor monospace-to-A4 preview renderer
│   │   ├── image/
│   │   │   ├── compressImage.js    # Client-side OffscreenCanvas compressor
│   │   │   ├── convertFormat.js    # Canvas pixel-level image exporter
│   │   │   └── resizeImage.js      # Dimension guides scaling helpers
│   │   ├── pdf/
│   │   │   ├── addPageNumbers.js   # Inserts margins page numbers
│   │   │   ├── addWatermark.js     # Merges text/image watermark layers
│   │   │   ├── compressPdf.js      # Calculates target size approximations
│   │   │   ├── cropPdf.js          # Crops canvas segments
│   │   │   ├── editPdf.js          # Renders drawing vectors overlays
│   │   │   ├── extractPages.js     # Extracts selected page indices
│   │   │   ├── imageToPdf.js       # Serializes images sequence into PDF
│   │   │   ├── mergePdf.js         # Concatenates multiple PDF byte streams
│   │   │   ├── ocrPdf.js           # Launches OCR processing workers
│   │   │   ├── unOcrPdf.js         # Launches PDF flattening/Un-OCR workers
│   │   │   ├── organizePdf.js      # Rearranges page indexing sequences
│   │   │   ├── pdfForms.js         # Places interactive text/checkbox widgets
│   │   │   ├── pdfToImage.js       # Renders PDF pages onto canvas files
│   │   │   ├── redactPdf.js        # Compiles client-side redaction masks
│   │   │   ├── removePages.js      # Removes selected page indices
│   │   │   ├── repairPdf.js        # Runs header recovery operations
│   │   │   ├── rotatePdf.js        # Rotates page array bounds
│   │   │   ├── signPdf.js          # Canvas drawings signatures compiler
│   │   │   └── splitPdf.js         # Spans PDF sub-ranges
│   │   └── utility/
│   │       ├── qrGenerate.js       # QR Code pixel grid generator
│   │       ├── resumeTemplates.js  # Layout definitions router for resume exporter
│   │       └── templates/          # Contains 17 premium resume layout scripts
│   ├── hooks/                      # Custom React hooks
│   │   ├── useFileProcessor.js     # Preloads local files from route states
│   │   ├── useJobPoller.js         # Polls FastAPI jobs status with memoization
│   │   └── useKeyboardShortcuts.js # Listens for Hotkeys (Escape, Tab, Enter)
│   ├── pages/                      # Page components
│   │   ├── document/               # (AiSummarizer, TranslatePdf, DocxToPdf, ExcelToPdf, etc.)
│   │   ├── image/                  # (ImageCompressor, ImageConverter, ImageResizer)
│   │   ├── pdf/                    # (SplitPdf, SignPdf, OcrPdf, RotatePdf, UnlockPdf, etc.)
│   │   ├── utility/                # (ComingSoon, ConversionPipeline, DocumentViewer, ResumeBuilder, UrlToPdf, QrGenerator)
│   │   ├── Home.jsx                # Main workspace interface and landing routing
│   │   ├── Login.jsx               # Auth login screen
│   │   ├── Pricing.jsx             # Account subscription payment cards
│   │   └── SignUp.jsx              # Auth registration screen
│   ├── utils/
│   │   ├── api.js                  # Axios client configuration with JWT intercepts
│   │   ├── canvasBrain.js          # NLP coordinate extraction & pipeline compiler
│   │   ├── classifier.js           # Tokenizer and spelling checker for commands
│   │   ├── classifier_weights.json # Pruned model weights file for classifier
│   │   ├── constants.js            # Unified TOOLS registry mapping categories, limits, & icons
│   │   ├── db.js                   # localForage IndexedDB workspace queue database
│   │   ├── iconMap.js              # Icon libraries mapping dictionary
│   │   ├── ocrClient.js            # WebWorker OCR pool manager
│   │   ├── pdfSanitizer.js         # Client-side PDF integrity validator
│   │   └── ptop.js                 # Page-Targeted Operations range-slicing library
│   ├── workers/
│   │   └── pdf.worker.js           # Multi-threaded image/pdf conversion builder
    ├── registerServiceWorker.js    # Manages service worker lifecycle registration
│   ├── App.jsx                     # Router paths definition and lazy loading codes
│   ├── index.css                   # Global dark glassmorphism styling
│   └── main.jsx                    # React entry mount
├── public/                         # Public assets & worker binaries
│   ├── models/                     # Publicly hosted ONNX models (handwriting, multilingual dictionaries)
│   ├── workers/
│   │   ├── ocr.worker.js           # WASM SIMD/WebGL multi-threaded layout reader
│   │   └── translation.worker.js   # Offline WebGPU translation worker
│   ├── sw.js                       # Offline Cache-First/SWR Service Worker
│   └── sitemap.xml / robots.txt
├── src-tauri/                      # Tauri native desktop app configuration
│   ├── src/
│   │   └── main.rs                 # Initializes application & PyInstaller sidecar process
│   ├── tauri.conf.json             # Desktop dimensions, parameters, and build rules
│   └── Cargo.toml                  # Rust crates config
├── ui-ux-pro-max-skill/            # Design tokens search script & local guidelines
└── run_project.bat                 # Script to launch development servers
```

---

## 3. Detailed File Representations (What represents What)

### A. Frontend Pages & View Components (`src/pages/`)
* **[Home.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/Home.jsx)**: The root router page. It renders the guest landing view overlay (`<LandingPage />`) or routes to the visual workspace canvas view (`/workspace`) if the user is authenticated.
* **[pdf/](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/pdf/) page files**: Each page implements a specialized visual workspace:
  * `MergePdf.jsx`: Interactive list to reorder preloaded PDF thumbnails.
  * `SplitPdf.jsx`: Visual page grid with checkboxes and a dual-binding numeric range text field.
  * `CompressPdf.jsx`: Comparison dashboard with original/compressed gauges.
  * `RotatePdf.jsx`: Individually rotates page elements dynamically on hover.
  * `OcrPdf.jsx`: Custom step-by-page reader layout showing page previews sequentially.
  * `UnOcrPdf.jsx`: High-resolution document flattener page stripping selectable text.
  * `SignPdf.jsx`: Left canvas overlay mapping signatures; right panel holding the drawing pad.
  * `ProtectPdf.jsx` / `UnlockPdf.jsx`: SVG dial-combination lock and padlock-key animations matching security states.
* **[document/](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/document/) page files**: 
  * `DocxToPdf.jsx` / `ExcelToPdf.jsx` / `PowerpointToPdf.jsx`: High-fidelity sheet/slide mockups displaying formatted data styles.
  * `TextToPdf.jsx`: Split view rendering editor (left) and live A4 pages sheets (right).
  * `HtmlToPdf.jsx`: Live code sandbox on the left with sandboxed iframe preview on the right.
  * `TranslatePdf.jsx`: Real-time offline translator UI rendering source text boxes and canvas coordinate highlighting panels.
* **[utility/](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/utility/) page files**:
  * `DocumentViewer.jsx`: Dedicated multi-format document previewer featuring rotation filters, fullscreen, lazy-loaded sidebar page thumbnails, and dynamically loaded dynamic import chunks.
  * `ResumeBuilder.jsx`: Real-time, Canva-like CV editor that splits into left settings templates and right sticky A4 print pages with dynamic ResizeObserver scaling.
  * `UrlToPdf.jsx`: UI to input website links, select margins, and stream conversions.

### B. Reusable Frontend UI Elements (`src/components/`)
* **[FileDropzone.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/FileDropzone.jsx)**: Main drag-and-drop workspace container. Includes a mounting hook that grabs `location.state.initialFile` to allow immediate file loading when navigated from the home page.
* **[ToolPageLayout.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/ToolPageLayout.jsx)**: Shared page layout enclosing title headers, navigation structures, and sidebar cards. Renders a **Premium Active File Switcher Dropdown** (`files.length > 1`) enabling users to swap the active document in a multi-file batch pool.
* **[StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx)**: The visual workspace canvas. Draws active file nodes, handles drag-and-connect visual cable vectors, registers operator parameters panels, parses command menu prompts using local NLP classifiers, and runs background web workers topologically.

### C. Backend API Server & Core Services (`backend/`)
* **[main.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/main.py)**: Initializes the FastAPI app, manages JWT-based login dependencies, registers user account endpoints, enforces file upload limits (blocking files > 200MB), registers GZipMiddleware response compression, and feeds files into the background job worker.
* **[services/ocr.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/ocr.py)**: Page-by-page OCR engine. It converts PDF pages into high-resolution images, feeds them to `RobustOCREngine`, compiles the characters onto a transparent ReportLab canvas overlay, and serializes a clean, searchable PDF.
* **[services/security.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/security.py)**: Performs PDF encryption and 4-layer auto-bypass unlocking:
  1. Layer 1: DB hash lookup (retrieves passwords for DocForge-locked files).
  2. Layer 2: Checks empty password (owner-only passwords).
  3. Layer 3: Checks a common dictionary of 500+ words.
  4. Layer 4: Heuristic candidates (generates stems from filenames and date formats).
  Only triggers `PASSWORD_REQUIRED` on frontend client if all layers fail.
* **[services/pdf_to_excel.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/pdf_to_excel.py)**: Extracts table coordinates and characters from PDF sheets. Word coordinate center-based filtering is applied to map bounding boxes precisely and prevent text bleeding between column edges.
* **[services/libreoffice.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/libreoffice.py)**: Centralizes headless LibreOffice conversions. Spawns conversion subprocesses safely and routes office conversions (.xlsx, .pptx) to their specialized format layout handlers.
* **[services/digital_sign.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/digital_sign.py)**: Implements cryptographic X.509 signature sealing using pyHanko, supporting self-signed auto-bypass certificates or uploaded custom PKCS#12 (.p12/.pfx) certificates.
* **[services/url_to_pdf.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/url_to_pdf.py)**: Renders online websites and links to high-quality print-ready PDFs using headless Playwright Chromium.
* **[services/canvas_agent.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/canvas_agent.py)**: Spawns plan-parsers that extract structural instructions and operational JSON configurations from complex user command clauses.

### D. Architectural References & Guidelines
* **[canvas_guide.md](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/canvas_guide.md)**: Authoritative architectural reference and line-by-line guide for the [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx) component. It documents props, canvas state definitions, DAG execution routines, event listeners, accessibility spatial navigation indices, and incremental parsing pipelines. **Must be read before any canvas execution or updates.**

### E. Build, Scripts, & Configuration Files
* **[scratch/download_minilm.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/scratch/download_minilm.py)**: Downloads the quantized `all-MiniLM-L6-v2` ONNX model files from Hugging Face for offline client-side use.
* **[public/workers/classifier.worker.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/public/workers/classifier.worker.js)**: Web Worker running client-side zero-shot semantic intent classification using ONNX sentence embeddings and cosine similarity.
* **[scratch/compress_assets.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/scratch/compress_assets.js)**: Recursive post-build compressor that compiles JavaScript, CSS, HTML, WASM, and ONNX models into static `.br` and `.gz` formats.
* **[public/sw.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/public/sw.js)**: Offline Cache-First/SWR Service Worker featuring a Network-First strategy for HTML files and automatic v2 cache replacement to prevent stale chunk mismatches.
* **[src/registerServiceWorker.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/registerServiceWorker.js)**: Orchestrates service worker registration in production mode and triggers a reload on activation.

---

## 4. Recently Created or Edited Features (Memory)

### A. Localhost Dev Server Resource Optimization (TSK-233)
- **Problem**: When running `npm run dev` or starting Vite on localhost, the Node.js process would spike CPU usage (18%+) and consume 650MB+ of memory. This was caused by Node's file system watcher recursively scanning the entire root directory, including the massive Python virtual environment (`.venv`), binary models (`public/models`), and dependency trees (`node_modules`), tracking thousands of files.
- **Solution**:
  1. Configured custom file watch exclusions in [`vite.config.js`](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/vite.config.js) under `server.watch.ignored`.
  2. Blocked Vite from scanning or hot-watching the heavy runtime folders: `node_modules`, `.venv`, `public/models`, `dist`, and `.git`.
  3. This drops Node.js's idle CPU overhead to near 0% and saves hundreds of megabytes of RAM during local development.

### B. OCR PDF Universal Unicode Font Embedding (TSK-232)
- **Problem**: OCR on non-Latin documents (Cyrillic, Arabic, Chinese) resulted in blank square boxes ("tofu") in PDF viewers because the default Helvetica font inside `jsPDF` only supports standard WinAnsi characters.
- **Solution**:
  1. Downloaded the universal GNU Unifont (`unifont.ttf`) to `public/fonts/unifont.ttf`.
  2. Patched both [`OcrPdf.jsx`](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/pdf/OcrPdf.jsx) and [`ocrPdf.js`](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/engines/pdf/ocrPdf.js) to dynamically fetch this TTF file during compilation.
  3. Encoded the font as Base64 in the main browser thread, registered it in `jsPDF`'s virtual file system (`addFileToVFS`), and mapped it as a custom font.
  4. Configured the invisible OCR text rendering layers to use `unifont` instead of `helvetica`, allowing PDF search indexing and text selection to work flawlessly for multiple language scripts without character corruption.

### B. Heavy Web-based Translation Engine Deactivation & Desktop Funnel (TSK-232)
- **Problem**: Running the 1.3 GB WASM M2M100 translation engine on standard client browsers caused severe load latencies (700MB download on cold boot) and high RAM consumption, leading to user frustration.
- **Solution**:
  1. Completely removed the client-side Web Worker inference logic and translation pipeline initialization from [`TranslatePdf.jsx`](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/document/TranslatePdf.jsx).
  2. Replaced the translation workspace on the web app with a premium marketing and onboarding layout routing users to download the DocForge Desktop App for local, hardware-accelerated AI translation features.
  3. This ensures the web app remains lightweight (~22MB max AI payload from the MiniLM classifier), responsive, and secure.

### C. Classifier Weights Compression & Build Optimizations (TSK-230)
- **Problem**: The client-side intent classifier weights file `classifier_weights.json` (11.38 MB) was extremely large and took long times to parse during initial worker warmup. Additionally, large backup model files were bloating the build directory and the Brotli compressor would crash with heap OOM errors when processing massive 300MB+ models.
- **Solution**:
  1. Applied threshold=4.0 coefficient pruning and remapped the active vocabulary from 10,666 to 8,407 features, shrinking `classifier_weights.json` by **85.12%** (from 11.38 MB to 1.69 MB) with **100.00% matching accuracy** maintained.
  2. Deleted four duplicate ONNX model backups (~36.5 MB) from `public/models/` to prevent directory build bloat.
  3. Optimized the post-build `compress_assets.js` script to auto-check file sizes: large files (>30MB) are compressed using standard quality (level 6) to avoid heap OOM allocation crashes, while all other assets use maximum Brotli level 11.
  4. Integrated proactive background model loading in `TranslatePdf.jsx` on page mount to load the translation worker and download the 700MB M2M100 ONNX models in the background while the user is selecting files, improving the first impression. Mapped a dynamic loading status badge and added unmount lifecycle cleanups to terminate the worker and fully free the 1.3 GB WASM memory heap when leaving the page.

### B. Un-OCR PDF (Flatten PDF) Offline Tool (TSK-229)
- **Problem**: Users need a secure, reliable way to make PDF files non-searchable and non-selectable (e.g. to prevent content copying, secure confidential text, or protect layouts from automated bots).
- **Solution**:
  1. Created a client-side offline **Un-OCR PDF (Flatten PDF)** tool that converts each PDF page to a high-resolution, static raster image (JPEG) inside [pdf.worker.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/workers/pdf.worker.js), effectively destroying searchable text overlays, font dictionaries, form fields, and vector layers.
  2. Created the engine wrapper [unOcrPdf.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/engines/pdf/unOcrPdf.js) to manage the background worker thread.
  3. Registered the tool metadata in [constants.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/utils/constants.js) and the canvas operator definition in [canvasBrain.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/utils/canvasBrain.js)'s `TOOL_REGISTRY`.
  4. Added execution routing inside [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx) for both dragging and dropping canvas execution paths.
  5. Built a dedicated [UnOcrPdf.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/pdf/UnOcrPdf.jsx) tool page featuring resolution quality configurations (Standard, High, Ultra) and mapped it to the `/un-ocr-pdf` route in [App.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/App.jsx).

### B. Auto-Enhance Output Premium Feature (TSK-228)
- **Problem**: Document images scanned using local cameras, compiled into PDFs, or extracted from documents are often low-contrast, shadowed, or slightly yellowed/dark, which reduces professional appeal and degrades OCR text extraction accuracy.
- **Solution**:
  1. Added a global "Auto-Enhance Outputs" setting switch in the Workspace Settings sidebar in [Home.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/Home.jsx), backed by `localStorage` persistence and defaulting to `true` to ensure a premium feel out of the box.
  2. Enhanced [imageToPdf.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/engines/pdf/imageToPdf.js) and [pdf.worker.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/workers/pdf.worker.js) (the background pdf compiler worker) to automatically intercept page images and pass them through a canvas-based professional document filter (`contrast(1.25) brightness(1.05) saturate(0.95)`) before embedding them in A4 output documents.
  3. Integrated contrast-enhancing canvas filters inside [ScanToPdf.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/pdf/ScanToPdf.jsx) during local WebRTC/upload scan compilations.
  4. Patched [ocrPdf.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/engines/pdf/ocrPdf.js) to automatically enhance page contrast/brightness before submitting page blobs to local OCR workers, dramatically improving detection accuracy for faded scans.
  5. Expanded the contrast-enhancing scan filters into [pdfToImage.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/engines/pdf/pdfToImage.js), [compressPdf.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/engines/pdf/compressPdf.js), [compressImage.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/engines/image/compressImage.js), [convertFormat.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/engines/image/convertFormat.js), and [resizeImage.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/engines/image/resizeImage.js), covering all conversion and processing outputs.

### B. Canvas Connection Warning Header & Auto-Heal Fix (TSK-227)
- **Problem**: When a newly added operator card had 0 connected inputs, the validation correctly flagged a cardinality mismatch but the warning panel at the bottom-left of the canvas displayed the hardcoded header "Format Mismatch Detected". It also displayed the "Auto-Heal Connection" button which would do nothing when clicked because no conversion tool was suggested for missing connections.
- **Solution**:
  1. Updated the warning panel header in [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx) to dynamically render the title based on the issue type: `'Format Mismatch Detected'` for format-mismatch, `'Dependency Cycle Detected'` for cycles, and `'Input Connection Required'` for cardinality/missing inputs.
  2. Conditionally rendered the "Auto-Heal Connection" button only when a `suggestedToolId` is available in the issue metadata, eliminating useless button displays.

### B. Service Worker Dev-Caching & Chunk Load Resolution (TSK-226)
- **Problem**: In development mode, the service worker cached `/` and `/index.html`, which caused Vite HMR and WS updates to point to stale files, yielding a blank screen or a white page crash. In production, updates could cause a race condition or `ChunkLoadError` if old hashed assets were deleted while active clients loaded them.
- **Solution**:
  1. Disabled dev-mode registration completely in [registerServiceWorker.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/registerServiceWorker.js) (returns early when `import.meta.env.PROD` is false).
  2. Implemented a `controllerchange` event listener in `registerServiceWorker.js` to perform a clean, single `window.location.reload()` when a new service worker gains control.
  3. Bumped the cache version in [sw.js](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/public/sw.js) to `docforge-pwa-cache-v2` to force eviction of old caching layers.
  4. Configured a **Network-First** strategy for `/` and `/index.html` in `sw.js` to ensure online users always get the latest entry points referencing valid hashed chunks, while keeping the cache as an offline fallback.
  5. Implemented self-healing in [ErrorBoundary.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/ErrorBoundary.jsx) and [App.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/App.jsx) to catch `ChunkLoadError` and reload the page automatically once using session storage markers, clearing it on a successful mount.

### B. PDF to Word XML Layout Corruption Fix (TSK-203)
- **Problem**: PDF-to-Word conversions involving complex layouts, merged cells, or non-standard Unicode characters would result in corrupted `.docx` outputs that Microsoft Word refused to open (triggering a content corruption dialog).
- **Solution**: Patched [pdf_to_word.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/pdf_to_word.py) to automatically check if LibreOffice is installed on the host system. If LibreOffice exists (primary), it converts the PDF to DOCX using LibreOffice Writer's compliant PDF Import filter, yielding 100% valid OpenXML markup that opens in Word without any warnings. If not found (fallback), it automatically falls back to `pdf2docx` in `safe_mode=True` (lattice/stream table parsing disabled) to ensure the file is not corrupted. Removed all settings checkbox toggles from [PdfToWord.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/document/PdfToWord.jsx) to keep the conversion flow direct and automatic.

### B. Resolving NLP Pipeline, Classifier Training, & WordNet Expansion Gaps (TSK-172, TSK-223)
- **Problem**: Natural language command classification had severe lexical gaps (e.g. synonyms like "safeguard", "abridge", "coalesce" not triggering protect, compress, and merge) and local training was overheating the developer's GPU.
- **Solution**: 
  1. **WordNet & spaCy Verb Expansion**: Integrated NLTK WordNet and spaCy POS tags filtering in [train_intent_classifier_gpu.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/scratch/train_intent_classifier_gpu.py). Automatically queries verb synsets (`pos='v'`), applies spaCy parts-of-speech filtering, conjugates tenses (gerunds, past actions, 3rd person singular), and generates WordNet definitions directly as training sentences.
  2. **Custom Disambiguation Blocklist**: Created a strict `WORDNET_BLOCKLIST` to prevent synonym cross-contamination (e.g. blocking "cut" in edit-pdf to preserve it for split-pdf, blocking "lock" in unlock-pdf, blocking generic compress/shrink verbs in image-compressor).
  3. **Local GPU Safety (Throttle)**: Reduced batch size to 256, added a 5ms inter-batch sleep, and forced `torch.cuda.empty_cache()` every epoch, reducing sustained RTX 2050 GPU temperature and load to a safe 65–70%.
  4. **Google Colab Training Script**: Created [train_intent_classifier_colab.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/scratch/train_intent_classifier_colab.py) configured to run training on Colab T4 cloud GPUs at scale. Uses 20,000 sentences per class (820,000 sentences corpus), batch size of 2048, and automatically triggers download of the resulting weights. Tested on 68-case suite (100% accuracy).

### B. Phase 5 Gap-Filler Master Upgrades & Patches (Completed)
- **LFI URL Filtering**: Patched local file inclusion security vulnerability in Playwright converter backend.
- **Visual Cryptographic Stamps**: Map drag-drop visual stamp coordinates to PDF points on the backend using pyHanko's TextStampStyle, rendering click-verifiable cryptographic fields in Acrobat.
- **Modular Resume Builder**: Refactored monolithic template styling logic into separate `resumeTemplates.js` file, added dynamic custom sections tab editor, and integrated a 250ms debouncer to preview updates.
- **JSON Import/Export (Resume Builder)**: Enabled backup/restore of resume builder forms and themes using client-side JSON files.
- **Form Fields Flattening (PDF Forms)**: Added a "Flatten PDF Form fields" toggle checkbox, integrating client-side `form.flatten()` in pdf-lib to convert interactive form widgets into static vectors.
- **URL-to-PDF Converter**: Created `UrlToPdf.jsx` page and backend Playwright rendering pipelines to convert online website links to PDF format with background graphics and margin controls.
- **Premium CV Templates Re-creation**: Designed and implemented 17 gorgeous, high-end cv templates (Mariana, Olivia, Jonathan, Emma, Charles, Kathleen, Richard, Sanchez Dark, Wilson Light, Sanchez Mono, Sanchez Wave, Howard Burgundy, Schumacher Charcoal, Catrine Olive, Adora Diagonal, Wilson Minimal, Lorna Slate) incorporating textual skill levels (Expert, Advanced, etc.) and A4 styling rules.
- **Modular Subfolder Templates Extraction**: Extracted all 17 template generator functions into standalone modules under the `src/engines/utility/templates/` subfolder.
- **CV Builder Premium Canvas & Muted Swatches**: Redesigned template cards and preview container into a dark workspace canvas (`#0f1117` and `#1e1e2e`) where templates float as white A4 sheets with realistic shadows (Canva-like). Replaced bright royal blue defaults and neon color swatches with muted, warm professional tones. Fixed card previews by removing inner padding and background gaps so the document occupies the card edge-to-edge. Set a clean layout design where the card container itself holds the floating paper drop shadow, matching the GetQuickResume look. Utilized a React-based ResizeObserver callback on each card to calculate exact pixel scale factors (width / 794) dynamically, resolving responsive column clipping. Updated the gallery grid layout to display exactly 4 columns in a row on desktop screen widths (1024px and above). Replaced faint tinted borders on template cards and labels with distinct, high-contrast neutral borders (`rgba(0,0,0,0.12)` in light theme and `rgba(255,255,255,0.12)` in dark theme) to clearly separate white templates from off-white backgrounds and highlight the label footer boundary. Removed the progress wizard steps indicator from both the template gallery and start mode screens, reducing top margin styles to shift all remaining visual headers and color picker swatches upwards. Cropped the 15 candidate headshot options from the attached image into individual local assets (`candidate_1.jpg` to `candidate_15.jpg`) and shuffled them across all CV templates as fallbacks and preview grid thumbnails. Fixed white bottom border bleed on circular frames by re-cropping the assets with a tighter 18% bottom padding constraint. Mapped unique, gender-matched name strings (`candidateName`) to each template block inside `TEMPLATE_MAP` and updated preview card state hooks to display correct names and sync editor forms upon card selections. Replaced the plain photo URL text box in Personal Information forms with an image file uploader that serializes images using FileReader Base64 strings. Added a "Full Preview" action button that opens a beautiful full-screen modal overlays to review the entire document page. Cleaned up decorative Unicode emojis from section headers and contact detail rows across all templates while keeping code-built vector elements (like inline SVGs) intact. This automatically shifts left-aligned headings fully to the margin edge. Built an interactive sliders-based circular crop adjustment modal (`photoCrop` settings) allowing manual zoom and X/Y repositioning, injecting dynamic CSS transforms into template engines. Aligned candidate placeholder names precisely to template label terms inside `TEMPLATE_MAP` to prevent gallery preview mismatches. Completely removed vertical scrollbars on the template gallery cards by setting `scrolling="no"` on preview iframes and injecting custom `html, body { overflow: hidden !important; }` style elements directly. Rendered the landing page navigation bar (`<Header />`) globally, managing heights dynamically for workspace views, and updated the Tools Directory to display a centered greeting ("Welcome, [User Name] 👋") and centered capsule-shaped filter tabs. Isolated the collapsible sidebar layout to a dedicated `/workspace` route so that opening the root landing page `/` remains clean and sidebar-free, and added a direct "CV Builder" link to `/resume-builder` on the navigation bar. Replaced the absolute sidebar position with a side-by-side flex flow on desktop viewports and added `lg:hidden` to the backdrop overlay to completely unblur the main workspace area and make it interactive.
- **Copy Landing Page Sections from Zip & Uploader Integration**: Copied Hero, Features, CVBuilder, Pricing, and Footer sections from `zip/src/components/` into `src/components/`, stripped all TypeScript annotations/types, and integrated click & drag-and-drop file inputs inside Hero's UploadBox to hook it to the workspace's local conversion engines. Replaced the inline markup in `Home.jsx` guest landing view with modular tags. Verified production builds.
- **Landing Page & Copywriting Overhaul**: Completely restyled and re-aligned the guest landing page UI elements. Removed the rocket glyph from the primary button and redesigned the secondary button into a premium frosted glassmorphic workflow CTA. Replaced monospaced marquee tags with semibold sans-serif capsules containing category-colored circular connection dots. Rewrote the AI-slop bullets inside the Visual Canvas text block and reconstructed the SVG mockup diagram to represent a real, 100% valid Directed Acyclic Graph (DAG) pipeline (`docforge_ecosystem.pdf`, `docforge_architecture.pdf`, `tax_receipt_scans.png` -> Merge PDF -> `merged_financials.pdf` -> Split PDF -> `investor_summary.pdf`, `financial_appendix.pdf`) matching the actual StitchCanvas card structures. Styled the mockup with inline CSS variables overrides to match the workspace canvas orange theme (`#f97316`), styled output ports as orange circles and input ports as slate grey circles, and removed Framer Motion draw delays to render continuous endless cable animations. Expanded the mockup screen real estate by adjusting column grid layouts from a 50/50 split to a spacious 41.7% / 58.3% split, widening the SVG coordinate space to `viewBox="0 0 840 280"`, spacing out columns with `45px` wire gaps, and widening the cards to `130px` to prevent text truncation. Overhauled the capability description cards inside `StickyStack.jsx` with customer-friendly premium terms ("Smart Command Menu", "On-Device Processing", "Secure e-Signatures"), and added faint grid overlays, concentric glass orbs, and underline hover animations to the uploader. Removed all thin borderTop separator lines from stats strip and sections 5-10 to enable a modern, seamless visual flow across the landing page. Deleted Section 10 (Animated CTA Footer Banner) rendering the "Your Files. Your Machine. Always." block. Rebranded CV Builder Carousel template names with professional display names (e.g. "Developer Monospace Timeline", "Executive Corporate Navy"), removed chevron scroller buttons, and implemented auto-scrolling with hover-pause behavior. Fixed the scrolling freeze by dynamically passing customized display names into the iframe document rendering data, moving hover detection exclusively to the active 3D track, and adding activeIndex to the effect dependency array to clear the interval timer.

### B. Center-Based Word Filtering in PDF-to-Excel (TSK-50)
- **Problem**: Table parsing was clipping words from adjacent cells because `page.crop()` boundary logic was overlapping.
- **Solution**: Replaced crop calls in [pdf_to_excel.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/pdf_to_excel.py) by reading page words once via `page.extract_words()` and checking if word centers (`(x0+x1)/2`) sit strictly inside cell boxes, eliminating characters bleeding.

### B. Centralized LibreOffice Conversion Process (TSK-51)
- **Problem**: Redundant code in `excel_to_pdf.py` and `pptx_to_pdf.py` for managing subprocess timeouts and shell conversions.
- **Solution**: Moved all subprocess management helpers to [libreoffice.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/libreoffice.py). Wired `convert_with_libreoffice` to dynamically dispatch conversions to specialized templates.

### C. Upload-First Selection Flow (TSK-53 & TSK-54)
- **Problem**: Uploaded files went directly to the workspace queue, making tool selection confusing.
- **Solution**: Intercepted single-file uploads in [Home.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/Home.jsx) to immediately pop open a full-screen tool picker overlay. Added an "Add to Batch Queue" button to let users queue uploads for later.

### D. Multi-File Workspace Batching (TSK-55, TSK-56, TSK-57, TSK-58)
- **Problem**: Batch processing (merging, signing, comparing) lacked native multi-file workflow support.
- **Solution**: 
  - Queued items now contain checkboxes. Selecting multiple items of the same type displays a floating glassmorphic batch actions bar.
  - Enabled batch routing by passing arrays in `location.state.initialFiles`.
  - Added a premium active switcher dropdown to [ToolPageLayout.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/ToolPageLayout.jsx) to swap the active file in multi-file pages (`SignPdf`, `OrganizePdf`, `MergePdf`, etc.).
  - Upgraded `ComparePdf.jsx` to render dropdown file pool selectors instead of static files limit hooks.

### E. Smart Passwordless PDF Unlocking (TSK-59 & TSK-60)
- **Problem**: Users were forced to input passwords manually even for common or auto-recoverable locks.
- **Solution**: Integrated 4-layer auto-bypass decryption in [security.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/security.py) and animated SVG padlocks in [UnlockPdf.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/pdf/UnlockPdf.jsx) to automatically bypass user inputs.

### F. Batch PDF Repair Workspace (TSK-61)
- **Solution**: Refactored [RepairPdf.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/pdf/RepairPdf.jsx) to accept multiple PDFs, display a grid of document integrity diagnostic cards (each containing circular health gauges, custom offset checklists, and individual action controls), and compile results to ZIP via JSZip.

### G. Premium Chunked Upload Pipeline (TSK-77)
- **Problem**: Uploading files of 10GB+ directly in a single HTTP request causes memory crashes on client browser tabs and hits request body size limits on the backend.
- **Solution**: Added `/api/upload/chunk` endpoint on the backend (restricted to `pro` users) that appends uploaded chunks to files on disk in append mode (`"ab"`), keeping RAM flat. Implemented `uploadFileSecure` on the frontend that automatically slices files > 25MB into 20MB chunks and streams them sequentially. Patched all 15 backend-facing page components to use this helper.

### H. Client-Side OCR Multilingual Ensemble & GPU Binding
- **Problem**: Client-side OCR worker was hardcoded to only run the English handwriting model (`rec_handwriting_web.onnx`) with a restricted 95-character dictionary lacking accented letters. `OcrClient` was also hardcoded to `'cpu'`, ignoring GPU boost preferences.
- **Solution**: Upgraded `ocr.worker.js` to run an ensemble pipeline loading both `rec_handwriting_web.onnx` and `rec_multilingual_web.onnx`. Parsed `/models/multilingual_dict.txt` (6163 chars) and resolved characters using the highest confidence score between the two models per line crop. Added a custom `document.createElement('canvas')` -> `OffscreenCanvas` mock in the worker to enable true WebGL GPU acceleration. Parallelized model execution with `Promise.all` and implemented live line-by-line progress updates from the worker to the UI. Enabled the client in `OcrPdf.jsx` to load with `'gpu'` when settings GPU boost is checked.

### I. Client-Side OCR Performance Optimization & Collision Fix
- **Problem**: CPU memory copy overhead of multi-megabyte image arrays and running the heavy multilingual model on every line segment sequentially caused high latency (~5 seconds per page). Running inferences concurrently caused ONNX graph texture reuse output collisions.
- **Solution**: 
  - Enabled HTML5 Transferable Objects to transfer array buffers instead of copying.
  - Implemented `cropResizeNormalizeToTensor` in `ocr.worker.js` to perform bilinear interpolation and channel normalization in a single pass.
  - Kept loop sequential to prevent GPU collisions, but added a **smart threshold fallback**: runs the fast handwriting model first, and only runs the heavy multilingual model if handwriting confidence falls below `0.82`, saving ~50% inference load.
  - Saved backup copies of original implementations at `scratch/ocr.worker.js.bak` and `scratch/ocrClient.js.bak` for easy recovery.

### J. Parallel Client/Server OCR Pipeline
- **Problem**: Sequential page processing in both client-side and server-side modes made OCR slow for multi-page documents.
- **Solution**: 
  - **Client-Side Worker Pool**: Spawns up to `4` parallel `OcrClient` instances. Pages are dynamically dispatched to available clients. Canvases are resized to `0x0` upon completion to free up GPU VRAM instantly.
  - **Server-Side Thread Pool**: Uses a Python `ThreadPoolExecutor` (max 4 concurrent workers) inside `ocr.py`. Opens thread-safe separate document file handles.
  - **Ordering Guarantee**: In both modes, page results are sorted into index-mapped arrays prior to stitching, preventing page scrambling.

### K. WASM SIMD Parallel OCR — Full Page Batch Inference
- **Problem**: Even with a 4-worker pool, each worker ran line-by-line inference sequentially due to WebGL not being re-entrant. This resulted in 30 sequential ONNX calls per page at ~30ms each = ~900ms per page.
- **Root Cause**: WebGL execution provider uses global GPU state — concurrent `.run()` calls cause output tensor collisions. WASM is fundamentally re-entrant and thread-safe.
- **Solution**: Switched `executionProviders` to `['wasm']` only, set `numThreads = navigator.hardwareConcurrency`. Rebuilt the worker into a 4-phase pipeline: (1) build all line tensors, (2) `Promise.all` on all HW inferences simultaneously, (3) `Promise.all` on only low-confidence multilingual fallback lines, (4) ensemble pick. WASM maps `Promise.all` directly to its internal SIMD thread pool — all 30 line inferences run at once.
- **Files**: `public/workers/ocr.worker.js`

### L. Google Stitch-Inspired Interactive Workspace Canvas
- **Problem**: The workspace queue was a flat list of cards, which made executing visual document pipelines (like merging the output of one action into another) difficult and visually uninspiring.
- **Solution**: 
  - Developed a zoomable and pannable dot-grid workspace canvas in [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx) inspired by Google Stitch.
  - Spawns uploaded documents as draggable nodes, draws visual Bezier connection cables, connects inputs to local WASM operation nodes, and outputs new result nodes.
  - Added a bottom chat/command input capsule supporting slash commands (`/merge`, `/compress`, `/split`, `/ocr`, `/clear`) with a simulated AI "Thinking..." typewriter delay.
  - Preserved all original site color tones by strictly utilizing CSS custom variables (`var(--color-primary)`, `var(--border-medium)`, etc.).
  - Integrated the canvas conditionally with a view toggle group ("Canvas" vs. "List") in [Home.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/Home.jsx). Restructured the column layout to keep the view toggles persistently visible even when the workspace queue is empty.
  - Added a centered glassmorphic upload card overlay inside the canvas grid when there are no items, allowing direct document drops and selections inside the dot grid view.
  - Authored a comprehensive 38-tool node configuration map [canvas_all_tools_masterplan.md](file:///C:/Users/Tanvir%20Alam/.gemini/antigravity/brain/72dd26a8-94b1-4c64-9f41-a73a682cb09f/canvas_all_tools_masterplan.md) mapping parameterization thresholds, chaining configurations, execution environments, and accessibility annotations.
  - Implemented the interactive node parameters overlay in [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx), rendering compression sliders, page range selectors, rotation dropdowns, password textboxes, and image dimensions widgets directly inside the operator nodes, complete with play/run triggers mapped to Web Workers.
  - Resolved cable routing logic gaps by implementing **Drag-and-Connect visual cables** between node output ports and operator input cards. Added a reactive **Linked Inputs list** with individual close buttons ("x") inside the operator cards, allowing full manual workflow customization.
  - Integrated **Touchpad Gesture Recognition & Passive Event Overrides** in [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx). Distinguishes pinch gestures (`e.ctrlKey === true`) to handle smooth, cursor-centric canvas zooming (blocking native browser page scaling via imperative non-passive listeners) from two-finger swipes (`e.ctrlKey === false`), which now translate directly to panning the dot-grid workspace (Figma/Miro style).
  - Corrected **port dot sub-pixel alignments** in [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx) by extracting ports from nested details wrappers and placing them as direct children of the node container, utilizing 6px offsets to center them exactly on card boundaries matching cable anchors.
  - Implemented a **Recursive DAG Execution Engine & Multi-Operator Action Chaining** in [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx). Enables selecting an operator node (e.g. `Merge PDF`) as an input source for downstream tools (e.g. `Split PDF`) before execution, rendering full visual cable paths. When a downstream node is triggered, it automatically resolves, executes, and awaits all upstream operators recursively first, passing their output buffers seamlessly without asynchronous React state lag.
  - Resolved **Operator Input Naming & Cable Rerouting** in [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx). Downstream cards properly map and show upstream operator details (e.g. `merge pdf output` dynamically changes to show the physical output name `merged_document.pdf` on completion). SVG connection cables automatically reroute their start anchors to point from the generated physical output node instead of overlapping the source operator card, maximizing visual cleanliness.
  - Implemented the **Visual Canvas Accessibility (A11y) Model** in [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx). Supports full keyboard focus navigation (`tabIndex={0}` and roles on both the canvas dot-grid and document/operator cards), a spatial layout calculation engine for directional arrow-key focus shifting, keyboard shortcut actions (`Space`/`Enter` to select, `c` to connect, `Delete`/`Backspace` to remove focused nodes), and an invisible `aria-live="assertive"` screen announcer vocalizing file changes, card focusing, and execution states.
  - Completed **WASM/JS Client-Side Tools Canvas Integration** in [StitchCanvas.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/components/StitchCanvas.jsx) and [Home.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/Home.jsx). Wired up 14 extra client-side engines (watermarks, page numbers, page exclusions, rotations, crop bounds, visual editors, interactive forms, custom signatures, and QR codes), mapped correct file type groups, expanded drag-and-drop suffix filters to match all supported office and HTML documents, and added UI parameters configuration controls to let users tweak settings directly in the workspace.
  - Completed **AI Document Translation**: Implemented 100% offline client-side GPU translation using `Xenova/m2m100_418M` ONNX weights via a Web Worker. Integrates PDF.js text coordinate line grouping to map paragraph boxes as overlays directly on the document page preview. Added fallback local server Qwen models tags API query and a backend `/api/smart-convert/direct` fast single-block API.
  - Completed **AI Summarizer Coming Soon**: Set the AI Summarizer tool page to render a premium glassmorphic Coming Soon screen prompting the user to try the AI Translator in the meantime.
  - Completed **Multi-Skill Design System Integration**: Synthesized and integrated the rules, anti-patterns, and design philosophies of `impeccable`, `huashu-design`, `taste-skill`, and `ui-ux-pro-max` into the local and global agent files to enforce slop-free, premium frontend development.

### M. Desktop Offline Auth Bypass and Auto-Login (TSK-191)
- **Problem**: When installing the desktop app, the local database sandbox is initially completely empty. This caused standard login requests to fail with "Incorrect email or password", blocking users from entering.
- **Solution**: Patched the signup and login endpoints in [main.py](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/main.py). Local registrations are auto-assigned `tier="pro"`. Local logins auto-create the user as a Pro tier locally if the email does not exist, allowing instant zero-config login with any credentials offline.

### N. Visual Canvas Navigation & Session Persistence Overhaul (TSK-189)
- **Problem 1 (Session Redirect on Reload)**: Reloading any authenticated page (like `/workspace` or `/canvas`) initialized the React state with `isAuthenticated: false` and loaded values from `localStorage` asynchronously. This caused the page guards (`ProtectedRoute`) to immediately redirect the user to `/login`, which then hydrated to true and redirected them back to `/` (losing their page state).
- **Solution 1**: Refactored [AuthContext.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/context/AuthContext.jsx) to synchronously read and populate the initial reducer state directly from `localStorage` at start.
- **Problem 2 (Missing Exit Button in Canvas)**: In visual studio canvas view, the global `<Header />` navigation bar was hidden, leaving logout as the only exit path.
- **Solution 2**: Removed the top-left "Exit Canvas" button to restore the original clean toolbar layout. Instead, added a glassmorphic **Exit Canvas (`close` icon)** button to the top-right view switcher controls widget next to the theme toggle, and an **Exit Canvas (`arrow_back` icon)** option inside the right-click custom context menu of the canvas grid.

### O. Collapsible Operator Cards & Direct URL QR Code Spawning (TSK-194)
- **Problem 1 (Collapsible Cards)**: Large settings forms inside active operator cards could clutter the canvas workspace.
- **Solution 1**: Added a `collapsedOps` React state and rendered caret toggle buttons (`unfold_less` / `unfold_more`) on all cards except `qr-generator`. Collapsing reduces card width to `150px` and hides form inputs, keeping the workspace extremely clean.
- **Solution 2**: Added URL regex parsing in the input submission handler (`handleSendCommand`) which auto-spawns a `qr-generator` operator card prefilled with the URL at the center of the viewport coordinate system, and automatically triggers its execution. Also resolved a bug in `executeOperator` where tools requiring 0 input files (like `qr-generator` and `url-to-pdf`) aborted early due to empty arrays (`finalItems.length === 0`). The check was updated to bypass zero-input nodes and all standard execution lines were made fully null-safe, enabling output file node generation.

### P. OCR Accuracy & Alignment Recovery (TSK-202)
- **Problem**: Quantizing the custom PaddleOCR handwriting model in TSK-196 mistakenly overwritten the handwriting slots (`rec_handwriting.onnx` and `rec_handwriting_web.onnx`) with the multilingual base model. Because the handwriting character list `HW_CHARS` (96 characters) in the browser worker did not match the multilingual vocabulary (18,708 characters), the CTC decoder generated scrambled characters and broken highlights.
- **Solution**: 
  - Restored the correct 2.05 MB quantized handwriting recognition model (`rec_handwriting .onnx.quant`) to all active backend and public frontend directories.
  - Upgraded [`backend/services/ocr_engine.py`](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/ocr_engine.py) to read the handwriting model's ONNX output shapes dynamically. If the shape is 97, it automatically writes a matching 95-character ASCII `inference.yml` with the correct `PreProcess` parameters; otherwise, it falls back to copying the default cached medium model parameters.

### Q. High-Fidelity PDF to Word (DOCX) Table & Word Healing (TSK-203)
- **Problem**: Table lists in generated DOCX files were squeezed into 50/50 columns causing text descriptions to wrap in narrow columns, overflow to 3 pages, and split character runs (e.g. "Listenin g") in Google Docs and Word 2007. The profile photo was also vertically cropped to the height of Row 1 (0.3 inches) because the rows below it (Row 2, 3, 4) did not merge with it vertically.
- **Solution**:
  - Restored `pdf2docx` as the sole high-fidelity parsing engine.
  - Built an XML text healer inside the paragraph run parser to merge kerning-split words.
  - Developed a **Bullet Column Optimizer** inside [`backend/services/pdf_to_word.py`](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/backend/services/pdf_to_word.py) that detects list tables and shrinks bullet point column widths to 300 dxa (~0.2 inches) in the `tblGrid`, shifting the remaining width to text cells to flow naturally.
  - Added a **Header Row Cell Merging** routine that automatically merges cells of non-bullet header rows (like "Language Skills") in list tables, completely preventing text clipping.
  - Implemented **Vertical Profile Image Merging**: Detects when a table row contains a profile photo in Cell 1 (creating a vertical merge block). It automatically aligns and merges the first columns of subsequent rows vertically using `<w:vMerge w:val="continue"/>` tags, ensuring the profile photo is fully visible and spans all 4 rows next to the name/contact info without any vertical clipping.
  - Removed all layout/safeMode toggles from [PdfToWord.jsx](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/document/PdfToWord.jsx) for a direct, automated conversion experience.

### R. Exact Row Height Spacing Constraints & Bullet-List Layout Fixes (TSK-205)
- **Problem**: Google Docs and Word displayed massive blank spaces in list tables (like Projects) due to strict `trHeight hRule="exact"` constraints. Additionally, words inside tables split mid-character (e.g., "Englis h") because of exact height constraints combined with cell indentations (`w:ind`). Finally, hyphen/dash elements incorrectly triggered bullet columns shrinking.
- **Solution**:
  - Converted all `hRule="exact"` constraints dynamically to `hRule="atLeast"` globally, letting rows adjust height automatically based on cell content.
  - Cleared all paragraph margins and indentations (`w:ind` and `w:spacing lineRule="exact"`) inside table cells to allow natural text wrapping.
  - Filtered out and removed completely empty row placeholders to prevent giant layout gaps.
  - Restricted bullet-text detection to only match real unicode list indicators (excluding hyphens or letters like `o`, `*`, `-`).
  - Added a narrow-width validation check for bullet lists to prevent false positive detection.

### S. Fix DOCX Previewer Grey Bars & Cell Backgrounds (TSK-207)
- **Problem**: The frontend document viewer rendered unstyled page margin boundaries and page-break separators as thick grey horizontal bands at the top/middle/bottom of pages. In addition, the rebuilt profile header's text cell lacked background shading, creating a layout mismatch with the grey profile photo cell.
- **Solution**:
  - Re-applied matching light grey shading (`w:shd w:fill="f5f5f5"`) to the header text cell in the DOCX table-builder.
  - Reset the frontend previewer's `className` in `DocumentViewer.jsx` to the library's default `"docx"`, ensuring the dynamically injected styles are correctly matched.
  - Appended target styling overrides for `.docx-wrapper`, `.docx`, and section margins/header/footers in `index.css` to make them clean and transparent. This removes all unstyled grey bands and page margins.

### T. Fix PDF Previewer Blurriness (Retina/High-DPI Support) (TSK-208)
- **Problem**: PDF documents rendered in the file previewer looked fuzzy or blurry on high-density (Retina / Windows High-DPI) displays because the canvas drawing resolution was mapped 1-to-1 with standard CSS pixels.
- **Solution**:
  - Modified the PDF canvas renderer in [`src/pages/utility/DocumentViewer.jsx`](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/utility/DocumentViewer.jsx) to detect `window.devicePixelRatio`.
  - Multiplied the rendering viewport scale by the pixel ratio (up to a max cap of 2.0 for performance).
  - Scaled the canvas width and height attributes (drawing buffer size) by this ratio while setting the CSS style width/height back to the original layout size.
  - Separated the text layer rendering to use the original unscaled viewport coordinates, keeping selectable text matches aligned precisely.

### U. Fix Select Dropdown Option Contrast Accessibility (TSK-209)
- **Problem**: In light theme, the selection filter dropdown options rendered with almost invisible dark text on a dark background due to hardcoded background values clashing with browser-native overrides.
- **Solution**:
  - Removed hardcoded background color classes (`bg-[#1e1e2e]`) from dropdown `<option>` tags in [`DocumentViewer.jsx`](file:///c:/Users/Tanvir%20Alam/Downloads/New%20folder%20upscaled/src/pages/utility/DocumentViewer.jsx).
  - Bound the select options to a new CSS selector `.theme-select` using CSS theme variables (`var(--bg-tertiary)` and `var(--text-primary)`).
  - Explicitly mapped the browser-native `color-scheme` property for the select component based on the active UI mode to guarantee correct default text and background contrast ratios.

### V. Performance, Reliability, and Offline Cache Upgrades (TSK-212 to TSK-216)
- **Problem**: Large model loading (ONNX models for OCR/translation) and built JS/CSS files caused repeat page load latency. Continuous server polling loops would spin forever if the network dropped. Also, active execution steps lacked descriptive feedback on operator nodes.
- **Solution**:
  - **API Response Compression**: Enabled Gzip payload compression above 1KB on the FastAPI backend using `GZipMiddleware`.
  - **Post-Build Static Assets Compression**: Created a custom post-build zlib script (`scratch/compress_assets.js`) to automatically compress text, WASM, and ONNX models into `.br` and `.gz` static copies.
  - **Polling Circuit Breaker**: Added consecutive failure checks (limit 5) to `useJobPoller` hook and canvas polling to abort gracefully.
  - **Descriptive Progress Text**: Passed granular state names ("Uploading...", "Queued...", "Processing...", "Downloading...") to operator nodes.
  - **Service Worker Offline Cache**: Added a Cache-First service worker (`sw.js`) that caches static bundles, workers, and heavy quantized ONNX models locally in Cache Storage.

### W. Prevent Client-Side Memory Leaks & Destruct Active Workers/PDF Instances (TSK-217)
- **Problem**: Quantized ONNX models loaded by browser web workers (for client-side OCR and AI translation) and open PDF document streams stayed cached in memory even when inactive, leading to a permanent memory footprint above 300MB.
- **Solution**:
  - **Auto-Sleep & Worker Disposal**: Updated client-side OCR pool and Translate workers to terminate themselves immediately upon generating the download URL (finished state) and on reset events.
  - **Unmount and Error Guards**: Added `useEffect` cleanup listeners in `OcrPdf`, `TranslatePdf`, and `DocumentViewer` components that force worker pool termination and destroy open PDF document instances as soon as the user navigates away or an error occurs.
  - **PDF Document Cleanup**: Injected explicit `.destroy()` calls on PDF.js loaded document buffers in `OcrPdf`, `TranslatePdf`, `DocumentViewer`, `ResumeBuilder`, and `ocrPdf` immediately after processing is finished.

### X. Web Worker Inference Warmup & Canvas Context Optimizations (TSK-218)
- **Problem**: First-time runtime execution in machine learning workers (for OCR and translation) was delayed by 1–2 seconds while compiling shaders or translation pipelines on the CPU/GPU. In addition, high-frequency canvas pixel extractions (`getImageData`) introduced CPU/VRAM readback latency during PDF page splits and image operations.
- **Solution**:
  - **Asynchronous Model Pre-Warming**: Injected dummy warmup passes inside `ocr.worker.js` and `translation.worker.js` during the worker registration (`type === 'init'`) phase. Pre-warming compiles WebGPU/WebGL pipeline shaders in the background ahead of active conversions.
  - **Canvas Readback Speedups**: Configured high-frequency canvas contexts in `ocrPdf.js`, `OcrPdf.jsx`, `compressImage.js`, and `pdf.worker.js` to initialize using `{ willReadFrequently: true }`. This utilizes software-backed buffer optimizations to double pixel readback speeds.

### Y. Document Viewer Apple-Style Workspace Layout Upgrades (TSK-219)
- **Problem**: The document viewer had a flat, static top bar and select filters dropdown that felt basic and did not represent a premium macOS/iOS-style design. Left sidebar tabs had plain borders.
- **Solution**:
  - **macOS Floating Tool Dock**: Converted the top bar into an absolute glassmorphic dock (`bg-secondary/85 backdrop-blur-md border border-white/10 shadow-2xl`) hovering centered at the top of the canvas viewport, letting pages scroll underneath.
  - **Floating Metadata & Wiping**: Placed file info in a top-left pill and the session close wiping button in a top-right capsule.
  - **iOS Segmented Tab Pills**: Restructured the left sidebar tab headers into a rounded capsule with a sliding background highlight pill that transitions horizontally using a bezier ease curve.
  - **Popover Filters Dropdown**: Replaced the native select input with a custom popover menu overlay with active checkmark items and a solid theme-based background (`var(--bg-secondary)`) to prevent document text from bleeding through.
  - **Apple Spring Animations**: Added CSS spring keyframe animations (`active:scale-95` haptics and `.apple-spring-item` entries) to provide smooth vertical-sliding, scaling, and entry bounces.

### Z. Document Viewer High-Fidelity Rendering & Subpixel Optimization (TSK-220)
- **Problem**: PDF rendering on high-DPI (Retina/4K) displays looked slightly blurry due to pixel-ratio caps. Additionally, applying rotation, zooms, or color filters introduced subpixel rasterization blur on document text in web browsers.
- **Solution**:
  - **3x Retina Rendering**: Upgraded the PDF.js canvas device pixel ratio limit from 2 to 3 to output vector-sharp pages.
  - **Subpixel GPU Transform Preservation**: Added hardware acceleration overrides (`backface-visibility: hidden`, `transform-style: preserve-3d`, `will-change: transform, filter`) totransformed wrappers.
  - **Antialiasing Rules**: Added global text smoothing rules (`-webkit-font-smoothing: antialiased` and `text-rendering: optimizeLegibility`) across all rendering elements.

### AA. Unified Document Formatting & Zoom Controls (TSK-221)
- **Problem**: Non-PDF formats (Word docx, text logs, markdown, and PowerPoint slides) did not display formatting (zoom, rotation, flip, color filters) controls on the floating toolbar dock.
- **Solution**:
  - **Toolbar Controls Expansion**: Expanded dock controls to render for all document types except audio/video.
  - **HTML Scaling**: Bound CSS transform scale and filter tags directly onto DOCX, TXT, MD, Code, and PPTX slide wrappers.
  - **Security Cleanups**: Deleted the secure wiping toast notification overlay completely to simplify workspace states.

### AB. Web Worker and PWA Caching Bug Fixes (TSK-222)
- **Problem**: A syntax error (missing brace) in `ocr.worker.js` crashed the client-side OCR background workers during startup. Additionally, when the app was offline and accessed uncached resources, the service worker crashed due to returning `undefined` into the browser's `respondWith()` handler, and `registerServiceWorker.js` environment checks used dead-code checks.
- **Solution**:
  - **Syntax Correction**: Added the missing closing brace `}` for the multilingual session loading block's `else` branch in `ocr.worker.js`.
  - **Offline Crash Shield**: Added a clean 503 fallback Response to the Stale-While-Revalidate catch handler in `sw.js`.
  - **Standard Vite Env Checks**: Rewrote `registerServiceWorker.js` to use `import.meta.env.PROD` and `import.meta.env.DEV` for environment checking.

### AC. Document Preview Font Mapping (TSK-224)
- **Problem**: When rendering documents (like Word `.docx` resumes) that refer to unavailable fonts, browsers fell back to their default serif font (Times New Roman), causing a visual mismatch with the clean modern sans-serif aesthetic of the application.
- **Solution**: Added strict font-family overrides for `.docx-wrapper` and all of its nested children (`.docx-wrapper *`), forcing them to render using DocForge's signature typeface **Inter**, system-ui, and sans-serif.

### AD. Local ONNX Semantic Intent Classifier & Web Worker (TSK-225)
- **Problem**: Natural language commands (including Bengali script inputs, multi-clause chains, typos, and negations) needed to be classified client-side to dynamically coordinate operations on the canvas. English-only semantic models (like `all-MiniLM-L6-v2`) failed to recognize Bengali inputs, and long, verbose sentences diluted TF-IDF keyword weights below the 0.80 execution threshold.
- **Solution**:
  - **Quantized Local Semantic Fallback**: Spawned a dedicated Web Worker (`classifier.worker.js`) executing the quantized `all-MiniLM-L6-v2` ONNX model client-side to provide zero-shot semantic matching when TF-IDF is uncertain.
  - **Unicode-Aware Tokenization**: Replaced ASCII tokenization regexes with the Unicode-aware `/[^\p{L}\p{M}\p{N}\s_-]/gu` to preserve Bengali vowels, accents, and letters.
  - **Negation and Command Blocklist**: Added an early blocklist check matching negative words (`not`, `no`, `don't`, `cancel`, etc.) and canvas shortcuts (`undo`, `redo`) to immediately bypass execution.
  - **Exclusive Keyword Router**: Integrated direct regex routing rules for exclusive keywords (`rotate`, `turn`, `merge`, `combine`, `মার্জ`, `কমানো`, `সাইজ`) to bypass TF-IDF dilution and instantly force target tools with 1.0 confidence.
  - **Validation Hardening**: Verified that the combined ensemble hits **100% classification accuracy** across the entire 87 multi-lingual and adversarial validation cases.

### AE. Client-Side AI Help Chatbot & Semantic RAG Index (TSK-225)
- **Problem**: Users need a lightweight, offline-first way to ask natural language questions about DocForge's features, capabilities, tools, and security practices, without introducing heavy server dependencies, API bills, or privacy leaks.
- **Solution**:
  - **Pre-Build RAG Index Compiler**: Created `scratch/compile_knowledge.js` using Node.js and `@xenova/transformers` to parse the FAQs in `LandingPage.jsx` and the tool definitions in `constants.js`, compute their 384-dimensional vector embeddings pre-build, and output a compact 568KB `public/models/website_knowledge.json` vector index.
  - **EPERM & emptyOutDir Mitigations**: Configured `emptyOutDir: false` in `vite.config.js` to prevent Windows directory lockups on heavy model files, and added a targeted `dist/assets` clean routine to `compile_knowledge.js` to ensure clean asset building.
  - **Worker Query Embedding Handler**: Integrated the `embed_query` message type into `classifier.worker.js` and exposed `embedQueryText(text)` inside `classifier.js` to fetch query vectors from the pre-warmed background worker.
  - **Floating Glassmorphic Chatbot UI**: Implemented `src/components/AIChatBot.jsx` as a fixed floating widget with responsive light/dark theme variables, input submission handlers, typing state indicators, auto-scroll bounds, and direct-action CTAs (e.g. rendering a "Launch Merge PDF" link if the RAG result matches a specific tool).
  - **Build Integration**: Updated `package.json` build scripts to compile the index automatically before the assets compile.

### AF. Interactive RAG Expansion & AI Chatbot Identity Hardening (TSK-231)
- **Problem**: Conversational greetings and identity queries (e.g. "who are you") fell back to the local inference worker, failing or warning the user if the ONNX model was still warming up during cold start. Additionally, the RAG index lacked details about key areas of the site (pricing tiers, canvas focus studio, shortcuts, custom viewport options, and local preview formats).
- **Solution**:
  - **Conversational Greetings and Identity Interceptors**: Added direct keyword matches in `AIChatBot.jsx` for greetings and identity questions, returning zero-latency offline-native answers instantly.
  - **Graceful Cold-Start Fallback**: Checked `isClassifierWorkerReady()` inside the embedding query handler and served a warm, user-friendly model warmup message during cold-start delays instead of showing connection errors.
  - **Expanded Website Knowledge Base**: Appended comprehensive data points detailing pricing plans, privacy/GDPR, Stitch Canvas workflows, Focus Studio visual overlays, keyboard shortcuts, Word/Excel/PowerPoint converters, offline OCR/Un-OCR, and Document Viewer capabilities to `scratch/compile_knowledge.js` and recompiled the local vector index.

---

## 5. What Was Tested & How

- **Production Build and Syntax Check**: Verified that the entire project compiles successfully using `npm run build` after fixing the unclosed brace syntax issue in the web worker, checking and correcting service worker registration checks, and verifying post-build asset compression processes.
- **Worker Pre-Warming and JIT-Compilation**: Monitored initialization logs in Web Worker output and verified that JIT-compiling WebGL/WebGPU shaders occurs successfully inside background threads immediately on startup. Confirmed first-page processing starts with zero JIT latency.
- **Memory Leak and Resource Cleanup**: Monitored active browser processes and Chrome DevTools Memory tab before and after starting OCR/Translation tasks. Verified that on component unmount, reset, or when going to the download section, all active Web Workers are terminated, PDF document instances are destroyed, and memory usage immediately returns to baseline.
- **API & Bundle Compression**: Ran `npm run build` and verified the compilation invokes the compression script and creates compressed copies of models and files. Verified FastAPI compresses server response payloads in transit.
- **Circuit Breaker**: Mocked server failure responses during active job polling and verified the client aborted the polling hook and displayed the connection warning accurately.
- **Service Worker Caching**: Inspected registration and resource loading offline, ensuring cached ONNX models load instantly.
- **PDF OCR Searchability**: Tested using `python scratch/test_pdf_ocr.py`. It renders pages to cv2 BGR layouts, executes the OCR queue pipeline, draws matching transparent text characters on ReportLab layout overlays, and verifies the output PDF contains selectable, matching text. In TSK-202, confirmed that dynamic model name resolution initialized without Model Name Mismatch or PreProcess KeyError exceptions and completed the searchability check successfully.
- **LibreOffice Conversions**: Verified via unit tests:
  - `python -m unittest backend/test_excel_to_pdf.py`
  - `python -m unittest backend/test_pptx_to_pdf.py`
  These verify page sizes, conversion subprocess signals, and PDF structural integrity.
- **Stress Runs / Bleeding Checks**: Tested via `python scratch/test_stress_run.py`, verifying table cell mapping configurations and gridlines.
- **Frontend Syntax & Imports**: Validated by running `npm run build`, ensuring zero import anomalies, missing declarations, or styles breakage.
- **Desktop Packaging & Sidecar Runtime**: Verified by building the full application via `npm run tauri build` and running `docforge.exe` within both standalone Downloads and installed AppData folders. Confirmed backend sidecar starts on port `8765` and uvicorn runs without ASGI module load issues.
- **Desktop Offline Auth Bypass and Auto-Login**: Validated that in desktop/packaged mode, users can sign up or log in with any email and password and are automatically provisioned as Pro accounts. Verified database creation and token validation processes.
- **Intent Classifier Validation Suite**: Verified via `node scratch/test_hybrid_classifier.js`. Confirmed the hybrid ensemble hits exactly **87/87 (100.00%) accuracy** across English and Bengali script inputs, multi-clause transition prompts, adversarial typos, and negation/canvas command exclusions.


