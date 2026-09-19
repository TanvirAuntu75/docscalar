"""Full 13-page OCR end-to-end verification."""
import sys, os, time
sys.stdout.reconfigure(encoding='utf-8')
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)
import fitz

def verify_output(output_path):
    doc = fitz.open(output_path)
    print(f"\nVERIFYING: {output_path} ({doc.page_count} pages)")
    print(f"{'='*80}")
    total_words = 0
    problems = []
    for i in range(doc.page_count):
        page = doc[i]
        words = page.get_text("words")
        text = page.get_text("text").strip()
        wc = len(words)
        total_words += wc
        status = "OK" if wc >= 10 else "LOW" if wc >= 3 else "EMPTY"
        if status != "OK": problems.append(i)
        preview = text[:100].replace('\n', ' ') if text else "(NO TEXT)"
        print(f"  Page {i+1:2d}: {wc:4d} words [{status:5s}] | {preview}")
    num_pages = doc.page_count
    doc.close()
    print(f"\nTOTAL: {total_words} words across {num_pages} pages")
    if problems:
        print(f"PROBLEM PAGES: {[p+1 for p in problems]}")
    else:
        print("ALL PAGES HAVE TEXT COVERAGE")
    return problems

if __name__ == "__main__":
    input_pdf = r"C:\Users\Tanvir Alam\Downloads\ocr_test_handwritt.pdf"
    if not os.path.exists(input_pdf):
        input_pdf = r"C:\Users\Tanvir Alam\Downloads\ocr_test_handwritten.pdf"
    print(f"Input: {input_pdf} (exists={os.path.exists(input_pdf)})")

    from backend.services.ocr import run_ocr_on_pdf, teardown_ocr_engine
    print(f"\nRunning OCR on all pages...")
    t0 = time.time()
    try:
        result = run_ocr_on_pdf(input_pdf, language="all")
        elapsed = time.time() - t0
        print(f"\nOCR done in {elapsed:.1f}s — success={result.success}")
        if result.output_path and os.path.exists(result.output_path):
            verify_output(result.output_path)
        elif result.success:
            # Try default output path
            from backend.core import config
            stem = os.path.splitext(os.path.basename(input_pdf))[0]
            out = os.path.join(str(config.OUTPUT_DIR), f"{stem}_ocr.pdf")
            if os.path.exists(out):
                verify_output(out)
            else:
                print(f"Output not found at {out}")
        else:
            print(f"OCR failed: {result.error_message}")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback; traceback.print_exc()
