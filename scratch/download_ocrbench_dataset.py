# scratch/download_ocrbench_dataset.py
# Downloads all 1,000 images from Hugging Face OCRBench split=test to C:/Users/Tanvir Alam/Downloads/OCRBench_Images

import os
import sys
import json
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

def normalize_filename(text):
    # Keep only alphanumeric and underscore
    return "".join(c if c.isalnum() or c == '_' else '_' for c in text)

def download_image(row_idx, image_url, answers, dest_dir):
    ans_str = "_".join(normalize_filename(ans) for ans in answers)[:50]
    filename = f"image_{row_idx:04d}_{ans_str}.jpg"
    dest_path = dest_dir / filename

    # Skip if already exists
    if dest_path.exists():
        return True

    try:
        req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            with open(dest_path, 'wb') as f:
                f.write(response.read())
        return True
    except Exception as e:
        # Retry once on failure
        try:
            req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=20) as response:
                with open(dest_path, 'wb') as f:
                    f.write(response.read())
            return True
        except Exception:
            return False

def main():
    dest_dir = Path("C:/Users/Tanvir Alam/Downloads/OCRBench_Images")
    dest_dir.mkdir(parents=True, exist_ok=True)
    print(f"Target folder verified: {dest_dir}")

    print("Fetching entire image list from Hugging Face Datasets API...")
    
    all_tasks = []
    limit = 100
    offset = 0
    total_rows = 1000  # Dataset size limit
    
    while offset < total_rows:
        url = f"https://datasets-server.huggingface.co/rows?dataset=echo840/OCRBench&config=default&split=test&offset={offset}&limit={limit}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
        except Exception as e:
            print(f"Error fetching metadata at offset {offset}: {e}")
            break
            
        rows = data.get("rows", [])
        if not rows:
            break
            
        for row_data in rows:
            row_idx = row_data.get("row_idx")
            row = row_data.get("row", {})
            image_info = row.get("image", {})
            image_url = image_info.get("src")
            answers = row.get("answer", [])
            
            if isinstance(answers, str):
                try:
                    answers = json.loads(answers)
                except Exception:
                    answers = [answers]
            elif not isinstance(answers, list):
                answers = [str(answers)]
                
            if image_url:
                all_tasks.append((row_idx, image_url, answers))
                
        offset += len(rows)
        print(f"Loaded metadata for {offset} samples...")

    print(f"\nMetadata loaded. Total images to download: {len(all_tasks)}")
    print("Starting parallel downloads with 24 workers...")

    downloaded = 0
    failed = 0
    
    with ThreadPoolExecutor(max_workers=24) as executor:
        futures = {
            executor.submit(download_image, row_idx, url, ans, dest_dir): row_idx
            for row_idx, url, ans in all_tasks
        }
        
        for fut in as_completed(futures):
            row_idx = futures[fut]
            if fut.result():
                downloaded += 1
            else:
                failed += 1
            
            if (downloaded + failed) % 50 == 0 or (downloaded + failed) == len(all_tasks):
                print(f"Progress: {downloaded + failed}/{len(all_tasks)} completed (Success: {downloaded}, Fail: {failed})")

    print(f"\nDownload finished.")
    print(f"Successfully saved {downloaded} images to: {dest_dir}")
    if failed > 0:
        print(f"Failed to download {failed} images.")

if __name__ == "__main__":
    main()
