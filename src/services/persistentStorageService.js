/**
 * Persistent Storage Service
 * Ensures data persistence across browser sessions and handles offline scenarios
 */

class PersistentStorageService {
  constructor() {
    this.STORAGE_KEYS = {
      USER_DATA: 'quibish_user_data',
      USER_PROFILE: 'quibish_user_profile',
      MESSAGES: 'quibish_messages',
      CONVERSATIONS: 'quibish_conversations',
      SETTINGS: 'quibish_settings',
      AUTH_TOKEN: 'quibish_auth_token',
      SESSION_DATA: 'quibish_session_data',
      REMEMBER_ME: 'quibish_remember_me'
    };
    
    this.listeners = {};
    this.initializeStorage();
  }

  // Initialize storage and check for data integrity
  initializeStorage() {
    try {
      // Check if localStorage is available
      if (!this.isStorageAvailable('localStorage')) {
        console.warn('⚠️ localStorage not available, using sessionStorage');
        this.primaryStorage = sessionStorage;
      } else {
        this.primaryStorage = localStorage;
      }
      
      // Migrate old data if necessary
      this.migrateOldData();
      
      console.log('✅ Persistent storage initialized');
    } catch (error) {
      console.error('❌ Failed to initialize storage:', error);
    }
  }

  // Check if storage type is available
  isStorageAvailable(type) {
    try {
      const storage = window[type];
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Migrate old data format to new persistent format
  migrateOldData() {
    try {
      // Migrate user data
      const oldUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (oldUser && !this.getUserData()) {
        const userData = JSON.parse(oldUser);
        this.setUserData(userData);
        console.log('📦 Migrated user data to persistent storage');
      }

      // Migrate messages
      const oldMessages = localStorage.getItem('quibish_messages');
      if (oldMessages && !this.getMessages().length) {
        const messages = JSON.parse(oldMessages);
        this.setMessages(messages);
        console.log('📦 Migrated messages to persistent storage');
      }

      // Migrate auth token
      const oldToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (oldToken && !this.getAuthToken()) {
        this.setAuthToken(oldToken);
        console.log('📦 Migrated auth token to persistent storage');
      }
    } catch (error) {
      console.warn('⚠️ Error during data migration:', error);
    }
  }

  // Generic storage operations with error handling
  setItem(key, value, persistent = true) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (persistent && this.getRememberMe()) {
        // Store persistently if remember me is enabled
        localStorage.setItem(key, stringValue);
        console.log(`💾 Stored ${key} persistently`);
      } else {
        // Store for session only
        sessionStorage.setItem(key, stringValue);
        console.log(`📱 Stored ${key} for session`);
      }
      
      // Always backup to localStorage for critical data
      if (this.isCriticalData(key)) {
        localStorage.setItem(key, stringValue);
      }
      
      this.notifyListeners(key, value);
      return true;
    } catch (error) {
      console.error(`❌ Failed to store ${key}:`, error);
      return false;
    }
  }

  getItem(key, parse = true) {
    try {
      // Try localStorage first (persistent)
      let value = localStorage.getItem(key);
      
      // Fallback to sessionStorage
      if (!value) {
        value = sessionStorage.getItem(key);
      }
      
      if (!value) return null;
      
      return parse ? JSON.parse(value) : value;
    } catch (error) {
      console.error(`❌ Failed to retrieve ${key}:`, error);
      return null;
    }
  }

