/**
 * Configuration utility for environment variables
 * Centralizes all environment variable access with fallbacks
 */

// ===========================================
// API Configuration
// ===========================================

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api',
  TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT) || 5000,
  UPLOAD_ENDPOINT: process.env.REACT_APP_UPLOAD_ENDPOINT || '/api/upload',
};

export const WEBSOCKET_CONFIG = {
  URL: process.env.REACT_APP_WS_URL || 'ws://localhost:5000/ws',
  RECONNECT_ATTEMPTS: parseInt(process.env.REACT_APP_WS_RECONNECT_ATTEMPTS) || 5,
  RECONNECT_DELAY: parseInt(process.env.REACT_APP_WS_RECONNECT_DELAY) || 3000,
  CONNECTION_TIMEOUT: parseInt(process.env.REACT_APP_CONNECTION_TIMEOUT) || 10000,
};

export const GRAPHQL_CONFIG = {
  URL: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:4000/graphql',
};

// ===========================================
// Authentication Configuration
// ===========================================

export const AUTH_CONFIG = {
  TOKEN_STORAGE_KEY: process.env.REACT_APP_TOKEN_STORAGE_KEY || 'quibish_auth_token',
  SESSION_TIMEOUT: parseInt(process.env.REACT_APP_SESSION_TIMEOUT) || 60, // minutes
};

// ===========================================
// Feature Flags
// ===========================================

export const FEATURES = {
  DEV_TOOLS: process.env.REACT_APP_ENABLE_DEV_TOOLS === 'true',
  EXPERIMENTAL: process.env.REACT_APP_ENABLE_EXPERIMENTAL === 'true',
  DEMO_MODE: process.env.REACT_APP_ENABLE_DEMO_MODE === 'true',
  LOGGING: process.env.REACT_APP_ENABLE_LOGGING === 'true',
  PERFORMANCE_MONITORING: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true',
  ANIMATIONS: process.env.REACT_APP_ENABLE_ANIMATIONS !== 'false', // default true
  SOUNDS: process.env.REACT_APP_ENABLE_SOUNDS === 'true',
  REACT_DEVTOOLS: process.env.REACT_APP_ENABLE_REACT_DEVTOOLS === 'true',
};

// ===========================================
// UI Configuration
// ===========================================

export const UI_CONFIG = {
  DEFAULT_THEME: process.env.REACT_APP_DEFAULT_THEME || 'auto',
  DEFAULT_LANGUAGE: process.env.REACT_APP_DEFAULT_LANGUAGE || 'en',
  SEARCH_DEBOUNCE: parseInt(process.env.REACT_APP_SEARCH_DEBOUNCE) || 300,
  SEARCH_MAX_RESULTS: parseInt(process.env.REACT_APP_SEARCH_MAX_RESULTS) || 50,
};

// ===========================================
// File Upload Configuration
// ===========================================

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 10, // MB
  ALLOWED_FILE_TYPES: process.env.REACT_APP_ALLOWED_FILE_TYPES 
    ? process.env.REACT_APP_ALLOWED_FILE_TYPES.split(',')
    : ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mp3', 'audio/wav'],
};

// ===========================================
// External Services
// ===========================================

export const EXTERNAL_SERVICES = {
  PLACEHOLDER_SERVICE: process.env.REACT_APP_PLACEHOLDER_SERVICE || 'https://images.unsplash.com',
  AVATAR_SERVICE: process.env.REACT_APP_AVATAR_SERVICE || 'https://ui-avatars.com/api',
};

// ===========================================
// Development Utilities
// ===========================================

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

// ===========================================
// Logging Utility
// ===========================================

export const logger = {
  log: (...args) => {
    if (FEATURES.LOGGING || isDevelopment) {
      console.log('[Quibish]', ...args);
    }
  },
  warn: (...args) => {
    if (FEATURES.LOGGING || isDevelopment) {
      console.warn('[Quibish]', ...args);
    }
  },
  error: (...args) => {
    if (FEATURES.LOGGING || isDevelopment) {
      console.error('[Quibish]', ...args);
    }
  },
  debug: (...args) => {
    if (FEATURES.DEV_TOOLS && isDevelopment) {
      console.debug('[Quibish Debug]', ...args);
    }
  },
};

// ===========================================
// Configuration Validator
// ===========================================

export const validateConfig = () => {
  const issues = [];

  // Check critical URLs
  if (!API_CONFIG.BASE_URL) {
    issues.push('API_BASE_URL is not configured');
  }

  if (!WEBSOCKET_CONFIG.URL) {
    issues.push('WS_URL is not configured');
  }

  // Check for development vs production mismatches
  if (isProduction && FEATURES.DEV_TOOLS) {
    issues.push('Dev tools should be disabled in production');
  }

  if (isProduction && FEATURES.LOGGING) {
    issues.push('Logging should be disabled in production');
  }

  // Log validation results
  if (issues.length > 0) {
    logger.warn('Configuration issues detected:', issues);
  } else {
    logger.log('Configuration validation passed');
  }

  return issues;
};

// ===========================================
// Runtime Configuration Info
// ===========================================

export const getConfigInfo = () => ({
  environment: process.env.NODE_ENV,
  apiUrl: API_CONFIG.BASE_URL,
  wsUrl: WEBSOCKET_CONFIG.URL,
  features: FEATURES,
  timestamp: new Date().toISOString(),
});

// Validate configuration on import
if (isDevelopment) {
  validateConfig();
}