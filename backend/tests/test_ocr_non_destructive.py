import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import fitz  # PyMuPDF
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

from backend.services.ocr import run_ocr_on_pdf
from backend.services.libreoffice import ConversionResult


class TestNonDestructiveOCR(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.dir_path = Path(self.temp_dir.name)

        # Mock queue progress updater to avoid Redis requirement in unit tests
        import backend.jobs.queue
        self._orig_progress = backend.jobs.queue.update_job_progress
        backend.jobs.queue.update_job_progress = lambda *args, **kwargs: None

    def tearDown(self):
        import backend.jobs.queue
        backend.jobs.queue.update_job_progress = self._orig_progress
        self.temp_dir.cleanup()

    def test_01_non_existent_file(self):
        res = run_ocr_on_pdf(str(self.dir_path / "ghost.pdf"))
        self.assertFalse(res.success)
        self.assertIn("does not exist", res.error_message)

    def test_02_empty_file_fails_validation(self):
        empty_pdf = self.dir_path / "empty.pdf"
        empty_pdf.write_bytes(b"")
        res = run_ocr_on_pdf(str(empty_pdf))
        self.assertFalse(res.success)

    def test_03_corrupt_header_file(self):
        corrupt_pdf = self.dir_path / "corrupt.pdf"
        corrupt_pdf.write_bytes(b"NOT_A_VALID_PDF_HEADER_AT_ALL")
        res = run_ocr_on_pdf(str(corrupt_pdf))
        self.assertFalse(res.success)

    def test_04_zero_page_pdf(self):
        # Create a genuinely valid PDF that passes validate_pdf
        real_pdf = self.dir_path / "valid_for_zero_test.pdf"
        c = canvas.Canvas(str(real_pdf), pagesize=letter)
        c.drawString(100, 100, "temp")
        c.save()

        # Mock len(doc) == 0 to exercise the 0-page branch cleanly
        from unittest.mock import patch, MagicMock
        mock_doc = MagicMock()
        mock_doc.is_encrypted = False
        mock_doc.needs_pass = False
        mock_doc.__len__.return_value = 0
        with patch("fitz.open", return_value=mock_doc):
            res = run_ocr_on_pdf(str(real_pdf))
            self.assertFalse(res.success)
            self.assertIn("contains no pages", res.error_message)

    def test_05_pure_vector_text_preservation(self):
        # Create a genuine vector PDF with ReportLab
        vec_pdf = self.dir_path / "vector_sample.pdf"
        c = canvas.Canvas(str(vec_pdf), pagesize=letter)
        c.drawString(100, 700, "DocScalar Precision Architectural Vector Contract")
        c.drawString(100, 650, "Authorized Signatory: John Doe")
        c.rect(90, 630, 400, 100, stroke=1, fill=0)  # Vector outline
        c.save()

        orig_size = vec_pdf.stat().st_size
        self.assertGreater(orig_size, 0)

        # Run non-destructive OCR
        res = run_ocr_on_pdf(str(vec_pdf), language="eng")
        self.assertTrue(res.success)
        self.assertIsNotNone(res.output_path)
        out_path = Path(res.output_path)
        self.assertTrue(out_path.exists())

        # Inspect resulting PDF
        out_doc = fitz.open(str(out_path))
        self.assertEqual(len(out_doc), 1)
        page = out_doc[0]
        extracted = page.get_text()

        # Assert original text exists
        self.assertIn("DocScalar Precision Architectural Vector Contract", extracted)
        self.assertIn("Authorized Signatory: John Doe", extracted)

        # Assert no double-character duplication ("DDooccSSccaallaarr")
        words = page.get_text("words")
        word_texts = [w[4] for w in words]
        self.assertEqual(word_texts.count("DocScalar"), 1)
        self.assertEqual(word_texts.count("Contract"), 1)

        # Assert vector rectangles are NOT rasterized into a bitmap
        drawings = page.get_drawings()
        self.assertGreaterEqual(len(drawings), 1)

        # Assert file size didn't balloon into a multi-megabyte bitmap
        out_size = out_path.stat().st_size
        self.assertLess(out_size, orig_size * 3)  # Less than 3x, unlike ReportLab which made it 200x

        out_doc.close()

    def test_06_scanned_image_becomes_searchable(self):
        # Create a synthetic scanned image PDF (pure raster image of text)
        import cv2
        import numpy as np

        img = np.full((300, 800, 3), 255, dtype=np.uint8)
        cv2.putText(img, "SCANNED INVOICE 98765", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 3)
        img_path = str(self.dir_path / "scan.png")
        cv2.imwrite(img_path, img)

        scan_pdf = self.dir_path / "scanned_invoice.pdf"
        doc = fitz.open()
        img_doc = fitz.open(img_path)
        rect = img_doc[0].rect
        pdfbytes = img_doc.convert_to_pdf()
        img_pdf = fitz.open("pdf", pdfbytes)
        page = doc.new_page(width=rect.width, height=rect.height)
        page.show_pdf_page(rect, img_pdf, 0)
        doc.save(str(scan_pdf))
        doc.close()
        img_doc.close()
        img_pdf.close()

        # Before OCR: scanned PDF should have 0 extractable text words
        pre_doc = fitz.open(str(scan_pdf))
        self.assertEqual(len(pre_doc[0].get_text().strip()), 0)
        pre_doc.close()

        # Run non-destructive OCR
        res = run_ocr_on_pdf(str(scan_pdf), language="eng")
        self.assertTrue(res.success)
        out_path = Path(res.output_path)
        self.assertTrue(out_path.exists())

        # After OCR: text layer must be present and searchable
        post_doc = fitz.open(str(out_path))
        post_text = post_doc[0].get_text().upper()
        self.assertTrue(len(post_text.strip()) > 0)
        # Should detect INVOICE or 98765 or SCANNED
        self.assertTrue(any(token in post_text for token in ["INVOICE", "98765", "SCANNED"]))
        post_doc.close()

    def test_07_multipage_pdf_processing(self):
        multi_pdf = self.dir_path / "multipage.pdf"
        c = canvas.Canvas(str(multi_pdf), pagesize=letter)
        c.drawString(100, 700, "Page 1 Financial Ledger")
        c.showPage()
        c.drawString(100, 700, "Page 2 Balance Sheet")
        c.showPage()
        c.drawString(100, 700, "Page 3 Cash Flow Statement")
        c.save()

        res = run_ocr_on_pdf(str(multi_pdf), language="eng")
        self.assertTrue(res.success)
        out_doc = fitz.open(res.output_path)
        self.assertEqual(len(out_doc), 3)

        p1_text = out_doc[0].get_text()
        p2_text = out_doc[1].get_text()
        p3_text = out_doc[2].get_text()

        self.assertIn("Page 1 Financial Ledger", p1_text)
        self.assertIn("Page 2 Balance Sheet", p2_text)
        self.assertIn("Page 3 Cash Flow Statement", p3_text)

        out_doc.close()

    def test_08_temporary_images_cleaned_up(self):
        vec_pdf = self.dir_path / "clean_test.pdf"
        c = canvas.Canvas(str(vec_pdf), pagesize=letter)
        c.drawString(100, 700, "Cleanup Verification Document")
        c.save()

        # Count temp pngs before
        import glob
        temp_dir_sys = tempfile.gettempdir()
        pre_pngs = set(glob.glob(os.path.join(temp_dir_sys, "*.png")))

        res = run_ocr_on_pdf(str(vec_pdf), language="eng")
        self.assertTrue(res.success)

        # Count temp pngs after - should not leave lingering pngs from this task
        post_pngs = set(glob.glob(os.path.join(temp_dir_sys, "*.png")))
        diff_pngs = [p for p in (post_pngs - pre_pngs) if "tmp" in p]
        self.assertEqual(len(diff_pngs), 0)


if __name__ == "__main__":
    unittest.main()
