# Enhanced Network Connectivity Test Suite
# This script provides comprehensive network diagnostics and performance testing

param(
    [string]$ServerUrl = "http://localhost:5001",
    [int]$TestDuration = 60,
    [int]$ConcurrentRequests = 5,
    [switch]$Verbose = $false,
    [switch]$ContinuousMode = $false
)

$ErrorActionPreference = "Continue"

# Test configuration
$Endpoints = @(
    @{ Path = "/api/health"; Method = "GET"; Name = "Health Check" },
    @{ Path = "/api/network/diagnostics"; Method = "GET"; Name = "Network Diagnostics" },
    @{ Path = "/api/network/test"; Method = "GET"; Name = "Connection Test" },
    @{ Path = "/api/auth/login"; Method = "POST"; Name = "Authentication"; Body = @{ username = "admin"; password = "admin" } },
    @{ Path = "/signaling"; Method = "GET"; Name = "Signaling Endpoint" }
)

$Results = @{
    StartTime = Get-Date
    Tests = @()
    Summary = @{}
    Errors = @()
}

function Write-TestLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss.fff"
    
    switch ($Level) {
        "SUCCESS" { Write-Host "[$timestamp] [OK] $Message" -ForegroundColor Green }
        "ERROR"   { Write-Host "[$timestamp] [ERR] $Message" -ForegroundColor Red }
        "WARN"    { Write-Host "[$timestamp] [WARN] $Message" -ForegroundColor Yellow }
        "DEBUG"   { if ($Verbose) { Write-Host "[$timestamp] [DBG] $Message" -ForegroundColor Cyan } }
        default   { Write-Host "[$timestamp] [INFO] $Message" -ForegroundColor White }
    }
}

function Test-NetworkEndpoint {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = $null,
        [int]$TimeoutSeconds = 30
    )
    
    $startTime = Get-Date
    $success = $false
    $statusCode = 0
    $responseTime = 0
    $errorMessage = $null
    $responseData = $null
    
    try {
        $requestParams = @{
            Uri = $Url
            Method = $Method
            TimeoutSec = $TimeoutSeconds
            UseBasicParsing = $true
            Headers = @{
                'User-Agent' = 'PowerShell-NetworkTester/1.0'
                'Accept' = 'application/json'
                'Connection' = 'keep-alive'
            }
        }
        
        if ($Body -and $Method -in @("POST", "PUT", "PATCH")) {
            $requestParams.Body = ($Body | ConvertTo-Json -Depth 10)
            $requestParams.ContentType = "application/json"
        }
        
        Write-TestLog "Testing $Method $Url" "DEBUG"
        
        $response = Invoke-WebRequest @requestParams
        $responseTime = (Get-Date) - $startTime
        
        $success = $true
        $statusCode = $response.StatusCode
        
        # Try to parse JSON response
        try {
            $responseData = $response.Content | ConvertFrom-Json
        } catch {
            $responseData = $response.Content
        }
        
        Write-TestLog "$Method $Url - Success ($statusCode) in $($responseTime.TotalMilliseconds)ms" "SUCCESS"
        
    } catch {
        $responseTime = (Get-Date) - $startTime
        $errorMessage = $_.Exception.Message
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        
        Write-TestLog "$Method $Url - Failed ($statusCode): $errorMessage" "ERROR"
        $Results.Errors += @{
            Timestamp = Get-Date
            Url = $Url
            Method = $Method
            Error = $errorMessage
            StatusCode = $statusCode
        }
    }
    
    return @{
        Url = $Url
        Method = $Method
        Success = $success
        StatusCode = $statusCode
        ResponseTime = $responseTime.TotalMilliseconds
        Error = $errorMessage
        Response = $responseData
        Timestamp = $startTime
    }
}

