import subprocess
import sys
import fitz
from pathlib import Path
from backend.services.libreoffice import ConversionResult
from backend.services.utils import validate_pdf
from backend import config

def compress_pdf(input_path: str, quality_setting: float = 0.6) -> ConversionResult:
    """
    Compresses PDF. Uses Ghostscript (gs/gswin64c) if available on PATH,
    falling back to PyMuPDF stream optimization if Ghostscript is missing.
    """
    try:
        from backend.jobs.queue import update_job_progress
        update_job_progress(15)
        
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")
            
        validation_err = validate_pdf(str(input_file))
        if validation_err:
            return ConversionResult(success=False, error_message=validation_err)
            
        output_file = config.OUTPUT_DIR / f"{input_file.stem}_compressed.pdf"
        
        # 1. Attempt to find Ghostscript executable on PATH
        gs_exec = None
        for exe in ["gswin64c", "gswin32c", "gs"]:
            check_cmd = ["where", exe] if sys.platform == "win32" else ["which", exe]
            try:
                if subprocess.run(check_cmd, capture_output=True).returncode == 0:
                    gs_exec = exe
                    break
            except Exception:
                continue
                
        if gs_exec:
            # Ghostscript profiles: ebook=150dpi, screen=72dpi, printer=300dpi
            pdf_setting = "/ebook"
            if quality_setting < 0.4:
                pdf_setting = "/screen"
            elif quality_setting > 0.8:
                pdf_setting = "/printer"
                
            cmd = [
                gs_exec,
                "-dBATCH", "-dNOPAUSE", "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                f"-dPDFSETTINGS={pdf_setting}",
                f"-sOutputFile={str(output_file)}",
                str(input_file)
            ]
            
            creation_flags = 0
            if sys.platform == "win32":
                creation_flags = 0x08000000 # CREATE_NO_WINDOW
                
            update_job_progress(45)
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                creationflags=creation_flags
            )
            update_job_progress(90)
            
            if res.returncode == 0 and output_file.exists():
                update_job_progress(100)
                return ConversionResult(
                    success=True,
                    output_path=str(output_file),
                    file_size_bytes=output_file.stat().st_size
                )
                
        # 2. Fallback: PyMuPDF stream optimizer and image downscaler
        update_job_progress(40)
        doc = fitz.open(input_file)
        
        # Scrub unneeded metadata, XML, attachments, and thumbnails
        doc.scrub(
            metadata=True,
            xml_metadata=True,
            attached_files=True,
            thumbnails=True
        )
        
        # Downscale and compress images manually
        quality_val = int(quality_setting * 100)
        try:
            import io
            from PIL import Image
            
            for page in doc:
                image_list = page.get_images(full=True)
                for img_info in image_list:
                    xref = img_info[0]
                    base_image = doc.extract_image(xref)
                    if base_image:
                        image_bytes = base_image["image"]
                        image_ext = base_image["ext"]
                        
                        # Only compress standard image formats
                        if image_ext.lower() in ["jpeg", "jpg", "png"]:
                            img = Image.open(io.BytesIO(image_bytes))
                            
                            # Downscale if image exceeds maximum quality dimensions
                            max_dimension = 1200 if quality_setting > 0.6 else 800
                            if max(img.width, img.height) > max_dimension:
                                ratio = max_dimension / max(img.width, img.height)
                                new_size = (int(img.width * ratio), int(img.height * ratio))
                                img = img.resize(new_size, Image.Resampling.LANCZOS)
                            
                            output_bytes = io.BytesIO()
                            if img.mode in ["RGBA", "P"] and image_ext.lower() == "png":
                                img.save(output_bytes, format="PNG", optimize=True)
                            else:
                                if img.mode != "RGB":
                                    img = img.convert("RGB")
                                img.save(output_bytes, format="JPEG", quality=quality_val)
                            
                            compressed_data = output_bytes.getvalue()
                            doc.update_stream(xref, compressed_data)
        except Exception as e:
            print(f"PyMuPDF manual image compression failed: {e}")
            
        update_job_progress(80)
        doc.save(
            str(output_file),
            garbage=4,
            deflate=True,
            clean=True
        )
        doc.close()
        update_job_progress(95)
        
        if not output_file.exists():
            return ConversionResult(success=False, error_message="PyMuPDF optimization failed to output a compressed file")
            
        update_job_progress(100)
        return ConversionResult(
            success=True,
            output_path=str(output_file),
            file_size_bytes=output_file.stat().st_size
        )
        
    except Exception as e:
        return ConversionResult(success=False, error_message=f"Compression failed: {str(e)}")
