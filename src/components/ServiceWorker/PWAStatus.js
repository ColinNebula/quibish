import React, { useState, useEffect, useCallback } from 'react';
import './PWAStatus.css';

const PWAStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // SW broadcasts SW_UPDATED when a new version activates
    const handleSwMsg = (e) => {
      if (e.data?.type === 'SW_UPDATED') setUpdateReady(true);
    };
    // Legacy fallback: controllerchange fires when waiting SW takes over
    const handleChange = () => setUpdateReady(true);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message',          handleSwMsg);
      navigator.serviceWorker.addEventListener('controllerchange', handleChange);
    }

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message',          handleSwMsg);
        navigator.serviceWorker.removeEventListener('controllerchange', handleChange);
      }
    };
  }, []);

  const handleUpdate = useCallback(() => {
    setReloading(true);
    navigator.serviceWorker?.controller?.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(() => window.location.reload(), 400);
  }, []);

  if (!isOnline) {
    return (
      <div className="pwa-banner pwa-banner--offline" role="status" aria-live="polite">
        <span className="pwa-banner__icon" aria-hidden="true">📡</span>
        <span className="pwa-banner__text">You're offline — some features may be limited</span>
      </div>
    );
  }

  if (updateReady) {
    return (
      <div className="pwa-banner pwa-banner--update" role="status" aria-live="polite">
        <span className="pwa-banner__icon" aria-hidden="true">✨</span>
        <span className="pwa-banner__text">A new version is ready</span>
        <button
          className="pwa-banner__action"
          onClick={handleUpdate}
          disabled={reloading}
        >
          {reloading ? 'Reloading…' : 'Update now'}
        </button>
        <button
          className="pwa-banner__dismiss"
          onClick={() => setUpdateReady(false)}
          aria-label="Dismiss update banner"
        >✕</button>
      </div>
    );
  }

  return null;
};

export default PWAStatus;