import os
import re

templates_dir = "src/engines/utility/templates"

for fname in os.listdir(templates_dir):
    if not fname.endswith(".js"):
        continue
    key = fname[:-3]
    fpath = os.path.join(templates_dir, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # Look for fallback photoSrc like data.photoUrl || '/images/candidates/...jpg' or similar
    new_content = re.sub(
        r"data\.photoUrl\s*\|\|\s*'[^']+'",
        f"data.photoUrl || '/images/candidates/{key}.jpg'",
        content
    )
    
    if new_content != content:
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated fallback in {fname} to /images/candidates/{key}.jpg")
