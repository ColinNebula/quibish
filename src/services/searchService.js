/**
 * Advanced Search Service
 * Provides comprehensive search functionality across different content types
 */

// Search content types
export const SEARCH_TYPES = {
  ALL: 'all',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  USERS: 'users',
  FILES: 'files',
  IMAGES: 'images',
  VIDEOS: 'videos',
  AUDIO: 'audio'
};

// Search result types
export const RESULT_TYPES = {
  CONVERSATION: 'conversation',
  MESSAGE: 'message',
  USER: 'user',
  FILE: 'file',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio'
};

// File type mappings
const FILE_TYPE_MAP = {
  // Images
  'jpg': RESULT_TYPES.IMAGE,
  'jpeg': RESULT_TYPES.IMAGE,
  'png': RESULT_TYPES.IMAGE,
  'gif': RESULT_TYPES.IMAGE,
  'webp': RESULT_TYPES.IMAGE,
  'svg': RESULT_TYPES.IMAGE,
  'bmp': RESULT_TYPES.IMAGE,
  
  // Videos
  'mp4': RESULT_TYPES.VIDEO,
  'avi': RESULT_TYPES.VIDEO,
  'mov': RESULT_TYPES.VIDEO,
  'wmv': RESULT_TYPES.VIDEO,
  'flv': RESULT_TYPES.VIDEO,
  'webm': RESULT_TYPES.VIDEO,
  'mkv': RESULT_TYPES.VIDEO,
  
  // Audio
  'mp3': RESULT_TYPES.AUDIO,
  'wav': RESULT_TYPES.AUDIO,
  'flac': RESULT_TYPES.AUDIO,
  'aac': RESULT_TYPES.AUDIO,
  'ogg': RESULT_TYPES.AUDIO,
  'm4a': RESULT_TYPES.AUDIO
};

/**
 * Mock data for search functionality
 * In a real application, this would come from API calls
 */
const mockSearchData = {
  conversations: [
    {
      id: 1,
      name: "Marketing Team",
      type: "group",
      members: 8,
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
      avatar: "https://via.placeholder.com/40",
      description: "Marketing campaign discussions"
    },
    {
      id: 2,
      name: "Jane Smith",
      type: "direct",
      lastActivity: new Date(Date.now() - 30 * 60 * 1000),
      avatar: "https://via.placeholder.com/40",
      description: "Project manager"
    },
    {
      id: 3,
      name: "Project Alpha Team",
      type: "group",
      members: 12,
      lastActivity: new Date(Date.now() - 5 * 60 * 60 * 1000),
      avatar: "https://via.placeholder.com/40",
      description: "Development team for Project Alpha"
    }
  ],
  
  messages: [
    {
      id: 1,
      conversationId: 1,
      conversationName: "Marketing Team",
      sender: "Alex Rodriguez",
      content: "Let's finalize the video campaign for the product launch",
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      hasAttachments: true,
      attachments: ['campaign_video.mp4']
    },
    {
      id: 2,
      conversationId: 2,
      conversationName: "Jane Smith",
      sender: "Jane Smith",
      content: "The quarterly report photos look great! Can you send the high-res versions?",
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      hasAttachments: true,
      attachments: ['report_charts.png', 'data_visualization.jpg']
    },
    {
      id: 3,
      conversationId: 3,
      conversationName: "Project Alpha Team",
      sender: "Michael Chen",
      content: "Updated the demo video with the latest features",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      hasAttachments: true,
      attachments: ['alpha_demo_v2.mp4']
    },
    {
      id: 4,
      conversationId: 1,
      conversationName: "Marketing Team",
      sender: "Sarah Wilson",
      content: "Here are the brand photos for the new campaign",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      hasAttachments: true,
      attachments: ['brand_photo_1.jpg', 'brand_photo_2.jpg', 'logo_variants.png']
    }
  ],
  
  users: [
    {
      id: 1,
      name: "Alex Rodriguez",
      role: "Marketing Manager",
      email: "alex@company.com",
      avatar: "https://via.placeholder.com/40",
      status: "online",
      department: "Marketing"
    },
    {
      id: 2,
      name: "Jane Smith",
      role: "Project Manager",
      email: "jane@company.com",
      avatar: "https://via.placeholder.com/40",
      status: "away",
      department: "Operations"
    },
    {
      id: 3,
      name: "Michael Chen",
      role: "Senior Developer",
      email: "michael@company.com",
      avatar: "https://via.placeholder.com/40",
      status: "online",
      department: "Engineering"
    },
    {
      id: 4,
      name: "Sarah Wilson",
      role: "Brand Designer",
      email: "sarah@company.com",
      avatar: "https://via.placeholder.com/40",
      status: "online",
      department: "Design"
    }
  ],
  
  files: [
    {
      id: 1,
      name: "campaign_video.mp4",
      type: "video",
      size: "15.2 MB",
      uploadedBy: "Alex Rodriguez",
      conversationId: 1,
      conversationName: "Marketing Team",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      thumbnail: "https://via.placeholder.com/150x100"
    },
    {
      id: 2,
      name: "report_charts.png",
      type: "image",
      size: "2.1 MB",
      uploadedBy: "Jane Smith",
      conversationId: 2,
      conversationName: "Jane Smith",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      thumbnail: "https://via.placeholder.com/150x100"
    },
    {
      id: 3,
      name: "alpha_demo_v2.mp4",
      type: "video",
      size: "42.8 MB",
      uploadedBy: "Michael Chen",
      conversationId: 3,
      conversationName: "Project Alpha Team",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      thumbnail: "https://via.placeholder.com/150x100"
    },
    {
      id: 4,
      name: "brand_photo_1.jpg",
      type: "image",
      size: "5.7 MB",
      uploadedBy: "Sarah Wilson",
      conversationId: 1,
      conversationName: "Marketing Team",
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      thumbnail: "https://via.placeholder.com/150x100"
    },
    {
      id: 5,
      name: "meeting_recording.mp3",
      type: "audio",
      size: "8.4 MB",
      uploadedBy: "Jane Smith",
      conversationId: 2,
      conversationName: "Jane Smith",
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 6,
      name: "product_showcase.mov",
      type: "video",
      size: "128.5 MB",
      uploadedBy: "Alex Rodriguez",
      conversationId: 1,
      conversationName: "Marketing Team",
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      thumbnail: "https://via.placeholder.com/150x100"
    }
  ]
};

