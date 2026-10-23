const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware with optimized settings
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: false // Disable HTTPS enforcement for localhost
}));

// Enhanced compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
  memLevel: 8,
  chunkSize: 16 * 1024,
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
    'Referer',
    'X-Encryption-Key'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Response-Time',
    'X-Server-Info'
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
    limit: 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/api/health' || req.method === 'OPTIONS';
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
    limit: 50
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// Enhanced body parsing
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

// Enhanced request logging and performance monitoring
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  // Add request ID to headers
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Server-Info', 'Quibish-Stable-v1.0');
  
  // Enhanced logging
  console.log(`[${new Date().toISOString()}] ${requestId} - ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress} - User-Agent: ${req.get('User-Agent') || 'Unknown'}`);
  
  // Monitor response time (set header before response is sent)
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${responseTime}ms`);
    }
    return originalSend.call(this, data);
  };
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${requestId} - Response: ${res.statusCode} - Time: ${responseTime}ms`);
    
    // Log slow requests
    if (responseTime > 1000) {
      console.warn(`Ã¢Å¡Â Ã¯Â¸Â  SLOW REQUEST: ${req.method} ${req.path} took ${responseTime}ms`);
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

// Import route modules
// Auth uses the in-memory user store (seeded demo users) in this lightweight server
require('./inMemoryStorage').initInMemoryStorage();
global.inMemoryStorage.usingInMemory = true;
global.inMemoryStorage.seedDefaultUsers();
const authRoutes = require('./routes/auth');
const { verifyToken } = authRoutes;
const { attachRealtime } = require('./realtime');
const notificationsRoutes = require('./routes/notifications');
const encryptionRoutes    = require('./routes/encryption');

// Enhanced health check with network diagnostics
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'online',
    timestamp: new Date().toISOString(),
    message: 'Stable server running optimally',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0-stable',
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

// Register API routes
app.use('/api/auth',           authRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/encryption',    encryptionRoutes);

// Social Profiles routes
const socialProfilesRoutes = require('./routes/social-profiles');
app.use('/api/social-profiles', socialProfilesRoutes);

// Posts routes
const postsRoutes = require('./routes/posts');
app.use('/api/posts', postsRoutes);
app.use('/api/contacts', require('./routes/contacts'));

// User presence endpoint
const userPresenceMap = new Map(); // userId -> { isOnline, lastSeen }
app.post('/api/users/presence', (req, res) => {
  const { userId, isOnline, lastSeen } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  userPresenceMap.set(String(userId), { isOnline: !!isOnline, lastSeen: lastSeen || new Date().toISOString() });
  res.json({ success: true });
});

// Ã¢Å“â€¦ Auth endpoints are now handled by real routes (see /api/auth routing above)
// All authentication logic has been moved to backend/routes/auth.js

// Signaling endpoint for WebRTC connections
app.get('/signaling', (req, res) => {
  // Simple response for signaling requests
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    message: 'Signaling endpoint available'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available: [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/send-verification',
      'POST /api/auth/verify-email',
      'GET /api/user/profile'
    ]
  });
});

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

// Create enhanced HTTP server
const server = http.createServer(serverOptions, app);

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Real-time WebSocket layer (messaging + signaling)
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
attachRealtime(server, app, verifyToken);
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// Enhanced server configuration
server.keepAliveTimeout = 120000; // 2 minutes
server.headersTimeout = 120000; // 2 minutes
server.requestTimeout = 120000; // 2 minutes
server.timeout = 120000; // 2 minutes
server.maxConnections = 1000; // Maximum concurrent connections
server.maxHeadersCount = 2000; // Maximum number of headers

// Connection event handlers
server.on('connection', (socket) => {
  console.log(`Ã°Å¸â€œÂ¡ New connection from ${socket.remoteAddress}:${socket.remotePort}`);
  
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
    socket.end('HTTP/1.1 400 Bad Request\\r\\n\\r\\n');
  }
});

// Start the enhanced stable server
server.listen(PORT, '0.0.0.0', () => {
  console.log('Ã°Å¸Å¡â‚¬ ====================================');
  console.log(`Ã¢Å“â€¦ Enhanced Stable Server v1.0`);
  console.log(`Ã°Å¸Å’Â Running on port ${PORT}`);
  console.log(`Ã°Å¸â€â€” Health check: http://localhost:${PORT}/api/health`);
  console.log(`Ã°Å¸â€Â Authentication endpoints ready`);
  console.log(`Ã°Å¸â€œÂ§ Email verification enabled`);
  console.log(`Ã°Å¸â€ºÂ¡Ã¯Â¸Â Enhanced security features active`);
  console.log(`Ã¢Å¡Â¡ Performance optimizations enabled`);
  console.log(`Ã°Å¸â€â€ž Connection pooling and keep-alive active`);
  console.log(`Ã°Å¸â€œË† Network monitoring enabled`);
  console.log(`Ã¯Â¿Â½Ã¯Â¸Â Response compression active`);
  console.log(`Ã°Å¸â€â€™ Rate limiting configured`);
  console.log('Ã°Å¸Å¡â‚¬ ====================================');
});

// Enhanced error handling - prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Ã¢ÂÅ’ Uncaught Exception (but continuing):', error);
  // Don't exit - just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Ã¢ÂÅ’ Unhandled Rejection (but continuing):', reason);
  // Don't exit - just log the error
});

// Only handle explicit shutdown signals
process.on('SIGTERM', () => {
  console.log('Ã°Å¸â€ºâ€˜ SIGTERM received - shutting down gracefully');
  server.close(() => {
    console.log('Ã¢Å“â€¦ Server closed');
    process.exit(0);
  });
});

// Don't automatically exit on SIGINT (Ctrl+C) - let user explicitly stop
process.on('SIGINT', () => {
  console.log('\nÃ¢Å¡Â Ã¯Â¸Â  SIGINT received - Press Ctrl+C again within 5 seconds to force shutdown');
  let forceShutdown = false;
  
  const forceHandler = () => {
    if (forceShutdown) {
      console.log('Ã°Å¸â€ºâ€˜ Force shutdown initiated');
      process.exit(0);
    } else {
      forceShutdown = true;
      setTimeout(() => {
        forceShutdown = false;
        console.log('Ã°Å¸â€œÂ Shutdown cancelled - server continues running');
      }, 5000);
    }
  };
  
  process.once('SIGINT', forceHandler);
});

// Keep-alive mechanism
setInterval(() => {
  // This prevents the process from being idle and helps maintain stability
  const used = process.memoryUsage();
  console.log(`Ã°Å¸â€™â€œ Server heartbeat - Memory: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`);
}, 30000); // Every 30 seconds

module.exports = { app, server };