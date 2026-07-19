import sys
import subprocess

pythons = [
    r"C:\Python314\python.exe",
    r"C:\Users\Tanvir Alam\AppData\Local\Programs\Python\Python311\python.exe",
    r"C:\Users\Tanvir Alam\AppData\Local\Python\bin\python.exe",
    r"python"
]

report = []
for py in pythons:
    cmd = [py, "-c", "import torch; print(torch.__version__, torch.cuda.is_available())"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        report.append(f"Interpreter: {py}")
        report.append(f"Exit Code: {res.returncode}")
        report.append(f"Stdout: {res.stdout.strip()}")
        report.append(f"Stderr: {res.stderr.strip()}")
    except Exception as e:
        report.append(f"Interpreter: {py} -> Failed to run: {str(e)}")
    report.append("-" * 40)

with open("scratch/cuda_report.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(report))
print("CUDA report written successfully to scratch/cuda_report.txt")
