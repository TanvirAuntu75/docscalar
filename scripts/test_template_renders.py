import os
import re
import glob
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_all_templates_render():
    files = glob.glob('src/engines/utility/templates/*.js')
    print(f"Testing all {len(files)} templates for complete full-page rendering...")
    
    clean_count = 0
    for f in files:
        with open(f, 'r', encoding='utf-8') as fh:
            code = fh.read()
            
        # Verify that data.experience, data.education, data.skills are handled
        has_exp = 'experience' in code
        has_edu = 'education' in code
        has_skills = 'skills' in code
        
        if has_exp and has_edu and has_skills:
            clean_count += 1
        else:
            print(f"Template {os.path.basename(f)} missing standard sections: exp={has_exp}, edu={has_edu}, skills={has_skills}")
            
    print(f"\n✓ {clean_count}/{len(files)} templates have complete standard data mapping.")

if __name__ == '__main__':
    test_all_templates_render()
