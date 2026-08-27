import logging
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

from backend import config

logger = logging.getLogger("libreoffice")

# Supported format mappings
SUPPORTED_CONVERSIONS = {
    # PDF input support
    "pdf": ["docx"],
    # Word formats
    "docx": ["pdf", "odt", "rtf", "html", "txt"],
    "doc": ["pdf", "docx", "odt", "txt"],
    "odt": ["pdf", "docx", "rtf", "html", "txt"],
    # Excel formats
    "xlsx": ["pdf", "csv", "ods", "html"],
    "xls": ["pdf", "xlsx", "csv", "html"],
    "ods": ["pdf", "xlsx", "csv"],
    # PowerPoint formats
    "pptx": ["pdf", "odp", "html"],
    "ppt": ["pdf", "pptx", "odp"],
    "odp": ["pdf", "pptx"],
    # Text/Others
    "rtf": ["pdf", "docx", "html"],
    "txt": ["pdf"],
}


@dataclass
class ConversionResult:
    success: bool
    output_path: str = None
    error_message: str = None
    file_size_bytes: int = None


# ---------- Shared LibreOffice Process & Validation Helpers ----------


def resolve_libreoffice_binary() -> str:
    """
    Locates the LibreOffice binary on the system PATH or common directories.
    """
    for name in ("libreoffice", "soffice", "soffice.bin"):
        path = shutil.which(name)
        if path:
            return path
    for cand in (
        "/usr/bin/soffice",
        "/opt/libreoffice/program/soffice",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    ):
        if Path(cand).exists():
            return cand
    raise RuntimeError(
        "LibreOffice not found on PATH or common installation directories."
    )


def run_libreoffice_subprocess(
    cmd: list[str], env: dict, cwd: str, timeout_s: float, kill_grace_s: float
) -> tuple[subprocess.Popen, bytes, bytes]:
    """
    Executes a subprocess command with a timeout and process group termination safety.
    """
    popen_kw = dict(stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=cwd, env=env)
    if os.name == "posix":
        popen_kw["preexec_fn"] = os.setsid
    else:
        popen_kw["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP

    proc = subprocess.Popen(cmd, **popen_kw)
    try:
        stdout, stderr = proc.communicate(timeout=timeout_s)
        return proc, stdout, stderr
    except subprocess.TimeoutExpired:
        logger.error(
            "LibreOffice process timed out after %.0fs; killing tree", timeout_s
        )
        kill_process_tree(proc, kill_grace_s)
        try:
            stdout, stderr = proc.communicate(timeout=kill_grace_s)
        except Exception:
            stdout, stderr = b"", b""
        raise subprocess.TimeoutExpired(cmd, timeout_s, stdout, stderr)


def kill_process_tree(proc: subprocess.Popen, grace_s: float = 5.0):
    """
    Kills a process and its children.
    """
    if proc.poll() is not None:
        return
    try:
        if os.name == "posix":
            pgid = os.getpgid(proc.pid)
            os.killpg(pgid, signal.SIGTERM)
            deadline = time.monotonic() + grace_s
            while time.monotonic() < deadline and proc.poll() is None:
                time.sleep(0.1)
            if proc.poll() is None:
                os.killpg(pgid, signal.SIGKILL)
        else:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True
            )
    except ProcessLookupError:
        pass
    except Exception:
        logger.exception("Error killing process tree")


def reap_process(proc: subprocess.Popen | None):
    """
    Gracefully reaps a subprocess.Popen object, closing lingering stream handles.
    """
    if proc is None:
        return
    try:
        if proc.poll() is None:
            proc.kill()
        proc.wait(timeout=5)
    except Exception:
        pass
    for stream in (getattr(proc, "stdout", None), getattr(proc, "stderr", None)):
        try:
            if stream and not stream.closed:
                stream.close()
        except Exception:
            pass


def purge_dir(tmpdir: str):
    """
    Deletes a temporary directory tree.
    """
    try:
        shutil.rmtree(tmpdir, ignore_errors=True)
    except Exception:
        logger.exception("Failed to purge temp dir %s", tmpdir)


