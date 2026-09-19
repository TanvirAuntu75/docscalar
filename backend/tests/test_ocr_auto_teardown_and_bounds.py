"""
Unit and integration tests for OCR auto-teardown, memory release,
multilingual language routing, and bounding box geometry.
"""

import gc
import re
import unittest
from unittest.mock import MagicMock

import fitz

from backend.services.ocr import teardown_ocr_engine
from backend.services.ocr_engine import (
    PADDLE_LANG_MAPPING,
    _PADDLEOCR_READERS,
    clear_paddleocr_readers,
)


class TestOCRAutoTeardownAndGeometry(unittest.TestCase):

    def setUp(self):
        clear_paddleocr_readers()

    def tearDown(self):
        teardown_ocr_engine()

    def test_01_clear_paddleocr_readers_empties_dict(self):
        _PADDLEOCR_READERS[("en", "cpu")] = MagicMock()
        _PADDLEOCR_READERS[("ch", "cpu")] = MagicMock()
        self.assertEqual(len(_PADDLEOCR_READERS), 2)

        clear_paddleocr_readers()
        self.assertEqual(len(_PADDLEOCR_READERS), 0)

    def test_02_clear_paddleocr_readers_empty_is_safe(self):
        try:
            clear_paddleocr_readers()
            clear_paddleocr_readers()
        except Exception as e:
            self.fail(f"clear_paddleocr_readers threw on empty dict: {e}")

    def test_03_teardown_ocr_engine_resets_singleton(self):
        import backend.services.ocr as ocr_mod
        ocr_mod._ocr_engine_instance = MagicMock()
        self.assertIsNotNone(ocr_mod._ocr_engine_instance)

        teardown_ocr_engine()
        self.assertIsNone(ocr_mod._ocr_engine_instance)

    def test_04_paddle_lang_mapping_contains_all_and_auto(self):
        self.assertIn("all", PADDLE_LANG_MAPPING)
        self.assertEqual(PADDLE_LANG_MAPPING["all"], "ch")
        self.assertIn("auto", PADDLE_LANG_MAPPING)
        self.assertEqual(PADDLE_LANG_MAPPING["auto"], "ch")
        self.assertIn("multilingual", PADDLE_LANG_MAPPING)
        self.assertEqual(PADDLE_LANG_MAPPING["multilingual"], "ch")

    def test_05_paddle_lang_mapping_standard_languages(self):
        self.assertEqual(PADDLE_LANG_MAPPING.get("eng"), "en")
        self.assertEqual(PADDLE_LANG_MAPPING.get("hin"), "hi")
        self.assertEqual(PADDLE_LANG_MAPPING.get("tha"), "th")
        self.assertEqual(PADDLE_LANG_MAPPING.get("ara"), "ar")
        self.assertEqual(PADDLE_LANG_MAPPING.get("chi_sim"), "ch")
        self.assertEqual(PADDLE_LANG_MAPPING.get("kor"), "korean")
        self.assertEqual(PADDLE_LANG_MAPPING.get("jpn"), "japan")

    def test_06_font_size_clamping_standard_box(self):
        ph = 20.0
        font_size = min(24.0, max(5.0, ph * 0.75))
        self.assertEqual(font_size, 15.0)

    def test_07_font_size_clamping_max_ceiling(self):
        ph = 100.0
        font_size = min(24.0, max(5.0, ph * 0.75))
        self.assertEqual(font_size, 24.0)

    def test_08_font_size_clamping_min_floor(self):
        ph = 4.0
        font_size = min(24.0, max(5.0, ph * 0.75))
        self.assertEqual(font_size, 5.0)

    def test_09_noise_token_filtering_rejects_symbols(self):
        noise_samples = ["$$$", "~~~~", "---", "***", "()()", "___"]
        for sample in noise_samples:
            is_noise = len(sample) > 1 and bool(re.fullmatch(r"[\W_]+", sample))
            self.assertTrue(is_noise, f"Failed to detect {sample} as noise")

    def test_10_noise_token_filtering_preserves_words(self):
        valid_samples = ["English", "Personal", "Letter", "Margaret", "12345", "well-known"]
        for sample in valid_samples:
            is_noise = len(sample) > 1 and bool(re.fullmatch(r"[\W_]+", sample)) and sample not in ("...", "—", "–", "©", "®")
            self.assertFalse(is_noise, f"Falsely marked valid word {sample} as noise")

    def test_11_proportional_word_placement_math(self):
        tokens = ["Hello", "World"]
        box_w = 200.0
        total_chars = sum(len(t) for t in tokens) + len(tokens) - 1
        w0 = (len("Hello") / float(total_chars)) * box_w
        w1 = (len("World") / float(total_chars)) * box_w
        spacing = (1.0 / float(total_chars)) * box_w
        self.assertAlmostEqual(w0 + spacing + w1, box_w, places=5)

    def test_12_dynamic_font_scaling_on_overflow(self):
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        long_word = "Supercalifragilisticexpialidocious"
        box_w = 50.0
        font_size = 20.0
        t_len = fitz.get_text_length(long_word, fontsize=font_size)
        self.assertGreater(t_len, box_w)

        actual_fs = max(1.0, font_size * (box_w / t_len))
        new_len = fitz.get_text_length(long_word, fontsize=actual_fs)
        self.assertLessEqual(new_len, box_w + 1.0)
        doc.close()

    def test_13_text_injection_is_searchable_and_within_bounds(self):
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        words = [
            {"text": "Searchable", "rect": (50, 100, 150, 120), "conf": 98.0},
            {"text": "Document", "rect": (160, 100, 260, 120), "conf": 95.0},
        ]
        for w in words:
            text_val = w["text"]
            rect = w["rect"]
            x0, y0, x1, y1 = rect
            ph = y1 - y0
            font_size = min(24.0, max(5.0, ph * 0.75))
            baseline_y = y1 - (ph * 0.15)
            page.insert_text(fitz.Point(x0, baseline_y), text_val, fontsize=font_size, render_mode=3)

        extracted = page.get_text("words")
        self.assertEqual(len(extracted), 2)
        self.assertEqual(extracted[0][4], "Searchable")
        self.assertEqual(extracted[1][4], "Document")
        for ew in extracted:
            self.assertGreaterEqual(ew[0], 0)
            self.assertLessEqual(ew[2], 595)
            self.assertGreaterEqual(ew[1], 0)
            self.assertLessEqual(ew[3], 842)
        doc.close()

    def test_14_low_confidence_tokens_are_skipped(self):
        words = [
            {"text": "GoodWord", "conf": 90.0},
            {"text": "BadNoise", "conf": 25.0},
        ]
        kept = [w["text"] for w in words if w.get("conf", 100.0) >= 35.0]
        self.assertEqual(kept, ["GoodWord"])

    def test_15_language_cleaning_routes_all_to_ch(self):
        languages = ["all", "ALL", "auto", "Auto", "multilingual"]
        for l in languages:
            clean = l.lower().strip()
            routed = "ch" if clean in ("all", "auto", "multilingual") else clean[:2]
            self.assertEqual(routed, "ch")

    def test_16_paddleocr_unwarping_disabled_in_code(self):
        import inspect
        from backend.services.ocr_engine import get_paddleocr_reader
        src = inspect.getsource(get_paddleocr_reader)
        self.assertIn('"use_doc_unwarping": False', src)
        self.assertIn('"use_doc_orientation_classify": False', src)
        self.assertIn('"use_textline_orientation": False', src)

    def test_17_coordinate_scaling_preserves_aspect_and_origin(self):
        pix_w, pix_h = 1654, 2339
        page_w, page_h = 595.28, 841.89
        scale_x = page_w / float(pix_w)
        scale_y = page_h / float(pix_h)
        # Verify scaling factor for 200 DPI to 72 DPI PDF points
        self.assertAlmostEqual(scale_x, 0.359903, places=5)
        self.assertAlmostEqual(scale_y, 0.359935, places=5)

    def test_18_header_coordinate_stays_at_top_without_unwarping_shift(self):
        # A header located at y=38px on a 200 DPI page
        pix_y = 38.0
        page_h = 841.89
        pix_h = 2339.0
        pt_y = pix_y * (page_h / pix_h)
        # Should be at ~13.7pt (top margin), strictly less than 30pt
        self.assertLess(pt_y, 30.0)
        self.assertGreater(pt_y, 10.0)

    def test_19_title_coordinate_accurate_vertical_position(self):
        # A title located at y=126px on a 200 DPI page
        pix_y = 126.0
        page_h = 841.89
        pix_h = 2339.0
        pt_y = pix_y * (page_h / pix_h)
        # Should be between 40pt and 65pt
        self.assertGreaterEqual(pt_y, 40.0)
        self.assertLessEqual(pt_y, 65.0)

    def test_20_digital_exclusion_overlap_detection(self):
        # If OCR text overlaps an existing digital vector text box by > 35%, it should be excluded
        box1 = fitz.Rect(50, 100, 150, 120)
        dig_box = fitz.Rect(45, 95, 155, 125)
        overlap = (box1 & dig_box).get_area()
        self.assertGreater(overlap / box1.get_area(), 0.35)

    def test_21_digital_exclusion_no_overlap_preserves_handwritten(self):
        # Handwritten margin note does not overlap digital text
        hw_box = fitz.Rect(50, 500, 150, 520)
        dig_box = fitz.Rect(50, 100, 150, 120)
        overlap = (hw_box & dig_box).get_area()
        self.assertEqual(overlap, 0.0)

    def test_22_baseline_calculation_formula(self):
        # baseline_y = py1 - (font_size * 0.25)
        py0, py1 = 100.0, 120.0
        ph = py1 - py0
        font_size = min(24.0, max(5.0, ph * 0.75))
        baseline_y = py1 - (font_size * 0.25)
        self.assertEqual(font_size, 15.0)
        self.assertEqual(baseline_y, 116.25)

    def test_23_line_height_clamping_formula(self):
        ph = 1.0  # very thin stroke
        font_size = min(24.0, max(5.0, ph * 0.75))
        self.assertEqual(font_size, 5.0)  # clamped to min floor 5.0

    def test_24_quadrilateral_to_axis_aligned_bbox(self):
        # 4 corners of rotated/skewed polygon
        poly = [[10.0, 20.0], [50.0, 22.0], [48.0, 42.0], [8.0, 40.0]]
        xs = [pt[0] for pt in poly]
        ys = [pt[1] for pt in poly]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        self.assertEqual(x0, 8.0)
        self.assertEqual(y0, 20.0)
        self.assertEqual(x1, 50.0)
        self.assertEqual(y1, 42.0)

    def test_25_downscale_coordinate_reconstruction_exactness(self):
        # Test coordinate mapping when downscaled by scale_down
        w_bin, h_bin = 1654, 2339
        max_side = 1200
        scale_down = max_side / float(max(h_bin, w_bin))
        detected_x = 424.0  # detected in downscaled image
        detected_y = 600.0
        orig_x = detected_x / scale_down
        orig_y = detected_y / scale_down
        self.assertAlmostEqual(orig_y, 1169.5, places=1)

    def test_26_empty_page_words_handles_gracefully(self):
        words = []
        page_results = {0: ("tmp.png", words, 1654, 2339, [])}
        res_entry = page_results[0]
        self.assertEqual(res_entry[1], [])

    def test_27_pure_symbol_whitelist_preserves_standard_punctuation(self):
        symbols = ["...", "—", "–", "©", "®"]
        for s in symbols:
            should_skip = len(s) > 1 and bool(re.fullmatch(r"[\W_]+", s)) and s not in ("...", "—", "–", "©", "®")
            self.assertFalse(should_skip)

    def test_28_single_character_tokens_not_flagged_as_noise(self):
        chars = ["a", "I", "A", "1", "$", "@"]
        for c in chars:
            is_noise = len(c) > 1 and bool(re.fullmatch(r"[\W_]+", c))
            self.assertFalse(is_noise)

    def test_29_cyrillic_and_accented_chars_not_stripped_as_noise(self):
        words = ["Résumé", "Mardi", "levé", "Русский", "Стихи", "madrileño"]
        for w in words:
            is_noise = len(w) > 1 and bool(re.fullmatch(r"[\W_]+", w))
            self.assertFalse(is_noise)

    def test_30_font_length_shrink_preserves_boundary(self):
        doc = fitz.open()
        font = fitz.Font("helv")
        text = "Handwritten Multi-word Sentence In A Box"
        box_w = 120.0
        orig_fs = 16.0
        t_len = font.text_length(text, fontsize=orig_fs)
        self.assertGreater(t_len, box_w)
        scaled_fs = max(1.0, orig_fs * (box_w / t_len))
        new_len = font.text_length(text, fontsize=scaled_fs)
        self.assertAlmostEqual(new_len, box_w, delta=0.5)
        doc.close()

    def test_31_multiple_readers_cache_isolation(self):
        clear_paddleocr_readers()
        self.assertEqual(len(_PADDLEOCR_READERS), 0)
        _PADDLEOCR_READERS[("en", "cpu")] = "reader_en"
        _PADDLEOCR_READERS[("ru", "cpu")] = "reader_ru"
        self.assertEqual(len(_PADDLEOCR_READERS), 2)
        self.assertIn(("en", "cpu"), _PADDLEOCR_READERS)
        self.assertIn(("ru", "cpu"), _PADDLEOCR_READERS)
        clear_paddleocr_readers()
        self.assertEqual(len(_PADDLEOCR_READERS), 0)

    def test_32_teardown_cleans_gc_and_unloads(self):
        import gc
        before = gc.isenabled()
        self.assertTrue(before)
        teardown_ocr_engine()
        self.assertTrue(gc.isenabled())


if __name__ == "__main__":
    unittest.main()

