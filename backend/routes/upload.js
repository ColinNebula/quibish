const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
const mediaDir = path.join(uploadsDir, 'user-media');
const photosDir = path.join(mediaDir, 'photos');
const videosDir = path.join(mediaDir, 'videos');
const gifsDir = path.join(mediaDir, 'gifs');

[uploadsDir, avatarsDir, mediaDir, photosDir, videosDir, gifsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename: userId_timestamp.extension
    const extension = path.extname(file.originalname);
    const filename = `${req.user.id}_${Date.now()}${extension}`;
    cb(null, filename);
  }
});

// Configure multer for user media uploads (photos, videos, GIFs)
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    if (file.mimetype.startsWith('image/')) {
      if (file.mimetype === 'image/gif') {
        uploadPath = gifsDir;
      } else {
        uploadPath = photosDir;
      }
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath = videosDir;
    } else {
      uploadPath = mediaDir; // fallback
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const filename = `${req.user.id}_${Date.now()}${extension}`;
    cb(null, filename);
  }
});

// File filter for images only (avatar)
const avatarFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// File filter for user media (photos, videos, GIFs)
const mediaFileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
  
  if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, OGG, AVI, MOV) are allowed.'), false);
  }
};

// Configure multer with size limit (5MB for avatars)
const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: avatarFileFilter
});

// Configure multer for user media with larger size limit (50MB for videos)
const mediaUpload = multer({
  storage: mediaStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for videos/large media
  },
  fileFilter: mediaFileFilter
});

// Import users array directly from auth module
const authModule = require('./auth');

// POST /api/upload/avatar - upload avatar image
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Get current users array from auth module
    const users = authModule.users;
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      // Clean up uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete old avatar file if it exists
    if (users[userIndex].avatar && users[userIndex].avatar.startsWith('/uploads/avatars/')) {
      const oldAvatarPath = path.join(__dirname, '..', users[userIndex].avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user avatar
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    users[userIndex].avatar = avatarUrl;
    users[userIndex].updatedAt = new Date().toISOString();

    // Return updated user without password
    const { password: _, ...userWithoutPassword } = users[userIndex];

    res.json({
      success: true,
      user: userWithoutPassword,
      avatar: avatarUrl,
      message: 'Avatar uploaded successfully'
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload avatar'
    });
  }
});

// DELETE /api/upload/avatar - remove avatar
router.delete('/avatar', authenticateToken, (req, res) => {
  try {
    const users = authModule.users;
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete avatar file if it exists
    if (users[userIndex].avatar && users[userIndex].avatar.startsWith('/uploads/avatars/')) {
      const avatarPath = path.join(__dirname, '..', users[userIndex].avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Remove avatar from user
    users[userIndex].avatar = null;
    users[userIndex].updatedAt = new Date().toISOString();

    // Return updated user without password
    const { password: _, ...userWithoutPassword } = users[userIndex];

    res.json({
      success: true,
      user: userWithoutPassword,
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

// POST /api/upload/media - upload user media (photos, videos, GIFs)
router.post('/media', authenticateToken, mediaUpload.array('media', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const users = authModule.users;
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      // Clean up uploaded files if user not found
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Initialize user media arrays if they don't exist
    if (!users[userIndex].userMedia) {
      users[userIndex].userMedia = {
        photos: [],
        videos: [],
        gifs: []
      };
    }

    const uploadedMedia = [];

    // Process each uploaded file
    req.files.forEach(file => {
      const mediaUrl = `/uploads/user-media/${path.basename(path.dirname(file.path))}/${file.filename}`;
      const mediaInfo = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        url: mediaUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };

      // Categorize media
      if (file.mimetype === 'image/gif') {
        users[userIndex].userMedia.gifs.push(mediaInfo);
      } else if (file.mimetype.startsWith('image/')) {
        users[userIndex].userMedia.photos.push(mediaInfo);
      } else if (file.mimetype.startsWith('video/')) {
        users[userIndex].userMedia.videos.push(mediaInfo);
      }

      uploadedMedia.push(mediaInfo);
    });

    users[userIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      uploadedMedia,
      userMedia: users[userIndex].userMedia,
      message: `Successfully uploaded ${uploadedMedia.length} file(s)`
    });

  } catch (error) {
    console.error('Media upload error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 50MB per file.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload media'
    });
  }
});

// GET /api/upload/media - get user's media
router.get('/media', authenticateToken, (req, res) => {
  try {
    const users = authModule.users;
    const user = users.find(u => u.id === req.user.id);
    
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

    res.json({
      success: true,
      userMedia
    });

  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve media'
    });
  }
});

// DELETE /api/upload/media/:mediaId - delete specific media
router.delete('/media/:mediaId', authenticateToken, (req, res) => {
  try {
    const { mediaId } = req.params;
    const users = authModule.users;
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userMedia = users[userIndex].userMedia;
    if (!userMedia) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }

    let mediaFound = false;
    let mediaPath = null;

    // Search in all media categories
    ['photos', 'videos', 'gifs'].forEach(category => {
      const mediaIndex = userMedia[category].findIndex(media => media.id === mediaId);
      if (mediaIndex !== -1) {
        const media = userMedia[category][mediaIndex];
        mediaPath = path.join(__dirname, '..', media.url);
        userMedia[category].splice(mediaIndex, 1);
        mediaFound = true;
      }
    });

    if (!mediaFound) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }

    // Delete file from filesystem
    if (mediaPath && fs.existsSync(mediaPath)) {
      fs.unlinkSync(mediaPath);
    }

    users[userIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      userMedia: users[userIndex].userMedia,
      message: 'Media deleted successfully'
    });

  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete media'
    });
  }
});

module.exports = router;
