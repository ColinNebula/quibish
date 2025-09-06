const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware to authenticate JWT tokens
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
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    req.user = user;
    
    // Add a flag to indicate if we're using in-memory storage
    // This helps route handlers to know which storage mechanism to use
    req.usingInMemory = global.inMemoryStorage && global.inMemoryStorage.usingInMemory === true;
    
    next();
  });
};

module.exports = {
  authenticateToken,
  verifyToken: authenticateToken // Alias for consistency
};
