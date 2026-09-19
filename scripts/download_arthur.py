import os
import io
import sys
import urllib.request
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

def crop_smart_square(img, target_size=600):
    w, h = img.size
    if w > h:
        left = (w - h) // 2
        right = left + h
        top = 0
        bottom = h
    else:
        left = 0
        right = w
        top = 0
        bottom = w

    cropped = img.crop((left, top, right, bottom))
    resized = cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)
    return resized

PORTRAIT_URL = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=90"

def main():
    dirs = ["public/images/candidates", "dist/images/candidates"]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    filename = "arthur_pendelton.jpg"
    print(f"Downloading {filename} for [M] Arthur Pendelton...")
    try:
        req = urllib.request.Request(PORTRAIT_URL, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            img = Image.open(io.BytesIO(data)).convert("RGB")
            final_img = crop_smart_square(img, 600)
            
            for d in dirs:
                out_path = os.path.join(d, filename)
                final_img.save(out_path, format="JPEG", quality=92, optimize=True)
            print(f"✓ Successfully saved {filename} (Male portrait)")
    except Exception as e:
        print(f"✗ Failed {filename}: {e}")

if __name__ == "__main__":
    main()
