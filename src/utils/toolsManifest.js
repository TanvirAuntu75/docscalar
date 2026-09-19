/**
 * DocScalar Tools Manifest & Graph Type Registry
 *
 * CANONICAL SINGLE SOURCE OF TRUTH for:
 * 1. Tool capabilities, accepted extensions, cardinality bounds.
 * 2. Typed output contracts (e.g. flat PDF vs Archive of PDFs vs Archive of Images).
 * 3. Shortest-path BFS conversion solver (findConversionPath) for format auto-healing.
 * 4. NLP synonyms and parameter factories.
 */

export const TOOLS_MANIFEST = {
  'merge-pdf': {
    id: 'merge-pdf',
    name: 'Merge PDF',
    accept: ['.pdf'],
    minInputs: 2,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['merge', 'combine', 'join', 'stitch', 'bundle', 'concatenate', 'merge pdf', 'combine pdfs'],
    defaultParams: {},
    errorMsg: 'Merge PDF requires at least 2 PDF files.'
  },
  'split-pdf': {
    id: 'split-pdf',
    name: 'Split PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 1,
    outExt: '.zip',
    outputType: { type: 'archive', contains: 'pdf' },
    synonyms: ['split', 'cut', 'divide', 'separate', 'half', 'split pdf', 'split document'],
    defaultParams: { mode: 'parts', parts: 2 },
    destructive: true,
    errorMsg: 'Split PDF requires exactly 1 PDF file.'
  },
  'compress-pdf': {
    id: 'compress-pdf',
    name: 'Compress PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['compress', 'shrink', 'reduce size', 'minimize', 'compress pdf', 'make smaller', 'optimize size'],
    defaultParams: { quality: 0.65, mode: 'lossless' },
    destructive: true,
    errorMsg: 'Compress PDF requires at least 1 PDF file.'
  },
  'rotate-pdf': {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['rotate', 'turn', 'spin', 'landscape', 'portrait', 'rotate pdf', 'orient', 'rotate clockwise'],
    defaultParams: { angle: 90 },
    errorMsg: 'Rotate PDF requires at least 1 PDF file.'
  },
  'docx-to-pdf': {
    id: 'docx-to-pdf',
    name: 'Word to PDF',
    accept: ['.docx', '.doc'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['word to pdf', 'docx to pdf', 'convert docx', 'convert word', 'word document to pdf', 'doc to pdf'],
    defaultParams: {},
    errorMsg: 'Word to PDF requires at least 1 Word file (.docx, .doc).'
  },
  'image-to-pdf': {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    accept: ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['image to pdf', 'images to pdf', 'photos to pdf', 'pictures to pdf', 'jpg to pdf', 'png to pdf', 'jpeg to pdf', 'convert images to pdf'],
    defaultParams: {},
    errorMsg: 'Image to PDF requires at least 1 image file.'
  },
  'image-compressor': {
    id: 'image-compressor',
    name: 'Image Compressor',
    accept: ['.png', '.jpg', '.jpeg', '.webp'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.png',
    outputType: { type: 'file', format: 'image' },
    synonyms: ['compress image', 'shrink image', 'reduce image size', 'image compression', 'optimize image'],
    defaultParams: { quality: 0.75 },
    destructive: true,
    errorMsg: 'Image Compressor requires at least 1 image file.'
  },
  'image-converter': {
    id: 'image-converter',
    name: 'Image Converter',
    accept: ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.png',
    outputType: { type: 'file', format: 'image' },
    synonyms: ['convert image format', 'png to jpg', 'jpeg to webp', 'change image format', 'image format', 'convert to png', 'convert to jpg', 'convert image'],
    defaultParams: { format: 'png' },
    errorMsg: 'Image Converter requires at least 1 image file.'
  },
  'image-resizer': {
    id: 'image-resizer',
    name: 'Image Resizer',
    accept: ['.png', '.jpg', '.jpeg', '.webp'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.png',
    outputType: { type: 'file', format: 'image' },
    synonyms: ['resize image', 'scale image', 'change dimensions', 'resize dimensions', 'image dimensions'],
    defaultParams: { width: 800, height: 600, maintainAspect: true },
    errorMsg: 'Image Resizer requires at least 1 image file.'
  },
  'ocr-pdf': {
    id: 'ocr-pdf',
    name: 'OCR PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['ocr', 'recognize text', 'make searchable', 'read text', 'extract text', 'searchable pdf', 'text recognition'],
    defaultParams: { language: 'eng' },
    errorMsg: 'OCR PDF requires at least 1 PDF file.'
  },
  'un-ocr-pdf': {
    id: 'un-ocr-pdf',
    name: 'Un-OCR PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['un-ocr', 'unocr', 'flatten', 'rasterize', 'make non-searchable', 'remove text layer', 'flat pdf', 'prevent copy', 'unselectable text'],
    defaultParams: { scale: 2.0 },
    errorMsg: 'Un-OCR PDF requires at least 1 PDF file.'
  },
  'text-to-pdf': {
    id: 'text-to-pdf',
    name: 'Text to PDF',
    accept: ['.txt', '.md'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['text to pdf', 'txt to pdf', 'convert text', 'notes to pdf', 'md to pdf', 'markdown to pdf'],
    defaultParams: { fontSize: 12, lineSpacing: 1.5 },
    errorMsg: 'Text to PDF requires at least 1 Text file (.txt, .md).'
  },
  'add-watermark': {
    id: 'add-watermark',
    name: 'Add Watermark',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['watermark', 'stamp', 'confidential stamp', 'draft stamp', 'add watermark', 'watermark pdf'],
    defaultParams: { text: 'CONFIDENTIAL', opacity: 0.3, fontSize: 48, color: '#ff0000', rotation: 45 },
    errorMsg: 'Add Watermark requires at least 1 PDF file.'
  },
  'add-page-numbers': {
    id: 'add-page-numbers',
    name: 'Add Page Numbers',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['page numbers', 'paginate', 'number pages', 'add numbering', 'pagination', 'add page numbers'],
    defaultParams: { position: 'bottom-right', format: 'Page {n} of {total}', fontSize: 10, startPage: 1 },
    errorMsg: 'Add Page Numbers requires at least 1 PDF file.'
  },
  'remove-pages': {
    id: 'remove-pages',
    name: 'Remove Pages',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['remove pages', 'delete pages', 'drop pages', 'remove page', 'delete page', 'purge pages'],
    defaultParams: { pages: '' },
    destructive: true,
    errorMsg: 'Remove Pages requires at least 1 PDF file.'
  },
  'extract-pages': {
    id: 'extract-pages',
    name: 'Extract Pages',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['extract page', 'select page', 'extract pages', 'pull pages', 'isolate pages'],
    defaultParams: { pages: '' },
    errorMsg: 'Extract Pages requires at least 1 PDF file.'
  },
  'organize-pdf': {
    id: 'organize-pdf',
    name: 'Organize PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 1,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['organize', 'reorder pages', 'arrange pages', 'organize pdf', 'page order', 'rearrange'],
    defaultParams: { pageConfigs: [] },
    needsStudio: true,
    errorMsg: 'Organize PDF requires exactly 1 PDF file.'
  },
  'crop-pdf': {
    id: 'crop-pdf',
    name: 'Crop PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['crop', 'trim margins', 'cut borders', 'crop pdf', 'trim page', 'white borders'],
    defaultParams: { cropBox: null },
    needsStudio: true,
    errorMsg: 'Crop PDF requires at least 1 PDF file.'
  },
  'edit-pdf': {
    id: 'edit-pdf',
    name: 'Edit PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['edit pdf', 'annotate', 'markup', 'draw on pdf', 'add text to pdf', 'highlight pdf'],
    defaultParams: { overlays: [] },
    needsStudio: true,
    errorMsg: 'Edit PDF requires at least 1 PDF file.'
  },
  'pdf-forms': {
    id: 'pdf-forms',
    name: 'Fill PDF Forms',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['fill form', 'pdf form', 'form fields', 'acroform', 'fill out pdf', 'form filler', 'complete form'],
    defaultParams: { fieldValues: {} },
    needsStudio: true,
    errorMsg: 'Fill PDF Forms requires at least 1 PDF file.'
  },
  'sign-pdf': {
    id: 'sign-pdf',
    name: 'Sign PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['sign', 'signature', 'sign document', 'sign pdf', 'digital signature', 'autograph'],
    defaultParams: { sigOptions: {} },
    needsStudio: true,
    errorMsg: 'Sign PDF requires at least 1 PDF file.'
  },
  'repair-pdf': {
    id: 'repair-pdf',
    name: 'Repair PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['repair', 'fix pdf', 'restore pdf', 'recover pdf', 'corrupted pdf', 'damaged pdf', 'unreadable pdf'],
    defaultParams: {},
    errorMsg: 'Repair PDF requires at least 1 PDF file.'
  },
  'qr-generator': {
    id: 'qr-generator',
    name: 'QR Generator',
    accept: [],
    minInputs: 0,
    maxInputs: 0,
    outExt: '.png',
    outputType: { type: 'file', format: 'image' },
    synonyms: ['qr', 'qr code', 'generate qr', 'create qr code', 'barcode', 'qr generator'],
    defaultParams: { text: 'https://docscalar.com', size: 300, errorCorrection: 'M' },
    errorMsg: 'QR Generator does not require input files.'
  },
  'excel-to-pdf': {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    accept: ['.xlsx', '.xls', '.csv'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['excel to pdf', 'xlsx to pdf', 'csv to pdf', 'sheet to pdf', 'convert spreadsheet to pdf'],
    defaultParams: {},
    errorMsg: 'Excel to PDF requires at least 1 Excel file (.xlsx, .xls, .csv).'
  },
  'powerpoint-to-pdf': {
    id: 'powerpoint-to-pdf',
    name: 'PPT to PDF',
    accept: ['.pptx', '.ppt'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['powerpoint to pdf', 'ppt to pdf', 'pptx to pdf', 'slides to pdf', 'convert presentation to pdf'],
    defaultParams: {},
    errorMsg: 'PowerPoint to PDF requires at least 1 PowerPoint file (.pptx, .ppt).'
  },
  'html-to-pdf': {
    id: 'html-to-pdf',
    name: 'HTML to PDF',
    accept: ['.html', '.htm'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['html to pdf', 'convert html to pdf', 'web to pdf', 'convert web to pdf', 'html file to pdf'],
    defaultParams: {},
    errorMsg: 'HTML to PDF requires at least 1 HTML file (.html, .htm).'
  },
  'pdf-to-word': {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.docx',
    outputType: { type: 'file', format: 'docx' },
    synonyms: ['pdf to word', 'pdf to docx', 'to word', 'to docx', 'pdf to doc', 'convert pdf to docx', 'export word'],
    defaultParams: {},
    errorMsg: 'PDF to Word requires at least 1 PDF file.'
  },
  'pdf-to-excel': {
    id: 'pdf-to-excel',
    name: 'PDF to Excel',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.xlsx',
    outputType: { type: 'file', format: 'xlsx' },
    synonyms: ['pdf to excel', 'pdf to sheet', 'to excel', 'to xlsx', 'pdf to xlsx', 'convert pdf to excel', 'pdf table to spreadsheet'],
    defaultParams: {},
    errorMsg: 'PDF to Excel requires at least 1 PDF file.'
  },
  'pdf-to-powerpoint': {
    id: 'pdf-to-powerpoint',
    name: 'PDF to PPT',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pptx',
    outputType: { type: 'file', format: 'pptx' },
    synonyms: ['pdf to powerpoint', 'pdf to ppt', 'to powerpoint', 'to ppt', 'convert pdf to powerpoint', 'slides export'],
    defaultParams: {},
    errorMsg: 'PDF to PowerPoint requires at least 1 PDF file.'
  },
  'pdf-to-image': {
    id: 'pdf-to-image',
    name: 'PDF to Image',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.zip',
    outputType: { type: 'archive', contains: 'image' },
    synonyms: ['pdf to image', 'pdf to images', 'pdf to jpg', 'pdf to png', 'pdf to pictures', 'pdf to photos', 'extract images from pdf'],
    defaultParams: { format: 'png' },
    errorMsg: 'PDF to Image requires at least 1 PDF file.'
  },
  'ai-translator': {
    id: 'ai-translator',
    name: 'AI Translator',
    accept: ['.pdf', '.txt', '.md', '.docx'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['translate', 'translate file', 'language translation', 'translate document', 'multilingual translator'],
    defaultParams: { target_language: 'Bengali' },
    errorMsg: 'AI Translator requires at least 1 document file.'
  },
  'ai-summarizer': {
    id: 'ai-summarizer',
    name: 'AI Summarizer',
    accept: ['.pdf', '.docx', '.txt', '.md'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.md',
    outputType: { type: 'file', format: 'markdown' },
    synonyms: ['summarize', 'summary', 'ai summary', 'condense', 'executive summary', 'highlights', 'bullet summary', 'key takeaways'],
    defaultParams: { mode: 'highlights', max_bullets: 5 },
    errorMsg: 'AI Summarizer requires at least 1 document file.'
  },
  'unzip-file': {
    id: 'unzip-file',
    name: 'Extract ZIP',
    accept: ['.zip'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.*',
    outputType: { type: 'extracted', contains: 'any' },
    synonyms: ['unzip', 'decompress', 'extract zip', 'uncompress', 'open zip', 'unpack archive'],
    defaultParams: {},
    errorMsg: 'Unzip/Expand File requires at least 1 ZIP archive.'
  },
  'protect-pdf': {
    id: 'protect-pdf',
    name: 'Protect PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['protect', 'lock', 'encrypt', 'add password', 'restrict', 'secure pdf', 'password protect'],
    defaultParams: { password: '', permissions: { print: true, copy: true, modify: false } },
    destructive: true,
    errorMsg: 'Protect PDF requires at least 1 PDF file.'
  },
  'unlock-pdf': {
    id: 'unlock-pdf',
    name: 'Unlock PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['unlock', 'decrypt', 'remove password', 'bypass lock', 'drm', 'restriction', 'remove restriction', 'remove restrictions', 'strip security', 'strip the security', 'remove security', 'strip password', 'unprotect'],
    defaultParams: { password: '' },
    errorMsg: 'Unlock PDF requires at least 1 PDF file.'
  },
  'redact-pdf': {
    id: 'redact-pdf',
    name: 'Redact PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['redact', 'blackout', 'hide information', 'sanitize pdf', 'censor', 'remove pii', 'redaction'],
    defaultParams: { boxes: [], redactions: [], patterns: [] },
    needsStudio: true,
    errorMsg: 'Redact PDF requires at least 1 PDF file.'
  },
  'compare-pdf': {
    id: 'compare-pdf',
    name: 'Compare PDF',
    accept: ['.pdf'],
    minInputs: 2,
    maxInputs: 2,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['compare', 'diff', 'difference', 'compare documents', 'compare pdf', 'side by side diff'],
    defaultParams: { diffMode: 'highlight' },
    needsStudio: true,
    errorMsg: 'Compare PDF requires exactly 2 PDF files.'
  },
  'pdf-to-pdfa': {
    id: 'pdf-to-pdfa',
    name: 'PDF to PDF/A',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['pdf/a', 'pdf to pdfa', 'archive format', 'iso standard pdf', 'long term archival'],
    defaultParams: { conformance: '2b' },
    errorMsg: 'PDF to PDF/A requires at least 1 PDF file.'
  },
  'url-to-pdf': {
    id: 'url-to-pdf',
    name: 'URL to PDF',
    accept: [],
    minInputs: 0,
    maxInputs: 0,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['url to pdf', 'webpage to pdf', 'convert website', 'save url', 'snapshot url'],
    defaultParams: { url: 'https://example.com' },
    errorMsg: 'URL to PDF does not require input files.'
  },
  'bates-numbering': {
    id: 'bates-numbering',
    name: 'Bates Numbering',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['bates numbering', 'legal numbering', 'index stamp', 'case numbering', 'bates stamp'],
    defaultParams: { prefix: 'CONF-', suffix: '', digits: 6, startNumber: 1, position: 'bottom-right' },
    errorMsg: 'Bates Numbering requires at least 1 PDF file.'
  },
  'condition-router': {
    id: 'condition-router',
    name: 'Condition Router',
    accept: ['.pdf', '.docx', '.xlsx', '.png', '.jpg'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['condition', 'branch', 'if condition', 'router', 'rule', 'filter document'],
    defaultParams: { ruleType: 'pageCount', operator: '>', thresholdValue: 5 },
    errorMsg: 'Condition Router requires at least 1 input document.'
  },

  // ── Special Workspace Virtual Tools ──────────────
  'scan-to-pdf': {
    id: 'scan-to-pdf',
    name: 'Scan to PDF',
    accept: [],
    minInputs: 0,
    maxInputs: 0,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['scan', 'scanner', 'camera to pdf', 'scan document'],
    defaultParams: {},
    errorMsg: 'Scan to PDF accesses camera input directly.'
  },
  'conversion-pipeline': {
    id: 'conversion-pipeline',
    name: 'Conversion Pipeline',
    accept: ['.pdf', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.txt'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['pipeline', 'batch convert', 'multi convert', 'conversion pipeline'],
    defaultParams: {},
    errorMsg: 'Conversion Pipeline requires at least 1 document.'
  },
  'resume-builder': {
    id: 'resume-builder',
    name: 'Resume Builder',
    accept: [],
    minInputs: 0,
    maxInputs: 0,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['resume', 'cv builder', 'cv maker', 'curriculum vitae', 'resume generator'],
    defaultParams: {},
    errorMsg: 'Resume Builder creates documents from form templates.'
  },
  'document-viewer': {
    id: 'document-viewer',
    name: 'Document Viewer',
    accept: ['.pdf', '.docx', '.xlsx', '.txt'],
    minInputs: 1,
    maxInputs: 1,
    outExt: '.pdf',
    outputType: { type: 'file', format: 'pdf' },
    synonyms: ['view pdf', 'preview document', 'read pdf', 'document reader'],
    defaultParams: {},
    errorMsg: 'Document Viewer requires 1 document to display.'
  }
};

/**
 * Derives the TOOL_VALIDATION object used by StitchCanvas drag-and-drop & wire validation.
 */
export function getToolValidation() {
  const validation = {};
  for (const [toolId, meta] of Object.entries(TOOLS_MANIFEST)) {
    validation[toolId] = {
      accept: meta.accept,
      minInputs: meta.minInputs,
      maxInputs: meta.maxInputs,
      outExt: meta.outExt,
      errorMsg: meta.errorMsg
    };
  }
  return validation;
}

/**
 * Derives the TOOL_REGISTRY object used by canvasBrain heuristics and DAG scheduling.
 */
export function getToolRegistry() {
  const registry = {};
  for (const [toolId, meta] of Object.entries(TOOLS_MANIFEST)) {
    registry[toolId] = {
      name: meta.name,
      accept: meta.accept,
      minInputs: meta.minInputs,
      maxInputs: meta.maxInputs,
      outExt: meta.outExt,
      outputType: meta.outputType,
      synonyms: meta.synonyms,
      defaultParams: meta.defaultParams,
      destructive: meta.destructive,
      needsStudio: meta.needsStudio
    };
  }
  return registry;
}

/**
 * Returns canonical file extension from filename or mime type.
 */
export function normalizeExtension(fileNameOrExt) {
  if (!fileNameOrExt) return '';
  // Strip URL query parameters and hash anchors if present
  const clean = String(fileNameOrExt).trim().split('?')[0].split('#')[0].toLowerCase();
  if (clean.startsWith('.')) return clean;
  const parts = clean.split('.');
  if (parts.length > 1) return '.' + parts.pop();
  return '.' + clean;
}

/**
 * Resolves standard format category from an extension.
 */
export function getFormatCategory(ext) {
  const e = normalizeExtension(ext);
  if (['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tiff'].includes(e)) return 'image';
  if (['.docx', '.doc'].includes(e)) return 'docx';
  if (['.xlsx', '.xls', '.csv'].includes(e)) return 'excel';
  if (['.pptx', '.ppt'].includes(e)) return 'powerpoint';
  if (['.html', '.htm'].includes(e)) return 'html';
  if (['.txt', '.md'].includes(e)) return 'text';
  if (e === '.pdf') return 'pdf';
  if (e === '.zip') return 'archive';
  return 'unknown';
}

/**
 * Directed conversion graph used by BFS path solver.
 * Maps: fromFormat -> Array of { toolId, toFormat }
 */
const CONVERSION_EDGES = [
  // Document / Image -> PDF
  { from: 'docx', to: 'pdf', toolId: 'docx-to-pdf' },
  { from: 'excel', to: 'pdf', toolId: 'excel-to-pdf' },
  { from: 'powerpoint', to: 'pdf', toolId: 'powerpoint-to-pdf' },
  { from: 'html', to: 'pdf', toolId: 'html-to-pdf' },
  { from: 'text', to: 'pdf', toolId: 'text-to-pdf' },
  { from: 'image', to: 'pdf', toolId: 'image-to-pdf' },

  // PDF -> Export formats
  { from: 'pdf', to: 'docx', toolId: 'pdf-to-word' },
  { from: 'pdf', to: 'excel', toolId: 'pdf-to-excel' },
  { from: 'pdf', to: 'powerpoint', toolId: 'pdf-to-powerpoint' },
  { from: 'pdf', to: 'image-archive', toolId: 'pdf-to-image' },

  // Archive unpacking
  { from: 'archive-pdf', to: 'pdf', toolId: 'unzip-file' },
  { from: 'archive-image', to: 'image', toolId: 'unzip-file' },
  { from: 'archive', to: 'any', toolId: 'unzip-file' },

  // Image internal conversions
  { from: 'image', to: 'image', toolId: 'image-converter' }
];

/**
 * Breadth-First-Search (BFS) shortest-path auto-healer across converter tools.
 * Returns an array of tool IDs to sequentially inject, or null if no valid path exists.
 *
 * Examples:
 *   findConversionPath('.docx', 'compress-pdf') -> ['docx-to-pdf']
 *   findConversionPath('.zip' (containing pdf), 'compress-pdf') -> ['unzip-file']
 *   findConversionPath('.zip' (containing image), 'compress-pdf') -> ['unzip-file', 'image-to-pdf']
 *   findConversionPath('.png', 'pdf-to-word') -> ['image-to-pdf', 'pdf-to-word'] (if allowed) or ['image-to-pdf']
 *
 * @param {string|Object} sourceInput - file extension (e.g. '.docx') or typed output descriptor
 * @param {string} targetToolId - target operator tool ID (e.g. 'compress-pdf')
 * @returns {string[]|null} Ordered list of tool IDs to inject
 */
export function findConversionPath(sourceInput, targetToolId) {
  const targetMeta = TOOLS_MANIFEST[targetToolId];
  if (!targetMeta) return null;

  // Resolve starting format
  let startFormat = 'unknown';
  if (typeof sourceInput === 'string') {
    const ext = normalizeExtension(sourceInput);
    startFormat = getFormatCategory(ext);
  } else if (sourceInput && typeof sourceInput === 'object') {
    if (sourceInput.type === 'archive') {
      if (sourceInput.contains === 'pdf') startFormat = 'archive-pdf';
      else if (sourceInput.contains === 'image') startFormat = 'archive-image';
      else startFormat = 'archive';
    } else if (sourceInput.type === 'file') {
      startFormat = sourceInput.format || 'unknown';
    } else if (sourceInput.type === 'extracted') {
      startFormat = sourceInput.contains || 'unknown';
    }
  }

  if (startFormat === 'unknown') return null;

  // Direct check: does target accept this starting format directly?
  const acceptsDirectly = targetMeta.accept.some(acc => {
    if (acc === 'image/*') return startFormat === 'image';
    return getFormatCategory(acc) === startFormat;
  });
  if (acceptsDirectly) return [];

  // Goal check helper
  const satisfiesTarget = (currentFormat) => {
    return targetMeta.accept.some(acc => {
      if (acc === 'image/*') return currentFormat === 'image';
      return getFormatCategory(acc) === currentFormat;
    });
  };

  // Direct special cases for instant resolution:
  if (targetMeta.accept.includes('.pdf')) {
    if (startFormat === 'docx') return ['docx-to-pdf'];
    if (startFormat === 'excel') return ['excel-to-pdf'];
    if (startFormat === 'powerpoint') return ['powerpoint-to-pdf'];
    if (startFormat === 'html') return ['html-to-pdf'];
    if (startFormat === 'text') return ['text-to-pdf'];
    if (startFormat === 'image') return ['image-to-pdf'];
    if (startFormat === 'archive-pdf') return ['unzip-file'];
    if (startFormat === 'archive-image') return ['unzip-file', 'image-to-pdf'];
    if (startFormat === 'archive') return ['unzip-file'];
  }

  // BFS Queue: [ { currentFormat, path: [toolId, ...] } ]
  const queue = [{ currentFormat: startFormat, path: [] }];
  const visited = new Set([startFormat]);

  while (queue.length > 0) {
    const { currentFormat, path } = queue.shift();

    if (satisfiesTarget(currentFormat) && path.length > 0) {
      return path;
    }

    if (path.length >= 3) continue; // Cap conversion depth to 3 steps

    // Find outgoing edges
    for (const edge of CONVERSION_EDGES) {
      let matches = false;
      if (edge.from === currentFormat) matches = true;
      else if (edge.from === 'archive' && currentFormat.startsWith('archive')) matches = true;

      if (matches) {
        let nextFormat = edge.to;
        if (nextFormat === 'any') {
          // Unpack archive based on inner contents if known
          if (currentFormat === 'archive-pdf') nextFormat = 'pdf';
          else if (currentFormat === 'archive-image') nextFormat = 'image';
          else nextFormat = 'pdf'; // standard fallback
        }

        const visitKey = `${nextFormat}`;
        if (!visited.has(visitKey)) {
          visited.add(visitKey);
          queue.push({
            currentFormat: nextFormat,
            path: [...path, edge.toolId]
          });
        }
      }
    }
  }

  return null;
}
