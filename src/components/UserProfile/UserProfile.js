import React, { useState, useEffect } from 'react';
import './UserProfile.css';
import userDataService from '../../services/userDataService';
import EditProfileModal from './EditProfileModal';
import PrivacySettings from './PrivacySettings';
import ProfileAnalytics from './ProfileAnalytics';
import EnhancedMediaGallery from './EnhancedMediaGallery';
import AvatarUpload from './AvatarUpload';
import ContactManager from '../Contacts/ContactManager';

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
  const getCurrentUserId = () => {
    // Try to get user ID from localStorage first (remember me)
    const localUser = localStorage.getItem('user');
    if (localUser) {
      try {
        const userData = JSON.parse(localUser);
        return userData.id || userData.username;
      } catch (error) {
        console.error('Error parsing localStorage user data:', error);
      }
    }
    
    // Fallback to sessionStorage (current session)
    const sessionUser = sessionStorage.getItem('user');
    if (sessionUser) {
      try {
        const userData = JSON.parse(sessionUser);
        return userData.id || userData.username;
      } catch (error) {
        console.error('Error parsing sessionStorage user data:', error);
      }
    }
    
    return null;
  };
  
  const currentUserId = getCurrentUserId();
  const isOwnProfile = userId === currentUserId;
  
  // Debug logging for authentication
  console.log('UserProfile authentication check:', {
    userId,
    currentUserId,
    isOwnProfile,
    localStorageUser: localStorage.getItem('user'),
    sessionStorageUser: sessionStorage.getItem('user')
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // For the current user's own profile, try to get real data first
        if (isOwnProfile) {
          try {
            // Try to get current user data from localStorage/sessionStorage
            const localUser = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (localUser) {
              const userData = JSON.parse(localUser);
              console.log('📋 Setting current user profile from local storage:', userData);
              setUserProfile({
                ...userData,
                userId: userData.id,
                username: userData.username,
                displayName: userData.displayName || userData.name,
                bio: userData.bio || '',
                avatarUrl: userData.avatar,
                uploadCount: 0,
                connectionCount: 0,
                activityScore: 0,
                joinDate: userData.createdAt,
                isOnline: true, // Current user is always online
                status: 'online'
              });
            }
          } catch (error) {
            console.warn('⚠️ Could not parse user data from storage:', error);
          }
        }
        
        // Fetch user profile data (this will either get real API data or mock data)
        console.log('🔍 Fetching user profile for:', userId, isOwnProfile ? '(own profile)' : '(other user)');
        const profileData = await userDataService.fetchUserProfile(userId);
        console.log('✅ Profile data received:', profileData);
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
  }, [userId, activeTab, isOwnProfile]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleProfileSave = (updatedProfile) => {
    console.log('💾 Saving updated profile:', updatedProfile);
    setUserProfile(prev => ({
      ...prev,
      ...updatedProfile,
      // Ensure online status is maintained for current user
      isOnline: isOwnProfile ? true : prev?.isOnline,
      status: isOwnProfile ? 'online' : prev?.status
    }));
    
    // Also update localStorage if this is the current user
    if (isOwnProfile) {
      try {
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        const updatedUser = {
          ...currentUser,
          ...updatedProfile,
          isOnline: true,
          status: 'online'
        };
        
        // Update both localStorage and sessionStorage
        if (localStorage.getItem('user')) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        if (sessionStorage.getItem('user')) {
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
        console.log('✅ Updated user data in local storage');
      } catch (error) {
        console.warn('⚠️ Could not update user data in storage:', error);
      }
    }
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
            <button 
              className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
              onClick={() => handleTabChange('contacts')}
            >
              <span className="tab-icon">👥</span>
              <span className="tab-label">Contacts</span>
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
              {activeTab === 'contacts' && (
                <div className="contacts-container">
                  <h3>Contact Management</h3>
                  <ContactManager />
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