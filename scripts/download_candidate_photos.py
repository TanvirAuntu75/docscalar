import os
import urllib.request
from PIL import Image
import io

# High quality curated portraits with clear hair visibility, natural head headroom, and diverse demographics
PORTRAITS = {
    "adeline.jpg": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=90",
    "adora.jpg": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=90",
    "adam.jpg": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=90",
    "richard.jpg": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=90",
    "sebastian.jpg": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=90",
    "lorna.jpg": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&q=90",
    "donna.jpg": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=90",
    "isabel.jpg": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=90",
    "howard.jpg": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=90",
    "korina.jpg": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=90",
    "mariana.jpg": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=90",
    "olivia.jpg": "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=800&q=90",
    "jonathan.jpg": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=90",
    "emma.jpg": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=90",
    "charles.jpg": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=90",
    "kathleen.jpg": "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=800&q=90",
    "marcus.jpg": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&q=90",
    "clara.jpg": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=90",
    "evelyn.jpg": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=90",
    "alexander.jpg": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=90",
    "mateo.jpg": "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800&q=90",
    "yuki.jpg": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=90",
    "mei.jpg": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=90",
    "catrine.jpg": "https://images.unsplash.com/photo-1548142813-c348350df52b?w=800&q=90",
    "kelly.jpg": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=90",
    "berlin.jpg": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&q=90",
    "elena.jpg": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=90",
    "jason.jpg": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=90",
    "claire.jpg": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=90",
    "chloe.jpg": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&q=90",
}

# Numbered candidates mapping
NUMBERED_MAP = {
    "candidate_1.jpg": "mariana.jpg",
    "candidate_2.jpg": "berlin.jpg",
    "candidate_3.jpg": "olivia.jpg",
    "candidate_4.jpg": "charles.jpg",
    "candidate_5.jpg": "emma.jpg",
    "candidate_6.jpg": "mateo.jpg",
    "candidate_7.jpg": "yuki.jpg",
    "candidate_8.jpg": "mei.jpg",
    "candidate_9.jpg": "adora.jpg",
    "candidate_10.jpg": "jonathan.jpg",
    "candidate_11.jpg": "howard.jpg",
    "candidate_12.jpg": "evelyn.jpg",
    "candidate_13.jpg": "isabel.jpg",
    "candidate_14.jpg": "kathleen.jpg",
    "candidate_15.jpg": "alexander.jpg",
}

def crop_smart_square(img, target_size=600):
    w, h = img.size
    # Crop to square maintaining top-bias (hair and face)
    if w > h:
        # Landscape: center horizontally, keep full height
        left = (w - h) // 2
        right = left + h
        top = 0
        bottom = h
    else:
        # Portrait: keep full width, crop from top with slight padding (0 to w)
        # Take square starting from top (0) so hair is never cropped!
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
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    saved_images = {}
    for filename, url in PORTRAITS.items():
        print(f"Downloading {filename}...")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                img = Image.open(io.BytesIO(data)).convert("RGB")
                final_img = crop_smart_square(img, 600)
                
                # Save to both public and dist
                for d in dirs:
                    out_path = os.path.join(d, filename)
                    final_img.save(out_path, "JPEG", quality=92)
                saved_images[filename] = final_img
                print(f"  [OK] Saved {filename} (600x600)")
        except Exception as e:
            print(f"  [ERROR] downloading {filename}: {e}")

    # Copy numbered candidates
    for num_file, source_file in NUMBERED_MAP.items():
        if source_file in saved_images:
            for d in dirs:
                out_path = os.path.join(d, num_file)
                saved_images[source_file].save(out_path, "JPEG", quality=92)
            print(f"  [OK] Mapped {num_file} -> {source_file}")

    print("All candidate profile photos downloaded and processed successfully!")

if __name__ == "__main__":
    main()
