import time
from pathlib import Path

from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate


def test_text_to_pdf():
    print("==================================================")
    print("DocScalar Text-to-PDF Conversion Test Run")
    print("==================================================")

    input_path = Path("C:/Users/Tanvir Alam/Desktop/New Text Document.txt")
    if not input_path.exists():
        print(f"Error: Test text file not found at: {input_path}")
        return

    output_dir = Path(__file__).parent / "test_output"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(
        f"1. Reading test file: {input_path.name} ({input_path.stat().st_size} bytes)..."
    )
    try:
        start_time = time.time()
        with open(input_path, "r", encoding="utf-8", errors="ignore") as f:
            text_content = f.read()

        word_count = len(text_content.split())
        print(f"   Success! Read {word_count} words.")

        # 2. Setup PDF output
        out_file = output_dir / f"test_text_converted_{int(time.time())}.pdf"
        print(f"\n2. Compiling into PDF: {out_file.name}...")

        doc = SimpleDocTemplate(
            str(out_file),
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54,
        )

        styles = getSampleStyleSheet()

        # Create a custom body style
        body_style = ParagraphStyle(
            "CustomBody",
            parent=styles["Normal"],
            fontSize=11,
            leading=15,
            alignment=TA_JUSTIFY,
            spaceAfter=10,
        )

        story = []

        # Parse paragraphs
        paragraphs = text_content.split("\n")
        for para in paragraphs:
            para = para.strip()
            if para:
                # Escape HTML-like chars for ReportLab
                clean_para = (
                    para.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                )
                story.append(Paragraph(clean_para, body_style))

        # Build document
        doc.build(story)

        duration = time.time() - start_time
        print(f"   Success! Saved PDF size: {out_file.stat().st_size} bytes")
        print(f"\nSuccess: Text-to-PDF conversion succeeded in {duration:.2f} seconds!")

    except Exception as e:
        print(f"   PDF compilation failed: {e}")

    print("==================================================")


if __name__ == "__main__":
    test_text_to_pdf()
