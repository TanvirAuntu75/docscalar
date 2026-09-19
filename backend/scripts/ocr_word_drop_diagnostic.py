"""
OCR Word-Drop Diagnostic — traces EXACTLY where words are lost in the pipeline.

For each page, reports:
  1. RAW word count from PaddleOCR (before any filtering)
  2. Words dropped by conf < 5.0
  3. Words dropped by punctuation regex
  4. Words dropped by digital overlap
  5. Final surviving word count
  6. Confidence score distribution
"""

import sys, os, tempfile, re, logging, time

logging.basicConfig(level=logging.INFO, format="%(message)s")

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

import fitz  # PyMuPDF

def diagnose_page(pdf_path: str, page_idx: int = 0):
    from backend.services.ocr_engine import RobustOCREngine
    
    engine = RobustOCREngine()
    
    doc = fitz.open(pdf_path)
    total_pages = doc.page_count
    print(f"\n{'='*70}")
    print(f"PDF: {pdf_path}")
    print(f"Diagnosing page: {page_idx} / {total_pages}")
    print(f"{'='*70}")
    
    page = doc[page_idx]
    page_rect = page.rect
    
    existing_words = page.get_text("words")
    digital_rects = [(w[0], w[1], w[2], w[3]) for w in existing_words]
    print(f"Existing digital text words: {len(digital_rects)}")
    
    pix = page.get_pixmap(dpi=200)
    print(f"Pixmap size: {pix.width} x {pix.height} ({pix.width * pix.height:,} pixels)")
    
    temp_path = os.path.join(tempfile.gettempdir(), f"ocr_diag_page{page_idx}.png")
    pix.save(temp_path)
    
    print(f"Running PaddleOCR inference...")
    t0 = time.time()
    ocr_res = engine.process(temp_path, engine_name="paddleocr", lang="en")
    elapsed = time.time() - t0
    print(f"Inference time: {elapsed:.1f}s")
    print(f"Status: {ocr_res.get('status')}, Confidence: {ocr_res.get('confidence')}")
    print(f"Flags: {ocr_res.get('error_flags')}")
    
    raw_words = ocr_res.get("words", [])
    print(f"\nRAW WORDS FROM PADDLEOCR: {len(raw_words)}")
    
    dropped_conf = []
    dropped_punct = []
    dropped_overlap = []
    survived = []
    
    sx = page_rect.width / pix.width
    sy = page_rect.height / pix.height
    
    buckets = {"0-5": 0, "5-10": 0, "10-20": 0, "20-35": 0, "35-50": 0, "50-70": 0, "70-90": 0, "90-100": 0}
    
    for word in raw_words:
        text_val = word.get("text", "").strip()
        conf = word.get("conf", 100.0)
        
        if conf < 5: buckets["0-5"] += 1
        elif conf < 10: buckets["5-10"] += 1
        elif conf < 20: buckets["10-20"] += 1
        elif conf < 35: buckets["20-35"] += 1
        elif conf < 50: buckets["35-50"] += 1
        elif conf < 70: buckets["50-70"] += 1
        elif conf < 90: buckets["70-90"] += 1
        else: buckets["90-100"] += 1
        
        if not text_val:
            dropped_conf.append((text_val, conf, "empty"))
            continue
        if conf is not None and conf < 5.0:
            dropped_conf.append((text_val, conf, "conf<5"))
            continue
        if re.fullmatch(r"[\W_]+", text_val):
            dropped_punct.append((text_val, conf))
            continue
        
        left = word.get("left", 0) * sx
        top = word.get("top", 0) * sy
        w = word.get("width", 0) * sx
        h = word.get("height", 0) * sy
        px0, py0, px1, py1 = left, top, left + w, top + h
        ocr_area = max((px1 - px0) * (py1 - py0), 1)
        
        is_overlap = False
        for dr in digital_rects:
            ix0 = max(px0, dr[0])
            iy0 = max(py0, dr[1])
            ix1 = min(px1, dr[2])
            iy1 = min(py1, dr[3])
            if ix1 > ix0 and iy1 > iy0:
                inter = (ix1 - ix0) * (iy1 - iy0)
                if inter / ocr_area > 0.35:
                    is_overlap = True
                    break
        
        if is_overlap:
            dropped_overlap.append((text_val, conf))
            continue
        
        survived.append((text_val, conf))
    
    print(f"\nFILTER RESULTS:")
    print(f"  Raw detections:           {len(raw_words)}")
    print(f"  Dropped (conf < 5):       {len(dropped_conf)}")
    print(f"  Dropped (punctuation):    {len(dropped_punct)}")
    print(f"  Dropped (digital overlap):{len(dropped_overlap)}")
    print(f"  SURVIVED:                 {len(survived)}")
    print(f"  Survival rate:            {len(survived)/max(len(raw_words),1)*100:.1f}%")
    
    print(f"\nCONFIDENCE DISTRIBUTION:")
    for bucket, count in buckets.items():
        bar = "#" * min(count, 50)
        print(f"  {bucket:>8}%: {count:>3} {bar}")
    
    if dropped_conf[:10]:
        print(f"\n  Dropped by confidence (first 10):")
        for text, conf, reason in dropped_conf[:10]:
            print(f"    [{conf:5.1f}%] '{text}' ({reason})")
    
    if dropped_punct[:10]:
        print(f"\n  Dropped by punctuation (first 10):")
        for text, conf in dropped_punct[:10]:
            print(f"    [{conf:5.1f}%] '{text}'")
    
    print(f"\n  First 20 SURVIVING words:")
    for text, conf in survived[:20]:
        print(f"    [{conf:5.1f}%] '{text}'")
    
    os.unlink(temp_path)
    doc.close()
    
    from backend.services.ocr import teardown_ocr_engine
    teardown_ocr_engine()
    
    return len(raw_words), len(survived)


if __name__ == "__main__":
    pdf_path = r"C:\Users\Tanvir Alam\Downloads\ocr_test_handwritt.pdf"
    if not os.path.exists(pdf_path):
        pdf_path = r"C:\Users\Tanvir Alam\Downloads\ocr_test_handwritten.pdf"
    if not os.path.exists(pdf_path):
        print(f"ERROR: Test PDF not found"); sys.exit(1)
    
    total_raw = 0
    total_survived = 0
    for page_idx in [0, 5, 7]:
        try:
            raw, surv = diagnose_page(pdf_path, page_idx)
            total_raw += raw
            total_survived += surv
        except Exception as e:
            print(f"Error on page {page_idx}: {e}")
            import traceback; traceback.print_exc()
    
    print(f"\n{'='*70}")
    print(f"TOTAL: Raw={total_raw}, Survived={total_survived}, Drop={100*(1-total_survived/max(total_raw,1)):.1f}%")
