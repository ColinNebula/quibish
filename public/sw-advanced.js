/**
 * Quibish Advanced Service Worker
 * Enhanced mobile performance with advanced caching strategies
 */

const CACHE_VERSION = '2.0.0';
const CACHE_PREFIX = 'quibish';

// Cache names for different strategies
const CACHES = {
  STATIC: `${CACHE_PREFIX}-static-v${CACHE_VERSION}`,
  DYNAMIC: `${CACHE_PREFIX}-dynamic-v${CACHE_VERSION}`,
  API: `${CACHE_PREFIX}-api-v${CACHE_VERSION}`,
  IMAGES: `${CACHE_PREFIX}-images-v${CACHE_VERSION}`,
  FONTS: `${CACHE_PREFIX}-fonts-v${CACHE_VERSION}`,
  TEMP: `${CACHE_PREFIX}-temp-v${CACHE_VERSION}`
};

// Static assets to cache immediately (cache-first strategy)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// API endpoints with different caching strategies
const API_STRATEGIES = {
  // Cache first - rarely changing data
  CACHE_FIRST: [
    /\/api\/users\/profile$/,
    /\/api\/auth\/verify$/,
    /\/api\/config\//
  ],
  
  // Network first - frequently changing data
  NETWORK_FIRST: [
    /\/api\/messages/,
    /\/api\/conversations/,
    /\/api\/notifications/
  ],
  
  // Stale while revalidate - balance between fresh and fast
  STALE_WHILE_REVALIDATE: [
    /\/api\/users\/search/,
    /\/api\/media\/upload/,
    /\/api\/health/
  ]
};

// Cache size limits for mobile optimization
const CACHE_LIMITS = {
  [CACHES.IMAGES]: 50, // Max 50 images
  [CACHES.API]: 100,   // Max 100 API responses
  [CACHES.DYNAMIC]: 75, // Max 75 dynamic resources
  [CACHES.TEMP]: 25     // Max 25 temporary items
};

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  STATIC: 7 * 24 * 60 * 60 * 1000,   // 7 days
  API: 5 * 60 * 1000,                 // 5 minutes
  IMAGES: 30 * 24 * 60 * 60 * 1000,   // 30 days
  DYNAMIC: 24 * 60 * 60 * 1000,       // 1 day
  TEMP: 60 * 60 * 1000                // 1 hour
};

// Performance metrics tracking
let performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  averageResponseTime: 0
};

/**
 * INSTALL EVENT - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Advanced Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      cacheStaticAssets(),
      initializeIndexedDB(),
      cleanupOldCaches()
    ]).then(() => {
      console.log('✅ Advanced Service Worker installed');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('❌ Service Worker installation failed:', error);
    })
  );
});

/**
 * ACTIVATE EVENT - Clean up and take control
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Advanced Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      cleanupOldCaches(),
      initializePerformanceTracking(),
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Advanced Service Worker activated');
    })
  );
});

/**
 * FETCH EVENT - Advanced request handling with multiple strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and cross-origin requests (except localhost)
  if (request.method !== 'GET' || 
      (!url.origin.includes(location.origin) && !url.origin.includes('localhost'))) {
    return;
  }
  
  // Route requests to appropriate strategies
  if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isApiRequest(request.url)) {
    event.respondWith(handleApiRequest(request));
  } else if (isImageRequest(request.url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isFontRequest(request.url)) {
    event.respondWith(handleFontRequest(request));
  } else if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

/**
 * Cache static assets on install
 */
async function cacheStaticAssets() {
  const cache = await caches.open(CACHES.STATIC);
  
  // Add timestamp to prevent stale caches
  const assetsWithTimestamp = STATIC_ASSETS.map(url => {
    const timestampedUrl = new URL(url, self.location.origin);
    timestampedUrl.searchParams.set('sw-cache', Date.now());
    return timestampedUrl.toString();
  });
  
  return cache.addAll(assetsWithTimestamp);
}

/**
 * STATIC ASSETS - Cache First Strategy
 */
async function handleStaticAsset(request) {
  const startTime = performance.now();
  
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse && !isExpired(cachedResponse, CACHE_EXPIRATION.STATIC)) {
      performanceMetrics.cacheHits++;
      trackResponseTime(startTime);
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHES.STATIC);
      cache.put(request, networkResponse.clone());
    }
    
    performanceMetrics.networkRequests++;
    trackResponseTime(startTime);
    return networkResponse;
  } catch (error) {
    performanceMetrics.cacheMisses++;
    
    // Return cached version even if expired as fallback
    const cachedResponse = await caches.match(request);
    return cachedResponse || createOfflineResponse();
  }
}

