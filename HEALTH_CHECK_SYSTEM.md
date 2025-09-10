# Quibish Health Check and Monitoring System

This document describes the comprehensive health check and monitoring system implemented for the Quibish application to ensure smooth operation before launch and during production.

## 🏥 Health Check Architecture

### Overview
The Quibish health check system provides multi-layered validation and monitoring across both frontend and backend services, with automatic recovery capabilities and production monitoring.

### Components

#### 1. Backend Health Check Service (`backend/middleware/healthCheck.js`)
- **Purpose**: Validates backend service health and dependencies
- **Features**:
  - Database connectivity validation
  - Filesystem access verification
  - Dependency checking (Node.js modules)
  - Memory usage monitoring
  - Environment validation
  - Timeout handling with configurable limits

#### 2. Backend Startup Service (`backend/services/startupService.js`)
- **Purpose**: Ensures backend initialization with comprehensive validation
- **Features**:
  - Step-by-step initialization logging
  - Environment validation (Node.js version, memory)
  - Directory structure creation
  - Dependencies verification
  - Database initialization with fallback
  - Health checks integration
  - Monitoring setup with error handling

#### 3. Frontend Health Service (`src/services/frontendHealthService.js`)
- **Purpose**: Validates frontend environment and dependencies
- **Features**:
  - Browser capability detection
  - React and JavaScript feature validation
  - Local storage functionality testing
  - API connectivity verification
  - Authentication system validation
  - Essential services checking (WebRTC, File API, Notifications)

#### 4. Service Dependency Manager (`service-dependency-manager-fixed.ps1`)
- **Purpose**: Manages startup order and dependencies between services
- **Features**:
  - Dependency graph validation
  - Sequential service startup
  - Health validation for each service
  - Retry mechanisms with timeout handling
  - Dry-run mode for testing

#### 5. Production Monitor (`production-monitor.ps1`)
- **Purpose**: Continuous monitoring and automatic recovery for production
- **Features**:
  - Real-time health monitoring
  - Performance metrics collection
  - Automatic alert generation
  - Recovery attempt automation
  - Historical data retention
  - Email notification support

## 🚀 Available Health Check Endpoints

### Backend Endpoints
- `GET /api/health` - Basic health status
- `GET /api/health/detailed` - Comprehensive health report with all checks
- `GET /api/startup` - Initialization status and step details
- `GET /api/ping` - Simple connectivity test

### Health Check Data Structure
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-09-10T21:18:26.721Z",
  "uptime": 27.0518128,
  "memory": {
    "rss": 79409152,
    "heapTotal": 38916096,
    "heapUsed": 34740536,
    "external": 20704668
  },
  "checks": {
    "database": {
      "status": "healthy|warning|unhealthy",
      "message": "Status description",
      "responseTime": 15,
      "timestamp": "2025-09-10T21:18:26.721Z"
    }
  }
}
```

## 🛠️ PowerShell Scripts

### Enhanced Startup Script (`enhanced-start-servers.ps1`)
```powershell
# Start servers with full validation
.\enhanced-start-servers.ps1

# Check status with health information
.\enhanced-start-servers.ps1 -Status

# Detailed health information
.\enhanced-start-servers.ps1 -Detailed

# Quick health check only
.\enhanced-start-servers.ps1 -HealthCheck

# Stop all servers
.\enhanced-start-servers.ps1 -Stop

# Restart servers with validation
.\enhanced-start-servers.ps1 -Restart

# Force restart (kill existing processes)
.\enhanced-start-servers.ps1 -Force
```

### Service Dependency Manager
```powershell
# Test dependency validation (no changes)
.\service-dependency-manager-fixed.ps1 -DryRun

# Start all services in proper order
.\service-dependency-manager-fixed.ps1

# Verbose output for debugging
.\service-dependency-manager-fixed.ps1 -Verbose

# Force start even with missing optional dependencies
.\service-dependency-manager-fixed.ps1 -Force
```

### Production Monitor
```powershell
# Single health check
.\production-monitor.ps1

# Continuous monitoring (daemon mode)
.\production-monitor.ps1 -Daemon

# Enable automatic recovery
.\production-monitor.ps1 -Daemon -EnableRecovery

# Custom monitoring interval (60 seconds default)
.\production-monitor.ps1 -Daemon -MonitorInterval 30

# Enable email alerts
.\production-monitor.ps1 -Daemon -EnableEmail -EmailTo "admin@quibish.com"

# Debug mode with verbose logging
.\production-monitor.ps1 -Daemon -LogLevel "DEBUG"
```

### Simple Health Check (`simple-health-check.ps1`)
```powershell
# Quick status check
.\simple-health-check.ps1
```

### Monitor Health Script (`monitor-health.ps1`)
```powershell
# Continuous monitoring with alerts
.\monitor-health.ps1 -Continuous

# Alert-only mode (suppress info messages)
.\monitor-health.ps1 -Continuous -AlertOnly

# Custom interval (60 seconds default)
.\monitor-health.ps1 -Continuous -IntervalSeconds 30

# JSON output for integration
.\monitor-health.ps1 -JSON

