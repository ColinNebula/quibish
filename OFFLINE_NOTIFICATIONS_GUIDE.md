# Offline Notifications System - Complete Guide

## Overview

This system ensures users are notified about new messages when they're offline through multiple channels:

- 📧 **Email Notifications** - Sends emails for offline messages
- 🔔 **Push Notifications** - Browser push notifications via Service Worker
- 📬 **Message Queuing** - Stores messages for offline users
- 🔄 **Background Sync** - Automatically syncs when users come back online
- 👤 **Presence Tracking** - Monitors online/offline status

## Quick Start

### 1. Backend Setup

The offline notification service is automatically loaded in `backend/server.js`:

```javascript
const offlineNotificationRoutes = require('./routes/offline-notifications');
app.use('/api/offline-notifications', offlineNotificationRoutes);
```

### 2. Frontend Integration

Add to your main `App.js` or `index.js`:

```javascript
import offlineNotificationManager from './services/offlineNotificationManager';

// Initialize on app start
useEffect(() => {
  const initNotifications = async () => {
    // Register service worker
    await offlineNotificationManager.registerServiceWorker();
    
    // Request notification permission
    await offlineNotificationManager.requestNotificationPermission();
    
    // Subscribe to push notifications
    await offlineNotificationManager.subscribeToPushNotifications();
    
    // Set user as online
    await offlineNotificationManager.updatePresence('online');
    
    // Sync any queued messages
    await offlineNotificationManager.syncQueuedMessages();
  };

  initNotifications();

  // Listen for synced messages
  window.addEventListener('messages-synced', (event) => {
    const { count, messages } = event.detail;
    console.log(`Received ${count} offline messages`);
    // Update your UI with new messages
  });
}, []);
```

### 3. Email Configuration (Optional)

Add to your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

For Gmail, generate an App Password:
1. Go to Google Account Settings
2. Security → 2-Step Verification
3. App passwords → Generate new password
4. Use that password in `SMTP_PASS`

## Architecture

### Backend Components

#### 1. OfflineNotificationService
**Location**: `backend/services/offlineNotificationService.js`

Manages:
- User presence tracking (online/offline)
- Message queuing for offline users
- Email notifications
- Push notification coordination

```javascript
// Example: Send notification when user sends message
const offlineNotificationService = require('./services/offlineNotificationService');

// In your message route
app.post('/api/messages', async (req, res) => {
  const { recipientId, message } = req.body;
  const recipient = await getUserById(recipientId);
  const sender = req.user;
  
  // Handle offline notification
  await offlineNotificationService.handleNewMessage(
    message,
    recipient,
    sender
  );
});
```

#### 2. Offline Notifications Routes
**Location**: `backend/routes/offline-notifications.js`

API Endpoints:

```
GET    /api/offline-notifications/queued          - Get queued messages
GET    /api/offline-notifications/unread-count    - Get unread count
POST   /api/offline-notifications/presence        - Update online/offline status
POST   /api/offline-notifications/subscribe       - Subscribe to push notifications
PUT    /api/offline-notifications/preferences     - Update notification preferences
GET    /api/offline-notifications/admin/summary   - Get offline summary (admin)
```

### Frontend Components

#### 1. OfflineNotificationManager
**Location**: `src/services/offlineNotificationManager.js`

Handles:
- Service Worker registration
- Push notification subscription
- Online/offline detection
- Message syncing
- Local notifications

```javascript
import offlineNotificationManager from './services/offlineNotificationManager';

// Check if user is online
const isOnline = offlineNotificationManager.isOnline;

// Get unread count
const count = await offlineNotificationManager.getUnreadCount();

// Update notification preferences
await offlineNotificationManager.updatePreferences({
  email: true,
  push: true,
  desktop: true
});
```

#### 2. Service Worker
**Location**: `public/service-worker.js`

Features:
- Background message syncing
- Push notification handling
- Notification click handling
- Periodic sync (if supported)

## Usage Examples

### Track User Presence in React Component

