/**
 * Global Users Component
 * Shows users available for voice calls worldwide
 */

import React, { useState, useEffect } from 'react';
import './GlobalUsers.css';
import globalVoiceCallService from '../../services/globalVoiceCallService';

const GlobalUsers = ({ onStartCall, currentCall }) => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [connectionStats, setConnectionStats] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load available users
    loadAvailableUsers();

    // Update connection stats
    updateConnectionStats();

    // Set up periodic updates
    const interval = setInterval(() => {
      loadAvailableUsers();
      updateConnectionStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadAvailableUsers = () => {
    const users = globalVoiceCallService.getAvailableUsers();
    setAvailableUsers(users);
  };

  const updateConnectionStats = () => {
    const stats = globalVoiceCallService.getConnectionStats();
    setConnectionStats(stats);
  };

  const handleStartCall = async (targetUser) => {
    try {
      const call = await globalVoiceCallService.initiateCall(targetUser.id);
      onStartCall?.(call);
    } catch (error) {
      alert(`Failed to start call: ${error.message}`);
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`global-users ${isExpanded ? 'expanded' : ''}`}>
      {/* Header */}
      <div className="global-users-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-info">
          <span className="title">🌍 Global Voice Calls</span>
          <div className="connection-status">
            <span className={`status-indicator ${connectionStats.isConnected ? 'connected' : 'local'}`}>
              {connectionStats.isConnected ? 'Connected' : 'Local Mode'}
            </span>
            <span className="user-count">{availableUsers.length} users</span>
          </div>
        </div>
        <button className="expand-button">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="global-users-content">
          {/* Search */}
          <div className="search-section">
            <input
              type="text"
              placeholder="Search users by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="user-search"
            />
          </div>

          {/* Connection Info */}
          <div className="connection-info">
            <div className="info-item">
              <span className="info-label">Mode:</span>
              <span className="info-value">
                {connectionStats.connectionMode || 'local'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Available:</span>
              <span className="info-value">{connectionStats.onlineUsers} users</span>
            </div>
            {connectionStats.hasActiveCall && (
              <div className="info-item active-call">
                <span className="info-label">Status:</span>
                <span className="info-value">📞 In Call</span>
              </div>
            )}
          </div>

          {/* Users List */}
          <div className="users-list">
            {filteredUsers.length === 0 ? (
              <div className="no-users">
                {searchQuery ? (
                  <p>No users found matching "{searchQuery}"</p>
                ) : connectionStats.isConnected ? (
                  <p>No users currently online</p>
                ) : (
                  <div className="local-mode-message">
                    <p>🔧 Running in local mode</p>
                    <p>Demo users shown for testing</p>
                    <small>Backend signaling server not available</small>
                  </div>
                )}
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="user-item">
                  <div className="user-avatar">
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff&size=40`;
                      }}
                    />
                    <div className="user-status-indicator online"></div>
                  </div>
                  
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-details">
                      <span className="user-location">📍 {user.location}</span>
                      <span className="user-status">🟢 Online</span>
                    </div>
                  </div>

                  <div className="user-actions">
                    <button
                      className="call-button"
                      onClick={() => handleStartCall(user)}
                      disabled={!!currentCall}
                      title={currentCall ? 'Already in a call' : `Call ${user.name}`}
                    >
                      {currentCall ? '📞' : '📞'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="global-users-footer">
            <button 
              className="refresh-button"
              onClick={loadAvailableUsers}
              title="Refresh user list"
            >
              🔄 Refresh
            </button>
            <div className="connection-help">
              <small>
                {connectionStats.isConnected 
                  ? 'Connected to global network' 
                  : 'Local mode - demo users only'
                }
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalUsers;