import React, { useState, useEffect } from 'react';
import userDataService from '../../services/userDataService';
import './LoginSecurityPrompt.css';

const LoginSecurityPrompt = ({ onEnable2FA, onDismiss, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  const checkIfShouldShow = async () => {
    try {
      // Check if user has 2FA enabled
      const response = await userDataService.api.getTwoFactorStatus();
      setTwoFactorEnabled(response.enabled);
      
      // Only show if 2FA is not enabled
      if (!response.enabled) {
        // Check if user has dismissed this prompt recently
        const lastDismissed = localStorage.getItem('login-security-prompt-dismissed');
        if (!lastDismissed) {
          setVisible(true);
        } else {
          const dismissedDate = new Date(lastDismissed);
          const now = new Date();
          
          // Show again after 30 days
          if (now.getTime() - dismissedDate.getTime() > 30 * 24 * 60 * 60 * 1000) {
            setVisible(true);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
      // Show prompt by default if we can't check
      setVisible(true);
    }
  };

  const handleEnable = () => {
    if (onEnable2FA) {
      onEnable2FA();
    }
    handleClose();
  };

  const handleDismiss = () => {
    const now = new Date();
    localStorage.setItem('login-security-prompt-dismissed', now.toISOString());
    
    if (onDismiss) {
      onDismiss();
    }
    handleClose();
  };

  const handleClose = () => {
    setVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!visible || twoFactorEnabled) {
    return null;
  }

  return (
    <div className="login-security-prompt-overlay">
      <div className="login-security-prompt">
        <div className="prompt-header">
          <div className="security-icon">🛡️</div>
          <h2>Secure Your Account</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        <div className="prompt-content">
          <div className="welcome-message">
            <h3>Welcome back!</h3>
            <p>Take a moment to strengthen your account security</p>
          </div>
          
          <div className="security-recommendation">
            <div className="recommendation-icon">🔐</div>
            <div className="recommendation-content">
              <h4>Enable Two-Factor Authentication</h4>
              <p>
                Protect your account with an extra layer of security. 
                Even if someone gets your password, they won't be able to access your account.
              </p>
            </div>
          </div>
          
          <div className="benefits-grid">
            <div className="benefit-item">
              <span className="benefit-icon">⚡</span>
              <div className="benefit-text">
                <strong>Quick Setup</strong>
                <span>Takes less than 2 minutes</span>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">📱</span>
              <div className="benefit-text">
                <strong>Works Everywhere</strong>
                <span>Compatible with popular apps</span>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🔑</span>
              <div className="benefit-text">
                <strong>Backup Codes</strong>
                <span>Never get locked out</span>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🛡️</span>
              <div className="benefit-text">
                <strong>99.9% Effective</strong>
                <span>Blocks automated attacks</span>
              </div>
            </div>
          </div>
          
          <div className="security-stats">
            <div className="stat-item">
              <div className="stat-number">81%</div>
              <div className="stat-label">of data breaches involve weak passwords</div>
            </div>
            <div className="stat-divider">|</div>
            <div className="stat-item">
              <div className="stat-number">99%</div>
              <div className="stat-label">protection with 2FA enabled</div>
            </div>
          </div>
        </div>
        
        <div className="prompt-actions">
          <button className="enable-btn primary" onClick={handleEnable}>
            <span className="btn-icon">🚀</span>
            Enable 2FA Now
          </button>
          <button className="dismiss-btn" onClick={handleDismiss}>
            Maybe Later
          </button>
        </div>
        
        <div className="prompt-footer">
          <p>This is a one-time prompt to help secure your account</p>
        </div>
      </div>
    </div>
  );
};

export default LoginSecurityPrompt;