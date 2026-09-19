import os
import re
import glob

def check_references():
    targets = [
        'executive_serif',
        'harvard_classic',
        'jakes_monochrome',
        'modern_slate',
        'nordic_clean',
        'oxford_academic',
        'stanford_tech',
        'zurich_split'
    ]
    
    src_files = glob.glob('src/**/*', recursive=True)
    src_files = [f for f in src_files if os.path.isfile(f) and f.endswith(('.js', '.jsx', '.ts', '.tsx', '.json'))]
    
    print(f"Scanning {len(src_files)} source files for references to the 8 files...")
    
    found = {}
    for sf in src_files:
        # Don't check the file itself
        basename = os.path.splitext(os.path.basename(sf))[0]
        if basename in targets:
            continue
            
        with open(sf, 'r', encoding='utf-8', errors='ignore') as f:
            txt = f.read()
            
        for t in targets:
            if t in txt:
                found.setdefault(t, []).append(sf)
                
    if not found:
        print("Zero external references found! Safe to delete all 8 files.")
    else:
        print(f"References found: {found}")

if __name__ == '__main__':
    check_references()
