from pathlib import Path
import logging
import fitz
import pikepdf

from backend import config
from backend.services.libreoffice import ConversionResult

logger = logging.getLogger("repair_pdf")


def repair_pdf(input_path: str, mode: str = "standard", strip_corrupt_metadata: bool = True) -> ConversionResult:
    """
    Repairs corrupted, damaged, or unreadable PDF files using a multi-stage recovery architecture:
      Stage 1: pikepdf (QPDF C++ core) cross-reference recovery & object stream re-indexing.
      Stage 2: PyMuPDF (fitz) deep structure salvage with maximum garbage collection & stream cleaning.
      Stage 3: Page-by-page resilient extraction for partially corrupted page trees.
      Stage 4: Visual page rasterization fallback for fatally broken vector content streams.

    Args:
        input_path: Path to the damaged input PDF file.
        mode: Repair mode ('standard' or 'deep').
        strip_corrupt_metadata: Whether to scrub broken XMP/metadata packets.

    Returns:
        ConversionResult: Object with success, output_path, file_size_bytes, and error_message.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")

        if input_file.stat().st_size == 0:
            return ConversionResult(success=False, error_message="Uploaded file is empty (0 bytes)")

        output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}_repaired.pdf"

        # Check for password protection without crashing
        try:
            test_doc = fitz.open(input_file)
            if test_doc.is_encrypted:
                test_doc.close()
                return ConversionResult(
                    success=False,
                    error_message="The PDF is password protected. Please unlock it before repairing."
                )
            test_doc.close()
        except Exception:
            # If fitz cannot even check encryption, proceed to recovery attempts
            pass

        recovered = False
        strategy_used = ""

        # =========================================================================
        # Stage 1: pikepdf / QPDF Engine (Standard & Deep)
        # =========================================================================
        try:
            # QPDF scans the entire file for objects, recovering damaged xrefs
            with pikepdf.open(
                input_file,
                suppress_warnings=True,
                attempt_recovery=True
            ) as pdf:
                if strip_corrupt_metadata:
                    try:
                        with pdf.open_metadata() as meta:
                            meta.clear()
                    except Exception:
                        pass

                pdf.save(
                    str(output_pdf_path),
                    linearize=True,
                    object_stream_mode=pikepdf.ObjectStreamMode.generate
                )
                recovered = True
                strategy_used = "pikepdf QPDF XREF Reconstruction"
                logger.info(f"PDF successfully repaired via Stage 1: {input_path}")
        except Exception as e_pike:
            logger.warning(f"Stage 1 (pikepdf) failed, attempting Stage 2: {e_pike}")

        # =========================================================================
        # Stage 2: PyMuPDF Deep Salvage & Garbage Cleaning
        # =========================================================================
        if not recovered:
            try:
                doc = fitz.open(input_file)
                if len(doc) > 0:
                    if strip_corrupt_metadata:
                        try:
                            doc.set_metadata({})
                        except Exception:
                            pass

                    # garbage=4: remove unused objects, deduplicate streams, reconstruct xref
                    doc.save(
                        str(output_pdf_path),
                        garbage=4,
                        clean=True,
                        deflate=True
                    )
                    doc.close()
                    recovered = True
                    strategy_used = "PyMuPDF Deep Stream Clean"
                    logger.info(f"PDF successfully repaired via Stage 2: {input_path}")
                else:
                    doc.close()
            except Exception as e_fitz:
                logger.warning(f"Stage 2 (PyMuPDF Clean) failed, attempting Stage 3: {e_fitz}")

        # =========================================================================
        # Stage 3: Page-by-Page Selective Extraction
        # =========================================================================
        if not recovered:
            try:
                doc = fitz.open(input_file)
                new_doc = fitz.open()
                salvaged_pages = 0

                for p_idx in range(len(doc)):
                    try:
                        new_doc.insert_pdf(doc, from_page=p_idx, to_page=p_idx)
                        salvaged_pages += 1
                    except Exception as p_err:
                        logger.warning(f"Page {p_idx + 1} insert failed: {p_err}. Trying raster fallback...")
                        # Stage 4 Sub-fallback: Render page as pixmap image
                        try:
                            page = doc[p_idx]
                            pix = page.get_pixmap(dpi=150)
                            img_page = new_doc.new_page(width=page.rect.width, height=page.rect.height)
                            img_page.insert_image(page.rect, pixmap=pix)
                            salvaged_pages += 1
                        except Exception:
                            logger.error(f"Page {p_idx + 1} completely unrecoverable.")

                doc.close()

                if salvaged_pages > 0:
                    new_doc.save(str(output_pdf_path), garbage=4, clean=True, deflate=True)
                    new_doc.close()
                    recovered = True
                    strategy_used = f"Page-by-Page Selective Salvage ({salvaged_pages} pages)"
                    logger.info(f"PDF successfully repaired via Stage 3: {input_path}")
                else:
                    new_doc.close()
            except Exception as e_page:
                logger.warning(f"Stage 3 (Page Extraction) failed: {e_page}")

        if recovered and output_pdf_path.exists() and output_pdf_path.stat().st_size > 0:
            return ConversionResult(
                success=True,
                output_path=str(output_pdf_path),
                file_size_bytes=output_pdf_path.stat().st_size
            )

        return ConversionResult(
            success=False,
            error_message="The PDF file is severely damaged or empty and cannot be reconstructed."
        )
    except Exception as e:
        logger.exception(f"Unexpected error repairing PDF {input_path}: {e}")
        return ConversionResult(
            success=False,
            error_message=f"PDF repair failed: {e!s}"
        )
