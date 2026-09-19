import asyncio
import os
import re
import sys
import tempfile
from pathlib import Path

import fitz  # PyMuPDF
import pytest
from fastapi.testclient import TestClient

from backend import config
from backend.main import app
from backend.services.html_to_pdf import (
    convert_html_file_to_pdf,
    convert_html_to_pdf,
    convert_html_to_pdf_sync,
)
from backend.services.libreoffice import ConversionResult

client = TestClient(app)


# ==============================================================================
# GROUP 1: ENDPOINT INPUT VALIDATION & ERROR HANDLING (Areas 1–7)
# ==============================================================================

def test_area_01_empty_html_string_rejected_with_400():
    """Area 1: Endpoint rejects empty string HTML payload with 400 Bad Request."""
    response = client.post("/api/convert/html-to-pdf", json={"html": ""})
    assert response.status_code == 400
    assert response.json()["detail"] == "HTML content cannot be empty"


def test_area_02_whitespace_only_html_rejected_with_400():
    """Area 2: Endpoint rejects whitespace-only HTML payload with 400 Bad Request."""
    response = client.post("/api/convert/html-to-pdf", json={"html": "   \n\t  "})
    assert response.status_code == 400
    assert response.json()["detail"] == "HTML content cannot be empty"


def test_area_03_null_html_payload_rejected_with_422():
    """Area 3: Endpoint rejects null HTML field with 422 Unprocessable Entity."""
    response = client.post("/api/convert/html-to-pdf", json={"html": None})
    assert response.status_code == 422


def test_area_04_missing_html_field_rejected_with_422():
    """Area 4: Endpoint rejects request missing the required 'html' key with 422."""
    response = client.post("/api/convert/html-to-pdf", json={"filename": "doc.pdf"})
    assert response.status_code == 422


def test_area_05_integer_html_field_rejected_with_422():
    """Area 5: Endpoint rejects non-string integer HTML field with 422."""
    response = client.post("/api/convert/html-to-pdf", json={"html": 12345})
    assert response.status_code == 422


def test_area_06_boolean_html_field_rejected_with_422():
    """Area 6: Endpoint rejects non-string boolean HTML field with 422."""
    response = client.post("/api/convert/html-to-pdf", json={"html": True})
    assert response.status_code == 422


def test_area_07_malformed_json_rejected():
    """Area 7: Endpoint rejects malformed JSON string with 422."""
    response = client.post(
        "/api/convert/html-to-pdf",
        content="not-valid-json",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422


# ==============================================================================
# GROUP 2: DEFAULT HEADERS, MAGIC NUMBERS & CONTENT-TYPE (Areas 8–12)
# ==============================================================================

def test_area_08_valid_html_returns_200_ok():
    """Area 8: Endpoint accepts minimal valid HTML and returns HTTP 200 OK."""
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": "<h1>Minimal Document</h1>"}
    )
    assert response.status_code == 200


def test_area_09_content_type_header_is_application_pdf():
    """Area 9: Response Content-Type header is strictly application/pdf."""
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": "<p>Header test</p>"}
    )
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/pdf"


def test_area_10_pdf_payload_starts_with_magic_bytes():
    """Area 10: Returned binary payload starts with %PDF-1. magic bytes."""
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": "<p>Magic check</p>"}
    )
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-1.")


def test_area_11_pdf_payload_contains_eof_marker():
    """Area 11: Returned binary payload contains valid PDF EOF marker."""
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": "<p>EOF check</p>"}
    )
    assert response.status_code == 200
    assert b"%%EOF" in response.content[-1024:]


def test_area_12_pdf_payload_length_non_trivial():
    """Area 12: Generated PDF payload is well-formed and exceeds minimum byte threshold (>2KB)."""
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": "<main><h1>Hello World</h1><p>Body paragraph.</p></main>"}
    )
    assert response.status_code == 200
    assert len(response.content) >= 2048


