# Quibish Production Monitoring and Recovery System
# Provides automatic health monitoring, alerting, and recovery for production environments

param(
    [int]$MonitorInterval = 60,           # Seconds between health checks
    [int]$AlertThreshold = 3,             # Failed checks before alert
    [int]$RecoveryAttempts = 2,           # Auto-recovery attempts
    [switch]$EnableRecovery,              # Enable automatic recovery
    [switch]$EnableEmail,                 # Enable email alerts
    [string]$EmailTo = "admin@quibish.com",
    [string]$LogLevel = "INFO",           # DEBUG, INFO, WARN, ERROR
    [switch]$Daemon                       # Run as background daemon
)

# Configuration
$config = @{
    services = @{
        backend = @{
            name = "Backend API"
            port = 5001
            healthUrl = "http://localhost:5001/api/health"
            startupUrl = "http://localhost:5001/api/startup"
            criticalThresholds = @{
                responseTime = 5000  # ms
                memoryUsage = 512    # MB
                cpuUsage = 90        # percent
            }
            restartCommand = "d:\Development\quibish\service-dependency-manager-fixed.ps1"
        }
        frontend = @{
            name = "Frontend App"
            port = 3000
            healthUrl = "http://localhost:3000"
            criticalThresholds = @{
                responseTime = 10000 # ms
            }
            restartCommand = "d:\Development\quibish\service-dependency-manager-fixed.ps1"
        }
    }
    alerting = @{
        consecutiveFailuresBeforeAlert = $AlertThreshold
        recoveryAttemptsBeforeEscalation = $RecoveryAttempts
        cooldownPeriod = 300  # seconds between recovery attempts
    }
    monitoring = @{
        metricsRetention = 24 * 60 * 60  # 24 hours in seconds
        performanceLogInterval = 300     # 5 minutes
    }
}

# Global state
$global:healthHistory = @{}
$global:alertState = @{}
$global:performanceMetrics = @{}
$global:lastRecoveryAttempt = @{}

function Write-MonitorLog {
    param($Message, $Level = "INFO", $Service = "MONITOR", $Alert = $false)
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = @{
        timestamp = $timestamp
        service = $Service
        level = $Level
        message = $Message
        alert = $Alert
    }
    
    # Check log level
    $levels = @("DEBUG", "INFO", "WARN", "ERROR")
    $currentLevelIndex = $levels.IndexOf($LogLevel)
    $messageLevelIndex = $levels.IndexOf($Level)
    
    if ($messageLevelIndex -ge $currentLevelIndex) {
        $colors = @{
            "DEBUG" = "Gray"
            "INFO" = "White"
            "WARN" = "Yellow"
            "ERROR" = "Red"
        }
        
        $color = $colors[$Level]
        $prefix = if ($Alert) { "🚨 ALERT" } else { "" }
        $logMessage = "[$timestamp] [$Service] [$Level] $prefix $Message"
        
        Write-Host $logMessage -ForegroundColor $color
        
        # Log to file
        $logPath = "d:\Development\quibish\logs\monitor.log"
        if (!(Test-Path (Split-Path $logPath))) {
            New-Item -ItemType Directory -Path (Split-Path $logPath) -Force | Out-Null
        }
        Add-Content -Path $logPath -Value $logMessage
        
        # Log structured data for analysis
        $jsonLogPath = "d:\Development\quibish\logs\monitor.json"
        $jsonLog = $logEntry | ConvertTo-Json -Compress
        Add-Content -Path $jsonLogPath -Value $jsonLog
    }
}

function Get-ServiceHealth {
    param($ServiceName)
    
    $service = $config.services[$ServiceName]
    if (!$service) { return $null }
    
    $healthData = @{
        serviceName = $ServiceName
        timestamp = Get-Date
        running = $false
        healthy = $false
        responseTime = $null
        statusCode = $null
        memoryUsage = $null
        cpuUsage = $null
        errors = @()
    }
    
    try {
        # Check if service is running (by port)
        $netstat = netstat -ano | findstr ":$($service.port).*LISTENING"
        if (!$netstat) {
            $healthData.errors += "Service not listening on port $($service.port)"
            return $healthData
        }
        
        $healthData.running = $true
        
        # Measure response time and get health data
        $startTime = Get-Date
        $response = Invoke-RestMethod -Uri $service.healthUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
        $endTime = Get-Date
        
        $healthData.responseTime = ($endTime - $startTime).TotalMilliseconds
        $healthData.statusCode = 200
        $healthData.healthy = $true
        
        # Extract performance metrics if available
        if ($response.memory) {
            $healthData.memoryUsage = [math]::Round($response.memory.heapUsed / 1MB, 2)
        }
        
        # Check thresholds
        $thresholds = $service.criticalThresholds
        if ($healthData.responseTime -gt $thresholds.responseTime) {
            $healthData.errors += "Response time ($([math]::Round($healthData.responseTime, 0))ms) exceeds threshold ($($thresholds.responseTime)ms)"
            $healthData.healthy = $false
        }
        
        if ($healthData.memoryUsage -and $thresholds.memoryUsage -and $healthData.memoryUsage -gt $thresholds.memoryUsage) {
            $healthData.errors += "Memory usage ($($healthData.memoryUsage)MB) exceeds threshold ($($thresholds.memoryUsage)MB)"
            $healthData.healthy = $false
        }
        
    } catch {
        $healthData.errors += "Health check failed: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            $healthData.statusCode = $_.Exception.Response.StatusCode.value__
        }
    }
    
    return $healthData
}

