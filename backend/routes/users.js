const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const bcrypt = require('bcryptjs');

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

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/avatars');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with user ID and timestamp
    const extension = path.extname(file.originalname);
    const filename = `avatar_${req.user.id}_${Date.now()}${extension}`;
    cb(null, filename);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// POST /api/users/avatar - upload user avatar
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Handle in-memory storage
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      const user = global.inMemoryStorage.users.find(u => u.id === req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Delete old avatar file if it exists and is not the default
      if (user.avatar && !user.avatar.includes('default-avatar')) {
        const oldAvatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.avatar));
        if (fs.existsSync(oldAvatarPath)) {
          try {
            fs.unlinkSync(oldAvatarPath);
          } catch (err) {
            console.warn('Could not delete old avatar:', err.message);
          }
        }
      }

      // Update user avatar URL
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      user.avatar = avatarUrl;
      user.updatedAt = new Date();

      return res.json({
        success: true,
        avatarUrl: avatarUrl,
        message: 'Avatar uploaded successfully'
      });
    }

    // Handle MongoDB storage
    const user = await User.findOne({ id: req.user.id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete old avatar file if it exists and is not the default
    if (user.avatar && !user.avatar.includes('default-avatar')) {
      const oldAvatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.avatar));
      if (fs.existsSync(oldAvatarPath)) {
        try {
          fs.unlinkSync(oldAvatarPath);
        } catch (err) {
          console.warn('Could not delete old avatar:', err.message);
        }
      }
    }

    // Update user avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.avatar = avatarUrl;
    user.updatedAt = new Date();
    
    await user.save();

    res.json({
      success: true,
      avatarUrl: avatarUrl,
      message: 'Avatar uploaded successfully'
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.warn('Could not clean up uploaded file:', unlinkError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload avatar'
    });
  }
});

// DELETE /api/users/avatar - remove user avatar
router.delete('/avatar', authenticateToken, async (req, res) => {
  try {
    // Handle in-memory storage
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      const user = global.inMemoryStorage.users.find(u => u.id === req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Delete current avatar file if it exists and is not the default
      if (user.avatar && !user.avatar.includes('default-avatar')) {
        const avatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.avatar));
        if (fs.existsSync(avatarPath)) {
          try {
            fs.unlinkSync(avatarPath);
            console.log('Deleted avatar file:', avatarPath);
          } catch (err) {
            console.warn('Could not delete avatar file:', err.message);
          }
        }
      }

      // Remove avatar from user record
      user.avatar = null;
      user.updatedAt = new Date();

      return res.json({
        success: true,
        message: 'Avatar removed successfully'
      });
    }

    // Handle MongoDB storage
    const user = await User.findOne({ id: req.user.id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete current avatar file if it exists and is not the default
    if (user.avatar && !user.avatar.includes('default-avatar')) {
      const avatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.avatar));
      if (fs.existsSync(avatarPath)) {
        try {
          fs.unlinkSync(avatarPath);
          console.log('Deleted avatar file:', avatarPath);
        } catch (err) {
          console.warn('Could not delete avatar file:', err.message);
        }
      }
    }

    // Remove avatar from user record
    user.avatar = null;
    user.updatedAt = new Date();
    
    await user.save();

    res.json({
      success: true,
      message: 'Avatar removed successfully'
    });
  } catch (error) {
    console.error('Avatar removal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove avatar'
    });
  }
});