/**
 * Get file type from extension
 */
const getFileType = (filename) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return FILE_TYPE_MAP[extension] || RESULT_TYPES.FILE;
};

/**
 * Search across conversations
 */
const searchConversations = (query, filters = {}) => {
  const results = mockSearchData.conversations.filter(conv => 
    conv.name.toLowerCase().includes(query.toLowerCase()) ||
    conv.description?.toLowerCase().includes(query.toLowerCase())
  );
  
  return results.map(conv => ({
    id: conv.id,
    type: RESULT_TYPES.CONVERSATION,
    title: conv.name,
    subtitle: conv.type === 'group' ? `${conv.members} members` : 'Direct message',
    description: conv.description,
    avatar: conv.avatar,
    timestamp: conv.lastActivity,
    metadata: {
      conversationType: conv.type,
      members: conv.members
    }
  }));
};

/**
 * Search across messages
 */
const searchMessages = (query, filters = {}) => {
  const results = mockSearchData.messages.filter(msg => 
    msg.content.toLowerCase().includes(query.toLowerCase()) ||
    msg.sender.toLowerCase().includes(query.toLowerCase())
  );
  
  return results.map(msg => ({
    id: msg.id,
    type: RESULT_TYPES.MESSAGE,
    title: msg.content,
    subtitle: `From ${msg.sender} in ${msg.conversationName}`,
    description: formatTimestamp(msg.timestamp),
    timestamp: msg.timestamp,
    metadata: {
      conversationId: msg.conversationId,
      conversationName: msg.conversationName,
      sender: msg.sender,
      hasAttachments: msg.hasAttachments,
      attachments: msg.attachments
    }
  }));
};

/**
 * Search across users
 */
const searchUsers = (query, filters = {}) => {
  const results = mockSearchData.users.filter(user => 
    user.name.toLowerCase().includes(query.toLowerCase()) ||
    user.role.toLowerCase().includes(query.toLowerCase()) ||
    user.email.toLowerCase().includes(query.toLowerCase()) ||
    user.department.toLowerCase().includes(query.toLowerCase())
  );
  
  return results.map(user => ({
    id: user.id,
    type: RESULT_TYPES.USER,
    title: user.name,
    subtitle: user.role,
    description: user.department,
    avatar: user.avatar,
    metadata: {
      email: user.email,
      status: user.status,
      department: user.department
    }
  }));
};

/**
 * Search across files
 */
