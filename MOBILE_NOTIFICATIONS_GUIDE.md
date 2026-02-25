# Mobile Push Notifications Guide

## Overview
Quibish supports native push notifications on mobile devices, allowing users to receive instant message alerts even when the app is closed and reply directly from notifications.

## Features

### ✅ Implemented Features
1. **Permission Request UI** - Beautiful bottom sheet prompt asking for notification permission
2. **Push Notification Service** - Full service worker integration with VAPID keys
3. **Message Notifications** - Instant alerts when receiving new messages
4. **Quick Reply** - Reply directly from notification (iOS 16.4+, Android 9+)
5. **Notification Actions**:
   - **Open Chat** - Opens the conversation in the app
   - **Quick Reply** - Opens input to reply without opening app
   - **Dismiss** - Closes the notification
6. **Offline Support** - Notifications work even when app is closed
7. **Presence Detection** - Tracks online/offline status
8. **Smart Timing** - Shows permission prompt after 5 seconds, not immediately
9. **Local Storage Persistence** - Remembers dismissal for 24 hours

## How It Works

### 1. Permission Flow
```
User opens app → Wait 5 seconds → Show permission prompt
                              ↓
               User clicks "Enable Notifications"
                              ↓
                   Browser asks for permission
                              ↓
                  Permission granted → Subscribe to push
                              ↓
            Backend stores subscription with VAPID keys
                              ↓
                 Show test notification confirmation
```

### 2. Message Notification Flow
```
User receives message → Check if user is offline/inactive
                                    ↓
                      Push notification sent from backend
                                    ↓
                    Service worker receives push event
                                    ↓
                     Show notification with actions
                                    ↓
           User taps "Reply" → Open app with reply input focused
                                    ↓
                  User types message → Send instantly
```

## Browser Support

### Desktop
- ✅ Chrome 42+
- ✅ Firefox 44+
- ✅ Edge 17+
- ✅ Opera 29+
- ❌ Safari (macOS) - No push notification support

### Mobile
- ✅ Chrome Android 42+
- ✅ Firefox Android 44+
- ✅ Samsung Internet 4+
- ✅ Safari iOS 16.4+ (iOS only, limited features)
- ❌ Safari iOS < 16.4

### iOS Limitations
- **iOS 16.4+**: Full push notification support with actions
- **iOS < 16.4**: No push notification support (uses in-app notifications only)
- **PWA Mode**: Must be added to home screen for push notifications to work
- **Reply Action**: Supported in iOS 16.4+ but opens the app (no inline reply)

### Android
- **Full Support**: All modern Android browsers support push notifications
- **Inline Reply**: Supported in Android 9+ (tap reply shows text input)
- **Background**: Works even when app is completely closed
- **Power Saving**: May delay notifications in battery saver mode

## Setup Instructions

### Backend Configuration

1. **Generate VAPID Keys** (if not already done):
```bash
npm install web-push -g
web-push generate-vapid-keys
```

2. **Add to `.env`**:
```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

3. **Backend Routes** (already implemented):
- `GET /api/notifications/vapid-key` - Get public VAPID key
- `POST /api/notifications/subscribe` - Store push subscription
- `POST /api/notifications/unsubscribe` - Remove push subscription
- `POST /api/notifications/send-push` - Send push notification to user

### Frontend Implementation

The notification system is already integrated into `ProChat.js`:

```javascript
import NotificationPermissionPrompt from '../NotificationPermissionPrompt';

// In component render:
<NotificationPermissionPrompt
  onPermissionGranted={() => {
    console.log('✅ User granted notification permission');
  }}
  onPermissionDenied={() => {
    console.log('❌ User denied notification permission');
  }}
