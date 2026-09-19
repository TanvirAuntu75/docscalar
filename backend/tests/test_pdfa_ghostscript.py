import os
import shutil
import tempfile
from pathlib import Path

import fitz

from backend.services.pdf_to_pdfa import convert_pdf_to_pdfa
from backend.services.libreoffice import resolve_ghostscript_binary


def test_ghostscript_binary_resolved():
    """Verify that Ghostscript binary is found on system."""
    gs_bin = resolve_ghostscript_binary()
    assert gs_bin is not None, "Ghostscript binary must be resolvable"
    assert Path(gs_bin).exists() or shutil.which(gs_bin) is not None


def test_convert_pdf_to_pdfa_success():
    """Verify successful end-to-end PDF to PDF/A conversion using Ghostscript."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        input_pdf = Path(tmp_dir) / "sample_doc.pdf"

        # Create a sample vector PDF with text and shapes
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        page.insert_text((72, 100), "ISO PDF/A Archival Test Document", fontsize=18)
        page.draw_rect(fitz.Rect(72, 120, 523, 300), color=(0.1, 0.2, 0.5), fill=(0.9, 0.95, 1.0))
        page.insert_text((90, 160), "Preserving vector geometries and font metadata.", fontsize=12)
        doc.save(str(input_pdf))
        doc.close()

        # Run conversion
        res = convert_pdf_to_pdfa(str(input_pdf))
        assert res.success is True, f"Conversion failed: {res.error_message}"
        assert res.output_path is not None
        assert Path(res.output_path).exists()
        assert res.file_size_bytes > 0

        # Verify output PDF
        out_doc = fitz.open(res.output_path)
        assert len(out_doc) == 1
        text = out_doc[0].get_text()
        assert "ISO PDF/A Archival Test Document" in text
        assert "Preserving vector geometries" in text
        out_doc.close()

        # Cleanup generated output in output_dir
        if Path(res.output_path).exists():
            try:
                os.remove(res.output_path)
            except Exception:
                pass
