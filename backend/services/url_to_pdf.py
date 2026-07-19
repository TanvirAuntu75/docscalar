from pathlib import Path
from backend.services.libreoffice import ConversionResult
from backend import config
from playwright.sync_api import sync_playwright
import uuid
from urllib.parse import urlparse

def convert_url_to_pdf(
    url: str,
    paper_format: str = "A4",
    landscape: bool = False,
    print_background: bool = True,
    margin_type: str = "default"
) -> ConversionResult:
    """
    Render an online URL link to a PDF document using Playwright Chromium.
    """
    try:
        from backend.jobs.queue import update_job_progress
        update_job_progress(10)
        
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return ConversionResult(success=False, error_message="Security Error: Only http and https protocols are allowed.")
            
        host = parsed.netloc or "webpage"
        safe_host = "".join(c for c in host if c.isalnum() or c in "._-")
        output_pdf_path = config.OUTPUT_DIR / f"{safe_host}_{uuid.uuid4().hex[:6]}.pdf"
        
        update_job_progress(20)
        
        margin_map = {
            "none": {"top": "0px", "right": "0px", "bottom": "0px", "left": "0px"},
            "minimum": {"top": "10px", "right": "10px", "bottom": "10px", "left": "10px"},
            "default": {"top": "40px", "right": "40px", "bottom": "40px", "left": "40px"},
        }
        margins = margin_map.get(margin_type, margin_map["default"])
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                page.set_default_timeout(60000)
                
                update_job_progress(40)
                page.goto(url, wait_until="load", timeout=60000)
                
                page.emulate_media(media="print")
                
                update_job_progress(70)
                try:
                    page.wait_for_load_state("networkidle", timeout=5000)
                except Exception:
                    pass
                try:
                    page.wait_for_function("document.fonts.ready", timeout=5000)
                except Exception:
                    pass
                    
                update_job_progress(90)
                page.pdf(
                    path=str(output_pdf_path),
                    format=paper_format,
                    landscape=landscape,
                    print_background=print_background,
                    margin=margins
                )
            finally:
                browser.close()
                
        update_job_progress(100)
        
        if output_pdf_path.exists():
            return ConversionResult(
                success=True,
                output_path=str(output_pdf_path),
                file_size_bytes=output_pdf_path.stat().st_size
            )
            
        return ConversionResult(
            success=False,
            error_message="Playwright completed but output PDF file was not created"
        )
    except Exception as e:
        return ConversionResult(success=False, error_message=f"URL to PDF failed: {str(e)}")
