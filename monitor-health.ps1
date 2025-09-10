# Quibish System Monitoring Script
# Continuously monitors the health and performance of both frontend and backend services

param(
    [int]$IntervalSeconds = 60,
    [switch]$Continuous,
    [switch]$AlertOnly,
    [string]$OutputFile,
    [switch]$JSON
)

$BackendUrl = "http://localhost:5001"
$FrontendUrl = "http://localhost:3000"
$LogPath = "d:\Development\quibish\logs"

# Create logs directory if it doesn't exist
if (!(Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath | Out-Null
}

function Write-MonitorLog {
    param($Message, $Level = "INFO", $Data = $null)
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = @{
        timestamp = $timestamp
        level = $Level
        message = $Message
        data = $Data
    }
    
    if ($JSON) {
        $jsonLog = $logEntry | ConvertTo-Json -Compress
        if ($OutputFile) {
            Add-Content -Path $OutputFile -Value $jsonLog
        } else {
            Write-Host $jsonLog
        }
    } else {
        $logMessage = "[$timestamp] [$Level] $Message"
        
        if (!$AlertOnly -or $Level -in @("WARN", "ERROR", "CRITICAL")) {
            switch ($Level) {
                "ERROR" { Write-Host $logMessage -ForegroundColor Red }
                "WARN" { Write-Host $logMessage -ForegroundColor Yellow }
                "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
                "CRITICAL" { Write-Host $logMessage -ForegroundColor Magenta }
                default { Write-Host $logMessage }
            }
        }
        
        if ($OutputFile) {
            Add-Content -Path $OutputFile -Value $logMessage
        }
    }
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

function Get-ServiceHealth {
    $healthReport = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        backend = @{
            running = $false
            pid = $null
            health = @{}
            startup = @{}
            performance = @{}
        }
        frontend = @{
            running = $false
            pid = $null
            health = @{}
            performance = @{}
        }
        system = @{
            memory = @{}
            cpu = @{}
            disk = @{}
        }
    }
    
    # Check backend
    $backendProcess = Get-ProcessByPort 5001
    if ($backendProcess) {
        $healthReport.backend.running = $true
        $healthReport.backend.pid = $backendProcess.Id
        
        try {
            # Backend health check
            $healthResponse = Invoke-RestMethod -Uri "$BackendUrl/api/health" -Method GET -TimeoutSec 5
            $healthReport.backend.health = $healthResponse
            
            # Backend startup status
            $startupResponse = Invoke-RestMethod -Uri "$BackendUrl/api/startup" -Method GET -TimeoutSec 5
            $healthReport.backend.startup = $startupResponse
            
            # Backend performance metrics
            $healthReport.backend.performance = @{
                uptime = $healthResponse.uptime
                memory = $healthResponse.memory
                responseTime = (Measure-Command { 
                    Invoke-RestMethod -Uri "$BackendUrl/api/health" -Method GET -TimeoutSec 2 
                }).TotalMilliseconds
            }
            
        } catch {
            $healthReport.backend.health.error = $_.Exception.Message
        }
    }
    
    # Check frontend
    $frontendProcess = Get-ProcessByPort 3000
    if ($frontendProcess) {
        $healthReport.frontend.running = $true
        $healthReport.frontend.pid = $frontendProcess.Id
        
        try {
            # Frontend health check
            $responseTime = Measure-Command { 
                $response = Invoke-WebRequest -Uri $FrontendUrl -Method GET -TimeoutSec 10
                $healthReport.frontend.health.status = $response.StatusCode
                $healthReport.frontend.health.contentLength = $response.Content.Length
            }
            
            $healthReport.frontend.performance = @{
                responseTime = $responseTime.TotalMilliseconds
                contentLoaded = $response.Content.Length -gt 1000
            }
            
        } catch {
            $healthReport.frontend.health.error = $_.Exception.Message
        }
    }
    
    # System metrics
    try {
        $memoryInfo = Get-CimInstance -ClassName Win32_OperatingSystem
        $healthReport.system.memory = @{
            totalGB = [math]::Round($memoryInfo.TotalVisibleMemorySize / 1MB, 2)
            freeGB = [math]::Round($memoryInfo.FreePhysicalMemory / 1MB, 2)
            usedPercent = [math]::Round((1 - ($memoryInfo.FreePhysicalMemory / $memoryInfo.TotalVisibleMemorySize)) * 100, 2)
        }
        
        $cpuInfo = Get-CimInstance -ClassName Win32_Processor | Measure-Object -Property LoadPercentage -Average
        $healthReport.system.cpu = @{
            loadPercent = [math]::Round($cpuInfo.Average, 2)
        }
        
        $diskInfo = Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 -and $_.DeviceID -eq "C:" }
        if ($diskInfo) {
            $healthReport.system.disk = @{
                totalGB = [math]::Round($diskInfo.Size / 1GB, 2)
                freeGB = [math]::Round($diskInfo.FreeSpace / 1GB, 2)
                usedPercent = [math]::Round((1 - ($diskInfo.FreeSpace / $diskInfo.Size)) * 100, 2)
            }
        }
    } catch {
        $healthReport.system.error = $_.Exception.Message
    }
    
    return $healthReport
}

