/**
 * Message Threading Service
 * Manages message threads, replies, and conversation organization
 * Provides threading capabilities for power users
 */

class MessageThreadService {
  constructor() {
    this.threads = new Map(); // messageId -> Thread object
    this.messageToThread = new Map(); // messageId -> parentMessageId
    this.listeners = {
      onThreadCreated: [],
      onReplyAdded: [],
      onThreadUpdated: [],
      onThreadDeleted: []
    };
    
    this.initialized = false;
    console.log('💬 Message Thread Service created');
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Message Thread Service...');
      
      // Load threads from IndexedDB
      await this.loadThreadsFromStorage();
      
      this.initialized = true;
      console.log('✅ Message Thread Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize thread service:', error);
      return false;
    }
  }

  /**
   * Create a new thread (reply to a message)
   */
  createThread(parentMessage, replyMessage, options = {}) {
    try {
      const parentId = parentMessage.id;
      
      // Check if thread already exists
      if (!this.threads.has(parentId)) {
        // Create new thread
        const thread = {
          id: parentId,
          parentMessage: parentMessage,
          replies: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          replyCount: 0,
          participants: new Set([parentMessage.user.id]),
          isCollapsed: false,
          ...options
        };
        
        this.threads.set(parentId, thread);
        console.log('📝 Created new thread:', parentId);
      }
      
      // Add reply to thread
      this.addReply(parentId, replyMessage);
      
      // Emit event
      this.emit('onThreadCreated', { 
        threadId: parentId, 
        thread: this.threads.get(parentId) 
      });
      
      return this.threads.get(parentId);
    } catch (error) {
      console.error('❌ Failed to create thread:', error);
      return null;
    }
  }

  /**
   * Add a reply to an existing thread
   */
  addReply(threadId, replyMessage) {
    try {
      const thread = this.threads.get(threadId);
      
      if (!thread) {
        console.warn('⚠️ Thread not found:', threadId);
        return false;
      }

      // Create reply object
      const reply = {
        ...replyMessage,
        threadId: threadId,
        replyTo: threadId,
        depth: this.calculateReplyDepth(threadId, replyMessage.id),
        createdAt: replyMessage.timestamp || new Date().toISOString()
      };

      // Add to thread
      thread.replies.push(reply);
      thread.replyCount = thread.replies.length;
      thread.updatedAt = new Date().toISOString();
      thread.participants.add(replyMessage.user.id);

      // Map message to thread
      this.messageToThread.set(replyMessage.id, threadId);

      // Save to storage
      this.saveThreadToStorage(thread);

      // Emit event
      this.emit('onReplyAdded', { threadId, reply, thread });

      console.log('💬 Added reply to thread:', threadId, 'Reply count:', thread.replyCount);
      return true;
    } catch (error) {
      console.error('❌ Failed to add reply:', error);
      return false;
    }
  }

  /**
   * Calculate reply depth (for nested threads)
   */
  calculateReplyDepth(threadId, messageId) {
    // For now, keep it simple - all replies are at depth 1
    // Can be enhanced for nested replies later
    return 1;
  }

  /**
   * Get thread by message ID
   */
  getThread(messageId) {
    // Check if it's a parent message
    if (this.threads.has(messageId)) {
      return this.threads.get(messageId);
    }
    
    // Check if it's a reply
    const parentId = this.messageToThread.get(messageId);
    if (parentId) {
      return this.threads.get(parentId);
    }
    
    return null;
  }

  /**
   * Get all threads
   */
  getAllThreads() {
    return Array.from(this.threads.values()).sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  /**
   * Get threads for a conversation
   */
  getThreadsForConversation(conversationId) {
    return this.getAllThreads().filter(thread => 
      thread.parentMessage.conversationId === conversationId
    );
  }

  /**
   * Get replies for a thread
   */
  getReplies(threadId) {
    const thread = this.threads.get(threadId);
    return thread ? thread.replies : [];
  }

  /**
   * Toggle thread collapse state
   */
  toggleThreadCollapse(threadId) {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.isCollapsed = !thread.isCollapsed;
      this.emit('onThreadUpdated', { threadId, thread });
      return thread.isCollapsed;
    }
    return false;
  }

  /**
   * Delete a thread
   */
  deleteThread(threadId) {
    try {
      const thread = this.threads.get(threadId);
      
      if (!thread) {
        return false;
      }

      // Remove message mappings
      thread.replies.forEach(reply => {
        this.messageToThread.delete(reply.id);
      });

      // Remove thread
      this.threads.delete(threadId);

      // Remove from storage
      this.removeThreadFromStorage(threadId);

      // Emit event
      this.emit('onThreadDeleted', { threadId });

      console.log('🗑️ Deleted thread:', threadId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete thread:', error);
      return false;
    }
  }

  /**
   * Delete a reply from a thread
   */
  deleteReply(threadId, replyId) {
    try {
      const thread = this.threads.get(threadId);
      
      if (!thread) {
        return false;
      }

      // Remove reply
      const index = thread.replies.findIndex(r => r.id === replyId);
      if (index > -1) {
        thread.replies.splice(index, 1);
        thread.replyCount = thread.replies.length;
        thread.updatedAt = new Date().toISOString();
        
        // Remove mapping
        this.messageToThread.delete(replyId);

        // Save to storage
        this.saveThreadToStorage(thread);

        // Emit event
        this.emit('onThreadUpdated', { threadId, thread });

        console.log('🗑️ Deleted reply from thread:', threadId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to delete reply:', error);
      return false;
    }
  }

  /**
   * Check if message is in a thread
   */
  isInThread(messageId) {
    return this.threads.has(messageId) || this.messageToThread.has(messageId);
  }

  /**
   * Check if message has replies
   */
  hasReplies(messageId) {
    const thread = this.threads.get(messageId);
    return thread && thread.replies.length > 0;
  }

  /**
   * Get reply count for a message
   */
  getReplyCount(messageId) {
    const thread = this.threads.get(messageId);
    return thread ? thread.replyCount : 0;
  }

  /**
   * Get thread participants
   */
  getThreadParticipants(threadId) {
    const thread = this.threads.get(threadId);
    return thread ? Array.from(thread.participants) : [];
  }

  /**
   * Search threads
   */
  searchThreads(query) {
    const lowerQuery = query.toLowerCase();
    return this.getAllThreads().filter(thread => {
      // Search in parent message
      if (thread.parentMessage.text.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in replies
      return thread.replies.some(reply => 
        reply.text.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Get thread statistics
   */
  getThreadStats(threadId) {
    const thread = this.threads.get(threadId);
    
    if (!thread) {
      return null;
    }

    return {
      replyCount: thread.replyCount,
      participantCount: thread.participants.size,
      firstReplyAt: thread.replies[0]?.createdAt,
      lastReplyAt: thread.replies[thread.replies.length - 1]?.createdAt,
      isActive: this.isThreadActive(thread)
    };
  }

  /**
   * Check if thread is active (recent activity)
   */
  isThreadActive(thread) {
    if (!thread.updatedAt) return false;
    
    const lastUpdate = new Date(thread.updatedAt);
    const now = new Date();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
    
    return hoursSinceUpdate < 24; // Active if updated in last 24 hours
  }

  /**
   * Load threads from IndexedDB
   */
  async loadThreadsFromStorage() {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['threads'], 'readonly');
      const store = transaction.objectStore('threads');
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const threads = request.result;
          threads.forEach(thread => {
            // Convert participants array back to Set
            thread.participants = new Set(thread.participants);
            this.threads.set(thread.id, thread);
            
            // Rebuild message mappings
            thread.replies.forEach(reply => {
              this.messageToThread.set(reply.id, thread.id);
            });
          });
          
          console.log(`📚 Loaded ${threads.length} threads from storage`);
          resolve();
        };

        request.onerror = () => {
          console.error('❌ Failed to load threads:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ Error loading threads:', error);
      // Don't fail initialization if storage fails
    }
  }

  /**
   * Save thread to IndexedDB
   */
  async saveThreadToStorage(thread) {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['threads'], 'readwrite');
      const store = transaction.objectStore('threads');

      // Convert Set to Array for storage
      const threadToStore = {
        ...thread,
        participants: Array.from(thread.participants)
      };

      store.put(threadToStore);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('❌ Error saving thread:', error);
    }
  }

  /**
   * Remove thread from IndexedDB
   */
  async removeThreadFromStorage(threadId) {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['threads'], 'readwrite');
      const store = transaction.objectStore('threads');

      store.delete(threadId);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('❌ Error removing thread:', error);
    }
  }

  /**
   * Open IndexedDB database
   */
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('QuibishThreads', 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('threads')) {
          const store = db.createObjectStore('threads', { keyPath: 'id' });
          store.createIndex('conversationId', 'parentMessage.conversationId', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all threads (for testing/reset)
   */
  async clearAllThreads() {
    try {
      this.threads.clear();
      this.messageToThread.clear();

      const db = await this.openDatabase();
      const transaction = db.transaction(['threads'], 'readwrite');
      const store = transaction.objectStore('threads');
      store.clear();

      console.log('🗑️ Cleared all threads');
      return true;
    } catch (error) {
      console.error('❌ Error clearing threads:', error);
      return false;
    }
  }

  /**
   * Export threads (for backup/sync)
   */
  exportThreads() {
    const threads = this.getAllThreads();
    return threads.map(thread => ({
      ...thread,
      participants: Array.from(thread.participants)
    }));
  }

  /**
   * Import threads (from backup/sync)
   */
  async importThreads(threadsData) {
    try {
      for (const threadData of threadsData) {
        threadData.participants = new Set(threadData.participants);
        this.threads.set(threadData.id, threadData);
        
        // Rebuild message mappings
        threadData.replies.forEach(reply => {
          this.messageToThread.set(reply.id, threadData.id);
        });
        
        // Save to storage
        await this.saveThreadToStorage(threadData);
      }
      
      console.log(`📥 Imported ${threadsData.length} threads`);
      return true;
    } catch (error) {
      console.error('❌ Error importing threads:', error);
      return false;
    }
  }

  /**
   * Event listener management
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

// Export singleton instance
const messageThreadService = new MessageThreadService();
export default messageThreadService;
