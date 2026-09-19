"""
DocScalar Complex Adversarial Form Generator
-------------------------------------------
Generates an industrial-grade, multi-page adversarial PDF form
containing 7 layout archetypes that challenge state-of-the-art
document understanding systems:

1. Comb / segmented character boxes (e.g. 9-digit SSN grid)
2. Fill-in-the-blank underlines (Signature & Date lines)
3. Multi-column financial tables with thin gridlines and checkboxes
4. Staggered asymmetrical two-column layout
5. Grouped radio button survey matrix (4x4)
6. Mixed shaded fills, outlined boxes, and standalone checkboxes
7. Watermarked / security guideline background regions

Also exports a ground-truth JSON specification of exact coordinates.
"""
import fitz  # PyMuPDF
import json
import os

A4_W, A4_H = 595.276, 841.890

def build_adversarial_form(output_pdf_path, output_json_path):
    doc = fitz.open()
    ground_truth = {
        "totalPages": 2,
        "pageSize": {"width": A4_W, "height": A4_H},
        "pages": []
    }

    # =========================================================================
    # PAGE 1: Identity, Comb Cells, Asymmetrical Split & Radio Matrix
    # =========================================================================
    page1 = doc.new_page(width=A4_W, height=A4_H)
    p1_fields = []

    # 1. Page Header
    page1.insert_text(fitz.Point(50, 50), "UNITED FEDERAL REVENUE & IDENTITY REGISTRY", fontname="helv", fontsize=15, color=(0.1, 0.15, 0.25))
    page1.insert_text(fitz.Point(50, 66), "Form AD-9000: Adversarial Multi-Tiered Verification & Intake Document", fontname="helv", fontsize=9.5, color=(0.35, 0.4, 0.5))
    page1.draw_line(fitz.Point(50, 75), fitz.Point(545, 75), color=(0.2, 0.3, 0.45), width=1.5)

    # Section 1 Header
    page1.draw_rect(fitz.Rect(50, 85, 545, 103), color=(0.85, 0.88, 0.92), fill=(0.92, 0.94, 0.97), width=0.5)
    page1.insert_text(fitz.Point(58, 98), "SECTION 1: APPLICANT IDENTIFICATION & COMB TAXPAYER GRID", fontname="helv", fontsize=8.5, color=(0.15, 0.2, 0.3))

    # Field 1: Full Legal Name (Shaded Box with clean margin)
    page1.insert_text(fitz.Point(50, 116), "1. Full Legal Name (Last, First, Middle Initial)", fontname="helv", fontsize=8, color=(0.2, 0.2, 0.2))
    rect_name = fitz.Rect(50, 122, 330, 146)
    page1.draw_rect(rect_name, color=(0.55, 0.65, 0.8), fill=(0.88, 0.92, 0.98), width=0.75)
    p1_fields.append({
        "name": "full_legal_name",
        "type": "text",
        "rect": [rect_name.x0, rect_name.y0, rect_name.x1, rect_name.y1],
        "archetype": "shaded_box"
    })

    # Field 2: Preferred Nickname (Outlined box on same row)
    page1.insert_text(fitz.Point(345, 116), "2. Preferred Display Name", fontname="helv", fontsize=8, color=(0.2, 0.2, 0.2))
    rect_nickname = fitz.Rect(345, 122, 545, 146)
    page1.draw_rect(rect_nickname, color=(0.3, 0.35, 0.45), fill=(1, 1, 1), width=0.75)
    p1_fields.append({
        "name": "preferred_name",
        "type": "text",
        "rect": [rect_nickname.x0, rect_nickname.y0, rect_nickname.x1, rect_nickname.y1],
        "archetype": "outline_box"
    })

    # Field 3: Comb Field (9-digit SSN / Tax ID with segmented cells: 3 - 2 - 4)
    page1.insert_text(fitz.Point(50, 162), "3. Social Security / Taxpayer Identification Number (9-Digit Comb Grid)", fontname="helv", fontsize=8, color=(0.2, 0.2, 0.2))
    
    comb_cells = []
    cell_w, cell_h = 16.0, 20.0
    start_x, cur_y = 50.0, 168.0

    # Group 1: 3 digits
    for i in range(3):
        r = fitz.Rect(start_x + i * cell_w, cur_y, start_x + (i + 1) * cell_w, cur_y + cell_h)
        page1.draw_rect(r, color=(0.25, 0.25, 0.25), fill=(0.98, 0.98, 1.0), width=0.75)
        comb_cells.append([r.x0, r.y0, r.x1, r.y1])
    
    # Hyphen 1
    page1.draw_line(fitz.Point(start_x + 3 * cell_w + 3, cur_y + cell_h / 2), fitz.Point(start_x + 3 * cell_w + 10, cur_y + cell_h / 2), color=(0.25, 0.25, 0.25), width=1.5)
    start_x += 3 * cell_w + 13

    # Group 2: 2 digits
    for i in range(2):
        r = fitz.Rect(start_x + i * cell_w, cur_y, start_x + (i + 1) * cell_w, cur_y + cell_h)
        page1.draw_rect(r, color=(0.25, 0.25, 0.25), fill=(0.98, 0.98, 1.0), width=0.75)
        comb_cells.append([r.x0, r.y0, r.x1, r.y1])

    # Hyphen 2
    page1.draw_line(fitz.Point(start_x + 2 * cell_w + 3, cur_y + cell_h / 2), fitz.Point(start_x + 2 * cell_w + 10, cur_y + cell_h / 2), color=(0.25, 0.25, 0.25), width=1.5)
    start_x += 2 * cell_w + 13

    # Group 3: 4 digits
    for i in range(4):
        r = fitz.Rect(start_x + i * cell_w, cur_y, start_x + (i + 1) * cell_w, cur_y + cell_h)
        page1.draw_rect(r, color=(0.25, 0.25, 0.25), fill=(0.98, 0.98, 1.0), width=0.75)
        comb_cells.append([r.x0, r.y0, r.x1, r.y1])

    comb_total_rect = [50.0, cur_y, start_x + 4 * cell_w, cur_y + cell_h]
    p1_fields.append({
        "name": "taxpayer_id_comb",
        "type": "comb",
        "rect": comb_total_rect,
        "cells": comb_cells,
        "archetype": "comb_field"
    })

    # Field 4: Date of Birth on the right
    page1.insert_text(fitz.Point(345, 162), "4. Date of Birth (YYYY-MM-DD)", fontname="helv", fontsize=8, color=(0.2, 0.2, 0.2))
    rect_dob = fitz.Rect(345, 168, 545, 188)
    page1.draw_rect(rect_dob, color=(0.55, 0.65, 0.8), fill=(0.88, 0.92, 0.98), width=0.75)
    p1_fields.append({
        "name": "dob",
        "type": "text",
        "rect": [rect_dob.x0, rect_dob.y0, rect_dob.x1, rect_dob.y1],
        "archetype": "shaded_box"
    })

    # Section 2 Header: Asymmetrical Split Layout
    page1.draw_rect(fitz.Rect(50, 203, 545, 221), color=(0.85, 0.88, 0.92), fill=(0.92, 0.94, 0.97), width=0.5)
    page1.insert_text(fitz.Point(58, 216), "SECTION 2: RESIDENTIAL HISTORY & CONTACT MATRIX (STAGGERED DUAL COLUMN)", fontname="helv", fontsize=8.5, color=(0.15, 0.2, 0.3))

    # Left Column: Primary Street (1-line) + Relocation Statement (Multiline)
    page1.insert_text(fitz.Point(50, 234), "5. Primary Street Address (Line 1)", fontname="helv", fontsize=8, color=(0.2, 0.2, 0.2))
    rect_addr1 = fitz.Rect(50, 240, 285, 264)
    page1.draw_rect(rect_addr1, color=(0.3, 0.35, 0.45), fill=(1, 1, 1), width=0.75)
    p1_fields.append({
        "name": "street_address",
        "type": "text",
        "rect": [rect_addr1.x0, rect_addr1.y0, rect_addr1.x1, rect_addr1.y1],
        "archetype": "outline_box"
    })

    page1.insert_text(fitz.Point(50, 280), "6. Relocation History & Prior Residence Statement (Multiline)", fontname="helv", fontsize=8, color=(0.2, 0.2, 0.2))
    rect_history = fitz.Rect(50, 286, 285, 366)
    page1.draw_rect(rect_history, color=(0.55, 0.65, 0.8), fill=(0.93, 0.95, 0.99), width=0.75)
    p1_fields.append({
        "name": "relocation_history",
        "type": "text",
        "multiline": True,
        "rect": [rect_history.x0, rect_history.y0, rect_history.x1, rect_history.y1],
        "archetype": "multiline_shaded"
    })

    # Right Column: 4 Stacked Single-Line Fields
    # Field 7: City
    page1.insert_text(fitz.Point(300, 234), "7. City", fontname="helv", fontsize=8, color=(0.2, 0.2, 0.2))
    rect_city = fitz.Rect(300, 240, 420, 264)
    page1.draw_rect(rect_city, color=(0.3, 0.35, 0.45), fill=(1, 1, 1), width=0.75)
    p1_fields.append({"name": "city", "type": "text", "rect": [rect_city.x0, rect_city.y0, rect_city.x1, rect_city.y1], "archetype": "outline_box"})

    # Field 8: State
    page1.insert_text(fitz.Point(435, 234), "8. State", fontname="helv", fontsize=8, color=(0.2, 0.2, 0.2))
    rect_state = fitz.Rect(435, 240, 545, 264)
    page1.draw_rect(rect_state, color=(0.3, 0.35, 0.45), fill=(1, 1, 1), width=0.75)
    p1_fields.append({"name": "state", "type": "text", "rect": [rect_state.x0, rect_state.y0, rect_state.x1, rect_state.y1], "archetype": "outline_box"})

    # Field 9: Postal Code
    page1.insert_text(fitz.Point(300, 280), "9. Postal / ZIP Code", fontname="helv", fontsize=8, color=(0.2, 0.2, 0.2))
    rect_zip = fitz.Rect(300, 286, 420, 310)
    page1.draw_rect(rect_zip, color=(0.55, 0.65, 0.8), fill=(0.88, 0.92, 0.98), width=0.75)
    p1_fields.append({"name": "zip_code", "type": "text", "rect": [rect_zip.x0, rect_zip.y0, rect_zip.x1, rect_zip.y1], "archetype": "shaded_box"})

    # Field 10: Phone
    page1.insert_text(fitz.Point(435, 280), "10. Phone Number", fontname="helv", fontsize=8, color=(0.2, 0.2, 0.2))
    rect_phone = fitz.Rect(435, 286, 545, 310)
    page1.draw_rect(rect_phone, color=(0.55, 0.65, 0.8), fill=(0.88, 0.92, 0.98), width=0.75)
    p1_fields.append({"name": "phone", "type": "text", "rect": [rect_phone.x0, rect_phone.y0, rect_phone.x1, rect_phone.y1], "archetype": "shaded_box"})

    # Field 11: Email Address
    page1.insert_text(fitz.Point(300, 326), "11. Certified Email Address", fontname="helv", fontsize=8, color=(0.2, 0.2, 0.2))
    rect_email = fitz.Rect(300, 332, 545, 356)
    page1.draw_rect(rect_email, color=(0.3, 0.35, 0.45), fill=(1, 1, 1), width=0.75)
    p1_fields.append({"name": "email", "type": "text", "rect": [rect_email.x0, rect_email.y0, rect_email.x1, rect_email.y1], "archetype": "outline_box"})

    # Section 3: Grouped Survey Radio Matrix (4x4)
    page1.draw_rect(fitz.Rect(50, 381, 545, 399), color=(0.85, 0.88, 0.92), fill=(0.92, 0.94, 0.97), width=0.5)
    page1.insert_text(fitz.Point(58, 394), "SECTION 3: SERVICE QUALITY EVALUATION (RADIO OPTION MATRIX)", fontname="helv", fontsize=8.5, color=(0.15, 0.2, 0.3))

    # Matrix Table Header
    matrix_y = 405.0
    page1.draw_rect(fitz.Rect(50, matrix_y, 545, matrix_y + 18), color=(0.7, 0.75, 0.82), fill=(0.85, 0.88, 0.92), width=0.5)
    page1.insert_text(fitz.Point(60, matrix_y + 12), "Evaluation Criterion", fontname="helv", fontsize=8, color=(0.15, 0.2, 0.3))
    col_x_positions = [280, 350, 420, 490]
    headers = ["Poor (1)", "Fair (2)", "Good (3)", "Exec (4)"]
    for i, h in enumerate(headers):
        page1.insert_text(fitz.Point(col_x_positions[i] - 10, matrix_y + 12), h, fontname="helv", fontsize=7.5, color=(0.15, 0.2, 0.3))

    # 4 Survey Rows
    survey_questions = [
        "Identity Onboarding Speed",
        "Document Encryption Confidence",
        "Form Field Detection Clarity",
        "Overall Platform Satisfaction"
    ]
    for row_idx, q in enumerate(survey_questions):
        ry = matrix_y + 18 + row_idx * 20
        # alternate row background
        if row_idx % 2 == 1:
            page1.draw_rect(fitz.Rect(50, ry, 545, ry + 20), color=(0.95, 0.95, 0.97), fill=(0.96, 0.97, 0.99), width=0.2)
        page1.draw_line(fitz.Point(50, ry + 20), fitz.Point(545, ry + 20), color=(0.85, 0.88, 0.92), width=0.5)
        page1.insert_text(fitz.Point(60, ry + 14), q, fontname="helv", fontsize=8, color=(0.2, 0.2, 0.25))

        # 4 circular radio buttons
        for col_idx, cx in enumerate(col_x_positions):
            center = fitz.Point(cx, ry + 10)
            page1.draw_circle(center, 5.0, color=(0.3, 0.35, 0.45), fill=(1, 1, 1), width=0.75)
            p1_fields.append({
                "name": f"survey_q{row_idx + 1}",
                "type": "radio",
                "option": f"opt_{col_idx + 1}",
                "rect": [center.x - 5, center.y - 5, center.x + 5, center.y + 5],
                "archetype": "radio_circle"
            })

    # Section 4: Fill-in-the-Blank Underlines & Checkbox Signature
    page1.draw_rect(fitz.Rect(50, 510, 545, 528), color=(0.85, 0.88, 0.92), fill=(0.92, 0.94, 0.97), width=0.5)
    page1.insert_text(fitz.Point(58, 523), "SECTION 4: CERTIFICATION & FILL-IN-THE-BLANK UNDERLINES", fontname="helv", fontsize=8.5, color=(0.15, 0.2, 0.3))

    # Checkbox
    cb_rect = fitz.Rect(50, 540, 64, 554)
    page1.draw_rect(cb_rect, color=(0.2, 0.25, 0.35), fill=(1, 1, 1), width=1.0)
    page1.insert_text(fitz.Point(72, 550), "I certify under penalty of administrative perjury that all information submitted is true and complete.", fontname="helv", fontsize=8, color=(0.15, 0.15, 0.2))
    p1_fields.append({
        "name": "certify_checkbox",
        "type": "checkbox",
        "rect": [cb_rect.x0, cb_rect.y0, cb_rect.x1, cb_rect.y1],
        "archetype": "checkbox"
    })

    # Underline 1: Signature
    page1.insert_text(fitz.Point(50, 580), "Authorized Representative Signature:", fontname="helv", fontsize=8.5, color=(0.2, 0.2, 0.2))
    line1_start = fitz.Point(210, 582)
    line1_end = fitz.Point(400, 582)
    page1.draw_line(line1_start, line1_end, color=(0.1, 0.1, 0.15), width=1.2)
    p1_fields.append({
        "name": "signature_underline",
        "type": "underline",
        "rect": [line1_start.x, line1_start.y - 14, line1_end.x, line1_start.y + 2],
        "archetype": "underline"
    })

    # Underline 2: Date
    page1.insert_text(fitz.Point(420, 580), "Date:", fontname="helv", fontsize=8.5, color=(0.2, 0.2, 0.2))
    line2_start = fitz.Point(450, 582)
    line2_end = fitz.Point(545, 582)
    page1.draw_line(line2_start, line2_end, color=(0.1, 0.1, 0.15), width=1.2)
    p1_fields.append({
        "name": "date_underline",
        "type": "underline",
        "rect": [line2_start.x, line2_start.y - 14, line2_end.x, line2_start.y + 2],
        "archetype": "underline"
    })

    page1.insert_text(fitz.Point(50, 810), "Form AD-9000 (Rev. 2026-Q3) — Page 1 of 2", fontname="helv", fontsize=8, color=(0.5, 0.5, 0.5))
    ground_truth["pages"].append({"pageIndex": 0, "fields": p1_fields})

    # =========================================================================
    # PAGE 2: Financial Ledger Table with Thin Gridlines & Watermarked Box
    # =========================================================================
    page2 = doc.new_page(width=A4_W, height=A4_H)
    p2_fields = []

    # Page 2 Header
    page2.insert_text(fitz.Point(50, 50), "SCHEDULE B: ITEMIZED ASSET & FINANCIAL DISCLOSURE LEDGER", fontname="helv", fontsize=13, color=(0.1, 0.15, 0.25))
    page2.insert_text(fitz.Point(50, 66), "Enter all reportable line items. Grid cells must be segmented independently.", fontname="helv", fontsize=8.5, color=(0.35, 0.4, 0.5))
    page2.draw_line(fitz.Point(50, 75), fitz.Point(545, 75), color=(0.2, 0.3, 0.45), width=1.5)

    # Financial Table Grid Definition
    tbl_top = 95.0
    tbl_left = 50.0
    col_widths = [45.0, 165.0, 95.0, 45.0, 75.0, 70.0]
    col_names = ["Item #", "Asset Description", "Category", "Qty", "Unit Value ($)", "Taxable?"]
    row_height = 24.0

    # Header Row
    page2.draw_rect(fitz.Rect(tbl_left, tbl_top, 545, tbl_top + 20), color=(0.2, 0.28, 0.38), fill=(0.25, 0.35, 0.48), width=1.0)
    cx = tbl_left
    for idx, w in enumerate(col_widths):
        page2.insert_text(fitz.Point(cx + 4, tbl_top + 13), col_names[idx], fontname="helv", fontsize=7.5, color=(1, 1, 1))
        cx += w
        if idx < len(col_widths) - 1:
            page2.draw_line(fitz.Point(cx, tbl_top), fitz.Point(cx, tbl_top + 20), color=(0.35, 0.45, 0.58), width=0.5)

    # 5 Data Rows with internal cell boundaries
    for r in range(5):
        ry = tbl_top + 20 + r * row_height
        # Alternate row fill
        fill_color = (0.97, 0.98, 0.99) if r % 2 == 1 else (1.0, 1.0, 1.0)
        page2.draw_rect(fitz.Rect(tbl_left, ry, 545, ry + row_height), color=(0.7, 0.75, 0.8), fill=fill_color, width=0.6)

        # Pre-fill Item # column
        page2.insert_text(fitz.Point(tbl_left + 15, ry + 15), f"{r + 1:02d}", fontname="helv", fontsize=8.5, color=(0.3, 0.3, 0.35))

        # Vertical Column Divider Lines
        cur_x = tbl_left
        for c_idx, w in enumerate(col_widths):
            cur_x += w
            if c_idx < len(col_widths) - 1:
                page2.draw_line(fitz.Point(cur_x, ry), fitz.Point(cur_x, ry + row_height), color=(0.75, 0.8, 0.85), width=0.5)

        # Input cells ground truth
        # Col 1: Description
        desc_rect = [tbl_left + col_widths[0], ry, tbl_left + col_widths[0] + col_widths[1], ry + row_height]
        p2_fields.append({"name": f"tbl_desc_r{r+1}", "type": "text", "rect": desc_rect, "archetype": "table_cell"})

        # Col 2: Category
        cat_rect = [tbl_left + col_widths[0] + col_widths[1], ry, tbl_left + col_widths[0] + col_widths[1] + col_widths[2], ry + row_height]
        p2_fields.append({"name": f"tbl_cat_r{r+1}", "type": "text", "rect": cat_rect, "archetype": "table_cell"})

        # Col 3: Qty
        qty_rect = [cat_rect[2], ry, cat_rect[2] + col_widths[3], ry + row_height]
        p2_fields.append({"name": f"tbl_qty_r{r+1}", "type": "text", "rect": qty_rect, "archetype": "table_cell"})

        # Col 4: Unit Value
        val_rect = [qty_rect[2], ry, qty_rect[2] + col_widths[4], ry + row_height]
        p2_fields.append({"name": f"tbl_val_r{r+1}", "type": "text", "rect": val_rect, "archetype": "table_cell"})

        # Col 5: Checkbox for Taxable
        cb_cx = val_rect[2] + (col_widths[5] - 12) / 2
        cb_cy = ry + (row_height - 12) / 2
        tcb_rect = fitz.Rect(cb_cx, cb_cy, cb_cx + 12, cb_cy + 12)
        page2.draw_rect(tcb_rect, color=(0.3, 0.35, 0.45), fill=(1, 1, 1), width=0.8)
        p2_fields.append({"name": f"tbl_taxable_r{r+1}", "type": "checkbox", "rect": [tcb_rect.x0, tcb_rect.y0, tcb_rect.x1, tcb_rect.y1], "archetype": "checkbox"})

    # Bottom Summary Block with Underlines
    sum_y = tbl_top + 20 + 5 * row_height + 25
    summary_items = [
        ("Aggregate Subtotal:", 330, 430, 545),
        ("Tax Surcharge (8.25%):", 330, 430, 545),
        ("Total Net Valuation:", 330, 430, 545)
    ]
    for s_idx, (label, lx, start_u, end_u) in enumerate(summary_items):
        uy = sum_y + s_idx * 22
        page2.insert_text(fitz.Point(lx, uy), label, fontname="helv", fontsize=8.5, color=(0.2, 0.2, 0.25))
        page2.draw_line(fitz.Point(start_u, uy + 2), fitz.Point(end_u, uy + 2), color=(0.15, 0.15, 0.2), width=1.0)
        p2_fields.append({
            "name": f"summary_val_{s_idx+1}",
            "type": "underline",
            "rect": [start_u, uy - 12, end_u, uy + 2],
            "archetype": "underline"
        })

    # Section 6: Official Use Only Box with Diagonal Watermark
    off_box_top = sum_y + 85
    off_box = fitz.Rect(50, off_box_top, 545, off_box_top + 90)
    page2.draw_rect(off_box, color=(0.7, 0.75, 0.8), fill=(0.98, 0.98, 0.99), width=1.0)
    page2.insert_text(fitz.Point(58, off_box_top + 14), "FOR OFFICIAL USE ONLY — DO NOT WRITE OUTSIDE ASSIGNED ZONES", fontname="helv", fontsize=7.5, color=(0.5, 0.55, 0.6))
    
    # Internal official fields
    page2.insert_text(fitz.Point(58, off_box_top + 34), "Audit Stamp Reference:", fontname="helv", fontsize=8, color=(0.3, 0.35, 0.4))
    off_rect1 = fitz.Rect(160, off_box_top + 24, 320, off_box_top + 46)
    page2.draw_rect(off_rect1, color=(0.6, 0.65, 0.7), fill=(1, 1, 1), width=0.75)
    p2_fields.append({"name": "official_audit_stamp", "type": "text", "rect": [off_rect1.x0, off_rect1.y0, off_rect1.x1, off_rect1.y1], "archetype": "outline_box"})

    page2.insert_text(fitz.Point(340, off_box_top + 34), "Approval Code:", fontname="helv", fontsize=8, color=(0.3, 0.35, 0.4))
    off_rect2 = fitz.Rect(415, off_box_top + 24, 535, off_box_top + 46)
    page2.draw_rect(off_rect2, color=(0.6, 0.65, 0.7), fill=(1, 1, 1), width=0.75)
    p2_fields.append({"name": "official_approval_code", "type": "text", "rect": [off_rect2.x0, off_rect2.y0, off_rect2.x1, off_rect2.y1], "archetype": "outline_box"})

    page2.insert_text(fitz.Point(58, off_box_top + 70), "Auditor Signature: _______________________", fontname="helv", fontsize=8, color=(0.3, 0.35, 0.4))
    p2_fields.append({"name": "auditor_sig_underline", "type": "underline", "rect": [140, off_box_top + 58, 250, off_box_top + 72], "archetype": "underline"})

    page2.insert_text(fitz.Point(340, off_box_top + 70), "Date: _______________", fontname="helv", fontsize=8, color=(0.3, 0.35, 0.4))
    p2_fields.append({"name": "auditor_date_underline", "type": "underline", "rect": [370, off_box_top + 58, 460, off_box_top + 72], "archetype": "underline"})

    page2.insert_text(fitz.Point(50, 810), "Form AD-9000 (Rev. 2026-Q3) — Page 2 of 2", fontname="helv", fontsize=8, color=(0.5, 0.5, 0.5))
    ground_truth["pages"].append({"pageIndex": 1, "fields": p2_fields})

    # Save outputs
    doc.save(output_pdf_path)
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(ground_truth, f, indent=2)
    print(f"Generated {output_pdf_path} (Pages: {len(doc)})")
    print(f"Generated ground truth JSON at {output_json_path}")

if __name__ == "__main__":
    out_pdf = r"c:\Users\Tanvir Alam\Downloads\complex_adversarial_intake_form.pdf"
    out_json = r"c:\Users\Tanvir Alam\Downloads\New folder upscaled\tests\fixtures\complex_adversarial_ground_truth.json"
    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    build_adversarial_form(out_pdf, out_json)
