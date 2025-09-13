import CryptoJS from 'crypto-js';

// Secure storage service with encryption
class SecureStorage {
  constructor() {
    // Use a combination of user agent and timestamp for encryption key
    this.encryptionKey = this.generateEncryptionKey();
  }

  generateEncryptionKey() {
    // Create a deterministic but unique key per browser/device
    const userAgent = navigator.userAgent;
    const baseKey = 'quibish-secure-storage-2025';
    const combinedKey = baseKey + userAgent;
    return CryptoJS.SHA256(combinedKey).toString();
  }

  // Encrypt and store data
  setItem(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      const encrypted = CryptoJS.AES.encrypt(serializedValue, this.encryptionKey).toString();
      localStorage.setItem(`qs_${key}`, encrypted);
      return true;
    } catch (error) {
      console.error('SecureStorage: Failed to encrypt and store data:', error);
      return false;
    }
  }

  // Retrieve and decrypt data
  getItem(key) {
    try {
      const encrypted = localStorage.getItem(`qs_${key}`);
      if (!encrypted) return null;

      const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        console.warn('SecureStorage: Failed to decrypt data for key:', key);
        return null;
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('SecureStorage: Failed to decrypt data:', error);
      // Clean up corrupted data
      this.removeItem(key);
      return null;
    }
  }

  // Remove item
  removeItem(key) {
    try {
      localStorage.removeItem(`qs_${key}`);
      return true;
    } catch (error) {
      console.error('SecureStorage: Failed to remove item:', error);
      return false;
    }
  }

  // Clear all secure storage items
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('qs_')) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('SecureStorage: Failed to clear storage:', error);
      return false;
    }
  }

  // Check if key exists
  hasItem(key) {
    return localStorage.getItem(`qs_${key}`) !== null;
  }

  // Get all secure storage keys
  getKeys() {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith('qs_'))
        .map(key => key.substring(3)); // Remove 'qs_' prefix
    } catch (error) {
      console.error('SecureStorage: Failed to get keys:', error);
      return [];
    }
  }

  // Secure session storage (temporary)
  setSessionItem(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      const encrypted = CryptoJS.AES.encrypt(serializedValue, this.encryptionKey).toString();
      sessionStorage.setItem(`qs_${key}`, encrypted);
      return true;
    } catch (error) {
      console.error('SecureStorage: Failed to encrypt and store session data:', error);
      return false;
    }
  }

  getSessionItem(key) {
    try {
      const encrypted = sessionStorage.getItem(`qs_${key}`);
      if (!encrypted) return null;

      const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        console.warn('SecureStorage: Failed to decrypt session data for key:', key);
        return null;
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('SecureStorage: Failed to decrypt session data:', error);
      sessionStorage.removeItem(`qs_${key}`);
      return null;
    }
  }

  removeSessionItem(key) {
    try {
      sessionStorage.removeItem(`qs_${key}`);
      return true;
    } catch (error) {
      console.error('SecureStorage: Failed to remove session item:', error);
      return false;
    }
  }

  // Utility: Generate secure random string
  generateSecureId(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Utility: Hash password client-side (additional security layer)
  hashPassword(password, salt = null) {
    const useSalt = salt || this.generateSecureId(16);
    const hashed = CryptoJS.PBKDF2(password, useSalt, {
      keySize: 256 / 32,
      iterations: 1000
    }).toString();
    return { hash: hashed, salt: useSalt };
  }

  // Security check: Verify storage integrity
  verifyIntegrity() {
    const testKey = 'integrity_test';
    const testValue = { test: true, timestamp: Date.now() };
    
    // Test encryption/decryption cycle
    if (!this.setItem(testKey, testValue)) return false;
    const retrieved = this.getItem(testKey);
    this.removeItem(testKey);
    
    return retrieved && retrieved.test === testValue.test;
  }
}

// Create singleton instance
const secureStorage = new SecureStorage();

// Verify storage works on initialization
if (!secureStorage.verifyIntegrity()) {
  console.warn('SecureStorage: Integrity check failed, encryption may not be working properly');
}

export default secureStorage;