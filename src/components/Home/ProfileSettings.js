import React, { useState } from 'react';
import { getInitials, getAvatarColorClass } from './AvatarUtils';
import './ProfileSettings.css';
import './AvatarUtils.css';

const ProfileSettings = ({ 
  user = {}, 
  onSave, 
  onCancel, 
  darkMode 
}) => {
  // Default user data
  const defaultUser = {
    name: 'User',
    email: 'user@example.com',
    avatar: null,
    status: 'online',
    role: 'User',
    statusMessage: 'Available',
    bio: '',
    phone: '',
    location: '',
    website: '',
    company: ''
  };

  // Merge provided user with defaults
  const initialUser = { ...defaultUser, ...user };
  
  // State for form fields
  const [formData, setFormData] = useState(initialUser);
  const [avatarPreview, setAvatarPreview] = useState(initialUser.avatar);
  const [saving, setSaving] = useState(false);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // File size validation (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    
    // Preview the selected image
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Get avatar color class
  const avatarColorClass = getAvatarColorClass(formData.name);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Here you would normally upload the avatar file to your server
      // and get back a URL to store
      
      // For demonstration, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the user data with the new avatar URL
      const updatedUser = {
        ...formData,
        avatar: avatarPreview
      };
      
      // Call the parent component's save handler
      onSave && onSave(updatedUser);
      
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className={`profile-settings ${darkMode ? 'dark' : ''}`}>
      <h2 className="profile-settings-title">Edit Profile</h2>
      
      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="avatar-upload">
          <div className={`current-avatar ${avatarColorClass}`}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Profile" />
            ) : (
              <div className="avatar-initials avatar-xxl">{getInitials(formData.name)}</div>
            )}
          </div>
          
          <div className="avatar-controls">
            <label className="upload-button">
              Upload Photo
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                hidden 
              />
            </label>
            {avatarPreview && (
              <button 
                type="button" 
                className="remove-button"
                onClick={() => setAvatarPreview(null)}
              >
                Remove
              </button>
            )}
          </div>
        </div>
        
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="name">Display Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone (optional)</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Your phone number"
            />
          </div>
        </div>
        
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
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself"
              rows="4"
            />
          </div>
        </div>
        
        <div className="form-section">
          <h3>Additional Information</h3>
          
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
            <label htmlFor="company">Company</label>
            <input
              id="company"
              name="company"
              type="text"
              value={formData.company}
              onChange={handleChange}
              placeholder="Where you work"
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
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button" 
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          
          <button 
            type="submit" 
            className="save-button"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;