/>
```

### Service Worker

The service worker (`public/sw.js`) handles:
- Push event listening
- Notification display
- Click actions (open, reply, dismiss)
- Offline message queuing

## User Experience

### Permission Prompt
- **When**: Shows 5 seconds after app load (only once per 24 hours if dismissed)
- **Design**: Mobile-first bottom sheet with clear benefits
- **Features Listed**:
  - 💬 Instant message alerts
  - ⚡ Quick reply from notification
  - 🔒 Privacy protected
- **Actions**: "Enable Notifications" or "Not Now"

### Notification Appearance

**Android:**
```
┌─────────────────────────────────────────┐
│ 🔔 Quibish                              │
│ New message from John Doe               │
│ Hey! Are you free this weekend?         │
│                                         │
│ [Open Chat] [Quick Reply] [Dismiss]    │
└─────────────────────────────────────────┘
```

**iOS:**
```
┌─────────────────────────────────────────┐
│ Quibish                             🔔  │
│ New message from John Doe               │
│ Hey! Are you free this weekend?         │
│                                         │
│ Swipe for actions →                     │
└─────────────────────────────────────────┘
```

### Quick Reply Flow

1. User taps "Quick Reply" on notification
2. **Android**: Text input appears inline
3. **iOS**: App opens with reply input focused
4. User types message
5. Message sends automatically
6. Notification closes

## Testing

### Test Notification
```javascript
// In browser console after granting permission:
pushNotificationService.testNotification('This is a test message!');
```

### Sending Push to User
```javascript
// Backend API
POST /api/notifications/send-push
{
  "userId": "user123",
  "title": "Test Message",
  "body": "This is a test notification",
  "data": {
    "messageId": "msg456",
    "conversationId": "conv789"
  }
}
```

### Check Subscription Status
```javascript
// In browser console:
pushNotificationService.getSubscriptionStatus();
```

## Troubleshooting

### Notifications Not Showing
1. **Check Permission**:
   - Open browser site settings
   - Ensure notifications are allowed
   - Reset if denied

2. **Check Service Worker**:
   - Open DevTools → Application → Service Workers
   - Ensure worker is active and running
   - Click "Update" to reload

3. **Check Subscription**:
   ```javascript
   navigator.serviceWorker.ready.then(reg => {
     reg.pushManager.getSubscription().then(sub => {
       console.log('Subscription:', sub);
     });
   });
   ```

4. **Check VAPID Keys**:
   - Ensure backend has valid VAPID keys configured
   - Public key length should be 88 characters
   - Test endpoint: `GET /api/notifications/vapid-key`

### iOS Not Working
- Ensure iOS 16.4 or later
- App must be added to home screen (PWA mode)
- Check Safari → Settings → Notifications → Quibish
- Try removing and re-adding to home screen

### Android Delayed Notifications
- Check battery optimization settings
- Disable battery saver for browser
- Ensure "Background data" is enabled
- Check Do Not Disturb settings

## Privacy & Security

- ✅ User must explicitly grant permission
- ✅ Can revoke permission anytime in browser settings
- ✅ Notifications only show to intended recipient
- ✅ End-to-end encryption supported (optional)
- ✅ No message content stored on notification servers
- ✅ VAPID keys ensure notifications come from legitimate server
- ✅ Subscription stored securely on backend with user authentication

## Best Practices

1. **Don't Ask Immediately**: Wait for user to engage with app first (5-10 seconds)
2. **Show Value**: Explain why notifications are useful
3. **Respect "Not Now"**: Don't ask again for at least 24 hours
4. **Test Messages**: Show confirmation notification after enabling
5. **Graceful Degradation**: App works fine without notifications
6. **Clear Actions**: Keep notification actions simple and clear
7. **Relevant Content**: Only send important notifications
8. **Quiet Hours**: Consider time zones and user preferences

## API Reference

### PushNotificationService

```javascript
// Initialize (called automatically on app load)
await pushNotificationService.initialize(userId);

// Request permission (shows browser prompt)
await pushNotificationService.requestPermission();

// Show test notification
pushNotificationService.testNotification('Test message');

// Show message notification
pushNotificationService.showMessageNotification({
  id: 'msg123',
  sender: 'John Doe',
  text: 'Hey there!',
  senderAvatar: '/avatars/john.jpg',
  conversationId: 'conv456',
  senderId: 'user789'
});

// Unsubscribe
await pushNotificationService.unsubscribe();

// Check status
const status = pushNotificationService.getSubscriptionStatus();
```

### NotificationPermissionPrompt Component

```javascript
<NotificationPermissionPrompt
  onPermissionGranted={() => {
    // Called when user grants permission
    console.log('Permission granted!');
  }}
  onPermissionDenied={() => {
    // Called when user denies permission
    console.log('Permission denied');
  }}
/>
```

## Future Enhancements

- [ ] **Rich Notifications**: Show message preview with images
- [ ] **Inline Reply on iOS**: When iOS fully supports it
- [ ] **Notification Grouping**: Stack multiple messages from same sender
- [ ] **Custom Sounds**: Different sounds for different message types
- [ ] **Quiet Hours**: Don't send notifications during user's sleep time
- [ ] **Priority Levels**: Important vs normal vs low priority
- [ ] **Notification History**: View dismissed notifications
- [ ] **Mute Conversations**: Per-conversation notification settings

## Related Files

- `src/components/NotificationPermissionPrompt/` - Permission UI component
- `src/services/pushNotificationService.js` - Main notification service
- `public/sw.js` - Service worker with push handling
- `backend/routes/notifications.js` - Backend notification API
- `backend/middleware/security.js` - Rate limiting for notification endpoints

## Support

For issues or questions:
1. Check browser console for errors
2. Verify backend VAPID keys are configured
3. Test in incognito mode (clears previous permission state)
4. Check mobile browser version compatibility
5. Review DevTools → Application → Service Workers

## Conclusion

The mobile notification system is fully implemented and production-ready. Users will see a friendly permission prompt after 5 seconds, and once enabled, they'll receive instant message alerts with the ability to reply directly from notifications on supported devices.
