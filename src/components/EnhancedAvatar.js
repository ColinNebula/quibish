import React, { useState, useEffect, useRef } from 'react';
import './EnhancedAvatar.css';

const EnhancedAvatar = ({
  src,
  name = 'User',
  size = 'medium', // 'small', 'medium', 'large', 'xlarge'
  status = 'offline', // 'online', 'away', 'busy', 'offline'
  showStatus = true,
  showFrame = true,
  frameStyle = 'default', // 'default', 'gradient', 'glow', 'pulse', 'rainbow'
  lastSeen,
  isTyping = false,
  customBadge,
  onClick,
  className = '',
  enableHover = true,
  enableAnimations = true,
  showTooltip = true
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showPresenceTooltip, setShowPresenceTooltip] = useState(false);
  const avatarRef = useRef(null);

  const sizeClasses = {
    small: 'avatar-small',
    medium: 'avatar-medium', 
    large: 'avatar-large',
    xlarge: 'avatar-xlarge'
  };

  const statusColors = {
    online: '#22c55e',
    away: '#f59e0b', 
    busy: '#ef4444',
    offline: '#6b7280'
  };

  const statusLabels = {
    online: 'Online',
    away: 'Away',
    busy: 'Busy',
    offline: 'Offline'
  };

  const generateFallbackAvatar = (name) => {
    const initials = name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    // Generate consistent color based on name
    const colors = [
      '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', 
      '#10b981', '#06b6d4', '#f97316', '#84cc16'
    ];
    const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    
    return {
      initials,
      backgroundColor: colors[colorIndex]
    };
  };

  const formatLastSeen = (lastSeenTime) => {
    if (!lastSeenTime || status === 'online') return null;
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeenTime);
    const diffMs = now - lastSeenDate;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeenDate.toLocaleDateString();
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const handleMouseEnter = () => {
    if (showTooltip) {
      setShowPresenceTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowPresenceTooltip(false);
  };

  useEffect(() => {
    if (src) {
      setImageLoaded(false);
      setImageError(false);
    }
  }, [src]);

  const fallback = generateFallbackAvatar(name);
  const shouldShowImage = src && imageLoaded && !imageError;

  return (
    <div 
      ref={avatarRef}
      className={`enhanced-avatar ${sizeClasses[size]} ${className} ${enableHover ? 'hover-enabled' : ''} ${enableAnimations ? 'animations-enabled' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={onClick ? 0 : -1}
      aria-label={`${name}'s avatar - ${statusLabels[status]}`}
    >
      {/* Avatar Frame */}
      {showFrame && (
        <div className={`avatar-frame frame-${frameStyle} status-${status}`}>
          <div className="frame-border"></div>
          <div className="frame-glow"></div>
        </div>
      )}

      {/* Main Avatar Container */}
      <div className="avatar-container">
        {/* Avatar Image/Fallback */}
        <div className="avatar-image-wrapper">
          {shouldShowImage ? (
            <img
              src={src}
              alt={`${name}'s avatar`}
              className="avatar-image"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <div 
              className="avatar-fallback"
              style={{ backgroundColor: fallback.backgroundColor }}
            >
              <span className="avatar-initials">{fallback.initials}</span>
            </div>
          )}

          {/* Loading State */}
          {src && !imageLoaded && !imageError && (
            <div className="avatar-loading">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {showStatus && (
          <div className={`status-indicator status-${status} ${isTyping ? 'typing' : ''}`}>
            <div className="status-dot" style={{ backgroundColor: statusColors[status] }}>
              {isTyping && <div className="typing-pulse"></div>}
            </div>
            <div className="status-ring"></div>
          </div>
        )}

        {/* Custom Badge */}
        {customBadge && (
          <div className="custom-badge">
            {customBadge}
          </div>
        )}

        {/* Presence Animation Overlay */}
        {enableAnimations && status === 'online' && (
          <div className="presence-animation">
            <div className="pulse-ring"></div>
            <div className="pulse-ring delayed"></div>
          </div>
        )}
      </div>

      {/* Hover Effects */}
      {enableHover && (
        <div className="hover-effects">
          <div className="hover-glow"></div>
          <div className="hover-ripple"></div>
        </div>
      )}

      {/* Tooltip */}
      {showPresenceTooltip && showTooltip && (
        <div className="presence-tooltip">
          <div className="tooltip-content">
            <div className="tooltip-name">{name}</div>
            <div className="tooltip-status">
              <span className={`status-dot-mini status-${status}`}></span>
              {statusLabels[status]}
              {isTyping && <span className="typing-text"> • typing...</span>}
            </div>
            {formatLastSeen(lastSeen) && (
              <div className="tooltip-last-seen">
                Last seen {formatLastSeen(lastSeen)}
              </div>
            )}
          </div>
          <div className="tooltip-arrow"></div>
        </div>
      )}
    </div>
  );
};

// Avatar Group Component for multiple avatars
export const AvatarGroup = ({ 
  users = [], 
  maxVisible = 3, 
  size = 'medium',
  onOverflowClick,
  className = '' 
}) => {
  const visibleUsers = users.slice(0, maxVisible);
  const overflowCount = users.length - maxVisible;

  return (
    <div className={`avatar-group ${className}`}>
      {visibleUsers.map((user, index) => (
        <div 
          key={user.id || index}
          className="avatar-group-item"
          style={{ zIndex: visibleUsers.length - index }}
        >
          <EnhancedAvatar
            src={user.avatar}
            name={user.name}
            status={user.status}
            size={size}
            showTooltip={true}
            onClick={() => user.onClick && user.onClick(user)}
          />
        </div>
      ))}
      
      {overflowCount > 0 && (
        <div 
          className="avatar-overflow"
          onClick={onOverflowClick}
          role="button"
          tabIndex={0}
          aria-label={`${overflowCount} more users`}
        >
          <div className={`avatar-overflow-content ${sizeClasses[size]}`}>
            +{overflowCount}
          </div>
        </div>
      )}
    </div>
  );
};

// Typing Users Component
export const TypingUsers = ({ users = [], maxVisible = 3 }) => {
  if (users.length === 0) return null;

  return (
    <div className="typing-users">
      <AvatarGroup 
        users={users.map(user => ({ ...user, status: 'online', isTyping: true }))}
        maxVisible={maxVisible}
        size="small"
        className="typing-avatars"
      />
      <div className="typing-indicator-text">
        {users.length === 1 ? (
          `${users[0].name} is typing...`
        ) : users.length === 2 ? (
          `${users[0].name} and ${users[1].name} are typing...`
        ) : (
          `${users[0].name} and ${users.length - 1} others are typing...`
        )}
      </div>
    </div>
  );
};

// Profile Avatar Component with customization
export const ProfileAvatar = ({
  user,
  isEditable = false,
  onEdit,
  onImageChange,
  size = 'xlarge'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  const handleEditClick = () => {
    if (isEditable) {
      setIsEditing(true);
      if (onEdit) onEdit();
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && onImageChange) {
      onImageChange(file);
    }
    setIsEditing(false);
  };

  return (
    <div className="profile-avatar">
      <EnhancedAvatar
        src={user.avatar}
        name={user.name}
        status={user.status}
        size={size}
        frameStyle="gradient"
        showTooltip={false}
        onClick={handleEditClick}
        customBadge={user.badge}
      />
      
      {isEditable && (
        <div className="edit-overlay">
          <button 
            className="edit-button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile picture"
          >
            📷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}
      
      <div className="profile-info">
        <h3 className="profile-name">{user.name}</h3>
        <div className="profile-status">
          <span className={`status-indicator-inline status-${user.status}`}></span>
          {statusLabels[user.status]}
        </div>
      </div>
    </div>
  );
};

const sizeClasses = {
  small: 'avatar-small',
  medium: 'avatar-medium', 
  large: 'avatar-large',
  xlarge: 'avatar-xlarge'
};

const statusLabels = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline'
};

export default EnhancedAvatar;