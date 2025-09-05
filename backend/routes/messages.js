const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
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

// In-memory message storage (in production, use a database)
const messages = [
  {
    id: '1',
    text: 'Welcome to Quibish! 🎉',
    senderId: '1',
    senderName: 'Demo User',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    type: 'text',
    reactions: {},
    edited: false
  },
  {
    id: '2',
    text: 'This is a demo message from John. How are you doing today?',
    senderId: '2',
    senderName: 'John Doe',
    timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    type: 'text',
    reactions: {},
    edited: false
  },
  {
    id: '3',
    text: 'Hello everyone! Great to be here! 👋',
    senderId: '3',
    senderName: 'Jane Smith',
    timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    type: 'text',
    reactions: { '👍': ['1', '2'], '❤️': ['1'] },
    edited: false
  }
];

// GET /api/messages - get all messages with pagination
router.get('/', authenticateToken, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  // Sort messages by timestamp (newest first)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  const paginatedMessages = sortedMessages.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    messages: paginatedMessages,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(messages.length / limit),
      totalMessages: messages.length,
      hasNext: endIndex < messages.length,
      hasPrev: startIndex > 0
    }
  });
});

// POST /api/messages - send a new message
router.post('/', authenticateToken, (req, res) => {
  const { text, type = 'text' } = req.body;

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

  const newMessage = {
    id: uuidv4(),
    text: text.trim(),
    senderId: req.user.id,
    senderName: req.user.username,
    timestamp: new Date().toISOString(),
    type: type,
    reactions: {},
    edited: false
  };

  messages.push(newMessage);
  
  console.log(`New message from ${req.user.username}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
  
  res.status(201).json({
    success: true,
    message: newMessage
  });
});

// PUT /api/messages/:id - edit a message
router.put('/:id', authenticateToken, (req, res) => {
  const messageIndex = messages.findIndex(m => m.id === req.params.id);
  
  if (messageIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Message not found'
    });
  }

  const message = messages[messageIndex];
  
  // Check if user owns the message
  if (message.senderId !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'You can only edit your own messages'
    });
  }

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

  // Update message
  messages[messageIndex] = {
    ...message,
    text: text.trim(),
    edited: true,
    editedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: messages[messageIndex]
  });
});

// DELETE /api/messages/:id - delete a message
router.delete('/:id', authenticateToken, (req, res) => {
  const messageIndex = messages.findIndex(m => m.id === req.params.id);
  
  if (messageIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Message not found'
    });
  }

  const message = messages[messageIndex];
  
  // Check if user owns the message or is admin
  if (message.senderId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'You can only delete your own messages'
    });
  }

  // Remove message
  messages.splice(messageIndex, 1);
  
  res.json({
    success: true,
    message: 'Message deleted successfully'
  });
});

// POST /api/messages/:id/react - add/remove reaction to a message
router.post('/:id/react', authenticateToken, (req, res) => {
  const messageIndex = messages.findIndex(m => m.id === req.params.id);
  
  if (messageIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Message not found'
    });
  }

  const { reaction } = req.body;
  
  if (!reaction) {
    return res.status(400).json({
      success: false,
      error: 'Reaction is required'
    });
  }

  const message = messages[messageIndex];
  const userId = req.user.id;
  
  // Initialize reactions object if it doesn't exist
  if (!message.reactions) {
    message.reactions = {};
  }

  // Initialize reaction array if it doesn't exist
  if (!message.reactions[reaction]) {
    message.reactions[reaction] = [];
  }

  // Toggle reaction
  const userReactionIndex = message.reactions[reaction].indexOf(userId);
  
  if (userReactionIndex > -1) {
    // Remove reaction
    message.reactions[reaction].splice(userReactionIndex, 1);
    
    // Remove empty reaction arrays
    if (message.reactions[reaction].length === 0) {
      delete message.reactions[reaction];
    }
  } else {
    // Add reaction
    message.reactions[reaction].push(userId);
  }
  
  res.json({
    success: true,
    message: message
  });
});

module.exports = router;