```javascript
import { useEffect } from 'react';
import offlineNotificationManager from './services/offlineNotificationManager';

function ChatComponent() {
  useEffect(() => {
    // Set online when component mounts
    offlineNotificationManager.updatePresence('online');
    
    // Set offline when component unmounts
    return () => {
      offlineNotificationManager.updatePresence('offline');
    };
  }, []);
  
  return <div>Chat Interface</div>;
}
```

### Show Notification Count Badge

```javascript
import { useState, useEffect } from 'react';
import offlineNotificationManager from './services/offlineNotificationManager';

function NotificationBadge() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Initial load
    offlineNotificationManager.getUnreadCount()
      .then(setCount);
    
    // Listen for synced messages
    const handleSync = (event) => {
      setCount(event.detail.count);
    };
    
    window.addEventListener('messages-synced', handleSync);
    return () => window.removeEventListener('messages-synced', handleSync);
  }, []);
  
  if (count === 0) return null;
  
  return (
    <div className="badge">
      {count}
    </div>
  );
}
```

### WebSocket Integration

```javascript
// In your WebSocket connection handler
const io = require('socket.io')(server);
const offlineNotificationService = require('./services/offlineNotificationService');

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  
  // Set user online with socket ID
  offlineNotificationService.setUserOnline(userId, socket.id);
  
  // When user disconnects
  socket.on('disconnect', () => {
    offlineNotificationService.setUserOffline(userId);
  });
  
  // When sending a message
  socket.on('send-message', async (data) => {
    const { recipientId, message } = data;
    
    // Check if recipient is online
    const isOnline = offlineNotificationService.isUserOnline(recipientId);
    
    if (isOnline) {
      // Send via WebSocket
      const socketId = offlineNotificationService.getUserSocketId(recipientId);
      io.to(socketId).emit('new-message', message);
    } else {
      // Queue for offline delivery
      const recipient = await getUserById(recipientId);
      const sender = await getUserById(userId);
      await offlineNotificationService.handleNewMessage(message, recipient, sender);
    }
  });
});
```

## Configuration Options

### Notification Preferences

Users can control which notifications they receive:

```javascript
// Update preferences
await offlineNotificationManager.updatePreferences({
  email: true,      // Email notifications
  push: true,       // Browser push notifications
  desktop: true     // Desktop notifications
});
```

Store preferences in user profile:

```javascript
// In user model/schema
{
  emailNotifications: { type: Boolean, default: true },
  pushNotifications: { type: Boolean, default: true },
  desktopNotifications: { type: Boolean, default: true }
}
```

## Testing

### Test Email Notifications

```javascript
// In your backend console or test file
const offlineNotificationService = require('./services/offlineNotificationService');

const testUser = {
  email: 'test@example.com',
  username: 'testuser'
};

const testMessage = {
  text: 'This is a test message'
};

const testSender = {
  username: 'sender',
  name: 'Test Sender'
};

offlineNotificationService.sendEmailNotification(
  testUser,
  testMessage,
  testSender
);
```

### Test Push Notifications

1. Open your app in browser
2. Grant notification permission when prompted
3. Open DevTools → Application → Service Workers
4. Check "Update on reload" and "Bypass for network"
5. Send a message while user is "offline" (close the tab)
6. Should receive browser notification

### Test Message Queuing

```javascript
// Simulate offline user
offlineNotificationService.setUserOffline('user123');

// Queue some messages
offlineNotificationService.queueOfflineMessage('user123', {
  from: 'user456',
  text: 'Hello!',
  timestamp: new Date()
});

// Get queued messages (simulates user coming online)
const queued = offlineNotificationService.getQueuedMessages('user123');
console.log(queued); // Should show the queued message
```

## API Reference

### Backend Service Methods

```javascript
const offlineNotificationService = require('./services/offlineNotificationService');

// Presence tracking
offlineNotificationService.setUserOnline(userId, socketId);
offlineNotificationService.setUserOffline(userId);
offlineNotificationService.isUserOnline(userId);
offlineNotificationService.getUserSocketId(userId);

// Message queuing
offlineNotificationService.queueOfflineMessage(userId, message);
offlineNotificationService.getQueuedMessages(userId);
offlineNotificationService.getUnreadCount(userId);

// Notifications
await offlineNotificationService.sendEmailNotification(user, message, sender);
await offlineNotificationService.sendPushNotification(userId, message, sender);
await offlineNotificationService.handleNewMessage(message, recipient, sender);

// Admin
offlineNotificationService.getOfflineSummary();
```

