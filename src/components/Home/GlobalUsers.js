import React, { useState, useEffect } from 'react';
import './GlobalUsers.css';

const GlobalUsers = ({ onStartCall, currentCall }) => {
  const [globalUsers, setGlobalUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [callType, setCallType] = useState('voice'); // 'voice' or 'video'

  useEffect(() => {
    loadGlobalUsers();
  }, []);

  const loadGlobalUsers = async () => {
    try {
      setLoading(true);
      
      // Simulate API call to get global users
      // In a real app, this would fetch from your backend
      const mockUsers = [
        {
          id: 'user1',
          username: 'Alice Johnson',
          avatar: '/default-avatar.png',
          status: 'online',
          lastSeen: new Date(),
          isAvailable: true,
          location: 'New York, US'
        },
        {
          id: 'user2',
          username: 'Bob Smith',
          avatar: '/default-avatar.png',
          status: 'away',
          lastSeen: new Date(Date.now() - 300000), // 5 minutes ago
          isAvailable: true,
          location: 'London, UK'
        },
        {
          id: 'user3',
          username: 'Carol Davis',
          avatar: '/default-avatar.png',
          status: 'busy',
          lastSeen: new Date(),
          isAvailable: false,
          location: 'Tokyo, JP'
        },
        {
          id: 'user4',
          username: 'David Wilson',
          avatar: '/default-avatar.png',
          status: 'online',
          lastSeen: new Date(),
          isAvailable: true,
          location: 'Sydney, AU'
        },
        {
          id: 'user5',
          username: 'Eva Brown',
          avatar: '/default-avatar.png',
          status: 'offline',
          lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
          isAvailable: false,
          location: 'Berlin, DE'
        }
      ];

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setGlobalUsers(mockUsers);
    } catch (error) {
      console.error('Failed to load global users:', error);
      setGlobalUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = globalUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserSelect = (user) => {
    if (!user.isAvailable) return;

    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleStartCall = () => {
    if (selectedUsers.length === 0) return;

    const callData = {
      type: callType,
      participants: selectedUsers,
      isGlobal: true,
      timestamp: new Date()
    };

    onStartCall(callData);
    setSelectedUsers([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'away': return '#FF9800';
      case 'busy': return '#F44336';
      case 'offline': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const formatLastSeen = (lastSeen) => {
    const now = new Date();
    const diff = now - lastSeen;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="global-users-container">
        <div className="global-users-header">
          <h3>Global Users</h3>
        </div>
        <div className="global-users-loading">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="global-users-container">
      <div className="global-users-header">
        <h3>Global Users</h3>
        <div className="call-type-selector">
          <button
            className={`call-type-btn ${callType === 'voice' ? 'active' : ''}`}
            onClick={() => setCallType('voice')}
          >
            🎤
          </button>
          <button
            className={`call-type-btn ${callType === 'video' ? 'active' : ''}`}
            onClick={() => setCallType('video')}
          >
            📹
          </button>
        </div>
      </div>

      <div className="global-users-search">
        <input
          type="text"
          placeholder="Search users or locations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="users-search-input"
        />
      </div>

      {selectedUsers.length > 0 && (
        <div className="selected-users">
          <div className="selected-users-header">
            <span>Selected ({selectedUsers.length})</span>
            <button
              className="start-call-btn"
              onClick={handleStartCall}
            >
              Start {callType} call
            </button>
          </div>
          <div className="selected-users-list">
            {selectedUsers.map(user => (
              <div key={user.id} className="selected-user">
                <img src={user.avatar} alt={user.username} />
                <span>{user.username}</span>
                <button
                  className="remove-user-btn"
                  onClick={() => handleUserSelect(user)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="global-users-list">
        {filteredUsers.length === 0 ? (
          <div className="no-users">
            <p>No users found</p>
            <button onClick={loadGlobalUsers} className="retry-btn">
              Retry
            </button>
          </div>
        ) : (
          filteredUsers.map(user => (
            <div
              key={user.id}
              className={`global-user-item ${!user.isAvailable ? 'unavailable' : ''} ${
                selectedUsers.find(u => u.id === user.id) ? 'selected' : ''
              }`}
              onClick={() => handleUserSelect(user)}
            >
              <div className="user-avatar-container">
                <img src={user.avatar} alt={user.username} className="user-avatar" />
                <div
                  className="user-status-indicator"
                  style={{ backgroundColor: getStatusColor(user.status) }}
                ></div>
              </div>
              
              <div className="user-info">
                <div className="user-name">{user.username}</div>
                <div className="user-location">{user.location}</div>
                <div className="user-last-seen">
                  {user.status === 'online' ? 'Online' : formatLastSeen(user.lastSeen)}
                </div>
              </div>

              <div className="user-actions">
                {user.isAvailable ? (
                  <div className="availability-badge available">Available</div>
                ) : (
                  <div className="availability-badge unavailable">Busy</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {currentCall && currentCall.isGlobal && (
        <div className="current-global-call">
          <div className="call-info">
            <span>Global {currentCall.type} call active</span>
            <span>{currentCall.participants.length} participants</span>
          </div>
          <div className="call-participants">
            {currentCall.participants.slice(0, 3).map(participant => (
              <img
                key={participant.id}
                src={participant.avatar}
                alt={participant.username}
                className="call-participant-avatar"
              />
            ))}
            {currentCall.participants.length > 3 && (
              <div className="more-participants">
                +{currentCall.participants.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="global-users-footer">
        <p className="users-count">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
        </p>
        <button onClick={loadGlobalUsers} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default GlobalUsers;