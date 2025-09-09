const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Dynamic User model import based on database type
const getUserModel = () => {
  const databaseType = process.env.DATABASE_TYPE || 'mongodb';
  if (databaseType.toLowerCase() === 'mysql') {
    return require('../models/mysql/User');
  } else {
    return require('../models/User'); // MongoDB model
  }
};

const User = getUserModel();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Helper function to seed initial users if none exist
const seedInitialUsers = async () => {
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('Seeding initial users...');
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
      console.log('Initial users seeded successfully');
    } catch (error) {
      console.error('Error seeding initial users:', error);
    }
  }
};

// Seed initial users when MongoDB is available and we're not in fallback mode
// This will be handled by connectToMongoDB instead

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Helper function to find user by username or email with fallback support
const findUser = async (identifier) => {
  // If using in-memory storage, search there
  if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
    return global.inMemoryStorage.users.find(
      user => user.username === identifier || user.email === identifier
    );
  }
  
  // Check database type and use appropriate query
  const databaseType = process.env.DATABASE_TYPE || 'mongodb';
  
  if (databaseType.toLowerCase() === 'mysql') {
    // MySQL/Sequelize query
    const { Op } = require('sequelize');
    return await User.findOne({
      where: {
        [Op.or]: [
          { username: identifier },
          { email: identifier }
        ]
      }
    });
  } else {
    // MongoDB query
    return await User.findOne({
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    });
  }
};

