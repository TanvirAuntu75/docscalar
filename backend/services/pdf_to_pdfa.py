import logging
import os
import subprocess
import uuid
from pathlib import Path

from backend import config
from backend.services.libreoffice import (
    ConversionResult,
    is_valid_pdf_structure,
    kill_process_tree,
    resolve_ghostscript_binary,
)
from backend.services.utils import validate_pdf

logger = logging.getLogger("pdf_to_pdfa")


def convert_pdf_to_pdfa(input_path: str) -> ConversionResult:
    """
    Converts a PDF file to ISO 19005-2 (PDF/A-2b) compliant archival format using Ghostscript CLI.
    Operating directly on the PostScript/PDF stream avoids LibreOffice Draw vector-to-drawing distortion.
    Includes process tree termination safety and output concurrency isolation.
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

        gs_exec = resolve_ghostscript_binary()
        if not gs_exec:
            return ConversionResult(
                success=False,
                error_message="Ghostscript binary not found on host system. Please install Ghostscript (gswin64c / gs) for ISO-compliant PDF/A conversion.",
            )

        output_dir = config.OUTPUT_DIR
        output_dir.mkdir(parents=True, exist_ok=True)
        # Use collision-safe unique filename with entropy
        entropy = uuid.uuid4().hex[:8]
        target_output = output_dir / f"{input_file.stem}_{entropy}_pdfa.pdf"

        # Build Ghostscript PDF/A-2b compliance command
        cmd = [
            gs_exec,
            "-dBATCH",
            "-dNOPAUSE",
            "-dNOOUTERSAVE",
            "-sDEVICE=pdfwrite",
            "-dPDFA=2",  # PDF/A-2b ISO 19005-2 compliance
            "-dPDFACompatibilityPolicy=1",  # Strict conformance policy
            "-sColorConversionStrategy=UseDeviceIndependentColor",
            "-dAutoRotatePages=/None",
            "-dEmbedAllFonts=true",
            "-dSubsetFonts=true",
            "-dCompressFonts=true",
            f"-sOutputFile={target_output!s}",
            str(input_file),
        ]

        popen_kw = dict(stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if os.name == "posix":
            popen_kw["preexec_fn"] = os.setsid
        else:
            popen_kw["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP

        proc = subprocess.Popen(cmd, **popen_kw)
        try:
            stdout_bytes, stderr_bytes = proc.communicate(timeout=120)
            stdout = stdout_bytes.decode("utf-8", errors="replace")
            stderr = stderr_bytes.decode("utf-8", errors="replace")
        except subprocess.TimeoutExpired:
            logger.error("Ghostscript PDF/A conversion timed out after 120s; terminating process tree")
            kill_process_tree(proc, grace_s=3.0)
            try:
                proc.communicate(timeout=2.0)
            except Exception:
                pass
            return ConversionResult(
                success=False, error_message="Ghostscript PDF/A conversion timed out after 120s"
            )

        if proc.returncode != 0:
            error_detail = (stderr or stdout or "").strip()
            return ConversionResult(
                success=False,
                error_message=f"Ghostscript PDF/A conversion failed (exit code {proc.returncode}): {error_detail}",
            )

        if not target_output.exists() or target_output.stat().st_size == 0:
            return ConversionResult(
                success=False,
                error_message="Ghostscript finished but output PDF/A file was not generated",
            )

        if not is_valid_pdf_structure(target_output):
            return ConversionResult(
                success=False,
                error_message="Generated PDF/A failed structural integrity validation",
            )

        return ConversionResult(
            success=True,
            output_path=str(target_output),
            file_size_bytes=target_output.stat().st_size,
        )

    except Exception as e:
        logger.exception("Unexpected error in PDF/A conversion")
        return ConversionResult(success=False, error_message=str(e))


