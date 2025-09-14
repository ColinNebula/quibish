/**
 * Next-Generation PWA Service
 * Advanced PWA features for modern browsers and smartphones
 * Supports: Background sync, web push notifications, file system access, widgets
 */

// Background Sync Manager for offline actions
class BackgroundSyncManager {
  constructor() {
    this.pendingActions = new Map();
    this.syncTags = {
      SEND_MESSAGE: 'send-message',
      UPLOAD_FILE: 'upload-file',
      UPDATE_PROFILE: 'update-profile',
      DELETE_MESSAGE: 'delete-message'
    };
    
    this.init();
  }

  async init() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      console.log('📡 Background sync is supported');
      await this.registerSyncEvents();
    } else {
      console.warn('Background sync not supported, using fallback');
      this.setupFallbackSync();
    }
  }

  // Register sync events with service worker
  async registerSyncEvents() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Listen for sync events
      registration.addEventListener('sync', (event) => {
        console.log('🔄 Background sync event:', event.tag);
        this.handleSyncEvent(event);
      });
      
    } catch (error) {
      console.error('Failed to register sync events:', error);
    }
  }

  // Queue action for background sync
  async queueAction(tag, data) {
    const actionId = `${tag}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store action data
    this.pendingActions.set(actionId, {
      tag,
      data,
      timestamp: Date.now(),
      retries: 0
    });
    
    // Save to IndexedDB for persistence
    await this.saveToStorage(actionId, { tag, data });
    
    // Request background sync
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      console.log(`📤 Queued action for background sync: ${tag}`);
    } catch (error) {
      console.error('Failed to register background sync:', error);
      // Fallback to immediate execution
      this.executeAction(actionId);
    }
    
    return actionId;
  }

  // Handle sync event
  async handleSyncEvent(event) {
    const { tag } = event;
    
    event.waitUntil(this.processSyncTag(tag));
  }

  // Process actions for a specific sync tag
  async processSyncTag(tag) {
    const actions = Array.from(this.pendingActions.values())
      .filter(action => action.tag === tag);
    
    for (const action of actions) {
      try {
        await this.executeAction(action);
        this.pendingActions.delete(action.id);
        await this.removeFromStorage(action.id);
      } catch (error) {
        console.error(`Failed to execute sync action ${action.tag}:`, error);
        action.retries++;
        
        // Remove after 3 failed retries
        if (action.retries >= 3) {
          this.pendingActions.delete(action.id);
          await this.removeFromStorage(action.id);
        }
      }
    }
  }

  // Execute specific action
  async executeAction(action) {
    const { tag, data } = action;
    
    switch (tag) {
      case this.syncTags.SEND_MESSAGE:
        return await this.sendMessage(data);
      case this.syncTags.UPLOAD_FILE:
        return await this.uploadFile(data);
      case this.syncTags.UPDATE_PROFILE:
        return await this.updateProfile(data);
      case this.syncTags.DELETE_MESSAGE:
        return await this.deleteMessage(data);
      default:
        throw new Error(`Unknown sync tag: ${tag}`);
    }
  }

  // Action implementations
  async sendMessage(data) {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status}`);
    }
    
    return response.json();
  }

  async uploadFile(data) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('metadata', JSON.stringify(data.metadata));
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.status}`);
    }
    
    return response.json();
  }

  async updateProfile(data) {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update profile: ${response.status}`);
    }
    
    return response.json();
  }

  async deleteMessage(data) {
    const response = await fetch(`/api/messages/${data.messageId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete message: ${response.status}`);
    }
    
    return response.json();
  }

  // Storage helpers
  async saveToStorage(id, data) {
    try {
      const stored = JSON.parse(localStorage.getItem('pwa-sync-queue') || '{}');
      stored[id] = data;
      localStorage.setItem('pwa-sync-queue', JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to save sync data:', error);
    }
  }

  async removeFromStorage(id) {
    try {
      const stored = JSON.parse(localStorage.getItem('pwa-sync-queue') || '{}');
      delete stored[id];
      localStorage.setItem('pwa-sync-queue', JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to remove sync data:', error);
    }
  }

  // Fallback sync for unsupported browsers
  setupFallbackSync() {
    // Check for pending actions every 30 seconds when online
    setInterval(() => {
      if (navigator.onLine && this.pendingActions.size > 0) {
        this.processPendingActions();
      }
    }, 30000);
    
    // Process actions when coming back online
    window.addEventListener('online', () => {
      this.processPendingActions();
    });
  }

  async processPendingActions() {
    const actions = Array.from(this.pendingActions.values());
    
    for (const action of actions) {
      try {
        await this.executeAction(action);
        this.pendingActions.delete(action.id);
      } catch (error) {
        console.error('Fallback sync failed:', error);
      }
    }
  }
}

// Web Push Notifications Manager
class WebPushManager {
  constructor() {
    this.subscription = null;
    this.publicKey = 'BMxI8oi0XLh8P3J9mHqX9Y2qV3nR8sK7fE4pD2vW1gH6jS8uN9mA5bC7eF0gH2iJ4k'; // Replace with your VAPID public key
    this.isSupported = this.checkSupport();
  }

  checkSupport() {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  // Request permission and subscribe to push notifications
  async subscribe() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.publicKey)
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);
      
      console.log('📱 Push notifications subscribed');
      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      await this.removeSubscriptionFromServer(this.subscription);
      this.subscription = null;
      console.log('📱 Push notifications unsubscribed');
    }
  }

  // Check if user is subscribed
  async getSubscription() {
    if (!this.isSupported) return null;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.getSubscription();
      return this.subscription;
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send subscription: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  // Remove subscription from server
  async removeSubscriptionFromServer(subscription) {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to remove subscription: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }

  // Utility function to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// File System Access Manager (for supported browsers)
class FileSystemAccessManager {
  constructor() {
    this.isSupported = this.checkSupport();
    this.fileHandles = new Map();
  }

  checkSupport() {
    return 'showOpenFilePicker' in window && 
           'showSaveFilePicker' in window && 
           'showDirectoryPicker' in window;
  }

  // Open file picker
  async openFile(options = {}) {
    if (!this.isSupported) {
      throw new Error('File System Access API not supported');
    }

    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'All files',
          accept: { '*/*': [] }
        }],
        excludeAcceptAllOption: false,
        multiple: false,
        ...options
      });

      const file = await fileHandle.getFile();
      this.fileHandles.set(file.name, fileHandle);
      
      return { file, handle: fileHandle };
    } catch (error) {
      if (error.name === 'AbortError') {
        return null; // User cancelled
      }
      throw error;
    }
  }

  // Save file
  async saveFile(data, suggestedName = 'untitled.txt', options = {}) {
    if (!this.isSupported) {
      // Fallback to download
      this.downloadFile(data, suggestedName);
      return;
    }

    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'Text files',
          accept: { 'text/plain': ['.txt'] }
        }],
        ...options
      });

      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();

      console.log('💾 File saved successfully');
      return fileHandle;
    } catch (error) {
      if (error.name === 'AbortError') {
        return null; // User cancelled
      }
      throw error;
    }
  }

  // Open directory
  async openDirectory() {
    if (!this.isSupported) {
      throw new Error('Directory access not supported');
    }

    try {
      const directoryHandle = await window.showDirectoryPicker();
      return directoryHandle;
    } catch (error) {
      if (error.name === 'AbortError') {
        return null; // User cancelled
      }
      throw error;
    }
  }

  // Fallback download for unsupported browsers
  downloadFile(data, filename) {
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Widget Manager (for supported platforms)
class WidgetManager {
  constructor() {
    this.isSupported = this.checkSupport();
    this.widgets = new Map();
  }

  checkSupport() {
    return 'getInstalledRelatedApps' in navigator ||
           'updateViaCache' in ServiceWorkerRegistration.prototype;
  }

  // Register widget
  async registerWidget(widgetData) {
    if (!this.isSupported) {
      console.warn('Widgets not supported on this platform');
      return false;
    }

    try {
      // Send widget data to service worker
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: 'REGISTER_WIDGET',
        data: widgetData
      });

      this.widgets.set(widgetData.tag, widgetData);
      console.log('📱 Widget registered:', widgetData.tag);
      return true;
    } catch (error) {
      console.error('Failed to register widget:', error);
      return false;
    }
  }

  // Update widget data
  async updateWidget(tag, data) {
    if (!this.widgets.has(tag)) {
      console.warn(`Widget ${tag} not found`);
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: 'UPDATE_WIDGET',
        tag,
        data
      });

      console.log('📱 Widget updated:', tag);
      return true;
    } catch (error) {
      console.error('Failed to update widget:', error);
      return false;
    }
  }
}

