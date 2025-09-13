// Test if basic Express works
console.log('🔍 Testing Node.js dependencies...');

try {
  const express = require('express');
  console.log('✅ Express loaded successfully');
  
  const cors = require('cors');
  console.log('✅ CORS loaded successfully');
  
  const app = express();
  const PORT = 5001;
  console.log('✅ Express app created');
  
  app.use(cors());
  app.use(express.json());
  console.log('✅ Middleware configured');
  
  app.get('/test', (req, res) => {
    res.json({ message: 'Test successful' });
  });
  
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      message: 'Server is healthy',
      timestamp: new Date().toISOString() 
    });
  });
  console.log('✅ Routes configured');
  
  const server = app.listen(PORT, () => {
    console.log(`✅ Server started on port ${PORT}`);
    console.log('🚀 Test server is running!');
  });
  
  server.on('error', (err) => {
    console.error('❌ Server error:', err);
  });
  
} catch (error) {
  console.error('❌ Dependency error:', error);
  process.exit(1);
}

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());

// Simple health check
app.get('/api/ping', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Test server running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test Server running on port ${PORT}`);
  console.log(`⚕️  Health Check: http://localhost:${PORT}/api/ping`);
});

module.exports = app;