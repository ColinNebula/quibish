import React, { useState, useCallback, useMemo } from 'react';
import UserProfileModal from '../UserProfile';
import VideoCall from './VideoCall';
import PropTypes from 'prop-types';

// CSS imports
import './ProLayout.css';
import './ProMessages.css';
import './ProSidebar.css';
import './ProHeader.css';
import './ProChat.css';
import './ResponsiveFix.css';

const ProChat = ({ 
  user = { id: 'user1', name: 'Current User', avatar: null },
  conversations = [],
  currentConversation = null,
  onLogout = () => {},
  darkMode = false,
  onToggleDarkMode = () => {}
}) => {
  // Basic state
  const [isConnected] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleConversationSelect = useCallback((conversationId) => {
    setSelectedConversation(conversationId);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  const handleNewChat = useCallback(() => {
    // TODO: Implement new chat functionality
    console.log('New chat clicked');
  }, []);

  const handleCreateGroup = useCallback(() => {
    // TODO: Implement create group functionality
    console.log('Create group clicked');
  }, []);

  const handleQuickSettings = useCallback(() => {
    // TODO: Implement quick settings
    console.log('Quick settings clicked');
  }, []);

  // Filter conversations based on search and active filter
  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    
    // Apply text search
    if (searchQuery.trim()) {
      filtered = filtered.filter(conv => 
        conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply filter
    switch (activeFilter) {
      case 'unread':
        filtered = filtered.filter(conv => conv.unreadCount > 0);
        break;
      case 'groups':
        filtered = filtered.filter(conv => conv.name.includes('Team') || conv.name.includes('Group'));
        break;
      default:
        // 'all' - no additional filtering
        break;
    }
    
    return filtered;
  }, [conversations, searchQuery, activeFilter]);

  const getFilterCounts = useMemo(() => ({
    all: conversations.length,
    unread: conversations.filter(conv => conv.unreadCount > 0).length,
    groups: conversations.filter(conv => conv.name.includes('Team') || conv.name.includes('Group')).length
  }), [conversations]);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }, [conversations]);

  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      text: "Hey! 👋",
      user: { id: 'user1', name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 300000).toISOString(),
      reactions: []
    },
    {
      id: 2,
      text: "Welcome to the enhanced chat application! This is a medium-length message to demonstrate how the message cards scale based on content length.",
      user: { id: 'system', name: 'System', avatar: null },
      timestamp: new Date(Date.now() - 240000).toISOString(),
      reactions: []
    },
    {
      id: 3,
      text: "This is a much longer message that demonstrates how the chat interface adapts to longer content. When users write extensive messages with detailed explanations, multiple sentences, and comprehensive information, the message cards automatically expand to accommodate the content while maintaining readability and visual hierarchy. The system intelligently adjusts padding, background styling, and maximum width to ensure optimal presentation regardless of message length.",
      user: { id: 'user2', name: 'Bob Wilson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 180000).toISOString(),
      reactions: []
    },
    {
      id: 4,
      text: "Perfect! 🎉",
      user: { id: 'user1', name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 120000).toISOString(),
      reactions: []
    },
    {
      id: 5,
      text: "This is an extremely long message that serves as an example of how the chat interface handles very extensive content. In real-world applications, users often need to share detailed information, comprehensive explanations, lengthy instructions, or elaborate discussions that span multiple paragraphs. The dynamic scaling system ensures that such messages are presented in an optimal format with appropriate styling, enhanced readability features, distinctive visual treatment, and proper spacing that maintains the overall chat flow while giving long-form content the space and attention it deserves. The system automatically detects content length and applies the most suitable styling approach to ensure excellent user experience across all message types and lengths.",
      user: { id: 'user3', name: 'Charlie Brown', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face' },
      timestamp: new Date(Date.now() - 60000).toISOString(),
      reactions: []
    }
  ]);

  const [inputText, setInputText] = useState('');

  // Enhanced features state
  const [profileModal, setProfileModal] = useState({ open: false, userId: null, username: null });
  const [videoCallState, setVideoCallState] = useState({ 
    active: false, 
    withUser: null, 
    minimized: false, 
    audioOnly: false 
  });

  // Message input handlers
  const handleSendMessage = useCallback(() => {
    if (!inputText.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      text: inputText,
      user: user,
      timestamp: new Date().toISOString(),
      reactions: []
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setInputText('');
  }, [inputText, user]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Modal handlers
  const handleViewUserProfile = useCallback((userId, username) => {
    setProfileModal({ open: true, userId, username });
  }, []);

  const handleCloseProfileModal = useCallback(() => {
    setProfileModal({ open: false, userId: null, username: null });
  }, []);

  // Video call handlers
  const handleEndCall = useCallback(() => {
    setVideoCallState(prev => ({ ...prev, active: false }));
  }, []);

  const handleToggleMinimize = useCallback(() => {
    setVideoCallState(prev => ({ ...prev, minimized: !prev.minimized }));
  }, []);

  // Video call component
  const MemoizedVideoCall = useMemo(() => (
    <VideoCall 
      callState={videoCallState}
      onEndCall={handleEndCall}
      onToggleMinimize={handleToggleMinimize}
    />
  ), [videoCallState, handleEndCall, handleToggleMinimize]);

  // Function to determine message length category for dynamic styling
  const getMessageLengthCategory = (text) => {
    const length = text.length;
    if (length <= 50) return 'short';
    if (length <= 200) return 'medium';
    if (length <= 500) return 'long';
    return 'very-long';
  };

  return (
    <div className="pro-layout">
      {/* Video Call Component */}
      {MemoizedVideoCall}
      
      {/* Enhanced Sidebar */}
      <div className={`pro-sidebar enhanced-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="pro-sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              💬
              {totalUnreadCount > 0 && (
                <div className="logo-unread-badge">{totalUnreadCount > 99 ? '99+' : totalUnreadCount}</div>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="logo-text">
                <h2>Quibish</h2>
                <span className="version">v2.0</span>
              </div>
            )}
          </div>
          <button onClick={toggleSidebar} className="sidebar-toggle-btn" title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? '⮞' : '⮜'}
          </button>
        </div>

        {/* User Profile Section */}
        <div className="sidebar-user-profile">
          <div className="user-avatar">
            <img 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=4f46e5&color=fff&size=40`}
              alt={user?.name || 'User'}
            />
            <div className="status-indicator online"></div>
          </div>
          {!sidebarCollapsed && (
            <div className="user-info">
              <h3 className="user-name">{user?.name || 'User'}</h3>
              <p className="user-status">Online</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="user-actions">
              <button className="action-btn" title="Settings">⚙️</button>
              <button className="action-btn" title="Profile">👤</button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {!sidebarCollapsed && (
          <div className="sidebar-quick-actions">
            <button className="quick-action-btn primary" onClick={handleNewChat}>
              <span className="icon">➕</span>
              <span className="text">New Chat</span>
            </button>
            <button className="quick-action-btn secondary" onClick={handleCreateGroup}>
              <span className="icon">👥</span>
              <span className="text">Create Group</span>
            </button>
          </div>
        )}

        {/* Search Bar */}
        {!sidebarCollapsed && (
          <div className="sidebar-search">
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search conversations..."
                className="search-input"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        {!sidebarCollapsed && (
          <div className="sidebar-filters">
            <button 
              className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              <span className="tab-text">All</span>
              <span className="tab-count">{getFilterCounts.all}</span>
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'unread' ? 'active' : ''}`}
              onClick={() => handleFilterChange('unread')}
            >
              <span className="tab-text">Unread</span>
              <span className="tab-count">{getFilterCounts.unread}</span>
            </button>
            <button 
              className={`filter-tab ${activeFilter === 'groups' ? 'active' : ''}`}
              onClick={() => handleFilterChange('groups')}
            >
              <span className="tab-text">Groups</span>
              <span className="tab-count">{getFilterCounts.groups}</span>
            </button>
          </div>
        )}

        {/* Conversations List */}
        <div className="pro-sidebar-content">
          <div className="conversations-header">
            {!sidebarCollapsed && <h4>Recent Conversations</h4>}
          </div>
          <div className="conversations-list">
            {filteredConversations.map(conv => (
              <div 
                key={conv.id} 
                className={`conversation-item enhanced ${selectedConversation === conv.id ? 'active' : ''}`}
                onClick={() => handleConversationSelect(conv.id)}
              >
                <div className="conversation-avatar">
                  <img 
                    src={conv.avatar || `https://ui-avatars.com/api/?name=${conv.name}&background=random&size=40`}
                    alt={conv.name}
                  />
                  {conv.isOnline && <div className="online-dot"></div>}
                  {conv.unreadCount > 0 && <div className="unread-badge">{conv.unreadCount}</div>}
                </div>
                {!sidebarCollapsed && (
                  <div className="conversation-details">
                    <div className="conversation-header">
                      <h5 className="conversation-name">{conv.name}</h5>
                      <span className="conversation-time">{conv.lastMessageTime || '2m'}</span>
                    </div>
                    <div className="conversation-preview">
                      <p className="last-message">{conv.lastMessage || 'Hey there! How are you doing?'}</p>
                      <div className="conversation-meta">
                        {conv.isPinned && <span className="pin-icon">📌</span>}
                        {conv.isMuted && <span className="mute-icon">🔇</span>}
                        {conv.messageStatus && <span className={`message-status ${conv.messageStatus}`}>✓</span>}
                      </div>
                    </div>
                  </div>
                )}
                {sidebarCollapsed && conv.unreadCount > 0 && (
                  <div className="collapsed-unread-indicator"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {!sidebarCollapsed && (
            <div className="footer-stats">
              <div className="stat-item">
                <span className="stat-label">Active</span>
                <span className="stat-value">12</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total</span>
                <span className="stat-value">156</span>
              </div>
            </div>
          )}
          <div className="footer-actions">
            <button className="footer-btn" title="Help" onClick={() => console.log('Help clicked')}>❓</button>
            {!sidebarCollapsed && <button className="footer-btn" title="Feedback" onClick={() => console.log('Feedback clicked')}>💬</button>}
            <button className="footer-btn" title="Settings" onClick={handleQuickSettings}>⚙️</button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`pro-main ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Enhanced Header */}
        <div className="pro-header enhanced-chat-header">
          <div className="header-left">
            <div className="conversation-avatar">
              <img 
                src={currentConversation?.avatar || `https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=40&h=40&fit=crop&crop=face`}
                alt={currentConversation?.name || 'Chat'}
              />
              <div className={`online-indicator ${isConnected ? 'online' : 'offline'}`}></div>
            </div>
            <div className="conversation-info">
              <h3 className="conversation-title">{currentConversation?.name || 'General Chat'}</h3>
              <div className="conversation-status">
                <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                  {isConnected ? '● Online' : '● Disconnected'}
                </span>
                <span className="participant-count">
                  {currentConversation?.participants || 5} participants
                </span>
              </div>
            </div>
          </div>
          
          <div className="header-center">
            <div className="header-search">
              <input 
                type="text" 
                placeholder="Search messages..." 
                className="search-input"
              />
              <button className="search-btn">🔍</button>
            </div>
          </div>
          
          <div className="header-actions">
            <button className="action-btn video-call-btn" title="Start video call">
              📹
            </button>
            <button className="action-btn voice-call-btn" title="Start voice call">
              📞
            </button>
            <button className="action-btn info-btn" title="Chat info">
              ℹ️
            </button>
            <button onClick={onToggleDarkMode} className="action-btn theme-toggle" title="Toggle theme">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="header-menu">
              <button className="action-btn menu-btn" title="More options">
                ⋮
              </button>
              <div className="dropdown-menu">
                <button className="dropdown-item">Settings</button>
                <button className="dropdown-item">Export Chat</button>
                <button className="dropdown-item">Mute Notifications</button>
                <hr className="dropdown-divider" />
                <button onClick={onLogout} className="dropdown-item logout-item">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="pro-message-list">
          {chatMessages.map(message => (
            <div key={message.id} className="pro-message-blurb" data-message-id={message.id}>
              <div className="message-avatar">
                <img 
                  src={message.user.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face`}
                  alt={message.user.name}
                  onClick={() => handleViewUserProfile(message.user.id, message.user.name)}
                />
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="user-name">{message.user.name}</span>
                  <span className="timestamp">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div 
                  className="message-text" 
                  data-length={getMessageLengthCategory(message.text)}
                >
                  {message.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="pro-chat-input-container">
          <div className="input-wrapper">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="message-input"
              rows="1"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="send-button"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {profileModal.open && (
        <UserProfileModal 
          userId={profileModal.userId}
          username={profileModal.username}
          onClose={handleCloseProfileModal}
        />
      )}
    </div>
  );
};

// PropTypes
ProChat.propTypes = {
  user: PropTypes.object,
  conversations: PropTypes.array,
  currentConversation: PropTypes.object,
  onLogout: PropTypes.func,
  darkMode: PropTypes.bool,
  onToggleDarkMode: PropTypes.func
};

export default ProChat;