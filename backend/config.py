import glob
import os
import sys
from pathlib import Path

# Dynamically register standard Windows paths for Tesseract and Ghostscript if not on PATH
if sys.platform == "win32":
    tess_dir = r"C:\Program Files\Tesseract-OCR"
    if os.path.exists(tess_dir) and tess_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] += os.pathsep + tess_dir

    gs_dirs = glob.glob(r"C:\Program Files\gs\gs*\bin")
    for gs_dir in gs_dirs:
        if gs_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] += os.pathsep + gs_dir


# Base Paths
IS_PACKAGED = getattr(sys, "frozen", False)
IS_DESKTOP_MODE = os.getenv("DOCSCALAR_DESKTOP", os.getenv("DOCFORGE_DESKTOP", "false")).lower() == "true"

if IS_PACKAGED or IS_DESKTOP_MODE:
    # Resolve to AppData/Local/DocScalar (with fallback to legacy DocForge directory)
    local_app_data = Path(os.getenv("LOCALAPPDATA", os.path.expanduser("~")))
    legacy_dir = local_app_data / "DocForge"
    primary_dir = local_app_data / "DocScalar"
    app_data_dir = primary_dir if (primary_dir.exists() or not legacy_dir.exists()) else legacy_dir
    UPLOAD_DIR = app_data_dir / "uploads"
    OUTPUT_DIR = app_data_dir / "output"
    DB_DIR = app_data_dir / "database"
    BIN_DIR = app_data_dir / "bin"
else:
    BASE_DIR = Path(__file__).resolve().parent
    UPLOAD_DIR = BASE_DIR / "uploads"
    OUTPUT_DIR = BASE_DIR / "output"
    DB_DIR = BASE_DIR
    BIN_DIR = BASE_DIR / "bin"

# Create directories if they don't exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DB_DIR.mkdir(parents=True, exist_ok=True)
BIN_DIR.mkdir(parents=True, exist_ok=True)

# Server Config
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# Redis Config
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# Cloudflare R2 / AWS S3 Config (Optional - for Shareable Links)
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "docscalar-shares")

# Anthropic Claude API Key (for SmartConvert AI features)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
# Google Gemini API Key (for cloud LLM canvas intent planning)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


# LibreOffice Path Auto-detection
def detect_libreoffice_path():
    # If in packaged/desktop mode, check the local AppData bin folder first
    if IS_PACKAGED or IS_DESKTOP_MODE:
        bundled_path = BIN_DIR / "LibreOffice" / "program" / "soffice.exe"
        if bundled_path.exists():
            return str(bundled_path)

    # Check default Windows locations
    windows_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ]
    for p in windows_paths:
        if Path(p).exists():
            return p

    # Default fallback for Linux/macOS (should be in PATH)
    return "libreoffice"


LIBREOFFICE_PATH = os.getenv("LIBREOFFICE_PATH", detect_libreoffice_path())

# Hard ceiling — must match RequestSizeLimitMiddleware in main.py
# 200MB for PDFs + overhead. Per-extension limits are enforced inside upload_file().
MAX_UPLOAD_SIZE = 210 * 1024 * 1024  # 210 MB hard gate
CLEANUP_INTERVAL_MINS = 10
FILE_EXPIRY_MINS = 30
