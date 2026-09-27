import io
import json
import os
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import fitz

from backend.services.pdf_ops import (
    _hex_to_rgb,
    add_page_numbers,
    add_watermark,
    crop_pdf,
    extract_pages,
    image_to_pdf,
    merge_pdfs,
    pdf_to_images,
    remove_pages,
    rotate_pdf,
)
from backend import config


def create_sample_pdf(num_pages: int = 3, text_prefix: str = "Page") -> str:
    """Helper to create a temporary test PDF with specified number of pages."""
    doc = fitz.open()
    for i in range(num_pages):
        page = doc.new_page(width=595, height=842)  # A4 size
        page.insert_text(fitz.Point(72, 72), f"{text_prefix} {i + 1}", fontsize=18)
    
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    doc.save(path)
    doc.close()
    return path


def create_sample_image(width: int = 200, height: int = 200, color: tuple = (255, 0, 0)) -> str:
    """Helper to create a temporary test PNG image."""
    pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, width, height), 0)
    pix.set_rect(fitz.IRect(0, 0, width, height), color)
    fd, path = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    pix.save(path)
    return path


class TestPdfOpsServerSuite(unittest.TestCase):
    def setUp(self):
        self.temp_files = []

    def tearDown(self):
        for f in self.temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception:
                pass

    def track_file(self, path: str) -> str:
        self.temp_files.append(path)
        return path

    # Area 1: merge_pdfs combines files and preserves page counts
    def test_01_merge_pdfs_success(self):
        pdf1 = self.track_file(create_sample_pdf(2, "DocA"))
        pdf2 = self.track_file(create_sample_pdf(3, "DocB"))
        res = merge_pdfs([pdf1, pdf2])
        self.assertTrue(res.success)
        self.assertIsNotNone(res.output_path)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            self.assertEqual(len(out), 5)

    # Area 2: merge_pdfs rejects nonexistent file
    def test_02_merge_pdfs_nonexistent(self):
        res = merge_pdfs(["/tmp/definitely_not_existing_xyz_123.pdf"])
        self.assertFalse(res.success)
        self.assertIn("File not found", res.error_message)

    # Area 3: merge_pdfs rejects empty list
    def test_03_merge_pdfs_empty(self):
        res = merge_pdfs([])
        self.assertFalse(res.success)
        self.assertIn("No input files provided", res.error_message)

    # Area 4: rotate_pdf rotates all pages 90 degrees
    def test_04_rotate_pdf_90(self):
        pdf = self.track_file(create_sample_pdf(2))
        res = rotate_pdf(pdf, angle=90)
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            self.assertEqual(out[0].rotation, 90)
            self.assertEqual(out[1].rotation, 90)

    # Area 5: rotate_pdf rotates all pages 180 degrees
    def test_05_rotate_pdf_180(self):
        pdf = self.track_file(create_sample_pdf(1))
        res = rotate_pdf(pdf, angle=180)
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            self.assertEqual(out[0].rotation, 180)

    # Area 6: rotate_pdf rotates selective page subset
    def test_06_rotate_pdf_selective_pages(self):
        pdf = self.track_file(create_sample_pdf(3))
        res = rotate_pdf(pdf, angle=90, pages=[2])
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            self.assertEqual(out[0].rotation, 0)
            self.assertEqual(out[1].rotation, 90)
            self.assertEqual(out[2].rotation, 0)

    # Area 7: crop_pdf applies uniform margins
    def test_07_crop_pdf_uniform_margins(self):
        pdf = self.track_file(create_sample_pdf(1))
        res = crop_pdf(pdf, margin_top=50, margin_bottom=50, margin_left=30, margin_right=30)
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            cb = out[0].cropbox
            self.assertEqual(cb.x0, 30.0)
            self.assertEqual(cb.y0, 50.0)
            self.assertEqual(cb.x1, 595.0 - 30.0)
            self.assertEqual(cb.y1, 842.0 - 50.0)

    # Area 8: crop_pdf applies custom crop boxes per page
    def test_08_crop_pdf_custom_boxes(self):
        pdf = self.track_file(create_sample_pdf(2))
        boxes = {"1": {"x0": 40, "y0": 60, "x1": 500, "y1": 700}}
        res = crop_pdf(pdf, crop_boxes=boxes)
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            self.assertEqual(out[0].cropbox.x0, 40.0)
            self.assertEqual(out[0].cropbox.y0, 60.0)
            self.assertEqual(out[1].cropbox.x0, 0.0)

    # Area 9: add_watermark inserts text watermark
    def test_09_add_watermark_text(self):
        pdf = self.track_file(create_sample_pdf(2))
        res = add_watermark(pdf, watermark_type="text", text="INTERNAL_AUDIT", color="#FF0000", opacity=0.3)
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            text0 = out[0].get_text()
            self.assertIn("INTERNAL_AUDIT", text0)

    # Area 10: add_watermark inserts image watermark
    def test_10_add_watermark_image(self):
        pdf = self.track_file(create_sample_pdf(1))
        img = self.track_file(create_sample_image(100, 100))
        res = add_watermark(pdf, watermark_type="image", image_path=img)
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            images = out[0].get_images()
            self.assertGreaterEqual(len(images), 1)

    # Area 11: add_page_numbers formats and stamps bottom-center
    def test_11_add_page_numbers_bottom_center(self):
        pdf = self.track_file(create_sample_pdf(3))
        res = add_page_numbers(pdf, format_str="Page {page} of {total}", position="bottom-center")
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            self.assertIn("Page 1 of 3", out[0].get_text())
            self.assertIn("Page 2 of 3", out[1].get_text())
            self.assertIn("Page 3 of 3", out[2].get_text())

    # Area 12: add_page_numbers formats and stamps top-right
    def test_12_add_page_numbers_top_right(self):
        pdf = self.track_file(create_sample_pdf(1))
        res = add_page_numbers(pdf, format_str="Ref #{n}", position="top-right", start_page=10)
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            self.assertIn("Ref #10", out[0].get_text())

    # Area 13: pdf_to_images single-page direct image output
    def test_13_pdf_to_images_single_page(self):
        pdf = self.track_file(create_sample_pdf(1))
        res = pdf_to_images(pdf, dpi=100, image_format="png")
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        self.assertTrue(res.output_path.endswith(".png"))
        self.assertGreater(res.file_size_bytes, 100)

    # Area 14: pdf_to_images multi-page creates valid zip
    def test_14_pdf_to_images_multi_page_zip(self):
        pdf = self.track_file(create_sample_pdf(3))
        res = pdf_to_images(pdf, dpi=100, image_format="jpg")
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        self.assertTrue(res.output_path.endswith(".zip"))
        with zipfile.ZipFile(res.output_path, "r") as zf:
            names = zf.namelist()
            self.assertEqual(len(names), 3)
            self.assertIn("page_0001.jpg", names)
            self.assertIn("page_0002.jpg", names)
            self.assertIn("page_0003.jpg", names)

    # Area 15: pdf_to_images selective pages
    def test_15_pdf_to_images_selective_pages(self):
        pdf = self.track_file(create_sample_pdf(4))
        res = pdf_to_images(pdf, dpi=72, pages=[2, 4])
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with zipfile.ZipFile(res.output_path, "r") as zf:
            names = zf.namelist()
            self.assertEqual(len(names), 2)
            self.assertIn("page_0002.png", names)
            self.assertIn("page_0004.png", names)

    # Area 16: extract_pages extracts exact page indices
    def test_16_extract_pages(self):
        pdf = self.track_file(create_sample_pdf(5, "Section"))
        res = extract_pages(pdf, [2, 4])
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            self.assertEqual(len(out), 2)
            self.assertIn("Section 2", out[0].get_text())
            self.assertIn("Section 4", out[1].get_text())

    # Area 17: extract_pages rejects invalid page list
    def test_17_extract_pages_invalid_indices(self):
        pdf = self.track_file(create_sample_pdf(2))
        res = extract_pages(pdf, [99, 100])
        self.assertFalse(res.success)
        self.assertIn("No valid pages specified", res.error_message)

    # Area 18: remove_pages deletes exact page indices
    def test_18_remove_pages(self):
        pdf = self.track_file(create_sample_pdf(4, "Keep"))
        res = remove_pages(pdf, [1, 3])
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            self.assertEqual(len(out), 2)
            self.assertIn("Keep 2", out[0].get_text())
            self.assertIn("Keep 4", out[1].get_text())

    # Area 19: remove_pages rejects deleting all pages
    def test_19_remove_pages_all(self):
        pdf = self.track_file(create_sample_pdf(2))
        res = remove_pages(pdf, [1, 2])
        self.assertFalse(res.success)
        self.assertIn("Cannot remove all pages", res.error_message)

    # Area 20: image_to_pdf converts multiple images into single PDF
    def test_20_image_to_pdf(self):
        img1 = self.track_file(create_sample_image(200, 200, (255, 0, 0)))
        img2 = self.track_file(create_sample_image(300, 300, (0, 255, 0)))
        res = image_to_pdf([img1, img2])
        self.assertTrue(res.success)
        self.track_file(res.output_path)
        with fitz.open(res.output_path) as out:
            self.assertEqual(len(out), 2)

    # Area 21: image_to_pdf rejects empty list
    def test_21_image_to_pdf_empty(self):
        res = image_to_pdf([])
        self.assertFalse(res.success)
        self.assertIn("No images provided", res.error_message)

    # Area 22: _hex_to_rgb 6-digit hex parsing
    def test_22_hex_to_rgb_standard(self):
        r, g, b = _hex_to_rgb("#00FF00")
        self.assertAlmostEqual(r, 0.0, places=3)
        self.assertAlmostEqual(g, 1.0, places=3)
        self.assertAlmostEqual(b, 0.0, places=3)

    # Area 23: _hex_to_rgb 3-digit shorthand
    def test_23_hex_to_rgb_shorthand(self):
        r, g, b = _hex_to_rgb("#FFF")
        self.assertAlmostEqual(r, 1.0, places=3)
        self.assertAlmostEqual(g, 1.0, places=3)
        self.assertAlmostEqual(b, 1.0, places=3)

    # Area 24: _hex_to_rgb fallback on malformed hex
    def test_24_hex_to_rgb_fallback(self):
        rgb = _hex_to_rgb("not_a_color")
        self.assertEqual(len(rgb), 3)

    # Area 25: FastAPI app route registration verification
    def test_25_route_merge_pdf_registered(self):
        from backend.main import app
        routes = [r.path for r in app.routes]
        self.assertIn("/api/convert/merge-pdf", routes)

    def test_26_route_rotate_pdf_registered(self):
        from backend.main import app
        routes = [r.path for r in app.routes]
        self.assertIn("/api/convert/rotate-pdf", routes)

    def test_27_route_crop_pdf_registered(self):
        from backend.main import app
        routes = [r.path for r in app.routes]
        self.assertIn("/api/convert/crop-pdf", routes)

    def test_28_route_add_watermark_registered(self):
        from backend.main import app
        routes = [r.path for r in app.routes]
        self.assertIn("/api/convert/add-watermark", routes)

    def test_29_route_add_page_numbers_registered(self):
        from backend.main import app
        routes = [r.path for r in app.routes]
        self.assertIn("/api/convert/add-page-numbers", routes)

    def test_30_route_pdf_to_image_registered(self):
        from backend.main import app
        routes = [r.path for r in app.routes]
        self.assertIn("/api/convert/pdf-to-image", routes)

    def test_31_route_extract_pages_registered(self):
        from backend.main import app
        routes = [r.path for r in app.routes]
        self.assertIn("/api/convert/extract-pages", routes)

    def test_32_route_remove_pages_registered(self):
        from backend.main import app
        routes = [r.path for r in app.routes]
        self.assertIn("/api/convert/remove-pages", routes)

    def test_33_route_image_to_pdf_registered(self):
        from backend.main import app
        routes = [r.path for r in app.routes]
        self.assertIn("/api/convert/image-to-pdf", routes)


if __name__ == "__main__":
    unittest.main()
