// Message Service - Complete Implementation
class MessageService {
  constructor() {
    this.messages = [];
    this.storage = localStorage;
    this.storageKey = 'quibish_messages';
  }

  // Load messages from local storage
  loadMessagesFromStorage(conversationId = null) {
    try {
      const stored = this.storage.getItem(this.storageKey);
      if (!stored) return [];
      
      const allMessages = JSON.parse(stored);
      
      if (conversationId) {
        return allMessages.filter(msg => msg.conversationId === conversationId);
      }
      
      return allMessages;
    } catch (error) {
      console.error('Failed to load messages from storage:', error);
      return [];
    }
  }

  // Save messages to local storage
  saveMessagesToStorage(messages) {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(messages));
      return true;
    } catch (error) {
      console.error('Failed to save messages to storage:', error);
      return false;
    }
  }

  // Get messages from API or storage
  async getMessages(options = {}) {
    const { conversationId, limit = 50, offset = 0 } = options;
    
    try {
      // Try to get from API first
      const response = await fetch(`/api/messages?conversationId=${conversationId}&limit=${limit}&offset=${offset}`);
      
      if (response.ok) {
        const messages = await response.json();
        return messages;
      }
    } catch (error) {
      console.warn('API unavailable, loading from storage:', error);
    }
    
    // Fallback to local storage
    return this.loadMessagesFromStorage(conversationId);
  }

  // Send a new message
  async sendMessage(messageData) {
    const message = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...messageData
    };

    try {
      // Try to send to API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('API unavailable, saving locally:', error);
    }

    // Fallback to local storage
    const existingMessages = this.loadMessagesFromStorage();
    existingMessages.push(message);
    this.saveMessagesToStorage(existingMessages);
    
    return message;
  }

  // Add reaction to message
  async addReaction(messageId, emoji) {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('API unavailable for reactions:', error);
    }

    // Local fallback
    const messages = this.loadMessagesFromStorage();
    const message = messages.find(m => m.id === messageId);
    
    if (message) {
      if (!message.reactions) message.reactions = [];
      message.reactions.push({ emoji, userId: 'current-user', timestamp: new Date().toISOString() });
      this.saveMessagesToStorage(messages);
      return { success: true };
    }
    
    return { success: false };
  }

  // Delete a message
  async deleteMessage(messageId) {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        return { success: true };
      }
    } catch (error) {
      console.warn('API unavailable for deletion:', error);
    }

    // Local fallback
    const messages = this.loadMessagesFromStorage();
    const filteredMessages = messages.filter(m => m.id !== messageId);
    this.saveMessagesToStorage(filteredMessages);
    
    return { success: true };
  }

  // Search messages
  searchMessages(query, conversationId = null) {
    const messages = this.loadMessagesFromStorage(conversationId);
    
    return messages.filter(message => 
      message.text?.toLowerCase().includes(query.toLowerCase()) ||
      message.user?.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Clear all messages
  clearMessages() {
    this.storage.removeItem(this.storageKey);
    this.messages = [];
  }
}

export default new MessageService();