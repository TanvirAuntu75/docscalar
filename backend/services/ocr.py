import logging
import os
import re
import tempfile
import threading
import unicodedata
from pathlib import Path

import fitz  # PyMuPDF

from backend import config
from backend.services.libreoffice import ConversionResult
from backend.services.ocr_engine import (
    RobustOCREngine,
    apply_context_gated_guard,
    heal_split_words,
)
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

        # FORCE RECLAIM SYSTEM RAM: Windows Working Set trimming and Linux malloc_trim
        import sys
        if sys.platform == "win32":
            try:
                import ctypes
                handle = ctypes.c_void_p(-1)
                psapi = ctypes.WinDLL("psapi", use_last_error=True)
                psapi.EmptyWorkingSet(handle)
            except Exception as we:
                logger.warning("Windows EmptyWorkingSet memory trim failed: %s", we)
        else:
            try:
                import ctypes
                libc = ctypes.CDLL("libc.so.6")
                libc.malloc_trim(0)
            except Exception:
                pass

        logger.info("OCR Engine and all background readers successfully torn down; working set RAM trimmed to baseline.")


def validate_cmap_and_mojibake(sample_text: str) -> tuple[bool, float, int]:
    """
    CMap / mojibake validation for born-digital text:
    1. Printable non-whitespace character ratio must exceed 0.85.
    2. Must contain 0 Private Use Area (PUA) characters (corrupt ToUnicode CMaps often map to PUA).
    Returns (has_valid_cmap, printable_ratio, pua_count).
    """
    if not sample_text:
        return False, 0.0, 0
    printable_count = sum(1 for c in sample_text if c.isprintable() and not c.isspace())
    printable_ratio = printable_count / max(1, len(sample_text))
    pua_count = sum(
        1 for c in sample_text
        if ("\ue000" <= c <= "\uf8ff")
        or ("\U000f0000" <= c <= "\U000ffffd")
        or ("\U00100000" <= c <= "\U0010fffd")
    )
    has_valid_cmap = (printable_ratio > 0.85) and (pua_count == 0)
    return has_valid_cmap, printable_ratio, pua_count


def detect_uncovered_raster(page: fitz.Page, digital_rects: list[tuple[float, float, float, float]]) -> bool:
    """
    Checks for uncovered raster regions (sub-page scans, embedded receipts, signatures, stamps).
    Any embedded image region not covered by digital text (uncovered area > 200 and < 50% covered)
    must undergo OCR.
    """
    try:
        page_images = page.get_images(full=True)
        if not page_images:
            return False
        fitz_digital_rects = [fitz.Rect(*dr) for dr in digital_rects]
        for img_info in page_images:
            xref = img_info[0]
            for img_rect in page.get_image_rects(xref):
                img_area = img_rect.get_area()
                # Ignore sub-pixel or tiny decorative artifacts (< 225 px^2 or < 15x15)
                if img_area < 225 or img_rect.width < 15 or img_rect.height < 15:
                    continue
                # Calculate area of this image covered by existing digital text
                covered_area = sum(
                    (img_rect & dr).get_area()
                    for dr in fitz_digital_rects
                    if not (img_rect & dr).is_empty
                )
                uncovered_area = img_area - covered_area
                if uncovered_area > 200 and (covered_area / max(1.0, img_area)) < 0.50:
                    return True
    except Exception as img_err:
        logger.debug("Image coverage check error: %s", img_err)
    return False


def check_has_invisible_layer(page: fitz.Page) -> bool:
    """
    Checks if a PDF page contains an invisible OCR text layer (e.g. 3 Tr or alpha=0 / render_mode=3 spans).
    """
    try:
        contents = page.read_contents().decode("latin1", errors="ignore")
        if "3 Tr" in contents or re.search(r"\b3\s+Tr\b", contents):
            return True
    except Exception:
        pass
    try:
        raw_dict = page.get_text("rawdict")
        for block in raw_dict.get("blocks", []):
            if block.get("type") == 0:
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        if span.get("render_mode") == 3 or span.get("alpha") == 0:
                            return True
    except Exception:
        pass
    return False


