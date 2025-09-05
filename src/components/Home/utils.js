import { APP_CONFIG, MESSAGE_STATUS, MESSAGE_TYPES } from './constants';

// Message utilities
export const createMessage = ({
  text,
  sender = 'You',
  type = MESSAGE_TYPES.TEXT,
  file = null,
  replyTo = null
}) => {
  return {
    id: generateId(),
    text: text.trim(),
    sender,
    timestamp: new Date().toISOString(),
    type,
    status: MESSAGE_STATUS.SENDING,
    file,
    replyTo,
    reactions: [],
    isOwn: sender === 'You'
  };
};

export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (filename) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const iconMap = {
    // Images
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
    // Documents
    pdf: '📄', doc: '📝', docx: '📝', txt: '📄', rtf: '📄',
    // Spreadsheets
    xls: '📊', xlsx: '📊', csv: '📊',
    // Presentations
    ppt: '📽️', pptx: '📽️',
    // Audio
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵',
    // Video
    mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬',
    // Archives
    zip: '📦', rar: '📦', '7z': '📦', tar: '📦',
    // Code
    js: '💻', ts: '💻', html: '💻', css: '💻', json: '💻', xml: '💻'
  };
  
  return iconMap[extension] || '📎';
};

// Time utilities
export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

export const formatFullTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const isToday = (timestamp) => {
  const date = new Date(timestamp);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isYesterday = (timestamp) => {
  const date = new Date(timestamp);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

// Search utilities
export const searchMessages = (messages, query) => {
  if (!query.trim()) return messages;
  
  const searchTerm = query.toLowerCase().trim();
  
  return messages.filter(message => {
    const textMatch = message.text?.toLowerCase().includes(searchTerm);
    const senderMatch = message.sender?.toLowerCase().includes(searchTerm);
    return textMatch || senderMatch;
  });
};

export const highlightSearchTerm = (text, searchTerm) => {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

export const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Filter utilities
export const filterMessagesByCategory = (messages, category) => {
  switch (category) {
    case 'images':
      return messages.filter(msg => msg.type === MESSAGE_TYPES.IMAGE);
    case 'files':
      return messages.filter(msg => msg.type === MESSAGE_TYPES.FILE);
    case 'voice':
      return messages.filter(msg => msg.type === MESSAGE_TYPES.VOICE);
    case 'important':
      return messages.filter(msg => msg.reactions?.length > 0);
    default:
      return messages;
  }
};

// Validation utilities
export const validateMessage = (text) => {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (trimmed.length > APP_CONFIG.MAX_MESSAGE_LENGTH) {
    return { 
      isValid: false, 
      error: `Message too long (max ${APP_CONFIG.MAX_MESSAGE_LENGTH} characters)` 
    };
  }
  
  return { isValid: true, error: null };
};

export const validateFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  if (!APP_CONFIG.SUPPORTED_FILE_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'File type not supported' 
    };
  }
  
  if (file.size > APP_CONFIG.UPLOAD_MAX_SIZE) {
    return { 
      isValid: false, 
      error: `File too large (max ${formatFileSize(APP_CONFIG.UPLOAD_MAX_SIZE)})` 
    };
  }
  
  return { isValid: true, error: null };
};

// UI utilities
export const scrollToElement = (element, behavior = 'smooth') => {
  if (element) {
    element.scrollIntoView({ behavior, block: 'nearest' });
  }
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return { success: true };
    } catch (fallbackError) {
      document.body.removeChild(textArea);
      return { success: false, error: 'Failed to copy to clipboard' };
    }
  }
};

export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// String utilities
export const truncateText = (text, maxLength = 50) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
};

// Array utilities
export const groupMessagesByDate = (messages) => {
  const groups = {};
  
  messages.forEach(message => {
    const date = new Date(message.timestamp);
    let groupKey;
    
    if (isToday(message.timestamp)) {
      groupKey = 'Today';
    } else if (isYesterday(message.timestamp)) {
      groupKey = 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(message);
  });
  
  return groups;
};

export const groupMessagesBySender = (messages) => {
  const groups = [];
  let currentGroup = null;
  
  messages.forEach(message => {
    if (!currentGroup || currentGroup.sender !== message.sender) {
      currentGroup = {
        sender: message.sender,
        isOwn: message.isOwn,
        messages: [message]
      };
      groups.push(currentGroup);
    } else {
      currentGroup.messages.push(message);
    }
  });
  
  return groups;
};

// Performance utilities
export const debounce = (func, wait, immediate) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Color utilities
export const generateAvatarColor = (name) => {
  const colors = [
    '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', 
    '#f59e0b', '#ef4444', '#ec4899', '#84cc16'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Error handling utilities
export const handleError = (error, context = '') => {
  console.error(`Error ${context}:`, error);
  
  // You could integrate with error reporting service here
  // e.g., Sentry, LogRocket, etc.
  
  return {
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    context
  };
};

// Local storage utilities
export const safeJSONParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

export const safeJSONStringify = (obj) => {
  try {
    return JSON.stringify(obj);
  } catch {
    return null;
  }
};