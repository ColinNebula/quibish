/**
 * Local Storage Service for Quibish
 * Provides persistent storage in the browser
 */

class LocalStorageService {
  constructor() {
    this.MESSAGES_KEY = 'quibish_messages';
    this.USER_DATA_KEY = 'quibish_user_data';
    this.UPLOADS_KEY = 'quibish_uploads';
    this.SETTINGS_KEY = 'quibish_settings';
  }

  /**
   * Check if localStorage is available
   */
  isAvailable() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Save messages to localStorage
   */
  saveMessages(messages) {
    try {
      if (!this.isAvailable()) return false;
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
      console.log('💾 Messages saved to localStorage');
      return true;
    } catch (error) {
      console.error('Error saving messages to localStorage:', error);
      return false;
    }
  }

  /**
   * Load messages from localStorage
   */
  loadMessages() {
    try {
      if (!this.isAvailable()) return [];
      const stored = localStorage.getItem(this.MESSAGES_KEY);
      if (stored) {
        const messages = JSON.parse(stored);
        console.log(`📁 Loaded ${messages.length} messages from localStorage`);
        return messages;
      }
      return [];
    } catch (error) {
      console.error('Error loading messages from localStorage:', error);
      return [];
    }
  }

  /**
   * Add a new message and save to localStorage
   */
  addMessage(message) {
    try {
      const messages = this.loadMessages();
      const newMessage = {
        ...message,
        id: message.id || Date.now().toString(),
        timestamp: message.timestamp || new Date().toISOString(),
        localId: Date.now() + Math.random() // Unique local identifier
      };
      messages.push(newMessage);
      this.saveMessages(messages);
      return newMessage;
    } catch (error) {
      console.error('Error adding message to localStorage:', error);
      return null;
    }
  }

  /**
   * Save uploaded file references
   */
  saveUploadedFiles(files) {
    try {
      if (!this.isAvailable()) return false;
      localStorage.setItem(this.UPLOADS_KEY, JSON.stringify(files));
      console.log('💾 Uploaded files saved to localStorage');
      return true;
    } catch (error) {
      console.error('Error saving uploads to localStorage:', error);
      return false;
    }
  }

  /**
   * Load uploaded file references
   */
  loadUploadedFiles() {
    try {
      if (!this.isAvailable()) return [];
      const stored = localStorage.getItem(this.UPLOADS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Error loading uploads from localStorage:', error);
      return [];
    }
  }

  /**
   * Save user session data
   */
  saveUserData(userData) {
    try {
      if (!this.isAvailable()) return false;
      localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Error saving user data to localStorage:', error);
      return false;
    }
  }

  /**
   * Load user session data
   */
  loadUserData() {
    try {
      if (!this.isAvailable()) return null;
      const stored = localStorage.getItem(this.USER_DATA_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('Error loading user data from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear all stored data
   */
  clearAllData() {
    try {
      if (!this.isAvailable()) return false;
      localStorage.removeItem(this.MESSAGES_KEY);
      localStorage.removeItem(this.USER_DATA_KEY);
      localStorage.removeItem(this.UPLOADS_KEY);
      localStorage.removeItem(this.SETTINGS_KEY);
      console.log('🗑️ All localStorage data cleared');
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  /**
   * Get storage usage info
   */
  getStorageInfo() {
    try {
      if (!this.isAvailable()) return null;
      
      const messages = this.loadMessages();
      const uploads = this.loadUploadedFiles();
      const userData = this.loadUserData();
      
      return {
        messagesCount: messages.length,
        uploadsCount: uploads.length,
        hasUserData: !!userData,
        totalSize: this.calculateStorageSize()
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }

  /**
   * Calculate approximate storage size
   */
  calculateStorageSize() {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('quibish_')) {
          total += localStorage[key].length;
        }
      }
      return total;
    } catch (error) {
      return 0;
    }
  }
}

const localStorageService = new LocalStorageService();
export default localStorageService;