import sys
import os

# Add root folder to sys.path
sys.path.insert(0, ".")

from backend.services.ocr_engine import RobustOCREngine, OCRConfig

def test_pipeline():
    try:
        print("Initializing RobustOCREngine...")
        engine = RobustOCREngine()
        
        image_path = "scratch/dummy_test.png"
        print(f"Running pipeline on: {image_path}")
        
        result = engine.process(image_path)
        print("\nPipeline Result:")
        print("Status:", result["status"])
        print("Confidence:", result["confidence"])
        print("Flags:", result["error_flags"])
        print("Extracted Text:")
        print("---")
        print(result["extracted_text"])
        print("---")
        
    except Exception as e:
        print("Pipeline failed:", e)

if __name__ == "__main__":
    test_pipeline()
