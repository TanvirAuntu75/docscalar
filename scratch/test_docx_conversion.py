import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.services.pdf_to_word import convert_pdf_to_docx

print("Running test conversion on test_dummy.pdf...")
result = convert_pdf_to_docx("test_dummy.pdf")
print("Success:", result.success)
print("Output Path:", result.output_path)
print("Error Message:", result.error_message)
