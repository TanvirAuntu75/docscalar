import re
import sys

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
    templates.append((key, label, cand, photo))

# Add jonathan_patterson
templates.append(('jonathan_patterson', '👑 Jonathan Patterson', 'Jonathan Patterson', '/images/candidates/jonathan_patterson.jpg'))

print(f"Total templates including Jonathan Patterson: {len(templates)}")
for i, (k, lbl, cand, p) in enumerate(templates):
    print(f"{i+1:2d}. {k:24s} | {cand:25s} | {lbl}")
