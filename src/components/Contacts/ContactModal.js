import React, { useState, useEffect, useCallback } from 'react';
import { mobileUtils } from '../../services/mobileInteractionService';
import { contactService } from '../../services/contactService';
import InternationalDialer from '../Voice/InternationalDialer';
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
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [potentialDuplicates, setPotentialDuplicates] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showInternationalDialer, setShowInternationalDialer] = useState(false);

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

  // Enhanced validation with duplicate checking
  const validateForm = useCallback(async () => {
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
        const cleanPhone = phone.value.replace(/[\s\-()\\+]/g, '');
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
          default:
            // Other platforms are allowed without specific validation
            break;
        }
        if (!isValid) {
          newErrors[`social_${platform}`] = `Invalid ${platform} format`;
        }
      }
    });

    // Check for duplicates
    try {
      const duplicates = await contactService.findDuplicates(formData, contact?.id);
      if (duplicates.length > 0) {
        setDuplicateWarning({
          message: `Similar contact found: ${duplicates[0].name}`,
          duplicates: duplicates
        });
      } else {
        setDuplicateWarning(null);
      }

      // Check for potential duplicates with similarity scoring
      const potentials = await contactService.getPotentialDuplicates(formData, 0.6);
      setPotentialDuplicates(potentials.filter(p => p.contact.id !== contact?.id));
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, contact?.id]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) {
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
      if (error.message.includes('Duplicate contact found')) {
        setDuplicateWarning({
          message: error.message,
          duplicates: []
        });
      }
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

  // Handle merging with existing contact
  const handleMergeContact = async (existingContact) => {
    try {
      setSaving(true);
      
      // Merge current form data with existing contact
      const mergedData = {
        ...existingContact,
        ...formData,
        // Merge arrays
        emails: [
          ...(existingContact.emails || []),
          ...formData.emails.filter(newEmail => 
            !(existingContact.emails || []).some(existingEmail => 
              existingEmail.value.toLowerCase() === newEmail.value.toLowerCase()
            )
          )
        ],
        phones: [
          ...(existingContact.phones || []),
          ...formData.phones.filter(newPhone => 
            !(existingContact.phones || []).some(existingPhone => 
              contactService.normalizePhone(existingPhone.value) === contactService.normalizePhone(newPhone.value)
            )
          )
        ],
        tags: [...new Set([...(existingContact.tags || []), ...(formData.tags || [])])],
        socialLinks: {
          ...existingContact.socialLinks,
          ...formData.socialLinks
        }
      };

      await onSave(mergedData);
      setShowDuplicateModal(false);
      setDuplicateWarning(null);
      setPotentialDuplicates([]);
      mobileUtils?.haptic?.('success');
    } catch (error) {
      console.error('Failed to merge contacts:', error);
      mobileUtils?.haptic?.('error');
    } finally {
      setSaving(false);
    }
  };

  // Get contact data for international dialer
  const getContactForDialer = () => {
    if (formData.phones.length > 0 && formData.phones[0].value) {
      return {
        name: formData.name || 'Contact',
        phone: formData.phones[0].value
      };
    }
    return null;
  };

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
            {/* Duplicate Warning */}
            {duplicateWarning && (
              <div className="duplicate-warning">
                <div className="warning-header">
                  <span className="warning-icon">⚠️</span>
                  <span className="warning-text">{duplicateWarning.message}</span>
                </div>
                {duplicateWarning.duplicates.length > 0 && (
                  <div className="duplicate-actions">
                    <button
                      type="button"
                      className="view-duplicates-btn"
                      onClick={() => setShowDuplicateModal(true)}
                    >
                      View Similar Contacts
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Potential Duplicates Info */}
            {potentialDuplicates.length > 0 && !duplicateWarning && (
              <div className="potential-duplicates-info">
                <span className="info-icon">💡</span>
                <span>Found {potentialDuplicates.length} potentially similar contact{potentialDuplicates.length > 1 ? 's' : ''}</span>
                <button
                  type="button"
                  className="view-potential-btn"
                  onClick={() => setShowDuplicateModal(true)}
                >
                  Review
                </button>
              </div>
            )}
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
                        {phone.value && phone.value.trim() && (
                          <button
                            type="button"
                            className="call-phone-btn"
                            onClick={() => setShowInternationalDialer(true)}
                            title="Call this number"
                          >
                            📞
                          </button>
                        )}
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

      {/* Duplicate Contacts Modal */}
      {showDuplicateModal && (
        <div className="duplicate-modal-overlay">
          <div className="duplicate-modal">
            <div className="duplicate-modal-header">
              <h3>Similar Contacts Found</h3>
              <button 
                className="close-btn"
                onClick={() => setShowDuplicateModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="duplicate-modal-content">
              {duplicateWarning?.duplicates?.length > 0 && (
                <>
                  <h4>🚫 Exact Duplicates</h4>
                  <div className="duplicate-list">
                    {duplicateWarning.duplicates.map((duplicate, index) => (
                      <div key={index} className="duplicate-item exact">
                        <div className="duplicate-info">
                          <div className="duplicate-avatar">
                            {duplicate.avatar ? (
                              <img src={duplicate.avatar} alt={duplicate.name} />
                            ) : (
                              <span>{duplicate.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="duplicate-details">
                            <div className="duplicate-name">{duplicate.name}</div>
                            <div className="duplicate-contact">
                              {duplicate.emails?.[0]?.value || duplicate.email || 
                               duplicate.phones?.[0]?.value || duplicate.phone}
                            </div>
                          </div>
                        </div>
                        <div className="duplicate-actions">
                          <button
                            className="merge-btn"
                            onClick={() => handleMergeContact(duplicate)}
                          >
                            Merge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {potentialDuplicates.length > 0 && (
                <>
                  <h4>🔍 Potential Duplicates</h4>
                  <div className="duplicate-list">
                    {potentialDuplicates.map((potential, index) => (
                      <div key={index} className="duplicate-item potential">
                        <div className="duplicate-info">
                          <div className="duplicate-avatar">
                            {potential.contact.avatar ? (
                              <img src={potential.contact.avatar} alt={potential.contact.name} />
                            ) : (
                              <span>{potential.contact.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="duplicate-details">
                            <div className="duplicate-name">{potential.contact.name}</div>
                            <div className="duplicate-contact">
                              {potential.contact.emails?.[0]?.value || potential.contact.email || 
                               potential.contact.phones?.[0]?.value || potential.contact.phone}
                            </div>
                            <div className="similarity-score">
                              {Math.round(potential.score * 100)}% similar
                            </div>
                            <div className="similarity-reasons">
                              {potential.reasons.join(', ')}
                            </div>
                          </div>
                        </div>
                        <div className="duplicate-actions">
                          <button
                            className="merge-btn"
                            onClick={() => handleMergeContact(potential.contact)}
                          >
                            Merge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div className="duplicate-modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowDuplicateModal(false)}
              >
                Keep Separate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* International Dialer */}
      <InternationalDialer
        isOpen={showInternationalDialer}
        onClose={() => setShowInternationalDialer(false)}
        contact={getContactForDialer()}
        darkMode={darkMode}
      />
    </div>
  );
};

export default ContactModal;