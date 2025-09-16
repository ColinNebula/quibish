import React, { useState, useEffect } from 'react';
import './PWAStatus.css';

const PWAStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!isOnline) {
    return (
      <div className="pwa-status offline">
        <span className="status-icon">📡</span>
        <span className="status-text">Offline Mode</span>
      </div>
    );
  }

  if (updateAvailable) {
    return (
      <div className="pwa-status update-available">
        <span className="status-icon">🔄</span>
        <span className="status-text">Update Available</span>
        <button onClick={handleRefresh} className="refresh-btn">
          Refresh
        </button>
      </div>
    );
  }

  return null;
};

export default PWAStatus;