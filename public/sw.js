const CACHE_NAME = 'quibish-v2.0.0';
const STATIC_CACHE = 'quibish-static-v2.0.0';
const DYNAMIC_CACHE = 'quibish-dynamic-v2.0.0';

// Stable files that always exist at these exact paths.
// Avoid hardcoding content-hashed filenames here — they change every build
// and will cause install() to fail with a 404.
const STATIC_ASSETS = [
  '/quibish/',
  '/quibish/index.html',
  '/quibish/manifest.json',
  '/quibish/favicon.ico',
  '/quibish/logo192.png',
  '/quibish/logo512.png',
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
      .then(async (cache) => {
        console.log('\uD83D\uDD27 Service Worker: Caching app shell');
        // Cache each URL individually — one 404 won't abort the whole install
        await Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn(`[SW] Pre-cache skipped: ${url}`, err))
          )
        );
      })
      .then(() => {
        console.log('\u2705 Service Worker: Installation complete');
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
        return self.clients.claim();
      })
      .then(() => {
        // Notify all open tabs that a new SW version is active
        return self.clients.matchAll({ includeUncontrolled: true }).then(allClients => {
          allClients.forEach(client =>
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME })
          );
        });
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

  // Skip cross-origin requests entirely — let the browser handle them directly.
  // This prevents the service worker from interfering with API calls to a
  // different port (e.g. localhost:5001) or external servers.
  if (url.origin !== self.location.origin) {
    return;
  }

  // API requests (same-origin) - Network first strategy
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
  
  if (event.tag === 'background-index-messages') {
    event.waitUntil(indexMessagesForSearch());
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

// Index messages for fast searching
async function indexMessagesForSearch() {
  try {
    console.log('🔍 Service Worker: Indexing messages for search...');
    
    // Get messages from persistent storage
    const messages = await getMessagesFromStorage();
    
    if (!messages || messages.length === 0) {
      console.log('No messages to index');
      return;
    }
    
    // Open IndexedDB for search index
    const db = await openSearchIndexDB();
    const transaction = db.transaction(['searchIndex'], 'readwrite');
    const store = transaction.objectStore('searchIndex');
    
    // Build search index
    const searchIndex = new Map();
    
    for (const message of messages) {
      if (!message.text) continue;
      
      // Tokenize message text
      const tokens = tokenizeText(message.text);
      
      for (const token of tokens) {
        if (!searchIndex.has(token)) {
          searchIndex.set(token, []);
        }
        searchIndex.get(token).push({
          messageId: message.id,
          conversationId: message.conversationId,
          userId: message.userId,
          timestamp: message.timestamp,
          text: message.text,
          type: message.type || 'text'
        });
      }
    }
    
    // Clear old index
    await store.clear();
    
    // Save new index to IndexedDB
    for (const [term, results] of searchIndex.entries()) {
      await store.add({ term, results });
    }
    
    console.log(`✅ Indexed ${searchIndex.size} unique terms from ${messages.length} messages`);
    
    // Notify clients that indexing is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SEARCH_INDEX_UPDATED',
        termsCount: searchIndex.size,
        messagesCount: messages.length
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to index messages:', error);
  }
}

// Get messages from storage (using messaging to main thread)
async function getMessagesFromStorage() {
  try {
    // Service workers can't access localStorage directly
    // Need to communicate with the main thread
    const clients = await self.clients.matchAll();
    if (clients.length === 0) return [];
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data || []);
      };
      
      clients[0].postMessage({
        type: 'GET_MESSAGES_FOR_INDEXING'
      }, [messageChannel.port2]);
      
      // Timeout after 5 seconds
      setTimeout(() => resolve([]), 5000);
    });
  } catch (error) {
    console.error('Failed to get messages from storage:', error);
    return [];
  }
}

// Open search index database
async function openSearchIndexDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('QuibishSearchDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('searchIndex')) {
        const indexStore = db.createObjectStore('searchIndex', { keyPath: 'term' });
        indexStore.createIndex('term', 'term', { unique: true });
      }
    };
  });
}

// Tokenize text for search indexing
function tokenizeText(text) {
  if (!text) return [];
  
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
    'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 2)
    .filter(token => !stopWords.has(token));
}

// Helper functions for message queue management
async function getPendingMessages() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length === 0) return [];
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data || []);
      };
      
      clients[0].postMessage({
        type: 'GET_PENDING_MESSAGES'
      }, [messageChannel.port2]);
      
      setTimeout(() => resolve([]), 3000);
    });
  } catch (error) {
    console.error('Failed to get pending messages:', error);
    return [];
  }
}

async function removePendingMessage(messageId) {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'REMOVE_PENDING_MESSAGE',
        messageId
      });
    }
  } catch (error) {
    console.error('Failed to remove pending message:', error);
  }
}

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
            type: 'NOTIFICATION_CLICK',
            action: 'reply',
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
            type: 'NOTIFICATION_CLICK',
            action: 'open',
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
  
  // Always respond to messages to prevent channel hanging
  const respondToClient = (data) => {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage(data);
    } else if (event.source) {
      event.source.postMessage(data);
    }
  };
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    respondToClient({ type: 'SKIP_WAITING_RESPONSE', success: true });
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    respondToClient({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'AUTH_TOKEN_REQUEST') {
    respondToClient({ 
      type: 'AUTH_TOKEN_RESPONSE', 
      token: event.data.token 
    });
  }
  
  if (event.data && event.data.type === 'INDEX_MESSAGES') {
    // Trigger background indexing and respond immediately
    indexMessagesForSearch().then(() => {
      console.log('✅ Background indexing completed');
    }).catch((error) => {
      console.error('❌ Background indexing failed:', error);
    });
    respondToClient({ type: 'INDEX_MESSAGES_RESPONSE', success: true });
  }
  
  if (event.data && event.data.type === 'INDEX_NEW_MESSAGE') {
    // Index a single new message and respond immediately
    indexSingleMessage(event.data.message).then(() => {
      console.log('✅ Message indexed');
    }).catch((error) => {
      console.error('❌ Message indexing failed:', error);
    });
    respondToClient({ type: 'INDEX_NEW_MESSAGE_RESPONSE', success: true });
  }
});

// Index a single message (for real-time updates)
async function indexSingleMessage(message) {
  try {
    if (!message || !message.text) return;
    
    const db = await openSearchIndexDB();
    const transaction = db.transaction(['searchIndex'], 'readwrite');
    const store = transaction.objectStore('searchIndex');
    
    const tokens = tokenizeText(message.text);
    
    for (const token of tokens) {
      // Get existing index entry
      const request = store.get(token);
      
      request.onsuccess = () => {
        const indexEntry = request.result || { term: token, results: [] };
        
        // Add new message reference
        indexEntry.results.push({
          messageId: message.id,
          conversationId: message.conversationId,
          userId: message.userId,
          timestamp: message.timestamp,
          text: message.text,
          type: message.type || 'text'
        });
        
        // Update index
        store.put(indexEntry);
      };
    }
    
    console.log('✅ Indexed new message:', message.id);
  } catch (error) {
    console.error('❌ Failed to index message:', error);
  }
}

console.log('🚀 Service Worker: Script loaded successfully');