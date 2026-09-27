import gc
import json
import logging
import os
import uuid
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import fitz

from backend import config
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf

logger = logging.getLogger("pdf_ops")


def _hex_to_rgb(hex_str: str) -> tuple[float, float, float]:
    """Convert hex color (#RRGGBB or #RGB) to normalized float tuple (r, g, b) between 0.0 and 1.0."""
    hex_str = hex_str.lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join(c * 2 for c in hex_str)
    if len(hex_str) != 6:
        return (0.8, 0.1, 0.1)  # Default subtle red
    try:
        r = int(hex_str[0:2], 16) / 255.0
        g = int(hex_str[2:4], 16) / 255.0
        b = int(hex_str[4:6], 16) / 255.0
        return (r, g, b)
    except Exception:
        return (0.8, 0.1, 0.1)


def merge_pdfs(
    file_paths: List[str], output_filename: Optional[str] = None
) -> ConversionResult:
    """
    Merge multiple PDF files sequentially into a single optimized document using PyMuPDF.
    """
    if not file_paths:
        return ConversionResult(
            success=False, error_message="No input files provided for merge."
        )

    out_doc = fitz.open()
    job_uuid = uuid.uuid4().hex[:8]

    try:
        for p in file_paths:
            path_obj = Path(p)
            if not path_obj.exists():
                return ConversionResult(
                    success=False, error_message=f"File not found: {path_obj.name}"
                )
            val_err = validate_pdf(str(path_obj))
            if val_err:
                return ConversionResult(
                    success=False,
                    error_message=f"Cannot merge {path_obj.name}: {val_err}",
                )

            with fitz.open(str(path_obj)) as sub_doc:
                out_doc.insert_pdf(sub_doc)

        if len(out_doc) == 0:
            return ConversionResult(
                success=False,
                error_message="The merged document contains 0 pages.",
            )

        name = output_filename or f"merged_{job_uuid}.pdf"
        if not name.lower().endswith(".pdf"):
            name += ".pdf"

        output_path = config.OUTPUT_DIR / name
        out_doc.save(str(output_path), garbage=3, deflate=True)
        file_size = output_path.stat().st_size

        return ConversionResult(
            success=True, output_path=str(output_path), file_size_bytes=file_size
        )
    except Exception as e:
        logger.exception("merge_pdfs failed")
        return ConversionResult(
            success=False, error_message=f"PDF merge failed: {e!s}"
        )
    finally:
        out_doc.close()


def rotate_pdf(
    input_path: str, angle: int = 90, pages: Optional[List[int]] = None
) -> ConversionResult:
    """
    Rotate all pages or specific pages in a PDF document by angle (clockwise 90, 180, 270).
    """
    val_err = validate_pdf(input_path)
    if val_err:
        return ConversionResult(success=False, error_message=val_err)

    input_file = Path(input_path)
    job_uuid = uuid.uuid4().hex[:8]
    output_path = config.OUTPUT_DIR / f"{input_file.stem}_rotated_{job_uuid}.pdf"

    doc = fitz.open(input_path)
    try:
        total = len(doc)
        target_pages = set(pages) if pages else set(range(1, total + 1))

        for i, page in enumerate(doc):
            page_num = i + 1
            if page_num in target_pages:
                current_rot = page.rotation
                page.set_rotation((current_rot + angle) % 360)

        doc.save(str(output_path), deflate=True)
        return ConversionResult(
            success=True,
            output_path=str(output_path),
            file_size_bytes=output_path.stat().st_size,
        )
    except Exception as e:
        logger.exception("rotate_pdf failed")
        return ConversionResult(
            success=False, error_message=f"PDF rotation failed: {e!s}"
        )
    finally:
        doc.close()


