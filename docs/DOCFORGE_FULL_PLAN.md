# DocForge — Complete Launch-Ready Implementation Plan
### Version 2.0 — Hybrid Architecture (Client-Side + LibreOffice Backend)

---

## ⚠️ Critical Architecture Decision First

The original plan is **purely client-side React**. That works for simple tools. But the moment you add LibreOffice, you have a **server-side component** — LibreOffice cannot run in a browser. This means DocForge is a **hybrid app**:

| Layer | Tech | Handles |
|---|---|---|
| Frontend | React + Vite | UI, client-side conversions, previews |
| Backend | FastAPI (Python) | LibreOffice, heavy conversions, queued jobs |
| Queue | Redis + RQ | Prevents server crash on concurrent conversions |
| Temp Storage | Cloudflare R2 | Free 10GB, zero egress fees |
| Server | Hetzner CX22 | ~$4.50/month, 2 vCPU, 4GB RAM |

This is non-negotiable if LibreOffice is in the stack. Design the frontend to hit local API routes for server-side jobs and process directly in-browser for simple jobs.

---

## ❌ One Thing I Disagree With in the Original Plan

### DocxToPdf approach: `mammoth → html2canvas → jsPDF`

This is wrong and will produce terrible output. Here's why:

- **mammoth** converts DOCX → HTML (lossy — loses complex formatting)
- **html2canvas** screenshots that HTML as a rasterized canvas image
- **jsPDF** wraps that image in a PDF container

The result is a **screenshot PDF** — not searchable, not copy-pasteable, blurry on retina screens, and wrong page breaks. It is objectively worse than what LibreOffice produces.

**Fix:** Route DOCX → PDF through LibreOffice headless on the backend. One subprocess call, perfect output.

---

## Current State (Carried From Original Plan)

| Area | Status |
|---|---|
| Design System (CSS) | ✅ Done — 1030-line glassmorphic dark theme |
| 12 Conversion Engines | ✅ Done |
| 7/12 Tool Pages | ✅ Done — PDF tools + Image Converter |
| 5 Tool Pages | ❌ Missing |
| App.jsx / Routing | ❌ Vite boilerplate |
| Dependencies | ❌ npm install failed |
| SEO / Meta Tags | ❌ Not started |
| Lazy Loading | ❌ Not started |
| Ad Integration Prep | ❌ Not started |
| Backend | ❌ Doesn't exist yet |

---

## Full Library Allocation — Every Library at Full Capability

### Frontend (JavaScript/Browser)

| Library | Full Capability Usage |
|---|---|
| `pdf-lib` | Create PDFs from scratch, merge, split, rotate, add watermarks, fill form fields, add metadata |
| `pdfjs-dist` | Render PDF pages as canvas/images, extract text content, get page count/dimensions, thumbnail generation |
| `mammoth` | DOCX → clean HTML (for preview rendering only, NOT for PDF conversion) |
| `jsPDF` | Text-to-PDF with font embedding, multi-page, custom headers/footers, table rendering via jspdf-autotable |
| `html2canvas` | Screenshot HTML components for sharing previews as images (not for PDF conversion) |
| `file-saver` | Trigger downloads for any blob — PDF, ZIP, PNG, etc. |
| `qrcode` | Generate QR codes with custom size, colors, error correction levels, export as PNG/SVG/canvas |
| `jszip` | Bundle batch output files (compressed images, multiple PDFs) into a single ZIP download |
| `Pillow (via canvas API)` | Client-side image resize, compress, format convert (PNG/JPG/WEBP) via Canvas API |

### Backend (Python)

