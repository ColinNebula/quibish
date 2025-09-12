const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://colinnebula.github.io'],
  credentials: true
}));

app.use(express.json());

// Basic routes for signin
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is healthy',
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/ping', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// Auth routes for signin
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Basic validation for demo purposes
  if (username && password) {
    res.json({
      success: true,
      user: {
        id: 1,
        username: username,
        email: `${username}@quibish.com`
      },
      token: 'demo_token_' + Date.now(),
      message: 'Login successful (demo mode)'
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Username and password required'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (username && email && password) {
    res.json({
      success: true,
      user: {
        id: Date.now(),
        username: username,
        email: email
      },
      message: 'Registration successful (demo mode)'
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'All fields required'
    });
  }
});

// Messages endpoint
app.get('/api/messages', (req, res) => {
  res.json({
    success: true,
    messages: [],
    message: 'Messages endpoint (demo mode)'
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Quibish Backend Server running on port ${PORT}`);
  console.log(`⚕️  Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`📝 Register: POST http://localhost:${PORT}/api/auth/register`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
});

server.on('close', () => {
  console.log('❌ Server closed');
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, closing server...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});

console.log('✅ Server setup complete');