"""
Download Teklia/IAM-line dataset from HuggingFace and extract it into
PaddleOCR training format:

  ocr_data/
  ├── IAM_line/
  │   ├── train/
  │   │   ├── images/
  │   │   │   ├── 000000.png
  │   │   │   └── ...
  │   │   └── labels.txt          # image_path\ttext
  │   ├── val/
  │   │   ├── images/
  │   │   │   └── ...
  │   │   └── labels.txt
  │   ├── test/
  │   │   ├── images/
  │   │   │   └── ...
  │   │   └── labels.txt
  │   └── stats.json              # dataset statistics
"""

import json
import os
import sys
import time
from pathlib import Path

def main():
    # ── Resolve output root ──────────────────────────────────────────
    project_root = Path(__file__).resolve().parent.parent.parent
    output_root = project_root / "ocr_data" / "IAM_line"
    
    print(f"[INFO] Project root : {project_root}")
    print(f"[INFO] Output folder: {output_root}")
    
    # ── Check if already extracted ───────────────────────────────────
    stats_file = output_root / "stats.json"
    if stats_file.exists():
        with open(stats_file, "r", encoding="utf-8") as f:
            existing = json.load(f)
        total = sum(existing.get("counts", {}).values())
        if total > 0:
            print(f"[SKIP] Dataset already extracted ({total} samples). Delete {output_root} to re-download.")
            return
    
    # ── Import datasets ──────────────────────────────────────────────
    try:
        from datasets import load_dataset
    except ImportError:
        print("[ERROR] 'datasets' library not installed. Run: pip install datasets")
        sys.exit(1)
    
    # ── Download ─────────────────────────────────────────────────────
    print("[INFO] Downloading Teklia/IAM-line from HuggingFace...")
    t0 = time.time()
    dataset = load_dataset("Teklia/IAM-line")
    print(f"[INFO] Download complete in {time.time() - t0:.1f}s")
    
    # ── Print available splits ───────────────────────────────────────
    print(f"[INFO] Available splits: {list(dataset.keys())}")
    for split_name in dataset:
        print(f"       {split_name}: {len(dataset[split_name])} samples")
    
    # ── Map split names ──────────────────────────────────────────────
    split_map = {}
    for key in dataset:
        if "train" in key.lower():
            split_map[key] = "train"
        elif "val" in key.lower() or "dev" in key.lower():
            split_map[key] = "val"
        elif "test" in key.lower():
            split_map[key] = "test"
        else:
            split_map[key] = key
    
    # ── Extract each split ───────────────────────────────────────────
    stats = {"counts": {}, "charset": set(), "max_text_len": 0, "min_text_len": 999999}
    
    for hf_name, local_name in split_map.items():
        split = dataset[hf_name]
        split_dir = output_root / local_name / "images"
        split_dir.mkdir(parents=True, exist_ok=True)
        
        label_file = output_root / local_name / "labels.txt"
        
        print(f"\n[INFO] Extracting '{hf_name}' -> '{local_name}/' ({len(split)} samples)")
        
        count = 0
        skipped = 0
        
        with open(label_file, "w", encoding="utf-8") as lf:
            for idx in range(len(split)):
                sample = split[idx]
                
                # Get image and text
                image = sample.get("image")
                text = sample.get("text", "")
                
                if image is None or not text or not text.strip():
                    skipped += 1
                    continue
                
                # Clean text (remove tabs, normalize whitespace)
                text = text.strip().replace("\t", " ").replace("\n", " ")
                
                # Save image
                img_filename = f"{count:06d}.png"
                img_path = split_dir / img_filename
                
                # Convert to grayscale if needed (handwriting doesn't need color)
                if image.mode != "L":
                    image = image.convert("L")
                
                image.save(str(img_path), "PNG")
                
                # Write PaddleOCR label format: relative_path\ttext
                # Path relative to the split directory
                rel_path = f"images/{img_filename}"
                lf.write(f"{rel_path}\t{text}\n")
                
                # Update stats
                stats["charset"].update(text)
                stats["max_text_len"] = max(stats["max_text_len"], len(text))
                stats["min_text_len"] = min(stats["min_text_len"], len(text))
                
                count += 1
                
                if count % 500 == 0:
                    print(f"       Processed {count}/{len(split)}...")
        
        stats["counts"][local_name] = count
        print(f"[DONE] {local_name}: {count} extracted, {skipped} skipped (empty text/image)")
    
    # ── Save stats ───────────────────────────────────────────────────
    charset_sorted = sorted(stats["charset"])
    stats_out = {
        "dataset": "Teklia/IAM-line",
        "source": "https://huggingface.co/datasets/Teklia/IAM-line",
        "language": "English",
        "script": "Latin",
        "type": "handwritten_line",
        "image_height": 128,
        "counts": stats["counts"],
        "total_samples": sum(stats["counts"].values()),
        "charset_size": len(charset_sorted),
        "charset": "".join(charset_sorted),
        "max_text_length": stats["max_text_len"],
        "min_text_length": stats["min_text_len"],
    }
    
    with open(stats_file, "w", encoding="utf-8") as f:
        json.dump(stats_out, f, indent=2, ensure_ascii=False)
    
    # ── Also save charset as dict.txt (PaddleOCR format) ─────────────
    dict_file = output_root / "dict.txt"
    with open(dict_file, "w", encoding="utf-8") as f:
        for ch in charset_sorted:
            f.write(f"{ch}\n")
    
    # ── Summary ──────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"EXTRACTION COMPLETE")
    print(f"{'='*60}")
    print(f"  Output:       {output_root}")
    print(f"  Total samples: {stats_out['total_samples']}")
    for split_name, cnt in stats_out['counts'].items():
        print(f"    {split_name:>10}: {cnt}")
    print(f"  Charset size:  {stats_out['charset_size']} unique characters")
    print(f"  Text length:   {stats_out['min_text_length']} - {stats_out['max_text_length']} chars")
    print(f"  Dict file:     {dict_file}")
    print(f"  Stats file:    {stats_file}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
