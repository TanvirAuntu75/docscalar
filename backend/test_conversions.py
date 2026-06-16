import os
import sys
from pathlib import Path

# Add root folder to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.services.utils import validate_pdf

def test_pdf_validation_missing():
    # Test validation on non-existent file
    result = validate_pdf("non_existent_file.pdf")
    assert result == "Input file does not exist."
    print("test_pdf_validation_missing passed!")

if __name__ == "__main__":
    print("Running DocForge Backend Unit Tests...")
    test_pdf_validation_missing()
    print("All backend tests completed successfully!")
