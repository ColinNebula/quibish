# Offline Notifications - Quick Reference

## 🚀 Quick Setup (3 Steps)

### 1. Backend (Already Done ✅)
- Service: [backend/services/offlineNotificationService.js](backend/services/offlineNotificationService.js)
- Routes: [backend/routes/offline-notifications.js](backend/routes/offline-notifications.js)
- Package: nodemailer installed ✅

### 2. Frontend Integration

Add to your main app component:

```javascript
import offlineNotificationManager from './services/offlineNotificationManager';

function App() {
  useEffect(() => {
    // Initialize offline notifications
    const init = async () => {
      await offlineNotificationManager.registerServiceWorker();
      await offlineNotificationManager.requestNotificationPermission();
      await offlineNotificationManager.subscribeToPushNotifications();
      await offlineNotificationManager.updatePresence('online');
      await offlineNotificationManager.syncQueuedMessages();
    };
    
    init();

    // Listen for synced messages
    const handleSync = (event) => {
      console.log(`Received ${event.detail.count} offline messages`);
    };
    
    window.addEventListener('messages-synced', handleSync);
    return () => window.removeEventListener('messages-synced', handleSync);
  }, []);

  return <YourApp />;
}
```

### 3. Email Setup (Optional)

Create `.env` in backend folder:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**For Gmail**: Use App Password (not regular password)
1. Google Account → Security → 2-Step Verification
2. App passwords → Generate new
3. Copy and paste into `SMTP_PASS`

---

## 📡 How It Works

### When User is Online
1. Message sent → Delivered in real-time via WebSocket
2. Instant notification in browser

### When User is Offline
1. Message sent → System detects user offline
2. Message queued in memory
3. Email sent (if configured)
4. Push notification queued
5. When user returns → All queued messages delivered
6. Browser notification shown

---

## 🔌 API Endpoints

```
Base URL: http://localhost:5001/api/offline-notifications
```

### Get Queued Messages
```http
GET /queued
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 5,
  "messages": [...]
}
```

### Get Unread Count
```http
GET /unread-count
Authorization: Bearer <token>

Response:
{
  "success": true,
  "count": 5
}
```

### Update Presence
```http
POST /presence
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "online" | "offline",
  "socketId": "socket-id-here"
}
```

### Subscribe to Push
```http
POST /subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "subscription": {...},
  "deviceInfo": {
    "userAgent": "...",
    "platform": "..."
  }
}
```

### Update Preferences
```http
PUT /preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": true,
  "push": true,
  "desktop": true
}
```

---

## 💻 Code Examples

### Track Presence When Component Mounts

```javascript
useEffect(() => {
  offlineNotificationManager.updatePresence('online');
  return () => offlineNotificationManager.updatePresence('offline');
}, []);
```

### Show Unread Badge

```javascript
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  offlineNotificationManager.getUnreadCount().then(setUnreadCount);
  
  const handleSync = (e) => setUnreadCount(e.detail.count);
  window.addEventListener('messages-synced', handleSync);
  return () => window.removeEventListener('messages-synced', handleSync);
}, []);

return unreadCount > 0 && <Badge>{unreadCount}</Badge>;
```

### Send Message with Offline Handling

```javascript
// In your message sending endpoint
const offlineNotificationService = require('./services/offlineNotificationService');

app.post('/api/messages', async (req, res) => {
  const { recipientId, text } = req.body;
  
  // Save message to database
  const message = await saveMessage({ ...req.body });
  
  // Get recipient info
  const recipient = await User.findById(recipientId);
  const sender = req.user;
  
  // Handle offline notification
  const result = await offlineNotificationService.handleNewMessage(
    message,
    recipient,
    sender
  );
  
  res.json({ 
    success: true, 
    message,
    delivered: result.delivered,
    method: result.method
  });
});
```

---

## 🧪 Testing

### Test Email (Backend Console)

```javascript
node
> const service = require('./services/offlineNotificationService');
> service.sendEmailNotification(
    { email: 'test@example.com', username: 'testuser' },
    { text: 'Hello!' },
    { username: 'sender', name: 'Test Sender' }
  );
```

### Test Browser Notifications

1. Open app in browser
2. Grant notification permission
3. Send yourself a message
4. Close the browser tab
5. Send another message from different account
6. Browser should show notification

### Test Message Queuing

```javascript
// Simulate offline user
service.setUserOffline('user123');

// Queue messages
service.queueOfflineMessage('user123', {
  from: 'user456',
  text: 'Hello!',
  timestamp: new Date()
});

// Simulate user coming online
service.setUserOnline('user123', 'socket-id');
const queued = service.getQueuedMessages('user123');
console.log(queued); // Shows queued messages
```

---

## 🔧 Configuration

### Notification Types

Users can enable/disable each type:

```javascript
await offlineNotificationManager.updatePreferences({
  email: true,      // Email notifications
  push: true,       // Browser push notifications
  desktop: true     // Desktop notifications
});
```

### Customize Email Template

Edit [backend/services/offlineNotificationService.js](backend/services/offlineNotificationService.js):

```javascript
// Line ~80: sendEmailNotification method
html: `
  <h1>Custom Email Template</h1>
  <p>New message from ${sender.name}</p>
  <p>${message.text}</p>
`
```

---

## 🐛 Troubleshooting

### Service Worker Not Registering
- Check HTTPS (required) or localhost
- Check browser console for errors
- Verify [public/service-worker.js](public/service-worker.js) exists

### Email Not Sending
- Verify SMTP credentials in `.env`
- For Gmail, use App Password
- Check backend logs for errors
- Test with: `telnet smtp.gmail.com 587`

### Push Notifications Not Working
- HTTPS required (or localhost)
- Check notification permission granted
- Verify service worker registered
- Check browser compatibility

### Messages Not Syncing
- Verify auth token is valid
- Check network tab for API errors
- Verify service worker is active
- Check backend logs

---

## 📊 Monitor Status

### Check Offline Summary (Admin)

```javascript
fetch('http://localhost:5001/api/offline-notifications/admin/summary', {
  headers: { 'Authorization': 'Bearer ' + token }
})
.then(r => r.json())
.then(console.log);

// Response:
// {
//   "offlineUsers": 5,
//   "queuedMessages": 12,
//   "activeUsers": 8
// }
```

---

## 🌐 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Workers | ✅ | ✅ | ✅ | ✅ |
| Push API | ✅ | ✅ | ❌ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |

*Safari users will receive email notifications only*

---

## 📚 Full Documentation

See [OFFLINE_NOTIFICATIONS_GUIDE.md](OFFLINE_NOTIFICATIONS_GUIDE.md) for complete documentation.

---

**Status**: ✅ Production Ready (Email requires SMTP config)  
**Version**: 1.0  
**Last Updated**: January 2026
