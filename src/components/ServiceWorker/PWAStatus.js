import React, { useState, useEffect } from 'react';
import swManager from '../../utils/serviceWorkerManager';
import './PWAStatus.css';

const PWAStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swStatus, setSwStatus] = useState('checking');
  const [cacheStatus, setCacheStatus] = useState({});
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

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
    <div 
      className={`pwa-status-indicator ${isMinimized ? 'minimized' : ''}`}
      onClick={() => setIsMinimized(!isMinimized)}
      title={isMinimized ? 'Click to expand PWA status' : 'Click to minimize PWA status'}
    >
      {isMinimized ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontSize: '8px' }}>📱</span>
        </div>
      ) : (
        <>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            lineHeight: '1.2'
          }}>
            <span style={{ fontSize: '8px' }}>🌐</span>
            <span>{isOnline ? 'On' : 'Off'}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            lineHeight: '1.2'
          }}>
            <span style={{ fontSize: '8px' }}>⚙️</span>
            <span>SW: {swStatus === 'checking' ? 'chk' : swStatus.slice(0, 3)}</span>
          </div>
        </>
      )}
      
      {!isMinimized && Object.keys(cacheStatus).length > 0 && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          lineHeight: '1.2'
        }}>
          <span style={{ fontSize: '8px' }}>💾</span>
          <span>{Object.keys(cacheStatus).length}</span>
        </div>
      )}
      
      {!isMinimized && updateAvailable && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleUpdate();
          }}
          style={{
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            padding: '2px 4px',
            borderRadius: '3px',
            fontSize: '9px',
            cursor: 'pointer',
            marginTop: '3px',
            width: '100%'
          }}
        >
          Update
        </button>
      )}
      
      {!isMinimized && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleClearCache();
          }}
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '1px 4px',
            borderRadius: '3px',
            fontSize: '8px',
            cursor: 'pointer',
            marginTop: '2px',
            width: '100%'
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default PWAStatus;