  removeItem(key) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      this.notifyListeners(key, null);
      console.log(`🗑️ Removed ${key} from all storage`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove ${key}:`, error);
      return false;
    }
  }

  // Check if data is critical and should always be backed up
  isCriticalData(key) {
    const criticalKeys = [
      this.STORAGE_KEYS.USER_DATA,
      this.STORAGE_KEYS.USER_PROFILE,
      this.STORAGE_KEYS.MESSAGES,
      this.STORAGE_KEYS.AUTH_TOKEN
    ];
    return criticalKeys.includes(key);
  }

  // User data operations
  setUserData(userData, persistent = null) {
    if (persistent === null) {
      persistent = this.getRememberMe();
    }
    
    const success = this.setItem(this.STORAGE_KEYS.USER_DATA, userData, persistent);
    
    // Also update profile data
    if (success) {
      this.setUserProfile(userData, persistent);
    }
    
    return success;
  }

  getUserData() {
    return this.getItem(this.STORAGE_KEYS.USER_DATA);
  }

  updateUserData(updates) {
    const currentData = this.getUserData() || {};
    const updatedData = {
      ...currentData,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    return this.setUserData(updatedData);
  }

  // User profile operations
  setUserProfile(profileData, persistent = null) {
    if (persistent === null) {
      persistent = this.getRememberMe();
    }
    
    return this.setItem(this.STORAGE_KEYS.USER_PROFILE, profileData, persistent);
  }

  getUserProfile() {
    return this.getItem(this.STORAGE_KEYS.USER_PROFILE);
  }

  updateUserProfile(updates) {
    const currentProfile = this.getUserProfile() || {};
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Update both user data and profile
    this.setUserProfile(updatedProfile);
    this.updateUserData(updates);
    
    return updatedProfile;
  }

  // Messages operations
  setMessages(messages) {
    return this.setItem(this.STORAGE_KEYS.MESSAGES, messages, true); // Always persistent
  }

  getMessages() {
    return this.getItem(this.STORAGE_KEYS.MESSAGES) || [];
  }

  addMessage(message) {
    const messages = this.getMessages();
    messages.push({
      ...message,
      id: message.id || Date.now().toString(),
      timestamp: message.timestamp || new Date().toISOString()
    });
    
    // Keep only last 1000 messages to prevent storage overflow
    if (messages.length > 1000) {
      messages.splice(0, messages.length - 1000);
    }
    
    return this.setMessages(messages);
  }

  updateMessage(messageId, updates) {
    const messages = this.getMessages();
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
      messages[messageIndex] = {
        ...messages[messageIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return this.setMessages(messages);
    }
    
    return false;
  }

  deleteMessage(messageId) {
    const messages = this.getMessages();
    const filteredMessages = messages.filter(msg => msg.id !== messageId);
    return this.setMessages(filteredMessages);
  }

  // Auth token operations
  setAuthToken(token, persistent = null) {
    if (persistent === null) {
      persistent = this.getRememberMe();
    }
    
    return this.setItem(this.STORAGE_KEYS.AUTH_TOKEN, token, persistent);
  }

  getAuthToken() {
    return this.getItem(this.STORAGE_KEYS.AUTH_TOKEN, false); // Don't parse token
  }

  // Remember me setting
  setRememberMe(remember) {
    localStorage.setItem(this.STORAGE_KEYS.REMEMBER_ME, remember.toString());
    return remember;
  }

  getRememberMe() {
    const remembered = localStorage.getItem(this.STORAGE_KEYS.REMEMBER_ME);
    return remembered === 'true';
  }

  // Settings operations
  setSettings(settings) {
    return this.setItem(this.STORAGE_KEYS.SETTINGS, settings, true);
  }

  getSettings() {
    return this.getItem(this.STORAGE_KEYS.SETTINGS) || {};
  }

  updateSettings(updates) {
    const currentSettings = this.getSettings();
    const updatedSettings = {
      ...currentSettings,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    return this.setSettings(updatedSettings);
  }

  // Conversations operations
  setConversations(conversations) {
    return this.setItem(this.STORAGE_KEYS.CONVERSATIONS, conversations, true);
  }

  getConversations() {
    return this.getItem(this.STORAGE_KEYS.CONVERSATIONS) || [];
  }

  addConversation(conversation) {
    const conversations = this.getConversations();
    conversations.push({
      ...conversation,
      id: conversation.id || Date.now().toString(),
      createdAt: conversation.createdAt || new Date().toISOString()
    });
    
    return this.setConversations(conversations);
  }

  // Session data operations
  setSessionData(sessionData) {
    return this.setItem(this.STORAGE_KEYS.SESSION_DATA, sessionData, false); // Session only
  }

  getSessionData() {
    return this.getItem(this.STORAGE_KEYS.SESSION_DATA);
  }

  // Clear all data (logout)
  clearAllData() {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      this.removeItem(key);
    });
    
    // Also clear any legacy keys
    const legacyKeys = ['user', 'authToken', 'token', 'quibish_messages'];
    legacyKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    console.log('🧹 Cleared all persistent data');
  }

  // Clear only session data (keep persistent data)
  clearSessionData() {
    sessionStorage.clear();
    this.removeItem(this.STORAGE_KEYS.SESSION_DATA);
    console.log('🧹 Cleared session data');
  }

  // Export all data for backup
  exportAllData() {
    const allData = {};
    
    Object.entries(this.STORAGE_KEYS).forEach(([key, storageKey]) => {
      const data = this.getItem(storageKey);
      if (data) {
        allData[key] = data;
      }
    });
    
    return {
      ...allData,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  // Import data from backup
  importAllData(data) {
    try {
      Object.entries(data).forEach(([key, value]) => {
        if (this.STORAGE_KEYS[key]) {
          this.setItem(this.STORAGE_KEYS[key], value, true);
        }
      });
      
      console.log('✅ Data imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      return false;
    }
  }

  // Get storage usage statistics
  getStorageStats() {
    const stats = {
      localStorage: {},
      sessionStorage: {},
      total: { localStorage: 0, sessionStorage: 0 }
    };
    
    // Calculate localStorage usage
    Object.entries(this.STORAGE_KEYS).forEach(([key, storageKey]) => {
      const localData = localStorage.getItem(storageKey);
      const sessionData = sessionStorage.getItem(storageKey);
      
      if (localData) {
        const size = new Blob([localData]).size;
        stats.localStorage[key] = size;
        stats.total.localStorage += size;
      }
      
      if (sessionData) {
        const size = new Blob([sessionData]).size;
        stats.sessionStorage[key] = size;
        stats.total.sessionStorage += size;
      }
    });
    
    return stats;
  }

  // Event system for data changes
  on(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
  }

  off(key, callback) {
    if (this.listeners[key]) {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
    }
  }

  notifyListeners(key, value) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error('❌ Error in storage listener:', error);
        }
      });
    }
  }

  // Health check
  healthCheck() {
    try {
      const testKey = '__health_check__';
      const testValue = 'test';
      
      // Test localStorage
      localStorage.setItem(testKey, testValue);
      const localResult = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      // Test sessionStorage
      sessionStorage.setItem(testKey, testValue);
      const sessionResult = sessionStorage.getItem(testKey);
      sessionStorage.removeItem(testKey);
      
      return {
        healthy: true,
        localStorage: localResult === testValue,
        sessionStorage: sessionResult === testValue,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const persistentStorageService = new PersistentStorageService();

export default persistentStorageService;