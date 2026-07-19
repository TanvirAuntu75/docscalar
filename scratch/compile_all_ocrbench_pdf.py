# scratch/compile_all_ocrbench_pdf.py
# Compiles all 1,000 downloaded images from OCRBench_Images into a single 1,000-page PDF in the Downloads folder.

import os
import sys
import cv2
from pathlib import Path
import fitz  # PyMuPDF

def main():
    images_dir = Path("C:/Users/Tanvir Alam/Downloads/OCRBench_Images")
    output_pdf_path = Path("C:/Users/Tanvir Alam/Downloads/ocrbench_all_images.pdf")
    
    if not images_dir.exists():
        print(f"Error: Directory {images_dir} does not exist.")
        return

    print("Scanning for images in OCRBench_Images...")
    image_paths = sorted(list(images_dir.glob("*.jpg")))
    
    if not image_paths:
        print("No images found in the directory.")
        return
        
    print(f"Found {len(image_paths)} images. Creating PDF...")
    
    doc = fitz.open()
    
    for i, img_path in enumerate(image_paths):
        try:
            # Get dimensions using OpenCV (fast, low memory)
            img = cv2.imread(str(img_path))
            if img is None:
                print(f"Warning: Failed to read image {img_path.name}. Skipping.")
                continue
            h, w = img.shape[:2]
            
            # Create a PDF page with the exact dimensions of the image
            page = doc.new_page(width=w, height=h)
            
            # Insert the image on the page
            page.insert_image(page.rect, filename=str(img_path))
            
            if (i + 1) % 100 == 0 or (i + 1) == len(image_paths):
                print(f"Compiled {i + 1}/{len(image_paths)} pages...")
                
        except Exception as e:
            print(f"Error adding image {img_path.name}: {e}")

    print("Saving compiled PDF to disk...")
    try:
        doc.save(str(output_pdf_path))
        doc.close()
        print(f"\nSuccess! 1,000-page PDF compiled to: {output_pdf_path}")
    except Exception as e:
        print(f"Error saving PDF: {e}")

if __name__ == "__main__":
    main()
