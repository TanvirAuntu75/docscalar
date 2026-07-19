import fitz
import json
from pathlib import Path
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf
from backend import config

def edit_pdf_backend(input_path: str, annotations: list) -> ConversionResult:
    """
    Applies vector annotations, text redactions, and text-edit stamps using PyMuPDF (fitz).
    This handles font preservation, text wrapping, and clean coordinate translations.
    """
    try:
        from backend.jobs.queue import update_job_progress
        update_job_progress(10)
        
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")
            
        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)
            
        output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}_edited.pdf"
        
        doc = fitz.open(input_file)
        update_job_progress(30)
        
        # 1. First Pass: Add redactions to erase original text layers under 'text-edit' fields
        redacted_any = False
        for anno in annotations:
            if anno.get("type") == "text-edit":
                page_idx = anno.get("pageIndex", 0)
                if page_idx < 0 or page_idx >= len(doc):
                    continue
                page = doc[page_idx]
                w = page.rect.width
                h = page.rect.height
                
                x = anno.get("xPercent", 0) * w
                y = anno.get("yPercent", 0) * h
                width = anno.get("widthPercent", 0) * w
                height = anno.get("heightPercent", 0) * h
                
                # Make redaction box slightly larger for safe margins
                rect = fitz.Rect(x - 0.5, y - 0.5, x + width + 0.5, y + height + 0.5)
                # Fill color: white (1, 1, 1) standard background
                page.add_redact_annot(rect, fill=(1, 1, 1))
                redacted_any = True
                
        if redacted_any:
            for page in doc:
                page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS)
        
        update_job_progress(60)
        
        # 2. Second Pass: Add text stamps, drawings, and shapes
        for anno in annotations:
            page_idx = anno.get("pageIndex", 0)
            if page_idx < 0 or page_idx >= len(doc):
                continue
            page = doc[page_idx]
            w = page.rect.width
            h = page.rect.height
            
            # Helper to convert hex to float tuple (0..1)
            def hex_to_rgb(hex_str):
                if not hex_str:
                    return (0, 0, 0)
                hex_str = hex_str.lstrip('#')
                if len(hex_str) != 6:
                    return (0, 0, 0)
                return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))
                
            color = hex_to_rgb(anno.get("color", "#000000"))
            
            if anno.get("type") == "text-edit":
                x = anno.get("xPercent", 0) * w
                y = anno.get("yPercent", 0) * h
                width = anno.get("widthPercent", 0) * w
                height = anno.get("heightPercent", 0) * h
                rect = fitz.Rect(x, y, x + width, y + height)
                
                # Extract style metadata from original text spans in this area
                font_name = "helv"
                font_size = anno.get("fontSize", 10)
                
                try:
                    # Clip coordinates check
                    blocks = page.get_text("dict", clip=rect)["blocks"]
                    for b in blocks:
                        for l in b.get("lines", []):
                            for s in l.get("spans", []):
                                if s.get("font"):
                                    font_name = s["font"]
                                if s.get("size"):
                                    font_size = s["size"]
                except Exception:
                    pass
                
                # Normalize font names to fit standard base fonts
                font_lower = font_name.lower()
                final_font = "helv"
                if "times" in font_lower:
                    final_font = "tibo" if "bold" in font_lower else "tiro"
                elif "courier" in font_lower:
                    final_font = "cobo" if "bold" in font_lower else "cour"
                elif "bold" in font_lower or "heavy" in font_lower or "black" in font_lower:
                    final_font = "hebo"
                
                new_text = anno.get("newText", "")
                
                # Insert textbox wraps and aligns text to the bounding rect
                page.insert_textbox(
                    rect,
                    new_text,
                    fontsize=font_size,
                    fontname=final_font,
                    color=color,
                    align=0 # Left
                )
                
            elif anno.get("type") == "text":
                x = anno.get("xPercent", 0) * w
                y = anno.get("yPercent", 0) * h
                size = anno.get("size", 12)
                
                pt = fitz.Point(x, y)
                page.insert_text(
                    pt,
                    anno.get("text", ""),
                    fontsize=size,
                    fontname="helv",
                    color=color
                )
                
            elif anno.get("type") in ["pen", "highlight"]:
                points = anno.get("points", [])
                if len(points) < 2:
                    continue
                
                thickness = anno.get("thickness", 2)
                is_hl = anno.get("type") == "highlight"
                
                # Draw lines
                for i in range(len(points) - 1):
                    p1 = points[i]
                    p2 = points[i+1]
                    pt1 = fitz.Point(p1["xPercent"] * w, p1["yPercent"] * h)
                    pt2 = fitz.Point(p2["xPercent"] * w, p2["yPercent"] * h)
                    
                    press1 = p1.get("pressure", 0.5)
                    press2 = p2.get("pressure", 0.5)
                    avg_pressure = (press1 + press2) / 2.0
                    
                    shape = page.new_shape()
                    shape.draw_line(pt1, pt2)
                    
                    # Highlights are thicker, translucent lines
                    segment_width = thickness * (2.5 if is_hl else (0.3 + avg_pressure * 1.4))
                    shape.finish(
                        color=color,
                        width=segment_width,
                        lineCap=1,
                        lineJoin=1
                    )
                    shape.commit()
                    
            elif anno.get("type") == "shape":
                shape_type = anno.get("shapeType")
                start = anno.get("startPt", {})
                end = anno.get("endPt", {})
                
                s_pt = fitz.Point(start.get("xPercent", 0) * w, start.get("yPercent", 0) * h)
                e_pt = fitz.Point(end.get("xPercent", 0) * w, end.get("yPercent", 0) * h)
                thickness = anno.get("thickness", 2)
                
                shape = page.new_shape()
                if shape_type == "line":
                    shape.draw_line(s_pt, e_pt)
                elif shape_type == "arrow":
                    shape.draw_line(s_pt, e_pt)
                    import math
                    dx = e_pt.x - s_pt.x
                    dy = e_pt.y - s_pt.y
                    angle = math.atan2(dy, dx)
                    head_length = max(10.0, thickness * 3.0)
                    
                    wing1_x = e_pt.x - head_length * math.cos(angle - math.pi / 6)
                    wing1_y = e_pt.y - head_length * math.sin(angle - math.pi / 6)
                    wing2_x = e_pt.x - head_length * math.cos(angle + math.pi / 6)
                    wing2_y = e_pt.y - head_length * math.sin(angle + math.pi / 6)
                    
                    shape.draw_line(e_pt, fitz.Point(wing1_x, wing1_y))
                    shape.draw_line(e_pt, fitz.Point(wing2_x, wing2_y))
                elif shape_type == "rectangle":
                    rect = fitz.Rect(s_pt, e_pt)
                    shape.draw_rect(rect)
                elif shape_type == "circle":
                    rect = fitz.Rect(s_pt, e_pt)
                    shape.draw_oval(rect)
                    
                shape.finish(color=color, width=thickness)
                shape.commit()
                
        update_job_progress(90)
        doc.save(str(output_pdf_path))
        doc.close()
        update_job_progress(100)
        
        return ConversionResult(
            success=True,
            output_path=str(output_pdf_path),
            file_size_bytes=output_pdf_path.stat().st_size
        )
    except Exception as e:
        return ConversionResult(success=False, error_message=f"PDF edit failed: {str(e)}")
