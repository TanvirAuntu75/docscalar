import os
import re
import glob

def check_clip_paths():
    files = glob.glob('src/engines/utility/templates/*.js')
    print(f"Auditing clip-path polygons across {len(files)} templates...")
    
    flagged = []
    for f in files:
        fname = os.path.basename(f)
        with open(f, 'r', encoding='utf-8') as fh:
            txt = fh.read()
            
        polygons = re.findall(r'clip-path:\s*polygon\([^)]+\)', txt)
        if polygons:
            flagged.append((fname, polygons))
            
    print(f"Templates using clip-path polygons: {len(flagged)}")
    for name, polys in flagged:
        print(f" - {name}: {polys}")

if __name__ == '__main__':
    check_clip_paths()
