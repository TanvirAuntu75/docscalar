@echo off
echo ===================================================
echo DocForge — Starting Frontend and Backend Services
echo ===================================================

:: Start Backend in a new command window
echo Launching Backend API Server...
start "DocForge Backend Server" cmd /k "run_backend.bat"

:: Start Frontend in a new command window
echo Launching Frontend Development Server...
start "DocForge Frontend Server" cmd /k "npm run dev"

echo Services have been launched in separate windows.
echo Frontend: http://localhost:5173 (usually)
echo Backend:  http://127.0.0.1:8000
echo ===================================================
