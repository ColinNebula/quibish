# Simple Network Connectivity Test
param(
    [string]$ServerUrl = "http://localhost:5001",
    [int]$TestCount = 10
)

Write-Host "Network Connectivity Test" -ForegroundColor Blue
Write-Host "=========================" -ForegroundColor Blue
Write-Host "Server: $ServerUrl" -ForegroundColor White
Write-Host "Tests: $TestCount" -ForegroundColor White
Write-Host ""

$successCount = 0
$totalTime = 0

$endpoints = @(
    "/api/health",
    "/api/network/diagnostics", 
    "/api/network/test",
    "/signaling"
)

foreach ($i in 1..$TestCount) {
    Write-Host "Test $i/$TestCount" -ForegroundColor Cyan
    
    foreach ($endpoint in $endpoints) {
        $url = "$ServerUrl$endpoint"
        $startTime = Get-Date
        
        try {
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing
            $responseTime = (Get-Date) - $startTime
            $totalTime += $responseTime.TotalMilliseconds
            
            if ($response.StatusCode -eq 200) {
                $successCount++
                Write-Host "  $endpoint - OK ($($response.StatusCode)) - $([math]::Round($responseTime.TotalMilliseconds, 2))ms" -ForegroundColor Green
            } else {
                Write-Host "  $endpoint - Failed ($($response.StatusCode))" -ForegroundColor Red
            }
        } catch {
            $responseTime = (Get-Date) - $startTime
            $totalTime += $responseTime.TotalMilliseconds
            Write-Host "  $endpoint - Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    if ($i -lt $TestCount) {
        Start-Sleep -Seconds 1
    }
}

$totalTests = $TestCount * $endpoints.Count
$successRate = [math]::Round(($successCount / $totalTests) * 100, 2)
$avgResponseTime = [math]::Round($totalTime / $totalTests, 2)

Write-Host ""
Write-Host "RESULTS" -ForegroundColor Blue
Write-Host "=======" -ForegroundColor Blue
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $($totalTests - $successCount)" -ForegroundColor Red
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 95) { "Green" } else { "Yellow" })
Write-Host "Average Response Time: ${avgResponseTime}ms" -ForegroundColor White