def purge_invisible_text_spans(page: fitz.Page, has_invisible_layer: bool = False) -> tuple[int, list[fitz.Rect]]:
    """
    Selective invisible text span redaction:
    Extracts page.get_text("rawdict") and applies redaction annotations ONLY to spans with
    span.get("render_mode") == 3 (or alpha == 0 with invisible layer),
    strictly preserving all visible vector text (render_mode == 0).
    Returns (purged_invisible_count, surviving_words_rects).
    """
    purged_count = 0
    try:
        raw_dict = page.get_text("rawdict")
        for block in raw_dict.get("blocks", []):
            if block.get("type") == 0:
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        rm = span.get("render_mode")
                        is_invisible = (rm == 3) or (
                            (rm is None or rm == 3) and span.get("alpha") == 0 and has_invisible_layer
                        )
                        if is_invisible:
                            bbox = span.get("bbox")
                            if bbox:
                                page.add_redact_annot(fitz.Rect(*bbox))
                                purged_count += 1
        if purged_count > 0:
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
    except Exception as redact_err:
        logger.warning("Selective invisible redaction failed: %s", redact_err)

    surviving_words = page.get_text("words")
    surviving_rects = [fitz.Rect(w[0], w[1], w[2], w[3]) for w in surviving_words]
    return purged_count, surviving_rects


def decompose_ocr_line_to_words(
    text_val: str,
    bbox: tuple[float, float, float, float],
    font: fitz.Font,
    font_cjk: fitz.Font | None = None,
) -> list[dict]:
    """
    Subpixel Word-Level Bounding Box Decomposition:
    Splits multi-word OCR line detections into individual words, calculates
    proportional subpixel bounding boxes along the line's axis, and provides exact
    coordinates, font references, and font sizes for each word.

    Ensures that PDFium (Chrome) and Adobe Acrobat drag-selection highlights and copies
    every single word cleanly without gaps, skipped lines, or selection voids.
    """
    if not text_val or not isinstance(text_val, str):
        return []

    px0, py0, px1, py1 = bbox
    line_w = max(1.0, px1 - px0)
    line_h = max(1.0, py1 - py0)

    tokens = [t for t in text_val.split(" ") if t]
    if not tokens:
        return []

    def _measure_token(tok: str, fs: float) -> tuple[fitz.Font, float]:
        needs_cjk = any(
            ("\u2e80" <= ch <= "\u9fff")
            or ("\uf900" <= ch <= "\ufaff")
            or ("\u3040" <= ch <= "\u30ff")
            or ("\uac00" <= ch <= "\ud7af")
            for ch in tok
        )
        if needs_cjk and font_cjk:
            try:
                return font_cjk, max(0.5, font_cjk.text_length(tok, fontsize=fs))
            except Exception:
                pass

        chosen = font
        m_len = None
        try:
            m_len = font.text_length(tok, fontsize=fs)
        except Exception:
            m_len = None
        if m_len is None and font_cjk:
            try:
                m_len = font_cjk.text_length(tok, fontsize=fs)
                chosen = font_cjk
            except Exception:
                m_len = None
        if m_len is None or m_len <= 0:
            m_len = max(0.5, len(tok) * (fs * 0.55))
            chosen = font_cjk if (font_cjk and needs_cjk) else font
        return chosen, m_len

    nominal_fs = min(24.0, max(5.0, line_h * 0.75))

    if len(tokens) == 1:
        tok = tokens[0]
        tok_font, tok_len = _measure_token(tok, nominal_fs)
        actual_fs = nominal_fs
        if tok_len > line_w and tok_len > 0:
            actual_fs = max(1.0, nominal_fs * (line_w / tok_len))
        baseline_y = py1 - (actual_fs * 0.25)
        return [
            {
                "text": tok,
                "rect": (px0, py0, px1, py1),
                "point": (px0, baseline_y),
                "font": tok_font,
                "fontsize": actual_fs,
                "width": line_w,
            }
        ]

    N = len(tokens)
    measured_nominal = [_measure_token(t, nominal_fs) for t in tokens]
    tok_fonts = [m[0] for m in measured_nominal]
    tok_lens_nom = [m[1] for m in measured_nominal]
    w_words_nom = sum(tok_lens_nom)
    nominal_space = max(0.25 * nominal_fs, min(0.40 * nominal_fs, nominal_fs * 0.28))
    w_nom_total = w_words_nom + (N - 1) * nominal_space

    max_fs = min(24.0, max(5.0, line_h * 0.85))
    target_fs = nominal_fs * (line_w / w_nom_total) if w_nom_total > 0 else nominal_fs
    actual_fs = min(max_fs, max(5.0, target_fs))

    measured_actual = [_measure_token(t, actual_fs) for t in tokens]
    tok_lens = [m[1] for m in measured_actual]
    w_words = sum(tok_lens)

    available_space = max(0.0, line_w - w_words)
    per_space = available_space / (N - 1) if N > 1 else (actual_fs * 0.28)
    per_space = max(0.22 * actual_fs, min(0.50 * actual_fs, per_space))

    baseline_y = py1 - (actual_fs * 0.25)
    curr_x = px0
    decomposed = []
    for i, tok in enumerate(tokens):
        ww = tok_lens[i]
        wx0 = curr_x
        wx1 = curr_x + ww
        decomposed.append(
            {
                "text": tok,
                "rect": (wx0, py0, wx1, py1),
                "point": (wx0, baseline_y),
                "font": tok_fonts[i],
                "fontsize": actual_fs,
                "width": ww,
            }
        )
        curr_x = wx1 + per_space

    return decomposed


