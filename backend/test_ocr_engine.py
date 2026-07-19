import os
import sys
import unittest
import tempfile
import numpy as np
import cv2
from pathlib import Path

# Add root folder to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.services.ocr_engine import RobustOCREngine, OCRConfig

class TestRobustOCREngine(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)
        self.engine = RobustOCREngine()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_missing_image_path(self):
        res = self.engine.process(str(self.temp_path / "does_not_exist.png"))
        self.assertEqual(res["status"], "manual_review_required")
        self.assertIn("file_not_found", res["error_flags"])

    def test_empty_image_file(self):
        empty_file = self.temp_path / "empty.png"
        empty_file.write_bytes(b"")
        res = self.engine.process(str(empty_file))
        self.assertEqual(res["status"], "manual_review_required")
        self.assertIn("empty_file", res["error_flags"])

    def test_corrupted_image_file(self):
        corrupt_file = self.temp_path / "corrupt.png"
        corrupt_file.write_bytes(b"not_an_image_format_bytes_at_all")
        res = self.engine.process(str(corrupt_file))
        self.assertEqual(res["status"], "manual_review_required")
        self.assertIn("file_unreadable_or_unsupported", res["error_flags"])

    def test_phase4_postprocess_corrections(self):
        # Verify word replacement corrections
        self.assertEqual(self.engine._phase4_postprocess("Tbe"), "The")
        self.assertEqual(self.engine._phase4_postprocess("C0mpany 1nvoice"), "Company Invoice")

        # Verify numeric replacements
        # Swaps O -> 0 inside numeric contexts
        self.assertEqual(self.engine._phase4_postprocess("O123"), "0123")
        self.assertEqual(self.engine._phase4_postprocess("l999"), "1999")
        self.assertEqual(self.engine._phase4_postprocess("I555"), "1555")

        # Verify unicode printable character sanitation
        self.assertEqual(self.engine._phase4_postprocess("Clean\x00Text\x0b"), "CleanText")

if __name__ == "__main__":
    unittest.main()
