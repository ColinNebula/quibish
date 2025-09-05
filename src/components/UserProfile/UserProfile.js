import React, { useState, useEffect } from 'react';
import './UserProfile.css';
import userDataService from '../../services/userDataService';
import EditProfileModal from './EditProfileModal';
import PrivacySettings from './PrivacySettings';
import ProfileAnalytics from './ProfileAnalytics';
import EnhancedMediaGallery from './EnhancedMediaGallery';
import AvatarUpload from './AvatarUpload';

const UserProfile = ({ userId, username, onClose, isVisible, isClosing }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [userProfile, setUserProfile] = useState(null);
  const [userUploads, setUserUploads] = useState([]);
  const [viewHistory, setViewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  // Check if this is the current user's profile
  const currentUserId = localStorage.getItem('userId');
  const isOwnProfile = userId === currentUserId;

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

  const handleProfileSave = (updatedProfile) => {
    setUserProfile(prev => ({
      ...prev,
      ...updatedProfile
    }));
  };

  const handleAvatarChange = async (newAvatarUrl) => {
    try {
      const updatedProfile = { ...userProfile, avatar: newAvatarUrl };
      await userDataService.updateUserProfile(userId, { avatar: newAvatarUrl });
      setUserProfile(updatedProfile);
    } catch (error) {
      console.error('Failed to update avatar:', error);
    }
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
          <AvatarUpload 
            currentAvatar={userProfile.avatar}
            onAvatarChange={handleAvatarChange}
            isOwnProfile={isOwnProfile}
          />
          <div className="profile-details">
            <h2>{userProfile.displayName || userProfile.name}</h2>
            <p className="username">@{userProfile.username}</p>
            {userProfile.statusMessage && (
              <p className="status-message">💭 {userProfile.statusMessage}</p>
            )}
            <p className="bio">{userProfile.bio || "No bio available"}</p>
            
            {/* Action Buttons */}
            <div className="profile-actions">
              {isOwnProfile && (
                <>
                  <button 
                    className="edit-profile-btn"
                    onClick={() => setShowEditModal(true)}
                  >
                    ✏️ Edit Profile
                  </button>
                  <button 
                    className="privacy-settings-btn"
                    onClick={() => setShowPrivacyModal(true)}
                  >
                    🔒 Privacy & Notifications
                  </button>
                  <button 
                    className="analytics-btn"
                    onClick={() => setShowAnalyticsModal(true)}
                  >
                    📊 View Analytics
                  </button>
                </>
              )}
            </div>

            <div className="profile-stats">
              <div className="stat">
                <span className="stat-value">{userUploads?.length || 0}</span>
                <span className="stat-label">Uploads</span>
              </div>
              <div className="stat">
                <span className="stat-value">{userProfile.connectionCount || 0}</span>
                <span className="stat-label">Connections</span>
              </div>
            </div>
            
            {/* Extended Profile Information */}
            <div className="profile-extended-info">
              {(userProfile.location || userProfile.company || userProfile.jobTitle) && (
                <div className="info-section">
                  {userProfile.location && (
                    <div className="info-item">
                      <span className="info-icon">📍</span>
                      <span>{userProfile.location}</span>
                    </div>
                  )}
                  {userProfile.company && (
                    <div className="info-item">
                      <span className="info-icon">🏢</span>
                      <span>{userProfile.company}</span>
                      {userProfile.jobTitle && <span className="job-title"> • {userProfile.jobTitle}</span>}
                    </div>
                  )}
                  {userProfile.website && (
                    <div className="info-item">
                      <span className="info-icon">🔗</span>
                      <a href={userProfile.website} target="_blank" rel="noopener noreferrer">
                        {userProfile.website}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Social Links */}
              {userProfile.socialLinks && Object.values(userProfile.socialLinks).some(link => link) && (
                <div className="social-links">
                  <h4>Social Links</h4>
                  <div className="social-icons">
                    {userProfile.socialLinks.twitter && (
                      <a href={`https://twitter.com/${userProfile.socialLinks.twitter.replace('@', '')}`} 
                         target="_blank" rel="noopener noreferrer" className="social-link">
                        🐦
                      </a>
                    )}
                    {userProfile.socialLinks.linkedin && (
                      <a href={`https://linkedin.com/in/${userProfile.socialLinks.linkedin}`} 
                         target="_blank" rel="noopener noreferrer" className="social-link">
                        💼
                      </a>
                    )}
                    {userProfile.socialLinks.github && (
                      <a href={`https://github.com/${userProfile.socialLinks.github}`} 
                         target="_blank" rel="noopener noreferrer" className="social-link">
                        🐙
                      </a>
                    )}
                    {userProfile.socialLinks.instagram && (
                      <a href={`https://instagram.com/${userProfile.socialLinks.instagram.replace('@', '')}`} 
                         target="_blank" rel="noopener noreferrer" className="social-link">
                        📷
                      </a>
                    )}
                    {userProfile.socialLinks.facebook && (
                      <a href={`https://facebook.com/${userProfile.socialLinks.facebook}`} 
                         target="_blank" rel="noopener noreferrer" className="social-link">
                        👤
                      </a>
                    )}
                    {userProfile.socialLinks.youtube && (
                      <a href={`https://youtube.com/c/${userProfile.socialLinks.youtube}`} 
                         target="_blank" rel="noopener noreferrer" className="social-link">
                        📺
                      </a>
                    )}
                  </div>
                </div>
              )}
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
    <div className={`user-profile-container ${isVisible ? 'visible' : ''} ${isClosing ? 'closing' : ''}`}>
      <div className="profile-header-gradient"></div>
      
      <div className="user-profile-header">
        <div className="header-content">
          <div className="profile-title-section">
            <h2 className="profile-title">{username}'s Profile</h2>
            <div className="profile-subtitle">
              {userProfile?.isOnline ? (
                <span className="online-indicator">🟢 Online</span>
              ) : (
                <span className="offline-indicator">⚪ Offline</span>
              )}
            </div>
          </div>
          
          <button className="close-btn" onClick={onClose}>
            <span className="close-icon">×</span>
          </button>
        </div>
        
        <div className="profile-tabs">
          <div className="tabs-container">
            <button 
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => handleTabChange('profile')}
            >
              <span className="tab-icon">👤</span>
              <span className="tab-label">Profile</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'uploads' ? 'active' : ''}`}
              onClick={() => handleTabChange('uploads')}
            >
              <span className="tab-icon">📁</span>
              <span className="tab-label">Media</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => handleTabChange('history')}
            >
              <span className="tab-icon">📚</span>
              <span className="tab-label">History</span>
            </button>
            <div className="tab-indicator"></div>
          </div>
        </div>
      </div>

      <div className="user-profile-content">
        <div className="content-wrapper">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
              </div>
              <p className="loading-text">Loading profile...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <p className="error-message">{error}</p>
              <button className="retry-btn" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          ) : (
            <div className="tab-content">
              {activeTab === 'profile' && renderProfileInfo()}
              {activeTab === 'uploads' && (
                <div className="uploads-container">
                  <h3>Media Gallery</h3>
                  <EnhancedMediaGallery
                    userUploads={userUploads}
                    userId={userId}
                    isOwnProfile={isOwnProfile}
                    onRefresh={() => {
                      // Refresh uploads data
                      userDataService.fetchUserUploads(userId).then(setUserUploads);
                    }}
                  />
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

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          userProfile={userProfile}
          onClose={() => setShowEditModal(false)}
          onSave={handleProfileSave}
        />
      )}

      {/* Privacy Settings Modal */}
      {showPrivacyModal && (
        <PrivacySettings
          userProfile={userProfile}
          onClose={() => setShowPrivacyModal(false)}
          onSave={handleProfileSave}
        />
      )}

      {/* Profile Analytics Modal */}
      {showAnalyticsModal && (
        <ProfileAnalytics
          userProfile={userProfile}
          onClose={() => setShowAnalyticsModal(false)}
        />
      )}
    </div>
  );
};

export default UserProfile;