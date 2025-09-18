// Email Notification Service for sending email alerts when users are offline
const nodemailer = require('nodemailer');

class EmailNotificationService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.emailTemplates = {
      newMessage: this.getMessageTemplate(),
      dailyDigest: this.getDigestTemplate(),
      mentionAlert: this.getMentionTemplate()
    };
  }

  // Initialize email service with SMTP configuration
  async initialize(config = {}) {
    try {
      console.log('📧 Initializing email notification service...');
      
      // Default SMTP configuration (can be overridden)
      const smtpConfig = {
        host: config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
        port: config.smtpPort || process.env.SMTP_PORT || 587,
        secure: config.smtpSecure || process.env.SMTP_SECURE === 'true' || false,
        auth: {
          user: config.smtpUser || process.env.SMTP_USER,
          pass: config.smtpPass || process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      };

      // Create transporter
      this.transporter = nodemailer.createTransporter(smtpConfig);

      // Verify connection
      await this.transporter.verify();
      
      this.isConfigured = true;
      console.log('✅ Email service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.isConfigured = false;
      return false;
    }
  }

  // Send new message notification email
  async sendMessageNotification(recipientEmail, messageData) {
    if (!this.isConfigured) {
      console.warn('Email service not configured');
      return false;
    }

    try {
      const emailContent = this.emailTemplates.newMessage(messageData);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Quibish <noreply@quibish.app>',
        to: recipientEmail,
        subject: `New message from ${messageData.senderName}`,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Message notification email sent:', result.messageId);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send message notification email:', error);
      return false;
    }
  }

  // Send mention notification email
  async sendMentionNotification(recipientEmail, mentionData) {
    if (!this.isConfigured) {
      console.warn('Email service not configured');
      return false;
    }

    try {
      const emailContent = this.emailTemplates.mentionAlert(mentionData);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Quibish <noreply@quibish.app>',
        to: recipientEmail,
        subject: `You were mentioned by ${mentionData.senderName}`,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Mention notification email sent:', result.messageId);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send mention notification email:', error);
      return false;
    }
  }

  // Send daily digest email
  async sendDailyDigest(recipientEmail, digestData) {
    if (!this.isConfigured) {
      console.warn('Email service not configured');
      return false;
    }

    try {
      const emailContent = this.emailTemplates.dailyDigest(digestData);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Quibish <noreply@quibish.app>',
        to: recipientEmail,
        subject: `Your daily Quibish digest - ${digestData.unreadCount} unread messages`,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Daily digest email sent:', result.messageId);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send daily digest email:', error);
      return false;
    }
  }

  // Check if user should receive email notification
  shouldSendEmailNotification(user, messageData) {
    // Check user notification preferences
    const preferences = user.notificationPreferences || {};
    
    // Don't send if email notifications are disabled
    if (preferences.emailEnabled === false) {
      return false;
    }

    // Don't send if user is currently online
    if (user.isOnline && user.lastSeen && (Date.now() - new Date(user.lastSeen).getTime()) < 5 * 60 * 1000) {
      return false;
    }

    // Check quiet hours
    if (this.isInQuietHours(preferences.quietHours)) {
      return false;
    }

    // Check frequency limits
    if (this.hasReachedEmailLimit(user.id, preferences.emailFrequency)) {
      return false;
    }

    return true;
  }

  // Check if current time is in user's quiet hours
  isInQuietHours(quietHours) {
    if (!quietHours || !quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(quietHours.start) || 22;
    const endHour = parseInt(quietHours.end) || 8;

    if (startHour < endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  // Check if user has reached email frequency limit
  hasReachedEmailLimit(userId, frequency = 'immediate') {
    // This would check against a database of recent email sends
    // For now, return false (no limit reached)
    return false;
  }

  // Get new message email template
  getMessageTemplate() {
    return (data) => ({
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Message - Quibish</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 32px; }
            .message-preview { background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0; border-radius: 8px; }
            .sender-info { display: flex; align-items: center; margin-bottom: 16px; }
            .avatar { width: 48px; height: 48px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 16px; }
            .sender-name { font-weight: 600; color: #1f2937; }
            .timestamp { color: #6b7280; font-size: 14px; }
            .message-text { color: #374151; line-height: 1.6; }
            .cta-button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 600; }
            .footer { background: #f8fafc; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💬 New Message</h1>
            </div>
            <div class="content">
              <div class="sender-info">
                <div class="avatar">${data.senderName.charAt(0).toUpperCase()}</div>
                <div>
                  <div class="sender-name">${data.senderName}</div>
                  <div class="timestamp">${new Date(data.timestamp).toLocaleString()}</div>
                </div>
              </div>
              <div class="message-preview">
                <div class="message-text">${data.messagePreview}</div>
              </div>
              <a href="${data.conversationUrl}" class="cta-button">View Conversation</a>
              <p>You received this notification because you have email notifications enabled and were offline when this message was sent.</p>
            </div>
            <div class="footer">
              <p>Quibish - Stay Connected</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe from email notifications</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
New message from ${data.senderName}

"${data.messagePreview}"

View the conversation: ${data.conversationUrl}

Sent: ${new Date(data.timestamp).toLocaleString()}

---
Quibish - Stay Connected
Unsubscribe: ${data.unsubscribeUrl}
      `
    });
  }

  // Get mention alert email template
  getMentionTemplate() {
    return (data) => ({
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You were mentioned - Quibish</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 32px; }
            .mention-highlight { background: #fef3c7; border: 2px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 8px; }
            .sender-info { display: flex; align-items: center; margin-bottom: 16px; }
            .avatar { width: 48px; height: 48px; border-radius: 50%; background: #f59e0b; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 16px; }
            .sender-name { font-weight: 600; color: #1f2937; }
            .timestamp { color: #6b7280; font-size: 14px; }
            .message-text { color: #374151; line-height: 1.6; }
            .cta-button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 600; }
            .footer { background: #f8fafc; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏷️ You were mentioned!</h1>
            </div>
            <div class="content">
              <div class="sender-info">
                <div class="avatar">${data.senderName.charAt(0).toUpperCase()}</div>
                <div>
                  <div class="sender-name">${data.senderName}</div>
                  <div class="timestamp">${new Date(data.timestamp).toLocaleString()}</div>
                </div>
              </div>
              <div class="mention-highlight">
                <div class="message-text">${data.messagePreview}</div>
              </div>
              <a href="${data.conversationUrl}" class="cta-button">View Mention</a>
              <p>You received this notification because you were mentioned and have email notifications enabled.</p>
            </div>
            <div class="footer">
              <p>Quibish - Stay Connected</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe from email notifications</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
You were mentioned by ${data.senderName}!

"${data.messagePreview}"

View the conversation: ${data.conversationUrl}

Sent: ${new Date(data.timestamp).toLocaleString()}

---
Quibish - Stay Connected
Unsubscribe: ${data.unsubscribeUrl}
      `
    });
  }

  // Get daily digest email template
  getDigestTemplate() {
    return (data) => ({
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daily Digest - Quibish</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 32px; }
            .summary-card { background: #f0fdf4; border: 1px solid #10b981; padding: 20px; margin: 16px 0; border-radius: 8px; text-align: center; }
            .summary-number { font-size: 32px; font-weight: bold; color: #10b981; }
            .summary-label { color: #374151; font-size: 16px; }
            .conversation-list { margin: 24px 0; }
            .conversation-item { border-bottom: 1px solid #e5e7eb; padding: 16px 0; }
            .conversation-name { font-weight: 600; color: #1f2937; margin-bottom: 8px; }
            .message-count { color: #6b7280; font-size: 14px; }
            .cta-button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 600; }
            .footer { background: #f8fafc; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Your Daily Digest</h1>
            </div>
            <div class="content">
              <div class="summary-card">
                <div class="summary-number">${data.unreadCount}</div>
                <div class="summary-label">Unread Messages</div>
              </div>
              
              <div class="conversation-list">
                <h3>Active Conversations</h3>
                ${data.conversations.map(conv => `
                  <div class="conversation-item">
                    <div class="conversation-name">${conv.name}</div>
                    <div class="message-count">${conv.unreadCount} new messages</div>
                  </div>
                `).join('')}
              </div>
              
              <a href="${data.appUrl}" class="cta-button">Open Quibish</a>
              
              <p>This is your daily summary of activity on Quibish. You can adjust your digest frequency in notification settings.</p>
            </div>
            <div class="footer">
              <p>Quibish - Stay Connected</p>
              <p><a href="${data.unsubscribeUrl}">Unsubscribe from email notifications</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Your Daily Quibish Digest

You have ${data.unreadCount} unread messages.

Active Conversations:
${data.conversations.map(conv => `• ${conv.name}: ${conv.unreadCount} new messages`).join('\n')}

Open Quibish: ${data.appUrl}

---
Quibish - Stay Connected
Unsubscribe: ${data.unsubscribeUrl}
      `
    });
  }
}

module.exports = new EmailNotificationService();