# Quibish Application Shutdown Script
# Stops processes listening on port 5001 (backend) and 3000 (frontend)

Write-Host "Stopping Quibish Application..." -ForegroundColor Cyan

function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServiceName)
    Write-Host "Checking $ServiceName (Port $Port)..." -ForegroundColor Yellow
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pids) {
            try {
                $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
                if ($proc) {
                    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                    Write-Host "  Stopped $ServiceName (PID $p - $($proc.ProcessName))" -ForegroundColor Green
                }
            } catch {
                Write-Host "  Could not stop PID $p" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  $ServiceName is not running on port $Port" -ForegroundColor Gray
    }
}

Stop-ProcessOnPort -Port 5001 -ServiceName "Backend Server"
Stop-ProcessOnPort -Port 3000 -ServiceName "Frontend Dev Server"

Write-Host "Done." -ForegroundColor Green