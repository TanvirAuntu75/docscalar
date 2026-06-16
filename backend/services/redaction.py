import fitz
import json
from pathlib import Path
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf
from backend import config

def redact_pdf(input_path: str, redactions: list) -> ConversionResult:
    """
    Applies secure redactions to a PDF document, permanently deleting underlying text & image bytes.
    redactions: list of dicts containing:
        - page: int (0-indexed page number)
        - x or x0: float (0..1 scale relative to page width)
        - y or y0: float (0..1 scale relative to page height)
        - width or x1: float (relative)
        - height or y1: float (relative)
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")
            
        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)
            
        output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}_redacted.pdf"
        
        doc = fitz.open(input_file)
        
        for redact_info in redactions:
            page_num = redact_info.get("page", 0)
            if page_num < 0 or page_num >= len(doc):
                continue
                
            page = doc[page_num]
            w = page.rect.width
            h = page.rect.height
            
            # Extract coordinates (support both x/y/width/height and x0/y0/x1/y1 format)
            if "x0" in redact_info and "y0" in redact_info and "x1" in redact_info and "y1" in redact_info:
                x0_pct = redact_info["x0"]
                y0_pct = redact_info["y0"]
                x1_pct = redact_info["x1"]
                y1_pct = redact_info["y1"]
            elif "x" in redact_info and "y" in redact_info and "width" in redact_info and "height" in redact_info:
                x0_pct = redact_info["x"]
                y0_pct = redact_info["y"]
                x1_pct = x0_pct + redact_info["width"]
                y1_pct = y0_pct + redact_info["height"]
            else:
                continue
                
            # Convert percentage (0..1) or (0..100) to actual PDF points
            # Auto-detect scale (if any value > 1.01, assume 0..100 scale and divide by 100)
            is_100_scale = any(val > 1.01 for val in [x0_pct, y0_pct, x1_pct, y1_pct])
            scale = 100.0 if is_100_scale else 1.0
            
            x0 = (x0_pct / scale) * w
            y0 = (y0_pct / scale) * h
            x1 = (x1_pct / scale) * w
            y1 = (y1_pct / scale) * h
            
            # Normalize to ensure x0 <= x1 and y0 <= y1
            rect = fitz.Rect(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))
            
            # Add redaction annotation (fill color black: (0,0,0))
            page.add_redact_annot(rect, fill=(0, 0, 0))
            
        # Apply redactions to all pages
        for page in doc:
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS)
            
        doc.save(str(output_pdf_path))
        doc.close()
        
        return ConversionResult(
            success=True,
            output_path=str(output_pdf_path),
            file_size_bytes=output_pdf_path.stat().st_size
        )
    except Exception as e:
        return ConversionResult(success=False, error_message=f"Redaction failed: {str(e)}")
