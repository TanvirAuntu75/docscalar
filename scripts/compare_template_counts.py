import os
import re
import glob

def find_unregistered_templates():
    with open('src/pages/utility/ResumeBuilder.jsx', 'r', encoding='utf-8') as f:
        rb_content = f.read()
        
    template_map_match = re.search(r'const TEMPLATE_MAP = \{([^}]+)\};', rb_content, re.DOTALL)
    if not template_map_match:
        print("Could not find TEMPLATE_MAP")
        return
        
    registered_keys = set()
    for line in template_map_match.group(1).strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        key = line.split(':')[0].strip()
        if key:
            registered_keys.add(key)
            
    files = sorted(glob.glob('src/engines/utility/templates/*.js'))
    file_basenames = {os.path.splitext(os.path.basename(f))[0] for f in files}
    
    print(f"Total template files in src/engines/utility/templates/: {len(file_basenames)}")
    print(f"Total registered in ResumeBuilder.jsx TEMPLATE_MAP: {len(registered_keys)}")
    
    unregistered = file_basenames - registered_keys
    registered_not_in_files = registered_keys - file_basenames
    
    print(f"\nUnregistered files in directory ({len(unregistered)}):")
    for u in sorted(unregistered):
        print(f"  - {u}.js")
        
    print(f"\nRegistered keys missing files ({len(registered_not_in_files)}):")
    for r in sorted(registered_not_in_files):
        print(f"  - {r}")

if __name__ == '__main__':
    find_unregistered_templates()
