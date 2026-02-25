const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const { JWT_SECRET } = require('../config/jwt');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Two-factor authentication endpoints
router.post('/setup', authenticateToken, (req, res) => {
  res.status(501).json({
    success: false,
    error: '2FA setup not yet implemented'
  });
});

router.post('/verify', authenticateToken, (req, res) => {
  res.status(501).json({
    success: false,
    error: '2FA verification not yet implemented'
  });
});

router.post('/disable', authenticateToken, (req, res) => {
  res.status(501).json({
    success: false,
    error: '2FA disable not yet implemented'
  });
});

module.exports = router;
