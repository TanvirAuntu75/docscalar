# scratch/test_ocrbench.py
# Downloads samples from Hugging Face OCRBench datasets-server API and evaluates RobustOCREngine accuracy.

import os
import sys
import json
import urllib.request
import tempfile
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.services.ocr_engine import RobustOCREngine

def normalize_text(text):
    if not text:
        return ""
    # Convert to uppercase and strip non-alphanumeric chars
    return "".join(c.upper() for c in text if c.isalnum())

def main():
    print("Fetching sample metadata from Hugging Face Datasets API...")
    # Fetch first 10 rows from OCRBench dataset
    url = "https://datasets-server.huggingface.co/rows?dataset=echo840/OCRBench&config=default&split=test&offset=0&limit=10"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching dataset info: {e}")
        return

    rows = data.get("rows", [])
    if not rows:
        print("No rows returned from Hugging Face datasets-server. Response data was:")
        print(json.dumps(data, indent=2))
        return

    print("Initializing RobustOCREngine...")
    engine = RobustOCREngine()

    correct = 0
    total = 0

    print(f"\nEvaluating {len(rows)} samples of OCRBench:\n" + "="*60)

    for i, row_data in enumerate(rows):
        row = row_data.get("row", {})
        image_info = row.get("image", {})
        image_url = image_info.get("src")
        
        # If 'answer' is string representation of list, parse it
        answers = row.get("answer", [])
        if isinstance(answers, str):
            try:
                answers = json.loads(answers)
            except Exception:
                answers = [answers]
        elif not isinstance(answers, list):
            answers = [str(answers)]

        question = row.get("question", "")
        question_type = row.get("question_type", "")

        if not image_url:
            print(f"Sample {i+1}: Image URL not found.")
            continue

        total += 1
        
        # Save image to temporary file
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            img_req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(img_req) as img_resp:
                with open(tmp_path, 'wb') as f:
                    f.write(img_resp.read())

            # Run OCR on the image
            res = engine.process(tmp_path, engine_name="paddleocr", lang="en")
            extracted_text = res.get("text", "").strip()

            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

            # Check matches
            got_norm = normalize_text(extracted_text)
            matched = False
            for ans in answers:
                if normalize_text(ans) == got_norm:
                    matched = True
                    break

            if matched:
                correct += 1
                status = "PASS"
            else:
                status = "FAIL"

            print(f"Sample {i+1}:")
            print(f"  Question Type: {question_type}")
            print(f"  Question:      {question}")
            print(f"  Expected:      {answers}")
            print(f"  Got:           '{extracted_text}'")
            print(f"  Status:        {status}")
            print("-" * 40)

        except Exception as ex:
            print(f"Sample {i+1} failed to process: {ex}")
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    if total > 0:
        accuracy = (correct / total) * 100
        print(f"\nEvaluation Complete.")
        print(f"Accuracy: {correct}/{total} ({accuracy:.1f}%)")

if __name__ == "__main__":
    main()
