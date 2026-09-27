import unittest
import re
import fitz
from backend.services.ocr_engine import (
    RobustOCREngine,
    OCRConfig,
    apply_context_gated_guard,
    heal_split_words,
    get_symspell,
)


class TestHighPrecisionFlawlessOCR(unittest.TestCase):
    """
    Comprehensive test suite ensuring 100% flaw-free OCR processing:
    - Split-word kerning repair (f inds -> finds, downp our -> downpour)
    - Scientific notation and decimal point recovery (1 380649 -> 1.380649)
    - Formula and physical unit immunity (dU=dQ-dW, J/K, mol^-1)
    - Multilingual and Arabic logical order restoration
    - Resolution and config invariants (paddleocr_max_side = 2400)
    """

    def setUp(self):
        self.sp = get_symspell()

    # --- Area 1: Config & Resolution Invariants ---
    def test_01_paddleocr_max_side_resolution(self):
        cfg = OCRConfig()
        self.assertEqual(cfg.paddleocr_max_side, 2400)
        self.assertGreaterEqual(cfg.paddleocr_max_side, 2000)

    def test_02_symspell_dictionary_loaded(self):
        self.assertIsNotNone(self.sp)
        self.assertGreater(len(self.sp.words), 50000)

    # --- Area 2: Scientific Decimal Point & Constant Recovery ---
    def test_03_boltzmann_decimal_recovery(self):
        raw = "Boltzmann constan: k = 1 380649× 10-23 J/K"
        healed = heal_split_words(raw)
        self.assertIn("1.380649", healed)
        self.assertIn("Boltzmann constant:", healed)
        self.assertIn("J/K", healed)

    def test_04_avogadro_decimal_recovery(self):
        raw = "Avogadro's number: N =6 02214076×1023 mol-1"
        healed = heal_split_words(raw)
        self.assertIn("6.02214076", healed)
        self.assertIn("mol-1", healed)

    def test_05_formula_immunity_thermodynamics(self):
        raw = "dU =dQ-dW (where U =internal energy Q =heut W =work)"
        healed = heal_split_words(raw)
        self.assertIn("dU =dQ-dW", healed)
        self.assertIn("Q =heat", healed)
        self.assertIn("W =work", healed)

    def test_06_entropy_formula_symbol_immunity(self):
        raw = "s =k · ln(Ω)"
        healed = heal_split_words(raw)
        self.assertEqual(healed, "s =k · ln(Ω)")

    def test_07_gibbs_free_energy_reaction_fix(self):
        raw = "important: ∆g = ∆h - tΔs (Gibbs free energy determines reaclion spontaneity)"
        healed = heal_split_words(raw)
        self.assertIn("∆g = ∆h - tΔs", healed)
        self.assertIn("reaction spontaneity", healed)

    # --- Area 3: Split-Word Kerning & OCR Space Glitch Recovery ---
    def test_08_split_finds(self):
        raw = "I hope this letter f inds you well"
        healed = heal_split_words(raw)
        self.assertIn("letter finds you well", healed)
        self.assertNotIn("f inds", healed)

    def test_09_split_downpour_afternoons_library(self):
        raw = "a torrential downp our I've been spending most af ternoons in the librar y"
        healed = heal_split_words(raw)
        self.assertIn("downpour", healed)
        self.assertIn("afternoons", healed)
        self.assertIn("library", healed)
        self.assertNotIn("downp our", healed)
        self.assertNotIn("af ternoons", healed)
        self.assertNotIn("librar y", healed)

    def test_10_split_transferred_form(self):
        raw = "only transf erred or changed in f orm"
        healed = heal_split_words(raw)
        self.assertIn("transferred", healed)
        self.assertIn("in form", healed)
        self.assertNotIn("transf erred", healed)
        self.assertNotIn("inf orm", healed)

    def test_11_split_entropy_formula(self):
        raw = "Entropy f ormula (Bolizmann):"
        healed = heal_split_words(raw)
        self.assertIn("Entropy formula", healed)
        self.assertIn("Boltzmann", healed)
        self.assertNotIn("f ormula", healed)
        self.assertNotIn("Bolizmann", healed)

    def test_12_split_demon_entropy_paradox(self):
        raw = "Carnot cycle Maxwell's demon entrop y paradox"
        healed = heal_split_words(raw)
        self.assertIn("entropy paradox", healed)
        self.assertNotIn("entrop y", healed)

    # --- Area 4: German, French, and Spanish Specific Fixes ---
    def test_13_german_anaerobic_conditions(self):
        raw = "Die Probe wurde bei 37 °C unter angeroben Bed ingungen inkubiert"
        healed = heal_split_words(raw)
        self.assertIn("anaeroben Bedingungen", healed)
        self.assertNotIn("angeroben", healed)
        self.assertNotIn("Bed ingungen", healed)

    def test_14_german_discoloration_and_thursday(self):
        raw = "Donnersta8 9 November deutliche Verf ärbung der Lösung"
        healed = heal_split_words(raw)
        self.assertIn("Donnerstag 9 November", healed)
        self.assertIn("Verfärbung", healed)

    def test_15_french_morning_weather(self):
        raw = "Ce marin je me suis levé très tôt et l'air seniait la terre"
        healed = heal_split_words(raw)
        self.assertIn("Ce matin", healed)
        self.assertIn("sentait la terre", healed)

    def test_16_spanish_recipe_notes(self):
        raw = "Receia de la abuela -Cocido madrileño"
        healed = heal_split_words(raw)
        self.assertIn("Receta de la abuela", healed)
        self.assertNotIn("Receia", healed)

    def test_17_recipe_measurements_grams_and_split_de(self):
        raw = "500 s d e garbanzos, 300 s de morcillo, 150 8 de tocino"
        healed = heal_split_words(raw)
        self.assertIn("500 g de garbanzos", healed)
        self.assertIn("300 g de morcillo", healed)
        self.assertIn("150 g de tocino", healed)
        self.assertNotIn("500 s", healed)
        self.assertNotIn("d e", healed)

    # --- Area 5: Arabic & Multilingual Logical Order ---
    def test_18_arabic_rtl_word_reversal(self):
        # Raw PaddleOCR LTR CTC scans produce backwards characters: یزیزع (azizi), طقسمل (al-masqat), لامك (kamal)
        raw = "یزیزع طقسمل لامك"
        healed = heal_split_words(raw)
        self.assertIn("عزیزی", healed)
        self.assertIn("لمسقط", healed)
        self.assertIn("كمال", healed)

    def test_19_arabic_mixed_line_preservation(self):
        raw = "Dear friend عزیزی in Cairo"
        healed = heal_split_words(raw)
        self.assertIn("Dear friend", healed)
        self.assertIn("in Cairo", healed)

    # --- Area 6: Context-Gated Guard Token Immunity & Spellcheck ---
    def test_20_guard_high_confidence_immunity(self):
        res = apply_context_gated_guard("tezt", conf=95.0)
        self.assertEqual(res, "tezt")

    def test_21_guard_math_operator_immunity(self):
        res = apply_context_gated_guard("x=y+z", conf=50.0)
        self.assertEqual(res, "x=y+z")

    def test_22_guard_greek_symbol_immunity(self):
        res = apply_context_gated_guard("ΔS", conf=60.0)
        self.assertEqual(res, "ΔS")

    def test_23_guard_scientific_unit_immunity(self):
        res = apply_context_gated_guard("mol^-1", conf=60.0)
        self.assertEqual(res, "mol^-1")

    def test_24_guard_alphanumeric_code_immunity(self):
        res = apply_context_gated_guard("INV-9042", conf=50.0)
        self.assertEqual(res, "INV-9042")

    def test_25_guard_prose_spellcheck_heqt_to_heat(self):
        res = apply_context_gated_guard("heqt", conf=75.0)
        self.assertEqual(res, "heat")

    def test_26_guard_prose_spellcheck_constan_to_constant(self):
        res = apply_context_gated_guard("constan", conf=75.0)
        self.assertEqual(res, "constant")

    def test_27_guard_multiword_delegation(self):
        res = apply_context_gated_guard("I hope this letter f inds you well", conf=80.0)
        self.assertIn("finds", res)
        self.assertNotIn("f inds", res)

    # --- Area 7: RobustOCREngine Phase 4 Integration ---
    def test_28_phase4_end_to_end_postprocessing(self):
        engine = RobustOCREngine()
        messy_text = (
            "Boltzmann constan: k = 1 380649× 10-23 J/K\n"
            "Avogadro's number: N =6 02214076×1023 mol-1\n"
            "I hope this letter f inds you well\n"
            "a torrential downp our I've been spending most af ternoons in the librar y\n"
            "Die Probe wurde bei 37 °C unter angeroben Bed ingungen inkubiert"
        )
        cleaned = engine._phase4_postprocess(messy_text)
        self.assertIn("1.380649", cleaned)
        self.assertIn("6.02214076", cleaned)
        self.assertIn("finds", cleaned)
        self.assertIn("downpour", cleaned)
        self.assertIn("afternoons", cleaned)
        self.assertIn("library", cleaned)
        self.assertIn("anaeroben Bedingungen", cleaned)

    def test_29_empty_and_none_resilience(self):
        self.assertEqual(heal_split_words(""), "")
        self.assertIsNone(heal_split_words(None))
        self.assertEqual(apply_context_gated_guard(""), "")
        self.assertIsNone(apply_context_gated_guard(None))

    def test_30_whitespace_and_punctuation_preservation(self):
        raw = "   (where U =internal energy Q =heut W =work)...   "
        healed = heal_split_words(raw)
        self.assertTrue(healed.strip().startswith("(where"))
        self.assertTrue(healed.strip().endswith("work)..."))
        self.assertIn("Q =heat", healed)


if __name__ == "__main__":
    unittest.main()
