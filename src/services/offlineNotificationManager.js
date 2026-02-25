import { API_CONFIG } from './api';

class OfflineNotificationManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.serviceWorkerRegistration = null;
    this.notificationPermission = 'default';
    this.setupEventListeners();
  }

  // Setup online/offline event listeners
  setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Back online');
      this.isOnline = true;
      this.syncQueuedMessages();
      this.updatePresence('online');
    });

    window.addEventListener('offline', () => {
      console.log('📡 Gone offline');
      this.isOnline = false;
      this.updatePresence('offline');
    });

    // Listen for visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncQueuedMessages();
      }
    });
  }

  // Register service worker
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/sw.js`, { scope: `${process.env.PUBLIC_URL}/` });
        this.serviceWorkerRegistration = registration;
        console.log('✅ Service Worker registered');

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });

        return registration;
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  }

  // Handle messages from service worker
  handleServiceWorkerMessage(data) {
    if (data.type === 'MESSAGES_SYNCED') {
      console.log('📬 Messages synced:', data.count);
      // Trigger event for components to update
      window.dispatchEvent(new CustomEvent('messages-synced', {
        detail: { count: data.count, messages: data.messages }
      }));
    }

    if (data.type === 'GET_AUTH_TOKEN') {
      // Send auth token to service worker
      const token = localStorage.getItem('token');
      event.ports[0].postMessage({ token });
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('❌ Browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      this.notificationPermission = 'granted';
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      return permission;
    }

    this.notificationPermission = Notification.permission;
    return Notification.permission;
  }

  // Subscribe to push notifications
  async subscribeToPushNotifications() {
    if (!this.serviceWorkerRegistration) {
      console.error('Service Worker not registered');
      return false;
    }

    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('❌ Notification permission denied');
      return false;
    }

    try {
      // Get push subscription
      let subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            process.env.REACT_APP_VAPID_PUBLIC_KEY || ''
          )
        });
      }

      // Send subscription to server
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_CONFIG.BASE_URL}/offline-notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        })
      });

      if (response.ok) {
        console.log('✅ Push notifications enabled');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications:', error);
    }

    return false;
  }

  // Convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Update user presence
  async updatePresence(status) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch(`${API_CONFIG.BASE_URL}/offline-notifications/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }

  // Sync queued messages
  async syncQueuedMessages() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/offline-notifications/queued`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.count > 0) {
          console.log('📬 Retrieved', data.count, 'queued messages');
          
          // Show notification
          this.showLocalNotification(
            'New Messages',
            `You have ${data.count} new message${data.count > 1 ? 's' : ''}`
          );

          // Trigger event
          window.dispatchEvent(new CustomEvent('messages-synced', {
            detail: { count: data.count, messages: data.messages }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to sync queued messages:', error);
    }
  }

  // Show local notification
  showLocalNotification(title, body, options = {}) {
    if (this.notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options
      });
    }
  }

  // Get unread count
  async getUnreadCount() {
    const token = localStorage.getItem('token');
    if (!token) return 0;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/offline-notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.count;
      }
    } catch (error) {
      console.error('Failed to get unread count:', error);
    }

    return 0;
  }

  // Update notification preferences
  async updatePreferences(preferences) {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/offline-notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return false;
    }
  }
}

// Export singleton instance
const offlineNotificationManager = new OfflineNotificationManager();

export default offlineNotificationManager;
