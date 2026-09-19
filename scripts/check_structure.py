import os
import re
import glob

def check_all_templates_structure():
    files = glob.glob('src/engines/utility/templates/*.js')
    print(f"Checking all {len(files)} template layouts...")
    
    issues = []
    for f in files:
        with open(f, 'r', encoding='utf-8') as fh:
            txt = fh.read()
            
        # Check for avatar negative margins
        if 'margin-top: -' in txt:
            matches = re.findall(r'margin-top:\s*-\s*(\d+)px', txt)
            # Find padding around banner
            paddings = re.findall(r'padding:[^;]+', txt)
            issues.append((os.path.basename(f), matches, paddings[:2]))
            
    print(f"Templates with negative top margins on avatar/elements: {len(issues)}")
    for name, matches, pads in issues:
        print(f"Template: {name}")
        print(f"  Negative margins: {matches}")
        print(f"  Paddings: {pads}\n")

if __name__ == '__main__':
    check_all_templates_structure()
