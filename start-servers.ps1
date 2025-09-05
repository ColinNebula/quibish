# Quibish App Server Manager
# This script starts both backend and frontend servers and keeps them running

param(
    [switch]$Force,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Restart
)

$BackendPath = "d:\Development\quibish\backend"
$FrontendPath = "d:\Development\quibish"
$LogPath = "d:\Development\quibish\logs"

# Create logs directory if it doesn't exist
if (!(Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath | Out-Null
}

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path "$LogPath\server-manager.log" -Value $logMessage
}

function Get-ProcessByPort {
    param($Port)
    $netstat = netstat -ano | findstr ":$Port.*LISTENING"
    if ($netstat) {
        $processId = ($netstat -split '\s+')[-1]
        return Get-Process -Id $processId -ErrorAction SilentlyContinue
    }
    return $null
}

function Stop-Servers {
    Write-Log "Stopping servers..."
    
    # Stop backend (port 5001)
    $backendProcess = Get-ProcessByPort 5001
    if ($backendProcess) {
        Write-Log "Stopping backend server (PID: $($backendProcess.Id))"
        Stop-Process -Id $backendProcess.Id -Force
        Start-Sleep -Seconds 2
    }
    
    # Stop frontend (port 3000)
    $frontendProcess = Get-ProcessByPort 3000
    if ($frontendProcess) {
        Write-Log "Stopping frontend server (PID: $($frontendProcess.Id))"
        Stop-Process -Id $frontendProcess.Id -Force
        Start-Sleep -Seconds 2
    }
    
    # Stop any other node processes that might be related
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.Path -like "*quibish*" -or $_.ProcessName -eq "node"
    }
    
    foreach ($proc in $nodeProcesses) {
        try {
            $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
            if ($commandLine -like "*quibish*" -or $commandLine -like "*server.js*" -or $commandLine -like "*react-scripts*") {
                Write-Log "Stopping related Node process (PID: $($proc.Id))"
                Stop-Process -Id $proc.Id -Force
            }
        } catch {
            # Ignore errors for processes we can't access
        }
    }
    
    Write-Log "Servers stopped."
}

function Get-ServerStatus {
    Write-Log "Checking server status..."
    
    # Check backend
    $backendProcess = Get-ProcessByPort 5001
    if ($backendProcess) {
        Write-Host "✅ Backend: Running (PID: $($backendProcess.Id), Port: 5001)" -ForegroundColor Green
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:5001/api/ping" -Method GET -TimeoutSec 5
            Write-Host "   API Health: OK (Uptime: $([math]::Round($response.uptime, 2))s)" -ForegroundColor Green
        } catch {
            Write-Host "   API Health: Error - $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Backend: Not running" -ForegroundColor Red
    }
    
    # Check frontend
    $frontendProcess = Get-ProcessByPort 3000
    if ($frontendProcess) {
        Write-Host "✅ Frontend: Running (PID: $($frontendProcess.Id), Port: 3000)" -ForegroundColor Green
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "   HTTP Status: OK" -ForegroundColor Green
            }
        } catch {
            Write-Host "   HTTP Status: Error - $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Frontend: Not running" -ForegroundColor Red
    }
}

function Start-Backend {
    $backendProcess = Get-ProcessByPort 5001
    if ($backendProcess -and !$Force) {
        Write-Log "Backend already running on port 5001 (PID: $($backendProcess.Id))"
        return
    }
    
    if ($backendProcess -and $Force) {
        Write-Log "Force stopping existing backend process..."
        Stop-Process -Id $backendProcess.Id -Force
        Start-Sleep -Seconds 2
    }
    
    Write-Log "Starting backend server..."
    Set-Location $BackendPath
    
    # Start backend in a new PowerShell window that stays open
    $backendJob = Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$BackendPath'; Write-Host 'Starting Quibish Backend Server...' -ForegroundColor Cyan; node server.js"
    ) -PassThru
    
    # Wait a moment for the server to start
    Start-Sleep -Seconds 3
    
    # Verify it started
    $backendProcess = Get-ProcessByPort 5001
    if ($backendProcess) {
        Write-Log "✅ Backend server started successfully (PID: $($backendProcess.Id))"
    } else {
        Write-Log "❌ Failed to start backend server"
    }
}

function Start-Frontend {
    $frontendProcess = Get-ProcessByPort 3000
    if ($frontendProcess -and !$Force) {
        Write-Log "Frontend already running on port 3000 (PID: $($frontendProcess.Id))"
        return
    }
    
    if ($frontendProcess -and $Force) {
        Write-Log "Force stopping existing frontend process..."
        Stop-Process -Id $frontendProcess.Id -Force
        Start-Sleep -Seconds 2
    }
    
    Write-Log "Starting frontend server..."
    Set-Location $FrontendPath
    
    # Start frontend in a new PowerShell window that stays open
    $frontendJob = Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$FrontendPath'; Write-Host 'Starting Quibish Frontend Server...' -ForegroundColor Cyan; npm start"
    ) -PassThru
    
    # Wait for the server to start
    Start-Sleep -Seconds 8
    
    # Verify it started
    $frontendProcess = Get-ProcessByPort 3000
    if ($frontendProcess) {
        Write-Log "✅ Frontend server started successfully (PID: $($frontendProcess.Id))"
    } else {
        Write-Log "❌ Failed to start frontend server"
    }
}

# Main script logic
if ($Stop) {
    Stop-Servers
    exit
}

if ($Status) {
    Get-ServerStatus
    exit
}

if ($Restart) {
    Stop-Servers
    Start-Sleep -Seconds 3
}

Write-Log "=== Quibish Server Manager Started ==="

# Start servers
Start-Backend
Start-Frontend

Write-Log "=== Server startup complete ==="
Write-Log "Backend: http://localhost:5001"
Write-Log "Frontend: http://localhost:3000"
Write-Log "API Health: http://localhost:5001/api/ping"

# Final status check
Start-Sleep -Seconds 2
Get-ServerStatus

Write-Host "`n🚀 Quibish servers are running!" -ForegroundColor Green
Write-Host "📱 Access your app at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend API at: http://localhost:5001" -ForegroundColor Cyan
Write-Host "`n💡 Usage:" -ForegroundColor Yellow
Write-Host "   .\start-servers.ps1          # Start servers"
Write-Host "   .\start-servers.ps1 -Status  # Check status"
Write-Host "   .\start-servers.ps1 -Stop    # Stop servers"
Write-Host "   .\start-servers.ps1 -Restart # Restart servers"
Write-Host "   .\start-servers.ps1 -Force   # Force restart servers"