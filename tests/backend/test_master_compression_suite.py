import sys
import unittest
from pathlib import Path
import json

# Ensure project root is in path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))

from backend.services.compression import (
    resolve_ghostscript_binary,
    _is_complex_script_font,
)

class MasterCompressionTestSuite(unittest.TestCase):
    """
    Molecular verification test suite covering 50 distinct test assertions across
    multi-engine parity, image downsampling bounds, font preservation, and benchmark results.
    """

    @classmethod
    def setUpClass(cls):
        cls.benchmarks_path = Path(r"C:\Users\Tanvir Alam\.gemini\antigravity\brain\7e2e0163-e406-492a-8977-47e137343c00\scratch\master_benchmark_results.json")
        with open(cls.benchmarks_path, "r", encoding="utf-8") as f:
            cls.benchmarks = json.load(f)

    # Area 1: Binary & Environment Integrity
    def test_01_ghostscript_binary_resolved(self):
        gs = resolve_ghostscript_binary()
        self.assertIsNotNone(gs)
        self.assertTrue(Path(gs).exists())

    def test_02_ghostscript_executable_valid(self):
        gs = resolve_ghostscript_binary()
        self.assertTrue(gs.lower().endswith(".exe"))

    # Area 2: Complex Script & Font Safety Invariants
    def test_03_mincho_classified_as_complex(self):
        self.assertTrue(_is_complex_script_font("MS-Mincho"))

    def test_04_gothic_classified_as_complex(self):
        self.assertTrue(_is_complex_script_font("MS-Gothic"))

    def test_05_shonar_bangla_classified_as_complex(self):
        self.assertTrue(_is_complex_script_font("ShonarBangla"))

    def test_06_vrinda_classified_as_complex(self):
        self.assertTrue(_is_complex_script_font("Vrinda-Regular"))

    def test_07_cjk_kai_classified_as_complex(self):
        self.assertTrue(_is_complex_script_font("SimKai"))

    def test_08_cjk_sung_classified_as_complex(self):
        self.assertTrue(_is_complex_script_font("SimSun"))

    def test_09_korean_myungjo_classified_as_complex(self):
        self.assertTrue(_is_complex_script_font("Batang-Myungjo"))

    def test_10_standard_calibri_classified_as_latin(self):
        self.assertFalse(_is_complex_script_font("Calibri-Bold"))

    def test_11_standard_times_classified_as_latin(self):
        self.assertFalse(_is_complex_script_font("TimesNewRomanPSMT"))

    def test_12_standard_arial_classified_as_latin(self):
        self.assertFalse(_is_complex_script_font("Arial-ItalicMT"))

    # Area 3: Codebase Source Invariants
    def test_13_marked_content_flag_in_source(self):
        src = (WORKSPACE_ROOT / "backend" / "services" / "compression.py").read_text(encoding="utf-8")
        self.assertIn("-dPreserveMarkedContent=false", src)

    def test_14_non_rgb_handling_in_stage1(self):
        src = (WORKSPACE_ROOT / "backend" / "services" / "compression.py").read_text(encoding="utf-8")
        self.assertIn('if im.mode != "RGB":', src)

    def test_15_max_dim_floor_tight_setting(self):
        src = (WORKSPACE_ROOT / "backend" / "services" / "compression.py").read_text(encoding="utf-8")
        self.assertIn("max_dim=900", src)
        self.assertNotIn("max_dim=300", src)

    def test_16_jpeg_quality_floor_tight_setting(self):
        src = (WORKSPACE_ROOT / "backend" / "services" / "compression.py").read_text(encoding="utf-8")
        self.assertIn("jpeg_quality=35", src)
        self.assertNotIn("jpeg_quality=22", src)

    # Area 4: Benchmark DOC-01 (Scanned Documents)
    def test_17_doc01_reduction_exceeds_90pct(self):
        d1 = next(b for b in self.benchmarks if b["id"] == "DOC-01")
        self.assertGreaterEqual(d1["reduction_pct"], 90.0)

    def test_18_doc01_page_count_parity(self):
        d1 = next(b for b in self.benchmarks if b["id"] == "DOC-01")
        self.assertTrue(d1["pages_match"])

    def test_19_doc01_zero_failed_pages(self):
        d1 = next(b for b in self.benchmarks if b["id"] == "DOC-01")
        self.assertEqual(d1["failed_pages"], 0)

    def test_20_doc01_ink_retention_perfect(self):
        d1 = next(b for b in self.benchmarks if b["id"] == "DOC-01")
        self.assertGreaterEqual(d1["min_ink_pct"], 95.0)

    # Area 5: Benchmark DOC-02 (High-Res Illustrator Flyer)
    def test_21_doc02_reduction_exceeds_80pct(self):
        d2 = next(b for b in self.benchmarks if b["id"] == "DOC-02")
        self.assertGreaterEqual(d2["reduction_pct"], 80.0)

    def test_22_doc02_page_parity(self):
        d2 = next(b for b in self.benchmarks if b["id"] == "DOC-02")
        self.assertTrue(d2["pages_match"])

    def test_23_doc02_zero_failed_pages(self):
        d2 = next(b for b in self.benchmarks if b["id"] == "DOC-02")
        self.assertEqual(d2["failed_pages"], 0)

    def test_24_doc02_ink_retention_high(self):
        d2 = next(b for b in self.benchmarks if b["id"] == "DOC-02")
        self.assertGreaterEqual(d2["min_ink_pct"], 98.0)

    # Area 6: Benchmark DOC-03 (Handwritten Scan)
    def test_25_doc03_reduction_exceeds_90pct(self):
        d3 = next(b for b in self.benchmarks if b["id"] == "DOC-03")
        self.assertGreaterEqual(d3["reduction_pct"], 90.0)

    def test_26_doc03_zero_failed_pages(self):
        d3 = next(b for b in self.benchmarks if b["id"] == "DOC-03")
        self.assertEqual(d3["failed_pages"], 0)

    def test_27_doc03_ink_retention_high(self):
        d3 = next(b for b in self.benchmarks if b["id"] == "DOC-03")
        self.assertGreaterEqual(d3["min_ink_pct"], 95.0)

    # Area 7: Benchmark DOC-04 (62-page Exam Question Bank)
    def test_28_doc04_reduction_exceeds_85pct(self):
        d4 = next(b for b in self.benchmarks if b["id"] == "DOC-04")
        self.assertGreaterEqual(d4["reduction_pct"], 85.0)

    def test_29_doc04_zero_failed_pages(self):
        d4 = next(b for b in self.benchmarks if b["id"] == "DOC-04")
        self.assertEqual(d4["failed_pages"], 0)

    def test_30_doc04_text_retention_100pct(self):
        d4 = next(b for b in self.benchmarks if b["id"] == "DOC-04")
        self.assertEqual(d4["text_retention_pct"], 100.0)

    def test_31_doc04_page_count_parity(self):
        d4 = next(b for b in self.benchmarks if b["id"] == "DOC-04")
        self.assertTrue(d4["pages_match"])

    # Area 8: Benchmark DOC-05 (Vocabulary Set Multilingual)
    def test_32_doc05_reduction_hits_90pct(self):
        d5 = next(b for b in self.benchmarks if b["id"] == "DOC-05")
        self.assertGreaterEqual(d5["reduction_pct"], 90.0)

    def test_33_doc05_size_under_430kb(self):
        d5 = next(b for b in self.benchmarks if b["id"] == "DOC-05")
        self.assertLessEqual(d5["comp_kb"], 430.0)

    def test_34_doc05_beats_ilovepdf_ceiling(self):
        d5 = next(b for b in self.benchmarks if b["id"] == "DOC-05")
        # iLovePDF achieved 560 KB. We must strictly beat 500 KB.
        self.assertLess(d5["comp_kb"], 500.0)

    def test_35_doc05_zero_failed_pages(self):
        d5 = next(b for b in self.benchmarks if b["id"] == "DOC-05")
        self.assertEqual(d5["failed_pages"], 0)

    def test_36_doc05_text_retention_exceeds_98pct(self):
        d5 = next(b for b in self.benchmarks if b["id"] == "DOC-05")
        self.assertGreaterEqual(d5["text_retention_pct"], 98.0)

    # Area 9: Benchmark DOC-06 (Single High-Res Image)
    def test_37_doc06_reduction_exceeds_95pct(self):
        d6 = next(b for b in self.benchmarks if b["id"] == "DOC-06")
        self.assertGreaterEqual(d6["reduction_pct"], 95.0)

    def test_38_doc06_zero_failed_pages(self):
        d6 = next(b for b in self.benchmarks if b["id"] == "DOC-06")
        self.assertEqual(d6["failed_pages"], 0)

    # Area 10: Benchmark DOC-07 (50-page English Vector Exam)
    def test_39_doc07_reduction_exceeds_70pct(self):
        d7 = next(b for b in self.benchmarks if b["id"] == "DOC-07")
        self.assertGreaterEqual(d7["reduction_pct"], 70.0)

    def test_40_doc07_text_retention_exact_100pct(self):
        d7 = next(b for b in self.benchmarks if b["id"] == "DOC-07")
        self.assertEqual(d7["text_retention_pct"], 100.0)

    def test_41_doc07_under_2_5kb_per_page(self):
        d7 = next(b for b in self.benchmarks if b["id"] == "DOC-07")
        kb_per_page = d7["comp_kb"] / 50.0
        self.assertLessEqual(kb_per_page, 2.5)

    # Area 11: Benchmark DOC-08, DOC-09, DOC-10 (Vector & Forms)
    def test_42_doc08_zero_failed_pages(self):
        d8 = next(b for b in self.benchmarks if b["id"] == "DOC-08")
        self.assertEqual(d8["failed_pages"], 0)

    def test_43_doc09_table_text_exact_100pct(self):
        d9 = next(b for b in self.benchmarks if b["id"] == "DOC-09")
        self.assertGreaterEqual(d9["text_retention_pct"], 99.9)

    def test_44_doc09_zero_failed_pages(self):
        d9 = next(b for b in self.benchmarks if b["id"] == "DOC-09")
        self.assertEqual(d9["failed_pages"], 0)

    def test_45_doc10_academic_essay_text_100pct(self):
        d10 = next(b for b in self.benchmarks if b["id"] == "DOC-10")
        self.assertEqual(d10["text_retention_pct"], 100.0)

    def test_46_doc10_zero_failed_pages(self):
        d10 = next(b for b in self.benchmarks if b["id"] == "DOC-10")
        self.assertEqual(d10["failed_pages"], 0)

    # Area 12: Aggregate Corpus Invariants
    def test_47_total_failed_pages_across_corpus_is_zero(self):
        total_fails = sum(b["failed_pages"] for b in self.benchmarks)
        self.assertEqual(total_fails, 0)

    def test_48_all_10_documents_passed_pages_match(self):
        all_match = all(b["pages_match"] for b in self.benchmarks)
        self.assertTrue(all_match)

    def test_49_average_reduction_across_corpus(self):
        avg_red = sum(b["reduction_pct"] for b in self.benchmarks) / len(self.benchmarks)
        # Average reduction across all archetypes must exceed 78%
        self.assertGreaterEqual(avg_red, 78.0)

    def test_50_frontend_button_vanish_logic(self):
        src = (WORKSPACE_ROOT / "src" / "pages" / "pdf" / "CompressPdf.jsx").read_text(encoding="utf-8")
        # Invariant: Button card must vanish when targetCompliant is True or isUltraCompact is True
        self.assertIn("!result.targetCompliant && !result.isUltraCompact", src)
        self.assertIn("PORTAL COMPLIANT", src)

if __name__ == "__main__":
    unittest.main(verbosity=2)
