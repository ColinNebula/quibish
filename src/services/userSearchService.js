// User Search Service
import { secureTokenManager } from './secureTokenManager';

class UserSearchService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Search for users by name, username, or email
  async searchUsers(query, options = {}) {
    const { limit = 10, includeCurrentUser = false } = options;
    
    if (!query || query.trim().length < 2) {
      return {
        success: false,
        error: 'Search query must be at least 2 characters long',
        users: []
      };
    }

    const searchQuery = query.trim();
    const cacheKey = `search:${searchQuery}:${limit}:${includeCurrentUser}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    try {
      // Get secure auth token
      const token = await secureTokenManager.getTokenForRequest();
      if (!token) {
        return {
          success: false,
          error: 'Authentication required',
          users: []
        };
      }

      // Call backend API
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // Cache the result
          this.cache.set(cacheKey, {
            data: {
              success: true,
              users: data.users,
              query: searchQuery,
              count: data.count
            },
            timestamp: Date.now()
          });

          return {
            success: true,
            users: data.users,
            query: searchQuery,
            count: data.count
          };
        } else {
          return {
            success: false,
            error: data.error || 'Search failed',
            users: []
          };
        }
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Search request failed',
          users: []
        };
      }
    } catch (error) {
      console.error('User search error:', error);
      return {
        success: false,
        error: 'Network error during search',
        users: []
      };
    }
  }

  // Get user by ID (for chat initiation)
  async getUserById(userId) {
    try {
      const token = await secureTokenManager.getTokenForRequest();
      if (!token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to get user'
        };
      }
    } catch (error) {
      console.error('Get user error:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  // Clear search cache
  clearCache() {
    this.cache.clear();
  }

  // Get recent searches (stored in localStorage)
  getRecentSearches() {
    try {
      const recent = localStorage.getItem('recentUserSearches');
      return recent ? JSON.parse(recent) : [];
    } catch (error) {
      console.error('Error getting recent searches:', error);
      return [];
    }
  }

  // Add to recent searches
  addToRecentSearches(query, user) {
    try {
      const recent = this.getRecentSearches();
      const newEntry = {
        query: query.trim(),
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar
        },
        timestamp: Date.now()
      };

      // Remove duplicate entries
      const filtered = recent.filter(entry => 
        entry.user.id !== user.id && 
        entry.query.toLowerCase() !== query.toLowerCase()
      );

      // Add new entry to the beginning and limit to 10
      const updated = [newEntry, ...filtered].slice(0, 10);
      
      localStorage.setItem('recentUserSearches', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  }

  // Clear recent searches
  clearRecentSearches() {
    try {
      localStorage.removeItem('recentUserSearches');
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  }

  // Format user for display
  formatUserForDisplay(user) {
    return {
      id: user.id,
      name: user.name || user.username,
      username: user.username,
      displayName: user.displayName || user.name,
      avatar: user.avatar,
      status: user.status || 'offline',
      bio: user.bio,
      location: user.location,
      company: user.company,
      isOnline: user.status === 'online'
    };
  }

  // Debounced search function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Create debounced search function
  createDebouncedSearch(callback, delay = 300) {
    return this.debounce(async (query, options = {}) => {
      if (query.trim().length >= 2) {
        const result = await this.searchUsers(query, options);
        callback(result);
      } else {
        callback({ success: true, users: [], query: '', count: 0 });
      }
    }, delay);
  }
}

// Export singleton instance
export const userSearchService = new UserSearchService();
export default userSearchService;