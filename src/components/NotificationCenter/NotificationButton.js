import React, { useState, useEffect, useCallback } from 'react';
import notificationService from '../../services/notificationService';
import './NotificationButton.css';

const NotificationButton = ({ onClick, className = '', style = {} }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  // Use a ref for the loading guard so it doesn't trigger re-renders or
  // invalidate the useCallback/useEffect dependency chain.
  const isLoadingRef = React.useRef(false);
  
  // Fetch initial unread count — stable reference, no state deps
  const fetchUnreadCount = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error?.message || error);
      // Silently fail - don't disrupt the UI
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  // Subscribe to notification service events (runs once on mount)
  useEffect(() => {
    const handleNotificationEvent = (eventType, data) => {
      switch (eventType) {
        case 'newNotification':
          setUnreadCount(prev => prev + 1);
          setHasNewNotification(true);
          
          // Remove new notification animation after 3 seconds
          setTimeout(() => {
            setHasNewNotification(false);
          }, 3000);
          break;
          
        case 'notificationRead':
          setUnreadCount(data.unreadCount);
          break;
          
        case 'allNotificationsRead':
          setUnreadCount(0);
          break;
          
        case 'notificationDeleted':
          setUnreadCount(data.unreadCount);
          break;
          
        case 'unreadCountUpdated':
          setUnreadCount(data);
          break;
      }
    };

    const removeListener = notificationService.addEventListener(handleNotificationEvent);
    
    // One-time initial fetch on mount
    fetchUnreadCount();
    
    return removeListener;
  }, [fetchUnreadCount]);

  // Request notification permission on mount
  useEffect(() => {
    const requestPermission = async () => {
      try {
        await notificationService.requestPermission();
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };
    
    requestPermission();
  }, []);

  // Handle button click
  const handleClick = useCallback(() => {
    setHasNewNotification(false);
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  return (
    <button
      className={`notification-button ${className} ${
        hasNewNotification ? 'has-new' : ''
      } ${unreadCount > 0 ? 'has-unread' : ''}`}
      onClick={handleClick}
      title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      style={style}
    >
      <div className="notification-icon">
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {hasNewNotification && (
          <div className="notification-pulse"></div>
        )}
      </div>
    </button>
  );
};

export default NotificationButton;