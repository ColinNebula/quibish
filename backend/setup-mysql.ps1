# MySQL Setup Script for Quibish
# Run this script as Administrator

Write-Host "🔧 MySQL Setup for Quibish" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green

# MySQL paths
$mysqlBin = "C:\Program Files\MySQL\MySQL Server 8.4\bin"
$mysqlData = "C:\ProgramData\MySQL\MySQL Server 8.4\Data"

# Check if MySQL is installed
if (-not (Test-Path $mysqlBin)) {
    Write-Host "❌ MySQL Server 8.4 not found at expected location" -ForegroundColor Red
    Write-Host "Please install MySQL Server first" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ MySQL Server 8.4 found" -ForegroundColor Green

# Create data directory if it doesn't exist
if (-not (Test-Path $mysqlData)) {
    Write-Host "📁 Creating data directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $mysqlData -Force | Out-Null
}

# Initialize MySQL data directory
Write-Host "🔄 Initializing MySQL data directory..." -ForegroundColor Yellow
$initCommand = "& '$mysqlBin\mysqld.exe' --initialize-insecure --datadir='$mysqlData'"
try {
    Invoke-Expression $initCommand
    Write-Host "✅ MySQL data directory initialized" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Data directory may already be initialized" -ForegroundColor Yellow
}

# Install MySQL as a Windows service
Write-Host "🔄 Installing MySQL as Windows service..." -ForegroundColor Yellow
$serviceCommand = "& '$mysqlBin\mysqld.exe' --install MySQL84 --defaults-file='$PSScriptRoot\mysql.cnf'"
try {
    Invoke-Expression $serviceCommand
    Write-Host "✅ MySQL service installed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ MySQL service may already be installed" -ForegroundColor Yellow
}

# Start MySQL service
Write-Host "🔄 Starting MySQL service..." -ForegroundColor Yellow
try {
    Start-Service -Name "MySQL84"
    Write-Host "✅ MySQL service started" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start MySQL service: $($_.Exception.Message)" -ForegroundColor Red
}

# Wait a moment for service to start
Start-Sleep -Seconds 3

# Check service status
$service = Get-Service -Name "MySQL84" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Write-Host "✅ MySQL service is running" -ForegroundColor Green
} else {
    Write-Host "❌ MySQL service is not running" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 MySQL setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open MySQL Workbench to set up root password" -ForegroundColor White
Write-Host "2. Create 'quibish' database" -ForegroundColor White
Write-Host "3. Update your .env file with credentials" -ForegroundColor White
Write-Host ""
Write-Host "Default connection:" -ForegroundColor Cyan
Write-Host "  Host: localhost" -ForegroundColor White
Write-Host "  Port: 3306" -ForegroundColor White
Write-Host "  Username: root" -ForegroundColor White
Write-Host "  Password: (none - set this up!)" -ForegroundColor White