import React, { 
  useState, 
  useCallback, 
  useRef, 
  useEffect, 
  useMemo, 
  memo,
  createContext,
  useContext,
  forwardRef,
  useImperativeHandle
} from 'react';
import { FixedSizeList as List, VariableSizeList as VariableList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import './ProMessages.css';
import './MessageInteractions.css';
import './LoadingAnimations.css';
import './MessageSuggestions.css';
import './MessageSearch.css';
import './PinnedMessages.css';
import './JumpToLatest.css';
import './NotificationBadges.css';
import './EditableMessage.css';
import './MessageHighlight.css';
import './PinIndicator.css';
import './MessageThreads.css';
import './MessageReactions.css';
import './CodeBlocks.css';
import './ProMessageListEnhanced.css';

// Create Message Context for better state management
const MessageContext = createContext({});

// Enhanced Message Item Component with Advanced Features
const MessageItem = memo(forwardRef(({ 
  message, 
  index, 
  style, 
  isSelected, 
  isHighlighted,
  onSelect, 
  onReaction, 
  onEdit,
  onPin,
  onReply,
  currentUser,
  previousMessage,
  nextMessage,
  searchQuery
}, ref) => {
  const context = useContext(MessageContext);
  const [isHovered, setIsHovered] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [imageLoadStates, setImageLoadStates] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const messageRef = useRef(null);

  // Use context if available
  const {
    state = {},
    handleMessageSelect = onSelect,
    handleReactionAdd = onReaction,
    handleThreadToggle,
    theme = 'dark'
  } = context;

  useImperativeHandle(ref, () => ({
    scrollIntoView: () => messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    highlight: () => setIsHighlighted(true)
  }));
  
  // Enhanced grouping logic with time and context awareness
  const shouldGroup = useMemo(() => {
    if (!previousMessage || !state.groupMessages) return false;
    
    const timeDiff = new Date(message.timestamp) - new Date(previousMessage.timestamp);
    const maxGroupTime = 5 * 60 * 1000; // 5 minutes
    
    return (
      previousMessage.sender?.id === message.sender?.id &&
      timeDiff < maxGroupTime &&
      !message.isSystemMessage &&
      !previousMessage.isSystemMessage &&
      !message.replyTo &&
      !previousMessage.replyTo
    );
  }, [message, previousMessage, state.groupMessages]);

  // Enhanced message status detection
  const messageStatus = useMemo(() => {
    if (message.isEdited) return 'edited';
    if (message.isDeleted) return 'deleted';
    if (message.isSending) return 'sending';
    if (message.isFailed) return 'failed';
    if (message.isDelivered) return 'delivered';
    if (message.isRead) return 'read';
    return 'sent';
  }, [message]);

  // Smart content truncation for long messages
  const shouldTruncate = useMemo(() => {
    return message.content && message.content.length > 500 && !isExpanded;
  }, [message.content, isExpanded]);

  const displayContent = useMemo(() => {
    if (!message.content) return '';
    return shouldTruncate ? message.content.substring(0, 500) + '...' : message.content;
  }, [message.content, shouldTruncate]);

  // Format timestamp with intelligent formatting
  const formatTimestamp = useCallback((timestamp) => {
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
  }, []);

  // Enhanced content rendering with search highlighting
  const renderContent = useCallback(() => {
    let content = message.content || '';
    
    // Highlight search query
    if (searchQuery && content.toLowerCase().includes(searchQuery.toLowerCase())) {
      const regex = new RegExp(`(${searchQuery})`, 'gi');
      content = content.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    // Enhanced link detection and formatting
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    content = content.replace(linkRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>');
    
    // Enhanced mention detection
    const mentionRegex = /@(\w+)/g;
    content = content.replace(mentionRegex, '<span class="message-mention">@$1</span>');
    
    // Code block detection
    const codeBlockRegex = /```([\s\S]*?)```/g;
    content = content.replace(codeBlockRegex, '<pre class="message-code-block"><code>$1</code></pre>');
    
    // Inline code detection
    const inlineCodeRegex = /`([^`]+)`/g;
    content = content.replace(inlineCodeRegex, '<code class="message-inline-code">$1</code>');
    
    return content;
  }, [message.content, searchQuery]);

  // Enhanced attachment rendering
  const renderAttachments = useCallback(() => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className={`pro-attachments ${message.attachments.length === 1 ? 'single-attachment' : 'multiple-attachments'}`}>
        {message.attachments.map((attachment, index) => {
          if (attachment.type === 'image') {
            return (
              <div 
                key={index} 
                className={`pro-image-attachment ${imageLoadStates[`${message.id}-${index}`] ? 'loaded' : 'loading'}`}
              >
                <img
                  src={attachment.url}
                  alt={attachment.name || `Image ${index + 1}`}
                  loading="lazy"
                  onLoad={() => setImageLoadStates(prev => ({ ...prev, [`${message.id}-${index}`]: true }))}
                  onError={(e) => {
                    e.target.src = '/placeholder-image.svg';
                    setImageLoadStates(prev => ({ ...prev, [`${message.id}-${index}`]: true }));
                  }}
                />
                {!imageLoadStates[`${message.id}-${index}`] && (
                  <div className="image-loading-skeleton">
                    <div className="skeleton-shimmer"></div>
                  </div>
                )}
                
                {/* Enhanced Image Overlay */}
                <div className="image-overlay">
                  <div className="image-actions">
                    <button className="image-action-btn download" title="Download">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                      </svg>
                    </button>
                    <button className="image-action-btn fullscreen" title="View fullscreen">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          }
          
          if (attachment.type === 'video') {
            return (
              <div key={index} className="pro-video-attachment">
                <video controls preload="metadata">
                  <source src={attachment.url} type={attachment.mimeType || 'video/mp4'} />
                  Your browser does not support the video tag.
                </video>
              </div>
            );
          }
          
          // File attachment
          return (
            <div key={index} className="pro-file-attachment">
              <div className="file-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h10c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/>
                </svg>
              </div>
              <div className="file-info">
                <div className="file-name">{attachment.name}</div>
                <div className="file-size">{attachment.size || 'Unknown size'}</div>
              </div>
              <button className="file-download-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    );
  }, [message.attachments, message.id, imageLoadStates]);

  // Enhanced message status indicator
  const renderMessageStatus = useCallback(() => {
    if (message.sender?.id !== currentUser?.id) return null;
    
    const statusIcons = {
      sending: (
        <div className="message-status sending">
          <svg className="status-spinner" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="32" strokeDashoffset="32">
              <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" values="0 12 12;360 12 12"/>
            </circle>
          </svg>
        </div>
      ),
      sent: (
        <div className="message-status sent">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
      ),
      delivered: (
        <div className="message-status delivered">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
          </svg>
        </div>
      ),
      read: (
        <div className="message-status read">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
          </svg>
        </div>
      ),
      failed: (
        <div className="message-status failed" title="Failed to send - click to retry">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
      ),
      queued: (
        <div className="message-status queued" title="Queued - will send when connection is restored">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
            <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
        </div>
      )
    };
    
    return statusIcons[message.status] || statusIcons.sent;
  }, [message.status, message.sender, currentUser]);

  return (
    <div 
      style={style}
      className={`pro-message-container ${shouldGroup ? 'grouped' : ''} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(message.id)}
    >
      <div className={`pro-message ${message.sender?.id === currentUser?.id ? 'own-message' : 'other-message'}`}>
        
        {/* Avatar - only show if not grouped */}
        {!shouldGroup && (
          <div className="pro-message-avatar">
            <img 
              src={message.sender?.avatar || '/default-avatar.svg'} 
              alt={message.sender?.name || 'User'} 
              loading="lazy"
            />
            <div className="avatar-status-indicator"></div>
          </div>
        )}
        
        <div className="pro-message-content">
          {/* Header - only show if not grouped */}
          {!shouldGroup && (
            <div className="pro-message-header">
              <span className="pro-message-sender">{message.sender?.name || 'Anonymous'}</span>
              <span className="pro-message-timestamp">{formatTimestamp(message.timestamp)}</span>
              {message.edited && (
                <span className="pro-message-edited" title={`Edited ${formatTimestamp(message.editedAt)}`}>
                  (edited)
                </span>
              )}
            </div>
          )}
          
          {/* Message body */}
          <div className="pro-message-body">
            {message.replyTo && (
              <div className="pro-message-reply-context">
                <div className="reply-indicator"></div>
                <div className="reply-content">
                  <span className="reply-author">{message.replyTo.sender?.name}</span>
                  <span className="reply-text">{message.replyTo.content?.substring(0, 100)}...</span>
                </div>
              </div>
            )}
            
            {renderContent() && (
              <div 
                className="pro-message-text"
                dangerouslySetInnerHTML={{ __html: renderContent() }}
              />
            )}
            
            {renderAttachments()}
            
            {/* Message reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="pro-message-reactions">
                {message.reactions.map((reaction, index) => (
                  <button 
                    key={index}
                    className={`reaction-bubble ${reaction.userId === currentUser?.id ? 'own-reaction' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReaction(message.id, reaction.emoji, 'toggle');
                    }}
                  >
                    <span className="reaction-emoji">{reaction.emoji}</span>
                    <span className="reaction-count">{reaction.count || 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Message actions - show on hover or selection */}
          {(isHovered || isSelected) && (
            <div className="pro-message-actions">
              <button 
                className="message-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReactionPicker(!showReactionPicker);
                }}
                title="Add reaction"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </button>
              
              <button 
                className="message-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(message);
                }}
                title="Reply"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                </svg>
              </button>
              
              {message.sender?.id === currentUser?.id && (
                <>
                  <button 
                    className="message-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(message.id);
                    }}
                    title="Edit"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  
                  <button 
                    className="message-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle delete
                    }}
                    title="Delete"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </>
              )}
              
              <button 
                className="message-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(message.id);
                }}
                title="Pin message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
              </button>
            </div>
          )}
          
          {/* Status indicator */}
          <div className="pro-message-footer">
            {renderMessageStatus()}
          </div>
        </div>
        
        {/* Reaction picker */}
        {showReactionPicker && (
          <div className="reaction-picker-overlay" onClick={() => setShowReactionPicker(false)}>
            <div className="reaction-picker" onClick={(e) => e.stopPropagation()}>
              {['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🔥'].map(emoji => (
                <button
                  key={emoji}
                  className="reaction-option"
                  onClick={() => {
                    onReaction(message.id, emoji, 'add');
                    setShowReactionPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}));

// Enhanced ProMessageList with Advanced Features
const EnhancedProMessageList = ({ 
  messages = [], 
  currentUser, 
  messagesEndRef,
  searchQuery = '',
  onMessageSelect,
  onMessageReaction,
  onMessageEdit,
  onMessagePin,
  onMessageReply,
  onMessageDelete,
  className = '',
  style = {},
  enableVirtualization = true,
  enableThreads = true,
  enableReactions = true,
  enableSearch = true,
  enableSelection = true,
  theme = 'dark',
  viewMode = 'comfortable' // comfortable, compact, spacious
}) => {
  // Enhanced state management
  const [state, setState] = useState({
    selectedMessages: new Set(),
    expandedThreads: new Set(),
    reactionMenuOpen: null,
    editingMessageId: null,
    pinnedMessages: new Set(),
    highlightedMessageId: null,
    showAvatars: true,
    showTimestamps: true,
    showReactions: true,
    groupMessages: true,
    autoScroll: true,
    scrollPosition: 0,
    isNearBottom: true,
    viewMode: viewMode
  });

  // Performance state
  const [performance, setPerformance] = useState({
    visibleRange: { start: 0, end: 50 },
    messageHeights: new Map(),
    imageLoadStates: new Map(),
    renderBatch: 20,
    scrollThrottled: false
  });

  // Refs for optimization
  const listRef = useRef(null);
  const itemHeightCache = useRef(new Map());
  const scrollTimeoutRef = useRef(null);
  const intersectionObserver = useRef(null);

  // Enhanced message processing with intelligent grouping
  const processedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    let processed = [...messages].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    return processed.map((message, index) => {
      const previousMessage = index > 0 ? processed[index - 1] : null;
      const nextMessage = index < processed.length - 1 ? processed[index + 1] : null;
      
      // Smart grouping logic
      const shouldGroup = state.groupMessages && previousMessage && 
        previousMessage.sender?.id === message.sender?.id &&
        (new Date(message.timestamp) - new Date(previousMessage.timestamp)) < 5 * 60 * 1000 &&
        !message.isSystemMessage &&
        !previousMessage.isSystemMessage;

      // Thread detection
      const isThreadStart = message.replyTo || message.threadId;
      const isInThread = message.threadId && !message.replyTo;

      // Search highlighting
      const isHighlighted = searchQuery && enableSearch && 
        (message.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         message.sender?.name?.toLowerCase().includes(searchQuery.toLowerCase()));

      return {
        ...message,
        index,
        shouldGroup,
        previousMessage,
        nextMessage,
        isHighlighted,
        isThreadStart,
        isInThread,
        isSelected: state.selectedMessages.has(message.id),
        isPinned: state.pinnedMessages.has(message.id),
        isEditing: state.editingMessageId === message.id
      };
    });
  }, [messages, searchQuery, state.groupMessages, state.selectedMessages, state.pinnedMessages, state.editingMessageId, enableSearch]);

  // Enhanced reactions management
  const [messageReactions, setMessageReactions] = useState(new Map());
  const [emojiPicker, setEmojiPicker] = useState({ visible: false, messageId: null, position: { x: 0, y: 0 } });

  // Dynamic height calculation for virtualization
  const getItemHeight = useCallback((index) => {
    const cached = itemHeightCache.current.get(index);
    if (cached) return cached;
    
    const message = processedMessages[index];
    if (!message) return 80;
    
    let height = state.viewMode === 'compact' ? 50 : 
                 state.viewMode === 'spacious' ? 120 : 80;
    
    // Adjust for grouping
    if (message.shouldGroup) {
      height -= 20;
    }
    
    // Add height for content
    if (message.content) {
      const lineHeight = state.viewMode === 'compact' ? 18 : 22;
      const charactersPerLine = state.viewMode === 'compact' ? 80 : 60;
      const lines = Math.ceil(message.content.length / charactersPerLine);
      height += lines * lineHeight;
    }
    
    // Add height for attachments
    if (message.attachments?.length > 0) {
      const hasImages = message.attachments.some(a => a.type === 'image');
      const hasVideos = message.attachments.some(a => a.type === 'video');
      height += hasImages ? 200 : hasVideos ? 150 : 40;
    }
    
    // Add height for reactions
    const reactions = messageReactions.get(message.id);
    if (reactions?.size > 0) {
      height += 35;
    }
    
    // Add height for thread preview
    if (message.threadReplies?.length > 0) {
      height += 40;
    }
    
    itemHeightCache.current.set(index, height);
    return height;
  }, [processedMessages, state.viewMode, messageReactions]);

  // Enhanced scroll management
  const handleScroll = useCallback(({ scrollTop, scrollHeight, clientHeight, scrollUpdateWasRequested }) => {
    if (!scrollUpdateWasRequested) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          scrollPosition: scrollTop,
          isNearBottom: (scrollHeight - scrollTop - clientHeight) < 100
        }));
        setPerformance(prev => ({ ...prev, scrollThrottled: false }));
      }, 16); // 60fps throttling
      
      setPerformance(prev => ({ ...prev, scrollThrottled: true }));
    }
  }, []);

  // Auto-scroll to bottom for new messages
  const scrollToBottom = useCallback(() => {
    if (listRef.current && state.autoScroll && state.isNearBottom) {
      listRef.current.scrollToItem(processedMessages.length - 1, 'end');
    }
  }, [processedMessages.length, state.autoScroll, state.isNearBottom]);

  // Scroll to specific message
  const scrollToMessage = useCallback((messageId) => {
    const index = processedMessages.findIndex(m => m.id === messageId);
    if (index !== -1 && listRef.current) {
      listRef.current.scrollToItem(index, 'center');
      setState(prev => ({ ...prev, highlightedMessageId: messageId }));
      
      // Remove highlight after animation
      setTimeout(() => {
        setState(prev => ({ ...prev, highlightedMessageId: null }));
      }, 2000);
    }
  }, [processedMessages]);

  // Message selection handlers
  const handleMessageSelect = useCallback((messageId, isCtrlClick = false) => {
    if (!enableSelection) return;
    
    setState(prev => {
      const newSelected = new Set(prev.selectedMessages);
      
      if (isCtrlClick) {
        if (newSelected.has(messageId)) {
          newSelected.delete(messageId);
        } else {
          newSelected.add(messageId);
        }
      } else {
        newSelected.clear();
        newSelected.add(messageId);
      }
      
      return { ...prev, selectedMessages: newSelected };
    });
    
    onMessageSelect?.(messageId);
  }, [enableSelection, onMessageSelect]);

  // Reaction handlers
  const handleReactionAdd = useCallback((messageId, emoji) => {
    if (!enableReactions) return;
    
    setMessageReactions(prev => {
      const messageReacts = prev.get(messageId) || new Map();
      const userReacts = messageReacts.get(currentUser.id) || new Set();
      
      if (userReacts.has(emoji)) {
        userReacts.delete(emoji);
      } else {
        userReacts.add(emoji);
      }
      
      if (userReacts.size === 0) {
        messageReacts.delete(currentUser.id);
      } else {
        messageReacts.set(currentUser.id, userReacts);
      }
      
      const newMap = new Map(prev);
      newMap.set(messageId, messageReacts);
      return newMap;
    });
    
    onMessageReaction?.(messageId, emoji);
  }, [currentUser.id, enableReactions, onMessageReaction]);

  // Thread handlers
  const handleThreadToggle = useCallback((messageId) => {
    if (!enableThreads) return;
    
    setState(prev => {
      const newExpanded = new Set(prev.expandedThreads);
      if (newExpanded.has(messageId)) {
        newExpanded.delete(messageId);
      } else {
        newExpanded.add(messageId);
      }
      return { ...prev, expandedThreads: newExpanded };
    });
  }, [enableThreads]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [processedMessages.length, scrollToBottom]);

  // Context value for child components
  const contextValue = useMemo(() => ({
    state,
    setState,
    performance,
    setPerformance,
    currentUser,
    messageReactions,
    setMessageReactions,
    emojiPicker,
    setEmojiPicker,
    handleMessageSelect,
    handleReactionAdd,
    handleThreadToggle,
    scrollToMessage,
    enableThreads,
    enableReactions,
    enableSelection,
    theme
  }), [
    state, 
    performance, 
    currentUser, 
    messageReactions, 
    emojiPicker,
    handleMessageSelect,
    handleReactionAdd,
    handleThreadToggle,
    scrollToMessage,
    enableThreads,
    enableReactions,
    enableSelection,
    theme
  ]);

  // Empty state
  if (processedMessages.length === 0) {
    return (
      <div className={`pro-message-list enhanced empty ${theme} ${className}`} style={style}>
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>No messages yet</h3>
          <p>Start a conversation to see messages here</p>
        </div>
      </div>
    );
  }

  // Render with or without virtualization
  return (
    <MessageContext.Provider value={contextValue}>
      <div 
        className={`pro-message-list enhanced ${theme} ${state.viewMode} ${className}`}
        style={style}
        tabIndex={0}
      >
        {enableVirtualization ? (
          <AutoSizer>
            {({ height, width }) => (
              <VariableList
                ref={listRef}
                height={height}
                width={width}
                itemCount={processedMessages.length}
                itemSize={getItemHeight}
                onScroll={handleScroll}
                className="message-virtual-list"
                overscanCount={5}
              >
                {({ index, style: itemStyle }) => (
                  <MessageItem
                    key={processedMessages[index]?.id || index}
                    message={processedMessages[index]}
                    index={index}
                    style={itemStyle}
                    isSelected={state.selectedMessages.has(processedMessages[index]?.id)}
                    isHighlighted={state.highlightedMessageId === processedMessages[index]?.id}
                    onSelect={handleMessageSelect}
                    onReaction={handleReactionAdd}
                    onEdit={onMessageEdit}
                    onPin={onMessagePin}
                    onReply={onMessageReply}
                    currentUser={currentUser}
                    previousMessage={processedMessages[index]?.previousMessage}
                    nextMessage={processedMessages[index]?.nextMessage}
                    searchQuery={searchQuery}
                  />
                )}
              </VariableList>
            )}
          </AutoSizer>
        ) : (
          <div className="message-standard-list">
            {processedMessages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                index={index}
                isSelected={state.selectedMessages.has(message.id)}
                isHighlighted={state.highlightedMessageId === message.id}
                onSelect={handleMessageSelect}
                onReaction={handleReactionAdd}
                onEdit={onMessageEdit}
                onPin={onMessagePin}
                onReply={onMessageReply}
                currentUser={currentUser}
                previousMessage={message.previousMessage}
                nextMessage={message.nextMessage}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
        
        {/* Scroll to bottom indicator */}
        {!state.isNearBottom && (
          <button
            className="scroll-to-bottom-btn"
            onClick={scrollToBottom}
            title="Scroll to bottom"
          >
            ↓ {processedMessages.length - processedMessages.findIndex(m => m.timestamp > new Date(Date.now() - 60000))} new
          </button>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </MessageContext.Provider>
  );
};
export default memo(EnhancedProMessageList);
