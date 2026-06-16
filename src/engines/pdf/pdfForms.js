import { PDFDocument } from 'pdf-lib';

/**
 * Scan a PDF file and extract all interactive form fields.
 * Minification-proof method detection.
 * @param {File} file - The PDF file.
 * @returns {Promise<Array>} List of fields: { name, type, value, options }.
 */
export async function getFormFields(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const form = pdfDoc.getForm();
  
  let fields;
  try {
    fields = form.getFields();
  } catch (e) {
    return [];
  }

  return fields.map(field => {
    const name = field.getName();
    let type = 'text';
    let value = '';
    let options = null;

    // Detect type by checking method signatures (safe from bundle obfuscation)
    if (typeof field.getText === 'function') {
      type = 'text';
      value = field.getText() || '';
    } else if (typeof field.isChecked === 'function') {
      type = 'checkbox';
      value = field.isChecked();
    } else if (typeof field.getSelected === 'function') {
      type = 'select';
      try {
        const selected = field.getSelected();
        value = Array.isArray(selected) ? selected[0] || '' : selected || '';
      } catch (e) {
        value = '';
      }
      if (typeof field.getOptions === 'function') {
        options = field.getOptions();
      }
    } else if (typeof field.getOptions === 'function') {
      type = 'select';
      options = field.getOptions();
    }

    return {
      name,
      type,
      value,
      options
    };
  });
}

/**
 * Fill form fields in a PDF document.
 * @param {File} file - The PDF file.
 * @param {object} fieldValues - Map of field name to value.
 * @param {function} onProgress - Progress callback.
 * @returns {Promise<Blob>} The filled PDF.
 */
export async function fillFormFields(file, fieldValues, onProgress) {
  if (onProgress) onProgress(15);
  const arrayBuffer = await file.arrayBuffer();
  if (onProgress) onProgress(35);
  
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  if (onProgress) onProgress(55);

  const form = pdfDoc.getForm();

  Object.entries(fieldValues).forEach(([name, val]) => {
    try {
      const field = form.getField(name);
      if (!field) return;

      if (typeof field.setText === 'function') {
        field.setText(String(val || ''));
      } else if (typeof field.check === 'function' && typeof field.uncheck === 'function') {
        if (val === true || val === 'true') {
          field.check();
        } else {
          field.uncheck();
        }
      } else if (typeof field.select === 'function') {
        field.select(val);
      }
    } catch (err) {
      console.warn(`Failed to fill form field "${name}":`, err);
    }
  });

  if (onProgress) onProgress(80);
  const savedBytes = await pdfDoc.save();
  if (onProgress) onProgress(100);

  return new Blob([savedBytes], { type: 'application/pdf' });
}
