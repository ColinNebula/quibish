// Enhanced Home Component - Elegant and Professional
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Import custom hooks and utilities
import {
  useConnectionStatus,
  useLocalStorage,
  useAutoScroll,
  useResponsive,
  useTheme,
  useKeyboardShortcuts
} from './hooks';

import {
  createMessage,
  formatTime,
  searchMessages,
  filterMessagesByCategory,
  validateMessage,
  validateFile,
  copyToClipboard,
  groupMessagesByDate,
  getInitials,
  generateAvatarColor
} from './utils';

import {
  APP_CONFIG,
  DEMO_MESSAGES,
  DEMO_STATUS_UPDATES,
  DEMO_PHOTOS,
  MESSAGE_CATEGORIES,
  EMOJI_LIST,
  MESSAGE_TYPES,
  STORAGE_KEYS
} from './constants';

// Core components
import ProChat from './ProChat';

// Consolidated CSS imports
import './Home.css';
import '../../styles/ProfessionalTheme.css';

const HomeComponent = ({ user, onLogout }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Core UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(STORAGE_KEYS.SIDEBAR_STATE, false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [statusUpdates, setStatusUpdates] = useState(DEMO_STATUS_UPDATES);
  const [photos, setPhotos] = useState(DEMO_PHOTOS);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modal states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  
  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // ============================================================================
  // CUSTOM HOOKS
  // ============================================================================
  
  const { connectionStatus, connectionText } = useConnectionStatus();
  const { isMobile, isTablet } = useResponsive();
  const { theme, toggleTheme } = useTheme();
  const { scrollRef, scrollToBottom } = useAutoScroll(messages.length);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const filteredMessages = useMemo(() => {
    let filtered = messages;
    
    // Apply category filter
    filtered = filterMessagesByCategory(filtered, selectedCategory);
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = searchMessages(filtered, searchQuery);
    }
    
    return filtered;
  }, [messages, selectedCategory, searchQuery]);
  
  const messageGroups = useMemo(() => {
    return groupMessagesByDate(filteredMessages);
  }, [filteredMessages]);
  
  const userInitials = useMemo(() => {
    return getInitials(user?.name || 'User');
  }, [user?.name]);
  
  const userAvatarColor = useMemo(() => {
    return generateAvatarColor(user?.name || 'User');
  }, [user?.name]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleSendMessage = useCallback((messageText = currentMessage) => {
    const validation = validateMessage(messageText);
    if (!validation.isValid) {
      console.warn('Invalid message:', validation.error);
      return;
    }
    
    const newMessage = createMessage({
      text: messageText,
      sender: user?.name || 'You',
      replyTo: replyToMessage
    });
    
    setMessages(prev => [...prev, newMessage]);
    setCurrentMessage('');
    setReplyToMessage(null);
    
    // Simulate message status updates
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id 
          ? { ...msg, status: 'delivered' }
          : msg
      ));
    }, 1000);
  }, [currentMessage, user?.name, replyToMessage]);
  
  const handleFileUpload = useCallback(async (file) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      console.warn('Invalid file:', validation.error);
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const newMessage = createMessage({
          text: `Shared ${file.name}`,
          sender: user?.name || 'You',
          type: MESSAGE_TYPES.IMAGE,
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            url: e.target.result
          }
        });
        
        setMessages(prev => [...prev, newMessage]);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [user?.name]);
  
  const handleEmojiSelect = useCallback((emoji) => {
    setCurrentMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);
  
  const handleStatusCreate = useCallback((statusText) => {
    const newStatus = {
      id: Date.now(),
      user: user?.name || 'You',
      initials: userInitials,
      content: statusText,
      timestamp: new Date().toISOString(),
      seen: false
    };
    
    setStatusUpdates(prev => [newStatus, ...prev]);
    setShowStatusModal(false);
  }, [user?.name, userInitials]);
  
  const handleReply = useCallback((message) => {
    setReplyToMessage(message);
  }, []);
  
  const handleCopyMessage = useCallback(async (message) => {
    const result = await copyToClipboard(message.text);
    if (result.success) {
      // Could show a toast notification here
      console.log('Message copied to clipboard');
    }
  }, []);
  
  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  
  useKeyboardShortcuts({
    'ctrl+enter': () => handleSendMessage(),
    'cmd+enter': () => handleSendMessage(),
    'ctrl+k': () => setSearchQuery(''),
    'cmd+k': () => setSearchQuery(''),
    'ctrl+/': () => setSidebarCollapsed(prev => !prev),
    'cmd+/': () => setSidebarCollapsed(prev => !prev),
    'ctrl+d': () => toggleTheme(),
    'cmd+d': () => toggleTheme()
  });
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages.length, scrollToBottom]);
  
  useEffect(() => {
    // Auto-focus message input on desktop
    if (!isMobile) {
      const input = document.querySelector('.message-input');
      if (input) {
        input.focus();
      }
    }
  }, [isMobile]);
  
  // ============================================================================
  // COMPONENT STRUCTURE
  // ============================================================================
  
  return (
    <div className={`mobile-app-container ${theme}-theme`}>
      {/* Header */}
      <AppHeader
        user={user}
        userInitials={userInitials}
        userAvatarColor={userAvatarColor}
        connectionStatus={connectionStatus}
        connectionText={connectionText}
        onLogout={onLogout}
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
        isMobile={isMobile}
      />
      
      <div className="app-body">
        {/* Sidebar */}
        {!isMobile && (
          <AppSidebar
            collapsed={sidebarCollapsed}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={MESSAGE_CATEGORIES}
            statusUpdates={statusUpdates}
            onCreateStatus={() => setShowStatusModal(true)}
          />
        )}
        
        {/* Main Chat Area */}
        <div className="chat-main">
          {/* Status Updates Bar */}
          <StatusBar
            statusUpdates={statusUpdates}
            onCreateStatus={() => setShowStatusModal(true)}
            isMobile={isMobile}
          />
          
          {/* Messages Area */}
          <div className="messages-container" ref={scrollRef}>
            {filteredMessages.length === 0 ? (
              <EmptyState
                category={selectedCategory}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
                onResetFilters={() => setSelectedCategory('all')}
              />
            ) : (
              <MessageList
                messageGroups={messageGroups}
                onReply={handleReply}
                onCopy={handleCopyMessage}
                searchQuery={searchQuery}
              />
            )}
          </div>
          
          {/* Input Area */}
          <InputArea
            currentMessage={currentMessage}
            onMessageChange={setCurrentMessage}
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileUpload}
            onEmojiToggle={() => setShowEmojiPicker(prev => !prev)}
            replyToMessage={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            isMobile={isMobile}
          />
        </div>
      </div>
      
      {/* Modals */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
          emojis={EMOJI_LIST}
        />
      )}
      
      {showStatusModal && (
        <StatusModal
          onSubmit={handleStatusCreate}
          onClose={() => setShowStatusModal(false)}
        />
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const AppHeader = ({ 
  user, 
  userInitials, 
  userAvatarColor, 
  connectionStatus, 
  connectionText, 
  onLogout, 
  onToggleTheme,
  onToggleSidebar,
  isMobile 
}) => (
  <header className="app-header">
    <div className="header-left">
      {!isMobile && (
        <button 
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
        >
          ☰
        </button>
      )}
      <div className="app-title">
        {APP_CONFIG.TITLE}
        <div className={`connection-status ${connectionStatus}`}>
          <span className="connection-indicator"></span>
          <span className="connection-text">{connectionText}</span>
        </div>
      </div>
    </div>
    
    <div className="header-right">
      <button 
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label="Toggle Theme"
      >
        🌓
      </button>
      
      <div className="user-profile">
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="user-avatar" />
        ) : (
          <div 
            className="user-avatar-placeholder"
            style={{ backgroundColor: userAvatarColor }}
          >
            {userInitials}
          </div>
        )}
        <span className="welcome-message">Hi, {user?.name}!</span>
      </div>
      
      <button 
        className="logout-button"
        onClick={onLogout}
      >
        Logout
      </button>
    </div>
  </header>
);

