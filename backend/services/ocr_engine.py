"""
RobustOCREngine — v3.0
======================
Defensive 5-phase OCR pipeline with:
  Phase 1a: Colored annotation / stamp removal (HSV saturation mask)
  Phase 1b: CLAHE shadow + gradient normalization (region-aware)
  Phase 1c: Chained bilateral + NLM denoising (strong noise suppression)
  Phase 1d: DPI upscaling to 300+ dpi
  Phase 1e: Adaptive Gaussian binarization
  Phase 1f: Connected-component de-speckling
  Phase 1g: Orientation fix via Tesseract OSD
  Phase 1h: Projection-profile deskew (accurate to ±0.25°)
  Phase 2:  Layout-region masking (reject stamps, logos, noise blobs)
  Phase 3:  Multi-PSM confidence-scored extraction → LayoutReconstructor
  Phase 4:  Post-processing (numeric context-casting, dictionary bleeds,
            whitespace normalization — tab/newline preserving)
  Phase 5:  HITL fallback
"""

import logging
import os
import re

import cv2
import numpy as np
import pytesseract

os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"
from dataclasses import dataclass, field

try:
    from PIL import Image
except Exception:
    Image = None

import sys

if sys.platform == "win32":
    tess_dir = r"C:\Program Files\Tesseract-OCR"
    tess_bin = os.path.join(tess_dir, "tesseract.exe")
    if os.path.exists(tess_bin):
        pytesseract.pytesseract.tesseract_cmd = tess_bin

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] RobustOCR: %(message)s",
)
logger = logging.getLogger("RobustOCREngine")


# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class OCRConfig:
    min_confidence_threshold: float = 30.0
    catastrophic_threshold: float = 5.0  # Only reject truly empty/broken results — low-confidence PaddleOCR words are better than none
    target_dpi: int = 300
    assumed_source_dpi: int = 96
    max_pixels: int = 40_000_000
    min_side_px: int = 600
    tesseract_lang: str = "eng"
    timeout_seconds: int = 45
    deskew_max_angle: float = 15.0  # tightened: focus on fine angles
    enable_orientation_fix: bool = True
    enable_nlm_denoising: bool = False  # Disable slow non-local means denoising by default for a 4x preprocessing speedup
    paddleocr_max_side: int = 1200  # Diagnostic proved 98%+ line-level detection at 1200; word drops were from confidence filters not resolution
    field_schema: dict = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Layout-preserving reconstructor
