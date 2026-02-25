// Friends API Routes - Comprehensive Friend Connection System
const express = require('express');
const router = express.Router();

// In-memory storage (replace with database in production)
let friendRequests = [];
let friendships = [];
let users = []; // Will be populated from user management

// Friend request statuses
const FriendRequestStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  BLOCKED: 'blocked'
};

// Connection types
const ConnectionType = {
  SYMMETRIC: 'symmetric',  // Both users are friends
  ASYMMETRIC: 'asymmetric' // One follows the other
};

// Authentication middleware (placeholder)
const authenticateToken = (req, res, next) => {
  // In real implementation, verify JWT token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  // Mock user for demo (replace with real token verification)
  req.user = { 
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    username: 'demo_user' 
  };
  next();
};

// Helper function to generate unique IDs
const generateId = () => 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

// Helper function to find existing friendship
const findFriendship = (userId1, userId2) => {
  return friendships.find(f => 
    (f.user1 === userId1 && f.user2 === userId2) ||
    (f.user1 === userId2 && f.user2 === userId1)
  );
};

// Helper function to find friend request
const findFriendRequest = (senderId, receiverId) => {
  return friendRequests.find(r => 
    r.senderId === senderId && 
    r.receiverId === receiverId &&
    r.status === FriendRequestStatus.PENDING
  );
};