const AppSidebar = ({ 
  collapsed, 
  searchQuery, 
  onSearchChange, 
  selectedCategory, 
  onCategoryChange, 
  categories,
  statusUpdates,
  onCreateStatus 
}) => (
  <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
    {!collapsed && (
      <>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => onSearchChange('')}
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="category-filters">
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => onCategoryChange(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-label">{category.label}</span>
            </button>
          ))}
        </div>
        
        <div className="recent-contacts">
          <h3>Recent</h3>
          {/* Recent contacts would go here */}
        </div>
      </>
    )}
  </aside>
);

const StatusBar = ({ statusUpdates, onCreateStatus, isMobile }) => (
  <div className="status-updates-bar">
    <div className="status-create" onClick={onCreateStatus}>
      <div className="status-create-icon">+</div>
      {!isMobile && <span className="status-label">Your Status</span>}
    </div>
    
    {statusUpdates.slice(0, 5).map(status => (
      <div key={status.id} className={`status-circle ${status.seen ? 'seen' : ''}`}>
        <div className="status-sender">{status.initials}</div>
        {!isMobile && <span className="status-label">{status.user}</span>}
      </div>
    ))}
  </div>
);

const MessageList = ({ messageGroups, onReply, onCopy, searchQuery }) => (
  <div className="messages-list">
    {Object.entries(messageGroups).map(([date, messages]) => (
      <div key={date} className="message-group">
        <div className="message-group-header">{date}</div>
        <div className="message-group-content">
          {messages.map(message => (
            <MessageItem
              key={message.id}
              message={message}
              onReply={onReply}
              onCopy={onCopy}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

const MessageItem = ({ message, onReply, onCopy, searchQuery }) => {
  const isOwn = message.sender === 'You' || message.isOwn;
  
  return (
    <div className={`message ${isOwn ? 'me' : ''} ${message.type === 'system' ? 'system' : ''}`}>
      {!isOwn && message.type !== 'system' && (
        <div className="message-sender">{message.sender}</div>
      )}
      
      <div className="message-content">
        {message.type === MESSAGE_TYPES.IMAGE && message.file ? (
          <div className="photo-message-container">
            <img 
              src={message.file.url} 
              alt={message.file.name}
              className="uploaded-photo"
            />
            {message.text && <div className="photo-caption">{message.text}</div>}
          </div>
        ) : (
          <div className="message-text">{message.text}</div>
        )}
        
        {message.reactions && message.reactions.length > 0 && (
          <div className="message-reactions">
            {message.reactions.map((reaction, index) => (
              <span key={index} className="reaction">
                {reaction.emoji} {reaction.count}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="message-meta">
        <span className="timestamp">{formatTime(message.timestamp)}</span>
        {isOwn && (
          <span className={`message-status ${message.status}`}>
            {message.status}
          </span>
        )}
      </div>
      
      <div className="message-actions">
        <button 
          className="action-btn reply-btn"
          onClick={() => onReply(message)}
          title="Reply"
        >
          ↩️
        </button>
        <button 
          className="action-btn copy-btn"
          onClick={() => onCopy(message)}
          title="Copy"
        >
          📋
        </button>
      </div>
    </div>
  );
};

const InputArea = ({ 
  currentMessage, 
  onMessageChange, 
  onSendMessage, 
  onFileUpload,
  onEmojiToggle,
  replyToMessage,
  onCancelReply,
  isUploading,
  uploadProgress,
  isMobile 
}) => {
  const fileInputRef = useRef(null);
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileUpload(file);
    }
  };
  
  return (
    <div className="input-area">
      {replyToMessage && (
        <div className="reply-bar">
          <div className="reply-info">
            <div className="reply-header">
              <span className="reply-to-label">Replying to</span>
              <span className="reply-sender">{replyToMessage.sender}</span>
            </div>
            <div className="reply-content">{replyToMessage.text}</div>
          </div>
          <button className="cancel-reply" onClick={onCancelReply}>✕</button>
        </div>
      )}
      
      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span>Uploading... {uploadProgress}%</span>
        </div>
      )}
      
      <div className="input-bar">
        <div className="input-wrapper">
          <textarea
            className="message-input"
            value={currentMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            disabled={isUploading}
          />
          <button 
            className="emoji-button"
            onClick={onEmojiToggle}
            type="button"
          >
            😊
          </button>
        </div>
        
        <div className="action-buttons">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button 
            className="photo-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            📷
          </button>
          
          <button 
            className="send-button"
            onClick={() => onSendMessage()}
            disabled={!currentMessage.trim() || isUploading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ category, searchQuery, onClearSearch, onResetFilters }) => (
  <div className="empty-state">
    <div className="empty-icon">💬</div>
    <h3>No messages found</h3>
    {searchQuery ? (
      <div>
        <p>No messages match "{searchQuery}"</p>
        <button onClick={onClearSearch} className="clear-search-btn">
          Clear search
        </button>
      </div>
    ) : category !== 'all' ? (
      <div>
        <p>No {category} messages yet</p>
        <button onClick={onResetFilters} className="reset-filters-btn">
          Show all messages
        </button>
      </div>
    ) : (
      <p>Start a conversation!</p>
    )}
  </div>
);

const EmojiPicker = ({ onSelect, onClose, emojis }) => (
  <div className="emoji-picker">
    <div className="emoji-picker-header">
      <span>Choose an emoji</span>
      <button className="close-emoji-picker" onClick={onClose}>✕</button>
    </div>
    <div className="emoji-grid">
      {emojis.map(emoji => (
        <button
          key={emoji}
          className="emoji-item"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  </div>
);

const StatusModal = ({ onSubmit, onClose }) => {
  const [statusText, setStatusText] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (statusText.trim()) {
      onSubmit(statusText.trim());
      setStatusText('');
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Status</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <textarea
              className="status-input"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              maxLength={280}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={!statusText.trim()}
            >
              Share
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HomeComponent;