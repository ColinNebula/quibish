/**
 * Enhanced Storage API Routes
 * API endpoints for advanced storage management
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const databaseService = require('../services/databaseService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../uploads/temp'),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    // Allow most file types
    const allowedTypes = /\.(jpg|jpeg|png|gif|webp|bmp|mp4|avi|mov|wmv|mp3|wav|ogg|pdf|doc|docx|txt)$/i;
    
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

/**
 * Get enhanced storage statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await databaseService.getEnhancedStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Stats retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage statistics'
    });
  }
});

/**
 * Upload file with enhanced processing
 */
router.post('/upload', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const results = [];
    const userId = req.user.id;

    for (const file of req.files) {
      try {
        const result = await databaseService.storeFile(
          file.path,
          file.originalname,
          userId,
          {
            tags: req.body.tags ? req.body.tags.split(',') : []
          }
        );

        // Clean up temp file
        try {
          await fs.unlink(file.path);
        } catch (error) {
          // Temp file might already be moved
        }

        results.push({
          originalName: file.originalname,
          ...result
        });
      } catch (error) {
        console.error(`❌ File upload failed for ${file.originalname}:`, error);
        results.push({
          originalName: file.originalname,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      files: results
    });
  } catch (error) {
    console.error('❌ Upload failed:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed'
    });
  }
});

/**
 * Get file
 */
router.get('/file/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const result = await databaseService.getFile(fileId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Set appropriate headers
    const metadata = result.metadata;
    res.setHeader('Content-Type', getContentType(metadata.extension));
    res.setHeader('Content-Disposition', `inline; filename="${metadata.originalName}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

    // Stream file
    res.sendFile(path.resolve(result.filePath));
  } catch (error) {
    console.error(`❌ File retrieval failed for ${req.params.fileId}:`, error);
    res.status(500).json({
      success: false,
      error: 'File retrieval failed'
    });
  }
});

/**
 * Get file thumbnail
 */
router.get('/thumbnail/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await databaseService.getFile(fileId);

    if (!file.success) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    if (!file.metadata.thumbnailPath) {
      return res.status(404).json({
        success: false,
        error: 'No thumbnail available'
      });
    }

    // Check if thumbnail exists
    try {
      await fs.access(file.metadata.thumbnailPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Thumbnail not found'
      });
    }

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.sendFile(path.resolve(file.metadata.thumbnailPath));
  } catch (error) {
    console.error(`❌ Thumbnail retrieval failed for ${req.params.fileId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Thumbnail retrieval failed'
    });
  }
});

/**
 * Store data with enhanced features
 */
router.post('/store', authenticateToken, async (req, res) => {
  try {
    const { category, id, data, options = {} } = req.body;

    if (!category || !id || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: category, id, data'
      });
    }

    const result = await databaseService.storeEnhanced(category, id, data, options);
    res.json(result);
  } catch (error) {
    console.error('❌ Enhanced store failed:', error);
    res.status(500).json({
      success: false,
      error: 'Storage failed'
    });
  }
});

/**
 * Retrieve data
 */
router.get('/retrieve/:category/:id', authenticateToken, async (req, res) => {
  try {
    const { category, id } = req.params;
    const result = await databaseService.retrieveEnhanced(category, id);
    res.json(result);
  } catch (error) {
    console.error(`❌ Enhanced retrieve failed for ${req.params.category}:${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Retrieval failed'
    });
  }
});

/**
 * Store message with enhanced features
 */
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const messageData = {
      id: req.body.id || Date.now().toString(),
      userId: req.user.id,
      content: req.body.content,
      timestamp: new Date().toISOString(),
      ...req.body
    };

    const options = {
      ttl: req.body.ttl,
      tags: req.body.tags,
      priority: req.body.priority
    };

    const result = await databaseService.storeMessage(messageData, options);
    res.json(result);
  } catch (error) {
    console.error('❌ Enhanced message store failed:', error);
    res.status(500).json({
      success: false,
      error: 'Message storage failed'
    });
  }
});

/**
 * Get messages with enhanced caching
 */
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 50,
      since: req.query.since,
      until: req.query.until
    };

    const messages = await databaseService.getMessages(options);
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('❌ Enhanced message retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Message retrieval failed'
    });
  }
});

/**
 * Cleanup storage
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin privileges (you might want to add this check)
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient privileges'
      });
    }

    const result = await databaseService.cleanupStorage();
    res.json(result);
  } catch (error) {
    console.error('❌ Storage cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed'
    });
  }
});

/**
 * Get content type for file extension
 */
function getContentType(extension) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.mp4': 'video/mp4',
    '.avi': 'video/avi',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain'
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

module.exports = router;