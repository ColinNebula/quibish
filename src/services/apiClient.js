// API Client Service
import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Try to read error body for a better message
        let errorBody = '';
        try { errorBody = await response.text(); } catch (_) {}
        let parsed = null;
        try { parsed = JSON.parse(errorBody); } catch (_) {}
        const msg = parsed?.error || parsed?.message || `HTTP error! status: ${response.status}`;
        throw new Error(msg);
      }

      // Always read as text first, then try JSON parsing regardless of content-type.
      // This handles servers that send JSON with wrong/missing content-type headers.
      const text = await response.text();
      if (!text) return null;
      const trimmed = text.trimStart();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try { return JSON.parse(text); } catch (_) {}
      }
      return text;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

// Auth service methods
export const authService = {
  async login(username, password) {
    try {
      // Check if backend is available
      const isBackendAvailable = await checkApiConnection();
      
      if (isBackendAvailable) {
        // Try backend login if available
        const response = await apiClient.post('/auth/login', { username, password });
        console.log('Login response from backend:', JSON.stringify(response));

        // Validate the response shape before using it
        if (!response) {
          throw new Error('Server returned an empty response. Please try again.');
        }
        if (typeof response === 'string') {
          console.error('Login - unexpected text response:', response.slice(0, 200));
          throw new Error('Server returned an unexpected response. Please try again.');
        }
        if (response.success === false) {
          throw new Error(response.error || response.message || 'Login failed');
        }
        if (!response.user) {
          throw new Error(response.error || 'Server returned an incomplete response. Please try again.');
        }

        if (response.token) {
          apiClient.setToken(response.token);
        }
        return response;
      } else {
        // Offline mode: Create a demo user for testing
        console.log('🔄 Backend unavailable - using offline mode login');
        
        // Simple validation for demo purposes
        if (!username || !password) {
          throw new Error('Please enter both username and password');
        }
        
        if (password.length < 3) {
          throw new Error('Password too short for demo');
        }
        
        // Create a demo user object
        const demoUser = {
          id: Date.now().toString(),
          username: username,
          email: username.includes('@') ? username : `${username}@quibish.com`,
          name: username.charAt(0).toUpperCase() + username.slice(1),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6366f1&color=fff&size=40`,
          theme: 'light',
          language: 'en',
          isDemo: true,
          joinedAt: new Date().toISOString()
        };
        
        // Generate a demo token
        const demoToken = btoa(JSON.stringify({ userId: demoUser.id, username: username, timestamp: Date.now() }));
        
        console.log('✅ Offline login successful for demo user:', username);
        
        return {
          success: true,
          user: demoUser,
          token: demoToken,
          message: 'Logged in successfully (offline mode)'
        };
      }
    } catch (error) {
      // If it's a network error or an HTTP error, and we haven't tried offline mode, try it
      if (error.message.includes('fetch') || error.message.includes('network') || 
          error.message.includes('Failed to fetch') || error.message.includes('HTTP error')) {
        console.log('🔄 Network error detected - falling back to offline mode');
        
        // Simple validation for demo purposes
        if (!username || !password) {
          throw new Error('Please enter both username and password');
        }
        
        // Create a demo user object
        const demoUser = {
          id: Date.now().toString(),
          username: username,
          email: username.includes('@') ? username : `${username}@quibish.com`,
          name: username.charAt(0).toUpperCase() + username.slice(1),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6366f1&color=fff&size=40`,
          theme: 'light',
          language: 'en',
          isDemo: true,
          joinedAt: new Date().toISOString()
        };
        
        // Generate a demo token
        const demoToken = btoa(JSON.stringify({ userId: demoUser.id, username: username, timestamp: Date.now() }));
        
        return {
          success: true,
          user: demoUser,
          token: demoToken,
          message: 'Logged in successfully (offline mode)'
        };
      }
      
      throw new Error(error.message || 'Login failed. Please check your credentials.');
    }
  },

  async register(userData) {
    try {
      // Check if backend is available
      const isBackendAvailable = await checkApiConnection();
      
      if (isBackendAvailable) {
        // Try backend registration if available
        const response = await apiClient.post('/auth/register', userData);
        if (response.token) {
          apiClient.setToken(response.token);
        }
        return response;
      } else {
        // Offline mode: Create a demo user
        console.log('🔄 Backend unavailable - using offline mode registration');
        
        const { username, email, password, confirmPassword } = userData;
        
        // Simple validation for demo purposes
        if (!username || !email || !password) {
          throw new Error('Please fill in all required fields');
        }
        
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        if (password.length < 3) {
          throw new Error('Password too short for demo');
        }
        
        // Create a demo user object
        const demoUser = {
          id: Date.now().toString(),
          username: username,
          email: email,
          name: username.charAt(0).toUpperCase() + username.slice(1),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6366f1&color=fff&size=40`,
          theme: 'light',
          language: 'en',
          isDemo: true,
          joinedAt: new Date().toISOString()
        };
        
        // Generate a demo token
        const demoToken = btoa(JSON.stringify({ userId: demoUser.id, username: username, timestamp: Date.now() }));
        
        console.log('✅ Offline registration successful for demo user:', username);
        
        return {
          success: true,
          user: demoUser,
          token: demoToken,
          message: 'Registered successfully (offline mode)'
        };
      }
    } catch (error) {
      // If it's a network error, try offline mode
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
        console.log('🔄 Network error detected - falling back to offline mode registration');
        
        const { username, email, password, confirmPassword } = userData;
        
        // Simple validation
        if (!username || !email || !password) {
          throw new Error('Please fill in all required fields');
        }
        
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        // Create demo user
        const demoUser = {
          id: Date.now().toString(),
          username: username,
          email: email,
          name: username.charAt(0).toUpperCase() + username.slice(1),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6366f1&color=fff&size=40`,
          theme: 'light',
          language: 'en',
          isDemo: true,
          joinedAt: new Date().toISOString()
        };
        
        const demoToken = btoa(JSON.stringify({ userId: demoUser.id, username: username, timestamp: Date.now() }));
        
        return {
          success: true,
          user: demoUser,
          token: demoToken,
          message: 'Registered successfully (offline mode)'
        };
      }
      
      throw new Error(error.message || 'Registration failed. Please try again.');
    }
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      apiClient.setToken(null);
    }
  },

  async getCurrentUser() {
    try {
      return await apiClient.get('/auth/me');
    } catch (error) {
      throw new Error('Failed to get current user.');
    }
  },

  async refreshToken() {
    try {
      const response = await apiClient.post('/auth/refresh');
      if (response.token) {
        apiClient.setToken(response.token);
      }
      return response;
    } catch (error) {
      throw new Error('Token refresh failed.');
    }
  }
};

// API Connection check
export const checkApiConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.warn('API connection check failed:', error);
    return false;
  }
};

// User service methods
export const userService = {
  async updateProfile(userData) {
    return apiClient.put('/users/profile', userData);
  },

  async uploadAvatar(formData) {
    return apiClient.request('/users/avatar', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${apiClient.token}`,
        // Don't set Content-Type for FormData
      },
    });
  },

  async getProfile() {
    return apiClient.get('/users/profile');
  }
};

// Message service methods
export const messageService = {
  async sendMessage(messageData) {
    return apiClient.post('/messages', messageData);
  },

  async getMessages(conversationId) {
    return apiClient.get(`/messages/${conversationId}`);
  },

  async deleteMessage(messageId) {
    return apiClient.delete(`/messages/${messageId}`);
  }
};

export default apiClient;