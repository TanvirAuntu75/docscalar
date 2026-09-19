import os
import re
import glob
import sys

sys.stdout.reconfigure(encoding='utf-8')

def find_bullet_mapping_issues():
    files = glob.glob('src/engines/utility/templates/*.js')
    print(f"Auditing {len(files)} templates for data mapping mismatches...")
    
    issues = []
    for f in files:
        fname = os.path.basename(f)
        with open(f, 'r', encoding='utf-8') as fh:
            code = fh.read()
            
        # Check if highlights is checked when mapping experience
        has_highlights = 'highlights' in code
        has_bullets = 'bullets' in code
        
        # Check if experience mapping misses highlights
        if has_bullets and not has_highlights:
            issues.append((fname, 'Uses bullets but NOT highlights'))
            
        # Check if exp mapping has fallback to single item
        if 'exp.bullets' in code and 'exp.highlights' not in code:
            issues.append((fname, 'Checks exp.bullets only'))
            
    print(f"Templates with bullet/highlight mapping mismatches: {len(issues)}")
    for name, reason in issues:
        print(f" - {name}: {reason}")

if __name__ == '__main__':
    find_bullet_mapping_issues()
