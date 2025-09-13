# Enhanced Quibish App Server Manager with Health Checks
# This script starts both backend and frontend servers with comprehensive health validation

param(
    [switch]$Force,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Restart,
    [switch]$HealthCheck,
    [switch]$Detailed
)

$BackendPath = "d:\Development\quibish\backend"
$FrontendPath = "d:\Development\quibish"
$LogPath = "d:\Development\quibish\logs"
$HealthCheckTimeout = 30 # seconds

# Create logs directory if it doesn't exist
if (!(Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath | Out-Null
}

function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN" { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage }
    }
    
    Add-Content -Path "$LogPath\server-manager.log" -Value $logMessage
}

function Test-Prerequisites {
    Write-Log "🔍 Checking prerequisites..." "INFO"
    
    $checks = @()
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        $checks += @{ Name = "Node.js"; Status = "✅"; Message = "Version: $nodeVersion" }
    } catch {
        $checks += @{ Name = "Node.js"; Status = "❌"; Message = "Not installed or not in PATH" }
        return $false, $checks
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        $checks += @{ Name = "npm"; Status = "✅"; Message = "Version: $npmVersion" }
    } catch {
        $checks += @{ Name = "npm"; Status = "❌"; Message = "Not installed or not in PATH" }
        return $false, $checks
    }
    
    # Check backend directory and package.json
    if (Test-Path "$BackendPath\package.json") {
        $checks += @{ Name = "Backend package.json"; Status = "✅"; Message = "Found" }
    } else {
        $checks += @{ Name = "Backend package.json"; Status = "❌"; Message = "Missing" }
        return $false, $checks
    }
    
    # Check frontend directory and package.json
    if (Test-Path "$FrontendPath\package.json") {
        $checks += @{ Name = "Frontend package.json"; Status = "✅"; Message = "Found" }
    } else {
        $checks += @{ Name = "Frontend package.json"; Status = "❌"; Message = "Missing" }
        return $false, $checks
    }
    
    # Check dependencies
    Set-Location $BackendPath
    if (Test-Path "node_modules") {
        $checks += @{ Name = "Backend dependencies"; Status = "✅"; Message = "Installed" }
    } else {
        $checks += @{ Name = "Backend dependencies"; Status = "⚠️"; Message = "Not installed - will run npm install" }
    }
    
    Set-Location $FrontendPath
    if (Test-Path "node_modules") {
        $checks += @{ Name = "Frontend dependencies"; Status = "✅"; Message = "Installed" }
    } else {
        $checks += @{ Name = "Frontend dependencies"; Status = "⚠️"; Message = "Not installed - will run npm install" }
    }
    
    # Display results
    Write-Log "📋 Prerequisites Check Results:" "INFO"
    foreach ($check in $checks) {
        Write-Log "   $($check.Status) $($check.Name): $($check.Message)" "INFO"
    }
    
    $failed = $checks | Where-Object { $_.Status -eq "❌" }
    if ($failed) {
        Write-Log "❌ Prerequisites check failed. Please install missing components." "ERROR"
        return $false, $checks
    }
    
    return $true, $checks
}