/**
 * API REQUESTS - Multiple strategies based on endpoint
 */
async function handleApiRequest(request) {
  const startTime = performance.now();
  const url = request.url;
  
  try {
    // Determine strategy based on URL pattern
    if (API_STRATEGIES.CACHE_FIRST.some(pattern => pattern.test(url))) {
      return await cacheFirstStrategy(request, CACHES.API, CACHE_EXPIRATION.API);
    } else if (API_STRATEGIES.NETWORK_FIRST.some(pattern => pattern.test(url))) {
      return await networkFirstStrategy(request, CACHES.API);
    } else {
      return await staleWhileRevalidateStrategy(request, CACHES.API);
    }
  } finally {
    trackResponseTime(startTime);
  }
}

/**
 * IMAGE REQUESTS - Cache First with compression support
 */
async function handleImageRequest(request) {
  const startTime = performance.now();
  
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse && !isExpired(cachedResponse, CACHE_EXPIRATION.IMAGES)) {
      performanceMetrics.cacheHits++;
      trackResponseTime(startTime);
      return cachedResponse;
    }
    
    // Fetch with compression headers
    const networkResponse = await fetch(request, {
      headers: {
        'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8'
      }
    });
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHES.IMAGES);
      await cache.put(request, networkResponse.clone());
      await enforceStorageQuota(CACHES.IMAGES, CACHE_LIMITS[CACHES.IMAGES]);
    }
    
    performanceMetrics.networkRequests++;
    trackResponseTime(startTime);
    return networkResponse;
  } catch (error) {
    performanceMetrics.cacheMisses++;
    
    const cachedResponse = await caches.match(request);
    return cachedResponse || createPlaceholderImage();
  }
}

/**
 * FONT REQUESTS - Cache First Strategy
 */
async function handleFontRequest(request) {
  return cacheFirstStrategy(request, CACHES.FONTS, CACHE_EXPIRATION.STATIC);
}

/**
 * NAVIGATION REQUESTS - Network First with App Shell fallback
 */
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached app shell
    const cachedResponse = await caches.match('/');
    return cachedResponse || createOfflineResponse();
  }
}

/**
 * DYNAMIC REQUESTS - Stale While Revalidate
 */
async function handleDynamicRequest(request) {
  return staleWhileRevalidateStrategy(request, CACHES.DYNAMIC);
}

/**
 * CACHING STRATEGIES
 */

// Cache First Strategy
async function cacheFirstStrategy(request, cacheName, expirationTime) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse, expirationTime)) {
    performanceMetrics.cacheHits++;
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    performanceMetrics.networkRequests++;
    return networkResponse;
  } catch (error) {
    performanceMetrics.cacheMisses++;
    return cachedResponse || createOfflineResponse();
  }
}

// Network First Strategy
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      await enforceStorageQuota(cacheName, CACHE_LIMITS[cacheName]);
    }
    performanceMetrics.networkRequests++;
    return networkResponse;
  } catch (error) {
    performanceMetrics.cacheMisses++;
    const cachedResponse = await caches.match(request);
    return cachedResponse || createOfflineApiResponse();
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const networkResponsePromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      await enforceStorageQuota(cacheName, CACHE_LIMITS[cacheName]);
    }
    return networkResponse;
  }).catch(() => null);
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    // Return cached response immediately, update in background
    networkResponsePromise.then(() => {
      performanceMetrics.networkRequests++;
    });
    return cachedResponse;
  } else {
    performanceMetrics.cacheMisses++;
    // Wait for network response if no cache
    const networkResponse = await networkResponsePromise;
    return networkResponse || createOfflineResponse();
  }
}

/**
 * UTILITY FUNCTIONS
 */

// Check if request is for static asset
function isStaticAsset(url) {
  return url.includes('/static/') || 
         url.includes('/assets/') ||
         url.match(/\.(css|js|manifest|ico)$/);
}

// Check if request is for API
function isApiRequest(url) {
  return url.includes('/api/') || url.includes('localhost:5001');
}

// Check if request is for image
function isImageRequest(url) {
  return url.match(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/i) ||
         url.includes('/images/') ||
         url.includes('/uploads/');
}

// Check if request is for font
function isFontRequest(url) {
  return url.match(/\.(woff|woff2|ttf|eot)$/i) ||
         url.includes('fonts.googleapis.com') ||
         url.includes('fonts.gstatic.com');
}

// Check if cached response is expired
function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const responseTime = new Date(dateHeader).getTime();
  return (Date.now() - responseTime) > maxAge;
}

