import React, { useState, useEffect, useCallback } from 'react';
import { mobileUtils } from '../../services/mobileInteractionService';
import './ContactModal.css';

const ContactModal = ({ isOpen, contact, onClose, onSave, darkMode = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    website: '',
    location: '',
    notes: '',
    category: 'friends',
    tags: [],
    avatar: null,
    socialLinks: {
      twitter: '',
      linkedin: '',
      instagram: '',
      facebook: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Initialize form data when contact changes
  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        nickname: contact.nickname || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        jobTitle: contact.jobTitle || '',
        website: contact.website || '',
        location: contact.location || '',
        notes: contact.notes || '',
        category: contact.category || 'friends',
        tags: contact.tags || [],
        avatar: contact.avatar || null,
        socialLinks: {
          twitter: contact.socialLinks?.twitter || '',
          linkedin: contact.socialLinks?.linkedin || '',
          instagram: contact.socialLinks?.instagram || '',
          facebook: contact.socialLinks?.facebook || ''
        }
      });
    } else {
      // Reset form for new contact
      setFormData({
        name: '',
        nickname: '',
        email: '',
        phone: '',
        company: '',
        jobTitle: '',
        website: '',
        location: '',
        notes: '',
        category: 'friends',
        tags: [],
        avatar: null,
        socialLinks: {
          twitter: '',
          linkedin: '',
          instagram: '',
          facebook: ''
        }
      });
    }
    setErrors({});
  }, [contact, isOpen]);

  // Handle input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  }, [errors]);

  // Handle social links changes
  const handleSocialLinkChange = useCallback((platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  }, []);

  // Add tag
  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
      mobileUtils?.haptic?.('light');
    }
  }, [newTag, formData.tags]);

  // Remove tag
  const handleRemoveTag = useCallback((tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
    mobileUtils?.haptic?.('light');
  }, []);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Invalid phone number';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      mobileUtils?.haptic?.('error');
      return;
    }

    setSaving(true);
    
    try {
      // Clean up social links (remove empty ones)
      const cleanSocialLinks = Object.fromEntries(
        Object.entries(formData.socialLinks).filter(([_, value]) => value.trim())
      );

      const contactData = {
        ...formData,
        socialLinks: cleanSocialLinks,
        updatedAt: new Date().toISOString()
      };

      if (!contact) {
        contactData.createdAt = new Date().toISOString();
        contactData.id = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      await onSave(contactData);
      mobileUtils?.haptic?.('success');
    } catch (error) {
      console.error('Failed to save contact:', error);
      mobileUtils?.haptic?.('error');
    } finally {
      setSaving(false);
    }
  }, [formData, contact, onSave]);

  // Handle avatar upload
  const handleAvatarUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          avatar: event.target.result
        }));
      };
      reader.readAsDataURL(file);
      mobileUtils?.haptic?.('light');
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className={`contact-modal-overlay ${darkMode ? 'dark' : ''}`}>
      <div className="contact-modal">
        {/* Header */}
        <div className="modal-header">
          <h2>
            {contact ? 'Edit Contact' : 'Add New Contact'}
          </h2>
          <button 
            className="close-btn"
            onClick={onClose}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-content">
            {/* Avatar Section */}
            <div className="avatar-section">
              <div className="avatar-container">
                <div className="contact-avatar-preview">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" />
                  ) : (
                    <span className="avatar-placeholder">
                      {formData.name.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <label className="avatar-upload-btn">
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            {/* Basic Information */}
            <div className="form-section">
              <h3>Basic Information</h3>
              
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="John Doe"
                  className={errors.name ? 'error' : ''}
                  required
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label>Nickname</label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  placeholder="Johnny"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="john@example.com"
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className={errors.phone ? 'error' : ''}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div className="form-section">
              <h3>Work Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>

                <div className="form-group">
                  <label>Job Title</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    placeholder="Software Engineer"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://example.com"
                  className={errors.website ? 'error' : ''}
                />
                {errors.website && <span className="error-text">{errors.website}</span>}
              </div>
            </div>

            {/* Location & Category */}
            <div className="form-section">
              <h3>Additional Details</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="San Francisco, CA"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  >
                    <option value="friends">👫 Friends</option>
                    <option value="family">👨‍👩‍👧‍👦 Family</option>
                    <option value="work">💼 Work</option>
                    <option value="business">🤝 Business</option>
                    <option value="other">📋 Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="form-section">
              <h3>Social Media</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>🐦 Twitter</label>
                  <input
                    type="text"
                    value={formData.socialLinks.twitter}
                    onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                    placeholder="@username"
                  />
                </div>

                <div className="form-group">
                  <label>💼 LinkedIn</label>
                  <input
                    type="text"
                    value={formData.socialLinks.linkedin}
                    onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                    placeholder="linkedin.com/in/username"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>📷 Instagram</label>
                  <input
                    type="text"
                    value={formData.socialLinks.instagram}
                    onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                    placeholder="@username"
                  />
                </div>

                <div className="form-group">
                  <label>👤 Facebook</label>
                  <input
                    type="text"
                    value={formData.socialLinks.facebook}
                    onChange={(e) => handleSocialLinkChange('facebook', e.target.value)}
                    placeholder="facebook.com/username"
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="form-section">
              <h3>Tags</h3>
              
              <div className="tags-input">
                <div className="current-tags">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                      <button
                        type="button"
                        className="remove-tag"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                
                <div className="add-tag-section">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="add-tag-btn"
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="form-section">
              <h3>Notes</h3>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes about this contact..."
                rows="3"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-btn"
              disabled={saving || !formData.name.trim()}
            >
              {saving ? (
                <>
                  <div className="loading-spinner small"></div>
                  Saving...
                </>
              ) : (
                <>
                  {contact ? '💾 Update Contact' : '➕ Add Contact'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;