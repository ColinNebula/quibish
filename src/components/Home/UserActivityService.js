/**
 * User Activity Analytics Service
 */

const ACTIVITY_LOG_KEY = 'quibish_user_activity_log';
const MAX_LOG_ENTRIES = 100;

// Activity types
export const ACTIVITY_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  PROFILE_UPDATE: 'profile_update',
  CONVERSATION_CREATED: 'conversation_created',
  CONVERSATION_DELETED: 'conversation_deleted',
  STATUS_CHANGE: 'status_change'
};

/**
 * Log a user activity
 * @param {string} type - Activity type from ACTIVITY_TYPES
 * @param {Object} data - Additional data related to the activity
 */
export const logActivity = (type, data = {}) => {
  try {
    // Get current log
    const activityLog = getActivityLog();
    
    // Create new activity entry
    const newActivity = {
      timestamp: Date.now(),
      type,
      data
    };
    
    // Add to log and trim if needed
    activityLog.push(newActivity);
    if (activityLog.length > MAX_LOG_ENTRIES) {
      activityLog.shift(); // Remove oldest entry
    }
    
    // Save updated log
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(activityLog));
    
    return true;
  } catch (error) {
    console.error('Failed to log activity:', error);
    return false;
  }
};

/**
 * Get the full activity log
 * @returns {Array} Activity log entries
 */
export const getActivityLog = () => {
  try {
    const log = localStorage.getItem(ACTIVITY_LOG_KEY);
    return log ? JSON.parse(log) : [];
  } catch (error) {
    console.error('Failed to retrieve activity log:', error);
    return [];
  }
};

/**
 * Clear the activity log
 * @returns {boolean} Success indicator
 */
export const clearActivityLog = () => {
  try {
    localStorage.removeItem(ACTIVITY_LOG_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear activity log:', error);
    return false;
  }
};

/**
 * Get activity statistics
 * @returns {Object} Statistics about user activity
 */
export const getActivityStats = () => {
  const log = getActivityLog();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  
  // Filter activities by time periods
  const todayActivities = log.filter(entry => now - entry.timestamp < oneDay);
  const weekActivities = log.filter(entry => now - entry.timestamp < oneWeek);
  
  // Count by activity type
  const countByType = (activities, type) => {
    return activities.filter(entry => entry.type === type).length;
  };
  
  return {
    totalActivities: log.length,
    today: {
      total: todayActivities.length,
      messagesSent: countByType(todayActivities, ACTIVITY_TYPES.MESSAGE_SENT),
      messagesReceived: countByType(todayActivities, ACTIVITY_TYPES.MESSAGE_RECEIVED),
      logins: countByType(todayActivities, ACTIVITY_TYPES.LOGIN)
    },
    week: {
      total: weekActivities.length,
      messagesSent: countByType(weekActivities, ACTIVITY_TYPES.MESSAGE_SENT),
      messagesReceived: countByType(weekActivities, ACTIVITY_TYPES.MESSAGE_RECEIVED),
      logins: countByType(weekActivities, ACTIVITY_TYPES.LOGIN)
    },
    // Get most recent activity
    lastActivity: log.length > 0 ? log[log.length - 1] : null
  };
};
