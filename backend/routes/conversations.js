const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// In-memory conversation storage (in production, use a database)
let conversations = [
  {
    id: '1',
    type: 'direct',
    participants: ['1', '2'],
    name: null,
    createdBy: '1',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    lastMessage: {
      id: '1',
      text: 'Hey there!',
      senderId: '2',
      timestamp: new Date(Date.now() - 1800000).toISOString()
    }
  },
  {
    id: '2',
    type: 'group',
    participants: ['1', '2', '3'],
    name: 'Work Team',
    createdBy: '1',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    lastMessage: {
      id: '5',
      text: 'Meeting at 3pm',
      senderId: '3',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    }
  }
];

// POST /api/conversations - Create a new conversation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, participants, name } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!type || !participants || !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        error: 'Type and participants array are required'
      });
    }

    // Validate conversation type
    if (!['direct', 'group'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be either "direct" or "group"'
      });
    }

    // Validate participants
    if (participants.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one participant is required'
      });
    }

    // For direct conversations, should have exactly 2 participants
    if (type === 'direct' && participants.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Direct conversations must have exactly 2 participants'
      });
    }

    // For group conversations, require a name
    if (type === 'group' && !name?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Group conversations require a name'
      });
    }

    // Check if direct conversation already exists
    if (type === 'direct') {
      const existingConversation = conversations.find(conv => 
        conv.type === 'direct' && 
        conv.participants.length === 2 &&
        conv.participants.includes(participants[0]) &&
        conv.participants.includes(participants[1])
      );

      if (existingConversation) {
        return res.json({
          success: true,
          conversation: existingConversation,
          message: 'Existing conversation returned'
        });
      }
    }

    // Create new conversation
    const newConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      participants,
      name: type === 'group' ? name.trim() : null,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: null
    };

    // Add to conversations array
    conversations.push(newConversation);

    // Return the created conversation
    res.status(201).json({
      success: true,
      conversation: newConversation
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/conversations - Get user's conversations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Filter conversations where user is a participant
    const userConversations = conversations
      .filter(conv => conv.participants.includes(userId))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      conversations: userConversations,
      total: conversations.filter(conv => conv.participants.includes(userId)).length
    });

  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/conversations/:id - Get specific conversation
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    // Find conversation
    const conversation = conversations.find(conv => conv.id === conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Check if user is a participant
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      conversation
    });

  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/conversations/:id - Update conversation
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const { name } = req.body;

    // Find conversation
    const conversationIndex = conversations.findIndex(conv => conv.id === conversationId);

    if (conversationIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const conversation = conversations[conversationIndex];

    // Check if user is a participant
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update conversation
    if (name !== undefined) {
      conversation.name = name.trim();
    }
    conversation.updatedAt = new Date().toISOString();

    conversations[conversationIndex] = conversation;

    res.json({
      success: true,
      conversation
    });

  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// DELETE /api/conversations/:id - Delete conversation
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    // Find conversation
    const conversationIndex = conversations.findIndex(conv => conv.id === conversationId);

    if (conversationIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    const conversation = conversations[conversationIndex];

    // Check if user is the creator or has permission to delete
    if (conversation.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the creator can delete this conversation'
      });
    }

    // Remove conversation
    conversations.splice(conversationIndex, 1);

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;