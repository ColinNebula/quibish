import React, { useState, useEffect, useRef } from 'react';
import './Profile.css';
import { authService } from '../../services/apiClient';

const Profile = ({ user, onClose, onUpdate }) => {
  // State for form fields and validation
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    avatar: user?.avatar || null,
    theme: user?.preferences?.theme || 'light',
    notifications: user?.preferences?.notifications !== false, // Default to true
    language: user?.preferences?.language || 'en',
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'preferences'
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  
  const fileInputRef = useRef(null);

  // Handle input changes for all form fields
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle avatar file upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Preview image
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      setFormData({ ...formData, avatar: file });
    };
    reader.readAsDataURL(file);
  };

  // Save profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Create form data if we have an avatar file
      let data;
      if (formData.avatar instanceof File) {
        const formDataObj = new FormData();
        formDataObj.append('username', formData.username);
        formDataObj.append('email', formData.email);
        formDataObj.append('displayName', formData.displayName);
        formDataObj.append('bio', formData.bio);
        formDataObj.append('avatar', formData.avatar);
        data = formDataObj;
      } else {
        // Otherwise just send JSON
        data = {
          username: formData.username,
          email: formData.email,
          displayName: formData.displayName,
          bio: formData.bio,
          avatar: formData.avatar
        };
      }
      
      // Call API to update user
      const updatedUser = await authService.updateUser(user.id, data);
      
      // Update local session
      const currentUser = authService.getUser();
      const updatedUserData = { ...currentUser, ...updatedUser };
      authService.saveUserSession(updatedUserData, authService.getToken(), true);
      
      setSuccess('Profile updated successfully');
      onUpdate(updatedUserData);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await authService.changePassword(user.id, currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to change password');
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
      const preferences = {
        theme: formData.theme,
        notifications: formData.notifications,
        language: formData.language
      };
      
      await authService.updatePreferences(user.id, preferences);
      
      // Update local session
      const currentUser = authService.getUser();
      const updatedUserData = { 
        ...currentUser, 
        preferences
      };
      authService.saveUserSession(updatedUserData, authService.getToken(), true);
      
      setSuccess('Preferences updated successfully');
      onUpdate(updatedUserData);
    } catch (err) {
      setError(err.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Account Settings</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button 
          className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
        <button 
          className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
      </div>
      
      {error && <div className="profile-error">{error}</div>}
      {success && <div className="profile-success">{success}</div>}
      
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form className="profile-form" onSubmit={handleSaveProfile}>
          <div className="avatar-section">
            <div className="avatar-container">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="avatar-preview" />
              ) : (
                <div className="avatar-placeholder">
                  {formData.username.substring(0, 2).toUpperCase()}
                </div>
              )}
              <button 
                type="button" 
                className="change-avatar-button"
                onClick={() => fileInputRef.current.click()}
              >
                Change Avatar
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
                accept="image/*"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="Your display name (optional)"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows="3"
              placeholder="Tell us a little about yourself..."
            />
          </div>
          
          <button 
            type="submit" 
            className="save-button"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}
      
      {/* Security Tab */}
      {activeTab === 'security' && (
        <form className="profile-form" onSubmit={handlePasswordChange}>
          <h3>Change Password</h3>
          
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="save-button"
            disabled={loading}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      )}
      
      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <form className="profile-form" onSubmit={handleSavePreferences}>
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
          
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="notifications"
                checked={formData.notifications}
                onChange={handleChange}
              />
              Enable Notifications
            </label>
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
            </select>
          </div>
          
          <button 
            type="submit" 
            className="save-button"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Profile;
