from pathlib import Path
from pdf2docx import Converter
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf
from backend import config

def convert_pdf_to_docx(input_path: str) -> ConversionResult:
    """
    Convert a PDF file to editable DOCX format using pdf2docx.
    Outputs the result to the designated OUTPUT_DIR.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")
            
        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)
            
        output_docx_path = config.OUTPUT_DIR / f"{input_file.stem}.docx"
        
        # Initialize the converter
        cv = Converter(str(input_file))
        
        # Convert all pages
        cv.convert(str(output_docx_path), start=0, end=None)
        cv.close()
        
        if not output_docx_path.exists():
            return ConversionResult(
                success=False,
                error_message="Conversion completed but output docx file could not be found"
            )
            
        return ConversionResult(
            success=True,
            output_path=str(output_docx_path),
            file_size_bytes=output_docx_path.stat().st_size
        )
        
    except Exception as e:
        return ConversionResult(success=False, error_message=str(e))
