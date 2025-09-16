// Feedback Service - Complete Implementation
class FeedbackService {
  constructor() {
    this.feedbackHistory = [];
    this.feedbackCategories = [
      'bug_report',
      'feature_request',
      'improvement',
      'ui_ux',
      'performance',
      'general'
    ];
    this.apiEndpoint = '/api/feedback';
  }

  // Submit feedback
  async submitFeedback(feedbackData) {
    try {
      const feedback = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...feedbackData,
        status: 'submitted'
      };

      // Validate feedback
      const validation = this.validateFeedback(feedback);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Try to submit to API
      try {
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(feedback)
        });

        if (response.ok) {
          const result = await response.json();
          this.feedbackHistory.push(feedback);
          
          return {
            success: true,
            feedbackId: result.id || feedback.id,
            message: 'Feedback submitted successfully'
          };
        }
      } catch (apiError) {
        console.warn('API submission failed, storing locally:', apiError);
      }

      // Fallback to local storage
      this.feedbackHistory.push(feedback);
      this.saveFeedbackToStorage();

      return {
        success: true,
        feedbackId: feedback.id,
        message: 'Feedback saved locally',
        offline: true
      };
    } catch (error) {
      console.error('Feedback submission failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get feedback history
  getFeedback(options = {}) {
    const { category, status, limit = 50 } = options;
    
    let feedback = [...this.feedbackHistory];

    // Filter by category
    if (category) {
      feedback = feedback.filter(f => f.category === category);
    }

    // Filter by status
    if (status) {
      feedback = feedback.filter(f => f.status === status);
    }

    // Sort by timestamp (newest first)
    feedback.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    return feedback.slice(0, limit);
  }

  // Validate feedback data
  validateFeedback(feedback) {
    const errors = [];

    if (!feedback.title || feedback.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    }

    if (!feedback.description || feedback.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }

    if (!feedback.category || !this.feedbackCategories.includes(feedback.category)) {
      errors.push('Invalid category selected');
    }

    if (feedback.title && feedback.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }

    if (feedback.description && feedback.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Save feedback to local storage
  saveFeedbackToStorage() {
    try {
      localStorage.setItem('quibish_feedback', JSON.stringify(this.feedbackHistory));
    } catch (error) {
      console.error('Failed to save feedback to storage:', error);
    }
  }

  // Load feedback from local storage
  loadFeedbackFromStorage() {
    try {
      const stored = localStorage.getItem('quibish_feedback');
      if (stored) {
        this.feedbackHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load feedback from storage:', error);
      this.feedbackHistory = [];
    }
  }

  // Get feedback categories
  getCategories() {
    return this.feedbackCategories.map(category => ({
      id: category,
      name: this.formatCategoryName(category),
      description: this.getCategoryDescription(category)
    }));
  }

  // Format category name for display
  formatCategoryName(category) {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Get category description
  getCategoryDescription(category) {
    const descriptions = {
      bug_report: 'Report bugs, errors, or unexpected behavior',
      feature_request: 'Suggest new features or functionality',
      improvement: 'Suggest improvements to existing features',
      ui_ux: 'Feedback about user interface and user experience',
      performance: 'Report performance issues or slow loading',
      general: 'General feedback and suggestions'
    };

    return descriptions[category] || 'General feedback';
  }

  // Update feedback status
  async updateFeedbackStatus(feedbackId, status) {
    try {
      const feedback = this.feedbackHistory.find(f => f.id === feedbackId);
      
      if (!feedback) {
        return { success: false, error: 'Feedback not found' };
      }

      feedback.status = status;
      feedback.lastUpdated = new Date().toISOString();

      // Try to update on server
      try {
        const response = await fetch(`${this.apiEndpoint}/${feedbackId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        });

        if (response.ok) {
          this.saveFeedbackToStorage();
          return { success: true };
        }
      } catch (apiError) {
        console.warn('Failed to update feedback on server:', apiError);
      }

      // Update locally
      this.saveFeedbackToStorage();
      return { success: true, offline: true };
    } catch (error) {
      console.error('Failed to update feedback status:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete feedback
  deleteFeedback(feedbackId) {
    try {
      const index = this.feedbackHistory.findIndex(f => f.id === feedbackId);
      
      if (index === -1) {
        return { success: false, error: 'Feedback not found' };
      }

      this.feedbackHistory.splice(index, 1);
      this.saveFeedbackToStorage();

      return { success: true };
    } catch (error) {
      console.error('Failed to delete feedback:', error);
      return { success: false, error: error.message };
    }
  }

  // Get feedback statistics
  getStatistics() {
    const total = this.feedbackHistory.length;
    const byCategory = {};
    const byStatus = {};

    this.feedbackCategories.forEach(category => {
      byCategory[category] = 0;
    });

    this.feedbackHistory.forEach(feedback => {
      // Count by category
      if (byCategory.hasOwnProperty(feedback.category)) {
        byCategory[feedback.category]++;
      }

      // Count by status
      if (byStatus[feedback.status]) {
        byStatus[feedback.status]++;
      } else {
        byStatus[feedback.status] = 1;
      }
    });

    return {
      total,
      byCategory,
      byStatus,
      averagePerDay: this.calculateAveragePerDay()
    };
  }

  // Calculate average feedback per day
  calculateAveragePerDay() {
    if (this.feedbackHistory.length === 0) return 0;

    const dates = this.feedbackHistory.map(f => new Date(f.timestamp).toDateString());
    const uniqueDates = [...new Set(dates)];
    
    return this.feedbackHistory.length / uniqueDates.length;
  }

  // Initialize the service
  initialize() {
    this.loadFeedbackFromStorage();
    return {
      success: true,
      feedbackCount: this.feedbackHistory.length,
      categories: this.getCategories()
    };
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;