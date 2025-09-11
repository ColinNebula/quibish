import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { mobileUtils } from '../../services/mobileInteractionService';
import './ContactModal.css';

const ContactModal = ({ isOpen, contact, onClose, onSave, darkMode = false, allContacts = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    emails: [{ type: 'personal', value: '' }],
    phones: [{ type: 'mobile', value: '' }],
    company: '',
    jobTitle: '',
    website: '',
    location: '',
    notes: '',
    category: 'friends',
    tags: [],
    avatar: null,
    birthdate: '',
    relationship: '',
    linkedContacts: [],
    importance: 'normal',
    socialLinks: {
      twitter: '',
      linkedin: '',
      instagram: '',
      facebook: '',
      github: '',
      discord: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  // Initialize form data when contact changes
  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        nickname: contact.nickname || '',
        emails: contact.emails || (contact.email ? [{ type: 'personal', value: contact.email }] : [{ type: 'personal', value: '' }]),
        phones: contact.phones || (contact.phone ? [{ type: 'mobile', value: contact.phone }] : [{ type: 'mobile', value: '' }]),
        company: contact.company || '',
        jobTitle: contact.jobTitle || '',
        website: contact.website || '',
        location: contact.location || '',
        notes: contact.notes || '',
        category: contact.category || 'friends',
        tags: contact.tags || [],
        avatar: contact.avatar || null,
        birthdate: contact.birthdate || '',
        relationship: contact.relationship || '',
        linkedContacts: contact.linkedContacts || [],
        importance: contact.importance || 'normal',
        socialLinks: {
          twitter: contact.socialLinks?.twitter || '',
          linkedin: contact.socialLinks?.linkedin || '',
          instagram: contact.socialLinks?.instagram || '',
          facebook: contact.socialLinks?.facebook || '',
          github: contact.socialLinks?.github || '',
          discord: contact.socialLinks?.discord || ''
        }
      });
    } else {
      // Reset form for new contact
      setFormData({
        name: '',
        nickname: '',
        emails: [{ type: 'personal', value: '' }],
        phones: [{ type: 'mobile', value: '' }],
        company: '',
        jobTitle: '',
        website: '',
        location: '',
        notes: '',
        category: 'friends',
        tags: [],
        avatar: null,
        birthdate: '',
        relationship: '',
        linkedContacts: [],
        importance: 'normal',
        socialLinks: {
          twitter: '',
          linkedin: '',
          instagram: '',
          facebook: '',
          github: '',
          discord: ''
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

  // Handle phone number changes
  const handlePhoneChange = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      phones: prev.phones.map((phone, i) => 
        i === index ? { ...phone, [field]: value } : phone
      )
    }));
  }, []);

  // Add new phone number
  const handleAddPhone = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      phones: [...prev.phones, { type: 'mobile', value: '' }]
    }));
    mobileUtils?.haptic?.('light');
  }, []);

  // Remove phone number
  const handleRemovePhone = useCallback((index) => {
    if (formData.phones.length > 1) {
      setFormData(prev => ({
        ...prev,
        phones: prev.phones.filter((_, i) => i !== index)
      }));
      mobileUtils?.haptic?.('light');
    }
  }, [formData.phones.length]);

  // Handle email changes
  const handleEmailChange = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map((email, i) => 
        i === index ? { ...email, [field]: value } : email
      )
    }));
  }, []);

  // Add new email
  const handleAddEmail = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, { type: 'personal', value: '' }]
    }));
    mobileUtils?.haptic?.('light');
  }, []);

  // Remove email
  const handleRemoveEmail = useCallback((index) => {
    if (formData.emails.length > 1) {
      setFormData(prev => ({
        ...prev,
        emails: prev.emails.filter((_, i) => i !== index)
      }));
      mobileUtils?.haptic?.('light');
    }
  }, [formData.emails.length]);

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

  // Handle linked contact changes
  const handleLinkedContactChange = useCallback((contactId) => {
    setFormData(prev => {
      const isLinked = prev.linkedContacts.includes(contactId);
      return {
        ...prev,
        linkedContacts: isLinked 
          ? prev.linkedContacts.filter(id => id !== contactId)
          : [...prev.linkedContacts, contactId]
      };
    });
    mobileUtils?.haptic?.('light');
  }, []);

  // Enhanced validation
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    formData.emails.forEach((email, index) => {
      if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        newErrors[`email_${index}`] = 'Invalid email format';
      }
    });

    // Phone validation
    formData.phones.forEach((phone, index) => {
      if (phone.value) {
        const cleanPhone = phone.value.replace(/[\s\-\(\)\+]/g, '');
        if (!/^[0-9]{7,15}$/.test(cleanPhone)) {
          newErrors[`phone_${index}`] = 'Invalid phone number (7-15 digits)';
        }
      }
    });

    // Website validation
    if (formData.website && !/^https?:\/\/.+\..+/.test(formData.website)) {
      newErrors.website = 'Website must be a valid URL (http:// or https://)';
    }

    // Birthdate validation
    if (formData.birthdate) {
      const date = new Date(formData.birthdate);
      const today = new Date();
      const minDate = new Date('1900-01-01');
      
      if (date > today) {
        newErrors.birthdate = 'Birthdate cannot be in the future';
      } else if (date < minDate) {
        newErrors.birthdate = 'Please enter a valid birthdate';
      }
    }

    // Social links validation
    Object.entries(formData.socialLinks).forEach(([platform, value]) => {
      if (value) {
        let isValid = true;
        switch (platform) {
          case 'twitter':
            isValid = /^@?[A-Za-z0-9_]{1,15}$/.test(value);
            break;
          case 'linkedin':
            isValid = /^(linkedin\.com\/in\/[A-Za-z0-9_-]+|[A-Za-z0-9_-]+)$/.test(value);
            break;
          case 'instagram':
            isValid = /^@?[A-Za-z0-9_.]{1,30}$/.test(value);
            break;
          case 'github':
            isValid = /^[A-Za-z0-9_-]{1,39}$/.test(value);
            break;
          case 'discord':
            isValid = /^.{2,32}#[0-9]{4}$/.test(value);
            break;
        }
        if (!isValid) {
          newErrors[`social_${platform}`] = `Invalid ${platform} format`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

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

      // Clean up emails and phones (remove empty ones)
      const cleanEmails = formData.emails.filter(email => email.value.trim());
      const cleanPhones = formData.phones.filter(phone => phone.value.trim());

      const contactData = {
        ...formData,
        emails: cleanEmails,
        phones: cleanPhones,
        socialLinks: cleanSocialLinks,
        // Keep legacy fields for backward compatibility
        email: cleanEmails[0]?.value || '',
        phone: cleanPhones[0]?.value || '',
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
  }, [formData, contact, onSave, validateForm]);

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
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              📝 Basic Info
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
              onClick={() => setActiveTab('contact')}
            >
              📞 Contact Details
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'social' ? 'active' : ''}`}
              onClick={() => setActiveTab('social')}
            >
              🌐 Social & More
            </button>
          </div>

          <div className="form-content">
            {activeTab === 'basic' && (
              <>
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

                  <div className="form-row">
                    <div className="form-group">
                      <label>Nickname</label>
                      <input
                        type="text"
                        value={formData.nickname}
                        onChange={(e) => handleInputChange('nickname', e.target.value)}
                        placeholder="Johnny"
                      />
                    </div>

                    <div className="form-group">
                      <label>Importance</label>
                      <select
                        value={formData.importance}
                        onChange={(e) => handleInputChange('importance', e.target.value)}
                      >
                        <option value="low">🔹 Low</option>
                        <option value="normal">⚪ Normal</option>
                        <option value="high">🔸 High</option>
                        <option value="critical">🔴 Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Birthdate</label>
                      <input
                        type="date"
                        value={formData.birthdate}
                        onChange={(e) => handleInputChange('birthdate', e.target.value)}
                        className={errors.birthdate ? 'error' : ''}
                      />
                      {errors.birthdate && <span className="error-text">{errors.birthdate}</span>}
                    </div>

                    <div className="form-group">
                      <label>Relationship</label>
                      <select
                        value={formData.relationship}
                        onChange={(e) => handleInputChange('relationship', e.target.value)}
                      >
                        <option value="">Select relationship...</option>
                        <option value="spouse">💑 Spouse</option>
                        <option value="partner">💕 Partner</option>
                        <option value="parent">👨‍👩‍👧‍👦 Parent</option>
                        <option value="child">👶 Child</option>
                        <option value="sibling">👫 Sibling</option>
                        <option value="friend">👬 Friend</option>
                        <option value="colleague">💼 Colleague</option>
                        <option value="boss">👔 Boss</option>
                        <option value="employee">👷 Employee</option>
                        <option value="client">🤝 Client</option>
                        <option value="other">📋 Other</option>
                      </select>
                    </div>
                  </div>

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
              </>
            )}

            {activeTab === 'contact' && (
              <>
                {/* Email Addresses */}
                <div className="form-section">
                  <div className="section-header">
                    <h3>📧 Email Addresses</h3>
                    <button
                      type="button"
                      className="add-field-btn"
                      onClick={handleAddEmail}
                      disabled={formData.emails.length >= 5}
                    >
                      ➕ Add Email
                    </button>
                  </div>
                  
                  {formData.emails.map((email, index) => (
                    <div key={index} className="field-group">
                      <div className="field-row">
                        <select
                          value={email.type}
                          onChange={(e) => handleEmailChange(index, 'type', e.target.value)}
                          className="field-type-select"
                        >
                          <option value="personal">Personal</option>
                          <option value="work">Work</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="email"
                          value={email.value}
                          onChange={(e) => handleEmailChange(index, 'value', e.target.value)}
                          placeholder="john@example.com"
                          className={errors[`email_${index}`] ? 'error' : ''}
                        />
                        {formData.emails.length > 1 && (
                          <button
                            type="button"
                            className="remove-field-btn"
                            onClick={() => handleRemoveEmail(index)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {errors[`email_${index}`] && <span className="error-text">{errors[`email_${index}`]}</span>}
                    </div>
                  ))}
                </div>

                {/* Phone Numbers */}
                <div className="form-section">
                  <div className="section-header">
                    <h3>📱 Phone Numbers</h3>
                    <button
                      type="button"
                      className="add-field-btn"
                      onClick={handleAddPhone}
                      disabled={formData.phones.length >= 5}
                    >
                      ➕ Add Phone
                    </button>
                  </div>
                  
                  {formData.phones.map((phone, index) => (
                    <div key={index} className="field-group">
                      <div className="field-row">
                        <select
                          value={phone.type}
                          onChange={(e) => handlePhoneChange(index, 'type', e.target.value)}
                          className="field-type-select"
                        >
                          <option value="mobile">📱 Mobile</option>
                          <option value="home">🏠 Home</option>
                          <option value="work">💼 Work</option>
                          <option value="fax">📠 Fax</option>
                          <option value="other">📞 Other</option>
                        </select>
                        <input
                          type="tel"
                          value={phone.value}
                          onChange={(e) => handlePhoneChange(index, 'value', e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className={errors[`phone_${index}`] ? 'error' : ''}
                        />
                        {formData.phones.length > 1 && (
                          <button
                            type="button"
                            className="remove-field-btn"
                            onClick={() => handleRemovePhone(index)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {errors[`phone_${index}`] && <span className="error-text">{errors[`phone_${index}`]}</span>}
                    </div>
                  ))}
                </div>

                {/* Work Information */}
                <div className="form-section">
                  <h3>💼 Work Information</h3>
                  
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
              </>
            )}

            {activeTab === 'social' && (
              <>
                {/* Social Links */}
                <div className="form-section">
                  <h3>🌐 Social Media</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>🐦 Twitter</label>
                      <input
                        type="text"
                        value={formData.socialLinks.twitter}
                        onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                        placeholder="@username"
                        className={errors.social_twitter ? 'error' : ''}
                      />
                      {errors.social_twitter && <span className="error-text">{errors.social_twitter}</span>}
                    </div>

                    <div className="form-group">
                      <label>💼 LinkedIn</label>
                      <input
                        type="text"
                        value={formData.socialLinks.linkedin}
                        onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                        placeholder="linkedin.com/in/username"
                        className={errors.social_linkedin ? 'error' : ''}
                      />
                      {errors.social_linkedin && <span className="error-text">{errors.social_linkedin}</span>}
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
                        className={errors.social_instagram ? 'error' : ''}
                      />
                      {errors.social_instagram && <span className="error-text">{errors.social_instagram}</span>}
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

                  <div className="form-row">
                    <div className="form-group">
                      <label>💻 GitHub</label>
                      <input
                        type="text"
                        value={formData.socialLinks.github}
                        onChange={(e) => handleSocialLinkChange('github', e.target.value)}
                        placeholder="username"
                        className={errors.social_github ? 'error' : ''}
                      />
                      {errors.social_github && <span className="error-text">{errors.social_github}</span>}
                    </div>

                    <div className="form-group">
                      <label>🎮 Discord</label>
                      <input
                        type="text"
                        value={formData.socialLinks.discord}
                        onChange={(e) => handleSocialLinkChange('discord', e.target.value)}
                        placeholder="username#1234"
                        className={errors.social_discord ? 'error' : ''}
                      />
                      {errors.social_discord && <span className="error-text">{errors.social_discord}</span>}
                    </div>
                  </div>
                </div>

                {/* Linked Contacts */}
                {allContacts.length > 0 && (
                  <div className="form-section">
                    <h3>🔗 Linked Contacts</h3>
                    <p className="section-description">
                      Link this contact to related people (family, colleagues, etc.)
                    </p>
                    
                    <div className="linked-contacts-grid">
                      {allContacts
                        .filter(c => c.id !== contact?.id)
                        .slice(0, 8)
                        .map(availableContact => (
                          <label key={availableContact.id} className="linked-contact-item">
                            <input
                              type="checkbox"
                              checked={formData.linkedContacts.includes(availableContact.id)}
                              onChange={() => handleLinkedContactChange(availableContact.id)}
                            />
                            <div className="linked-contact-info">
                              <div className="linked-contact-avatar">
                                {availableContact.avatar ? (
                                  <img src={availableContact.avatar} alt={availableContact.name} />
                                ) : (
                                  <span>{availableContact.name.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <span className="linked-contact-name">{availableContact.name}</span>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="form-section">
                  <h3>🏷️ Tags</h3>
                  
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
                  <h3>📝 Notes</h3>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes about this contact..."
                    rows="4"
                  />
                </div>
              </>
            )}
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