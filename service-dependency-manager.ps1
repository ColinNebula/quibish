# Quibish Service Dependency Manager
# Ensures proper startup order and validates all dependencies before launching

param(
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Verbose
)

$services = @{
    "database" = @{
        name = "Database Service"
        port = $null
        healthUrl = $null
        startCommand = $null
        dependencies = @()
        validationScript = {
            # Try to connect to MySQL
            try {
                $mysqlPath = "mysql"
                $testResult = & $mysqlPath -u root -p"root" -e "SELECT 1;" 2>$null
                return $true
            } catch {
                return $false
            }
        }
        optional = $true
    }
    "backend" = @{
        name = "Backend API Server"
        port = 5001
        healthUrl = "http://localhost:5001/api/health"
        startCommand = "d:\Development\quibish\backend\node server.js"
        dependencies = @()
        validationScript = {
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:5001/api/startup" -Method GET -TimeoutSec 3
                return $response.initialized -eq $true
            } catch {
                return $false
            }
        }
        optional = $false
    }
    "frontend" = @{
        name = "Frontend React Server"
        port = 3000
        healthUrl = "http://localhost:3000"
        startCommand = "d:\Development\quibish\npm start"
        dependencies = @("backend")
        validationScript = {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5
                return $response.StatusCode -eq 200 -and $response.Content.Length -gt 1000
            } catch {
                return $false
            }
        }
        optional = $false
    }
}

function Write-ServiceLog {
    param($Message, $Level = "INFO", $Service = "SYSTEM")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $colorMap = @{
        "INFO" = "White"
        "SUCCESS" = "Green" 
        "WARN" = "Yellow"
        "ERROR" = "Red"
        "DEBUG" = "Gray"
    }
    
    $color = $colorMap[$Level]
    if (!$color) { $color = "White" }
    
    $logMessage = "[$timestamp] [$Service] [$Level] $Message"
    Write-Host $logMessage -ForegroundColor $color
    
    # Log to file
    $logPath = "d:\Development\quibish\logs\service-manager.log"
    if (!(Test-Path (Split-Path $logPath))) {
        New-Item -ItemType Directory -Path (Split-Path $logPath) -Force | Out-Null
    }
    Add-Content -Path $logPath -Value $logMessage
}

function Get-ProcessByPort {
    param($Port)
    if (!$Port) { return $null }
    
    $netstat = netstat -ano | findstr ":$Port.*LISTENING"
    if ($netstat) {
        $processId = ($netstat -split '\s+')[-1]
        return Get-Process -Id $processId -ErrorAction SilentlyContinue
    }
    return $null
}

function Test-ServiceRunning {
    param($ServiceName)
    
    $service = $services[$ServiceName]
    if (!$service) { return $false }
    
    if ($service.port) {
        $process = Get-ProcessByPort $service.port
        return $process -ne $null
    }
    
    return $false
}

function Test-ServiceHealth {
    param($ServiceName)
    
    $service = $services[$ServiceName]
    if (!$service) { return $false }
    
    try {
        if ($service.validationScript) {
            return & $service.validationScript
        }
        return $false
    } catch {
        Write-ServiceLog "Health check failed: $($_.Exception.Message)" "ERROR" $ServiceName
        return $false
    }
}

function Test-ServiceDependencies {
    param($ServiceName)
    
    $service = $services[$ServiceName]
    if (!$service -or !$service.dependencies) { return $true }
    
    $failedDeps = @()
    
    foreach ($dep in $service.dependencies) {
        if (!(Test-ServiceRunning $dep)) {
            $failedDeps += $dep
            continue
        }
        
        if (!(Test-ServiceHealth $dep)) {
            $failedDeps += "$dep (unhealthy)"
        }
    }
    
    if ($failedDeps.Count -gt 0) {
        Write-ServiceLog "Missing dependencies: $($failedDeps -join ', ')" "ERROR" $ServiceName
        return $false
    }
    
    return $true
}

