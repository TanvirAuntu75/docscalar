import os
import re
import glob

def analyze_template_data_density():
    files = glob.glob('src/engines/utility/templates/*.js')
    print(f"Auditing content density across all {len(files)} template engines...")
    
    sparse_templates = []
    
    for fpath in sorted(files):
        fname = os.path.basename(fpath)
        with open(fpath, 'r', encoding='utf-8') as f:
            code = f.read()
            
        # Check default data richness or fallback data in the engine
        exp_matches = len(re.findall(r'(?:Marketing Manager|Sales Representative|Senior Developer|Lead|Consultant|Director)', code))
        edu_matches = len(re.findall(r'(?:Bachelor|Master|University|College|Degree)', code))
        
        # Check if template has default fallback data structure
        has_default_exp = 'defaultExperience' in code or 'data.experience' in code
        
        print(f"Engine {fname}: exp_matches={exp_matches}, edu_matches={edu_matches}")
        if exp_matches < 2 or edu_matches < 2:
            sparse_templates.append((fname, exp_matches, edu_matches))
            
    print(f"\nSparse / Low-Density Templates: {len(sparse_templates)}")
    for s in sparse_templates:
        print(f"  - {s[0]} (exp: {s[1]}, edu: {s[2]})")

if __name__ == '__main__':
    analyze_template_data_density()
