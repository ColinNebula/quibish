import { apiFetch } from '../config/api';

class NotificationService {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.listeners = new Set();
    this.lastFetchTime = null;
    this.pollInterval = null;
    this.socketConnection = null;
    this._fetchingUnreadCount = false;
    this._rateLimitedUntil = null;
    
    // Initialize with offline support
    this.loadFromLocalStorage();
    this.startPolling();
  }

  // Notification types
  static TYPES = {
    MESSAGE: 'message',
    POST: 'post',
    FRIEND_REQUEST: 'friend_request',
    FRIEND_ACCEPTED: 'friend_accepted',
    MENTION: 'mention',
    VIDEO_CALL: 'video_call',
    VOICE_CALL: 'voice_call',
    FILE_SHARED: 'file_shared',
    GROUP_INVITE: 'group_invite',
    SYSTEM: 'system'
  };

  // Event listeners management
  addEventListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  removeEventListener(callback) {
    this.listeners.delete(callback);
  }

  emit(eventType, data) {
    this.listeners.forEach(callback => {
      try {
        callback(eventType, data);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Local storage operations
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('quibish_notifications');
      if (stored) {
        const data = JSON.parse(stored);
        this.notifications = data.notifications || [];
        this.unreadCount = data.unreadCount || 0;
        this.lastFetchTime = data.lastFetchTime;
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
    }
  }

  saveToLocalStorage() {
    try {
      const data = {
        notifications: this.notifications,
        unreadCount: this.unreadCount,
        lastFetchTime: this.lastFetchTime,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('quibish_notifications', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }

  // Fetch notifications from server
  async fetchNotifications(options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        unread = false,
        refresh = false
      } = options;

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (unread) {
        params.append('unread', 'true');
      }

      const data = await apiFetch(`/notifications?${params}`);
      
      if (refresh || offset === 0) {
        this.notifications = data.notifications;
      } else {
        // Append to existing notifications for pagination
        this.notifications = [...this.notifications, ...data.notifications];
      }

      this.unreadCount = data.unreadCount;
      this.lastFetchTime = new Date().toISOString();
      
      this.saveToLocalStorage();
      this.emit('notificationsUpdated', {
        notifications: this.notifications,
        unreadCount: this.unreadCount,
        total: data.total,
        hasMore: data.hasMore
      });

      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      
      // Return cached data on error
      return {
        notifications: this.notifications,
        unreadCount: this.unreadCount,
        total: this.notifications.length,
        hasMore: false,
        fromCache: true
      };
    }
  }

  // Get unread count
  async getUnreadCount() {
    // Deduplicate rapid concurrent calls: if a fetch is already in-flight,
    // return the cached value instead of firing another request.
    if (this._fetchingUnreadCount) {
      return this.unreadCount;
    }
    // Block all requests during an active rate-limit backoff window
    if (this._rateLimitedUntil && Date.now() < this._rateLimitedUntil) {
      return this.unreadCount;
    }
    // Throttle: skip if fetched within the last 5 seconds
    const now = Date.now();
    if (this.lastFetchTime && (now - this.lastFetchTime) < 5000) {
      return this.unreadCount;
    }
    this._fetchingUnreadCount = true;
    try {
      const data = await apiFetch('/notifications/unread-count');
      this.lastFetchTime = Date.now();
      this.unreadCount = data.unreadCount;
      
      this.saveToLocalStorage();
      this.emit('unreadCountUpdated', this.unreadCount);
      
      return this.unreadCount;
    } catch (error) {
      // Handle rate limiting with exponential backoff
      if (error.message && (error.message.includes('429') || error.message.includes('Too Many'))) {
        console.warn('Rate limited on notification polling. Backing off...');
        this.handleRateLimit();
      } else {
        console.error('Error fetching unread count:', error);
      }
      return this.unreadCount; // Return cached count
    } finally {
      this._fetchingUnreadCount = false;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      // Optimistically update UI
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.saveToLocalStorage();
        this.emit('notificationRead', { notification, unreadCount: this.unreadCount });
      }

      const result = await apiFetch(`/notifications/${notificationId}/read`, {
        method: 'PUT'
      });

      return result;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      // Optimistically update UI
      const previousUnreadCount = this.unreadCount;
      this.notifications.forEach(n => {
        if (!n.read) {
          n.read = true;
        }
      });
      this.unreadCount = 0;
      this.saveToLocalStorage();
      this.emit('allNotificationsRead', { previousUnreadCount });

      const result = await apiFetch('/notifications/read-all', {
        method: 'PUT'
      });

      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      // Optimistically remove from UI
      const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
      let removedNotification = null;
      
      if (notificationIndex !== -1) {
        removedNotification = this.notifications[notificationIndex];
        this.notifications.splice(notificationIndex, 1);
        
        if (!removedNotification.read) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        
        this.saveToLocalStorage();
        this.emit('notificationDeleted', { 
          notification: removedNotification, 
          unreadCount: this.unreadCount 
        });
      }

      const result = await apiFetch(`/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      return result;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Create new notification (for testing)
  async createNotification(type, title, message, data = {}) {
    try {
      const result = await apiFetch('/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          title,
          message,
          data
        })
      });
      
      // Add to local notifications and update count
      this.notifications.unshift(result.notification);
      this.unreadCount += 1;
      
      this.saveToLocalStorage();
      this.emit('newNotification', result.notification);
      
      return result;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Real-time notification handler
  handleRealtimeNotification(notification) {
    // Add to notifications array
    this.notifications.unshift(notification);
    
    // Update unread count if notification is unread
    if (!notification.read) {
      this.unreadCount += 1;
    }
    
    // Limit stored notifications to prevent memory issues
    if (this.notifications.length > 200) {
      this.notifications = this.notifications.slice(0, 200);
    }
    
    this.saveToLocalStorage();
    this.emit('newNotification', notification);
    this.emit('unreadCountUpdated', this.unreadCount);
    
    // Show browser notification if supported and permitted
    this.showBrowserNotification(notification);
  }

  // Browser notification API
  async showBrowserNotification(notification) {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(notification.title, {
          body: notification.message,
          icon: '/logo192.png',
          tag: notification.id,
          silent: false,
          data: notification.data
        });

        notif.onclick = () => {
          window.focus();
          this.emit('notificationClicked', notification);
          notif.close();
        };

        // Auto close after 5 seconds
        setTimeout(() => {
          notif.close();
        }, 5000);
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      return 'not-supported';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Start polling for notifications
  startPolling(interval = 30000) { // 30 seconds
    // Always stop any existing polling first to prevent duplicates
    this.stopPolling();

    this.pollInterval = setInterval(() => {
      this.getUnreadCount();
    }, interval);
    
    // Track this interval globally for cleanup on hot reload
    if (typeof window !== 'undefined') {
      window.__quibish_notification_intervals = window.__quibish_notification_intervals || new Set();
      window.__quibish_notification_intervals.add(this.pollInterval);
    }
    
    // Also do an immediate fetch on start
    this.getUnreadCount();
  }

  // Stop polling
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      
      // Remove from global tracking
      if (typeof window !== 'undefined' && window.__quibish_notification_intervals) {
        window.__quibish_notification_intervals.delete(this.pollInterval);
      }
      
      this.pollInterval = null;
    }
  }

  // Handle rate limiting with exponential backoff
  handleRateLimit() {
    // Stop current polling
    this.stopPolling();
    
    const backoffMs = 60000; // 60 seconds
    // Block all getUnreadCount calls for the entire backoff window so we don't
    // instantly re-trigger another 429 when the interval fires.
    this._rateLimitedUntil = Date.now() + backoffMs;
    console.log(`Rate limited. Notification polling paused for ${backoffMs / 1000}s.`);
    
    // Restart the interval WITHOUT an immediate fetch — the next poll will
    // happen naturally after backoffMs, by which point _rateLimitedUntil has expired.
    this.pollInterval = setInterval(() => {
      this.getUnreadCount();
    }, backoffMs);
    
    if (typeof window !== 'undefined') {
      window.__quibish_notification_intervals = window.__quibish_notification_intervals || new Set();
      window.__quibish_notification_intervals.add(this.pollInterval);
    }
  }

  // WebSocket connection for real-time updates
  connectWebSocket(socketUrl) {
    try {
      this.socketConnection = new WebSocket(socketUrl);
      
      this.socketConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification') {
            this.handleRealtimeNotification(data.notification);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socketConnection.onclose = () => {
        console.log('Notification WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          this.connectWebSocket(socketUrl);
        }, 5000);
      };
      
      this.socketConnection.onerror = (error) => {
        console.error('Notification WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting to notification WebSocket:', error);
    }
  }

  // Get current notifications
  getNotifications() {
    return {
      notifications: this.notifications,
      unreadCount: this.unreadCount
    };
  }

  // Filter notifications by type
  getNotificationsByType(type) {
    return this.notifications.filter(n => n.type === type);
  }

  // Get notifications from today
  getTodayNotifications() {
    const today = new Date().toDateString();
    return this.notifications.filter(n => 
      new Date(n.createdAt).toDateString() === today
    );
  }

  // Attach to an already-connected realtimeService instance so we don't
  // open a second WebSocket.  Call this once after the user logs in.
  attachRealtime(realtimeService) {
    if (this._realtimeOff) {
      this._realtimeOff(); // detach any previous listener
    }
    this._realtimeOff = realtimeService.on('notification', (data) => {
      if (data && data.notification) {
        this.handleRealtimeNotification(data.notification);
      }
    });
  }

  // Cleanup
  destroy() {
    this.stopPolling();
    
    if (this.socketConnection) {
      this.socketConnection.close();
    }
    
    this.listeners.clear();
    this.saveToLocalStorage();
  }
}

// Create and export singleton instance
let notificationServiceInstance = null;

const getNotificationService = () => {
  if (!notificationServiceInstance) {
    // Clean up any orphaned intervals from previous hot reloads
    if (typeof window !== 'undefined' && window.__quibish_notification_intervals) {
      window.__quibish_notification_intervals.forEach(id => clearInterval(id));
      window.__quibish_notification_intervals.clear();
    }
    
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
};

const notificationService = getNotificationService();
export default notificationService;