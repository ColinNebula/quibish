@echo off
REM Stop all Quibish servers
echo Stopping Quibish Application servers...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0start-servers.ps1" -Stop

echo.
echo All servers stopped.
pause