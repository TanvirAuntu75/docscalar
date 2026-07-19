@echo off
echo Starting DocForge API Server with Python 3.11 virtual environment...
if not exist .venv (
    echo [ERROR] Virtual environment not found. Please run environment setup first.
    exit /b 1
)
call .venv\Scripts\activate
python -m backend.main
