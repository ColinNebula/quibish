const express = require('express');
const router = express.Router();

// Health check endpoint - matches what the frontend expects
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    status: 'online'
  });
});

// Additional health endpoints
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

router.get('/status', (req, res) => {
  res.json({
    success: true,
    server: 'Quibish Backend',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
