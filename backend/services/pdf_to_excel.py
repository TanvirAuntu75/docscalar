"""
Smart PDF-to-Excel Structural Parser Engine
=============================================
A six-phase pipeline that produces clean, titled, professionally formatted
Excel workbooks from any PDF — no AI required.

Pipeline:
  Phase 1: Page Scanner      — Extract all raw elements (chars, words, tables, rects, lines, images)
  Phase 2: Content Classifier — Classify text into headers, captions, footnotes, body
  Phase 3: Structural Analyzer — Build document tree (sections → table groups)
  Phase 4: Cross-Page Stitcher — Detect & merge continuation tables across page boundaries
  Phase 5: Data Normalizer    — Type every cell (int, float, currency, %, date, boolean, string)
  Phase 6: Excel Renderer     — Professional formatting, Index sheet, auto-fit, freeze panes
"""

import pdfplumber
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf
from backend import config
from pathlib import Path
from dataclasses import dataclass, field
from collections import Counter
import re
import gc
import unicodedata
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# Constants
# ============================================================================

# Excel hard limits
EXCEL_FORBIDDEN_CHARS = ['\\', '/', '*', '?', ':', '[', ']']
MAX_SHEET_NAME_LEN = 31
MAX_EXCEL_ROWS = 1_048_576
MAX_EXCEL_COLS = 16_384

# Column width bounds (Excel character units)
MAX_COL_WIDTH = 50
MIN_COL_WIDTH = 8

# Header detection thresholds
HEADER_FONT_RATIO = 1.15      # Section header ≥ 1.15× median body font
SUBHEADER_FONT_RATIO = 1.1    # Sub-header ≥ 1.1× median body font
PAGE_MARGIN_ZONE = 40         # pts from top/bottom for repeating header/footer detection
TABLE_CAPTION_GAP = 45        # max pts gap between caption text and table top

# Cross-page stitching thresholds
CONTINUATION_COL_WIDTH_TOL = 0.15  # 15% column-width-ratio tolerance
HEADER_MATCH_THRESHOLD = 0.8      # 80% cell match = repeated header
MAX_PAGE_GAP = 5                   # Max intervening noise pages allowed for continuation

# Excel styling
HEADER_FILL_COLOR = "4472C4"
HEADER_FONT_COLOR = "FFFFFF"
ALT_ROW_FILL_COLOR = "F2F2F2"
SECTION_TITLE_SIZE = 14
TABLE_HEADER_SIZE = 11
DATA_CELL_SIZE = 10
INDEX_TITLE_COLOR = "1F4E79"
HEADER_BORDER_COLOR = "2F5496"
CELL_BORDER_COLOR = "D9D9D9"

# Regex for cleaning math artifacts from header text
MATH_ARTIFACTS_RE = re.compile(
    r'[∫∑∏∂∆∇√∞≈≠≤≥±×÷]|'   # math symbols
    r'\bd[xyz]\b\.?|'           # differentials like dx, dy
    r'\bf\s*\(\s*x\s*\)\s*=',  # f(x) = ...
    re.UNICODE
)

# Fallback table settings for borderless tables (text-alignment strategy)
TEXT_TABLE_SETTINGS = {
    "vertical_strategy": "text",
    "horizontal_strategy": "text",
    "min_words_vertical": 3,
    "min_words_horizontal": 1,
    "snap_tolerance": 5,
    "join_tolerance": 5,
    "text_tolerance": 3,
}


# ============================================================================
# Data Structures
# ============================================================================

@dataclass
class PageScan:
    """Phase 1 output: raw elements from a single page."""
    page_num: int             # 1-indexed
    width: float
    height: float
    chars: list               # pdfplumber char dicts
    words: list               # pdfplumber word dicts (with fontname, size)
    tables: list              # list of TableExtract dicts
    rects: list               # pdfplumber rect dicts
    lines: list               # pdfplumber line dicts
    images: list              # pdfplumber image dicts
    is_blank: bool = False
    is_image_only: bool = False
    is_landscape: bool = False


@dataclass
class ClassifiedContent:
    """Phase 2 output: classified text elements for a page."""
    page_num: int
    section_headers: list     # [(text, y_position, font_size)]
    sub_headers: list         # [(text, y_position, font_size)]
    captions: list            # [(text, y_position, associated_table_idx)]
    footnotes: list           # [(text, y_position)]
    tables: list              # same table dicts from PageScan
    median_body_size: float
    body_fontname: str


@dataclass
class TableGroup:
    """A single logical table — may span multiple PDF pages."""
    title: str | None = None
    header_row: list = field(default_factory=list)
    data_rows: list = field(default_factory=list)   # list[list[str|None]]
    col_widths: list = field(default_factory=list)   # PDF-point widths per column
    source_pages: list = field(default_factory=list)
    col_count: int = 0


@dataclass
class Section:
    """A logical section of the document."""
    title: str = ""
    subtitle: str | None = None
    tables: list = field(default_factory=list)       # list[TableGroup]
    page_range: tuple = (0, 0)                       # (first_page, last_page)


@dataclass
class DocumentStructure:
    """The complete parsed document."""
    sections: list = field(default_factory=list)      # list[Section]
    orphan_tables: list = field(default_factory=list)  # list[TableGroup]
    metadata: dict = field(default_factory=dict)
    stats: dict = field(default_factory=dict)


# ============================================================================
# Phase 1: Page Scanner
# ============================================================================

