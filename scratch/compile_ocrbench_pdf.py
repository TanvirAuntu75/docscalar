# scratch/compile_ocrbench_pdf.py
# Downloads first 10 images from HF OCRBench, performs OCR, and compiles a single searchable PDF in Downloads.

import os
import sys
import json
import urllib.request
import tempfile
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

import fitz  # PyMuPDF
import cv2
from reportlab.pdfgen import canvas

from backend.services.ocr_engine import RobustOCREngine

def main():
    downloads_dir = Path("C:/Users/Tanvir Alam/Downloads")
    output_pdf_path = downloads_dir / "ocrbench_test_selectable.pdf"
    
    print("Fetching sample metadata from Hugging Face Datasets API...")
    url = "https://datasets-server.huggingface.co/rows?dataset=echo840/OCRBench&config=default&split=test&offset=0&limit=10"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching dataset info: {e}")
        return

    rows = data.get("rows", [])
    if not rows:
        print("No rows returned from Hugging Face.")
        return

    print("Initializing RobustOCREngine...")
    engine = RobustOCREngine()
    
    temp_pdf_paths = []
    temp_img_paths = []

    print(f"\nProcessing {len(rows)} images to compile searchable PDF...")
    print("=" * 60)

    for i, row_data in enumerate(rows):
        row = row_data.get("row", {})
        image_info = row.get("image", {})
        image_url = image_info.get("src")
        expected_ans = row.get("answer", [])
        
        if not image_url:
            print(f"Page {i+1}: Image URL not found.")
            continue

        # Temporary files for raw image and single-page PDF
        fd_img, tmp_img_path = tempfile.mkstemp(suffix=".png")
        os.close(fd_img)
        temp_img_paths.append(tmp_img_path)

        fd_pdf, tmp_pdf_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd_pdf)
        temp_pdf_paths.append(tmp_pdf_path)

        try:
            print(f"Downloading image for Page {i+1} ({image_url})...")
            img_req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(img_req) as img_resp:
                with open(tmp_path := tmp_img_path, 'wb') as f:
                    f.write(img_resp.read())

            # Read image dimensions
            img = cv2.imread(tmp_img_path)
            if img is None:
                print(f"Page {i+1}: Failed to read downloaded image.")
                continue
            h, w = img.shape[:2]

            # Run PaddleOCR
            print(f"Running OCR on Page {i+1}...")
            res = engine.process(tmp_img_path, engine_name="paddleocr", lang="en")
            words = res.get("words", [])

            # Draw ReportLab page at exact image size (pixels as points)
            c = canvas.Canvas(tmp_pdf_path, pagesize=(w, h))
            c.drawImage(tmp_img_path, 0, 0, width=w, height=h)

            print(f"Embedding selectable text layer (found {len(words)} words)...")
            for word in words:
                text_val = word.get("text", "").strip()
                rect = word.get("rect")
                if not text_val or not rect or len(rect) < 4:
                    continue

                x0, y0, x1, y1 = rect
                pw = max(1.0, x1 - x0)
                ph = max(1.0, y1 - y0)
                
                # ReportLab Y-origin is bottom-left
                rx = x0
                ry = h - y1

                # Invisible text rendering (mode 3)
                to = c.beginText()
                to.setTextRenderMode(3)
                
                # Set font size slightly smaller than bounding box height
                font_size = max(1.0, ph * 0.85)
                to.setFont("Helvetica", font_size)
                to.setTextOrigin(rx, ry)
                to.textOut(text_val)
                c.drawText(to)

            c.save()
            print(f"Page {i+1} successfully compiled. Ground truth: {expected_ans}")
            print("-" * 40)

        except Exception as e:
            print(f"Failed to process Page {i+1}: {e}")

    # Stitch all single pages into a multi-page PDF in Downloads folder
    if temp_pdf_paths:
        print(f"\nStitching {len(temp_pdf_paths)} pages together...")
        out_pdf = fitz.open()
        for temp_pdf in temp_pdf_paths:
            if os.path.exists(temp_pdf):
                with fitz.open(temp_pdf) as page_doc:
                    out_pdf.insert_pdf(page_doc)
        
        # Save output PDF
        out_pdf.save(str(output_pdf_path))
        out_pdf.close()
        print(f"\nSuccess! Searchable PDF compiled to: {output_pdf_path}")
    else:
        print("Error: No pages were compiled successfully.")

    # Cleanup temp files
    for p in temp_img_paths + temp_pdf_paths:
        try:
            if os.path.exists(p):
                os.unlink(p)
        except Exception:
            pass

if __name__ == "__main__":
    main()
