import React, { useState, useRef, useCallback } from 'react';
import './EditProfileModal.css';
import userDataService from '../../services/userDataService';

const EditProfileModal = ({ userProfile, onClose, onSave }) => {
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
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
        setAvatarFile(file);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
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
    setLoading(true);
    try {
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
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      // Upload avatar if changed
      let avatarUrl = userProfile?.avatar;
      if (avatarFile) {
        try {
          const uploadResult = await userDataService.api.uploadAvatar(avatarFile);
          avatarUrl = uploadResult.avatarUrl;
          console.log('✅ Avatar uploaded successfully in EditProfileModal:', uploadResult);
        } catch (uploadError) {
          console.error('❌ Avatar upload failed in EditProfileModal:', uploadError);
          // Continue with profile update even if avatar upload fails
        }
      }

      // Update profile
      const updatedProfile = {
        ...formData,
        avatar: avatarUrl
      };

      await userDataService.updateUserProfile(userProfile.id, updatedProfile);
      onSave(updatedProfile);
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({ general: 'Failed to save profile. Please try again.' });
    } finally {
      setLoading(false);
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