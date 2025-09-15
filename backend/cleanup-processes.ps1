# Cleanup script for Node.js processes
Write-Host "🔍 Checking for Node.js processes..." -ForegroundColor Yellow

# Get all node.exe processes
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "📊 Found $($nodeProcesses.Count) Node.js processes:" -ForegroundColor Cyan
    
    foreach ($process in $nodeProcesses) {
        $memoryMB = [math]::Round($process.WorkingSet / 1MB, 2)
        Write-Host "  - PID: $($process.Id), Memory: ${memoryMB}MB" -ForegroundColor White
    }
    
    # Ask user which processes to terminate
    Write-Host "`n⚠️  Options:" -ForegroundColor Yellow
    Write-Host "1. Kill all Node.js processes"
    Write-Host "2. Kill only high-memory processes (>100MB)"
    Write-Host "3. Exit without changes"
    
    $choice = Read-Host "`nEnter your choice (1-3)"
    
    switch ($choice) {
        "1" {
            Write-Host "`n🛑 Terminating all Node.js processes..." -ForegroundColor Red
            $nodeProcesses | Stop-Process -Force
            Write-Host "✅ All Node.js processes terminated." -ForegroundColor Green
        }
        "2" {
            Write-Host "`n🛑 Terminating high-memory Node.js processes..." -ForegroundColor Red
            $highMemoryProcesses = $nodeProcesses | Where-Object { $_.WorkingSet -gt 100MB }
            if ($highMemoryProcesses) {
                $highMemoryProcesses | Stop-Process -Force
                Write-Host "✅ High-memory processes terminated." -ForegroundColor Green
            } else {
                Write-Host "ℹ️  No high-memory processes found." -ForegroundColor Blue
            }
        }
        "3" {
            Write-Host "`n🚪 Exiting without changes." -ForegroundColor Blue
        }
        default {
            Write-Host "`n❌ Invalid choice. Exiting." -ForegroundColor Red
        }
    }
} else {
    Write-Host "ℹ️  No Node.js processes found." -ForegroundColor Blue
}

Write-Host "`n📊 Current memory status:" -ForegroundColor Cyan
Get-Process -Name "node" -ErrorAction SilentlyContinue | Select-Object Name, Id, @{Name="MemoryMB";Expression={[math]::Round($_.WorkingSet / 1MB, 2)}} | Format-Table -AutoSize