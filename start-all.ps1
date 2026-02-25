# Quibish Application Startup Script
# This script ensures all required services are running

Write-Host "`n🚀 Starting Quibish Application...`n" -ForegroundColor Cyan

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Function to wait for a port to be available
function Wait-ForPort {
    param([int]$Port, [int]$TimeoutSeconds = 30)
    $elapsed = 0
    while (-not (Test-Port -Port $Port) -and $elapsed -lt $TimeoutSeconds) {
        Start-Sleep -Seconds 1
        $elapsed++
    }
    return Test-Port -Port $Port
}

# Check Node.js installation
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check Backend Dependencies
Write-Host "`n📦 Checking backend dependencies..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\backend"
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing backend dependencies..." -ForegroundColor Yellow
    npm install --silent
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Backend dependencies already installed" -ForegroundColor Green
}
Pop-Location

# Backend Server (Port 5001)
Write-Host "`n🔧 Checking Backend Server (Port 5001)..." -ForegroundColor Yellow
if (Test-Port -Port 5001) {
    Write-Host "✅ Backend server is already running on port 5001" -ForegroundColor Green
} else {
    Write-Host "🔄 Starting backend server..." -ForegroundColor Yellow
    
    # Start backend in a new PowerShell window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host '🚀 Quibish Backend Server' -ForegroundColor Cyan; Write-Host '=========================' -ForegroundColor Cyan; Write-Host ''; node server.js" -WindowStyle Normal
    
    # Wait for backend to start
    Write-Host "⏳ Waiting for backend server to start..." -ForegroundColor Yellow
    if (Wait-ForPort -Port 5001 -TimeoutSeconds 30) {
        Write-Host "✅ Backend server started successfully on port 5001" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Backend server taking longer than expected to start" -ForegroundColor Yellow
        Write-Host "   Check the backend window for errors" -ForegroundColor Yellow
    }
}

# Check Frontend Dependencies
Write-Host "`n📦 Checking frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "$PSScriptRoot\node_modules")) {
    Write-Host "📥 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install --silent
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Frontend dependencies already installed" -ForegroundColor Green
}

# Frontend Server (Port 3000)
Write-Host "`n🎨 Checking Frontend Server (Port 3000)..." -ForegroundColor Yellow
if (Test-Port -Port 3000) {
    Write-Host "✅ Frontend server is already running on port 3000" -ForegroundColor Green
} else {
    Write-Host "🔄 Starting frontend server..." -ForegroundColor Yellow
    
    # Start frontend in a new PowerShell window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host '🎨 Quibish Frontend Server' -ForegroundColor Cyan; Write-Host '==========================' -ForegroundColor Cyan; Write-Host ''; npm start" -WindowStyle Normal
    
    # Wait for frontend to start
    Write-Host "⏳ Waiting for frontend server to start..." -ForegroundColor Yellow
    if (Wait-ForPort -Port 3000 -TimeoutSeconds 60) {
        Write-Host "✅ Frontend server started successfully on port 3000" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Frontend server taking longer than expected to start" -ForegroundColor Yellow
        Write-Host "   This is normal for the first run. Please wait..." -ForegroundColor Yellow
    }
}

# Final status
Write-Host "`n✨ Startup Complete!`n" -ForegroundColor Green
Write-Host "📊 Service Status:" -ForegroundColor Cyan
Write-Host "   🔧 Backend:  http://localhost:5001" -ForegroundColor White
Write-Host "   🎨 Frontend: http://localhost:3000/quibish" -ForegroundColor White

Write-Host "`n💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Backend and Frontend are running in separate windows" -ForegroundColor White
Write-Host "   - Check those windows if you encounter any errors" -ForegroundColor White
Write-Host "   - Press Ctrl+C in those windows to stop the servers" -ForegroundColor White

# Open the app in the default browser
Write-Host "`n🌐 Opening application in browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000/quibish"

Write-Host "`n✅ Application is ready to use!`n" -ForegroundColor Green
