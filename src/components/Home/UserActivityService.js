// UserActivityService.js - Service for tracking user activity and analytics

// Activity types enum
export const ACTIVITY_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  CALL_STARTED: 'call_started',
  CALL_ENDED: 'call_ended',
  VIDEO_CALL_STARTED: 'video_call_started',
  VIDEO_CALL_ENDED: 'video_call_ended',
  CONTACT_ADDED: 'contact_added',
  CONTACT_REMOVED: 'contact_removed',
  SETTINGS_CHANGED: 'settings_changed',
  PROFILE_UPDATED: 'profile_updated',
  FILE_UPLOADED: 'file_uploaded',
  FILE_DOWNLOADED: 'file_downloaded',
  SEARCH_PERFORMED: 'search_performed',
  THEME_CHANGED: 'theme_changed',
  NOTIFICATION_CLICKED: 'notification_clicked',
  PAGE_VIEW: 'page_view',
  FEATURE_USED: 'feature_used',
  ERROR_OCCURRED: 'error_occurred'
};

// Storage keys
const STORAGE_KEYS = {
  ACTIVITY_LOG: 'user_activity_log',
  SESSION_DATA: 'user_session_data',
  ANALYTICS_DATA: 'user_analytics_data'
};

// Maximum number of activities to store
const MAX_ACTIVITIES = 1000;

// UserActivityService class
class UserActivityService {
  constructor() {
    this.sessionStartTime = Date.now();
    this.sessionId = this.generateSessionId();
    this.lastActivityTime = Date.now();
    this.isTrackingEnabled = true;
    
    // Initialize session tracking
    this.initializeSession();
    
    // Set up cleanup interval
    this.setupCleanupInterval();
  }

  // Generate unique session ID
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize session tracking
  initializeSession() {
    try {
      const sessionData = {
        sessionId: this.sessionId,
        startTime: this.sessionStartTime,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`
      };
      
      localStorage.setItem(STORAGE_KEYS.SESSION_DATA, JSON.stringify(sessionData));
      
      // Log session start
      this.logActivity(ACTIVITY_TYPES.LOGIN, {
        sessionId: this.sessionId,
        timestamp: this.sessionStartTime
      });
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }

  // Main activity logging function
  logActivity(activityType, data = {}) {
    if (!this.isTrackingEnabled) {
      return;
    }

    try {
      const activity = {
        id: this.generateActivityId(),
        type: activityType,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        data: {
          ...data,
          url: window.location.href,
          referrer: document.referrer,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`
        }
      };

      // Update last activity time
      this.lastActivityTime = activity.timestamp;

      // Get existing activities
      const activities = this.getActivityLog();
      
      // Add new activity
      activities.push(activity);
      
      // Trim if necessary
      if (activities.length > MAX_ACTIVITIES) {
        activities.splice(0, activities.length - MAX_ACTIVITIES);
      }
      
      // Save to storage
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(activities));
      
      // Update analytics
      this.updateAnalytics(activity);

