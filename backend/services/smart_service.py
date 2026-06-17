import docx
from pathlib import Path
import shutil
from backend.services.ai_service import generate_ai_enhancement
from backend.services.libreoffice import convert_with_libreoffice, ConversionResult
from backend import config

def extract_text(file_path: Path) -> str:
    """
    Extract raw text from .txt and .docx files.
    """
    ext = file_path.suffix.lower()
    
    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
            
    elif ext == ".docx":
        doc = docx.Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs]
        return "\n".join(paragraphs)
        
    else:
        raise ValueError(f"Text extraction is not supported for {ext} files.")

def convert_text_to_pdf_reportlab(text: str, base_file_path: Path) -> ConversionResult:
    """
    Directly compile text into a formatted PDF using ReportLab.
    Extremely fast fallback that doesn't require LibreOffice.
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_JUSTIFY
        
        output_pdf_path = config.OUTPUT_DIR / f"{base_file_path.stem}.pdf"
        
        doc = SimpleDocTemplate(
            str(output_pdf_path),
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )
        
        styles = getSampleStyleSheet()
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=11,
            leading=15,
            alignment=TA_JUSTIFY,
            spaceAfter=10
        )
        
        story = []
        for line in text.split("\n"):
            line = line.strip()
            if line:
                # Escape ReportLab specific XML tags
                clean_line = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                story.append(Paragraph(clean_line, body_style))
                
        doc.build(story)
        
        return ConversionResult(
            success=True,
            output_path=str(output_pdf_path),
            file_size_bytes=output_pdf_path.stat().st_size
        )
    except Exception as e:
        return ConversionResult(success=False, error_message=f"Direct PDF compilation failed: {str(e)}")

async def process_smart_convert(input_path: str, mode: str) -> ConversionResult:
    """
    Pipeline: 
      1. Extract text from uploaded document
      2. Process text with local Gemma-3-4B LLM model (summarize, clean, translate)
      3. Write enhanced text to a temp output document
      4. Convert output document to PDF using LibreOffice (or ReportLab if LibreOffice is missing)
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Uploaded document not found")

        # Step 1: Extract Text
        text = extract_text(input_file)
        if not text.strip():
            return ConversionResult(success=False, error_message="Document appears to be empty")

        # Step 2: Get AI response from local Gemma 3
        enhanced_text = await generate_ai_enhancement(text, mode)
        if enhanced_text.startswith("Error:") or enhanced_text.startswith("AI Processing failed:"):
            return ConversionResult(success=False, error_message=enhanced_text)

        # Step 3: Check if we are extracting tables (skip PDF conversion)
        if mode == "extract_tables":
            # Output directly to a markdown file
            output_file_name = f"{input_file.stem}_tables.md"
            output_file_path = input_file.parent / output_file_name
            with open(output_file_path, "w", encoding="utf-8") as f:
                f.write(enhanced_text)

            return ConversionResult(
                success=True,
                output_path=str(output_file_path),
                file_size_bytes=output_file_path.stat().st_size
            )

        # Step 4: Check if LibreOffice is available on the machine
        libreoffice_available = False
        if config.LIBREOFFICE_PATH:
            if Path(config.LIBREOFFICE_PATH).exists() or shutil.which(config.LIBREOFFICE_PATH):
                libreoffice_available = True

        if libreoffice_available:
            # Save enhanced text in a temporary text file
            enhanced_file_name = f"{input_file.stem}_enhanced.txt"
            enhanced_file_path = input_file.parent / enhanced_file_name
            with open(enhanced_file_path, "w", encoding="utf-8") as f:
                f.write(enhanced_text)

            # Convert to PDF via LibreOffice headless
            result = convert_with_libreoffice(str(enhanced_file_path), "pdf")
            
            # Clean up the intermediate txt file
            if enhanced_file_path.exists():
                enhanced_file_path.unlink()
                
            return result
        else:
            # Fast built-in ReportLab fallback
            print("LibreOffice not found. Compiling PDF directly via ReportLab...")
            result = convert_text_to_pdf_reportlab(enhanced_text, input_file)
            return result

    except Exception as e:
        return ConversionResult(success=False, error_message=str(e))
