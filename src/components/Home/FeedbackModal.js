import React, { useState, useEffect } from 'react';
import './FeedbackModal.css';

const FeedbackModal = ({ isOpen, onClose, onSubmit }) => {
  const [feedbackType, setFeedbackType] = useState('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFeedbackType('general');
      setTitle('');
      setDescription('');
      setEmail('');
      setRating(0);
      setCategory('');
      setPriority('medium');
      setAttachments([]);
      setIsSubmitting(false);
      setShowSuccess(false);
      setErrors({});
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const feedbackTypes = [
    { value: 'bug', label: 'Bug Report', icon: '🐛', color: '#ff4757' },
    { value: 'feature', label: 'Feature Request', icon: '💡', color: '#3742fa' },
    { value: 'improvement', label: 'Improvement', icon: '⚡', color: '#2ed573' },
    { value: 'general', label: 'General Feedback', icon: '💬', color: '#5352ed' },
    { value: 'question', label: 'Question', icon: '❓', color: '#ff6b35' },
    { value: 'compliment', label: 'Compliment', icon: '🎉', color: '#26de81' }
  ];

  const categories = {
    bug: ['UI/UX', 'Performance', 'Authentication', 'Messaging', 'Profile', 'Mobile', 'Other'],
    feature: ['Chat Features', 'Profile Features', 'Mobile App', 'Integrations', 'Settings', 'Other'],
    improvement: ['Speed', 'Design', 'Usability', 'Accessibility', 'Mobile Experience', 'Other'],
    general: ['Overall Experience', 'Design', 'Performance', 'Features', 'Support', 'Other'],
    question: ['How to Use', 'Account', 'Features', 'Technical', 'Billing', 'Other'],
    compliment: ['Design', 'Features', 'Performance', 'Support', 'Overall', 'Other']
  };

  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (email && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (feedbackType === 'bug' && !category) {
      newErrors.category = 'Please select a category for bug reports';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData = {
        type: feedbackType,
        title: title.trim(),
        description: description.trim(),
        email: email.trim(),
        rating,
        category,
        priority,
        attachments,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (onSubmit) {
        await onSubmit(feedbackData);
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setErrors({ submit: 'Failed to submit feedback. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      return validTypes.includes(file.type) && file.size <= maxSize;
    });

    setAttachments(prev => [...prev, ...validFiles].slice(0, 3)); // Max 3 files
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleRatingClick = (value) => {
    setRating(value);
  };

  const selectedType = feedbackTypes.find(type => type.value === feedbackType);

  if (!isOpen) return null;

  return (
    <div className="feedback-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="feedback-modal">
        {showSuccess ? (
          <div className="feedback-success">
            <div className="success-icon">✅</div>
            <h3>Thank you for your feedback!</h3>
            <p>We appreciate your input and will review it soon.</p>
          </div>
        ) : (
          <>
            <div className="feedback-modal-header">
              <h2>Share Your Feedback</h2>
              <button className="feedback-close-btn" onClick={onClose}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="feedback-form">
              {/* Feedback Type Selection */}
              <div className="feedback-section">
                <label className="feedback-label">What type of feedback do you have?</label>
                <div className="feedback-types">
                  {feedbackTypes.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      className={`feedback-type-btn ${feedbackType === type.value ? 'active' : ''}`}
                      onClick={() => {
                        setFeedbackType(type.value);
                        setCategory('');
                      }}
                      style={{ '--type-color': type.color }}
                    >
                      <span className="feedback-type-icon">{type.icon}</span>
                      <span className="feedback-type-label">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="feedback-section">
                <label className="feedback-label">
                  Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Brief ${selectedType?.label.toLowerCase()} title...`}
                  className={`feedback-input ${errors.title ? 'error' : ''}`}
                  maxLength={100}
                />
                {errors.title && <span className="feedback-error">{errors.title}</span>}
              </div>

              {/* Category (for certain types) */}
              {categories[feedbackType] && (
                <div className="feedback-section">
                  <label className="feedback-label">
                    Category {feedbackType === 'bug' && <span className="required">*</span>}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`feedback-select ${errors.category ? 'error' : ''}`}
                  >
                    <option value="">Select a category...</option>
                    {categories[feedbackType].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.category && <span className="feedback-error">{errors.category}</span>}
                </div>
              )}

              {/* Priority (for bugs and feature requests) */}
              {(feedbackType === 'bug' || feedbackType === 'feature') && (
                <div className="feedback-section">
                  <label className="feedback-label">Priority</label>
                  <div className="priority-buttons">
                    {['low', 'medium', 'high', 'critical'].map(level => (
                      <button
                        key={level}
                        type="button"
                        className={`priority-btn ${priority === level ? 'active' : ''} priority-${level}`}
                        onClick={() => setPriority(level)}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating (for general feedback and compliments) */}
              {(feedbackType === 'general' || feedbackType === 'compliment') && (
                <div className="feedback-section">
                  <label className="feedback-label">How would you rate your experience?</label>
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${star <= rating ? 'active' : ''}`}
                        onClick={() => handleRatingClick(star)}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="feedback-section">
                <label className="feedback-label">
                  Description <span className="required">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Please provide detailed ${selectedType?.label.toLowerCase()}...`}
                  className={`feedback-textarea ${errors.description ? 'error' : ''}`}
                  rows={5}
                  maxLength={2000}
                />
                <div className="char-count">{description.length}/2000</div>
                {errors.description && <span className="feedback-error">{errors.description}</span>}
              </div>

              {/* Email (optional) */}
              <div className="feedback-section">
                <label className="feedback-label">Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className={`feedback-input ${errors.email ? 'error' : ''}`}
                />
                <div className="feedback-hint">We'll only use this to follow up on your feedback</div>
                {errors.email && <span className="feedback-error">{errors.email}</span>}
              </div>

              {/* File Attachments */}
              <div className="feedback-section">
                <label className="feedback-label">Attachments (optional)</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="feedback-files"
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.txt,.pdf"
                    onChange={handleFileUpload}
                    className="file-input-hidden"
                  />
                  <label htmlFor="feedback-files" className="file-upload-btn">
                    📎 Add Files
                  </label>
                  <div className="file-upload-hint">
                    Images, PDFs, or text files (max 5MB each, 3 files total)
                  </div>
                </div>
                {attachments.length > 0 && (
                  <div className="attachment-list">
                    {attachments.map((file, index) => (
                      <div key={index} className="attachment-item">
                        <span className="attachment-name">{file.name}</span>
                        <button
                          type="button"
                          className="remove-attachment"
                          onClick={() => removeAttachment(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="feedback-error submit-error">{errors.submit}</div>
              )}

              {/* Form Actions */}
              <div className="feedback-actions">
                <button
                  type="button"
                  className="feedback-btn secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="feedback-btn primary"
                  disabled={isSubmitting}
                  style={{ '--type-color': selectedType?.color }}
                >
                  {isSubmitting ? (
                    <span className="submitting">
                      <div className="spinner"></div>
                      Submitting...
                    </span>
                  ) : (
                    `Submit ${selectedType?.label}`
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;