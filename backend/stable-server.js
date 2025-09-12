const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'https://colinnebula.github.io',
    /^https:\/\/.*\.github\.io$/,
    /^http:\/\/localhost:\d+$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online',
    timestamp: new Date().toISOString(),
    message: 'Server is running properly',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

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

// Create HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 =================================');
  console.log(`✅ Stable server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Authentication endpoints ready`);
  console.log(`📧 Email verification enabled`);
  console.log(`🛡️ CORS configured for local and GitHub Pages`);
  console.log(`📊 Request logging enabled`);
  console.log('🚀 =================================');
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