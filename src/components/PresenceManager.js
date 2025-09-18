import React, { useState, useEffect } from 'react';
import EnhancedAvatar, { AvatarGroup, TypingUsers, ProfileAvatar } from './EnhancedAvatar';
import './PresenceManager.css';

const PresenceManager = ({ 
  currentUser,
  onlineUsers = [],
  typingUsers = [],
  onStatusChange,
  onAvatarUpdate
}) => {
  const [userStatus, setUserStatus] = useState(currentUser?.status || 'online');
  const [lastSeen, setLastSeen] = useState(new Date().toISOString());
  const [presenceSettings, setPresenceSettings] = useState({
    showOnlineStatus: true,
    showLastSeen: true,
    showTypingIndicators: true,
    autoAwayTime: 5, // minutes
    showPresenceAnimations: true
  });

  // Status options with descriptions
  const statusOptions = [
    { 
      value: 'online', 
      label: 'Online', 
      icon: '🟢', 
      description: 'Available for chat' 
    },
    { 
      value: 'away', 
      label: 'Away', 
      icon: '🟡', 
      description: 'Be right back' 
    },
    { 
      value: 'busy', 
      label: 'Busy', 
      icon: '🔴', 
      description: 'Do not disturb' 
    },
    { 
      value: 'offline', 
      label: 'Offline', 
      icon: '⚫', 
      description: 'Appear offline' 
    }
  ];

  // Auto-away functionality
  useEffect(() => {
    let awayTimer;
    let lastActivity = Date.now();

    const resetAwayTimer = () => {
      lastActivity = Date.now();
      if (awayTimer) {
        clearTimeout(awayTimer);
      }
      
      if (userStatus === 'away' && presenceSettings.autoAwayTime > 0) {
        // Auto return to online if user was auto-away
        handleStatusChange('online');
      }

      awayTimer = setTimeout(() => {
        if (userStatus === 'online' && presenceSettings.autoAwayTime > 0) {
          handleStatusChange('away');
        }
      }, presenceSettings.autoAwayTime * 60 * 1000);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, resetAwayTimer, true);
    });

    resetAwayTimer();

    return () => {
      if (awayTimer) {
        clearTimeout(awayTimer);
      }
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetAwayTimer, true);
      });
    };
  }, [userStatus, presenceSettings.autoAwayTime]);

  // Update last seen when status changes
  useEffect(() => {
    if (userStatus !== 'online') {
      setLastSeen(new Date().toISOString());
    }
  }, [userStatus]);

  const handleStatusChange = (newStatus) => {
    setUserStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  const handleSettingChange = (setting, value) => {
    setPresenceSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleAvatarChange = (file) => {
    if (onAvatarUpdate) {
      onAvatarUpdate(file);
    }
  };

  // Sample data for demonstration
  const sampleOnlineUsers = onlineUsers.length > 0 ? onlineUsers : [
    {
      id: '1',
      name: 'Alice Johnson',
      avatar: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=8b5cf6&color=fff',
      status: 'online',
      lastSeen: new Date(Date.now() - 300000).toISOString()
    },
    {
      id: '2',
      name: 'Bob Smith',
      avatar: 'https://ui-avatars.com/api/?name=Bob+Smith&background=f59e0b&color=fff',
      status: 'away',
      lastSeen: new Date(Date.now() - 600000).toISOString()
    },
    {
      id: '3',
      name: 'Carol Davis',
      avatar: 'https://ui-avatars.com/api/?name=Carol+Davis&background=10b981&color=fff',
      status: 'busy',
      lastSeen: new Date(Date.now() - 900000).toISOString()
    },
    {
      id: '4',
      name: 'David Wilson',
      avatar: 'https://ui-avatars.com/api/?name=David+Wilson&background=ef4444&color=fff',
      status: 'online',
      lastSeen: new Date().toISOString()
    },
    {
      id: '5',
      name: 'Eva Martinez',
      avatar: 'https://ui-avatars.com/api/?name=Eva+Martinez&background=06b6d4&color=fff',
      status: 'offline',
      lastSeen: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  const sampleTypingUsers = typingUsers.length > 0 ? typingUsers : [
    {
      id: '1',
      name: 'Alice Johnson',
      avatar: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=8b5cf6&color=fff'
    }
  ];

  const currentUserData = currentUser || {
    id: 'current',
    name: 'You',
    avatar: 'https://ui-avatars.com/api/?name=You&background=3b82f6&color=fff',
    status: userStatus,
    badge: '✨'
  };

  return (
    <div className="presence-manager">
      {/* Current User Profile */}
      <div className="current-user-section">
        <h3>Your Profile</h3>
        <ProfileAvatar
          user={{ ...currentUserData, status: userStatus }}
          isEditable={true}
          onImageChange={handleAvatarChange}
        />
        
        {/* Status Selector */}
        <div className="status-selector">
          <h4>Set Status</h4>
          <div className="status-options">
            {statusOptions.map(option => (
              <button
                key={option.value}
                className={`status-option ${userStatus === option.value ? 'active' : ''}`}
                onClick={() => handleStatusChange(option.value)}
              >
                <span className="status-icon">{option.icon}</span>
                <div className="status-info">
                  <span className="status-label">{option.label}</span>
                  <span className="status-description">{option.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Online Users */}
      <div className="online-users-section">
        <h3>Online Users ({sampleOnlineUsers.filter(u => u.status === 'online').length})</h3>
        <div className="users-grid">
          {sampleOnlineUsers.map(user => (
            <div key={user.id} className="user-card">
              <EnhancedAvatar
                src={user.avatar}
                name={user.name}
                status={user.status}
                size="large"
                frameStyle={user.status === 'online' ? 'glow' : 'default'}
                lastSeen={user.lastSeen}
                showTooltip={true}
                enableAnimations={presenceSettings.showPresenceAnimations}
              />
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-status">{statusOptions.find(s => s.value === user.status)?.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Avatar Group Demo */}
      <div className="avatar-group-section">
        <h3>Avatar Groups</h3>
        <div className="group-examples">
          <div className="group-example">
            <span className="group-label">Small Group:</span>
            <AvatarGroup 
              users={sampleOnlineUsers.slice(0, 3)}
              size="medium"
              maxVisible={3}
            />
          </div>
          <div className="group-example">
            <span className="group-label">Large Group:</span>
            <AvatarGroup 
              users={sampleOnlineUsers}
              size="medium"
              maxVisible={4}
              onOverflowClick={() => console.log('Show all users')}
            />
          </div>
          <div className="group-example">
            <span className="group-label">Compact:</span>
            <AvatarGroup 
              users={sampleOnlineUsers.slice(0, 6)}
              size="small"
              maxVisible={5}
            />
          </div>
        </div>
      </div>

      {/* Typing Indicators */}
      {presenceSettings.showTypingIndicators && (
        <div className="typing-section">
          <h3>Typing Indicators</h3>
          <TypingUsers users={sampleTypingUsers} />
        </div>
      )}

      {/* Presence Settings */}
      <div className="presence-settings">
        <h3>Presence Settings</h3>
        <div className="settings-grid">
          <label className="setting-item">
            <input
              type="checkbox"
              checked={presenceSettings.showOnlineStatus}
              onChange={(e) => handleSettingChange('showOnlineStatus', e.target.checked)}
            />
            <span className="setting-label">Show online status</span>
          </label>

          <label className="setting-item">
            <input
              type="checkbox"
              checked={presenceSettings.showLastSeen}
              onChange={(e) => handleSettingChange('showLastSeen', e.target.checked)}
            />
            <span className="setting-label">Show last seen</span>
          </label>

          <label className="setting-item">
            <input
              type="checkbox"
              checked={presenceSettings.showTypingIndicators}
              onChange={(e) => handleSettingChange('showTypingIndicators', e.target.checked)}
            />
            <span className="setting-label">Show typing indicators</span>
          </label>

          <label className="setting-item">
            <input
              type="checkbox"
              checked={presenceSettings.showPresenceAnimations}
              onChange={(e) => handleSettingChange('showPresenceAnimations', e.target.checked)}
            />
            <span className="setting-label">Enable presence animations</span>
          </label>

          <div className="setting-item">
            <label className="setting-label">
              Auto-away after (minutes):
              <input
                type="number"
                min="0"
                max="60"
                value={presenceSettings.autoAwayTime}
                onChange={(e) => handleSettingChange('autoAwayTime', parseInt(e.target.value))}
                className="setting-input"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Frame Style Demo */}
      <div className="frame-styles-section">
        <h3>Avatar Frame Styles</h3>
        <div className="frame-examples">
          {['default', 'gradient', 'glow', 'pulse', 'rainbow'].map(frameStyle => (
            <div key={frameStyle} className="frame-example">
              <EnhancedAvatar
                src={currentUserData.avatar}
                name={`${frameStyle} frame`}
                status="online"
                size="large"
                frameStyle={frameStyle}
                showTooltip={false}
              />
              <span className="frame-label">{frameStyle}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PresenceManager;