import os
import sys
import unittest
import tempfile
from pathlib import Path

# Add root folder to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.services.pptx_to_pdf import (
    PPTXToPDFConverter,
    ConverterConfig,
    ConversionError,
    _ZIP_MAGIC,
    _OLE2_MAGIC
)
from backend.services.libreoffice import convert_with_libreoffice, ConversionResult

class TestPPTXToPDFResilient(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)
        from backend import config as backend_config
        self.orig_libreoffice_path = getattr(backend_config, "LIBREOFFICE_PATH", "libreoffice")
        backend_config.LIBREOFFICE_PATH = sys.executable

    def tearDown(self):
        from backend import config as backend_config
        backend_config.LIBREOFFICE_PATH = self.orig_libreoffice_path
        self.temp_dir.cleanup()

    def test_preflight_missing_file(self):
        conv = PPTXToPDFConverter()
        with self.assertRaises(ConversionError) as context:
            conv.convert(str(self.temp_path / "missing.pptx"), str(self.temp_path / "out.pdf"))
        self.assertIn("Input not found", str(context.exception))

    def test_preflight_empty_file(self):
        empty_file = self.temp_path / "empty.pptx"
        empty_file.write_bytes(b"")
        conv = PPTXToPDFConverter()
        with self.assertRaises(ConversionError) as context:
            conv.convert(str(empty_file), str(self.temp_path / "out.pdf"))
        self.assertIn("Input is empty", str(context.exception))

    def test_preflight_bad_magic(self):
        bad_file = self.temp_path / "bad.pptx"
        bad_file.write_bytes(b"NOT_A_ZIP_OR_OLE2_FILE")
        conv = PPTXToPDFConverter()
        with self.assertRaises(ConversionError) as context:
            conv.convert(str(bad_file), str(self.temp_path / "out.pdf"))
        self.assertIn("bad magic bytes", str(context.exception))

    def test_pdf_validation(self):
        # Valid PDF structure helper check
        valid_pdf = self.temp_path / "valid.pdf"
        valid_pdf.write_bytes(b"%PDF-1.4\n...\n%%EOF")
        self.assertTrue(PPTXToPDFConverter._is_valid_pdf(valid_pdf))

        # Invalid PDF header
        invalid_hdr = self.temp_path / "invalid_hdr.pdf"
        invalid_hdr.write_bytes(b"PDF-1.4\n...\n%%EOF")
        self.assertFalse(PPTXToPDFConverter._is_valid_pdf(invalid_hdr))

        # Invalid PDF trailer
        invalid_tlr = self.temp_path / "invalid_tlr.pdf"
        invalid_tlr.write_bytes(b"%PDF-1.4\n...\nEOF")
        self.assertFalse(PPTXToPDFConverter._is_valid_pdf(invalid_tlr))

    def test_dispatch_hook_validation_error(self):
        # Test routing in libreoffice.py and check preflight validation propagation
        bad_file = self.temp_path / "bad.pptx"
        bad_file.write_bytes(b"NOT_A_ZIP_OR_OLE2_FILE")
        
        result = convert_with_libreoffice(str(bad_file), "pdf")
        self.assertIsInstance(result, ConversionResult)
        self.assertFalse(result.success)
        self.assertIn("bad magic bytes", result.error_message)

if __name__ == "__main__":
    unittest.main()
