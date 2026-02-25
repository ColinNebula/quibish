@echo off
REM Windows Batch Script to Start Quibish Application
REM This is an alternative to the PowerShell script for systems with restricted execution policy

echo.
echo 🚀 Starting Quibish Application...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

REM Check Backend Dependencies
echo 📦 Checking backend dependencies...
cd /d "%~dp0backend"
if not exist "node_modules" (
    echo 📥 Installing backend dependencies...
    call npm install
    echo ✅ Backend dependencies installed
) else (
    echo ✅ Backend dependencies already installed
)
echo.
Check Frontend Dependencies
echo 📦 Checking frontend dependencies...
cd /d "%~dp0"
if not exist "node_modules" (
    echo 📥 Installing frontend dependencies...
    call npm install
    echo ✅ Frontend dependencies installed
) else (
    echo ✅ Frontend dependencies already installed
)
echo.

REM Start Frontend Server
echo 🎨 Starting Frontend Server...
start "Quibish Frontend" cmd /k "cd /d %~dp0 && echo 🎨 Quibish Frontend Server && echo ========================== && echo. && 
start "Quibish Backend" cmd /k "cd /d %~dp0backend && echo 🚀 Quibish Backend Server && echo ========================= && echo. && node server.js"
cd /d "%~dp0"
echo ✅ Backend server started
echo.

REM Wait a few seconds for backend to initialize
timeout /t 5 /nobreak >nul

REM Start Frontend Server
echo 🎨 Starting Frontend Server...
start "Quibish Frontend" /MIN cmd /k "npm start"
echo ✅ Frontend server started
echo.

REM Wait for frontend to be ready
echo ⏳ Waiting for services to initialize...
timeout /t 10 /nobreak >nul

REM Open browser
echo 🌐 Opening application in browser...
start http://localhost:3000/quibish

echo.
echo ✨ Startup Complete!
echo.
echo 📊 Service Status:
echo    🔧 Backend:  http://localhost:5001
echo    🎨 Frontend: http://localhost:3000/quibish
echo.
echo 💡 Check the separate windows if you encounter any errors
echo.
pause
