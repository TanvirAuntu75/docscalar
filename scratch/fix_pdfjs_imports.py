import os

def fix_imports():
    src_dir = r"c:\Users\Tanvir Alam\Downloads\New folder upscaled\src"
    
    target_imports = [
        ("import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';",
         "const pdfjsWorkerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();"),
        ("import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';",
         "const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();")
    ]
    
    modified_files = []
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.js', '.jsx')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                for target, replacement in target_imports:
                    content = content.replace(target, replacement)
                
                if content != original_content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    modified_files.append(path)
                    print(f"Fixed: {path}")
                    
    print(f"Total files updated: {len(modified_files)}")

if __name__ == "__main__":
    fix_imports()
