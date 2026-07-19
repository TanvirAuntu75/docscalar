import fs from 'fs';
import path from 'path';
import { pipeline, env } from '@xenova/transformers';

// 1. Configure transformers environment to use local models
env.allowLocalModels = true;
env.localModelPath = './public/models/';

// Clean dist/assets directory to prevent stale files, but avoid dist/models to bypass ENOTEMPTY errors on Windows
try {
  const assetsPath = path.resolve('dist/assets');
  if (fs.existsSync(assetsPath)) {
    console.log('[RAG Indexer] Cleaning dist/assets...');
    fs.rmSync(assetsPath, { recursive: true, force: true });
  }
} catch (err) {
  console.warn('[RAG Indexer] Warning: could not clean dist/assets:', err.message);
}

console.log('[RAG Indexer] Starting knowledge compilation...');

const chunks = [];

// 2. Parse FAQ items from LandingPage.jsx
try {
  const landingPath = path.resolve('src/components/LandingPage.jsx');
  const landingContent = fs.readFileSync(landingPath, 'utf-8');
  
  // Matches q: '...' and a: '...' (supporting both single and double quotes)
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

// 3. Parse Tool descriptions from constants.js
try {
  const constantsPath = path.resolve('src/utils/constants.js');
  const constantsContent = fs.readFileSync(constantsPath, 'utf-8');
  
  // Matches id, title, and description keys lazily
  const toolRegex = /id:\s*['"]([^'"]+)['"][\s\S]*?title:\s*['"]([^'"]+)['"][\s\S]*?description:\s*['"]([^'"]+)['"]/g;
  let match;
  let toolCount = 0;
  
  while ((match = toolRegex.exec(constantsContent)) !== null) {
    const id = match[1].trim();
    const title = match[2].trim();
    const description = match[3].trim();
    
    // Ignore categories mapping or helper categories if any
    if (id === 'organize-pdf' || id === 'optimize-pdf' || id === 'convert-to-pdf' || id === 'convert-from-pdf') {
      continue;
    }
    
    chunks.push({
      text: `Tool: ${title}\nDescription: ${description}\nHow to use: You can run this tool by clicking it in the dashboard or typing a command like "${title.toLowerCase()}".`,
      source: 'Tool',
      metadata: { id, title, description }
    });
    toolCount++;
  }
  console.log(`[RAG Indexer] Successfully parsed ${toolCount} tools.`);
} catch (err) {
  console.error('[RAG Indexer] Failed to parse tools from constants.js:', err.message);
}

// 4. Inject general site capabilities & architectural details
const GENERAL_INFO = [
  {
    text: "Privacy, Security & GDPR compliance: All document processing, editing, conversions, and tools in DocForge run 100% locally in your web browser. No files are uploaded to third-party or remote servers. All data remains strictly on your local machine, ensuring absolute compliance and safety.",
    source: "General Security"
  },
  {
    text: "Local Compute Capability & Internet Requirements: DocForge works completely Local Compute after the initial page load. You can fully disconnect your internet and continue using all features, including local PDF splitting/merging, CV builder, On Device AI translations, and local file viewer.",
    source: "General Client Side"
  },
  {
    text: "Pricing Plans & Upgrades: The Free Tier includes support for files up to 50MB, up to 3 parallel file queue slots, basic Client Side PDF tools, standard OCR, and canvas pipelines up to 5 nodes. The Pro Tier is $9/month and unlocks files up to 1GB (10GB+ via chunked uploads), 50 parallel queue slots, X.509 digital signing, unlimited nodes in Stitch Canvas, and On Device AI translation.",
    source: "General Pricing"
  },
  {
    text: "Tauri Desktop Application: DocForge is available as a native desktop application powered by Tauri v2. It includes PyInstaller-compiled sidecar backends for heavy document operations and local SQLite database sandbox.",
    source: "General Desktop"
  },
  {
    text: "Stitch Canvas Workflow: The Stitch Canvas is a Miro style visual interface (at the /canvas route) where you can build document processing pipelines by connecting files to operation nodes and auto-executing them.",
    source: "General Canvas"
  },
  {
    text: "Focus Studio Canvas Overlay: Focus Studio is an interactive, fullscreen editor overlay that launches when you execute interactive tools like Organize, Redact, Sign, Compare, Edit, Crop, and FormFill on the canvas. It allows you to visually rearrange pages, draw signatures, draw blackout rectangles, or edit text vectors before committing.",
    source: "Focus Studio"
  },
  {
    text: "Canvas Keyboard Shortcuts: Press 'Ctrl + Z' to Undo, 'Ctrl + Y' to Redo, and 'Escape' to close focus studios or popups. You can also type natural language commands like 'undo' or 'redo' directly into the top search bar.",
    source: "Canvas Shortcuts"
  },
  {
    text: "Auto-fit Viewport Zoom Setting: Located next to the theme toggle, the Auto-fit Viewport setting keeps the canvas zoom level locked still as you navigate, preventing the canvas from automatically zooming out when new nodes are added.",
    source: "Canvas Zoom"
  },
  {
    text: "Word to PDF Client Side Conversion: Use the Word to PDF converter tool to transform DOCX files into PDF documents. It runs Client Side using docx-preview to parse and render DOCX formatting, generating high-fidelity page-by-page PDF documents.",
    source: "Word to PDF"
  },
  {
    text: "Excel to PDF Client Side Conversion: Use the Excel to PDF tool to convert spreadsheet files into PDF documents. It parses XLSX cells using read-excel-file and compiles them into clean, auto-wrapped PDF tables with landscape orientation auto-switching.",
    source: "Excel to PDF"
  },
  {
    text: "PowerPoint to PDF Client Side Conversion: Use the PowerPoint to PDF tool to convert slide presentations into PDF documents. It maps slides to landscape HTML layouts and prints them directly to PDF canvas sheets.",
    source: "PowerPoint to PDF"
  },
  {
    text: "OCR PDF Client Side text detection: OCR PDF detects text in scanned documents or images Client Side using a Client Side quantized PaddleOCR engine running in a Web Worker (WebGPU/WASM fallback), overlaying searchable text transparently over the pages.",
    source: "OCR PDF"
  },
  {
    text: "Un-OCR PDF (Flatten PDF): Un-OCR PDF rasterizes PDF pages to high-resolution JPEGs to completely strip out copyable text layers, form fields, and metadata for maximum document security.",
    source: "Un-OCR PDF"
  },
  {
    text: "Resume/CV Builder: The CV Builder allows you to create professional resumes from predefined layout grids. The preview features a locked A4 container with dynamic ResizeObserver scaling and Zoom controls (Fit Page, Fit Width, 75%, 100%, 125%) to prevent scrollbars.",
    source: "CV Builder"
  },
  {
    text: "Document Viewer Previewer: The Document Viewer is a Client Side multi-format previewer for PDF, DOCX, XLSX, PPTX, TXT, CSV, Markdown, ZIP, code, and images. It features retina High-DPI support scaling by devicePixelRatio for crisp text.",
    source: "Document Viewer"
  },
  {
    text: "Client Side vs Server Side processing: Standard operations (like split, merge, rotate, watermark, page-numbering, formatting, basic conversions) run 100% Client Side in the browser. Heavy operations (like pyHanko X.509 signatures, Playwright URL rendering, complex layouts parsing) are routed to the local backend sidecar.",
    source: "Processing Mode"
  }
];

for (const info of GENERAL_INFO) {
  chunks.push({
    text: info.text,
    source: info.source,
    metadata: {}
  });
}
console.log(`[RAG Indexer] Injected ${GENERAL_INFO.length} general information chunks.`);

// 5. Generate Vector Embeddings using local all-MiniLM-L6-v2 ONNX Model
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
    
    console.log('\n[RAG Indexer] Embedding generation completed.');
    
    // Save to public/models/
    const outputPath = path.resolve('public/models/website_knowledge.json');
    
    // Ensure parent directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(compiledIndex, null, 2));
    console.log(`[RAG Indexer] Index successfully saved to: ${outputPath}`);
    console.log(`[RAG Indexer] Output file size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    
  } catch (err) {
    console.error('[RAG Indexer] Error generating embeddings:', err);
    process.exit(1);
  }
}

generateIndex();
