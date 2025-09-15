/**
 * Enhanced Message Service with End-to-End Encryption Support
 * Extends the existing messageService with encryption capabilities
 */

import messageService from './messageService';
import encryptionService from './encryptionService';

class EncryptedMessageService {
  constructor() {
    this.originalMessageService = messageService;
    this.encryptionEnabled = false;
  }

  /**
   * Initialize encryption for the current user
   */
  async initializeEncryption(userId) {
    try {
      const success = await encryptionService.initialize(userId);
      this.encryptionEnabled = success;
      console.log(`🔒 Encryption ${success ? 'enabled' : 'disabled'} for user:`, userId);
      return success;
    } catch (error) {
      console.error('❌ Failed to initialize encryption:', error);
      this.encryptionEnabled = false;
      return false;
    }
  }

  /**
   * Send a message with optional encryption
   */
  async sendMessage(messageData, options = {}) {
    try {
      const { 
        encrypt = true, 
        recipientId = null, 
        conversationParticipants = [] 
      } = options;

      // If encryption is enabled and requested
      if (this.encryptionEnabled && encrypt) {
        if (recipientId) {
          // Direct message encryption
          return await this.sendEncryptedDirectMessage(messageData, recipientId);
        } else if (conversationParticipants.length > 0) {
          // Group message encryption
          return await this.sendEncryptedGroupMessage(messageData, conversationParticipants);
        }
      }

      // Fall back to regular unencrypted message
      return await this.originalMessageService.sendMessage(messageData);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send encrypted direct message
   */
  async sendEncryptedDirectMessage(messageData, recipientId) {
    try {
      // Check if we can encrypt for this user
      if (!encryptionService.canEncryptForUser(recipientId)) {
        throw new Error(`Cannot encrypt for user ${recipientId} - no public key available`);
      }

      // Encrypt the message content
      const encryptedData = await encryptionService.encryptMessage(
        messageData.text, 
        recipientId
      );

      // Send encrypted message to server
      const serverMessage = {
        ...messageData,
        text: '[Encrypted Message]', // Placeholder text for server
        encryptedContent: encryptedData.encryptedContent,
        isEncrypted: true,
        recipientId: recipientId,
        messageType: 'encrypted'
      };

      const response = await this.originalMessageService.sendMessage(serverMessage);
      
      // Return the original unencrypted content for local display
      return {
        ...response,
        text: messageData.text,
        isEncrypted: true,
        encryptionStatus: 'sent'
      };
    } catch (error) {
      console.error('❌ Failed to send encrypted direct message:', error);
      throw error;
    }
  }

  /**
   * Send encrypted group message
   */
  async sendEncryptedGroupMessage(messageData, participants) {
    try {
      // Encrypt for all participants (except sender)
      const encryptedForGroup = await encryptionService.encryptForGroup(
        messageData.text, 
        participants
      );

      // Send to server with encrypted payloads
      const serverMessage = {
        ...messageData,
        text: '[Encrypted Group Message]',
        encryptedPayloads: encryptedForGroup.encryptedPayloads,
        isGroupEncrypted: true,
        messageType: 'group_encrypted'
      };

      const response = await this.originalMessageService.sendMessage(serverMessage);
      
      return {
        ...response,
        text: messageData.text,
        isEncrypted: true,
        encryptionStatus: 'sent'
      };
    } catch (error) {
      console.error('❌ Failed to send encrypted group message:', error);
      throw error;
    }
  }

  /**
   * Receive and decrypt messages
   */
  async getMessages(options = {}) {
    try {
      const messages = await this.originalMessageService.getMessages(options);
      
      if (!this.encryptionEnabled) {
        return messages;
      }

      // Decrypt encrypted messages
      const decryptedMessages = await Promise.all(
        messages.map(message => this.decryptMessageIfNeeded(message))
      );

      return decryptedMessages;
    } catch (error) {
      console.error('❌ Failed to get and decrypt messages:', error);
      throw error;
    }
  }

  /**
   * Decrypt a message if it's encrypted
   */
  async decryptMessageIfNeeded(message) {
    try {
      // Check if message is encrypted
      if (!message.isEncrypted && !message.encryptedContent) {
        return message;
      }

      // Decrypt direct message
      if (message.encryptedContent) {
        const decryptedData = await encryptionService.decryptMessage({
          encryptedContent: message.encryptedContent,
          senderId: message.senderId,
          timestamp: message.timestamp
        });

        return {
          ...message,
          text: decryptedData.content,
          isEncrypted: true,
          encryptionStatus: decryptedData.decryptionError ? 'failed' : 'decrypted'
        };
      }

      // Decrypt group message
      if (message.encryptedPayloads && message.encryptedPayloads[encryptionService.userId]) {
        const myEncryptedContent = message.encryptedPayloads[encryptionService.userId];
        const decryptedData = await encryptionService.decryptMessage({
          encryptedContent: myEncryptedContent,
          senderId: message.senderId,
          timestamp: message.timestamp
        });

        return {
          ...message,
          text: decryptedData.content,
          isEncrypted: true,
          encryptionStatus: decryptedData.decryptionError ? 'failed' : 'decrypted'
        };
      }

      // If we can't decrypt, return with placeholder
      return {
        ...message,
        text: '[Unable to decrypt message]',
        isEncrypted: true,
        encryptionStatus: 'failed'
      };
    } catch (error) {
      console.error('❌ Failed to decrypt message:', error);
      return {
        ...message,
        text: '[Decryption error]',
        isEncrypted: true,
        encryptionStatus: 'error'
      };
    }
  }

  /**
   * Add a user's public key for encryption
   */
  async addUserPublicKey(userId, publicKeyBase64) {
    try {
      const success = await encryptionService.importPublicKey(userId, publicKeyBase64);
      if (success) {
        console.log(`✅ Added public key for user: ${userId}`);
      }
      return success;
    } catch (error) {
      console.error('❌ Failed to add user public key:', error);
      return false;
    }
  }

  /**
   * Get our public key for sharing
   */
  async getPublicKeyForSharing() {
    try {
      return await encryptionService.getPublicKeyForSharing();
    } catch (error) {
      console.error('❌ Failed to get public key for sharing:', error);
      return null;
    }
  }

  /**
   * Check if encryption is available for a user
   */
  canEncryptForUser(userId) {
    return this.encryptionEnabled && encryptionService.canEncryptForUser(userId);
  }

  /**
   * Get encryption status
   */
  getEncryptionStatus() {
    return {
      enabled: this.encryptionEnabled,
      serviceStatus: encryptionService.getStatus()
    };
  }

  /**
   * Generate key fingerprint for verification
   */
  async generateKeyFingerprint(userId = null) {
    try {
      return await encryptionService.generateKeyFingerprint(userId);
    } catch (error) {
      console.error('❌ Failed to generate fingerprint:', error);
      return null;
    }
  }

  /**
   * Clear encryption data (for logout)
   */
  clearEncryption() {
    encryptionService.clearEncryptionData();
    this.encryptionEnabled = false;
    console.log('🧹 Cleared encryption data');
  }

  // Proxy methods to original message service
  async editMessage(messageId, newText) {
    return await this.originalMessageService.editMessage(messageId, newText);
  }

  async deleteMessage(messageId) {
    return await this.originalMessageService.deleteMessage(messageId);
  }

  async addReaction(messageId, reaction) {
    return await this.originalMessageService.addReaction(messageId, reaction);
  }

  async removeReaction(messageId, reaction) {
    return await this.originalMessageService.removeReaction(messageId, reaction);
  }

  // Event handling
  onMessage(callback) {
    // Wrap the callback to decrypt incoming messages
    const wrappedCallback = async (message) => {
      const decryptedMessage = await this.decryptMessageIfNeeded(message);
      callback(decryptedMessage);
    };
    
    return this.originalMessageService.onMessage(wrappedCallback);
  }

  onMessageUpdate(callback) {
    const wrappedCallback = async (message) => {
      const decryptedMessage = await this.decryptMessageIfNeeded(message);
      callback(decryptedMessage);
    };
    
    return this.originalMessageService.onMessageUpdate(wrappedCallback);
  }

  onMessageDelete(callback) {
    return this.originalMessageService.onMessageDelete(callback);
  }
}

// Create singleton instance
const encryptedMessageService = new EncryptedMessageService();

export default encryptedMessageService;