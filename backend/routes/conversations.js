const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

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

// Get all conversations for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const conversations = getStore().filter(c => c.participants.includes(String(userId)));
    
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
});

// Get a specific conversation by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    
    res.json({
      success: true,
      data: {
        id: conversationId,
        participants: [],
        messages: []
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation'
    });
  }
});

const getStore = () => {
  if (!global.inMemoryStorage) global.inMemoryStorage = {};
  if (!global.inMemoryStorage.conversations) global.inMemoryStorage.conversations = [];
  return global.inMemoryStorage.conversations;
};

const MAX_AVATAR_LENGTH = 200000;
const isSafeAvatar = (a) =>
  typeof a === 'string' && a.length <= MAX_AVATAR_LENGTH && /^(data:image\/(png|jpeg|webp|gif);base64,|https:\/\/)/.test(a);

// Create a new conversation (direct or group), optionally with a first message
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, type, name, avatar, participants, firstMessage } = req.body;
    const userId = String(req.user.userId || req.user.id);
    const kind = type === 'group' ? 'group' : 'direct';

    const members = Array.isArray(participants)
      ? [...new Set(participants.map(String))].slice(0, 100)
      : [];
    if (!members.includes(userId)) members.unshift(userId);

    if (members.length < 2) {
      return res.status(400).json({ success: false, error: 'At least one other participant is required' });
    }
    const groupName = typeof name === 'string' ? name.trim().slice(0, 50) : '';
    if (kind === 'group' && !groupName) {
      return res.status(400).json({ success: false, error: 'Group name is required' });
    }
    if (avatar && !isSafeAvatar(avatar)) {
      return res.status(400).json({ success: false, error: 'Invalid avatar' });
    }

    const store = getStore();
    const clientId = typeof id === 'string' && /^[\w-]{1,64}$/.test(id) ? id : null;
    const existing = clientId && store.find(c => c.id === clientId && c.participants.includes(userId));
    if (existing) {
      return res.json({ success: true, data: existing });
    }

    const conversation = {
      id: clientId || Date.now().toString(),
      type: kind,
      name: kind === 'group' ? groupName : null,
      avatar: avatar || null,
      participants: members,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      messages: []
    };

    if (typeof firstMessage === 'string' && firstMessage.trim()) {
      conversation.messages.push({
        id: `${Date.now()}`,
        text: firstMessage.trim().slice(0, 1000),
        senderId: userId,
        senderName: req.user.username,
        timestamp: new Date().toISOString(),
        type: 'text'
      });
    }

    store.push(conversation);

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation'
    });
  }
});
module.exports = router;