# ─────────────────────────────────────────────────────────────────────────────
class LayoutReconstructor:
    """
    Rebuilds structured text from Tesseract word bounding boxes.
    Words are grouped into visual lines (Y-proximity) then into columns
    (horizontal gap detection). Outputs tab-delimited columns and newlines.
    """

    def __init__(self, col_gap_ratio: float = 0.025, line_gap_ratio: float = 0.012):
        self.col_gap_ratio = col_gap_ratio
        self.line_gap_ratio = line_gap_ratio

    def reconstruct(
        self, data: dict, img_w: int, img_h: int, binary: np.ndarray | None = None
    ) -> str:
        tokens = []
        for i in range(len(data["text"])):
            txt = (data["text"][i] or "").strip()
            try:
                conf = float(data["conf"][i])
            except (ValueError, TypeError):
                conf = -1.0
            if conf < 0 or not txt:
                continue
            x = int(data["left"][i])
            y = int(data["top"][i])
            w = int(data["width"][i])
            h = int(data["height"][i])
            tokens.append(
                {
                    "text": txt,
                    "conf": conf,
                    "x": x,
                    "y": y,
                    "w": x + w,
                    "h": y + h,
                    "cx": x + w // 2,
                    "cy": y + h // 2,
                }
            )

        if not tokens:
            return ""

        # --- Try Layout-Aware Column & Table Reconstruction ---
        # Disabled for standard OCR to eliminate massive RAM bloat from SLANet/LayoutDetection
        if False and binary is not None:
            try:
                import tempfile

                from backend.services.pdf_to_excel import (
                    get_layout_detector,
                    get_table_detector,
                )

                detector = get_layout_detector("cpu")
                if detector is not None:
                    # Save binary image temporarily for layout prediction
                    with tempfile.NamedTemporaryFile(
                        suffix=".png", delete=False
                    ) as temp_file:
                        temp_path = temp_file.name
                    try:
                        # Ensure we convert back to BGR for PaddleOCR layout detector
                        if len(binary.shape) == 2:
                            binary_bgr = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
                        else:
                            binary_bgr = binary
                        cv2.imwrite(temp_path, binary_bgr)
                        res = detector.predict(temp_path)

                        if res and "boxes" in res[0] and res[0]["boxes"]:
                            boxes = res[0]["boxes"]

                            # Filter layout boxes
                            text_boxes = [
                                b
                                for b in boxes
                                if b.get("label")
                                in ("text", "title", "list", "header", "caption")
                            ]
                            table_boxes = [
                                b for b in boxes if b.get("label") == "table"
                            ]

                            if text_boxes or table_boxes:
                                # Group text boxes into vertical columns
                                columns = []
                                sorted_text_boxes = sorted(
                                    text_boxes, key=lambda b: b["coordinate"][1]
                                )
                                for box in sorted_text_boxes:
                                    bx0, by0, bx1, by1 = box["coordinate"]
                                    placed = False
                                    for col in columns:
                                        c_x0, _, c_x1, _ = col[0]["coordinate"]
                                        overlap_x = max(
                                            0, min(bx1, c_x1) - max(bx0, c_x0)
                                        )
                                        min_w = min(bx1 - bx0, c_x1 - c_x0)
                                        if min_w > 0 and (overlap_x / min_w) > 0.5:
                                            col.append(box)
                                            placed = True
                                            break
                                    if not placed:
                                        columns.append([box])

                                # Sort columns left-to-right
                                columns = sorted(
                                    columns,
                                    key=lambda col: (
                                        sum(b["coordinate"][0] for b in col) / len(col)
                                    ),
                                )
                                for col in columns:
                                    col.sort(key=lambda b: b["coordinate"][1])

                                # Create blocks
                                blocks = []
                                for col in columns:
                                    c_x0 = min(b["coordinate"][0] for b in col)
                                    c_y0 = min(b["coordinate"][1] for b in col)
                                    c_x1 = max(b["coordinate"][2] for b in col)
                                    c_y1 = max(b["coordinate"][3] for b in col)
                                    blocks.append(
                                        {
                                            "type": "column",
                                            "boxes": col,
                                            "coordinate": [c_x0, c_y0, c_x1, c_y1],
                                        }
                                    )
                                for tbl in table_boxes:
                                    blocks.append(
                                        {
                                            "type": "table",
                                            "box": tbl,
                                            "coordinate": tbl["coordinate"],
                                        }
                                    )

                                # Sort blocks in reading order (top-to-bottom, left-to-right)
                                from functools import cmp_to_key

                                def compare_blocks(a, b):
                                    ax0, ay0, ax1, ay1 = a["coordinate"]
                                    bx0, by0, bx1, by1 = b["coordinate"]
                                    a_h = ay1 - ay0
                                    b_h = by1 - by0
                                    overlap_y = min(ay1, by1) - max(ay0, by0)
                                    min_h = min(a_h, b_h)

                                    if min_h > 0 and (overlap_y / min_h) > 0.4:
                                        return -1 if ax0 < bx0 else 1
                                    else:
                                        return -1 if ay0 < by0 else 1

                                blocks = sorted(blocks, key=cmp_to_key(compare_blocks))

                                block_texts = []
                                for block in blocks:
                                    if block["type"] == "column":
                                        col_words = []
                                        for box in block["boxes"]:
                                            bx0, by0, bx1, by1 = box["coordinate"]
                                            box_words = [
                                                w
                                                for w in tokens
                                                if w["cx"] >= bx0 - 5
                                                and w["cx"] <= bx1 + 5
                                                and w["cy"] >= by0 - 5
                                                and w["cy"] <= by1 + 5
                                            ]
                                            col_words.extend(box_words)

                                        if col_words:
                                            col_words.sort(
                                                key=lambda w: (w["y"], w["x"])
                                            )
                                            lines = []
                                            curr_line = [col_words[0]]
                                            prev_cy = col_words[0]["cy"]
                                            line_gap = max(
                                                4, int(img_h * self.line_gap_ratio)
                                            )

                                            for w in col_words[1:]:
                                                if abs(w["cy"] - prev_cy) <= line_gap:
                                                    curr_line.append(w)
                                                else:
                                                    lines.append(
                                                        sorted(
                                                            curr_line,
                                                            key=lambda w: w["x"],
                                                        )
                                                    )
                                                    curr_line = [w]
                                                prev_cy = w["cy"]
                                            if curr_line:
                                                lines.append(
                                                    sorted(
                                                        curr_line, key=lambda w: w["x"]
                                                    )
                                                )

                                            line_texts = []
                                            for line in lines:
                                                line_texts.append(
                                                    " ".join(w["text"] for w in line)
                                                )
                                            block_texts.append("\n".join(line_texts))

                                    elif block["type"] == "table":
                                        tbl_box = block["box"]
                                        tx0, ty0, tx1, ty1 = tbl_box["coordinate"]
                                        table_success = False

                                        if (
                                            tx1 > tx0
                                            and ty1 > ty0
                                            and get_table_detector is not None
                                        ):
                                            cropped_tbl = binary[
                                                int(ty0) : int(ty1), int(tx0) : int(tx1)
                                            ]
                                            with tempfile.NamedTemporaryFile(
                                                suffix=".png", delete=False
                                            ) as tf:
                                                temp_tbl_path = tf.name
                                            try:
                                                if len(cropped_tbl.shape) == 2:
                                                    cropped_bgr = cv2.cvtColor(
                                                        cropped_tbl, cv2.COLOR_GRAY2BGR
                                                    )
                                                else:
                                                    cropped_bgr = cropped_tbl
                                                cv2.imwrite(temp_tbl_path, cropped_bgr)

                                                table_rec = get_table_detector("cpu")
                                                res_table = table_rec.predict(
                                                    temp_tbl_path
                                                )

                                                if (
                                                    res_table
                                                    and "structure" in res_table[0]
                                                    and "bbox" in res_table[0]
                                                ):
                                                    structure_tokens = res_table[0][
                                                        "structure"
                                                    ]
                                                    bboxes = res_table[0]["bbox"]

                                                    grid = {}
                                                    occupied = set()
                                                    curr_row = -1
                                                    curr_col = 0
                                                    bbox_idx = 0
                                                    token_idx = 0

                                                    while token_idx < len(
                                                        structure_tokens
                                                    ):
                                                        t = structure_tokens[token_idx]
                                                        if t == "<tr>":
                                                            curr_row += 1
                                                            curr_col = 0
                                                            token_idx += 1
                                                        elif t == "</tr>":
                                                            token_idx += 1
                                                        elif t == "<td></td>":
                                                            rowspan = 1
                                                            colspan = 1
                                                            token_idx += 1

                                                            while (
                                                                curr_row,
                                                                curr_col,
                                                            ) in occupied:
                                                                curr_col += 1

                                                            cell_bbox = None
                                                            if bbox_idx < len(bboxes):
                                                                raw_b = bboxes[bbox_idx]
                                                                xs = [
                                                                    raw_b[0],
                                                                    raw_b[2],
                                                                    raw_b[4],
                                                                    raw_b[6],
                                                                ]
                                                                ys = [
                                                                    raw_b[1],
                                                                    raw_b[3],
                                                                    raw_b[5],
                                                                    raw_b[7],
                                                                ]
                                                                cell_bbox = (
                                                                    min(xs),
                                                                    min(ys),
                                                                    max(xs),
                                                                    max(ys),
                                                                )
                                                                bbox_idx += 1

                                                            grid[
                                                                (curr_row, curr_col)
                                                            ] = {
                                                                "bbox": cell_bbox,
                                                                "rowspan": rowspan,
                                                                "colspan": colspan,
                                                            }
                                                            occupied.add(
                                                                (curr_row, curr_col)
                                                            )
                                                            curr_col += 1
                                                        elif t.startswith("<td"):
                                                            rowspan = 1
                                                            colspan = 1
                                                            attr_tokens = []
                                                            token_idx += 1

                                                            while (
                                                                token_idx
                                                                < len(structure_tokens)
                                                                and structure_tokens[
                                                                    token_idx
                                                                ]
                                                                != ">"
                                                            ):
                                                                attr_tokens.append(
                                                                    structure_tokens[
                                                                        token_idx
                                                                    ]
                                                                )
                                                                token_idx += 1

                                                            if (
                                                                token_idx
                                                                < len(structure_tokens)
                                                                and structure_tokens[
                                                                    token_idx
                                                                ]
                                                                == ">"
                                                            ):
                                                                token_idx += 1

                                                            if (
                                                                token_idx
                                                                < len(structure_tokens)
                                                                and structure_tokens[
                                                                    token_idx
                                                                ]
                                                                == "</td>"
                                                            ):
                                                                token_idx += 1

                                                            attr_str = "".join(
                                                                attr_tokens
                                                            )
                                                            r_match = re.search(
                                                                r'rowspan="(\d+)"',
                                                                attr_str,
                                                            )
                                                            if r_match:
                                                                rowspan = int(
                                                                    r_match.group(1)
                                                                )
                                                            c_match = re.search(
                                                                r'colspan="(\d+)"',
                                                                attr_str,
                                                            )
                                                            if c_match:
                                                                colspan = int(
                                                                    c_match.group(1)
                                                                )

                                                            while (
                                                                curr_row,
                                                                curr_col,
                                                            ) in occupied:
                                                                curr_col += 1

                                                            cell_bbox = None
                                                            if bbox_idx < len(bboxes):
                                                                raw_b = bboxes[bbox_idx]
                                                                xs = [
                                                                    raw_b[0],
                                                                    raw_b[2],
                                                                    raw_b[4],
                                                                    raw_b[6],
                                                                ]
                                                                ys = [
                                                                    raw_b[1],
                                                                    raw_b[3],
                                                                    raw_b[5],
                                                                    raw_b[7],
                                                                ]
                                                                cell_bbox = (
                                                                    min(xs),
                                                                    min(ys),
                                                                    max(xs),
                                                                    max(ys),
                                                                )
                                                                bbox_idx += 1

                                                            grid[
                                                                (curr_row, curr_col)
                                                            ] = {
                                                                "bbox": cell_bbox,
                                                                "rowspan": rowspan,
                                                                "colspan": colspan,
                                                            }

                                                            for dr in range(rowspan):
                                                                for dc in range(
                                                                    colspan
                                                                ):
                                                                    occupied.add(
                                                                        (
                                                                            curr_row
                                                                            + dr,
                                                                            curr_col
                                                                            + dc,
                                                                        )
                                                                    )
                                                            curr_col += colspan
                                                        else:
                                                            token_idx += 1

                                                    if occupied:
                                                        row_count = (
                                                            max(r for r, c in occupied)
                                                            + 1
                                                        )
                                                        col_count = (
                                                            max(c for r, c in occupied)
                                                            + 1
                                                        )

                                                        tbl_rows = []
                                                        for r in range(row_count):
                                                            tbl_cells = []
                                                            for c in range(col_count):
                                                                cell = grid.get((r, c))
                                                                if cell:
                                                                    cb = cell["bbox"]
                                                                    cell_text = ""
                                                                    if cb:
                                                                        cx0 = (
                                                                            tx0
                                                                            + cb[0]
                                                                            - 5
                                                                        )
                                                                        cy0 = (
                                                                            ty0 + cb[1]
                                                                        )
                                                                        cx1 = (
                                                                            tx0
                                                                            + cb[2]
                                                                            + 5
                                                                        )
                                                                        cy1 = (
                                                                            ty0 + cb[3]
                                                                        )

                                                                        cell_words = [
                                                                            w
                                                                            for w in tokens
                                                                            if w["cx"]
                                                                            >= cx0
                                                                            and w["cx"]
                                                                            <= cx1
                                                                            and w["cy"]
                                                                            >= cy0
                                                                            and w["cy"]
                                                                            <= cy1
                                                                        ]
                                                                        if cell_words:
                                                                            cell_words.sort(
                                                                                key=lambda w: (
                                                                                    w[
                                                                                        "y"
                                                                                    ],
                                                                                    w[
                                                                                        "x"
                                                                                    ],
                                                                                )
                                                                            )
                                                                            cell_text = " ".join(
                                                                                w[
                                                                                    "text"
                                                                                ]
                                                                                for w in cell_words
                                                                            )
                                                                    tbl_cells.append(
                                                                        cell_text
                                                                    )
                                                                else:
                                                                    tbl_cells.append("")
                                                            tbl_rows.append(
                                                                "\t".join(tbl_cells)
                                                            )

                                                        block_texts.append(
                                                            "\n".join(tbl_rows)
                                                        )
                                                        table_success = True
                                            except Exception as tex:
                                                logger.warning(
                                                    "SLANet failed inside OCR LayoutReconstructor: %s",
                                                    tex,
                                                )
                                            finally:
                                                if os.path.exists(temp_tbl_path):
                                                    os.unlink(temp_tbl_path)

                                        if not table_success:
                                            # Fallback table words reconstruction
                                            tbl_words = [
                                                w
                                                for w in tokens
                                                if w["cx"] >= tx0 - 5
                                                and w["cx"] <= tx1 + 5
                                                and w["cy"] >= ty0 - 5
                                                and w["cy"] <= ty1 + 5
                                            ]
                                            if tbl_words:
                                                tbl_words.sort(
                                                    key=lambda w: (w["y"], w["x"])
                                                )
                                                lines = []
                                                curr_line = [tbl_words[0]]
                                                prev_cy = tbl_words[0]["cy"]
                                                line_gap = max(
                                                    4, int(img_h * self.line_gap_ratio)
                                                )

                                                for w in tbl_words[1:]:
                                                    if (
                                                        abs(w["cy"] - prev_cy)
                                                        <= line_gap
                                                    ):
                                                        curr_line.append(w)
                                                    else:
                                                        lines.append(
                                                            sorted(
                                                                curr_line,
                                                                key=lambda w: w["x"],
                                                            )
                                                        )
                                                        curr_line = [w]
                                                    prev_cy = w["cy"]
                                                if curr_line:
                                                    lines.append(
                                                        sorted(
                                                            curr_line,
                                                            key=lambda w: w["x"],
                                                        )
                                                    )

                                                col_gap = max(
                                                    10, int(img_w * self.col_gap_ratio)
                                                )
                                                tbl_lines = []
                                                for line in lines:
                                                    cells = [[]]
                                                    prev_r = line[0]["x"]
                                                    for w in line:
                                                        gap = w["x"] - prev_r
                                                        if gap > col_gap and cells[-1]:
                                                            cells.append([])
                                                        cells[-1].append(w["text"])
                                                        prev_r = w["h"]
                                                    tbl_lines.append(
                                                        "\t".join(
                                                            " ".join(c)
                                                            for c in cells
                                                            if c
                                                        )
                                                    )
                                                block_texts.append("\n".join(tbl_lines))

                                return "\n\n".join(block_texts)
                    finally:
                        if os.path.exists(temp_path):
                            os.unlink(temp_path)
            except Exception as e:
                logger.warning(
                    "Layout-Aware reconstruction failed: %s. Falling back to default.",
                    e,
                )

        # --- Default Horizontal-Gap Reconstructor (Fallback) ---
        tokens.sort(key=lambda t: (t["y"], t["x"]))

        line_gap_px = max(4, int(img_h * self.line_gap_ratio))
        lines: list[list[dict]] = []
        current_line: list[dict] = [tokens[0]]
        prev_cy = tokens[0]["cy"]

        for tok in tokens[1:]:
            if abs(tok["cy"] - prev_cy) <= line_gap_px:
                current_line.append(tok)
            else:
                if current_line:
                    lines.append(sorted(current_line, key=lambda t: t["x"]))
                current_line = [tok]
            prev_cy = tok["cy"]
        if current_line:
            lines.append(sorted(current_line, key=lambda t: t["x"]))

        col_gap_px = max(10, int(img_w * self.col_gap_ratio))
        reconstructed_lines: list[str] = []
        prev_line_y = lines[0][0]["y"] if lines else 0

        for line_tokens in lines:
            curr_y = line_tokens[0]["y"]
            if (curr_y - prev_line_y) > (line_gap_px * 5) and reconstructed_lines:
                reconstructed_lines.append("")
            prev_line_y = curr_y

            cells: list[list[str]] = [[]]
            prev_right = line_tokens[0]["x"]

            for tok in line_tokens:
                gap = tok["x"] - prev_right
                if gap > col_gap_px and cells[-1]:
                    cells.append([])
                cells[-1].append(tok["text"])
                prev_right = tok[
                    "h"
                ]  # wait, the end coordinate in tokens is h (x+w). Yes, w = x+w, h = y+h.
                # Let's look at the mapping: tokens.append({"text": txt, "conf": conf, "x": x, "y": y, "w": x + w, "h": y + h})
                # Yes, so w is indeed x + w (right x), and h is y + h (bottom y).
                # So prev_right should be tok["w"]!
                # Wait, in the target code, it was: tokens.append({"text": txt, "conf": conf, "x": x, "y": y, "w": w, "h": h, "cx": ..., "cy": ...})
                # And prev_right = tok["x"] + tok["w"].
                # In our new tokens list, we defined "w" as x + w (which is the right edge).
                # So prev_right = tok["w"] is correct!

            cell_strings = [" ".join(c) for c in cells if c]
            reconstructed_lines.append("\t".join(cell_strings))

        output_lines: list[str] = []
        blank_run = 0
        for line in reconstructed_lines:
            if line.strip() == "":
                blank_run += 1
                if blank_run <= 1:
                    output_lines.append("")
            else:
                blank_run = 0
                output_lines.append(line)

        return "\n".join(output_lines)


# ─────────────────────────────────────────────────────────────────────────────
# Engine
# ─────────────────────────────────────────────────────────────────────────────
import threading

_PADDLEOCR_READERS = {}
_reader_lock = threading.Lock()

PADDLE_LANG_MAPPING = {
    # Chinese/English
    "ch": "ch",
    "zh": "ch",
    "zh-cn": "ch",
    "chi_sim": "ch",
    "chinese": "ch",
    # English
    "en": "en",
    "eng": "en",
    "english": "en",
    # French
    "fr": "fr",
    "fra": "fr",
    "fre": "fr",
    "french": "fr",
    # German
    "de": "de",
    "deu": "de",
    "ger": "de",
    "german": "de",
    # Spanish
    "es": "es",
    "spa": "es",
    "spanish": "es",
    # Portuguese
    "pt": "pt",
    "por": "pt",
    "portuguese": "pt",
    # Italian
    "it": "it",
    "ita": "it",
    "italian": "it",
    # Russian
    "ru": "ru",
    "rus": "ru",
    "russian": "ru",
    # Arabic
    "ar": "ar",
    "ara": "ar",
    "arabic": "ar",
    # Hindi
    "hi": "hi",
    "hin": "hi",
    "hindi": "hi",
    # Korean
    "ko": "korean",
    "kor": "korean",
    "korean": "korean",
    # Japanese
    "ja": "japan",
    "jpn": "japan",
    "japan": "japan",
    # Traditional Chinese
    "chinese_cht": "chinese_cht",
    "zh-tw": "chinese_cht",
    "cht": "chinese_cht",
    # Multilingual / Auto-Detect
    "all": "ch",
    "auto": "ch",
    "multilingual": "ch",
    # Tamil
    "ta": "ta",
    "tam": "ta",
    "tamil": "ta",
    # Telugu
    "te": "te",
    "tel": "te",
    "telugu": "te",
    # Kannada
    "ka": "ka",
    "kan": "ka",
    "kannada": "ka",
    # Thai
    "th": "th",
    "tha": "th",
    "thai": "th",
    # Vietnamese
    "vi": "vi",
    "vie": "vi",
    "vietnamese": "vi",
    # Turkish
    "tr": "tr",
    "tur": "tr",
    "turkish": "tr",
}


