const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Routes
app.get('/api/ping', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/messages', (req, res) => {
  res.json({ 
    success: true,
    messages: [],
    message: 'Messages endpoint working (memory mode)'
  });
});

// Start server
const server = app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    return;
  }
  console.log(`🚀 Minimal Backend Server running on port ${PORT}`);
  console.log(`⚕️  Health Check: http://localhost:${PORT}/api/ping`);
  console.log(`📋 Messages: http://localhost:${PORT}/api/messages`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;