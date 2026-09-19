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

# Dedicated high-definition executive male portrait for Marcus Vance
# Using fresh verified Unsplash male ID: photo-1560250097-0b93528c311a or photo-1519085360753 or photo-1506794778202 or photo-1534030347209 or photo-1522075469751
# Let's test a distinct professional executive portrait:
MALE_URL = "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=90"

# Alternate fresh male portrait ID to ensure 0 collisions:
FRESH_MALE_URL = "https://images.unsplash.com/photo-1557862921-37829c790f19?w=800&q=90"

def main():
    dirs = ["public/images/candidates", "dist/images/candidates"]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    filename = "marcus_vance.jpg"
    print(f"Downloading {filename} for [M] Marcus Vance...")
    try:
        req = urllib.request.Request(FRESH_MALE_URL, headers=headers)
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
