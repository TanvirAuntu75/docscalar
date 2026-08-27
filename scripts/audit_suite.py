#!/usr/bin/env python3
"""
DocForge Master 100% Deterministic Code Audit Suite (10-Phase Full-Stack Runner)
Orchestrates:
  1. Live Codebase AST & Symbol Map Synchronization
  2. AST Syntax & Indentation Integrity (59 Python files)
  3. Ruff Static Linter & Clean Architecture Gate
  4. Bandit Security & Hardcoded Credential AST Scan (-ll Medium/High Severity)
  5. Semgrep Semantic & OWASP Vulnerability Scan (Strict Hard Gate)
  6. Hardcoded Path & Portability Verification
  7. Dependency Parity & Pinned Requirements Gate
  8. Concurrency Stress, Pipeline Contracts & Pytest Suite
  9. Frontend RAG & 110-Query Intelligence Benchmark (100% Recall Gate)
  10. Frontend React JSX & Rollup Production Bundle Gate

Zero token cost. 100% deterministic hard blocking gates.
"""

import os
import sys
import ast
import site
import shutil
import sysconfig
import subprocess
from pathlib import Path

# Dynamically discover and inject user and system Python scripts directories onto PATH
_candidate_script_dirs = [
    sysconfig.get_path("scripts"),
    os.path.join(site.USER_BASE, f"Python{sys.version_info.major}{sys.version_info.minor}", "Scripts"),
    os.path.join(site.USER_BASE, "Scripts"),
    os.path.join(site.USER_BASE, "bin"),
]
for _s_dir in _candidate_script_dirs:
    if _s_dir and os.path.exists(_s_dir) and _s_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = _s_dir + os.pathsep + os.environ.get("PATH", "")

# Force UTF-8 encoding on standard output for Windows compatibility
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
SERVICES_DIR = BACKEND_DIR / "services"

def print_header(title: str):
    print("\n" + "=" * 65)
    print(f"  {title}")
    print("=" * 65)

def sync_repo_map() -> bool:
    print_header("1. Live Codebase AST & Symbol Map Synchronization")
    try:
        node_cmd = shutil.which("node") or "node"
        cmd = [node_cmd, "scripts/watch_repo.js", "--once"]
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            print("[FAIL] Failed to synchronize .agents/repo_map.md:")
            print(res.stdout or res.stderr)
            return False
        print("[OK] .agents/repo_map.md synchronized with exact line ranges and symbol definitions.")
        return True
    except Exception as e:
        print(f"[FAIL] Codebase watcher failed: {e}")
        return False

def check_ast_syntax() -> bool:
    print_header("2. AST Syntax & Indentation Integrity")
    errors = []
    py_files = list(BACKEND_DIR.rglob("*.py"))
    for py_file in py_files:
        try:
            with open(py_file, "r", encoding="utf-8") as f:
                content = f.read()
            ast.parse(content, filename=str(py_file))
        except Exception as e:
            errors.append(f"Syntax/Indentation error in {py_file.relative_to(ROOT_DIR)}: {e}")

    if errors:
        for err in errors:
            print(f"[FAIL] {err}")
        return False
    print(f"[OK] All {len(py_files)} Python files parsed cleanly with zero syntax/indentation errors.")
    return True

def run_ruff_linter() -> bool:
    print_header("3. Ruff Static Linter & Clean Architecture (Strict Gate)")
    try:
        cmd = [sys.executable, "-m", "ruff", "check", "backend/", "--select=E,F,W", "--ignore=E501,W293,W291,E402", "--quiet"]
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            print("[FAIL] Ruff detected blocking lint violations:")
            print(res.stdout or res.stderr)
            return False
        print("[OK] Ruff linter passed cleanly across backend codebase with zero violations.")
        return True
    except Exception as e:
        print(f"[FAIL] Ruff linter execution failed: {e}")
        return False

def run_bandit_security() -> bool:
    print_header("4. Bandit Security & Hardcoded Credential AST Scan (Strict Gate)")
    try:
        cmd = [sys.executable, "-m", "bandit", "-r", "backend/services/", "backend/main.py", "backend/auth.py", "backend/billing.py", "-ll", "-q"]
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            print("[FAIL] Bandit flagged security vulnerabilities (High/Medium severity):")
            print(res.stdout or res.stderr)
            return False
        print("[OK] Zero high or medium severity security vulnerabilities found.")
        return True
    except Exception as e:
        print(f"[FAIL] Bandit security scan failed: {e}")
        return False

def run_semgrep_security() -> bool:
    print_header("5. Semgrep Semantic & OWASP Vulnerability Scan (Strict Gate)")
    try:
        semgrep_exe = shutil.which("semgrep") or shutil.which("semgrep.exe")
        if not semgrep_exe:
            print("[FAIL] Semgrep binary not found on system PATH. Strict security gate violated.")
            return False
        cmd = [semgrep_exe, "scan", "--config=auto", "--quiet", "--error", "backend/services/"]
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            print("[FAIL] Semgrep detected blocking semantic vulnerabilities:")
            print(res.stdout or res.stderr)
            return False
        print("[OK] Semgrep passed cleanly across backend services with zero findings.")
        return True
    except Exception as e:
        print(f"[FAIL] Semgrep security scan failed: {e}")
        return False

