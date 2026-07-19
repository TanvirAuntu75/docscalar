import sys
import os
import time
import cv2
import numpy as np
import fitz

# Add root folder to sys.path
sys.path.insert(0, ".")

os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"

import paddle
from paddleocr import PaddleOCR

def test_speed():
    input_pdf = "backend/uploads/c2099e5c-85a5-40c7-bec8-3b738ea8835c/numbers_gs150.pdf"
    print(f"Loading {input_pdf}...")
    doc = fitz.open(input_pdf)
    page = doc.load_page(0)
    
    print("Rendering page at 150 DPI...")
    pix = page.get_pixmap(dpi=150)
    img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        img_data = cv2.cvtColor(img_data, cv2.COLOR_RGBA2BGR)
    elif pix.n == 3:
        img_data = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
        
    print(f"Image shape: {img_data.shape}")
    
    # Simulate upscaling by 2.0x as in preprocessing
    upscaled = cv2.resize(img_data, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    print(f"Upscaled shape (input to OCR): {upscaled.shape}")
    
    # Downscale for PaddleOCR
    max_side = 1600
    h_up, w_up = upscaled.shape[:2]
    scale_down = max_side / float(max(h_up, w_up))
    w_down = int(w_up * scale_down)
    h_down = int(h_up * scale_down)
    ocr_input = cv2.resize(upscaled, (w_down, h_down), interpolation=cv2.INTER_AREA)
    print(f"Downscaled for PaddleOCR: {ocr_input.shape} (scale: {scale_down:.3f})")
    
    print("Initializing PaddleOCR...")
    gpu_available = paddle.device.is_compiled_with_cuda()
    paddle.set_device('gpu' if gpu_available else 'cpu')
    reader = PaddleOCR(use_textline_orientation=True, lang='en')
    
    print("Running PaddleOCR on downscaled image...")
    t0 = time.time()
    results = reader.predict(ocr_input)
    print(f"PaddleOCR completed in {time.time() - t0:.2f}s")
    
    if results and results[0] and 'rec_texts' in results[0]:
        res_dict = results[0]
        print(f"Found {len(res_dict['rec_texts'])} texts.")
        # Print first 10
        for i in range(min(10, len(res_dict['rec_texts']))):
            text = res_dict['rec_texts'][i]
            score = res_dict['rec_scores'][i]
            bbox = res_dict['rec_polys'][i]
            # scale back coordinates
            x_coords = [pt[0] / scale_down for pt in bbox]
            y_coords = [pt[1] / scale_down for pt in bbox]
            print(f"Text: '{text}' | Conf: {score:.3f} | BBox (scaled back): {min(x_coords):.1f}, {min(y_coords):.1f}")
    else:
        print("No text detected.")

if __name__ == "__main__":
    test_speed()
