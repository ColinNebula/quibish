import React, { useState, useEffect } from 'react';
import './EmailVerificationModal.css';
import emailValidationService from '../../services/emailValidationService';

const EmailVerificationModal = ({ 
  isOpen, 
  onClose, 
  verificationId, 
  email, 
  onVerificationSuccess 
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await emailValidationService.verifyEmailCode(verificationId, verificationCode.trim());
      
      if (result.success) {
        onVerificationSuccess(result.userData);
        onClose();
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError('');

    try {
      await emailValidationService.resendVerificationEmail(verificationId);
      setResendCooldown(60); // 1 minute cooldown
      setTimeLeft(900); // Reset timer to 15 minutes
      setVerificationCode(''); // Clear the input
    } catch (error) {
      console.error('Resend error:', error);
      setError(error.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setVerificationCode(value);
      setError(''); // Clear error when user types
    }
  };

  if (!isOpen) return null;

  return (
    <div className="email-verification-overlay">
      <div className="email-verification-modal">
        <div className="email-verification-header">
          <h3>📧 Verify Your Email</h3>
          <button 
            type="button" 
            className="email-verification-close"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="email-verification-content">
          <p className="email-verification-message">
            We've sent a 6-digit verification code to:
          </p>
          <p className="email-verification-email">{email}</p>
          
          {timeLeft > 0 ? (
            <p className="email-verification-timer">
              Code expires in: <span className="timer-highlight">{formatTime(timeLeft)}</span>
            </p>
          ) : (
            <p className="email-verification-expired">
              ⚠️ Verification code has expired. Please resend to get a new code.
            </p>
          )}

          <form onSubmit={handleVerificationSubmit} className="email-verification-form">
            <div className="verification-code-input-container">
              <label htmlFor="verificationCode" className="verification-code-label">
                Enter Verification Code
              </label>
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={handleCodeChange}
                placeholder="000000"
                className="verification-code-input"
                maxLength="6"
                disabled={loading || timeLeft <= 0}
                autoFocus
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="email-verification-error">
                ⚠️ {error}
              </div>
            )}

            <div className="email-verification-actions">
              <button
                type="submit"
                className="verify-button"
                disabled={loading || !verificationCode || verificationCode.length !== 6 || timeLeft <= 0}
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>

              <button
                type="button"
                className="resend-button"
                onClick={handleResendEmail}
                disabled={loading || resendCooldown > 0}
              >
                {resendCooldown > 0 
                  ? `Resend in ${resendCooldown}s` 
                  : 'Resend Code'
                }
              </button>
            </div>
          </form>

          <div className="email-verification-help">
            <p>📱 Check your email inbox and spam folder</p>
            <p>🔄 The verification code is valid for 15 minutes</p>
            <p>💡 Didn't receive the email? Try resending or check your email address</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal;