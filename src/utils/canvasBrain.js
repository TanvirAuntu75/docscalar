/**
 * DocForge Canvas Brain Engine
 * 
 * Implements:
 * 1. Local First Rule-Based Semantic NLP Command Classifier.
 * 2. Layered DAG Layout Optimization & Force-Directed Spring Relaxation.
 * 3. Self-Healing Connection Diagnostics & Automatic Converter Pipeline Injector.
 */

import { predictIntent, predictIntentAsync } from './classifier.js';

// 1. Tool Metadata Registry
export const TOOL_REGISTRY = {
  'merge-pdf': {
    name: 'Merge PDF',
    accept: ['.pdf'],
    minInputs: 2,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['merge', 'combine', 'join', 'stitch', 'bundle', 'concatenate'],
    defaultParams: {}
  },
  'split-pdf': {
    name: 'Split PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 1,
    outExt: '.zip',
    synonyms: ['split', 'cut', 'divide', 'separate', 'extract pages', 'half'],
    defaultParams: { mode: 'parts', parts: 2 },
    destructive: true
  },
  'compress-pdf': {
    name: 'Compress PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['compress', 'shrink', 'reduce size', 'minimize'],
    defaultParams: { quality: 0.65, mode: 'lossless' },
    destructive: true
  },
  'ocr-pdf': {
    name: 'OCR PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['ocr', 'recognize', 'searchable', 'read text', 'extract text'],
    defaultParams: { language: 'eng' }
  },
  'un-ocr-pdf': {
    name: 'Un-OCR PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['un-ocr', 'unocr', 'flatten', 'rasterize', 'make non-searchable', 'remove text layer', 'flat pdf', 'prevent copy', 'unselectable text'],
    defaultParams: { scale: 2.0 }
  },
  'rotate-pdf': {
    name: 'Rotate PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['rotate', 'turn', 'spin', 'landscape', 'portrait'],
    defaultParams: { angle: 90 }
  },
  'protect-pdf': {
    name: 'Protect PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['protect', 'lock', 'encrypt', 'add password', 'restrict'],
    defaultParams: { password: '', permissions: { print: true, copy: true, modify: false } },
    destructive: true
  },
  'unlock-pdf': {
    name: 'Unlock PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['unlock', 'decrypt', 'remove password', 'bypass lock', 'drm', 'restriction', 'remove restriction', 'remove restrictions'],
    defaultParams: { password: '' }
  },
  'docx-to-pdf': {
    name: 'Docx to PDF',
    accept: ['.docx', '.doc'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['word to pdf', 'docx to pdf', 'convert docx', 'convert word'],
    defaultParams: {}
  },
  'excel-to-pdf': {
    name: 'Excel to PDF',
    accept: ['.xlsx', '.xls', '.csv'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['excel to pdf', 'xlsx to pdf', 'csv to pdf', 'sheet to pdf'],
    defaultParams: {}
  },
  'powerpoint-to-pdf': {
    name: 'PPT to PDF',
    accept: ['.pptx', '.ppt'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['powerpoint to pdf', 'ppt to pdf', 'pptx to pdf', 'slides to pdf'],
    defaultParams: {}
  },
  'html-to-pdf': {
    name: 'HTML to PDF',
    accept: ['.html', '.htm'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['html to pdf', 'html', 'convert html', 'web to pdf'],
    defaultParams: {}
  },
  'pdf-to-word': {
    name: 'PDF to Word',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.docx',
    synonyms: ['pdf to word', 'pdf to docx', 'to word', 'to docx', 'convert pdf to word'],
    defaultParams: {}
  },
  'pdf-to-excel': {
    name: 'PDF to Excel',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.xlsx',
    synonyms: ['pdf to excel', 'pdf to sheet', 'to excel', 'to xlsx', 'pdf to xlsx', 'convert pdf to excel'],
    defaultParams: {}
  },
  'pdf-to-powerpoint': {
    name: 'PDF to PowerPoint',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pptx',
    synonyms: ['pdf to powerpoint', 'pdf to ppt', 'to powerpoint', 'to ppt', 'convert pdf to powerpoint'],
    defaultParams: {}
  },
  'image-converter': {
    name: 'Image Converter',
    accept: ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.png',
    synonyms: ['convert image format', 'png to jpg', 'jpeg to webp', 'change format', 'image format'],
    defaultParams: { format: 'png' }
  },
  'image-to-pdf': {
    name: 'Image to PDF',
    accept: ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.zip'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['images to pdf', 'photos to pdf', 'pictures to pdf', 'image to pdf', 'jpg to pdf', 'png to pdf'],
    defaultParams: {}
  },
  'image-compressor': {
    name: 'Image Compressor',
    accept: ['.png', '.jpg', '.jpeg', '.webp'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.jpg',
    synonyms: ['compress image', 'shrink image', 'reduce image size'],
    defaultParams: { quality: 0.7 }
  },
  'image-resizer': {
    name: 'Image Resizer',
    accept: ['.png', '.jpg', '.jpeg', '.webp'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.png',
    synonyms: ['resize image', 'scale image', 'change dimensions'],
    defaultParams: { percentage: 75, mode: 'percentage', width: 800, height: 600 }
  },
  'unzip-file': {
    name: 'Extract ZIP',
    accept: ['.zip'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['unzip', 'extract zip', 'decompress', 'expand zip'],
    defaultParams: {}
  },
  'add-watermark': {
    name: 'Add Watermark',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['watermark', 'stamp', 'add stamp'],
    defaultParams: { text: 'CONFIDENTIAL', opacity: 0.5, angle: 45 }
  },
  'add-page-numbers': {
    name: 'Add Page Numbers',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['page number', 'paginate', 'add page numbers'],
    defaultParams: { format: 'Page {n} of {total}', position: 'bottom-right' }
  },
  'remove-pages': {
    name: 'Remove Pages',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['remove page', 'delete page', 'exclude page'],
    defaultParams: { range: '' },
    destructive: true
  },
  'crop-pdf': {
    name: 'Crop PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['crop'],
    defaultParams: { xPercent: 0.1, yPercent: 0.1, widthPercent: 0.8, heightPercent: 0.8 },
    destructive: true,
    needsStudio: true
  },
  'edit-pdf': {
    name: 'Edit PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['edit', 'annotate', 'mark up pdf'],
    defaultParams: { overlays: [] },
    needsStudio: true
  },
  'qr-generator': {
    name: 'QR Generator',
    accept: [],
    minInputs: 0,
    maxInputs: 0,
    outExt: '.png',
    synonyms: ['qr', 'barcode', 'generate qr'],
    defaultParams: { text: 'https://docforge.app' }
  },
  'redact-pdf': {
    name: 'Redact PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['redact', 'blackout', 'hide sensitive info'],
    defaultParams: { textPatterns: [] },
    needsStudio: true
  },
  'compare-pdf': {
    name: 'Compare PDF',
    accept: ['.pdf'],
    minInputs: 2,
    maxInputs: 2,
    outExt: '.pdf',
    synonyms: ['compare', 'diff pdf', 'compare documents'],
    defaultParams: {},
    needsStudio: true
  },
  'pdf-to-pdfa': {
    name: 'PDF to PDF/A',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['pdf to pdfa', 'archive pdf', 'pdf/a'],
    defaultParams: {}
  },
  'url-to-pdf': {
    name: 'URL to PDF',
    accept: [],
    minInputs: 0,
    maxInputs: 0,
    outExt: '.pdf',
    synonyms: ['url to pdf', 'convert website', 'website to pdf'],
    defaultParams: { url: 'https://example.com' }
  },
  'bates-numbering': {
    name: 'Bates Numbering',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['bates numbering', 'bates stamp', 'legal stamp', 'sequential number', 'discovery numbering'],
    defaultParams: { prefix: 'CONF-', suffix: '', digits: 6, startNumber: 1, position: 'bottom-right' }
  },
  'condition-router': {
    name: 'Condition Router',
    accept: ['.pdf', '.docx', '.xlsx', '.png', '.jpg'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['condition', 'branch', 'if condition', 'router', 'rule', 'filter document'],
    defaultParams: { ruleType: 'pageCount', operator: '>', thresholdValue: 5 }
  },
  'pdf-to-image': {
    name: 'PDF to Image',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.zip',
    synonyms: ['pdf to image', 'pdf to images', 'pdf to jpg', 'pdf to png', 'pdf to pictures', 'pdf to photos'],
    defaultParams: { format: 'png' }
  },
  'ai-translator': {
    name: 'AI Translator',
    accept: ['.pdf', '.txt', '.md', '.docx'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['translate', 'translate file', 'language translation'],
    defaultParams: { target_language: 'Bengali' }
  },
  'ai-summarizer': {
    name: 'AI Summarizer',
    accept: ['.pdf', '.docx', '.txt', '.md'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.md',
    synonyms: ['summarize', 'summary', 'ai summary', 'condense', 'executive summary', 'highlights', 'bullet summary'],
    defaultParams: { mode: 'highlights', max_bullets: 5 }
  },
  'text-to-pdf': {
    name: 'Text to PDF',
    accept: ['.txt', '.md'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['text to pdf', 'txt to pdf', 'convert text'],
    defaultParams: { fontSize: 12, lineSpacing: 1.5 }
  },
  'sign-pdf': {
    name: 'Sign PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['sign', 'signature', 'sign document'],
    defaultParams: { sigOptions: {} },
    needsStudio: true
  },
  'extract-pages': {
    name: 'Extract Pages',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['extract page', 'select page'],
    defaultParams: { pages: '' }
  },
  'organize-pdf': {
    name: 'Organize PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 1,
    outExt: '.pdf',
    synonyms: ['organize', 'reorder pages', 'arrange pages'],
    defaultParams: { pageConfigs: [] },
    needsStudio: true
  },
  'pdf-forms': {
    name: 'Fill PDF Forms',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['fill form', 'pdf form', 'form fields'],
    defaultParams: { fieldValues: {} },
    needsStudio: true
  },
  'repair-pdf': {
    name: 'Repair PDF',
    accept: ['.pdf'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['repair', 'fix pdf', 'restore pdf'],
    defaultParams: {}
  },
  'scan-to-pdf': {
    name: 'Scan to PDF',
    accept: [],
    minInputs: 0,
    maxInputs: 0,
    outExt: '.pdf',
    synonyms: ['scan', 'scanner', 'camera to pdf'],
    defaultParams: {}
  },
  'conversion-pipeline': {
    name: 'Conversion Pipeline',
    accept: ['.pdf', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.txt'],
    minInputs: 1,
    maxInputs: 50,
    outExt: '.pdf',
    synonyms: ['pipeline', 'batch convert', 'multi convert'],
    defaultParams: {}
  },
  'resume-builder': {
    name: 'Resume Builder',
    accept: [],
    minInputs: 0,
    maxInputs: 0,
    outExt: '.pdf',
    synonyms: ['resume', 'cv builder', 'cv maker', 'curriculum vitae'],
    defaultParams: {}
  },
  'document-viewer': {
    name: 'Document Viewer',
    accept: ['.pdf', '.docx', '.xlsx', '.txt'],
    minInputs: 1,
    maxInputs: 1,
    outExt: '.pdf',
    synonyms: ['view pdf', 'preview document', 'read pdf'],
    defaultParams: {}
  }
};

/**
 * Tools that require an interactive Focus Studio before the engine runs.
 * When a canvas operator's toolId is in this set, clicking Run opens the studio
 * instead of immediately executing the engine.
 */
export const STUDIO_TOOLS = new Set([
  'organize-pdf',
  'redact-pdf',
  'sign-pdf',
  'compare-pdf',
  'edit-pdf',
  'crop-pdf',
  'pdf-forms',
]);

export function needsStudioParams(toolId, params = {}) {
  if (!STUDIO_TOOLS.has(toolId)) return false;
  // If params already contain visual configurations (e.g. from an NLP command, options panel, or preset), no studio popup is strictly needed!
  if (toolId === 'organize-pdf' && (params.pageConfigs?.length > 0 || params.pages?.length > 0 || params.rotations || params.deletedPages)) return false;
  if (toolId === 'sign-pdf' && (params.fields?.length > 0 || params.signatureData || params.signatures?.length > 0)) return false;
  if (toolId === 'redact-pdf' && (params.boxes?.length > 0 || params.redactions?.length > 0 || params.patterns?.length > 0)) return false;
  if (toolId === 'crop-pdf' && (params.cropBox || params.margins || params.cropArea)) return false;
  if (toolId === 'edit-pdf' && (params.overlays?.length > 0 || params.annotations?.length > 0)) return false;
  if (toolId === 'pdf-forms' && (params.fieldValues && Object.keys(params.fieldValues).length > 0)) return false;
  if (toolId === 'compare-pdf' && params.diffMode) return false;
  return true;
}

/**
 * Extract parameters from an in-studio natural language prompt command.
 * Returns a delta parameters object to merge with the existing local studio state.
 */
export function extractStudioCommand(toolId, text) {
  const lc = text.toLowerCase().trim();
  const delta = {};

  if (toolId === 'organize-pdf') {
    // "move page 3 to position 1"
    const moveMatch = lc.match(/move\s+page\s+(\d+)\s+to\s+(?:position\s+)?(\d+)/);
    if (moveMatch) delta.moveOp = { from: +moveMatch[1] - 1, to: +moveMatch[2] - 1 };
    // "delete page 5"
    const delMatch = lc.match(/(?:delete|remove)\s+page\s+(\d+)/);
    if (delMatch) delta.deleteOp = { pageIndex: +delMatch[1] - 1 };
    // "rotate page 2"
    const rotMatch = lc.match(/rotate\s+page\s+(\d+)(?:\s+(90|180|270|ccw|clockwise))?/);
    if (rotMatch) delta.rotateOp = { pageIndex: +rotMatch[1] - 1, angle: rotMatch[2] ? parseInt(rotMatch[2]) || 90 : 90 };

  } else if (toolId === 'redact-pdf') {
    // "redact all phone numbers"
    if (lc.includes('phone') || lc.includes('phone number')) delta.addPattern = { type: 'phone' };
    // "redact all emails"
    else if (lc.includes('email')) delta.addPattern = { type: 'email' };
    // "redact all ssn" / "social security"
    else if (lc.includes('ssn') || lc.includes('social security')) delta.addPattern = { type: 'ssn' };
    // "redact 'John Doe'" — quoted literal
    else {
      const quoted = text.match(/[\"']([^\"']+)[\"']/);
      if (quoted) delta.addPattern = { type: 'literal', value: quoted[1] };
    }
    // "blackout page 2"
    const pageBlackout = lc.match(/(?:blackout|redact\s+all\s+of)\s+page\s+(\d+)/);
    if (pageBlackout) delta.blackoutPage = +pageBlackout[1] - 1;

  } else if (toolId === 'sign-pdf') {
    // "place signature at bottom right of page 1"
    const placeMatch = lc.match(/(?:place|put|add)\s+(?:signature|sig)\s+(?:at|on|to)\s+(top|bottom)[\s-]?(left|right|center)?(?:\s+of\s+page\s+(\d+))?/);
    if (placeMatch) {
      delta.placement = {
        vAlign: placeMatch[1],
        hAlign: placeMatch[2] || 'center',
        page: placeMatch[3] ? +placeMatch[3] - 1 : 0
      };
    }
    // "sign all pages"
    if (lc.includes('all pages') || lc.includes('every page')) delta.applyToAll = true;

  } else if (toolId === 'compare-pdf') {
    // "go to page 5" / "jump to difference 3"
    const pageJump = lc.match(/(?:go to|jump to|show)\s+page\s+(\d+)/);
    if (pageJump) delta.jumpToPage = +pageJump[1] - 1;
    if (lc.includes('only differences') || lc.includes('show differences')) delta.diffOnly = true;
    if (lc.includes('side by side') || lc.includes('split')) delta.viewMode = 'split';
    if (lc.includes('overlay')) delta.viewMode = 'overlay';
  }

  return delta;
}


/**
 * Extract parameters from a natural language query for a specific tool.
 */
export function extractCommandParameters(actionId, clauseText) {
  // 1. Convert European locale decimal commas (e.g., 1,5 -> 1.5)
  let normalizedText = clauseText.replace(/\b(\d+),(\d+)\b/g, '$1.$2');
  
  // 2. Convert Bengali script digits to Arabic digits (e.g., ৫-১০ -> 5-10)
  const bengaliToArabic = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  normalizedText = normalizedText.replace(/[০-৯]/g, m => bengaliToArabic[m]);

  const lowerClause = normalizedText.toLowerCase().trim();
  const parameters = {};

  // Extract page range target parameter for all applicable PDF tools
  let pageRange = null;
  const rangeMatch = lowerClause.match(/\bpages?\s*(\d+[\d\s\-,to]*|even|odd)\b/i) || 
                     lowerClause.match(/\b(?:only|just)\s+pages?\s*(\d+[\d\s\-,to]*|even|odd)\b/i) ||
                     lowerClause.match(/\bpage\s*(\d+)\b/i);
  if (rangeMatch) {
    const rawVal = rangeMatch[1].trim();
    if (rawVal === 'even' || rawVal === 'odd') {
      pageRange = rawVal;
    } else {
      pageRange = rawVal.replace(/\bto\b/g, '-').replace(/\s+/g, '');
    }
  } else {
    const numberWords = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'couple': 2, 'few': 3 };
    const ordinalMatch = lowerClause.match(/(?:first|last)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|couple|few)\s*pages?\b/i) ||
                         lowerClause.match(/(?:first|last)\s+page\b/i);
    if (ordinalMatch) {
      const isFirst = lowerClause.includes('first');
      const term = ordinalMatch[1];
      if (!term) {
        pageRange = isFirst ? '1' : 'last';
      } else {
        const count = isNaN(term) ? (numberWords[term] || 1) : parseInt(term);
        pageRange = isFirst ? `1-${count}` : `last-${count}`;
      }
    }
  }

  if (pageRange) {
    parameters.pageRange = pageRange;
  }

  if (actionId === 'split-pdf') {
    if (lowerClause.includes('every page') || lowerClause.includes('each page') || lowerClause.includes('page by page') || lowerClause.includes('all pages') || lowerClause.includes('separate pages')) {
      parameters.mode = 'all';
    } else if (lowerClause.includes('even page') || lowerClause.includes('even pages')) {
      parameters.mode = 'range';
      parameters.range = 'even';
    } else if (lowerClause.includes('odd page') || lowerClause.includes('odd pages')) {
      parameters.mode = 'range';
      parameters.range = 'odd';
    } else if (lowerClause.includes('bookmark') || lowerClause.includes('by bookmarks')) {
      parameters.mode = 'by-bookmarks';
    } else if (lowerClause.includes('blank') || lowerClause.includes('blank pages') || lowerClause.includes('at blank')) {
      parameters.mode = 'by-blank-page';
    } else {
      const sizeMatch = lowerClause.match(/(\d+)\s*(?:mb|megabytes?)/i);
      if (sizeMatch) {
        parameters.mode = 'size-limit';
        parameters.max_size_mb = parseInt(sizeMatch[1]);
      } else {
        const numberWords = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10 };
        const partsMatch = lowerClause.match(/(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+parts/)
          || lowerClause.match(/split\s+(?:into|in)\s+(\d+|two|three|four|five|six|seven|eight|nine|ten)\b/)
          || lowerClause.match(/(?:first|last)\s+(\d+|two|three|four|five|six|seven|eight|nine|ten)\b/);
        
        if (partsMatch) {
          const val = partsMatch[1];
          parameters.mode = 'parts';
          parameters.parts = isNaN(val) ? (numberWords[val] || 2) : parseInt(val);
        } else {
          const intervalMatch = lowerClause.match(/(?:every|interval\s+of|each|per)\s+(\d+|two|three|four|five)\s+pages/i);
          if (intervalMatch) {
            const val = intervalMatch[1];
            parameters.mode = 'fixed-ranges';
            parameters.pages_per_split = isNaN(val) ? (numberWords[val] || 2) : parseInt(val);
          } else {
            const rangeMatch = lowerClause.match(/pages?\s*(\d+[\d\s\-,to]*)/) || lowerClause.match(/(\d+\s*-\s*\d+)/);
            if (rangeMatch) {
              parameters.mode = 'range';
              parameters.range = rangeMatch[1].replace(/\bto\b/g, '-').trim();
            } else {
              parameters.mode = 'parts';
              parameters.parts = 2;
            }
          }
        }
      }
    }
  } else if (actionId === 'rotate-pdf') {
    const angleMatch = lowerClause.match(/\b(90|180|270)\b/);
    if (angleMatch) {
      parameters.angle = parseInt(angleMatch[1]);
    } else if (lowerClause.includes('counterclockwise') || lowerClause.includes('ccw') || lowerClause.includes('left') || lowerClause.includes('counter-clockwise')) {
      parameters.angle = 270;
    } else if (lowerClause.includes('flip') || lowerClause.includes('upside down') || lowerClause.includes('upsidedown')) {
      parameters.angle = 180;
    } else {
      parameters.angle = 90;
    }
  } else if (actionId === 'compress-pdf' || actionId === 'image-compressor') {
    const decreaseMatch = lowerClause.match(/(?:reduce|decrease|shrink)\s+(?:by\s+)?(\d+)\s*(?:%|percent)/i);
    const qualMatch = lowerClause.match(/(\d+)\s*(?:%|percent)/);
    const mbMatch = lowerClause.match(/(\d+(?:\.\d+)?)\s*(?:mb|megabytes?)/i);
    
    if (decreaseMatch) {
      parameters.quality = (100 - parseInt(decreaseMatch[1])) / 100;
    } else if (qualMatch) {
      parameters.quality = parseInt(qualMatch[1]) / 100;
    } else if (lowerClause.includes('maximum') || lowerClause.includes('high compression') || lowerClause.includes('max')) {
      parameters.quality = 0.35;
    } else if (lowerClause.includes('low compression') || lowerClause.includes('minimal') || lowerClause.includes('min')) {
      parameters.quality = 0.85;
    } else {
      parameters.quality = actionId === 'compress-pdf' ? 0.65 : 0.7;
    }
    if (mbMatch) {
      parameters.targetSizeMb = parseFloat(mbMatch[1]);
    }
  } else if (actionId === 'add-watermark') {
    const matchText = clauseText.match(/["']([^"']+)["']/) || clauseText.match(/watermark\s+(\w+)/i) || clauseText.match(/stamp\s+(\w+)/i);
    parameters.text = matchText ? matchText[1].toUpperCase() : 'CONFIDENTIAL';
    const opacityMatch = lowerClause.match(/(\d+)\s*(?:%|percent)\s*opacity/i) || lowerClause.match(/opacity\s*(?:of\s*)?(\d+)\s*(?:%|percent)/i);
    if (opacityMatch) {
      parameters.opacity = parseInt(opacityMatch[1]) / 100;
    } else {
      parameters.opacity = 0.5;
    }
    const colorMatch = lowerClause.match(/\b(red|blue|green|black|gray|yellow|orange|purple)\b/i);
    if (colorMatch) {
      parameters.color = colorMatch[1].toLowerCase();
    }
    const fontMatch = lowerClause.match(/\b(\d+)\s*(?:pt|px|size|font)\b/i) || lowerClause.match(/\b(?:font|size)\s*(\d+)\b/i);
    if (fontMatch) {
      parameters.fontSize = parseInt(fontMatch[1]);
    }
    parameters.angle = 45;
  } else if (actionId === 'image-converter') {
    const matchFormat = lowerClause.match(/\b(png|jpg|jpeg|webp)\b/);
    parameters.format = matchFormat ? (matchFormat[1] === 'jpeg' ? 'jpg' : matchFormat[1]) : 'png';
  } else if (actionId === 'ai-translator') {
    const languages = {
      'bengali': 'Bengali', 'bangla': 'Bengali',
      'spanish': 'Spanish', 'espanol': 'Spanish',
      'french': 'French',
      'german': 'German',
      'italian': 'Italian',
      'portuguese': 'Portuguese',
      'japanese': 'Japanese',
      'chinese': 'Chinese (Simplified)',
      'korean': 'Korean',
      'arabic': 'Arabic',
      'russian': 'Russian',
      'hindi': 'Hindi'
    };
    let matchedLang = 'Bengali';
    for (const [key, val] of Object.entries(languages)) {
      if (lowerClause.includes(key)) {
        matchedLang = val;
        break;
      }
    }
    parameters.target_language = matchedLang;
  } else if (actionId === 'protect-pdf') {
    const quoteMatch = clauseText.match(/["']([^"']+)["']/);
    parameters.password = quoteMatch ? quoteMatch[1] : '';
    if (!parameters.password) {
      const passMatch = lowerClause.match(/password\s+(\S+)/);
      parameters.password = passMatch ? passMatch[1] : 'secret';
    }
    parameters.permissions = { print: true, copy: true, modify: false };
  } else if (actionId === 'unlock-pdf') {
    const quoteMatch = clauseText.match(/["']([^"']+)["']/);
    parameters.password = quoteMatch ? quoteMatch[1] : '';
    if (!parameters.password) {
      const passMatch = lowerClause.match(/password\s+(\S+)/);
      parameters.password = passMatch ? passMatch[1] : '';
    }
  } else if (actionId === 'image-resizer') {
    const dimMatch = lowerClause.match(/(\d+)\s*(?:x|\*|by)\s*(\d+)/);
    if (dimMatch) {
      parameters.width = parseInt(dimMatch[1]);
      parameters.height = parseInt(dimMatch[2]);
      parameters.mode = 'custom';
    } else {
      const pctMatch = lowerClause.match(/(\d+)\s*(?:%|percent)/);
      if (pctMatch) {
        parameters.percentage = parseInt(pctMatch[1]);
      } else {
        parameters.percentage = 75;
      }
      parameters.mode = 'percentage';
    }
  } else if (actionId === 'remove-pages' || actionId === 'extract-pages') {
    const rangeMatch = lowerClause.match(/pages?\s*(\d+[\d\s\-,to]*)/) 
      || lowerClause.match(/(\d+\s*-\s*\d+)/)
      || lowerClause.match(/(\d+\s*,\s*\d+)/);
    
    if (rangeMatch) {
      parameters.pages = rangeMatch[1].replace(/\bto\b/g, '-').trim();
    } else {
      if (lowerClause.includes('first page')) {
        parameters.pages = '1';
      } else if (lowerClause.includes('last page')) {
        parameters.pages = 'last';
      } else if (lowerClause.includes('even pages') || lowerClause.includes('even')) {
        parameters.pages = 'even';
      } else if (lowerClause.includes('odd pages') || lowerClause.includes('odd')) {
        parameters.pages = 'odd';
      } else {
        const numberWords = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10 };
        const countMatch = lowerClause.match(/(?:first|last)\s+(\d+|two|three|four|five|six|seven|eight|nine|ten)\b/);
        if (countMatch) {
          const isFirst = lowerClause.includes('first');
          const val = countMatch[1];
          const num = isNaN(val) ? (numberWords[val] || 1) : parseInt(val);
          parameters.pages = isFirst ? `1-${num}` : `last-${num}`;
        } else {
          parameters.pages = '1';
        }
      }
    }
  } else if (actionId === 'qr-generator') {
    const urlMatch = clauseText.match(/(https?:\/\/[^\s"']+)/) || clauseText.match(/["']([^"']+)["']/);
    if (urlMatch) {
      parameters.text = urlMatch[1];
    } else {
      const payloadMatch = lowerClause.match(/(?:qr\s+for|qr\s+code\s+for|generate\s+qr\s+code\s+for)\s+(.+)/);
      parameters.text = payloadMatch ? payloadMatch[1].trim() : 'https://docforge.com';
    }
  } else if (actionId === 'add-page-numbers') {
    if (lowerClause.includes('bottom center') || lowerClause.includes('center')) {
      parameters.position = 'bottom-center';
    } else if (lowerClause.includes('top center') || lowerClause.includes('top')) {
      parameters.position = 'top-center';
    } else {
      parameters.position = 'bottom-right';
    }
    parameters.format = 'Page {n} of {total}';
  } else if (actionId === 'pdf-to-image') {
    const matchFormat = lowerClause.match(/\b(png|jpg|jpeg|webp)\b/);
    parameters.format = matchFormat ? (matchFormat[1] === 'jpeg' ? 'jpg' : matchFormat[1]) : 'png';
  }

  return parameters;
}

// 2. Local First Dictionary & Hybrid NLP Intent Resolver
// Levenshtein distance for fuzzy NLP matching
function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function getWordSimilarity(a, b) {
  const distance = getLevenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

function stemWord(word) {
  let w = word.toLowerCase().trim();
  if (w.endsWith('ing')) w = w.slice(0, -3);
  if (w.endsWith('ed')) w = w.slice(0, -2);
  if (w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.endsWith('ment')) w = w.slice(0, -4);
  return w;
}

export async function parseLocalNLPCommand(clauseText, activePool) {
  const text = clauseText.toLowerCase().trim();

  // Run TF-IDF + Semantic ONNX classifier prediction
  try {
    const prediction = await predictIntentAsync(clauseText);
    // Semantic cosine similarity has a tighter distribution; 0.50 threshold is appropriate
    const threshold = prediction.classLabel === 'unknown' ? 0.65 : 0.50; 
    if (prediction && prediction.classLabel !== 'unknown' && prediction.confidence > threshold) {
      let actionId = prediction.classLabel;
      // 'convert' alone on an image pool -> image format converter, not PDF
      if (actionId === 'image-converter' || actionId === 'docx-to-pdf') {
        if (text.includes('convert')) {
          const hasImg = activePool && activePool.some(n => ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes('.' + (n.name || '').split('.').pop().toLowerCase()));
          actionId = hasImg ? 'image-converter' : 'docx-to-pdf';
        }
      }
      console.log(`[Classifier Log] Input: "${clauseText}" -> Predicted: "${actionId}" (Confidence: ${(prediction.confidence * 100).toFixed(1)}%)`);
      return actionId;
    }
  } catch (err) {
    console.error('[Classifier Error] Classifier failed:', err);
  }

  const userWords = text.split(/\s+/).filter(Boolean);
  const stemmedUserWords = userWords.map(stemWord);

  // Whole-word matching helper with phrase escape
  const has = (phrase) => {
    const escaped = phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  };
  const hasAny = (...phrases) => phrases.some(p => has(p));

  // High-priority conversions
  if (hasAny('pdf to word', 'to word', 'to docx', 'pdf to doc')) return 'pdf-to-word';
  if (hasAny('pdf to excel', 'to excel', 'to sheet', 'to csv', 'pdf to sheet')) return 'pdf-to-excel';
  if (hasAny('pdf to powerpoint', 'to powerpoint', 'to ppt', 'pdf to ppt')) return 'pdf-to-powerpoint';
  if (hasAny('unzip', 'decompress', 'extract zip')) return 'unzip-file';

  // Bug #4 fix: image-to-pdf must be checked BEFORE image-converter since both match images.
  if (hasAny('images to pdf', 'photos to pdf', 'pictures to pdf', 'image to pdf', 'jpg to pdf', 'png to pdf', 'jpeg to pdf')) return 'image-to-pdf';

  // Helper to check if a multi-word synonym matches the user input (fuzzy)
  const matchesSynonymFuzzy = (synonym) => {
    const synWords = synonym.toLowerCase().split(/\s+/).filter(Boolean);
    return synWords.every(synW => {
      const stemmedSynW = stemWord(synW);
      return stemmedUserWords.some(userW => {
        if (userW === stemmedSynW) return true;
        if (getWordSimilarity(userW, stemmedSynW) >= 0.7) return true;
        return false;
      });
    });
  };

  // Standard matches based on registry synonyms with word boundary and fuzzy checks
  for (const [actionId, meta] of Object.entries(TOOL_REGISTRY)) {
    if (meta.synonyms.some(syn => has(syn) || matchesSynonymFuzzy(syn))) {
      // 'convert' alone on an image pool -> image format converter, not PDF
      if (actionId === 'image-converter' || actionId === 'docx-to-pdf') {
        if (hasAny('convert')) {
          const hasImg = activePool && activePool.some(n => ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes('.' + (n.name || '').split('.').pop().toLowerCase()));
          return hasImg ? 'image-converter' : 'docx-to-pdf';
        }
      }
      return actionId;
    }
  }

  // Exact matching overrides
  if (hasAny('word', 'doc', 'docx')) return 'docx-to-pdf';
  if (hasAny('excel', 'xlsx', 'xls', 'csv')) return 'excel-to-pdf';
  if (hasAny('powerpoint', 'ppt', 'pptx')) return 'powerpoint-to-pdf';
  if (hasAny('html to pdf', 'convert html to pdf', 'web to pdf', 'convert web to pdf', 'html')) return 'html-to-pdf';

  return null;
}

// 3. Layered DAG Layout Physics Optimizer
// Automatically arranges messy nodes in structured columns based on relationships
export function optimizeCanvasLayout(operations, workspaceQueue) {
  const updatedQueue = [...workspaceQueue];
  const updatedOps = [...operations];
  
  // Maps of output connections to track children/dependents
  const inputToOpMap = {}; // { fileId: [opId, ...] }
  const opToOpMap = {};    // { parentOpId: [childOpId, ...] }
  const opToOutputMap = {}; // { opId: [outFileId, ...] }
  
  // Populating dependency relations
  updatedOps.forEach(op => {
    op.inputIds.forEach(inputId => {
      if (inputId.startsWith('op-')) {
        if (!opToOpMap[inputId]) opToOpMap[inputId] = [];
        opToOpMap[inputId].push(op.id);
      } else {
        if (!inputToOpMap[inputId]) inputToOpMap[inputId] = [];
        inputToOpMap[inputId].push(op.id);
      }
    });
    const outIds = op.outputIds || (op.outputId ? [op.outputId] : []);
    opToOutputMap[op.id] = outIds;
  });

  // Calculate Layout Column Layers (0: Input Files, 1: Converters, 2: Operators, 3: Output Results)
  const nodeLayers = {}; // { nodeId: layerNumber }
  
  // Layer 0: Input files (that have no parents / are not generated by operators)
  const isGeneratedFile = (fileId) => {
    return updatedOps.some(op => {
      const outIds = op.outputIds || (op.outputId ? [op.outputId] : []);
      return outIds.includes(fileId);
    });
  };

  updatedQueue.forEach(file => {
    if (!isGeneratedFile(file.id)) {
      nodeLayers[file.id] = 0;
    }
  });

  // Layer 1 & 2: Operators
  // Operators that consume Layer 0 files are Layer 1 (or 2 if they are heavy)
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;

    updatedOps.forEach(op => {
      let maxParentLayer = -1;
      let allParentsAssigned = true;

      op.inputIds.forEach(parentId => {
        if (nodeLayers[parentId] !== undefined) {
          // If the parent is an operator card, it will generate an intermediate file node,
          // so the current operator should sit at least 2 layers downstream of it.
          const effectiveParentLayer = parentId.startsWith('op-') 
            ? nodeLayers[parentId] + 1 
            : nodeLayers[parentId];
          maxParentLayer = Math.max(maxParentLayer, effectiveParentLayer);
        } else {
          allParentsAssigned = false;
        }
      });

      if (allParentsAssigned && maxParentLayer !== -1) {
        const assignedLayer = maxParentLayer + 1;
        if (nodeLayers[op.id] !== assignedLayer) {
          nodeLayers[op.id] = assignedLayer;
          changed = true;
        }
      }
    });

    // Generated outputs get Layer (Parent Operator Layer + 1)
    updatedOps.forEach(op => {
      if (nodeLayers[op.id] !== undefined) {
        const outIds = op.outputIds || (op.outputId ? [op.outputId] : []);
        outIds.forEach(outId => {
          const outLayer = nodeLayers[op.id] + 1;
          if (nodeLayers[outId] !== outLayer) {
            nodeLayers[outId] = outLayer;
            changed = true;
          }
        });
      }
    });
  }

  // Set default layers for orphan nodes
  updatedQueue.forEach(file => {
    if (nodeLayers[file.id] === undefined) nodeLayers[file.id] = 0;
  });
  updatedOps.forEach(op => {
    if (nodeLayers[op.id] === undefined) nodeLayers[op.id] = 1;
  });

  // Group nodes by Layer
  const layers = {};
  const allNodes = [
    ...updatedQueue.map(f => ({ ...f, type: 'file' })),
    ...updatedOps.map(o => ({ ...o, type: 'op' }))
  ];

  allNodes.forEach(node => {
    const layer = nodeLayers[node.id] || 0;
    if (!layers[layer]) layers[layer] = [];
    layers[layer].push(node);
  });

  // Calculate clean, collision-free coordinate positions
  const COLUMN_WIDTH = 320;
  const ROW_HEIGHT = 170;
  const START_X = 100;
  const START_Y = 100;

  // Track layer start X offsets dynamically if previous layers used multi-columns
  let currentLayerX = START_X;

  Object.keys(layers).sort((a, b) => parseInt(a) - parseInt(b)).forEach(layerKey => {
    const layer = parseInt(layerKey);
    const nodes = layers[layer];
    const maxRowsPerSubCol = 4; // Wrap into a 4-row grid for multi-file layers
    const numSubCols = Math.ceil(nodes.length / maxRowsPerSubCol);

    nodes.forEach((node, index) => {
      const subCol = Math.floor(index / maxRowsPerSubCol);
      const subRow = index % maxRowsPerSubCol;
      node.x = currentLayerX + subCol * 270;
      node.y = START_Y + subRow * ROW_HEIGHT;
    });

    currentLayerX += Math.max(1, numSubCols) * COLUMN_WIDTH;
  });

  // Multi-pass Spring Relaxation Force to align connected nodes vertically
  for (let pass = 0; pass < 5; pass++) {
    // Relax Operators to sit at average height of their inputs
    updatedOps.forEach(op => {
      const inputs = allNodes.filter(n => op.inputIds.includes(n.id));
      if (inputs.length > 0) {
        const avgY = inputs.reduce((sum, n) => sum + n.y, 0) / inputs.length;
        op.y = op.y * 0.4 + avgY * 0.6; // Interpolate weight
      }
    });

    // Relax Output nodes to sit directly in line with their parent operators
    updatedOps.forEach(op => {
      const opNode = allNodes.find(n => n.id === op.id);
      const outIds = op.outputIds || (op.outputId ? [op.outputId] : []);
      const outputs = allNodes.filter(n => outIds.includes(n.id));
      if (outputs.length > 0 && opNode) {
        const count = outputs.length;
        outputs.forEach((outNode, idx) => {
          const targetY = opNode.y + (idx - (count - 1) / 2) * ROW_HEIGHT * 0.8;
          outNode.y = outNode.y * 0.4 + targetY * 0.6;
        });
      }
    });
  }

  // Apply layout modifications back to states
  const finalQueue = updatedQueue.map(f => {
    const layoutNode = allNodes.find(n => n.id === f.id);
    return layoutNode ? { ...f, x: layoutNode.x, y: layoutNode.y } : f;
  });

  const finalOps = updatedOps.map(op => {
    const layoutNode = allNodes.find(n => n.id === op.id);
    return layoutNode ? { ...op, x: layoutNode.x, y: layoutNode.y } : op;
  });

  return { queue: finalQueue, operations: finalOps };
}

// Standard recursive helper for DAG Cycle Detection (exported for use in StitchCanvas)
export function hasDependencyCycle(startId, searchTargetId, operations, visited = new Set()) {
  if (startId === searchTargetId) return true;
  visited.add(startId);
  
  const op = operations.find(o => o.id === startId);
  if (!op) return false;
  
  for (const inputId of op.inputIds) {
    if (inputId === searchTargetId) return true;
    if (inputId.startsWith('op-') && !visited.has(inputId)) {
      if (hasDependencyCycle(inputId, searchTargetId, operations, visited)) {
        return true;
      }
    }
  }
  return false;
}

// 4. Connection Diagnostics & Self-Healing Pipeline Validator
export function validateCanvasConnections(operations, workspaceQueue) {
  const issues = [];
  
  operations.forEach(op => {
    const registry = TOOL_REGISTRY[op.toolId];
    if (!registry) return;

    // Check cardinality bounds
    const inputCount = op.inputIds.length;
    if (registry.minInputs !== undefined && inputCount < registry.minInputs) {
      issues.push({
        id: `card-min-${op.id}`,
        type: 'cardinality-mismatch',
        message: `Operator '${registry.name}' requires at least ${registry.minInputs} inputs. Currently connected: ${inputCount}`,
        opId: op.id
      });
    }
    if (registry.maxInputs !== undefined && inputCount > registry.maxInputs) {
      issues.push({
        id: `card-max-${op.id}`,
        type: 'cardinality-mismatch',
        message: `Operator '${registry.name}' accepts at most ${registry.maxInputs} inputs. Currently connected: ${inputCount}`,
        opId: op.id
      });
    }

    op.inputIds.forEach(inputId => {
      // Find the input node on the canvas
      let inputNode = workspaceQueue.find(q => q.id === inputId);
      if (!inputNode) {
        // Could be an upstream operator output placeholder
        const upstreamOp = operations.find(o => o.id === inputId);
        if (upstreamOp) {
          const outExt = TOOL_REGISTRY[upstreamOp.toolId]?.outExt || '.pdf';
          inputNode = { id: upstreamOp.id, name: `output${outExt}`, type: 'op' };
        }
      }

      if (!inputNode) return;

      // Check cycle detection
      if (inputId.startsWith('op-')) {
        const visited = new Set();
        if (hasDependencyCycle(inputId, op.id, operations, visited)) {
          issues.push({
            id: `cycle-${op.id}-${inputId}`,
            type: 'cycle-error',
            message: `Circular dependency blocked: Node '${registry.name}' cannot route outputs recursively back into inputs.`,
            fileId: inputId,
            opId: op.id,
            fileName: inputNode.name
          });
        }
      }

      // Extract file suffix
      const filename = inputNode.name || '';
      const ext = '.' + filename.split('.').pop().toLowerCase();

      // Check format compatibility (Graph Type Safety)
      const acceptedExtensions = registry.accept;
      if (acceptedExtensions.length > 0 && !acceptedExtensions.includes(ext)) {
        const isImg = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext);
        if (isImg && !['image-converter', 'image-compressor', 'image-resizer'].includes(op.toolId)) {
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `Image '${filename}' connected directly to PDF tool '${registry.name}'. Needs conversion.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: 'image-to-pdf',
            suggestedToolName: 'Image to PDF'
          });
        } else if (ext === '.docx' || ext === '.doc') {
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `Word document '${filename}' connected directly to '${registry.name}'. Needs conversion.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: 'docx-to-pdf',
            suggestedToolName: 'Word to PDF'
          });
        } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `Excel spreadsheet '${filename}' connected directly to '${registry.name}'. Needs conversion.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: 'excel-to-pdf',
            suggestedToolName: 'Excel to PDF'
          });
        } else if (ext === '.pptx' || ext === '.ppt') {
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `PowerPoint presentation '${filename}' connected directly to '${registry.name}'. Needs conversion.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: 'powerpoint-to-pdf',
            suggestedToolName: 'PowerPoint to PDF'
          });
        } else if (ext === '.html' || ext === '.htm') {
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `HTML document '${filename}' connected directly to '${registry.name}'. Needs conversion.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: 'html-to-pdf',
            suggestedToolName: 'HTML to PDF'
          });
        } else if (ext === '.zip') {
          const expectsPdf = acceptedExtensions.includes('.pdf');
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: expectsPdf 
              ? `Images/ZIP archive '${filename}' connected directly to '${registry.name}'. Converting images to unified PDF.`
              : `ZIP archive '${filename}' connected directly to '${registry.name}'. Needs decompression.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: expectsPdf ? 'image-to-pdf' : 'unzip-file',
            suggestedToolName: expectsPdf ? 'Image to PDF' : 'Extract ZIP'
          });
        } else if (['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tiff'].includes(ext) && acceptedExtensions.includes('.pdf')) {
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `Image '${filename}' connected directly to PDF tool '${registry.name}'. Converting image to PDF.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: 'image-to-pdf',
            suggestedToolName: 'Image to PDF'
          });
        } else if ((ext === '.txt' || ext === '.md') && op.toolId !== 'text-to-pdf') {
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `Text document '${filename}' connected directly to PDF tool '${registry.name}'. Needs conversion.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: 'text-to-pdf',
            suggestedToolName: 'Text to PDF'
          });
        } else if (ext === '.pdf' && (acceptedExtensions.includes('image/*') || ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].some(e => acceptedExtensions.includes(e)))) {
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `PDF document '${filename}' connected directly to Image tool '${registry.name}'. Needs extraction.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: 'pdf-to-image',
            suggestedToolName: 'PDF to Image'
          });
        } else if (ext === '.pdf' && (acceptedExtensions.includes('.docx') || acceptedExtensions.includes('.doc'))) {
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `PDF document '${filename}' connected directly to Word tool '${registry.name}'. Needs conversion.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: 'pdf-to-word',
            suggestedToolName: 'PDF to Word'
          });
        } else if (ext === '.pdf' && (acceptedExtensions.includes('.xlsx') || acceptedExtensions.includes('.xls') || acceptedExtensions.includes('.csv'))) {
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `PDF document '${filename}' connected directly to Excel tool '${registry.name}'. Needs conversion.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: 'pdf-to-excel',
            suggestedToolName: 'PDF to Excel'
          });
        } else if (ext === '.pdf' && (acceptedExtensions.includes('.pptx') || acceptedExtensions.includes('.ppt'))) {
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `PDF document '${filename}' connected directly to PowerPoint tool '${registry.name}'. Needs conversion.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId: 'pdf-to-powerpoint',
            suggestedToolName: 'PDF to PPT'
          });
        } else {
          // General wildcard extension mismatch error
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `File '${filename}' of type '${ext}' is not supported by operator '${registry.name}' (${acceptedExtensions.join(', ')}).`,
            fileId: inputId,
            opId: op.id,
            fileName: filename
          });
        }
      }
    });
  });

  return issues;
}

