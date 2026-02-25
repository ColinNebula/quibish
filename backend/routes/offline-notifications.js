const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const offlineNotificationService = require('../services/offlineNotificationService');

const { JWT_SECRET } = require('../config/jwt');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Get queued offline messages
router.get('/queued', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const messages = offlineNotificationService.getQueuedMessages(userId);
    
    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('Error retrieving queued messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve queued messages'
    });
  }
});

// Get unread count
router.get('/unread-count', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const count = offlineNotificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

// Update user presence (online/offline)
router.post('/presence', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status, socketId } = req.body;
    
    if (status === 'online') {
      offlineNotificationService.setUserOnline(userId, socketId);
    } else if (status === 'offline') {
      offlineNotificationService.setUserOffline(userId);
    }
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update presence'
    });
  }
});

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, (req, res) => {
  try {
    const { subscription, deviceInfo } = req.body;
    
    // Store push subscription (would save to database in production)
    console.log('Push notification subscription received:', {
      userId: req.user.userId,
      deviceInfo
    });
    
    res.json({
      success: true,
      message: 'Push notifications enabled'
    });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to push notifications'
    });
  }
});

// Update notification preferences
router.put('/preferences', authenticateToken, (req, res) => {
  try {
    const { email, push, desktop } = req.body;
    
    // Store preferences (would save to database in production)
    console.log('Notification preferences updated:', {
      userId: req.user.userId,
      preferences: { email, push, desktop }
    });
    
    res.json({
      success: true,
      preferences: { email, push, desktop }
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

// Admin: Get offline summary
router.get('/admin/summary', authenticateToken, (req, res) => {
  try {
    // Check if user is admin (implement proper auth check)
    const summary = offlineNotificationService.getOfflineSummary();
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error getting offline summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get offline summary'
    });
  }
});

module.exports = router;
