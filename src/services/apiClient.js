import axios from 'axios';
import websocketService from './websocketService';

/**
 * Simple connection management
 * Uses browser's online/offline events and WebSocketService for real-time status
 */
const connectionManager = {
  // Connection state
  _isConnected: navigator.onLine && websocketService.isConnected,
  _listeners: [],
  
  // Get current connection state
  get isConnected() {
    return navigator.onLine && websocketService.isConnected;
  },
  
  // Add connection listener
  addConnectionListener(listener) {
    this._listeners.push(listener);
    
    // Connect to WebSocketService
    const wsUnsubscribe = websocketService.addConnectionListener((connected, details) => {
      this._isConnected = navigator.onLine && connected;
      listener(this._isConnected, details);
    });
    
    // Also listen for browser online/offline events
    const handleOnline = () => {
      if (websocketService.isConnected) {
        this._isConnected = true;
        listener(true, { source: 'browser', event: 'online' });
      }
    };
    
    const handleOffline = () => {
      this._isConnected = false;
      listener(false, { source: 'browser', event: 'offline' });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Return unsubscribe function that removes all listeners
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
      wsUnsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
  
  // Notify connection status change
  notifyConnectionChange(isConnected) {
    if (this._isConnected !== isConnected) {
      this._isConnected = isConnected;
      this._listeners.forEach(listener => {
        try {
          listener(isConnected, { source: 'api' });
        } catch (error) {
          console.error('Error in connection listener:', error);
        }
      });
      console.log(`[API] Connection status changed: ${isConnected ? 'Connected' : 'Disconnected'}`);
    }
  }
};

// Create an axios instance with default config
const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api',
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 5000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor to include the auth token
API.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Additional translation API
const TRANSLATION_API = axios.create({
  baseURL: 'https://api.translation-service.example', // Mock API for translation
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer translation_api_key'
  }
});

// Helper function to check API connection
export const checkApiConnection = async () => {
  try {
    const response = await API.get('/ping', { timeout: 3000 });
    connectionManager.notifyConnectionChange(true);
    
    // Try to establish WebSocket connection if HTTP connection is successful
    if (!websocketService.isConnected) {
      websocketService.connect();
    }
    
    return response.status === 200;
  } catch (error) {
    console.warn('API server not available, enabling demo mode:', error.message);
    connectionManager.notifyConnectionChange(false);
    return false;
  }
};

// Periodic connection checker (TEMPORARILY DISABLED)
const startConnectionChecker = () => {
  console.log('⚠️ Connection checker temporarily disabled to fix rate limiting');
  // TODO: Re-enable after fixing rate limiting issues
  return;
};

// Helper function to sync pending messages when connection is restored
const syncPendingMessages = async () => {
  try {
    // Get pending messages from localStorage
    const pendingMessagesJson = localStorage.getItem('pendingMessages');
    if (!pendingMessagesJson) return;
    
    const pendingMessages = JSON.parse(pendingMessagesJson);
    if (pendingMessages.length === 0) return;
    
    console.log(`Syncing ${pendingMessages.length} pending messages...`);
    
    // Process each pending message
    const syncPromises = pendingMessages.map(async (message) => {
      try {
        await API.post('/messages', {
          text: message.text,
          sender: message.sender,
          type: message.type,
          replyTo: message.replyTo,
          timestamp: message.timestamp,
          pendingId: message.id // Send original pending ID for correlation
        });
        return { success: true, id: message.id };
      } catch (error) {
        console.error(`Failed to sync message ${message.id}:`, error);
        return { success: false, id: message.id };
      }
    });
    
    // Wait for all sync attempts to complete
    const results = await Promise.allSettled(syncPromises);
    
    // Remove successfully synced messages
    const syncedIds = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value.id);
    
    if (syncedIds.length > 0) {
      const remainingMessages = pendingMessages.filter(m => !syncedIds.includes(m.id));
      localStorage.setItem('pendingMessages', JSON.stringify(remainingMessages));
      console.log(`Synced ${syncedIds.length} messages, ${remainingMessages.length} remaining`);
    }
  } catch (error) {
    console.error('Error syncing pending messages:', error);
  }
};

// Add connection state listener for syncing
connectionManager.addConnectionListener((isConnected) => {
  if (isConnected) {
    syncPendingMessages();
  }
});

