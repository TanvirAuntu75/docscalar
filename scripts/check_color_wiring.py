import os
import re
import glob

def check_all_templates_color_wiring():
    files = sorted(glob.glob('src/engines/utility/templates/*.js'))
    print(f"Checking color wiring in all {len(files)} templates...\n")
    
    needs_update = []
    for f in files:
        fname = os.path.basename(f)
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()
            
        has_theme_param = 'themeColor' in content
        has_accent_definition = bool(re.search(r'(?:const|let|var)\s+\w*(?:accent|color|theme|navy|blue|slate|gold|brand)\w*\s*=\s*[^;]*themeColor', content, re.IGNORECASE))
        
        # Check if return `...` has ${accent} or ${...Color}
        ret_idx = content.find('return `')
        interpolated = False
        if ret_idx != -1:
            body = content[ret_idx:]
            # Look for ${accent} or ${*color} or ${themeColor}
            interpolations = re.findall(r'\$\{([^}]+)\}', body)
            for var in interpolations:
                if any(k in var.lower() for k in ['accent', 'themecolor', 'bluecolor', 'slatecolor', 'goldcolor', 'primarycolor', 'brandcolor']):
                    interpolated = True
                    break
                    
        if not has_theme_param or not has_accent_definition or not interpolated:
            needs_update.append((fname, has_theme_param, has_accent_definition, interpolated))
            
    print(f"Templates needing color wiring updates: {len(needs_update)}")
    for name, p, d, i in needs_update:
        print(f" - {name}: param={p}, defined={d}, interpolated={i}")

if __name__ == '__main__':
    check_all_templates_color_wiring()
