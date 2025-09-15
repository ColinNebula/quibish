const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Enhanced middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token is required'
    });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      } else {
        return res.status(403).json({
          success: false,
          error: 'Token verification failed'
        });
      }
    }
    
    req.user = user;
    
    // Add a flag to indicate if we're using in-memory storage
    req.usingInMemory = global.inMemoryStorage && global.inMemoryStorage.usingInMemory === true;
    
    // Log successful authentication for security monitoring
    console.log(`🔐 Authenticated user: ${user.userId || user.username} at ${new Date().toISOString()}`);
    
    next();
  });
};

// Generate secure access and refresh tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      userId: user.id, 
      username: user.username,
      email: user.email 
    },
    JWT_SECRET,
    { 
      expiresIn: '15m',
      issuer: 'quibish-app',
      audience: 'quibish-users'
    }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'quibish-app',
      audience: 'quibish-users'
    }
  );
  
  return { accessToken, refreshToken };
};

// Secure password hashing with salt
const hashPassword = (password) => {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
};

// Verify password against stored hash and salt
const verifyPassword = (password, hash, salt) => {
  const hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashVerify;
};

// Generate secure random tokens for various purposes
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Verify refresh token
const verifyRefreshToken = (refreshToken) => {
  try {
    return jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Role-based access control middleware
const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  verifyToken: authenticateToken, // Alias for consistency
  generateTokens,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  verifyRefreshToken,
  requireRole
};
