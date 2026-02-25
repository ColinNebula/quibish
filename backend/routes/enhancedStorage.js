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

// Enhanced storage endpoints
router.get('/data', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {}
  });
});

router.post('/data', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Data saved'
  });
});

module.exports = router;
