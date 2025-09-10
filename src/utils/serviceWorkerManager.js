/**
 * Service Worker Manager
 * Manages service worker registration, updates, and communication
 */

class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.isUpdateAvailable = false;
    this.callbacks = {
      onUpdate: [],
      onInstall: [],
      onActivate: [],
      onOffline: [],
      onOnline: [],
      onCacheUpdate: []
    };
    
    this.init();
  }

  async init() {
    if (!('serviceWorker' in navigator)) {
      console.log('📱 Service Worker not supported');
      return;
    }

    // In development, skip service worker registration to avoid MIME type issues
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Skipping Service Worker in development mode');
      return;
    }

    return this.register('/sw.js');
  }

  // Register service worker
  async register(swPath = '/sw.js') {
    if (!('serviceWorker' in navigator)) {
      console.log('📱 Service Worker not supported');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register(swPath);
      console.log('✅ Service Worker registered:', this.registration);

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdate();
      });

      // Listen for controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      // Check for existing service worker
      if (navigator.serviceWorker.controller) {
        console.log('📱 Service Worker already controlling the page');
        this.triggerCallbacks('onActivate', this.registration);
      }

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });

      // Monitor online/offline status
      this.setupOnlineOfflineListeners();

      // Trigger install callback
      this.triggerCallbacks('onInstall', this.registration);

      return this.registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      throw error;
    }
  }

  setupOnlineOfflineListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Back online');
      this.triggerCallbacks('onOnline');
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Gone offline');
      this.triggerCallbacks('onOffline');
    });
  }

  handleUpdate() {
    const newWorker = this.registration.installing;
    
    if (newWorker) {
      this.isUpdateAvailable = true;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('🔄 New version available');
          this.triggerCallbacks('onUpdate', newWorker);
        }
      });
    }
  }

  handleMessage(message) {
    console.log('📨 Message from SW:', message);
    
    switch (message.type) {
      case 'CACHE_UPDATED':
        this.triggerCallbacks('onCacheUpdate', message.data);
        break;
      case 'BACKGROUND_SYNC':
        console.log('🔄 Background sync completed:', message.data);
        break;
      default:
        console.log('📨 Unknown message type:', message.type);
    }
  }

  // Register background sync
  async registerBackgroundSync(tag) {
    if (!this.registration || !this.registration.sync) {
      console.log('📱 Background Sync not supported');
      return;
    }

    try {
      await this.registration.sync.register(tag);
      console.log(`✅ Background sync registered: ${tag}`);
    } catch (error) {
      console.error('❌ Background sync registration failed:', error);
    }
  }

  // Sync data when coming back online
  async syncWhenOnline() {
    if (navigator.onLine && this.registration) {
      await this.registerBackgroundSync('profile-sync');
      await this.registerBackgroundSync('message-sync');
    }
  }

  // Update service worker
  async updateServiceWorker() {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // Clear all caches
  async clearCache() {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('🗑️ All caches cleared');
    } catch (error) {
      console.error('❌ Failed to clear caches:', error);
    }
  }

  // Send message to service worker
  async sendMessage(message) {
    if (!navigator.serviceWorker.controller) {
      console.log('📱 No service worker controller');
      return;
    }

    navigator.serviceWorker.controller.postMessage(message);
  }

  // Event system
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    }
  }

  triggerCallbacks(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }

  // Get service worker status
  getStatus() {
    return {
      supported: 'serviceWorker' in navigator,
      registered: !!this.registration,
      updateAvailable: this.isUpdateAvailable,
      online: navigator.onLine,
      controller: !!navigator.serviceWorker.controller
    };
  }
}

// Create global instance
const swManager = new ServiceWorkerManager();

// Utility functions for offline handling
export const offlineUtils = {
  // Store data for offline sync
  storeForSync: (key, data) => {
    try {
      const existing = JSON.parse(localStorage.getItem('pendingSync') || '{}');
      existing[key] = {
        data,
        timestamp: Date.now(),
        retries: 0
      };
      localStorage.setItem('pendingSync', JSON.stringify(existing));
    } catch (error) {
      console.error('❌ Failed to store for sync:', error);
    }
  },

  // Get pending sync data
  getPendingSync: () => {
    try {
      return JSON.parse(localStorage.getItem('pendingSync') || '{}');
    } catch (error) {
      console.error('❌ Failed to get pending sync:', error);
      return {};
    }
  },

  // Clear pending sync data
  clearPendingSync: (key) => {
    try {
      const existing = JSON.parse(localStorage.getItem('pendingSync') || '{}');
      delete existing[key];
      localStorage.setItem('pendingSync', JSON.stringify(existing));
    } catch (error) {
      console.error('❌ Failed to clear pending sync:', error);
    }
  },

  // Check if offline
  isOffline: () => !navigator.onLine
};

export default swManager;