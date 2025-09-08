import React, { useState, useEffect } from 'react';
import userDataService from '../../services/userDataService';
import './TwoFactorPromotionBanner.css';

const TwoFactorPromotionBanner = ({ onEnable2FA, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    checkTwoFactorStatus();
    checkDismissalStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const response = await userDataService.api.getTwoFactorStatus();
      setTwoFactorEnabled(response.enabled);
      
      // Only show banner if 2FA is not enabled
      if (!response.enabled) {
        setVisible(true);
      }
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
      // Show banner by default if we can't check status
      setVisible(true);
    }
  };

  const checkDismissalStatus = () => {
    const dismissedUntil = localStorage.getItem('2fa-banner-dismissed');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      const now = new Date();
      
      // Show banner again after 7 days
      if (now.getTime() - dismissedDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        setVisible(false);
      }
    }
  };

  const handleDismiss = (duration = '7d') => {
    const now = new Date();
    let dismissUntil;
    
    switch (duration) {
      case '1d':
        dismissUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dismissUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dismissUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dismissUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    
    localStorage.setItem('2fa-banner-dismissed', dismissUntil.toISOString());
    setDismissed(true);
    setVisible(false);
    
    if (onDismiss) {
      onDismiss(duration);
    }
  };

  const handleEnable = () => {
    if (onEnable2FA) {
      onEnable2FA();
    }
    // Hide banner when user starts 2FA setup
    setVisible(false);
  };

  if (!visible || dismissed || twoFactorEnabled) {
    return null;
  }

  return (
    <div className="two-factor-promotion-banner">
      <div className="banner-content">
        <div className="banner-icon">
          🛡️
        </div>
        <div className="banner-text">
          <div className="banner-title">Secure Your Account</div>
          <div className="banner-description">
            Enable two-factor authentication to protect your account from unauthorized access
          </div>
        </div>
        <div className="banner-actions">
          <button className="enable-btn" onClick={handleEnable}>
            Enable 2FA
          </button>
          <div className="dismiss-dropdown">
            <button className="dismiss-btn" onClick={() => handleDismiss('7d')}>
              ×
            </button>
            <div className="dismiss-options">
              <button onClick={() => handleDismiss('1d')}>Remind me tomorrow</button>
              <button onClick={() => handleDismiss('7d')}>Remind me in a week</button>
              <button onClick={() => handleDismiss('30d')}>Remind me in a month</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorPromotionBanner;