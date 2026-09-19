import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import fitz
from pptx import Presentation
from pptx.util import Inches

from backend import config
from backend.services.libreoffice import (
    ConversionResult,
    kill_process_tree,
    resolve_libreoffice_binary,
)
from backend.services.utils import validate_pdf

logger = logging.getLogger("pdf_to_powerpoint")


def _convert_vector_pptx(
    input_file: Path, output_file: Path, timeout_s: float = 60.0
) -> bool:
    """
    Converts a PDF to PowerPoint slides using LibreOffice Impress vector filter.
    Preserves editable text boxes, vector geometries, fonts, and hyperlinks.
    """
    tmp_dir = None
    profile_dir = None
    proc = None
    try:
        lo_bin = resolve_libreoffice_binary()
        tmp_dir = Path(tempfile.mkdtemp(prefix="pptx_vector_out_"))
        profile_dir = Path(tempfile.mkdtemp(prefix="pptx_lo_profile_"))

        cmd = [
            lo_bin,
            "--headless",
            "--invisible",
            "--nologo",
            f"-env:UserInstallation={profile_dir.as_uri()}",
            "--infilter=impress_pdf_import",
            "--convert-to",
            "pptx",
            "--outdir",
            str(tmp_dir),
            str(input_file.resolve()),
        ]

        logger.info("Executing LibreOffice Impress PDF vector import...")
        popen_kw = dict(stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if os.name == "posix":
            popen_kw["preexec_fn"] = os.setsid
        else:
            popen_kw["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP

        proc = subprocess.Popen(cmd, **popen_kw)
        stdout, stderr = proc.communicate(timeout=timeout_s)

        if proc.returncode != 0:
            logger.warning(
                "LibreOffice Impress exited with code %d: %s",
                proc.returncode,
                stderr.decode("utf-8", errors="replace"),
            )
            return False

        generated_file = tmp_dir / f"{input_file.stem}.pptx"
        if not generated_file.exists() or generated_file.stat().st_size < 100:
            logger.warning("LibreOffice Impress did not produce a valid .pptx file")
            return False

        # Validate PPTX readability
        try:
            prs = Presentation(str(generated_file))
            if len(prs.slides) == 0:
                logger.warning("Generated PPTX contains 0 slides")
                return False
        except Exception as prs_err:
            logger.warning("Generated PPTX validation error: %s", prs_err)
            return False

        # Copy to destination atomically
        output_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(generated_file), str(output_file))
        logger.info(
            "Vector PPTX compiled successfully (%d bytes, %d slides)",
            output_file.stat().st_size,
            len(prs.slides),
        )
        return True

    except Exception as exc:
        logger.warning("LibreOffice vector conversion failed: %s", exc)
        return False
    finally:
        if proc and proc.poll() is None:
            kill_process_tree(proc, grace_s=2.0)
        if tmp_dir and tmp_dir.exists():
            shutil.rmtree(tmp_dir, ignore_errors=True)
        if profile_dir and profile_dir.exists():
            shutil.rmtree(profile_dir, ignore_errors=True)


def _convert_raster_pptx(input_file: Path, output_file: Path) -> bool:
    """
    Fallback: Renders PDF pages to 200 DPI images and saves them as full-bleed slides.
    """
    doc = None
    temp_images = []
    try:
        doc = fitz.open(input_file)
        if len(doc) == 0:
            return False

        prs = Presentation()
        first_page = doc[0]
        aspect = first_page.rect.width / max(1.0, first_page.rect.height)
        if aspect >= 1.5:  # Widescreen ~16:9
            prs.slide_width = Inches(13.333)
            prs.slide_height = Inches(7.5)
        elif aspect <= 0.8:  # Portrait ~A4 / Letter
            prs.slide_width = Inches(8.5)
            prs.slide_height = Inches(11.0)
        else:  # Standard ~4:3
            prs.slide_width = Inches(10.0)
            prs.slide_height = Inches(7.5)

        blank_slide_layout = prs.slide_layouts[6]

        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=200)
            img_path = input_file.parent / f"temp_slide_{input_file.stem}_{i}.png"
            temp_images.append(img_path)
            pix.save(str(img_path))

            slide = prs.slides.add_slide(blank_slide_layout)
            slide.shapes.add_picture(
                str(img_path), 0, 0, width=prs.slide_width, height=prs.slide_height
            )
            if img_path.exists():
                img_path.unlink(missing_ok=True)

        output_file.parent.mkdir(parents=True, exist_ok=True)
        prs.save(output_file)
        return output_file.exists() and output_file.stat().st_size > 0
    finally:
        if doc:
            doc.close()
        for img_p in temp_images:
            if img_p.exists():
                img_p.unlink(missing_ok=True)


def convert_pdf_to_powerpoint(input_path: str) -> ConversionResult:
    """
    Converts a PDF to PowerPoint presentation (.pptx).
    Attempts non-destructive vector conversion with native text frames via LibreOffice Impress,
    with automatic graceful fallback to high-DPI rasterized presentation.
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

        # Ensure PDF has pages
        try:
            with fitz.open(input_file) as doc:
                if len(doc) == 0:
                    return ConversionResult(
                        success=False, error_message="PDF contains no pages"
                    )
        except Exception as check_err:
            return ConversionResult(
                success=False,
                error_message=f"Corrupt or unreadable PDF: {check_err}",
            )

        output_pptx_path = config.OUTPUT_DIR / f"{input_file.stem}.pptx"

        # 1. Try vector conversion first
        success = _convert_vector_pptx(input_file, output_pptx_path)

        # 2. Fall back to rasterized presentation if vector conversion fails
        if not success:
            logger.warning(
                "Vector PPTX conversion not available or failed; using raster fallback"
            )
            success = _convert_raster_pptx(input_file, output_pptx_path)

        if not success or not output_pptx_path.exists():
            return ConversionResult(
                success=False,
                error_message="Compilation completed but pptx slide deck was not found",
            )

        return ConversionResult(
            success=True,
            output_path=str(output_pptx_path),
            file_size_bytes=output_pptx_path.stat().st_size,
        )

    except Exception as e:
        logger.exception("Failed to convert PDF to PowerPoint: %s", e)
        return ConversionResult(success=False, error_message=str(e))