const searchFiles = (query, filters = {}) => {
  let results = mockSearchData.files.filter(file => 
    file.name.toLowerCase().includes(query.toLowerCase()) ||
    file.uploadedBy.toLowerCase().includes(query.toLowerCase()) ||
    file.conversationName.toLowerCase().includes(query.toLowerCase())
  );
  
  // Filter by file type if specified
  if (filters.fileType && filters.fileType !== SEARCH_TYPES.FILES) {
    results = results.filter(file => {
      const fileType = getFileType(file.name);
      switch (filters.fileType) {
        case SEARCH_TYPES.IMAGES:
          return fileType === RESULT_TYPES.IMAGE;
        case SEARCH_TYPES.VIDEOS:
          return fileType === RESULT_TYPES.VIDEO;
        case SEARCH_TYPES.AUDIO:
          return fileType === RESULT_TYPES.AUDIO;
        default:
          return true;
      }
    });
  }
  
  return results.map(file => ({
    id: file.id,
    type: getFileType(file.name),
    title: file.name,
    subtitle: `${file.size} • Uploaded by ${file.uploadedBy}`,
    description: `In ${file.conversationName}`,
    thumbnail: file.thumbnail,
    timestamp: file.timestamp,
    metadata: {
      size: file.size,
      uploadedBy: file.uploadedBy,
      conversationId: file.conversationId,
      conversationName: file.conversationName,
      fileType: file.type
    }
  }));
};

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInHours = (now - date) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} hours ago`;
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Main search function
 */
export const performSearch = async (query, searchType = SEARCH_TYPES.ALL, filters = {}) => {
  if (!query || query.trim().length < 2) {
    return [];
  }
  
  const trimmedQuery = query.trim();
  let results = [];
  
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    switch (searchType) {
      case SEARCH_TYPES.CONVERSATIONS:
        results = searchConversations(trimmedQuery, filters);
        break;
        
      case SEARCH_TYPES.MESSAGES:
        results = searchMessages(trimmedQuery, filters);
        break;
        
      case SEARCH_TYPES.USERS:
        results = searchUsers(trimmedQuery, filters);
        break;
        
      case SEARCH_TYPES.FILES:
      case SEARCH_TYPES.IMAGES:
      case SEARCH_TYPES.VIDEOS:
      case SEARCH_TYPES.AUDIO:
        results = searchFiles(trimmedQuery, { ...filters, fileType: searchType });
        break;
        
      case SEARCH_TYPES.ALL:
      default:
        // Search across all types
        const conversationResults = searchConversations(trimmedQuery, filters);
        const messageResults = searchMessages(trimmedQuery, filters);
        const userResults = searchUsers(trimmedQuery, filters);
        const fileResults = searchFiles(trimmedQuery, filters);
        
        results = [
          ...conversationResults,
          ...messageResults,
          ...userResults,
          ...fileResults
        ];
        break;
    }
    
    // Sort by relevance (timestamp for now, could be improved)
    results.sort((a, b) => {
      // Prioritize by type: conversations, users, messages, files
      const typeOrder = {
        [RESULT_TYPES.CONVERSATION]: 1,
        [RESULT_TYPES.USER]: 2,
        [RESULT_TYPES.MESSAGE]: 3,
        [RESULT_TYPES.IMAGE]: 4,
        [RESULT_TYPES.VIDEO]: 4,
        [RESULT_TYPES.AUDIO]: 4,
        [RESULT_TYPES.FILE]: 4
      };
      
      const aOrder = typeOrder[a.type] || 5;
      const bOrder = typeOrder[b.type] || 5;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Then sort by timestamp (most recent first)
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

/**
 * Get search suggestions based on partial query
 */
export const getSearchSuggestions = (query) => {
  if (!query || query.length < 1) {
    return [];
  }
  
  const suggestions = [];
  const lowerQuery = query.toLowerCase();
  
  // Add conversation name suggestions
  mockSearchData.conversations.forEach(conv => {
    if (conv.name.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        text: conv.name,
        type: 'conversation',
        icon: '💬'
      });
    }
  });
  
  // Add user name suggestions
  mockSearchData.users.forEach(user => {
    if (user.name.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        text: user.name,
        type: 'user',
        icon: '👤'
      });
    }
  });
  
  // Add file name suggestions
  mockSearchData.files.forEach(file => {
    if (file.name.toLowerCase().includes(lowerQuery)) {
      const fileType = getFileType(file.name);
      const icon = fileType === RESULT_TYPES.IMAGE ? '🖼️' : 
                   fileType === RESULT_TYPES.VIDEO ? '🎥' : 
                   fileType === RESULT_TYPES.AUDIO ? '🎵' : '📄';
      suggestions.push({
        text: file.name,
        type: 'file',
        icon
      });
    }
  });
  
  // Remove duplicates and limit results
  const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
    index === self.findIndex(s => s.text === suggestion.text)
  );
  
  return uniqueSuggestions.slice(0, 8);
};

/**
 * Quick search for instant results
 */
export const quickSearch = (query) => {
  if (!query || query.trim().length < 1) {
    return [];
  }
  
  const trimmedQuery = query.trim().toLowerCase();
  const results = [];
  
  // Quick conversation matches
  mockSearchData.conversations.forEach(conv => {
    if (conv.name.toLowerCase().includes(trimmedQuery)) {
      results.push({
        id: conv.id,
        type: RESULT_TYPES.CONVERSATION,
        title: conv.name,
        subtitle: conv.type === 'group' ? `${conv.members} members` : 'Direct message',
        avatar: conv.avatar
      });
    }
  });
  
  // Quick user matches
  mockSearchData.users.forEach(user => {
    if (user.name.toLowerCase().includes(trimmedQuery)) {
      results.push({
        id: user.id,
        type: RESULT_TYPES.USER,
        title: user.name,
        subtitle: user.role,
        avatar: user.avatar
      });
    }
  });
  
  return results.slice(0, 5);
};

const searchService = {
  performSearch,
  getSearchSuggestions,
  quickSearch,
  SEARCH_TYPES,
  RESULT_TYPES
};

export default searchService;
