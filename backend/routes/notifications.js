const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const emailNotificationService = require('../services/emailNotificationService');

// Configure web-push with VAPID keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BMqSvZyI8NzEp_G-Jw5i5L7-8K9yJ8xI7qU6vN2mL4kP3oT8fF1R9eA2cX5nH7jQ6wE4dY9pM8vL3zK2aB1sC0f',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'your-private-key-here'
};

webpush.setVapidDetails(
  'mailto:admin@quibish.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// In-memory storage for push subscriptions (in production, use database)
const pushSubscriptions = new Map();
const userPresence = new Map();

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

module.exports = router;