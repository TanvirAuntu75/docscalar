"""
test_subpixel_decomposition_and_verbatim_ocr.py
===============================================
Comprehensive Molecular Test Suite for DocScalar "Zero-Con" High-Precision OCR:
  - Subpixel Word-Level Bounding Box Decomposition
  - Optical Confidence Gating at 90.0% Invariant
  - Verbatim Document Truth (Proper Names & Math/Science Immunity)
  - Split Word German & Handwriting Recovery (erforderlich, Messung, Datum)
  - Geometric Line-Axis Subpixel Conservation & Gap Range Invariant
  - Multi-Font Fallback & Per-Word Digital Exclusion
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import fitz  # PyMuPDF
from backend.services.ocr_engine import (
    RobustOCREngine,
    apply_context_gated_guard,
    heal_split_words,
    get_symspell,
    MATH_OPERATORS,
    MATH_FUNCTIONS,
    PROPER_NAMES,
    SCIENTIFIC_VARIABLES,
    SCIENTIFIC_UNITS,
)
from backend.services.ocr import (
    decompose_ocr_line_to_words,
    run_ocr_on_pdf,
    teardown_ocr_engine,
)


class TestSubpixelDecompositionAndVerbatimOCR(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.font_helv = fitz.Font("helv")
        try:
            cls.font_cjk = fitz.Font("cjk")
        except Exception:
            cls.font_cjk = None
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.dir_path = Path(cls.temp_dir.name)

        # Mock queue progress to avoid Redis dependency during testing
        import backend.jobs.queue
        cls._orig_progress = backend.jobs.queue.update_job_progress
        backend.jobs.queue.update_job_progress = lambda *args, **kwargs: None

    @classmethod
    def tearDownClass(cls):
        import backend.jobs.queue
        backend.jobs.queue.update_job_progress = cls._orig_progress
        cls.temp_dir.cleanup()
        teardown_ocr_engine()

    # ─────────────────────────────────────────────────────────────────────────
    # Area 1: Strict Optical Confidence Gating at 90.0% Boundary
    # ─────────────────────────────────────────────────────────────────────────
    def test_01_optical_conf_exact_90_immune(self):
        # At exactly 90.0% confidence, even typo tokens must not be modified by spellcheck
        res = apply_context_gated_guard("wrok", conf=90.0)
        self.assertEqual(res, "wrok", "Conf 90.0% must preserve verbatim token")

    def test_02_optical_conf_sub_90_permits_correction(self):
        # Below 90.0% (e.g. 89.9%), prose typos are eligible for dictionary correction
        res = apply_context_gated_guard("wrok", conf=89.9)
        self.assertEqual(res, "work", "Conf 89.9% prose typo must be corrected")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 2: Proper Names Protection - Brauer
    # ─────────────────────────────────────────────────────────────────────────
    def test_03_proper_name_brauer_immunity(self):
        # Dr. K. Brauer on Page 4 must never be converted to Bauer or Brown
        res = apply_context_gated_guard("Brauer", conf=65.0)
        self.assertEqual(res, "Brauer", "Proper name 'Brauer' must be immune to dictionary alterations")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 3: Proper Names Protection - Eleanor
    # ─────────────────────────────────────────────────────────────────────────
    def test_04_proper_name_eleanor_immunity(self):
        res = apply_context_gated_guard("Eleanor", conf=60.0)
        self.assertEqual(res, "Eleanor", "Proper name 'Eleanor' must be immune")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 4: Proper Names Protection - Comprehensive Historical & Scientific Names
    # ─────────────────────────────────────────────────────────────────────────
    def test_05_comprehensive_proper_names_protection(self):
        names = ["Margaret", "Rene", "Pushkin", "Boltzmann", "Avogadro", "Carnot", "Maxwell", "Gibbs", "Istanbul"]
        for name in names:
            res = apply_context_gated_guard(name, conf=55.0)
            self.assertEqual(res, name, f"Proper name '{name}' must remain verbatim at low conf")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 5: German Split Word Repair - erforderlich
    # ─────────────────────────────────────────────────────────────────────────
    def test_06_german_split_erforderlich(self):
        raw = "Eine Wiederholung mit präziserer Temperaturkontrolle ist erf orderlich"
        healed = heal_split_words(raw)
        self.assertIn("erforderlich", healed)
        self.assertNotIn("erf orderlich", healed)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 6: German Split Word Inflections
    # ─────────────────────────────────────────────────────────────────────────
    def test_07_german_split_erforderlich_inflections(self):
        self.assertIn("erforderliche", heal_split_words("Massnahme ist erf orderliche Bedingung"))
        self.assertIn("erforderlichen", heal_split_words("unter den erf orderlichen Bedingungen"))

    # ─────────────────────────────────────────────────────────────────────────
    # Area 7: German OCR Typo Fixes - Messun8 & Datum:
    # ─────────────────────────────────────────────────────────────────────────
    def test_08_german_ocr_typos_messung_and_datum(self):
        raw = "Datun: Donnerstag 9 November. Messun8 von Co.-Ausstoß."
        healed = heal_split_words(raw)
        self.assertIn("Datum:", healed)
        self.assertIn("Messung", healed)
        self.assertIn("CO2-Ausstoß", healed)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 8: Math Function Protection
    # ─────────────────────────────────────────────────────────────────────────
    def test_09_math_functions_protection(self):
        for fn in ["ln", "log", "exp", "sin", "cos", "tan", "lim"]:
            res = apply_context_gated_guard(fn, conf=50.0)
            self.assertEqual(res, fn, f"Math function '{fn}' must never be spellchecked")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 9: Thermodynamics Formula Symbol Integrity - s = k · ln(Ω)
    # ─────────────────────────────────────────────────────────────────────────
    def test_10_entropy_formula_integrity(self):
        raw = "s = k · ln(Ω)"
        healed = heal_split_words(raw)
        self.assertEqual(healed, "s = k · ln(Ω)")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 10: First Law Equation Protection - dU=dQ-dW
    # ─────────────────────────────────────────────────────────────────────────
    def test_11_first_law_formula_protection(self):
        raw = "dU=dQ-dW (where U =internal energy Q =heat W =work)"
        healed = heal_split_words(raw)
        self.assertIn("dU=dQ-dW", healed)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 11: Single Word Decomposition - Dimensions & Rect Parity
    # ─────────────────────────────────────────────────────────────────────────
    def test_12_single_word_decomposition_bounds(self):
        bbox = (40.0, 100.0, 120.0, 120.0)
        words = decompose_ocr_line_to_words("Eleanor", bbox, self.font_helv, self.font_cjk)
        self.assertEqual(len(words), 1)
        w0 = words[0]
        self.assertEqual(w0["text"], "Eleanor")
        self.assertEqual(w0["rect"], bbox)
        self.assertEqual(w0["point"][0], 40.0)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 12: Multi-Word Decomposition - Token Count Parity
    # ─────────────────────────────────────────────────────────────────────────
    def test_13_multi_word_token_count_parity(self):
        text = "third one turned out to be my favourite; the characters felt so vivid and real"
        bbox = (40.6, 152.4, 314.8, 168.1)
        words = decompose_ocr_line_to_words(text, bbox, self.font_helv, self.font_cjk)
        expected_tokens = text.split(" ")
        self.assertEqual(len(words), len(expected_tokens))
        for i, exp in enumerate(expected_tokens):
            self.assertEqual(words[i]["text"], exp)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 13: Subpixel Axis Continuity - Strictly Monotonic Horizontal Progression
    # ─────────────────────────────────────────────────────────────────────────
    def test_14_subpixel_monotonic_progression(self):
        text = "The quick brown fox jumps over the lazy dog"
        bbox = (50.0, 200.0, 500.0, 220.0)
        words = decompose_ocr_line_to_words(text, bbox, self.font_helv, self.font_cjk)
        for i in range(len(words) - 1):
            curr_w = words[i]
            next_w = words[i + 1]
            self.assertLess(curr_w["rect"][0], curr_w["rect"][2], "Word width must be positive")
            self.assertLess(curr_w["rect"][2], next_w["rect"][0], "Next word must start strictly after current word")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 14: Subpixel Line Width Conservation
    # ─────────────────────────────────────────────────────────────────────────
    def test_15_subpixel_line_width_conservation(self):
        text = "Alpha Beta Gamma Delta Epsilon"
        bbox = (100.0, 150.0, 400.0, 170.0)
        words = decompose_ocr_line_to_words(text, bbox, self.font_helv, self.font_cjk)
        first_x0 = words[0]["rect"][0]
        last_x1 = words[-1]["rect"][2]
        self.assertEqual(first_x0, 100.0)
        self.assertLessEqual(last_x1, 400.0)
        # All words must be bounded within the detection box and have positive width
        for w in words:
            self.assertGreaterEqual(w["rect"][0], 100.0)
            self.assertLessEqual(w["rect"][2], 400.0)
            self.assertGreater(w["rect"][2], w["rect"][0])

    # ─────────────────────────────────────────────────────────────────────────
    # Area 15: Inter-Word Space Gap Lower Bound (>= 0.22 * font_size)
    # ─────────────────────────────────────────────────────────────────────────
    def test_16_inter_word_gap_lower_bound(self):
        # Compressed bounding box
        bbox = (50.0, 100.0, 150.0, 120.0)
        words = decompose_ocr_line_to_words("WordOne WordTwo WordThree", bbox, self.font_helv, self.font_cjk)
        fs = words[0]["fontsize"]
        min_allowed_gap = 0.22 * fs
        for i in range(len(words) - 1):
            gap = words[i + 1]["rect"][0] - words[i]["rect"][2]
            self.assertGreaterEqual(gap, min_allowed_gap - 0.05, f"Gap {gap} must be >= {min_allowed_gap}")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 16: Inter-Word Space Gap Upper Bound (<= 0.55 * font_size)
    # ─────────────────────────────────────────────────────────────────────────
    def test_17_inter_word_gap_upper_bound(self):
        # Vastly expanded bounding box (wide handwriting spacing)
        bbox = (50.0, 100.0, 800.0, 120.0)
        words = decompose_ocr_line_to_words("A B C D E", bbox, self.font_helv, self.font_cjk)
        fs = words[0]["fontsize"]
        max_allowed_gap = 0.55 * fs
        for i in range(len(words) - 1):
            gap = words[i + 1]["rect"][0] - words[i]["rect"][2]
            self.assertLessEqual(gap, max_allowed_gap + 0.05, f"Gap {gap} must be <= {max_allowed_gap}")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 17: Proportional Word Width Scaling for Wide Handwriting Bounding Box
    # ─────────────────────────────────────────────────────────────────────────
    def test_18_proportional_width_distribution(self):
        # "short" vs "extraordinarilylongword"
        text = "short extraordinarilylongword"
        bbox = (50.0, 100.0, 400.0, 120.0)
        words = decompose_ocr_line_to_words(text, bbox, self.font_helv, self.font_cjk)
        w_short = words[0]["width"]
        w_long = words[1]["width"]
        self.assertGreater(w_long, w_short * 2.5, "Long word must receive proportionally more box width")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 18: Font Size Height Constraint (min 5.0, max 24.0, 0.75 * line_h)
    # ─────────────────────────────────────────────────────────────────────────
    def test_19_font_size_bounds(self):
        # Tiny line height
        words_tiny = decompose_ocr_line_to_words("tiny", (0, 0, 50, 4), self.font_helv, self.font_cjk)
        self.assertEqual(words_tiny[0]["fontsize"], 5.0)

        # Huge line height
        words_huge = decompose_ocr_line_to_words("huge", (0, 0, 200, 100), self.font_helv, self.font_cjk)
        self.assertEqual(words_huge[0]["fontsize"], 24.0)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 19: Baseline Y Offset Formula Verification (py1 - actual_fs * 0.25)
    # ─────────────────────────────────────────────────────────────────────────
    def test_20_baseline_y_offset_exact_formula(self):
        bbox = (50.0, 100.0, 200.0, 120.0)
        words = decompose_ocr_line_to_words("Sample", bbox, self.font_helv, self.font_cjk)
        py1 = 120.0
        fs = words[0]["fontsize"]
        expected_baseline = py1 - (fs * 0.25)
        self.assertAlmostEqual(words[0]["point"][1], expected_baseline, places=2)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 20: Digital Exclusion - Per-Word Isolation
    # ─────────────────────────────────────────────────────────────────────────
    def test_21_digital_exclusion_per_word_isolation(self):
        # Line has 3 words: "WordA WordB WordC". WordB collides with a digital vector rect.
        bbox = (50.0, 100.0, 250.0, 120.0)
        words = decompose_ocr_line_to_words("WordA WordB WordC", bbox, self.font_helv, self.font_cjk)
        self.assertEqual(len(words), 3)

        # Simulate digital rect overlapping WordB only
        dr_word_b = fitz.Rect(words[1]["rect"])
        fitz_dig_rects = [dr_word_b]

        surviving = []
        for item in words:
            sub_rect = fitz.Rect(*item["rect"])
            sub_area = sub_rect.get_area()
            is_excluded = fitz_dig_rects and any(
                (not (sub_rect & dr).is_empty) and (sub_rect & dr).get_area() > 0.35 * sub_area
                for dr in fitz_dig_rects
            )
            if not is_excluded:
                surviving.append(item["text"])

        self.assertIn("WordA", surviving)
        self.assertNotIn("WordB", surviving)
        self.assertIn("WordC", surviving)
        self.assertEqual(len(surviving), 2)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 21: Digital Exclusion - Full Preservation when Zero Overlap
    # ─────────────────────────────────────────────────────────────────────────
    def test_22_digital_exclusion_zero_overlap_preservation(self):
        bbox = (50.0, 100.0, 250.0, 120.0)
        words = decompose_ocr_line_to_words("Alpha Beta Gamma", bbox, self.font_helv, self.font_cjk)
        # Rect far away
        fitz_dig_rects = [fitz.Rect(400, 400, 500, 500)]
        surviving = [
            item["text"] for item in words
            if not any((not (fitz.Rect(*item["rect"]) & dr).is_empty) for dr in fitz_dig_rects)
        ]
        self.assertEqual(len(surviving), 3)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 22: Multi-Font Selection - Helvetica for Standard Latin
    # ─────────────────────────────────────────────────────────────────────────
    def test_23_multi_font_helvetica_selected_for_latin(self):
        words = decompose_ocr_line_to_words("Scientific Notes", (50, 50, 200, 70), self.font_helv, self.font_cjk)
        for w in words:
            self.assertEqual(w["font"], self.font_helv)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 23: Multi-Font Selection - CJK Fallback for Hanzi/Kanji
    # ─────────────────────────────────────────────────────────────────────────
    def test_24_multi_font_cjk_selected_for_hanzi(self):
        if self.font_cjk:
            words = decompose_ocr_line_to_words("购物清单 大米", (50, 50, 200, 70), self.font_helv, self.font_cjk)
            self.assertEqual(len(words), 2)
            for w in words:
                self.assertEqual(w["font"], self.font_cjk)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 24: Degenerate Zero-Length / Whitespace-Only Line Resilience
    # ─────────────────────────────────────────────────────────────────────────
    def test_25_empty_and_whitespace_decomposition_resilience(self):
        self.assertEqual(decompose_ocr_line_to_words("", (0, 0, 10, 10), self.font_helv, self.font_cjk), [])
        self.assertEqual(decompose_ocr_line_to_words("   ", (0, 0, 10, 10), self.font_helv, self.font_cjk), [])
        self.assertEqual(decompose_ocr_line_to_words(None, (0, 0, 10, 10), self.font_helv, self.font_cjk), [])

    # ─────────────────────────────────────────────────────────────────────────
    # Area 25: Punctuation Attached to Word Preservation
    # ─────────────────────────────────────────────────────────────────────────
    def test_26_punctuation_attached_preservation(self):
        words = decompose_ocr_line_to_words("key equations: (spontaneity)", (50, 50, 250, 70), self.font_helv, self.font_cjk)
        self.assertEqual(words[1]["text"], "equations:")
        self.assertEqual(words[2]["text"], "(spontaneity)")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 26: Scientific Notation with Decimal Recovery
    # ─────────────────────────────────────────────────────────────────────────
    def test_27_scientific_decimal_point_recovery(self):
        raw = "Boltzmann constant: k = 1 380649× 10-23 J/K"
        healed = heal_split_words(raw)
        self.assertIn("1.380649", healed)
        self.assertIn("J/K", healed)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 27: Physical Units Protection
    # ─────────────────────────────────────────────────────────────────────────
    def test_28_physical_units_protection(self):
        units = ["J/K", "mol^-1", "kJ/mol", "m/s^2", "kPa"]
        for u in units:
            res = apply_context_gated_guard(u, conf=50.0)
            self.assertEqual(res, u, f"Unit '{u}' must be immune")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 28: Arabic Script Reversal & Decomposition
    # ─────────────────────────────────────────────────────────────────────────
    def test_29_arabic_decomposition(self):
        raw = "Dear friend عزیزی in Cairo"
        healed = heal_split_words(raw)
        words = decompose_ocr_line_to_words(healed, (50, 50, 300, 70), self.font_helv, self.font_cjk)
        self.assertGreaterEqual(len(words), 4)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 29: End-to-End Synthetic PDF Text Layer Injection with Render Mode 3
    # ─────────────────────────────────────────────────────────────────────────
    def test_30_synthetic_pdf_render_mode_3_injection(self):
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        tw = fitz.TextWriter(page.rect)
        line_text = "third one turned out to be my favourite; the characters felt so vivid and real"
        bbox = (40.6, 152.4, 314.8, 168.1)
        decomposed = decompose_ocr_line_to_words(line_text, bbox, self.font_helv, self.font_cjk)
        for item in decomposed:
            tw.append(fitz.Point(*item["point"]), item["text"], font=item["font"], fontsize=item["fontsize"])
        tw.write_text(page, render_mode=3)

        pdf_bytes = doc.tobytes()
        doc.close()
        self.assertIn(b"3 Tr", pdf_bytes, "Output PDF content stream must include '3 Tr' invisible text layer")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 30: PDF Text Extraction Round-Trip (page.get_text("words"))
    # ─────────────────────────────────────────────────────────────────────────
    def test_31_pdf_text_extraction_round_trip_words(self):
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        tw = fitz.TextWriter(page.rect)
        line_text = "key equations: dU=dQ-dW s = k · ln(Ω)"
        bbox = (40.0, 100.0, 350.0, 120.0)
        decomposed = decompose_ocr_line_to_words(line_text, bbox, self.font_helv, self.font_cjk)
        for item in decomposed:
            tw.append(fitz.Point(*item["point"]), item["text"], font=item["font"], fontsize=item["fontsize"])
        tw.write_text(page, render_mode=3)

        extracted_words = page.get_text("words")
        doc.close()
        # Ensure every word was extracted as a distinct entity
        extracted_tokens = [w[4] for w in extracted_words]
        self.assertIn("key", extracted_tokens)
        self.assertIn("equations:", extracted_tokens)
        self.assertIn("dU=dQ-dW", extracted_tokens)
        self.assertIn("s", extracted_tokens)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 31: PDF Text Extraction Sentence Reconstitution (Proper Spaces)
    # ─────────────────────────────────────────────────────────────────────────
    def test_32_pdf_text_sentence_reconstitution(self):
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        tw = fitz.TextWriter(page.rect)
        line_text = "I hope this letter finds you well"
        bbox = (50.0, 100.0, 300.0, 120.0)
        decomposed = decompose_ocr_line_to_words(line_text, bbox, self.font_helv, self.font_cjk)
        for item in decomposed:
            tw.append(fitz.Point(*item["point"]), item["text"], font=item["font"], fontsize=item["fontsize"])
        tw.write_text(page, render_mode=3)

        extracted_text = page.get_text("text").strip()
        doc.close()
        self.assertEqual(extracted_text, "I hope this letter finds you well")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 32: Page 1 Line 7 Real Coordinates Decomposition & Hit-Testing
    # ─────────────────────────────────────────────────────────────────────────
    def test_33_page1_line7_coordinates_hit_testing(self):
        line_text = "to be my favourite; the characters felt so vivid and real"
        bbox = (40.6, 152.4, 314.8, 168.1)
        decomposed = decompose_ocr_line_to_words(line_text, bbox, self.font_helv, self.font_cjk)
        self.assertEqual(decomposed[0]["text"], "to")
        self.assertEqual(decomposed[-1]["text"], "real")
        # Hit test: a mouse cursor at x=310, y=160 must fall inside the "real" word box
        last_word_rect = fitz.Rect(decomposed[-1]["rect"])
        self.assertTrue(last_word_rect.contains(fitz.Point(310.0, 160.0)), "Mouse cursor at x=310 must hit 'real'")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 33: Page 11 "key equations:" Real Coordinates Decomposition
    # ─────────────────────────────────────────────────────────────────────────
    def test_34_page11_key_equations_decomposition(self):
        line_text = "key equations:"
        bbox = (40.6, 145.5, 117.2, 161.8)
        decomposed = decompose_ocr_line_to_words(line_text, bbox, self.font_helv, self.font_cjk)
        self.assertEqual(len(decomposed), 2)
        self.assertEqual(decomposed[0]["text"], "key")
        self.assertEqual(decomposed[1]["text"], "equations:")
        self.assertLess(decomposed[0]["rect"][2], decomposed[1]["rect"][0])

    # ─────────────────────────────────────────────────────────────────────────
    # Area 34: Output Path Parameter Support in run_ocr_on_pdf
    # ─────────────────────────────────────────────────────────────────────────
    def test_35_custom_output_path_parameter_support(self):
        import inspect
        sig = inspect.signature(run_ocr_on_pdf)
        self.assertIn("output_path", sig.parameters)
        self.assertIsNone(sig.parameters["output_path"].default)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 35: Teardown & Memory Reclaim Safety
    # ─────────────────────────────────────────────────────────────────────────
    def test_36_teardown_ocr_engine_idempotent(self):
        teardown_ocr_engine()
        # Calling teardown twice in a row must not raise any exceptions
        teardown_ocr_engine()


if __name__ == "__main__":
    unittest.main()
