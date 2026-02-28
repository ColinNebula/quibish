const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const emailNotificationService = require('../services/emailNotificationService');
const fs = require('fs').promises;
const path = require('path');

// Store user presence (in production, use a proper database)
const userPresence = new Map();

// Notification types
const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted', 
  MENTION: 'mention',
  VIDEO_CALL: 'video_call',
  VOICE_CALL: 'voice_call',
  FILE_SHARED: 'file_shared',
  GROUP_INVITE: 'group_invite',
  SYSTEM: 'system',
  POST_LIKE: 'post_like'
};

// Mock database for notifications
const notificationsFile = path.join(__dirname, '../data/notifications.json');

// Initialize notifications file if it doesn't exist
async function initializeNotifications() {
  try {
    await fs.access(notificationsFile);
  } catch (error) {
    const dataDir = path.dirname(notificationsFile);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(notificationsFile, JSON.stringify([]));
  }
}

// Load notifications from file
async function loadNotifications() {
  try {
    const data = await fs.readFile(notificationsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading notifications:', error);
    return [];
  }
}

// Save notifications to file
async function saveNotifications(notifications) {
  try {
    await fs.writeFile(notificationsFile, JSON.stringify(notifications, null, 2));
  } catch (error) {
    console.error('Error saving notifications:', error);
  }
}

// Generate unique notification ID
function generateNotificationId() {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create new notification
async function createNotification(userId, type, title, message, data = {}) {
  const notifications = await loadNotifications();
  
  const notification = {
    id: generateNotificationId(),
    userId,
    type,
    title,
    message,
    data,
    read: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  notifications.push(notification);
  await saveNotifications(notifications);
  
  // Emit real-time notification via WebSocket if available
  if (global.sendToUser) {
    global.sendToUser(userId, { type: 'notification', notification });
  }
  
  return notification;
}

// Initialize on startup
initializeNotifications();

// Middleware for authentication (simplified)
const authenticateUser = (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.query.userId || 'user1';
  req.userId = userId;
  next();
};

// GET /api/notifications - Get user's notifications
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { limit = 50, offset = 0, unread = false } = req.query;
    const notifications = await loadNotifications();
    
    // Filter by user
    let userNotifications = notifications.filter(n => n.userId === req.userId);
    
    // Filter by unread if specified
    if (unread === 'true') {
      userNotifications = userNotifications.filter(n => !n.read);
    }
    
    // Sort by creation date (newest first)
    userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = userNotifications.slice(startIndex, endIndex);
    
    // Count unread notifications
    const unreadCount = userNotifications.filter(n => !n.read).length;
    
    res.json({
      notifications: paginatedNotifications,
      total: userNotifications.length,
      unreadCount,
      hasMore: endIndex < userNotifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', authenticateUser, async (req, res) => {
  try {
    const notifications = await loadNotifications();
    const unreadCount = notifications.filter(n => 
      n.userId === req.userId && !n.read
    ).length;
    
    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticateUser, async (req, res) => {
  try {
    const notifications = await loadNotifications();
    const notificationIndex = notifications.findIndex(n => 
      n.id === req.params.id && n.userId === req.userId
    );
    
    if (notificationIndex === -1) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    notifications[notificationIndex].read = true;
    notifications[notificationIndex].updatedAt = new Date().toISOString();
    
    await saveNotifications(notifications);
    
    res.json({ success: true, notification: notifications[notificationIndex] });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', authenticateUser, async (req, res) => {
  try {
    const notifications = await loadNotifications();
    let updatedCount = 0;
    
    notifications.forEach(notification => {
      if (notification.userId === req.userId && !notification.read) {
        notification.read = true;
        notification.updatedAt = new Date().toISOString();
        updatedCount++;
      }
    });
    
    await saveNotifications(notifications);
    
    res.json({ success: true, updatedCount });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const notifications = await loadNotifications();
    const originalLength = notifications.length;
    
    const filteredNotifications = notifications.filter(n => 
      !(n.id === req.params.id && n.userId === req.userId)
    );
    
    if (filteredNotifications.length === originalLength) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await saveNotifications(filteredNotifications);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// POST /api/notifications/create - Create new notification
router.post('/create', authenticateUser, async (req, res) => {
  try {
    const { type, title, message, data = {}, targetUserId } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({ error: 'Type, title, and message are required' });
    }
    
    if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }
    
    const userId = targetUserId || req.userId;
    const notification = await createNotification(userId, type, title, message, data);
    
    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// POST /api/notifications/presence - Update user presence
router.post('/presence', authenticateUser, async (req, res) => {
  try {
    const { isOnline, lastSeen } = req.body;
    
    // Store user presence (in production, use a proper database)
    userPresence.set(req.userId, {
      isOnline: Boolean(isOnline),
      lastSeen: lastSeen || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log(`📍 User presence updated: ${req.userId} - ${isOnline ? 'online' : 'offline'}`);
    
    // Emit presence update via WebSocket if available
    if (global.io) {
      global.io.emit('presenceUpdate', {
        userId: req.userId,
        isOnline: Boolean(isOnline),
        lastSeen: lastSeen || new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      presence: {
        userId: req.userId,
        isOnline: Boolean(isOnline),
        lastSeen: lastSeen || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({ error: 'Failed to update presence' });
  }
});

// GET /api/notifications/presence/:userId - Get user presence
router.get('/presence/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const presence = userPresence.get(userId);
    
    if (!presence) {
      return res.json({
        userId,
        isOnline: false,
        lastSeen: null
      });
    }
    
    res.json({
      userId,
      ...presence
    });
  } catch (error) {
    console.error('Error getting presence:', error);
    res.status(500).json({ error: 'Failed to get presence' });
  }
});

// GET /api/notifications/presence - Get all user presences
router.get('/presence', authenticateUser, async (req, res) => {
  try {
    const allPresences = {};
    
    for (const [userId, presence] of userPresence.entries()) {
      allPresences[userId] = presence;
    }
    
    res.json({ presences: allPresences });
  } catch (error) {
    console.error('Error getting all presences:', error);
    res.status(500).json({ error: 'Failed to get presences' });
  }
});
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || null,
  privateKey: process.env.VAPID_PRIVATE_KEY || null
};

// Only set VAPID details if both keys are provided and valid
if (vapidKeys.publicKey && vapidKeys.privateKey && vapidKeys.privateKey !== 'your-private-key-here') {
  try {
    webpush.setVapidDetails(
      'mailto:admin@quibish.app',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
    console.log('✅ VAPID keys configured for push notifications');
  } catch (error) {
    console.warn('⚠️ Invalid VAPID keys, push notifications disabled:', error.message);
    vapidKeys.publicKey = null;
    vapidKeys.privateKey = null;
  }
} else {
  console.warn('⚠️ VAPID keys not configured, push notifications disabled');
}

// In-memory storage for push subscriptions (in production, use database)
const pushSubscriptions = new Map();


// Get VAPID public key
router.get('/vapid-key', (req, res) => {
  try {
    res.json({
      publicKey: vapidKeys.publicKey
    });
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    res.status(500).json({ error: 'Failed to get VAPID key' });
  }
});

// Subscribe to push notifications
router.post('/subscribe', (req, res) => {
  try {
    const { subscription, userId } = req.body;
    
    if (!subscription || !userId) {
      return res.status(400).json({ error: 'Subscription and userId required' });
    }

    // Store subscription for user
    pushSubscriptions.set(userId, subscription);
    
    console.log(`✅ Push subscription registered for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Push subscription registered successfully'
    });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'UserId required' });
    }

    // Remove subscription for user
    pushSubscriptions.delete(userId);
    
    console.log(`✅ Push subscription removed for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Push subscription removed successfully'
    });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
});

// Send push notification to specific user
router.post('/send-push', async (req, res) => {
  try {
    const { userId, title, body, data = {}, icon, badge } = req.body;
    
    if (!userId || !title) {
      return res.status(400).json({ error: 'UserId and title required' });
    }

    const subscription = pushSubscriptions.get(userId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'No push subscription found for user' });
    }

    const payload = JSON.stringify({
      title,
      body: body || 'You have a new notification',
      icon: icon || '/logo192.png',
      badge: badge || '/logo192.png',
      data,
      timestamp: Date.now()
    });

    await webpush.sendNotification(subscription, payload);
    
    console.log(`✅ Push notification sent to user ${userId}`);
    
    res.json({
      success: true,
      message: 'Push notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // If subscription is invalid, remove it
    if (error.statusCode === 410) {
      pushSubscriptions.delete(req.body.userId);
    }
    
    res.status(500).json({ error: 'Failed to send push notification' });
  }
});

// Send message notification (both push and email)
router.post('/message-notification', async (req, res) => {
  try {
    const {
      recipientId,
      recipientEmail,
      senderName,
      senderAvatar,
      messageText,
      conversationId,
      messageId
    } = req.body;

    if (!recipientId || !senderName || !messageText) {
      return res.status(400).json({ error: 'Missing required notification data' });
    }

    const results = {
      push: false,
      email: false
    };

    // Check if user is offline
    const userStatus = userPresence.get(recipientId);
    const isUserOffline = !userStatus || !userStatus.isOnline || 
      (Date.now() - new Date(userStatus.lastSeen).getTime()) > 5 * 60 * 1000; // 5 minutes

    if (isUserOffline) {
      // Send push notification
      const pushSubscription = pushSubscriptions.get(recipientId);
      if (pushSubscription) {
        try {
          const pushPayload = JSON.stringify({
            title: `New message from ${senderName}`,
            body: messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText,
            icon: senderAvatar || '/logo192.png',
            badge: '/logo192.png',
            tag: `message-${messageId}`,
            messageId,
            conversationId,
            senderId: recipientId,
            timestamp: Date.now()
          });

          await webpush.sendNotification(pushSubscription, pushPayload);
          results.push = true;
          console.log(`✅ Push notification sent for message ${messageId}`);
        } catch (pushError) {
          console.error('Push notification failed:', pushError);
          if (pushError.statusCode === 410) {
            pushSubscriptions.delete(recipientId);
          }
        }
      }

      // Send email notification if user has email
      if (recipientEmail) {
        try {
          const emailData = {
            senderName,
            messagePreview: messageText.length > 200 ? messageText.substring(0, 200) + '...' : messageText,
            timestamp: new Date().toISOString(),
            conversationUrl: `${process.env.APP_URL || 'http://localhost:3002'}/quibish?conversation=${conversationId}`,
            unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:3002'}/quibish/unsubscribe?token=user-token`
          };

          const emailSent = await emailNotificationService.sendMessageNotification(recipientEmail, emailData);
          results.email = emailSent;
          
          if (emailSent) {
            console.log(`✅ Email notification sent for message ${messageId}`);
          }
        } catch (emailError) {
          console.error('Email notification failed:', emailError);
        }
      }
    } else {
      console.log(`User ${recipientId} is online, skipping offline notifications`);
    }

    res.json({
      success: true,
      message: 'Notification processing complete',
      results
    });
  } catch (error) {
    console.error('Error processing message notification:', error);
    res.status(500).json({ error: 'Failed to process message notification' });
  }
});

// Update user presence status
router.post('/presence', (req, res) => {
  try {
    const { userId, isOnline, lastSeen } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'UserId required' });
    }

    userPresence.set(userId, {
      isOnline: Boolean(isOnline),
      lastSeen: lastSeen || new Date().toISOString()
    });

    console.log(`User ${userId} presence updated: ${isOnline ? 'online' : 'offline'}`);

    res.json({
      success: true,
      message: 'Presence updated successfully'
    });
  } catch (error) {
    console.error('Error updating user presence:', error);
    res.status(500).json({ error: 'Failed to update user presence' });
  }
});

// Get user presence status
router.get('/presence/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const presence = userPresence.get(userId) || {
      isOnline: false,
      lastSeen: null
    };

    res.json(presence);
  } catch (error) {
    console.error('Error getting user presence:', error);
    res.status(500).json({ error: 'Failed to get user presence' });
  }
});

// Send test notification
router.post('/test', async (req, res) => {
  try {
    const { userId, type = 'push' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'UserId required' });
    }

    if (type === 'push') {
      const subscription = pushSubscriptions.get(userId);
      if (!subscription) {
        return res.status(404).json({ error: 'No push subscription found' });
      }

      const payload = JSON.stringify({
        title: 'Test Notification',
        body: 'This is a test notification from Quibish!',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'test-notification'
      });

      await webpush.sendNotification(subscription, payload);
      
      res.json({
        success: true,
        message: 'Test push notification sent'
      });
    } else if (type === 'email') {
      // Test email would require recipient email
      res.json({
        success: true,
        message: 'Email test not implemented yet'
      });
    } else {
      res.status(400).json({ error: 'Invalid notification type' });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Get notification statistics
router.get('/stats', (req, res) => {
  try {
    const stats = {
      totalPushSubscriptions: pushSubscriptions.size,
      totalUsersOnline: Array.from(userPresence.values()).filter(p => p.isOnline).length,
      totalUsersOffline: Array.from(userPresence.values()).filter(p => !p.isOnline).length,
      emailServiceConfigured: emailNotificationService.isConfigured
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({ error: 'Failed to get notification stats' });
  }
});

// Helper function to create system notifications
async function createSystemNotification(userId, message, data = {}) {
  return await createNotification(userId, NOTIFICATION_TYPES.SYSTEM, 'System Notification', message, data);
}

// Helper function to create message notifications
async function createMessageNotification(userId, fromUser, message, conversationId) {
  const data = {
    fromUserId: fromUser.id,
    fromUserName: fromUser.name,
    conversationId,
    messagePreview: message.substring(0, 100)
  };
  
  return await createNotification(
    userId, 
    NOTIFICATION_TYPES.MESSAGE, 
    `New message from ${fromUser.name}`, 
    message.substring(0, 100) + (message.length > 100 ? '...' : ''),
    data
  );
}

// Helper function to create friend request notifications
async function createFriendRequestNotification(userId, fromUser) {
  const data = {
    fromUserId: fromUser.id,
    fromUserName: fromUser.name,
    fromUserAvatar: fromUser.avatar
  };
  
  return await createNotification(
    userId,
    NOTIFICATION_TYPES.FRIEND_REQUEST,
    'New Friend Request',
    `${fromUser.name} wants to be your friend`,
    data
  );
}

// Helper function to create call notifications
async function createCallNotification(userId, fromUser, callType = 'video') {
  const data = {
    fromUserId: fromUser.id,
    fromUserName: fromUser.name,
    callType,
    timestamp: new Date().toISOString()
  };
  
  const notifType = callType === 'video' ? NOTIFICATION_TYPES.VIDEO_CALL : NOTIFICATION_TYPES.VOICE_CALL;
  
  return await createNotification(
    userId,
    notifType,
    `Incoming ${callType} call`,
    `${fromUser.name} is calling you`,
    data
  );
}

// Export helper functions
module.exports = router;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
module.exports.createNotification = createNotification;
module.exports.createSystemNotification = createSystemNotification;
module.exports.userPresence = userPresence;
module.exports.createMessageNotification = createMessageNotification;
module.exports.createFriendRequestNotification = createFriendRequestNotification;
module.exports.createCallNotification = createCallNotification;