function Test-ServerConnectivity {
    Write-TestLog "Testing basic server connectivity..." "INFO"
    
    # Parse server URL
    $uri = [System.Uri]$ServerUrl
    $hostname = $uri.Host
    $port = $uri.Port
    
    # Test DNS resolution
    try {
        $dnsResult = Resolve-DnsName -Name $hostname -ErrorAction Stop
        Write-TestLog "DNS resolution successful for $hostname" "SUCCESS"
    } catch {
        Write-TestLog "DNS resolution failed for $hostname" "ERROR"
        return $false
    }
    
    # Test TCP connection
    try {
        $tcpTest = Test-NetConnection -ComputerName $hostname -Port $port -WarningAction SilentlyContinue
        if ($tcpTest.TcpTestSucceeded) {
            Write-TestLog "TCP connection successful to ${hostname}:${port}" "SUCCESS"
            return $true
        } else {
            Write-TestLog "TCP connection failed to ${hostname}:${port}" "ERROR"
            return $false
        }
    } catch {
        Write-TestLog "TCP connection test failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Start-ConcurrentTests {
    param([array]$TestCases, [int]$ConcurrentCount)
    
    Write-TestLog "Starting $ConcurrentCount concurrent tests..." "INFO"
    
    $jobs = @()
    foreach ($i in 1..$ConcurrentCount) {
        $job = Start-Job -ScriptBlock {
            param($ServerUrl, $Endpoints, $TestId)
            
            $results = @()
            foreach ($endpoint in $Endpoints) {
                $url = "$ServerUrl$($endpoint.Path)"
                
                try {
                    $requestParams = @{
                        Uri = $url
                        Method = $endpoint.Method
                        TimeoutSec = 30
                        UseBasicParsing = $true
                    }
                    
                    if ($endpoint.Body -and $endpoint.Method -in @("POST", "PUT")) {
                        $requestParams.Body = ($endpoint.Body | ConvertTo-Json)
                        $requestParams.ContentType = "application/json"
                    }
                    
                    $startTime = Get-Date
                    $response = Invoke-WebRequest @requestParams
                    $responseTime = (Get-Date) - $startTime
                    
                    $results += @{
                        TestId = $TestId
                        Endpoint = $endpoint.Name
                        Url = $url
                        Method = $endpoint.Method
                        Success = $true
                        StatusCode = $response.StatusCode
                        ResponseTime = $responseTime.TotalMilliseconds
                        Timestamp = $startTime
                    }
                } catch {
                    $responseTime = (Get-Date) - $startTime
                    $results += @{
                        TestId = $TestId
                        Endpoint = $endpoint.Name
                        Url = $url
                        Method = $endpoint.Method
                        Success = $false
                        StatusCode = 0
                        ResponseTime = $responseTime.TotalMilliseconds
                        Error = $_.Exception.Message
                        Timestamp = $startTime
                    }
                }
            }
            return $results
        } -ArgumentList $ServerUrl, $Endpoints, $i
        
        $jobs += $job
    }
    
    # Wait for all jobs to complete
    $allResults = @()
    foreach ($job in $jobs) {
        $jobResults = Receive-Job -Job $job -Wait
        $allResults += $jobResults
        Remove-Job -Job $job
    }
    
    return $allResults
}

function Show-TestSummary {
    $totalTests = $Results.Tests.Count
    $successfulTests = ($Results.Tests | Where-Object { $_.Success }).Count
    $failedTests = $totalTests - $successfulTests
    $successRate = if ($totalTests -gt 0) { [math]::Round(($successfulTests / $totalTests) * 100, 2) } else { 0 }
    
    $responseTimes = $Results.Tests | Where-Object { $_.Success } | ForEach-Object { $_.ResponseTime }
    $avgResponseTime = if ($responseTimes.Count -gt 0) { [math]::Round(($responseTimes | Measure-Object -Average).Average, 2) } else { 0 }
    $maxResponseTime = if ($responseTimes.Count -gt 0) { [math]::Round(($responseTimes | Measure-Object -Maximum).Maximum, 2) } else { 0 }
    $minResponseTime = if ($responseTimes.Count -gt 0) { [math]::Round(($responseTimes | Measure-Object -Minimum).Minimum, 2) } else { 0 }
    
    Write-Host ""
    Write-Host "📊 NETWORK CONNECTIVITY TEST SUMMARY" -ForegroundColor Blue
    Write-Host "======================================" -ForegroundColor Blue
    Write-Host "Server URL: $ServerUrl" -ForegroundColor White
    Write-Host "Test Duration: $((Get-Date) - $Results.StartTime)" -ForegroundColor White
    Write-Host ""
    Write-Host "📈 STATISTICS" -ForegroundColor Cyan
    Write-Host "Total Tests: $totalTests" -ForegroundColor White
    Write-Host "Successful: $successfulTests" -ForegroundColor Green
    Write-Host "Failed: $failedTests" -ForegroundColor Red
    Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 95) { "Green" } elseif ($successRate -ge 80) { "Yellow" } else { "Red" })
    Write-Host ""
    Write-Host "⏱️  RESPONSE TIMES" -ForegroundColor Cyan
    Write-Host "Average: ${avgResponseTime}ms" -ForegroundColor White
    Write-Host "Minimum: ${minResponseTime}ms" -ForegroundColor White
    Write-Host "Maximum: ${maxResponseTime}ms" -ForegroundColor White
    
    # Show endpoint breakdown
    Write-Host ""
    Write-Host "🎯 ENDPOINT BREAKDOWN" -ForegroundColor Cyan
    $endpointStats = $Results.Tests | Group-Object Url | ForEach-Object {
        $endpointTests = $_.Group
        $endpointSuccess = ($endpointTests | Where-Object { $_.Success }).Count
        $endpointTotal = $endpointTests.Count
        $endpointRate = if ($endpointTotal -gt 0) { [math]::Round(($endpointSuccess / $endpointTotal) * 100, 1) } else { 0 }
        
        "$($_.Name): $endpointSuccess/$endpointTotal ($endpointRate%)"
    }
    $endpointStats | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    
    # Show errors if any
    if ($Results.Errors.Count -gt 0) {
        Write-Host ""
        Write-Host "❌ ERRORS ENCOUNTERED" -ForegroundColor Red
        $Results.Errors | ForEach-Object {
            Write-Host "  $($_.Timestamp.ToString('HH:mm:ss')) - $($_.Method) $($_.Url): $($_.Error)" -ForegroundColor Red
        }
    }
    
    # Recommendations
    Write-Host ""
    Write-Host "💡 RECOMMENDATIONS" -ForegroundColor Yellow
    Write-Host "===================" -ForegroundColor Yellow
    
    if ($successRate -lt 95) {
        Write-Host "⚠️  Network reliability is below 95% - investigate connection issues" -ForegroundColor Red
    } else {
        Write-Host "✅ Network reliability is excellent" -ForegroundColor Green
    }
    
    if ($avgResponseTime -gt 1000) {
        Write-Host "⚠️  Average response time is over 1 second - check server performance" -ForegroundColor Red
    } elseif ($avgResponseTime -gt 500) {
        Write-Host "⚠️  Average response time is over 500ms - consider optimization" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Response times are good" -ForegroundColor Green
    }
    
    if ($maxResponseTime -gt 5000) {
        Write-Host "⚠️  Maximum response time exceeds 5 seconds - investigate bottlenecks" -ForegroundColor Red
    }
}

