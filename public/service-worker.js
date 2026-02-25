// Service Worker for offline notifications and background sync
const CACHE_NAME = 'quibish-v1';
const API_URL = 'http://localhost:5001/api';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'New Message',
    body: 'You have a new message on Quibish',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'quibish-message',
    requireInteraction: false
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || `New message from ${data.sender}`,
        body: data.body || data.message,
        icon: data.icon || '/logo192.png',
        badge: '/logo192.png',
        data: {
          url: data.url || '/quibish',
          messageId: data.messageId
        },
        tag: `quibish-${data.messageId || Date.now()}`,
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Open' },
          { action: 'close', title: 'Close' }
        ]
      };
    } catch (error) {
      console.error('Error parsing push notification data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/quibish';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes('/quibish') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for queued messages
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncQueuedMessages());
  }
});

// Sync queued messages
async function syncQueuedMessages() {
  try {
    // Get auth token from IndexedDB or localStorage via message
    const token = await getAuthToken();
    
    if (!token) {
      console.log('No auth token available for sync');
      return;
    }

    const response = await fetch(`${API_URL}/offline-notifications/queued`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Synced queued messages:', data.count);
      
      // Notify all clients about new messages
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'MESSAGES_SYNCED',
          count: data.count,
          messages: data.messages
        });
      });
    }
  } catch (error) {
    console.error('Error syncing queued messages:', error);
  }
}

// Get auth token from client
async function getAuthToken() {
  const clients = await self.clients.matchAll();
  
  if (clients.length > 0) {
    // Request token from first available client
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.token);
      };
      
      clients[0].postMessage({ type: 'GET_AUTH_TOKEN' }, [messageChannel.port2]);
    });
  }
  
  return null;
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic background sync:', event.tag);
  
  if (event.tag === 'sync-messages-periodic') {
    event.waitUntil(syncQueuedMessages());
  }
});

// Message from clients
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'SYNC_NOW') {
    syncQueuedMessages();
  }
});
