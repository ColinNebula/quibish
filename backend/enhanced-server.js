// Enhanced Network Server with Improved HTTP Connectivity
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 5001;

// Enhanced HTTP server configuration
const serverOptions = {
  keepAlive: true,
  keepAliveInitialDelay: 0,
  timeout: 120000, // 2 minutes
  headersTimeout: 120000, // 2 minutes
  requestTimeout: 120000, // 2 minutes
  maxHeaderSize: 16384, // 16KB
  maxRequestsPerSocket: 0, // No limit
  insecureHTTPParser: false
};

// Security middleware with optimized settings
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: false // Disable HTTPS enforcement for localhost
}));

// Enhanced compression with better settings
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Compress responses larger than 1KB
    return compression.filter(req, res);
  },
  level: 6, // Good balance between compression and CPU
  threshold: 1024, // Only compress responses > 1KB
  memLevel: 8, // Memory usage level
  chunkSize: 16 * 1024, // 16KB chunks
  windowBits: 15
}));

// Enhanced CORS with detailed configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'https://colinnebula.github.io',
      /^https:\/\/.*\.github\.io$/,
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/
    ];
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      return allowedOrigin.test(origin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-HTTP-Method-Override',
    'X-Forwarded-For',
    'X-Real-IP',
    'User-Agent',
    'Referer'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Response-Time',
    'X-Server-Info'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Enhanced rate limiting with different tiers
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for general requests
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
    limit: 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks, notifications, and options
    // Note: req.path here is relative to the mount point (/api/)
    return req.path === '/health' || 
           req.path.startsWith('/notifications') ||
           req.path.startsWith('/presence') ||
           req.method === 'OPTIONS';
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For if available, otherwise use remoteAddress
    return req.get('X-Forwarded-For') || req.connection.remoteAddress || req.ip;
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased auth limit
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
    limit: 50
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// Enhanced body parsing with larger limits
app.use(express.json({ 
  limit: '50mb',
  extended: true,
  parameterLimit: 50000,
  type: ['application/json', 'text/plain']
}));

app.use(express.urlencoded({ 
  limit: '50mb',
  extended: true,
  parameterLimit: 50000,
  type: 'application/x-www-form-urlencoded'
}));

// Raw body parsing for webhooks
app.use('/api/webhooks/*', express.raw({ 
  limit: '10mb',
  type: '*/*'
}));

// Request logging and performance monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  // Add request ID to headers
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Server-Info', 'Quibish-Enhanced-v1.0');
  
  // Enhanced logging
  console.log(`[${new Date().toISOString()}] ${requestId} - ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress} - User-Agent: ${req.get('User-Agent') || 'Unknown'}`);
  
  // Monitor response time
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    // Only set header if response hasn't been sent yet
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${responseTime}ms`);
    }
    console.log(`[${new Date().toISOString()}] ${requestId} - Response: ${res.statusCode} - Time: ${responseTime}ms`);
    
    // Log slow requests
    if (responseTime > 1000) {
      console.warn(`⚠️  SLOW REQUEST: ${req.method} ${req.path} took ${responseTime}ms`);
    }
  });
  
  next();
});

// Connection monitoring middleware
app.use((req, res, next) => {
  // Set connection keep-alive headers
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=120, max=100');
  
  // Handle connection errors
  req.on('error', (err) => {
    console.error('Request error:', err);
  });
  
  res.on('error', (err) => {
    console.error('Response error:', err);
  });
  
  next();
});

// Enhanced health check with network diagnostics
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'online',
    timestamp: new Date().toISOString(),
    message: 'Enhanced server running optimally',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0-enhanced',
    network: {
      activeConnections: process._getActiveHandles().length,
      platform: process.platform,
      nodeVersion: process.version,
      keepAliveAgent: true,
      compression: true,
      cors: true
    },
    performance: {
      cpuUsage: process.cpuUsage(),
      eventLoopDelay: process.hrtime(),
      loadAverage: require('os').loadavg()
    }
  };
  
  res.json(healthData);
});

// Network diagnostics endpoint
app.get('/api/network/diagnostics', (req, res) => {
  const os = require('os');
  const diagnostics = {
    timestamp: new Date().toISOString(),
    server: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem()
    },
    network: {
      interfaces: os.networkInterfaces(),
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      versions: process.versions
    }
  };
  
  res.json(diagnostics);
});

// Connection test endpoint
app.get('/api/network/test', (req, res) => {
  const testData = {
    timestamp: new Date().toISOString(),
    clientIP: req.ip || req.connection.remoteAddress,
    headers: req.headers,
    method: req.method,
    url: req.url,
    httpVersion: req.httpVersion,
    connection: {
      remoteAddress: req.connection.remoteAddress,
      remotePort: req.connection.remotePort,
      localAddress: req.connection.localAddress,
      localPort: req.connection.localPort
    },
    latency: Date.now() - parseInt(req.query.timestamp || Date.now())
  };
  
  res.json({
    success: true,
    message: 'Connection test successful',
    data: testData
  });
});

// Import and mount routes
const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');
const notificationsRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/notifications', notificationsRoutes);

// ✅ Auth endpoints are now handled by real routes (see /api/auth routing above)
// All authentication logic has been moved to backend/routes/auth.js
// This includes: register, login, email verification, user profile, etc.

// Enhanced signaling endpoint for WebRTC connections
app.get('/signaling', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    message: 'Enhanced signaling endpoint available',
    connection: {
      id: Date.now().toString(36),
      keepAlive: true,
      timeout: 120000
    }
  });
});

// WebSocket upgrade handling
app.get('/ws', (req, res) => {
  res.json({
    status: 'websocket_available',
    message: 'WebSocket endpoint ready for upgrade',
    protocols: ['ws', 'wss']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler with helpful information
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available: [
      'GET /api/health',
      'GET /api/network/diagnostics',
      'GET /api/network/test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/send-verification',
      'POST /api/auth/verify-email',
      'GET /api/user/profile',
      'GET /api/friends',
      'POST /api/friends/request',
      'GET /api/notifications',
      'PUT /api/notifications/:id/read',
      'PUT /api/notifications/read-all',
      'DELETE /api/notifications/:id',
      'POST /api/notifications/create',
      'GET /signaling',
      'GET /ws'
    ],
    suggestion: 'Check the API documentation or available endpoints above'
  });
});

// Create enhanced HTTP server
const server = http.createServer(serverOptions, app);

// Enhanced server configuration
server.keepAliveTimeout = 120000; // 2 minutes
server.headersTimeout = 120000; // 2 minutes
server.requestTimeout = 120000; // 2 minutes
server.timeout = 120000; // 2 minutes
server.maxConnections = 1000; // Maximum concurrent connections
server.maxHeadersCount = 2000; // Maximum number of headers

// Connection event handlers
server.on('connection', (socket) => {
  console.log(`📡 New connection from ${socket.remoteAddress}:${socket.remotePort}`);
  
  // Set socket options for better performance
  socket.setKeepAlive(true, 30000); // Keep alive with 30s interval
  socket.setNoDelay(true); // Disable Nagle's algorithm for lower latency
  socket.setTimeout(120000); // 2 minute socket timeout
  
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
  
  socket.on('timeout', () => {
    console.warn('Socket timeout');
    socket.destroy();
  });
  
  socket.on('close', (hadError) => {
    if (hadError) {
      console.warn('Connection closed with error');
    } else {
      console.log('Connection closed normally');
    }
  });
});

server.on('clientError', (err, socket) => {
  console.error('Client error:', err);
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

// Start the enhanced server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ====================================');
  console.log(`✅ Enhanced Network Server v2.0`);
  console.log(`🌐 Running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Diagnostics: http://localhost:${PORT}/api/network/diagnostics`);
  console.log(`🧪 Connection test: http://localhost:${PORT}/api/network/test`);
  console.log(`🔐 Authentication endpoints ready`);
  console.log(`📧 Email verification enabled`);
  console.log(`🛡️ Enhanced security features active`);
  console.log(`⚡ Performance optimizations enabled`);
  console.log(`🔄 Connection pooling and keep-alive active`);
  console.log(`📈 Network monitoring enabled`);
  console.log('🚀 ====================================');
});

