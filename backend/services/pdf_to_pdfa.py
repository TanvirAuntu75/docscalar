import subprocess
import sys
import tempfile
from pathlib import Path

from backend import config
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf


def convert_pdf_to_pdfa(input_path: str) -> ConversionResult:
    """
    Converts a PDF file to ISO-compliant PDF/A format using LibreOffice Draw writer filters.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(
                success=False, error_message="Input file does not exist"
            )

        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)

        output_dir = config.OUTPUT_DIR
        temp_profile_dir = Path(tempfile.mkdtemp(prefix="lo_profile_"))
        env_uri = temp_profile_dir.resolve().as_uri()

        try:
            # Build draw_pdf_Export command with PDF/A-1b compliance filter
            cmd = [
                config.LIBREOFFICE_PATH,
                "--headless",
                "--invisible",
                "--nologo",
                "--nodefault",
                "--norestore",
                "--nofirststartwizard",
                f"-env:UserInstallation={env_uri}",
                "--convert-to",
                'pdf:draw_pdf_Export:{"SelectPdfVersion":{"type":"long","value":"1"}}',
                "--outdir",
                str(output_dir),
                str(input_file),
            ]

            creation_flags = 0
            if sys.platform == "win32":
                creation_flags = 0x08000000  # CREATE_NO_WINDOW

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
                creationflags=creation_flags,
            )

            if result.returncode != 0:
                return ConversionResult(
                    success=False,
                    error_message=f"LibreOffice PDF/A conversion failed: {result.stderr or result.stdout}",
                )

            # Expected output filename (usually input_file.stem + .pdf)
            # To avoid colliding with original file names, let's rename it to stem + _pdfa.pdf
            original_output = output_dir / f"{input_file.stem}.pdf"
            target_output = output_dir / f"{input_file.stem}_pdfa.pdf"

            if not original_output.exists():
                # Search for any matches excluding already converted _pdfa.pdf
                matches = [
                    f
                    for f in output_dir.glob(f"*{input_file.stem}*.pdf")
                    if not f.name.endswith("_pdfa.pdf")
                ]
                if matches:
                    original_output = matches[0]
                else:
                    return ConversionResult(
                        success=False,
                        error_message="Conversion finished but output PDF/A could not be found",
                    )

            # Rename output to specify it as PDF/A using os.replace
            if original_output.exists():
                import os

                os.replace(str(original_output), str(target_output))

            return ConversionResult(
                success=True,
                output_path=str(target_output),
                file_size_bytes=target_output.stat().st_size,
            )
        finally:
            import shutil

            shutil.rmtree(temp_profile_dir, ignore_errors=True)
    except subprocess.TimeoutExpired:
        return ConversionResult(
            success=False, error_message="LibreOffice PDF/A conversion timed out"
        )
    except Exception as e:
        return ConversionResult(success=False, error_message=str(e))
