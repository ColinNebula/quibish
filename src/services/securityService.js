// Security Enhancement Service
class SecurityService {
  constructor() {
    this.securityLevel = 'basic';
    this.encryptionEnabled = false;
    this.auditLog = [];
  }

  // Generate cryptographically secure random strings
  generateSecureRandom(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Secure password validation
  validatePassword(password) {
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const noCommonPasswords = !this.isCommonPassword(password);
    
    const errors = [];
    
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }
    if (!noCommonPasswords) {
      errors.push('Password is too common, please choose a different one');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  // Calculate password strength score
  calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 2, 20);
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/[0-9]/.test(password)) score += 5;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;
    
    // Pattern penalties
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/123|abc|qwe/i.test(password)) score -= 10; // Sequential patterns
    
    // Return strength level
    if (score >= 80) return 'very-strong';
    if (score >= 60) return 'strong';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'weak';
    return 'very-weak';
  }

  // Check against common passwords
  isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      'dragon', 'master', 'shadow', 'login', 'princess'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  // Input sanitization
  sanitizeInput(input, type = 'text') {
    if (typeof input !== 'string') {
      return '';
    }

    let sanitized = input.trim();

    switch (type) {
      case 'email':
        // Remove potentially dangerous characters from email
        sanitized = sanitized.replace(/[<>()[\]\\,;:\s@"]/g, '');
        break;
        
      case 'username':
        // Allow only alphanumeric and safe special characters
        sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
        break;
        
      case 'phone':
        // Allow only numbers, spaces, dashes, parentheses, and plus
        sanitized = sanitized.replace(/[^0-9\s\-\(\)\+]/g, '');
        break;
        
      case 'text':
      default:
        // HTML encode dangerous characters
        sanitized = sanitized
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
        break;
    }

    return sanitized;
  }

  // Secure token storage using sessionStorage with encryption
  setSecureToken(token) {
    try {
      // Generate a session-specific encryption key
      const sessionKey = this.generateSecureRandom(32);
      
      // Encrypt the token
      const encryptedToken = this.encryptData(token, sessionKey);
      
      // Store encrypted token and key separately
      sessionStorage.setItem('auth_token', encryptedToken);
      sessionStorage.setItem('session_key', sessionKey);
      
      // Set automatic cleanup
      setTimeout(() => {
        this.clearSecureToken();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return true;
    } catch (error) {
      console.error('Failed to store secure token:', error);
      return false;
    }
  }

  // Retrieve secure token
  getSecureToken() {
    try {
      const encryptedToken = sessionStorage.getItem('auth_token');
      const sessionKey = sessionStorage.getItem('session_key');
      
      if (!encryptedToken || !sessionKey) {
        return null;
      }
      
      return this.decryptData(encryptedToken, sessionKey);
    } catch (error) {
      console.error('Failed to retrieve secure token:', error);
      this.clearSecureToken();
      return null;
    }
  }

  // Clear secure token
  clearSecureToken() {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('session_key');
  }

  // Simple encryption for client-side use (not for sensitive data)
  encryptData(data, key) {
    // This is a simple XOR encryption for demonstration
    // In production, use Web Crypto API or a proper encryption library
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(encrypted);
  }

  // Simple decryption
  decryptData(encryptedData, key) {
    try {
      const encrypted = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  // Security audit logging
  logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details: {
        ...details,
        userAgent: navigator.userAgent,
        url: window.location.href,
        ip: 'client-side' // Server should log actual IP
      },
      sessionId: this.getSessionId()
    };

    this.auditLog.push(logEntry);
    
    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // Send to server for permanent storage
    this.sendSecurityLog(logEntry);
  }

  // Generate session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = this.generateSecureRandom(16);
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  // Send security log to server
  async sendSecurityLog(logEntry) {
    try {
      await fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSecureToken()}`
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.warn('Failed to send security log:', error);
    }
  }

  // Check for security threats
  detectThreats() {
    const threats = [];

    // Check for suspicious scripts
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      if (!script.src.startsWith(window.location.origin)) {
        threats.push({
          type: 'external_script',
          source: script.src,
          severity: 'medium'
        });
      }
    });

    // Check for mixed content
    if (window.location.protocol === 'https:' && document.querySelector('img[src^="http:"], link[href^="http:"]')) {
      threats.push({
        type: 'mixed_content',
        severity: 'low'
      });
    }

    // Check for iframe injection
    const iframes = document.querySelectorAll('iframe');
    if (iframes.length > 0) {
      threats.push({
        type: 'iframe_detected',
        count: iframes.length,
        severity: 'medium'
      });
    }

    return threats;
  }

  // Initialize security monitoring
  initializeSecurityMonitoring() {
    // Monitor for XSS attempts
    this.monitorXSSAttempts();
    
    // Monitor for suspicious network activity
    this.monitorNetworkActivity();
    
    // Check security status periodically
    setInterval(() => {
      const threats = this.detectThreats();
      if (threats.length > 0) {
        this.logSecurityEvent('threats_detected', { threats });
      }
    }, 30000); // Every 30 seconds

    console.log('🛡️ Security monitoring initialized');
  }

  // Monitor for XSS attempts
  monitorXSSAttempts() {
    // Override dangerous functions
    const originalInnerHTML = Element.prototype.innerHTML;
    Element.prototype.innerHTML = function(value) {
      if (typeof value === 'string' && /<script|javascript:|on\w+=/i.test(value)) {
        securityService.logSecurityEvent('xss_attempt', {
          element: this.tagName,
          content: value.substring(0, 100)
        });
        return;
      }
      return originalInnerHTML.call(this, value);
    };
  }

  // Monitor network activity
  monitorNetworkActivity() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const url = args[0];
      
      // Log external API calls
      if (typeof url === 'string' && !url.startsWith(window.location.origin)) {
        securityService.logSecurityEvent('external_request', {
          url: url.substring(0, 100),
          method: args[1]?.method || 'GET'
        });
      }
      
      return originalFetch.apply(this, args);
    };
  }

  // Get security status
  getSecurityStatus() {
    return {
      level: this.securityLevel,
      encryptionEnabled: this.encryptionEnabled,
      tokenSecured: !!this.getSecureToken(),
      threatsDetected: this.detectThreats().length,
      lastAudit: this.auditLog[this.auditLog.length - 1]?.timestamp
    };
  }
}

// Export singleton instance
export const securityService = new SecurityService();
export default securityService;