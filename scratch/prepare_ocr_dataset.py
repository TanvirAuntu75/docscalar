"""
DocForge OCR Dataset Preparation Script
========================================
Run this locally BEFORE uploading to Google Drive.

Usage:
  python scratch/prepare_ocr_dataset.py --input <folder> --output <folder>

What it does:
  1. Scans input folder for images (.jpg, .png, .bmp, .tif) and PDFs
  2. Extracts PDF pages as images
  3. Auto-labels images using the current DocForge PaddleOCR engine (if no .txt sidecars)
  4. Crops each text region to 32px height (PaddleOCR rec format)
  5. Writes label_list.txt in PaddleOCR format (img_path TAB label)
  6. Output folder is ready to ZIP and upload to Google Drive
"""

import os
import sys
import argparse
import shutil
import random
from pathlib import Path
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.webp'}

def main():
    parser = argparse.ArgumentParser(description='Prepare OCR dataset for DocForge fine-tuning')
    parser.add_argument('--input',  '-i', required=True, help='Input folder with images/PDFs')
    parser.add_argument('--output', '-o', default='./ocr_dataset_prepared', help='Output folder')
    parser.add_argument('--lang',   '-l', default='en', help='Language for auto-labeling (en/ch/arabic)')
    parser.add_argument('--min-confidence', type=float, default=0.85, help='Min confidence for auto-labels')
    parser.add_argument('--no-crop', action='store_true', help='Skip resizing to 32px height')
    args = parser.parse_args()

    input_dir  = Path(args.input)
    output_dir = Path(args.output)
    crops_dir  = output_dir / 'crops'
    output_dir.mkdir(parents=True, exist_ok=True)
    crops_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Collect all images (including PDF pages)
    all_images = []

    pdf_files = list(input_dir.rglob('*.pdf'))
    if pdf_files:
        try:
            from pdf2image import convert_from_path
            print(f'Extracting {len(pdf_files)} PDFs...')
            for pdf_path in tqdm(pdf_files):
                pages = convert_from_path(str(pdf_path), dpi=200)
                for i, page in enumerate(pages):
                    out = crops_dir / f'{pdf_path.stem}_page{i:04d}.png'
                    page.save(str(out))
                    all_images.append(out)
        except ImportError:
            print('pdf2image not installed. Skipping PDFs. Run: pip install pdf2image')

    for img_path in input_dir.rglob('*'):
        if img_path.suffix.lower() in IMAGE_EXTS:
            all_images.append(img_path)

    print(f'Total images found: {len(all_images)}')

    # Step 2: Check for existing .txt sidecar labels
    labeled_pairs    = []
    unlabeled_images = []

    for img_path in all_images:
        txt_path = img_path.with_suffix('.txt')
        if txt_path.is_file():
            label = txt_path.read_text(encoding='utf-8').strip()
            if label:
                labeled_pairs.append((img_path, label))
                continue
        unlabeled_images.append(img_path)

    print(f'Pre-labeled   : {len(labeled_pairs)}')
    print(f'Need labeling : {len(unlabeled_images)}')

    # Step 3: Auto-label remaining images
    if unlabeled_images:
        print(f'\nAuto-labeling {len(unlabeled_images)} images with PaddleOCR ({args.lang})...')
        try:
            from paddleocr import PaddleOCR
            ocr = PaddleOCR(lang=args.lang, use_textline_orientation=True)
            skipped = 0
            before = len(labeled_pairs)
            for img_path in tqdm(unlabeled_images):
                try:
                    result = ocr.predict(str(img_path))
                    if result and result[0] and 'rec_text' in result[0]:
                        texts  = result[0]['rec_text']
                        scores = result[0].get('rec_score', [1.0] * len(texts))
                        good   = [t for t, s in zip(texts, scores) if s >= args.min_confidence and t.strip()]
                        if good:
                            labeled_pairs.append((img_path, ' '.join(good)))
                        else:
                            skipped += 1
                    else:
                        skipped += 1
                except Exception:
                    skipped += 1
            added = len(labeled_pairs) - before
            print(f'Auto-labeled: {added} new | Skipped (low conf): {skipped}')
        except ImportError:
            print('PaddleOCR not installed. Skipping auto-labeling.')
            print('To install: pip install paddleocr')

    # Step 4: Copy images to crops dir + normalize size
    print(f'\nNormalizing {len(labeled_pairs)} images...')
    final_pairs = []
    TARGET_H = 32

    try:
        from PIL import Image
        pil_available = True
    except ImportError:
        pil_available = False
        print('PIL not available - skipping resize. pip install Pillow')

    for idx, (img_path, label) in enumerate(tqdm(labeled_pairs)):
        try:
            dest = crops_dir / f'sample_{idx:06d}.png'
            if pil_available and not args.no_crop:
                img = Image.open(str(img_path)).convert('RGB')
                w, h = img.size
                new_w = max(32, min(3200, int(w * TARGET_H / h)))
                img.resize((new_w, TARGET_H)).save(str(dest))
            else:
                shutil.copy2(str(img_path), str(dest))
            final_pairs.append((str(dest.relative_to(output_dir)), label))
        except Exception:
            pass

    # Step 5: Write label files
    random.shuffle(final_pairs)
    split     = max(1, int(len(final_pairs) * 0.9))
    train_set = final_pairs[:split]
    val_set   = final_pairs[split:]

    with open(output_dir / 'label_list.txt', 'w', encoding='utf-8') as f:
        for img_rel, label in train_set:
            f.write(f'{img_rel}\t{label}\n')

    with open(output_dir / 'val_list.txt', 'w', encoding='utf-8') as f:
        for img_rel, label in val_set:
            f.write(f'{img_rel}\t{label}\n')

    print(f'\nDataset preparation complete!')
    print(f'   Output folder : {output_dir}')
    print(f'   Train samples : {len(train_set)}')
    print(f'   Val samples   : {len(val_set)}')
    print(f'   label_list.txt: {output_dir / "label_list.txt"}')
    print()
    print('Next step: ZIP the output folder and upload to Google Drive,')
    print('then run the docforge_ocr_finetune.ipynb notebook in Colab.')

if __name__ == '__main__':
    main()
