import os
from pathlib import Path
from pdf2docx import Converter
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf
from backend import config

class PipelineConfig:
    """Configuration class for the conversion pipeline."""
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def safe_path_str(path) -> str:
    """
    Safely converts a Path or string to a string, escaping lone surrogate
    characters to prevent UnicodeEncodeError in OS system operations on Windows.
    """
    s = str(path)
    chars = []
    for c in s:
        o = ord(c)
        if 0xD800 <= o <= 0xDFFF:
            chars.append(f"\\u{o:04x}")
        else:
            chars.append(c)
    return "".join(chars)

def make_encsafe(text: str) -> str:
    """
    Sanitizes string text to be safe for console prints and encodings by
    replacing lone surrogate characters with the standard replacement glyph.
    """
    if not isinstance(text, str):
        return text
    chars = []
    for c in text:
        o = ord(c)
        if 0xD800 <= o <= 0xDFFF:
            chars.append("\ufffd")
        else:
            chars.append(c)
    return "".join(chars)

def convert_pdf(pdf_file: str, docx_file: str, start: int = 0, end: int = None, **kwargs):
    """
    Core wrapper executing pdf2docx converter on paths safely.
    """
    cv = Converter(safe_path_str(pdf_file))
    cv.convert(safe_path_str(docx_file), start=start, end=end, **kwargs)
    cv.close()

import zipfile
import shutil

# Use lxml.etree instead of stdlib xml.etree.ElementTree.
# lxml preserves ALL xmlns:* namespace declarations verbatim when writing
# back the XML, preventing "mc:Ignorable references undeclared prefix"
# errors that make Word 2007 refuse to open the file.
try:
    from lxml import etree as ET
    _LXML = True
except ImportError:
    import xml.etree.ElementTree as ET
    _LXML = False

NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

def heal_paragraph_runs(p_node):
    """
    Cleans up invalid nested hyperlinks inside runs and merges split characters
    across sibling runs.
    """
    # 1. Clean up nested hyperlinks inside runs
    runs = list(p_node.findall(f"{{{NS_W}}}r"))
    for r in runs:
        try:
            list(p_node).index(r)
        except ValueError:
            continue
            
        hyperlink = r.find(f"{{{NS_W}}}hyperlink")
        if hyperlink is not None:
            inner_r = hyperlink.find(f"{{{NS_W}}}r")
            if inner_r is not None:
                t_node = inner_r.find(f"{{{NS_W}}}t")
                txt = t_node.text if (t_node is not None and t_node.text) else ""
                is_real_link = any(pattern in txt for pattern in ["http://", "https://", "www.", "@"])
                
                idx = list(p_node).index(r)
                if is_real_link:
                    r.remove(hyperlink)
                    p_node.insert(idx + 1, hyperlink)
                else:
                    r.remove(hyperlink)
                    p_node.insert(idx + 1, inner_r)
                    
            has_t = r.find(f"{{{NS_W}}}t") is not None
            has_drawing = len(r.findall(f".//{{{NS_W}}}drawing")) > 0 or len(r.findall(f".//{{{NS_W}}}pict")) > 0
            if not has_t and not has_drawing:
                try:
                    p_node.remove(r)
                except ValueError:
                    pass

    # 2. Sibling run healing (word merging & space split healing)
    children = list(p_node)
    i = 0
    while i < len(children) - 1:
        c1 = children[i]
        c2 = children[i+1]
        
        r1, t1 = None, None
        if c1.tag == f"{{{NS_W}}}r":
            r1 = c1
            t1 = r1.find(f"{{{NS_W}}}t")
        elif c1.tag == f"{{{NS_W}}}hyperlink":
            r1 = c1.find(f"{{{NS_W}}}r")
            t1 = r1.find(f"{{{NS_W}}}t") if r1 is not None else None
            
        r2, t2 = None, None
        if c2.tag == f"{{{NS_W}}}r":
            r2 = c2
            t2 = r2.find(f"{{{NS_W}}}t")
        elif c2.tag == f"{{{NS_W}}}hyperlink":
            r2 = c2.find(f"{{{NS_W}}}r")
            t2 = r2.find(f"{{{NS_W}}}t") if r2 is not None else None
            
        if t1 is not None and t2 is not None and t1.text and t2.text:
            text1 = t1.text
            text2 = t2.text
            
            # Case A: Split mid-word without space
            if not text1.endswith(" ") and not text2.startswith(" "):
                t1.text = text1 + text2
                try:
                    p_node.remove(c2)
                except ValueError:
                    pass
                children.pop(i+1)
                continue
                
            # Case B: Split word with kerning space (e.g. "Listenin " + "g")
            is_curr_split = len(text1) >= 2 and text1[-1] == ' ' and text1[-2].isalpha()
            common_suffixes = {"g", "h", "y", "i", "s", "t", "d", "ng", "sh", "li", "ly", "ed", "er", "es", "al", "nt"}
            is_next_split_char = len(text2) == 1 and text2.islower()
            is_next_split_suffix = text2 in common_suffixes
            
            if is_curr_split and (is_next_split_char or is_next_split_suffix):
                t1.text = text1[:-1] + text2
                t1.attrib["{http://www.w3.org/XML/1998/namespace}space"] = "preserve"
                try:
                    p_node.remove(c2)
                except ValueError:
                    pass
                children.pop(i+1)
                continue
                
        i += 1