// Main Next-Gen PWA Manager
class NextGenPWAManager {
  constructor() {
    this.backgroundSync = new BackgroundSyncManager();
    this.webPush = new WebPushManager();
    this.fileSystem = new FileSystemAccessManager();
    this.widgets = new WidgetManager();
    
    this.isInstalled = false;
    this.deferredPrompt = null;
  }

  async init() {
    console.log('🚀 Initializing Next-Gen PWA features...');
    
    // Check if app is installed
    await this.checkInstallStatus();
    
    // Set up install prompt
    this.setupInstallPrompt();
    
    // Initialize widgets
    await this.initializeWidgets();
    
    // Set up share target handling
    this.setupShareTargetHandling();
    
    // Set up protocol handlers
    this.setupProtocolHandlers();
    
    console.log('✅ Next-Gen PWA features initialized');
  }

  // Check if PWA is installed
  async checkInstallStatus() {
    try {
      if ('getInstalledRelatedApps' in navigator) {
        const relatedApps = await navigator.getInstalledRelatedApps();
        this.isInstalled = relatedApps.length > 0;
      } else {
        // Fallback detection
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone === true;
      }
      
      console.log('📱 PWA install status:', this.isInstalled ? 'Installed' : 'Not installed');
    } catch (error) {
      console.error('Failed to check install status:', error);
    }
  }