### Frontend Manager Methods

```javascript
import offlineNotificationManager from './services/offlineNotificationManager';

// Service Worker
await offlineNotificationManager.registerServiceWorker();

// Permissions
await offlineNotificationManager.requestNotificationPermission();
await offlineNotificationManager.subscribeToPushNotifications();

// Presence
await offlineNotificationManager.updatePresence('online' | 'offline');

// Sync
await offlineNotificationManager.syncQueuedMessages();
await offlineNotificationManager.getUnreadCount();

// Notifications
offlineNotificationManager.showLocalNotification(title, body, options);

// Preferences
await offlineNotificationManager.updatePreferences({ email, push, desktop });

// State
offlineNotificationManager.isOnline;
offlineNotificationManager.notificationPermission;
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Workers | ✅ | ✅ | ✅ | ✅ |
| Push API | ✅ | ✅ | ❌ | ✅ |
| Notifications API | ✅ | ✅ | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |

**Note**: Safari doesn't support Push API, so email notifications are the fallback.

## Security Considerations

1. **Authentication**: All API endpoints require JWT authentication
2. **HTTPS Required**: Push notifications only work over HTTPS (or localhost)
3. **User Consent**: Always request permission before subscribing to notifications
4. **Email Privacy**: Validate email addresses before sending notifications
5. **Rate Limiting**: Implemented to prevent notification spam

## Troubleshooting

### Service Worker Not Registering

```javascript
// Check if HTTPS or localhost
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  console.error('Service Workers require HTTPS');
}

// Check service worker support
if (!('serviceWorker' in navigator)) {
  console.error('Service Workers not supported');
}
```

### Push Notifications Not Working

1. Check browser console for errors
2. Verify HTTPS connection (required)
3. Confirm notification permission granted
4. Check VAPID keys are configured
5. Verify service worker is active (DevTools → Application)

### Emails Not Sending

1. Check SMTP credentials in `.env`
2. For Gmail, use App Password not regular password
3. Check firewall isn't blocking port 587
4. Verify email address format
5. Check spam folder

### Messages Not Syncing

1. Check network connection
2. Verify auth token is valid
3. Check service worker is registered
4. Open Network tab and look for failed requests
5. Check backend logs for errors

## Performance Optimization

### Reduce Memory Usage

```javascript
// In backend service
// Clear old queued messages after 7 days
setInterval(() => {
  const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
  for (const [userId, messages] of this.offlineMessages) {
    const filtered = messages.filter(m => 
      new Date(m.queuedAt).getTime() > cutoff
    );
    if (filtered.length === 0) {
      this.offlineMessages.delete(userId);
    } else {
      this.offlineMessages.set(userId, filtered);
    }
  }
}, 24 * 60 * 60 * 1000); // Daily cleanup
```

### Batch Notifications

```javascript
// Instead of sending email for each message
// Batch them and send digest
const BATCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

setInterval(async () => {
  for (const [userId, messages] of this.offlineMessages) {
    if (messages.length > 0) {
      await this.sendDigestEmail(userId, messages);
      messages.length = 0; // Clear after sending
    }
  }
}, BATCH_INTERVAL);
```

## Next Steps

1. ✅ System is ready to use - just add SMTP credentials for email
2. 📱 Consider adding mobile push notifications (FCM/APNs)
3. 💾 Persist queued messages to database for production
4. 📊 Add analytics to track notification delivery rates
5. 🎨 Create UI for notification preferences
6. 🔐 Add end-to-end encryption for push notification payloads
7. 📧 Implement email templates with branding
8. 🌐 Add SMS notifications as additional channel

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs
3. Review this guide's troubleshooting section
4. Test with curl/Postman to isolate frontend vs backend issues

---

**Created**: January 2026  
**Status**: Production Ready (Email requires SMTP configuration)  
**Maintainer**: Quibish Development Team
