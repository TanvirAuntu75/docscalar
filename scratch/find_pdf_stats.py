import os
from pathlib import Path
import pdfplumber

def scan():
    workspace = Path("c:/Users/Tanvir Alam/Downloads/New folder upscaled")
    for p in workspace.rglob("*.pdf"):
        if ".venv" in p.parts or "node_modules" in p.parts:
            continue
        print(f"\nPDF: {p.relative_to(workspace)}")
        try:
            with pdfplumber.open(p) as pdf:
                print(f"  Pages: {len(pdf.pages)}")
                for i in range(min(5, len(pdf.pages))):
                    page = pdf.pages[i]
                    print(f"    Page {i+1}: chars={len(page.chars)}, images={len(page.images)}, rects={len(page.rects)}, lines={len(page.lines)}")
        except Exception as e:
            print(f"  Error reading PDF: {e}")

if __name__ == "__main__":
    scan()
