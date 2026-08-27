import fs from 'fs';
import path from 'path';
import { pipeline, env } from '@xenova/transformers';
import { TOOLS, CATEGORIES } from '../src/utils/constants.js';

// 1. Configure transformers environment to use local models
env.allowLocalModels = true;
env.localModelPath = './public/models/';

// Synchronized Tool Synonyms for Rich RAG Matching
const TOOL_SYNONYMS = {
  'merge-pdf': ['merge', 'combine', 'join', 'stitch', 'bundle', 'concatenate', 'combine pdf', 'join pdfs', 'merge files'],
  'split-pdf': ['split', 'cut', 'divide', 'separate', 'extract pages', 'half', 'split in half', 'split by range'],
  'remove-pages': ['remove', 'delete', 'exclude', 'delete page', 'remove pages', 'drop pages', 'omit pages'],
  'extract-pages': ['extract', 'pull', 'isolate', 'extract pages', 'save pages', 'select pages'],
  'organize-pdf': ['organize', 'reorder', 'sort', 'drag pages', 'organize pages', 'arrange pages', 'grid view'],
  'scan-to-pdf': ['scan', 'camera', 'photo to pdf', 'scan document', 'capture camera', 'webcam scan'],
  'compress-pdf': ['compress', 'shrink', 'reduce size', 'minimize', 'lossless compression', 'lossy compression', 'smaller pdf'],
  'repair-pdf': ['repair', 'fix', 'recover', 'damaged pdf', 'corrupted pdf', 'broken xref', 'restore pdf'],
  'ocr-pdf': ['ocr', 'recognize', 'searchable', 'read text', 'extract text', 'text recognition', 'scanned to text'],
  'un-ocr-pdf': ['un-ocr', 'unocr', 'flatten', 'rasterize', 'flat pdf', 'prevent copy', 'unselectable text', 'flatten pages', 'strip text layer'],
  'bates-numbering': ['bates', 'bates numbering', 'legal stamp', 'trial exhibit', 'sequential numbering', 'court stamp', 'paginate legal'],
  'image-to-pdf': ['image to pdf', 'jpg to pdf', 'png to pdf', 'photos to pdf', 'pictures to pdf', 'images into pdf'],
  'docx-to-pdf': ['word to pdf', 'docx to pdf', 'convert docx', 'convert word', 'doc to pdf', 'doc to pdf converter'],
  'powerpoint-to-pdf': ['powerpoint to pdf', 'ppt to pdf', 'pptx to pdf', 'slides to pdf', 'presentation to pdf'],
  'excel-to-pdf': ['excel to pdf', 'xlsx to pdf', 'csv to pdf', 'sheet to pdf', 'spreadsheet to pdf', 'gridlines pdf'],
  'html-to-pdf': ['html to pdf', 'html', 'convert html', 'web to pdf', 'code to pdf', 'html page to pdf'],
  'pdf-to-image': ['pdf to image', 'pdf to images', 'pdf to jpg', 'pdf to png', 'pdf to photos', 'extract images from pdf'],
  'pdf-to-word': ['pdf to word', 'pdf to docx', 'to word', 'to docx', 'convert pdf to word', 'pdf to docx converter', 'editable word'],
  'pdf-to-powerpoint': ['pdf to powerpoint', 'pdf to ppt', 'to powerpoint', 'to ppt', 'convert pdf to powerpoint', 'pdf to ppt slides'],
  'pdf-to-excel': ['pdf to excel', 'pdf to sheet', 'to excel', 'to xlsx', 'pdf to xlsx', 'convert pdf to excel', 'extract tables to excel'],
  'pdf-to-pdfa': ['pdf to pdfa', 'archive pdf', 'pdf/a', 'iso archive', 'pdfa-1b', 'long term preservation', 'pdf to pdf/a'],
  'rotate-pdf': ['rotate', 'turn', 'spin', 'landscape', 'portrait', 'rotate pages', 'orient pages', 'spin landscape'],
  'add-page-numbers': ['page number', 'paginate', 'add page numbers', 'page numbering', 'footer numbers', 'number pages'],
  'add-watermark': ['watermark', 'stamp', 'add stamp', 'draft stamp', 'confidential watermark', 'logo watermark'],
  'crop-pdf': ['crop', 'trim', 'cut margins', 'crop pages', 'trim white borders', 'bleed margins'],
  'edit-pdf': ['edit', 'annotate', 'draw', 'add text', 'markup', 'shapes', 'vector edit', 'highlight text'],
  'pdf-forms': ['fill form', 'pdf form', 'form fields', 'acroform', 'export csv', 'import json', 'fill interactive forms'],
  'protect-pdf': ['protect', 'lock', 'encrypt', 'add password', 'restrict', 'aes password', 'password protect'],
  'unlock-pdf': ['unlock', 'decrypt', 'remove password', 'bypass lock', 'remove restriction', 'unlock protected pdf'],
  'sign-pdf': ['sign', 'signature', 'sign document', 'e-sign', 'digital signature', 'draw signature', 'x.509 sign'],
  'redact-pdf': ['redact', 'blackout', 'hide sensitive info', 'pii', 'scrub', 'mask confidential', 'luhn credit card', 'ssn blackout'],
  'compare-pdf': ['compare', 'diff pdf', 'compare documents', 'pixel heatmap', 'word diff', 'side by side compare', 'comparison slider'],
  'ai-summarizer': ['summarize', 'summary', 'highlights', 'bullet points', 'textrank', 'executive summary', 'condense paper', 'condense document'],
  'ai-translator': ['translate', 'translate file', 'language translation', 'offline translation', 'translate document'],
  'image-converter': ['convert image format', 'png to jpg', 'jpeg to webp', 'change format', 'image converter', 'convert images'],
  'image-compressor': ['compress image', 'shrink image', 'reduce image size', 'image compression'],
  'image-resizer': ['resize image', 'scale image', 'change dimensions', 'image resize'],
  'conversion-pipeline': ['pipeline', 'batch conversion', 'multi-step pipeline', 'workflow pipeline', 'conversion pipeline'],
  'text-to-pdf': ['text to pdf', 'txt to pdf', 'convert text', 'markdown to pdf', 'notes to pdf'],
  'qr-generator': ['qr', 'barcode', 'generate qr', 'custom qr code', 'embed url qr'],
  'unzip-file': ['unzip', 'extract zip', 'decompress', 'expand zip', 'unzip archive'],
  'url-to-pdf': ['url to pdf', 'convert website', 'website to pdf', 'save url to pdf', 'link to pdf'],
  'resume-builder': ['resume', 'cv', 'cv builder', 'resume builder', 'templates', 'cv templates', 'curriculum vitae'],
  'document-viewer': ['view', 'viewer', 'preview', 'read pdf', 'document viewer', 'open pdf']
};

