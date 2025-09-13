const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');

// Create Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Compression for better performance
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

// Enhanced CORS configuration
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
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
}));

// Rate limiting for security
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Body parsing with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON format' });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress}`);
  next();
});

// Performance monitoring middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    res.set('X-Response-Time', `${duration}ms`);
    
    if (duration > 1000) {
      console.warn(`⚠️ Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});

// In-memory storage for enhanced performance
const storage = {
  users: new Map(),
  sessions: new Map(),
  emailVerifications: new Map(),
  rateLimitStore: new Map(),
  
  // User management
  createUser(userData) {
    const user = {
      id: Date.now().toString(),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };
    this.users.set(user.id, user);
    return user;
  },
  
  getUserByEmail(email) {
    for (const [id, user] of this.users) {
      if (user.email === email) return user;
    }
    return null;
  },
  
  getUserByUsername(username) {
    for (const [id, user] of this.users) {
      if (user.username === username) return user;
    }
    return null;
  },
  
  // Session management
  createSession(userId, token) {
    const session = {
      id: token,
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true
    };
    this.sessions.set(token, session);
    return session;
  },
  
  getSession(token) {
    const session = this.sessions.get(token);
    if (session && session.isActive) {
      session.lastActivity = new Date().toISOString();
      return session;
    }
    return null;
  },
  
  // Email verification
  createEmailVerification(email, code, userData) {
    const verification = {
      id: `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      code,
      userData,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      attempts: 0,
      maxAttempts: 3
    };
    this.emailVerifications.set(verification.id, verification);
    return verification;
  },
  
  getEmailVerification(verificationId) {
    return this.emailVerifications.get(verificationId);
  },
  
  // Cleanup expired data
  cleanup() {
    const now = new Date();
    
    // Clean expired email verifications
    for (const [id, verification] of this.emailVerifications) {
      if (new Date(verification.expiresAt) < now) {
        this.emailVerifications.delete(id);
      }
    }
    
    // Clean old sessions (24 hours)
    for (const [token, session] of this.sessions) {
      const lastActivity = new Date(session.lastActivity);
      if (now - lastActivity > 24 * 60 * 60 * 1000) {
        this.sessions.delete(token);
      }
    }
  }
};

// Cleanup interval - every 5 minutes
setInterval(() => {
  storage.cleanup();
}, 5 * 60 * 1000);

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
    },
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
    },
    storage: {
      users: storage.users.size,
      sessions: storage.sessions.size,
      emailVerifications: storage.emailVerifications.size
    },
    version: '2.0.0',
    features: ['email-verification', 'rate-limiting', 'compression', 'security-headers']
  });
});

// Enhanced authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Enhanced validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          username: !username ? 'Username is required' : null,
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        field: 'email'
      });
    }
    
    // Username validation
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        error: 'Username must be between 3 and 20 characters',
        field: 'username'
      });
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        error: 'Username can only contain letters, numbers, and underscores',
        field: 'username'
      });
    }
    
    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
        field: 'password'
      });
    }
    
    // Check if user already exists
    if (storage.getUserByEmail(email)) {
      return res.status(409).json({
        error: 'Email already registered',
        field: 'email'
      });
    }
    
    if (storage.getUserByUsername(username)) {
      return res.status(409).json({
        error: 'Username already taken',
        field: 'username'
      });
    }
    
    // Create user
    const user = storage.createUser({
      username,
      email,
      password: password, // In production, hash this with bcrypt
      name: username
    });
    
    // Generate JWT token (simplified for demo)
    const token = `jwt_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create session
    storage.createSession(user.id, token);
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    res.status(201).json({
      success: true,
      user: userResponse,
      token,
      message: 'Registration successful'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error during registration',
      message: 'Please try again later'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!password || (!username && !email)) {
      return res.status(400).json({
        error: 'Username/email and password are required'
      });
    }
    
    // Find user
    let user = null;
    if (email) {
      user = storage.getUserByEmail(email);
    } else if (username) {
      user = storage.getUserByUsername(username);
    }
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        field: username ? 'username' : 'email'
      });
    }
    
    // In production, compare hashed passwords
    if (user.password !== password) {
      return res.status(401).json({
        error: 'Invalid credentials',
        field: 'password'
      });
    }
    
    // Generate JWT token
    const token = `jwt_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create session
    storage.createSession(user.id, token);
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    res.json({
      success: true,
      user: userResponse,
      token,
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error during login',
      message: 'Please try again later'
    });
  }
});

// Email verification endpoints
app.post('/api/auth/send-verification', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({
        error: 'Email, username, and password are required'
      });
    }
    
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store verification data
    const verification = storage.createEmailVerification(email, code, {
      username,
      email,
      password
    });
    
    // In production, send actual email here
    console.log(`📧 Verification email for ${email}: ${code}`);
    
    res.json({
      success: true,
      verificationId: verification.id,
      message: 'Verification email sent successfully',
      expiresAt: verification.expiresAt,
      // For development only - remove in production
      developmentCode: process.env.NODE_ENV === 'development' ? code : undefined
    });
    
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({
      error: 'Failed to send verification email',
      message: 'Please try again later'
    });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { verificationId, code } = req.body;
    
    if (!verificationId || !code) {
      return res.status(400).json({
        error: 'Verification ID and code are required'
      });
    }
    
    const verification = storage.getEmailVerification(verificationId);
    
    if (!verification) {
      return res.status(404).json({
        error: 'Invalid verification ID'
      });
    }
    
    if (new Date() > new Date(verification.expiresAt)) {
      storage.emailVerifications.delete(verificationId);
      return res.status(410).json({
        error: 'Verification code has expired'
      });
    }
    
    if (verification.attempts >= verification.maxAttempts) {
      storage.emailVerifications.delete(verificationId);
      return res.status(429).json({
        error: 'Maximum verification attempts exceeded'
      });
    }
    
    verification.attempts++;
    
    if (verification.code !== code) {
      return res.status(400).json({
        error: `Invalid verification code. ${verification.maxAttempts - verification.attempts} attempts remaining.`
      });
    }
    
    // Verification successful - create user
    const userData = verification.userData;
    const user = storage.createUser(userData);
    
    // Generate token
    const token = `jwt_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    storage.createSession(user.id, token);
    
    // Clean up verification
    storage.emailVerifications.delete(verificationId);
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    res.json({
      success: true,
      user: userResponse,
      token,
      message: 'Email verified successfully'
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Internal server error during verification',
      message: 'Please try again later'
    });
  }
});

// User profile endpoint
app.get('/api/user/profile', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Authorization token required'
      });
    }
    
    const session = storage.getSession(token);
    
    if (!session) {
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }
    
    const user = storage.users.get(session.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    res.json({
      success: true,
      user: userResponse
    });
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Please try again later'
    });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on our end',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
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

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM signal received: closing HTTP server gracefully');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT signal received: closing HTTP server gracefully');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
server.listen(PORT, () => {
  console.log('🚀 =================================');
  console.log(`✅ Optimized server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Authentication endpoints ready`);
  console.log(`📧 Email verification enabled`);
  console.log(`🛡️ Security features: Rate limiting, CORS, Helmet`);
  console.log(`⚡ Performance features: Compression, Caching`);
  console.log(`📊 Monitoring: Request logging, Response time tracking`);
  console.log('🚀 =================================');
});

module.exports = { app, server };