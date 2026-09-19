import os
import re
import glob

def check_themecolor_usage():
    files = glob.glob('src/engines/utility/templates/*.js')
    print(f"Auditing themeColor handling across {len(files)} templates...\n")
    
    ignores_theme = []
    uses_theme = []
    
    for f in files:
        fname = os.path.basename(f)
        with open(f, 'r', encoding='utf-8') as fh:
            txt = fh.read()
            
        # Check if themeColor is in the parameter list
        func_match = re.search(r'function\s+generate\w+\s*\([^)]*themeColor[^)]*\)', txt)
        if not func_match:
            # Maybe arrow func or export default
            func_match = re.search(r'export\s+(?:default\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*themeColor[^)]*\)', txt)
            
        # Check if themeColor is used in color logic, e.g., const accent = themeColor || ...
        color_logic = re.findall(r'(?:const|let|var)\s+\w*(?:accent|primary|theme|color|navy|brand|header)\w*\s*=\s*[^;]*themeColor[^;]*;', txt, re.IGNORECASE)
        
        # Check if hardcoded colors are used without fallback to themeColor
        if not color_logic and 'themeColor' not in txt:
            ignores_theme.append((fname, 'themeColor parameter completely missing'))
        elif not color_logic:
            # Check if themeColor is passed but never assigned to accent
            has_theme_var = bool(re.search(r'themeColor\s*(?:\?|\|\||&&)', txt))
            if not has_theme_var:
                ignores_theme.append((fname, 'themeColor in params but not used in styles'))
            else:
                uses_theme.append((fname, 'uses themeColor with conditional'))
        else:
            uses_theme.append((fname, f'uses themeColor: {color_logic[0]}'))
            
    print(f"Templates using themeColor: {len(uses_theme)}")
    print(f"Templates IGNORING themeColor: {len(ignores_theme)}")
    for name, reason in ignores_theme:
        print(f"  [X] {name}: {reason}")

if __name__ == '__main__':
    check_themecolor_usage()
