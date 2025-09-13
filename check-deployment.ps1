#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Check GitHub Pages deployment status for Quibish

.DESCRIPTION
    This script checks if the GitHub Pages deployment is working
    and provides troubleshooting steps if not.
#>

Write-Host "🔍 Checking GitHub Pages deployment status..." -ForegroundColor Cyan

# Test the GitHub Pages URL
$url = "https://colinnebula.github.io/quibish/"
Write-Host "🌐 Testing URL: $url" -ForegroundColor Blue

try {
    $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ SUCCESS! GitHub Pages is working!" -ForegroundColor Green
    Write-Host "📊 Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "🚀 Your app is live at: $url" -ForegroundColor Cyan
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ GitHub Pages not accessible" -ForegroundColor Red
    Write-Host "📊 Status Code: $statusCode" -ForegroundColor Red
    
    if ($statusCode -eq 404) {
        Write-Host ""
        Write-Host "🔧 404 Error - Common Solutions:" -ForegroundColor Yellow
        Write-Host "1. 🔓 Make repository public:" -ForegroundColor White
        Write-Host "   → https://github.com/ColinNebula/quibish/settings" -ForegroundColor Gray
        Write-Host "   → Danger Zone → Change repository visibility → Public" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. ⚙️ Enable GitHub Pages:" -ForegroundColor White
        Write-Host "   → Settings → Pages → Deploy from branch → gh-pages → Save" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. ⏱️ Wait 5-10 minutes for DNS propagation" -ForegroundColor White
        Write-Host ""
        Write-Host "4. 🔄 Check again with: .\check-deployment.ps1" -ForegroundColor White
    }
}

# Check local gh-pages branch
Write-Host ""
Write-Host "📋 Checking local deployment files..." -ForegroundColor Blue

$currentBranch = git branch --show-current
git checkout gh-pages 2>$null

if (Test-Path "index.html") {
    Write-Host "✅ index.html exists" -ForegroundColor Green
} else {
    Write-Host "❌ index.html missing" -ForegroundColor Red
}

if (Test-Path "static") {
    Write-Host "✅ static/ directory exists" -ForegroundColor Green
} else {
    Write-Host "❌ static/ directory missing" -ForegroundColor Red
}

# Switch back to original branch
git checkout $currentBranch 2>$null

Write-Host ""
Write-Host "💡 If issues persist, run: .\deploy-github.ps1" -ForegroundColor Cyan