# Quibish Server Startup Script
param(
    [switch]$Production,
    [switch]$Development,
    [switch]$Monitor
)

Write-Host "🚀 Quibish Server Management Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

function Start-ProductionServers {
    Write-Host "🏭 Starting Production Servers with PM2..." -ForegroundColor Yellow
    
    # Stop any existing PM2 processes
    pm2 stop ecosystem.config.js 2>$null
    
    # Start with PM2
    pm2 start ecosystem.config.js --env production
    
    # Show status
    pm2 status
    
    Write-Host "✅ Production servers started!" -ForegroundColor Green
    Write-Host "📊 Monitor with: npm run pm2:monitor" -ForegroundColor Cyan
    Write-Host "📋 View logs with: npm run pm2:logs" -ForegroundColor Cyan
}

function Start-DevelopmentServers {
    Write-Host "🛠️ Starting Development Servers..." -ForegroundColor Yellow
    
    # Kill any existing node processes
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Start with concurrently
    npm run dev
}

function Start-Monitoring {
    Write-Host "📊 Starting Health Monitor..." -ForegroundColor Yellow
    node monitor.js
}

# Main logic
if ($Production) {
    Start-ProductionServers
}
elseif ($Development) {
    Start-DevelopmentServers
}
elseif ($Monitor) {
    Start-Monitoring
}
else {
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  .\server-manager.ps1 -Production   # Start with PM2 (production)" -ForegroundColor White
    Write-Host "  .\server-manager.ps1 -Development  # Start with concurrently (dev)" -ForegroundColor White
    Write-Host "  .\server-manager.ps1 -Monitor      # Start health monitor" -ForegroundColor White
    Write-Host ""
    Write-Host "Quick commands:" -ForegroundColor Cyan
    Write-Host "  npm run dev           # Development mode" -ForegroundColor White
    Write-Host "  npm run pm2:start     # Production mode" -ForegroundColor White
    Write-Host "  npm run pm2:monitor   # PM2 monitoring" -ForegroundColor White
}