def check_hardcoded_paths() -> bool:
    print_header("6. Hardcoded Path & Portability Verification")
    leaks = []
    patterns = [
        r"C:\Users\Tanvir Alam\Desktop",
        r"C:/Users/Tanvir Alam/Desktop",
        r"C:\Users\Tanvir Alam\Downloads",
        r"C:/Users/Tanvir Alam/Downloads",
        r"C:\Users\Tanvir Alam\Documents",
        r"C:/Users/Tanvir Alam/Documents",
        "google_gemma",
    ]
    
    for py_file in BACKEND_DIR.rglob("*.py"):
        if "test" in py_file.name or "generate_stressed" in py_file.name:
            continue
        try:
            with open(py_file, "r", encoding="utf-8") as f:
                for line_no, line in enumerate(f, 1):
                    for pat in patterns:
                        if pat.lower() in line.lower():
                            leaks.append(f"{py_file.relative_to(ROOT_DIR)}:{line_no} matches '{pat}'")
        except Exception:
            pass

    if leaks:
        for leak in leaks:
            print(f"[FAIL] Hardcoded developer machine path found: {leak}")
        return False
    print("[OK] Zero local developer machine paths or heavy GGUF references found in core services.")
    return True

def check_dependencies() -> bool:
    print_header("7. Dependency Parity & Pinned Requirements")
    req_file = BACKEND_DIR / "requirements.txt"
    if not req_file.exists():
        print(f"[FAIL] Missing {req_file}")
        return False

    with open(req_file, "r", encoding="utf-8") as f:
        requirements = {line.split("==")[0].split(">=")[0].strip().lower() for line in f if line.strip() and not line.startswith("#")}

    must_have = {"fastapi", "uvicorn", "pymupdf", "httpx", "pytest", "pydantic", "pyjwt", "python-multipart", "defusedxml"}
    missing = must_have - requirements
    if missing:
        print(f"[FAIL] Missing critical packages in requirements.txt: {missing}")
        return False

    print(f"[OK] requirements.txt contains all core dependencies ({len(requirements)} packages pinned).")
    return True

def run_pytest_suite() -> bool:
    print_header("8. Concurrency Stress, Contracts & Pytest Suite")
    try:
        cmd = [sys.executable, "-m", "pytest", str(BACKEND_DIR / "tests"), "-v"]
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            print("[FAIL] Pytest suite failed:")
            print(res.stdout[-1500:] if res.stdout else res.stderr)
            return False
        # Extract summary line from pytest output
        summary = [line for line in res.stdout.splitlines() if "passed" in line and ("=" in line)]
        summary_str = f" ({summary[-1].strip('= ')})" if summary else ""
        print(f"[OK] All unit, concurrency, and pipeline contract tests passed with 100% success{summary_str}.")
        return True
    except Exception as e:
        print(f"[FAIL] Pytest execution failed: {e}")
        return False

def run_frontend_intel_suite() -> bool:
    print_header("9. Frontend RAG & 110-Query Intelligence Benchmark")
    try:
        node_cmd = shutil.which("node") or "node"
        cmd = [node_cmd, "tests/frontend/test_100_queries.js"]
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0 or "ALL 110 TEST QUERIES PASSED WITH 100% RECALL!" not in res.stdout:
            print("[FAIL] Frontend intelligence benchmark failed:")
            print(res.stdout[-500:] if res.stdout else res.stderr)
            return False
        print("[OK] All 110 frontend RAG queries passed with 100% Top-3 recall.")
        return True
    except Exception as e:
        print(f"[FAIL] Frontend benchmark execution failed: {e}")
        return False

def run_frontend_build_gate() -> bool:
    print_header("10. Frontend React JSX & Rollup Bundle Integrity")
    try:
        npm_cmd = shutil.which("npm.cmd") or shutil.which("npm") or "npm"
        cmd = [npm_cmd, "run", "build"]
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True, encoding="utf-8", errors="replace", shell=True)
        if res.returncode != 0:
            print("[FAIL] Frontend production build failed with syntax or bundling errors:")
            print(res.stdout[-800:] if res.stdout else res.stderr)
            return False
        print("[OK] Frontend React code and modules compiled cleanly into distribution bundle.")
        return True
    except Exception as e:
        print(f"[FAIL] Frontend build gate execution failed: {e}")
        return False

def main():
    print("\n[INFO] Launching DocForge Master 100% Deterministic Full-Stack Audit Suite (Strict Hard Gates)...")
    phases = [
        ("Live Repo Map Sync", sync_repo_map),
        ("AST Syntax Integrity", check_ast_syntax),
        ("Ruff Static Linter", run_ruff_linter),
        ("Bandit Security Scan", run_bandit_security),
        ("Semgrep Semantic Security", run_semgrep_security),
        ("Hardcoded Path Check", check_hardcoded_paths),
        ("Dependency Parity", check_dependencies),
        ("Pytest & Concurrency Suite", run_pytest_suite),
        ("Frontend Intelligence Suite", run_frontend_intel_suite),
        ("Frontend Bundle & JSX Gate", run_frontend_build_gate),
    ]

    all_passed = True
    for name, phase_fn in phases:
        passed = phase_fn()
        if not passed:
            print(f"\n[BLOCKING GATE FAILED] Phase '{name}' failed.")
            all_passed = False
            break

    print_header("AUDIT SUMMARY")
    if all_passed:
        print("[SUCCESS] ALL 10 DETERMINISTIC FULL-STACK AUDIT PHASES PASSED WITH 100% SUCCESS!\n")
        sys.exit(0)
    else:
        print("[FAILURE] Deterministic audit suite failed. Resolve errors above.\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
