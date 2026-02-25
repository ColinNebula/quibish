/**
 * Input Validation and Sanitization Middleware
 * Provides comprehensive validation for all API endpoints
 */

const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

/**
 * Sanitize string input to prevent XSS attacks
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove any HTML tags and dangerous characters
  let sanitized = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Additional sanitization
  sanitized = sanitized.trim();
  
  // Escape special characters for SQL injection prevention
  sanitized = sanitized.replace(/['"\\]/g, '\\$&');
  
  return sanitized;
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return validator.isEmail(email) && email.length <= 254;
};

/**
 * Validate username format
 */
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  
  // Username should be 3-30 characters, alphanumeric with underscores and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return { valid: false, message: 'Password is required' };
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }
  
  // Check for at least one uppercase, lowercase, number, and special character
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
    return { 
      valid: false, 
      message: 'Password must contain at least one uppercase letter, lowercase letter, number, and special character' 
    };
  }
  
  return { valid: true };
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return validator.isMongoId(id);
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * General input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Save password before sanitization (passwords should not be sanitized)
    const password = req.body?.password;
    
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    // Restore original password if it existed
    if (password !== undefined) {
      req.body.password = password;
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid input data'
    });
  }
};

/**
 * Auth endpoint validation
 */
const validateAuthInput = (req, res, next) => {
  const { email, username, password, name } = req.body;
  
  // For login
  if (req.path === '/login') {
    if (!email && !username) {
      return res.status(400).json({
        success: false,
        message: 'Email or username is required'
      });
    }
    
    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    if (username && !validateUsername(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-30 characters, alphanumeric with underscores and hyphens only'
      });
    }
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }
  }
  
  // For registration
  if (req.path === '/register') {
    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }
    
    if (!username || !validateUsername(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-30 characters, alphanumeric with underscores and hyphens only'
      });
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }
    
    if (name && (typeof name !== 'string' || name.length > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Name must be a string with maximum 100 characters'
      });
    }
  }
  
  next();
};

/**
 * Contact endpoint validation
 */
const validateContactInput = (req, res, next) => {
  const { name, email, phone, address, notes, groups } = req.body;
  
  // Name is required
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Contact name is required'
    });
  }
  
  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Contact name must be less than 100 characters'
    });
  }
  
  // Email validation (optional but must be valid if provided)
  if (email && !validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }
  
  // Phone validation (optional)
  if (phone && (typeof phone !== 'string' || phone.length > 20)) {
    return res.status(400).json({
      success: false,
      message: 'Phone number must be less than 20 characters'
    });
  }
  
  // Address validation (optional)
  if (address && (typeof address !== 'string' || address.length > 500)) {
    return res.status(400).json({
      success: false,
      message: 'Address must be less than 500 characters'
    });
  }
  
  // Notes validation (optional)
  if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
    return res.status(400).json({
      success: false,
      message: 'Notes must be less than 1000 characters'
    });
  }
  
  // Groups validation (optional)
  if (groups && (!Array.isArray(groups) || groups.some(g => typeof g !== 'string' || g.length > 50))) {
    return res.status(400).json({
      success: false,
      message: 'Groups must be an array of strings, each less than 50 characters'
    });
  }
  
  next();
};

/**
 * Message endpoint validation
 */
const validateMessageInput = (req, res, next) => {
  const { content, recipientId, conversationId } = req.body;
  
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Message content is required'
    });
  }
  
  if (content.length > 5000) {
    return res.status(400).json({
      success: false,
      message: 'Message content must be less than 5000 characters'
    });
  }
  
  if (recipientId && !validateObjectId(recipientId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid recipient ID format'
    });
  }
  
  if (conversationId && !validateObjectId(conversationId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid conversation ID format'
    });
  }
  
  next();
};

/**
 * File upload validation
 */
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }
  
  const file = req.file || (req.files && req.files[0]);
  
  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file upload'
    });
  }
  
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      message: 'File size must be less than 10MB'
    });
  }
  
  // Check file type for avatars
  if (req.path.includes('avatar')) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Avatar must be a JPEG, PNG, GIF, or WebP image'
      });
    }
  }
  
  next();
};

module.exports = {
  sanitizeInput,
  sanitizeString,
  sanitizeObject,
  validateEmail,
  validateUsername,
  validatePassword,
  validateObjectId,
  validateAuthInput,
  validateContactInput,
  validateMessageInput,
  validateFileUpload
};