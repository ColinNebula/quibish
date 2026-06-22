import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { initializeAppInsights, trackException, trackEvent } from './services/appInsights';
import './utils/notchDetector';

// Voice recorder diagnostics - only import if explicitly enabled
// Set REACT_APP_AUTO_DIAGNOSTICS=true in .env to enable auto-run
// Or run manually in console: window.runVoiceRecorderDiagnostics()
if (process.env.REACT_APP_ENABLE_DIAGNOSTICS === 'true') {
  import('./test-voice-recorder');
}

initializeAppInsights();

// Global error handler for browser extension errors
window.addEventListener('error', (event) => {
  // Ignore errors from browser extensions (contentScript.js, inpage.js, etc.)
  if (event.filename && (
    event.filename.includes('contentScript.js') ||
    event.filename.includes('chrome-extension://') ||
    event.filename.includes('moz-extension://')
  )) {
    console.warn('🔌 Browser extension error (ignored):', event.message);
    event.preventDefault();
    return true;
  }

  trackException(new Error(event.message || 'window.error'), {
    source: 'window.error',
    filename: event.filename || '',
    lineno: String(event.lineno || ''),
    colno: String(event.colno || '')
  });
});

// Suppress unhandled Promise rejections from browser extensions (e.g. MetaMask inpage.js)
window.addEventListener('unhandledrejection', (event) => {
  const stack = event.reason?.stack || '';
  const message = event.reason?.message || '';
  if (
    stack.includes('chrome-extension://') ||
    stack.includes('moz-extension://') ||
    message.includes('MetaMask') ||
    message.includes('Failed to connect to MetaMask')
  ) {
    console.warn('🔌 Browser extension promise rejection (ignored):', message);
    event.preventDefault();
    return;
  }

  trackException(event.reason || new Error('Unhandled promise rejection'), {
    source: 'window.unhandledrejection',
    message
  });
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

trackEvent('app-rendered');

// ========== PWA SERVICE WORKER REGISTRATION ==========

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // In local development, disable service workers to avoid stale-cache and MIME-type errors.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
        .then(() => {
          console.log('ℹ️ PWA: Service Worker disabled in development');
        })
        .catch((error) => {
          console.warn('⚠️ PWA: Failed to clear development Service Workers:', error);
        });
      return;
    }

    const publicBase = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
    const swUrl = `${publicBase}/sw.js`;
    const scope = publicBase ? `${publicBase}/` : '/';

    navigator.serviceWorker
      .register(swUrl, { scope })
      .then((registration) => {
        console.log('✅ PWA: Service Worker registered', registration.scope);
        
        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 PWA: New Service Worker found');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✨ PWA: New version available!');
              // Notify user about update
              const event = new CustomEvent('pwa-update-available', {
                detail: { registration }
              });
              window.dispatchEvent(event);
            }
          });
        });

        // Enable periodic background sync (check for new messages every 12 hours)
        if ('periodicSync' in registration) {
          registration.periodicSync.register('periodic-sync', {
            minInterval: 12 * 60 * 60 * 1000 // 12 hours
          }).then(() => {
            console.log('✅ PWA: Periodic sync registered');
          }).catch((error) => {
            console.warn('⚠️ PWA: Periodic sync not supported:', error);
          });
        }
      })
      .catch((error) => {
        console.error('❌ PWA: Service Worker registration failed', error);
      });

    // Listen for Service Worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('📨 PWA: Message from Service Worker', event.data);
      
      if (event.data.type === 'SW_UPDATED') {
        console.log('✨ PWA: New version activated', event.data.version);
        // Dispatch event for UI to handle
        window.dispatchEvent(new CustomEvent('pwa-updated', { detail: event.data }));
      }
      
      if (event.data.type === 'MESSAGE_SYNCED') {
        console.log('📤 PWA: Message synced', event.data.messageId);
        window.dispatchEvent(new CustomEvent('message-synced', { detail: event.data }));
      }
      
      if (event.data.type === 'NOTIFICATION_CLICKED') {
        console.log('🔔 PWA: Notification clicked', event.data.data);
        window.dispatchEvent(new CustomEvent('notification-clicked', { detail: event.data.data }));
      }
    });
  });
}

// ========== PWA INSTALL PROMPT ==========
// InstallPrompt component owns beforeinstallprompt interception and prompt flow.

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA: App installed successfully');
  window.dispatchEvent(new CustomEvent('pwa-installed'));
});

// ========== ONLINE/OFFLINE DETECTION ==========

window.addEventListener('online', () => {
  console.log('🌐 PWA: Back online');
  window.dispatchEvent(new CustomEvent('connection-restored'));
  
  // Trigger background sync
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return registration.sync.register('sync-messages');
    }).catch((error) => {
      console.warn('⚠️ PWA: Background sync failed:', error);
    });
  }
});

window.addEventListener('offline', () => {
  console.log('📵 PWA: Offline mode');
  window.dispatchEvent(new CustomEvent('connection-lost'));
});

// ========== PUSH NOTIFICATIONS ==========

// Global function to request notification permission
window.requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('⚠️ PWA: Notifications not supported');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Global function to subscribe to push notifications
window.subscribeToPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // Replace with your VAPID public key
          'YOUR_VAPID_PUBLIC_KEY_HERE'
        )
      });
      
      console.log('✅ PWA: Subscribed to push notifications');
      
      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    }
    
    return subscription;
  } catch (error) {
    console.error('❌ PWA: Push subscription failed:', error);
    return null;
  }
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ========== APP SHORTCUTS ==========

// Handle app shortcuts from manifest
const urlParams = new URLSearchParams(window.location.search);
const action = urlParams.get('action');
const source = urlParams.get('source');

if (action && source === 'shortcut') {
  console.log('🔗 PWA: Shortcut triggered:', action);
  
  // Dispatch event for app to handle
  window.addEventListener('load', () => {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('pwa-shortcut', {
        detail: { action }
      }));
    }, 500);
  });
}

// ========== SHARE TARGET ==========

// Handle shared content
if (urlParams.get('action') === 'share' || window.location.pathname.includes('/share')) {
  console.log('📤 PWA: Share target activated');
  
  window.addEventListener('load', () => {
    // The shared data will be in the POST request
    // Handle it in your app's share handler
    window.dispatchEvent(new CustomEvent('pwa-share-target'));
  });
}

console.log('✅ PWA: Initialization complete');