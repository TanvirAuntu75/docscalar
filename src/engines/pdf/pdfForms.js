import { PDFDocument, rgb, degrees, StandardFonts, PDFRadioGroup, PDFDropdown } from 'pdf-lib';
import { cleanAndRefitDocument } from './cleanAndRefitPage.js';
import { cleanTextForWinAnsi } from '../../utils/pdfSanitizer.js';
import { getPageGeometry, screenRatioToPdfPoints } from '../../utils/pdfCoordinates.js';

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#ffffff');
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(1, 1, 1);
};

const extractBytes = async (file) => {
  if (!file) {
    throw new Error('No file or buffer provided to PDF forms engine.');
  }
  if (file instanceof ArrayBuffer) {
    return file;
  }
  if (file instanceof Uint8Array || (typeof globalThis !== 'undefined' && globalThis.Buffer && globalThis.Buffer.isBuffer(file))) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file && file.data instanceof ArrayBuffer) {
    return file.data;
  }
  if (file && typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  throw new Error('Invalid file or buffer format provided to PDF forms engine.');
};

/**
 * Applies content-aware crop boxes directly in-place on existing document pages,
 * perfectly preserving AcroForm interactive fields, widgets, and appearance streams.
 */
function applyInPlaceCropBoxes(pdfDoc, cropBoxes = {}, options = {}) {
  const pages = pdfDoc.getPages();
  const enabledEdges = options.enabledEdges ?? { top: true, bottom: true, left: true, right: true };
  const pageIndices = options.pageIndices ?? null;

  for (let i = 0; i < pages.length; i++) {
    if (pageIndices !== null && !pageIndices.includes(i)) continue;
    const page = pages[i];
    const cropBox = (cropBoxes && typeof cropBoxes === 'object' && cropBoxes[i])
      ? cropBoxes[i]
      : (cropBoxes && cropBoxes.left !== undefined ? cropBoxes : null);

    if (!cropBox || cropBox.isInvertedDocument || cropBox.hasBlackBorders !== true) continue;

    const size = page.getSize();
    const origW = size.width;
    const origH = size.height;

    const cLeft = enabledEdges.left ? (cropBox.cropLeft || 0) : 0;
    const cBottom = enabledEdges.bottom ? (cropBox.cropBottom || 0) : 0;
    const cRight = enabledEdges.right ? (cropBox.cropRight || 0) : 0;
    const cTop = enabledEdges.top ? (cropBox.cropTop || 0) : 0;

    if (cLeft > 0 || cBottom > 0 || cRight > 0 || cTop > 0) {
      const left = Math.max(0, Math.min(origW - 10, cropBox.left ?? cLeft));
      const bottom = Math.max(0, Math.min(origH - 10, cropBox.bottom ?? cBottom));
      const right = Math.max(left + 10, Math.min(origW, origW - cRight));
      const top = Math.max(bottom + 10, Math.min(origH, origH - cTop));
      page.setCropBox(left, bottom, right - left, top - bottom);
    }
  }
}

/**
 * Populates a single form field value safely with WinAnsi text sanitization,
 * valid-option containment checks, and robust error handling.
 */
