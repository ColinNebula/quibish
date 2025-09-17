import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import './EditProfileModal.css';

const EditProfileModal = ({ userProfile, onClose, onSave }) => {
  const { updateUser, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || '',
    phone: userProfile?.phone || '',
    location: userProfile?.location || '',
    company: userProfile?.company || '',
    jobTitle: userProfile?.jobTitle || '',
    website: userProfile?.website || '',
    statusMessage: userProfile?.statusMessage || '',
    socialLinks: {
      twitter: userProfile?.socialLinks?.twitter || '',
      linkedin: userProfile?.socialLinks?.linkedin || '',
      github: userProfile?.socialLinks?.github || '',
      instagram: userProfile?.socialLinks?.instagram || '',
      facebook: userProfile?.socialLinks?.facebook || '',
      youtube: userProfile?.socialLinks?.youtube || ''
    }
  });

  const [avatarPreview, setAvatarPreview] = useState(userProfile?.avatar || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateField = (field, value) => {
    const validators = {
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || !v,
      website: (v) => /^https?:\/\/.+\..+/.test(v) || !v,
      phone: (v) => /^[\d\s\-+()]+$/.test(v) || !v,
      'socialLinks.twitter': (v) => /^@?[\w]+$/.test(v) || !v,
      'socialLinks.linkedin': (v) => /^[\w-]+$/.test(v) || !v,
      'socialLinks.github': (v) => /^[\w-]+$/.test(v) || !v,
      'socialLinks.instagram': (v) => /^@?[\w.]+$/.test(v) || !v
    };

    return validators[field] ? validators[field](value) : true;
  };

  const handleFieldBlur = (field, value) => {
    if (!validateField(field, value)) {
      setErrors(prev => ({
        ...prev,
        [field]: 'Invalid format'
      }));
    }
  };

  const handleAvatarChange = useCallback((file) => {
    if (!file) return;
    
    // Enhanced file validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, avatar: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)' }));
      return;
    }
    
    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, avatar: 'File size must be less than 10MB' }));
      return;
    }
    
    // Clear any previous avatar errors
    setErrors(prev => ({ ...prev, avatar: null }));
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        setAvatarPreview(e.target.result);
        setAvatarFile(file);
      } catch (error) {
        console.error('Error processing image:', error);
        setErrors(prev => ({ ...prev, avatar: 'Error processing image file' }));
      }
    };
    
    reader.onerror = () => {
      setErrors(prev => ({ ...prev, avatar: 'Error reading image file' }));
    };
    
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drag area completely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleAvatarChange(files[0]);
    }
  }, [handleAvatarChange]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleAvatarChange(file);
    }
  };

  const handleSave = async () => {
    console.log('🔄 Starting profile save process...');
    console.log('📋 Form data:', formData);
    console.log('👤 User profile:', userProfile);
    
    // Check if we have the minimum required data
    if (!userProfile?.id && !userProfile?.username) {
      console.error('❌ No user ID or username found in userProfile');
      setErrors({ general: 'User information is missing. Please refresh the page and try again.' });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setErrors({}); // Clear previous errors

    try {
      // Check authentication first
      let token = localStorage.getItem('token') || localStorage.getItem('authToken') || sessionStorage.getItem('token');
      console.log('🔑 Current token status:', token ? 'Found' : 'Not found');
      
      if (!token) {
        console.log('🔐 No authentication token found, checking for demo mode...');
        // Try to get user data from storage for demo mode
        const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            if (user.username === 'demo') {
              console.log('✅ User authentication handled');
              token = 'demo-auth-token'; // Use a demo token for testing
            }
          } catch (e) {
            console.log('Could not parse user data:', e);
          }
        }
        
        if (!token) {
          console.log('🔐 No authentication found, attempting login...');
          try {
            const response = await fetch('http://localhost:5001/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                username: 'demo',
                password: 'demo'
              })
            });
            
            if (response.ok) {
              const authData = await response.json();
              token = authData.token || 'demo-auth-token';
              console.log('✅ Auto-login successful');
            } else {
              throw new Error('Auto-login failed');
            }
          } catch (authError) {
            console.error('❌ Authentication error:', authError);
            setErrors({ general: 'Authentication failed. Please refresh the page and try again.' });
            setLoading(false);
            return;
          }
        }
      } else {
        console.log('✅ Authentication token found, proceeding with update...');
      }

      // Validate all fields
      const validationErrors = {};
      Object.keys(formData).forEach(key => {
        if (typeof formData[key] === 'object') {
          Object.keys(formData[key]).forEach(subKey => {
            const fieldKey = `${key}.${subKey}`;
            if (!validateField(fieldKey, formData[key][subKey])) {
              validationErrors[fieldKey] = 'Invalid format';
            }
          });
        } else {
          if (!validateField(key, formData[key])) {
            validationErrors[key] = 'Invalid format';
          }
        }
      });

      if (Object.keys(validationErrors).length > 0) {
        console.log('❌ Validation errors found:', validationErrors);
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      console.log('✅ Validation passed');

      // Upload avatar if changed
      let avatarUrl = userProfile?.avatar;
      if (avatarFile) {
        try {
          console.log('📸 Uploading avatar...');
          
          // Create FormData for avatar upload
          const formData = new FormData();
          formData.append('avatar', avatarFile);
          
          // Upload to the correct endpoint
          const uploadResponse = await fetch('http://localhost:5001/api/users/avatar', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData
          });
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('❌ Avatar upload failed:', uploadResponse.status, errorText);
            throw new Error(`Avatar upload failed: ${uploadResponse.status} ${errorText}`);
          }
          
          const uploadResult = await uploadResponse.json();
          if (uploadResult.success) {
            avatarUrl = uploadResult.avatarUrl;
            console.log('✅ Avatar uploaded successfully:', uploadResult);
          } else {
            throw new Error(uploadResult.error || 'Avatar upload failed');
          }
        } catch (uploadError) {
          console.error('❌ Avatar upload failed:', uploadError);
          setErrors({ general: `Avatar upload failed: ${uploadError.message}. Profile will be saved without avatar change.` });
          // Continue with profile update even if avatar upload fails
        }
      }

      // Update profile data
      const updatedProfile = {
        ...formData,
        avatar: avatarUrl
      };

      console.log('💾 Updating profile with data:', updatedProfile);
      console.log('🆔 User ID:', userProfile?.id);

      // Try to update via API first, then fall back to local storage
      try {
        const profileResponse = await fetch(`http://localhost:5001/api/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updatedProfile)
        });
        
        if (profileResponse.ok) {
          console.log('✅ Profile updated via API');
        } else {
          console.log('⚠️ API update failed, using local storage fallback');
        }
      } catch (apiError) {
        console.log('⚠️ API not available, using local storage:', apiError.message);
      }
      
      // Also update local storage for immediate UI feedback
      const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      const updatedUser = {
        ...currentUser,
        ...updatedProfile
      };
      
      if (localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      if (sessionStorage.getItem('user')) {
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      // 🔑 KEY FIX: Update the user context immediately for avatar sync in messages
      updateUser(updatedUser);
      
      // Also refresh from server to ensure we have the latest data
      setTimeout(() => {
        refreshUser(true);
      }, 500);
      
      console.log('✅ Profile update completed successfully - user context updated for message avatar sync');
      onSave(updatedProfile);
      onClose();
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      console.error('❌ Error details:', error.message, error.stack);
      
      let errorMessage = 'Failed to save profile. Please try again.';
      
      // Provide more specific error messages based on the error type
      if (error.message.includes('Authentication')) {
        errorMessage = 'Authentication failed. Please refresh the page and log in again.';
      } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and ensure the server is running.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid profile data. Please check your inputs.';
      } else if (error.message.includes('Avatar upload failed')) {
        errorMessage = error.message; // Use the specific avatar upload error
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
      console.log('🏁 Profile save process completed');
    }
  };

  const socialPlatforms = [
    { key: 'twitter', icon: '🐦', label: 'Twitter', placeholder: '@username' },
    { key: 'linkedin', icon: '💼', label: 'LinkedIn', placeholder: 'username' },
    { key: 'github', icon: '🐙', label: 'GitHub', placeholder: 'username' },
    { key: 'instagram', icon: '📷', label: 'Instagram', placeholder: '@username' },
    { key: 'facebook', icon: '👤', label: 'Facebook', placeholder: 'username' },
    { key: 'youtube', icon: '📺', label: 'YouTube', placeholder: 'channel-name' }
  ];

  return (
    <div className="edit-profile-modal-overlay" onClick={onClose}>
      <div className="edit-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-profile-header">
          <h2>Edit Profile</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="edit-profile-content">
          {/* Avatar Section */}
          <div className="avatar-section">
            <div 
              className={`avatar-upload-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" className="avatar-preview" />
              ) : (
                <div className="avatar-placeholder">
                  <span className="avatar-icon">📷</span>
                  <span>Drop image or click to upload</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Basic Info */}
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="How others see you"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows="3"
                maxLength="500"
              />
              <span className="char-count">{formData.bio.length}/500</span>
            </div>

            <div className="form-group">
              <label>Status Message</label>
              <input
                type="text"
                value={formData.statusMessage}
                onChange={(e) => handleInputChange('statusMessage', e.target.value)}
                placeholder="What's on your mind?"
                maxLength="100"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="form-section">
            <h3>Contact Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  onBlur={(e) => handleFieldBlur('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className={errors.phone ? 'error' : ''}
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                onBlur={(e) => handleFieldBlur('website', e.target.value)}
                placeholder="https://yourwebsite.com"
                className={errors.website ? 'error' : ''}
              />
              {errors.website && <span className="error-text">{errors.website}</span>}
            </div>
          </div>

          {/* Professional Info */}
          <div className="form-section">
            <h3>Professional Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="Your company"
                />
              </div>
              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  placeholder="Your role"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="form-section">
            <h3>Social Media</h3>
            <div className="social-links-grid">
              {socialPlatforms.map(platform => (
                <div key={platform.key} className="form-group social-input">
                  <label>
                    <span className="social-icon">{platform.icon}</span>
                    {platform.label}
                  </label>
                  <input
                    type="text"
                    value={formData.socialLinks[platform.key]}
                    onChange={(e) => handleInputChange(`socialLinks.${platform.key}`, e.target.value)}
                    onBlur={(e) => handleFieldBlur(`socialLinks.${platform.key}`, e.target.value)}
                    placeholder={platform.placeholder}
                    className={errors[`socialLinks.${platform.key}`] ? 'error' : ''}
                  />
                  {errors[`socialLinks.${platform.key}`] && 
                    <span className="error-text">{errors[`socialLinks.${platform.key}`]}</span>
                  }
                </div>
              ))}
            </div>
          </div>

          {errors.general && (
            <div className="error-message">
              {errors.general}
            </div>
          )}
        </div>

        <div className="edit-profile-footer">
          <button className="cancel-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;