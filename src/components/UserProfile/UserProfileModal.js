import React, { useState, useEffect } from 'react';
import './UserProfileModal.css';

const UserProfileModal = ({ isOpen, onClose, user, onUpdateProfile }) => {
  console.log('🚀 UserProfileModal rendered with props:', { isOpen, user, hasOnClose: !!onClose, hasOnUpdateProfile: !!onUpdateProfile });
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    avatar: null,
    status: 'online',
    theme: 'light',
    notifications: true,
    privacy: 'friends'
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  // Initialize profile data when user prop changes
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        avatar: user.avatar || null,
        status: user.status || 'online',
        theme: user.theme || 'light',
        notifications: user.notifications !== false,
        privacy: user.privacy || 'friends'
      });
      setAvatarPreview(user.avatar);
    }
  }, [user]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  // Handle avatar upload
  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Enhanced file validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB');
      return;
    }
    
    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const result = e.target.result;
        setAvatarPreview(result);
        setProfile(prev => ({ ...prev, avatar: result }));
        setLoading(false);
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Error processing image file');
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      alert('Error reading file');
      setLoading(false);
    };
    
    reader.readAsDataURL(file);
  };

  // Enhanced form validation
  const validateForm = () => {
    const errors = {};
    
    if (!profile.name?.trim()) {
      errors.name = 'Name is required';
    } else if (profile.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (profile.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(profile.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    if (profile.bio && profile.bio.length > 500) {
      errors.bio = 'Bio must be less than 500 characters';
    }
    
    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      const errorMessage = Object.values(validationErrors).join('\n');
      alert(errorMessage);
      return;
    }

    setLoading(true);
    try {
      // Simulate API call with better error handling
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate random API failures for testing
          if (Math.random() < 0.1) {
            reject(new Error('Network error'));
          } else {
            resolve();
          }
        }, 1000);
      });
      
      if (onUpdateProfile) {
        onUpdateProfile(profile);
      }
      
      // Update local storage for persistence
      const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...profile };
      
      if (localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      if (sessionStorage.getItem('user')) {
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Failed to update profile: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        avatar: user.avatar || null,
        status: user.status || 'online',
        theme: user.theme || 'light',
        notifications: user.notifications !== false,
        privacy: user.privacy || 'friends'
      });
      setAvatarPreview(user.avatar);
    }
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay" onClick={handleOverlayClick}>
      <div className="profile-modal">
        <div className="profile-modal-header">
          <h3>Profile Settings</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="profile-modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
          <button 
            className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            Privacy
          </button>
        </div>

        <div className="profile-modal-content">
          {activeTab === 'profile' && (
            <div className="profile-tab">
              <div className="avatar-section">
                <div className="avatar-container">
                  <div className={`profile-avatar ${loading ? 'loading' : ''}`}>
                    {loading ? (
                      <div className="avatar-loading">
                        <div className="loading-spinner"></div>
                        <span>Processing...</span>
                      </div>
                    ) : avatarPreview ? (
                      <img src={avatarPreview} alt="Profile" onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }} />
                    ) : (
                      <div className="avatar-placeholder">
                        {profile.name.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="status-indicator" data-status={profile.status}></div>
                  </div>
                  {isEditing && (
                    <div className="avatar-upload">
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                        disabled={loading}
                      />
                      <label htmlFor="avatar-upload" className={`upload-btn ${loading ? 'disabled' : ''}`}>
                        {loading ? 'Processing...' : 'Change Photo'}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="profile-form">
                <div className="form-group">
                  <label>Display Name *</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!isEditing}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                    rows="3"
                    placeholder="Tell others about yourself..."
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={profile.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    disabled={!isEditing}
                  >
                    <option value="online">🟢 Online</option>
                    <option value="away">🟡 Away</option>
                    <option value="busy">🔴 Busy</option>
                    <option value="offline">⚫ Offline</option>
                  </select>
                </div>

                <div className="form-actions">
                  {!isEditing ? (
                    <button type="button" onClick={() => setIsEditing(true)} className="edit-btn">
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                        Cancel
                      </button>
                      <button type="submit" disabled={loading} className="save-btn">
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="preferences-tab">
              <div className="pref-group">
                <label>Theme</label>
                <div className="theme-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={profile.theme === 'light'}
                      onChange={(e) => handleInputChange('theme', e.target.value)}
                    />
                    <span>☀️ Light</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={profile.theme === 'dark'}
                      onChange={(e) => handleInputChange('theme', e.target.value)}
                    />
                    <span>🌙 Dark</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="theme"
                      value="auto"
                      checked={profile.theme === 'auto'}
                      onChange={(e) => handleInputChange('theme', e.target.value)}
                    />
                    <span>🔄 Auto</span>
                  </label>
                </div>
              </div>

              <div className="pref-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={profile.notifications}
                    onChange={(e) => handleInputChange('notifications', e.target.checked)}
                  />
                  <span>Enable Notifications</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="privacy-tab">
              <div className="pref-group">
                <label>Profile Visibility</label>
                <select
                  value={profile.privacy}
                  onChange={(e) => handleInputChange('privacy', e.target.value)}
                >
                  <option value="public">🌐 Public</option>
                  <option value="friends">👥 Friends Only</option>
                  <option value="private">🔒 Private</option>
                </select>
              </div>

              <div className="privacy-info">
                <h4>Privacy Settings</h4>
                <ul>
                  <li><strong>Public:</strong> Your profile is visible to everyone</li>
                  <li><strong>Friends Only:</strong> Only your contacts can see your profile</li>
                  <li><strong>Private:</strong> Your profile is hidden from others</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;