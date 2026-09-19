import os
import re
import glob

def fix_corrupted_templates():
    files = glob.glob('src/engines/utility/templates/*.js')
    fixed = 0
    
    for fpath in files:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original = content
        
        # Look for corrupted JS interpolation like ${accent\n box-shadow: ...}; or similar
        # e.g., ${accent\s+box-shadow:[^}]+}; -> ${accent};\n box-shadow: ...;
        def fix_interp(m):
            interp_var = m.group(1)
            injected_css = m.group(2)
            return f"${{{interp_var}}};\n      {injected_css}"
            
        content = re.sub(r'\$\{([a-zA-Z0-9_]+)\s*\n\s*([^}]+)\};', fix_interp, content)
        
        # Also check if any duplicate box-shadows or semicolons were added
        content = content.replace(';};', '};')
        
        if content != original:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            fixed += 1
            print(f"Fixed {os.path.basename(fpath)}")
            
    print(f"Total fixed: {fixed}")

if __name__ == '__main__':
    fix_corrupted_templates()