function Analyze-HealthReport {
    param($HealthReport)
    
    $alerts = @()
    $warnings = @()
    $info = @()
    
    # Backend analysis
    if (!$HealthReport.backend.running) {
        $alerts += "Backend service is not running"
    } elseif ($HealthReport.backend.health.error) {
        $alerts += "Backend health check failed: $($HealthReport.backend.health.error)"
    } elseif (!$HealthReport.backend.startup.initialized) {
        $warnings += "Backend is running but not fully initialized"
    } else {
        $info += "Backend is healthy (PID: $($HealthReport.backend.pid))"
        
        # Check backend performance
        if ($HealthReport.backend.performance.responseTime -gt 1000) {
            $warnings += "Backend response time is high: $([math]::Round($HealthReport.backend.performance.responseTime, 0))ms"
        }
        
        # Check backend memory
        if ($HealthReport.backend.performance.memory.heapUsed -gt 100MB) {
            $warnings += "Backend memory usage is high: $([math]::Round($HealthReport.backend.performance.memory.heapUsed / 1MB, 0))MB"
        }
    }
    
    # Frontend analysis
    if (!$HealthReport.frontend.running) {
        $alerts += "Frontend service is not running"
    } elseif ($HealthReport.frontend.health.error) {
        $alerts += "Frontend health check failed: $($HealthReport.frontend.health.error)"
    } elseif ($HealthReport.frontend.health.status -ne 200) {
        $warnings += "Frontend returned HTTP status: $($HealthReport.frontend.health.status)"
    } else {
        $info += "Frontend is healthy (PID: $($HealthReport.frontend.pid))"
        
        # Check frontend performance
        if ($HealthReport.frontend.performance.responseTime -gt 3000) {
            $warnings += "Frontend response time is high: $([math]::Round($HealthReport.frontend.performance.responseTime, 0))ms"
        }
    }
    
    # System analysis
    if ($HealthReport.system.memory.usedPercent -gt 90) {
        $alerts += "System memory usage is critical: $($HealthReport.system.memory.usedPercent)%"
    } elseif ($HealthReport.system.memory.usedPercent -gt 80) {
        $warnings += "System memory usage is high: $($HealthReport.system.memory.usedPercent)%"
    }
    
    if ($HealthReport.system.cpu.loadPercent -gt 90) {
        $alerts += "System CPU usage is critical: $($HealthReport.system.cpu.loadPercent)%"
    } elseif ($HealthReport.system.cpu.loadPercent -gt 80) {
        $warnings += "System CPU usage is high: $($HealthReport.system.cpu.loadPercent)%"
    }
    
    if ($HealthReport.system.disk.usedPercent -gt 95) {
        $alerts += "System disk usage is critical: $($HealthReport.system.disk.usedPercent)%"
    } elseif ($HealthReport.system.disk.usedPercent -gt 85) {
        $warnings += "System disk usage is high: $($HealthReport.system.disk.usedPercent)%"
    }
    
    return @{
        alerts = $alerts
        warnings = $warnings
        info = $info
    }
}