def crop_pdf(
    input_path: str,
    crop_boxes: Optional[Dict[str, Any]] = None,
    margin_top: float = 0,
    margin_bottom: float = 0,
    margin_left: float = 0,
    margin_right: float = 0,
) -> ConversionResult:
    """
    Crop PDF pages by applying specific coordinate bounding boxes or uniform margins.
    """
    val_err = validate_pdf(input_path)
    if val_err:
        return ConversionResult(success=False, error_message=val_err)

    input_file = Path(input_path)
    job_uuid = uuid.uuid4().hex[:8]
    output_path = config.OUTPUT_DIR / f"{input_file.stem}_cropped_{job_uuid}.pdf"

    doc = fitz.open(input_path)
    try:
        for i, page in enumerate(doc):
            page_key = str(i + 1)
            r = page.rect

            if crop_boxes and page_key in crop_boxes:
                box = crop_boxes[page_key]
                # box expected as {x0, y0, x1, y1}
                crop_rect = fitz.Rect(
                    float(box.get("x0", r.x0)),
                    float(box.get("y0", r.y0)),
                    float(box.get("x1", r.x1)),
                    float(box.get("y1", r.y1)),
                )
                page.set_cropbox(crop_rect)
            elif any([margin_top, margin_bottom, margin_left, margin_right]):
                new_rect = fitz.Rect(
                    r.x0 + margin_left,
                    r.y0 + margin_top,
                    r.x1 - margin_right,
                    r.y1 - margin_bottom,
                )
                if new_rect.width > 20 and new_rect.height > 20:
                    page.set_cropbox(new_rect)

        doc.save(str(output_path), deflate=True)
        return ConversionResult(
            success=True,
            output_path=str(output_path),
            file_size_bytes=output_path.stat().st_size,
        )
    except Exception as e:
        logger.exception("crop_pdf failed")
        return ConversionResult(
            success=False, error_message=f"PDF crop failed: {e!s}"
        )
    finally:
        doc.close()


def add_watermark(
    input_path: str,
    watermark_type: str = "text",
    text: str = "CONFIDENTIAL",
    color: str = "#FF0000",
    opacity: float = 0.25,
    font_size: float = 36.0,
    rotation: float = 45.0,
    image_path: Optional[str] = None,
) -> ConversionResult:
    """
    Add a text or image watermark overlay to every page of a PDF document.
    """
    val_err = validate_pdf(input_path)
    if val_err:
        return ConversionResult(success=False, error_message=val_err)

    input_file = Path(input_path)
    job_uuid = uuid.uuid4().hex[:8]
    output_path = config.OUTPUT_DIR / f"{input_file.stem}_watermarked_{job_uuid}.pdf"

    doc = fitz.open(input_path)
    try:
        rgb_color = _hex_to_rgb(color)
        opacity_clamped = max(0.05, min(1.0, float(opacity)))

        for page in doc:
            r = page.rect
            cx = r.width / 2.0
            cy = r.height / 2.0

            if watermark_type == "text" and text:
                text_len = fitz.get_text_length(text, fontsize=float(font_size))
                pt = fitz.Point(cx - text_len / 2.0, cy)
                center_pt = fitz.Point(cx, cy)
                morph = (center_pt, fitz.Matrix(float(rotation)))
                page.insert_text(
                    pt,
                    text,
                    fontsize=float(font_size),
                    color=rgb_color,
                    morph=morph,
                    fill_opacity=opacity_clamped,
                )
            elif watermark_type == "image" and image_path and Path(image_path).exists():
                img_rect = fitz.Rect(
                    cx - (r.width * 0.25),
                    cy - (r.height * 0.25),
                    cx + (r.width * 0.25),
                    cy + (r.height * 0.25),
                )
                page.insert_image(
                    img_rect,
                    filename=image_path,
                    overlay=True,
                    keep_proportion=True,
                )

        doc.save(str(output_path), deflate=True)
        return ConversionResult(
            success=True,
            output_path=str(output_path),
            file_size_bytes=output_path.stat().st_size,
        )
    except Exception as e:
        logger.exception("add_watermark failed")
        return ConversionResult(
            success=False, error_message=f"Watermark generation failed: {e!s}"
        )
    finally:
        doc.close()


