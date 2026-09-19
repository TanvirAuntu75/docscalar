import os
import glob
import re
import json

template_dir = r'src/engines/utility/templates'
files = glob.glob(os.path.join(template_dir, '*.js'))
print(f"Total template files found: {len(files)}")

report_data = []

for f in sorted(files):
    fname = os.path.basename(f)
    with open(f, 'r', encoding='utf-8') as fp:
        content = fp.read()
    
    # 1. Fallback strings
    fallbacks_name = re.findall(r'data\.name\s*\|\|\s*[\'"]([^\'"]+)[\'"]', content)
    fallbacks_title = re.findall(r'data\.title\s*\|\|\s*[\'"]([^\'"]+)[\'"]', content)
    fallbacks_summary = re.findall(r'(?:data\.summary|data\.profile)\s*\|\|\s*[\'"]([^\'"]+)[\'"]', content)
    fallbacks_other = re.findall(r'\|\|\s*[\'"]([A-Z][a-zA-Z\s]{3,})[\'"]', content)
    
    # 2. Pagination engine
    has_pagination = 'computeTwoPagePartition' in content
    
    # 3. A4 dimensions
    has_794 = '794' in content
    has_1123 = '1123' in content
    has_a4_strict = '794px' in content and '1123px' in content
    
    # 4. @media print
    has_media_print = '@media print' in content
    has_color_adjust = '-webkit-print-color-adjust' in content or 'print-color-adjust' in content
    has_page_break = 'page-break-after' in content or 'break-after' in content
    
    # 5. Photo masking container
    has_photo_url = 'photoUrl' in content or 'photoSrc' in content
    has_overflow_hidden = 'overflow: hidden' in content or 'overflow:\s*hidden' in content or 'overflow:hidden' in content
    has_border_radius = 'border-radius' in content
    
    # 6. data-df-field attributes
    df_fields = re.findall(r'data-df-field=[\'"]([^\'"]+)[\'"]', content)
    unique_df_fields = sorted(list(set(df_fields)))
    
    # 7. Check for nested/broken data-df-field (e.g. duplicate data-df-field="email" data-df-field="email")
    duplicate_stamps = len(re.findall(r'data-df-field=[\'"][^\'"]+[\'"]\s+[^>]*data-df-field=', content))
    
    report_data.append({
        'filename': fname,
        'has_pagination': has_pagination,
        'has_a4_strict': has_a4_strict,
        'has_794': has_794,
        'has_1123': has_1123,
        'has_media_print': has_media_print,
        'has_color_adjust': has_color_adjust,
        'has_page_break': has_page_break,
        'has_photo_url': has_photo_url,
        'has_overflow_hidden': has_overflow_hidden,
        'fallbacks_name': fallbacks_name,
        'fallbacks_title': fallbacks_title,
        'fallbacks_summary': fallbacks_summary,
        'fallbacks_other': fallbacks_other,
        'df_field_count': len(df_fields),
        'unique_df_field_count': len(unique_df_fields),
        'duplicate_stamps': duplicate_stamps,
        'sample_df_fields': unique_df_fields[:10]
    })

total = len(report_data)
paginated_count = sum(1 for r in report_data if r['has_pagination'])
a4_strict_count = sum(1 for r in report_data if r['has_a4_strict'])
media_print_count = sum(1 for r in report_data if r['has_media_print'])
color_adjust_count = sum(1 for r in report_data if r['has_color_adjust'])
name_fallbacks_count = sum(1 for r in report_data if r['fallbacks_name'])
dup_stamps_count = sum(1 for r in report_data if r['duplicate_stamps'] > 0)

print(f"\n--- AUDIT SUMMARY ({total} Templates) ---")
print(f"1. Using computeTwoPagePartition: {paginated_count} / {total}")
print(f"2. Strict 794px x 1123px: {a4_strict_count} / {total}")
print(f"3. Has @media print: {media_print_count} / {total}")
print(f"4. Has print-color-adjust: {color_adjust_count} / {total}")
print(f"5. Has fallback name strings: {name_fallbacks_count} / {total}")
print(f"6. Has duplicate data-df-field tag stamps: {dup_stamps_count} / {total}")

non_paginated = [r['filename'] for r in report_data if not r['has_pagination']]
print(f"\nNon-paginated templates ({len(non_paginated)}): {non_paginated}")

missing_print = [r['filename'] for r in report_data if not r['has_media_print']]
print(f"\nMissing @media print ({len(missing_print)}): {missing_print}")

with open('.agents/explorer_0_3/audit_results.json', 'w', encoding='utf-8') as out:
    json.dump(report_data, out, indent=2)
print("\nWrote full audit results to .agents/explorer_0_3/audit_results.json")
