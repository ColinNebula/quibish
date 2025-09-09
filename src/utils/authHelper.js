/**
 * Authentication Helper
 * Automatically handles login for development/testing
 */

const AUTH_CONFIG = {
  API_BASE: 'http://localhost:5001/api',
  DEFAULT_CREDENTIALS: {
    username: 'admin',
    password: 'admin'
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean} - Whether user has a valid token
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  return !!token;
};

/**
 * Get current auth token
 * @returns {string|null} - Auth token or null
 */
export const getAuthToken = () => {
  return localStorage.getItem('token') || localStorage.getItem('authToken');
};

/**
 * Auto-login with admin credentials if no token present
 * @returns {Promise<boolean>} - Whether login was successful
 */
export const ensureAuthenticated = async () => {
  // Check if already authenticated
  if (isAuthenticated()) {
    console.log('✅ User already authenticated');
    return true;
  }

  console.log('🔐 No auth token found, attempting auto-login...');
  
  try {
    const response = await fetch(`${AUTH_CONFIG.API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(AUTH_CONFIG.DEFAULT_CREDENTIALS)
    });

    if (!response.ok) {
      console.error('❌ Auto-login failed:', response.status, response.statusText);
      return false;
    }

    const data = await response.json();
    
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('authToken', data.token);
      console.log('✅ Auto-login successful');
      return true;
    } else {
      console.error('❌ No token in login response:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Auto-login error:', error);
    return false;
  }
};

/**
 * Logout user
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('authToken');
  console.log('👋 User logged out');
};

const authHelperService = {
  isAuthenticated,
  getAuthToken,
  ensureAuthenticated,
  logout
};

export default authHelperService;