import pdfplumber
import openpyxl
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf
from backend import config
from pathlib import Path

def convert_pdf_to_excel(input_path: str) -> ConversionResult:
    """
    Extract tables from PDF document pages and compile them into an Excel workbook sheet.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")
            
        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)
            
        output_xlsx_path = config.OUTPUT_DIR / f"{input_file.stem}.xlsx"
        
        wb = openpyxl.Workbook()
        # Remove default active sheet
        wb.remove(wb.active)
        
        with pdfplumber.open(input_file) as pdf:
            for idx, page in enumerate(pdf.pages):
                sheet = wb.create_sheet(title=f"Page {idx + 1}")
                tables = page.extract_tables()
                
                row_offset = 1
                for table in tables:
                    for row in table:
                        for col_idx, cell in enumerate(row):
                            # Write cell values (convert to float/int if numeric for convenience)
                            val = cell
                            if cell is not None:
                                cell_str = str(cell).strip()
                                try:
                                    if '.' in cell_str:
                                        val = float(cell_str)
                                    else:
                                        val = int(cell_str)
                                except ValueError:
                                    pass
                            
                            sheet.cell(row=row_offset, column=col_idx + 1, value=val)
                        row_offset += 1
                    # Append 2 blank rows between distinct table boundaries on the same page
                    row_offset += 2
                    
        wb.save(output_xlsx_path)
        
        if not output_xlsx_path.exists():
            return ConversionResult(success=False, error_message="Compilation completed but output xlsx was not found")
            
        return ConversionResult(
            success=True,
            output_path=str(output_xlsx_path),
            file_size_bytes=output_xlsx_path.stat().st_size
        )
    except Exception as e:
        return ConversionResult(success=False, error_message=str(e))
