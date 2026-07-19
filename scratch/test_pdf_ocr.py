import sys
import os
from pathlib import Path

# Add root folder to sys.path
sys.path.insert(0, ".")

# Mock the job progress updater since we are running outside worker
import backend.jobs.queue
backend.jobs.queue.update_job_progress = lambda progress: print(f"Mock Progress Update: {progress}%")

from backend.services.ocr import run_ocr_on_pdf
import fitz

def test_pdf_ocr():
    try:
        input_pdf = "test_dummy.pdf"
        if not os.path.exists(input_pdf):
            print(f"Error: {input_pdf} does not exist. Creating a dummy PDF to test...")
            # Create a simple PDF if it doesn't exist
            from reportlab.pdfgen import canvas
            c = canvas.Canvas(input_pdf)
            c.drawString(100, 500, "This is dummy text in a test PDF.")
            c.save()

        print(f"Running run_ocr_on_pdf on: {input_pdf}")
        result = run_ocr_on_pdf(input_pdf, language="eng")
        
        print("\nOCR PDF Result:")
        print("Success:", result.success)
        if result.success:
            print("Output Path:", result.output_path)
            print("File Size:", result.file_size_bytes, "bytes")
            
            # Verify the output PDF is searchable
            print("\nVerifying searchability of output PDF...")
            doc = fitz.open(result.output_path)
            print(f"Total pages in output PDF: {len(doc)}")
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text()
                print(f"Page {page_num + 1} extracted text length: {len(text)}")
                print(f"Page {page_num + 1} text content snippet:\n{text[:200]}")
                if len(text.strip()) > 0:
                    print("Page searchability check: PASSED!")
                else:
                    print("Page searchability check: FAILED (no text extracted)!")
            doc.close()
        else:
            print("Error:", result.error_message)
            
    except Exception as e:
        print("Test failed with exception:", e)

if __name__ == "__main__":
    test_pdf_ocr()
