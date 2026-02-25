const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { sanitizeInput, validateMessageInput } = require('../middleware/validation');
const router = express.Router();

// Import file storage if enabled
const fileStorage = process.env.USE_FILE_STORAGE === 'true' ? require('../storage/fileStorage') : null;

const { JWT_SECRET } = require('../config/jwt');

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

// Storage abstraction functions
const getMessages = async () => {
  if (fileStorage) {
    return await fileStorage.getMessages();
  }
  return global.inMemoryStorage.messages || [];
};

const saveMessage = async (message) => {
  if (fileStorage) {
    return await fileStorage.addMessage(message);
  }
  // Fallback to in-memory
  if (!global.inMemoryStorage.messages) {
    global.inMemoryStorage.messages = [];
  }
  message.id = Date.now().toString();
  message.timestamp = new Date().toISOString();
  global.inMemoryStorage.messages.push(message);
  return message;
};

// In-memory message storage (fallback when file storage not available)
const defaultMessages = [
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

// Initialize default messages in storage if empty
const initializeMessages = async () => {
  try {
    const existingMessages = await getMessages();
    if (existingMessages.length === 0) {
      console.log('📝 Initializing default messages...');
      for (const msg of defaultMessages) {
        await saveMessage(msg);
      }
    }
  } catch (error) {
    console.error('Error initializing messages:', error);
  }
};

// Initialize messages when the module loads
initializeMessages();

// GET /api/messages - get all messages with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Get messages from storage
    const allMessages = await getMessages();
    
    // Sort messages by timestamp (newest first)
    const sortedMessages = [...allMessages].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    const paginatedMessages = sortedMessages.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      messages: paginatedMessages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(allMessages.length / limit),
        totalMessages: allMessages.length,
        hasNext: endIndex < allMessages.length,
        hasPrev: startIndex > 0
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
router.post('/', authenticateToken, sanitizeInput, validateMessageInput, async (req, res) => {
  try {
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
    text: text.trim(),
    senderId: req.user.id,
    senderName: req.user.username,
    type: type,
    reactions: {},
    edited: false
  };

  // Save message using storage abstraction
  const savedMessage = await saveMessage(newMessage);
  
  console.log(`New message from ${req.user.username}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
  
  res.status(201).json({
    success: true,
    message: savedMessage
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