// GET /api/friends - Get user's friends list
router.get('/', authenticateToken, (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const { page = 1, limit = 20, search } = req.query;
    
    // Find all friendships involving this user
    const userFriendships = friendships.filter(f => 
      f.user1 === userId || f.user2 === userId
    );
    
    // Extract friend IDs
    const friendIds = userFriendships.map(f => 
      f.user1 === userId ? f.user2 : f.user1
    );
    
    // Get friend details (mock data - replace with real user lookup)
    const friends = friendIds.map(friendId => ({
      id: friendId,
      username: `user_${friendId.slice(-4)}`,
      displayName: `User ${friendId.slice(-4)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${friendId}`,
      status: Math.random() > 0.5 ? 'online' : 'offline',
      mutualFriends: Math.floor(Math.random() * 10),
      friendsSince: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }));
    
    // Apply search filter
    let filteredFriends = friends;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFriends = friends.filter(f => 
        f.username.toLowerCase().includes(searchLower) ||
        f.displayName.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedFriends = filteredFriends.slice(startIndex, startIndex + parseInt(limit));
    
    res.json({
      success: true,
      friends: paginatedFriends,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredFriends.length,
        totalPages: Math.ceil(filteredFriends.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// GET /api/friends/requests - Get friend requests (received and sent)
router.get('/requests', authenticateToken, (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const { type = 'received', status = 'pending' } = req.query;
    
    let requests;
    if (type === 'received') {
      requests = friendRequests.filter(r => 
        r.receiverId === userId && r.status === status
      );
    } else if (type === 'sent') {
      requests = friendRequests.filter(r => 
        r.senderId === userId && r.status === status
      );
    } else {
      requests = friendRequests.filter(r => 
        (r.senderId === userId || r.receiverId === userId) && r.status === status
      );
    }
    
    // Enrich with user details
    const enrichedRequests = requests.map(request => ({
      ...request,
      senderDetails: {
        id: request.senderId,
        username: `user_${request.senderId.slice(-4)}`,
        displayName: `User ${request.senderId.slice(-4)}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.senderId}`,
        mutualFriends: Math.floor(Math.random() * 5)
      },
      receiverDetails: {
        id: request.receiverId,
        username: `user_${request.receiverId.slice(-4)}`,
        displayName: `User ${request.receiverId.slice(-4)}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.receiverId}`
      }
    }));
    
    res.json({
      success: true,
      requests: enrichedRequests,
      count: enrichedRequests.length
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

// POST /api/friends/request - Send friend request
router.post('/request', authenticateToken, (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, message } = req.body;
    
    if (!receiverId) {
      return res.status(400).json({ error: 'Receiver ID is required' });
    }
    
    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }
    
    // Check if already friends
    const existingFriendship = findFriendship(senderId, receiverId);
    if (existingFriendship) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }
    
    // Check if request already exists
    const existingRequest = findFriendRequest(senderId, receiverId);
    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }
    
    // Check for reverse request (they sent to us)
    const reverseRequest = findFriendRequest(receiverId, senderId);
    if (reverseRequest) {
      // Auto-accept the existing request to create mutual friendship
      reverseRequest.status = FriendRequestStatus.ACCEPTED;
      reverseRequest.respondedAt = new Date().toISOString();
      
      // Create friendship
      const friendship = {
        id: generateId(),
        user1: senderId,
        user2: receiverId,
        type: ConnectionType.SYMMETRIC,
        createdAt: new Date().toISOString(),
        acceptedBy: senderId
      };
      friendships.push(friendship);
      
      return res.json({
        success: true,
        message: 'Friendship created automatically (mutual request)',
        friendship,
        autoAccepted: true
      });
    }
    
    // Create new friend request
    const friendRequest = {
      id: generateId(),
      senderId,
      receiverId,
      status: FriendRequestStatus.PENDING,
      message: message || '',
      sentAt: new Date().toISOString(),
      respondedAt: null
    };
    
    friendRequests.push(friendRequest);
    
    res.json({
      success: true,
      request: friendRequest,
      message: 'Friend request sent successfully'
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// POST /api/friends/respond - Respond to friend request (accept/decline)
router.post('/respond', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId, action } = req.body;
    
    if (!requestId || !action) {
      return res.status(400).json({ error: 'Request ID and action are required' });
    }
    
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "accept" or "decline"' });
    }
    
    // Find the request
    const request = friendRequests.find(r => r.id === requestId && r.receiverId === userId);
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    if (request.status !== FriendRequestStatus.PENDING) {
      return res.status(400).json({ error: 'Request has already been responded to' });
    }
    
    // Update request status
    request.status = action === 'accept' ? FriendRequestStatus.ACCEPTED : FriendRequestStatus.DECLINED;
    request.respondedAt = new Date().toISOString();
    
    let friendship = null;
    
    if (action === 'accept') {
      // Create friendship
      friendship = {
        id: generateId(),
        user1: request.senderId,
        user2: request.receiverId,
        type: ConnectionType.SYMMETRIC,
        createdAt: new Date().toISOString(),
        acceptedBy: userId
      };
      friendships.push(friendship);
    }
    
    res.json({
      success: true,
      request,
      friendship,
      message: `Friend request ${action}ed successfully`
    });
  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({ error: 'Failed to respond to friend request' });
  }
});

// DELETE /api/friends/:friendId - Remove friend
router.delete('/:friendId', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;
    
    // Find and remove friendship
    const friendshipIndex = friendships.findIndex(f =>
      (f.user1 === userId && f.user2 === friendId) ||
      (f.user1 === friendId && f.user2 === userId)
    );
    
    if (friendshipIndex === -1) {
      return res.status(404).json({ error: 'Friendship not found' });
    }
    
    const removedFriendship = friendships.splice(friendshipIndex, 1)[0];
    
    res.json({
      success: true,
      message: 'Friend removed successfully',
      removedFriendship
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// GET /api/friends/suggestions - Get friend suggestions
router.get('/suggestions', authenticateToken, (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const { limit = 10 } = req.query;
    
    // Get user's current friends
    const userFriendships = friendships.filter(f => 
      f.user1 === userId || f.user2 === userId
    );
    const friendIds = userFriendships.map(f => 
      f.user1 === userId ? f.user2 : f.user1
    );
    
    // Get mutual friends for suggestions
    const suggestions = [];
    const processedIds = new Set([userId, ...friendIds]);
    
    // Find friends of friends
    for (const friendId of friendIds) {
      const friendOfFriendships = friendships.filter(f => 
        (f.user1 === friendId || f.user2 === friendId) &&
        f.user1 !== userId && f.user2 !== userId
      );
      
      for (const fof of friendOfFriendships) {
        const suggestedId = fof.user1 === friendId ? fof.user2 : fof.user1;
        
        if (!processedIds.has(suggestedId)) {
          processedIds.add(suggestedId);
          
          // Calculate mutual friends count
          const mutualCount = friendIds.filter(id => {
            const hasMutual = friendships.some(f =>
              (f.user1 === id && f.user2 === suggestedId) ||
              (f.user1 === suggestedId && f.user2 === id)
            );
            return hasMutual;
          }).length;
          
          suggestions.push({
            id: suggestedId,
            username: `user_${suggestedId.slice(-4)}`,
            displayName: `User ${suggestedId.slice(-4)}`,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${suggestedId}`,
            mutualFriends: mutualCount,
            reason: mutualCount > 0 ? `${mutualCount} mutual friends` : 'Friend of a friend',
            suggestionScore: mutualCount * 10 + Math.random() * 5
          });
        }
      }
    }
    
    // Add some random suggestions if not enough mutual friends
    while (suggestions.length < parseInt(limit)) {
      const randomId = 'user_' + Math.random().toString(36).substr(2, 9);
      if (!processedIds.has(randomId)) {
        processedIds.add(randomId);
        suggestions.push({
          id: randomId,
          username: `user_${randomId.slice(-4)}`,
          displayName: `User ${randomId.slice(-4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomId}`,
          mutualFriends: 0,
          reason: 'You may know this person',
          suggestionScore: Math.random() * 3
        });
      }
    }
    
    // Sort by suggestion score and limit
    const sortedSuggestions = suggestions
      .sort((a, b) => b.suggestionScore - a.suggestionScore)
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      suggestions: sortedSuggestions,
      count: sortedSuggestions.length
    });
  } catch (error) {
    console.error('Get friend suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch friend suggestions' });
  }
});

// GET /api/friends/:friendId/mutual - Get mutual friends
router.get('/:friendId/mutual', authenticateToken, (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const { friendId } = req.params;
    const { limit = 10 } = req.query;
    
    // Get user's friends
    const userFriendships = friendships.filter(f => 
      f.user1 === userId || f.user2 === userId
    );
    const userFriendIds = userFriendships.map(f => 
      f.user1 === userId ? f.user2 : f.user1
    );
    
    // Get friend's friends
    const friendFriendships = friendships.filter(f => 
      f.user1 === friendId || f.user2 === friendId
    );
    const friendFriendIds = friendFriendships.map(f => 
      f.user1 === friendId ? f.user2 : f.user1
    );
    
    // Find mutual friends
    const mutualFriendIds = userFriendIds.filter(id => 
      friendFriendIds.includes(id)
    );
    
    // Get mutual friend details
    const mutualFriends = mutualFriendIds.slice(0, parseInt(limit)).map(id => ({
      id,
      username: `user_${id.slice(-4)}`,
      displayName: `User ${id.slice(-4)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
      friendsSince: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }));
    
    res.json({
      success: true,
      mutualFriends,
      count: mutualFriendIds.length,
      totalMutual: mutualFriendIds.length
    });
  } catch (error) {
    console.error('Get mutual friends error:', error);
    res.status(500).json({ error: 'Failed to fetch mutual friends' });
  }
});

// POST /api/friends/block - Block a user
router.post('/block', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { targetId } = req.body;
    
    if (!targetId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }
    
    // Remove any existing friendship
    const friendshipIndex = friendships.findIndex(f =>
      (f.user1 === userId && f.user2 === targetId) ||
      (f.user1 === targetId && f.user2 === userId)
    );
    
    if (friendshipIndex !== -1) {
      friendships.splice(friendshipIndex, 1);
    }
    
    // Update any pending requests to blocked
    friendRequests.forEach(request => {
      if ((request.senderId === userId && request.receiverId === targetId) ||
          (request.senderId === targetId && request.receiverId === userId)) {
        request.status = FriendRequestStatus.BLOCKED;
        request.respondedAt = new Date().toISOString();
      }
    });
    
    res.json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// GET /api/friends/stats - Get friendship statistics
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    
    const userFriendships = friendships.filter(f => 
      f.user1 === userId || f.user2 === userId
    );
    
    const pendingReceived = friendRequests.filter(r => 
      r.receiverId === userId && r.status === FriendRequestStatus.PENDING
    ).length;
    
    const pendingSent = friendRequests.filter(r => 
      r.senderId === userId && r.status === FriendRequestStatus.PENDING
    ).length;
    
    res.json({
      success: true,
      stats: {
        totalFriends: userFriendships.length,
        pendingReceived,
        pendingSent,
        totalRequests: pendingReceived + pendingSent
      }
    });
  } catch (error) {
    console.error('Get friendship stats error:', error);
    res.status(500).json({ error: 'Failed to fetch friendship statistics' });
  }
});

module.exports = router;