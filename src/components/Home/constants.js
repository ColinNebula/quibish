// Home component constants and configuration
export const APP_CONFIG = {
  TITLE: 'Quibish',
  SUBTITLE: 'Professional Chat',
  MAX_MESSAGE_LENGTH: 1000,
  UPLOAD_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  AUTO_SCROLL_THRESHOLD: 100,
  TYPING_INDICATOR_DELAY: 1000,
  CONNECTION_CHECK_INTERVAL: 30000,
  MESSAGE_LOAD_LIMIT: 50,
  STATUS_UPDATE_INTERVAL: 5000
};

export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: {
    COLLAPSED: 80,
    EXPANDED: 280
  },
  MOBILE_BREAKPOINT: 768,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300,
  SCROLL_BEHAVIOR: 'smooth'
};

export const DEMO_USERS = [
  {
    id: 1,
    name: 'Alice Johnson',
    username: 'alice',
    avatar: null,
    initials: 'AJ',
    status: 'online',
    lastSeen: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Bob Smith',
    username: 'bob',
    avatar: null,
    initials: 'BS',
    status: 'away',
    lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    name: 'Charlie Brown',
    username: 'charlie',
    avatar: null,
    initials: 'CB',
    status: 'offline',
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    name: 'Diana Prince',
    username: 'diana',
    avatar: null,
    initials: 'DP',
    status: 'online',
    lastSeen: new Date().toISOString()
  }
];

export const DEMO_MESSAGES = [
  {
    id: 1,
    sender: 'Alice Johnson',
    text: 'Hey everyone! How\'s the new chat interface working for you?',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    type: 'text',
    status: 'delivered',
    reactions: [{ emoji: '👍', count: 2 }]
  },
  {
    id: 2,
    sender: 'Bob Smith',
    text: 'It looks amazing! The design is so clean and professional.',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    type: 'text',
    status: 'read'
  },
  {
    id: 3,
    sender: 'You',
    text: 'Thanks! We\'ve been working hard on improving the user experience.',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    type: 'text',
    status: 'delivered',
    isOwn: true
  },
  {
    id: 4,
    sender: 'Charlie Brown',
    text: 'The mobile responsiveness is fantastic. Works perfectly on my phone!',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    type: 'text',
    status: 'delivered'
  },
  {
    id: 5,
    sender: 'Diana Prince',
    text: 'Love the new status updates feature. Very intuitive!',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    type: 'text',
    status: 'delivered',
    reactions: [{ emoji: '❤️', count: 1 }, { emoji: '🚀', count: 1 }]
  },
  {
    id: 6,
    sender: 'System',
    text: 'Welcome to Quibish! Start chatting with your team.',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    type: 'system',
    status: 'delivered'
  }
];

export const DEMO_STATUS_UPDATES = [
  {
    id: 1,
    user: 'Alice Johnson',
    initials: 'AJ',
    content: 'Just finished the quarterly report! 📊',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    seen: false
  },
  {
    id: 2,
    user: 'Bob Smith',
    initials: 'BS',
    content: 'Coffee break time ☕',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    seen: true
  },
  {
    id: 3,
    user: 'Charlie Brown',
    initials: 'CB',
    content: 'Working from the beach today 🏖️',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    seen: false
  }
];

export const DEMO_PHOTOS = [
  {
    id: 1,
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPjIwMHgyMDA8L3RleHQ+PC9zdmc+',
    caption: 'Team meeting photo',
    uploadedBy: 'Alice Johnson',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    likes: 5
  },
  {
    id: 2,
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTBlN2ZmIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzM3MzBhMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdhbGxlcnk8L3RleHQ+PC9zdmc+',
    caption: 'Project workspace',
    uploadedBy: 'Bob Smith',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likes: 3
  }
];

export const MESSAGE_CATEGORIES = [
  { id: 'all', label: 'All', icon: '💬' },
  { id: 'images', label: 'Images', icon: '🖼️' },
  { id: 'files', label: 'Files', icon: '📎' },
  { id: 'voice', label: 'Voice', icon: '🎵' },
  { id: 'important', label: 'Important', icon: '⭐' }
];

export const EMOJI_LIST = ['😀', '😂', '❤️', '👍', '👎', '😍', '😢', '😡', '👏', '🎉', '🔥', '💯'];

export const CONNECTION_STATES = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  POOR: 'poor-connection',
  CRITICAL: 'critical-connection',
  OFFLINE: 'offline'
};

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  VOICE: 'voice',
  SYSTEM: 'system'
};

export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

export const THEME_OPTIONS = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' }
];

export const STORAGE_KEYS = {
  THEME: 'quibish_theme',
  SIDEBAR_STATE: 'quibish_sidebar_collapsed',
  USER_PREFERENCES: 'quibish_user_prefs',
  DRAFT_MESSAGE: 'quibish_draft_message',
  LAST_ACTIVE: 'quibish_last_active'
};

// Utility functions for constants
export const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
};

export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export const validateMessage = (message) => {
  if (!message || typeof message.text !== 'string') return false;
  if (message.text.trim().length === 0) return false;
  if (message.text.length > APP_CONFIG.MAX_MESSAGE_LENGTH) return false;
  return true;
};

export const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const isValidFileType = (file) => {
  return APP_CONFIG.SUPPORTED_FILE_TYPES.includes(file.type);
};

export const isFileSizeValid = (file) => {
  return file.size <= APP_CONFIG.UPLOAD_MAX_SIZE;
};