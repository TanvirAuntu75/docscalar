import logging
import os
import tempfile
import threading
from pathlib import Path

import fitz  # PyMuPDF

from backend import config
from backend.services.libreoffice import ConversionResult
from backend.services.ocr_engine import RobustOCREngine
from backend.services.utils import validate_pdf

logger = logging.getLogger(__name__)

# Global module-level synchronization lock for OCR inference engines
engine_lock = threading.Lock()
_ocr_engine_instance = None


def get_ocr_engine() -> RobustOCREngine:
    global _ocr_engine_instance
    if _ocr_engine_instance is None:
        with engine_lock:
            if _ocr_engine_instance is None:
                _ocr_engine_instance = RobustOCREngine()
    return _ocr_engine_instance


def teardown_ocr_engine():
    """
    Auto-force stops and tears down the OCR engine singleton and all associated
    PaddleOCR neural readers, releasing memory immediately back to the OS.
    """
    global _ocr_engine_instance
    with engine_lock:
        if _ocr_engine_instance is not None:
            try:
                del _ocr_engine_instance
            except Exception:
                pass
            _ocr_engine_instance = None

        try:
            from backend.services.ocr_engine import clear_paddleocr_readers
            clear_paddleocr_readers()
        except Exception as e:
            logger.warning("Error calling clear_paddleocr_readers: %s", e)

        import gc
        gc.collect()
        logger.info("OCR Engine and all background readers successfully torn down.")


