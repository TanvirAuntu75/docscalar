import os
import re
import glob
import sys

sys.stdout.reconfigure(encoding='utf-8')

def targeted_upgrade_photos():
    files = glob.glob('src/engines/utility/templates/*.js')
    print(f"Scanning {len(files)} template files...")
    
    updated_count = 0
    
    protected = [
        'donna_stroupe.js', 'howard_ong.js', 'lorna_alvarado.js',
        'alfredo_torres.js', 'marcus_vance.js', 'isabel_mercado.js',
        'arthur_pendelton.js', 'richard_sanchez.js', 'adeline_palmerston.js',
        'jonathan_patterson.js', 'terracotta_arch.js', 'korina_villanueva.js',
        'isabel_schumacher.js', 'adam_fletcher.js', 'sebastian_bennett.js'
    ]
    
    for fpath in sorted(files):
        fname = os.path.basename(fpath)
        if fname in protected:
            continue
            
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        
        # Look specifically for CSS blocks targeting avatar/photo classes
        def upgrade_block(block_match):
            selector = block_match.group(1)
            body = block_match.group(2)
            
            # Check if this selector is related to avatar/photo/profile image/headshot
            if not re.search(r'(?:avatar|photo|profile|headshot|portrait|picture)', selector, re.IGNORECASE):
                return block_match.group(0)
            
            # If it's a wrapper, frame, or img, adjust width/height if it's small (<= 120px)
            def repl_dim(m):
                prop = m.group(1)
                val = int(m.group(2))
                if 50 <= val <= 118:
                    new_val = 145 if val >= 90 else 135
                    return f"{prop}: {new_val}px;"
                return m.group(0)
            
            new_body = re.sub(r'\b(width|height|min-width|max-width|min-height|max-height):\s*(\d+)px;', repl_dim, body)
            
            # Ensure nice rounded border or halo if circular
            if 'border-radius: 50%' in new_body or 'border-radius: 50%;' in new_body:
                if 'box-shadow' not in new_body:
                    new_body += '\n      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);'
            
            return f"{selector}{{{new_body}}}"
        
        # Regex to match CSS rule blocks: .selector { ... }
        content = re.sub(r'(\.[a-zA-Z0-9_-]*(?:avatar|photo|profile|headshot|portrait)[a-zA-Z0-9_-]*\s*)\{([^}]+)\}', upgrade_block, content, flags=re.IGNORECASE)
        
        # Also upgrade overlapping_badge.js offset
        if fname == 'overlapping_badge.js':
            content = content.replace('margin-top: -45px;', 'margin-top: -72px;')
            content = content.replace('margin-top: -40px;', 'margin-top: -72px;')
            content = content.replace('border: 4px solid #ffffff;', 'border: 5px solid #ffffff;\n      box-shadow: 0 8px 24px rgba(0,0,0,0.18);')
            
        if content != original_content:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            updated_count += 1
            print(f"✓ Upgraded photo styling in {fname}")
            
    print(f"\nSuccessfully upgraded photo dimensions and framing in {updated_count} templates!")

if __name__ == '__main__':
    targeted_upgrade_photos()
