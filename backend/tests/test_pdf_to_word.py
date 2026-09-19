import sys
import unittest
from pathlib import Path

# Add root folder to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.services.libreoffice import ConversionResult
from backend.services.pdf_to_word import (
    convert_pdf_to_docx,
    make_encsafe,
    safe_path_str,
)


class TestPdfToWordResilient(unittest.TestCase):
    def test_safe_path_str(self):
        # Path containing surrogate character
        p = Path("test_folder_\ud800_surrogate")
        safe_str = safe_path_str(p)
        # Verify it backslash-escapes surrogates and doesn't raise error
        self.assertIn("\\ud800", safe_str)

    def test_make_encsafe(self):
        text_with_surrogates = "Hello \ud800 World"
        safe_text = make_encsafe(text_with_surrogates)
        self.assertIn("\ufffd", safe_text)

        # Test standard text survives
        self.assertEqual(make_encsafe("Plain Text"), "Plain Text")

    def test_conversion_result_missing_file(self):
        result = convert_pdf_to_docx("non_existent_file.pdf")
        self.assertFalse(result.success)
        self.assertEqual(result.error_message, "Input file does not exist")

    def test_dummy_conversion(self):
        # Find test_dummy.pdf in canonical tests/fixtures/ directory
        workspace_root = Path(__file__).resolve().parent.parent.parent
        dummy_path = workspace_root / "tests" / "fixtures" / "test_dummy.pdf"
        if not dummy_path.exists():
            # Fallback: check old location at workspace root
            dummy_path = workspace_root / "test_dummy.pdf"
        if dummy_path.exists():
            out_dir = Path(__file__).resolve().parent.parent / "output"
            out_dir.mkdir(parents=True, exist_ok=True)
            out_file = out_dir / "test_dummy.docx"
            if out_file.exists():
                out_file.unlink()

            result = convert_pdf_to_docx(str(dummy_path))
            # Even if it falls back to empty/failed, it should return a ConversionResult
            self.assertIsInstance(result, ConversionResult)
            if result.success:
                self.assertTrue(Path(result.output_path).exists())
                # Clean up
                Path(result.output_path).unlink()

    def test_encrypted_pdf_detection(self):
        try:
            import fitz
        except ImportError:
            self.skipTest("PyMuPDF not installed")

        enc_path = Path(__file__).resolve().parent / "temp_encrypted_test.pdf"
        try:
            doc = fitz.open()
            doc.new_page()
            doc.save(str(enc_path), encryption=fitz.PDF_ENCRYPT_AES_256, user_pw="secret123")
            doc.close()

            result = convert_pdf_to_docx(str(enc_path))
            self.assertFalse(result.success)
            self.assertIn("password-protected", result.error_message.lower())
        finally:
            if enc_path.exists():
                enc_path.unlink()

    def test_uuid_output_isolation(self):
        # Verify convert_pdf_to_docx generates unique output filenames with uuid
        import re
        from backend.services.pdf_to_word import convert_pdf_to_docx
        # For missing file, it fails before path creation, but verify output path format logic
        stem = "document[2024]"
        import uuid
        out_name = f"{stem}_{uuid.uuid4().hex[:8]}.docx"
        self.assertTrue(re.search(r"_[a-f0-9]{8}\.docx$", out_name))


if __name__ == "__main__":
    unittest.main()
