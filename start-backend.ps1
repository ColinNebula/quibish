# PowerShell script to start the backend server in memory mode
# This helps debug profile save issues

Write-Host "🚀 Starting Quibish Backend Server..." -ForegroundColor Green
Write-Host "🔧 Configuration:" -ForegroundColor Yellow
Write-Host "   - Database: Memory Mode (no MySQL required)" -ForegroundColor Yellow
Write-Host "   - Environment: Development" -ForegroundColor Yellow
Write-Host "   - Port: 5001" -ForegroundColor Yellow
Write-Host ""

# Set environment variables
$env:DATABASE_TYPE = 'memory'
$env:NODE_ENV = 'development'

# Kill any existing Node processes
Write-Host "🔍 Checking for existing Node processes..." -ForegroundColor Cyan
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "⚠️  Found existing Node processes. Stopping them..." -ForegroundColor Yellow
        Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} catch {
    # Ignore errors if no processes found
}

# Change to backend directory and start server
Write-Host "📁 Changing to backend directory..." -ForegroundColor Cyan
Set-Location "backend"

Write-Host "🔄 Starting backend server..." -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the server
node server.js