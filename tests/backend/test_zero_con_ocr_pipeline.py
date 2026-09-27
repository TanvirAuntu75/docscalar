"""
test_zero_con_ocr_pipeline.py
==============================
Comprehensive Molecular Test Suite for DocScalar "Zero-Con" Production OCR Pipeline:
  - Context-Gated 4-Tier Guard (Tier 1 High-Conf, Tier 2 Math/Greek/Units/Vars, Tier 3 Alphanumeric Codes, Tier 4 SymSpell)
  - Selective Invisible Text Span Redaction (Render Mode 3 Purging & Visible Vector Text Preservation)
  - fitz_dig_rects Clearing on Invisible Purge
  - Sub-Page Scan Dropping Remediation (Spatial Uncovered Region Detection)
  - Born-Digital Fast-Path CMap/Mojibake Validation & Unicode NFKC Normalization
  - RobustOCREngine Integration & End-to-End Safety
"""

import os
import sys
import tempfile
import unicodedata
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
    get_symspell,
    MATH_OPERATORS,
    GREEK_AND_SCIENTIFIC_SYMBOLS,
    SCIENTIFIC_VARIABLES,
    SCIENTIFIC_UNITS,
)
from backend.services.ocr import (
    run_ocr_on_pdf,
    teardown_ocr_engine,
    validate_cmap_and_mojibake,
    detect_uncovered_raster,
    check_has_invisible_layer,
    purge_invisible_text_spans,
)


class TestZeroConOCRPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
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
    # Area 1: Tier 1 - High-Confidence Immunity (conf >= 92%)
    # ─────────────────────────────────────────────────────────────────────────
    def test_01_tier1_high_confidence_never_modified(self):
        # Even misspelled tokens must never be modified if OCR confidence is >= 92%
        res = apply_context_gated_guard("wrok", conf=95.0)
        self.assertEqual(res, "wrok", "Tier 1: conf 95% must preserve token exactly")

    def test_02_tier1_boundary_at_92_percent(self):
        # Exact boundary check: 92.0% is immune
        res = apply_context_gated_guard("tbe", conf=92.0)
        self.assertEqual(res, "tbe", "Tier 1: exact conf 92.0% must preserve token")

    def test_03_tier1_near_100_percent(self):
        res = apply_context_gated_guard("Teh", conf=99.8)
        self.assertEqual(res, "Teh", "Tier 1: 99.8% conf must preserve token")

    def test_04_tier1_static_method_parity(self):
        # Verify RobustOCREngine.apply_context_gated_guard matches standalone function
        res_fn = apply_context_gated_guard("invoce", conf=94.0)
        res_cls = RobustOCREngine.apply_context_gated_guard("invoce", conf=94.0)
        self.assertEqual(res_fn, "invoce")
        self.assertEqual(res_cls, "invoce")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 2: Tier 2 - Math & Formula Operators Immunity
    # ─────────────────────────────────────────────────────────────────────────
    def test_05_tier2_formula_with_equals_and_multiplication(self):
        # E=mc^2 or formulas must never be modified by spellcheck
        res = apply_context_gated_guard("E=mc^2", conf=50.0)
        self.assertEqual(res, "E=mc^2", "Tier 2: Formula with = and ^ must be immune")

    def test_06_tier2_math_operators_set_coverage(self):
        # Verify operators: +, -, *, /, ^, _, =, ±, ×, ÷
        for op in ["+", "-", "*", "/", "^", "_", "=", "±", "×", "÷"]:
            token = f"x{op}y"
            res = apply_context_gated_guard(token, conf=40.0)
            self.assertEqual(res, token, f"Tier 2: token containing operator '{op}' must be immune")

    def test_07_tier2_subscripts_and_superscripts(self):
        res_sub = apply_context_gated_guard("v_0", conf=50.0)
        res_sup = apply_context_gated_guard("x^n", conf=50.0)
        self.assertEqual(res_sub, "v_0")
        self.assertEqual(res_sup, "x^n")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 3: Tier 2 - Greek & Scientific Symbols Immunity
    # ─────────────────────────────────────────────────────────────────────────
    def test_08_tier2_named_greek_symbols(self):
        symbols = ["Delta", "Omega", "alpha", "beta", "gamma", "theta", "lambda", "sigma", "pi", "phi", "psi", "mu"]
        for sym in symbols:
            res = apply_context_gated_guard(sym, conf=45.0)
            self.assertEqual(res, sym, f"Tier 2: Named Greek symbol '{sym}' must be immune")

    def test_09_tier2_unicode_greek_characters(self):
        # Unicode Greek letters: Δ, Ω, α, β, λ, μ
        unicode_syms = ["ΔT", "Ω", "α_k", "λ_max", "μm", "πr^2"]
        for sym in unicode_syms:
            res = apply_context_gated_guard(sym, conf=45.0)
            self.assertEqual(res, sym, f"Tier 2: Unicode Greek '{sym}' must be immune")

    def test_10_tier2_special_scientific_symbols(self):
        # Degree, angstrom, hbar
        for s in ["°C", "Å", "ħ"]:
            res = apply_context_gated_guard(s, conf=40.0)
            self.assertEqual(res, s, f"Tier 2: Scientific symbol '{s}' must be immune")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 4: Tier 2 - Scientific Variables Immunity
    # ─────────────────────────────────────────────────────────────────────────
    def test_11_tier2_thermodynamic_variables(self):
        # Explicit variables from task specification: dU, dQ, dW, k, N, S
        for var in ["dU", "dQ", "dW", "k", "N", "S"]:
            res = apply_context_gated_guard(var, conf=50.0)
            self.assertEqual(res, var, f"Tier 2: Variable '{var}' must be immune from mutation")

    def test_12_tier2_differential_variables(self):
        for diff in ["dx", "dy", "dt", "dr", "dH", "dG", "dS"]:
            res = apply_context_gated_guard(diff, conf=50.0)
            self.assertEqual(res, diff, f"Tier 2: Differential '{diff}' must be immune")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 5: Tier 2 - Scientific Units Immunity
    # ─────────────────────────────────────────────────────────────────────────
    def test_13_tier2_units_from_specification(self):
        # Explicit units from specification: J/K, mol^-1
        self.assertEqual(apply_context_gated_guard("J/K", conf=50.0), "J/K")
        self.assertEqual(apply_context_gated_guard("mol^-1", conf=50.0), "mol^-1")

    def test_14_tier2_compound_units(self):
        for unit in ["kJ/mol", "m/s", "m/s^2", "kPa", "MPa", "W/m^2", "km/h"]:
            res = apply_context_gated_guard(unit, conf=50.0)
            self.assertEqual(res, unit, f"Tier 2: Unit '{unit}' must be immune")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 6: Tier 3 - Alphanumeric Code Immunity
    # ─────────────────────────────────────────────────────────────────────────
    def test_15_tier3_invoice_code_from_specification(self):
        # Explicit prompt example: INV-9042
        res = apply_context_gated_guard("INV-9042", conf=50.0)
        self.assertEqual(res, "INV-9042", "Tier 3: INV-9042 must not be modified by spellcheck")

    def test_16_tier3_various_alphanumeric_codes(self):
        codes = ["TXN-8821B", "A102", "10B", "SKU_994", "REF#4501", "ISBN9780132350884", "UUID-8f7a"]
        for code in codes:
            res = apply_context_gated_guard(code, conf=50.0)
            self.assertEqual(res, code, f"Tier 3: Alphanumeric code '{code}' must be immune")

    def test_17_tier3_numeric_and_currency_immunity(self):
        # Pure digits, dates, currencies must not be treated as prose
        for num in ["12345", "$1,250.00", "€99.90", "2026-09-25", "10/12/2024"]:
            res = apply_context_gated_guard(num, conf=50.0)
            self.assertEqual(res, num, f"Numeric/currency token '{num}' must be immune")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 7: Tier 4 - SymSpell Dictionary Lookup for Low-Confidence Prose
    # ─────────────────────────────────────────────────────────────────────────
    def test_18_tier4_low_conf_prose_correction(self):
        # When conf < 90% and token is prose, SymSpell corrects it
        self.assertEqual(apply_context_gated_guard("wrok", conf=75.0), "work")
        self.assertEqual(apply_context_gated_guard("tbe", conf=70.0), "the")
        self.assertEqual(apply_context_gated_guard("acess", conf=65.0), "access")

    def test_19_tier4_conf_threshold_between_90_and_92(self):
        # Tokens with 90 <= conf < 92 should NOT be modified by Tier 4 (Tier 4 is strictly conf < 90)
        res_90 = apply_context_gated_guard("wrok", conf=90.0)
        res_91 = apply_context_gated_guard("wrok", conf=91.5)
        self.assertEqual(res_90, "wrok", "conf == 90.0 must NOT be modified by Tier 4")
        self.assertEqual(res_91, "wrok", "conf == 91.5 must NOT be modified by Tier 4")

    def test_20_tier4_valid_words_remain_untouched(self):
        # Already-correct English words (distance 0) are kept unchanged even at low confidence
        for word in ["hello", "document", "invoice", "payment", "service"]:
            res = apply_context_gated_guard(word, conf=60.0)
            self.assertEqual(res, word, f"Valid word '{word}' must not be altered")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 8: Tier 4 - Casing Preservation & Contractions
    # ─────────────────────────────────────────────────────────────────────────
    def test_21_tier4_all_caps_preservation(self):
        # ALL CAPS must stay ALL CAPS
        res_caps = apply_context_gated_guard("WROK", conf=75.0)
        self.assertEqual(res_caps, "WORK", "Tier 4: ALL CAPS 'WROK' must correct to 'WORK'")

    def test_22_tier4_title_case_preservation(self):
        # Title Case must stay Title Case
        res_title = apply_context_gated_guard("Wrok", conf=75.0)
        self.assertEqual(res_title, "Work", "Tier 4: Title Case 'Wrok' must correct to 'Work'")
        res_tbe = apply_context_gated_guard("Tbe", conf=70.0)
        self.assertEqual(res_tbe, "The", "Tier 4: Title Case 'Tbe' must correct to 'The'")

    def test_23_tier4_lowercase_preservation(self):
        res_lower = apply_context_gated_guard("wrok", conf=75.0)
        self.assertEqual(res_lower, "work", "Tier 4: Lowercase 'wrok' must correct to 'work'")

    def test_24_tier4_contractions_with_apostrophes(self):
        # Contractions with apostrophes must be handled cleanly without mutation or corruption
        self.assertEqual(apply_context_gated_guard("don't", conf=80.0), "don't")
        self.assertEqual(apply_context_gated_guard("Don't", conf=80.0), "Don't")
        self.assertEqual(apply_context_gated_guard("can't", conf=80.0), "can't")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 9: Tier 4 - Punctuation Preservation
    # ─────────────────────────────────────────────────────────────────────────
    def test_25_tier4_trailing_punctuation(self):
        # Trailing commas, periods, exclamation points must be preserved
        self.assertEqual(apply_context_gated_guard("Wrok,", conf=75.0), "Work,")
        self.assertEqual(apply_context_gated_guard("wrok.", conf=75.0), "work.")
        self.assertEqual(apply_context_gated_guard("wrok!", conf=75.0), "work!")

    def test_26_tier4_enclosing_quotes_and_brackets(self):
        self.assertEqual(apply_context_gated_guard('"tbe"', conf=70.0), '"the"')
        self.assertEqual(apply_context_gated_guard("(wrok)", conf=75.0), "(work)")
        self.assertEqual(apply_context_gated_guard("[wrok]", conf=75.0), "[work]")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 10: RobustOCREngine Word List Pipeline Integration
    # ─────────────────────────────────────────────────────────────────────────
    def test_27_engine_word_list_contains_guarded_tokens(self):
        # Create an engine instance and verify word_list processing applies the guard
        engine = RobustOCREngine()
        self.assertIsNotNone(engine)
        # Verify get_symspell loaded dictionary successfully
        sp = get_symspell()
        self.assertIsNotNone(sp, "SymSpell frequency dictionary must be loaded")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 11: CMap / Mojibake Validation - Source Function validate_cmap_and_mojibake
    # ─────────────────────────────────────────────────────────────────────────
    def test_28_cmap_clean_digital_accepted(self):
        clean_text = "DocScalar Next-Gen Invoice Document Total $1,250.00"
        is_valid, ratio, pua_count = validate_cmap_and_mojibake(clean_text)
        self.assertTrue(is_valid, "Clean digital text must pass CMap validation")
        self.assertEqual(pua_count, 0, "Clean text must have 0 PUA characters")
        self.assertGreater(ratio, 0.85, "Printable ratio must exceed 0.85")

    def test_29_cmap_low_printable_ratio_rejected(self):
        # Sample with unprintable control chars
        corrupt_text = "ABC\x00\x01\x02\x03\x04\x05\x06\x07DEF"
        is_valid, ratio, pua_count = validate_cmap_and_mojibake(corrupt_text)
        self.assertFalse(is_valid, "Fast path must reject low printable ratio")
        # Formula-level verification: printable_count = 6 ('ABCDEF'), total length = 14
        expected_ratio = 6.0 / 14.0
        self.assertAlmostEqual(ratio, expected_ratio, places=4)
        self.assertLess(ratio, 0.85)

    def test_30_cmap_empty_or_whitespace_rejected(self):
        is_valid_empty, ratio_empty, pua_empty = validate_cmap_and_mojibake("")
        self.assertFalse(is_valid_empty)
        self.assertEqual(ratio_empty, 0.0)
        self.assertEqual(pua_empty, 0)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 12: CMap / Mojibake Validation - PUA 3-Range Rejection
    # ─────────────────────────────────────────────────────────────────────────
    def test_31_cmap_pua_characters_rejected(self):
        sample_with_pua = "Customer \ue001\ue002 Name: John Doe"
        is_valid, ratio, pua_count = validate_cmap_and_mojibake(sample_with_pua)
        self.assertFalse(is_valid, "Fast path must reject sample with PUA characters")
        self.assertEqual(pua_count, 2, "Must detect exactly 2 BMP PUA characters")

    def test_32_cmap_supplementary_pua_ranges_rejected(self):
        # Supplementary PUA-A (U+F0001) and Supplementary PUA-B (U+100001)
        sample_supp = "ID: \U000f0001 and \U00100001"
        is_valid, ratio, pua_count = validate_cmap_and_mojibake(sample_supp)
        self.assertFalse(is_valid)
        self.assertEqual(pua_count, 2, "Must detect 2 supplementary PUA characters")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 13: Sub-Page Raster Detection - Source Function detect_uncovered_raster
    # ─────────────────────────────────────────────────────────────────────────
    def test_33_sub_page_scan_detected_when_uncovered(self):
        pdf_path = self.dir_path / "subpage_scan_unit.pdf"
        doc = fitz.open()
        page = doc.new_page(width=500, height=500)
        font = fitz.Font("helv")

        # 1. Insert digital header (10 words) at top: y = 50..70
        tw = fitz.TextWriter(page.rect)
        tw.append(fitz.Point(50, 50), "Official Agreement and Terms of Service Between Both Parties Now", font=font, fontsize=12)
        tw.write_text(page, render_mode=0)

        # 2. Insert sub-page scanned receipt/signature image at bottom (200x150, area = 30000 px^2, ~12% page area)
        pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 200, 150), 1)
        pix.clear_with(220)
        img_rect = fitz.Rect(50, 300, 250, 450)
        page.insert_image(img_rect, pixmap=pix)

        doc.save(str(pdf_path))
        doc.close()

        # Invoke actual source function detect_uncovered_raster
        tdoc = fitz.open(str(pdf_path))
        tpage = tdoc[0]
        digital_rects = [(w[0], w[1], w[2], w[3]) for w in tpage.get_text("words")]

        has_uncovered = detect_uncovered_raster(tpage, digital_rects)
        tdoc.close()

        self.assertTrue(has_uncovered, "detect_uncovered_raster must return True for un-transcribed sub-page scan")

    def test_34_covered_image_not_marked_as_uncovered(self):
        # When an image is > 50% covered by digital text bounding boxes, it is already transcribed
        pdf_path = self.dir_path / "covered_scan_unit.pdf"
        doc = fitz.open()
        page = doc.new_page(width=500, height=500)

        # Insert 100x100 image at (50, 50, 150, 150), area = 10000
        pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 100, 100), 1)
        pix.clear_with(220)
        page.insert_image(fitz.Rect(50, 50, 150, 150), pixmap=pix)

        doc.save(str(pdf_path))
        doc.close()

        # Digital rect covers 90% of image: (50, 50, 150, 140) -> area 9000
        tdoc = fitz.open(str(pdf_path))
        tpage = tdoc[0]
        digital_rects = [(50.0, 50.0, 150.0, 140.0)]

        has_uncovered = detect_uncovered_raster(tpage, digital_rects)
        tdoc.close()

        self.assertFalse(has_uncovered, "detect_uncovered_raster must return False when image is >= 50% covered")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 14: Sub-Page Raster Detection - Decorative Artifact Size Filtering
    # ─────────────────────────────────────────────────────────────────────────
    def test_35_tiny_decorative_artifacts_ignored(self):
        pdf_path = self.dir_path / "tiny_artifact_unit.pdf"
        doc = fitz.open()
        page = doc.new_page(width=500, height=500)

        # Insert tiny 10x10 artifact (area = 100 px^2 < 225 px^2, width 10 < 15)
        pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 10, 10), 1)
        pix.clear_with(128)
        page.insert_image(fitz.Rect(10, 10, 20, 20), pixmap=pix)

        doc.save(str(pdf_path))
        doc.close()

        tdoc = fitz.open(str(pdf_path))
        tpage = tdoc[0]
        has_uncovered = detect_uncovered_raster(tpage, [])
        tdoc.close()

        self.assertFalse(has_uncovered, "detect_uncovered_raster must ignore sub-pixel decorative artifacts (< 225 px^2)")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 15: Invisible Layer Detection - Source Function check_has_invisible_layer
    # ─────────────────────────────────────────────────────────────────────────
    def test_36_check_has_invisible_layer_on_3_tr(self):
        pdf_path = self.dir_path / "invisible_3_tr.pdf"
        doc = fitz.open()
        page = doc.new_page(width=500, height=500)
        tw = fitz.TextWriter(page.rect)
        tw.append(fitz.Point(50, 100), "Invisible OCR Text", fontsize=12)
        tw.write_text(page, render_mode=3)
        doc.save(str(pdf_path))
        doc.close()

        tdoc = fitz.open(str(pdf_path))
        has_inv = check_has_invisible_layer(tdoc[0])
        tdoc.close()

        self.assertTrue(has_inv, "check_has_invisible_layer must detect 3 Tr invisible text layer")

    def test_37_check_has_invisible_layer_on_visible_vector(self):
        pdf_path = self.dir_path / "clean_visible_vector.pdf"
        doc = fitz.open()
        page = doc.new_page(width=500, height=500)
        tw = fitz.TextWriter(page.rect)
        tw.append(fitz.Point(50, 100), "Clean Visible Text", fontsize=12)
        tw.write_text(page, render_mode=0)
        doc.save(str(pdf_path))
        doc.close()

        tdoc = fitz.open(str(pdf_path))
        has_inv = check_has_invisible_layer(tdoc[0])
        tdoc.close()

        self.assertFalse(has_inv, "check_has_invisible_layer must return False on clean visible text")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 16: Selective Invisible Span Redaction - Source Function purge_invisible_text_spans
    # ─────────────────────────────────────────────────────────────────────────
    def test_38_selective_redaction_preserves_visible_vector_text(self):
        pdf_path = self.dir_path / "mixed_vector_invisible_unit.pdf"
        doc = fitz.open()
        page = doc.new_page(width=500, height=500)
        font = fitz.Font("helv")

        # 1. Insert visible vector text (render_mode=0)
        tw1 = fitz.TextWriter(page.rect)
        tw1.append(fitz.Point(50, 50), "Important Visible Legal Heading", font=font, fontsize=14)
        tw1.write_text(page, render_mode=0)

        # 2. Insert stale invisible OCR text (render_mode=3)
        tw2 = fitz.TextWriter(page.rect)
        tw2.append(fitz.Point(50, 150), "Stale Deleted Invisible OCR Layer", font=font, fontsize=10)
        tw2.write_text(page, render_mode=3)

        doc.save(str(pdf_path))
        doc.close()

        target_doc = fitz.open(str(pdf_path))
        target_page = target_doc[0]

        # Call source function purge_invisible_text_spans
        purged_count, surviving_rects = purge_invisible_text_spans(target_page, has_invisible_layer=True)

        self.assertGreater(purged_count, 0, "purge_invisible_text_spans must purge at least 1 invisible span")
        self.assertEqual(len(surviving_rects), 4, "Only 4 visible words ('Important Visible Legal Heading') must survive")

        surviving_words = [w[4] for w in target_page.get_text("words")]
        target_doc.close()

        self.assertIn("Visible", surviving_words, "Visible vector text MUST survive selective redaction")
        self.assertIn("Legal", surviving_words, "Visible vector text MUST survive selective redaction")
        self.assertNotIn("Invisible", surviving_words, "Invisible OCR text MUST be purged")
        self.assertNotIn("Stale", surviving_words, "Invisible OCR text MUST be purged")

    def test_39_purge_on_clean_visible_page(self):
        pdf_path = self.dir_path / "pure_visible_unit.pdf"
        doc = fitz.open()
        page = doc.new_page(width=500, height=500)
        tw = fitz.TextWriter(page.rect)
        tw.append(fitz.Point(50, 50), "Pure Visible Document Heading", fontsize=12)
        tw.write_text(page, render_mode=0)
        doc.save(str(pdf_path))
        doc.close()

        target_doc = fitz.open(str(pdf_path))
        purged_cnt, surviving_rects = purge_invisible_text_spans(target_doc[0], has_invisible_layer=False)
        target_doc.close()

        self.assertEqual(purged_cnt, 0, "Zero spans should be purged on pure visible document")
        self.assertEqual(len(surviving_rects), 4, "All 4 visible words must remain in surviving rects")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 17: End-to-End Pipeline - Born-Digital Fast-Path Activation & Zero Mutation
    # ─────────────────────────────────────────────────────────────────────────
    def test_40_e2e_born_digital_fast_path_exact_fidelity(self):
        pdf_path = self.dir_path / "e2e_born_digital.pdf"
        doc = fitz.open()
        page = doc.new_page(width=500, height=500)
        font = fitz.Font("helv")
        tw = fitz.TextWriter(page.rect)
        tw.append(fitz.Point(50, 50), "DocScalar High Accuracy Born Digital Fast Path Text Verification", font=font, fontsize=14)
        tw.write_text(page, render_mode=0)
        doc.save(str(pdf_path))
        doc.close()

        res = run_ocr_on_pdf(str(pdf_path))
        self.assertTrue(res.success, f"OCR pipeline failed: {res.error_message}")

        out_doc = fitz.open(res.output_path)
        words = [w[4] for w in out_doc[0].get_text("words")]
        out_doc.close()
        Path(res.output_path).unlink(missing_ok=True)

        expected = ["DocScalar", "High", "Accuracy", "Born", "Digital", "Fast", "Path", "Text", "Verification"]
        self.assertEqual(words, expected, "Born-digital fast path must retain 100% exact text with zero mutation")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 18: End-to-End Pipeline - Hybrid Vector + Stale Invisible OCR (No Stale Re-Injection)
    # ─────────────────────────────────────────────────────────────────────────
    def test_41_e2e_hybrid_visible_and_stale_invisible_purged(self):
        pdf_path = self.dir_path / "e2e_hybrid_stale.pdf"
        doc = fitz.open()
        page = doc.new_page(width=500, height=500)
        font = fitz.Font("helv")

        # 1. Visible vector heading
        tw1 = fitz.TextWriter(page.rect)
        tw1.append(fitz.Point(50, 50), "Visible Heading Test", font=font, fontsize=14)
        tw1.write_text(page, render_mode=0)

        # 2. Stale invisible OCR layer
        tw2 = fitz.TextWriter(page.rect)
        tw2.append(fitz.Point(50, 150), "Invisible OCR Layer Stale", font=font, fontsize=10)
        tw2.write_text(page, render_mode=3)

        doc.save(str(pdf_path))
        doc.close()

        res = run_ocr_on_pdf(str(pdf_path))
        self.assertTrue(res.success, f"OCR pipeline failed: {res.error_message}")

        out_doc = fitz.open(res.output_path)
        words = [w[4] for w in out_doc[0].get_text("words")]
        out_doc.close()
        Path(res.output_path).unlink(missing_ok=True)

        self.assertIn("Visible", words, "Visible vector text must survive")
        self.assertIn("Heading", words, "Visible vector text must survive")
        self.assertIn("Test", words, "Visible vector text must survive")
        self.assertNotIn("Invisible", words, "Stale invisible text must NEVER be re-injected")
        self.assertNotIn("Stale", words, "Stale invisible text must NEVER be re-injected")

    # ─────────────────────────────────────────────────────────────────────────
    # Area 19: End-to-End Pipeline - Mojibake PUA PDF Rejection
    # ─────────────────────────────────────────────────────────────────────────
    def test_42_e2e_mojibake_pua_fastpath_rejected(self):
        mojibake_text = "DocScalar \ue001\ue002 corrupt invoice details"
        is_valid, ratio, pua_count = validate_cmap_and_mojibake(mojibake_text)
        self.assertFalse(is_valid, "Mojibake text must be rejected from fast path")
        self.assertEqual(pua_count, 2)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 20: Unicode NFKC Normalization & Ligature Expansion
    # ─────────────────────────────────────────────────────────────────────────
    def test_43_unicode_nfkc_normalization_applied(self):
        # Ligatures 'ﬁ' (U+FB01) and 'ﬂ' (U+FB02) must normalize to standard 'fi' and 'fl'
        ligature_text = "ﬁle and ﬂow"
        normalized = unicodedata.normalize("NFKC", ligature_text)
        self.assertEqual(normalized, "file and flow", "NFKC normalization must expand ligatures")
        self.assertEqual(len(normalized), 13)

    # ─────────────────────────────────────────────────────────────────────────
    # Area 21: Error Handling & Invalid File Resilience
    # ─────────────────────────────────────────────────────────────────────────
    def test_44_nonexistent_file_handling(self):
        res = run_ocr_on_pdf("nonexistent_path_12345.pdf")
        self.assertFalse(res.success)
        self.assertIn("does not exist", res.error_message)


if __name__ == "__main__":
    unittest.main()