function Install-Dependencies {
    Write-Log "📦 Installing missing dependencies..." "INFO"
    
    # Install backend dependencies
    Set-Location $BackendPath
    if (!(Test-Path "node_modules")) {
        Write-Log "Installing backend dependencies..." "INFO"
        try {
            npm install
            Write-Log "✅ Backend dependencies installed" "SUCCESS"
        } catch {
            Write-Log "❌ Failed to install backend dependencies: $($_.Exception.Message)" "ERROR"
            return $false
        }
    }
    
    # Install frontend dependencies
    Set-Location $FrontendPath
    if (!(Test-Path "node_modules")) {
        Write-Log "Installing frontend dependencies..." "INFO"
        try {
            npm install
            Write-Log "✅ Frontend dependencies installed" "SUCCESS"
        } catch {
            Write-Log "❌ Failed to install frontend dependencies: $($_.Exception.Message)" "ERROR"
            return $false
        }
    }
    
    return $true
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

function Test-BackendHealth {
    param($Detailed = $false)
    
    $healthChecks = @{
        "Basic Connectivity" = $false
        "Health Endpoint" = $false
        "Startup Status" = $false
        "Detailed Health" = $false
    }
    
    try {
        # Basic connectivity test
        $response = Invoke-RestMethod -Uri "http://localhost:5001/api/ping" -Method GET -TimeoutSec 5
        $healthChecks["Basic Connectivity"] = $true
        
        # Health endpoint test
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/health" -Method GET -TimeoutSec 5
        $healthChecks["Health Endpoint"] = $healthResponse.success -eq $true
        
        # Startup status test
        $startupResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/startup" -Method GET -TimeoutSec 5
        $healthChecks["Startup Status"] = $startupResponse.initialized -eq $true
        
        if ($Detailed) {
            # Detailed health test
            $detailedResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/health/detailed" -Method GET -TimeoutSec 5
            $healthChecks["Detailed Health"] = $detailedResponse.success -eq $true
            
            if ($detailedResponse.checks) {
                Write-Log "🔍 Detailed Backend Health Checks:" "INFO"
                foreach ($check in $detailedResponse.checks.PSObject.Properties) {
                    $status = if ($check.Value.status -eq "healthy") { "✅" } elseif ($check.Value.status -eq "warning") { "⚠️" } else { "❌" }
                    Write-Log "   $status $($check.Name): $($check.Value.message)" "INFO"
                }
            }
        }
        
    } catch {
        Write-Log "⚠️ Backend health check failed: $($_.Exception.Message)" "WARN"
    }
    
    return $healthChecks
}

function Test-FrontendHealth {
    $healthChecks = @{
        "HTTP Response" = $false
        "Content Loading" = $false
    }
    
    try {
        # Basic HTTP test
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 10
        $healthChecks["HTTP Response"] = $response.StatusCode -eq 200
        
        # Check if it's serving React content
        if ($response.Content -like "*react*" -or $response.Content -like "*quibish*" -or $response.Content -like "*root*") {
            $healthChecks["Content Loading"] = $true
        }
        
    } catch {
        Write-Log "⚠️ Frontend health check failed: $($_.Exception.Message)" "WARN"
    }
    
    return $healthChecks
}

function Stop-Servers {
    Write-Log "⏹️ Stopping servers..." "INFO"
    
    # Stop backend (port 5001)
    $backendProcess = Get-ProcessByPort 5001
    if ($backendProcess) {
        Write-Log "Stopping backend server (PID: $($backendProcess.Id))" "INFO"
        Stop-Process -Id $backendProcess.Id -Force
        Start-Sleep -Seconds 2
    }
    
    # Stop frontend (port 3000)
    $frontendProcess = Get-ProcessByPort 3000
    if ($frontendProcess) {
        Write-Log "Stopping frontend server (PID: $($frontendProcess.Id))" "INFO"
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
                Write-Log "Stopping related Node process (PID: $($proc.Id))" "INFO"
                Stop-Process -Id $proc.Id -Force
            }
        } catch {
            # Ignore errors for processes we can't access
        }
    }
    
    Write-Log "✅ Servers stopped." "SUCCESS"
}

