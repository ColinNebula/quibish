const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');

// Generate secure JWT secret if not provided
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️ Using auto-generated JWT secret. Set JWT_SECRET environment variable for production.');
  return crypto.randomBytes(64).toString('hex');
})();

// Enhanced JWT token verification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      code: 'TOKEN_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check token expiration more strictly
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    req.user = decoded;
    
    // Log authentication for audit trail
    console.log(`🔐 User authenticated: ${decoded.username} (${decoded.id})`);
    
    next();
  } catch (error) {
    let errorCode = 'TOKEN_INVALID';
    let errorMessage = 'Invalid token';
    
    if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Token expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorCode = 'TOKEN_MALFORMED';
      errorMessage = 'Malformed token';
    }

    return res.status(403).json({
      success: false,
      error: errorMessage,
      code: errorCode
    });
  }
};

// Enhanced rate limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP + user agent for more accurate rate limiting
      return `${req.ip}-${req.get('User-Agent')}`;
    }
  });
};

// Different rate limits for different endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later'
);

const apiRateLimit = createRateLimit(
  1 * 60 * 1000, // 1 minute
  100, // 100 requests
  'Too many API requests, please slow down'
);

const strictRateLimit = createRateLimit(
  1 * 60 * 1000, // 1 minute
  10, // 10 requests
  'Too many requests to sensitive endpoint'
);

// Input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.details.map(detail => detail.message),
        code: 'VALIDATION_ERROR'
      });
    }
    next();
  };
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS content
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none';"
  );

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

// Audit logging middleware
const auditLog = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`📋 ${req.method} ${req.originalUrl} from ${req.ip}`);
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - startTime;
    
    // Log response (without sensitive data)
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      user: req.user ? req.user.username : 'anonymous'
    };

    // Log security-relevant events
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`🚨 Security event: ${logData.statusCode} for ${logData.url}`);
    }

    return originalJson.call(this, body);
  };

  next();
};

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
};

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Security monitoring middleware
const securityMonitor = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /(<|%3C)script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ];

  const checkSuspicious = (str) => {
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };

  // Check URL and parameters
  if (checkSuspicious(req.originalUrl)) {
    console.warn(`🚨 Suspicious request detected: ${req.originalUrl} from ${req.ip}`);
    return res.status(400).json({
      success: false,
      error: 'Suspicious request detected',
      code: 'SECURITY_VIOLATION'
    });
  }

  // Check body content
  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    if (checkSuspicious(bodyString)) {
      console.warn(`🚨 Suspicious content in request body from ${req.ip}`);
      return res.status(400).json({
        success: false,
        error: 'Suspicious content detected',
        code: 'SECURITY_VIOLATION'
      });
    }
  }

  next();
};

module.exports = {
  authenticateToken,
  authRateLimit,
  apiRateLimit,
  strictRateLimit,
  validateInput,
  sanitizeInput,
  securityHeaders,
  auditLog,
  requireAdmin,
  corsOptions,
  securityMonitor,
  JWT_SECRET
};