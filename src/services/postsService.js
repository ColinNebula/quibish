import apiClient from './apiClient';

class PostsService {
  constructor() {
    this.baseURL = '/api/posts';
  }

  // ============= POST OPERATIONS =============

  /**
   * Create a new post
   */
  async createPost(postData) {
    try {
      const response = await apiClient.post(this.baseURL, postData);
      return response.data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get news feed with pagination
   */
  async getFeed(params = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        userId = null, 
        visibility = 'public',
        sortBy = 'recent' 
      } = params;

      const response = await apiClient.get(`${this.baseURL}/feed`, {
        params: { page, limit, userId, visibility, sortBy }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching feed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get posts by user
   */
  async getUserPosts(userId, params = {}) {
    try {
      const { page = 1, limit = 10 } = params;
      const response = await apiClient.get(`${this.baseURL}/user/${userId}`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user posts:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get single post by ID
   */
  async getPost(postId, userId = null) {
    try {
      const response = await apiClient.get(`${this.baseURL}/${postId}`, {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching post:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update a post
   */
  async updatePost(postId, updateData) {
    try {
      const response = await apiClient.put(`${this.baseURL}/${postId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating post:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a post
   */
  async deletePost(postId, userId) {
    try {
      const response = await apiClient.delete(`${this.baseURL}/${postId}`, {
        data: { userId }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Pin/Unpin a post
   */
  async togglePin(postId, userId, isPinned) {
    try {
      const response = await apiClient.patch(`${this.baseURL}/${postId}/pin`, {
        userId,
        isPinned
      });
      return response.data;
    } catch (error) {
      console.error('Error toggling pin:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Share a post
   */
  async sharePost(postId, userId, content = '') {
    try {
      const response = await apiClient.post(this.baseURL, {
        userId,
        content,
        type: 'shared',
        sharedPostId: postId,
        visibility: 'public'
      });
      return response.data;
    } catch (error) {
      console.error('Error sharing post:', error);
      throw this.handleError(error);
    }
  }

  // ============= LIKE OPERATIONS =============

  /**
   * Like/Unlike a post or comment
   */
  async toggleLike(targetType, targetId, userId, reactionType = 'like') {
    try {
      const response = await apiClient.post(
        `${this.baseURL}/${targetType}/${targetId}/like`,
        { userId, reactionType }
      );
      return response.data;
    } catch (error) {
      console.error('Error toggling like:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get likes for a post or comment
   */
  async getLikes(targetType, targetId, params = {}) {
    try {
      const { page = 1, limit = 20 } = params;
      const response = await apiClient.get(
        `${this.baseURL}/${targetType}/${targetId}/likes`,
        { params: { page, limit } }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching likes:', error);
      throw this.handleError(error);
    }
  }

  // ============= COMMENT OPERATIONS =============

  /**
   * Add comment to post
   */
  async addComment(postId, commentData) {
    try {
      const response = await apiClient.post(
        `${this.baseURL}/${postId}/comments`,
        commentData
      );
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get comments for a post
   */
  async getComments(postId, params = {}) {
    try {
      const { page = 1, limit = 20, userId = null } = params;
      const response = await apiClient.get(
        `${this.baseURL}/${postId}/comments`,
        { params: { page, limit, userId } }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get replies for a comment
   */
  async getReplies(commentId, params = {}) {
    try {
      const { page = 1, limit = 10, userId = null } = params;
      const response = await apiClient.get(
        `${this.baseURL}/comments/${commentId}/replies`,
        { params: { page, limit, userId } }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching replies:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update a comment
   */
  async updateComment(commentId, updateData) {
    try {
      const response = await apiClient.put(
        `${this.baseURL}/comments/${commentId}`,
        updateData
      );
      return response.data;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId, userId) {
    try {
      const response = await apiClient.delete(
        `${this.baseURL}/comments/${commentId}`,
        { data: { userId } }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw this.handleError(error);
    }
  }

  // ============= SEARCH OPERATIONS =============

  /**
   * Search posts
   */
  async searchPosts(query, params = {}) {
    try {
      const { page = 1, limit = 10, userId = null } = params;
      const response = await apiClient.get(`${this.baseURL}/search`, {
        params: { q: query, page, limit, userId }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching posts:', error);
      throw this.handleError(error);
    }
  }

  // ============= UTILITY METHODS =============

  /**
   * Handle API errors
   */
  handleError(error) {
    if (error.response) {
      return {
        message: error.response.data.error || 'An error occurred',
        status: error.response.status,
        details: error.response.data.details
      };
    } else if (error.request) {
      return {
        message: 'No response from server',
        status: 0
      };
    } else {
      return {
        message: error.message || 'An unexpected error occurred',
        status: -1
      };
    }
  }

  /**
   * Format post data for display
   */
  formatPostData(post) {
    return {
      ...post,
      createdAt: new Date(post.createdAt),
      updatedAt: new Date(post.updatedAt),
      timeAgo: this.getTimeAgo(post.createdAt)
    };
  }

  /**
   * Get time ago string
   */
  getTimeAgo(date) {
    const now = new Date();
    const posted = new Date(date);
    const seconds = Math.floor((now - posted) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
    return posted.toLocaleDateString();
  }

  /**
   * Extract hashtags from text
   */
  extractHashtags(text) {
    const hashtagRegex = /#[\w]+/g;
    return text.match(hashtagRegex) || [];
  }

  /**
   * Extract mentions from text
   */
  extractMentions(text) {
    const mentionRegex = /@[\w]+/g;
    return text.match(mentionRegex) || [];
  }
}

// Export singleton instance
const postsService = new PostsService();
export default postsService;
