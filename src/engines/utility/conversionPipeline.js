/* Automated Document Conversion Pipeline & Chaining Engine */
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { compressPdf } from '../pdf/compressPdf.js';
import { convertImageFormat } from '../image/convertFormat.js';
import { resizeImage } from '../image/resizeImage.js';
import { compressImage } from '../image/compressImage.js';

export const PIPELINE_TEMPLATES = [
  {
    id: 'web_optimize',
    name: 'Web Image Optimization',
    description: 'Convert to WebP, resize to HD, and apply 70% compression',
    category: 'Image',
    steps: [
      { toolId: 'image-converter', targetFormat: 'webp' },
      { toolId: 'image-resizer', mode: 'exact', width: 1280, height: 720 },
      { toolId: 'image-compressor', quality: 0.70 }
    ]
  },
  {
    id: 'legal_archive',
    name: 'Legal Archival Prep',
    description: 'Optimize PDF structure, stamp watermark, and prepare for archive',
    category: 'PDF',
    steps: [
      { toolId: 'rotate-pdf', rotationAngle: 0 },
      { toolId: 'compress-pdf', level: 'medium' }
    ]
  },
  {
    id: 'presentation_bundle',
    name: 'Presentation & Social Share',
    description: 'Resize for social media and compress for instant sharing',
    category: 'Social',
    steps: [
      { toolId: 'image-resizer', mode: 'percentage', percentage: 75 },
      { toolId: 'image-compressor', quality: 0.65 }
    ]
  }
];

export const PIPELINE_AVAILABLE_TOOLS = [
  { id: 'compress-pdf', label: 'Compress PDF', category: 'PDF', icon: 'compress', accept: '.pdf' },
  { id: 'rotate-pdf', label: 'Rotate PDF', category: 'PDF', icon: 'rotate_right', accept: '.pdf' },
  { id: 'image-converter', label: 'Convert Image', category: 'Image', icon: 'transform', accept: 'image/*' },
  { id: 'image-resizer', label: 'Resize Image', category: 'Image', icon: 'straighten', accept: 'image/*' },
  { id: 'image-compressor', label: 'Compress Image', category: 'Image', icon: 'folder_zip', accept: 'image/*' }
];

async function extractBytes(file) {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (file && typeof file.arrayBuffer === 'function') {
    const ab = await file.arrayBuffer();
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(ab)) {
      return ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength);
    }
    return ab;
  }
  throw new Error('Unsupported input format.');
}

async function directRotatePdf(file, angle = 90) {
  const arrayBuffer = await extractBytes(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const currRotation = page.getRotation().angle;
    page.setRotation(degrees((currRotation + angle) % 360));
  }
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Execute a sequential pipeline of tool operations on a file.
 */
export async function executePipeline(initialFile, steps, onProgress = () => {}) {
  let currentFile = initialFile;
  const executionLog = [];
  const totalSteps = steps.length;

  for (let i = 0; i < totalSteps; i++) {
    const step = steps[i];
    const stepNumber = i + 1;
    onProgress(Math.round((i / totalSteps) * 100), `Executing step ${stepNumber}: ${step.toolId}...`);

    const stepStart = Date.now();
    let stepOutput;

    switch (step.toolId) {
      case 'compress-pdf': {
        const res = await compressPdf(currentFile, step.level || 'medium');
        stepOutput = {
          blob: res.blob || res,
          name: (currentFile.name || 'document.pdf').replace(/\.pdf$/i, '_compressed.pdf')
        };
        break;
      }
      case 'rotate-pdf': {
        const angle = step.rotationAngle !== undefined ? step.rotationAngle : 90;
        const blob = await directRotatePdf(currentFile, angle);
        stepOutput = {
          blob,
          name: (currentFile.name || 'document.pdf').replace(/\.pdf$/i, '_rotated.pdf')
        };
        break;
      }
      case 'image-converter': {
        const targetFormat = step.targetFormat || 'webp';
        const res = await convertImageFormat(currentFile, targetFormat, step.quality || 0.92);
        stepOutput = {
          blob: res.blob,
          name: res.name
        };
        break;
      }
      case 'image-resizer': {
        const res = await resizeImage(currentFile, {
          mode: step.mode || 'percentage',
          width: step.width,
          height: step.height,
          percentage: step.percentage || 75
        });
        stepOutput = {
          blob: res.blob,
          name: res.name
        };
        break;
      }
      case 'image-compressor': {
        const res = await compressImage(currentFile, step.quality || 0.70);
        stepOutput = {
          blob: res.blob,
          name: res.name
        };
        break;
      }
      default:
        stepOutput = {
          blob: currentFile instanceof Blob ? currentFile : new Blob([currentFile]),
          name: currentFile.name || 'document_output'
        };
    }

    const duration = Date.now() - stepStart;
    executionLog.push({
      stepIndex: i,
      toolId: step.toolId,
      inputName: currentFile.name || 'input',
      outputName: stepOutput.name,
      durationMs: duration,
      outputSize: stepOutput.blob.size
    });

    if (typeof File !== 'undefined') {
      currentFile = new File([stepOutput.blob], stepOutput.name, {
        type: stepOutput.blob.type || 'application/octet-stream'
      });
    } else {
      currentFile = stepOutput.blob;
      currentFile.name = stepOutput.name;
    }
  }

  onProgress(100, 'Workflow completed successfully.');

  return {
    finalFile: currentFile,
    blob: currentFile,
    name: currentFile.name,
    size: currentFile.size,
    log: executionLog
  };
}
