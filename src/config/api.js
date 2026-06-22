// Build safe runtime defaults that work in both local dev and deployed environments.
const getDefaultApiBaseUrl = () => {
  if (process.env.REACT_APP_API_BASE_URL) return process.env.REACT_APP_API_BASE_URL;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';

    // Keep explicit localhost backend for local development.
    if (isLocalHost) return 'http://localhost:5001/api';

    // Production fallback: same-origin API path avoids CSP/mixed-origin issues.
    return `${window.location.origin}/api`;
  }

  return 'http://localhost:5001/api';
};

const getDefaultWsUrl = () => {
  if (process.env.REACT_APP_WEBSOCKET_URL) return process.env.REACT_APP_WEBSOCKET_URL;

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';

    if (isLocalHost) return 'ws://localhost:5001';
    return `${protocol}//${host}`;
  }

  return 'ws://localhost:5001';
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: getDefaultApiBaseUrl(),
  WS_URL: getDefaultWsUrl(),
  TIMEOUT: 10000, // 10 seconds
};

// Utility function to build API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  let baseUrl = API_CONFIG.BASE_URL;

  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const isCurrentHostLocal = currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost === '0.0.0.0';

    // Safety net: if a build/env accidentally points to localhost while running on a non-local origin,
    // force same-origin API calls to avoid CSP violations in production.
    const pointsToLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?\//i.test(baseUrl);
    if (!isCurrentHostLocal && pointsToLocalApi) {
      baseUrl = `${window.location.origin}/api`;
    }
  }

  return `${baseUrl}/${cleanEndpoint}`;
};

// Enhanced fetch wrapper with proper error handling
export const apiFetch = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  
  // Create AbortController for timeout support
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
  
  // Get auth token from localStorage
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Clear timeout on successful response
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check if response has content
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return data;
    }
    
    const text = await response.text();
    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error(`API request timed out for ${url}`);
      throw new Error(`Request timeout after ${API_CONFIG.TIMEOUT}ms`);
    }
    
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
};

export default API_CONFIG;