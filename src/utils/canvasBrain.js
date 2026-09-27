/**
 * DocScalar Canvas Brain Engine
 * 
 * Implements:
 * 1. Local First Rule-Based Semantic NLP Command Classifier.
 * 2. Layered DAG Layout Optimization & Force-Directed Spring Relaxation.
 * 3. Self-Healing Connection Diagnostics & Automatic Converter Pipeline Injector.
 */

import { predictIntent, predictIntentAsync } from './classifier.js';
import { getToolRegistry, findConversionPath, TOOLS_MANIFEST, getFormatCategory, normalizeExtension } from './toolsManifest.js';

// 1. Tool Metadata Registry (derived directly from canonical TOOLS_MANIFEST)
export const TOOL_REGISTRY = getToolRegistry();
export const isImage = (ext) => ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext);

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
 * Maximum number of individual output DOM cards allowed to be spawned on the canvas.
 * Batches exceeding this threshold are consolidated into a single bundle/zip collection card.
 */
export const MAX_INDIVIDUAL_CANVAS_CARDS = 5;

/**
 * Evaluates whether an operator's multi-file output should be unpacked into individual
 * canvas DOM cards or consolidated into a single virtual bundle/collection card.
 *
 * @param {boolean} hasDownstreamConsumers - Whether next operators in pipeline/canvas consume this output
 * @param {number} totalFiles - Total number of generated files
 * @param {number} maxCards - Maximum individual card cap (defaults to MAX_INDIVIDUAL_CANVAS_CARDS = 5)
 * @returns {boolean} True if safe to unpack individual cards; false to consolidate into 1 bundle card
 */
export function shouldUnpackCanvasCards(hasDownstreamConsumers, totalFiles, maxCards = MAX_INDIVIDUAL_CANVAS_CARDS) {
  if (hasDownstreamConsumers) return false;
  if (!totalFiles || totalFiles <= 0) return false;
  return totalFiles <= maxCards;
}

/**
 * Checks whether an operator ID is referenced as an input by any downstream operator
 * in the ordered pipeline execution sequence or in the active canvas operations list.
 *
 * @param {string} opId - Target operator ID
 * @param {Array} ordered - Dependency-ordered pipeline operations
 * @param {Array} operations - Active canvas operations
 * @returns {boolean} True if any downstream operator depends on opId
 */
export function checkHasDownstreamConsumers(opId, ordered = [], operations = []) {
  if (!opId) return false;
  const inOrdered = Array.isArray(ordered) && ordered.some(nextOp => nextOp && Array.isArray(nextOp.inputIds) && nextOp.inputIds.includes(opId));
  const inOperations = Array.isArray(operations) && operations.some(nextOp => nextOp && Array.isArray(nextOp.inputIds) && nextOp.inputIds.includes(opId));
  return inOrdered || inOperations;
}
/**
 * Extract parameters from a natural language query for a specific tool.
 */
