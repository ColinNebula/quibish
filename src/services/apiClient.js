// API Client Service
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
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
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.token) {
        apiClient.setToken(response.token);
      }
      return response;
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    }
  },

  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      if (response.token) {
        apiClient.setToken(response.token);
      }
      return response;
    } catch (error) {
      throw new Error('Registration failed. Please try again.');
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