// Enhanced error handling that doesn't crash the server
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception (server continues):', error.message);
  console.error('Stack:', error.stack);
  // Don't exit - just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection (server continues):', reason);
  console.error('Promise:', promise);
  // Don't exit - just log the error
});

// Graceful shutdown with connection draining
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - starting graceful shutdown');
  
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    } else {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.log('⏰ Force shutdown after timeout');
    process.exit(1);
  }, 30000);
});

// Enhanced SIGINT handling
process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received - Press Ctrl+C again within 5 seconds to force shutdown');
  let forceShutdown = false;
  
  const forceHandler = () => {
    if (forceShutdown) {
      console.log('🛑 Force shutdown initiated');
      process.exit(0);
    } else {
      forceShutdown = true;
      console.log('⏳ Preparing for shutdown...');
      setTimeout(() => {
        forceShutdown = false;
        console.log('📝 Shutdown cancelled - server continues running');
      }, 5000);
    }
  };
  
  process.once('SIGINT', forceHandler);
});

// Enhanced heartbeat with network status
setInterval(() => {
  const used = process.memoryUsage();
  const connections = server.connections || 0;
  const handles = process._getActiveHandles().length;
  const requests = process._getActiveRequests().length;
  
  console.log(`💓 Enhanced Heartbeat - Memory: ${Math.round(used.rss / 1024 / 1024 * 100) / 100}MB | Connections: ${connections} | Handles: ${handles} | Requests: ${requests}`);
}, 30000);

module.exports = { app, server };