function Start-ServiceWithDependencies {
    param($ServiceName, $MaxRetries = 3)
    
    $service = $services[$ServiceName]
    if (!$service) {
        Write-ServiceLog "Unknown service: $ServiceName" "ERROR" "SYSTEM"
        return $false
    }
    
    Write-ServiceLog "Starting $($service.name)..." "INFO" $ServiceName
    
    # Check if already running
    if (Test-ServiceRunning $ServiceName) {
        if (Test-ServiceHealth $ServiceName) {
            Write-ServiceLog "Already running and healthy" "SUCCESS" $ServiceName
            return $true
        } else {
            Write-ServiceLog "Running but unhealthy, will restart" "WARN" $ServiceName
            Stop-Service $ServiceName
        }
    }
    
    # Check dependencies
    if (!(Test-ServiceDependencies $ServiceName)) {
        if (!$service.optional) {
            Write-ServiceLog "Cannot start - dependencies not met" "ERROR" $ServiceName
            return $false
        } else {
            Write-ServiceLog "Dependencies not met, but service is optional" "WARN" $ServiceName
        }
    }
    
    # Start the service
    $retryCount = 0
    while ($retryCount -lt $MaxRetries) {
        $retryCount++
        
        if ($DryRun) {
            Write-ServiceLog "DRY RUN: Would start with command: $($service.startCommand)" "DEBUG" $ServiceName
            return $true
        }
        
        try {
            Write-ServiceLog "Starting attempt $retryCount/$MaxRetries" "INFO" $ServiceName
            
            # Special handling for different services
            switch ($ServiceName) {
                "backend" {
                    Set-Location "d:\Development\quibish\backend"
                    $job = Start-Job -Name "quibish-backend" -ScriptBlock {
                        Set-Location "d:\Development\quibish\backend"
                        node server.js
                    }
                    
                    # Wait for initialization
                    $timeout = 30
                    $elapsed = 0
                    while ($elapsed -lt $timeout) {
                        Start-Sleep -Seconds 2
                        $elapsed += 2
                        
                        if (Test-ServiceRunning $ServiceName) {
                            if (Test-ServiceHealth $ServiceName) {
                                Write-ServiceLog "Started successfully in ${elapsed}s" "SUCCESS" $ServiceName
                                return $true
                            }
                        }
                    }
                }
                
                "frontend" {
                    Set-Location "d:\Development\quibish"
                    $job = Start-Job -Name "quibish-frontend" -ScriptBlock {
                        Set-Location "d:\Development\quibish"
                        npm start
                    }
                    
                    # Wait for compilation and startup
                    $timeout = 60
                    $elapsed = 0
                    while ($elapsed -lt $timeout) {
                        Start-Sleep -Seconds 3
                        $elapsed += 3
                        
                        if (Test-ServiceRunning $ServiceName) {
                            if (Test-ServiceHealth $ServiceName) {
                                Write-ServiceLog "Started successfully in ${elapsed}s" "SUCCESS" $ServiceName
                                return $true
                            }
                        }
                    }
                }
            }
            
            Write-ServiceLog "Failed to start within timeout" "ERROR" $ServiceName
            
        } catch {
            Write-ServiceLog "Start attempt failed: $($_.Exception.Message)" "ERROR" $ServiceName
        }
        
        if ($retryCount -lt $MaxRetries) {
            Write-ServiceLog "Retrying in 5 seconds..." "INFO" $ServiceName
            Start-Sleep -Seconds 5
        }
    }
    
    Write-ServiceLog "Failed to start after $MaxRetries attempts" "ERROR" $ServiceName
    return $false
}

function Stop-Service {
    param($ServiceName)
    
    $service = $services[$ServiceName]
    if (!$service) { return }
    
    Write-ServiceLog "Stopping $($service.name)..." "INFO" $ServiceName
    
    if ($service.port) {
        $process = Get-ProcessByPort $service.port
        if ($process) {
            Stop-Process -Id $process.Id -Force
            Write-ServiceLog "Stopped process (PID: $($process.Id))" "SUCCESS" $ServiceName
        }
    }
    
    # Stop related job if exists
    $jobName = "quibish-$ServiceName"
    $job = Get-Job -Name $jobName -ErrorAction SilentlyContinue
    if ($job) {
        Stop-Job -Job $job
        Remove-Job -Job $job
        Write-ServiceLog "Stopped background job" "SUCCESS" $ServiceName
    }
}

