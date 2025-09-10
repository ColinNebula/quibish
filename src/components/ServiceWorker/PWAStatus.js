import React, { useState, useEffect } from 'react';
import swManager from '../../utils/serviceWorkerManager';

const PWAStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swStatus, setSwStatus] = useState('checking');
  const [cacheStatus, setCacheStatus] = useState({});
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service Worker event listeners
    swManager.on('onInstall', () => {
      setSwStatus('installed');
      console.log('✅ PWA: Service Worker installed');
    });

    swManager.on('onActivate', () => {
      setSwStatus('active');
      console.log('✅ PWA: Service Worker activated');
    });

    swManager.on('onUpdate', () => {
      setUpdateAvailable(true);
      console.log('🔄 PWA: Update available');
    });

    swManager.on('onCacheUpdate', (cacheInfo) => {
      setCacheStatus(cacheInfo);
      console.log('💾 PWA: Cache updated', cacheInfo);
    });

    // Check initial service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setSwStatus('ready');
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpdate = () => {
    swManager.updateServiceWorker();
    setUpdateAvailable(false);
  };

  const handleClearCache = async () => {
    try {
      await swManager.clearCache();
      setCacheStatus({});
      console.log('🗑️ PWA: Cache cleared');
    } catch (error) {
      console.error('❌ PWA: Failed to clear cache', error);
    }
  };

  // Only show in development or when user explicitly requests PWA info
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      backdropFilter: 'blur(10px)',
      maxWidth: '200px'
    }}>
      <div>🌐 {isOnline ? 'Online' : 'Offline'}</div>
      <div>⚙️ SW: {swStatus}</div>
      
      {Object.keys(cacheStatus).length > 0 && (
        <div>💾 Cache: {Object.keys(cacheStatus).length} items</div>
      )}
      
      {updateAvailable && (
        <button 
          onClick={handleUpdate}
          style={{
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer',
            marginTop: '4px',
            width: '100%'
          }}
        >
          Update App
        </button>
      )}
      
      <button 
        onClick={handleClearCache}
        style={{
          background: '#dc2626',
          color: 'white',
          border: 'none',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          cursor: 'pointer',
          marginTop: '4px',
          width: '100%'
        }}
      >
        Clear Cache
      </button>
    </div>
  );
};

export default PWAStatus;