const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/utility/DocumentViewer.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove static imports
content = content.replace("import * as pdfjsLib from 'pdfjs-dist';", "");
content = content.replace("const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();\npdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;", "");
content = content.replace("import { renderAsync as renderDocxAsync } from 'docx-preview';", "");
content = content.replace("import * as XLSX from 'xlsx';", "");
content = content.replace("import JSZip from 'jszip';", "");
content = content.replace("import hljs from 'highlight.js';", "");
content = content.replace("import { pptxToHtml } from '@jvmr/pptx-to-html';", "");

// 2. Add React states for lazy modules
const stateTarget = `  // State Management
  const [rawFiles, setRawFiles] = useState([]);
  const [files, setFiles] = useState([]);`;

const stateReplacement = `  // State Management
  const [rawFiles, setRawFiles] = useState([]);
  const [files, setFiles] = useState([]);
  const [pdfjs, setPdfjs] = useState(null);
  const [xlsxModule, setXlsxModule] = useState(null);`;

content = content.replace(stateTarget, stateReplacement);

// 3. Dynamic pdf loading in loadActivePreview
const pdfTarget = `        case 'pdf': {
          const buffer = await fileObj.arrayBuffer();
          const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
          setPdfDoc(doc);
          setPdfTotalPages(doc.numPages);
          setPdfPage(1);
          setLoading(false);
          break;
        }`;

const pdfReplacement = `        case 'pdf': {
          const pdfjsModule = await import('pdfjs-dist');
          pdfjsModule.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
          setPdfjs(pdfjsModule);
          const buffer = await fileObj.arrayBuffer();
          const doc = await pdfjsModule.getDocument({ data: buffer }).promise;
          setPdfDoc(doc);
          setPdfTotalPages(doc.numPages);
          setPdfPage(1);
          setLoading(false);
          break;
        }`;

content = content.replace(pdfTarget, pdfReplacement);

// 4. Update Excel loading cases
const excelTarget = `        case 'xlsx':
        case 'xls': {
          const buffer = await fileObj.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          setExcelBook(wb);
          setExcelActiveSheet(wb.SheetNames[0]);
          loadExcelSheet(wb, wb.SheetNames[0]);
          setLoading(false);
          break;
        }
        case 'csv': {
          const buffer = await fileObj.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          setExcelBook(wb);
          setExcelActiveSheet(wb.SheetNames[0]);
          loadExcelSheet(wb, wb.SheetNames[0]);
          setLoading(false);
          break;
        }`;

const excelReplacement = `        case 'xlsx':
        case 'xls': {
          const XLSX = await import('xlsx');
          setXlsxModule(XLSX);
          const buffer = await fileObj.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          setExcelBook(wb);
          setExcelActiveSheet(wb.SheetNames[0]);
          loadExcelSheet(wb, wb.SheetNames[0], XLSX);
          setLoading(false);
          break;
        }
        case 'csv': {
          const XLSX = await import('xlsx');
          setXlsxModule(XLSX);
          const buffer = await fileObj.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          setExcelBook(wb);
          setExcelActiveSheet(wb.SheetNames[0]);
          loadExcelSheet(wb, wb.SheetNames[0], XLSX);
          setLoading(false);
          break;
        }`;

content = content.replace(excelTarget, excelReplacement);

// 5. Update ZIP loading case
const zipTarget = `        case 'zip': {
          const zip = await JSZip.loadAsync(fileObj);`;

const zipReplacement = `        case 'zip': {
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(fileObj);`;

content = content.replace(zipTarget, zipReplacement);

// 6. Update Text syntax highlighting fallback case
const textHighlightTarget = `            setTextContent(text);
            const hlResult = hljs.highlightAuto(text);
            setCodeHtml(hlResult.value);`;

const textHighlightReplacement = `            setTextContent(text);
            const hljsModule = (await import('highlight.js')).default;
            const hlResult = hljsModule.highlightAuto(text);
            setCodeHtml(hlResult.value);`;

content = content.replace(textHighlightTarget, textHighlightReplacement);

// 7. Update local pptx parsing
const pptxTarget = `  // Local PPTX Parser
  const loadLocalPptx = async (fileObj) => {
    try {
      setLoading(true);
      const buffer = await fileObj.arrayBuffer();
      const slides = await pptxToHtml(buffer, {`;

const pptxReplacement = `  // Local PPTX Parser
  const loadLocalPptx = async (fileObj) => {
    try {
      setLoading(true);
      const { pptxToHtml } = await import('@jvmr/pptx-to-html');
      const buffer = await fileObj.arrayBuffer();
      const slides = await pptxToHtml(buffer, {`;

content = content.replace(pptxTarget, pptxReplacement);

// 8. Update loadExcelSheet helper signature
const loadExcelSheetTarget = `  // Helper load Excel worksheets
  const loadExcelSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });`;

const loadExcelSheetReplacement = `  // Helper load Excel worksheets
  const loadExcelSheet = (wb, sheetName, XLSX = xlsxModule) => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });`;

content = content.replace(loadExcelSheetTarget, loadExcelSheetReplacement);

// 9. Update docx-preview call inside useEffect
const docxTarget = `        await renderDocxAsync(activeFile.fileObject, container, null, {`;

const docxReplacement = `        const { renderAsync } = await import('docx-preview');
        await renderAsync(activeFile.fileObject, container, null, {`;

content = content.replace(docxTarget, docxReplacement);

// 10. Update JSX table rendering reference
content = content.replaceAll(
  '{XLSX.utils.encode_col(colIdx)}',
  '{xlsxModule?.utils.encode_col(colIdx)}'
);

// 11. Add checks for pdfjs module in PDF render effect
content = content.replace(
  "if (!pdfDoc || activeFile?.extension !== 'pdf') return;",
  "if (!pdfDoc || activeFile?.extension !== 'pdf' || !pdfjs) return;"
);
content = content.replaceAll(
  "new pdfjsLib.TextLayer(",
  "new pdfjs.TextLayer("
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('DocumentViewer optimized with dynamic imports successfully.');
