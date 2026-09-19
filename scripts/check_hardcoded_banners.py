import os
import re
import glob

def check_hardcoded_banners():
    files = sorted(glob.glob('src/engines/utility/templates/*.js'))
    print(f"Auditing hardcoded banner backgrounds across {len(files)} templates...\n")
    
    for f in files:
        fname = os.path.basename(f)
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()
            
        # Search for linear-gradient or background colors in banner/header classes
        banner_blocks = re.findall(r'(\.[-\w]*(?:banner|header|sidebar|top|badge|accent)[-\w]*\s*\{[^}]+\})', content, re.IGNORECASE)
        hardcoded_gradients = []
        for block in banner_blocks:
            if 'linear-gradient' in block and '${' not in block and ('#0' in block or '#1' in block or '#2' in block or '#3' in block or '#4' in block or '#5' in block or '#6' in block or '#7' in block or '#8' in block or '#9' in block or '#a' in block or '#b' in block or '#c' in block or '#d' in block or '#e' in block or '#f' in block):
                hardcoded_gradients.append(block.split('{')[0].strip())
        if hardcoded_gradients:
            print(f" - {fname}: hardcoded gradients in {hardcoded_gradients}")

if __name__ == '__main__':
    check_hardcoded_banners()