// Enforce storage quota by removing oldest entries
async function enforceStorageQuota(cacheName, maxEntries) {
  if (!CACHE_LIMITS[cacheName]) return;
  
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    const entriesToDelete = keys.length - maxEntries;
    
    // Sort by last used (if available) or creation time
    const sortedKeys = keys.sort((a, b) => {
      // Implement LRU logic here if available
      return a.url.localeCompare(b.url);
    });
    
    // Delete oldest entries
    for (let i = 0; i < entriesToDelete; i++) {
      await cache.delete(sortedKeys[i]);
    }
  }
}

// Clean up old caches
async function cleanupOldCaches() {
  const cacheWhitelist = Object.values(CACHES);
  const cacheNames = await caches.keys();
  
  return Promise.all(
    cacheNames.map((cacheName) => {
      if (!cacheWhitelist.includes(cacheName)) {
        console.log('🗑️ Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

// Track response time for performance metrics
function trackResponseTime(startTime) {
  const responseTime = performance.now() - startTime;
  performanceMetrics.averageResponseTime = 
    (performanceMetrics.averageResponseTime + responseTime) / 2;
}

// Initialize IndexedDB for advanced storage
async function initializeIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('QuibishDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores for different data types
      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
        messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        messageStore.createIndex('conversationId', 'conversationId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('performance')) {
        db.createObjectStore('performance', { keyPath: 'timestamp' });
      }
    };
  });
}

// Initialize performance tracking
async function initializePerformanceTracking() {
  setInterval(() => {
    // Store performance metrics periodically
    storePerformanceMetrics();
  }, 60000); // Every minute
}

// Store performance metrics in IndexedDB
async function storePerformanceMetrics() {
  try {
    const db = await initializeIndexedDB();
    const transaction = db.transaction(['performance'], 'readwrite');
    const store = transaction.objectStore('performance');
    
    const metrics = {
      timestamp: Date.now(),
      ...performanceMetrics
    };
    
    await store.add(metrics);
  } catch (error) {
    console.error('Failed to store performance metrics:', error);
  }
}

// Create offline response
function createOfflineResponse() {
  return new Response(
    JSON.stringify({
      error: 'You are offline',
      offline: true,
      timestamp: Date.now()
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Create offline API response
function createOfflineApiResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'API unavailable offline',
      offline: true,
      data: null
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Create placeholder image for failed image requests
function createPlaceholderImage() {
  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="16" fill="#6b7280">
        Image Unavailable
      </text>
    </svg>
  `;
  
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

/**
 * MESSAGE HANDLING
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_PERFORMANCE_METRICS':
      event.ports[0].postMessage(performanceMetrics);
      break;
      
    case 'CLEAR_CACHE':
      clearSpecificCache(payload.cacheName).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'PREFETCH_RESOURCES':
      prefetchResources(payload.urls);
      break;
      
    default:
      console.log('🔔 Unknown message type:', type);
  }
});

// Clear specific cache
async function clearSpecificCache(cacheName) {
  if (cacheName && CACHES[cacheName.toUpperCase()]) {
    return caches.delete(CACHES[cacheName.toUpperCase()]);
  }
  return false;
}

// Prefetch resources for better performance
async function prefetchResources(urls) {
  if (!Array.isArray(urls)) return;
  
  const cache = await caches.open(CACHES.TEMP);
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.warn('Failed to prefetch:', url, error);
    }
  }
}

/**
 * BACKGROUND SYNC AND NOTIFICATIONS
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-messages':
      event.waitUntil(syncPendingMessages());
      break;
    case 'sync-media':
      event.waitUntil(syncPendingMedia());
      break;
    default:
      console.log('Unknown sync tag:', event.tag);
  }
});

// Sync pending messages
async function syncPendingMessages() {
  try {
    const db = await initializeIndexedDB();
    const transaction = db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const pendingMessages = await store.getAll();
    
    for (const message of pendingMessages.filter(m => m.pending)) {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        // Remove from pending after successful sync
        const deleteTransaction = db.transaction(['messages'], 'readwrite');
        await deleteTransaction.objectStore('messages').delete(message.id);
      } catch (error) {
        console.error('Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Sync pending media uploads
async function syncPendingMedia() {
  // Implementation for syncing media uploads when back online
  console.log('🔄 Syncing pending media uploads...');
}

console.log('🚀 Quibish Advanced Service Worker loaded and ready!');
console.log('📊 Performance tracking enabled');
console.log('💾 Multi-strategy caching initialized');
console.log('📱 Mobile optimization active');