const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// POST /api/feedback - Submit user feedback
router.post('/', [
  body('type').notEmpty().withMessage('Feedback type is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email address'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('category').optional().notEmpty().withMessage('Category cannot be empty'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority level'),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      type,
      title,
      description,
      email,
      rating,
      category,
      priority,
      attachments,
      timestamp,
      userAgent,
      url
    } = req.body;

    // Get user information if authenticated
    let userId = null;
    let userEmail = null;
    if (req.user) {
      userId = req.user.id;
      userEmail = req.user.email;
    }

    // Create feedback object
    const feedbackData = {
      id: Date.now().toString(), // Simple ID generation for now
      userId,
      userEmail,
      type,
      title,
      description,
      contactEmail: email || userEmail,
      rating: rating || null,
      category: category || null,
      priority: priority || 'medium',
      attachments: attachments || [],
      timestamp: timestamp || new Date().toISOString(),
      userAgent: userAgent || req.get('User-Agent'),
      url: url || req.get('Referer'),
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real application, you would save this to a database
    // For now, we'll just log it and simulate success
    console.log('📝 Feedback received:', {
      id: feedbackData.id,
      type: feedbackData.type,
      title: feedbackData.title,
      userId: feedbackData.userId,
      priority: feedbackData.priority,
      timestamp: feedbackData.timestamp
    });

    // Log detailed feedback for development
    console.log('📝 Full feedback data:', JSON.stringify(feedbackData, null, 2));

    // TODO: In production, save to database
    // Example:
    // const feedback = await Feedback.create(feedbackData);
    
    // TODO: Send notification emails if needed
    // Example:
    // if (feedbackData.priority === 'critical') {
    //   await notificationService.sendCriticalFeedbackAlert(feedbackData);
    // }

    // TODO: If email provided, send confirmation
    // Example:
    // if (feedbackData.contactEmail) {
    //   await emailService.sendFeedbackConfirmation(feedbackData);
    // }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: feedbackData.id,
        type: feedbackData.type,
        title: feedbackData.title,
        status: feedbackData.status,
        submittedAt: feedbackData.timestamp
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/feedback - Get feedback list (admin only)
router.get('/', async (req, res) => {
  try {
    // In a real application, check if user is admin
    // For now, just return a placeholder response
    
    res.json({
      success: true,
      message: 'Feedback endpoint available',
      data: {
        endpoint: '/api/feedback',
        methods: ['POST'],
        description: 'Submit user feedback'
      }
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/feedback/stats - Get feedback statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    // In a real application, return actual statistics from database
    const stats = {
      total: 0,
      byType: {
        bug: 0,
        feature: 0,
        improvement: 0,
        general: 0,
        question: 0,
        compliment: 0
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      byStatus: {
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0
      },
      averageRating: 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;