class PageScanner:
    """Extracts all raw elements from each PDF page."""

    @staticmethod
    def scan_page(page) -> PageScan:
        """Harvest every element from a single page without any analysis."""
        page_num = page.page_number  # 1-indexed by pdfplumber
        width = float(page.width)
        height = float(page.height)

        chars = page.chars
        images = page.images

        is_blank = len(chars) == 0 and len(images) == 0
        is_image_only = len(chars) == 0 and len(images) > 0
        is_landscape = width > height

        if is_blank or is_image_only:
            return PageScan(
                page_num=page_num, width=width, height=height,
                chars=[], words=[], tables=[], rects=[], lines=[], images=images,
                is_blank=is_blank, is_image_only=is_image_only,
                is_landscape=is_landscape,
            )

        # Words with font metadata (critical for header detection)
        words = page.extract_words(
            keep_blank_chars=False,
            x_tolerance=3, y_tolerance=3,
            extra_attrs=["fontname", "size"],
        )

        # Tables — with fallback strategy chain
        tables_data = PageScanner._extract_tables_with_fallback(page)

        return PageScan(
            page_num=page_num, width=width, height=height,
            chars=chars, words=words, tables=tables_data,
            rects=page.rects, lines=page.lines, images=images,
            is_blank=False, is_image_only=False,
            is_landscape=is_landscape,
        )

    # ------------------------------------------------------------------
    # Fallback strategy chain for table extraction
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_tables_with_fallback(page) -> list:
        """
        4-strategy cascade for maximum table extraction coverage.

        S1: Default pdfplumber (line-based) — handles bordered tables.
        S2: Cropped Hybrid on each 1-col table bbox — rescues borderless tables
            whose horizontal separators ARE lines but vertical are whitespace.
            Crops the bbox region, applies vertical=text/horizontal=lines.
            Then uses word-projection to reconstruct the header row above the
            first horizontal line.
        S3: Full page text-strategy — last resort for completely borderless.
        S4: Return the 1-col garbage from S1 (better than nothing).
        """
        found = page.find_tables()

        # S1: all tables have >=2 cols → return immediately
        if found and all(len((t.extract() or [[]])[0]) > 1 for t in found):
            return PageScanner._package_tables(found)

        # S2: some tables are single-col — try cropped hybrid per table
        rescued = []
        skip_s3 = False
        if found:
            any_rescued = False
            for t in found:
                rows = t.extract() or []
                if rows and len(rows[0]) > 1:
                    # Already multi-col — keep as-is
                    rescued.append(t)
                    any_rescued = True
                    continue

                # Single-col table: try vertical=text, horizontal=lines on crop
                bbox = t.bbox   # (x0, top, x1, bottom)
                # Expand vertically to capture header text above first line
                crop_top = max(0, bbox[1] - 30)
                crop_bottom = min(page.height, bbox[3] + 5)
                cropped = page.crop((0, crop_top, page.width, crop_bottom))

                # Try lines-based rows, text-based columns
                t_hyb = cropped.find_tables(table_settings={
                    "vertical_strategy": "text",
                    "horizontal_strategy": "lines",
                    "snap_tolerance": 5,
                    "join_tolerance": 5,
                })
                if t_hyb and len((t_hyb[0].extract() or [[]])[0]) > 1:
                    # Get col x-ranges from hybrid cell boundaries
                    hyb_rows = t_hyb[0].extract()
                    xs_set = set()
                    for cell in t_hyb[0].cells:
                        xs_set.add(cell[0])
                        xs_set.add(cell[2])
                    xs = sorted(xs_set)
                    col_x_ranges = [(xs[i], xs[i+1]) for i in range(len(xs)-1)]

                    # Find words above the table that form the header row.
                    # pdfplumber preserves original page coords even after crop(),
                    # so t_hyb[0].bbox[1] is already in original page y-coords.
                    hyb_table_top = t_hyb[0].bbox[1]
                    original_header_bottom = hyb_table_top   # top of first data row
                    original_header_top = crop_top           # = bbox[1] - 30 of S1 table

                    words = page.extract_words()
                    header_words = [
                        w for w in words
                        if original_header_top <= w['top'] < original_header_bottom
                    ]

                    if header_words:
                        # ---- Determine column boundaries from header words ----
                        # Group header words by their y-position (line)
                        from collections import defaultdict
                        lines_by_y = defaultdict(list)
                        for w in header_words:
                            y_key = round(w['top'], 0)
                            lines_by_y[y_key].append(w)

                        if lines_by_y:
                            # Use the last line in the header area (closest to table)
                            last_y = max(lines_by_y.keys())
                            hdr_line_words = sorted(lines_by_y[last_y], key=lambda w: w['x0'])

                            # Build column ranges from word positions in the header line
                            # Each word (or group of close words) = one column
                            # Use hybrid col count as target
                            target_cols = len(col_x_ranges)

                            # Cluster words into target_cols groups using x-gaps
                            if len(hdr_line_words) >= target_cols:
                                # Find the largest gaps between words to split columns
                                gaps = []
                                for wi in range(len(hdr_line_words) - 1):
                                    gap = hdr_line_words[wi+1]['x0'] - hdr_line_words[wi]['x1']
                                    gaps.append((gap, wi))
                                # Sort by gap size, pick top (target_cols-1) as column separators
                                split_points = sorted(
                                    sorted(gaps, key=lambda g: -g[0])[:target_cols-1],
                                    key=lambda g: g[1]
                                )
                                col_texts = []
                                start = 0
                                for _, split_idx in split_points:
                                    group = hdr_line_words[start:split_idx+1]
                                    col_texts.append(' '.join(w['text'] for w in group))
                                    start = split_idx + 1
                                col_texts.append(' '.join(w['text'] for w in hdr_line_words[start:]))
                            else:
                                # Fewer words than cols: project onto col_x_ranges
                                col_texts = [''] * target_cols
                                for w in hdr_line_words:
                                    cx = (w['x0'] + w['x1']) / 2
                                    for ci, (x0, x1) in enumerate(col_x_ranges):
                                        if x0 - 8 <= cx <= x1 + 8:
                                            col_texts[ci] = (col_texts[ci] + ' ' + w['text']).strip()
                                            break

                            # Pad/trim to match column count
                            while len(col_texts) < len(col_x_ranges):
                                col_texts.append('')
                            col_texts = col_texts[:len(col_x_ranges)]

                            # Only use if >=2 cols got text
                            if sum(1 for c in col_texts if c) >= 2:
                                hyb_rows = [col_texts] + hyb_rows

                    # Build a fake packaged dict directly
                    col_widths = [x1 - x0 for x0, x1 in col_x_ranges]
                    rescued.append({
                        "bbox": (bbox[0], original_header_top, bbox[2], bbox[3]),
                        "rows": hyb_rows,
                        "col_count": len(col_x_ranges),
                        "col_widths": col_widths,
                        "extracted_title": None,
                        "_pre_packaged": True,
                    })
                    any_rescued = True
                    skip_s3 = True
                else:
                    # Could not rescue — mark for S3
                    rescued.append(None)

            if any_rescued and all(r is not None for r in rescued):
                # Mix of pre-packaged dicts and Table objects
                result = []
                for item in rescued:
                    if isinstance(item, dict):
                        result.append(item)
                    else:
                        result.extend(PageScanner._package_tables([item]))
                return result

        if not skip_s3:
            # S3: full-page text strategy
            found_text = page.find_tables(table_settings=TEXT_TABLE_SETTINGS)
            if found_text:
                valid = [t for t in found_text
                         if len((t.extract() or [[]])[0]) > 1]
                if valid:
                    return PageScanner._package_tables(valid)

        # S4: return whatever S1 found (even 1-col)
        if found:
            return PageScanner._package_tables(found)

        return []

    @staticmethod
    def _package_tables(found_tables) -> list:
        """Convert pdfplumber Table objects into portable dicts."""
        result = []
        for t in found_tables:
            rows_data = t.extract()
            if not rows_data:
                continue
            col_count = len(rows_data[0])

            # Derive column widths from cell x-coordinates
            col_widths = []
            if t.cells:
                xs = sorted(set(c[0] for c in t.cells) | set(c[2] for c in t.cells))
                if len(xs) > 1:
                    col_widths = [xs[i + 1] - xs[i] for i in range(len(xs) - 1)]

            # --- Title-row promotion ---
            # If Row0 looks like a spanning title (1 non-empty cell, rest None/empty)
            # AND Row1 has multiple filled cells → Row0 is a table title, not the header.
            # Promote Row1 as the real header and strip Row0 from data.
            extracted_title = None
            if len(rows_data) >= 2:
                row0 = rows_data[0]
                row1 = rows_data[1]
                non_empty0 = [c for c in row0 if c and str(c).strip()]
                non_empty1 = [c for c in row1 if c and str(c).strip()]
                is_title_row = (
                    len(non_empty0) == 1
                    and len(non_empty1) >= 2
                    and all((c is None or str(c).strip() == '') for c in row0[1:])
                )
                if is_title_row:
                    extracted_title = str(non_empty0[0]).strip()
                    rows_data = rows_data[1:]  # drop title row from rows
                    col_count = len(rows_data[0])

            # --- Merge split header cells (borderless table artefact) ---
            # When two adjacent header cells together form a single column name
            # (e.g. 'Start Date Ba' + 'se Salary') we merge them.
            rows_data = PageScanner._repair_split_headers(rows_data)
            col_count = len(rows_data[0]) if rows_data else col_count

            result.append({
                "bbox": t.bbox,
                "rows": rows_data,
                "col_count": col_count,
                "col_widths": col_widths,
                "extracted_title": extracted_title,
            })
        return result

    @staticmethod
    def _repair_split_headers(rows_data: list) -> list:
        """
        Detect and remove empty alternating rows that text-strategy tables
        often produce (every other row is all-empty blanks between data rows).
        Does NOT merge column values across columns — that is handled by
        word-projection in _extract_tables_with_fallback.
        """
        if not rows_data or len(rows_data) <= 1:
            return rows_data

        # If every odd row (1, 3, 5, ...) is completely empty, strip them
        odd_rows_all_empty = all(
            all(c is None or str(c).strip() == '' for c in rows_data[i])
            for i in range(1, len(rows_data), 2)
        )
        if odd_rows_all_empty and len(rows_data) > 2:
            return [rows_data[i] for i in range(0, len(rows_data), 2)]

        return rows_data


