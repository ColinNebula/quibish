/**
 * Message utility functions for safe message handling
 */

/**
 * Safely get sender information from a message
 * @param {Object} message - The message object
 * @returns {Object|null} - The sender object or null if not found
 */
export const getMessageSender = (message) => {
  if (!message) return null;
  
  // Check for sender property first (newer format)
  if (message.sender && typeof message.sender === 'object') {
    return message.sender;
  }
  
  // Fallback to user property (legacy format)
  if (message.user && typeof message.user === 'object') {
    return message.user;
  }
  
  return null;
};

/**
 * Safely get avatar URL from a message sender
 * @param {Object} message - The message object
 * @param {string} fallbackUrl - Fallback avatar URL
 * @returns {string} - Avatar URL
 */
export const getMessageAvatar = (message, fallbackUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face') => {
  const sender = getMessageSender(message);
  return sender?.avatar || fallbackUrl;
};

/**
 * Safely get sender name from a message
 * @param {Object} message - The message object
 * @returns {string} - Sender name
 */
export const getMessageSenderName = (message) => {
  const sender = getMessageSender(message);
  return sender?.name || 'Unknown User';
};

/**
 * Check if a message is valid and can be rendered
 * @param {Object} message - The message object
 * @returns {boolean} - True if message is valid
 */
export const isValidMessage = (message) => {
  return !!(message && message.id && getMessageSender(message));
};

/**
 * Update message with new user avatar
 * @param {Object} message - The message object
 * @param {Object} user - The current user object
 * @returns {Object} - Updated message
 */
export const updateMessageAvatar = (message, user) => {
  if (!message || !user?.avatar || !user?.id) return message;
  
  const sender = getMessageSender(message);
  if (!sender) return message;
  
  // Check if this message is from the current user
  const isCurrentUserMessage = sender.id === user.id;
  if (!isCurrentUserMessage) return message;
  
  // Update the message with new avatar
  return {
    ...message,
    sender: message.sender ? {
      ...message.sender,
      avatar: user.avatar
    } : undefined,
    user: message.user ? {
      ...message.user,
      avatar: user.avatar
    } : undefined
  };
};