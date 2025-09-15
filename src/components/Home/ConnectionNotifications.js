import React, { useState, useEffect } from 'react';
import './ConnectionNotifications.css';

const ConnectionNotifications = ({ 
  isConnected, 
  connectionQuality, 
  queueStatus,
  onRetryConnection,
  onClearQueue 
}) => {
  const [notifications, setNotifications] = useState([]);
  const [lastConnectionState, setLastConnectionState] = useState(isConnected);
  const [showQueueStatus, setShowQueueStatus] = useState(false);

  // Show connection status notifications
  useEffect(() => {
    if (isConnected !== lastConnectionState) {
      const notification = {
        id: Date.now(),
        type: isConnected ? 'success' : 'error',
        title: isConnected ? 'Connected' : 'Connection Lost',
        message: isConnected 
          ? 'You are back online. Messages will be synced.'
          : 'You are now offline. Messages will be queued until connection is restored.',
        duration: isConnected ? 3000 : 5000
      };
      
      addNotification(notification);
      setLastConnectionState(isConnected);
    }
  }, [isConnected, lastConnectionState]);

  // Show queue processing notifications
  useEffect(() => {
    if (queueStatus.total > 0 && !isConnected) {
      setShowQueueStatus(true);
    } else if (queueStatus.total === 0) {
      setShowQueueStatus(false);
    }
  }, [queueStatus.total, isConnected]);

  // Show quality degradation warnings
  useEffect(() => {
    if (isConnected && connectionQuality === 'poor') {
      const notification = {
        id: Date.now(),
        type: 'warning',
        title: 'Poor Connection',
        message: 'Your connection quality is poor. Messages may be delayed.',
        duration: 4000
      };
      
      addNotification(notification);
    }
  }, [connectionQuality, isConnected]);

  const addNotification = (notification) => {
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification after duration
    setTimeout(() => {
      removeNotification(notification.id);
    }, notification.duration);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getQueueStatusIcon = () => {
    if (queueStatus.processing) {
      return (
        <div className="queue-spinner">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="32" strokeDashoffset="32">
              <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" values="0 12 12;360 12 12"/>
            </circle>
          </svg>
        </div>
      );
    }
    
    return (
      <div className="queue-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
          <path d="M7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H13V17H7V15Z"/>
        </svg>
      </div>
    );
  };

  return (
    <>
      {/* Connection Status Notifications */}
      <div className="connection-notifications">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`connection-notification ${notification.type}`}
          >
            <div className="notification-icon">
              {notification.type === 'success' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
              {notification.type === 'error' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              )}
              {notification.type === 'warning' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
              )}
            </div>
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
            </div>
            <button 
              className="notification-close"
              onClick={() => removeNotification(notification.id)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Message Queue Status */}
      {showQueueStatus && (
        <div className="message-queue-status">
          <div className="queue-status-content">
            {getQueueStatusIcon()}
            <div className="queue-status-text">
              <div className="queue-status-title">
                {queueStatus.processing ? 'Sending Messages...' : 'Messages Queued'}
              </div>
              <div className="queue-status-subtitle">
                {queueStatus.processing 
                  ? `Sending ${queueStatus.sending} of ${queueStatus.total} messages`
                  : `${queueStatus.total} message${queueStatus.total === 1 ? '' : 's'} waiting to send`
                }
              </div>
            </div>
            
            {!queueStatus.processing && (
              <div className="queue-actions">
                <button 
                  className="queue-action-btn retry-btn"
                  onClick={onRetryConnection}
                  title="Retry connection"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                </button>
                <button 
                  className="queue-action-btn clear-btn"
                  onClick={onClearQueue}
                  title="Clear queue"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {queueStatus.processing && (
            <div className="queue-progress-bar">
              <div 
                className="queue-progress-fill"
                style={{
                  width: `${((queueStatus.total - queueStatus.queued) / queueStatus.total) * 100}%`
                }}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ConnectionNotifications;
