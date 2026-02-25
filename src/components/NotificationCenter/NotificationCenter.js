import React, { useState, useEffect, useCallback, useMemo } from 'react';
import notificationService from '../../services/notificationService';
import './NotificationCenter.css';

const NotificationCenter = ({ isOpen, onClose, onNotificationClick }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'today'
  const [selectedType, setSelectedType] = useState('all');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (refresh = false) => {
    if (loading && !refresh) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const currentPage = refresh ? 0 : page;
      const options = {
        limit: 20,
        offset: currentPage * 20,
        unread: filter === 'unread',
        refresh
      };
      
      const data = await notificationService.fetchNotifications(options);
      
      if (refresh) {
        setNotifications(data.notifications);
        setPage(0);
      } else {
        setNotifications(prev => [...prev, ...data.notifications]);
      }
      
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
      
      if (!refresh) {
        setPage(prev => prev + 1);
      }
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, page, filter]);

  // Filter notifications based on current filters
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    // Filter by read status
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter === 'today') {
      const today = new Date().toDateString();
      filtered = filtered.filter(n => 
        new Date(n.createdAt).toDateString() === today
      );
    }
    
    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(n => n.type === selectedType);
    }
    
    return filtered;
  }, [notifications, filter, selectedType]);

  // Handle notification service events
  useEffect(() => {
    const handleNotificationUpdate = (eventType, data) => {
      switch (eventType) {
        case 'newNotification':
          setNotifications(prev => [data, ...prev]);
          setUnreadCount(prev => prev + 1);
          break;
        case 'notificationRead':
          setUnreadCount(data.unreadCount);
          break;
        case 'notificationDeleted':
          setNotifications(prev => prev.filter(n => n.id !== data.notification.id));
          setUnreadCount(data.unreadCount);
          break;
        case 'allNotificationsRead':
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          setUnreadCount(0);
          break;
        case 'unreadCountUpdated':
          setUnreadCount(data);
          break;
      }
    };

    const removeListener = notificationService.addEventListener(handleNotificationUpdate);
    
    return removeListener;
  }, []);

  // Load notifications when component opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen, fetchNotifications]);

  // Handle marking notification as read
  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Handle marking all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Handle deleting notification
  const handleDeleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification) => {
    // Mark as read if unread
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Call parent handler
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    
    // Close notification center
    onClose();
  }, [handleMarkAsRead, onNotificationClick, onClose]);

  // Load more notifications
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNotifications(false);
    }
  }, [loading, hasMore, fetchNotifications]);

  // Format notification time
  const formatTime = useCallback((timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMs = now - notificationTime;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return notificationTime.toLocaleDateString();
    }
  }, []);

  // Get notification icon
  const getNotificationIcon = useCallback((type) => {
    const icons = {
      message: '💬',
      friend_request: '👥',
      friend_accepted: '✅',
      mention: '🏷️',
      video_call: '📹',
      voice_call: '📞',
      file_shared: '📎',
      group_invite: '👥',
      system: '⚙️'
    };
    return icons[type] || '🔔';
  }, []);

  if (!isOpen) return null;

  return (
    <div className="notification-center-overlay" onClick={onClose}>
      <div className="notification-center" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="notification-center-header">
          <div className="header-title">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>
          <div className="header-actions">
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
              >
                ✓ All
              </button>
            )}
            <button 
              className="close-btn"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="notification-filters">
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setFilter('all');
                setPage(0);
                fetchNotifications(true);
              }}
            >
              All
            </button>
            <button 
              className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => {
                setFilter('unread');
                setPage(0);
                fetchNotifications(true);
              }}
            >
              Unread ({unreadCount})
            </button>
            <button 
              className={`filter-tab ${filter === 'today' ? 'active' : ''}`}
              onClick={() => {
                setFilter('today');
                setPage(0);
              }}
            >
              Today
            </button>
          </div>
          
          <select 
            className="type-filter"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="message">Messages</option>
            <option value="friend_request">Friend Requests</option>
            <option value="video_call">Video Calls</option>
            <option value="voice_call">Voice Calls</option>
            <option value="file_shared">Files</option>
            <option value="system">System</option>
          </select>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => fetchNotifications(true)}>Retry</button>
          </div>
        )}

        {/* Notifications list */}
        <div className="notifications-list">
          {loading && notifications.length === 0 ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <h4>No notifications</h4>
              <p>
                {filter === 'unread' 
                  ? "You're all caught up!" 
                  : "You don't have any notifications yet."}
              </p>
            </div>
          ) : (
            <>
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`notification-item ${
                    notification.read ? 'read' : 'unread'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <h5 className="notification-title">{notification.title}</h5>
                      <span className="notification-time">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="notification-message">{notification.message}</p>
                    
                    {notification.data && (
                      <div className="notification-metadata">
                        {notification.data.fromUserName && (
                          <span className="from-user">
                            From: {notification.data.fromUserName}
                          </span>
                        )}
                        {notification.data.conversationId && (
                          <span className="conversation">
                            Conversation: {notification.data.conversationId}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="notification-actions">
                    {!notification.read && (
                      <button 
                        className="mark-read-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button 
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Load more button */}
              {hasMore && (
                <div className="load-more-container">
                  <button 
                    className="load-more-btn"
                    onClick={handleLoadMore}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;