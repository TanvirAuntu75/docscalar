import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/utility/ResumeBuilder.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = re.findall(
    r"(\w+)\s*:\s*\{\s*label:\s*'([^']+)',\s*fn:\s*(\w+),\s*badge:\s*'([^']+)',\s*photoUrl:\s*'([^']+)',\s*candidateName:\s*'([^']+)'",
    code
)

print(f"Total templates in TEMPLATE_MAP: {len(pattern)}")
names = {}
photos = {}
for key, label, fn, badge, photo, name in pattern:
    names.setdefault(name, []).append(key)
    photos.setdefault(photo, []).append(key)

print("\n--- DUPLICATE NAMES ---")
dup_names = {n: keys for n, keys in names.items() if len(keys) > 1}
if dup_names:
    for n, keys in dup_names.items():
        print(f"Duplicate Name '{n}': {keys}")
else:
    print("ALL CANDIDATE NAMES ARE 100% UNIQUE!")

print("\n--- DUPLICATE PHOTOS ---")
dup_photos = {p: keys for p, keys in photos.items() if len(keys) > 1}
if dup_photos:
    for p, keys in dup_photos.items():
        print(f"Duplicate Photo '{p}': {keys}")
else:
    print("ALL CANDIDATE PHOTOS ARE 100% UNIQUE!")
