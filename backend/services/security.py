import pikepdf
from pathlib import Path
from backend.services.libreoffice import ConversionResult
from backend import config

def protect_pdf(
    input_path: str,
    password: str,
    allow_print: bool = True,
    allow_copy: bool = True,
    allow_edit: bool = True
) -> ConversionResult:
    """
    Encrypt a PDF file using 256-bit AES with password protection and permissions control via pikepdf.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")

        output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}_protected.pdf"

        # Open and protect document using pikepdf
        with pikepdf.open(input_file) as pdf:
            # Build permissions matrix
            permissions = pikepdf.Permissions(
                accessibility=allow_copy,
                extract=allow_copy,
                modify_annotation=allow_edit,
                modify_assembly=allow_edit,
                modify_form=allow_edit,
                modify_other=allow_edit,
                print_lowres=allow_print,
                print_highres=allow_print
            )
            
            # Save encrypted output
            pdf.save(
                str(output_pdf_path),
                encryption=pikepdf.Encryption(
                    user=password,
                    owner=f"owner_{password}",
                    allow=permissions
                )
            )

        if not output_pdf_path.exists():
            return ConversionResult(success=False, error_message="Protected PDF compilation failed")

        return ConversionResult(
            success=True,
            output_path=str(output_pdf_path),
            file_size_bytes=output_pdf_path.stat().st_size
        )

    except Exception as e:
        return ConversionResult(success=False, error_message=f"PDF Protection failed: {str(e)}")


def unlock_pdf(input_path: str, password: str) -> ConversionResult:
    """
    Decrypt a password-protected PDF document via pikepdf.
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return ConversionResult(success=False, error_message="Input file does not exist")

        output_pdf_path = config.OUTPUT_DIR / f"{input_file.stem}_unlocked.pdf"

        # Open document with password
        try:
            with pikepdf.open(input_file, password=password) as pdf:
                pdf.save(str(output_pdf_path))
        except pikepdf.PasswordError:
            return ConversionResult(success=False, error_message="Invalid password provided for this PDF document.")

        if not output_pdf_path.exists():
            return ConversionResult(success=False, error_message="Decrypted PDF compilation failed")

        return ConversionResult(
            success=True,
            output_path=str(output_pdf_path),
            file_size_bytes=output_pdf_path.stat().st_size
        )

    except Exception as e:
        return ConversionResult(success=False, error_message=f"PDF Unlocking failed: {str(e)}")
