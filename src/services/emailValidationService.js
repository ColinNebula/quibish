/**
 * Email Validation Service
 * Handles email verification for user registration
 */

class EmailValidationService {
  constructor() {
    this.pendingVerifications = new Map();
    this.verifiedEmails = new Set();
  }

  /**
   * Send verification email to user
   */
  async sendVerificationEmail(email, username, password) {
    try {
      // Generate a 6-digit verification code
      const verificationCode = this.generateVerificationCode();
      const verificationId = this.generateVerificationId();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store pending verification
      this.pendingVerifications.set(verificationId, {
        email,
        username,
        password,
        verificationCode,
        expiresAt,
        attempts: 0,
        maxAttempts: 3
      });

      // In a real app, this would send an actual email
      console.log(`📧 Verification email sent to ${email}`);
      console.log(`🔐 Verification code: ${verificationCode}`);
      
      // Show in development
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        this.showDevelopmentNotification(email, verificationCode);
      }

      return {
        success: true,
        verificationId,
        message: 'Verification email sent successfully',
        expiresAt
      };
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Verify email with code
   */
  async verifyEmailCode(verificationId, code) {
    try {
      const verification = this.pendingVerifications.get(verificationId);
      
      if (!verification) {
        throw new Error('Invalid verification ID');
      }

      if (new Date() > verification.expiresAt) {
        this.pendingVerifications.delete(verificationId);
        throw new Error('Verification code has expired');
      }

      if (verification.attempts >= verification.maxAttempts) {
        this.pendingVerifications.delete(verificationId);
        throw new Error('Maximum verification attempts exceeded');
      }

      verification.attempts++;

      if (verification.verificationCode !== code) {
        throw new Error(`Invalid verification code. ${verification.maxAttempts - verification.attempts} attempts remaining.`);
      }

      // Verification successful
      this.verifiedEmails.add(verification.email);
      const userData = {
        email: verification.email,
        username: verification.username,
        password: verification.password
      };

      this.pendingVerifications.delete(verificationId);

      return {
        success: true,
        message: 'Email verified successfully',
        userData
      };
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(verificationId) {
    try {
      const verification = this.pendingVerifications.get(verificationId);
      
      if (!verification) {
        throw new Error('Invalid verification ID');
      }

      // Generate new code and extend expiration
      verification.verificationCode = this.generateVerificationCode();
      verification.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      verification.attempts = 0; // Reset attempts

      console.log(`📧 Verification email resent to ${verification.email}`);
      console.log(`🔐 New verification code: ${verification.verificationCode}`);

      // Show in development
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        this.showDevelopmentNotification(verification.email, verification.verificationCode);
      }

      return {
        success: true,
        message: 'Verification email resent successfully',
        expiresAt: verification.expiresAt
      };
    } catch (error) {
      console.error('Error resending verification email:', error);
      throw error;
    }
  }

  /**
   * Check if email is verified
   */
  isEmailVerified(email) {
    return this.verifiedEmails.has(email);
  }

  /**
   * Clean up expired verifications
   */
  cleanup() {
    const now = new Date();
    for (const [id, verification] of this.pendingVerifications.entries()) {
      if (now > verification.expiresAt) {
        this.pendingVerifications.delete(id);
      }
    }
  }

  // Helper methods
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateVerificationId() {
    return 'verify_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  showDevelopmentNotification(email, code) {
    // Show verification code in development
    if (typeof window !== 'undefined') {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4ade80;
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        max-width: 300px;
        font-family: system-ui;
      `;
      notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px;">📧 Verification Email Sent</div>
        <div style="font-size: 14px; margin-bottom: 8px;">To: ${email}</div>
        <div style="font-size: 14px; margin-bottom: 8px;">Code: <strong>${code}</strong></div>
        <div style="font-size: 12px; opacity: 0.9;">This notification only appears in development</div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 10000);
    }
  }
}

// Create singleton instance
const emailValidationService = new EmailValidationService();

// Cleanup expired verifications every 5 minutes
setInterval(() => {
  emailValidationService.cleanup();
}, 5 * 60 * 1000);

export default emailValidationService;