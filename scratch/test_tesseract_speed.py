import sys
import os
import time
import cv2
import numpy as np
from pathlib import Path
import fitz

# Add root folder to sys.path
sys.path.insert(0, ".")

import pytesseract
if sys.platform == "win32":
    tess_dir = r"C:\Program Files\Tesseract-OCR"
    tess_bin = os.path.join(tess_dir, "tesseract.exe")
    if os.path.exists(tess_bin):
        pytesseract.pytesseract.tesseract_cmd = tess_bin

from backend.services.ocr_engine import RobustOCREngine

def test_speed():
    input_pdf = "backend/uploads/c2099e5c-85a5-40c7-bec8-3b738ea8835c/numbers_gs150.pdf"
    print(f"Loading {input_pdf}...")
    doc = fitz.open(input_pdf)
    page = doc.load_page(0)
    
    print("Rendering page at 150 DPI...")
    t0 = time.time()
    pix = page.get_pixmap(dpi=150)
    img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        img_data = cv2.cvtColor(img_data, cv2.COLOR_RGBA2BGR)
    elif pix.n == 3:
        img_data = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
    print(f"Rendered in {time.time() - t0:.2f}s. Shape: {img_data.shape}")
    
    engine = RobustOCREngine()
    
    print("Running preprocessing...")
    t0 = time.time()
    binary, p1 = engine._phase1_preprocess(img_data, 150)
    print(f"Preprocessing finished in {time.time() - t0:.2f}s. Shape: {binary.shape}")
    
    print("Running layout mask...")
    t0 = time.time()
    masked, p2 = engine._phase2_layout_mask(binary)
    print(f"Layout mask finished in {time.time() - t0:.2f}s. Shape: {masked.shape}")
    
    print("Running Tesseract image_to_data...")
    t0 = time.time()
    try:
        tess_data = pytesseract.image_to_data(
            masked,
            output_type=pytesseract.Output.DICT,
            config=f"--psm 3"
        )
        print(f"Tesseract finished in {time.time() - t0:.2f}s. Found {len(tess_data['text'])} text blocks.")
        
        # Print a few words
        words = [w.strip() for w in tess_data['text'] if w.strip()]
        print("Sample detected words:", words[:20])
    except Exception as e:
        print("Tesseract failed:", e)

if __name__ == "__main__":
    test_speed()