// POST /api/auth/login - matches what frontend expects
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt:', { username, timestamp: new Date().toISOString() });

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find user
    const user = await findUser(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorAuth && user.twoFactorAuth.enabled) {
      // Return special response indicating 2FA is required
      return res.json({
        success: true,
        requiresTwoFactor: true,
        userId: user.id,
        message: '2FA verification required'
      });
    }

    // Update user's online status and last active time
    user.isOnline = true;
    user.lastActive = new Date();
    user.status = 'online';
    
    // Handle database updates based on storage mode
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      // Update in-memory user
      const userIndex = global.inMemoryStorage.users.findIndex(
        u => u.id === user.id || u.username === user.username || u.email === user.email
      );
      if (userIndex !== -1) {
        global.inMemoryStorage.users[userIndex] = {
          ...global.inMemoryStorage.users[userIndex],
          isOnline: true,
          lastActive: new Date(),
          status: 'online'
        };
      }
    } else {
      // Save to MySQL or MongoDB
      await user.save();
    }

    // Generate token
    const token = generateToken(user);

    // Return user data (excluding password)
    let userObject;
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      userObject = { ...user };
      delete userObject.password;
    } else {
      const databaseType = process.env.DATABASE_TYPE || 'mongodb';
      if (databaseType.toLowerCase() === 'mysql') {
        userObject = user.toJSON();
      } else {
        userObject = user.toObject();
      }
      delete userObject.password;
    }
    
    console.log('Login successful for:', username);
    
    res.json({
      success: true,
      user: userObject,
      token: token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/complete-login - Complete login after 2FA verification
router.post('/complete-login', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Find user by ID instead of username/email
    let user;
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      user = global.inMemoryStorage.users.find(u => u.id === userId);
    } else {
      user = await User.findOne({ id: userId });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user's online status and last active time
    user.isOnline = true;
    user.lastActive = new Date();
    user.status = 'online';
    
    // Handle in-memory vs MongoDB
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      // Update in-memory user
      const userIndex = global.inMemoryStorage.users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        global.inMemoryStorage.users[userIndex] = {
          ...global.inMemoryStorage.users[userIndex],
          isOnline: true,
          lastActive: new Date(),
          status: 'online'
        };
      }
    } else {
      // Save to MongoDB
      await user.save();
    }

    // Generate token
    const token = generateToken(user);

    // Return user data (excluding password)
    let userObject;
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      userObject = { ...user };
      delete userObject.password;
    } else {
      userObject = user.toObject();
      delete userObject.password;
    }
    
    console.log('Login completed with 2FA for user:', user.username);
    
    res.json({
      success: true,
      user: userObject,
      token: token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Complete login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/register - matches what frontend expects
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log('Registration attempt:', { username, email, timestamp: new Date().toISOString() });

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
    }

    // Check if user already exists - either in MongoDB or in-memory storage
    let existingUser;
    
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      existingUser = global.inMemoryStorage.users.find(
        user => user.username === username || user.email === email
      );
    } else {
      existingUser = await User.findOne({
        $or: [
          { username: username },
          { email: email }
        ]
      });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user object with shared structure for both MongoDB and in-memory storage
    const userId = uuidv4();
    const newUserData = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      name: username.charAt(0).toUpperCase() + username.slice(1),
      displayName: username.charAt(0).toUpperCase() + username.slice(1),
      bio: '',
      phone: '',
      location: '',
      company: '',
      jobTitle: '',
      website: '',
      avatar: null,
      avatarColor: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      status: 'online',
      statusMessage: '',
      socialLinks: {
        twitter: '',
        linkedin: '',
        github: '',
        instagram: '',
        facebook: '',
        youtube: '',
        website: ''
      },
      theme: 'light',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      notifications: {
        email: true,
        push: true,
        desktop: true,
        sound: true,
        mentions: true,
        directMessages: true,
        groupMessages: true,
        marketing: false
      },
      privacy: {
        profileVisibility: 'public',
        lastSeenVisibility: 'everyone',
        onlineStatusVisibility: 'everyone',
        phoneVisibility: 'contacts',
        emailVisibility: 'contacts',
        locationVisibility: 'contacts'
      },
      role: 'user',
      isOnline: true,
      lastActive: new Date(),
      userMedia: {
        photos: [],
        videos: [],
        gifs: []
      },
      viewHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    let newUser;
    let userObject;
    
    // Save user based on storage mode
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      // Save to in-memory storage
      global.inMemoryStorage.users.push(newUserData);
      newUser = newUserData;
      userObject = { ...newUserData };
      delete userObject.password;
    } else {
      // Save to MongoDB
      newUser = new User(newUserData);
      await newUser.save();
      userObject = newUser.toObject();
      delete userObject.password;
    }

    // Generate token
    const token = generateToken(newUser);
    
    console.log('Registration successful for:', username);
    
    res.status(201).json({
      success: true,
      user: userObject,
      token: token,
      message: 'Registration successful'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // In a stateless JWT system, logout is typically handled client-side
  // by removing the token from storage
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// GET /api/auth/verify - verify JWT token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    let user;
    let userObject;
    
    // Find user based on storage mode
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      // Find in in-memory storage
      user = global.inMemoryStorage.users.find(u => u.id === decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }
      
      // Update last active timestamp
      const userIndex = global.inMemoryStorage.users.findIndex(u => u.id === decoded.id);
      if (userIndex !== -1) {
        global.inMemoryStorage.users[userIndex].lastActive = new Date();
      }
      
      userObject = { ...user };
      delete userObject.password;
    } else {
      // Find in MongoDB
      user = await User.findOne({ id: decoded.id });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }
      
      // Update last active timestamp
      user.lastActive = new Date();
      await user.save();
      
      userObject = user.toObject();
      delete userObject.password;
    }
    
    res.json({
      success: true,
      user: userObject
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// Check if we're using in-memory storage
router.get('/storage-mode', (req, res) => {
  const usingInMemory = global.inMemoryStorage && global.inMemoryStorage.usingInMemory === true;
  
  res.json({
    success: true,
    mode: usingInMemory ? 'in-memory' : 'mongodb',
    message: usingInMemory 
      ? 'Running with in-memory storage (data will be lost on restart)' 
      : 'Running with MongoDB persistence'
  });
});

// Export router and seedInitialUsers
module.exports = router;
module.exports.seedInitialUsers = seedInitialUsers;