def is_valid_pdf_structure(path: Path) -> bool:
    """
    Verifies if a PDF file structure is valid (starts with %PDF- and ends with %%EOF).
    """
    try:
        with open(path, "rb") as f:
            if f.read(5) != b"%PDF-":
                return False
            if path.stat().st_size > 1024:
                f.seek(-1024, os.SEEK_END)
            else:
                f.seek(0)
            tail = f.read()
        return b"%%EOF" in tail
    except Exception:
        logger.exception("PDF validation check failed")
        return False


# ---------- End of Shared Helpers ----------


def convert_with_libreoffice(input_path: str, target_format: str) -> ConversionResult:
    """
    Convert a document using headless LibreOffice.
    Supports Windows and Linux environments.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(
                success=False, error_message="Input file does not exist"
            )

        ext = input_file.suffix.lower().replace(".", "")

        # Dispatch to specialized converters dynamically to avoid circular imports
        if ext in ["xlsx", "xls", "csv", "ods"] and target_format == "pdf":
            from backend.services.excel_to_pdf import ConversionError as ExcelConvError
            from backend.services.excel_to_pdf import ExcelToPDFConverter

            try:
                converter = ExcelToPDFConverter()
                output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}.pdf"
                converter.convert(str(input_file), str(output_pdf_path))
                return ConversionResult(
                    success=True,
                    output_path=str(output_pdf_path),
                    file_size_bytes=output_pdf_path.stat().st_size,
                )
            except ExcelConvError as e:
                return ConversionResult(success=False, error_message=str(e))
            except Exception as e:
                return ConversionResult(
                    success=False,
                    error_message=f"Excel to PDF conversion failed: {e!s}",
                )

        elif ext in ["pptx", "ppt", "odp"] and target_format == "pdf":
            from backend.services.pptx_to_pdf import ConversionError as PptxConvError
            from backend.services.pptx_to_pdf import PPTXToPDFConverter

            try:
                converter = PPTXToPDFConverter()
                output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}.pdf"
                converter.convert(str(input_file), str(output_pdf_path))
                return ConversionResult(
                    success=True,
                    output_path=str(output_pdf_path),
                    file_size_bytes=output_pdf_path.stat().st_size,
                )
            except PptxConvError as e:
                return ConversionResult(success=False, error_message=str(e))
            except Exception as e:
                return ConversionResult(
                    success=False,
                    error_message=f"PowerPoint to PDF conversion failed: {e!s}",
                )

        if (
            ext not in SUPPORTED_CONVERSIONS
            or target_format not in SUPPORTED_CONVERSIONS[ext]
        ):
            return ConversionResult(
                success=False,
                error_message=f"Conversion from {ext} to {target_format} is not supported",
            )

        # Output to our designated output directory
        output_dir = config.OUTPUT_DIR

        # Use an isolated temporary profile directory to prevent concurrent lock file collisions
        temp_profile_dir = Path(tempfile.mkdtemp(prefix="lo_profile_"))
        env_uri = temp_profile_dir.resolve().as_uri()

        try:
            # Build subprocess command
            # --headless: Run without GUI
            # --convert-to: Target format
            # --outdir: Output directory
            if ext == "pdf":
                cmd = [
                    config.LIBREOFFICE_PATH,
                    "--headless",
                    "--invisible",
                    "--nologo",
                    "--nodefault",
                    "--norestore",
                    "--nofirststartwizard",
                    f"-env:UserInstallation={env_uri}",
                    "--infilter=writer_pdf_import",
                    "--convert-to",
                    target_format,
                    "--outdir",
                    str(output_dir),
                    str(input_file),
                ]
            else:
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
                    str(input_file),
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
                timeout=120,  # 2 minutes timeout to prevent hanging
                creationflags=creation_flags,
            )

            if result.returncode != 0:
                return ConversionResult(
                    success=False,
                    error_message=f"LibreOffice process failed (code {result.returncode}): {result.stderr or result.stdout}",
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
                        error_message="Conversion process finished but output file could not be found",
                    )

            return ConversionResult(
                success=True,
                output_path=str(expected_output),
                file_size_bytes=expected_output.stat().st_size,
            )
        finally:
            shutil.rmtree(temp_profile_dir, ignore_errors=True)

    except subprocess.TimeoutExpired:
        return ConversionResult(
            success=False, error_message="Conversion timed out after 120 seconds"
        )
    except Exception as e:
        return ConversionResult(success=False, error_message=str(e))
