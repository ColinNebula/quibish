// Conversation Service
class ConversationService {
  constructor() {
    this.storageKey = 'quibish_conversations';
    this.conversations = this.loadConversationsFromStorage();
  }

  // Load conversations from localStorage
  loadConversationsFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading conversations from storage:', error);
      return [];
    }
  }

  // Save conversations to localStorage
  saveConversationsToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.conversations));
    } catch (error) {
      console.error('Error saving conversations to storage:', error);
    }
  }

  // Get all conversations
  getAllConversations() {
    return this.conversations;
  }

  // Get conversation by ID
  getConversationById(id) {
    return this.conversations.find(conv => conv.id === id);
  }

  // Create a new conversation with a user
  createConversationWithUser(user, currentUserId) {
    // Check if conversation already exists
    const existingConv = this.conversations.find(conv => 
      conv.participantId === user.id || 
      (conv.participants && conv.participants.includes(user.id))
    );

    if (existingConv) {
      return {
        success: true,
        conversation: existingConv,
        isNew: false
      };
    }

    // Create new conversation
    const newConversation = {
      id: Date.now().toString(),
      name: user.name || user.username,
      avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=667eea&color=fff&size=40`,
      lastMessage: '',
      lastMessageTime: 'now',
      unreadCount: 0,
      isOnline: user.status === 'online',
      isPinned: false,
      isMuted: false,
      messageStatus: null,
      timestamp: new Date(),
      participantId: user.id,
      participants: [currentUserId, user.id],
      type: 'direct', // 'direct' or 'group'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        status: user.status
      },
      messages: []
    };

    // Add to conversations
    this.conversations.unshift(newConversation); // Add to beginning
    this.saveConversationsToStorage();

    return {
      success: true,
      conversation: newConversation,
      isNew: true
    };
  }

  // Update conversation
  updateConversation(conversationId, updates) {
    const index = this.conversations.findIndex(conv => conv.id === conversationId);
    
    if (index !== -1) {
      this.conversations[index] = {
        ...this.conversations[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveConversationsToStorage();
      return this.conversations[index];
    }
    
    return null;
  }

  // Delete conversation
  deleteConversation(conversationId) {
    const index = this.conversations.findIndex(conv => conv.id === conversationId);
    
    if (index !== -1) {
      this.conversations.splice(index, 1);
      this.saveConversationsToStorage();
      return true;
    }
    
    return false;
  }

  // Add message to conversation
  addMessageToConversation(conversationId, message) {
    const conversation = this.getConversationById(conversationId);
    
    if (conversation) {
      if (!conversation.messages) {
        conversation.messages = [];
      }
      
      conversation.messages.push(message);
      conversation.lastMessage = message.text || message.content || '';
      conversation.lastMessageTime = 'now';
      conversation.timestamp = new Date();
      conversation.updatedAt = new Date().toISOString();
      
      this.saveConversationsToStorage();
      return conversation;
    }
    
    return null;
  }

  // Search conversations
  searchConversations(query) {
    if (!query || query.trim().length === 0) {
      return this.conversations;
    }

    const searchTerm = query.toLowerCase().trim();
    return this.conversations.filter(conv =>
      conv.name?.toLowerCase().includes(searchTerm) ||
      conv.lastMessage?.toLowerCase().includes(searchTerm) ||
      conv.user?.name?.toLowerCase().includes(searchTerm) ||
      conv.user?.username?.toLowerCase().includes(searchTerm)
    );
  }

  // Get conversation statistics
  getStats() {
    const total = this.conversations.length;
    const unread = this.conversations.filter(conv => conv.unreadCount > 0).length;
    const groups = this.conversations.filter(conv => conv.type === 'group').length;
    const direct = this.conversations.filter(conv => conv.type === 'direct').length;
    const pinned = this.conversations.filter(conv => conv.isPinned).length;

    return {
      total,
      unread,
      groups,
      direct,
      pinned
    };
  }

  // Initialize with default conversations (for new users)
  initializeDefaultConversations() {
    if (this.conversations.length === 0) {
      const defaultConversations = [
        {
          id: 'welcome-1',
          name: 'Welcome to Quibish',
          avatar: 'https://ui-avatars.com/api/?name=Quibish&background=667eea&color=fff&size=40',
          lastMessage: 'Welcome! Start chatting by searching for users above.',
          lastMessageTime: 'now',
          unreadCount: 1,
          isOnline: false,
          isPinned: true,
          isMuted: false,
          messageStatus: 'delivered',
          timestamp: new Date(),
          type: 'system',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: 'welcome-msg-1',
              text: '👋 Welcome to Quibish! To start chatting with other users, click the 👥 button in the search bar above and search for people by name.',
              sender: 'System',
              timestamp: new Date().toISOString(),
              type: 'system'
            }
          ]
        }
      ];

      this.conversations = defaultConversations;
      this.saveConversationsToStorage();
    }
  }

  // Subscribe to conversation updates
  subscribe(callback) {
    // Simple event system - in a real app you'd use a proper event emitter
    this.updateCallback = callback;
  }

  // Notify subscribers of updates
  notifyUpdate() {
    if (this.updateCallback) {
      this.updateCallback(this.conversations);
    }
  }

  // Clear all conversations (for logout)
  clearConversations() {
    this.conversations = [];
    this.saveConversationsToStorage();
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
export default conversationService;