// Listen to WebSocketService for connection state
websocketService.addConnectionListener((connected) => {
  // Only update API connection status if the WebSocket state affects overall connection
  const currentConnectionState = connectionManager.isConnected;
  const newConnectionState = navigator.onLine && connected;
  
  if (currentConnectionState !== newConnectionState) {
    connectionManager.notifyConnectionChange(newConnectionState);
  }
});

// Start the connection checker
startConnectionChecker();

// Helper functions for demo mode
const simulateDemoUserUpdate = (userId, userData, isFormData) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
        if (!currentUser) {
          reject(new Error('User not found'));
          return;
        }
        
        // Process form data if needed
        let dataObj = userData;
        if (isFormData) {
          dataObj = {};
          for (const [key, value] of userData.entries()) {
            // Handle file type (avatar)
            if (key === 'avatar' && value instanceof File) {
              // In a real app we'd upload this file, but for demo we'll use FileReader
              // to convert to data URL and store that
              const reader = new FileReader();
              reader.onloadend = () => {
                dataObj[key] = reader.result;
              };
              reader.readAsDataURL(value);
            } else {
              dataObj[key] = value;
            }
          }
        }
        
        // Update user data
        const updatedUser = { ...currentUser, ...dataObj };
        
        // Store updated user
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        resolve(updatedUser);
      } catch (error) {
        reject(new Error('Error updating user in demo mode'));
      }
    }, 500);
  });
};

const simulateDemoPasswordChange = (userId, currentPassword, newPassword) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Get demo users
      const demoUsers = JSON.parse(localStorage.getItem('demoUsers') || '[]');
      const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
      
      if (!currentUser) {
        reject(new Error('User not found'));
        return;
      }
      
      // Find the user in demo users
      const userIndex = demoUsers.findIndex(u => u.id === userId || u.username === currentUser.username);
      
      if (userIndex === -1) {
        reject(new Error('User not found in demo database'));
        return;
      }
      
      // Verify current password
      if (demoUsers[userIndex].password !== currentPassword) {
        reject(new Error('Current password is incorrect'));
        return;
      }
      
      // Update password
      demoUsers[userIndex].password = newPassword;
      localStorage.setItem('demoUsers', JSON.stringify(demoUsers));
      
      resolve({ success: true, message: 'Password updated successfully' });
    }, 500);
  });
};

const simulateDemoPreferencesUpdate = (userId, preferences) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
        if (!currentUser) {
          reject(new Error('User not found'));
          return;
        }
        
        // Update user preferences
        const updatedUser = {
          ...currentUser,
          preferences: {
            ...(currentUser.preferences || {}),
            ...preferences
          }
        };
        
        // Store updated user
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        resolve({ success: true, user: updatedUser });
      } catch (error) {
        reject(new Error('Error updating preferences in demo mode'));
      }
    }, 500);
  });
};

// Request interceptor for adding auth token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor with retry logic
API.interceptors.response.use(
  (response) => {
    // Successful response indicates we're connected
    connectionManager.notifyConnectionChange(true);
    return response;
  },
  async (error) => {
    // Handle common errors here (e.g., 401 Unauthorized)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/'; // Redirect to login
      return Promise.reject(error);
    }
    
    // Don't retry if specifically flagged to skip retry
    if (error.config?.skipRetry) {
      return Promise.reject(error);
    }
    
    // Network error or timeout indicates we're disconnected
    if (error.code === 'ECONNABORTED' || 
        error.message.includes('timeout') || 
        error.message.includes('Network Error')) {
      
      connectionManager.notifyConnectionChange(false);
      
      // Don't retry if we've reached max retries
      if (connectionManager.currentRetries >= connectionManager.maxRetries) {
        console.error(`Max retries (${connectionManager.maxRetries}) reached for request:`, error.config.url);
        // Reset retry counter for next request
        connectionManager.currentRetries = 0;
        return Promise.reject(error);
      }
      
      // Increment retry counter
      connectionManager.currentRetries++;
      
      // Calculate delay for exponential backoff
      const retryDelay = connectionManager.getRetryDelay();
      console.log(`Retry ${connectionManager.currentRetries}/${connectionManager.maxRetries} for ${error.config.url} after ${retryDelay}ms`);
      
      // Wait for the backoff period
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Retry the request
      return API(error.config);
    }
    
    return Promise.reject(error);
  }
);