// 5. Automatic Converter Injection Pipeline Restructurer
// Inject a converter operator, rerouting visual cables automatically
export function executeAutoHeal(operations, workspaceQueue, issue) {
  const { fileId, opId, suggestedToolId } = issue;
  
  // Guard checking suggestedToolId existence
  if (!suggestedToolId || !TOOL_REGISTRY[suggestedToolId]) {
    console.warn(`executeAutoHeal aborted: suggestedToolId '${suggestedToolId}' does not exist in registry.`);
    return { operations, queue: workspaceQueue };
  }

  // Find nodes
  const targetFile = workspaceQueue.find(f => f.id === fileId);
  const targetOp = operations.find(o => o.id === opId);
  if (!targetOp) return { operations, queue: workspaceQueue };

  // Generate ID for injected converter operator
  const injectorOpId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  // Position injected card midway between the file and target operator cards
  const fileX = targetFile ? (targetFile.x || 100) : targetOp.x - 300;
  const fileY = targetFile ? (targetFile.y || 100) : targetOp.y;
  const injectX = Math.round((fileX + targetOp.x) / 2);
  const injectY = Math.round((fileY + targetOp.y) / 2);

  const defaultParams = TOOL_REGISTRY[suggestedToolId]?.defaultParams || {};

  // Construct injected operator card
  const injectedOp = {
    id: injectorOpId,
    toolId: suggestedToolId,
    inputIds: [fileId],
    outputId: null,
    status: 'idle',
    progress: 0,
    x: injectX,
    y: injectY,
    params: defaultParams
  };

  // Shift target operator and downstream nodes right if needed to create clean visual clearance
  // Only shift if existing spatial gap is smaller than standard node width (280px)
  const existingGap = targetOp.x - fileX;
  const spacingDelta = existingGap >= 280 ? 0 : Math.max(0, 280 - existingGap);
  const updatedOperations = operations.map(op => {
    let updatedX = op.x || 100;
    if (op.x >= injectX) {
      updatedX += spacingDelta;
    }
    if (op.id === opId) {
      const inputs = op.inputIds.map(inpId => inpId === fileId ? injectorOpId : inpId);
      return { ...op, x: updatedX, inputIds: inputs };
    }
    return { ...op, x: updatedX };
  });

  // Also shift any downstream output file nodes to maintain alignment
  const updatedQueue = workspaceQueue.map(f => {
    if (f.x && f.x >= injectX) {
      return { ...f, x: f.x + spacingDelta };
    }
    return f;
  });

  // Append new converter operator to list
  updatedOperations.push(injectedOp);

  return { operations: updatedOperations, queue: updatedQueue };
}

