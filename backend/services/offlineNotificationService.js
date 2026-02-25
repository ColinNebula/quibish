const nodemailer = require('nodemailer');

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email service not configured:', error.message);
    console.log('💡 Set SMTP_USER and SMTP_PASS in .env to enable email notifications');
  } else {
    console.log('✅ Email service ready');
  }
});

class OfflineNotificationService {
  constructor() {
    this.offlineMessages = new Map(); // userId -> [messages]
    this.userPresence = new Map(); // userId -> { online, lastSeen, socketId }
  }

  // Track user online/offline status
  setUserOnline(userId, socketId) {
    this.userPresence.set(userId, {
      online: true,
      lastSeen: new Date(),
      socketId
    });
    console.log(`👤 User ${userId} is now online`);
  }

  setUserOffline(userId) {
    const presence = this.userPresence.get(userId);
    if (presence) {
      presence.online = false;
      presence.lastSeen = new Date();
      presence.socketId = null;
      this.userPresence.set(userId, presence);
      console.log(`👤 User ${userId} is now offline`);
    }
  }

  isUserOnline(userId) {
    const presence = this.userPresence.get(userId);
    return presence && presence.online;
  }

  getUserSocketId(userId) {
    const presence = this.userPresence.get(userId);
    return presence?.socketId;
  }

  // Queue message for offline user
  queueOfflineMessage(userId, message) {
    if (!this.offlineMessages.has(userId)) {
      this.offlineMessages.set(userId, []);
    }
    
    const messages = this.offlineMessages.get(userId);
    messages.push({
      ...message,
      queuedAt: new Date()
    });
    
    console.log(`📬 Queued message for offline user ${userId}`);
  }

  // Get queued messages for user
  getQueuedMessages(userId) {
    const messages = this.offlineMessages.get(userId) || [];
    this.offlineMessages.delete(userId); // Clear after retrieving
    return messages;
  }

  // Get unread message count for user
  getUnreadCount(userId) {
    const messages = this.offlineMessages.get(userId) || [];
    return messages.length;
  }

  // Send email notification
  async sendEmailNotification(user, message, sender) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️  Email notifications disabled - SMTP not configured');
      return;
    }

    try {
      const mailOptions = {
        from: `"Quibish" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: `New message from ${sender.name || sender.username}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .message { background: white; padding: 15px; border-left: 4px solid #667eea; 
                        margin: 15px 0; border-radius: 4px; }
              .sender { font-weight: bold; color: #667eea; margin-bottom: 10px; }
              .button { display: inline-block; background: #667eea; color: white; 
                       padding: 12px 30px; text-decoration: none; border-radius: 5px; 
                       margin-top: 15px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>💬 You have a new message on Quibish</h2>
              </div>
              <div class="content">
                <div class="message">
                  <div class="sender">From: ${sender.name || sender.username}</div>
                  <div>${message.text || message.content || 'New message received'}</div>
                </div>
                <a href="http://localhost:3000/quibish" class="button">View Message</a>
                <div class="footer">
                  <p>You're receiving this because you have notifications enabled.</p>
                  <p>To stop receiving these emails, update your notification preferences.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `You have a new message from ${sender.name || sender.username}: ${message.text || message.content}`
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Email notification sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
    }
  }

  // Send push notification (Web Push API)
  async sendPushNotification(userId, message, sender) {
    // This would integrate with Web Push API
    // For now, we'll log the intent
    console.log(`🔔 Push notification queued for user ${userId}`);
    
    // Store notification for when user comes online
    if (!this.offlineMessages.has(userId)) {
      this.offlineMessages.set(userId, []);
    }
    
    const notifications = this.offlineMessages.get(userId);
    notifications.push({
      type: 'push',
      from: sender,
      message,
      timestamp: new Date()
    });
  }

  // Handle new message - decide notification strategy
  async handleNewMessage(message, recipient, sender) {
    const isOnline = this.isUserOnline(recipient.id || recipient._id);
    
    if (isOnline) {
      console.log(`✅ User ${recipient.username} is online - delivering in real-time`);
      return { delivered: true, method: 'realtime' };
    }

    console.log(`📭 User ${recipient.username} is offline - queuing notifications`);
    
    // Queue the message
    this.queueOfflineMessage(recipient.id || recipient._id, message);
    
    // Send email if enabled and user has email
    if (recipient.email && recipient.emailNotifications !== false) {
      await this.sendEmailNotification(recipient, message, sender);
    }
    
    // Queue push notification
    await this.sendPushNotification(recipient.id || recipient._id, message, sender);
    
    return { 
      delivered: false, 
      method: 'queued',
      notifications: ['email', 'push']
    };
  }

  // Get offline status summary
  getOfflineSummary() {
    const totalOfflineUsers = Array.from(this.userPresence.values())
      .filter(p => !p.online).length;
    
    const totalQueuedMessages = Array.from(this.offlineMessages.values())
      .reduce((sum, msgs) => sum + msgs.length, 0);
    
    return {
      offlineUsers: totalOfflineUsers,
      queuedMessages: totalQueuedMessages,
      activeUsers: Array.from(this.userPresence.values()).filter(p => p.online).length
    };
  }
}

// Export singleton instance
const offlineNotificationService = new OfflineNotificationService();

module.exports = offlineNotificationService;