// Offline/Demo authentication function
const performOfflineLogin = (username, password) => {
  console.log('Performing offline authentication for:', username);
  
  // Demo users for offline mode
  const demoUsers = [
    { username: 'demo', password: 'demo', email: 'demo@quibish.com', name: 'Demo User' },
    { username: 'john', password: 'password', email: 'john@example.com', name: 'John Doe' },
    { username: 'jane', password: 'password', email: 'jane@example.com', name: 'Jane Smith' },
    { username: 'admin', password: 'admin', email: 'admin@quibish.com', name: 'Admin User' }
  ];
  
  // Find matching user
  const user = demoUsers.find(u => 
    (u.username === username || u.email === username) && u.password === password
  );
  
  if (user) {
    return {
      user: {
        id: Date.now(),
        username: user.username,
        email: user.email,
        name: user.name,
        isOnline: true,
        status: 'online',
        lastActive: new Date().toISOString()
      },
      token: 'offline-demo-token-' + Date.now(),
      success: true
    };
  } else {
    // Allow any credentials in demo mode, but use generic user
    return {
      user: {
        id: Date.now(),
        username: username,
        email: username.includes('@') ? username : username + '@demo.com',
        name: username.charAt(0).toUpperCase() + username.slice(1),
        isOnline: true,
        status: 'online',
        lastActive: new Date().toISOString()
      },
      token: 'offline-token-' + Date.now(),
      success: true
    };
  }
};

