import re
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/utility/ResumeBuilder.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('const TEMPLATE_MAP = {')
end = text.find('};', start)
block = text[start:end]

lines = [l.strip() for l in block.split('\n') if ':' in l and 'fn:' in l]
templates = []
for l in lines:
    key = l.split(':')[0].strip()
    lbl_m = re.search(r'label:\s*[\'"]([^\'"]+)[\'"]', l)
    photo_m = re.search(r'photoUrl:\s*[\'"]([^\'"]+)[\'"]', l)
    cand_m = re.search(r'candidateName:\s*[\'"]([^\'"]+)[\'"]', l)
    photo = photo_m.group(1) if photo_m else ''
    cand = cand_m.group(1) if cand_m else ''
    label = lbl_m.group(1) if lbl_m else ''
    
    templates.append({
        'key': key,
        'label': label,
        'photo': photo,
        'candidate': cand
    })

print(f"Total templates: {len(templates)}\n")
for idx, t in enumerate(templates):
    print(f"{idx+1:2d}. key={t['key']:24s} | Name: {t['candidate']:25s} | Photo: {t['photo']}")
