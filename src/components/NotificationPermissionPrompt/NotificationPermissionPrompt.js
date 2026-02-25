import React, { useState, useEffect } from 'react';
import './NotificationPermissionPrompt.css';
import pushNotificationService from '../../services/pushNotificationService';

const NotificationPermissionPrompt = ({ onPermissionGranted, onPermissionDenied }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const checkPermission = async () => {
      // Don't show if already dismissed in this session
      if (isDismissed) return;

      // Don't show if permission already granted or denied
      if (Notification.permission !== 'default') return;

      // Don't show if user dismissed recently (check localStorage)
      const dismissed = localStorage.getItem('notificationPromptDismissed');
      const dismissedTime = localStorage.getItem('notificationPromptDismissedTime');
      
      if (dismissed === 'true' && dismissedTime) {
        const hoursSinceDismissal = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
        
        // Show again after 24 hours
        if (hoursSinceDismissal < 24) {
          return;
        }
      }

      // Wait a few seconds before showing (don't interrupt user immediately)
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Show after 5 seconds
    };

    if (pushNotificationService.isSupported) {
      checkPermission();
    }
  }, [isDismissed]);

  const handleAllow = async () => {
    setIsLoading(true);
    
    try {
      const granted = await pushNotificationService.requestPermission();
      
      if (granted) {
        console.log('✅ Notification permission granted');
        setShowPrompt(false);
        
        // Clear dismissed flag
        localStorage.removeItem('notificationPromptDismissed');
        localStorage.removeItem('notificationPromptDismissedTime');
        
        if (onPermissionGranted) {
          onPermissionGranted();
        }
        
        // Show test notification
        setTimeout(() => {
          pushNotificationService.testNotification(
            'Great! You\'ll now receive message notifications even when the app is closed.'
          );
        }, 500);
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      
      if (error.message.includes('denied')) {
        if (onPermissionDenied) {
          onPermissionDenied();
        }
      }
      
      setShowPrompt(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    
    // Remember dismissal
    localStorage.setItem('notificationPromptDismissed', 'true');
    localStorage.setItem('notificationPromptDismissedTime', Date.now().toString());
  };

  const handleNotNow = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    
    // Remember dismissal for shorter time
    localStorage.setItem('notificationPromptDismissed', 'true');
    localStorage.setItem('notificationPromptDismissedTime', Date.now().toString());
  };

  if (!showPrompt || !pushNotificationService.isSupported) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="notification-prompt-backdrop" onClick={handleNotNow} />
      
      {/* Prompt Card */}
      <div className="notification-permission-prompt">
        <button 
          className="notification-prompt-close"
          onClick={handleDismiss}
          aria-label="Close"
        >
          ✕
        </button>
        
        <div className="notification-prompt-icon">
          🔔
        </div>
        
        <h3 className="notification-prompt-title">
          Stay Connected
        </h3>
        
        <p className="notification-prompt-message">
          Enable notifications to receive instant alerts when you get new messages, 
          even when the app is closed. You can reply directly from notifications!
        </p>
        
        <div className="notification-prompt-features">
          <div className="notification-feature">
            <span className="feature-icon">💬</span>
            <span className="feature-text">Instant message alerts</span>
          </div>
          <div className="notification-feature">
            <span className="feature-icon">⚡</span>
            <span className="feature-text">Quick reply from notification</span>
          </div>
          <div className="notification-feature">
            <span className="feature-icon">🔒</span>
            <span className="feature-text">Privacy protected</span>
          </div>
        </div>
        
        <div className="notification-prompt-actions">
          <button
            className="notification-btn notification-btn-primary"
            onClick={handleAllow}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="btn-spinner" />
                Enabling...
              </>
            ) : (
              '✓ Enable Notifications'
            )}
          </button>
          
          <button
            className="notification-btn notification-btn-secondary"
            onClick={handleNotNow}
            disabled={isLoading}
          >
            Not Now
          </button>
        </div>
        
        <p className="notification-prompt-footer">
          You can change this in your browser settings anytime
        </p>
      </div>
    </>
  );
};

export default NotificationPermissionPrompt;
