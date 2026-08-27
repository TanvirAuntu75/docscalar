from pathlib import Path

import fitz


def validate_pdf(input_path: str) -> str:
    """
    Validate if a PDF is readable, not encrypted, and not corrupted.
    Returns:
        str: User-friendly error message if invalid, otherwise None (success).
    """
    try:
        input_file = Path(input_path)
        if not input_file.exists():
            return "Input file does not exist."

        try:
            doc = fitz.open(input_file)
        except Exception as e:
            err_msg = str(e).lower()
            if (
                "encrypted" in err_msg
                or "password" in err_msg
                or "authenticate" in err_msg
            ):
                return "This PDF is password-protected. Please unlock it first."
            return f"The PDF file appears to be corrupted or invalid: {e!s}"

        if doc.is_encrypted:
            doc.close()
            return "This PDF is password-protected. Please unlock it first."

        # Validate pages access
        try:
            _ = len(doc)
        except Exception as e:
            doc.close()
            return f"The PDF file appears to be corrupted or invalid: {e!s}"

        doc.close()
        return None
    except Exception as e:
        err_msg = str(e).lower()
        if "encrypted" in err_msg or "password" in err_msg or "authenticate" in err_msg:
            return "This PDF is password-protected. Please unlock it first."
        return f"The PDF file appears to be corrupted or invalid: {e!s}"
