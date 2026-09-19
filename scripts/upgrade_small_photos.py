import os
import re
import glob

def upgrade_photos():
    files = glob.glob('src/engines/utility/templates/*.js')
    print(f"Scanning {len(files)} template files...")
    
    updated_count = 0
    
    for fpath in sorted(files):
        fname = os.path.basename(fpath)
        
        # Don't touch templates that already have large/bespoke photo frames (like donna_stroupe, howard_ong, lorna_alvarado, alfredo_torres, marcus_vance, isabel_mercado, arthur_pendelton, richard_sanchez, adeline_palmerston)
        protected = [
            'donna_stroupe.js', 'howard_ong.js', 'lorna_alvarado.js',
            'alfredo_torres.js', 'marcus_vance.js', 'isabel_mercado.js',
            'arthur_pendelton.js', 'richard_sanchez.js', 'adeline_palmerston.js',
            'jonathan_patterson.js', 'terracotta_arch.js', 'korina_villanueva.js',
            'isabel_schumacher.js', 'adam_fletcher.js', 'sebastian_bennett.js'
        ]
        if fname in protected:
            continue
            
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        
        # Upgrade overlapping_badge.js specifically
        if fname == 'overlapping_badge.js':
            content = content.replace('margin-top: -45px;', 'margin-top: -72px;')
            content = content.replace('width: 90px;\n      height: 90px;', 'width: 145px;\n      height: 145px;\n      border: 5px solid #ffffff;\n      box-shadow: 0 8px 24px rgba(0,0,0,0.18);')
            content = content.replace('width: 90px;\n    height: 90px;', 'width: 145px;\n    height: 145px;\n    border: 5px solid #ffffff;\n    box-shadow: 0 8px 24px rgba(0,0,0,0.18);')
        
        # Generic upgrade for .avatar / .photo / .profile-photo sizes between 60px and 120px
        # Replace width: XXpx; height: XXpx; with generous 140px or 135px
        def repl_avatar_rule(match):
            prop = match.group(1)
            val = int(match.group(2))
            if 60 <= val <= 115:
                target_val = 140 if val >= 90 else 130
                return f"{prop}: {target_val}px;"
            return match.group(0)

        # Match patterns like width: 90px; height: 90px; or min-width: 90px;
        content = re.sub(r'\b(width|height|min-width|max-width|min-height|max-height):\s*(\d+)px;', repl_avatar_rule, content)
        
        if content != original_content:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            updated_count += 1
            print(f"✓ Upgraded photo sizing in {fname}")
            
    print(f"\nSuccessfully upgraded photo dimensions in {updated_count} templates!")

if __name__ == '__main__':
    upgrade_photos()