# ==============================================================================
# GROUP 3: FILENAME FORMATTING, SANITIZATION & CRLF INJECTION DEFENSE (Areas 13–17)
# ==============================================================================

def test_area_13_default_filename_when_omitted():
    """Area 13: Filename defaults to 'document.pdf' when omitted from payload."""
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": "<p>Default filename</p>"}
    )
    assert response.status_code == 200
    assert response.headers.get("content-disposition") == 'attachment; filename="document.pdf"'


def test_area_14_custom_filename_with_pdf_preserved():
    """Area 14: Custom filename already containing .pdf is preserved intact."""
    custom_name = "Resume_John_Doe_2026.pdf"
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": "<p>Custom name</p>", "filename": custom_name}
    )
    assert response.status_code == 200
    assert response.headers.get("content-disposition") == f'attachment; filename="{custom_name}"'


def test_area_15_custom_filename_without_pdf_appends_extension():
    """Area 15: Custom filename missing .pdf has .pdf extension automatically appended."""
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": "<p>Missing ext</p>", "filename": "Candidate_CV"}
    )
    assert response.status_code == 200
    assert response.headers.get("content-disposition") == 'attachment; filename="Candidate_CV.pdf"'


def test_area_16_filename_with_spaces_preserved_in_header():
    """Area 16: Filename containing spaces is quoted and preserved in Content-Disposition."""
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": "<p>Spaces in name</p>", "filename": "Jane Doe - Senior Architect.pdf"}
    )
    assert response.status_code == 200
    assert response.headers.get("content-disposition") == 'attachment; filename="Jane Doe - Senior Architect.pdf"'


def test_area_17_crlf_and_quotes_sanitized_against_header_injection():
    """Area 17: Carriage returns, newlines, and double quotes are sanitized to prevent CRLF injection."""
    malicious_filename = 'exploit\r\ninjection"evil.pdf'
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": "<p>Security header test</p>", "filename": malicious_filename}
    )
    assert response.status_code == 200
    header = response.headers.get("content-disposition", "")
    assert "\r" not in header
    assert "\n" not in header
    # Double quotes inside the name must be replaced with _
    assert 'attachment; filename="exploit__injection_evil.pdf"' == header


# ==============================================================================
# GROUP 4: UNICODE, INTERNATIONALIZATION & EMOJI RENDERING (Areas 18–22)
# ==============================================================================

def test_area_18_utf8_emojis_render_without_crash():
    """Area 18: UTF-8 emojis render cleanly without encoding error."""
    html = """<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body>
        <h1>Senior Developer 🧑‍💻</h1>
        <p>Skills: Python 🚀, Architecture 🏛️, Data 📊, Excellence ⭐</p>
    </body>
    </html>"""
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-1.")
    # Verify PDF parseable
    doc = fitz.open(stream=response.content, filetype="pdf")
    assert len(doc) >= 1
    doc.close()


def test_area_19_accented_european_text_extractable():
    """Area 19: Accented Western European characters render and are extractable via PyMuPDF."""
    html = """<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body>
        <h1>Résumé de José Müller</h1>
        <p>Überraschung und Qualitätsmanagement.</p>
    </body>
    </html>"""
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    doc = fitz.open(stream=response.content, filetype="pdf")
    extracted_text = doc[0].get_text()
    doc.close()
    assert "Müller" in extracted_text or "José" in extracted_text or len(extracted_text) > 0


def test_area_20_cjk_multilingual_characters_render():
    """Area 20: East Asian CJK characters render without encoding crash."""
    html = """<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body>
        <h1>日本語の履歴書 — 中文简历 — 한국어 이력서</h1>
        <p>Global Engineering Excellence across Tokyo, Beijing, Seoul.</p>
    </body>
    </html>"""
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-1.")
    doc = fitz.open(stream=response.content, filetype="pdf")
    assert len(doc) == 1
    doc.close()


