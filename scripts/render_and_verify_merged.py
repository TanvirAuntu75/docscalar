import os
import sys
import json
import fitz

def main():
    pdf_path = os.path.abspath('scratch/final_verified_merged.pdf')
    if not os.path.exists(pdf_path):
        print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    print(f"Opened {pdf_path}: {total_pages} total pages")

    os.makedirs('scratch', exist_ok=True)
    rendered_images = []

    # Render each page at 2x resolution (~144-150 DPI) for pristine high-fidelity verification
    mat = fitz.Matrix(2.0, 2.0)
    for i in range(total_pages):
        page = doc[i]
        pix = page.get_pixmap(matrix=mat, alpha=False)
        out_png = os.path.abspath(f'scratch/final_verified_p{i+1}.png')
        pix.save(out_png)
        size_bytes = os.path.getsize(out_png)
        rendered_images.append({
            'page': i + 1,
            'path': out_png,
            'width': pix.width,
            'height': pix.height,
            'size_bytes': size_bytes
        })
        print(f"Rendered Page {i+1} -> {out_png} ({pix.width}x{pix.height}, {size_bytes} bytes)")

    # Analyze Page 3 (Vision PDF)
    if total_pages < 3:
        print(f"ERROR: Expected at least 3 pages, found {total_pages}", file=sys.stderr)
        sys.exit(1)

    page3 = doc[2]
    p3_rect = page3.rect
    print(f"Page 3 rect: width={p3_rect.width:.2f} pt, height={p3_rect.height:.2f} pt")

    # Extract all text blocks
    text_blocks = page3.get_text('blocks')
    promotional_fee_block = None
    min_text_y0 = float('inf')

    for b in text_blocks:
        # b: (x0, y0, x1, y1, text, block_no, block_type)
        y0 = b[1]
        text = b[4].strip().replace('\n', ' ')
        if y0 < min_text_y0 and text:
            min_text_y0 = y0
        if 'PROMOTIONAL FEE INTERNATIONAL STUDENTS' in text.upper():
            promotional_fee_block = {
                'x0': round(b[0], 2),
                'y0': round(b[1], 2),
                'x1': round(b[2], 2),
                'y1': round(b[3], 2),
                'text': text
            }

    # Extract vector artwork & images on Page 3
    images = page3.get_images()
    drawings = page3.get_drawings()

    header_artwork = []
    for img_info in images:
        xref = img_info[0]
        rects = page3.get_image_rects(xref)
        for r in rects:
            if r.y0 < 100:
                header_artwork.append({
                    'type': 'image_logo',
                    'xref': xref,
                    'x0': round(r.x0, 2),
                    'y0': round(r.y0, 2),
                    'x1': round(r.x1, 2),
                    'y1': round(r.y1, 2),
                    'width': round(r.width, 2),
                    'height': round(r.height, 2)
                })

    for d in drawings:
        r = d.get('rect')
        if r and r.y0 < 100:
            header_artwork.append({
                'type': 'vector_drawing',
                'x0': round(r.x0, 2),
                'y0': round(r.y0, 2),
                'x1': round(r.x1, 2),
                'y1': round(r.y1, 2)
            })

    result = {
        'total_pages': total_pages,
        'page3_dimensions': {
            'width': round(p3_rect.width, 2),
            'height': round(p3_rect.height, 2)
        },
        'rendered_images': rendered_images,
        'promotional_fee_present': promotional_fee_block is not None,
        'promotional_fee_block': promotional_fee_block,
        'min_text_y0': round(min_text_y0, 2),
        'header_artwork_present': len(header_artwork) > 0,
        'header_artwork': header_artwork
    }

    out_json = os.path.abspath('scratch/verification_p3_analysis.json')
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)

    print("\n--- FORENSIC ANALYSIS SUMMARY ---")
    print(f"Promotional Fee Present: {result['promotional_fee_present']}")
    if promotional_fee_block:
        print(f"Promotional Fee y0: {promotional_fee_block['y0']} pt (Expected < 100 pt)")
    print(f"Min Text y0 on Page 3: {result['min_text_y0']} pt")
    print(f"Header Artwork / Logo Present at y0 < 100 pt: {result['header_artwork_present']}")
    print(f"Header Artwork items: {len(header_artwork)}")
    print(f"Saved report to: {out_json}")

if __name__ == '__main__':
    main()
