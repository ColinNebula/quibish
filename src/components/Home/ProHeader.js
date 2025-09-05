import React, { useState, useEffect, useRef } from 'react';
import './ProMessages.css';
import './MessageSearch.css';
import './NotificationBadges.css';
import './AccessibilityFeatures.css';
// import './ProHeader.css'; // Disabled to prevent conflicts with ProChat.css elegant header
import AccessibilityFeatures from './AccessibilityFeatures';
import EnhancedSearch from '../UI/EnhancedSearch';
import UserProfileManager from '../Profile/UserProfileManager';

/**
 * Professional header component for messaging interface
 * 
 * @component ProHeader
 * @param {Object} props - Component props
 * @param {Object} props.conversation - Current active conversation data
 * @param {boolean} props.isConnected - Connection status
 * @param {string} props.connectionQuality - Quality of connection ('poor', 'good', 'excellent')
 * @param {Function} props.onBackClick - Handler for back button click
 * @param {Object} props.user - Current user data
 * @param {Function} props.onLogout - Handler for logout action
 * @param {Function} props.onSearchMessages - Handler for search functionality
 * @param {boolean} props.darkMode - Dark mode state
 * @param {boolean} props.highContrast - High contrast mode state
 * @param {number} props.fontSizeScale - Font size scaling factor
 * @param {Function} props.onToggleHighContrast - Handler for toggling high contrast mode
 * @param {Function} props.onUpdateFontSize - Handler for updating font size
 * @param {Object} props.userPresence - User presence data for all contacts
 * @returns {JSX.Element} Rendered component
 */
