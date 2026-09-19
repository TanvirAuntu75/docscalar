import os
import io
import sys
import urllib.request
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

# Verified working Unsplash IDs for remaining 7
REMAINING = {
    "kathleen":       ("F", "Kathleen Jenkins",       "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=800&q=90"),
    "stockholm_yellow": ("F", "Astrid Lindqvist",     "https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=800&q=90"),
    "kyoto_coral":    ("F", "Hana Tanaka",            "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=90"),
    "dublin_forest":  ("F", "Ciara O'Connor",         "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=90"),
    "prague_brass":   ("M", "Vaclav Dvorak",          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=90"),
    "vancouver_pine": ("M", "Liam MacIntyre",         "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=90"),
    "helsinki_frost": ("M", "Matti Virtanen",         "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=90")
}

# Distinct alternate IDs to ensure 100% uniqueness
FRESH_IDS = {
    "kathleen":       ("F", "Kathleen Jenkins",       "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=800&q=90"),
    "stockholm_yellow": ("F", "Astrid Lindqvist",     "https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=800&q=90"),
    "kyoto_coral":      ("F", "Hana Tanaka",          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=90"),
    "dublin_forest":  ("F", "Ciara O'Connor",         "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=800&q=90"),
    "prague_brass":   ("M", "Vaclav Dvorak",          "https://images.unsplash.com/photo-1507152832244-10d45c7eda57?w=800&q=90"),
    "vancouver_pine": ("M", "Liam MacIntyre",         "https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?w=800&q=90"),
    "helsinki_frost": ("M", "Matti Virtanen",         "https://images.unsplash.com/photo-1549068106-b024baf5062d?w=800&q=90")
}

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
        if bottom > h:
            bottom = h
            left = (w - h) // 2
            right = left + h
            top = 0

    cropped = img.crop((left, top, right, bottom))
    resized = cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)
    return resized

def main():
    dirs = ["public/images/candidates", "dist/images/candidates"]
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    for key, (gender, name, url) in FRESH_IDS.items():
        filename = f"{key}.jpg"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                img = Image.open(io.BytesIO(data)).convert("RGB")
                final_img = crop_smart_square(img, 600)
                
                for d in dirs:
                    out_path = os.path.join(d, filename)
                    final_img.save(out_path, format="JPEG", quality=92, optimize=True)
                print(f"✓ Successfully saved {filename} ({gender} - {name})")
        except Exception as e:
            print(f"✗ Failed {filename}: {e}")

if __name__ == "__main__":
    main()
