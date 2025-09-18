const CACHE_NAME = 'quibish-v1.2.0';
const STATIC_CACHE = 'quibish-static-v1.2.0';
const DYNAMIC_CACHE = 'quibish-dynamic-v1.2.0';

// Files to cache immediately (critical resources) - Updated with actual build files
const STATIC_ASSETS = [
  '/',
  '/quibish/',
  '/static/js/main.ed0a2083.js',
  '/static/css/main.6d538ff6.css',
  '/static/js/902.78b0a647.chunk.js',
  '/static/css/902.cee236d7.chunk.css',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Runtime caching strategies
const CACHE_STRATEGIES = {
  // Cache first for static assets
  CACHE_FIRST: 'cache-first',
  // Network first for API calls
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate for dynamic content
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Push notification configuration
const NOTIFICATION_CONFIG = {
  icon: '/logo192.png',
  badge: '/logo192.png',
  vibrate: [100, 50, 100],
  requireInteraction: true,
  actions: [
    {
      action: 'open',
      title: 'Open Chat',
      icon: '/logo192.png'
    },
    {
      action: 'reply',
      title: 'Quick Reply',
      icon: '/logo192.png'
    },
    {
      action: 'dismiss',
      title: 'Dismiss'
    }
  ]
};

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('🔧 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old cache versions
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // API requests - Network first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - Cache first strategy
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      url.pathname.startsWith('/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages - Stale while revalidate
  if (request.destination === 'document') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default - Network first with cache fallback
  event.respondWith(networkFirst(request));
});

// Cache first strategy - for static assets
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return new Response('Offline - resource not available', { status: 503 });
  }
}

// Network first strategy - for API calls
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/') || new Response('Offline', { status: 503 });
    }
    
    return new Response('Offline - resource not available', { status: 503 });
  }
}

// Stale while revalidate strategy - for dynamic content
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Return cached version if network fails
    return cachedResponse;
  });

  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Sync pending messages when back online
async function syncMessages() {
  try {
    // Get pending messages from IndexedDB or localStorage
    const pendingMessages = await getPendingMessages();
    
    for (const message of pendingMessages) {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        // Remove from pending queue
        await removePendingMessage(message.id);
        console.log('✅ Synced message:', message.id);
      } catch (error) {
        console.error('❌ Failed to sync message:', message.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Helper functions for message queue management
async function getPendingMessages() {
  // In a real app, this would use IndexedDB
  return JSON.parse(localStorage.getItem('pendingMessages') || '[]');
}

async function removePendingMessage(messageId) {
  const pending = await getPendingMessages();
  const filtered = pending.filter(msg => msg.id !== messageId);
  localStorage.setItem('pendingMessages', JSON.stringify(filtered));
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📨 Service Worker: Push notification received', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New message in Quibish',
    icon: '/logo192.png',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: event.data ? JSON.parse(event.data.text()) : {},
    actions: [
      {
        action: 'reply',
        title: 'Reply',
        icon: '/icons/reply.png'
      },
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Quibish', options)
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📨 Service Worker: Push received', event);
  
  let notificationData = {
    title: 'New Message',
    body: 'You have a new message in Quibish',
    ...NOTIFICATION_CONFIG
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('📨 Push payload:', payload);
      
      notificationData = {
        title: payload.title || `New message from ${payload.sender}`,
        body: payload.body || payload.message || 'You have a new message',
        icon: payload.senderAvatar || NOTIFICATION_CONFIG.icon,
        badge: NOTIFICATION_CONFIG.badge,
        tag: payload.tag || `message-${payload.messageId}`,
        data: {
          messageId: payload.messageId,
          conversationId: payload.conversationId,
          senderId: payload.senderId,
          timestamp: Date.now()
        },
        actions: NOTIFICATION_CONFIG.actions,
        requireInteraction: true,
        vibrate: NOTIFICATION_CONFIG.vibrate
      };
    } catch (error) {
      console.error('Failed to parse push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('📨 Service Worker: Notification clicked', event);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  
  event.waitUntil(
    (async () => {
      // Get all window clients
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Check if app is already open
      const appClient = clients.find(client => 
        client.url.includes(self.location.origin)
      );

      if (event.action === 'reply') {
        // Handle quick reply
        const replyUrl = `/quibish?action=reply&conversation=${notificationData.conversationId}&message=${notificationData.messageId}`;
        
        if (appClient) {
          appClient.focus();
          appClient.postMessage({
            type: 'QUICK_REPLY',
            conversationId: notificationData.conversationId,
            messageId: notificationData.messageId
          });
        } else {
          await self.clients.openWindow(replyUrl);
        }
      } else if (event.action === 'dismiss') {
        // Just close the notification
        return;
      } else {
        // Default action - open conversation
        const chatUrl = notificationData.conversationId 
          ? `/quibish?conversation=${notificationData.conversationId}`
          : '/quibish';
        
        if (appClient) {
          appClient.focus();
          appClient.postMessage({
            type: 'OPEN_CONVERSATION',
            conversationId: notificationData.conversationId
          });
        } else {
          await self.clients.openWindow(chatUrl);
        }
      }
    })()
  );
});

// Notification close handling
self.addEventListener('notificationclose', (event) => {
  console.log('📨 Service Worker: Notification closed', event);
  
  // Track notification dismissal
  const notificationData = event.notification.data || {};
  
  // Send analytics or track user engagement
  if (notificationData.messageId) {
    fetch('/api/notifications/dismissed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messageId: notificationData.messageId,
        timestamp: Date.now()
      })
    }).catch(error => {
      console.error('Failed to track notification dismissal:', error);
    });
  }
});

// Background sync for offline message notifications
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-message-sync') {
    event.waitUntil(
      syncOfflineMessages()
    );
  }
});

// Sync offline messages and show notifications
async function syncOfflineMessages() {
  try {
    // Fetch unread messages while user was offline
    const response = await fetch('/api/messages/unread', {
      headers: {
        'Authorization': `Bearer ${getStoredToken()}`
      }
    });
    
    if (response.ok) {
      const unreadMessages = await response.json();
      
      // Show notifications for unread messages
      for (const message of unreadMessages) {
        await self.registration.showNotification(
          `New message from ${message.sender}`,
          {
            body: message.text || 'You have a new message',
            icon: message.senderAvatar || NOTIFICATION_CONFIG.icon,
            badge: NOTIFICATION_CONFIG.badge,
            tag: `message-${message.id}`,
            data: {
              messageId: message.id,
              conversationId: message.conversationId,
              senderId: message.senderId
            },
            actions: NOTIFICATION_CONFIG.actions,
            requireInteraction: true
          }
        );
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper function to get stored auth token
function getStoredToken() {
  // This is a simplified approach - in production, you'd want more secure storage
  return new Promise((resolve) => {
    self.clients.matchAll().then(clients => {
      if (clients.length > 0) {
        clients[0].postMessage({ type: 'GET_AUTH_TOKEN' });
        
        // Listen for response
        const messageListener = (event) => {
          if (event.data && event.data.type === 'AUTH_TOKEN_RESPONSE') {
            self.removeEventListener('message', messageListener);
            resolve(event.data.token);
          }
        };
        
        self.addEventListener('message', messageListener);
      } else {
        resolve(null);
      }
    });
  });
}

// Message from main thread
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'AUTH_TOKEN_REQUEST') {
    // This would be handled by the main thread
    event.ports[0].postMessage({ 
      type: 'AUTH_TOKEN_RESPONSE', 
      token: event.data.token 
    });
  }
});

console.log('🚀 Service Worker: Script loaded successfully');