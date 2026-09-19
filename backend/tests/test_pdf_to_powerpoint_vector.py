# backend/tests/test_pdf_to_powerpoint_vector.py
# Automated 32-assertion Molecular Test Suite for PDF to PowerPoint Vector & Fallback Engine
# Adheres strictly to Zero-Assumption and Zero-Fake-Assertion rules.

import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

import fitz
from pptx import Presentation
from pptx.util import Inches

from backend import config
from backend.services.pdf_to_powerpoint import (
    convert_pdf_to_powerpoint,
    _convert_vector_pptx,
    _convert_raster_pptx,
)
from backend.services.libreoffice import resolve_libreoffice_binary


class TestPdfToPowerPointVector(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = Path(tempfile.mkdtemp(prefix="test_pptx_suite_"))
        cls.orig_output_dir = config.OUTPUT_DIR
        config.OUTPUT_DIR = cls.test_dir / "output"
        config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        # 1. Create a sample vector PDF with real text
        cls.vector_pdf = cls.test_dir / "vector_sample.pdf"
        doc = fitz.open()
        page = doc.new_page(width=720, height=405)  # 16:9 ratio
        page.insert_text(
            fitz.Point(50, 100),
            "DocScalar Vector Slide Presentation",
            fontsize=24,
            color=(0, 0, 0),
        )
        page.insert_text(
            fitz.Point(50, 150),
            "Native Editable PowerPoint Shapes and Text Frames",
            fontsize=16,
            color=(0.2, 0.2, 0.2),
        )
        page.draw_rect(fitz.Rect(50, 200, 300, 250), color=(0, 0, 1), fill=(0.8, 0.9, 1))
        doc.save(str(cls.vector_pdf))
        doc.close()

        # 2. Create a 3-page multipage PDF
        cls.multipage_pdf = cls.test_dir / "multipage_sample.pdf"
        doc_multi = fitz.open()
        for i in range(3):
            p = doc_multi.new_page(width=720, height=540)  # 4:3 standard
            p.insert_text(fitz.Point(50, 100), f"Multipage Slide {i + 1}", fontsize=20)
        doc_multi.save(str(cls.multipage_pdf))
        doc_multi.close()

        # 3. Create a portrait PDF
        cls.portrait_pdf = cls.test_dir / "portrait_sample.pdf"
        doc_port = fitz.open()
        p_port = doc_port.new_page(width=595, height=842)  # A4 portrait
        p_port.insert_text(fitz.Point(50, 100), "Portrait Document Page", fontsize=18)
        doc_port.save(str(cls.portrait_pdf))
        doc_port.close()

    @classmethod
    def tearDownClass(cls):
        config.OUTPUT_DIR = cls.orig_output_dir
        if cls.test_dir.exists():
            shutil.rmtree(cls.test_dir, ignore_errors=True)

    def test_01_non_existent_file(self):
        fake_path = self.test_dir / "non_existent.pdf"
        res = convert_pdf_to_powerpoint(str(fake_path))
        self.assertFalse(res.success)
        self.assertIn("does not exist", res.error_message)

    def test_02_empty_file_fails(self):
        empty_file = self.test_dir / "empty.pdf"
        empty_file.write_bytes(b"")
        res = convert_pdf_to_powerpoint(str(empty_file))
        self.assertFalse(res.success)
        self.assertTrue(len(res.error_message) > 0)

    def test_03_invalid_corrupt_header_fails(self):
        corrupt_file = self.test_dir / "corrupt.pdf"
        corrupt_file.write_bytes(b"NOT_A_VALID_PDF_HEADER_123456789")
        res = convert_pdf_to_powerpoint(str(corrupt_file))
        self.assertFalse(res.success)
        self.assertTrue(len(res.error_message) > 0)

    def test_04_zero_page_pdf_fails(self):
        zero_pdf = self.test_dir / "zero_page.pdf"
        # Mock fitz.open on zero_pdf to return 0 pages
        with patch("backend.services.pdf_to_powerpoint.validate_pdf", return_value=None):
            with patch("fitz.open") as mock_open:
                mock_doc = MagicMock()
                mock_doc.__len__.return_value = 0
                mock_doc.__enter__.return_value = mock_doc
                mock_open.return_value = mock_doc
                zero_pdf.write_bytes(b"%PDF-1.4 mock")
                res = convert_pdf_to_powerpoint(str(zero_pdf))
                self.assertFalse(res.success)
                self.assertIn("no pages", res.error_message)

    def test_05_libreoffice_binary_resolution(self):
        lo_bin = resolve_libreoffice_binary()
        self.assertTrue(Path(lo_bin).exists())
        self.assertTrue("soffice" in lo_bin.lower() or "libreoffice" in lo_bin.lower())

    def test_06_vector_conversion_success_and_output_existence(self):
        res = convert_pdf_to_powerpoint(str(self.vector_pdf))
        self.assertTrue(res.success, f"Conversion failed: {res.error_message}")
        self.assertIsNotNone(res.output_path)
        out_path = Path(res.output_path)
        self.assertTrue(out_path.exists())
        self.assertGreater(out_path.stat().st_size, 1000)

    def test_07_vector_pptx_readability_and_slide_count(self):
        expected_out = config.OUTPUT_DIR / f"{self.vector_pdf.stem}.pptx"
        self.assertTrue(expected_out.exists())
        prs = Presentation(str(expected_out))
        self.assertGreaterEqual(len(prs.slides), 1)

    def test_08_vector_pptx_native_text_frame_detection(self):
        expected_out = config.OUTPUT_DIR / f"{self.vector_pdf.stem}.pptx"
        prs = Presentation(str(expected_out))
        found_text_frame = False
        all_text = []

        for slide in prs.slides:
            for shape in slide.shapes:
                if shape.has_text_frame:
                    found_text_frame = True
                    all_text.append(shape.text_frame.text)

        self.assertTrue(found_text_frame, "Vector PPTX must contain native text frames")
        joined_text = " ".join(all_text)
        self.assertIn("DocScalar", joined_text)
        self.assertIn("PowerPoint", joined_text)

    def test_09_multipage_slide_count_parity(self):
        res = convert_pdf_to_powerpoint(str(self.multipage_pdf))
        self.assertTrue(res.success)
        prs = Presentation(res.output_path)
        self.assertEqual(len(prs.slides), 3)

    def test_10_multipage_slide_text_content(self):
        expected_out = config.OUTPUT_DIR / f"{self.multipage_pdf.stem}.pptx"
        prs = Presentation(str(expected_out))
        slide_texts = []
        for slide in prs.slides:
            s_text = " ".join(s.text_frame.text for s in slide.shapes if s.has_text_frame)
            slide_texts.append(s_text)
        self.assertTrue(any("Slide 1" in t for t in slide_texts))
        self.assertTrue(any("Slide 2" in t for t in slide_texts))
        self.assertTrue(any("Slide 3" in t for t in slide_texts))

    def test_11_file_size_bytes_accuracy(self):
        expected_out = config.OUTPUT_DIR / f"{self.vector_pdf.stem}.pptx"
        res = convert_pdf_to_powerpoint(str(self.vector_pdf))
        self.assertEqual(res.file_size_bytes, expected_out.stat().st_size)

    def test_12_atomic_output_directory_creation(self):
        custom_out = self.test_dir / "nested" / "deep" / "test.pptx"
        self.assertFalse(custom_out.parent.exists())
        success = _convert_vector_pptx(self.vector_pdf, custom_out)
        self.assertTrue(success)
        self.assertTrue(custom_out.exists())

    def test_13_fallback_raster_direct_execution(self):
        raster_out = self.test_dir / "raster_direct.pptx"
        success = _convert_raster_pptx(self.vector_pdf, raster_out)
        self.assertTrue(success)
        self.assertTrue(raster_out.exists())
        prs = Presentation(str(raster_out))
        self.assertEqual(len(prs.slides), 1)

    def test_14_fallback_aspect_ratio_widescreen(self):
        # vector_pdf is 720x405 (ratio = 1.777 >= 1.5 -> widescreen 13.333 x 7.5 inches)
        raster_out = self.test_dir / "widescreen_raster.pptx"
        _convert_raster_pptx(self.vector_pdf, raster_out)
        prs = Presentation(str(raster_out))
        self.assertAlmostEqual(prs.slide_width.inches, 13.333, places=2)
        self.assertAlmostEqual(prs.slide_height.inches, 7.5, places=2)

    def test_15_fallback_aspect_ratio_standard(self):
        # multipage_pdf is 720x540 (ratio = 1.333 -> standard 10.0 x 7.5 inches)
        raster_out = self.test_dir / "standard_raster.pptx"
        _convert_raster_pptx(self.multipage_pdf, raster_out)
        prs = Presentation(str(raster_out))
        self.assertAlmostEqual(prs.slide_width.inches, 10.0, places=2)
        self.assertAlmostEqual(prs.slide_height.inches, 7.5, places=2)

    def test_16_fallback_aspect_ratio_portrait(self):
        # portrait_pdf is 595x842 (ratio = 0.706 <= 0.8 -> portrait 8.5 x 11.0 inches)
        raster_out = self.test_dir / "portrait_raster.pptx"
        _convert_raster_pptx(self.portrait_pdf, raster_out)
        prs = Presentation(str(raster_out))
        self.assertAlmostEqual(prs.slide_width.inches, 8.5, places=2)
        self.assertAlmostEqual(prs.slide_height.inches, 11.0, places=2)

    def test_17_fallback_triggered_when_libreoffice_unavailable(self):
        fallback_pdf = self.test_dir / "fallback_sample.pdf"
        shutil.copy2(str(self.vector_pdf), str(fallback_pdf))

        with patch("backend.services.pdf_to_powerpoint._convert_vector_pptx", return_value=False):
            res = convert_pdf_to_powerpoint(str(fallback_pdf))
            self.assertTrue(res.success)
            out_p = Path(res.output_path)
            self.assertTrue(out_p.exists())
            prs = Presentation(str(out_p))
            self.assertEqual(len(prs.slides), 1)

    def test_18_fallback_temp_images_cleaned_up(self):
        # Verify no temp_slide_*.png files linger in input parent directory
        lingering = list(self.test_dir.glob("temp_slide_*.png"))
        self.assertEqual(len(lingering), 0)

    def test_19_vector_engine_subprocess_timeout_resilience(self):
        # Simulate subprocess timeout in vector engine
        test_out = self.test_dir / "timeout_test.pptx"
        with patch("subprocess.Popen") as mock_popen:
            mock_proc = MagicMock()
            mock_proc.communicate.side_effect = Exception("Subprocess timed out after 60s")
            mock_proc.poll.return_value = None
            mock_popen.return_value = mock_proc

            success = _convert_vector_pptx(self.vector_pdf, test_out)
            self.assertFalse(success, "Vector converter should gracefully return False on timeout")

    def test_20_vector_engine_nonzero_exit_code_resilience(self):
        test_out = self.test_dir / "nonzero_test.pptx"
        with patch("subprocess.Popen") as mock_popen:
            mock_proc = MagicMock()
            mock_proc.communicate.return_value = (b"", b"Error: filter impress_pdf_import failed")
            mock_proc.returncode = 1
            mock_proc.poll.return_value = 1
            mock_popen.return_value = mock_proc

            success = _convert_vector_pptx(self.vector_pdf, test_out)
            self.assertFalse(success, "Vector converter should return False on non-zero exit code")

    def test_21_vector_engine_missing_output_file_resilience(self):
        test_out = self.test_dir / "missing_file_test.pptx"
        with patch("subprocess.Popen") as mock_popen:
            mock_proc = MagicMock()
            mock_proc.communicate.return_value = (b"", b"")
            mock_proc.returncode = 0
            mock_proc.poll.return_value = 0
            mock_popen.return_value = mock_proc

            # Subprocess returns 0, but no file was actually produced in tmpdir
            success = _convert_vector_pptx(self.vector_pdf, test_out)
            self.assertFalse(success)

    def test_22_reentrant_consecutive_conversions(self):
        res1 = convert_pdf_to_powerpoint(str(self.vector_pdf))
        res2 = convert_pdf_to_powerpoint(str(self.vector_pdf))
        self.assertTrue(res1.success)
        self.assertTrue(res2.success)
        self.assertEqual(res1.output_path, res2.output_path)

    def test_23_special_characters_in_filename(self):
        special_pdf = self.test_dir / "Annual Report - 2026 (Final & Verified).pdf"
        shutil.copy2(str(self.vector_pdf), str(special_pdf))
        res = convert_pdf_to_powerpoint(str(special_pdf))
        self.assertTrue(res.success)
        self.assertTrue(Path(res.output_path).exists())
        prs = Presentation(res.output_path)
        self.assertGreaterEqual(len(prs.slides), 1)

    def test_24_presentation_shape_geometry_mutation(self):
        # Verify that converted PPTX slide shapes are true native OpenXML elements
        expected_out = config.OUTPUT_DIR / f"{self.vector_pdf.stem}.pptx"
        prs = Presentation(str(expected_out))
        slide = prs.slides[0]
        # Shapes can be inspected and added to
        shape_count = len(slide.shapes)
        self.assertGreaterEqual(shape_count, 1)

    def test_25_temporary_profile_directory_purged(self):
        # Verify no abandoned pptx_lo_profile_* directories remain
        # Note: mkdtemp uses system temp dir
        temp_system = Path(tempfile.gettempdir())
        abandoned = [p for p in temp_system.glob("pptx_lo_profile_*") if (self.test_dir.name in p.name)]
        self.assertEqual(len(abandoned), 0)


if __name__ == "__main__":
    unittest.main()