function Update-HealthHistory {
    param($ServiceName, $HealthData)
    
    if (!$global:healthHistory[$ServiceName]) {
        $global:healthHistory[$ServiceName] = @()
    }
    
    # Add current health data
    $global:healthHistory[$ServiceName] += $HealthData
    
    # Trim old data (keep only last 24 hours)
    $cutoffTime = (Get-Date).AddSeconds(-$config.monitoring.metricsRetention)
    $global:healthHistory[$ServiceName] = $global:healthHistory[$ServiceName] | Where-Object {
        $_.timestamp -gt $cutoffTime
    }
}

function Test-AlertConditions {
    param($ServiceName, $HealthData)
    
    if (!$global:alertState[$ServiceName]) {
        $global:alertState[$ServiceName] = @{
            consecutiveFailures = 0
            alertActive = $false
            lastAlertTime = $null
        }
    }
    
    $alertState = $global:alertState[$ServiceName]
    
    if (!$HealthData.healthy) {
        $alertState.consecutiveFailures++
        
        # Check if we should trigger an alert
        if ($alertState.consecutiveFailures -ge $config.alerting.consecutiveFailuresBeforeAlert -and !$alertState.alertActive) {
            $alertState.alertActive = $true
            $alertState.lastAlertTime = Get-Date
            
            $errorDetails = $HealthData.errors -join "; "
            Send-Alert $ServiceName "Service $ServiceName is unhealthy" $errorDetails
            
            # Attempt recovery if enabled
            if ($EnableRecovery) {
                Start-RecoveryProcess $ServiceName
            }
        }
    } else {
        # Service is healthy
        if ($alertState.alertActive) {
            # Service recovered
            $alertState.alertActive = $false
            $recoveryTime = if ($alertState.lastAlertTime) {
                [math]::Round(((Get-Date) - $alertState.lastAlertTime).TotalMinutes, 1)
            } else { "unknown" }
            
            Send-Alert $ServiceName "Service $ServiceName has recovered" "Recovery time: $recoveryTime minutes"
        }
        $alertState.consecutiveFailures = 0
    }
}

function Send-Alert {
    param($ServiceName, $Subject, $Details)
    
    $alertMessage = "🚨 QUIBISH ALERT: $Subject`n`nService: $ServiceName`nTime: $(Get-Date)`nDetails: $Details"
    
    Write-MonitorLog $Subject "ERROR" $ServiceName $true
    Write-MonitorLog "Alert details: $Details" "ERROR" $ServiceName
    
    if ($EnableEmail) {
        try {
            # In a real production environment, you would send an actual email here
            Write-MonitorLog "Email alert sent to $EmailTo" "INFO" "ALERT"
        } catch {
            Write-MonitorLog "Failed to send email alert: $($_.Exception.Message)" "ERROR" "ALERT"
        }
    }
    
    # Could also integrate with Slack, Teams, PagerDuty, etc.
}

function Start-RecoveryProcess {
    param($ServiceName)
    
    $service = $config.services[$ServiceName]
    if (!$service) { return }
    
    # Check cooldown period
    $lastAttempt = $global:lastRecoveryAttempt[$ServiceName]
    if ($lastAttempt -and ((Get-Date) - $lastAttempt).TotalSeconds -lt $config.alerting.cooldownPeriod) {
        Write-MonitorLog "Recovery attempt skipped - cooldown period active" "WARN" $ServiceName
        return
    }
    
    $global:lastRecoveryAttempt[$ServiceName] = Get-Date
    
    Write-MonitorLog "Starting automatic recovery for $ServiceName" "WARN" $ServiceName
    
    try {
        # Execute recovery command
        if ($service.restartCommand) {
            Write-MonitorLog "Executing recovery command: $($service.restartCommand)" "INFO" $ServiceName
            
            $result = & $service.restartCommand 2>&1
            
            Write-MonitorLog "Recovery command completed" "INFO" $ServiceName
            
            # Wait a bit and check if recovery was successful
            Start-Sleep -Seconds 30
            $healthCheck = Get-ServiceHealth $ServiceName
            
            if ($healthCheck.healthy) {
                Write-MonitorLog "Automatic recovery successful" "INFO" $ServiceName
                Send-Alert $ServiceName "Automatic recovery successful" "Service $ServiceName recovered automatically"
            } else {
                Write-MonitorLog "Automatic recovery failed" "ERROR" $ServiceName
                Send-Alert $ServiceName "Automatic recovery failed" "Service $ServiceName did not recover after restart attempt"
            }
        }
    } catch {
        Write-MonitorLog "Recovery process failed: $($_.Exception.Message)" "ERROR" $ServiceName
    }
}

