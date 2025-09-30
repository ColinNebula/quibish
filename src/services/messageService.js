// Message Service - Complete Implementation
import persistentStorageService from './persistentStorageService';

class MessageService {
  constructor() {
    this.messages = [];
    // Use persistent storage service instead of direct localStorage
    this.persistentStorage = persistentStorageService;
  }

  // Load messages from persistent storage
  loadMessagesFromStorage(conversationId = null) {
    try {
      const allMessages = this.persistentStorage.getMessages();
      
      if (conversationId) {
        return allMessages.filter(msg => msg.conversationId === conversationId);
      }
      
      return allMessages;
    } catch (error) {
      console.error('❌ Failed to load messages from storage:', error);
      return [];
    }
  }

  // Save messages to persistent storage
  saveMessagesToStorage(messages) {
    try {
      return this.persistentStorage.setMessages(messages);
    } catch (error) {
      console.error('❌ Failed to save messages to storage:', error);
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
        const result = await response.json();
        // Also save to persistent storage for offline access
        this.persistentStorage.addMessage(result);
        return result;
      }
    } catch (error) {
      console.warn('⚠️ API unavailable, saving locally:', error);
    }

    // Fallback to persistent storage
    this.persistentStorage.addMessage(message);
    console.log('💾 Message saved to persistent storage');
    
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
        const result = await response.json();
        // Update persistent storage
        this.persistentStorage.updateMessage(messageId, result);
        return result;
      }
    } catch (error) {
      console.warn('⚠️ API unavailable for reactions:', error);
    }

    // Local fallback using persistent storage
    const messages = this.loadMessagesFromStorage();
    const message = messages.find(m => m.id === messageId);
    
    if (message) {
      if (!message.reactions) message.reactions = [];
      message.reactions.push({ 
        emoji, 
        userId: 'current-user', 
        timestamp: new Date().toISOString() 
      });
      
      this.persistentStorage.updateMessage(messageId, message);
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
        // Also delete from persistent storage
        this.persistentStorage.deleteMessage(messageId);
        return { success: true };
      }
    } catch (error) {
      console.warn('⚠️ API unavailable for deletion:', error);
    }

    // Local fallback using persistent storage
    return this.persistentStorage.deleteMessage(messageId) ? 
      { success: true } : { success: false };
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
    this.persistentStorage.setMessages([]);
    console.log('🧹 All messages cleared from persistent storage');
  }
}

export default new MessageService();