const ProHeader = ({ 
  conversation, 
  isConnected, 
  connectionQuality, 
  onBackClick,
  user,
  onLogout,
  onSearchMessages,
  darkMode,
  highContrast,
  fontSizeScale,
  onToggleHighContrast,
  onUpdateFontSize,
  userPresence
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [lastActive, setLastActive] = useState('Just now');
  const [notificationCount, setNotificationCount] = useState(3); // Demo value
  const [showProfileManager, setShowProfileManager] = useState(false);
  
  /**
   * Update last active status based on userPresence data
   * For real contacts, this would use actual presence data from server
   */
  useEffect(() => {
    if (!conversation) return;
    
    // If we have userPresence data for this conversation
    if (userPresence && conversation.id) {
      const presenceData = userPresence[conversation.id];
      if (presenceData) {
        if (presenceData.isOnline) {
          setLastActive('Active now');
        } else if (presenceData.lastActive) {
          // Format the last active time
          const lastActiveTime = new Date(presenceData.lastActive);
          const now = new Date();
          const diffMinutes = Math.floor((now - lastActiveTime) / (1000 * 60));
          
          if (diffMinutes < 1) {
            setLastActive('Just now');
          } else if (diffMinutes < 60) {
            setLastActive(`${diffMinutes} min ago`);
          } else if (lastActiveTime.toDateString() === now.toDateString()) {
            setLastActive(`Today at ${lastActiveTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
          } else {
            setLastActive(lastActiveTime.toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }));
          }
        }
      } else {
        // Fallback if no presence data
        setLastActive('Last seen recently');
      }
    } else {
      // Fallback for demo purposes if no userPresence prop
      const statuses = ['Active now', '2 min ago', '5 min ago', 'Today at 2:30 PM'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setLastActive(randomStatus);
    }
  }, [conversation, userPresence]);
  
  /**
   * Renders the appropriate connection status icon based on connection state and quality
   * @returns {JSX.Element} SVG icon representing connection status
   */
  const getConnectionIcon = () => {
    if (!isConnected) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" 
            fill="#FF4D4F" />
        </svg>
      );
    }
    
    const colors = {
      poor: "#FF9800",      // Orange
      good: "#FAAD14",      // Amber
      excellent: "#52C41A", // Green
      default: "#52C41A"    // Green
    };
    
    const color = colors[connectionQuality] || colors.default;
    
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" 
          fill={color} />
        <circle cx="12" cy="12" r="5" fill={color} />
      </svg>
    );
  };

  /**
   * Returns appropriate connection status text based on connection state and quality
   * @returns {string} Descriptive connection status text
   */
  const getConnectionText = () => {
    if (!isConnected) return 'Disconnected';
    
    switch (connectionQuality) {
      case 'poor':
        return 'Poor Connection';
      case 'good':
        return 'Good Connection';
      case 'excellent':
        return 'Excellent Connection';
      default:
        return 'Connected';
    }
  };
  
  // Toggle search bar
  const toggleSearch = () => {
    setSearchActive(!searchActive);
  };

  // Handle profile manager
  const openProfileManager = () => {
    setShowProfileManager(true);
    setShowUserMenu(false); // Close user menu when opening profile manager
  };

  const closeProfileManager = () => {
    setShowProfileManager(false);
  };

  const handleUserUpdate = (updatedUser) => {
    // This would typically trigger a parent component update
    // For now, we'll just log it
    console.log('User updated:', updatedUser);
    // You might want to call a prop function here to update the parent state
    // if (onUserUpdate) onUserUpdate(updatedUser);
  };
  
  // Handle search result selection
  const handleSearchResultSelect = (result) => {
    console.log('Search result selected:', result);
    
    // Handle different result types
    switch (result.type) {
      case 'message':
        // Jump to message if it's in current conversation
        if (result.conversationId === conversation?.id) {
          jumpToMessage(result.id);
        } else {
          // Navigate to conversation containing the message
          console.log('Navigate to conversation:', result.conversationId);
        }
        break;
      case 'conversation':
        // Navigate to conversation
        console.log('Navigate to conversation:', result.id);
        break;
      case 'user':
        // Open user profile or start conversation
        console.log('Open user profile:', result.id);
        break;
      case 'image':
      case 'video':
      case 'audio':
        // Open media viewer
        console.log('Open media:', result.id);
        break;
      default:
        console.log('Unknown result type:', result.type);
    }
  };

  // Jump to a specific message
  const jumpToMessage = (messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight briefly
      element.classList.add('message-highlight');
      setTimeout(() => {
        element.classList.remove('message-highlight');
      }, 2000);
    }
  };

  return (
    <div className="pro-header">
      <div className="pro-header-left">
        <button 
          className="pro-header-back-button" 
          onClick={onBackClick}
          aria-label="Back to conversations"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
          </svg>
        </button>
        
        {conversation && !searchActive && (
          <div className="pro-header-info">
            <div className="pro-header-avatar">
              <img src={conversation.avatar} alt={conversation.name} />
              <span className={`pro-status ${isConnected ? 'online' : 'offline'}`}></span>
            </div>
            
            <div className="pro-header-details">
              <h2>{conversation.name}</h2>
              <div className="pro-connection-status">
                <span className="pro-connection-icon">{getConnectionIcon()}</span>
                <span className="pro-connection-text">
                  {isConnected ? lastActive : getConnectionText()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Enhanced Search Component */}
      <EnhancedSearch
        isActive={searchActive}
        onToggle={setSearchActive}
        onResultSelect={handleSearchResultSelect}
        darkMode={darkMode}
        placeholder="Search conversations, users, messages, files..."
      />
      
      <div className="pro-header-actions">
        <button 
          className={`pro-header-button ${searchActive ? 'active' : ''}`} 
          onClick={toggleSearch}
          aria-label="Search conversation"
          title="Search conversation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
          </svg>
        </button>
        
        <div className="notification-badge">
          <button 
            className="pro-header-button" 
            aria-label={`${notificationCount} notifications`}
            title="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
            </svg>
            {notificationCount > 0 && (
              <span className="notification-count">{notificationCount}</span>
            )}
          </button>
        </div>
        
        <button 
          className="pro-header-button" 
          aria-label="Call"
          title="Start voice call"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" 
              fill="currentColor"/>
          </svg>
        </button>
        
        <button 
          className="pro-header-button" 
          aria-label="Video call"
          title="Start video call"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" 
              fill="currentColor"/>
          </svg>
        </button>
        
        <div className="accessibility-container">
          <AccessibilityFeatures darkMode={darkMode} />
        </div>
        
        <div className="pro-header-more">
          <button 
            className="pro-header-button" 
            aria-label="More options"
            title="More options"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" 
                fill="currentColor"/>
            </svg>
          </button>
        </div>
        
        {user && (
          <div className="pro-user-menu">
            <div 
              className="pro-user-avatar-container" 
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <img 
                src={user.avatar || "https://via.placeholder.com/32"} 
                alt={user.name || "User"} 
                className="pro-user-avatar" 
              />
            </div>
            
            {showUserMenu && (
              <div className="pro-user-dropdown">
                <div className="pro-user-info">
                  <img 
                    src={user.avatar || "https://via.placeholder.com/64"} 
                    alt={user.name || "User"} 
                    className="pro-user-dropdown-avatar" 
                  />
                  <div className="pro-user-details">
                    <h3>{user.name || "User"}</h3>
                    <p>{user.email || "user@example.com"}</p>
                    <div className="user-status-indicator">
                      <span className={`status-dot ${user.status?.toLowerCase() || 'online'}`}></span>
                      <span className="status-text">{user.status || 'Online'}</span>
                    </div>
                  </div>
                </div>
                <div className="pro-dropdown-divider"></div>
                <button className="pro-dropdown-item" onClick={openProfileManager}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
                  </svg>
                  <span>Manage Profile</span>
                </button>
                <button className="pro-dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/>
                  </svg>
                  <span>Settings</span>
                </button>
                <button className="pro-dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="currentColor"/>
                  </svg>
                  <span>Help</span>
                </button>
                <div className="pro-dropdown-divider"></div>
                <button className="pro-dropdown-item pro-logout-item" onClick={onLogout}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor"/>
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* User Profile Manager Modal */}
      {showProfileManager && (
        <UserProfileManager
          user={user}
          onUserUpdate={handleUserUpdate}
          onClose={closeProfileManager}
        />
      )}
    </div>
  );
};

export default ProHeader;
