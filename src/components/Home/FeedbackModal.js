import React, { useState } from 'react';
import './FeedbackModal.css';
import { feedbackService } from '../../services/feedbackService';

const FeedbackModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    email: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState([]);

  const categories = feedbackService.getCategories();

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    try {
      const result = await feedbackService.submitFeedback(formData);
      
      if (result.success) {
        setSubmitted(true);
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: 'general',
          priority: 'medium',
          email: ''
        });
        
        // Auto-close after showing success
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setErrors(result.errors || ['Failed to submit feedback']);
      }
    } catch (error) {
      setErrors(['An unexpected error occurred. Please try again.']);
    }
    
    setSubmitting(false);
  };

  // Handle modal close
  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      email: ''
    });
    setErrors([]);
    setSubmitted(false);
    onClose();
  };

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="feedback-overlay" onClick={handleOverlayClick}>
      <div className="feedback-modal">
        <div className="feedback-header">
          <h3>Send Feedback</h3>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        {submitted ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h4>Thank you for your feedback!</h4>
            <p>We appreciate your input and will review it carefully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            {errors.length > 0 && (
              <div className="error-messages">
                {errors.map((error, index) => (
                  <div key={index} className="error-message">
                    {error}
                  </div>
                ))}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="title">Subject *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Brief description of your feedback..."
                required
                maxLength={200}
              />
              <span className="char-count">{formData.title.length}/200</span>
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Please provide detailed feedback..."
                required
                rows={5}
                maxLength={2000}
              />
              <span className="char-count">{formData.description.length}/2000</span>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email (optional)</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
              />
              <small>We'll only use this to follow up on your feedback if needed.</small>
            </div>

            <div className="form-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting || !formData.title.trim() || !formData.description.trim()}
              >
                {submitting ? (
                  <>
                    <span className="loading-spinner"></span>
                    Sending...
                  </>
                ) : (
                  'Send Feedback'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;