// Encrypted Message Service - Complete Implementation
import CryptoJS from 'crypto-js';
import { buildApiUrl } from '../config/api';

class EncryptedMessageService {
  constructor() {
    this.encryptionKey = null;
    this.isInitialized = false;
    this.encryptionEnabled = false;
  }

  // Initialize encryption for a user
  async initializeEncryption(userId) {
    try {
      // Generate or retrieve encryption key
      const storedKey = localStorage.getItem(`encryption_key_${userId}`);
      
      if (storedKey) {
        this.encryptionKey = storedKey;
      } else {
        // Generate new key
        this.encryptionKey = CryptoJS.lib.WordArray.random(256/8).toString();
        localStorage.setItem(`encryption_key_${userId}`, this.encryptionKey);
      }
      
      this.isInitialized = true;
      this.encryptionEnabled = true;
      
      return { 
        success: true, 
        message: 'Encryption initialized successfully',
        keyGenerated: !storedKey
      };
    } catch (error) {
      console.error('Encryption initialization failed:', error);
      return { 
        success: false, 
        message: 'Failed to initialize encryption',
        error: error.message
      };
    }
  }

  // Get encryption status
  getEncryptionStatus() {
    return {
      initialized: this.isInitialized,
      enabled: this.encryptionEnabled,
      hasKey: !!this.encryptionKey
    };
  }

  // Encrypt a message
  encryptMessage(message) {
    if (!this.isInitialized || !this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    try {
      const encrypted = CryptoJS.AES.encrypt(message, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Message encryption failed:', error);
      throw error;
    }
  }

  // Decrypt a message
  decryptMessage(encryptedMessage) {
    if (!this.isInitialized || !this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Message decryption failed:', error);
      throw error;
    }
  }

  // Send encrypted message
  async sendMessage(messageData, options = {}) {
    try {
      let processedMessage = { ...messageData };
      
      // Encrypt the message text if encryption is enabled
      if (this.encryptionEnabled && messageData.text) {
        processedMessage.text = this.encryptMessage(messageData.text);
        processedMessage.encrypted = true;
      }
      
      // Add metadata
      processedMessage.id = Date.now().toString();
      processedMessage.timestamp = new Date().toISOString();
      processedMessage.encryptionStatus = this.getEncryptionStatus();
      
      // Try to send to API
      const response = await fetch(buildApiUrl('messages/encrypted'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Encryption-Enabled': this.encryptionEnabled.toString()
        },
        body: JSON.stringify(processedMessage)
      });

      if (response.ok) {
        return await response.json();
      }
      
      throw new Error('API request failed');
    } catch (error) {
      console.warn('Encrypted message API unavailable, using fallback:', error);
      
      // Fallback: return the processed message
      return {
        ...messageData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        encrypted: this.encryptionEnabled,
        fallback: true
      };
    }
  }

  // Get encrypted messages
  async getMessages(options = {}) {
    const { limit = 50, conversationId } = options;

    if (!conversationId) {
      return [];
    }
    
    try {
      const response = await fetch(buildApiUrl(`messages/encrypted?limit=${limit}&conversationId=${conversationId}`), {
        headers: {
          'X-Encryption-Key': this.encryptionKey || ''
        }
      });

      if (response.ok) {
        const messages = await response.json();
        
        // Decrypt messages if they're encrypted
        return messages.map(message => {
          if (message.encrypted && this.encryptionEnabled) {
            try {
              return {
                ...message,
                text: this.decryptMessage(message.text),
                decrypted: true
              };
            } catch (error) {
              console.error('Failed to decrypt message:', error);
              return {
                ...message,
                text: '[Decryption Failed]',
                decryptionError: true
              };
            }
          }
          return message;
        });
      }
    } catch (error) {
      console.warn('Encrypted messages API unavailable:', error);
    }
    
    // Fallback to empty array
    return [];
  }

  // Toggle encryption
  toggleEncryption() {
    this.encryptionEnabled = !this.encryptionEnabled;
    return this.encryptionEnabled;
  }

  // Reset encryption
  resetEncryption(userId) {
    localStorage.removeItem(`encryption_key_${userId}`);
    this.encryptionKey = null;
    this.isInitialized = false;
    this.encryptionEnabled = false;
  }
}

export default new EncryptedMessageService();