def run_ocr_on_pdf(input_path: str, language: str = "eng") -> ConversionResult:
    """
    Applies non-destructive page-by-page OCR to a PDF document using RobustOCREngine (PaddleOCR/Tesseract).
    Injects invisible searchable text layers (render_mode=3) directly into the original PDF pages,
    preserving 100% of original vector graphics, embedded TrueType fonts, form fields, and hyperlinks.
    """
    temp_img_paths = []
    doc = None

    try:
        from backend.jobs.queue import update_job_progress

        update_job_progress(5, "Initializing neural OCR engine...")

        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(
                success=False, error_message="Input file does not exist"
            )

        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)

        # Ensure output directory exists
        config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}_ocr.pdf"

        # Load PDF to check page count
        doc = fitz.open(str(input_file))
        total_pages = len(doc)

        if total_pages == 0:
            return ConversionResult(
                success=False, error_message="PDF contains no pages"
            )

        # Map language code
        lang = "en"
        if language:
            lang_clean = language.lower().strip()
            if lang_clean in ("all", "auto", "multilingual"):
                lang = "all"
            elif lang_clean in ("rus", "ru", "russian"):
                lang = "ru"
            elif lang_clean in ("ara", "ar", "arabic"):
                lang = "ar"
            elif lang_clean in ("kor", "ko", "korean"):
                lang = "korean"
            elif lang_clean in ("hin", "hi", "hindi"):
                lang = "hi"
            elif lang_clean in ("jpn", "ja", "japan"):
                lang = "japan"
            elif lang_clean in ("chi_sim", "ch", "zh", "chinese"):
                lang = "ch"
            elif lang_clean in ("eng", "en", "english"):
                lang = "en"
            else:
                lang = lang_clean[:2]

        # Use thread-safe singleton RobustOCREngine with shared engine_lock
        engine = get_ocr_engine()

        # Process page by page in parallel using a ThreadPoolExecutor
        from concurrent.futures import ThreadPoolExecutor, as_completed

        page_results = [None] * total_pages
        completed_count = 0

        update_job_progress(8, f"Starting OCR scanning on {total_pages} page(s)...")

        def process_page_task(page_idx):
            # Open separate document instance for thread safety during extraction
            t_doc = None
            try:
                t_doc = fitz.open(str(input_file))
                page = t_doc.load_page(page_idx)
                p_w = page.rect.width
                p_h = page.rect.height

                # Extract existing digital word bounding boxes to prevent duplicate text injection
                existing_words = page.get_text("words")
                digital_rects = [
                    (w[0], w[1], w[2], w[3]) for w in existing_words
                ]

                # Render page at 200 DPI — sufficient for PaddleOCR handwriting detection
                pix = page.get_pixmap(dpi=200)

                with tempfile.NamedTemporaryFile(
                    suffix=".png", delete=False
                ) as tmp_img:
                    temp_img_path = tmp_img.name
                pix.save(temp_img_path)

                # Perform OCR on page image with lock for thread-safe inference
                ocr_res = None
                with engine_lock:
                    try:
                        ocr_res = engine.process(
                            temp_img_path, engine_name="paddleocr", lang=lang
                        )
                    except Exception as e:
                        logger.warning(
                            "PaddleOCR failed on page %d: %s. Retrying with Tesseract...",
                            page_idx,
                            e,
                        )

                    words = []
                    if ocr_res and ocr_res.get("words"):
                        words = ocr_res["words"]
                    else:
                        logger.warning(
                            "PaddleOCR returned 0 words on page %d. Attempting emergency Tesseract fallback...",
                            page_idx,
                        )
                        try:
                            tess_res = engine.process(
                                temp_img_path, engine_name="tesseract", lang=lang
                            )
                            if tess_res and tess_res.get("words"):
                                words = tess_res["words"]
                        except Exception as e:
                            logger.error(
                                "Tesseract also failed on page %d: %s", page_idx, e
                            )

                return page_idx, temp_img_path, words, pix.width, pix.height, digital_rects
            finally:
                if t_doc:
                    t_doc.close()

        # OCR inference is serialized by engine_lock — extra threads only pre-render pages.
        # 2 threads = 1 doing OCR + 1 pre-rendering next page. More threads waste memory.
        max_workers = min(2, os.cpu_count() or 1)
        logger.info("OCR: Spawning %d parallel backend OCR threads...", max_workers)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [
                executor.submit(process_page_task, idx) for idx in range(total_pages)
            ]
            for future in as_completed(futures):
                try:
                    idx, img_path, words, pix_w, pix_h, dig_rects = future.result()
                    page_results[idx] = (img_path, words, pix_w, pix_h, dig_rects)
                    temp_img_paths.append(img_path)
                    completed_count += 1
                    pct = 10 + int((completed_count / total_pages) * 78)
                    update_job_progress(
                        pct, f"OCR scanning page {completed_count}/{total_pages}..."
                    )
                except Exception as ex:
                    logger.exception("Failed processing page in OCR thread pool")
                    raise ex

        # Close read-only doc before reopening for writing/text injection
        if doc:
            try:
                doc.close()
                doc = None
            except Exception:
                pass

        # Non-destructive vector sandwich OCR:
        # Inject invisible text layers (render_mode=3) directly into the original PDF
        update_job_progress(90, "Injecting searchable text layer into original vector PDF...")
        logger.info("OCR: Injecting non-destructive text layers into %d pages...", total_pages)

        import re

        out_doc = fitz.open(str(input_file))
        for page_idx in range(total_pages):
            res_entry = page_results[page_idx]
            if not res_entry:
                continue
            _, words, pix_w, pix_h, dig_rects = res_entry
            if not words:
                continue

            page = out_doc.load_page(page_idx)
            p_w = page.rect.width
            p_h = page.rect.height

            scale_x = p_w / float(pix_w) if pix_w > 0 else 1.0
            scale_y = p_h / float(pix_h) if pix_h > 0 else 1.0

            # Check if this page is a scanned image or has an invisible OCR layer (3 Tr)
            has_scan_image = len(page.get_images()) > 0
            page_contents = ""
            try:
                page_contents = page.read_contents().decode("latin1", errors="ignore")
            except Exception:
                pass
            has_invisible_layer = "3 Tr" in page_contents

            # Convert digital rects to fitz.Rect objects for spatial overlap checks
            fitz_dig_rects = [fitz.Rect(*dr) for dr in dig_rects]

            # If page is a scanned document or has a stale invisible layer,
            # purge the old text stream cleanly while preserving 100% of images and drawings.
            if has_invisible_layer or has_scan_image:
                page.add_redact_annot(page.rect)
                page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
                fitz_dig_rects = []

            tw = fitz.TextWriter(page.rect)
            font = fitz.Font("helv")

            # Sort words in natural reading order (top-to-bottom, left-to-right) by y0 then x0
            words.sort(key=lambda w: (w.get("rect", [0, 0, 0, 0])[1] // 10, w.get("rect", [0, 0, 0, 0])[0]))

            for word in words:
                text_val = word.get("text", "").strip()
                if not text_val:
                    continue

                # Filter out low-confidence OCR noise
                conf = word.get("conf", 100.0)
                if conf is not None and conf < 5.0:
                    continue

                # Filter out pure punctuation/symbol noise
                if len(text_val) > 1 and re.fullmatch(r"[\W_]+", text_val) and text_val not in ("...", "—", "–", "©", "®"):
                    continue

                rect = word.get("rect")
                if not rect or len(rect) < 4:
                    continue

                x0, y0, x1, y1 = rect
                px0 = x0 * scale_x
                py0 = y0 * scale_y
                px1 = x1 * scale_x
                py1 = y1 * scale_y

                word_rect = fitz.Rect(px0, py0, px1, py1)
                word_area = word_rect.get_area()

                # Digital exclusion: skip if this coordinate box already has digital vector text
                if fitz_dig_rects and word_area > 0 and any(
                    (not (word_rect & dr).is_empty) and (
                        (word_rect & dr).get_area() > 0.35 * dr.get_area() or
                        (word_rect & dr).get_area() > 0.35 * word_area
                    )
                    for dr in fitz_dig_rects
                    if dr.get_area() > 0
                ):
                    continue

                ph = max(1.0, py1 - py0)
                font_size = min(24.0, max(5.0, ph * 0.75))
                baseline_y = py1 - (font_size * 0.25)
                box_w = max(1.0, px1 - px0)

                t_len = font.text_length(text_val, fontsize=font_size)
                actual_fs = font_size
                if t_len > box_w and t_len > 0:
                    actual_fs = max(1.0, font_size * (box_w / t_len))

                try:
                    tw.append(
                        fitz.Point(px0, baseline_y),
                        text_val,
                        font=font,
                        fontsize=actual_fs,
                    )
                except Exception as insert_err:
                    logger.debug("Text insertion error on '%s': %s", text_val, insert_err)

            tw.write_text(page, render_mode=3)

        out_doc.save(str(output_pdf_path), garbage=3, deflate=True)
        out_doc.close()

        update_job_progress(100, "Searchable PDF compiled successfully.")
        logger.info("OCR: PDF successfully compiled to %s (non-destructive vector)", output_pdf_path)

        return ConversionResult(
            success=True,
            output_path=str(output_pdf_path),
            file_size_bytes=output_pdf_path.stat().st_size,
        )

    except Exception as e:
        logger.exception("OCR page-by-page pipeline failed")
        return ConversionResult(
            success=False, error_message=f"OCR service error: {e!s}"
        )

    finally:
        # Close input document if still open
        if doc:
            try:
                doc.close()
            except Exception:
                pass

        # Clean up temporary images
        for p in temp_img_paths:
            try:
                if os.path.exists(p):
                    os.unlink(p)
            except Exception as e:
                logger.warning("Failed to clean up temporary image %s: %s", p, e)

        # Auto-force stop: immediately clear readers, tear down OCR engine, and release RAM
        teardown_ocr_engine()
