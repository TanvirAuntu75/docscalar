import os
import glob
import re
import json

template_dir = r'src/engines/utility/templates'
files = sorted(glob.glob(os.path.join(template_dir, '*.js')))

results = []

for f in files:
    fname = os.path.basename(f)
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    
    # Check dimensions
    cv_page_match = re.search(r'\.(?:cv-page|resume-canvas|resume-sheet|page-container|page-wrapper|page)[^{]*\{([^}]+)\}', content)
    cv_page_css = cv_page_match.group(1).strip() if cv_page_match else "NOT_FOUND"
    
    # Check width / height declarations
    widths = re.findall(r'width:\s*([^;]+);', content)
    heights = re.findall(r'height:\s*([^;]+);', content)
    
    # Check photo markup
    photo_blocks = re.findall(r'(?:avatar|photo)[^;{}]*\{[^}]+\}', content, re.IGNORECASE)
    photo_html = re.findall(r'(\<[^\>]*photo[^\>]*\>|\<[^\>]*avatar[^\>]*\>)', content, re.IGNORECASE)
    has_img_in_wrapper = bool(re.search(r'<(?:div|span)[^>]*class="[^"]*(?:avatar|photo)[^"]*"[^>]*>\s*<img', content, re.IGNORECASE))
    
    # Check vector geometry (SVG, clip-path, absolute headers, polygons)
    has_svg = '<svg' in content
    clip_paths = re.findall(r'clip-path:\s*([^;]+);', content)
    polygons = re.findall(r'polygon\([^)]+\)', content)
    
    # Check data-df-field tags
    df_fields = re.findall(r'data-df-field=[\'"]([^\'"]+)[\'"]', content)
    fields_by_prefix = {}
    for df in df_fields:
        prefix = df.split(':')[0]
        fields_by_prefix[prefix] = fields_by_prefix.get(prefix, 0) + 1
    
    results.append({
        'name': fname,
        'cv_page_css': cv_page_css[:120],
        'has_img_in_wrapper': has_img_in_wrapper,
        'has_svg': has_svg,
        'clip_paths': clip_paths,
        'polygons': polygons,
        'fields_by_prefix': fields_by_prefix,
        'total_fields': len(df_fields),
        'unique_fields': len(set(df_fields))
    })

print(f"Inspected {len(results)} templates.")
templates_with_clip_path = [r['name'] for r in results if r['clip_paths']]
templates_with_svg = [r['name'] for r in results if r['has_svg']]
templates_with_img_in_wrapper = [r['name'] for r in results if r['has_img_in_wrapper']]

print(f"Templates with clip-path: {len(templates_with_clip_path)} -> {templates_with_clip_path[:10]}")
print(f"Templates with inline SVG: {len(templates_with_svg)} -> {templates_with_svg[:10]}")
print(f"Templates with img inside photo wrapper: {len(templates_with_img_in_wrapper)} / {len(results)}")

with open('.agents/explorer_0_3/geometry_and_avatar.json', 'w', encoding='utf-8') as out:
    json.dump(results, out, indent=2)
print("Saved geometry_and_avatar.json")