// GET /api/users/profile - get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const databaseType = process.env.DATABASE_TYPE || 'mongodb';
    let user;
    
    if (databaseType.toLowerCase() === 'mysql') {
      // MySQL/Sequelize query
      user = await User.findOne({ where: { id: req.user.id } });
    } else {
      // MongoDB query
      user = await User.findOne({ id: req.user.id });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Format user object based on database type
    let userObject;
    if (databaseType.toLowerCase() === 'mysql') {
      userObject = user.toJSON();
    } else {
      userObject = user.toObject();
    }
    delete userObject.password;
    
    res.json({
      success: true,
      user: userObject
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/users/profile - update current user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    // Handle in-memory storage
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      const userIndex = global.inMemoryStorage.users.findIndex(u => u.id === req.user.id);
      
      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = global.inMemoryStorage.users[userIndex];

      // Enhanced allowed updates for comprehensive profile
      const allowedUpdates = [
        'name', 'displayName', 'bio', 'phone', 'location', 'company', 'jobTitle',
        'website', 'avatar', 'avatarColor', 'statusMessage', 'theme', 'language', 'timezone'
      ];
      
      // Update simple fields
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          user[field] = req.body[field];
        }
      });

      // Handle nested objects properly
      if (req.body.socialLinks) {
        if (!user.socialLinks) user.socialLinks = {};
        Object.keys(req.body.socialLinks).forEach(key => {
          user.socialLinks[key] = req.body.socialLinks[key];
        });
      }
      
      if (req.body.notifications) {
        if (!user.notifications) user.notifications = {};
        Object.keys(req.body.notifications).forEach(key => {
          user.notifications[key] = req.body.notifications[key];
        });
      }
      
      if (req.body.privacy) {
        if (!user.privacy) user.privacy = {};
        Object.keys(req.body.privacy).forEach(key => {
          user.privacy[key] = req.body.privacy[key];
        });
      }

      // Update timestamp
      user.updatedAt = new Date().toISOString();
      
      // Update the user in the array
      global.inMemoryStorage.users[userIndex] = user;
      
      // Return updated user object (without password)
      const { password, ...userObject } = user;
      
      return res.json({
        success: true,
        user: userObject,
        message: 'Profile updated successfully'
      });
    }

    // Handle MySQL or MongoDB storage
    const databaseType = process.env.DATABASE_TYPE || 'mongodb';
    let user;
    
    if (databaseType.toLowerCase() === 'mysql') {
      // MySQL/Sequelize query
      user = await User.findOne({ where: { id: req.user.id } });
    } else {
      // MongoDB query
      user = await User.findOne({ id: req.user.id });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Enhanced allowed updates for comprehensive profile
    const allowedUpdates = [
      'name', 'displayName', 'bio', 'phone', 'location', 'company', 'jobTitle',
      'website', 'avatar', 'avatarColor', 'statusMessage', 'theme', 'language', 'timezone'
    ];
    
    // Update simple fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Handle nested objects properly
    if (req.body.socialLinks) {
      if (databaseType.toLowerCase() === 'mysql') {
        // For MySQL, ensure the object exists first
        if (!user.socialLinks) user.socialLinks = {};
        Object.assign(user.socialLinks, req.body.socialLinks);
      } else {
        // For MongoDB
        Object.keys(req.body.socialLinks).forEach(key => {
          user.socialLinks[key] = req.body.socialLinks[key];
        });
      }
    }
    
    if (req.body.notifications) {
      if (databaseType.toLowerCase() === 'mysql') {
        // For MySQL, ensure the object exists first
        if (!user.notifications) user.notifications = {};
        Object.assign(user.notifications, req.body.notifications);
      } else {
        // For MongoDB
        Object.keys(req.body.notifications).forEach(key => {
          user.notifications[key] = req.body.notifications[key];
        });
      }
    }
    
    if (req.body.privacy) {
      if (databaseType.toLowerCase() === 'mysql') {
        // For MySQL, ensure the object exists first
        if (!user.privacy) user.privacy = {};
        Object.assign(user.privacy, req.body.privacy);
      } else {
        // For MongoDB
        Object.keys(req.body.privacy).forEach(key => {
          user.privacy[key] = req.body.privacy[key];
        });
      }
    }

    // Update timestamp
    if (databaseType.toLowerCase() === 'mysql') {
      user.updatedAt = new Date();
    } else {
      user.updatedAt = new Date();
    }
    
    // Save changes to database
    await user.save();
    
    // Return updated user object
    let userObject;
    if (databaseType.toLowerCase() === 'mysql') {
      userObject = user.toJSON();
    } else {
      userObject = user.toObject();
    }
    delete userObject.password;
    
    res.json({
      success: true,
      user: userObject,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/users/preferences - update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    // Handle in-memory storage
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      const userIndex = global.inMemoryStorage.users.findIndex(u => u.id === req.user.id);
      
      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = global.inMemoryStorage.users[userIndex];

      const { theme, language, timezone, notifications, privacy } = req.body;
      
      // Update direct fields
      if (theme) user.theme = theme;
      if (language) user.language = language;
      if (timezone) user.timezone = timezone;
      
      // Update nested objects
      if (notifications) {
        if (!user.notifications) user.notifications = {};
        Object.keys(notifications).forEach(key => {
          user.notifications[key] = notifications[key];
        });
      }
      
      if (privacy) {
        if (!user.privacy) user.privacy = {};
        Object.keys(privacy).forEach(key => {
          user.privacy[key] = privacy[key];
        });
      }

      // Update timestamp
      user.updatedAt = new Date().toISOString();
      
      // Update the user in the array
      global.inMemoryStorage.users[userIndex] = user;
      
      // Return updated user object (without password)
      const { password, ...userObject } = user;
      
      return res.json({
        success: true,
        user: userObject,
        message: 'Preferences updated successfully'
      });
    }

    // Handle MySQL or MongoDB storage
    const databaseType = process.env.DATABASE_TYPE || 'mongodb';
    let user;
    
    if (databaseType.toLowerCase() === 'mysql') {
      // MySQL/Sequelize query
      user = await User.findOne({ where: { id: req.user.id } });
    } else {
      // MongoDB query
      user = await User.findOne({ id: req.user.id });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const { theme, language, timezone, notifications, privacy } = req.body;
    
    // Update direct fields
    if (theme) user.theme = theme;
    if (language) user.language = language;
    if (timezone) user.timezone = timezone;
    
    // Update nested objects
    if (notifications) {
      if (databaseType.toLowerCase() === 'mysql') {
        // For MySQL, ensure the object exists first
        if (!user.notifications) user.notifications = {};
        Object.assign(user.notifications, notifications);
      } else {
        // For MongoDB
        Object.keys(notifications).forEach(key => {
          user.notifications[key] = notifications[key];
        });
      }
    }
    
    if (privacy) {
      if (databaseType.toLowerCase() === 'mysql') {
        // For MySQL, ensure the object exists first
        if (!user.privacy) user.privacy = {};
        Object.assign(user.privacy, privacy);
      } else {
        // For MongoDB
        Object.keys(privacy).forEach(key => {
          user.privacy[key] = privacy[key];
        });
      }
    }

    // Update timestamp
    user.updatedAt = new Date();
    
    // Save to database
    await user.save();
    
    // Return updated user
    let userObject;
    if (databaseType.toLowerCase() === 'mysql') {
      userObject = user.toJSON();
    } else {
      userObject = user.toObject();
    }
    delete userObject.password;
    
    res.json({
      success: true,
      user: userObject,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/users/change-password - change user password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }
    
    const user = await User.findOne({ id: req.user.id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date();
    
    // Save to database
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/users/search - search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    const searchQuery = query.toLowerCase().trim();
    const limitNum = parseInt(limit);
    
    // Search by name, username, or email using MongoDB query
    const filteredUsers = await User.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { username: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ]
    }).limit(limitNum);
    
    // Format the response data
    const formattedUsers = filteredUsers.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      displayName: user.displayName,
      avatar: user.avatar,
      status: user.status,
      bio: user.bio,
      location: user.location,
      company: user.company
    }));
    
    res.json({
      success: true,
      users: formattedUsers,
      query: query,
      count: formattedUsers.length
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/users/:id - get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Return public user data only
    const publicUserData = {
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      status: user.status,
      role: user.role,
      bio: user.bio,
      location: user.location,
      company: user.company,
      website: user.website,
      createdAt: user.createdAt
    };
    
    res.json({
      success: true,
      user: publicUserData
    });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/users - get all users (with pagination)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Count total users for pagination
    const totalUsers = await User.countDocuments();
    
    // Get paginated users from database
    const users = await User.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first
    
    // Return public user data only
    const publicUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      status: user.status,
      role: user.role,
      bio: user.bio,
      location: user.location,
      company: user.company,
      website: user.website,
      createdAt: user.createdAt
    }));
    
    res.json({
      success: true,
      users: publicUsers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers: totalUsers,
        hasNext: skip + limit < totalUsers,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/users/email - update user email
router.put('/email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const user = await User.findOne({ id: req.user.id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email: email, id: { $ne: req.user.id } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email is already in use'
      });
    }

    // Update email
    user.email = email;
    user.updatedAt = new Date();
    
    // Save to database
    await user.save();
    
    // Return updated user
    const userObject = user.toObject();
    delete userObject.password;
    
    res.json({
      success: true,
      user: userObject,
      message: 'Email updated successfully'
    });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/users/media-summary - get user's media summary
router.get('/media-summary', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userMedia = user.userMedia || {
      photos: [],
      videos: [],
      gifs: []
    };

    const summary = {
      photos: {
        count: userMedia.photos.length,
        totalSize: userMedia.photos.reduce((sum, photo) => sum + (photo.size || 0), 0),
        recent: userMedia.photos.slice(-5) // Last 5 photos
      },
      videos: {
        count: userMedia.videos.length,
        totalSize: userMedia.videos.reduce((sum, video) => sum + (video.size || 0), 0),
        recent: userMedia.videos.slice(-5) // Last 5 videos
      },
      gifs: {
        count: userMedia.gifs.length,
        totalSize: userMedia.gifs.reduce((sum, gif) => sum + (gif.size || 0), 0),
        recent: userMedia.gifs.slice(-5) // Last 5 GIFs
      }
    };

    res.json({
      success: true,
      mediaSummary: summary
    });
  } catch (error) {
    console.error('Error fetching media summary:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper function to get users (for other modules)
const getUsers = async () => {
  return await User.find({});
};

// Export for use in other modules
module.exports.getUsers = getUsers;

module.exports = router;