def add_page_numbers(
    input_path: str,
    format_str: str = "Page {page} of {total}",
    position: str = "bottom-center",
    font_size: float = 10.0,
    start_page: int = 1,
    margin: float = 36.0,
    color: str = "#4A5568",
) -> ConversionResult:
    """
    Stamp dynamic page numbers across all pages of a PDF document with customizable formatting and coordinates.
    """
    val_err = validate_pdf(input_path)
    if val_err:
        return ConversionResult(success=False, error_message=val_err)

    input_file = Path(input_path)
    job_uuid = uuid.uuid4().hex[:8]
    output_path = config.OUTPUT_DIR / f"{input_file.stem}_numbered_{job_uuid}.pdf"

    doc = fitz.open(input_path)
    try:
        total_pages = len(doc)
        rgb_color = _hex_to_rgb(color)

        for i, page in enumerate(doc):
            curr_num = i + start_page
            total_num = total_pages + start_page - 1

            label = (
                format_str.replace("{page}", str(curr_num))
                .replace("{total}", str(total_num))
                .replace("{n}", str(curr_num))
                .replace("{p}", str(curr_num))
            )

            r = page.rect
            m = float(margin)
            fs = float(font_size)

            text_len = fitz.get_text_length(label, fontsize=fs)
            if "center" in position:
                x = (r.width - text_len) / 2.0
            elif "right" in position:
                x = r.width - m - text_len
            else:
                x = m

            if "top" in position:
                y = m + fs
            else:
                y = r.height - m

            page.insert_text(
                fitz.Point(x, y),
                label,
                fontsize=fs,
                color=rgb_color,
            )

        doc.save(str(output_path), deflate=True)
        return ConversionResult(
            success=True,
            output_path=str(output_path),
            file_size_bytes=output_path.stat().st_size,
        )
    except Exception as e:
        logger.exception("add_page_numbers failed")
        return ConversionResult(
            success=False, error_message=f"Page numbering failed: {e!s}"
        )
    finally:
        doc.close()


def pdf_to_images(
    input_path: str,
    dpi: int = 150,
    image_format: str = "png",
    pages: Optional[List[int]] = None,
) -> ConversionResult:
    """
    Render PDF pages to ultra-high-resolution images server-side.
    Single-page output yields direct image; multi-page output bundles into an optimized ZIP stream.
    Eliminates the 2.2 GB client-side browser RAM crash by destroying pixmaps after each page.
    """
    val_err = validate_pdf(input_path)
    if val_err:
        return ConversionResult(success=False, error_message=val_err)

    input_file = Path(input_path)
    job_uuid = uuid.uuid4().hex[:8]
    fmt = image_format.lower().replace("jpeg", "jpg")
    if fmt not in ("png", "jpg", "webp"):
        fmt = "png"

    doc = fitz.open(input_path)
    try:
        total = len(doc)
        target_pages = [p for p in pages if 1 <= p <= total] if pages else list(range(1, total + 1))

        if not target_pages:
            return ConversionResult(
                success=False, error_message="No valid pages to convert to images."
            )

        # Single page -> output directly as image
        if len(target_pages) == 1:
            page_idx = target_pages[0] - 1
            page = doc[page_idx]
            pix = page.get_pixmap(dpi=int(dpi))
            output_path = config.OUTPUT_DIR / f"{input_file.stem}_page_{target_pages[0]}_{job_uuid}.{fmt}"
            pix.save(str(output_path))
            pix = None
            gc.collect()

            return ConversionResult(
                success=True,
                output_path=str(output_path),
                file_size_bytes=output_path.stat().st_size,
            )

        # Multi-page -> stream directly into ZIP file
        zip_path = config.OUTPUT_DIR / f"{input_file.stem}_images_{job_uuid}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for p_num in target_pages:
                page = doc[p_num - 1]
                pix = page.get_pixmap(dpi=int(dpi))
                img_bytes = pix.tobytes(fmt)
                pix = None  # Free memory immediately!

                zf.writestr(f"page_{p_num:04d}.{fmt}", img_bytes)
                gc.collect()

        return ConversionResult(
            success=True,
            output_path=str(zip_path),
            file_size_bytes=zip_path.stat().st_size,
        )
    except Exception as e:
        logger.exception("pdf_to_images failed")
        return ConversionResult(
            success=False, error_message=f"PDF to Image rendering failed: {e!s}"
        )
    finally:
        doc.close()


