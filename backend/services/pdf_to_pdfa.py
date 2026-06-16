import subprocess
import sys
from pathlib import Path
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf
from backend import config

def convert_pdf_to_pdfa(input_path: str) -> ConversionResult:
    """
    Converts a PDF file to ISO-compliant PDF/A format using LibreOffice Draw writer filters.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")
            
        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)
            
        output_dir = config.OUTPUT_DIR
        
        # Build draw_pdf_Export command
        cmd = [
            config.LIBREOFFICE_PATH,
            "--headless",
            "--convert-to",
            "pdf:draw_pdf_Export",
            "--outdir",
            str(output_dir),
            str(input_file)
        ]
        
        creation_flags = 0
        if sys.platform == "win32":
            creation_flags = 0x08000000 # CREATE_NO_WINDOW
            
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            creationflags=creation_flags
        )
        
        if result.returncode != 0:
            return ConversionResult(
                success=False,
                error_message=f"LibreOffice PDF/A conversion failed: {result.stderr or result.stdout}"
            )
            
        # Expected output filename (usually input_file.stem + .pdf)
        # To avoid colliding with original file names, let's rename it to stem + _pdfa.pdf
        original_output = output_dir / f"{input_file.stem}.pdf"
        target_output = output_dir / f"{input_file.stem}_pdfa.pdf"
        
        if not original_output.exists():
            # Search for any matches
            matches = list(output_dir.glob(f"*{input_file.stem}*.pdf"))
            if matches:
                original_output = matches[0]
            else:
                return ConversionResult(
                    success=False,
                    error_message="Conversion finished but output PDF/A could not be found"
                )
                
        # Rename output to specify it as PDF/A
        if original_output.exists():
            original_output.rename(target_output)
            
        return ConversionResult(
            success=True,
            output_path=str(target_output),
            file_size_bytes=target_output.stat().st_size
        )
    except subprocess.TimeoutExpired:
        return ConversionResult(success=False, error_message="LibreOffice PDF/A conversion timed out")
    except Exception as e:
        return ConversionResult(success=False, error_message=str(e))
