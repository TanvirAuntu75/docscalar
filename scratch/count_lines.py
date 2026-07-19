import os
import re

# Folders to exclude
EXCLUDE_DIRS = {
    'node_modules', '.venv', 'dist', '.git', '.Jules', 'tesseract', 
    'docforge-studio', 'stitch_docforge_web_wireframes', 
    'stitch_docforge_web_wireframes (1)', 'zip', '.agents', '.github',
    'ui-ux-pro-max-skill' # This is a skill directory, not part of core app code, but we can report it if needed.
}

# File extensions to include
EXTENSIONS = {
    '.py': 'Python',
    '.js': 'JavaScript',
    '.jsx': 'React JSX',
    '.cjs': 'CommonJS',
    '.css': 'CSS',
    '.html': 'HTML'
}

def clean_python_comments_and_blanks(content):
    # Regex to remove multiline docstrings
    # Handles both triple double quotes and triple single quotes
    content_no_docstrings = re.sub(r'(""".*?"""|\'\'\'.*?\'\'\')', '', content, flags=re.DOTALL)
    
    total_lines = len(content.splitlines())
    working_lines = 0
    comment_lines = 0
    blank_lines = 0
    
    # We will iterate line by line to classify
    lines = content.splitlines()
    docstring_active = False
    docstring_char = None
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            blank_lines += 1
            continue
            
        # Check if line is inside docstring
        # Note: A simple heuristic is enough for statistical counting
        if docstring_active:
            comment_lines += 1
            if docstring_char in stripped:
                # docstring ends on this line
                # check if there is code before or after, but let's count as comment line
                docstring_active = False
            continue
        
        if stripped.startswith('"""') or stripped.startswith("'''"):
            comment_lines += 1
            # Check if it's a single line docstring
            if len(stripped) >= 6 and (stripped.endswith('"""') or stripped.endswith("'''")):
                pass
            else:
                docstring_active = True
                docstring_char = '"""' if stripped.startswith('"""') else "'''"
            continue
            
        if stripped.startswith('#'):
            comment_lines += 1
            continue
            
        # Check inline comments (simple check)
        working_lines += 1
        
    return total_lines, working_lines, comment_lines, blank_lines

def clean_js_comments_and_blanks(content):
    total_lines = len(content.splitlines())
    working_lines = 0
    comment_lines = 0
    blank_lines = 0
    
    lines = content.splitlines()
    in_multiline = False
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            blank_lines += 1
            continue
            
        if in_multiline:
            comment_lines += 1
            if '*/' in stripped:
                in_multiline = False
            continue
            
        if stripped.startswith('/*'):
            comment_lines += 1
            if '*/' not in stripped:
                in_multiline = True
            continue
            
        if stripped.startswith('//'):
            comment_lines += 1
            continue
            
        working_lines += 1
        
    return total_lines, working_lines, comment_lines, blank_lines

def clean_css_comments_and_blanks(content):
    # CSS only uses /* */
    return clean_js_comments_and_blanks(content)

def clean_html_comments_and_blanks(content):
    total_lines = len(content.splitlines())
    working_lines = 0
    comment_lines = 0
    blank_lines = 0
    
    lines = content.splitlines()
    in_comment = False
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            blank_lines += 1
            continue
            
        if in_comment:
            comment_lines += 1
            if '-->' in stripped:
                in_comment = False
            continue
            
        if stripped.startswith('<!--'):
            comment_lines += 1
            if '-->' not in stripped:
                in_comment = True
            continue
            
        working_lines += 1
        
    return total_lines, working_lines, comment_lines, blank_lines

def analyze_file(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    if ext not in EXTENSIONS:
        return None
        
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return None
        
    lang = EXTENSIONS[ext]
    if ext == '.py':
        total, working, comment, blank = clean_python_comments_and_blanks(content)
    elif ext in ('.js', '.jsx', '.cjs'):
        total, working, comment, blank = clean_js_comments_and_blanks(content)
    elif ext == '.css':
        total, working, comment, blank = clean_css_comments_and_blanks(content)
    elif ext == '.html':
        total, working, comment, blank = clean_html_comments_and_blanks(content)
    else:
        # Fallback
        lines = content.splitlines()
        total = len(lines)
        blank = sum(1 for l in lines if not l.strip())
        comment = 0
        working = total - blank
        
    return {
        'path': filepath,
        'lang': lang,
        'total': total,
        'working': working,
        'comment': comment,
        'blank': blank
    }

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    results = []
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Filter directories in-place to exclude
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            # Relative path for display
            relpath = os.path.relpath(filepath, root_dir)
            
            res = analyze_file(filepath)
            if res:
                res['relpath'] = relpath
                results.append(res)
                
    # Sort results by working lines desc
    results.sort(key=lambda x: x['working'], reverse=True)
    
    # Print summary by language
    lang_totals = {}
    dir_totals = {}
    
    grand_total = 0
    grand_working = 0
    grand_comment = 0
    grand_blank = 0
    
    for r in results:
        lang = r['lang']
        lang_totals[lang] = lang_totals.get(lang, {'total': 0, 'working': 0, 'comment': 0, 'blank': 0})
        lang_totals[lang]['total'] += r['total']
        lang_totals[lang]['working'] += r['working']
        lang_totals[lang]['comment'] += r['comment']
        lang_totals[lang]['blank'] += r['blank']
        
        # Determine category (src, backend, root, etc.)
        parts = r['relpath'].split(os.sep)
        category = parts[0] if len(parts) > 1 else 'root'
        dir_totals[category] = dir_totals.get(category, {'total': 0, 'working': 0, 'comment': 0, 'blank': 0})
        dir_totals[category]['total'] += r['total']
        dir_totals[category]['working'] += r['working']
        dir_totals[category]['comment'] += r['comment']
        dir_totals[category]['blank'] += r['blank']
        
        grand_total += r['total']
        grand_working += r['working']
        grand_comment += r['comment']
        grand_blank += r['blank']
        
    print("## LINE COUNT SUMMARY")
    print(f"Total Files Analyzed: {len(results)}\n")
    print("| Category / Directory | Total Lines | Working (Code) Lines | Comments | Blank Lines |")
    print("| :--- | :---: | :---: | :---: | :---: |")
    for cat, metrics in sorted(dir_totals.items()):
        print(f"| {cat} | {metrics['total']:,} | {metrics['working']:,} | {metrics['comment']:,} | {metrics['blank']:,} |")
    print(f"| **GRAND TOTAL** | **{grand_total:,}** | **{grand_working:,}** | **{grand_comment:,}** | **{grand_blank:,}** |")
    print("\n")
    
    print("| Language | Total Lines | Working (Code) Lines | Comments | Blank Lines |")
    print("| :--- | :---: | :---: | :---: | :---: |")
    for lang, metrics in sorted(lang_totals.items()):
        print(f"| {lang} | {metrics['total']:,} | {metrics['working']:,} | {metrics['comment']:,} | {metrics['blank']:,} |")
    print("\n")
    
    print("### Top 20 Files by Working Lines")
    print("| File | Language | Total Lines | Working Lines | Comments | Blank |")
    print("| :--- | :--- | :---: | :---: | :---: | :---: |")
    for r in results[:20]:
        print(f"| `{r['relpath']}` | {r['lang']} | {r['total']:,} | {r['working']:,} | {r['comment']:,} | {r['blank']:,} |")

if __name__ == '__main__':
    main()
