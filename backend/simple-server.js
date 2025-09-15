const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://colinnebula.github.io'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online',
    timestamp: new Date().toISOString(),
    message: 'Server is running properly'
  });
});

// Auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // Simple validation
  if (!username || !email || !password) {
    return res.status(400).json({ 
      error: 'Username, email, and password are required' 
    });
  }
  
  // For demo purposes, simulate successful registration
  const user = {
    id: Date.now(),
    username,
    email,
    createdAt: new Date().toISOString()
  };
  
  const token = 'jwt-token-' + Date.now();
  
  res.json({
    user,
    token,
    message: 'Registration successful'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      error: 'Username and password are required' 
    });
  }
  
  // For demo purposes, accept any credentials
  const user = {
    id: Date.now(),
    username,
    email: `${username}@example.com`,
    createdAt: new Date().toISOString()
  };
  
  const token = 'jwt-token-' + Date.now();
  
  res.json({
    user,
    token,
    message: 'Login successful'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Simple server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Ready for authentication requests`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down gracefully...');
  process.exit(0);
});

module.exports = app;