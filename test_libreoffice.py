import subprocess
from pathlib import Path
import os
import shutil

output_dir = Path(os.getcwd()) / "backend" / "output"
input_file = Path(os.getcwd()) / "real_test.docx"

cmd = [
    "libreoffice",
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    str(output_dir),
    str(input_file)
]

result = subprocess.run(
    cmd,
    capture_output=True,
    text=True,
    timeout=120
)
print(result.returncode)
print(result.stdout)
print(result.stderr)