export function extractCommandParameters(actionId, clauseText) {
  const toolId = (typeof actionId === 'object' && actionId?.actionId) ? actionId.actionId : String(actionId || '');
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

  if (toolId === 'split-pdf') {
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
      const ratioMatch = lowerClause.match(/(\d+)\s*(?:%|\s*percent)?\s*(?:on\s+the\s+)?first\s+and\s+(\d+)\s*(?:%|\s*percent)?\s*(?:on\s+the\s+)?(?:last|second|rest)/i)
        || lowerClause.match(/split\s+(?:into\s+)?(\d+)\s*(?:%|\s*percent)?\s*(?:and|to|:)\s*(\d+)\s*(?:%|\s*percent)?/i);

      if (ratioMatch) {
        parameters.mode = 'ratio';
        parameters.ratio = [parseInt(ratioMatch[1]), parseInt(ratioMatch[2])];
        parameters.first_part_percent = parseInt(ratioMatch[1]);
        parameters.second_part_percent = parseInt(ratioMatch[2]);
      } else if (lowerClause.includes('in half') || lowerClause.includes('into half')) {
        parameters.mode = 'parts';
        parameters.parts = 2;
      } else if (sizeMatch) {
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
  } else if (toolId === 'rotate-pdf') {
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
  } else if (toolId === 'compress-pdf' || toolId === 'image-compressor') {
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
      parameters.quality = toolId === 'compress-pdf' ? 0.65 : 0.7;
    }
    if (mbMatch) {
      parameters.targetSizeMb = parseFloat(mbMatch[1]);
    }
  } else if (toolId === 'add-watermark') {
    const matchText = clauseText.match(/["']([^"']+)["']/) || clauseText.match(/watermark\s+(?:with\s+|as\s+|text\s+)?(\w+)/i) || clauseText.match(/stamp\s+(?:with\s+|as\s+|text\s+)?(\w+)/i);
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
  } else if (toolId === 'image-converter') {
    const matchFormat = lowerClause.match(/\b(png|jpg|jpeg|webp)\b/);
    parameters.format = matchFormat ? (matchFormat[1] === 'jpeg' ? 'jpg' : matchFormat[1]) : 'png';
  } else if (toolId === 'ai-translator') {
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
  } else if (toolId === 'protect-pdf') {
    const quoteMatch = clauseText.match(/["']([^"']+)["']/);
    if (quoteMatch) {
      parameters.password = quoteMatch[1];
    } else {
      const withMatch = lowerClause.match(/\b(?:with|using)\s+(?:password\s+|pass\s+|pwd\s+|code\s+|key\s+)?([^\s,;]+)/i);
      if (withMatch && !['password', 'pass', 'pwd', 'protection', 'the', 'a', 'an'].includes(withMatch[1])) {
        parameters.password = withMatch[1];
      } else {
        const passMatch = lowerClause.match(/\b(?:password|pass|pwd|code|key)\s*(?:is|[:=])?\s*([^\s,;]+)/i);
        if (passMatch && !['protect', 'protection', 'lock', 'encrypt', 'pdf', 'file', 'document', 'the', 'this', 'it', 'is'].includes(passMatch[1])) {
          parameters.password = passMatch[1];
        } else {
          const shorthandMatch = lowerClause.match(/\b(pass\w+)\b/i);
          parameters.password = shorthandMatch ? shorthandMatch[1] : 'secret';
        }
      }
    }
    parameters.permissions = { print: true, copy: true, modify: false };
  } else if (toolId === 'unlock-pdf') {
    const quoteMatch = clauseText.match(/["']([^"']+)["']/);
    if (quoteMatch) {
      parameters.password = quoteMatch[1];
    } else {
      const withMatch = lowerClause.match(/\b(?:with|using)\s+(?:password\s+|pass\s+|pwd\s+|code\s+|key\s+)?([^\s,;]+)/i);
      if (withMatch && !['password', 'pass', 'pwd', 'protection', 'the', 'a', 'an'].includes(withMatch[1])) {
        parameters.password = withMatch[1];
      } else {
        const passMatch = lowerClause.match(/\b(?:password|pass|pwd|code|key)\s*(?:is|[:=])?\s*([^\s,;]+)/i);
        if (passMatch && !['unlock', 'decrypt', 'pdf', 'file', 'document', 'the', 'this', 'it', 'is'].includes(passMatch[1])) {
          parameters.password = passMatch[1];
        } else {
          const shorthandMatch = lowerClause.match(/\b(pass\w+)\b/i);
          parameters.password = shorthandMatch ? shorthandMatch[1] : '';
        }
      }
    }
  } else if (toolId === 'image-resizer') {
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
  } else if (toolId === 'remove-pages' || toolId === 'extract-pages') {
    const rangeMatch = lowerClause.match(/pages?\s*(\d+[\d\s\-,to]*)/) 
      || lowerClause.match(/(\d+\s*-\s*\d+)/)
      || lowerClause.match(/(\d+\s*,\s*\d+)/);
    
    if (rangeMatch) {
      const cleaned = rangeMatch[1].replace(/\bto\b/g, '-').replace(/\s*-\s*/g, '-').trim();
      parameters.pages = cleaned;
      parameters.pageRange = cleaned;
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
  } else if (toolId === 'qr-generator') {
    const urlMatch = clauseText.match(/(https?:\/\/[^\s"']+)/) || clauseText.match(/["']([^"']+)["']/);
    if (urlMatch) {
      parameters.text = urlMatch[1];
    } else {
      const payloadMatch = lowerClause.match(/(?:qr\s+for|qr\s+code\s+for|generate\s+qr\s+code\s+for)\s+(.+)/);
      parameters.text = payloadMatch ? payloadMatch[1].trim() : 'https://docscalar.com';
    }
  } else if (toolId === 'add-page-numbers') {
    if (lowerClause.includes('bottom center') || lowerClause.includes('center')) {
      parameters.position = 'bottom-center';
    } else if (lowerClause.includes('top center') || lowerClause.includes('top')) {
      parameters.position = 'top-center';
    } else {
      parameters.position = 'bottom-right';
    }
    const startMatch = lowerClause.match(/start(?:ing)?\s+(?:from|at)?\s*(\d+)/i);
    if (startMatch) {
      parameters.startNumber = parseInt(startMatch[1]);
    }
    if (lowerClause.includes('roman')) {
      parameters.format = 'roman';
    } else {
      parameters.format = 'Page {n} of {total}';
    }
  } else if (toolId === 'pdf-to-image') {
    const matchFormat = lowerClause.match(/\b(png|jpg|jpeg|webp)\b/);
    parameters.format = matchFormat ? (matchFormat[1] === 'jpeg' ? 'jpg' : matchFormat[1]) : 'png';
  }

  return parameters;
}

// Compound tool words decomposition dictionary
const COMPOUND_TOOLS = {
  pdftoword: 'pdf to word',
  word2pdf: 'word to pdf',
  png2pdf: 'png to pdf',
  jpg2pdf: 'jpg to pdf',
  jpeg2pdf: 'jpeg to pdf',
  excel2pdf: 'excel to pdf',
  ppt2pdf: 'ppt to pdf',
  powerpoint2pdf: 'powerpoint to pdf',
  html2pdf: 'html to pdf',
  txt2pdf: 'txt to pdf',
  pdf2word: 'pdf to word',
  pdf2excel: 'pdf to excel',
  pdf2ppt: 'pdf to powerpoint',
  pdf2image: 'pdf to image',
  pdf2png: 'pdf to png',
  pdf2jpg: 'pdf to jpg',
  compresspdf: 'compress pdf',
  rotatepdf: 'rotate pdf',
  mergepdf: 'merge pdf',
  splitpdf: 'split pdf',
  watermarkpdf: 'watermark pdf',
  protectpdf: 'protect pdf',
  unlockpdf: 'unlock pdf',
  signpdf: 'sign pdf',
  optimizepdf: 'compress pdf'
};

// Common typos and abbreviations dictionary
const TYPO_MAP = {
  pfd: 'pdf',
  mrg: 'merge',
  cnvrt: 'convert',
  cnvert: 'convert',
  covnert: 'convert',
  comprs: 'compress',
  comprss: 'compress',
  cmprs: 'compress',
  reduc: 'compress',
  rotat: 'rotate',
  rotata: 'rotate',
  splitt: 'split',
  splt: 'split',
  prtct: 'protect',
  protct: 'protect',
  watrmrk: 'watermark',
  watermrk: 'watermark',
  excl: 'excel',
  wrd: 'word',
  pwrpnt: 'powerpoint',
  organiz: 'organize',
  unloct: 'unlock',
  unlck: 'unlock',
  pwd: 'password',
  passwd: 'password',
  esig: 'sign',
  firsta: 'first',
  splitted: 'split',
  downlaod: 'download',
  delte: 'delete',
  delet: 'delete',
  delt: 'delete',
  dlete: 'delete',
  remov: 'remove',
  rmv: 'remove',
  remve: 'remove',
  clere: 'clear',
  cler: 'clear',
  clr: 'clear'
};

/**
 * Normalizes a raw user natural-language prompt:
 * 1. Strips outer wrapping parentheses or brackets.
 * 2. Normalizes known typo phrases.
 * 3. Replaces '->', '=>', '/', '+' with spaces.
 * 4. Decomposes compound tool words (pdftoword -> pdf to word, etc.).
 * 5. Replaces shorthand numbers as prepositions ONLY between valid format terms (e.g. word 2 pdf -> word to pdf).
 * 6. Normalizes common typos and abbreviations via lookup table (pfd -> pdf, etc.).
 */
export function normalizeUserPrompt(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let text = rawText.trim();

  // Strip outer enclosing parentheses or brackets: ( ... ) -> ...
  while (
    (text.startsWith('(') && text.endsWith(')')) ||
    (text.startsWith('[') && text.endsWith(']')) ||
    (text.startsWith('{') && text.endsWith('}'))
  ) {
    text = text.slice(1, -1).trim();
  }

  // Normalize composite typo phrases
  text = text.replace(/\bfirsta\s+nd\b/gi, 'first and');

  // Replace ->, =>, /, + with spaces
  text = text.replace(/->|=>|\/|\+/g, ' ');

  // Decompose compound tool words
  for (const [compound, replacement] of Object.entries(COMPOUND_TOOLS)) {
    const re = new RegExp(`\\b${compound}\\b`, 'gi');
    text = text.replace(re, replacement);
  }

  // Normalize common typos and abbreviations via lookup table first
  text = text.replace(/\b[a-zA-Z]+\b/g, (match) => {
    const lower = match.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(TYPO_MAP, lower)) {
      return TYPO_MAP[lower];
    }
    return match;
  });

  // Replace shorthand numbers as prepositions ONLY between known conversion format words
  // e.g. "word 2 pdf" -> "word to pdf", "png2pdf" -> "png to pdf"
  // Never replace when surrounded by conjunctions/ordinals, e.g. "1 and 2 in half"
  const CONVERSION_FORMAT_WORDS = new Set([
    'pdf', 'word', 'docx', 'doc', 'excel', 'xlsx', 'xls', 'sheet', 'csv',
    'powerpoint', 'ppt', 'pptx', 'slide', 'slides', 'image', 'images', 'img', 'imgs',
    'photo', 'photos', 'pic', 'pics', 'png', 'jpg', 'jpeg', 'webp', 'html', 'htm',
    'txt', 'text', 'zip', 'bates', 'pdfa'
  ]);

  text = text.replace(/\b([a-zA-Z]+)\s+2\s+([a-zA-Z]+)\b/g, (match, p1, p2) => {
    const w1 = TYPO_MAP[p1.toLowerCase()] || p1.toLowerCase();
    const w2 = TYPO_MAP[p2.toLowerCase()] || p2.toLowerCase();
    if (CONVERSION_FORMAT_WORDS.has(w1) && CONVERSION_FORMAT_WORDS.has(w2)) {
      return `${p1} to ${p2}`;
    }
    return match;
  });
  text = text.replace(/\b([a-zA-Z]+)2([a-zA-Z]+)\b/g, (match, p1, p2) => {
    const w1 = TYPO_MAP[p1.toLowerCase()] || p1.toLowerCase();
    const w2 = TYPO_MAP[p2.toLowerCase()] || p2.toLowerCase();
    if (CONVERSION_FORMAT_WORDS.has(w1) && CONVERSION_FORMAT_WORDS.has(w2)) {
      return `${p1} to ${p2}`;
    }
    return match;
  });

  return text.replace(/\s+/g, ' ').trim();
}

// 2. Local First Dictionary & Hybrid NLP Intent Resolver
// Damerau-Levenshtein distance for fuzzy NLP matching with transposition support
function getDamerauLevenshteinDistance(a, b) {
  const al = a.length;
  const bl = b.length;
  const matrix = [];
  for (let i = 0; i <= bl; i++) matrix[i] = [i];
  for (let j = 0; j <= al; j++) matrix[0][j] = j;

  for (let i = 1; i <= bl; i++) {
    for (let j = 1; j <= al; j++) {
      const cost = a.charAt(j - 1) === b.charAt(i - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
      if (j > 1 && i > 1 && a.charAt(j - 1) === b.charAt(i - 2) && a.charAt(j - 2) === b.charAt(i - 1)) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return matrix[bl][al];
}

function stripVowels(word) {
  return word.toLowerCase().replace(/[aeiou]/g, '');
}

export function getWordSimilarity(a, b) {
  if (!a || !b) return 0;
  const sA = a.toLowerCase();
  const sB = b.toLowerCase();
  if (sA === sB) return 1;

  const distance = getDamerauLevenshteinDistance(sA, sB);
  const maxLength = Math.max(sA.length, sB.length);
  let similarity = maxLength === 0 ? 1 : 1 - distance / maxLength;

  // Add Damerau transposition distance or vowel-free stem comparison for words with length >= 3
  if (sA.length >= 3 && sB.length >= 3) {
    const cA = stripVowels(sA);
    const cB = stripVowels(sB);
    if (cA.length >= 2 && cA === cB) {
      similarity = Math.max(similarity, 0.88);
    }
  }

  return similarity;
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

export class NLPResolution extends String {
  constructor(actionId, meta = {}) {
    super(actionId || '');
    this.actionId = actionId;
    this.isAmbiguous = !!meta.isAmbiguous;
    this.candidates = meta.candidates || (actionId ? [actionId] : []);
    this.confidence = meta.confidence !== undefined ? meta.confidence : 1.0;
    this.clarificationPrompt = meta.clarificationPrompt || null;
    this.options = meta.options || [];
  }
}

export async function parseLocalNLPCommand(clauseText, activePool, selectedNodeIds = []) {
  const normalizedText = normalizeUserPrompt(clauseText);
  const text = normalizedText.toLowerCase().trim();
  const userWords = text.split(/\s+/).filter(Boolean);
  const stemmedUserWords = userWords.map(stemWord);

  // Whole-word matching helper with phrase boundary escape
  const has = (phrase) => {
    const escaped = phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  };
  const hasAny = (...phrases) => phrases.some(p => has(p));

  // ---------------------------------------------------------------------------
  // TIER 1: Exact Phrase Hits & Disambiguated Conversions (Confidence: 1.0)
  // ---------------------------------------------------------------------------
  if (/\b(?:make\s+a\s+zip|create\s+(?:a\s+)?zip|zip\s+(?:the\s+)?files?|download\s+as\s+zip|zip\s+and\s+download|make\s+(?:a\s+)?zip\s+file\s+and\s+download)\b/i.test(text)) {
    return new NLPResolution('pipeline-package-zip', { confidence: 1.0, isTerminalAction: true });
  }
  if (hasAny('pdf to word', 'to word', 'to docx', 'pdf to doc', 'convert to word', 'convert to docx') ||
      /\b(?:make\s+)?(?:each\s+of\s+)?(?:the\s+)?(?:pdf|pdfs)\s+(?:in)?to\s+(?:word|docx|doc)(?:\s+file|\s+document)?\b/i.test(text) ||
      /\bpdf\s*(?:file|document)?\s*(?:in)?to\s*(?:word|docx|doc)(?:\s+file|\s+document)?\b/i.test(text)) {
    return new NLPResolution('pdf-to-word', { confidence: 1.0 });
  }
  if (/\b(?:word|docx|doc)\s*(?:file|document)?\s*(?:in)?to\s*(?:excel|xlsx|sheet|csv)(?:\s+file|\s+document)?\b/i.test(text)) {
    // Inter-format Word to Excel conversion bridge (docx -> pdf -> excel)
    return new NLPResolution('pdf-to-excel', { confidence: 1.0, requiresBridge: 'docx-to-pdf' });
  }
  if (hasAny('pdf to excel', 'to excel', 'to sheet', 'to csv', 'pdf to sheet', 'convert to excel', 'convert to sheet') ||
      /\bpdf\s*(?:file|document)?\s*(?:in)?to\s*(?:excel|xlsx|sheet|csv)(?:\s+file|\s+document)?\b/i.test(text)) {
    return new NLPResolution('pdf-to-excel', { confidence: 1.0 });
  }
  if (hasAny('pdf to powerpoint', 'to powerpoint', 'to ppt', 'pdf to ppt', 'convert to powerpoint', 'convert to ppt') ||
      /\bpdf\s*(?:file|document)?\s*(?:in)?to\s*(?:powerpoint|pptx|ppt|slides)(?:\s+file|\s+document)?\b/i.test(text)) {
    return new NLPResolution('pdf-to-powerpoint', { confidence: 1.0 });
  }
  if (hasAny('unzip', 'decompress', 'extract zip', 'uncompress', 'unarchive', 'unpack')) {
    return new NLPResolution('unzip-file', { confidence: 1.0 });
  }
  if (hasAny('images to pdf', 'photos to pdf', 'pictures to pdf', 'image to pdf', 'jpg to pdf', 'png to pdf', 'jpeg to pdf') ||
      /\b(?:make\s+)?(?:each\s+(?:of\s+the\s+)?|all\s+(?:the\s+)?)?(?:the\s+)?(?:images?|photos?|pictures?|pngs?|jpe?gs?)\s+(?:in)?to\s+(?:separate\s+|individual\s+)?pdf(?:\s+file|\s+document)?\b/i.test(text) ||
      /\b(?:images?|photos?|pictures?)\s+(?:files?|documents?)?\s*(?:in)?to\s*pdf\b/i.test(text)) {
    return new NLPResolution('image-to-pdf', { confidence: 1.0 });
  }
  if (hasAny('pdf to image', 'pdf to images', 'to image', 'to images', 'pdf to png', 'pdf to jpg') ||
      /\b(?:make\s+)?(?:the\s+)?(?:converted\s+)?pdf\s+(?:in)?to\s+(?:images?|png|jpg)(?:\s+files?)?\b/i.test(text) ||
      /\bpdf\s*(?:file|document)?\s*(?:in)?to\s*(?:images?|png|jpg)\b/i.test(text)) {
    return new NLPResolution('pdf-to-image', { confidence: 1.0 });
  }
  if (hasAny('word to pdf', 'docx to pdf', 'convert docx', 'convert word') ||
      /\b(?:word|docx|doc)\s*(?:file|document)?\s*(?:in)?to\s*pdf(?:\s+file|\s+document)?\b/i.test(text)) {
    return new NLPResolution('docx-to-pdf', { confidence: 1.0 });
  }
  if (hasAny('excel to pdf', 'xlsx to pdf', 'csv to pdf', 'sheet to pdf') ||
      /\b(?:excel|xlsx|csv|sheet)\s*(?:file|document)?\s*(?:in)?to\s*pdf(?:\s+file|\s+document)?\b/i.test(text)) {
    return new NLPResolution('excel-to-pdf', { confidence: 1.0 });
  }
  if (hasAny('powerpoint to pdf', 'ppt to pdf', 'pptx to pdf', 'slides to pdf') ||
      /\b(?:powerpoint|pptx|ppt|slides)\s*(?:file|document)?\s*(?:in)?to\s*pdf(?:\s+file|\s+document)?\b/i.test(text)) {
    return new NLPResolution('powerpoint-to-pdf', { confidence: 1.0 });
  }
  if (hasAny('html to pdf', 'convert html to pdf', 'web to pdf', 'convert web to pdf')) {
    return new NLPResolution('html-to-pdf', { confidence: 1.0 });
  }
  if (hasAny('text to pdf', 'txt to pdf', 'md to pdf', 'markdown to pdf')) {
    return new NLPResolution('text-to-pdf', { confidence: 1.0 });
  }
  if (hasAny('unlock', 'decrypt', 'remove password', 'strip security', 'strip the security', 'remove security', 'strip password', 'unprotect')) {
    return new NLPResolution('unlock-pdf', { confidence: 1.0 });
  }

  // ---------------------------------------------------------------------------
  // TIER 1.5: Presets & Disambiguation for Generic / Parameterless Commands
  // ---------------------------------------------------------------------------
  const hasTargetFormat = hasAny(
    'to word', 'to docx', 'to doc',
    'to excel', 'to sheet', 'to csv', 'to xlsx',
    'to powerpoint', 'to ppt', 'to pptx', 'to slides',
    'to pdf',
    'to image', 'to images', 'to png', 'to jpg', 'to jpeg', 'to webp'
  );

  // Generic convert without target format
  if (hasAny('convert', 'convert document', 'convert file', 'change format') && !hasTargetFormat) {
    let targetNode = null;
    if (selectedNodeIds && selectedNodeIds.length > 0 && activePool) {
      targetNode = activePool.find(n => selectedNodeIds.includes(n.id));
    }
    if (!targetNode && activePool && activePool.length > 0) {
      targetNode = activePool[0];
    }
    const ext = targetNode ? normalizeExtension(targetNode.name || '') : '.pdf';

    if (ext === '.pdf') {
      return new NLPResolution('pdf-to-word', {
        isAmbiguous: true,
        confidence: 0.7,
        clarificationPrompt: 'Which format would you like to convert your PDF into?',
        options: [
          { label: 'Convert to Word (.docx)', actionId: 'pdf-to-word', prompt: 'convert to word' },
          { label: 'Convert to Excel (.xlsx)', actionId: 'pdf-to-excel', prompt: 'convert to excel' },
          { label: 'Convert to Images (.png)', actionId: 'pdf-to-image', prompt: 'convert to image' },
          { label: 'Convert to PowerPoint (.pptx)', actionId: 'pdf-to-powerpoint', prompt: 'convert to powerpoint' }
        ]
      });
    } else if (['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext)) {
      return new NLPResolution('image-converter', { confidence: 0.85 });
    } else if (['.docx', '.doc'].includes(ext)) {
      return new NLPResolution('docx-to-pdf', { confidence: 0.85 });
    } else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      return new NLPResolution('excel-to-pdf', { confidence: 0.85 });
    } else if (['.pptx', '.ppt'].includes(ext)) {
      return new NLPResolution('powerpoint-to-pdf', { confidence: 0.85 });
    } else if (['.html', '.htm'].includes(ext)) {
      return new NLPResolution('html-to-pdf', { confidence: 0.85 });
    } else if (['.txt', '.md'].includes(ext)) {
      return new NLPResolution('text-to-pdf', { confidence: 0.85 });
    }
  }

  // Rotate without angle or direction parameters
  const hasRotateParams = /\b(90|180|270|360|clockwise|counterclockwise|counter-clockwise|cw|ccw|left|right|flip|upside\s*down|degrees?|deg)\b/i.test(text);
  if (hasAny('rotate', 'turn', 'spin', 'rotate pdf') && !hasRotateParams) {
    return new NLPResolution('rotate-pdf', {
      isAmbiguous: true,
      confidence: 0.7,
      clarificationPrompt: 'Select rotation angle and direction:',
      options: [
        { label: 'Rotate 90° Clockwise', actionId: 'rotate-pdf', prompt: 'rotate 90 degrees clockwise' },
        { label: 'Rotate 180° (Flip)', actionId: 'rotate-pdf', prompt: 'rotate 180 degrees' },
        { label: 'Rotate 90° Counter-Clockwise', actionId: 'rotate-pdf', prompt: 'rotate 90 degrees counter-clockwise' }
      ]
    });
  }

  // Protect without password parameters
  const hasProtectParams = /["']([^"']+)["']/.test(clauseText)
    || /\b(?:password|pass|pwd|code|key)\s*[:=]?\s*\S+/i.test(text)
    || /\b(?:with|using)\s+(?:password\s+|pass\s+|pwd\s+)?([a-zA-Z0-9!@#$%^&*_-]+)/i.test(text)
    || /\bpass\w+\b/i.test(text);
  if (hasAny('protect', 'lock', 'encrypt', 'protect pdf') && !hasProtectParams) {
    return new NLPResolution('protect-pdf', {
      isAmbiguous: true,
      confidence: 0.7,
      clarificationPrompt: 'Select a protection password preset or enter one below:',
      options: [
        { label: 'Password: "secret"', actionId: 'protect-pdf', prompt: 'protect with password "secret"' },
        { label: 'Password: "confidential"', actionId: 'protect-pdf', prompt: 'protect with password "confidential"' },
        { label: 'Password: "secure"', actionId: 'protect-pdf', prompt: 'protect with password "secure"' }
      ]
    });
  }

  // Exact whole-word match across registry synonyms
  let bestExactMatch = null;
  let bestMatchLen = 0;

  for (const [actionId, meta] of Object.entries(TOOL_REGISTRY)) {
    const synonyms = meta.synonyms || [];
    for (const syn of synonyms) {
      if (has(syn)) {
        if (syn.length > bestMatchLen) {
          bestMatchLen = syn.length;
          bestExactMatch = actionId;
        }
      }
    }
  }

  if (bestExactMatch) {
    let actionId = bestExactMatch;
    // Context check: 'convert' alone on an image pool -> image format converter, not PDF
    if (actionId === 'image-converter' || actionId === 'docx-to-pdf') {
      if (has('convert')) {
        const hasImg = activePool && activePool.some(n => ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes('.' + (n.name || '').split('.').pop().toLowerCase()));
        actionId = hasImg ? 'image-converter' : 'docx-to-pdf';
      }
    }
    return new NLPResolution(actionId, { confidence: 1.0 });
  }

  // ---------------------------------------------------------------------------
  // TIER 2: Context-Gated Statistical Model Classification (TF-IDF / Cosine)
  // ---------------------------------------------------------------------------
  try {
    const prediction = await predictIntentAsync(clauseText);
    if (prediction && prediction.classLabel && prediction.classLabel !== 'unknown' && prediction.confidence > 0.50) {
      let actionId = prediction.classLabel;

      // Context gating check: verify if the candidate tool is feasible with current activePool
      let isFeasible = true;
      if (activePool && activePool.length > 0 && TOOL_REGISTRY[actionId]) {
        const targetMeta = TOOL_REGISTRY[actionId];
        const hasAcceptableInput = activePool.some(node => {
          const ext = normalizeExtension(node.name || '');
          if (targetMeta.accept.includes(ext) || (targetMeta.accept.includes('image/*') && ['.png', '.jpg', '.jpeg', '.webp'].includes(ext))) {
            return true;
          }
          const path = findConversionPath(ext, actionId);
          return path && path.length > 0;
        });

        if (!hasAcceptableInput && targetMeta.minInputs > 0) {
          isFeasible = false;
        }
      }

      if (isFeasible) {
        // Ambiguity Gating: check if top 2 candidates have close confidence
        if (prediction.ranked && prediction.ranked.length >= 2) {
          const [top1, top2] = prediction.ranked;
          if (top1.confidence - top2.confidence < 0.15 && top2.classLabel !== 'unknown') {
            const name1 = TOOL_REGISTRY[top1.classLabel]?.name || top1.classLabel;
            const name2 = TOOL_REGISTRY[top2.classLabel]?.name || top2.classLabel;
            return new NLPResolution(top1.classLabel, {
              isAmbiguous: true,
              candidates: [top1.classLabel, top2.classLabel],
              confidence: top1.confidence,
              clarificationPrompt: `Did you mean ${name1} or ${name2}?`
            });
          }
        }

        // 'convert' alone on an image pool
        if (actionId === 'image-converter' || actionId === 'docx-to-pdf') {
          if (text.includes('convert')) {
            const hasImg = activePool && activePool.some(n => ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes('.' + (n.name || '').split('.').pop().toLowerCase()));
            actionId = hasImg ? 'image-converter' : 'docx-to-pdf';
          }
        }
        return new NLPResolution(actionId, { confidence: prediction.confidence });
      }
    }
  } catch (err) {
    console.error('[Classifier Error] Classifier prediction failed:', err);
  }

  // Context-directed resolution for generic 'convert' / 'change format' when no specific target is named
  if (hasAny('convert', 'convert document', 'convert file', 'change format') && !hasAny('to word', 'to excel', 'to powerpoint', 'to pdf', 'to image', 'to png', 'to jpg')) {
    if (activePool && activePool.length > 0) {
      const ext = normalizeExtension(activePool[0].name || '');
      if (['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext)) {
        return new NLPResolution('image-converter', { confidence: 0.85 });
      }
      if (['.docx', '.doc'].includes(ext)) {
        return new NLPResolution('docx-to-pdf', { confidence: 0.85 });
      }
      if (['.xlsx', '.xls', '.csv'].includes(ext)) {
        return new NLPResolution('excel-to-pdf', { confidence: 0.85 });
      }
      if (['.pptx', '.ppt'].includes(ext)) {
        return new NLPResolution('powerpoint-to-pdf', { confidence: 0.85 });
      }
      if (['.html', '.htm'].includes(ext)) {
        return new NLPResolution('html-to-pdf', { confidence: 0.85 });
      }
      if (['.txt', '.md'].includes(ext)) {
        return new NLPResolution('text-to-pdf', { confidence: 0.85 });
      }
      if (ext === '.pdf') {
        return new NLPResolution('pdf-to-word', {
          isAmbiguous: true,
          confidence: 0.7,
          clarificationPrompt: 'Which format would you like to convert your PDF into?',
          options: [
            { label: 'Convert to Word (.docx)', actionId: 'pdf-to-word', prompt: 'convert to word' },
            { label: 'Convert to Excel (.xlsx)', actionId: 'pdf-to-excel', prompt: 'convert to excel' },
            { label: 'Convert to Images (.png)', actionId: 'pdf-to-image', prompt: 'convert to image' },
            { label: 'Convert to PowerPoint (.pptx)', actionId: 'pdf-to-powerpoint', prompt: 'convert to powerpoint' }
          ]
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // TIER 3: Adjacency-Guarded Fuzzy Matching (Min word length >= 3)
  // ---------------------------------------------------------------------------
  const matchesSynonymFuzzy = (synonym) => {
    const rawSynWords = synonym.toLowerCase().split(/\s+/).filter(Boolean);
    if (rawSynWords.length === 0) return false;
    return rawSynWords.every(synW => {
      if (synW.length < 3) {
        return userWords.includes(synW);
      }
      const stemmedSynW = stemWord(synW);
      return stemmedUserWords.some(userW => {
        if (userW.length < 3) return false;
        if (userW === stemmedSynW) return true;
        if (getWordSimilarity(userW, stemmedSynW) >= 0.75) return true;
        return false;
      });
    });
  };

  for (const [actionId, meta] of Object.entries(TOOL_REGISTRY)) {
    if (meta.synonyms.some(matchesSynonymFuzzy)) {
      let resolvedId = actionId;
      if (resolvedId === 'image-converter' || resolvedId === 'docx-to-pdf') {
        if (text.includes('convert')) {
          const hasImg = activePool && activePool.some(n => ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes('.' + (n.name || '').split('.').pop().toLowerCase()));
          resolvedId = hasImg ? 'image-converter' : 'docx-to-pdf';
        }
      }
      return new NLPResolution(resolvedId, { confidence: 0.75 });
    }
  }

  return null;
}

/**
 * Computes a structural topology signature of the canvas state.
 * Gates storage persistence (e.g. IndexedDB saves) strictly to topological changes
 * (node positions, connections, parameters, tools) while permanently decoupling
 * storage serialization from runtime progress ticks (progress 0-100%).
 */
export function computeStructuralTopologyHash(workspaceQueue = [], operations = [], panOffset = { x: 0, y: 0 }, zoom = 1, autoFitViewport = true) {
  const qHash = (workspaceQueue || []).map(f => `${f.id}:${f.name}:${f.status}:${Math.round(f.x || 0)}:${Math.round(f.y || 0)}`).join('|');
  const opHash = (operations || []).map(o => `${o.id}:${o.toolId}:${o.status === 'completed' ? 'done' : 'pending'}:${Math.round(o.x || 0)}:${Math.round(o.y || 0)}:${(o.inputIds || []).join(',')}:${o.outputId}:${JSON.stringify(o.params || {})}`).join('|');
  return `${qHash}__${opHash}__${Math.round(panOffset?.x || 0)},${Math.round(panOffset?.y || 0)}__${zoom}__${autoFitViewport}`;
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
      let upstreamOp = null;
      let outputType = null;
      if (!inputNode) {
        // Could be an upstream operator output placeholder
        upstreamOp = operations.find(o => o.id === inputId);
        if (upstreamOp) {
          const upMeta = TOOL_REGISTRY[upstreamOp.toolId];
          const outExt = upMeta?.outExt || '.pdf';
          outputType = upMeta?.outputType || null;
          inputNode = { id: upstreamOp.id, name: `output${outExt}`, type: 'op', outputType };
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
      const ext = normalizeExtension(filename);

      // Check format compatibility (Graph Type Safety)
      const acceptedExtensions = registry.accept || [];
      const acceptsDirectly = acceptedExtensions.length === 0 || ext === '.*' || acceptedExtensions.some(acc => {
        if (acc === 'image/*') {
          return ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tiff'].includes(ext);
        }
        return acc.toLowerCase() === ext.toLowerCase();
      });

      if (!acceptsDirectly) {
        // Source descriptor: prioritize typed output contract if coming from upstream operator
        const sourceDesc = inputNode.outputType || (ext === '.zip' ? { type: 'archive', contains: 'any' } : ext);
        const conversionPath = findConversionPath(sourceDesc, op.toolId);

        if (conversionPath && conversionPath.length > 0) {
          const suggestedToolId = conversionPath[0];
          const suggestedToolName = TOOL_REGISTRY[suggestedToolId]?.name || suggestedToolId;
          const isMultiStep = conversionPath.length > 1;
          const pathNames = conversionPath.map(t => TOOL_REGISTRY[t]?.name || t).join(' -> ');

          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: isMultiStep
              ? `File '${filename}' requires ${conversionPath.length}-step conversion to '${registry.name}' (${pathNames}).`
              : `File '${filename}' requires conversion to '${registry.name}'. Auto-healing via '${suggestedToolName}'.`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            suggestedToolId,
            suggestedToolName,
            conversionPath
          });
        } else {
          // General format mismatch without known auto-heal path
          issues.push({
            id: `err-${op.id}-${inputId}`,
            type: 'format-mismatch',
            message: `File '${filename}' of type '${ext}' is not supported by operator '${registry.name}' (${acceptedExtensions.join(', ')}).`,
            fileId: inputId,
            opId: op.id,
            fileName: filename,
            expected: acceptedExtensions
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
  let injectX = Math.round((fileX + targetOp.x) / 2);
  let injectY = Math.round((fileY + targetOp.y) / 2);

  // Avoid overlap with any existing operator
  while (operations.some(o => Math.abs((o.x || 100) - injectX) < 180 && Math.abs((o.y || 100) - injectY) < 100)) {
    injectY += 120;
  }

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

export const CARDINAL_WORDS = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
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
export function resolveDocumentTargets(clauseText, activePool, initialSourceNodes = []) {
  if (!clauseText || !activePool || activePool.length === 0) {
    return { included: [], excluded: [], resolved: false };
  }

  const lower = clauseText.toLowerCase().trim();

  // Sort pool by left-to-right X position so leftmost = 1st
  const sorted = [...activePool].sort((a, b) => (a.x || 0) - (b.x || 0));
  const sourceNodes = sorted.filter(n => !n.id.startsWith('ws-out-') && !n.id.startsWith('output:'));
  const outputNodes = sorted.filter(n => n.id.startsWith('ws-out-') || n.id.startsWith('output:'));
  const allOrdered = [...sourceNodes, ...outputNodes];

  const sortedInitial = (initialSourceNodes && initialSourceNodes.length > 0)
    ? [...initialSourceNodes].sort((a, b) => (a.x || 0) - (b.x || 0))
    : [];

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

  // 1. Compound / Multi-target Special Token Resolution
  const hasMergedPdf = /\b(?:the\s+)?first\s+merged(?:\s+(?:pdf|document|file))?\b/i.test(lower) || /\bthe\s+merged\s+(?:pdf|document|file)\b/i.test(lower);
  const hasSplitHalves = /\b(?:the\s+)?first\s+half\s+of\s+(?:the\s+)?(?:(?:two|\d+)\s+)?(?:split|splitted)\b/i.test(lower);
  const hasImgToPdfTargets = /\beach\s+of\s+the\s+pdfs?\b/i.test(lower) || /\ball\s+the\s+pdfs?\b/i.test(lower) || (/\bthe\s+pdf\b/i.test(lower) && activePool.some(n => n.toolId === 'image-to-pdf' || (n.id || '').includes('image-to-pdf')));
  const hasImageTargets = /\beach\s+(?:of\s+the\s+)?(?:images?|pngs?|jpe?gs?|files?|photos?|pictures?)\b/i.test(lower) ||
    /\ball\s+(?:the\s+)?(?:images?|pngs?|jpe?gs?|files?|photos?|pictures?)\b/i.test(lower) ||
    /\b(?:all|every)\s+(?:images?|pngs?|jpe?gs?|photos?|pictures?)\b/i.test(lower);

  if (hasSplitHalves || hasMergedPdf || hasImgToPdfTargets || hasImageTargets) {
    const included = [];
    if (hasSplitHalves) {
      const isSplitNode = n => (n.name || '').toLowerCase().includes('split') || n.toolId === 'split-pdf' || (n.id || '').toLowerCase().includes('split') || (n.name || '').toLowerCase().includes('part');
      const splitNodes = activePool.filter(isSplitNode);
      if (splitNodes.length > 0) {
        const firstParts = splitNodes.filter(n => {
          const name = (n.name || '').toLowerCase();
          return /(?:part[_\s-]?1\b|split[_\s-]?1\b|page[_\s-]?1\b|_1\.)/i.test(name);
        });
        if (firstParts.length > 0) {
          included.push(...firstParts);
        } else if (splitNodes.length >= 4) {
          for (let i = 0; i < splitNodes.length; i += 2) {
            included.push(splitNodes[i]);
          }
        } else if (splitNodes.length === 2) {
          if (/\b(?:two|both)\s+(?:split|splitted)\b/i.test(lower)) {
            included.push(...splitNodes);
          } else {
            included.push(splitNodes[0]);
          }
        } else {
          included.push(splitNodes[0]);
        }
      }
    }
    if (hasMergedPdf) {
      const isMergeNode = n => (n.name || '').toLowerCase().includes('merge') || n.toolId === 'merge-pdf' || (n.id || '').toLowerCase().includes('merge');
      const earliestMerged = activePool.find(isMergeNode);
      if (earliestMerged && !included.some(n => n.id === earliestMerged.id)) {
        included.push(earliestMerged);
      }
    }
    if (hasImgToPdfTargets) {
      const isImgToPdf = n => (
        n.toolId === 'image-to-pdf' ||
        (n.id || '').toLowerCase().includes('image-to-pdf') ||
        (n.name || '').toLowerCase().includes('image-to-pdf')
      );
      const imgToPdfOutputs = activePool.filter(isImgToPdf);
      if (imgToPdfOutputs.length > 0) {
        if (/\beach\s+of\s+the\s+pdfs?\b/i.test(lower) || /\ball\s+the\s+pdfs?\b/i.test(lower)) {
          imgToPdfOutputs.forEach(node => {
            if (!included.some(n => n.id === node.id)) included.push(node);
          });
        } else if (/\bthe\s+pdf\b/i.test(lower)) {
          const lastPdf = imgToPdfOutputs[imgToPdfOutputs.length - 1];
          if (!included.some(n => n.id === lastPdf.id)) included.push(lastPdf);
        }
      }
    }
    if (hasImageTargets) {
      const isImgNode = n => {
        const ext = '.' + (n.name || '').split('.').pop().toLowerCase();
        return isImage(ext) || n.toolId === 'pdf-to-image' || (n.id || '').toLowerCase().includes('pdf-to-image');
      };
      const imgOutputs = activePool.filter(isImgNode);
      if (imgOutputs.length > 0) {
        imgOutputs.forEach(node => {
          if (!included.some(n => n.id === node.id)) included.push(node);
        });
      }
    }
    if (included.length > 0) {
      return { included, excluded: [], resolved: true };
    }
    return { included: [], excluded: [], resolved: false };
  }

  if (/\bthe\s+(?:output|result|converted|merged)\b/.test(lower) && outputNodes.length > 0) {
    return { included: [outputNodes[outputNodes.length - 1]], excluded: [], resolved: true };
  }

  // ------------------------------------------------------------------
  // Unified Ordered Target Scanning (Ordinals, Cardinals & Raw Digits)
  // Scans all candidate targets and processes them strictly in the
  // left-to-right order the user typed them in the prompt string.
  // ------------------------------------------------------------------
  const included = [];
  const excluded = [];
  let anyOrdinalFound = false;

  const EXCL_SINGLE = ['not', 'except', 'skip', 'exclude', 'ignore', 'without', "don't", 'dont', 'minus'];
  const EXCL_TWO = ['but not', 'except the', 'skip the', 'exclude the', 'without the', 'not the', "don't include", 'dont include', 'except for'];
  const EXCL_THREE = ['except for the', 'but not the'];

  const candidateMatches = [];

  // 1. Ordinal words (first, 1st, second, 2nd, etc.)
  const ordinalKeys = Object.keys(ORDINALS);
  const ordinalRe = new RegExp(`\\b(${ordinalKeys.join('|')})\\b`, 'gi');
  let match;
  while ((match = ordinalRe.exec(lower)) !== null) {
    const ordinalWord = match[1].toLowerCase();
    const oneBasedIdx = ORDINALS[ordinalWord];
    if (oneBasedIdx) {
      const textAfterWord = lower.slice(match.index + match[0].length).trim();
      const textBeforeWord = lower.slice(0, match.index).trimEnd();
      if (/^half\s+of\b/i.test(textAfterWord)) {
        continue; // Fractional descriptor (e.g. "first half of"), not a document target
      }
      if (/\b\d+\s*(?:%|\s*percent)?\s*(?:on\s+the|in\s+the|on|in)$/i.test(textBeforeWord) || /\b\d+\s*(?:%|\s*percent)?$/i.test(textBeforeWord)) {
        continue; // Ratio parameter descriptor (e.g. "70 on the first"), not a document target
      }
      candidateMatches.push({
        index: match.index,
        len: match[0].length,
        val: oneBasedIdx,
        isOrdinalWord: true
      });
    }
  }

  // 2. Cardinal words (one, two, three...) when preceded/followed by file indicators or in merge context
  const cardinalKeys = Object.keys(CARDINAL_WORDS);
  const cardinalRe = new RegExp(`\\b(${cardinalKeys.join('|')})\\b`, 'gi');
  while ((match = cardinalRe.exec(lower)) !== null) {
    const word = match[1].toLowerCase();
    const val = CARDINAL_WORDS[word];
    if (!val || val > allOrdered.length) continue;

    // Avoid duplicate if an ordinal already covered this exact spot
    if (candidateMatches.some(m => Math.abs(m.index - match.index) < 2)) continue;

    const textBefore = lower.slice(0, match.index).trimEnd();
    const wordsBefore = textBefore.split(/\s+/).filter(Boolean);
    const prevWord = wordsBefore[wordsBefore.length - 1] || '';
    const prevTwoWords = wordsBefore.slice(-2).join(' ');

    const textAfter = lower.slice(match.index + word.length).trim();
    const nextWord = textAfter.split(/\s+/)[0] || '';

    const isPrecededByIndicator = 
      /^(?:the|documents?|files?|pdfs?|images?|outputs?|results?|no\.?|number|and|to|with|or|except|skip)$/.test(prevWord) ||
      prevWord.endsWith(',') ||
      /^(?:but\s+not|except\s+the|skip\s+the|to\s+the|and\s+the)$/.test(prevTwoWords);

    const isSucceededByIndicator = /^(?:documents?|files?|pdfs?|images?|outputs?|results?)$/.test(nextWord);
    const isMergeContext = /\b(?:merge|combine|join|stitch|compare|diff)\b/.test(lower);

    if (isPrecededByIndicator || isSucceededByIndicator || (isMergeContext && val <= allOrdered.length)) {
      candidateMatches.push({
        index: match.index,
        len: match[0].length,
        val: val,
        isCardinalWord: true
      });
    }
  }

  // 3. Raw digit scanning (e.g. "merge 5 and 1", "to 1")
  const digitRe = /\b(\d+)\b/g;
  while ((match = digitRe.exec(lower)) !== null) {
    const numStr = match[1];
    const val = parseInt(numStr);
    if (isNaN(val) || val <= 0 || val > allOrdered.length) continue;

    // Avoid duplicate if an ordinal like "1st" already covered this position
    if (candidateMatches.some(m => Math.abs(m.index - match.index) < 3)) continue;

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
      candidateMatches.push({
        index: match.index,
        len: match[0].length,
        val: val,
        isDigit: true
      });
    }
  }

  // Sort ALL matches strictly by character position in the user's prompt!
  candidateMatches.sort((a, b) => a.index - b.index);

  for (const cMatch of candidateMatches) {
    anyOrdinalFound = true;
    const val = cMatch.val;
    const zeroIdx = val - 1;

    const textBefore = lower.slice(0, cMatch.index).trimEnd();
    const wordsBefore = textBefore.split(/\s+/).filter(Boolean);
    const prevWord = wordsBefore[wordsBefore.length - 1] || '';
    const prevTwoWords = wordsBefore.slice(-2).join(' ');

    const textAfter = lower.slice(cMatch.index + cMatch.len).trim();
    const nextWord = textAfter.split(/\s+/)[0] || '';

    const prevThreeWords = wordsBefore.slice(-3).join(' ');

    const isExcluded =
      EXCL_SINGLE.some(t => prevWord === t) ||
      EXCL_TWO.some(t => prevTwoWords === t) ||
      EXCL_THREE.some(t => prevThreeWords === t);

    const isOutputQualifier = /^(?:the\s+)?(?:outputs?|results?|converted|merged|split|unzipped|processed|done)\b/.test(textAfter) ||
                              /^(?:outputs?|results?|converted|merged|split|unzipped|processed|done)$/.test(prevWord);

    // Quantity count (e.g. "these 3 files", "first 3 documents", "two split files")
    const isQuantityCount = !cMatch.isOrdinalWord && (
      /^(?:(?:split|merged|converted|processed)\s+)?(?:documents|files|pdfs|images|outputs|results)\b/i.test(textAfter) ||
      /^(?:documents|files|pdfs|images|outputs|results)$/i.test(nextWord) ||
      /^(?:these|those|all)$/i.test(prevWord)
    );

    if (isQuantityCount) {
      let poolToSlice = isOutputQualifier ? outputNodes : allOrdered;
      if (isOutputQualifier) {
        if (/\bsplit\b/i.test(textAfter) || /\bsplit\b/i.test(prevWord)) {
          const splitOnly = outputNodes.filter(n => (n.name || '').includes('split') || (n.id || '').includes('split'));
          if (splitOnly.length > 0) poolToSlice = splitOnly;
        } else if (/\bmerged?\b/i.test(textAfter) || /\bmerged?\b/i.test(prevWord)) {
          const mergeOnly = outputNodes.filter(n => (n.name || '').includes('merge') || (n.id || '').includes('merge'));
          if (mergeOnly.length > 0) poolToSlice = mergeOnly;
        }
      }
      for (let q = 0; q < Math.min(val, poolToSlice.length); q++) {
        const qNode = poolToSlice[q];
        if (isExcluded) {
          if (!excluded.some(n => n.id === qNode.id)) excluded.push(qNode);
          const incIdx = included.findIndex(n => n.id === qNode.id);
          if (incIdx !== -1) included.splice(incIdx, 1);
        } else {
          if (!included.some(n => n.id === qNode.id) && !excluded.some(n => n.id === qNode.id)) included.push(qNode);
        }
      }
      continue;
    }

    let targetNode = null;
    if (isOutputQualifier) {
      let candidateOutputs = outputNodes;
      if (/\bmerged?\b/i.test(textAfter) || /\bmerged?\b/i.test(prevWord)) {
        const mergeOnly = outputNodes.filter(n => (n.name || '').includes('merge') || (n.id || '').includes('merge'));
        if (mergeOnly.length > 0) candidateOutputs = mergeOnly;
      } else if (/\bsplit\b/i.test(textAfter) || /\bsplit\b/i.test(prevWord)) {
        const splitOnly = outputNodes.filter(n => (n.name || '').includes('split') || (n.id || '').includes('split'));
        if (splitOnly.length > 0) candidateOutputs = splitOnly;
      }
      if (zeroIdx >= 0 && zeroIdx < candidateOutputs.length) {
        targetNode = candidateOutputs[zeroIdx];
      }
    } else {
      if (sortedInitial.length > 0 && zeroIdx >= 0 && zeroIdx < sortedInitial.length) {
        const candidate = sortedInitial[zeroIdx];
        if (activePool.some(n => n.id === candidate.id)) {
          targetNode = activePool.find(n => n.id === candidate.id);
        } else {
          targetNode = candidate;
        }
      }
      if (!targetNode) {
        if (zeroIdx >= 0 && zeroIdx < allOrdered.length) {
          targetNode = allOrdered[zeroIdx];
        } else if (zeroIdx >= 0 && zeroIdx < sourceNodes.length) {
          targetNode = sourceNodes[zeroIdx];
        }
      }
    }

    if (targetNode) {
      const isAlreadyIncluded = included.some(n => n.id === targetNode.id);
      const isAlreadyExcluded = excluded.some(n => n.id === targetNode.id);

      if (isExcluded) {
        if (!isAlreadyExcluded) excluded.push(targetNode);
        const incIdx = included.findIndex(n => n.id === targetNode.id);
        if (incIdx !== -1) included.splice(incIdx, 1);
      } else {
        if (!isAlreadyIncluded && !excluded.some(n => n.id === targetNode.id)) {
          included.push(targetNode);
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

  // "the last [N]" / "the last document" / "the first [N]" shorthand
  const isRatioSplit = /\b\d+\s*(?:%|percent)?\s*(?:on\s+the\s+)?(?:first|last)\b/i.test(lower);
  const lastMatch = !isRatioSplit && lower.match(/\b(?:the\s+last(?:\s+(\d+|two|three|four|five))?|last\s+(\d+|two|three|four|five)|last\s+(?:documents?|files?|pdfs?|images?|outputs?|results?|ones?))\b/);
  const firstNMatch = !isRatioSplit && lower.match(/\b(?:the\s+)?first\s+(\d+|two|three|four|five)\b/);
  const countWords = { 'two': 2, 'three': 3, 'four': 4, 'five': 5 };

  if (lastMatch && !anyOrdinalFound) {
    let n = 1;
    const countMatch = lastMatch[0].match(/\b(\d+|two|three|four|five)\b/);
    if (countMatch) {
      const countVal = countMatch[1];
      n = isNaN(countVal) ? (countWords[countVal] || 1) : parseInt(countVal);
    }
    const isOutputQualifier = /\b(?:outputs?|results?)\b/.test(lastMatch[0]);
    const poolToUse = isOutputQualifier && outputNodes.length > 0 ? outputNodes : allOrdered;

    const textBefore = lower.slice(0, lastMatch.index).trimEnd();
    const wordsBefore = textBefore.split(/\s+/).filter(Boolean);
    const prevWord = wordsBefore[wordsBefore.length - 1] || '';
    const prevTwoWords = wordsBefore.slice(-2).join(' ');
    const isExcluded =
      EXCL_SINGLE.some(t => prevWord === t) ||
      EXCL_TWO.some(t => prevTwoWords === t);

    const start = Math.max(0, poolToUse.length - n);
    for (let i = start; i < poolToUse.length; i++) {
      const targetNode = poolToUse[i];
      if (isExcluded) {
        if (!excluded.some(x => x.id === targetNode.id)) {
          excluded.push(targetNode);
        }
      } else {
        if (!included.some(x => x.id === targetNode.id)) {
          included.push(targetNode);
        }
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
    { patterns: ['to word', 'to docx', 'to doc', 'word format', 'word document'], regex: /\b(?:to\s+word|to\s+docx|to\s+doc|word\s+format|word\s+document|(?:and|or|,)\s*(?:to\s+)?(?:word|docx))\b/i, tool: 'pdf-to-word' },
    { patterns: ['to excel', 'to xlsx', 'to xls', 'to csv', 'excel format', 'spreadsheet'], regex: /\b(?:to\s+excel|to\s+xlsx|to\s+xls|to\s+csv|excel\s+format|spreadsheet|(?:and|or|,)\s*(?:to\s+)?(?:excel|xlsx|csv|sheet))\b/i, tool: 'pdf-to-excel' },
    { patterns: ['to powerpoint', 'to pptx', 'to ppt', 'powerpoint format', 'presentation'], regex: /\b(?:to\s+powerpoint|to\s+pptx|to\s+ppt|powerpoint\s+format|presentation|(?:and|or|,)\s*(?:to\s+)?(?:powerpoint|pptx|ppt))\b/i, tool: 'pdf-to-powerpoint' },
    { patterns: ['to png', 'to jpg', 'to jpeg', 'to image', 'to images', 'to pictures'], regex: /\b(?:to\s+png|to\s+jpg|to\s+jpeg|to\s+images?|to\s+pictures?|(?:and|or|,)\s*(?:to\s+)?(?:images?|png|jpg|jpeg))\b/i, tool: 'pdf-to-image' },
    // Note: 'compress', 'rotate', 'ocr', 'watermark', 'page numbers', 'protect' are included for
    // multi-tool fan-outs like "compress and rotate" or "compress and protect" — but only activate if a companion
    // tool is ALSO found in the same clause (enforced by the matchedTools.length >= 2 guard).
    { patterns: ['compress', 'shrink', 'reduce size'], regex: /\b(?:compress|shrink|reduce\s+size)\b/i, tool: 'compress-pdf' },
    { patterns: ['rotate', 'turn', 'flip'], regex: /\b(?:rotate|turn|flip)\b/i, tool: 'rotate-pdf' },
    { patterns: ['ocr', 'make searchable', 'recognize text'], regex: /\b(?:ocr|make\s+searchable|recognize\s+text)\b/i, tool: 'ocr-pdf' },
    { patterns: ['watermark', 'stamp'], regex: /\b(?:watermark|stamp)\b/i, tool: 'add-watermark' },
    { patterns: ['page numbers', 'paginate', 'number pages'], regex: /\b(?:page\s+numbers|paginate|number\s+pages)\b/i, tool: 'add-page-numbers' },
    { patterns: ['protect', 'encrypt', 'password'], regex: /\b(?:protect|encrypt|password)\b/i, tool: 'protect-pdf' },
  ];

  const matchedTools = [];
  for (const entry of FORMAT_TOOL_MAP) {
    const matched = entry.patterns.some(p => lower.includes(p)) || (entry.regex && entry.regex.test(lower));
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

  // Guard 3: If different parts of the clause reference different document targets (e.g. "compress the 3rd and rotate the 1st"),
  // this is a distributed multi-target command, NOT a parallel fan-out on the same input.
  const targetPattern = /(?:(?:the\s+)?(?:\d+(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)|(?:file|doc|document)\s+(?:\d+|[a-z]+))/i;
  const parts = lower.split(/\b(?:and|also|plus)\b|,/);
  if (parts.length >= 2) {
    const partsWithTargets = parts.filter(p => targetPattern.test(p));
    if (partsWithTargets.length >= 2) {
      return null; // Distinct targets per tool -> delegate to clause splitter
    }
  }

  return matchedTools;
}

// =============================================================================
// 5. CANVAS REACTIVITY & OPERATION COMPILER PIPELINE
// =============================================================================

/**
 * Calculates safe, non-colliding (x, y) coordinates for canvas nodes.
 * Automatically shifts down in 160px increments if a spatial overlap (< 250px X, < 150px Y) is detected.
 */
export function getNonCollidingCoords(initialX, initialY, existingNodes = []) {
  let opX = initialX;
  let opY = initialY;
  let collision = true;
  let iterations = 0;

  while (collision && iterations < 100) {
    collision = false;
    iterations++;

    for (const node of existingNodes) {
      const dx = Math.abs((node.x || 100) - opX);
      const dy = Math.abs((node.y || 100) - opY);
      if (dx < 250 && dy < 150) {
        collision = true;
        break;
      }
    }
    if (collision) {
      opY += 160;
    }
  }
  return { x: opX, y: opY };
}

/**
 * Plans a canvas workflow from a natural language prompt command.
 * Analyzes graphState, decomposes multi-step connectors, detects parallel fan-outs,
 * resolves document targets and pronouns, and compiles an ordered sequence of operations.
 */
export async function planCanvasWorkflow(cmd, graphState = [], lastActiveNodesList = [], selectedNodeIds = []) {
  if (!cmd || typeof cmd !== 'string' || !cmd.trim()) {
    return { confidence_score: 0.0, clarification_needed: 'Empty command', operations: [] };
  }

  // Universal rewrite of distributed parallel tool clauses
  let rewrittenCmd = normalizeUserPrompt(cmd);
  const verbs = [
    'merge', 'combine', 'join', 'stitch', 'split', 'cut', 'divide', 'compress', 'shrink', 'reduce',
    'squish', 'censor', 'blackout',
    'rotate', 'turn', 'spin', 'protect', 'lock', 'encrypt', 'unlock', 'decrypt', 'ocr', 'recognize',
    'sign', 'watermark', 'stamp', 'paginate', 'remove', 'delete', 'crop', 'edit', 'qr', 'convert',
    'make',
    'summarize', 'explain', 'unzip', 'unarchive', 'decompress', 'expand', 'scan', 'redact', 'repair',
    'translate', 'fill', 'number', 'extract', 'organize', 'annotate', 'compare'
  ];
  const ordinalWordsPattern = '(?:\\d+(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)';
  const relPattern = '(?:to|with)';
  const verbsPattern = `(?:${verbs.join('|')})`;

  const firstVerbMatch = rewrittenCmd.match(new RegExp(`\\b(${verbsPattern})\\b`, 'i'));
  if (firstVerbMatch) {
    const verb = firstVerbMatch[1];
    const pairs = [];
    const globalPairRe = new RegExp(`\\b(${ordinalWordsPattern}\\s+${relPattern}\\s+${ordinalWordsPattern})\\b`, 'gi');
    let pMatch;
    while ((pMatch = globalPairRe.exec(rewrittenCmd)) !== null) {
      pairs.push(pMatch[1]);
    }

    if (pairs.length > 1) {
      const firstPairIndex = rewrittenCmd.toLowerCase().indexOf(pairs[0].toLowerCase());
      const prefix = rewrittenCmd.slice(0, firstPairIndex);

      const lastPairIndex = rewrittenCmd.toLowerCase().lastIndexOf(pairs[pairs.length - 1].toLowerCase());
      const restOfString = rewrittenCmd.slice(lastPairIndex + pairs[pairs.length - 1].length);

      const rewrittenPairs = pairs.map((p, idx) => {
        if (idx === 0) return `${prefix}${p}`;
        return `${verb} ${p}`;
      });

      rewrittenCmd = rewrittenPairs.join(' and then ') + restOfString;
    }
  }

  // Extract nested past-participle operations (e.g., "4th and 3rd merged" -> "merge 4th and 3rd")
  const getBaseVerb = (verbEd) => {
    const v = verbEd.toLowerCase();
    if (v.startsWith('merg')) return 'merge';
    if (v.startsWith('combin')) return 'combine';
    if (v.startsWith('join')) return 'join';
    if (v.startsWith('stitch')) return 'stitch';
    if (v.startsWith('compress') || v.startsWith('shrunk') || v.startsWith('shrink') || v.startsWith('squish')) return 'compress';
    if (v.startsWith('rotat') || v.startsWith('turn')) return 'rotate';
    if (v.startsWith('protect') || v.startsWith('lock')) return 'protect';
    if (v.startsWith('unlock') || v.startsWith('decrypt')) return 'unlock';
    if (v.startsWith('convert')) return 'convert';
    if (v.startsWith('split') || v.startsWith('divid')) return 'split';
    if (v.startsWith('censor') || v.startsWith('redact')) return 'redact';
    return 'process';
  };

  const pastParticipleRe = new RegExp(`(?:the\\s+)?(${ordinalWordsPattern}(?:(?:\\s+(?:to|with|and|,|\\s)\\s+)*${ordinalWordsPattern})*)\\s+(merged|combined|joined|stitched|compressed|shrunk|rotated|protected|unlocked|converted)(?!\\s+(?:pdfs?|files?|documents?|docs?|images?|outputs?))\\b`, 'gi');

  let ppMatch;
  const prefixSteps = [];
  let tempCmdForRegex = rewrittenCmd;
  while ((ppMatch = pastParticipleRe.exec(tempCmdForRegex)) !== null) {
    const fullMatch = ppMatch[0];
    const targets = ppMatch[1];
    const verbEd = ppMatch[2];
    const baseVerb = getBaseVerb(verbEd);
    prefixSteps.push(`${baseVerb} ${targets}`);
    rewrittenCmd = rewrittenCmd.replace(fullMatch, 'the output');
  }

  if (prefixSteps.length > 0) {
    rewrittenCmd = prefixSteps.join(' and then ') + ' and then ' + rewrittenCmd;
  }

  const vPat = verbs.join('|');
  const pattern = new RegExp(
    `\\b(?:and\\s+then|then|after\\s+that|next|followed\\s+by|and\\s+finally|lastly|subsequently)\\b` +
    `|\\b(?:and|to)\\b(?=\\s*(?:run\\s+|do\\s+|go\\s+)?(?:${vPat}|each|every|individually|separately))` +
    `|\\bafter\\b(?=\\s+(?:${vPat}))` +
    `|\\s*,\\s*(?=\\s*(?:run\\s+|do\\s+|go\\s+)?(?:${vPat}))` +
    `|\\s*;\\s*` +
    `|\\s*\\/\\s*(?=(?:${vPat}))` +
    `|\\bstep\\s+\\d+\\s*[:.)]\\s*` +
    `|\\.\\s+(?=(?:${vPat}))`
    , 'i');

  const fanOutAtTopLevel = detectFanOutTools(rewrittenCmd);
  const rawClauses = fanOutAtTopLevel
    ? [rewrittenCmd]
    : rewrittenCmd.split(pattern).map(p => p.trim()).filter(Boolean);

  const clauses = rawClauses;
  const ops = [];
  let stepIdx = 0;
  let activePool = [...graphState];

  for (const clause of clauses) {
    const fanOutTools = detectFanOutTools(clause);
    if (fanOutTools) {
      const ditResult = resolveDocumentTargets(clause, activePool, graphState);
      let baseMatches = activePool.filter(node => {
        const ext = '.' + (node.name || '').split('.').pop().toLowerCase();
        return ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'].some(e => e === ext);
      });
      if (ditResult.resolved && ditResult.included.length > 0) {
        baseMatches = ditResult.included;
      } else if (selectedNodeIds && selectedNodeIds.length > 0) {
        const sel = activePool.filter(n => selectedNodeIds.includes(n.id) && ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'].some(e => e === '.' + (n.name || '').split('.').pop().toLowerCase()));
        if (sel.length > 0) baseMatches = sel;
      }
      if (baseMatches.length === 0) baseMatches = activePool.slice(-1);

      fanOutTools.forEach((toolId, fanIdx) => {
        const validation = TOOL_REGISTRY[toolId];
        if (!validation) return;
        const targetInputs = validation.maxInputs === 1
          ? [baseMatches[baseMatches.length - 1]]
          : baseMatches;
        const parameters = extractCommandParameters(toolId, clause);
        if (needsStudioParams(toolId)) {
          parameters.initialNlpPrompt = clause;
        }
        ops.push({
          tool_id: toolId,
          target_node_ids: targetInputs.map(ti => ti.id),
          parameters
        });
        const outExt = validation.outExt || '.pdf';
        activePool.push({
          id: `output:${stepIdx}-fan${fanIdx}`,
          name: `${toolId}_output${outExt}`,
          type: 'op',
          status: 'completed',
          ancestry: [...targetInputs.flatMap(ti => ti.ancestry || []), `output:${stepIdx}-fan${fanIdx}`]
        });
      });
      stepIdx++;
      continue;
    }

    const actionId = await parseLocalNLPCommand(clause, activePool, selectedNodeIds);
    if (!actionId) continue;

    if (actionId === 'pipeline-package-zip' || actionId?.isTerminalAction) {
      if (ops.length > 0) {
        ops[ops.length - 1].parameters = {
          ...(ops[ops.length - 1].parameters || {}),
          packageAsZip: true,
          download: true
        };
      }
      continue;
    }

    if (actionId.isAmbiguous) {
      return {
        confidence_score: actionId.confidence || 0.7,
        isAmbiguous: true,
        clarification_needed: actionId.clarificationPrompt || 'Clarification needed',
        options: actionId.options || [],
        operations: []
      };
    }

    const validation = TOOL_REGISTRY[actionId];
    if (!validation) continue;

    const accepts = validation.accept || [];
    const isTargetImage = accepts.includes('image/*');
    const isTargetPdf = accepts.includes('.pdf');
    const isTargetOffice = ['.docx', '.doc', '.xlsx', '.xls', '.csv', '.pptx', '.ppt'].some(x => accepts.includes(x));

    if (!accepts.includes('.zip') && (isTargetPdf || isTargetImage || isTargetOffice)) {
      const zipItem = [...activePool].reverse().find(node => {
        const ext = '.' + (node.name || '').split('.').pop().toLowerCase();
        return ext === '.zip';
      });

      if (zipItem) {
        ops.push({
          tool_id: 'unzip-file',
          target_node_ids: [zipItem.id],
          parameters: {}
        });

        activePool = activePool.filter(ap => ap.id !== zipItem.id);

        let injectedExt = '.pdf';
        if (isTargetImage) injectedExt = '.png';
        else if (accepts.includes('.docx')) injectedExt = '.docx';
        else if (accepts.includes('.xlsx')) injectedExt = '.xlsx';

        activePool.push({
          id: `output:${stepIdx}`,
          name: `unzip_output${injectedExt}`,
          type: 'op',
          status: 'completed',
          ancestry: [...(zipItem.ancestry || []), `output:${stepIdx}`]
        });
        stepIdx++;
      }
    }

    let targetInputs = [];
    const isImage = (ext) => ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext);
    let matches = activePool.filter(node => {
      const ext = '.' + (node.name || '').split('.').pop().toLowerCase();
      const isCompatible = accepts.some(acc => {
        if (acc === 'image/*') return isImage(ext);
        return acc === ext;
      });
      if (isCompatible) return true;

      if (accepts.includes('.pdf')) {
        const canAutoConvert = (
          ext === '.docx' || ext === '.doc' ||
          ext === '.xlsx' || ext === '.xls' || ext === '.csv' ||
          ext === '.pptx' || ext === '.ppt' ||
          ext === '.html' ||
          ext === '.zip' ||
          ext === '.txt' || ext === '.md' ||
          isImage(ext)
        );
        if (canAutoConvert) return true;
      }

      if (accepts.some(acc => acc === 'image/*' || ['.png', '.jpg', '.jpeg', '.webp'].includes(acc))) {
        if (ext === '.pdf') return true;
      }
      if (accepts.some(acc => ['.docx', '.doc'].includes(acc))) {
        if (ext === '.pdf') return true;
      }
      if (accepts.some(acc => ['.xlsx', '.xls', '.csv'].includes(acc))) {
        if (ext === '.pdf') return true;
      }
      if (accepts.some(acc => ['.pptx', '.ppt'].includes(acc))) {
        if (ext === '.pdf') return true;
      }
      return false;
    });

    const lowerClause = clause.toLowerCase();
    const hasPronoun = lowerClause.match(/\b(it|them|those|files?|that|this|these)\b/);
    const hasSelectionKeyword = /\b(these|those|selected)\b/i.test(clause);

    const compatibleSelected = (selectedNodeIds && selectedNodeIds.length > 0)
      ? activePool.filter(node => {
          if (!selectedNodeIds.includes(node.id)) return false;
          const ext = '.' + (node.name || '').split('.').pop().toLowerCase();
          return accepts.some(acc => {
            if (acc === 'image/*') return isImage(ext);
            return acc === ext;
          }) || (accepts.includes('.pdf') && (
            ext === '.docx' || ext === '.doc' || ext === '.xlsx' || ext === '.xls' ||
            ext === '.csv' || ext === '.pptx' || ext === '.ppt' || ext === '.html' ||
            ext === '.zip' || ext === '.txt' || ext === '.md' || isImage(ext) || ext === '.pdf'
          ));
        })
      : [];

    const ditResult = resolveDocumentTargets(clause, activePool, graphState);

    if (hasSelectionKeyword && compatibleSelected.length > 0) {
      targetInputs = validation.maxInputs === 1
        ? [compatibleSelected[compatibleSelected.length - 1]]
        : compatibleSelected;
    } else if (ditResult.resolved) {
      if (ditResult.included.length > 0) {
        const compatible = ditResult.included.filter(node => {
          const ext = '.' + (node.name || '').split('.').pop().toLowerCase();
          return accepts.some(acc => {
            if (acc === 'image/*') return isImage(ext);
            return acc === ext;
          }) || accepts.includes('.pdf');
        });
        if (compatible.length > 0) {
          targetInputs = compatible;
        } else {
          targetInputs = ditResult.included;
        }
      }
      if (ditResult.excluded.length > 0 && targetInputs.length === 0) {
        const excIds = new Set(ditResult.excluded.map(n => n.id));
        matches = matches.filter(m => !excIds.has(m.id));
      }
    } else if (compatibleSelected.length > 0) {
      targetInputs = validation.maxInputs === 1
        ? [compatibleSelected[compatibleSelected.length - 1]]
        : compatibleSelected;
    }

    if (targetInputs.length === 0) {
      let filenameMatch = null;
      const filenameMatches = [];
      activePool.forEach(node => {
        const cleanName = (node.name || '').toLowerCase().replace(/\.[^.]+$/, '');
        if (cleanName.length >= 3 && lowerClause.includes(cleanName)) {
          filenameMatches.push({ node, len: cleanName.length });
        }
      });
      if (filenameMatches.length > 0) {
        filenameMatches.sort((a, b) => b.len - a.len);
        filenameMatch = filenameMatches[0].node;
      }

      if (filenameMatch && matches.some(m => m.id === filenameMatch.id)) {
        targetInputs = [filenameMatch];
      } else if (hasPronoun) {
        let activeMatch = null;
        if (lastActiveNodesList && lastActiveNodesList.length > 0) {
          activeMatch = lastActiveNodesList.map(id => activePool.find(n => n.id === id)).filter(Boolean).find(node => {
            const ext = '.' + (node.name || '').split('.').pop().toLowerCase();
            return accepts.some(acc => {
              if (acc === 'image/*') return isImage(ext);
              return acc === ext;
            }) || accepts.includes('.pdf');
          });
        }
        // If not in lastActiveNodesList, resolve pronoun to the most recent output node in activePool
        if (!activeMatch) {
          activeMatch = [...activePool].reverse().find(node => {
            if (!node.id.startsWith('output:') && !node.id.startsWith('ws-out-')) return false;
            const ext = '.' + (node.name || '').split('.').pop().toLowerCase();
            return accepts.some(acc => {
              if (acc === 'image/*') return isImage(ext);
              return acc === ext;
            }) || accepts.includes('.pdf');
          });
        }
        if (!activeMatch && activePool.length > 0) {
          activeMatch = activePool[activePool.length - 1];
        }
        if (activeMatch) {
          targetInputs = [activeMatch];
        }
      }

      if (targetInputs.length === 0) {
        if (validation.maxInputs > 1) {
          const outMatches = matches.filter(m => m.id.startsWith('output:') || m.id.startsWith('ws-out-'));
          if (outMatches.length > 0) {
            targetInputs = outMatches;
          } else {
            targetInputs = matches;
          }
        } else if (matches.length > 0) {
          matches.sort((a, b) => {
            const isAOut = a.id.startsWith('ws-out-') || a.id.startsWith('output:');
            const isBOut = b.id.startsWith('ws-out-') || b.id.startsWith('output:');
            if (isAOut && !isBOut) return -1;
            if (!isAOut && isBOut) return 1;
            return activePool.indexOf(b) - activePool.indexOf(a);
          });
          targetInputs = [matches[0]];
        }
      }
    }

    if (validation.minInputs && targetInputs.length < validation.minInputs) {
      continue;
    }

    const cleanActionId = (typeof actionId === 'object' && actionId?.actionId) ? actionId.actionId : String(actionId);

    // Multi-target fan-out for single-input tools (e.g. "split the 1 and 2 in half")
    // or distributive fan-out for multi-input tools (e.g. "each image to pdf", "separately convert images to pdf")
    const isSingleInputFanOut = validation.maxInputs === 1 && targetInputs.length > 1;
    const isDistributiveFanOut = /\b(?:each|separately|individually|one\s+by\s+one|separate\s+pdf|individual\s+pdf)\b/i.test(lowerClause);
    const isFanOutNeeded = (validation.maxInputs === 1 && targetInputs.length > 1) || (isDistributiveFanOut && targetInputs.length > 1);
    const inputGroups = isFanOutNeeded
      ? targetInputs.map(ti => [ti])
      : [targetInputs];

    const baseStepIdx = stepIdx;
    for (let idx = 0; idx < inputGroups.length; idx++) {
      const group = inputGroups[idx];
      let resolvedGroup = [...group];

      const isWordToExcel = /\b(?:word|docx|doc)\s*(?:file|document)?\s*(?:in)?to\s*(?:excel|xlsx|sheet|csv)(?:\s+file|\s+document)?\b/i.test(clause) ||
        Boolean(actionId?.requiresBridge === 'docx-to-pdf');

      // If user requested Word to Excel but the input document is not a docx (e.g. PDF on canvas),
      // bridge PDF -> Word first so the chain becomes pdf-to-word -> docx-to-pdf -> pdf-to-excel -> excel-to-pdf
      if (isWordToExcel && !resolvedGroup.some(n => ('.' + (n.name || '').split('.').pop().toLowerCase()) === '.docx')) {
        const sourceDoc = resolvedGroup[0];
        const wordOutId = `output:${stepIdx}`;
        ops.push({
          tool_id: 'pdf-to-word',
          target_node_ids: [sourceDoc.id],
          parameters: {}
        });
        const wordNode = {
          id: wordOutId,
          name: `pdf-to-word_output.docx`,
          type: 'op',
          status: 'completed',
          ancestry: [...(sourceDoc.ancestry || []), wordOutId]
        };
        activePool.push(wordNode);
        stepIdx++;
        resolvedGroup = [wordNode];
      }

      // Auto-converter bridge check (e.g. docx -> pdf when converting Word to Excel)
      if (cleanActionId === 'pdf-to-excel' || (accepts.includes('.pdf') && !accepts.includes('.docx'))) {
        const docxNode = resolvedGroup.find(n => ('.' + (n.name || '').split('.').pop().toLowerCase()) === '.docx');
        if (docxNode) {
          const bridgeOutId = `output:${stepIdx}`;
          ops.push({
            tool_id: 'docx-to-pdf',
            target_node_ids: [docxNode.id],
            parameters: {}
          });
          const bridgeNode = {
            id: bridgeOutId,
            name: `docx-to-pdf_output.pdf`,
            type: 'op',
            status: 'completed',
            ancestry: [...(docxNode.ancestry || []), bridgeOutId]
          };
          activePool.push(bridgeNode);
          stepIdx++;
          resolvedGroup = resolvedGroup.map(n => n.id === docxNode.id ? bridgeNode : n);
        }
      }

      if (validation.minInputs && resolvedGroup.length < validation.minInputs) {
        continue;
      }

      const parameters = extractCommandParameters(actionId, clause);
      if (needsStudioParams(actionId)) {
        parameters.initialNlpPrompt = clause;
      }

      const mainOutId = isDistributiveFanOut ? `output:${baseStepIdx}-${idx}` : `output:${stepIdx}`;

      ops.push({
        tool_id: cleanActionId,
        target_node_ids: resolvedGroup.map(ti => ti.id),
        parameters,
        output_id: mainOutId
      });

      activePool = activePool.filter(ap => !resolvedGroup.some(ti => ti.id === ap.id && (ti.id.startsWith('output:') || ti.id.startsWith('ws-out-'))));

      let outExt = '.pdf';
      if (cleanActionId === 'pdf-to-image') outExt = '.png';
      else if (cleanActionId === 'pdf-to-word') outExt = '.docx';
      else if (cleanActionId === 'pdf-to-excel') outExt = '.xlsx';
      else if (cleanActionId === 'pdf-to-powerpoint') outExt = '.pptx';
      else if (cleanActionId === 'image-converter') outExt = '.' + (parameters.format || 'png');
      else if (cleanActionId === 'unzip-file') {
        const upDoc = resolvedGroup[0];
        const upExt = (upDoc?.name || '').split('.').pop().toLowerCase();
        outExt = (upExt === 'zip' || !upExt) ? '.pdf' : `.${upExt}`;
      }
      else if (['image-to-pdf', 'docx-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf', 'split-pdf', 'merge-pdf'].includes(cleanActionId)) outExt = '.pdf';

      activePool.push({
        id: mainOutId,
        name: `${cleanActionId}_output${outExt}`,
        type: 'op',
        status: 'completed',
        ancestry: [...resolvedGroup.flatMap(ti => ti.ancestry || []), mainOutId]
      });
      stepIdx++;

      // If this was a Word to Excel chain, bridge the resulting Excel file back to PDF via excel-to-pdf
      // unless a subsequent clause explicitly handles "excel to pdf".
      const hasSubsequentExcelToPdf = clauses.slice(clauses.indexOf(clause) + 1).some(c => /excel\s*(?:file|document)?\s*(?:in)?to\s*pdf/i.test(c));
      if (isWordToExcel && !hasSubsequentExcelToPdf) {
        const excelPdfOutId = `output:${stepIdx}`;
        ops.push({
          tool_id: 'excel-to-pdf',
          target_node_ids: [mainOutId],
          parameters: {}
        });
        activePool.push({
          id: excelPdfOutId,
          name: `excel-to-pdf_output.pdf`,
          type: 'op',
          status: 'completed',
          ancestry: [...resolvedGroup.flatMap(ti => ti.ancestry || []), mainOutId, excelPdfOutId]
        });
        stepIdx++;
      }
    }
  }

  return {
    confidence_score: ops.length > 0 ? 0.9 : 0.0,
    clarification_needed: null,
    operations: ops
  };
}

/**
 * Materializes planned operations into concrete canvas operator node structures
 * with safe, non-colliding coordinates and resolved wiring (inputIds).
 */
export function materializeCanvasOperations(planOps = [], workspaceQueue = [], existingOperations = []) {
  const spawnedOps = [];
  const stepOpMap = {};

  for (let i = 0; i < planOps.length; i++) {
    const step = planOps[i];
    const actionId = (typeof step.tool_id === 'object' && step.tool_id?.actionId) ? step.tool_id.actionId : String(step.tool_id);
    const validation = TOOL_REGISTRY[actionId];
    if (!validation) continue;

    const resolvedInputIds = [];
    const resolvedInputNodes = [];

    (step.target_node_ids || []).forEach(input => {
      if (input.startsWith('output:')) {
        const rawRef = input.split(':')[1];
        const upstreamIdx = parseInt(rawRef);
        const upstreamOpId = stepOpMap[input] || stepOpMap[rawRef] || stepOpMap[upstreamIdx];
        if (upstreamOpId) {
          resolvedInputIds.push(upstreamOpId);
          const upstreamOp = [...existingOperations, ...spawnedOps].find(o => o.id === upstreamOpId);
          if (upstreamOp) {
            resolvedInputNodes.push({ x: upstreamOp.x + 260, y: upstreamOp.y });
          }
        }
      } else {
        const fileNode = workspaceQueue.find(f => f.id === input || (f.file?.name || f.name) === input);
        if (fileNode) {
          resolvedInputIds.push(fileNode.id);
          resolvedInputNodes.push({ x: fileNode.x || 100, y: fileNode.y || 100 });
        }
      }
    });

    const inputMaxX = resolvedInputNodes.length > 0 ? Math.max(...resolvedInputNodes.map(n => n.x)) : 100;
    const inputAvgY = resolvedInputNodes.length > 0 ? resolvedInputNodes.reduce((sum, n) => sum + n.y, 0) / resolvedInputNodes.length : 200;

    const coords = getNonCollidingCoords(inputMaxX + 260, inputAvgY, [...workspaceQueue, ...existingOperations, ...spawnedOps]);

    const defaultParams = validation.defaultParams || {};
    const opId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    stepOpMap[i] = opId;
    if (step.output_id) {
      stepOpMap[step.output_id] = opId;
      if (step.output_id.startsWith('output:')) {
        stepOpMap[step.output_id.split(':')[1]] = opId;
      }
    }

    const newOp = {
      id: opId,
      toolId: actionId,
      inputIds: resolvedInputIds,
      outputId: null,
      status: 'idle',
      progress: 0,
      x: coords.x,
      y: coords.y,
      params: { ...defaultParams, ...step.parameters }
    };

    spawnedOps.push(newOp);
  }

  return { spawnedOps, stepOpMap };
}

/**
 * Reacts to a natural language command on the visual canvas:
 * Executes intent classification, parameter extraction, pipeline chaining,
 * conflict prevention, and node materialization.
 */
export async function reactCanvasToIntent(cmd, workspaceQueue = [], existingOperations = [], options = {}) {
  if (!cmd || typeof cmd !== 'string' || !cmd.trim()) {
    return { status: 'rejected', reason: 'empty_command', spawnedOps: [], nextOperations: existingOperations };
  }

  const negationRegex = /\b(not|never|stop|cancel|do not|don't|dont|undo|redo)\b/i;
  if (negationRegex.test(cmd)) {
    return { status: 'rejected', reason: 'negation', spawnedOps: [], nextOperations: existingOperations };
  }

  const graphState = [
    ...workspaceQueue.map(f => ({
      id: f.id,
      name: f.name,
      type: 'file',
      status: f.status?.toLowerCase() || 'pending',
      ancestry: f.ancestry || [f.id],
      pageCount: f.pageCount || 1,
      x: f.x || 100,
      y: f.y || 100
    })),
    ...existingOperations.map(op => ({
      id: op.id,
      tool: op.toolId,
      status: op.status,
      inputs: op.inputIds,
      outputs: op.outputIds || (op.outputId ? [op.outputId] : []),
      ancestry: op.ancestry || [op.id],
      x: op.x || 100,
      y: op.y || 100
    }))
  ];

  const plan = await planCanvasWorkflow(cmd, graphState, options.lastActiveNodes || [], options.selectedNodeIds || []);

  if (plan.isAmbiguous || plan.clarification_needed) {
    return {
      status: 'ambiguous',
      isAmbiguous: true,
      clarificationPrompt: plan.clarification_needed,
      options: plan.options || [],
      spawnedOps: [],
      nextOperations: existingOperations
    };
  }

  if (!plan.operations || plan.operations.length === 0) {
    return {
      status: 'rejected',
      reason: 'unknown_intent',
      spawnedOps: [],
      nextOperations: existingOperations
    };
  }

  const { spawnedOps, stepOpMap } = materializeCanvasOperations(plan.operations, workspaceQueue, existingOperations);

  return {
    status: 'success',
    plan,
    spawnedOps,
    stepOpMap,
    nextOperations: [...existingOperations, ...spawnedOps]
  };
}

