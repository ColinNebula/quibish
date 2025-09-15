import React, { useState, useEffect, useCallback, useRef } from 'react';
import ProContextMenu from './ProContextMenu';
import ProUserProfile from './ProUserProfile';
import './ProSidebar.css';
import './ProSidebarResponsive.css';
import './ProSidebarEnhanced.css';
import './ProSidebar.custom.css';

// (search highlighting implemented within component using component state)

const ProSidebar = ({ 
  conversations, 
  onSelectConversation, 
  currentConversation,
  onToggleCollapse,
  collapsed,
  darkMode,
  onToggleDarkMode,
  userPresence,
  className = '',
  user = {},
  onLogout,
  onOpenSettings,
  onNewChat = null,
  isMobileView = false,
  onRequestClose = null
}) => {
  // Debug: log prop wiring to help trace issues when sidebar doesn't behave
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('ProSidebar mounted - className:', className, 'onNewChat present:', typeof onNewChat === 'function');
  }, []);
  // Enhanced conversation list state and utilities
  const [listView, setListView] = useState('compact'); // 'compact', 'detailed', 'grid'
  const [showActivity, setShowActivity] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [conversationStats, setConversationStats] = useState({
    totalConversations: 0,
    unreadCount: 0,
    groupsCount: 0,
    directCount: 0
  });

  // Update conversation statistics
  useEffect(() => {
    const total = conversations.length;
    const unread = conversations.reduce((sum, conv) => sum + (conv.unread || 0), 0);
    const groups = conversations.filter(conv => conv.isGroup).length;
    const direct = conversations.filter(conv => !conv.isGroup).length;
    
    setConversationStats({
      totalConversations: total,
      unreadCount: unread,
      groupsCount: groups,
      directCount: direct
    });
  }, [conversations]);

  // Load view preference
  useEffect(() => {
    const savedView = localStorage.getItem('conversationListView');
    if (savedView && ['compact', 'detailed', 'grid'].includes(savedView)) {
      setListView(savedView);
    }
    const savedShowActivity = localStorage.getItem('showActivity');
    if (savedShowActivity !== null) {
      setShowActivity(JSON.parse(savedShowActivity));
    }
    const savedShowPreview = localStorage.getItem('showPreview');
    if (savedShowPreview !== null) {
      setShowPreview(JSON.parse(savedShowPreview));
    }
  }, []);

  // Enhanced conversation list view options
  const handleViewChange = (view) => {
    setListView(view);
    localStorage.setItem('conversationListView', view);
  };

  const toggleShowActivity = () => {
    const newValue = !showActivity;
    setShowActivity(newValue);
    localStorage.setItem('showActivity', JSON.stringify(newValue));
  };

  const toggleShowPreview = () => {
    const newValue = !showPreview;
    setShowPreview(newValue);
    localStorage.setItem('showPreview', JSON.stringify(newValue));
  };

  // Auto-scroll to active conversation
  useEffect(() => {
    if (currentConversation && autoScroll) {
      setTimeout(() => {
        const activeElement = document.querySelector('.pro-conversation-item.active');
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [currentConversation, autoScroll]);

  // searchQuery state is used for highlighting
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'groups', 'direct'
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [directExpanded, setDirectExpanded] = useState(true);
  const [isTyping, setIsTyping] = useState({});
  const [pinnedConversations, setPinnedConversations] = useState([]);
  const [unpinnedConversations, setUnpinnedConversations] = useState([]);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, conversationId: null });
  const [mutedConversations, setMutedConversations] = useState([]);
  const [favoriteConversations, setFavoriteConversations] = useState([]);
  const [categories, setCategories] = useState({
    work: { name: 'Work', color: '#3b82f6', visible: true }, 
    personal: { name: 'Personal', color: '#10b981', visible: true },
    other: { name: 'Other', color: '#8b5cf6', visible: true }
  });
  const [conversationCategories, setConversationCategories] = useState({});
  const [sortOrder, setSortOrder] = useState('recent'); // 'recent', 'unread', 'alphabetical'
  const [showCategoriesPanel, setShowCategoriesPanel] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [viewMode, setViewMode] = useState('default');
  const [unreadCount, setUnreadCount] = useState(3);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [draggedConversation, setDraggedConversation] = useState(null);
  
  // Reference to the sidebar element for detecting clicks outside the context menu
  const sidebarRef = useRef(null);
  
  // Define category management functions
  const updateCategoryName = (key, name) => {
    setCategories(prev => ({
      ...prev,
      [key]: { ...prev[key], name }
    }));
  };

  const toggleCategoryVisibility = (key) => {
    setCategories(prev => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible }
    }));
  };

  const deleteCategory = (key) => {
    const newCategories = { ...categories };
    delete newCategories[key];
    setCategories(newCategories);
  };

  const addCategory = () => {
    const newKey = `category-${Object.keys(categories).length + 1}`;
    setCategories(prev => ({
      ...prev,
      [newKey]: { name: "New Category", color: "#6b7280", visible: true }
    }));
  };

  // Separate pinned and unpinned conversations
  useEffect(() => {
    // For demo purposes, let's pin the first conversation
    const pinned = conversations.filter(conv => conv.id === 1);
    const unpinned = conversations.filter(conv => conv.id !== 1);
    
    setPinnedConversations(pinned);
    setUnpinnedConversations(unpinned);
    
    // Set favorite conversations (for demo purposes)
    setFavoriteConversations([conversations.find(conv => conv.id === 2)?.id].filter(Boolean));
    
    // Set initial categories (for demo purposes)
    const initialCategories = {
      [conversations.find(conv => conv.id === 1)?.id]: 'work',
      [conversations.find(conv => conv.id === 2)?.id]: 'personal',
      [conversations.find(conv => conv.id === 3)?.id]: 'work',
      [conversations.find(conv => conv.id === 4)?.id]: 'other'
    };
    setConversationCategories(initialCategories);
  }, [conversations]);
  
  // Typing indicators - disabled random simulation
  useEffect(() => {
    // We're disabling the random typing simulation that was causing false typing indicators
    
    // Reset any existing typing indicators to make sure none are showing
    setIsTyping({});
    
    // If we need real typing indicators in the future, we would connect to a real-time service here
    
  }, []);
  
  // Clear search when clicking the clear button
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Keyboard shortcut: Ctrl/Cmd+K to focus search input
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  
  // Handle conversation pinning/unpinning
  const handlePinConversation = (conversationIdOrEvent, conversationObj) => {
    // Handle two possible calling patterns:
    // 1. From context menu: (conversationId)
    // 2. From pin button: (event, conversation)
    let conversationId, conversation;
    
    if (typeof conversationIdOrEvent === 'object' && conversationObj) {
      // Called from button with event and conversation object
      conversationIdOrEvent.stopPropagation();
      conversationId = conversationObj.id;
      conversation = conversationObj;
    } else {
      // Called from context menu with just the ID
      conversationId = conversationIdOrEvent;
      conversation = conversations.find(c => c.id === conversationId);
    }
    
    if (!conversation) return;
    
    if (pinnedConversations.find(conv => conv.id === conversationId)) {
      // Unpin
      setPinnedConversations(pinnedConversations.filter(conv => conv.id !== conversationId));
      setUnpinnedConversations([...unpinnedConversations, conversation]);
    } else {
      // Pin
      setPinnedConversations([...pinnedConversations, conversation]);
      setUnpinnedConversations(unpinnedConversations.filter(conv => conv.id !== conversationId));
    }
  };
  
  // Context menu handlers
  const handleContextMenu = useCallback((e, conversationId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate position to avoid menu going off-screen
    const x = Math.min(e.clientX, window.innerWidth - 230); // 230px = menu width + buffer
    const y = Math.min(e.clientY, window.innerHeight - 200); // 200px = approximate menu height
    
    setContextMenu({
      visible: true,
      x,
      y,
      conversationId
    });
  }, []);
  
  const closeContextMenu = useCallback(() => {
    setContextMenu({ ...contextMenu, visible: false });
  }, [contextMenu]);
  
  // Handle marking conversation as read
  const handleMarkAsRead = useCallback((conversationId) => {
    // Find the conversation and update its unread count
    const targetConvo = [...pinnedConversations, ...unpinnedConversations]
      .find(conv => conv.id === conversationId);
    
    if (!targetConvo) return;
    
    // Update the conversation in either pinned or unpinned array
    if (pinnedConversations.some(conv => conv.id === conversationId)) {
      setPinnedConversations(pinnedConversations.map(conv => 
        conv.id === conversationId ? { ...conv, unread: 0 } : conv
      ));
    } else {
      setUnpinnedConversations(unpinnedConversations.map(conv => 
        conv.id === conversationId ? { ...conv, unread: 0 } : conv
      ));
    }
    
    console.log(`Marked conversation ${conversationId} as read`);
  }, [pinnedConversations, unpinnedConversations]);
  
  // Handle archiving a conversation
  const handleArchiveConversation = useCallback((conversationId) => {
    // Remove from pinned conversations if it's there
    if (pinnedConversations.some(conv => conv.id === conversationId)) {
      setPinnedConversations(pinnedConversations.filter(conv => conv.id !== conversationId));
    }
    
    // Remove from unpinned conversations
    setUnpinnedConversations(unpinnedConversations.filter(conv => conv.id !== conversationId));
    
    console.log(`Archived conversation ${conversationId}`);
    
    // Show a temporary archived message - in a real app you'd use a toast notification
    const archivedMessage = document.createElement('div');
    archivedMessage.className = 'pro-archived-message';
    archivedMessage.textContent = 'Conversation archived';
    document.body.appendChild(archivedMessage);
    
    setTimeout(() => {
      archivedMessage.classList.add('fade-out');
      setTimeout(() => document.body.removeChild(archivedMessage), 300);
    }, 2000);
  }, [pinnedConversations, unpinnedConversations]);
  
  // Handle muting/unmuting conversations
  const handleMuteConversation = useCallback((conversationId) => {
    if (mutedConversations.includes(conversationId)) {
      // Unmute
      setMutedConversations(mutedConversations.filter(id => id !== conversationId));
    } else {
      // Mute
      setMutedConversations([...mutedConversations, conversationId]);
    }
  }, [mutedConversations]);
  
  // Handle delete conversation
  const handleDeleteConversation = useCallback((conversationId) => {
    // Filter out the deleted conversation
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    
    // Update pinned and unpinned arrays
    setPinnedConversations(pinnedConversations.filter(conv => conv.id !== conversationId));
    setUnpinnedConversations(unpinnedConversations.filter(conv => conv.id !== conversationId));
    
    // Remove from other arrays if present
    if (mutedConversations.includes(conversationId)) {
      setMutedConversations(mutedConversations.filter(id => id !== conversationId));
    }
    
    if (favoriteConversations.includes(conversationId)) {
      setFavoriteConversations(favoriteConversations.filter(id => id !== conversationId));
    }
    
    // If the deleted conversation was the current one, select another conversation or show empty state
    if (currentConversation?.id === conversationId) {
      if (updatedConversations.length > 0) {
        onSelectConversation(updatedConversations[0]);
      } else {
        onSelectConversation(null);
      }
    }
    
    // In a real app, you would also make an API call to delete the conversation
  }, [conversations, pinnedConversations, unpinnedConversations, mutedConversations, favoriteConversations, currentConversation, onSelectConversation]);
  
  // Handle forward conversation
  const handleForwardConversation = useCallback((conversationId) => {
    // Implementation would depend on how forwarding works in your app
    console.log(`Forward conversation: ${conversationId}`);
    
    // In a real app, you would likely open a dialog to select recipients
    // and then make an API call to share the conversation
  }, []);
  
  // Handle favorite/unfavorite conversations
  const handleToggleFavorite = useCallback((conversationId) => {
    if (favoriteConversations.includes(conversationId)) {
      // Remove from favorites
      setFavoriteConversations(favoriteConversations.filter(id => id !== conversationId));
    } else {
      // Add to favorites
      setFavoriteConversations([...favoriteConversations, conversationId]);
    }
  }, [favoriteConversations]);
  
  // Handle changing conversation category
  const handleSetCategory = useCallback((conversationId, categoryId) => {
    setConversationCategories(prev => ({
      ...prev,
      [conversationId]: categoryId
    }));
  }, []);
  
  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenu.visible && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        closeContextMenu();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible, closeContextMenu]);

  // Close mobile sidebar on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isMobileView && typeof onRequestClose === 'function') {
        onRequestClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isMobileView, onRequestClose]);
  
  // Filter conversations based on search, filter, and categories
  const filterConversations = (convList) => {
    return convList.filter(conversation => {
      // Search filter - enhanced to include participant names
      let matchesSearch = conversation.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         conversation.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Also search in participant names
      if (!matchesSearch && searchQuery) {
        const query = searchQuery.toLowerCase();
        
        // Search in last message sender name
        if (conversation.lastMessage?.sender) {
          matchesSearch = conversation.lastMessage.sender.toLowerCase().includes(query);
        }
        
        // For group conversations, search in typing users
        if (!matchesSearch && conversation.typingUsers && Array.isArray(conversation.typingUsers)) {
          matchesSearch = conversation.typingUsers.some(user => 
            user.toLowerCase().includes(query)
          );
        }
        
        // For group conversations, we could also add a participants array if it exists
        if (!matchesSearch && conversation.participants && Array.isArray(conversation.participants)) {
          matchesSearch = conversation.participants.some(participant => 
            (typeof participant === 'string' ? participant : participant.name || '')
              .toLowerCase().includes(query)
          );
        }
        
        // For group conversations, we could also add a members array if it exists
        if (!matchesSearch && conversation.members && Array.isArray(conversation.members)) {
          matchesSearch = conversation.members.some(member => 
            (typeof member === 'string' ? member : member.name || '')
              .toLowerCase().includes(query)
          );
        }
      }
      
      // Category filter - only show conversations in visible categories
      const category = conversationCategories[conversation.id] || 'other';
      const categoryIsVisible = categories[category]?.visible !== false;
      
      // Type filter (unread, groups, direct)
      let matchesTypeFilter;
      switch (filter) {
        case 'unread':
          matchesTypeFilter = conversation.unread > 0;
          break;
        case 'groups':
          matchesTypeFilter = conversation.isGroup;
          break;
        case 'direct':
          matchesTypeFilter = !conversation.isGroup;
          break;
        case 'favorites':
          matchesTypeFilter = favoriteConversations.includes(conversation.id);
          break;
        default:
          matchesTypeFilter = true;
      }
      
      return matchesSearch && matchesTypeFilter && categoryIsVisible;
    });
  };
  
  // Sort conversations based on sort order
  const sortConversations = useCallback((convList) => {
    return [...convList].sort((a, b) => {
      // Always show favorites first
      const aIsFavorite = favoriteConversations.includes(a.id);
      const bIsFavorite = favoriteConversations.includes(b.id);
      
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      
      switch (sortOrder) {
        case 'unread':
          // Sort by unread count (highest first)
          return (b.unread || 0) - (a.unread || 0);
        case 'alphabetical':
          // Sort alphabetically by name
          return a.name.localeCompare(b.name);
        case 'recent':
        default:
          // Sort by most recent message (default)
          // This is a simplification - in a real app, you'd compare actual timestamps
          return b.id - a.id;
      }
    });
  }, [favoriteConversations, sortOrder]);
  
  // Get filtered conversations
  const filteredPinned = sortConversations(filterConversations(pinnedConversations));
  const filteredGroups = sortConversations(filterConversations(unpinnedConversations.filter(conv => conv.isGroup)));
  const filteredDirect = sortConversations(filterConversations(unpinnedConversations.filter(conv => !conv.isGroup)));

  // Render a conversation item
  const renderConversationItem = (conversation) => {
    const isActive = currentConversation?.id === conversation.id;
    const isPinned = pinnedConversations.some(conv => conv.id === conversation.id);
    const isFavorite = favoriteConversations.includes(conversation.id);
    const userStatus = userPresence && userPresence[`other-user-${conversation.id}`]?.status;
    // Typing indicators disabled - always set to false
    const showTyping = false; // Previously: isTyping[conversation.id]
    const isMuted = mutedConversations.includes(conversation.id);
    const category = conversationCategories[conversation.id] || 'other';
    const categoryColor = categories[category]?.color || '#8b5cf6';
    
    // Highlight search matches in name
    const highlightMatches = (text) => {
      if (!searchQuery) return text;
      const regex = new RegExp(`(${searchQuery})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    };
    
    // For drag and drop functionality
    const handleDragStart = (e) => {
      setDraggedConversation(conversation);
      e.dataTransfer.setData('text/plain', conversation.id);
      e.dataTransfer.effectAllowed = 'move';
    };
    
    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };
    
    const handleDrop = (e) => {
      e.preventDefault();
      if (!draggedConversation) return;
      
      // In a real app, you might update the order or category here
      console.log(`Dropped conversation ${draggedConversation.id} onto ${conversation.id}`);
      setDraggedConversation(null);
    };
    
    return (
      <div 
        key={conversation.id}
        className={`pro-conversation-item ${isActive ? 'active' : ''} ${isMuted ? 'muted' : ''} ${isFavorite ? 'favorite' : ''} pro-view-${listView}`}
        onClick={() => onSelectConversation(conversation)}
        onContextMenu={(e) => handleContextMenu(e, conversation.id)}
        draggable={true}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        tabIndex={0}
        role="button"
        aria-pressed={isActive}
        data-name={conversation.name}
        title={conversation.name}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectConversation(conversation);
            }
          }}
      >
        <div className="pro-category-indicator" style={{ backgroundColor: categoryColor }} title={categories[category]?.name}></div>
        <div className="pro-conversation-avatar">
          <img src={conversation.avatar} alt={conversation.name} />
          {conversation.isGroup ? (
            <div className="pro-group-indicator">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="10" height="10">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          ) : (
            showActivity && userStatus && (
              <span className={`pro-status-indicator ${userStatus}`} 
                title={`${conversation.name} is ${userStatus}`}></span>
            )
          )}
        </div>
        
        <div className="pro-conversation-details">
          <div className="pro-conversation-header">
            <h3 className="pro-conversation-name" 
                dangerouslySetInnerHTML={{ __html: highlightMatches(conversation.name) }}></h3>
            <div className="pro-conversation-indicators">
              {listView === 'detailed' && conversation.isGroup && conversation.participants && (
                <span className="pro-participant-count" title={`${conversation.participants.length} participants`}>
                  {conversation.participants.length}
                </span>
              )}
              {isFavorite && (
                <span className="pro-favorite-indicator" title="Favorite">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </span>
              )}
              <span className="pro-conversation-time">{conversation.lastMessage.time}</span>
            </div>
          </div>
          
          {/* Enhanced message preview section */}
          {showPreview && (
            <div className="pro-conversation-preview">
              {showTyping ? (
                <div className="pro-typing-indicator">
                  {listView === 'detailed' && conversation.typingUsers ? 
                    `${conversation.typingUsers.join(', ')} typing...` : 
                    'typing...'
                  }
                  <div className="pro-typing-dots">
                    <span className="pro-typing-dot"></span>
                    <span className="pro-typing-dot"></span>
                    <span className="pro-typing-dot"></span>
                  </div>
                </div>
              ) : (
                <p className="pro-conversation-message">
                  {conversation.isGroup && (
                    <span className="pro-message-sender" dangerouslySetInnerHTML={{ __html: highlightMatches(conversation.lastMessage.sender) + ': ' }}></span>
                  )}
                  <span dangerouslySetInnerHTML={{ __html: highlightMatches(conversation.lastMessage.text) }}></span>
                </p>
              )}
              
              {/* Enhanced badges section */}
              <div className="pro-conversation-badges">
                {showActivity && isMuted && (
                  <span className="pro-muted-indicator" title="Notifications muted">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5a2 2 0 0 1 2 2v5H9V7a2 2 0 0 1 2 0z"></path>
                      <path d="M6 9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9z"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  </span>
                )}
                {conversation.unread > 0 && (
                  <span className="pro-unread-badge">{conversation.unread}</span>
                )}
                {listView === 'detailed' && conversation.isGroup && (
                  <span className="pro-group-badge" title="Group conversation">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Detailed view additional info */}
          {listView === 'detailed' && (
            <div className="pro-conversation-meta">
              {conversation.isGroup && conversation.participants && (
                <div className="pro-participants-preview" title={conversation.participants.join(', ')}>
                  <span className="pro-participants-label">Participants:</span>
                  <span className="pro-participants-names">
                    {conversation.participants.slice(0, 3).map((participant, index) => (
                      <span key={index} className="pro-participant-name">
                        {participant}
                        {index < Math.min(2, conversation.participants.length - 1) ? ', ' : ''}
                      </span>
                    ))}
                    {conversation.participants.length > 3 && (
                      <span className="pro-participants-more">
                        +{conversation.participants.length - 3} more
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="pro-conversation-actions">
          <button 
            type="button"
            className={`pro-pin-button ${isPinned ? 'pinned' : ''}`}
            onClick={(e) => handlePinConversation(e, conversation)}
            aria-label={isPinned ? "Unpin conversation" : "Pin conversation"}
            title={isPinned ? "Unpin conversation" : "Pin conversation"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </button>
          <button 
            type="button"
            className="pro-options-button"
            onClick={(e) => handleContextMenu(e, conversation.id)}
            aria-label="More options"
            title="More options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`pro-sidebar pro-sidebar-root ${collapsed ? 'collapsed' : ''} ${className}`} ref={sidebarRef}>
      <div className="pro-sidebar-header">
        <h1 className="pro-sidebar-title">QuibiChat</h1>
        {isMobileView && (
          <button type="button" className="pro-mobile-close" onClick={() => typeof onRequestClose === 'function' ? onRequestClose() : null} aria-label="Close sidebar">
            ✕
          </button>
        )}
        
        <div className="pro-sidebar-actions">
          <button 
            type="button"
            className="pro-theme-toggle" 
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
          
          <button 
            type="button"
            className="pro-sidebar-toggle" 
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="13 17 18 12 13 7"></polyline>
                <polyline points="6 17 11 12 6 7"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {!collapsed && (
        <React.Fragment>
          <div className="pro-sidebar-search-container">
            <div className="pro-sidebar-search">
              <span className="pro-search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              ref={searchInputRef}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pro-search-input"
              aria-label="Search conversations"
              onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); searchInputRef.current?.blur(); } }}
            />
            <div className="pro-search-actions">
              {searchQuery && (
                  <button 
                    type="button"
                    className="pro-search-clear"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
              <button 
                type="button"
                className="pro-search-filter"
                onClick={() => setShowSearchFilters(prev => !prev)} 
                aria-label="Search filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
              </button>
            </div>
            {/* Announce number of results for screen readers */}
            <div className="pro-search-result-count" aria-live="polite" style={{ position: 'absolute', left: -9999 }}>
              {(() => {
                const total = filteredPinned.length + filteredGroups.length + filteredDirect.length;
                return `${total} conversations`; })()
              }
            </div>
          </div>
          
          {showSearchFilters && (
            <div className="pro-search-filters-panel">
              <div className="pro-search-options">
                <div className="pro-search-option">
                  <input type="checkbox" id="search-in-messages" />
                  <label htmlFor="search-in-messages">Search in messages</label>
                </div>
                <div className="pro-search-option">
                  <input type="checkbox" id="search-case-sensitive" />
                  <label htmlFor="search-case-sensitive">Case sensitive</label>
                </div>
                <div className="pro-search-date-filter">
                  <label htmlFor="search-date-range">Date range:</label>
                  <select id="search-date-range">
                    <option value="any">Any time</option>
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                    <option value="custom">Custom range</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          </div>
          
          <div className="pro-sidebar-filters">
            <button 
              type="button"
              className={`pro-filter-button ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8v8M8 12h8"></path>
              </svg>
              All
            </button>
            <button 
              type="button"
              className={`pro-filter-button ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 12h8"></path>
              </svg>
              Unread
              {unreadCount > 0 && <span className="pro-filter-badge">{unreadCount}</span>}
            </button>
            <button 
              type="button"
              className={`pro-filter-button ${filter === 'favorites' ? 'active' : ''}`}
              onClick={() => setFilter('favorites')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              Favorites
              {favoriteConversations.length > 0 && <span className="pro-filter-badge">{favoriteConversations.length}</span>}
            </button>
            <button 
              type="button"
              className={`pro-filter-button ${filter === 'groups' ? 'active' : ''}`}
              onClick={() => setFilter('groups')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Groups
            </button>
            <button 
              type="button"
              className={`pro-filter-button ${filter === 'direct' ? 'active' : ''}`}
              onClick={() => setFilter('direct')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Direct
            </button>
            <button 
              type="button"
              className="pro-category-management-button"
              onClick={() => setShowCategoriesPanel(true)}
              title="Manage categories"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
          
          {/* Enhanced Conversation List Toolbar */}
          <div className="pro-conversation-toolbar">
            <div className="pro-conversation-stats">
              <span className="pro-stat">
                <span className="pro-stat-label">Total:</span>
                <span className="pro-stat-value">{conversationStats.totalConversations}</span>
              </span>
              {conversationStats.unreadCount > 0 && (
                <span className="pro-stat pro-stat-unread">
                  <span className="pro-stat-label">Unread:</span>
                  <span className="pro-stat-value">{conversationStats.unreadCount}</span>
                </span>
              )}
              <span className="pro-stat">
                <span className="pro-stat-label">Groups:</span>
                <span className="pro-stat-value">{conversationStats.groupsCount}</span>
              </span>
              <span className="pro-stat">
                <span className="pro-stat-label">Direct:</span>
                <span className="pro-stat-value">{conversationStats.directCount}</span>
              </span>
            </div>
            
            <div className="pro-conversation-view-controls">
              {/* View Mode Toggle */}
              <div className="pro-view-mode-buttons">
                <button 
                  type="button"
                  className={`pro-view-btn ${listView === 'compact' ? 'active' : ''}`}
                  onClick={() => handleViewChange('compact')}
                  title="Compact view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                </button>
                <button 
                  type="button"
                  className={`pro-view-btn ${listView === 'detailed' ? 'active' : ''}`}
                  onClick={() => handleViewChange('detailed')}
                  title="Detailed view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="4"></rect>
                    <rect x="3" y="11" width="18" height="4"></rect>
                    <rect x="3" y="19" width="18" height="2"></rect>
                  </svg>
                </button>
              </div>
              
              {/* Display Options */}
              <div className="pro-display-options">
                <button 
                  type="button"
                  className={`pro-option-btn ${showActivity ? 'active' : ''}`}
                  onClick={toggleShowActivity}
                  title={showActivity ? "Hide activity indicators" : "Show activity indicators"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="2"></circle>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                  </svg>
                </button>
                <button 
                  type="button"
                  className={`pro-option-btn ${showPreview ? 'active' : ''}`}
                  onClick={toggleShowPreview}
                  title={showPreview ? "Hide message previews" : "Show message previews"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <button 
                  type="button"
                  className={`pro-option-btn ${autoScroll ? 'active' : ''}`}
                  onClick={() => setAutoScroll(!autoScroll)}
                  title={autoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Category filters */}
          <div className="pro-category-filters">
            {Object.entries(categories).map(([key, category]) => (
              category.visible && (
                <button 
                  type="button"
                  key={key}
                  className={`pro-category-filter ${selectedCategory === key ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                  style={{
                    backgroundColor: selectedCategory === key ? `${category.color}20` : 'transparent',
                    borderColor: selectedCategory === key ? `${category.color}60` : 'transparent',
                    color: selectedCategory === key ? category.color : 'inherit'
                  }}
                >
                  <span 
                    className="pro-category-color" 
                    style={{ backgroundColor: category.color }}
                  ></span>
                  {category.name}
                </button>
              )
            ))}
          </div>
          
          {/* Categories Management Panel */}
          {showCategoriesPanel && (
            <div className="pro-categories-panel">
              <div className="pro-categories-panel-header">
                <h3>Manage Categories</h3>
                <button 
                  type="button"
                  className="pro-categories-panel-close" 
                  onClick={() => setShowCategoriesPanel(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="pro-categories-list">
                {Object.entries(categories).map(([key, category]) => (
                  <div key={key} className="pro-category-item">
                    <div className="pro-category-item-color" style={{ backgroundColor: category.color }}></div>
                    <input 
                      type="text" 
                      value={category.name} 
                      onChange={(e) => updateCategoryName(key, e.target.value)}
                      className="pro-category-item-name"
                    />
                    <div className="pro-category-item-actions">
                      <button 
                        type="button"
                        className="pro-category-visibility" 
                        onClick={() => toggleCategoryVisibility(key)}
                        title={category.visible ? "Hide category" : "Show category"}
                      >
                        {category.visible ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        )}
                      </button>
                      <button 
                        type="button"
                        className="pro-category-delete" 
                        onClick={() => deleteCategory(key)}
                        title="Delete category"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" className="pro-add-category" onClick={addCategory}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                  Add Category
                </button>
              </div>
            </div>
          )}
          
          <div className="pro-conversations-list">
            {/* Pinned conversations */}
            {filteredPinned.length > 0 && (
              <div className="pro-conversation-folder">
                <div 
                  className="pro-folder-header" 
                  onClick={() => setPinnedExpanded(!pinnedExpanded)}
                >
                  <h2 className="pro-folder-title">Pinned</h2>
                  <span className={`pro-folder-toggle ${pinnedExpanded ? 'open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
                </div>
                
                {pinnedExpanded && filteredPinned.map(conversation => renderConversationItem(conversation))}
              </div>
            )}
            
            {/* Group conversations */}
            {filteredGroups.length > 0 && (
              <div className="pro-conversation-folder">
                <div 
                  className="pro-folder-header" 
                  onClick={() => setGroupsExpanded(!groupsExpanded)}
                >
                  <h2 className="pro-folder-title">Groups</h2>
                  <span className={`pro-folder-toggle ${groupsExpanded ? 'open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
                </div>
                
                {groupsExpanded && filteredGroups.map(conversation => renderConversationItem(conversation))}
              </div>
            )}
            
            {/* Direct conversations */}
            {filteredDirect.length > 0 && (
              <div className="pro-conversation-folder">
                <div 
                  className="pro-folder-header" 
                  onClick={() => setDirectExpanded(!directExpanded)}
                >
                  <h2 className="pro-folder-title">Direct Messages</h2>
                  <span className={`pro-folder-toggle ${directExpanded ? 'open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
                </div>
                
                {directExpanded && filteredDirect.map(conversation => renderConversationItem(conversation))}
              </div>
            )}
            
            {/* No results */}
            {filteredPinned.length === 0 && filteredGroups.length === 0 && filteredDirect.length === 0 && (
              <div className="pro-no-results">
                <p>No conversations found</p>
              </div>
            )}
          </div>
          
          <div className="pro-sidebar-footer">
            <button type="button" className="pro-new-chat-button" onClick={() => typeof onNewChat === 'function' ? onNewChat() : null}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>New Chat</span>
            </button>
          </div>
          
          <div className="pro-sidebar-menu">
            <div className="pro-sidebar-menu-item" title="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <div className="pro-sidebar-menu-item" title="Archived Chats">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="21 8 21 21 3 21 3 8"></polyline>
                <rect x="1" y="3" width="22" height="5"></rect>
                <line x1="10" y1="12" x2="14" y2="12"></line>
              </svg>
            </div>
            <div className="pro-sidebar-menu-item" title="Profile">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
        </React.Fragment>
      )}
      {/* Collapsed state menu */}
      {collapsed && (
        <div className="pro-sidebar-footer">
          <button type="button" className="pro-new-chat-button" title="New Chat" onClick={() => typeof onNewChat === 'function' ? onNewChat() : null}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu.visible && (
        <ProContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          conversationId={contextMenu.conversationId}
          onClose={closeContextMenu}
          onPin={handlePinConversation}
          onArchive={handleArchiveConversation}
          onMarkAsRead={handleMarkAsRead}
          onMute={handleMuteConversation}
          onDelete={handleDeleteConversation}
          onForward={handleForwardConversation}
          onCategoryChange={handleSetCategory}
          isPinned={pinnedConversations.some(conv => conv.id === contextMenu.conversationId)}
          isUnread={conversations.find(conv => conv.id === contextMenu.conversationId)?.unread > 0}
          isMuted={mutedConversations.includes(contextMenu.conversationId)}
        />
      )}
      
      {/* User profile component */}
      <ProUserProfile 
        user={user}
        collapsed={collapsed}
        darkMode={darkMode}
        onLogout={onLogout}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
};

export default ProSidebar;