# Main execution
Write-Host "🌐 Enhanced Network Connectivity Tester" -ForegroundColor Blue
Write-Host "=======================================" -ForegroundColor Blue
Write-Host "Server: $ServerUrl" -ForegroundColor White
Write-Host "Duration: $(if ($ContinuousMode) { 'Continuous' } else { "$TestDuration seconds" })" -ForegroundColor White
Write-Host "Concurrent Requests: $ConcurrentRequests" -ForegroundColor White
Write-Host ""

# Test basic connectivity first
if (-not (Test-ServerConnectivity)) {
    Write-TestLog "Basic connectivity test failed. Exiting." "ERROR"
    exit 1
}

Write-Host ""
Write-TestLog "Starting comprehensive network tests..." "INFO"

$endTime = if ($ContinuousMode) { [DateTime]::MaxValue } else { (Get-Date).AddSeconds($TestDuration) }

try {
    while ((Get-Date) -lt $endTime) {
        # Run individual endpoint tests
        foreach ($endpoint in $Endpoints) {
            $url = "$ServerUrl$($endpoint.Path)"
            $result = Test-NetworkEndpoint -Url $url -Method $endpoint.Method -Body $endpoint.Body
            $Results.Tests += $result
        }
        
        # Run concurrent tests
        if ($ConcurrentRequests -gt 1) {
            Write-TestLog "Running concurrent stress test..." "INFO"
            $concurrentResults = Start-ConcurrentTests -TestCases $Endpoints -ConcurrentCount $ConcurrentRequests
            $Results.Tests += $concurrentResults
        }
        
        # Short pause between test cycles
        Start-Sleep -Seconds 2
        
        # Show progress every 10 seconds
        if (($Results.Tests.Count % 10) -eq 0) {
            $successCount = ($Results.Tests | Where-Object { $_.Success }).Count
            $totalCount = $Results.Tests.Count
            $currentRate = if ($totalCount -gt 0) { [math]::Round(($successCount / $totalCount) * 100, 1) } else { 0 }
            Write-TestLog "Progress: $successCount/$totalCount tests passed ($currentRate%)" "INFO"
        }
    }
} catch {
    Write-TestLog "Test interrupted: $($_.Exception.Message)" "WARN"
} finally {
    Show-TestSummary
}