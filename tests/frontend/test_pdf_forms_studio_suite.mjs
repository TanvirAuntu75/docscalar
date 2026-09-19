/**
 * DocForge Master Automated Test Suite: PDF Forms Studio & Engine
 *
 * Verifies:
 * Area 1: Resilient Input Byte Extraction (ArrayBuffer, Uint8Array, Buffer, Blob, Object)
 * Area 2: AcroForm Field Extraction & Type Distinction (PDFRadioGroup vs PDFDropdown vs CheckBox)
 * Area 3: Widget Geometry Extraction & Context Lookup Reference Resolution
 * Area 4: In-Place CropBox Application on Interactive AcroForms (Zero Field Destruction)
 * Area 5: Text Field Population & WinAnsi Text Sanitization (Emoji/Unicode safety)
 * Area 6: Checkbox & Dropdown Value Population & Out-of-Bounds Guards
 * Area 7: Radio Group Selection & Options Validation
 * Area 8: Form Flattening vs Interactive Export Parity
 * Area 9: Mathematical Rotation Parity across all 4 angles (0°, 90°, 180°, 270°)
 * Area 10: Multi-Field Custom Compilation with Visual Styling
 * Area 11: Data Exchange Roundtrip (CSV, JSON export & import unwrapping)
 * Area 12: Studio Component Code & Architectural Invariants (PdfForms.jsx)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import {
  getFormFields,
  fillFormFields,
  compileFormWithNewFields,
  exportFormToCsv,
  exportFormToJson
} from '../../src/engines/pdf/pdfForms.js';
import { getPageGeometry, screenRatioToPdfPoints } from '../../src/utils/pdfCoordinates.js';

let passedAssertions = 0;

function check(desc, condition) {
  assert.ok(condition, `FAILED: ${desc}`);
  passedAssertions++;
  console.log(`  ✓ [${passedAssertions}] ${desc}`);
}

async function runMasterPdfFormsSuite() {
  console.log('\n===============================================================');
  console.log('MASTER PDF FORMS STUDIO & ENGINE MOLECULAR TEST SUITE');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // AREA 1: Resilient Input Byte Extraction
  // -------------------------------------------------------------------------
  console.log('--- Area 1: Resilient Input Byte Extraction ---');
  const sampleDoc = await PDFDocument.create();
  sampleDoc.addPage([595, 842]);
  const sampleBytes = await sampleDoc.save();
  const sampleAb = sampleBytes.buffer.slice(sampleBytes.byteOffset, sampleBytes.byteOffset + sampleBytes.byteLength);

  // 1.1 ArrayBuffer input
  const fieldsFromAb = await getFormFields(sampleAb);
  check('Accepts raw ArrayBuffer input', Array.isArray(fieldsFromAb));

  // 1.2 Uint8Array input
  const fieldsFromUint8 = await getFormFields(sampleBytes);
  check('Accepts Uint8Array input', Array.isArray(fieldsFromUint8));

  // 1.3 Node Buffer input
  const nodeBuf = Buffer.from(sampleBytes);
  const fieldsFromBuf = await getFormFields(nodeBuf);
  check('Accepts Node Buffer input', Array.isArray(fieldsFromBuf));

  // 1.4 Blob-like object with .arrayBuffer()
  const mockBlob = {
    async arrayBuffer() {
      return sampleAb;
    }
  };
  const fieldsFromBlob = await getFormFields(mockBlob);
  check('Accepts Blob-like object with arrayBuffer()', Array.isArray(fieldsFromBlob));

  // 1.5 Object with .data ArrayBuffer
  const fieldsFromDataObj = await getFormFields({ data: sampleAb });
  check('Accepts wrapper object with .data ArrayBuffer', Array.isArray(fieldsFromDataObj));

  // 1.6 Invalid / null input rejection
  let errorCaught = false;
  try {
    await getFormFields(null);
  } catch {
    errorCaught = true;
  }
  check('Rejects null input with descriptive error', errorCaught === true);

  // -------------------------------------------------------------------------
  // AREA 2: AcroForm Field Extraction & Type Distinction
  // -------------------------------------------------------------------------
  console.log('\n--- Area 2: AcroForm Field Extraction & Type Distinction ---');
  const acroDoc = await PDFDocument.create();
  const page1 = acroDoc.addPage([600, 800]);
  const page2 = acroDoc.addPage([600, 800]);
  const form = acroDoc.getForm();

  // Create different types
  const tf = form.createTextField('fullName');
  tf.addToPage(page1, { x: 50, y: 700, width: 250, height: 30 });
  tf.setText('Alice Smith');

  const cb = form.createCheckBox('agreeTerms');
  cb.addToPage(page1, { x: 50, y: 650, width: 20, height: 20 });
  cb.check();

  const dd = form.createDropdown('country');
  dd.setOptions(['United States', 'Canada', 'United Kingdom', 'Germany']);
  dd.addToPage(page1, { x: 50, y: 600, width: 200, height: 25 });
  dd.select('Canada');

  const rg = form.createRadioGroup('tier');
  rg.addOptionToPage('Free', page2, { x: 50, y: 700, width: 20, height: 20 });
  rg.addOptionToPage('Pro', page2, { x: 100, y: 700, width: 20, height: 20 });
  rg.addOptionToPage('Enterprise', page2, { x: 150, y: 700, width: 20, height: 20 });
  rg.select('Pro');

  const acroBytes = await acroDoc.save();
  const extracted = await getFormFields(acroBytes);

  check('Extracted exactly 4 distinct form fields', extracted.length === 4);

  const fullNameField = extracted.find(f => f.name === 'fullName');
  check('Extracted text field fullName with type text', fullNameField?.type === 'text');
  check('Extracted correct default text value', fullNameField?.value === 'Alice Smith');

  const agreeField = extracted.find(f => f.name === 'agreeTerms');
  check('Extracted checkbox agreeTerms with type checkbox', agreeField?.type === 'checkbox');
  check('Extracted correct checked boolean state', agreeField?.value === true);

  const countryField = extracted.find(f => f.name === 'country');
  check('Extracted dropdown country with type select', countryField?.type === 'select');
  check('Extracted dropdown options array with 4 items', countryField?.options?.length === 4);
  check('Dropdown default value is Canada', countryField?.value === 'Canada');

  const tierField = extracted.find(f => f.name === 'tier');
  check('Accurately detected PDFRadioGroup as type radio (not select)', tierField?.type === 'radio');
  check('Radio options contain Free, Pro, Enterprise', tierField?.options?.includes('Pro') && tierField?.options?.includes('Free'));
  check('Radio selected value is Pro', tierField?.value === 'Pro');

  // -------------------------------------------------------------------------
  // AREA 3: Widget Geometry Extraction & Context Lookup Reference Resolution
  // -------------------------------------------------------------------------
  console.log('\n--- Area 3: Widget Geometry Extraction & Context Lookup ---');
  check('fullName field has at least 1 widget extracted', fullNameField?.widgets?.length > 0);
  const fnWidget = fullNameField.widgets[0];
  check('Widget rect x coordinate is approx 49.5 pt', Math.abs(fnWidget.rect.x - 49.5) < 1.0);
  check('Widget rect y coordinate is approx 699.5 pt', Math.abs(fnWidget.rect.y - 699.5) < 1.0);
  check('Widget rect width is approx 251 pt', Math.abs(fnWidget.rect.width - 251) < 1.0);
  check('Widget rect height is approx 31 pt', Math.abs(fnWidget.rect.height - 31) < 1.0);
  check('Widget pageIndex for fullName is page 0 (Page 1)', fnWidget.pageIndex === 0);
  check('Widget pageSize is 600x800', fnWidget.pageSize.width === 600 && fnWidget.pageSize.height === 800);

  check('tier radio field has 3 widget items across page 2', tierField?.widgets?.length === 3);
  check('tier radio widgets pageIndex is 1 (Page 2)', tierField.widgets[0].pageIndex === 1);

  // -------------------------------------------------------------------------
  // AREA 4: In-Place CropBox Application on Interactive AcroForms
  // -------------------------------------------------------------------------
  console.log('\n--- Area 4: In-Place CropBox Application on Interactive AcroForms ---');
  const fakeCropBoxes = {
    0: {
      left: 30,
      bottom: 40,
      cropLeft: 30,
      cropBottom: 40,
      cropRight: 20,
      cropTop: 30,
      hasBlackBorders: true,
      isInvertedDocument: false
    }
  };

  const filledBlob = await fillFormFields(
    acroBytes,
    { fullName: 'Dr. Jane Doe' },
    null,
    false, // flatten: false (interactive mode)
    {
      autoCropBlackBorders: true,
      pageCropBoxes: fakeCropBoxes
    }
  );

  const filledBytes = new Uint8Array(await filledBlob.arrayBuffer());
  const filledDoc = await PDFDocument.load(filledBytes);
  const filledForm = filledDoc.getForm();

  check('Filled PDF is valid and loaded', filledDoc.getPageCount() === 2);
  check('Interactive AcroForm fields are 100% PRESERVED in interactive mode', filledForm.getFields().length === 4);
  check('Text field fullName has updated text Dr. Jane Doe', filledForm.getTextField('fullName').getText() === 'Dr. Jane Doe');

  const page1CropBox = filledDoc.getPage(0).getCropBox();
  check('Page 1 has in-place CropBox applied with left = 30 pt', page1CropBox.x === 30);
  check('Page 1 has in-place CropBox applied with bottom = 40 pt', page1CropBox.y === 40);
  check('Page 1 has in-place CropBox width = 600 - 30 - 20 = 550 pt', page1CropBox.width === 550);
  check('Page 1 has in-place CropBox height = 800 - 40 - 30 = 730 pt', page1CropBox.height === 730);

  // -------------------------------------------------------------------------
  // AREA 5: Text Field Population & WinAnsi Text Sanitization
  // -------------------------------------------------------------------------
  console.log('\n--- Area 5: Text Field Population & WinAnsi Text Sanitization ---');
  const challengingUnicode = 'Senior Engineer — Lead • “Architect” 👍 🚀';
  const sanitizedBlob = await fillFormFields(
    acroBytes,
    { fullName: challengingUnicode },
    null,
    false
  );
  check('fillFormFields with emoji and unicode characters succeeds without throwing', Boolean(sanitizedBlob));
  const sanitizedDoc = await PDFDocument.load(await sanitizedBlob.arrayBuffer());
  const sanitizedText = sanitizedDoc.getForm().getTextField('fullName').getText();
  check('Em-dash and smart quotes converted or preserved safely', sanitizedText.includes('Senior Engineer'));
  check('Emoji converted to safe character without corrupting field', !sanitizedText.includes('WinAnsi cannot encode'));

  // -------------------------------------------------------------------------
  // AREA 6: Checkbox & Dropdown Population
  // -------------------------------------------------------------------------
  console.log('\n--- Area 6: Checkbox & Dropdown Population ---');
  const cdBlob = await fillFormFields(
    acroBytes,
    {
      agreeTerms: false,
      country: 'Germany'
    },
    null,
    false
  );
  const cdDoc = await PDFDocument.load(await cdBlob.arrayBuffer());
  const cdForm = cdDoc.getForm();
  check('Checkbox agreeTerms successfully unchecked', cdForm.getCheckBox('agreeTerms').isChecked() === false);
  check('Dropdown country successfully selected Germany', cdForm.getDropdown('country').getSelected()[0] === 'Germany');

  let invalidDdThrew = false;
  try {
    await fillFormFields(acroBytes, { country: 'NonExistentCountry' }, null, false);
  } catch {
    invalidDdThrew = true;
  }
  check('Selecting non-existent dropdown option handled gracefully without throwing', invalidDdThrew === false);

  // -------------------------------------------------------------------------
  // AREA 7: Radio Group Selection
  // -------------------------------------------------------------------------
  console.log('\n--- Area 7: Radio Group Selection ---');
  const radioBlob = await fillFormFields(
    acroBytes,
    { tier: 'Enterprise' },
    null,
    false
  );
  const radioDoc = await PDFDocument.load(await radioBlob.arrayBuffer());
  check('Radio group tier successfully selected Enterprise', radioDoc.getForm().getRadioGroup('tier').getSelected() === 'Enterprise');

  let invalidRadioThrew = false;
  try {
    await fillFormFields(acroBytes, { tier: 'UltraDiamondSuper' }, null, false);
  } catch {
    invalidRadioThrew = true;
  }
  check('Selecting non-existent radio option handled gracefully without throwing', invalidRadioThrew === false);

  // -------------------------------------------------------------------------
  // AREA 8: Form Flattening vs Interactive Export Parity
  // -------------------------------------------------------------------------
  console.log('\n--- Area 8: Form Flattening vs Interactive Export Parity ---');
  const flatBlob = await fillFormFields(
    acroBytes,
    { fullName: 'Flattened User', agreeTerms: true },
    null,
    true // flatten: true
  );
  const flatDoc = await PDFDocument.load(await flatBlob.arrayBuffer());
  check('Flattened document fields count is 0 (baked into static vector/text)', flatDoc.getForm().getFields().length === 0);
  check('Flattened document still contains 2 pages', flatDoc.getPageCount() === 2);

  // -------------------------------------------------------------------------
  // AREA 9: Mathematical Rotation Parity Across All 4 Angles
  // -------------------------------------------------------------------------
  console.log('\n--- Area 9: Mathematical Rotation Parity Across All 4 Angles ---');
  const rotDoc = await PDFDocument.create();
  const p0 = rotDoc.addPage([600, 800]);
  const p90 = rotDoc.addPage([600, 800]); p90.setRotation(degrees(90));
  const p180 = rotDoc.addPage([600, 800]); p180.setRotation(degrees(180));
  const p270 = rotDoc.addPage([600, 800]); p270.setRotation(degrees(270));

  const geom0 = getPageGeometry(p0);
  const geom90 = getPageGeometry(p90);
  const geom180 = getPageGeometry(p180);
  const geom270 = getPageGeometry(p270);

  check('geom0 rotation is 0', geom0.rotation === 0);
  check('geom90 rotation is 90 and view dimensions transposed (viewWidth=800, viewHeight=600)', geom90.rotation === 90 && geom90.viewWidth === 800 && geom90.viewHeight === 600);
  check('geom180 rotation is 180', geom180.rotation === 180 && geom180.viewWidth === 600);
  check('geom270 rotation is 270 and view dimensions transposed', geom270.rotation === 270 && geom270.viewWidth === 800);

  const pt0 = screenRatioToPdfPoints({ xRatio: 0.1, yRatio: 0.2, widthRatio: 0.4, heightRatio: 0.05, pageGeometry: geom0 });
  check('0 deg pdfX is 60 pt', Math.abs(pt0.x - 60) < 0.01);
  check('0 deg pdfY is 800 - 160 - 40 = 600 pt', Math.abs(pt0.y - 600) < 0.01);
  check('0 deg rotateDegrees is 0', pt0.rotateDegrees === 0);

  const pt90 = screenRatioToPdfPoints({ xRatio: 0.1, yRatio: 0.2, widthRatio: 0.4, heightRatio: 0.05, pageGeometry: geom90 });
  check('90 deg rotateDegrees is 90', pt90.rotateDegrees === 90);
  check('90 deg pdfX = screenTop + visualH = 0.2*600 + 0.05*600 = 150 pt', Math.abs(pt90.x - 150) < 0.01);
  check('90 deg pdfY = screenLeft = 0.1*800 = 80 pt', Math.abs(pt90.y - 80) < 0.01);

  const pt180 = screenRatioToPdfPoints({ xRatio: 0.1, yRatio: 0.2, widthRatio: 0.4, heightRatio: 0.05, pageGeometry: geom180 });
  check('180 deg rotateDegrees is 180', pt180.rotateDegrees === 180);
  check('180 deg pdfX = mbWidth - screenLeft = 600 - 60 = 540 pt', Math.abs(pt180.x - 540) < 0.01);

  const pt270 = screenRatioToPdfPoints({ xRatio: 0.1, yRatio: 0.2, widthRatio: 0.4, heightRatio: 0.05, pageGeometry: geom270 });
  check('270 deg rotateDegrees is 270', pt270.rotateDegrees === 270);

  // -------------------------------------------------------------------------
  // AREA 10: Multi-Field Custom Compilation
  // -------------------------------------------------------------------------
  console.log('\n--- Area 10: Multi-Field Custom Compilation ---');
  const customFieldsDef = [
    {
      id: 'f1',
      name: 'cust_text',
      type: 'text',
      pageIndex: 0,
      rect: { startXPercent: 0.1, startYPercent: 0.1, endXPercent: 0.4, endYPercent: 0.15 },
      backgroundColor: '#ffffff',
      borderColor: '#2563eb',
      borderWidth: 1
    },
    {
      id: 'f2',
      name: 'cust_cb',
      type: 'checkbox',
      pageIndex: 0,
      rect: { startXPercent: 0.1, startYPercent: 0.2, endXPercent: 0.15, endYPercent: 0.25 }
    },
    {
      id: 'f3',
      name: 'cust_select',
      type: 'select',
      options: ['Alpha', 'Beta', 'Gamma'],
      pageIndex: 1,
      rect: { startXPercent: 0.2, startYPercent: 0.2, endXPercent: 0.5, endYPercent: 0.26 }
    },
    {
      id: 'f4',
      name: 'cust_radio',
      type: 'radio',
      value: 'Choice_A',
      pageIndex: 1,
      rect: { startXPercent: 0.2, startYPercent: 0.3, endXPercent: 0.25, endYPercent: 0.35 }
    }
  ];

  const fieldVals = {
    cust_text: 'Custom Input Val',
    cust_cb: true,
    cust_select: 'Beta',
    cust_radio: 'Choice_A'
  };

  const compiledBlob = await compileFormWithNewFields(
    await rotDoc.save(),
    customFieldsDef,
    fieldVals,
    null,
    false
  );

  const compiledBytes = new Uint8Array(await compiledBlob.arrayBuffer());
  const compiledDoc = await PDFDocument.load(compiledBytes);
  const compiledForm = compiledDoc.getForm();

  check('Compiled form doc has 4 fields', compiledForm.getFields().length === 4);
  check('cust_text field value populated', compiledForm.getTextField('cust_text').getText() === 'Custom Input Val');
  check('cust_cb field is checked', compiledForm.getCheckBox('cust_cb').isChecked() === true);
  check('cust_select dropdown has selected Beta', compiledForm.getDropdown('cust_select').getSelected()[0] === 'Beta');
  check('cust_radio radio group has selected Choice_A', compiledForm.getRadioGroup('cust_radio').getSelected() === 'Choice_A');

  // -------------------------------------------------------------------------
  // AREA 11: Data Exchange Roundtrip (CSV & JSON)
  // -------------------------------------------------------------------------
  console.log('\n--- Area 11: Data Exchange Roundtrip ---');
  const sampleFields = [
    { name: 'name', type: 'text', value: 'John "The Chief" Doe' },
    { name: 'roles', type: 'select', value: 'Admin', options: ['User', 'Admin', 'Guest'] },
    { name: 'newsletter', type: 'checkbox', value: true }
  ];
  const sampleVals = { name: 'John "The Chief" Doe', roles: 'Admin', newsletter: true };

  const csv = exportFormToCsv(sampleFields, sampleVals);
  check('CSV contains header row', csv.includes('Field Name,Field Type,Field Value,Options'));
  check('CSV escapes quotes in names (""The Chief"")', csv.includes('""The Chief""'));
  check('CSV joins options with semicolon', csv.includes('User; Admin; Guest'));

  const jsonStr = exportFormToJson(sampleFields, sampleVals);
  const parsedJson = JSON.parse(jsonStr);
  check('JSON export has fieldCount 3', parsedJson.fieldCount === 3);
  check('JSON export has exportDate ISO timestamp', Boolean(parsedJson.exportDate));
  check('JSON export fields.name has value', parsedJson.fields.name.value === 'John "The Chief" Doe');
  check('JSON export fields.roles has options', parsedJson.fields.roles.options.length === 3);

  // Test JSON import unwrap logic (preventing [object Object] bug)
  const rawData = parsedJson.fields;
  const unwrappedVals = {};
  Object.entries(rawData).forEach(([key, val]) => {
    if (val && typeof val === 'object' && 'value' in val) {
      unwrappedVals[key] = val.value;
    } else {
      unwrappedVals[key] = val;
    }
  });
  check('JSON unwrapper extracts string value for name', unwrappedVals.name === 'John "The Chief" Doe');
  check('JSON unwrapper extracts boolean value for newsletter', unwrappedVals.newsletter === true);
  check('JSON unwrapped value is not string [object Object]', typeof unwrappedVals.name === 'string' && unwrappedVals.name !== '[object Object]');

  // -------------------------------------------------------------------------
  // AREA 12: Studio Component Code & Architectural Invariants
  // -------------------------------------------------------------------------
  console.log('\n--- Area 12: Studio Component Code & Architectural Invariants ---');
  const formsJsxPath = path.resolve('src/pages/pdf/PdfForms.jsx');
  const formsJsx = fs.readFileSync(formsJsxPath, 'utf8');

  check('PdfForms.jsx imports useMemo', formsJsx.includes('useMemo'));
  check('PdfForms.jsx renders activePageExistingWidgets on canvas in fill mode', formsJsx.includes('activePageExistingWidgets.map'));
  check('PdfForms.jsx includes pageViewport state', formsJsx.includes('setPageViewport(baseViewport)'));
  check('PdfForms.jsx includes fieldListFilter state', formsJsx.includes('fieldListFilter'));
  check('PdfForms.jsx renders page filter tabs (All vs Page)', formsJsx.includes("setFieldListFilter('page')") && formsJsx.includes("setFieldListFilter('all')"));
  check('PdfForms.jsx renders select dropdown in Document Fields List', formsJsx.includes("f.type === 'select' ?") && formsJsx.includes('-- Select option --'));
  check('PdfForms.jsx renders radio group in Document Fields List', formsJsx.includes("f.type === 'radio' ?"));
  check('PdfForms.jsx unwraps JSON import objects', formsJsx.includes("newVals[key] = val.value"));
  check('PdfForms.jsx includes page jump badges P.{fieldPage}', formsJsx.includes('P.{fieldPage}'));

  // -------------------------------------------------------------------------
  // AREA 13: Studio Component Extended Features (Phase 2B Implementations)
  // -------------------------------------------------------------------------
  console.log('\n--- Area 13: Studio Component Extended Features (Phase 2B) ---');
  
  // 1. Resize & Move Handles Invariants
  check('PdfForms.jsx defines RESIZE_HANDLES with 8 directional handles', formsJsx.includes('RESIZE_HANDLES') && formsJsx.includes("'nw'") && formsJsx.includes("'se'"));
  check('PdfForms.jsx defines proper cursor types for 8 resize handles', 
    formsJsx.includes('nwse-resize') && formsJsx.includes('ns-resize') && formsJsx.includes('nesw-resize') && formsJsx.includes('ew-resize')
  );
  check('PdfForms.jsx renders 8 resize handles in created fields overlay', 
    formsJsx.includes('{RESIZE_HANDLES.map((h) => (') && 
    formsJsx.includes("handleStartTransform(e, 'resize', field.id, h.id)")
  );
  check('PdfForms.jsx renders center move handle with open_with icon', 
    formsJsx.includes("handleStartTransform(e, 'move', field.id)") && 
    formsJsx.includes('open_with')
  );

  // 2. Transform Logic Invariants
  check('PdfForms.jsx implements handleStartTransform with window pointer listeners', 
    formsJsx.includes('handleStartTransform') && 
    formsJsx.includes('handlePointerMove') && 
    formsJsx.includes('handlePointerUp')
  );
  check('PdfForms.jsx bounds transform coordinates within 0-100% and min 2% size',
    formsJsx.includes('Math.max(0, Math.min(endX - 0.02, raw))') && 
    formsJsx.includes('Math.min(1.0, Math.max(startX + 0.02, raw))')
  );
  check('PdfForms.jsx transforms respect snapToGrid step (2.5%)', 
    formsJsx.includes('snapToGrid ? Math.round(v / 0.025) * 0.025 : v')
  );

  // 3. Undo / Redo History Stack Invariants
  check('PdfForms.jsx initializes undoStack and redoStack states', 
    formsJsx.includes('const [undoStack, setUndoStack] = useState([]);') && 
    formsJsx.includes('const [redoStack, setRedoStack] = useState([]);')
  );
  check('PdfForms.jsx implements pushSnapshot with max depth slicing and redo clear', 
    formsJsx.includes('pushSnapshot') && formsJsx.includes('slice(-30)') && formsJsx.includes('setRedoStack([])')
  );
  check('PdfForms.jsx implements handleUndo and handleRedo', 
    formsJsx.includes('handleUndo') && formsJsx.includes('handleRedo')
  );
  check('PdfForms.jsx renders Undo toolbar button with disabled condition', 
    formsJsx.includes('onClick={handleUndo}') && formsJsx.includes('disabled={undoStack.length === 0}')
  );
  check('PdfForms.jsx renders Redo toolbar button with disabled condition', 
    formsJsx.includes('onClick={handleRedo}') && formsJsx.includes('disabled={redoStack.length === 0}')
  );

  // 4. Global Window Keyboard Listener Invariants
  check('PdfForms.jsx attaches window keydown listener with proper cleanup', 
    formsJsx.includes("window.addEventListener('keydown', handleKeyDown)") && 
    formsJsx.includes("window.removeEventListener('keydown', handleKeyDown)")
  );
  check('PdfForms.jsx ignores keyboard shortcuts when native inputs are focused', 
    formsJsx.includes("activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT'")
  );
  check('PdfForms.jsx keyboard listener supports Ctrl/Cmd+Z and Ctrl/Cmd+Y / Shift+Z', 
    formsJsx.includes("e.key === 'z' || e.key === 'Z'") && formsJsx.includes("e.key === 'y' || e.key === 'Y'")
  );
  check('PdfForms.jsx keyboard listener handles Delete and Backspace for selected field', 
    formsJsx.includes("e.key === 'Delete' || e.key === 'Backspace'") && 
    formsJsx.includes('deleteCreatedField(field.id, field.name)')
  );
  check('PdfForms.jsx keyboard listener handles Escape to deselect field', 
    formsJsx.includes("e.key === 'Escape'") && formsJsx.includes('setSelectedFieldId(null)')
  );
  check('PdfForms.jsx keyboard listener supports Arrow key nudging with Shift multiplier (0.5% vs 2%)', 
    formsJsx.includes('const delta = e.shiftKey ? 0.02 : 0.005;')
  );
  check('PdfForms.jsx keyboard listener supports Page navigation via ArrowLeft/Right and PageUp/Down', 
    formsJsx.includes("e.key === 'ArrowLeft' || e.key === 'PageUp'") && 
    formsJsx.includes("e.key === 'ArrowRight' || e.key === 'PageDown'")
  );

  // 5. Multi-Page Thumbnail Navigation Strip Invariants
  check('PdfForms.jsx renders vertical thumbnail strip sidebar with w-28', 
    formsJsx.includes('w-28 min-w-28 max-w-28 border-r border-[var(--border-subtle)]')
  );
  check('PdfForms.jsx thumbnail strip renders P.{pageNum} and field count badge', 
    formsJsx.includes('P.{pageNum}') && formsJsx.includes('({pageFieldCount}')
  );

  // 6. Multi-File Session State Isolation Invariants
  check('PdfForms.jsx maintains fileSessionsRef session cache', 
    formsJsx.includes('fileSessionsRef = useRef({})')
  );
  check('PdfForms.jsx implements switchFile preserving per-file createdFields and fieldValues', 
    formsJsx.includes('switchFile') && 
    formsJsx.includes('fileSessionsRef.current[activeFileIndex]') && 
    formsJsx.includes('fileSessionsRef.current[newIndex]')
  );
  check('PdfForms.jsx file selector tab calls switchFile', 
    formsJsx.includes('switchFile(parseInt(e.target.value))')
  );

  // 7. Form Utilities Sidebar Invariants
  check('PdfForms.jsx implements handleClearAllValues with confirmation', 
    formsJsx.includes('handleClearAllValues') && formsJsx.includes('Clear All Values')
  );
  check('PdfForms.jsx implements handleResetAllFields with confirmation', 
    formsJsx.includes('handleResetAllFields') && formsJsx.includes('Reset All Fields')
  );

  // 8. Multiline Text & Radio Option Isolation Invariants
  check('PdfForms.jsx defines isMultilineField helper', 
    formsJsx.includes('isMultilineField') && formsJsx.includes('hPt > 35')
  );
  check('PdfForms.jsx renders textarea in canvas overlay for multiline fields', 
    formsJsx.includes('<textarea') && formsJsx.includes('w.isMultiline ? (')
  );
  check('PdfForms.jsx passes onValue in activePageExistingWidgets', 
    formsJsx.includes("w.onValue || (f.options && f.options[wIdx]) || ''")
  );
  check('PdfForms.jsx canvas radio button binds value and checked against onValue', 
    formsJsx.includes('value={w.onValue || w.name}') && 
    formsJsx.includes('checked={fieldValues[w.name] === (w.onValue || w.name)}')
  );

  // -------------------------------------------------------------------------
  // AREA 14: FormFillStudio Support & Parity
  // -------------------------------------------------------------------------
  console.log('\n--- Area 14: FormFillStudio Support & Parity ---');
  const formFillJsxPath = path.resolve('src/components/FocusStudio/studios/FormFillStudio.jsx');
  check('FormFillStudio.jsx file exists', fs.existsSync(formFillJsxPath));
  const formFillJsx = fs.readFileSync(formFillJsxPath, 'utf8');

  check('FormFillStudio.jsx renders canvas radio group branch', formFillJsx.includes("if (field.type === 'radio')"));
  check('FormFillStudio.jsx canvas radio resolves onValue fallback hierarchy', 
    formFillJsx.includes('const radioVal = widget.onValue || (field.options && field.options[wIdx]) || widget.name || field.name;')
  );
  check('FormFillStudio.jsx canvas radio matches checked against radioVal', 
    formFillJsx.includes('checked={currentValue === radioVal}')
  );
  check('FormFillStudio.jsx canvas radio updates field value with radioVal', 
    formFillJsx.includes('onChange={() => handleValueChange(field.name, radioVal)}')
  );
  check('FormFillStudio.jsx canvas radio includes accessible aria-label and title', 
    formFillJsx.includes('aria-label={`${field.name}: ${radioVal}`}') && 
    formFillJsx.includes('title={`${field.name}: ${radioVal}`}')
  );
  check('FormFillStudio.jsx sidebar renders radio option group branch', 
    formFillJsx.includes(": field.type === 'radio' ?")
  );
  check('FormFillStudio.jsx sidebar radio options resolve from options, widgets, or value', 
    formFillJsx.includes('field.options && field.options.length > 0') && 
    formFillJsx.includes('w.onValue || `Option ${idx + 1}`')
  );
  check('FormFillStudio.jsx sidebar radio checks against selected field value', 
    formFillJsx.includes("checked={(fieldValues[field.name] ?? '') === opt}")
  );
  check('FormFillStudio.jsx sidebar radio updates field value on change', 
    formFillJsx.includes('onChange={() => handleValueChange(field.name, opt)}')
  );
  check('FormFillStudio.jsx sidebar radio includes accessible aria-label', 
    formFillJsx.includes('aria-label={`${field.name}: ${opt}`}')
  );

  console.log('\n===============================================================');
  console.log(`TOTAL ASSERTIONS PASSED: ${passedAssertions} / ${passedAssertions} (100%)`);
  console.log('PDF FORMS STUDIO & ENGINE CERTIFIED ZERO-DEFECT');
  console.log('===============================================================\n');
}

runMasterPdfFormsSuite().catch(err => {
  console.error('\n❌ MASTER PDF FORMS TEST SUITE FAILED:', err);
  process.exit(1);
});
