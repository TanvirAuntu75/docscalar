import os
import sys
import time
import zipfile
import threading
import urllib.request
from pathlib import Path
from backend.config import BIN_DIR

# Global installation progress state
install_state = {
    "status": "idle",       # 'idle', 'downloading', 'extracting', 'completed', 'failed'
    "percent": 0,
    "speed_mb": 0.0,
    "error": None,
    "step": ""              # 'downloading libreoffice', 'extracting libreoffice', etc.
}
state_lock = threading.Lock()

# Minimal URLs (using lightweight portable archives)
LIBREOFFICE_URL = "https://github.com/DocForge-App/portable-runtimes/releases/download/v1.0/LibreOfficePortableMini.zip"
OCR_MODELS_URL = "https://github.com/DocForge-App/portable-runtimes/releases/download/v1.0/PP-OCRv6_ONNX_Models.zip"

def update_state(**kwargs):
    with state_lock:
        for k, v in kwargs.items():
            install_state[k] = v

def get_install_status():
    with state_lock:
        return dict(install_state)

def download_file(url, dest_path):
    """Downloads a file with progress tracking."""
    start_time = time.time()
    last_update_time = start_time
    bytes_downloaded = 0
    
    # Custom headers to bypass user-agent blocks
    req = urllib.request.Request(url, headers={'User-Agent': 'DocForgeDesktopApp/1.0'})
    
    with urllib.request.urlopen(req) as response:
        total_size = int(response.info().get('Content-Length', 0))
        chunk_size = 1024 * 64 # 64KB chunks
        
        with open(dest_path, 'wb') as f:
            while True:
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                bytes_downloaded += len(chunk)
                
                # Update progress percentage
                percent = int((bytes_downloaded / total_size) * 100) if total_size > 0 else 50
                
                # Update speed every 0.5 seconds
                now = time.time()
                elapsed = now - last_update_time
                if elapsed >= 0.5:
                    speed = (bytes_downloaded / (1024 * 1024)) / (now - start_time) if (now - start_time) > 0 else 0.0
                    update_state(percent=percent, speed_mb=round(speed, 2))
                    last_update_time = now

def extract_zip(zip_path, extract_to):
    """Extracts a zip file and reports progress."""
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        file_list = zip_ref.namelist()
        total_files = len(file_list)
        
        for i, file_name in enumerate(file_list):
            zip_ref.extract(file_name, extract_to)
            # Update progress
            percent = int(((i + 1) / total_files) * 100)
            update_state(percent=percent)

def install_task():
    try:
        # 1. Download & Unpack LibreOffice
        update_state(status="downloading", step="Downloading LibreOffice (135MB)...", percent=0, speed_mb=0.0)
        libreoffice_zip = BIN_DIR / "libreoffice.zip"
        download_file(LIBREOFFICE_URL, libreoffice_zip)
        
        update_state(status="extracting", step="Extracting LibreOffice...", percent=0)
        extract_zip(libreoffice_zip, BIN_DIR)
        
        # Clean up zip
        if libreoffice_zip.exists():
            os.remove(libreoffice_zip)
            
        # 2. Download & Unpack OCR ONNX Models
        update_state(status="downloading", step="Downloading OCR Models (40MB)...", percent=0, speed_mb=0.0)
        ocr_zip = BIN_DIR / "ocr_models.zip"
        download_file(OCR_MODELS_URL, ocr_zip)
        
        update_state(status="extracting", step="Extracting OCR Models...", percent=0)
        # Extract models to AppData/bin/models
        models_dir = BIN_DIR / "models"
        models_dir.mkdir(parents=True, exist_ok=True)
        extract_zip(ocr_zip, models_dir)
        
        # Clean up zip
        if ocr_zip.exists():
            os.remove(ocr_zip)
            
        update_state(status="completed", step="Installation complete!", percent=100)
    except Exception as e:
        print(f"Bootstrap install error: {e}")
        update_state(status="failed", step="Installation failed", error=str(e))

def start_install_dependencies():
    current_status = get_install_status()["status"]
    if current_status in ("downloading", "extracting"):
        return False
        
    thread = threading.Thread(target=install_task, daemon=True)
    thread.start()
    return True

def verify_dependencies_installed():
    """Checks if LibreOffice and OCR models exist on disk."""
    soffice_exe = BIN_DIR / "LibreOffice" / "program" / "soffice.exe"
    ocr_model = BIN_DIR / "models" / "rec_handwriting.onnx"
    
    return soffice_exe.exists() and ocr_model.exists()