// =============================================================================
// 4. DOCUMENT INDEX TARGETING (DIT) — Phase B, D, F
// =============================================================================

/**
 * Ordinal word → 1-based integer map.
 * Used by resolveDocumentTargets to convert "third" → 3, "2nd" → 2, etc.
 */
const ORDINALS = {
  'first': 1, '1st': 1,
  'second': 2, '2nd': 2,
  'third': 3, '3rd': 3,
  'fourth': 4, '4th': 4,
  'fifth': 5, '5th': 5,
  'sixth': 6, '6th': 6,
  'seventh': 7, '7th': 7,
  'eighth': 8, '8th': 8,
  'ninth': 9, '9th': 9,
  'tenth': 10, '10th': 10,
  'eleventh': 11, '11th': 11,
  'twelfth': 12, '12th': 12,
  'thirteenth': 13, '13th': 13,
  'fourteenth': 14, '14th': 14,
  'fifteenth': 15, '15th': 15,
  'sixteenth': 16, '16th': 16,
  'seventeenth': 17, '17th': 17,
  'eighteenth': 18, '18th': 18,
  'nineteenth': 19, '19th': 19,
  'twentieth': 20, '20th': 20,
};

/** Words that indicate the following ordinal should be EXCLUDED, not included. */
const EXCLUSION_TRIGGERS = ['not', 'except', 'skip', 'exclude', 'ignore', 'without', "don't", "dont", 'but not'];

