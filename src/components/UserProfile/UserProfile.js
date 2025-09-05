import React, { useState, useEffect } from 'react';
import './UserProfile.css';
import userDataService from '../../services/userDataService';

const UserProfile = ({ userId, username, onClose }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [userProfile, setUserProfile] = useState(null);
  const [userUploads, setUserUploads] = useState([]);
  const [viewHistory, setViewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch basic user profile data
        const profileData = await userDataService.fetchUserProfile(userId);
        setUserProfile(profileData);
        
        // Fetch user uploads based on active tab
        if (activeTab === 'uploads' || activeTab === 'profile') {
          const uploads = await userDataService.fetchUserUploads(userId);
          setUserUploads(uploads);
        }
        
        // Fetch view history based on active tab
        if (activeTab === 'history' || activeTab === 'profile') {
          const history = await userDataService.fetchUserViewHistory(userId);
          setViewHistory(history);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load user data. Please try again later.');
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎬';
      case 'gif':
        return '🎭';
      case 'document':
        return '📄';
      default:
        return '📁';
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const renderMediaGrid = (mediaItems) => {
    if (!mediaItems || mediaItems.length === 0) {
      return <p className="empty-state">No content to display</p>;
    }

    return (
      <div className="media-grid">
        {mediaItems.map((item) => (
          <div key={item.id} className="media-item">
            {item.type === 'image' ? (
              <div className="media-preview">
                <img src={item.url} alt={item.name} />
              </div>
            ) : (
              <div className="media-preview file-icon">
                {getFileIcon(item.type)}
              </div>
            )}
            <div className="media-info">
              <span className="media-name">{item.name}</span>
              <span className="media-date">{formatDate(item.date)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderViewHistory = () => {
    if (!viewHistory || viewHistory.length === 0) {
      return <p className="empty-state">No view history to display</p>;
    }

    return (
      <div className="history-list">
        {viewHistory.map((item) => (
          <div key={item.id} className="history-item">
            <div className="history-icon">
              {getFileIcon(item.contentType)}
            </div>
            <div className="history-info">
              <span className="history-title">{item.title}</span>
              <span className="history-details">
                {item.contentType} • Viewed {formatDate(item.viewedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProfileInfo = () => {
    if (!userProfile) {
      return <p className="empty-state">User profile not available</p>;
    }

    return (
      <div className="profile-info">
        <div className="profile-header">
          <div className="profile-avatar">
            <img src={userProfile.avatarUrl} alt={userProfile.displayName} />
          </div>
          <div className="profile-details">
            <h2>{userProfile.displayName}</h2>
            <p className="username">@{userProfile.username}</p>
            <p className="bio">{userProfile.bio || "No bio available"}</p>
            <div className="profile-stats">
              <div className="stat">
                <span className="stat-value">{userProfile.uploadCount || 0}</span>
                <span className="stat-label">Uploads</span>
              </div>
              <div className="stat">
                <span className="stat-value">{userProfile.connectionCount || 0}</span>
                <span className="stat-label">Connections</span>
              </div>
              <div className="stat">
                <span className="stat-value">{userProfile.activityScore || 0}</span>
                <span className="stat-label">Activity</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="profile-sections">
          <h3>Recent Uploads</h3>
          <div className="profile-section">
            {renderMediaGrid(userUploads.slice(0, 4))}
            {userUploads.length > 4 && (
              <button 
                className="view-more-btn"
                onClick={() => handleTabChange('uploads')}
              >
                View all uploads
              </button>
            )}
          </div>

          <h3>Recently Viewed</h3>
          <div className="profile-section">
            {renderViewHistory(viewHistory.slice(0, 3))}
            {viewHistory.length > 3 && (
              <button 
                className="view-more-btn"
                onClick={() => handleTabChange('history')}
              >
                View full history
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="user-profile-container">
      <div className="user-profile-header">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>{username}'s Profile</h2>
        
        <div className="profile-tabs">
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabChange('profile')}
          >
            Profile
          </button>
          <button 
            className={`tab-btn ${activeTab === 'uploads' ? 'active' : ''}`}
            onClick={() => handleTabChange('uploads')}
          >
            Uploads
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            View History
          </button>
        </div>
      </div>

      <div className="user-profile-content">
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="tab-content">
            {activeTab === 'profile' && renderProfileInfo()}
            {activeTab === 'uploads' && (
              <div className="uploads-container">
                <h3>Uploads</h3>
                {renderMediaGrid(userUploads)}
              </div>
            )}
            {activeTab === 'history' && (
              <div className="history-container">
                <h3>View History</h3>
                {renderViewHistory()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;