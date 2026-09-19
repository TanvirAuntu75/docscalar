import os
import re
import glob

def compare():
    with open('src/pages/utility/ResumeBuilder.jsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    map_lines = lines[257:343] # 0-indexed: lines 258 to 343
    registered_keys = []
    for l in map_lines:
        match = re.search(r'^\s*([a-zA-Z0-9_]+)\s*:', l)
        if match:
            registered_keys.append(match.group(1))
            
    files = sorted(glob.glob('src/engines/utility/templates/*.js'))
    file_basenames = [os.path.splitext(os.path.basename(f))[0] for f in files]
    
    print(f"Total template files in src/engines/utility/templates/: {len(file_basenames)}")
    print(f"Total registered in TEMPLATE_MAP (ResumeBuilder.jsx): {len(registered_keys)}")
    
    unregistered = set(file_basenames) - set(registered_keys)
    print(f"\nThe {len(unregistered)} template files not in TEMPLATE_MAP are:")
    for u in sorted(unregistered):
        print(f"  - {u}.js")

if __name__ == '__main__':
    compare()
