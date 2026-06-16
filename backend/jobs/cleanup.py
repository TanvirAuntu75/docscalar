import time
from pathlib import Path
from backend import config

def cleanup_expired_files():
    """
    Remove uploads and output files older than FILE_EXPIRY_MINS.
    """
    now = time.time()
    expiry_threshold = config.FILE_EXPIRY_MINS * 60

    cleaned_count = 0
    size_freed = 0

    # Scan Uploads & Output directories
    for directory in [config.UPLOAD_DIR, config.OUTPUT_DIR]:
        for file_path in directory.glob("*"):
            # Skip hidden/system files
            if file_path.name.startswith("."):
                continue
            
            try:
                # Check modification time
                file_age = now - file_path.stat().st_mtime
                if file_age > expiry_threshold:
                    size_freed += file_path.stat().st_size
                    if file_path.is_file():
                        file_path.unlink()
                    elif file_path.is_dir():
                        # Recurse clean directories (e.g. split chunks)
                        import shutil
                        shutil.rmtree(file_path)
                    cleaned_count += 1
            except Exception as e:
                print(f"Failed to clean path {file_path}: {e}")

    if cleaned_count > 0:
        print(f"Cleanup Job: Removed {cleaned_count} expired files. Freed {size_freed / (1024*1024):.2f} MB.")