function Show-HealthSummary {
    param($HealthReport, $Analysis)
    
    if (!$JSON) {
        Write-Host "`n📊 Quibish Health Summary - $($HealthReport.timestamp)" -ForegroundColor Cyan
        Write-Host "=" * 60
        
        # Services status
        $backendStatus = if ($HealthReport.backend.running) { "✅ Running" } else { "❌ Stopped" }
        $frontendStatus = if ($HealthReport.frontend.running) { "✅ Running" } else { "❌ Stopped" }
        
        Write-Host "🔧 Backend:  $backendStatus" -ForegroundColor $(if ($HealthReport.backend.running) { "Green" } else { "Red" })
        Write-Host "🌐 Frontend: $frontendStatus" -ForegroundColor $(if ($HealthReport.frontend.running) { "Green" } else { "Red" })
        
        # System metrics
        Write-Host "💾 Memory: $($HealthReport.system.memory.usedPercent)% used ($($HealthReport.system.memory.freeGB)GB free)" -ForegroundColor $(
            if ($HealthReport.system.memory.usedPercent -gt 80) { "Yellow" } else { "White" }
        )
        Write-Host "⚡ CPU: $($HealthReport.system.cpu.loadPercent)% load" -ForegroundColor $(
            if ($HealthReport.system.cpu.loadPercent -gt 80) { "Yellow" } else { "White" }
        )
        Write-Host "💿 Disk: $($HealthReport.system.disk.usedPercent)% used ($($HealthReport.system.disk.freeGB)GB free)" -ForegroundColor $(
            if ($HealthReport.system.disk.usedPercent -gt 85) { "Yellow" } else { "White" }
        )
    }
    
    # Alerts
    foreach ($alert in $Analysis.alerts) {
        Write-MonitorLog $alert "CRITICAL"
    }
    
    # Warnings
    foreach ($warning in $Analysis.warnings) {
        Write-MonitorLog $warning "WARN"
    }
    
    # Info (only if not in alert-only mode)
    if (!$AlertOnly) {
        foreach ($infoMsg in $Analysis.info) {
            Write-MonitorLog $infoMsg "SUCCESS"
        }
    }
}

# Main monitoring loop
Write-MonitorLog "🔍 Starting Quibish health monitoring..." "INFO"
Write-MonitorLog "⏱️ Monitoring interval: ${IntervalSeconds}s" "INFO"
Write-MonitorLog "📊 Alert-only mode: $AlertOnly" "INFO"
Write-MonitorLog "💾 Output file: $(if ($OutputFile) { $OutputFile } else { 'Console only' })" "INFO"

if ($OutputFile) {
    Write-MonitorLog "📝 Logging to: $OutputFile" "INFO"
}

do {
    try {
        # Get health report
        $healthReport = Get-ServiceHealth
        
        # Analyze for issues
        $analysis = Analyze-HealthReport $healthReport
        
        # Show summary
        Show-HealthSummary $healthReport $analysis
        
        # Log full report if JSON mode
        if ($JSON) {
            Write-MonitorLog "Health Report" "INFO" $healthReport
        }
        
        # Wait for next check
        if ($Continuous) {
            Start-Sleep -Seconds $IntervalSeconds
        }
        
    } catch {
        Write-MonitorLog "Error during health check: $($_.Exception.Message)" "ERROR"
        if ($Continuous) {
            Start-Sleep -Seconds ($IntervalSeconds / 2) # Shorter retry interval on error
        }
    }
    
} while ($Continuous)

Write-MonitorLog "🏁 Health monitoring completed" "INFO"