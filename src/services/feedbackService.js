import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

class FeedbackService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/feedback`,
      timeout: 10000,
    });

    // Add request interceptor for authentication
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Feedback API Error:', error);
        
        if (error.response?.status === 401) {
          console.warn('Unauthorized feedback request');
          // Don't redirect for feedback - it can be anonymous
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Submit user feedback
   * @param {Object} feedbackData - The feedback data to submit
   * @returns {Promise<Object>} The submission response
   */
  async submitFeedback(feedbackData) {
    try {
      console.log('📝 Submitting feedback:', {
        type: feedbackData.type,
        title: feedbackData.title,
        hasEmail: !!feedbackData.email,
        rating: feedbackData.rating,
        priority: feedbackData.priority
      });

      const response = await this.api.post('/', feedbackData);
      
      console.log('✅ Feedback submitted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to submit feedback:', error);
      
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to submit feedback');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to feedback service. Please try again later.');
      } else {
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  }

  /**
   * Get feedback statistics (admin only)
   * @returns {Promise<Object>} The feedback statistics
   */
  async getFeedbackStats() {
    try {
      const response = await this.api.get('/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch feedback stats:', error);
      throw new Error('Failed to fetch feedback statistics');
    }
  }

  /**
   * Get feedback list (admin only)
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} The feedback list
   */
  async getFeedbackList(params = {}) {
    try {
      const response = await this.api.get('/', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch feedback list:', error);
      throw new Error('Failed to fetch feedback list');
    }
  }

  /**
   * Validate feedback data before submission
   * @param {Object} feedbackData - The feedback data to validate
   * @returns {Object} Validation result with errors if any
   */
  validateFeedback(feedbackData) {
    const errors = {};

    if (!feedbackData.type) {
      errors.type = 'Feedback type is required';
    }

    if (!feedbackData.title || feedbackData.title.trim().length === 0) {
      errors.title = 'Title is required';
    }

    if (!feedbackData.description || feedbackData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (feedbackData.email && !/\S+@\S+\.\S+/.test(feedbackData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (feedbackData.rating && (feedbackData.rating < 1 || feedbackData.rating > 5)) {
      errors.rating = 'Rating must be between 1 and 5';
    }

    if (feedbackData.type === 'bug' && !feedbackData.category) {
      errors.category = 'Category is required for bug reports';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Format feedback data for submission
   * @param {Object} feedbackData - Raw feedback data
   * @returns {Object} Formatted feedback data
   */
  formatFeedbackData(feedbackData) {
    return {
      type: feedbackData.type,
      title: feedbackData.title?.trim(),
      description: feedbackData.description?.trim(),
      email: feedbackData.email?.trim() || null,
      rating: feedbackData.rating || null,
      category: feedbackData.category || null,
      priority: feedbackData.priority || 'medium',
      attachments: feedbackData.attachments || [],
      timestamp: feedbackData.timestamp || new Date().toISOString(),
      userAgent: feedbackData.userAgent || navigator.userAgent,
      url: feedbackData.url || window.location.href
    };
  }

  /**
   * Get feedback type configuration
   * @returns {Array} Array of feedback type configurations
   */
  getFeedbackTypes() {
    return [
      { value: 'bug', label: 'Bug Report', icon: '🐛', color: '#ff4757' },
      { value: 'feature', label: 'Feature Request', icon: '💡', color: '#3742fa' },
      { value: 'improvement', label: 'Improvement', icon: '⚡', color: '#2ed573' },
      { value: 'general', label: 'General Feedback', icon: '💬', color: '#5352ed' },
      { value: 'question', label: 'Question', icon: '❓', color: '#ff6b35' },
      { value: 'compliment', label: 'Compliment', icon: '🎉', color: '#26de81' }
    ];
  }

  /**
   * Get categories for a specific feedback type
   * @param {string} feedbackType - The feedback type
   * @returns {Array} Array of categories for the type
   */
  getCategoriesForType(feedbackType) {
    const categories = {
      bug: ['UI/UX', 'Performance', 'Authentication', 'Messaging', 'Profile', 'Mobile', 'Other'],
      feature: ['Chat Features', 'Profile Features', 'Mobile App', 'Integrations', 'Settings', 'Other'],
      improvement: ['Speed', 'Design', 'Usability', 'Accessibility', 'Mobile Experience', 'Other'],
      general: ['Overall Experience', 'Design', 'Performance', 'Features', 'Support', 'Other'],
      question: ['How to Use', 'Account', 'Features', 'Technical', 'Billing', 'Other'],
      compliment: ['Design', 'Features', 'Performance', 'Support', 'Overall', 'Other']
    };

    return categories[feedbackType] || [];
  }
}

// Export singleton instance
export const feedbackService = new FeedbackService();
export default feedbackService;