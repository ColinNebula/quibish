# Quibish Application Startup Script
# Starts backend (port 5001) and frontend (port 3000) in separate windows

function Test-Port {
    param([int]$Port)
    return $null -ne (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Wait-ForPort {
    param([int]$Port, [int]$TimeoutSeconds = 30)
    $elapsed = 0
    while (-not (Test-Port -Port $Port) -and $elapsed -lt $TimeoutSeconds) {
        Start-Sleep -Seconds 1
        $elapsed++
    }
    return Test-Port -Port $Port
}

Write-Host "Starting Quibish Application..." -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Backend dependencies
Write-Host "Checking backend dependencies..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\backend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install --silent
}
Pop-Location

# Start backend if not running
Write-Host "Checking Backend Server (Port 5001)..." -ForegroundColor Yellow
if (Test-Port -Port 5001) {
    Write-Host "Backend already running on port 5001" -ForegroundColor Green
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; node stable-server.js" -WindowStyle Normal
    Write-Host "Waiting for backend..." -ForegroundColor Yellow
    if (Wait-ForPort -Port 5001 -TimeoutSeconds 30) {
        Write-Host "Backend started on port 5001" -ForegroundColor Green
    } else {
        Write-Host "Backend taking longer than expected - check the backend window for errors" -ForegroundColor Yellow
    }
}

# Frontend dependencies
Write-Host "Checking frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "$PSScriptRoot\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install --silent
}

# Start frontend if not running
Write-Host "Checking Frontend Server (Port 3000)..." -ForegroundColor Yellow
if (Test-Port -Port 3000) {
    Write-Host "Frontend already running on port 3000" -ForegroundColor Green
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm start" -WindowStyle Normal
    Write-Host "Waiting for frontend (this can take up to 60s on first run)..." -ForegroundColor Yellow
    if (Wait-ForPort -Port 3000 -TimeoutSeconds 60) {
        Write-Host "Frontend started on port 3000" -ForegroundColor Green
    } else {
        Write-Host "Frontend still starting - check the frontend window for progress" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Service Status:" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:5001" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000/quibish" -ForegroundColor White
Write-Host ""

Start-Sleep -Seconds 2
Start-Process "http://localhost:3000/quibish"

Write-Host "Application is ready!" -ForegroundColor Green