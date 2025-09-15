import React, { useState, useEffect } from 'react';
import './NotificationCenter.css';

/**
 * Notification Center for displaying app-wide notifications
 * 
 * @component NotificationCenter
 * @param {Object} props - Component props
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 * @param {string} props.appVersion - Current application version
 * @returns {JSX.Element} Rendered notification center
 */
const NotificationCenter = ({ darkMode = false, appVersion = '1.0.0' }) => {
  const [notifications, setNotifications] = useState([]);
  const [showCenter, setShowCenter] = useState(false);

  // Mock notification data - in a real app, this would come from a backend API
  useEffect(() => {
    // Simulated notification data
    const mockNotifications = [
      {
        id: 'update-1.3.0',
        title: 'Welcome to QuibiChat 1.3.0',
        message: 'We\'ve completely redesigned the interface for a more professional experience.',
        type: 'info',
        date: 'Aug 26, 2025',
        read: false,
        action: {
          label: 'See What\'s New',
          url: '#whats-new'
        }
      },
      {
        id: 'system-maintenance',
        title: 'Planned Maintenance',
        message: 'QuibiChat will be undergoing maintenance on Aug 30 from 2-4AM EST.',
        type: 'warning',
        date: 'Aug 25, 2025',
        read: false
      },
      {
        id: 'feature-profile',
        title: 'New: Enhanced Profiles',
        message: 'You can now customize your profile with more details and preferences.',
        type: 'success',
        date: 'Aug 24, 2025',
        read: true,
        action: {
          label: 'Update Profile',
          url: '#profile'
        }
      }
    ];
    
    setNotifications(mockNotifications);
    
    // Check for unread notifications
    const hasUnread = mockNotifications.some(notification => !notification.read);
    if (hasUnread) {
      // Add a small delay before showing the notification indicator
      setTimeout(() => {
        const indicator = document.querySelector('.notification-indicator');
        if (indicator) {
          indicator.classList.add('pulse');
        }
      }, 3000);
    }
    
  }, []);
  
  const toggleNotificationCenter = () => {
    setShowCenter(prev => !prev);
    
    // Mark all as read when opening
    if (!showCenter) {
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Remove pulse effect
      const indicator = document.querySelector('.notification-indicator');
      if (indicator) {
        indicator.classList.remove('pulse');
      }
    }
  };
  
  const handleNotificationAction = (action, e) => {
    e.stopPropagation();
    // In a real app, navigate to the URL or trigger the action
    console.log('Action triggered:', action);
  };
  
  const hasUnread = notifications.some(notification => !notification.read);
  
  return (
    <div className={`notification-center-container ${darkMode ? 'dark' : ''}`}>
      <button 
        className="notification-button"
        onClick={toggleNotificationCenter}
        aria-label="Notifications"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM16 17H8V11C8 8.52 9.51 6.5 12 6.5C14.49 6.5 16 8.52 16 11V17Z" fill="currentColor"/>
        </svg>
        {hasUnread && <span className="notification-indicator"></span>}
      </button>
      
      {showCenter && (
        <div className="notification-center">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button className="close-button" onClick={toggleNotificationCenter}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notification">
                No notifications at this time.
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'} ${notification.type}`}
                >
                  <div className="notification-icon">
                    {notification.type === 'info' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V9H11V7ZM11 11H13V17H11V11Z" fill="currentColor"/>
                      </svg>
                    )}
                    {notification.type === 'warning' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M1 21H23L12 2L1 21ZM13 18H11V16H13V18ZM13 14H11V10H13V14Z" fill="currentColor"/>
                      </svg>
                    )}
                    {notification.type === 'success' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/>
                      </svg>
                    )}
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    
                    {notification.action && (
                      <button 
                        className="notification-action"
                        onClick={(e) => handleNotificationAction(notification.action, e)}
                      >
                        {notification.action.label}
                      </button>
                    )}
                    
                    <div className="notification-date">{notification.date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
