import os
import re
import glob

def check_overlapping_headers():
    files = glob.glob('src/engines/utility/templates/*.js')
    print(f"Auditing {len(files)} templates for avatar-text collision risks...")
    
    flagged = []
    
    for fpath in files:
        fname = os.path.basename(fpath)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Check for negative margin on avatar wrappers
        neg_margins = re.findall(r'margin-top:\s*-\s*(\d+)px', content)
        if neg_margins:
            flagged.append((fname, neg_margins))
            
    print(f"\nTemplates with negative top margins on elements: {len(flagged)}")
    for f, nm in flagged:
        print(f" - {f}: negative margins = {nm}")

if __name__ == '__main__':
    check_overlapping_headers()
