# Simple Health Check Script for Testing
param(
    [switch]$Status
)

function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
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

function Test-BackendSimple {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5001/api/health" -Method GET -TimeoutSec 5
        return $response.success -eq $true
    } catch {
        return $false
    }
}

function Test-FrontendSimple {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Write-Log "=== Simple Quibish Health Check ===" "INFO"

# Check backend
$backendProcess = Get-ProcessByPort 5001
if ($backendProcess) {
    Write-Log "✅ Backend process running (PID: $($backendProcess.Id))" "SUCCESS"
    
    if (Test-BackendSimple) {
        Write-Log "✅ Backend health check passed" "SUCCESS"
    } else {
        Write-Log "❌ Backend health check failed" "ERROR"
    }
} else {
    Write-Log "❌ Backend not running" "ERROR"
}

# Check frontend
$frontendProcess = Get-ProcessByPort 3000
if ($frontendProcess) {
    Write-Log "✅ Frontend process running (PID: $($frontendProcess.Id))" "SUCCESS"
    
    if (Test-FrontendSimple) {
        Write-Log "✅ Frontend health check passed" "SUCCESS"
    } else {
        Write-Log "❌ Frontend health check failed" "ERROR"
    }
} else {
    Write-Log "❌ Frontend not running" "ERROR"
}

Write-Log "=== Health Check Complete ===" "INFO"