function Get-ServerStatus {
    Write-Log "📊 Checking server status..." "INFO"
    
    # Check backend
    $backendProcess = Get-ProcessByPort 5001
    if ($backendProcess) {
        Write-Log "✅ Backend: Running (PID: $($backendProcess.Id), Port: 5001)" "SUCCESS"
        
        $backendHealth = Test-BackendHealth -Detailed $Detailed
        foreach ($check in $backendHealth.GetEnumerator()) {
            $status = if ($check.Value) { "✅" } else { "❌" }
            Write-Log "   $status $($check.Key)" "INFO"
        }
    } else {
        Write-Log "❌ Backend: Not running" "ERROR"
    }
    
    # Check frontend
    $frontendProcess = Get-ProcessByPort 3000
    if ($frontendProcess) {
        Write-Log "✅ Frontend: Running (PID: $($frontendProcess.Id), Port: 3000)" "SUCCESS"
        
        $frontendHealth = Test-FrontendHealth
        foreach ($check in $frontendHealth.GetEnumerator()) {
            $status = if ($check.Value) { "✅" } else { "❌" }
            Write-Log "   $status $($check.Key)" "INFO"
        }
    } else {
        Write-Log "❌ Frontend: Not running" "ERROR"
    }
}

function Start-Backend {
    $backendProcess = Get-ProcessByPort 5001
    if ($backendProcess -and !$Force) {
        Write-Log "Backend already running on port 5001 (PID: $($backendProcess.Id))" "INFO"
        return $true
    }
    
    if ($backendProcess -and $Force) {
        Write-Log "Force stopping existing backend process..." "INFO"
        Stop-Process -Id $backendProcess.Id -Force
        Start-Sleep -Seconds 2
    }
    
    Write-Log "🚀 Starting backend server..." "INFO"
    Set-Location $BackendPath
    
    # Start backend in a new PowerShell window that stays open
    $backendJob = Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$BackendPath'; Write-Host 'Starting Quibish Backend Server with Health Checks...' -ForegroundColor Cyan; node server.js"
    ) -PassThru
    
    # Wait for the server to initialize
    Write-Log "⏳ Waiting for backend initialization..." "INFO"
    $startTime = Get-Date
    $initialized = $false
    
    while (((Get-Date) - $startTime).TotalSeconds -lt $HealthCheckTimeout) {
        Start-Sleep -Seconds 2
        
        try {
            $backendProcess = Get-ProcessByPort 5001
            if ($backendProcess) {
                # Check if backend is fully initialized
                $startupResponse = Invoke-RestMethod -Uri "http://localhost:5001/api/startup" -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
                if ($startupResponse.initialized) {
                    $initialized = $true
                    break
                }
            }
        } catch {
            # Still initializing
        }
    }
    
    if ($initialized) {
        $duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
        Write-Log "✅ Backend server started and initialized successfully in ${duration}s" "SUCCESS"
        
        # Run health checks
        $healthChecks = Test-BackendHealth
        $healthyChecks = ($healthChecks.Values | Where-Object { $_ }).Count
        $totalChecks = $healthChecks.Count
        Write-Log "🏥 Backend health: $healthyChecks/$totalChecks checks passed" "INFO"
        
        return $true
    } else {
        Write-Log "❌ Backend server failed to initialize within ${HealthCheckTimeout}s" "ERROR"
        return $false
    }
}

function Start-Frontend {
    $frontendProcess = Get-ProcessByPort 3000
    if ($frontendProcess -and !$Force) {
        Write-Log "Frontend already running on port 3000 (PID: $($frontendProcess.Id))" "INFO"
        return $true
    }
    
    if ($frontendProcess -and $Force) {
        Write-Log "Force stopping existing frontend process..." "INFO"
        Stop-Process -Id $frontendProcess.Id -Force
        Start-Sleep -Seconds 2
    }
    
    Write-Log "🚀 Starting frontend server..." "INFO"
    Set-Location $FrontendPath
    
    # Start frontend in a new PowerShell window that stays open
    $frontendJob = Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$FrontendPath'; Write-Host 'Starting Quibish Frontend Server with Health Checks...' -ForegroundColor Cyan; npm start"
    ) -PassThru
    
    # Wait for the server to start
    Write-Log "⏳ Waiting for frontend compilation..." "INFO"
    $startTime = Get-Date
    $started = $false
    
    while (((Get-Date) - $startTime).TotalSeconds -lt ($HealthCheckTimeout + 20)) { # Frontend takes longer to compile
        Start-Sleep -Seconds 3
        
        try {
            $frontendProcess = Get-ProcessByPort 3000
            if ($frontendProcess) {
                $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $started = $true
                    break
                }
            }
        } catch {
            # Still starting
        }
    }
    
    if ($started) {
        $duration = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
        Write-Log "✅ Frontend server started successfully in ${duration}s" "SUCCESS"
        
        # Run health checks
        $healthChecks = Test-FrontendHealth
        $healthyChecks = ($healthChecks.Values | Where-Object { $_ }).Count
        $totalChecks = $healthChecks.Count
        Write-Log "🏥 Frontend health: $healthyChecks/$totalChecks checks passed" "INFO"
        
        return $true
    } else {
        Write-Log "❌ Frontend server failed to start within $($HealthCheckTimeout + 20)s" "ERROR"
        return $false
    }
}

