import fitz
from pptx import Presentation
from pptx.util import Inches
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf
from backend import config
from pathlib import Path

def convert_pdf_to_powerpoint(input_path: str) -> ConversionResult:
    """
    Renders PDF pages to high-DPI images and saves them as full-bleed PowerPoint slides.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")
            
        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)
            
        output_pptx_path = config.OUTPUT_DIR / f"{input_file.stem}.pptx"
        
        prs = Presentation()
        # Set aspect ratio standard: 10 in x 7.5 in
        prs.slide_width = Inches(10)
        prs.slide_height = Inches(7.5)
        
        # Slide layout index 6 is blank in standard PPTX templates
        blank_slide_layout = prs.slide_layouts[6]
        
        doc = fitz.open(input_file)
        
        for i, page in enumerate(doc):
            # Render page to PNG
            pix = page.get_pixmap(dpi=150)
            img_name = f"temp_slide_{input_file.stem}_{i}.png"
            img_path = input_file.parent / img_name
            pix.save(str(img_path))
            
            # Add new slide
            slide = prs.slides.add_slide(blank_slide_layout)
            
            # Add visual slide pictures full bleed
            slide.shapes.add_picture(
                str(img_path),
                0,
                0,
                width=prs.slide_width,
                height=prs.slide_height
            )
            
            # Clear intermediate temp image
            if img_path.exists():
                img_path.unlink()
                
        prs.save(output_pptx_path)
        
        if not output_pptx_path.exists():
            return ConversionResult(success=False, error_message="Compilation completed but pptx slide deck was not found")
            
        return ConversionResult(
            success=True,
            output_path=str(output_pptx_path),
            file_size_bytes=output_pptx_path.stat().st_size
        )
    except Exception as e:
        return ConversionResult(success=False, error_message=str(e))
