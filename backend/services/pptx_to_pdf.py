import gc
import logging
import os
import shutil
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

from backend.services.libreoffice import (
    is_valid_pdf_structure,
    purge_dir,
    reap_process,
    resolve_libreoffice_binary,
    run_libreoffice_subprocess,
)

logger = logging.getLogger("pptx2pdf")

# OOXML / OLE2 magic
_ZIP_MAGIC = b"PK\x03\x04"  # .pptx is a ZIP
_OLE2_MAGIC = b"\xd0\xcf\x11\xe0"  # legacy .ppt compound file


class ConversionError(Exception):
    pass


class ConversionTimeout(ConversionError):
    pass


@dataclass
class ConverterConfig:
    timeout_s: float = 30.0
    kill_grace_s: float = 5.0  # SIGTERM -> SIGKILL grace
    soffice_bin: str | None = None  # auto-resolved if None
    max_input_bytes: int = 500 * 1024 * 1024
    allow_legacy_ppt: bool = True  # accept OLE2 .ppt as well
    lang: str = "C.UTF-8"


class PPTXToPDFConverter:
    def __init__(self, config: ConverterConfig | None = None, **kw):
        self.cfg = config or ConverterConfig(**kw)
        # Fall back to DocForge backend's detected LibreOffice path before scanning system PATH
        from backend import config as backend_config

        self.soffice = self.cfg.soffice_bin or getattr(
            backend_config, "LIBREOFFICE_PATH", None
        )

        # Verify binary resolution exists
        resolved = None
        if self.soffice:
            resolved = shutil.which(self.soffice) or (
                Path(self.soffice).exists() and self.soffice
            )
        if not resolved:
            try:
                self.soffice = resolve_libreoffice_binary()
            except Exception as e:
                raise ConversionError(
                    "LibreOffice binary not found. Please install LibreOffice locally "
                    "and ensure it is on your system PATH to run Office conversions."
                ) from e
        else:
            self.soffice = resolved
        logger.info("Using LibreOffice binary: %s", self.soffice)

    # ---------- public entrypoint ----------
    def convert(self, input_path: str, output_path: str) -> str:
        start = time.monotonic()
        in_path = Path(input_path).resolve()
        out_path = Path(output_path).resolve()

        self._preflight(in_path)

        tmpdir = tempfile.mkdtemp(prefix="pptx2pdf_")
        proc: subprocess.Popen | None = None
        stdout_data = b""
        stderr_data = b""
        try:
            # 3) isolate input in a unique dir -> no lock-file collisions
            work_in = Path(tmpdir) / in_path.name
            shutil.copy2(in_path, work_in)

            profile_dir = Path(tmpdir) / "lo_profile"
            profile_dir.mkdir(parents=True, exist_ok=True)
            out_dir = Path(tmpdir) / "out"
            out_dir.mkdir(parents=True, exist_ok=True)

            cmd = self._build_command(work_in, profile_dir, out_dir)
            env = self._build_env(profile_dir)

            logger.info(
                "Converting %s (timeout=%.0fs)", in_path.name, self.cfg.timeout_s
            )
            proc, stdout_data, stderr_data = self._run(cmd, env, tmpdir)

            # LibreOffice names output by basename; locate it
            produced = out_dir / (work_in.stem + ".pdf")
            self._postflight(produced, proc.returncode, stderr_data)

            out_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(produced), str(out_path))

            dur = time.monotonic() - start
            logger.info(
                "OK %s -> %s in %.2fs (%d bytes)",
                in_path.name,
                out_path.name,
                dur,
                out_path.stat().st_size,
            )
            return str(out_path)

        except ConversionError:
            raise
        except Exception as e:
            logger.exception("Unexpected conversion failure for %s", in_path.name)
            raise ConversionError(str(e)) from e
        finally:
            # 5) graceful cleanup on EVERY path
            self._reap(proc)
            self._purge(tmpdir)
            gc.collect()
            logger.debug("Cleanup complete; total %.2fs", time.monotonic() - start)

    # ---------- 2) pre-flight ----------
    def _preflight(self, in_path: Path):
        if not in_path.exists():
            raise ConversionError(f"Input not found: {in_path}")
        if not in_path.is_file():
            raise ConversionError(f"Input is not a file: {in_path}")
        size = in_path.stat().st_size
        if size == 0:
            raise ConversionError(f"Input is empty: {in_path}")
        if size > self.cfg.max_input_bytes:
            raise ConversionError(
                f"Input too large: {size} > {self.cfg.max_input_bytes} bytes"
            )
        with open(in_path, "rb") as f:
            head = f.read(8)
        is_zip = head.startswith(_ZIP_MAGIC)
        is_ole2 = head.startswith(_OLE2_MAGIC)
        if not is_zip and not (self.cfg.allow_legacy_ppt and is_ole2):
            raise ConversionError(
                f"Input does not look like a PowerPoint file (bad magic bytes): {in_path}"
            )

    # ---------- 4) command + environment ----------
    def _build_command(
        self, work_in: Path, profile_dir: Path, out_dir: Path
    ) -> list[str]:
        # file:// URI for the profile avoids path-quoting issues
        profile_uri = profile_dir.resolve().as_uri()
        return [
            self.soffice,
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--nodefault",
            "--norestore",  # don't pop a recovery dialog
            "--nolockcheck",
            f"-env:UserInstallation={profile_uri}",
            "--convert-to",
            "pdf:impress_pdf_Export",
            "--outdir",
            str(out_dir),
            str(work_in),
        ]

    def _build_env(self, profile_dir: Path) -> dict:
        env = os.environ.copy()
        env["HOME"] = str(profile_dir)  # isolate HOME for safety
        env["LC_ALL"] = self.cfg.lang
        env["LANG"] = self.cfg.lang
        env.pop("DISPLAY", None)  # force headless; no X attach
        return env

    # ---------- 1) subprocess with strict timeout + process-group kill ----------
    def _run(self, cmd: list[str], env: dict, cwd: str):
        try:
            return run_libreoffice_subprocess(
                cmd, env, cwd, self.cfg.timeout_s, self.cfg.kill_grace_s
            )
        except subprocess.TimeoutExpired as e:
            raise ConversionTimeout(
                f"LibreOffice exceeded {self.cfg.timeout_s}s"
            ) from e

    # ---------- 2) post-flight ----------
    def _postflight(self, produced: Path, returncode: int, stderr: bytes):
        err = (stderr or b"").decode("utf-8", "replace").strip()
        # exit 0 but no file is LibreOffice's most common silent failure
        if not produced.exists():
            raise ConversionError(
                f"No output produced (exit={returncode}). stderr: {err[:2000]}"
            )
        size = produced.stat().st_size
        if size == 0:
            raise ConversionError(
                f"Output PDF is empty (exit={returncode}). stderr: {err[:2000]}"
            )
        if not self._is_valid_pdf(produced):
            raise ConversionError(
                f"Output is not a valid PDF (exit={returncode}). stderr: {err[:2000]}"
            )
        if returncode not in (0, None):
            logger.warning(
                "Non-zero exit %s but valid PDF produced; stderr: %s",
                returncode,
                err[:500],
            )

    @staticmethod
    def _is_valid_pdf(path: Path) -> bool:
        return is_valid_pdf_structure(path)

    # ---------- 5) cleanup helpers ----------
    @staticmethod
    def _reap(proc: subprocess.Popen | None):
        reap_process(proc)

    @staticmethod
    def _purge(tmpdir: str):
        purge_dir(tmpdir)
