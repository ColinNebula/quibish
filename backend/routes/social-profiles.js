const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const router = express.Router();

// Configure multer for cover photo uploads
const coverPhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/covers');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname);
    const filename = `cover_${req.user.id}_${Date.now()}${extension}`;
    cb(null, filename);
  }
});

const coverPhotoUpload = multer({
  storage: coverPhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// GET /api/social-profiles/:userId - Get user's social profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user?.id; // May be undefined if not authenticated

    // Handle in-memory storage
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      const user = global.inMemoryStorage.users.find(u => u.id === userId || u.username === userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Increment profile view count if viewer is different from profile owner
      if (viewerId && viewerId !== user.id) {
        user.profile_views_count = (user.profile_views_count || 0) + 1;
      }

      // Remove sensitive information
      const { password, twoFactorAuth, ...userProfile } = user;

      // Check if viewer is friends with this user (for future connection feature)
      const isFriend = false; // TODO: Implement when connections table exists
      const friendshipStatus = null;

      return res.json({
        success: true,
        profile: {
          ...userProfile,
          isFriend,
          friendshipStatus,
          isOwnProfile: viewerId === user.id
        }
      });
    }

    // Handle database storage
    const db = require('../config/database');
    const [users] = await db.query(`
      SELECT 
        id, username, email, name, displayName, avatar, cover_photo,
        bio, location, website, company, jobTitle, headline,
        date_of_birth, gender, relationship_status,
        friends_count, posts_count, followers_count, following_count,
        profile_views_count, is_verified, badges, account_type,
        status, last_active_at, createdAt
      FROM users 
      WHERE id = ? OR username = ?
    `, [userId, userId]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = users[0];

    // Increment profile view count
    if (viewerId && viewerId !== user.id) {
      await db.query(
        'UPDATE users SET profile_views_count = profile_views_count + 1 WHERE id = ?',
        [user.id]
      );
    }

    // Check friendship status (if connections table exists)
    let isFriend = false;
    let friendshipStatus = null;
    
    if (viewerId && viewerId !== user.id) {
      try {
        const [connections] = await db.query(
          'SELECT status FROM connections WHERE user_id = ? AND friend_id = ?',
          [viewerId, user.id]
        );
        
        if (connections.length > 0) {
          friendshipStatus = connections[0].status;
          isFriend = connections[0].status === 'accepted';
        }
      } catch (error) {
        // Connections table might not exist yet
        console.log('Connections check skipped:', error.message);
      }
    }

    res.json({
      success: true,
      profile: {
        ...user,
        isFriend,
        friendshipStatus,
        isOwnProfile: viewerId === user.id
      }
    });
  } catch (error) {
    console.error('Error fetching social profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/social-profiles/update - Update current user's social profile
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      bio,
      headline,
      interests,
      location,
      website,
      company,
      jobTitle,
      dateOfBirth,
      gender,
      relationshipStatus
    } = req.body;

    // Validate bio length
    if (bio && bio.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Bio must be 500 characters or less'
      });
    }

    // Handle in-memory storage
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      const userIndex = global.inMemoryStorage.users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = global.inMemoryStorage.users[userIndex];
      
      // Update fields
      if (bio !== undefined) user.bio = sanitizeInput(bio);
      if (headline !== undefined) user.headline = sanitizeInput(headline);
      if (interests !== undefined) user.interests = interests;
      if (location !== undefined) user.location = sanitizeInput(location);
      if (website !== undefined) user.website = sanitizeInput(website);
      if (company !== undefined) user.company = sanitizeInput(company);
      if (jobTitle !== undefined) user.jobTitle = sanitizeInput(jobTitle);
      if (dateOfBirth !== undefined) user.date_of_birth = dateOfBirth;
      if (gender !== undefined) user.gender = gender;
      if (relationshipStatus !== undefined) user.relationship_status = relationshipStatus;
      
      user.updatedAt = new Date();

      // Remove sensitive data
      const { password, twoFactorAuth, ...userProfile } = user;

      return res.json({
        success: true,
        profile: userProfile,
        message: 'Profile updated successfully'
      });
    }

    // Handle database storage
    const db = require('../config/database');
    
    const updates = [];
    const values = [];

    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(sanitizeInput(bio));
    }
    if (headline !== undefined) {
      updates.push('headline = ?');
      values.push(sanitizeInput(headline));
    }
    if (interests !== undefined) {
      updates.push('interests = ?');
      values.push(JSON.stringify(interests));
    }
    if (location !== undefined) {
      updates.push('location = ?');
      values.push(sanitizeInput(location));
    }
    if (website !== undefined) {
      updates.push('website = ?');
      values.push(sanitizeInput(website));
    }
    if (company !== undefined) {
      updates.push('company = ?');
      values.push(sanitizeInput(company));
    }
    if (jobTitle !== undefined) {
      updates.push('jobTitle = ?');
      values.push(sanitizeInput(jobTitle));
    }
    if (dateOfBirth !== undefined) {
      updates.push('date_of_birth = ?');
      values.push(dateOfBirth);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      values.push(gender);
    }
    if (relationshipStatus !== undefined) {
      updates.push('relationship_status = ?');
      values.push(relationshipStatus);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updates.push('updatedAt = NOW()');
    values.push(userId);

    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated profile
    const [users] = await db.query(`
      SELECT 
        id, username, email, name, displayName, avatar, cover_photo,
        bio, location, website, company, jobTitle, headline,
        date_of_birth, gender, relationship_status,
        friends_count, posts_count, followers_count, following_count,
        profile_views_count, is_verified, badges, account_type,
        status, last_active_at, createdAt
      FROM users 
      WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      profile: users[0],
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating social profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/social-profiles/cover-photo - Upload cover photo
router.post('/cover-photo', authenticateToken, coverPhotoUpload.single('cover'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const coverUrl = `/uploads/covers/${req.file.filename}`;
    const userId = req.user.id;

    // Handle in-memory storage
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      const user = global.inMemoryStorage.users.find(u => u.id === userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Delete old cover photo if it exists
      if (user.cover_photo) {
        const oldCoverPath = path.join(__dirname, '../uploads/covers', path.basename(user.cover_photo));
        if (fs.existsSync(oldCoverPath)) {
          try {
            fs.unlinkSync(oldCoverPath);
          } catch (err) {
            console.warn('Could not delete old cover photo:', err.message);
          }
        }
      }

      user.cover_photo = coverUrl;
      user.updatedAt = new Date();

      return res.json({
        success: true,
        coverPhotoUrl: coverUrl,
        message: 'Cover photo uploaded successfully'
      });
    }

    // Handle database storage
    const db = require('../config/database');
    
    // Get old cover photo to delete
    const [users] = await db.query('SELECT cover_photo FROM users WHERE id = ?', [userId]);
    
    if (users.length > 0 && users[0].cover_photo) {
      const oldCoverPath = path.join(__dirname, '../uploads/covers', path.basename(users[0].cover_photo));
      if (fs.existsSync(oldCoverPath)) {
        try {
          fs.unlinkSync(oldCoverPath);
        } catch (err) {
          console.warn('Could not delete old cover photo:', err.message);
        }
      }
    }

    // Update database
    await db.query(
      'UPDATE users SET cover_photo = ?, updatedAt = NOW() WHERE id = ?',
      [coverUrl, userId]
    );

    res.json({
      success: true,
      coverPhotoUrl: coverUrl,
      message: 'Cover photo uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading cover photo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/social-profiles/cover-photo - Remove cover photo
router.delete('/cover-photo', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Handle in-memory storage
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      const user = global.inMemoryStorage.users.find(u => u.id === userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Delete cover photo file
      if (user.cover_photo) {
        const coverPath = path.join(__dirname, '../uploads/covers', path.basename(user.cover_photo));
        if (fs.existsSync(coverPath)) {
          try {
            fs.unlinkSync(coverPath);
          } catch (err) {
            console.warn('Could not delete cover photo:', err.message);
          }
        }
      }

      user.cover_photo = null;
      user.updatedAt = new Date();

      return res.json({
        success: true,
        message: 'Cover photo removed successfully'
      });
    }

    // Handle database storage
    const db = require('../config/database');
    
    // Get cover photo to delete
    const [users] = await db.query('SELECT cover_photo FROM users WHERE id = ?', [userId]);
    
    if (users.length > 0 && users[0].cover_photo) {
      const coverPath = path.join(__dirname, '../uploads/covers', path.basename(users[0].cover_photo));
      if (fs.existsSync(coverPath)) {
        try {
          fs.unlinkSync(coverPath);
        } catch (err) {
          console.warn('Could not delete cover photo:', err.message);
        }
      }
    }

    // Update database
    await db.query(
      'UPDATE users SET cover_photo = NULL, updatedAt = NOW() WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Cover photo removed successfully'
    });
  } catch (error) {
    console.error('Error removing cover photo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/social-profiles/:userId/stats - Get user statistics
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    // Handle in-memory storage
    if (global.inMemoryStorage && global.inMemoryStorage.usingInMemory) {
      const user = global.inMemoryStorage.users.find(u => u.id === userId || u.username === userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      return res.json({
        success: true,
        stats: {
          friendsCount: user.friends_count || 0,
          postsCount: user.posts_count || 0,
          followersCount: user.followers_count || 0,
          followingCount: user.following_count || 0,
          profileViewsCount: user.profile_views_count || 0
        }
      });
    }

    // Handle database storage
    const db = require('../config/database');
    const [users] = await db.query(`
      SELECT 
        friends_count, posts_count, followers_count, 
        following_count, profile_views_count
      FROM users 
      WHERE id = ? OR username = ?
    `, [userId, userId]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      stats: users[0]
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