# ============================================================================
# Phase 2: Content Classifier
# ============================================================================

class ContentClassifier:
    """Classifies text elements into structural roles using font/position heuristics."""

    def __init__(self):
        self._repeating_top_texts: set[str] = set()
        self._repeating_bottom_texts: set[str] = set()

    # ------------------------------------------------------------------
    # Pre-scan: detect repeating page headers / footers
    # ------------------------------------------------------------------

    def detect_repeating_zones(self, scans: list[PageScan]):
        """
        Scan all pages to find text that repeats in the top or bottom margin
        zone across 3+ pages. This text is excluded from header analysis.
        """
        top_counter: Counter = Counter()
        bottom_counter: Counter = Counter()
        text_page_count = 0

        for scan in scans:
            if scan.is_blank or scan.is_image_only:
                continue
            text_page_count += 1
            for w in scan.words:
                txt = w["text"].strip()
                if not txt:
                    continue
                if w["top"] < PAGE_MARGIN_ZONE:
                    top_counter[txt] += 1
                elif w["top"] > scan.height - PAGE_MARGIN_ZONE:
                    bottom_counter[txt] += 1

        threshold = min(3, max(2, text_page_count // 10))
        self._repeating_top_texts = {t for t, c in top_counter.items() if c >= threshold}
        self._repeating_bottom_texts = {t for t, c in bottom_counter.items() if c >= threshold}

    # ------------------------------------------------------------------
    # Per-page classification
    # ------------------------------------------------------------------

    def classify_page(self, scan: PageScan) -> ClassifiedContent:
        """Classify every text element on one page."""
        if scan.is_blank or scan.is_image_only:
            return ClassifiedContent(
                page_num=scan.page_num,
                section_headers=[], sub_headers=[], captions=[],
                footnotes=[], tables=scan.tables,
                median_body_size=0.0, body_fontname="",
            )

        median_size, body_font = self._font_stats(scan.chars)

        # Vertical extents of tables on this page
        first_table_top = None
        last_table_bottom = None
        if scan.tables:
            first_table_top = min(t["bbox"][1] for t in scan.tables)
            last_table_bottom = max(t["bbox"][3] for t in scan.tables)

        section_headers = []
        sub_headers = []
        captions = []
        footnotes = []

        # Group words into visual text lines
        text_lines = self._group_into_lines(scan.words)

        for line_words, line_top, line_text in text_lines:
            stripped = line_text.strip()

            # Skip repeating headers / footers
            if stripped in self._repeating_top_texts or stripped in self._repeating_bottom_texts:
                continue

            # Skip text that sits inside a table bounding box
            if self._inside_any_table(line_top, scan.tables):
                continue

            # Compute line properties
            is_bold = any(
                "Bold" in w.get("fontname", "") or "bold" in w.get("fontname", "").lower()
                for w in line_words
            )
            max_font = max((w.get("size", 0) for w in line_words), default=0)
            is_above_table = first_table_top is not None and line_top < first_table_top
            is_below_table = last_table_bottom is not None and line_top > last_table_bottom

            # Classification logic
            if is_bold and max_font >= median_size * HEADER_FONT_RATIO and is_above_table:
                # Add word and character limit to avoid matching prose paragraphs
                if len(stripped.split()) <= 12 and len(stripped) <= 80:
                    clean = self._clean_header(line_text)
                    if clean:
                        section_headers.append((clean, line_top, max_font))

            elif is_bold and max_font >= median_size * SUBHEADER_FONT_RATIO and is_above_table:
                if len(stripped.split()) <= 12 and len(stripped) <= 80:
                    clean = self._clean_header(line_text)
                    if clean:
                        sub_headers.append((clean, line_top, max_font))

            elif is_above_table and not is_bold and len(stripped.split()) <= 20:
                if first_table_top and (first_table_top - line_top) < TABLE_CAPTION_GAP:
                    captions.append((stripped, line_top, 0))

            elif is_below_table and max_font < median_size:
                footnotes.append((stripped, line_top))

        return ClassifiedContent(
            page_num=scan.page_num,
            section_headers=section_headers,
            sub_headers=sub_headers,
            captions=captions,
            footnotes=footnotes,
            tables=scan.tables,
            median_body_size=median_size,
            body_fontname=body_font,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _font_stats(chars: list) -> tuple[float, str]:
        """Return (median_font_size, most_common_fontname) from character list."""
        if not chars:
            return (10.0, "")
        sizes = sorted(c.get("size", 10) for c in chars if c.get("size", 0) > 5)
        fonts = Counter(c.get("fontname", "") for c in chars)
        median = sizes[len(sizes) // 2] if sizes else 10.0
        body_font = fonts.most_common(1)[0][0] if fonts else ""
        return (median, body_font)

    @staticmethod
    def _group_into_lines(words: list) -> list[tuple[list, float, str]]:
        """
        Group words into visual text lines.
        Returns [(line_words, line_top, joined_text), ...].
        """
        if not words:
            return []
        sorted_w = sorted(words, key=lambda w: (w["top"], w["x0"]))
        lines = []
        cur_words = [sorted_w[0]]
        cur_top = sorted_w[0]["top"]

        for w in sorted_w[1:]:
            if abs(w["top"] - cur_top) <= 3:
                cur_words.append(w)
            else:
                lines.append((cur_words, cur_top, " ".join(c["text"] for c in cur_words)))
                cur_words = [w]
                cur_top = w["top"]
        lines.append((cur_words, cur_top, " ".join(c["text"] for c in cur_words)))
        return lines

    @staticmethod
    def _inside_any_table(y: float, tables: list) -> bool:
        """True if y falls inside any table's vertical extent."""
        return any(t["bbox"][1] <= y <= t["bbox"][3] for t in tables)

    @staticmethod
    def _clean_header(text: str) -> str:
        """Strip math artifacts, excess whitespace, trailing punctuation from header text."""
        cleaned = MATH_ARTIFACTS_RE.sub('', text)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        cleaned = cleaned.rstrip('. ')
        return cleaned


# ============================================================================
# Phase 3: Structural Analyzer
# ============================================================================

class StructuralAnalyzer:
    """Builds the document's logical section → table-group tree."""

    @staticmethod
    def analyze(classified_pages: list[ClassifiedContent], metadata: dict) -> DocumentStructure:
        doc = DocumentStructure(metadata=metadata)
        current_section: Section | None = None

        for page in classified_pages:
            has_tables = bool(page.tables)
            has_header = bool(page.section_headers)

            # --- new section header detected ---
            if has_header:
                # close previous section
                if current_section is not None:
                    current_section.page_range = (
                        current_section.page_range[0],
                        page.page_num - 1,
                    )
                    doc.sections.append(current_section)

                header_text = page.section_headers[0][0]
                current_section = Section(
                    title=header_text,
                    page_range=(page.page_num, page.page_num),
                )
                if page.sub_headers:
                    current_section.subtitle = page.sub_headers[0][0]

            # --- process tables on this page ---
            if has_tables:
                for i, tdata in enumerate(page.tables):
                    rows = tdata["rows"]
                    if not rows:
                        continue

                    tg = TableGroup(
                        header_row=rows[0],
                        data_rows=rows[1:] if len(rows) > 1 else [],
                        col_widths=tdata.get("col_widths", []),
                        source_pages=[page.page_num],
                        col_count=tdata["col_count"],
                    )

                    # Use the title promoted by _package_tables (title-row pattern)
                    if tdata.get("extracted_title"):
                        tg.title = tdata["extracted_title"]

                    # Only assign a caption as table title when there is
                    # exactly one table on the page, the caption is very short
                    # (<=6 words, >=2 words), and does NOT end with a period
                    # (sentence fragments like 'output should be usable.' are excluded).
                    elif len(page.tables) == 1 and i < len(page.captions):
                        cap_text = page.captions[i][0]
                        words_in_cap = cap_text.split()
                        is_sentence_fragment = cap_text.rstrip().endswith('.')
                        if 2 <= len(words_in_cap) <= 6 and not is_sentence_fragment:
                            tg.title = cap_text

                    if current_section is not None:
                        current_section.tables.append(tg)
                    else:
                        doc.orphan_tables.append(tg)

        # close final section
        if current_section is not None:
            last_page = classified_pages[-1].page_num if classified_pages else current_section.page_range[0]
            current_section.page_range = (current_section.page_range[0], last_page)
            doc.sections.append(current_section)

        # statistics
        total_tg = sum(len(s.tables) for s in doc.sections) + len(doc.orphan_tables)
        doc.stats = {
            "total_sections": len(doc.sections),
            "total_orphan_tables": len(doc.orphan_tables),
            "total_table_groups": total_tg,
            "total_classified_pages": len(classified_pages),
        }
        return doc


# ============================================================================
# Phase 4: Cross-Page Stitcher
# ============================================================================

class CrossPageStitcher:
    """Detects and merges continuation tables across page boundaries."""

    @staticmethod
    def stitch(doc: DocumentStructure) -> DocumentStructure:
        for section in doc.sections:
            section.tables = CrossPageStitcher._merge_continuations(section.tables)
        doc.orphan_tables = CrossPageStitcher._merge_continuations(doc.orphan_tables)

        # Update stats
        total_tg = sum(len(s.tables) for s in doc.sections) + len(doc.orphan_tables)
        doc.stats["total_table_groups_after_stitch"] = total_tg
        return doc

    @staticmethod
    def _merge_continuations(tables: list[TableGroup]) -> list[TableGroup]:
        if len(tables) <= 1:
            return tables

        merged = [tables[0]]
        for i in range(1, len(tables)):
            curr = tables[i]
            prev = merged[-1]

            if CrossPageStitcher._is_continuation(prev, curr):
                # Determine which rows to append
                rows_to_add = curr.data_rows
                if curr.header_row and CrossPageStitcher._is_repeated_header(
                    prev.header_row, curr.header_row
                ):
                    pass  # header is a repeat — only add data rows
                else:
                    # "header" is actually data in a continuation
                    if curr.header_row:
                        rows_to_add = [curr.header_row] + rows_to_add

                prev.data_rows.extend(rows_to_add)
                prev.source_pages.extend(curr.source_pages)
            else:
                merged.append(curr)
        return merged

    @staticmethod
    def _is_continuation(prev: TableGroup, curr: TableGroup) -> bool:
        """Heuristic: is curr a continuation of prev?"""
        # Column count must match exactly for continuation tables
        if prev.col_count != curr.col_count:
            return False

        # Column width ratios must be similar
        if prev.col_widths and curr.col_widths and len(prev.col_widths) == len(curr.col_widths):
            total_p = sum(prev.col_widths) or 1
            total_c = sum(curr.col_widths) or 1
            for wp, wc in zip(prev.col_widths, curr.col_widths):
                if abs(wp / total_p - wc / total_c) > CONTINUATION_COL_WIDTH_TOL:
                    return False

        # Pages must be reasonably close and consecutive (gap >= 1 to prevent same-page merging)
        if curr.source_pages and prev.source_pages:
            gap = curr.source_pages[0] - prev.source_pages[-1]
            if gap < 1 or gap > MAX_PAGE_GAP:
                return False

        return True

    @staticmethod
    def _is_repeated_header(original: list, candidate: list) -> bool:
        if not original or not candidate:
            return False
        min_len = min(len(original), len(candidate))
        if min_len == 0:
            return False
        matches = sum(
            1 for a, b in zip(original, candidate)
            if CrossPageStitcher._norm(a) == CrossPageStitcher._norm(b)
        )
        return (matches / min_len) >= HEADER_MATCH_THRESHOLD

    @staticmethod
    def _norm(val) -> str:
        if val is None:
            return ""
        return re.sub(r'\s+', ' ', str(val).lower().strip())


# ============================================================================
# Phase 5: Data Normalizer
# ============================================================================

class DataNormalizer:
    """Parses and types every cell value for proper Excel formatting."""

    # Pre-compiled patterns (class-level for performance)
    _RE_PCT = re.compile(r'^([+-]?\d+\.?\d*)\s*%$')
    _RE_CURRENCY = re.compile(
        r'^([£$€¥₹₽¢])\s*([+-]?\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d+)?)\s*$|'
        r'^([+-]?\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d+)?)\s*([£$€¥₹₽¢])\s*$'
    )
    _RE_SCI = re.compile(r'^[+-]?\d+\.?\d*[eE][+-]?\d+$')
    _RE_INT_COMMA = re.compile(r'^[+-]?\d{1,3}(?:,\d{3})*$')
    _RE_FLOAT_COMMA = re.compile(r'^[+-]?\d{1,3}(?:,\d{3})*\.\d+$')
    _DATE_PATS = [
        re.compile(r'^\d{4}-\d{2}-\d{2}$'),                                                   # 2024-01-15
        re.compile(r'^\d{2}/\d{2}/\d{4}$'),                                                    # 01/15/2024
        re.compile(r'^\d{2}-\d{2}-\d{4}$'),                                                    # 01-15-2024
        re.compile(r'^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}$', re.I),
        re.compile(r'^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}$', re.I),
    ]

    @staticmethod
    def normalize_cell(raw) -> tuple:
        """
        Detect and convert a raw cell value to its typed form.
        Returns (typed_value, format_type_string).

        Type cascade (order matters — first match wins):
          1. None/empty  → (None, "empty")
          2. Boolean      → (True/False, "boolean")
          3. Percentage   → (0.45, "percentage")
          4. Currency     → (1234.56, "currency_$")
          5. Date         → (datetime, "date")
          6. Scientific   → (1.23e10, "scientific")
          7. Integer      → (1234, "integer")
          8. Float        → (12.34, "float")
          9. String       → (cleaned_str, "string")
        """
        if raw is None or str(raw).strip() == "":
            return (None, "empty")

        text = str(raw).strip()

        # 1. Boolean
        low = text.lower()
        if low in ("true", "yes", "✓", "✔", "☑"):
            return (True, "boolean")
        if low in ("false", "no", "✗", "✘", "☐"):
            return (False, "boolean")

        # 2. Percentage
        m = DataNormalizer._RE_PCT.match(text)
        if m:
            return (float(m.group(1)) / 100, "percentage")

        # 3. Currency
        m = DataNormalizer._RE_CURRENCY.match(text)
        if m:
            g = m.groups()
            symbol = g[0] or g[3]
            num_str = re.sub(r'[,\s]', '', g[1] or g[2])
            try:
                return (float(num_str), f"currency_{symbol}")
            except ValueError:
                pass

        # 4. Date
        for pat in DataNormalizer._DATE_PATS:
            if pat.match(text):
                try:
                    from dateutil.parser import parse as _dp
                    return (_dp(text), "date")
                except Exception:
                    pass
                break

        # 5. Scientific notation
        if DataNormalizer._RE_SCI.match(text):
            try:
                return (float(text), "scientific")
            except ValueError:
                pass

        # 6. Integer (with optional comma grouping)
        if DataNormalizer._RE_INT_COMMA.match(text):
            return (int(text.replace(',', '')), "integer")

        # 7. Float (with optional comma grouping)
        if DataNormalizer._RE_FLOAT_COMMA.match(text):
            return (float(text.replace(',', '')), "float")

        # 8. Plain number (no grouping separators)
        try:
            if '.' in text:
                return (float(text), "float")
            return (int(text), "integer")
        except ValueError:
            pass

        # 9. String — unicode normalize + strip control chars
        cleaned = unicodedata.normalize('NFKC', text)
        cleaned = ''.join(
            c for c in cleaned
            if not unicodedata.category(c).startswith('C') or c in '\n\t'
        )
        return (cleaned, "string")

    @staticmethod
    def normalize_table(tg: TableGroup) -> tuple[list, list[list[tuple]], dict]:
        """
        Normalize all cells in a TableGroup.
        Returns (norm_header, norm_data_rows, dominant_col_formats).
        """
        # Header
        norm_header = []
        for cell in tg.header_row:
            val, _ = DataNormalizer.normalize_cell(cell)
            norm_header.append(val if val is not None else "")

        # Data rows + column format tracking
        norm_data = []
        col_fmts: dict[int, Counter] = {}

        for row in tg.data_rows:
            norm_row = []
            for ci, cell in enumerate(row):
                val, fmt = DataNormalizer.normalize_cell(cell)
                norm_row.append((val, fmt))
                if fmt not in ("empty", "string"):
                    col_fmts.setdefault(ci, Counter())[fmt] += 1
            norm_data.append(norm_row)

        dominant = {ci: ctr.most_common(1)[0][0] for ci, ctr in col_fmts.items() if ctr}
        return norm_header, norm_data, dominant

    @staticmethod
    def prune_trailing(header: list, data: list[list[tuple]]) -> tuple[list, list]:
        """Remove fully-empty trailing rows and columns. Interior empties are preserved."""
        if not data:
            return header, data

        # Trailing empty rows
        while data and all(cell[0] is None for cell in data[-1]):
            data.pop()

        # Trailing empty columns
        if not data:
            return header, data
        max_cols = max(len(header), *(len(r) for r in data))
        keep = max_cols
        for ci in range(max_cols - 1, -1, -1):
            h_empty = ci >= len(header) or not header[ci]
            d_empty = all(ci >= len(r) or r[ci][0] is None for r in data)
            if h_empty and d_empty:
                keep = ci
            else:
                break

        if keep < max_cols:
            header = header[:keep]
            data = [r[:keep] for r in data]
        return header, data


# ============================================================================
# Phase 6: Excel Renderer
# ============================================================================

class ExcelRenderer:
    """Generates a professionally formatted Excel workbook."""

    def __init__(self):
        self._used_names: set[str] = set()

        # Pre-build style objects (reused across all cells)
        self._font_section = Font(name='Calibri', size=SECTION_TITLE_SIZE, bold=True, color=INDEX_TITLE_COLOR)
        self._font_header = Font(name='Calibri', size=TABLE_HEADER_SIZE, bold=True, color=HEADER_FONT_COLOR)
        self._font_data = Font(name='Calibri', size=DATA_CELL_SIZE)
        self._font_subtitle = Font(name='Calibri', size=11, bold=True, italic=True)
        self._font_index_title = Font(name='Calibri', size=16, bold=True, color=INDEX_TITLE_COLOR)
        self._font_message = Font(name='Calibri', size=12, italic=True, color="888888")

        self._fill_header = PatternFill(start_color=HEADER_FILL_COLOR, end_color=HEADER_FILL_COLOR, fill_type='solid')
        self._fill_alt = PatternFill(start_color=ALT_ROW_FILL_COLOR, end_color=ALT_ROW_FILL_COLOR, fill_type='solid')

        self._border_header = Border(bottom=Side(style='medium', color=HEADER_BORDER_COLOR))
        self._border_cell = Border(bottom=Side(style='thin', color=CELL_BORDER_COLOR))

        self._align_center = Alignment(horizontal='center', vertical='center')
        self._align_right = Alignment(horizontal='right')
        self._align_wrap = Alignment(wrap_text=True)

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def render(self, doc: DocumentStructure, output_path: Path):
        """Render the complete document into a single Excel worksheet."""
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Extracted Data"

        # Keep track of the current row across all sections
        current_row = 1

        # Render sections serially
        for section in doc.sections:
            if not section.tables:
                continue
            written = self._write_section(ws, section, start_row=current_row)
            current_row += written + 3   # 3-row gap between major sections

        # Render orphan tables
        for i, tg in enumerate(doc.orphan_tables):
            label = tg.title or f"Table {i + 1}"
            
            # Write a simple title for the orphan table
            title_cell = ws.cell(row=current_row, column=1, value=label)
            title_cell.font = self._font_section
            current_row += 2
            
            written = self._write_table(ws, tg, start_row=current_row, freeze=False)
            current_row += written + 3

        # Absolute fallback
        if current_row == 1:
            ws['A1'] = "No tables were detected in this PDF document."
            ws['A1'].font = self._font_message
            ws.column_dimensions['A'].width = 50

        wb.save(output_path)

    # ------------------------------------------------------------------
    # Section writer
    # ------------------------------------------------------------------

    def _write_section(self, ws, section: Section, start_row: int) -> int:
        """
        Write a full section to a worksheet starting at start_row.
        Layout:
          Row start_row:  Section title (merged, bold, coloured)
          Row + 2:        [blank spacer]
          Row + 3:        Table title (if any), then header row, then data rows
                          Gap of 2 blank rows between consecutive tables.
        Returns the number of rows written.
        """
        row = start_row

        # --- Section title banner ---
        max_cols = max((tg.col_count for tg in section.tables), default=4)
        merge_width = min(max(max_cols, 2), 16)
        title_cell = ws.cell(row=row, column=1, value=section.title)
        title_cell.font = self._font_section
        if merge_width > 1:
            ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=merge_width)
        row += 2  # blank row after title

        first_table = (start_row == 1) # Only freeze if it's the very first table
        for tg in section.tables:
            # Table sub-title (short extracted title or caption only)
            if tg.title:
                sub = ws.cell(row=row, column=1, value=tg.title)
                sub.font = self._font_subtitle
                if merge_width > 1:
                    ws.merge_cells(start_row=row, start_column=1,
                                   end_row=row, end_column=min(max(tg.col_count, 2), merge_width))
                row += 1

            written = self._write_table(ws, tg, start_row=row, freeze=first_table)
            row += written + 2   # 2-row gap between consecutive tables
            first_table = False

        return row - start_row

    # ------------------------------------------------------------------
    # Table writer (core rendering loop)
    # ------------------------------------------------------------------

    def _write_table(self, ws, tg: TableGroup, start_row: int, freeze: bool = True) -> int:
        """Write a single normalized table. Returns number of rows written."""
        header, data, col_fmts = DataNormalizer.normalize_table(tg)
        header, data = DataNormalizer.prune_trailing(header, data)

        if not header and not data:
            return 0

        col_count = len(header) or (len(data[0]) if data else 0)
        col_widths = [MIN_COL_WIDTH] * col_count   # track for auto-fit
        row = start_row

        # ---- Header row ----
        if header:
            for ci, val in enumerate(header):
                c = ws.cell(row=row, column=ci + 1, value=val)
                c.font = self._font_header
                c.fill = self._fill_header
                c.alignment = self._align_center
                c.border = self._border_header
                if val:
                    col_widths[ci] = max(col_widths[ci], len(str(val)))
            row += 1

        # Freeze panes below header (only for first table in sheet)
        if freeze and header:
            ws.freeze_panes = ws.cell(row=row, column=1)

        # Auto-filter on header
        if header and col_count > 0:
            ws.auto_filter.ref = (
                f"A{start_row}:{get_column_letter(col_count)}{start_row}"
            )

        # ---- Data rows ----
        for di, drow in enumerate(data):
            is_alt = di % 2 == 1
            for ci in range(min(len(drow), col_count)):
                val, fmt = drow[ci]
                c = ws.cell(row=row, column=ci + 1, value=val)
                c.font = self._font_data
                c.border = self._border_cell
                if is_alt:
                    c.fill = self._fill_alt

                # Number formatting
                if fmt == "percentage":
                    c.number_format = '0.00%'
                    c.alignment = self._align_right
                elif fmt.startswith("currency_"):
                    sym = fmt.split("_", 1)[1]
                    c.number_format = {'$': '$#,##0.00', '€': '€#,##0.00',
                                       '£': '£#,##0.00'}.get(sym, '#,##0.00')
                    c.alignment = self._align_right
                elif fmt == "date":
                    c.number_format = 'YYYY-MM-DD'
                    c.alignment = self._align_right
                elif fmt in ("integer", "float", "scientific"):
                    c.number_format = {
                        "integer": '#,##0',
                        "float": '#,##0.00####',
                        "scientific": '0.00E+00',
                    }[fmt]
                    c.alignment = self._align_right
                elif fmt == "string" and val and '\n' in str(val):
                    c.alignment = self._align_wrap

                if val is not None:
                    col_widths[ci] = max(col_widths[ci], min(len(str(val)), MAX_COL_WIDTH))

            row += 1

        # ---- Auto-fit column widths ----
        for ci in range(col_count):
            letter = get_column_letter(ci + 1)
            ws.column_dimensions[letter].width = max(
                min(col_widths[ci] * 1.2 + 2, MAX_COL_WIDTH),
                MIN_COL_WIDTH,
            )

        return row - start_row


# ============================================================================
# Orchestrator
# ============================================================================

class SmartPDFToExcelConverter:
    """Orchestrates the six-phase pipeline."""

    def convert(self, input_path: str) -> ConversionResult:
        try:
            input_file = Path(input_path)
            if not input_file.exists():
                return ConversionResult(success=False, error_message="Input file does not exist")

            validation_err = validate_pdf(str(input_file))
            if validation_err:
                return ConversionResult(success=False, error_message=validation_err)

            output_path = config.OUTPUT_DIR / f"{input_file.stem}.xlsx"

            with pdfplumber.open(input_file) as pdf:
                meta = pdf.metadata or {}
                total = len(pdf.pages)

                # ---- Phase 1: Scan ----
                logger.info("Phase 1/6: Scanning %d pages...", total)
                scans: list[PageScan] = []
                for page in pdf.pages:
                    scans.append(PageScanner.scan_page(page))
                    page.flush_cache()
                gc.collect()

                # ---- Phase 2: Classify ----
                logger.info("Phase 2/6: Classifying content...")
                classifier = ContentClassifier()
                classifier.detect_repeating_zones(scans)

                classified: list[ClassifiedContent] = []
                for scan in scans:
                    if scan.is_blank or scan.is_image_only:
                        continue
                    classified.append(classifier.classify_page(scan))

                del scans  # free memory
                gc.collect()

                # ---- Phase 3: Structure ----
                logger.info("Phase 3/6: Analyzing document structure...")
                doc = StructuralAnalyzer.analyze(classified, meta)

                del classified
                gc.collect()

                # ---- Phase 4: Stitch ----
                logger.info("Phase 4/6: Stitching continuation tables...")
                doc = CrossPageStitcher.stitch(doc)

                # ---- Phase 5 + 6: Normalize & Render ----
                logger.info("Phase 5-6/6: Rendering Excel workbook...")
                renderer = ExcelRenderer()
                renderer.render(doc, output_path)

            gc.collect()

            if not output_path.exists():
                return ConversionResult(
                    success=False,
                    error_message="Conversion completed but output file was not created",
                )

            logger.info("Conversion complete — stats: %s", doc.stats)
            return ConversionResult(
                success=True,
                output_path=str(output_path),
                file_size_bytes=output_path.stat().st_size,
            )

        except Exception as e:
            logger.exception("PDF-to-Excel conversion failed")
            return ConversionResult(success=False, error_message=str(e))


# ============================================================================
# Public API  (unchanged signature — drop-in replacement)
# ============================================================================

def convert_pdf_to_excel(input_path: str) -> ConversionResult:
    """
    Smart structural PDF-to-Excel conversion.

    Extracts tables from a PDF, detects section headers, stitches continuation
    tables across page boundaries, normalises cell data types, and produces a
    professionally formatted Excel workbook with an auto-generated Index sheet.

    This is a drop-in replacement — the function signature is identical to the
    original implementation.
    """
    converter = SmartPDFToExcelConverter()
    return converter.convert(input_path)
