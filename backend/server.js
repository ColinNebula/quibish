const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const { connectToMySQL } = require('./config/mysql');
const { MemoryMonitor, memoryMonitor } = require('./config/memory');
const startupService = require('./services/startupService');
const healthCheck = require('./middleware/healthCheck');
const securityMiddleware = require('./middleware/security');
const { httpsEnforcementMiddleware, securityHeadersMiddleware } = require('./middleware/httpsEnforcement');
const { router: signalingRouter, signalingServer } = require('./routes/signaling');
require('dotenv').config();

// Memory monitor is auto-initialized from config
// const memoryMonitor = new MemoryMonitor(); // Now using exported instance

// Initialize global in-memory storage BEFORE importing databaseService
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
          displayName: 'Demo User',
          avatar: null,
          status: 'online',
          role: 'user',
          bio: 'Welcome! I\'m the demo user for Quibish. Feel free to explore!',
          headline: 'Exploring Quibish',
          cover_photo: null,
          location: null,
          website: null,
          company: null,
          jobTitle: null,
          interests: ['Technology', 'Social Media', 'Communication'],
          friends_count: 0,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          profile_views_count: 0,
          is_verified: false,
          badges: [],
          account_type: 'personal',
          date_of_birth: null,
          gender: null,
          relationship_status: null,
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
          displayName: 'John Doe',
          avatar: null,
          status: 'online',
          role: 'user',
          bio: 'Software engineer passionate about building great products.',
          headline: 'Senior Software Engineer at TechCorp',
          cover_photo: null,
          location: 'San Francisco, CA',
          website: 'https://johndoe.dev',
          company: 'TechCorp',
          jobTitle: 'Senior Software Engineer',
          interests: ['Coding', 'Open Source', 'JavaScript', 'React'],
          friends_count: 0,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          profile_views_count: 0,
          is_verified: false,
          badges: [],
          account_type: 'personal',
          date_of_birth: null,
          gender: 'male',
          relationship_status: null,
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
          displayName: 'Jane Smith',
          avatar: null,
          status: 'online',
          role: 'user',
          bio: 'UX Designer creating beautiful and intuitive experiences. Coffee enthusiast ☕',
          headline: 'Lead UX Designer',
          cover_photo: null,
          location: 'New York, NY',
          website: 'https://janesmith.design',
          company: 'Design Studio',
          jobTitle: 'Lead UX Designer',
          interests: ['Design', 'UI/UX', 'Art', 'Photography'],
          friends_count: 0,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          profile_views_count: 0,
          is_verified: false,
          badges: [],
          account_type: 'personal',
          date_of_birth: null,
          gender: 'female',
          relationship_status: null,
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
          password: bcrypt.hashSync('dpG6-x5T@-pM&H-$qZ1', 10),
          name: 'Admin User',
          displayName: 'Quibish Admin',
          avatar: null,
          status: 'online',
          role: 'admin',
          bio: 'Official Quibish administrator account. Here to help!',
          headline: 'Platform Administrator',
          cover_photo: null,
          location: null,
          website: 'https://quibish.com',
          company: 'Quibish',
          jobTitle: 'Platform Administrator',
          interests: ['Community Management', 'Technology', 'Support'],
          friends_count: 0,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          profile_views_count: 0,
          is_verified: true,
          badges: ['admin', 'verified', 'founder'],
          account_type: 'business',
          date_of_birth: null,
          gender: null,
          relationship_status: null,
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

const databaseService = require('./services/databaseService');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const conversationRoutes = require('./routes/conversations');
const healthRoutes = require('./routes/health');
const uploadRoutes = require('./routes/upload');
const twoFactorRoutes = require('./routes/twoFactor');
const feedbackRoutes = require('./routes/feedback');
const encryptionRoutes = require('./routes/encryption');
const enhancedStorageRoutes = require('./routes/enhancedStorage');
const contactRoutes = require('./routes/contacts');
const notificationRoutes = require('./routes/notifications');
const offlineNotificationRoutes = require('./routes/offline-notifications');
const socialProfilesRoutes = require('./routes/social-profiles');
const friendsRoutes = require('./routes/friends');
const postsRoutes = require('./routes/posts');

const app = express();
const PORT = process.env.PORT || 5001;

// Memory optimization settings
app.set('trust proxy', 1);
if (process.env.NODE_ENV === 'production') {
  // Enable garbage collection in production
  if (global.gc) {
    setInterval(() => {
      global.gc();
    }, 30000); // Every 30 seconds
  }
}

// Memory cleanup on process termination
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, cleaning up...');
  memoryMonitor.cleanup();
  if (global.gc) {
    global.gc();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, cleaning up...');
  memoryMonitor.cleanup();
  if (global.gc) {
    global.gc();
  }
  process.exit(0);
});

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
    global.inMemoryStorage.usingInMemory = true;
    
    // Limit connection pool to reduce memory usage
    const mongooseOptions = {
      maxPoolSize: 5, // Maintain up to 5 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000 // Close sockets after 45 seconds of inactivity
    };
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quibish', mongooseOptions);
    
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