/**
 * Phase B — resolveDocumentTargets
 *
 * Given a natural language clause and the current activePool of canvas nodes,
 * resolves which nodes the user is referring to by ordinal position (left-to-right
 * X sort order), exclusion keywords, or special tokens ("all outputs", "the result").
 *
 * Priority order:
 *  1. Special tokens: "all outputs" / "all results" → all ws-out-* nodes
 *  2. Ordinal + exclusion scan: "1st and 3rd", "except the 2nd", "not the first"
 *  3. "the last N" / "the first N" shorthand
 *
 * @param {string} clauseText - The NLP clause to parse
 * @param {Array} activePool  - Current list of canvas nodes (file nodes + output nodes)
 * @returns {{ included: Array, excluded: Array, resolved: boolean }}
 *          resolved=false means no DIT pattern was detected (fall through to existing logic)
 */
export function resolveDocumentTargets(clauseText, activePool) {
  if (!clauseText || !activePool || activePool.length === 0) {
    return { included: [], excluded: [], resolved: false };
  }

  const lower = clauseText.toLowerCase().trim();

  // Sort pool by left-to-right X position so leftmost = 1st
  const sorted = [...activePool].sort((a, b) => (a.x || 0) - (b.x || 0));
  const sourceNodes = sorted.filter(n => !n.id.startsWith('ws-out-') && !n.id.startsWith('output:'));
  const outputNodes = sorted.filter(n => n.id.startsWith('ws-out-') || n.id.startsWith('output:'));
  const allOrdered = [...sourceNodes, ...outputNodes];

  // ------------------------------------------------------------------
  // Phase F: Special tokens — "all outputs" / "outputs" / "the outputs" / "the result"
  // ------------------------------------------------------------------
  if (/\b(?:all\s+)?(?:the\s+)?outputs\b/.test(lower) ||
      /\b(?:all\s+)?(?:the\s+)?results\b/.test(lower) ||
      /\ball\s+(?:the\s+)?outputs?\b/.test(lower) ||
      /\ball\s+(?:the\s+)?results?\b/.test(lower) ||
      /\ball\s+(?:the\s+)?converted\b/.test(lower)) {
    return { included: outputNodes, excluded: [], resolved: outputNodes.length > 0 };
  }

  if (/\bthe\s+(?:output|result|converted|merged)\b/.test(lower) && outputNodes.length > 0) {
    return { included: [outputNodes[outputNodes.length - 1]], excluded: [], resolved: true };
  }

  // ------------------------------------------------------------------
  // Ordinal scanning with qualifier detection
  // ------------------------------------------------------------------
  const included = [];
  const excluded = [];
  let anyOrdinalFound = false;

  const ordinalKeys = Object.keys(ORDINALS);
  const ordinalRe = new RegExp(`\\b(${ordinalKeys.join('|')})\\b`, 'gi');

  const EXCL_SINGLE = ['not', 'except', 'skip', 'exclude', 'ignore', 'without', "don't", 'dont'];
  const EXCL_TWO = ['but not'];

  let match;
  while ((match = ordinalRe.exec(lower)) !== null) {
    const ordinalWord = match[1].toLowerCase();
    const oneBasedIdx = ORDINALS[ordinalWord];
    if (!oneBasedIdx) continue;

    anyOrdinalFound = true;
    const zeroIdx = oneBasedIdx - 1;

    // Check exclusion trigger before
    const textBefore = lower.slice(0, match.index).trimEnd();
    const wordsBefore = textBefore.split(/\s+/).filter(Boolean);
    const prevWord = wordsBefore[wordsBefore.length - 1] || '';
    const prevTwoWords = wordsBefore.slice(-2).join(' ');

    const isExcluded =
      EXCL_SINGLE.some(t => prevWord === t) ||
      EXCL_TWO.some(t => prevTwoWords === t);

    // Look ahead to check if qualified explicitly as output
    const textAfter = lower.slice(match.index + match[0].length).trim();
    const isOutputQualifier = /^(?:the\s+)?(?:outputs?|results?|converted|merged|split|unzipped|processed|done)\b/.test(textAfter);

    let targetNode = null;
    if (isOutputQualifier) {
      if (zeroIdx >= 0 && zeroIdx < outputNodes.length) {
        targetNode = outputNodes[zeroIdx];
      }
    } else {
      if (zeroIdx >= 0 && zeroIdx < allOrdered.length) {
        targetNode = allOrdered[zeroIdx];
      } else if (zeroIdx >= 0 && zeroIdx < sourceNodes.length) {
        targetNode = sourceNodes[zeroIdx];
      }
    }

    if (targetNode) {
      const isAlreadyIncluded = included.some(n => n.id === targetNode.id);
      const isAlreadyExcluded = excluded.some(n => n.id === targetNode.id);

      if (isExcluded) {
        if (!isAlreadyExcluded) excluded.push(targetNode);
      } else {
        if (!isAlreadyIncluded) included.push(targetNode);
      }
    }
  }

  // ------------------------------------------------------------------
  // Raw digit scanning (e.g. "merge 5 and 1", "to 1")
  // ------------------------------------------------------------------
  const digitRe = /\b(\d+)\b/g;
  while ((match = digitRe.exec(lower)) !== null) {
    const numStr = match[1];
    const val = parseInt(numStr);
    if (isNaN(val) || val <= 0 || val > allOrdered.length) continue;

    const textBefore = lower.slice(0, match.index).trimEnd();
    const wordsBefore = textBefore.split(/\s+/).filter(Boolean);
    const prevWord = wordsBefore[wordsBefore.length - 1] || '';
    const prevTwoWords = wordsBefore.slice(-2).join(' ');

    const textAfter = lower.slice(match.index + numStr.length).trim();
    const nextWord = textAfter.split(/\s+/)[0] || '';

    // Criteria to verify this digit references a file node (not parameter numbers like 90 deg or 75%)
    const isPrecededByIndicator = 
      /^(?:the|documents?|files?|pdfs?|images?|outputs?|results?|no\.?|number|and|to|with|or|except|skip)$/.test(prevWord) ||
      prevWord.endsWith(',') ||
      /^(?:but\s+not|except\s+the|skip\s+the|to\s+the|and\s+the)$/.test(prevTwoWords);

    const isSucceededByIndicator = /^(?:documents?|files?|pdfs?|images?|outputs?|results?)$/.test(nextWord);
    const isMergeContext = /\b(?:merge|combine|join|stitch|compare|diff)\b/.test(lower);

    if (isPrecededByIndicator || isSucceededByIndicator || (isMergeContext && val <= allOrdered.length)) {
      anyOrdinalFound = true;
      const zeroIdx = val - 1;

      const isExcluded =
        EXCL_SINGLE.some(t => prevWord === t) ||
        EXCL_TWO.some(t => prevTwoWords === t);

      const isOutputQualifier = /^(?:the\s+)?(?:outputs?|results?|converted|merged|split|unzipped|processed|done)\b/.test(textAfter) ||
                                /^(?:outputs?|results?|converted|merged|split|unzipped|processed|done)$/.test(prevWord);

      let targetNode = null;
      if (isOutputQualifier) {
        if (zeroIdx >= 0 && zeroIdx < outputNodes.length) {
          targetNode = outputNodes[zeroIdx];
        }
      } else {
        if (zeroIdx >= 0 && zeroIdx < allOrdered.length) {
          targetNode = allOrdered[zeroIdx];
        }
      }

      if (targetNode) {
        const isAlreadyIncluded = included.some(n => n.id === targetNode.id);
        const isAlreadyExcluded = excluded.some(n => n.id === targetNode.id);

        if (isExcluded) {
          if (!isAlreadyExcluded) excluded.push(targetNode);
        } else {
          if (!isAlreadyIncluded) included.push(targetNode);
        }
      }
    }
  }

  // "all except/but the Nth" pattern — add target pool nodes
  if (/\ball\s+(?:files?|documents?|pdfs?|outputs?|results?)?\s*(?:but|except|skip|minus)\b/.test(lower)) {
    const isOutputExclusion = /\ball\s+(?:outputs?|results?)\s*(?:but|except|skip|minus)\b/.test(lower) || 
                              /\bexcept\s+(?:the\s+)?\d*(?:st|nd|rd|th)?\s*(?:outputs?|results?)\b/.test(lower);
    const targetPool = isOutputExclusion ? outputNodes : allOrdered;

    targetPool.forEach(node => {
      if (!included.some(n => n.id === node.id) && !excluded.some(n => n.id === node.id)) {
        included.push(node);
      }
    });
  }

  // "the last [N]" / "the first [N]" shorthand
  const lastNMatch = lower.match(/\bthe\s+last\s+(\d+|two|three|four|five)\b/);
  const firstNMatch = lower.match(/\bthe\s+first\s+(\d+|two|three|four|five)\b/);
  const countWords = { 'two': 2, 'three': 3, 'four': 4, 'five': 5 };

  if (lastNMatch && !anyOrdinalFound) {
    const n = isNaN(lastNMatch[1]) ? (countWords[lastNMatch[1]] || 1) : parseInt(lastNMatch[1]);
    const start = Math.max(0, allOrdered.length - n);
    for (let i = start; i < allOrdered.length; i++) {
      if (!included.some(x => x.id === allOrdered[i].id)) {
        included.push(allOrdered[i]);
      }
    }
    anyOrdinalFound = true;
  }
  if (firstNMatch && !anyOrdinalFound) {
    const n = isNaN(firstNMatch[1]) ? (countWords[firstNMatch[1]] || 1) : parseInt(firstNMatch[1]);
    for (let i = 0; i < Math.min(n, allOrdered.length); i++) {
      if (!included.some(x => x.id === allOrdered[i].id)) {
        included.push(allOrdered[i]);
      }
    }
    anyOrdinalFound = true;
  }

  if (!anyOrdinalFound) {
    return { included: [], excluded: [], resolved: false };
  }

  return { included, excluded, resolved: included.length > 0 || excluded.length > 0 };
}

