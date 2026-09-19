# %% [markdown]
# # DocScalar Universal OCR Model Training
#
# **Goal**: Train ONE PP-OCRv4 recognition model with a ~20,000-character universal
# dictionary covering every script, then export as FP16 ONNX (server) and INT8 ONNX (browser).
#
# **Two-Phase Training**:
# - Phase 1: Synthetic data from merged dictionaries (teaches all character classes)
# - Phase 2: Fine-tune on 17 real handwriting datasets + Google Drive PDFs
#
# **Runtime**: Use GPU runtime (T4 free tier is sufficient). Total ~10-14 hours with checkpointing.

# %% Cell 0 — Install Dependencies
# ============================================================================
# Install PaddlePaddle GPU, PaddleOCR, and all required libraries.
# Re-run this cell if Colab session restarts.
# ============================================================================
import subprocess, sys

def run_pip(args_str):
    cmd = f"{sys.executable} -m pip install {args_str}"
    print(f">> {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"   [Notice] pip returned code {res.returncode}. Output:\n{res.stderr[-300:] if res.stderr else res.stdout[-300:]}")
    else:
        print("   Success.")

# 1. PaddlePaddle GPU (Step 1 already completed in session, or uses official mirror)
print("Step 1: Checking PaddlePaddle GPU ...")
try:
    import paddle
    if paddle.device.is_compiled_with_cuda():
        print(f"   PaddlePaddle GPU already installed: {paddle.__version__}")
    else:
        raise ImportError("CPU only")
except Exception:
    for mirror in [
        "https://www.paddlepaddle.org.cn/packages/stable/cu126/",
        "https://www.paddlepaddle.org.cn/packages/stable/cu120/",
        "https://www.paddlepaddle.org.cn/packages/stable/cu118/",
    ]:
        cmd = f"{sys.executable} -m pip install paddlepaddle-gpu -i {mirror}"
        print(f">> Trying mirror: {mirror}")
        if subprocess.run(cmd, shell=True).returncode == 0:
            break

# 2. PaddleOCR, Paddle2ONNX, and ONNX tools
print("\nStep 2: Installing PaddleOCR, Paddle2ONNX, and ONNX tools ...")
run_pip("paddleocr")
run_pip("paddle2onnx")
run_pip("onnx onnxconverter-common")

# 3. ONNX Runtime
print("\nStep 3: Installing ONNX Runtime ...")
subprocess.run(f"{sys.executable} -m pip uninstall -y onnxruntime onnxruntime-gpu", shell=True, capture_output=True)
res = subprocess.run(f"{sys.executable} -m pip install onnxruntime-gpu", shell=True)
if res.returncode != 0:
    print("   GPU onnxruntime unavailable, installing CPU onnxruntime ...")
    subprocess.run(f"{sys.executable} -m pip install onnxruntime", shell=True)

# 4. Data & image processing
print("\nStep 4: Installing dataset & text rendering utilities ...")
run_pip("datasets PyMuPDF 'Pillow>=10.0.0' opencv-python-headless 'trdg>=1.8.0' 'arabic-reshaper>=3.0.0' 'python-bidi>=0.4.2' tqdm pyyaml")

# 5. System libraries for complex script rendering (Arabic, Devanagari, Bengali, etc.)
print("\nStep 5: Installing system rendering libraries ...")
subprocess.run(["apt-get", "update", "-qq"], check=False)
subprocess.run(["apt-get", "install", "-y", "-qq", "libraqm0", "libfribidi0"], check=False)

# 6. Verification
print("\nStep 6: Verifying GPU support ...")
import paddle
print("=" * 50)
print("PaddlePaddle Version:", paddle.__version__)
print("Paddle compiled with CUDA:", paddle.device.is_compiled_with_cuda())
print("Current device:", paddle.device.get_device())
print("=" * 50)
assert paddle.device.is_compiled_with_cuda(), "WARNING: Paddle is NOT using GPU. Make sure Colab runtime is set to GPU (T4)!"
print("\n All dependencies successfully installed and GPU verified!")

# %% Cell 1 — Mount Google Drive & Create Directories
# ============================================================================
import os
from pathlib import Path

from google.colab import drive
drive.mount("/content/drive", force_remount=False)

# === Configuration ===
DRIVE_ROOT       = Path("/content/drive/MyDrive/OCR_Training")
CHECKPOINT_DIR   = DRIVE_ROOT / "checkpoints"
PHASE1_CKPT      = CHECKPOINT_DIR / "phase1"
PHASE2_CKPT      = CHECKPOINT_DIR / "phase2"
MODEL_OUTPUT_DIR = DRIVE_ROOT / "models"
DICT_PATH        = DRIVE_ROOT / "universal_dict.txt"

# Local working directories (fast SSD on Colab)
WORK_DIR         = Path("/content/ocr_work")
SYNTH_DIR        = WORK_DIR / "synthetic"
REAL_DIR         = WORK_DIR / "real_data"
FONT_DIR         = Path("/content/fonts")
PADDLE_DIR       = Path("/content/PaddleOCR")

# User's Drive PDF datasets
DRIVE_PDF_DIR    = DRIVE_ROOT / "dataset"
DRIVE_NEWDATA    = DRIVE_ROOT / "New_data"

for d in [CHECKPOINT_DIR, PHASE1_CKPT, PHASE2_CKPT, MODEL_OUTPUT_DIR,
          WORK_DIR, SYNTH_DIR, SYNTH_DIR / "train", SYNTH_DIR / "val",
          REAL_DIR, REAL_DIR / "train", REAL_DIR / "val", FONT_DIR]:
    d.mkdir(parents=True, exist_ok=True)

print(f"Drive root:      {DRIVE_ROOT}")
print(f"Dict path:       {DICT_PATH}")
print(f"Checkpoint dir:  {CHECKPOINT_DIR}")
print(f"Work dir:        {WORK_DIR}")
print(f"Drive PDF dir:   {DRIVE_PDF_DIR} (exists={DRIVE_PDF_DIR.exists()})")

# %% Cell 2 — Clone PaddleOCR & Download Pretrained Weights
# ============================================================================
import tarfile, urllib.request, shutil

# Clone PaddleOCR repository
if not PADDLE_DIR.exists():
    subprocess.run(
        ["git", "clone", "--depth", "1",
         "https://github.com/PaddlePaddle/PaddleOCR.git",
         str(PADDLE_DIR)],
        check=True
    )
    print("PaddleOCR cloned.")
else:
    print("PaddleOCR already cloned.")

# Download PP-OCRv4 rec training weights (contains student.pdparams)
PRETRAINED_DIR = WORK_DIR / "pretrained"
PRETRAINED_DIR.mkdir(parents=True, exist_ok=True)
WEIGHTS_URL  = "https://paddleocr.bj.bcebos.com/PP-OCRv4/chinese/ch_PP-OCRv4_rec_train.tar"
WEIGHTS_TAR  = PRETRAINED_DIR / "ch_PP-OCRv4_rec_train.tar"
STUDENT_PATH = PRETRAINED_DIR / "ch_PP-OCRv4_rec_train" / "student.pdparams"

if not STUDENT_PATH.exists():
    print("Downloading PP-OCRv4 rec training weights (~150 MB) ...")
    urllib.request.urlretrieve(WEIGHTS_URL, str(WEIGHTS_TAR))
    with tarfile.open(str(WEIGHTS_TAR), "r") as tar:
        tar.extractall(str(PRETRAINED_DIR))
    WEIGHTS_TAR.unlink(missing_ok=True)
    print(f"Extracted to {PRETRAINED_DIR}")
else:
    print(f"Pretrained weights already at {STUDENT_PATH}")

# Verify student weights exist
assert STUDENT_PATH.exists(), f"student.pdparams not found at {STUDENT_PATH}"
size_mb = STUDENT_PATH.stat().st_size / (1024 * 1024)
print(f"Student weights: {size_mb:.1f} MB")

# %% Cell 3 — Build Universal Dictionary
# ============================================================================
# Download ALL dictionary files from PaddleOCR GitHub and merge into one
# universal dictionary covering every Unicode script.
# ============================================================================
import requests, json, unicodedata
from collections import defaultdict

GITHUB_API = "https://api.github.com/repos/PaddlePaddle/PaddleOCR/contents/ppocr/utils/dict"
RAW_BASE   = "https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/main/ppocr/utils/dict"

print("Fetching PaddleOCR dictionary listing from GitHub ...")
resp = requests.get(GITHUB_API, timeout=30)
resp.raise_for_status()
files = resp.json()

dict_files = [f["name"] for f in files if f["name"].endswith(".txt")]
print(f"Found {len(dict_files)} dictionary files: {dict_files}")

# Download and collect all characters
all_chars = set()
per_file_counts = {}

for fname in dict_files:
    url = f"{RAW_BASE}/{fname}"
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        chars = set()
        for line in r.text.strip().split("\n"):
            line = line.strip()
            if line and len(line) == 1:
                chars.add(line)
            elif line and len(line) > 1:
                # Some dicts have multi-char entries; take first char
                chars.add(line[0])
        per_file_counts[fname] = len(chars)
        all_chars.update(chars)
        print(f"  {fname}: {len(chars)} chars")
    except Exception as e:
        print(f"  WARNING: Failed to download {fname}: {e}")

print(f"\nMerged from PaddleOCR dicts: {len(all_chars)} unique chars")

# === Gap-Fill: Add Unicode blocks NOT covered by any PaddleOCR dict ===
GAP_FILL_RANGES = {
    "Sinhala":          (0x0D80, 0x0DFF),
    "Myanmar":          (0x1000, 0x109F),
    "Ethiopic":         (0x1200, 0x137F),
    "Armenian":         (0x0530, 0x058F),
    "Khmer":            (0x1780, 0x17FF),
    "Lao":              (0x0E80, 0x0EFF),
    "Tibetan":          (0x0F00, 0x0FFF),
    "Oriya":            (0x0B00, 0x0B7F),
    "Malayalam":        (0x0D00, 0x0D7F),
    "Gurmukhi":         (0x0A00, 0x0A7F),
    "Latin_Extended_A":  (0x0100, 0x017F),
    "Latin_Extended_B":  (0x0180, 0x024F),
    "Greek_Coptic":     (0x0370, 0x03FF),
    "Currency_Symbols": (0x20A0, 0x20CF),
    "General_Punct":    (0x2000, 0x206F),
    "Math_Operators":   (0x2200, 0x22FF),
    "Box_Drawing":      (0x2500, 0x257F),
    "Arrows":           (0x2190, 0x21FF),
    "Superscripts":     (0x2070, 0x209F),
}

gap_added = 0
for block_name, (start, end) in GAP_FILL_RANGES.items():
    block_chars = set()
    for cp in range(start, end + 1):
        c = chr(cp)
        cat = unicodedata.category(c)
        # Only add letters, numbers, and common punctuation/symbols
        if cat.startswith(("L", "N", "P", "S", "M")):
            if c not in all_chars:
                block_chars.add(c)
    all_chars.update(block_chars)
    gap_added += len(block_chars)
    if block_chars:
        print(f"  Gap-filled {block_name}: +{len(block_chars)} chars")

print(f"Gap-filled total: +{gap_added} chars")

# Also ensure ASCII printable is complete
for cp in range(0x20, 0x7F):
    all_chars.add(chr(cp))

# Sort by Unicode codepoint for deterministic ordering
sorted_chars = sorted(all_chars, key=ord)

# Write universal_dict.txt
with open(str(DICT_PATH), "w", encoding="utf-8") as f:
    for c in sorted_chars:
        f.write(c + "\n")

# Also save a local copy for training
local_dict = WORK_DIR / "universal_dict.txt"
shutil.copy2(str(DICT_PATH), str(local_dict))

print(f"\n=== Universal Dictionary: {len(sorted_chars)} characters ===")
print(f"Saved to: {DICT_PATH}")
print(f"Local copy: {local_dict}")

# %% Cell 4 — Dictionary Coverage Report
# ============================================================================
from collections import Counter

def get_script_name(cp):
    """Classify a Unicode codepoint into its script block."""
    if 0x0000 <= cp <= 0x007F: return "ASCII"
    if 0x0080 <= cp <= 0x00FF: return "Latin-1 Supplement"
    if 0x0100 <= cp <= 0x024F: return "Latin Extended"
    if 0x0250 <= cp <= 0x02AF: return "IPA Extensions"
    if 0x0370 <= cp <= 0x03FF: return "Greek"
    if 0x0400 <= cp <= 0x04FF: return "Cyrillic"
    if 0x0500 <= cp <= 0x052F: return "Cyrillic Supplement"
    if 0x0530 <= cp <= 0x058F: return "Armenian"
    if 0x0590 <= cp <= 0x05FF: return "Hebrew"
    if 0x0600 <= cp <= 0x06FF: return "Arabic"
    if 0x0700 <= cp <= 0x074F: return "Syriac"
    if 0x0780 <= cp <= 0x07BF: return "Thaana"
    if 0x0900 <= cp <= 0x097F: return "Devanagari"
    if 0x0980 <= cp <= 0x09FF: return "Bengali"
    if 0x0A00 <= cp <= 0x0A7F: return "Gurmukhi"
    if 0x0A80 <= cp <= 0x0AFF: return "Gujarati"
    if 0x0B00 <= cp <= 0x0B7F: return "Oriya"
    if 0x0B80 <= cp <= 0x0BFF: return "Tamil"
    if 0x0C00 <= cp <= 0x0C7F: return "Telugu"
    if 0x0C80 <= cp <= 0x0CFF: return "Kannada"
    if 0x0D00 <= cp <= 0x0D7F: return "Malayalam"
    if 0x0D80 <= cp <= 0x0DFF: return "Sinhala"
    if 0x0E00 <= cp <= 0x0E7F: return "Thai"
    if 0x0E80 <= cp <= 0x0EFF: return "Lao"
    if 0x0F00 <= cp <= 0x0FFF: return "Tibetan"
    if 0x1000 <= cp <= 0x109F: return "Myanmar"
    if 0x10A0 <= cp <= 0x10FF: return "Georgian"
    if 0x1100 <= cp <= 0x11FF: return "Hangul Jamo"
    if 0x1200 <= cp <= 0x137F: return "Ethiopic"
    if 0x1780 <= cp <= 0x17FF: return "Khmer"
    if 0x2000 <= cp <= 0x206F: return "General Punctuation"
    if 0x2070 <= cp <= 0x209F: return "Superscripts/Subscripts"
    if 0x20A0 <= cp <= 0x20CF: return "Currency Symbols"
    if 0x2100 <= cp <= 0x214F: return "Letterlike Symbols"
    if 0x2150 <= cp <= 0x218F: return "Number Forms"
    if 0x2190 <= cp <= 0x21FF: return "Arrows"
    if 0x2200 <= cp <= 0x22FF: return "Math Operators"
    if 0x2500 <= cp <= 0x257F: return "Box Drawing"
    if 0x2580 <= cp <= 0x259F: return "Block Elements"
    if 0x25A0 <= cp <= 0x25FF: return "Geometric Shapes"
    if 0x2600 <= cp <= 0x26FF: return "Miscellaneous Symbols"
    if 0x3000 <= cp <= 0x303F: return "CJK Symbols"
    if 0x3040 <= cp <= 0x309F: return "Hiragana"
    if 0x30A0 <= cp <= 0x30FF: return "Katakana"
    if 0x3100 <= cp <= 0x312F: return "Bopomofo"
    if 0x3130 <= cp <= 0x318F: return "Hangul Compat Jamo"
    if 0x3400 <= cp <= 0x4DBF: return "CJK Ext A"
    if 0x4E00 <= cp <= 0x9FFF: return "CJK Unified"
    if 0xAC00 <= cp <= 0xD7AF: return "Hangul Syllables"
    if 0xF900 <= cp <= 0xFAFF: return "CJK Compat"
    if 0xFB00 <= cp <= 0xFB4F: return "Alpha Pres Forms"
    if 0xFB50 <= cp <= 0xFDFF: return "Arabic Pres Forms A"
    if 0xFE30 <= cp <= 0xFE4F: return "CJK Compat Forms"
    if 0xFE70 <= cp <= 0xFEFF: return "Arabic Pres Forms B"
    if 0xFF00 <= cp <= 0xFFEF: return "Halfwidth/Fullwidth"
    return "Other"

# Load the dict we just wrote
with open(str(DICT_PATH), "r", encoding="utf-8") as f:
    dict_chars = [line.strip() for line in f if line.strip()]

script_counts = Counter()
for c in dict_chars:
    script_counts[get_script_name(ord(c))] += 1

print(f"{'Script Block':<30} {'Count':>6}")
print("-" * 38)
for script, count in sorted(script_counts.items(), key=lambda x: -x[1]):
    print(f"{script:<30} {count:>6}")
print("-" * 38)
print(f"{'TOTAL':<30} {len(dict_chars):>6}")

# Assertions
assert len(dict_chars) >= 19000, f"Expected >= 19000 chars, got {len(dict_chars)}"
assert len(set(dict_chars)) == len(dict_chars), "Duplicates found in dict!"
assert script_counts.get("ASCII", 0) >= 90, "ASCII coverage too low"
print("\nAll coverage assertions PASSED.")

# %% Cell 5 — Install Unicode Fonts
# ============================================================================
# Download Google Noto fonts for every script we need to render.
# ============================================================================
import urllib.request as urlreq

NOTO_BASE = "https://github.com/google/fonts/raw/main/ofl"
NOTO_GITHUB_RAW = "https://github.com/notofonts"

# Fonts we need — mapping script → download URL + local filename
FONT_DOWNLOADS = {
    # CJK fonts from Noto CJK releases
    "NotoSansCJKsc-Regular.otf": "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf",
    "NotoSansCJKjp-Regular.otf": "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf",
    "NotoSansCJKkr-Regular.otf": "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf",
    "NotoSansCJKtc-Regular.otf": "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Regular.otf",
}

# Install system Noto fonts (covers Latin, Cyrillic, Greek, Arabic, Devanagari,
# Bengali, Thai, Georgian, Armenian, Hebrew, Tamil, Telugu, Kannada, Malayalam,
# Gujarati, Gurmukhi, Oriya, Sinhala, Myanmar, Ethiopic, Khmer, Lao, Tibetan)
subprocess.run([
    "apt-get", "install", "-y", "-qq",
    "fonts-noto-core",
    "fonts-noto-extra",
    "fonts-noto-ui-core",
    "fonts-noto-cjk",
    "fonts-noto-color-emoji",
    "fonts-noto-mono",
], check=False)

# Download CJK fonts that may not be in system packages
for fname, url in FONT_DOWNLOADS.items():
    dest = FONT_DIR / fname
    if not dest.exists():
        print(f"Downloading {fname} ...")
        try:
            urlreq.urlretrieve(url, str(dest))
            print(f"  Saved to {dest} ({dest.stat().st_size / 1024:.0f} KB)")
        except Exception as e:
            print(f"  WARNING: Failed to download {fname}: {e}")
    else:
        print(f"  {fname} already exists.")

# Build font map: script name → font file path
# Try system fonts first, then downloaded fonts
import glob

def find_font(patterns):
    """Find the first existing font matching any pattern."""
    search_dirs = [
        "/usr/share/fonts",
        str(FONT_DIR),
        "/content/fonts",
    ]
    for pattern in patterns:
        for search_dir in search_dirs:
            matches = glob.glob(os.path.join(search_dir, "**", pattern), recursive=True)
            if matches:
                return matches[0]
    return None

SCRIPT_FONT_MAP = {}
FONT_SEARCH = {
    "latin":       ["NotoSans-Regular*", "NotoSans[_-]Regular*", "DejaVuSans.ttf"],
    "cyrillic":    ["NotoSans-Regular*", "DejaVuSans.ttf"],
    "greek":       ["NotoSans-Regular*", "DejaVuSans.ttf"],
    "arabic":      ["NotoSansArabic*Regular*", "NotoNaskhArabic*Regular*"],
    "hebrew":      ["NotoSansHebrew*Regular*"],
    "devanagari":  ["NotoSansDevanagari*Regular*"],
    "bengali":     ["NotoSansBengali*Regular*"],
    "gurmukhi":    ["NotoSansGurmukhi*Regular*"],
    "gujarati":    ["NotoSansGujarati*Regular*"],
    "oriya":       ["NotoSansOriya*Regular*", "NotoSansOrya*Regular*"],
    "tamil":       ["NotoSansTamil*Regular*"],
    "telugu":      ["NotoSansTelugu*Regular*"],
    "kannada":     ["NotoSansKannada*Regular*"],
    "malayalam":   ["NotoSansMalayalam*Regular*"],
    "sinhala":     ["NotoSansSinhala*Regular*"],
    "thai":        ["NotoSansThai*Regular*"],
    "lao":         ["NotoSansLao*Regular*"],
    "tibetan":     ["NotoSansTibetan*Regular*"],
    "myanmar":     ["NotoSansMyanmar*Regular*"],
    "georgian":    ["NotoSansGeorgian*Regular*"],
    "armenian":    ["NotoSansArmenian*Regular*"],
    "ethiopic":    ["NotoSansEthiopic*Regular*"],
    "khmer":       ["NotoSansKhmer*Regular*"],
    "cjk_sc":      ["NotoSansCJKsc-Regular.otf", "NotoSansSC*Regular*"],
    "cjk_jp":      ["NotoSansCJKjp-Regular.otf", "NotoSansJP*Regular*"],
    "cjk_kr":      ["NotoSansCJKkr-Regular.otf", "NotoSansKR*Regular*"],
    "cjk_tc":      ["NotoSansCJKtc-Regular.otf", "NotoSansTC*Regular*"],
}

for script, patterns in FONT_SEARCH.items():
    found = find_font(patterns)
    if found:
        SCRIPT_FONT_MAP[script] = found
        print(f"  {script:<15} -> {found}")
    else:
        print(f"  WARNING: No font found for {script}!")

print(f"\nFonts found: {len(SCRIPT_FONT_MAP)}/{len(FONT_SEARCH)}")

# %% Cell 6 — Synthetic Data Generation Engine
# ============================================================================
# Core engine that creates text-line images for any Unicode script.
# ============================================================================
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from tqdm import tqdm

RTL_SCRIPTS = {"arabic", "hebrew", "urdu", "farsi"}

def categorize_dict_by_script(dict_path):
    """Group dictionary characters by Unicode script for balanced generation."""
    scripts = defaultdict(list)
    with open(dict_path, "r", encoding="utf-8") as f:
        for line in f:
            c = line.strip()
            if not c:
                continue
            cp = ord(c)
            if 0x0020 <= cp <= 0x007E:    scripts["latin"].append(c)
            elif 0x00C0 <= cp <= 0x024F:  scripts["latin"].append(c)
            elif 0x0370 <= cp <= 0x03FF:  scripts["greek"].append(c)
            elif 0x0400 <= cp <= 0x052F:  scripts["cyrillic"].append(c)
            elif 0x0530 <= cp <= 0x058F:  scripts["armenian"].append(c)
            elif 0x0590 <= cp <= 0x05FF:  scripts["hebrew"].append(c)
            elif 0x0600 <= cp <= 0x06FF:  scripts["arabic"].append(c)
            elif 0x0700 <= cp <= 0x074F:  scripts["arabic"].append(c)  # Syriac → Arabic font
            elif 0x0780 <= cp <= 0x07BF:  scripts["arabic"].append(c)  # Thaana
            elif 0x0900 <= cp <= 0x097F:  scripts["devanagari"].append(c)
            elif 0x0980 <= cp <= 0x09FF:  scripts["bengali"].append(c)
            elif 0x0A00 <= cp <= 0x0A7F:  scripts["gurmukhi"].append(c)
            elif 0x0A80 <= cp <= 0x0AFF:  scripts["gujarati"].append(c)
            elif 0x0B00 <= cp <= 0x0B7F:  scripts["oriya"].append(c)
            elif 0x0B80 <= cp <= 0x0BFF:  scripts["tamil"].append(c)
            elif 0x0C00 <= cp <= 0x0C7F:  scripts["telugu"].append(c)
            elif 0x0C80 <= cp <= 0x0CFF:  scripts["kannada"].append(c)
            elif 0x0D00 <= cp <= 0x0D7F:  scripts["malayalam"].append(c)
            elif 0x0D80 <= cp <= 0x0DFF:  scripts["sinhala"].append(c)
            elif 0x0E00 <= cp <= 0x0E7F:  scripts["thai"].append(c)
            elif 0x0E80 <= cp <= 0x0EFF:  scripts["lao"].append(c)
            elif 0x0F00 <= cp <= 0x0FFF:  scripts["tibetan"].append(c)
            elif 0x1000 <= cp <= 0x109F:  scripts["myanmar"].append(c)
            elif 0x10A0 <= cp <= 0x10FF:  scripts["georgian"].append(c)
            elif 0x1200 <= cp <= 0x137F:  scripts["ethiopic"].append(c)
            elif 0x1780 <= cp <= 0x17FF:  scripts["khmer"].append(c)
            elif 0x3040 <= cp <= 0x309F:  scripts["cjk_jp"].append(c)   # Hiragana
            elif 0x30A0 <= cp <= 0x30FF:  scripts["cjk_jp"].append(c)   # Katakana
            elif 0x4E00 <= cp <= 0x9FFF:  scripts["cjk_sc"].append(c)   # CJK Unified
            elif 0x3400 <= cp <= 0x4DBF:  scripts["cjk_sc"].append(c)   # CJK Ext A
            elif 0xAC00 <= cp <= 0xD7AF:  scripts["cjk_kr"].append(c)   # Hangul
            elif 0x1100 <= cp <= 0x11FF:  scripts["cjk_kr"].append(c)   # Hangul Jamo
            elif 0xFB50 <= cp <= 0xFDFF:  scripts["arabic"].append(c)   # Arabic Pres A
            elif 0xFE70 <= cp <= 0xFEFF:  scripts["arabic"].append(c)   # Arabic Pres B
            elif 0xFF00 <= cp <= 0xFFEF:  scripts["cjk_sc"].append(c)   # Fullwidth
            else:                         scripts["other"].append(c)
    return dict(scripts)


def apply_augmentations(img):
    """Apply random augmentations to a text-line image."""
    # Gaussian blur
    if random.random() < 0.25:
        radius = random.uniform(0.3, 1.2)
        img = img.filter(ImageFilter.GaussianBlur(radius=radius))

    # Brightness jitter
    if random.random() < 0.35:
        factor = random.uniform(0.82, 1.18)
        img = ImageEnhance.Brightness(img).enhance(factor)

    # Contrast jitter
    if random.random() < 0.30:
        factor = random.uniform(0.85, 1.15)
        img = ImageEnhance.Contrast(img).enhance(factor)

    # Slight rotation
    if random.random() < 0.20:
        angle = random.uniform(-2.5, 2.5)
        img = img.rotate(angle, fillcolor=(255, 255, 255), expand=False)

    # Gaussian noise
    if random.random() < 0.15:
        arr = np.array(img, dtype=np.float32)
        sigma = random.uniform(2, 8)
        noise = np.random.normal(0, sigma, arr.shape)
        arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
        img = Image.fromarray(arr)

    return img


def render_text_line(text, font_path, height=48, is_rtl=False):
    """Render a single text string as a PIL image at the given height."""
    # Handle RTL text
    display_text = text
    if is_rtl:
        try:
            import arabic_reshaper
            from bidi.algorithm import get_display
            reshaped = arabic_reshaper.reshape(text)
            display_text = get_display(reshaped)
        except ImportError:
            pass

    # Font size: slightly smaller than image height for padding
    font_size = max(12, height - random.randint(8, 18))
    try:
        font = ImageFont.truetype(font_path, font_size)
    except (OSError, IOError):
        font = ImageFont.load_default()

    # Measure text dimensions
    dummy = Image.new("RGB", (1, 1))
    draw = ImageDraw.Draw(dummy)
    try:
        bbox = draw.textbbox((0, 0), display_text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        y_baseline = -bbox[1]
    except Exception:
        text_w, text_h = font_size * len(display_text), font_size
        y_baseline = 0

    # Image dimensions
    pad_x = random.randint(4, 16)
    img_w = max(text_w + pad_x * 2, 32)
    img_w = min(img_w, 800)  # Cap width

    # Background color: varying shades of white/off-white
    bg_choices = [
        (255, 255, 255), (252, 252, 252), (248, 248, 245),
        (244, 244, 240), (240, 240, 238), (250, 248, 240),
    ]
    bg = random.choice(bg_choices)
    img = Image.new("RGB", (img_w, height), bg)
    draw = ImageDraw.Draw(img)

    # Text color: dark with slight variation
    intensity = random.randint(0, 70)
    fg = (intensity, intensity + random.randint(-5, 5), intensity + random.randint(-5, 5))
    fg = tuple(max(0, min(255, c)) for c in fg)

    # Position text
    x = pad_x
    y = max(0, (height - text_h) // 2 + y_baseline - 2)

    try:
        draw.text((x, y), display_text, font=font, fill=fg)
    except Exception:
        # Fallback: draw character by character
        cx = x
        for ch in display_text:
            try:
                draw.text((cx, y), ch, font=font, fill=fg)
                cbox = draw.textbbox((0, 0), ch, font=font)
                cx += cbox[2] - cbox[0] + 1
            except Exception:
                cx += font_size // 2

    # Apply augmentations
    img = apply_augmentations(img)
    return img


def generate_script_dataset(
    script_name, chars, font_path, output_dir, label_lines,
    num_images, height=48, is_rtl=False
):
    """Generate synthetic text-line images for a single script."""
    if not chars or not font_path or not os.path.exists(font_path):
        print(f"  SKIP {script_name}: no chars or font missing ({font_path})")
        return 0

    count = 0
    for i in tqdm(range(num_images), desc=f"  {script_name}", ncols=80, leave=False):
        # Generate random text from script chars
        text_len = random.randint(2, min(25, len(chars)))
        text = "".join(random.choices(chars, k=text_len))

        # Optionally insert spaces for Latin/Cyrillic scripts
        if script_name in ("latin", "cyrillic", "greek", "armenian", "georgian"):
            words = []
            pos = 0
            while pos < len(text):
                wlen = random.randint(2, 8)
                words.append(text[pos:pos + wlen])
                pos += wlen
            text = " ".join(words)

        # Render image
        try:
            img = render_text_line(text, font_path, height=height, is_rtl=is_rtl)
        except Exception as e:
            continue

        # Save
        fname = f"{script_name}_{i:06d}.jpg"
        img_path = output_dir / fname
        img.save(str(img_path), "JPEG", quality=random.randint(85, 98))

        # Label: use original text (not display text)
        # PaddleOCR format: relative_path\ttext
        label_lines.append(f"{fname}\t{text}")
        count += 1

    return count


# %% Cell 7 — Generate Phase 1 Synthetic Training Data
# ============================================================================
# Generate ~300K synthetic text-line images across all scripts.
# ============================================================================
print("Categorizing dictionary characters by script ...")
script_chars = categorize_dict_by_script(str(DICT_PATH))
for s, chars in sorted(script_chars.items(), key=lambda x: -len(x[1])):
    print(f"  {s:<15} {len(chars):>6} chars")

# Define how many images per script (proportional to char count, with minimums)
# Major scripts get more images, minor scripts get fewer but enough to learn
IMAGES_PER_SCRIPT = {
    "latin":       40000,
    "cjk_sc":      40000,
    "cjk_jp":      25000,
    "cjk_kr":      25000,
    "arabic":      25000,
    "cyrillic":    20000,
    "devanagari":  15000,
    "bengali":     12000,
    "korean":      15000,
    "thai":        10000,
    "greek":       8000,
    "tamil":       8000,
    "telugu":      8000,
    "kannada":     6000,
    "malayalam":   6000,
    "gujarati":    6000,
    "gurmukhi":    6000,
    "oriya":       5000,
    "hebrew":      8000,
    "georgian":    5000,
    "armenian":    5000,
    "ethiopic":    5000,
    "myanmar":     4000,
    "sinhala":     4000,
    "khmer":       4000,
    "lao":         4000,
    "tibetan":     3000,
    "cjk_tc":      8000,
    "other":       3000,
}

# Generate training data
train_labels = []
val_labels = []
train_dir = SYNTH_DIR / "train"
val_dir = SYNTH_DIR / "val"
total_generated = 0

print("\n=== Generating Synthetic Training Data ===\n")
for script_name, target_count in IMAGES_PER_SCRIPT.items():
    chars = script_chars.get(script_name, [])
    if not chars:
        print(f"  SKIP {script_name}: 0 chars in dict")
        continue

    font_path = SCRIPT_FONT_MAP.get(script_name)
    if not font_path:
        # Try fallback: use latin font for unknown scripts
        font_path = SCRIPT_FONT_MAP.get("latin")
        if not font_path:
            print(f"  SKIP {script_name}: no font available")
            continue

    is_rtl = script_name in RTL_SCRIPTS

    # 90% train, 10% val
    train_count = int(target_count * 0.9)
    val_count = target_count - train_count

    t = generate_script_dataset(
        script_name, chars, font_path, train_dir, train_labels,
        train_count, is_rtl=is_rtl
    )
    v = generate_script_dataset(
        script_name, chars, font_path, val_dir, val_labels,
        val_count, is_rtl=is_rtl
    )
    total_generated += t + v
    print(f"  {script_name}: {t} train + {v} val = {t + v}")

# Write label files
train_label_file = SYNTH_DIR / "rec_gt_train.txt"
val_label_file = SYNTH_DIR / "rec_gt_val.txt"

with open(str(train_label_file), "w", encoding="utf-8") as f:
    f.write("\n".join(train_labels) + "\n")

with open(str(val_label_file), "w", encoding="utf-8") as f:
    f.write("\n".join(val_labels) + "\n")

print(f"\n=== Synthetic Data Summary ===")
print(f"Total images generated: {total_generated}")
print(f"Train labels: {len(train_labels)} in {train_label_file}")
print(f"Val labels:   {len(val_labels)} in {val_label_file}")
print(f"Disk usage:   {sum(f.stat().st_size for f in train_dir.glob('*')) / (1024**3):.2f} GB (train)")

# Verify
assert len(train_labels) >= 200000, f"Expected >= 200K train samples, got {len(train_labels)}"
assert len(val_labels) >= 20000, f"Expected >= 20K val samples, got {len(val_labels)}"
print("Synthetic data assertions PASSED.")

# %% Cell 8 — Phase 1 Training Config
# ============================================================================
# Write the PaddleOCR training YAML config for Phase 1 (synthetic data).
# Uses PP-OCRv4 rec architecture with PPHGNet_small backbone.
# ============================================================================
import yaml

# Resolve the path to student pretrained weights (without .pdparams extension)
student_pretrained = str(PRETRAINED_DIR / "ch_PP-OCRv4_rec_train" / "student")

phase1_config = {
    "Global": {
        "debug": False,
        "use_gpu": True,
        "use_amp": True,
        "amp_level": "O1",
        "epoch_num": 30,
        "log_smooth_window": 20,
        "print_batch_step": 100,
        "save_model_dir": str(PHASE1_CKPT),
        "save_epoch_step": 1,              # Checkpoint saved to Google Drive every epoch
        "eval_batch_step": [2000, 2000],
        "cal_metric_during_train": True,
        "pretrained_model": student_pretrained,
        "checkpoints": None,
        "save_inference_dir": None,
        "use_visualdl": False,
        "character_dict_path": str(WORK_DIR / "universal_dict.txt"),
        "max_text_length": 25,
        "infer_mode": False,
        "use_space_char": True,
        "distributed": False,
        "save_res_path": str(WORK_DIR / "phase1_predicts.txt"),
    },
    "Architecture": {
        "model_type": "rec",
        "algorithm": "SVTR_LCNet",
        "Transform": None,
        "Backbone": {
            "name": "PPHGNet_small",
        },
        "Head": {
            "name": "MultiHead",
            "head_list": [
                {
                    "CTCHead": {
                        "Neck": {
                            "name": "svtr",
                            "dims": 120,
                            "depth": 2,
                            "hidden_dims": 120,
                            "kernel_size": [1, 3],
                            "use_guide": True,
                        },
                        "Head": {
                            "fc_decay": 0.00001,
                        },
                    }
                },
            ],
        },
    },
    "Loss": {
        "name": "MultiLoss",
        "loss_config_list": [
            {"CTCLoss": None},
        ],
    },
    "PostProcess": {
        "name": "CTCLabelDecode",
    },
    "Metric": {
        "name": "RecMetric",
        "main_indicator": "acc",
        "ignore_space": False,
    },
    "Optimizer": {
        "name": "AdamW",
        "beta1": 0.9,
        "beta2": 0.999,
        "lr": {
            "name": "Cosine",
            "learning_rate": 0.0008,          # Scaled for batch_size=128
            "warmup_epoch": 3,
        },
        "regularizer": {
            "name": "L2",
            "factor": 3.0e-05,
        },
    },
    "Train": {
        "dataset": {
            "name": "SimpleDataSet",
            "data_dir": str(SYNTH_DIR / "train"),
            "label_file_list": [str(SYNTH_DIR / "rec_gt_train.txt")],
            "transforms": [
                {"DecodeImage": {"img_mode": "BGR", "channel_first": False}},
                {"RecAug": None},
                {"MultiLabelEncode": None},
                {"RecResizeImg": {"image_shape": [3, 48, 320]}},
                {
                    "KeepKeys": {
                        "keep_keys": [
                            "image",
                            "label_ctc",
                            "label_sar",
                            "length",
                            "valid_ratio",
                        ]
                    }
                },
            ],
        },
        "loader": {
            "shuffle": True,
            "batch_size_per_card": 128,      # Maximum GPU saturation (~11 GB VRAM)
            "drop_last": True,
            "num_workers": 4,
        },
    },
    "Eval": {
        "dataset": {
            "name": "SimpleDataSet",
            "data_dir": str(SYNTH_DIR / "val"),
            "label_file_list": [str(SYNTH_DIR / "rec_gt_val.txt")],
            "transforms": [
                {"DecodeImage": {"img_mode": "BGR", "channel_first": False}},
                {"MultiLabelEncode": None},
                {"RecResizeImg": {"image_shape": [3, 48, 320]}},
                {
                    "KeepKeys": {
                        "keep_keys": [
                            "image",
                            "label_ctc",
                            "label_sar",
                            "length",
                            "valid_ratio",
                        ]
                    }
                },
            ],
        },
        "loader": {
            "shuffle": False,
            "batch_size_per_card": 128,
            "drop_last": False,
            "num_workers": 4,
        },
    },
}

# Automatically patch PaddleOCR tools/train.py line 125 to safely allow single-loss MultiHead without IndexError
train_py_file = PADDLE_DIR / "tools" / "train.py"
if train_py_file.exists():
    train_py_code = train_py_file.read_text(encoding="utf-8")
    old_line = 'if list(config["Loss"]["loss_config_list"][1].keys())[0] == "SARLoss":'
    new_line = 'if len(config["Loss"]["loss_config_list"]) > 1 and list(config["Loss"]["loss_config_list"][1].keys())[0] == "SARLoss":'
    if old_line in train_py_code:
        train_py_file.write_text(train_py_code.replace(old_line, new_line), encoding="utf-8")
        print(">> Patched tools/train.py line 125 for single-loss MultiHead support.")

phase1_config_path = WORK_DIR / "phase1_config.yml"
with open(str(phase1_config_path), "w", encoding="utf-8") as f:
    yaml.dump(phase1_config, f, default_flow_style=False, allow_unicode=True)

print(f"Phase 1 Pure CTC config written to: {phase1_config_path}")

# Also check for existing checkpoint to resume from
latest_ckpt = PHASE1_CKPT / "latest.pdparams"
if latest_ckpt.exists():
    print(f"Found existing checkpoint: {latest_ckpt}")
    print("Training will RESUME from this checkpoint.")
else:
    print("No existing checkpoint. Training from pretrained weights.")

# %% Cell 9 — Launch Phase 1 Training
# ============================================================================
# Train on synthetic data. Resumes from checkpoint if Colab reconnects.
# Expected time: 6-10 hours on T4, 2-3 hours on A100.
# ============================================================================
import subprocess

# Check for checkpoint to resume
resume_flag = ""
latest_ckpt = PHASE1_CKPT / "latest.pdparams"
if latest_ckpt.exists():
    resume_model = str(PHASE1_CKPT / "latest")
    resume_flag = f"-o Global.checkpoints={resume_model}"
    print(f"RESUMING from checkpoint: {resume_model}")
else:
    print("Starting fresh training from pretrained weights.")

# Flush GPU memory from any prior interrupted runs
try:
    import paddle
    paddle.device.cuda.empty_cache()
    print(f"GPU memory flushed. Device: {paddle.device.get_device()}")
except Exception:
    pass

# Ensure all PaddleOCR training dependencies from requirements.txt are installed
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "rapidfuzz", "-r", str(PADDLE_DIR / "requirements.txt")], check=False)

# Build training command
train_cmd = (
    f"cd {PADDLE_DIR} && "
    f"python tools/train.py "
    f"-c {phase1_config_path} "
    f"{resume_flag}"
)

print(f"\nLaunching Phase 1 training ...\n{'='*60}")
print(f"Command: {train_cmd}")
print(f"Checkpoints saved to: {PHASE1_CKPT}")
print(f"{'='*60}\n")

result = subprocess.run(
    train_cmd, shell=True,
    cwd=str(PADDLE_DIR),
    env={**os.environ, "PYTHONPATH": str(PADDLE_DIR)},
)

if result.returncode == 0:
    print("\nPhase 1 training COMPLETED successfully!")
else:
    print(f"\nPhase 1 training exited with code {result.returncode}")
    print("Check if best_accuracy checkpoint exists ...")

# Verify checkpoint exists
best_model = PHASE1_CKPT / "best_accuracy.pdparams"
if best_model.exists():
    print(f"Best model saved: {best_model} ({best_model.stat().st_size / 1024 / 1024:.1f} MB)")
else:
    latest = PHASE1_CKPT / "latest.pdparams"
    if latest.exists():
        print(f"Latest checkpoint: {latest} — can resume training later")
    else:
        print("WARNING: No checkpoint found. Training may have failed.")

# %% Cell 10 — Phase 1 Evaluation
# ============================================================================
eval_cmd = (
    f"cd {PADDLE_DIR} && "
    f"python tools/eval.py "
    f"-c {phase1_config_path} "
    f"-o Global.pretrained_model={PHASE1_CKPT}/best_accuracy"
)

print("Running Phase 1 evaluation ...")
subprocess.run(eval_cmd, shell=True, cwd=str(PADDLE_DIR),
               env={**os.environ, "PYTHONPATH": str(PADDLE_DIR)})

# %% Cell 11 — Download & Process HuggingFace Datasets
# ============================================================================
# Download all 17 handwriting datasets and convert to PaddleOCR format.
# ============================================================================
from datasets import load_dataset
from PIL import Image as PILImage
import io

HF_DATASETS = [
    {"name": "Teklia/IAM-line",                                    "lang": "en",  "img_col": "image", "text_col": "text"},
    {"name": "Yose152/iam_handwriting_finevision",                 "lang": "en",  "img_col": "image", "text_col": "text"},
    {"name": "benhachem/KHATT",                                    "lang": "ar",  "img_col": "image", "text_col": "text"},
    {"name": "agomberto/FrenchCensus-handwritten-texts",           "lang": "fr",  "img_col": "image", "text_col": "text"},
    {"name": "HumynLabs/Korean_Handwritten_Notes_Dataset",         "lang": "ko",  "img_col": "image", "text_col": "text"},
    {"name": "XavierG/Japanese-Handwriting-Isolated",              "lang": "ja",  "img_col": "image", "text_col": "text"},
    {"name": "Jykeven/CASIA-HWDB1.1-Subset",                      "lang": "zh",  "img_col": "image", "text_col": "text"},
    {"name": "interfase-ai/ocr-mit-50m",                           "lang": "multi", "img_col": "image", "text_col": "text"},
    {"name": "camus/historia",                                     "lang": "es",  "img_col": "image", "text_col": "text"},
    {"name": "HumynLabs/Handwritten-Computer-Science-Notes-Dataset","lang": "en",  "img_col": "image", "text_col": "text"},
    {"name": "HumynLabs/English-Handwritten-Math-Notes-Dataset",   "lang": "en",  "img_col": "image", "text_col": "text"},
    {"name": "Process-Venue/Marathi_Handwritten",                  "lang": "mr",  "img_col": "image", "text_col": "text"},
    {"name": "lance-format/handwriting-ocr",                       "lang": "bn",  "img_col": "image", "text_col": "text"},
    {"name": "bshb/IAHD",                                         "lang": "ar",  "img_col": "image", "text_col": "text"},
    {"name": "m-g-k/Greek_Handwritten_Characters",                "lang": "el",  "img_col": "image", "text_col": "text"},
    {"name": "s-v/iam_german_sentences",                           "lang": "de",  "img_col": "image", "text_col": "text"},
    {"name": "cdg-studios/vietnamese-handwritten-ocr",             "lang": "vi",  "img_col": "image", "text_col": "text"},
]

# Load the universal dict for character filtering
with open(str(DICT_PATH), "r", encoding="utf-8") as f:
    valid_chars = set(line.strip() for line in f if line.strip())

real_train_labels = []
real_val_labels = []
real_train_dir = REAL_DIR / "train"
real_val_dir = REAL_DIR / "val"

MAX_PER_DATASET = 30000  # Cap per dataset to keep training balanced
MAX_MULTI = 50000        # Larger cap for the multilingual mega-dataset

total_real = 0

for ds_info in HF_DATASETS:
    ds_name = ds_info["name"]
    lang = ds_info["lang"]
    img_col = ds_info["img_col"]
    text_col = ds_info["text_col"]

    cap = MAX_MULTI if lang == "multi" else MAX_PER_DATASET
    print(f"\nProcessing: {ds_name} (lang={lang}) ...")

    try:
        # Try loading the dataset — some may need specific configs
        try:
            ds = load_dataset(ds_name, split="train", streaming=False)
        except Exception:
            try:
                ds = load_dataset(ds_name, split="train", streaming=True)
                # Convert streaming to list (capped)
                ds = list(ds.take(cap))
            except Exception as e2:
                print(f"  SKIP: Failed to load — {e2}")
                continue

        # Auto-detect column names
        if hasattr(ds, "column_names"):
            cols = ds.column_names
        elif isinstance(ds, list) and len(ds) > 0:
            cols = list(ds[0].keys())
        else:
            print(f"  SKIP: Empty dataset")
            continue

        # Find image and text columns
        actual_img_col = None
        actual_text_col = None
        for c in cols:
            cl = c.lower()
            if cl in ("image", "img", "pixel_values", "input_image", "file"):
                actual_img_col = c
            if cl in ("text", "label", "labels", "transcription", "ground_truth",
                       "gt", "sentence", "caption", "ocr_text", "annotation"):
                actual_text_col = c

        if not actual_img_col or not actual_text_col:
            print(f"  SKIP: Columns not found. Available: {cols}")
            continue

        count = 0
        for idx, sample in enumerate(ds):
            if count >= cap:
                break

            try:
                # Extract text
                text = sample[actual_text_col]
                if not isinstance(text, str):
                    text = str(text) if text else ""
                text = text.strip()
                if not text or len(text) < 1:
                    continue

                # Filter: only keep characters in our universal dict
                filtered = "".join(c for c in text if c in valid_chars or c == " ")
                if len(filtered) < max(1, len(text) * 0.5):
                    continue  # Too many unknown chars
                text = filtered.strip()
                if not text:
                    continue

                # Extract image
                img_data = sample[actual_img_col]
                if isinstance(img_data, PILImage.Image):
                    img = img_data.convert("RGB")
                elif isinstance(img_data, dict) and "bytes" in img_data:
                    img = PILImage.open(io.BytesIO(img_data["bytes"])).convert("RGB")
                elif isinstance(img_data, (bytes, bytearray)):
                    img = PILImage.open(io.BytesIO(img_data)).convert("RGB")
                elif isinstance(img_data, str) and os.path.exists(img_data):
                    img = PILImage.open(img_data).convert("RGB")
                else:
                    continue

                # Resize to standard height (48px), preserve aspect ratio
                target_h = 48
                w, h = img.size
                if h <= 0:
                    continue
                new_w = max(32, int(w * target_h / h))
                new_w = min(new_w, 800)
                img = img.resize((new_w, target_h), PILImage.LANCZOS)

                # Save: 90% train, 10% val
                prefix = f"{lang}_{ds_name.split('/')[-1]}"
                fname = f"{prefix}_{idx:06d}.jpg"

                if random.random() < 0.1:
                    img.save(str(real_val_dir / fname), "JPEG", quality=95)
                    real_val_labels.append(f"{fname}\t{text}")
                else:
                    img.save(str(real_train_dir / fname), "JPEG", quality=95)
                    real_train_labels.append(f"{fname}\t{text}")

                count += 1
            except Exception as e:
                continue

        total_real += count
        print(f"  Extracted {count} samples from {ds_name}")

    except Exception as e:
        print(f"  ERROR processing {ds_name}: {e}")

print(f"\n=== HuggingFace Dataset Summary ===")
print(f"Total real samples: {total_real}")
print(f"Train: {len(real_train_labels)}, Val: {len(real_val_labels)}")

# %% Cell 12 — Process Google Drive PDFs
# ============================================================================
# Convert all PDFs from Google Drive OCR_Training/dataset/ subfolders
# into line-level cropped images.
# ============================================================================
import fitz  # PyMuPDF

def process_pdf_folder(pdf_dir, output_dir, label_list, max_pages_per_pdf=20):
    """Convert all PDFs in a folder to line-level cropped images."""
    if not pdf_dir.exists():
        print(f"  Directory not found: {pdf_dir}")
        return 0

    count = 0
    pdf_files = list(pdf_dir.rglob("*.pdf")) + list(pdf_dir.rglob("*.PDF"))
    print(f"  Found {len(pdf_files)} PDFs in {pdf_dir}")

    for pdf_path in tqdm(pdf_files, desc=f"  {pdf_dir.name}", ncols=80, leave=False):
        try:
            doc = fitz.open(str(pdf_path))
            pages_to_process = min(len(doc), max_pages_per_pdf)

            for page_idx in range(pages_to_process):
                page = doc[page_idx]

                # Render at 300 DPI
                pix = page.get_pixmap(dpi=300)
                img_data = pix.tobytes("png")
                full_img = PILImage.open(io.BytesIO(img_data)).convert("RGB")
                full_w, full_h = full_img.size

                # Try to get existing text (for label generation)
                text_blocks = page.get_text("blocks")

                for blk_idx, block in enumerate(text_blocks):
                    if block[6] != 0:  # Skip image blocks
                        continue
                    text = block[4].strip()
                    if not text or len(text) < 2:
                        continue

                    # Filter characters to universal dict
                    filtered = "".join(c for c in text if c in valid_chars or c == " ")
                    if len(filtered) < max(1, len(text) * 0.3):
                        continue
                    text = filtered.strip().replace("\n", " ").replace("\t", " ")
                    if not text:
                        continue

                    # Crop the block region from the full image
                    x0, y0, x1, y1 = block[0], block[1], block[2], block[3]
                    # Scale from PDF coords to pixel coords
                    scale_x = full_w / page.rect.width
                    scale_y = full_h / page.rect.height
                    px0 = max(0, int(x0 * scale_x) - 2)
                    py0 = max(0, int(y0 * scale_y) - 2)
                    px1 = min(full_w, int(x1 * scale_x) + 2)
                    py1 = min(full_h, int(y1 * scale_y) + 2)

                    if px1 - px0 < 10 or py1 - py0 < 5:
                        continue

                    crop = full_img.crop((px0, py0, px1, py1))

                    # Resize to standard height
                    cw, ch = crop.size
                    new_w = max(32, int(cw * 48 / max(ch, 1)))
                    new_w = min(new_w, 800)
                    crop = crop.resize((new_w, 48), PILImage.LANCZOS)

                    # Save
                    fname = f"drive_{pdf_path.stem}_{page_idx}_{blk_idx}.jpg"
                    crop.save(str(output_dir / fname), "JPEG", quality=95)
                    label_list.append(f"{fname}\t{text}")
                    count += 1

            doc.close()
        except Exception as e:
            continue

    return count


# Process all Drive subfolders
drive_count = 0

# Main dataset folder with subfolders
if DRIVE_PDF_DIR.exists():
    subfolders = [d for d in DRIVE_PDF_DIR.iterdir() if d.is_dir()]
    print(f"Drive dataset subfolders: {[d.name for d in subfolders]}")

    for subfolder in subfolders:
        c = process_pdf_folder(subfolder, real_train_dir, real_train_labels)
        drive_count += c
        print(f"  {subfolder.name}: {c} line crops")

# Also process direct PDFs in OCR_Training root
for pdf_file in DRIVE_ROOT.glob("*.pdf"):
    print(f"Processing root PDF: {pdf_file.name}")
    c = process_pdf_folder(pdf_file.parent, real_train_dir, real_train_labels, max_pages_per_pdf=50)
    drive_count += c

# Process New_data folder
if DRIVE_NEWDATA.exists():
    c = process_pdf_folder(DRIVE_NEWDATA, real_train_dir, real_train_labels)
    drive_count += c
    print(f"  New_data: {c} line crops")

print(f"\n=== Drive PDF Processing Summary ===")
print(f"Total line crops from Drive: {drive_count}")

# %% Cell 13 — Merge Phase 2 Data & Write Labels
# ============================================================================
# Combine all real data labels and write final label files.
# ============================================================================
# Write real data label files
real_train_label_file = REAL_DIR / "rec_gt_train.txt"
real_val_label_file = REAL_DIR / "rec_gt_val.txt"

with open(str(real_train_label_file), "w", encoding="utf-8") as f:
    f.write("\n".join(real_train_labels) + "\n")

with open(str(real_val_label_file), "w", encoding="utf-8") as f:
    f.write("\n".join(real_val_labels) + "\n")

print(f"Phase 2 data summary:")
print(f"  Train labels: {len(real_train_labels)} in {real_train_label_file}")
print(f"  Val labels:   {len(real_val_labels)} in {real_val_label_file}")

# Sanity check: verify all image files exist
missing = 0
for label_line in real_train_labels[:1000]:  # Check first 1000
    parts = label_line.split("\t", 1)
    if len(parts) == 2:
        img_path = real_train_dir / parts[0]
        if not img_path.exists():
            missing += 1

if missing > 0:
    print(f"  WARNING: {missing}/1000 sampled train images missing!")
else:
    print(f"  Image integrity check PASSED (1000 samples).")

# %% Cell 14 — Phase 2 Training Config
# ============================================================================
# Fine-tuning config: lower learning rate, uses Phase 1 best model.
# ============================================================================
# Phase 2 config: fine-tune on real handwriting data
phase2_config = {**phase1_config}  # Deep copy base config
phase2_config["Global"] = {**phase1_config["Global"]}
phase2_config["Optimizer"] = {**phase1_config["Optimizer"]}
phase2_config["Train"] = {**phase1_config["Train"]}
phase2_config["Eval"] = {**phase1_config["Eval"]}

# Override for Phase 2
phase2_config["Global"]["epoch_num"] = 20
phase2_config["Global"]["save_model_dir"] = str(PHASE2_CKPT)
phase2_config["Global"]["save_epoch_step"] = 1
phase2_config["Global"]["save_res_path"] = str(WORK_DIR / "phase2_predicts.txt")

# Use Phase 1 best model as pretrained
phase1_best = PHASE1_CKPT / "best_accuracy"
if (PHASE1_CKPT / "best_accuracy.pdparams").exists():
    phase2_config["Global"]["pretrained_model"] = str(phase1_best)
    print(f"Phase 2 will fine-tune from Phase 1 best: {phase1_best}")
else:
    phase2_config["Global"]["pretrained_model"] = str(PHASE1_CKPT / "latest")
    print(f"Phase 1 best not found, using latest checkpoint")

phase2_config["Global"]["checkpoints"] = None  # Fresh start from pretrained

# Lower learning rate for fine-tuning (10x lower)
phase2_config["Optimizer"]["lr"] = {
    "name": "Cosine",
    "learning_rate": 0.00005,
    "warmup_epoch": 1,
}

# Point to real data
phase2_config["Train"]["dataset"] = {
    "name": "SimpleDataSet",
    "data_dir": str(real_train_dir),
    "label_file_list": [str(real_train_label_file)],
    "transforms": [
        {"DecodeImage": {"img_mode": "BGR", "channel_first": False}},
        {"RecAug": None},
        {"MultiLabelEncode": None},
        {"RecResizeImg": {"image_shape": [3, 48, 320]}},
        {"KeepKeys": {"keep_keys": ["image", "label_ctc", "label_sar", "length", "valid_ratio"]}},
    ],
}
phase2_config["Train"]["loader"] = {
    "shuffle": True,
    "batch_size_per_card": 64,  # Smaller batch for diverse real data
    "drop_last": True,
    "num_workers": 4,
}

phase2_config["Eval"]["dataset"] = {
    "name": "SimpleDataSet",
    "data_dir": str(real_val_dir),
    "label_file_list": [str(real_val_label_file)],
    "transforms": [
        {"DecodeImage": {"img_mode": "BGR", "channel_first": False}},
        {"MultiLabelEncode": None},
        {"RecResizeImg": {"image_shape": [3, 48, 320]}},
        {"KeepKeys": {"keep_keys": ["image", "label_ctc", "label_sar", "length", "valid_ratio"]}},
    ],
}
phase2_config["Eval"]["loader"] = {
    "shuffle": False,
    "batch_size_per_card": 128,
    "drop_last": False,
    "num_workers": 4,
}

phase2_config_path = WORK_DIR / "phase2_config.yml"
with open(str(phase2_config_path), "w", encoding="utf-8") as f:
    yaml.dump(phase2_config, f, default_flow_style=False, allow_unicode=True)

print(f"Phase 2 config written to: {phase2_config_path}")

# %% Cell 15 — Launch Phase 2 Training
# ============================================================================
# Fine-tune on real handwriting data. Resumes from checkpoint if reconnecting.
# Expected: 2-4 hours on T4.
# ============================================================================
# Check for checkpoint to resume
resume_flag_p2 = ""
latest_ckpt_p2 = PHASE2_CKPT / "latest.pdparams"
if latest_ckpt_p2.exists():
    resume_model_p2 = str(PHASE2_CKPT / "latest")
    resume_flag_p2 = f"-o Global.checkpoints={resume_model_p2}"
    print(f"RESUMING Phase 2 from checkpoint: {resume_model_p2}")
else:
    print("Starting Phase 2 fine-tuning from Phase 1 best model.")

train_cmd_p2 = (
    f"cd {PADDLE_DIR} && "
    f"python tools/train.py "
    f"-c {phase2_config_path} "
    f"{resume_flag_p2}"
)

print(f"\nLaunching Phase 2 training ...\n{'='*60}")
result_p2 = subprocess.run(
    train_cmd_p2, shell=True,
    cwd=str(PADDLE_DIR),
    env={**os.environ, "PYTHONPATH": str(PADDLE_DIR)},
)

if result_p2.returncode == 0:
    print("\nPhase 2 training COMPLETED successfully!")
else:
    print(f"\nPhase 2 training exited with code {result_p2.returncode}")

best_model_p2 = PHASE2_CKPT / "best_accuracy.pdparams"
if best_model_p2.exists():
    print(f"Best model: {best_model_p2} ({best_model_p2.stat().st_size / 1024 / 1024:.1f} MB)")
else:
    print("WARNING: best_accuracy checkpoint not found.")

# %% Cell 16 — Phase 2 Evaluation
# ============================================================================
eval_cmd_p2 = (
    f"cd {PADDLE_DIR} && "
    f"python tools/eval.py "
    f"-c {phase2_config_path} "
    f"-o Global.pretrained_model={PHASE2_CKPT}/best_accuracy"
)

print("Running Phase 2 evaluation ...")
subprocess.run(eval_cmd_p2, shell=True, cwd=str(PADDLE_DIR),
               env={**os.environ, "PYTHONPATH": str(PADDLE_DIR)})

# %% Cell 17 — Export Paddle Model to ONNX
# ============================================================================
# Step 1: Export Paddle inference model
# Step 2: Convert to ONNX using paddle2onnx
# ============================================================================
INFERENCE_DIR = WORK_DIR / "inference_model"
ONNX_DIR = WORK_DIR / "onnx_models"
INFERENCE_DIR.mkdir(parents=True, exist_ok=True)
ONNX_DIR.mkdir(parents=True, exist_ok=True)

# Determine best model path
best_model_path = str(PHASE2_CKPT / "best_accuracy")
if not (PHASE2_CKPT / "best_accuracy.pdparams").exists():
    best_model_path = str(PHASE2_CKPT / "latest")
    print(f"Using latest checkpoint: {best_model_path}")
else:
    print(f"Using best accuracy model: {best_model_path}")

# Step 1: Export inference model
export_cmd = (
    f"cd {PADDLE_DIR} && "
    f"python tools/export_model.py "
    f"-c {phase2_config_path} "
    f"-o Global.pretrained_model={best_model_path} "
    f"Global.save_inference_dir={INFERENCE_DIR}"
)

print("Step 1: Exporting Paddle inference model ...")
subprocess.run(export_cmd, shell=True, cwd=str(PADDLE_DIR),
               env={**os.environ, "PYTHONPATH": str(PADDLE_DIR)}, check=True)

# Verify exported files
pdmodel = INFERENCE_DIR / "inference.pdmodel"
pdiparams = INFERENCE_DIR / "inference.pdiparams"
assert pdmodel.exists(), "inference.pdmodel not found!"
assert pdiparams.exists(), "inference.pdiparams not found!"
print(f"  inference.pdmodel:   {pdmodel.stat().st_size / 1024 / 1024:.1f} MB")
print(f"  inference.pdiparams: {pdiparams.stat().st_size / 1024 / 1024:.1f} MB")

# Step 2: Convert to ONNX
onnx_fp32_path = ONNX_DIR / "universal_rec_fp32.onnx"
convert_cmd = (
    f"paddle2onnx "
    f"--model_dir {INFERENCE_DIR} "
    f"--model_filename inference.pdmodel "
    f"--params_filename inference.pdiparams "
    f"--save_file {onnx_fp32_path} "
    f"--opset_version 11 "
    f"--enable_onnx_checker True"
)

print("\nStep 2: Converting to ONNX (FP32) ...")
subprocess.run(convert_cmd, shell=True, check=True)

assert onnx_fp32_path.exists(), "FP32 ONNX not created!"
fp32_size = onnx_fp32_path.stat().st_size / (1024 * 1024)
print(f"  FP32 ONNX: {onnx_fp32_path} ({fp32_size:.1f} MB)")

# Quick validation: load and check ONNX model
import onnx
model = onnx.load(str(onnx_fp32_path))
onnx.checker.check_model(model)
print(f"  ONNX model validated successfully.")
print(f"  Input:  {[i.name for i in model.graph.input]}")
print(f"  Output: {[o.name for o in model.graph.output]}")

# %% Cell 18 — FP16 Quantization (Server Deployment)
# ============================================================================
# Convert FP32 ONNX to FP16 for server deployment (~50% size reduction).
# ============================================================================
from onnxconverter_common import float16

print("Converting FP32 -> FP16 ...")
model_fp32 = onnx.load(str(onnx_fp32_path))
model_fp16 = float16.convert_float_model_to_float16(
    model_fp32,
    keep_io_types=True,  # Keep input/output as float32 for compatibility
)

onnx_fp16_path = ONNX_DIR / "universal_rec_fp16.onnx"
onnx.save(model_fp16, str(onnx_fp16_path))

fp16_size = onnx_fp16_path.stat().st_size / (1024 * 1024)
print(f"  FP16 ONNX: {onnx_fp16_path} ({fp16_size:.1f} MB)")
print(f"  Size reduction: {fp32_size:.1f} MB -> {fp16_size:.1f} MB ({(1 - fp16_size/fp32_size)*100:.0f}% smaller)")

# Validate FP16 model
onnx.checker.check_model(onnx.load(str(onnx_fp16_path)))
print("  FP16 model validated.")

# %% Cell 19 — INT8 Static Quantization (Browser Deployment)
# ============================================================================
# Static quantization with Entropy calibration for maximum accuracy retention.
# Uses ~500 calibration images per script for representative coverage.
# ============================================================================
import onnxruntime as ort
from onnxruntime.quantization import (
    quantize_static,
    CalibrationDataReader,
    QuantFormat,
    QuantType,
)

try:
    from onnxruntime.quantization import CalibrationMethod
except ImportError:
    from onnxruntime.quantization.calibrate import CalibrationMethod

import cv2


class OCRCalibrationReader(CalibrationDataReader):
    """Reads calibration images for INT8 quantization."""

    def __init__(self, image_dirs, max_samples=5000, height=48, width=320):
        self.height = height
        self.width = width
        self.data = []
        self.idx = 0

        # Collect image paths from all directories
        image_paths = []
        for d in image_dirs:
            d = Path(d)
            if d.exists():
                image_paths.extend(sorted(d.glob("*.jpg"))[:max_samples // len(image_dirs)])

        random.shuffle(image_paths)
        image_paths = image_paths[:max_samples]

        print(f"  Loading {len(image_paths)} calibration images ...")
        for img_path in tqdm(image_paths, desc="  Calibration", ncols=80, leave=False):
            try:
                img = cv2.imread(str(img_path))
                if img is None:
                    continue
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

                # Resize to model input size
                h, w = img.shape[:2]
                ratio = self.height / h
                new_w = min(int(w * ratio), self.width)
                img = cv2.resize(img, (new_w, self.height))

                # Pad to fixed width
                padded = np.ones((self.height, self.width, 3), dtype=np.float32) * 255.0
                padded[:, :new_w, :] = img

                # Normalize to [0, 1] and transpose to NCHW
                padded = padded.astype(np.float32) / 255.0
                padded = padded.transpose(2, 0, 1)  # HWC -> CHW
                padded = np.expand_dims(padded, axis=0)  # Add batch dim

                self.data.append({"x": padded})
            except Exception:
                continue

        print(f"  Loaded {len(self.data)} calibration samples.")

    def get_next(self):
        if self.idx >= len(self.data):
            return None
        result = self.data[self.idx]
        self.idx += 1
        return result

    def rewind(self):
        self.idx = 0


# Determine input name from FP32 model
session = ort.InferenceSession(str(onnx_fp32_path))
input_name = session.get_inputs()[0].name
print(f"  Model input name: {input_name}")
del session

# Update calibration reader to use correct input name
class CalibratedOCRReader(OCRCalibrationReader):
    def get_next(self):
        if self.idx >= len(self.data):
            return None
        sample = self.data[self.idx]
        self.idx += 1
        return {input_name: list(sample.values())[0]}

# Create calibration reader with images from both synthetic and real data
calib_reader = CalibratedOCRReader(
    image_dirs=[
        SYNTH_DIR / "val",
        REAL_DIR / "val",
    ],
    max_samples=5000,
)

# Quantize
onnx_int8_path = ONNX_DIR / "universal_rec_int8.onnx"

print("\nRunning INT8 static quantization with Entropy calibration ...")
print("  This may take 10-30 minutes depending on calibration set size.")

# Pre-process model for quantization (required by onnxruntime)
from onnxruntime.quantization import QuantType
preprocess_path = ONNX_DIR / "universal_rec_fp32_preprocessed.onnx"

try:
    from onnxruntime.quantization import preprocess as quant_preprocess
    quant_preprocess.quant_pre_process(
        str(onnx_fp32_path),
        str(preprocess_path),
    )
    source_model = str(preprocess_path)
except Exception as e:
    print(f"  Pre-processing skipped: {e}")
    source_model = str(onnx_fp32_path)

quantize_static(
    model_input=source_model,
    model_output=str(onnx_int8_path),
    calibration_data_reader=calib_reader,
    quant_format=QuantFormat.QDQ,
    per_channel=True,
    weight_type=QuantType.QInt8,
    activation_type=QuantType.QUInt8,
)

int8_size = onnx_int8_path.stat().st_size / (1024 * 1024)
print(f"\n  INT8 ONNX: {onnx_int8_path} ({int8_size:.1f} MB)")
print(f"  Size reduction: {fp32_size:.1f} MB -> {int8_size:.1f} MB ({(1 - int8_size/fp32_size)*100:.0f}% smaller)")

# Clean up preprocessed model
preprocess_path.unlink(missing_ok=True)

# %% Cell 20 — Cross-Model Accuracy Validation
# ============================================================================
# Compare FP32, FP16, and INT8 models on the same test images.
# ============================================================================
import time

def run_inference(onnx_path, image_paths, dict_chars, height=48, width=320):
    """Run OCR inference on a list of images and return predicted texts + timings."""
    session = ort.InferenceSession(str(onnx_path), providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
    inp_name = session.get_inputs()[0].name
    out_name = session.get_outputs()[0].name

    results = []
    total_time = 0

    for img_path in image_paths:
        img = cv2.imread(str(img_path))
        if img is None:
            results.append("")
            continue
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Preprocess
        h, w_orig = img.shape[:2]
        ratio = height / h
        new_w = min(int(w_orig * ratio), width)
        img = cv2.resize(img, (new_w, height))
        padded = np.ones((height, width, 3), dtype=np.float32) * 255.0
        padded[:, :new_w, :] = img
        padded = (padded / 255.0).transpose(2, 0, 1)[np.newaxis, ...]

        # Inference
        t0 = time.time()
        output = session.run([out_name], {inp_name: padded.astype(np.float32)})[0]
        total_time += time.time() - t0

        # CTC decode
        pred_idx = output.argmax(axis=2)[0]
        decoded = []
        prev = -1
        for idx in pred_idx:
            if idx != 0 and idx != prev:  # Skip blank (0) and repeated
                if 0 < idx <= len(dict_chars):
                    decoded.append(dict_chars[idx - 1])
            prev = idx
        results.append("".join(decoded))

    return results, total_time


# Load dict chars
with open(str(DICT_PATH), "r", encoding="utf-8") as f:
    eval_dict_chars = [line.strip() for line in f if line.strip()]

# Collect test images (use val set)
test_images = sorted(list((SYNTH_DIR / "val").glob("*.jpg"))[:500] +
                      list((REAL_DIR / "val").glob("*.jpg"))[:500])
print(f"Test images: {len(test_images)}")

# Load ground truth labels for test images
gt_labels = {}
for label_file in [SYNTH_DIR / "rec_gt_val.txt", REAL_DIR / "rec_gt_val.txt"]:
    if label_file.exists():
        with open(str(label_file), "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split("\t", 1)
                if len(parts) == 2:
                    gt_labels[parts[0]] = parts[1]

# Run inference on all three models
models = {
    "FP32": onnx_fp32_path,
    "FP16": onnx_fp16_path,
    "INT8": onnx_int8_path,
}

for model_name, model_path in models.items():
    if not model_path.exists():
        print(f"  SKIP {model_name}: model not found")
        continue

    print(f"\nEvaluating {model_name} ({model_path.stat().st_size / 1024 / 1024:.1f} MB) ...")
    predictions, elapsed = run_inference(model_path, test_images, eval_dict_chars)

    # Calculate accuracy (exact match and character-level)
    exact_match = 0
    total_chars = 0
    correct_chars = 0
    evaluated = 0

    for img_path, pred in zip(test_images, predictions):
        fname = img_path.name
        gt = gt_labels.get(fname, "")
        if not gt:
            continue
        evaluated += 1
        if pred == gt:
            exact_match += 1
        # Character-level accuracy
        for i in range(min(len(pred), len(gt))):
            total_chars += 1
            if pred[i] == gt[i]:
                correct_chars += 1
        total_chars += abs(len(pred) - len(gt))

    exact_acc = (exact_match / max(evaluated, 1)) * 100
    char_acc = (correct_chars / max(total_chars, 1)) * 100
    fps = len(test_images) / max(elapsed, 0.001)

    print(f"  Exact match accuracy:  {exact_acc:.2f}% ({exact_match}/{evaluated})")
    print(f"  Character accuracy:    {char_acc:.2f}%")
    print(f"  Throughput:            {fps:.1f} images/sec")
    print(f"  Total inference time:  {elapsed:.2f}s")

# Accuracy degradation check
print(f"\n{'='*50}")
print("If INT8 accuracy is within 0.5% of FP32, quantization is successful.")

# %% Cell 21 — Save Everything to Google Drive
# ============================================================================
# Copy all models, dictionary, and training artifacts to Drive for download.
# ============================================================================
import shutil

# Save models
for model_file in ONNX_DIR.glob("*.onnx"):
    dest = MODEL_OUTPUT_DIR / model_file.name
    shutil.copy2(str(model_file), str(dest))
    print(f"Saved: {dest} ({dest.stat().st_size / 1024 / 1024:.1f} MB)")

# Dictionary is already on Drive (saved in Cell 3)
print(f"Dict:  {DICT_PATH} ({DICT_PATH.stat().st_size / 1024:.0f} KB)")

# Save training configs for reference
for config_file in WORK_DIR.glob("*_config.yml"):
    shutil.copy2(str(config_file), str(MODEL_OUTPUT_DIR / config_file.name))

# Summary
print(f"\n{'='*60}")
print(f"=== TRAINING COMPLETE ===")
print(f"{'='*60}")
print(f"\nAll models saved to: {MODEL_OUTPUT_DIR}")
print(f"\nFiles ready for download:")

for f in sorted(MODEL_OUTPUT_DIR.iterdir()):
    size = f.stat().st_size / (1024 * 1024)
    print(f"  {f.name:<45} {size:>8.2f} MB")

print(f"\n--- Deployment Guide ---")
print(f"SERVER:  Use universal_rec_fp16.onnx  (replace all 5 language readers)")
print(f"BROWSER: Use universal_rec_int8.onnx  (replace both ONNX models)")
print(f"DICT:    Use universal_dict.txt       (replace multilingual_dict.txt)")
print(f"\nDownload from Google Drive: {MODEL_OUTPUT_DIR}")
