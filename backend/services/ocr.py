import sys
import os
import tempfile
import logging
from pathlib import Path
import fitz  # PyMuPDF
import cv2
import numpy as np
from reportlab.pdfgen import canvas

from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf
from backend import config
from backend.services.ocr_engine import RobustOCREngine

logger = logging.getLogger(__name__)

def run_ocr_on_pdf(input_path: str, language: str = "eng") -> ConversionResult:
    """
    Applies page-by-page OCR to a PDF document using RobustOCREngine (PaddleOCR/Tesseract)
    and reconstructs a searchable PDF by drawing invisible text over the rendered page images.
    """
    temp_img_paths = []
    temp_pdf_paths = []
    doc = None
    
    try:
        from backend.jobs.queue import update_job_progress
        update_job_progress(5)
        
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")
            
        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)
            
        # Ensure output directory exists
        config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}_ocr.pdf"
        
        # Load PDF
        doc = fitz.open(str(input_file))
        total_pages = len(doc)
        
        if total_pages == 0:
            return ConversionResult(success=False, error_message="PDF contains no pages")
            
        # Map 3-letter language code to 2-letter code if needed
        lang = "en"
        if language:
            lang_clean = language.lower().strip()
            if lang_clean in ("eng", "en"):
                lang = "en"
            else:
                lang = lang_clean[:2]
                
        # Initialize RobustOCREngine
        engine = RobustOCREngine()
        
        # Process page by page in parallel using a ThreadPoolExecutor
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        page_results = [None] * total_pages
        completed_count = 0
        
        def process_page_task(page_idx):
            # Open separate document instance for thread safety
            t_doc = None
            try:
                t_doc = fitz.open(str(input_file))
                page = t_doc.load_page(page_idx)
                p_w = page.rect.width
                p_h = page.rect.height
                
                # Render page at 300 DPI for high-quality OCR
                pix = page.get_pixmap(dpi=300)
                
                # Save the pixmap to a temporary image file
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_img:
                    temp_img_path = tmp_img.name
                pix.save(temp_img_path)
                
                # Perform OCR on page image
                ocr_res = None
                try:
                    ocr_res = engine.process(temp_img_path, engine_name="paddleocr", lang=lang)
                except Exception as e:
                    logger.warning("PaddleOCR failed on page %d: %s. Retrying with Tesseract...", page_idx, e)
                    
                if not ocr_res or ocr_res.get("status") not in ("ok", "ok_with_warnings"):
                    try:
                        ocr_res = engine.process(temp_img_path, engine_name="tesseract", lang=lang)
                    except Exception as e:
                        logger.error("Tesseract also failed on page %d: %s", page_idx, e)
                
                words = []
                if ocr_res and "words" in ocr_res:
                    words = ocr_res["words"]
                    
                # Create single-page PDF with hidden text layer using ReportLab
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf:
                    temp_pdf_path = tmp_pdf.name
                
                # Initialize ReportLab canvas
                c = canvas.Canvas(temp_pdf_path, pagesize=(p_w, p_h))
                
                # Draw original page image as background
                c.drawImage(temp_img_path, 0, 0, width=p_w, height=p_h)
                
                # Calculate coordinates scaling: pixels to points
                scale_x = p_w / float(pix.width) if pix.width > 0 else 1.0
                scale_y = p_h / float(pix.height) if pix.height > 0 else 1.0
                
                # Draw invisible text words over the image
                for word in words:
                    text_val = word.get("text", "").strip()
                    if not text_val:
                        continue
                        
                    rect = word.get("rect")  # (x0, y0, x1, y1) in image pixels
                    if not rect or len(rect) < 4:
                        continue
                        
                    x0, y0, x1, y1 = rect
                    
                    # Scale coordinates to PDF points
                    px0 = x0 * scale_x
                    py0 = y0 * scale_y
                    px1 = x1 * scale_x
                    py1 = y1 * scale_y
                    
                    pw = max(1.0, px1 - px0)
                    ph = max(1.0, py1 - py0)
                    
                    # ReportLab Y-origin is at the bottom of the page
                    rx = px0
                    ry = p_h - py1
                    
                    # Draw text using invisible text render mode (mode 3)
                    to = c.beginText()
                    to.setTextRenderMode(3)  # Neither fill nor stroke (invisible selectable text)
                    
                    # Scale font size slightly smaller than the line height to fit inside bounding box
                    font_size = max(1.0, ph * 0.85)
                    to.setFont("Helvetica", font_size)
                    to.setTextOrigin(rx, ry)
                    to.textOut(text_val)
                    c.drawText(to)
                    
                c.save()
                return page_idx, temp_img_path, temp_pdf_path
            finally:
                if t_doc:
                    t_doc.close()

        # Run page processing tasks in a thread pool (max 4 concurrent pages)
        max_workers = min(4, os.cpu_count() or 2)
        logger.info("OCR: Spawning %d parallel backend OCR threads...", max_workers)
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(process_page_task, idx) for idx in range(total_pages)]
            for future in as_completed(futures):
                try:
                    idx, img_path, pdf_path = future.result()
                    page_results[idx] = (img_path, pdf_path)
                    temp_img_paths.append(img_path)
                    temp_pdf_paths.append(pdf_path)
                    completed_count += 1
                    pct = 10 + int((completed_count / total_pages) * 80)
                    update_job_progress(pct)
                except Exception as ex:
                    logger.exception("Failed processing page in OCR thread pool")
                    raise ex
                    
        # Filter and extract sorted PDF paths
        sorted_pdf_paths = [page_results[i][1] for i in range(total_pages) if page_results[i] is not None]
            
        # Stitch all temporary page PDFs into the final document using PyMuPDF
        update_job_progress(95)
        logger.info("OCR: Stitching %d pages together...", len(temp_pdf_paths))
        
        out_pdf = fitz.open()
        for temp_pdf in sorted_pdf_paths:
            with fitz.open(temp_pdf) as page_doc:
                out_pdf.insert_pdf(page_doc)
                
        out_pdf.save(str(output_pdf_path))
        out_pdf.close()
        
        update_job_progress(100)
        logger.info("OCR: PDF successfully compiled to %s", output_pdf_path)
        
        return ConversionResult(
            success=True,
            output_path=str(output_pdf_path),
            file_size_bytes=output_pdf_path.stat().st_size
        )
        
    except Exception as e:
        logger.exception("OCR page-by-page pipeline failed")
        return ConversionResult(success=False, error_message=f"OCR service error: {str(e)}")
        
    finally:
        # Close input document
        if doc:
            try:
                doc.close()
            except Exception:
                pass
                
        # Clean up temporary files
        for p in temp_img_paths + temp_pdf_paths:
            try:
                if os.path.exists(p):
                    os.unlink(p)
            except Exception as e:
                logger.warning("Failed to clean up temporary file %s: %s", p, e)
