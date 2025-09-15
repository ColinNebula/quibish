/**
 * User Presence Service
 * 
 * Manages user online/offline status and last active time
 */

const LAST_ACTIVE_KEY = 'quibish_user_last_active';
const ONLINE_STATUS_KEY = 'quibish_user_online_status';

// Time thresholds for presence (in milliseconds)
const PRESENCE = {
  ONLINE: 'online',    // Currently active
  AWAY: 'away',        // Inactive for more than 5 minutes
  OFFLINE: 'offline'   // Explicitly set offline or not logged in
};

// Time in milliseconds after which a user is considered "away"
const AWAY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

/**
 * Updates the last active timestamp for the user
 * @returns {number} Current timestamp
 */
export const updateLastActive = () => {
  const now = Date.now();
  localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
  return now;
};

/**
 * Gets the last active timestamp for the user
 * @returns {number|null} Timestamp or null if not available
 */
export const getLastActive = () => {
  const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
  return lastActive ? parseInt(lastActive, 10) : null;
};

/**
 * Sets the user's online status explicitly
 * @param {string} status - Status to set (online, away, offline)
 */
export const setOnlineStatus = (status) => {
  if (Object.values(PRESENCE).includes(status)) {
    localStorage.setItem(ONLINE_STATUS_KEY, status);
  }
};

/**
 * Gets the user's current presence status
 * @param {boolean} autoUpdate - Whether to automatically update last active time
 * @returns {string} Current presence status (online, away, offline)
 */
export const getUserPresence = (autoUpdate = false) => {
  // Get explicitly set status
  const explicitStatus = localStorage.getItem(ONLINE_STATUS_KEY);
  if (explicitStatus === PRESENCE.OFFLINE) {
    return PRESENCE.OFFLINE;
  }
  
  // If explicitly set to online or status not set, check last active time
  const lastActive = getLastActive();
  
  // If no last active time, assume offline
  if (!lastActive) {
    return PRESENCE.OFFLINE;
  }
  
  // Update last active time if autoUpdate is true
  if (autoUpdate) {
    updateLastActive();
    return PRESENCE.ONLINE;
  }
  
  // Check if user is away based on time threshold
  const now = Date.now();
  if (now - lastActive > AWAY_THRESHOLD) {
    return PRESENCE.AWAY;
  }
  
  // User is online
  return PRESENCE.ONLINE;
};

/**
 * Gets a formatted string for when the user was last active
 * @returns {string} Formatted last active time
 */
export const getLastActiveFormatted = () => {
  const lastActive = getLastActive();
  if (!lastActive) return 'Never';
  
  const now = Date.now();
  const diffSeconds = Math.floor((now - lastActive) / 1000);
  
  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

/**
 * Initialize presence tracking
 */
export const initPresenceTracking = () => {
  // Update last active time when the page loads
  updateLastActive();
  
  // Set up event listeners for user activity
  const activityEvents = ['mousedown', 'keydown', 'touchstart', 'click'];
  let activityTimeout;
  
  const handleUserActivity = () => {
    // Clear previous timeout
    clearTimeout(activityTimeout);
    
    // Update last active time
    updateLastActive();
    
    // Set status to online
    setOnlineStatus(PRESENCE.ONLINE);
    
    // Set timeout to change status to away after threshold
    activityTimeout = setTimeout(() => {
      setOnlineStatus(PRESENCE.AWAY);
    }, AWAY_THRESHOLD);
  };
  
  // Add event listeners
  activityEvents.forEach(event => {
    window.addEventListener(event, handleUserActivity);
  });
  
  // Set up beforeunload handler to set last active time when user leaves
  window.addEventListener('beforeunload', () => {
    updateLastActive();
  });
  
  // Handle visibility change (tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleUserActivity();
    }
  });
  
  // Initialize with current time and online status
  handleUserActivity();
  
  return () => {
    // Cleanup function to remove event listeners
    activityEvents.forEach(event => {
      window.removeEventListener(event, handleUserActivity);
    });
    window.removeEventListener('beforeunload', updateLastActive);
    document.removeEventListener('visibilitychange', handleUserActivity);
    clearTimeout(activityTimeout);
  };
};
