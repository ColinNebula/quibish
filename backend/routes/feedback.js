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

// Submit feedback
router.post('/', authenticateToken, (req, res) => {
  const { message, category, rating } = req.body;
  
  console.log('Feedback received:', { userId: req.user.userId, message, category, rating });
  
  res.json({
    success: true,
    message: 'Thank you for your feedback!'
  });
});

// Get feedback (admin only)
router.get('/', authenticateToken, (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Feedback retrieval not yet implemented'
  });
});

module.exports = router;
