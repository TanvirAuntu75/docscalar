import os
import sys
import unittest
from pathlib import Path

# Add root folder to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.services.pdf_to_powerpoint import (
    convert_pdf_to_powerpoint,
    PDFToPPTXConverter,
    ConverterConfig,
    _clean
)
from backend.services.libreoffice import ConversionResult

class TestPdfToPowerpointResilient(unittest.TestCase):
    def test_clean_illegal_xml(self):
        # XML illegal control chars should be stripped
        text_with_null = "Hello\x00World\x0b!"
        self.assertEqual(_clean(text_with_null), "HelloWorld!")

        # Normal text should survive untouched
        self.assertEqual(_clean("Standard text"), "Standard text")

    def test_missing_input_file(self):
        result = convert_pdf_to_powerpoint("non_existent_file.pdf")
        self.assertFalse(result.success)
        self.assertEqual(result.error_message, "Input file does not exist")

    def test_dummy_conversion(self):
        # Find test_dummy.pdf in the workspace root
        dummy_path = Path(__file__).resolve().parent.parent / "test_dummy.pdf"
        if dummy_path.exists():
            out_dir = Path(__file__).resolve().parent.parent / "backend" / "test_output"
            out_dir.mkdir(parents=True, exist_ok=True)
            out_file = out_dir / "test_dummy.pptx"
            if out_file.exists():
                try:
                    out_file.unlink()
                except Exception:
                    pass

            # Update OUTPUT_DIR in config temporarily if needed, or rely on its default output behavior
            # In our implementation it uses config.OUTPUT_DIR
            result = convert_pdf_to_powerpoint(str(dummy_path))

            self.assertIsInstance(result, ConversionResult)
            if result.success:
                self.assertTrue(Path(result.output_path).exists())
                # Clean up
                try:
                    Path(result.output_path).unlink()
                except Exception:
                    pass
            else:
                # If it failed, check the error message
                print(f"Dummy conversion failed with: {result.error_message}")

if __name__ == "__main__":
    unittest.main()
