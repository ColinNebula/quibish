/**
 * End-to-End Encryption Service for Quibish
 * Implements Signal Protocol-inspired E2E encryption
 */

class EncryptionService {
  constructor() {
    this.keyPairs = new Map(); // Store user key pairs
    this.publicKeys = new Map(); // Store other users' public keys
    this.sessionKeys = new Map(); // Store session keys for conversations
    this.isInitialized = false;
  }

  /**
   * Initialize the encryption service for the current user
   */
  async initialize(userId) {
    try {
      this.userId = userId;
      
      // Check if user already has keys
      let keyPair = await this.loadUserKeys(userId);
      
      if (!keyPair) {
        // Generate new key pair for first-time user
        keyPair = await this.generateKeyPair();
        await this.saveUserKeys(userId, keyPair);
        console.log('🔑 Generated new encryption keys for user:', userId);
      } else {
        console.log('🔑 Loaded existing encryption keys for user:', userId);
      }
      
      this.keyPairs.set(userId, keyPair);
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize encryption:', error);
      return false;
    }
  }

  /**
   * Generate a new RSA key pair
   */
  async generateKeyPair() {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      return keyPair;
    } catch (error) {
      console.error('❌ Failed to generate key pair:', error);
      throw error;
    }
  }

  /**
   * Export public key to share with other users
   */
  async exportPublicKey(userId = this.userId) {
    try {
      const keyPair = this.keyPairs.get(userId);
      if (!keyPair) {
        throw new Error('No key pair found for user');
      }

      const exportedKey = await window.crypto.subtle.exportKey(
        'spki',
        keyPair.publicKey
      );

      return this.arrayBufferToBase64(exportedKey);
    } catch (error) {
      console.error('❌ Failed to export public key:', error);
      throw error;
    }
  }

  /**
   * Import public key from another user
   */
  async importPublicKey(userId, publicKeyBase64) {
    try {
      const publicKeyBuffer = this.base64ToArrayBuffer(publicKeyBase64);
      
      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt']
      );

      this.publicKeys.set(userId, publicKey);
      console.log('🔑 Imported public key for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ Failed to import public key:', error);
      return false;
    }
  }

  /**
   * Encrypt a message for a specific recipient
   */
  async encryptMessage(message, recipientUserId) {
    try {
      if (!this.isInitialized) {
        throw new Error('Encryption service not initialized');
      }

      const recipientPublicKey = this.publicKeys.get(recipientUserId);
      if (!recipientPublicKey) {
        throw new Error(`No public key found for user: ${recipientUserId}`);
      }

      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);

      // Encrypt using recipient's public key
      const encryptedBytes = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        recipientPublicKey,
        messageBytes
      );

      // Convert to base64 for transmission
      const encryptedMessage = this.arrayBufferToBase64(encryptedBytes);
      
      return {
        encryptedContent: encryptedMessage,
        senderId: this.userId,
        recipientId: recipientUserId,
        timestamp: new Date().toISOString(),
        isEncrypted: true
      };
    } catch (error) {
      console.error('❌ Failed to encrypt message:', error);
      throw error;
    }
  }

  /**
   * Decrypt a received message
   */
  async decryptMessage(encryptedData) {
    try {
      if (!this.isInitialized) {
        throw new Error('Encryption service not initialized');
      }

      const keyPair = this.keyPairs.get(this.userId);
      if (!keyPair) {
        throw new Error('No private key found for decryption');
      }

      // Convert from base64
      const encryptedBytes = this.base64ToArrayBuffer(encryptedData.encryptedContent);

      // Decrypt using our private key
      const decryptedBytes = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP',
        },
        keyPair.privateKey,
        encryptedBytes
      );

      // Convert back to string
      const decryptedMessage = new TextDecoder().decode(decryptedBytes);
      
      return {
        ...encryptedData,
        content: decryptedMessage,
        isDecrypted: true
      };
    } catch (error) {
      console.error('❌ Failed to decrypt message:', error);
      // Return the encrypted data with error flag
      return {
        ...encryptedData,
        content: '[Decryption Failed]',
        decryptionError: true
      };
    }
  }

  /**
   * Encrypt for group conversation (multi-recipient)
   */
  async encryptForGroup(message, participantUserIds) {
    try {
      const encryptedMessages = {};
      
      for (const userId of participantUserIds) {
        if (userId !== this.userId) { // Don't encrypt for ourselves
          const encrypted = await this.encryptMessage(message, userId);
          encryptedMessages[userId] = encrypted.encryptedContent;
        }
      }

      return {
        senderId: this.userId,
        encryptedPayloads: encryptedMessages,
        timestamp: new Date().toISOString(),
        isGroupEncrypted: true
      };
    } catch (error) {
      console.error('❌ Failed to encrypt for group:', error);
      throw error;
    }
  }

  /**
   * Generate a fingerprint for key verification
   */
  async generateKeyFingerprint(userId = this.userId) {
    try {
      const publicKeyBase64 = await this.exportPublicKey(userId);
      const publicKeyBytes = this.base64ToArrayBuffer(publicKeyBase64);
      
      // Create SHA-256 hash of public key
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', publicKeyBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      
      // Convert to readable fingerprint format
      const fingerprint = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .match(/.{1,4}/g)
        .join(' ')
        .toUpperCase();

      return fingerprint;
    } catch (error) {
      console.error('❌ Failed to generate fingerprint:', error);
      throw error;
    }
  }

  /**
   * Save user keys to secure storage
   */
  async saveUserKeys(userId, keyPair) {
    try {
      // Export keys for storage
      const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      const keyData = {
        publicKey: this.arrayBufferToBase64(publicKey),
        privateKey: this.arrayBufferToBase64(privateKey),
        createdAt: new Date().toISOString()
      };

      // Store in secure localStorage (in production, use more secure storage)
      localStorage.setItem(`e2e_keys_${userId}`, JSON.stringify(keyData));
      
      // Also store public key for sharing
      localStorage.setItem(`public_key_${userId}`, keyData.publicKey);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save keys:', error);
      return false;
    }
  }

  /**
   * Load user keys from secure storage
   */
  async loadUserKeys(userId) {
    try {
      const keyDataStr = localStorage.getItem(`e2e_keys_${userId}`);
      if (!keyDataStr) {
        return null;
      }

      const keyData = JSON.parse(keyDataStr);

      // Import keys
      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        this.base64ToArrayBuffer(keyData.publicKey),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt']
      );

      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        this.base64ToArrayBuffer(keyData.privateKey),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt']
      );

      return { publicKey, privateKey };
    } catch (error) {
      console.error('❌ Failed to load keys:', error);
      return null;
    }
  }

  /**
   * Get public key for sharing with other users
   */
  async getPublicKeyForSharing(userId = this.userId) {
    try {
      return localStorage.getItem(`public_key_${userId}`);
    } catch (error) {
      console.error('❌ Failed to get public key for sharing:', error);
      return null;
    }
  }

  /**
   * Check if we can encrypt for a user (have their public key)
   */
  canEncryptForUser(userId) {
    return this.publicKeys.has(userId);
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Utility: Convert Base64 to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Clear all encryption data (for logout)
   */
  clearEncryptionData() {
    this.keyPairs.clear();
    this.publicKeys.clear();
    this.sessionKeys.clear();
    this.isInitialized = false;
    this.userId = null;
    console.log('🧹 Cleared all encryption data');
  }

  /**
   * Get encryption status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      userId: this.userId,
      hasKeyPair: this.keyPairs.has(this.userId),
      publicKeysCount: this.publicKeys.size,
      canEncrypt: this.isInitialized && this.keyPairs.has(this.userId)
    };
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

export default encryptionService;