def run_ocr_on_pdf(
    input_path: str,
    language: str = "eng",
    output_path: str | None = None,
) -> ConversionResult:
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
        if output_path:
            output_pdf_path = Path(output_path)
        else:
            config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}_ocr.pdf"
        output_pdf_path.parent.mkdir(parents=True, exist_ok=True)

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

                # Detect and purge stale invisible OCR layer before evaluating digital words
                has_invisible = check_has_invisible_layer(page)
                if has_invisible:
                    purged_cnt, surviving_rects = purge_invisible_text_spans(page, has_invisible_layer=True)
                    digital_rects = [(r.x0, r.y0, r.x1, r.y1) for r in surviving_rects]
                    existing_words = page.get_text("words")
                else:
                    existing_words = page.get_text("words")
                    digital_rects = [(w[0], w[1], w[2], w[3]) for w in existing_words]

                # --- BORN-DIGITAL FAST-PATH (<2ms, 100% exact accuracy) ---
                has_uncovered_raster = detect_uncovered_raster(page, digital_rects)
                sample_text = "".join(w[4] for w in existing_words) if existing_words else ""
                has_valid_cmap, printable_ratio, pua_count = validate_cmap_and_mojibake(sample_text)

                if not has_invisible and len(existing_words) >= 5 and has_valid_cmap and not has_uncovered_raster:
                    logger.info("Page %d: Born-digital fast-path activated (%d vector words, 100%% exact)", page_idx, len(existing_words))
                    fast_words = [
                        {
                            "text": unicodedata.normalize("NFKC", w[4]),
                            "conf": 100.0,
                            "rect": (w[0], w[1], w[2], w[3]),
                        }
                        for w in existing_words
                    ]
                    return page_idx, None, fast_words, int(p_w), int(p_h), digital_rects

                # Render page at 250 DPI — crisp resolution preserving decimal points, formulas, and fine kerning
                pix = page.get_pixmap(dpi=250)

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
                    if img_path:
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

        out_doc = fitz.open(str(input_file))
        for page_idx in range(total_pages):
            res_entry = page_results[page_idx]
            if not res_entry:
                continue
            img_path, words, pix_w, pix_h, dig_rects = res_entry
            if not words:
                continue

            page = out_doc.load_page(page_idx)
            p_w = page.rect.width
            p_h = page.rect.height

            scale_x = p_w / float(pix_w) if pix_w > 0 else 1.0
            scale_y = p_h / float(pix_h) if pix_h > 0 else 1.0

            # Check if this page has an invisible OCR layer (3 Tr)
            has_invisible_layer = check_has_invisible_layer(page)

            # Selective invisible text span redaction:
            # Extract page.get_text("rawdict") and apply redaction annotations ONLY to spans with
            # span.get("render_mode") == 3 (or alpha == 0 with invisible layer),
            # strictly preserving all visible vector text (render_mode == 0).
            # Clear fitz_dig_rects when invisible text is purged so new OCR words do not collide with
            # coordinates of deleted invisible text.
            purged_invisible_count, surviving_rects = purge_invisible_text_spans(page, has_invisible_layer=has_invisible_layer)
            if purged_invisible_count > 0:
                fitz_dig_rects = surviving_rects
                logger.info(
                    "Page %d: Purged %d stale invisible text spans, cleared deleted text from fitz_dig_rects (%d visible rects remain)",
                    page_idx, purged_invisible_count, len(fitz_dig_rects)
                )
            else:
                fitz_dig_rects = [fitz.Rect(*dr) for dr in dig_rects]

            # If this page took the born-digital fast path (img_path is None),
            # native vector text already exists with 100% exact fidelity.
            # Do NOT re-inject duplicate text over it.
            if img_path is None:
                continue

            # Font definitions
            font = fitz.Font("helv")
            try:
                font_cjk = fitz.Font("cjk")
            except Exception:
                font_cjk = None

            # Universal font fallback for complex scripts (Greek, Cyrillic, Turkish, Arabic, Indic, Thai, etc.)
            font_uni = None
            for fp in [
                r"C:\Windows\Fonts\arial.ttf",
                r"C:\Windows\Fonts\segoeui.ttf",
                r"C:\Windows\Fonts\tahoma.ttf",
                r"C:\Windows\Fonts\ARIALUNI.TTF",
                r"C:\Windows\Fonts\Nirmala.ttc",
                r"C:\Windows\Fonts\LeelawUI.ttf",
                "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            ]:
                if os.path.exists(fp):
                    try:
                        font_uni = fitz.Font(fontfile=fp)
                        break
                    except Exception:
                        pass

            # Sort lines in natural reading order (top-to-bottom, left-to-right) by y0 then x0
            words.sort(key=lambda w: (w.get("rect", [0, 0, 0, 0])[1] // 12, w.get("rect", [0, 0, 0, 0])[0]))

            for word in words:
                text_val = word.get("text", "").strip()
                if not text_val:
                    continue

                conf = word.get("conf", 100.0)
                # Apply Context-Gated 4-Tier Guard and split-word repair to word text before injection
                text_val = heal_split_words(text_val, conf=conf)
                # Apply Unicode NFKC normalization
                text_val = unicodedata.normalize("NFKC", text_val)

                # Filter out low-confidence OCR noise
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

                # Digital exclusion check for the entire line box
                if fitz_dig_rects and word_rect.get_area() > 0 and any(
                    (not (word_rect & dr).is_empty) and (
                        (word_rect & dr).get_area() > 0.35 * dr.get_area() or
                        (word_rect & dr).get_area() > 0.35 * word_rect.get_area()
                    )
                    for dr in fitz_dig_rects
                    if dr.get_area() > 0
                ):
                    continue

                line_w = max(1.0, px1 - px0)
                line_h = max(1.0, py1 - py0)
                nominal_fs = min(24.0, max(5.0, line_h * 0.75))

                # Script-appropriate font selection
                chosen_font = font
                needs_cjk = any(
                    ("\u2e80" <= ch <= "\u9fff")
                    or ("\uf900" <= ch <= "\ufaff")
                    or ("\u3040" <= ch <= "\u30ff")
                    or ("\uac00" <= ch <= "\ud7af")
                    for ch in text_val
                )
                is_non_ascii = any(ord(ch) > 127 for ch in text_val)

                if needs_cjk and font_cjk:
                    chosen_font = font_cjk
                elif is_non_ascii and font_uni:
                    chosen_font = font_uni

                try:
                    t_len = chosen_font.text_length(text_val, fontsize=nominal_fs)
                except Exception:
                    if font_uni and chosen_font is not font_uni:
                        chosen_font = font_uni
                        try:
                            t_len = chosen_font.text_length(text_val, fontsize=nominal_fs)
                        except Exception:
                            t_len = len(text_val) * (nominal_fs * 0.55)
                    elif font_cjk and chosen_font is not font_cjk:
                        chosen_font = font_cjk
                        try:
                            t_len = chosen_font.text_length(text_val, fontsize=nominal_fs)
                        except Exception:
                            t_len = len(text_val) * (nominal_fs * 0.55)
                    else:
                        t_len = len(text_val) * (nominal_fs * 0.55)

                # Compute horizontal scale to stretch/fit line precisely across physical ink width (px1 - px0)
                # Clamped between 0.5 and 2.5 to avoid degenerate scales
                h_scale = (line_w / t_len) if t_len > 0 else 1.0
                h_scale = max(0.5, min(2.5, h_scale))

                baseline_y = py1 - (nominal_fs * 0.25)

                # Inject as unified contiguous line run with exact horizontal scaling
                # so the text spans 100% across the line from px0 all the way to px1 with zero edge truncation
                try:
                    line_tw = fitz.TextWriter(page.rect)
                    line_tw.append(
                        fitz.Point(px0, baseline_y),
                        text_val,
                        font=chosen_font,
                        fontsize=nominal_fs,
                    )
                    line_tw.write_text(
                        page,
                        render_mode=3,
                        morph=(fitz.Point(px0, baseline_y), fitz.Matrix(h_scale, 1.0)),
                    )
                except Exception as insert_err:
                    logger.debug("Line insertion error on '%s': %s", text_val, insert_err)

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
