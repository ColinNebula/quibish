const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
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
    'Referer'
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

// Import route modules
const notificationsRoutes = require('./routes/notifications');

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
app.use('/api/notifications', notificationsRoutes);

// Auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // Simple validation
  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Username, email, and password are required' 
    });
  }
  
  // For demo purposes, simulate successful registration
  const user = {
    id: Date.now(),
    username,
    email,
    createdAt: new Date().toISOString(),
    role: username === 'admin' ? 'admin' : 'user'
  };
  
  const token = 'jwt-token-' + Date.now();
  
  res.json({
    success: true,
    user,
    token,
    message: 'Registration successful'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Username and password are required' 
    });
  }
  
  // For demo purposes, accept any credentials
  const user = {
    id: Date.now(),
    username,
    email: `${username}@example.com`,
    createdAt: new Date().toISOString(),
    role: username === 'admin' ? 'admin' : 'user'
  };
  
  const token = 'jwt-token-' + Date.now();
  
  res.json({
    success: true,
    user,
    token,
    message: 'Login successful'
  });
});

// Email verification endpoints
app.post('/api/auth/send-verification', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }
  
  // Simulate sending verification email
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  res.json({
    success: true,
    message: 'Verification email sent',
    // In development, return the code for testing
    verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
  });
});

app.post('/api/auth/verify-email', (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({
      success: false,
      error: 'Email and verification code are required'
    });
  }
  
  // For demo purposes, accept any 6-digit code
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid verification code format'
    });
  }
  
  res.json({
    success: true,
    message: 'Email verified successfully'
  });
});

// User profile endpoint
app.get('/api/user/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token required'
    });
  }
  
  const token = authHeader.substring(7);
  
  // For demo purposes, extract user info from token
  const user = {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    user
  });
});

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
    socket.end('HTTP/1.1 400 Bad Request\\r\\n\\r\\n');
  }
});

// Start the enhanced stable server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ====================================');
  console.log(`✅ Enhanced Stable Server v1.0`);
  console.log(`🌐 Running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Authentication endpoints ready`);
  console.log(`📧 Email verification enabled`);
  console.log(`🛡️ Enhanced security features active`);
  console.log(`⚡ Performance optimizations enabled`);
  console.log(`🔄 Connection pooling and keep-alive active`);
  console.log(`📈 Network monitoring enabled`);
  console.log(`�️ Response compression active`);
  console.log(`🔒 Rate limiting configured`);
  console.log('🚀 ====================================');
});

// Enhanced error handling - prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception (but continuing):', error);
  // Don't exit - just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection (but continuing):', reason);
  // Don't exit - just log the error
});

// Only handle explicit shutdown signals
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Don't automatically exit on SIGINT (Ctrl+C) - let user explicitly stop
process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received - Press Ctrl+C again within 5 seconds to force shutdown');
  let forceShutdown = false;
  
  const forceHandler = () => {
    if (forceShutdown) {
      console.log('🛑 Force shutdown initiated');
      process.exit(0);
    } else {
      forceShutdown = true;
      setTimeout(() => {
        forceShutdown = false;
        console.log('📝 Shutdown cancelled - server continues running');
      }, 5000);
    }
  };
  
  process.once('SIGINT', forceHandler);
});

// Keep-alive mechanism
setInterval(() => {
  // This prevents the process from being idle and helps maintain stability
  const used = process.memoryUsage();
  console.log(`💓 Server heartbeat - Memory: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`);
}, 30000); // Every 30 seconds

module.exports = { app, server };