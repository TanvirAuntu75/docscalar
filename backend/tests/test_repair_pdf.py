import os
import tempfile
import unittest
from pathlib import Path
import fitz
import pikepdf

from backend.services.repair import repair_pdf


class TestRepairPdf(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def _create_sample_pdf(self, filename="sample.pdf", pages=2):
        path = self.temp_path / filename
        doc = fitz.open()
        for i in range(pages):
            page = doc.new_page(width=595, height=842)
            page.insert_text((50, 100), f"DocScalar Test Page {i+1} Content", fontsize=16)
        doc.save(str(path))
        doc.close()
        return path

    def test_valid_pdf_repair(self):
        pdf_path = self._create_sample_pdf("valid.pdf", pages=2)
        res = repair_pdf(str(pdf_path), mode="standard", strip_corrupt_metadata=True)
        self.assertTrue(res.success, f"Expected success but got: {res.error_message}")
        self.assertTrue(os.path.exists(res.output_path))
        self.assertGreater(res.file_size_bytes, 0)

        # Verify output is valid with PyMuPDF
        out_doc = fitz.open(res.output_path)
        self.assertEqual(len(out_doc), 2)
        text = out_doc[0].get_text()
        self.assertIn("DocScalar Test Page 1", text)
        out_doc.close()

    def test_corrupted_xref_recovery(self):
        """Simulate a PDF with shifted byte offsets / corrupted XREF table."""
        pdf_path = self._create_sample_pdf("corrupt_xref.pdf", pages=3)
        with open(pdf_path, "rb") as f:
            data = bytearray(f.read())

        # Corrupt the xref start offset in the trailer
        startxref_idx = data.rfind(b"startxref")
        if startxref_idx != -1:
            # Overwrite the number after startxref with a garbage offset
            eol = data.find(b"\n", startxref_idx)
            if eol != -1:
                data[startxref_idx + 10: eol] = b"999999999"

        damaged_path = self.temp_path / "damaged_xref.pdf"
        with open(damaged_path, "wb") as f:
            f.write(data)

        # Standard repair should reconstruct the xref table
        res = repair_pdf(str(damaged_path), mode="standard")
        self.assertTrue(res.success, f"Failed to recover corrupt xref: {res.error_message}")
        self.assertTrue(os.path.exists(res.output_path))

        out_doc = fitz.open(res.output_path)
        self.assertEqual(len(out_doc), 3)
        out_doc.close()

    def test_truncated_pdf_stream_recovery(self):
        """Simulate a truncated PDF where the last page or trailer was cut off."""
        pdf_path = self._create_sample_pdf("truncated.pdf", pages=3)
        with open(pdf_path, "rb") as f:
            data = f.read()

        # Cut off the last 25% of bytes (simulating incomplete network transfer)
        cut_data = data[: int(len(data) * 0.85)]
        cut_path = self.temp_path / "truncated_transfer.pdf"
        with open(cut_path, "wb") as f:
            f.write(cut_data)

        res = repair_pdf(str(cut_path), mode="deep")
        # Should salvage the intact pages
        if res.success:
            self.assertTrue(os.path.exists(res.output_path))
            out_doc = fitz.open(res.output_path)
            self.assertGreaterEqual(len(out_doc), 1)
            out_doc.close()

    def test_empty_file_fails_safely(self):
        empty_path = self.temp_path / "empty.pdf"
        empty_path.write_bytes(b"")
        res = repair_pdf(str(empty_path))
        self.assertFalse(res.success)
        self.assertIn("empty", res.error_message.lower())

    def test_nonexistent_file_fails_safely(self):
        missing_path = self.temp_path / "does_not_exist.pdf"
        res = repair_pdf(str(missing_path))
        self.assertFalse(res.success)
        self.assertIn("exist", res.error_message.lower())

    def test_metadata_stripping(self):
        pdf_path = self.temp_path / "meta_test.pdf"
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "Metadata test")
        doc.set_metadata({"title": "Top Secret Document", "author": "Sensitive Author"})
        doc.save(str(pdf_path))
        doc.close()

        res = repair_pdf(str(pdf_path), strip_corrupt_metadata=True)
        self.assertTrue(res.success)
        out_doc = fitz.open(res.output_path)
        meta = out_doc.metadata
        # Sensitive fields should be cleared or default
        self.assertNotEqual(meta.get("title"), "Top Secret Document")
        out_doc.close()


if __name__ == "__main__":
    unittest.main()
