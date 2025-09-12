import React, { useState, useEffect, useRef } from 'react';
import './EnhancedProfile.css';
import { authService } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

const EnhancedProfile = ({ user, onClose, onUpdate, darkMode = false }) => {
  const { updateUser } = useAuth(); // Get updateUser function from AuthContext
  // Enhanced form state with more fields
  const [formData, setFormData] = useState({
    // Basic Information
    username: user?.username || '',
    email: user?.email || '',
    name: user?.name || '',
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    
    // Contact Information
    phone: user?.phone || '',
    location: user?.location || '',
    website: user?.website || '',
    company: user?.company || '',
    jobTitle: user?.jobTitle || '',
    
    // Social Links
    twitter: user?.socialLinks?.twitter || '',
    linkedin: user?.socialLinks?.linkedin || '',
    github: user?.socialLinks?.github || '',
    
    // Preferences
    theme: user?.theme || 'light',
    language: user?.language || 'en',
    timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    notifications: {
      email: user?.notifications?.email !== false,
      push: user?.notifications?.push !== false,
      mentions: user?.notifications?.mentions !== false,
      messages: user?.notifications?.messages !== false,
    },
    
    // Privacy Settings
    profileVisibility: user?.privacy?.profileVisibility || 'public',
    showOnlineStatus: user?.privacy?.showOnlineStatus !== false,
    allowDirectMessages: user?.privacy?.allowDirectMessages !== false,
    
    // Avatar and appearance
    avatar: user?.avatar || null,
    avatarColor: user?.avatarColor || '#6366f1',
    statusMessage: user?.statusMessage || '',
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fileInputRef = useRef(null);

  // Track changes to show unsaved indicator
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify({
      username: user?.username || '',
      email: user?.email || '',
      name: user?.name || '',
      // ... compare with original user data
    });
    setUnsavedChanges(hasChanges);
  }, [formData, user]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      // Handle nested properties (e.g., notifications.email)
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Handle avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar file size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Set loading state for avatar upload
    setLoading(true);
    setError(null);

    try {
      // Create preview first
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload avatar to server
      const result = await authService.uploadAvatar(file);
      
      if (result.success) {
        // Update form data with the server URL
        setFormData(prev => ({ ...prev, avatar: result.avatarUrl }));
        setSuccess('Avatar uploaded successfully!');
        
        // Update user data in storage
        const currentUser = authService.getUser();
        if (currentUser) {
          const updatedUser = { ...currentUser, avatar: result.avatarUrl };
          const token = authService.getToken();
          authService.saveUserSession(updatedUser, token, true);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      setError(`Failed to upload avatar: ${error.message}`);
      // Reset preview on error
      setAvatarPreview(user?.avatar || null);
    } finally {
      setLoading(false);
    }
  };

  // Remove avatar
  const removeAvatar = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call remove avatar API
      await authService.removeAvatar();
      
      // Clear preview and form data
      setAvatarPreview(null);
      setFormData(prev => ({ ...prev, avatar: null }));
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Update user data in storage
      const currentUser = authService.getUser();
      if (currentUser) {
        const updatedUser = { ...currentUser, avatar: null };
        const token = authService.getToken();
        authService.saveUserSession(updatedUser, token, true);
      }

      setSuccess('Avatar removed successfully!');
    } catch (error) {
      console.error('Remove avatar error:', error);
      setError(`Failed to remove avatar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Save profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    console.log('Save Profile Button Clicked!');
    console.log('Current user prop:', user);
    console.log('FormData state:', formData);
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Debug: Check what tokens are available
      const authToken = localStorage.getItem('authToken');
      const token = localStorage.getItem('token');
      const sessionAuthToken = sessionStorage.getItem('authToken');
      const sessionToken = sessionStorage.getItem('token');
      const currentUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      
      console.log('Profile Save Debug - Available tokens:', {
        authToken: authToken ? 'present' : 'missing',
        token: token ? 'present' : 'missing',
        sessionAuthToken: sessionAuthToken ? 'present' : 'missing',
        sessionToken: sessionToken ? 'present' : 'missing',
        currentUser: currentUser ? 'present' : 'missing'
      });

      // Check if we have any token at all
      const hasToken = authToken || token || sessionAuthToken || sessionToken;
      if (!hasToken) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Prepare update data (exclude avatar since it's handled separately)
      const updateData = {
        name: formData.name,
        displayName: formData.displayName,
        bio: formData.bio,
        phone: formData.phone,
        location: formData.location,
        website: formData.website,
        company: formData.company,
        jobTitle: formData.jobTitle,
        statusMessage: formData.statusMessage,
        avatarColor: formData.avatarColor,
        socialLinks: {
          twitter: formData.twitter,
          linkedin: formData.linkedin,
          github: formData.github,
          instagram: formData.instagram,
          facebook: formData.facebook,
          youtube: formData.youtube,
          website: formData.socialWebsite
        }
      };

      console.log('Profile Save Debug - Update data:', updateData);

      // Update profile via API
      const response = await authService.updateProfile(updateData);
      
      console.log('Profile Save Debug - API response:', response);
      
      if (response.success) {
        setSuccess('Profile updated successfully!');
        setUnsavedChanges(false);
        
        // Update AuthContext with new user data
        updateUser(response.user);
        
        // Notify parent component
        if (onUpdate) {
          onUpdate(response.user);
        }
      }

    } catch (err) {
      console.error('Profile update error details:', {
        error: err,
        message: err.message,
        stack: err.stack,
        response: err.response?.data
      });
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Save preferences
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const preferencesData = {
        theme: formData.theme,
        language: formData.language,
        timezone: formData.timezone,
        notifications: formData.notifications,
        privacy: {
          profileVisibility: formData.profileVisibility,
          showOnlineStatus: formData.showOnlineStatus,
          allowDirectMessages: formData.allowDirectMessages,
          lastSeenVisibility: formData.lastSeenVisibility || 'everyone',
          onlineStatusVisibility: formData.onlineStatusVisibility || 'everyone',
          phoneVisibility: formData.phoneVisibility || 'contacts',
          emailVisibility: formData.emailVisibility || 'contacts',
          locationVisibility: formData.locationVisibility || 'contacts'
        }
      };

      const response = await authService.updateCurrentUserPreferences(preferencesData);
      
      if (response.success) {
        setSuccess('Preferences updated successfully!');
        setUnsavedChanges(false);
        
        // Update AuthContext with new user data
        updateUser(response.user);
        
        if (onUpdate) {
          onUpdate(response.user);
        }
      }

    } catch (err) {
      console.error('Preferences update error:', err);
      setError(err.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authService.changeCurrentUserPassword(
        passwordData.currentPassword, 
        passwordData.newPassword
      );
      
      if (response.success) {
        setSuccess('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }

    } catch (err) {
      console.error('Password change error:', err);
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Get user initials for avatar placeholder
  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U';
  };

  return (
    <div className={`enhanced-profile ${darkMode ? 'dark' : ''}`}>
      <div className="profile-header">
        <h2>Account Settings</h2>
        {unsavedChanges && <span className="unsaved-indicator">Unsaved changes</span>}
        <button className="close-button" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Profile
        </button>
        <button 
          className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Preferences
        </button>
        <button 
          className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <circle cx="12" cy="16" r="1"></circle>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Security
        </button>
      </div>

      {/* Status Messages */}
      {error && <div className="profile-error">{error}</div>}
      {success && <div className="profile-success">{success}</div>}

      {/* Profile Tab Content */}
      {activeTab === 'profile' && (
        <form className="profile-form" onSubmit={handleSaveProfile}>
          {/* Avatar Section */}
          <div className="form-section">
            <h3>Profile Picture</h3>
            <div className="avatar-section">
              <div className="avatar-container">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="avatar-preview" />
                ) : (
                  <div 
                    className="avatar-placeholder" 
                    style={{ backgroundColor: formData.avatarColor }}
                  >
                    {getInitials(formData.name)}
                  </div>
                )}
              </div>
              <div className="avatar-controls">
                <label className={`upload-button ${loading ? 'loading' : ''}`}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarChange}
                    ref={fileInputRef}
                    hidden 
                    disabled={loading}
                  />
                  {loading ? 'Uploading...' : 'Upload Photo'}
                </label>
                {avatarPreview && (
                  <button 
                    type="button" 
                    className="remove-button" 
                    onClick={removeAvatar}
                    disabled={loading}
                  >
                    {loading ? 'Removing...' : 'Remove'}
                  </button>
                )}
                <div className="avatar-color-picker">
                  <label>Avatar Color:</label>
                  <input
                    type="color"
                    value={formData.avatarColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, avatarColor: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="How others see you"
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Status and Bio */}
          <div className="form-section">
            <h3>About</h3>
            <div className="form-group">
              <label htmlFor="statusMessage">Status Message</label>
              <input
                id="statusMessage"
                name="statusMessage"
                type="text"
                value={formData.statusMessage}
                onChange={handleChange}
                placeholder="What's on your mind?"
                maxLength="100"
              />
            </div>
            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                placeholder="Tell us about yourself..."
                maxLength="500"
              />
              <div className="char-count">{formData.bio.length}/500</div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="form-section">
            <h3>Professional Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="company">Company</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="jobTitle">Job Title</label>
                <input
                  id="jobTitle"
                  name="jobTitle"
                  type="text"
                  value={formData.jobTitle}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, Country"
                />
              </div>
              <div className="form-group">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="form-section">
            <h3>Social Links</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="twitter">Twitter</label>
                <input
                  id="twitter"
                  name="twitter"
                  type="text"
                  value={formData.twitter}
                  onChange={handleChange}
                  placeholder="@username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="linkedin">LinkedIn</label>
                <input
                  id="linkedin"
                  name="linkedin"
                  type="url"
                  value={formData.linkedin}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="github">GitHub</label>
                <input
                  id="github"
                  name="github"
                  type="text"
                  value={formData.github}
                  onChange={handleChange}
                  placeholder="username"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="save-button" 
              disabled={loading}
              onClick={(e) => {
                console.log('Save button clicked directly!');
                // Don't prevent default here, let the form submit handle it
              }}
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}

      {/* Preferences Tab Content */}
      {activeTab === 'preferences' && (
        <form className="profile-form" onSubmit={handleSavePreferences}>
          {/* Appearance */}
          <div className="form-section">
            <h3>Appearance</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="theme">Theme</label>
                <select
                  id="theme"
                  name="theme"
                  value={formData.theme}
                  onChange={handleChange}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System Default</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="language">Language</label>
                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="pt">Português</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="timezone">Timezone</label>
                <select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">GMT</option>
                  <option value="Europe/Paris">Central European Time</option>
                  <option value="Asia/Tokyo">Japan Standard Time</option>
                  <option value="Australia/Sydney">Australian Eastern Time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="form-section">
            <h3>Notifications</h3>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="notifications.email"
                  checked={formData.notifications.email}
                  onChange={handleChange}
                />
                Email notifications
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="notifications.push"
                  checked={formData.notifications.push}
                  onChange={handleChange}
                />
                Push notifications
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="notifications.mentions"
                  checked={formData.notifications.mentions}
                  onChange={handleChange}
                />
                Notify when mentioned
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="notifications.messages"
                  checked={formData.notifications.messages}
                  onChange={handleChange}
                />
                New message notifications
              </label>
            </div>
          </div>

          {/* Privacy */}
          <div className="form-section">
            <h3>Privacy</h3>
            <div className="form-group">
              <label htmlFor="profileVisibility">Profile Visibility</label>
              <select
                id="profileVisibility"
                name="profileVisibility"
                value={formData.profileVisibility}
                onChange={handleChange}
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="showOnlineStatus"
                  checked={formData.showOnlineStatus}
                  onChange={handleChange}
                />
                Show online status
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="allowDirectMessages"
                  checked={formData.allowDirectMessages}
                  onChange={handleChange}
                />
                Allow direct messages
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}

      {/* Security Tab Content */}
      {activeTab === 'security' && (
        <div className="security-tab-content">
          {/* Security Overview */}
          <div className="form-section">
            <h3>Account Security</h3>
            <div className="security-status-card">
              <div className="security-score">
                <div className="score-icon">🛡️</div>
                <div className="score-info">
                  <div className="score-title">Security Level</div>
                  <div className="score-description">Your account security status</div>
                </div>
                <button 
                  type="button" 
                  className="view-security-btn"
                  onClick={() => {
                    // This would open the SecurityDashboard component
                    console.log('Open security dashboard');
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="form-section">
            <h3>Two-Factor Authentication</h3>
            <div className="two-factor-status">
              <div className="status-indicator">
                <div className="status-icon">
                  {/* This would be dynamically updated based on 2FA status */}
                  <span className="icon-placeholder">🔓</span>
                </div>
                <div className="status-content">
                  <div className="status-title">Two-Factor Authentication is Off</div>
                  <div className="status-description">
                    Add an extra layer of security to protect your account
                  </div>
                </div>
                <button 
                  type="button" 
                  className="enable-2fa-btn"
                  onClick={() => {
                    // This would open the TwoFactorSetup component
                    console.log('Enable 2FA');
                  }}
                >
                  Enable 2FA
                </button>
              </div>
              
              <div className="security-benefits">
                <h4>Benefits of enabling 2FA:</h4>
                <ul>
                  <li>🛡️ Protects against password breaches</li>
                  <li>🔐 Adds an extra layer of security</li>
                  <li>📱 Works with popular authenticator apps</li>
                  <li>🔑 Includes backup codes for recovery</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Password Change */}
          <form className="password-change-form" onSubmit={handlePasswordChange}>
            <div className="form-section">
              <h3>Change Password</h3>
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({
                    ...prev,
                    currentPassword: e.target.value
                  }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({
                    ...prev,
                    newPassword: e.target.value
                  }))}
                  required
                  minLength="8"
                />
                <div className="password-requirements">
                  Password must be at least 8 characters long
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({
                    ...prev,
                    confirmPassword: e.target.value
                  }))}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-button" disabled={loading}>
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default EnhancedProfile;