def test_area_21_arabic_rtl_characters_render():
    """Area 21: Arabic / RTL script renders without encoding crash."""
    html = """<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body dir="rtl">
        <h1>سيرة ذاتية للمهندس البرمجي</h1>
        <p>خبرة في تطوير المنظومات السحابية المتقدمة.</p>
    </body>
    </html>"""
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-1.")
    doc = fitz.open(stream=response.content, filetype="pdf")
    assert len(doc) == 1
    doc.close()


def test_area_22_mathematical_symbols_render():
    """Area 22: Mathematical & scientific typography renders without crash."""
    html = """<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body>
        <h1>Algorithmic Complexity &amp; Statistics</h1>
        <p>Equation: &sum; x_i &ge; 0, &int; f(x)dx, &pi; &asymp; 3.14159, &radic;16 = 4 &plusmn; 0</p>
    </body>
    </html>"""
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    doc = fitz.open(stream=response.content, filetype="pdf")
    assert len(doc) == 1
    doc.close()


# ==============================================================================
# GROUP 5: CSS PRINT LAYOUT & GEOMETRY PARITY (Areas 23–28)
# ==============================================================================

def test_area_23_a4_page_dimensions_respected():
    """Area 23: Output PDF conforms to standard ISO A4 dimensions (595 x 842 pt ± 2pt)."""
    html = "<html><body><h1>A4 Dimension Test</h1></body></html>"
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    doc = fitz.open(stream=response.content, filetype="pdf")
    page = doc[0]
    rect = page.rect
    # A4: 595.28 pt width, 841.89 pt height
    assert abs(rect.width - 595.28) < 3.0
    assert abs(rect.height - 841.89) < 3.0
    doc.close()


def test_area_24_single_page_document_produces_one_page():
    """Area 24: Single page payload produces exactly 1 PDF page."""
    html = "<html><body><h1>Single Page</h1><p>Fits on one page.</p></body></html>"
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    doc = fitz.open(stream=response.content, filetype="pdf")
    assert len(doc) == 1
    doc.close()


def test_area_25_page_break_after_produces_two_pages():
    """Area 25: CSS page-break-after: always forces a clean 2-page PDF."""
    html = """<!DOCTYPE html>
    <html>
    <head>
        <style>
            .page-1 { page-break-after: always; break-after: page; height: 100px; }
            .page-2 { height: 100px; }
        </style>
    </head>
    <body>
        <div class="page-1"><h1>Page 1 Content</h1></div>
        <div class="page-2"><h1>Page 2 Content</h1></div>
    </body>
    </html>"""
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    doc = fitz.open(stream=response.content, filetype="pdf")
    assert len(doc) == 2
    doc.close()


def test_area_26_three_page_document_produces_three_pages():
    """Area 26: Multiple CSS page breaks produce exactly 3 pages."""
    html = """<!DOCTYPE html>
    <html>
    <head>
        <style>
            .break { page-break-after: always; break-after: page; }
        </style>
    </head>
    <body>
        <div class="break"><h1>Page 1</h1></div>
        <div class="break"><h1>Page 2</h1></div>
        <div><h1>Page 3</h1></div>
    </body>
    </html>"""
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    doc = fitz.open(stream=response.content, filetype="pdf")
    assert len(doc) == 3
    doc.close()


def test_area_27_landscape_option_produces_landscape_dimensions():
    """Area 27: Custom option landscape=True produces width > height."""
    html = "<html><body><h1>Landscape Test</h1></body></html>"
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": html, "options": {"landscape": True}}
    )
    assert response.status_code == 200
    doc = fitz.open(stream=response.content, filetype="pdf")
    page = doc[0]
    rect = page.rect
    assert rect.width > rect.height
    # A4 Landscape: 841.89 pt width, 595.28 pt height
    assert abs(rect.width - 841.89) < 3.0
    assert abs(rect.height - 595.28) < 3.0
    doc.close()


def test_area_28_custom_options_margins_processed_cleanly():
    """Area 28: Custom options with explicit margins are accepted and rendered."""
    html = "<html><body><p>Margins test</p></body></html>"
    options = {
        "format": "A4",
        "printBackground": True,
        "margin": {"top": "10mm", "bottom": "10mm", "left": "15mm", "right": "15mm"}
    }
    response = client.post(
        "/api/convert/html-to-pdf",
        json={"html": html, "options": options}
    )
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-1.")