  // Set up install prompt
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event;
      
      // Show custom install prompt
      this.showInstallPrompt();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      console.log('📱 PWA installed successfully');
    });
  }

  // Show custom install prompt
  showInstallPrompt() {
    // Create and show install banner
    const banner = document.createElement('div');
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="install-content">
        <div class="install-icon">📱</div>
        <div class="install-text">
          <div class="install-title">Install Quibish</div>
          <div class="install-subtitle">Get the full app experience</div>
        </div>
        <div class="install-actions">
          <button class="install-btn primary" data-action="install">Install</button>
          <button class="install-btn secondary" data-action="dismiss">Later</button>
        </div>
      </div>
    `;

    banner.addEventListener('click', async (event) => {
      const action = event.target.dataset.action;
      
      if (action === 'install') {
        await this.installPWA();
      }
      
      banner.remove();
    });

    document.body.appendChild(banner);
  }

  // Install PWA
  async installPWA() {
    if (!this.deferredPrompt) {
      console.warn('No install prompt available');
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('📱 User accepted PWA install');
      } else {
        console.log('📱 User dismissed PWA install');
      }
      
      this.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      console.error('Failed to install PWA:', error);
      return false;
    }
  }

  // Initialize widgets
  async initializeWidgets() {
    await this.widgets.registerWidget({
      tag: 'quick-chat',
      name: 'Quick Chat',
      data: {
        unreadCount: 0,
        lastMessage: 'No new messages',
        timestamp: Date.now()
      }
    });
  }

  // Set up share target handling
  setupShareTargetHandling() {
    // Handle shared content
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('action') === 'share') {
      const title = urlParams.get('title');
      const text = urlParams.get('text');
      const url = urlParams.get('url');
      
      this.handleSharedContent({ title, text, url });
    }
  }

  // Handle shared content
  handleSharedContent(content) {
    console.log('📤 Handling shared content:', content);
    
    // Dispatch custom event for the app to handle
    const event = new CustomEvent('pwa-content-shared', {
      detail: content
    });
    
    window.dispatchEvent(event);
  }

  // Set up protocol handlers
  setupProtocolHandlers() {
    // Handle custom protocol links
    const urlParams = new URLSearchParams(window.location.search);
    const protocol = urlParams.get('protocol');
    
    if (protocol) {
      this.handleProtocolRequest(protocol);
    }
  }

  // Handle protocol requests
  handleProtocolRequest(protocol) {
    console.log('🔗 Handling protocol request:', protocol);
    
    // Parse protocol and dispatch appropriate action
    if (protocol.startsWith('web+quibish://')) {
      const action = protocol.replace('web+quibish://', '');
      
      const event = new CustomEvent('pwa-protocol-handled', {
        detail: { protocol, action }
      });
      
      window.dispatchEvent(event);
    }
  }

  // Public API methods
  async queueBackgroundAction(tag, data) {
    return await this.backgroundSync.queueAction(tag, data);
  }

  async subscribeToPush() {
    return await this.webPush.subscribe();
  }

  async unsubscribeFromPush() {
    return await this.webPush.unsubscribe();
  }

  async openFileDialog(options) {
    return await this.fileSystem.openFile(options);
  }

  async saveFile(data, name, options) {
    return await this.fileSystem.saveFile(data, name, options);
  }

  async updateWidgetData(tag, data) {
    return await this.widgets.updateWidget(tag, data);
  }
}

// Initialize and export
export const initNextGenPWA = async () => {
  const pwaManager = new NextGenPWAManager();
  await pwaManager.init();
  
  // Make available globally
  window.nextGenPWA = pwaManager;
  
  return pwaManager;
};

export {
  NextGenPWAManager,
  BackgroundSyncManager,
  WebPushManager,
  FileSystemAccessManager,
  WidgetManager
};

export default {
  initNextGenPWA,
  NextGenPWAManager
};