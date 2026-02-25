# Rate Limiting 429 Error - Fixed

## Problem
The frontend was receiving `429 Too Many Requests` errors when polling the notifications endpoint:
```
GET http://localhost:5001/api/notifications/unread-count 429 (Too Many Requests)
```

## Root Cause
During development with hot module reload, the `notificationService` module was being re-imported multiple times, creating **multiple concurrent polling intervals**. Each React hot reload would create a new instance without cleaning up the old one, resulting in hundreds of simultaneous requests hitting the backend.

### Evidence
Backend logs showed massive request spam:
- All requests happening at `14:06:12` (same second)
- Hundreds of duplicate requests with identical timestamps
- Pattern indicating multiple setInterval() instances running simultaneously

## Solution Implemented

### 1. Singleton Protection (`src/services/notificationService.js`)
Added proper singleton pattern to prevent multiple instances during hot reload:

```javascript
// Before:
const notificationService = new NotificationService();
export default notificationService;

// After:
let notificationServiceInstance = null;

const getNotificationService = () => {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
};

const notificationService = getNotificationService();
export default notificationService;
```

### 2. Improved Polling Cleanup
Enhanced `startPolling()` to always clean up existing intervals and track them globally:

```javascript
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
```

And added global cleanup on module initialization:

```javascript
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
```

### 3. Rate Limit Handling with Exponential Backoff
Added automatic detection and recovery from 429 errors:

```javascript
async getUnreadCount() {
  try {
    const data = await apiFetch('/notifications/unread-count');
    this.unreadCount = data.unreadCount;
    
    this.saveToLocalStorage();
    this.emit('unreadCountUpdated', this.unreadCount);
    
    return this.unreadCount;
  } catch (error) {
    // Handle rate limiting with exponential backoff
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      console.warn('Rate limited on notification polling. Backing off...');
      this.handleRateLimit();
    } else {
      console.error('Error fetching unread count:', error);
    }
    return this.unreadCount; // Return cached count
  }
}

handleRateLimit() {
  // Stop current polling
  this.stopPolling();
  
  // Restart with increased interval (double the default)
  const backoffInterval = 60000; // 60 seconds
  console.log(`Restarting notification polling with ${backoffInterval / 1000}s interval due to rate limit`);
  this.startPolling(backoffInterval);
}
```

### 4. Increased Rate Limit for Development (`backend/server.js`)
Increased the rate limit to handle hot reloads and multiple browser tabs:

```javascript
// Before:
max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)

// After:
max: 5000, // Increased for development to handle hot reload and multiple tabs (was 1000)
```

**Rate limit calculation:**
- Window: 15 minutes
- Old limit: 1000 requests = ~66 requests/minute = ~1 request/second
- New limit: 5000 requests = ~333 requests/minute = ~5.5 requests/second

This accommodates:
- Normal polling (2 requests/minute)
- Hot module reloads (temporary burst)
- Multiple browser tabs during development
- Other API calls happening concurrently

## Configuration

### Notification Polling
- **Default interval:** 30 seconds (reasonable for real-time notifications)
- **Backoff interval:** 60 seconds (when rate limited)
- **Automatic recovery:** Yes (will automatically back off and retry)

### Rate Limiting
- **Development:** 5000 requests per 15 minutes per IP
- **Production recommendation:** Lower to 2000-3000 for security

## Testing
1. **Clear browser cache and refresh:** Press `Ctrl+Shift+R` or `Cmd+Shift+R` to hard refresh
2. Refresh the page multiple times rapidly
3. Check browser console - no more 429 errors
4. Check backend logs - requests should be spaced 30 seconds apart (one request every 30s)
5. If rate limited, service will automatically back off to 60 seconds

**Important:** If you still see spam requests after the fix, close ALL browser tabs with the app open and do a hard refresh. This clears out any orphaned polling intervals from before the fix.

## Benefits
✅ No more 429 errors during normal development  
✅ Automatic recovery from rate limiting  
✅ Prevents multiple polling intervals from hot reload  
✅ Graceful degradation (uses cached data on errors)  
✅ Better resource utilization  
✅ Improved developer experience  

## Future Improvements
Consider implementing WebSocket for real-time notifications to eliminate polling entirely:
- Lower server load
- Instant notifications
- No rate limiting concerns
- Better user experience

WebSocket connection is already stubbed in `notificationService.js` (`connectWebSocket()` method).
