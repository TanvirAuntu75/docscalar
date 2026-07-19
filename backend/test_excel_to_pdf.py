import os
import sys
import unittest
import tempfile
from pathlib import Path

# Add root folder to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.services.excel_to_pdf import (
    ExcelToPDFConverter,
    ConverterConfig,
    ConversionError,
    _ZIP_MAGIC,
    _OLE2_MAGIC
)
from backend.services.libreoffice import convert_with_libreoffice, ConversionResult

class TestExcelToPDFResilient(unittest.TestCase):
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
        conv = ExcelToPDFConverter()
        with self.assertRaises(ConversionError) as context:
            conv.convert(str(self.temp_path / "missing.xlsx"), str(self.temp_path / "out.pdf"))
        self.assertIn("Input not found", str(context.exception))

    def test_preflight_empty_file(self):
        empty_file = self.temp_path / "empty.xlsx"
        empty_file.write_bytes(b"")
        conv = ExcelToPDFConverter()
        with self.assertRaises(ConversionError) as context:
            conv.convert(str(empty_file), str(self.temp_path / "out.pdf"))
        self.assertIn("Input is empty", str(context.exception))

    def test_preflight_legacy_xls(self):
        xls_file = self.temp_path / "legacy.xls"
        xls_file.write_bytes(_OLE2_MAGIC + b"\x00" * 10)
        conv = ExcelToPDFConverter()
        with self.assertRaises(ConversionError) as context:
            conv.convert(str(xls_file), str(self.temp_path / "out.pdf"))
        self.assertIn("Legacy .xls (OLE2) not supported", str(context.exception))

    def test_preflight_bad_magic(self):
        bad_file = self.temp_path / "bad.xlsx"
        bad_file.write_bytes(b"NOT_A_ZIP_FILE")
        conv = ExcelToPDFConverter()
        with self.assertRaises(ConversionError) as context:
            conv.convert(str(bad_file), str(self.temp_path / "out.pdf"))
        self.assertIn("bad magic bytes", str(context.exception))

    def test_prepare_csv_normalizes(self):
        csv_file = self.temp_path / "test.csv"
        # CSV with semicolon delimiter
        csv_file.write_text("A;B;C\n1;2;3", encoding="utf-8")
        
        conv = ExcelToPDFConverter()
        work_in = conv._prepare_csv(csv_file, self.temp_dir.name)
        
        self.assertTrue(work_in.exists())
        content = work_in.read_text(encoding="utf-8-sig")
        # Assert normalized to standard excel format (comma delimiter)
        self.assertIn("A,B,C", content)
        self.assertIn("1,2,3", content)

    def test_pdf_validation(self):
        # Valid PDF signature check
        valid_pdf = self.temp_path / "valid.pdf"
        valid_pdf.write_bytes(b"%PDF-1.4\n...\n%%EOF")
        self.assertTrue(ExcelToPDFConverter._is_valid_pdf(valid_pdf))

        # Invalid PDF header
        invalid_hdr = self.temp_path / "invalid_hdr.pdf"
        invalid_hdr.write_bytes(b"PDF-1.4\n...\n%%EOF")
        self.assertFalse(ExcelToPDFConverter._is_valid_pdf(invalid_hdr))

        # Invalid PDF trailer
        invalid_tlr = self.temp_path / "invalid_tlr.pdf"
        invalid_tlr.write_bytes(b"%PDF-1.4\n...\nEOF")
        self.assertFalse(ExcelToPDFConverter._is_valid_pdf(invalid_tlr))

    def test_dispatch_hook_validation_error(self):
        # Test routing in libreoffice.py and check validation propagation
        bad_file = self.temp_path / "bad.xlsx"
        bad_file.write_bytes(b"NOT_A_ZIP_FILE")
        
        result = convert_with_libreoffice(str(bad_file), "pdf")
        self.assertIsInstance(result, ConversionResult)
        self.assertFalse(result.success)
        self.assertIn("bad magic bytes", result.error_message)

if __name__ == "__main__":
    unittest.main()
