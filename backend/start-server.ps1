# Simple Server Starter with Process Management
# This script provides a reliable way to start and maintain the server

param(
    [string]$ServerType = "stable",
    [switch]$AutoRestart = $false,
    [switch]$Monitor = $false
)

$ErrorActionPreference = "Continue"
$BackendPath = "D:\Development\quibish\backend"

# Server script mapping
$ServerScripts = @{
    "stable" = "stable-server.js"
    "optimized" = "optimized-server.js"
    "simple" = "simple-server.js"
}

function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    switch ($Type) {
        "SUCCESS" { Write-Host "[$timestamp] ✅ $Message" -ForegroundColor Green }
        "ERROR"   { Write-Host "[$timestamp] ❌ $Message" -ForegroundColor Red }
        "WARN"    { Write-Host "[$timestamp] ⚠️  $Message" -ForegroundColor Yellow }
        default   { Write-Host "[$timestamp] 📝 $Message" -ForegroundColor Cyan }
    }
}

function Test-ServerRunning {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5001/api/health" -Method GET -TimeoutSec 5
        return $true
    }
    catch {
        return $false
    }
}

function Start-ServerProcess {
    param([string]$Script)
    
    Set-Location $BackendPath
    
    Write-Status "Starting $Script..." "INFO"
    
    if ($AutoRestart) {
        # Use the comprehensive server manager
        & ".\server-manager.ps1" -ServerScript $Script
    } else {
        # Direct start
        $process = Start-Process -FilePath "node" -ArgumentList $Script -WorkingDirectory $BackendPath -PassThru
        
        # Wait for server to be ready
        $attempts = 0
        while ($attempts -lt 15) {
            Start-Sleep -Seconds 2
            if (Test-ServerRunning) {
                Write-Status "Server is ready and responding!" "SUCCESS"
                Write-Status "Health check: http://localhost:5001/api/health" "INFO"
                Write-Status "Frontend should connect automatically" "INFO"
                
                if ($Monitor) {
                    Write-Status "Monitoring enabled - Press Ctrl+C to stop" "INFO"
                    try {
                        while (-not $process.HasExited) {
                            Start-Sleep -Seconds 10
                            if (Test-ServerRunning) {
                                Write-Status "Server health check: PASS" "SUCCESS"
                            } else {
                                Write-Status "Server health check: FAIL" "ERROR"
                                break
                            }
                        }
                    }
                    catch {
                        Write-Status "Monitoring stopped" "WARN"
                    }
                }
                return $true
            }
            $attempts++
        }
        
        Write-Status "Server failed to respond within 30 seconds" "ERROR"
        return $false
    }
}

# Main execution
Write-Host ""
Write-Host "🚀 Quibish Server Launcher 🚀" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host ""

if (-not $ServerScripts.ContainsKey($ServerType)) {
    Write-Status "Invalid server type. Available options: $($ServerScripts.Keys -join ', ')" "ERROR"
    exit 1
}

$selectedScript = $ServerScripts[$ServerType]
Write-Status "Selected server: $selectedScript" "INFO"

if ($AutoRestart) {
    Write-Status "Auto-restart enabled" "INFO"
}

if ($Monitor) {
    Write-Status "Health monitoring enabled" "INFO"
}

# Check if server is already running
if (Test-ServerRunning) {
    Write-Status "Server is already running!" "WARN"
    Write-Status "Health check: http://localhost:5001/api/health" "INFO"
    exit 0
}

# Start the server
$success = Start-ServerProcess -Script $selectedScript

if ($success) {
    Write-Status "Server startup completed successfully" "SUCCESS"
    exit 0
} else {
    Write-Status "Server startup failed" "ERROR"
    exit 1
}