// Clean dist/assets directory if it exists
try {
  const assetsPath = path.resolve('dist/assets');
  if (fs.existsSync(assetsPath)) {
    console.log('[RAG Indexer] Cleaning dist/assets...');
    fs.rmSync(assetsPath, { recursive: true, force: true });
  }
} catch (err) {
  console.warn('[RAG Indexer] Warning: could not clean dist/assets:', err.message);
}

console.log('[RAG Indexer] Starting comprehensive 100% Client-Side knowledge compilation...');

const chunks = [];

// 2. Parse FAQ items from LandingPage.jsx
try {
  const landingPath = path.resolve('src/components/LandingPage.jsx');
  const landingContent = fs.readFileSync(landingPath, 'utf-8');
  
  const faqRegex = /q:\s*['"`](.*?)['"`],\s*a:\s*['"`](.*?)['"`]/gs;
  let match;
  let faqCount = 0;
  
  while ((match = faqRegex.exec(landingContent)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    
    chunks.push({
      text: `Question: ${question}\nAnswer: ${answer}`,
      source: 'FAQ',
      metadata: { question, answer }
    });
    faqCount++;
  }
  console.log(`[RAG Indexer] Successfully parsed ${faqCount} FAQ items.`);
} catch (err) {
  console.error('[RAG Indexer] Failed to parse FAQs from LandingPage.jsx:', err.message);
}

// 3. Index all 44+ Tools with Synonyms directly from constants.js
let toolCount = 0;
for (const tool of TOOLS) {
  const cat = CATEGORIES.find(c => c.id === tool.category);
  const catTitle = cat ? cat.title : tool.category;
  const synonyms = TOOL_SYNONYMS[tool.id] || [];
  const synText = synonyms.length > 0 ? `\nAliases & Keywords: ${synonyms.join(', ')}` : '';
  
  chunks.push({
    text: `Tool: ${tool.title}\nCategory: ${catTitle}\nID: ${tool.id}\nPath: ${tool.path}\nDescription: ${tool.description}${synText}\nAccepted Formats: ${tool.accept || 'Various'}\nBatch Support: ${tool.multiple ? 'Supports multiple files batching' : 'Single file mode'}\nTier: ${tool.minTier ? tool.minTier.toUpperCase() : 'FREE'}\nHow to use: Launch from dashboard, visit ${tool.path}, drag onto the visual Stitch Canvas, or ask the AI assistant.`,
    source: 'Tool',
    metadata: {
      id: tool.id,
      title: tool.title,
      category: catTitle,
      path: tool.path,
      description: tool.description,
      minTier: tool.minTier || 'guest',
      synonyms: synonyms
    }
  });
  toolCount++;
}
console.log(`[RAG Indexer] Successfully indexed all ${toolCount} tools with rich synonyms.`);

// 4. Detailed 17 Resume Builder Templates Knowledge
const RESUME_TEMPLATES_INFO = [
  { name: 'Mariana', role: 'Executive Corporate Navy', desc: 'Modern deep navy layout tailored for C-suite, senior leadership, and executive corporate profiles.' },
  { name: 'Olivia', role: 'Warm Amber Editorial', desc: 'Warm amber editorial layout crafted for journalists, content strategists, authors, and creative writers.' },
  { name: 'Jonathan', role: 'Sleek Developer Slate', desc: 'Sleek dark slate minimalist layout optimized for software engineers, backend developers, and tech architects.' },
  { name: 'Emma', role: 'Creative Rosewood Serif', desc: 'Creative rosewood serif layout with elegant typography for art directors, UI/UX designers, and visual artists.' },
  { name: 'Charles', role: 'Steel Executive', desc: 'Corporate steel gray template tailored for finance directors, management consultants, and project managers.' },
  { name: 'Kathleen', role: 'Lavender Academic', desc: 'Soft lavender academic CV format designed for researchers, PhD candidates, professors, and scholars.' },
  { name: 'Richard', role: 'Classic Business Indigo', desc: 'Indigo classic layout for business development, sales executives, operations, and enterprise marketing.' },
  { name: 'Sanchez Dark', role: 'Charcoal Grid Compact', desc: 'Charcoal-themed layout with high-density content grids for technical specialists with extensive skill matrices.' },
  { name: 'Wilson Light', role: 'Classical Editorial Light', desc: 'Elegant light layout with crisp, clean classical typography for legal, banking, and consulting professionals.' },
  { name: 'Sanchez Mono', role: 'Developer Monospace Timeline', desc: 'Clean monospace coding developer layout featuring an ASCII-style timeline ideal for DevOps, full-stack devs, and open-source contributors.' },
  { name: 'Sanchez Wave', role: 'Pacific Wave Blue', desc: 'Pacific blue template featuring a wave-pattern header for digital marketers, product managers, and founders.' },
  { name: 'Ong Burgundy', role: 'Plum Burgundy Premium', desc: 'Rich plum luxury header layout for luxury brand managers, creative directors, and high-end agency consultants.' },
  { name: 'Schumacher Charcoal', role: 'Minimalist Charcoal Stone', desc: 'Charcoal minimal builder with clean, structured margins for architects, industrial designers, and engineers.' },
  { name: 'Ziv Olive', role: 'Forest Olive Organic', desc: 'Organic forest olive layout for environmental consultants, sustainability managers, and landscape architects.' },
  { name: 'Adora Diagonal', role: 'Teal Creative Diagonal', desc: 'Teal creative layout featuring dynamic diagonal accents for advertising, media planners, and growth leads.' },
  { name: 'Wilson Minimal', role: 'Ultra-Clean Minimalist', desc: 'Ultra-clean layout stripped of heavy lines or visual clutter for modern tech startups and product designers.' },
  { name: 'Alvarado Slate', role: 'Split Column Slate', desc: 'Geometric slate-gray layout with split block columns for multi-disciplinary specialists.' }
];

for (const tmpl of RESUME_TEMPLATES_INFO) {
  chunks.push({
    text: `Resume Template: ${tmpl.name} (${tmpl.role})\nDescription: ${tmpl.desc}\nKeywords: ${tmpl.name.toLowerCase()} resume, ${tmpl.role.toLowerCase()}, cv template\nHow to use: Open the Resume Builder at /resume-builder, select the "${tmpl.name}" template from the 3D coverflow carousel or template switcher, fill in your profile sections, and export a print-ready A4 PDF locally.`,
    source: 'Resume Template',
    metadata: { id: 'resume-builder', templateName: tmpl.name, role: tmpl.role, path: '/resume-builder' }
  });
}
console.log(`[RAG Indexer] Injected ${RESUME_TEMPLATES_INFO.length} resume template knowledge chunks.`);

// 5. Exhaustive Platform, Canvas, Security, and Intelligence Knowledge Chunks
const DEEP_KNOWLEDGE = [
  // --- STITCH CANVAS WORKSPACE & ADVANCED DAG MECHANICS ---
  {
    text: "Stitch Canvas Overview: The Stitch Canvas is DocForge's visual node-based workflow studio (located at /canvas or the Workspace tab). It allows users to build multi-step document pipelines by dragging files, dropping operator nodes (like Merge, OCR, Compress, Convert, Sign), connecting them with interactive bezier cables, and executing entire workflows locally in the browser with zero cloud latency.",
    source: "Stitch Canvas Overview",
    metadata: { id: 'conversion-pipeline', path: '/canvas' }
  },
  {
    text: "Canvas Viewport Navigation and Pan/Zoom: To pan the viewport, click and drag anywhere on the empty canvas dot-grid (or use a two-finger touchpad scroll). To zoom in and out, hold Ctrl while scrolling the mouse wheel, use a pinch gesture, or click the Zoom in (+) / Zoom out (-) buttons in the bottom-right toolbar. You can also click 'Fit to Screen' to center all nodes or 'Reset Viewport' to return to 100% zoom.",
    source: "Canvas Navigation",
    metadata: { path: '/canvas' }
  },
  {
    text: "Canvas Direct Manipulation and Card Selection: You can click and drag any document card or operator node across the canvas to position it on the grid. Click a card to select it. To select multiple cards, hold Shift or Meta/Ctrl while clicking, or hold Shift and drag on the canvas background to draw a marquee selection box. Press Ctrl+A to select all cards on the canvas.",
    source: "Canvas Selection",
    metadata: { path: '/canvas' }
  },
  {
    text: "How to Connect Nodes with Cables: To connect cards, click and drag from the circular output port dot on the right side of a document or operator card, and drag the glowing bezier cable to the circular input port dot on the left side of another operator card. When you release, the connection will snap in place and turn active.",
    source: "Canvas Cable Connections",
    metadata: { path: '/canvas' }
  },
  {
    text: "How to Disconnect or Delete Cables: To remove a connection wire, click the red trash/delete icon on the cable, or select the operator node and press Delete or Backspace. You can also drag the cable away from the port to detach it.",
    source: "Canvas Cable Disconnect",
    metadata: { path: '/canvas' }
  },
  {
    text: "Auto-Healing Incompatible Pipelines: If you connect a file type that an operator cannot directly process (for example, connecting a Word DOCX file into a Merge PDF tool), the canvas automatically inserts the necessary conversion node (like Word to PDF) between them, ensuring your workflow executes smoothly without manual conversion steps.",
    source: "Canvas Auto-Healing",
    metadata: { path: '/canvas' }
  },
  {
    text: "Incremental PDF Merge: When merging PDFs on the canvas, DocForge utilizes smart incremental merging. If you append additional documents to an existing merge pipeline, only the newly attached bytes are processed, making subsequent merges instant without reprocessing the entire document from scratch.",
    source: "Canvas Incremental Merge",
    metadata: { id: 'merge-pdf', path: '/canvas' }
  },
  {
    text: "Condition Router and Decision Branching: The Condition Router node (condition-router) allows you to split document workflows based on logical rules (such as page count > 10, file size, or text content). It features dual output ports: a green 'True' output and an amber 'False' output, routing files down different pipeline branches automatically.",
    source: "Canvas Condition Router",
    metadata: { path: '/canvas' }
  },
  {
    text: "Workflow Recipes and Presets: The 'Recipes' dropdown in the top canvas toolbar provides instant pre-configured workflow blueprints: (1) Contract & Legal Prep: Redact PII -> Convert to PDF/A archive -> Digital Signature; (2) Document Assembly: Merge multiple files -> Add page numbers -> Compress; (3) Legal Discovery Bates Stamp: Apply sequential Bates numbering -> Compress; (4) Financial Invoice Batch: PDF to Excel extraction; (5) Academic Draft Prep: Word to PDF -> Watermark -> Page numbers; (6) Secure Long-Term Archive: Password encrypt -> PDF/A-1b.",
    source: "Canvas Recipes",
    metadata: { path: '/canvas' }
  },
  {
    text: "Sharing Canvas Flows via URL: Click the 'Share Flow' button in the top canvas toolbar to encode your active pipeline (operators, parameters, and layout coordinates) into a URL hash (#flow=...). Anyone opening the link will instantly load the exact visual workflow blueprint on their canvas.",
    source: "Canvas Share Flow",
    metadata: { path: '/canvas' }
  },
  {
    text: "Export and Import Workflow Blueprints: You can save your custom canvas pipelines by opening the Canvas Menu (top left) and clicking 'Export Workflow' to download a JSON file. To restore a workflow later or load a template from a colleague, click 'Import Workflow' and select your JSON file.",
    source: "Canvas Export Import",
    metadata: { path: '/canvas' }
  },
  {
    text: "Canvas Natural Language Command Bar and Slash Commands: The bottom-center search bar allows you to build and control pipelines using plain English prompts (e.g., 'merge file A and file B, then compress to 60%'). You can also use slash commands: '/merge' (combine selected files), '/compress' (reduce file size), '/split' (divide into parts), '/ocr' (run text recognition), and '/clear' (wipe the canvas).",
    source: "Canvas Commands",
    metadata: { path: '/canvas' }
  },
  {
    text: "Canvas Keyboard Shortcuts Matrix: Key shortcuts include: Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo), Ctrl+A (Select all nodes), Delete / Backspace (Delete selected nodes/cables), Escape (Close focus studios or cancel drag), Arrow keys (Navigate focus between cards), Enter/Space (Open focused card), Shift+Drag (Marquee box selection), and Ctrl+Scroll (Zoom in/out).",
    source: "Canvas Keyboard Shortcuts",
    metadata: { path: '/canvas' }
  },
  {
    text: "Auto-fit Viewport Toggle: Located in the top canvas header, the Auto-fit Viewport toggle (viewfinder icon) locks your viewport position so adding new nodes or executing pipelines will not unexpectedly zoom out or shift your viewing position.",
    source: "Canvas Auto-fit",
    metadata: { path: '/canvas' }
  },
  {
    text: "Arrange Grid Layout: Clicking the 'Arrange Grid' button in the top canvas toolbar automatically organizes and spaces all document cards and operator nodes in an optimal topological left-to-right hierarchy, cleaning up messy or overlapping cables.",
    source: "Canvas Arrange Grid",
    metadata: { path: '/canvas' }
  },
  {
    text: "Canvas Activity Logs Panel: Located at the bottom-left of the canvas, the Activity Logs panel provides real-time logs of every pipeline event, node execution, timing metrics, and download status updates.",
    source: "Canvas Activity Logs",
    metadata: { path: '/canvas' }
  },
  {
    text: "Quick Tools Right Dock: The floating toolbar on the right side of the canvas provides one-click access to all 44+ document transformation tools. Hovering over the dock expands tool names (Merge, Split, Compress, Word to PDF, PDF to Word, OCR, Sign, Image Converter, QR Generator, etc.). Clicking any tool automatically spawns and connects it to your currently selected documents.",
    source: "Canvas Quick Tools",
    metadata: { path: '/canvas' }
  },

  // --- FULLSCREEN FOCUS STUDIOS ---
  {
    text: "Organize Studio: Fullscreen interactive page management workspace. Allows visual thumbnail reordering via drag-and-drop, individual page rotation (90°, 180°, 270°), page duplication, and selective page deletion before exporting.",
    source: "Focus Studio Organize",
    metadata: { id: 'organize-pdf', toolId: 'organize-pdf', path: '/organize-pdf' }
  },
  {
    text: "Redact Studio: Fullscreen security suite offering 4 redaction workflows: (1) Auto PII Detection with Luhn-verified Credit Card and SSN detection; (2) Text Search & Blackout; (3) Manual Coordinate Box Drawing; (4) Forensic Metadata & Attachment Sanitization stripping author names, creation timestamps, and GPS EXIF data.",
    source: "Focus Studio Redact",
    metadata: { id: 'redact-pdf', toolId: 'redact-pdf', path: '/redact-pdf' }
  },
  {
    text: "Sign Studio: Interactive digital signing studio. Supports drawing vector canvas signatures with stroke smoothing, typing typed text signatures with custom cursive fonts, uploading PNG stamp signatures, and embedding cryptographically verifiable X.509 digital certificates.",
    source: "Focus Studio Sign",
    metadata: { id: 'sign-pdf', toolId: 'sign-pdf', path: '/sign-pdf' }
  },
  {
    text: "Compare Studio: Visual and semantic PDF comparison studio featuring 4 view modes: (1) Side-by-Side Synchronized Scroll; (2) Swipe Split Divider with interactive drag handle; (3) Pixel Delta Heatmap highlighting added pixels in cyan and removed pixels in magenta; (4) Semantic Word-by-Word Diff displaying exact character and word insertions/deletions with similarity percentage calculation.",
    source: "Focus Studio Compare",
    metadata: { id: 'compare-pdf', toolId: 'compare-pdf', path: '/compare-pdf' }
  },
  {
    text: "Edit Studio: Direct PDF markup and vector annotation studio. Allows adding text boxes with custom typography, drawing freehand lines, highlighting paragraphs, inserting geometric shapes (rectangles, circles, arrows), and flattening annotations into the document.",
    source: "Focus Studio Edit",
    metadata: { id: 'edit-pdf', toolId: 'edit-pdf', path: '/edit-pdf' }
  },
  {
    text: "Crop Studio: Visual page margin trimming workspace with interactive bounding box handles, aspect ratio locking, and multi-page batch cropping.",
    source: "Focus Studio Crop",
    metadata: { id: 'crop-pdf', toolId: 'crop-pdf', path: '/crop-pdf' }
  },
  {
    text: "PdfForms Studio: Interactive AcroForm builder and form data manager. Allows filling existing text fields and checkboxes, exporting form submissions to CSV spreadsheets, and auto-filling multiple documents via JSON schema import.",
    source: "Focus Studio Forms",
    metadata: { id: 'pdf-forms', toolId: 'pdf-forms', path: '/pdf-forms' }
  },

  // --- PRIVACY, SECURITY & CRYPTOGRAPHY ---
  {
    text: "100% Local First Privacy Architecture and Data Security: Is my document data secure and private? Yes, DocForge executes all document processing, conversions, OCR, compression, and visual editing locally in your browser using WebAssembly (WASM), Web Workers, and WebGPU. Your files and data are NEVER uploaded to third-party cloud servers or telemetry trackers, ensuring strict GDPR, HIPAA, and corporate confidentiality compliance.",
    source: "Privacy Guarantee",
    metadata: { path: '/privacy' }
  },
  {
    text: "Offline & Air-Gapped Functionality: After initial page load, you can disconnect your internet connection and continue using all core features—including PDF merging, splitting, compressing, OCR, Word/Excel conversions, CV builder, and the visual Stitch Canvas—completely offline.",
    source: "Offline Mode",
    metadata: { path: '/privacy' }
  },
  {
    text: "Supported File Formats: DocForge supports PDF (.pdf), Microsoft Word (.docx, .doc), Microsoft Excel (.xlsx, .xls, .csv), Microsoft PowerPoint (.pptx, .ppt), Text (.txt, .md), HTML (.html, .htm), Images (.png, .jpg, .jpeg, .webp, .bmp, .tiff, .svg), and Archive packages (.zip).",
    source: "Supported Formats",
    metadata: { path: '/workspace' }
  },
  {
    text: "Tauri Desktop Application: DocForge is available as a native desktop application powered by Tauri v2. It includes PyInstaller-compiled sidecar backends for heavy document operations and local SQLite database sandbox.",
    source: "Desktop App",
    metadata: { path: '/workspace' }
  },
  {
    text: "4-Layer Silent PDF Decryption Pipeline: When unlocking password-protected PDFs at /unlock-pdf, DocForge runs an intelligent 4-layer auto-bypass solver before prompting the user: (1) Database Hash Lookup for DocForge-created locks; (2) Empty/Owner-only password check; (3) 500+ common word dictionary attack; (4) Heuristic stem candidate generator based on filename and date metadata.",
    source: "Security Unlock Pipeline",
    metadata: { id: 'unlock-pdf', path: '/unlock-pdf' }
  },
  {
    text: "Cryptographic X.509 Digital Signatures: DocForge supports pyHanko-compatible cryptographic X.509 signature sealing. Users can generate instant self-signed certificate seals or upload corporate PKCS#12 (.p12/.pfx) certificate keys with SHA-256 digests for legally compliant digital document verification.",
    source: "Security Digital Signatures",
    metadata: { id: 'sign-pdf', path: '/sign-pdf' }
  },
  {
    text: "Forensic PDF Metadata Sanitization: When using the Metadata Sanitizer or Redact tool, DocForge cryptographically purges all document metadata streams: Title, Author, Subject, Keywords, Creator tool, Producer library, CreationDate, ModDate, XMP namespaces, and embedded PDF attachments.",
    source: "Security Metadata Scrubbing",
    metadata: { id: 'redact-pdf', path: '/redact-pdf' }
  },

  // --- COMPRESSION, OCR & OPTIMIZATION PARAMETERS ---
  {
    text: "Lossless vs Lossy PDF Compression: Lossless mode (recommended) cleans internal object streams, flattens redundant xref tables, and strips unreferenced font glyphs without degrading visual image DPI. Lossy mode recompresses embedded images to target JPEG quality levels (e.g. 65% quality) and downsamples high-res DPI (150/72 DPI) for maximum file size reduction up to 85%.",
    source: "Compression Guide",
    metadata: { id: 'compress-pdf', path: '/compress-pdf' }
  },
  {
    text: "Optical Character Recognition (OCR) Engine: DocForge's OCR engine converts scanned PDF pages and photos into searchable, selectable text. It detects text boxes, runs neural character recognition via WebAssembly SIMD or ONNX models, and renders an invisible, selectable text layer exactly aligned over the source image.",
    source: "OCR Guide",
    metadata: { id: 'ocr-pdf', path: '/ocr-pdf' }
  },
  {
    text: "Un-OCR Document Flattening: The Un-OCR tool (/un-ocr-pdf) renders each page of a PDF as a crisp, high-resolution raster image (up to 300 DPI) and strips all selectable text layers, hyperlinks, form fields, and vector annotations. This prevents recipients from copying text or inspecting hidden document layers.",
    source: "Un-OCR Guide",
    metadata: { id: 'un-ocr-pdf', path: '/un-ocr-pdf' }
  },
  {
    text: "Bates Numbering for Legal Discovery: The Bates Numbering tool (/bates-numbering) applies sequential alphanumeric identification numbers (e.g. 'CONF-000001', 'DOC-000452') across document pages with customizable prefix, suffix, digit padding, position (top-right, bottom-center, etc.), and font sizes for legal trial exhibits.",
    source: "Bates Numbering Guide",
    metadata: { id: 'bates-numbering', path: '/bates-numbering' }
  },

  // --- FORMAT CONVERSIONS & COMPATIBILITY ---
  {
    text: "Office Document Conversions: DocForge converts Microsoft Word (.docx, .doc), Excel (.xlsx, .xls, .csv), and PowerPoint (.pptx, .ppt) to PDF directly. For Excel, tables are converted with preserved gridlines and auto-fit column widths. For PowerPoint, slide dimensions (16:9 widescreen or 4:3 standard) are faithfully retained.",
    source: "Office Conversions",
    metadata: { id: 'docx-to-pdf', path: '/docx-to-pdf' }
  },
  {
    text: "PDF to Excel Structure Extraction: The PDF to Excel converter extracts tabular structures, data grids, and numbers from PDF financial reports and invoices, calculating cell coordinate boundaries to compile clean .xlsx spreadsheets.",
    source: "PDF to Excel",
    metadata: { id: 'pdf-to-excel', path: '/pdf-to-excel' }
  },
  {
    text: "PDF/A Archival Conversion: The PDF to PDF/A tool (/pdf-to-pdfa) converts standard PDFs into ISO-compliant PDF/A-1b and PDF/A-2b formats, embedding all fonts, defining color profiles (DeviceRGB/DeviceCMYK), and removing device-dependent features for 30+ year long-term digital preservation.",
    source: "PDF/A Archiving",
    metadata: { id: 'pdf-to-pdfa', path: '/pdf-to-pdfa' }
  },
  {
    text: "Image Format Conversions: The Image Converter (/image-converter) supports bidirectional conversions between PNG, JPEG, WEBP, BMP, and SVG formats, with controls for image quality, transparent background preservation, and batch conversion.",
    source: "Image Converter",
    metadata: { id: 'image-converter', path: '/image-converter' }
  },

  // --- TIERS, LIMITS & PRICING ---
  {
    text: "Account Tiers and File Size Limits: (1) Guest: Process files up to 10MB, single-file operations, basic tools; (2) Free Account: Process files up to 100MB, 5 parallel queue slots, Canvas workflows up to 10 nodes, OCR text extraction; (3) Pro Tier ($9/mo): Process files up to 1GB (10GB+ via chunked memory streaming), 50 parallel queue slots, unlimited canvas nodes, X.509 digital certificates, and priority batch operations.",
    source: "Pricing & Tiers",
    metadata: { id: 'pricing', path: '/pricing' }
  },

  // --- TROUBLESHOOTING & COMMON ISSUES ---
  {
    text: "Troubleshooting Stuck or Slow Conversions: If a conversion takes longer than expected: (1) Ensure your file does not exceed your plan's memory limit; (2) For scanned documents with many images, running OCR or compression may take 10-30 seconds depending on CPU power; (3) Check that your browser has WebAssembly and Web Workers enabled; (4) Try closing background browser tabs to free up RAM.",
    source: "Troubleshooting Stuck Operations",
    metadata: { path: '/workspace' }
  },
  {
    text: "How to Fix Corrupted or Broken PDFs: If a PDF fails to open or throws syntax errors in Adobe Acrobat, upload it to the Repair PDF tool (/repair-pdf). DocForge rebuilds the PDF cross-reference (xref) table, repairs damaged trailer dictionaries, and recovers intact page streams.",
    source: "Troubleshooting Repair PDF",
    metadata: { id: 'repair-pdf', path: '/repair-pdf' }
  }
];

for (const info of DEEP_KNOWLEDGE) {
  chunks.push({
    text: info.text,
    source: info.source,
    metadata: info.metadata || {}
  });
}
console.log(`[RAG Indexer] Injected ${DEEP_KNOWLEDGE.length} deep platform & canvas knowledge chunks.`);
console.log(`[RAG Indexer] Total knowledge chunks compiled: ${chunks.length}`);

// 6. Generate Vector Embeddings using local all-MiniLM-L6-v2 ONNX Model
async function generateIndex() {
  try {
    console.log('[RAG Indexer] Loading feature-extraction pipeline...');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    console.log(`[RAG Indexer] Generating embeddings for ${chunks.length} chunks...`);
    const compiledIndex = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      process.stdout.write(`Processing chunk ${i + 1}/${chunks.length}\r`);
      
      const output = await extractor(chunk.text, { pooling: 'mean', normalize: true });
      const vector = Array.from(output.data);
      
      compiledIndex.push({
        text: chunk.text,
        source: chunk.source,
        vector: vector,
        metadata: chunk.metadata
      });
    }
    
    console.log('\n[RAG Indexer] Embedding generation completed successfully.');
    
    // Save strictly to canonical public/models/website_knowledge.json
    const outputPathModels = path.resolve('public/models/website_knowledge.json');
    
    const outputDir = path.dirname(outputPathModels);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const jsonStr = JSON.stringify(compiledIndex, null, 2);
    fs.writeFileSync(outputPathModels, jsonStr);
    
    console.log(`[RAG Indexer] Index saved to canonical path: ${outputPathModels}`);
    console.log(`[RAG Indexer] File size: ${(fs.statSync(outputPathModels).size / 1024).toFixed(2)} KB`);
    
  } catch (err) {
    console.error('[RAG Indexer] Error generating embeddings:', err);
    process.exit(1);
  }
}

generateIndex();