      // Dispatch custom event for real-time tracking
      window.dispatchEvent(new CustomEvent('userActivity', {
        detail: activity
      }));

    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  // Generate unique activity ID
  generateActivityId() {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get activity log
  getActivityLog() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get activity log:', error);
      return [];
    }
  }

  // Clear activity log
  clearActivityLog() {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVITY_LOG);
      localStorage.removeItem(STORAGE_KEYS.ANALYTICS_DATA);
      return true;
    } catch (error) {
      console.error('Failed to clear activity log:', error);
      return false;
    }
  }

  // Get activity statistics
  getActivityStats() {
    try {
      const activities = this.getActivityLog();
      const now = Date.now();
      const today = new Date().setHours(0, 0, 0, 0);
      const thisWeek = now - (7 * 24 * 60 * 60 * 1000);
      const thisMonth = now - (30 * 24 * 60 * 60 * 1000);

      // Calculate stats
      const stats = {
        total: activities.length,
        today: activities.filter(a => a.timestamp >= today).length,
        thisWeek: activities.filter(a => a.timestamp >= thisWeek).length,
        thisMonth: activities.filter(a => a.timestamp >= thisMonth).length,
        byType: {},
        byHour: new Array(24).fill(0),
        byDay: {},
        sessionDuration: now - this.sessionStartTime,
        lastActivity: this.lastActivityTime,
        mostActiveHour: 0,
        mostActiveDay: '',
        topActivities: []
      };

      // Group by type
      activities.forEach(activity => {
        const type = activity.type;
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        // Group by hour
        const hour = new Date(activity.timestamp).getHours();
        stats.byHour[hour]++;

        // Group by day
        const day = new Date(activity.timestamp).toDateString();
        stats.byDay[day] = (stats.byDay[day] || 0) + 1;
      });

      // Find most active hour (with null safety)
      const maxHourValue = Math.max(...(stats.byHour || []));
      stats.mostActiveHour = stats.byHour?.indexOf?.(maxHourValue) ?? -1;

      // Find most active day
      const maxDay = Object.keys(stats.byDay).reduce((a, b) => 
        stats.byDay[a] > stats.byDay[b] ? a : b, '');
      stats.mostActiveDay = maxDay;

      // Top activities
      stats.topActivities = Object.entries(stats.byType)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      return stats;
    } catch (error) {
      console.error('Failed to get activity stats:', error);
      return {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        byType: {},
        byHour: new Array(24).fill(0),
        byDay: {},
        sessionDuration: 0,
        lastActivity: Date.now(),
        mostActiveHour: 0,
        mostActiveDay: '',
        topActivities: []
      };
    }
  }

  // Update analytics data
  updateAnalytics(activity) {
    try {
      const analytics = this.getAnalyticsData();
      const today = new Date().toDateString();

      // Initialize today's data if needed
      if (!analytics.daily[today]) {
        analytics.daily[today] = {
          activities: 0,
          types: {},
          firstActivity: activity.timestamp,
          lastActivity: activity.timestamp
        };
      }

      // Update daily stats
      const dayData = analytics.daily[today];
      dayData.activities++;
      dayData.types[activity.type] = (dayData.types[activity.type] || 0) + 1;
      dayData.lastActivity = activity.timestamp;

      // Update global stats
      analytics.global.totalActivities++;
      analytics.global.types[activity.type] = (analytics.global.types[activity.type] || 0) + 1;
      analytics.global.lastUpdated = activity.timestamp;

      // Save analytics
      localStorage.setItem(STORAGE_KEYS.ANALYTICS_DATA, JSON.stringify(analytics));
    } catch (error) {
      console.error('Failed to update analytics:', error);
    }
  }

  // Get analytics data
  getAnalyticsData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ANALYTICS_DATA);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to get analytics data:', error);
    }

    // Return default structure
    return {
      global: {
        totalActivities: 0,
        types: {},
        firstActivity: Date.now(),
        lastUpdated: Date.now()
      },
      daily: {},
      weekly: {},
      monthly: {}
    };
  }

  // Enable/disable tracking
  setTrackingEnabled(enabled) {
    this.isTrackingEnabled = enabled;
    localStorage.setItem('activity_tracking_enabled', enabled);
  }

  // Check if tracking is enabled
  isTrackingEnabledCheck() {
    return this.isTrackingEnabled;
  }

  // Track page view
  trackPageView(page, data = {}) {
    this.logActivity(ACTIVITY_TYPES.PAGE_VIEW, {
      page,
      ...data
    });
  }

  // Track feature usage
  trackFeatureUsage(feature, data = {}) {
    this.logActivity(ACTIVITY_TYPES.FEATURE_USED, {
      feature,
      ...data
    });
  }

  // Track errors
  trackError(error, context = {}) {
    this.logActivity(ACTIVITY_TYPES.ERROR_OCCURRED, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context
    });
  }

  // Setup cleanup interval (remove old activities)
  setupCleanupInterval() {
    // Clean up old activities every hour
    setInterval(() => {
      this.cleanupOldActivities();
    }, 60 * 60 * 1000);
  }

  // Remove activities older than specified days
  cleanupOldActivities(maxDays = 30) {
    try {
      const activities = this.getActivityLog();
      const cutoffTime = Date.now() - (maxDays * 24 * 60 * 60 * 1000);
      
      const filteredActivities = activities.filter(activity => 
        activity.timestamp >= cutoffTime
      );
      
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(filteredActivities));
      
      console.log(`Cleaned up ${activities.length - filteredActivities.length} old activities`);
    } catch (error) {
      console.error('Failed to cleanup old activities:', error);
    }
  }

  // Export activity data
  exportActivityData() {
    try {
      const data = {
        activities: this.getActivityLog(),
        analytics: this.getAnalyticsData(),
        session: JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION_DATA) || '{}'),
        exportedAt: Date.now()
      };
      
      return data;
    } catch (error) {
      console.error('Failed to export activity data:', error);
      return null;
    }
  }

  // Import activity data
  importActivityData(data) {
    try {
      if (data.activities) {
        localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(data.activities));
      }
      
      if (data.analytics) {
        localStorage.setItem(STORAGE_KEYS.ANALYTICS_DATA, JSON.stringify(data.analytics));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import activity data:', error);
      return false;
    }
  }

  // Get session info
  getSessionInfo() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION_DATA);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get session info:', error);
      return null;
    }
  }
}

// Create and export singleton instance
const userActivityService = new UserActivityService();

// Export functions for direct use
export const logActivity = (activityType, data = {}) => {
  userActivityService.logActivity(activityType, data);
};

export const getActivityStats = () => {
  return userActivityService.getActivityStats();
};

export const clearActivityLog = () => {
  return userActivityService.clearActivityLog();
};

export const trackPageView = (page, data = {}) => {
  userActivityService.trackPageView(page, data);
};

export const trackFeatureUsage = (feature, data = {}) => {
  userActivityService.trackFeatureUsage(feature, data);
};

export const trackError = (error, context = {}) => {
  userActivityService.trackError(error, context);
};

export const setTrackingEnabled = (enabled) => {
  userActivityService.setTrackingEnabled(enabled);
};

export const isTrackingEnabled = () => {
  return userActivityService.isTrackingEnabledCheck();
};

export const exportActivityData = () => {
  return userActivityService.exportActivityData();
};

export const importActivityData = (data) => {
  return userActivityService.importActivityData(data);
};

export const getSessionInfo = () => {
  return userActivityService.getSessionInfo();
};

// Export the service instance
export default userActivityService;