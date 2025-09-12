/**
 * Quibish Service Worker
 * Provides offline functionality, caching, and background sync
 */

const CACHE_NAME = 'quibish-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// API routes that should be cached
const API_CACHE_PATTERNS = [
  /^https?:\/\/localhost:5001\/api\/users\/profile/,
  /^https?:\/\/localhost:5001\/api\/messages/,
  /^https?:\/\/localhost:5001\/api\/ping/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => {
          // Handle relative URLs for GitHub Pages
          return url.startsWith('/') ? url : `/${url}`;
        }));
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        // Take control of all pages
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests and chrome-extension requests
  if (!url.origin.includes(location.origin) && !url.origin.includes('localhost')) {
    return;
  }
  
  // Handle API requests
  if (isApiRequest(request.url)) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // Handle static assets
  if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // Default: network first, then cache
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Check if URL is an API request
function isApiRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

// Check if URL is a static asset
function isStaticAsset(url) {
  return url.includes('/static/') || 
         url.includes('/images/') || 
         url.includes('/assets/') ||
         url.includes('.css') ||
         url.includes('.js') ||
         url.includes('.png') ||
         url.includes('.jpg') ||
         url.includes('.ico');
}

// Handle API requests - Network first, then cache
async function handleApiRequest(request) {
  const cacheName = `${CACHE_NAME}-api`;
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network failed for API request, trying cache:', request.url);
    
    // Try cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return a custom offline response for API requests
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Offline - request will be retried when connection is restored',
        offline: true 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network failed for navigation, serving from cache');
    
    // Try to serve the main app from cache
    const cachedResponse = await caches.match('/');
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page if available
    return caches.match(OFFLINE_URL) || new Response('Offline', { status: 200 });
  }
}

// Handle static assets - Cache first, then network
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache the response
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('❌ Failed to fetch static asset:', request.url);
    return new Response('Not found', { status: 404 });
  }
}

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    default:
      console.log('🔔 Unknown message type:', type);
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-profile') {
    event.waitUntil(syncProfile());
  } else if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Sync profile data when back online
async function syncProfile() {
  try {
    // Get pending profile updates from IndexedDB or localStorage
    const pendingUpdates = localStorage.getItem('pendingProfileUpdates');
    
    if (pendingUpdates) {
      const updates = JSON.parse(pendingUpdates);
      
      for (const update of updates) {
        try {
          await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${update.token}`
            },
            body: JSON.stringify(update.data)
          });
          
          console.log('✅ Synced profile update:', update.id);
        } catch (error) {
          console.error('❌ Failed to sync profile update:', error);
        }
      }
      
      // Clear pending updates
      localStorage.removeItem('pendingProfileUpdates');
    }
  } catch (error) {
    console.error('❌ Background sync failed for profile:', error);
  }
}

// Sync messages when back online
async function syncMessages() {
  try {
    // Similar implementation for syncing messages
    console.log('🔄 Syncing pending messages...');
  } catch (error) {
    console.error('❌ Background sync failed for messages:', error);
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  if (action) {
    // Handle notification actions
    event.waitUntil(handleNotificationAction(action, data));
  } else {
    // Handle simple notification click
    event.waitUntil(handleNotificationClick(data));
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔔 Notification closed:', event);
  
  // Send message to main thread
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'notification-close',
        data: event.notification.data
      });
    });
  });
});

// Handle notification actions
function handleNotificationAction(action, data) {
  console.log('🔔 Notification action:', action, data);
  
  // Send message to main thread
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'notification-action',
        data: { action, notificationData: data }
      });
    });
  });
  
  // Open app window based on action
  const urlToOpen = getUrlForAction(action, data);
  
  return self.clients.matchAll({ type: 'window' }).then(clients => {
    // Check if app is already open
    for (const client of clients) {
      if (client.url.includes(self.location.origin)) {
        client.focus();
        client.navigate(urlToOpen);
        return client;
      }
    }
    
    // Open new window if app is not open
    return self.clients.openWindow(urlToOpen);
  });
}

// Handle simple notification click
function handleNotificationClick(data) {
  console.log('🔔 Simple notification click:', data);
  
  // Send message to main thread
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'notification-click',
        data: data
      });
    });
  });
  
  const urlToOpen = data.url || '/';
  
  return self.clients.matchAll({ type: 'window' }).then(clients => {
    // Check if app is already open
    for (const client of clients) {
      if (client.url.includes(self.location.origin)) {
        client.focus();
        client.navigate(urlToOpen);
        return client;
      }
    }
    
    // Open new window if app is not open
    return self.clients.openWindow(urlToOpen);
  });
}

// Get URL for specific action
function getUrlForAction(action, data) {
  const baseUrl = self.location.origin;
  
  switch (action) {
    case 'reply':
      return `${baseUrl}/?conversation=${data.conversationId}&action=reply`;
    case 'mark-read':
      return `${baseUrl}/?conversation=${data.conversationId}`;
    case 'answer':
      return `${baseUrl}/?call=${data.callId}&action=answer`;
    case 'decline':
      return `${baseUrl}/?call=${data.callId}&action=decline`;
    default:
      return data.url || baseUrl;
  }
}

// Handle push messages
self.addEventListener('push', (event) => {
  console.log('📨 Push message received:', event);
  
  if (!event.data) {
    console.log('📨 Push message has no data');
    return;
  }
  
  try {
    const data = event.data.json();
    console.log('📨 Push data:', data);
    
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/logo192.png',
      badge: data.badge || '/logo192.png',
      tag: data.tag || 'default',
      data: data.data || {},
      vibrate: data.vibrate || [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      timestamp: Date.now()
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Quibish', options)
    );
  } catch (error) {
    console.error('❌ Failed to process push message:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Quibish', {
        body: 'You have a new notification',
        icon: '/logo192.png',
        badge: '/logo192.png'
      })
    );
  }
});

console.log('🚀 Quibish Service Worker loaded and ready!');