| Library | Full Capability Usage |
|---|---|
| `LibreOffice headless` | DOCX↔PDF, PPT↔PDF, XLS↔PDF, ODT↔DOCX, RTF↔DOCX, HTML↔DOCX — the master converter |
| `pdf2docx` | PDF → editable DOCX with layout preservation (tables, columns, images) |
| `python-docx` | Create/edit DOCX programmatically, extract content, inject AI-processed text back into Word |
| `reportlab` | High-fidelity PDF generation from Python — tables, charts, headers, watermarks |
| `Pillow` | Server-side image conversions, batch resize, TIFF/BMP/WEBP/ICO support, metadata stripping |
| `pypandoc` + `pandoc` | Markdown↔DOCX, HTML↔Markdown, RST↔anything — pure text format ecosystem |
| `openpyxl` | Read/write XLSX, extract tables as CSV/JSON, generate Excel reports |
| `python-pptx` | Read/write PPTX, extract slide text, inject content, convert slides to images |
| `weasyprint` | HTML/CSS → high-quality PDF (for custom-styled PDF generation) |
| `fpdf2` | Lightweight PDF generation — faster than reportlab for simple documents |
| `APScheduler` | Background cleanup job — delete files older than 30 minutes every 10 minutes |
| `FastAPI` | Async REST API — upload endpoint, conversion router, status polling, download endpoint |
| `Redis + RQ` | Job queue — prevents LibreOffice crash under concurrent conversion requests |
| `python-magic` | MIME type detection from file bytes — don't trust extensions alone |

---

## Part 1 — Frontend Plan (Expanded)

### 1.1 Fix Dependencies & Project Config

#### [MODIFY] package.json
```bash
npm install react-router-dom pdf-lib pdfjs-dist mammoth jspdf \
  html2canvas file-saver qrcode jszip jspdf-autotable
```
If network fails: `npm install --registry https://registry.npmmirror.com`

#### [MODIFY] index.html
- Title: `"DocForge — Free Online Document & PDF Tools | 100% Private"`
- Full meta tags: description, keywords, Open Graph, Twitter Card
- JSON-LD structured data (`WebApplication` schema)
- Favicon link
- `<noscript>` fallback message
- Preconnect to Google Fonts + AdSense domains

#### [DELETE] App.css
Conflicts with existing glassmorphic design system.

