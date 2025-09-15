import React, { useState, useRef, useEffect } from 'react';
import NotificationCenter from './NotificationCenter';
import './AppHeader.css';

/**
 * Main application header component with enhanced features
 * 
 * @component AppHeader
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user data
 * @param {Function} props.onLogout - Handler for logout action
 * @param {boolean} props.darkMode - Whether dark mode is enabled
 * @param {Function} props.toggleDarkMode - Function to toggle dark mode
 * @param {Function} props.onSettingsClick - Handler for settings button click
 * @param {Function} props.onSearchClick - Handler for search functionality
 * @param {number} props.activeUsers - Number of active users
 * @param {Array} props.quickActions - Array of quick action items
 * @param {React.ReactNode} props.connectionStatus - Connection status component
 * @returns {JSX.Element} Rendered header
 */
const AppHeader = ({ 
  user, 
  onLogout, 
  darkMode, 
  toggleDarkMode,
  onSettingsClick,
  onSearchClick,
  appVersion,
  activeUsers = 0,
  quickActions = [],
  connectionStatus
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  
  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };
  
  const handleLogout = () => {
    setMenuOpen(false);
    if (onLogout) onLogout();
  };
  
  const handleSettingsClick = () => {
    setMenuOpen(false);
    if (onSettingsClick) onSettingsClick();
  };

  const handleSearchToggle = () => {
    setSearchActive(prev => {
      const newState = !prev;
      if (newState && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchQuery('');
      }
      return newState;
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearchClick) {
      onSearchClick(searchQuery.trim());
      setSearchActive(false);
      setSearchQuery('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Escape') {
      setSearchActive(false);
      setSearchQuery('');
    }
  };

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchActive && !event.target.closest('.header-search')) {
        setSearchActive(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchActive]);

  return (
    <header className={`app-header ${darkMode ? 'dark' : 'light'} ${searchActive ? 'search-active' : ''}`}>
      <div className="header-container">
        <div className="header-brand">
          <div className="brand-logo">
            <div className="logo-container">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4.58 16.59L4 17.17V4H20V16Z" 
                  fill="currentColor"/>
                <path d="M12 15L16 11L12 7L10.59 8.41L13.17 11L10.59 13.59L12 15Z" fill="currentColor"/>
                <path d="M6 11H9V13H6V11Z" fill="currentColor"/>
              </svg>
              <div className="logo-pulse"></div>
            </div>
          </div>
          <div className="brand-content">
            <h1 className="brand-name">QuibiChat</h1>
            <div className="brand-subtitle">
              <span className="active-users">{activeUsers} online</span>
              <span className="version">v{appVersion || '1.0.0'}</span>
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className={`header-search ${searchActive ? 'active' : ''}`}>
          <form onSubmit={handleSearchSubmit} className="search-form">
            <button 
              type="button"
              className="search-toggle"
              onClick={handleSearchToggle}
              aria-label="Toggle search"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" 
                  fill="currentColor"/>
              </svg>
            </button>
            {searchActive && (
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search conversations, users, or messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                className="search-input"
              />
            )}
          </form>
        </div>
        
        <div className="header-actions">
          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="quick-actions">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="quick-action-btn"
                  onClick={action.onClick}
                  title={action.label}
                  aria-label={action.label}
                >
                  {action.icon}
                </button>
              ))}
            </div>
          )}

          {/* Activity Indicator */}
          <div className="activity-indicator">
            <div className="activity-dot"></div>
            <span className="activity-text">Active</span>
          </div>
          
          {/* Notification Center */}
          <NotificationCenter darkMode={darkMode} appVersion={appVersion} />
          
          {/* Connection Status */}
          {connectionStatus && (
            <div className="connection-status-container">
              {connectionStatus}
            </div>
          )}
          
          {/* Theme Toggle Button */}
          <button 
            className="theme-toggle enhanced" 
            onClick={toggleDarkMode}
            aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
          >
            <div className="theme-icon-container">
              {darkMode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z" 
                    fill="currentColor"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" 
                    fill="currentColor"/>
                </svg>
              )}
            </div>
          </button>
          
          {user && (
            <div className="user-menu-container">
              <button 
                className="user-menu-trigger enhanced" 
                onClick={toggleMenu}
                aria-expanded={menuOpen}
                aria-label="User menu"
              >
                <div className="user-avatar enhanced">
                  <img 
                    src={user.avatar || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjRTVFN0VCIi8+CjxjaXJjbGUgY3g9IjE2IiBjeT0iMTIiIHI9IjQiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTggMjRDOCAyMC42ODYzIDExLjU4MTcgMTggMTYgMThDMjAuNDE4MyAxOCAyNCAyMC42ODYzIDI0IDI0VjI2SDhWMjQiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+"} 
                    alt={user.name || "User"} 
                  />
                  <div className="avatar-ring"></div>
                  <div className={`status-indicator ${user.status || 'online'}`}></div>
                </div>
                <div className="user-info-compact">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role">{user.role || 'Member'}</span>
                </div>
                <svg className="menu-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 10l5 5 5-5H7z" fill="currentColor"/>
                </svg>
              </button>
              
              {menuOpen && (
                <div className="user-dropdown enhanced">
                  <div className="user-dropdown-header">
                    <div className="user-avatar large">
                      <img 
                        src={user.avatar || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRTVFN0VCIi8+CjxjaXJjbGUgY3g9IjMyIiBjeT0iMjQiIHI9IjgiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTE2IDQ4QzE2IDQxLjM3MjYgMjMuMTYzNCAzNiAzMiAzNkM0MC44MzY2IDM2IDQ4IDQxLjM3MjYgNDggNDhWNTJIMTZWNDgiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+"} 
                        alt={user.name || "User"} 
                      />
                      <div className="avatar-ring"></div>
                      <div className={`status-indicator ${user.status || 'online'}`}></div>
                    </div>
                    <div className="user-info">
                      <h3>{user.name}</h3>
                      <p>{user.email}</p>
                      <div className="user-stats">
                        <div className="stat">
                          <span className="stat-value">{user.messagesCount || 0}</span>
                          <span className="stat-label">Messages</span>
                        </div>
                        <div className="stat">
                          <span className="stat-value">{user.connectionsCount || 0}</span>
                          <span className="stat-label">Connections</span>
                        </div>
                      </div>
                      <div className="user-status">
                        <span className={`status-indicator ${user.status || 'online'}`}></span>
                        <span className="status-text">{user.status || 'Online'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="dropdown-menu">
                    <button className="dropdown-item" onClick={handleSettingsClick}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" 
                          fill="currentColor"/>
                      </svg>
                      <div className="dropdown-item-content">
                        <span>Profile Settings</span>
                        <span className="dropdown-item-desc">Manage your account</span>
                      </div>
                    </button>
                    
                    <button className="dropdown-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" 
                          fill="currentColor"/>
                      </svg>
                      <div className="dropdown-item-content">
                        <span>Preferences</span>
                        <span className="dropdown-item-desc">App settings & privacy</span>
                      </div>
                    </button>

                    <button className="dropdown-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5m5 5H9" 
                          fill="currentColor"/>
                      </svg>
                      <div className="dropdown-item-content">
                        <span>Shortcuts</span>
                        <span className="dropdown-item-desc">Keyboard shortcuts</span>
                      </div>
                    </button>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button className="dropdown-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92c-.5.51-.86.97-1.04 1.69-.08.32-.13.68-.13 1.14h-2v-.5c0-.46.08-.9.22-1.31.2-.58.53-1.1.95-1.52l1.24-1.26c.46-.44.68-1.1.55-1.8-.13-.72-.69-1.33-1.39-1.53-1.11-.31-2.14.32-2.47 1.27-.12.35-.43.58-.79.58h-.13c-.55-.06-.94-.61-.8-1.14.27-1.08.94-2.04 1.85-2.63 1.73-1.13 4.01-.74 5.27.87.95 1.23.93 2.99-.42 4.12z" 
                          fill="currentColor"/>
                      </svg>
                      <div className="dropdown-item-content">
                        <span>Help & Support</span>
                        <span className="dropdown-item-desc">Get help & feedback</span>
                      </div>
                    </button>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button className="dropdown-item logout-item" onClick={handleLogout}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" 
                          fill="currentColor"/>
                      </svg>
                      <div className="dropdown-item-content">
                        <span>Logout</span>
                        <span className="dropdown-item-desc">Sign out of your account</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
