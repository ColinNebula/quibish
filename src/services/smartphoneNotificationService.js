/**
 * Advanced Notification Service for Smartphone Integration
 * Handles push notifications, badging, and notification interactions
 */

class SmartphoneNotificationService {
  constructor() {
    this.registration = null;
    this.permission = 'default';
    this.subscription = null;
    this.isSupported = false;
    this.badgeCount = 0;
    
    this.init();
  }

  async init() {
    // Check notification support
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    if (!this.isSupported) {
      console.log('📱 Push notifications not supported');
      return;
    }

    // Get current permission
    this.permission = Notification.permission;
    
    // Get service worker registration
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ready for notifications');
      } catch (error) {
        console.error('❌ Failed to get Service Worker registration:', error);
      }
    }

    // Setup message handling
    this.setupMessageHandling();
    
    console.log('✅ Smartphone Notification Service initialized');
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        await this.setupPushSubscription();
        return true;
      } else {
        console.log('❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return false;
    }
  }

  // Setup push subscription
  async setupPushSubscription() {
    if (!this.registration || !('pushManager' in this.registration)) {
      console.log('📱 Push Manager not supported');
      return null;
    }

    try {
      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (!this.subscription) {
        // Create new subscription
        const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
        
        if (!vapidPublicKey) {
          console.log('⚠️ VAPID public key not configured');
          return null;
        }

        this.subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        });

        console.log('✅ Push subscription created');
        
        // Send subscription to server
        await this.sendSubscriptionToServer(this.subscription);
      }

      return this.subscription;
    } catch (error) {
      console.error('❌ Failed to setup push subscription:', error);
      return null;
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        console.log('⚠️ No auth token available for subscription');
        return;
      }

      const response = await fetch('http://localhost:5001/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        })
      });

      if (response.ok) {
        console.log('✅ Subscription sent to server');
      } else {
        console.error('❌ Failed to send subscription to server');
      }
    } catch (error) {
      console.error('❌ Error sending subscription to server:', error);
    }
  }

  // Show local notification
  async showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.log('⚠️ Notification permission not granted');
      return;
    }

    const defaultOptions = {
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      timestamp: Date.now(),
      ...options
    };

    try {
      if (this.registration) {
        // Use service worker to show notification
        return await this.registration.showNotification(title, defaultOptions);
      } else {
        // Fallback to direct notification
        return new Notification(title, defaultOptions);
      }
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
    }
  }

  // Show message notification
  async showMessageNotification(message) {
    const options = {
      body: message.text || 'New message',
      icon: message.senderAvatar || '/logo192.png',
      badge: '/logo192.png',
      tag: `message-${message.senderId}`,
      data: {
        type: 'message',
        messageId: message.id,
        senderId: message.senderId,
        conversationId: message.conversationId,
        url: `/?conversation=${message.conversationId}`
      },
      actions: [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/icons/reply.png'
        },
        {
          action: 'mark-read',
          title: 'Mark as Read',
          icon: '/icons/check.png'
        }
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200]
    };

    return await this.showNotification(
      `${message.senderName || 'Someone'} sent you a message`,
      options
    );
  }

  // Show call notification
  async showCallNotification(call) {
    const options = {
      body: `Incoming ${call.type} call`,
      icon: call.callerAvatar || '/logo192.png',
      badge: '/logo192.png',
      tag: `call-${call.callId}`,
      data: {
        type: 'call',
        callId: call.callId,
        callerId: call.callerId,
        callType: call.type,
        url: `/?call=${call.callId}`
      },
      actions: [
        {
          action: 'answer',
          title: 'Answer',
          icon: '/icons/phone-accept.png'
        },
        {
          action: 'decline',
          title: 'Decline',
          icon: '/icons/phone-decline.png'
        }
      ],
      requireInteraction: true,
      vibrate: [1000, 200, 1000, 200, 1000],
      silent: false
    };

    return await this.showNotification(
      `${call.callerName || 'Someone'} is calling`,
      options
    );
  }

  // Setup message handling for notification interactions
  setupMessageHandling() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'notification-click':
          this.handleNotificationClick(data);
          break;
        case 'notification-action':
          this.handleNotificationAction(data);
          break;
        case 'notification-close':
          this.handleNotificationClose(data);
          break;
      }
    });
  }

  // Handle notification click
  handleNotificationClick(data) {
    console.log('🔔 Notification clicked:', data);
    
    if (data.url) {
      window.focus();
      window.location.href = data.url;
    }
  }

  // Handle notification action
  async handleNotificationAction(data) {
    console.log('🔔 Notification action:', data);

    const { action, notificationData } = data;

    switch (action) {
      case 'reply':
        this.handleReplyAction(notificationData);
        break;
      case 'mark-read':
        this.handleMarkReadAction(notificationData);
        break;
      case 'answer':
        this.handleAnswerCallAction(notificationData);
        break;
      case 'decline':
        this.handleDeclineCallAction(notificationData);
        break;
    }
  }

  // Handle notification close
  handleNotificationClose(data) {
    console.log('🔔 Notification closed:', data);
  }

  // Handle reply action
  handleReplyAction(data) {
    // Open chat with reply interface
    window.focus();
    window.location.href = `/?conversation=${data.conversationId}&action=reply`;
  }

  // Handle mark as read action
  async handleMarkReadAction(data) {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (token) {
        await fetch(`http://localhost:5001/api/messages/${data.messageId}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to mark message as read:', error);
    }
  }

  // Handle answer call action
  handleAnswerCallAction(data) {
    window.focus();
    window.location.href = `/?call=${data.callId}&action=answer`;
  }

  // Handle decline call action
  async handleDeclineCallAction(data) {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (token) {
        await fetch(`http://localhost:5001/api/calls/${data.callId}/decline`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to decline call:', error);
    }
  }

  // Update app badge
  updateBadge(count) {
    this.badgeCount = count;
    
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(console.error);
      } else {
        navigator.clearAppBadge().catch(console.error);
      }
    }
  }

  // Clear app badge
  clearBadge() {
    this.updateBadge(0);
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (this.subscription) {
      try {
        await this.subscription.unsubscribe();
        this.subscription = null;
        console.log('✅ Unsubscribed from push notifications');
        
        // Notify server
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (token) {
          await fetch('http://localhost:5001/api/notifications/unsubscribe', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        }
      } catch (error) {
        console.error('❌ Failed to unsubscribe:', error);
      }
    }
  }

  // Utility: Convert VAPID key
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

  // Get notification status
  getStatus() {
    return {
      supported: this.isSupported,
      permission: this.permission,
      subscribed: !!this.subscription,
      badgeCount: this.badgeCount
    };
  }
}

// Create global instance
const notificationService = new SmartphoneNotificationService();

// Export utility functions
export const notificationUtils = {
  // Request permission and setup
  setup: async () => {
    return await notificationService.requestPermission();
  },
  
  // Show simple notification
  notify: (title, options) => {
    return notificationService.showNotification(title, options);
  },
  
  // Update badge count
  setBadge: (count) => {
    notificationService.updateBadge(count);
  },
  
  // Clear badge
  clearBadge: () => {
    notificationService.clearBadge();
  },
  
  // Get permission status
  getPermission: () => {
    return notificationService.permission;
  },
  
  // Check if supported
  isSupported: () => {
    return notificationService.isSupported;
  }
};

export default notificationService;