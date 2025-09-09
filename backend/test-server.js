const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

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