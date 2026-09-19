import os

def delete_unregistered_templates():
    targets = [
        'executive_serif.js',
        'harvard_classic.js',
        'jakes_monochrome.js',
        'modern_slate.js',
        'nordic_clean.js',
        'oxford_academic.js',
        'stanford_tech.js',
        'zurich_split.js'
    ]
    
    dir_path = 'src/engines/utility/templates'
    deleted = 0
    for t in targets:
        fp = os.path.join(dir_path, t)
        if os.path.exists(fp):
            os.remove(fp)
            print(f"[DELETED] {fp}")
            deleted += 1
        else:
            print(f"[NOT FOUND] {fp}")
            
    print(f"\nSuccessfully purged {deleted} unused template files.")
    
    remaining = [f for f in os.listdir(dir_path) if f.endswith('.js')]
    print(f"Total template files remaining in {dir_path}: {len(remaining)}")

if __name__ == '__main__':
    delete_unregistered_templates()
