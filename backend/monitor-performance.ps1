# Server Performance Monitoring
# This script monitors server performance and provides optimization insights

param(
    [int]$Duration = 300,  # Monitor for 5 minutes by default
    [int]$Interval = 5,    # Check every 5 seconds
    [switch]$Continuous = $false
)

$ServerUrl = "http://localhost:5001"
$LogPath = "D:\Development\quibish\logs"
$MetricsFile = Join-Path $LogPath "performance-metrics-$(Get-Date -Format 'yyyy-MM-dd-HH-mm').json"

# Ensure log directory exists
if (!(Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

$Metrics = @{
    StartTime = Get-Date
    Checks = @()
    Summary = @{}
}

function Test-ServerPerformance {
    $startTime = Get-Date
    $success = $false
    $responseTime = 0
    $error = $null
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/health" -Method GET -TimeoutSec 10
        $responseTime = (Get-Date) - $startTime
        $success = $response.status -eq "online"
        
        return @{
            Timestamp = $startTime
            Success = $success
            ResponseTimeMs = $responseTime.TotalMilliseconds
            ServerUptime = $response.uptime
            MemoryUsage = $response.memory
            Error = $null
        }
    }
    catch {
        $responseTime = (Get-Date) - $startTime
        return @{
            Timestamp = $startTime
            Success = $false
            ResponseTimeMs = $responseTime.TotalMilliseconds
            ServerUptime = $null
            MemoryUsage = $null
            Error = $_.Exception.Message
        }
    }
}

function Write-PerformanceReport {
    param($Check)
    
    $status = if ($Check.Success) { "✅" } else { "❌" }
    $responseTime = [math]::Round($Check.ResponseTimeMs, 2)
    
    if ($Check.Success) {
        $memoryMB = [math]::Round($Check.MemoryUsage.rss / 1024 / 1024, 2)
        $uptime = [math]::Round($Check.ServerUptime, 2)
        Write-Host "$status [$($Check.Timestamp.ToString('HH:mm:ss'))] Response: ${responseTime}ms | Memory: ${memoryMB}MB | Uptime: ${uptime}s" -ForegroundColor Green
    } else {
        Write-Host "$status [$($Check.Timestamp.ToString('HH:mm:ss'))] FAILED: ${responseTime}ms | Error: $($Check.Error)" -ForegroundColor Red
    }
}

function Show-Summary {
    $totalChecks = $Metrics.Checks.Count
    $successfulChecks = ($Metrics.Checks | Where-Object { $_.Success }).Count
    $failedChecks = $totalChecks - $successfulChecks
    $successRate = if ($totalChecks -gt 0) { [math]::Round(($successfulChecks / $totalChecks) * 100, 2) } else { 0 }
    
    $responseTimes = $Metrics.Checks | Where-Object { $_.Success } | ForEach-Object { $_.ResponseTimeMs }
    $avgResponseTime = if ($responseTimes.Count -gt 0) { [math]::Round(($responseTimes | Measure-Object -Average).Average, 2) } else { 0 }
    $maxResponseTime = if ($responseTimes.Count -gt 0) { [math]::Round(($responseTimes | Measure-Object -Maximum).Maximum, 2) } else { 0 }
    $minResponseTime = if ($responseTimes.Count -gt 0) { [math]::Round(($responseTimes | Measure-Object -Minimum).Minimum, 2) } else { 0 }
    
    Write-Host ""
    Write-Host "📊 PERFORMANCE SUMMARY" -ForegroundColor Blue
    Write-Host "======================" -ForegroundColor Blue
    Write-Host "Total Checks: $totalChecks" -ForegroundColor White
    Write-Host "Successful: $successfulChecks" -ForegroundColor Green
    Write-Host "Failed: $failedChecks" -ForegroundColor Red
    Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 95) { "Green" } elseif ($successRate -ge 80) { "Yellow" } else { "Red" })
    Write-Host ""
    Write-Host "Response Times:" -ForegroundColor Cyan
    Write-Host "  Average: ${avgResponseTime}ms" -ForegroundColor White
    Write-Host "  Minimum: ${minResponseTime}ms" -ForegroundColor White
    Write-Host "  Maximum: ${maxResponseTime}ms" -ForegroundColor White
    
    # Performance recommendations
    Write-Host ""
    Write-Host "💡 RECOMMENDATIONS" -ForegroundColor Yellow
    Write-Host "===================" -ForegroundColor Yellow
    
    if ($successRate -lt 95) {
        Write-Host "⚠️  Server reliability is below 95% - consider implementing auto-restart" -ForegroundColor Red
    }
    
    if ($avgResponseTime -gt 1000) {
        Write-Host "⚠️  Average response time is over 1 second - server may be overloaded" -ForegroundColor Red
    } elseif ($avgResponseTime -gt 500) {
        Write-Host "⚠️  Average response time is over 500ms - consider performance optimization" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Response times are good" -ForegroundColor Green
    }
    
    if ($maxResponseTime -gt 5000) {
        Write-Host "⚠️  Maximum response time exceeds 5 seconds - investigate bottlenecks" -ForegroundColor Red
    }
    
    # Save metrics
    $Metrics.Summary = @{
        TotalChecks = $totalChecks
        SuccessfulChecks = $successfulChecks
        FailedChecks = $failedChecks
        SuccessRate = $successRate
        AverageResponseTime = $avgResponseTime
        MinResponseTime = $minResponseTime
        MaxResponseTime = $maxResponseTime
        Duration = (Get-Date) - $Metrics.StartTime
    }
    
    $Metrics | ConvertTo-Json -Depth 5 | Out-File -FilePath $MetricsFile -Encoding UTF8
    Write-Host ""
    Write-Host "📝 Metrics saved to: $MetricsFile" -ForegroundColor Cyan
}

# Main monitoring loop
Write-Host "🔍 Server Performance Monitor" -ForegroundColor Blue
Write-Host "=============================" -ForegroundColor Blue
Write-Host "Server: $ServerUrl" -ForegroundColor White
Write-Host "Duration: $(if ($Continuous) { 'Continuous' } else { "$Duration seconds" })" -ForegroundColor White
Write-Host "Interval: $Interval seconds" -ForegroundColor White
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

$endTime = if ($Continuous) { [DateTime]::MaxValue } else { (Get-Date).AddSeconds($Duration) }

try {
    while ((Get-Date) -lt $endTime) {
        $check = Test-ServerPerformance
        $Metrics.Checks += $check
        Write-PerformanceReport -Check $check
        
        Start-Sleep -Seconds $Interval
    }
}
catch {
    Write-Host ""
    Write-Host "⏹️  Monitoring stopped by user" -ForegroundColor Yellow
}

Show-Summary