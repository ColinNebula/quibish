const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const databaseService = require('../services/databaseService');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Initialize default messages in database if empty
const initializeMessages = async () => {
  try {
    const existingMessages = await databaseService.getMessages({}, { limit: 1 });
    if (existingMessages.length === 0) {
      console.log('📝 Initializing default messages...');
      
      const defaultMessages = [
        {
          content: 'Welcome to Quibish! 🎉',
          userId: 'demo-user-1',
          username: 'Demo User',
          messageType: 'text',
          reactions: [],
          edited: false
        },
        {
          content: 'This is a demo message from John. How are you doing today?',
          userId: 'demo-user-2', 
          username: 'John Doe',
          messageType: 'text',
          reactions: [],
          edited: false
        },
        {
          content: 'Hello everyone! Great to be here! 👋',
          userId: 'demo-user-3',
          username: 'Jane Smith', 
          messageType: 'text',
          reactions: [{ type: '👍', userIds: ['demo-user-1', 'demo-user-2'] }, { type: '❤️', userIds: ['demo-user-1'] }],
          edited: false
        }
      ];
      
      for (const msg of defaultMessages) {
        await databaseService.createMessage(msg);
      }
    }
  } catch (error) {
    console.error('Error initializing messages:', error);
  }
};

// Initialize messages when the module loads
// Note: Moved to server initialization to ensure database is ready
// initializeMessages();

// GET /api/messages - get all messages with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const conversationId = req.query.conversationId;

    // Build filter object
    const filter = {};
    if (conversationId) {
      filter.conversationId = conversationId;
    }

    // Get messages using database service with conversation filter
    const messages = await databaseService.getMessages(filter, { limit, offset });
    
    // Transform messages to expected format
    const transformedMessages = messages.map(msg => ({
      id: msg.id,
      text: msg.content,
      senderId: msg.userId,
      senderName: msg.username,
      timestamp: msg.createdAt,
      type: msg.messageType || 'text',
      reactions: msg.reactions || [],
      edited: msg.edited || false,
      editedAt: msg.editedAt,
      conversationId: msg.conversationId,
      user: msg.user ? {
        id: msg.user.id,
        username: msg.user.username,
        name: msg.user.name,
        avatar: msg.user.uploadedMedia && msg.user.uploadedMedia.length > 0 ? 
          msg.user.uploadedMedia[0].url : msg.user.avatar
      } : null,
      attachments: msg.attachments || []
    }));
    
    // Get total count for pagination (simplified)
    const totalMessages = Math.min(messages.length, 1000); // Estimate for performance
    
    res.json({
      success: true,
      messages: transformedMessages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages: totalMessages,
        hasNext: messages.length === limit,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// POST /api/messages - send a new message
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { text, type = 'text', conversationId = null } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required'
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message text cannot exceed 1000 characters'
      });
    }

    const messageData = {
      content: text.trim(),
      userId: req.user.id,
      username: req.user.username,
      conversationId: conversationId,
      messageType: type,
      reactions: [],
      edited: false,
      deleted: false
    };

    // Save message using database service
    const savedMessage = await databaseService.createMessage(messageData);
    
    // Transform to expected format
    const transformedMessage = {
      id: savedMessage.id,
      text: savedMessage.content,
      senderId: savedMessage.userId,
      senderName: savedMessage.username,
      timestamp: savedMessage.createdAt,
      type: savedMessage.messageType,
      reactions: savedMessage.reactions || [],
      edited: savedMessage.edited,
      user: savedMessage.user ? {
        id: savedMessage.user.id,
        username: savedMessage.user.username,
        name: savedMessage.user.name,
        avatar: savedMessage.user.uploadedMedia && savedMessage.user.uploadedMedia.length > 0 ? 
          savedMessage.user.uploadedMedia[0].url : savedMessage.user.avatar
      } : null
    };
    
    console.log(`New message from ${req.user.username}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    
    res.status(201).json({
      success: true,
      message: transformedMessage
    });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save message'
    });
  }
});

// PUT /api/messages/:id - edit a message
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required'
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message text cannot exceed 1000 characters'
      });
    }

    // Get message first to check ownership
    const message = await databaseService.getMessageById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user owns the message
    if (message.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own messages'
      });
    }

    // Update message
    const updatedMessage = await databaseService.updateMessage(req.params.id, {
      content: text.trim(),
      edited: true,
      editedAt: new Date()
    });
    
    // Transform to expected format
    const transformedMessage = {
      id: updatedMessage.id,
      text: updatedMessage.content,
      senderId: updatedMessage.userId,
      senderName: updatedMessage.username,
      timestamp: updatedMessage.createdAt,
      type: updatedMessage.messageType,
      reactions: updatedMessage.reactions || [],
      edited: updatedMessage.edited,
      editedAt: updatedMessage.editedAt,
      user: updatedMessage.user ? {
        id: updatedMessage.user.id,
        username: updatedMessage.user.username,
        name: updatedMessage.user.name,
        avatar: updatedMessage.user.uploadedMedia && updatedMessage.user.uploadedMedia.length > 0 ? 
          updatedMessage.user.uploadedMedia[0].url : updatedMessage.user.avatar
      } : null
    };
    
    res.json({
      success: true,
      message: transformedMessage
    });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message'
    });
  }
});

// DELETE /api/messages/:id - delete a message
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Get message first to check ownership
    const message = await databaseService.getMessageById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user owns the message or is admin
    if (message.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own messages'
      });
    }

    // Soft delete message
    await databaseService.updateMessage(req.params.id, {
      deleted: true,
      deletedAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

// POST /api/messages/:id/react - add/remove reaction to a message
router.post('/:id/react', authenticateToken, async (req, res) => {
  try {
    const { reaction } = req.body;
    
    if (!reaction) {
      return res.status(400).json({
        success: false,
        error: 'Reaction is required'
      });
    }

    const userId = req.user.id;
    
    // Use database service to add reaction
    const updatedMessage = await databaseService.addReaction(req.params.id, userId, reaction);
    
    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }
    
    // Transform to expected format
    const transformedMessage = {
      id: updatedMessage.id,
      text: updatedMessage.content,
      senderId: updatedMessage.userId,
      senderName: updatedMessage.username,
      timestamp: updatedMessage.createdAt,
      type: updatedMessage.messageType,
      reactions: updatedMessage.reactions || [],
      edited: updatedMessage.edited,
      user: updatedMessage.user ? {
        id: updatedMessage.user.id,
        username: updatedMessage.user.username,
        name: updatedMessage.user.name,
        avatar: updatedMessage.user.uploadedMedia && updatedMessage.user.uploadedMedia.length > 0 ? 
          updatedMessage.user.uploadedMedia[0].url : updatedMessage.user.avatar
      } : null
    };
    
    res.json({
      success: true,
      message: transformedMessage
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add reaction'
    });
  }
});

module.exports = router;
