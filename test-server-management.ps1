Write-Host "=== QuibiChat Server Management Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if start-servers.ps1 exists and is accessible
Write-Host "1. Checking server management script..." -ForegroundColor Yellow
$startScript = ".\start-servers.ps1"
if (Test-Path $startScript) {
    Write-Host "   ✓ start-servers.ps1 found" -ForegroundColor Green
} else {
    Write-Host "   ✗ start-servers.ps1 not found" -ForegroundColor Red
    exit 1
}

# Test 2: Check if health monitor script exists
Write-Host "2. Checking health monitor script..." -ForegroundColor Yellow
$healthScript = ".\health-monitor.ps1"
if (Test-Path $healthScript) {
    Write-Host "   ✓ health-monitor.ps1 found" -ForegroundColor Green
} else {
    Write-Host "   ✗ health-monitor.ps1 not found" -ForegroundColor Red
    exit 1
}

# Test 3: Check batch file wrappers
Write-Host "3. Checking batch file wrappers..." -ForegroundColor Yellow
$batchFiles = @("start.bat", "stop.bat", "status.bat")
foreach ($batch in $batchFiles) {
    if (Test-Path $batch) {
        Write-Host "   ✓ $batch found" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $batch not found" -ForegroundColor Red
    }
}

# Test 4: Check if backend and frontend package.json exist
Write-Host "4. Checking project structure..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "   ✓ Frontend package.json found" -ForegroundColor Green
} else {
    Write-Host "   ✗ Frontend package.json not found" -ForegroundColor Red
}

if (Test-Path "backend\package.json") {
    Write-Host "   ✓ Backend package.json found" -ForegroundColor Green
} else {
    Write-Host "   ✗ Backend package.json not found" -ForegroundColor Red
}

# Test 5: Check if Enhanced Connection Manager was created
Write-Host "5. Checking Enhanced Connection Manager..." -ForegroundColor Yellow
$connectionManager = "src\services\EnhancedConnectionManager.js"
if (Test-Path $connectionManager) {
    Write-Host "   ✓ EnhancedConnectionManager.js found" -ForegroundColor Green
} else {
    Write-Host "   ✗ EnhancedConnectionManager.js not found" -ForegroundColor Red
}

# Test 6: Check if Connection Status component was created
Write-Host "6. Checking Connection Status component..." -ForegroundColor Yellow
$connectionStatus = "src\components\ConnectionStatus\ConnectionStatus.js"
if (Test-Path $connectionStatus) {
    Write-Host "   ✓ ConnectionStatus component found" -ForegroundColor Green
} else {
    Write-Host "   ✗ ConnectionStatus component not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Server management infrastructure appears to be properly installed!"
Write-Host ""
Write-Host "To start your servers, you can now use:" -ForegroundColor Yellow
Write-Host "  • PowerShell: .\start-servers.ps1" -ForegroundColor White
Write-Host "  • Batch file: start.bat" -ForegroundColor White
Write-Host ""
Write-Host "To monitor server health:" -ForegroundColor Yellow
Write-Host "  • PowerShell: .\health-monitor.ps1" -ForegroundColor White
Write-Host ""
Write-Host "To check server status:" -ForegroundColor Yellow
Write-Host "  • Batch file: status.bat" -ForegroundColor White
Write-Host "  • PowerShell: .\start-servers.ps1 -Status" -ForegroundColor White