#### [MODIFY] vite.config.js
- `manualChunks` — split vendor libs (pdf-lib, pdfjs-dist, mammoth) into separate chunks
- `build.target: 'es2020'`
- Self-host pdfjs-dist worker file (don't load from CDN in production)
- Configure proxy for `/api/*` → FastAPI backend in dev mode

---

### 1.2 App Shell

#### [MODIFY] main.jsx
- Wrap `<App />` in `<BrowserRouter>`

#### [MODIFY] App.jsx — Complete Rewrite
- `React.lazy()` for ALL 12+ tool pages
- `<Suspense>` with animated dark spinner matching glassmorphic theme
- `<Routes>` with all tool routes + Home + 404
- Persistent `<Header>` + `<Footer>`
- Scroll-to-top on route change

---

### 1.3 Create 5 Missing Tool Pages

#### [NEW] ImageCompressor.jsx
- Multi-file upload → quality slider (10–100%) → batch compress via Canvas API
- Shows before/after file sizes + savings % per file
- Download all as ZIP via jszip

#### [NEW] ImageResizer.jsx
- Multi-file upload → mode toggle (Exact px / Percentage / Fit within bounds)
- Width/height inputs with aspect ratio lock toggle
- Batch resize via Canvas API → download as ZIP

#### [NEW] DocxToPdf.jsx ⚠️ REVISED APPROACH
- Upload .docx → POST to `/api/convert/docx-to-pdf` (backend)
- Backend runs LibreOffice headless subprocess
- Frontend polls `/api/job/{id}/status` every 1.5 seconds
- On complete: download proper PDF (searchable, correct formatting)
- Show live progress bar during server processing

#### [NEW] TextToPdf.jsx
- Textarea input OR .txt file upload
- Font family selector, font size slider, page size (A4/Letter/Legal)
- Line spacing, margin controls
- Generates PDF client-side via jsPDF with proper multi-page wrapping
- Live page count estimate while typing

#### [NEW] QrGenerator.jsx
- URL/text input with character counter
- Size slider (128px–1024px)
- Foreground + background color pickers
- Error correction level selector (L/M/Q/H) with explanation tooltips
- Live QR preview updates as you type
- Download as PNG or SVG
- Copy to clipboard button

---

### 1.4 New Spice Features (Differentiators)

#### [NEW] SmartConvert.jsx — AI-Powered Conversion
**This is the biggest differentiator. No competitor has it.**

- Upload any document → select conversion + AI enhancement mode
- AI enhancement options:
  - `Fix Formatting` — clean broken paragraph breaks, fix heading hierarchy
  - `Summarize + Convert` — get converted doc + a text summary
  - `Extract Tables Only` — pull all tables into a clean spreadsheet
  - `Clean Scan Artifacts` — remove OCR noise from scanned PDFs
- Backend sends document content to Claude API, applies transformation, then converts
- Result: two downloads — the converted file + an AI enhancement report

> **Antigravity prompt for this:**
> Build a FastAPI endpoint `/api/smart-convert` that accepts a file upload + an AI mode parameter. Extract document text using python-docx or pdfminer, send to Claude API with the appropriate system prompt for the selected mode, apply the transformation, then run LibreOffice conversion on the modified content.

#### [NEW] ConversionPipeline.jsx — Chain Builder
**No tool on the internet has this.**

- Visual drag-and-drop pipeline builder
- User adds steps: Upload → [Step 1] → [Step 2] → [Step 3] → Download
- Available steps:
  - Convert format (any supported pair)
  - Compress images
  - Extract pages (PDF)
  - Translate (via AI)
  - Add watermark
  - Merge with another file
- Pipeline saved as JSON, shareable as URL parameter
- Execute sends the chain to backend as a job sequence

> **Antigravity prompt for this:**
> Build a React drag-and-drop pipeline UI using the existing glassmorphic design system. Each step is a card with a type selector and config panel. The pipeline serializes to JSON sent to a `/api/pipeline` endpoint that executes each conversion step in sequence.

#### [NEW] LivePreview.jsx — Component (used in all tool pages)
- After conversion completes, render preview BEFORE download button appears
- PDF → render first page via pdfjs-dist as canvas
- Image → show directly
- DOCX → render mammoth HTML output in a styled iframe
- This single feature builds massive trust and reduces "did it work?" anxiety

#### [NEW] DocumentSurgery.jsx — PDF Control Panel
- Upload PDF → shows page thumbnail strip
- Controls:
  - Click to select/deselect individual pages
  - Drag to reorder pages
  - Set output format per selected page range
  - Strip images toggle (reduces file size dramatically)
  - Remove headers/footers toggle
  - Password protect output
- Everything processed client-side via pdf-lib

#### [NEW] BatchCanvas.jsx — Multi-File Workspace
- Replace the single file input on all tools with a drag-and-drop canvas
- Drop multiple files → each shows as a card with detected format + size
- Assign individual conversion rules per file card, or "Apply to all"
- Run all conversions → single ZIP download
- Visual queue with per-file progress bars

#### [NEW] ShareableResult.jsx — Temporary Share Link
- After conversion: "Share this file" button
- Uploads converted file to Cloudflare R2 with a UUID
- Generates a link: `docforge.app/share/abc123` that expires in 24 hours
- Recipient downloads without needing to convert anything
- Auto-delete handled by backend APScheduler job

---

### 1.5 SEO & Ad Revenue Components

#### [NEW] SEOHead.jsx
- Sets `document.title` + meta description per page dynamically
- Each tool targets specific long-tail keywords:
  - "Compress PDF Online Free — No Upload Required"
  - "Convert DOCX to PDF — 100% Private"
  - "QR Code Generator — Custom Colors, Free"

#### [NEW] AdPlaceholder.jsx
- Pre-sized ad slot divs for standard AdSense units:
  - Leaderboard (728×90) — header area
  - Rectangle (300×250) — between tool results
  - In-feed (responsive) — below conversion output
- Styled as dark glassmorphic placeholder until AdSense activates
- `data-ad-slot` attributes pre-configured

#### [NEW] NotFound.jsx
- Custom 404 with tool suggestions grid
- Keeps users on-site (better bounce rate = better ad performance)

---

### 1.6 Performance & Quality

#### [NEW] useFileProcessor.js — Custom Hook
- Shared state: `files, processing, progress, result, error, jobId`
- Auto `URL.revokeObjectURL()` cleanup on unmount
- Handles both client-side jobs (immediate) and server-side jobs (polling)
- Unified error messages

#### [NEW] useJobPoller.js — Custom Hook
- Polls `/api/job/{id}/status` every 1.5 seconds for server-side conversions
- Cancels polling on unmount
- Returns `{ status, progress, downloadUrl, error }`

#### [NEW] ScrollToTop.jsx
- Fires on every route change

---

## Part 2 — Backend Plan (New — LibreOffice + FastAPI)

### 2.1 Server Setup (Hetzner CX22 — ~$4.50/month)

```bash
# On fresh Ubuntu 22.04 server
sudo apt update && sudo apt upgrade -y
sudo apt install -y libreoffice pandoc redis-server
pip install fastapi uvicorn python-multipart pdf2docx \
  python-docx reportlab Pillow pypandoc openpyxl \
  python-pptx weasyprint fpdf2 apscheduler rq \
  python-magic anthropic boto3
```

### 2.2 FastAPI Backend Structure

```
backend/
├── main.py                  # FastAPI app, CORS, routes
├── routers/
│   ├── convert.py           # All conversion endpoints
│   ├── smart_convert.py     # AI-powered conversion endpoint
│   ├── pipeline.py          # Conversion chain endpoint
│   └── share.py             # Shareable link endpoints
├── services/
│   ├── libreoffice.py       # LibreOffice subprocess wrapper
│   ├── pdf_service.py       # pdf2docx, reportlab operations
│   ├── image_service.py     # Pillow operations
│   ├── office_service.py    # python-docx, openpyxl, python-pptx
│   ├── pandoc_service.py    # pypandoc operations
│   └── ai_service.py        # Claude API integration
├── jobs/
│   ├── queue.py             # RQ queue setup
│   ├── worker.py            # RQ worker
│   └── cleanup.py           # APScheduler file cleanup
├── utils/
│   ├── file_validator.py    # MIME type check via python-magic
│   ├── format_router.py     # Decides client vs server conversion
│   └── r2_client.py         # Cloudflare R2 upload/download
└── config.py                # Env vars, paths, size limits
```

### 2.3 Core Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | POST | Accept file, validate MIME, store in /tmp, return job_id |
| `/api/convert` | POST | `{job_id, target_format}` → queue conversion job |
| `/api/smart-convert` | POST | `{job_id, target_format, ai_mode}` → AI + conversion |
| `/api/pipeline` | POST | `{job_id, steps[]}` → execute chain |
| `/api/job/{id}/status` | GET | Returns `{status, progress, download_url}` |
| `/api/download/{id}` | GET | Streams converted file to browser |
| `/api/share` | POST | Upload to R2, return share URL |
| `/api/share/{uuid}` | GET | Redirect to R2 presigned URL |

### 2.4 LibreOffice Conversion Service

```python
# services/libreoffice.py
import subprocess
import tempfile
import shutil
from pathlib import Path

SUPPORTED_PAIRS = {
    "docx": ["pdf", "odt", "rtf", "html", "txt"],
    "doc":  ["pdf", "docx", "odt", "txt"],
    "pptx": ["pdf", "odp"],
    "xlsx": ["pdf", "csv", "ods"],
    "odt":  ["pdf", "docx", "rtf"],
    "rtf":  ["pdf", "docx"],
    "html": ["pdf", "docx"],
}

def convert_with_libreoffice(input_path: str, target_format: str) -> str:
    output_dir = tempfile.mkdtemp()
    result = subprocess.run([
        "libreoffice", "--headless", "--convert-to", target_format,
        "--outdir", output_dir, input_path
    ], capture_output=True, text=True, timeout=120)
    
    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice failed: {result.stderr}")
    
    output_file = Path(output_dir) / (Path(input_path).stem + f".{target_format}")
    return str(output_file)
```

### 2.5 Conversion Routing Logic

```
Incoming conversion request
        │
        ▼
Is target format in LibreOffice SUPPORTED_PAIRS?
        │
   YES ─┤──── Queue RQ job ──── LibreOffice subprocess ──── Return file
        │
   NO ──┤
        ▼
Is it a PDF operation? ──── pdf2docx / reportlab / pdfminer
Is it image? ──────────── Pillow
Is it text format? ────── pypandoc
Is it Excel? ──────────── openpyxl
Is it PowerPoint? ─────── python-pptx
Is it AI-enhanced? ────── Claude API → then convert
```

### 2.6 Job Queue Setup

```python
# jobs/queue.py
from redis import Redis
from rq import Queue

redis_conn = Redis(host='localhost', port=6379)
conversion_queue = Queue('conversions', connection=redis_conn)
ai_queue = Queue('ai_jobs', connection=redis_conn)

# Start worker:
# rq worker conversions ai_jobs
```

### 2.7 Automatic File Cleanup

```python
# jobs/cleanup.py
from apscheduler.schedulers.background import BackgroundScheduler
import os, time, glob

def cleanup_old_files():
    threshold = time.time() - (30 * 60)  # 30 minutes
    for f in glob.glob("/tmp/docforge_*"):
        if os.path.getmtime(f) < threshold:
            os.remove(f)

scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_old_files, 'interval', minutes=10)
scheduler.start()
```

---

## Part 3 — Your Existing Scripts Integration

When you bring your existing scripts into this architecture:

1. **Place them in `backend/services/`** as individual Python modules
2. Each script becomes a function called by the conversion router
3. Wrap each in a try/except and return a standardized `ConversionResult` object:
   ```python
   @dataclass
   class ConversionResult:
       success: bool
       output_path: str | None
       error_message: str | None
       file_size_bytes: int | None
   ```
4. If your scripts write to a specific output path — update them to accept `output_dir` as a parameter so the cleanup job can find and delete their output

---

## Part 4 — SEO Assets

#### [NEW] public/sitemap.xml
Static sitemap for all 12+ tool pages + homepage. Replace `docforge.app` with your actual domain before deploying.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://docforge.app/</loc><priority>1.0</priority></url>
  <url><loc>https://docforge.app/compress-pdf</loc><priority>0.9</priority></url>
  <url><loc>https://docforge.app/pdf-to-word</loc><priority>0.9</priority></url>
  <url><loc>https://docforge.app/word-to-pdf</loc><priority>0.9</priority></url>
  <url><loc>https://docforge.app/merge-pdf</loc><priority>0.9</priority></url>
  <url><loc>https://docforge.app/split-pdf</loc><priority>0.9</priority></url>
  <url><loc>https://docforge.app/pdf-to-image</loc><priority>0.9</priority></url>
  <url><loc>https://docforge.app/image-converter</loc><priority>0.9</priority></url>
  <url><loc>https://docforge.app/image-compressor</loc><priority>0.8</priority></url>
  <url><loc>https://docforge.app/image-resizer</loc><priority>0.8</priority></url>
  <url><loc>https://docforge.app/text-to-pdf</loc><priority>0.8</priority></url>
  <url><loc>https://docforge.app/qr-generator</loc><priority>0.8</priority></url>
  <url><loc>https://docforge.app/smart-convert</loc><priority>0.9</priority></url>
  <url><loc>https://docforge.app/pipeline</loc><priority>0.7</priority></url>
</urlset>
```

#### [NEW] public/robots.txt
```
User-agent: *
Allow: /
Sitemap: https://docforge.app/sitemap.xml
```

---

## Complete Execution Order

| Step | Task | Layer | Files |
|---|---|---|---|
| 1 | Set up Hetzner server, install LibreOffice + Redis | Server | — |
| 2 | Install Python backend dependencies | Backend | `requirements.txt` |
| 3 | Build FastAPI skeleton + config | Backend | `main.py`, `config.py` |
| 4 | Build LibreOffice service wrapper | Backend | `services/libreoffice.py` |
| 5 | Integrate your existing scripts | Backend | `services/*.py` |
| 6 | Build remaining Python conversion services | Backend | `services/pdf_service.py`, etc. |
| 7 | Set up RQ job queue + worker | Backend | `jobs/queue.py`, `jobs/worker.py` |
| 8 | Build cleanup scheduler | Backend | `jobs/cleanup.py` |
| 9 | Build all API endpoints | Backend | `routers/convert.py`, etc. |
| 10 | Set up Cloudflare R2 + share endpoint | Backend | `utils/r2_client.py`, `routers/share.py` |
| 11 | Install frontend dependencies | Frontend | `package.json` |
| 12 | Fix project config | Frontend | `index.html`, `vite.config.js`, delete `App.css` |
| 13 | Build custom hooks | Frontend | `useFileProcessor.js`, `useJobPoller.js` |
| 14 | Build utility components | Frontend | `SEOHead.jsx`, `ScrollToTop.jsx`, `AdPlaceholder.jsx`, `LivePreview.jsx` |
| 15 | Rewrite App shell | Frontend | `main.jsx`, `App.jsx` |
| 16 | Create 5 missing standard pages | Frontend | `ImageCompressor`, `ImageResizer`, `DocxToPdf`, `TextToPdf`, `QrGenerator` |
| 17 | Build DocumentSurgery page | Frontend | `DocumentSurgery.jsx` |
| 18 | Build BatchCanvas component | Frontend | `BatchCanvas.jsx` |
| 19 | Build LivePreview component | Frontend | `LivePreview.jsx` |
| 20 | Build SmartConvert page | Frontend | `SmartConvert.jsx` |
| 21 | Build ConversionPipeline page | Frontend | `ConversionPipeline.jsx` |
| 22 | Build ShareableResult component | Frontend | `ShareableResult.jsx` |
| 23 | Create NotFound page | Frontend | `NotFound.jsx` |
| 24 | Add SEO assets | Frontend | `sitemap.xml`, `robots.txt` |
| 25 | Build + Lighthouse audit | Frontend | `npm run build` |
| 26 | Deploy backend with nginx reverse proxy | Server | `nginx.conf` |
| 27 | Deploy frontend build to server or Cloudflare Pages | Frontend | — |

---

## Full Tech Stack Summary

### Frontend
- React 18 + Vite
- React Router DOM
- pdf-lib, pdfjs-dist, mammoth, jsPDF, html2canvas, file-saver, qrcode, jszip, jspdf-autotable
- Existing 1030-line glassmorphic CSS design system

### Backend
- Python 3.11 + FastAPI + Uvicorn
- LibreOffice headless
- pdf2docx, python-docx, reportlab, Pillow, pypandoc, openpyxl, python-pptx, weasyprint, fpdf2
- Redis + RQ (job queue)
- APScheduler (cleanup)
- python-magic (MIME validation)
- boto3 (Cloudflare R2)
- anthropic (Claude API — for SmartConvert)

### Infrastructure
- Hetzner CX22 — $4.50/month
- Cloudflare R2 — Free (10GB, zero egress)
- Cloudflare (CDN + DNS) — Free

### Total Monthly Cost: ~$5–10

---

## Notes for Antigravity Prompting

When you move to building each section, structure your Antigravity prompts like this:

**For backend services:**
> "Write a FastAPI endpoint [describe exactly]. Use [specific library]. The function takes [input], returns [output as ConversionResult dataclass]. Handle these error cases: [list them]. Don't use any paid APIs."

**For frontend pages:**
> "Build a React page matching the existing glassmorphic dark theme. The page handles [file type]. It uploads to /api/convert with [parameters]. Polls /api/job/{id}/status every 1.5 seconds. Shows progress bar during processing. On complete, renders LivePreview component then download button."

**For the pipeline builder:**
> "Build a visual drag-and-drop pipeline builder using the existing design system. Each step card has a dropdown for conversion type and a settings panel. Pipeline serializes to a JSON array of step objects. Submit button POSTs the array to /api/pipeline."

---

## Antigravity 2.0 Multi-Agent Build Strategy

Antigravity 2.0 supports **parallel subagents** — meaning you don't have to build frontend then backend sequentially. Use this to your advantage.

### Parallel Agent Split

| Agent | Responsibility | Runs On |
|---|---|---|
| Agent A | Entire Python backend — FastAPI, services, queue, cleanup | Backend folder |
| Agent B | React frontend — all pages, hooks, components | Frontend folder |
| Agent C | DevOps — nginx config, deployment scripts, R2 setup | Root / server config |

Kick off Agent A and Agent B simultaneously after the architecture is decided. They don't depend on each other during build — only at integration time.

### Scheduled Task: Cleanup Job Testing

Use Antigravity 2.0's **Scheduled Tasks** feature to automate test runs of the cleanup job during development:

```
Every 5 minutes: run cleanup.py and log how many files were deleted
```

Set this up once and forget it. You'll know immediately if APScheduler is broken.

### ⚠️ Known Antigravity Model Label Bug

There is a documented issue where Antigravity's model selector labels don't always match the actual model running underneath. Before starting a complex task, verify the active model by asking the agent:

> "Which model are you currently using?"

If the answer doesn't match what you selected, switch and re-ask until it confirms correctly. Don't waste a 50-file generation on the wrong model.

---

*Plan Version 2.1 — Added Antigravity 2.0 multi-agent strategy, parallel build split, scheduled task automation, and model label warning. Previous additions: frontend, backend, LibreOffice integration, AI features, full library allocation.*