function Get-ServiceStatus {
    Write-ServiceLog "=== Service Status Report ===" "INFO" "SYSTEM"
    
    foreach ($serviceName in $services.Keys) {
        $service = $services[$serviceName]
        $running = Test-ServiceRunning $serviceName
        $healthy = if ($running) { Test-ServiceHealth $serviceName } else { $false }
        $depsOk = Test-ServiceDependencies $serviceName
        
        $status = "❌ Stopped"
        if ($running -and $healthy) {
            $status = "✅ Running & Healthy"
        } elseif ($running) {
            $status = "⚠️ Running but Unhealthy"
        }
        
        $depsStatus = if ($depsOk) { "✅" } else { "❌" }
        
        Write-ServiceLog "$status - Dependencies: $depsStatus" "INFO" $serviceName
        
        if ($Verbose -and $running) {
            $process = Get-ProcessByPort $service.port
            if ($process) {
                Write-ServiceLog "  PID: $($process.Id), Port: $($service.port)" "DEBUG" $serviceName
            }
        }
    }
}

function Start-AllServices {
    Write-ServiceLog "=== Starting All Quibish Services ===" "INFO" "SYSTEM"
    
    # Define startup order (respecting dependencies)
    $startupOrder = @("database", "backend", "frontend")
    
    $results = @{}
    
    foreach ($serviceName in $startupOrder) {
        $service = $services[$serviceName]
        
        if ($service.optional -and !$Force) {
            if (!(Test-ServiceDependencies $serviceName)) {
                Write-ServiceLog "Skipping optional service due to missing dependencies" "INFO" $serviceName
                $results[$serviceName] = "skipped"
                continue
            }
        }
        
        $success = Start-ServiceWithDependencies $serviceName
        $results[$serviceName] = if ($success) { "success" } else { "failed" }
        
        if (!$success -and !$service.optional) {
            Write-ServiceLog "Critical service failed to start - aborting startup" "ERROR" "SYSTEM"
            break
        }
    }
    
    # Final status check
    Start-Sleep -Seconds 3
    Get-ServiceStatus
    
    $successCount = ($results.Values | Where-Object { $_ -eq "success" }).Count
    $totalCount = $results.Count
    
    Write-ServiceLog "=== Startup Complete: $successCount/$totalCount services started ===" "INFO" "SYSTEM"
    
    return $results
}

# Main execution
Write-ServiceLog "=== Quibish Service Dependency Manager ===" "INFO" "SYSTEM"

if ($DryRun) {
    Write-ServiceLog "DRY RUN MODE - No actual changes will be made" "WARN" "SYSTEM"
}

# Show current status
Get-ServiceStatus

# Start all services
$results = Start-AllServices

# Final health check
Write-ServiceLog "Performing final health validation..." "INFO" "SYSTEM"
Start-Sleep -Seconds 5

$allHealthy = $true
foreach ($serviceName in $services.Keys) {
    $service = $services[$serviceName]
    if (!$service.optional) {
        $running = Test-ServiceRunning $serviceName
        $healthy = if ($running) { Test-ServiceHealth $serviceName } else { $false }
        
        if (!$running -or !$healthy) {
            $allHealthy = $false
            break
        }
    }
}

if ($allHealthy) {
    Write-ServiceLog "🎉 All critical services are running and healthy!" "SUCCESS" "SYSTEM"
    Write-ServiceLog "🌐 Frontend: http://localhost:3000" "INFO" "SYSTEM"
    Write-ServiceLog "🔧 Backend: http://localhost:5001" "INFO" "SYSTEM"
    Write-ServiceLog "🏥 Health: http://localhost:5001/api/health" "INFO" "SYSTEM"
} else {
    Write-ServiceLog "⚠️ Some services are not healthy - check logs for details" "WARN" "SYSTEM"
    exit 1
}