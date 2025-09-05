# Quibish Health Monitor
# Continuously monitors server health and restarts if needed

param(
    [int]$CheckInterval = 30,  # Check every 30 seconds
    [int]$MaxRestarts = 5,     # Maximum restarts per hour
    [switch]$AutoRestart = $true
)

$LogPath = "d:\Development\quibish\logs"
$BackendPath = "d:\Development\quibish\backend"
$FrontendPath = "d:\Development\quibish"

# Restart tracking
$RestartHistory = @()

function Write-HealthLog {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    
    Write-Host $logMessage -ForegroundColor $color
    Add-Content -Path "$LogPath\health-monitor.log" -Value $logMessage
}

function Test-ServerHealth {
    param($Url, $ServerName, $Timeout = 5)
    
    try {
        if ($ServerName -eq "Backend") {
            $response = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec $Timeout
            return @{
                IsHealthy = $response.success -eq $true
                Response = $response
                Error = $null
            }
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec $Timeout
            return @{
                IsHealthy = $response.StatusCode -eq 200
                Response = $response
                Error = $null
            }
        }
    } catch {
        return @{
            IsHealthy = $false
            Response = $null
            Error = $_.Exception.Message
        }
    }
}

function Get-ProcessByPort {
    param($Port)
    $netstat = netstat -ano | findstr ":$Port.*LISTENING"
    if ($netstat) {
        $pid = ($netstat -split '\s+')[-1]
        return Get-Process -Id $pid -ErrorAction SilentlyContinue
    }
    return $null
}

function Restart-Server {
    param($ServerName, $Port, $Path, $Command)
    
    # Check restart limits
    $recentRestarts = $RestartHistory | Where-Object { 
        $_.Timestamp -gt (Get-Date).AddHours(-1) -and $_.ServerName -eq $ServerName 
    }
    
    if ($recentRestarts.Count -ge $MaxRestarts) {
        Write-HealthLog "Maximum restart limit reached for $ServerName ($MaxRestarts/hour). Skipping restart." "ERROR"
        return $false
    }
    
    Write-HealthLog "Attempting to restart $ServerName server..." "WARN"
    
    # Stop existing process
    $process = Get-ProcessByPort $Port
    if ($process) {
        Write-HealthLog "Stopping $ServerName process (PID: $($process.Id))"
        Stop-Process -Id $process.Id -Force
        Start-Sleep -Seconds 3
    }
    
    # Start new process
    Set-Location $Path
    $newProcess = Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$Path'; Write-Host 'Restarting $ServerName Server...' -ForegroundColor Magenta; $Command"
    ) -PassThru
    
    # Track restart
    $RestartHistory += @{
        ServerName = $ServerName
        Timestamp = Get-Date
        ProcessId = $newProcess.Id
    }
    
    Start-Sleep -Seconds 5
    
    # Verify restart
    $newProcess = Get-ProcessByPort $Port
    if ($newProcess) {
        Write-HealthLog "$ServerName server restarted successfully (PID: $($newProcess.Id))" "SUCCESS"
        return $true
    } else {
        Write-HealthLog "Failed to restart $ServerName server" "ERROR"
        return $false
    }
}

Write-HealthLog "=== Quibish Health Monitor Started ===" "SUCCESS"
Write-HealthLog "Check interval: $CheckInterval seconds"
Write-HealthLog "Auto-restart: $AutoRestart"
Write-HealthLog "Max restarts per hour: $MaxRestarts"

# Create logs directory
if (!(Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath | Out-Null
}

# Main monitoring loop
while ($true) {
    try {
        Write-HealthLog "Performing health check..."
        
        # Check Backend Health
        $backendHealth = Test-ServerHealth -Url "http://localhost:5001/api/ping" -ServerName "Backend"
        $backendProcess = Get-ProcessByPort 5001
        
        if ($backendProcess -and $backendHealth.IsHealthy) {
            Write-HealthLog "✅ Backend: Healthy (PID: $($backendProcess.Id), Uptime: $([math]::Round($backendHealth.Response.uptime, 1))s)"
        } elseif ($backendProcess -and !$backendHealth.IsHealthy) {
            Write-HealthLog "⚠️ Backend: Process running but unhealthy - $($backendHealth.Error)" "WARN"
            if ($AutoRestart) {
                Restart-Server -ServerName "Backend" -Port 5001 -Path $BackendPath -Command "node server.js"
            }
        } elseif (!$backendProcess) {
            Write-HealthLog "❌ Backend: Process not running" "ERROR"
            if ($AutoRestart) {
                Restart-Server -ServerName "Backend" -Port 5001 -Path $BackendPath -Command "node server.js"
            }
        }
        
        # Check Frontend Health
        $frontendHealth = Test-ServerHealth -Url "http://localhost:3000" -ServerName "Frontend"
        $frontendProcess = Get-ProcessByPort 3000
        
        if ($frontendProcess -and $frontendHealth.IsHealthy) {
            Write-HealthLog "✅ Frontend: Healthy (PID: $($frontendProcess.Id))"
        } elseif ($frontendProcess -and !$frontendHealth.IsHealthy) {
            Write-HealthLog "⚠️ Frontend: Process running but unhealthy - $($frontendHealth.Error)" "WARN"
            if ($AutoRestart) {
                Restart-Server -ServerName "Frontend" -Port 3000 -Path $FrontendPath -Command "npm start"
            }
        } elseif (!$frontendProcess) {
            Write-HealthLog "❌ Frontend: Process not running" "ERROR"
            if ($AutoRestart) {
                Restart-Server -ServerName "Frontend" -Port 3000 -Path $FrontendPath -Command "npm start"
            }
        }
        
        # Clean old restart history
        $RestartHistory = $RestartHistory | Where-Object { $_.Timestamp -gt (Get-Date).AddHours(-1) }
        
    } catch {
        Write-HealthLog "Health check error: $($_.Exception.Message)" "ERROR"
    }
    
    Start-Sleep -Seconds $CheckInterval
}