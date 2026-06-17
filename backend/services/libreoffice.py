import subprocess
import tempfile
from pathlib import Path
from dataclasses import dataclass
import sys
from backend import config

# Supported format mappings
SUPPORTED_CONVERSIONS = {
    # Word formats
    "docx": ["pdf", "odt", "rtf", "html", "txt"],
    "doc":  ["pdf", "docx", "odt", "txt"],
    "odt":  ["pdf", "docx", "rtf", "html", "txt"],
    # Excel formats
    "xlsx": ["pdf", "csv", "ods", "html"],
    "xls":  ["pdf", "xlsx", "csv", "html"],
    "ods":  ["pdf", "xlsx", "csv"],
    # PowerPoint formats
    "pptx": ["pdf", "odp", "html"],
    "ppt":  ["pdf", "pptx", "odp"],
    "odp":  ["pdf", "pptx"],
    # Text/Others
    "rtf":  ["pdf", "docx", "html"],
    "txt":  ["pdf"],
}

@dataclass
class ConversionResult:
    success: bool
    output_path: str = None
    error_message: str = None
    file_size_bytes: int = None

def convert_with_libreoffice(input_path: str, target_format: str) -> ConversionResult:
    """
    Convert a document using headless LibreOffice.
    Supports Windows and Linux environments.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")

        ext = input_file.suffix.lower().replace(".", "")
        if ext not in SUPPORTED_CONVERSIONS or target_format not in SUPPORTED_CONVERSIONS[ext]:
            return ConversionResult(
                success=False, 
                error_message=f"Conversion from {ext} to {target_format} is not supported"
            )

        # Output to our designated output directory
        output_dir = config.OUTPUT_DIR
        
        # Create a temporary directory for an isolated LibreOffice user profile
        with tempfile.TemporaryDirectory() as temp_env:
            # The UserInstallation path must be a file URI
            env_uri = Path(temp_env).as_uri()

            # Build subprocess command
            # --headless: Run without GUI
            # --convert-to: Target format
            # --outdir: Output directory
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
                target_format,
                "--outdir",
                str(output_dir),
                str(input_file)
            ]

            # In Windows, prevent console window popup during background execution
            creation_flags = 0
            if sys.platform == "win32":
                # 0x08000000 = CREATE_NO_WINDOW
                creation_flags = 0x08000000

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120, # 2 minutes timeout to prevent hanging
                creationflags=creation_flags
            )

        if result.returncode != 0:
            return ConversionResult(
                success=False, 
                error_message=f"LibreOffice process failed (code {result.returncode}): {result.stderr or result.stdout}"
            )

        # Find the expected output file name
        expected_output = output_dir / f"{input_file.stem}.{target_format}"
        if not expected_output.exists():
            # Sometimes LibreOffice sanitizes output name space characters
            # Let's search output folder for any file with matching stem and extension
            matches = list(output_dir.glob(f"*{input_file.stem}*.{target_format}"))
            if matches:
                expected_output = matches[0]
            else:
                return ConversionResult(
                    success=False, 
                    error_message="Conversion process finished but output file could not be found"
                )

        return ConversionResult(
            success=True,
            output_path=str(expected_output),
            file_size_bytes=expected_output.stat().st_size
        )

    except subprocess.TimeoutExpired:
        return ConversionResult(success=False, error_message="Conversion timed out after 120 seconds")
    except Exception as e:
        return ConversionResult(success=False, error_message=str(e))
