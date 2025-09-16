import React, { useState, useEffect } from 'react';
import './ConnectionStatus.css';

const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show initial status if offline
    if (!navigator.onLine) {
      setShowStatus(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showStatus) return null;

  return (
    <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
      <div className="status-content">
        <span className="status-icon">
          {isOnline ? '🟢' : '🔴'}
        </span>
        <span className="status-text">
          {isOnline ? 'Back online' : 'No internet connection'}
        </span>
      </div>
    </div>
  );
};

export default ConnectionStatus;