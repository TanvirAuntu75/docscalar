import os
import re
import glob

def deep_audit_templates():
    files = sorted(glob.glob('src/engines/utility/templates/*.js'))
    print(f"Deep inspection of {len(files)} templates...\n")
    
    issues = []
    for f in files:
        fname = os.path.basename(f)
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()
            
        # Check signature
        sig_match = re.search(r'export\s+function\s+(\w+)\s*\(([^)]*)\)', content)
        if not sig_match:
            sig_match = re.search(r'function\s+(\w+)\s*\(([^)]*)\)', content)
            
        if not sig_match:
            issues.append((fname, "No export function signature found"))
            continue
            
        fn_name, params = sig_match.groups()
        param_list = [p.strip().split('=')[0].strip() for p in params.split(',')]
        
        if 'themeColor' not in param_list:
            issues.append((fname, f"Function {fn_name} missing themeColor in arguments: {params}"))
            continue
            
        # Check if themeColor is actually used in styles
        # Look for occurrences of themeColor in the template literal
        # Find where return `...` begins
        ret_idx = content.find('return `')
        if ret_idx != -1:
            body = content[ret_idx:]
            # Count interpolations of accent/themeColor or variables derived from themeColor
            # Find variable derived from themeColor
            derived_vars = re.findall(r'(?:const|let|var)\s+(\w+)\s*=\s*[^;]*themeColor[^;]*;', content[:ret_idx])
            
            used_in_body = False
            for v in derived_vars + ['themeColor']:
                if f'${{{v}' in body or f'${v}' in body:
                    used_in_body = True
                    break
                    
            if not used_in_body:
                issues.append((fname, f"themeColor or derived vars ({derived_vars}) NOT interpolated in HTML/CSS body"))
                
    print(f"Total issues found: {len(issues)}")
    for name, desc in issues:
        print(f" - {name}: {desc}")

if __name__ == '__main__':
    deep_audit_templates()
