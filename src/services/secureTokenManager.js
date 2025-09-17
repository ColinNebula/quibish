// Secure Token Manager
class SecureTokenManager {
  constructor() {
    this.tokenKey = 'auth_token';
    this.refreshKey = 'refresh_token';
    this.encryptionKey = null;
    this.initializeEncryption();
  }

  // Initialize encryption for token storage
  initializeEncryption() {
    // Generate session-specific encryption key
    if (!sessionStorage.getItem('session_enc_key')) {
      const key = this.generateSecureKey();
      sessionStorage.setItem('session_enc_key', key);
    }
    this.encryptionKey = sessionStorage.getItem('session_enc_key');
  }

  // Generate cryptographically secure key
  generateSecureKey() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Encrypt data using Web Crypto API (more secure than simple XOR)
  async encryptData(data) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // Generate a random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Import key for AES-GCM encryption
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(this.encryptionKey.match(/.{2}/g).map(byte => parseInt(byte, 16))),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        dataBuffer
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  // Decrypt data using Web Crypto API
  async decryptData(encryptedData) {
    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Import key for AES-GCM decryption
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(this.encryptionKey.match(/.{2}/g).map(byte => parseInt(byte, 16))),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        encrypted
      );

      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  // Store token securely
  async setToken(token, refreshToken = null) {
    try {
      // Clear any existing insecure storage
      this.clearInsecureStorage();

      // Encrypt and store main token
      const encryptedToken = await this.encryptData(token);
      sessionStorage.setItem(this.tokenKey, encryptedToken);

      // Store refresh token if provided
      if (refreshToken) {
        const encryptedRefresh = await this.encryptData(refreshToken);
        sessionStorage.setItem(this.refreshKey, encryptedRefresh);
      }

      // Set expiration timer
      this.setTokenExpiration();

      console.log('🔐 Token stored securely');
      return true;
    } catch (error) {
      console.error('Failed to store token securely:', error);
      return false;
    }
  }

  // Retrieve token securely
  async getToken() {
    try {
      const encryptedToken = sessionStorage.getItem(this.tokenKey);
      if (!encryptedToken) {
        return null;
      }

      return await this.decryptData(encryptedToken);
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      this.clearTokens();
      return null;
    }
  }

  // Get refresh token
  async getRefreshToken() {
    try {
      const encryptedRefresh = sessionStorage.getItem(this.refreshKey);
      if (!encryptedRefresh) {
        return null;
      }

      return await this.decryptData(encryptedRefresh);
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  // Clear all tokens
  clearTokens() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.refreshKey);
    sessionStorage.removeItem('session_enc_key');
    
    // Clear any old insecure storage
    this.clearInsecureStorage();
    
    console.log('🧹 All tokens cleared');
  }

  // Clear insecure localStorage tokens
  clearInsecureStorage() {
    // Remove old insecure token storage
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user_token');
    localStorage.removeItem('jwt_token');
    
    // Remove other potentially insecure items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('token') || key.includes('auth'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.warn(`🧹 Removed insecure storage: ${key}`);
    });
  }

  // Set automatic token expiration
  setTokenExpiration() {
    // Clear any existing timer
    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
    }

    // Set timer for 23 hours (1 hour before JWT expiration)
    this.expirationTimer = setTimeout(() => {
      console.warn('⏰ Token expiring soon, clearing tokens');
      this.clearTokens();
      
      // Dispatch event for app to handle re-authentication
      window.dispatchEvent(new CustomEvent('tokenExpiring'));
    }, 23 * 60 * 60 * 1000); // 23 hours
  }

  // Check if token exists and is accessible
  async hasValidToken() {
    try {
      const token = await this.getToken();
      return !!token;
    } catch (error) {
      return false;
    }
  }

  // Migrate from old localStorage to secure storage
  async migrateFromLocalStorage() {
    const oldToken = localStorage.getItem('token');
    if (oldToken) {
      console.log('🔄 Migrating token from insecure localStorage');
      
      // Store securely
      await this.setToken(oldToken);
      
      // Remove from localStorage
      localStorage.removeItem('token');
      
      console.log('✅ Token migration completed');
      return true;
    }
    return false;
  }

  // Get token for API requests with automatic refresh
  async getTokenForRequest() {
    let token = await this.getToken();
    
    if (!token) {
      // Try to migrate from old storage
      await this.migrateFromLocalStorage();
      token = await this.getToken();
    }

    // If still no token, check for refresh
    if (!token) {
      const refreshToken = await this.getRefreshToken();
      if (refreshToken) {
        token = await this.refreshAccessToken(refreshToken);
      }
    }

    return token;
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        await this.setToken(data.token, data.refreshToken);
        return data.token;
      } else {
        // Refresh failed, clear tokens
        this.clearTokens();
        return null;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return null;
    }
  }

  // Security check - detect if tokens have been tampered with
  async verifyTokenIntegrity() {
    try {
      const token = await this.getToken();
      if (!token) return false;

      // Basic JWT structure check
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('🚨 Token structure invalid');
        this.clearTokens();
        return false;
      }

      // Check if token is expired (client-side check)
      try {
        const payload = JSON.parse(atob(parts[1]));
        const now = Math.floor(Date.now() / 1000);
        
        if (payload.exp && payload.exp < now) {
          console.warn('⏰ Token expired');
          this.clearTokens();
          return false;
        }
      } catch (parseError) {
        console.warn('🚨 Token payload invalid');
        this.clearTokens();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token integrity check failed:', error);
      this.clearTokens();
      return false;
    }
  }

  // Initialize secure token manager
  async initialize() {
    // Check for old insecure tokens and migrate
    await this.migrateFromLocalStorage();
    
    // Verify current token integrity
    await this.verifyTokenIntegrity();
    
    // Set up periodic integrity checks
    setInterval(() => {
      this.verifyTokenIntegrity();
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log('🔐 Secure token manager initialized');
  }
}

// Export singleton instance
export const secureTokenManager = new SecureTokenManager();
export default secureTokenManager;