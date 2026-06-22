/**
 * PWA Update Manager - Handle service worker updates gracefully
 */

import React, { useState, useEffect } from 'react';
import './PWAUpdateManager.css';

const PWAUpdateManager = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Listen for update available event
    const handleUpdateAvailable = (event) => {
      console.log('🔄 PWA Update available');
      setUpdateAvailable(true);
      setRegistration(event.detail.registration);
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = () => {
    if (!registration || !registration.waiting) {
      return;
    }

    setInstalling(true);

    // Tell the service worker to skip waiting
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Wait for the new service worker to take control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('✅ PWA: New version activated, reloading...');
      window.location.reload();
    });
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="pwa-update-banner">
      <div className="pwa-update-content">
        <div className="pwa-update-icon">🎉</div>
        <div className="pwa-update-text">
          <h3>New Version Available!</h3>
          <p>A new version of Quibish is ready. Update now to get the latest features.</p>
        </div>
        <div className="pwa-update-actions">
          <button
            className="pwa-update-btn update-btn"
            onClick={handleUpdate}
            disabled={installing}
          >
            {installing ? '⏳ Updating...' : '✨ Update Now'}
          </button>
          <button
            className="pwa-update-btn dismiss-btn"
            onClick={handleDismiss}
            disabled={installing}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdateManager;