def extract_pages(
    input_path: str, page_numbers: List[int]
) -> ConversionResult:
    """
    Extract specific pages from a PDF into a new clean document.
    """
    val_err = validate_pdf(input_path)
    if val_err:
        return ConversionResult(success=False, error_message=val_err)

    input_file = Path(input_path)
    job_uuid = uuid.uuid4().hex[:8]
    output_path = config.OUTPUT_DIR / f"{input_file.stem}_extracted_{job_uuid}.pdf"

    doc = fitz.open(input_path)
    out_doc = fitz.open()
    try:
        total = len(doc)
        valid_pages = [p for p in page_numbers if 1 <= p <= total]
        if not valid_pages:
            return ConversionResult(
                success=False, error_message="No valid pages specified for extraction."
            )

        for p in valid_pages:
            out_doc.insert_pdf(doc, from_page=p - 1, to_page=p - 1)

        out_doc.save(str(output_path), deflate=True)
        return ConversionResult(
            success=True,
            output_path=str(output_path),
            file_size_bytes=output_path.stat().st_size,
        )
    except Exception as e:
        logger.exception("extract_pages failed")
        return ConversionResult(
            success=False, error_message=f"Page extraction failed: {e!s}"
        )
    finally:
        out_doc.close()
        doc.close()


def remove_pages(
    input_path: str, page_numbers: List[int]
) -> ConversionResult:
    """
    Remove specific pages from a PDF document and export the remaining pages.
    """
    val_err = validate_pdf(input_path)
    if val_err:
        return ConversionResult(success=False, error_message=val_err)

    input_file = Path(input_path)
    job_uuid = uuid.uuid4().hex[:8]
    output_path = config.OUTPUT_DIR / f"{input_file.stem}_cleaned_{job_uuid}.pdf"

    doc = fitz.open(input_path)
    try:
        total = len(doc)
        to_delete = sorted([p - 1 for p in page_numbers if 1 <= p <= total], reverse=True)

        if len(to_delete) >= total:
            return ConversionResult(
                success=False,
                error_message="Cannot remove all pages from a document. At least one page must remain.",
            )

        for p in to_delete:
            doc.delete_page(p)

        doc.save(str(output_path), deflate=True)
        return ConversionResult(
            success=True,
            output_path=str(output_path),
            file_size_bytes=output_path.stat().st_size,
        )
    except Exception as e:
        logger.exception("remove_pages failed")
        return ConversionResult(
            success=False, error_message=f"Page removal failed: {e!s}"
        )
    finally:
        doc.close()


def image_to_pdf(
    image_paths: List[str], output_filename: Optional[str] = None
) -> ConversionResult:
    """
    Convert a list of image files into a single unified multi-page PDF document.
    """
    if not image_paths:
        return ConversionResult(
            success=False, error_message="No images provided for PDF compilation."
        )

    job_uuid = uuid.uuid4().hex[:8]
    name = output_filename or f"images_combined_{job_uuid}.pdf"
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    output_path = config.OUTPUT_DIR / name

    out_doc = fitz.open()
    try:
        for img_path in image_paths:
            p = Path(img_path)
            if not p.exists():
                continue
            with fitz.open(str(p)) as img_doc:
                pdf_bytes = img_doc.convert_to_pdf()
                with fitz.open("pdf", pdf_bytes) as img_pdf:
                    out_doc.insert_pdf(img_pdf)

        if len(out_doc) == 0:
            return ConversionResult(
                success=False,
                error_message="Could not convert any of the provided images to PDF pages.",
            )

        out_doc.save(str(output_path), deflate=True)
        return ConversionResult(
            success=True,
            output_path=str(output_path),
            file_size_bytes=output_path.stat().st_size,
        )
    except Exception as e:
        logger.exception("image_to_pdf failed")
        return ConversionResult(
            success=False, error_message=f"Image to PDF conversion failed: {e!s}"
        )
    finally:
        out_doc.close()
