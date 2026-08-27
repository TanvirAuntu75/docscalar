from pathlib import Path

import fitz
from pptx import Presentation
from pptx.util import Inches

from backend import config
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf


def convert_pdf_to_powerpoint(input_path: str) -> ConversionResult:
    """
    Renders PDF pages to high-DPI images and saves them as full-bleed PowerPoint slides.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(
                success=False, error_message="Input file does not exist"
            )

        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)

        output_pptx_path = config.OUTPUT_DIR / f"{input_file.stem}.pptx"

        prs = Presentation()
        doc = fitz.open(input_file)
        temp_images = []

        try:
            # Calculate dynamic aspect ratio from first page (16:9 widescreen vs 4:3 standard vs portrait)
            if len(doc) > 0:
                first_page = doc[0]
                aspect = first_page.rect.width / max(1.0, first_page.rect.height)
                if aspect >= 1.5:  # Widescreen ~16:9
                    prs.slide_width = Inches(13.333)
                    prs.slide_height = Inches(7.5)
                elif aspect <= 0.8:  # Portrait ~A4 / Letter
                    prs.slide_width = Inches(8.5)
                    prs.slide_height = Inches(11.0)
                else:  # Standard ~4:3
                    prs.slide_width = Inches(10.0)
                    prs.slide_height = Inches(7.5)
            else:
                prs.slide_width = Inches(10.0)
                prs.slide_height = Inches(7.5)

            # Slide layout index 6 is blank in standard PPTX templates
            blank_slide_layout = prs.slide_layouts[6]

            for i, page in enumerate(doc):
                # Render page to PNG
                pix = page.get_pixmap(dpi=150)
                img_name = f"temp_slide_{input_file.stem}_{i}.png"
                img_path = input_file.parent / img_name
                temp_images.append(img_path)
                pix.save(str(img_path))

                # Add new slide
                slide = prs.slides.add_slide(blank_slide_layout)

                # Add visual slide pictures full bleed
                slide.shapes.add_picture(
                    str(img_path), 0, 0, width=prs.slide_width, height=prs.slide_height
                )

                # Clear intermediate temp image
                if img_path.exists():
                    img_path.unlink(missing_ok=True)

            prs.save(output_pptx_path)

            if not output_pptx_path.exists():
                return ConversionResult(
                    success=False,
                    error_message="Compilation completed but pptx slide deck was not found",
                )

            return ConversionResult(
                success=True,
                output_path=str(output_pptx_path),
                file_size_bytes=output_pptx_path.stat().st_size,
            )
        finally:
            doc.close()
            for img_p in temp_images:
                if img_p.exists():
                    img_p.unlink(missing_ok=True)
    except Exception as e:
        return ConversionResult(success=False, error_message=str(e))
