# Quibish Startup Guide

## Quick Start

To start the complete Quibish application with all required services:

```powershell
npm run start:all
```

This command will:
1. ✅ Check if Node.js is installed
2. 🔧 Start the backend server on port 5001 (if not running)
3. 🎨 Start the frontend server on port 3000 (if not running)
4. 🌐 Open the application in your default browser

## Manual Startup

If you prefer to start services manually:

### 1. Start Backend Server
```powershell
cd backend
node server.js
```

### 2. Start Frontend Server
```powershell
npm start
```

## Stopping All Services

To stop all running services:

```powershell
npm run stop:all
```

## Service Endpoints

- **Backend API**: http://localhost:5001/api
- **Frontend App**: http://localhost:3000/quibish
- **Backend Health**: http://localhost:5001/api/health

## Troubleshooting

### Port Already in Use

If you get a port conflict error:
```powershell
# Stop all services first
npm run stop:all

# Then restart
npm run start:all
```

### Backend Not Responding

Check the backend terminal window for errors. Common issues:
- Missing dependencies: `cd backend && npm install`
- Database connection issues: Check MongoDB/MySQL configuration

### Frontend Build Errors

Clear cache and reinstall:
```powershell
Remove-Item -Recurse -Force node_modules
npm install
npm run start:all
```

## Development Mode

For development with auto-restart on changes:
```powershell
npm run dev
```

This runs both backend and frontend concurrently with live reload.

## Process Manager (PM2)

For production-like environment with process management:
```powershell
npm run pm2:start   # Start with PM2
npm run pm2:status  # Check status
npm run pm2:logs    # View logs
npm run pm2:stop    # Stop all
```

## Checking Service Status

You can manually check if services are running:

```powershell
# Check port 5001 (Backend)
Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue

# Check port 3000 (Frontend)
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
```
