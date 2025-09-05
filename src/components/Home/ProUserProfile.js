import React, { useState, useRef, useEffect } from 'react';
import { getInitials, getAvatarColorClass, getStatusClass } from './AvatarUtils';
import { getUserPresence, getLastActiveFormatted, setOnlineStatus } from './UserPresenceService';
import './ProUserProfile.css';
import './AvatarUtils.css';

const ProUserProfile = ({ 
  user = {}, 
  collapsed = false,
  darkMode = false,
  onLogout,
  onOpenSettings
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const [editingName, setEditingName] = useState(false);
  const inputRef = useRef(null);
  
  // Default user data if not provided
  const defaultUser = {
    name: 'User',
    email: 'user@example.com',
    avatar: null,
    status: 'online', // online, away, busy, offline
    role: 'User',
    statusMessage: 'Available'
  };
  
  // Merge provided user with defaults
  const currentUser = { ...defaultUser, ...user };
  const [draftName, setDraftName] = useState(currentUser.name);
  
  // Get avatar color class based on name
  const avatarColorClass = getAvatarColorClass(currentUser.name);
  
  // Track user presence
  const [currentPresence, setCurrentPresence] = useState(currentUser.status || 'online');
  const [lastActive, setLastActive] = useState('Just now');
  
  // Update presence status periodically
  useEffect(() => {
    // Initial update
    updatePresenceDisplay();
    
    // Set up interval to check presence
    const interval = setInterval(updatePresenceDisplay, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [currentUser.status]);
  
  // Update the displayed presence status
  const updatePresenceDisplay = () => {
    // Use explicitly set status from user object, or get current presence
    const presence = currentUser.status === 'busy' ? 
      'busy' : getUserPresence();
    
    setCurrentPresence(presence);
    setLastActive(getLastActiveFormatted());
  };
  
  // Get status class based on current presence
  const statusClass = getStatusClass(currentPresence);
  
  // Handle menu toggle
  const toggleMenu = (e) => {
    e.stopPropagation();
    setMenuVisible(!menuVisible);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target) && 
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setMenuVisible(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Trap focus inside menu when visible
  useEffect(() => {
    if (!menuVisible || !menuRef.current) return;
    const focusable = menuRef.current.querySelectorAll('button, [tabindex], input');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuVisible(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuVisible]);

  // Inline name edit handlers
  useEffect(() => {
    if (editingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingName]);

  const startEditName = (e) => {
    e.stopPropagation();
    setEditingName(true);
    setDraftName(currentUser.name);
  };

  const saveName = () => {
    setEditingName(false);
    // In a real app we'd persist this to server
    if (currentUser && currentUser.onNameChange) currentUser.onNameChange(draftName);
  };

  const cancelEdit = () => {
    setEditingName(false);
    setDraftName(currentUser.name);
  };
  
  // Status class is now handled through the currentPresence state

  // Handle status change
  const setStatus = (status) => {
    // Update the user's status through the presence service
    setOnlineStatus(status);
    setCurrentPresence(status);
    
    // Here we would also update the user profile if a function is provided
    if (user && user.onStatusChange) {
      user.onStatusChange(status);
    }
    
    // Close the menu
    setMenuVisible(false);
    
    // Show a status message in a tooltip or similar UI element
    console.log(`Status changed to: ${status}`);
  };
  
  // Handle profile click in collapsed mode
  const handleProfileClick = () => {
    if (collapsed) {
      onOpenSettings && onOpenSettings('profile');
    }
  };
  
  return (
    <div className="pro-user-profile" onClick={handleProfileClick}>
  <div className={`pro-user-avatar ${avatarColorClass}`}>
        {currentUser.avatar ? (
          <img src={currentUser.avatar} alt={currentUser.name} />
        ) : (
          <span className="avatar-initials">{getInitials(currentUser.name)}</span>
        )}
        <span 
          className={`pro-status-indicator ${statusClass}`}
          title={currentUser.status.charAt(0).toUpperCase() + currentUser.status.slice(1)}
        ></span>
      </div>
      
      <div className="pro-user-details">
        <div className="pro-user-name">
          {editingName ? (
            <div className="inline-edit-name">
              <input ref={inputRef} value={draftName} onChange={(e) => setDraftName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEdit(); }} />
              <button onClick={saveName} aria-label="Save name">Save</button>
              <button onClick={cancelEdit} aria-label="Cancel edit">Cancel</button>
            </div>
          ) : (
            <span onDoubleClick={startEditName} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') startEditName(e); }}>{currentUser.name}</span>
          )}
        </div>
        <div className="pro-user-status">
          {currentUser.statusMessage}
          {currentPresence === 'away' || currentPresence === 'offline' ? (
            <span className="pro-last-active"> · {lastActive}</span>
          ) : null}
        </div>
      </div>
      
      <button 
        className="pro-user-menu-button" 
        aria-label="User menu" 
        onClick={toggleMenu}
        ref={buttonRef}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </button>
      
      <div className={`pro-user-menu ${menuVisible ? '' : 'hidden'}`} ref={menuRef}>
        <div className="pro-user-menu-item" onClick={() => onOpenSettings && onOpenSettings('profile')}>
          <span className="pro-menu-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </span>
          Edit Profile
        </div>
        
        <div className="pro-user-menu-item" onClick={() => setStatus('online')}>
          <span className="pro-menu-icon">
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--status-online, #10b981)' 
            }}></span>
          </span>
          Online
        </div>
        
        <div className="pro-user-menu-item" onClick={() => setStatus('busy')}>
          <span className="pro-menu-icon">
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--status-busy, #ef4444)' 
            }}></span>
          </span>
          Do Not Disturb
        </div>
        
        <div className="pro-user-menu-item" onClick={() => setStatus('away')}>
          <span className="pro-menu-icon">
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--status-away, #f59e0b)' 
            }}></span>
          </span>
          Away
        </div>
        
        <div className="pro-user-menu-item" onClick={() => onOpenSettings && onOpenSettings('preferences')}>
          <span className="pro-menu-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </span>
          Preferences
        </div>
        
        <div className="pro-user-menu-item danger" onClick={() => onLogout && onLogout()}>
          <span className="pro-menu-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </span>
          Sign Out
        </div>
      </div>
    </div>
  );
};

export default ProUserProfile;