function Get-PerformanceReport {
    $report = @{
        timestamp = Get-Date
        services = @{}
        summary = @{
            totalServices = $config.services.Count
            healthyServices = 0
            alertActiveServices = 0
        }
    }
    
    foreach ($serviceName in $config.services.Keys) {
        $recentHistory = $global:healthHistory[$serviceName] | Where-Object {
            $_.timestamp -gt (Get-Date).AddMinutes(-60)  # Last hour
        }
        
        if ($recentHistory) {
            $avgResponseTime = ($recentHistory | Where-Object { $_.responseTime } | Measure-Object -Property responseTime -Average).Average
            $uptimePercent = (($recentHistory | Where-Object { $_.healthy }).Count / $recentHistory.Count) * 100
            
            $report.services[$serviceName] = @{
                averageResponseTime = [math]::Round($avgResponseTime, 2)
                uptimePercentage = [math]::Round($uptimePercent, 2)
                totalChecks = $recentHistory.Count
                healthyChecks = ($recentHistory | Where-Object { $_.healthy }).Count
                currentStatus = if ($recentHistory[-1].healthy) { "Healthy" } else { "Unhealthy" }
            }
            
            if ($recentHistory[-1].healthy) {
                $report.summary.healthyServices++
            }
        }
        
        if ($global:alertState[$serviceName] -and $global:alertState[$serviceName].alertActive) {
            $report.summary.alertActiveServices++
        }
    }
    
    return $report
}

function Start-MonitoringLoop {
    Write-MonitorLog "Starting Quibish production monitoring system" "INFO" "SYSTEM"
    Write-MonitorLog "Monitor interval: ${MonitorInterval}s, Recovery: $EnableRecovery, Email: $EnableEmail" "INFO" "SYSTEM"
    
    $loopCount = 0
    
    while ($true) {
        try {
            $loopCount++
            Write-MonitorLog "Health check cycle #$loopCount" "DEBUG" "SYSTEM"
            
            # Check health of all services
            foreach ($serviceName in $config.services.Keys) {
                $healthData = Get-ServiceHealth $serviceName
                Update-HealthHistory $serviceName $healthData
                Test-AlertConditions $serviceName $healthData
                
                $status = if ($healthData.healthy) { "✅" } else { "❌" }
                $responseTime = if ($healthData.responseTime) { "$([math]::Round($healthData.responseTime, 0))ms" } else { "N/A" }
                
                Write-MonitorLog "$status $($config.services[$serviceName].name): $responseTime" "DEBUG" $serviceName
            }
            
            # Generate performance report every 5 minutes
            if ($loopCount % [math]::Max(1, ($config.monitoring.performanceLogInterval / $MonitorInterval)) -eq 0) {
                $report = Get-PerformanceReport
                Write-MonitorLog "Performance Report - Healthy: $($report.summary.healthyServices)/$($report.summary.totalServices), Alerts: $($report.summary.alertActiveServices)" "INFO" "SYSTEM"
                
                # Log detailed performance metrics
                foreach ($serviceName in $report.services.Keys) {
                    $serviceReport = $report.services[$serviceName]
                    Write-MonitorLog "Performance: Uptime $($serviceReport.uptimePercentage)%, Avg Response $($serviceReport.averageResponseTime)ms" "DEBUG" $serviceName
                }
            }
            
            # Wait for next cycle
            Start-Sleep -Seconds $MonitorInterval
            
        } catch {
            Write-MonitorLog "Error in monitoring loop: $($_.Exception.Message)" "ERROR" "SYSTEM"
            Start-Sleep -Seconds ($MonitorInterval / 2)  # Shorter retry on error
        }
    }
}

# Main execution
if ($Daemon) {
    Start-MonitoringLoop
} else {
    # Single health check run
    Write-MonitorLog "=== Quibish Health Check ===" "INFO" "SYSTEM"
    
    foreach ($serviceName in $config.services.Keys) {
        $healthData = Get-ServiceHealth $serviceName
        Update-HealthHistory $serviceName $healthData
        
        $status = if ($healthData.healthy) { "✅ Healthy" } else { "❌ Unhealthy" }
        $details = ""
        
        if ($healthData.responseTime) {
            $details += "Response: $([math]::Round($healthData.responseTime, 0))ms"
        }
        if ($healthData.memoryUsage) {
            $details += ", Memory: $($healthData.memoryUsage)MB"
        }
        if ($healthData.errors) {
            $details += ", Errors: $($healthData.errors -join '; ')"
        }
        
        Write-MonitorLog "$status $($config.services[$serviceName].name) $details" "INFO" $serviceName
    }
    
    # Show summary report
    $report = Get-PerformanceReport
    Write-MonitorLog "=== Summary: $($report.summary.healthyServices)/$($report.summary.totalServices) services healthy ===" "INFO" "SYSTEM"
}