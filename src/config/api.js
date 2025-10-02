// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api',
  WS_URL: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:5001',
  TIMEOUT: 10000, // 10 seconds
};

// Utility function to build API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.BASE_URL}/${cleanEndpoint}`;
};

// Enhanced fetch wrapper with proper error handling
export const apiFetch = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  
  const config = {
    timeout: API_CONFIG.TIMEOUT,
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check if response has content
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
};

export default API_CONFIG;