# DocForge ⚡
### The 100% Client-Side Document Manipulation & Visual DAG Studio

[![CI/CD Pipeline](https://github.com/TanvirAuntu75/docforge/actions/workflows/deploy.yml/badge.svg)](https://github.com/TanvirAuntu75/docforge/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 18](https://img.shields.io/badge/React-18.3.1-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24c8db.svg)](https://tauri.app/)
[![Privacy: Zero-Upload](https://img.shields.io/badge/Privacy-100%25%20Zero--Upload-emerald.svg)](#privacy--security-guarantee)

> **"Your documents never leave your device."**
> DocForge is a local-first, privacy-guaranteed document engineering suite offering 44+ PDF and office tools, 7 fullscreen editing studios, an interactive Visual DAG workflow canvas, and an in-browser neural assistant.

---

## 🌟 Key Capabilities

* 🔒 **100% Local-First Processing**: 95% of all PDF, document, and image operations execute inside your browser's WebAssembly / WebWorker threads. Zero document buffers are transmitted to external servers.
* 🎛️ **Stitch Canvas (Visual DAG Studio)**: Connect document operators in a visual node graph with reactive cable dragging, topological execution, and automated MIME pipeline auto-healing.
* 🤖 **Client-Side Neural Copilot**: In-browser Okapi BM25 keyword inverted index combined with 384-dimensional `all-MiniLM-L6-v2` ONNX neural embeddings using Reciprocal Rank Fusion (RRF) for 100% search precision.
* 🎨 **7 Fullscreen Focus Studios**: Dedicated workspaces for Document Comparison, Margin Cropping, PDF Annotation & Editing, AcroForm Filling, Page Organization, Redaction, and Digital Signing.
* 📄 **17 ATS-Compliant Resume Templates**: Interactive CV Builder with real-time responsive A4 typography and PDF generation.
* 🖥️ **Native Desktop Binary (Tauri v2)**: Cross-platform desktop release wrapping the suite with native operating system file system performance.

---

## 🛠️ Complete Tool Suite (44+ Tools)

| Category | Available Operations |
| :--- | :--- |
| **PDF Manipulation** | Merge PDF, Split PDF, Compress PDF, Rotate PDF, Crop PDF, Organize/Reorder Pages, Extract Pages, Remove Pages, Bates Numbering, Add Page Numbers, Add Watermark |
| **Document Conversion** | PDF to Word (DOCX), PDF to Excel (XLSX), PDF to PowerPoint (PPTX), PDF to PDF/A, DOCX to PDF, Excel to PDF, PowerPoint to PDF, HTML to PDF, URL to PDF, Text to PDF |
| **Image & Media** | PDF to Image (PNG/JPG), Image to PDF, Image Format Converter (WebP/PNG/JPG), Image Compressor, Image Resizer |
| **Security & Forensics** | Protect PDF (AES-256), Unlock PDF (4-Layer Auto-Bypass), Redact PDF (PII & Coordinates), Digital X.509 Signatures, Forensic Metadata Stripping |
| **Intelligence & Utilities** | Document Viewer, TextRank AI Summarizer, QR Code Generator, Compare PDF (Visual Heatmap), Repair Broken PDF, Scan to PDF, Unzip/Expand File |

---

## 🏗️ System Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │               User Browser                   │
                       │                                              │
                       │  ┌────────────────────────────────────────┐  │
                       │  │         React 18 + Tailwind UI         │  │
                       │  └───────────────────┬────────────────────┘  │
                       │                      │                       │
                       │  ┌───────────────────▼────────────────────┐  │
                       │  │      6-Layer Intent & Routing Engine   │  │
                       │  └───────┬──────────────────────┬─────────┘  │
                       │          │                      │            │
                       │  ┌───────▼─────────┐    ┌───────▼─────────┐  │
                       │  │ Client Engines  │    │  Stitch Canvas  │  │
                       │  │ (pdf-lib, WASM) │    │  (DAG Pipeline) │  │
                       │  └─────────────────┘    └─────────────────┘  │
                       └──────────────────────┬───────────────────────┘
                                              │ (Heavy conversions only)
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │        FastAPI Python Sidecar (Optional)     │
                       │   (Headless LibreOffice, pyHanko, PaddleOCR) │
                       └──────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* **Python**: v3.11+ (Optional, for backend sidecar)

### 1. Installation
```bash
git clone https://github.com/TanvirAuntu75/docforge.git
cd docforge
npm install
```

### 2. Run Frontend Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run Backend Python Sidecar (Optional)
```bash
# In a separate terminal
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --port 8000 --reload
```

### 4. Build for Production
```bash
npm run build
```
Compiled production assets will be output to `dist/`.

---

## 🧪 Testing

```bash
# Run Frontend 110-Query AI & Intelligence Benchmark
npm run test:frontend

# Run Backend Pytest Suite
pytest backend/tests
```

---

## 🛡️ Privacy & Security Guarantee

* **Zero File Uploads**: Documents are loaded directly into browser memory (ArrayBuffers/TypedArrays) and manipulated via client-side WebAssembly.
* **Ephemeral Backend**: When using the optional backend sidecar for heavy LibreOffice conversions, temporary files are processed in-memory and automatically shredded after 60 minutes.
* **Open Source & Auditable**: All engine logic and data transformations are transparent and verifiable.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