function Start-ServersWithValidation {
    Write-Log "🚀 Starting Quibish servers with health validation..." "INFO"
    
    # Prerequisites check
    $prereqsPassed, $prereqResults = Test-Prerequisites
    if (!$prereqsPassed) {
        Write-Log "❌ Prerequisites check failed. Cannot start servers." "ERROR"
        return $false
    }
    
    # Install dependencies if needed
    if (!(Install-Dependencies)) {
        Write-Log "❌ Failed to install dependencies. Cannot start servers." "ERROR"
        return $false
    }
    
    # Start backend first
    if (!(Start-Backend)) {
        Write-Log "❌ Backend startup failed. Aborting frontend startup." "ERROR"
        return $false
    }
    
    # Start frontend
    if (!(Start-Frontend)) {
        Write-Log "❌ Frontend startup failed." "ERROR"
        return $false
    }
    
    Write-Log "✅ All servers started successfully!" "SUCCESS"
    return $true
}

# Main script logic
Write-Log "=== Enhanced Quibish Server Manager Started ===" "INFO"

if ($Stop) {
    Stop-Servers
    exit
}

if ($Status -or $HealthCheck) {
    Get-ServerStatus
    exit
}

if ($Restart) {
    Stop-Servers
    Start-Sleep -Seconds 3
}

# Start servers with full validation
$success = Start-ServersWithValidation

if ($success) {
    Write-Log "=== Server startup complete ===" "SUCCESS"
    Write-Log "🌐 Backend: http://localhost:5001" "INFO"
    Write-Log "🌐 Frontend: http://localhost:3000" "INFO"
    Write-Log "🏥 API Health: http://localhost:5001/api/health" "INFO"
    Write-Log "📊 Startup Status: http://localhost:5001/api/startup" "INFO"
    
    # Final status check
    Start-Sleep -Seconds 2
    Get-ServerStatus
    
    Write-Host "`n🎉 Quibish servers are running with health monitoring!" -ForegroundColor Green
    Write-Host "📱 Access your app at: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🔧 Backend API at: http://localhost:5001" -ForegroundColor Cyan
    Write-Host "🏥 Health Dashboard: http://localhost:5001/api/health/detailed" -ForegroundColor Cyan
} else {
    Write-Log "❌ Server startup failed. Check logs for details." "ERROR"
    exit 1
}

Write-Host "`n💡 Enhanced Usage:" -ForegroundColor Yellow
Write-Host "   .\enhanced-start-servers.ps1              # Start servers with health checks"
Write-Host "   .\enhanced-start-servers.ps1 -Status      # Check status with health info"
Write-Host "   .\enhanced-start-servers.ps1 -Detailed    # Detailed health information"
Write-Host "   .\enhanced-start-servers.ps1 -HealthCheck # Quick health check"
Write-Host "   .\enhanced-start-servers.ps1 -Stop        # Stop servers"
Write-Host "   .\enhanced-start-servers.ps1 -Restart     # Restart servers"
Write-Host "   .\enhanced-start-servers.ps1 -Force       # Force restart servers"