# Quibish Application Shutdown Script
# This script stops all running services

Write-Host "`n🛑 Stopping Quibish Application...`n" -ForegroundColor Cyan

# Function to stop processes on a specific port
function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServiceName)
    
    Write-Host "🔍 Checking $ServiceName (Port $Port)..." -ForegroundColor Yellow
    
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    
    if ($connections) {
        $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        
        foreach ($pid in $processIds) {
            try {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "   ⏹️  Stopping process $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "   ✅ Stopped $ServiceName" -ForegroundColor Green
                }
            } catch {
                Write-Host "   ⚠️  Could not stop process $pid" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "   ℹ️  $ServiceName is not running" -ForegroundColor Gray
    }
}

# Stop Backend Server (Port 5001)
Stop-ProcessOnPort -Port 5001 -ServiceName "Backend Server"

# Stop Frontend Server (Port 3000)
Stop-ProcessOnPort -Port 3000 -ServiceName "Frontend Server"

Write-Host "`n✅ All services stopped successfully!`n" -ForegroundColor Green
