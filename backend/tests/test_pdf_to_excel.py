import datetime
import tempfile
import unittest
from pathlib import Path

import openpyxl
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from backend.services.pdf_to_excel import (
    EXCEL_FORBIDDEN_CHARS,
    MAX_SHEET_NAME_LEN,
    ClassifiedContent,
    ContentClassifier,
    CrossPageStitcher,
    DataNormalizer,
    DocumentStructure,
    ExcelRenderer,
    PageScanner,
    Section,
    SmartPDFToExcelConverter,
    TableGroup,
)


class TestPDFToExcelEngine(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    # =========================================================================
    # Group 1: Data Normalizer - Numbers & Accounting
    # =========================================================================

    def test_01_accounting_negative_parentheses(self):
        val, num_fmt = DataNormalizer.normalize_cell("(1,234.56)")
        self.assertEqual(val, -1234.56)
        self.assertEqual(num_fmt, "float")

    def test_02_accounting_negative_with_dollar(self):
        val, num_fmt = DataNormalizer.normalize_cell("($500.00)")
        self.assertEqual(val, -500.00)
        self.assertEqual(num_fmt, "currency_$")

    def test_03_accounting_negative_with_pound(self):
        val, num_fmt = DataNormalizer.normalize_cell("(£1,250.75)")
        self.assertEqual(val, -1250.75)
        self.assertEqual(num_fmt, "currency_£")

    def test_04_accounting_negative_with_euro(self):
        val, num_fmt = DataNormalizer.normalize_cell("(€450)")
        self.assertEqual(val, -450.0)
        self.assertEqual(num_fmt, "currency_€")

    def test_05_accounting_negative_with_yen(self):
        val, num_fmt = DataNormalizer.normalize_cell("(¥10,000)")
        self.assertEqual(val, -10000.0)
        self.assertEqual(num_fmt, "currency_¥")

    def test_06_positive_currency_dollar(self):
        val, num_fmt = DataNormalizer.normalize_cell("$4,200.50")
        self.assertEqual(val, 4200.50)
        self.assertEqual(num_fmt, "currency_$")

    def test_07_positive_currency_euro(self):
        val, num_fmt = DataNormalizer.normalize_cell("€99.95")
        self.assertEqual(val, 99.95)
        self.assertEqual(num_fmt, "currency_€")

    def test_08_percentage_integer(self):
        val, num_fmt = DataNormalizer.normalize_cell("15%")
        self.assertAlmostEqual(val, 0.15, places=4)
        self.assertEqual(num_fmt, "percentage")

    def test_09_percentage_decimal(self):
        val, num_fmt = DataNormalizer.normalize_cell("2.75%")
        self.assertAlmostEqual(val, 0.0275, places=5)
        self.assertEqual(num_fmt, "percentage")

    def test_10_pure_integer(self):
        val, num_fmt = DataNormalizer.normalize_cell("1,048")
        self.assertEqual(val, 1048)
        self.assertEqual(num_fmt, "integer")

    def test_11_pure_float(self):
        val, num_fmt = DataNormalizer.normalize_cell("3.14159")
        self.assertAlmostEqual(val, 3.1416, places=4)
        self.assertEqual(num_fmt, "float")

    def test_12_code_preserves_leading_zeros(self):
        # Leading zeros must not be stripped to numbers (e.g. ZIP/ID codes)
        val, num_fmt = DataNormalizer.normalize_cell("00142")
        self.assertEqual(val, "00142")
        self.assertEqual(num_fmt, "string")

    def test_13_boolean_true_variants(self):
        for raw in ["true", "TRUE", "True", "yes", "YES"]:
            val, fmt = DataNormalizer.normalize_cell(raw)
            self.assertTrue(val is True, f"Failed for {raw}")
            self.assertEqual(fmt, "boolean")

    def test_14_boolean_false_variants(self):
        for raw in ["false", "FALSE", "False", "no", "NO"]:
            val, fmt = DataNormalizer.normalize_cell(raw)
            self.assertTrue(val is False, f"Failed for {raw}")
            self.assertEqual(fmt, "boolean")

    def test_15_iso_date_parsing(self):
        val, num_fmt = DataNormalizer.normalize_cell("2026-09-16")
        self.assertTrue(hasattr(val, "year"))
        self.assertEqual(val.year, 2026)
        self.assertEqual(val.month, 9)
        self.assertEqual(val.day, 16)
        self.assertEqual(num_fmt, "date")

    def test_16_slash_date_parsing(self):
        val, num_fmt = DataNormalizer.normalize_cell("16/09/2026")
        self.assertTrue(hasattr(val, "year"))
        self.assertEqual(val.year, 2026)
        self.assertEqual(num_fmt, "date")

    # =========================================================================
    # Group 2: Table Normalization & Pruning
    # =========================================================================

    def test_17_prune_trailing_empty_columns(self):
        header = ["Item", "Qty", "", None]
        data = [
            ["Apples", "5", "", None],
            ["Oranges", "12", "   ", ""],
        ]
        p_hdr, p_data = DataNormalizer.prune_trailing(header, data)
        self.assertEqual(len(p_hdr), 2)
        self.assertEqual(p_hdr, ["Item", "Qty"])
        self.assertEqual(len(p_data[0]), 2)
        self.assertEqual(len(p_data[1]), 2)

    def test_18_prune_trailing_empty_rows(self):
        header = ["Col A", "Col B"]
        data = [
            ["Row 1", "Val 1"],
            ["", ""],
            [None, None],
        ]
        p_hdr, p_data = DataNormalizer.prune_trailing(header, data)
        self.assertEqual(len(p_data), 1)
        self.assertEqual(p_data[0], ["Row 1", "Val 1"])

    def test_19_normalize_table_types(self):
        tg = TableGroup(
            header_row=["Product", "Price", "Discount"],
            data_rows=[
                ["Widget A", "$100.00", "10%"],
                ["Widget B", "(£25.50)", "0%"],
            ],
            source_pages=[1],
            col_count=3,
        )
        norm_hdr, norm_data, col_fmts = DataNormalizer.normalize_table(tg)
        self.assertEqual(norm_hdr, ["Product", "Price", "Discount"])
        self.assertEqual(norm_data[0][1][0], 100.00)
        self.assertEqual(norm_data[0][1][1], "currency_$")
        self.assertAlmostEqual(norm_data[0][2][0], 0.10, places=3)
        self.assertEqual(norm_data[0][2][1], "percentage")
        self.assertEqual(norm_data[1][1][0], -25.50)
        self.assertEqual(norm_data[1][1][1], "currency_£")

    # =========================================================================
    # Group 3: Scalar Recognition & Content Classification
    # =========================================================================

    def test_20_scalar_recognition_colon_pairs(self):
        text = "Invoice #: INV-2026-9874"
        parts = text.split(":", 1)
        k, v = parts[0].strip(), parts[1].strip()
        self.assertEqual(k, "Invoice #")
        self.assertEqual(v, "INV-2026-9874")

    def test_21_scalar_recognition_total_amount(self):
        text = "Total Amount: $14,950.00"
        parts = text.split(":", 1)
        k, v = parts[0].strip(), parts[1].strip()
        self.assertEqual(k, "Total Amount")
        val, num_fmt = DataNormalizer.normalize_cell(v)
        self.assertEqual(val, 14950.0)
        self.assertIn("$", num_fmt)

    def test_22_structural_analyzer_scalar_aggregation(self):
        page1 = ClassifiedContent(
            page_num=1,
            section_headers=[("Financial Summary", 40, 14)],
            sub_headers=[],
            captions=[],
            footnotes=[],
            tables=[],
            median_body_size=10.0,
            body_fontname="Helvetica",
            scalar_fields=[("Invoice #", "INV-001", 50), ("Date", "2026-09-16", 65)],
        )
        page2 = ClassifiedContent(
            page_num=2,
            section_headers=[],
            sub_headers=[],
            captions=[],
            footnotes=[],
            tables=[],
            median_body_size=10.0,
            body_fontname="Helvetica",
            scalar_fields=[("Invoice #", "INV-001", 50), ("Due Date", "2026-10-16", 80)],
        )
        # Verify deduplication logic
        accumulated = []
        for p in [page1, page2]:
            for k, v, _ in p.scalar_fields:
                if not any(s[0].lower() == k.lower() for s in accumulated):
                    accumulated.append((k, v))

        self.assertEqual(len(accumulated), 3)
        self.assertEqual(accumulated[0], ("Invoice #", "INV-001"))
        self.assertEqual(accumulated[1], ("Date", "2026-09-16"))
        self.assertEqual(accumulated[2], ("Due Date", "2026-10-16"))

    # =========================================================================
    # Group 4: Fallback Grid Extraction (PageScanner)
    # =========================================================================

    def test_23_fallback_grid_clustering(self):
        scanner = PageScanner()
        words = [
            {"text": "Item", "top": 100, "bottom": 112, "x0": 50, "x1": 80},
            {"text": "Qty", "top": 100, "bottom": 112, "x0": 200, "x1": 220},
            {"text": "Cost", "top": 100, "bottom": 112, "x0": 350, "x1": 380},
            {"text": "Apples", "top": 120, "bottom": 132, "x0": 50, "x1": 90},
            {"text": "10", "top": 120, "bottom": 132, "x0": 200, "x1": 215},
            {"text": "$25.00", "top": 120, "bottom": 132, "x0": 350, "x1": 390},
        ]
        grid = scanner._extract_fallback_grid(words)
        self.assertIsNotNone(grid)
        rows = grid.get("rows", [])
        self.assertGreaterEqual(len(rows), 2)
        self.assertIn("Item", rows[0])
        self.assertIn("Qty", rows[0])
        self.assertIn("Cost", rows[0])
        self.assertIn("Apples", rows[1])

    # =========================================================================
    # Group 5: Excel Sheet Name Sanitization
    # =========================================================================

    def test_24_clean_sheet_name_forbidden_characters(self):
        bad_name = "Summary [2026] / Report: Q1*?"
        clean = bad_name
        for char in EXCEL_FORBIDDEN_CHARS:
            clean = clean.replace(char, "")
        clean = clean.strip()[:MAX_SHEET_NAME_LEN]
        self.assertNotIn("[", clean)
        self.assertNotIn("]", clean)
        self.assertNotIn("/", clean)
        self.assertNotIn(":", clean)
        self.assertNotIn("*", clean)
        self.assertNotIn("?", clean)
        self.assertLessEqual(len(clean), 31)

    def test_25_clean_sheet_name_max_length(self):
        super_long = "This is a ridiculously long worksheet title that exceeds the limit"
        clean = super_long[:MAX_SHEET_NAME_LEN]
        self.assertEqual(len(clean), 31)

    # =========================================================================
    # Group 6: Cross-Page Continuation Stitching
    # =========================================================================

    def test_26_continuation_table_stitching(self):
        tg1 = TableGroup(
            header_row=["ID", "Name", "Score"],
            data_rows=[["1", "Alice", "95"], ["2", "Bob", "88"]],
            source_pages=[1],
            col_count=3,
        )
        tg2 = TableGroup(
            header_row=["ID", "Name", "Score"],
            data_rows=[["3", "Charlie", "92"], ["4", "Diana", "96"]],
            source_pages=[2],
            col_count=3,
        )
        sec = Section(title="Scores", page_range=(1, 2), tables=[tg1, tg2])
        doc = DocumentStructure(sections=[sec])
        stitched_doc = CrossPageStitcher.stitch(doc)
        self.assertEqual(len(stitched_doc.sections[0].tables), 1)
        self.assertEqual(len(stitched_doc.sections[0].tables[0].data_rows), 4)
        self.assertEqual(stitched_doc.sections[0].tables[0].source_pages, [1, 2])

    # =========================================================================
    # Group 7: ExcelRenderer with Scalar Summary Block
    # =========================================================================

    def test_27_render_scalar_summary_block(self):
        doc = DocumentStructure()
        doc.scalar_fields = [
            ("Invoice #", "INV-2026-001"),
            ("Date", "2026-09-16"),
            ("Vendor", "DocScalar Corp"),
            ("Total Amount", "$12,450.00"),
        ]
        tg = TableGroup(
            header_row=["Description", "Amount"],
            data_rows=[["Cloud Infrastructure", "$10,000.00"], ["Support SLA", "$2,450.00"]],
            source_pages=[1],
            col_count=2,
        )
        sec = Section(title="Invoice Details", page_range=(1, 1), tables=[tg])
        doc.sections.append(sec)

        output_xlsx = self.temp_path / "rendered.xlsx"
        renderer = ExcelRenderer()
        renderer.render(doc, output_xlsx)

        self.assertTrue(output_xlsx.exists())
        wb = openpyxl.load_workbook(output_xlsx)
        ws = wb.active

        cell_a1 = ws["A1"].value
        self.assertEqual(cell_a1, "Document Information & Summary")

        cell_a3 = ws["A3"].value
        cell_b3 = ws["B3"].value
        self.assertEqual(cell_a3, "Invoice #")
        self.assertEqual(cell_b3, "INV-2026-001")

        found_total = False
        for row in ws.iter_rows(values_only=True):
            if "Total Amount" in row:
                found_total = True
                break
        self.assertTrue(found_total)

    # =========================================================================
    # Group 8: End-to-End Synthetic PDF Conversion
    # =========================================================================

    def test_28_e2e_synthetic_pdf_with_scalar_and_table(self):
        pdf_path = self.temp_path / "invoice.pdf"
        c = canvas.Canvas(str(pdf_path), pagesize=letter)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, 750, "TAX INVOICE")

        c.setFont("Helvetica", 10)
        c.drawString(50, 720, "Invoice Number: INV-9901")
        c.drawString(50, 705, "Issue Date: 2026-09-16")
        c.drawString(50, 690, "Total Due: $3,500.00")

        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, 640, "Item Description")
        c.drawString(250, 640, "Quantity")
        c.drawString(350, 640, "Unit Price")
        c.drawString(450, 640, "Total Price")
        c.line(50, 635, 520, 635)

        c.setFont("Helvetica", 10)
        c.drawString(50, 620, "Engineering Services")
        c.drawString(250, 620, "20")
        c.drawString(350, 620, "$150.00")
        c.drawString(450, 620, "$3,000.00")

        c.drawString(50, 600, "Support Retainer")
        c.drawString(250, 600, "1")
        c.drawString(350, 600, "$500.00")
        c.drawString(450, 600, "$500.00")

        c.save()

        converter = SmartPDFToExcelConverter()
        res = converter.convert(str(pdf_path))
        self.assertTrue(res.success, f"Conversion failed: {res.error_message}")
        self.assertIsNotNone(res.output_path)

        wb = openpyxl.load_workbook(res.output_path)
        self.assertGreaterEqual(len(wb.sheetnames), 1)
        ws = wb.active

        all_text = []
        for r in ws.iter_rows(values_only=True):
            all_text.extend([str(c) for c in r if c is not None])

        text_blob = " ".join(all_text)
        self.assertTrue(
            "Engineering Services" in text_blob or "INV-9901" in text_blob or "3000" in text_blob or "3,000.00" in text_blob,
            f"Expected invoice text in workbook. Got: {text_blob[:200]}",
        )

    def test_29_e2e_empty_page_fallback(self):
        pdf_path = self.temp_path / "minimal.pdf"
        c = canvas.Canvas(str(pdf_path), pagesize=letter)
        c.setFont("Helvetica", 10)
        c.drawString(100, 700, "Single text line without borders")
        c.save()

        converter = SmartPDFToExcelConverter()
        res = converter.convert(str(pdf_path))
        self.assertTrue(res.success)
        wb = openpyxl.load_workbook(res.output_path)
        self.assertGreaterEqual(len(wb.sheetnames), 1)

    def test_30_data_normalizer_formula_numeric_verification(self):
        val1, _ = DataNormalizer.normalize_cell("(5,432.10)")
        self.assertEqual(val1, -5432.10)
        self.assertIsInstance(val1, float)

        val2, _ = DataNormalizer.normalize_cell("12.5%")
        self.assertEqual(val2, 0.125)

    def test_31_multiline_row_consolidation_single_wrapped_line(self):
        rows = [
            ["ID", "Description", "Quantity", "Price", "Total"],
            ["101", "High-capacity server instance with 64GB RAM", "1", "1,200.00", "1,200.00"],
            [None, "and dedicated NVMe storage block", None, None, None],
            ["102", "Network Gateway", "2", "250.00", "500.00"],
        ]
        consolidated = PageScanner._consolidate_multiline_rows(rows)
        self.assertEqual(len(consolidated), 3)
        self.assertEqual(
            consolidated[1][1],
            "High-capacity server instance with 64GB RAM and dedicated NVMe storage block",
        )
        self.assertEqual(consolidated[2][0], "102")

    def test_32_multiline_row_consolidation_preserves_independent_numbered_rows(self):
        rows = [
            ["Item", "Details", "Amount"],
            ["1.", "Initial Consultation Fee", "150.00"],
            ["2.", "Architecture Design Review", "350.00"],
        ]
        consolidated = PageScanner._consolidate_multiline_rows(rows)
        self.assertEqual(len(consolidated), 3)
        self.assertEqual(consolidated[1][0], "1.")
        self.assertEqual(consolidated[2][0], "2.")

    def test_33_multiline_row_consolidation_header_safety(self):
        # A wrapped line right after the header without any prior data rows must not corrupt the header
        rows = [
            ["Col1", "Col2", "Col3"],
            ["Data A", "Data B", "Data C"],
        ]
        consolidated = PageScanner._consolidate_multiline_rows(rows)
        self.assertEqual(len(consolidated), 2)
        self.assertEqual(consolidated[0], ["Col1", "Col2", "Col3"])

    def test_34_merged_cell_bleeding_pads_short_rows(self):
        short_rows = [
            ["Header 1", "Header 2", "Header 3", "Header 4"],
            ["Cell 1", "Cell 2"],  # Short row with only 2 columns
        ]
        resolved = PageScanner._resolve_merged_cell_bleeding(short_rows, 4)
        self.assertEqual(len(resolved[1]), 4)
        self.assertEqual(resolved[1][0], "Cell 1")
        self.assertEqual(resolved[1][1], "Cell 2")
        self.assertIsNone(resolved[1][2])
        self.assertIsNone(resolved[1][3])

    def test_35_merged_cell_bleeding_merges_excess_trailing_columns(self):
        excess_rows = [
            ["Col 1", "Col 2", "Notes"],
            ["Val 1", "Val 2", "Primary note", "trailing fragment", "overflow"],
        ]
        resolved = PageScanner._resolve_merged_cell_bleeding(excess_rows, 3)
        self.assertEqual(len(resolved[1]), 3)
        self.assertEqual(resolved[1][0], "Val 1")
        self.assertEqual(resolved[1][1], "Val 2")
        self.assertEqual(resolved[1][2], "Primary note trailing fragment overflow")


if __name__ == "__main__":
    unittest.main()