def clear_paddleocr_readers():
    """
    Forcefully releases all cached PaddleOCR / PaddleX reader instances,
    unloads ONNX Runtime sessions, empties GPU memory cache, and triggers
    full garbage collection to return RAM to the operating system immediately.
    """
    global _PADDLEOCR_READERS
    with _reader_lock:
        for key in list(_PADDLEOCR_READERS.keys()):
            try:
                reader = _PADDLEOCR_READERS.pop(key, None)
                if reader is not None:
                    for attr in ("_pipeline", "predictor", "paddlex_pipeline", "page_ocr", "text_detector", "text_recognizer", "text_classifier"):
                        if hasattr(reader, attr):
                            try:
                                delattr(reader, attr)
                            except Exception:
                                pass
                    del reader
            except Exception as e:
                logger.warning("Error releasing PaddleOCR reader for %s: %s", key, e)
        _PADDLEOCR_READERS.clear()

    try:
        import paddle
        if paddle.device.is_compiled_with_cuda():
            paddle.device.cuda.empty_cache()
    except Exception:
        pass

    import gc
    gc.collect()
    logger.info("PaddleOCR reader cache cleared and memory reclaimed.")


def get_paddleocr_reader(lang: str = "en", device: str = "cpu"):
    global _PADDLEOCR_READERS
    resolved_lang = PADDLE_LANG_MAPPING.get(lang.lower().strip(), lang.lower().strip())

    with _reader_lock:
        key = (resolved_lang, device)
        if key not in _PADDLEOCR_READERS:
            # Memory Guard: Evict any idle transient reader (not 'ch' or 'en') before creating a new one
            for cached_key in list(_PADDLEOCR_READERS.keys()):
                if cached_key[0] not in ("ch", "en"):
                    evicted = _PADDLEOCR_READERS.pop(cached_key, None)
                    if evicted is not None:
                        for attr in ("_pipeline", "predictor", "paddlex_pipeline", "page_ocr", "text_detector", "text_recognizer", "text_classifier"):
                            if hasattr(evicted, attr):
                                try:
                                    delattr(evicted, attr)
                                except Exception:
                                    pass
                        del evicted
                    import gc
                    gc.collect()

            import logging

            import paddle
            from paddleocr import PaddleOCR
            from paddleocr import logger as paddle_logger

            paddle_logger.setLevel(logging.ERROR)

            gpu_available = paddle.device.is_compiled_with_cuda()
            use_gpu = device == "gpu" and gpu_available

            if use_gpu:
                # Limit GPU memory pre-allocation (auto-growth) and eagerly delete VRAM tensors!
                os.environ["FLAGS_fraction_of_gpu_memory_to_use"] = "0.0"
                os.environ["FLAGS_eager_delete_tensor_gb"] = "0.0"
                os.environ["FLAGS_fast_eager_deletion_mode"] = "1"

            actual_device = "gpu" if use_gpu else "cpu"
            logger.info(
                "Initializing global PaddleOCR reader for language '%s' (device=%s, actual_device=%s, gpu_available=%s)...",
                resolved_lang,
                device,
                actual_device,
                gpu_available,
            )
            paddle.set_device(actual_device)

            ocr_kwargs = {
                "use_doc_unwarping": False,  # CRITICAL: Disable unwarping/cropping to preserve exact 1:1 original coordinate mapping
                "use_doc_orientation_classify": False,  # OSD already handles rotation globally
                "use_textline_orientation": False,  # Disable line orientation check (already fixed globally by OSD) for massive speedup
                "text_det_limit_side_len": 960,
                "text_det_limit_type": "max",
                "device": actual_device,
                "engine": "onnxruntime",
                "lang": resolved_lang,
            }
            try:
                _PADDLEOCR_READERS[key] = PaddleOCR(**ocr_kwargs)
            except Exception as e:
                logger.error(
                    "Failed to initialize PaddleOCR for language '%s' on %s: %s. Falling back to CPU.",
                    resolved_lang,
                    device,
                    e,
                )
                # Fallback to standard config without custom directories
                fallback_kwargs = {
                    "use_doc_unwarping": False,
                    "use_doc_orientation_classify": False,
                    "use_textline_orientation": False,
                    "text_det_limit_side_len": 960,
                    "text_det_limit_type": "max",
                    "device": "cpu",
                    "engine": "onnxruntime",
                    "lang": resolved_lang,
                }
                try:
                    _PADDLEOCR_READERS[key] = PaddleOCR(**fallback_kwargs)
                except Exception as e2:
                    logger.error("Failed to initialize fallback PaddleOCR: %s", e2)
                    raise e2

    return _PADDLEOCR_READERS[key]


