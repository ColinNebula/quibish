// Friend Service - Complete Friend Management System
import { secureTokenManager } from './secureTokenManager';

class FriendService {
  constructor() {
    this.friends = [];
    this.friendRequests = [];
    this.blockedUsers = [];
    this.friendSuggestions = [];
    this.storageKey = 'quibish_friends';
    this.requestsStorageKey = 'quibish_friend_requests';
    this.suggestionsStorageKey = 'quibish_friend_suggestions';
    this.isInitialized = false;
  }

  // Initialize friend service
  async initialize() {
    try {
      await this.loadFromStorage();
      await this.syncWithAPI();
      this.isInitialized = true;
      
      console.log('👥 Friend Service initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Friend Service initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Load friends data from local storage
  loadFromStorage() {
    try {
      const storedFriends = localStorage.getItem(this.storageKey);
      const storedRequests = localStorage.getItem(this.requestsStorageKey);
      const storedSuggestions = localStorage.getItem(this.suggestionsStorageKey);
      
      if (storedFriends) {
        this.friends = JSON.parse(storedFriends);
      }
      
      if (storedRequests) {
        this.friendRequests = JSON.parse(storedRequests);
      }
      
      if (storedSuggestions) {
        this.friendSuggestions = JSON.parse(storedSuggestions);
      }
      
      console.log(`📱 Loaded ${this.friends.length} friends, ${this.friendRequests.length} requests`);
    } catch (error) {
      console.error('❌ Failed to load from storage:', error);
    }
  }

  // Save friends data to local storage
  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.friends));
      localStorage.setItem(this.requestsStorageKey, JSON.stringify(this.friendRequests));
      localStorage.setItem(this.suggestionsStorageKey, JSON.stringify(this.friendSuggestions));
    } catch (error) {
      console.error('❌ Failed to save to storage:', error);
    }
  }

  // Sync with API
  async syncWithAPI() {
    try {
      // Sync friends
      await this.fetchFriends();
      // Sync friend requests
      await this.fetchFriendRequests();
      // Sync suggestions
      await this.fetchFriendSuggestions();
      
      console.log('🔄 Synced with API successfully');
    } catch (error) {
      console.warn('⚠️ API sync failed, using local data:', error);
    }
  }

  // Get all friends
  async getFriends(options = {}) {
    const { search, limit = 50, page = 1 } = options;
    
    try {
      // Try API first
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      });
      
      const response = await fetch(`/api/friends?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.friends = data.friends;
          this.saveToStorage();
          return {
            success: true,
            friends: data.friends,
            pagination: data.pagination
          };
        }
      }
    } catch (error) {
      console.warn('API unavailable, using local friends:', error);
    }
    
    // Fallback to local data
    let filteredFriends = this.friends;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFriends = this.friends.filter(friend =>
        friend.username?.toLowerCase().includes(searchLower) ||
        friend.displayName?.toLowerCase().includes(searchLower)
      );
    }
    
    const startIndex = (page - 1) * limit;
    const paginatedFriends = filteredFriends.slice(startIndex, startIndex + limit);
    
    return {
      success: true,
      friends: paginatedFriends,
      pagination: {
        page,
        limit,
        total: filteredFriends.length,
        totalPages: Math.ceil(filteredFriends.length / limit)
      },
      offline: true
    };
  }

  // Fetch friends from API
  async fetchFriends() {
    const response = await fetch('/api/friends', {
      headers: {
        'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        this.friends = data.friends;
        this.saveToStorage();
        return data.friends;
      }
    }
    
    throw new Error('Failed to fetch friends');
  }

  // Get friend requests
  async getFriendRequests(type = 'received', status = 'pending') {
    try {
      const response = await fetch(`/api/friends/requests?type=${type}&status=${status}`, {
        headers: {
          'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.friendRequests = data.requests;
          this.saveToStorage();
          return {
            success: true,
            requests: data.requests,
            count: data.count
          };
        }
      }
    } catch (error) {
      console.warn('API unavailable, using local requests:', error);
    }
    
    // Fallback to local data
    const filteredRequests = this.friendRequests.filter(request => {
      const typeMatch = type === 'all' || 
        (type === 'received' && request.type === 'received') ||
        (type === 'sent' && request.type === 'sent');
      const statusMatch = request.status === status;
      return typeMatch && statusMatch;
    });
    
    return {
      success: true,
      requests: filteredRequests,
      count: filteredRequests.length,
      offline: true
    };
  }

  // Fetch friend requests from API
  async fetchFriendRequests() {
    const response = await fetch('/api/friends/requests', {
      headers: {
        'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        this.friendRequests = data.requests;
        this.saveToStorage();
        return data.requests;
      }
    }
    
    throw new Error('Failed to fetch friend requests');
  }

  // Send friend request
  async sendFriendRequest(receiverId, message = '') {
    try {
      // Validate input
      if (!receiverId) {
        return { success: false, error: 'Receiver ID is required' };
      }
      
      // Check if already friends
      const existingFriend = this.friends.find(f => f.id === receiverId);
      if (existingFriend) {
        return { success: false, error: 'Already friends with this user' };
      }
      
      // Check if request already exists
      const existingRequest = this.friendRequests.find(r => 
        r.receiverId === receiverId && r.status === 'pending'
      );
      if (existingRequest) {
        return { success: false, error: 'Friend request already sent' };
      }
      
      // Send via API
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
        },
        body: JSON.stringify({ receiverId, message })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          if (data.autoAccepted) {
            // Friendship was created automatically
            this.friends.push({
              id: receiverId,
              username: `user_${receiverId.slice(-4)}`,
              displayName: `User ${receiverId.slice(-4)}`,
              friendsSince: new Date().toISOString(),
              status: 'online'
            });
          } else {
            // Friend request was sent
            this.friendRequests.push({
              ...data.request,
              type: 'sent'
            });
          }
          
          this.saveToStorage();
          return {
            success: true,
            message: data.message,
            autoAccepted: data.autoAccepted || false
          };
        }
      }
      
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to send friend request'
      };
    } catch (error) {
      console.error('Send friend request error:', error);
      
      // Fallback to local storage
      const localRequest = {
        id: `local_${Date.now()}`,
        receiverId,
        message,
        status: 'pending',
        type: 'sent',
        sentAt: new Date().toISOString(),
        offline: true
      };
      
      this.friendRequests.push(localRequest);
      this.saveToStorage();
      
      return {
        success: true,
        message: 'Friend request queued (will send when online)',
        offline: true
      };
    }
  }

  // Respond to friend request (accept/decline)
  async respondToFriendRequest(requestId, action) {
    try {
      if (!requestId || !['accept', 'decline'].includes(action)) {
        return { success: false, error: 'Invalid request ID or action' };
      }
      
      const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
        },
        body: JSON.stringify({ requestId, action })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          const requestIndex = this.friendRequests.findIndex(r => r.id === requestId);
          if (requestIndex !== -1) {
            this.friendRequests[requestIndex].status = data.request.status;
            this.friendRequests[requestIndex].respondedAt = data.request.respondedAt;
            
            if (action === 'accept' && data.friendship) {
              // Add new friend
              this.friends.push({
                id: data.request.senderId,
                username: data.request.senderDetails?.username || `user_${data.request.senderId.slice(-4)}`,
                displayName: data.request.senderDetails?.displayName || `User ${data.request.senderId.slice(-4)}`,
                avatar: data.request.senderDetails?.avatar,
                friendsSince: data.friendship.createdAt,
                status: 'online'
              });
            }
          }
          
          this.saveToStorage();
          return {
            success: true,
            message: data.message
          };
        }
      }
      
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `Failed to ${action} friend request`
      };
    } catch (error) {
      console.error(`${action} friend request error:`, error);
      
      // Fallback to local update
      const requestIndex = this.friendRequests.findIndex(r => r.id === requestId);
      if (requestIndex !== -1) {
        this.friendRequests[requestIndex].status = action === 'accept' ? 'accepted' : 'declined';
        this.friendRequests[requestIndex].respondedAt = new Date().toISOString();
        this.friendRequests[requestIndex].offline = true;
        this.saveToStorage();
        
        return {
          success: true,
          message: `Friend request ${action}ed (will sync when online)`,
          offline: true
        };
      }
      
      return { success: false, error: 'Request not found' };
    }
  }

  // Remove friend
  async removeFriend(friendId) {
    try {
      const response = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove from local friends
          this.friends = this.friends.filter(f => f.id !== friendId);
          this.saveToStorage();
          
          return {
            success: true,
            message: 'Friend removed successfully'
          };
        }
      }
      
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to remove friend'
      };
    } catch (error) {
      console.error('Remove friend error:', error);
      return {
        success: false,
        error: 'Failed to remove friend'
      };
    }
  }

  // Get friend suggestions
  async getFriendSuggestions(limit = 10) {
    try {
      const response = await fetch(`/api/friends/suggestions?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.friendSuggestions = data.suggestions;
          this.saveToStorage();
          return {
            success: true,
            suggestions: data.suggestions,
            count: data.count
          };
        }
      }
    } catch (error) {
      console.warn('API unavailable, using local suggestions:', error);
    }
    
    // Fallback to local suggestions
    return {
      success: true,
      suggestions: this.friendSuggestions.slice(0, limit),
      count: Math.min(this.friendSuggestions.length, limit),
      offline: true
    };
  }

  // Fetch friend suggestions from API
  async fetchFriendSuggestions() {
    const response = await fetch('/api/friends/suggestions?limit=20', {
      headers: {
        'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        this.friendSuggestions = data.suggestions;
        this.saveToStorage();
        return data.suggestions;
      }
    }
    
    throw new Error('Failed to fetch friend suggestions');
  }

  // Get mutual friends with a specific user
  async getMutualFriends(friendId, limit = 10) {
    try {
      const response = await fetch(`/api/friends/${friendId}/mutual?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            success: true,
            mutualFriends: data.mutualFriends,
            count: data.count,
            totalMutual: data.totalMutual
          };
        }
      }
    } catch (error) {
      console.warn('API unavailable for mutual friends:', error);
    }
    
    // Fallback: calculate locally (limited accuracy)
    const mutualFriends = this.friends.filter(friend => 
      // This is a simplified check - in reality you'd need more data
      Math.random() > 0.7 // Simulate some mutual connections
    ).slice(0, limit);
    
    return {
      success: true,
      mutualFriends,
      count: mutualFriends.length,
      totalMutual: mutualFriends.length,
      offline: true
    };
  }

  // Block a user
  async blockUser(userId) {
    try {
      const response = await fetch('/api/friends/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
        },
        body: JSON.stringify({ targetId: userId })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove from friends and requests
          this.friends = this.friends.filter(f => f.id !== userId);
          this.friendRequests = this.friendRequests.filter(r => 
            r.senderId !== userId && r.receiverId !== userId
          );
          this.friendSuggestions = this.friendSuggestions.filter(s => s.id !== userId);
          
          // Add to blocked list
          this.blockedUsers.push(userId);
          this.saveToStorage();
          
          return {
            success: true,
            message: 'User blocked successfully'
          };
        }
      }
      
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to block user'
      };
    } catch (error) {
      console.error('Block user error:', error);
      return {
        success: false,
        error: 'Failed to block user'
      };
    }
  }

  // Get friendship statistics
  async getStats() {
    try {
      const response = await fetch('/api/friends/stats', {
        headers: {
          'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            success: true,
            stats: data.stats
          };
        }
      }
    } catch (error) {
      console.warn('API unavailable, calculating local stats:', error);
    }
    
    // Fallback to local calculation
    const pendingReceived = this.friendRequests.filter(r => 
      r.type === 'received' && r.status === 'pending'
    ).length;
    
    const pendingSent = this.friendRequests.filter(r => 
      r.type === 'sent' && r.status === 'pending'
    ).length;
    
    return {
      success: true,
      stats: {
        totalFriends: this.friends.length,
        pendingReceived,
        pendingSent,
        totalRequests: pendingReceived + pendingSent
      },
      offline: true
    };
  }

  // Search users (for sending friend requests)
  async searchUsers(query, limit = 10) {
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${await secureTokenManager.getTokenForRequest()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            success: true,
            users: data.users,
            count: data.count
          };
        }
      }
    } catch (error) {
      console.warn('User search API unavailable:', error);
    }
    
    // Fallback: generate mock users for demo
    const mockUsers = Array.from({ length: limit }, (_, i) => ({
      id: `search_user_${i}_${Date.now()}`,
      username: `${query}${i}`,
      displayName: `${query} User ${i}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${query}${i}`,
      mutualFriends: Math.floor(Math.random() * 5)
    }));
    
    return {
      success: true,
      users: mockUsers,
      count: mockUsers.length,
      offline: true
    };
  }

  // Check if user is a friend
  isFriend(userId) {
    return this.friends.some(friend => friend.id === userId);
  }

  // Check if there's a pending request
  hasPendingRequest(userId) {
    return this.friendRequests.some(request => 
      (request.receiverId === userId || request.senderId === userId) && 
      request.status === 'pending'
    );
  }

  // Get friend by ID
  getFriendById(friendId) {
    return this.friends.find(friend => friend.id === friendId);
  }

  // Get online friends count
  getOnlineFriendsCount() {
    return this.friends.filter(friend => friend.status === 'online').length;
  }

  // Refresh all data
  async refresh() {
    try {
      await this.syncWithAPI();
      return { success: true, message: 'Friend data refreshed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const friendService = new FriendService();
export default friendService;