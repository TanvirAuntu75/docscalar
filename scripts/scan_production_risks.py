import os
import re
import glob

def deep_audit():
    print("=== DEEP PRODUCTION AUDIT: SCANNING CODEBASE ===")
    
    # 1. Check all JSON.parse without try-catch in frontend
    fe_files = glob.glob('src/**/*.{js,jsx,ts,tsx}', recursive=True)
    unhandled_json = []
    for f in fe_files:
        with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
            lines = fp.readlines()
        for idx, line in enumerate(lines):
            if 'JSON.parse(' in line and 'localStorage' in line:
                # Check if inside try block within 5 preceding lines
                preceding = "".join(lines[max(0, idx-5):idx+1])
                if 'try' not in preceding:
                    unhandled_json.append((f, idx+1, line.strip()))
                    
    print(f"\n[1] Unprotected localStorage JSON.parse calls ({len(unhandled_json)} found):")
    for uj in unhandled_json:
        print(f"  - {uj[0]}:{uj[1]} -> {uj[2]}")
        
    # 2. Check for missing alt attributes on images
    missing_alt = []
    for f in fe_files:
        with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
            txt = fp.read()
        img_tags = re.findall(r'<img\b[^>]*>', txt)
        for it in img_tags:
            if 'alt=' not in it:
                missing_alt.append((f, it))
    print(f"\n[2] <img> tags without alt attribute ({len(missing_alt)} found):")
    for ma in missing_alt[:10]:
        print(f"  - {ma[0]} -> {ma[1][:60]}...")
        
    # 3. Check for window.print / PDF export / html2canvas issues
    print("\n[3] Checking PDF / Image export pipeline in ResumeBuilder.jsx...")
    with open('src/pages/utility/ResumeBuilder.jsx', 'r', encoding='utf-8') as f:
        rb_txt = f.read()
        
    export_methods = []
    for line in rb_txt.split('\n'):
        if any(term in line.lower() for term in ['downloadpdf', 'downloadpng', 'window.print', 'html2canvas', 'jspdf']):
            export_methods.append(line.strip())
    print(f"Found {len(export_methods)} export references in ResumeBuilder.jsx.")
    
    # 4. Check backend for unhandled exceptions or missing temp file cleanup
    be_files = glob.glob('backend/**/*.py', recursive=True)
    unclosed_files = []
    for f in be_files:
        with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
            lines = fp.readlines()
        for idx, l in enumerate(lines):
            if 'open(' in l and 'with ' not in l and '=' in l and 'fitz.open' not in l:
                unclosed_files.append((f, idx+1, l.strip()))
    print(f"\n[4] Backend unmanaged open() calls ({len(unclosed_files)} found):")
    for uf in unclosed_files:
        print(f"  - {uf[0]}:{uf[1]} -> {uf[2]}")

if __name__ == '__main__':
    deep_audit()
