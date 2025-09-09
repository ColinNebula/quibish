const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
const { connectToMySQL } = require('./config/mysql');
const databaseService = require('./services/databaseService');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const conversationRoutes = require('./routes/conversations');
const healthRoutes = require('./routes/health');
const uploadRoutes = require('./routes/upload');
const twoFactorRoutes = require('./routes/twoFactor');

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize global in-memory storage for fallback when MongoDB is unavailable
global.inMemoryStorage = {
  users: [],
  messages: [],
  usingInMemory: false,
  seedDefaultUsers: function() {
    if (this.users.length === 0) {
      const bcrypt = require('bcryptjs');
      const defaultUsers = [
        {
          id: '1',
          username: 'demo',
          email: 'demo@quibish.com',
          password: bcrypt.hashSync('demo', 10),
          name: 'Demo User',
          avatar: null,
          status: 'online',
          role: 'user',
          twoFactorAuth: {
            enabled: false,
            secret: null,
            method: 'totp',
            backupCodes: [],
            lastUsed: null,
            setupAt: null
          },
          createdAt: new Date()
        },
        {
          id: '2',
          username: 'john',
          email: 'john@example.com',
          password: bcrypt.hashSync('password', 10),
          name: 'John Doe',
          avatar: null,
          status: 'online',
          role: 'user',
          twoFactorAuth: {
            enabled: false,
            secret: null,
            method: 'totp',
            backupCodes: [],
            lastUsed: null,
            setupAt: null
          },
          createdAt: new Date()
        },
        {
          id: '3',
          username: 'jane',
          email: 'jane@example.com',
          password: bcrypt.hashSync('password', 10),
          name: 'Jane Smith',
          avatar: null,
          status: 'online',
          role: 'user',
          twoFactorAuth: {
            enabled: false,
            secret: null,
            method: 'totp',
            backupCodes: [],
            lastUsed: null,
            setupAt: null
          },
          createdAt: new Date()
        },
        {
          id: '4',
          username: 'admin',
          email: 'admin@quibish.com',
          password: bcrypt.hashSync('admin', 10),
          name: 'Admin User',
          avatar: null,
          status: 'online',
          role: 'admin',
          twoFactorAuth: {
            enabled: false,
            secret: null,
            method: 'totp',
            backupCodes: [],
            lastUsed: null,
            setupAt: null
          },
          createdAt: new Date()
        }
      ];
      this.users = defaultUsers;
      console.log('🌱 In-memory users seeded successfully');
    }
  }
};

// MongoDB connection with fallback mechanism
const connectToMongoDB = async () => {
  // Check if we should skip MongoDB and use memory only
  if (process.env.USE_MEMORY_ONLY === 'true') {
    console.log('🔄 Using in-memory storage only (MongoDB disabled)');
    global.inMemoryStorage.usingInMemory = true;
    global.inMemoryStorage.seedDefaultUsers();
    return;
  }

  try {
    // Set fallback mode before attempting connection
    // This ensures we don't try to use MongoDB at all if connection fails
    global.inMemoryStorage.usingInMemory = true;
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quibish', {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      connectTimeoutMS: 10000, // Give up initial connection after 10s
    });
    
    // If we reach here, connection succeeded
    console.log('📊 MongoDB connected successfully');
    global.inMemoryStorage.usingInMemory = false;
    
    // Seed initial data if needed
    if (process.env.SEED_INITIAL_DATA === 'true') {
      try {
        const User = require('./models/User');
        const userCount = await User.countDocuments();
        if (userCount === 0) {
          console.log('🌱 Seeding initial user data...');
          // Import seedInitialUsers from auth.js if needed
          const bcrypt = require('bcryptjs');
          
          // Create default users
          const defaultUsers = [
            {
              id: '1',
              username: 'demo',
              email: 'demo@quibish.com',
              password: await bcrypt.hash('demo', 10),
              name: 'Demo User',
              avatar: null,
              status: 'online',
              role: 'user',
              createdAt: new Date()
            },
            {
              id: '2',
              username: 'john',
              email: 'john@example.com',
              password: await bcrypt.hash('password', 10),
              name: 'John Doe',
              avatar: null,
              status: 'online',
              role: 'user',
              createdAt: new Date()
            },
            {
              id: '3',
              username: 'jane',
              email: 'jane@example.com',
              password: await bcrypt.hash('password', 10),
              name: 'Jane Smith',
              avatar: null,
              status: 'online',
              role: 'user',
              createdAt: new Date()
            },
            {
              id: '4',
              username: 'admin',
              email: 'admin@quibish.com',
              password: await bcrypt.hash('admin', 10),
              name: 'Admin User',
              avatar: null,
              status: 'online',
              role: 'admin',
              createdAt: new Date()
            }
          ];
          
          try {
            await User.insertMany(defaultUsers);
            console.log('✅ Initial users seeded successfully in MongoDB');
          } catch (seedError) {
            console.error('Error seeding initial users:', seedError);
          }
        }
      } catch (countError) {
        console.error('Error checking user count:', countError);
        // If we encounter errors with MongoDB operations, fall back to in-memory
        global.inMemoryStorage.usingInMemory = true;
        global.inMemoryStorage.seedDefaultUsers();
      }
    }
    
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️ Running in fallback mode with in-memory storage');
    global.inMemoryStorage.usingInMemory = true;
    global.inMemoryStorage.seedDefaultUsers();
    return false;
  }
};

// Enhanced database connection with proper service initialization
const connectToDatabase = async () => {
  const databaseType = process.env.DATABASE_TYPE || 'mysql';
  
  console.log(`🔧 Database type configured: ${databaseType}`);
  
  try {
    // Initialize the database service
    await databaseService.initialize();
    
    if (databaseService.isInitialized()) {
      console.log(`🔄 Storage mode: ${databaseType.toUpperCase()} (persistent) via DatabaseService`);
      
      // Get initial stats
      const stats = await databaseService.getStats();
      console.log(`� Database initialized with ${stats.users} users, ${stats.messages} messages, ${stats.media} media files`);
      
      return true;
    } else {
      throw new Error('Database service failed to initialize');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('⚠️  Falling back to in-memory storage');
    global.inMemoryStorage.usingInMemory = true;
    global.inMemoryStorage.seedDefaultUsers();
    console.log('🔄 Storage mode: In-memory (non-persistent)');
    return false;
  }
};

// Initialize database connection
connectToDatabase();

// Security middleware
app.use(helmet());

// CORS configuration (before rate limiting)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health check endpoints (before rate limiting)
app.use('/api', healthRoutes);

// Rate limiting (after health checks)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes (health routes already mounted above)
app.use('/api/auth', authRoutes);
app.use('/api/auth/2fa', twoFactorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Quibish Backend Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/ping',
      auth: '/api/auth/*',
      users: '/api/users/*',
      messages: '/api/messages/*'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Quibish Backend Server running on port ${PORT}`);
  console.log(`📱 Frontend should connect to: http://localhost:${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`⚕️  Health Check: http://localhost:${PORT}/api/ping`);
});

module.exports = app;
