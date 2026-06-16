import subprocess
import sys
from pathlib import Path
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf
from backend import config

def run_ocr_on_pdf(input_path: str, language: str = "eng") -> ConversionResult:
    """
    Applies OCR to a PDF document, producing a searchable PDF.
    Requires Tesseract OCR installed on the system PATH.
    """
    try:
        from backend.jobs.queue import update_job_progress
        update_job_progress(10)
        
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")
            
        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)
            
        output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}_ocr.pdf"
        
        # Build command: python -m ocrmypdf --force-ocr -l eng input_path output_path
        cmd = [
            sys.executable,
            "-m",
            "ocrmypdf",
            "--force-ocr", # Forces OCR even if some text is present
            "-l", language,
            str(input_file),
            str(output_pdf_path)
        ]
        
        creation_flags = 0
        if sys.platform == "win32":
            creation_flags = 0x08000000 # CREATE_NO_WINDOW
            
        update_job_progress(40)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            creationflags=creation_flags
        )
        update_job_progress(90)
        
        if result.returncode != 0:
            err_msg = result.stderr or result.stdout
            if "tesseract" in err_msg.lower() or "missing dependency" in err_msg.lower() or "executable" in err_msg.lower():
                return ConversionResult(
                    success=False,
                    error_message="OCR Engine error: Tesseract OCR is not installed or not on the system PATH. Please install Tesseract on the server."
                )
            return ConversionResult(
                success=False,
                error_message=f"OCR execution failed: {err_msg}"
            )
            
        if not output_pdf_path.exists():
            return ConversionResult(
                success=False,
                error_message="OCR completed but output searchable PDF was not found."
            )
            
        update_job_progress(100)
        return ConversionResult(
            success=True,
            output_path=str(output_pdf_path),
            file_size_bytes=output_pdf_path.stat().st_size
        )
        
    except Exception as e:
        return ConversionResult(success=False, error_message=f"OCR service error: {str(e)}")
