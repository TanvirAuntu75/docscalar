/* Excel to PDF engine using read-excel-file + jsPDF + jspdf-autotable */
import readXlsxFile from 'read-excel-file/browser';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Convert an Excel (.xlsx) file to PDF.
 * @param {File} file - The .xlsx file
 * @param {function} onProgress
 * @returns {Promise<Blob>}
 */
export async function excelToPdf(file, onProgress) {
  if (onProgress) onProgress(10);

  // Step 1: Read the list of sheet names in the workbook
  const sheetNames = await readXlsxFile(file, { getSheets: true });
  if (onProgress) onProgress(30);

  if (!sheetNames || sheetNames.length === 0) {
    throw new Error("No worksheets found in this Excel file.");
  }

  // Create PDF instance (default portrait, A4)
  const pdf = new jsPDF('p', 'mm', 'a4');
  let isFirstSheet = true;

  for (let i = 0; i < sheetNames.length; i++) {
    const sheetName = sheetNames[i].name;

    // Step 2: Parse raw rows for this specific sheet
    const rows = await readXlsxFile(file, { sheet: sheetName });

    // Clean up empty trailing rows/columns to avoid unnecessary page generation
    const cleanedRows = rows.map(row => row.map(cell => cell === null ? '' : String(cell)));
    
    // Skip completely empty sheets
    const hasData = cleanedRows.some(row => row.some(cell => cell !== ''));
    if (!hasData) continue;

    if (!isFirstSheet) {
      pdf.addPage();
    }
    isFirstSheet = false;

    // Detect column counts
    const maxCols = Math.max(...cleanedRows.map(r => r.length), 0);

    // Layout Optimization: Auto-switch A4 page orientation to landscape if columns > 7
    if (maxCols > 7) {
      pdf.setPage(pdf.internal.getNumberOfPages());
      // Adjust A4 width and height dynamically for landscape A4 (297mm x 210mm)
      pdf.internal.pageSize.width = 297;
      pdf.internal.pageSize.height = 210;
    } else {
      pdf.internal.pageSize.width = 210;
      pdf.internal.pageSize.height = 297;
    }

    // Prepare table headers (first row) and body (subsequent rows)
    const headers = cleanedRows[0] || [];
    const body = cleanedRows.slice(1) || [];

    // Draw sheet title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(sheetName, 14, 15);

    // Step 3: Draw spreadsheet grid as auto-table
    pdf.autoTable({
      head: [headers],
      body: body,
      startY: 20,
      margin: { left: 14, right: 14, top: 20, bottom: 15 },
      styles: {
        fontSize: maxCols > 12 ? 6 : (maxCols > 8 ? 8 : 10), // Dynamically scale font size for readability
        cellPadding: 2,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [59, 130, 246], // Beautiful DocForge branding blue
        textColor: 255,
        fontStyle: 'bold'
      },
      theme: 'grid', // Ensure grid borders are painted to resemble an Excel sheet
    });

    if (onProgress) {
      const pct = Math.round(30 + ((i + 1) / sheetNames.length) * 70);
      onProgress(pct);
    }
  }

  if (onProgress) onProgress(100);
  return pdf.output('blob');
}