function fillFormFieldValue(form, fieldName, val, defaultFont) {
  try {
    const field = form.getField(fieldName);
    if (!field) return;

    if (typeof field.setText === 'function') {
      const textVal = String(val ?? '');
      let safeVal = textVal;
      if (defaultFont) {
        safeVal = cleanTextForWinAnsi(textVal, defaultFont);
      } else {
        safeVal = textVal.replace(/[^\x20-\x7E\r\n\t]/g, '?');
      }
      try {
        field.setText(safeVal);
      } catch {
        const asciiOnly = textVal.replace(/[^\x20-\x7E\r\n\t]/g, '?');
        try {
          field.setText(asciiOnly);
        } catch (err2) {
          console.warn(`Failed to set text for field "${fieldName}":`, err2);
        }
      }
    } else if (typeof field.check === 'function' && typeof field.uncheck === 'function') {
      if (val === true || val === 'true' || val === 1 || val === '1') {
        field.check();
      } else {
        field.uncheck();
      }
    } else if (typeof field.select === 'function') {
      if (val !== undefined && val !== null && val !== '') {
        const strVal = String(val);
        if (typeof field.getOptions === 'function') {
          const opts = field.getOptions() || [];
          if (opts.includes(strVal)) {
            field.select(strVal);
          } else {
            console.warn(`Value "${strVal}" is not among valid options [${opts.join(', ')}] for field "${fieldName}"`);
          }
        } else {
          field.select(strVal);
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to fill form field "${fieldName}":`, err);
  }
}

/**
 * Scan a PDF file and extract all interactive form fields.
 * Minification-proof method detection with rotation and widget geometry extraction.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - The PDF file.
 * @returns {Promise<Array>} List of fields: { name, type, value, options, widgets }.
 */
export async function getFormFields(file) {
  const arrayBuffer = await extractBytes(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  
  let fields;
  try {
    fields = form.getFields();
  } catch {
    return [];
  }

  return fields.map(field => {
    const name = field.getName();
    let type = 'text';
    let value = '';
    let options = null;

    const isRadio = typeof field.addOptionToPage === 'function' || (typeof PDFRadioGroup !== 'undefined' && field instanceof PDFRadioGroup);
    const isDropdown = typeof field.isMultiselect === 'function' || (typeof PDFDropdown !== 'undefined' && field instanceof PDFDropdown);

    if (isRadio) {
      type = 'radio';
      try {
        options = field.getOptions();
        value = field.getSelected() || '';
      } catch {
        options = [];
        value = '';
      }
    } else if (isDropdown || typeof field.getSelected === 'function') {
      type = 'select';
      try {
        const selected = field.getSelected();
        value = Array.isArray(selected) ? selected[0] || '' : selected || '';
      } catch {
        value = '';
      }
      if (typeof field.getOptions === 'function') {
        options = field.getOptions();
      }
    } else if (typeof field.isChecked === 'function') {
      type = 'checkbox';
      value = field.isChecked();
    } else if (typeof field.getText === 'function') {
      type = 'text';
      value = field.getText() || '';
    } else if (typeof field.getOptions === 'function') {
      type = 'select';
      options = field.getOptions();
    }

    // Extract layout information from widgets
    const widgetData = [];
    try {
      const widgets = field.acroField.getWidgets();
      for (let wIdx = 0; wIdx < widgets.length; wIdx++) {
        const widget = widgets[wIdx];
        const rect = widget.getRectangle(); // {x, y, width, height}
        const P = widget.P();
        let pageIndex = -1;

        for (let i = 0; i < pages.length; i++) {
          if (P && pages[i].ref && (pages[i].ref.tag === P.tag || pages[i].ref === P)) {
            pageIndex = i;
            break;
          } else {
            // fallback: check Annots via context lookup
            const annots = pages[i].node.Annots();
            if (annots) {
              const annotsArray = annots.asArray();
              for (let j = 0; j < annotsArray.length; j++) {
                const annotObj = pdfDoc.context.lookup(annotsArray[j]);
                if (annotsArray[j] === widget.dict || annotObj === widget.dict) {
                  pageIndex = i;
                  break;
                }
              }
            }
          }
          if (pageIndex !== -1) break;
        }

        let onValue = '';
        try {
          const widgetOnVal = widget.getOnValue?.();
          if (widgetOnVal) {
            onValue = widgetOnVal.decodeText?.() || widgetOnVal.value || String(widgetOnVal);
          }
        } catch {}
        if (isRadio) {
          try {
            const exportValues = field.acroField.getExportValues?.();
            const onValues = field.acroField.getOnValues?.();
            if (exportValues && exportValues[wIdx]) {
              onValue = exportValues[wIdx].decodeText?.() || exportValues[wIdx].value || String(exportValues[wIdx]);
            } else if (onValues && onValues[wIdx]) {
              onValue = onValues[wIdx].decodeText?.() || onValues[wIdx].value || String(onValues[wIdx]);
            } else if (options && options[wIdx]) {
              onValue = options[wIdx];
            }
          } catch {}
        }

        if (pageIndex !== -1) {
          const pageSize = pages[pageIndex].getSize();
          const pageRotation = pages[pageIndex].getRotation?.()?.angle || 0;
          widgetData.push({
            rect,
            pageIndex,
            pageSize,
            pageRotation,
            onValue
          });
        }
      }
    } catch {
      console.warn(`Failed to extract widgets for field ${name}`);
    }

    return {
      name,
      type,
      value,
      options,
      widgets: widgetData
    };
  });
}

/**
 * Fill form fields in a PDF document.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - The PDF file.
 * @param {object} fieldValues - Map of field name to value.
 * @param {function} onProgress - Progress callback.
 * @param {boolean} flatten - Whether to bake fields into permanent static content.
 * @param {object} options - Smart cropping & refit options.
 * @returns {Promise<Blob>} The filled PDF.
 */
export async function fillFormFields(file, fieldValues, onProgress, flatten = false, options = {}) {
  if (onProgress) onProgress(15);
  const arrayBuffer = await extractBytes(file);
  if (onProgress) onProgress(35);
  
  let pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Handle in-place smart cropping for interactive documents, preserving AcroForms
  if (!flatten && options && options.autoCropBlackBorders) {
    applyInPlaceCropBoxes(pdfDoc, options.pageCropBoxes || options.cropBox || {}, options);
  }

  if (onProgress) onProgress(55);

  const form = pdfDoc.getForm();
  let defaultFont = null;
  try {
    defaultFont = form.getDefaultFont() || await pdfDoc.embedFont(StandardFonts.Helvetica);
  } catch {
    // If standard font cannot be embedded, fallback will be used
  }

  Object.entries(fieldValues).forEach(([name, val]) => {
    fillFormFieldValue(form, name, val, defaultFont);
  });

  if (onProgress) onProgress(80);

  if (flatten) {
    try {
      form.flatten();
    } catch (e) {
      console.warn('Failed to flatten PDF forms:', e);
    }

    // VisionClean: Universal Smart Cropper on flattened static document
    if (options && options.autoCropBlackBorders) {
      pdfDoc = await cleanAndRefitDocument(pdfDoc, options.pageCropBoxes || options.cropBox || {}, {
        margin: options.cleanMargin ?? 0,
        enabledEdges: options.enabledEdges,
        pageIndices: options.pageIndices
      });
    }
  }

  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);

  return new Blob([savedBytes], { type: 'application/pdf' });
}

export async function compileFormWithNewFields(file, createdFields, fieldValues, onProgress, flatten = false, options = {}) {
  if (onProgress) onProgress(10);
  const arrayBuffer = await extractBytes(file);
  if (onProgress) onProgress(30);
  
  let pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Handle in-place smart cropping for interactive documents, preserving AcroForms
  if (!flatten && options && options.autoCropBlackBorders) {
    applyInPlaceCropBoxes(pdfDoc, options.pageCropBoxes || options.cropBox || {}, options);
  }

  if (onProgress) onProgress(50);

  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();

  let defaultFont = null;
  try {
    defaultFont = form.getDefaultFont() || await pdfDoc.embedFont(StandardFonts.Helvetica);
  } catch {
    // Fallback if needed
  }

  // Create new fields with subpixel rotation and CropBox origin invariance
  createdFields.forEach((fieldDef) => {
    const pageIndex = fieldDef.pageIndex ?? 0;
    if (pageIndex < 0 || pageIndex >= pages.length) return;
    const page = pages[pageIndex];

    const rect = fieldDef.rect;
    const minX = Math.min(rect.startXPercent, rect.endXPercent);
    const maxX = Math.max(rect.startXPercent, rect.endXPercent);
    const minY = Math.min(rect.startYPercent, rect.endYPercent);
    const maxY = Math.max(rect.startYPercent, rect.endYPercent);

    const geom = getPageGeometry(page);
    const { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight, rotateDegrees } = screenRatioToPdfPoints({
      xRatio: minX,
      yRatio: minY,
      widthRatio: maxX - minX,
      heightRatio: maxY - minY,
      pageGeometry: geom
    });

    const addOptions = {
      x: pdfX,
      y: pdfY,
      width: pdfWidth,
      height: pdfHeight,
      rotate: degrees(rotateDegrees)
    };

    if (fieldDef.backgroundColor) {
      addOptions.backgroundColor = hexToRgb(fieldDef.backgroundColor);
    }
    if (fieldDef.borderColor) {
      addOptions.borderColor = hexToRgb(fieldDef.borderColor);
    }
    if (fieldDef.borderWidth !== undefined) {
      addOptions.borderWidth = fieldDef.borderWidth;
    }
    if (fieldDef.textColor) {
      addOptions.textColor = hexToRgb(fieldDef.textColor);
    }

    try {
      let formField;
      if (fieldDef.type === 'checkbox') {
        try {
          formField = form.getCheckBox(fieldDef.name);
        } catch {
          formField = form.createCheckBox(fieldDef.name);
        }
        formField.addToPage(page, addOptions);
      } else if (fieldDef.type === 'select' || fieldDef.type === 'dropdown') {
        try {
          formField = form.getDropdown(fieldDef.name);
        } catch {
          formField = form.createDropdown(fieldDef.name);
        }
        if (fieldDef.options && Array.isArray(fieldDef.options)) {
          formField.setOptions(fieldDef.options);
        }
        formField.addToPage(page, addOptions);
      } else if (fieldDef.type === 'radio') {
        try {
          formField = form.getRadioGroup(fieldDef.name);
        } catch {
          formField = form.createRadioGroup(fieldDef.name);
        }
        formField.addOptionToPage(fieldDef.value || 'Option_' + (pageIndex + 1), page, addOptions);
      } else {
        try {
          formField = form.getTextField(fieldDef.name);
        } catch {
          formField = form.createTextField(fieldDef.name);
        }
        if (fieldDef.multiline || pdfHeight > 35) {
          formField.enableMultiline();
        }
        formField.addToPage(page, addOptions);
      }
    } catch (err) {
      console.warn(`Failed to create form field "${fieldDef.name}":`, err);
    }
  });

  if (onProgress) onProgress(70);

  // Fill all fields (both original and newly created ones)
  Object.entries(fieldValues).forEach(([name, val]) => {
    fillFormFieldValue(form, name, val, defaultFont);
  });

  if (onProgress) onProgress(90);

  if (flatten) {
    try {
      form.flatten();
    } catch (e) {
      console.warn('Failed to flatten PDF forms:', e);
    }

    // VisionClean: Universal Smart Cropper on flattened static document
    if (options && options.autoCropBlackBorders) {
      pdfDoc = await cleanAndRefitDocument(pdfDoc, options.pageCropBoxes || options.cropBox || {}, {
        margin: options.cleanMargin ?? 0,
        enabledEdges: options.enabledEdges,
        pageIndices: options.pageIndices
      });
    }
  }

  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);

  return new Blob([savedBytes], { type: 'application/pdf' });
}

/**
 * Export form fields data to CSV spreadsheet format.
 * @param {Array} fields 
 * @param {object} values 
 * @returns {string} CSV text
 */
export function exportFormToCsv(fields = [], values = {}) {
  const headers = ['Field Name', 'Field Type', 'Field Value', 'Options'];
  const rows = fields.map(f => {
    const val = values[f.name] !== undefined ? values[f.name] : (f.value ?? '');
    const cleanVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
    const opts = (f.options && Array.isArray(f.options)) ? f.options.join('; ') : '';
    return [
      `"${(f.name || '').replace(/"/g, '""')}"`,
      `"${(f.type || 'text').replace(/"/g, '""')}"`,
      `"${cleanVal.replace(/"/g, '""')}"`,
      `"${opts.replace(/"/g, '""')}"`
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Export form fields data to JSON object format.
 * @param {Array} fields 
 * @param {object} values 
 * @returns {string} JSON string
 */
export function exportFormToJson(fields = [], values = {}) {
  const data = {
    exportDate: new Date().toISOString(),
    fieldCount: fields.length,
    fields: {}
  };
  fields.forEach(f => {
    const val = values[f.name] !== undefined ? values[f.name] : (f.value ?? '');
    data.fields[f.name] = {
      type: f.type || 'text',
      value: val,
      options: f.options || null
    };
  });
  return JSON.stringify(data, null, 2);
}
