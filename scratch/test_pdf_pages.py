import pdfplumber
from pathlib import Path

pdf_path = Path("backend/uploads/13e0a4fa-d068-4fd3-897c-1076e708555a/stress_test_scanned_ocr__1_.pdf")
if not pdf_path.exists():
    print("PDF not found!")
    exit(1)

with pdfplumber.open(pdf_path) as pdf:
    print(f"Total pages: {len(pdf.pages)}")
    for i, page in enumerate(pdf.pages):
        print(f"Page {i+1}: chars={len(page.chars)}, images={len(page.images)}, rects={len(page.rects)}, lines={len(page.lines)}")