def is_bullet_text(text: str) -> bool:
    """Checks if text contains only bullet or list-indicator characters."""
    text = text.strip()
    if not text:
        return False
    # Avoid alphanumeric letters and standard punctuation like hyphens or asterisks,
    # as these cause normal cells to be incorrectly marked as bullet lists.
    bullet_chars = {"•", "\uf0b7", "▪", "▫", "", "\u2022", "\u2013", "\u2014"}
    if text in bullet_chars:
        return True
    for c in text:
        if c not in bullet_chars and not c.isspace():
            return False
    return True

def is_cell_empty(cell_node) -> bool:
    """Checks if a cell element has no text run characters and no embedded drawings/shapes."""
    texts = cell_node.findall(f".//{{{NS_W}}}t")
    for t in texts:
        if t.text and t.text.strip():
            return False
            
    drawings = cell_node.findall(f".//{{{NS_W}}}drawing")
    if drawings:
        return False
        
    picts = cell_node.findall(f".//{{{NS_W}}}pict")
    if picts:
        return False
    return True

def sanitize_docx_tables(docx_path: str):
    """
    Sanitizes tables inside a DOCX file to align cell widths and grid spans mathematically,
    shrinks bullet-points columns, merges non-bullet header rows, vertically merges profile images,
    normalizes the profile header to 2 columns with reduced font sizes and auto leading,
    and heals split characters.
    """
    temp_dir = docx_path + "_extracted"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)
    
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            z.extractall(temp_dir)
            
        doc_xml_path = os.path.join(temp_dir, "word", "document.xml")
        if not os.path.exists(doc_xml_path):
            return

        # lxml.parse preserves ALL xmlns:* declarations automatically.
        # If lxml is not available, fall back to stdlib ET with manual
        # namespace registration (may still have issues on Word 2007).
        if _LXML:
            tree = ET.parse(doc_xml_path)
            root = tree.getroot()
        else:
            import re as _re
            with open(doc_xml_path, 'rb') as _f:
                _raw = _f.read(8192)
            for _prefix, _uri in _re.findall(rb'xmlns:([A-Za-z0-9_-]+)="([^"]+)"', _raw):
                try:
                    ET.register_namespace(_prefix.decode(), _uri.decode())
                except Exception:
                    pass
            ET.register_namespace('w', NS_W)
            tree = ET.parse(doc_xml_path)
            root = tree.getroot()
        
        # 1. Heal split words across paragraphs
        for p in root.findall(f".//{{{NS_W}}}p"):
            heal_paragraph_runs(p)

        # 2. Fix exact table row heights (hRule=exact -> atLeast)
        # Fixed height rows (exact) cause text wrapping truncation, character overlap
        # and massive empty white gaps if the row is arbitrarily tall in the PDF.
        for tr in root.findall(f".//{{{NS_W}}}tr"):
            trPr = tr.find(f"{{{NS_W}}}trPr")
            if trPr is not None:
                trH = trPr.find(f"{{{NS_W}}}trHeight")
                if trH is not None:
                    # Let the row resize dynamically to fit its text
                    trH.attrib[f"{{{NS_W}}}hRule"] = "atLeast"
            
        # 3. Align table cell widths and column grids
        tables = root.findall(f".//{{{NS_W}}}tbl")
        for table_node in tables:
            grid_node = table_node.find(f"{{{NS_W}}}tblGrid")
            if grid_node is None:
                continue
                
            cols = grid_node.findall(f"{{{NS_W}}}gridCol")
            if not cols:
                continue
                
            col_widths = []
            for col in cols:
                w_val = col.attrib.get(f"{{{NS_W}}}w")
                col_widths.append(int(w_val) if w_val and w_val.isdigit() else 1000)
                
            K = len(col_widths)
            if K < 2:
                continue
                
            # Stricter bullet list detection:
            # 1. First column must be narrow (typically < 700 dxa) OR
            # 2. A significant portion (>30%) of non-empty first cells must be bullet chars
            bullet_row_count = 0
            non_empty_first_cells = 0
            for row in table_node.findall(f"{{{NS_W}}}tr"):
                cells = row.findall(f"{{{NS_W}}}tc")
                if cells:
                    first_cell = cells[0]
                    texts = [t.text for t in first_cell.findall(f".//{{{NS_W}}}t") if t.text]
                    cell_text = "".join(texts).strip()
                    if cell_text:
                        non_empty_first_cells += 1
                        if is_bullet_text(cell_text):
                            bullet_row_count += 1
                            
            has_bullets = False
            if non_empty_first_cells > 0:
                bullet_ratio = bullet_row_count / non_empty_first_cells
                first_col_narrow = col_widths[0] < 700
                has_bullets = first_col_narrow or bullet_ratio >= 0.3
                        
            if has_bullets:
                diff = col_widths[0] - 300
                col_widths[0] = 300
                col_widths[1] += diff
                for idx, col in enumerate(cols):
                    col.attrib[f"{{{NS_W}}}w"] = str(col_widths[idx])
                    
            grid_coords = [0]
            total_w = 0
            for w in col_widths:
                total_w += w
                grid_coords.append(total_w)
                
            # ── PROFILE PHOTO DETECTION ──────────────────────────────────────────
            # Scan ALL rows and ALL cells (not just row 0) because pdf2docx sometimes
            # places the name in a row BEFORE the photo row, stranding it at top-left.
            all_rows_list = table_node.findall(f"{{{NS_W}}}tr")
            photo_cell_ref = None
            photo_found_row = -1
            photo_found_col = -1

            for r_scan, row_scan in enumerate(all_rows_list):
                for c_scan, cell_scan in enumerate(row_scan.findall(f"{{{NS_W}}}tc")):
                    has_d = (
                        len(cell_scan.findall(f".//{{{NS_W}}}drawing")) > 0 or
                        len(cell_scan.findall(f".//{{{NS_W}}}pict")) > 0
                    )
                    if has_d:
                        photo_cell_ref = cell_scan
                        photo_found_row = r_scan
                        photo_found_col = c_scan
                        break
                if photo_cell_ref is not None:
                    break

            has_photo = photo_cell_ref is not None

            # ── NORMALIZE PROFILE HEADER TABLE ────────────────────────────────────
            if has_photo:
                # Detect actual photo column width from the drawing's EMU dimensions.
                # 914400 EMU = 1 inch = 1440 dxa. Add 360 dxa (~0.25 in) cell margin.
                NS_WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
                photo_col_w = 1800  # safe default ~1.25 inches
                for drawing_el in photo_cell_ref.findall(f".//{{{NS_W}}}drawing"):
                    ext_el = drawing_el.find(f".//{{{NS_WP}}}extent")
                    if ext_el is not None:
                        cx_str = ext_el.attrib.get("cx", "")
                        if cx_str.isdigit():
                            photo_col_w = int(int(cx_str) * 1440 / 914400) + 360
                            break

                text_col_w = max(total_w - photo_col_w, 2000)

                # Collect text runs grouped by row, merging cells in each row into one paragraph.
                # This ensures horizontal text lines in the PDF are placed inside a single paragraph
                # instead of splitting into separate lines.
                text_paragraphs = []
                for r_idx2, row2 in enumerate(all_rows_list):
                    row_runs = []
                    pPr_sample = None
                    for c_idx2, cell2 in enumerate(row2.findall(f"{{{NS_W}}}tc")):
                        # Skip the cell that contains the photo
                        if r_idx2 == photo_found_row and c_idx2 == photo_found_col:
                            continue
                        # Skip vMerge-continue cells (they are spaceholders, not real content)
                        tcPr_scan = cell2.find(f"{{{NS_W}}}tcPr")
                        if tcPr_scan is not None:
                            vm_scan = tcPr_scan.find(f"{{{NS_W}}}vMerge")
                            if vm_scan is not None:
                                val = vm_scan.attrib.get(f"{{{NS_W}}}val", "")
                                if val != "restart":
                                    continue
                        for p in cell2.findall(f"{{{NS_W}}}p"):
                            p_text = "".join(t.text or "" for t in p.findall(f".//{{{NS_W}}}t") if t.text).strip()
                            if p_text:
                                pPr = p.find(f"{{{NS_W}}}pPr")
                                if pPr is not None and pPr_sample is None:
                                    pPr_sample = pPr
                                for child in list(p):
                                    if child.tag in (f"{{{NS_W}}}r", f"{{{NS_W}}}hyperlink"):
                                        row_runs.append(child)
                    if row_runs:
                        new_p = ET.Element(f"{{{NS_W}}}p")
                        if pPr_sample is not None:
                            # Clean paragraph properties to remove margins/indentation
                            pPr_copy = ET.fromstring(ET.tostring(pPr_sample))
                            for ind in list(pPr_copy.findall(f"{{{NS_W}}}ind")):
                                pPr_copy.remove(ind)
                            for sp in list(pPr_copy.findall(f"{{{NS_W}}}spacing")):
                                sp.attrib[f"{{{NS_W}}}before"] = "0"
                                sp.attrib[f"{{{NS_W}}}after"] = "60"
                                sp.attrib[f"{{{NS_W}}}line"] = "240"
                                sp.attrib[f"{{{NS_W}}}lineRule"] = "auto"
                            new_p.append(pPr_copy)
                        for run in row_runs:
                            new_p.append(run)
                        text_paragraphs.append(new_p)

                # ── Rebuild tblGrid as exactly 2 columns ──────────────────────────
                grid_node.clear()
                gc1 = ET.Element(f"{{{NS_W}}}gridCol")
                gc1.attrib[f"{{{NS_W}}}w"] = str(photo_col_w)
                gc2 = ET.Element(f"{{{NS_W}}}gridCol")
                gc2.attrib[f"{{{NS_W}}}w"] = str(text_col_w)
                grid_node.append(gc1)
                grid_node.append(gc2)

                # ── Remove all existing rows ───────────────────────────────────────
                for old_row in list(all_rows_list):
                    table_node.remove(old_row)

                # ── Prepare photo cell ─────────────────────────────────────────────
                p_tcPr = photo_cell_ref.find(f"{{{NS_W}}}tcPr")
                if p_tcPr is None:
                    p_tcPr = ET.Element(f"{{{NS_W}}}tcPr")
                    photo_cell_ref.insert(0, p_tcPr)
                # Set width
                p_tcW = p_tcPr.find(f"{{{NS_W}}}tcW")
                if p_tcW is None:
                    p_tcW = ET.Element(f"{{{NS_W}}}tcW")
                    p_tcPr.append(p_tcW)
                p_tcW.attrib[f"{{{NS_W}}}w"] = str(photo_col_w)
                p_tcW.attrib[f"{{{NS_W}}}type"] = "dxa"
                # Remove any stale gridSpan / vMerge
                for stale in list(p_tcPr.findall(f"{{{NS_W}}}gridSpan")):
                    p_tcPr.remove(stale)
                for stale in list(p_tcPr.findall(f"{{{NS_W}}}vMerge")):
                    p_tcPr.remove(stale)
                # Deduplicate child elements — OOXML allows only ONE of each
                # tag inside <w:tcPr>. pdf2docx sometimes emits multiple <w:tcMar>
                # or <w:tcW> when the cell spanned many rows. Word 2007 strictly
                # rejects documents with duplicate tcPr children.
                seen_tags = set()
                for child in list(p_tcPr):
                    tag = child.tag
                    if tag in seen_tags:
                        p_tcPr.remove(child)
                    else:
                        seen_tags.add(tag)
                # Vertically center the photo inside the cell
                vAlign_p = p_tcPr.find(f"{{{NS_W}}}vAlign")
                if vAlign_p is None:
                    vAlign_p = ET.Element(f"{{{NS_W}}}vAlign")
                    p_tcPr.append(vAlign_p)
                vAlign_p.attrib[f"{{{NS_W}}}val"] = "center"

                text_tc = ET.Element(f"{{{NS_W}}}tc")
                t_tcPr = ET.Element(f"{{{NS_W}}}tcPr")
                t_tcW = ET.Element(f"{{{NS_W}}}tcW")
                t_tcW.attrib[f"{{{NS_W}}}w"] = str(text_col_w)
                t_tcW.attrib[f"{{{NS_W}}}type"] = "dxa"
                t_tcPr.append(t_tcW)
                
                # Apply matching grey shading (#f5f5f5) to the text cell
                t_shd = ET.Element(f"{{{NS_W}}}shd")
                t_shd.attrib[f"{{{NS_W}}}fill"] = "f5f5f5"
                t_shd.attrib[f"{{{NS_W}}}val"] = "clear"
                t_shd.attrib[f"{{{NS_W}}}color"] = "auto"
                t_tcPr.append(t_shd)
                
                t_vAlign = ET.Element(f"{{{NS_W}}}vAlign")
                t_vAlign.attrib[f"{{{NS_W}}}val"] = "top"
                t_tcPr.append(t_vAlign)
                text_tc.append(t_tcPr)
                for tp in text_paragraphs:
                    text_tc.append(tp)
                # Word requires at least one paragraph in every cell
                if not text_paragraphs:
                    text_tc.append(ET.Element(f"{{{NS_W}}}p"))

                # ── Assemble one clean row: [photo] [text] ─────────────────────────
                new_row = ET.Element(f"{{{NS_W}}}tr")
                new_row.append(photo_cell_ref)
                new_row.append(text_tc)
                table_node.append(new_row)

                continue

            # Remove rows where ALL cells are empty to prevent big white spaces in Google Docs
            for row in list(table_node.findall(f"{{{NS_W}}}tr")):
                cells = row.findall(f"{{{NS_W}}}tc")
                if cells and all(is_cell_empty(c) for c in cells):
                    table_node.remove(row)

            # Clean up spacing constraints (like lineRule="exact" and left/right indents)
            # on all paragraphs inside table cells to prevent line clipping and word splitting.
            for cell_node in table_node.findall(f".//{{{NS_W}}}tc"):
                for p in cell_node.findall(f".//{{{NS_W}}}p"):
                    pPr = p.find(f"{{{NS_W}}}pPr")
                    if pPr is not None:
                        for sp in list(pPr.findall(f"{{{NS_W}}}spacing")):
                            if sp.attrib.get(f"{{{NS_W}}}lineRule") == "exact":
                                sp.attrib[f"{{{NS_W}}}lineRule"] = "auto"
                        for ind in list(pPr.findall(f"{{{NS_W}}}ind")):
                            # Let text flow fully to the cell borders
                            pPr.remove(ind)
                
            for r_idx, row in enumerate(table_node.findall(f"{{{NS_W}}}tr")):
                cells = row.findall(f"{{{NS_W}}}tc")
                if not cells:
                    continue
                    
                # Merge cells of non-bullet rows in list tables to prevent text truncation
                if has_bullets and len(cells) > 1:
                    first_cell = cells[0]
                    texts = [t.text for t in first_cell.findall(f".//{{{NS_W}}}t") if t.text]
                    cell_text = "".join(texts)
                    if cell_text.strip() and not is_bullet_text(cell_text):
                        for cell in cells[1:]:
                            for p in cell.findall(f".//{{{NS_W}}}p"):
                                p_text = "".join([t.text for t in p.findall(f".//{{{NS_W}}}t") if t.text]).strip()
                                if p_text:
                                    first_p = first_cell.find(f".//{{{NS_W}}}p")
                                    if first_p is not None:
                                        r = ET.Element(f"{{{NS_W}}}r")
                                        t = ET.Element(f"{{{NS_W}}}t")
                                        t.attrib["{http://www.w3.org/XML/1998/namespace}space"] = "preserve"
                                        t.text = " " + p_text
                                        r.append(t)
                                        first_p.append(r)
                            row.remove(cell)
                        cells = [first_cell]
                        
                non_empty_cells = []
                new_cell_widths = []
                curr_accum_w = 0
                
                for cell in cells:
                    tcPr = cell.find(f"{{{NS_W}}}tcPr")
                    tcW = tcPr.find(f"{{{NS_W}}}tcW") if tcPr is not None else None
                    w_val = tcW.attrib.get(f"{{{NS_W}}}w") if tcW is not None else None
                    w = int(w_val) if w_val and w_val.isdigit() else 1000
                    
                    if is_cell_empty(cell):
                        curr_accum_w += w
                        row.remove(cell)
                    else:
                        non_empty_cells.append(cell)
                        new_cell_widths.append(w + curr_accum_w)
                        curr_accum_w = 0
                        
                if curr_accum_w > 0 and new_cell_widths:
                    new_cell_widths[-1] += curr_accum_w
                    
                if not non_empty_cells:
                    non_empty_cells = [cells[0]]
                    new_cell_widths = [total_w]
                    for cell in cells[1:]:
                        row.remove(cell)
                        
                total_cell_w = sum(new_cell_widths)
                if total_cell_w == 0:
                    new_cell_widths = [total_w // len(non_empty_cells)] * len(non_empty_cells)
                    total_cell_w = sum(new_cell_widths)
                    
                scaled_widths = [int(w * total_w / total_cell_w) for w in new_cell_widths]
                
                cell_coords = [0]
                curr = 0
                for w in scaled_widths:
                    curr += w
                    cell_coords.append(curr)
                    
                p = [0] * (len(non_empty_cells) + 1)
                for j in range(1, len(non_empty_cells)):
                    target = cell_coords[j]
                    min_col = p[j-1] + 1
                    max_col = K - (len(non_empty_cells) - j)
                    
                    if min_col > max_col:
                        best_q = min_col
                    else:
                        best_q = min_col
                        min_diff = abs(grid_coords[best_q] - target)
                        for q in range(min_col, max_col + 1):
                            diff = abs(grid_coords[q] - target)
                            if diff < min_diff:
                                min_diff = diff
                                best_q = q
                    p[j] = best_q
                p[-1] = K
                
                for j in range(len(non_empty_cells)):
                    cell = non_empty_cells[j]
                    span = p[j+1] - p[j]
                    width = grid_coords[p[j+1]] - grid_coords[p[j]]
                    
                    tcPr = cell.find(f"{{{NS_W}}}tcPr")
                    if tcPr is None:
                        tcPr = ET.Element(f"{{{NS_W}}}tcPr")
                        cell.insert(0, tcPr)
                        
                    tcW = tcPr.find(f"{{{NS_W}}}tcW")
                    if tcW is None:
                        tcW = ET.Element(f"{{{NS_W}}}tcW")
                        tcPr.append(tcW)
                    tcW.attrib[f"{{{NS_W}}}w"] = str(width)
                    tcW.attrib[f"{{{NS_W}}}type"] = "dxa"
                    
                    gridSpan = tcPr.find(f"{{{NS_W}}}gridSpan")
                    if span > 1:
                        if gridSpan is None:
                            gridSpan = ET.Element(f"{{{NS_W}}}gridSpan")
                            tcPr.append(gridSpan)
                        gridSpan.attrib[f"{{{NS_W}}}val"] = str(span)
                    else:
                        if gridSpan is not None:
                            tcPr.remove(gridSpan)
                                
        if _LXML:
            tree.write(doc_xml_path, encoding='utf-8', xml_declaration=True,
                       pretty_print=False)
        else:
            tree.write(doc_xml_path, encoding='utf-8', xml_declaration=True)
        
        os.remove(docx_path)
        with zipfile.ZipFile(docx_path, 'w', zipfile.ZIP_DEFLATED) as z:
            for root_dir, dirs, files in os.walk(temp_dir):
                for file in files:
                    full_path = os.path.join(root_dir, file)
                    rel_path = os.path.relpath(full_path, temp_dir)
                    z.write(full_path, rel_path)
                    
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

def convert_pdf_to_docx(input_path: str, safe_mode: bool = False) -> ConversionResult:
    """
    Convert a PDF file to editable DOCX format.
    Uses standard high-fidelity table layout extraction (matching PDF page flow)
    and post-processes the XML tables to prevent OpenXML validation errors
    in older Word versions (2007) and layout wrapping in Google Docs.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")
            
        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)
            
        output_docx_path = config.OUTPUT_DIR / f"{input_file.stem}.docx"
        
        # 1. Run standard high-fidelity conversion (table parsing enabled)
        try:
            convert_pdf(str(input_file), str(output_docx_path))
        except Exception as e:
            # Fallback to safe mode (table parsing disabled) on conversion failures
            convert_pdf(
                str(input_file),
                str(output_docx_path),
                parse_lattice_table=False,
                parse_stream_table=False
            )
            
        if not output_docx_path.exists():
            return ConversionResult(
                success=False,
                error_message="Conversion completed but output docx file could not be found"
            )
            
        # 2. Sanitize and validate table grids to prevent corruption warnings
        try:
            sanitize_docx_tables(str(output_docx_path))
        except Exception as e:
            # Non-fatal sanitization error, log and continue
            print(f"Table sanitization warning: {e}")
            
        return ConversionResult(
            success=True,
            output_path=str(output_docx_path),
            file_size_bytes=output_docx_path.stat().st_size
        )
        
    except Exception as e:
        return ConversionResult(success=False, error_message=make_encsafe(str(e)))