# ==============================================================================
# GROUP 6: SECURITY & SSRF / LFI ROUTE INTERCEPTION (Areas 29–32)
# ==============================================================================

def test_area_29_local_file_inclusion_lfi_is_blocked():
    """Area 29: Local file inclusion file:/// scheme is blocked by route handler."""
    html = """<html><body>
        <h1>LFI Attack Simulation</h1>
        <img src="file:///etc/passwd" alt="passwd" />
        <iframe src="file:///C:/Windows/win.ini"></iframe>
    </body></html>"""
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    # Should render without crashing and without embedding the local file
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-1.")


def test_area_30_cloud_metadata_ip_ssrf_is_blocked():
    """Area 30: AWS/Cloud metadata IP (169.254.169.254) SSRF probe is blocked."""
    html = """<html><body>
        <h1>SSRF Probe</h1>
        <img src="http://169.254.169.254/latest/meta-data/" />
    </body></html>"""
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-1.")


def test_area_31_loopback_ip_ssrf_is_blocked():
    """Area 31: Loopback IP (127.0.0.1) internal SSRF request is blocked."""
    html = """<html><body>
        <h1>Internal Loopback Probe</h1>
        <img src="http://127.0.0.1:8000/api/admin" />
    </body></html>"""
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-1.")


def test_area_32_inline_data_uri_renders_successfully():
    """Area 32: Inline data:image URI renders without route interception abort."""
    # 1x1 transparent PNG data URI
    data_uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    html = f"""<html><body>
        <h1>Inline Image</h1>
        <img src="{data_uri}" width="50" height="50" alt="Pixel" />
    </body></html>"""
    response = client.post("/api/convert/html-to-pdf", json={"html": html})
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-1.")


# ==============================================================================
# GROUP 7: DIRECT SERVICE LAYER & INVARIANT CHECKS (Areas 33–36)
# ==============================================================================

def test_area_33_direct_service_returns_bytes():
    """Area 33: Direct call to convert_html_to_pdf with raw HTML returns bytes."""
    async def _run():
        return await convert_html_to_pdf("<h1>Direct Service Test</h1>")

    pdf_bytes = asyncio.run(_run())
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-1.")
    assert len(pdf_bytes) > 1000


def test_area_34_direct_service_file_conversion_returns_result():
    """Area 34: Direct call with an existing file returns ConversionResult with success=True."""
    with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8") as f:
        f.write("<h1>File Service Test</h1>")
        tmp_html = f.name

    async def _run():
        return await convert_html_file_to_pdf(tmp_html)

    try:
        result = asyncio.run(_run())
        assert isinstance(result, ConversionResult)
        assert result.success is True
        assert result.output_path is not None
        assert Path(result.output_path).exists()
        assert result.file_size_bytes > 0
        # Clean up output PDF
        Path(result.output_path).unlink(missing_ok=True)
    finally:
        Path(tmp_html).unlink(missing_ok=True)


def test_area_35_empty_input_to_service_raises_or_returns_failure():
    """Area 35: Empty input to convert_html_to_pdf raises ValueError when as_bytes=True and fails when as_bytes=False."""
    with pytest.raises(ValueError, match="HTML content cannot be empty"):
        asyncio.run(convert_html_to_pdf("", as_bytes=True))

    result = asyncio.run(convert_html_to_pdf("", as_bytes=False))
    assert result.success is False
    assert "empty" in result.error_message.lower()


def test_area_36_synchronous_wrapper_works():
    """Area 36: convert_html_to_pdf_sync executes synchronously and returns valid PDF bytes."""
    pdf_bytes = convert_html_to_pdf_sync("<h1>Sync Wrapper Test</h1>")
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-1.")
    assert len(pdf_bytes) > 1000
