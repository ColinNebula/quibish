// Push Notification Service for offline message alerts
import { buildApiUrl } from '../config/api';

class PushNotificationService {
  constructor() {
    this.vapidPublicKey = null;
    this.subscription = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.permission = 'default';
    this.userId = null;
  }

  // Initialize the push notification service
  async initialize(userId) {
    console.log('🔔 Initializing push notification service...');
    this.userId = userId;

    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Check current permission status
      this.permission = await Notification.permission;
      console.log('Current notification permission:', this.permission);

      // Register service worker if not already registered
      await this.registerServiceWorker();

      // If permission is granted, set up subscription
      if (this.permission === 'granted') {
        await this.setupPushSubscription();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Register service worker for push notifications
  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered for notifications');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Request permission for push notifications
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      console.log('Notification permission result:', permission);

      if (permission === 'granted') {
        await this.setupPushSubscription();
        return true;
      } else if (permission === 'denied') {
        throw new Error('Notification permission denied');
      } else {
        throw new Error('Notification permission not granted');
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw error;
    }
  }

  // Set up push subscription with backend
  async setupPushSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from backend
      await this.getVapidKey();

      // Create push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      this.subscription = subscription;
      console.log('✅ Push subscription created');

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Failed to setup push subscription:', error);
      throw error;
    }
  }

  // Get VAPID public key from backend
  async getVapidKey() {
    try {
      const response = await fetch(buildApiUrl('notifications/vapid-key'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get VAPID key');
      }

      const data = await response.json();
      this.vapidPublicKey = data.publicKey;
      console.log('✅ VAPID key retrieved');
    } catch (error) {
      console.error('Failed to get VAPID key:', error);
      // Fallback to demo key for development
      this.vapidPublicKey = 'BMqSvZyI8NzEp_G-Jw5i5L7-8K9yJ8xI7qU6vN2mL4kP3oT8fF1R9eA2cX5nH7jQ6wE4dY9pM8vL3zK2aB1sC0f';
    }
  }

  // Send subscription to backend
  async sendSubscriptionToBackend(subscription) {
    try {
      const response = await fetch(buildApiUrl('notifications/subscribe'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: this.userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to backend');
      }

      console.log('✅ Subscription sent to backend');
    } catch (error) {
      console.error('Failed to send subscription to backend:', error);
      throw error;
    }
  }

  // Test push notification
  async testNotification(message = 'Test notification from Quibish!') {
    if (this.permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      const notification = new Notification('Quibish', {
        body: message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'test-notification',
        requireInteraction: false,
        actions: [
          {
            action: 'open',
            title: 'Open App'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      console.log('✅ Test notification sent');
      return notification;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      throw error;
    }
  }

  // Show incoming message notification
  showMessageNotification(message) {
    if (this.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted');
      return;
    }

    const notification = new Notification(`New message from ${message.sender}`, {
      body: message.text || 'You have a new message',
      icon: message.senderAvatar || '/logo192.png',
      badge: '/logo192.png',
      tag: `message-${message.id}`,
      requireInteraction: true,
      actions: [
        {
          action: 'reply',
          title: 'Reply'
        },
        {
          action: 'view',
          title: 'View'
        }
      ],
      data: {
        messageId: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId
      }
    });

    notification.onclick = () => {
      window.focus();
      // Navigate to conversation
      window.postMessage({
        type: 'OPEN_CONVERSATION',
        conversationId: message.conversationId
      }, '*');
      notification.close();
    };

    return notification;
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        console.log('✅ Unsubscribed from push notifications');
      }

      // Notify backend
      await fetch(buildApiUrl('notifications/unsubscribe'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.userId
        })
      });

      this.subscription = null;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      throw error;
    }
  }

  // Get current subscription status
  getSubscriptionStatus() {
    return {
      isSupported: this.isSupported,
      permission: this.permission,
      hasSubscription: !!this.subscription,
      userId: this.userId
    };
  }

  // Utility: Convert VAPID key to Uint8Array
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

  // Check if user is online
  isUserOnline() {
    return navigator.onLine && document.visibilityState === 'visible';
  }

  // Setup visibility change listener for presence detection
  setupPresenceDetection() {
    document.addEventListener('visibilitychange', () => {
      const isVisible = document.visibilityState === 'visible';
      console.log('User visibility changed:', isVisible ? 'visible' : 'hidden');
      
      // Notify backend of presence change
      this.updateUserPresence(isVisible);
    });

    // Track online/offline status
    window.addEventListener('online', () => {
      console.log('User came online');
      this.updateUserPresence(true);
    });

    window.addEventListener('offline', () => {
      console.log('User went offline');
      this.updateUserPresence(false);
    });
  }

  // Update user presence on backend
  async updateUserPresence(isOnline) {
    try {
      await fetch(buildApiUrl('users/presence'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.userId,
          isOnline,
          lastSeen: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to update user presence:', error);
    }
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;