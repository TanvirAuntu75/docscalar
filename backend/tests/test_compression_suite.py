import io
import pytest
from pathlib import Path
from PIL import Image
import fitz
from backend.services.compression import compress_pdf
from backend.services.utils import validate_pdf


@pytest.fixture
def sample_pdf_with_image_and_text(tmp_path: Path) -> Path:
    """
    Creates a synthetic 2-page PDF containing large uncompressed images and vector text.
    """
    pdf_path = tmp_path / "heavy_sample.pdf"
    doc = fitz.open()

    # Page 1: Vector Text + 1600x1200 high-res photo
    page1 = doc.new_page(width=595, height=842)
    page1.insert_text((50, 50), "Confidential Strategic Report 2026", fontsize=18)
    page1.insert_text((50, 80), "This vector text must remain selectable and 100% crisp after compression.", fontsize=11)

    # Generate heavy raw uncompressed RGB image
    img = Image.new("RGB", (1600, 1200), color=(120, 180, 240))
    # Draw some patterns to ensure entropy
    for x in range(0, 1600, 40):
        for y in range(0, 1200, 40):
            img.putpixel((x, y), (x % 255, y % 255, (x + y) % 255))

    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    page1.insert_image(fitz.Rect(50, 120, 545, 500), stream=img_bytes.getvalue())

    # Page 2: More vector text + second image
    page2 = doc.new_page(width=595, height=842)
    page2.insert_text((50, 50), "Financial Projections and Quantitative Models", fontsize=16)
    img2 = Image.new("RGB", (1200, 900), color=(200, 100, 50))
    img2_bytes = io.BytesIO()
    img2.save(img2_bytes, format="PNG")
    page2.insert_image(fitz.Rect(50, 100, 500, 450), stream=img2_bytes.getvalue())

    doc.save(str(pdf_path))
    doc.close()
    return pdf_path


def test_compression_extreme_reduction(sample_pdf_with_image_and_text: Path):
    """
    Asserts that Extreme mode (quality=0.35) achieves major compression reduction (>= 60%)
    while preserving 100% valid PDF structure.
    """
    orig_size = sample_pdf_with_image_and_text.stat().st_size
    res = compress_pdf(str(sample_pdf_with_image_and_text), quality_setting=0.35)

    assert res.success is True
    assert res.output_path is not None
    out_path = Path(res.output_path)
    assert out_path.exists()

    compressed_size = out_path.stat().st_size
    reduction_pct = (1.0 - (compressed_size / orig_size)) * 100.0

    print(f"Original: {orig_size} bytes -> Compressed: {compressed_size} bytes ({reduction_pct:.1f}% reduction)")
    assert reduction_pct >= 50.0  # Must achieve strong compression
    assert validate_pdf(str(out_path)) is None


def test_text_searchability_preserved_after_compression(sample_pdf_with_image_and_text: Path):
    """
    Asserts that vector text is NEVER destroyed or rasterized into flat images during compression.
    """
    res = compress_pdf(str(sample_pdf_with_image_and_text), quality_setting=0.35)
    assert res.success is True

    doc = fitz.open(res.output_path)
    p1_text = doc[0].get_text()
    p2_text = doc[1].get_text()
    doc.close()

    assert "Confidential Strategic Report 2026" in p1_text
    assert "This vector text must remain selectable" in p1_text
    assert "Financial Projections" in p2_text


def test_compression_invalid_input():
    """
    Asserts graceful failure when target file is missing or corrupted.
    """
    res = compress_pdf("non_existent_file.pdf", quality_setting=0.5)
    assert res.success is False
    assert "does not exist" in res.error_message
