import os
import re
import glob

template_files = glob.glob('src/engines/utility/templates/*.js')
print(f"Total template files: {len(template_files)}")

small_photo_templates = []

for tf in template_files:
    with open(tf, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Search for photo width/height/size definitions
    # Common patterns: width: 60px..120px, height: 60px..120px, w-16, w-20, etc.
    matches = re.findall(r'(?:photo|avatar|headshot|img)[^{}]*\{[^{}]*(?:width|height|size|w-|h-):\s*(\d+)px', content, re.IGNORECASE)
    
    # Also search directly in style blocks for avatar/photo classes
    photo_classes = re.findall(r'(\.(?:photo|avatar|profile|headshot|picture)[^{]*\{[^}]*\})', content, re.IGNORECASE)
    
    sizes = []
    for pc in photo_classes:
        found_px = re.findall(r'(?:width|height|min-width|max-width):\s*(\d+)px', pc)
        sizes.extend([int(x) for x in found_px])
    
    basename = os.path.basename(tf)
    if sizes:
        min_s = min(sizes)
        max_s = max(sizes)
        if max_s <= 125:
            small_photo_templates.append((basename, min_s, max_s, photo_classes[:2]))

print(f"\nTemplates with smaller photo dimensions (<= 125px): {len(small_photo_templates)}")
for b, mis, mas, pc in small_photo_templates:
    print(f" - {b}: min={mis}px, max={mas}px")