# Log to file
.\monitor-health.ps1 -Continuous -OutputFile "health-log.txt"
```

## 📊 Health Check Flow

### Application Startup Sequence

1. **Backend Initialization**
   ```
   Environment Validation → Directory Structure → Dependencies Check → 
   Database Initialization → Health Checks → Monitoring Setup
   ```

2. **Frontend Initialization**
   ```
   Environment Validation → Dependencies Check → Local Storage → 
   API Connectivity → Authentication → Essential Services
   ```

3. **Service Dependency Validation**
   ```
   Database (Optional) → Backend (Required) → Frontend (Required)
   ```

### Health Check Categories

#### Critical Checks (Must Pass)
- Service process running on expected port
- Basic HTTP connectivity
- Authentication system functional
- Core dependencies available

#### Warning Checks (Can Fail with Degraded Service)
- Database connectivity (fallback to in-memory)
- Optional browser features (WebRTC, Notifications)
- Performance thresholds (response time, memory)

#### Informational Checks
- Environment configuration
- Performance metrics
- System resource usage

## 🔧 Configuration

### Backend Health Check Registration
```javascript
// Register a custom health check
healthCheck.registerCheck('custom-service', async () => {
  // Your validation logic
  return {
    status: 'healthy|warning|unhealthy',
    message: 'Status description',
    responseTime: 123
  };
}, 5000); // 5 second timeout
```

### Frontend Health Check Extension
```javascript
// Add custom validation step
frontendHealthService.addCustomCheck('custom-check', async () => {
  // Your validation logic
  return { success: true, message: 'Check passed' };
});
```

### Production Monitor Configuration
```javascript
// Modify thresholds in production-monitor.ps1
criticalThresholds = @{
  responseTime = 5000  # ms
  memoryUsage = 512    # MB
  cpuUsage = 90        # percent
}
```

## 📈 Monitoring and Alerting

### Metrics Collected
- **Response Time**: HTTP request duration
- **Memory Usage**: Heap usage for Node.js services
- **Uptime Percentage**: Service availability over time
- **Error Rates**: Failed health checks over time
- **Performance Trends**: Historical response time data

### Alert Conditions
- **Service Down**: Process not running or not responding
- **Performance Degradation**: Response time above threshold
- **Resource Exhaustion**: Memory or CPU usage above limits
- **Consecutive Failures**: Multiple failed health checks
- **Dependency Failures**: Required services unavailable

### Recovery Actions
1. **Automatic Recovery** (if enabled)
   - Restart failed service using dependency manager
   - Wait for initialization completion
   - Validate recovery success
   - Send recovery notification

2. **Manual Escalation** (if auto-recovery fails)
   - Send alert notification
   - Log detailed error information
   - Provide recovery instructions

## 🔍 Troubleshooting

### Common Issues

#### Backend Not Starting
```bash
# Check logs
cat d:\Development\quibish\logs\server-manager.log

# Verify dependencies
.\service-dependency-manager-fixed.ps1 -DryRun

# Manual health check
curl http://localhost:5001/api/health
```

#### Frontend Build Errors
```bash
# Check compilation logs
npm start

# Verify health service
# Open browser console and check for initialization errors
```

#### Database Connection Issues
```bash
# Check MySQL service
net start mysql

# Verify credentials
.\backend\setup-mysql.ps1

# Check fallback mode
curl http://localhost:5001/api/health/detailed
```

### Health Check Debugging

#### Enable Debug Logging
```powershell
# Frontend (browser console)
localStorage.setItem('debug', 'quibish:*');

# Backend (environment variable)
$env:DEBUG = "quibish:*"

# Production monitor
.\production-monitor.ps1 -LogLevel "DEBUG"
```

#### Manual Health Tests
```bash
# Test backend health endpoint
curl -v http://localhost:5001/api/health

# Test startup status
curl -v http://localhost:5001/api/startup

# Test detailed health
curl -v http://localhost:5001/api/health/detailed

# Test frontend connectivity
curl -v http://localhost:3000
```

## 📝 Log Files

### Log Locations
- **Server Manager**: `d:\Development\quibish\logs\server-manager.log`
- **Service Manager**: `d:\Development\quibish\logs\service-manager.log`
- **Production Monitor**: `d:\Development\quibish\logs\monitor.log`
- **Structured Data**: `d:\Development\quibish\logs\monitor.json`

### Log Levels
- **DEBUG**: Detailed execution information
- **INFO**: General operational messages
- **WARN**: Warning conditions (service degraded)
- **ERROR**: Error conditions (service failed)

## 🚀 Production Deployment

### Pre-Launch Checklist
1. ✅ Run full dependency validation
2. ✅ Execute comprehensive health checks
3. ✅ Verify all services start in correct order
4. ✅ Test automatic recovery mechanisms
5. ✅ Configure monitoring and alerting
6. ✅ Validate performance thresholds
7. ✅ Test email notification system

### Launch Command
```powershell
# Complete production startup with monitoring
.\service-dependency-manager-fixed.ps1 && .\production-monitor.ps1 -Daemon -EnableRecovery -EnableEmail
```

### Post-Launch Monitoring
```powershell
# Check overall system health
.\production-monitor.ps1

# Continuous monitoring with alerts
.\production-monitor.ps1 -Daemon -EnableRecovery -AlertThreshold 2 -MonitorInterval 30
```

## 📚 API Integration

### Health Check Integration
```javascript
// Frontend health check integration
import frontendHealthService from './services/frontendHealthService';

// Initialize and check health
const status = await frontendHealthService.initialize();
if (!status.success) {
  console.error('Frontend initialization failed:', status.error);
}

// Periodic health checks
setInterval(async () => {
  const health = await frontendHealthService.runHealthCheck();
  console.log('Health status:', health.overall);
}, 60000);
```

### Backend health monitoring
```javascript
// Express middleware for health checks
app.use('/api/health', healthCheck.middleware());
app.use('/api/health/detailed', healthCheck.middleware(true));

// Custom health check
app.get('/api/custom-health', async (req, res) => {
  const result = await healthCheck.runChecks();
  res.json(result);
});
```

This comprehensive health check system ensures that Quibish runs smoothly both during development and in production, with automatic monitoring, alerting, and recovery capabilities.