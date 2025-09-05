@echo off
REM Check status of Quibish servers
echo Checking Quibish Application status...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0start-servers.ps1" -Status

echo.
pause