// Auth service
export const authService = {
  // Get user data by ID
  getUserById: async (userId) => {
    try {
      const response = await API.get(`/users/${userId}`);
      return response.data.user;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  },
  
  // Get all users (admin function)
  getAllUsers: async () => {
    try {
      const response = await API.get('/users');
      return response.data.users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },
  
  // Update user profile
  updateUser: async (userId, userData) => {
    try {
      // Handle both FormData and JSON
      const isFormData = userData instanceof FormData;
      
      const config = {
        headers: {
          'Content-Type': isFormData ? 'multipart/form-data' : 'application/json'
        }
      };
      
      // For demo mode, simulate API
      if (!await checkApiConnection()) {
        console.log('API offline, using demo mode for updateUser');
        return simulateDemoUserUpdate(userId, userData, isFormData);
      }
      
      const response = await API.put(`/users/${userId}`, userData, config);
      return response.data.user;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },
  
  // Change user password
  changePassword: async (userId, currentPassword, newPassword) => {
    try {
      // For demo mode, simulate API
      if (!await checkApiConnection()) {
        console.log('API offline, using demo mode for changePassword');
        return simulateDemoPasswordChange(userId, currentPassword, newPassword);
      }
      
      const response = await API.post(`/users/${userId}/change-password`, {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },
  
  // Update user preferences
  updatePreferences: async (userId, preferences) => {
    try {
      // For demo mode, simulate API
      if (!await checkApiConnection()) {
        console.log('API offline, using demo mode for updatePreferences');
        return simulateDemoPreferencesUpdate(userId, preferences);
      }

      const response = await API.put(`/users/${userId}/preferences`, preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  },

  // Update current user's profile (simplified)
  updateProfile: async (userData) => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      console.log('updateProfile Debug - Token check:', {
        token: token ? 'present' : 'missing',
        userData: userData
      });
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      const response = await API.put('/users/profile', userData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('updateProfile Debug - API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('updateProfile Debug - Error details:', {
        error: error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Fallback to offline mode
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || !navigator.onLine) {
        console.log('Network error detected - falling back to offline mode');
        const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        const updatedUser = { ...currentUser, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      }
      
      throw error;
    }
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const token = localStorage.getItem('authToken');
      const response = await API.post('/users/avatar', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  },

  // Remove avatar
  removeAvatar: async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await API.delete('/users/avatar', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error removing avatar:', error);
      throw error;
    }
  },

  // Update current user preferences (simplified)
  updateCurrentUserPreferences: async (preferences) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await API.put('/users/preferences', preferences, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  },

  // Change current user password (simplified)
  changeCurrentUserPassword: async (currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await API.post('/users/change-password', {
        currentPassword,
        newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },
  login: async (username, password) => {
    try {
      console.log('API Client - Login attempt:', { username });
      
      // First check if API is available
      const isApiConnected = await checkApiConnection();
      
      if (!isApiConnected) {
        // Use offline/demo authentication
        console.log('API offline - using demo authentication');
        return performOfflineLogin(username, password);
      }
      
      const response = await API.post('/auth/login', { username, password });
      console.log('API Client - Login response:', response.data);
      
      // Handle inconsistent response formats by normalizing
      const data = response.data;
      
      // If response has success field and it's false, throw custom error with response data
      if (data.hasOwnProperty('success') && !data.success) {
        const error = new Error(data.error || data.message || 'Login failed');
        error.response = { data }; // Attach response data for consistent error handling
        throw error;
      }
      
      // Return normalized response with proper fallbacks for each field
      return {
        user: data.user || { username: username, email: username.includes('@') ? username : null },
        token: data.token || 'demo-token', // Fallback for testing
        success: true
      };
    } catch (error) {
      console.error('Auth service login error:', error);
      
      // If network error, try offline authentication
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || !navigator.onLine) {
        console.log('Network error detected - falling back to demo authentication');
        return performOfflineLogin(username, password);
      }
      
      throw error;
    }
  },
  register: async (username, email, password) => {
    try {
      console.log('API Client - Registration attempt:', { username, email });
      
      // First check if API is available
      const isApiConnected = await checkApiConnection();
      
      if (!isApiConnected) {
        // Use offline registration
        console.log('API offline - using demo registration');
        return {
          user: {
            id: Date.now(),
            username: username,
            email: email,
            name: username.charAt(0).toUpperCase() + username.slice(1)
          },
          token: 'offline-registration-token-' + Date.now(),
          success: true
        };
      }
      
      const response = await API.post('/auth/register', { username, email, password });
      console.log('API Client - Registration response:', response.data);
      
      // Handle inconsistent response formats by normalizing
      const data = response.data;
      
      // If response has success field and it's false, throw custom error with response data
      if (data.hasOwnProperty('success') && !data.success) {
        const error = new Error(data.error || data.message || 'Registration failed');
        error.response = { data }; // Attach response data for consistent error handling
        throw error;
      }
      
      // Return normalized response
      return {
        user: data.user || { username, email },
        token: data.token || 'demo-token-' + Date.now().toString().slice(-6),
        success: true
      };
    } catch (error) {
      console.error('Auth service registration error:', error);
      
      // If network error, allow offline registration
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || !navigator.onLine) {
        console.log('Network error detected - allowing offline registration');
        return {
          user: {
            id: Date.now(),
            username: username,
            email: email,
            name: username.charAt(0).toUpperCase() + username.slice(1)
          },
          token: 'offline-fallback-token-' + Date.now(),
          success: true
        };
      }
      
      throw error;
    }
  },
  saveUserSession: (user, token, remember = false) => {
    // First clear any existing session data to prevent conflicts
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    
    // Now store in the appropriate storage
    const storage = remember ? localStorage : sessionStorage;
    
    try {
      // Ensure the user is marked as online when saving session
      const userWithOnlineStatus = {
        ...user,
        isOnline: true,
        status: 'online',
        lastActive: new Date().toISOString()
      };
      
      storage.setItem('user', JSON.stringify(userWithOnlineStatus));
      storage.setItem('authToken', token);
      console.log(`User session saved in ${remember ? 'localStorage' : 'sessionStorage'} with online status`);
      return true;
    } catch (error) {
      console.error('Error saving user session:', error);
      // Fallback to the other storage if the primary one fails
      try {
        const fallbackStorage = remember ? sessionStorage : localStorage;
        const userWithOnlineStatus = {
          ...user,
          isOnline: true,
          status: 'online',
          lastActive: new Date().toISOString()
        };
        fallbackStorage.setItem('user', JSON.stringify(userWithOnlineStatus));
        fallbackStorage.setItem('authToken', token);
        console.log('User session saved in fallback storage');
        return true;
      } catch (fallbackError) {
        console.error('Error saving user session in fallback storage:', fallbackError);
        return false;
      }
    }
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    window.location.href = '/'; // Redirect to login
  },
  getUser: () => {
    // Check both storage locations
    const userLocal = localStorage.getItem('user');
    const userSession = sessionStorage.getItem('user');
    const user = userLocal || userSession;
    return user ? JSON.parse(user) : null;
  },
  getToken: () => {
    // Check both storage locations
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }
};

// Messages service
// Cache for messages
const messageCache = {
  messages: [],
  statusUpdates: [],
  lastUpdated: null,
  
  // Save messages to cache
  saveMessages(messages) {
    this.messages = messages;
    this.lastUpdated = new Date();
    
    // Also save to localStorage as backup
    try {
      localStorage.setItem('cachedMessages', JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save messages to localStorage:', e);
    }
  },
  
  // Save status updates to cache
  saveStatusUpdates(updates) {
    this.statusUpdates = updates;
    
    // Also save to localStorage as backup
    try {
      localStorage.setItem('statusUpdates', JSON.stringify(updates));
    } catch (e) {
      console.warn('Failed to save status updates to localStorage:', e);
    }
  },
  
  // Get cached messages with fallback to localStorage
  getCachedMessages() {
    if (this.messages.length > 0) {
      return this.messages;
    }
    
    // Try to load from localStorage
    try {
      const cachedData = localStorage.getItem('cachedMessages');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        this.messages = parsedData;
        return parsedData;
      }
    } catch (e) {
      console.warn('Failed to load cached messages from localStorage:', e);
    }
    
    return [];
  },
  
  // Get cached status updates with fallback to localStorage
  getCachedStatusUpdates() {
    if (this.statusUpdates.length > 0) {
      return this.statusUpdates;
    }
    
    // Try to load from localStorage
    try {
      const cachedData = localStorage.getItem('statusUpdates');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        this.statusUpdates = parsedData;
        return parsedData;
      }
    } catch (e) {
      console.warn('Failed to load cached status updates from localStorage:', e);
    }
    
    return [];
  }
};

// User search and management service
export const userService = {
  // Search users by name, username, or email
  async searchUsers(query, limit = 10) {
    try {
      if (!query || query.trim().length < 2) {
        return {
          success: false,
          error: 'Search query must be at least 2 characters long'
        };
      }

      const response = await axios.get(`http://localhost:5001/api/users/search`, {
        params: { q: query.trim(), limit },
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          success: true,
          users: response.data.users,
          count: response.data.count
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Search failed'
        };
      }
    } catch (error) {
      console.error('Error searching users:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to search users'
      };
    }
  },

  // Get all users (for development/testing)
  async getAllUsers(limit = 50) {
    try {
      const response = await axios.get(`http://localhost:5001/api/users`, {
        params: { limit },
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          success: true,
          users: response.data.users
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to get users'
        };
      }
    } catch (error) {
      console.error('Error getting users:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get users'
      };
    }
  }
};

// Conversation service
export const conversationService = {
  // Create a new conversation
  async createConversation(participants, type = 'direct', name = null) {
    try {
      const conversationData = {
        type,
        participants: participants.map(p => p.id || p),
        name: type === 'group' ? name : null
      };

      const response = await axios.post(`http://localhost:5001/api/conversations`, conversationData, {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          success: true,
          conversation: response.data.conversation
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to create conversation'
        };
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create conversation'
      };
    }
  },

  // Get user's conversations
  async getConversations() {
    try {
      const response = await axios.get(`http://localhost:5001/api/conversations`, {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          success: true,
          conversations: response.data.conversations
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to get conversations'
        };
      }
    } catch (error) {
      console.error('Error getting conversations:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get conversations'
      };
    }
  }
};

// Import the new messageService - using dynamic import for lazy loading
import('./messageService').then(module => {
  Object.assign(messageService, module.default);
});

// Legacy messageService for backward compatibility
export const messageService = {
  // Typing indicator callbacks
  _typingCallbacks: [],
  
  // Connection state listener for UI updates
  addConnectionStateListener: (callback) => {
    // Forward to new implementation when loaded
    import('./messageService').then(module => {
      const newMessageService = module.default;
      return newMessageService.addConnectionStateListener(callback);
    });
    
    // For backward compatibility, still connect to connectionManager
    return connectionManager.addConnectionListener(callback);
  },
  
  // Check current connection state
  isConnected: () => {
    // Try to use the new implementation if it's been loaded
    try {
      const newMessageServiceModule = require('./messageService');
      if (newMessageServiceModule && newMessageServiceModule.default) {
        return newMessageServiceModule.default.isConnected();
      }
    } catch (e) {
      // Fall back to old implementation
      console.debug('Using fallback connection check');
    }
    
    return connectionManager.isConnected;
  },
  
  // Get connection quality (new method)
  getConnectionQuality: () => {
    // Try to use the new implementation if it's been loaded
    try {
      const newMessageServiceModule = require('./messageService');
      if (newMessageServiceModule && newMessageServiceModule.default) {
        return newMessageServiceModule.default.getConnectionQuality();
      }
    } catch (e) {
      // Fall back to simple quality check
      if (!connectionManager.isConnected) return 'offline';
      return 'good'; // Default
    }
  },
  
  // Get detailed connection metrics
  getConnectionMetrics: () => {
    // Try to use the new implementation
    try {
      const newMessageServiceModule = require('./messageService');
      if (newMessageServiceModule && newMessageServiceModule.default) {
        return newMessageServiceModule.default.getConnectionMetrics();
      }
    } catch (e) {
      // Return basic metrics
      return {
        latency: 0,
        stability: connectionManager.isConnected ? 100 : 0,
        quality: connectionManager.isConnected ? 'good' : 'offline',
        connected: connectionManager.isConnected
      };
    }
  },
  
  // Reconnect to server
  reconnect: async () => {
    try {
      // Try to use the new implementation if available
      const newMessageServiceModule = require('./messageService');
      if (newMessageServiceModule && newMessageServiceModule.default) {
        return await newMessageServiceModule.default.reconnect();
      }
    } catch (e) {
      // Fall back to basic reconnection attempt
      console.debug('Using fallback reconnect');
    }

    // Legacy reconnection logic
    try {
      await checkApiConnection();
      return connectionManager.isConnected;
    } catch (error) {
      console.error('Reconnection failed:', error);
      return false;
    }
  },
  
  getMessages: async () => {
    try {
      const response = await API.get('/messages');
      const data = response.data;
      
      // Cache successful response
      messageCache.saveMessages(data);
      
      return data;
    } catch (error) {
      console.warn('Error fetching messages, using cached data:', error);
      
      // Return cached data on error
      return messageCache.getCachedMessages();
    }
  },
  
  getStatusUpdates: async () => {
    try {
      const response = await API.get('/status-updates');
      const data = response.data;
      
      // Cache successful response
      messageCache.saveStatusUpdates(data);
      
      return data;
    } catch (error) {
      console.warn('Error fetching status updates, using cached data:', error);
      
      // Return cached data on error
      return messageCache.getCachedStatusUpdates();
    }
  },
  
  sendMessage: async (text, sender, replyTo = null) => {
    // Create message object
    const message = {
      id: Date.now() + Math.random().toString(36).substring(2, 9), // Generate temporary ID
      text,
      sender,
      type: 'text',
      replyTo,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };
    
    try {
      // Try to send message to server
      const response = await API.post('/messages', {
        text,
        sender,
        type: 'text',
        replyTo,
        timestamp: message.timestamp,
      });
      
      // Update cache with successful send
      const updatedMessages = [...messageCache.getCachedMessages(), response.data];
      messageCache.saveMessages(updatedMessages);
      
      return {
        ...response.data,
        status: 'sent'
      };
    } catch (error) {
      console.warn('Failed to send message, saving to pending queue:', error);
      
      // Store in pending messages queue for later sync
      try {
        const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        pendingMessages.push(message);
        localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
      } catch (e) {
        console.error('Failed to save pending message:', e);
      }
      
      // Update local cache with the pending message
      const updatedMessages = [...messageCache.getCachedMessages(), message];
      messageCache.saveMessages(updatedMessages);
      
      // Return message with offline status
      return {
        ...message,
        status: 'pending'
      };
    }
  },
  
  sendVoiceMessage: async (audioFile, sender) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('sender', sender);
    formData.append('type', 'voice');
    
    const response = await axios.post('http://localhost:5001/api/voice-messages', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },
  
  uploadFile: async (file, sender) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sender', sender);
    formData.append('type', 'file');
    
    const response = await axios.post('http://localhost:5001/api/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },
  
  markAsRead: async (messageId, username) => {
    try {
      const response = await API.post(`/messages/${messageId}/read`, { username });
      return response.data;
    } catch (error) {
      console.error('Error marking message as read:', error);
      
      // Local fallback
      const messages = JSON.parse(localStorage.getItem('messages') || '[]');
      const updatedMessages = messages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            readBy: [...(msg.readBy || []), username]
          };
        }
        return msg;
      });
      localStorage.setItem('messages', JSON.stringify(updatedMessages));
      
      // Return the updated message
      return updatedMessages.find(msg => msg.id === messageId);
    }
  },
  
  // Re-export message service methods for compatibility
  sendTypingStatus: (username, isTyping) => {
    import('./messageService').then(module => {
      const messageService = module.default;
      messageService.sendTypingStatus(username, isTyping);
    });
  },
  
  subscribeToTyping: (callback) => {
    import('./messageService').then(module => {
      const messageService = module.default;
      messageService.subscribeToTyping(callback);
    });
  },
  
  unsubscribeFromTyping: () => {
    messageService._typingCallbacks = [];
    
    // In a real app, we would disconnect from WebSocket here
    console.log('Unsubscribed from typing indicators');
  }
};

// Photos service
export const photoService = {
  getPhotos: async (options = {}) => {
    let url = '/photos';
    
    // Add query parameters for delta updates
    if (options.since) {
      url += `?since=${options.since}`;
    }
    
    const response = await API.get(url);
    return response.data;
  },
  
  uploadPhoto: async (file, sender) => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('sender', sender);
    
    const response = await axios.post('http://localhost:5001/api/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },
  
  uploadVideo: async (file, sender) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('sender', sender);
    
    try {
      const response = await axios.post('http://localhost:5001/api/videos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        // Upload progress for large videos
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });
      return response.data;
    } catch (error) {
      // Handle server errors
      if (!navigator.onLine) {
        // Create local video object if offline
        return {
          id: Date.now(),
          url: URL.createObjectURL(file),
          name: file.name,
          timestamp: new Date().toISOString(),
          sender: sender,
          pending: true
        };
      }
      throw error;
    }
  },
  
  // Toggle like on a photo
  toggleLike: async (photoId, username, isLiking = true) => {
    const action = isLiking ? 'like' : 'unlike';
    const response = await API.post(`/photos/${photoId}/${action}`, { username });
    return response.data;
  },
  
  // Get photos liked by a user
  getUserLikedPhotos: async (username) => {
    const response = await API.get(`/photos/liked/${username}`);
    return response.data;
  },
  
  // Get like counts for all photos
  getPhotoLikeCounts: async () => {
    const response = await API.get('/photos/likes/counts');
    return response.data;
  },
  
  // Get users who liked a specific photo
  getPhotoLikedBy: async (photoId) => {
    const response = await API.get(`/photos/${photoId}/likes`);
    return response.data;
  }
};

// Translation service
export const translationService = {
  // Translate text to target language
  translateText: async (text, targetLanguage) => {
    try {
      // Check if we're online
      const online = await checkApiConnection();
      
      if (!online) {
        throw new Error('API not available');
      }
      
      // Make translation request
      const response = await TRANSLATION_API.post('/translate', {
        text,
        targetLanguage
      });
      
      return response.data.translatedText;
    } catch (error) {
      console.error('Error in translation service:', error);
      
      // Demo mode - simulate translation
      const demoTranslations = {
        en: 'This is a sample translated text in English.',
        es: 'Este es un ejemplo de texto traducido en español.',
        fr: 'Ceci est un exemple de texte traduit en français.',
        de: 'Dies ist ein Beispiel für übersetzten Text auf Deutsch.',
        zh: '这是中文翻译文本的示例。',
        ja: 'これは日本語に翻訳されたテキストの例です。',
        ar: 'هذا مثال على النص المترجم باللغة العربية.',
        ru: 'Это пример переведенного текста на русском языке.'
      };
      
      // Return demo translation based on requested language
      return demoTranslations[targetLanguage] || 'Translation not available';
    }
  }
};

const apiClient = {
  auth: authService,
  messages: messageService,
  photos: photoService,
  translation: translationService
};

export default apiClient;