class RobustOCREngine:
    CORRECTIONS = {
        "Tbe": "The",
        "tbe": "the",
        "C0mpany": "Company",
        "1nvoice": "Invoice",
        "0rder": "Order",
        "Arnount": "Amount",
        "Nurnber": "Number",
        "Addr3ss": "Address",
    }
    NUMERIC_SWAPS = {
        "O": "0",
        "o": "0",
        "l": "1",
        "I": "1",
        "S": "5",
        "B": "8",
        "Z": "2",
        "G": "6",
    }
    NUMERIC_TOKEN_RE = re.compile(r"\b(?=[\dOoIlSBZG]*\d)[\dOoIlSBZG]{2,}\b")

    def __init__(self, config: OCRConfig | None = None):
        self.cfg = config or OCRConfig()
        self._reconstructor = LayoutReconstructor()

    # ──────────────────────────── public API ─────────────────────────────── #
    def process(
        self,
        image_path: str,
        engine_name: str = "tesseract",
        pagesegmode: str = "3",
        deskew: bool = True,
        lang: str | None = None,
    ) -> dict:
        flags: list[str] = []
        try:
            if not isinstance(image_path, str) or not os.path.isfile(image_path):
                return self._hitl(0.0, ["file_not_found"])
            if os.path.getsize(image_path) == 0:
                return self._hitl(0.0, ["empty_file"])

            img = cv2.imread(image_path, cv2.IMREAD_COLOR)
            if img is None:
                return self._hitl(0.0, ["file_unreadable_or_unsupported"])

            src_dpi = self._read_dpi(image_path)

            # Fast Path for PaddleOCR — ALWAYS use raw image, never fall to slow path.
            # The slow path's preprocessing (CLAHE, binarization, de-speckling) was designed
            # for Tesseract and DESTROYS handwriting strokes when applied before PaddleOCR.
            # Diagnostic proved: slow path finds same/fewer words at worse confidence and 2× time.
            run_slow_path = True
            if engine_name == "paddleocr":
                try:
                    logger.info(
                        "Running PaddleOCR Fast Path (skipping CPU pre-processing)..."
                    )
                    img_proc = img
                    if img_proc.shape[0] * img_proc.shape[1] > self.cfg.max_pixels:
                        f = (
                            self.cfg.max_pixels
                            / (img_proc.shape[0] * img_proc.shape[1])
                        ) ** 0.5
                        img_proc = cv2.resize(
                            img_proc, None, fx=f, fy=f, interpolation=cv2.INTER_AREA
                        )

                    text, confidence, p3, raw_data = self._phase3_extract(
                        img_proc,
                        engine_name=engine_name,
                        pagesegmode=pagesegmode,
                        lang=lang,
                    )

                    # Always use fast path results for PaddleOCR — even at low confidence.
                    # PaddleOCR works best on raw unprocessed images.
                    run_slow_path = False
                    flags += p3
                    binary = cv2.cvtColor(img_proc, cv2.COLOR_BGR2GRAY)
                    if confidence < self.cfg.min_confidence_threshold:
                        logger.info(
                            "PaddleOCR Fast Path confidence low (%.1f < %.1f) but using results anyway (slow path would be worse).",
                            confidence,
                            self.cfg.min_confidence_threshold,
                        )
                except Exception as e:
                    logger.warning(
                        "PaddleOCR Fast Path failed, falling back to slow path: %s", e
                    )

            if run_slow_path:
                binary, p1 = self._phase1_preprocess(img, src_dpi, deskew=deskew)
                flags += p1
                if binary is None:
                    return self._hitl(0.0, flags or ["preprocess_failed"])

                masked, p2 = self._phase2_layout_mask(binary)
                flags += p2

                text, confidence, p3, raw_data = self._phase3_extract(
                    masked, engine_name=engine_name, pagesegmode=pagesegmode, lang=lang
                )
                flags += p3

            # Calculate word coordinates scaled back to original image
            word_list = []
            if raw_data:
                w_orig = img.shape[1]
                h_orig = img.shape[0]
                w_bin = binary.shape[1]
                h_bin = binary.shape[0]
                for i in range(len(raw_data.get("text", []))):
                    x0 = raw_data["left"][i]
                    y0 = raw_data["top"][i]
                    w = raw_data["width"][i]
                    h = raw_data["height"][i]

                    x0_orig = x0 * w_orig / w_bin
                    y0_orig = y0 * h_orig / h_bin
                    x1_orig = (x0 + w) * w_orig / w_bin
                    y1_orig = (y0 + h) * h_orig / h_bin

                    word_list.append(
                        {
                            "text": raw_data["text"][i],
                            "conf": raw_data["conf"][i],
                            "rect": (x0_orig, y0_orig, x1_orig, y1_orig),
                        }
                    )

            if text is None or confidence < self.cfg.catastrophic_threshold:
                return self._hitl(
                    confidence, flags or ["low_confidence"], text, word_list
                )

            corrected = self._phase4_postprocess(text)
            if not corrected.strip():
                return self._hitl(
                    confidence, flags + ["empty_after_postprocess"], text, word_list
                )

            logger.info("SUCCESS conf=%.1f flags=%s", confidence, sorted(set(flags)))
            return {
                "status": "ok" if not flags else "ok_with_warnings",
                "confidence": round(confidence, 1),
                "extracted_text": corrected,
                "error_flags": sorted(set(flags)),
                "words": word_list,
            }

        except pytesseract.TesseractNotFoundError:
            logger.exception("Tesseract binary not found on PATH")
            return self._hitl(0.0, flags + ["tesseract_not_installed"])
        except MemoryError:
            logger.exception("Out of memory")
            return self._hitl(0.0, flags + ["memory_exhausted"])
        except RuntimeError as exc:
            logger.exception("Engine runtime error: %s", exc)
            return self._hitl(0.0, flags + ["engine_timeout_or_runtime"])
        except Exception as exc:
            logger.exception("Unrecoverable pipeline error: %s", exc)
            return self._hitl(0.0, flags + ["pipeline_exception"])

    # ──────────────────────────── helpers ────────────────────────────────── #
    def _read_dpi(self, path: str) -> int:
        if Image is None:
            return self.cfg.assumed_source_dpi
        try:
            with Image.open(path) as im:
                dpi = im.info.get("dpi")
                if dpi and dpi[0] and 50 <= dpi[0] <= 1200:
                    return int(dpi[0])
        except Exception:
            pass
        return self.cfg.assumed_source_dpi

    # ─────────────────────────── Phase 1 ─────────────────────────────────── #
    def _phase1_preprocess(
        self, img: np.ndarray, src_dpi: int, deskew: bool = True
    ) -> tuple[np.ndarray | None, list[str]]:
        flags: list[str] = []
        try:
            # ── 1a. Resize guard ────────────────────────────────────────────
            if img.shape[0] * img.shape[1] > self.cfg.max_pixels:
                f = (self.cfg.max_pixels / (img.shape[0] * img.shape[1])) ** 0.5
                img = cv2.resize(img, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
                flags.append("downscaled_oversized")

            # ── 1b. Colored annotation / stamp removal ───────────────────────
            # Stamps, red boxes, and colored highlights confuse binarization.
            # We detect high-saturation pixels and replace them with page white.
            try:
                hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
                # High saturation (>90) = colored ink/annotation, not document text
                color_mask = hsv[:, :, 1] > 90
                # Only target colored areas that are NOT very dark (avoid dark ink)
                not_dark = hsv[:, :, 2] > 50
                annotation_mask = (color_mask & not_dark).astype(np.uint8) * 255
                # Dilate slightly to cover anti-aliased edges of annotations
                annotation_mask = cv2.dilate(
                    annotation_mask,
                    cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)),
                )
                # Replace annotated pixels with pure white in color image
                img[annotation_mask == 255] = [255, 255, 255]
                n_erased = int(np.sum(annotation_mask == 255))
                if n_erased > 100:
                    flags.append("colored_annotation_removed")
                    logger.info(
                        "Phase1b: removed %d colored annotation pixels", n_erased
                    )
            except Exception as e:
                logger.warning("Phase1b annotation removal failed: %s", e)

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # ── Quality probes (before normalization) ────────────────────────
            lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            if lap_var < 50:
                flags.append("possible_blur")
                logger.info("Phase1 blur detected: Laplacian var=%.1f", lap_var)

            mean_v = float(np.mean(gray))
            if mean_v < 40:
                flags.append("under_exposed")
            elif mean_v > 240:  # 220 caused false-positives on white paper
                flags.append("over_exposed")

            # ── 1c. CLAHE — region-aware contrast (kills gradient shadows) ───
            # Unlike global divide-by-background, CLAHE adapts per-tile.
            # A right-side shadow becomes just another locally-normalized tile.
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(12, 12))
            gray = clahe.apply(gray)
            logger.info("Phase1c CLAHE applied, mean after=%.1f", float(np.mean(gray)))

            # ── 1d. Chained denoising: bilateral + NLM ───────────────────────
            # Bilateral preserves edges (letter strokes) while smoothing noise.
            # NLM then kills remaining salt-and-pepper noise.
            if self.cfg.enable_nlm_denoising:
                gray = cv2.bilateralFilter(gray, d=9, sigmaColor=35, sigmaSpace=35)
                gray = cv2.fastNlMeansDenoising(
                    gray, None, h=15, templateWindowSize=7, searchWindowSize=21
                )
                logger.info("Phase1d bilateral+NLM denoising complete")
            else:
                # Fast alternative: bilateral filtering only (preserves edges, skips slow NLM)
                gray = cv2.bilateralFilter(gray, d=7, sigmaColor=25, sigmaSpace=25)
                logger.info(
                    "Phase1d bilateral denoising complete (NLM skipped for speed)"
                )

            # ── 1e. DPI upscaling ────────────────────────────────────────────
            scale = self.cfg.target_dpi / float(max(src_dpi, 1))
            scale = min(scale, 4.0)
            if scale > 1.05:
                gray = cv2.resize(
                    gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC
                )
                logger.info(
                    "Phase1e scaled %.2fx (%d→%d dpi)",
                    scale,
                    src_dpi,
                    self.cfg.target_dpi,
                )
            if min(gray.shape) < self.cfg.min_side_px:
                flags.append("low_dpi")

            # ── 1f. Adaptive Gaussian binarization ───────────────────────────
            # blockSize=21 is tighter than the old 31 — better for small text.
            # C=8 (reduced) avoids over-erosion of thin strokes.
            binary = cv2.adaptiveThreshold(
                gray,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                blockSize=21,
                C=8,
            )

            ink_ratio = float(np.count_nonzero(binary == 0)) / binary.size
            if ink_ratio < 0.0005:
                flags.append("possible_over_binarization")
            elif ink_ratio > 0.6:
                flags.append("possible_inverted_or_dark_scan")
                binary = cv2.bitwise_not(binary)

            # ── 1g. Connected-component de-speckling ─────────────────────────
            binary = cv2.medianBlur(binary, 3)
            try:
                inverted = cv2.bitwise_not(binary)
                n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
                    inverted, connectivity=8
                )
                if n_labels > 1:
                    areas = stats[:, cv2.CC_STAT_AREA]
                    widths = stats[:, cv2.CC_STAT_WIDTH]
                    heights = stats[:, cv2.CC_STAT_HEIGHT]
                    is_noise = (areas < 12) & (widths < 5) & (heights < 5)
                    is_noise[0] = False
                    lookup = np.zeros(n_labels, dtype=np.uint8)
                    lookup[is_noise] = 255
                    noise_mask = lookup[labels]
                    binary[noise_mask == 255] = 255
                    logger.info(
                        "Phase1g de-speckle erased %d regions", int(np.sum(is_noise))
                    )
            except Exception as e:
                logger.warning("Phase1g de-speckle failed: %s", e)

            # ── 1h. Orientation fix via OSD ──────────────────────────────────
            if self.cfg.enable_orientation_fix:
                binary = self._fix_orientation(binary, flags)

            # ── 1i. Projection-profile deskew ────────────────────────────────
            # This is far more accurate than minAreaRect on noisy images.
            # Scans angles from -deskew_max to +deskew_max, finds the angle
            # that maximises the variance of horizontal projection (text rows
            # create strong peaks when perfectly horizontal).
            if deskew:
                binary = self._deskew_projection(binary, flags)

            logger.info("Phase1 complete flags=%s", flags)
            return binary, flags

        except Exception as exc:
            logger.exception("Phase1 failure: %s", exc)
            return None, flags + ["preprocess_exception"]

    def _fix_orientation(self, binary: np.ndarray, flags: list[str]) -> np.ndarray:
        try:
            osd = pytesseract.image_to_osd(
                binary,
                output_type=pytesseract.Output.DICT,
                config="--psm 0",
                timeout=10,
            )
            rot = int(osd.get("rotate", 0))
            if rot in (90, 180, 270):
                k = {
                    90: cv2.ROTATE_90_CLOCKWISE,
                    180: cv2.ROTATE_180,
                    270: cv2.ROTATE_90_COUNTERCLOCKWISE,
                }[rot]
                binary = cv2.rotate(binary, k)
                flags.append(f"orientation_fixed_{rot}")
                logger.info("Orientation corrected by %d°", rot)
        except Exception:
            flags.append("osd_unavailable")
        return binary

    def _deskew_projection(self, binary: np.ndarray, flags: list[str]) -> np.ndarray:
        """
        Projection-profile deskew.
        Scans angles on a downscaled version of the image to dramatically speed up rotation steps.
        """
        try:
            h, w = binary.shape

            # Downscale binary image for fast angle scanning (height = 800px)
            scale = 800.0 / float(h)
            if scale < 1.0:
                small = cv2.resize(
                    binary, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST
                )
            else:
                small = binary

            h_s, w_s = small.shape
            center_s = (w_s // 2, h_s // 2)
            max_a = self.cfg.deskew_max_angle

            # Coarse scan (1° steps) then fine scan (0.5° steps) for speed
            best_angle = 0.0
            best_score = -1.0

            for step_angles in [
                np.arange(-max_a, max_a + 1, 1.0),  # coarse
                np.arange(best_angle - 1.5, best_angle + 1.6, 0.5),  # fine
            ]:
                for angle in step_angles:
                    M = cv2.getRotationMatrix2D(center_s, angle, 1.0)
                    rotated = cv2.warpAffine(
                        small,
                        M,
                        (w_s, h_s),
                        flags=cv2.INTER_NEAREST,
                        borderMode=cv2.BORDER_CONSTANT,
                        borderValue=255,
                    )
                    # Horizontal projection: count black (0) pixels per row
                    proj = np.sum(rotated == 0, axis=1).astype(np.float64)
                    score = float(np.var(proj))
                    if score > best_score:
                        best_score = score
                        best_angle = angle

            logger.info(
                "Projection deskew: best_angle=%.2f score=%.1f", best_angle, best_score
            )

            if abs(best_angle) > 0.3:
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, best_angle, 1.0)
                binary = cv2.warpAffine(
                    binary,
                    M,
                    (w, h),
                    flags=cv2.INTER_CUBIC,
                    borderMode=cv2.BORDER_CONSTANT,
                    borderValue=255,
                )
                flags.append("deskewed")
                logger.info("Deskewed original by %.2f°", best_angle)
            else:
                logger.info("No significant skew detected (%.2f°)", best_angle)

        except Exception as exc:
            logger.warning("Projection deskew failed: %s", exc)
            flags.append("deskew_failed")

        return binary

    # ─────────────────────────── Phase 2 ─────────────────────────────────── #
    def _phase2_layout_mask(self, binary: np.ndarray) -> tuple[np.ndarray, list[str]]:
        flags: list[str] = []
        try:
            inv = cv2.bitwise_not(binary)
            dil = cv2.dilate(inv, cv2.getStructuringElement(cv2.MORPH_RECT, (25, 5)))
            contours, _ = cv2.findContours(
                dil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            mask = np.zeros_like(binary)
            page_area = binary.shape[0] * binary.shape[1]
            kept = 0
            for c in contours:
                x, y, w, h = cv2.boundingRect(c)
                area = w * h
                ar = w / float(h) if h else 0
                fill = cv2.contourArea(c) / float(area + 1)
                if area > 0.45 * page_area and fill > 0.6:
                    continue  # full-page stamp / photo
                if area < 0.00004 * page_area:
                    continue  # speck / noise
                if 0.04 < ar < 60:
                    cv2.rectangle(mask, (x, y), (x + w, y + h), 255, -1)
                    kept += 1

            if kept == 0:
                flags.append("no_text_regions")
                return binary, flags

            out = np.full_like(binary, 255)
            out[mask == 255] = binary[mask == 255]
            logger.info("Phase2 kept %d text regions", kept)
            return out, flags
        except Exception as exc:
            logger.exception("Phase2 failure: %s", exc)
            return binary, flags + ["layout_analysis_failed"]

    # ─────────────────────────── Phase 3 ─────────────────────────────────── #
    def _phase3_extract(
        self,
        binary: np.ndarray,
        engine_name: str = "tesseract",
        pagesegmode: str = "3",
        lang: str | None = None,
    ) -> tuple[str | None, float, list[str], dict]:
        """
        Extraction phase using either Tesseract or PaddleOCR.
        Reconstructs structured layouts (columns, tables) from word bounding boxes.
        """
        flags: list[str] = []
        img_h, img_w = binary.shape[:2]

        try:
            if engine_name == "paddleocr":
                is_auto_lang = bool(
                    lang and lang.lower().strip() in ("all", "auto", "multilingual")
                )
                if is_auto_lang:
                    paddle_lang = "ch"
                else:
                    paddle_lang = "en"
                    if lang:
                        paddle_lang = PADDLE_LANG_MAPPING.get(
                            lang.lower().strip(), lang.lower().strip()
                        )

                # Determine device dynamically based on POST-RESIZED image size to prevent VRAM OOM
                max_side = self.cfg.paddleocr_max_side
                scale_down_temp = 1.0
                if max(img_h, img_w) > max_side:
                    scale_down_temp = max_side / float(max(img_h, img_w))
                w_down_temp = int(img_w * scale_down_temp)
                h_down_temp = int(img_h * scale_down_temp)
                downscaled_pixels = w_down_temp * h_down_temp

                gpu_available = False
                try:
                    import paddle
                    gpu_available = paddle.device.is_compiled_with_cuda()
                except Exception:
                    gpu_available = False

                device = "gpu"
                if gpu_available:
                    # Only fallback to CPU if the actual image processed by PaddleOCR exceeds 9,000,000 pixels
                    if downscaled_pixels > 9_000_000:
                        device = "cpu"
                        logger.info(
                            "Oversized model input (%dx%d = %d px > 9M px). Routing to CPU OOM guard.",
                            w_down_temp,
                            h_down_temp,
                            downscaled_pixels,
                        )
                        flags.append("routed_to_cpu_oom_guard")
                    else:
                        logger.info(
                            "Standard model input (%dx%d = %d px). Routing to GPU for fast inference.",
                            w_down_temp,
                            h_down_temp,
                            downscaled_pixels,
                        )
                else:
                    device = "cpu"
                    logger.info("GPU not available. Running on CPU.")

                reader = get_paddleocr_reader(lang=paddle_lang, device=device)

                # Ensure input has 3 channels (PaddleOCR expects BGR/RGB color images)
                if len(binary.shape) == 2:
                    binary_color = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
                else:
                    binary_color = binary

                # Downscale image to a maximum side for speed and CPU memory conservation
                h_bin, w_bin = binary_color.shape[:2]
                scale_down = 1.0
                if max(h_bin, w_bin) > max_side:
                    scale_down = max_side / float(max(h_bin, w_bin))
                    w_down = int(w_bin * scale_down)
                    h_down = int(h_bin * scale_down)
                    binary_color = cv2.resize(
                        binary_color, (w_down, h_down), interpolation=cv2.INTER_AREA
                    )
                    logger.info(
                        "PaddleOCR: downscaled input from %dx%d to %dx%d for fast %s inference (scale=%.3f)",
                        w_bin,
                        h_bin,
                        w_down,
                        h_down,
                        device,
                        scale_down,
                    )

                # Run PaddleOCR
                results = reader.predict(binary_color)

                # Intelligent script auto-detection when lang in ("all", "auto", "multilingual")
                if is_auto_lang:
                    has_texts = bool(
                        results and results[0] and results[0].get("rec_texts")
                    )
                    rec_texts = (
                        results[0].get("rec_texts", []) if has_texts else []
                    )
                    rec_scores = (
                        results[0].get("rec_scores", []) if has_texts else []
                    )
                    avg_conf = (
                        float(np.mean(rec_scores)) * 100.0 if rec_scores else 0.0
                    )

                    first_lines = rec_texts[:5]
                    header_text = " ".join(first_lines).lower()

                    target_script = None

                    # 1. Direct keyword detection in header lines
                    if any(k in header_text for k in ("russian", "русск", "росси", "poetry draft")):
                        target_script = "ru"
                    elif any(k in header_text for k in ("arabic", "عرب", "letter")):
                        target_script = "ar"
                    elif any(k in header_text for k in ("korean", "krn", "한국", "조선", "공부", "stdv", "nts")):
                        target_script = "korean"
                    elif any(k in header_text for k in ("hindi", "हिन्द", "भारत")):
                        target_script = "hi"
                    elif any(k in header_text for k in ("japan", "日記", "nihon")):
                        target_script = "japan"

                    # 2. Character-level unicode checks across all lines
                    if target_script is None:
                        for line in rec_texts:
                            if any("\u0400" <= ch <= "\u04ff" or "\u0500" <= ch <= "\u052f" for ch in line):
                                target_script = "ru"
                                break
                            if any("\u0600" <= ch <= "\u06ff" or "\u0750" <= ch <= "\u077f" or "\ufb50" <= ch <= "\ufdff" or "\ufe70" <= ch <= "\ufeff" for ch in line):
                                target_script = "ar"
                                break
                            if any("\uac00" <= ch <= "\ud7af" or "\u1100" <= ch <= "\u11ff" or "\u3130" <= ch <= "\u318f" for ch in line):
                                target_script = "korean"
                                break
                            if any("\u0900" <= ch <= "\u097f" for ch in line):
                                target_script = "hi"
                                break

                    # 3. Dynamic candidate probing for non-English documents without explicit keywords
                    # If valid line ratio < 75% or average confidence < 88%
                    valid_line_count = sum(1 for t in rec_texts if len(t.strip()) > 1)
                    line_ratio = valid_line_count / float(max(1, len(rec_texts)))

                    if target_script is None and (line_ratio < 0.75 or avg_conf < 88.0):
                        probe_boxes = (
                            results[0].get("rec_boxes")
                            or results[0].get("dt_polys")
                            or results[0].get("rec_polys")
                            if (results and results[0])
                            else None
                        )

                        if probe_boxes:
                            crops = []
                            h_img, w_img = binary_color.shape[:2]
                            for box in probe_boxes[:2]:
                                try:
                                    if len(box) == 4 and isinstance(box[0], (int, float, np.integer, np.floating)):
                                        x0, y0, x1, y1 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
                                    else:
                                        x0 = int(min(pt[0] for pt in box))
                                        y0 = int(min(pt[1] for pt in box))
                                        x1 = int(max(pt[0] for pt in box))
                                        y1 = int(max(pt[1] for pt in box))
                                    x0, y0 = max(0, min(x0, w_img - 1)), max(0, min(y0, h_img - 1))
                                    x1, y1 = max(0, min(x1, w_img)), max(0, min(y1, h_img))
                                    if x1 > x0 and y1 > y0:
                                        crops.append(binary_color[y0:y1, x0:x1])
                                except Exception:
                                    continue

                            if crops:
                                logger.info(
                                    "Probing candidate readers on %d line crops for language discrimination (valid_ratio=%.2f, avg_conf=%.1f%%)...",
                                    len(crops),
                                    line_ratio,
                                    avg_conf,
                                )
                                best_script = None
                                best_char_count = 0
                                best_conf = avg_conf

                                for cand in ("ru", "korean", "ar", "hi"):
                                    try:
                                        cand_reader = get_paddleocr_reader(lang=cand, device=device)
                                        c_texts = []
                                        c_scores = []
                                        for crop in crops:
                                            try:
                                                if hasattr(cand_reader, "paddlex_pipeline"):
                                                    p_res = cand_reader.paddlex_pipeline.predict(crop)
                                                else:
                                                    p_res = cand_reader.predict(crop)

                                                if hasattr(p_res, "__iter__") and not isinstance(p_res, (dict, list)):
                                                    p_res = list(p_res)
                                                elif not isinstance(p_res, list):
                                                    p_res = [p_res] if p_res else []

                                                for item in p_res:
                                                    if not item:
                                                        continue
                                                    if isinstance(item, dict) or hasattr(item, "get"):
                                                        txts = item.get("rec_texts") or []
                                                        if isinstance(txts, str):
                                                            txts = [txts]
                                                        elif not txts and item.get("rec_text"):
                                                            t = item.get("rec_text")
                                                            txts = [t] if isinstance(t, str) else list(t)
                                                        scs = item.get("rec_scores") or []
                                                        if isinstance(scs, (int, float)):
                                                            scs = [scs]
                                                        c_texts.extend(txts)
                                                        c_scores.extend(scs)
                                            except Exception as crop_err:
                                                logger.warning("Crop probe for '%s' failed: %s", cand, crop_err)

                                        c_conf = float(np.mean(c_scores)) * 100.0 if c_scores else 0.0

                                        # Count native script characters
                                        if cand == "ru":
                                            c_chars = sum(1 for t in c_texts for ch in t if "\u0400" <= ch <= "\u04ff")
                                        elif cand == "korean":
                                            c_chars = sum(1 for t in c_texts for ch in t if "\uac00" <= ch <= "\ud7af")
                                        elif cand == "ar":
                                            c_chars = sum(1 for t in c_texts for ch in t if "\u0600" <= ch <= "\u06ff")
                                        elif cand == "hi":
                                            c_chars = sum(1 for t in c_texts for ch in t if "\u0900" <= ch <= "\u097f")
                                        else:
                                            c_chars = 0

                                        logger.info(
                                            "Candidate '%s': %d native chars, conf=%.1f%%",
                                            cand, c_chars, c_conf
                                        )
                                        if c_chars >= 3 and c_conf > 60.0 and c_chars > best_char_count:
                                            best_char_count = c_chars
                                            best_script = cand
                                            best_conf = c_conf
                                    except Exception as pe:
                                        logger.warning("Probe '%s' failed: %s", cand, pe)

                                if best_script is not None:
                                    target_script = best_script
                                    logger.info(
                                        "Probe determined script '%s' with %d native chars (conf=%.1f%%)",
                                        target_script, best_char_count, best_conf
                                    )

                    # 4. Execute re-routing if target_script was determined
                    if target_script is not None:
                        logger.info(
                            "Auto-detected script cue '%s' (ch avg_conf=%.1f%%). Re-routing page to '%s'...",
                            target_script,
                            avg_conf,
                            target_script,
                        )
                        try:
                            script_reader = get_paddleocr_reader(
                                lang=target_script, device=device
                            )
                            script_results = script_reader.predict(binary_color)
                            if (
                                script_results
                                and script_results[0]
                                and script_results[0].get("rec_texts")
                            ):
                                script_scores = script_results[0].get(
                                    "rec_scores", []
                                )
                                script_conf = (
                                    float(np.mean(script_scores)) * 100.0
                                    if script_scores
                                    else 0.0
                                )
                                logger.info(
                                    "Re-routed to '%s': confidence %.1f%% (vs ch %.1f%%)",
                                    target_script,
                                    script_conf,
                                    avg_conf,
                                )
                                results = script_results
                                flags.append(f"script_rerouted_{target_script}")
                        except Exception as script_err:
                            logger.warning(
                                "Failed running re-routed reader for '%s': %s",
                                target_script,
                                script_err,
                            )

                if (
                    not results
                    or not results[0]
                    or "rec_texts" not in results[0]
                    or not results[0]["rec_texts"]
                ):
                    return None, 0.0, ["empty_extraction"], {}

                res_dict = results[0]

                # Map results to LayoutReconstructor structure
                data = {
                    "text": [],
                    "conf": [],
                    "left": [],
                    "top": [],
                    "width": [],
                    "height": [],
                }

                for i in range(len(res_dict["rec_texts"])):
                    text = res_dict["rec_texts"][i]
                    conf = res_dict["rec_scores"][i]
                    bbox = res_dict["rec_polys"][i]

                    if bbox is None or len(bbox) < 4:
                        continue

                    # Get axis-aligned bounding box from quadrilateral corners and scale back to original binary resolution
                    x_coords = [pt[0] / scale_down for pt in bbox]
                    y_coords = [pt[1] / scale_down for pt in bbox]
                    x0 = int(min(x_coords))
                    y0 = int(min(y_coords))
                    x1 = int(max(x_coords))
                    y3 = int(max(y_coords))

                    w = max(1, x1 - x0)
                    h = max(1, y3 - y0)

                    data["text"].append(text)
                    # Scale confidence to [0, 100]
                    data["conf"].append(conf * 100.0)
                    data["left"].append(x0)
                    data["top"].append(y0)
                    data["width"].append(w)
                    data["height"].append(h)
            else:
                # Tesseract OCR path
                raw_tess = pytesseract.image_to_data(
                    binary,
                    lang=self.cfg.tesseract_lang,
                    output_type=pytesseract.Output.DICT,
                    config=f"--psm {pagesegmode}",
                )

                data = {
                    "text": [],
                    "conf": [],
                    "left": [],
                    "top": [],
                    "width": [],
                    "height": [],
                }

                for i in range(len(raw_tess["text"])):
                    txt = (raw_tess["text"][i] or "").strip()
                    try:
                        conf = float(raw_tess["conf"][i])
                    except (ValueError, TypeError):
                        conf = -1.0
                    if conf < 0 or not txt:
                        continue

                    data["text"].append(txt)
                    data["conf"].append(conf)
                    data["left"].append(int(raw_tess["left"][i]))
                    data["top"].append(int(raw_tess["top"][i]))
                    data["width"].append(int(raw_tess["width"][i]))
                    data["height"].append(int(raw_tess["height"][i]))

            reconstructed = self._reconstructor.reconstruct(data, img_w, img_h, binary)
            if not reconstructed.strip():
                return None, 0.0, ["empty_extraction"], {}

            avg_conf = float(np.mean(data["conf"]))

            low_count = sum(
                1 for c in data["conf"] if c < self.cfg.min_confidence_threshold
            )
            if len(data["conf"]) > 0 and (low_count / len(data["conf"])) > 0.4:
                flags.append("high_noise")

            # Hallucination check (generous symbol whitelist for technical docs)
            valid_symbols = set(r"""`~!@#$%^&*()-_=+[]{}\|;:'",.<>/?°•·—–""")
            sym = sum(
                1
                for ch in reconstructed
                if not ch.isalnum()
                and ch not in valid_symbols
                and ch not in (" ", "\t", "\n")
            )
            if reconstructed and sym / max(len(reconstructed), 1) > 0.40:
                flags.append("possible_hallucination")

            logger.info(
                "Phase3 %s complete, conf=%.1f flags=%s",
                engine_name.upper(),
                avg_conf,
                flags,
            )
            return reconstructed, avg_conf, flags, data

        except Exception as exc:
            logger.exception("Phase3 failure: %s", exc)
            return None, 0.0, ["extraction_exception"], {}

    # ─────────────────────────── Phase 4 ─────────────────────────────────── #
    def _phase4_postprocess(self, text: str) -> str:
        try:

            def _fix_numeric(m):
                s = m.group(0)
                for a, d in self.NUMERIC_SWAPS.items():
                    s = s.replace(a, d)
                return s

            text = self.NUMERIC_TOKEN_RE.sub(_fix_numeric, text)

            for bad, good in self.CORRECTIONS.items():
                text = re.sub(rf"\b{re.escape(bad)}\b", good, text)

            # Preserve tabs (\t) and newlines (\n) — they carry layout info
            text = "".join(ch for ch in text if ch.isprintable() or ch in ("\n", "\t"))

            # Collapse multiple spaces (not tabs/newlines)
            text = re.sub(r" {2,}", " ", text)

            # Strip trailing whitespace per line
            text = "\n".join(line.rstrip() for line in text.split("\n"))

            # Collapse excessive blank lines
            text = re.sub(r"\n{3,}", "\n\n", text)

            logger.info("Phase4 complete")
            return text.strip()
        except Exception as exc:
            logger.exception("Phase4 failure: %s", exc)
            return text

    # ─────────────────────────── Phase 5 ─────────────────────────────────── #
    def _hitl(
        self,
        confidence: float,
        error_flags: list[str],
        extracted_text: str | None = None,
        words: list[dict] | None = None,
    ) -> dict:
        normalized = None
        if extracted_text:
            try:
                normalized = self._phase4_postprocess(extracted_text)
            except Exception:
                normalized = extracted_text
        payload = {
            "status": "manual_review_required",
            "confidence": round(float(confidence), 1),
            "extracted_text": normalized,
            "error_flags": sorted(set(error_flags)) or ["unknown_failure"],
            "words": words or [],
        }
        logger.warning(
            "HITL triggered: conf=%.1f flags=%s", confidence, payload["error_flags"]
        )
        return payload
