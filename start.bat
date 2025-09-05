@echo off
REM Quick start script for Quibish app
echo Starting Quibish Application...
echo.

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell is required but not found.
    pause
    exit /b 1
)

REM Run the PowerShell server manager
powershell -ExecutionPolicy Bypass -File "%~dp0start-servers.ps1"

echo.
echo Servers started! Check the PowerShell windows for server output.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:5001
echo.
pause