/**
 * Phase D — detectFanOutTools
 *
 * Detects when a single NLP clause names MULTIPLE output formats/tools WITH
 * a conjunction between them — meaning the user wants N parallel operations
 * on the SAME input(s).
 *
 * IMPORTANT: A clause with only ONE tool keyword (e.g. "compress the pdf")
 * must NEVER trigger fan-out — it must return null. Fan-out only fires when
 * 2+ distinct tool-patterns are found AND a conjunction ("and", "or", ",",
 * "also", "as well as") links them within the clause.
 *
 * Examples:
 *   "convert to Word and Excel"            → [pdf-to-word, pdf-to-excel]
 *   "convert to docx, xlsx, and pptx"     → [pdf-to-word, pdf-to-excel, pdf-to-powerpoint]
 *   "compress and rotate"                  → [compress-pdf, rotate-pdf]
 *   "compress the pdf" (single tool)       → null  (NOT a fan-out)
 *   "compress then rotate" (sequential)    → null  (handled by clause splitter)
 *
 * @param {string} clauseText - The NLP clause to scan
 * @returns {string[]|null} Array of tool IDs for fan-out, or null if not a fan-out
 */
export function detectFanOutTools(clauseText) {
  const lower = clauseText.toLowerCase().trim();

  // Format synonym → tool ID map for fan-out detection
  const FORMAT_TOOL_MAP = [
    { patterns: ['to word', 'to docx', 'to doc', 'word format', 'word document'], tool: 'pdf-to-word' },
    { patterns: ['to excel', 'to xlsx', 'to xls', 'to csv', 'excel format', 'spreadsheet'], tool: 'pdf-to-excel' },
    { patterns: ['to powerpoint', 'to pptx', 'to ppt', 'powerpoint format', 'presentation'], tool: 'pdf-to-powerpoint' },
    { patterns: ['to png', 'to jpg', 'to jpeg', 'to image', 'to images', 'to pictures'], tool: 'pdf-to-image' },
    // Note: 'compress', 'rotate', 'ocr', 'watermark', 'page numbers' are included for
    // multi-tool fan-outs like "compress and rotate" — but only activate if a companion
    // tool is ALSO found in the same clause (enforced by the matchedTools.length >= 2 guard).
    { patterns: ['compress', 'shrink', 'reduce size'], tool: 'compress-pdf' },
    { patterns: ['rotate', 'turn', 'flip'], tool: 'rotate-pdf' },
    { patterns: ['ocr', 'make searchable', 'recognize text'], tool: 'ocr-pdf' },
    { patterns: ['watermark', 'stamp'], tool: 'add-watermark' },
    { patterns: ['page numbers', 'paginate', 'number pages'], tool: 'add-page-numbers' },
  ];

  const matchedTools = [];
  for (const entry of FORMAT_TOOL_MAP) {
    const matched = entry.patterns.some(p => lower.includes(p));
    if (matched && !matchedTools.includes(entry.tool)) {
      matchedTools.push(entry.tool);
    }
  }

  // Guard 1: Need at least 2 distinct tools.
  if (matchedTools.length < 2) return null;

  // Guard 2: Must have an explicit conjunction linking them.
  // Sequential markers ("then", "after that", "next") mean SEQUENTIAL, not parallel.
  // Those are intentionally split by the clause splitter and should NOT be fan-out.
  const hasSequentialMarker = /\b(?:then|after\s+that|next|afterwards|subsequently)\b/.test(lower);
  if (hasSequentialMarker) return null;

  // Check for a parallel conjunction: "and", "or", ",", "also", "as well as", "plus"
  const hasParallelConjunction = /\b(?:and|or|also|plus)\b|,|\bas\s+well\s+as\b/.test(lower);
  if (!hasParallelConjunction) return null;

  return matchedTools;
}
