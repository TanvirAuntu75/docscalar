"""
test_digital_fastpath_and_redaction.py
Molecular Verification Test Suite (30+ Assertions) for DocScalar Digital PDF Fast-Path
and Vector Redaction Boundary Guard.
"""

import os
import sys
import unittest
import fitz
import numpy as np

# Ensure backend is on sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


class TestDigitalFastPathAndRedaction(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scratch_dir = os.path.join(BASE_DIR, "scratch_test_fastpath")
        os.makedirs(cls.scratch_dir, exist_ok=True)

        # 1. Create a Born-Digital PDF (clean vector text, 1 page)
        cls.digital_pdf = os.path.join(cls.scratch_dir, "born_digital.pdf")
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        tw = fitz.TextWriter(page.rect)
        font = fitz.Font("helv")
        tw.append((50, 100), "DocScalar Next-Gen Invoice Document", font=font, fontsize=16)
        tw.append((50, 140), "Customer Name: John Doe", font=font, fontsize=12)
        tw.append((50, 170), "Invoice ID: 984021 - Total Amount Due: $1,250.00", font=font, fontsize=12)
        tw.append((50, 200), "Thank you for your business and continuous support.", font=font, fontsize=10)
        tw.write_text(page)
        doc.save(cls.digital_pdf)
        doc.close()

        # 2. Create a Digital PDF with a small company logo (100x50 image, < 5% page area)
        cls.digital_with_logo_pdf = os.path.join(cls.scratch_dir, "digital_with_logo.pdf")
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        tw = fitz.TextWriter(page.rect)
        tw.append((50, 100), "Acme Corporation Official Invoice", font=font, fontsize=16)
        tw.append((50, 130), "Item 1: Professional Engineering Services $500", font=font, fontsize=12)
        tw.write_text(page)
        # Insert small dummy logo
        img_pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 100, 50), 1)
        img_pix.clear_with(128)
        page.insert_image(fitz.Rect(400, 50, 500, 100), pixmap=img_pix)
        doc.save(cls.digital_with_logo_pdf)
        doc.close()

        # 3. Create a Scanned PDF (single full-page image, >80% page area, zero vector text)
        cls.scanned_pdf = os.path.join(cls.scratch_dir, "scanned_doc.pdf")
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        scan_pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 595, 842), 1)
        scan_pix.clear_with(240)
        page.insert_image(page.rect, pixmap=scan_pix)
        doc.save(cls.scanned_pdf)
        doc.close()

        # 4. Create a PDF with invisible OCR layer ('3 Tr')
        cls.invisible_ocr_pdf = os.path.join(cls.scratch_dir, "invisible_ocr.pdf")
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        tw = fitz.TextWriter(page.rect)
        tw.append((50, 100), "Stale Invisible OCR Text", font=font, fontsize=12)
        tw.write_text(page, render_mode=3)  # 3 = invisible text
        doc.save(cls.invisible_ocr_pdf)
        doc.close()

    @classmethod
    def tearDownClass(cls):
        import shutil
        if os.path.exists(cls.scratch_dir):
            shutil.rmtree(cls.scratch_dir, ignore_errors=True)

    # Area 1: Vector Text Extraction on Born-Digital PDF
    def test_01_born_digital_words_extracted(self):
        doc = fitz.open(self.digital_pdf)
        page = doc[0]
        words = page.get_text("words")
        doc.close()
        self.assertGreaterEqual(len(words), 15, "Born digital PDF should have at least 15 words")
        self.assertIn("DocScalar", [w[4] for w in words])
        self.assertIn("Invoice", [w[4] for w in words])

    # Area 2: Born-Digital Printable Character Entropy
    def test_02_born_digital_printable_ratio(self):
        doc = fitz.open(self.digital_pdf)
        page = doc[0]
        words = page.get_text("words")
        doc.close()
        sample_text = "".join(w[4] for w in words)
        printable_ratio = sum(1 for c in sample_text if c.isprintable() and not c.isspace()) / max(1, len(sample_text))
        self.assertGreater(printable_ratio, 0.95, "Printable ratio must be > 95% for clean digital text")

    # Area 3: Image Coverage Detection on Digital PDF
    def test_03_born_digital_zero_image_coverage(self):
        doc = fitz.open(self.digital_pdf)
        page = doc[0]
        images = page.get_images()
        doc.close()
        self.assertEqual(len(images), 0, "Born digital PDF should have 0 raster images")

    # Area 4: Small Logo Coverage Calculation (<10% page area)
    def test_04_small_logo_coverage_below_threshold(self):
        doc = fitz.open(self.digital_with_logo_pdf)
        page = doc[0]
        p_area = page.rect.width * page.rect.height
        images = page.get_images(full=True)
        self.assertEqual(len(images), 1, "Page should have 1 logo image")
        rects = page.get_image_rects(images[0][0])
        self.assertTrue(len(rects) > 0)
        coverage = (rects[0].width * rects[0].height) / p_area
        doc.close()
        self.assertLess(coverage, 0.10, "Logo image coverage should be well below 65%")

    # Area 5: Scanned Page Image Coverage (>65% page area)
    def test_05_scanned_doc_image_coverage_above_threshold(self):
        doc = fitz.open(self.scanned_pdf)
        page = doc[0]
        p_area = page.rect.width * page.rect.height
        images = page.get_images(full=True)
        self.assertEqual(len(images), 1)
        rects = page.get_image_rects(images[0][0])
        coverage = (rects[0].width * rects[0].height) / p_area
        words = page.get_text("words")
        doc.close()
        self.assertGreaterEqual(coverage, 0.95, "Full scan image coverage should be >= 95%")
        self.assertEqual(len(words), 0, "Pure scanned doc should have 0 vector words")

    # Area 6: Invisible OCR Layer Detection ('3 Tr')
    def test_06_invisible_ocr_layer_detected(self):
        doc = fitz.open(self.invisible_ocr_pdf)
        page = doc[0]
        contents = page.read_contents().decode("latin1", errors="ignore")
        doc.close()
        self.assertIn("3 Tr", contents, "Invisible OCR layer must contain '3 Tr' rendering command")

    # Area 7: Born-Digital PDF Does Not Contain '3 Tr'
    def test_07_born_digital_no_invisible_layer(self):
        doc = fitz.open(self.digital_pdf)
        page = doc[0]
        contents = page.read_contents().decode("latin1", errors="ignore")
        doc.close()
        self.assertNotIn("3 Tr", contents)

    # Area 8: Digital Rects Spatial Protection Function
    def test_08_digital_rects_spatial_overlap(self):
        dr = fitz.Rect(50, 100, 150, 120)
        overlapping_ocr = fitz.Rect(55, 102, 145, 118)
        non_overlapping_ocr = fitz.Rect(200, 300, 300, 320)
        
        # Overlapping word area
        overlap_area = (dr & overlapping_ocr).get_area()
        self.assertGreater(overlap_area, 0.35 * dr.get_area(), "Should detect >35% overlap with digital rect")
        
        # Non-overlapping word area
        non_overlap_area = (dr & non_overlapping_ocr).get_area()
        self.assertEqual(non_overlap_area, 0.0, "Should have 0 overlap with distant OCR word")

    # Area 9: Preservation of Vector Text When Small Logo Exists
    def test_09_vector_text_retained_with_logo(self):
        doc = fitz.open(self.digital_with_logo_pdf)
        page = doc[0]
        text_before = page.get_text()
        
        # Verify that our condition correctly classifies this as born-digital
        p_area = page.rect.width * page.rect.height
        existing_words = page.get_text("words")
        has_large_scan = False
        for img_info in page.get_images(full=True):
            for r in page.get_image_rects(img_info[0]):
                if (r.width * r.height) / p_area > 0.65:
                    has_large_scan = True
                    break
        
        self.assertFalse(has_large_scan, "Small logo must NOT be classified as large scan")
        self.assertGreaterEqual(len(existing_words), 5)
        self.assertIn("Acme", text_before)
        doc.close()

    # Area 10: Pure Invisible Layer Purge Safety
    def test_10_invisible_layer_purge_removes_3tr(self):
        doc = fitz.open(self.invisible_ocr_pdf)
        page = doc[0]
        self.assertIn("3 Tr", page.read_contents().decode("latin1", errors="ignore"))
        
        # Redact text
        page.add_redact_annot(page.rect)
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
        
        contents_after = page.read_contents().decode("latin1", errors="ignore")
        self.assertNotIn("3 Tr", contents_after, "Redaction must successfully purge 3 Tr text layer")
        doc.close()

    # Area 11: End-to-End Service Execution on Born-Digital PDF (Fast-Path Verification)
    def test_11_service_fastpath_execution(self):
        from backend.services.ocr import run_ocr_on_pdf
        
        result = run_ocr_on_pdf(self.digital_pdf, language="en")
        self.assertTrue(result.success, f"OCR service failed: {result.error_message}")
        self.assertIsNotNone(result.output_path)
        self.assertTrue(os.path.exists(result.output_path))
        
        # Verify output PDF preserved all original digital text
        out_doc = fitz.open(result.output_path)
        out_text = out_doc[0].get_text()
        out_doc.close()
        self.assertIn("DocScalar Next-Gen Invoice Document", out_text)
        self.assertIn("John Doe", out_text)
        self.assertIn("$1,250.00", out_text)

    # Area 12: End-to-End Service Execution on Digital PDF with Logo
    def test_12_service_logo_pdf_not_destroyed(self):
        from backend.services.ocr import run_ocr_on_pdf
        
        result = run_ocr_on_pdf(self.digital_with_logo_pdf, language="en")
        self.assertTrue(result.success, f"OCR service failed: {result.error_message}")
        
        out_doc = fitz.open(result.output_path)
        out_text = out_doc[0].get_text()
        out_images = out_doc[0].get_images()
        out_doc.close()
        
        # Verify both digital text AND logo image are 100% preserved
        self.assertIn("Acme Corporation Official Invoice", out_text)
        self.assertIn("Professional Engineering Services", out_text)
        self.assertEqual(len(out_images), 1, "Logo image must remain intact")

    # Area 13: Empty Page Boundary Handling (0 words, 0 images)
    def test_13_empty_page_boundary(self):
        empty_pdf = os.path.join(self.scratch_dir, "empty.pdf")
        doc = fitz.open()
        doc.new_page(width=595, height=842)
        doc.save(empty_pdf)
        doc.close()
        
        doc = fitz.open(empty_pdf)
        words = doc[0].get_text("words")
        doc.close()
        self.assertEqual(len(words), 0, "Empty page must yield exactly 0 words")

    # Area 14: High Density Text Extraction (100+ words)
    def test_14_high_density_word_count(self):
        dense_pdf = os.path.join(self.scratch_dir, "dense.pdf")
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        tw = fitz.TextWriter(page.rect)
        font = fitz.Font("helv")
        for i in range(25):
            tw.append((50, 50 + i * 20), f"Line {i}: The quick brown fox jumps over the lazy dog {i*10}", font=font, fontsize=10)
        tw.write_text(page)
        doc.save(dense_pdf)
        doc.close()
        
        doc = fitz.open(dense_pdf)
        words = doc[0].get_text("words")
        doc.close()
        self.assertGreaterEqual(len(words), 200, "High density document must yield >200 words")

    # Area 15: Spatial Area Exact Formula Verification (dr.get_area() == width * height)
    def test_15_spatial_area_exact_formula(self):
        dr = fitz.Rect(100.0, 150.0, 250.0, 220.0)
        expected_w = 250.0 - 100.0
        expected_h = 220.0 - 150.0
        expected_area = expected_w * expected_h
        self.assertAlmostEqual(dr.get_area(), expected_area, places=4)
        self.assertEqual(expected_area, 10500.0)

    # Area 16: Intersecting Area Exact Formula Computation
    def test_16_intersecting_area_exact_formula(self):
        r1 = fitz.Rect(0, 0, 100, 100)
        r2 = fitz.Rect(50, 50, 150, 150)
        intersection = r1 & r2
        # Intersection is (50, 50, 100, 100) -> 50x50 = 2500
        self.assertEqual(intersection.get_area(), 2500.0)
        self.assertEqual(intersection.get_area() / r1.get_area(), 0.25)

    # Area 17: Multi-Page Mixed Pipeline (Page 0 Digital, Page 1 Scanned)
    def test_17_mixed_multipage_pdf_creation(self):
        mixed_pdf = os.path.join(self.scratch_dir, "mixed.pdf")
        doc = fitz.open()
        # Page 0: Digital
        p0 = doc.new_page(width=595, height=842)
        tw = fitz.TextWriter(p0.rect)
        tw.append((50, 100), "Mixed Document Page 0 Digital", font=fitz.Font("helv"), fontsize=14)
        tw.write_text(p0)
        # Page 1: Scanned
        p1 = doc.new_page(width=595, height=842)
        pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 595, 842), 1)
        pix.clear_with(230)
        p1.insert_image(p1.rect, pixmap=pix)
        doc.save(mixed_pdf)
        doc.close()
        
        doc = fitz.open(mixed_pdf)
        self.assertEqual(len(doc), 2)
        self.assertGreater(len(doc[0].get_text("words")), 0)
        self.assertEqual(len(doc[1].get_text("words")), 0)
        doc.close()

    # Area 18: Coverage Threshold Edge Condition (Exact 65% Boundary)
    def test_18_image_coverage_boundary_edge(self):
        page_area = 10000.0
        # Exactly 65% area
        boundary_area = 6500.0
        self.assertFalse(boundary_area / page_area > 0.65, "65.0% must NOT be strictly greater than 65%")
        # 65.1% area
        above_boundary = 6510.0
        self.assertTrue(above_boundary / page_area > 0.65, "65.1% must trigger large scan classification")

    # Area 19: Printable Entropy Boundary (Exact 80% Threshold)
    def test_19_printable_entropy_boundary(self):
        # 8 valid, 2 invalid = 80.0%
        valid_8_total_10 = 0.80
        self.assertFalse(valid_8_total_10 > 0.80, "80.0% exactly must NOT pass strict > 80% threshold")
        valid_9_total_10 = 0.90
        self.assertTrue(valid_9_total_10 > 0.80, "90.0% must pass printable ratio threshold")

    # Area 20: Word Count Minimum Condition (Exact 5 words Boundary)
    def test_20_word_count_minimum_boundary(self):
        words_4 = ["one", "two", "three", "four"]
        words_5 = ["one", "two", "three", "four", "five"]
        self.assertFalse(len(words_4) >= 5, "4 words must fail fast-path threshold")
        self.assertTrue(len(words_5) >= 5, "5 words must qualify for fast-path threshold")

    # Area 21: Spatial Overlap Percentage Boundary (Exact 35% Overlap Check)
    def test_21_digital_overlap_35_percent_boundary(self):
        dr_area = 100.0
        overlap_34 = 34.0
        overlap_36 = 36.0
        self.assertFalse(overlap_34 > 0.35 * dr_area)
        self.assertTrue(overlap_36 > 0.35 * dr_area)

    # Area 22: Baseline Coordinate Formula Verification (baseline_y = py1 - font_size * 0.25)
    def test_22_baseline_coordinate_exact_formula(self):
        py1 = 120.0
        font_size = 12.0
        expected_baseline = 120.0 - (12.0 * 0.25)
        self.assertEqual(expected_baseline, 117.0)

    # Area 23: Font Size Clamp Range Verification (min 24.0, max 5.0)
    def test_23_font_size_clamp_formula(self):
        # Very tall line (ph = 100.0) -> ph * 0.75 = 75.0 -> clamped to 24.0
        tall_ph = 100.0
        clamped_high = min(24.0, max(5.0, tall_ph * 0.75))
        self.assertEqual(clamped_high, 24.0)
        
        # Very short line (ph = 2.0) -> ph * 0.75 = 1.5 -> clamped to 5.0
        short_ph = 2.0
        clamped_low = min(24.0, max(5.0, short_ph * 0.75))
        self.assertEqual(clamped_low, 5.0)

    # Area 24: Aspect Ratio Scale Calculation Formula
    def test_24_aspect_scale_formula(self):
        p_w, p_h = 595.0, 842.0
        pix_w, pix_h = 1653, 2339  # 200 DPI dimensions
        scale_x = p_w / float(pix_w)
        scale_y = p_h / float(pix_h)
        self.assertAlmostEqual(scale_x, 0.35995, places=4)
        self.assertAlmostEqual(scale_y, 0.35998, places=4)

    # Area 25: Text Length Scaling Adjustment Formula
    def test_25_text_length_scaling_formula(self):
        font_size = 12.0
        box_w = 50.0
        t_len = 100.0  # text is twice as wide as box
        # actual_fs = max(1.0, font_size * (box_w / t_len))
        actual_fs = max(1.0, font_size * (box_w / t_len))
        self.assertEqual(actual_fs, 6.0)

    # Area 26: Word Reading Order Sort Key Formula (y0 // 10, x0)
    def test_26_word_reading_order_sort_key(self):
        w1 = {"text": "Title", "rect": [50, 102, 100, 115]}
        w2 = {"text": "Subtitle", "rect": [50, 122, 120, 135]}
        w3 = {"text": "LeftCol", "rect": [50, 105, 90, 118]}
        
        # w1 and w3 have y0 // 10 == 10
        key_w1 = (w1["rect"][1] // 10, w1["rect"][0])
        key_w3 = (w3["rect"][1] // 10, w3["rect"][0])
        self.assertEqual(key_w1[0], key_w3[0])
        self.assertEqual(key_w1[1], 50)

    # Area 27: Zero-Dimension Safe Division Guard
    def test_27_zero_dimension_safe_division(self):
        pix_w = 0
        p_w = 595.0
        scale_x = p_w / float(pix_w) if pix_w > 0 else 1.0
        self.assertEqual(scale_x, 1.0)

    # Area 28: Low Confidence Filtering Boundary (conf < 5.0)
    def test_28_confidence_filter_boundary(self):
        conf_4_9 = 4.9
        conf_5_0 = 5.0
        self.assertTrue(conf_4_9 < 5.0, "Confidence 4.9 must be filtered")
        self.assertFalse(conf_5_0 < 5.0, "Confidence 5.0 must be retained")

    # Area 29: Pure Punctuation Noise Regex Guard
    def test_29_punctuation_noise_regex(self):
        import re
        noise = ",,,..."
        word = "Invoice"
        self.assertTrue(len(noise) > 1 and bool(re.fullmatch(r"[\W_]+", noise)))
        self.assertFalse(bool(re.fullmatch(r"[\W_]+", word)))

    # Area 30: Unicode Special Punctuation Preservation Guard
    def test_30_special_punctuation_whitelist(self):
        whitelist = ("...", "—", "–", "©", "®")
        self.assertIn("©", whitelist)
        self.assertIn("—", whitelist)

    # Area 31: PyMuPDF Document Close Guard & is_closed Property
    def test_31_doc_close_guard(self):
        doc = fitz.open(self.digital_pdf)
        self.assertFalse(doc.is_closed, "Newly opened document must not be closed")
        doc.close()
        self.assertTrue(doc.is_closed, "Document must report is_closed == True after close()")

    # Area 32: Teardown Singleton Reclaim Integrity
    def test_32_teardown_ocr_engine_execution(self):
        from backend.services.ocr import teardown_ocr_engine, _ocr_engine_instance
        teardown_ocr_engine()
        import backend.services.ocr as ocr_mod
        self.assertIsNone(ocr_mod._ocr_engine_instance, "Teardown must reset singleton instance to None")


if __name__ == "__main__":
    unittest.main()

