import json
import tempfile
import zipfile
from pathlib import Path

import fitz
from pikepdf import Pdf

from backend import config
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf


def split_pdf(
    input_path: str, mode: str = "all", range_str: str = "", extra_params: str = "{}"
) -> ConversionResult:
    """
    Advanced Split PDF service (pikepdf + fitz hybrid).
    Supports:
    1. 'all' - split every page
    2. 'equal-intervals' / 'fixed-ranges' - split by interval
    3. 'range' / 'custom-ranges' - split by range list (with merge support)
    4. 'select-pages' - extract specific pages (with merge support)
    5. 'size-limit' - split by maximum file size limit
    6. 'by-bookmarks' - split by bookmark outlines
    7. 'by-blank-page' - split at blank page delimiters
    """
    try:
        from backend.jobs.queue import update_job_progress

        update_job_progress(10)

        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(
                success=False, error_message="Input file does not exist"
            )

        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)

        # Parse params
        try:
            params = json.loads(extra_params) if extra_params else {}
        except Exception:
            params = {}

        output_zip = config.OUTPUT_DIR / f"{input_file.stem}_split.zip"

        update_job_progress(20)

        with Pdf.open(input_file) as pdf:
            total_pages = len(pdf.pages)
            if total_pages == 0:
                return ConversionResult(
                    success=False, error_message="PDF contains no pages"
                )

            indices = []  # List of page index lists: e.g. [[0], [1], [2,3,4]]

            # --- Parse Splitting Modes ---
            if mode in ("equal-intervals", "fixed-ranges"):
                interval = int(range_str) if range_str.isdigit() else 1
                interval = max(interval, 1)
                for i in range(0, total_pages, interval):
                    end = min(i + interval, total_pages)
                    indices.append(list(range(i, end)))

            elif mode in ("range", "custom-ranges"):
                # Can be a JSON list of ranges, or string ranges (e.g. "1-5, 6-10")
                merge_ranges = params.get("merge_ranges", False)

                # Check if JSON structure
                raw_ranges = []
                if range_str.strip().startswith("["):
                    try:
                        raw_ranges = json.loads(range_str)
                    except Exception:
                        pass

                if not raw_ranges:
                    # Parse standard range string
                    parts = range_str.split(",")
                    for part in parts:
                        part = part.strip()
                        if "-" in part:
                            try:
                                start_str, end_str = part.split("-")
                                start = int(start_str) if start_str else 1
                                end = int(end_str) if end_str else total_pages
                                raw_ranges.append(
                                    [max(1, start), min(total_pages, end)]
                                )
                            except Exception:
                                continue
                        elif part.isdigit():
                            p = int(part)
                            raw_ranges.append([p, p])

                # Convert 1-based page numbers to 0-based index groups
                for r in raw_ranges:
                    if len(r) == 2:
                        start_idx = max(0, r[0] - 1)
                        end_idx = min(total_pages, r[1])
                        if start_idx < end_idx:
                            indices.append(list(range(start_idx, end_idx)))

                if merge_ranges and indices:
                    # Merge all matching ranges into a single output group
                    merged_group = []
                    for idx_group in indices:
                        merged_group.extend(idx_group)
                    indices = [merged_group]

            elif mode == "select-pages":
                # Extract specific list of pages (e.g. "1,3,5")
                merge_output = params.get("merge_output", True)
                pages_set = []
                parts = range_str.split(",")
                for part in parts:
                    part = part.strip()
                    if part.isdigit():
                        p = int(part)
                        if 1 <= p <= total_pages:
                            pages_set.append(p - 1)

                if merge_output:
                    if pages_set:
                        indices = [pages_set]
                else:
                    for p in pages_set:
                        indices.append([p])

            elif mode == "by-bookmarks":
                # Find bookmarks page splits using PyMuPDF
                doc = fitz.open(input_file)
                toc = doc.get_toc()  # List of [level, title, page]
                doc.close()

                bookmark_pages = sorted(
                    list(
                        set([t[2] - 1 for t in toc if t[2] > 0 and t[2] <= total_pages])
                    )
                )
                boundaries = [0] + bookmark_pages + [total_pages]
                boundaries = sorted(list(set(boundaries)))

                for i in range(len(boundaries) - 1):
                    start = boundaries[i]
                    end = boundaries[i + 1]
                    if start < end:
                        indices.append(list(range(start, end)))

            elif mode == "by-blank-page":
                # Find blank pages using PyMuPDF (fast sniffing)
                doc = fitz.open(input_file)
                blank_pages = []
                for p_idx, page in enumerate(doc):
                    text = page.get_text().strip()
                    imgs = page.get_images()
                    drawings = page.get_drawings()
                    # SNIFF: No text, no images, and no drawings/shapes
                    if not text and len(imgs) == 0 and len(drawings) == 0:
                        blank_pages.append(p_idx)
                doc.close()

                # Split using blank pages as delimiters (skip blank pages)
                start_idx = 0
                for bp in blank_pages:
                    if bp > start_idx:
                        indices.append(list(range(start_idx, bp)))
                    start_idx = bp + 1
                if start_idx < total_pages:
                    indices.append(list(range(start_idx, total_pages)))

            elif mode == "size-limit":
                max_bytes = params.get("max_bytes", 5 * 1024 * 1024)  # Default 5MB

                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_path = Path(temp_dir)
                    page_sizes = []

                    # 1. Save each page to estimate its size
                    for i in range(total_pages):
                        temp_pdf = Pdf.new()
                        temp_pdf.pages.append(pdf.pages[i])
                        temp_page_file = temp_path / f"p_{i}.pdf"
                        temp_pdf.save(temp_page_file)
                        page_sizes.append(temp_page_file.stat().st_size)

                    # 2. Group pages by size limit
                    current_group = []
                    current_size = 0
                    for i in range(total_pages):
                        p_size = page_sizes[i]
                        if current_size + p_size > max_bytes and current_group:
                            indices.append(current_group)
                            current_group = [i]
                            current_size = p_size
                        else:
                            current_group.append(i)
                            current_size += p_size
                    if current_group:
                        indices.append(current_group)
            else:
                # Mode "all"
                for i in range(total_pages):
                    indices.append([i])

            if not indices:
                return ConversionResult(
                    success=False, error_message="No pages were resolved for splitting."
                )

            # --- Write the Split PDFs into Temp Files ---
            update_job_progress(50)

            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                zip_file_paths = []

                for idx, page_group in enumerate(indices):
                    new_pdf = Pdf.new()
                    for p_idx in page_group:
                        new_pdf.pages.append(pdf.pages[p_idx])

                    # Generate logical filenames
                    if len(page_group) == 1:
                        out_name = f"page-{page_group[0] + 1}.pdf"
                    else:
                        out_name = f"pages-{page_group[0] + 1}-{page_group[-1] + 1}.pdf"

                    out_path = temp_path / out_name
                    new_pdf.save(out_path)
                    zip_file_paths.append((out_path, out_name))

                    # Update progress proportionally
                    update_job_progress(50 + int((idx / len(indices)) * 40))

                # --- Zip with maximum DEFLATE compression ---
                update_job_progress(90)
                with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zip_f:
                    for file_path, zip_name in zip_file_paths:
                        zip_f.write(file_path, zip_name)

        update_job_progress(100)
        return ConversionResult(
            success=True,
            output_path=str(output_zip),
            file_size_bytes=output_zip.stat().st_size,
        )

    except Exception as e:
        return ConversionResult(success=False, error_message=f"Split failed: {e!s}")