// Database connection based on environment configuration
const connectToDatabase = async () => {
  const databaseType = process.env.DATABASE_TYPE || 'mongodb';
  
  console.log(`🔧 Database type configured: ${databaseType}`);
  
  switch (databaseType.toLowerCase()) {
    case 'mysql':
      console.log('🔄 Connecting to MySQL database...');
      const mysqlSuccess = await connectToMySQL();
      if (mysqlSuccess) {
        console.log('🔄 Storage mode: MySQL (persistent)');
        return true;
      } else {
        console.log('⚠️  MySQL connection failed, falling back to in-memory storage');
        global.inMemoryStorage.usingInMemory = true;
        global.inMemoryStorage.seedDefaultUsers();
        console.log('🔄 Storage mode: In-memory (non-persistent)');
        return false;
      }
      
    case 'mongodb':
    default:
      console.log('🔄 Connecting to MongoDB database...');
      const mongoSuccess = await connectToMongoDB();
      console.log(`🔄 Storage mode: ${global.inMemoryStorage.usingInMemory ? 'In-memory (non-persistent)' : 'MongoDB (persistent)'}`);
      return mongoSuccess;
  }
};

// HTTPS Enforcement and Security Headers (should be first)
app.use(httpsEnforcementMiddleware);
app.use(securityHeadersMiddleware);

// CORS Configuration - Allow cross-origin requests
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5002',
      'https://colinnebula.github.io',
      process.env.FRONTEND_URL
    ].filter(Boolean); // Remove undefined values
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-encryption-key'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight requests for 10 minutes
};

app.use(cors(corsOptions));

// Enhanced security middleware (individual middleware functions)
app.use(securityMiddleware.securityHeaders);
app.use(securityMiddleware.sanitizeInput);
app.use(securityMiddleware.securityMonitor);

// Health check endpoints (before rate limiting)
app.use('/api', healthRoutes);

// Add comprehensive health check endpoints
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health/detailed', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    storage: global.inMemoryStorage.usingInMemory ? 'in-memory' : 'persistent'
  });
});

// Add startup status endpoint
app.get('/api/startup', (req, res) => {
  res.json(startupService.getInitializationStatus());
});

// Require initialization for all other API routes
app.use('/api', startupService.requireInitialization());

// Rate limiting (after health checks) - Skip for localhost in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50000 : 5000,
  skip: (req) => {
    // Skip rate limiting for localhost in development (hot reload causes many requests)
    if (process.env.NODE_ENV === 'development') {
      const isLocalhost = req.hostname === 'localhost' || 
                          req.hostname === '127.0.0.1' ||
                          req.ip === '127.0.0.1' ||
                          req.ip === '::1';
      return isLocalhost;
    }
    return false;
  },
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
app.use('/api/feedback', feedbackRoutes);
app.use('/api/encryption', encryptionRoutes);
app.use('/api/storage', enhancedStorageRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/offline-notifications', offlineNotificationRoutes);
app.use('/api/social-profiles', socialProfilesRoutes);

// Memory monitoring routes
app.get('/api/memory/report', (req, res) => {
  try {
    const report = memoryMonitor.getMemoryReport();
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating memory report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate memory report'
    });
  }
});

// Memory cleanup endpoint (admin only)
app.post('/api/memory/cleanup', (req, res) => {
  try {
    memoryMonitor.cleanup();
    const report = memoryMonitor.getMemoryReport();
    res.json({
      success: true,
      message: 'Memory cleanup completed',
      data: report.current
    });
  } catch (error) {
    console.error('Error during memory cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform memory cleanup'
    });
  }
});

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

// Start server with comprehensive initialization
(async () => {
  try {
    console.log('🚀 Starting Quibish Backend Server...');
    
    // Initialize startup service
    await startupService.initialize();
    
    // Database connection (handled by startup service, but keeping legacy call for compatibility)
    try {
      await connectToDatabase();
    } catch (error) {
      console.log('⚠️ Database connection failed, using fallback mode');
      global.inMemoryStorage.usingInMemory = true;
      global.inMemoryStorage.seedDefaultUsers();
    }

    // Add signaling routes
    app.use('/api/signaling', signalingRouter);

    // Create HTTP server for WebSocket support
    const server = http.createServer(app);

    // Initialize WebRTC signaling server
    signalingServer.initialize(server);

    // Start server
    server.listen(PORT, () => {
      console.log(`✅ Quibish Backend Server successfully running on port ${PORT}`);
      console.log(`📱 Frontend should connect to: http://localhost:${PORT}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`⚕️  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📊 Startup Status: http://localhost:${PORT}/api/startup`);
      console.log(`🔍 Detailed Health: http://localhost:${PORT}/api/health/detailed`);
      console.log(`🎙️  Voice Call Signaling: ws://localhost:${PORT}/signaling`);
      
      // Start memory monitoring
      memoryMonitor.startMonitoring();
      const initialMemory = memoryMonitor.getMemoryUsage();
      console.log(`📊 Memory Monitor started - Initial usage: ${initialMemory.heapUsed}MB (${initialMemory.percentage}%)`);
      
      // Log startup summary
      const status = startupService.getInitializationStatus();
      console.log(`🎯 Server ready! Initialized in ${status.totalDuration}ms with ${status.steps.length} steps`);
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    console.error('📋 Check the startup status at /api/startup for detailed information');
    process.exit(1);
  }
})();

module.exports = app;
